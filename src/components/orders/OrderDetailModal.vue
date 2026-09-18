<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    transition-show="scale"
    transition-hide="scale"
  >
    <q-card v-if="order" class="apple-detail-card">
      <!-- Modal Header -->
      <q-card-section class="detail-header row items-center justify-between no-wrap">
        <div class="row items-center q-gutter-x-sm no-wrap">
          <div class="detail-queue-chip font-code">#{{ formatQueueNum(order.queue_number) }}</div>
          <div>
            <div class="text-subtitle1 font-weight-700 text-ink">
              รายละเอียดออเดอร์ #{{ formatQueueNum(order.queue_number) }}
            </div>
            <div class="text-caption text-muted">
              {{ destinationName }}
            </div>
          </div>
        </div>
        <q-btn flat round dense icon="close" v-close-popup color="grey-7" />
      </q-card-section>

      <div class="modal-hairline-separator"></div>

      <!-- Modal Body -->
      <q-card-section class="detail-body q-pa-md scroll">
        <!-- Top Info Strip -->
        <div class="info-chips-strip q-mb-md">
          <div class="info-chip">
            <span class="info-chip-label">สถานะออเดอร์</span>
            <StatusBadge :status="order.status" />
          </div>
          <div class="info-chip">
            <span class="info-chip-label">เวลาที่สั่ง</span>
            <span class="text-caption font-weight-600 text-ink">
              {{ formatDateTime(order.created_at) }}
            </span>
          </div>
          <div class="info-chip">
            <span class="info-chip-label">ระยะเวลา</span>
            <span class="text-caption font-weight-600 text-ink">
              {{ formatElapsed(order.created_at) }}
            </span>
          </div>
        </div>

        <!-- Section Title: Items List -->
        <div class="row items-center justify-between q-mb-sm">
          <span class="font-weight-700 text-subtitle2 text-ink">
            รายการอาหาร ({{ order.items?.length || 0 }} รายการ)
          </span>
        </div>

        <!-- Receipt-Style Items Box -->
        <div class="detail-items-box q-mb-md">
          <div v-for="item in order.items" :key="item.id" class="detail-item-row">
            <div class="col min-width-0">
              <div class="row items-center q-gutter-x-xs no-wrap">
                <span class="detail-qty-badge font-tabular">{{ item.quantity }}×</span>
                <span class="font-weight-600 text-ink item-name ellipsis">
                  {{ item.snapshot_name }}
                </span>
              </div>

              <!-- Options list -->
              <div
                v-if="item.options && item.options.length > 0"
                class="detail-options-list text-caption text-muted q-mt-xs"
              >
                <div
                  v-for="opt in item.options"
                  :key="opt.id"
                  class="row items-center justify-between option-row"
                >
                  <span>• {{ opt.snapshot_group_name }}: {{ opt.snapshot_option_name }}</span>
                  <span v-if="opt.snapshot_price_adjustment > 0" class="font-tabular text-muted">
                    +{{ formatPrice(opt.snapshot_price_adjustment) }}
                  </span>
                </div>
              </div>

              <!-- Special cooking instruction -->
              <div v-if="item.special_instruction" class="detail-note-box q-mt-xs">
                <q-icon name="edit_note" size="15px" class="q-mr-xs text-amber-9" />
                <span class="text-caption text-amber-10">โน้ต: {{ item.special_instruction }}</span>
              </div>
            </div>

            <!-- Item Subtotal -->
            <div class="item-subtotal-price font-tabular text-ink q-ml-md self-start">
              {{ formatPrice(item.subtotal) }}
            </div>
          </div>
        </div>

        <!-- Total Box -->
        <div class="detail-total-box row items-center justify-between q-pa-md q-mb-md">
          <span class="font-weight-600 text-muted">ยอดรวมทั้งหมด</span>
          <span class="detail-total-amount font-tabular text-primary">
            {{ formatPrice(order.total_amount) }}
          </span>
        </div>

        <!-- Collapsible Technical Info -->
        <div class="technical-accordion">
          <details>
            <summary class="text-caption text-muted font-weight-500 cursor-pointer">
              ข้อมูลทางเทคนิค (Order & Session ID)
            </summary>
            <div class="tech-content q-mt-xs q-pa-sm text-caption text-muted font-code">
              <div><strong>Order ID:</strong> {{ order.id }}</div>
              <div v-if="order.table_session_id">
                <strong>Session ID:</strong> {{ order.table_session_id }}
              </div>
            </div>
          </details>
        </div>
      </q-card-section>

      <div class="modal-hairline-separator"></div>

      <!-- Modal Footer Actions -->
      <q-card-actions align="between" class="detail-footer q-pa-md">
        <!-- Delete Button -->
        <button
          type="button"
          class="apple-pill-btn apple-pill-btn--danger"
          @click="$emit('deleteOrder', order)"
        >
          <q-icon name="delete_outline" size="17px" class="q-mr-xs" />
          <span>ลบออเดอร์นี้</span>
        </button>

        <!-- Edit & Close Buttons -->
        <div class="row items-center q-gutter-x-sm">
          <button
            type="button"
            class="apple-pill-btn apple-pill-btn--secondary"
            @click="$emit('edit', order)"
          >
            <q-icon name="edit_note" size="17px" class="q-mr-xs text-orange-9" />
            <span>แก้ไขรายการอาหาร</span>
          </button>
          <button type="button" class="apple-pill-btn apple-pill-btn--primary" v-close-popup>
            <span>ปิดหน้าต่าง</span>
          </button>
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { OrderWithItems } from 'src/types/database';
import { formatPrice, formatDateTime, formatElapsed } from 'src/utils/formatters';
import StatusBadge from 'src/components/StatusBadge.vue';

