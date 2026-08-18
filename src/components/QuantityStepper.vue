<template>
  <div class="quantity-stepper" :class="{ 'quantity-stepper--dense': dense }">
    <q-btn
      round
      unelevated
      :dense="dense"
      :size="dense ? 'sm' : 'md'"
      icon="remove"
      class="stepper-btn"
      :disable="modelValue <= min"
      @click="decrease"
      aria-label="ลดจำนวน"
    />
    <span class="quantity-value" :class="{ 'text-weight-bold': !dense }">{{ modelValue }}</span>
    <q-btn
      round
      unelevated
      :dense="dense"
      :size="dense ? 'sm' : 'md'"
      icon="add"
      class="stepper-btn stepper-btn--add"
      :disable="max !== undefined && modelValue >= max"
      @click="increase"
      aria-label="เพิ่มจำนวน"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: number;
    min?: number;
    max?: number;
    dense?: boolean;
  }>(),
  {
    min: 1,
    dense: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: number): void;
  (e: 'change', val: number): void;
}>();

function decrease() {
  if (props.modelValue > props.min) {
    const newVal = props.modelValue - 1;
    emit('update:modelValue', newVal);
    emit('change', newVal);
  }
}

function increase() {
  if (props.max === undefined || props.modelValue < props.max) {
    const newVal = props.modelValue + 1;
    emit('update:modelValue', newVal);
    emit('change', newVal);
  }
}
</script>

<style scoped>
.quantity-stepper {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: var(--color-surface-subtle);
  padding: 4px 6px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
}

.quantity-stepper--dense {
  gap: 6px;
  padding: 2px 4px;
}

.stepper-btn {
  background: #ffffff;
  color: var(--color-text-primary);
  box-shadow: 0 1px 3px rgba(45, 35, 30, 0.08);
  width: 36px;
  height: 36px;
  min-height: 36px;
}

.quantity-stepper--dense .stepper-btn {
  width: 26px;
  height: 26px;
  min-height: 26px;
}

.stepper-btn--add {
  background: var(--color-primary);
  color: #ffffff;
}

.stepper-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.stepper-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.quantity-value {
  font-size: 1.15rem;
  min-width: 32px;
  text-align: center;
  color: var(--color-text-primary);
}

.quantity-stepper--dense .quantity-value {
  font-size: 0.95rem;
  min-width: 20px;
}
</style>
