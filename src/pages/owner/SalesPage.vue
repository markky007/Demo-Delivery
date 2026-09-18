<template>
  <q-page class="sales-page q-pa-md">
    <div class="sales-container">
      <!-- ─── Header & Top Filter Controls ───────────────────────── -->
      <div class="row items-center justify-between q-mb-md header-section">
        <div>
          <div class="row items-center q-gutter-sm">
            <h4 class="q-my-none text-weight-bold page-title">ประวัติยอดขาย & บทวิเคราะห์</h4>
            <q-badge color="primary" rounded class="q-px-sm text-caption">
              <q-icon name="insights" size="14px" class="q-mr-xs" />
              Data Analytics
            </q-badge>
          </div>
          <p class="text-caption text-muted q-mb-none q-mt-xs">
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
            color="grey-7"
            icon="refresh"
            label="รีเฟรช"
            :loading="isLoading"
            @click="refreshAll"
            class="q-px-md refresh-btn"
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
            :loading="isExportingCsv"
            @click="exportBillsToCsv"
            class="q-px-md"
          />
        </div>
      </div>

      <!-- ─── Filter Bar Card (Presets & Custom Date Range) ──────── -->
      <div class="filter-card q-mb-lg">
        <div class="row items-center justify-between flex-wrap q-col-gutter-sm">
          <!-- Preset Buttons -->
          <div class="row items-center q-gutter-xs flex-wrap">
            <span class="text-caption text-weight-medium text-muted q-mr-xs">ช่วงเวลา:</span>
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
            <span class="text-caption text-weight-medium text-muted">วันในสัปดาห์:</span>
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
              @update:model-value="onDayFilterChange"
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
          <span class="text-muted text-caption">ถึง</span>
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
            :loading="isLoading"
            @click="onCustomDateSearch"
            class="q-px-md"
          />
          <span v-if="dateRangeText" class="text-caption text-muted q-ml-sm gt-xs">
            📅 {{ dateRangeText }}
          </span>
        </div>
      </div>

      <!-- ─── Loading Skeleton for Analytics ──────────────────────── -->
      <div v-if="activeViewTab === 'analytics' && isAnalyticsLoading" class="q-py-md">
        <LoadingSkeleton type="dashboard" />
      </div>

      <template v-else>
        <!-- ========================================================= -->
        <!-- VIEW 1: ANALYTICS DASHBOARD                              -->
        <!-- ========================================================= -->
        <div v-if="activeViewTab === 'analytics'" class="analytics-tab-content">
          <!-- 1. Hero KPI Metric Summary Cards (Bento Grid) -->
          <div class="q-mb-lg">
            <SalesKpiCards
              v-if="analyticsData"
              :kpis="analyticsData.kpis"
              :dining-type-summary="analyticsData.diningTypeSummary"
            />
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
              <span class="text-caption text-grey-7">ยอดรวมบิลทั้งหมด:</span>
              <strong class="font-mono text-primary text-body1 q-ml-xs">{{
                formatPrice(totalBillsSales)
              }}</strong>
            </div>
            <div class="summary-pill">
              <span class="text-caption text-grey-7">จำนวนบิลทั้งหมด:</span>
              <strong class="font-mono text-dark text-body1 q-ml-xs"
                >{{ billsPagination.rowsNumber }} บิล</strong
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
              debounce="350"
              @update:model-value="onSearchInput"
            >
              <template v-slot:prepend>
                <q-icon name="search" size="18px" color="grey-6" />
              </template>
              <template v-if="searchQuery" v-slot:append>
                <q-icon name="close" size="16px" class="cursor-pointer" @click="clearSearch" />
              </template>
            </q-input>
          </div>

          <!-- Bills Table -->
          <q-table
            :rows="displayBills"
            :columns="columns"
            row-key="id"
            flat
            bordered
            class="sales-table"
            no-data-label="ไม่พบประวัติยอดขายในช่วงเวลานี้"
            :loading="isBillsLoading"
            v-model:pagination="billsPagination"
            :rows-per-page-options="[10, 20, 50, 100]"
            @request="onBillsTableRequest"
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
import { ref, computed, watch, onMounted } from 'vue';
import { fetchBillWithDetails } from 'src/services/billService';
import {
  fetchFullSalesAnalytics,
  fetchBillsPaginated,
  fetchBillsForExport,
  type BillDisplayRow,
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
import type { QTableColumn, QTableProps } from 'quasar';
import type { Bill, OrderWithItems } from 'src/types/database';

const { notifyError, notifySuccess } = useNotify();

const activeViewTab = ref<'analytics' | 'bills'>('analytics');
const isAnalyticsLoading = ref(false);
const isBillsLoading = ref(false);
const isExportingCsv = ref(false);

const isLoading = computed(() => {
  return activeViewTab.value === 'analytics' ? isAnalyticsLoading.value : isBillsLoading.value;
});

// ─── Date Presets ───────────────────────────────────────────────────────────
type PresetId = 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'all' | 'custom';

const datePresets = [
  { id: 'today' as PresetId, label: 'วันนี้' },
  { id: '7d' as PresetId, label: '7 วันล่าสุด' },
  { id: '30d' as PresetId, label: '30 วันล่าสุด' },
  { id: 'this_month' as PresetId, label: 'เดือนนี้' },
  { id: 'last_month' as PresetId, label: 'เดือนที่แล้ว' },
  { id: 'all' as PresetId, label: 'ทั้งหมด' },
  { id: 'custom' as PresetId, label: 'กำหนดเอง' },
];

const activePreset = ref<PresetId>('today');

// ─── Date Helpers ───────────────────────────────────────────────────────────
function formatToDateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr: string, isEndOfDay = false): Date {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0] || new Date().getFullYear();
  const m = parts[1] || new Date().getMonth() + 1;
  const d = parts[2] || new Date().getDate();
  if (isEndOfDay) {
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

const todayStr = formatToDateInput(new Date());
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

// ─── In-Memory Cache for Analytics ──────────────────────────────────────────
const analyticsCache = new Map<string, FullSalesAnalytics>();

// ─── Processed Analytics & Bills ────────────────────────────────────────────
const analyticsData = ref<FullSalesAnalytics | null>(null);
const displayBills = ref<BillDisplayRow[]>([]);
const searchQuery = ref('');

// Server-side bills pagination state
const billsPagination = ref({
  sortBy: 'paid_at',
  descending: true,
  page: 1,
  rowsPerPage: 20,
  rowsNumber: 0,
});
const totalBillsSales = ref(0);

const dateRangeText = computed(() => {
  if (!dateFrom.value || !dateTo.value) return '';
  if (dateFrom.value === dateTo.value) {
    return formatDate(dateFrom.value);
  }
  return `${formatDate(dateFrom.value)} - ${formatDate(dateTo.value)}`;
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
    dateFrom.value = formatToDateInput(now);
    dateTo.value = formatToDateInput(now);
  } else if (preset === '7d') {
    const from = new Date();
    from.setDate(now.getDate() - 6);
    dateFrom.value = formatToDateInput(from);
    dateTo.value = formatToDateInput(now);
  } else if (preset === '30d') {
    const from = new Date();
    from.setDate(now.getDate() - 29);
    dateFrom.value = formatToDateInput(from);
    dateTo.value = formatToDateInput(now);
  } else if (preset === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFrom.value = formatToDateInput(firstDay);
    dateTo.value = formatToDateInput(now);
  } else if (preset === 'last_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    dateFrom.value = formatToDateInput(firstDay);
    dateTo.value = formatToDateInput(lastDay);
  } else if (preset === 'all') {
    dateFrom.value = '2023-01-01';
    dateTo.value = formatToDateInput(now);
  }

  void loadCurrentTabData();
}

function onCustomDateChange() {
  activePreset.value = 'custom';
}

function onCustomDateSearch() {
  analyticsCache.clear();
  void loadCurrentTabData(true);
}

function onDayFilterChange() {
  analyticsCache.clear();
  void loadCurrentTabData(true);
}

// ─── Data Loading Orchestrator ──────────────────────────────────────────────
async function loadCurrentTabData(forceRefresh = false) {
  if (activeViewTab.value === 'analytics') {
    await loadAnalyticsData(forceRefresh);
  } else {
    billsPagination.value.page = 1;
    await loadBillsData();
  }
}

async function refreshAll() {
  analyticsCache.clear();
  if (activeViewTab.value === 'analytics') {
    await loadAnalyticsData(true);
  } else {
    await loadBillsData();
  }
}

// ─── Analytics Fetching ─────────────────────────────────────────────────────
async function loadAnalyticsData(force = false) {
  const fromDate = parseLocalDate(dateFrom.value || todayStr, false);
  const toDate = parseLocalDate(dateTo.value || todayStr, true);
  const cacheKey = `${dateFrom.value}_${dateTo.value}_${selectedDayFilter.value}`;

  if (!force && analyticsCache.has(cacheKey)) {
    analyticsData.value = analyticsCache.get(cacheKey)!;
    return;
  }

  isAnalyticsLoading.value = true;
  try {
    const data = await fetchFullSalesAnalytics(fromDate, toDate, selectedDayFilter.value);
    analyticsData.value = data;
    analyticsCache.set(cacheKey, data);
  } catch (err) {
    console.error('Error loading sales analytics:', err);
    notifyError({
      title: 'โหลดบทวิเคราะห์ไม่สำเร็จ',
      message: 'ไม่สามารถดึงข้อมูลสรุปยอดขายจากเซิร์ฟเวอร์ได้ โปรดลองใหม่อีกครั้ง',
    });
  } finally {
    isAnalyticsLoading.value = false;
  }
}

// ─── Bills Table Fetching (Server-Side Pagination) ──────────────────────────
async function loadBillsData() {
  isBillsLoading.value = true;
  try {
    const fromDate = parseLocalDate(dateFrom.value || todayStr, false);
    const toDate = parseLocalDate(dateTo.value || todayStr, true);

    const result = await fetchBillsPaginated({
      page: billsPagination.value.page,
      rowsPerPage: billsPagination.value.rowsPerPage,
      sortBy: billsPagination.value.sortBy,
      descending: billsPagination.value.descending,
      dateFrom: fromDate,
      dateTo: toDate,
      search: searchQuery.value,
      dayFilter: selectedDayFilter.value,
    });

    displayBills.value = result.rows;
    billsPagination.value.rowsNumber = result.totalCount;
    totalBillsSales.value = result.totalSalesSum;
  } catch (err) {
    console.error('Error loading paginated bills:', err);
    notifyError({
      title: 'โหลดประวัติบิลไม่สำเร็จ',
      message: 'ไม่สามารถดึงข้อมูลรายการบิลได้ โปรดลองใหม่อีกครั้ง',
    });
  } finally {
    isBillsLoading.value = false;
  }
}

async function onBillsTableRequest(props: Parameters<NonNullable<QTableProps['onRequest']>>[0]) {
  const { page, rowsPerPage, sortBy, descending } = props.pagination;
  billsPagination.value.page = page;
  billsPagination.value.rowsPerPage = rowsPerPage;
  billsPagination.value.sortBy = sortBy || 'paid_at';
  billsPagination.value.descending = descending;

  await loadBillsData();
}

function onSearchInput() {
  billsPagination.value.page = 1;
  void loadBillsData();
}

function clearSearch() {
  searchQuery.value = '';
  billsPagination.value.page = 1;
  void loadBillsData();
}

// ─── Tab Switch Watcher ─────────────────────────────────────────────────────
watch(activeViewTab, (newTab) => {
  if (newTab === 'analytics') {
    const cacheKey = `${dateFrom.value}_${dateTo.value}_${selectedDayFilter.value}`;
    if (!analyticsData.value || !analyticsCache.has(cacheKey)) {
      void loadAnalyticsData();
    }
  } else if (newTab === 'bills') {
    if (displayBills.value.length === 0) {
      void loadBillsData();
    }
  }
});

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
      notifyError({
        title: 'ไม่พบข้อมูลใบเสร็จ',
        message: 'ไม่พบรายละเอียดบิลหรือบิลอาจถูกลบไปแล้ว',
      });
      showReceiptModal.value = false;
    }
  } catch (err) {
    notifyError({
      title: 'โหลดใบเสร็จไม่สำเร็จ',
      message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดรายละเอียดบิล',
    });
    showReceiptModal.value = false;
  } finally {
    isReceiptLoading.value = false;
  }
}

