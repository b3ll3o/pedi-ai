import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after setting up mock
import { login, logout, getSession, requestPasswordReset } from '@/lib/auth/client';

describe('lib/auth/client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('deve retornar sucesso quando credenciais são válidas', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await login('test@example.com', 'password123');

      expect(result).toEqual({});
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });
    });

    it('deve retornar erro quando credenciais são inválidas', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Credenciais inválidas' }),
      });

      const result = await login('test@example.com', 'wrongpassword');

      expect(result).toEqual({ error: 'Credenciais inválidas' });
    });

    it('deve retornar erro quando fetch lança erro', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await login('test@example.com', 'password123');

      // O código retorna 'Erro ao fazer login' para erros
      expect(result.error).toBeTruthy();
    });
  });

  describe('logout', () => {
    it('deve chamar API de logout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      await logout();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
      });
    });

    it('não deve lançar erro quando fetch falha', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(logout()).resolves.not.toThrow();
    });
  });

  describe('getSession', () => {
    it('deve retornar sessão quando API retorna sucesso', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com', role: 'admin' },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSession),
      });

      const result = await getSession();

      expect(result).toEqual(mockSession);
      // Verifica que fetch foi chamado com a URL correta e um signal de AbortController
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/auth/session');
      expect(options).toHaveProperty('signal');
    });

    it('deve retornar null quando API retorna erro', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await getSession();

      expect(result).toBeNull();
    });

    it('deve retornar null quando fetch falha', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getSession();

      expect(result).toBeNull();
    });
  });

  describe('requestPasswordReset', () => {
    it('deve retornar sucesso quando email é válido', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await requestPasswordReset('test@example.com');

      expect(result).toEqual({});
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });
    });

    it('deve retornar erro quando API retorna erro', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Email não encontrado' }),
      });

      const result = await requestPasswordReset('nonexistent@example.com');

      expect(result).toEqual({ error: 'Email não encontrado' });
    });

    it('deve retornar erro quando fetch lança erro', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await requestPasswordReset('test@example.com');

      // O código captura o erro e retorna erro genérico
      expect(result.error).toBeTruthy();
    });
  });
});
