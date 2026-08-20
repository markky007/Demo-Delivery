<template>
  <q-page class="order-mgmt-page q-pa-md">
    <div class="mgmt-container">
      <!-- ─── Header Bar ─────────────────────────────────────────────── -->
      <div class="row items-center justify-between q-mb-md flex-wrap q-gutter-y-sm">
        <div>
          <div class="row items-center q-gutter-sm">
            <h5 class="q-my-none text-weight-bold page-title">จัดการออเดอร์</h5>
            <q-badge
              rounded
              :color="isRealtimeConnected ? 'green-1' : 'grey-3'"
              :text-color="isRealtimeConnected ? 'green-9' : 'grey-7'"
              class="q-px-sm py-xs text-caption text-weight-medium"
            >
              <span class="live-dot q-mr-xs" :class="{ 'live-dot--active': isRealtimeConnected }" />
              {{ isRealtimeConnected ? 'เชื่อมต่อเรียลไทม์' : 'ออฟไลน์' }}
            </q-badge>
          </div>
          <p class="text-caption text-grey-7 q-mb-none q-mt-xs">
            ดูภาพรวม ตรวจสอบรายการอาหาร และจัดการ/ลบออเดอร์พร้อมล้างเซสชันโต๊ะ
          </p>
        </div>

        <div class="row items-center q-gutter-sm">
          <q-btn
            unelevated
            rounded
            no-caps
            color="white"
            text-color="grey-9"
            icon="refresh"
            :loading="isLoading"
            label="รีเฟรช"
            class="shadow-subtle refresh-btn"
            @click="loadOrders"
          />
        </div>
      </div>

      <!-- ─── Top Stats Summary Cards ─────────────────────────────────── -->
      <div class="stats-grid q-mb-lg">
        <!-- 1. Total Orders -->
        <div class="stat-card">
          <div class="stat-card-icon stat-icon-total">
            <q-icon name="receipt_long" size="24px" />
          </div>
          <div class="stat-card-info">
            <span class="stat-label">ออเดอร์ทั้งหมด</span>
            <div class="stat-value text-grey-9">
              {{ totalOrdersCount }} <span class="stat-unit">รายการ</span>
            </div>
          </div>
        </div>

        <!-- 2. In Kitchen / Active -->
        <div class="stat-card" :class="{ 'stat-card--highlight': inKitchenCount > 0 }">
          <div class="stat-card-icon stat-icon-kitchen">
            <q-icon name="soup_kitchen" size="24px" />
          </div>
          <div class="stat-card-info">
            <span class="stat-label">กำลังดำเนินการในครัว</span>
            <div class="stat-value text-amber-9">
              {{ inKitchenCount }} <span class="stat-unit">ออเดอร์</span>
            </div>
          </div>
        </div>

        <!-- 3. Served Orders -->
        <div class="stat-card">
          <div class="stat-card-icon stat-icon-served">
            <q-icon name="done_all" size="24px" />
          </div>
          <div class="stat-card-info">
            <span class="stat-label">เสิร์ฟแล้ว</span>
            <div class="stat-value text-green-9">
              {{ servedCount }} <span class="stat-unit">ออเดอร์</span>
            </div>
          </div>
        </div>

        <!-- 4. Total Amount -->
        <div class="stat-card">
          <div class="stat-card-icon stat-icon-amount">
            <q-icon name="payments" size="24px" />
          </div>
          <div class="stat-card-info">
            <span class="stat-label">มูลค่ารวม (ที่เลือก)</span>
            <div class="stat-value text-primary font-mono">
              {{ formatPrice(totalRevenue) }}
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Filter & Search Toolbar ─────────────────────────────────── -->
      <div class="filter-panel q-mb-md">
        <!-- Date Presets & Custom Range -->
        <div class="row items-center justify-between q-mb-sm flex-wrap q-gutter-sm">
          <!-- Date Preset Pills -->
          <div class="row items-center q-gutter-xs date-presets">
            <q-btn
              v-for="preset in datePresets"
              :key="preset.id"
              unelevated
              rounded
              dense
              no-caps
              size="sm"
              :label="preset.label"
              :class="selectedDatePreset === preset.id ? 'preset-btn--active' : 'preset-btn--idle'"
              class="q-px-md"
              @click="applyDatePreset(preset.id)"
            />
          </div>

          <!-- Custom Date Pickers (if custom selected) -->
          <div v-if="selectedDatePreset === 'CUSTOM'" class="row items-center q-gutter-xs">
            <q-input
              v-model="customDateFrom"
              outlined
              dense
              type="date"
              label="ตั้งแต่วันที่"
              class="date-input"
            />
            <q-input
              v-model="customDateTo"
              outlined
              dense
              type="date"
              label="ถึงวันที่"
              class="date-input"
            />
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              icon="search"
              label="ค้นหา"
              size="sm"
              class="q-px-sm"
              @click="loadOrders"
            />
          </div>
        </div>

        <q-separator class="q-my-sm separator-subtle" />

        <!-- Search, Status & Table Filters -->
        <div class="row items-center q-gutter-sm flex-wrap">
          <!-- Search box -->
          <div class="col-12 col-sm-4 col-md-3">
            <q-input
              v-model="searchQuery"
              outlined
              dense
              rounded
              clearable
              placeholder="ค้นหาเลขคิว, โต๊ะ, เมนูอาหาร..."
              class="search-input"
            >
              <template v-slot:prepend>
                <q-icon name="search" size="18px" color="grey-6" />
              </template>
            </q-input>
          </div>

          <!-- Status Filter -->
          <div class="row items-center q-gutter-xs status-pills">
            <q-chip
              v-for="st in statusFilters"
              :key="st.value"
              clickable
              :selected="selectedStatus === st.value"
              :color="selectedStatus === st.value ? 'primary' : 'grey-2'"
              :text-color="selectedStatus === st.value ? 'white' : 'grey-8'"
              size="sm"
              class="text-weight-medium q-ma-none"
              @click="setStatusFilter(st.value)"
            >
              {{ st.label }}
              <q-badge
                v-if="getStatusCount(st.value) > 0"
                rounded
                :color="selectedStatus === st.value ? 'white' : 'grey-4'"
                :text-color="selectedStatus === st.value ? 'primary' : 'grey-9'"
                class="q-ml-xs text-bold"
              >
                {{ getStatusCount(st.value) }}
              </q-badge>
            </q-chip>
          </div>

          <q-space />

          <!-- Table Filter -->
          <div class="col-12 col-sm-auto">
            <q-select
              v-model="selectedTableFilter"
              :options="tableOptions"
              outlined
              dense
              rounded
              emit-value
              map-options
              label="เลือกโต๊ะ"
              class="table-select"
            >
              <template v-slot:prepend>
                <q-icon name="table_restaurant" size="18px" color="grey-6" />
              </template>
            </q-select>
          </div>
        </div>
      </div>

      <!-- ─── Orders List / Table ──────────────────────────────────────── -->
      <div v-if="isLoading" class="q-py-md">
        <LoadingSkeleton type="table" :count="6" />
      </div>

      <div v-else-if="filteredOrders.length === 0" class="empty-wrap q-py-xl">
        <EmptyState
          icon="manage_search"
          title="ไม่พบรายการออเดอร์"
          description="ไม่พบรายการออเดอร์ที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองที่เลือก"
        >
          <template #action>
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              label="ล้างตัวกรองทั้งหมด"
              class="q-mt-sm"
              @click="resetFilters"
            />
          </template>
        </EmptyState>
      </div>

      <div v-else class="orders-table-wrapper">
        <q-table
          :rows="filteredOrders"
          :columns="columns"
          row-key="id"
          flat
          bordered
          class="orders-table"
          :rows-per-page-options="[15, 30, 50, 100]"
          :pagination="{ rowsPerPage: 15 }"
        >
          <!-- Cell: Queue Number -->
          <template v-slot:body-cell-queue_number="props">
            <q-td :props="props">
              <div class="queue-badge-pill">
                <span class="queue-badge-hash">#</span>
                <span class="queue-badge-num">{{ formatQueueNumOnly(props.row.queue_number) }}</span>
              </div>
            </q-td>
          </template>

          <!-- Cell: Table / Customer -->
          <template v-slot:body-cell-table="props">
            <q-td :props="props">
              <div class="column">
                <div class="row items-center q-gutter-xs">
                  <q-icon
                    :name="props.row.table_session?.customer_name ? 'shopping_bag' : 'table_restaurant'"
                    size="16px"
                    :color="props.row.table_session?.customer_name ? 'orange-9' : 'primary'"
                  />
                  <span class="text-weight-bold text-grey-9">
                    {{ getTableDisplayName(props.row) }}
                  </span>
                </div>
                <div class="text-caption text-grey-6 row items-center q-gutter-xs q-mt-xs">
                  <q-icon name="schedule" size="12px" />
                  <span>{{ formatTime(props.row.created_at) }}</span>
                  <span class="text-grey-5">•</span>
                  <span>{{ formatElapsed(props.row.created_at) }}</span>
                </div>
              </div>
            </q-td>
          </template>

          <!-- Cell: Items Summary -->
          <template v-slot:body-cell-items="props">
            <q-td :props="props" class="items-cell">
              <div class="items-summary-list">
                <div
                  v-for="(item, idx) in props.row.items"
                  :key="item.id || idx"
                  class="item-summary-line"
                >
                  <span class="item-qty-badge">{{ item.quantity }}x</span>
                  <span class="item-name text-weight-medium text-grey-9">
                    {{ item.snapshot_name }}
                  </span>
                  <!-- Options pills if any -->
                  <div
                    v-if="item.options && item.options.length > 0"
                    class="item-options-inline text-caption text-grey-7"
                  >
                    ({{ item.options.map((o: OrderItemOption) => o.snapshot_option_name).join(', ') }})
                  </div>
                  <!-- Special note if any -->
                  <div v-if="item.special_instruction" class="item-note-inline">
                    <q-icon name="edit_note" size="13px" color="orange-8" class="q-mr-xs" />
                    <span class="text-orange-9 text-caption">{{ item.special_instruction }}</span>
                  </div>
                </div>
              </div>
            </q-td>
          </template>

          <!-- Cell: Total Amount -->
          <template v-slot:body-cell-total_amount="props">
            <q-td :props="props">
              <div class="text-weight-bold text-primary font-mono text-subtitle2">
                {{ formatPrice(props.row.total_amount) }}
              </div>
              <div class="text-caption text-grey-6">
                {{ props.row.items?.length || 0 }} รายการ
              </div>
            </q-td>
          </template>

          <!-- Cell: Status -->
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <StatusBadge :status="props.row.status" />
            </q-td>
          </template>

          <!-- Cell: Actions -->
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <div class="row items-center justify-end q-gutter-xs">
                <!-- View Details -->
                <q-btn
                  flat
                  round
                  dense
                  color="primary"
                  icon="visibility"
                  size="sm"
                  class="action-btn-icon"
                  @click="openOrderDetails(props.row)"
                >
                  <q-tooltip class="bg-dark">ดูรายละเอียดออเดอร์</q-tooltip>
                </q-btn>

                <!-- Delete & Clear Order -->
                <q-btn
                  flat
                  round
                  dense
                  color="negative"
                  icon="delete_outline"
                  size="sm"
                  class="action-btn-icon action-btn-delete"
                  @click="promptDeleteOrder(props.row)"
                >
                  <q-tooltip class="bg-negative">ลบออเดอร์และล้างเซสชันโต๊ะ</q-tooltip>
                </q-btn>
              </div>
            </q-td>
          </template>
        </q-table>
      </div>

      <!-- ─── Order Detail Modal Dialog ───────────────────────────────── -->
      <q-dialog v-model="showDetailModal" transition-show="scale" transition-hide="scale">
        <q-card v-if="selectedOrder" class="detail-card">
          <!-- Modal Header -->
          <q-card-section class="detail-header row items-center justify-between">
            <div class="row items-center q-gutter-sm">
              <div class="detail-queue-badge">
                #{{ formatQueueNumOnly(selectedOrder.queue_number) }}
              </div>
              <div>
                <div class="text-subtitle1 text-weight-bold text-grey-9">
                  รายละเอียดออเดอร์ #{{ formatQueueNumOnly(selectedOrder.queue_number) }}
                </div>
                <div class="text-caption text-grey-7">
                  {{ getTableDisplayName(selectedOrder) }}
                </div>
              </div>
            </div>
            <q-btn flat round dense icon="close" v-close-popup color="grey-7" />
          </q-card-section>

          <q-separator class="separator-subtle" />

          <!-- Modal Body -->
          <q-card-section class="q-pa-md scroll detail-body">
            <!-- Timeline / Info chips -->
            <div class="info-chips-row q-mb-md">
              <div class="info-chip">
                <span class="info-chip-label">สถานะ</span>
                <StatusBadge :status="selectedOrder.status" />
              </div>
              <div class="info-chip">
                <span class="info-chip-label">เวลาที่สั่ง</span>
                <span class="text-caption text-weight-medium text-grey-9">
                  {{ formatDateTime(selectedOrder.created_at) }}
                </span>
              </div>
              <div class="info-chip">
                <span class="info-chip-label">ระยะเวลา</span>
                <span class="text-caption text-weight-medium text-grey-8">
                  {{ formatElapsed(selectedOrder.created_at) }}
                </span>
              </div>
            </div>

            <!-- Items List -->
            <div class="text-weight-bold text-subtitle2 text-grey-9 q-mb-sm">
              รายการอาหาร ({{ selectedOrder.items?.length || 0 }} รายการ)
            </div>

            <div class="detail-items-list q-mb-md">
              <div
                v-for="item in selectedOrder.items"
                :key="item.id"
                class="detail-item-row"
              >
                <div class="col">
                  <div class="row items-center q-gutter-xs">
                    <span class="text-weight-bold text-primary">{{ item.quantity }}x</span>
                    <span class="text-weight-medium text-grey-9">{{ item.snapshot_name }}</span>
                  </div>
                  <!-- Options -->
                  <div
                    v-if="item.options && item.options.length > 0"
                    class="detail-options-list text-caption text-grey-7 q-mt-xs"
                  >
                    <div
                      v-for="opt in item.options"
                      :key="opt.id"
                      class="row items-center justify-between option-subrow"
                    >
                      <span>• {{ opt.snapshot_group_name }}: {{ opt.snapshot_option_name }}</span>
                      <span v-if="opt.snapshot_price_adjustment > 0" class="text-grey-6 font-mono">
                        +{{ formatPrice(opt.snapshot_price_adjustment) }}
                      </span>
                    </div>
                  </div>
                  <!-- Special note -->
                  <div v-if="item.special_instruction" class="q-mt-xs text-orange-9 text-caption bg-orange-1 q-pa-xs rounded-borders">
                    <q-icon name="edit_note" size="14px" class="q-mr-xs" />
                    โน้ต: {{ item.special_instruction }}
                  </div>
                </div>

                <!-- Subtotal -->
                <div class="text-weight-bold text-grey-9 font-mono q-ml-md self-start">
                  {{ formatPrice(item.subtotal) }}
                </div>
              </div>
            </div>

            <!-- Summary Total -->
            <div class="detail-total-box row items-center justify-between q-pa-md">
              <span class="text-weight-bold text-grey-8">ยอดเงินรวมทั้งหมด</span>
              <span class="text-h6 text-weight-bold text-primary font-mono">
                {{ formatPrice(selectedOrder.total_amount) }}
              </span>
            </div>

            <!-- Session & IDs info -->
            <div class="technical-info q-mt-md q-pa-sm text-caption text-grey-6 bg-grey-1 rounded-borders">
              <div><strong>Order ID:</strong> <span class="font-mono">{{ selectedOrder.id }}</span></div>
              <div v-if="selectedOrder.table_session_id">
                <strong>Session ID:</strong> <span class="font-mono">{{ selectedOrder.table_session_id }}</span>
              </div>
            </div>
          </q-card-section>

          <q-separator class="separator-subtle" />

          <!-- Modal Actions -->
          <q-card-actions align="between" class="q-pa-md">
            <q-btn
              flat
              no-caps
              color="negative"
              icon="delete_outline"
              label="ลบออเดอร์นี้"
              @click="promptDeleteOrderFromModal"
            />
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              label="ปิดหน้าต่าง"
              class="q-px-lg"
              v-close-popup
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- ─── Delete Confirmation Dialog ──────────────────────────────── -->
      <q-dialog v-model="showDeleteDialog" persistent transition-show="scale" transition-hide="scale">
        <q-card v-if="orderToDelete" class="delete-dialog-card">
          <q-card-section class="text-center q-pt-lg q-pb-none">
            <div class="delete-icon-wrapper q-mx-auto q-mb-md">
              <q-icon name="delete_forever" size="36px" color="negative" />
            </div>
            <div class="text-h6 text-weight-bold text-grey-9">
              ยืนยันการลบออเดอร์?
            </div>
            <div class="text-subtitle2 text-primary q-mt-xs font-mono">
              คิว #{{ formatQueueNumOnly(orderToDelete.queue_number) }} ({{ getTableDisplayName(orderToDelete) }})
            </div>
          </q-card-section>

          <q-card-section class="q-px-lg q-py-md">
            <div class="delete-warning-box q-pa-md rounded-borders">
              <div class="row items-center text-negative text-weight-bold q-mb-xs">
                <q-icon name="warning" size="18px" class="q-mr-xs" />
                คำเตือน: การลบข้อมูลทั้งหมดที่เกี่ยวข้อง (Clear All)
              </div>
              <p class="text-caption text-grey-8 q-mb-xs">
                การดำเนินการนี้จะทำการลบข้อมูลออกจากระบบอย่างถาวร ได้แก่:
              </p>
              <ul class="delete-checklist q-my-none text-caption text-grey-7">
                <li>ลบรายการออเดอร์และรายการอาหารทั้งหมดในออเดอร์นี้</li>
                <li>ลบบิล (Bill) และยอดรวมการชำระเงินที่เกี่ยวข้อง</li>
                <li>ล้างเซสชันของโต๊ะ (Table Session) คืนสถานะ <strong>"โต๊ะว่าง"</strong> ทันที</li>
              </ul>
            </div>
          </q-card-section>

          <q-card-actions align="center" class="q-pb-lg q-px-lg q-gutter-sm">
            <q-btn
              flat
              rounded
              no-caps
              label="ยกเลิก"
              color="grey-7"
              class="q-px-lg"
              :disable="isDeleting"
              v-close-popup
            />
            <q-btn
              unelevated
              rounded
              no-caps
              color="negative"
              icon="delete"
              :loading="isDeleting"
              label="ยืนยันการลบและล้างข้อมูล"
              class="q-px-lg"
              @click="handleConfirmDeleteOrder"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from 'src/services/supabase';
