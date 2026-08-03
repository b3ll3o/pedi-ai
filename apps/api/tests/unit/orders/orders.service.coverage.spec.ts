import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { OrdersService } from '../../../src/orders/orders.service';
import { PrismaService } from '../../../src/common/prisma.service';
import { RealtimeService } from '../../../src/realtime/realtime.service';

/**
 * Spec de cobertura para `OrdersService` (475 linhas, BC `pedido/`).
 *
 * Cobre branches dos 6 métodos públicos:
 * - findByRestaurant (paginação cursor + include cancelados opcional)
 * - assertTableOwnership (sem tableId / cross-tenant / inativa / happy)
 * - findById (staff path / cliente path / BOLA / NotFound)
 * - findByCustomer (filtro restaurante opcional + cursor)
 * - create (idempotência + cross-tenant product injection defesa + P2002 recovery)
 * - updateStatus (state-machine + optimistic locking + cross-tenant)
 *
 * Mock flat: o service recebe `PrismaService` que tem `.order` etc.
 * diretamente. O callback do `withEncryptedTransaction` recebe o MESMO
 * objeto via `.call(this)`.
 */
describe('OrdersService — cobertura de branches', () => {
  let service: OrdersService;
  let p: ReturnType<typeof createMockPrisma>;
  let mockRealtime: { emitNewOrder: ReturnType<typeof vi.fn>; emitOrderUpdate: ReturnType<typeof vi.fn> };

  function createMockPrisma() {
    const prisma: any = {
      order: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      product: { findMany: vi.fn() },
      table: { findUnique: vi.fn() },
      idempotencyKey: { create: vi.fn() },
      orderStatusHistory: { create: vi.fn() },
      withEncryptedTransaction: vi.fn(),
      $transaction: vi.fn(),
    };
    // Repassa `prisma` como `tx` para callbacks (produção: re-estende o client).
    prisma.withEncryptedTransaction.mockImplementation(async (cb: (t: unknown) => Promise<unknown>) =>
      cb(prisma)
    );
    prisma.$transaction.mockImplementation(async (cb: (t: unknown) => Promise<unknown>) =>
      cb(prisma)
    );
    return prisma as PrismaService;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    p = createMockPrisma();
    mockRealtime = {
      emitNewOrder: vi.fn(),
      emitOrderUpdate: vi.fn(),
    };
    service = new OrdersService(p, mockRealtime as unknown as RealtimeService);
  });

  // ─────────────────────────────────────────────────────────────────
  // findByRestaurant — paginação cursor + include cancelados
  // ─────────────────────────────────────────────────────────────────
  describe('findByRestaurant', () => {
    it('lista pedidos ativos (sem cancelados) e aplica paginação', async () => {
      const orders = Array.from({ length: 21 }, (_, i) => ({
        id: `o-${i}`,
        items: [],
      }));
      p.order.findMany.mockResolvedValueOnce(orders);

      const result = await service.findByRestaurant('rest-1', { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.nextCursor).toBe('o-19');
      expect(p.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { restaurantId: 'rest-1', status: { not: 'cancelled' } },
          take: 21,
          include: { items: true },
        })
      );
    });

    it('inclui cancelados quando includeCancelled=true', async () => {
      p.order.findMany.mockResolvedValueOnce([]);
      await service.findByRestaurant('rest-1', { includeCancelled: true });
      expect(p.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { restaurantId: 'rest-1' } })
      );
    });

    it('aplica cursor com skip=1 quando informado', async () => {
      p.order.findMany.mockResolvedValueOnce([]);
      await service.findByRestaurant('rest-1', { cursor: 'cur-1', limit: 5 });
      expect(p.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 6, cursor: { id: 'cur-1' }, skip: 1 })
      );
    });

    it('usa PAGINATION_DEFAULT_LIMIT (=20) quando limit não especificado', async () => {
      p.order.findMany.mockResolvedValueOnce([]);
      await service.findByRestaurant('rest-1');
      expect(p.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 21 }));
    });

    it('nextCursor=null quando itens <= limit', async () => {
      p.order.findMany.mockResolvedValueOnce([
        { id: 'o-1', items: [] },
        { id: 'o-2', items: [] },
      ]);
      const result = await service.findByRestaurant('rest-1', { limit: 20 });
      expect(result.nextCursor).toBeNull();
      expect(result.data).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // assertTableOwnership — 4 caminhos
  // ─────────────────────────────────────────────────────────────────
  describe('assertTableOwnership', () => {
    it('retorna requesterRestaurantId quando tableId ausente', async () => {
      const r = await service.assertTableOwnership(undefined, 'body-1', 'req-1');
      expect(r).toBe('req-1');
      expect(p.table.findUnique).not.toHaveBeenCalled();
    });

    it('retorna bodyRestaurantId quando requester ausente (anônimo)', async () => {
      const r = await service.assertTableOwnership(undefined, 'body-1', null);
      expect(r).toBe('body-1');
    });

    it('lança BadRequestException quando mesa não encontrada', async () => {
      p.table.findUnique.mockResolvedValueOnce(null);
      await expect(service.assertTableOwnership('t-1', 'body-1', 'req-1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('lança BadRequestException quando mesa inativa (active=false)', async () => {
      p.table.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-1', active: false });
      await expect(service.assertTableOwnership('t-1', 'body-1', 'req-1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('lança ForbiddenException quando mesa cross-tenant (requester)', async () => {
      p.table.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-other', active: true });
      await expect(service.assertTableOwnership('t-1', 'body-1', 'req-1')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('lança ForbiddenException quando mesa cross-tenant (anônimo)', async () => {
      p.table.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-other', active: true });
      await expect(service.assertTableOwnership('t-1', 'body-1', null)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('retorna restaurantId da mesa (autoritativo) quando match', async () => {
      p.table.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-1', active: true });
      // requesterRestaurantId bate com table.restaurantId → passa o check
      // de tenant; bodyRestaurantId é undefined → não dispara 2º check.
      const r = await service.assertTableOwnership('t-1', undefined, 'rest-1');
      expect(r).toBe('rest-1');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // findById — branches
  // ─────────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('lança NotFoundException quando pedido não existe', async () => {
      p.order.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.findById('inexistente', {
          requesterUserId: 'u-1',
          requesterRole: 'cliente',
          requesterRestaurantId: 'rest-1',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('staff (dono) vê pedido do mesmo restaurante', async () => {
      const order = { id: 'o-1', restaurantId: 'rest-1', customerId: 'u-2', items: [] };
      p.order.findUnique.mockResolvedValueOnce(order);
      const r = await service.findById('o-1', {
        requesterUserId: 'u-1',
        requesterRole: 'dono',
        requesterRestaurantId: 'rest-1',
      });
      expect(r).toBe(order);
    });

    it('staff de outro restaurante é rejeitado (BOLA)', async () => {
      p.order.findUnique.mockResolvedValueOnce({
        id: 'o-1',
        restaurantId: 'rest-other',
        customerId: 'u-2',
        items: [],
      });
      await expect(
        service.findById('o-1', {
          requesterUserId: 'u-1',
          requesterRole: 'dono',
          requesterRestaurantId: 'rest-1',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('staff sem restaurantId no JWT é aceito (pass-through silencioso)', async () => {
      const order = { id: 'o-1', restaurantId: 'rest-other', customerId: 'u-2', items: [] };
      p.order.findUnique.mockResolvedValueOnce(order);
      const r = await service.findById('o-1', {
        requesterUserId: 'u-1',
        requesterRole: 'atendente',
        requesterRestaurantId: null,
      });
      expect(r).toBe(order);
    });

    it('cliente dono do pedido pode ver', async () => {
      const order = { id: 'o-1', restaurantId: 'rest-1', customerId: 'u-1', items: [] };
      p.order.findUnique.mockResolvedValueOnce(order);
      const r = await service.findById('o-1', {
        requesterUserId: 'u-1',
        requesterRole: 'cliente',
        requesterRestaurantId: null,
      });
      expect(r).toBe(order);
    });

    it('cliente não-dono é rejeitado com mesma mensagem (sem enumeração)', async () => {
      p.order.findUnique.mockResolvedValueOnce({
        id: 'o-1',
        restaurantId: 'rest-1',
        customerId: 'u-OTHER',
        items: [],
      });
      await expect(
        service.findById('o-1', {
          requesterUserId: 'u-1',
          requesterRole: 'cliente',
          requesterRestaurantId: null,
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('cliente com pedido anônimo (customerId=null) é rejeitado', async () => {
      p.order.findUnique.mockResolvedValueOnce({
        id: 'o-1',
        restaurantId: 'rest-1',
        customerId: null,
        items: [],
      });
      await expect(
        service.findById('o-1', {
          requesterUserId: 'u-1',
          requesterRole: 'cliente',
          requesterRestaurantId: null,
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // findByCustomer
  // ─────────────────────────────────────────────────────────────────
  describe('findByCustomer', () => {
    it('filtra por customerId apenas (sem restaurantId)', async () => {
      p.order.findMany.mockResolvedValueOnce([]);
      await service.findByCustomer('u-1');
      expect(p.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: 'u-1' } })
      );
    });

    it('filtra por customerId + restaurantId quando informado', async () => {
      p.order.findMany.mockResolvedValueOnce([]);
      await service.findByCustomer('u-1', 'rest-1');
      expect(p.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerId: 'u-1', restaurantId: 'rest-1' },
        })
      );
    });

    it('passa cursor quando informado', async () => {
      p.order.findMany.mockResolvedValueOnce([]);
      await service.findByCustomer('u-1', 'rest-1', { cursor: 'cur-1' });
      expect(p.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: 'cur-1' }, skip: 1 })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    const validData: Parameters<OrdersService['create']>[0] = {
      restaurantId: 'rest-1',
      subtotal: 0,
      tax: 0,
      total: 0,
      items: [{ productId: 'prod-1', quantity: 2 }],
    };

    it('rejeita pedido sem itens (BadRequest)', async () => {
      await expect(service.create({ ...validData, items: [] })).rejects.toThrow(
        BadRequestException
      );
    });

    it('rejeita produto cross-tenant (BOLA defense) — P0-01', async () => {
      p.product.findMany.mockResolvedValueOnce([]);
      await expect(service.create(validData)).rejects.toThrow(BadRequestException);
    });

    it('rejeita produto indisponível (filtro available=true)', async () => {
      p.product.findMany.mockResolvedValueOnce([
        { id: 'prod-OTHER', price: 50, name: 'Outro' },
      ]);
      await expect(service.create(validData)).rejects.toThrow(BadRequestException);
    });

    it('calcula total server-side a partir do produto (pricing server-enforced)', async () => {
      p.product.findMany.mockResolvedValueOnce([{ id: 'prod-1', price: 25, name: 'P' }]);
      p.order.create.mockResolvedValueOnce({
        id: 'o-1',
        status: 'pending_payment',
        subtotal: 50,
        tax: 0,
        total: 50,
        items: [],
      });

      await service.create({ ...validData, tax: 0, total: 999 });

      expect(p.order.create).toHaveBeenCalled();
      const orderCall = p.order.create.mock.calls[0][0];
      expect(orderCall.data.subtotal).toBe(50);
      expect(orderCall.data.total).toBe(50);
    });

    it('emite realtime novo pedido após sucesso', async () => {
      p.product.findMany.mockResolvedValueOnce([{ id: 'prod-1', price: 10, name: 'P' }]);
      // total do pedido: 2 itens * 10 = 20.
      p.order.create.mockResolvedValueOnce({
        id: 'o-1',
        status: 'pending_payment',
        subtotal: 20,
        tax: 0,
        total: 20,
        items: [],
      });

      const result = await service.create(validData);
      expect(mockRealtime.emitNewOrder).toHaveBeenCalledWith('rest-1', {
        id: 'o-1',
        total: 20,
      });
      expect(result.id).toBe('o-1');
    });

    it('claim idempotency-key ANTES de criar Order (M-NEW-03)', async () => {
      p.product.findMany.mockResolvedValueOnce([{ id: 'prod-1', price: 10, name: 'P' }]);
      p.order.create.mockResolvedValueOnce({
        id: 'o-1',
        status: 'pending_payment',
        items: [],
      });

      await service.create({ ...validData, idempotencyKey: 'idem-1' });

      expect(p.idempotencyKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scope: 'order:create',
          key: 'idem-1',
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('não tenta claim quando idempotencyKey ausente', async () => {
      p.product.findMany.mockResolvedValueOnce([{ id: 'prod-1', price: 10, name: 'P' }]);
      p.order.create.mockResolvedValueOnce({
        id: 'o-1',
        status: 'pending_payment',
        items: [],
      });

      await service.create(validData);
      expect(p.idempotencyKey.create).not.toHaveBeenCalled();
    });

    it('cria registro de histórico de status após criar pedido', async () => {
      p.product.findMany.mockResolvedValueOnce([{ id: 'prod-1', price: 10, name: 'P' }]);
      p.order.create.mockResolvedValueOnce({
        id: 'o-1',
        status: 'pending_payment',
        items: [],
      });

      await service.create(validData);

      expect(p.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: 'o-1',
          status: 'pending_payment',
          notes: 'Pedido criado',
        },
      });
    });

    it('recupera pedido existente quando P2002 (request duplicada)', async () => {
      p.product.findMany.mockResolvedValueOnce([{ id: 'prod-1', price: 10, name: 'P' }]);
      p.order.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: 't' })
      );
      const existing = { id: 'o-existing', status: 'pending_payment' };
      p.order.findFirst.mockResolvedValueOnce(existing);

      const result = await service.create({ ...validData, idempotencyKey: 'idem-dup' });
      expect(result).toBe(existing);
    });

    it('lança ConflictException quando P2002 sem pedido existente', async () => {
      p.product.findMany.mockResolvedValueOnce([{ id: 'prod-1', price: 10, name: 'P' }]);
      p.order.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: 't' })
      );
      p.order.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...validData, idempotencyKey: 'idem-race' })
      ).rejects.toThrow(ConflictException);
    });

    it('relança exceptions não-P2002 inalteradas', async () => {
      p.product.findMany.mockResolvedValueOnce([{ id: 'prod-1', price: 10, name: 'P' }]);
      p.order.create.mockRejectedValueOnce(new Error('Database offline'));
      await expect(service.create(validData)).rejects.toThrow('Database offline');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // updateStatus
  // ─────────────────────────────────────────────────────────────────
  describe('updateStatus', () => {
    it('lança NotFoundException quando pedido não existe', async () => {
      p.order.findUnique.mockResolvedValueOnce(null);
      await expect(service.updateStatus('inexistente', 'paid', 'ok', 'rest-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('rejeita cross-tenant (BOLA defense)', async () => {
      p.order.findUnique.mockResolvedValueOnce({
        id: 'o-1',
        restaurantId: 'rest-other',
        status: 'pending_payment',
        version: 1,
      });
      await expect(service.updateStatus('o-1', 'paid', 'ok', 'rest-1')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('rejeita transição inválida pelo state-machine', async () => {
      p.order.findUnique.mockResolvedValueOnce({
        id: 'o-1',
        restaurantId: 'rest-1',
        status: 'pending_payment',
        version: 1,
      });
      await expect(service.updateStatus('o-1', 'delivered', 'ok', 'rest-1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('lança ConflictException em conflito optimistic locking', async () => {
      p.order.findUnique.mockResolvedValueOnce({
        id: 'o-1',
        restaurantId: 'rest-1',
        status: 'pending_payment',
        version: 1,
      });
      p.order.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.updateStatus('o-1', 'paid', 'ok', 'rest-1')).rejects.toThrow(
        ConflictException
      );
    });

    it('happy path: pending_payment → paid emite realtime + grava histórico', async () => {
      p.order.findUnique
        .mockResolvedValueOnce({
          id: 'o-1',
          restaurantId: 'rest-1',
          status: 'pending_payment',
          version: 1,
        })
        .mockResolvedValueOnce({
          id: 'o-1',
          restaurantId: 'rest-1',
          status: 'paid',
          version: 2,
        });

      await service.updateStatus('o-1', 'paid', 'Confirmado', 'rest-1');

      expect(p.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'o-1', status: 'pending_payment', version: 1 },
        data: { status: 'paid', version: { increment: 1 } },
      });
      expect(p.orderStatusHistory.create).toHaveBeenCalledWith({
        data: { orderId: 'o-1', status: 'paid', notes: 'Confirmado' },
      });
      expect(mockRealtime.emitOrderUpdate).toHaveBeenCalledWith('rest-1', {
        id: 'o-1',
        status: 'paid',
      });
    });

    it('passa requesterRestaurantId=null quando não informado (sem Forbidden)', async () => {
      p.order.findUnique
        .mockResolvedValueOnce({
          id: 'o-1',
          restaurantId: 'rest-1',
          status: 'pending_payment',
          version: 1,
        })
        .mockResolvedValueOnce({
          id: 'o-1',
          restaurantId: 'rest-1',
          status: 'paid',
          version: 2,
        });
      await service.updateStatus('o-1', 'paid', 'ok', null);
    });

    it('lança NotFoundException se updateMany succeeds mas findUnique depois falha', async () => {
      p.order.findUnique
        .mockResolvedValueOnce({
          id: 'o-1',
          restaurantId: 'rest-1',
          status: 'pending_payment',
          version: 1,
        })
        .mockResolvedValueOnce(null);
      await expect(service.updateStatus('o-1', 'paid', 'ok', 'rest-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
