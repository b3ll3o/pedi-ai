import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { CartService } from '../../../src/cart/cart.service';
import { PrismaService } from '../../../src/common/prisma.service';

/**
 * Spec de cobertura para `CartService` (168 linhas, BC `pedido/`).
 *
 * Cobre validateCart com 5 ramos:
 * - Carrinho vazio → invalid (no errors array)
 * - Staff sem restaurantId no JWT → Forbidden
 * - Staff com body restaurantId divergente → Forbidden
 * - Cliente com tableId → força restaurante da mesa; mesa inválida → BadRequest
 * - Cliente sem mesa e sem restaurantId → BadRequest
 * - Cliente com mesa válida → usa restaurante da mesa
 * - Validação de produto inexistente, indisponível, preço divergente
 */
describe('CartService', () => {
  let service: CartService;
  let p: ReturnType<typeof createMockPrisma>;

  function createMockPrisma() {
    return {
      table: { findFirst: vi.fn() },
      product: { findMany: vi.fn() },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    p = createMockPrisma();
    service = new CartService(p as unknown as PrismaService);
  });

  describe('validateCart — staff', () => {
    it('rejeita staff sem restaurantId no JWT (Forbidden)', async () => {
      await expect(
        service.validateCart(
          {
            restaurantId: 'rest-1',
            items: [{ productId: 'p-1', unitPrice: 10 }],
          },
          { id: 'u-1', role: 'gerente', restaurantId: null }
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejeita staff com restaurantId body divergente do JWT', async () => {
      await expect(
        service.validateCart(
          {
            restaurantId: 'rest-other',
            items: [{ productId: 'p-1', unitPrice: 10 }],
          },
          { id: 'u-1', role: 'dono', restaurantId: 'rest-jwt' }
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('aceita staff com restaurantId do JWT (happy path sem mesa)', async () => {
      p.product.findMany.mockResolvedValueOnce([
        { id: 'p-1', price: 10, available: true, name: 'P1' },
      ]);

      const result = await service.validateCart(
        {
          items: [{ productId: 'p-1', unitPrice: 10 }],
        },
        { id: 'u-1', role: 'gerente', restaurantId: 'rest-jwt' }
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('validateCart — cliente', () => {
    it('rejeita cliente sem mesa e sem restaurantId', async () => {
      await expect(
        service.validateCart(
          { items: [{ productId: 'p-1', unitPrice: 10 }] },
          { id: 'u-1', role: 'cliente', restaurantId: null }
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita cliente com mesa inválida/inativa', async () => {
      p.table.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.validateCart(
          {
            tableId: 't-1',
            items: [{ productId: 'p-1', unitPrice: 10 }],
          },
          { id: 'u-1', role: 'cliente', restaurantId: 'rest-1' }
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('cliente com mesa válida: usa restaurantId da mesa (autoritativo)', async () => {
      // Mesa chamada 2x: resolveRestaurantId + validateTable. Mockamos
      // ambas para retornar mesa ativa do restaurante autoritativo.
      p.table.findFirst.mockResolvedValue({
        restaurantId: 'rest-mesa',
        active: true,
      });
      // validateProducts chamado DEPOIS (no caminho valid). Mockar products
      // para evitar erro "Cannot read properties of undefined (reading 'map')".
      p.product.findMany.mockResolvedValueOnce([
        { id: 'p-1', price: 10, available: true, name: 'P1' },
      ]);

      const result = await service.validateCart(
        {
          tableId: 't-1',
          restaurantId: 'rest-body', // ignorado em favor da mesa
          items: [{ productId: 'p-1', unitPrice: 10 }],
        },
        { id: 'u-1', role: 'cliente', restaurantId: 'rest-1' }
      );

      expect(result.valid).toBe(true);
    });

    it('cliente sem mesa: usa restaurantId do body', async () => {
      p.product.findMany.mockResolvedValueOnce([
        { id: 'p-1', price: 10, available: true, name: 'P1' },
      ]);

      const result = await service.validateCart(
        {
          restaurantId: 'rest-body',
          items: [{ productId: 'p-1', unitPrice: 10 }],
        },
        { id: 'u-1', role: 'cliente', restaurantId: 'rest-1' }
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('validateCart — branches inválidos', () => {
    it('carrinho vazio → valid=false com error message', async () => {
      const result = await service.validateCart(
        { items: [], restaurantId: 'rest-1' },
        { id: 'u-1', role: 'dono', restaurantId: 'rest-1' }
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Carrinho vazio - adicione itens para fazer o pedido');
    });

    it('mesa inválida → erro de validação', async () => {
      p.table.findFirst.mockResolvedValueOnce(null);
      // validateProducts também roda — mockar products=[] para evitar
      // "Cannot read properties of undefined (reading 'map')".
      p.product.findMany.mockResolvedValueOnce([]);
      const result = await service.validateCart(
        {
          tableId: 't-fake',
          restaurantId: 'rest-1',
          items: [{ productId: 'p-1', unitPrice: 10 }],
        },
        { id: 'u-1', role: 'dono', restaurantId: 'rest-1' }
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mesa inválida ou inativa');
    });

    it('produto inexistente → erro', async () => {
      p.product.findMany.mockResolvedValueOnce([]); // vazio
      const result = await service.validateCart(
        {
          items: [{ productId: 'p-fake', name: 'P-Fake', unitPrice: 10 }],
        },
        { id: 'u-1', role: 'dono', restaurantId: 'rest-1' }
      );
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toContain('P-Fake');
    });

    it('produto indisponível → erro', async () => {
      p.product.findMany.mockResolvedValueOnce([
        { id: 'p-1', price: 10, available: false, name: 'P1' },
      ]);

      const result = await service.validateCart(
        {
          items: [{ productId: 'p-1', unitPrice: 10 }],
        },
        { id: 'u-1', role: 'dono', restaurantId: 'rest-1' }
      );

      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toContain('não está mais disponível');
    });

    it('preço divergente (cliente fez tampering) → erro', async () => {
      p.product.findMany.mockResolvedValueOnce([
        { id: 'p-1', price: 100, available: true, name: 'P1' },
      ]);

      const result = await service.validateCart(
        {
          items: [{ productId: 'p-1', unitPrice: 10 }], // body diz 10
        },
        { id: 'u-1', role: 'dono', restaurantId: 'rest-1' }
      );

      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toMatch(/diverge|diverge/);
    });
  });
});
