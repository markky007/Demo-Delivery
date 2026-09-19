<template>
  <div class="receipt-slip-container">
    <div class="receipt-card" ref="receiptCardRef">
      <!-- Minimalist Brand Header -->
      <div class="receipt-header text-center q-pb-md">
        <div class="receipt-logo-wrap q-mb-xs">
          <q-icon name="restaurant" size="24px" color="primary" />
        </div>
        <div class="restaurant-name">DEMO Bang saen</div>
        <div class="receipt-subtitle">ใบแจ้งยอดชำระ / ใบเสร็จรับเงิน</div>

        <!-- 2x2 Meta Grid -->
        <div class="receipt-meta-grid q-mt-md">
          <div class="receipt-meta-item">
            <span class="meta-label">โต๊ะ:</span>
            <span class="meta-value text-weight-bold">{{ tableName }}</span>
          </div>
          <div class="receipt-meta-item">
            <span class="meta-label">รหัสบิล:</span>
            <span class="meta-value font-mono">#{{ bill?.id ? bill.id.slice(0, 8) : '—' }}</span>
          </div>
          <div class="receipt-meta-item">
            <span class="meta-label">วันที่:</span>
            <span class="meta-value">{{ formattedDate }}</span>
          </div>
          <div class="receipt-meta-item">
            <span class="meta-label">เวลา:</span>
            <span class="meta-value font-mono">{{ formattedTime }}</span>
          </div>
        </div>
      </div>

      <!-- Hairline Divider -->
      <div class="receipt-divider"></div>

      <!-- Table Column Headers -->
      <div class="receipt-table-header row justify-between text-caption text-weight-bold q-py-xs">
        <span class="col-6">รายการ</span>
        <span class="col-2 text-center">จำนวน</span>
        <span class="col-4 text-right">จำนวนเงิน</span>
      </div>

      <div class="receipt-divider receipt-divider--subtle"></div>

      <!-- Items List Grouped by Order -->
      <div class="receipt-body q-py-xs">
        <div v-for="order in orders" :key="order.id" class="receipt-order-group q-mb-sm">
          <!-- Queue Subheader (shown when > 1 order) -->
          <div v-if="orders.length > 1" class="receipt-queue-badge q-mb-xs">
            <span>คิวที่ {{ formatQueueNumber(order.queue_number) }}</span>
            <span class="queue-time q-ml-xs">({{ formatTime(order.created_at) }})</span>
          </div>

          <!-- Dish Item Row -->
          <div v-for="item in order.items" :key="item.id" class="receipt-item-row q-py-xs">
            <div class="row justify-between items-start">
              <!-- Dish Name & Quick Edit affordance -->
              <div class="col-6 receipt-item-name">
                <div class="row items-center no-wrap">
                  <span class="text-weight-bold ellipsis">{{ item.snapshot_name }}</span>
                  <q-btn
                    v-if="allowEditPrice"
                    flat
                    round
                    dense
                    size="xs"
                    icon="edit"
                    class="q-ml-xs no-print edit-price-btn"
                    @click="emit('edit-price', { item, order })"
                    aria-label="แก้ไขราคา"
                  >
                    <q-tooltip anchor="top middle" self="bottom middle">แก้ไขราคาอาหาร</q-tooltip>
                  </q-btn>
                </div>
              </div>

              <!-- Quantity -->
              <div class="col-2 text-center text-weight-medium font-mono text-muted">
                x{{ item.quantity }}
              </div>

              <!-- Subtotal -->
              <div class="col-4 text-right font-mono">
                <div class="row items-center justify-end no-wrap">
                  <span class="text-weight-bold item-price">{{ formatPrice(item.subtotal) }}</span>
                  <button
                    v-if="allowEditPrice"
                    type="button"
                    class="edit-price-pill gt-xs no-print q-ml-xs"
                    @click="emit('edit-price', { item, order })"
                  >
                    แก้ราคา
                  </button>
                </div>
              </div>
            </div>

            <!-- Options Breakdown -->
            <div
              v-if="item.options && getVisibleOptions(item.options).length > 0"
              class="receipt-options-list q-pl-xs q-mt-xs"
            >
              <div
                v-for="opt in getVisibleOptions(item.options)"
                :key="opt.id"
                class="receipt-opt-item text-caption text-muted"
              >
                <span>• {{ opt.snapshot_option_name }}</span>
                <span
                  v-if="opt.snapshot_price_adjustment > 0"
                  class="q-ml-xs font-mono text-weight-medium"
                >
                  (+{{ formatPrice(opt.snapshot_price_adjustment) }})
                </span>
              </div>
            </div>

            <!-- Special Instruction Callout Note -->
            <div
              v-if="item.special_instruction"
              class="receipt-note-item q-mt-xs"
              :class="{ 'receipt-note-item--actionable': allowEditPrice }"
              @click="allowEditPrice && emit('edit-price', { item, order })"
            >
              <div class="row items-center justify-between no-wrap full-width">
                <div class="row items-center no-wrap ellipsis q-mr-xs">
                  <q-icon name="edit_note" size="16px" class="q-mr-xs text-amber-9" />
                  <span class="note-text ellipsis">หมายเหตุ: {{ item.special_instruction }}</span>
                </div>
                <span v-if="allowEditPrice" class="note-action-tag no-print">แก้ราคา</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="totalItemsCount === 0" class="empty-items-notice text-center q-py-lg text-muted">
          ไม่มีรายการอาหารในบิลนี้
        </div>
      </div>

      <!-- Hairline Divider -->
      <div class="receipt-divider"></div>

      <!-- Financial Calculation Summary -->
      <div class="receipt-summary q-py-xs">
        <div class="row justify-between text-body2 q-py-xs text-muted">
          <span>จำนวนรายการทั้งหมด</span>
          <span class="text-weight-medium text-ink font-mono">{{ totalItemsCount }} รายการ</span>
        </div>
        <div class="row justify-between text-body2 q-py-xs text-muted">
          <span>จำนวนออเดอร์</span>
          <span class="text-weight-medium text-ink font-mono">{{ orders.length }} ออเดอร์</span>
        </div>

        <div class="receipt-divider receipt-divider--subtle q-my-xs"></div>

        <!-- Grand Total -->
        <div class="row justify-between items-baseline q-pt-sm receipt-total-row">
          <span class="receipt-total-label">ยอดรวมสุทธิ</span>
          <span class="receipt-total-amount font-mono">
            {{ formatPrice(grandTotal) }}
          </span>
        </div>
      </div>

      <!-- Status Stamp / Confirmation Seal -->
      <div class="receipt-footer text-center q-pt-md q-pb-xs">
        <!-- Paid Apple Badge -->
        <div v-if="isPaid" class="apple-paid-seal">
          <div class="row items-center justify-center">
            <q-icon name="check_circle" size="18px" class="q-mr-xs" />
            <span class="text-weight-bold">ชำระเงินเรียบร้อยแล้ว</span>
          </div>
          <div v-if="bill?.paid_at" class="paid-time-caption font-mono q-mt-xs">
            เมื่อ {{ formatDateTime(bill.paid_at) }}
          </div>
        </div>

        <!-- Pending Apple Badge -->
        <div v-else class="apple-pending-badge">
          <q-icon name="schedule" size="15px" class="q-mr-xs" />
          <span>รอชำระเงิน</span>
        </div>

        <div class="receipt-thankyou text-caption q-mt-md">
          ขอบคุณที่ใช้บริการ
        </div>
      </div>
    </div>

    <!-- Actions Toolbar (Apple Pill Buttons) -->
    <div
      v-if="showActions"
      class="receipt-actions-toolbar row justify-center q-gutter-sm q-mt-md no-print"
    >
      <q-btn
        unelevated
        no-caps
        icon="print"
        label="พิมพ์ใบเสร็จ"
        @click="printReceipt"
        class="apple-pill-btn apple-pill-btn--secondary"
      />
      <q-btn
        unelevated
        no-caps
        icon="content_copy"
        label="คัดลอกสรุปรายการ"
        @click="copyReceiptSummary"
        class="apple-pill-btn apple-pill-btn--secondary"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Bill, OrderWithItems, OrderItemWithOptions } from 'src/types/database';
