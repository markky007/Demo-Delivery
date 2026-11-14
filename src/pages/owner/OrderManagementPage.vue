<template>
  <q-page class="order-mgmt-page q-pa-lg">
    <div class="mgmt-container">
      <!-- ─── 1. Apple Header Bar ─────────────────────────────────────── -->
      <OrderHeader
        v-model:view-mode="viewMode"
        :is-realtime-connected="isRealtimeConnected"
        :is-loading="isLoading"
        @refresh="loadOrders"
      />

      <!-- ─── 2. Apple KPI Metrics Grid (Interactive) ──────────────────── -->
      <OrderMetrics
        :total-orders="metrics.ALL || 0"
        :in-kitchen-count="inKitchenCount"
        :served-count="servedCount"
        :total-revenue="totalRevenue"
        :selected-status="selectedStatus"
        @select-status="handleSelectMetricStatus"
      />

      <!-- ─── 3. Unified Apple Filter & Search Toolbar ─────────────────── -->
      <OrderFilterToolbar
        v-model:selected-date-preset="selectedDatePreset"
        v-model:custom-date-from="customDateFrom"
        v-model:custom-date-to="customDateTo"
        v-model:selected-status="selectedStatus"
        v-model:selected-table-filter="selectedTableFilter"
        v-model:search-query="searchQuery"
        v-model:sort-by="sortBy"
        :status-counts="statusCounts"
        :table-filter-options="tableFilterOptions"
        :sort-options="sortOptions"
        :is-any-filter-active="isAnyFilterActive"
        :total-filtered-count="totalOrders"
        @apply-date-preset="applyDatePreset"
        @apply-custom-dates="applyCustomDates"
        @reset-filters="resetFilters"
      />

      <!-- ─── 4. Orders Content ───────────────────────────────────────── -->
      <!-- Loading State -->
      <div v-if="isLoading" class="q-py-xl">
        <LoadingSkeleton type="table" :count="6" />
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredOrders.length === 0" class="apple-empty-wrap q-py-xl text-center">
        <EmptyState
          icon="manage_search"
          title="ไม่พบรายการออเดอร์"
          description="ไม่พบรายการออเดอร์ที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองที่เลือก"
        >
          <template #action>
            <button
              type="button"
              class="apple-pill-btn apple-pill-btn--primary q-mt-sm"
              @click="resetFilters"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </template>
        </EmptyState>
      </div>

      <!-- Mode A: Card Grid View -->
      <div v-else-if="viewMode === 'cards'" class="order-cards-grid">
        <OrderCard
          v-for="order in filteredOrders"
          :key="order.id"
          :order="order"
          @view-details="openOrderDetails"
          @edit="openEditOrderDialog"
          @delete-order="promptDeleteOrder"
        />
      </div>

      <!-- Mode B: Table View -->
      <div v-else class="order-table-section">
        <OrderTableView
          :orders="filteredOrders"
          @view-details="openOrderDetails"
          @edit="openEditOrderDialog"
          @delete-order="promptDeleteOrder"
        />
      </div>

      <div v-if="totalPages > 1" class="row justify-center q-my-lg">
        <q-pagination v-model="currentPage" :max="totalPages" :max-pages="7" boundary-numbers />
      </div>

      <!-- ─── 5. Order Detail Modal Dialog ────────────────────────────── -->
      <OrderDetailModal
        v-model="showDetailModal"
        :order="selectedOrder"
        @edit="openEditOrderFromDetailModal"
        @delete-order="promptDeleteOrderFromModal"
      />

      <!-- ─── 6. Delete Confirmation Dialog ───────────────────────────── -->
      <OrderDeleteModal
        v-model="showDeleteDialog"
        :order="orderToDelete"
        :is-deleting="isDeleting"
        @confirm="handleConfirmDeleteOrder"
      />

      <!-- ─── 7. Edit Order Modal (Kitchen/Owner Mode) ──────────────────── -->
      <EditOrderModal
        v-if="editingOrder"
        v-model="showEditModal"
        :order="editingOrder"
        :is-kitchen="true"
        @saved="onOrderEdited"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useNotify } from 'src/composables/useNotify';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from 'src/services/supabase';
