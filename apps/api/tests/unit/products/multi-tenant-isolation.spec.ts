/**
 * Testes unitários — Isolamento multi-tenant do ProductsService (P0-01)
 *
 * **Cenários cobertos:**
 * - `findById` aplica filtro `restaurantId` (defesa em profundidade —
 *   não depende apenas de `category.restaurant.active`).
 * - `findByCategory` REQUER `restaurantId` em options — fail-closed.
 * - `findByCategory` adiciona `restaurantId` ao `where` Prisma.
 * - `update` rejeita cross-tenant ops com `ForbiddenException`.
 * - `delete` rejeita cross-tenant ops com `ForbiddenException`.
 * - `findByRestaurant` mantém comportamento seguro (já escopado).
 *
 * **Estratégia:** mocks Prisma isolados — não toca DB. Os testes
 * assertam que as chamadas Prisma incluem `restaurantId` no `where`,
 * prova estática de que a regressão não volta.
 *
 * @spec(RNF-SEC-MT-01, P0-01)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

import { ProductsService } from '../../../src/products/products.service';

const createMockPrisma = () => ({
  product: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
});

describe('ProductsService — Isolamento multi-tenant (P0-01)', () => {
  let service: ProductsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new ProductsService(mockPrisma as never);
  });

  describe('findById — tenant isolation', () => {
    it('lança NotFoundException quando produto não existe', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.findById('ghost', 'rest-a')).rejects.toThrow(NotFoundException);
    });

    it('inclui restaurantId (via restaurant.active) na query — não vaza cross-tenant', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.findById('prod-x', 'rest-a')).rejects.toThrow(NotFoundException);

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'prod-x',
            restaurantId: 'rest-a',
            category: expect.objectContaining({
              restaurant: expect.objectContaining({ active: true }),
            }),
          }),
        })
      );
    });

    it('retorna produto quando restaurante está ativo (happy path)', async () => {
      const mockProduct = { id: 'prod-1', name: 'X', price: 100 };
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.findById('prod-1', 'rest-a');

      expect(result).toEqual(mockProduct);
    });

    // Auditoria P0-01 (2026-07-29): fail-closed — `requesterRestaurantId`
    // é OBRIGATÓRIO. Helper lança `ForbiddenException` no construtor se
    // tenant ausente/vazio, impedindo BOLA por construção.
    it('lança ForbiddenException quando requesterRestaurantId ausente (fail-closed)', async () => {
      await expect(service.findById('prod-1', undefined as unknown as string)).rejects.toThrow(
        ForbiddenException
      );
      expect(mockPrisma.product.findFirst).not.toHaveBeenCalled();
    });

    it('lança ForbiddenException quando requesterRestaurantId é string vazia', async () => {
      await expect(service.findById('prod-1', '' as unknown as string)).rejects.toThrow(
        ForbiddenException
      );
      expect(mockPrisma.product.findFirst).not.toHaveBeenCalled();
    });

    // Auditoria P0-01 (2026-07-29): quando o caller passa
    // `requesterRestaurantId`, o serviço DEVE filtrar também por
    // `restaurantId` (defesa em profundidade). É o cenário do
    // controller autenticado passando `req.user.restaurantId`.
    it('inclui filtro restaurantId no where quando requesterRestaurantId é fornecido', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.findById('prod-b1', 'rest-a')).rejects.toThrow(NotFoundException);

      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'prod-b1',
            restaurantId: 'rest-a',
            category: expect.objectContaining({
              restaurant: expect.objectContaining({ active: true }),
            }),
          }),
        })
      );
    });

    // Auditoria P0-01 (2026-07-29): BOLA prevenido. Caller do
    // restaurante A consultando prod-b1 do restaurante B retorna
    // NotFoundException (404 — não revela existência cross-tenant).
    it('retorna 404 quando produto pertence a OUTRO tenant (BOLA prevenido)', async () => {
      // findFirst com filtro WHERE retorna null (prod-b1 não bate com rest-a)
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.findById('prod-b1', 'rest-a')).rejects.toThrow(NotFoundException);
      // E não retorna dados do produto de outro tenant.
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'prod-b1', restaurantId: 'rest-a' }),
        })
      );
    });

    // Auditoria P0-01 (2026-07-29): happy path do caller autenticado
    // (mesmo tenant). Filtro WHERE inclui restaurantId autoritativo.
    it('retorna produto quando caller e produto pertencem ao MESMO tenant', async () => {
      const mockProduct = { id: 'prod-a1', restaurantId: 'rest-a', price: 25 };
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.findById('prod-a1', 'rest-a');

      expect(result).toEqual(mockProduct);
    });
  });

  describe('findByCategory — exige restaurantId (fail-closed)', () => {
    it('lança BadRequestException quando restaurantId ausente em options', async () => {
      await expect(service.findByCategory('cat-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
    });

    it('lança BadRequestException quando restaurantId é string vazia', async () => {
      await expect(
        service.findByCategory('cat-1', { restaurantId: '' as unknown as string })
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
    });

    it('inclui restaurantId no where quando fornecido', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findByCategory('cat-1', { restaurantId: 'rest-a' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-1',
            restaurantId: 'rest-a',
            available: true,
          }),
        })
      );
    });

    it('combina includeUnavailable com restaurantId sem perder filtro de tenant', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      await service.findByCategory('cat-1', {
        restaurantId: 'rest-a',
        includeUnavailable: true,
      });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-1',
            restaurantId: 'rest-a',
          }),
        })
      );
      // Quando includeUnavailable=true, NÃO devemos ter `available: true`
      // no filtro — o caller pediu para ver desativados também.
      const callArgs = mockPrisma.product.findMany.mock.calls[0][0];
      expect(callArgs.where.available).toBeUndefined();
    });
  });

  describe('findByRestaurant — já escopado, não regride', () => {
    it('continua passando restaurantId na query de categorias', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      await service.findByRestaurant('rest-a');

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            restaurantId: 'rest-a',
          }),
        })
      );
    });
  });

  describe('update — defesa em profundidade', () => {
    it('lança NotFoundException quando produto não existe e sem tenant explícito', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.update('ghost', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException (não NotFound) quando tenant filtra cross-tenant (mitigação enumeração)', async () => {
      // Auditoria P0-01 (2026-07-29): com requesterRestaurantId, o
      // findFirst com filtro WHERE retorna null para qualquer produto
      // fora do tenant — em vez de 404 (revelaria "produto não existe"),
      // retornamos 403 ("produto pertence a outro restaurante") para
      // não permitir enumeração cross-tenant.
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.update('ghost', { name: 'X' }, 'rest-a')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('lança ForbiddenException quando produto pertence a outro tenant', async () => {
      // findFirst com filtro restaurantId='rest-A' retorna null —
      // a defesa em profundidade (filtro WHERE) já bloqueia antes da
      // checagem manual em target.category.restaurantId.
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.update('prod-1', { name: 'X' }, 'rest-A')).rejects.toThrow(
        ForbiddenException
      );
      expect(mockPrisma.product.update).not.toHaveBeenCalled();
    });

    it('permite update quando produto pertence ao mesmo tenant', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        category: { restaurantId: 'rest-A' },
      });
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-1', name: 'Y' });

      await expect(service.update('prod-1', { name: 'Y' }, 'rest-A')).resolves.toEqual({
        id: 'prod-1',
        name: 'Y',
      });
    });

    // Auditoria P0-01 (2026-07-29): `update` agora delega ao helper
    // `scopedRepository` (NÃO a `prisma.product.update` raw), garantindo
    // que o WHERE da mutação carrega `restaurantId`. Defesa contra
    // TOCTOU entre lookup e update.
    it('usa helper scopedRepository para update (restaurantId no WHERE da mutação)', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        category: { restaurantId: 'rest-A' },
      });
      mockPrisma.product.update.mockResolvedValue({ id: 'prod-1', price: 30 });

      await service.update('prod-1', { price: 30 }, 'rest-A');

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1', restaurantId: 'rest-A' },
        data: { price: 30 },
      });
    });

    // Auditoria P0-01 (2026-07-29): mapeia P2025 (Record to update not
    // found) do helper para `ForbiddenException` para manter o contrato
    // "pertencer a outro restaurante" do caller quando a linha foi
    // reatribuída entre o lookup e a mutação.
    it('mapeia P2025 do helper para ForbiddenException no update', async () => {
      const p2025 = Object.assign(new Error('Record to update not found.'), {
        code: 'P2025',
      });
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        category: { restaurantId: 'rest-A' },
      });
      mockPrisma.product.update.mockRejectedValue(p2025);

      await expect(service.update('prod-1', { name: 'Y' }, 'rest-A')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('relança erros não-P2025 do update sem mascarar', async () => {
      const other = new Error('Conexão perdida');
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        category: { restaurantId: 'rest-A' },
      });
      mockPrisma.product.update.mockRejectedValue(other);

      await expect(service.update('prod-1', { name: 'Y' }, 'rest-A')).rejects.toBe(other);
    });
  });

  describe('delete — defesa em profundidade', () => {
    it('lança NotFoundException quando produto não existe e sem tenant explícito', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.delete('ghost')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.product.delete).not.toHaveBeenCalled();
    });

    it('lança ForbiddenException (não NotFound) quando tenant filtra cross-tenant (mitigação enumeração)', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.delete('ghost', 'rest-a')).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.product.delete).not.toHaveBeenCalled();
    });

    it('lança ForbiddenException quando produto pertence a outro tenant', async () => {
      // findFirst com filtro restaurantId='rest-A' retorna null —
      // BOLA prevenido pela defesa em profundidade.
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.delete('prod-1', 'rest-A')).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.product.delete).not.toHaveBeenCalled();
    });

    it('permite delete quando produto pertence ao mesmo tenant', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        category: { restaurantId: 'rest-A' },
      });
      mockPrisma.product.delete.mockResolvedValue({ id: 'prod-1' });

      await expect(service.delete('prod-1', 'rest-A')).resolves.toBeUndefined();
      // Auditoria P0-01 (2026-07-29): `delete` agora delega ao helper
      // `scopedRepository`, que injeta `restaurantId` no WHERE da mutação
      // — defesa contra TOCTOU entre lookup e delete.
      expect(mockPrisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'prod-1', restaurantId: 'rest-A' },
      });
    });

    // Auditoria P0-01 (2026-07-29): se a linha foi reatribuída para outro
    // tenant entre o `findFirst` (que viu o produto no nosso tenant) e
    // o `delete`, o helper `scopedRepository` injeta `restaurantId` no
    // WHERE da mutação, que retorna `P2025` (Record to delete not found).
    // Mapeamos para `ForbiddenException` para manter o contrato do caller.
    it('mapeia P2025 do helper para ForbiddenException no delete', async () => {
      const p2025 = Object.assign(new Error('Record to delete not found.'), {
        code: 'P2025',
      });
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        category: { restaurantId: 'rest-A' },
      });
      mockPrisma.product.delete.mockRejectedValue(p2025);

      await expect(service.delete('prod-1', 'rest-A')).rejects.toThrow(ForbiddenException);
    });

    it('relança erros não-P2025 sem mascarar', async () => {
      const other = new Error('Conexão perdida');
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        category: { restaurantId: 'rest-A' },
      });
      mockPrisma.product.delete.mockRejectedValue(other);

      await expect(service.delete('prod-1', 'rest-A')).rejects.toBe(other);
    });
  });
});
