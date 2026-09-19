<template>
  <q-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <q-card class="apple-category-modal">
      <!-- Modal Header -->
      <div class="row items-center justify-between q-pa-md">
        <div class="row items-center">
          <div class="header-icon-circle q-mr-sm">
            <q-icon name="category" size="20px" color="primary" />
          </div>
          <div>
            <div class="text-h6 text-weight-bold text-ink">
              {{ isEditing ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่' }}
            </div>
            <div class="text-caption text-muted">
              {{
                isEditing
                  ? 'แก้ไขชื่อและสถานะของหมวดหมู่'
                  : 'สร้างหมวดหมู่ใหม่เพื่อจัดกลุ่มเมนูอาหาร'
              }}
            </div>
          </div>
        </div>
        <q-btn flat dense round icon="close" color="grey-6" v-close-popup />
      </div>

      <q-separator class="separator-hairline" />

      <!-- Form Body -->
      <q-card-section class="q-pa-md q-gutter-y-md">
        <div>
          <div class="field-label q-mb-xs">ชื่อหมวดหมู่ <span class="text-negative">*</span></div>
          <q-input
            v-model="name"
            outlined
            dense
            placeholder="เช่น อาหารจานเดียว, ของทานเล่น, เครื่องดื่ม"
            autofocus
            class="apple-input"
            @keyup.enter="handleSave"
          />
        </div>

        <div class="row items-center justify-between q-pa-sm bg-surface-subtle rounded-borders">
          <span class="text-body2 text-ink">เปิดใช้งานหมวดหมู่นี้</span>
          <q-toggle v-model="isActive" color="primary" />
        </div>
      </q-card-section>

      <q-separator class="separator-hairline" />

      <!-- Footer Actions -->
      <div class="row items-center justify-end q-pa-md q-gutter-sm">
        <q-btn
          flat
          label="ยกเลิก"
          no-caps
          v-close-popup
          class="apple-pill-btn apple-pill-btn--secondary"
        />
        <q-btn
          unelevated
          color="primary"
          label="บันทึกหมวดหมู่"
          no-caps
          class="apple-pill-btn apple-pill-btn--primary"
          :loading="isSaving"
          @click="handleSave"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { MenuCategory } from 'src/types/database';
import { useNotify } from 'src/composables/useNotify';

const props = defineProps<{
  modelValue: boolean;
  isEditing: boolean;
  isSaving: boolean;
  category: MenuCategory | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'save', data: { name: string; is_active: boolean }): void;
}>();

const { notifyError } = useNotify();

const name = ref('');
const isActive = ref(true);

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      if (props.category) {
        name.value = props.category.name;
        isActive.value = props.category.is_active;
      } else {
        name.value = '';
        isActive.value = true;
      }
    }
  },
);

function handleSave() {
  if (!name.value.trim()) {
    notifyError('กรุณากรอกชื่อหมวดหมู่');
    return;
  }
  emit('save', {
    name: name.value.trim(),
    is_active: isActive.value,
  });
}
</script>

<style scoped>
.apple-category-modal {
  min-width: 320px;
  max-width: 440px;
  width: 100%;
  border-radius: var(--radius-xl, 28px);
  background: var(--color-surface, #ffffff);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.14);
}

.header-icon-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 113, 227, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.separator-hairline {
  background: var(--color-hairline, #d2d2d7);
  opacity: 0.6;
}

.field-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-body, #414143);
}

.apple-input :deep(.q-field__control) {
  border-radius: var(--radius-md, 11px);
  border-color: var(--color-hairline, #d2d2d7);
  background: var(--color-surface, #ffffff);
}

.apple-input :deep(.q-field__control):hover {
  border-color: var(--color-primary-tint, rgba(0, 113, 227, 0.3));
}

.apple-input :deep(.q-field__control--focused) {
  border-color: var(--color-primary, #0071e3) !important;
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15) !important;
}

.apple-pill-btn {
  border-radius: var(--radius-pill, 980px) !important;
  font-size: 0.875rem;
  font-weight: 600;
  height: 38px;
  padding: 0 18px;
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
}

.apple-pill-btn--secondary {
  background: var(--color-surface-alt, #e8e8ed) !important;
  color: var(--color-ink, #1d1d1f) !important;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

.bg-surface-subtle {
  background: var(--color-surface-subtle, #fafafc);
}
</style>
