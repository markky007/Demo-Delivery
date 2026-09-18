<template>
  <div class="apple-card">
    <div class="row items-center justify-between q-mb-md header-row">
      <div>
        <div class="row items-center q-gutter-xs">
          <q-icon name="show_chart" color="primary" size="22px" />
          <span class="card-title">ช่วงเวลาออเดอร์ & ยอดขาย (Peak Time)</span>
        </div>
        <div class="card-subtitle">
          วิเคราะห์ความหนาแน่นของออเดอร์และยอดขายในแต่ละชั่วโมงของวันนี้
        </div>
      </div>

      <!-- Apple-style Segmented Toggle Buttons -->
      <div class="segmented-control">
        <button
          type="button"
          class="segmented-btn"
          :class="{ 'segmented-btn--active': activeView === 'dual' }"
          @click="activeView = 'dual'"
        >
          ดูรวมสองแบบ
        </button>
        <button
          type="button"
          class="segmented-btn"
          :class="{ 'segmented-btn--active': activeView === 'orders' }"
          @click="activeView = 'orders'"
        >
          จำนวนออเดอร์
        </button>
        <button
          type="button"
          class="segmented-btn"
          :class="{ 'segmented-btn--active': activeView === 'sales' }"
          @click="activeView = 'sales'"
        >
          ยอดขาย (฿)
        </button>
      </div>
    </div>

    <!-- Peak Time Highlight Banner -->
    <div v-if="peakHourInfo && peakHourInfo.orderCount > 0" class="peak-banner q-mb-md">
      <div class="row items-center justify-between">
        <div class="row items-center q-gutter-sm">
          <span class="peak-icon">🔥</span>
          <div>
            <span class="text-weight-semibold text-ink">ช่วงเวลาพีคที่สุด: </span>
            <span class="text-weight-bold text-primary font-mono text-subtitle2">{{
              peakHourInfo.label
            }}</span>
          </div>
        </div>
        <div class="row items-center q-gutter-md text-caption">
          <div class="row items-center q-gutter-xs">
            <span class="text-muted">ออเดอร์:</span>
            <span class="text-weight-bold text-ink font-mono">
              {{ peakHourInfo.orderCount }} รายการ
            </span>
          </div>
          <div class="row items-center q-gutter-xs">
            <span class="text-muted">ยอดขาย:</span>
            <span class="text-weight-bold text-ink font-mono">
              {{ formatPrice(peakHourInfo.totalSales) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ECharts Vector Canvas Area -->
    <div class="chart-wrapper">
      <VChart v-if="!isEmpty" class="echarts-view" :option="chartOption" autoresize />

      <!-- Empty State Overlay if no orders yet -->
      <div v-else class="empty-overlay">
        <q-icon name="query_builder" size="40px" color="grey-5" />
        <div class="text-caption text-muted q-mt-sm">ยังไม่มีข้อมูลออเดอร์สำหรับวันนี้</div>
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
import { APPLE_COLORS, FONT_FAMILY, appleTooltipBase } from 'src/utils/appleChartTheme';

export interface HourlyDataPoint {
  hour: number;
  label: string;
  orderCount: number;
  totalSales: number;
}

const props = defineProps<{
  hourlyData: HourlyDataPoint[];
}>();

const activeView = ref<'dual' | 'orders' | 'sales'>('dual');

const isEmpty = computed(() => {
  if (!props.hourlyData || props.hourlyData.length === 0) return true;
  return props.hourlyData.every((d) => d.orderCount === 0 && d.totalSales === 0);
});

// Identify the peak hour
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
      symbolSize: 7,
      itemStyle: {
        color: APPLE_COLORS.primary,
        borderColor: '#ffffff',
        borderWidth: 2,
      },
      lineStyle: {
        width: 2.75,
        color: APPLE_COLORS.primary,
        shadowColor: 'rgba(0, 113, 227, 0.2)',
        shadowBlur: 8,
        shadowOffsetY: 4,
      },
      areaStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(0, 113, 227, 0.24)' },
          { offset: 0.8, color: 'rgba(0, 113, 227, 0.02)' },
          { offset: 1, color: 'rgba(0, 113, 227, 0)' },
        ]),
      },
    });
  }

  // Series 2: Sales (Apple Green / Emerald)
  if (activeView.value === 'dual' || activeView.value === 'sales') {
    series.push({
      name: 'ยอดขาย (บาท)',
      type: 'line',
      yAxisIndex: activeView.value === 'dual' ? 1 : 0,
      data: salesAmounts,
      smooth: 0.35,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 7,
      itemStyle: {
        color: APPLE_COLORS.greenDark,
        borderColor: '#ffffff',
        borderWidth: 2,
      },
      lineStyle: {
        width: 2.75,
        color: APPLE_COLORS.greenDark,
        type: activeView.value === 'dual' ? 'dashed' : 'solid',
        shadowColor: 'rgba(19, 115, 51, 0.15)',
        shadowBlur: 8,
        shadowOffsetY: 4,
      },
      ...(activeView.value === 'sales'
        ? {
            areaStyle: {
              color: new graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(19, 115, 51, 0.22)' },
                { offset: 0.8, color: 'rgba(19, 115, 51, 0.02)' },
                { offset: 1, color: 'rgba(19, 115, 51, 0)' },
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
                color: APPLE_COLORS.greenDark,
                fontFamily: FONT_FAMILY,
                fontSize: 11,
                align: 'right' as const,
              },
              splitLine: { show: false },
              axisLabel: {
                formatter: (val: number) => `฿${val}`,
                color: APPLE_COLORS.greenDark,
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

.segmented-control {
  background: #f5f5f7;
  padding: 3px;
  border-radius: 980px;
  display: inline-flex;
  gap: 2px;
  border: 1px solid #e8e8ed;
}

.segmented-btn {
  border: none;
  background: transparent;
  color: #6e6e73;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 5px 14px;
  border-radius: 980px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
}

.segmented-btn:hover {
  color: #1d1d1f;
}

.segmented-btn--active {
  background: #ffffff;
  color: #0071e3;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.peak-banner {
  background: #fafafc;
  border: 1px solid #e8e8ed;
  border-radius: 16px;
  padding: 12px 18px;
}

.peak-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.chart-wrapper {
  position: relative;
  height: 310px;
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
  border-radius: 18px;
}

.text-ink {
  color: #1d1d1f;
}

.text-muted {
  color: #6e6e73;
}
</style>