import { fetchManageOrders, deleteOrderAndSession } from 'src/services/orderService';
import { fetchTables } from 'src/services/tableService';
import type { OrderWithItems, TableWithQR } from 'src/types/database';
import type { OrderStatus } from 'src/types/enums';

// Subcomponents
import OrderHeader from 'src/components/orders/OrderHeader.vue';
import OrderMetrics from 'src/components/orders/OrderMetrics.vue';
import OrderFilterToolbar from 'src/components/orders/OrderFilterToolbar.vue';
import OrderCard from 'src/components/orders/OrderCard.vue';
import OrderTableView from 'src/components/orders/OrderTableView.vue';
import OrderDetailModal from 'src/components/orders/OrderDetailModal.vue';
import OrderDeleteModal from 'src/components/orders/OrderDeleteModal.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import EmptyState from 'src/components/EmptyState.vue';
import EditOrderModal from 'src/components/EditOrderModal.vue';

type DatePresetType = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM';
type SortByType = 'CREATED_DESC' | 'CREATED_ASC' | 'QUEUE_ASC' | 'QUEUE_DESC' | 'AMOUNT_DESC';

const { notifySuccess, notifyError } = useNotify();

// ─── View Mode & UI State ──────────────────────────────────────────────
const viewMode = ref<'cards' | 'table'>('cards');
const isLoading = ref(true);
const isDeleting = ref(false);
const isRealtimeConnected = ref(false);

// Raw Data loaded for current Date Range
const dateScopedOrders = ref<OrderWithItems[]>([]);
const currentPage = ref(1);
const pageSize = 30;
const totalOrders = ref(0);
const filteredRevenue = ref(0);
const metrics = ref<Record<string, number>>({});
const totalPages = computed(() => Math.max(1, Math.ceil(totalOrders.value / pageSize)));
let searchTimer: ReturnType<typeof setTimeout> | null = null;
let loadRequestId = 0;
const tables = ref<TableWithQR[]>([]);

// ─── Filter States ─────────────────────────────────────────────────────
const selectedDatePreset = ref<DatePresetType>('TODAY');
const customDateFrom = ref('');
const customDateTo = ref('');

const selectedStatus = ref<OrderStatus | 'ALL'>('ALL');
const selectedTableFilter = ref<string>('ALL');
const searchQuery = ref('');
const sortBy = ref<SortByType>('CREATED_DESC');

// ─── Modals ────────────────────────────────────────────────────────────
const showDetailModal = ref(false);
const selectedOrder = ref<OrderWithItems | null>(null);

const showEditModal = ref(false);
const editingOrder = ref<OrderWithItems | null>(null);

const showDeleteDialog = ref(false);
const orderToDelete = ref<OrderWithItems | null>(null);

// Realtime
let realtimeChannel: RealtimeChannel | null = null;

// ─── Options Configurations ────────────────────────────────────────────
const sortOptions: { label: string; value: SortByType }[] = [
  { label: 'เวลาสั่งล่าสุด (ใหม่ → เก่า)', value: 'CREATED_DESC' },
  { label: 'เวลาสั่งแรกสุด (เก่า → ใหม่)', value: 'CREATED_ASC' },
  { label: 'เลขคิวน้อย → มาก (#1, #2...)', value: 'QUEUE_ASC' },
  { label: 'เลขคิวมาก → น้อย', value: 'QUEUE_DESC' },
  { label: 'ยอดเงินสูงสุด → ต่ำสุด', value: 'AMOUNT_DESC' },
];

const tableFilterOptions = computed(() => {
  const opts: { label: string; value: string }[] = [
    { label: 'ทุกโต๊ะ / ทุกประเภท', value: 'ALL' },
    { label: '🍽️ เฉพาะทานที่ร้าน (ทุกโต๊ะ)', value: 'DINE_IN' },
    { label: '🥡 เฉพาะสั่งกลับบ้าน', value: 'TAKEAWAY' },
  ];

  for (const t of tables.value) {
    opts.push({ label: `โต๊ะ: ${t.name}`, value: `TABLE_${t.id}` });
  }

  return opts;
});