import { BillStatus } from 'src/types/enums';
import {
  formatPrice,
  formatDateTime,
  formatTime,
  formatQueueNumber,
  getVisibleOptions,
} from 'src/utils/formatters';
import { useNotify } from 'src/composables/useNotify';

const props = withDefaults(
  defineProps<{
    bill?: Bill | null;
    tableName?: string;
    orders?: OrderWithItems[];
    showActions?: boolean;
    allowEditPrice?: boolean;
  }>(),
  {
    bill: null,
    tableName: 'โต๊ะ',
    orders: () => [],
    showActions: true,
    allowEditPrice: false,
  },
);

const emit = defineEmits<{
  (e: 'edit-price', payload: { item: OrderItemWithOptions; order: OrderWithItems }): void;
}>();

const { notifySuccess } = useNotify();
const receiptCardRef = ref<HTMLElement | null>(null);

const isPaid = computed(() => props.bill?.status === BillStatus.PAID);

const grandTotal = computed(() => {
  if (props.bill?.total_amount !== undefined && props.bill?.total_amount !== null) {
    return props.bill.total_amount;
  }
  return props.orders.reduce((sum, o) => sum + o.total_amount, 0);
});

const totalItemsCount = computed(() =>
  props.orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0),
);

const dateSource = computed(
  () => props.bill?.paid_at || props.bill?.created_at || new Date().toISOString(),
);

