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

    <!-- Chart Canvas Area -->
    <div class="chart-wrapper q-mb-md">
      <canvas ref="canvasRef"></canvas>

      <!-- Empty State Overlay -->
      <div v-if="isEmpty" class="empty-overlay">
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

  // Gradient for Action Blue
  const blueGradient = ctx.createLinearGradient(0, 0, 0, 260);
  blueGradient.addColorStop(0, 'rgba(0, 113, 227, 0.20)');
  blueGradient.addColorStop(1, 'rgba(0, 113, 227, 0.00)');

  // Gradient for Slate / Neutral
  const slateGradient = ctx.createLinearGradient(0, 0, 0, 260);
  slateGradient.addColorStop(0, 'rgba(134, 134, 139, 0.16)');
  slateGradient.addColorStop(1, 'rgba(134, 134, 139, 0.00)');

  const datasets: ChartDataset<'line'>[] = [];

  if (activeView.value === 'dual' || activeView.value === 'orders') {
    datasets.push({
      type: 'line' as const,
      label: 'จำนวนออเดอร์ (รายการ)',
      data: orderCounts,
      borderColor: '#0071e3',
      backgroundColor: blueGradient,
      borderWidth: 2.2,
      pointBackgroundColor: '#0071e3',
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
      borderColor: activeView.value === 'dual' ? '#86868b' : '#0071e3',
      backgroundColor: activeView.value === 'sales' ? blueGradient : slateGradient,
      borderWidth: 2.2,
      borderDash: activeView.value === 'dual' ? [4, 4] : [],
      pointBackgroundColor: activeView.value === 'dual' ? '#86868b' : '#0071e3',
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
            font: { family: 'Inter, LINE Seed Sans TH, Prompt, sans-serif', size: 12 },
            color: '#1d1d1f',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(29, 29, 31, 0.94)',
          titleFont: {
            family: 'Inter, LINE Seed Sans TH, Prompt, sans-serif',
            size: 12,
            weight: 'bold',
          },
          bodyFont: { family: 'Inter, LINE Seed Sans TH, Prompt, sans-serif', size: 11 },
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
            font: { family: 'Inter, LINE Seed Sans TH, Prompt, sans-serif', size: 11 },
            color: '#86868b',
          },
        },
        yOrders: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          grid: {
            color: '#f5f5f7',
          },
          ticks: {
            precision: 0,
            font: { family: 'Inter, sans-serif', size: 11 },
            color: '#0071e3',
          },
          title: {
            display: activeView.value !== 'sales',
            text: 'จำนวนออเดอร์',
            font: { family: 'Inter, LINE Seed Sans TH, Prompt, sans-serif', size: 11 },
            color: '#0071e3',
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
            font: { family: 'Inter, sans-serif', size: 11 },
            color: '#86868b',
          },
          title: {
            display: true,
            text: 'ยอดขาย (บาท)',
            font: { family: 'Inter, LINE Seed Sans TH, Prompt, sans-serif', size: 11 },
            color: '#86868b',
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