// ─── Active Filter Checker ─────────────────────────────────────────────
const isAnyFilterActive = computed(() => {
  return (
    selectedStatus.value !== 'ALL' ||
    selectedTableFilter.value !== 'ALL' ||
    Boolean(searchQuery.value && searchQuery.value.trim()) ||
    selectedDatePreset.value !== 'TODAY'
  );
});

// Filters, sorting, counts, and paging are applied in the database.
const filteredOrders = computed(() => dateScopedOrders.value);
const statusCounts = computed<Record<string, number>>(() => metrics.value);
const inKitchenCount = computed(
  () =>
    (metrics.value.QUEUED || 0) + (metrics.value.PREPARING || 0) + (metrics.value.PREPARED || 0),
);
const servedCount = computed(() => metrics.value.SERVED || 0);
const totalRevenue = computed(() => filteredRevenue.value);

// ─── Helpers ───────────────────────────────────────────────────────────
function formatQueueNumOnly(num: number): string {
  return String(num).padStart(3, '0');
}

function getTableDisplayName(order: OrderWithItems): string {
  if (order.table_session?.customer_name) {
    return `สั่งกลับบ้าน (${order.table_session.customer_name})`;
  }
  return order.table_session?.table?.name || 'ไม่ระบุโต๊ะ';
}

function toLocalYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Date Preset Handler ───────────────────────────────────────────────
function applyDatePreset(preset: DatePresetType) {
  selectedDatePreset.value = preset;
  const now = new Date();

  if (preset === 'TODAY') {
    customDateFrom.value = toLocalYMD(now);
    customDateTo.value = toLocalYMD(now);
  } else if (preset === 'YESTERDAY') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    customDateFrom.value = toLocalYMD(yesterday);
    customDateTo.value = toLocalYMD(yesterday);
  } else if (preset === 'LAST_7_DAYS') {
    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 6);
    customDateFrom.value = toLocalYMD(past7);
    customDateTo.value = toLocalYMD(now);
  } else if (preset === 'THIS_MONTH') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    customDateFrom.value = toLocalYMD(firstDay);
    customDateTo.value = toLocalYMD(now);
  } else if (preset === 'ALL') {
    customDateFrom.value = '';
    customDateTo.value = '';
  }

  currentPage.value = 1;
  void loadOrders();
}

function handleSelectMetricStatus(status: OrderStatus | 'ALL') {
  selectedStatus.value = status;
}

function applyCustomDates() {
  currentPage.value = 1;
  void loadOrders();
}

function resetFilters() {
  selectedStatus.value = 'ALL';
  selectedTableFilter.value = 'ALL';
  searchQuery.value = '';
  sortBy.value = 'CREATED_DESC';
  applyDatePreset('TODAY');
}

// ─── Data Loading ──────────────────────────────────────────────────────
async function loadOrders() {
  const requestId = ++loadRequestId;
  isLoading.value = true;
  try {
    const fetched = await fetchManageOrders({
      dateFrom: customDateFrom.value || undefined,
      dateTo: customDateTo.value || undefined,
      status: selectedStatus.value,
      tableFilter: selectedTableFilter.value,
      search: searchQuery.value,
      sort: sortBy.value,
      page: currentPage.value,
      pageSize,
    });
    if (requestId !== loadRequestId) return;
    const lastPage = Math.max(1, Math.ceil(fetched.total / pageSize));
    if (currentPage.value > lastPage) {
      currentPage.value = lastPage;
      return;
    }
    dateScopedOrders.value = fetched.orders;
    totalOrders.value = fetched.total;
    filteredRevenue.value = fetched.filteredRevenue;
    metrics.value = fetched.metrics;
  } catch (err) {
    if (requestId !== loadRequestId) return;
    notifyError({
      title: 'โหลดออเดอร์ไม่สำเร็จ',
      message:
        err instanceof Error ? err.message : 'ไม่สามารถโหลดรายการออเดอร์ได้ โปรดลองใหม่อีกครั้ง',
    });
  } finally {
    if (requestId === loadRequestId) isLoading.value = false;
  }
}

