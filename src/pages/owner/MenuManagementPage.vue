<template>
  <q-page class="menu-mgmt-page q-pa-md q-pa-md-lg">
    <div class="menu-mgmt-container">
      <!-- 1. Apple Header Navigation & Tab Controls -->
      <MenuHeader
        v-model:active-tab="activeTab"
        :item-count="menuStore.items.length"
        :ingredient-count="ingredientGroups.length"
        :category-count="menuStore.categories.length"
        @add-item="openAddItemDialog"
        @add-category="openAddCategoryDialog"
      />

      <!-- ─── 2. TAB: Menu Items (รายการอาหาร) ─────────────────────── -->
      <div v-if="activeTab === 'items'">
        <!-- 2.1 Apple KPI Summary Metrics (Clickable Cards) -->
        <MenuMetrics
          :total-items="itemStats.total"
          :available-items="itemStats.available"
          :sold-out-items="itemStats.soldOut"
          :category-count="menuStore.categories.length"
          :active-filter="filterStatus"
          @select-filter="handleSelectMetricFilter"
        />

        <!-- 2.2 Filter Toolbar & Category Pill Bar -->
        <MenuFilterToolbar
          v-model:search-query="searchQuery"
          v-model:filter-status="filterStatus"
          v-model:filter-category="filterCategory"
          :categories="menuStore.categories"
          :category-item-count-map="categoryItemCountMap"
          :total-items-count="menuStore.items.length"
          :filtered-count="filteredItems.length"
          @clear-filters="clearFilters"
        />

        <!-- 2.3 Loading Skeleton -->
        <div v-if="menuStore.isLoading" class="q-mb-lg">
          <LoadingSkeleton type="menu" :count="6" />
        </div>

        <template v-else>
          <!-- 2.4 Items Grid (Responsive Cards minmax 310px) -->
          <div v-if="filteredItems.length > 0" class="items-grid">
            <MenuItemCard
              v-for="item in filteredItems"
              :key="item.id"
              :item="item"
              :option-group-names="itemOptionGroupNamesMap[item.id] || []"
              :category-name="getCategoryName(item.category_id)"
              @edit="editItem"
              @toggle-availability="toggleAvailability"
            />
          </div>

          <!-- 2.5 Empty State -->
          <div v-else class="apple-empty-card q-pa-xl text-center">
            <div class="empty-icon-circle q-mx-auto q-mb-md">
              <q-icon name="search_off" size="36px" color="primary" />
            </div>
            <div class="text-weight-bold text-subtitle1 text-ink">ไม่พบรายการอาหารที่ค้นหา</div>
            <p class="text-caption text-muted q-mt-xs q-mb-md empty-desc q-mx-auto">
              ลองเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูรายการอาหารทั้งหมดในร้าน
            </p>
            <q-btn
              unelevated
              no-caps
              label="ล้างตัวกรองทั้งหมด"
              class="apple-pill-btn apple-pill-btn--secondary"
              @click="clearFilters"
            />
          </div>
        </template>
      </div>

      <!-- ─── 3. TAB: Ingredients Stock (จัดการสต็อกวัตถุดิบ) ──────── -->
      <div v-else-if="activeTab === 'ingredients'">
        <MenuIngredientsTab
          :ingredient-groups="ingredientGroups"
          :stats="ingredientStats"
          :is-ingredient-updating="isIngredientUpdating"
          :is-loading="menuStore.isLoading"
          @toggle-ingredient-stock="toggleIngredientStock"
          @toggle-dish-availability="toggleAvailability"
        />
      </div>

      <!-- ─── 4. TAB: Categories (หมวดหมู่เมนู) ─────────────────────── -->
      <div v-else-if="activeTab === 'categories'">
        <MenuCategoriesTab
          :categories="menuStore.categories"
          :category-item-count-map="categoryItemCountMap"
          :is-loading="menuStore.isLoading"
          @edit="editCategory"
          @add="openAddCategoryDialog"
        />
      </div>

      <!-- ─── 5. Dialogs ───────────────────────────────────────────── -->
      <!-- 5.1 Menu Item Add/Edit Modal Dialog -->
      <MenuItemModal
        v-model="showItemDialog"
        :is-editing="Boolean(editingItem)"
        :is-saving="isSaving"
        :is-uploading="isUploading"
        :categories="menuStore.categories"
        :all-option-groups="allOptionGroups"
        :is-loading-option-groups="isLoadingOptionGroups"
        :initial-item="editingItem"
        :initial-option-group-ids="editingItem ? itemOptionGroupMap[editingItem.id] || [] : []"
        @save="handleSaveItem"
      />

      <!-- 5.2 Category Add/Edit Modal Dialog -->
      <MenuCategoryModal
        v-model="showCatDialog"
        :is-editing="Boolean(editingCategory)"
        :is-saving="isSaving"
        :category="editingCategory"
        @save="handleSaveCategory"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useMenuStore } from 'src/stores/menuStore';
