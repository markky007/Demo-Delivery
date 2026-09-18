<template>
  <div class="stats-bento-grid">
    <!-- 1. Hero Card: Total Revenue (Spans 2 columns on desktop) -->
    <div class="stat-card stat-card--hero">
      <div class="hero-top-row">
        <div class="stat-meta">
          <span class="hero-eyebrow">ยอดขายรวมสุทธิ</span>
          <div class="hero-value font-mono">{{ formatPrice(kpis.totalSales) }}</div>
        </div>
        <div class="hero-icon-wrap">
          <q-icon name="payments" size="26px" color="primary" />
        </div>
      </div>

      <div class="hero-sub-row">
        <div class="days-badge">
          <q-icon name="calendar_today" size="13px" class="q-mr-xs" />
          <span
            >จาก <strong>{{ kpis.activeSalesDays }}</strong> วันที่เปิดรับออเดอร์</span
          >
        </div>

        <div v-if="kpis.avgDailySales > 0" class="hero-daily-chip gt-xs">
          เฉลี่ย
          <strong class="font-mono q-ml-xs">{{ formatPrice(kpis.avgDailySales) }}</strong> /วัน
        </div>
      </div>

      <!-- Dining Type Breakdown (Dine-in vs Takeaway) if available -->
      <div
        v-if="
          diningTypeSummary &&
          (diningTypeSummary.dineInSales > 0 || diningTypeSummary.takeawaySales > 0)
        "
        class="dining-breakdown-box"
      >
        <div class="dining-bar-track">
          <div
            class="dining-bar-fill dining-bar-fill--dinein"
            :style="{ width: `${diningTypeSummary.dineInPercentage}%` }"
          ></div>
          <div
            class="dining-bar-fill dining-bar-fill--takeaway"
            :style="{ width: `${diningTypeSummary.takeawayPercentage}%` }"
          ></div>
        </div>

        <div class="dining-legend-row">
          <div class="legend-item">
            <span class="legend-dot legend-dot--dinein"></span>
            <span class="legend-text">
              ทานที่ร้าน <strong>{{ diningTypeSummary.dineInPercentage }}%</strong>
              <span class="font-mono text-muted q-ml-xs gt-xs"
                >({{ formatPrice(diningTypeSummary.dineInSales) }})</span
              >
            </span>
          </div>

          <div class="legend-item">
            <span class="legend-dot legend-dot--takeaway"></span>
            <span class="legend-text">
              สั่งกลับบ้าน <strong>{{ diningTypeSummary.takeawayPercentage }}%</strong>
              <span class="font-mono text-muted q-ml-xs gt-xs"
                >({{ formatPrice(diningTypeSummary.takeawaySales) }})</span
              >
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Avg Daily Sales -->
    <div class="stat-card">
      <div class="card-header-row">
        <span class="stat-label">ยอดขายเฉลี่ยต่อวัน</span>
        <div class="stat-icon-wrap">
          <q-icon name="trending_up" size="18px" />
        </div>
      </div>
      <div class="stat-value font-mono">{{ formatPrice(kpis.avgDailySales) }}</div>
      <div class="stat-subtext">เฉลี่ยเฉพาะวันที่มียอดขาย</div>
    </div>

    <!-- 3. Total Paid Bills -->
    <div class="stat-card">
      <div class="card-header-row">
        <span class="stat-label">จำนวนบิลที่ชำระแล้ว</span>
        <div class="stat-icon-wrap">
          <q-icon name="receipt_long" size="18px" />
        </div>
      </div>
      <div class="stat-value font-mono">
        {{ kpis.totalBills.toLocaleString('th-TH') }} <span class="stat-unit">บิล</span>
      </div>
      <div class="stat-subtext">
        รวมทั้งหมด <span class="font-mono">{{ kpis.totalDishes.toLocaleString('th-TH') }}</span> จาน
      </div>
    </div>

    <!-- 4. Avg Bill Value (AOV) -->
    <div class="stat-card">
      <div class="card-header-row">
        <span class="stat-label">ยอดเฉลี่ยต่อบิล (AOV)</span>
        <div class="stat-icon-wrap">
          <q-icon name="shopping_bag" size="18px" />
        </div>
      </div>
      <div class="stat-value font-mono">{{ formatPrice(kpis.avgBillValue) }}</div>
      <div class="stat-subtext">มูลค่าเฉลี่ยต่อ 1 ใบเสร็จ</div>
    </div>

    <!-- 5. Avg Dishes Per Bill (Basket Size) -->
    <div class="stat-card">
      <div class="card-header-row">
        <span class="stat-label">จำนวนจานเฉลี่ยต่อบิล</span>
        <div class="stat-icon-wrap">
          <q-icon name="restaurant" size="18px" />
        </div>
      </div>
      <div class="stat-value font-mono">
        {{ kpis.avgDishesPerBill }} <span class="stat-unit">จาน</span>
      </div>
      <div class="stat-subtext">ขนาดตะกร้าสั่งอาหารเฉลี่ย</div>
    </div>

    <!-- 6. Peak Day & Hour -->
    <div class="stat-card stat-card--highlight">
      <div class="card-header-row">
        <span class="stat-label">ช่วงเวลา & วันขายดีสุด</span>
        <div class="stat-icon-wrap stat-icon-wrap--highlight">
          <q-icon name="local_fire_department" size="18px" color="primary" />
        </div>
      </div>
      <div class="stat-value text-primary truncate-1">
        {{ kpis.bestDayOfWeek?.dayName || '—' }}
      </div>
      <div class="stat-subtext truncate-1">
        <span v-if="kpis.peakHour" class="peak-time-pill">
          ⚡ พีก {{ kpis.peakHour.label }} น.
        </span>
        <span v-else>ไม่มีข้อมูลช่วงเวลา</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatPrice } from 'src/utils/formatters';
