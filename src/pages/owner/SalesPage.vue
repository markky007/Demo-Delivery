<template>
  <q-page class="sales-page q-pa-md">
    <div class="sales-container">
      <!-- ─── Header & Top Filter Controls ───────────────────────── -->
      <div class="row items-center justify-between q-mb-md header-section">
        <div>
          <div class="row items-center q-gutter-sm">
            <h5 class="q-my-none text-weight-bold page-title">ประวัติยอดขาย & บทวิเคราะห์</h5>
            <q-badge color="primary" rounded class="q-px-sm">
              <q-icon name="insights" size="14px" class="q-mr-xs" />
              Data Analytics
            </q-badge>
          </div>
          <p class="text-caption text-grey-7 q-mb-none q-mt-xs">
            วิเคราะห์แนวโน้มยอดขาย ค่าเฉลี่ยรายวัน ช่วงเวลาพีค เมนูขายดี และประวัติการชำระเงิน
          </p>
        </div>

        <!-- View Mode Switcher (Analytics vs Bills Table) -->
        <div class="row items-center q-gutter-sm flex-wrap">
          <div class="view-mode-pill">
            <q-tabs
              v-model="activeViewTab"
              dense
              no-caps
              active-color="white"
              active-bg-color="primary"
              indicator-color="transparent"
              class="view-mode-tabs"
            >
              <q-tab name="analytics" icon="bar_chart" label="แดชบอร์ดวิเคราะห์" />
              <q-tab name="bills" icon="receipt_long" label="รายการประวัติบิล" />
            </q-tabs>
          </div>

          <q-btn
            outline
            dense
            rounded
            no-caps
            color="grey-8"
            icon="refresh"
            label="รีเฟรช"
            :loading="isLoading"
            @click="loadSalesData"
            class="q-px-sm refresh-btn"
          />

          <q-btn
            v-if="activeViewTab === 'bills'"
            unelevated
            dense
            rounded
            no-caps
            color="primary"
            icon="download"
            label="ส่งออก CSV"
            @click="exportBillsToCsv"
            class="q-px-sm"
          />
        </div>
      </div>

      <!-- ─── Filter Bar Card (Presets & Custom Date Range) ──────── -->
      <div class="filter-card q-mb-lg">
        <div class="row items-center justify-between flex-wrap q-col-gutter-sm">
          <!-- Preset Buttons -->
          <div class="row items-center q-gutter-xs flex-wrap">
            <span class="text-caption text-weight-bold text-grey-8 q-mr-xs">ช่วงเวลา:</span>
            <q-btn
              v-for="preset in datePresets"
              :key="preset.id"
              unelevated
              rounded
              dense
              no-caps
              size="sm"
              :color="activePreset === preset.id ? 'primary' : 'grey-2'"
              :text-color="activePreset === preset.id ? 'white' : 'dark'"
              :label="preset.label"
              @click="selectPreset(preset.id)"
              class="preset-btn q-px-sm"
            />
          </div>

          <!-- Day of Week Filter Dropdown -->
          <div class="row items-center q-gutter-xs day-filter-wrap">
            <span class="text-caption text-weight-bold text-grey-8">วันในสัปดาห์:</span>
            <q-select
              v-model="selectedDayFilter"
              :options="dayFilterOptions"
              emit-value
              map-options
              outlined
              dense
              rounded
              options-dense
              class="day-filter-select"
              @update:model-value="applyFilters"
            >
              <template v-slot:prepend>
                <q-icon name="filter_list" size="18px" color="primary" />
              </template>
            </q-select>
          </div>
        </div>

        <!-- Custom Date Range Row (Always visible or customizable) -->
        <div class="row items-center q-gutter-sm q-mt-xs date-range-row">
          <q-input
            v-model="dateFrom"
            outlined
            dense
            type="date"
            label="ตั้งแต่วันที่"
            class="date-input"
            @update:model-value="onCustomDateChange"
          />
          <span class="text-grey-6 text-caption">ถึง</span>
          <q-input
            v-model="dateTo"
            outlined
            dense
            type="date"
            label="ถึงวันที่"
            class="date-input"
            @update:model-value="onCustomDateChange"
          />
          <q-btn
            unelevated
            no-caps
            rounded
            size="sm"
            color="primary"
            icon="search"
            label="ค้นหา"
            @click="loadSalesData"
            class="q-px-md"
          />
          <span v-if="dateRangeText" class="text-caption text-grey-7 q-ml-sm gt-xs">
            📅 {{ dateRangeText }}
          </span>
        </div>
      </div>

      <!-- ─── Loading Skeleton ────────────────────────────────────── -->
      <div v-if="isLoading" class="q-py-md">
        <LoadingSkeleton type="dashboard" />
      </div>

      <template v-else>
        <!-- ========================================================= -->
        <!-- VIEW 1: ANALYTICS DASHBOARD                              -->
        <!-- ========================================================= -->
        <div v-if="activeViewTab === 'analytics'" class="analytics-tab-content">
          <!-- 1. KPI Metric Summary Cards (6 Cards) -->
          <div class="q-mb-lg">
            <SalesKpiCards v-if="analyticsData" :kpis="analyticsData.kpis" />
          </div>

          <!-- 2. Day of Week Analysis (Averages & Ranking) -->
          <div class="q-mb-lg">
            <DayOfWeekSalesChart
              v-if="analyticsData"
              :day-of-week-data="analyticsData.dayOfWeekData"
              :weekday-vs-weekend="analyticsData.weekdayVsWeekend"
            />
          </div>

          <!-- 4. Hourly Peak Traffic & Meal Period Breakdown -->
          <div class="q-mb-lg">
            <HourlyTrafficChart
              v-if="analyticsData"
              :hourly-data="analyticsData.hourlyData"
              :meal-periods="analyticsData.mealPeriods"
            />
          </div>

          <!-- 5. Menu Performance Matrix (Best Sellers, Slow Movers, Categories, Addons) -->
          <div class="q-mb-lg">
            <MenuPerformanceMatrix
              v-if="analyticsData"
              :top-selling-items="analyticsData.topSellingItems"
              :slow-moving-items="analyticsData.slowMovingItems"
              :zero-sales-items="analyticsData.zeroSalesItems"
              :category-distribution="analyticsData.categoryDistribution"
              :top-addons="analyticsData.topAddons"
            />
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- VIEW 2: BILLS & TRANSACTIONS TABLE                       -->
        <!-- ========================================================= -->
        <div v-else class="bills-tab-content">
          <!-- Stats Summary in Bills View -->
          <div class="stats-summary-row q-mb-md">
            <div class="summary-pill">
              <span class="text-caption text-grey-7">ยอดรวมบิลที่แสดง:</span>
              <strong class="font-mono text-primary text-body1 q-ml-xs">{{
                formatPrice(totalSales)
              }}</strong>
            </div>
            <div class="summary-pill">
              <span class="text-caption text-grey-7">จำนวนบิล:</span>
              <strong class="font-mono text-dark text-body1 q-ml-xs"
                >{{ filteredBills.length }} บิล</strong
              >
            </div>
            <q-space />
            <!-- Search in table -->
            <q-input
              v-model="searchQuery"
              outlined
              dense
              rounded
              placeholder="ค้นหาโต๊ะ, ชื่อลูกค้า, รหัสบิล..."
              class="table-search-input"
            >
              <template v-slot:prepend>
                <q-icon name="search" size="18px" color="grey-6" />
              </template>
              <template v-if="searchQuery" v-slot:append>
                <q-icon name="close" size="16px" class="cursor-pointer" @click="searchQuery = ''" />
              </template>
            </q-input>
          </div>

          <!-- Bills Table -->
          <q-table
            :rows="filteredBills"
            :columns="columns"
            row-key="id"
            flat
            bordered
            class="sales-table"
            no-data-label="ไม่พบประวัติยอดขายในช่วงเวลานี้"
            :filter="searchQuery"
            :rows-per-page-options="[10, 20, 50, 100]"
            :pagination="{ rowsPerPage: 20 }"
          >
            <template v-slot:body-cell-id="props">
              <q-td :props="props">
                <span class="text-weight-mono text-grey-8">#{{ props.row.id.slice(0, 8) }}</span>
              </q-td>
            </template>

            <template v-slot:body-cell-table_name="props">
              <q-td :props="props">
                <q-badge color="grey-2" text-color="dark" class="q-px-sm text-weight-medium">
                  <q-icon name="table_restaurant" size="14px" class="q-mr-xs text-primary" />
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>

            <template v-slot:body-cell-amount="props">
              <q-td :props="props">
                <span class="text-weight-bold text-primary font-mono">{{
                  formatPrice(props.value as number)
                }}</span>
              </q-td>
            </template>

            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <StatusBadge status="SERVED" mode="raw" custom-label="ชำระเงินแล้ว" />
              </q-td>
            </template>

            <template v-slot:body-cell-paid_at="props">
              <q-td :props="props">
                {{ props.value ? formatDateTime(props.value as string) : '—' }}
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn
                  flat
                  dense
                  rounded
                  no-caps
                  size="sm"
                  color="primary"
                  icon="receipt_long"
                  label="ดูใบเสร็จ"
                  @click="openReceiptDialog(props.row.id)"
                  class="q-px-sm"
                />
              </q-td>
            </template>
          </q-table>
        </div>
      </template>

      <!-- ─── Receipt Modal Dialog ──────────────────────────────── -->
      <q-dialog v-model="showReceiptModal" transition-show="scale" transition-hide="scale">
        <q-card style="width: 480px; max-width: 95vw; border-radius: 16px" class="q-pa-sm">
          <q-card-section class="row items-center justify-between q-pb-none no-print">
            <div class="text-h6 text-weight-bold">ใบเสร็จรับเงิน</div>
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section>
            <div v-if="isReceiptLoading" class="q-py-xl text-center">
              <q-spinner color="primary" size="40px" />
              <div class="text-caption text-grey-7 q-mt-sm">กำลังโหลดข้อมูลใบเสร็จ...</div>
            </div>

            <ReceiptSlip
              v-else-if="selectedReceiptData"
              :bill="selectedReceiptData.bill"
              :table-name="selectedReceiptData.tableName"
              :orders="selectedReceiptData.orders"
              :show-actions="true"
            />
          </q-card-section>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { fetchBillWithDetails } from 'src/services/billService';
