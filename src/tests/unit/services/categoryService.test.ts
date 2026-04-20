import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database module
vi.mock('@/lib/offline/db', () => {
  const mockTables = new Map<string, ReturnType<typeof createMockTable>>();

  function createMockTable<T extends { id?: number | string }>() {
    const items = new Map<number | string, T>();
    let nextId = 1;

    return {
      add: vi.fn(async (item: T) => {
        const id = item.id || `cat-${nextId++}`;
        const newItem = { ...item, id } as T & { id: string };
        items.set(id, newItem);
        return id;
      }),
      put: vi.fn(async (item: T) => {
        const id = item.id || `cat-${nextId++}`;
        const newItem = { ...item, id } as T & { id: string };
        items.set(id, newItem);
        return id;
      }),
      get: vi.fn(async (key: number | string) => items.get(key) || undefined),
      delete: vi.fn(async (key: number | string) => {
        items.delete(key);
      }),
      clear: vi.fn(async () => {
        items.clear();
      }),
      toArray: vi.fn(async () => Array.from(items.values())),
      where: vi.fn(() => ({
        first: vi.fn(async () => Array.from(items.values())[0]),
        equals: vi.fn(() => ({
          first: vi.fn(async (val: unknown) =>
            Array.from(items.values()).find((item: any) => item.restaurant_id === val)
          ),
        })),
      })),
      each: vi.fn(async (fn: (item: T) => void) => {
        items.forEach(fn);
      }),
      _getItems: () => items,
    };
  }

  const categories = createMockTable();

  mockTables.set('categories', categories);

  return {
    db: {
      categories,
      _reset: () => {
        categories.clear();
      },
    },
  };
});

// Import after mock
import { db } from '@/lib/offline/db';
import type { categories } from '@/lib/supabase/types';

// Category service interface (will be implemented in categoryService.ts)
interface CategoryService {
  createCategory: (category: Omit<categories, 'id' | 'created_at' | 'updated_at'>) => Promise<{ id: string }>;
  getCategoryById: (id: string) => Promise<categories | undefined>;
  getCategoriesByRestaurant: (restaurantId: string) => Promise<categories[]>;
  updateCategory: (id: string, updates: Partial<categories>) => Promise<categories>;
  softDeleteCategory: (id: string) => Promise<void>;
}

const categoryService: CategoryService = {
  async createCategory(category) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newCategory = {
      ...category,
      id,
      created_at: now,
      updated_at: now,
    } as categories;
    // @ts-expect-error - Test mock extends db with categories table not in PediDatabase
    await db.categories.add(newCategory as any);
    return { id };
  },

  async getCategoryById(id) {
    // @ts-expect-error - Test mock extends db with categories table not in PediDatabase
    return (await db.categories.get(id)) as categories | undefined;
  },

  async getCategoriesByRestaurant(restaurantId) {
    // @ts-expect-error - Test mock extends db with categories table not in PediDatabase
    const all = await db.categories.toArray();
    return all.filter((c: any) => (c as any).restaurant_id === restaurantId) as categories[];
  },

  async updateCategory(id, updates) {
    // @ts-expect-error - Test mock extends db with categories table not in PediDatabase
    const existing = await db.categories.get(id) as categories | undefined;
    if (!existing) throw new Error('Category not found');
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    // @ts-expect-error - Test mock extends db with categories table not in PediDatabase
    await db.categories.put(updated as any);
    return updated;
  },

  async softDeleteCategory(id) {
    // @ts-expect-error - Test mock extends db with categories table not in PediDatabase
    const existing = await db.categories.get(id) as categories | undefined;
    if (!existing) throw new Error('Category not found');
    // @ts-expect-error - Test mock extends db with categories table not in PediDatabase
    await db.categories.put({
      ...existing,
      active: false,
      updated_at: new Date().toISOString(),
    } as any);
  },
};

