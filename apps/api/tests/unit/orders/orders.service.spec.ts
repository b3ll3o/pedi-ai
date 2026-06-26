import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      // Auditoria A-01: updateMany condicional para state-machine atômica.
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'prod-1', price: 100, name: 'Produto 1' },
        { id: 'prod-2', price: 50, name: 'Produto 2' },
      ]),
    },
    orderStatusHistory: {
      create: vi.fn(),
    },
    // Auditoria A-AD-05: tabela `IdempotencyKey` para dedupe atômico.
    idempotencyKey: {
      create: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
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
        // M-NEW-03: idempotencyKey.create também é parte do tx.
        idempotencyKey: {
          create: vi.fn().mockResolvedValue({}),
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

      expect(result.data).toEqual(orders);
      expect(result.nextCursor).toBeNull();
      expect(result.count).toBe(2);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // M14: por padrão, pedidos cancelados são excluídos.
          where: { restaurantId: 'rest-1', status: { not: 'cancelled' } },
          include: { items: true },
        })
      );
    });

    it('should expose nextCursor when more pages exist', async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        id: `order-${i}`,
        restaurantId: 'rest-1',
        total: i,
        items: [],
      }));
      mockPrisma.order.findMany.mockResolvedValue(items);

      const result = await ordersService.findByRestaurant('rest-1', { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.nextCursor).toBe('order-19');
    });
  });

  describe('findById', () => {
    it('should return order when found and staff owns the restaurant', async () => {
      const order = {
        id: 'order-1',
        restaurantId: 'rest-1',
        customerId: 'cust-1',
        total: 100,
        items: [],
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const result = await ordersService.findById('order-1', {
        requesterUserId: 'user-1',
        requesterRole: 'gerente',
        requesterRestaurantId: 'rest-1',
      });

      expect(result).toEqual(order);
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        ordersService.findById('order-1', {
          requesterUserId: 'user-1',
          requesterRole: 'cliente',
          requesterRestaurantId: null,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for cliente who is not the order owner (IDOR)', async () => {
      const order = {
        id: 'order-1',
        restaurantId: 'rest-1',
        customerId: 'cust-OTHER',
        total: 100,
        items: [],
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);

      await expect(
        ordersService.findById('order-1', {
          requesterUserId: 'cust-1',
          requesterRole: 'cliente',
          requesterRestaurantId: null,
        })
      ).rejects.toThrow(/pertence a outro restaurante/);
    });

    it('should return order when cliente IS the customer', async () => {
      const order = {
        id: 'order-1',
        restaurantId: 'rest-1',
        customerId: 'cust-1',
        total: 100,
        items: [],
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const result = await ordersService.findById('order-1', {
        requesterUserId: 'cust-1',
        requesterRole: 'cliente',
        requesterRestaurantId: null,
      });

      expect(result).toEqual(order);
    });

    it('should throw ForbiddenException for staff from a different restaurant', async () => {
      const order = {
        id: 'order-1',
        restaurantId: 'rest-1',
        customerId: 'cust-1',
        total: 100,
        items: [],
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);

      await expect(
        ordersService.findById('order-1', {
          requesterUserId: 'user-2',
          requesterRole: 'gerente',
          requesterRestaurantId: 'rest-2',
        })
      ).rejects.toThrow(/pertence a outro restaurante/);
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
      // A-01: 1ª findUnique = snapshot, 2ª = post-update dentro do tx.
      // ACHADO-6: findUnique agora retorna também `version` (optimistic locking).
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({
          id: 'order-1',
          status: 'paid',
          restaurantId: 'rest-1',
          version: 2,
        })
        .mockResolvedValueOnce(updatedOrder);

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: { findUnique: vi.fn().mockResolvedValue(updatedOrder) },
          orderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await ordersService.updateStatus('order-1', 'preparing');

      expect(result).toEqual(updatedOrder);
      expect(mockRealtime.emitOrderUpdate).toHaveBeenCalled();
      // ACHADO-6: updateMany chamado com where: { id, status, version }.
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', status: 'paid', version: 2 },
        data: { status: 'preparing', version: { increment: 1 } },
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
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100, totalPrice: 100 }],
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
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100, totalPrice: 100 }],
      };
      const createdOrder = { id: 'order-3', ...orderData, status: 'pending' };
      mockPrisma.order.findFirst.mockResolvedValue(null);

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: {
            create: vi.fn().mockResolvedValue(createdOrder),
          },
          orderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
          // M-NEW-03: claim atômico dentro da transação.
          idempotencyKey: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await ordersService.create(orderData);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.id).toBe('order-3');
    });

    it('should return existing order on duplicate idempotencyKey (A-AD-05)', async () => {
      // A-AD-05/M-NEW-03: o check de idempotência é feito ANTES da transação.
      // Se já existe uma Order com esta chave, retornamos ela sem abrir transação.
      const orderData = {
        restaurantId: 'rest-1',
        subtotal: 100,
        tax: 10,
        total: 110,
        idempotencyKey: 'dup-key',
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100, totalPrice: 100 }],
      };
      const existingOrder = { id: 'order-dup', ...orderData, status: 'pending' };

      // order.findFirst retorna a order existente (request anterior bem-sucedida).
      mockPrisma.order.findFirst.mockResolvedValueOnce(existingOrder);

      const result = await ordersService.create(orderData);

      expect(result.id).toBe('order-dup');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if idempotencyKey claimed but no Order yet (M-NEW-03)', async () => {
      // Auditoria M-NEW-03: tx.idempotencyKey.create falha com P2002 (concorrência).
      // Devemos lançar 409 para o cliente tentar de novo.
      const { Prisma } = await import('@prisma/client');
      const { ConflictException } = await import('@nestjs/common');
      const orderData = {
        restaurantId: 'rest-1',
        subtotal: 100,
        tax: 10,
        total: 110,
        idempotencyKey: 'orphan-key',
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100, totalPrice: 100 }],
      };

      // order.findFirst retorna null (não há order ainda).
      mockPrisma.order.findFirst.mockResolvedValueOnce(null);
      // tx.idempotencyKey.create falha com P2002 (request concorrente claimed).
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          idempotencyKey: {
            create: vi.fn().mockRejectedValue(
              new Prisma.PrismaClientKnownRequestError('Unique constraint', {
                code: 'P2002',
                clientVersion: 'test',
              })
            ),
          },
          order: { create: vi.fn().mockResolvedValue({ id: 'order-x' }) },
          orderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      // order.findFirst no catch também retorna null.
      mockPrisma.order.findFirst.mockResolvedValueOnce(null);

      await expect(ordersService.create(orderData)).rejects.toThrow(ConflictException);
    });

    it('should rollback idempotencyKey when transaction fails (M-NEW-03)', async () => {
      // M-NEW-03: claim está DENTRO da transação. Quando o tx falha, o claim é
      // revertido pelo Prisma automaticamente — não precisa de cleanup manual.
      const orderData = {
        restaurantId: 'rest-1',
        subtotal: 100,
        tax: 10,
        total: 110,
        idempotencyKey: 'fail-key',
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100, totalPrice: 100 }],
      };

      mockPrisma.order.findFirst.mockResolvedValueOnce(null);
      // $transaction joga erro (ex: conexão caiu) — claim deve ser revertido pelo Prisma.
      mockPrisma.$transaction.mockRejectedValueOnce(new Error('connection lost'));

      await expect(ordersService.create(orderData)).rejects.toThrow('connection lost');
      // Cleanup manual NÃO deve ter sido chamado (a transação reverteu).
      expect(mockPrisma.idempotencyKey.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus with notes', () => {
    it('should record status change with notes', async () => {
      const updatedOrder = { id: 'order-1', status: 'cancelled', restaurantId: 'rest-1' };
      // Auditoria A-01: updateMany condicional primeiro; depois findUnique dentro do tx.
      // ACHADO-6: findUnique inclui `version` para optimistic locking.
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({
          id: 'order-1',
          status: 'pending_payment',
          restaurantId: 'rest-1',
          version: 0,
        })
        .mockResolvedValueOnce(updatedOrder);

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: { findUnique: vi.fn().mockResolvedValue(updatedOrder) },
          orderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await ordersService.updateStatus('order-1', 'cancelled', 'Cliente cancelou');

      expect(result.status).toBe('cancelled');
      // ACHADO-6: updateMany com version.
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', status: 'pending_payment', version: 0 },
        data: { status: 'cancelled', version: { increment: 1 } },
      });
    });
  });

  describe('updateStatus state machine (M16)', () => {
    it('should reject cancelled → delivered (terminal state)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'cancelled',
        restaurantId: 'rest-1',
      });
      await expect(ordersService.updateStatus('order-1', 'delivered', undefined)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should reject delivered → preparing (terminal state)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: 'delivered',
        restaurantId: 'rest-1',
      });
      await expect(ordersService.updateStatus('order-1', 'preparing', undefined)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should allow paid → preparing (valid transition)', async () => {
      const updatedOrder = { id: 'order-1', status: 'preparing', restaurantId: 'rest-1' };
      // A-01: 1ª chamada findUnique = snapshot; 2ª = dentro do tx (post-update).
      // ACHADO-6: snapshot inclui version.
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({
          id: 'order-1',
          status: 'paid',
          restaurantId: 'rest-1',
          version: 1,
        })
        .mockResolvedValueOnce(updatedOrder);
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          order: { findUnique: vi.fn().mockResolvedValue(updatedOrder) },
          orderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      const result = await ordersService.updateStatus('order-1', 'preparing', undefined);
      expect(result.status).toBe('preparing');
    });

    it('should throw ConflictException when version mismatch (TOCTOU race)', async () => {
      // ACHADO-6: outra request incrementou version entre snapshot e update.
      // updateMany retorna count=0 → 409.
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-1',
        status: 'paid',
        restaurantId: 'rest-1',
        version: 5,
      });
      mockPrisma.order.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(ordersService.updateStatus('order-1', 'preparing')).rejects.toThrow(
        /Pedido foi modificado por outra request/
      );
    });
  });
});
