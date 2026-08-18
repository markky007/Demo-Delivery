<template>
  <q-page class="menu-mgmt-page q-pa-md">
    <q-tabs v-model="activeTab" no-caps align="left" class="q-mb-md">
      <q-tab name="categories" label="Categories" icon="category" />
      <q-tab name="items" label="Menu Items" icon="restaurant_menu" />
    </q-tabs>

    <!-- Categories Tab -->
    <div v-if="activeTab === 'categories'">
      <div class="row items-center justify-between q-mb-md">
        <h6 class="q-my-none">Categories</h6>
        <q-btn
          color="primary"
          unelevated
          no-caps
          icon="add"
          label="Add Category"
          @click="showCatDialog = true"
        />
      </div>
      <q-list bordered separator class="rounded-borders">
        <q-item v-for="cat in menuStore.categories" :key="cat.id">
          <q-item-section avatar>
            <q-icon name="drag_indicator" color="grey-5" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ cat.name }}</q-item-label>
            <q-item-label caption>Order: {{ cat.sort_order }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge
              :color="cat.is_active ? 'positive' : 'grey'"
              :label="cat.is_active ? 'Active' : 'Inactive'"
            />
          </q-item-section>
          <q-item-section side>
            <q-btn flat dense icon="edit" @click="editCategory(cat)" />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- Items Tab -->
    <div v-if="activeTab === 'items'">
      <div class="row items-center justify-between q-mb-md">
        <h6 class="q-my-none">Menu Items</h6>
        <q-btn
          color="primary"
          unelevated
          no-caps
          icon="add"
          label="Add Item"
          @click="showItemDialog = true"
        />
      </div>

      <q-select
        v-model="filterCategory"
        :options="categoryOptions"
        label="Filter by Category"
        outlined
        clearable
        emit-value
        map-options
        class="q-mb-md"
        style="max-width: 300px"
      />

      <div class="items-grid">
        <q-card v-for="item in filteredItems" :key="item.id" flat bordered class="item-mgmt-card">
          <q-card-section class="row no-wrap items-start">
            <div class="item-thumb q-mr-md">
              <img v-if="item.image_url" :src="item.image_url" :alt="item.name" />
              <q-icon v-else name="restaurant" size="24px" color="grey-4" />
            </div>
            <div class="col">
              <div class="text-weight-bold">{{ item.name }}</div>
              <div class="text-caption text-grey-6">{{ formatPrice(item.base_price) }}</div>
              <div class="row q-gutter-xs q-mt-xs">
                <q-badge
                  :color="item.is_active ? 'positive' : 'grey'"
                  :label="item.is_active ? 'Active' : 'Inactive'"
                />
                <q-badge
                  :color="item.is_available ? 'blue' : 'negative'"
                  :label="item.is_available ? 'Available' : 'Sold Out'"
                />
              </div>
            </div>
            <div class="column q-gutter-xs">
              <q-btn flat dense icon="edit" size="sm" @click="editItem(item)" />
              <q-btn
                flat
                dense
                size="sm"
                :icon="item.is_available ? 'remove_circle' : 'add_circle'"
                :color="item.is_available ? 'negative' : 'positive'"
                @click="toggleAvailability(item)"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Category create/edit dialog -->
    <q-dialog v-model="showCatDialog">
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">{{ editingCategory ? 'Edit' : 'Add' }} Category</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="catForm.name" outlined label="Category Name" autofocus />
          <q-toggle v-model="catForm.is_active" label="Active" class="q-mt-sm" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            label="Save"
            @click="saveCategory"
            :loading="isSaving"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Item create/edit dialog -->
    <q-dialog v-model="showItemDialog" full-width>
      <q-card style="max-width: 600px">
        <q-card-section>
          <div class="text-h6">{{ editingItem ? 'Edit' : 'Add' }} Menu Item</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="itemForm.name" outlined label="Name" />
          <q-input
            v-model="itemForm.description"
            outlined
            label="Description"
            type="textarea"
            autogrow
          />
          <q-input
            v-model.number="itemForm.base_price"
            outlined
            label="Price (฿)"
            type="number"
            min="0"
          />
          <q-input v-model="itemForm.image_url" outlined label="Image URL" />
          <q-select
            v-model="itemForm.category_id"
            :options="categoryOptions"
            outlined
            label="Category"
            emit-value
            map-options
          />
          <q-toggle v-model="itemForm.is_active" label="Active" />
          <q-toggle v-model="itemForm.is_available" label="Available" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn unelevated color="primary" label="Save" @click="saveItem" :loading="isSaving" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useMenuStore } from 'src/stores/menuStore';
import { useNotify } from 'src/composables/useNotify';
import { supabase } from 'src/services/supabase';
import { formatPrice } from 'src/utils/formatters';
import type { MenuCategory, MenuItem } from 'src/types/database';

const menuStore = useMenuStore();
const { notifySuccess, notifyError } = useNotify();

const activeTab = ref('categories');
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

function editCategory(cat: MenuCategory) {
  editingCategory.value = cat;
  catForm.name = cat.name;
  catForm.is_active = cat.is_active;
  showCatDialog.value = true;
}

async function saveCategory() {
  isSaving.value = true;
  try {
    if (editingCategory.value) {
      await supabase
        .from('menu_categories')
        .update({
          name: catForm.name,
          is_active: catForm.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCategory.value.id);
    } else {
      const maxOrder = Math.max(0, ...menuStore.categories.map((c) => c.sort_order)) + 1;
      await supabase.from('menu_categories').insert({
        restaurant_id: restaurantId,
        name: catForm.name,
        sort_order: maxOrder,
        is_active: catForm.is_active,
      });
    }
    showCatDialog.value = false;
    editingCategory.value = null;
    catForm.name = '';
    catForm.is_active = true;
    await menuStore.loadMenu();
    notifySuccess('Category saved');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'Failed to save category');
  } finally {
    isSaving.value = false;
  }
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
  isSaving.value = true;
  try {
    const payload = {
      name: itemForm.name,
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
    editingItem.value = null;
    resetItemForm();
    await menuStore.loadMenu();
    notifySuccess('Item saved');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'Failed to save item');
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
    notifySuccess(`${item.name} marked ${item.is_available ? 'sold out' : 'available'}`);
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'Failed to update availability');
  }
}
</script>

<style scoped>
.menu-mgmt-page {
  background: #f5f7fa;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 12px;
}

.item-mgmt-card {
  border-radius: 12px;
}

.item-thumb {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  overflow: hidden;
  background: #f5f5f5;
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
</style>
