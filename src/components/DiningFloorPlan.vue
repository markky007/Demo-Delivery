<template>
  <div class="dining-floor-plan">
    <!-- Floor Plan Main Area -->
    <div class="floor-plan-surface">
      <!-- Section A: Takeaway Pick-up Bay (if any takeaway tables exist) -->
      <div v-if="takeawayCards.length > 0" class="takeaway-bay-section q-mb-lg">
        <div class="bay-header row items-center justify-between q-mb-sm">
          <div class="row items-center q-gutter-x-xs">
            <q-icon name="shopping_bag" size="18px" color="orange-9" />
            <span class="bay-title">จุดบริการสั่งกลับบ้าน (Takeaway Station)</span>
            <q-badge color="orange-9" rounded class="q-ml-xs">
              {{ activeTakeawayCount }} ออเดอร์
            </q-badge>
          </div>
          <span class="text-caption text-grey-6">จุดรับอาหารหน้าร้าน</span>
        </div>

        <div class="takeaway-cards-row">
          <div
            v-for="item in takeawayCards"
            :key="item.session?.id || item.table.id"
            class="takeaway-seat-box"
            :class="[
              `takeaway-seat-box--${item.tableStatus.toLowerCase().replace(/_/g, '-')}`,
              { 'seat-dimmed': isDimmed(item) },
            ]"
            @click="handleSelectTable(item)"
          >
            <div class="takeaway-seat-inner">
              <div class="row items-center justify-between no-wrap">
                <div class="row items-center q-gutter-x-xs no-wrap ellipsis">
                  <div class="takeaway-icon-pill">
                    <q-icon name="takeout_dining" size="16px" />
                  </div>
                  <div class="ellipsis">
                    <div class="text-weight-bold text-caption ellipsis">
                      {{ item.session?.customer_name || item.table.name }}
                    </div>
                    <div class="text-caption text-grey-6 font-size-10">
                      {{ item.session ? `เริ่ม ${item.startedAtTime}` : 'จุดสั่งกลับบ้าน' }}
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div
                    class="text-weight-bolder text-caption"
                    :class="item.isPaid ? 'text-purple-9' : 'text-primary'"
                  >
                    {{ item.session ? formatPrice(item.totalAmount) : 'พร้อมรับ' }}
                  </div>
                  <div
                    class="text-caption font-size-10"
                    :class="
                      item.isPaid
                        ? 'text-purple-9 text-weight-bold'
                        : item.isReadyToPay
                          ? 'text-positive text-weight-bold'
                          : 'text-grey-6'
                    "
                  >
                    {{ item.statusBadge.label }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section B: Main Dining Hall (Cinema Seat Map Style) -->
      <div class="dining-hall-section">
        <div class="hall-header row items-center justify-between q-mb-md">
          <div class="row items-center q-gutter-x-xs">
            <q-icon name="table_restaurant" size="18px" color="primary" />
            <span class="hall-title">โซนโต๊ะอาหารภายในร้าน (Dining Hall)</span>
            <span class="hall-count text-caption text-grey-6">
              ({{ activeDineInCount }}/{{ dineInTables.length }} โต๊ะไม่ว่าง)
            </span>
          </div>
        </div>

        <!-- Seating Map Grid -->
        <div class="cinema-tables-grid">
          <div
            v-for="item in dineInTables"
            :key="item.session?.id || item.table.id"
            class="dining-unit"
            :class="[
              `dining-unit--${item.tableStatus.toLowerCase().replace(/_/g, '-')}`,
              {
                'dining-unit--dimmed': isDimmed(item),
                'dining-unit--selected': selectedItem?.table.id === item.table.id,
              },
            ]"
            @click="handleSelectTable(item)"
          >
            <!-- Top Integrated Seat Backs -->
            <div class="chairs-row chairs-row--top">
              <span class="chair-cushion"></span>
              <span class="chair-cushion"></span>
            </div>

            <!-- Table Body Core -->
            <div class="table-surface">
              <!-- Top Row: Table Name & Status Badge -->
              <div class="row items-center justify-between no-wrap table-surface-header">
                <div class="table-number-text">
                  {{ item.table.name }}
                </div>

                <div class="table-status-pill-badge" :class="item.statusBadge.badgeClass">
                  <span
                    v-if="item.statusBadge.isPulse"
                    class="live-status-dot"
                    :class="`live-status-dot--${item.statusBadge.dotColor}`"
                  ></span>
                  <span>{{ item.session ? item.statusBadge.label : 'ว่าง' }}</span>
                </div>
              </div>

              <!-- Center Body Content -->
              <div class="table-surface-body">
                <template v-if="item.session">
                  <!-- Customer name & Time -->
                  <div class="row items-center justify-between text-caption q-mb-xs">
                    <div v-if="item.session.customer_name" class="table-customer-chip ellipsis">
                      <q-icon name="person" size="12px" class="q-mr-xs" />
                      <span class="ellipsis">{{ item.session.customer_name }}</span>
                    </div>
                    <div v-else class="text-caption text-grey-6 row items-center">
                      <q-icon name="schedule" size="11px" class="q-mr-xs" />
                      <span>{{ item.startedAtTime }}</span>
                    </div>
                    <span class="text-caption text-grey-7 text-weight-medium">
                      {{ item.elapsedTime }}
                    </span>
                  </div>

                  <!-- Kitchen Progress Bar -->
                  <div v-if="item.orderCount > 0" class="table-progress-section">
                    <div class="row items-center justify-between font-size-11 q-mb-xs">
                      <span :class="item.kitchenTextColor" class="text-weight-bold">
                        {{ item.servedOrdersCount }}/{{ item.orderCount }} เสิร์ฟแล้ว
                      </span>
                      <span class="text-grey-6">{{ item.totalItemCount }} จาน</span>
                    </div>
                    <div class="table-mini-progress-bar">
                      <div
                        class="table-mini-progress-fill"
                        :class="item.progressBarColorClass"
                        :style="{ width: `${item.servingPercentage}%` }"
                      ></div>
                    </div>
                  </div>
                  <div
                    v-else
                    class="text-caption text-cyan-9 bg-cyan-1 q-px-xs border-radius-sm text-center font-size-11"
                  >
                    รอลูกค้าสั่งอาหาร
                  </div>
                </template>

                <template v-else>
                  <!-- Clean Available Table Center -->
                  <div class="available-center-box column items-center justify-center">
                    <div class="available-icon-bubble">
                      <q-icon name="qr_code_2" size="20px" />
                    </div>
                    <span class="available-hint-text">แตะเพื่อเปิดบิล / ดู QR</span>
                  </div>
                </template>
              </div>

              <!-- Bottom Row: Price & Action Icon Hint -->
              <div class="row items-center justify-between no-wrap table-surface-footer">
                <div v-if="item.session" class="table-amount-wrap">
                  <span class="currency">฿</span>
                  <span class="amount-number">{{
                    formatPrice(item.totalAmount).replace('฿', '')
                  }}</span>
                </div>
                <div v-else class="table-avail-prompt text-caption text-grey-6 font-size-11">
                  พร้อมรับลูกค้า
                </div>

                <div
                  class="table-action-icon-pill"
                  :class="item.session ? 'bg-primary-soft text-primary' : 'bg-grey-2 text-grey-7'"
                >
                  <q-icon
                    :name="
                      item.isPaid
                        ? 'cleaning_services'
                        : item.isReadyToPay
                          ? 'payments'
                          : item.session
                            ? 'receipt_long'
                            : 'open_in_new'
                    "
                    size="13px"
                  />
                </div>
              </div>
            </div>

            <!-- Bottom Integrated Seat Backs -->
            <div class="chairs-row chairs-row--bottom">
              <span class="chair-cushion"></span>
              <span class="chair-cushion"></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Table Action Sheet / Inspector Dialog -->
    <q-dialog v-model="showActionSheet" position="bottom" class="table-action-dialog">
      <q-card v-if="selectedItem" class="action-sheet-card border-radius-top-xl q-pa-md">
        <!-- Sheet Header Bar -->
        <div class="sheet-drag-handle q-mx-auto q-mb-sm"></div>

        <div class="row items-start justify-between q-mb-md">
          <div class="row items-center q-gutter-x-sm">
            <div class="table-sheet-avatar" :class="selectedItem.avatarClass">
              <q-icon
                :name="selectedItem.isTakeaway ? 'shopping_bag' : 'table_restaurant'"
                size="24px"
              />
            </div>
            <div>
              <div class="row items-center q-gutter-x-xs">
                <span class="text-h6 text-weight-bold">
                  {{
                    selectedItem.isTakeaway && selectedItem.session?.customer_name
                      ? `สั่งกลับบ้าน (${selectedItem.session.customer_name})`
                      : selectedItem.table.name
                  }}
                </span>
                <q-badge
                  v-if="selectedItem.isTakeaway"
                  color="orange-9"
                  rounded
                  class="q-px-xs text-caption"
                >
                  กลับบ้าน
                </q-badge>
                <q-badge
                  v-if="selectedItem.session?.customer_name"
                  color="amber-9"
                  rounded
                  class="q-px-xs text-caption text-weight-bold"
                >
                  {{ selectedItem.session.customer_name }}
                </q-badge>
              </div>

              <div class="text-caption text-grey-7 q-mt-xs">
                <template v-if="selectedItem.session">
                  <q-icon name="schedule" size="12px" class="q-mr-xs" />
                  <span
                    >เริ่ม {{ selectedItem.startedAtTime }} • นั่งมาแล้ว
                    {{ selectedItem.elapsedTime }}</span
                  >
                </template>
                <template v-else>
                  <span class="text-positive text-weight-medium">โต๊ะว่าง พร้อมรับลูกค้า</span>
                </template>
              </div>
            </div>
          </div>

          <!-- Status Badge -->
          <div class="table-main-status-badge" :class="selectedItem.statusBadge.badgeClass">
            <span
              v-if="selectedItem.statusBadge.isPulse"
              class="live-status-dot"
              :class="`live-status-dot--${selectedItem.statusBadge.dotColor}`"
            ></span>
            <q-icon :name="selectedItem.statusBadge.icon" size="14px" class="q-mr-xs" />
            <span>{{ selectedItem.statusBadge.label }}</span>
          </div>
        </div>

        <!-- Session Content Body -->
        <div v-if="selectedItem.session" class="sheet-body-content q-mb-md">
          <!-- Kitchen Status & Summary Row -->
          <div class="sheet-info-box q-pa-sm q-mb-sm">
            <div class="row items-center justify-between text-caption q-mb-xs">
              <div class="row items-center">
                <q-icon
                  :name="selectedItem.kitchenIcon"
                  size="16px"
                  :class="selectedItem.kitchenIconColor"
                  class="q-mr-xs"
                />
                <span class="text-weight-bold" :class="selectedItem.kitchenTextColor">
                  {{ selectedItem.kitchenText }}
                </span>
              </div>
              <span v-if="selectedItem.orderCount > 0" class="text-grey-7">
                {{ selectedItem.servedOrdersCount }}/{{ selectedItem.orderCount }} คิว ({{
                  selectedItem.totalItemCount
                }}
                จาน)
              </span>
            </div>

            <!-- Mini Progress Bar -->
            <div v-if="selectedItem.orderCount > 0" class="progress-bar-track">
              <div
                class="progress-bar-fill"
                :class="selectedItem.progressBarColorClass"
                :style="{ width: `${selectedItem.servingPercentage}%` }"
              ></div>
            </div>
          </div>

          <!-- Total Bill Amount Card -->
          <div
            class="sheet-amount-card q-pa-sm row items-center justify-between"
            :class="{
              'sheet-amount-card--ready-pay': selectedItem.tableStatus === 'READY_TO_PAY',
              'sheet-amount-card--paid': selectedItem.tableStatus === 'PAID',
            }"
          >
            <div>
              <div class="text-caption text-grey-7">
                {{ selectedItem.isPaid ? 'ยอดชำระแล้ว' : 'ยอดรวมบิลปัจจุบัน' }}
              </div>
              <div v-if="selectedItem.isPaid" class="text-caption text-positive font-size-11">
                <q-icon name="check_circle" size="12px" class="q-mr-xs" /> ชำระเงินเรียบร้อย
              </div>
            </div>
            <div
              class="text-h5 text-weight-bolder"
              :class="
                selectedItem.isPaid
                  ? 'text-purple-9'
                  : selectedItem.isReadyToPay
                    ? 'text-green-8'
                    : 'text-primary'
              "
            >
              {{ formatPrice(selectedItem.totalAmount) }}
            </div>
          </div>
        </div>

        <!-- Empty Table Body -->
        <div v-else class="sheet-empty-body q-pa-md text-center q-mb-md">
          <q-icon name="chair_alt" size="36px" color="grey-6" class="q-mb-xs" />
          <div class="text-subtitle2 text-weight-bold text-grey-8">โต๊ะว่าง พร้อมให้บริการ</div>
          <div class="text-caption text-grey-6">
            สแกน QR เพื่อสั่งอาหาร หรือกดเปิดหน้าสั่งอาหารให้ลูกค้าได้ทันที
          </div>
        </div>

        <!-- Quick Action Buttons -->
        <div class="sheet-actions-row">
          <!-- 1. PAID Actions -->
          <div v-if="selectedItem.tableStatus === 'PAID'" class="row q-gutter-sm">
            <q-btn
              unelevated
              no-caps
              color="purple-8"
              class="col action-main-btn"
              @click="triggerClearTable(selectedItem)"
              :loading="clearingSessionId === selectedItem.session?.id"
            >
              <q-icon name="cleaning_services" size="18px" class="q-mr-xs" />
              <span>เคลียร์โต๊ะ (เปิดโต๊ะใหม่)</span>
            </q-btn>
            <q-btn
              outline
              no-caps
              color="grey-8"
              class="action-secondary-btn"
              @click="triggerOpenBill(selectedItem.session?.id)"
            >
              <q-icon name="receipt" size="16px" class="q-mr-xs" />
              <span>ใบเสร็จ</span>
            </q-btn>
          </div>

          <!-- 2. READY_TO_PAY Actions -->
          <div v-else-if="selectedItem.tableStatus === 'READY_TO_PAY'" class="row q-gutter-sm">
            <q-btn
              unelevated
              no-caps
              color="positive"
              class="col action-main-btn action-main-btn--ready-pay"
              @click="triggerOpenBill(selectedItem.session?.id)"
            >
              <q-icon name="payments" size="18px" class="q-mr-xs" />
              <span>เช็กบิล / รับเงิน ({{ formatPrice(selectedItem.totalAmount) }})</span>
              <q-icon name="arrow_forward" size="14px" class="q-ml-xs" />
            </q-btn>
            <q-btn
              flat
              round
              dense
              color="primary"
              icon="swap_horiz"
              class="action-icon-btn"
              @click="triggerTransferTable(selectedItem)"
            >
              <q-tooltip>ขอย้ายโต๊ะ</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              color="grey-7"
              icon="qr_code_2"
              class="action-icon-btn"
              @click="triggerShowQR(selectedItem.table)"
            >
              <q-tooltip>ดู QR ประจำโต๊ะ</q-tooltip>
            </q-btn>
          </div>

          <!-- 3. SEATED_NO_ORDER Actions -->
          <div v-else-if="selectedItem.tableStatus === 'SEATED_NO_ORDER'" class="row q-gutter-sm">
            <q-btn
              unelevated
              no-caps
              color="negative"
              class="col action-main-btn"
              @click="triggerCancelSession(selectedItem)"
              :loading="cancellingSessionId === selectedItem.session?.id"
            >
              <q-icon name="person_remove" size="18px" class="q-mr-xs" />
              <span>ยกเลิกเซสชัน (คืนโต๊ะว่าง)</span>
            </q-btn>
            <q-btn
              outline
              no-caps
              color="primary"
              class="action-secondary-btn"
              @click="triggerOpenBill(selectedItem.session?.id)"
            >
              <q-icon name="receipt" size="16px" class="q-mr-xs" />
              <span>ดูบิล</span>
            </q-btn>
            <q-btn
              flat
              round
              dense
              color="primary"
              icon="swap_horiz"
              class="action-icon-btn"
              @click="triggerTransferTable(selectedItem)"
            >
              <q-tooltip>ขอย้ายโต๊ะ</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              color="grey-7"
              icon="qr_code_2"
              class="action-icon-btn"
              @click="triggerShowQR(selectedItem.table)"
            >
              <q-tooltip>ดู QR ประจำโต๊ะ</q-tooltip>
            </q-btn>
          </div>

          <!-- 4. COOKING Actions -->
          <div v-else-if="selectedItem.session" class="row q-gutter-sm">
            <q-btn
              unelevated
              no-caps
              color="primary"
              class="col action-main-btn"
              @click="triggerOpenBill(selectedItem.session?.id)"
            >
              <q-icon name="receipt" size="18px" class="q-mr-xs" />
              <span>ดูบิล / จัดการบิล</span>
              <q-icon name="arrow_forward" size="14px" class="q-ml-xs" />
            </q-btn>
            <q-btn
              flat
              round
              dense
              color="primary"
              icon="swap_horiz"
              class="action-icon-btn"
              @click="triggerTransferTable(selectedItem)"
            >
              <q-tooltip>ขอย้ายโต๊ะ</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              dense
              color="grey-7"
              icon="qr_code_2"
              class="action-icon-btn"
              @click="triggerShowQR(selectedItem.table)"
            >
              <q-tooltip>ดู QR ประจำโต๊ะ</q-tooltip>
            </q-btn>
          </div>

          <!-- 5. AVAILABLE TABLE Actions -->
          <div v-else class="row q-gutter-sm">
            <q-btn
              outline
              no-caps
              color="primary"
              class="col action-secondary-btn"
              @click="triggerShowQR(selectedItem.table)"
            >
              <q-icon name="qr_code_2" size="18px" class="q-mr-xs" />
              <span>ดู QR โต๊ะ</span>
            </q-btn>
            <q-btn
              unelevated
              no-caps
              color="secondary"
              class="col action-secondary-btn"
              @click="triggerOpenCustomerLink(selectedItem.table)"
            >
              <q-icon name="open_in_new" size="16px" class="q-mr-xs" />
              <span>เปิดสั่งอาหาร</span>
            </q-btn>
          </div>
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { formatPrice } from 'src/utils/formatters';
import type { TableWithQR } from 'src/types/database';
import type { TableCardItem } from 'src/types/tableCard';

