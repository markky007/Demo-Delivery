<template>
  <div
    class="apple-table-card"
    :class="[
      `apple-table-card--${item.tableStatus.toLowerCase().replace(/_/g, '-')}`,
      { 'apple-table-card--occupied': Boolean(item.session) },
    ]"
  >
    <!-- Card Header -->
    <div class="card-header row items-center justify-between no-wrap">
      <div class="row items-center no-wrap ellipsis q-mr-sm">
        <div class="table-avatar" :class="item.avatarClass">
          <q-icon :name="item.isTakeaway ? 'shopping_bag' : 'table_restaurant'" size="18px" />
        </div>
        <div class="q-ml-sm ellipsis">
          <div class="row items-center q-gutter-x-xs no-wrap">
            <span class="table-name ellipsis">{{
              item.isTakeaway && item.session?.customer_name
                ? `สั่งกลับบ้าน (${item.session.customer_name})`
                : item.table.name
            }}</span>
            <span
              v-if="item.isTakeaway && !item.session?.customer_name"
              class="apple-tag apple-tag--orange"
            >
              กลับบ้าน
            </span>
          </div>
          <div class="table-subtitle text-caption ellipsis">
            <template v-if="item.session">
              <q-icon name="schedule" size="12px" class="q-mr-xs" />
              <span>เริ่ม {{ item.startedAtTime }}</span>
              <span class="q-mx-xs">•</span>
              <span>{{ item.elapsedTime }}</span>
            </template>
            <template v-else>
              <span class="text-positive text-weight-medium">พร้อมรับลูกค้า</span>
            </template>
          </div>
        </div>
      </div>

      <!-- Status Pill Badge -->
      <div class="status-badge-wrap">
        <div class="apple-status-pill" :class="item.statusBadge.badgeClass">
          <span
            v-if="item.statusBadge.isPulse"
            class="live-status-dot"
            :class="`live-status-dot--${item.statusBadge.dotColor}`"
          ></span>
          <q-icon :name="item.statusBadge.icon" size="13px" class="q-mr-xs" />
          <span>{{ item.statusBadge.label }}</span>
        </div>
      </div>
    </div>

    <!-- Card Body: ACTIVE SESSION -->
    <div v-if="item.session" class="card-body column justify-between">
      <div>
        <!-- Order & Item count tags -->
        <div class="row items-center justify-between text-caption q-mb-sm">
          <div class="row items-center text-muted">
            <q-icon name="receipt_long" size="14px" class="q-mr-xs" />
            <span v-if="item.orderCount > 0">
              {{ item.orderCount }} ออเดอร์ ({{ item.totalItemCount }} จาน)
            </span>
            <span v-else class="text-cyan-9">ยังไม่มีการสั่งอาหาร</span>
          </div>
          <span v-if="item.session.customer_name" class="apple-customer-pill">
            <q-icon name="person" size="12px" class="q-mr-xs" />
            {{ item.session.customer_name }}
          </span>
        </div>

        <!-- Kitchen Progress Box -->
        <div class="progress-box q-mb-md">
          <div class="row items-center justify-between text-caption q-mb-xs">
            <div class="row items-center">
              <q-icon
                :name="item.kitchenIcon"
                size="15px"
                :class="item.kitchenIconColor"
                class="q-mr-xs"
              />
              <span class="text-weight-bold" :class="item.kitchenTextColor">
                {{ item.kitchenText }}
              </span>
            </div>
            <span v-if="item.orderCount > 0" class="text-caption text-muted font-tabular">
              {{ item.servedOrdersCount }}/{{ item.orderCount }} คิว
            </span>
          </div>

          <!-- Micro Progress Bar -->
          <div v-if="item.orderCount > 0" class="apple-progress-track">
            <div
              class="apple-progress-fill"
              :class="item.progressBarColorClass"
              :style="{ width: `${item.servingPercentage}%` }"
            ></div>
          </div>

          <!-- Kitchen stage summary chips -->
          <div
            v-if="item.orderCount > 0"
            class="row items-center q-gutter-x-xs q-mt-xs text-caption"
          >
            <span v-if="item.servedOrdersCount > 0" class="stage-tag stage-tag--served">
              เสิร์ฟครบ {{ item.servedOrdersCount }}
            </span>
            <span v-if="item.preparingOrdersCount > 0" class="stage-tag stage-tag--preparing">
              กำลังทำ {{ item.preparingOrdersCount }}
            </span>
            <span v-if="item.queuedOrdersCount > 0" class="stage-tag stage-tag--queued">
              รอทำ {{ item.queuedOrdersCount }}
            </span>
          </div>
        </div>

        <!-- Total Bill Amount Highlight Box -->
        <div
          class="amount-display-card"
          :class="{
            'amount-display-card--ready': item.tableStatus === 'READY_TO_PAY',
            'amount-display-card--paid': item.tableStatus === 'PAID',
          }"
        >
          <div class="row items-center justify-between">
            <div>
              <div class="text-caption text-muted">
                {{ item.isPaid ? 'ยอดชำระแล้ว' : 'ยอดรวมบิลปัจจุบัน' }}
              </div>
              <div
                v-if="item.isPaid"
                class="text-caption text-positive font-size-11 row items-center q-mt-xs"
              >
                <q-icon name="check_circle" size="12px" class="q-mr-xs" />
                <span>ชำระเงินเรียบร้อย</span>
              </div>
            </div>
            <div
              class="bill-total-price font-tabular"
              :class="
                item.isPaid ? 'text-purple-9' : item.isReadyToPay ? 'text-green-8' : 'text-primary'
              "
            >
              {{ formatPrice(item.totalAmount) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Action Footer Buttons -->
      <div class="card-actions-footer q-mt-md">
        <!-- 1. PAID Actions: Quick Clear Table + Receipt -->
        <div v-if="item.tableStatus === 'PAID'" class="row q-gutter-xs">
          <q-btn
            unelevated
            no-caps
            class="col apple-pill-btn apple-pill-btn--purple"
            @click="$emit('clear-table', item)"
            :loading="isClearing"
          >
            <q-icon name="cleaning_services" size="16px" class="q-mr-xs" />
            <span>เคลียร์โต๊ะ (เปิดใหม่)</span>
          </q-btn>
          <q-btn
            unelevated
            no-caps
            class="apple-pill-btn apple-pill-btn--secondary"
            @click="$emit('open-bill', item.session.id)"
          >
            <q-icon name="receipt" size="16px" class="q-mr-xs" />
            <span>ใบเสร็จ</span>
          </q-btn>
        </div>

        <!-- 2. READY_TO_PAY Actions: Settle Bill + Transfer + QR -->
        <div v-else-if="item.tableStatus === 'READY_TO_PAY'" class="row items-center q-gutter-xs">
          <q-btn
            unelevated
            no-caps
            class="col apple-pill-btn apple-pill-btn--green"
            @click="$emit('open-bill', item.session.id)"
          >
            <q-icon name="payments" size="17px" class="q-mr-xs" />
            <span>เช็กบิล ({{ formatPrice(item.totalAmount) }})</span>
            <q-icon name="arrow_forward" size="14px" class="q-ml-xs" />
          </q-btn>
          <q-btn
            flat
            round
            dense
            color="grey-7"
            icon="swap_horiz"
            class="apple-icon-btn"
            @click="$emit('transfer-table', item)"
          >
            <q-tooltip>ขอย้ายหรือรวมโต๊ะ</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            color="grey-7"
            icon="qr_code_2"
            class="apple-icon-btn"
            @click="$emit('show-qr', item.table)"
          >
            <q-tooltip>ดู QR ประจำโต๊ะ</q-tooltip>
          </q-btn>
        </div>

        <!-- 3. SEATED_NO_ORDER Actions: Cancel session + View bill + Transfer + QR -->
        <div
          v-else-if="item.tableStatus === 'SEATED_NO_ORDER'"
          class="row items-center q-gutter-xs"
        >
          <q-btn
            unelevated
            no-caps
            class="col apple-pill-btn apple-pill-btn--negative"
            @click="$emit('cancel-session', item)"
            :loading="isCancelling"
          >
            <q-icon name="person_remove" size="16px" class="q-mr-xs" />
            <span>ยกเลิกเซสชัน</span>
          </q-btn>
          <q-btn
            unelevated
            no-caps
            class="apple-pill-btn apple-pill-btn--secondary"
            @click="$emit('open-bill', item.session.id)"
          >
            <span>ดูบิล</span>
          </q-btn>
          <q-btn
            flat
            round
            dense
            color="grey-7"
            icon="swap_horiz"
            class="apple-icon-btn"
            @click="$emit('transfer-table', item)"
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
            @click="$emit('show-qr', item.table)"
          >
            <q-tooltip>ดู QR ประจำโต๊ะ</q-tooltip>
          </q-btn>
        </div>

        <!-- 4. COOKING Actions: Manage bill + Transfer + QR -->
        <div v-else class="row items-center q-gutter-xs">
          <q-btn
            unelevated
            no-caps
            class="col apple-pill-btn apple-pill-btn--primary"
            @click="$emit('open-bill', item.session.id)"
          >
            <q-icon name="receipt" size="16px" class="q-mr-xs" />
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
            @click="$emit('transfer-table', item)"
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
            @click="$emit('show-qr', item.table)"
          >
            <q-tooltip>ดู QR ประจำโต๊ะ</q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>

    <!-- Card Body: AVAILABLE TABLE (โต๊ะว่าง) -->
    <div v-else class="card-body-empty column justify-between">
      <div class="empty-placeholder text-center q-my-md">
        <div class="empty-icon-circle q-mx-auto q-mb-sm">
          <q-icon name="chair_alt" size="28px" class="text-muted" />
        </div>
        <div class="empty-title text-ink">โต๊ะว่าง พร้อมให้บริการ</div>
        <div class="empty-sub text-caption text-muted q-mt-xs">
          เมื่อลูกค้าสแกน QR ระบบจะเปิดบิลและเริ่มนับเวลาอัตโนมัติ
        </div>
      </div>

      <div class="card-actions-footer row q-gutter-xs">
        <q-btn
          unelevated
          no-caps
          class="col apple-pill-btn apple-pill-btn--secondary"
          @click="$emit('show-qr', item.table)"
        >
          <q-icon name="qr_code_2" size="16px" class="q-mr-xs" />
          <span>ดู QR โต๊ะ</span>
        </q-btn>
        <q-btn
          unelevated
          no-caps
          class="col apple-pill-btn apple-pill-btn--primary"
          @click="$emit('open-customer-link', item.table)"
        >
          <q-icon name="open_in_new" size="15px" class="q-mr-xs" />
          <span>เปิดสั่งอาหาร</span>
        </q-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatPrice } from 'src/utils/formatters';
import type { TableCardItem } from 'src/types/tableCard';
import type { TableWithQR } from 'src/types/database';

defineProps<{
  item: TableCardItem;
  isClearing: boolean;
  isCancelling: boolean;
}>();

defineEmits<{
  (e: 'open-bill', sessionId: string): void;
  (e: 'clear-table', item: TableCardItem): void;
  (e: 'cancel-session', item: TableCardItem): void;
  (e: 'transfer-table', item: TableCardItem): void;
  (e: 'show-qr', table: TableWithQR): void;
  (e: 'open-customer-link', table: TableWithQR): void;
}>();
</script>

<style scoped>
.apple-table-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 290px;
}

