<template>
  <q-page class="bill-detail-page q-pa-md q-pa-md-lg">
    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="bill-detail-container">
      <LoadingSkeleton type="bill-detail" />
    </div>

    <template v-else-if="session">
      <div class="bill-detail-container">
        <!-- 1. Apple Header Navigation & Table Meta -->
        <BillDetailHeader
          :table-name="tableName"
          :session-status="session.status"
          :bill-id="bill?.id"
          :total-items-count="totalItemsCount"
          :order-count="orders.length"
          :can-transfer="session.status === 'ACTIVE'"
          @transfer="openTransferModal"
          @print="printReceipt"
          @copy="handleCopySummary"
        />

        <!-- 2. Apple 2-Column Responsive Layout (iPad / Tablet & Desktop) -->
        <div class="bill-detail-layout">
          <!-- Left Column: Apple Digital Statement / Receipt Slip View -->
          <div class="bill-detail-main">
            <ReceiptSlip
              ref="receiptSlipRef"
              :bill="bill"
              :table-name="tableName"
              :orders="orders"
              :show-actions="true"
              :allow-edit-price="session.status === 'ACTIVE' && bill?.status !== 'PAID'"
              @edit-price="handleOpenEditPriceModal"
            />
          </div>

          <!-- Right Column (Sticky on iPad/Desktop): Payment Hero Card & Quick Drinks -->
          <div class="bill-detail-sidebar no-print">
            <!-- 2.1 Apple Payment Hero Action Card -->
            <BillPaymentCard
              :session="session"
              :bill="bill"
              :table-name="tableName"
              :bill-total="billTotal"
              :total-items-count="totalItemsCount"
              :orders="orders"
              :all-served="allServed"
              :is-processing="isProcessing"
              @mark-paid="handleMarkPaid"
              @close-session="handleCloseSession"
              @cancel-empty-session="handleCancelEmptySession"
            />

            <!-- 2.2 Quick Add Drinks Section (Active Unpaid Session Only) -->
            <BillQuickDrinks
              v-if="session.status === 'ACTIVE' && (!bill || bill.status !== 'PAID')"
              :is-adding-drink="isAddingDrink"
              @add-drink="addDrinkItem"
            />
          </div>
        </div>

        <!-- 3. Mobile Floating Quick-Action Bar (Small screens only) -->
        <div
          v-if="session.status === 'ACTIVE' && (!bill || bill.status !== 'PAID') && orders.length > 0"
          class="mobile-floating-bar lt-md no-print"
        >
          <div class="row items-center justify-between no-wrap">
            <div>
              <div class="text-caption text-muted">ยอดรวมทั้งสิ้น</div>
              <div class="mobile-bar-total font-mono text-weight-bold">
                {{ formatPrice(billTotal) }}
              </div>
            </div>
            <q-btn
              unelevated
              no-caps
              :disable="!allServed"
              :loading="isProcessing"
              @click="handleMarkPaid"
              class="apple-pill-btn apple-pill-btn--primary"
            >
              <q-icon name="payments" size="18px" class="q-mr-xs" />
              <span>{{ allServed ? 'รับชำระเงิน' : 'รอเสิร์ฟครบ' }}</span>
            </q-btn>
          </div>
        </div>
      </div>

      <!-- 4. Apple Modal Dialogs -->
      <!-- 4.1 Edit Dish Price Modal Dialog -->
      <BillEditPriceModal
        v-model="showEditPriceModal"
        :editing-item="editingItem"
        :is-saving-price="isSavingPrice"
        @confirm-update="handleConfirmUpdatePrice"
      />

      <!-- 4.2 Shared Table Transfer & Merge Modal Dialog (Apple Design) -->
      <TableTransferModal
        v-model="showTransferModal"
        :table-to-transfer="currentTransferSource"
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
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNotify } from 'src/composables/useNotify';
import { supabase } from 'src/services/supabase';
import {
  getOrCreateBill,
  markBillPaid,
  ownerAddQuickItem,
  ownerUpdateOrderItemPrice,
} from 'src/services/billService';
import { closeTableSession, transferTableSession } from 'src/services/sessionService';
import { fetchTables, isTakeawayName } from 'src/services/tableService';
import { formatPrice } from 'src/utils/formatters';
import { OrderStatus } from 'src/types/enums';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import ReceiptSlip from 'src/components/ReceiptSlip.vue';
import BillDetailHeader from 'src/components/bills/BillDetailHeader.vue';
import BillPaymentCard from 'src/components/bills/BillPaymentCard.vue';
import BillQuickDrinks from 'src/components/bills/BillQuickDrinks.vue';
import BillEditPriceModal from 'src/components/bills/BillEditPriceModal.vue';
import TableTransferModal, {
  type TargetTableOption,
} from 'src/components/bills/TableTransferModal.vue';
import type { TransferSourceTable } from 'src/types/tableCard';
import type {
  TableSession,
  Bill,
  OrderWithItems,
  TableWithQR,
  OrderItemWithOptions,
} from 'src/types/database';

