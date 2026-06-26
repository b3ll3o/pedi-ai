import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { OrderStatus, PaymentMethod, Prisma } from '@prisma/client';

import { PageDto, PAGINATION_DEFAULT_LIMIT } from '../common/dto/pagination.dto';
import { PrismaService } from '../common/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

import { isValidOrderStatusTransition } from './order-state-machine';

/**
 * Service de pedidos com tenant isolation e pricing server-side enforced.
 *
 * Segurança:
 * - `findById(id, requesterRestaurantId)` valida ownership antes de retornar.
 * - `updateStatus` valida ownership.
 * - `create` **ignora** `unitPrice` do body e usa `product.price` do banco.
 * - `total` é recalculado a partir de `unitPrice` * `quantity` (+tax).
 */
@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private readonly realtimeService: RealtimeService
  ) {}

  async findByRestaurant(
    restaurantId: string,
    options: { cursor?: string; limit?: number; includeCancelled?: boolean } = {}
  ): Promise<PageDto<unknown>> {
    const limit = options.limit ?? PAGINATION_DEFAULT_LIMIT;
    const items = await this.prisma.order.findMany({
      // Auditoria M14: por padrão, **excluímos pedidos cancelados** da listagem
      // principal — poluem a UI do staff que precisa ver apenas pedidos
      // ativos (`pending_payment | paid | preparing | ready | delivered`).
      // Para auditoria/relatórios, passe `includeCancelled: true`.
      where: {
        restaurantId,
        ...(options.includeCancelled ? {} : { status: { not: 'cancelled' } }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1, // +1 para detectar se há próxima página
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      include: { items: true },
    });
    const hasNext = items.length > limit;
    const data = hasNext ? items.slice(0, limit) : items;
    const nextCursor = hasNext ? data[data.length - 1].id : null;
    return PageDto.create(data, nextCursor, data.length);
  }

  /**
   * Pedido por ID. Valida ownership conforme papel do requisitante:
   * - `atendente | gerente | dono`: precisa ter `restaurantId` igual ao do
   *   pedido (tenant match).
   * - `cliente`: precisa ser o `customerId` do pedido.
   *
   * @throws NotFoundException se não existir.
   * @throws ForbiddenException se ownership não bater (BOLA/IDOR prevenido).
   */
  async findById(
    id: string,
    requester: {
      requesterUserId: string;
      requesterRole: string;
      requesterRestaurantId: string | null;
    }
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    const isStaff = ['atendente', 'gerente', 'dono'].includes(requester.requesterRole);
    if (isStaff) {
      if (
        requester.requesterRestaurantId &&
        order.restaurantId !== requester.requesterRestaurantId
      ) {
        throw new ForbiddenException('Pedido pertence a outro restaurante');
      }
    } else {
      // Cliente: precisa ser dono do pedido.
      if (!order.customerId || order.customerId !== requester.requesterUserId) {
        // Mesma mensagem para evitar enumeração (cliente não sabe se pedido
        // existe ou se pertence a outro).
        throw new ForbiddenException('Pedido pertence a outro restaurante');
      }
    }

    return order;
  }

  /**
   * Pedidos do cliente. `restaurantId` opcional para filtro adicional.
   * Cliente autenticado só vê seus próprios pedidos.
   */
  async findByCustomer(
    customerId: string,
    restaurantId?: string | null,
    options: { cursor?: string; limit?: number } = {}
  ): Promise<PageDto<unknown>> {
    const limit = options.limit ?? PAGINATION_DEFAULT_LIMIT;
    const items = await this.prisma.order.findMany({
      where: {
        customerId,
        ...(restaurantId ? { restaurantId } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      include: { items: true },
    });
    const hasNext = items.length > limit;
    const data = hasNext ? items.slice(0, limit) : items;
    const nextCursor = hasNext ? data[data.length - 1].id : null;
    return PageDto.create(data, nextCursor, data.length);
  }

  /**
   * Criação de pedido — **pricing server-side**.
   *
   * O body envia `unitPrice` mas é IGNORADO. O preço é lido do banco via
   * `product.price` e usado no cálculo. O cliente não pode inflar/descontar.
   */
  async create(data: {
    restaurantId: string;
    tableId?: string;
    customerId?: string;
    customerPhone?: string;
    customerName?: string;
    customerEmail?: string;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod?: PaymentMethod;
    idempotencyKey?: string;
    items: Array<{
      productId: string;
      comboId?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      notes?: string;
    }>;
  }) {
    // 1. Idempotência atômica via tabela `IdempotencyKey` (auditoria A-AD-05).
    // Antes: `findFirst` + `create` sofria race (TOCTOU). Agora, o INSERT
    // inicial na tabela IdempotencyKey com `@@unique([scope, key])` faz o
    // claim atômico: P2002 = outra request já está processando OU já
    // processou. Lemos o pedido existente (se houver) e retornamos o mesmo
    // resultado, garantindo idempotência real.
    //
    // Auditoria M-NEW-03: o claim do IdempotencyKey é feito **dentro** da
    // mesma `$transaction` que cria a Order. Se o INSERT da Order falhar,
    // o claim é revertido automaticamente — não há chave-órfã que bloqueie
    // retry do cliente.
    const idempotencyScope = 'order:create';
    if (data.idempotencyKey) {
      // Verifica se já existe claim de uma request anterior bem-sucedida.
      const existing = await this.prisma.order.findFirst({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Buscar produtos reais para validar e usar preço do banco.
    const productIds = data.items.map((i) => i.productId).filter((id): id is string => !!id);
    if (productIds.length === 0) {
      throw new BadRequestException('Pedido deve ter ao menos um produto');
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // 3. Recalcular itens com preços do servidor.
    const itemsWithServerPrice = data.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Produto ${item.productId} não encontrado`);
      }
      const serverUnitPrice = product.price;
      const totalPrice = serverUnitPrice * item.quantity;
      return {
        productId: item.productId,
        comboId: item.comboId,
        quantity: item.quantity,
        unitPrice: serverUnitPrice, // ← SEMPRE do banco
        totalPrice,
        notes: item.notes,
      };
    });

    // 4. Recalcular totais a partir dos itens server-side.
    const serverSubtotal = itemsWithServerPrice.reduce((sum, i) => sum + i.totalPrice, 0);
    const serverTotal = serverSubtotal + (data.tax ?? 0);

    let order;
    try {
      order = await this.prisma.$transaction(async (tx) => {
        // Claim atômico do idempotency-key DENTRO da transação (M-NEW-03).
        // Se `tx.order.create` falhar, o claim é revertido pelo Prisma
        // (rollback) e o cliente pode fazer retry sem 409 espúrio.
        if (data.idempotencyKey) {
          await tx.idempotencyKey.create({
            data: {
              scope: idempotencyScope,
              key: data.idempotencyKey,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
        }

        const newOrder = await tx.order.create({
          data: {
            restaurantId: data.restaurantId,
            tableId: data.tableId,
            customerId: data.customerId,
            customerPhone: data.customerPhone,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            subtotal: serverSubtotal,
            tax: data.tax,
            total: serverTotal,
            paymentMethod: data.paymentMethod,
            idempotencyKey: data.idempotencyKey,
            items: {
              create: itemsWithServerPrice,
            },
          },
          include: { items: true },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: newOrder.id,
            status: newOrder.status,
            notes: 'Pedido criado',
          },
        });

        return newOrder;
      });
    } catch (err) {
      // Auditoria M-NEW-03: cleanup externo não é mais necessário — a
      // transação reverte o claim automaticamente. Mantemos o catch para
      // traduzir P2002 em 409 idempotente (request duplicada concorrente).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // P2002 pode vir de `tx.order` (idempotencyKey único) ou de
        // `tx.idempotencyKey` (scope+key único). Ambos significam "request
        // duplicada" — retorna 409.
        const existing = await this.prisma.order.findFirst({
          where: { idempotencyKey: data.idempotencyKey },
        });
        if (existing) {
          return existing;
        }
        throw new ConflictException(
          `Pedido com idempotencyKey=${data.idempotencyKey} já está sendo processado`
        );
      }
      throw err;
    }

    this.realtimeService.emitNewOrder(data.restaurantId, {
      id: order.id,
      total: order.total,
    });

    return order;
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    notes: string | undefined,
    requesterRestaurantId?: string | null
  ) {
    // Tenant check
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Pedido não encontrado');
    }
    if (requesterRestaurantId && existing.restaurantId !== requesterRestaurantId) {
      throw new ForbiddenException('Pedido pertence a outro restaurante');
    }

    // Auditoria M16: state machine — bloqueia transições inválidas.
    // Sem essa validação, o staff (ou um cliente com JWT forjado) poderia
    // pular de `cancelled` direto para `delivered`, "ressuscitando" pedidos
    // cancelados e burlando a fila de produção.
    //
    // Auditoria ACHADO-31 (Re-varredura 6): state-machine agora vive em
    // `order-state-machine.ts` (single source of truth) — antes duplicada
    // em `OrdersService` e `PaymentsService` com semânticas divergentes.
    if (!isValidOrderStatusTransition(existing.status, status)) {
      throw new BadRequestException(`Transição de status inválida: ${existing.status} → ${status}`);
    }

    // Auditoria A-01: updateMany condicional resolve TOCTOU entre o
    // `findUnique` (snapshot) e o `update`. Se outra request alterou o status
    // entre as duas operações, `count === 0` indica conflito e relançamos
    // 409. Validação dupla: state-machine contra snapshot + atômica contra DB.
    //
    // Auditoria ACHADO-6 (Re-varredura 5): optimistic locking via `version`.
    // Sem isso, um webhook "paid" que chega ao mesmo tempo que um staff
    // que clica em "cancelled" faz last-write-wins silencioso (dois updates
    // independentes no mesmo `id`). Agora `version` entra na cláusula
    // `where` e é incrementado no `data` — se outra request alterou o
    // pedido entre o `findUnique` e este `updateMany`, `count === 0` e
    // retornamos 409 com instrução de retry.
    //
    // Auditoria ACHADO-36 (Re-varredura 7): consolidação em uma única
    // transação. Antes, eram 3 queries sequenciais (findUnique + updateMany +
    // $transaction com findUnique). Agora: 1 updateMany (atômico com version)
    // + 1 transação (findUnique do resultado + insert do histórico). O
    // `findUnique` final foi mantido dentro da transação para garantir
    // consistência com a inserção do histórico (se a inserção falhar, o
    // update do status também é revertido). Redução: 3 → 2 round-trips ao DB.
    const updateResult = await this.prisma.order.updateMany({
      where: { id, status: existing.status, version: existing.version },
      data: { status, version: { increment: 1 } },
    });
    if (updateResult.count === 0) {
      throw new ConflictException(
        `Pedido foi modificado por outra request (esperado=${existing.status} v${existing.version}, atual mudou). Tente novamente.`
      );
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.findUnique({ where: { id } });
      if (!updatedOrder) {
        // Não deveria acontecer — updateMany confirmou existência.
        throw new NotFoundException('Pedido não encontrado após atualização');
      }

      await tx.orderStatusHistory.create({
        data: { orderId: id, status, notes },
      });

      return updatedOrder;
    });

    this.realtimeService.emitOrderUpdate(order.restaurantId, {
      id: order.id,
      status: order.status,
    });

    return order;
  }
}
