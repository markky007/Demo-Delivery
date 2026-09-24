<template>
  <div class="dining-floor-plan">
    <!-- Floor Plan Main Area -->
    <div class="floor-plan-surface">
      <!-- Section A: Takeaway Pick-up Bay (if any takeaway tables exist) -->
      <div v-if="takeawayCards.length > 0" class="takeaway-bay-section q-mb-lg">
        <div class="bay-header row items-center justify-between q-mb-sm">
          <div class="row items-center q-gutter-x-xs">
            <q-icon name="shopping_bag" size="18px" class="text-orange-9" />
            <span class="bay-title">จุดบริการสั่งกลับบ้าน (Takeaway Station)</span>
            <span class="bay-count-badge font-tabular"> {{ activeTakeawayCount }} ออเดอร์ </span>
          </div>
          <span class="text-caption text-muted">จุดรับอาหารหน้าร้าน</span>
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
                    <div class="text-weight-bold text-caption ellipsis text-ink">
                      {{ item.session?.customer_name || item.table.name }}
                    </div>
                    <div class="text-caption text-muted font-size-10">
                      {{ item.session ? `เริ่ม ${item.startedAtTime}` : 'จุดสั่งกลับบ้าน' }}
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div
                    class="text-weight-bolder text-caption font-tabular"
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
                          : 'text-muted'
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
            <span class="hall-count text-caption text-muted font-tabular">
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
                <div class="table-number-text text-ink">
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
                    <div v-else class="text-caption text-muted row items-center">
                      <q-icon name="schedule" size="11px" class="q-mr-xs" />
                      <span>{{ item.startedAtTime }}</span>
                    </div>
                    <span class="text-caption text-muted font-tabular">
                      {{ item.elapsedTime }}
                    </span>
                  </div>

                  <!-- Kitchen Progress Bar -->
                  <div v-if="item.orderCount > 0" class="table-progress-section">
                    <div class="row items-center justify-between font-size-11 q-mb-xs">
                      <span :class="item.kitchenTextColor" class="text-weight-bold">
                        {{ item.servedOrdersCount }}/{{ item.orderCount }} เสิร์ฟแล้ว
                      </span>
                      <span class="text-muted font-tabular">{{ item.totalItemCount }} จาน</span>
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
                    class="table-waiting-banner row items-center justify-center q-gutter-x-xs font-size-11"
                  >
                    <q-icon name="touch_app" size="13px" />
                    <span>รอลูกค้าสั่งอาหาร</span>
                  </div>
                </template>

                <template v-else>
                  <!-- Clean Available Table Center -->
                  <div class="available-center-box column items-center justify-center">
                    <div class="available-icon-bubble">
                      <q-icon name="qr_code_2" size="20px" />
                    </div>
                    <span class="available-hint-text">แตะเปิดบิล / ดู QR</span>
                  </div>
                </template>
              </div>

              <!-- Bottom Row: Price & Action Icon Hint -->
              <div class="row items-center justify-between no-wrap table-surface-footer">
                <div v-if="item.session" class="table-amount-wrap">
                  <span class="currency">฿</span>
                  <span class="amount-number font-tabular">{{
                    formatPrice(item.totalAmount).replace('฿', '')
                  }}</span>
                </div>
                <div v-else class="table-avail-prompt text-caption text-muted font-size-11">
                  พร้อมรับลูกค้า
                </div>

                <div
                  class="table-action-icon-pill"
                  :class="
                    item.session ? 'bg-primary-soft text-primary' : 'bg-surface-alt text-muted'
                  "
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

    <!-- Quick Table Action Sheet / Inspector Dialog (Apple Bottom Sheet Style) -->
    <q-dialog v-model="showActionSheet" position="bottom" class="table-action-dialog">
      <q-card v-if="selectedItem" class="action-sheet-card q-pa-md">
        <!-- Drag Handle Indicator -->
        <div class="sheet-drag-handle q-mx-auto q-mb-sm"></div>

        <div class="row items-start justify-between q-mb-md">
          <div class="row items-center q-gutter-x-sm">
            <div class="table-sheet-avatar" :class="selectedItem.avatarClass">
              <q-icon
                :name="selectedItem.isTakeaway ? 'shopping_bag' : 'table_restaurant'"
                size="22px"
              />
            </div>
            <div>
              <div class="row items-center q-gutter-x-xs">
                <span class="text-h6 text-weight-bold text-ink">
                  {{
                    selectedItem.isTakeaway && selectedItem.session?.customer_name
                      ? `สั่งกลับบ้าน (${selectedItem.session.customer_name})`
                      : selectedItem.table.name
                  }}
                </span>
                <span v-if="selectedItem.isTakeaway" class="apple-tag apple-tag--orange">
                  กลับบ้าน
                </span>
                <span v-if="selectedItem.session?.customer_name" class="apple-customer-pill">
                  {{ selectedItem.session.customer_name }}
                </span>
              </div>

              <div class="text-caption text-muted q-mt-xs">
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
          <div class="apple-status-pill" :class="selectedItem.statusBadge.badgeClass">
            <span
              v-if="selectedItem.statusBadge.isPulse"
              class="live-status-dot"
              :class="`live-status-dot--${selectedItem.statusBadge.dotColor}`"
            ></span>
            <q-icon :name="selectedItem.statusBadge.icon" size="13px" class="q-mr-xs" />
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
              <span v-if="selectedItem.orderCount > 0" class="text-muted font-tabular">
                {{ selectedItem.servedOrdersCount }}/{{ selectedItem.orderCount }} คิว ({{
                  selectedItem.totalItemCount
                }}
                จาน)
              </span>
            </div>

            <!-- Mini Progress Bar -->
            <div v-if="selectedItem.orderCount > 0" class="apple-progress-track">
              <div
                class="apple-progress-fill"
                :class="selectedItem.progressBarColorClass"
                :style="{ width: `${selectedItem.servingPercentage}%` }"
              ></div>
            </div>
          </div>

          <!-- Total Bill Amount Card -->
          <div
            class="sheet-amount-card q-pa-sm row items-center justify-between"
            :class="{
              'sheet-amount-card--ready': selectedItem.tableStatus === 'READY_TO_PAY',
              'sheet-amount-card--paid': selectedItem.tableStatus === 'PAID',
            }"
          >
            <div>
              <div class="text-caption text-muted">
                {{ selectedItem.isPaid ? 'ยอดชำระแล้ว' : 'ยอดรวมบิลปัจจุบัน' }}
              </div>
              <div
                v-if="selectedItem.isPaid"
                class="text-caption text-positive font-size-11 row items-center q-mt-xs"
              >
                <q-icon name="check_circle" size="12px" class="q-mr-xs" />
                <span>ชำระเงินเรียบร้อย</span>
              </div>
            </div>
            <div
              class="text-h5 text-weight-bolder font-tabular"
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
          <q-icon name="chair_alt" size="32px" class="text-muted q-mb-xs" />
          <div class="text-subtitle2 text-weight-bold text-ink">โต๊ะว่าง พร้อมให้บริการ</div>
          <div class="text-caption text-muted">
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
              class="col apple-pill-btn apple-pill-btn--purple"
              @click="triggerClearTable(selectedItem)"
              :loading="clearingSessionId === selectedItem.session?.id"
            >
              <q-icon name="cleaning_services" size="17px" class="q-mr-xs" />
              <span>เคลียร์โต๊ะ (เปิดโต๊ะใหม่)</span>
            </q-btn>
            <q-btn
              unelevated
              no-caps
              class="apple-pill-btn apple-pill-btn--secondary"
              @click="triggerOpenBill(selectedItem.session?.id)"
            >
              <q-icon name="receipt" size="16px" class="q-mr-xs" />
              <span>ใบเสร็จ</span>
            </q-btn>
          </div>

          <!-- 2. READY_TO_PAY Actions -->
          <div
            v-else-if="selectedItem.tableStatus === 'READY_TO_PAY'"
            class="row q-gutter-sm items-center"
          >
            <q-btn
              unelevated
              no-caps
              class="col apple-pill-btn apple-pill-btn--green"
              @click="triggerOpenBill(selectedItem.session?.id)"
            >
              <q-icon name="payments" size="17px" class="q-mr-xs" />
              <span>เช็กบิล / รับเงิน ({{ formatPrice(selectedItem.totalAmount) }})</span>
              <q-icon name="arrow_forward" size="14px" class="q-ml-xs" />
            </q-btn>
            <q-btn
              flat
              round
              dense
              color="grey-7"
              icon="swap_horiz"
              class="apple-icon-btn"
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
              class="apple-icon-btn"
              @click="triggerShowQR(selectedItem.table)"
            >
              <q-tooltip>ดู QR ประจำโต๊ะ</q-tooltip>
            </q-btn>
          </div>

          <!-- 3. SEATED_NO_ORDER Actions -->
          <div
            v-else-if="selectedItem.tableStatus === 'SEATED_NO_ORDER'"
            class="row q-gutter-sm items-center"
          >
            <q-btn
              unelevated
              no-caps
              class="col apple-pill-btn apple-pill-btn--negative"
              @click="triggerCancelSession(selectedItem)"
              :loading="cancellingSessionId === selectedItem.session?.id"
            >
              <q-icon name="person_remove" size="17px" class="q-mr-xs" />
              <span>ยกเลิกเซสชัน (คืนโต๊ะว่าง)</span>
            </q-btn>
            <q-btn
              unelevated
              no-caps
              class="apple-pill-btn apple-pill-btn--secondary"
              @click="triggerOpenBill(selectedItem.session?.id)"
            >
              <q-icon name="receipt" size="16px" class="q-mr-xs" />
              <span>ดูบิล</span>
            </q-btn>
            <q-btn
              flat
              round
              dense
              color="grey-7"
              icon="swap_horiz"
              class="apple-icon-btn"
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
              class="apple-icon-btn"
              @click="triggerShowQR(selectedItem.table)"
            >
              <q-tooltip>ดู QR ประจำโต๊ะ</q-tooltip>
            </q-btn>
          </div>

          <!-- 4. COOKING Actions -->
          <div v-else-if="selectedItem.session" class="row q-gutter-sm items-center">
            <q-btn
              unelevated
              no-caps
              class="col apple-pill-btn apple-pill-btn--primary"
              @click="triggerOpenBill(selectedItem.session?.id)"
            >
              <q-icon name="receipt" size="17px" class="q-mr-xs" />
              <span>ดูบิล / จัดการบิล</span>
              <q-icon name="arrow_forward" size="14px" class="q-ml-xs" />
            </q-btn>
            <q-btn
              flat
              round
              dense
              color="grey-7"
              icon="swap_horiz"
              class="apple-icon-btn"
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
              class="apple-icon-btn"
              @click="triggerShowQR(selectedItem.table)"
            >
              <q-tooltip>ดู QR ประจำโต๊ะ</q-tooltip>
            </q-btn>
          </div>

          <!-- 5. AVAILABLE TABLE Actions -->
          <div v-else class="row q-gutter-sm">
            <q-btn
              unelevated
              no-caps
              class="col apple-pill-btn apple-pill-btn--secondary"
              @click="triggerShowQR(selectedItem.table)"
            >
              <q-icon name="qr_code_2" size="17px" class="q-mr-xs" />
              <span>ดู QR โต๊ะ</span>
            </q-btn>
            <q-btn
              unelevated
              no-caps
              class="col apple-pill-btn apple-pill-btn--primary"
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

