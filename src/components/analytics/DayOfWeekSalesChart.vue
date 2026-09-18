<template>
  <div class="analytics-card">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md header-row">
      <div>
        <div class="row items-center q-gutter-xs">
          <div class="header-icon-pill">
            <q-icon name="calendar_view_week" color="primary" size="18px" />
          </div>
          <span class="text-subtitle1 text-weight-bold text-ink">
            แนวโน้ม & ค่าเฉลี่ยตามวันในสัปดาห์
          </span>
        </div>
        <div class="text-caption text-muted">
          Day-of-Week Trends • สัดส่วนยอดขายเฉลี่ยในแต่ละวันทำการ (จันทร์ - เสาร์ •
          วันอาทิตย์ร้านหยุด)
        </div>
      </div>

      <!-- Mode Toggle -->
      <div class="mode-toggle-group">
        <q-btn-toggle
          v-model="activeMetric"
          toggle-color="primary"
          flat
          dense
          rounded
          no-caps
          size="sm"
          class="segmented-toggle"
          :options="[
            { label: 'ยอดขายเฉลี่ย (฿/วัน)', value: 'avg_sales' },
            { label: 'ยอดรวมสะสม (฿)', value: 'total_sales' },
            { label: 'จำนวนออเดอร์', value: 'orders' },
          ]"
        />
      </div>
    </div>

    <!-- Weekday vs Weekend Comparison Banner -->
    <div v-if="hasData" class="comparison-banner q-mb-md">
      <div class="row items-center justify-between flex-wrap q-gutter-y-xs">
        <div class="row items-center q-gutter-sm">
          <div class="comp-icon-box">
            <q-icon name="insights" size="18px" color="primary" />
          </div>
          <div>
            <span class="text-weight-bold text-ink"
              >เปรียบเทียบต้น-กลางสัปดาห์ vs ปลายสัปดาห์:
            </span>
            <span class="text-caption text-body">
              จันทร์-พฤหัสบดี เฉลี่ย
              <strong class="font-mono text-ink">{{
                formatPrice(weekdayVsWeekend.weekdayAvgSales)
              }}</strong>
              /วัน | ศุกร์-เสาร์ เฉลี่ย
              <strong class="font-mono text-ink">{{
                formatPrice(weekdayVsWeekend.weekendAvgSales)
              }}</strong>
              /วัน
            </span>
          </div>
        </div>

        <div v-if="weekdayVsWeekend.diffPercentage > 0" class="row items-center q-gutter-xs">
          <q-badge color="primary" rounded class="q-px-sm q-py-xs text-caption">
            <q-icon
              :name="weekdayVsWeekend.higherType === 'weekend' ? 'trending_up' : 'trending_flat'"
              size="13px"
              class="q-mr-xs"
            />
            <span v-if="weekdayVsWeekend.higherType === 'weekend'">
              ศุกร์-เสาร์ ยอดขายสูงกว่า จ.-พฤ. +{{ weekdayVsWeekend.diffPercentage }}%
            </span>
            <span v-else>
              จ.-พฤ. ยอดขายสูงกว่า ศุกร์-เสาร์ +{{ weekdayVsWeekend.diffPercentage }}%
            </span>
          </q-badge>
        </div>
      </div>
    </div>

    <!-- Chart Canvas Area (ECharts SVG) -->
    <div class="chart-wrapper q-mb-md">
      <VChart v-if="hasData" class="echarts-view" :option="chartOption" autoresize />

      <!-- Empty state overlay -->
      <div v-else class="empty-overlay">
        <q-icon name="event_busy" size="36px" color="grey-4" />
        <div class="text-caption text-muted q-mt-sm">ยังไม่มีข้อมูลยอดขายในช่วงเวลานี้</div>
      </div>
    </div>

    <!-- Day Breakdown Ranking Mini Cards / Table -->
    <div v-if="hasData" class="day-ranking-grid">
      <div
        v-for="(day, idx) in sortedDays"
        :key="day.dayIndex"
        class="day-card"
        :class="{
          'day-card--best': idx === 0 && day.totalSales > 0,
          'day-card--slow': idx === sortedDays.length - 1 && day.totalSales > 0,
        }"
      >
        <div class="row items-center justify-between q-mb-xs">
          <div class="row items-center q-gutter-xs">
            <span class="day-badge-name text-weight-bold">{{ day.dayName }}</span>
            <span v-if="idx === 0 && day.totalSales > 0" class="rank-tag rank-tag--best">
              สูงสุด
            </span>
            <span
              v-else-if="idx === sortedDays.length - 1 && day.totalSales > 0"
              class="rank-tag rank-tag--slow"
            >
              ช้าสุด
            </span>
          </div>
          <span class="text-caption text-muted font-mono font-weight-bold">
            {{ day.salesPercentage }}%
          </span>
        </div>

        <div class="day-stat-row">
          <span class="text-caption text-muted">เฉลี่ยต่อวัน:</span>
          <div class="row items-center q-gutter-xs">
            <span class="text-weight-bold font-mono text-primary">{{
              formatPrice(day.avgSales)
            }}</span>
            <span
              v-if="day.daysCount > 0"
              class="text-caption text-muted"
              style="font-size: 0.72rem"
            >
              ({{ day.daysCount }} วัน)
            </span>
          </div>
        </div>

        <div class="day-stat-row text-caption text-muted">
          <span>ยอดรวมสะสม:</span>
          <span class="font-mono text-ink">{{ formatPrice(day.totalSales) }}</span>
        </div>

        <div class="day-stat-row text-caption text-muted">
          <span>ออเดอร์เฉลี่ย:</span>
          <span class="font-mono text-ink">{{ day.avgOrders }} รายการ/วัน</span>
        </div>

        <!-- Progress Bar for visual share -->
        <div class="day-progress-track q-mt-xs">
          <div
            class="day-progress-bar"
            :style="{
              width: `${day.salesPercentage}%`,
              background: idx === 0 ? '#0071e3' : '#86868b',
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import VChart from 'vue-echarts';
import type { EChartsOption } from 'echarts';
import { formatPrice } from 'src/utils/formatters';
import type { DayOfWeekDataPoint } from 'src/services/salesAnalyticsService';
import { APPLE_COLORS, FONT_FAMILY, appleTooltipBase } from 'src/utils/appleChartTheme';