import { fetchManageOrders, deleteOrderAndSession } from 'src/services/orderService';
import { fetchTables } from 'src/services/tableService';
import type { OrderWithItems, TableWithQR, OrderItemOption } from 'src/types/database';
import { OrderStatus } from 'src/types/enums';
import { formatPrice, formatDateTime, formatTime, formatElapsed } from 'src/utils/formatters';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import EmptyState from 'src/components/EmptyState.vue';

const $q = useQuasar();

// ─── State ─────────────────────────────────────────────────────────────
const isLoading = ref(true);
const isDeleting = ref(false);
const isRealtimeConnected = ref(false);
const orders = ref<OrderWithItems[]>([]);
const tables = ref<TableWithQR[]>([]);

// Filter states
const selectedDatePreset = ref<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'ALL' | 'CUSTOM'>('TODAY');
const customDateFrom = ref('');
const customDateTo = ref('');
const selectedStatus = ref<OrderStatus | 'ALL'>('ALL');
const selectedTableFilter = ref<string>('ALL');
const searchQuery = ref('');

// Modals
const showDetailModal = ref(false);
const selectedOrder = ref<OrderWithItems | null>(null);

const showDeleteDialog = ref(false);
const orderToDelete = ref<OrderWithItems | null>(null);

// Realtime
let realtimeChannel: RealtimeChannel | null = null;

