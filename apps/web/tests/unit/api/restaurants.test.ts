/**
 * Testes do use case ListarRestaurantesDoOwnerUseCase (RF-ADM-02, RF-ADM-09).
 *
 * Cobre:
 * - Multi-restaurant OFF: retorna restaurante ativo único com papel 'dono'
 * - Multi-restaurant ON: retorna vínculos via junction table
 * - Contrato do enum PapelRestaurante (valores pt-BR)
 *
 * @see apps/web/src/application/admin/services/ListarRestaurantesDoOwnerUseCase.ts
 * @see apps/web/src/domain/admin/value-objects/PapelRestaurante.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListarRestaurantesDoOwnerUseCase } from '@/application/admin/services/ListarRestaurantesDoOwnerUseCase';

// Mock do módulo de feature flags (controla toggle multi-restaurant).
vi.mock('@/lib/feature-flags', () => ({
  isMultiRestaurantEnabled: vi.fn<() => boolean>(),
}));

import { isMultiRestaurantEnabled } from '@/lib/feature-flags';
const mockIsMultiRestaurantEnabled = vi.mocked(isMultiRestaurantEnabled);

// ── Fakes de repositórios (mocks tipados do domain) ──────────────────────────

const fakeRestaurante = {
  id: 'rest-1',
  nome: 'Restaurante Teste',
  slug: 'restaurante-teste',
  ativo: true,
  criadoEm: new Date('2026-01-01'),
  atualizadoEm: new Date('2026-01-01'),
};

function makeRestauranteRepo(): {
  findAtivo: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  findByUsuarioId: ReturnType<typeof vi.fn>;
} {
  return {
    findAtivo: vi.fn(),
    findById: vi.fn(),
    findByUsuarioId: vi.fn(),
  };
}

function makeUsuarioRestauranteRepo(): {
  findByUsuarioId: ReturnType<typeof vi.fn>;
} {
  return {
    findByUsuarioId: vi.fn(),
  };
}

// ── Testes ─────────────────────────────────────────────────────────────────

describe('ListarRestaurantesDoOwnerUseCase', () => {
  let restauranteRepo: ReturnType<typeof makeRestauranteRepo>;
  let usuarioRestauranteRepo: ReturnType<typeof makeUsuarioRestauranteRepo>;
  let useCase: ListarRestaurantesDoOwnerUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    restauranteRepo = makeRestauranteRepo();
    usuarioRestauranteRepo = makeUsuarioRestauranteRepo();
    useCase = new ListarRestaurantesDoOwnerUseCase(
      restauranteRepo as never,
      usuarioRestauranteRepo as never
    );
  });

  describe('Multi-restaurant DESABILITADO (legacy)', () => {
    beforeEach(() => {
      mockIsMultiRestaurantEnabled.mockReturnValue(false);
    });

    it('retorna restaurante ativo com papel "dono" quando existe', async () => {
      restauranteRepo.findAtivo.mockResolvedValue(fakeRestaurante);

      const result = await useCase.execute({ ownerId: 'user-1' });

      expect(result.sucesso).toBe(true);
      expect(result.restaurantes).toHaveLength(1);
      expect(result.restaurantes[0].restaurante.id).toBe('rest-1');
      expect(result.restaurantes[0].papel).toBe('dono');
      expect(restauranteRepo.findAtivo).toHaveBeenCalledTimes(1);
    });

    it('retorna lista vazia quando não há restaurante ativo', async () => {
      restauranteRepo.findAtivo.mockResolvedValue(null);

      const result = await useCase.execute({ ownerId: 'user-1' });

      expect(result.sucesso).toBe(true);
      expect(result.restaurantes).toEqual([]);
    });

    it('não consulta junction table no modo legacy', async () => {
      restauranteRepo.findAtivo.mockResolvedValue(fakeRestaurante);

      await useCase.execute({ ownerId: 'user-1' });

      expect(usuarioRestauranteRepo.findByUsuarioId).not.toHaveBeenCalled();
    });
  });

  describe('Multi-restaurant HABILITADO', () => {
    beforeEach(() => {
      mockIsMultiRestaurantEnabled.mockReturnValue(true);
    });

    it('retorna restaurantes vinculados via junction table', async () => {
      usuarioRestauranteRepo.findByUsuarioId.mockResolvedValue([
        { restauranteId: 'rest-1', papel: 'dono' },
        { restauranteId: 'rest-2', papel: 'gerente' },
      ]);
      restauranteRepo.findById.mockImplementation(async (id: string) =>
        id === 'rest-1' ? fakeRestaurante : { ...fakeRestaurante, id: 'rest-2' }
      );

      const result = await useCase.execute({ ownerId: 'user-1' });

      expect(result.sucesso).toBe(true);
      expect(result.restaurantes).toHaveLength(2);
      expect(result.restaurantes[0].papel).toBe('dono');
      expect(result.restaurantes[1].papel).toBe('gerente');
    });

    it('filtra vínculos cujo restaurante não foi encontrado', async () => {
      usuarioRestauranteRepo.findByUsuarioId.mockResolvedValue([
        { restauranteId: 'rest-1', papel: 'dono' },
        { restauranteId: 'rest-deleted', papel: 'gerente' },
      ]);
      restauranteRepo.findById.mockImplementation(async (id: string) =>
        id === 'rest-1' ? fakeRestaurante : null
      );

      const result = await useCase.execute({ ownerId: 'user-1' });

      expect(result.restaurantes).toHaveLength(1);
      expect(result.restaurantes[0].restaurante.id).toBe('rest-1');
    });

    it('retorna lista vazia quando usuário não tem vínculos', async () => {
      usuarioRestauranteRepo.findByUsuarioId.mockResolvedValue([]);

      const result = await useCase.execute({ ownerId: 'user-1' });

      expect(result.sucesso).toBe(true);
      expect(result.restaurantes).toEqual([]);
    });
  });
});

describe('Enum PapelRestaurante (fonte de verdade pt-BR)', () => {
  const valueObjectPath = path.join(
    process.cwd(),
    'apps/web/src/domain/admin/value-objects/PapelRestaurante.ts'
  );

  it('PapelRestaurante.ts usa valores pt-BR', () => {
    const content = fs.readFileSync(valueObjectPath, 'utf-8');

    expect(content).toContain("'dono'");
    expect(content).toContain("'gerente'");
    expect(content).toContain("'atendente'");
  });

  it('PapelRestaurante.ts NÃO contém valores em inglês', () => {
    const content = fs.readFileSync(valueObjectPath, 'utf-8');
    const englishRegex = /['"](owner|manager|employee|customer)['"]/g;

    expect(content.match(englishRegex)).toBeNull();
  });

  it('PapelRestauranteHelpers.isOwner retorna true apenas para "dono"', async () => {
    const { PapelRestauranteHelpers } =
      await import('@/domain/admin/value-objects/PapelRestaurante');

    expect(PapelRestauranteHelpers.isOwner('dono')).toBe(true);
    expect(PapelRestauranteHelpers.isOwner('gerente')).toBe(false);
    expect(PapelRestauranteHelpers.isOwner('atendente')).toBe(false);
  });

  it('PapelRestauranteHelpers.isManager retorna true apenas para "gerente"', async () => {
    const { PapelRestauranteHelpers } =
      await import('@/domain/admin/value-objects/PapelRestaurante');

    expect(PapelRestauranteHelpers.isManager('gerente')).toBe(true);
    expect(PapelRestauranteHelpers.isManager('dono')).toBe(false);
  });

  it('PapelRestauranteHelpers.isStaff retorna true apenas para "atendente"', async () => {
    const { PapelRestauranteHelpers } =
      await import('@/domain/admin/value-objects/PapelRestaurante');

    expect(PapelRestauranteHelpers.isStaff('atendente')).toBe(true);
    expect(PapelRestauranteHelpers.isStaff('dono')).toBe(false);
  });
});
