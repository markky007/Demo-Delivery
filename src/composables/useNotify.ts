/**
 * Composable for in-app notifications / toasts.
 * Replaces Quasar Notify with custom, modern, glassmorphic toast notifications.
 * Fully typed and backward-compatible with all existing notify calls.
 */
import {
  useNotificationStore,
  type NotificationPayload,
  type NotificationType,
  type NotificationAction,
} from 'src/stores/notificationStore';

export type NotifyOptions = Partial<Omit<NotificationPayload, 'message' | 'type'>> & {
  type?: NotificationType | 'positive' | 'negative';
};

export function useNotify() {
  const store = useNotificationStore();

  function parseArgs(
    defaultType: NotificationType,
    message: string,
    extra?: string | NotifyOptions,
  ): NotificationPayload {
    if (typeof extra === 'string') {
      // If a second string is passed, treat first as title and second as message
      return {
        type: defaultType,
        title: message,
        message: extra,
      };
    }

    return {
      type: defaultType,
      message,
      title: extra?.title,
      caption: extra?.caption,
      icon: extra?.icon,
      timeout: extra?.timeout,
      actions: extra?.actions,
      dismissible: extra?.dismissible,
    };
  }

  function notifySuccess(message: string, extra?: string | NotifyOptions): string {
    return store.addToast(parseArgs('success', message, extra));
  }

  function notifyError(message: string, extra?: string | NotifyOptions): string {
    return store.addToast(parseArgs('error', message, extra));
  }

  function notifyWarning(message: string, extra?: string | NotifyOptions): string {
    return store.addToast(parseArgs('warning', message, extra));
  }

  function notifyInfo(message: string, extra?: string | NotifyOptions): string {
    return store.addToast(parseArgs('info', message, extra));
  }

  function notify(payload: NotificationPayload): string {
    return store.addToast(payload);
  }

  function dismiss(id: string): void {
    store.removeToast(id);
  }

  function clearAll(): void {
    store.clearAll();
  }

  return {
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    notify,
    dismiss,
    clearAll,
  };
}

export type { NotificationType, NotificationAction, NotificationPayload };