/* Floor Plan Surface */
.floor-plan-surface {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

/* Takeaway Bay */
.takeaway-bay-section {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
  padding: 14px 16px;
}

.bay-title {
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--color-ink, #1d1d1f);
}

.bay-count-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  background: rgba(255, 149, 0, 0.14);
  color: #b45309;
  padding: 2px 8px;
  border-radius: var(--radius-pill, 980px);
}

.takeaway-cards-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.takeaway-seat-box {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-lg, 18px);
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: rgba(0, 0, 0, 0.04) 0 2px 8px 0;
}

.takeaway-seat-box:hover {
  transform: translateY(-2px);
  box-shadow: rgba(0, 0, 0, 0.08) 2px 4px 12px 0px;
  border-color: #b0b0b8;
}

.takeaway-icon-pill {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm, 8px);
  background: rgba(255, 149, 0, 0.14);
  color: #ff9500;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Dining Hall Section */
.hall-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-ink, #1d1d1f);
}

.hall-count {
  font-size: 0.8125rem;
}

/* Cinema Tables Grid & Units */
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
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.dining-unit:hover {
  transform: translateY(-3px) scale(1.01);
}

.dining-unit:hover .table-surface {
  box-shadow: rgba(0, 0, 0, 0.12) 4px 8px 24px 0px;
  border-color: #b0b0b8;
}