.apple-table-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.07);
  border-color: #b0b0b8;
}

/* Card Header */
.card-header {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-surface-footer, #f5f5f7);
}

.table-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.table-name {
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--color-ink, #1d1d1f);
  line-height: 1.3;
}

.table-subtitle {
  color: var(--color-muted, #6e6e73);
  font-size: 0.75rem;
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

/* Apple Status Pill */
.apple-status-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 980px;
  white-space: nowrap;
}

.badge-status--available {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-muted, #6e6e73);
}

.badge-status--cooking {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.badge-status--ready-pay {
  background: rgba(52, 199, 89, 0.14);
  color: #15803d;
}

.badge-status--paid {
  background: rgba(139, 92, 246, 0.12);
  color: #6d28d9;
}

.badge-status--seated {
  background: rgba(6, 182, 212, 0.12);
  color: #0e7490;
}

.live-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}

.live-status-dot--amber {
  background: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
}

.live-status-dot--green {
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
}

.live-status-dot--purple {
  background: #8b5cf6;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
}

.live-status-dot--cyan {
  background: #06b6d4;
  box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.3);
}

/* Card Body */
.card-body {
  flex: 1;
  padding-top: 12px;
}

.apple-customer-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 980px;
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

/* Progress Box */
.progress-box {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 12px;
  padding: 8px 10px;
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
  transition: width 0.3s ease;
}

