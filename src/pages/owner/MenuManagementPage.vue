<template>
  <q-page class="menu-mgmt-page q-pa-md">
    <div class="menu-mgmt-container">
      <!-- Tabs -->
      <div class="row items-center justify-between q-mb-md">
        <q-tabs
          v-model="activeTab"
          no-caps
          align="left"
          class="custom-tabs"
          active-color="primary"
          indicator-color="primary"
        >
          <q-tab name="items" label="รายการอาหาร" icon="restaurant_menu" />
          <q-tab name="categories" label="หมวดหมู่เมนู" icon="category" />
        </q-tabs>

        <q-btn
          v-if="activeTab === 'items'"
          color="primary"
          unelevated
          no-caps
          rounded
          icon="add"
          label="เพิ่มเมนูอาหาร"
          @click="openAddItemDialog"
          class="add-btn"
        />
        <q-btn
          v-else
          color="primary"
          unelevated
          no-caps
          rounded
          icon="add"
          label="เพิ่มหมวดหมู่"
          @click="openAddCategoryDialog"
          class="add-btn"
        />
      </div>

      <!-- 1. Menu Items Tab -->
      <div v-if="activeTab === 'items'">
        <!-- Filter & Search -->
        <div class="row items-center q-mb-md">
          <q-select
            v-model="filterCategory"
            :options="categoryOptions"
            label="กรองตามหมวดหมู่"
            outlined
            dense
            clearable
            emit-value
            map-options
            class="category-filter-select"
          />
        </div>

        <div class="items-grid">
          <div v-for="item in filteredItems" :key="item.id" class="item-card">
            <div class="row no-wrap items-start">
              <!-- Item Thumbnail -->
              <div class="item-thumb q-mr-md">
                <img v-if="item.image_url" :src="item.image_url" :alt="item.name" />
                <q-icon v-else name="restaurant" size="24px" color="grey-4" />
              </div>

              <!-- Item Info -->
              <div class="col">
                <div class="text-weight-bold item-title">{{ item.name }}</div>
                <div class="item-price q-mt-xs">{{ formatPrice(item.base_price) }}</div>
                <div class="row items-center q-gutter-xs q-mt-xs">
                  <StatusBadge
                    :status="item.is_available ? 'ACTIVE' : 'SOLDOUT'"
                    mode="raw"
                    :custom-label="item.is_available ? 'พร้อมขาย' : 'หมดชั่วคราว'"
                  />
                  <q-badge v-if="!item.is_active" color="grey-5" label="ปิดการใช้งาน" />
                </div>
              </div>

              <!-- Action Controls -->
              <div class="column items-end q-gutter-xs">
                <q-btn
                  flat
                  dense
                  round
                  icon="edit"
                  size="sm"
                  color="grey-7"
                  @click="editItem(item)"
                  aria-label="แก้ไขเมนู"
                />

                <!-- Quick Availability Toggle Button -->
                <q-btn
                  unelevated
                  no-caps
                  dense
                  size="sm"
                  :color="item.is_available ? 'red-1' : 'green-1'"
                  :text-color="item.is_available ? 'negative' : 'positive'"
                  :icon="item.is_available ? 'block' : 'check_circle'"
                  :label="item.is_available ? 'ปรับเป็นหมด' : 'เปิดขาย'"
                  class="quick-toggle-btn"
                  @click="toggleAvailability(item)"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredItems.length === 0" class="text-center q-pa-xl text-grey-6">
          <q-icon name="restaurant" size="48px" color="grey-4" class="q-mb-xs" />
          <div>ไม่พบรายการอาหาร</div>
        </div>
      </div>

      <!-- 2. Categories Tab -->
      <div v-if="activeTab === 'categories'">
        <div class="categories-list q-gutter-y-sm">
          <div v-for="cat in menuStore.categories" :key="cat.id" class="category-item-card">
            <div class="row items-center justify-between">
              <div class="row items-center">
                <q-icon name="drag_indicator" color="grey-4" class="q-mr-sm" />
                <div>
                  <div class="text-weight-bold text-subtitle2">{{ cat.name }}</div>
                  <div class="text-caption text-grey-6">ลำดับการแสดง: {{ cat.sort_order }}</div>
                </div>
              </div>

              <div class="row items-center q-gutter-sm">
                <StatusBadge
                  :status="cat.is_active ? 'ACTIVE' : 'INACTIVE'"
                  mode="raw"
                  :custom-label="cat.is_active ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'"
                />
                <q-btn
                  flat
                  dense
                  round
                  icon="edit"
                  size="sm"
                  color="grey-7"
                  @click="editCategory(cat)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Modal Dialog -->
      <q-dialog v-model="showCatDialog">
        <q-card style="min-width: 340px; max-width: 440px" class="q-pa-sm">
          <q-card-section>
            <div class="text-h6 text-weight-bold">
              {{ editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่' }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none q-gutter-y-md">
            <div>
              <div class="field-label q-mb-xs">ชื่อหมวดหมู่</div>
              <q-input
                v-model="catForm.name"
                outlined
                placeholder="เช่น อาหารจานเดียว, เครื่องดื่ม"
                autofocus
              />
            </div>
            <q-toggle v-model="catForm.is_active" label="เปิดใช้งานหมวดหมู่นี้" color="primary" />
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn flat label="ยกเลิก" no-caps v-close-popup />
            <q-btn
              unelevated
              color="primary"
              label="บันทึก"
              no-caps
              rounded
              @click="saveCategory"
              :loading="isSaving"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- Menu Item Modal Dialog -->
      <q-dialog v-model="showItemDialog" full-width>
        <q-card style="max-width: 580px" class="q-pa-sm">
          <q-card-section>
            <div class="text-h6 text-weight-bold">
              {{ editingItem ? 'แก้ไขเมนูอาหาร' : 'เพิ่มเมนูอาหารใหม่' }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none q-gutter-y-md">
            <div>
              <div class="field-label q-mb-xs">ชื่อเมนูอาหาร</div>
              <q-input v-model="itemForm.name" outlined placeholder="เช่น ข้าวกะเพราไก่ไข่ดาว" />
            </div>

            <div>
              <div class="field-label q-mb-xs">หมวดหมู่</div>
              <q-select
                v-model="itemForm.category_id"
                :options="categoryOptions"
                outlined
                emit-value
                map-options
                placeholder="เลือกหมวดหมู่"
              />
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <div class="field-label q-mb-xs">ราคาฐาน (บาท)</div>
                <q-input
                  v-model.number="itemForm.base_price"
                  outlined
                  type="number"
                  min="0"
                  placeholder="60"
                />
              </div>
              <div class="col-12 col-sm-6">
                <div class="field-label q-mb-xs">ลิงก์รูปภาพ (URL)</div>
                <q-input v-model="itemForm.image_url" outlined placeholder="https://..." />
              </div>
            </div>

            <div>
              <div class="field-label q-mb-xs">รายละเอียดเมนู</div>
              <q-input
                v-model="itemForm.description"
                outlined
                type="textarea"
                autogrow
                placeholder="คำอธิบายรสชาติหรือวัตถุดิบ..."
              />
            </div>

            <div class="row items-center justify-between">
              <q-toggle
                v-model="itemForm.is_available"
                label="พร้อมขาย (มีวัตถุดิบ)"
                color="primary"
              />
              <q-toggle v-model="itemForm.is_active" label="เปิดแสดงในเมนู" color="primary" />
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn flat label="ยกเลิก" no-caps v-close-popup />
            <q-btn
              unelevated
              color="primary"
              label="บันทึกเมนู"
              no-caps
              rounded
              @click="saveItem"
              :loading="isSaving"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useMenuStore } from 'src/stores/menuStore';
import { useNotify } from 'src/composables/useNotify';
import { supabase } from 'src/services/supabase';
import { formatPrice } from 'src/utils/formatters';
import StatusBadge from 'src/components/StatusBadge.vue';
import type { MenuCategory, MenuItem } from 'src/types/database';

const menuStore = useMenuStore();
const { notifySuccess, notifyError } = useNotify();

const activeTab = ref('items');
const filterCategory = ref<string | null>(null);
const showCatDialog = ref(false);
const showItemDialog = ref(false);
const isSaving = ref(false);
const editingCategory = ref<MenuCategory | null>(null);
const editingItem = ref<MenuItem | null>(null);

let restaurantId = '';

const catForm = reactive({
  name: '',
  is_active: true,
});

const itemForm = reactive({
  name: '',
  description: '',
  base_price: 0,
  image_url: '',
  category_id: '',
  is_active: true,
  is_available: true,
});

const categoryOptions = computed(() =>
  menuStore.categories.map((c) => ({ label: c.name, value: c.id })),
);

const filteredItems = computed(() => {
  if (filterCategory.value) {
    return menuStore.items.filter((i) => i.category_id === filterCategory.value);
  }
  return menuStore.items;
});

onMounted(async () => {
  const { data } = await supabase.from('restaurants').select('id').limit(1).single();
  if (data) restaurantId = data.id;
  await menuStore.loadMenu();
});

function openAddCategoryDialog() {
  editingCategory.value = null;
  catForm.name = '';
  catForm.is_active = true;
  showCatDialog.value = true;
}

function editCategory(cat: MenuCategory) {
  editingCategory.value = cat;
  catForm.name = cat.name;
  catForm.is_active = cat.is_active;
  showCatDialog.value = true;
}

async function saveCategory() {
  if (!catForm.name.trim()) return;
  isSaving.value = true;
  try {
    if (editingCategory.value) {
      await supabase
        .from('menu_categories')
        .update({
          name: catForm.name.trim(),
          is_active: catForm.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCategory.value.id);
    } else {
      const maxOrder = Math.max(0, ...menuStore.categories.map((c) => c.sort_order)) + 1;
      await supabase.from('menu_categories').insert({
        restaurant_id: restaurantId,
        name: catForm.name.trim(),
        sort_order: maxOrder,
        is_active: catForm.is_active,
      });
    }
    showCatDialog.value = false;
    await menuStore.loadMenu();
    notifySuccess('บันทึกหมวดหมู่เรียบร้อยแล้ว');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกหมวดหมู่ได้');
  } finally {
    isSaving.value = false;
  }
}

function openAddItemDialog() {
  editingItem.value = null;
  resetItemForm();
  if (menuStore.categories.length > 0) {
    itemForm.category_id = menuStore.categories[0]?.id ?? '';
  }
  showItemDialog.value = true;
}

function editItem(item: MenuItem) {
  editingItem.value = item;
  itemForm.name = item.name;
  itemForm.description = item.description ?? '';
  itemForm.base_price = item.base_price;
  itemForm.image_url = item.image_url ?? '';
  itemForm.category_id = item.category_id;
  itemForm.is_active = item.is_active;
  itemForm.is_available = item.is_available;
  showItemDialog.value = true;
}

async function saveItem() {
  if (!itemForm.name.trim()) return;
  isSaving.value = true;
  try {
    const payload = {
      name: itemForm.name.trim(),
      description: itemForm.description || null,
      base_price: itemForm.base_price,
      image_url: itemForm.image_url || null,
      category_id: itemForm.category_id,
      is_active: itemForm.is_active,
      is_available: itemForm.is_available,
      updated_at: new Date().toISOString(),
    };

    if (editingItem.value) {
      await supabase.from('menu_items').update(payload).eq('id', editingItem.value.id);
    } else {
      const maxOrder = Math.max(0, ...menuStore.items.map((i) => i.sort_order)) + 1;
      await supabase.from('menu_items').insert({ ...payload, sort_order: maxOrder });
    }
    showItemDialog.value = false;
    await menuStore.loadMenu();
    notifySuccess('บันทึกรายการอาหารเรียบร้อยแล้ว');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกรายการอาหารได้');
  } finally {
    isSaving.value = false;
  }
}

function resetItemForm() {
  itemForm.name = '';
  itemForm.description = '';
  itemForm.base_price = 0;
  itemForm.image_url = '';
  itemForm.category_id = '';
  itemForm.is_active = true;
  itemForm.is_available = true;
}

async function toggleAvailability(item: MenuItem) {
  try {
    await supabase
      .from('menu_items')
      .update({
        is_available: !item.is_available,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);
    await menuStore.loadMenu();
    notifySuccess(
      `ปรับสถานะ "${item.name}" เป็น ${item.is_available ? 'หมดชั่วคราว' : 'พร้อมขาย'} แล้ว`,
    );
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถปรับสถานะได้');
  }
}
</script>

<style scoped>
.menu-mgmt-page {
  background: var(--color-background);
}

.menu-mgmt-container {
  max-width: 1200px;
  margin: 0 auto;
}

.custom-tabs {
  background: #ffffff;
  border-radius: var(--radius-pill);
  padding: 4px;
  border: 1px solid var(--color-border);
}

.add-btn {
  padding: 8px 18px;
  font-weight: 600;
}

.category-filter-select {
  max-width: 260px;
  background: #ffffff;
  border-radius: var(--radius-sm);
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 14px;
}

.item-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 14px;
  box-shadow: var(--shadow-subtle);
}

.item-thumb {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-surface-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-title {
  font-size: 0.96rem;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.item-price {
  font-weight: 700;
  color: var(--color-primary);
  font-size: 1rem;
}

.quick-toggle-btn {
  border-radius: var(--radius-pill);
  font-size: 0.76rem;
  font-weight: 600;
  padding: 3px 8px;
}

/* Category cards */
.category-item-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 14px 18px;
  box-shadow: var(--shadow-subtle);
}

.field-label {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--color-text-primary);
}
</style>
