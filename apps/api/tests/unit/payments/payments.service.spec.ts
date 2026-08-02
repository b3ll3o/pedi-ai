import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from '../../../src/payments/payments.service';
import { PrismaService } from '../../../src/common/prisma.service';
import { PixGateway } from '../../../src/payments/infrastructure/pix-gateway';

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockPixGateway: PixGateway;

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
    // P0-07: PixGateway é injetado via @Inject(PIX_GATEWAY). Mock padrão
    // retorna charge com BR Code + base64 (cenário produção com MP).
    mockPixGateway = {
      createPixCharge: vi.fn().mockResolvedValue({
        externalId: 'mp-charge-1',
        qrCode: '00020126580014BR.GOV.BCB.PIX...6304ABCD',
        qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUg==',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }),
    };
    paymentsService = new PaymentsService(mockPrisma as unknown as PrismaService, mockPixGateway);
  });

  describe('createPixPayment', () => {
    const paymentData = {
      orderId: 'order-1',
      restaurantId: 'restaurant-1',
      amount: 5000,
    };

    it('should create a PIX payment successfully (P0-07: via PixGateway)', async () => {
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
      let persistedPayload: {
        qrCode: string;
        qrCodeBase64: string | null;
        mercadoPagoPaymentId: string;
      } | null = null;
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
        const tx = {
          paymentIntent: {
            create: vi.fn().mockResolvedValue(createdIntent),
            update: vi
              .fn()
              .mockImplementation(
                async (args: {
                  where: { id: string };
                  data: {
                    qrCode: string;
                    qrCodeBase64: string | null;
                    mercadoPagoPaymentId: string;
                  };
                }) => {
                  persistedPayload = args.data;
                  return { ...createdIntent, ...args.data };
                }
              ),
          },
        };
        return (fn as (t: typeof tx) => Promise<unknown>)(tx);
      });

      const result = await paymentsService.createPixPayment(paymentData);

      // P0-07: PixGateway é chamado com orderId, amount e description derivada.
      expect(mockPixGateway.createPixCharge).toHaveBeenCalledTimes(1);
      expect(mockPixGateway.createPixCharge).toHaveBeenCalledWith({
        orderId: 'pix-1',
        amount: 5000,
        description: expect.stringContaining('Pedido #'),
        expirationMs: expect.any(Number),
      });

      // Persistência: BR Code, base64 e externalId (mpPaymentId).
      expect(persistedPayload).toEqual({
        qrCode: '00020126580014BR.GOV.BCB.PIX...6304ABCD',
        qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUg==',
        mercadoPagoPaymentId: 'mp-charge-1',
      });

      // Retorno expõe qrCodeBase64 para o frontend renderizar <img>.
      expect(result).toMatchObject({
        id: 'pix-1',
        qrCode: '00020126580014BR.GOV.BCB.PIX...6304ABCD',
        qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUg==',
        amount: 5000,
      });
      expect(result.expiresAt).toBeInstanceOf(Date);

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: paymentData.orderId },
      });
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

    it('should propagate PixGateway failure (rollback transaction, no intent persisted)', async () => {
      // P0-07: se o PSP (Mercado Pago) está fora do ar ou recusa a cobrança,
      // a transação inteira sofre rollback — nenhum PaymentIntent com
      // qrCode: 'pending' é persistido (estado intermediário inválido).
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        total: 5000,
        restaurantId: 'restaurant-1',
      });
      (mockPixGateway.createPixCharge as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Falha ao criar cobrança PIX no Mercado Pago (HTTP 503)')
      );
      const txUpdateMock = vi.fn();
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
        const tx = {
          paymentIntent: {
            create: vi.fn().mockResolvedValue({
              id: 'pix-1',
              qrCode: 'pending',
            }),
            update: txUpdateMock,
          },
        };
        return (fn as (t: typeof tx) => Promise<unknown>)(tx);
      });

      await expect(paymentsService.createPixPayment(paymentData)).rejects.toThrow(/Mercado Pago/);
      // Update do qrCode nunca é chamado (gateway falhou antes).
      expect(txUpdateMock).not.toHaveBeenCalled();
    });

    it('should NOT use stub fallback — gateway is the only path', async () => {
      // P0-07 guardrail: se algum dev futuro reintroduzir `buildPixStubPayload`,
      // este teste falha porque o PixGateway mockado NUNCA é chamado.
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        total: 5000,
        restaurantId: 'restaurant-1',
      });
      mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
        const tx = {
          paymentIntent: {
            create: vi.fn().mockResolvedValue({ id: 'pix-1', qrCode: 'pending' }),
            update: vi
              .fn()
              .mockImplementation(
                async (args: { where: { id: string }; data: Record<string, unknown> }) => ({
                  id: args.where.id,
                  qrCode: 'from-gateway',
                  qrCodeBase64: '',
                  mercadoPagoPaymentId: 'ext-1',
                  ...args.data,
                })
              ),
          },
        };
        return (fn as (t: typeof tx) => Promise<unknown>)(tx);
      });

      await paymentsService.createPixPayment(paymentData);

      // Stub legacy foi removido. Se for reintroduzido, este assert quebra
      // porque `createPixCharge` deixa de ser invocado.
      expect(mockPixGateway.createPixCharge).toHaveBeenCalledTimes(1);
      expect(mockPixGateway.createPixCharge).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'pix-1',
          amount: 5000,
        })
      );
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
          create: vi.fn().mockRejectedValue(
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
