<template>
  <div class="menu-metrics-grid q-mb-lg">
    <!-- 1. Total Items -->
    <div
      class="metric-card"
      :class="{ 'metric-card--active': activeFilter === 'all' }"
      @click="emit('select-filter', 'all')"
    >
      <div class="row items-center justify-between no-wrap">
        <div>
          <div class="metric-label text-muted">เมนูทั้งหมด</div>
          <div class="metric-value font-mono text-ink">
            {{ totalItems }}
            <span class="metric-unit">รายการ</span>
          </div>
          <div class="metric-sub text-muted">ในระบบทั้งหมด</div>
        </div>
        <div class="metric-icon-circle metric-icon-circle--blue">
          <q-icon name="restaurant_menu" size="22px" />
        </div>
      </div>
    </div>

    <!-- 2. Available Items -->
    <div
      class="metric-card"
      :class="{ 'metric-card--active': activeFilter === 'available' }"
      @click="emit('select-filter', 'available')"
    >
      <div class="row items-center justify-between no-wrap">
        <div>
          <div class="metric-label text-muted">พร้อมขาย</div>
          <div class="metric-value font-mono text-positive">
            {{ availableItems }}
            <span class="metric-unit">รายการ</span>
          </div>
          <div class="metric-sub text-positive-subtle">เปิดรับออเดอร์ปกติ</div>
        </div>
        <div class="metric-icon-circle metric-icon-circle--green">
          <q-icon name="check_circle" size="22px" />
        </div>
      </div>
    </div>

    <!-- 3. Sold Out Items (Attention needed) -->
    <div
      class="metric-card"
      :class="{
        'metric-card--active': activeFilter === 'soldout',
        'metric-card--highlight': soldOutItems > 0,
      }"
      @click="emit('select-filter', 'soldout')"
    >
      <div class="row items-center justify-between no-wrap">
        <div>
          <div class="metric-label text-muted">หมดชั่วคราว</div>
          <div
            class="metric-value font-mono"
            :class="soldOutItems > 0 ? 'text-negative' : 'text-muted'"
          >
            {{ soldOutItems }}
            <span class="metric-unit">รายการ</span>
          </div>
          <div class="metric-sub" :class="soldOutItems > 0 ? 'text-negative' : 'text-muted'">
            {{ soldOutItems > 0 ? 'คลิกเพื่อดูรายการที่ปิด' : 'ไม่มีสินค้าหมด' }}
          </div>
        </div>
        <div
          class="metric-icon-circle"
          :class="soldOutItems > 0 ? 'metric-icon-circle--red' : 'metric-icon-circle--neutral'"
        >
          <q-icon name="block" size="22px" />
        </div>
      </div>
    </div>

    <!-- 4. Category Count -->
    <div class="metric-card metric-card--static">
      <div class="row items-center justify-between no-wrap">
        <div>
          <div class="metric-label text-muted">หมวดหมู่ทั้งหมด</div>
          <div class="metric-value font-mono text-ink">
            {{ categoryCount }}
            <span class="metric-unit">หมวด</span>
          </div>
          <div class="metric-sub text-muted">จัดกลุ่มรายการอาหาร</div>
        </div>
        <div class="metric-icon-circle metric-icon-circle--purple">
          <q-icon name="category" size="22px" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  totalItems: number;
  availableItems: number;
  soldOutItems: number;
  categoryCount: number;
  activeFilter: string;
}>();

const emit = defineEmits<{
  (e: 'select-filter', filterKey: string): void;
}>();
</script>

<style scoped>
.menu-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.metric-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-lg, 18px);
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-subtle, 0 1px 2px rgba(0, 0, 0, 0.04));
  user-select: none;
}

.metric-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary-tint, rgba(0, 113, 227, 0.3));
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.metric-card--active {
  border-color: var(--color-primary, #0071e3) !important;
  background: #ffffff !important;
  box-shadow:
    0 0 0 1.5px var(--color-primary, #0071e3),
    0 4px 14px rgba(0, 113, 227, 0.12) !important;
}

.metric-card--highlight {
  border-color: rgba(220, 38, 38, 0.25);
  background: #fffcfc;
}

.metric-card--static {
  cursor: default;
}

.metric-card--static:hover {
  transform: none;
  box-shadow: var(--shadow-subtle, 0 1px 2px rgba(0, 0, 0, 0.04));
  border-color: var(--color-hairline, #d2d2d7);
}

.metric-label {
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.3;
}

.metric-value {
  font-size: 1.625rem;
  font-weight: 700;
  line-height: 1.25;
  margin-top: 4px;
}

.metric-unit {
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--color-muted, #6e6e73);
  margin-left: 2px;
}

.metric-sub {
  font-size: 0.75rem;
  margin-top: 4px;
  line-height: 1.3;
}

.text-positive-subtle {
  color: #16a34a;
}

/* Icon Circles */
.metric-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-icon-circle--blue {
  background: rgba(0, 113, 227, 0.1);
  color: var(--color-primary, #0071e3);
}

.metric-icon-circle--green {
  background: #e8f5e9;
  color: #16a34a;
}

.metric-icon-circle--red {
  background: #fee2e2;
  color: #dc2626;
}

.metric-icon-circle--purple {
  background: #f3e8ff;
  color: #9333ea;
}

.metric-icon-circle--neutral {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-muted, #6e6e73);
}

.font-mono {
  font-family: var(--app-font-mono, sans-serif);
  font-variant-numeric: tabular-nums;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}
</style>