// Date presets config
const datePresets = [
  { id: 'TODAY', label: 'วันนี้' },
  { id: 'YESTERDAY', label: 'เมื่อวาน' },
  { id: 'LAST_7_DAYS', label: '7 วันล่าสุด' },
  { id: 'ALL', label: 'ทั้งหมด' },
  { id: 'CUSTOM', label: 'กำหนดเอง...' },
] as const;

// Status filter config
const statusFilters = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: OrderStatus.QUEUED, label: 'รอคิว' },
  { value: OrderStatus.PREPARING, label: 'กำลังปรุง' },
  { value: OrderStatus.PREPARED, label: 'ปรุงเสร็จ' },
  { value: OrderStatus.SERVED, label: 'เสิร์ฟแล้ว' },
] as const;

// Columns for QTable
const columns = [
  {
    name: 'queue_number',
    label: 'คิว',
    field: 'queue_number',
    align: 'left' as const,
    sortable: true,
    style: 'width: 90px',
  },
  {
    name: 'table',
    label: 'โต๊ะ / ปลายทาง',
    field: (row: OrderWithItems) => getTableDisplayName(row),
    align: 'left' as const,
    sortable: true,
    style: 'min-width: 170px',
  },
  {
    name: 'items',
    label: 'รายการอาหาร',
    field: 'items',
    align: 'left' as const,
    style: 'min-width: 280px',
  },
  {
    name: 'total_amount',
    label: 'ยอดรวม',
    field: 'total_amount',
    align: 'right' as const,
    sortable: true,
    style: 'width: 120px',
  },
  {
    name: 'status',
    label: 'สถานะ',
    field: 'status',
    align: 'center' as const,
    sortable: true,
    style: 'width: 140px',
  },
  {
    name: 'actions',
    label: 'จัดการ',
    field: 'id',
    align: 'right' as const,
    style: 'width: 110px',
  },
];