const props = defineProps<{
  items: TableCardItem[];
  selectedFilter: string;
  searchQuery: string;
  clearingSessionId?: string | null;
  cancellingSessionId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update-filter', filter: string): void;
  (e: 'open-bill', sessionId: string): void;
  (e: 'clear-table', item: TableCardItem): void;
  (e: 'cancel-session', item: TableCardItem): void;
  (e: 'transfer-table', item: TableCardItem): void;
  (e: 'show-qr', table: TableWithQR): void;
  (e: 'open-customer-link', table: TableWithQR): void;
}>();

const showActionSheet = ref(false);
const selectedItem = ref<TableCardItem | null>(null);

// Split tables into Dine-in vs Takeaway
const dineInTables = computed(() => props.items.filter((item) => !item.isTakeaway));
const takeawayCards = computed(() => props.items.filter((item) => item.isTakeaway));

const activeDineInCount = computed(
  () => dineInTables.value.filter((i) => i.session !== null).length,
);
const activeTakeawayCount = computed(
  () => takeawayCards.value.filter((i) => i.session !== null).length,
);

function isDimmed(item: TableCardItem): boolean {
  if (props.selectedFilter !== 'ALL' && item.tableStatus !== props.selectedFilter) {
    return true;
  }
  if (props.searchQuery.trim()) {
    const q = props.searchQuery.trim().toLowerCase();
    const matchName = item.table.name.toLowerCase().includes(q);
    const matchCustomer = item.session?.customer_name?.toLowerCase().includes(q);
    if (!matchName && !matchCustomer) return true;
  }
  return false;
}

