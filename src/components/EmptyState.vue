<template>
  <div class="empty-state column items-center justify-center text-center q-pa-xl">
    <div class="empty-icon-circle q-mb-md">
      <q-icon :name="icon" size="44px" color="primary" />
    </div>
    <div class="empty-title text-weight-bold q-mb-xs">{{ title }}</div>
    <p v-if="description" class="empty-desc text-grey-7 q-mb-md">{{ description }}</p>
    <slot name="action">
      <q-btn
        v-if="actionLabel"
        color="primary"
        unelevated
        no-caps
        rounded
        :to="actionTo"
        @click="$emit('action')"
        class="empty-btn"
      >
        {{ actionLabel }}
      </q-btn>
    </slot>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string;
    title: string;
    description?: string;
    actionLabel?: string;
    actionTo?: string;
  }>(),
  {
    icon: 'restaurant_menu',
  },
);

defineEmits<{
  (e: 'action'): void;
}>();
</script>

<style scoped>
.empty-state {
  min-height: 280px;
}

.empty-icon-circle {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-title {
  font-size: 1.15rem;
  color: var(--color-text-primary);
}

.empty-desc {
  font-size: 0.9rem;
  max-width: 320px;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.empty-btn {
  padding: 8px 24px;
  font-weight: 600;
  border-radius: var(--radius-pill);
}
</style>
