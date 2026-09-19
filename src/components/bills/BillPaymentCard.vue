<template>
  <div class="apple-payment-card q-pa-md">
    <!-- Card Header -->
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center no-wrap">
        <div class="payment-icon-wrap q-mr-sm">
          <q-icon name="payments" size="20px" color="primary" />
        </div>
        <div>
          <div class="payment-title">สรุปยอดชำระเงิน</div>
          <div class="payment-subtitle">{{ tableName }}</div>
        </div>
      </div>

      <div
        class="session-badge"
        :class="session?.status === 'ACTIVE' ? 'session-badge--active' : 'session-badge--closed'"
      >
        {{ session?.status === 'ACTIVE' ? 'เปิดโต๊ะอยู่' : 'ปิดโต๊ะแล้ว' }}
      </div>
    </div>

    <!-- Hero Price Box -->
    <div class="hero-price-box text-center q-pa-md q-mb-md">
      <div class="price-caption">ยอดรวมสุทธิที่ต้องชำระ</div>
      <div class="price-amount font-mono q-my-xs">
        {{ formatPrice(billTotal) }}
      </div>
      <div class="price-breakdown row items-center justify-center q-gutter-x-xs font-mono">
        <span>{{ totalItemsCount }} รายการ</span>
        <span>•</span>
        <span>{{ orders.length }} ออเดอร์</span>
      </div>
    </div>

    <!-- Active Session Operational States -->
    <div v-if="session?.status === 'ACTIVE'" class="column q-gutter-y-sm">
      <!-- State 1: No orders placed -->
      <div v-if="orders.length === 0" class="empty-orders-callout q-pa-sm text-center">
        <div class="text-caption text-muted q-mb-xs">
          ยังไม่มีรายการสั่งอาหาร สามารถยกเลิกการเปิดโต๊ะได้
        </div>
        <q-btn
          unelevated
          no-caps
          icon="person_remove"
          label="ยกเลิกการเปิดโต๊ะ"
          :loading="isProcessing"
          @click="$emit('cancel-empty-session')"
          class="apple-pill-btn apple-pill-btn--negative full-width"
        />
      </div>

      <!-- State 2: Unserved food warning -->
      <div v-else-if="!allServed" class="unserved-callout q-pa-sm">
        <div class="row items-center no-wrap">
          <q-icon name="schedule" size="18px" class="q-mr-xs text-amber-9" />
          <span class="text-weight-bold text-caption text-amber-10"
            >ยังมีอาหารที่กำลังปรุงหรือรอเสิร์ฟ</span
          >
        </div>
        <p class="unserved-desc q-mb-none q-mt-xs">
          ต้องเสิร์ฟอาหารให้ครบทุกรายการก่อน จึงจะสามารถรับชำระเงินและปิดโต๊ะได้
        </p>
      </div>

      <!-- State 3: Orders exist and ready to pay -->
      <q-btn
        v-if="orders.length > 0 && (!bill || bill.status !== 'PAID')"
        unelevated
        no-caps
        :disable="!allServed"
        :loading="isProcessing"
        @click="$emit('mark-paid')"
        class="apple-pill-btn apple-pill-btn--primary apple-pay-btn full-width"
      >
        <div class="row items-center justify-center no-wrap">
          <q-icon name="payments" size="20px" class="q-mr-sm" />
          <span class="pay-btn-label">รับชำระเงินเรียบร้อย</span>
        </div>
        <q-tooltip v-if="!allServed" anchor="top middle" self="bottom middle">
          กรุณาเสิร์ฟอาหารให้ครบทุกรายการก่อนรับชำระเงิน
        </q-tooltip>
      </q-btn>

      <!-- State 4: Already paid, ready to close session -->
      <div v-if="bill?.status === 'PAID'" class="column q-gutter-y-sm">
        <div class="paid-status-box q-pa-sm text-center">
          <div class="row items-center justify-center text-weight-bold">
            <q-icon name="check_circle" size="18px" class="q-mr-xs" />
            <span>ชำระเงินเรียบร้อยแล้ว</span>
          </div>
        </div>

        <q-btn
          unelevated
          no-caps
          :loading="isProcessing"
          @click="$emit('close-session')"
          class="apple-pill-btn apple-pill-btn--ink full-width"
        >
          <q-icon name="task_alt" size="18px" class="q-mr-sm" />
          <span class="pay-btn-label">ปิดโต๊ะ / จบบิลนี้</span>
        </q-btn>
      </div>
    </div>

    <!-- Closed Session Banner -->
    <div v-else-if="session?.status === 'CLOSED'" class="closed-banner q-pa-sm text-center">
      <q-icon name="task_alt" size="22px" class="q-mb-xs" />
      <div class="text-weight-bold text-caption">โต๊ะนี้ปิดบิลเรียบร้อยแล้ว</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TableSession, Bill, OrderWithItems } from 'src/types/database';
