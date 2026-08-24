<template>
  <div class="analytics-card">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md header-row">
      <div>
        <div class="row items-center q-gutter-xs">
          <q-icon name="calendar_view_week" color="primary" size="22px" />
          <span class="text-subtitle1 text-weight-bold">
            แนวโน้ม & ค่าเฉลี่ยตามวันในสัปดาห์ (Day-of-Week Trends)
          </span>
        </div>
        <div class="text-caption text-grey-7">
          เปรียบเทียบยอดขายเฉลี่ยและสัดส่วนรายได้ในแต่ละวันทำการ (จันทร์ - เสาร์ •
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
          :options="[
            { label: 'ยอดขายเฉลี่ย (฿/วัน)', value: 'avg_sales' },
            { label: 'ยอดขายรวมสะสม (฿)', value: 'total_sales' },
            { label: 'จำนวนออเดอร์ (รายการ)', value: 'orders' },
          ]"
        />
      </div>
    </div>

    <!-- Weekday vs Weekend Comparison Banner -->
    <div v-if="hasData" class="comparison-banner q-mb-md">
      <div class="row items-center justify-between flex-wrap q-gutter-y-xs">
        <div class="row items-center q-gutter-sm">
          <div class="comp-icon-box">
            <q-icon name="insights" size="20px" color="primary" />
          </div>
          <div>
            <span class="text-weight-bold text-dark"
              >เปรียบเทียบต้น-กลางสัปดาห์ vs ปลายสัปดาห์:
            </span>
            <span class="text-caption text-grey-8">
              จันทร์-พฤหัสบดี เฉลี่ย
              <strong class="font-mono text-dark">{{
                formatPrice(weekdayVsWeekend.weekdayAvgSales)
              }}</strong>
              /วัน | ศุกร์-เสาร์ เฉลี่ย
              <strong class="font-mono text-dark">{{
                formatPrice(weekdayVsWeekend.weekendAvgSales)
              }}</strong>
              /วัน
            </span>
          </div>
        </div>

        <div v-if="weekdayVsWeekend.diffPercentage > 0" class="row items-center q-gutter-xs">
          <q-badge
            :color="weekdayVsWeekend.higherType === 'weekend' ? 'positive' : 'info'"
            rounded
            class="q-px-sm q-py-xs"
          >
            <q-icon
              :name="weekdayVsWeekend.higherType === 'weekend' ? 'trending_up' : 'trending_flat'"
              size="14px"
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

    <!-- Chart Canvas Area -->
    <div class="chart-wrapper q-mb-md">
      <canvas ref="canvasRef"></canvas>

      <!-- Empty state overlay -->
      <div v-if="!hasData" class="empty-overlay">
        <q-icon name="event_busy" size="40px" color="grey-5" />
        <div class="text-caption text-grey-6 q-mt-sm">ยังไม่มีข้อมูลยอดขายในช่วงเวลานี้</div>
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
              🔥 สูงสุด
            </span>
            <span
              v-else-if="idx === sortedDays.length - 1 && day.totalSales > 0"
              class="rank-tag rank-tag--slow"
            >
              📉 ช้าสุด
            </span>
          </div>
          <span class="text-caption text-grey-7 font-mono font-weight-bold">
            {{ day.salesPercentage }}%
          </span>
        </div>

        <div class="day-stat-row">
          <span class="text-caption text-grey-7">เฉลี่ยต่อวัน:</span>
          <span class="text-weight-bold font-mono text-primary">{{
            formatPrice(day.avgSales)
          }}</span>
        </div>

        <div class="day-stat-row text-caption text-grey-7">
          <span>ยอดรวมสะสม:</span>
          <span class="font-mono text-dark">{{ formatPrice(day.totalSales) }}</span>
        </div>

        <div class="day-stat-row text-caption text-grey-7">
          <span>ออเดอร์เฉลี่ย:</span>
          <span class="font-mono text-dark">{{ day.avgOrders }} รายการ/วัน</span>
        </div>

        <!-- Progress Bar for visual share -->
        <div class="day-progress-track q-mt-xs">
          <div
            class="day-progress-bar"
            :style="{
              width: `${day.salesPercentage}%`,
              background:
                idx === 0 ? 'var(--color-primary, #e05836)' : 'var(--color-status-queued, #0284c7)',
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
import type { ChartConfiguration } from 'chart.js';
import { formatPrice } from 'src/utils/formatters';
import type { DayOfWeekDataPoint } from 'src/services/salesAnalyticsService';

