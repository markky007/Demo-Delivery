<template>
  <div class="order-header-section q-mb-lg">
    <div class="row items-center justify-between wrap q-gutter-y-md">
      <!-- Title & Live Status -->
      <div>
        <div class="row items-center q-gutter-x-sm">
          <h1 class="page-heading q-my-none">จัดการออเดอร์</h1>
          <div
            class="apple-live-badge"
            :class="
              isRealtimeConnected ? 'apple-live-badge--connected' : 'apple-live-badge--offline'
            "
          >
            <span class="live-dot" :class="{ 'live-dot--active': isRealtimeConnected }"></span>
            <span class="text-caption text-weight-bold">
              {{ isRealtimeConnected ? 'เชื่อมต่อเรียลไทม์' : 'ออฟไลน์' }}
            </span>
          </div>
        </div>
        <p class="page-subheading q-mb-none q-mt-xs">
          ตรวจสอบประวัติ ค้นหาออเดอร์ ติดตามสถานะในครัว และจัดการบิลโต๊ะ
        </p>
      </div>

      <!-- Action Group -->
      <div class="row items-center q-gutter-sm flex-wrap">
        <!-- Apple Segmented Control for View Mode -->
        <div class="apple-segmented-control" role="tablist" aria-label="สลับมุมมอง">
          <button
            type="button"
            class="segmented-pill-btn"
            :class="{ 'segmented-pill-btn--active': viewMode === 'cards' }"
            @click="$emit('update:viewMode', 'cards')"
          >
            <q-icon name="grid_view" size="17px" class="q-mr-xs" />
            <span>มุมมองการ์ด</span>
          </button>
          <button
            type="button"
            class="segmented-pill-btn"
            :class="{ 'segmented-pill-btn--active': viewMode === 'table' }"
            @click="$emit('update:viewMode', 'table')"
          >
            <q-icon name="table_rows" size="17px" class="q-mr-xs" />
            <span>มุมมองตาราง</span>
          </button>
        </div>

        <!-- Refresh Button -->
        <q-btn
          unelevated
          dense
          no-caps
          :loading="isLoading"
          class="apple-pill-btn apple-pill-btn--secondary q-px-md"
          @click="$emit('refresh')"
        >
          <q-icon name="refresh" size="18px" class="q-mr-xs" />
          <span>รีเฟรช</span>
          <q-tooltip class="bg-dark">รีเฟรชข้อมูลออเดอร์</q-tooltip>
        </q-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  viewMode: 'cards' | 'table';
  isRealtimeConnected: boolean;
  isLoading: boolean;
}>();

defineEmits<{
  (e: 'update:viewMode', mode: 'cards' | 'table'): void;
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

/* Apple Live Badge */
.apple-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 980px;
  transition: all 0.2s ease;
}

.apple-live-badge--connected {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.apple-live-badge--offline {
  background: #f5f5f7;
  color: #86868b;
  border: 1px solid #d2d2d7;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #86868b;
  display: inline-block;
}

.live-dot--active {
  background-color: #34c759;
  box-shadow: 0 0 8px rgba(52, 199, 89, 0.6);
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
  background: var(--color-surface-alt, #e8e8ed);
  padding: 3px;
  border-radius: 980px;
  gap: 2px;
}

.segmented-pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-muted, #6e6e73);
  padding: 6px 14px;
  border-radius: 980px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.segmented-pill-btn:hover:not(.segmented-pill-btn--active) {
  color: var(--color-ink, #1d1d1f);
}

.segmented-pill-btn--active {
  background: #ffffff;
  color: var(--color-ink-strong, #000000);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Apple Pill Button */
.apple-pill-btn {
  border-radius: 980px !important;
  font-size: 0.8125rem;
  font-weight: 500;
  height: 36px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.apple-pill-btn--secondary {
  background: #ffffff !important;
  color: var(--color-ink, #1d1d1f) !important;
  border: 1px solid var(--color-hairline, #d2d2d7);
}

.apple-pill-btn--secondary:hover {
  background: var(--color-surface-subtle, #fafafc) !important;
  border-color: #b0b0b8;
}
</style>
