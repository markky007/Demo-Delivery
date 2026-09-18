<template>
  <div class="apple-filter-toolbar q-mb-lg">
    <!-- ─── Row 1: Date Presets & Custom Dates ─── -->
    <div class="date-strip-row row items-center justify-between q-gutter-y-sm">
      <div class="row items-center q-gutter-x-xs date-strip-wrap">
        <span class="strip-label text-caption text-muted q-mr-xs">ช่วงเวลา:</span>
        <div class="apple-date-strip">
          <button
            v-for="preset in datePresets"
            :key="preset.id"
            type="button"
            class="date-strip-pill"
            :class="{ 'date-strip-pill--active': selectedDatePreset === preset.id }"
            @click="$emit('applyDatePreset', preset.id)"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>

      <!-- Custom Date Picker Dropdown/Box (if CUSTOM selected) -->
      <div
        v-if="selectedDatePreset === 'CUSTOM'"
        class="custom-date-box row items-center q-gutter-xs"
      >
        <q-input
          :model-value="customDateFrom"
          @update:model-value="$emit('update:customDateFrom', String($event ?? ''))"
          dense
          outlined
          type="date"
          label="ตั้งแต่"
          class="apple-custom-date-input"
        />
        <span class="text-muted">–</span>
        <q-input
          :model-value="customDateTo"
          @update:model-value="$emit('update:customDateTo', String($event ?? ''))"
          dense
          outlined
          type="date"
          label="ถึง"
          class="apple-custom-date-input"
        />
        <q-btn
          unelevated
          dense
          no-caps
          color="primary"
          icon="search"
          label="ค้นหา"
          class="apple-pill-btn apple-pill-btn--primary q-px-sm"
          @click="$emit('applyCustomDates')"
        />
      </div>
    </div>

    <div class="hairline-divider q-my-md"></div>

    <!-- ─── Row 2: Status Filter Strip & Result Count ─── -->
    <div class="row items-center justify-between q-gutter-y-sm">
      <!-- Status Strip -->
      <div class="status-strip-wrap">
        <div class="apple-status-strip">
          <button
            v-for="st in statusOptions"
            :key="st.value"
            type="button"
            class="status-strip-pill"
            :class="{ 'status-strip-pill--active': selectedStatus === st.value }"
            @click="$emit('update:selectedStatus', st.value)"
          >
            <span v-if="st.dotClass" class="status-indicator-dot" :class="st.dotClass"></span>
            <span>{{ st.label }}</span>
            <span class="filter-count font-tabular">
              {{ statusCounts[st.value] || 0 }}
            </span>
          </button>
        </div>
      </div>

      <!-- Filter Reset Button & Count -->
      <div class="row items-center q-gutter-x-sm">
        <div class="result-count-badge font-tabular">
          พบ <strong>{{ totalFilteredCount }}</strong> รายการ
        </div>
        <button
          v-if="isAnyFilterActive"
          type="button"
          class="reset-filters-btn"
          @click="$emit('resetFilters')"
        >
          <q-icon name="close" size="14px" class="q-mr-xs" />
          <span>ล้างตัวกรอง</span>
        </button>
      </div>
    </div>

    <div class="hairline-divider q-my-md"></div>

    <!-- ─── Row 3: Search Bar, Dining Filter & Sort ─── -->
    <div class="row items-center q-col-gutter-sm">
      <!-- Search Input -->
      <div class="col-12 col-md-5">
        <q-input
          :model-value="searchQuery"
          @update:model-value="$emit('update:searchQuery', String($event ?? ''))"
          dense
          outlined
          placeholder="ค้นหาเลขคิว (#01), โต๊ะ, ชื่อลูกค้า, เมนูอาหาร..."
          clearable
          class="apple-search-input"
        >
          <template #prepend>
            <q-icon name="search" size="18px" class="text-muted" />
          </template>
        </q-input>
      </div>

      <!-- Dining / Table Filter -->
      <div class="col-12 col-sm-6 col-md-4">
        <q-select
          :model-value="selectedTableFilter"
          @update:model-value="$emit('update:selectedTableFilter', String($event ?? 'ALL'))"
          :options="tableFilterOptions"
          dense
          outlined
          emit-value
          map-options
          class="apple-select-input"
        >
          <template #prepend>
            <q-icon name="table_restaurant" size="18px" class="text-muted" />
          </template>
        </q-select>
      </div>

      <!-- Sort Filter -->
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          :model-value="sortBy"
          @update:model-value="$emit('update:sortBy', $event)"
          :options="sortOptions"
          dense
          outlined
          emit-value
          map-options
          class="apple-select-input"
        >
          <template #prepend>
            <q-icon name="sort" size="18px" class="text-muted" />
          </template>
        </q-select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { OrderStatus } from 'src/types/enums';

type DatePresetType = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM';
type SortByType = 'CREATED_DESC' | 'CREATED_ASC' | 'QUEUE_ASC' | 'QUEUE_DESC' | 'AMOUNT_DESC';

defineProps<{
  selectedDatePreset: DatePresetType;
  customDateFrom: string;
  customDateTo: string;
  selectedStatus: OrderStatus | 'ALL';
  selectedTableFilter: string;
  searchQuery: string;
  sortBy: SortByType;
  statusCounts: Record<string, number>;
  tableFilterOptions: { label: string; value: string }[];
  sortOptions: { label: string; value: SortByType }[];
  isAnyFilterActive: boolean;
  totalFilteredCount: number;
}>();