const route = useRoute();
const router = useRouter();
const { notifySuccess, notifyError } = useNotify();

const receiptSlipRef = ref<InstanceType<typeof ReceiptSlip> | null>(null);

const session = ref<TableSession | null>(null);
const orders = ref<OrderWithItems[]>([]);
const bill = ref<Bill | null>(null);
const tableName = ref('');
const isLoading = ref(true);
const isProcessing = ref(false);
const isAddingDrink = ref<string | null>(null);

// Edit Order Item Price State
const showEditPriceModal = ref(false);
const editingItem = ref<OrderItemWithOptions | null>(null);
const isSavingPrice = ref(false);

// Transfer & Merge Table Modal State
const showTransferModal = ref(false);
const showMergeConfirmDialog = ref(false);
const allTables = ref<TableWithQR[]>([]);
interface SessionWithOrdersAndBill {
  id: string;
  table_id: string;
  customer_name?: string | null;
  status: string;
  orders?: { id: string; total_amount?: number }[];
  bill?: { id: string; total_amount?: number; status?: string }[];
}
const activeSessionsList = ref<SessionWithOrdersAndBill[]>([]);
const selectedTargetTableId = ref<string | null>(null);
const transferCustomerName = ref('');
const transferFilter = ref<'all' | 'empty' | 'occupied'>('all');
const isTransferring = ref(false);

const billTotal = computed(() => {
  if (bill.value?.total_amount !== undefined && bill.value?.total_amount !== null) {
    return bill.value.total_amount;
  }
  return orders.value.reduce((sum, o) => sum + o.total_amount, 0);
});

const totalItemsCount = computed(() => {
  return orders.value.reduce((sum, o) => {
    return sum + (o.items?.reduce((s, i) => s + i.quantity, 0) || 0);
  }, 0);
});

const allServed = computed(
  () => orders.value.length > 0 && orders.value.every((o) => o.status === OrderStatus.SERVED),
);

// Source table representation for TableTransferModal
const currentTransferSource = computed<TransferSourceTable | null>(() => {
  if (!session.value) return null;
  return {
    table: { id: session.value.table_id, name: tableName.value },
    isTakeaway: isTakeawayName(tableName.value),
    session: session.value,
    orderCount: orders.value.length,
    totalAmount: billTotal.value,
  };
});

