<template>
  <q-page class="bill-detail-page q-pa-md">
    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="bill-detail-container">
      <LoadingSkeleton type="bill-detail" />
    </div>

    <template v-else-if="session">
      <div class="bill-detail-container">
        <!-- Top Navigation & Header -->
        <div class="row items-center justify-between q-mb-md no-print">
          <q-btn
            flat
            round
            dense
            icon="arrow_back"
            color="grey-8"
            to="/owner/bills"
            aria-label="กลับหน้ารายการบิล"
          />
          <div class="row items-center q-gutter-sm">
            <q-btn
              v-if="session.status === 'ACTIVE'"
              outline
              rounded
              no-caps
              size="sm"
              icon="swap_horiz"
              label="ขอย้ายโต๊ะ"
              color="primary"
              @click="openTransferModal"
              class="q-px-sm"
            />
            <q-btn
              outline
              rounded
              no-caps
              size="sm"
              icon="print"
              label="พิมพ์ใบเสร็จ"
              @click="printReceipt"
              class="q-px-sm"
            />
            <StatusBadge
              :status="session.status"
              mode="raw"
              :custom-label="session.status === 'ACTIVE' ? 'กำลังนั่งทาน' : 'ปิดโต๊ะแล้ว'"
            />
          </div>
        </div>

        <!-- Quick Add Drinks Section (Only if session is ACTIVE) -->
        <div v-if="session.status === 'ACTIVE'" class="quick-add-card q-mb-lg no-print">
          <div class="row items-center justify-between q-mb-xs">
            <div class="row items-center">
              <q-icon name="local_bar" size="20px" color="primary" class="q-mr-xs" />
              <span class="text-weight-bold text-subtitle2"
                >เพิ่มเครื่องดื่มท้ายบิล (Quick Add)</span
              >
            </div>
            <span class="text-caption text-grey-7">กดเพื่อบวกเพิ่มเข้าบิลทันที</span>
          </div>

          <div class="row q-col-gutter-sm q-mt-xs">
            <!-- Canned Soft Drink -->
            <div class="col-4">
              <div class="drink-item-card column justify-between q-pa-sm full-height">
                <div class="row items-center no-wrap q-mb-xs">
                  <div class="drink-icon-wrap drink-icon-wrap--can q-mr-sm">🥤</div>
                  <div class="col ellipsis">
                    <div class="text-weight-bold text-body2 ellipsis">น้ำอัดลมกระป๋อง</div>
                    <div class="text-caption text-primary text-weight-bold font-mono">
                      {{ formatPrice(20) }}
                    </div>
                  </div>
                </div>
                <q-btn
                  unelevated
                  rounded
                  dense
                  no-caps
                  size="sm"
                  color="primary"
                  icon="add"
                  label="+ เพิ่ม 1 กป."
                  :loading="isAddingDrink === 'can'"
                  @click="addDrinkItem('น้ำอัดลมกระป๋อง', 20, 'can')"
                  class="full-width q-py-xs q-mt-xs"
                />
              </div>
            </div>

            <!-- Plain Water -->
            <div class="col-4">
              <div class="drink-item-card column justify-between q-pa-sm full-height">
                <div class="row items-center no-wrap q-mb-xs">
                  <div class="drink-icon-wrap drink-icon-wrap--plain q-mr-sm">🫗</div>
                  <div class="col ellipsis">
                    <div class="text-weight-bold text-body2 ellipsis">น้ำเปล่า</div>
                    <div class="text-caption text-primary text-weight-bold font-mono">
                      {{ formatPrice(10) }}
                    </div>
                  </div>
                </div>
                <q-btn
                  unelevated
                  rounded
                  dense
                  no-caps
                  size="sm"
                  color="primary"
                  icon="add"
                  label="+ เพิ่ม 1 ขวด"
                  :loading="isAddingDrink === 'plain'"
                  @click="addDrinkItem('น้ำเปล่า', 10, 'plain')"
                  class="full-width q-py-xs q-mt-xs"
                />
              </div>
            </div>

            <!-- Bottled Water -->
            <div class="col-4">
              <div class="drink-item-card column justify-between q-pa-sm full-height">
                <div class="row items-center no-wrap q-mb-xs">
                  <div class="drink-icon-wrap drink-icon-wrap--water q-mr-sm">💧</div>
                  <div class="col ellipsis">
                    <div class="text-weight-bold text-body2 ellipsis">น้ำขวด</div>
                    <div class="text-caption text-primary text-weight-bold font-mono">
                      {{ formatPrice(25) }}
                    </div>
                  </div>
                </div>
                <q-btn
                  unelevated
                  rounded
                  dense
                  no-caps
                  size="sm"
                  color="primary"
                  icon="add"
                  label="+ เพิ่ม 1 ขวด"
                  :loading="isAddingDrink === 'water'"
                  @click="addDrinkItem('น้ำขวด', 25, 'water')"
                  class="full-width q-py-xs q-mt-xs"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Receipt Slip View -->
        <div class="receipt-wrapper q-mb-lg">
          <ReceiptSlip :bill="bill" :table-name="tableName" :orders="orders" :show-actions="true" />
        </div>

        <!-- Action Controls for Owner (No Print) -->
        <div v-if="session.status === 'ACTIVE'" class="column q-gutter-y-sm no-print">
          <!-- 1. If no orders placed yet in this session -->
          <div v-if="orders.length === 0" class="empty-orders-action-card q-pa-md text-center">
            <div class="empty-orders-icon q-mx-auto q-mb-sm">
              <q-icon name="touch_app" size="28px" color="cyan-9" />
            </div>
            <div class="text-subtitle2 text-weight-bold text-grey-9">
              โต๊ะนี้ยังไม่มีรายการสั่งอาหาร
            </div>
            <p class="text-caption text-grey-7 q-mb-md q-mt-xs">
              อยู่ในสถานะเปิดโต๊ะรอลูกค้าสั่ง หากลูกค้าไม่ต้องการสั่งอาหารแล้ว
              หรือสแกนโดยไม่ได้ตั้งใจ สามารถยกเลิกการเปิดโต๊ะเพื่อคืนสถานะเป็นโต๊ะว่างได้
            </p>
            <q-btn
              unelevated
              no-caps
              rounded
              color="negative"
              size="md"
              icon="person_remove"
              label="ยกเลิกการเปิดโต๊ะ (คืนสถานะโต๊ะว่าง)"
              :loading="isProcessing"
              @click="handleCancelEmptySession"
              class="q-px-lg"
            />
          </div>

          <!-- 2. Orders exist: Cannot pay if not all served -->
          <div v-else-if="!allServed" class="not-served-warning q-pa-md q-mb-xs">
            <div class="row items-center">
              <q-icon name="warning" size="20px" class="q-mr-xs text-amber-9" />
              <span class="text-weight-bold text-amber-10">ยังมีอาหารที่ยังไม่ได้เสิร์ฟ</span>
            </div>
            <p class="q-mb-none text-caption text-grey-8 q-mt-xs">
              ต้องเสิร์ฟอาหารให้ครบทุกรายการก่อน จึงจะสามารถรับชำระเงินและปิดโต๊ะได้
            </p>
          </div>

          <!-- 3. Orders exist: Pay button -->
          <q-btn
            v-if="orders.length > 0 && (!bill || bill.status !== 'PAID')"
            color="primary"
            unelevated
            no-caps
            size="lg"
            class="full-width action-button"
            :disable="!allServed"
            @click="handleMarkPaid"
            :loading="isProcessing"
          >
            <q-icon name="payments" class="q-mr-sm" />
            <span>รับชำระเงินเรียบร้อย ({{ formatPrice(billTotal) }})</span>
          </q-btn>

          <!-- 4. Paid: Close session button -->
          <q-btn
            v-if="bill?.status === 'PAID'"
            color="grey-8"
            unelevated
            no-caps
            size="lg"
            class="full-width action-button"
            @click="handleCloseSession"
            :loading="isProcessing"
          >
            <q-icon name="check_circle" class="q-mr-sm" />
            <span>ปิดโต๊ะ / จบบิลนี้</span>
          </q-btn>
        </div>

        <div v-if="session.status === 'CLOSED'" class="closed-banner q-pa-md text-center no-print">
          <q-icon name="task_alt" size="32px" color="positive" class="q-mb-xs" />
          <div class="text-weight-bold">โต๊ะนี้ปิดบิลเรียบร้อยแล้ว</div>
        </div>
      </div>

      <!-- Transfer Table Modal Dialog -->
      <q-dialog v-model="showTransferModal">
        <q-card
          style="min-width: 360px; max-width: 480px"
          class="q-pa-md border-radius-lg transfer-dialog-card no-print"
        >
          <q-card-section class="q-pb-xs">
            <div class="row items-center no-wrap q-mb-sm">
              <div class="transfer-modal-icon-wrap q-mr-sm">
                <q-icon name="swap_horiz" size="24px" color="primary" />
              </div>
              <div>
                <div class="text-h6 text-weight-bold">ขอย้ายโต๊ะอาหาร</div>
                <div class="text-caption text-grey-7">
                  โอนย้ายออเดอร์และบิลทั้งหมดไปยังโต๊ะใหม่ที่ว่างอยู่
                </div>
              </div>
            </div>

            <!-- Current Table Info Card -->
            <div class="transfer-source-card q-pa-sm q-my-sm">
              <div class="row items-center justify-between">
                <div class="row items-center">
                  <q-icon name="table_restaurant" size="18px" class="q-mr-xs text-primary" />
                  <span class="text-weight-bold text-body2">{{ tableName }}</span>
                </div>
                <span class="text-caption text-grey-7">
                  {{ orders.length }} ออเดอร์ • {{ formatPrice(billTotal) }}
                </span>
              </div>
            </div>

            <!-- Target Table Selection -->
            <div class="q-mt-md">
              <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">
                เลือกโต๊ะว่างปลายทางที่ต้องการย้ายไป:
              </div>

              <!-- When No Empty Tables Available -->
              <div
                v-if="availableTablesForTransfer.length === 0"
                class="no-available-tables-box q-pa-md text-center"
              >
                <q-icon name="do_not_disturb_on" size="32px" color="amber-9" class="q-mb-xs" />
                <div class="text-weight-bold text-amber-10">ไม่มีโต๊ะว่างในขณะนี้</div>
                <div class="text-caption text-grey-7 q-mt-xs">
                  โต๊ะอื่นในร้านมีลูกค้านั่งเต็มทั้งหมดแล้ว กรุณาเคลียร์โต๊ะที่ชำระเงินแล้ว
                  หรือรอให้มีโต๊ะว่างก่อน
                </div>
              </div>

              <!-- Available Tables Grid -->
              <div v-else class="available-tables-grid q-mt-xs">
                <div
                  v-for="targetTbl in availableTablesForTransfer"
                  :key="targetTbl.id"
                  class="target-table-item"
                  :class="{ 'target-table-item--selected': selectedTargetTableId === targetTbl.id }"
                  @click="selectedTargetTableId = targetTbl.id"
                >
                  <div class="row items-center justify-between">
                    <div class="row items-center">
                      <q-icon
                        name="table_restaurant"
                        size="18px"
                        class="target-table-icon q-mr-xs"
                      />
                      <span class="target-table-name text-weight-bold">{{ targetTbl.name }}</span>
                    </div>
                    <q-icon
                      v-if="selectedTargetTableId === targetTbl.id"
                      name="check_circle"
                      size="18px"
                      color="primary"
                    />
                    <span v-else class="target-table-free-badge">ว่าง</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notice Info Box -->
            <div v-if="selectedTargetTableId" class="transfer-hint-box q-pa-sm q-mt-md">
              <div class="row items-start no-wrap">
                <q-icon name="info" size="16px" color="primary" class="q-mr-xs q-mt-xs" />
                <div class="text-caption text-grey-8 font-size-11">
                  เมื่อกดยืนยัน รายการอาหารและยอดเงินจะย้ายไปที่
                  <strong class="text-primary">{{
                    allTables.find((t) => t.id === selectedTargetTableId)?.name
                  }}</strong>
                  ทันที และโต๊ะเดิมจะกลับไปเป็นสถานะ <strong>"โต๊ะว่าง"</strong>
                </div>
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="stretch" class="column q-gutter-y-xs q-mt-md">
            <q-btn
              unelevated
              no-caps
              rounded
              color="primary"
              :label="
                selectedTargetTableId
                  ? `ยืนยันย้ายไป ${allTables.find((t) => t.id === selectedTargetTableId)?.name || 'โต๊ะใหม่'}`
                  : 'กรุณาเลือกโต๊ะว่าง'
              "
              :disabled="!selectedTargetTableId || availableTablesForTransfer.length === 0"
              :loading="isTransferring"
              @click="handleConfirmTransfer"
              class="full-width font-weight-600"
            />
            <q-btn
              flat
              no-caps
              rounded
              color="grey-7"
              label="ยกเลิก"
              v-close-popup
              class="full-width"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNotify } from 'src/composables/useNotify';
