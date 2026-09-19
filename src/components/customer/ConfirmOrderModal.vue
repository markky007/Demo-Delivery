<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    position="bottom"
    class="confirm-order-dialog"
    maximized-mobile
  >
    <div class="confirm-card">
      <!-- Drag grabber -->
      <div class="confirm-grabber-wrap">
        <div class="confirm-grabber-bar"></div>
      </div>

      <div class="q-px-lg q-pt-sm q-pb-lg text-center">
        <!-- Delivery-Style Cooking / Kitchen Icon -->
        <div class="confirm-icon-wrap q-mx-auto q-mb-md">
          <q-icon name="soup_kitchen" size="32px" color="primary" />
        </div>

        <h5 class="confirm-title q-my-none">ยืนยันส่งออเดอร์เข้าครัว?</h5>
        <p class="confirm-subtitle q-mt-xs q-mb-md">
          กรุณาตรวจสอบความถูกต้องของรายการอาหารและโต๊ะของคุณ
        </p>

        <!-- Summary Receipt Panel -->
        <div class="confirm-receipt-box q-pa-md q-mb-lg text-left">
          <div class="row justify-between items-center q-mb-sm">
            <span class="text-caption text-grey-7">จุดบริการ / โต๊ะอาหาร</span>
            <span class="text-weight-bold text-dark">
              {{ isTakeaway ? `สั่งกลับบ้าน (${customerName || 'ลูกค้า'})` : `${tableName}` }}
            </span>
          </div>

          <div class="row justify-between items-center q-mb-sm">
            <span class="text-caption text-grey-7">จำนวนอาหารทั้งหมด</span>
            <span class="text-weight-bold tabular-nums text-dark">{{ itemCount }} จาน</span>
          </div>

          <div class="confirm-divider q-my-sm"></div>

          <div class="row justify-between items-center">
            <span class="text-subtitle2 text-weight-bold text-dark">ยอดรวมสุทธิ</span>
            <span class="text-h6 text-weight-bolder text-primary tabular-nums">
              {{ formatPrice(totalAmount) }}
            </span>
          </div>
        </div>

        <!-- Reassurance hint -->
        <div class="confirm-hint-banner q-mb-lg row items-center no-wrap">
          <q-icon name="check_circle" size="18px" color="positive" class="q-mr-xs flex-shrink-0" />
          <span class="text-caption text-grey-8 text-left">
            คุณสามารถแก้ไขรายการอาหารได้ในหน้าติดตามสถานะจนกว่าครัวจะเริ่มปรุงอาหาร
          </span>
        </div>

        <!-- Action Buttons -->
        <div class="column q-gutter-y-sm">
          <button
            type="button"
            class="confirm-primary-btn"
            :disabled="isSubmitting"
            @click="$emit('confirm')"
          >
            <div class="row items-center justify-center">
              <q-spinner v-if="isSubmitting" size="20px" class="q-mr-sm" />
              <q-icon v-else name="restaurant" size="20px" class="q-mr-sm" />
              <span>{{ isSubmitting ? 'กำลังส่งออเดอร์...' : 'ยืนยันสั่งอาหาร' }}</span>
            </div>
          </button>

          <button
            type="button"
            class="confirm-cancel-btn"
            :disabled="isSubmitting"
            @click="$emit('update:modelValue', false)"
          >
            กลับไปตรวจทาน
          </button>
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { formatPrice } from 'src/utils/formatters';

defineProps<{
  modelValue: boolean;
  tableName: string;
  customerName?: string;
  isTakeaway: boolean;
  itemCount: number;
  totalAmount: number;
  isSubmitting?: boolean;
}>();

defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
}>();
</script>

<style scoped>
.confirm-order-dialog {
  z-index: 6100;
}

.confirm-card {
  background: var(--color-surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.confirm-grabber-wrap {
  width: 100%;
  padding: 10px 0 4px 0;
  display: flex;
  justify-content: center;
}

.confirm-grabber-bar {
  width: 36px;
  height: 4px;
  background: var(--color-hairline);
  border-radius: var(--radius-pill);
}

.confirm-icon-wrap {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-pill);
  background: #ebf5ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-ink);
  line-height: 1.3;
}

.confirm-subtitle {
  font-size: 0.88rem;
  color: var(--color-body);
}

.confirm-receipt-box {
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
}

.confirm-divider {
  height: 1px;
  background: var(--color-hairline);
  width: 100%;
}

.confirm-hint-banner {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-md);
  padding: 8px 12px;
}

.confirm-primary-btn {
  width: 100%;
  height: 48px;
  background: var(--color-primary);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-pill);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 113, 227, 0.32);
  transition: all 0.15s ease;
}

.confirm-primary-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
  box-shadow: 0 6px 18px rgba(0, 113, 227, 0.4);
}

.confirm-primary-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.confirm-primary-btn:disabled {
  background: #a1a1a6;
  box-shadow: none;
  cursor: not-allowed;
}

.confirm-cancel-btn {
  width: 100%;
  height: 44px;
  background: var(--color-surface-alt);
  color: var(--color-ink);
  border: none;
  border-radius: var(--radius-pill);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.confirm-cancel-btn:hover:not(:disabled) {
  background: #dcdce2;
}

.confirm-cancel-btn:active:not(:disabled) {
  transform: scale(0.98);
}
</style>
