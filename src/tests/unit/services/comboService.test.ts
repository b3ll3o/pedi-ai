import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database module
vi.mock('@/lib/offline/db', () => {
  function createMockTable<T extends { id?: number | string }>() {
    const items = new Map<number | string, T>();
    let nextId = 1;

    return {
      add: vi.fn(async (item: T) => {
        const id = item.id || `combo-${nextId++}`;
        const newItem = { ...item, id } as T & { id: string };
        items.set(id, newItem);
        return id;
      }),
      put: vi.fn(async (item: T) => {
        const id = item.id || `combo-${nextId++}`;
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
            Array.from(items.values()).find((item: any) => item.combo_id === val)
          ),
        })),
      })),
      each: vi.fn(async (fn: (item: T) => void) => {
        items.forEach(fn);
      }),
      _getItems: () => items,
    };
  }

  const combos = createMockTable();
  const combo_items = createMockTable();

  return {
    db: {
      combos,
      combo_items,
      _reset: () => {
        combos.clear();
        combo_items.clear();
      },
    },
  };
});

// Import after mock
import { db } from '@/lib/offline/db';
import type { combos, combo_items } from '@/lib/supabase/types';

// Combo service interface
interface ComboService {
  createCombo: (combo: Omit<combos, 'id' | 'created_at' | 'updated_at'>, items: Array<{ product_id: string; quantity: number }>) => Promise<{ id: string }>;
  getComboById: (id: string) => Promise<(combos & { combo_items?: combo_items[] }) | undefined>;
  getCombosByRestaurant: (restaurantId: string) => Promise<combos[]>;
  getAvailableCombosByRestaurant: (restaurantId: string) => Promise<combos[]>;
  updateCombo: (id: string, updates: Partial<combos>, comboItems?: Array<{ product_id: string; quantity: number }>) => Promise<combos>;
  deleteCombo: (id: string) => Promise<void>;
}

// Simulated combo service for testing
const comboService: ComboService = {
  async createCombo(combo, items) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newCombo = {
      ...combo,
      id,
      created_at: now,
      updated_at: now,
    } as combos;
    await db.combos.add(newCombo as any);

    // Create combo items
    for (const item of items) {
      const itemId = crypto.randomUUID();
      const newItem = {
        id: itemId,
        combo_id: id,
        product_id: item.product_id,
        quantity: item.quantity || 1,
        created_at: now,
      } as combo_items;
      await db.combo_items.add(newItem as any);
    }

    return { id };
  },

  async getComboById(id) {
    const combo = await db.combos.get(id) as combos | undefined;
    if (!combo) return undefined;

    // Manually filter combo_items by combo_id (avoiding mock where chain complexity)
    const allItems = await db.combo_items.toArray();
    const items = allItems.filter(item => (item as any).combo_id === id);
    return { ...combo, combo_items: items };
  },

  async getCombosByRestaurant(restaurantId) {
    const all = await db.combos.toArray();
    return all.filter(c => (c as any).restaurant_id === restaurantId) as combos[];
  },

  async getAvailableCombosByRestaurant(restaurantId) {
    const all = await db.combos.toArray();
    return all.filter(c => (c as any).restaurant_id === restaurantId && c.available === true) as combos[];
  },

  async updateCombo(id, updates, comboItems) {
    const existing = await db.combos.get(id) as combos | undefined;
    if (!existing) throw new Error('Combo not found');

    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await db.combos.put(updated as any);

    // Update combo items if provided
    if (comboItems !== undefined) {
      // Delete existing combo items
      const allItems = await db.combo_items.toArray();
      for (const item of allItems) {
        if ((item as any).combo_id === id) {
          await db.combo_items.delete((item as any).id);
        }
      }

      // Insert new combo items
      for (const item of comboItems) {
        const itemId = crypto.randomUUID();
        const newItem = {
          id: itemId,
          combo_id: id,
          product_id: item.product_id,
          quantity: item.quantity || 1,
          created_at: new Date().toISOString(),
        } as combo_items;
        await db.combo_items.add(newItem as any);
      }
    }

    return updated;
  },

  async deleteCombo(id) {
    const existing = await db.combos.get(id) as combos | undefined;
    if (!existing) throw new Error('Combo not found');

    // Delete combo items first
    const allItems = await db.combo_items.toArray();
    for (const item of allItems) {
      if ((item as any).combo_id === id) {
        await db.combo_items.delete((item as any).id);
      }
    }

    // Delete combo
    await db.combos.delete(id);
  },
};

