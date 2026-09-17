/**
 * Pinia store for in-app custom notifications and toasts.
 * Replaces Quasar Notify with custom, modern, glassmorphic toast cards.
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationAction {
  label: string;
  onClick: (toast: NotificationItem) => void;
  color?: string;
  variant?: 'solid' | 'outline' | 'ghost';
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  title?: string | undefined;
  caption?: string | undefined;
  icon?: string | undefined;
  timeout: number; // in milliseconds (0 for persistent)
  actions?: NotificationAction[] | undefined;
  dismissible?: boolean | undefined;
  createdAt: number;
}

export interface NotificationPayload {
  type?: NotificationType | 'positive' | 'negative' | undefined;
  message: string;
  title?: string | undefined;
  caption?: string | undefined;
  icon?: string | undefined;
  timeout?: number | undefined;
  actions?: NotificationAction[] | undefined;
  dismissible?: boolean | undefined;
}

export const useNotificationStore = defineStore('notification', () => {
  const toasts = ref<NotificationItem[]>([]);
  const MAX_TOASTS = 5;
  let counter = 0;

  function normalizeType(type?: string): NotificationType {
    if (type === 'positive' || type === 'success') return 'success';
    if (type === 'negative' || type === 'error') return 'error';
    if (type === 'warning') return 'warning';
    return 'info';
  }

  function addToast(payload: NotificationPayload): string {
    const id = `toast-${Date.now()}-${++counter}`;
    const type = normalizeType(payload.type);

    // Default timeouts: errors stay slightly longer for readability
    const defaultTimeout = type === 'error' ? 4000 : 3000;
    const timeout = payload.timeout !== undefined ? payload.timeout : defaultTimeout;

    const newItem: NotificationItem = {
      id,
      type,
      message: payload.message,
      title: payload.title,
      caption: payload.caption,
      icon: payload.icon,
      timeout,
      actions: payload.actions,
      dismissible: payload.dismissible !== false,
      createdAt: Date.now(),
    };

    // Stacking: maintain max visible toasts to prevent viewport clutter
    if (toasts.value.length >= MAX_TOASTS) {
      toasts.value.shift();
    }

    toasts.value.push(newItem);
    return id;
  }

  function removeToast(id: string) {
    const idx = toasts.value.findIndex((t) => t.id === id);
    if (idx !== -1) {
      toasts.value.splice(idx, 1);
    }
  }

  function clearAll() {
    toasts.value = [];
  }

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
  };
});
