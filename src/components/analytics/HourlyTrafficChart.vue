<template>
  <div class="analytics-card">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md header-row">
      <div>
        <div class="row items-center q-gutter-xs">
          <q-icon name="schedule" color="primary" size="22px" />
          <span class="text-subtitle1 text-weight-bold">
            ช่วงเวลาขายดี & ความหนาแน่นรายชั่วโมง (Hourly Peak Trends)
          </span>
        </div>
        <div class="text-caption text-grey-7">
          วิเคราะห์แนวโน้มช่วงเวลาที่ลูกค้าสั่งอาหารและยอดขายเฉลี่ยตลอดทั้งวัน (11:00 - 23:00 น.)
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
          <span class="peak-icon">🔥</span>
          <div>
            <span class="text-weight-bold text-dark">ช่วงเวลาที่ลูกค้าเยอะที่สุด: </span>
            <span class="text-weight-bold text-primary font-mono text-subtitle2">{{
              peakHourInfo.label
            }}</span>
          </div>
        </div>
        <div class="row items-center q-gutter-md text-caption">
          <div class="row items-center q-gutter-xs">
            <span class="text-grey-7">ออเดอร์รวม:</span>
            <span class="text-weight-bold text-dark font-mono"
              >{{ peakHourInfo.orderCount }} รายการ</span
            >
          </div>
          <div class="row items-center q-gutter-xs">
            <span class="text-grey-7">ยอดขายรวม:</span>
            <span class="text-weight-bold text-positive font-mono">{{
              formatPrice(peakHourInfo.totalSales)
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Chart Canvas Area -->
    <div class="chart-wrapper q-mb-md">
      <canvas ref="canvasRef"></canvas>

      <!-- Empty State Overlay -->
      <div v-if="isEmpty" class="empty-overlay">
        <q-icon name="query_builder" size="40px" color="grey-5" />
        <div class="text-caption text-grey-6 q-mt-sm">ยังไม่มีข้อมูลออเดอร์ในช่วงเวลานี้</div>
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
            <q-icon :name="period.icon" size="18px" color="primary" />
            <span class="meal-title text-weight-bold">{{ period.title }}</span>
          </div>
          <span class="meal-percent font-mono text-weight-bold text-primary">
            {{ period.salesPercentage }}%
          </span>
        </div>

        <div class="text-caption text-grey-7 q-mb-xs">{{ period.timeRange }}</div>

        <div class="row items-center justify-between text-caption">
          <span class="text-grey-7">ยอดขายรวม:</span>
          <span class="text-weight-bold text-dark font-mono">{{
            formatPrice(period.totalSales)
          }}</span>
        </div>

        <div class="row items-center justify-between text-caption text-grey-7">
          <span>ออเดอร์:</span>
          <span class="font-mono text-dark">{{ period.orderCount }} รายการ</span>
        </div>

        <!-- Progress bar for meal period share -->
        <div class="meal-progress-track q-mt-xs">
          <div
            class="meal-progress-bar"
            :style="{
              width: `${period.salesPercentage}%`,
              background:
                period.salesPercentage >= 30
                  ? 'var(--color-primary, #e05836)'
                  : 'var(--color-status-queued, #0284c7)',
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import type { ChartConfiguration, ChartDataset } from 'chart.js';
import { formatPrice } from 'src/utils/formatters';
import type { HourlyDataPoint, MealPeriodSummary } from 'src/services/salesAnalyticsService';

const props = defineProps<{
  hourlyData: HourlyDataPoint[];
  mealPeriods: MealPeriodSummary[];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

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

function initOrUpdateChart() {
  if (!canvasRef.value) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  const labels = props.hourlyData.map((d) => d.label);
  const orderCounts = props.hourlyData.map((d) => d.orderCount);
  const salesAmounts = props.hourlyData.map((d) => d.totalSales);

  // Gradient for Orders (Blue)
  const orderGradient = ctx.createLinearGradient(0, 0, 0, 260);
  orderGradient.addColorStop(0, 'rgba(2, 132, 199, 0.28)');
  orderGradient.addColorStop(1, 'rgba(2, 132, 199, 0.01)');

  // Gradient for Sales (Warm Terracotta / Primary)
  const salesGradient = ctx.createLinearGradient(0, 0, 0, 260);
  salesGradient.addColorStop(0, 'rgba(224, 88, 54, 0.28)');
  salesGradient.addColorStop(1, 'rgba(224, 88, 54, 0.01)');

  const datasets: ChartDataset<'line'>[] = [];

  if (activeView.value === 'dual' || activeView.value === 'orders') {
    datasets.push({
      type: 'line' as const,
      label: 'จำนวนออเดอร์ (รายการ)',
      data: orderCounts,
      borderColor: '#0284c7',
      backgroundColor: orderGradient,
      borderWidth: 2.5,
      pointBackgroundColor: '#0284c7',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: true,
      tension: 0.35,
      yAxisID: 'yOrders',
    });
  }

  if (activeView.value === 'dual' || activeView.value === 'sales') {
    datasets.push({
      type: 'line' as const,
      label: 'ยอดขาย (บาท)',
      data: salesAmounts,
      borderColor: '#e05836',
      backgroundColor: salesGradient,
      borderWidth: 2.5,
      borderDash: activeView.value === 'dual' ? [4, 4] : [],
      pointBackgroundColor: '#e05836',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: activeView.value === 'sales',
      tension: 0.35,
      yAxisID: activeView.value === 'dual' ? 'ySales' : 'yOrders',
    });
  }

  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { family: 'Prompt, sans-serif', size: 12 },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(30, 41, 59, 0.92)',
          titleFont: { family: 'Prompt, sans-serif', size: 13, weight: 'bold' },
          bodyFont: { family: 'Prompt, sans-serif', size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            title: (items) => {
              const label = items[0]?.label || '';
              return `ช่วงเวลา ${label} น.`;
            },
            label: (item) => {
              if (item.dataset.label?.includes('ยอดขาย')) {
                return ` ยอดขาย: ${formatPrice(Number(item.raw))}`;
              }
              return ` ออเดอร์: ${Number(item.raw)} รายการ`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: { family: 'Prompt, sans-serif', size: 11 },
            color: '#64748b',
          },
        },
        yOrders: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          grid: {
            color: '#f1f5f9',
          },
          ticks: {
            precision: 0,
            font: { family: 'Prompt, sans-serif', size: 11 },
            color: '#64748b',
          },
          title: {
            display: activeView.value !== 'sales',
            text: 'จำนวนออเดอร์',
            font: { family: 'Prompt, sans-serif', size: 11 },
            color: '#0284c7',
          },
        },
        ySales: {
          type: 'linear',
          display: activeView.value === 'dual',
          position: 'right',
          beginAtZero: true,
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            callback: (val) => (typeof val === 'number' ? `฿${val}` : `฿${String(val)}`),
            font: { family: 'Prompt, sans-serif', size: 11 },
            color: '#e05836',
          },
          title: {
            display: true,
            text: 'ยอดขาย (บาท)',
            font: { family: 'Prompt, sans-serif', size: 11 },
            color: '#e05836',
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
  () => [props.hourlyData, activeView.value],
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
.analytics-card {
  background: #ffffff;
  border-radius: var(--radius-md, 16px);
  border: 1px solid var(--color-border, #ede5dc);
  padding: 20px;
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.04));
}

.header-row {
  flex-wrap: wrap;
  gap: 12px;
}

.mode-toggle-group {
  background: var(--color-surface-subtle, #f5efe9);
  padding: 3px;
  border-radius: 20px;
}

.peak-banner {
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border: 1px solid #fed7aa;
  border-radius: 10px;
  padding: 10px 16px;
}

.peak-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.chart-wrapper {
  position: relative;
  height: 270px;
  width: 100%;
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
  background: var(--color-surface-subtle, #f5efe9);
  border: 1px solid var(--color-border, #ede5dc);
  border-radius: var(--radius-sm, 10px);
  padding: 12px;
  transition: all 0.15s ease;
}

.meal-card:hover {
  background: #ffffff;
  border-color: var(--color-primary-tint, #ffe6dc);
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.04));
}

.meal-card--highlight {
  border-left: 3px solid var(--color-primary, #e05836);
  background: #fff8f5;
}

.meal-title {
  font-size: 0.86rem;
  color: var(--color-text-primary, #2d231e);
}

.meal-percent {
  font-size: 0.88rem;
}

.meal-progress-track {
  width: 100%;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.meal-progress-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
