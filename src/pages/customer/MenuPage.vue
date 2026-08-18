<template>
  <q-page class="menu-page">
    <!-- Loading -->
    <div v-if="menuStore.isLoading" class="column items-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <template v-else>
      <!-- Category tabs - scrollable horizontal -->
      <div class="category-tabs-wrapper">
        <q-tabs
          v-model="activeCategory"
          dense
          no-caps
          active-color="primary"
          indicator-color="primary"
          class="category-tabs"
          align="left"
          narrow-indicator
        >
          <q-tab
            v-for="cat in menuStore.activeCategories"
            :key="cat.id"
            :name="cat.id"
            :label="cat.name"
            class="category-tab"
          />
        </q-tabs>
      </div>

      <!-- Menu items grid -->
      <div class="menu-items-container q-pa-md">
        <div v-if="currentItems.length === 0" class="text-center q-pa-xl text-grey-5">
          No items in this category
        </div>

        <div class="menu-grid">
          <div
            v-for="item in currentItems"
            :key="item.id"
            class="menu-item-card"
            :class="{ 'sold-out': !item.is_available }"
            @click="openItem(item)"
          >
            <!-- Image -->
            <div class="menu-item-image">
              <img v-if="item.image_url" :src="item.image_url" :alt="item.name" loading="lazy" />
              <div v-else class="menu-item-image-placeholder">
                <q-icon name="restaurant" size="32px" color="grey-4" />
              </div>
              <q-badge v-if="!item.is_available" color="negative" floating class="sold-out-badge">
                Sold out
              </q-badge>
            </div>

            <!-- Info -->
            <div class="menu-item-info">
              <div class="menu-item-name">{{ item.name }}</div>
              <div v-if="item.description" class="menu-item-desc">
                {{ item.description }}
              </div>
              <div class="menu-item-price">{{ formatPrice(item.base_price) }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMenuStore } from 'src/stores/menuStore';
import { useSessionStore } from 'src/stores/sessionStore';
import { formatPrice } from 'src/utils/formatters';
import type { MenuItem } from 'src/types/database';

const router = useRouter();
const route = useRoute();
const menuStore = useMenuStore();
const sessionStore = useSessionStore();

const activeCategory = ref('');

// Load menu on mount
onMounted(async () => {
  if (!sessionStore.hasSession) {
    const publicToken = route.params.publicToken as string;
    void router.replace(`/t/${publicToken}`);
    return;
  }

  await menuStore.loadMenu();

  // Auto-select first category
  if (menuStore.activeCategories.length > 0 && !activeCategory.value) {
    activeCategory.value = menuStore.activeCategories[0]?.id ?? '';
  }
});

// Auto-select first category when categories load
watch(
  () => menuStore.activeCategories,
  (cats) => {
    if (cats.length > 0 && !activeCategory.value) {
      activeCategory.value = cats[0]?.id ?? '';
    }
  },
);

const currentItems = computed(() =>
  activeCategory.value ? menuStore.itemsByCategory(activeCategory.value) : [],
);

function openItem(item: MenuItem) {
  const publicToken = route.params.publicToken as string;
  void router.push(`/t/${publicToken}/menu/${item.id}`);
}
</script>

<style scoped>
.menu-page {
  background: #f5f7fa;
  min-height: 100vh;
}

.category-tabs-wrapper {
  position: sticky;
  top: 48px;
  z-index: 10;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.category-tabs {
  overflow-x: auto;
}

.category-tab {
  font-weight: 500;
  font-size: 0.9rem;
  min-width: 80px;
}

.menu-items-container {
  padding-bottom: 80px;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (min-width: 600px) {
  .menu-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .menu-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.menu-item-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.menu-item-card:active {
  transform: scale(0.97);
}

.menu-item-card.sold-out {
  opacity: 0.6;
}

.menu-item-image {
  position: relative;
  width: 100%;
  padding-top: 75%;
  overflow: hidden;
  background: #f0f0f0;
}

.menu-item-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.menu-item-image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.sold-out-badge {
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 6px;
}

.menu-item-info {
  padding: 10px 12px;
}

.menu-item-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1a1a2e;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.menu-item-desc {
  font-size: 0.75rem;
  color: #666;
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.menu-item-price {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1976d2;
  margin-top: 6px;
}
</style>
