<template>
  <div class="apple-card">
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center q-gutter-xs">
        <q-icon name="pie_chart" color="primary" size="22px" />
        <span class="card-title">สัดส่วนยอดขายตามหมวดหมู่</span>
      </div>
      <div class="card-subtitle">{{ categories.length }} หมวดหมู่</div>
    </div>

    <!-- Empty State -->
    <div v-if="categories.length === 0" class="empty-box">
      <q-icon name="category" size="36px" color="grey-4" />
      <div class="text-caption text-muted q-mt-xs">ยังไม่มีข้อมูลหมวดหมู่อาหาร</div>
    </div>

    <!-- Chart & Custom Legend -->
    <div v-else class="row items-center q-col-gutter-md">
      <div class="col-12 col-sm-6">
        <div class="chart-wrapper">
          <VChart class="echarts-view" :option="chartOption" autoresize />
          <div class="donut-center-text">
            <div class="donut-label text-muted">ยอดขายรวม</div>
            <div class="donut-value font-mono text-ink">{{ formatPrice(totalSales) }}</div>
          </div>
        </div>
      </div>

      <div class="col-12 col-sm-6">
        <div class="category-legend-list">
          <div
            v-for="(cat, idx) in categories"
            :key="cat.name"
            class="legend-item row items-center justify-between"
          >
            <div class="row items-center q-gutter-xs ellipsis col">
              <span
                class="legend-dot"
                :style="{ backgroundColor: palette[idx % palette.length] }"
              ></span>
              <span class="legend-name text-ink ellipsis">{{ cat.name }}</span>
            </div>
            <div class="row items-center q-gutter-xs flex-shrink-0 text-right font-mono">
              <span class="text-caption text-weight-bold text-ink">
                {{ formatPrice(cat.sales) }}
              </span>
              <span class="text-caption text-muted"> ({{ getPercent(cat.sales) }}%) </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import type { EChartsOption } from 'echarts';
import { formatPrice } from 'src/utils/formatters';
import { APPLE_PALETTE, FONT_FAMILY, appleTooltipBase } from 'src/utils/appleChartTheme';

export interface CategoryData {
  name: string;
  sales: number;
  itemsCount: number;
}

const props = defineProps<{
  categories: CategoryData[];
}>();

const palette = APPLE_PALETTE;

const totalSales = computed(() => {
  return props.categories.reduce((sum, c) => sum + c.sales, 0);
});

function getPercent(sales: number): string {
  if (totalSales.value === 0) return '0';
  return ((sales / totalSales.value) * 100).toFixed(1);
}

const chartOption = computed<EChartsOption>(() => {
  const data = props.categories.map((c, i) => ({
    name: c.name,
    value: c.sales,
    itemStyle: {
      color: palette[i % palette.length] ?? '#0071E3',
      borderRadius: 6,
      borderColor: '#ffffff',
      borderWidth: 2,
    },
  }));

  return {
    renderer: 'svg',
    animationDuration: 750,
    animationEasing: 'cubicOut',
    tooltip: {
      ...appleTooltipBase,
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number; color: string };
        const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>`;
        return `<div style="font-family:${FONT_FAMILY}">
          <div style="font-weight:600;color:#1D1D1F;margin-bottom:4px;">${dot}${p.name}</div>
          <div style="display:flex;justify-content:space-between;gap:16px;color:#6E6E73;font-size:12px;">
            <span>ยอดขาย:</span>
            <strong style="color:#1D1D1F;font-variant-numeric:tabular-nums;">${formatPrice(p.value)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px;color:#6E6E73;font-size:12px;margin-top:2px;">
            <span>สัดส่วน:</span>
            <strong style="color:#0071E3;font-variant-numeric:tabular-nums;">${p.percent}%</strong>
          </div>
        </div>`;
      },
    },
    series: [
      {
        name: 'สัดส่วนหมวดหมู่',
        type: 'pie',
        radius: ['68%', '88%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 5,
        },
        data,
      },
    ],
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
  display: flex;
  flex-direction: column;
  height: 100%;
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

.chart-wrapper {
  position: relative;
  height: 190px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.echarts-view {
  width: 100%;
  height: 100%;
}

.donut-center-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.donut-label {
  font-size: 0.72rem;
  margin-bottom: 2px;
}

.donut-value {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.1;
}

.empty-box {
  min-height: 190px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.category-legend-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
}

.legend-item {
  padding: 6px 10px;
  border-radius: 12px;
  background: #fafafc;
  border: 1px solid #f0f0f4;
  font-size: 0.82rem;
}

.legend-name {
  font-weight: 500;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.text-ink {
  color: #1d1d1f;
}

.text-muted {
  color: #6e6e73;
}
</style>
