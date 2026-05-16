import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RestauranteRepository } from '@/infrastructure/persistence/admin/RestauranteRepository';
import { PediDatabase } from '@/infrastructure/persistence/database';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { ConfiguracoesRestaurante } from '@/domain/admin/value-objects/ConfiguracoesRestaurante';

// Mock da classe PediDatabase
const mockRestaurantes: Map<string, Record<string, unknown>> = new Map();
const mockConfiguracoes: Map<string, Record<string, unknown>> = new Map();
const mockUserRestaurants: Map<number, Record<string, unknown>> = new Map();
let mockUserRestaurantsNextId = 1;

// Mocks persistentes para cada tabela (mesmo objeto em todas as chamadas de table())
const mockConfiguracoesTable = {
  put: vi.fn(async (record: Record<string, unknown>) => {
    mockConfiguracoes.set(record.restauranteId as string, record);
  }),
  get: vi.fn(async (id: string) => mockConfiguracoes.get(id) || null),
  delete: vi.fn(async (id: string) => {
    mockConfiguracoes.delete(id);
  }),
};

const mockUserRestaurantsTable = {
  put: vi.fn(async (record: Record<string, unknown>) => {
    const id = (record.id as number | undefined) ?? mockUserRestaurantsNextId++;
    mockUserRestaurants.set(id, { ...record, id });
  }),
  where: vi.fn(() => ({
    equals: vi.fn((value: unknown) => ({
      first: vi.fn(async () => {
        for (const record of mockUserRestaurants.values()) {
          if (
            (record as Record<string, unknown>)[
              Object.keys(record).find((k) => k === 'user_id') || 'user_id'
            ] === value
          ) {
            return record;
          }
        }
        return undefined;
      }),
      toArray: vi.fn(async () => {
        return Array.from(mockUserRestaurants.values()).filter(
          (r) =>
            (r as Record<string, unknown>)[
              Object.keys(r).find((k) => k === 'user_id') || 'user_id'
            ] === value
        );
      }),
    })),
    anyOf: vi.fn(() => ({
      toArray: vi.fn(async () => Array.from(mockUserRestaurants.values())),
    })),
  })),
  toArray: vi.fn(async () => Array.from(mockUserRestaurants.values())),
};

const createMockDb = (): PediDatabase => {
  return {
    restaurantes: {
      put: vi.fn(async (record: Record<string, unknown>) => {
        mockRestaurantes.set(record.id as string, record);
      }),
      get: vi.fn(async (id: string) => mockRestaurantes.get(id) || null),
      delete: vi.fn(async (id: string) => mockRestaurantes.delete(id)),
      where: vi.fn(() => ({
        equals: vi.fn((value: unknown) => ({
          first: vi.fn(async () => {
            for (const record of mockRestaurantes.values()) {
              if (Object.values(record).includes(value)) return record;
            }
            return null;
          }),
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn(async () => Array.from(mockRestaurantes.values())),
        })),
      })),
      toArray: vi.fn(async () => Array.from(mockRestaurantes.values())),
    },
    table: vi.fn((tableName: string) => {
      if (tableName === 'configuracoes_restaurante') {
        return mockConfiguracoesTable;
      }
      if (tableName === 'user_restaurants') {
        return mockUserRestaurantsTable;
      }
      return { put: vi.fn(), get: vi.fn(), delete: vi.fn(), toArray: vi.fn(async () => []) };
    }),
  } as unknown as PediDatabase;
};