import { formatPrice } from 'src/utils/formatters';

withDefaults(
  defineProps<{
    session?: TableSession | null;
    bill?: Bill | null;
    tableName?: string;
    billTotal?: number;
    totalItemsCount?: number;
    orders?: OrderWithItems[];
    allServed?: boolean;
    isProcessing?: boolean;
  }>(),
  {
    session: null,
    bill: null,
    tableName: 'โต๊ะ',
    billTotal: 0,
    totalItemsCount: 0,
    orders: () => [],
    allServed: false,
    isProcessing: false,
  },
);

defineEmits<{
  (e: 'mark-paid'): void;
  (e: 'close-session'): void;
  (e: 'cancel-empty-session'): void;
}>();
</script>

<style scoped>
.apple-payment-card {
  background: var(--color-surface, #ffffff);
  border-radius: 20px;
  border: 1px solid var(--color-hairline, #d2d2d7);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
}

.payment-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(0, 113, 227, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.payment-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-ink, #1d1d1f);
}

.payment-subtitle {
  font-size: 0.75rem;
  color: var(--color-muted, #6e6e73);
}

.session-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 980px;
}

.session-badge--active {
  background: rgba(52, 199, 89, 0.12);
  color: #15803d;
}

.session-badge--closed {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-muted, #6e6e73);
}

.hero-price-box {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #e8e8ed);
  border-radius: 14px;
}

.price-caption {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-muted, #6e6e73);
}

.price-amount {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary, #0071e3);
  letter-spacing: -0.5px;
}

.price-breakdown {
  font-size: 0.75rem;
  color: var(--color-muted, #6e6e73);
}

.font-mono {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

/* Callouts */
.empty-orders-callout {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px dashed var(--color-hairline, #d2d2d7);
  border-radius: 12px;
}

.unserved-callout {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.22);
  border-radius: 12px;
}

.unserved-desc {
  font-size: 0.75rem;
  color: var(--color-body, #414143);
  line-height: 1.4;
}

.paid-status-box {
  background: rgba(52, 199, 89, 0.12);
  border: 1px solid rgba(52, 199, 89, 0.25);
  border-radius: 12px;
  color: #15803d;
  font-size: 0.875rem;
}

.closed-banner {
  background: rgba(52, 199, 89, 0.12);
  border-radius: 12px;
  color: #15803d;
}

/* Apple Pill Buttons */
.apple-pill-btn {
  border-radius: 980px !important;
  font-size: 0.875rem;
  font-weight: 600;
  height: 46px;
  transition: all 0.18s ease;
}

.apple-pay-btn {
  height: 50px;
}

.pay-btn-label {
  font-size: 0.9375rem;
  font-weight: 600;
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
}

.apple-pill-btn--primary:not(:disabled):hover {
  background: #0066cc !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(0, 113, 227, 0.35);
}

.apple-pill-btn--ink {
  background: var(--color-ink, #1d1d1f) !important;
  color: #ffffff !important;
}

.apple-pill-btn--ink:hover {
  background: #000000 !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
}

.apple-pill-btn--negative {
  background: rgba(220, 38, 38, 0.08) !important;
  color: #dc2626 !important;
  border: 1px solid rgba(220, 38, 38, 0.2);
  height: 38px;
  font-size: 0.8125rem;
}

.apple-pill-btn--negative:hover {
  background: rgba(220, 38, 38, 0.14) !important;
}
</style>
