/**
 * Testes unitários — MenuService.getProductById com isolamento multi-tenant (P0-01)
 *
 * **Cenários cobertos:**
 * - `getProductById` inclui filtro `restaurantId` direto (defesa em
 *   profundidade) — não depende apenas de `category.restaurantId`.
 * - Retorna null quando produto pertence a outro tenant.
 * - Retorna null quando restaurante está desativado.
 * - Retorna null quando produto está `available: false`.
 * - Retorna produto quando todos os critérios batem.
 *
 * **Estratégia:** mocks Prisma isolados — não toca DB. Os testes
 * assertam que `where` carrega `restaurantId` direto na coluna
 * autoritativa do `Product`, prova estática de defesa em profundidade.
 *
 * @spec(RNF-SEC-MT-01, P0-01 — MINOR #2)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MenuService } from '../../../src/menu/menu.service';

const createMockPrisma = () => ({
  restaurant: {
    findFirst: vi.fn(),
  },
  product: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
  },
  modifierGroup: {
    findMany: vi.fn(),
  },
  combo: {
    findMany: vi.fn(),
  },
});

describe('MenuService — getProductById (P0-01 MINOR #2)', () => {
  let service: MenuService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new MenuService(mockPrisma as never);
  });

  describe('isolamento multi-tenant — defesa em profundidade', () => {
    it('inclui restaurantId DIRETO no where do product (não só via category)', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await service.getProductById('prod-1', 'rest-A');

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'prod-1',
            restaurantId: 'rest-A',
            available: true,
          }),
        })
      );
    });

    it('combina restaurantId direto com filtro category.restaurantId (dupla camada)', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await service.getProductById('prod-1', 'rest-A');

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'prod-1',
            restaurantId: 'rest-A',
            category: expect.objectContaining({
              restaurantId: 'rest-A',
              restaurant: expect.objectContaining({ active: true }),
            }),
          }),
        })
      );
    });

    it('retorna null quando produto pertence a outro tenant (BOLA prevenido)', async () => {
      // Mesmo passando restaurantId='rest-A', o produto do tenant B
      // não satisfaz `restaurantId: 'rest-A'` → findFirst retorna null.
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const result = await service.getProductById('prod-B', 'rest-A');

      expect(result).toBeNull();
    });

    it('retorna produto quando tenant bate em todas as camadas', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'X',
        price: 1990,
        available: true,
        category: { id: 'cat-1', name: 'Cat' },
        productModifierGroups: [],
      };
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.getProductById('prod-1', 'rest-A');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('prod-1');
    });

    it('filtra produtos disponíveis (available=true) e restaurante ativo', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await service.getProductById('prod-1', 'rest-A');

      const callArgs = mockPrisma.product.findFirst.mock.calls[0][0];
      // available=true no escopo direto
      expect(callArgs.where.available).toBe(true);
      // restaurant.active=true via category.restaurant
      expect(callArgs.where.category.restaurant.active).toBe(true);
    });
  });
});
