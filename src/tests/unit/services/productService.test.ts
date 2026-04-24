import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database module
vi.mock('@/lib/offline/db', () => {
  const mockTables = new Map<string, ReturnType<typeof createMockTable>>();

  function createMockTable<T extends { id?: number | string }>() {
    const items = new Map<number | string, T>();
    let nextId = 1;

    return {
      add: vi.fn(async (item: T) => {
        const id = item.id || `prod-${nextId++}`;
        const newItem = { ...item, id } as T & { id: string };
        items.set(id, newItem);
        return id;
      }),
      put: vi.fn(async (item: T) => {
        const id = item.id || `prod-${nextId++}`;
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Array.from(items.values()).find((item: any) => item.category_id === val)
          ),
        })),
      })),
      each: vi.fn(async (fn: (item: T) => void) => {
        items.forEach(fn);
      }),
      _getItems: () => items,
    };
  }

  const products = createMockTable();

  mockTables.set('products', products);

  return {
    db: {
      products,
      _reset: () => {
        products.clear();
      },
    },
  };
});

// Import after mock
import { db } from '@/lib/offline/db';
import type { products } from '@/lib/supabase/types';

// Product service interface
interface ProductService {
  createProduct: (product: Omit<products, 'id' | 'created_at' | 'updated_at'>) => Promise<{ id: string }>;
  getProductById: (id: string) => Promise<products | undefined>;
  getProductsByCategory: (categoryId: string) => Promise<products[]>;
  getAvailableProductsByCategory: (categoryId: string) => Promise<products[]>;
  updateProduct: (id: string, updates: Partial<products>) => Promise<products>;
  softDeleteProduct: (id: string) => Promise<void>;
}

// Simulated product service for testing
const productService: ProductService = {
  async createProduct(product) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newProduct = {
      ...product,
      id,
      created_at: now,
      updated_at: now,
    } as products;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).products.add(newProduct as any);
    return { id };
  },

  async getProductById(id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await (db as any).products.get(id)) as products | undefined;
  },

  async getProductsByCategory(categoryId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = await (db as any).products.toArray();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return all.filter((p: any) => p.category_id === categoryId) as products[];
  },

  async getAvailableProductsByCategory(categoryId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = await (db as any).products.toArray();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return all.filter((p: any) => p.category_id === categoryId && p.available === true) as products[];
  },

  async updateProduct(id, updates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (db as any).products.get(id) as products | undefined;
    if (!existing) throw new Error('Product not found');
    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).products.put(updated as any);
    return updated;
  },

  async softDeleteProduct(id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (db as any).products.get(id) as products | undefined;
    if (!existing) throw new Error('Product not found');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).products.put({
      ...existing,
      available: false,
      updated_at: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  },
};

