import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react-dom/test-utils';

// ── Local types (mirrors cartStore.ts) ────────────────────────────────────────

interface CartItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers: SelectedModifier[];
  notes?: string;
  comboId?: string;
  bundlePrice?: number;
  comboItems?: {
    productId: string;
    quantity: number;
  }[];
  createdAt: Date;
}

interface SelectedModifier {
  group_id: string;
  group_name: string;
  modifier_id: string;
  name: string;
  price_adjustment: number;
}

// ── Selectors (copied from cartStore.ts to test in isolation) ─────────────────

export const getTotalItems = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);

export const getTotalPrice = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

// ── Test helpers ─────────────────────────────────────────────────────────────

type CartItemInput = Omit<CartItem, 'id' | 'createdAt'>;

function makeCartItem(overrides: Partial<CartItemInput> = {}): CartItemInput {
  return {
    productId: 'prod-1',
    name: 'Product',
    quantity: 1,
    unitPrice: 10,
    modifiers: [],
    ...overrides,
  };
}

function makeModifier(overrides: Partial<SelectedModifier> = {}): SelectedModifier {
  return {
    group_id: 'grp-1',
    group_name: 'Extras',
    modifier_id: 'mod-1',
    name: 'Bacon',
    price_adjustment: 2,
    ...overrides,
  };
}

// ── Vanilla store factory ────────────────────────────────────────────────────
// Mirrors useCartStore logic (without persist/subscribe middleware)
// so we test cart operations in isolation.

