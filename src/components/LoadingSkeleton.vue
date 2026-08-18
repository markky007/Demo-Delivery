<template>
  <div class="loading-skeleton-container" :class="`type-${type}`">
    <!-- Menu Grid Skeleton -->
    <div v-if="type === 'menu'" class="skeleton-grid">
      <div v-for="i in count" :key="i" class="skeleton-card">
        <q-skeleton height="140px" square class="skeleton-img" />
        <div class="q-pa-sm">
          <q-skeleton type="text" width="70%" height="20px" class="q-mb-xs" />
          <q-skeleton type="text" width="40%" height="16px" class="q-mb-sm" />
          <div class="row justify-between items-center">
            <q-skeleton type="text" width="30%" height="22px" />
            <q-skeleton type="QBtn" width="32px" height="32px" />
          </div>
        </div>
      </div>
    </div>

    <!-- List Skeleton -->
    <div v-else-if="type === 'list'" class="q-gutter-y-sm">
      <div v-for="i in count" :key="i" class="skeleton-list-item q-pa-md">
        <div class="row items-center justify-between q-mb-sm">
          <q-skeleton type="text" width="25%" height="24px" />
          <q-skeleton type="QBadge" width="80px" height="24px" />
        </div>
        <q-skeleton type="text" width="60%" height="18px" class="q-mb-xs" />
        <q-skeleton type="text" width="40%" height="18px" />
      </div>
    </div>

    <!-- Spinner Default -->
    <div v-else class="column items-center justify-center q-pa-xl">
      <q-spinner-dots size="48px" color="primary" />
      <div v-if="message" class="text-caption text-grey-6 q-mt-md">{{ message }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'menu' | 'list' | 'spinner';
    count?: number;
    message?: string;
  }>(),
  {
    type: 'spinner',
    count: 4,
  },
);
</script>

<style scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

@media (min-width: 600px) {
  .skeleton-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .skeleton-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.skeleton-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.skeleton-img {
  border-radius: 0;
}

.skeleton-list-item {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
</style>