// ─── CSV Export Function (On-Demand Fetch) ──────────────────────────────────
async function exportBillsToCsv() {
  if (isExportingCsv.value) return;
  isExportingCsv.value = true;

  try {
    const fromDate = parseLocalDate(dateFrom.value || todayStr, false);
    const toDate = parseLocalDate(dateTo.value || todayStr, true);

    const exportRows = await fetchBillsForExport(fromDate, toDate, selectedDayFilter.value);

    if (exportRows.length === 0) {
      notifyError({
        title: 'ไม่มีข้อมูลสำหรับส่งออก',
        message: 'ไม่มีรายการบิลในช่วงเวลาหรือตัวกรองที่เลือกในขณะนี้',
      });
      return;
    }

    const headers = ['ลำดับ', 'รหัสบิล', 'โต๊ะ/ลูกค้า', 'ยอดเงิน (บาท)', 'สถานะ', 'วันเวลาที่ชำระ'];
    const rows = exportRows.map((b, idx) => [
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

    notifySuccess({
      title: 'ส่งออกไฟล์สำเร็จ 📊',
      message: `ดาวน์โหลดไฟล์ sales_history_${dateFrom.value}_to_${dateTo.value}.csv เรียบร้อยแล้ว`,
      caption: `จำนวนทั้งหมด ${exportRows.length} บิล`,
    });
  } catch (err) {
    console.error('Export CSV error:', err);
    notifyError({
      title: 'ส่งออกไฟล์ไม่สำเร็จ',
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสำหรับส่งออก CSV',
    });
  } finally {
    isExportingCsv.value = false;
  }
}

onMounted(() => {
  // Default to today preset and load initial tab
  selectPreset('today');
});
</script>

<style scoped>
.sales-page {
  background: #fafafc;
  min-height: 100vh;
}

.sales-container {
  max-width: 1280px;
  margin: 0 auto;
}

.header-section {
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  color: #1d1d1f;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.text-muted {
  color: #6e6e73;
}

/* View Mode Tabs Pill (Apple Segmented Control) */
.view-mode-pill {
  background: #f5f5f7;
  padding: 3px;
  border-radius: 980px;
  border: 1px solid #d2d2d7;
}

.view-mode-tabs :deep(.q-tab) {
  min-height: 36px;
  border-radius: 980px;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0 16px;
}

.refresh-btn {
  background: #ffffff;
  border: 1px solid #d2d2d7;
  border-radius: 980px;
}

/* Filter Card */
.filter-card {
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid #d2d2d7;
  padding: 16px 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
}

.preset-btn {
  font-weight: 600;
  font-size: 0.8125rem;
  border-radius: 980px;
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
  border: 1px solid #d2d2d7;
  border-radius: 12px;
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
  border-radius: 20px;
  border: 1px solid #d2d2d7;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
}

.font-mono {
  font-family: var(--app-font-mono, 'Inter', sans-serif);
  font-variant-numeric: tabular-nums;
}
</style>
