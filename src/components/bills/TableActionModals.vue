<template>
  <div>
    <!-- Quick Confirm Clear Table Dialog -->
    <q-dialog
      :model-value="showConfirmClear"
      @update:model-value="$emit('update:showConfirmClear', $event)"
    >
      <q-card class="apple-action-dialog-card q-pa-md text-center">
        <q-card-section class="q-pb-xs">
          <div class="action-icon-circle action-icon-circle--purple q-mx-auto q-mb-sm">
            <q-icon name="cleaning_services" size="28px" />
          </div>
          <div class="dialog-title text-ink">ยืนยันการเคลียร์โต๊ะ?</div>
          <div class="text-body2 text-weight-bold text-ink q-mt-xs">
            {{ tableToClear?.table.name }} ชำระเงินเรียบร้อยแล้ว
          </div>
          <div class="text-caption text-muted q-mt-sm">
            การเคลียร์โต๊ะจะปิดบิลเซสชันนี้ และเปลี่ยนสถานะกลับเป็น
            <strong class="text-positive">"โต๊ะว่าง"</strong> เพื่อพร้อมรับลูกค้ารายถัดไป
          </div>
        </q-card-section>

        <q-card-actions align="stretch" class="column q-gutter-y-xs q-mt-md">
          <q-btn
            unelevated
            no-caps
            class="apple-pill-btn apple-pill-btn--purple full-width"
            label="ยืนยันเคลียร์โต๊ะ / เปิดรับลูกค้าใหม่"
            :loading="isClearing"
            @click="$emit('confirm-clear')"
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

    <!-- Quick Confirm Cancel / Reset Seated Session Dialog -->
    <q-dialog
      :model-value="showConfirmCancel"
      @update:model-value="$emit('update:showConfirmCancel', $event)"
    >
      <q-card class="apple-action-dialog-card q-pa-md text-center">
        <q-card-section class="q-pb-xs">
          <div class="action-icon-circle action-icon-circle--red q-mx-auto q-mb-sm">
            <q-icon name="person_remove" size="28px" />
          </div>
          <div class="dialog-title text-ink">ยืนยันยกเลิกการเปิดโต๊ะ?</div>
          <div class="text-body2 text-weight-bold text-ink q-mt-xs">
            {{ tableToCancel?.table.name }} (ยังไม่มีรายการสั่งอาหาร)
          </div>
          <div class="text-caption text-muted q-mt-sm">
            การยกเลิกจะปิดเซสชันนี้ และเปลี่ยนสถานะกลับเป็น
            <strong class="text-positive">"โต๊ะว่าง"</strong> ทันที
            เพื่อให้ลูกค้าหรือพนักงานสามารถเปิดโต๊ะใหม่ได้
          </div>
        </q-card-section>

        <q-card-actions align="stretch" class="column q-gutter-y-xs q-mt-md">
          <q-btn
            unelevated
            no-caps
            class="apple-pill-btn apple-pill-btn--negative full-width"
            label="ยืนยันยกเลิกเซสชัน (คืนโต๊ะว่าง)"
            :loading="isCancelling"
            @click="$emit('confirm-cancel')"
          />
          <q-btn
            flat
            no-caps
            label="ยกเลิก / ปิดหน้าต่าง"
            v-close-popup
            class="apple-pill-btn apple-pill-btn--flat full-width text-muted"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import type { TableCardItem } from 'src/types/tableCard';

defineProps<{
  showConfirmClear: boolean;
  tableToClear: TableCardItem | null;
  isClearing: boolean;
  showConfirmCancel: boolean;
  tableToCancel: TableCardItem | null;
  isCancelling: boolean;
}>();

defineEmits<{
  (e: 'update:showConfirmClear', val: boolean): void;
  (e: 'confirm-clear'): void;
  (e: 'update:showConfirmCancel', val: boolean): void;
  (e: 'confirm-cancel'): void;
}>();
</script>

<style scoped>
.apple-action-dialog-card {
  width: 100%;
  max-width: 400px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
}

.action-icon-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon-circle--purple {
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
}

.action-icon-circle--red {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.dialog-title {
  font-size: 1.25rem;
  font-weight: 700;
}

.apple-pill-btn {
  border-radius: 980px !important;
  font-size: 0.875rem;
  font-weight: 600;
  height: 40px;
  transition: all 0.2s ease;
}

.apple-pill-btn--purple {
  background: #8b5cf6 !important;
  color: #ffffff !important;
}

.apple-pill-btn--purple:hover {
  background: #7c3aed !important;
}

.apple-pill-btn--negative {
  background: #dc2626 !important;
  color: #ffffff !important;
}

.apple-pill-btn--negative:hover {
  background: #b91c1c !important;
}

.apple-pill-btn--flat {
  background: transparent !important;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}
</style>
