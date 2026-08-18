/**
 * Formatting utilities for the application.
 */

/**
 * Format a price in Thai Baht.
 * @param amount - Amount in whole Baht (integer)
 * @returns Formatted string like "฿120"
 */
export function formatPrice(amount: number): string {
  return `฿${amount.toLocaleString('th-TH')}`;
}

/**
 * Format a date string for display.
 * @param dateStr - ISO date string
 * @returns Formatted date like "19 ส.ค. 2026"
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a time string for display.
 * @param dateStr - ISO date string
 * @returns Formatted time like "14:30"
 */
export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format a date-time string.
 * @param dateStr - ISO date string
 * @returns Formatted string like "19 ส.ค. 2026 14:30"
 */
export function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

/**
 * Calculate elapsed time from a given date to now.
 * @param dateStr - ISO date string
 * @returns Human-readable elapsed time like "5 min", "1 hr 20 min"
 */
export function formatElapsed(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return '< 1 min';
  if (diffMin < 60) return `${diffMin} min`;

  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

/**
 * Format a queue number with zero-padding.
 * @param num - Queue number
 * @returns Formatted string like "#001"
 */
export function formatQueueNumber(num: number): string {
  return `#${String(num).padStart(3, '0')}`;
}
