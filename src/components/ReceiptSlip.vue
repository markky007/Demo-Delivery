<template>
  <div class="receipt-slip-container">
    <div class="receipt-card" ref="receiptCardRef">
      <!-- Top Perforation Effect -->
      <div class="receipt-perforation receipt-perforation--top"></div>

      <!-- Restaurant Header -->
      <div class="receipt-header text-center q-pb-md">
        <div class="receipt-logo-wrap q-mb-xs">
          <q-icon name="restaurant" size="28px" color="primary" />
        </div>
        <div class="restaurant-name text-weight-bolder text-h6">DEMO Bang saen</div>
        <div class="receipt-subtitle text-caption text-grey-7">ใบแจ้งยอดชำระ / ใบเสร็จรับเงิน</div>
        <div class="receipt-meta-grid q-mt-sm">
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
            <span class="meta-value">{{ formattedTime }}</span>
          </div>
        </div>
      </div>

      <!-- Divider line -->
      <div class="receipt-divider"></div>

      <!-- Column Header -->
      <div
        class="receipt-table-header row justify-between text-caption text-weight-bold text-grey-8 q-py-xs"
      >
        <span class="col-6">รายการ</span>
        <span class="col-2 text-center">จำนวน</span>
        <span class="col-4 text-right">จำนวนเงิน</span>
      </div>

      <div class="receipt-divider receipt-divider--thin"></div>

      <!-- Items List Grouped or by Order -->
      <div class="receipt-body q-py-sm">
        <div v-for="order in orders" :key="order.id" class="receipt-order-group q-mb-sm">
          <!-- Order Queue Subtitle (if multiple orders) -->
          <div v-if="orders.length > 1" class="receipt-queue-badge q-mb-xs">
            <span>คิวที่ {{ formatQueueNumber(order.queue_number) }}</span>
            <span class="text-caption text-grey-6 q-ml-xs"
              >({{ formatTime(order.created_at) }})</span
            >
          </div>

          <div v-for="item in order.items" :key="item.id" class="receipt-item-row q-py-xs">
            <div class="row justify-between items-start">
              <!-- Dish Name -->
              <div class="col-6 receipt-item-name">
                <div class="row items-center no-wrap">
                  <span class="text-weight-bold ellipsis">{{ item.snapshot_name }}</span>
                  <q-btn
                    v-if="allowEditPrice"
                    flat
                    round
                    dense
                    size="xs"
                    color="primary"
                    icon="edit"
                    class="q-ml-xs no-print edit-price-btn"
                    @click="emit('edit-price', { item, order })"
                  >
                    <q-tooltip>แก้ไขราคาอาหาร / ปรับตามหมายเหตุ</q-tooltip>
                  </q-btn>
                </div>
              </div>
              <!-- Quantity -->
              <div class="col-2 text-center text-weight-medium">x{{ item.quantity }}</div>
              <!-- Subtotal -->
              <div class="col-4 text-right font-mono">
                <div class="row items-center justify-end no-wrap">
                  <span class="text-weight-bold">{{ formatPrice(item.subtotal) }}</span>
                  <q-btn
                    v-if="allowEditPrice"
                    flat
                    dense
                    size="xs"
                    color="primary"
                    label="แก้ราคา"
                    icon="edit"
                    class="q-ml-xs no-print edit-price-pill gt-xs"
                    @click="emit('edit-price', { item, order })"
                  >
                    <q-tooltip>แก้ไขราคาอาหาร (฿)</q-tooltip>
                  </q-btn>
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
                class="receipt-opt-item text-caption text-grey-7"
              >
                <span>• {{ opt.snapshot_option_name }}</span>
                <span
                  v-if="opt.snapshot_price_adjustment > 0"
                  class="q-ml-xs font-mono text-grey-8"
                >
                  (+{{ formatPrice(opt.snapshot_price_adjustment) }})
                </span>
              </div>
            </div>

            <!-- Special Instruction (Highlighted) -->
            <div
              v-if="item.special_instruction"
              class="receipt-note-item text-caption q-pl-xs q-mt-xs"
              :class="{ 'receipt-note-item--actionable': allowEditPrice }"
              @click="allowEditPrice && emit('edit-price', { item, order })"
            >
              <div class="row items-center">
                <q-icon name="comment" size="13px" class="q-mr-xs text-amber-9" />
                <span class="text-weight-medium text-amber-10">หมายเหตุ: {{ item.special_instruction }}</span>
                <span v-if="allowEditPrice" class="text-caption text-primary q-ml-xs text-weight-bold no-print">(กดเพื่อแก้ราคา)</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="totalItemsCount === 0" class="text-center text-grey-6 q-py-md">
          ไม่มีรายการอาหารในบิลนี้
        </div>
      </div>

      <!-- Divider line -->
      <div class="receipt-divider"></div>

      <!-- Calculation Summary -->
      <div class="receipt-summary q-py-sm">
        <div class="row justify-between text-body2 q-py-xs text-grey-8">
          <span>จำนวนรายการทั้งหมด</span>
          <span class="text-weight-medium">{{ totalItemsCount }} รายการ</span>
        </div>
        <div class="row justify-between text-body2 q-py-xs text-grey-8">
          <span>จำนวนออเดอร์</span>
          <span class="text-weight-medium">{{ orders.length }} ออเดอร์</span>
        </div>

        <div class="receipt-divider receipt-divider--thin q-my-xs"></div>

        <!-- Grand Total -->
        <div class="row justify-between items-center q-pt-sm receipt-total-row">
          <span class="text-subtitle1 text-weight-bold">ยอดรวมสุทธิ</span>
          <span class="text-h5 text-weight-bolder text-primary font-mono">
            {{ formatPrice(grandTotal) }}
          </span>
        </div>
      </div>

      <!-- Status Seal / Badge -->
      <div class="receipt-footer text-center q-pt-md q-pb-sm">
        <div v-if="isPaid" class="paid-stamp">
          <div class="paid-stamp-inner">
            <q-icon name="check_circle" size="20px" class="q-mr-xs" />
            <span>PAID / ชำระแล้ว</span>
          </div>
          <div v-if="bill?.paid_at" class="text-caption text-green-9 q-mt-xs font-mono">
            {{ formatDateTime(bill.paid_at) }}
          </div>
        </div>
        <div v-else class="pending-stamp">
          <q-badge
            color="warning"
            text-color="dark"
            class="q-px-md q-py-xs text-subtitle2 text-weight-bold"
          >
            <q-icon name="schedule" size="16px" class="q-mr-xs" />
            รอชำระเงิน
          </q-badge>
        </div>

        <div class="text-caption text-grey-5 q-mt-md receipt-thankyou">
          *** ขอบคุณที่ใช้บริการ ***
        </div>
      </div>

      <!-- Bottom Perforation Effect -->
      <div class="receipt-perforation receipt-perforation--bottom"></div>
    </div>

    <!-- Actions Toolbar (Hidden during print) -->
    <div
      v-if="showActions"
      class="receipt-actions-toolbar row justify-center q-gutter-sm q-mt-md no-print"
    >
      <q-btn
        outline
        rounded
        no-caps
        color="grey-9"
        icon="print"
        label="พิมพ์ใบเสร็จ"
        @click="printReceipt"
        class="receipt-action-btn"
      />
      <q-btn
        outline
        rounded
        no-caps
        color="grey-9"
        icon="content_copy"
        label="คัดลอกสรุปรายการ"
        @click="copyReceiptSummary"
        class="receipt-action-btn"
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
    notifySuccess('คัดลอกสรุปรายการบิลเรียบร้อยแล้ว');
  } catch {
    // fallback
  }
}
</script>

