<template>
  <div class="apple-quick-add-card q-pa-md">
    <div class="row items-center justify-between q-mb-sm">
      <div class="row items-center no-wrap">
        <div class="quick-icon-wrap q-mr-sm">
          <q-icon name="local_bar" size="18px" color="primary" />
        </div>
        <span class="quick-title">เพิ่มเครื่องดื่มท้ายบิล</span>
      </div>
      <span class="quick-badge">บวกเข้าบิลทันที</span>
    </div>

    <div class="column q-gutter-y-xs q-mt-xs">
      <!-- Soft drink (can) -->
      <div class="drink-row row items-center justify-between q-pa-sm">
        <div class="row items-center no-wrap col ellipsis q-mr-sm">
          <div class="drink-badge-icon drink-badge-icon--can q-mr-sm">🥤</div>
          <div class="ellipsis">
            <div class="drink-name ellipsis">น้ำอัดลมกระป๋อง</div>
            <div class="drink-price font-mono">{{ formatPrice(20) }}</div>
          </div>
        </div>
        <q-btn
          unelevated
          no-caps
          size="sm"
          icon="add"
          label="เพิ่ม 1 กป."
          :loading="isAddingDrink === 'can'"
          @click="$emit('add-drink', 'น้ำอัดลมกระป๋อง', 20, 'can')"
          class="apple-pill-btn apple-pill-btn--primary"
        />
      </div>

      <!-- Plain water -->
      <div class="drink-row row items-center justify-between q-pa-sm">
        <div class="row items-center no-wrap col ellipsis q-mr-sm">
          <div class="drink-badge-icon drink-badge-icon--plain q-mr-sm">🫗</div>
          <div class="ellipsis">
            <div class="drink-name ellipsis">น้ำเปล่า</div>
            <div class="drink-price font-mono">{{ formatPrice(10) }}</div>
          </div>
        </div>
        <q-btn
          unelevated
          no-caps
          size="sm"
          icon="add"
          label="เพิ่ม 1 แก้ว"
          :loading="isAddingDrink === 'plain'"
          @click="$emit('add-drink', 'น้ำเปล่า', 10, 'plain')"
          class="apple-pill-btn apple-pill-btn--primary"
        />
      </div>

      <!-- Bottled water -->
      <div class="drink-row row items-center justify-between q-pa-sm">
        <div class="row items-center no-wrap col ellipsis q-mr-sm">
          <div class="drink-badge-icon drink-badge-icon--water q-mr-sm">💧</div>
          <div class="ellipsis">
            <div class="drink-name ellipsis">น้ำขวด</div>
            <div class="drink-price font-mono">{{ formatPrice(25) }}</div>
          </div>
        </div>
        <q-btn
          unelevated
          no-caps
          size="sm"
          icon="add"
          label="เพิ่ม 1 ขวด"
          :loading="isAddingDrink === 'water'"
          @click="$emit('add-drink', 'น้ำขวด', 25, 'water')"
          class="apple-pill-btn apple-pill-btn--primary"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatPrice } from 'src/utils/formatters';

defineProps<{
  isAddingDrink?: string | null;
}>();

defineEmits<{
  (e: 'add-drink', name: string, price: number, type: string): void;
}>();
</script>

<style scoped>
.apple-quick-add-card {
  background: var(--color-surface, #ffffff);
  border-radius: 20px;
  border: 1px solid var(--color-hairline, #d2d2d7);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
}

.quick-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(0, 113, 227, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-ink, #1d1d1f);
}

.quick-badge {
  font-size: 0.6875rem;
  color: var(--color-muted, #6e6e73);
}

.drink-row {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #e8e8ed);
  border-radius: 12px;
  transition: all 0.15s ease;
}

.drink-row:hover {
  background: #ffffff;
  border-color: #b0b0b8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.drink-badge-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.drink-badge-icon--can {
  background: rgba(239, 68, 68, 0.1);
}

.drink-badge-icon--plain {
  background: rgba(16, 185, 129, 0.1);
}

.drink-badge-icon--water {
  background: rgba(0, 113, 227, 0.1);
}

.drink-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink, #1d1d1f);
}

.drink-price {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary, #0071e3);
}

.font-mono {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

/* Apple Pill Button */
.apple-pill-btn {
  border-radius: 980px !important;
  font-size: 0.75rem;
  font-weight: 600;
  height: 32px;
  padding: 0 12px;
  transition: all 0.18s ease;
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
}

.apple-pill-btn--primary:hover {
  background: #0066cc !important;
  transform: translateY(-1px);
}
</style>
