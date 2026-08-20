/**
 * Pinia store for menu data (categories and items).
 * Used by both customer (read-only) and owner (CRUD).
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MenuCategory, MenuItem, MenuItemWithOptions } from 'src/types/database';
import { supabase } from 'src/services/supabase';

/** In-memory cache for fetchItemWithOptions results */
const itemWithOptionsCache = new Map<string, { data: MenuItemWithOptions; ts: number }>();
const ITEM_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const useMenuStore = defineStore('menu', () => {
  // ─── State ───────────────────────────────────────────
  const categories = ref<MenuCategory[]>([]);
  const items = ref<MenuItem[]>([]);
  const isLoading = ref(false);
  const isLoaded = ref(false);
  const error = ref<string | null>(null);

  // ─── Getters ─────────────────────────────────────────
  const activeCategories = computed(() =>
    categories.value.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order),
  );

  const activeItems = computed(() => {
    const activeCategoryIds = new Set(activeCategories.value.map((c) => c.id));
    return items.value
      .filter((i) => i.is_active && activeCategoryIds.has(i.category_id))
      .sort((a, b) => a.sort_order - b.sort_order);
  });

  /** Pre-computed Map for O(1) category lookups instead of filtering per call */
  const itemsByCategoryMap = computed(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of activeItems.value) {
      const list = map.get(item.category_id) || [];
      list.push(item);
      map.set(item.category_id, list);
    }
    return map;
  });

  function itemsByCategory(categoryId: string): MenuItem[] {
    return itemsByCategoryMap.value.get(categoryId) || [];
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

  async function fetchItemWithOptions(
    itemId: string,
    skipCache = false,
  ): Promise<MenuItemWithOptions | null> {
    // Check in-memory cache first
    if (!skipCache) {
      const cached = itemWithOptionsCache.get(itemId);
      if (cached && Date.now() - cached.ts < ITEM_CACHE_TTL_MS) {
        return cached.data;
      }
    }

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

    const result = { ...item, option_groups: optionGroups } as MenuItemWithOptions;
    itemWithOptionsCache.set(itemId, { data: result, ts: Date.now() });
    return result;
  }

  async function loadMenu(forceReload = false) {
    if (isLoaded.value && !forceReload) return;
    isLoading.value = true;
    error.value = null;
    try {
      await Promise.all([fetchCategories(), fetchItems()]);
      isLoaded.value = true;
    } finally {
      isLoading.value = false;
    }
  }

  /** Optimistically update an item in local store */
  function updateItemLocally(itemId: string, updates: Partial<MenuItem>) {
    const idx = items.value.findIndex((i) => i.id === itemId);
    if (idx !== -1 && items.value[idx]) {
      items.value[idx] = { ...items.value[idx], ...updates };
      invalidateItemCache(itemId);
    }
  }

  /** Invalidate item options cache (e.g., after owner edits menu) */
  function invalidateItemCache(itemId?: string) {
    if (itemId) {
      itemWithOptionsCache.delete(itemId);
    } else {
      itemWithOptionsCache.clear();
    }
  }

  return {
    // State
    categories,
    items,
    isLoading,
    isLoaded,
    error,
    // Getters
    activeCategories,
    activeItems,
    itemsByCategoryMap,
    itemsByCategory,
    // Actions
    fetchCategories,
    fetchItems,
    fetchItemWithOptions,
    loadMenu,
    updateItemLocally,
    invalidateItemCache,
  };
});
