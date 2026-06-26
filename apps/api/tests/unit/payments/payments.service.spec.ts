import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from '../../../src/payments/payments.service';
import { PrismaService } from '../../../src/common/prisma.service';

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const createMockPrisma = () => ({
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
    // Suporta tanto transação em batch (array) quanto interativa (callback).
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        // Transação interativa: fornece um `tx` com os mesmos métodos mockados.
        const tx = {
          webhookEvent: { create: vi.fn(), findUnique: vi.fn() },
          // Auditoria A-02: paymentIntent.create agora roda dentro do tx
          // (createPixPayment faz create+update em uma transação).
          paymentIntent: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
          // ACHADO-6 (Re-varredura 5): updateMany entra no tx — webhook usa
          // optimistic locking com `where: { id, version }`.
          order: { update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        };
        return await (arg as (t: typeof tx) => Promise<unknown>)(tx);
      }
      // Batch: executa as promessas em ordem.
      const ops = arg as Promise<unknown>[];
      const results: unknown[] = [];
      for (const op of ops) results.push(await op);
      return results;
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    paymentsService = new PaymentsService(mockPrisma as unknown as PrismaService);
  });

  describe('createPixPayment', () => {
    const paymentData = {
      orderId: 'order-1',
      restaurantId: 'restaurant-1',
      amount: 5000,
    };

    it('should create a PIX payment successfully', async () => {
      const mockOrder = { id: 'order-1', total: 5000, restaurantId: 'restaurant-1' };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      // Auditoria A-02: create + update rodam dentro de `$transaction`
      // interativa — o mock precisa simular o `tx` retornando a Order criada
      // do create para o update.
      const createdIntent = {
        id: 'pix-1',
        orderId: paymentData.orderId,
        restaurantId: paymentData.restaurantId,
        amount: paymentData.amount,
        paymentMethod: 'pix',
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        qrCode: 'pending',
      };
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
        const tx = {
          paymentIntent: {
            create: vi.fn().mockResolvedValue(createdIntent),
            update: vi
              .fn()
              .mockImplementation(
                async (args: { where: { id: string }; data: { qrCode: string } }) => ({
                  ...createdIntent,
                  qrCode: args.data.qrCode,
                })
              ),
          },
        };
        return (fn as (t: typeof tx) => Promise<unknown>)(tx);
      });

      const result = await paymentsService.createPixPayment(paymentData);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('expiresAt');
      expect(result.amount).toBe(paymentData.amount);
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: paymentData.orderId },
      });
      // A17: QR Code agora é BR Code stub (começa com o TLV 00 02 01).
      expect(result.qrCode).toContain('api.qrserver.com');
      expect(result.qrCode).toContain('000201');
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(paymentsService.createPixPayment(paymentData)).rejects.toThrow(
        NotFoundException
      );
    });

    // C6: amount do body diverge do order.total → 403 (anti-fraude).
    it('should reject when body amount diverges from order.total (anti-fraud C6)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        total: 5000,
        restaurantId: 'restaurant-1',
      });

      // Cliente envia amount=1 para pedido de R$5000.
      await expect(paymentsService.createPixPayment({ ...paymentData, amount: 1 })).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should generate QR code with BR Code payload (A17)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        total: 5000,
        restaurantId: 'restaurant-1',
      });
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
        const tx = {
          paymentIntent: {
            create: vi.fn().mockImplementation(async (data: { data: Record<string, unknown> }) => ({
              id: 'pix-1',
              ...data.data,
              expiresAt: new Date(),
              qrCode: 'pending',
            })),
            update: vi
              .fn()
              .mockImplementation(
                async (args: { where: { id: string }; data: { qrCode: string } }) => ({
                  id: args.where.id,
                  qrCode: args.data.qrCode,
                  expiresAt: new Date(),
                })
              ),
          },
        };
        return (fn as (t: typeof tx) => Promise<unknown>)(tx);
      });

      const result = await paymentsService.createPixPayment(paymentData);

      // A17: BR Code stub inclui o merchant account info + txid derivado
      // do paymentId. Validamos pedaços da estrutura TLV.
      expect(result.qrCode).toContain('api.qrserver.com');
      expect(result.qrCode).toContain(encodeURIComponent('PEDI-AI STUB'));
    });

    it('should set expiration to 30 minutes from now', async () => {
      const beforeCreate = Date.now();
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        total: 5000,
        restaurantId: 'restaurant-1',
      });
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
        const tx = {
          paymentIntent: {
            create: vi.fn().mockImplementation(async (data: { data: Record<string, unknown> }) => {
              const expiresAt = data.data.expiresAt as Date;
              const diff = expiresAt.getTime() - beforeCreate;
              // Should be approximately 30 minutes (allow 5 second variance)
              expect(diff).toBeGreaterThanOrEqual(30 * 60 * 1000 - 5000);
              expect(diff).toBeLessThanOrEqual(30 * 60 * 1000 + 5000);
              return {
                id: 'pix-1',
                ...data.data,
                expiresAt,
              };
            }),
            update: vi
              .fn()
              .mockImplementation(
                async (args: { where: { id: string }; data: { qrCode: string } }) => ({
                  id: args.where.id,
                  qrCode: args.data.qrCode,
                  expiresAt: new Date(),
                })
              ),
          },
        };
        return (fn as (t: typeof tx) => Promise<unknown>)(tx);
      });

      await paymentsService.createPixPayment(paymentData);
    });
  });

  describe('getPaymentStatus', () => {
    const staffRequester = {
      requesterUserId: 'user-1',
      requesterRole: 'gerente',
      requesterRestaurantId: 'rest-1',
    };

    it('should return payment status for staff of same restaurant', async () => {
      const mockPayment = {
        id: 'pix-1',
        status: 'approved',
        amount: 5000,
        restaurantId: 'rest-1',
        orderId: 'order-1',
      };
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(mockPayment);

      const result = await paymentsService.getPaymentStatus('pix-1', staffRequester);

      expect(result.id).toBe('pix-1');
      expect(result.status).toBe('approved');
      expect(result.amount).toBe(5000);
    });

    it('should throw ForbiddenException for staff of different restaurant', async () => {
      const mockPayment = {
        id: 'pix-1',
        status: 'approved',
        amount: 5000,
        restaurantId: 'rest-other',
        orderId: 'order-1',
      };
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(mockPayment);

      await expect(paymentsService.getPaymentStatus('pix-1', staffRequester)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(null);

      await expect(
        paymentsService.getPaymentStatus('non-existent', staffRequester)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if requester is missing (defense)', async () => {
      await expect(
        // @ts-expect-error testing defensive behavior
        paymentsService.getPaymentStatus('pix-1', {})
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleWebhook', () => {
    it('should update payment and order status on valid webhook', async () => {
      const mockPayment = {
        id: 'pix-1',
        orderId: 'order-1',
        status: 'pending',
        mercadoPagoPaymentId: 'mp-123',
      };
      const mockUpdated = { ...mockPayment, status: 'approved' };

      // Configura a transação interativa mockada.
      // Auditoria A-R-02: handleWebhook agora consulta order.status antes de
      // aplicar update — a transição `pending_payment → paid` é válida.
      // Auditoria ACHADO-6: findUnique agora retorna também `version`, e o
      // update do order é via `updateMany` com optimistic locking.
      const tx = {
        webhookEvent: { create: vi.fn().mockResolvedValue({}) },
        paymentIntent: {
          findFirst: vi.fn().mockResolvedValue(mockPayment),
          update: vi.fn().mockResolvedValue(mockUpdated),
        },
        order: {
          findUnique: vi.fn().mockResolvedValue({ status: 'pending_payment', version: 0 }),
          update: vi.fn().mockResolvedValue({ id: 'order-1', paymentStatus: 'approved' }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      mockPrisma.$transaction.mockImplementation(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (t: typeof tx) => Promise<unknown>)(tx);
        }
        return [];
      });

      const result = await paymentsService.handleWebhook({
        eventId: 'evt-1',
        paymentId: 'mp-123',
        status: 'approved',
      });

      expect(result).toMatchObject({ status: 'success' });
      // ACHADO-6: updateMany com optimistic locking (where: { id, version }).
      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', version: 0 },
        data: {
          status: 'paid',
          paymentStatus: 'paid',
          version: { increment: 1 },
        },
      });
      expect(tx.webhookEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'evt-1', eventType: 'payment' }),
      });
    });

    it('should NOT regress order status if already advanced (e.g. preparing)', async () => {
      // A-R-02: webhook atrasado do MP chega depois que staff moveu para `preparing`.
      // Não devemos regredir para `paid`; só sincronizar paymentStatus.
      const mockPayment = {
        id: 'pix-2',
        orderId: 'order-2',
        status: 'pending',
        mercadoPagoPaymentId: 'mp-456',
      };
      const mockUpdated = { ...mockPayment, status: 'approved' };

      const tx = {
        webhookEvent: { create: vi.fn().mockResolvedValue({}) },
        paymentIntent: {
          findFirst: vi.fn().mockResolvedValue(mockPayment),
          update: vi.fn().mockResolvedValue(mockUpdated),
        },
        order: {
          findUnique: vi.fn().mockResolvedValue({ status: 'preparing', version: 3 }),
          update: vi.fn().mockResolvedValue({ id: 'order-2', paymentStatus: 'paid' }),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }), // nunca chamado (preparing não é transição válida)
        },
      };
      mockPrisma.$transaction.mockImplementation(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (t: typeof tx) => Promise<unknown>)(tx);
        }
        return [];
      });

      const result = await paymentsService.handleWebhook({
        eventId: 'evt-2',
        paymentId: 'mp-456',
        status: 'approved',
      });

      expect(result).toMatchObject({ status: 'success' });
      // Deve atualizar APENAS paymentStatus, sem mexer no status.
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-2' },
        data: { paymentStatus: 'paid' },
      });
      // updateMany não é chamado para transições inválidas.
      expect(tx.order.updateMany).not.toHaveBeenCalled();
    });

    it('should return not_found status if payment not found by mercado pago ID', async () => {
      const tx = {
        webhookEvent: { create: vi.fn().mockResolvedValue({}) },
        paymentIntent: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() },
        order: { update: vi.fn(), updateMany: vi.fn() },
      };
      mockPrisma.$transaction.mockImplementation(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (t: typeof tx) => Promise<unknown>)(tx);
        }
        return [];
      });

      const result = await paymentsService.handleWebhook({
        eventId: 'evt-2',
        paymentId: 'unknown-mp-id',
        status: 'approved',
      });

      expect(result).toMatchObject({ status: 'not_found' });
      expect(tx.paymentIntent.update).not.toHaveBeenCalled();
      expect(tx.order.update).not.toHaveBeenCalled();
    });

    it('should return duplicate status when WebhookEvent.create throws P2002 (race)', async () => {
      // Simula a race condition: a primeira entrega está committando o
      // WebhookEvent com este eventId; a segunda撞a unique constraint.
      const tx = {
        webhookEvent: {
          create: vi
            .fn()
            .mockRejectedValue(
              new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: 'test',
              })
            ),
        },
        paymentIntent: { findFirst: vi.fn(), update: vi.fn() },
        order: { update: vi.fn(), updateMany: vi.fn() },
      };
      mockPrisma.$transaction.mockImplementation(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (t: typeof tx) => Promise<unknown>)(tx);
        }
        return [];
      });

      const result = await paymentsService.handleWebhook({
        eventId: 'evt-dup',
        paymentId: 'mp-123',
        status: 'approved',
      });

      expect(result).toMatchObject({ status: 'duplicate', eventId: 'evt-dup' });
      expect(tx.paymentIntent.update).not.toHaveBeenCalled();
      expect(tx.order.update).not.toHaveBeenCalled();
    });
  });
});