import {
  fetchSalesDataForPeriod,
  filterDataByDayOfWeek,
  computeSalesAnalytics,
  type RawBillData,
  type RawOrderData,
  type RawOrderItemData,
  type RawMenuItemData,
  type FullSalesAnalytics,
} from 'src/services/salesAnalyticsService';
import { formatPrice, formatDateTime, formatDate } from 'src/utils/formatters';
import { useNotify } from 'src/composables/useNotify';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import ReceiptSlip from 'src/components/ReceiptSlip.vue';
import SalesKpiCards from 'src/components/analytics/SalesKpiCards.vue';
import DayOfWeekSalesChart from 'src/components/analytics/DayOfWeekSalesChart.vue';
import HourlyTrafficChart from 'src/components/analytics/HourlyTrafficChart.vue';
import MenuPerformanceMatrix from 'src/components/analytics/MenuPerformanceMatrix.vue';
import type { QTableColumn } from 'quasar';
import type { Bill, OrderWithItems } from 'src/types/database';

interface BillDisplayRow {
  id: string;
  table_session_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  table_name: string;
}

const { notifyError, notifySuccess } = useNotify();

const activeViewTab = ref<'analytics' | 'bills'>('analytics');
const isLoading = ref(true);

// ─── Date Presets ───────────────────────────────────────────────────────────
type PresetId = 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom';

