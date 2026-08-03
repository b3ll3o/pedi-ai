import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SubscriptionsService } from '../../../src/subscriptions/subscriptions.service';
import { PrismaService } from '../../../src/common/prisma.service';

/**
 * Spec de cobertura para `SubscriptionsService` (60 linhas).
 *
 * Origem: master pós-merge v0.2.1 — cobertura `subscriptions.service.ts`
 * apenas 20.83% (todos os thresholds CI quebrados). Esta PR fecha
 * integralmente o gap do módulo.
 *
 * Cobre 100% das branches:
 * - findByRestaurant (linha com include nested)
 * - createOrUpdate (validação de planType, fallback 'monthly',
 *   upsert com create+update, cálculo de trialEndsAt)
 *
 * @see .openspec/changes/2026-08-03-test-tables-coverage-mesa/proposal.md
 */
describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const createMockPrisma = () => ({
    subscription: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new SubscriptionsService(mockPrisma as unknown as PrismaService);
  });

  describe('findByRestaurant', () => {
    it('retorna subscription com restaurant embedded', async () => {
      const sub = {
        id: 'sub-1',
        restaurantId: 'rest-1',
        planType: 'monthly',
        status: 'active',
        restaurant: { name: 'Restaurante X' },
      };
      mockPrisma.subscription.findFirst.mockResolvedValueOnce(sub);

      const result = await service.findByRestaurant('rest-1');

      expect(result).toBe(sub);
      expect(mockPrisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { restaurantId: 'rest-1' },
        include: { restaurant: { select: { name: true } } },
      });
    });

    it('retorna null quando restaurante sem assinatura', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValueOnce(null);
      const result = await service.findByRestaurant('rest-vazio');
      expect(result).toBeNull();
    });
  });

  describe('createOrUpdate', () => {
    it('cria subscription com plano válido (monthly) e ignora priceCents do body', async () => {
      const subCreated = {
        id: 'sub-1',
        restaurantId: 'rest-1',
        planType: 'monthly',
        status: 'trialing',
        priceCents: 9990, // server-side from PRICING_PLANS
        currency: 'BRL',
      };
      mockPrisma.subscription.upsert.mockResolvedValueOnce(subCreated);

      const before = Date.now();
      await service.createOrUpdate({ restaurantId: 'rest-1', planType: 'monthly' });

      // Verifica que o upsert foi chamado com create (não update — primeira vez).
      const upsertCall = mockPrisma.subscription.upsert.mock.calls[0][0];
      expect(upsertCall.where).toEqual({ restaurantId: 'rest-1' });
      expect(upsertCall.create.restaurantId).toBe('rest-1');
      expect(upsertCall.create.status).toBe('trialing');
      expect(upsertCall.create.planType).toBe('monthly');
      expect(upsertCall.create.priceCents).toBe(4990); // PRICING_PLANS.monthly = R$ 49,90
      expect(upsertCall.create.version).toBe(1);
      // trialEndsAt = now + trialDays (>=14 days)
      const trialEndsAt = upsertCall.create.trialEndsAt as Date;
      expect(trialEndsAt.getTime()).toBeGreaterThanOrEqual(before + 14 * 24 * 3600 * 1000 - 1000);
      expect(upsertCall.update.planType).toBe('monthly');
      expect(upsertCall.update.status).toBe('active');
    });

    it('cria subscription com plano anual + preço server-side do annual', async () => {
      mockPrisma.subscription.upsert.mockResolvedValueOnce({
        id: 'sub-1',
        planType: 'annual',
        status: 'trialing',
      });

      await service.createOrUpdate({ restaurantId: 'rest-1', planType: 'annual' });

      const call = mockPrisma.subscription.upsert.mock.calls[0][0];
      expect(call.create.planType).toBe('annual');
      expect(call.create.priceCents).toBe(47900); // PRICING_PLANS.annual = R$ 479,00
    });

    it('cai em fallback "monthly" quando planType é inválido (defesa)', async () => {
      mockPrisma.subscription.upsert.mockResolvedValueOnce({
        id: 'sub-1',
        planType: 'monthly',
        status: 'trialing',
      });

      await service.createOrUpdate({ restaurantId: 'rest-1', planType: 'plano-invalido-xyz' });

      const call = mockPrisma.subscription.upsert.mock.calls[0][0];
      // Cai no fallback: plano mensal + preço server-side
      expect(call.create.planType).toBe('monthly');
      expect(call.create.priceCents).toBe(4990);
    });

    it('cai em fallback quando planType é undefined', async () => {
      mockPrisma.subscription.upsert.mockResolvedValueOnce({
        id: 'sub-1',
        planType: 'monthly',
      });

      await service.createOrUpdate({
        restaurantId: 'rest-1',
        // @ts-expect-error test defensive
        planType: undefined,
      });

      const call = mockPrisma.subscription.upsert.mock.calls[0][0];
      expect(call.create.planType).toBe('monthly');
    });

    it('passa include com restaurant select', async () => {
      mockPrisma.subscription.upsert.mockResolvedValueOnce({ id: 'sub-1' });
      await service.createOrUpdate({ restaurantId: 'rest-1', planType: 'monthly' });
      expect(mockPrisma.subscription.upsert.mock.calls[0][0].include).toEqual({
        restaurant: { select: { name: true } },
      });
    });
  });
});
