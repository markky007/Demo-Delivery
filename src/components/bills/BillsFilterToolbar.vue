<template>
  <div class="toolbar-container q-mb-lg">
    <div class="row items-center justify-between q-col-gutter-md">
      <!-- Filter Segmented Tabs -->
      <div class="col-12 col-lg-auto">
        <div class="apple-filter-strip">
          <button
            type="button"
            class="filter-strip-pill"
            :class="{ 'filter-strip-pill--active': selectedFilter === 'ALL' }"
            @click="$emit('update:selectedFilter', 'ALL')"
          >
            <span>ทั้งหมด</span>
            <span class="filter-count font-tabular">{{ totalCount }}</span>
          </button>

          <button
            type="button"
            class="filter-strip-pill"
            :class="{ 'filter-strip-pill--active': selectedFilter === 'COOKING' }"
            @click="$emit('update:selectedFilter', 'COOKING')"
          >
            <span class="status-indicator-dot dot-amber"></span>
            <span>กำลังทำ</span>
            <span class="filter-count font-tabular">{{ cookingCount }}</span>
          </button>

          <button
            type="button"
            class="filter-strip-pill"
            :class="{ 'filter-strip-pill--active': selectedFilter === 'READY_TO_PAY' }"
            @click="$emit('update:selectedFilter', 'READY_TO_PAY')"
          >
            <span class="status-indicator-dot dot-green"></span>
            <span>พร้อมเช็กบิล</span>
            <span class="filter-count font-tabular">{{ readyToPayCount }}</span>
          </button>

          <button
            type="button"
            class="filter-strip-pill"
            :class="{ 'filter-strip-pill--active': selectedFilter === 'PAID' }"
            @click="$emit('update:selectedFilter', 'PAID')"
          >
            <span class="status-indicator-dot dot-purple"></span>
            <span>ชำระแล้ว</span>
            <span class="filter-count font-tabular">{{ paidCount }}</span>
          </button>

          <button
            type="button"
            class="filter-strip-pill"
            :class="{ 'filter-strip-pill--active': selectedFilter === 'SEATED_NO_ORDER' }"
            @click="$emit('update:selectedFilter', 'SEATED_NO_ORDER')"
          >
            <span class="status-indicator-dot dot-cyan"></span>
            <span>รอลูกค้าสั่ง</span>
            <span class="filter-count font-tabular">{{ seatedNoOrderCount }}</span>
          </button>

          <button
            type="button"
            class="filter-strip-pill"
            :class="{ 'filter-strip-pill--active': selectedFilter === 'AVAILABLE' }"
            @click="$emit('update:selectedFilter', 'AVAILABLE')"
          >
            <span class="status-indicator-dot dot-grey"></span>
            <span>โต๊ะว่าง</span>
            <span class="filter-count font-tabular">{{ availableCount }}</span>
          </button>
        </div>
      </div>

      <!-- Search Input -->
      <div class="col-12 col-lg-4">
        <q-input
          :model-value="searchQuery"
          @update:model-value="$emit('update:searchQuery', String($event ?? ''))"
          dense
          outlined
          placeholder="ค้นหาชื่อโต๊ะ หรือชื่อลูกค้า..."
          clearable
          class="apple-search-input"
        >
          <template #prepend>
            <q-icon name="search" size="18px" class="text-muted" />
          </template>
        </q-input>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  selectedFilter: string;
  searchQuery: string;
  totalCount: number;
  cookingCount: number;
  readyToPayCount: number;
  paidCount: number;
  seatedNoOrderCount: number;
  availableCount: number;
}>();

defineEmits<{
  (e: 'update:selectedFilter', filter: string): void;
  (e: 'update:searchQuery', query: string): void;
}>();
</script>

<style scoped>
.toolbar-container {
  width: 100%;
}

/* Apple Filter Strip */
.apple-filter-strip {
  display: inline-flex;
  align-items: center;
  background: var(--color-surface-footer, #f5f5f7);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 980px;
  padding: 3px;
  gap: 2px;
  overflow-x: auto;
  max-width: 100%;
  scrollbar-width: none;
}

.apple-filter-strip::-webkit-scrollbar {
  display: none;
}

.filter-strip-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: var(--color-muted, #6e6e73);
  padding: 6px 13px;
  border-radius: 980px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.filter-strip-pill:hover:not(.filter-strip-pill--active) {
  color: var(--color-ink, #1d1d1f);
  background: rgba(0, 0, 0, 0.04);
}

.filter-strip-pill--active {
  background: #ffffff;
  color: var(--color-ink-strong, #000000);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 980px;
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-ink, #1d1d1f);
}

.filter-strip-pill--active .filter-count {
  background: var(--color-primary, #0071e3);
  color: #ffffff;
}

/* Dots */
.status-indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-amber {
  background-color: #f59e0b;
}

.dot-green {
  background-color: #10b981;
}

.dot-purple {
  background-color: #8b5cf6;
}

.dot-cyan {
  background-color: #06b6d4;
}

.dot-grey {
  background-color: #94a3b8;
}

.font-tabular {
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-variant-numeric: tabular-nums;
}

/* Apple Search Input */
.apple-search-input :deep(.q-field__control) {
  border-radius: 11px;
  background: var(--color-surface, #ffffff);
  height: 40px;
  transition: all 0.2s ease;
}

.apple-search-input :deep(.q-field__marginal) {
  height: 40px;
}

.apple-search-input :deep(.q-field__native) {
  font-size: 0.875rem;
  color: var(--color-ink, #1d1d1f);
}

.apple-search-input :deep(.q-field__control:before) {
  border-color: var(--color-hairline, #d2d2d7);
}

.apple-search-input :deep(.q-field__control:hover:before) {
  border-color: #b0b0b8;
}

.apple-search-input :deep(.q-field--focused .q-field__control:after) {
  border-color: var(--color-primary, #0071e3);
  border-width: 2px;
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

@media (max-width: 991px) {
  .apple-filter-strip {
    width: 100%;
  }
}
</style>
