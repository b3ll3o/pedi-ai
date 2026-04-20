import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database module
vi.mock('@/lib/offline/db', () => {
  const mockTables = new Map<string, ReturnType<typeof createMockTable>>();

  function createMockTable<T extends { id?: number | string }>() {
    const items = new Map<number | string, T>();
    let nextId = 1;

    return {
      add: vi.fn(async (item: T) => {
        const id = item.id || `mod-${nextId++}`;
        const newItem = { ...item, id } as T & { id: string };
        items.set(id, newItem);
        return id;
      }),
      put: vi.fn(async (item: T) => {
        const id = item.id || `mod-${nextId++}`;
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
            Array.from(items.values()).find((item: any) => item.modifier_group_id === val)
          ),
        })),
      })),
      each: vi.fn(async (fn: (item: T) => void) => {
        items.forEach(fn);
      }),
      _getItems: () => items,
    };
  }

  const modifier_groups = createMockTable();
  const modifier_values = createMockTable();

  mockTables.set('modifier_groups', modifier_groups);
  mockTables.set('modifier_values', modifier_values);

  return {
    db: {
      modifier_groups,
      modifier_values,
      _reset: () => {
        modifier_groups.clear();
        modifier_values.clear();
      },
    },
  };
});

// Import after mock
import { db } from '@/lib/offline/db';
const dbAny = db as any;
import type { modifier_groups, modifier_values } from '@/lib/supabase/types';

// Modifier Group service interface
interface ModifierGroupService {
  createModifierGroup: (group: Omit<modifier_groups, 'id' | 'created_at'>) => Promise<{ id: string }>;
  getModifierGroupById: (id: string) => Promise<modifier_groups | undefined>;
  getModifierGroupsByRestaurant: (restaurantId: string) => Promise<modifier_groups[]>;
  updateModifierGroup: (id: string, updates: Partial<modifier_groups>) => Promise<modifier_groups>;
  softDeleteModifierGroup: (id: string) => Promise<void>;
}

// Modifier Value service interface
interface ModifierValueService {
  createModifierValue: (value: Omit<modifier_values, 'id' | 'created_at'>) => Promise<{ id: string }>;
  getModifierValueById: (id: string) => Promise<modifier_values | undefined>;
  getModifierValuesByGroup: (groupId: string) => Promise<modifier_values[]>;
  getAvailableModifierValuesByGroup: (groupId: string) => Promise<modifier_values[]>;
  updateModifierValue: (id: string, updates: Partial<modifier_values>) => Promise<modifier_values>;
  softDeleteModifierValue: (id: string) => Promise<void>;
}

// Simulated modifier group service for testing
const modifierGroupService: ModifierGroupService = {
  async createModifierGroup(group) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newGroup = {
      ...group,
      id,
      created_at: now,
    } as modifier_groups;
    await dbAny.modifier_groups.add(newGroup as any);
    return { id };
  },

  async getModifierGroupById(id) {
    return (await dbAny.modifier_groups.get(id)) as modifier_groups | undefined;
  },

  async getModifierGroupsByRestaurant(restaurantId) {
    const all = await dbAny.modifier_groups.toArray();
    return all.filter((g: any) => (g as any).restaurant_id === restaurantId) as modifier_groups[];
  },

  async updateModifierGroup(id, updates) {
    const existing = await dbAny.modifier_groups.get(id) as modifier_groups | undefined;
    if (!existing) throw new Error('Modifier group not found');
    const updated = {
      ...existing,
      ...updates,
    };
    await dbAny.modifier_groups.put(updated as any);
    return updated;
  },

  async softDeleteModifierGroup(id) {
    const existing = await dbAny.modifier_groups.get(id) as modifier_groups | undefined;
    if (!existing) throw new Error('Modifier group not found');
    await dbAny.modifier_groups.put({
      ...existing,
      required: false,
    } as any);
  },
};

