import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MesaRepository } from './MesaRepository';
import { Mesa } from '@/domain/mesa/entities/Mesa';
import { QRCodePayload } from '@/domain/mesa/value-objects/QRCodePayload';

const mockMesas: Map<string, Record<string, unknown>> = new Map();

const createMockDb = () => ({
  mesas: {
    add: vi.fn(async (record: Record<string, unknown>) => {
      mockMesas.set(record.id as string, record);
    }),
    put: vi.fn(async (record: Record<string, unknown>) => {
      mockMesas.set(record.id as string, record);
    }),
    get: vi.fn(async (id: string) => mockMesas.get(id) || null),
    delete: vi.fn(async (id: string) => mockMesas.delete(id)),
    where: vi.fn((): Record<string, unknown> => {
      return {
        equals: vi.fn((_value: unknown): Record<string, unknown> => {
          return {
            toArray: vi.fn(async () => Array.from(mockMesas.values())),
          };
        }),
      };
    }),
    toArray: vi.fn(async () => Array.from(mockMesas.values())),
  },
});

describe('MesaRepository', () => {
  let repository: MesaRepository;
  let mockDb: ReturnType<typeof createMockDb>;

  const createMesa = (overrides: Partial<Record<string, unknown>> = {}): Mesa => {
    return new Mesa({
      id: 'mesa-001',
      restauranteId: 'rest-001',
      label: 'Mesa 1',
      qrCodePayload: QRCodePayload.reconstruir({ restauranteId: 'rest-001', mesaId: 'mesa-001', assinatura: 'test-signature' }),
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      deletedAt: null,
      version: 1,
      ...overrides,
    } as import('@/domain/mesa/entities/Mesa').MesaProps);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMesas.clear();
    mockDb = createMockDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new MesaRepository(mockDb as any);
  });

  describe('create', () => {
    it('deve criar mesa no banco', async () => {
      const mesa = createMesa();

      await repository.create(mesa);

      expect(mockDb.mesas.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('deve retornar mesa quando encontrada', async () => {
      const mesa = createMesa();
      mockMesas.set('mesa-001', {
        id: 'mesa-001',
        restauranteId: 'rest-001',
        label: 'Mesa 1',
        qrCodePayload: { restauranteId: 'rest-001', mesaId: 'mesa-001', assinatura: 'sig' },
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.findById('mesa-001');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('mesa-001');
    });

    it('deve retornar null quando mesa não existe', async () => {
      const result = await repository.findById('mesa-inexistente');
      expect(result).toBeNull();
    });
  });

  describe('findByRestauranteId', () => {
    it('deve retornar mesas de um restaurante', async () => {
      mockMesas.set('mesa-001', {
        id: 'mesa-001',
        restauranteId: 'rest-001',
        label: 'Mesa 1',
        qrCodePayload: { restauranteId: 'rest-001', mesaId: 'mesa-001', assinatura: 'sig' },
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.findByRestauranteId('rest-001');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('mesa-001');
    });

    it('deve retornar array vazio quando restaurante não tem mesas', async () => {
      const result = await repository.findByRestauranteId('rest-sem-mesas');
      expect(result).toEqual([]);
    });
  });

  describe('findByLabel', () => {
    it('deve retornar mesa pelo label', async () => {
      mockMesas.set('mesa-001', {
        id: 'mesa-001',
        restauranteId: 'rest-001',
        label: 'Mesa 1',
        qrCodePayload: { restauranteId: 'rest-001', mesaId: 'mesa-001', assinatura: 'sig' },
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.findByLabel('rest-001', 'Mesa 1');

      expect(result).not.toBeNull();
      expect(result?.label).toBe('Mesa 1');
    });

    it('deve retornar null quando label não existe', async () => {
      const result = await repository.findByLabel('rest-001', 'Mesa Inexistente');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('deve atualizar mesa existente', async () => {
      const mesa = createMesa();

      await repository.update(mesa);

      expect(mockDb.mesas.put).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('deve deletar mesa pelo id', async () => {
      await repository.delete('mesa-001');
      expect(mockDb.mesas.delete).toHaveBeenCalledWith('mesa-001');
    });
  });
});