function handleSelectTable(item: TableCardItem) {
  selectedItem.value = item;
  showActionSheet.value = true;
}

function triggerOpenBill(sessionId?: string) {
  if (!sessionId) return;
  showActionSheet.value = false;
  emit('open-bill', sessionId);
}

function triggerClearTable(item: TableCardItem) {
  showActionSheet.value = false;
  emit('clear-table', item);
}

function triggerCancelSession(item: TableCardItem) {
  showActionSheet.value = false;
  emit('cancel-session', item);
}

function triggerTransferTable(item: TableCardItem) {
  showActionSheet.value = false;
  emit('transfer-table', item);
}

function triggerShowQR(table: TableWithQR) {
  showActionSheet.value = false;
  emit('show-qr', table);
}

function triggerOpenCustomerLink(table: TableWithQR) {
  showActionSheet.value = false;
  emit('open-customer-link', table);
}
</script>

<style scoped>
.dining-floor-plan {
  width: 100%;
  user-select: none;
}

/* =========================================================
   Floor Plan Surface
   ========================================================= */
.floor-plan-surface {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-xl, 20px);
  padding: 20px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
}

/* Takeaway Bay */
.takeaway-bay-section {
  background: #fff;
  border: 1px dashed #fdba74;
  border-radius: var(--radius-lg, 16px);
  padding: 14px 16px;
}

