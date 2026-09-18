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
  gap: 8px;
  background: var(--color-surface-footer);
  padding: 3px 5px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-hairline);
}

.quantity-stepper--dense {
  gap: 4px;
  padding: 2px 4px;
}

.stepper-btn {
  background: #ffffff;
  color: var(--color-text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  width: 32px;
  height: 32px;
  min-height: 32px;
  border: 1px solid var(--color-hairline);
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.quantity-stepper--dense .stepper-btn {
  width: 26px;
  height: 26px;
  min-height: 26px;
}

.stepper-btn--add {
  background: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
}

.stepper-btn:hover:not(:disabled) {
  transform: scale(1.04);
}

.stepper-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.quantity-value {
  font-size: 1.05rem;
  font-weight: 600;
  min-width: 28px;
  text-align: center;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.quantity-stepper--dense .quantity-value {
  font-size: 0.9rem;
  min-width: 20px;
}
</style>