describe('RestauranteRepository', () => {
  let repository: RestauranteRepository;
  let mockDb: PediDatabase;

  const criarRestaurante = (
    overrides: Partial<{
      id: string;
      nome: string;
      cnpj: string;
      endereco: string;
      telefone: string | null;
      logoUrl: string | null;
      ativo: boolean;
    }> = {}
  ) => {
    return Restaurante.criar({
      nome: overrides.nome || 'Restaurante Teste',
      cnpj: overrides.cnpj || '12.345.678/0001-90',
      endereco: overrides.endereco || 'Rua Teste, 123',
      telefone: overrides.telefone ?? null,
      logoUrl: overrides.logoUrl ?? null,
      ativo: overrides.ativo ?? true,
    });
  };

  const criarConfiguracoes = (): ConfiguracoesRestaurante => {
    return ConfiguracoesRestaurante.criarPadrao();
  };

  beforeEach(() => {
    mockRestaurantes.clear();
    mockConfiguracoes.clear();
    mockUserRestaurants.clear();
    mockUserRestaurantsNextId = 1;
    vi.clearAllMocks();
    mockDb = createMockDb();
    repository = new RestauranteRepository(mockDb);
  });

  describe('create', () => {
    it('deve criar um restaurante com sucesso', async () => {
      const restaurante = criarRestaurante({ nome: 'Pizzaria Lua' });
      const configuracoes = criarConfiguracoes();

      const resultado = await repository.create(restaurante, configuracoes);

      expect(resultado).toBe(restaurante);
      expect(mockDb.restaurantes.put).toHaveBeenCalledTimes(1);
    });

    it('deve persistir as configurações junto com o restaurante', async () => {
      const restaurante = criarRestaurante();
      const configuracoes = criarConfiguracoes();

      await repository.create(restaurante, configuracoes);

      expect(mockDb.table('configuracoes_restaurante').put).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('deve retornar o restaurante quando encontrado', async () => {
      const restaurante = criarRestaurante();
      mockRestaurantes.set(restaurante.id, {
        id: restaurante.id,
        nome: restaurante.nome,
        cnpj: restaurante.cnpj,
        endereco: restaurante.endereco,
        telefone: restaurante.telefone,
        logoUrl: restaurante.logoUrl,
        ativo: restaurante.ativo,
        criadoEm: restaurante.criadoEm,
        atualizadoEm: restaurante.atualizadoEm,
        deletedAt: null,
        version: 1,
      });

      const resultado = await repository.findById(restaurante.id);

      expect(resultado).not.toBeNull();
      expect(resultado?.nome).toBe('Restaurante Teste');
    });

    it('deve retornar null quando restaurante não existe', async () => {
      const resultado = await repository.findById('id-inexistente');

      expect(resultado).toBeNull();
    });
  });

  describe('findByCNPJ', () => {
    it('deve retornar restaurante quando CNPJ existe', async () => {
      const cnpj = '98.765.432/0001-11';
      const restaurante = criarRestaurante({ cnpj });
      mockRestaurantes.set(restaurante.id, {
        id: restaurante.id,
        nome: restaurante.nome,
        cnpj: restaurante.cnpj,
        endereco: restaurante.endereco,
        telefone: restaurante.telefone,
        logoUrl: restaurante.logoUrl,
        ativo: restaurante.ativo,
        criadoEm: restaurante.criadoEm,
        atualizadoEm: restaurante.atualizadoEm,
        deletedAt: null,
        version: 1,
      });

      const resultado = await repository.findByCNPJ(cnpj);

      expect(resultado).not.toBeNull();
      expect(resultado?.cnpj).toBe(cnpj);
    });

    it('deve retornar null quando CNPJ não existe', async () => {
      const resultado = await repository.findByCNPJ('00.000.000/0000-00');

      expect(resultado).toBeNull();
    });
  });

  describe('update', () => {
    it('deve atualizar restaurante e configurações', async () => {
      const restaurante = criarRestaurante();
      const configuracoes = criarConfiguracoes();

      await repository.create(restaurante, configuracoes);

      const restauranteAtualizado = Restaurante.reconstruir({
        id: restaurante.id,
        nome: 'Pizzaria Atualizada',
        cnpj: restaurante.cnpj,
        endereco: restaurante.endereco,
        telefone: restaurante.telefone,
        logoUrl: restaurante.logoUrl,
        ativo: restaurante.ativo,
        criadoEm: restaurante.criadoEm,
        atualizadoEm: new Date(),
        deletedAt: restaurante.deletedAt,
        version: restaurante.version,
      });

      const resultado = await repository.update(restauranteAtualizado, configuracoes);

      expect(resultado.nome).toBe('Pizzaria Atualizada');
    });
  });

  describe('delete', () => {
    it('deve remover restaurante e configurações', async () => {
      const restaurante = criarRestaurante();
      const configuracoes = criarConfiguracoes();

      await repository.create(restaurante, configuracoes);
      await repository.delete(restaurante.id);

      expect(mockDb.restaurantes.delete).toHaveBeenCalledWith(restaurante.id);
      expect(mockDb.table('configuracoes_restaurante').delete).toHaveBeenCalledWith(restaurante.id);
    });
  });

  describe('findAtivo', () => {
    it('deve retornar restaurante ativo', async () => {
      const restauranteAtivo = criarRestaurante({ ativo: true });
      const restauranteInativo = criarRestaurante({ id: 'id-2', nome: 'Inativo', ativo: false });

      mockRestaurantes.set(restauranteAtivo.id, {
        id: restauranteAtivo.id,
        nome: restauranteAtivo.nome,
        cnpj: restauranteAtivo.cnpj,
        endereco: restauranteAtivo.endereco,
        telefone: restauranteAtivo.telefone,
        logoUrl: restauranteAtivo.logoUrl,
        ativo: true,
        criadoEm: restauranteAtivo.criadoEm,
        atualizadoEm: restauranteAtivo.atualizadoEm,
        deletedAt: null,
        version: 1,
      });

      mockRestaurantes.set(restauranteInativo.id, {
        id: restauranteInativo.id,
        nome: restauranteInativo.nome,
        cnpj: restauranteInativo.cnpj,
        endereco: restauranteInativo.endereco,
        telefone: restauranteInativo.telefone,
        logoUrl: restauranteInativo.logoUrl,
        ativo: false,
        criadoEm: restauranteInativo.criadoEm,
        atualizadoEm: restauranteInativo.atualizadoEm,
        deletedAt: null,
        version: 1,
      });

      const resultado = await repository.findAtivo();

      expect(resultado).not.toBeNull();
      expect(resultado?.ativo).toBe(true);
    });

    it('deve retornar null quando nenhum restaurante está ativo', async () => {
      const resultado = await repository.findAtivo();

      expect(resultado).toBeNull();
    });
  });

  describe('findByUsuarioId', () => {
    it('deve retornar lista vazia quando usuário não tem restaurantes vinculados', async () => {
      const resultado = await repository.findByUsuarioId('usuario-sem-vinculos');

      expect(resultado).toEqual([]);
    });
  });
});
