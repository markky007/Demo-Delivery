import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { step } from 'allure-js-commons';
import { useCartStore } from '../../src/stores/cartStore';
import { setCaseMeta } from './allureMeta';

const saved = new Map<string, string>();
const storage = {
  getItem: (key: string) => saved.get(key) ?? null,
  setItem: (key: string, value: string) => {
    saved.set(key, value);
  },
  removeItem: (key: string) => {
    saved.delete(key);
  },
  clear: () => saved.clear(),
};

describe('customer cart', () => {
  beforeEach(() => {
    saved.clear();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    setActivePinia(createPinia());
  });

  it('TC-CART-001 calculates totals and isolates sessions', async () => {
    await setCaseMeta('TC-CART-001', 'Cart', 'Session-scoped cart', 'critical');
    const cart = useCartStore();
    await step('Add a priced option and update quantity', async () => {
      cart.initForSession('session-a');
      cart.addItem('menu-1', 'ข้าว', 100, null, 2, '', [
        {
          option_id: 'o',
          option_group_id: 'g',
          name: 'ไข่',
          group_name: 'เพิ่ม',
          price_adjustment: 20,
        },
      ]);
      expect(cart.totalAmount).toBe(240);
      cart.updateItemQuantity(cart.items[0]!.cart_item_id, 3);
      expect(cart.totalAmount).toBe(360);
    });
    await step('Open a different table session', async () => {
      cart.initForSession('session-b');
      expect(cart.isEmpty).toBe(true);
      cart.initForSession('session-a');
      expect(cart.totalAmount).toBe(360);
    });
    cart.clearCart();
    expect(cart.isEmpty).toBe(true);
  });

  it('TC-CART-002 removes nonpositive quantity and tolerates damaged storage', async () => {
    await setCaseMeta('TC-CART-002', 'Cart', 'Boundary and storage failure', 'normal');
    const cart = useCartStore();
    saved.set('qr_food_cart_session-a', '{broken');
    await step('Load damaged cart and remove an item', async () => {
      cart.initForSession('session-a');
      expect(cart.items).toEqual([]);
      cart.addItem('menu-1', 'ข้าว', 100, null, 1, '', []);
      cart.updateItemQuantity(cart.items[0]!.cart_item_id, 0);
    });
    expect(cart.totalAmount).toBe(0);
  });
});
