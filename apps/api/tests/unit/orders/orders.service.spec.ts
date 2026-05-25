import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { OrdersService } from '../../../src/orders/orders.service';
import { PrismaService } from '../../../src/common/prisma.service';
import { RealtimeService } from '../../../src/realtime/realtime.service';

describe('OrdersService', () => {
  let ordersService: OrdersService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockRealtime: ReturnType<typeof createMockRealtime>;

  const createMockPrisma = () => ({
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    orderStatusHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fn) => {
      const mockTx = {
        order: {
          create: vi.fn(),
          update: vi.fn(),
        },
        orderStatusHistory: {
          create: vi.fn(),
        },
      };
      return fn(mockTx);
    }),
  });

  const createMockRealtime = () => ({
    emitOrderUpdate: vi.fn(),
    emitNewOrder: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockRealtime = createMockRealtime();
    ordersService = new OrdersService(
      mockPrisma as unknown as PrismaService,
      mockRealtime as unknown as RealtimeService
    );
  });

  describe('findByRestaurant', () => {
    it('should return orders for a restaurant', async () => {
      const orders = [
        { id: 'order-1', restaurantId: 'rest-1', total: 100, items: [] },
        { id: 'order-2', restaurantId: 'rest-1', total: 200, items: [] },
      ];
      mockPrisma.order.findMany.mockResolvedValue(orders);

      const result = await ordersService.findByRestaurant('rest-1');

      expect(result).toEqual(orders);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 'rest-1' },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });
    });
  });

  describe('findById', () => {
    it('should return order when found', async () => {
      const order = { id: 'order-1', restaurantId: 'rest-1', total: 100, items: [] };
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const result = await ordersService.findById('order-1');

      expect(result).toEqual(order);
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(ordersService.findById('order-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create an order and emit realtime event', async () => {
      const orderData = {
        restaurantId: 'rest-1',
        subtotal: 100,
        tax: 10,
        total: 110,
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100, totalPrice: 100 }],
      };
      const createdOrder = {
        id: 'order-1',
        ...orderData,
        items: orderData.items,
        status: 'pending',
        restaurantId: 'rest-1',
      };

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: { create: vi.fn().mockResolvedValue(createdOrder) },
          orderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await ordersService.create(orderData);

      expect(result).toEqual(createdOrder);
      expect(mockRealtime.emitNewOrder).toHaveBeenCalledWith('rest-1', {
        id: 'order-1',
        total: 110,
      });
    });
  });

  describe('updateStatus', () => {
    it('should update status and emit realtime event', async () => {
      const updatedOrder = { id: 'order-1', status: 'preparing', restaurantId: 'rest-1' };

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: { update: vi.fn().mockResolvedValue(updatedOrder) },
          orderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await ordersService.updateStatus('order-1', 'preparing');

      expect(result).toEqual(updatedOrder);
      expect(mockRealtime.emitOrderUpdate).toHaveBeenCalled();
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status', async () => {
      const updatedOrder = { id: 'order-1', paymentStatus: 'paid' };
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await ordersService.updatePaymentStatus('order-1', 'paid');

      expect(result).toEqual(updatedOrder);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { paymentStatus: 'paid' },
      });
    });
  });

  describe('create edge cases', () => {
    it('should create order with table ID', async () => {
      const orderData = {
        restaurantId: 'rest-1',
        tableId: 'table-1',
        subtotal: 100,
        tax: 10,
        total: 110,
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100, totalPrice: 100 }],
      };
      const createdOrder = { id: 'order-1', ...orderData, status: 'pending' };

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: { create: vi.fn().mockResolvedValue(createdOrder) },
          orderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await ordersService.create(orderData);

      expect(result.id).toBe('order-1');
      expect(mockRealtime.emitNewOrder).toHaveBeenCalledWith(
        'rest-1',
        expect.objectContaining({ id: 'order-1' })
      );
    });

    it('should create order with customer info', async () => {
      const orderData = {
        restaurantId: 'rest-1',
        customerId: 'cust-1',
        customerPhone: '+5511999999999',
        customerName: 'João Silva',
        customerEmail: 'joao@example.com',
        subtotal: 100,
        tax: 10,
        total: 110,
        items: [],
      };
      const createdOrder = { id: 'order-2', ...orderData, status: 'pending' };

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: { create: vi.fn().mockResolvedValue(createdOrder) },
          orderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await ordersService.create(orderData);

      expect(result.customerName).toBe('João Silva');
    });

    it('should create order with idempotency key', async () => {
      const orderData = {
        restaurantId: 'rest-1',
        subtotal: 100,
        tax: 10,
        total: 110,
        idempotencyKey: 'unique-key-123',
        items: [],
      };
      const createdOrder = { id: 'order-3', ...orderData, status: 'pending' };

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: {
            create: vi.fn().mockResolvedValue(createdOrder),
          },
          orderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await ordersService.create(orderData);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.id).toBe('order-3');
    });
  });

  describe('updateStatus with notes', () => {
    it('should record status change with notes', async () => {
      const updatedOrder = { id: 'order-1', status: 'cancelled', restaurantId: 'rest-1' };

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: { update: vi.fn().mockResolvedValue(updatedOrder) },
          orderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await ordersService.updateStatus('order-1', 'cancelled', 'Cliente cancelou');

      expect(result.status).toBe('cancelled');
    });
  });
});