const props = defineProps<{
  dayOfWeekData: DayOfWeekDataPoint[];
  weekdayVsWeekend: {
    weekdayAvgSales: number;
    weekendAvgSales: number;
    diffPercentage: number;
    higherType: 'weekend' | 'weekday' | 'equal';
  };
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const activeMetric = ref<'avg_sales' | 'total_sales' | 'orders'>('avg_sales');

const hasData = computed(() => {
  if (!props.dayOfWeekData || props.dayOfWeekData.length === 0) return false;
  return props.dayOfWeekData.some((d) => d.totalSales > 0 || d.totalOrders > 0);
});

// Sort days by average sales for ranking list
const sortedDays = computed(() => {
  return [...props.dayOfWeekData].sort((a, b) => b.avgSales - a.avgSales);
});

function initOrUpdateChart() {
  if (!canvasRef.value) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  const labels = props.dayOfWeekData.map((d) => d.dayName);

  let dataValues: number[];
  let yAxisLabel: string;
  let datasetLabel: string;

  if (activeMetric.value === 'avg_sales') {
    dataValues = props.dayOfWeekData.map((d) => d.avgSales);
    yAxisLabel = 'ยอดขายเฉลี่ย (บาท/วัน)';
    datasetLabel = 'ยอดขายเฉลี่ยต่อวัน (฿)';
  } else if (activeMetric.value === 'total_sales') {
    dataValues = props.dayOfWeekData.map((d) => d.totalSales);
    yAxisLabel = 'ยอดขายรวมสะสม (บาท)';
    datasetLabel = 'ยอดขายรวมสะสม (฿)';
  } else {
    dataValues = props.dayOfWeekData.map((d) => d.avgOrders);
    yAxisLabel = 'จำนวนออเดอร์เฉลี่ย (รายการ/วัน)';
    datasetLabel = 'จำนวนออเดอร์เฉลี่ยต่อวัน';
  }

  // Find max value to highlight peak bar
  const maxVal = Math.max(...dataValues, 1);

  // Background colors: Warm terracotta for peak day, soft warm orange/blue for other days
  const bgColors = dataValues.map((val) => {
    if (val === maxVal && val > 0) {
      return 'rgba(224, 88, 54, 0.9)'; // Primary Brand
    }
    return 'rgba(224, 88, 54, 0.45)';
  });

  const borderColors = dataValues.map((val) => {
    if (val === maxVal && val > 0) {
      return '#c84323';
    }
    return '#e05836';
  });

  const config: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: datasetLabel,
          data: dataValues,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.55,
          categoryPercentage: 0.8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(30, 41, 59, 0.92)',
          titleFont: { family: 'Prompt, sans-serif', size: 13, weight: 'bold' },
          bodyFont: { family: 'Prompt, sans-serif', size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            title: (items) => {
              const item = items[0];
              if (!item) return '';
              const day = props.dayOfWeekData[item.dataIndex];
              return day ? `${day.dayName} (มี ${day.daysCount} วันในช่วงนี้)` : '';
            },
            label: (item) => {
              const idx = item.dataIndex;
              const day = props.dayOfWeekData[idx];
              if (!day) return '';

              if (activeMetric.value === 'avg_sales') {
                return [
                  ` ยอดขายเฉลี่ย: ${formatPrice(day.avgSales)}/วัน`,
                  ` ยอดขายสะสม: ${formatPrice(day.totalSales)} (${day.salesPercentage}%)`,
                  ` ออเดอร์เฉลี่ย: ${day.avgOrders} รายการ/วัน`,
                ];
              } else if (activeMetric.value === 'total_sales') {
                return [
                  ` ยอดขายสะสม: ${formatPrice(day.totalSales)} (${day.salesPercentage}%)`,
                  ` ยอดขายเฉลี่ย: ${formatPrice(day.avgSales)}/วัน`,
                  ` จำนวนบิลรวม: ${day.billCount} บิล`,
                ];
              } else {
                return [
                  ` ออเดอร์เฉลี่ย: ${day.avgOrders} รายการ/วัน`,
                  ` ออเดอร์สะสม: ${day.totalOrders} รายการ`,
                  ` ยอดขายเฉลี่ย: ${formatPrice(day.avgSales)}/วัน`,
                ];
              }
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
            font: { family: 'Prompt, sans-serif', size: 12, weight: 'bold' },
            color: '#475569',
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f1f5f9',
          },
          ticks: {
            font: { family: 'Prompt, sans-serif', size: 11 },
            color: '#64748b',
            callback: (val) => {
              if (activeMetric.value === 'orders') {
                return `${val} รายการ`;
              }
              return typeof val === 'number' && val >= 1000
                ? `฿${(val / 1000).toFixed(0)}k`
                : `฿${val}`;
            },
          },
          title: {
            display: true,
            text: yAxisLabel,
            font: { family: 'Prompt, sans-serif', size: 11 },
            color: '#64748b',
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
  () => [props.dayOfWeekData, activeMetric.value],
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

.comparison-banner {
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border: 1px solid #fed7aa;
  border-radius: var(--radius-sm, 10px);
  padding: 10px 14px;
}

.comp-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #ffffff;
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

/* Day Ranking Grid */
.day-ranking-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.day-card {
  background: var(--color-surface-subtle, #f5efe9);
  border: 1px solid var(--color-border, #ede5dc);
  border-radius: var(--radius-sm, 10px);
  padding: 10px 12px;
  transition: all 0.15s ease;
}

.day-card:hover {
  background: #ffffff;
  border-color: var(--color-primary-tint, #ffe6dc);
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.04));
}

.day-card--best {
  border-left: 3px solid var(--color-primary, #e05836);
  background: #fff8f5;
}

.day-card--slow {
  border-left: 3px solid var(--color-status-served, #64748b);
}

.day-badge-name {
  font-size: 0.86rem;
  color: var(--color-text-primary, #2d231e);
}

.rank-tag {
  font-size: 0.68rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.rank-tag--best {
  background: #fee2e2;
  color: #dc2626;
}

.rank-tag--slow {
  background: #f1f5f9;
  color: #64748b;
}

.day-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  margin-top: 2px;
}

.day-progress-track {
  width: 100%;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.day-progress-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
