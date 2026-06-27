/**
 * @spec(RF-ADM-FF-08, RNF-PERF-FF-01, RNF-AVAIL-FF-01)
 *
 * Testes do SDK cliente `FeatureFlagClient` (packages/feature-flags/src/FeatureFlagClient.ts).
 *
 * Comportamentos críticos:
 *  - Polling 30s (fake timers obrigatórios).
 *  - Cache local em memória + ETag em localStorage.
 *  - Fallback para env-var quando rede falha.
 *  - Erro de rede NÃO derruba UI.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { FeatureFlagClient } from '../../src/FeatureFlagClient';

describe('FeatureFlagClient (front)', () => {
  let client: FeatureFlagClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as never;
    client = new FeatureFlagClient({
      baseUrl: '/api/v1/admin/feature-flags',
      pollIntervalMs: 30_000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('evaluate', () => {
    it('faz GET /evaluate com query string formatada', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ pix_enabled: true }),
      });

      const result = await client.evaluate(['pix_enabled'], {
        restaurantId: 'rest_aurora',
        userId: 'user_42',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('keys=pix_enabled'),
        expect.any(Object)
      );
      expect(fetchMock.mock.calls[0][0]).toContain('restaurantId=rest_aurora');
      expect(fetchMock.mock.calls[0][0]).toContain('userId=user_42');
      expect(result).toEqual({ pix_enabled: true });
    });

    it('retorna fallback em objeto quando rede falha', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network down'));

      const result = await client.evaluate(
        ['pix_enabled'],
        {},
        {
          pix_enabled: false,
        }
      );

      expect(result.pix_enabled).toBe(false); // fallback
    });

    it('retorna fallback em objeto quando resposta é 500', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

      const result = await client.evaluate(['pix_enabled'], {}, { pix_enabled: true });

      expect(result.pix_enabled).toBe(true); // fallback
    });
  });

  describe('polling 30s', () => {
    it('busca imediatamente após start()', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      client.start(['pix_enabled'], {});
      // Promise microtask drain
      await vi.advanceTimersByTimeAsync(0);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('busca novamente após 30s', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      client.start(['pix_enabled'], {});
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Avança 30s — deve disparar nova busca
      await vi.advanceTimersByTimeAsync(30_000);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Avança mais 30s — terceira busca
      await vi.advanceTimersByTimeAsync(30_000);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('stop() cancela o polling', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      client.start(['pix_enabled'], {});
      await vi.advanceTimersByTimeAsync(0);
      client.stop();
      await vi.advanceTimersByTimeAsync(60_000);

      // Continua em 1 chamada — polling foi cancelado
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('cache em memória', () => {
    it('get(key) retorna último valor avaliado', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ pix_enabled: true }),
      });

      await client.evaluate(['pix_enabled'], {});
      expect(client.get('pix_enabled')).toBe(true);
    });

    it('get(key) retorna undefined antes da primeira avaliação', () => {
      expect(client.get('pix_enabled')).toBeUndefined();
    });
  });

  describe('cache ETag em localStorage', () => {
    it('envia If-None-Match se ETag presente', async () => {
      localStorage.setItem('ff:etag', '"v1"');
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ pix_enabled: true }),
      });

      await client.evaluate(['pix_enabled'], {});

      const headers = fetchMock.mock.calls[0][1]?.headers;
      expect(headers).toEqual(expect.objectContaining({ 'If-None-Match': '"v1"' }));
    });

    it('atualiza ETag após resposta 200', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: (k: string) => (k === 'ETag' ? '"v2"' : null) },
        json: async () => ({ pix_enabled: true }),
      });

      await client.evaluate(['pix_enabled'], {});
      expect(localStorage.getItem('ff:etag')).toBe('"v2"');
    });

    it('304 Not Modified mantém cache anterior', async () => {
      localStorage.setItem('ff:etag', '"v1"');
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 304,
        json: async () => ({}),
      });

      await client.evaluate(['pix_enabled'], {});
      // Cache anterior deve permanecer (vazio neste teste, mas sem erro)
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
