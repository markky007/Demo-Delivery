<template>
  <q-page class="menu-page">
    <!-- Loading skeleton -->
    <div v-if="menuStore.isLoading" class="q-pa-md">
      <LoadingSkeleton type="menu" :count="6" />
    </div>

    <template v-else>
      <!-- Sticky Category Pills -->
      <div class="category-tabs-wrapper">
        <div class="category-pills-container">
          <button
            v-for="cat in menuStore.activeCategories"
            :key="cat.id"
            class="category-pill"
            :class="{ 'category-pill--active': activeCategory === cat.id }"
            @click="activeCategory = cat.id"
          >
            {{ cat.name }}
          </button>
        </div>
      </div>

      <!-- Menu Items Grid -->
      <div class="menu-items-container q-pa-md">
        <!-- Empty State -->
        <EmptyState
          v-if="currentItems.length === 0"
          icon="restaurant_menu"
          title="ยังไม่มีเมนูในหมวดหมู่นี้"
          description="กรุณาเลือกดูเมนูจากหมวดหมู่อื่นๆ ด้านบน"
        />

        <!-- Menu Grid -->
        <div v-else class="menu-grid">
          <div
            v-for="item in currentItems"
            :key="item.id"
            class="menu-item-card"
            :class="{ 'menu-item-card--sold-out': !item.is_available }"
            @click="openItem(item)"
          >
            <!-- Food Image -->
            <div class="menu-item-image-wrapper">
              <img
                v-if="item.image_url"
                :src="item.image_url"
                :alt="item.name"
                loading="lazy"
                class="menu-item-img"
              />
              <div v-else class="menu-item-placeholder">
                <q-icon name="restaurant" size="36px" color="grey-4" />
              </div>

              <!-- Sold out soft badge -->
              <div v-if="!item.is_available" class="sold-out-overlay">
                <span class="sold-out-tag">หมดชั่วคราว</span>
              </div>
            </div>

            <!-- Food Info -->
            <div class="menu-item-body">
              <div class="menu-item-name">{{ item.name }}</div>
              <div v-if="item.description" class="menu-item-desc">
                {{ item.description }}
              </div>

              <div class="row items-center justify-between q-mt-sm">
                <div class="menu-item-price">{{ formatPrice(item.base_price) }}</div>
                <div class="add-mini-btn" :class="{ 'add-mini-btn--disabled': !item.is_available }">
                  <q-icon :name="item.is_available ? 'add' : 'block'" size="16px" />
                  <span class="q-ml-xs">{{ item.is_available ? 'เพิ่ม' : 'หมด' }}</span>
                </div>
              </div>
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
import EmptyState from 'src/components/EmptyState.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import type { MenuItem } from 'src/types/database';

const router = useRouter();
const route = useRoute();
const menuStore = useMenuStore();
const sessionStore = useSessionStore();

const activeCategory = ref('');

onMounted(async () => {
  if (!sessionStore.hasSession) {
    const publicToken = route.params.publicToken as string;
    void router.replace(`/t/${publicToken}`);
    return;
  }

  await menuStore.loadMenu();

  if (menuStore.activeCategories.length > 0 && !activeCategory.value) {
    activeCategory.value = menuStore.activeCategories[0]?.id ?? '';
  }
});

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
  background: var(--color-background);
  min-height: 100vh;
}

/* Category Pills */
.category-tabs-wrapper {
  position: sticky;
  top: 54px;
  z-index: 20;
  background: rgba(251, 249, 246, 0.94);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  padding: 8px 12px;
}

.category-pills-container {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.category-pills-container::-webkit-scrollbar {
  display: none;
}

.category-pill {
  border: 1px solid var(--color-border);
  background: #ffffff;
  color: var(--color-text-secondary);
  padding: 6px 18px;
  border-radius: var(--radius-pill);
  font-family: var(--app-font-family);
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-pill:hover {
  border-color: var(--color-primary-tint);
}

.category-pill--active {
  background: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(224, 88, 54, 0.25);
}

/* Menu Items */
.menu-items-container {
  padding-bottom: 100px;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

@media (min-width: 600px) {
  .menu-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}

.menu-item-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.18s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.18s ease;
  box-shadow: var(--shadow-subtle);
  display: flex;
  flex-direction: column;
}

.menu-item-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.menu-item-card:active {
  transform: scale(0.98);
}

.menu-item-card--sold-out {
  opacity: 0.72;
}

.menu-item-image-wrapper {
  position: relative;
  width: 100%;
  padding-top: 75%;
  background: var(--color-surface-subtle);
  overflow: hidden;
}

.menu-item-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.menu-item-card:hover .menu-item-img {
  transform: scale(1.04);
}

.menu-item-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sold-out-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(45, 35, 30, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sold-out-tag {
  background: #ffffff;
  color: var(--color-status-soldout);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.menu-item-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.menu-item-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-text-primary);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.menu-item-desc {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-top: 3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  flex: 1;
}

.menu-item-price {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--color-primary);
}

.add-mini-btn {
  display: inline-flex;
  align-items: center;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 0.8rem;
  font-weight: 600;
}

.add-mini-btn--disabled {
  background: var(--color-surface-subtle);
  color: var(--color-text-muted);
}
</style>
