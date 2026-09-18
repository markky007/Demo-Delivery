<template>
  <div class="analytics-card">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md header-row">
      <div>
        <div class="row items-center q-gutter-xs">
          <div class="header-icon-pill">
            <q-icon name="schedule" color="primary" size="18px" />
          </div>
          <span class="text-subtitle1 text-weight-bold text-ink">
            ช่วงเวลาขายดี & ความหนาแน่นรายชั่วโมง
          </span>
        </div>
        <div class="text-caption text-muted">
          Hourly Peak Trends • แนวโน้มช่วงเวลาที่มีคำสั่งซื้อและยอดขายตลอดทั้งวัน (11:00 - 23:00 น.)
        </div>
      </div>

      <!-- Mode Toggle -->
      <div class="mode-toggle-group">
        <q-btn-toggle
          v-model="activeView"
          toggle-color="primary"
          flat
          dense
          rounded
          no-caps
          size="sm"
          class="segmented-toggle"
          :options="[
            { label: 'ดูรวมทั้งสองแบบ', value: 'dual' },
            { label: 'จำนวนออเดอร์', value: 'orders' },
            { label: 'ยอดขาย (฿)', value: 'sales' },
          ]"
        />
      </div>
    </div>

    <!-- Peak Hour Highlight Banner -->
    <div v-if="peakHourInfo" class="peak-banner q-mb-md">
      <div class="row items-center justify-between flex-wrap q-gutter-y-xs">
        <div class="row items-center q-gutter-sm">
          <div class="peak-icon-pill">
            <q-icon name="bolt" size="18px" color="primary" />
          </div>
          <div>
            <span class="text-weight-bold text-ink">ช่วงเวลาที่ลูกค้าหนาแน่นที่สุด: </span>
            <span class="text-weight-bold text-primary font-mono text-subtitle2">{{
              peakHourInfo.label
            }}</span>
          </div>
        </div>
        <div class="row items-center q-gutter-md text-caption">
          <div class="row items-center q-gutter-xs">
            <span class="text-muted">ออเดอร์รวม:</span>
            <span class="text-weight-bold text-ink font-mono"
              >{{ peakHourInfo.orderCount }} รายการ</span
            >
          </div>
          <div class="row items-center q-gutter-xs">
            <span class="text-muted">ยอดขายรวม:</span>
            <span class="text-weight-bold text-primary font-mono">{{
              formatPrice(peakHourInfo.totalSales)
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Chart Canvas Area (ECharts SVG) -->
    <div class="chart-wrapper q-mb-md">
      <VChart v-if="!isEmpty" class="echarts-view" :option="chartOption" autoresize />

      <!-- Empty State Overlay -->
      <div v-else class="empty-overlay">
        <q-icon name="query_builder" size="36px" color="grey-4" />
        <div class="text-caption text-muted q-mt-sm">ยังไม่มีข้อมูลออเดอร์ในช่วงเวลานี้</div>
      </div>
    </div>

    <!-- Meal Period Summary Cards Grid -->
    <div class="meal-periods-grid">
      <div
        v-for="period in mealPeriods"
        :key="period.periodKey"
        class="meal-card"
        :class="{ 'meal-card--highlight': period.salesPercentage >= 30 }"
      >
        <div class="row items-center justify-between q-mb-xs">
          <div class="row items-center q-gutter-xs">
            <q-icon :name="period.icon" size="16px" color="primary" />
            <span class="meal-title text-weight-bold">{{ period.title }}</span>
          </div>
          <span class="meal-percent font-mono text-weight-bold text-primary">
            {{ period.salesPercentage }}%
          </span>
        </div>

        <div class="text-caption text-muted q-mb-xs">{{ period.timeRange }}</div>

        <div class="row items-center justify-between text-caption">
          <span class="text-muted">ยอดขายรวม:</span>
          <span class="text-weight-bold text-ink font-mono">{{
            formatPrice(period.totalSales)
          }}</span>
        </div>

        <div class="row items-center justify-between text-caption text-muted">
          <span>ออเดอร์:</span>
          <span class="font-mono text-ink">{{ period.orderCount }} รายการ</span>
        </div>

        <!-- Progress bar for meal period share -->
        <div class="meal-progress-track q-mt-xs">
          <div
            class="meal-progress-bar"
            :style="{
              width: `${period.salesPercentage}%`,
              background: period.salesPercentage >= 30 ? '#0071e3' : '#86868b',
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
import { graphic } from 'echarts';
import type { EChartsOption } from 'echarts';
import { formatPrice } from 'src/utils/formatters';
import type { HourlyDataPoint, MealPeriodSummary } from 'src/services/salesAnalyticsService';
import { APPLE_COLORS, FONT_FAMILY, appleTooltipBase } from 'src/utils/appleChartTheme';

const props = defineProps<{
  hourlyData: HourlyDataPoint[];
  mealPeriods: MealPeriodSummary[];
}>();

const activeView = ref<'dual' | 'orders' | 'sales'>('dual');

const isEmpty = computed(() => {
  if (!props.hourlyData || props.hourlyData.length === 0) return true;
  return props.hourlyData.every((d) => d.orderCount === 0 && d.totalSales === 0);
});

// Identify top peak hour
const peakHourInfo = computed(() => {
  if (!props.hourlyData || props.hourlyData.length === 0) return null;
  const sorted = [...props.hourlyData].sort((a, b) => {
    if (b.orderCount !== a.orderCount) {
      return b.orderCount - a.orderCount;
    }
    return b.totalSales - a.totalSales;
  });
  const top = sorted[0];
  if (!top || top.orderCount === 0) return null;

  const nextHour = (top.hour + 1) % 24;
  const startStr = `${String(top.hour).padStart(2, '0')}:00`;
  const endStr = `${String(nextHour).padStart(2, '0')}:00 น.`;

  return {
    label: `${startStr} - ${endStr}`,
    orderCount: top.orderCount,
    totalSales: top.totalSales,
  };
});

const chartOption = computed<EChartsOption>(() => {
  const labels = props.hourlyData.map((d) => d.label);
  const orderCounts = props.hourlyData.map((d) => d.orderCount);
  const salesAmounts = props.hourlyData.map((d) => d.totalSales);

  const series: EChartsOption['series'] = [];

  // Series 1: Orders (Action Blue)
  if (activeView.value === 'dual' || activeView.value === 'orders') {
    series.push({
      name: 'จำนวนออเดอร์',
      type: 'line',
      yAxisIndex: 0,
      data: orderCounts,
      smooth: 0.35,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: {
        color: APPLE_COLORS.primary,
        borderColor: '#ffffff',
        borderWidth: 2,
      },
      lineStyle: {
        width: 2.5,
        color: APPLE_COLORS.primary,
        shadowColor: 'rgba(0, 113, 227, 0.2)',
        shadowBlur: 6,
      },
      areaStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(0, 113, 227, 0.22)' },
          { offset: 0.8, color: 'rgba(0, 113, 227, 0.02)' },
          { offset: 1, color: 'rgba(0, 113, 227, 0)' },
        ]),
      },
    });
  }

  // Series 2: Sales (Apple Slate / Green)
  if (activeView.value === 'dual' || activeView.value === 'sales') {
    series.push({
      name: 'ยอดขาย (บาท)',
      type: 'line',
      yAxisIndex: activeView.value === 'dual' ? 1 : 0,
      data: salesAmounts,
      smooth: 0.35,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: {
        color: activeView.value === 'dual' ? APPLE_COLORS.mutedLight : APPLE_COLORS.primary,
        borderColor: '#ffffff',
        borderWidth: 2,
      },
      lineStyle: {
        width: 2.2,
        color: activeView.value === 'dual' ? APPLE_COLORS.mutedLight : APPLE_COLORS.primary,
        type: activeView.value === 'dual' ? 'dashed' : 'solid',
      },
      ...(activeView.value === 'sales'
        ? {
            areaStyle: {
              color: new graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(0, 113, 227, 0.22)' },
                { offset: 0.8, color: 'rgba(0, 113, 227, 0.02)' },
                { offset: 1, color: 'rgba(0, 113, 227, 0)' },
              ]),
            },
          }
        : {}),
    });
  }

  return {
    renderer: 'svg',
    animationDuration: 750,
    animationEasing: 'cubicOut',
    grid: {
      top: 36,
      left: 12,
      right: activeView.value === 'dual' ? 24 : 12,
      bottom: 10,
      containLabel: true,
    },
    tooltip: {
      ...appleTooltipBase,
      formatter: (params: unknown) => {
        const pArr = Array.isArray(params) ? params : [params];
        if (pArr.length === 0) return '';
        const title = pArr[0]?.axisValueLabel || '';
        let html = `<div style="font-weight:600;margin-bottom:6px;color:#1D1D1F;font-family:${FONT_FAMILY}">ช่วงเวลา ${title} น.</div>`;
        pArr.forEach((p: { seriesName?: string; value?: number; color?: string }) => {
          const isSales = p.seriesName?.includes('ยอดขาย');
          const valFormatted = isSales
            ? formatPrice(Number(p.value || 0))
            : `${p.value || 0} รายการ`;
          const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>`;
          html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:4px;font-size:12px;font-family:${FONT_FAMILY}">
            <span style="color:#6E6E73">${dot}${p.seriesName}</span>
            <span style="font-weight:600;color:#1D1D1F;font-variant-numeric:tabular-nums">${valFormatted}</span>
          </div>`;
        });
        return html;
      },
    },
    legend: {
      show: true,
      top: 0,
      right: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: {
        fontFamily: FONT_FAMILY,
        color: APPLE_COLORS.ink,
        fontSize: 12,
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: APPLE_COLORS.hairline } },
      axisTick: { show: false },
      axisLabel: {
        color: APPLE_COLORS.mutedLight,
        fontFamily: FONT_FAMILY,
        fontSize: 11,
      },
    },
    yAxis: [
      {
        type: 'value',
        ...(activeView.value !== 'sales'
          ? {
              name: 'ออเดอร์',
              nameTextStyle: {
                color: APPLE_COLORS.primary,
                fontFamily: FONT_FAMILY,
                fontSize: 11,
                align: 'left' as const,
              },
            }
          : {}),
        splitLine: {
          lineStyle: {
            color: '#F5F5F7',
          },
        },
        axisLabel: {
          color: APPLE_COLORS.mutedLight,
          fontFamily: FONT_FAMILY,
          fontSize: 11,
        },
      },
      ...(activeView.value === 'dual'
        ? [
            {
              type: 'value' as const,
              name: 'ยอดขาย (฿)',
              nameTextStyle: {
                color: APPLE_COLORS.muted,
                fontFamily: FONT_FAMILY,
                fontSize: 11,
                align: 'right' as const,
              },
              splitLine: { show: false },
              axisLabel: {
                formatter: (val: number) => `฿${val}`,
                color: APPLE_COLORS.muted,
                fontFamily: FONT_FAMILY,
                fontSize: 11,
              },
            },
          ]
        : []),
    ],
    series,
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

.peak-banner {
  background: #fafafc;
  border: 1px solid #e8e8ed;
  border-radius: 12px;
  padding: 10px 16px;
}

.peak-icon-pill {
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
  height: 280px;
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

/* Meal Periods Grid */
.meal-periods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.meal-card {
  background: #ffffff;
  border: 1px solid #e8e8ed;
  border-radius: 14px;
  padding: 12px 14px;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.meal-card:hover {
  transform: translateY(-2px);
  border-color: #0071e3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.meal-card--highlight {
  border-color: #0071e3;
  background: #fbfdff;
}

.meal-title {
  font-size: 0.86rem;
  color: #1d1d1f;
}

.meal-percent {
  font-size: 0.88rem;
}

.meal-progress-track {
  width: 100%;
  height: 4px;
  background: #e8e8ed;
  border-radius: 2px;
  overflow: hidden;
}

.meal-progress-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.font-mono {
  font-family: var(--app-font-mono, 'Inter', sans-serif);
  font-variant-numeric: tabular-nums;
}
</style>
