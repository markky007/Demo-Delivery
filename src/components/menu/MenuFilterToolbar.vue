<template>
  <div class="menu-filter-card q-mb-lg">
    <!-- Top Row: Status Segmented Filter & Search Input -->
    <div class="row items-center justify-between q-col-gutter-md">
      <!-- Status Filter Segment -->
      <div class="col-12 col-md-7">
        <div class="apple-status-filter">
          <button
            type="button"
            class="status-segment-btn"
            :class="{ 'status-segment-btn--active': filterStatus === 'all' }"
            @click="emit('update:filterStatus', 'all')"
          >
            <span>ทั้งหมด</span>
          </button>
          <button
            type="button"
            class="status-segment-btn"
            :class="{ 'status-segment-btn--active': filterStatus === 'available' }"
            @click="emit('update:filterStatus', 'available')"
          >
            <span class="status-dot dot-available"></span>
            <span>พร้อมขาย</span>
          </button>
          <button
            type="button"
            class="status-segment-btn"
            :class="{ 'status-segment-btn--active': filterStatus === 'soldout' }"
            @click="emit('update:filterStatus', 'soldout')"
          >
            <span class="status-dot dot-soldout"></span>
            <span>หมดชั่วคราว</span>
          </button>
          <button
            type="button"
            class="status-segment-btn"
            :class="{ 'status-segment-btn--active': filterStatus === 'inactive' }"
            @click="emit('update:filterStatus', 'inactive')"
          >
            <span class="status-dot dot-inactive"></span>
            <span>ปิดการใช้งาน</span>
          </button>
        </div>
      </div>

      <!-- Search Input -->
      <div class="col-12 col-md-5">
        <q-input
          :model-value="searchQuery"
          outlined
          dense
          placeholder="ค้นหาชื่อเมนู, วัตถุดิบ..."
          class="apple-search-box"
          clearable
          @update:model-value="emit('update:searchQuery', ($event as string) || '')"
        >
          <template v-slot:prepend>
            <q-icon name="search" size="18px" class="text-muted" />
          </template>
        </q-input>
      </div>
    </div>

    <!-- Category Pills Scrollable Row -->
    <div class="category-scroll-container q-mt-md">
      <div class="category-pills-row">
        <!-- All Categories Pill -->
        <button
          type="button"
          class="apple-cat-pill"
          :class="{ 'apple-cat-pill--active': filterCategory === null }"
          @click="emit('update:filterCategory', null)"
        >
          <q-icon name="apps" size="15px" class="q-mr-xs" />
          <span>ทุกหมวดหมู่</span>
          <span class="pill-count-badge">{{ totalItemsCount }}</span>
        </button>

        <!-- Dynamic Category Pills -->
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          class="apple-cat-pill"
          :class="{ 'apple-cat-pill--active': filterCategory === cat.id }"
          @click="emit('update:filterCategory', cat.id)"
        >
          <span>{{ cat.name }}</span>
          <span class="pill-count-badge">{{ categoryItemCountMap[cat.id] || 0 }}</span>
        </button>
      </div>
    </div>

    <!-- Meta Info & Clear Action -->
    <div class="row items-center justify-between q-mt-sm q-px-xs text-caption">
      <span class="text-muted">
        แสดง <strong>{{ filteredCount }}</strong> จาก {{ totalItemsCount }} รายการอาหาร
      </span>
      <button
        v-if="hasActiveFilter"
        type="button"
        class="clear-filter-btn"
        @click="emit('clear-filters')"
      >
        <q-icon name="filter_alt_off" size="14px" class="q-mr-xs" />
        <span>ล้างตัวกรองทั้งหมด</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MenuCategory } from 'src/types/database';

const props = defineProps<{
  searchQuery: string;
  filterStatus: string;
  filterCategory: string | null;
  categories: MenuCategory[];
  categoryItemCountMap: Record<string, number>;
  totalItemsCount: number;
  filteredCount: number;
}>();

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void;
  (e: 'update:filterStatus', val: string): void;
  (e: 'update:filterCategory', val: string | null): void;
  (e: 'clear-filters'): void;
}>();

const hasActiveFilter = computed(() => {
  return (
    props.filterStatus !== 'all' ||
    props.filterCategory !== null ||
    Boolean(props.searchQuery.trim())
  );
});
</script>

<style scoped>
.menu-filter-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-lg, 18px);
  padding: 16px 20px;
  box-shadow: var(--shadow-subtle, 0 1px 2px rgba(0, 0, 0, 0.04));
}

/* Apple Status Segmented Filter */
.apple-status-filter {
  display: inline-flex;
  align-items: center;
  background: var(--color-surface-alt, #e8e8ed);
  padding: 3px;
  border-radius: var(--radius-pill, 980px);
  gap: 2px;
  overflow-x: auto;
  max-width: 100%;
}

.status-segment-btn {
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  color: var(--color-muted, #6e6e73);
  padding: 5px 12px;
  border-radius: var(--radius-pill, 980px);
  font-family: var(--app-font-family, sans-serif);
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.status-segment-btn:hover {
  color: var(--color-ink, #1d1d1f);
}

.status-segment-btn--active {
  background: var(--color-surface, #ffffff) !important;
  color: var(--color-ink, #1d1d1f) !important;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
  display: inline-block;
}

.dot-available {
  background: #16a34a;
}

.dot-soldout {
  background: #dc2626;
}

.dot-inactive {
  background: #86868b;
}

/* Apple Search Box */
.apple-search-box {
  background: var(--color-surface-subtle, #fafafc);
  border-radius: var(--radius-pill, 980px);
}

.apple-search-box :deep(.q-field__control) {
  border-radius: var(--radius-pill, 980px);
  border-color: var(--color-hairline, #d2d2d7);
  background: var(--color-surface, #ffffff);
  height: 38px;
}

.apple-search-box :deep(.q-field__control):hover {
  border-color: var(--color-primary-tint, rgba(0, 113, 227, 0.3));
}

.apple-search-box :deep(.q-field__control--focused) {
  border-color: var(--color-primary, #0071e3) !important;
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15) !important;
}

/* Category Pills Row */
.category-scroll-container {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 2px;
}

.category-scroll-container::-webkit-scrollbar {
  display: none;
}

.category-pills-row {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.apple-cat-pill {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-hairline, #d2d2d7);
  background: var(--color-surface-subtle, #fafafc);
  color: var(--color-body, #414143);
  padding: 6px 14px;
  border-radius: var(--radius-pill, 980px);
  font-family: var(--app-font-family, sans-serif);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.apple-cat-pill:hover {
  border-color: var(--color-primary, #0071e3);
  background: #ffffff;
  color: var(--color-primary, #0071e3);
}

.apple-cat-pill--active {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
  border-color: var(--color-primary, #0071e3) !important;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 113, 227, 0.25);
}

.pill-count-badge {
  background: rgba(0, 0, 0, 0.08);
  color: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: var(--radius-pill, 980px);
  margin-left: 6px;
  font-variant-numeric: tabular-nums;
}

.apple-cat-pill--active .pill-count-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* Clear Filter Button */
.clear-filter-btn {
  background: transparent;
  border: none;
  color: var(--color-primary, #0071e3);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0;
  outline: none;
}

.clear-filter-btn:hover {
  text-decoration: underline;
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}
</style>