// ─── Table Options for Select ──────────────────────────────────────────
const tableOptions = computed(() => {
  const opts: { label: string; value: string }[] = [{ label: 'ทุกโต๊ะ / ทุกประเภท', value: 'ALL' }];
  for (const t of tables.value) {
    opts.push({ label: t.name, value: t.id });
  }
  return opts;
});

// ─── Computed Statistics ───────────────────────────────────────────────
const totalOrdersCount = computed(() => filteredOrders.value.length);

const inKitchenCount = computed(() =>
  filteredOrders.value.filter(
    (o) =>
      o.status === OrderStatus.QUEUED ||
      o.status === OrderStatus.PREPARING ||
      o.status === OrderStatus.PREPARED,
  ).length,
);

const servedCount = computed(
  () => filteredOrders.value.filter((o) => o.status === OrderStatus.SERVED).length,
);

const totalRevenue = computed(() =>
  filteredOrders.value.reduce((sum, o) => sum + (o.total_amount || 0), 0),
);

// ─── Filtered Orders ───────────────────────────────────────────────────
const filteredOrders = computed(() => {
  let list = orders.value;

  // Search filter
  if (searchQuery.value && searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((order) => {
      // Check queue number
      const qNumStr = String(order.queue_number);
      if (qNumStr.includes(q) || `#${qNumStr}`.includes(q)) return true;

      // Check table / customer name
      const tableName = order.table_session?.table?.name?.toLowerCase() || '';
      const custName = order.table_session?.customer_name?.toLowerCase() || '';
      if (tableName.includes(q) || custName.includes(q)) return true;

      // Check item names
      if (order.items?.some((it) => it.snapshot_name.toLowerCase().includes(q))) return true;

      return false;
    });
  }

  return list;
});

