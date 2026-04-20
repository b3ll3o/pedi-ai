import { db } from './db';
import type { MenuCache } from './types';

const MENU_CACHE_KEY = 'menu_cache';
const MENU_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedMenu {
  categories: unknown[];
  products: unknown[];
  modifiers: unknown[];
  timestamp: number;
}

export async function getCachedMenu(): Promise<CachedMenu | null> {
  const cached = await db.menu_cache.toArray();
  if (!cached.length) return null;

  const entry = cached[0] as MenuCache;
  const age = Date.now() - entry.timestamp.getTime();

  if (age > MENU_CACHE_TTL_MS) {
    await db.menu_cache.clear();
    return null;
  }

  return {
    categories: entry.categories,
    products: entry.products,
    modifiers: entry.modifiers,
    timestamp: entry.timestamp.getTime(),
  };
}

export async function setCachedMenu(menu: CachedMenu): Promise<void> {
  await db.menu_cache.clear();
  const entry: MenuCache = {
    categories: menu.categories,
    products: menu.products,
    modifiers: menu.modifiers,
    timestamp: new Date(menu.timestamp),
  };
  await db.menu_cache.add(entry);
}

export async function invalidateMenuCache(): Promise<void> {
  await db.menu_cache.clear();
}

export async function isCacheStale(maxAgeMs = MENU_CACHE_TTL_MS): Promise<boolean> {
  const cached = await db.menu_cache.toArray();
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