import { supabase } from 'src/services/supabase';
import { getOrCreateBill, markBillPaid, ownerAddQuickItem } from 'src/services/billService';
import { closeTableSession, transferTableSession } from 'src/services/sessionService';
import { fetchTables, isTakeawayName } from 'src/services/tableService';
import { formatPrice } from 'src/utils/formatters';
import { OrderStatus } from 'src/types/enums';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import ReceiptSlip from 'src/components/ReceiptSlip.vue';
import type { TableSession, Bill, OrderWithItems, TableWithQR } from 'src/types/database';

const route = useRoute();
const router = useRouter();
const { notifySuccess, notifyError } = useNotify();

const session = ref<TableSession | null>(null);
const orders = ref<OrderWithItems[]>([]);
const bill = ref<Bill | null>(null);
const tableName = ref('');
const isLoading = ref(true);
const isProcessing = ref(false);
const isAddingDrink = ref<string | null>(null);

// Transfer Table Modal State
const showTransferModal = ref(false);
const allTables = ref<TableWithQR[]>([]);
const activeSessionsList = ref<{ table_id: string; status: string }[]>([]);
const selectedTargetTableId = ref<string | null>(null);
const isTransferring = ref(false);

const availableTablesForTransfer = computed(() => {
  if (!session.value) return [];
  const currentTableId = session.value.table_id;
  const occupiedTableIds = new Set(
    activeSessionsList.value.filter((s) => s.status === 'ACTIVE').map((s) => s.table_id),
  );

  return allTables.value.filter(
    (t) =>
      t.is_active &&
      t.id !== currentTableId &&
      !isTakeawayName(t.name) &&
      !occupiedTableIds.has(t.id),
  );
});

