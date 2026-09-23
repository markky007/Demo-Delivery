/**
 * Formatting utilities for the application.
 */
import type { OrderItemOption, MenuItem, MenuCategory } from 'src/types/database';

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
 * Check whether an option group is for dining format (รูปแบบการทาน / ทานที่ร้าน vs กลับบ้าน)
 */
export function isDiningOptionGroup(groupName?: string | null): boolean {
  if (!groupName) return false;
  const trimmed = groupName.trim();
  return (
    trimmed === 'รูปแบบการทาน' ||
    trimmed === 'ทานที่ร้าน / กลับบ้าน' ||
    trimmed.includes('รูปแบบการทาน') ||
    trimmed.includes('ทานที่ร้าน / กลับบ้าน')
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
    trimmed.includes('กลับบ้าน') ||
    trimmed.includes('takeaway')
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

  // Strip leading emoji or symbols and leading pluses/whitespace to avoid double icons
  const cleanName = name.replace(/^([^\p{L}\p{N}]|\s)+/gu, '').trim() || name;

  // 1. Takeaway / packaging
  if (
    isTakeawayOption(name) ||
    name.includes('ใส่กล่อง') ||
    name.includes('แยกน้ำ') ||
    name.includes('แยกข้าว')
  ) {
    return {
      label: cleanName,
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
      label: cleanName,
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
      label: cleanName,
      category: 'egg',
      icon: 'radio_button_checked',
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
      label: cleanName,
      category: 'spicy',
      icon: 'local_fire_department',
    };
  }

  // 5. Sweetness
  if (name.includes('หวาน') || lower.includes('sweet') || lower.includes('sugar')) {
    return {
      label: cleanName,
      category: 'sweet',
      icon: 'water_drop',
    };
  }

  // 6. Generic add-on or customization
  return {
    label: cleanName,
    category: 'addon',
    icon: 'add_circle_outline',
  };
}

/**
 * Consolidate duplicate order items in an order (e.g. for Kitchen Focus Mode slip display).
 * Groups items by same dish (menu_item_id or snapshot_name), same options, and identical special instructions.
 * Sums up their quantities and subtotals.
 * Returns a new array of cloned items without mutating the original input items.
 */
export function consolidateOrderItems<
  T extends {
    id?: string;
    menu_item_id?: string;
    snapshot_name?: string;
    quantity?: number;
    subtotal?: number;
    special_instruction?: string | null;
    options?: OrderItemOption[];
  },
>(items?: T[] | null): T[] {
  if (!items || items.length === 0) return [];

  const consolidated: T[] = [];
  const keyMap = new Map<string, T>();

  for (const item of items) {
    // 1. Dish identity
    const dishKey = (item.menu_item_id || item.snapshot_name || '').trim();

    // 2. Options canonical signature (sorted by option id, group name, option name, and price adjustment)
    const optionsKey = (item.options || [])
      .map(
        (o) =>
          `${(o.option_id || '').trim()}::${(o.snapshot_group_name || '').trim()}::${(o.snapshot_option_name || '').trim()}::${o.snapshot_price_adjustment ?? 0}`,
      )
      .sort()
      .join('||');

    // 3. Special instruction / comment (exact trimmed comparison)
    const commentKey = (item.special_instruction || '').trim();

    const groupKey = `${dishKey}___${optionsKey}___${commentKey}`;

    const existing = keyMap.get(groupKey);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
      if (typeof existing.subtotal === 'number' && typeof item.subtotal === 'number') {
        existing.subtotal += item.subtotal;
      }
    } else {
      const cloned: T = {
        ...item,
        quantity: item.quantity || 1,
        options: item.options ? [...item.options] : [],
      };
      keyMap.set(groupKey, cloned);
      consolidated.push(cloned);
    }
  }

  return consolidated;
}

export interface KitchenCategoryGroup<T> {
  key: 'food' | 'soup_yam';
  label: string;
  icon: string;
  items: T[];
}

/**
 * Categorize order items into kitchen station groups ("อาหาร" and "ยำ/ต้ม").
 * Sorts items by station (อาหาร first, then ยำ/ต้ม), and within each station by menu item sort order or name.
 * Only returns groups that have at least one item.
 */
