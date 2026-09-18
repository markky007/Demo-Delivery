import { ref } from 'vue';

// Shared global timestamp across all timer consumers to avoid multiple intervals
const currentTime = ref(Date.now());
let timerInterval: ReturnType<typeof setInterval> | null = null;
let activeListeners = 0;

function startTimer() {
  if (!timerInterval) {
    currentTime.value = Date.now();
    timerInterval = setInterval(() => {
      currentTime.value = Date.now();
    }, 15000); // 15s granularity is lightweight and responsive
  }
}

function stopTimer() {
  if (timerInterval && activeListeners <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

export function useElapsedTimer() {
  activeListeners++;
  startTimer();

  function getElapsedMinutes(isoString: string): number {
    if (!isoString) return 0;
    const diffMs = Math.max(0, currentTime.value - new Date(isoString).getTime());
    return Math.floor(diffMs / 60000);
  }

  function formatElapsed(isoString: string): string {
    if (!isoString) return '';
    const diffMin = getElapsedMinutes(isoString);
    if (diffMin < 1) return 'เพิ่งสั่ง';
    if (diffMin < 60) return `${diffMin} นาที`;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return mins > 0 ? `${hours} ชม. ${mins} นาที` : `${hours} ชม.`;
  }

  function getTimerUrgency(isoString: string): 'normal' | 'warning' | 'danger' {
    const diffMin = getElapsedMinutes(isoString);
    if (diffMin >= 15) return 'danger';
    if (diffMin >= 8) return 'warning';
    return 'normal';
  }

  function getTimerColorClass(isoString: string): string {
    const urgency = getTimerUrgency(isoString);
    if (urgency === 'danger') return 'chef-timer-pill--danger';
    if (urgency === 'warning') return 'chef-timer-pill--warning';
    return 'chef-timer-pill--normal';
  }

  function release() {
    activeListeners = Math.max(0, activeListeners - 1);
    if (activeListeners === 0) {
      stopTimer();
    }
  }

  return {
    currentTime,
    getElapsedMinutes,
    formatElapsed,
    getTimerUrgency,
    getTimerColorClass,
    release,
  };
}