<style scoped>
.receipt-slip-container {
  max-width: 420px;
  margin: 0 auto;
}

.receipt-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 24px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Thai', sans-serif;
  color: #1f2937;
}

.receipt-logo-wrap {
  width: 44px;
  height: 44px;
  background: var(--color-primary-soft, #fef2f2);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.restaurant-name {
  color: #111827;
  letter-spacing: 0.5px;
}

.receipt-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
  font-size: 0.82rem;
  text-align: left;
  background: #f9fafb;
  padding: 8px 12px;
  border-radius: 6px;
}

.receipt-meta-item {
  display: flex;
  justify-content: space-between;
}

.meta-label {
  color: #6b7280;
}

.receipt-divider {
  border-top: 2px dashed #d1d5db;
  margin: 12px 0;
}

.receipt-divider--thin {
  border-top: 1px dashed #e5e7eb;
}

.receipt-order-group:not(:last-child) {
  border-bottom: 1px dashed #f3f4f6;
  padding-bottom: 8px;
}

.receipt-queue-badge {
  display: inline-block;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #4b5563;
}

.receipt-item-row {
  line-height: 1.35;
}

.receipt-item-name {
  color: #1f2937;
  font-size: 0.88rem;
}

.receipt-opt-item {
  line-height: 1.25;
  margin-top: 2px;
}

.receipt-note-item {
  display: flex;
  align-items: center;
  margin-top: 2px;
  background: #fffbeb;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px dashed #fcd34d;
}

.receipt-note-item--actionable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.receipt-note-item--actionable:hover {
  background: #fef3c7;
  border-color: #f59e0b;
}

.edit-price-btn {
  opacity: 0.75;
  transition: opacity 0.2s;
}

.edit-price-btn:hover {
  opacity: 1;
}

.edit-price-pill {
  font-size: 11px;
  padding: 0 4px;
  background: #eff6ff;
  border-radius: 4px;
  font-weight: 600;
}

.edit-price-pill:hover {
  background: #dbeafe;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.receipt-total-row {
  border-top: 2px solid #111827;
}

.paid-stamp {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 18px;
  border: 2px solid #16a34a;
  border-radius: 8px;
  background: #f0fdf4;
  color: #15803d;
  font-weight: 700;
  transform: rotate(-1deg);
}

.paid-stamp-inner {
  display: flex;
  align-items: center;
  font-size: 1rem;
}

.receipt-thankyou {
  letter-spacing: 1px;
}

.receipt-action-btn {
  font-weight: 600;
  background: #ffffff;
}

/* Print CSS Styles */
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
  }
  .no-print {
    display: none !important;
  }
}
</style>
