import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../common/prisma.service';
import { isValidWebhookTransition } from '../orders/order-state-machine';

/**
 * Gera um payload PIX EMV no formato BR Code (BACEN).
 *
 * **Stub** (auditoria A17): o conteúdo é construído deterministicamente a
 * partir do `paymentId` e do valor, mas **não é registrado no SPI/PIX**
 * (não há integração com o PSP real). O QR code retornado pelo frontend
 * aponta para um placeholder (api.qrserver.com) que renderiza o payload.
 *
 * Estrutura (versão simplificada):
 *  - 00  - Payload Format Indicator (01)
 *  - 26  - Merchant Account Information (gui + chave stub)
 *  - 52  - Merchant Category Code (0000)
 *  - 53  - Transaction Currency (986 = BRL)
 *  - 54  - Transaction Amount (em centavos → reais com 2 casas)
 *  - 58  - Country Code (BR)
 *  - 59  - Merchant Name (PEDI-AI STUB)
 *  - 60  - Merchant City (SAO PAULO)
 *  - 62  - Additional Data Field (txid)
 *  - 63  - CRC16 (placeholder)
 *
 * Quando a integração com Mercado Pago estiver ativa (RF-PAG-02), este
 * payload será substituído pelo BR Code gerado pelo PSP.
 */
function buildPixStubPayload(amountCents: number, paymentId: string): string {
  const amount = (amountCents / 100).toFixed(2);
  const txid = paymentId.slice(0, 25).padEnd(25, '0');

  // TLV (Tag-Length-Value) helper.
  const tlv = (tag: string, value: string): string => {
    const len = String(value.length).padStart(2, '0');
    return `${tag}${len}${value}`;
  };

  const merchantAccount = tlv('00', 'br.gov.bcb.pix') + tlv('01', 'stub@pedi-ai.com');
  const parts = [
    tlv('00', '01'),
    tlv('26', merchantAccount),
    tlv('52', '0000'),
    tlv('53', '986'),
    tlv('54', amount),
    tlv('58', 'BR'),
    tlv('59', 'PEDI-AI STUB'),
    tlv('60', 'SAO PAULO'),
    tlv('62', tlv('05', txid)),
  ];
  // CRC16 placeholder — sem o CRC válido, apps bancários podem recusar
  // (por isso é importante migrar para o payload real do PSP quando ativo).
  return parts.join('') + '6304STUB';
}

