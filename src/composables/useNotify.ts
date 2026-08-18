/**
 * Composable for Quasar Notify plugin.
 * Provides typed, consistent notification helpers.
 */
import { useQuasar } from 'quasar';

export function useNotify() {
  const $q = useQuasar();

  function notifySuccess(message: string) {
    $q.notify({
      type: 'positive',
      message,
      icon: 'check_circle',
      position: 'top',
      timeout: 2000,
    });
  }

  function notifyError(message: string) {
    $q.notify({
      type: 'negative',
      message,
      icon: 'error',
      position: 'top',
      timeout: 3000,
    });
  }

  function notifyWarning(message: string) {
    $q.notify({
      type: 'warning',
      message,
      icon: 'warning',
      position: 'top',
      timeout: 3000,
    });
  }

  function notifyInfo(message: string) {
    $q.notify({
      type: 'info',
      message,
      icon: 'info',
      position: 'top',
      timeout: 2500,
    });
  }

  return {
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
  };
}