const props = defineProps<{
  dayOfWeekData: DayOfWeekDataPoint[];
  weekdayVsWeekend: {
    weekdayAvgSales: number;
    weekendAvgSales: number;
    diffPercentage: number;
    higherType: 'weekend' | 'weekday' | 'equal';
  };
}>();

const activeMetric = ref<'avg_sales' | 'total_sales' | 'orders'>('avg_sales');

const hasData = computed(() => {
  if (!props.dayOfWeekData || props.dayOfWeekData.length === 0) return false;
  return props.dayOfWeekData.some((d) => d.totalSales > 0 || d.totalOrders > 0);
});

// Sort days by average sales for ranking list
const sortedDays = computed(() => {
  return [...props.dayOfWeekData].sort((a, b) => b.avgSales - a.avgSales);
});

const chartOption = computed<EChartsOption>(() => {
  const labels = props.dayOfWeekData.map((d) => d.dayName);

  let dataValues: number[];
  let yAxisLabel: string;

  if (activeMetric.value === 'avg_sales') {
    dataValues = props.dayOfWeekData.map((d) => d.avgSales);
    yAxisLabel = 'ยอดขายเฉลี่ย (บาท/วัน)';
  } else if (activeMetric.value === 'total_sales') {
    dataValues = props.dayOfWeekData.map((d) => d.totalSales);
    yAxisLabel = 'ยอดขายรวมสะสม (บาท)';
  } else {
    dataValues = props.dayOfWeekData.map((d) => d.avgOrders);
    yAxisLabel = 'จำนวนออเดอร์เฉลี่ย';
  }

  const maxVal = Math.max(...dataValues, 1);

  return {
    renderer: 'svg',
    animationDuration: 750,
    animationEasing: 'cubicOut',
    grid: {
      top: 24,
      left: 12,
      right: 12,
      bottom: 10,
      containLabel: true,
    },
    tooltip: {
      ...appleTooltipBase,
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { dataIndex: number; name: string; value: number };
        const day = props.dayOfWeekData[p.dataIndex];
        if (!day) return '';
        const dayTitle = `${day.dayName}${day.daysCount > 0 ? ` (มียอดขาย ${day.daysCount} วัน)` : ''}`;
        return `<div style="font-family:${FONT_FAMILY}">
          <div style="font-weight:600;color:#1D1D1F;margin-bottom:4px;">${dayTitle}</div>
          <div style="display:flex;justify-content:space-between;gap:16px;color:#6E6E73;font-size:12px;">
            <span>ยอดขายเฉลี่ย:</span>
            <strong style="color:#0071E3;font-variant-numeric:tabular-nums;">${formatPrice(day.avgSales)}/วัน</strong>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px;color:#6E6E73;font-size:12px;margin-top:2px;">
            <span>ยอดขายสะสม:</span>
            <strong style="color:#1D1D1F;font-variant-numeric:tabular-nums;">${formatPrice(day.totalSales)} (${day.salesPercentage}%)</strong>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px;color:#6E6E73;font-size:12px;margin-top:2px;">
            <span>ออเดอร์เฉลี่ย:</span>
            <strong style="color:#1D1D1F;font-variant-numeric:tabular-nums;">${day.avgOrders} รายการ/วัน</strong>
          </div>
        </div>`;
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: APPLE_COLORS.hairline } },
      axisTick: { show: false },
      axisLabel: {
        color: APPLE_COLORS.ink,
        fontFamily: FONT_FAMILY,
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      nameTextStyle: {
        color: APPLE_COLORS.muted,
        fontFamily: FONT_FAMILY,
        fontSize: 11,
        align: 'left',
      },
      splitLine: {
        lineStyle: {
          color: '#F5F5F7',
        },
      },
      axisLabel: {
        formatter: (val: number) => {
          if (activeMetric.value === 'orders') return `${val}`;
          return `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`;
        },
        color: APPLE_COLORS.mutedLight,
        fontFamily: FONT_FAMILY,
        fontSize: 11,
      },
    },
    series: [
      {
        name: yAxisLabel,
        type: 'bar',
        data: dataValues.map((val) => {
          const isPeak = val === maxVal && val > 0;
          return {
            value: val,
            itemStyle: {
              color: isPeak ? APPLE_COLORS.primary : APPLE_COLORS.hairline,
              borderRadius: [8, 8, 0, 0],
            },
          };
        }),
        barWidth: 26,
      },
    ],
  };
});
</script>

