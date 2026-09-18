<template>
  <div class="queue-header-bar q-mb-md">
    <div class="row items-center justify-between wrap q-gutter-y-sm">
      <!-- Left: Title & Realtime Badge -->
      <div class="row items-center q-gutter-x-sm">
        <h5 class="q-my-none text-weight-bold page-title text-ink">คิวออเดอร์ในครัว</h5>
        <div class="apple-live-badge">
          <span class="live-dot"></span>
          <span class="text-caption text-weight-bold">เรียลไทม์</span>
        </div>
      </div>

      <!-- Right: Quick Stats & View Switcher & Audio Controls -->
      <div class="row items-center q-gutter-sm">
        <!-- Sound Controls Button -->
        <q-btn
          flat
          dense
          round
          :icon="soundIcon"
          :color="isAudioActive ? 'primary' : 'grey-6'"
          class="audio-trigger-btn"
        >
          <q-tooltip>
            {{
              isAudioActive
                ? `เสียงเตือนออเดอร์ (ความดัง ${soundVolume}%)`
                : 'ปิดเสียงเตือน (คลิกเพื่อตั้งค่า)'
            }}
          </q-tooltip>

          <!-- Audio Settings Menu Popover -->
          <QueueAudioMenu />
        </q-btn>

        <!-- Mode Switcher Segmented Control (Apple Pill Style) -->
        <div class="apple-segmented-control">
          <!-- 1. คิวปรุงอาหาร -->
          <button
            type="button"
            class="segmented-pill-btn"
            :class="{ 'segmented-pill-btn--active': viewMode === 'focus' }"
            @click="selectViewMode('focus')"
          >
            <q-icon name="soup_kitchen" size="18px" class="q-mr-xs" />
            <span class="text-weight-bold">คิวปรุงอาหาร</span>
            <span v-if="activeOrdersCount > 0" class="segmented-count-badge font-mono">
              {{ activeOrdersCount }}
            </span>
          </button>

          <!-- 2. คิวของทอด -->
          <button
            type="button"
            class="segmented-pill-btn"
            :class="{ 'segmented-pill-btn--active': viewMode === 'fry' }"
            @click="selectViewMode('fry')"
          >
            <q-icon name="local_fire_department" size="18px" class="q-mr-xs" />
            <span class="text-weight-bold">คิวของทอด</span>
            <span
              v-if="pendingFryCount > 0"
              class="segmented-count-badge segmented-count-badge--fry font-mono"
            >
              {{ pendingFryCount }}
            </span>
          </button>

          <!-- 3. คิวตักข้าว -->
          <button
            type="button"
            class="segmented-pill-btn"
            :class="{ 'segmented-pill-btn--active': viewMode === 'rice' }"
            @click="selectViewMode('rice')"
          >
            <q-icon name="rice_bowl" size="18px" class="q-mr-xs" />
            <span class="text-weight-bold">คิวตักข้าว</span>
            <span
              v-if="pendingRiceCount > 0"
              class="segmented-count-badge segmented-count-badge--rice font-mono"
            >
              {{ pendingRiceCount }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import QueueAudioMenu from './QueueAudioMenu.vue';
import { isSoundEnabled, getSoundVolume } from 'src/utils/audioService';

interface Props {
  viewMode: 'focus' | 'fry' | 'rice';
  activeOrdersCount: number;
  pendingFryCount: number;
  pendingRiceCount: number;
}

defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:viewMode', mode: 'focus' | 'fry' | 'rice'): void;
}>();

const isAudioActive = computed(() => isSoundEnabled() && getSoundVolume() > 0);
const soundVolume = computed(() => getSoundVolume());

const soundIcon = computed(() => {
  if (!isSoundEnabled()) return 'volume_off';
  if (soundVolume.value === 0) return 'volume_mute';
  if (soundVolume.value <= 50) return 'volume_down';
  return 'volume_up';
});

function selectViewMode(mode: 'focus' | 'fry' | 'rice') {
  emit('update:viewMode', mode);
}
</script>

<style scoped>
.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.page-title {
  font-size: 1.5rem;
  letter-spacing: -0.01em;
  line-height: 1.25;
}

/* Apple Live Status Badge */
.apple-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(52, 199, 89, 0.12);
  color: #248a3d;
  padding: 4px 12px;
  border-radius: 980px;
  border: 1px solid rgba(52, 199, 89, 0.25);
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #34c759;
  box-shadow: 0 0 0 2px rgba(52, 199, 89, 0.35);
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

.audio-trigger-btn {
  background: #ffffff;
  border: 1px solid var(--color-hairline, #d2d2d7);
  width: 40px;
  height: 40px;
  transition: all 0.18s ease;
}

.audio-trigger-btn:hover {
  background: var(--color-surface-subtle, #fafafc);
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
  font-size: 0.88rem;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Count Badges inside Segmented Control */
.segmented-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 6px;
  padding: 2px 7px;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 980px;
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-ink, #1d1d1f);
  min-width: 18px;
}

.segmented-pill-btn--active .segmented-count-badge {
  background: var(--color-primary, #0071e3);
  color: #ffffff;
}

.segmented-count-badge--fry {
  background: rgba(182, 68, 0, 0.12);
  color: var(--color-accent-warm, #b64400);
}

.segmented-pill-btn--active .segmented-count-badge--fry {
  background: var(--color-accent-warm, #b64400);
  color: #ffffff;
}

.segmented-count-badge--rice {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}

.segmented-pill-btn--active .segmented-count-badge--rice {
  background: #d97706;
  color: #ffffff;
}

.font-mono {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.25rem;
  }
  .segmented-pill-btn {
    padding: 6px 10px;
    font-size: 0.82rem;
  }
}
</style>
