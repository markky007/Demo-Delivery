<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="apple-modal-card apple-edit-price-card no-print">
      <!-- Modal Header -->
      <q-card-section class="q-pb-sm">
        <div class="row items-center justify-between no-wrap">
          <div class="row items-center q-gutter-x-sm">
            <div class="modal-avatar">
              <q-icon name="price_change" size="22px" color="primary" />
            </div>
            <div>
              <div class="modal-title">แก้ไขราคาอาหาร</div>
              <div class="modal-subtitle">ปรับราคาต่อหน่วยตามหมายเหตุพิเศษหรือตัวเลือกเพิ่มเติม</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup class="text-muted" />
        </div>

        <!-- Dish Summary Card -->
        <div v-if="editingItem" class="dish-summary-card q-mt-md q-pa-sm">
          <div class="row items-center justify-between">
            <div>
              <div class="dish-name">{{ editingItem.snapshot_name }}</div>
              <div class="dish-meta font-mono">
                จำนวน {{ editingItem.quantity }} จาน • ราคาเดิม
                {{ formatPrice(editingItem.snapshot_base_price) }}/จาน
              </div>
            </div>
            <div class="text-right">
              <span class="text-caption text-muted">ยอดรวมเดิม</span>
              <div class="dish-subtotal font-mono">
                {{ formatPrice(editingItem.subtotal) }}
              </div>
            </div>
          </div>

          <!-- Customer Note Highlight -->
          <div v-if="editingItem.special_instruction" class="note-highlight-callout q-pa-xs q-mt-sm">
            <div class="row items-start no-wrap">
              <q-icon name="edit_note" size="18px" color="amber-9" class="q-mr-xs" />
              <div class="text-caption text-amber-10">
                <strong>หมายเหตุจากลูกค้า:</strong> {{ editingItem.special_instruction }}
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Modal Body: Price Editing & Quick Adjustments -->
      <q-card-section class="q-py-sm">
        <label class="input-label q-mb-xs block">
          ราคาตั้งต้นต่อหน่วยใหม่ (฿/จาน):
        </label>
        <q-input
          v-model.number="newBasePrice"
          type="number"
          outlined
          dense
          min="0"
          prefix="฿"
          class="font-mono text-weight-bold apple-input"
          placeholder="ระบุราคาใหม่ต่อจาน"
        >
          <template #append>
            <span class="text-caption text-muted font-sans">/ จาน</span>
          </template>
        </q-input>

        <!-- Quick Increment Pills -->
        <div class="q-mt-sm">
          <div class="text-caption text-muted q-mb-xs">เพิ่ม/ลดราคาด่วน:</div>
          <div class="row q-gutter-xs wrap items-center">
            <button
              v-for="amt in [10, 15, 20, 30, 50, 100]"
              :key="amt"
              type="button"
              class="quick-pill font-mono"
              @click="quickAdjustPrice(amt)"
            >
              +{{ amt }}
            </button>
            <button type="button" class="quick-pill quick-pill--reset" @click="resetPriceToOriginal">
              <q-icon name="restore" size="14px" class="q-mr-xs" />
              <span>คืนค่าเดิม</span>
            </button>
          </div>
        </div>

        <!-- Optional Explanation Note -->
        <div class="q-mt-md">
          <label class="input-label q-mb-xs block">
            หมายเหตุประกอบการปรับราคา (ถ้ามี):
          </label>
          <q-input
            v-model="editInstruction"
            outlined
            dense
            placeholder="เช่น เพิ่มหมูกรอบพิเศษ +20"
            class="text-caption apple-input"
          />
        </div>

        <!-- Live Calculation Preview Card -->
        <div v-if="editingItem" class="calc-preview-card q-pa-sm q-mt-md">
          <div class="row justify-between text-caption text-muted q-mb-xs">
            <span>ราคาตั้งต้นใหม่:</span>
            <span class="font-mono font-weight-600 text-ink">
              {{ formatPrice(newBasePrice || 0) }} / จาน
            </span>
          </div>

          <div v-if="itemOptionsTotal > 0" class="row justify-between text-caption text-muted q-mb-xs">
            <span>ตัวเลือกเสริม (Options):</span>
            <span class="font-mono font-weight-600 text-ink">
              +{{ formatPrice(itemOptionsTotal) }} / จาน
            </span>
          </div>

          <div class="row justify-between text-caption text-muted q-mb-xs">
            <span>ราคารวมต่อหน่วย ({{ editingItem.quantity }} จาน):</span>
            <span class="font-mono font-weight-600 text-ink">
              {{ formatPrice(previewUnitTotal) }} × {{ editingItem.quantity }}
            </span>
          </div>

          <div class="divider q-my-xs"></div>

          <div class="row justify-between items-center text-subtitle2 q-pt-xs">
            <span class="text-weight-bold text-ink">ยอดรวมรายการใหม่:</span>
            <div class="text-right">
              <span class="font-mono text-weight-bolder text-primary text-subtitle1">
                {{ formatPrice(previewSubtotal) }}
              </span>
              <span
                v-if="priceDiff !== 0"
                class="text-caption q-ml-xs font-mono font-weight-600"
                :class="priceDiff > 0 ? 'text-positive' : 'text-negative'"
              >
                ({{ priceDiff > 0 ? '+' : '' }}{{ formatPrice(priceDiff) }})
              </span>
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Modal Actions -->
      <q-card-actions align="stretch" class="column q-gutter-y-xs q-pa-md">
        <q-btn
          unelevated
          no-caps
          :label="`ยืนยันปรับราคาเป็น ${formatPrice(previewSubtotal)}`"
          :loading="isSavingPrice"
          @click="handleConfirm"
          class="apple-pill-btn apple-pill-btn--primary full-width font-weight-600"
        />
        <q-btn
          flat
          no-caps
          label="ยกเลิก"
          v-close-popup
          class="apple-pill-btn apple-pill-btn--flat full-width text-muted"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { OrderItemWithOptions } from 'src/types/database';