const formattedDate = computed(() => {
  try {
    const d = new Date(dateSource.value);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
});

const formattedTime = computed(() => {
  try {
    const d = new Date(dateSource.value);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
});

function printReceipt() {
  window.print();
}

async function copyReceiptSummary() {
  let summary = `🧾 DEMO Bang saen - ใบเสร็จรับเงิน\n`;
  summary += `โต๊ะ: ${props.tableName}\n`;
  summary += `วันที่: ${formattedDate.value} ${formattedTime.value}\n`;
  summary += `--------------------------------\n`;

  for (const order of props.orders) {
    for (const item of order.items) {
      summary += `${item.snapshot_name} x${item.quantity} = ${formatPrice(item.subtotal)}\n`;
      const visibleOpts = getVisibleOptions(item.options);
      if (visibleOpts.length > 0) {
        for (const opt of visibleOpts) {
          summary += `  + ${opt.snapshot_option_name}${opt.snapshot_price_adjustment > 0 ? ` (+${formatPrice(opt.snapshot_price_adjustment)})` : ''}\n`;
        }
      }
      if (item.special_instruction) {
        summary += `  (หมายเหตุ: ${item.special_instruction})\n`;
      }
    }
  }

  summary += `--------------------------------\n`;
  summary += `ยอดรวมทั้งสิ้น: ${formatPrice(grandTotal.value)}\n`;
  summary += `สถานะ: ${isPaid.value ? 'ชำระแล้ว' : 'รอชำระเงิน'}\n`;

  try {
    await navigator.clipboard.writeText(summary);
    notifySuccess('คัดลอกข้อความสรุปรายการบิลลงคลิปบอร์ดแล้ว', {
      title: 'คัดลอกสรุปบิลสำเร็จ 📋',
      caption: 'สามารถนำไปวางในแชทหรือส่งต่อให้ลูกค้าได้ทันที',
    });
  } catch {
    // fallback
  }
}

defineExpose({
  copyReceiptSummary,
  printReceipt,
});
</script>

<style scoped>
.receipt-slip-container {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
}

.receipt-card {
  background: var(--color-surface, #ffffff);
  border-radius: 20px;
  padding: 28px 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--color-hairline, #d2d2d7);
  position: relative;
  color: var(--color-ink, #1d1d1f);
}

.receipt-logo-wrap {
  width: 44px;
  height: 44px;
  background: rgba(0, 113, 227, 0.08);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.restaurant-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-ink, #1d1d1f);
  letter-spacing: 0.2px;
}

.receipt-subtitle {
  font-size: 0.75rem;
  color: var(--color-muted, #6e6e73);
  margin-top: 2px;
}

.receipt-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 14px;
  font-size: 0.8125rem;
  text-align: left;
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #e8e8ed);
  padding: 10px 14px;
  border-radius: 12px;
}

.receipt-meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-label {
  color: var(--color-muted, #6e6e73);
  font-size: 0.75rem;
}

.meta-value {
  color: var(--color-ink, #1d1d1f);
}

.receipt-divider {
  border-top: 1px solid var(--color-hairline, #d2d2d7);
  margin: 14px 0;
}

.receipt-divider--subtle {
  border-top: 1px solid #f0f0f4;
  margin: 8px 0;
}

.receipt-table-header {
  color: var(--color-muted, #6e6e73);
  letter-spacing: 0.02em;
}

.receipt-order-group:not(:last-child) {
  border-bottom: 1px solid #f2f2f6;
  padding-bottom: 10px;
}

.receipt-queue-badge {
  display: inline-flex;
  align-items: center;
  background: var(--color-surface-footer, #f5f5f7);
  border: 1px solid var(--color-hairline, #e8e8ed);
  padding: 2px 8px;
  border-radius: 980px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-muted, #6e6e73);
}

.queue-time {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
  color: var(--color-muted-light, #86868b);
}

.receipt-item-row {
  line-height: 1.4;
}

.receipt-item-name {
  color: var(--color-ink, #1d1d1f);
  font-size: 0.875rem;
}

.item-price {
  color: var(--color-ink, #1d1d1f);
  font-size: 0.875rem;
}

.receipt-opt-item {
  line-height: 1.3;
  margin-top: 2px;
  font-size: 0.75rem;
}

.receipt-note-item {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.22);
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 0.75rem;
  color: #b45309;
}

.receipt-note-item--actionable {
  cursor: pointer;
  transition: all 0.15s ease;
}

.receipt-note-item--actionable:hover {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.4);
}

.note-text {
  font-weight: 500;
}

.note-action-tag {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-primary, #0071e3);
  flex-shrink: 0;
}

.edit-price-btn {
  color: var(--color-muted, #6e6e73);
  transition: color 0.15s;
}

.edit-price-btn:hover {
  color: var(--color-primary, #0071e3);
}

.edit-price-pill {
  border: none;
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-primary, #0071e3);
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 980px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.edit-price-pill:hover {
  background: rgba(0, 113, 227, 0.12);
}

.font-mono {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

.receipt-total-row {
  border-top: 2px solid var(--color-ink, #1d1d1f);
}

.receipt-total-label {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-ink, #1d1d1f);
}

.receipt-total-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary, #0071e3);
}

/* Apple Paid Seal */
.apple-paid-seal {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 18px;
  border-radius: 12px;
  background: rgba(52, 199, 89, 0.12);
  color: #15803d;
  font-size: 0.875rem;
}

.paid-time-caption {
  font-size: 0.6875rem;
  color: #166534;
}

/* Apple Pending Badge */
.apple-pending-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  border-radius: 980px;
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  font-size: 0.8125rem;
  font-weight: 600;
}

.receipt-thankyou {
  color: var(--color-muted-light, #86868b);
  letter-spacing: 0.5px;
}

/* Apple Pill Buttons */
.apple-pill-btn {
  border-radius: 980px !important;
  font-size: 0.8125rem;
  font-weight: 600;
  height: 38px;
  padding: 0 18px;
  transition: all 0.18s ease;
}

.apple-pill-btn--secondary {
  background: var(--color-surface, #ffffff) !important;
  color: var(--color-ink, #1d1d1f) !important;
  border: 1px solid var(--color-hairline, #d2d2d7);
}

.apple-pill-btn--secondary:hover {
  background: var(--color-surface-alt, #e8e8ed) !important;
  border-color: #b0b0b8;
  transform: translateY(-1px);
}

/* Print Stylesheet for 80mm POS Thermal Slip */
@media print {
  body * {
    visibility: hidden;
  }
  .receipt-card,
  .receipt-card * {
    visibility: visible;
  }
  .receipt-card {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: 80mm;
    box-shadow: none;
    border: none;
    padding: 0;
    margin: 0;
    color: #000000 !important;
  }
  .receipt-meta-grid,
  .receipt-note-item,
  .receipt-queue-badge {
    background: transparent !important;
    border: 1px solid #000000 !important;
    color: #000000 !important;
  }
  .receipt-total-amount {
    color: #000000 !important;
  }
  .no-print {
    display: none !important;
  }
}
</style>