import { useNotify } from 'src/composables/useNotify';
import { supabase } from 'src/services/supabase';
import { uploadMenuImage } from 'src/services/storageService';
import { inferMainIngredient, getIngredientIcon } from 'src/utils/ingredientHelper';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import MenuHeader from 'src/components/menu/MenuHeader.vue';
import MenuMetrics from 'src/components/menu/MenuMetrics.vue';
import MenuFilterToolbar from 'src/components/menu/MenuFilterToolbar.vue';
import MenuItemCard from 'src/components/menu/MenuItemCard.vue';
import MenuItemModal from 'src/components/menu/MenuItemModal.vue';
import MenuCategoryModal from 'src/components/menu/MenuCategoryModal.vue';
import MenuIngredientsTab from 'src/components/menu/MenuIngredientsTab.vue';
import MenuCategoriesTab from 'src/components/menu/MenuCategoriesTab.vue';
import type { MenuCategory, MenuItem, OptionGroup, Option, FryConfig } from 'src/types/database';

export interface OptionGroupWithSubOptions extends OptionGroup {
  options: Option[];
}

const menuStore = useMenuStore();
const { notifySuccess, notifyError } = useNotify();

// Navigation & Tab State
const activeTab = ref('items');

// Filter & Search State
const searchQuery = ref('');
const filterStatus = ref<'all' | 'available' | 'soldout' | 'inactive'>('all');
const filterCategory = ref<string | null>(null);

// Modal & Loading State
const showCatDialog = ref(false);
const showItemDialog = ref(false);
const isSaving = ref(false);
const isUploading = ref(false);
const editingCategory = ref<MenuCategory | null>(null);
const editingItem = ref<MenuItem | null>(null);

// Ingredients Stock Updating Flag
const isIngredientUpdating = ref<string | null>(null);

// Option Groups State
const allOptionGroups = ref<OptionGroupWithSubOptions[]>([]);
const itemOptionGroupMap = ref<Record<string, string[]>>({});
const isLoadingOptionGroups = ref(false);

let restaurantId = '';

// ─── Computed Properties ───────────────────────────────────────────

const categoryItemCountMap = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {};
  for (const item of menuStore.items) {
    map[item.category_id] = (map[item.category_id] || 0) + 1;
  }
  return map;
});

const categoryNameMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const cat of menuStore.categories) {
    map[cat.id] = cat.name;
  }
  return map;
});

function getCategoryName(categoryId: string): string {
  return categoryNameMap.value[categoryId] || '';
}

const itemStats = computed(() => {
  const total = menuStore.items.length;
  const available = menuStore.items.filter((i) => i.is_available && i.is_active).length;
  const soldOut = menuStore.items.filter((i) => !i.is_available).length;
  return { total, available, soldOut };
});

const itemOptionGroupNamesMap = computed<Record<string, string[]>>(() => {
  const groupNameById = new Map<string, string>();
  for (const g of allOptionGroups.value) {
    groupNameById.set(g.id, g.name);
  }
  const result: Record<string, string[]> = {};
  for (const [itemId, groupIds] of Object.entries(itemOptionGroupMap.value)) {
    result[itemId] = groupIds
      .map((gid) => groupNameById.get(gid))
      .filter((name): name is string => Boolean(name));
  }
  return result;
});

const filteredItems = computed(() => {
  let list = menuStore.items;

  // Filter by Category
  if (filterCategory.value) {
    list = list.filter((i) => i.category_id === filterCategory.value);
  }

  // Filter by Status Segment
  if (filterStatus.value === 'available') {
    list = list.filter((i) => i.is_available && i.is_active);
  } else if (filterStatus.value === 'soldout') {
    list = list.filter((i) => !i.is_available);
  } else if (filterStatus.value === 'inactive') {
    list = list.filter((i) => !i.is_active);
  }

  // Filter by Search Query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q)) ||
        (i.main_ingredient && i.main_ingredient.toLowerCase().includes(q)),
    );
  }

  return list;
});