import { formatPrice } from 'src/utils/formatters';

const props = defineProps<{
  modelValue: boolean;
  editingItem: OrderItemWithOptions | null;
  isSavingPrice?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (
    e: 'confirm-update',
    payload: { itemId: string; newBasePrice: number; newSubtotal: number; instruction: string },
  ): void;
}>();

const newBasePrice = ref<number>(0);
const editInstruction = ref<string>('');

watch(
  () => props.editingItem,
  (item) => {
    if (item) {
      newBasePrice.value = item.snapshot_base_price;
      editInstruction.value = item.special_instruction || '';
    }
  },
  { immediate: true },
);

const itemOptionsTotal = computed(() => {
  if (!props.editingItem?.options) return 0;
  return props.editingItem.options.reduce(
    (sum, opt) => sum + (opt.snapshot_price_adjustment || 0),
    0,
  );
});

const previewUnitTotal = computed(() => (newBasePrice.value || 0) + itemOptionsTotal.value);
const previewSubtotal = computed(
  () => previewUnitTotal.value * (props.editingItem?.quantity || 1),
);
const priceDiff = computed(() => previewSubtotal.value - (props.editingItem?.subtotal || 0));

function quickAdjustPrice(amount: number) {
  newBasePrice.value = Math.max(0, (newBasePrice.value || 0) + amount);
}

function resetPriceToOriginal() {
  if (props.editingItem) {
    newBasePrice.value = props.editingItem.snapshot_base_price;
  }
}

function handleConfirm() {
  if (!props.editingItem) return;
  emit('confirm-update', {
    itemId: props.editingItem.id,
    newBasePrice: newBasePrice.value,
    newSubtotal: previewSubtotal.value,
    instruction: editInstruction.value,
  });
}
</script>

<style scoped>
.apple-modal-card {
  width: 100%;
  max-width: 480px;
  border-radius: 24px;
  background: var(--color-surface, #ffffff);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
}

.modal-avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(0, 113, 227, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title {
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--color-ink, #1d1d1f);
}

.modal-subtitle {
  font-size: 0.75rem;
  color: var(--color-muted, #6e6e73);
}

.dish-summary-card {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #e8e8ed);
  border-radius: 14px;
}

.dish-name {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-ink, #1d1d1f);
}

.dish-meta {
  font-size: 0.75rem;
  color: var(--color-muted, #6e6e73);
}

.dish-subtotal {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-ink, #1d1d1f);
}

.note-highlight-callout {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.22);
  border-radius: 8px;
}

.input-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink, #1d1d1f);
}

.apple-input :deep(.q-field__control) {
  border-radius: 11px;
  background: #ffffff;
  border: 1px solid var(--color-hairline, #d2d2d7);
}

.quick-pill {
  border: 1px solid var(--color-hairline, #d2d2d7);
  background: var(--color-surface, #ffffff);
  color: var(--color-ink, #1d1d1f);
  padding: 3px 10px;
  border-radius: 980px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
}

.quick-pill:hover {
  border-color: var(--color-primary, #0071e3);
  color: var(--color-primary, #0071e3);
  background: rgba(0, 113, 227, 0.04);
}

.quick-pill--reset {
  display: inline-flex;
  align-items: center;
  color: var(--color-muted, #6e6e73);
  background: var(--color-surface-alt, #e8e8ed);
  border-color: transparent;
}

.quick-pill--reset:hover {
  background: #d8d8de;
  color: var(--color-ink, #1d1d1f);
}

.calc-preview-card {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #e8e8ed);
  border-radius: 14px;
}

.divider {
  height: 1px;
  background: var(--color-hairline, #e8e8ed);
}

.font-mono {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.font-sans {
  font-family: var(--app-font-family, sans-serif);
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

/* Apple Pill Buttons */
.apple-pill-btn {
  border-radius: 980px !important;
  font-size: 0.875rem;
  font-weight: 600;
  height: 42px;
  transition: all 0.18s ease;
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
}

.apple-pill-btn--primary:hover {
  background: #0066cc !important;
}

.apple-pill-btn--flat {
  background: transparent !important;
}
</style>
