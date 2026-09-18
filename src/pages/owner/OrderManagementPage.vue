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
        :total-orders="dateScopedOrders.length"
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
        :total-filtered-count="filteredOrders.length"
        @apply-date-preset="applyDatePreset"
        @apply-custom-dates="loadOrders"
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useNotify } from 'src/composables/useNotify';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from 'src/services/supabase';
import { fetchManageOrders, deleteOrderAndSession } from 'src/services/orderService';
import { fetchTables } from 'src/services/tableService';
import type { OrderWithItems, TableWithQR } from 'src/types/database';
import { OrderStatus } from 'src/types/enums';

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

// ─── Reactive Filtered & Sorted Orders ─────────────────────────────────
const filteredOrders = computed(() => {
  let list = [...dateScopedOrders.value];

  // 1. Status Filter
  if (selectedStatus.value !== 'ALL') {
    list = list.filter((o) => o.status === selectedStatus.value);
  }

  // 2. Table / Dining Type Filter
  if (selectedTableFilter.value === 'DINE_IN') {
    list = list.filter((o) => !o.table_session?.customer_name);
  } else if (selectedTableFilter.value === 'TAKEAWAY') {
    list = list.filter((o) => Boolean(o.table_session?.customer_name));
  } else if (selectedTableFilter.value.startsWith('TABLE_')) {
    const targetTableId = selectedTableFilter.value.replace('TABLE_', '');
    list = list.filter((o) => o.table_session?.table?.id === targetTableId);
  }

  // 3. Search Query Filter
  if (searchQuery.value && searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((order) => {
      const qNumStr = String(order.queue_number);
      if (qNumStr.includes(q) || `#${qNumStr}`.includes(q)) return true;

      const tableName = order.table_session?.table?.name?.toLowerCase() || '';
      const custName = order.table_session?.customer_name?.toLowerCase() || '';
      if (tableName.includes(q) || custName.includes(q)) return true;

      if (
        order.items?.some(
          (it) =>
            it.snapshot_name.toLowerCase().includes(q) ||
            (it.special_instruction && it.special_instruction.toLowerCase().includes(q)),
        )
      ) {
        return true;
      }

      if (order.id.toLowerCase().includes(q)) return true;

      return false;
    });
  }

  // 4. Sorting
  list.sort((a, b) => {
    switch (sortBy.value) {
      case 'CREATED_ASC':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'QUEUE_ASC':
        return a.queue_number - b.queue_number;
      case 'QUEUE_DESC':
        return b.queue_number - a.queue_number;
      case 'AMOUNT_DESC':
        return (b.total_amount || 0) - (a.total_amount || 0);
      case 'CREATED_DESC':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return list;
});

// ─── Status Counts (Based on current Date Range) ───────────────────────
const statusCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {
    ALL: dateScopedOrders.value.length,
    [OrderStatus.QUEUED]: 0,
    [OrderStatus.PREPARING]: 0,
    [OrderStatus.PREPARED]: 0,
    [OrderStatus.SERVED]: 0,
  };

  for (const o of dateScopedOrders.value) {
    const current = counts[o.status] ?? 0;
    counts[o.status] = current + 1;
  }

  return counts;
});

// ─── Computed Stats for Metrics ────────────────────────────────────────
const inKitchenCount = computed(
  () =>
    dateScopedOrders.value.filter(
      (o) =>
        o.status === OrderStatus.QUEUED ||
        o.status === OrderStatus.PREPARING ||
        o.status === OrderStatus.PREPARED,
    ).length,
);

const servedCount = computed(
  () => dateScopedOrders.value.filter((o) => o.status === OrderStatus.SERVED).length,
);

const totalRevenue = computed(() =>
  filteredOrders.value.reduce((sum, o) => sum + (o.total_amount || 0), 0),
);

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

  void loadOrders();
}

function handleSelectMetricStatus(status: OrderStatus | 'ALL') {
  selectedStatus.value = status;
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
  isLoading.value = true;
  try {
    const fetched = await fetchManageOrders({
      dateFrom: customDateFrom.value ? customDateFrom.value : undefined,
      dateTo: customDateTo.value ? customDateTo.value : undefined,
      status: 'ALL',
    });
    dateScopedOrders.value = fetched;
  } catch (err) {
    notifyError({
      title: 'โหลดออเดอร์ไม่สำเร็จ',
      message:
        err instanceof Error ? err.message : 'ไม่สามารถโหลดรายการออเดอร์ได้ โปรดลองใหม่อีกครั้ง',
    });
  } finally {
    isLoading.value = false;
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
onMounted(() => {
  void loadInitialData();
});

onUnmounted(() => {
  if (realtimeChannel) void supabase.removeChannel(realtimeChannel);
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