.bay-title {
  font-weight: 700;
  font-size: 0.88rem;
  color: #c2410c;
}

.takeaway-cards-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.takeaway-seat-box {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: var(--radius-md, 12px);
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.takeaway-seat-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.15);
  border-color: #f97316;
}

.takeaway-icon-pill {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm, 6px);
  background: #ffedd5;
  color: #ea580c;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Dining Hall Section */
.hall-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-text-primary, #0f172a);
}

/* =========================================================
   Cinema Tables Grid & Units (Chairs + Surface)
   ========================================================= */
.cinema-tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
  gap: 18px 14px;
  padding: 8px 0;
}

@media (max-width: 600px) {
  .cinema-tables-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px 10px;
  }
}

.dining-unit {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.dining-unit:hover {
  transform: translateY(-4px) scale(1.02);
}

.dining-unit:hover .table-surface {
  box-shadow:
    0 12px 24px -4px rgba(0, 0, 0, 0.1),
    0 4px 8px -2px rgba(0, 0, 0, 0.06);
}

.dining-unit--dimmed,
.seat-dimmed {
  opacity: 0.25;
  filter: grayscale(0.8);
  transform: scale(0.96);
}

.dining-unit--selected .table-surface {
  box-shadow:
    0 0 0 3px var(--color-primary, #e05836),
    0 8px 20px rgba(224, 88, 54, 0.25);
}

/* Chair Cushions (Top & Bottom) */
.chairs-row {
  display: flex;
  justify-content: center;
  gap: 20px;
  width: 100%;
  z-index: 1;
}

.chairs-row--top {
  margin-bottom: -5px;
}
.chairs-row--bottom {
  margin-top: -5px;
}

.chair-cushion {
  width: 34px;
  height: 8px;
  border-radius: 4px 4px 0 0;
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
  transition: all 0.2s ease;
}

.chairs-row--bottom .chair-cushion {
  border-radius: 0 0 4px 4px;
}

/* Dining Unit Chair Colors by Status */
.dining-unit--ready-to-pay .chair-cushion {
  background: #bbf7d0;
  border-color: #4ade80;
}
.dining-unit--cooking .chair-cushion {
  background: #fde68a;
  border-color: #f59e0b;
}
.dining-unit--paid .chair-cushion {
  background: #e9d5ff;
  border-color: #c084fc;
}
.dining-unit--seated-no-order .chair-cushion {
  background: #cffafe;
  border-color: #22d3ee;
}
.dining-unit--available .chair-cushion {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

/* Table Surface Core */
.table-surface {
  position: relative;
  width: 100%;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 10px 12px;
  min-height: 114px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  z-index: 2;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Status Variations for Table Surface */
.dining-unit--ready-to-pay .table-surface {
  border-color: #22c55e;
  background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
  box-shadow: 0 4px 14px rgba(34, 197, 94, 0.16);
}

.dining-unit--cooking .table-surface {
  border-color: #f59e0b;
  background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%);
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.15);
}

.dining-unit--paid .table-surface {
  border-color: #a855f7;
  background: linear-gradient(180deg, #ffffff 0%, #faf5ff 100%);
  box-shadow: 0 4px 14px rgba(168, 85, 247, 0.15);
}

.dining-unit--seated-no-order .table-surface {
  border-color: #06b6d4;
  background: linear-gradient(180deg, #ffffff 0%, #ecfeff 100%);
  box-shadow: 0 4px 14px rgba(6, 182, 212, 0.15);
}

.dining-unit--available .table-surface {
  border-color: #e2e8f0;
  background: #ffffff;
}

.dining-unit--available:hover .table-surface {
  border-color: var(--color-primary, #e05836);
  background: #fffbf9;
}

/* Table Surface Header */
.table-number-text {
  font-weight: 800;
  font-size: 0.95rem;
  color: #0f172a;
  letter-spacing: -0.2px;
}

.table-status-pill-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: var(--radius-pill, 9999px);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2;
}

/* Table Body Area */
.table-surface-body {
  padding: 6px 0;
}

.table-customer-chip {
  max-width: 85px;
  background: #fef3c7;
  color: #92400e;
  border-radius: var(--radius-pill, 9999px);
  padding: 1px 6px;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
}

/* Mini Progress Bar */
.table-progress-section {
  width: 100%;
}

.table-mini-progress-bar {
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.table-mini-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Available Table Center */
.available-center-box {
  padding: 4px 0;
}

.available-icon-bubble {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
  transition: all 0.2s ease;
}

.dining-unit--available:hover .available-icon-bubble {
  background: var(--color-primary-soft, #ffedd5);
  color: var(--color-primary, #e05836);
  transform: scale(1.08);
}

.available-hint-text {
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
}

.dining-unit--available:hover .available-hint-text {
  color: var(--color-primary, #e05836);
}

/* Table Footer */
.table-amount-wrap {
  font-weight: 800;
  font-size: 0.96rem;
  color: #0f172a;
}

.dining-unit--ready-to-pay .table-amount-wrap {
  color: #16a34a;
}
.dining-unit--cooking .table-amount-wrap {
  color: #d97706;
}
.dining-unit--paid .table-amount-wrap {
  color: #9333ea;
}

.table-amount-wrap .currency {
  font-size: 0.75rem;
  margin-right: 1px;
}

.table-action-icon-pill {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.dining-unit:hover .table-action-icon-pill {
  transform: scale(1.1);
}

/* =========================================================
   Action Sheet Card & Dialog
   ========================================================= */
.action-sheet-card {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  background: #ffffff;
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.15);
}

.border-radius-top-xl {
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
}

.sheet-drag-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #cbd5e1;
}

.table-sheet-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md, 12px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sheet-info-box {
  background: var(--color-surface-subtle, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 10px);
}

.sheet-amount-card {
  background: linear-gradient(135deg, #ffffff 0%, #fff7f2 100%);
  border: 1px solid var(--color-primary-tint, #ffedd5);
  border-radius: var(--radius-md, 10px);
}

.sheet-amount-card--ready-pay {
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
  border-color: #bbf7d0;
}

.sheet-amount-card--paid {
  background: linear-gradient(135deg, #ffffff 0%, #faf5ff 100%);
  border-color: #e9d5ff;
}

.progress-bar-track {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.action-main-btn {
  font-weight: 700;
  border-radius: var(--radius-pill, 9999px);
  padding: 10px 16px;
}

.action-secondary-btn {
  font-weight: 600;
  border-radius: var(--radius-pill, 9999px);
  padding: 8px 14px;
}

.action-icon-btn {
  border-radius: 50%;
  border: 1px solid var(--color-border, #cbd5e1);
}

.live-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 4px;
}

.live-status-dot--green {
  background-color: #16a34a;
}
.live-status-dot--amber {
  background-color: #f59e0b;
}
.live-status-dot--purple {
  background-color: #9333ea;
}
.live-status-dot--cyan {
  background-color: #06b6d4;
}
.live-status-dot--grey {
  background-color: #94a3b8;
}
</style>
