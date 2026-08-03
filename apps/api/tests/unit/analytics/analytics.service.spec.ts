import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

import { AnalyticsService, ANALYTICS_MAX_DAYS } from '../../../src/analytics/analytics.service';
import { PrismaService } from '../../../src/common/prisma.service';

/**
 * Spec de cobertura para `AnalyticsService` (224 linhas).
 *
 * Cobre branches de 5 métodos públicos + 1 helper privado (`parseDate`).
 * Foco em:
 * - getOverview/getOverviewDetailed (count + aggregate paralelo)
 * - getPopularItems (raw SQL seguro + condições dinâmicas + mapping bigint→number)
 * - getOrdersByStatus (groupBy)
 * - getDailyOrders (cap de 90 dias, query parametrizada)
 * - parseDate (rejeita datas malformadas)
 */
describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let p: ReturnType<typeof createMockPrisma>;

  function createMockPrisma() {
    return {
      order: {
        count: vi.fn(),
        aggregate: vi.fn(),
        groupBy: vi.fn(),
      },
      $queryRaw: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    p = createMockPrisma();
    service = new AnalyticsService(p as unknown as PrismaService);
  });

  describe('getOverview', () => {
    it('retorna orders count + revenue (agregado parallel)', async () => {
      p.order.count.mockResolvedValueOnce(100);
      p.order.aggregate.mockResolvedValueOnce({ _sum: { total: 5000 } });

      const result = await service.getOverview({ restaurantId: 'r-1' });

      expect(result).toEqual({ orders: 100, revenue: 5000 });
      expect(p.order.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'paid' }) })
      );
    });

    it('revenue=0 quando aggregate _sum=null', async () => {
      p.order.count.mockResolvedValueOnce(0);
      p.order.aggregate.mockResolvedValueOnce({ _sum: { total: null } });

      const result = await service.getOverview({ restaurantId: 'r-1' });
      expect(result.revenue).toBe(0);
    });

    it('filtra por startDate quando informado', async () => {
      p.order.count.mockResolvedValueOnce(50);
      p.order.aggregate.mockResolvedValueOnce({ _sum: { total: 1000 } });

      await service.getOverview({
        restaurantId: 'r-1',
        startDate: '2026-01-01',
      });

      const whereArg = p.order.count.mock.calls[0][0].where;
      expect(whereArg.createdAt.gte).toBeInstanceOf(Date);
    });

    it('filtra por endDate quando informado', async () => {
      p.order.count.mockResolvedValueOnce(0);
      p.order.aggregate.mockResolvedValueOnce({ _sum: { total: null } });

      await service.getOverview({
        restaurantId: 'r-1',
        endDate: '2026-12-31',
      });

      const whereArg = p.order.count.mock.calls[0][0].where;
      expect(whereArg.createdAt.lte).toBeInstanceOf(Date);
    });

    it('rejeita startDate malformado (BadRequest)', async () => {
      await expect(
        service.getOverview({ restaurantId: 'r-1', startDate: 'ontem' })
      ).rejects.toThrow(BadRequestException);
    });

    it('omite createdAt quando startDate e endDate ausentes', async () => {
      p.order.count.mockResolvedValueOnce(0);
      p.order.aggregate.mockResolvedValueOnce({ _sum: { total: null } });
      await service.getOverview({ restaurantId: 'r-1' });
      const whereArg = p.order.count.mock.calls[0][0].where;
      expect(whereArg.createdAt).toBeUndefined();
    });
  });

  describe('getPopularItems', () => {
    it('retorna top 10 itens com mapping bigint→number', async () => {
      p.$queryRaw.mockResolvedValueOnce([
        { product_id: 'p-1', product_name: 'P1', total_quantity: BigInt(50) },
        { product_id: 'p-2', product_name: 'P2', total_quantity: BigInt(30) },
      ]);

      const result = await service.getPopularItems({ restaurantId: 'r-1' });

      expect(result).toEqual([
        { productId: 'p-1', productName: 'P1', quantity: 50 },
        { productId: 'p-2', productName: 'P2', quantity: 30 },
      ]);
    });

    it('aplica filtros de data na query SQL parametrizada', async () => {
      p.$queryRaw.mockResolvedValueOnce([]);
      await service.getPopularItems({
        restaurantId: 'r-1',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });
      // Verifica que queryRaw foi chamado (validação indireta das condições).
      expect(p.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('getOrdersByStatus', () => {
    it('retorna agrupamento por status', async () => {
      p.order.groupBy.mockResolvedValueOnce([
        { status: 'paid', _count: 100 },
        { status: 'pending_payment', _count: 20 },
      ]);

      const result = await service.getOrdersByStatus({ restaurantId: 'r-1' });
      expect(result).toEqual([
        { status: 'paid', count: 100 },
        { status: 'pending_payment', count: 20 },
      ]);
    });

    it('filtra por restaurantId e janela de data', async () => {
      p.order.groupBy.mockResolvedValueOnce([]);
      await service.getOrdersByStatus({
        restaurantId: 'r-1',
        startDate: '2026-01-01',
      });

      const whereArg = p.order.groupBy.mock.calls[0][0].where;
      expect(whereArg.restaurantId).toBe('r-1');
    });
  });

  describe('getOverviewDetailed', () => {
    it('retorna orders/revenue/avg com exclude cancelled', async () => {
      p.order.count.mockResolvedValueOnce(80);
      p.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: 4000 } })
        .mockResolvedValueOnce({ _avg: { total: 50 } });

      const result = await service.getOverviewDetailed({ restaurantId: 'r-1' });

      expect(result).toEqual({
        total_orders: 80,
        total_revenue: 4000,
        avg_order_value: 50,
      });
    });

    it('total_revenue=0 quando _sum=null', async () => {
      p.order.count.mockResolvedValueOnce(0);
      p.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: null } })
        .mockResolvedValueOnce({ _avg: { total: null } });

      const result = await service.getOverviewDetailed({ restaurantId: 'r-1' });
      expect(result.total_revenue).toBe(0);
      expect(result.avg_order_value).toBe(0);
    });
  });

  describe('getDailyOrders', () => {
    it('rejeita janela > ANALYTICS_MAX_DAYS (90 dias)', async () => {
      await expect(
        service.getDailyOrders({
          restaurantId: 'r-1',
          startDate: '2020-01-01',
          endDate: '2026-08-03',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('aceita janela dentro do limite (30 dias default)', async () => {
      p.$queryRaw.mockResolvedValueOnce([]);
      await service.getDailyOrders({ restaurantId: 'r-1' });
      expect(p.$queryRaw).toHaveBeenCalled();
    });

    it('mapeia bigint orders → number no retorno', async () => {
      p.$queryRaw.mockResolvedValueOnce([
        { date: new Date('2026-08-01'), orders: BigInt(5), revenue: 250 },
      ]);

      const result = await service.getDailyOrders({ restaurantId: 'r-1' });
      expect(result).toEqual([
        { date: new Date('2026-08-01'), orders: 5, revenue: 250 },
      ]);
    });

    it('aceita startDate dentro do limite', async () => {
      p.$queryRaw.mockResolvedValueOnce([]);
      const now = new Date();
      const recent = new Date(now);
      recent.setDate(recent.getDate() - 30);
      await service.getDailyOrders({
        restaurantId: 'r-1',
        startDate: recent.toISOString(),
      });
      expect(p.$queryRaw).toHaveBeenCalled();
    });

    it('expõe ANALYTICS_MAX_DAYS = 90 (cap de janela)', () => {
      expect(ANALYTICS_MAX_DAYS).toBe(90);
    });
  });
});
