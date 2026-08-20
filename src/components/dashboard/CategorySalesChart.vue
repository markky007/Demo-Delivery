<template>
  <div class="chart-card">
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center q-gutter-xs">
        <q-icon name="pie_chart" color="teal-8" size="22px" />
        <span class="text-subtitle1 text-weight-bold">สัดส่วนยอดขายตามหมวดหมู่</span>
      </div>
      <div class="text-caption text-grey-7">{{ categories.length }} หมวดหมู่</div>
    </div>

    <!-- Empty State -->
    <div v-if="categories.length === 0" class="empty-box">
      <q-icon name="category" size="36px" color="grey-4" />
      <div class="text-caption text-grey-6 q-mt-xs">ยังไม่มีข้อมูลหมวดหมู่อาหาร</div>
    </div>

    <!-- Chart & Custom Legend -->
    <div v-else class="row items-center q-col-gutter-md">
      <div class="col-12 col-sm-6">
        <div class="chart-wrapper">
          <canvas ref="canvasRef"></canvas>
          <div class="donut-center-text">
            <div class="text-caption text-grey-6">ยอดขายรวม</div>
            <div class="text-weight-bold text-dark font-mono">{{ formatPrice(totalSales) }}</div>
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
              <span class="text-caption text-weight-medium text-dark ellipsis">{{ cat.name }}</span>
            </div>
            <div class="row items-center q-gutter-xs flex-shrink-0 text-right">
              <span class="text-caption text-weight-bold text-dark font-mono">
                {{ formatPrice(cat.sales) }}
              </span>
              <span class="text-caption text-grey-6 font-mono">
                ({{ getPercent(cat.sales) }}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';
import { formatPrice } from 'src/utils/formatters';

export interface CategoryData {
  name: string;
  sales: number;
  itemsCount: number;
}

const props = defineProps<{
  categories: CategoryData[];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const palette = [
  '#0288D1', // Cyan Blue
  '#00897B', // Teal
  '#F57C00', // Amber / Orange
  '#7B1FA2', // Purple
  '#E91E63', // Pink
  '#43A047', // Green
  '#5C6BC0', // Indigo
  '#8D6E63', // Brown
];

const totalSales = computed(() => {
  return props.categories.reduce((sum, c) => sum + c.sales, 0);
});

function getPercent(sales: number): string {
  if (totalSales.value === 0) return '0';
  return ((sales / totalSales.value) * 100).toFixed(1);
}

function initOrUpdateChart() {
  if (!canvasRef.value) return;
  if (!props.categories || props.categories.length === 0) return;

  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  const labels = props.categories.map((c) => c.name);
  const data = props.categories.map((c) => c.sales);
  const colors = props.categories.map((_, i) => palette[i % palette.length]);

  const config: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(30, 41, 59, 0.92)',
          titleFont: { family: 'Prompt, sans-serif', size: 12, weight: 'bold' },
          bodyFont: { family: 'Prompt, sans-serif', size: 11 },
          padding: 8,
          cornerRadius: 6,
          callbacks: {
            label: (context) => {
              const val = Number(context.raw);
              const pct = getPercent(val);
              return ` ยอดขาย: ${formatPrice(val)} (${pct}%)`;
            },
          },
        },
      },
    },
  };

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, config);
}

watch(
  () => props.categories,
  () => {
    void nextTick(() => {
      initOrUpdateChart();
    });
  },
  { deep: true },
);

onMounted(() => {
  void nextTick(() => {
    initOrUpdateChart();
  });
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
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

.chart-wrapper {
  position: relative;
  height: 180px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.donut-center-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.empty-box {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.category-legend-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 190px;
  overflow-y: auto;
  padding-right: 4px;
}

.legend-item {
  padding: 4px 6px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 0.82rem;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
</style>
