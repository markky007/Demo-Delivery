<template>
  <div class="stats-grid">
    <!-- 1. Total Sales -->
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-wrap--primary">
        <q-icon name="payments" size="24px" color="primary" />
      </div>
      <div class="stat-content">
        <div class="stat-label">ยอดขายรวมในช่วงเวลานี้</div>
        <div class="stat-value text-primary font-mono">{{ formatPrice(kpis.totalSales) }}</div>
        <div class="stat-subtext text-caption text-grey-7">
          จาก {{ kpis.activeSalesDays }} วันที่มียอดขาย
        </div>
      </div>
    </div>

    <!-- 2. Avg Daily Sales -->
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-wrap--amber">
        <q-icon name="analytics" size="24px" color="amber-9" />
      </div>
      <div class="stat-content">
        <div class="stat-label">ยอดขายเฉลี่ยต่อวัน</div>
        <div class="stat-value font-mono">{{ formatPrice(kpis.avgDailySales) }}</div>
        <div class="stat-subtext text-caption text-grey-7">ต่อ 1 วันทำการ (จ.-ส.)</div>
      </div>
    </div>

    <!-- 3. Total Paid Bills -->
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-wrap--green">
        <q-icon name="receipt_long" size="24px" color="green-8" />
      </div>
      <div class="stat-content">
        <div class="stat-label">จำนวนบิลที่ชำระสำเร็จ</div>
        <div class="stat-value font-mono">
          {{ kpis.totalBills.toLocaleString('th-TH') }} <span class="stat-unit">บิล</span>
        </div>
        <div class="stat-subtext text-caption text-grey-7">
          รวม {{ kpis.totalDishes.toLocaleString('th-TH') }} จาน
        </div>
      </div>
    </div>

    <!-- 4. Avg Bill Value (AOV) -->
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-wrap--blue">
        <q-icon name="trending_up" size="24px" color="light-blue-8" />
      </div>
      <div class="stat-content">
        <div class="stat-label">ยอดเฉลี่ยต่อบิล (AOV)</div>
        <div class="stat-value font-mono">{{ formatPrice(kpis.avgBillValue) }}</div>
        <div class="stat-subtext text-caption text-grey-7">เฉลี่ยต่อ 1 การชำระเงิน</div>
      </div>
    </div>

    <!-- 5. Avg Dishes Per Bill (Basket Size) -->
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-wrap--purple">
        <q-icon name="restaurant" size="24px" color="purple-7" />
      </div>
      <div class="stat-content">
        <div class="stat-label">จำนวนจานเฉลี่ยต่อบิล</div>
        <div class="stat-value font-mono">
          {{ kpis.avgDishesPerBill }} <span class="stat-unit">จาน</span>
        </div>
        <div class="stat-subtext text-caption text-grey-7">ขนาดตะกร้าสั่งอาหาร</div>
      </div>
    </div>

    <!-- 6. Peak Day & Hour -->
    <div class="stat-card">
      <div class="stat-icon-wrap stat-icon-wrap--teal">
        <q-icon name="local_fire_department" size="24px" color="teal-8" />
      </div>
      <div class="stat-content">
        <div class="stat-label">วัน & ช่วงเวลาขายดีสุด</div>
        <div class="stat-value text-teal-9 truncate-1">
          {{ kpis.bestDayOfWeek?.dayName || '—' }}
        </div>
        <div class="stat-subtext text-caption text-grey-7 truncate-1">
          <span v-if="kpis.peakHour">พีค {{ kpis.peakHour.label }}</span>
          <span v-else>ช่วงเวลาปกติ</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatPrice } from 'src/utils/formatters';
import type { AnalyticsKpiSummary } from 'src/services/salesAnalyticsService';

defineProps<{
  kpis: AnalyticsKpiSummary;
}>();
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 16px;
}

.stat-card {
  background: #ffffff;
  border-radius: var(--radius-md, 16px);
  border: 1px solid var(--color-border, #ede5dc);
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.04));
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card, 0 4px 16px -2px rgba(45, 35, 30, 0.06));
}

.stat-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md, 16px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrap--primary {
  background: var(--color-primary-soft, #fff3ed);
}

.stat-icon-wrap--amber {
  background: #fef3c7;
}

.stat-icon-wrap--green {
  background: #dcfce7;
}

.stat-icon-wrap--blue {
  background: #e0f2fe;
}

.stat-icon-wrap--purple {
  background: #f3e8ff;
}

.stat-icon-wrap--teal {
  background: #ccfbf1;
}

.stat-content {
  min-width: 0;
  flex: 1;
}

.stat-label {
  font-size: 0.84rem;
  color: var(--color-text-secondary, #7a6e65);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value {
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--color-text-primary, #2d231e);
  line-height: 1.2;
}

.stat-unit {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary, #7a6e65);
}

.stat-subtext {
  font-size: 0.74rem;
  margin-top: 3px;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.truncate-1 {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
