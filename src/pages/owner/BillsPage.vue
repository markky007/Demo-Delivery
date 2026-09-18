<template>
  <q-page class="bills-page q-pa-lg">
    <div class="bills-container">
      <!-- 1. Apple Header Section -->
      <BillsHeader
        v-model:view-mode="viewMode"
        :is-refreshing="isRefreshing"
        :last-refreshed-text="lastRefreshedTime"
        @refresh="refreshData"
      />

      <!-- Loading Skeleton -->
      <div v-if="isLoading" class="q-mb-xl">
        <LoadingSkeleton type="tables" :count="6" />
      </div>

      <template v-else>
        <!-- 2. Apple KPI Metrics Grid (4 Cards) -->
        <BillsMetrics
          :total-active-amount="totalActiveAmount"
          :total-active-tables="activeCount"
          :total-tables="tables.length"
          :cooking-count="cookingCount"
          :ready-to-pay-count="readyToPayCount"
          :selected-filter="selectedFilter"
          @select-filter="handleSelectFilter"
        />

        <!-- 3. Apple Filter Toolbar & Search -->
        <BillsFilterToolbar
          v-model:selected-filter="selectedFilter"
          v-model:search-query="searchQuery"
          :total-count="tables.length"
          :cooking-count="cookingCount"
          :ready-to-pay-count="readyToPayCount"
          :paid-count="paidCount"
          :seated-no-order-count="seatedNoOrderCount"
          :available-count="availableCount"
        />

        <!-- 4. Content Area: Floor Plan View vs Card Grid View -->
        <DiningFloorPlan
          v-if="viewMode === 'floorplan'"
          :items="tableCards"
          :selected-filter="selectedFilter"
          :search-query="searchQuery"
          :clearing-session-id="clearingSessionId"
          :cancelling-session-id="cancellingSessionId"
          @update-filter="handleFilterChange"
          @open-bill="openBill"
          @clear-table="promptClearTable"
          @cancel-session="promptCancelSession"
          @transfer-table="promptTransferTable"
          @show-qr="showTableQR"
          @open-customer-link="openDirectCustomerLink"
        />

        <template v-else>
          <!-- Card Grid View -->
          <div v-if="filteredTableCards.length > 0" class="cards-grid">
            <TableCard
              v-for="item in filteredTableCards"
              :key="item.session?.id || item.table.id"
              :item="item"
              :is-clearing="clearingSessionId === item.session?.id"
              :is-cancelling="cancellingSessionId === item.session?.id"
              @open-bill="openBill"
              @clear-table="promptClearTable"
              @cancel-session="promptCancelSession"
              @transfer-table="promptTransferTable"
              @show-qr="showTableQR"
              @open-customer-link="openDirectCustomerLink"
            />
          </div>

          <!-- Clean Apple Empty State -->
          <div v-else class="apple-empty-state q-pa-xl text-center">
            <div class="empty-icon-circle q-mx-auto q-mb-md">
              <q-icon name="table_restaurant" size="36px" color="primary" />
            </div>
            <div class="empty-title text-ink q-mb-xs">
              <template v-if="tables.length === 0">ยังไม่มีโต๊ะในระบบ</template>
              <template v-else>ไม่พบโต๊ะที่ตรงกับสถานะ "{{ currentFilterLabel }}"</template>
            </div>
            <p class="empty-desc text-muted q-mb-lg q-mx-auto">
              <template v-if="tables.length === 0">
                เริ่มต้นด้วยการเพิ่มโต๊ะและสร้าง QR Code เพื่อให้ลูกค้าสามารถสแกนสั่งอาหารได้ทันที
              </template>
              <template v-else>
                ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรอง "ทั้งหมด" เพื่อดูโต๊ะทั้งหมดในร้าน
              </template>
            </p>
            <q-btn
              v-if="tables.length === 0"
              unelevated
              no-caps
              icon="add"
              label="ไปที่หน้าจัดการโต๊ะ"
              to="/owner/tables"
              class="apple-pill-btn apple-pill-btn--primary q-px-lg"
            />
            <q-btn
              v-else
              unelevated
              no-caps
              label="แสดงโต๊ะทั้งหมด"
              @click="resetFilter"
              class="apple-pill-btn apple-pill-btn--secondary q-px-lg"
            />
          </div>
        </template>
      </template>

      <!-- 5. Quick QR Code Modal -->
      <TableQRModal
        v-model="showQRModal"
        :table="selectedTable"
        :table-url="selectedTableUrl"
        @copy-link="copyTableLink"
        @open-link="openSelectedTableLink"
        @regenerate-qr="handleRegenerateQRFromModal"
      />

      <!-- 6. Transfer & Merge Table Modal Dialog -->
      <TableTransferModal
        v-model="showTransferModal"
        :table-to-transfer="tableToTransfer"
        :all-target-tables="allTargetTables"
        :filtered-target-tables="filteredTargetTables"
        :selected-target-table-id="selectedTargetTableId"
        :selected-target-table="selectedTargetTable"
        :selected-target-is-occupied="selectedTargetIsOccupied"
        :selected-target-is-takeaway="selectedTargetIsTakeaway"
        v-model:transfer-customer-name="transferCustomerName"
        v-model:transfer-filter="transferFilter"
        :is-transferring="isTransferring"
        :show-merge-confirm-dialog="showMergeConfirmDialog"
        @select-target="handleSelectTargetTable"
        @confirm-transfer="promptConfirmTransferOrMerge"
        @execute-transfer="executeTransferOrMerge"
        @close-confirm-dialog="showMergeConfirmDialog = false"
      />

      <!-- 7. Confirm Clear Table & Cancel Session Modals -->
      <TableActionModals
        v-model:show-confirm-clear="showConfirmClearModal"
        :table-to-clear="tableToClear"
        :is-clearing="isClearingDirect"
        @confirm-clear="handleConfirmClearTable"
        v-model:show-confirm-cancel="showConfirmCancelModal"
        :table-to-cancel="tableToCancel"
        :is-cancelling="isCancellingDirect"
        @confirm-cancel="handleConfirmCancelSession"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from 'src/services/supabase';
