<template>
  <div class="chart-card">
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center q-gutter-xs">
        <q-icon name="storefront" color="indigo-7" size="22px" />
        <span class="text-subtitle1 text-weight-bold">รูปแบบการทาน (ทานร้าน vs กลับบ้าน)</span>
      </div>
      <div class="text-caption text-grey-7">สรุปตามออเดอร์</div>
    </div>

    <!-- Empty State -->
    <div v-if="totalOrders === 0" class="empty-box">
      <q-icon name="takeout_dining" size="36px" color="grey-4" />
      <div class="text-caption text-grey-6 q-mt-xs">ยังไม่มีข้อมูลการสั่งอาหาร</div>
    </div>

    <div v-else class="content-body">
      <!-- Visual Ratio Progress Bar -->
      <div class="ratio-bar-wrapper q-mb-md">
        <div class="row items-center justify-between text-caption text-weight-medium q-mb-xs">
          <div class="row items-center q-gutter-xs text-primary">
            <q-icon name="restaurant" size="14px" />
            <span>ทานที่ร้าน {{ dineInPercent }}%</span>
          </div>
          <div class="row items-center q-gutter-xs text-amber-9">
            <q-icon name="shopping_bag" size="14px" />
            <span>สั่งกลับบ้าน {{ takeawayPercent }}%</span>
          </div>
        </div>

        <div class="ratio-track">
          <div
            class="ratio-fill ratio-fill--dinein"
            :style="{ width: `${dineInPercent}%` }"
            :title="`ทานที่ร้าน: ${dineInPercent}%`"
          ></div>
          <div
            class="ratio-fill ratio-fill--takeaway"
            :style="{ width: `${takeawayPercent}%` }"
            :title="`สั่งกลับบ้าน: ${takeawayPercent}%`"
          ></div>
        </div>
      </div>

      <!-- Comparison Metrics 2 Columns -->
      <div class="row q-col-gutter-sm">
        <!-- Dine-in Stat -->
        <div class="col-6">
          <div class="dining-stat-box dining-stat-box--dinein">
            <div class="row items-center q-gutter-xs q-mb-xs">
              <q-icon name="table_restaurant" size="16px" color="primary" />
              <span class="text-caption text-weight-bold text-dark">ทานที่ร้าน</span>
            </div>
            <div class="stat-number text-primary font-mono">
              {{ dineInOrders }} <span class="stat-unit">ออเดอร์</span>
            </div>
            <div class="stat-sales text-caption text-grey-7 font-mono">
              ยอดขาย {{ formatPrice(dineInSales) }}
            </div>
          </div>
        </div>

        <!-- Takeaway Stat -->
        <div class="col-6">
          <div class="dining-stat-box dining-stat-box--takeaway">
            <div class="row items-center q-gutter-xs q-mb-xs">
              <q-icon name="shopping_bag" size="16px" color="amber-9" />
              <span class="text-caption text-weight-bold text-dark">สั่งกลับบ้าน</span>
            </div>
            <div class="stat-number text-amber-9 font-mono">
              {{ takeawayOrders }} <span class="stat-unit">ออเดอร์</span>
            </div>
            <div class="stat-sales text-caption text-grey-7 font-mono">
              ยอดขาย {{ formatPrice(takeawaySales) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatPrice } from 'src/utils/formatters';

const props = defineProps<{
  dineInOrders: number;
  dineInSales: number;
  takeawayOrders: number;
  takeawaySales: number;
}>();

const totalOrders = computed(() => props.dineInOrders + props.takeawayOrders);

const dineInPercent = computed(() => {
  if (totalOrders.value === 0) return 0;
  return Math.round((props.dineInOrders / totalOrders.value) * 100);
});

const takeawayPercent = computed(() => {
  if (totalOrders.value === 0) return 0;
  return 100 - dineInPercent.value;
});
</script>

<style scoped>
.chart-card {
  background: #ffffff;
  border-radius: var(--radius-md, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  padding: 20px;
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.05));
  display: flex;
  flex-direction: column;
  height: 100%;
}

.empty-box {
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ratio-track {
  height: 10px;
  background: #e2e8f0;
  border-radius: 6px;
  display: flex;
  overflow: hidden;
}

.ratio-fill--dinein {
  background: linear-gradient(90deg, #1976d2, #42a5f5);
  transition: width 0.4s ease;
}

.ratio-fill--takeaway {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  transition: width 0.4s ease;
}

.dining-stat-box {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
}

.dining-stat-box--dinein {
  border-left: 3px solid #1976d2;
}

.dining-stat-box--takeaway {
  border-left: 3px solid #f59e0b;
}

.stat-number {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-unit {
  font-size: 0.8rem;
  font-weight: 400;
  color: #64748b;
}

.stat-sales {
  margin-top: 2px;
}
</style>
