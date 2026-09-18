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

    <!-- Chart Canvas Area -->
    <div class="chart-wrapper q-mb-md">
      <canvas ref="canvasRef"></canvas>

      <!-- Empty state overlay -->
      <div v-if="!hasData" class="empty-overlay">
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

  // Apple Monochromatic + Action Blue
  const bgColors = dataValues.map((val) => {
    if (val === maxVal && val > 0) {
      return '#0071e3'; // Action Blue for peak day
    }
    return '#e8e8ed'; // Clean neutral for other days
  });

  const borderColors = dataValues.map((val) => {
    if (val === maxVal && val > 0) {
      return '#0071e3';
    }
    return '#d2d2d7';
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
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.52,
          categoryPercentage: 0.75,
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
              const item = items[0];
              if (!item) return '';
              const day = props.dayOfWeekData[item.dataIndex];
              return day
                ? `${day.dayName}${day.daysCount > 0 ? ` (มียอดขาย ${day.daysCount} วัน)` : ' (ยังไม่มียอดขาย)'}`
                : '';
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
            font: {
              family: 'Inter, LINE Seed Sans TH, Prompt, sans-serif',
              size: 12,
              weight: 'bold',
            },
            color: '#1d1d1f',
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f5f5f7',
          },
          ticks: {
            font: { family: 'Inter, sans-serif', size: 11 },
            color: '#86868b',
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
  border-radius: 20px;
  border: 1px solid #d2d2d7;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
}

.text-ink {
  color: #1d1d1f;
}

.text-body {
  color: #414143;
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
  padding: 10px 14px;
}

.comp-icon-box {
  width: 30px;
  height: 30px;
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

/* Day Ranking Grid */
.day-ranking-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.day-card {
  background: #ffffff;
  border: 1px solid #e8e8ed;
  border-radius: 12px;
  padding: 10px 12px;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.day-card:hover {
  transform: translateY(-2px);
  border-color: #0071e3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.day-card--best {
  border-left: 3px solid #0071e3;
  background: #fbfdff;
}

.day-card--slow {
  border-left: 3px solid #86868b;
}

.day-badge-name {
  font-size: 0.86rem;
  color: #1d1d1f;
}

.rank-tag {
  font-size: 0.68rem;
  padding: 2px 6px;
  border-radius: 980px;
  font-weight: 600;
}

.rank-tag--best {
  background: #f0f6ff;
  color: #0071e3;
}

.rank-tag--slow {
  background: #f5f5f7;
  color: #86868b;
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