import { fetchTables, generateQRToken, isTakeawayName } from 'src/services/tableService';
import { closeTableSession, transferTableSession } from 'src/services/sessionService';
import { formatPrice, formatTime, formatElapsed } from 'src/utils/formatters';
import { getAppUrl } from 'src/utils/constants';
import { useNotify } from 'src/composables/useNotify';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import DiningFloorPlan from 'src/components/DiningFloorPlan.vue';
import BillsHeader from 'src/components/bills/BillsHeader.vue';
import BillsMetrics from 'src/components/bills/BillsMetrics.vue';
import BillsFilterToolbar from 'src/components/bills/BillsFilterToolbar.vue';
import TableCard from 'src/components/bills/TableCard.vue';
import TableQRModal from 'src/components/bills/TableQRModal.vue';
import TableTransferModal, {
  type TargetTableOption,
} from 'src/components/bills/TableTransferModal.vue';
import TableActionModals from 'src/components/bills/TableActionModals.vue';
import type { TableWithQR } from 'src/types/database';
import { OrderStatus } from 'src/types/enums';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  TableOperationalStatus,
  RawSession,
  TableCardItem,
  StatusBadgeInfo,
} from 'src/types/tableCard';

const router = useRouter();
const { notifySuccess, notifyInfo, notifyError } = useNotify();

const viewMode = ref<'card' | 'floorplan'>('floorplan');

const tables = ref<TableWithQR[]>([]);
const activeSessions = ref<RawSession[]>([]);
const isLoading = ref(true);
const isRefreshing = ref(false);
const lastRefreshedTime = ref('');

const selectedFilter = ref<
  'ALL' | 'COOKING' | 'READY_TO_PAY' | 'PAID' | 'SEATED_NO_ORDER' | 'AVAILABLE'
>('ALL');
const searchQuery = ref('');

