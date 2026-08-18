/**
 * Pinia store for customer cart management.
 * Cart is scoped to a table session and persisted in localStorage.
 */
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { CartItem, CartItemOption } from 'src/types/cart';
import { CART_STORAGE_KEY } from 'src/utils/constants';

export const useCartStore = defineStore('cart', () => {
  // ─── State ───────────────────────────────────────────
  const items = ref<CartItem[]>([]);
  const tableSessionId = ref<string | null>(null);

  // ─── Getters ─────────────────────────────────────────
  const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));

  const totalAmount = computed(() => items.value.reduce((sum, item) => sum + item.subtotal, 0));

  const isEmpty = computed(() => items.value.length === 0);

  // ─── Actions ─────────────────────────────────────────

  function initForSession(sessionId: string) {
    tableSessionId.value = sessionId;
    loadFromStorage();
  }

  function addItem(
    menuItemId: string,
    name: string,
    basePrice: number,
    imageUrl: string | null,
    quantity: number,
    specialInstruction: string,
    selectedOptions: CartItemOption[],
  ) {
    const optionsTotal = selectedOptions.reduce((s, o) => s + o.price_adjustment, 0);
    const subtotal = (basePrice + optionsTotal) * quantity;

    const cartItem: CartItem = {
      cart_item_id: generateId(),
      menu_item_id: menuItemId,
      name,
      base_price: basePrice,
      image_url: imageUrl,
      quantity,
      special_instruction: specialInstruction,
      selected_options: selectedOptions,
      subtotal,
    };

    items.value.push(cartItem);
    saveToStorage();
  }

  function updateItemQuantity(cartItemId: string, quantity: number) {
    const item = items.value.find((i) => i.cart_item_id === cartItemId);
    if (!item) return;

    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }

    item.quantity = quantity;
    recalculateSubtotal(item);
    saveToStorage();
  }

  function updateItem(
    cartItemId: string,
    quantity: number,
    specialInstruction: string,
    selectedOptions: CartItemOption[],
  ) {
    const item = items.value.find((i) => i.cart_item_id === cartItemId);
    if (!item) return;

    item.quantity = quantity;
    item.special_instruction = specialInstruction;
    item.selected_options = selectedOptions;
    recalculateSubtotal(item);
    saveToStorage();
  }

  function removeItem(cartItemId: string) {
    items.value = items.value.filter((i) => i.cart_item_id !== cartItemId);
    saveToStorage();
  }

  function clearCart() {
    items.value = [];
    saveToStorage();
  }

  // ─── Internal ────────────────────────────────────────

  function recalculateSubtotal(item: CartItem) {
    const optionsTotal = item.selected_options.reduce((s, o) => s + o.price_adjustment, 0);
    item.subtotal = (item.base_price + optionsTotal) * item.quantity;
  }

  function generateId(): string {
    // Use crypto.randomUUID if available, fallback to timestamp-based
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  function storageKey(): string {
    return `${CART_STORAGE_KEY}_${tableSessionId.value ?? 'unknown'}`;
  }

  function saveToStorage() {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(items.value));
    } catch {
      // localStorage might be full or unavailable
    }
  }

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(storageKey());
      if (stored) {
        items.value = JSON.parse(stored) as CartItem[];
      } else {
        items.value = [];
      }
    } catch {
      items.value = [];
    }
  }

  // Auto-save on changes
  watch(items, () => saveToStorage(), { deep: true });

  return {
    // State
    items,
    tableSessionId,
    // Getters
    itemCount,
    totalAmount,
    isEmpty,
    // Actions
    initForSession,
    addItem,
    updateItemQuantity,
    updateItem,
    removeItem,
    clearCart,
  };
});
