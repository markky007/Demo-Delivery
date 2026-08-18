<template>
  <div class="loading-skeleton-container" :class="`type-${type}`">
    <!-- 1. Menu Grid Skeleton -->
    <div v-if="type === 'menu'" class="skeleton-menu-grid">
      <div v-for="i in count" :key="i" class="skeleton-menu-card">
        <q-skeleton height="145px" square class="skeleton-img" animation="wave" />
        <div class="q-pa-sm">
          <q-skeleton type="text" width="70%" height="20px" class="q-mb-xs" animation="wave" />
          <q-skeleton type="text" width="45%" height="15px" class="q-mb-sm" animation="wave" />
          <div class="row justify-between items-center q-mt-xs">
            <q-skeleton type="text" width="35%" height="22px" animation="wave" />
            <q-skeleton
              type="QBtn"
              width="32px"
              height="32px"
              class="rounded-pill"
              animation="wave"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Product Detail Skeleton -->
    <div v-else-if="type === 'product-detail'" class="skeleton-product-detail">
      <!-- Hero Image -->
      <q-skeleton height="260px" square class="skeleton-hero-img" animation="wave" />

      <div class="skeleton-detail-content q-pa-md">
        <!-- Title & Price -->
        <div class="row justify-between items-start q-mb-md">
          <div class="col-8">
            <q-skeleton type="text" width="80%" height="28px" class="q-mb-xs" animation="wave" />
            <q-skeleton type="text" width="95%" height="16px" animation="wave" />
            <q-skeleton type="text" width="60%" height="16px" animation="wave" />
          </div>
          <q-skeleton type="text" width="70px" height="26px" animation="wave" />
        </div>

        <!-- Option Groups -->
        <div v-for="g in 2" :key="g" class="skeleton-card q-pa-md q-mb-md">
          <div class="row items-center justify-between q-mb-sm">
            <q-skeleton type="text" width="40%" height="20px" animation="wave" />
            <q-skeleton type="QBadge" width="65px" height="20px" animation="wave" />
          </div>
          <q-skeleton type="text" width="50%" height="14px" class="q-mb-md" animation="wave" />

          <div class="q-gutter-y-sm">
            <div v-for="o in 3" :key="o" class="row items-center justify-between q-py-xs">
              <div class="row items-center q-gutter-sm">
                <q-skeleton type="circle" size="18px" animation="wave" />
                <q-skeleton type="text" width="120px" height="18px" animation="wave" />
              </div>
              <q-skeleton type="text" width="45px" height="18px" animation="wave" />
            </div>
          </div>
        </div>

        <!-- Instructions Box Skeleton -->
        <div class="skeleton-card q-pa-md q-mb-xl">
          <q-skeleton type="text" width="30%" height="18px" class="q-mb-sm" animation="wave" />
          <q-skeleton type="rect" height="48px" class="rounded-borders" animation="wave" />
        </div>
      </div>
    </div>

    <!-- 3. Standard List Skeleton (Orders, etc.) -->
    <div v-else-if="type === 'list'" class="q-gutter-y-sm">
      <div v-for="i in count" :key="i" class="skeleton-card q-pa-md">
        <div class="row items-center justify-between q-mb-sm">
          <q-skeleton type="text" width="30%" height="22px" animation="wave" />
          <q-skeleton type="QBadge" width="80px" height="22px" animation="wave" />
        </div>
        <q-skeleton type="text" width="65%" height="16px" class="q-mb-xs" animation="wave" />
        <q-skeleton type="text" width="40%" height="16px" class="q-mb-sm" animation="wave" />
        <div class="row items-center justify-between q-pt-xs">
          <q-skeleton type="text" width="25%" height="14px" animation="wave" />
          <q-skeleton type="text" width="20%" height="18px" animation="wave" />
        </div>
      </div>
    </div>

    <!-- 4. Order / Bill Detail Skeleton -->
    <div
      v-else-if="type === 'order-detail' || type === 'bill-detail'"
      class="skeleton-order-detail q-gutter-y-md"
    >
      <!-- Session Header -->
      <div class="skeleton-card q-pa-md">
        <div class="row items-center justify-between q-mb-xs">
          <q-skeleton type="text" width="45%" height="26px" animation="wave" />
          <q-skeleton type="QBadge" width="90px" height="26px" animation="wave" />
        </div>
        <q-skeleton type="text" width="35%" height="14px" animation="wave" />
      </div>

      <!-- Tracker (for order-detail) -->
      <div v-if="type === 'order-detail'" class="skeleton-card q-pa-md">
        <q-skeleton type="text" width="35%" height="18px" class="q-mb-md" animation="wave" />
        <div class="row items-center justify-between q-px-sm">
          <div v-for="s in 4" :key="s" class="column items-center">
            <q-skeleton type="circle" size="28px" class="q-mb-xs" animation="wave" />
            <q-skeleton type="text" width="50px" height="12px" animation="wave" />
          </div>
        </div>
      </div>

      <!-- Dishes Breakdown -->
      <div class="skeleton-card q-pa-md">
        <q-skeleton type="text" width="40%" height="20px" class="q-mb-md" animation="wave" />
        <div v-for="d in 3" :key="d" class="row justify-between items-center q-py-sm">
          <div class="row items-center q-gutter-sm">
            <q-skeleton type="text" width="25px" height="18px" animation="wave" />
            <q-skeleton type="text" width="140px" height="18px" animation="wave" />
          </div>
          <q-skeleton type="text" width="50px" height="18px" animation="wave" />
        </div>
      </div>

      <!-- Total summary -->
      <div class="skeleton-card q-pa-md">
        <div class="row justify-between items-center q-mb-sm">
          <q-skeleton type="text" width="30%" height="16px" animation="wave" />
          <q-skeleton type="text" width="25%" height="16px" animation="wave" />
        </div>
        <div class="row justify-between items-center">
          <q-skeleton type="text" width="40%" height="24px" animation="wave" />
          <q-skeleton type="text" width="30%" height="28px" animation="wave" />
        </div>
      </div>
    </div>

    <!-- 5. Dashboard Skeleton -->
    <div v-else-if="type === 'dashboard'" class="skeleton-dashboard q-gutter-y-lg">
      <!-- 4 Stats Cards Grid -->
      <div class="skeleton-stats-grid">
        <div v-for="i in 4" :key="i" class="skeleton-stat-card q-pa-md">
          <q-skeleton
            type="rect"
            width="52px"
            height="52px"
            class="rounded-borders"
            animation="wave"
          />
          <div class="col q-ml-md">
            <q-skeleton type="text" width="60%" height="16px" class="q-mb-xs" animation="wave" />
            <q-skeleton type="text" width="85%" height="28px" animation="wave" />
          </div>
        </div>
      </div>

      <!-- Queue Status Grid -->
      <div class="skeleton-card q-pa-md">
        <q-skeleton type="text" width="200px" height="22px" class="q-mb-xs" animation="wave" />
        <q-skeleton type="text" width="160px" height="14px" class="q-mb-md" animation="wave" />
        <div class="skeleton-queue-stats-grid">
          <div v-for="i in 4" :key="i" class="skeleton-queue-box q-pa-md">
            <div class="row items-center justify-between q-mb-sm">
              <q-skeleton type="text" width="50%" height="16px" animation="wave" />
              <q-skeleton type="circle" size="20px" animation="wave" />
            </div>
            <q-skeleton type="text" width="40%" height="32px" class="q-mb-xs" animation="wave" />
            <q-skeleton type="text" width="60%" height="12px" animation="wave" />
          </div>
        </div>
      </div>
    </div>

    <!-- 6. Queue / Kanban Skeleton -->
    <div v-else-if="type === 'queue'" class="skeleton-kanban-grid">
      <div v-for="col in 4" :key="col" class="skeleton-kanban-col">
        <!-- Col Header -->
        <div class="skeleton-col-header q-pa-sm row items-center justify-between">
          <div class="row items-center q-gutter-xs">
            <q-skeleton type="circle" size="18px" animation="wave" />
            <q-skeleton type="text" width="80px" height="20px" animation="wave" />
          </div>
          <q-skeleton type="QBadge" width="28px" height="20px" animation="wave" />
        </div>

        <!-- Col Cards -->
        <div class="q-pa-sm q-gutter-y-sm">
          <div v-for="card in 2" :key="card" class="skeleton-queue-card q-pa-sm">
            <div class="row items-center justify-between q-mb-xs">
              <q-skeleton type="text" width="40px" height="22px" animation="wave" />
              <q-skeleton type="QBadge" width="50px" height="18px" animation="wave" />
            </div>
            <div class="q-my-sm q-gutter-y-xs">
              <q-skeleton type="text" width="85%" height="16px" animation="wave" />
              <q-skeleton type="text" width="60%" height="16px" animation="wave" />
            </div>
            <q-skeleton type="rect" height="34px" class="rounded-borders" animation="wave" />
          </div>
        </div>
      </div>
    </div>

    <!-- 7. Tables Management Grid Skeleton -->
    <div v-else-if="type === 'tables'" class="skeleton-tables-grid">
      <div v-for="i in count" :key="i" class="skeleton-card q-pa-md column items-center">
        <div class="row items-center justify-between full-width q-mb-md">
          <div class="row items-center q-gutter-sm">
            <q-skeleton type="circle" size="24px" animation="wave" />
            <q-skeleton type="text" width="70px" height="22px" animation="wave" />
          </div>
          <q-skeleton type="QBadge" width="70px" height="20px" animation="wave" />
        </div>
        <q-skeleton
          type="rect"
          width="130px"
          height="130px"
          class="rounded-borders q-my-sm"
          animation="wave"
        />
        <q-skeleton type="text" width="80px" height="18px" class="q-mb-md" animation="wave" />
        <div class="row q-gutter-xs justify-center full-width">
          <q-skeleton type="QBtn" width="80px" height="32px" animation="wave" />
          <q-skeleton type="QBtn" width="32px" height="32px" animation="wave" />
        </div>
      </div>
    </div>

    <!-- 8. Options Page Skeleton -->
    <div v-else-if="type === 'options'" class="q-gutter-y-md">
      <div v-for="i in count" :key="i" class="skeleton-card q-pa-md">
        <div class="row items-center justify-between">
          <div class="row items-center q-gutter-md col">
            <q-skeleton
              type="rect"
              width="36px"
              height="36px"
              class="rounded-borders"
              animation="wave"
            />
            <div class="col">
              <div class="row items-center q-gutter-sm q-mb-xs">
                <q-skeleton type="text" width="120px" height="20px" animation="wave" />
                <q-skeleton type="QBadge" width="80px" height="18px" animation="wave" />
              </div>
              <q-skeleton type="text" width="180px" height="14px" animation="wave" />
            </div>
          </div>
          <div class="row items-center q-gutter-xs">
            <q-skeleton type="QBtn" width="32px" height="32px" animation="wave" />
            <q-skeleton type="QBtn" width="32px" height="32px" animation="wave" />
          </div>
        </div>
      </div>
    </div>

    <!-- 9. Welcome Page Skeleton -->
    <div
      v-else-if="type === 'welcome'"
      class="skeleton-welcome-card q-pa-xl column items-center text-center"
    >
      <q-skeleton type="circle" size="72px" class="q-mb-md" animation="wave" />
      <q-skeleton type="text" width="180px" height="32px" class="q-mb-md" animation="wave" />
      <q-skeleton
        type="rect"
        width="140px"
        height="32px"
        class="rounded-borders q-mb-md"
        animation="wave"
      />
      <q-skeleton type="text" width="220px" height="16px" class="q-mb-xl" animation="wave" />
      <q-skeleton type="rect" width="100%" height="48px" class="rounded-borders" animation="wave" />
    </div>

    <!-- 10. Data Table Skeleton -->
    <div v-else-if="type === 'table'" class="skeleton-card q-pa-md">
      <div class="row justify-between items-center q-mb-md q-pb-sm border-bottom">
        <q-skeleton
          v-for="c in 4"
          :key="c"
          type="text"
          width="20%"
          height="20px"
          animation="wave"
        />
      </div>
      <div
        v-for="r in count"
        :key="r"
        class="row justify-between items-center q-py-sm border-bottom-subtle"
      >
        <q-skeleton
          v-for="c in 4"
          :key="c"
          type="text"
          width="18%"
          height="16px"
          animation="wave"
        />
      </div>
    </div>

    <!-- 11. Spinner Fallback (if specifically requested) -->
    <div v-else class="column items-center justify-center q-pa-xl">
      <q-spinner-dots size="48px" color="primary" />
      <div v-if="message" class="text-caption text-grey-6 q-mt-md">{{ message }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?:
      | 'menu'
      | 'product-detail'
      | 'list'
      | 'order-detail'
      | 'bill-detail'
      | 'dashboard'
      | 'queue'
      | 'tables'
      | 'options'
      | 'welcome'
      | 'table'
      | 'spinner';
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
.loading-skeleton-container {
  width: 100%;
}

/* Card Base */
.skeleton-card {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-md, 16px);
  border: 1px solid var(--color-border, #ede5dc);
  box-shadow: var(--shadow-subtle, 0 1px 3px rgba(45, 35, 30, 0.04));
  overflow: hidden;
}

/* Menu Grid */
.skeleton-menu-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

@media (min-width: 600px) {
  .skeleton-menu-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .skeleton-menu-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.skeleton-menu-card {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-md, 16px);
  border: 1px solid var(--color-border, #ede5dc);
  overflow: hidden;
}

.skeleton-img {
  border-radius: 0;
}

/* Product Detail */
.skeleton-product-detail {
  max-width: 600px;
  margin: 0 auto;
}

.skeleton-hero-img {
  width: 100%;
}

/* Dashboard */
.skeleton-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 16px;
}

.skeleton-stat-card {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-md, 16px);
  border: 1px solid var(--color-border, #ede5dc);
  display: flex;
  align-items: center;
}

.skeleton-queue-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.skeleton-queue-box {
  background: var(--color-surface-subtle, #f5efe9);
  border-radius: var(--radius-sm, 10px);
  border: 1px solid var(--color-border-subtle, #f3ede6);
}

/* Kanban Queue */
.skeleton-kanban-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 16px;
}

@media (min-width: 768px) {
  .skeleton-kanban-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1200px) {
  .skeleton-kanban-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.skeleton-kanban-col {
  background: var(--color-surface-subtle, #f8f6f3);
  border-radius: var(--radius-md, 16px);
  border: 1px solid var(--color-border, #ede5dc);
  min-height: 400px;
}

.skeleton-col-header {
  border-bottom: 1px solid var(--color-border, #ede5dc);
}

.skeleton-queue-card {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-sm, 10px);
  border: 1px solid var(--color-border, #ede5dc);
}

/* Tables Grid */
.skeleton-tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

/* Welcome Card */
.skeleton-welcome-card {
  max-width: 440px;
  width: 100%;
  margin: 0 auto;
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-lg, 22px);
  border: 1px solid var(--color-border, #ede5dc);
  box-shadow: var(--shadow-card, 0 4px 16px -2px rgba(45, 35, 30, 0.06));
}

.border-bottom {
  border-bottom: 1px solid var(--color-border, #ede5dc);
}

.border-bottom-subtle {
  border-bottom: 1px solid var(--color-border-subtle, #f3ede6);
}
</style>