const props = defineProps<{
  modelValue: boolean;
  order: OrderWithItems | null;
}>();

defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'edit', order: OrderWithItems): void;
  (e: 'deleteOrder', order: OrderWithItems): void;
}>();

const destinationName = computed(() => {
  if (!props.order) return '';
  if (props.order.table_session?.customer_name) {
    return `สั่งกลับบ้าน (${props.order.table_session.customer_name})`;
  }
  return props.order.table_session?.table?.name || 'ไม่ระบุโต๊ะ';
});

function formatQueueNum(num: number): string {
  return String(num).padStart(3, '0');
}
</script>

<style scoped>
.apple-detail-card {
  width: 100%;
  max-width: 560px;
  border-radius: 24px;
  background: var(--color-surface, #ffffff);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--color-hairline, #d2d2d7);
}

.detail-header {
  padding: 16px 20px;
}

.modal-hairline-separator {
  height: 1px;
  background: var(--color-surface-alt, #e8e8ed);
  width: 100%;
}

.detail-queue-chip {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-primary, #0071e3);
  font-weight: 700;
  font-size: 1.125rem;
  padding: 6px 12px;
  border-radius: 10px;
  line-height: 1;
}

.detail-body {
  max-height: 68vh;
}

/* Info Chips Strip */
.info-chips-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.info-chip {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  padding: 8px 12px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-chip-label {
  font-size: 0.6875rem;
  color: var(--color-muted, #6e6e73);
}

/* Receipt items box */
.detail-items-box {
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 14px;
  overflow: hidden;
  background: #ffffff;
}

.detail-item-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-surface-alt, #e8e8ed);
}

.detail-item-row:last-child {
  border-bottom: none;
}

.detail-qty-badge {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-ink, #1d1d1f);
  font-weight: 700;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
  flex-shrink: 0;
}

.item-name {
  font-size: 0.9375rem;
}

.item-subtotal-price {
  font-size: 0.9375rem;
  font-weight: 700;
}

.detail-options-list {
  padding-left: 4px;
}

.option-row {
  padding: 2px 0;
}

.detail-note-box {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  padding: 3px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
}

/* Total Box */
.detail-total-box {
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 14px;
}

.detail-total-amount {
  font-size: 1.35rem;
  font-weight: 700;
}

/* Technical info */
.technical-accordion details summary {
  outline: none;
  user-select: none;
}

.tech-content {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-surface-alt, #e8e8ed);
  border-radius: 8px;
  word-break: break-all;
}

/* Footer Actions */
.apple-pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 980px;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 8px 18px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3);
  color: #ffffff;
}

.apple-pill-btn--primary:hover {
  background: var(--color-primary-link, #0066cc);
}

.apple-pill-btn--secondary {
  background: #ffffff;
  color: var(--color-ink, #1d1d1f);
  border-color: var(--color-hairline, #d2d2d7);
}

.apple-pill-btn--secondary:hover {
  background: var(--color-surface-subtle, #fafafc);
  border-color: #b0b0b8;
}

.apple-pill-btn--danger {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fecaca;
}

.apple-pill-btn--danger:hover {
  background: #fecaca;
}

/* Typography & Utilities */
.font-code {
  font-family: var(--app-font-code, monospace);
}

.font-tabular {
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-variant-numeric: tabular-nums;
}

.font-weight-500 {
  font-weight: 500;
}

.font-weight-600 {
  font-weight: 600;
}

.font-weight-700 {
  font-weight: 700;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

.min-width-0 {
  min-width: 0;
}
</style>
