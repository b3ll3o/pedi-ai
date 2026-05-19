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
  });

  const createMockRealtime = () => ({
    emitOrderUpdate: vi.fn(),
    emitNewOrder: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockRealtime = createMockRealtime();
    ordersService = new OrdersService(mockPrisma as unknown as PrismaService, mockRealtime as unknown as RealtimeService);
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
        items: [
          { productId: 'prod-1', quantity: 1, unitPrice: 100, totalPrice: 100 },
        ],
      };
      const createdOrder = { id: 'order-1', ...orderData, items: orderData.items };
      mockPrisma.order.create.mockResolvedValue(createdOrder);

      const result = await ordersService.create(orderData);

      expect(result).toEqual(createdOrder);
      expect(mockPrisma.order.create).toHaveBeenCalled();
      expect(mockRealtime.emitNewOrder).toHaveBeenCalledWith('rest-1', {
        id: 'order-1',
        total: 110,
      });
    });
  });

  describe('updateStatus', () => {
    it('should update status and emit realtime event', async () => {
      const updatedOrder = { id: 'order-1', status: 'preparing', restaurantId: 'rest-1' };
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await ordersService.updateStatus('order-1', 'preparing');

      expect(result).toEqual(updatedOrder);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'preparing' },
      });
      expect(mockPrisma.orderStatusHistory.create).toHaveBeenCalled();
      expect(mockRealtime.emitOrderUpdate).toHaveBeenCalled();
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status', async () => {
      const updatedOrder = { id: 'order-1', paymentStatus: 'paid' };
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await ordersService.updatePaymentStatus('order-1', 'paid');

      expect(result).toEqual(updatedOrder);
    });
  });
});