/**
 * Cobertura: cliente HTTP com gestão de tokens via cookies HttpOnly.
 *
 * No novo modelo, os tokens vivem em cookies HttpOnly no servidor — o
 * cliente só mantém o perfil do usuário em memória. Estes testes cobrem:
 *  - login/register invocam API com `credentials: 'include'`
 *  - fetch anexa `credentials: 'include'` em toda chamada
 *  - 401 dispara refresh uma vez
 *  - logout limpa estado local e chama API
 *  - getMe/verifySession consultam /auth/me e populam o usuário
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';

describe('apiClient (lib/api-client)', () => {
  beforeEach(() => {
    apiClient.clearUser();
    // Reseta o mock global de fetch no início para evitar vazamento entre testes.
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('user state', () => {
    it('clearUser zera usuário em memória', () => {
      apiClient.setUser({ id: 'u', email: 'a', name: 'A', role: 'dono' });
      apiClient.clearUser();
      expect(apiClient.getUser()).toBeNull();
    });

    it('setUser/getUser persistem em memória (não em sessionStorage)', () => {
      apiClient.setUser({ id: 'u1', email: 'a@b.c', name: 'Test', role: 'dono' });
      expect(apiClient.getUser()).toMatchObject({ id: 'u1' });
      // Garantia: sessionStorage não é mais usado para tokens/usuário.
      expect(sessionStorage.getItem('access_token')).toBeNull();
      expect(sessionStorage.getItem('user')).toBeNull();
    });
  });

  describe('login / register / logout', () => {
    it('login envia credentials include e popula usuário', async () => {
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
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
      expect(result.access_token).toBe('a');
      expect(apiClient.getUser()).toMatchObject({ id: 'u' });
    });

    it('login lança erro quando API retorna erro', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'credenciais inválidas' }),
      }) as unknown as typeof fetch;

      await expect(apiClient.login('a@b.c', 'errada')).rejects.toThrow('credenciais inválidas');
    });

    it('register envia credentials include e popula usuário', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'a2',
            refresh_token: 'r2',
            user: { id: 'u2', email: 'a@b.c', name: 'A', role: 'dono' },
          }),
      }) as unknown as typeof fetch;
      global.fetch = fetchMock;

      const result = await apiClient.register('a@b.c', 'Senha@123', 'A');

      const callInit = fetchMock.mock.calls[0][1] as RequestInit;
      expect(callInit.credentials).toBe('include');
      expect(result.access_token).toBe('a2');
      expect(apiClient.getUser()).toMatchObject({ id: 'u2' });
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

    it('logout chama endpoint e limpa usuário mesmo se API falhar', async () => {
      apiClient.setUser({ id: 'u', email: 'a', name: 'A', role: 'dono' });
      global.fetch = vi.fn().mockRejectedValue(new Error('fail')) as unknown as typeof fetch;

      await apiClient.logout();

      expect(apiClient.getUser()).toBeNull();
    });

    it('logout com sucesso chama /auth/logout', async () => {
      apiClient.setUser({ id: 'u', email: 'a', name: 'A', role: 'dono' });
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = fetchMock as unknown as typeof fetch;

      await apiClient.logout();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({ credentials: 'include' })
      );
      expect(apiClient.getUser()).toBeNull();
    });
  });

  describe('fetch com credentials include', () => {
    it('anexa credentials: include em toda requisição', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 1 }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      await apiClient.get('/test');

      const callInit = fetchMock.mock.calls[0][1] as RequestInit;
      expect(callInit.credentials).toBe('include');
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
      // Sequência:
      // 1) GET /test → 401
      // 2) POST /auth/refresh (com cookie) → 200
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
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'refreshed' }),
        });
      global.fetch = fetchMock as unknown as typeof fetch;

      const result = await apiClient.get('/test');

      expect(result).toEqual({ data: 'refreshed' });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('não retry se refresh falha', async () => {
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

  describe('verifySession / getMe', () => {
    it('verifySession popula usuário quando /auth/me responde ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'u-me', email: 'a@b.c', name: 'A', role: 'dono' }),
      }) as unknown as typeof fetch;

      const user = await apiClient.verifySession();
      expect(user).toMatchObject({ id: 'u-me' });
      expect(apiClient.getUser()).toMatchObject({ id: 'u-me' });
    });

    it('verifySession retorna null e limpa user quando API falha', async () => {
      apiClient.setUser({ id: 'stale', email: 'a', name: 'A', role: 'dono' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      }) as unknown as typeof fetch;

      const user = await apiClient.verifySession();
      expect(user).toBeNull();
      expect(apiClient.getUser()).toBeNull();
    });

    it('verifySession retorna null em erro de rede', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;
      const user = await apiClient.verifySession();
      expect(user).toBeNull();
    });
  });
});