// Simulated modifier value service for testing
const modifierValueService: ModifierValueService = {
  async createModifierValue(value) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newValue = {
      ...value,
      id,
      created_at: now,
    } as modifier_values;
    await dbAny.modifier_values.add(newValue as any);
    return { id };
  },

  async getModifierValueById(id) {
    return (await dbAny.modifier_values.get(id)) as modifier_values | undefined;
  },

  async getModifierValuesByGroup(groupId) {
    const all = await dbAny.modifier_values.toArray();
    return all.filter((v: any) => (v as any).modifier_group_id === groupId) as modifier_values[];
  },

  async getAvailableModifierValuesByGroup(groupId) {
    const all = await dbAny.modifier_values.toArray();
    return all.filter((v: any) => (v as any).modifier_group_id === groupId && v.available === true) as modifier_values[];
  },

  async updateModifierValue(id, updates) {
    const existing = await dbAny.modifier_values.get(id) as modifier_values | undefined;
    if (!existing) throw new Error('Modifier value not found');
    const updated = {
      ...existing,
      ...updates,
    };
    await dbAny.modifier_values.put(updated as any);
    return updated;
  },

  async softDeleteModifierValue(id) {
    const existing = await dbAny.modifier_values.get(id) as modifier_values | undefined;
    if (!existing) throw new Error('Modifier value not found');
    await dbAny.modifier_values.put({
      ...existing,
      available: false,
    } as any);
  },
};