const datePresets = [
  { id: 'today' as PresetId, label: 'วันนี้' },
  { id: '7d' as PresetId, label: '7 วันล่าสุด' },
  { id: '30d' as PresetId, label: '30 วันล่าสุด' },
  { id: 'this_month' as PresetId, label: 'เดือนนี้' },
  { id: 'last_month' as PresetId, label: 'เดือนที่แล้ว' },
  { id: 'custom' as PresetId, label: 'กำหนดเอง' },
];

const activePreset = ref<PresetId>('30d');

const todayStr = new Date().toISOString().slice(0, 10);
const dateFrom = ref(todayStr);
const dateTo = ref(todayStr);

// ─── Day of Week Filter ─────────────────────────────────────────────────────
const selectedDayFilter = ref<string>('all');

const dayFilterOptions = [
  { label: 'ทุกวันในสัปดาห์ (จันทร์ - เสาร์)', value: 'all' },
  { label: 'เฉพาะวันจันทร์ (Mondays)', value: 'mon' },
  { label: 'เฉพาะวันอังคาร (Tuesdays)', value: 'tue' },
  { label: 'เฉพาะวันพุธ (Wednesdays)', value: 'wed' },
  { label: 'เฉพาะวันพฤหัสบดี (Thursdays)', value: 'thu' },
  { label: 'เฉพาะวันศุกร์ (Fridays)', value: 'fri' },
  { label: 'เฉพาะวันเสาร์ (Saturdays)', value: 'sat' },
  { label: 'เฉพาะต้น-กลางสัปดาห์ (จันทร์ - พฤหัสบดี)', value: 'weekdays' },
  { label: 'เฉพาะปลายสัปดาห์ (ศุกร์ - เสาร์)', value: 'weekends' },
];

