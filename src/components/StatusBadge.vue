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
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.status-queued {
  background-color: var(--color-status-queued-bg);
  color: var(--color-status-queued);
}

.status-preparing {
  background-color: var(--color-status-preparing-bg);
  color: var(--color-status-preparing);
}

.status-prepared {
  background-color: var(--color-status-prepared-bg);
  color: var(--color-status-prepared);
}

.status-served {
  background-color: var(--color-status-served-bg);
  color: var(--color-status-served);
}

.status-soldout,
.status-inactive {
  background-color: var(--color-status-soldout-bg);
  color: var(--color-status-soldout);
}

.status-active {
  background-color: var(--color-status-prepared-bg);
  color: var(--color-status-prepared);
}

.status-default {
  background-color: var(--color-surface-subtle);
  color: var(--color-text-secondary);
}
</style>
