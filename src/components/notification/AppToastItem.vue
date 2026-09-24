<template>
  <div
    class="app-toast-item"
    :class="[`app-toast-item--${toast.type}`, { 'is-swiping': isSwiping }]"
    :style="cardStyle"
    role="alert"
    aria-live="assertive"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @touchstart.passive="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @click="handleCardClick"
  >
    <!-- Status Icon Badge -->
    <div class="app-toast-icon-wrap" :class="`icon-bg--${toast.type}`">
      <!-- Fallback custom icon via Quasar q-icon if specified and not standard -->
      <q-icon v-if="toast.icon && isCustomIcon(toast.icon)" :name="toast.icon" size="20px" />

      <!-- High-fidelity custom SVG icons -->
      <svg
        v-else-if="toast.type === 'success'"
        class="toast-svg-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>

      <svg
        v-else-if="toast.type === 'error'"
        class="toast-svg-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>

      <svg
        v-else-if="toast.type === 'warning'"
        class="toast-svg-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>

      <svg
        v-else
        class="toast-svg-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </div>

    <!-- Content: Title, Message, Caption, Actions -->
    <div class="app-toast-content">
      <div v-if="toast.title" class="app-toast-title">
        {{ toast.title }}
      </div>
      <div class="app-toast-message" :class="{ 'app-toast-message--standalone': !toast.title }">
        {{ toast.message }}
      </div>
      <div v-if="toast.caption" class="app-toast-caption">
        {{ toast.caption }}
      </div>

      <!-- Action Buttons -->
      <div v-if="toast.actions && toast.actions.length > 0" class="app-toast-actions">
        <button
          v-for="(action, idx) in toast.actions"
          :key="idx"
          type="button"
          class="app-toast-action-btn"
          :class="`action--${action.variant || 'solid'}`"
          @click.stop="handleActionClick(action)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>

    <!-- Dismiss Button -->
    <button
      v-if="toast.dismissible"
      type="button"
      class="app-toast-close"
      aria-label="Close notification"
      @click.stop="emitDismiss"
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>

    <!-- Visual Timer Progress Bar -->
    <div
      v-if="toast.timeout > 0"
      class="app-toast-progress"
      :class="`progress-bg--${toast.type}`"
      :style="progressBarStyle"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import type { NotificationItem, NotificationAction } from 'src/stores/notificationStore';

const props = defineProps<{
  toast: NotificationItem;
}>();

const emit = defineEmits<{
  (e: 'dismiss', id: string): void;
}>();

// ─── Swipe-to-Dismiss State ──────────────────────────────────────────
const isSwiping = ref(false);
const touchStartX = ref(0);
const touchStartY = ref(0);
const dragX = ref(0);
const dragY = ref(0);

// ─── Timer Progress & Pause on Hover ─────────────────────────────────
const remainingTime = ref(props.toast.timeout);
const isPaused = ref(false);
let lastTimestamp = 0;
let animationFrameId: number | null = null;

const progressPercent = computed(() => {
  if (props.toast.timeout <= 0) return 0;
  return Math.max(0, Math.min(100, (remainingTime.value / props.toast.timeout) * 100));
});

const progressBarStyle = computed(() => ({
  width: `${progressPercent.value}%`,
}));

const cardStyle = computed(() => {
  if (!isSwiping.value && dragY.value === 0 && dragX.value === 0) return {};
  const opacity = Math.max(0.2, 1 - Math.abs(dragY.value) / 100 - Math.abs(dragX.value) / 150);
  return {
    transform: `translate3d(${dragX.value}px, ${dragY.value}px, 0)`,
    opacity: String(opacity),
    transition: isSwiping.value ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
  };
});

function isCustomIcon(iconName: string): boolean {
  // Check if icon is not a standard type name
  return !['check_circle', 'error', 'warning', 'info', 'positive', 'negative'].includes(iconName);
}

function tick(currentTimestamp: number) {
  if (!lastTimestamp) lastTimestamp = currentTimestamp;
  const delta = currentTimestamp - lastTimestamp;
  lastTimestamp = currentTimestamp;

  if (!isPaused.value && props.toast.timeout > 0) {
    remainingTime.value -= delta;
    if (remainingTime.value <= 0) {
      emitDismiss();
      return;
    }
  }

  if (remainingTime.value > 0) {
    animationFrameId = requestAnimationFrame(tick);
  }
}

function handleMouseEnter() {
  isPaused.value = true;
}

function handleMouseLeave() {
  isPaused.value = false;
  lastTimestamp = performance.now();
}

function emitDismiss() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  emit('dismiss', props.toast.id);
}

function handleActionClick(action: NotificationAction) {
  try {
    action.onClick(props.toast);
  } finally {
    emitDismiss();
  }
}

function handleCardClick(e: MouseEvent) {
  if (isSwiping.value || dragX.value !== 0 || dragY.value !== 0) return;
  const target = e.target as HTMLElement | null;
  if (target?.closest('button, a, input, select, textarea, [role="button"]')) return;

  if (props.toast.dismissible !== false) {
    emitDismiss();
  }
}

