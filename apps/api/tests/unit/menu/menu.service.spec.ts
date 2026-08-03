import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import { MenuService } from '../../../src/menu/menu.service';
import { PrismaService } from '../../../src/common/prisma.service';

/**
 * Spec de cobertura para `MenuService` (234 linhas).
 *
 * Cobre 100% das branches efetivas dos 2 métodos públicos:
 * - getMenuByRestaurant: restaurante não encontrado, com 4 queries
 *   paralelas (categories sequencial + Promise.all de products/modifier/combos)
 * - getProductById: produto não encontrado, mapeamento snake_case
 *   para camelCase (image_url/imageUrl), include nested com category +
 *   modifierGroups + modifierValues.
 *
 * @see .openspec/changes/2026-08-03-test-tables-coverage-mesa/proposal.md
 */
describe('MenuService', () => {
  let service: MenuService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const createMockPrisma = () => ({
    restaurant: {
      findFirst: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    modifierGroup: {
      findMany: vi.fn(),
    },
    combo: {
      findMany: vi.fn(),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new MenuService(mockPrisma as unknown as PrismaService);
  });

  describe('getMenuByRestaurant', () => {
    it('lança NotFoundException para restaurante inexistente ou inativo', async () => {
      mockPrisma.restaurant.findFirst.mockResolvedValueOnce(null);
      await expect(service.getMenuByRestaurant('rest-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('retorna cardápio completo (categories+products+modifierGroups+combos) para restaurante ativo', async () => {
      mockPrisma.restaurant.findFirst.mockResolvedValueOnce({
        id: 'rest-1',
        name: 'Restaurante X',
      });
      mockPrisma.category.findMany.mockResolvedValueOnce([
        { id: 'cat-1', restaurantId: 'rest-1', name: 'Pratos', sortOrder: 0 },
      ]);
      // Promise.all — 3 queries paralelas.
      mockPrisma.product.findMany.mockResolvedValueOnce([
        {
          id: 'prod-1',
          categoryId: 'cat-1',
          name: 'Arroz',
          dietaryLabels: '[]',
          price: 25,
        },
      ]);
      mockPrisma.modifierGroup.findMany.mockResolvedValueOnce([
        {
          id: 'mod-1',
          restaurantId: 'rest-1',
          name: 'Adicionais',
          required: false,
          minSelections: 0,
          maxSelections: 3,
          modifierValues: [{ id: 'mv-1', name: 'Queijo', priceAdjustment: 2, available: true }],
        },
      ]);
      mockPrisma.combo.findMany.mockResolvedValueOnce([
        {
          id: 'combo-1',
          restaurantId: 'rest-1',
          name: 'Combo Família',
          bundlePrice: 59.9,
          available: true,
        },
      ]);

      const result = await service.getMenuByRestaurant('rest-1');

      expect(result.categories).toHaveLength(1);
      expect(result.products).toHaveLength(1);
      expect(result.modifierGroups).toHaveLength(1);
      // combo mapeado: bundlePrice → price
      expect(result.combos).toHaveLength(1);
      expect(result.combos[0]).toMatchObject({
        id: 'combo-1',
        price: 59.9,
      });
    });

    it('passa takes (limits) para todas as queries (defesa contra payload grande)', async () => {
      mockPrisma.restaurant.findFirst.mockResolvedValueOnce({ id: 'rest-1', name: 'R' });
      mockPrisma.category.findMany.mockResolvedValueOnce([]);
      mockPrisma.product.findMany.mockResolvedValueOnce([]);
      mockPrisma.modifierGroup.findMany.mockResolvedValueOnce([]);
      mockPrisma.combo.findMany.mockResolvedValueOnce([]);

      await service.getMenuByRestaurant('rest-1');

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 500 })
      );
      expect(mockPrisma.modifierGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
      expect(mockPrisma.combo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
    });

    it('omit products query WHERE quando não há categoryIds (sem categorias)', async () => {
      mockPrisma.restaurant.findFirst.mockResolvedValueOnce({ id: 'rest-1', name: 'R' });
      mockPrisma.category.findMany.mockResolvedValueOnce([]); // vazio
      mockPrisma.product.findMany.mockResolvedValueOnce([]);
      mockPrisma.modifierGroup.findMany.mockResolvedValueOnce([]);
      mockPrisma.combo.findMany.mockResolvedValueOnce([]);

      await service.getMenuByRestaurant('rest-1');

      // WHEN categoryIds.length === 0 → products WHERE é undefined
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined })
      );
    });

    it('filtra categorias apenas ativas e orderBy sortOrder asc', async () => {
      mockPrisma.restaurant.findFirst.mockResolvedValueOnce({ id: 'rest-1', name: 'R' });
      mockPrisma.category.findMany.mockResolvedValueOnce([]);
      mockPrisma.product.findMany.mockResolvedValueOnce([]);
      mockPrisma.modifierGroup.findMany.mockResolvedValueOnce([]);
      mockPrisma.combo.findMany.mockResolvedValueOnce([]);

      await service.getMenuByRestaurant('rest-1');

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 'rest-1', active: true },
        orderBy: { sortOrder: 'asc' },
        take: 100,
        select: expect.any(Object),
      });
    });
  });

  describe('getProductById', () => {
    it('retorna null quando produto não existe', async () => {
      mockPrisma.product.findFirst.mockResolvedValueOnce(null);
      const result = await service.getProductById('prod-fake', 'rest-1');
      expect(result).toBeNull();
    });

    it('retorna produto com category + modifierGroups (snake_case no response)', async () => {
      mockPrisma.product.findFirst.mockResolvedValueOnce({
        id: 'prod-1',
        name: 'Prato X',
        description: 'Descrição',
        imageUrl: 'https://example.com/img.png',
        price: 25,
        dietaryLabels: '["vegetariano"]',
        available: true,
        category: { id: 'cat-1', name: 'Categoria 1' },
        productModifierGroups: [
          {
            modifierGroup: {
              id: 'mod-1',
              name: 'Adicionais',
              required: false,
              minSelections: 0,
              maxSelections: 3,
              modifierValues: [
                { id: 'mv-1', name: 'Queijo', priceAdjustment: 2 },
              ],
            },
          },
        ],
      });

      const result = await service.getProductById('prod-1', 'rest-1');

      // Mapeamento snake_case esperado pelo frontend (B1).
      expect(result).toMatchObject({
        id: 'prod-1',
        name: 'Prato X',
        image_url: 'https://example.com/img.png',
        dietary_labels: '["vegetariano"]',
        category: { id: 'cat-1', name: 'Categoria 1' },
      });
      expect(result.modifier_groups).toHaveLength(1);
      expect(result.modifier_groups[0]).toMatchObject({
        id: 'mod-1',
        min_selections: 0,
        max_selections: 3,
      });
      expect(result.modifier_groups[0].values).toEqual([
        { id: 'mv-1', name: 'Queijo', price_adjustment: 2 },
      ]);
    });

    it('filtra por restaurantId + available + category.restaurantId (defesa em profundidade)', async () => {
      mockPrisma.product.findFirst.mockResolvedValueOnce(null);
      await service.getProductById('prod-1', 'rest-1');

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'prod-1',
          available: true,
          restaurantId: 'rest-1',
          category: { restaurantId: 'rest-1', restaurant: { active: true } },
        },
        include: expect.any(Object),
      });
    });
  });
});