// Helper for status count
function getStatusCount(status: OrderStatus | 'ALL'): number {
  if (status === 'ALL') return orders.value.length;
  return orders.value.filter((o) => o.status === status).length;
}

// Format queue number to clean padded string
function formatQueueNumOnly(num: number): string {
  return String(num).padStart(3, '0');
}

// Display Name helper
function getTableDisplayName(order: OrderWithItems): string {
  if (order.table_session?.customer_name) {
    return `สั่งกลับบ้าน (${order.table_session.customer_name})`;
  }
  return order.table_session?.table?.name || 'ไม่ระบุโต๊ะ';
}

// ─── Date Preset Handler ───────────────────────────────────────────────
function applyDatePreset(preset: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'ALL' | 'CUSTOM') {
  selectedDatePreset.value = preset;

  const now = new Date();
  const formatYMD = (d: Date): string => d.toISOString().split('T')[0] ?? '';

  if (preset === 'TODAY') {
    customDateFrom.value = formatYMD(now);
    customDateTo.value = formatYMD(now);
  } else if (preset === 'YESTERDAY') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    customDateFrom.value = formatYMD(yesterday);
    customDateTo.value = formatYMD(yesterday);
  } else if (preset === 'LAST_7_DAYS') {
    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 6);
    customDateFrom.value = formatYMD(past7);
    customDateTo.value = formatYMD(now);
  } else if (preset === 'ALL') {
    customDateFrom.value = '';
    customDateTo.value = '';
  }

  void loadOrders();
}