async function loadInitialData() {
  applyDatePreset('TODAY');
  try {
    const tbls = await fetchTables();
    tables.value = tbls;
  } catch {
    // Ignore silent table load error
  }
  setupRealtime();
}

// ─── Realtime Subscription ─────────────────────────────────────────────
function setupRealtime() {
  if (realtimeChannel) void supabase.removeChannel(realtimeChannel);

  realtimeChannel = supabase
    .channel('realtime:owner_order_mgmt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      void loadOrders();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => {
      void loadOrders();
    })
    .subscribe((status) => {
      isRealtimeConnected.value = (status as string) === 'SUBSCRIBED';
    });
}

// ─── Actions: View Details ─────────────────────────────────────────────
function openOrderDetails(order: OrderWithItems) {
  selectedOrder.value = order;
  showDetailModal.value = true;
}

// ─── Actions: Edit Order (Owner) ───────────────────────────────────────
function openEditOrderDialog(order: OrderWithItems) {
  editingOrder.value = order;
  showEditModal.value = true;
}

function openEditOrderFromDetailModal(order: OrderWithItems) {
  editingOrder.value = order;
  showDetailModal.value = false;
  showEditModal.value = true;
}

async function onOrderEdited() {
  await loadOrders();
  if (selectedOrder.value) {
    const updated = dateScopedOrders.value.find((o) => o.id === selectedOrder.value?.id);
    if (updated) {
      selectedOrder.value = updated;
    }
  }
}

// ─── Actions: Delete Order & Cascade Session ────────────────────────────
function promptDeleteOrder(order: OrderWithItems) {
  orderToDelete.value = order;
  showDeleteDialog.value = true;
}

function promptDeleteOrderFromModal(order: OrderWithItems) {
  orderToDelete.value = order;
  showDetailModal.value = false;
  showDeleteDialog.value = true;
}

async function handleConfirmDeleteOrder() {
  if (!orderToDelete.value) return;
  const targetOrder = orderToDelete.value;
  const qNum = formatQueueNumOnly(targetOrder.queue_number);
  const targetName = getTableDisplayName(targetOrder);

  isDeleting.value = true;
  try {
    const res = await deleteOrderAndSession(targetOrder.id);
    if (res.success) {
      notifySuccess({
        title: 'ลบออเดอร์สำเร็จ 🗑️',
        message: `ลบออเดอร์คิว #${qNum} (${targetName}) เรียบร้อยแล้ว`,
        caption: 'ข้อมูลออเดอร์และเซสชันที่เกี่ยวข้องถูกเคลียร์จากระบบแล้ว',
      });
      showDeleteDialog.value = false;
      orderToDelete.value = null;
      await loadOrders();
    }
  } catch (err) {
    notifyError({
      title: 'ลบออเดอร์ไม่สำเร็จ',
      message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบออเดอร์',
    });
  } finally {
    isDeleting.value = false;
  }
}

// ─── Lifecycle ─────────────────────────────────────────────────────────
watch(currentPage, () => void loadOrders());
watch([selectedStatus, selectedTableFilter, sortBy], () => {
  currentPage.value = 1;
  void loadOrders();
});
watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 1;
    void loadOrders();
  }, 300);
});

onMounted(() => {
  void loadInitialData();
});

onUnmounted(() => {
  if (realtimeChannel) void supabase.removeChannel(realtimeChannel);
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
.order-mgmt-page {
  background-color: var(--color-surface-subtle, #fafafc);
  min-height: 100vh;
}

.mgmt-container {
  max-width: 1440px;
  margin: 0 auto;
}

/* ─── Order Cards Grid ─── */
.order-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.apple-empty-wrap {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
}

.apple-pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 980px;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 8px 18px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3);
  color: #ffffff;
}

.apple-pill-btn--primary:hover {
  background: var(--color-primary-link, #0066cc);
}
</style>