// Ingredients Tab Data
const ingredientGroups = computed(() => {
  const groupsMap: Record<string, MenuItem[]> = {};

  for (const item of menuStore.items) {
    const ing = inferMainIngredient(item.name, item.main_ingredient);
    if (!groupsMap[ing]) {
      groupsMap[ing] = [];
    }
    groupsMap[ing].push(item);
  }

  const list = Object.entries(groupsMap).map(([name, items]) => {
    const totalCount = items.length;
    const availableCount = items.filter((i) => i.is_available).length;
    const soldOutCount = totalCount - availableCount;
    return {
      name,
      icon: getIngredientIcon(name),
      items: items.sort((a, b) => a.name.localeCompare(b.name, 'th')),
      totalCount,
      availableCount,
      soldOutCount,
      isAllSoldOut: availableCount === 0,
      isAllAvailable: availableCount === totalCount,
    };
  });

  return list.sort((a, b) => {
    if (a.soldOutCount > 0 && b.soldOutCount === 0) return -1;
    if (a.soldOutCount === 0 && b.soldOutCount > 0) return 1;
    return b.totalCount - a.totalCount;
  });
});

const ingredientStats = computed(() => {
  const total = ingredientGroups.value.length;
  const soldOut = ingredientGroups.value.filter((g) => g.soldOutCount > 0).length;
  const available = total - soldOut;
  return { total, soldOut, available };
});

// ─── Actions & Event Handlers ─────────────────────────────────────

function clearFilters() {
  filterStatus.value = 'all';
  filterCategory.value = null;
  searchQuery.value = '';
}

function handleSelectMetricFilter(filterKey: string) {
  if (filterKey === 'all' || filterKey === 'available' || filterKey === 'soldout') {
    filterStatus.value = filterKey;
  }
  activeTab.value = 'items';
}

function openAddCategoryDialog() {
  editingCategory.value = null;
  showCatDialog.value = true;
}

function editCategory(cat: MenuCategory) {
  editingCategory.value = cat;
  showCatDialog.value = true;
}

async function handleSaveCategory(data: { name: string; is_active: boolean }) {
  isSaving.value = true;
  try {
    if (editingCategory.value) {
      const { error: err } = await supabase
        .from('menu_categories')
        .update({
          name: data.name,
          is_active: data.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCategory.value.id);

      if (err) throw err;
    } else {
      const maxOrder = Math.max(0, ...menuStore.categories.map((c) => c.sort_order)) + 1;
      const { error: err } = await supabase.from('menu_categories').insert({
        restaurant_id: restaurantId,
        name: data.name,
        sort_order: maxOrder,
        is_active: data.is_active,
      });

      if (err) throw err;
    }

    showCatDialog.value = false;
    await menuStore.loadMenu(true);
    notifySuccess('บันทึกหมวดหมู่เรียบร้อยแล้ว', {
      title: 'บันทึกหมวดหมู่สำเร็จ 📂',
      caption: `หมวดหมู่ "${data.name}" พร้อมแสดงผลในระบบ`,
    });
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกหมวดหมู่ได้', {
      title: 'บันทึกหมวดหมู่ไม่สำเร็จ',
    });
  } finally {
    isSaving.value = false;
  }
}

function openAddItemDialog() {
  editingItem.value = null;
  showItemDialog.value = true;
}

function editItem(item: MenuItem) {
  editingItem.value = item;
  showItemDialog.value = true;
}

