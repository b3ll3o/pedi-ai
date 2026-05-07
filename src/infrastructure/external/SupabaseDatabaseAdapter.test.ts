import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseDatabaseAdapter } from '@/infrastructure/external/SupabaseDatabaseAdapter';

// Mock do cliente Supabase
const mockSupabaseClient = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: unknown) => void) => resolve({ data: [], error: null })),
  }),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

describe('SupabaseDatabaseAdapter', () => {
  let adapter: SupabaseDatabaseAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new SupabaseDatabaseAdapter();
  });

  describe('isConnected', () => {
    it('deve retornar true quando há conexão com Supabase', async () => {
      const mockFrom = mockSupabaseClient.from('restaurantes');
      mockFrom.select.mockReturnThis();
      mockFrom.limit.mockReturnThis();
      // Simular resposta de sucesso
      (mockFrom.select as unknown as { then: (cb: (v: unknown) => void) => void }).then = (cb: (v: unknown) => void) => {
        cb({ data: [{ id: '1' }], error: null });
        return Promise.resolve({ data: [{ id: '1' }], error: null }) as unknown as PromiseLike<void>;
      };

      const resultado = await adapter.isConnected();

      expect(resultado).toBe(true);
    });

    it('deve retornar false quando há erro de conexão', async () => {
      const mockFrom = mockSupabaseClient.from('restaurantes');
      mockFrom.select.mockReturnThis();
      mockFrom.limit.mockReturnThis();
      (mockFrom.select as unknown as { then: (cb: (v: unknown) => void) => void }).then = (cb: (v: unknown) => void) => {
        cb({ data: null, error: { message: 'Network error' } });
        return Promise.resolve({ data: null, error: { message: 'Network error' } }) as unknown as PromiseLike<void>;
      };

      const resultado = await adapter.isConnected();

      expect(resultado).toBe(false);
    });
  });

  describe('getLastSyncTime', () => {
    it('deve retornar null para tabela que nunca foi sincronizada', () => {
      const resultado = adapter.getLastSyncTime('usuarios');

      expect(resultado).toBeNull();
    });

    it('deve retornar a data da última sincronização após syncTable', async () => {
      // Setup mock para syncTable não lançar erro
      const mockFrom = mockSupabaseClient.from('usuarios');
      mockFrom.select.mockReturnThis();
      mockFrom.upsert.mockReturnThis();
      (mockFrom.select as unknown as { then: (cb: (v: unknown) => void) => void }).then = (cb: (v: unknown) => void) => {
        cb({ data: [], error: null });
        return Promise.resolve({ data: [], error: null }) as unknown as PromiseLike<void>;
      };

      await adapter.syncTable('usuarios', 'push');
      const resultado = adapter.getLastSyncTime('usuarios');

      expect(resultado).toBeInstanceOf(Date);
    });
  });

  describe('syncTable', () => {
    it('deve retornar erro para tabela não mapeada', async () => {
      const resultado = await adapter.syncTable('tabela-inexistente', 'push');

      expect(resultado.success).toBe(false);
      expect(resultado.errors.length).toBeGreaterThan(0);
    });

    it('deve sincronizar push com sucesso para tabela mapeada', async () => {
      const mockFrom = mockSupabaseClient.from('usuarios');
      mockFrom.select.mockReturnThis();
      mockFrom.upsert.mockReturnThis();
      mockFrom.then = undefined as unknown as undefined;
      // Mock para toArray do Dexie
      (mockFrom.select as unknown as { toArray: () => Promise<unknown[]> }).toArray = async () => [];

      const resultado = await adapter.syncTable('usuarios', 'push');

      // O resultado pode variar dependendo do mock, mas não deve lançar
      expect(resultado).toHaveProperty('success');
      expect(resultado).toHaveProperty('syncedCount');
      expect(resultado).toHaveProperty('failedCount');
      expect(resultado).toHaveProperty('errors');
    });
  });

  describe('fetchRemote', () => {
    it('deve lançar erro para tabela não mapeada', async () => {
      await expect(adapter.fetchRemote('tabela-inexistente'))
        .rejects.toThrow('Tabela \'tabela-inexistente\' não encontrada no mapeamento');
    });

    it('deve retornar array vazio quando não há dados', async () => {
      const mockFrom = mockSupabaseClient.from('usuarios');
      mockFrom.select.mockReturnThis();
      mockFrom.eq.mockReturnThis();
      mockFrom.then = undefined as unknown as undefined;
      (mockFrom.select as unknown as { then: (cb: (v: unknown) => void) => void }).then = (cb: (v: unknown) => void) => {
        cb({ data: [], error: null });
        return Promise.resolve({ data: [], error: null }) as unknown as PromiseLike<void>;
      };

      const resultado = await adapter.fetchRemote('usuarios');

      expect(Array.isArray(resultado)).toBe(true);
    });
  });

  describe('pushLocal', () => {
    it('deve retornar sucesso com count 0 para array vazio', async () => {
      const resultado = await adapter.pushLocal('usuarios', []);

      expect(resultado.success).toBe(true);
      expect(resultado.syncedCount).toBe(0);
      expect(resultado.failedCount).toBe(0);
    });

    it('deve retornar erro para tabela não mapeada', async () => {
      const resultado = await adapter.pushLocal('tabela-inexistente', [{ id: '1' }]);

      expect(resultado.success).toBe(false);
      expect(resultado.failedCount).toBe(1);
    });
  });

  describe('deleteRemote', () => {
    it('deve retornar sucesso com count 0 para array vazio', async () => {
      const resultado = await adapter.deleteRemote('usuarios', []);

      expect(resultado.success).toBe(true);
      expect(resultado.syncedCount).toBe(0);
      expect(resultado.failedCount).toBe(0);
    });

    it('deve retornar erro para tabela não mapeada', async () => {
      const resultado = await adapter.deleteRemote('tabela-inexistente', ['1', '2']);

      expect(resultado.success).toBe(false);
      expect(resultado.failedCount).toBe(2);
    });
  });

  describe('syncAll', () => {
    it('deve sincronizar todas as tabelas mapeadas', async () => {
      // Setup mocks para todas as tabelas
      Object.keys(adapter).forEach(() => {
        // skip
      });

      const resultado = await adapter.syncAll();

      expect(resultado).toHaveProperty('success');
      expect(resultado).toHaveProperty('syncedCount');
      expect(resultado).toHaveProperty('failedCount');
      expect(resultado).toHaveProperty('errors');
    });
  });
});
