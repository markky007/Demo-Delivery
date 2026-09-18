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
  type?: NotificationType | 'positive' | 'negative' | undefined;
};

export type NotifyInput =
  string | (Partial<Omit<NotificationPayload, 'type'>> & { message: string });

export function useNotify() {
  const store = useNotificationStore();

  function getDefaultTitle(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'ดำเนินการสำเร็จ';
      case 'error':
        return 'เกิดข้อผิดพลาด';
      case 'warning':
        return 'ข้อควรระวัง';
      case 'info':
        return 'ข้อมูลแจ้งเตือน';
    }
  }

  function parseArgs(
    defaultType: NotificationType,
    input: NotifyInput,
    extra?: string | NotifyOptions,
  ): NotificationPayload {
    if (typeof input === 'object' && input !== null) {
      return {
        type: defaultType,
        title: input.title !== undefined ? input.title : getDefaultTitle(defaultType),
        message: input.message,
        caption: input.caption,
        icon: input.icon,
        timeout: input.timeout,
        actions: input.actions,
        dismissible: input.dismissible,
      };
    }

    if (typeof extra === 'string') {
      // If a second string is passed, treat first as title and second as message
      return {
        type: defaultType,
        title: input,
        message: extra,
      };
    }

    return {
      type: defaultType,
      message: input,
      title: extra?.title !== undefined ? extra.title : getDefaultTitle(defaultType),
      caption: extra?.caption,
      icon: extra?.icon,
      timeout: extra?.timeout,
      actions: extra?.actions,
      dismissible: extra?.dismissible,
    };
  }

  function notifySuccess(input: NotifyInput, extra?: string | NotifyOptions): string {
    return store.addToast(parseArgs('success', input, extra));
  }

  function notifyError(input: NotifyInput, extra?: string | NotifyOptions): string {
    return store.addToast(parseArgs('error', input, extra));
  }

  function notifyWarning(input: NotifyInput, extra?: string | NotifyOptions): string {
    return store.addToast(parseArgs('warning', input, extra));
  }

  function notifyInfo(input: NotifyInput, extra?: string | NotifyOptions): string {
    return store.addToast(parseArgs('info', input, extra));
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
