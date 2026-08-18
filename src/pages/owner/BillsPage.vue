<template>
  <q-page class="bills-page q-pa-md">
    <div class="bills-container">
      <!-- Header Section -->
      <div class="row items-center justify-between q-mb-md header-section">
        <div>
          <h5 class="q-my-none text-weight-bold page-title">บิลและโต๊ะที่เปิดอยู่</h5>
          <p class="text-caption text-grey-7 q-mb-none">
            ภาพรวมสถานะโต๊ะ บิลที่เปิดอยู่ และการเช็กบิลชำระเงิน
          </p>
        </div>
        <div class="row items-center q-gutter-sm">
          <q-badge color="positive" rounded class="q-px-sm q-py-xs realtime-badge">
            <span class="pulse-dot q-mr-xs"></span>
            <span>อัปเดตเรียลไทม์</span>
          </q-badge>
          <q-btn
            flat
            round
            dense
            color="primary"
            icon="refresh"
            :loading="isRefreshing"
            @click="refreshData"
          >
            <q-tooltip>รีเฟรชข้อมูล</q-tooltip>
          </q-btn>
          <q-btn
            outline
            color="primary"
            no-caps
            rounded
            icon="table_restaurant"
            label="จัดการโต๊ะ"
            to="/owner/tables"
            class="manage-tables-btn"
          />
        </div>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="isLoading" class="q-mb-lg">
        <LoadingSkeleton type="tables" :count="6" />
      </div>

      <template v-else>
        <!-- Top Stats Overview Bar -->
        <div class="stats-overview-grid q-mb-lg">
          <!-- Total Tables -->
          <div class="stat-card" @click="selectedFilter = 'ALL'">
            <div class="stat-icon-wrapper bg-blue-1 text-blue-9">
              <q-icon name="table_restaurant" size="22px" />
            </div>
            <div class="stat-details">
              <div class="stat-label">โต๊ะทั้งหมด</div>
              <div class="stat-value">{{ tables.length }} <span class="unit">โต๊ะ</span></div>
            </div>
          </div>

          <!-- Active Seated -->
          <div
            class="stat-card"
            :class="{ 'stat-card--active-filter': selectedFilter === 'ACTIVE' }"
            @click="selectedFilter = 'ACTIVE'"
          >
            <div class="stat-icon-wrapper bg-amber-1 text-amber-9">
              <q-icon name="restaurant" size="22px" />
            </div>
            <div class="stat-details">
              <div class="stat-label">กำลังนั่งทาน</div>
              <div class="stat-value text-amber-9">
                {{ activeCount }} <span class="unit">โต๊ะ</span>
              </div>
            </div>
          </div>

          <!-- Ready to Pay (All served) -->
          <div
            class="stat-card"
            :class="{ 'stat-card--active-filter': selectedFilter === 'READY_TO_PAY' }"
            @click="selectedFilter = 'READY_TO_PAY'"
          >
            <div class="stat-icon-wrapper bg-green-1 text-green-8">
              <q-icon name="receipt_long" size="22px" />
            </div>
            <div class="stat-details">
              <div class="stat-label">พร้อมเช็กบิล</div>
              <div class="stat-value text-green-8">
                {{ readyToPayCount }} <span class="unit">โต๊ะ</span>
              </div>
            </div>
          </div>

          <!-- Total Active Bills Value -->
          <div class="stat-card stat-card--highlight">
            <div class="stat-icon-wrapper bg-primary-soft text-primary">
              <q-icon name="payments" size="22px" />
            </div>
            <div class="stat-details">
              <div class="stat-label">ยอดรวมบิลที่เปิดอยู่</div>
              <div class="stat-value text-primary">{{ formatPrice(totalActiveAmount) }}</div>
            </div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="toolbar-card q-mb-md">
          <div class="row items-center justify-between q-col-gutter-sm">
            <!-- Filter Tabs -->
            <div class="col-12 col-md-auto">
              <div class="filter-pills-row">
                <button
                  class="filter-pill-btn"
                  :class="{ active: selectedFilter === 'ALL' }"
                  @click="selectedFilter = 'ALL'"
                >
                  ทั้งหมด ({{ tables.length }})
                </button>
                <button
                  class="filter-pill-btn"
                  :class="{ active: selectedFilter === 'ACTIVE' }"
                  @click="selectedFilter = 'ACTIVE'"
                >
                  <span class="dot-indicator dot-amber"></span>
                  กำลังนั่งทาน ({{ activeCount }})
                </button>
                <button
                  class="filter-pill-btn"
                  :class="{ active: selectedFilter === 'READY_TO_PAY' }"
                  @click="selectedFilter = 'READY_TO_PAY'"
                >
                  <span class="dot-indicator dot-green"></span>
                  พร้อมเช็กบิล ({{ readyToPayCount }})
                </button>
                <button
                  class="filter-pill-btn"
                  :class="{ active: selectedFilter === 'AVAILABLE' }"
                  @click="selectedFilter = 'AVAILABLE'"
                >
                  <span class="dot-indicator dot-grey"></span>
                  โต๊ะว่าง ({{ availableCount }})
                </button>
              </div>
            </div>

            <!-- Search input -->
            <div class="col-12 col-md-4">
              <q-input
                v-model="searchQuery"
                dense
                outlined
                placeholder="ค้นหาชื่อโต๊ะ..."
                clearable
                class="search-input"
              >
                <template #prepend>
                  <q-icon name="search" size="18px" color="grey-6" />
                </template>
              </q-input>
            </div>
          </div>
        </div>

        <!-- Cards Grid -->
        <div v-if="filteredTableCards.length > 0" class="cards-grid">
          <div
            v-for="item in filteredTableCards"
            :key="item.table.id"
            class="table-status-card"
            :class="{
              'table-status-card--active': item.session !== null,
              'table-status-card--ready-pay': item.isReadyToPay,
              'table-status-card--paid': item.isPaid,
              'table-status-card--empty': item.session === null,
            }"
          >
            <!-- Card Header -->
            <div class="card-top-bar">
              <div class="row items-center">
                <div
                  class="table-icon-avatar"
                  :class="{
                    'bg-primary-soft text-primary': item.session !== null,
                    'bg-grey-2 text-grey-6': item.session === null,
                  }"
                >
                  <q-icon name="table_restaurant" size="20px" />
                </div>
                <div class="q-ml-sm">
                  <div class="table-card-title">{{ item.table.name }}</div>
                  <div class="text-caption text-grey-6">
                    <template v-if="item.session">
                      เริ่มทานเมื่อ {{ item.startedAtTime }}
                    </template>
                    <template v-else> พร้อมรับลูกค้า </template>
                  </div>
                </div>
              </div>

              <!-- Status Badge -->
              <div>
                <q-badge
                  v-if="item.isPaid"
                  color="positive"
                  rounded
                  class="q-px-sm q-py-xs status-pill"
                >
                  <q-icon name="check_circle" size="13px" class="q-mr-xs" />
                  <span>ชำระเงินแล้ว</span>
                </q-badge>
                <q-badge
                  v-else-if="item.isReadyToPay"
                  color="green-8"
                  rounded
                  class="q-px-sm q-py-xs status-pill bg-green-1 text-green-9 border-green"
                >
                  <span class="live-dot dot-green q-mr-xs"></span>
                  <span>เสิร์ฟครบ รอเช็กบิล</span>
                </q-badge>
                <q-badge
                  v-else-if="item.session"
                  color="amber-9"
                  rounded
                  class="q-px-sm q-py-xs status-pill bg-amber-1 text-amber-10 border-amber"
                >
                  <span class="live-dot dot-amber q-mr-xs"></span>
                  <span>กำลังนั่งทาน</span>
                </q-badge>
                <q-badge
                  v-else
                  color="grey-4"
                  text-color="grey-8"
                  rounded
                  class="q-px-sm q-py-xs status-pill bg-grey-2 text-grey-7"
                >
                  <span>โต๊ะว่าง</span>
                </q-badge>
              </div>
            </div>

            <!-- Card Body: ACTIVE SESSION -->
            <div v-if="item.session" class="card-body-active">
              <!-- Duration & Orders metadata -->
              <div class="meta-tags-row q-mt-sm">
                <div class="meta-tag">
                  <q-icon name="timer" size="14px" class="q-mr-xs text-grey-7" />
                  <span>นั่งมาแล้ว {{ item.elapsedTime }}</span>
                </div>
                <div class="meta-tag">
                  <q-icon name="receipt_long" size="14px" class="q-mr-xs text-grey-7" />
                  <span>{{ item.orderCount }} ออเดอร์ ({{ item.totalItemCount }} รายการ)</span>
                </div>
              </div>

              <!-- Kitchen status progress bar/badge -->
              <div class="kitchen-status-box q-my-sm">
                <div class="row items-center justify-between text-caption">
                  <div class="row items-center">
                    <q-icon
                      :name="item.kitchenIcon"
                      size="15px"
                      :class="item.kitchenIconColor"
                      class="q-mr-xs"
                    />
                    <span class="text-weight-medium">{{ item.kitchenText }}</span>
                  </div>
                  <span class="text-grey-6">{{ item.servedCount }}/{{ item.orderCount }} คิว</span>
                </div>
              </div>

              <!-- Total Amount Highlight -->
              <div class="bill-amount-box q-my-sm">
                <div class="row items-center justify-between">
                  <span class="text-caption text-grey-7">ยอดรวมปัจจุบัน</span>
                  <span class="text-h6 text-weight-bolder text-primary">
                    {{ formatPrice(item.totalAmount) }}
                  </span>
                </div>
              </div>

              <!-- Actions Button -->
              <div class="card-footer-actions q-mt-md row q-gutter-xs">
                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  class="col action-main-btn"
                  @click="openBill(item.session.id)"
                >
                  <q-icon name="receipt" size="16px" class="q-mr-xs" />
                  <span>ดูบิล / เช็กบิล</span>
                  <q-icon name="arrow_forward" size="14px" class="q-ml-xs" />
                </q-btn>
                <q-btn
                  flat
                  round
                  dense
                  color="grey-7"
                  icon="qr_code_2"
                  class="action-icon-btn"
                  @click="showTableQR(item.table)"
                >
                  <q-tooltip>ดู QR ประจำโต๊ะ</q-tooltip>
                </q-btn>
              </div>
            </div>

            <!-- Card Body: AVAILABLE TABLE (โต๊ะว่าง) -->
            <div v-else class="card-body-empty">
              <div class="empty-table-placeholder q-my-md">
                <q-icon name="chair_alt" size="36px" color="grey-4" class="q-mb-xs" />
                <div class="text-caption text-grey-7 font-weight-500">โต๊ะว่าง พร้อมให้บริการ</div>
                <div class="text-caption text-grey-5 font-size-11">
                  เมื่อลูกค้าสแกน QR ระบบจะเริ่มนับเวลาและรวมบิลอัตโนมัติ
                </div>
              </div>

              <div class="card-footer-actions q-mt-auto row q-gutter-xs">
                <q-btn
                  outline
                  no-caps
                  color="primary"
                  class="col action-secondary-btn"
                  @click="showTableQR(item.table)"
                >
                  <q-icon name="qr_code_2" size="16px" class="q-mr-xs" />
                  <span>ดู QR ประจำโต๊ะ</span>
                </q-btn>
                <q-btn
                  unelevated
                  no-caps
                  color="secondary"
                  class="col action-secondary-btn"
                  @click="openDirectCustomerLink(item.table)"
                >
                  <q-icon name="open_in_new" size="15px" class="q-mr-xs" />
                  <span>เปิดสั่งอาหาร</span>
                </q-btn>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty Result State -->
        <div v-else class="empty-results-card q-pa-xl text-center">
          <div class="empty-icon-circle q-mx-auto q-mb-md">
            <q-icon name="table_restaurant" size="44px" color="primary" />
          </div>
          <div class="text-h6 text-weight-bold q-mb-xs">
            <template v-if="tables.length === 0"> ยังไม่มีโต๊ะในระบบ </template>
            <template v-else> ไม่พบโต๊ะที่ตรงกับเงื่อนไข </template>
          </div>
          <p class="text-caption text-grey-7 q-mb-lg max-w-400 q-mx-auto">
            <template v-if="tables.length === 0">
              เริ่มต้นด้วยการเพิ่มโต๊ะและสร้าง QR Code เพื่อให้ลูกค้าสามารถสแกนสั่งอาหารได้ทันที
            </template>
            <template v-else>
              ลองเปลี่ยนคำค้นหา หรือเลือกแท็บ "ทั้งหมด" เพื่อดูสถานะโต๊ะทั้งหมดในร้าน
            </template>
          </p>
          <q-btn
            v-if="tables.length === 0"
            color="primary"
            unelevated
            rounded
            no-caps
            icon="add"
            label="ไปที่หน้าจัดการโต๊ะ"
            to="/owner/tables"
            class="q-px-lg"
          />
          <q-btn
            v-else
            outline
            color="primary"
            rounded
            no-caps
            label="แสดงโต๊ะทั้งหมด"
            @click="resetFilter"
            class="q-px-lg"
          />
        </div>
      </template>

      <!-- Quick QR Code Dialog -->
      <q-dialog v-model="showQRModal">
        <q-card style="min-width: 320px; max-width: 380px" class="q-pa-md text-center">
          <q-card-section class="q-pb-none">
            <div class="row items-center justify-between">
              <span class="text-h6 text-weight-bold">{{ selectedTable?.name }}</span>
              <q-btn icon="close" flat round dense v-close-popup />
            </div>
            <div class="text-caption text-grey-7">สแกนเพื่อสั่งอาหารประจำโต๊ะนี้</div>
          </q-card-section>

          <q-card-section class="column items-center q-py-md">
            <div class="qr-preview-box">
              <canvas ref="qrCanvasRef" class="qr-canvas-element"></canvas>
            </div>
            <div class="text-caption text-grey-6 q-mt-sm">
              {{ selectedTableUrl }}
            </div>
          </q-card-section>

          <q-card-actions align="center" class="q-gutter-sm">
            <q-btn
              outline
              no-caps
              rounded
              color="primary"
              icon="content_copy"
              label="คัดลอกลิงก์"
              @click="copyTableLink"
            />
            <q-btn
              unelevated
              no-caps
              rounded
              color="primary"
              icon="open_in_new"
              label="เปิดหน้าลูกค้า"
              @click="openSelectedTableLink"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from 'src/services/supabase';
