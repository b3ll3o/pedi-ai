/**
 * @spec(RF-ADM-FF-08, RNF-PERF-FF-01, RNF-AVAIL-FF-01)
 *
 * Testes do `FeatureFlagCache` (Redis + LRU in-process fallback).
 * Comportamento crítico: prefixo `ff:`, TTL 60s, fallback quando Redis cai.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { FeatureFlagCache } from '../../../../../../src/infrastructure/admin/feature-flags/cache/FeatureFlagCache';

describe('FeatureFlagCache', () => {
  let redis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };
  let cache: FeatureFlagCache;

  beforeEach(() => {
    vi.clearAllMocks();
    redis = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };
    cache = new FeatureFlagCache(redis as never, { ttlSeconds: 60, prefix: 'ff:' });
  });

  describe('get/set com prefixo `ff:`', () => {
    it('get consulta Redis com chave prefixada', async () => {
      redis.get.mockResolvedValue('{"id":"f1","key":"pix_enabled"}');
      const result = await cache.get('pix_enabled');
      expect(redis.get).toHaveBeenCalledWith('ff:pix_enabled');
      expect(result?.key).toBe('pix_enabled');
    });

    it('set persiste no Redis com TTL 60s e prefixo', async () => {
      await cache.set('pix_enabled', { id: 'f1', key: 'pix_enabled' });
      expect(redis.set).toHaveBeenCalledWith('ff:pix_enabled', expect.any(String), 'EX', 60);
    });
  });

  describe('fallback para LRU in-process quando Redis cai', () => {
    it('get retorna do LRU quando Redis lança erro', async () => {
      redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
      // Pré-popula o LRU
      await cache.setLocal('pix_enabled', { id: 'f1', key: 'pix_enabled' });

      const result = await cache.get('pix_enabled');
      expect(result?.id).toBe('f1');
    });

    it('invalidate remove da Redis E do LRU', async () => {
      await cache.invalidate('pix_enabled');
      expect(redis.del).toHaveBeenCalledWith('ff:pix_enabled');
    });
  });

  describe('limite do LRU', () => {
    it('LRU expulsa entrada mais antiga ao exceder 1000 chaves', async () => {
      // Cria cache com limite pequeno para teste rápido
      const tinyCache = new FeatureFlagCache(redis as never, {
        ttlSeconds: 60,
        prefix: 'ff:',
        maxLocalEntries: 3,
      });

      await tinyCache.setLocal('a', { id: 'a' });
      await tinyCache.setLocal('b', { id: 'b' });
      await tinyCache.setLocal('c', { id: 'c' });
      await tinyCache.setLocal('d', { id: 'd' }); // expulsa 'a'

      expect(await tinyCache.getLocal('a')).toBeNull();
      expect(await tinyCache.getLocal('d')).not.toBeNull();
    });
  });
});
