<template>
  <div class="bills-header-section q-mb-lg">
    <div class="row items-center justify-between wrap q-gutter-y-md">
      <!-- Title & Subtitle -->
      <div>
        <div class="row items-center q-gutter-x-sm">
          <h1 class="page-heading q-my-none">บิลและโต๊ะที่เปิดอยู่</h1>
          <div class="apple-live-badge">
            <span class="live-dot"></span>
            <span class="text-caption text-weight-bold">เรียลไทม์</span>
          </div>
        </div>
        <p class="page-subheading q-mb-none q-mt-xs">
          ติดตามสถานะโต๊ะ ออเดอร์ในครัว และการเช็กบิลชำระเงินแบบเรียลไทม์
          <span v-if="lastRefreshedText" class="text-muted">
            • อัปเดตล่าสุด: {{ lastRefreshedText }}
          </span>
        </p>
      </div>

      <!-- Action Group -->
      <div class="row items-center q-gutter-sm flex-wrap">
        <!-- Apple Segmented Control for View Mode -->
        <div class="apple-segmented-control" role="tablist" aria-label="สลับมุมมอง">
          <button
            type="button"
            class="segmented-pill-btn"
            :class="{ 'segmented-pill-btn--active': viewMode === 'floorplan' }"
            @click="$emit('update:viewMode', 'floorplan')"
          >
            <q-icon name="table_restaurant" size="17px" class="q-mr-xs" />
            <span>ผังโต๊ะอาหาร</span>
          </button>
          <button
            type="button"
            class="segmented-pill-btn"
            :class="{ 'segmented-pill-btn--active': viewMode === 'card' }"
            @click="$emit('update:viewMode', 'card')"
          >
            <q-icon name="grid_view" size="17px" class="q-mr-xs" />
            <span>มุมมองการ์ด</span>
          </button>
        </div>

        <!-- Refresh Data Button -->
        <q-btn
          unelevated
          dense
          no-caps
          :loading="isRefreshing"
          @click="$emit('refresh')"
          class="apple-pill-btn apple-pill-btn--secondary q-px-md"
        >
          <q-icon name="refresh" size="18px" class="q-mr-xs" />
          <span>รีเฟรช</span>
          <q-tooltip>รีเฟรชข้อมูลล่าสุด</q-tooltip>
        </q-btn>

        <!-- Manage Tables Link -->
        <q-btn
          unelevated
          no-caps
          to="/owner/tables"
          class="apple-pill-btn apple-pill-btn--secondary q-px-md"
        >
          <q-icon name="qr_code_2" size="18px" class="q-mr-xs text-primary" />
          <span>จัดการโต๊ะ & QR</span>
        </q-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  viewMode: 'card' | 'floorplan';
  isRefreshing: boolean;
  lastRefreshedText?: string;
}>();

defineEmits<{
  (e: 'update:viewMode', mode: 'card' | 'floorplan'): void;
  (e: 'refresh'): void;
}>();
</script>

<style scoped>
.page-heading {
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-ink, #1d1d1f);
  letter-spacing: normal;
}

.page-subheading {
  font-size: 0.9375rem;
  line-height: 1.45;
  color: var(--color-muted, #6e6e73);
}

.text-muted {
  color: var(--color-muted-light, #86868b);
}

/* Apple Live Badge */
.apple-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(52, 199, 89, 0.12);
  color: #15803d;
  padding: 3px 9px;
  border-radius: 980px;
  font-size: 0.75rem;
  font-weight: 600;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #34c759;
  box-shadow: 0 0 0 2px rgba(52, 199, 89, 0.3);
  animation: pulse-dot 2s infinite ease-in-out;
}

@keyframes pulse-dot {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.25);
    opacity: 0.75;
  }
}

/* Apple Segmented Control */
.apple-segmented-control {
  display: inline-flex;
  align-items: center;
  background: var(--color-surface-footer, #f5f5f7);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 980px;
  padding: 3px;
  gap: 2px;
}

.segmented-pill-btn {
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  color: var(--color-muted, #6e6e73);
  padding: 6px 14px;
  border-radius: 980px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.segmented-pill-btn:hover:not(.segmented-pill-btn--active) {
  color: var(--color-ink, #1d1d1f);
  background: rgba(0, 0, 0, 0.04);
}

.segmented-pill-btn--active {
  background: #ffffff;
  color: var(--color-ink-strong, #000000);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Apple Pill Button */
.apple-pill-btn {
  display: inline-flex;
  align-items: center;
  border-radius: 980px !important;
  font-size: 0.875rem;
  font-weight: 600;
  height: 36px;
  transition: all 0.2s ease;
}

.apple-pill-btn--secondary {
  background: var(--color-surface-alt, #e8e8ed) !important;
  color: var(--color-ink, #1d1d1f) !important;
}

.apple-pill-btn--secondary:hover {
  background: #dedee3 !important;
}

@media (max-width: 768px) {
  .page-heading {
    font-size: 1.35rem;
  }
  .page-subheading {
    font-size: 0.85rem;
  }
}
</style>