describe('productService', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any)._reset();
  });

  describe('createProduct', () => {
    it('creates a new product with required fields', async () => {
      const productData = {
        category_id: 'cat-123',
        name: 'Coca-Cola',
        description: 'Refrigerante gelado',
        image_url: 'https://example.com/coca.jpg',
        price: 5.99,
        dietary_labels: null,
        available: true,
        sort_order: 1,
      };

      const result = await productService.createProduct(productData);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');

      const retrieved = await productService.getProductById(result.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Coca-Cola');
      expect(retrieved?.category_id).toBe('cat-123');
      expect(retrieved?.price).toBe(5.99);
      expect(retrieved?.available).toBe(true);
      expect(retrieved?.sort_order).toBe(1);
    });

    it('creates product with dietary_labels array', async () => {
      const productData = {
        category_id: 'cat-123',
        name: 'Salada Caesar',
        description: 'Salada fresca',
        price: 12.99,
        dietary_labels: ['vegetarian', 'gluten-free'],
        available: true,
        sort_order: 2,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await productService.createProduct(productData as any);
      const retrieved = await productService.getProductById(result.id);

      expect(retrieved?.dietary_labels).toEqual(['vegetarian', 'gluten-free']);
    });

    it('generates unique ids for multiple products', async () => {
      const prod1 = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Product 1',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      const prod2 = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Product 2',
        price: 20,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      expect(prod1.id).not.toBe(prod2.id);
    });

    it('sets created_at and updated_at timestamps', async () => {
      const result = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Test Product',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const retrieved = await productService.getProductById(result.id);
      expect(retrieved?.created_at).toBeDefined();
      expect(retrieved?.updated_at).toBeDefined();
    });
  });

  describe('getProductById', () => {
    it('returns product when it exists', async () => {
      const created = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Test Product',
        price: 15.99,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await productService.getProductById(created.id);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Test Product');
      expect(result?.price).toBe(15.99);
    });

    it('returns undefined when product does not exist', async () => {
      const result = await productService.getProductById('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('getProductsByCategory', () => {
    it('returns all products for a category', async () => {
      await productService.createProduct({
        category_id: 'cat-123',
        name: 'Product A',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      await productService.createProduct({
        category_id: 'cat-123',
        name: 'Product B',
        price: 20,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      await productService.createProduct({
        category_id: 'cat-456',
        name: 'Product C',
        price: 30,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await productService.getProductsByCategory('cat-123');

      expect(result).toHaveLength(2);
      expect(result.every(p => p.category_id === 'cat-123')).toBe(true);
    });

    it('returns empty array when no products exist for category', async () => {
      const result = await productService.getProductsByCategory('cat-nonexistent');

      expect(result).toEqual([]);
    });

    it('returns both available and unavailable products', async () => {
      await productService.createProduct({
        category_id: 'cat-123',
        name: 'Available Product',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      await productService.createProduct({
        category_id: 'cat-123',
        name: 'Unavailable Product',
        price: 20,
        available: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await productService.getProductsByCategory('cat-123');

      expect(result).toHaveLength(2);
    });
  });

  describe('getAvailableProductsByCategory', () => {
    it('returns only available products', async () => {
      await productService.createProduct({
        category_id: 'cat-123',
        name: 'Available Product',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      await productService.createProduct({
        category_id: 'cat-123',
        name: 'Unavailable Product',
        price: 20,
        available: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await productService.getAvailableProductsByCategory('cat-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Available Product');
      expect(result[0].available).toBe(true);
    });

    it('returns empty array when all products are unavailable', async () => {
      await productService.createProduct({
        category_id: 'cat-123',
        name: 'Unavailable Product',
        price: 10,
        available: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await productService.getAvailableProductsByCategory('cat-123');

      expect(result).toEqual([]);
    });
  });

  describe('updateProduct', () => {
    it('updates product name', async () => {
      const created = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Old Name',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const updated = await productService.updateProduct(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.updated_at).toBeDefined();
    });

    it('updates product price', async () => {
      const created = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Product',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const updated = await productService.updateProduct(created.id, { price: 15.99 });

      expect(updated.price).toBe(15.99);
    });

    it('updates multiple fields at once', async () => {
      const created = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Original',
        price: 10,
        available: true,
        sort_order: 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const updated = await productService.updateProduct(created.id, {
        name: 'Updated',
        price: 25,
        description: 'New description',
        sort_order: 5,
      });

      expect(updated.name).toBe('Updated');
      expect(updated.price).toBe(25);
      expect(updated.description).toBe('New description');
      expect(updated.sort_order).toBe(5);
    });

    it('preserves unchanged fields when updating', async () => {
      const created = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Product',
        description: 'Original description',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const updated = await productService.updateProduct(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.description).toBe('Original description');
      expect(updated.category_id).toBe('cat-123');
      expect(updated.price).toBe(10);
    });

    it('throws error when product does not exist', async () => {
      await expect(
        productService.updateProduct('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow('Product not found');
    });

    it('updates available status', async () => {
      const created = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Product',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const updated = await productService.updateProduct(created.id, { available: false });

      expect(updated.available).toBe(false);
    });
  });

  describe('softDeleteProduct', () => {
    it('sets available to false without removing from database', async () => {
      const created = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Product to Delete',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await productService.softDeleteProduct(created.id);

      const retrieved = await productService.getProductById(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.available).toBe(false);
      expect(retrieved?.name).toBe('Product to Delete');
    });

    it('throws error when product does not exist', async () => {
      await expect(
        productService.softDeleteProduct('non-existent-id')
      ).rejects.toThrow('Product not found');
    });

    it('soft deleted product still exists in database', async () => {
      const created = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Soft Deleted Product',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await productService.softDeleteProduct(created.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all = await (db as any).products.toArray();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(created.id);
    });

    it('soft deleted product is excluded from available queries', async () => {
      const activeProd = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Active Product',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      const softDeletedProd = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Will be Deleted',
        price: 20,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await productService.softDeleteProduct(softDeletedProd.id);

      const available = await productService.getAvailableProductsByCategory('cat-123');

      expect(available).toHaveLength(1);
      expect(available[0].id).toBe(activeProd.id);
    });

    it('soft deleted product still returned by getProductsByCategory', async () => {
      const softDeletedProd = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Soft Deleted Product',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await productService.softDeleteProduct(softDeletedProd.id);

      const all = await productService.getProductsByCategory('cat-123');

      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(softDeletedProd.id);
    });

    it('updates the updated_at timestamp when soft deleting', async () => {
      const created = await productService.createProduct({
        category_id: 'cat-123',
        name: 'Product',
        price: 10,
        available: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const beforeDelete = (await productService.getProductById(created.id))?.updated_at;

      // Wait a tiny bit to ensure timestamp differs
      await new Promise(resolve => setTimeout(resolve, 10));

      await productService.softDeleteProduct(created.id);

      const afterDelete = (await productService.getProductById(created.id))?.updated_at;

      expect(afterDelete).toBeDefined();
      expect(afterDelete).not.toBe(beforeDelete);
    });
  });
});