import { fetchTables } from 'src/services/tableService';
import { formatPrice, formatTime, formatElapsed } from 'src/utils/formatters';
import { getAppUrl } from 'src/utils/constants';
import { useNotify } from 'src/composables/useNotify';
import QRCode from 'qrcode';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import type { TableWithQR } from 'src/types/database';
import { OrderStatus } from 'src/types/enums';
import type { RealtimeChannel } from '@supabase/supabase-js';

const router = useRouter();
const { notifySuccess, notifyInfo } = useNotify();

interface RawSessionOrder {
  id: string;
  queue_number: number;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  items: { id: string; quantity: number; snapshot_name: string; subtotal: number }[];
}

interface RawSessionBill {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

interface RawSession {
  id: string;
  table_id: string;
  status: string;
  created_at: string;
  table: { id: string; name: string } | null;
  orders: RawSessionOrder[];
  bill: RawSessionBill[] | null;
}

interface TableCardItem {
  table: TableWithQR;
  session: RawSession | null;
  orderCount: number;
  totalItemCount: number;
  totalAmount: number;
  isPaid: boolean;
  isReadyToPay: boolean;
  servedCount: number;
  kitchenText: string;
  kitchenIcon: string;
  kitchenIconColor: string;
  elapsedTime: string;
  startedAtTime: string;
}

const tables = ref<TableWithQR[]>([]);
const activeSessions = ref<RawSession[]>([]);
const isLoading = ref(true);
const isRefreshing = ref(false);

const selectedFilter = ref<'ALL' | 'ACTIVE' | 'READY_TO_PAY' | 'AVAILABLE'>('ALL');
const searchQuery = ref('');

// QR Dialog State
const showQRModal = ref(false);
const selectedTable = ref<TableWithQR | null>(null);
const selectedTableUrl = ref('');
const qrCanvasRef = ref<HTMLCanvasElement | null>(null);

let realtimeSessions: RealtimeChannel | null = null;
let realtimeOrders: RealtimeChannel | null = null;
let timerInterval: ReturnType<typeof setInterval>;

onMounted(async () => {
  await loadAllData();
  setupRealtime();

  // Refresh timer every 30s for elapsed time updates
  timerInterval = setInterval(() => {
    // triggers recomputation
    activeSessions.value = [...activeSessions.value];
  }, 30000);
});

onUnmounted(() => {
  if (realtimeSessions) void supabase.removeChannel(realtimeSessions);
  if (realtimeOrders) void supabase.removeChannel(realtimeOrders);
  clearInterval(timerInterval);
});

async function loadAllData() {
  try {
    const [tablesData, sessionsRes] = await Promise.all([
      fetchTables(),
      supabase
        .from('table_sessions')
        .select(
          `
          id,
          table_id,
          status,
          created_at,
          table:tables(id, name),
          orders(
            id,
            queue_number,
            status,
            total_amount,
            created_at,
            items:order_items(id, quantity, snapshot_name, subtotal)
          ),
          bill:bills(id, total_amount, status, created_at, paid_at)
        `,
        )
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false }),
    ]);