function setStatusFilter(status: OrderStatus | 'ALL') {
  selectedStatus.value = status;
  void loadOrders();
}

function resetFilters() {
  selectedDatePreset.value = 'TODAY';
  selectedStatus.value = 'ALL';
  selectedTableFilter.value = 'ALL';
  searchQuery.value = '';
  applyDatePreset('TODAY');
}

// ─── Data Loading ──────────────────────────────────────────────────────
async function loadOrders() {
  isLoading.value = true;
  try {
    const fetched = await fetchManageOrders({
      dateFrom: customDateFrom.value ? customDateFrom.value : undefined,
      dateTo: customDateTo.value ? customDateTo.value : undefined,
      status: selectedStatus.value,
      tableId: selectedTableFilter.value,
    });
    orders.value = fetched;
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : 'ไม่สามารถโหลดรายการออเดอร์ได้',
      position: 'top',
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

// ─── Actions: Delete Order & Cascade Session ────────────────────────────
function promptDeleteOrder(order: OrderWithItems) {
  orderToDelete.value = order;
  showDeleteDialog.value = true;
}

function promptDeleteOrderFromModal() {
  if (!selectedOrder.value) return;
  orderToDelete.value = selectedOrder.value;
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
      $q.notify({
        type: 'positive',
        message: `ลบออเดอร์คิว #${qNum} (${targetName}) และเคลียร์ข้อมูลเรียบร้อยแล้ว`,
        icon: 'check_circle',
        position: 'top',
      });
      showDeleteDialog.value = false;
      orderToDelete.value = null;
      await loadOrders();
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบออเดอร์',
      icon: 'error',
      position: 'top',
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
  background-color: var(--color-background);
  min-height: 100vh;
}

.mgmt-container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-title {
  color: var(--color-text-primary);
  font-size: 1.35rem;
}

.live-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #9e9e9e;
}

.live-dot--active {
  background-color: #4caf50;
  box-shadow: 0 0 6px #4caf50;
  animation: pulse-dot 2s infinite ease-in-out;
}

@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}

