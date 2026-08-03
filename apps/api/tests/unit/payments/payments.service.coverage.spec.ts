import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PaymentsService } from '../../../src/payments/payments.service';
import { PrismaService } from '../../../src/common/prisma.service';

/**
 * Spec de cobertura criado em 2026-08-03 para elevar a cobertura de branches
 * do `PaymentsService.handleWebhook` e `getPaymentStatus*` acima do
 * threshold de CI (≥80%).
 *
 * **Escopo:** branches não-cobertas em `apps/api/src/payments/payments.service.ts`
 * apontadas pelo relatório de cobertura v8 (linhas 280-417 + 405-411).
 *
 * **Não-objetivos:**
 * - Não duplicar cenários já cobertos em `payments.service.spec.ts`.
 * - Não introduzir novos mocks além do já estabelecido.
 *
 * Referência: auditoria P0-08 (coverage api baseline 79.44% → meta 80%+).
 */
describe('PaymentsService — cobertura de branches (handleWebhook + getPaymentStatus*)', () => {
  let paymentsService: PaymentsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockPixGateway: { createPixCharge: ReturnType<typeof vi.fn> };

  /**
   * Mock enxuto baseado na forma que `handleWebhook` e os métodos de status
   * consomem o `PrismaService`. Cada teste customiza o que precisa.
   *
   * P0-08 (2026-08-03): o `withEncryptedTransaction` foi introduzido como
   * wrapper de `$transaction` para LGPD (criptografia PII in-transaction).
   * Os testes reproduzem o comportamento esperado: chamar o callback com
   * um `tx` que expõe webhookEvent/paymentIntent/order, repassando as
   * `options` (incluindo `isolationLevel`).
   */
  const createMockPrisma = () => ({
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    paymentIntent: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    webhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    withEncryptedTransaction: vi.fn(async (arg: unknown, _options?: unknown) => {
      if (typeof arg === 'function') {
        const tx = {
          webhookEvent: { create: vi.fn(), findUnique: vi.fn() },
          paymentIntent: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
          order: {
            update: vi.fn(),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return await (arg as (t: typeof tx) => Promise<unknown>)(tx);
      }
      const ops = arg as Promise<unknown>[];
      const results: unknown[] = [];
      for (const op of ops) results.push(await op);
      return results;
    }),
    // `createPixPaymentInternal` ainda usa `$transaction` direto (não
    // toca em PII), então o mock também precisa expor esse método.
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        const tx = {
          paymentIntent: {
            create: vi.fn(),
            update: vi.fn(),
          },
        };
        return await (arg as (t: typeof tx) => Promise<unknown>)(tx);
      }
      const ops = arg as Promise<unknown>[];
      const results: unknown[] = [];
      for (const op of ops) results.push(await op);
      return results;
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockPixGateway = {
      createPixCharge: vi.fn().mockResolvedValue({
        qrCode: 'pix-qr-stub',
        qrCodeBase64: null,
        externalId: 'mp-id-stub',
      }),
    };
    paymentsService = new PaymentsService(
      mockPrisma as unknown as PrismaService,
      mockPixGateway as unknown as { createPixCharge: ReturnType<typeof vi.fn> }
    );
  });

  // ─────────────────────────────────────────────────────────────────
  // handleWebhook — branches não-cobertas (linhas 280-417)
  // ─────────────────────────────────────────────────────────────────

  describe('handleWebhook — status desconhecido do MP (statusMap)', () => {
    it('retorna unknown_status quando data.status não tem mapeamento para intent', async () => {
      // Status "weird_new_status" não existe em statusMap.
      const mockPayment = {
        id: 'pix-1',
        orderId: 'order-1',
        status: 'pending',
        mercadoPagoPaymentId: 'mp-unknown-1',
      };

      const tx = {
        webhookEvent: { create: vi.fn().mockResolvedValue({}) },
        paymentIntent: {
          findFirst: vi.fn().mockResolvedValue(mockPayment),
          update: vi.fn(),
        },
        order: { update: vi.fn(), updateMany: vi.fn() },
      };
      mockPrisma.withEncryptedTransaction.mockImplementation(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (t: typeof tx) => Promise<unknown>)(tx);
        }
        return [];
      });

      const result = await paymentsService.handleWebhook({
        eventId: 'evt-unknown-1',
        paymentId: 'mp-unknown-1',
        status: 'weird_new_status',
      });

      expect(result.status).toBe('unknown_status');
      expect(result.receivedStatus).toBe('weird_new_status');
      // Não deve tentar atualizar o intent (L302-315 retorna antes).
      expect(tx.paymentIntent.update).not.toHaveBeenCalled();
      // Não deve tocar em order.
      expect(tx.order.update).not.toHaveBeenCalled();
      expect(tx.order.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhook — caminho L329-342 (orderStatusMap sem mapeamento)', () => {
    it('retorna unknown_status quando status está em statusMap mas NÃO em orderStatusMap', async () => {
      // O branch L329-342 **é real** (não defensivo): existem status que
      // estão em statusMap (status MP → enum interno do intent) mas NÃO em
      // orderStatusMap (intent status → order.status). Exemplo: "in_process"
      // tem statusMap['in_process']='pending', mas orderStatusMap não tem
      // chave 'in_process'. O log do metric=webhook.unknown_order_status
      // é disparado.
      const mockPayment = {
        id: 'pix-2',
        orderId: 'order-2',
        status: 'pending',
        mercadoPagoPaymentId: 'mp-y',
      };

      const tx = {
        webhookEvent: { create: vi.fn().mockResolvedValue({}) },
        paymentIntent: {
          findFirst: vi.fn().mockResolvedValue(mockPayment),
          // IMPORTANTE: este branch L329-342 **não** chama paymentIntent.update.
          update: vi.fn(),
        },
        order: {
          findUnique: vi.fn(), // não chega a ser chamado
          update: vi.fn(), // não chega a ser chamado
          updateMany: vi.fn(),
        },
      };
      mockPrisma.withEncryptedTransaction.mockImplementation(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (t: typeof tx) => Promise<unknown>)(tx);
        }
        return [];
      });

      const result = await paymentsService.handleWebhook({
        eventId: 'evt-3',
        paymentId: 'mp-y',
        status: 'in_process',
      });

      // Cai no branch L329-342 → retorna unknown_status para o intent.
      expect(result.status).toBe('unknown_status');
      expect(result.receivedStatus).toBe('in_process');
      expect(result.paymentIntentId).toBe('pix-2');
      // Não toca no order (ramo defensivo).
      expect(tx.order.findUnique).not.toHaveBeenCalled();
      expect(tx.order.update).not.toHaveBeenCalled();
      expect(tx.order.updateMany).not.toHaveBeenCalled();
      // Não atualiza intent (ramo defensivo).
      expect(tx.paymentIntent.update).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhook — conflito de versão otimista (updateMany.count === 0)', () => {
    it('preserva status do staff quando count=0 e sincroniza paymentStatus', async () => {
      // Staff moveu o pedido concomitantemente → version incrementou
      // entre findUnique e updateMany → updateMany não aplica.
      const mockPayment = {
        id: 'pix-conflict',
        orderId: 'order-conflict',
        status: 'pending',
        mercadoPagoPaymentId: 'mp-conflict',
      };

      const tx = {
        webhookEvent: { create: vi.fn().mockResolvedValue({}) },
        paymentIntent: {
          findFirst: vi.fn().mockResolvedValue(mockPayment),
          update: vi.fn().mockResolvedValue({ ...mockPayment, status: 'paid' }),
        },
        order: {
          // currentOrder.status='preparing', version=5 (staff moveu).
          // isValidWebhookTransition('preparing', 'paid') → false (preparing
          // não está em WEBHOOK_ALLOWED_TRANSITIONS). Logo caímos no ramo
          // else-if (L392-401) que atualiza só paymentStatus.
          // Para exercitar o ramo count===0, precisamos de uma transição
          // válida (pending_payment → paid) E versão conflitante.
          findUnique: vi.fn().mockResolvedValue({ status: 'pending_payment', version: 0 }),
          update: vi.fn().mockResolvedValue({ id: 'order-x', paymentStatus: 'paid' }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }), // conflito!
        },
      };
      mockPrisma.withEncryptedTransaction.mockImplementation(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (t: typeof tx) => Promise<unknown>)(tx);
        }
        return [];
      });

      const result = await paymentsService.handleWebhook({
        eventId: 'evt-conflict',
        paymentId: 'mp-conflict',
        status: 'approved',
      });

      expect(result.status).toBe('success');
      // updateMany foi chamado e retornou count=0 → o service deve ter
      // feito um segundo `update` com WHERE só por id, sincronizando
      // só paymentStatus.
      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-conflict', version: 0 },
        data: {
          status: 'paid',
          paymentStatus: 'paid',
          version: { increment: 1 },
        },
      });
      // Confirma que o fallback update (preserva staff, sincroniza pix) rodou.
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-conflict' },
        data: { paymentStatus: 'paid' },
      });
    });
  });

  describe('handleWebhook — erro de transação (catch L408)', () => {
    it('loga e relança erro do transaction (não-recuperável)', async () => {
      // Erro genérico do $transaction (não P2002, não 40001). Deve ser
      // logado e relançado — o caller decide se retentará.
      mockPrisma.withEncryptedTransaction.mockRejectedValueOnce(
        new Error('Connection terminated unexpectedly')
      );

      await expect(
        paymentsService.handleWebhook({
          eventId: 'evt-err',
          paymentId: 'mp-err',
          status: 'approved',
        })
      ).rejects.toThrow('Connection terminated unexpectedly');
    });

    it('loga e relança erro de Prisma conhecido (não-P2002)', async () => {
      // Erro Prisma diferente de P2002 não tem tratamento especial — deve
      // cair no catch genérico e ser relançado.
      mockPrisma.withEncryptedTransaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
          code: 'P2003',
          clientVersion: 'test',
        })
      );

      await expect(
        paymentsService.handleWebhook({
          eventId: 'evt-fk',
          paymentId: 'mp-fk',
          status: 'approved',
        })
      ).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // getPaymentStatus — branches não-cobertas (cliente vs staff)
  // ─────────────────────────────────────────────────────────────────

  describe('getPaymentStatus — caminho do cliente', () => {
    it('retorna status para cliente que é dono do pedido', async () => {
      const clienteRequester = {
        requesterUserId: 'cliente-1',
        requesterRole: 'cliente',
        requesterRestaurantId: 'rest-1',
      };
      mockPrisma.paymentIntent.findUnique.mockResolvedValueOnce({
        id: 'pix-cli-1',
        status: 'paid',
        amount: 5000,
        restaurantId: 'rest-1',
        orderId: 'order-cli-1',
      });
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        customerId: 'cliente-1', // dono do pedido
      });

      const result = await paymentsService.getPaymentStatus('pix-cli-1', clienteRequester);

      expect(result).toMatchObject({
        id: 'pix-cli-1',
        status: 'paid',
        amount: 5000,
      });
      // Garantia: cliente NÃO depende de requesterRestaurantId.
      expect(mockPrisma.paymentIntent.findUnique).toHaveBeenCalledWith({
        where: { id: 'pix-cli-1' },
      });
    });

    it('rejeita cliente que NÃO é dono do pedido (BOLA)', async () => {
      const clienteRequester = {
        requesterUserId: 'cliente-X',
        requesterRole: 'cliente',
        requesterRestaurantId: 'rest-1',
      };
      mockPrisma.paymentIntent.findUnique.mockResolvedValueOnce({
        id: 'pix-bola',
        status: 'paid',
        amount: 5000,
        restaurantId: 'rest-1',
        orderId: 'order-bola',
      });
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        customerId: 'cliente-OUTRO', // NÃO é o requester
      });

      await expect(paymentsService.getPaymentStatus('pix-bola', clienteRequester)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('rejeita cliente quando order não existe (não enumera)', async () => {
      // Evita enumeração: order inexistente ≠ "não seu"; mesma exceção.
      const clienteRequester = {
        requesterUserId: 'cliente-1',
        requesterRole: 'cliente',
        requesterRestaurantId: 'rest-1',
      };
      mockPrisma.paymentIntent.findUnique.mockResolvedValueOnce({
        id: 'pix-no-order',
        status: 'paid',
        amount: 5000,
        restaurantId: 'rest-1',
        orderId: 'order-fake',
      });
      mockPrisma.order.findUnique.mockResolvedValueOnce(null);

      await expect(
        paymentsService.getPaymentStatus('pix-no-order', clienteRequester)
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejeita staff sem restaurante vinculado', async () => {
      const staffSemRest = {
        requesterUserId: 'staff-1',
        requesterRole: 'dono',
        requesterRestaurantId: null,
      };
      mockPrisma.paymentIntent.findUnique.mockResolvedValueOnce({
        id: 'pix-staff',
        status: 'paid',
        amount: 5000,
        restaurantId: 'rest-1',
        orderId: 'order-1',
      });

      await expect(paymentsService.getPaymentStatus('pix-staff', staffSemRest)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // getPaymentStatusByOrder — branches não-cobertas
  // ─────────────────────────────────────────────────────────────────

  describe('getPaymentStatusByOrder — sem payment (return early L211)', () => {
    it('retorna estado vazio quando paymentIntent.findFirst retorna null', async () => {
      mockPrisma.paymentIntent.findFirst.mockResolvedValueOnce(null);

      const result = await paymentsService.getPaymentStatusByOrder('order-empty', {
        requesterUserId: 'user-1',
        requesterRole: 'cliente',
        requesterRestaurantId: 'rest-1',
      });

      expect(result).toEqual({
        orderId: 'order-empty',
        status: 'pending',
        qrCode: null,
        expiresAt: null,
      });
      // Não deve buscar order (return early).
      expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentStatusByOrder — staff cross-tenant (BOLA)', () => {
    it('rejeita staff de outro restaurante', async () => {
      const staffOutro = {
        requesterUserId: 'staff-1',
        requesterRole: 'gerente',
        requesterRestaurantId: 'rest-other',
      };
      mockPrisma.paymentIntent.findFirst.mockResolvedValueOnce({
        id: 'pix-cross',
        status: 'paid',
        restaurantId: 'rest-1',
        orderId: 'order-cross',
      });

      await expect(
        paymentsService.getPaymentStatusByOrder('order-cross', staffOutro)
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejeita staff sem restaurante vinculado', async () => {
      mockPrisma.paymentIntent.findFirst.mockResolvedValueOnce({
        id: 'pix-no-rest',
        status: 'paid',
        restaurantId: 'rest-1',
        orderId: 'order-no-rest',
      });

      await expect(
        paymentsService.getPaymentStatusByOrder('order-no-rest', {
          requesterUserId: 'staff-1',
          requesterRole: 'dono',
          requesterRestaurantId: null,
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPaymentStatusByOrder — cliente não-dono (BOLA)', () => {
    it('rejeita cliente cuja order não pertence a ele (não enumera)', async () => {
      mockPrisma.paymentIntent.findFirst.mockResolvedValueOnce({
        id: 'pix-cli-cross',
        status: 'paid',
        restaurantId: 'rest-1',
        orderId: 'order-cli-cross',
      });
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        customerId: 'OUTRO_USER',
      });

      await expect(
        paymentsService.getPaymentStatusByOrder('order-cli-cross', {
          requesterUserId: 'cliente-1',
          requesterRole: 'cliente',
          requesterRestaurantId: 'rest-1',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejeita cliente quando order não existe', async () => {
      mockPrisma.paymentIntent.findFirst.mockResolvedValueOnce({
        id: 'pix-no-order2',
        status: 'paid',
        restaurantId: 'rest-1',
        orderId: 'order-no-order2',
      });
      mockPrisma.order.findUnique.mockResolvedValueOnce(null);

      await expect(
        paymentsService.getPaymentStatusByOrder('order-no-order2', {
          requesterUserId: 'cliente-1',
          requesterRole: 'cliente',
          requesterRestaurantId: 'rest-1',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPaymentStatusByOrder — caminho feliz staff', () => {
    it('retorna dados completos quando staff do mesmo restaurante', async () => {
      const expiresAt = new Date('2026-09-01T00:00:00Z');
      mockPrisma.paymentIntent.findFirst.mockResolvedValueOnce({
        id: 'pix-ok',
        status: 'pending',
        restaurantId: 'rest-1',
        orderId: 'order-ok',
        qrCode: 'https://api.qrserver.com/?data=000201...',
        expiresAt,
      });

      const result = await paymentsService.getPaymentStatusByOrder('order-ok', {
        requesterUserId: 'staff-1',
        requesterRole: 'gerente',
        requesterRestaurantId: 'rest-1',
      });

      expect(result).toEqual({
        orderId: 'order-ok',
        status: 'pending',
        qrCode: 'https://api.qrserver.com/?data=000201...',
        expiresAt,
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // createPixPayment — branches não-cobertas
  // ─────────────────────────────────────────────────────────────────

  describe('createPixPayment — order de outro restaurante (BOLA)', () => {
    it('rejeita quando order.restaurantId diverge do data.restaurantId', async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-x',
        total: 5000,
        restaurantId: 'rest-OUTRO',
      });

      await expect(
        paymentsService.createPixPayment({
          orderId: 'order-x',
          restaurantId: 'rest-1',
        })
      ).rejects.toThrow(ForbiddenException);
      // Não deve criar intent em caso de restaurante divergente.
      expect(mockPrisma.withEncryptedTransaction).not.toHaveBeenCalled();
    });
  });

  describe('createPixPayment — sem amount no body (server-side enforced)', () => {
    it('usa order.total quando data.amount é undefined', async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-noamt',
        total: 7500,
        restaurantId: 'rest-1',
      });
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
        const tx = {
          paymentIntent: {
            create: vi
              .fn()
              .mockImplementation(async (args: { data: { amount: number; expiresAt: Date } }) => ({
                id: 'pix-noamt',
                ...args.data,
                qrCode: 'pending',
              })),
            // Retorna TODOS os campos que `createPixPayment` lê (id/qrCode/expiresAt/amount).
            update: vi
              .fn()
              .mockImplementation(
                async (args: { where: { id: string }; data: { qrCode: string } }) => ({
                  id: args.where.id,
                  qrCode: args.data.qrCode,
                  expiresAt: new Date(),
                  amount: 7500,
                })
              ),
          },
        };
        return (fn as (t: typeof tx) => Promise<unknown>)(tx);
      });

      const result = await paymentsService.createPixPayment({
        orderId: 'order-noamt',
        restaurantId: 'rest-1',
        // amount intencionalmente ausente
      });

      // Deve usar order.total=7500, não gerar Forbidden.
      expect(result.amount).toBe(7500);
    });

    it('usa order.total quando data.amount é null (também aceito)', async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-nullamt',
        total: 3333,
        restaurantId: 'rest-1',
      });
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
        const tx = {
          paymentIntent: {
            create: vi
              .fn()
              .mockImplementation(async (args: { data: { amount: number; expiresAt: Date } }) => ({
                id: 'pix-nullamt',
                ...args.data,
                qrCode: 'pending',
              })),
            update: vi
              .fn()
              .mockImplementation(
                async (args: { where: { id: string }; data: { qrCode: string } }) => ({
                  id: args.where.id,
                  qrCode: args.data.qrCode,
                  expiresAt: new Date(),
                  amount: 3333,
                })
              ),
          },
        };
        return (fn as (t: typeof tx) => Promise<unknown>)(tx);
      });

      const result = await paymentsService.createPixPayment({
        orderId: 'order-nullamt',
        restaurantId: 'rest-1',
        amount: null as unknown as number, // tipo pretendido
      });

      expect(result.amount).toBe(3333);
    });
  });

  describe('createPixPayment — amount coerente (tolerância)', () => {
    it('aceita amount com diferença < R$0.01 (ponto flutuante)', async () => {
      // Cenário real: order.total pode vir como Decimal do Prisma (~5 casas)
      // e o cliente envia number. Diferença de 0.005 deve passar.
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-fp',
        total: 5000, // 5000.00
        restaurantId: 'rest-1',
      });
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
        const tx = {
          paymentIntent: {
            create: vi
              .fn()
              .mockImplementation(async (args: { data: { amount: number; expiresAt: Date } }) => ({
                id: 'pix-fp',
                ...args.data,
                qrCode: 'pending',
              })),
            update: vi
              .fn()
              .mockImplementation(
                async (args: { where: { id: string }; data: { qrCode: string } }) => ({
                  id: args.where.id,
                  qrCode: args.data.qrCode,
                  expiresAt: new Date(),
                  amount: 5000.005,
                })
              ),
          },
        };
        return (fn as (t: typeof tx) => Promise<unknown>)(tx);
      });

      // Diferença de 0.005 (< 0.01) deve passar.
      const result = await paymentsService.createPixPayment({
        orderId: 'order-fp',
        restaurantId: 'rest-1',
        amount: 5000.005,
      });

      expect(result.amount).toBe(5000.005);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Sanity: cobre `currentOrder === null` (improvável, mas defensivo)
  // ─────────────────────────────────────────────────────────────────

  describe('handleWebhook — currentOrder ausente (improvável, defensivo)', () => {
    it('retorna success mesmo se order foi deletada entre webhook e transação', async () => {
      const mockPayment = {
        id: 'pix-gone',
        orderId: 'order-deleted',
        status: 'pending',
        mercadoPagoPaymentId: 'mp-gone',
      };

      const tx = {
        webhookEvent: { create: vi.fn().mockResolvedValue({}) },
        paymentIntent: {
          findFirst: vi.fn().mockResolvedValue(mockPayment),
          update: vi.fn().mockResolvedValue({ ...mockPayment, status: 'paid' }),
        },
        order: {
          // currentOrder === null (order foi deletada entre o webhook e o
          // momento do findUnique — improvável mas teoricamente possível).
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      mockPrisma.withEncryptedTransaction.mockImplementation(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (t: typeof tx) => Promise<unknown>)(tx);
        }
        return [];
      });

      const result = await paymentsService.handleWebhook({
        eventId: 'evt-gone',
        paymentId: 'mp-gone',
        status: 'approved',
      });

      // Não deve quebrar nem tentar atualizar order.
      expect(result.status).toBe('success');
      expect(tx.order.update).not.toHaveBeenCalled();
      expect(tx.order.updateMany).not.toHaveBeenCalled();
    });
  });
});
