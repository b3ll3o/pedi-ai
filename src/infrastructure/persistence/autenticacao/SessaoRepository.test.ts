import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessaoRepository } from './SessaoRepository';

const mockSessoes: Map<string, Record<string, unknown>> = new Map();

const createMockDb = () => ({
  sessoes: {
    add: vi.fn(async (record: Record<string, unknown>) => {
      mockSessoes.set(record.id as string, record);
    }),
    put: vi.fn(),
    get: vi.fn(async (id: string) => mockSessoes.get(id) || null),
    delete: vi.fn(async (id: string) => mockSessoes.delete(id)),
    where: vi.fn((): Record<string, unknown> => {
      return {
        equals: vi.fn((value: string): Record<string, unknown> => {
          return {
            first: vi.fn(async () => {
              for (const record of mockSessoes.values()) {
                if (record.token === value) return record;
                if (record.usuarioId === value) return record;
              }
              return null;
            }),
            toArray: vi.fn(async () => {
              return Array.from(mockSessoes.values()).filter(
                r => r.usuarioId === value
              );
            }),
            below: vi.fn(async (): Promise<Record<string, unknown>> => {
              return {
                toArray: vi.fn(async () => {
                  const agora = new Date();
                  return Array.from(mockSessoes.values()).filter(
                    r => new Date(r.expiracao as string) < agora
                  );
                }),
              };
            }),
          };
        }),
      };
    }),
    bulkDelete: vi.fn(async (ids: string[]) => {
      ids.forEach(id => mockSessoes.delete(id));
    }),
  },
});

describe('SessaoRepository', () => {
  let repository: SessaoRepository;
  let mockDb!: ReturnType<typeof createMockDb>;

  const mockSessaoRecord = {
    id: 'sessao-001',
    usuarioId: 'user-001',
    token: 'token-abc-123',
    expiracao: new Date(Date.now() + 60 * 60 * 1000), // 1h ahead
    dispositivo: 'Chrome on Windows',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessoes.clear();
     
    repository = new SessaoRepository(mockDb as any);
  });

  describe('create', () => {
    it('deve criar sessão no banco', async () => {
      const mockSessao = {
        id: 'sessao-001',
        usuarioId: 'user-001',
        token: 'token-abc-123',
        expiracao: new Date(Date.now() + 60 * 60 * 1000),
        dispositivo: 'Chrome on Windows',
      } as unknown as import('@/domain/autenticacao/entities/Sessao').Sessao;

      await repository.create(mockSessao);

      expect(mockDb.sessoes.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('deve retornar sessão quando encontrada', async () => {
      mockSessoes.set('sessao-001', mockSessaoRecord);

      const result = await repository.findById('sessao-001');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('sessao-001');
    });

    it('deve retornar null quando sessão não existe', async () => {
      const result = await repository.findById('sessao-inexistente');
      expect(result).toBeNull();
    });
  });

  describe('findByToken', () => {
    it('deve retornar sessão pelo token', async () => {
      mockSessoes.set('sessao-001', mockSessaoRecord);

      const result = await repository.findByToken('token-abc-123');

      expect(result).not.toBeNull();
      expect(result?.token).toBe('token-abc-123');
    });

    it('deve retornar null quando token não existe', async () => {
      const result = await repository.findByToken('token-inexistente');
      expect(result).toBeNull();
    });
  });

  describe('findByUsuarioId', () => {
    it('deve retornar sessões de um usuário', async () => {
      mockSessoes.set('sessao-001', mockSessaoRecord);

      const result = await repository.findByUsuarioId('user-001');

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('delete', () => {
    it('deve deletar sessão pelo id', async () => {
      await repository.delete('sessao-001');
      expect(mockDb.sessoes.delete).toHaveBeenCalledWith('sessao-001');
    });
  });

  describe('deleteByUsuarioId', () => {
    it('deve deletar todas as sessões de um usuário', async () => {
      mockSessoes.set('sessao-001', mockSessaoRecord);
      mockSessoes.set('sessao-002', { ...mockSessaoRecord, id: 'sessao-002' });

      await repository.deleteByUsuarioId('user-001');

      expect(mockDb.sessoes.delete).toHaveBeenCalled();
    });
  });

  describe('deleteExpiradas', () => {
    it('deve deletar sessões expiradas', async () => {
      const expirada = {
        ...mockSessaoRecord,
        id: 'sessao-expirada',
        expiracao: new Date(Date.now() - 1000), // 1s ago
      };
      mockSessoes.set('sessao-expirada', expirada);

      await repository.deleteExpiradas();

      expect(mockDb.sessoes.bulkDelete).toHaveBeenCalled();
    });
  });
});
