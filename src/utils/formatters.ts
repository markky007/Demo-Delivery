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
 * Format a date string for display in Thai.
 * @param dateStr - ISO date string
 * @returns Formatted date like "19 ส.ค. 2569" or "19 ส.ค. 2026"
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a time string for display (24-hour format).
 * @param dateStr - ISO date string
 * @returns Formatted time like "14:30 น."
 */
export function formatTime(dateStr: string): string {
  const time = new Date(dateStr).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${time} น.`;
}

/**
 * Format a date-time string.
 * @param dateStr - ISO date string
 * @returns Formatted string like "19 ส.ค. 2026 14:30 น."
 */
export function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

/**
 * Calculate elapsed time from a given date to now in natural Thai.
 * @param dateStr - ISO date string
 * @returns Human-readable elapsed time like "< 1 นาที", "5 นาที", "1 ชม. 20 นาที"
 */
export function formatElapsed(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = Math.max(0, now - then);
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return '< 1 นาที';
  if (diffMin < 60) return `${diffMin} นาที`;

  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return mins > 0 ? `${hours} ชม. ${mins} นาที` : `${hours} ชม.`;
}

/**
 * Format a queue number with zero-padding.
 * @param num - Queue number
 * @returns Formatted string like "#001"
 */
export function formatQueueNumber(num: number): string {
  return `#${String(num).padStart(3, '0')}`;
}

/**
 * Format remaining time until expiration or show expired status.
 * @param expiresAt - ISO date string of expiration
 */
export function formatRemainingExpiry(expiresAt: string | null | undefined): {
  label: string;
  isExpired: boolean;
  color: string;
} {
  if (!expiresAt) {
    return { label: 'ไม่มีกำหนดหมดอายุ', isExpired: false, color: 'grey-7' };
  }

  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) {
    return { label: 'QR หมดอายุแล้ว', isExpired: true, color: 'negative' };
  }

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) {
    return { label: `หมดอายุใน ${diffMin} นาที`, isExpired: false, color: 'warning' };
  }

  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  const text = mins > 0 ? `${hours} ชม. ${mins} น.` : `${hours} ชม.`;
  return { label: `ใช้ได้อีก ${text}`, isExpired: false, color: 'positive' };
}

/**
 * Check whether an option is a default/regular portion option that should be omitted from display.
 * (e.g. "ธรรมดา", "ปกติ", "ขนาดธรรมดา", "ทานที่ร้าน")
 */
export function isDefaultOptionName(name?: string | null): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  return (
    trimmed === 'ธรรมดา' ||
    trimmed === 'ปกติ' ||
    trimmed === 'ธรรมดา (ปกติ)' ||
    trimmed === 'ปกติ (ธรรมดา)' ||
    trimmed === 'ขนาดธรรมดา' ||
    trimmed === 'ไซส์ธรรมดา' ||
    trimmed === 'จานธรรมดา' ||
    trimmed === 'ทานที่ร้าน' ||
    trimmed === 'Dine-in'
  );
}

/**
 * Check whether an option is a takeaway / packaging option.
 */
export function isTakeawayOption(name?: string | null): boolean {
  if (!name) return false;
  const trimmed = name.trim().toLowerCase();
  return (
    trimmed === 'สั่งกลับบ้าน' ||
    trimmed === 'กลับบ้าน' ||
    trimmed === 'takeaway' ||
    trimmed.includes('กลับบ้าน')
  );
}

/**
 * Filter out default options (like "ธรรมดา", "ทานที่ร้าน") so that only special / non-default options are displayed.
 */
export function getVisibleOptions<T extends { name?: string; snapshot_option_name?: string }>(
  options?: T[] | null,
): T[] {
  if (!options || !Array.isArray(options)) return [];
  return options.filter((opt) => {
    const name = opt.snapshot_option_name ?? opt.name;
    return !isDefaultOptionName(name);
  });
}

export interface OptionDisplayInfo {
  label: string;
  category: 'special' | 'egg' | 'spicy' | 'takeaway' | 'sweet' | 'addon';
  icon: string;
}

/**
 * Categorize and format options for clear and prominent kitchen display.
 */
export function getOptionDisplayInfo(rawName?: string | null): OptionDisplayInfo {
  if (!rawName) {
    return { label: '', category: 'addon', icon: 'add' };
  }
  const name = rawName.trim();
  const lower = name.toLowerCase();

  // 1. Takeaway / packaging
  if (
    isTakeawayOption(name) ||
    name.includes('ใส่กล่อง') ||
    name.includes('แยกน้ำ') ||
    name.includes('แยกข้าว')
  ) {
    return {
      label: name,
      category: 'takeaway',
      icon: 'shopping_bag',
    };
  }

  // 2. Portion / Special size
  if (
    name.includes('พิเศษ') ||
    name.includes('จัมโบ้') ||
    name.includes('เพิ่มข้าว') ||
    name.includes('เพิ่มเนื้อ') ||
    lower.includes('extra') ||
    lower.includes('jumbo') ||
    lower.includes('special')
  ) {
    return {
      label: name.startsWith('+') ? name : `⭐ ${name}`,
      category: 'special',
      icon: 'star',
    };
  }

  // 3. Egg variations (ไข่ดาว, ไข่ข้น, ไข่เจียว, etc.)
  if (
    name.includes('ไข่ดาว') ||
    name.includes('ไข่ข้น') ||
    name.includes('ไข่เจียว') ||
    name.includes('ไข่ต้ม') ||
    name.includes('ไข่ลวก') ||
    name.includes('ไข่') ||
    lower.includes('egg')
  ) {
    return {
      label: name.startsWith('+') ? name : `🍳 + ${name}`,
      category: 'egg',
      icon: 'egg',
    };
  }

  // 4. Spicy level
  if (
    name.includes('เผ็ด') ||
    name.includes('พริก') ||
    lower.includes('spicy') ||
    lower.includes('chili')
  ) {
    return {
      label: name.startsWith('+') ? name : `🌶️ ${name}`,
      category: 'spicy',
      icon: 'local_fire_department',
    };
  }

  // 5. Sweetness
  if (name.includes('หวาน') || lower.includes('sweet') || lower.includes('sugar')) {
    return {
      label: name.startsWith('+') ? name : `💧 ${name}`,
      category: 'sweet',
      icon: 'water_drop',
    };
  }

  // 6. Generic add-on or customization
  return {
    label: name.startsWith('+') ? name : `+ ${name}`,
    category: 'addon',
    icon: 'add_circle',
  };
}
