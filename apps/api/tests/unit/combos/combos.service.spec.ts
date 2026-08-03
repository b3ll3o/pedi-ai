import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

import { CombosService } from '../../../src/combos/combos.service';
import { PrismaService } from '../../../src/common/prisma.service';

/**
 * Spec de cobertura para `CombosService` (141 linhas, BC `cardapio/`).
 */
describe('CombosService', () => {
  let service: CombosService;
  let p: ReturnType<typeof createMockPrisma>;

  function createMockPrisma() {
    return {
      combo: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      comboItem: { deleteMany: vi.fn() },
      $transaction: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    p = createMockPrisma();
    service = new CombosService(p as unknown as PrismaService);
  });

  describe('findByRestaurant', () => {
    it('aplica paginação default + filters (active=true + restaurant.active)', async () => {
      const combos = Array.from({ length: 21 }, (_, i) => ({ id: `c-${i}` }));
      p.combo.findMany.mockResolvedValueOnce(combos);

      const result = await service.findByRestaurant('rest-1');
      expect(result.nextCursor).toBe('c-19');
      expect(p.combo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { restaurantId: 'rest-1', restaurant: { active: true }, available: true },
          take: 21,
        })
      );
    });

    it('includeUnavailable=true pula o filtro available', async () => {
      p.combo.findMany.mockResolvedValueOnce([]);
      await service.findByRestaurant('rest-1', { includeUnavailable: true });
      expect(p.combo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { restaurantId: 'rest-1', restaurant: { active: true } } })
      );
    });

    it('passa cursor + skip=1', async () => {
      p.combo.findMany.mockResolvedValueOnce([]);
      await service.findByRestaurant('rest-1', { cursor: 'cur-1' });
      expect(p.combo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: 'cur-1' }, skip: 1 })
      );
    });

    it('limita comboItems a 50 (defesa contra mega-combo)', async () => {
      p.combo.findMany.mockResolvedValueOnce([]);
      await service.findByRestaurant('rest-1');
      expect(p.combo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: { comboItems: { take: 50 } } })
      );
    });
  });

  describe('findById', () => {
    it('retorna combo com comboItems (public-safe: restaurant.active)', async () => {
      const combo = { id: 'c-1', name: 'Combo Família', comboItems: [] };
      p.combo.findFirst.mockResolvedValueOnce(combo);
      const result = await service.findById('c-1');
      expect(result).toBe(combo);
      expect(p.combo.findFirst).toHaveBeenCalledWith({
        where: { id: 'c-1', restaurant: { active: true } },
        include: { comboItems: true },
      });
    });

    it('lança NotFoundException se combo inexistente ou restaurante inativo', async () => {
      p.combo.findFirst.mockResolvedValueOnce(null);
      await expect(service.findById('c-fake')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('cria combo com itens (nested create) e defaults disponíveis', async () => {
      const created = { id: 'c-1', name: 'Combo' };
      p.combo.create.mockResolvedValueOnce(created);

      await service.create({
        restaurantId: 'rest-1',
        name: 'Combo',
        price: 50,
        items: [{ productId: 'p-1', quantity: 1 }],
      });

      expect(p.combo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          restaurantId: 'rest-1',
          name: 'Combo',
          description: null,
          bundlePrice: 50,
          available: true,
          comboItems: { create: [{ productId: 'p-1', quantity: 1 }] },
        }),
        include: { comboItems: true },
      });
    });

    it('respeita available=false quando informado', async () => {
      p.combo.create.mockResolvedValueOnce({ id: 'c-1' });
      await service.create({
        restaurantId: 'rest-1',
        name: 'Combo X',
        price: 30,
        available: false,
        items: [{ productId: 'p-1', quantity: 1 }],
      });
      expect(p.combo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ available: false }),
        include: { comboItems: true },
      });
    });
  });

  describe('update', () => {
    it('atualiza sem tenant check quando requesterRestaurantId ausente', async () => {
      p.combo.update.mockResolvedValueOnce({ id: 'c-1' });
      await service.update('c-1', { name: 'Novo nome' });
      expect(p.combo.findUnique).not.toHaveBeenCalled();
      expect(p.combo.update).toHaveBeenCalled();
    });

    it('atualiza quando tenant bate', async () => {
      p.combo.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-1' });
      p.combo.update.mockResolvedValueOnce({ id: 'c-1' });
      await service.update('c-1', { name: 'OK' }, 'rest-1');
      expect(p.combo.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { name: 'OK' },
        include: { comboItems: true },
      });
    });

    it('rejeita cross-tenant (BOLA)', async () => {
      p.combo.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-other' });
      await expect(
        service.update('c-1', { name: 'X' }, 'rest-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException se combo não existe', async () => {
      p.combo.findUnique.mockResolvedValueOnce(null);
      await expect(service.update('c-fake', { name: 'X' }, 'rest-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('adiciona bundlePrice quando price fornecido (mantém price no data)', async () => {
      // Não deleta `price`, apenas adiciona `bundlePrice` ao data.
      p.combo.update.mockResolvedValueOnce({ id: 'c-1' });
      await service.update('c-1', { price: 100 });
      expect(p.combo.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { price: 100, bundlePrice: 100 },
        include: { comboItems: true },
      });
    });
  });

  describe('delete', () => {
    it('cascade delete atômico via $transaction', async () => {
      p.comboItem.deleteMany.mockResolvedValueOnce({ count: 3 });
      p.combo.delete.mockResolvedValueOnce({ id: 'c-1' });
      p.$transaction.mockResolvedValueOnce([{ count: 3 }, { id: 'c-1' }]);

      await service.delete('c-1');
      expect(p.$transaction).toHaveBeenCalled();
    });

    it('rejeita cross-tenant quando requesterRestaurantId diverge', async () => {
      p.combo.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-other' });
      await expect(service.delete('c-1', 'rest-1')).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException se combo não existe', async () => {
      p.combo.findUnique.mockResolvedValueOnce(null);
      await expect(service.delete('c-fake', 'rest-1')).rejects.toThrow(NotFoundException);
    });

    it('deleta sem tenant check quando requesterRestaurantId ausente', async () => {
      p.comboItem.deleteMany.mockResolvedValueOnce({ count: 0 });
      p.combo.delete.mockResolvedValueOnce({ id: 'c-1' });
      p.$transaction.mockResolvedValueOnce([{ count: 0 }, { id: 'c-1' }]);

      await service.delete('c-1');
      expect(p.combo.findUnique).not.toHaveBeenCalled();
    });
  });
});