describe('modifierGroupService', () => {
  beforeEach(() => {
    dbAny._reset();
  });

  describe('createModifierGroup', () => {
    it('creates a new modifier group with required fields', async () => {
      const groupData = {
        restaurant_id: 'rest-123',
        name: 'Tamanho',
        required: true,
        min_selections: 1,
        max_selections: 1,
      };

      const result = await modifierGroupService.createModifierGroup(groupData);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');

      const retrieved = await modifierGroupService.getModifierGroupById(result.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Tamanho');
      expect(retrieved?.restaurant_id).toBe('rest-123');
      expect(retrieved?.required).toBe(true);
      expect(retrieved?.min_selections).toBe(1);
      expect(retrieved?.max_selections).toBe(1);
    });

    it('creates modifier group with optional fields undefined', async () => {
      const groupData = {
        restaurant_id: 'rest-123',
        name: 'Extras',
        required: false,
        min_selections: 0,
        max_selections: 5,
      };

      const result = await modifierGroupService.createModifierGroup(groupData);
      const retrieved = await modifierGroupService.getModifierGroupById(result.id);

      expect(retrieved?.required).toBe(false);
      expect(retrieved?.min_selections).toBe(0);
      expect(retrieved?.max_selections).toBe(5);
    });

    it('generates unique ids for multiple groups', async () => {
      const group1 = await modifierGroupService.createModifierGroup({
        restaurant_id: 'rest-123',
        name: 'Tamanho',
        required: true,
        min_selections: 1,
        max_selections: 1,
      });
      const group2 = await modifierGroupService.createModifierGroup({
        restaurant_id: 'rest-123',
        name: 'Adicionais',
        required: false,
        min_selections: 0,
        max_selections: 3,
      });

      expect(group1.id).not.toBe(group2.id);
    });

    it('sets created_at timestamp', async () => {
      const result = await modifierGroupService.createModifierGroup({
        restaurant_id: 'rest-123',
        name: 'Test Group',
        required: false,
        min_selections: 0,
        max_selections: 1,
      });

      const retrieved = await modifierGroupService.getModifierGroupById(result.id);
      expect(retrieved?.created_at).toBeDefined();
    });
  });

  describe('getModifierGroupById', () => {
    it('returns modifier group when it exists', async () => {
      const created = await modifierGroupService.createModifierGroup({
        restaurant_id: 'rest-123',
        name: 'Size',
        required: true,
        min_selections: 1,
        max_selections: 1,
      });

      const result = await modifierGroupService.getModifierGroupById(created.id);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Size');
    });

    it('returns undefined when modifier group does not exist', async () => {
      const result = await modifierGroupService.getModifierGroupById('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('getModifierGroupsByRestaurant', () => {
    it('returns all modifier groups for a restaurant', async () => {
      await modifierGroupService.createModifierGroup({
        restaurant_id: 'rest-123',
        name: 'Size',
        required: true,
        min_selections: 1,
        max_selections: 1,
      });
      await modifierGroupService.createModifierGroup({
        restaurant_id: 'rest-123',
        name: 'Extras',
        required: false,
        min_selections: 0,
        max_selections: 5,
      });
      await modifierGroupService.createModifierGroup({
        restaurant_id: 'rest-456',
        name: 'Other Restaurant Group',
        required: false,
        min_selections: 0,
        max_selections: 1,
      });

      const result = await modifierGroupService.getModifierGroupsByRestaurant('rest-123');

      expect(result).toHaveLength(2);
      expect(result.every(g => (g as any).restaurant_id === 'rest-123')).toBe(true);
    });

    it('returns empty array when no modifier groups exist for restaurant', async () => {
      const result = await modifierGroupService.getModifierGroupsByRestaurant('rest-nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('updateModifierGroup', () => {
    it('updates modifier group name', async () => {
      const created = await modifierGroupService.createModifierGroup({
        restaurant_id: 'rest-123',
        name: 'Old Name',
        required: true,
        min_selections: 1,
        max_selections: 1,
      });

      const updated = await modifierGroupService.updateModifierGroup(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
    });

    it('updates selection constraints', async () => {
      const created = await modifierGroupService.createModifierGroup({
        restaurant_id: 'rest-123',
        name: 'Toppings',
        required: false,
        min_selections: 0,
        max_selections: 3,
      });

      const updated = await modifierGroupService.updateModifierGroup(created.id, {
        min_selections: 1,
        max_selections: 5,
      });

      expect(updated.min_selections).toBe(1);
      expect(updated.max_selections).toBe(5);
    });

    it('updates required flag', async () => {
      const created = await modifierGroupService.createModifierGroup({
        restaurant_id: 'rest-123',
        name: 'Size',
        required: false,
        min_selections: 0,
        max_selections: 1,
      });

      const updated = await modifierGroupService.updateModifierGroup(created.id, { required: true });

      expect(updated.required).toBe(true);
    });

    it('preserves unchanged fields when updating', async () => {
      const created = await modifierGroupService.createModifierGroup({
        restaurant_id: 'rest-123',
        name: 'Original',
        required: true,
        min_selections: 1,
        max_selections: 1,
      });

      const updated = await modifierGroupService.updateModifierGroup(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.required).toBe(true);
      expect(updated.restaurant_id).toBe('rest-123');
    });

    it('throws error when modifier group does not exist', async () => {
      await expect(
        modifierGroupService.updateModifierGroup('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow('Modifier group not found');
    });
  });

  describe('softDeleteModifierGroup', () => {
    it('sets required to false without removing from database', async () => {
      const created = await modifierGroupService.createModifierGroup({
        restaurant_id: 'rest-123',
        name: 'Group to Delete',
        required: true,
        min_selections: 1,
        max_selections: 1,
      });

      await modifierGroupService.softDeleteModifierGroup(created.id);

      const retrieved = await modifierGroupService.getModifierGroupById(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.required).toBe(false);
      expect(retrieved?.name).toBe('Group to Delete');
    });

    it('throws error when modifier group does not exist', async () => {
      await expect(
        modifierGroupService.softDeleteModifierGroup('non-existent-id')
      ).rejects.toThrow('Modifier group not found');
    });

    it('soft deleted modifier group still exists in database', async () => {
      const created = await modifierGroupService.createModifierGroup({
        restaurant_id: 'rest-123',
        name: 'Soft Deleted Group',
        required: true,
        min_selections: 1,
        max_selections: 1,
      });

      await modifierGroupService.softDeleteModifierGroup(created.id);

      const all = await dbAny.modifier_groups.toArray();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(created.id);
    });
  });
});

describe('modifierValueService', () => {
  beforeEach(() => {
    dbAny._reset();
  });

  describe('createModifierValue', () => {
    it('creates a new modifier value with required fields', async () => {
      const valueData = {
        modifier_group_id: 'group-123',
        name: 'Grande',
        price_adjustment: 3.00,
        available: true,
      };

      const result = await modifierValueService.createModifierValue(valueData);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');

      const retrieved = await modifierValueService.getModifierValueById(result.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Grande');
      expect(retrieved?.modifier_group_id).toBe('group-123');
      expect(retrieved?.price_adjustment).toBe(3.00);
      expect(retrieved?.available).toBe(true);
    });

    it('creates modifier value with zero price adjustment', async () => {
      const valueData = {
        modifier_group_id: 'group-123',
        name: 'Pequeno',
        price_adjustment: 0,
        available: true,
      };

      const result = await modifierValueService.createModifierValue(valueData);
      const retrieved = await modifierValueService.getModifierValueById(result.id);

      expect(retrieved?.price_adjustment).toBe(0);
    });

    it('creates modifier value with negative price adjustment', async () => {
      const valueData = {
        modifier_group_id: 'group-123',
        name: 'Sem adicional',
        price_adjustment: -2.00,
        available: true,
      };

      const result = await modifierValueService.createModifierValue(valueData);
      const retrieved = await modifierValueService.getModifierValueById(result.id);

      expect(retrieved?.price_adjustment).toBe(-2.00);
    });

    it('generates unique ids for multiple values', async () => {
      const val1 = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Small',
        price_adjustment: 0,
        available: true,
      });
      const val2 = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Large',
        price_adjustment: 5,
        available: true,
      });

      expect(val1.id).not.toBe(val2.id);
    });

    it('sets created_at timestamp', async () => {
      const result = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Test Value',
        price_adjustment: 0,
        available: true,
      });

      const retrieved = await modifierValueService.getModifierValueById(result.id);
      expect(retrieved?.created_at).toBeDefined();
    });
  });

  describe('getModifierValueById', () => {
    it('returns modifier value when it exists', async () => {
      const created = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Medium',
        price_adjustment: 2.00,
        available: true,
      });

      const result = await modifierValueService.getModifierValueById(created.id);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Medium');
      expect(result?.price_adjustment).toBe(2.00);
    });

    it('returns undefined when modifier value does not exist', async () => {
      const result = await modifierValueService.getModifierValueById('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('getModifierValuesByGroup', () => {
    it('returns all modifier values for a group', async () => {
      await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Small',
        price_adjustment: 0,
        available: true,
      });
      await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Medium',
        price_adjustment: 2.00,
        available: true,
      });
      await modifierValueService.createModifierValue({
        modifier_group_id: 'group-456',
        name: 'Other Group Value',
        price_adjustment: 1.00,
        available: true,
      });

      const result = await modifierValueService.getModifierValuesByGroup('group-123');

      expect(result).toHaveLength(2);
      expect(result.every(v => (v as any).modifier_group_id === 'group-123')).toBe(true);
    });

    it('returns empty array when no modifier values exist for group', async () => {
      const result = await modifierValueService.getModifierValuesByGroup('group-nonexistent');

      expect(result).toEqual([]);
    });

    it('returns both available and unavailable values', async () => {
      await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Available Value',
        price_adjustment: 1.00,
        available: true,
      });
      await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Unavailable Value',
        price_adjustment: 2.00,
        available: false,
      });

      const result = await modifierValueService.getModifierValuesByGroup('group-123');

      expect(result).toHaveLength(2);
    });
  });

  describe('getAvailableModifierValuesByGroup', () => {
    it('returns only available modifier values', async () => {
      await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Available Value',
        price_adjustment: 1.00,
        available: true,
      });
      await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Unavailable Value',
        price_adjustment: 2.00,
        available: false,
      });

      const result = await modifierValueService.getAvailableModifierValuesByGroup('group-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Available Value');
      expect(result[0].available).toBe(true);
    });

    it('returns empty array when all values are unavailable', async () => {
      await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Unavailable Value',
        price_adjustment: 1.00,
        available: false,
      });

      const result = await modifierValueService.getAvailableModifierValuesByGroup('group-123');

      expect(result).toEqual([]);
    });
  });

  describe('updateModifierValue', () => {
    it('updates modifier value name', async () => {
      const created = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Old Name',
        price_adjustment: 1.00,
        available: true,
      });

      const updated = await modifierValueService.updateModifierValue(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
    });

    it('updates price adjustment', async () => {
      const created = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Value',
        price_adjustment: 1.00,
        available: true,
      });

      const updated = await modifierValueService.updateModifierValue(created.id, { price_adjustment: 5.50 });

      expect(updated.price_adjustment).toBe(5.50);
    });

    it('updates multiple fields at once', async () => {
      const created = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Original',
        price_adjustment: 1.00,
        available: true,
      });

      const updated = await modifierValueService.updateModifierValue(created.id, {
        name: 'Updated',
        price_adjustment: 7.00,
        available: false,
      });

      expect(updated.name).toBe('Updated');
      expect(updated.price_adjustment).toBe(7.00);
      expect(updated.available).toBe(false);
    });

    it('preserves unchanged fields when updating', async () => {
      const created = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Original',
        price_adjustment: 3.00,
        available: true,
      });

      const updated = await modifierValueService.updateModifierValue(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.price_adjustment).toBe(3.00);
      expect(updated.modifier_group_id).toBe('group-123');
    });

    it('throws error when modifier value does not exist', async () => {
      await expect(
        modifierValueService.updateModifierValue('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow('Modifier value not found');
    });

    it('updates available status', async () => {
      const created = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Value',
        price_adjustment: 1.00,
        available: true,
      });

      const updated = await modifierValueService.updateModifierValue(created.id, { available: false });

      expect(updated.available).toBe(false);
    });
  });

  describe('softDeleteModifierValue', () => {
    it('sets available to false without removing from database', async () => {
      const created = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Value to Delete',
        price_adjustment: 1.00,
        available: true,
      });

      await modifierValueService.softDeleteModifierValue(created.id);

      const retrieved = await modifierValueService.getModifierValueById(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.available).toBe(false);
      expect(retrieved?.name).toBe('Value to Delete');
    });

    it('throws error when modifier value does not exist', async () => {
      await expect(
        modifierValueService.softDeleteModifierValue('non-existent-id')
      ).rejects.toThrow('Modifier value not found');
    });

    it('soft deleted modifier value still exists in database', async () => {
      const created = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Soft Deleted Value',
        price_adjustment: 1.00,
        available: true,
      });

      await modifierValueService.softDeleteModifierValue(created.id);

      const all = await dbAny.modifier_values.toArray();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(created.id);
    });

    it('soft deleted modifier value is excluded from available queries', async () => {
      const activeVal = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Active Value',
        price_adjustment: 1.00,
        available: true,
      });
      const softDeletedVal = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Will be Deleted',
        price_adjustment: 2.00,
        available: true,
      });

      await modifierValueService.softDeleteModifierValue(softDeletedVal.id);

      const available = await modifierValueService.getAvailableModifierValuesByGroup('group-123');

      expect(available).toHaveLength(1);
      expect(available[0].id).toBe(activeVal.id);
    });

    it('soft deleted modifier value still returned by getModifierValuesByGroup', async () => {
      const softDeletedVal = await modifierValueService.createModifierValue({
        modifier_group_id: 'group-123',
        name: 'Soft Deleted Value',
        price_adjustment: 1.00,
        available: true,
      });

      await modifierValueService.softDeleteModifierValue(softDeletedVal.id);

      const all = await modifierValueService.getModifierValuesByGroup('group-123');

      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(softDeletedVal.id);
    });
  });
});