// Target tables computation for TableTransferModal
const allTargetTables = computed<TargetTableOption[]>(() => {
  if (!session.value) return [];
  const currentTableId = session.value.table_id;
  const isCurrentTakeaway = isTakeawayName(tableName.value);

  return allTables.value
    .filter((t) => {
      if (!t.is_active || t.id === currentTableId) return false;
      const isTargetTakeaway = isTakeawayName(t.name);
      if (isTargetTakeaway && isCurrentTakeaway) return false;
      return true;
    })
    .map((t) => {
      const isTargetTakeaway = isTakeawayName(t.name);
      const activeSession =
        activeSessionsList.value.find((s) => s.table_id === t.id && s.status === 'ACTIVE') ?? null;
      const isOccupied = !isTargetTakeaway && activeSession !== null;
      const sessionOrders = activeSession?.orders || [];
      const orderCount = sessionOrders.length;
      const totalAmount =
        activeSession?.bill?.[0]?.total_amount ??
        sessionOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      return {
        table: t,
        isTakeaway: isTargetTakeaway,
        isOccupied,
        orderCount,
        totalAmount,
        customerName: activeSession?.customer_name,
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
  const target = allTables.value.find((t) => t.id === selectedTargetTableId.value);
  return target ? isTakeawayName(target.name) : false;
});

onMounted(async () => {
  await loadData();
});

async function loadData() {
  const sessionId = route.params.sessionId as string;

  const [{ data: sessionData }, { data: ordersData }] = await Promise.all([
    supabase.from('table_sessions').select('*, table:tables(name)').eq('id', sessionId).single(),
    supabase
      .from('orders')
      .select(
        `
        *,
        items:order_items (
          *,
          options:order_item_options (*)
        )
      `,
      )
      .eq('table_session_id', sessionId)
      .order('queue_number'),
  ]);

  if (sessionData) {
    session.value = sessionData;
    const rawTableName =
      (sessionData as unknown as { table: { name: string } }).table?.name ?? 'โต๊ะ';
    const custName = (sessionData as unknown as { customer_name?: string }).customer_name;
    if (
      custName &&
      (rawTableName.includes('กลับบ้าน') || rawTableName.toLowerCase().includes('takeaway'))
    ) {
      tableName.value = `สั่งกลับบ้าน (${custName})`;
    } else if (custName) {
      tableName.value = `${rawTableName} (${custName})`;
    } else {
      tableName.value = rawTableName;
    }
  }
  orders.value = (ordersData ?? []) as OrderWithItems[];

  if (session.value) {
    bill.value = await getOrCreateBill(session.value.id);
  }

  isLoading.value = false;
}

async function addDrinkItem(name: string, price: number, type: string) {
  if (!session.value) return;
  isAddingDrink.value = type;
  try {
    await ownerAddQuickItem(session.value.id, name, price, 1);
    notifySuccess(`เพิ่ม "${name}" (${formatPrice(price)}) เข้าบิลเรียบร้อยแล้ว`, {
      title: 'เพิ่มรายการสำเร็จ ➕',
      caption: 'บันทึกรายการด่วนลงในบิลเรียบร้อย',
    });
    await loadData();
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถเพิ่มรายการได้', {
      title: 'เพิ่มรายการไม่สำเร็จ',
    });
  } finally {
    isAddingDrink.value = null;
  }
}

async function openTransferModal() {
  selectedTargetTableId.value = null;
  transferFilter.value = 'all';
  transferCustomerName.value = session.value?.customer_name || '';
  showTransferModal.value = true;
  try {
    const [tablesData, sessionsRes] = await Promise.all([
      fetchTables(),
      supabase
        .from('table_sessions')
        .select(
          'id, table_id, customer_name, status, orders(id, total_amount), bill:bills(id, total_amount, status)',
        )
        .eq('status', 'ACTIVE'),
    ]);
    allTables.value = tablesData.filter((t) => t.is_active);
    activeSessionsList.value = (sessionsRes.data as unknown as SessionWithOrdersAndBill[]) ?? [];
  } catch {
    notifyError('ไม่สามารถโหลดรายชื่อโต๊ะได้', {
      title: 'โหลดรายชื่อโต๊ะไม่สำเร็จ',
    });
  }
}

function handleSelectTargetTable(targetTbl: TargetTableOption) {
  selectedTargetTableId.value = targetTbl.table.id;
  if (targetTbl.isOccupied) {
    const srcName = session.value?.customer_name;
    const tgtName = targetTbl.customerName;
    if (tgtName && srcName && tgtName !== srcName) {
      transferCustomerName.value = `${tgtName} / ${srcName}`;
    } else if (tgtName) {
      transferCustomerName.value = tgtName;
    } else if (srcName) {
      transferCustomerName.value = srcName;
    }
  } else if (targetTbl.isTakeaway) {
    transferCustomerName.value = session.value?.customer_name || '';
  }
}

function promptConfirmTransferOrMerge() {
  if (!session.value || !selectedTargetTableId.value) return;
  showMergeConfirmDialog.value = true;
}

async function executeTransferOrMerge() {
  if (!session.value || !selectedTargetTableId.value) return;

  isTransferring.value = true;
  try {
    const isTargetTakeaway = Boolean(selectedTargetIsTakeaway.value);
    const isMerge = Boolean(selectedTargetIsOccupied.value);
    const res = await transferTableSession(session.value.id, selectedTargetTableId.value, {
      allowMerge: isMerge,
      customerName: isTargetTakeaway || isMerge ? transferCustomerName.value : undefined,
    });

    if (res.isMerge) {
      notifySuccess(
        `รวมรายการของ ${res.sourceTableName || tableName.value} เข้ากับ ${res.targetTableName} เรียบร้อยแล้ว`,
        {
          title: 'รวมโต๊ะสำเร็จ 🔀',
          caption: `รวมเป็น ${res.orderCount ?? ''} ออเดอร์ • ${formatPrice(res.totalAmount ?? 0)}`,
        },
      );
    } else {
      notifySuccess(`ย้ายไปยัง ${res.targetTableName} เรียบร้อยแล้ว`, {
        title: 'ย้ายโต๊ะสำเร็จ 🔄',
        caption: 'โอนย้ายออเดอร์และยอดบิลไปยังโต๊ะใหม่เรียบร้อย',
      });
    }

    showMergeConfirmDialog.value = false;
    showTransferModal.value = false;
    selectedTargetTableId.value = null;
    transferCustomerName.value = '';

    if (res.isMerge) {
      await router.push('/owner/bills');
    } else {
      await loadData();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการย้าย/รวมโต๊ะ';
    notifyError(msg, {
      title: selectedTargetIsOccupied.value ? 'รวมโต๊ะไม่สำเร็จ' : 'ย้ายโต๊ะไม่สำเร็จ',
    });
  } finally {
    isTransferring.value = false;
  }
}

function printReceipt() {
  window.print();
}

function handleCopySummary() {
  receiptSlipRef.value?.copyReceiptSummary();
}

async function handleMarkPaid() {
  if (!bill.value) return;
  isProcessing.value = true;
  try {
    bill.value = await markBillPaid(bill.value.id);
    notifySuccess('บันทึกการรับชำระเงินเรียบร้อยแล้ว', {
      title: 'ชำระเงินสำเร็จ 💰',
      caption: 'ยอดเงินถูกบันทึกเข้าระบบเรียบร้อยแล้ว',
    });
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกการชำระเงินได้', {
      title: 'บันทึกชำระเงินไม่สำเร็จ',
    });
  } finally {
    isProcessing.value = false;
  }
}