async function handleSaveItem(payloadData: {
  itemForm: {
    name: string;
    description: string;
    base_price: number;
    image_url: string;
    category_id: string;
    main_ingredient: string;
    is_active: boolean;
    is_available: boolean;
  };
  fryConfig: FryConfig;
  optionGroupIds: string[];
  pendingFile: File | null;
}) {
  isSaving.value = true;

  try {
    let finalImageUrl = payloadData.itemForm.image_url;

    // Upload file if new image was picked
    if (payloadData.pendingFile) {
      isUploading.value = true;
      try {
        finalImageUrl = await uploadMenuImage(payloadData.pendingFile);
      } catch (uploadErr) {
        console.error('Image upload failed:', uploadErr);
        notifyError('อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        isSaving.value = false;
        isUploading.value = false;
        return;
      } finally {
        isUploading.value = false;
      }
    }

    const fryConfigPayload: FryConfig = {
      is_fried: Boolean(payloadData.fryConfig.is_fried),
      fry_name: payloadData.fryConfig.fry_name?.trim() || payloadData.itemForm.name,
      fry_qty: payloadData.fryConfig.fry_qty || 1,
      special_fry_name:
        payloadData.fryConfig.special_fry_name?.trim() ||
        `${payloadData.fryConfig.fry_name || payloadData.itemForm.name}พิเศษ`,
      special_fry_qty: payloadData.fryConfig.special_fry_qty || 1,
      unit: payloadData.fryConfig.unit || 'ออเดอร์',
    };

    const dbPayload: Record<string, unknown> = {
      name: payloadData.itemForm.name,
      description: payloadData.itemForm.description || null,
      base_price: payloadData.itemForm.base_price,
      image_url: finalImageUrl || null,
      category_id: payloadData.itemForm.category_id,
      main_ingredient: payloadData.itemForm.main_ingredient || null,
      is_active: payloadData.itemForm.is_active,
      is_available: payloadData.itemForm.is_available,
      fry_config: payloadData.fryConfig.is_fried ? fryConfigPayload : { is_fried: false },
      updated_at: new Date().toISOString(),
    };

    let targetItemId = editingItem.value?.id;

    if (editingItem.value) {
      const { error: updateErr } = await supabase
        .from('menu_items')
        .update(dbPayload)
        .eq('id', editingItem.value.id);

      if (updateErr) throw updateErr;
    } else {
      const maxOrder = Math.max(0, ...menuStore.items.map((i) => i.sort_order)) + 1;
      const { data: insertedItem, error: insertErr } = await supabase
        .from('menu_items')
        .insert({ ...dbPayload, sort_order: maxOrder })
        .select('id')
        .single();

      if (insertErr || !insertedItem) {
        throw insertErr || new Error('ไม่สามารถเพิ่มรายการอาหารได้');
      }
      targetItemId = insertedItem.id;
    }

    // Sync menu_item_option_groups
    if (targetItemId) {
      await supabase.from('menu_item_option_groups').delete().eq('menu_item_id', targetItemId);

      if (payloadData.optionGroupIds.length > 0) {
        const rowsToInsert = payloadData.optionGroupIds.map((groupId, index) => ({
          menu_item_id: targetItemId,
          option_group_id: groupId,
          sort_order: index + 1,
        }));
        const { error: linkErr } = await supabase
          .from('menu_item_option_groups')
          .insert(rowsToInsert);

        if (linkErr) {
          console.error('Failed to link option groups:', linkErr);
        }
      }
    }

    showItemDialog.value = false;
    await Promise.all([menuStore.loadMenu(true), loadItemOptionGroups()]);

    notifySuccess(`บันทึกเมนู "${payloadData.itemForm.name}" เรียบร้อยแล้ว`, {
      title: 'บันทึกเมนูสำเร็จ 🍲',
      caption: 'ข้อมูลเมนูอาหารถูกอัปเดตในระบบเรียบร้อย',
    });
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกรายการอาหารได้', {
      title: 'บันทึกรายการอาหารไม่สำเร็จ',
    });
  } finally {
    isSaving.value = false;
    isUploading.value = false;
  }
}

async function toggleAvailability(item: MenuItem) {
  const previousState = item.is_available;
  const newState = !previousState;

  // Optimistic UI update
  menuStore.updateItemLocally(item.id, { is_available: newState });
  notifySuccess(`ปรับสถานะ "${item.name}" เป็น ${newState ? 'พร้อมขาย' : 'หมดชั่วคราว'} แล้ว`, {
    title: 'ปรับสถานะเมนูสำเร็จ',
  });

  try {
    const { error } = await supabase
      .from('menu_items')
      .update({
        is_available: newState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) throw error;
  } catch (err) {
    menuStore.updateItemLocally(item.id, { is_available: previousState });
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถปรับสถานะได้', {
      title: 'ปรับสถานะเมนูไม่สำเร็จ',
    });
  }
}

