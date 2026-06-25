import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
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
      const mockOrder = { id: 'order-1', total: 5000 };
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.paymentIntent.create.mockResolvedValue({
        id: 'pix-1',
        orderId: paymentData.orderId,
        restaurantId: paymentData.restaurantId,
        amount: paymentData.amount,
        paymentMethod: 'pix',
        status: 'pending',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?data=pix-${paymentData.orderId}`,
      });

      const result = await paymentsService.createPixPayment(paymentData);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('expiresAt');
      expect(result.amount).toBe(paymentData.amount);
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: paymentData.orderId },
      });
      expect(mockPrisma.paymentIntent.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(paymentsService.createPixPayment(paymentData)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should generate QR code with correct order ID', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1', total: 5000 });
      mockPrisma.paymentIntent.create.mockImplementation(
        async (data: { data: Record<string, unknown> }) => ({
          id: 'pix-1',
          ...data.data,
          expiresAt: new Date(),
          qrCode: `https://api.qrserver.com/v1/create-qr-code/?data=pix-${paymentData.orderId}`,
        })
      );

      const result = await paymentsService.createPixPayment(paymentData);

      expect(result.qrCode).toContain(paymentData.orderId);
    });

    it('should set expiration to 30 minutes from now', async () => {
      const beforeCreate = Date.now();
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1', total: 5000 });
      mockPrisma.paymentIntent.create.mockImplementation(
        async (data: { data: Record<string, unknown> }) => {
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
        }
      );

      await paymentsService.createPixPayment(paymentData);
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status successfully', async () => {
      const mockPayment = {
        id: 'pix-1',
        status: 'approved',
        amount: 5000,
      };
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(mockPayment);

      const result = await paymentsService.getPaymentStatus('pix-1');

      expect(result.id).toBe('pix-1');
      expect(result.status).toBe('approved');
      expect(result.amount).toBe(5000);
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(null);

      await expect(paymentsService.getPaymentStatus('non-existent')).rejects.toThrow(
        NotFoundException
      );
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

      mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.paymentIntent.findFirst.mockResolvedValue(mockPayment);
      mockPrisma.paymentIntent.update.mockResolvedValue(mockUpdated);
      mockPrisma.order.update.mockResolvedValue({ id: 'order-1', paymentStatus: 'approved' });

      const result = await paymentsService.handleWebhook({
        eventId: 'evt-1',
        paymentId: 'mp-123',
        status: 'approved',
      });

      expect(result).toMatchObject({ status: 'success' });
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { paymentStatus: 'paid', status: 'paid' },
      });
    });

    it('should return not_found status if payment not found by mercado pago ID', async () => {
      mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.paymentIntent.findFirst.mockResolvedValue(null);

      const result = await paymentsService.handleWebhook({
        eventId: 'evt-2',
        paymentId: 'unknown-mp-id',
        status: 'approved',
      });

      expect(result).toMatchObject({ status: 'not_found' });
      expect(mockPrisma.paymentIntent.update).not.toHaveBeenCalled();
    });
  });
});
