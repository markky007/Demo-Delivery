<template>
  <div class="apple-card">
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center q-gutter-xs">
        <q-icon name="storefront" color="primary" size="22px" />
        <span class="card-title">รูปแบบการทาน (ทานร้าน vs กลับบ้าน)</span>
      </div>
      <div class="card-subtitle">สรุปตามออเดอร์</div>
    </div>

    <!-- Empty State -->
    <div v-if="totalOrders === 0" class="empty-box">
      <q-icon name="takeout_dining" size="36px" color="grey-4" />
      <div class="text-caption text-muted q-mt-xs">ยังไม่มีข้อมูลการสั่งอาหาร</div>
    </div>

    <div v-else class="content-body">
      <!-- Visual Ratio Progress Bar -->
      <div class="ratio-bar-wrapper q-mb-lg">
        <div class="row items-center justify-between text-caption font-mono q-mb-xs">
          <div class="row items-center q-gutter-xs text-primary">
            <q-icon name="restaurant" size="14px" />
            <span class="text-weight-semibold">ทานที่ร้าน {{ dineInPercent }}%</span>
          </div>
          <div class="row items-center q-gutter-xs text-amber-9">
            <q-icon name="shopping_bag" size="14px" />
            <span class="text-weight-semibold">สั่งกลับบ้าน {{ takeawayPercent }}%</span>
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
          <div class="dining-stat-box">
            <div class="row items-center q-gutter-xs q-mb-xs">
              <q-icon name="table_restaurant" size="16px" color="primary" />
              <span class="box-label text-ink">ทานที่ร้าน</span>
            </div>
            <div class="stat-number text-primary font-mono">
              {{ dineInOrders }} <span class="stat-unit text-muted">ออเดอร์</span>
            </div>
            <div class="stat-sales text-caption text-muted font-mono">
              ยอดขาย {{ formatPrice(dineInSales) }}
            </div>
          </div>
        </div>

        <!-- Takeaway Stat -->
        <div class="col-6">
          <div class="dining-stat-box">
            <div class="row items-center q-gutter-xs q-mb-xs">
              <q-icon name="shopping_bag" size="16px" color="amber-9" />
              <span class="box-label text-ink">สั่งกลับบ้าน</span>
            </div>
            <div class="stat-number text-amber-9 font-mono">
              {{ takeawayOrders }} <span class="stat-unit text-muted">ออเดอร์</span>
            </div>
            <div class="stat-sales text-caption text-muted font-mono">
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
.apple-card {
  background: var(--colors-surface, #ffffff);
  border-radius: 28px;
  border: 1px solid var(--colors-hairline, #e8e8ed);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
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
}

.empty-box {
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ratio-track {
  height: 8px;
  background: #e8e8ed;
  border-radius: 980px;
  display: flex;
  overflow: hidden;
}

.ratio-fill--dinein {
  background: #0071e3;
  transition: width 0.4s ease;
}

.ratio-fill--takeaway {
  background: #b64400;
  transition: width 0.4s ease;
}

.dining-stat-box {
  padding: 14px;
  border-radius: 18px;
  background: #fafafc;
  border: 1px solid #f0f0f4;
}

.box-label {
  font-size: 0.8125rem;
  font-weight: 600;
}

.stat-number {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-unit {
  font-size: 0.8125rem;
  font-weight: 500;
}

.stat-sales {
  margin-top: 4px;
}

.text-ink {
  color: #1d1d1f;
}

.text-muted {
  color: #6e6e73;
}
</style>
