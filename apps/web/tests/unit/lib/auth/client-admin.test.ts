import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after setting up mock
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/client-admin';
import type { AuthUser, Role } from '@/lib/auth/client-admin';

describe('lib/auth/client-admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('deve retornar AuthUser quando sessão válida', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: {
              id: 'user-123',
              email: 'owner@restaurante.com',
              role: 'dono',
              restaurant_id: 'rest-456',
            },
          }),
      });

      const user = await requireAuth();

      expect(user).toEqual({
        id: 'user-123',
        email: 'owner@restaurante.com',
        role: 'dono',
        restaurant_id: 'rest-456',
      });
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/session');
    });

    it('deve lançar erro quando sem sessão (user undefined)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: undefined }),
      });

      await expect(requireAuth()).rejects.toThrow('Não autenticado');
    });

    it('deve lançar erro quando API retorna erro', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Sessão expirada' }),
      });

      await expect(requireAuth()).rejects.toThrow('Sessão expirada');
    });

    it('deve lançar erro quando fetch falha', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(requireAuth()).rejects.toThrow('Network error');
    });

    it('deve fazer parse correto de response com erro genérico', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(requireAuth()).rejects.toThrow('HTTP 400');
    });
  });

  describe('requireRole', () => {
    const createUser = (role: Role): AuthUser => ({
      id: 'user-1',
      email: 'test@test.com',
      role,
      restaurant_id: 'rest-1',
    });

    it('deve permitir usuário com role autorizada (dono)', () => {
      const user = createUser('dono');
      expect(() => requireRole(user, ['dono', 'gerente'])).not.toThrow();
    });

    it('deve permitir usuário com role autorizada (gerente)', () => {
      const user = createUser('gerente');
      expect(() => requireRole(user, ['dono', 'gerente'])).not.toThrow();
    });

    it('deve permitir usuário com role autorizada (atendente)', () => {
      const user = createUser('atendente');
      expect(() => requireRole(user, ['atendente'])).not.toThrow();
    });

    it('deve lançar erro 403 para role não autorizada', () => {
      const user = createUser('atendente');
      expect(() => requireRole(user, ['dono', 'gerente'])).toThrow('Acesso negado');
    });

    it('deve definir status 403 no erro', () => {
      const user = createUser('atendente');
      try {
        requireRole(user, ['dono', 'gerente']);
        fail('Deveria ter lançado erro');
      } catch (e: any) {
        expect(e.status).toBe(403);
      }
    });

    it('deve funcionar com array de roles vazio (nenhum acesso)', () => {
      const user = createUser('dono');
      expect(() => requireRole(user, [])).toThrow('Acesso negado');
    });

    it('deve funcionar com múltiplas roles', () => {
      const userDono = createUser('dono');
      const userGerente = createUser('gerente');
      const userAtendente = createUser('atendente');

      expect(() => requireRole(userDono, ['dono', 'gerente', 'atendente'])).not.toThrow();
      expect(() => requireRole(userGerente, ['dono', 'gerente', 'atendente'])).not.toThrow();
      expect(() => requireRole(userAtendente, ['dono', 'gerente', 'atendente'])).not.toThrow();
    });
  });

  describe('getRestaurantId', () => {
    it('deve retornar restaurant_id do usuário', () => {
      const user: AuthUser = {
        id: 'user-1',
        email: 'test@test.com',
        role: 'dono',
        restaurant_id: 'rest-123',
      };
      expect(getRestaurantId(user)).toBe('rest-123');
    });

    it('deve retornar string vazia se restaurant_id vazio', () => {
      const user: AuthUser = {
        id: 'user-1',
        email: 'test@test.com',
        role: 'dono',
        restaurant_id: '',
      };
      expect(getRestaurantId(user)).toBe('');
    });
  });
});
