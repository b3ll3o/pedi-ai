import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCachedMenu,
  setCachedMenu,
  invalidateMenuCache,
  isCacheStale,
  compressMenuData,
  decompressMenuData,
} from '../../../lib/offline/cache';
import { db } from '../../../lib/offline/db';

describe('cache', () => {
  const restaurantId = 'rest-123';
  const sampleMenu = {
    restaurantId,
    categories: [{ id: 'c1', name: 'Bebidas' }],
    products: [{ id: 'p1', name: 'Coca', price: 5 }],
    modifiers: [],
    timestamp: Date.now(),
  };

  beforeEach(async () => {
    await db.menu_cache.clear();
  });

  describe('setCachedMenu / getCachedMenu', () => {
    it('stores and retrieves menu data by restaurant', async () => {
      await setCachedMenu(sampleMenu);
      const cached = await getCachedMenu(restaurantId);
      expect(cached).not.toBeNull();
      expect(cached?.categories).toEqual(sampleMenu.categories);
      expect(cached?.products).toEqual(sampleMenu.products);
      expect(cached?.restaurantId).toBe(restaurantId);
    });

    it('returns null when cache is empty', async () => {
      const cached = await getCachedMenu(restaurantId);
      expect(cached).toBeNull();
    });

    it('returns null when cache is older than 24h', async () => {
      const oldMenu = { ...sampleMenu, timestamp: Date.now() - 25 * 60 * 60 * 1000 };
      await setCachedMenu(oldMenu);
      const cached = await getCachedMenu(restaurantId);
      expect(cached).toBeNull();
    });

    it('isolates cache by restaurantId', async () => {
      await setCachedMenu(sampleMenu);
      const cached = await getCachedMenu('other-restaurant');
      expect(cached).toBeNull();
    });
  });

  describe('invalidateMenuCache', () => {
    it('clears cache for specific restaurant', async () => {
      await setCachedMenu(sampleMenu);
      await invalidateMenuCache(restaurantId);
      const cached = await getCachedMenu(restaurantId);
      expect(cached).toBeNull();
    });

    it('clears all cache when no restaurantId provided', async () => {
      await setCachedMenu(sampleMenu);
      await invalidateMenuCache();
      const cached = await getCachedMenu(restaurantId);
      expect(cached).toBeNull();
    });
  });

  describe('isCacheStale', () => {
    it('returns true when cache is empty', async () => {
      const stale = await isCacheStale(restaurantId);
      expect(stale).toBe(true);
    });

    it('returns true when cache is older than maxAge', async () => {
      const oldMenu = { ...sampleMenu, timestamp: Date.now() - 2 * 60 * 60 * 1000 };
      await setCachedMenu(oldMenu);
      const stale = await isCacheStale(restaurantId, 60 * 60 * 1000); // 1 hour
      expect(stale).toBe(true);
    });

    it('returns false when cache is fresh', async () => {
      await setCachedMenu(sampleMenu);
      const stale = await isCacheStale(restaurantId, 24 * 60 * 60 * 1000);
      expect(stale).toBe(false);
    });
  });

  describe('compressMenuData / decompressMenuData', () => {
    it('roundtrips menu data correctly', () => {
      const compressed = compressMenuData(sampleMenu);
      const decompressed = decompressMenuData(compressed);
      expect(decompressed).toEqual(sampleMenu);
    });

    it('produces non-empty compressed string', () => {
      const compressed = compressMenuData(sampleMenu);
      expect(typeof compressed).toBe('string');
      expect(compressed.length).toBeGreaterThan(0);
    });
  });
});