const billTotal = computed(() => {
  if (bill.value?.total_amount !== undefined && bill.value?.total_amount !== null) {
    return bill.value.total_amount;
  }
  return orders.value.reduce((sum, o) => sum + o.total_amount, 0);
});

const allServed = computed(
  () => orders.value.length > 0 && orders.value.every((o) => o.status === OrderStatus.SERVED),
);

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
    notifySuccess(`เพิ่ม "${name}" (฿${price}) เข้าบิลเรียบร้อยแล้ว`);
    await loadData();
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถเพิ่มรายการได้');
  } finally {
    isAddingDrink.value = null;
  }
}

async function openTransferModal() {
  selectedTargetTableId.value = null;
  showTransferModal.value = true;
  try {
    const [tablesData, sessionsRes] = await Promise.all([
      fetchTables(),
      supabase.from('table_sessions').select('table_id, status').eq('status', 'ACTIVE'),
    ]);
    allTables.value = tablesData.filter((t) => t.is_active);
    activeSessionsList.value = sessionsRes.data ?? [];
  } catch {
    notifyError('ไม่สามารถโหลดรายชื่อโต๊ะว่างได้');
  }
}

async function handleConfirmTransfer() {
  if (!session.value || !selectedTargetTableId.value) return;

  isTransferring.value = true;
  try {
    const res = await transferTableSession(session.value.id, selectedTargetTableId.value);
    notifySuccess(`ย้ายไปยัง ${res.targetTableName} เรียบร้อยแล้ว`);
    showTransferModal.value = false;
    selectedTargetTableId.value = null;
    await loadData();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการย้ายโต๊ะ';
    notifyError(msg);
  } finally {
    isTransferring.value = false;
  }
}