.dining-unit--dimmed,
.seat-dimmed {
  opacity: 0.25;
  filter: grayscale(0.8);
  transform: scale(0.97);
}

.dining-unit--selected .table-surface {
  box-shadow:
    0 0 0 2px var(--color-primary, #0071e3),
    rgba(0, 113, 227, 0.15) 0 8px 20px;
  border-color: var(--color-primary, #0071e3);
}

/* Chair Cushions - Cinema Seat Map Style */
.chairs-row {
  display: flex;
  justify-content: center;
  gap: 20px;
  width: 100%;
  z-index: 1;
}

.chair-cushion {
  width: 30px;
  height: 9px;
  border-radius: 4px;
  background: var(--color-surface-alt, #e8e8ed);
  border: 1px solid var(--color-hairline, #d2d2d7);
  transition: all 0.2s ease;
}

.chairs-row--top .chair-cushion {
  border-bottom: none;
  border-radius: 6px 6px 0 0;
}

.chairs-row--bottom .chair-cushion {
  border-top: none;
  border-radius: 0 0 6px 6px;
}

.dining-unit--cooking .chair-cushion {
  background: #ff9500;
  border-color: #e08500;
}

.dining-unit--ready-to-pay .chair-cushion {
  background: #34c759;
  border-color: #28a745;
}

.dining-unit--paid .chair-cushion {
  background: #af52de;
  border-color: #9333ea;
}

.dining-unit--seated-no-order .chair-cushion {
  background: #0071e3;
  border-color: #0066cc;
}

.dining-unit--available .chair-cushion {
  background: var(--color-surface-alt, #e8e8ed);
  border-color: var(--color-hairline, #d2d2d7);
}

/* Table Surface */
.table-surface {
  width: 100%;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-lg, 18px);
  padding: 10px 12px;
  box-shadow: rgba(0, 0, 0, 0.08) 2px 4px 12px 0px;
  transition: all 0.2s ease;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.table-number-text {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-ink, #1d1d1f);
}

.table-status-pill-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-pill, 980px);
  display: inline-flex;
  align-items: center;
  line-height: 1.4;
  letter-spacing: 0;
}

.table-surface-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 6px 0;
}

.table-customer-chip {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-accent-warm, #b64400);
}

.table-mini-progress-bar {
  height: 4px;
  background: var(--color-surface-alt, #e8e8ed);
  border-radius: var(--radius-pill, 980px);
  overflow: hidden;
}

.table-mini-progress-fill {
  height: 100%;
  border-radius: var(--radius-pill, 980px);
}

.table-waiting-banner {
  background: rgba(0, 113, 227, 0.08);
  color: var(--color-primary-link, #0066cc);
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: var(--radius-sm, 8px);
  line-height: 1.4;
  letter-spacing: 0;
}

.available-center-box {
  padding: 6px 0;
}

.available-icon-bubble {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-surface-footer, #f5f5f7);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
  color: var(--color-muted, #6e6e73);
  transition: all 0.2s ease;
}

.dining-unit:hover .available-icon-bubble {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-ink, #1d1d1f);
}

.available-hint-text {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-muted, #6e6e73);
}

.table-surface-footer {
  padding-top: 6px;
  border-top: 1px solid var(--color-surface-footer, #f5f5f7);
}

.table-amount-wrap {
  display: flex;
  align-items: baseline;
  gap: 1px;
}

.table-amount-wrap .currency {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary, #0071e3);
}

.table-amount-wrap .amount-number {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-ink, #1d1d1f);
}

.table-action-icon-pill {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-primary-soft {
  background: rgba(0, 113, 227, 0.1);
}

.bg-surface-alt {
  background: var(--color-surface-alt, #e8e8ed);
}

/* Bottom Action Sheet (Apple Frosted Glass) */
.action-sheet-card {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  border-radius: 28px 28px 0 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: saturate(1.8) blur(20px);
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.12);
  border-top: 1px solid rgba(255, 255, 255, 0.8);
}

.sheet-drag-handle {
  width: 36px;
  height: 4px;
  border-radius: 980px;
  background: #d2d2d7;
}

.table-sheet-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sheet-info-box {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 14px;
}

.sheet-amount-card {
  background: var(--color-surface-footer, #f5f5f7);
  border: 1px solid transparent;
  border-radius: 14px;
  transition: all 0.2s ease;
}

.sheet-amount-card--ready {
  background: rgba(52, 199, 89, 0.08);
  border-color: rgba(52, 199, 89, 0.25);
}

.sheet-amount-card--paid {
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.25);
}

.sheet-empty-body {
  background: var(--color-surface-subtle, #fafafc);
  border-radius: 16px;
  border: 1px solid var(--color-hairline, #d2d2d7);
}

/* Apple Status Pills & Tags */
/* Apple Status Pills & Tags */
.apple-status-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: var(--radius-pill, 980px);
  line-height: 1.4;
  letter-spacing: 0;
}

.badge-status--available {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-muted, #6e6e73);
}

.badge-status--cooking {
  background: rgba(255, 149, 0, 0.16);
  color: var(--color-accent-warm, #b64400);
}

.badge-status--ready-pay {
  background: rgba(52, 199, 89, 0.16);
  color: #15803d;
}

.badge-status--paid {
  background: rgba(175, 82, 222, 0.16);
  color: #7c3aed;
}

.badge-status--seated {
  background: rgba(0, 113, 227, 0.12);
  color: var(--color-primary-link, #0066cc);
}

.live-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}

.live-status-dot--amber {
  background: #ff9500;
}

.live-status-dot--green {
  background: #34c759;
}

.live-status-dot--purple {
  background: #af52de;
}

.live-status-dot--cyan {
  background: #0071e3;
}

.apple-tag {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 980px;
}

.apple-tag--orange {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.apple-customer-pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 980px;
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.apple-progress-track {
  height: 4px;
  background: #e2e8f0;
  border-radius: 980px;
  overflow: hidden;
  margin-top: 4px;
}

.apple-progress-fill {
  height: 100%;
  border-radius: 980px;
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

.apple-pill-btn--green {
  background: #10b981 !important;
  color: #ffffff !important;
}

.apple-pill-btn--green:hover {
  background: #059669 !important;
}

.apple-pill-btn--purple {
  background: #8b5cf6 !important;
  color: #ffffff !important;
}

.apple-pill-btn--purple:hover {
  background: #7c3aed !important;
}

.apple-pill-btn--negative {
  background: rgba(239, 68, 68, 0.12) !important;
  color: #dc2626 !important;
}

.apple-pill-btn--negative:hover {
  background: rgba(239, 68, 68, 0.18) !important;
}

.apple-icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--color-hairline, #d2d2d7);
  background: #ffffff;
}

.font-tabular {
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-variant-numeric: tabular-nums;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

.font-size-10 {
  font-size: 0.625rem;
}

.font-size-11 {
  font-size: 0.6875rem;
}
</style>