export function groupOrderItemsForKitchen<
  T extends {
    menu_item_id?: string;
    snapshot_name?: string;
    quantity?: number;
  },
>(
  items: T[],
  menuItemsMap?: Map<string, MenuItem>,
  categoriesMap?: Map<string, MenuCategory>,
): KitchenCategoryGroup<T>[] {
  if (!items || items.length === 0) return [];

  const foodItems: T[] = [];
  const soupYamItems: T[] = [];

  for (const item of items) {
    const menuItem =
      item.menu_item_id && menuItemsMap ? menuItemsMap.get(item.menu_item_id) : undefined;
    const category =
      menuItem?.category_id && categoriesMap ? categoriesMap.get(menuItem.category_id) : undefined;

    const catName = (category?.name || '').toLowerCase().trim();
    const dishName = (item.snapshot_name || menuItem?.name || '').toLowerCase().trim();

    // 1. Explicitly check if it is a stir-fry curry paste dish (พริกแกง / เครื่องแกง / ผัดพริกแกง) or stir-fry dish
    // These belong to "อาหาร" (food/wok station), NOT "ยำ/ต้ม"
    const isPrikGaengOrStirFry =
      catName.includes('พริกแกง') ||
      dishName.includes('พริกแกง') ||
      catName.includes('เครื่องแกง') ||
      dishName.includes('เครื่องแกง') ||
      dishName.startsWith('ผัด') ||
      catName.startsWith('ผัด');

    // 2. Check if category is a soup/curry/yam category (excluding prik gaeng stir-fry)
    const isSoupOrYamCategory =
      catName.includes('ยำ') ||
      catName.includes('ต้ม') ||
      catName.includes('ซุป') ||
      catName.includes('soup') ||
      catName.includes('tom yum') ||
      catName.includes('yum') ||
      (catName.includes('แกง') && !catName.includes('พริกแกง') && !catName.includes('เครื่องแกง'));

    // 3. Check if dish itself is a soup or yam dish
    const isSoupOrYamDish =
      dishName.includes('ต้มยำ') ||
      dishName.includes('แกงจืด') ||
      dishName.includes('ต้มจืด') ||
      dishName.includes('ต้มแซ่บ') ||
      dishName.includes('ต้มข่า') ||
      dishName.includes('แกงส้ม') ||
      dishName.includes('แกงเลียง') ||
      dishName.includes('แกงป่า') ||
      dishName.includes('แกงอ่อม') ||
      dishName.includes('แกงเห็ด') ||
      dishName.includes('แกงเขียวหวาน') ||
      dishName.includes('แกงเผ็ด') ||
      dishName.includes('แกงกะหรี่') ||
      dishName.includes('แกงมัสมั่น') ||
      dishName.includes('แกงเทโพ') ||
      dishName.startsWith('ยำ') ||
      dishName.includes(' ยำ') ||
      dishName.includes('ส้มตำ');

    const isYamOrTom = !isPrikGaengOrStirFry && (isSoupOrYamCategory || isSoupOrYamDish);

    if (isYamOrTom) {
      soupYamItems.push(item);
    } else {
      foodItems.push(item);
    }
  }

  // Sort items within each group: sort_order asc, then name Thai locale
  const sortGroup = (list: T[]) => {
    return list.sort((a, b) => {
      const mA = a.menu_item_id && menuItemsMap ? menuItemsMap.get(a.menu_item_id) : undefined;
      const mB = b.menu_item_id && menuItemsMap ? menuItemsMap.get(b.menu_item_id) : undefined;

      const orderA = mA?.sort_order ?? 9999;
      const orderB = mB?.sort_order ?? 9999;

      if (orderA !== orderB) return orderA - orderB;
      return (a.snapshot_name || '').localeCompare(b.snapshot_name || '', 'th');
    });
  };

  const groups: KitchenCategoryGroup<T>[] = [];

  if (foodItems.length > 0) {
    groups.push({
      key: 'food',
      label: 'อาหาร',
      icon: 'restaurant',
      items: sortGroup(foodItems),
    });
  }

  if (soupYamItems.length > 0) {
    groups.push({
      key: 'soup_yam',
      label: 'ยำ/ต้ม',
      icon: 'soup_kitchen',
      items: sortGroup(soupYamItems),
    });
  }

  return groups;
}