function printReceipt() {
  window.print();
}

async function handleMarkPaid() {
  if (!bill.value) return;
  isProcessing.value = true;
  try {
    bill.value = await markBillPaid(bill.value.id);
    notifySuccess('บันทึกการรับชำระเงินเรียบร้อยแล้ว');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกการชำระเงินได้');
  } finally {
    isProcessing.value = false;
  }
}

async function handleCloseSession() {
  if (!session.value) return;
  isProcessing.value = true;
  try {
    await closeTableSession(session.value.id);
    notifySuccess('ปิดโต๊ะเรียบร้อยแล้ว โต๊ะพร้อมรับลูกค้าท่านถัดไป');
    void router.push('/owner/bills');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถปิดโต๊ะได้');
  } finally {
    isProcessing.value = false;
  }
}

async function handleCancelEmptySession() {
  if (!session.value) return;
  isProcessing.value = true;
  try {
    await closeTableSession(session.value.id);
    notifySuccess('ยกเลิกการเปิดโต๊ะเรียบร้อยแล้ว คืนสถานะเป็นโต๊ะว่าง');
    void router.push('/owner/bills');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถยกเลิกการเปิดโต๊ะได้');
  } finally {
    isProcessing.value = false;
  }
}
</script>

<style scoped>
.bill-detail-page {
  background: var(--color-background);
  min-height: 100vh;
}