import type { AnalyticsKpiSummary, DiningTypeSummary } from 'src/services/salesAnalyticsService';

defineProps<{
  kpis: AnalyticsKpiSummary;
  diningTypeSummary?: DiningTypeSummary;
}>();
</script>

<style scoped>
/* Bento Grid System */
.stats-bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1024px) {
  .stats-bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 599px) {
  .stats-bento-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Base Card (Apple Card: White, Hairline Border, Soft Elevation) */
.stat-card {
  background: #ffffff;
  border: 1px solid #d2d2d7;
  border-radius: 20px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: #0071e3;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
}

/* Hero Card: 2 Columns on Desktop */
.stat-card--hero {
  grid-column: span 2;
  background: linear-gradient(180deg, #ffffff 0%, #fafafc 100%);
  border: 1px solid #d2d2d7;
  position: relative;
  overflow: hidden;
}

@media (max-width: 599px) {
  .stat-card--hero {
    grid-column: span 1;
    padding: 16px;
  }
}

.hero-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.stat-meta {
  display: flex;
  flex-direction: column;
}

.hero-eyebrow {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #6e6e73;
  letter-spacing: 0.01em;
  margin-bottom: 4px;
}

.hero-value {
  font-size: 2.25rem;
  font-weight: 800;
  color: #1d1d1f;
  line-height: 1.15;
}

@media (max-width: 599px) {
  .hero-value {
    font-size: 1.85rem;
  }
}

.hero-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 980px;
  background: #f0f6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.days-badge {
  display: inline-flex;
  align-items: center;
  background: #f5f5f7;
  color: #414143;
  border-radius: 980px;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.hero-daily-chip {
  font-size: 0.78125rem;
  color: #6e6e73;
}

/* Dining Breakdown Bar */
.dining-breakdown-box {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f5f5f7;
}

.dining-bar-track {
  display: flex;
  width: 100%;
  height: 6px;
  border-radius: 980px;
  overflow: hidden;
  background: #e8e8ed;
}

.dining-bar-fill--dinein {
  background: #0071e3;
  transition: width 0.4s ease;
}

.dining-bar-fill--takeaway {
  background: #86868b;
  transition: width 0.4s ease;
}

.dining-legend-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 0.75rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.legend-dot--dinein {
  background: #0071e3;
}

.legend-dot--takeaway {
  background: #86868b;
}

.legend-text {
  color: #414143;
}

.text-muted {
  color: #86868b;
}

/* Standard Secondary Cards */
.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6e6e73;
}

.stat-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 980px;
  background: #f5f5f7;
  color: #1d1d1f;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-wrap--highlight {
  background: #f0f6ff;
  color: #0071e3;
}

.stat-value {
  font-size: 1.45rem;
  font-weight: 700;
  color: #1d1d1f;
  line-height: 1.25;
  margin-bottom: 4px;
}

.stat-unit {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6e6e73;
}

.stat-subtext {
  font-size: 0.75rem;
  color: #86868b;
}

.peak-time-pill {
  color: #0071e3;
  font-weight: 600;
}

.font-mono {
  font-family: var(--app-font-mono, 'Inter', sans-serif);
  font-variant-numeric: tabular-nums;
}

.truncate-1 {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