async function toggleIngredientStock(
  grp: { name: string; items: MenuItem[] },
  targetAvailable: boolean,
) {
  isIngredientUpdating.value = grp.name;
  const itemIds = grp.items.map((i) => i.id);

  // Optimistic UI update in menuStore
  if (itemIds.length > 0) {
    menuStore.updateMultipleItemsLocally(itemIds, { is_available: targetAvailable });
  }

  // Also update matching options in allOptionGroups
  const matchingOptionIds: string[] = [];
  allOptionGroups.value.forEach((g) => {
    g.options.forEach((o) => {
      if (inferMainIngredient(o.name) === grp.name) {
        o.is_available = targetAvailable;
        matchingOptionIds.push(o.id);
      }
    });
  });

  notifySuccess(
    `ปรับสต็อกวัตถุดิบ "${grp.name}" เป็น ${targetAvailable ? 'เปิดขาย' : 'หมดชั่วคราว'} แล้ว`,
    {
      title: 'อัปเดตสต็อกวัตถุดิบ 🥩',
      caption: `มีผลกับ ${itemIds.length} เมนู${
        matchingOptionIds.length > 0 ? `, ${matchingOptionIds.length} ตัวเลือก` : ''
      }`,
    },
  );

  try {
    if (itemIds.length > 0) {
      const { error: itemErr } = await supabase
        .from('menu_items')
        .update({
          is_available: targetAvailable,
          updated_at: new Date().toISOString(),
        })
        .in('id', itemIds);

      if (itemErr) throw itemErr;
    }

    const { data: allDbOptions } = await supabase.from('options').select('id, name');
    if (allDbOptions && allDbOptions.length > 0) {
      const dbMatchingOptionIds = allDbOptions
        .filter((opt) => inferMainIngredient(opt.name) === grp.name)
        .map((opt) => opt.id);

      if (dbMatchingOptionIds.length > 0) {
        const { error: optErr } = await supabase
          .from('options')
          .update({
            is_available: targetAvailable,
            updated_at: new Date().toISOString(),
          })
          .in('id', dbMatchingOptionIds);

        if (optErr) console.warn('Could not update options stock:', optErr);
      }
    }

    menuStore.invalidateItemCache();
  } catch (err) {
    await menuStore.loadMenu(true);
    await loadOptionGroups();
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถปรับสถานะวัตถุดิบได้', {
      title: 'อัปเดตสต็อกวัตถุดิบไม่สำเร็จ',
    });
  } finally {
    isIngredientUpdating.value = null;
  }
}

// ─── Initial Data Fetching ────────────────────────────────────────

async function loadRestaurantId() {
  if (restaurantId) return;
  const { data } = await supabase.from('restaurants').select('id').limit(1).single();
  if (data) restaurantId = data.id;
}

async function loadOptionGroups() {
  isLoadingOptionGroups.value = true;
  try {
    const { data: groups, error: gErr } = await supabase
      .from('option_groups')
      .select('*, options(*)')
      .order('sort_order');

    if (gErr || !groups) {
      allOptionGroups.value = [];
      return;
    }

    allOptionGroups.value = groups.map((g: OptionGroup & { options?: Option[] }) => ({
      ...g,
      options: (g.options ?? []).sort((a, b) => a.sort_order - b.sort_order),
    }));
  } catch (err) {
    console.error('Failed to load option groups:', err);
  } finally {
    isLoadingOptionGroups.value = false;
  }
}

async function loadItemOptionGroups() {
  try {
    const { data, error: err } = await supabase
      .from('menu_item_option_groups')
      .select('menu_item_id, option_group_id, sort_order')
      .order('sort_order');

    if (err || !data) return;

    const map: Record<string, string[]> = {};
    data.forEach((row) => {
      if (row.menu_item_id && row.option_group_id) {
        if (!map[row.menu_item_id]) {
          map[row.menu_item_id] = [];
        }
        map[row.menu_item_id]!.push(row.option_group_id);
      }
    });
    itemOptionGroupMap.value = map;
  } catch (err) {
    console.error('Failed to load menu item option group mappings:', err);
  }
}

onMounted(async () => {
  await Promise.all([
    loadRestaurantId(),
    menuStore.loadMenu(true),
    loadOptionGroups(),
    loadItemOptionGroups(),
  ]);
});
</script>

<style scoped>
.menu-mgmt-page {
  background: var(--color-background, #fafafc);
  min-height: 100vh;
}

.menu-mgmt-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Items Grid - Responsive cards minmax 310px */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 16px;
}

@media (max-width: 600px) {
  .items-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Apple Empty State */
.apple-empty-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-lg, 18px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.empty-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-surface-alt, #e8e8ed);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-desc {
  max-width: 400px;
}

.apple-pill-btn {
  border-radius: var(--radius-pill, 980px) !important;
  font-size: 0.875rem;
  font-weight: 600;
  height: 40px;
  padding: 0 20px;
}

.apple-pill-btn--secondary {
  background: var(--color-surface-alt, #e8e8ed) !important;
  color: var(--color-ink, #1d1d1f) !important;
}

.apple-pill-btn--secondary:hover {
  background: #dedee3 !important;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}
</style>
