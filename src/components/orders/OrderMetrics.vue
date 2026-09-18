<template>
  <div class="metrics-grid q-mb-lg">
    <!-- 1. Total Orders Metric Card -->
    <div
      class="apple-metric-card apple-metric-card--clickable"
      :class="{ 'apple-metric-card--active': selectedStatus === 'ALL' }"
      @click="$emit('selectStatus', 'ALL')"
    >
      <div class="row items-center justify-between no-wrap q-mb-xs">
        <span class="metric-label">ออเดอร์ทั้งหมด (ช่วงเวลานี้)</span>
        <div class="metric-icon-wrap metric-icon-wrap--primary">
          <q-icon name="receipt_long" size="18px" />
        </div>
      </div>
      <div class="metric-value font-tabular text-ink">
        {{ totalOrders }} <span class="metric-unit">รายการ</span>
      </div>
      <div class="metric-footer row items-center justify-between">
        <span class="text-caption text-muted">ทุกสถานะ</span>
        <span v-if="selectedStatus === 'ALL'" class="metric-pill metric-pill--primary">
          กำลังดูทั้งหมด
        </span>
      </div>
    </div>

    <!-- 2. Active In Kitchen Metric Card -->
    <div
      class="apple-metric-card apple-metric-card--clickable"
      :class="{ 'apple-metric-card--active': selectedStatus === OrderStatus.PREPARING }"
      @click="$emit('selectStatus', OrderStatus.PREPARING)"
    >
      <div class="row items-center justify-between no-wrap q-mb-xs">
        <span class="metric-label">กำลังทำในครัว</span>
        <div class="metric-icon-wrap metric-icon-wrap--amber">
          <q-icon name="soup_kitchen" size="18px" />
        </div>
      </div>
      <div class="metric-value font-tabular text-amber-9">
        {{ inKitchenCount }} <span class="metric-unit">ออเดอร์</span>
      </div>
      <div class="metric-footer row items-center justify-between">
        <span class="text-caption text-muted">รอคิว / กำลังปรุง / ปรุงเสร็จ</span>
        <span v-if="inKitchenCount > 0" class="metric-pill metric-pill--amber"> รอดำเนินการ </span>
        <span v-else class="text-caption text-positive font-weight-500"> ครัวว่าง </span>
      </div>
    </div>

    <!-- 3. Served Orders Metric Card -->
    <div
      class="apple-metric-card apple-metric-card--clickable"
      :class="{ 'apple-metric-card--active': selectedStatus === OrderStatus.SERVED }"
      @click="$emit('selectStatus', OrderStatus.SERVED)"
    >
      <div class="row items-center justify-between no-wrap q-mb-xs">
        <span class="metric-label">เสิร์ฟครบเรียบร้อย</span>
        <div class="metric-icon-wrap metric-icon-wrap--green">
          <q-icon name="done_all" size="18px" />
        </div>
      </div>
      <div class="metric-value font-tabular text-green-8">
        {{ servedCount }} <span class="metric-unit">ออเดอร์</span>
      </div>
      <div class="metric-footer row items-center justify-between">
        <span class="text-caption text-muted">เสิร์ฟแล้วทั้งหมด</span>
        <span v-if="servedCount > 0" class="metric-pill metric-pill--green"> เรียบร้อย </span>
      </div>
    </div>

    <!-- 4. Total Amount / Revenue Metric Card -->
    <div class="apple-metric-card apple-metric-card--revenue">
      <div class="row items-center justify-between no-wrap q-mb-xs">
        <span class="metric-label">มูลค่ารวม (ตามที่แสดง)</span>
        <div class="metric-icon-wrap metric-icon-wrap--blue">
          <q-icon name="payments" size="18px" />
        </div>
      </div>
      <div class="metric-value font-tabular text-primary">
        {{ formatPrice(totalRevenue) }}
      </div>
      <div class="metric-footer row items-center justify-between">
        <span class="text-caption text-muted">คำนวณจากรายการที่กรอง</span>
        <span class="metric-pill metric-pill--blue">ยอดขาย</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { OrderStatus } from 'src/types/enums';
import { formatPrice } from 'src/utils/formatters';

defineProps<{
  totalOrders: number;
  inKitchenCount: number;
  servedCount: number;
  totalRevenue: number;
  selectedStatus: OrderStatus | 'ALL';
}>();

defineEmits<{
  (e: 'selectStatus', status: OrderStatus | 'ALL'): void;
}>();
</script>

<style scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.apple-metric-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.apple-metric-card--clickable {
  cursor: pointer;
  user-select: none;
}

.apple-metric-card--clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
  border-color: #b0b0b8;
}

.apple-metric-card--active {
  border-color: var(--color-primary, #0071e3) !important;
  background: #f8fbff;
  box-shadow:
    0 0 0 1px var(--color-primary, #0071e3),
    0 4px 12px rgba(0, 113, 227, 0.08);
}

.apple-metric-card--revenue {
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
}

.metric-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-muted, #6e6e73);
}

.metric-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 980px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-icon-wrap--primary {
  background: #f5f5f7;
  color: var(--color-ink, #1d1d1f);
}

.metric-icon-wrap--amber {
  background: #fff8e1;
  color: #d97706;
}

.metric-icon-wrap--green {
  background: #e8f5e9;
  color: #10b981;
}

.metric-icon-wrap--blue {
  background: #eff6ff;
  color: var(--color-primary, #0071e3);
}

.metric-value {
  font-size: 1.625rem;
  font-weight: 700;
  line-height: 1.25;
  margin: 6px 0 10px 0;
}

.metric-unit {
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--color-muted, #6e6e73);
  margin-left: 2px;
}

.metric-footer {
  margin-top: auto;
  min-height: 22px;
}

.metric-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 980px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.metric-pill--primary {
  background: var(--color-primary, #0071e3);
  color: #ffffff;
}

.metric-pill--amber {
  background: #fef3c7;
  color: #b45309;
}

.metric-pill--green {
  background: #dcfce7;
  color: #15803d;
}

.metric-pill--blue {
  background: #e0f2fe;
  color: #0369a1;
}

.font-tabular {
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-variant-numeric: tabular-nums;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

.font-weight-500 {
  font-weight: 500;
}
</style>
