<template>
  <div class="analytics-card">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md header-row">
      <div>
        <div class="row items-center q-gutter-xs">
          <q-icon name="restaurant_menu" color="primary" size="22px" />
          <span class="text-subtitle1 text-weight-bold">
            ประสิทธิภาพเมนู & รายการขายช้า (Menu Analytics)
          </span>
        </div>
        <div class="text-caption text-grey-7">
          วิเคราะห์เมนูยอดนิยม เมนูที่ทำรายได้สูงสุด เมนูขายช้า และสัดส่วนหมวดหมู่อาหาร
        </div>
      </div>

      <!-- Tab Switcher -->
      <div class="tab-switcher-pill">
        <q-tabs
          v-model="activeTab"
          dense
          no-caps
          active-color="white"
          active-bg-color="primary"
          indicator-color="transparent"
          class="matrix-tabs"
        >
          <q-tab name="best" icon="military_tech" label="เมนูขายดี (Top 10)" />
          <q-tab name="slow" icon="warning_amber" label="เมนูขายช้า / เสี่ยงสต็อกค้าง" />
          <q-tab name="categories" icon="pie_chart" label="สัดส่วนหมวดหมู่" />
          <q-tab name="addons" icon="add_circle" label="ท็อปปิ้งยอดฮิต" />
        </q-tabs>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- 1. TOP SELLING ITEMS TAB (CHART + RANKING LIST)           -->
    <!-- ========================================================= -->
    <div v-if="activeTab === 'best'">
      <div v-if="topSellingItems.length === 0" class="empty-tab-box text-center q-pa-xl">
        <q-icon name="restaurant" size="44px" color="grey-4" />
        <div class="text-caption text-grey-6 q-mt-sm">ยังไม่มีรายการสั่งอาหารในช่วงเวลานี้</div>
      </div>

      <div v-else>
        <!-- Top Controls: Mode Toggle & Subtext -->
        <div class="row items-center justify-between q-mb-md flex-wrap q-gutter-y-xs">
          <div class="text-caption text-grey-8">
            แสดง 10 อันดับเมนูที่มียอดขายสูงสุดในช่วงเวลาที่เลือก
          </div>
          <div class="top-menu-toggle-group">
            <q-btn-toggle
              v-model="topMenuSortBy"
              toggle-color="primary"
              flat
              dense
              rounded
              no-caps
              size="sm"
              :options="[
                { label: 'เรียงตามจำนวนจาน (จาน)', value: 'quantity' },
                { label: 'เรียงตามยอดขาย (฿)', value: 'revenue' },
              ]"
            />
          </div>
        </div>

        <!-- 2-Column Responsive Layout: Chart on Left, Ranked List on Right -->
        <div class="row q-col-gutter-lg items-start">
          <!-- Left: Horizontal Bar Chart -->
          <div class="col-12 col-md-7">
            <div class="top-chart-wrapper">
              <canvas ref="topMenuCanvasRef"></canvas>
            </div>
          </div>

          <!-- Right: Detailed Ranked Cards List -->
          <div class="col-12 col-md-5">
            <div class="ranked-items-container">
              <div
                v-for="(item, idx) in sortedTopItems"
                :key="item.id"
                class="ranked-item-card"
                :class="{ 'ranked-item-card--top3': idx < 3 }"
              >
                <div class="row items-center justify-between no-wrap q-mb-xs">
                  <div class="row items-center q-gutter-sm ellipsis">
                    <span class="rank-badge" :class="`rank-badge--${idx + 1}`">
                      #{{ idx + 1 }}
                    </span>
                    <div class="ellipsis">
                      <div class="text-weight-bold text-dark text-body2 ellipsis">
                        {{ item.name }}
                      </div>
                      <div class="text-caption text-grey-6">
                        {{ item.categoryName }} • พื้นฐาน {{ formatPrice(item.basePrice) }}
                      </div>
                    </div>
                  </div>

                  <div class="text-right flex-shrink-0 q-ml-sm">
                    <div class="text-weight-bold text-primary font-mono text-body2">
                      {{ formatPrice(item.totalRevenue) }}
                    </div>
                    <div class="text-caption text-grey-7 font-mono">
                      <strong>{{ item.quantitySold }}</strong> จาน ({{ item.revenueShare }}%)
                    </div>
                  </div>
                </div>

                <!-- Clean, Proportionate Progress Bar -->
                <div class="item-progress-track">
                  <div
                    class="item-progress-bar"
                    :style="{
                      width: `${getProportionPercentage(item)}%`,
                      background: getBarColor(idx),
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- 2. SLOW MOVING & ZERO SALES TAB                           -->
    <!-- ========================================================= -->
    <div v-else-if="activeTab === 'slow'">
      <div class="slow-banner q-mb-md">
        <div class="row items-center q-gutter-sm">
          <q-icon name="tips_and_updates" color="amber-9" size="22px" />
          <div class="text-caption text-grey-9">
            <strong>คำแนะนำสำหรับเจ้าของร้าน:</strong>
            เมนูที่มียอดขายน้อยหรือไม่มีคนสั่งเลย ควรพิจารณาปรับปรุงรูปภาพเมนูให้ดึงดูดขึ้น,
            จัดเซ็ตคอมโบ้คู่กับเมนูขายดี, หรือตัดออกจากเมนูเพื่อลดต้นทุนการสต็อกวัตถุดิบ
          </div>
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <!-- Zero sales items -->
        <div class="col-12 col-md-6">
          <div class="sub-section-card">
            <div class="row items-center justify-between q-mb-sm">
              <div class="row items-center q-gutter-xs">
                <q-icon name="cancel" color="negative" size="18px" />
                <span class="text-weight-bold text-dark">ไม่มีคนสั่งเลย (0 จาน)</span>
              </div>
              <q-badge color="negative" rounded class="q-px-xs">
                {{ zeroSalesItems.length }} เมนู
              </q-badge>
            </div>

            <div v-if="zeroSalesItems.length === 0" class="text-caption text-positive q-pa-sm">
              ✨ ยอดเยี่ยม! เมนูทั้งหมดมีออเดอร์เข้ามาในช่วงเวลานี้
            </div>

            <div v-else class="slow-items-list">
              <div
                v-for="item in zeroSalesItems"
                :key="item.id"
                class="slow-item-row row items-center justify-between"
              >
                <div>
                  <div class="text-weight-medium text-dark text-caption">{{ item.name }}</div>
                  <div class="text-grey-6 text-caption">{{ item.categoryName }}</div>
                </div>
                <div class="text-right">
                  <span class="text-negative text-caption text-weight-bold font-mono">0 จาน</span>
                  <div class="text-grey-6 text-caption">{{ formatPrice(item.basePrice) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Slow moving items (1-3 sold) -->
        <div class="col-12 col-md-6">
          <div class="sub-section-card">
            <div class="row items-center justify-between q-mb-sm">
              <div class="row items-center q-gutter-xs">
                <q-icon name="trending_down" color="warning" size="18px" />
                <span class="text-weight-bold text-dark">ขายได้น้อยมาก (1-3 จาน)</span>
              </div>
              <q-badge color="warning" text-color="dark" rounded class="q-px-xs">
                {{ slowMovingItems.length }} เมนู
              </q-badge>
            </div>

            <div v-if="slowMovingItems.length === 0" class="text-caption text-grey-6 q-pa-sm">
              ไม่พบเมนูที่มีการขายช้าผิดปกติ
            </div>

            <div v-else class="slow-items-list">
              <div
                v-for="item in slowMovingItems"
                :key="item.id"
                class="slow-item-row row items-center justify-between"
              >
                <div>
                  <div class="text-weight-medium text-dark text-caption">{{ item.name }}</div>
                  <div class="text-grey-6 text-caption">{{ item.categoryName }}</div>
                </div>
                <div class="text-right">
                  <span class="text-warning text-caption text-weight-bold font-mono">
                    ขายได้ {{ item.quantitySold }} จาน
                  </span>
                  <div class="text-grey-7 text-caption font-mono">
                    {{ formatPrice(item.totalRevenue) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- 3. CATEGORIES DISTRIBUTION TAB                            -->
    <!-- ========================================================= -->
    <div v-else-if="activeTab === 'categories'">
      <div class="row q-col-gutter-lg items-center">
        <div class="col-12 col-md-5">
          <div class="category-chart-wrapper">
            <canvas ref="categoryCanvasRef"></canvas>
          </div>
        </div>

        <div class="col-12 col-md-7">
          <div class="table-responsive">
            <table class="analytics-table">
              <thead>
                <tr>
                  <th>หมวดหมู่อาหาร</th>
                  <th class="text-right">จำนวนที่ขาย</th>
                  <th class="text-right">ยอดขายรวม</th>
                  <th class="text-right">สัดส่วนรายได้</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cat in categoryDistribution" :key="cat.id">
                  <td>
                    <div class="text-weight-bold text-dark">{{ cat.name }}</div>
                  </td>
                  <td class="text-right font-mono">
                    {{ cat.totalQuantity }} <span class="text-caption text-grey-6">จาน</span>
                  </td>
                  <td class="text-right font-mono text-weight-bold text-primary">
                    {{ formatPrice(cat.totalSales) }}
                  </td>
                  <td class="text-right font-mono text-weight-bold">{{ cat.percentage }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- 4. TOP ADD-ONS TAB                                        -->
    <!-- ========================================================= -->
    <div v-else-if="activeTab === 'addons'">
      <div v-if="topAddons.length === 0" class="empty-tab-box text-center q-pa-lg">
        <q-icon name="tune" size="36px" color="grey-5" />
        <div class="text-caption text-grey-6 q-mt-sm">ยังไม่มีรายการตัวเลือกเสริมในช่วงเวลานี้</div>
      </div>

      <div v-else class="row q-col-gutter-md">
        <div v-for="(addon, idx) in topAddons" :key="idx" class="col-12 col-sm-6 col-md-3">
          <div class="addon-card">
            <div class="row items-center justify-between q-mb-xs">
              <span class="addon-rank">#{{ idx + 1 }}</span>
              <q-badge color="grey-3" text-color="grey-9" class="q-px-xs text-caption">
                {{ addon.groupName }}
              </q-badge>
            </div>
            <div class="text-weight-bold text-dark text-body2 truncate-1 q-mb-xs">
              {{ addon.name }}
            </div>
            <div class="row items-center justify-between text-caption">
              <span class="text-grey-7">จำนวนสั่ง:</span>
              <span class="font-mono text-weight-bold text-primary">{{ addon.count }} ครั้ง</span>
            </div>
            <div class="row items-center justify-between text-caption">
              <span class="text-grey-7">รายได้เสริม:</span>
              <span class="font-mono text-weight-bold text-positive">{{
                formatPrice(addon.totalRevenue)
              }}</span>
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
import type {
  MenuItemPerformance,
  CategorySalesSummary,
  TopAddonOption,
} from 'src/services/salesAnalyticsService';

const props = defineProps<{
  topSellingItems: MenuItemPerformance[];
  slowMovingItems: MenuItemPerformance[];
  zeroSalesItems: MenuItemPerformance[];
  categoryDistribution: CategorySalesSummary[];
  topAddons: TopAddonOption[];
}>();

const activeTab = ref<'best' | 'slow' | 'categories' | 'addons'>('best');
const topMenuSortBy = ref<'quantity' | 'revenue'>('quantity');

// ─── Canvases & Chart Instances ─────────────────────────────────────────────
const topMenuCanvasRef = ref<HTMLCanvasElement | null>(null);
let topMenuChartInstance: Chart | null = null;

const categoryCanvasRef = ref<HTMLCanvasElement | null>(null);
let categoryChartInstance: Chart | null = null;

const TOP_MENU_COLORS = [
  '#e05836', // #1 Warm Terracotta (Brand)
  '#ea580c', // #2 Orange
  '#f59e0b', // #3 Amber
  '#0284c7', // #4 Sky Blue
  '#0d9488', // #5 Teal
  '#16a34a', // #6 Green
  '#9333ea', // #7 Purple
  '#4f46e5', // #8 Indigo
  '#64748b', // #9 Slate
  '#94a3b8', // #10 Light Slate
];

const CATEGORY_COLORS = [
  '#e05836',
  '#0284c7',
  '#16a34a',
  '#d97706',
  '#9333ea',
  '#0d9488',
  '#e11d48',
  '#64748b',
];

// Sort top items by user-selected metric (quantity or revenue)
const sortedTopItems = computed(() => {
  const list = [...props.topSellingItems];
  if (topMenuSortBy.value === 'revenue') {
    return list.sort((a, b) => b.totalRevenue - a.totalRevenue || b.quantitySold - a.quantitySold);
  }
  return list.sort((a, b) => b.quantitySold - a.quantitySold || b.totalRevenue - a.totalRevenue);
});

// Max value for accurate progress bar proportioning
const maxItemValue = computed(() => {
  if (sortedTopItems.value.length === 0) return 1;
  if (topMenuSortBy.value === 'revenue') {
    return Math.max(...sortedTopItems.value.map((it) => it.totalRevenue), 1);
  }
  return Math.max(...sortedTopItems.value.map((it) => it.quantitySold), 1);
});

function getProportionPercentage(item: MenuItemPerformance): number {
  const val = topMenuSortBy.value === 'revenue' ? item.totalRevenue : item.quantitySold;
  return Math.min(100, Math.max(8, Math.round((val / maxItemValue.value) * 100)));
}

function getBarColor(idx: number): string {
  return TOP_MENU_COLORS[idx] || '#64748b';
}

// ─── Initialize Top Selling Menu Horizontal Bar Chart ───────────────────────
function initTopMenuChart() {
  if (!topMenuCanvasRef.value) return;
  if (sortedTopItems.value.length === 0) return;

  const ctx = topMenuCanvasRef.value.getContext('2d');
  if (!ctx) return;

  const items = sortedTopItems.value.slice(0, 10);
  const labels = items.map((it) => it.name);
  const dataValues =
    topMenuSortBy.value === 'revenue'
      ? items.map((it) => it.totalRevenue)
      : items.map((it) => it.quantitySold);

  const datasetLabel = topMenuSortBy.value === 'revenue' ? 'ยอดขายรวม (บาท)' : 'จำนวนที่ขาย (จาน)';

  const config: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: datasetLabel,
          data: dataValues,
          backgroundColor: TOP_MENU_COLORS.slice(0, items.length),
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.68,
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
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (context) => {
              const idx = context.dataIndex;
              const item = items[idx];
              if (!item) return '';
              return [
                ` ขายได้: ${item.quantitySold} จาน`,
                ` ยอดขายรวม: ${formatPrice(item.totalRevenue)} (${item.revenueShare}%)`,
              ];
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
            callback: (val) => {
              if (topMenuSortBy.value === 'revenue') {
                return typeof val === 'number' && val >= 1000
                  ? `฿${(val / 1000).toFixed(0)}k`
                  : `฿${val}`;
              }
              return `${val} จาน`;
            },
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            font: { family: 'Prompt, sans-serif', size: 11, weight: 'bold' },
            color: '#334155',
            callback: function (val: string | number) {
              const label = this.getLabelForValue(Number(val));
              return label.length > 16 ? label.slice(0, 14) + '...' : label;
            },
          },
        },
      },
    },
  };

  if (topMenuChartInstance) {
    topMenuChartInstance.destroy();
  }

  topMenuChartInstance = new Chart(ctx, config);
}

// ─── Initialize Categories Doughnut Chart ───────────────────────────────────
function initCategoryChart() {
  if (!categoryCanvasRef.value) return;
  const ctx = categoryCanvasRef.value.getContext('2d');
  if (!ctx) return;

  const labels = props.categoryDistribution.map((c) => c.name);
  const data = props.categoryDistribution.map((c) => c.totalSales);

  const config: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: CATEGORY_COLORS.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { family: 'Prompt, sans-serif', size: 11 },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(30, 41, 59, 0.92)',
          titleFont: { family: 'Prompt, sans-serif', size: 12, weight: 'bold' },
          bodyFont: { family: 'Prompt, sans-serif', size: 11 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (item) => {
              const val = Number(item.raw);
              return ` ${item.label}: ${formatPrice(val)}`;
            },
          },
        },
      },
    },
  };

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  categoryChartInstance = new Chart(ctx, config);
}

