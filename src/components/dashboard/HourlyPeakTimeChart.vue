<template>
  <div class="chart-card">
    <div class="row items-center justify-between q-mb-md header-row">
      <div>
        <div class="row items-center q-gutter-xs">
          <q-icon name="show_chart" color="primary" size="22px" />
          <span class="text-subtitle1 text-weight-bold">ช่วงเวลาออเดอร์ & ยอดขาย (Peak Time)</span>
        </div>
        <div class="text-caption text-grey-7">
          วิเคราะห์ความหนาแน่นของออเดอร์และยอดขายในแต่ละชั่วโมงของวันนี้
        </div>
      </div>

      <!-- Mode Toggle Buttons -->
      <div class="row items-center q-gutter-xs mode-toggle-group">
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

    <!-- Peak Time Highlight Banner -->
    <div v-if="peakHourInfo && peakHourInfo.orderCount > 0" class="peak-banner q-mb-md">
      <div class="row items-center justify-between">
        <div class="row items-center q-gutter-sm">
          <span class="peak-icon">🔥</span>
          <div>
            <span class="text-weight-bold text-dark">ช่วงเวลาพีคที่สุด: </span>
            <span class="text-weight-bold text-primary font-mono text-subtitle2">{{
              peakHourInfo.label
            }}</span>
          </div>
        </div>
        <div class="row items-center q-gutter-md text-caption">
          <div class="row items-center q-gutter-xs">
            <span class="text-grey-7">ออเดอร์:</span>
            <span class="text-weight-bold text-dark font-mono"
              >{{ peakHourInfo.orderCount }} รายการ</span
            >
          </div>
          <div class="row items-center q-gutter-xs">
            <span class="text-grey-7">ยอดขาย:</span>
            <span class="text-weight-bold text-positive font-mono">{{
              formatPrice(peakHourInfo.totalSales)
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Chart Canvas Area -->
    <div class="chart-wrapper">
      <canvas ref="canvasRef"></canvas>

      <!-- Empty State Overlay if no orders yet -->
      <div v-if="isEmpty" class="empty-overlay">
        <q-icon name="query_builder" size="40px" color="grey-5" />
        <div class="text-caption text-grey-6 q-mt-sm">ยังไม่มีข้อมูลออเดอร์สำหรับวันนี้</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import type { ChartConfiguration, ChartDataset } from 'chart.js';
import { formatPrice } from 'src/utils/formatters';

export interface HourlyDataPoint {
  hour: number; // 0..23
  label: string; // "12:00"
  orderCount: number;
  totalSales: number;
}

const props = defineProps<{
  hourlyData: HourlyDataPoint[];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

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

function initOrUpdateChart() {
  if (!canvasRef.value) return;

  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  const labels = props.hourlyData.map((d) => d.label);
  const orderCounts = props.hourlyData.map((d) => d.orderCount);
  const salesAmounts = props.hourlyData.map((d) => d.totalSales);

  // Gradient for Orders (Light Blue / Primary)
  const orderGradient = ctx.createLinearGradient(0, 0, 0, 260);
  orderGradient.addColorStop(0, 'rgba(25, 118, 210, 0.28)');
  orderGradient.addColorStop(1, 'rgba(25, 118, 210, 0.01)');

  // Gradient for Sales (Teal / Green)
  const salesGradient = ctx.createLinearGradient(0, 0, 0, 260);
  salesGradient.addColorStop(0, 'rgba(46, 125, 50, 0.22)');
  salesGradient.addColorStop(1, 'rgba(46, 125, 50, 0.01)');

  const datasets: ChartDataset<'line'>[] = [];

  if (activeView.value === 'dual' || activeView.value === 'orders') {
    datasets.push({
      type: 'line' as const,
      label: 'จำนวนออเดอร์ (รายการ)',
      data: orderCounts,
      borderColor: '#1976D2',
      backgroundColor: orderGradient,
      borderWidth: 2.5,
      pointBackgroundColor: '#1976D2',
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
      borderColor: '#2e7d32',
      backgroundColor: salesGradient,
      borderWidth: 2.5,
      borderDash: activeView.value === 'dual' ? [4, 4] : [],
      pointBackgroundColor: '#2e7d32',
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
            font: {
              family: 'Prompt, sans-serif',
              size: 12,
            },
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
            color: '#1976D2',
          },
        },
        ySales: {
          type: 'linear',
          display: activeView.value === 'dual',
          position: 'right',
          beginAtZero: true,
          grid: {
            drawOnChartArea: false, // only want grid on left axis
          },
          ticks: {
            callback: (val) => (typeof val === 'number' ? `฿${val}` : `฿${String(val)}`),
            font: { family: 'Prompt, sans-serif', size: 11 },
            color: '#2e7d32',
          },
          title: {
            display: true,
            text: 'ยอดขาย (บาท)',
            font: { family: 'Prompt, sans-serif', size: 11 },
            color: '#2e7d32',
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
.chart-card {
  background: #ffffff;
  border-radius: var(--radius-md, 12px);
  border: 1px solid var(--color-border, #e2e8f0);
  padding: 20px;
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.05));
}

.header-row {
  flex-wrap: wrap;
  gap: 12px;
}

.mode-toggle-group {
  background: #f1f5f9;
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
  height: 280px;
  width: 100%;
}

.empty-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.88);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}
</style>