    tables.value = tablesData.filter((t) => t.is_active);
    activeSessions.value = (sessionsRes.data ?? []) as unknown as RawSession[];
  } finally {
    isLoading.value = false;
  }
}

async function refreshData() {
  isRefreshing.value = true;
  try {
    await loadAllData();
    notifyInfo('อัปเดตข้อมูลล่าสุดเรียบร้อย');
  } finally {
    isRefreshing.value = false;
  }
}

function setupRealtime() {
  realtimeSessions = supabase
    .channel('realtime:table_sessions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => {
      void loadAllData();
    })
    .subscribe();

  realtimeOrders = supabase
    .channel('realtime:orders_bills_page')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      void loadAllData();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => {
      void loadAllData();
    })
    .subscribe();
}

// Table cards mapped data
const tableCards = computed<TableCardItem[]>(() => {
  return tables.value.map((table) => {
    const session = activeSessions.value.find((s) => s.table_id === table.id) ?? null;

    if (!session) {
      return {
        table,
        session: null,
        orderCount: 0,
        totalItemCount: 0,
        totalAmount: 0,
        isPaid: false,
        isReadyToPay: false,
        servedCount: 0,
        kitchenText: 'โต๊ะว่าง',
        kitchenIcon: 'chair_alt',
        kitchenIconColor: 'text-grey-6',
        elapsedTime: '',
        startedAtTime: '',
      };
    }

    const orders = session.orders || [];
    const bill = session.bill?.[0] ?? null;
    const orderCount = orders.length;

    let totalItemCount = 0;
    let totalOrdersAmount = 0;
    let servedOrdersCount = 0;
    let hasPreparing = false;
    let hasQueued = false;

    for (const order of orders) {
      totalOrdersAmount += order.total_amount || 0;
      if (order.status === OrderStatus.SERVED) {
        servedOrdersCount++;
      } else if (order.status === OrderStatus.PREPARING || order.status === OrderStatus.PREPARED) {
        hasPreparing = true;
      } else if (order.status === OrderStatus.QUEUED) {
        hasQueued = true;
      }

      if (order.items) {
        for (const item of order.items) {
          totalItemCount += item.quantity || 1;
        }
      }
    }

    const totalAmount = bill?.total_amount || totalOrdersAmount;
    const isPaid = bill?.status === 'PAID';
    const allServed = orderCount > 0 && servedOrdersCount === orderCount;
    const isReadyToPay = allServed && !isPaid;

    let kitchenText = 'ยังไม่ได้สั่งอาหาร';
    let kitchenIcon = 'pending';
    let kitchenIconColor = 'text-grey-6';

    if (isPaid) {
      kitchenText = 'ชำระเงินแล้ว (พร้อมเคลียร์โต๊ะ)';
      kitchenIcon = 'check_circle';
      kitchenIconColor = 'text-positive';
    } else if (allServed) {
      kitchenText = 'เสิร์ฟครบทุกรายการแล้ว';
      kitchenIcon = 'done_all';
      kitchenIconColor = 'text-green-7';
    } else if (hasPreparing) {
      kitchenText = 'กำลังเตรียมอาหารในครัว';
      kitchenIcon = 'soup_kitchen';
      kitchenIconColor = 'text-amber-9';
    } else if (hasQueued) {
      kitchenText = 'มีออเดอร์ใหม่รอดำเนินการ';
      kitchenIcon = 'schedule';
      kitchenIconColor = 'text-light-blue-8';
    }

    return {
      table,
      session,
      orderCount,
      totalItemCount,
      totalAmount,
      isPaid,
      isReadyToPay,
      servedCount: servedOrdersCount,
      kitchenText,
      kitchenIcon,
      kitchenIconColor,
      elapsedTime: formatElapsed(session.created_at),
      startedAtTime: formatTime(session.created_at),
    };
  });
});

