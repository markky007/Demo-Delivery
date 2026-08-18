/**
 * Pinia store for menu data (categories and items).
 * Used by both customer (read-only) and owner (CRUD).
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MenuCategory, MenuItem, MenuItemWithOptions } from 'src/types/database';
import { supabase } from 'src/services/supabase';

export const useMenuStore = defineStore('menu', () => {
  // ─── State ───────────────────────────────────────────
  const categories = ref<MenuCategory[]>([]);
  const items = ref<MenuItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // ─── Getters ─────────────────────────────────────────
  const activeCategories = computed(() =>
    categories.value.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order),
  );

  const activeItems = computed(() =>
    items.value.filter((i) => i.is_active).sort((a, b) => a.sort_order - b.sort_order),
  );

  function itemsByCategory(categoryId: string): MenuItem[] {
    return activeItems.value.filter((i) => i.category_id === categoryId);
  }

  // ─── Actions ─────────────────────────────────────────

  async function fetchCategories() {
    const { data, error: err } = await supabase
      .from('menu_categories')
      .select('*')
      .order('sort_order');

    if (err) {
      error.value = err.message;
      return;
    }
    categories.value = data ?? [];
  }

  async function fetchItems() {
    const { data, error: err } = await supabase.from('menu_items').select('*').order('sort_order');

    if (err) {
      error.value = err.message;
      return;
    }
    items.value = data ?? [];
  }

  async function fetchItemWithOptions(itemId: string): Promise<MenuItemWithOptions | null> {
    // Fetch the menu item
    const { data: item, error: itemErr } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemErr || !item) return null;

    // Fetch option groups linked to this item
    const { data: links } = await supabase
      .from('menu_item_option_groups')
      .select('option_group_id, sort_order')
      .eq('menu_item_id', itemId)
      .order('sort_order');

    if (!links || links.length === 0) {
      return { ...item, option_groups: [] } as MenuItemWithOptions;
    }

    const groupIds = links.map((l) => l.option_group_id);

    // Fetch option groups
    const { data: groups } = await supabase
      .from('option_groups')
      .select('*')
      .in('id', groupIds)
      .eq('is_active', true);

    if (!groups) {
      return { ...item, option_groups: [] } as MenuItemWithOptions;
    }

    // Fetch options for these groups
    const { data: options } = await supabase
      .from('options')
      .select('*')
      .in('option_group_id', groupIds)
      .eq('is_active', true)
      .order('sort_order');

    // Assemble the result
    const optionGroups = groups
      .map((g) => ({
        ...g,
        options: (options ?? []).filter((o) => o.option_group_id === g.id),
      }))
      .sort((a, b) => {
        const aOrder = links.find((l) => l.option_group_id === a.id)?.sort_order ?? 0;
        const bOrder = links.find((l) => l.option_group_id === b.id)?.sort_order ?? 0;
        return aOrder - bOrder;
      });

    return { ...item, option_groups: optionGroups } as MenuItemWithOptions;
  }

  async function loadMenu() {
    isLoading.value = true;
    error.value = null;
    try {
      await Promise.all([fetchCategories(), fetchItems()]);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State
    categories,
    items,
    isLoading,
    error,
    // Getters
    activeCategories,
    activeItems,
    itemsByCategory,
    // Actions
    fetchCategories,
    fetchItems,
    fetchItemWithOptions,
    loadMenu,
  };
});
