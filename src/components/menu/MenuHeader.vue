<template>
  <header class="menu-header q-mb-lg">
    <div class="row items-center justify-between q-col-gutter-md flex-wrap">
      <!-- Title & Subtitle -->
      <div class="col-12 col-md-auto">
        <div class="row items-center no-wrap">
          <div class="header-icon-circle q-mr-md">
            <q-icon name="restaurant_menu" size="24px" class="header-icon" />
          </div>
          <div>
            <h1 class="text-h5 text-weight-bold text-ink q-my-none header-title">
              จัดการเมนูอาหาร
            </h1>
            <p class="text-caption text-muted q-mb-none q-mt-xs">
              จัดการรายการอาหาร สต็อกวัตถุดิบ และหมวดหมู่สำหรับร้านของคุณ
            </p>
          </div>
        </div>
      </div>

      <!-- Right Side: Segmented Tabs & Action CTA -->
      <div class="col-12 col-md-auto row items-center q-gutter-sm flex-wrap">
        <!-- Apple Segmented Control Tabs -->
        <div class="apple-segmented-tabs">
          <button
            type="button"
            class="segmented-tab-btn"
            :class="{ 'segmented-tab-btn--active': activeTab === 'items' }"
            @click="emit('update:activeTab', 'items')"
          >
            <q-icon name="restaurant_menu" size="16px" class="q-mr-xs" />
            <span>รายการอาหาร</span>
            <span v-if="itemCount > 0" class="tab-count-badge">{{ itemCount }}</span>
          </button>

          <button
            type="button"
            class="segmented-tab-btn"
            :class="{ 'segmented-tab-btn--active': activeTab === 'ingredients' }"
            @click="emit('update:activeTab', 'ingredients')"
          >
            <q-icon name="inventory_2" size="16px" class="q-mr-xs" />
            <span>จัดการวัตถุดิบ (สต็อก)</span>
            <span v-if="ingredientCount > 0" class="tab-count-badge">{{ ingredientCount }}</span>
          </button>

          <button
            type="button"
            class="segmented-tab-btn"
            :class="{ 'segmented-tab-btn--active': activeTab === 'categories' }"
            @click="emit('update:activeTab', 'categories')"
          >
            <q-icon name="category" size="16px" class="q-mr-xs" />
            <span>หมวดหมู่</span>
            <span v-if="categoryCount > 0" class="tab-count-badge">{{ categoryCount }}</span>
          </button>
        </div>

        <!-- Add Item or Category CTA -->
        <q-btn
          v-if="activeTab === 'items'"
          unelevated
          no-caps
          icon="add"
          label="เพิ่มเมนูอาหาร"
          class="apple-pill-btn apple-pill-btn--primary"
          @click="emit('add-item')"
        />
        <q-btn
          v-else-if="activeTab === 'categories'"
          unelevated
          no-caps
          icon="add"
          label="เพิ่มหมวดหมู่"
          class="apple-pill-btn apple-pill-btn--primary"
          @click="emit('add-category')"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  activeTab: string;
  itemCount: number;
  ingredientCount: number;
  categoryCount: number;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', tab: string): void;
  (e: 'add-item'): void;
  (e: 'add-category'): void;
}>();
</script>

<style scoped>
.menu-header {
  position: relative;
}

.header-icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-surface-alt, #e8e8ed);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-icon {
  color: var(--color-primary, #0071e3);
}

.header-title {
  font-size: 1.5rem;
  line-height: 1.25;
  color: var(--color-ink, #1d1d1f);
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

/* Apple Segmented Tabs */
.apple-segmented-tabs {
  display: inline-flex;
  align-items: center;
  background: var(--color-surface-alt, #e8e8ed);
  padding: 4px;
  border-radius: var(--radius-pill, 980px);
  gap: 2px;
  overflow-x: auto;
  max-width: 100%;
}

.segmented-tab-btn {
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  color: var(--color-muted, #6e6e73);
  padding: 6px 14px;
  border-radius: var(--radius-pill, 980px);
  font-family: var(--app-font-family, sans-serif);
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.segmented-tab-btn:hover {
  color: var(--color-ink, #1d1d1f);
}

.segmented-tab-btn--active {
  background: var(--color-surface, #ffffff) !important;
  color: var(--color-ink, #1d1d1f) !important;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab-count-badge {
  background: rgba(0, 0, 0, 0.08);
  color: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: var(--radius-pill, 980px);
  margin-left: 6px;
  font-variant-numeric: tabular-nums;
}

.segmented-tab-btn--active .tab-count-badge {
  background: rgba(0, 113, 227, 0.1);
  color: var(--color-primary, #0071e3);
}

/* Apple Pill Button */
.apple-pill-btn {
  border-radius: var(--radius-pill, 980px) !important;
  font-size: 0.875rem;
  font-weight: 600;
  height: 38px;
  padding: 0 18px;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
}

.apple-pill-btn--primary:hover {
  background: var(--color-primary-hover, #0066cc) !important;
}
</style>