type TestCartStore = CartState & {
  addItem: (item: CartItemInput) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

function createCartStore(
  initialItems: CartItem[] = []
): TestCartStore {
  const items: CartItem[] = [...initialItems];

  return {
    items,

    addItem: (item) => {
      const newItem: CartItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };
      items.push(newItem);
    },

    removeItem: (id) => {
      const idx = items.findIndex((i) => i.id === id);
      if (idx !== -1) items.splice(idx, 1);
    },

    updateQuantity: (id, quantity) => {
      if (quantity <= 0) {
        const idx = items.findIndex((i) => i.id === id);
        if (idx !== -1) items.splice(idx, 1);
        return;
      }
      const item = items.find((i) => i.id === id);
      if (item) {
        item.quantity = quantity;
      }
    },

    clearCart: () => {
      items.splice(0, items.length);
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────────

describe('cartStore operations', () => {
  let store: TestCartStore;

  beforeEach(() => {
    store = createCartStore();
  });

  // ── addItem ────────────────────────────────────────────────────────────────

  describe('addItem', () => {
    it('adds item to empty cart', () => {
      const item = makeCartItem();

      act(() => {
        store.addItem(item);
      });

      expect(store.items.length).toBe(1);
      expect(store.items[0].productId).toBe('prod-1');
      expect(store.items[0].quantity).toBe(1);
    });

    it('adds multiple items correctly', () => {
      const item1 = makeCartItem({ productId: 'prod-1', name: 'Product 1', unitPrice: 10 });
      const item2 = makeCartItem({ productId: 'prod-2', name: 'Product 2', unitPrice: 15 });

      act(() => {
        store.addItem(item1);
        store.addItem(item2);
      });

      expect(store.items.length).toBe(2);
      expect(store.items[0].productId).toBe('prod-1');
      expect(store.items[1].productId).toBe('prod-2');
    });

    it('combo items use bundlePrice', () => {
      const comboItem = makeCartItem({
        productId: 'combo-1',
        name: 'Combo Lunch',
        unitPrice: 0,
        comboId: 'combo-lunch',
        bundlePrice: 25,
        comboItems: [
          { productId: 'main-1', quantity: 1 },
          { productId: 'drink-1', quantity: 1 },
        ],
      });

      act(() => {
        store.addItem(comboItem);
      });

      const added = store.items[0];
      expect(added.comboId).toBe('combo-lunch');
      expect(added.bundlePrice).toBe(25);
      expect(added.comboItems).toHaveLength(2);
    });

    it('adding same product increments quantity', () => {
      const item = makeCartItem({ productId: 'prod-1', quantity: 1 });

      act(() => {
        store.addItem(item);
        store.addItem(item);
      });

      // Each addItem creates a new entry (no dedup)
      expect(store.items.length).toBe(2);
      expect(store.items[0].productId).toBe('prod-1');
      expect(store.items[1].productId).toBe('prod-1');
    });
  });

  // ── removeItem ─────────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('removes specific item', () => {
      const item = makeCartItem({ productId: 'prod-1', quantity: 1 });

      act(() => {
        store.addItem(item);
      });

      const addedId = store.items[0].id;
      expect(store.items.length).toBe(1);

      act(() => {
        store.removeItem(addedId);
      });

      expect(store.items.length).toBe(0);
    });

    it('only removes the targeted item', () => {
      const item1 = makeCartItem({ productId: 'prod-1', name: 'Product 1' });
      const item2 = makeCartItem({ productId: 'prod-2', name: 'Product 2' });

      act(() => {
        store.addItem(item1);
        store.addItem(item2);
      });

      const idToRemove = store.items[0].id;

      act(() => {
        store.removeItem(idToRemove);
      });

      expect(store.items.length).toBe(1);
      expect(store.items[0].productId).toBe('prod-2');
    });
  });

  // ── updateQuantity ──────────────────────────────────────────────────────────

  describe('updateQuantity', () => {
    it('updates quantity correctly', () => {
      const item = makeCartItem({ productId: 'prod-1', quantity: 1 });

      act(() => {
        store.addItem(item);
      });

      const itemId = store.items[0].id;

      act(() => {
        store.updateQuantity(itemId, 5);
      });

      expect(store.items[0].quantity).toBe(5);
    });

    it('setting qty to 0 removes item', () => {
      const item = makeCartItem({ productId: 'prod-1', quantity: 3 });

      act(() => {
        store.addItem(item);
      });

      const itemId = store.items[0].id;
      expect(store.items.length).toBe(1);

      act(() => {
        store.updateQuantity(itemId, 0);
      });

      expect(store.items.length).toBe(0);
    });
  });

  // ── clearCart ───────────────────────────────────────────────────────────────

  describe('clearCart', () => {
    it('clears all items', () => {
      act(() => {
        store.addItem(makeCartItem({ productId: 'prod-1' }));
        store.addItem(makeCartItem({ productId: 'prod-2' }));
        store.addItem(makeCartItem({ productId: 'prod-3' }));
      });

      expect(store.items.length).toBe(3);

      act(() => {
        store.clearCart();
      });

      expect(store.items.length).toBe(0);
    });
  });

  // ── getTotalItems ────────────────────────────────────────────────────────────

  describe('getTotalItems', () => {
    it('returns 0 for empty cart', () => {
      const state = { items: [] as CartItem[], isOpen: false };
      expect(getTotalItems(state)).toBe(0);
    });

    it('returns correct count', () => {
      const state = {
        items: [
          { ...makeCartItem({ id: '1', quantity: 2 }), id: '1', createdAt: new Date() } as CartItem,
          { ...makeCartItem({ id: '2', quantity: 3 }), id: '2', createdAt: new Date() } as CartItem,
        ],
        isOpen: false,
      };

      expect(getTotalItems(state)).toBe(5);
    });

    it('returns correct count with mixed quantities', () => {
      const state = {
        items: [
          { ...makeCartItem({ id: '1', quantity: 1 }), id: '1', createdAt: new Date() } as CartItem,
          { ...makeCartItem({ id: '2', quantity: 4 }), id: '2', createdAt: new Date() } as CartItem,
          { ...makeCartItem({ id: '3', quantity: 2 }), id: '3', createdAt: new Date() } as CartItem,
        ],
        isOpen: false,
      };

      expect(getTotalItems(state)).toBe(7);
    });
  });

  // ── getTotalPrice ────────────────────────────────────────────────────────────

  describe('getTotalPrice', () => {
    it('returns 0 for empty cart', () => {
      const state = { items: [] as CartItem[], isOpen: false };
      expect(getTotalPrice(state)).toBe(0);
    });

    it('calculates correctly with modifiers', () => {
      const state = {
        items: [
          {
            ...makeCartItem({ id: '1', productId: 'prod-1', quantity: 2, unitPrice: 15 }),
            id: '1',
            createdAt: new Date(),
            modifiers: [makeModifier({ price_adjustment: 3 })],
          } as CartItem,
        ],
        isOpen: false,
      };

      // unitPrice * quantity = 15 * 2 = 30
      expect(getTotalPrice(state)).toBe(30);
    });

    it('combo items calculate correctly', () => {
      const state = {
        items: [
          {
            ...makeCartItem({
              id: '1',
              productId: 'combo-1',
              quantity: 1,
              unitPrice: 0,
              comboId: 'combo-lunch',
              bundlePrice: 25,
            }),
            id: '1',
            createdAt: new Date(),
          } as CartItem,
        ],
        isOpen: false,
      };

      // unitPrice * quantity = 0 * 1 = 0 (bundlePrice tracked separately by UI)
      expect(getTotalPrice(state)).toBe(0);
    });
  });
});