// QR Dialog State
const showQRModal = ref(false);
const selectedTable = ref<TableWithQR | null>(null);
const selectedTableUrl = ref('');

// Clear Table Modal State
const showConfirmClearModal = ref(false);
const tableToClear = ref<TableCardItem | null>(null);
const isClearingDirect = ref(false);
const clearingSessionId = ref<string | null>(null);

// Cancel Seated Session Modal State
const showConfirmCancelModal = ref(false);
const tableToCancel = ref<TableCardItem | null>(null);
const isCancellingDirect = ref(false);
const cancellingSessionId = ref<string | null>(null);

// Transfer & Merge Table Modal State
const showTransferModal = ref(false);
const showMergeConfirmDialog = ref(false);
const tableToTransfer = ref<TableCardItem | null>(null);
const selectedTargetTableId = ref<string | null>(null);
const transferCustomerName = ref('');
const transferFilter = ref<'all' | 'empty' | 'occupied'>('all');
const isTransferring = ref(false);

const allTargetTables = computed<TargetTableOption[]>(() => {
  if (!tableToTransfer.value) return [];
  const currentTableId = tableToTransfer.value.table.id;
  const isCurrentTakeaway = tableToTransfer.value.isTakeaway;

  return tables.value
    .filter((t) => {
      if (!t.is_active || t.id === currentTableId) return false;
      const isTargetTakeaway = isTakeawayName(t.name);
      if (isTargetTakeaway && isCurrentTakeaway) return false;
      return true;
    })
    .map((t) => {
      const isTargetTakeaway = isTakeawayName(t.name);
      const session =
        activeSessions.value.find((s) => s.table_id === t.id && s.status === 'ACTIVE') ?? null;
      const isOccupied = !isTargetTakeaway && session !== null;
      const orders = session?.orders || [];
      const orderCount = orders.length;
      const totalAmount =
        session?.bill?.[0]?.total_amount ??
        orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      return {
        table: t,
        isTakeaway: isTargetTakeaway,
        isOccupied,
        orderCount,
        totalAmount,
        customerName: session?.customer_name,
      };
    });
});

const filteredTargetTables = computed(() => {
  if (transferFilter.value === 'empty') {
    return allTargetTables.value.filter((t) => !t.isOccupied);
  }
  if (transferFilter.value === 'occupied') {
    return allTargetTables.value.filter((t) => t.isOccupied);
  }
  return allTargetTables.value;
});

const selectedTargetTable = computed(() => {
  if (!selectedTargetTableId.value) return null;
  return allTargetTables.value.find((t) => t.table.id === selectedTargetTableId.value) ?? null;
});

const selectedTargetIsOccupied = computed(() => {
  return Boolean(selectedTargetTable.value?.isOccupied);
});

const selectedTargetIsTakeaway = computed(() => {
  if (!selectedTargetTableId.value) return false;
  const target = tables.value.find((t) => t.id === selectedTargetTableId.value);
  return target ? isTakeawayName(target.name) : false;
});

let realtimeSessions: RealtimeChannel | null = null;
let realtimeOrders: RealtimeChannel | null = null;
let timerInterval: ReturnType<typeof setInterval>;