.bill-detail-container {
  max-width: 500px;
  margin: 0 auto;
}

.empty-orders-action-card {
  background: #ffffff;
  border: 1px solid #cffafe;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-subtle);
}

.empty-orders-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #ecfeff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-add-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 14px;
  box-shadow: var(--shadow-subtle);
}

.drink-item-card {
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: 10px;
  min-height: 95px;
  transition: all 0.15s ease;
}

.drink-item-card:hover {
  border-color: var(--color-primary);
  background: #ffffff;
  box-shadow: var(--shadow-subtle);
}

.drink-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.drink-icon-wrap--can {
  background: #fee2e2;
}

.drink-icon-wrap--plain {
  background: #ecfdf5;
}

.drink-icon-wrap--water {
  background: #e0f2fe;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.not-served-warning {
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: var(--radius-md);
}

.action-button {
  border-radius: var(--radius-md);
  height: 52px;
  font-weight: 600;
  box-shadow: var(--shadow-md);
}

.closed-banner {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-md);
  color: #166534;
}

/* ─── Transfer Dialog Styles ─── */
.transfer-dialog-card {
  background: #ffffff;
}

.transfer-modal-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.transfer-source-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.no-available-tables-box {
  background: #fffbeb;
  border: 1px dashed #fcd34d;
  border-radius: var(--radius-md);
}

.available-tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding: 2px;
}

.target-table-item {
  background: #ffffff;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.target-table-item:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  transform: translateY(-1px);
}

.target-table-item--selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.target-table-icon {
  color: var(--color-text-secondary);
}

.target-table-item--selected .target-table-icon {
  color: var(--color-primary);
}

.target-table-name {
  font-size: 0.85rem;
  color: var(--color-text-primary);
}

.target-table-item--selected .target-table-name {
  color: var(--color-primary);
}

.target-table-free-badge {
  font-size: 10px;
  font-weight: 600;
  color: #15803d;
  background: #dcfce7;
  padding: 2px 6px;
  border-radius: 999px;
}

.transfer-hint-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: var(--radius-md);
}

.font-weight-600 {
  font-weight: 600;
}

@media print {
  .no-print {
    display: none !important;
  }
}
</style>