.stage-tag {
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 4px;
}

.stage-tag--served {
  background: rgba(52, 199, 89, 0.12);
  color: #15803d;
}

.stage-tag--preparing {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.stage-tag--queued {
  background: #e2e8f0;
  color: var(--color-muted, #6e6e73);
}

/* Amount Display Card */
.amount-display-card {
  background: var(--color-surface-footer, #f5f5f7);
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 10px 12px;
  transition: all 0.2s ease;
}

.amount-display-card--ready {
  background: rgba(52, 199, 89, 0.08);
  border-color: rgba(52, 199, 89, 0.2);
}

.amount-display-card--paid {
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.2);
}

.bill-total-price {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* Empty State */
.card-body-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.empty-placeholder {
  padding: 16px 0;
}

.empty-icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-surface-footer, #f5f5f7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-title {
  font-size: 0.9375rem;
  font-weight: 600;
}

.empty-sub {
  font-size: 0.75rem;
  max-width: 220px;
  margin: 4px auto 0;
}

/* Buttons */
.apple-pill-btn {
  border-radius: 980px !important;
  font-size: 0.8125rem;
  font-weight: 600;
  height: 36px;
  transition: all 0.2s ease;
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
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--color-hairline, #d2d2d7);
  background: #ffffff;
  transition: all 0.18s ease;
}

.apple-icon-btn:hover {
  background: var(--color-surface-footer, #f5f5f7);
  border-color: #b0b0b8;
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

.font-size-11 {
  font-size: 0.6875rem;
}
</style>
