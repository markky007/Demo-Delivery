<template>
  <Teleport to="body">
    <div
      class="app-toast-container"
      aria-live="polite"
      aria-atomic="false"
      role="region"
      aria-label="การแจ้งเตือน"
    >
      <TransitionGroup name="app-toast-stack" tag="div" class="app-toast-list">
        <AppToastItem
          v-for="toast in toasts"
          :key="toast.id"
          :toast="toast"
          @dismiss="handleDismiss"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNotificationStore } from 'src/stores/notificationStore';
import AppToastItem from './AppToastItem.vue';

const notificationStore = useNotificationStore();
const toasts = computed(() => notificationStore.toasts);

function handleDismiss(id: string) {
  notificationStore.removeToast(id);
}
</script>

<style scoped>
.app-toast-container {
  position: fixed;
  top: max(16px, env(safe-area-inset-top, 16px));
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999;
  pointer-events: none;
  padding: 0 16px;
}

.app-toast-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 440px;
}

/* ─── Smooth Spring & FLIP Animations ───────────────────────────────── */
.app-toast-stack-move,
.app-toast-stack-enter-active,
.app-toast-stack-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.app-toast-stack-enter-from {
  opacity: 0;
  transform: translateY(-24px) scale(0.92);
}

.app-toast-stack-leave-to {
  opacity: 0;
  transform: translateY(-16px) scale(0.92);
}

/* Ensure smooth layout shift for remaining toasts when one is removed */
.app-toast-stack-leave-active {
  position: absolute;
  width: 100%;
  max-width: 440px;
  pointer-events: none;
}
</style>
