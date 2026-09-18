<template>
  <div class="apple-card">
    <div class="row items-center justify-between q-mb-md header-row">
      <div>
        <div class="row items-center q-gutter-xs">
          <q-icon name="schedule" color="primary" size="22px" />
          <span class="card-title">ยอดขายตามช่วงมื้ออาหาร (Meal Rush Windows)</span>
        </div>
        <div class="card-subtitle">สถิติยอดขายและปริมาณออเดอร์แบ่งตามช่วงเวลารับประทานอาหาร</div>
      </div>

      <!-- Peak Shift Badge -->
      <div v-if="peakPeriod && peakPeriod.sales > 0" class="peak-shift-pill">
        <span class="peak-icon">🔥</span>
        <span>ช่วงพีค: </span>
        <strong class="text-ink">{{ peakPeriod.name }}</strong>
        <span class="text-muted">({{ peakPeriod.percent }}% ของยอดขาย)</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="isEmpty" class="empty-box">
      <q-icon name="access_time" size="36px" color="grey-4" />
      <div class="text-caption text-grey-6 q-mt-xs">ยังไม่มีข้อมูลยอดขายในแต่ละช่วงมื้อ</div>
    </div>

    <!-- Meal Period Rows List -->
    <div v-else class="periods-list q-gutter-y-sm">
      <div
        v-for="period in mealPeriods"
        :key="period.id"
        class="period-row"
        :class="{ 'period-row--peak': peakPeriod && peakPeriod.id === period.id }"
      >
        <div class="row items-center justify-between q-mb-xs">
          <div class="row items-center q-gutter-xs">
            <span class="period-icon">{{ period.icon }}</span>
            <span class="period-name text-weight-semibold">{{ period.name }}</span>
            <span class="period-time font-mono">({{ period.timeRange }})</span>
          </div>

          <div class="row items-center q-gutter-sm">
            <span class="period-orders font-mono text-muted">{{ period.orderCount }} ออเดอร์</span>
            <span class="period-sales font-mono text-weight-bold">
              {{ formatPrice(period.sales) }}
            </span>
            <span class="period-percent font-mono text-caption text-muted">
              ({{ period.percent }}%)
            </span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="period-track">
          <div
            class="period-fill"
            :class="{ 'period-fill--peak': peakPeriod && peakPeriod.id === period.id }"
            :style="{ width: `${period.percent}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatPrice } from 'src/utils/formatters';

export interface MealPeriodItem {
  id: string;
  name: string;
  timeRange: string;
  icon: string;
  sales: number;
  orderCount: number;
  percent: number;
}

const props = defineProps<{
  mealPeriods: MealPeriodItem[];
}>();

const isEmpty = computed(() => {
  if (!props.mealPeriods || props.mealPeriods.length === 0) return true;
  return props.mealPeriods.every((p) => p.sales === 0 && p.orderCount === 0);
});

const peakPeriod = computed(() => {
  if (isEmpty.value) return null;
  return [...props.mealPeriods].sort((a, b) => b.sales - a.sales)[0] || null;
});
</script>

<style scoped>
.apple-card {
  background: var(--colors-surface, #ffffff);
  border-radius: 28px;
  border: 1px solid var(--colors-hairline, #e8e8ed);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 24px;
}

.header-row {
  flex-wrap: wrap;
  gap: 12px;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--colors-ink, #1d1d1f);
  line-height: 1.3;
}

.card-subtitle {
  font-size: 0.8125rem;
  color: var(--colors-muted, #6e6e73);
  margin-top: 2px;
}

.peak-shift-pill {
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 980px;
  background: #fafafc;
  border: 1px solid #e8e8ed;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.peak-icon {
  font-size: 0.95rem;
}

.empty-box {
  padding: 36px 0;
  text-align: center;
}

.period-row {
  background: #fafafc;
  border: 1px solid #f0f0f4;
  border-radius: 16px;
  padding: 12px 16px;
  transition: all 0.2s ease;
}

.period-row--peak {
  background: #ffffff;
  border-color: #d0e7ff;
  box-shadow: 0 2px 8px rgba(0, 113, 227, 0.06);
}

.period-icon {
  font-size: 1.05rem;
  margin-right: 2px;
}

.period-name {
  font-size: 0.875rem;
  color: var(--colors-ink, #1d1d1f);
}

.period-time {
  font-size: 0.75rem;
  color: var(--colors-muted, #6e6e73);
}

.period-orders {
  font-size: 0.8125rem;
}

.period-sales {
  font-size: 0.9375rem;
  color: var(--colors-ink, #1d1d1f);
}

.period-percent {
  font-size: 0.75rem;
}

.period-track {
  height: 6px;
  background: #e8e8ed;
  border-radius: 980px;
  overflow: hidden;
  margin-top: 6px;
}

.period-fill {
  height: 100%;
  background: #86868b;
  border-radius: 980px;
  transition: width 0.4s ease;
}

.period-fill--peak {
  background: #0071e3;
}

.text-ink {
  color: var(--colors-ink, #1d1d1f);
}

.text-muted {
  color: var(--colors-muted, #6e6e73);
}
</style>
