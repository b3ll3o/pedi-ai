import { db } from './db';
import type { MenuCache } from './types';

const MENU_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedMenu {
  restaurantId: string;
  categories: unknown[];
  products: unknown[];
  modifiers: unknown[];
  timestamp: number;
}

export async function getCachedMenu(restaurantId: string): Promise<CachedMenu | null> {
  const cached = await db.menu_cache.where('restaurantId').equals(restaurantId).toArray();

  if (!cached.length) return null;

  const entry = cached[0] as MenuCache;
  const age = Date.now() - entry.timestamp.getTime();

  if (age > MENU_CACHE_TTL_MS) {
    await db.menu_cache.delete(entry.id!);
    return null;
  }

  return {
    restaurantId: entry.restaurantId,
    categories: entry.categories,
    products: entry.products,
    modifiers: entry.modifiers,
    timestamp: entry.timestamp.getTime(),
  };
}

export async function setCachedMenu(menu: CachedMenu): Promise<void> {
  // Buscar entrada existente pelo restaurantId para usar a mesma chave
  const existing = await db.menu_cache.where('restaurantId').equals(menu.restaurantId).first();

  const entry: MenuCache = {
    id: existing?.id, // Manter o mesmo ID se existir (para fazer upsert)
    restaurantId: menu.restaurantId,
    categories: menu.categories,
    products: menu.products,
    modifiers: menu.modifiers,
    timestamp: new Date(menu.timestamp),
  };

  // put() faz insert-or-update, não dá erro de chave duplicada
  await db.menu_cache.put(entry);
}

export async function invalidateMenuCache(restaurantId?: string): Promise<void> {
  if (restaurantId) {
    const existing = await db.menu_cache.where('restaurantId').equals(restaurantId).toArray();
    for (const entry of existing) {
      if (entry.id !== undefined) {
        await db.menu_cache.delete(entry.id);
      }
    }
  } else {
    await db.menu_cache.clear();
  }
}

export async function isCacheStale(
  restaurantId: string,
  maxAgeMs = MENU_CACHE_TTL_MS
): Promise<boolean> {
  const cached = await db.menu_cache.where('restaurantId').equals(restaurantId).toArray();
  if (!cached.length) return true;
  const age = Date.now() - cached[0].timestamp.getTime();
  return age > maxAgeMs;
}

export function compressMenuData(menu: CachedMenu): string {
  return JSON.stringify(menu);
}

export function decompressMenuData(compressed: string): CachedMenu {
  return JSON.parse(compressed);
}
