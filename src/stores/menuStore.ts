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

    // 1. Fetch option groups linked to this item
    const { data: links } = await supabase
      .from('menu_item_option_groups')
      .select('option_group_id, sort_order')
      .eq('menu_item_id', itemId)
      .order('sort_order');

    const linkedGroupIds = (links ?? []).map((l) => l.option_group_id);

    // 2. Fetch universal Dining Option Group (รูปแบบการทาน)
    const { data: diningGroups } = await supabase
      .from('option_groups')
      .select('*')
      .or('name.eq.รูปแบบการทาน,name.eq.ทานที่ร้าน / กลับบ้าน')
      .eq('is_active', true)
      .limit(1);

    const diningGroupId = diningGroups && diningGroups.length > 0 ? diningGroups[0]?.id : null;
    const allGroupIds = Array.from(
      new Set([...(diningGroupId ? [diningGroupId] : []), ...linkedGroupIds]),
    );

    if (allGroupIds.length === 0) {
      return { ...item, option_groups: [] } as MenuItemWithOptions;
    }

    // 3. Fetch all relevant option groups
    const { data: groups } = await supabase
      .from('option_groups')
      .select('*')
      .in('id', allGroupIds)
      .eq('is_active', true);

    if (!groups || groups.length === 0) {
      return { ...item, option_groups: [] } as MenuItemWithOptions;
    }

    // 4. Fetch options for these groups
    const { data: options } = await supabase
      .from('options')
      .select('*')
      .in('option_group_id', allGroupIds)
      .eq('is_active', true)
      .order('sort_order');

    // 5. Assemble and prioritize Dining Option group first
    const optionGroups = groups
      .map((g) => ({
        ...g,
        options: (options ?? []).filter((o) => o.option_group_id === g.id),
      }))
      .sort((a, b) => {
        // Universal Dining group always goes first
        const isADining = a.name === 'รูปแบบการทาน' || a.name === 'ทานที่ร้าน / กลับบ้าน';
        const isBDining = b.name === 'รูปแบบการทาน' || b.name === 'ทานที่ร้าน / กลับบ้าน';
        if (isADining && !isBDining) return -1;
        if (!isADining && isBDining) return 1;

        const aOrder = links?.find((l) => l.option_group_id === a.id)?.sort_order ?? a.sort_order;
        const bOrder = links?.find((l) => l.option_group_id === b.id)?.sort_order ?? b.sort_order;
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