// Top Overview Stats
const activeCount = computed(() => tableCards.value.filter((c) => c.session !== null).length);
const readyToPayCount = computed(() => tableCards.value.filter((c) => c.isReadyToPay).length);
const availableCount = computed(() => tableCards.value.filter((c) => c.session === null).length);
const totalActiveAmount = computed(() =>
  tableCards.value.reduce((sum, c) => sum + (c.session ? c.totalAmount : 0), 0),
);

// Filtered cards
const filteredTableCards = computed(() => {
  let list = tableCards.value;

  if (selectedFilter.value === 'ACTIVE') {
    list = list.filter((c) => c.session !== null);
  } else if (selectedFilter.value === 'READY_TO_PAY') {
    list = list.filter((c) => c.isReadyToPay);
  } else if (selectedFilter.value === 'AVAILABLE') {
    list = list.filter((c) => c.session === null);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((c) => c.table.name.toLowerCase().includes(q));
  }

  // Sort: Active sessions first, then by table name/sort order
  return list.sort((a, b) => {
    if (a.session && !b.session) return -1;
    if (!a.session && b.session) return 1;
    return a.table.sort_order - b.table.sort_order;
  });
});

function openBill(sessionId: string) {
  void router.push(`/owner/bills/${sessionId}`);
}

function resetFilter() {
  selectedFilter.value = 'ALL';
  searchQuery.value = '';
}