describe('comboService', () => {
  beforeEach(() => {
    db._reset();
  });

  describe('createCombo', () => {
    it('creates a new combo with required fields', async () => {
      const comboData = {
        restaurant_id: 'rest-123',
        name: 'Comboexecutivo',
        description: 'Combo para almoço',
        bundle_price: 29.90,
        available: true,
      };
      const items = [
        { product_id: 'prod-1', quantity: 1 },
        { product_id: 'prod-2', quantity: 1 },
        { product_id: 'prod-3', quantity: 1 },
      ];

      const result = await comboService.createCombo(comboData, items);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');

      const retrieved = await comboService.getComboById(result.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Comboexecutivo');
      expect(retrieved?.restaurant_id).toBe('rest-123');
      expect(retrieved?.bundle_price).toBe(29.90);
      expect(retrieved?.available).toBe(true);
    });

    it('creates combo with null description', async () => {
      const comboData = {
        restaurant_id: 'rest-123',
        name: 'Combo Simples',
        description: null,
        bundle_price: 19.90,
        available: true,
      };
      const items = [{ product_id: 'prod-1', quantity: 1 }];

      const result = await comboService.createCombo(comboData, items);
      const retrieved = await comboService.getComboById(result.id);

      expect(retrieved?.description).toBeNull();
    });

    it('creates combo with null image_url', async () => {
      const comboData = {
        restaurant_id: 'rest-123',
        name: 'Combo imagem',
        bundle_price: 25.00,
        available: true,
      };
      const items = [{ product_id: 'prod-1', quantity: 1 }];

      const result = await comboService.createCombo(comboData, items);
      const retrieved = await comboService.getComboById(result.id);

      // image_url is not set, so it should be undefined (not explicitly null)
      expect((retrieved as any).image_url).toBeUndefined();
    });

    it('generates unique ids for multiple combos', async () => {
      const combo1 = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Combo 1', bundle_price: 10, available: true },
        [{ product_id: 'prod-1', quantity: 1 }]
      );
      const combo2 = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Combo 2', bundle_price: 20, available: true },
        [{ product_id: 'prod-2', quantity: 1 }]
      );

      expect(combo1.id).not.toBe(combo2.id);
    });

    it('sets created_at and updated_at timestamps', async () => {
      const result = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Test Combo', bundle_price: 15, available: true },
        [{ product_id: 'prod-1', quantity: 1 }]
      );

      const retrieved = await comboService.getComboById(result.id);
      expect(retrieved?.created_at).toBeDefined();
      expect(retrieved?.updated_at).toBeDefined();
    });

    it('creates combo with multiple items', async () => {
      const items = [
        { product_id: 'prod-main', quantity: 1 },
        { product_id: 'prod-side', quantity: 2 },
        { product_id: 'prod-drink', quantity: 1 },
      ];

      const result = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Full Combo', bundle_price: 35, available: true },
        items
      );

      const retrieved = await comboService.getComboById(result.id);
      expect(retrieved?.combo_items).toHaveLength(3);
    });

    it('defaults quantity to 1 when not specified', async () => {
      const items = [
        { product_id: 'prod-1' },
        { product_id: 'prod-2', quantity: 3 },
      ];

      const result = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Combo', bundle_price: 20, available: true },
        items
      );

      const retrieved = await comboService.getComboById(result.id);
      const comboItems = retrieved?.combo_items || [];
      const item1 = comboItems.find((i: any) => i.product_id === 'prod-1');
      const item2 = comboItems.find((i: any) => i.product_id === 'prod-2');

      expect(item1?.quantity).toBe(1);
      expect(item2?.quantity).toBe(3);
    });
  });

  describe('getComboById', () => {
    it('returns combo when it exists', async () => {
      const created = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Test Combo', bundle_price: 25, available: true },
        [{ product_id: 'prod-1', quantity: 1 }]
      );

      const result = await comboService.getComboById(created.id);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Test Combo');
      expect(result?.bundle_price).toBe(25);
    });

    it('returns undefined when combo does not exist', async () => {
      const result = await comboService.getComboById('non-existent-id');

      expect(result).toBeUndefined();
    });

    it('returns combo with its items', async () => {
      const items = [
        { product_id: 'prod-1', quantity: 1 },
        { product_id: 'prod-2', quantity: 2 },
      ];

      const created = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Combo com Items', bundle_price: 30, available: true },
        items
      );

      const result = await comboService.getComboById(created.id);

      expect(result?.combo_items).toBeDefined();
      expect(result?.combo_items).toHaveLength(2);
    });
  });

  describe('getCombosByRestaurant', () => {
    it('returns all combos for a restaurant', async () => {
      await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Combo A', bundle_price: 20, available: true },
        [{ product_id: 'prod-1', quantity: 1 }]
      );
      await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Combo B', bundle_price: 30, available: true },
        [{ product_id: 'prod-2', quantity: 1 }]
      );
      await comboService.createCombo(
        { restaurant_id: 'rest-456', name: 'Combo C', bundle_price: 40, available: true },
        [{ product_id: 'prod-3', quantity: 1 }]
      );

      const result = await comboService.getCombosByRestaurant('rest-123');

      expect(result).toHaveLength(2);
      expect(result.every(c => (c as any).restaurant_id === 'rest-123')).toBe(true);
    });

    it('returns empty array when no combos exist for restaurant', async () => {
      const result = await comboService.getCombosByRestaurant('rest-nonexistent');

      expect(result).toEqual([]);
    });

    it('returns both available and unavailable combos', async () => {
      await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Available Combo', bundle_price: 20, available: true },
        [{ product_id: 'prod-1', quantity: 1 }]
      );
      await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Unavailable Combo', bundle_price: 20, available: false },
        [{ product_id: 'prod-2', quantity: 1 }]
      );

      const result = await comboService.getCombosByRestaurant('rest-123');

      expect(result).toHaveLength(2);
    });
  });

  describe('getAvailableCombosByRestaurant', () => {
    it('returns only available combos', async () => {
      await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Available Combo', bundle_price: 20, available: true },
        [{ product_id: 'prod-1', quantity: 1 }]
      );
      await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Unavailable Combo', bundle_price: 20, available: false },
        [{ product_id: 'prod-2', quantity: 1 }]
      );

      const result = await comboService.getAvailableCombosByRestaurant('rest-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Available Combo');
      expect(result[0].available).toBe(true);
    });

    it('returns empty array when all combos are unavailable', async () => {
      await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Unavailable Combo', bundle_price: 20, available: false },
        [{ product_id: 'prod-1', quantity: 1 }]
      );

      const result = await comboService.getAvailableCombosByRestaurant('rest-123');

      expect(result).toEqual([]);
    });
  });

  describe('updateCombo', () => {
    it('updates combo name', async () => {
      const created = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Old Name', bundle_price: 20, available: true },
        [{ product_id: 'prod-1', quantity: 1 }]
      );

      const updated = await comboService.updateCombo(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.updated_at).toBeDefined();
    });

    it('updates combo bundle_price', async () => {
      const created = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Combo', bundle_price: 20, available: true },
        [{ product_id: 'prod-1', quantity: 1 }]
      );

      const updated = await comboService.updateCombo(created.id, { bundle_price: 35.90 });

      expect(updated.bundle_price).toBe(35.90);
    });

    it('updates combo description', async () => {
      const created = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Combo', bundle_price: 20, available: true, description: 'Old desc' },
        [{ product_id: 'prod-1', quantity: 1 }]
      );

      const updated = await comboService.updateCombo(created.id, { description: 'New description' });

      expect(updated.description).toBe('New description');
    });

    it('updates available status', async () => {
      const created = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Combo', bundle_price: 20, available: true },
        [{ product_id: 'prod-1', quantity: 1 }]
      );

      const updated = await comboService.updateCombo(created.id, { available: false });

      expect(updated.available).toBe(false);
    });

    it('updates multiple fields at once', async () => {
      const created = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Original', bundle_price: 20, available: true },
        [{ product_id: 'prod-1', quantity: 1 }]
      );

      const updated = await comboService.updateCombo(created.id, {
        name: 'Updated',
        bundle_price: 45,
        description: 'New description',
        available: false,
      });

      expect(updated.name).toBe('Updated');
      expect(updated.bundle_price).toBe(45);
      expect(updated.description).toBe('New description');
      expect(updated.available).toBe(false);
    });

    it('preserves unchanged fields when updating', async () => {
      const created = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Original', bundle_price: 20, available: true, description: 'Original desc' },
        [{ product_id: 'prod-1', quantity: 1 }]
      );

      const updated = await comboService.updateCombo(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.bundle_price).toBe(20);
      expect(updated.description).toBe('Original desc');
      expect(updated.restaurant_id).toBe('rest-123');
    });

    it('throws error when combo does not exist', async () => {
      await expect(
        comboService.updateCombo('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow('Combo not found');
    });

    it('replaces combo items when comboItems parameter is provided', async () => {
      const created = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Combo', bundle_price: 20, available: true },
        [{ product_id: 'prod-old-1', quantity: 1 }]
      );

      const updated = await comboService.updateCombo(
        created.id,
        {},
        [{ product_id: 'prod-new-1', quantity: 2 }, { product_id: 'prod-new-2', quantity: 1 }]
      );

      const retrieved = await comboService.getComboById(created.id);
      expect(retrieved?.combo_items).toHaveLength(2);
    });
  });

  describe('deleteCombo', () => {
    it('removes combo from database', async () => {
      const created = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Combo to Delete', bundle_price: 20, available: true },
        [{ product_id: 'prod-1', quantity: 1 }]
      );

      await comboService.deleteCombo(created.id);

      const retrieved = await comboService.getComboById(created.id);
      expect(retrieved).toBeUndefined();
    });

    it('throws error when combo does not exist', async () => {
      await expect(
        comboService.deleteCombo('non-existent-id')
      ).rejects.toThrow('Combo not found');
    });

    it('also deletes associated combo_items', async () => {
      const created = await comboService.createCombo(
        { restaurant_id: 'rest-123', name: 'Combo with Items', bundle_price: 20, available: true },
        [{ product_id: 'prod-1', quantity: 1 }, { product_id: 'prod-2', quantity: 2 }]
      );

      await comboService.deleteCombo(created.id);

      const allItems = await db.combo_items.toArray();
      const deletedComboItems = allItems.filter((item: any) => item.combo_id === created.id);
      expect(deletedComboItems).toHaveLength(0);
    });

    it('deleting non-existent combo throws error', async () => {
      await expect(
        comboService.deleteCombo('non-existent-id')
      ).rejects.toThrow('Combo not found');
    });
  });
});
