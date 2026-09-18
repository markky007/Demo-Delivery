<template>
  <div class="metrics-grid q-mb-lg">
    <!-- 1. Active Revenue Metric Card -->
    <div class="apple-metric-card apple-metric-card--revenue">
      <div class="row items-center justify-between no-wrap q-mb-xs">
        <span class="metric-label">ยอดรวมบิลที่เปิดอยู่</span>
        <div class="metric-icon-wrap metric-icon-wrap--primary">
          <q-icon name="payments" size="18px" />
        </div>
      </div>
      <div class="metric-value font-tabular text-primary">
        {{ formatPrice(totalActiveAmount) }}
      </div>
      <div class="metric-footer row items-center q-gutter-x-xs">
        <span class="text-caption text-muted">
          จาก {{ totalActiveTables }} โต๊ะที่กำลังรับประทาน
        </span>
      </div>
    </div>

    <!-- 2. Occupancy / Active Tables Metric Card -->
    <div
      class="apple-metric-card apple-metric-card--clickable"
      :class="{ 'apple-metric-card--active': selectedFilter === 'ALL' }"
      @click="$emit('select-filter', 'ALL')"
    >
      <div class="row items-center justify-between no-wrap q-mb-xs">
        <span class="metric-label">อัตราครองโต๊ะ</span>
        <div class="metric-icon-wrap metric-icon-wrap--blue">
          <q-icon name="table_restaurant" size="18px" />
        </div>
      </div>
      <div class="metric-value font-tabular text-ink">
        {{ totalActiveTables }}<span class="metric-unit">/{{ totalTables }} โต๊ะ</span>
      </div>
      <div class="metric-footer row items-center justify-between">
        <span class="text-caption text-muted">โต๊ะเปิดอยู่</span>
        <span class="metric-pill metric-pill--blue"> {{ occupancyPercentage }}% </span>
      </div>
    </div>

    <!-- 3. In Kitchen Metric Card -->
    <div
      class="apple-metric-card apple-metric-card--clickable"
      :class="{ 'apple-metric-card--active': selectedFilter === 'COOKING' }"
      @click="$emit('select-filter', 'COOKING')"
    >
      <div class="row items-center justify-between no-wrap q-mb-xs">
        <span class="metric-label">กำลังปรุง / รอเสิร์ฟ</span>
        <div class="metric-icon-wrap metric-icon-wrap--amber">
          <q-icon name="soup_kitchen" size="18px" />
        </div>
      </div>
      <div class="metric-value font-tabular text-amber-9">
        {{ cookingCount }}<span class="metric-unit">โต๊ะ</span>
      </div>
      <div class="metric-footer row items-center justify-between">
        <span class="text-caption text-muted">มีออเดอร์ในครัว</span>
        <span v-if="cookingCount > 0" class="metric-pill metric-pill--amber"> รอดำเนินการ </span>
        <span v-else class="text-caption text-positive font-weight-500"> ครัวว่าง </span>
      </div>
    </div>

    <!-- 4. Ready to Pay Metric Card -->
    <div
      class="apple-metric-card apple-metric-card--clickable"
      :class="{ 'apple-metric-card--active': selectedFilter === 'READY_TO_PAY' }"
      @click="$emit('select-filter', 'READY_TO_PAY')"
    >
      <div class="row items-center justify-between no-wrap q-mb-xs">
        <span class="metric-label">เสิร์ฟครบ / รอเช็กบิล</span>
        <div class="metric-icon-wrap metric-icon-wrap--green">
          <q-icon name="receipt_long" size="18px" />
        </div>
      </div>
      <div class="metric-value font-tabular text-green-8">
        {{ readyToPayCount }}<span class="metric-unit">โต๊ะ</span>
      </div>
      <div class="metric-footer row items-center justify-between">
        <span class="text-caption text-muted">พร้อมรับชำระ</span>
        <span v-if="readyToPayCount > 0" class="metric-pill metric-pill--green">
          พร้อมคิดเงิน
        </span>
        <span v-else class="text-caption text-muted font-weight-500"> ไม่มีค้าง </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatPrice } from 'src/utils/formatters';

const props = defineProps<{
  totalActiveAmount: number;
  totalActiveTables: number;
  totalTables: number;
  cookingCount: number;
  readyToPayCount: number;
  selectedFilter: string;
}>();

defineEmits<{
  (e: 'select-filter', filter: string): void;
}>();

const occupancyPercentage = computed(() => {
  if (!props.totalTables || props.totalTables === 0) return 0;
  return Math.round((props.totalActiveTables / props.totalTables) * 100);
});
</script>

<style scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1024px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

@media (max-width: 580px) {
  .metrics-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

.apple-metric-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 20px;
  padding: 16px 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.apple-metric-card--clickable {
  cursor: pointer;
  user-select: none;
}

.apple-metric-card--clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
  border-color: #b0b0b8;
}

.apple-metric-card--active {
  border-color: var(--color-primary, #0071e3);
  box-shadow:
    0 0 0 2px rgba(0, 113, 227, 0.2),
    0 6px 18px rgba(0, 113, 227, 0.08);
}

.metric-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-muted, #6e6e73);
}

.metric-value {
  font-size: 1.625rem;
  font-weight: 700;
  line-height: 1.25;
  margin: 6px 0 8px 0;
  letter-spacing: -0.01em;
}

.metric-unit {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-muted, #6e6e73);
  margin-left: 4px;
}

.font-tabular {
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-variant-numeric: tabular-nums;
}

.metric-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-icon-wrap--primary {
  background: rgba(0, 113, 227, 0.1);
  color: var(--color-primary, #0071e3);
}

.metric-icon-wrap--blue {
  background: var(--color-surface-footer, #f5f5f7);
  color: var(--color-ink, #1d1d1f);
}

.metric-icon-wrap--amber {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.metric-icon-wrap--green {
  background: rgba(52, 199, 89, 0.12);
  color: #16a34a;
}

.metric-pill {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 980px;
}

.metric-pill--blue {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-ink, #1d1d1f);
}

.metric-pill--amber {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.metric-pill--green {
  background: rgba(52, 199, 89, 0.14);
  color: #15803d;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}
</style>
