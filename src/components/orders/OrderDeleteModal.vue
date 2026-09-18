<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
    transition-show="scale"
    transition-hide="scale"
  >
    <q-card v-if="order" class="apple-delete-card">
      <q-card-section class="text-center q-pt-lg q-pb-none">
        <div class="delete-icon-circle q-mx-auto q-mb-md">
          <q-icon name="delete_forever" size="32px" color="negative" />
        </div>
        <div class="text-h6 font-weight-700 text-ink">ยืนยันการลบออเดอร์?</div>
        <div class="text-subtitle2 text-primary font-code q-mt-xs">
          คิว #{{ formatQueueNum(order.queue_number) }} ({{ destinationName }})
        </div>
      </q-card-section>

      <q-card-section class="q-px-lg q-py-md">
        <div class="delete-warning-box q-pa-md">
          <div class="row items-center text-negative font-weight-600 q-mb-xs">
            <q-icon name="warning" size="18px" class="q-mr-xs" />
            <span>คำเตือน: การลบข้อมูลทั้งหมดที่เกี่ยวข้อง (Cascade Clear)</span>
          </div>
          <p class="text-caption text-muted q-mb-xs">
            การดำเนินการนี้จะทำการลบข้อมูลออกจากระบบอย่างถาวร ได้แก่:
          </p>
          <ul class="delete-checklist q-my-none text-caption text-muted">
            <li>ลบรายการออเดอร์และรายการอาหารทั้งหมดในออเดอร์นี้</li>
            <li>ลบบิล (Bill) และยอดรวมการชำระเงินที่เกี่ยวข้อง</li>
            <li>ล้างเซสชันของโต๊ะ คืนสถานะ <strong>"โต๊ะว่าง"</strong> ทันที</li>
          </ul>
        </div>
      </q-card-section>

      <q-card-actions align="center" class="q-pb-lg q-px-lg q-gutter-sm">
        <button
          type="button"
          class="apple-pill-btn apple-pill-btn--secondary q-px-lg"
          :disabled="isDeleting"
          @click="$emit('update:modelValue', false)"
        >
          <span>ยกเลิก</span>
        </button>
        <button
          type="button"
          class="apple-pill-btn apple-pill-btn--danger q-px-lg"
          :disabled="isDeleting"
          @click="$emit('confirm')"
        >
          <q-spinner v-if="isDeleting" size="16px" class="q-mr-xs" />
          <q-icon v-else name="delete" size="16px" class="q-mr-xs" />
          <span>ยืนยันการลบและล้างข้อมูล</span>
        </button>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { OrderWithItems } from 'src/types/database';

const props = defineProps<{
  modelValue: boolean;
  order: OrderWithItems | null;
  isDeleting: boolean;
}>();

defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'confirm'): void;
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
.apple-delete-card {
  width: 100%;
  max-width: 480px;
  border-radius: 24px;
  background: var(--color-surface, #ffffff);
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--color-hairline, #d2d2d7);
}

.delete-icon-circle {
  width: 58px;
  height: 58px;
  border-radius: 980px;
  background: #fee2e2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-warning-box {
  background: #fff5f5;
  border: 1px solid #ffcdd2;
  border-radius: 14px;
}

.delete-checklist {
  padding-left: 18px;
  line-height: 1.6;
}

.delete-checklist li {
  margin-bottom: 2px;
}

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

.apple-pill-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.apple-pill-btn--secondary {
  background: #ffffff;
  color: var(--color-ink, #1d1d1f);
  border-color: var(--color-hairline, #d2d2d7);
}

.apple-pill-btn--secondary:hover:not(:disabled) {
  background: var(--color-surface-subtle, #fafafc);
  border-color: #b0b0b8;
}

.apple-pill-btn--danger {
  background: #dc2626;
  color: #ffffff;
}

.apple-pill-btn--danger:hover:not(:disabled) {
  background: #b91c1c;
}

.font-code {
  font-family: var(--app-font-code, monospace);
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
</style>