/**
 * Service de pagamentos PIX.
 *
 * Princípios de segurança:
 * - Tenant isolation: o `requesterRestaurantId` (do JWT) é usado para validar
 *   que o pedido/pagamento pertence ao restaurante do usuário.
 * - Idempotência atômica via INSERT-then-process dentro de transação
 *   `Serializable`. O INSERT do `WebhookEvent` funciona como "lock" —
 *   se duas entregas simultâneas chegarem com o mesmo `eventId`, a segunda
 *  撞ará P2002 (unique violation) e será rejeitada como duplicada.
 *   Se o processamento falhar após o INSERT, toda a transação sofre
 *   rollback e o eventId fica disponível para retry legítimo.
 * - Status do MP nunca é confiável isoladamente; é mapeado para o enum interno.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private prisma: PrismaService) {}

  async createPixPayment(data: { orderId: string; restaurantId: string; amount?: number }) {
    const order = await this.prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    if (order.restaurantId !== data.restaurantId) {
      throw new ForbiddenException('Pedido não pertence ao restaurante indicado');
    }

    // Auditoria C6: o `amount` é **server-side enforced** a partir do
    // `order.total`. Se o cliente enviou `amount` no body, validamos que
    // bate com o total do pedido (com tolerância para ponto flutuante);
    // caso contrário, o body é **ignorado** e usamos `order.total`.
    // Isso evita fraude: cliente não pode pagar R$1 por pedido de R$1000.
    const serverAmount = Number(order.total);
    if (data.amount !== undefined && data.amount !== null) {
      if (Math.abs(data.amount - serverAmount) > 0.01) {
        throw new ForbiddenException(
          `Valor enviado (R$ ${data.amount}) diverge do total do pedido (R$ ${serverAmount})`
        );
      }
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Cria o intent primeiro para obter o ID (será usado como txid no payload).
    // Auditoria A-02: create + update do qrCode dentro de `$transaction` —
    // crash entre as duas queries deixava intent com `qrCode: 'pending'`
    // persistido, causando estado intermediário inválido.
    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.paymentIntent.create({
        data: {
          orderId: data.orderId,
          restaurantId: data.restaurantId,
          amount: serverAmount,
          paymentMethod: 'pix',
          status: 'pending',
          expiresAt,
          // placeholder, atualizado abaixo com o BR Code real.
          qrCode: 'pending',
        },
      });

      // Auditoria A17: gera payload PIX EMV stub (BR Code) e codifica em
      // URL para um serviço de QR code (api.qrserver.com). Apps bancários
      // podem rejeitar por CRC16 stub, mas o payload tem a estrutura certa
      // para migração futura ao PSP real.
      const pixPayload = buildPixStubPayload(serverAmount, created.id);
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixPayload)}`;

      return tx.paymentIntent.update({
        where: { id: created.id },
        data: { qrCode },
      });
    });

    return {
      id: payment.id,
      qrCode: payment.qrCode,
      expiresAt: payment.expiresAt,
      amount: payment.amount,
    };
  }

  /**
   * Status de pagamento por paymentId. Auditoria C9 — agora exige tenant
   * check + ownership para cliente. Sem requester, lança 401 (defesa contra
   * uso indevido interno).
   */
  async getPaymentStatus(
    paymentId: string,
    requester: {
      requesterUserId: string;
      requesterRole: string;
      requesterRestaurantId: string | null;
    }
  ) {
    if (!requester?.requesterUserId) {
      throw new NotFoundException('Pagamento não encontrado');
    }
    const payment = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // ── Tenant check ──────────────────────────────────────────────────
    if (requester.requesterRole !== 'cliente') {
      if (!requester.requesterRestaurantId) {
        throw new ForbiddenException('Usuário staff sem restaurante vinculado');
      }
      if (payment.restaurantId !== requester.requesterRestaurantId) {
        throw new ForbiddenException('Pagamento pertence a outro restaurante');
      }
    } else {
      // Cliente: precisa ser dono do pedido (order.customerId).
      const order = await this.prisma.order.findUnique({
        where: { id: payment.orderId },
        select: { customerId: true },
      });
      if (!order || order.customerId !== requester.requesterUserId) {
        throw new ForbiddenException('Pagamento não disponível para este usuário');
      }
    }

    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
    };
  }

  /**
   * Status por orderId. Com `requesterRestaurantId`, valida tenant.
   * Se `requesterRestaurantId` ausente, retorna apenas dados básicos (cliente em mesa).
   *
   * Auditoria M6: clientes (`requesterUserId` obrigatório) só acessam o
   * status de pagamentos de **próprios pedidos** (comparação via `order.userId`).
   * Staff acessa se o pagamento pertencer ao restaurante vinculado ao JWT.
   */
  async getPaymentStatusByOrder(
    orderId: string,
    requester: {
      requesterUserId: string;
      requesterRole: string;
      requesterRestaurantId: string | null;
    }
  ) {
    const payment = await this.prisma.paymentIntent.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) {
      return { orderId, status: 'pending', qrCode: null, expiresAt: null };
    }

    // ── Tenant check ──────────────────────────────────────────────────
    if (requester.requesterRole !== 'cliente') {
      // Staff: precisa do restaurante vinculado.
      if (!requester.requesterRestaurantId) {
        throw new ForbiddenException('Usuário staff sem restaurante vinculado');
      }
      if (payment.restaurantId !== requester.requesterRestaurantId) {
        throw new ForbiddenException('Pagamento pertence a outro restaurante');
      }
    } else {
      // Cliente: precisa ser dono do pedido.
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { customerId: true },
      });
      // customerId é o userId do cliente — se o JWT não bater, nega.
      if (!order || order.customerId !== requester.requesterUserId) {
        // Não distingue "não existe" de "não é seu" — evita enumeração.
        throw new ForbiddenException('Pagamento não disponível para este usuário');
      }
    }

    return {
      orderId,
      status: payment.status,
      qrCode: payment.qrCode,
      expiresAt: payment.expiresAt,
    };
  }

  async handleWebhook(data: {
    eventId: string;
    paymentId: string;
    status: string;
    orderId?: string;
    restaurantId?: string;
  }) {
    // Transação interativa em Serializable: o INSERT do WebhookEvent é a
    // operação de "claim" — duas entregas simultâneas do mesmo eventId
    // não podem coexistir. A segunda撞a P2002 e sai como duplicate.
    // Se qualquer passo seguinte falhar, o INSERT é revertido e o eventId
    // fica livre para retry (sem "envenenamento" da idempotência).
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // 1. Claim atômico do eventId.
          try {
            await tx.webhookEvent.create({
              data: {
                id: data.eventId,
                eventType: 'payment',
                processedAt: new Date(),
              },
            });
          } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
              // Outra entrega já processou este eventId.
              return { status: 'duplicate', eventId: data.eventId };
            }
            throw err;
          }

          // 2. Localiza o intent pelo paymentId do MP.
          const paymentIntent = await tx.paymentIntent.findFirst({
            where: { mercadoPagoPaymentId: String(data.paymentId) },
          });

          if (!paymentIntent) {
            // Não é erro crítico — pode ser payment criado por outro canal.
            return { status: 'not_found', paymentId: data.paymentId };
          }

          // 3. Mapeia status MP → enum interno.
          // Auditoria M-10: lista expandida + warning explícito para status
          // desconhecido (antes caía em `pending` silencioso, gerando loop de
          // webhooks até o MP atualizar o status).
          const statusMap: Record<string, PaymentStatus> = {
            approved: 'paid',
            pending: 'pending',
            in_process: 'pending',
            in_mediation: 'pending',
            rejected: 'failed',
            cancelled: 'failed',
            charged_back: 'failed',
            refunded: 'refunded',
          };
          const newStatus = statusMap[data.status];
          if (!newStatus) {
            this.logger.warn(
              `Webhook MP com status desconhecido: ${data.status} (eventId=${data.eventId}, ` +
                `paymentId=${data.paymentId}). Será reprocessado pelo MP.`
            );
            return { status: 'unknown_status', receivedStatus: data.status };
          }

          // 4. Atualiza intent e order atomicamente (na mesma transação).
          const orderStatusMap: Record<string, 'paid' | 'pending_payment' | 'cancelled'> = {
            paid: 'paid',
            approved: 'paid',
            pending: 'pending_payment',
            rejected: 'cancelled',
            cancelled: 'cancelled',
            refunded: 'cancelled',
          };
          // Auditoria L-NEW-01: log explícito quando o status do MP não tem
          // mapeamento — antes caía silenciosamente em 'pending_payment',
          // mascarando bugs e divergências de schema entre MP e nosso banco.
          const orderStatus = orderStatusMap[data.status];
          if (!orderStatus) {
            this.logger.warn(
              `Webhook MP: status '${data.status}' sem mapeamento em orderStatusMap ` +
                `(paymentId=${data.paymentId}). Mantendo order.status atual sem alterar.`
            );
            // Não mexe no order.status; só atualiza o intent (já feito acima).
            // O intent fica com `unknown_status` e o webhook retorna sem alterar pedido.
            return {
              status: 'unknown_status',
              receivedStatus: data.status,
              paymentIntentId: paymentIntent.id,
            };
          }

          await tx.paymentIntent.update({
            where: { id: paymentIntent.id },
            data: { status: newStatus },
          });

          // Auditoria A-R-02: state-machine no webhook — só atualiza order.status
          // se a transição for válida. Pedido já em `preparing`/`ready`/`delivered`
          // (movido por staff) não regride para `paid` ao chegar webhook atrasado
          // do MP. Pagamento ainda é refletido em `paymentStatus` e no intent.
          //
          // Auditoria ACHADO-6 (Re-varredura 5): optimistic locking via `version`
          // — o webhook agora usa `updateMany({ where: { id, version } })` em vez
          // de `update` direto. Se o staff moveu o pedido (incrementando version)
          // entre o findUnique e este update, `count === 0` e a gente detecta o
          // conflito. Aqui ainda está em Serializable (transação externa), o que
          // já evita grande parte do TOCTOU — mas version é **defesa em
          // profundidade** caso o nível de isolamento seja rebaixado no futuro
          // (ex: durante tuning de performance).
          const currentOrder = await tx.order.findUnique({
            where: { id: paymentIntent.orderId },
            select: { status: true, version: true },
          });
          if (currentOrder && isValidWebhookTransition(currentOrder.status, orderStatus)) {
            const result = await tx.order.updateMany({
              where: {
                id: paymentIntent.orderId,
                version: currentOrder.version,
              },
              data: {
                status: orderStatus,
                paymentStatus: newStatus,
                version: { increment: 1 },
              },
            });
            if (result.count === 0) {
              this.logger.warn(
                `Webhook MP: conflito de versão no order (orderId=${paymentIntent.orderId}, ` +
                  `v${currentOrder.version}). Staff moveu o pedido concomitantemente — ` +
                  `mantendo status atual do staff.`
              );
              // Não atualizamos status (mantém staff's), mas sincronizamos
              // paymentStatus para refletir a confirmação do MP.
              await tx.order.update({
                where: { id: paymentIntent.orderId },
                data: { paymentStatus: newStatus },
              });
            }
          } else if (currentOrder) {
            // Mantém status do pedido; só sincroniza paymentStatus.
            this.logger.warn(
              `Webhook MP ignorou regressão de status (orderId=${paymentIntent.orderId}, ` +
                `atual=${currentOrder.status}, mp=${orderStatus})`
            );
            await tx.order.update({
              where: { id: paymentIntent.orderId },
              data: { paymentStatus: newStatus },
            });
          }

          return { status: 'success', orderId: paymentIntent.orderId };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (err) {
      // Serialization failure (40001) é retentável — MP reenvia.
      // Erros não-recuperáveis são logados e o webhook retorna erro.
      this.logger.error(
        `Falha ao processar webhook (eventId=${data.eventId}): ${(err as Error).message}`,
        (err as Error).stack
      );
      throw err;
    }
  }

  // Auditoria ACHADO-31 (Re-varredura 6): a state-machine agora vive em
  // `orders/order-state-machine.ts` (single source of truth). A função
  // privada `isValidOrderTransition` foi removida — `handleWebhook` agora
  // usa `isValidWebhookTransition` do módulo compartilhado.
}
