<template>
  <span class="status-badge" :class="`status-${statusKey}`">
    <q-icon v-if="showIcon" :name="iconName" size="14px" class="q-mr-xs" />
    <span class="status-label">{{ displayLabel }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { OrderStatus } from 'src/types/enums';
import { CustomerStatusLabel } from 'src/types/enums';
import { STATUS_ICONS, OWNER_STATUS_LABELS } from 'src/utils/constants';

const props = withDefaults(
  defineProps<{
    status: string;
    mode?: 'customer' | 'owner' | 'raw';
    customLabel?: string;
    showIcon?: boolean;
  }>(),
  {
    mode: 'customer',
    showIcon: true,
  },
);

const statusKey = computed(() => props.status?.toLowerCase() || 'default');

const displayLabel = computed(() => {
  if (props.customLabel) return props.customLabel;

  if (props.mode === 'customer') {
    return CustomerStatusLabel[props.status as OrderStatus] || props.status;
  }

  if (props.mode === 'owner') {
    return OWNER_STATUS_LABELS[props.status] || props.status;
  }

  return props.status;
});

const iconName = computed(() => {
  return STATUS_ICONS[props.status] || 'fiber_manual_record';
});
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  letter-spacing: 0;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.status-queued {
  background-color: var(--color-status-queued-bg);
  color: var(--color-status-queued);
  border-color: rgba(0, 113, 227, 0.18);
}

.status-preparing {
  background-color: var(--color-status-preparing-bg);
  color: var(--color-status-preparing);
  border-color: rgba(180, 83, 9, 0.2);
}

.status-prepared {
  background-color: var(--color-status-prepared-bg);
  color: var(--color-status-prepared);
  border-color: rgba(21, 128, 61, 0.2);
}

.status-served {
  background-color: var(--color-status-served-bg);
  color: var(--color-status-served);
  border-color: rgba(71, 85, 105, 0.15);
}

.status-soldout,
.status-inactive {
  background-color: var(--color-status-soldout-bg);
  color: var(--color-status-soldout);
  border-color: rgba(220, 38, 38, 0.2);
}

.status-active {
  background-color: var(--color-status-prepared-bg);
  color: var(--color-status-prepared);
  border-color: rgba(21, 128, 61, 0.2);
}

.status-default {
  background-color: var(--color-surface-footer);
  color: var(--color-text-secondary);
  border-color: var(--color-hairline);
}
</style>