async function showTableQR(table: TableWithQR) {
  selectedTable.value = table;
  if (table.active_qr) {
    const baseUrl = getAppUrl();
    selectedTableUrl.value = `${baseUrl}/t/${table.active_qr.public_token}`;
  } else {
    selectedTableUrl.value = '';
  }
  showQRModal.value = true;
  await nextTick();
  if (qrCanvasRef.value && selectedTableUrl.value) {
    void QRCode.toCanvas(qrCanvasRef.value, selectedTableUrl.value, { width: 180, margin: 2 });
  }
}

function copyTableLink() {
  if (!selectedTableUrl.value) return;
  void navigator.clipboard.writeText(selectedTableUrl.value);
  notifySuccess('คัดลอกลิงก์โต๊ะแล้ว');
}

function openSelectedTableLink() {
  if (!selectedTableUrl.value) return;
  window.open(selectedTableUrl.value, '_blank');
}

function openDirectCustomerLink(table: TableWithQR) {
  if (table.active_qr) {
    const baseUrl = getAppUrl();
    window.open(`${baseUrl}/t/${table.active_qr.public_token}`, '_blank');
  } else {
    void router.push('/owner/tables');
  }
}
</script>

<style scoped>
.bills-page {
  background: var(--color-background);
  min-height: 100vh;
}

