import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

import { CategoriesService } from '../../../src/categories/categories.service';
import { PrismaService } from '../../../src/common/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let p: ReturnType<typeof createMockPrisma>;

  function createMockPrisma() {
    const tx: any = {};
    const prisma: any = {
      category: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    };
    tx.category = prisma.category;
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      // Array-style: $transaction([op1, op2]) — sequencial, retorna array.
      if (Array.isArray(arg)) {
        const results: unknown[] = [];
        for (const op of arg) results.push(await op);
        return results;
      }
      // Callback-style: $transaction(async (tx) => ...) — retorna o callback.
      if (typeof arg === 'function') {
        return (arg as (t: unknown) => Promise<unknown>)(tx);
      }
      throw new Error('$transaction mock: unsupported argument');
    });
    return prisma as PrismaService;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    p = createMockPrisma();
    service = new CategoriesService(p);
  });

  describe('findByRestaurant', () => {
    it('filtra por deletedAt=null + restaurant.active=true', async () => {
      p.category.findMany.mockResolvedValueOnce([]);
      await service.findByRestaurant('rest-1');
      expect(p.category.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 'rest-1', deletedAt: null, restaurant: { active: true } },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('findById', () => {
    it('retorna categoria ativa (não-deleted)', async () => {
      const cat = { id: 'cat-1', name: 'Cat1' };
      p.category.findFirst.mockResolvedValueOnce(cat);
      const result = await service.findById('cat-1');
      expect(result).toBe(cat);
    });

    it('lança NotFoundException para categoria inexistente/deletada', async () => {
      p.category.findFirst.mockResolvedValueOnce(null);
      await expect(service.findById('cat-fake')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('cria categoria com dados completos', async () => {
      p.category.create.mockResolvedValueOnce({ id: 'cat-1' });
      await service.create({ restaurantId: 'rest-1', name: 'Cat1', description: 'X', imageUrl: 'http://x.com/img.png', sortOrder: 1 });
      expect(p.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          restaurantId: 'rest-1',
          name: 'Cat1',
          description: 'X',
          imageUrl: 'http://x.com/img.png',
          sortOrder: 1,
        }),
      });
    });
  });

  describe('update', () => {
    it('atualiza categoria do mesmo restaurante', async () => {
      p.category.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-1' });
      p.category.update.mockResolvedValueOnce({ id: 'cat-1' });
      await service.update('cat-1', { name: 'Novo' }, 'rest-1');
      expect(p.category.update).toHaveBeenCalledWith({ where: { id: 'cat-1' }, data: { name: 'Novo' } });
    });

    it('rejeita cross-tenant', async () => {
      p.category.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-other' });
      await expect(service.update('cat-1', { name: 'X' }, 'rest-1')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('lança NotFound para categoria inexistente', async () => {
      p.category.findUnique.mockResolvedValueOnce(null);
      await expect(service.update('cat-fake', { name: 'X' }, 'rest-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('rejeita categoria com deletedAt (soft delete)', async () => {
      p.category.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-1', deletedAt: new Date() });
      await expect(service.update('cat-1', { name: 'X' }, 'rest-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('aceita update sem tenant check quando requesterRestaurantId ausente', async () => {
      p.category.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-1' });
      p.category.update.mockResolvedValueOnce({ id: 'cat-1' });
      await service.update('cat-1', { name: 'OK' });
      expect(p.category.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('soft delete via deletedAt (preserva histórico)', async () => {
      p.category.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-1' });
      p.category.update.mockResolvedValueOnce({ id: 'cat-1', deletedAt: new Date() });
      await service.delete('cat-1', 'rest-1');
      expect(p.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      });
    });

    it('rejeita cross-tenant', async () => {
      p.category.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-other' });
      await expect(service.delete('cat-1', 'rest-1')).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFound se categoria já deleted', async () => {
      p.category.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-1', deletedAt: new Date() });
      await expect(service.delete('cat-1', 'rest-1')).rejects.toThrow(NotFoundException);
    });

    it('aceita delete sem tenant check quando requesterRestaurantId ausente', async () => {
      p.category.findUnique.mockResolvedValueOnce({ restaurantId: 'rest-1' });
      p.category.update.mockResolvedValueOnce({ id: 'cat-1' });
      await service.delete('cat-1');
      expect(p.category.update).toHaveBeenCalled();
    });
  });

  describe('reorder', () => {
    it('aceita reorder sem tenant check', async () => {
      p.category.update.mockResolvedValue({});
      await service.reorder([{ id: 'cat-1', sortOrder: 1 }]);
      expect(p.$transaction).toHaveBeenCalled();
    });

    it('rejeita categorias cross-tenant', async () => {
      p.category.findMany.mockResolvedValueOnce([
        { id: 'cat-1', restaurantId: 'rest-other' },
        { id: 'cat-2', restaurantId: 'rest-1' },
      ]);
      await expect(
        service.reorder(
          [{ id: 'cat-1', sortOrder: 1 }, { id: 'cat-2', sortOrder: 2 }],
          'rest-1'
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejeita quando nem todas as categorias foram encontradas', async () => {
      p.category.findMany.mockResolvedValueOnce([
        { id: 'cat-1', restaurantId: 'rest-1' },
        // cat-2 sumiu do banco
      ]);
      await expect(
        service.reorder(
          [{ id: 'cat-1', sortOrder: 1 }, { id: 'cat-2', sortOrder: 2 }],
          'rest-1'
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('aceita reorder quando todas as categorias são do mesmo restaurante', async () => {
      p.category.findMany.mockResolvedValueOnce([
        { id: 'cat-1', restaurantId: 'rest-1' },
        { id: 'cat-2', restaurantId: 'rest-1' },
      ]);
      p.category.update.mockResolvedValue({});
      await service.reorder(
        [
          { id: 'cat-1', sortOrder: 1 },
          { id: 'cat-2', sortOrder: 2 },
        ],
        'rest-1'
      );
      expect(p.$transaction).toHaveBeenCalled();
    });
  });
});