// ─── Touch Gestures (Swipe to dismiss) ───────────────────────────────
function handleTouchStart(e: TouchEvent) {
  if (!e.touches[0]) return;
  touchStartX.value = e.touches[0].clientX;
  touchStartY.value = e.touches[0].clientY;
  dragX.value = 0;
  dragY.value = 0;
  isPaused.value = true;
}

function handleTouchMove(e: TouchEvent) {
  if (!e.touches[0]) return;
  const currentX = e.touches[0].clientX;
  const currentY = e.touches[0].clientY;
  const dx = currentX - touchStartX.value;
  const dy = currentY - touchStartY.value;

  // Prioritize swipe up or slight horizontal swipe
  if (dy < 0 || Math.abs(dx) > 10) {
    isSwiping.value = true;
    dragX.value = dx * 0.7; // damping
    dragY.value = dy * 0.9;
  }
}

function handleTouchEnd() {
  isSwiping.value = false;
  isPaused.value = false;
  lastTimestamp = performance.now();

  // If swiped up significantly or swiped sideways
  if (dragY.value < -35 || Math.abs(dragX.value) > 70) {
    emitDismiss();
  } else {
    dragX.value = 0;
    dragY.value = 0;
  }
}

onMounted(() => {
  if (props.toast.timeout > 0) {
    lastTimestamp = performance.now();
    animationFrameId = requestAnimationFrame(tick);
  }
});

onBeforeUnmount(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style scoped>
.app-toast-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  max-width: 440px;
  min-width: 320px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(45, 35, 30, 0.08);
  box-shadow:
    0 16px 36px -6px rgba(45, 35, 30, 0.12),
    0 4px 12px -2px rgba(45, 35, 30, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  pointer-events: auto;
  user-select: none;
  cursor: pointer;
  overflow: hidden;
  will-change: transform, opacity;
  transition:
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.22s ease;
}

.app-toast-item:hover {
  box-shadow:
    0 20px 42px -6px rgba(45, 35, 30, 0.16),
    0 6px 16px -2px rgba(45, 35, 30, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
}

.app-toast-item:active {
  transform: scale(0.985);
}

/* ─── Icon Badging ─────────────────────────────────────────────────── */
.app-toast-icon-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  margin-top: 1px;
}

.toast-svg-icon {
  width: 18px;
  height: 18px;
}

.icon-bg--success {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.14), rgba(5, 150, 105, 0.06));
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.icon-bg--error {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.14), rgba(225, 29, 72, 0.06));
  color: #e11d48;
  border: 1px solid rgba(244, 63, 94, 0.2);
}

.icon-bg--warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(217, 119, 6, 0.06));
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.icon-bg--info {
  background: linear-gradient(135deg, rgba(2, 132, 199, 0.14), rgba(0, 113, 227, 0.06));
  color: #0284c7;
  border: 1px solid rgba(2, 132, 199, 0.2);
}

/* ─── Content ──────────────────────────────────────────────────────── */
.app-toast-content {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.app-toast-title {
  font-family: var(--app-font-family, sans-serif);
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--color-text-primary, #2d231e);
  margin-bottom: 2px;
}

.app-toast-message {
  font-family: var(--app-font-family, sans-serif);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--color-text-secondary, #60534b);
  word-break: break-word;
}

.app-toast-message--standalone {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-text-primary, #2d231e);
  line-height: 1.4;
}

.app-toast-caption {
  font-family: var(--app-font-family, sans-serif);
  font-size: 11.5px;
  font-weight: 400;
  color: var(--color-text-muted, #a89c93);
  margin-top: 3px;
}

/* ─── Action Buttons ───────────────────────────────────────────────── */
.app-toast-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.app-toast-action-btn {
  font-family: var(--app-font-family, sans-serif);
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 9999px;
  cursor: pointer;
  border: none;
  transition: all 0.18s ease;
}

.action--solid {
  background: #2d231e;
  color: #ffffff;
}

.action--solid:hover {
  background: #000000;
}

.action--outline {
  background: transparent;
  border: 1px solid rgba(45, 35, 30, 0.2);
  color: #2d231e;
}

.action--outline:hover {
  background: rgba(45, 35, 30, 0.05);
}

.action--ghost {
  background: transparent;
  color: var(--color-primary, #e05836);
  padding-left: 4px;
  padding-right: 4px;
}

/* ─── Dismiss Button ───────────────────────────────────────────────── */
.app-toast-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #8c827a;
  cursor: pointer;
  padding: 0;
  margin-top: 1px;
  transition: all 0.18s ease;
}

.app-toast-close:hover {
  background: rgba(45, 35, 30, 0.08);
  color: #2d231e;
}

/* ─── Progress Bar ─────────────────────────────────────────────────── */
.app-toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2.5px;
  border-bottom-left-radius: 18px;
}

.progress-bg--success {
  background: #10b981;
}

.progress-bg--error {
  background: #f43f5e;
}

.progress-bg--warning {
  background: #f59e0b;
}

.progress-bg--info {
  background: #0284c7;
}

@media (max-width: 480px) {
  .app-toast-item {
    min-width: 0;
    width: calc(100vw - 32px);
    max-width: 100vw;
    border-radius: 16px;
    padding: 12px 14px;
  }
}
</style>