.bills-container {
  max-width: 1280px;
  margin: 0 auto;
}

.page-title {
  color: var(--color-text-primary);
  line-height: 1.2;
}

.header-section {
  flex-wrap: wrap;
  gap: 12px;
}

.realtime-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 600;
  background: #dcfce7 !important;
  color: #15803d !important;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #16a34a;
  box-shadow: 0 0 0 rgba(22, 163, 74, 0.4);
  animation: pulse-ring 1.8s infinite;
}

@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(22, 163, 74, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0);
  }
}

.manage-tables-btn {
  font-weight: 600;
  border-radius: var(--radius-pill);
}

/* Top Stats Overview */
.stats-overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

@media (max-width: 900px) {
  .stats-overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-overview-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: var(--shadow-subtle);
  cursor: pointer;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.stat-card--active-filter {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.stat-card--highlight {
  background: linear-gradient(135deg, #ffffff 0%, #fffbf8 100%);
  border-color: var(--color-primary-tint);
}

.stat-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-details {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.stat-value .unit {
  font-size: 0.82rem;
  font-weight: 400;
  color: var(--color-text-secondary);
}

/* Toolbar & Filters */
.toolbar-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  box-shadow: var(--shadow-subtle);
}

.filter-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-pill-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
  font-family: var(--app-font-family);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
}

.filter-pill-btn:hover {
  background: #ede5dc;
  color: var(--color-text-primary);
}

.filter-pill-btn.active {
  background: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(224, 88, 54, 0.25);
}

.dot-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  display: inline-block;
}

.dot-amber {
  background-color: #f59e0b;
}

.dot-green {
  background-color: #10b981;
}

.dot-grey {
  background-color: #9ca3af;
}

.filter-pill-btn.active .dot-indicator {
  background-color: #ffffff;
}

.search-input :deep(.q-field__control) {
  border-radius: var(--radius-pill);
  height: 38px;
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.table-status-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 16px;
  box-shadow: var(--shadow-subtle);
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.table-status-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.table-status-card--active {
  border-left: 4px solid var(--color-primary);
}

.table-status-card--ready-pay {
  border-left: 4px solid #16a34a;
  background: linear-gradient(180deg, #ffffff 0%, #f7fdf9 100%);
}

.table-status-card--paid {
  border-left: 4px solid #0284c7;
  background: #f8fafc;
}

.table-status-card--empty {
  border-style: dashed;
  background: #fdfcfb;
}

.card-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.table-icon-avatar {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.table-card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.status-pill {
  font-size: 0.76rem;
  font-weight: 600;
}

.border-green {
  border: 1px solid #bbf7d0;
}

.border-amber {
  border: 1px solid #fde68a;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

/* Card Body Active */
.meta-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-tag {
  background: var(--color-surface-subtle);
  border-radius: var(--radius-xs);
  padding: 3px 8px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
}

.kitchen-status-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-xs);
  padding: 6px 10px;
}

.bill-amount-box {
  background: var(--color-primary-soft);
  border: 1px solid var(--color-primary-tint);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
}

.action-main-btn {
  height: 40px;
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.action-icon-btn {
  background: var(--color-surface-subtle);
  border-radius: var(--radius-sm);
}

/* Card Body Empty */
.card-body-empty {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.empty-table-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 14px 8px;
}

.font-weight-500 {
  font-weight: 500;
}

.font-size-11 {
  font-size: 0.75rem;
}

.action-secondary-btn {
  height: 38px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}

/* Empty Results / First Run */
.empty-results-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1px dashed var(--color-border);
  box-shadow: var(--shadow-subtle);
}

.empty-icon-circle {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.max-w-400 {
  max-width: 400px;
}

/* Quick QR Preview Modal */
.qr-preview-box {
  background: #ffffff;
  padding: 8px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  display: inline-flex;
}

.qr-canvas-element {
  display: block;
}
</style>
