import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsuarioRepository } from './UsuarioRepository';
import { Papel } from '@/domain/autenticacao/value-objects/Papel';

const mockUsuarios: Map<string, Record<string, unknown>> = new Map();

const createMockDb = () => ({
  usuarios: {
    add: vi.fn(async (record: Record<string, unknown>) => {
      mockUsuarios.set(record.id as string, record);
    }),
    put: vi.fn(async (record: Record<string, unknown>) => {
      mockUsuarios.set(record.id as string, record);
    }),
    get: vi.fn(async (id: string) => mockUsuarios.get(id) || null),
    delete: vi.fn(async (id: string) => mockUsuarios.delete(id)),
    where: vi.fn((): Record<string, unknown> => {
      return {
        equals: vi.fn((value: string): Record<string, unknown> => {
          return {
            first: vi.fn(async () => {
              for (const record of mockUsuarios.values()) {
                if (record.email === value) return record;
              }
              for (const record of mockUsuarios.values()) {
                if (record.restauranteId === value) return record;
              }
              return null;
            }),
            toArray: vi.fn(async () => {
              return Array.from(mockUsuarios.values()).filter(
                r => r.restauranteId === value
              );
            }),
          };
        }),
      };
    }),
  },
});

describe('UsuarioRepository', () => {
  let repository: UsuarioRepository;
  let mockDb!: ReturnType<typeof createMockDb>;

  const mockUsuarioRecord = {
    id: 'user-001',
    email: 'admin@restaurante.com',
    papel: 'dono',
    restauranteId: 'rest-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsuarios.clear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new UsuarioRepository(mockDb as any);
  });

  describe('create', () => {
    it('deve criar usuário no banco', async () => {
      const mockUsuario = {
        id: 'user-001',
        email: 'admin@restaurante.com',
        papel: Papel.DONO,
        restauranteId: 'rest-001',
        createdAt: new Date(),
        updatedAt: new Date(),
        toString: () => 'dono',
      } as unknown as import('@/domain/autenticacao/entities/Usuario').Usuario;

      await repository.create(mockUsuario);

      expect(mockDb.usuarios.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('deve retornar usuário quando encontrado', async () => {
      mockUsuarios.set('user-001', mockUsuarioRecord);

      const result = await repository.findById('user-001');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-001');
    });

    it('deve retornar null quando usuário não existe', async () => {
      const result = await repository.findById('user-inexistente');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('deve retornar usuário pelo email', async () => {
      mockUsuarios.set('user-001', mockUsuarioRecord);

      const result = await repository.findByEmail('admin@restaurante.com');

      expect(result).not.toBeNull();
      expect(result?.email).toBe('admin@restaurante.com');
    });

    it('deve retornar null quando email não existe', async () => {
      const result = await repository.findByEmail('inexistente@email.com');
      expect(result).toBeNull();
    });
  });

  describe('findByRestauranteId', () => {
    it('deve retornar usuários de um restaurante', async () => {
      mockUsuarios.set('user-001', mockUsuarioRecord);

      const result = await repository.findByRestauranteId('rest-001');

      expect(result.length).toBe(1);
    });

    it('deve retornar array vazio quando restaurante não tem usuários', async () => {
      const result = await repository.findByRestauranteId('rest-sem-usuarios');
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('deve atualizar usuário existente', async () => {
      const mockUsuario = {
        id: 'user-001',
        email: 'novo@email.com',
        papel: Papel.GERENTE,
        restauranteId: 'rest-001',
        createdAt: new Date(),
        updatedAt: new Date(),
        toString: () => 'gerente',
      } as unknown as import('@/domain/autenticacao/entities/Usuario').Usuario;

      await repository.update(mockUsuario);

      expect(mockDb.usuarios.put).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('deve deletar usuário pelo id', async () => {
      await repository.delete('user-001');
      expect(mockDb.usuarios.delete).toHaveBeenCalledWith('user-001');
    });
  });
});