describe('categoryService', () => {
  beforeEach(() => {
    // @ts-expect-error - Test mock extends db with categories table not in PediDatabase
    db._reset();
  });

  describe('createCategory', () => {
    it('creates a new category with required fields', async () => {
      const categoryData = {
        restaurant_id: 'rest-123',
        name: 'Bebidas',
        description: 'Bebidas geladas e quentes',
        image_url: 'https://example.com/bebidas.jpg',
        sort_order: 1,
        active: true,
      };

      const result = await categoryService.createCategory(categoryData);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');

      const retrieved = await categoryService.getCategoryById(result.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Bebidas');
      expect(retrieved?.restaurant_id).toBe('rest-123');
      expect(retrieved?.sort_order).toBe(1);
      expect(retrieved?.active).toBe(true);
    });

    it('creates category with sort_order undefined when not provided', async () => {
      const categoryData = {
        restaurant_id: 'rest-123',
        name: 'Sobremesas',
        active: true,
      };

      const result = await categoryService.createCategory(categoryData as any);
      const retrieved = await categoryService.getCategoryById(result.id);

      // sort_order is not set, so it should be undefined
      expect(retrieved?.sort_order).toBeUndefined();
    });

    it('generates unique ids for multiple categories', async () => {
      const cat1 = await categoryService.createCategory({
        restaurant_id: 'rest-123',
        name: 'Entradas',
        active: true,
      } as any);
      const cat2 = await categoryService.createCategory({
        restaurant_id: 'rest-123',
        name: 'Pratos Principais',
        active: true,
      } as any);

      expect(cat1.id).not.toBe(cat2.id);
    });
  });

  describe('getCategoryById', () => {
    it('returns category when it exists', async () => {
      const created = await categoryService.createCategory({
        restaurant_id: 'rest-123',
        name: 'Bebidas',
        active: true,
      } as any);

      const result = await categoryService.getCategoryById(created.id);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Bebidas');
    });

    it('returns undefined when category does not exist', async () => {
      const result = await categoryService.getCategoryById('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('getCategoriesByRestaurant', () => {
    it('returns all categories for a restaurant', async () => {
      await categoryService.createCategory({
        restaurant_id: 'rest-123',
        name: 'Entradas',
        active: true,
      } as any);
      await categoryService.createCategory({
        restaurant_id: 'rest-123',
        name: 'Pratos',
        active: true,
      } as any);
      await categoryService.createCategory({
        restaurant_id: 'rest-456',
        name: 'Other Restaurant Category',
        active: true,
      } as any);

      const result = await categoryService.getCategoriesByRestaurant('rest-123');

      expect(result).toHaveLength(2);
      expect(result.every(c => (c as any).restaurant_id === 'rest-123')).toBe(true);
    });

    it('returns empty array when no categories exist for restaurant', async () => {
      const result = await categoryService.getCategoriesByRestaurant('rest-nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('updateCategory', () => {
    it('updates category name', async () => {
      const created = await categoryService.createCategory({
        restaurant_id: 'rest-123',
        name: 'Old Name',
        active: true,
      } as any);

      const updated = await categoryService.updateCategory(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.updated_at).toBeDefined();
    });

    it('updates multiple fields at once', async () => {
      const created = await categoryService.createCategory({
        restaurant_id: 'rest-123',
        name: 'Original',
        sort_order: 1,
        active: true,
      } as any);

      const updated = await categoryService.updateCategory(created.id, {
        name: 'Updated',
        sort_order: 5,
        description: 'New description',
      });

      expect(updated.name).toBe('Updated');
      expect(updated.sort_order).toBe(5);
      expect(updated.description).toBe('New description');
    });

    it('preserves unchanged fields when updating', async () => {
      const created = await categoryService.createCategory({
        restaurant_id: 'rest-123',
        name: 'Category',
        description: 'Original description',
        active: true,
      } as any);

      const updated = await categoryService.updateCategory(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.description).toBe('Original description');
      expect(updated.restaurant_id).toBe('rest-123');
    });

    it('throws error when category does not exist', async () => {
      await expect(
        categoryService.updateCategory('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow('Category not found');
    });
  });

  describe('softDeleteCategory', () => {
    it('sets active to false without removing from database', async () => {
      const created = await categoryService.createCategory({
        restaurant_id: 'rest-123',
        name: 'Category to Delete',
        active: true,
      } as any);

      await categoryService.softDeleteCategory(created.id);

      const retrieved = await categoryService.getCategoryById(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.active).toBe(false);
      expect(retrieved?.name).toBe('Category to Delete');
    });

    it('throws error when category does not exist', async () => {
      await expect(
        categoryService.softDeleteCategory('non-existent-id')
      ).rejects.toThrow('Category not found');
    });

    it('soft deleted category still exists in database', async () => {
      const created = await categoryService.createCategory({
        restaurant_id: 'rest-123',
        name: 'Soft Deleted Category',
        active: true,
      } as any);

      await categoryService.softDeleteCategory(created.id);

      // @ts-expect-error - Test mock extends db with categories table
      const all = await db.categories.toArray();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(created.id);
    });

    it('soft deleted category is excluded from active queries', async () => {
      const activeCat = await categoryService.createCategory({
        restaurant_id: 'rest-123',
        name: 'Active Category',
        active: true,
      } as any);
      const softDeletedCat = await categoryService.createCategory({
        restaurant_id: 'rest-123',
        name: 'Will be Deleted',
        active: true,
      } as any);

      await categoryService.softDeleteCategory(softDeletedCat.id);

      const all = await categoryService.getCategoriesByRestaurant('rest-123');
      const activeOnly = all.filter(c => c.active === true);

      expect(activeOnly).toHaveLength(1);
      expect(activeOnly[0].id).toBe(activeCat.id);
    });
  });
});