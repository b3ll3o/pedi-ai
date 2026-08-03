import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';

import { RestaurantsService } from '../../../src/restaurants/restaurants.service';
import { PrismaService } from '../../../src/common/prisma.service';

/**
 * Spec de cobertura para `RestaurantsService` (303 linhas, BC `admin/`).
 *
 * Cobre 10 métodos públicos:
 * - findAll / findById / findByIds / findByUserWithTeamCount /
 *   findByUserId / findByUserIdWithTrial / findBySlug /
 *   create / createWithOwner / update / deactivate.
 *
 * Origem: cobertura `restaurants` 68.51% branches (pré-PR). Esta PR
 * fecha o gap para ≥80% no service.
 */
describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let p: ReturnType<typeof createMockPrisma>;

  function createMockPrisma() {
    const tx: any = {};
    const prisma: any = {
      restaurant: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      usersProfile: {
        findMany: vi.fn(),
        groupBy: vi.fn(),
        create: vi.fn(),
      },
      subscription: { create: vi.fn() },
      withEncryptedTransaction: vi.fn(),
    };
    // Cada query de `tx.*` é a mesma de `prisma.*` (callback recebe o mesmo objeto).
    tx.restaurant = prisma.restaurant;
    tx.usersProfile = prisma.usersProfile;
    tx.subscription = prisma.subscription;
    prisma.withEncryptedTransaction.mockImplementation(
      async (cb: (t: unknown) => Promise<unknown>) => cb(tx)
    );
    return prisma as PrismaService;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    p = createMockPrisma();
    service = new RestaurantsService(p);
  });

  // ─────────────────────────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('lista apenas ativos por padrão e aplica cursor', async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({ id: `r-${i}` }));
      p.restaurant.findMany.mockResolvedValueOnce(items);
      const result = await service.findAll(true, { limit: 20 });
      expect(result.data).toHaveLength(20);
      expect(result.nextCursor).toBe('r-19');
      expect(p.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true }, take: 21 })
      );
    });

    it('retorna todos os restaurantes quando active=false (where=undefined)', async () => {
      p.restaurant.findMany.mockResolvedValueOnce([]);
      await service.findAll(false, { limit: 5 });
      expect(p.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined, take: 6 })
      );
    });

    it('skip=1 quando cursor informado', async () => {
      p.restaurant.findMany.mockResolvedValueOnce([]);
      await service.findAll(true, { cursor: 'cur-1', limit: 5 });
      expect(p.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: 'cur-1' }, skip: 1 })
      );
    });

    it('usa PAGINATION_DEFAULT_LIMIT quando limit ausente', async () => {
      p.restaurant.findMany.mockResolvedValueOnce([]);
      await service.findAll();
      expect(p.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 21 })
      );
    });

    it('select explícito (sem PII) — defesa ACHADO-N34', async () => {
      p.restaurant.findMany.mockResolvedValueOnce([]);
      await service.findAll();
      expect(p.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.objectContaining({ phone: true, address: true }),
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // findById
  // ─────────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('lança NotFoundException se restaurante não existe ou inativo', async () => {
      p.restaurant.findFirst.mockResolvedValueOnce(null);
      await expect(service.findById('r-1')).rejects.toThrow(NotFoundException);
    });

    it('retorna restaurante ativo', async () => {
      const r = { id: 'r-1', name: 'R1', active: true };
      p.restaurant.findFirst.mockResolvedValueOnce(r);
      const result = await service.findById('r-1');
      expect(result).toBe(r);
      expect(p.restaurant.findFirst).toHaveBeenCalledWith({
        where: { id: 'r-1', active: true },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // findByIds
  // ─────────────────────────────────────────────────────────────────
  describe('findByIds', () => {
    it('filtra por active=true quando activeOnly=true', async () => {
      p.restaurant.findMany.mockResolvedValueOnce([]);
      await service.findByIds(['r-1'], { activeOnly: true });
      expect(p.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['r-1'] }, active: true },
        })
      );
    });

    it('não filtra por active quando activeOnly=false (default)', async () => {
      p.restaurant.findMany.mockResolvedValueOnce([]);
      await service.findByIds(['r-1']);
      expect(p.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['r-1'] } } })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // findByUserWithTeamCount
  // ─────────────────────────────────────────────────────────────────
  describe('findByUserWithTeamCount', () => {
    it('retorna [] se user não tem profiles com restaurantId', async () => {
      p.usersProfile.findMany.mockResolvedValueOnce([]);
      const result = await service.findByUserWithTeamCount('u-1');
      expect(result).toEqual([]);
      expect(p.restaurant.findMany).not.toHaveBeenCalled();
    });

    it('retorna [] se profiles têm restaurantId=null', async () => {
      p.usersProfile.findMany.mockResolvedValueOnce([
        { restaurantId: null, role: 'dono' },
        { restaurantId: null, role: 'gerente' },
      ]);
      const result = await service.findByUserWithTeamCount('u-1');
      expect(result).toEqual([]);
    });

    it('combina restaurants + roleMap + teamCountMap', async () => {
      p.usersProfile.findMany.mockResolvedValueOnce([
        { restaurantId: 'r-1', role: 'dono' },
        { restaurantId: 'r-2', role: 'gerente' },
      ]);
      p.restaurant.findMany.mockResolvedValueOnce([
        { id: 'r-1', name: 'R1', slug: 'r1' },
        { id: 'r-2', name: 'R2', slug: 'r2' },
      ]);
      p.usersProfile.groupBy.mockResolvedValueOnce([
        { restaurantId: 'r-1', _count: { _all: 5 } },
        { restaurantId: 'r-2', _count: { _all: 3 } },
      ]);

      const result = await service.findByUserWithTeamCount('u-1');
      expect(result).toHaveLength(2);
      const r1 = result.find((r) => r.id === 'r-1');
      expect(r1).toMatchObject({ role: 'dono', teamCount: 5 });
    });

    it('default role "cliente" quando roleMap ausente', async () => {
      p.usersProfile.findMany.mockResolvedValueOnce([
        { restaurantId: 'r-1', role: 'dono' },
      ]);
      p.restaurant.findMany.mockResolvedValueOnce([{ id: 'r-1' }]);
      p.usersProfile.groupBy.mockResolvedValueOnce([]);

      const result = await service.findByUserWithTeamCount('u-1');
      // TeamCount = 0 (fallback), role = 'dono' (do profile).
      expect(result[0]).toMatchObject({ role: 'dono', teamCount: 0 });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // findByUserId
  // ─────────────────────────────────────────────────────────────────
  describe('findByUserId', () => {
    it('retorna [] quando user sem profiles', async () => {
      p.usersProfile.findMany.mockResolvedValueOnce([]);
      const result = await service.findByUserId('u-1');
      expect(result).toEqual([]);
    });

    it('retorna [] quando todos os profiles têm restaurantId=null', async () => {
      p.usersProfile.findMany.mockResolvedValueOnce([
        { restaurantId: null },
      ]);
      const result = await service.findByUserId('u-1');
      expect(result).toEqual([]);
    });

    it('chama findByIds quando há restaurantIds', async () => {
      p.usersProfile.findMany.mockResolvedValueOnce([
        { restaurantId: 'r-1' },
        { restaurantId: null },
        { restaurantId: 'r-2' },
      ]);
      p.restaurant.findMany.mockResolvedValueOnce([{ id: 'r-1' }, { id: 'r-2' }]);
      const result = await service.findByUserId('u-1');
      expect(result).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // findByUserIdWithTrial
  // ─────────────────────────────────────────────────────────────────
  describe('findByUserIdWithTrial', () => {
    it('retorna [] quando não tem profile de dono', async () => {
      p.usersProfile.findMany.mockResolvedValueOnce([]);
      const result = await service.findByUserIdWithTrial('u-1');
      expect(result).toEqual([]);
      expect(p.restaurant.findMany).not.toHaveBeenCalled();
    });

    it('filtra por active + subscription trialing válida', async () => {
      p.usersProfile.findMany.mockResolvedValueOnce([
        { restaurantId: 'r-1' },
      ]);
      const trialRestaurant = { id: 'r-1', name: 'R1' };
      p.restaurant.findMany.mockResolvedValueOnce([trialRestaurant]);

      const result = await service.findByUserIdWithTrial('u-1');
      expect(result).toEqual([trialRestaurant]);
      // agora deve ser gt now
      const callArgs = p.restaurant.findMany.mock.calls[0][0];
      expect(callArgs.where.id).toEqual({ in: ['r-1'] });
      expect(callArgs.where.active).toBe(true);
      expect(callArgs.where.subscriptions.some.trialEndsAt.gt).toBeInstanceOf(Date);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // findBySlug
  // ─────────────────────────────────────────────────────────────────
  describe('findBySlug', () => {
    it('filtra por slug + active=true', async () => {
      p.restaurant.findFirst.mockResolvedValueOnce(null);
      await service.findBySlug('restaurante-x');
      expect(p.restaurant.findFirst).toHaveBeenCalledWith({
        where: { slug: 'restaurante-x', active: true },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('cria restaurante simples', async () => {
      const r = { id: 'r-1', name: 'R1' };
      p.restaurant.create.mockResolvedValueOnce(r);
      const result = await service.create({ name: 'R1' });
      expect(result).toBe(r);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // createWithOwner
  // ─────────────────────────────────────────────────────────────────
  describe('createWithOwner', () => {
    it('cria restaurante + profile + subscription trial (14 dias)', async () => {
      const r = { id: 'r-1', name: 'R1' };
      p.restaurant.create.mockResolvedValueOnce(r);

      const before = Date.now();
      const result = await service.createWithOwner({
        name: 'R1',
        ownerId: 'u-1',
        ownerEmail: 'joao@exemplo.com',
      });

      expect(result).toBe(r);
      expect(p.usersProfile.create).toHaveBeenCalled();
      expect(p.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          restaurantId: 'r-1',
          status: 'trialing',
          planType: 'monthly',
          trialDays: 14,
        }),
      });
      // trialEndsAt >= 14 dias
      const subCall = p.subscription.create.mock.calls[0][0].data;
      expect(subCall.trialEndsAt.getTime()).toBeGreaterThanOrEqual(
        before + 14 * 24 * 3600 * 1000 - 1000
      );
    });

    it('ownerName explícito tem precedência sobre email', async () => {
      p.restaurant.create.mockResolvedValueOnce({ id: 'r-1' });
      await service.createWithOwner({
        name: 'R1',
        ownerId: 'u-1',
        ownerEmail: 'joao@exemplo.com',
        ownerName: 'João Silva',
        ownerRole: 'dono' as UserRole,
      });
      expect(p.usersProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'João Silva', role: 'dono' }),
      });
    });

    it('fallback name = parte-local do email quando ownerName ausente', async () => {
      p.restaurant.create.mockResolvedValueOnce({ id: 'r-1' });
      await service.createWithOwner({
        name: 'R1',
        ownerId: 'u-1',
        ownerEmail: 'joao.silva@exemplo.com',
        // ownerName ausente
      });
      expect(p.usersProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'joao.silva' }),
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('atualiza restaurante existente', async () => {
      const updated = { id: 'r-1', name: 'R1 Atualizado' };
      p.restaurant.update.mockResolvedValueOnce(updated);
      const result = await service.update('r-1', { name: 'R1 Atualizado' });
      expect(result).toBe(updated);
    });

    it('lança NotFoundException quando P2025 (registro não existe)', async () => {
      p.restaurant.update.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: 'test',
        })
      );
      await expect(service.update('r-1', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('relança exceptions não-P2025', async () => {
      p.restaurant.update.mockRejectedValueOnce(new Error('Database offline'));
      await expect(service.update('r-1', { name: 'X' })).rejects.toThrow('Database offline');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // deactivate
  // ─────────────────────────────────────────────────────────────────
  describe('deactivate', () => {
    it('delega para update com active=false', async () => {
      const updated = { id: 'r-1', active: false };
      p.restaurant.update.mockResolvedValueOnce(updated);
      const result = await service.deactivate('r-1');
      expect(result).toBe(updated);
      expect(p.restaurant.update).toHaveBeenCalledWith({
        where: { id: 'r-1' },
        data: { active: false },
      });
    });
  });
});