.shadow-subtle {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.separator-subtle {
  background: var(--color-border-subtle);
}

/* ─── Top Stats Grid ─── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.stat-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.stat-card--highlight {
  border-color: #ffe082;
  background: #fffdf5;
}

.stat-card-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-total {
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
}

.stat-icon-kitchen {
  background: #fff8e1;
  color: #f57f17;
}

.stat-icon-served {
  background: #e8f5e9;
  color: #2e7d32;
}

.stat-icon-amount {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.stat-card-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-unit {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-text-secondary);
}

/* ─── Filter Panel ─── */
.filter-panel {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
}

.date-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-btn--active {
  background: var(--color-primary) !important;
  color: #ffffff !important;
  font-weight: 600;
}

.preset-btn--idle {
  background: var(--color-surface-subtle) !important;
  color: var(--color-text-secondary) !important;
  border: 1px solid var(--color-border);
}

.date-input {
  width: 150px;
}

.search-input {
  min-width: 220px;
}

.table-select {
  min-width: 180px;
}

/* ─── Orders Table ─── */
.orders-table-wrapper {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.orders-table {
  background: transparent;
}

.queue-badge-pill {
  display: inline-flex;
  align-items: baseline;
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 4px 10px;
  font-weight: 700;
}

.queue-badge-hash {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-right: 2px;
}

.queue-badge-num {
  font-size: 1rem;
  color: var(--color-primary);
  font-family: monospace;
}

.items-cell {
  white-space: normal;
}

.items-summary-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-summary-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 0.88rem;
}

.item-qty-badge {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 700;
  font-size: 0.75rem;
  padding: 1px 6px;
  border-radius: 4px;
}

.item-options-inline {
  font-style: italic;
}

.item-note-inline {
  display: inline-flex;
  align-items: center;
  background: #fff8e1;
  padding: 1px 6px;
  border-radius: 4px;
}

.action-btn-icon {
  transition: all 0.15s ease;
}

.action-btn-delete:hover {
  background: #ffebee !important;
}

/* ─── Detail Modal ─── */
.detail-card {
  width: 100%;
  max-width: 580px;
  border-radius: var(--radius-lg);
  background: #ffffff;
}

.detail-header {
  padding: 16px 20px;
}

.detail-queue-badge {
  background: var(--color-primary);
  color: #ffffff;
  font-weight: 700;
  font-size: 1.1rem;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-family: monospace;
}

.detail-body {
  max-height: 70vh;
}

.info-chips-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.info-chip {
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-chip-label {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.detail-items-list {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.detail-item-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.detail-item-row:last-child {
  border-bottom: none;
}

.option-subrow {
  padding: 2px 0;
}

.detail-total-box {
  background: var(--color-primary-soft);
  border: 1px solid var(--color-primary-subtle);
  border-radius: var(--radius-md);
}

/* ─── Delete Dialog ─── */
.delete-dialog-card {
  width: 100%;
  max-width: 480px;
  border-radius: var(--radius-lg);
  background: #ffffff;
}

.delete-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #ffebee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-warning-box {
  background: #fff5f5;
  border: 1px solid #ffcdd2;
}

.delete-checklist {
  padding-left: 18px;
  line-height: 1.6;
}

.empty-wrap {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
</style>