onMounted(async () => {
  await loadAllData();
  setupRealtime();

  // Refresh timer every 30s for elapsed time updates
  timerInterval = setInterval(() => {
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
          customer_name,
          status,
          created_at,
          table:tables(id, name),
          orders(
            id,
            queue_number,
            status,
            total_amount,
            created_at,
            items:order_items(id, quantity, snapshot_name, subtotal, options:order_item_options(id, snapshot_option_name, snapshot_price_adjustment))
          ),
          bill:bills(id, total_amount, status, created_at, paid_at)
        `,
        )
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false }),
    ]);

    tables.value = tablesData.filter((t) => t.is_active);
    activeSessions.value = (sessionsRes.data ?? []) as unknown as RawSession[];
    lastRefreshedTime.value = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } finally {
    isLoading.value = false;
  }
}

async function refreshData() {
  isRefreshing.value = true;
  try {
    await loadAllData();
    notifyInfo('ข้อมูลบิลและสถานะโต๊ะเป็นปัจจุบันแล้ว', {
      title: 'รีเฟรชข้อมูลสำเร็จ',
    });
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

function buildTableCardItem(
  table: TableWithQR,
  session: RawSession | null,
  isTakeaway: boolean,
): TableCardItem {
  if (!session) {
    return {
      table,
      session: null,
      tableStatus: 'AVAILABLE',
      statusBadge: {
        label: isTakeaway ? 'พร้อมรับสั่งกลับ' : 'โต๊ะว่าง',
        subLabel: 'พร้อมรับลูกค้า',
        icon: isTakeaway ? 'shopping_bag' : 'chair_alt',
        badgeClass: 'badge-status--available',
        isPulse: false,
        dotColor: 'grey',
      },
      orderCount: 0,
      totalItemCount: 0,
      totalAmount: 0,
      isPaid: false,
      isReadyToPay: false,
      servedOrdersCount: 0,
      preparingOrdersCount: 0,
      queuedOrdersCount: 0,
      servingPercentage: 0,
      kitchenText: isTakeaway ? 'ยังไม่มีออเดอร์กลับบ้าน' : 'โต๊ะว่าง',
      kitchenTextColor: 'text-muted',
      kitchenIcon: isTakeaway ? 'shopping_bag' : 'chair_alt',
      kitchenIconColor: 'text-muted',
      progressBarColorClass: 'bg-grey-4',
      elapsedTime: '',
      startedAtTime: '',
      avatarClass: isTakeaway ? 'bg-orange-1 text-orange-9' : 'bg-surface-alt text-muted',
      isTakeaway,
    };
  }

  const orders = session.orders || [];
  const bill = session.bill?.[0] ?? null;
  const orderCount = orders.length;

  let totalItemCount = 0;
  let totalOrdersAmount = 0;
  let servedOrdersCount = 0;
  let preparingOrdersCount = 0;
  let queuedOrdersCount = 0;

  for (const order of orders) {
    totalOrdersAmount += order.total_amount || 0;
    if (order.status === OrderStatus.SERVED) {
      servedOrdersCount++;
    } else if (order.status === OrderStatus.PREPARING || order.status === OrderStatus.PREPARED) {
      preparingOrdersCount++;
    } else if (order.status === OrderStatus.QUEUED) {
      queuedOrdersCount++;
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
  const isCooking = orderCount > 0 && !allServed && !isPaid;
  const isSeatedNoOrder = orderCount === 0 && !isPaid;

  const servingPercentage = orderCount > 0 ? Math.round((servedOrdersCount / orderCount) * 100) : 0;

  let tableStatus: TableOperationalStatus = 'AVAILABLE';
  let statusBadge: StatusBadgeInfo = {
    label: 'โต๊ะว่าง',
    subLabel: 'พร้อมรับลูกค้า',
    icon: 'chair_alt',
    badgeClass: 'badge-status--available',
    isPulse: false,
    dotColor: 'grey',
  };
  let kitchenText = 'ยังไม่ได้สั่งอาหาร';
  let kitchenTextColor = 'text-muted';
  let kitchenIcon = 'pending';
  let kitchenIconColor = 'text-muted';
  let progressBarColorClass = 'bg-primary';
  let avatarClass = isTakeaway ? 'bg-orange-1 text-orange-9' : 'bg-primary-soft text-primary';

  if (isPaid) {
    tableStatus = 'PAID';
    statusBadge = {
      label: isTakeaway ? 'ชำระแล้ว • รอรับอาหาร' : 'ชำระแล้ว • รอเคลียร์',
      subLabel: 'พร้อมปิดรายการ',
      icon: 'task_alt',
      badgeClass: 'badge-status--paid',
      isPulse: true,
      dotColor: 'purple',
    };
    kitchenText = 'ชำระเงินแล้ว';
    kitchenTextColor = 'text-purple-9';
    kitchenIcon = 'check_circle';
    kitchenIconColor = 'text-purple-8';
    progressBarColorClass = 'bg-purple-8';
    avatarClass = 'bg-purple-1 text-purple-9';
  } else if (isReadyToPay) {
    tableStatus = 'READY_TO_PAY';
    statusBadge = {
      label: isTakeaway ? 'ทำเสร็จครบ • รอชำระ' : 'เสิร์ฟครบ • รอเช็กบิล',
      subLabel: 'พร้อมรับชำระเงิน',
      icon: 'receipt_long',
      badgeClass: 'badge-status--ready-pay',
      isPulse: true,
      dotColor: 'green',
    };
    kitchenText = isTakeaway ? 'อาหารปรุงเสร็จครบทุกรายการแล้ว' : 'เสิร์ฟครบทุกรายการแล้ว';
    kitchenTextColor = 'text-green-9';
    kitchenIcon = 'done_all';
    kitchenIconColor = 'text-green-8';
    progressBarColorClass = 'bg-green-8';
    avatarClass = 'bg-green-1 text-green-9';
  } else if (isCooking) {
    tableStatus = 'COOKING';
    statusBadge = {
      label: `กำลังทำอาหาร (${servedOrdersCount}/${orderCount})`,
      subLabel: 'มีรายการกำลังปรุงในครัว',
      icon: 'soup_kitchen',
      badgeClass: 'badge-status--cooking',
      isPulse: true,
      dotColor: 'amber',
    };

    if (preparingOrdersCount > 0) {
      kitchenText = `กำลังปรุงอาหารในครัว (${preparingOrdersCount} คิว)`;
      kitchenTextColor = 'text-amber-10';
      kitchenIcon = 'soup_kitchen';
      kitchenIconColor = 'text-amber-9';
      progressBarColorClass = 'bg-amber-8';
    } else {
      kitchenText = `มีออเดอร์ใหม่รอเริ่มทำ (${queuedOrdersCount} คิว)`;
      kitchenTextColor = 'text-cyan-10';
      kitchenIcon = 'schedule';
      kitchenIconColor = 'text-cyan-8';
      progressBarColorClass = 'bg-cyan-8';
    }
    avatarClass = 'bg-amber-1 text-amber-9';
  } else if (isSeatedNoOrder) {
    tableStatus = 'SEATED_NO_ORDER';
    statusBadge = {
      label: isTakeaway ? 'เปิดรายการ • รอลูกค้าสั่ง' : 'เปิดโต๊ะแล้ว • รอลูกค้าสั่ง',
      subLabel: 'ลูกค้ากำลังเลือกเมนู',
      icon: 'touch_app',
      badgeClass: 'badge-status--seated',
      isPulse: true,
      dotColor: 'cyan',
    };
    kitchenText = 'ยังไม่มีรายการสั่งอาหาร';
    kitchenTextColor = 'text-cyan-9';
    kitchenIcon = 'touch_app';
    kitchenIconColor = 'text-cyan-8';
    progressBarColorClass = 'bg-cyan-8';
    avatarClass = 'bg-cyan-1 text-cyan-9';
  }

  return {
    table,
    session,
    tableStatus,
    statusBadge,
    orderCount,
    totalItemCount,
    totalAmount,
    isPaid,
    isReadyToPay,
    servedOrdersCount,
    preparingOrdersCount,
    queuedOrdersCount,
    servingPercentage,
    kitchenText,
    kitchenTextColor,
    kitchenIcon,
    kitchenIconColor,
    progressBarColorClass,
    elapsedTime: formatElapsed(session.created_at),
    startedAtTime: formatTime(session.created_at),
    avatarClass,
    isTakeaway,
  };
}

const tableCards = computed<TableCardItem[]>(() => {
  const cards: TableCardItem[] = [];

  for (const table of tables.value) {
    const isTakeaway = isTakeawayName(table.name);

    if (isTakeaway) {
      const takeawaySessions = activeSessions.value.filter((s) => s.table_id === table.id);

      if (takeawaySessions.length > 0) {
        for (const session of takeawaySessions) {
          cards.push(buildTableCardItem(table, session, isTakeaway));
        }
      } else {
        cards.push(buildTableCardItem(table, null, isTakeaway));
      }
    } else {
      const session = activeSessions.value.find((s) => s.table_id === table.id) ?? null;
      cards.push(buildTableCardItem(table, session, isTakeaway));
    }
  }

  return cards;
});

const activeCount = computed(() => tableCards.value.filter((c) => c.session !== null).length);
const cookingCount = computed(
  () => tableCards.value.filter((c) => c.tableStatus === 'COOKING').length,
);
const readyToPayCount = computed(
  () => tableCards.value.filter((c) => c.tableStatus === 'READY_TO_PAY').length,
);
const paidCount = computed(() => tableCards.value.filter((c) => c.tableStatus === 'PAID').length);
const seatedNoOrderCount = computed(
  () => tableCards.value.filter((c) => c.tableStatus === 'SEATED_NO_ORDER').length,
);
const availableCount = computed(
  () => tableCards.value.filter((c) => c.tableStatus === 'AVAILABLE').length,
);
const totalActiveAmount = computed(() =>
  tableCards.value.reduce((sum, c) => sum + (c.session && !c.isPaid ? c.totalAmount : 0), 0),
);

const currentFilterLabel = computed(() => {
  switch (selectedFilter.value) {
    case 'COOKING':
      return 'กำลังทำ / รอเสิร์ฟ';
    case 'READY_TO_PAY':
      return 'เสิร์ฟครบ / รอเช็กบิล';
    case 'PAID':
      return 'ชำระแล้ว / รอเคลียร์';
    case 'SEATED_NO_ORDER':
      return 'รอลูกค้าสั่งอาหาร';
    case 'AVAILABLE':
      return 'โต๊ะว่าง';
    default:
      return 'ทั้งหมด';
  }
});

const filteredTableCards = computed(() => {
  let list = tableCards.value;

  if (selectedFilter.value === 'COOKING') {
    list = list.filter((c) => c.tableStatus === 'COOKING');
  } else if (selectedFilter.value === 'READY_TO_PAY') {
    list = list.filter((c) => c.tableStatus === 'READY_TO_PAY');
  } else if (selectedFilter.value === 'PAID') {
    list = list.filter((c) => c.tableStatus === 'PAID');
  } else if (selectedFilter.value === 'SEATED_NO_ORDER') {
    list = list.filter((c) => c.tableStatus === 'SEATED_NO_ORDER');
  } else if (selectedFilter.value === 'AVAILABLE') {
    list = list.filter((c) => c.tableStatus === 'AVAILABLE');
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((c) => {
      const matchTable = c.table.name.toLowerCase().includes(q);
      const matchCustomer = c.session?.customer_name?.toLowerCase().includes(q) ?? false;
      return matchTable || matchCustomer;
    });
  }

  // Smart Sort: Ready to Pay -> Cooking -> Seated -> Paid -> Available -> Sort Order
  const statusPriority: Record<TableOperationalStatus, number> = {
    READY_TO_PAY: 1,
    COOKING: 2,
    SEATED_NO_ORDER: 3,
    PAID: 4,
    AVAILABLE: 5,
  };

  return list.sort((a, b) => {
    const pA = statusPriority[a.tableStatus];
    const pB = statusPriority[b.tableStatus];
    if (pA !== pB) return pA - pB;
    return a.table.sort_order - b.table.sort_order;
  });
});

function handleSelectFilter(filter: string) {
  selectedFilter.value = filter as
    'ALL' | 'COOKING' | 'READY_TO_PAY' | 'PAID' | 'SEATED_NO_ORDER' | 'AVAILABLE';
}

function handleFilterChange(val: string) {
  selectedFilter.value = val as
    'ALL' | 'COOKING' | 'READY_TO_PAY' | 'PAID' | 'SEATED_NO_ORDER' | 'AVAILABLE';
}

function openBill(sessionId: string) {
  void router.push(`/owner/bills/${sessionId}`);
}

function resetFilter() {
  selectedFilter.value = 'ALL';
  searchQuery.value = '';
}

// Clear table prompt & action
function promptClearTable(item: TableCardItem) {
  tableToClear.value = item;
  showConfirmClearModal.value = true;
}

async function handleConfirmClearTable() {
  if (!tableToClear.value?.session) return;
  const sessionId = tableToClear.value.session.id;
  const tableName = tableToClear.value.table.name;

  isClearingDirect.value = true;
  clearingSessionId.value = sessionId;
  try {
    await closeTableSession(sessionId);
    showConfirmClearModal.value = false;
    tableToClear.value = null;
    notifySuccess(`เคลียร์ ${tableName} สำเร็จ`, {
      title: 'เคลียร์โต๊ะสำเร็จ ✨',
      caption: 'โต๊ะกลับเป็นสถานะว่าง พร้อมรับลูกค้ากลุ่มใหม่ทันที',
    });
    await loadAllData();
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถเคลียร์โต๊ะได้', {
      title: 'เคลียร์โต๊ะไม่สำเร็จ',
    });
  } finally {
    isClearingDirect.value = false;
    clearingSessionId.value = null;
  }
}

// Cancel seated session prompt & action
function promptCancelSession(item: TableCardItem) {
  tableToCancel.value = item;
  showConfirmCancelModal.value = true;
}

async function handleConfirmCancelSession() {
  if (!tableToCancel.value?.session) return;
  const sessionId = tableToCancel.value.session.id;
  const tableName = tableToCancel.value.table.name;

  isCancellingDirect.value = true;
  cancellingSessionId.value = sessionId;
  try {
    await closeTableSession(sessionId);
    showConfirmCancelModal.value = false;
    tableToCancel.value = null;
    notifySuccess(`ยกเลิกการเปิด ${tableName} เรียบร้อย`, {
      title: 'ยกเลิกเซสชันโต๊ะสำเร็จ',
      caption: 'โต๊ะกลับคืนสู่สถานะว่าง',
    });
    await loadAllData();
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถยกเลิกเซสชันได้', {
      title: 'ยกเลิกเซสชันไม่สำเร็จ',
    });
  } finally {
    isCancellingDirect.value = false;
    cancellingSessionId.value = null;
  }
}

// Transfer & Merge table prompt & actions
function promptTransferTable(item: TableCardItem) {
  tableToTransfer.value = item;
  selectedTargetTableId.value = null;
  transferFilter.value = 'all';
  transferCustomerName.value = item.session?.customer_name || '';
  showTransferModal.value = true;
}

function handleSelectTargetTable(targetTbl: TargetTableOption) {
  selectedTargetTableId.value = targetTbl.table.id;
  if (targetTbl.isOccupied) {
    const srcName = tableToTransfer.value?.session?.customer_name;
    const tgtName = targetTbl.customerName;
    if (tgtName && srcName && tgtName !== srcName) {
      transferCustomerName.value = `${tgtName} / ${srcName}`;
    } else if (tgtName) {
      transferCustomerName.value = tgtName;
    } else if (srcName) {
      transferCustomerName.value = srcName;
    }
  } else if (targetTbl.isTakeaway) {
    transferCustomerName.value = tableToTransfer.value?.session?.customer_name || '';
  }
}

function promptConfirmTransferOrMerge() {
  if (!tableToTransfer.value?.session || !selectedTargetTableId.value) return;
  showMergeConfirmDialog.value = true;
}

async function executeTransferOrMerge() {
  if (!tableToTransfer.value?.session || !selectedTargetTableId.value) return;

  isTransferring.value = true;
  try {
    const isTargetTakeaway = Boolean(selectedTargetIsTakeaway.value);
    const isMerge = Boolean(selectedTargetIsOccupied.value);
    const res = await transferTableSession(
      tableToTransfer.value.session.id,
      selectedTargetTableId.value,
      {
        allowMerge: isMerge,
        customerName: isTargetTakeaway || isMerge ? transferCustomerName.value : undefined,
      },
    );

    if (res.isMerge) {
      notifySuccess(
        `รวมรายการของ ${res.sourceTableName || tableToTransfer.value.table.name} เข้ากับ ${res.targetTableName} เรียบร้อยแล้ว`,
        {
          title: 'รวมโต๊ะสำเร็จ 🔀',
          caption: `รวมเป็น ${res.orderCount ?? ''} ออเดอร์ • ${formatPrice(res.totalAmount ?? 0)}`,
        },
      );
    } else {
      notifySuccess(
        `ย้ายจาก ${res.sourceTableName || tableToTransfer.value.table.name} ไปยัง ${res.targetTableName}`,
        {
          title: 'ย้ายโต๊ะสำเร็จ 🔄',
          caption: 'โอนย้ายออเดอร์และยอดบิลทั้งหมดเรียบร้อยแล้ว',
        },
      );
    }

    showMergeConfirmDialog.value = false;
    showTransferModal.value = false;
    tableToTransfer.value = null;
    selectedTargetTableId.value = null;
    transferCustomerName.value = '';
    await loadAllData();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการย้าย/รวมโต๊ะ';
    notifyError(msg, {
      title: selectedTargetIsOccupied.value ? 'รวมโต๊ะไม่สำเร็จ' : 'ย้ายโต๊ะไม่สำเร็จ',
    });
  } finally {
    isTransferring.value = false;
  }
}

function showTableQR(table: TableWithQR) {
  selectedTable.value = table;
  if (table.active_qr) {
    const baseUrl = getAppUrl();
    selectedTableUrl.value = `${baseUrl}/t/${table.active_qr.public_token}`;
  } else {
    selectedTableUrl.value = '';
  }
  showQRModal.value = true;
}

function copyTableLink() {
  if (!selectedTableUrl.value) return;
  void navigator.clipboard.writeText(selectedTableUrl.value);
  notifySuccess('คัดลอกลิงก์โต๊ะแล้ว', {
    title: 'คัดลอกสำเร็จ 📋',
    caption: 'พร้อมสำหรับส่งต่อให้ลูกค้าเปิดดูเมนูอาหาร',
  });
}

function openSelectedTableLink() {
  if (!selectedTableUrl.value) return;
  window.open(selectedTableUrl.value, '_blank');
}

async function handleRegenerateQRFromModal() {
  if (!selectedTable.value) return;
  try {
    const newQr = await generateQRToken(selectedTable.value.id);
    selectedTable.value.active_qr = newQr;
    const baseUrl = getAppUrl();
    selectedTableUrl.value = `${baseUrl}/t/${newQr.public_token}`;
    await loadAllData();
    notifySuccess('สร้าง QR Code ใหม่เรียบร้อยแล้ว', {
      title: 'สร้าง QR Code สำเร็จ 📱',
      caption: 'QR Code สำหรับโต๊ะพร้อมใช้งานทันที',
    });
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'สร้าง QR ใหม่ไม่สำเร็จ', {
      title: 'สร้าง QR Code ไม่สำเร็จ',
    });
  }
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
  background: var(--color-background, #fbf9f6);
  min-height: 100vh;
}

.bills-container {
  max-width: 1320px;
  margin: 0 auto;
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 16px;
}

@media (max-width: 640px) {
  .cards-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Apple Empty State */
.apple-empty-state {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

.empty-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-surface-footer, #f5f5f7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 700;
}

.empty-desc {
  max-width: 440px;
  font-size: 0.875rem;
  line-height: 1.45;
}

/* Apple Buttons */
.apple-pill-btn {
  border-radius: 980px !important;
  font-size: 0.875rem;
  font-weight: 600;
  height: 40px;
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
}

.apple-pill-btn--primary:hover {
  background: #0066cc !important;
}

.apple-pill-btn--secondary {
  background: var(--color-surface-alt, #e8e8ed) !important;
  color: var(--color-ink, #1d1d1f) !important;
}

.apple-pill-btn--secondary:hover {
  background: #dedee3 !important;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}
</style>