async function handleCloseSession() {
  if (!session.value) return;
  isProcessing.value = true;
  try {
    await closeTableSession(session.value.id);
    notifySuccess('ปิดโต๊ะเรียบร้อยแล้ว โต๊ะพร้อมรับลูกค้าท่านถัดไป', {
      title: 'ปิดโต๊ะเรียบร้อย ✨',
      caption: 'เซสชันเสร็จสิ้นและคืนสถานะเป็นโต๊ะว่าง',
    });
    void router.push('/owner/bills');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถปิดโต๊ะได้', {
      title: 'ปิดโต๊ะไม่สำเร็จ',
    });
  } finally {
    isProcessing.value = false;
  }
}

async function handleCancelEmptySession() {
  if (!session.value) return;
  isProcessing.value = true;
  try {
    await closeTableSession(session.value.id);
    notifySuccess('ยกเลิกการเปิดโต๊ะเรียบร้อยแล้ว คืนสถานะเป็นโต๊ะว่าง', {
      title: 'ยกเลิกเซสชันสำเร็จ',
      caption: 'โต๊ะกลับคืนสู่สถานะว่าง',
    });
    void router.push('/owner/bills');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถยกเลิกการเปิดโต๊ะได้', {
      title: 'ยกเลิกเปิดโต๊ะไม่สำเร็จ',
    });
  } finally {
    isProcessing.value = false;
  }
}

function handleOpenEditPriceModal(payload: { item: OrderItemWithOptions; order: OrderWithItems }) {
  editingItem.value = payload.item;
  showEditPriceModal.value = true;
}

async function handleConfirmUpdatePrice(payload: {
  itemId: string;
  newBasePrice: number;
  newSubtotal: number;
  instruction: string;
}) {
  isSavingPrice.value = true;
  try {
    await ownerUpdateOrderItemPrice(
      payload.itemId,
      payload.newBasePrice,
      payload.newSubtotal,
      payload.instruction,
    );
    notifySuccess(
      `ปรับราคาอาหารเป็น ${formatPrice(payload.newSubtotal)} เรียบร้อยแล้ว`,
      {
        title: 'ปรับราคาสำเร็จ 🏷️',
        caption: 'ยอดรวมของรายการและบิลถูกคำนวณใหม่แล้ว',
      },
    );
    showEditPriceModal.value = false;
    editingItem.value = null;
    await loadData();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'ไม่สามารถปรับราคาอาหารได้';
    notifyError(msg, {
      title: 'ปรับราคาอาหารไม่สำเร็จ',
    });
  } finally {
    isSavingPrice.value = false;
  }
}
</script>

<style scoped>
.bill-detail-page {
  background: var(--color-background, #fafafc);
  min-height: 100vh;
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
}

.bill-detail-container {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}

/* Apple 2-Column Responsive Layout */
.bill-detail-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 768px) {
  .bill-detail-layout {
    grid-template-columns: minmax(0, 1.25fr) minmax(340px, 380px);
    gap: 32px;
    align-items: start;
  }

  .bill-detail-sidebar {
    position: sticky;
    top: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
}

@media (max-width: 767px) {
  .bill-detail-container {
    max-width: 520px;
    padding-bottom: 72px; /* Space for mobile floating bar */
  }

  .bill-detail-sidebar {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
}

/* Mobile Quick-Pay Sticky Bar */
.mobile-floating-bar {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px) saturate(1.8);
  -webkit-backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 980px;
  padding: 10px 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  z-index: 100;
}

.mobile-bar-total {
  font-size: 1.125rem;
  color: var(--color-primary, #0071e3);
  line-height: 1.2;
}

.font-mono {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

.apple-pill-btn {
  border-radius: 980px !important;
  font-weight: 600;
  height: 38px;
  padding: 0 18px;
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
}

@media print {
  .no-print {
    display: none !important;
  }
}
</style>
