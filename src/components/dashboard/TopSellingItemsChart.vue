<template>
  <div class="chart-card">
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center q-gutter-xs">
        <q-icon name="military_tech" color="amber-9" size="22px" />
        <span class="text-subtitle1 text-weight-bold">5 อันดับเมนูขายดีประจำวัน</span>
      </div>
      <div class="text-caption text-grey-7">เรียงตามจำนวนจาน</div>
    </div>

    <!-- Empty State -->
    <div v-if="items.length === 0" class="empty-box">
      <q-icon name="lunch_dining" size="36px" color="grey-4" />
      <div class="text-caption text-grey-6 q-mt-xs">ยังไม่มีข้อมูลยอดขายเมนู</div>
    </div>

    <!-- Chart & List Container -->
    <div v-else>
      <div class="chart-wrapper">
        <canvas ref="canvasRef"></canvas>
      </div>

      <!-- Quick Ranking Badges List -->
      <div class="ranking-list q-mt-sm">
        <div
          v-for="(item, index) in items"
          :key="item.name"
          class="ranking-item row items-center justify-between"
        >
          <div class="row items-center q-gutter-sm ellipsis col">
            <span class="rank-badge" :class="'rank-badge--' + (index + 1)">#{{ index + 1 }}</span>
            <span class="text-weight-medium text-dark ellipsis">{{ item.name }}</span>
          </div>
          <div class="row items-center q-gutter-sm text-right flex-shrink-0">
            <span class="text-weight-bold text-dark font-mono">{{ item.quantity }} จาน</span>
            <span class="text-caption text-grey-7 font-mono"
              >({{ formatPrice(item.subtotal) }})</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';
import { formatPrice } from 'src/utils/formatters';

export interface TopMenuItem {
  name: string;
  quantity: number;
  subtotal: number;
}

const props = defineProps<{
  items: TopMenuItem[];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const barColors = [
  '#1976D2', // 1st - Primary Blue
  '#0288D1', // 2nd - Cyan Blue
  '#00897B', // 3rd - Teal
  '#F57C00', // 4th - Orange
  '#7B1FA2', // 5th - Purple
];

function initOrUpdateChart() {
  if (!canvasRef.value) return;
  if (!props.items || props.items.length === 0) return;

  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  // Horizontal bar needs reverse so #1 is at top
  const sorted = [...props.items].slice(0, 5);
  const labels = sorted.map((it) => it.name);
  const quantities = sorted.map((it) => it.quantity);
  const subtotals = sorted.map((it) => it.subtotal);

  const config: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'จำนวนที่ขาย (จาน)',
          data: quantities,
          backgroundColor: barColors.slice(0, sorted.length),
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.65,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
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
              const idx = context.dataIndex;
              const qty = quantities[idx];
              const price = formatPrice(subtotals[idx] ?? 0);
              return ` ${qty} จาน (รวม ${price})`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: '#f1f5f9',
          },
          ticks: {
            precision: 0,
            font: { family: 'Prompt, sans-serif', size: 10 },
            color: '#64748b',
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            font: { family: 'Prompt, sans-serif', size: 11 },
            color: '#334155',
            callback: function (val: string | number) {
              const label = this.getLabelForValue(Number(val));
              return label.length > 18 ? label.slice(0, 16) + '...' : label;
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
  () => props.items,
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
  height: 170px;
  width: 100%;
}

.empty-box {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px dashed var(--color-border, #e2e8f0);
  padding-top: 10px;
}

.ranking-item {
  padding: 4px 6px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 0.84rem;
}

.rank-badge {
  font-size: 0.72rem;
  font-weight: 700;
  width: 24px;
  height: 20px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #94a3b8;
}

.rank-badge--1 {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.rank-badge--2 {
  background: linear-gradient(135deg, #94a3b8, #64748b);
}

.rank-badge--3 {
  background: linear-gradient(135deg, #b45309, #78350f);
}
</style>