<style scoped>
.analytics-card {
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid #d2d2d7;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
}

.text-ink {
  color: #1d1d1f;
}

.text-muted {
  color: #6e6e73;
}

.header-row {
  flex-wrap: wrap;
  gap: 12px;
}

.header-icon-pill {
  width: 32px;
  height: 32px;
  border-radius: 980px;
  background: #f0f6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mode-toggle-group {
  background: #f5f5f7;
  padding: 3px;
  border-radius: 980px;
}

.comparison-banner {
  background: #fafafc;
  border: 1px solid #e8e8ed;
  border-radius: 12px;
  padding: 10px 16px;
}

.comp-icon-box {
  width: 28px;
  height: 28px;
  border-radius: 980px;
  background: #f0f6ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-wrapper {
  position: relative;
  height: 270px;
  width: 100%;
}

.echarts-view {
  width: 100%;
  height: 100%;
}

.empty-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

/* Day Ranking Grid */
.day-ranking-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
}

.day-card {
  background: #ffffff;
  border: 1px solid #e8e8ed;
  border-radius: 12px;
  padding: 10px 12px;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;
}

.day-card:hover {
  transform: translateY(-2px);
  border-color: #0071e3;
}

.day-card--best {
  border-color: #0071e3;
  background: #fbfdff;
}

.day-card--slow {
  background: #fafafc;
}

.day-badge-name {
  font-size: 0.84rem;
  color: #1d1d1f;
}

.rank-tag {
  font-size: 0.68rem;
  padding: 1px 6px;
  border-radius: 980px;
  font-weight: 600;
}

.rank-tag--best {
  background: #0071e3;
  color: #fff;
}

.rank-tag--slow {
  background: #e8e8ed;
  color: #6e6e73;
}

.day-stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}

.day-progress-track {
  width: 100%;
  height: 4px;
  background: #e8e8ed;
  border-radius: 2px;
  overflow: hidden;
}

.day-progress-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.font-mono {
  font-family: var(--app-font-mono, 'Inter', sans-serif);
  font-variant-numeric: tabular-nums;
}
</style>
