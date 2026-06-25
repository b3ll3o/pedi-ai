/**
 * Cobertura: cliente HTTP com gestão de tokens (login, refresh, logout).
 *
 * O apiClient é usado pelo useAuth e demais hooks que falam com a API.
 * Estes testes garantem a cobertura dos branches de:
 *  - setTokens/clearTokens com/sem user
 *  - restoreTokens com/sem tokens no sessionStorage
 *  - isAuthenticated, getAccessToken, getUser
 *  - fetch com token anexado
 *  - refresh 401 → retry
 *  - login/register/logout
 *  - getMe com sucesso e com erro
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';

describe('apiClient (lib/api-client)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    apiClient.clearTokens();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setTokens / clearTokens / restoreTokens', () => {
    it('setTokens armazena tokens e persiste no sessionStorage', () => {
      apiClient.setTokens('access-1', 'refresh-1', {
        id: 'u1',
        email: 'a@b.c',
        name: 'Test',
        role: 'dono',
      });

      expect(apiClient.getAccessToken()).toBe('access-1');
      expect(apiClient.getRefreshToken()).toBe('refresh-1');
      expect(apiClient.getUser()).toMatchObject({ id: 'u1' });
      expect(sessionStorage.getItem('access_token')).toBe('access-1');
      expect(sessionStorage.getItem('refresh_token')).toBe('refresh-1');
    });

    it('setTokens sem user não persiste campo user', () => {
      apiClient.setTokens('access-2', 'refresh-2');

      expect(apiClient.getUser()).toBeNull();
      expect(sessionStorage.getItem('user')).toBeNull();
    });

    it('clearTokens limpa estado interno e sessionStorage', () => {
      apiClient.setTokens('access-3', 'refresh-3', {
        id: 'u',
        email: 'a',
        name: 'a',
        role: 'dono',
      });
      apiClient.clearTokens();

      expect(apiClient.getAccessToken()).toBeNull();
      expect(apiClient.getUser()).toBeNull();
      expect(sessionStorage.getItem('access_token')).toBeNull();
      expect(sessionStorage.getItem('refresh_token')).toBeNull();
      expect(sessionStorage.getItem('user')).toBeNull();
    });

    it('restoreTokens retorna false se não há tokens no sessionStorage', () => {
      expect(apiClient.restoreTokens()).toBe(false);
    });

    it('restoreTokens restaura tokens e user', () => {
      sessionStorage.setItem('access_token', 'a-r');
      sessionStorage.setItem('refresh_token', 'r-r');
      sessionStorage.setItem(
        'user',
        JSON.stringify({ id: 'u2', email: 'a', name: 'a', role: 'dono' })
      );

      const result = apiClient.restoreTokens();

      expect(result).toBe(true);
      expect(apiClient.getAccessToken()).toBe('a-r');
      expect(apiClient.getRefreshToken()).toBe('r-r');
      expect(apiClient.getUser()).toMatchObject({ id: 'u2' });
    });

    it('restoreTokens ignora user corrompido e mantém tokens', () => {
      sessionStorage.setItem('access_token', 'a-x');
      sessionStorage.setItem('refresh_token', 'r-x');
      sessionStorage.setItem('user', '{ inválido');

      expect(apiClient.restoreTokens()).toBe(true);
      expect(apiClient.getUser()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('retorna false quando não há tokens', () => {
      expect(apiClient.isAuthenticated()).toBe(false);
    });

    it('retorna true após setTokens', () => {
      apiClient.setTokens('a', 'r');
      expect(apiClient.isAuthenticated()).toBe(true);
    });

    it('retorna false após clearTokens', () => {
      apiClient.setTokens('a', 'r');
      apiClient.clearTokens();
      expect(apiClient.isAuthenticated()).toBe(false);
    });
  });

  describe('login / register / logout', () => {
    it('login armazena tokens e retorna auth response', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'a',
            refresh_token: 'r',
            user: { id: 'u', email: 'a@b.c', name: 'A', role: 'dono' },
          }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const result = await apiClient.login('a@b.c', 'Senha@123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.access_token).toBe('a');
      expect(apiClient.getAccessToken()).toBe('a');
    });

    it('login lança erro quando API retorna erro', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'credenciais inválidas' }),
      }) as unknown as typeof fetch;

      await expect(apiClient.login('a@b.c', 'errada')).rejects.toThrow('credenciais inválidas');
    });

    it('register armazena tokens e retorna auth response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'a2',
            refresh_token: 'r2',
            user: { id: 'u2', email: 'a@b.c', name: 'A', role: 'dono' },
          }),
      }) as unknown as typeof fetch;

      const result = await apiClient.register('a@b.c', 'Senha@123', 'A');
      expect(result.access_token).toBe('a2');
      expect(apiClient.getAccessToken()).toBe('a2');
    });

    it('register lança erro genérico quando API não retorna mensagem', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      }) as unknown as typeof fetch;

      await expect(apiClient.register('a@b.c', 'Senha@123', 'A')).rejects.toThrow(
        'Erro ao criar conta'
      );
    });

    it('logout chama endpoint e limpa tokens', async () => {
      apiClient.setTokens('access-old', 'refresh-old');
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = fetchMock as unknown as typeof fetch;

      await apiClient.logout();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.any(Object)
      );
      expect(apiClient.getAccessToken()).toBeNull();
    });

    it('logout limpa tokens mesmo se API falhar', async () => {
      apiClient.setTokens('access-old', 'refresh-old');
      global.fetch = vi.fn().mockRejectedValue(new Error('fail')) as unknown as typeof fetch;

      await apiClient.logout();

      expect(apiClient.getAccessToken()).toBeNull();
    });
  });

  describe('fetch com token', () => {
    it('anexa header Authorization quando há token', async () => {
      apiClient.setTokens('my-token', 'my-refresh');
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 1 }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const result = await apiClient.get('/test');

      expect(result).toEqual({ data: 1 });
      const callInit = fetchMock.mock.calls[0][1] as RequestInit;
      expect((callInit.headers as Record<string, string>).Authorization).toBe('Bearer my-token');
    });

    it('lança erro com mensagem da API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'dados inválidos' }),
      }) as unknown as typeof fetch;

      await expect(apiClient.get('/test')).rejects.toThrow('dados inválidos');
    });

    it('fallback para mensagem genérica quando API não retorna JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('parse fail')),
      }) as unknown as typeof fetch;

      await expect(apiClient.get('/test')).rejects.toThrow('Erro na requisição');
    });

    it('faz POST com body serializado', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: 1 }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await apiClient.post('/test', { foo: 'bar' });

      const callInit = fetchMock.mock.calls[0][1] as RequestInit;
      expect(callInit.method).toBe('POST');
      expect(callInit.body).toBe('{"foo":"bar"}');
    });

    it('faz PATCH e DELETE', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await apiClient.patch('/test', { foo: 1 });
      await apiClient.delete('/test');

      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('PATCH');
      expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('DELETE');
    });

    it('aceita URL absoluta sem prepender API_URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await apiClient.get('https://example.com/foo');

      expect(fetchMock.mock.calls[0][0] as string).toBe('https://example.com/foo');
    });

    it('retry após 401 com refresh bem-sucedido', async () => {
      apiClient.setTokens('expired-access', 'good-refresh');

      // Sequência real:
      // 1) GET /test → 401
      // 2) POST /auth/refresh → 200 com novo access_token
      // 3) GET /test retry → 200
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ access_token: 'new-access' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'refreshed' }),
        });
      global.fetch = fetchMock as unknown as typeof fetch;

      const result = await apiClient.get('/test');

      expect(result).toEqual({ data: 'refreshed' });
      expect(fetchMock).toHaveBeenCalledTimes(3); // 401 + refresh + retry
    });

    it('não retry se refresh falha', async () => {
      apiClient.setTokens('expired-access', 'expired-refresh');

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
        });
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(apiClient.get('/test')).rejects.toThrow();
    });
  });

  describe('getMe', () => {
    it('retorna user quando API responde ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'u-me', email: 'a@b.c', name: 'A', role: 'dono' }),
      }) as unknown as typeof fetch;

      const user = await apiClient.getMe();
      expect(user).toMatchObject({ id: 'u-me' });
    });

    it('retorna null quando API falha', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;
      const user = await apiClient.getMe();
      expect(user).toBeNull();
    });

    it('retorna null quando resposta não é ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('parse')),
      }) as unknown as typeof fetch;

      const user = await apiClient.getMe();
      expect(user).toBeNull();
    });
  });
});