// ─── Raw Data Cache ─────────────────────────────────────────────────────────
const rawBills = ref<RawBillData[]>([]);
const rawOrders = ref<RawOrderData[]>([]);
const rawOrderItems = ref<RawOrderItemData[]>([]);
const rawMenuItems = ref<RawMenuItemData[]>([]);

// ─── Processed Analytics & Bills ────────────────────────────────────────────
const analyticsData = ref<FullSalesAnalytics | null>(null);
const displayBills = ref<BillDisplayRow[]>([]);
const searchQuery = ref('');

const dateRangeText = computed(() => {
  if (!dateFrom.value || !dateTo.value) return '';
  if (dateFrom.value === dateTo.value) {
    return formatDate(dateFrom.value);
  }
  return `${formatDate(dateFrom.value)} - ${formatDate(dateTo.value)}`;
});

const filteredBills = computed(() => {
  return displayBills.value;
});

const totalSales = computed(() => {
  return filteredBills.value.reduce((sum, b) => sum + (b.total_amount || 0), 0);
});

// ─── Table Columns ──────────────────────────────────────────────────────────
const columns: QTableColumn[] = [
  {
    name: 'id',
    label: 'รหัสบิล',
    field: 'id',
    align: 'left',
    sortable: false,
    format: (val: string) => `#${val.slice(0, 8)}`,
  },
  {
    name: 'table_name',
    label: 'โต๊ะ / ลูกค้า',
    field: 'table_name',
    align: 'left',
    sortable: true,
  },
  {
    name: 'amount',
    label: 'ยอดเงินรวม',
    field: 'total_amount',
    align: 'right',
    sortable: true,
  },
  { name: 'status', label: 'สถานะ', field: 'status', align: 'center' },
  {
    name: 'paid_at',
    label: 'วันและเวลาที่ชำระ',
    field: 'paid_at',
    align: 'left',
    sortable: true,
  },
  { name: 'actions', label: 'จัดการ', field: 'actions', align: 'center' },
];

// ─── Receipt Modal ──────────────────────────────────────────────────────────
const showReceiptModal = ref(false);
const isReceiptLoading = ref(false);
const selectedReceiptData = ref<{
  bill: Bill;
  tableName: string;
  orders: OrderWithItems[];
} | null>(null);

// ─── Preset Handlers ────────────────────────────────────────────────────────
function selectPreset(preset: PresetId) {
  activePreset.value = preset;
  const now = new Date();

  if (preset === 'today') {
    dateFrom.value = now.toISOString().slice(0, 10);
    dateTo.value = now.toISOString().slice(0, 10);
  } else if (preset === '7d') {
    const from = new Date();
    from.setDate(now.getDate() - 6);
    dateFrom.value = from.toISOString().slice(0, 10);
    dateTo.value = now.toISOString().slice(0, 10);
  } else if (preset === '30d') {
    const from = new Date();
    from.setDate(now.getDate() - 29);
    dateFrom.value = from.toISOString().slice(0, 10);
    dateTo.value = now.toISOString().slice(0, 10);
  } else if (preset === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFrom.value = firstDay.toISOString().slice(0, 10);
    dateTo.value = now.toISOString().slice(0, 10);
  } else if (preset === 'last_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    dateFrom.value = firstDay.toISOString().slice(0, 10);
    dateTo.value = lastDay.toISOString().slice(0, 10);
  }

  void loadSalesData();
}

function onCustomDateChange() {
  activePreset.value = 'custom';
}

// ─── Data Fetching & Processing ─────────────────────────────────────────────
async function loadSalesData() {
  isLoading.value = true;

  try {
    const fromDate = new Date(dateFrom.value || todayStr);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(dateTo.value || todayStr);
    toDate.setHours(23, 59, 59, 999);

    const { bills, orders, orderItems, allMenuItems } = await fetchSalesDataForPeriod(
      fromDate,
      toDate,
    );

    rawBills.value = bills;
    rawOrders.value = orders;
    rawOrderItems.value = orderItems;
    rawMenuItems.value = allMenuItems;

    applyFilters();
  } catch (err) {
    console.error('Error loading sales data:', err);
    notifyError('ไม่สามารถโหลดข้อมูลประวัติยอดขายได้');
  } finally {
    isLoading.value = false;
  }
}