defineEmits<{
  (e: 'update:selectedDatePreset', val: DatePresetType): void;
  (e: 'update:customDateFrom', val: string): void;
  (e: 'update:customDateTo', val: string): void;
  (e: 'update:selectedStatus', val: OrderStatus | 'ALL'): void;
  (e: 'update:selectedTableFilter', val: string): void;
  (e: 'update:searchQuery', val: string): void;
  (e: 'update:sortBy', val: SortByType): void;
  (e: 'applyDatePreset', preset: DatePresetType): void;
  (e: 'applyCustomDates'): void;
  (e: 'resetFilters'): void;
}>();

const datePresets = [
  { id: 'TODAY' as const, label: 'วันนี้' },
  { id: 'YESTERDAY' as const, label: 'เมื่อวาน' },
  { id: 'LAST_7_DAYS' as const, label: '7 วันล่าสุด' },
  { id: 'THIS_MONTH' as const, label: 'เดือนนี้' },
  { id: 'ALL' as const, label: 'ทั้งหมด' },
  { id: 'CUSTOM' as const, label: 'กำหนดเอง...' },
];

const statusOptions = [
  { value: 'ALL' as const, label: 'ทั้งหมด', dotClass: '' },
  { value: OrderStatus.QUEUED, label: 'รอคิว', dotClass: 'dot-queued' },
  { value: OrderStatus.PREPARING, label: 'กำลังปรุง', dotClass: 'dot-preparing' },
  { value: OrderStatus.PREPARED, label: 'ปรุงเสร็จ', dotClass: 'dot-prepared' },
  { value: OrderStatus.SERVED, label: 'เสิร์ฟแล้ว', dotClass: 'dot-served' },
];
</script>

<style scoped>
.apple-filter-toolbar {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.hairline-divider {
  height: 1px;
  background: var(--color-surface-alt, #e8e8ed);
  width: 100%;
}

.strip-label {
  font-weight: 500;
  white-space: nowrap;
}

/* ─── Apple Date Strip ─── */
.apple-date-strip {
  display: inline-flex;
  align-items: center;
  background: var(--color-surface-alt, #e8e8ed);
  padding: 3px;
  border-radius: 980px;
  gap: 2px;
  overflow-x: auto;
  max-width: 100%;
}

.date-strip-pill {
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  color: var(--color-muted, #6e6e73);
  padding: 5px 12px;
  border-radius: 980px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.date-strip-pill:hover:not(.date-strip-pill--active) {
  color: var(--color-ink, #1d1d1f);
}

.date-strip-pill--active {
  background: #ffffff;
  color: var(--color-ink-strong, #000000);
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

/* ─── Apple Status Strip ─── */
.apple-status-strip {
  display: inline-flex;
  align-items: center;
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  padding: 3px;
  border-radius: 980px;
  gap: 3px;
  overflow-x: auto;
  max-width: 100%;
}

.status-strip-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: var(--color-muted, #6e6e73);
  padding: 5px 12px;
  border-radius: 980px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.status-strip-pill:hover:not(.status-strip-pill--active) {
  color: var(--color-ink, #1d1d1f);
  background: rgba(0, 0, 0, 0.03);
}

.status-strip-pill--active {
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

.status-strip-pill--active .filter-count {
  background: var(--color-primary, #0071e3);
  color: #ffffff;
}

/* Status Indicator Dots */
.status-indicator-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-queued {
  background-color: #f59e0b;
}

.dot-preparing {
  background-color: #0284c7;
}

.dot-prepared {
  background-color: #10b981;
}

.dot-served {
  background-color: #64748b;
}

/* Custom Date Box */
.custom-date-box {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  padding: 4px 8px;
  border-radius: 11px;
}

.apple-custom-date-input {
  width: 135px;
}

.apple-custom-date-input :deep(.q-field__control) {
  height: 32px;
  border-radius: 8px;
  font-size: 0.78rem;
}

.apple-custom-date-input :deep(.q-field__marginal) {
  height: 32px;
}

/* Reset Filters Button */
.reset-filters-btn {
  display: inline-flex;
  align-items: center;
  border: 1px solid #ffcdd2;
  background: #ffebee;
  color: #c62828;
  padding: 4px 12px;
  border-radius: 980px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
}

.reset-filters-btn:hover {
  background: #ffcdd2;
}

.result-count-badge {
  font-size: 0.8125rem;
  color: var(--color-muted, #6e6e73);
}

/* Apple Inputs */
.apple-search-input :deep(.q-field__control),
.apple-select-input :deep(.q-field__control) {
  border-radius: 11px;
  background: var(--color-surface, #ffffff);
  height: 40px;
  transition: all 0.2s ease;
}

.apple-search-input :deep(.q-field__marginal),
.apple-select-input :deep(.q-field__marginal) {
  height: 40px;
}

.apple-search-input :deep(.q-field__native),
.apple-select-input :deep(.q-field__native) {
  font-size: 0.875rem;
  color: var(--color-ink, #1d1d1f);
}

.apple-search-input :deep(.q-field__control:before),
.apple-select-input :deep(.q-field__control:before) {
  border-color: var(--color-hairline, #d2d2d7);
}

.apple-search-input :deep(.q-field__control:hover:before),
.apple-select-input :deep(.q-field__control:hover:before) {
  border-color: #b0b0b8;
}

.apple-search-input :deep(.q-field--focused .q-field__control:after),
.apple-select-input :deep(.q-field--focused .q-field__control:after) {
  border-color: var(--color-primary, #0071e3);
  border-width: 2px;
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
  border-radius: 980px !important;
  font-weight: 600;
}

.font-tabular {
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-variant-numeric: tabular-nums;
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}
</style>