watch(
  () => [props.topSellingItems, topMenuSortBy.value, activeTab.value],
  () => {
    if (activeTab.value === 'best') {
      void nextTick(() => {
        initTopMenuChart();
      });
    }
  },
  { deep: true },
);

watch(
  () => [props.categoryDistribution, activeTab.value],
  () => {
    if (activeTab.value === 'categories') {
      void nextTick(() => {
        initCategoryChart();
      });
    }
  },
  { deep: true },
);

onMounted(() => {
  void nextTick(() => {
    if (activeTab.value === 'best') {
      initTopMenuChart();
    } else if (activeTab.value === 'categories') {
      initCategoryChart();
    }
  });
});

onBeforeUnmount(() => {
  if (topMenuChartInstance) {
    topMenuChartInstance.destroy();
    topMenuChartInstance = null;
  }
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
    categoryChartInstance = null;
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

.tab-switcher-pill {
  background: var(--color-surface-subtle, #f5efe9);
  padding: 3px;
  border-radius: 20px;
}

.matrix-tabs :deep(.q-tab) {
  min-height: 36px;
  border-radius: 18px;
  font-size: 0.84rem;
}

.top-menu-toggle-group {
  background: var(--color-surface-subtle, #f5efe9);
  padding: 3px;
  border-radius: 20px;
}

/* Top Chart Canvas Wrapper */
.top-chart-wrapper {
  position: relative;
  height: 340px;
  width: 100%;
}

/* Ranked Items List */
.ranked-items-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 340px;
  overflow-y: auto;
  padding-right: 4px;
}

.ranked-item-card {
  background: var(--color-surface-subtle, #f5efe9);
  border: 1px solid var(--color-border, #ede5dc);
  border-radius: var(--radius-sm, 10px);
  padding: 8px 12px;
  transition: all 0.15s ease;
}

.ranked-item-card:hover {
  background: #ffffff;
  border-color: var(--color-primary-tint, #ffe6dc);
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.04));
}

.ranked-item-card--top3 {
  border-left: 3px solid var(--color-primary, #e05836);
  background: #fff8f5;
}

.rank-badge {
  font-size: 0.72rem;
  font-weight: 700;
  min-width: 26px;
  height: 22px;
  padding: 0 4px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: #64748b;
  flex-shrink: 0;
}

.rank-badge--1 {
  background: linear-gradient(135deg, #e05836, #c2410c);
}

.rank-badge--2 {
  background: linear-gradient(135deg, #ea580c, #c2410c);
}

.rank-badge--3 {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.item-progress-track {
  width: 100%;
  height: 5px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
}

.item-progress-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Slow / Deadstock tab */
.slow-banner {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: var(--radius-sm, 10px);
  padding: 10px 14px;
}

.sub-section-card {
  background: var(--color-surface-subtle, #f5efe9);
  border: 1px solid var(--color-border, #ede5dc);
  border-radius: var(--radius-sm, 10px);
  padding: 14px;
}

.slow-items-list {
  max-height: 280px;
  overflow-y: auto;
}

.slow-item-row {
  padding: 8px 0;
  border-bottom: 1px dashed var(--color-border, #ede5dc);
}

.slow-item-row:last-child {
  border-bottom: none;
}

/* Category Tab */
.category-chart-wrapper {
  position: relative;
  height: 240px;
  width: 100%;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.analytics-table {
  width: 100%;
  border-collapse: collapse;
}

.analytics-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 0.8rem;
  color: var(--color-text-secondary, #7a6e65);
  border-bottom: 1px solid var(--color-border, #ede5dc);
}

.analytics-table td {
  padding: 10px 12px;
  font-size: 0.86rem;
  border-bottom: 1px solid var(--color-border-subtle, #f3ede6);
}

.analytics-table tr:hover td {
  background-color: var(--color-surface-subtle, #f5efe9);
}

/* Addon Tab */
.addon-card {
  background: var(--color-surface-subtle, #f5efe9);
  border: 1px solid var(--color-border, #ede5dc);
  border-radius: var(--radius-sm, 10px);
  padding: 12px;
  transition: all 0.15s ease;
}

.addon-card:hover {
  background: #ffffff;
  border-color: var(--color-primary-tint, #ffe6dc);
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.04));
}

.addon-rank {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--color-primary, #e05836);
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.truncate-1 {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