function applyFilters() {
  const fromDate = new Date(dateFrom.value || todayStr);
  fromDate.setHours(0, 0, 0, 0);

  const toDate = new Date(dateTo.value || todayStr);
  toDate.setHours(23, 59, 59, 999);

  // Apply Day of Week filter
  const {
    filteredBills: fBills,
    filteredOrders: fOrders,
    filteredOrderItems: fOrderItems,
  } = filterDataByDayOfWeek(
    rawBills.value,
    rawOrders.value,
    rawOrderItems.value,
    selectedDayFilter.value,
  );

  // Compute Full Analytics
  analyticsData.value = computeSalesAnalytics(
    fBills,
    fOrders,
    fOrderItems,
    rawMenuItems.value,
    fromDate,
    toDate,
  );

  // Map display bills with table name
  displayBills.value = fBills.map((b) => {
    const rawTableName = b.table_session?.table?.name ?? 'โต๊ะ';
    const custName = b.table_session?.customer_name;
    let displayName = rawTableName;
    if (
      custName &&
      (rawTableName.includes('กลับบ้าน') || rawTableName.toLowerCase().includes('takeaway'))
    ) {
      displayName = `สั่งกลับบ้าน (${custName})`;
    } else if (custName) {
      displayName = `${rawTableName} (${custName})`;
    }
    return {
      id: b.id,
      table_session_id: b.table_session_id,
      total_amount: b.total_amount,
      status: b.status,
      created_at: b.created_at,
      paid_at: b.paid_at,
      table_name: displayName,
    };
  });
}

// ─── Receipt Modal ──────────────────────────────────────────────────────────
async function openReceiptDialog(billId: string) {
  showReceiptModal.value = true;
  isReceiptLoading.value = true;
  selectedReceiptData.value = null;

  try {
    const data = await fetchBillWithDetails(billId);
    if (data) {
      selectedReceiptData.value = data;
    } else {
      notifyError('ไม่พบข้อมูลใบเสร็จนี้');
      showReceiptModal.value = false;
    }
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถโหลดใบเสร็จได้');
    showReceiptModal.value = false;
  } finally {
    isReceiptLoading.value = false;
  }
}

// ─── CSV Export Function ────────────────────────────────────────────────────
function exportBillsToCsv() {
  if (filteredBills.value.length === 0) {
    notifyError('ไม่มีรายการบิลสำหรับส่งออก');
    return;
  }

  const headers = ['ลำดับ', 'รหัสบิล', 'โต๊ะ/ลูกค้า', 'ยอดเงิน (บาท)', 'สถานะ', 'วันเวลาที่ชำระ'];
  const rows = filteredBills.value.map((b, idx) => [
    idx + 1,
    b.id,
    `"${b.table_name.replace(/"/g, '""')}"`,
    b.total_amount,
    'ชำระเงินแล้ว',
    b.paid_at ? `"${formatDateTime(b.paid_at)}"` : '-',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  // Add UTF-8 BOM so Excel opens Thai fonts properly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `sales_history_${dateFrom.value}_to_${dateTo.value}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  notifySuccess('ส่งออกไฟล์ CSV เรียบร้อยแล้ว');
}

onMounted(() => {
  // Default to 30 days preset
  selectPreset('30d');
});
</script>

<style scoped>
.sales-page {
  background: var(--color-background, #fbf9f6);
}

.sales-container {
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  color: var(--color-text-primary, #2d231e);
  line-height: 1.2;
}

/* View Mode Tabs Pill */
.view-mode-pill {
  background: var(--color-surface-subtle, #f5efe9);
  padding: 3px;
  border-radius: 20px;
}

.view-mode-tabs :deep(.q-tab) {
  min-height: 36px;
  border-radius: 18px;
  font-size: 0.85rem;
  padding: 0 16px;
}

.refresh-btn {
  background: #ffffff;
}

/* Filter Card */
.filter-card {
  background: #ffffff;
  border-radius: var(--radius-md, 16px);
  border: 1px solid var(--color-border, #ede5dc);
  padding: 14px 18px;
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.04));
}

.preset-btn {
  font-weight: 500;
  transition: all 0.15s ease;
}

.day-filter-wrap {
  flex-wrap: wrap;
}

.day-filter-select {
  min-width: 230px;
  background: #ffffff;
}

.date-range-row {
  flex-wrap: wrap;
}

.date-input {
  max-width: 155px;
  background: #ffffff;
}

/* Bills Tab Content */
.stats-summary-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-pill {
  background: #ffffff;
  border: 1px solid var(--color-border, #ede5dc);
  border-radius: var(--radius-sm, 10px);
  padding: 8px 16px;
  display: flex;
  align-items: center;
}

.table-search-input {
  min-width: 260px;
  background: #ffffff;
}

.sales-table {
  background: #ffffff;
  border-radius: var(--radius-md, 16px);
  border: 1px solid var(--color-border, #ede5dc);
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(0, 0, 0, 0.04));
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
