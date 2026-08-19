import type { OrderWithItems, MenuItem, MenuCategory } from '../types/database';
import { OrderStatus } from '../types/enums';

export interface RiceRequirement {
  id: string; // unique item key for checkbox state
  orderId: string;
  orderItemId: string;
  queueNumber: number;
  tableName: string;
  customerName?: string | null | undefined;
  dishName: string;
  riceType: 'plain' | 'fried' | 'sticky'; // plain = ข้าวสวย, fried = ข้าวผัด, sticky = ข้าวเหนียว
  portionSize: 'normal' | 'special'; // normal = ธรรมดา, special = พิเศษ
  displayLabel: string; // e.g. "ธรรมดา 1 จาน", "พิเศษ 2 จาน", "ธรรมดา (ข้าวผัด) 1 จาน", "พิเศษ (ข้าวผัด) 2 จาน"
  riceName: string; // e.g. "ข้าวสวย (ธรรมดา)", "ข้าวสวย (พิเศษ)", "ข้าวผัด (ธรรมดา)", "ข้าวผัด (พิเศษ)"
  quantity: number;
  unit: string;
  isSpecial: boolean;
  isFriedRice: boolean;
  isAddonRice?: boolean;
  specialInstruction?: string | null | undefined;
  orderStatus: string;
  queuedAt: string;
}

export interface RiceSummaryItem {
  riceName: string;
  riceType: 'plain' | 'fried' | 'sticky';
  portionSize: 'normal' | 'special';
  totalQuantity: number;
  pendingQuantity: number;
  completedQuantity: number;
  unit: string;
}

/**
 * Check if the dish or category is a Fried Rice (ข้าวผัด)
 */
export function isFriedRiceItem(dishName: string, categoryName?: string | null): boolean {
  const cleanDish = dishName.toLowerCase().trim();
  const cleanCat = (categoryName || '').toLowerCase().trim();

  if (cleanCat.includes('ข้าวผัด') || cleanCat.includes('fried rice')) {
    return true;
  }

  if (
    cleanDish.includes('ข้าวผัด') ||
    cleanDish.includes('ข้าวคลุก') ||
    cleanDish.includes('ข้าวอบ') ||
    cleanDish.includes('fried rice')
  ) {
    return true;
  }

  return false;
}

/**
 * Check if the dish/category is explicitly a non-rice dish (e.g. noodles, drinks, desserts, appetizers)
 */
function isExcludedFromRice(dishName: string, categoryName?: string | null): boolean {
  const cleanDish = dishName.toLowerCase().trim();
  const cleanCat = (categoryName || '').toLowerCase().trim();

  // Noodle categories / keywords
  const noodleKeywords = [
    'ก๋วยเตี๋ยว',
    'ผัดไทย',
    'ราดหน้า',
    'ผัดซีอิ๊ว',
    'บะหมี่',
    'เส้นหมี่',
    'วุ้นเส้น',
    'สุกี้',
    'มาม่า',
    'ราเมง',
    'พาสต้า',
    'สปาเก็ตตี้',
    'อุด้ง',
    'noodle',
    'noodles',
    'pad thai',
  ];

  for (const kw of noodleKeywords) {
    if (cleanCat.includes(kw) || cleanDish.includes(kw)) {
      // If dish contains noodles and not explicitly "ข้าว"
      if (!cleanDish.includes('ข้าว')) {
        return true;
      }
    }
  }

  // Drinks / Desserts / Snacks
  const excludedCategoryKeywords = [
    'เครื่องดื่ม',
    'drinks',
    'beverage',
    'ขนม',
    'dessert',
    'desserts',
    'ของหวาน',
    'ไอศกรีม',
    'ice cream',
  ];

  for (const kw of excludedCategoryKeywords) {
    if (cleanCat.includes(kw)) {
      // If category is drink/dessert and dish doesn't explicitly ask for rice
      if (!cleanDish.includes('ข้าวเหนียว') && !cleanDish.includes('ข้าว')) {
        return true;
      }
    }
  }

  // Appetizers / ของทานเล่น (without rice in name)
  if (
    cleanCat.includes('appetizer') ||
    cleanCat.includes('ของทานเล่น') ||
    cleanCat.includes('ทานเล่น')
  ) {
    if (!cleanDish.includes('ข้าว')) {
      return true;
    }
  }

  // Items with "ข้าวโพด" (corn) or "ข้าวเกรียบ" that aren't rice dishes
  if (
    (cleanDish.includes('ข้าวโพด') || cleanDish.includes('ข้าวเกรียบ')) &&
    !cleanDish.includes('ข้าวผัด') &&
    !cleanDish.includes('ราดข้าว') &&
    !cleanDish.includes('ข้าวหน้า')
  ) {
    return true;
  }

  return false;
}

/**
 * Check if an item represents a rice-based dish
 */
export function isRiceDishItem(dishName: string, categoryName?: string | null): boolean {
  if (isExcludedFromRice(dishName, categoryName)) {
    return false;
  }

  const cleanDish = dishName.toLowerCase().trim();
  const cleanCat = (categoryName || '').toLowerCase().trim();

  // If dish explicitly contains "ข้าว"
  if (cleanDish.includes('ข้าว') || cleanDish.includes('rice')) {
    return true;
  }

  // If category is Single Dish / Rice Dish / Main Courses
  if (
    cleanCat.includes('อาหารจานเดียว') ||
    cleanCat.includes('จานเดียว') ||
    cleanCat.includes('ราดข้าว') ||
    cleanCat.includes('เมนูข้าว') ||
    cleanCat.includes('ข้าวผัด') ||
    cleanCat.includes('main course') ||
    cleanCat.includes('main courses')
  ) {
    return true;
  }

  return false;
}

/**
 * Extract all rice requirements from active orders in the kitchen.
 */
export function extractRiceRequirementsFromOrders(
  orders: OrderWithItems[],
  menuItemsMap?: Map<string, MenuItem>,
  categoriesMap?: Map<string, MenuCategory>,
): RiceRequirement[] {
  const requirements: RiceRequirement[] = [];

  // Filter only active kitchen orders (QUEUED and PREPARING)
  const activeOrders = orders.filter(
    (o) => o.status === OrderStatus.QUEUED || o.status === OrderStatus.PREPARING,
  );

  for (const order of activeOrders) {
    const tableName = order.table_session?.table?.name || 'กลับบ้าน / ไม่ระบุ';
    const customerName = order.table_session?.customer_name;

    for (const item of order.items || []) {
      const menuItem = menuItemsMap?.get(item.menu_item_id);
      const category = menuItem?.category_id ? categoriesMap?.get(menuItem.category_id) : undefined;
      const categoryName = category?.name;
      const dishName = item.snapshot_name || menuItem?.name || '';

      const options = item.options || [];

      // Check if user specifically requested "ไม่เอาข้าว" / "ไม่รับข้าว" / "เฉพาะกับข้าว"
      const hasNoRiceOption = options.some((opt) => {
        const name = opt.snapshot_option_name || '';
        return (
          name.includes('ไม่เอาข้าว') ||
          name.includes('ไม่รับข้าว') ||
          name.includes('เฉพาะกับข้าว') ||
          name.includes('ไม่ใส่ข้าว') ||
          name.includes('แยกกับ (ไม่เอาข้าว)')
        );
      });

      if (hasNoRiceOption) {
        // Skip base dish rice if customer requested no rice
        continue;
      }

      // Check if dish is a rice dish
      const isRice = isRiceDishItem(dishName, categoryName);

      if (isRice) {
        const isFried = isFriedRiceItem(dishName, categoryName);
        const isSticky =
          dishName.includes('ข้าวเหนียว') || (categoryName || '').includes('ข้าวเหนียว');

        // Check if "พิเศษ" size
        const isSpecial =
          options.some((opt) => {
            const name = (opt.snapshot_option_name || '').toLowerCase();
            return (
              name.includes('พิเศษ') ||
              name.includes('จัมโบ้') ||
              name.includes('large') ||
              name.includes('extra') ||
              name.includes('special')
            );
          }) || dishName.includes('พิเศษ');

        const portionSize: 'normal' | 'special' = isSpecial ? 'special' : 'normal';
        const riceType: 'plain' | 'fried' | 'sticky' = isSticky
          ? 'sticky'
          : isFried
            ? 'fried'
            : 'plain';

        const sizeLabel = isSpecial ? 'พิเศษ' : 'ธรรมดา';
        const typeSuffix = isFried ? ' (ข้าวผัด)' : isSticky ? ' (ข้าวเหนียว)' : '';
        const riceName = `${isSticky ? 'ข้าวเหนียว' : isFried ? 'ข้าวผัด' : 'ข้าวสวย'} (${sizeLabel})`;
        const displayLabel = `${sizeLabel}${typeSuffix} ${item.quantity} จาน`;

        requirements.push({
          id: `${order.id}-${item.id}-rice`,
          orderId: order.id,
          orderItemId: item.id,
          queueNumber: order.queue_number,
          tableName,
          customerName,
          dishName,
          riceType,
          portionSize,
          displayLabel,
          riceName,
          quantity: item.quantity,
          unit: 'จาน',
          isSpecial,
          isFriedRice: isFried,
          isAddonRice: false,
          specialInstruction: item.special_instruction,
          orderStatus: order.status,
          queuedAt: order.queued_at,
        });
      }

      // Check options for extra rice additions (e.g. เพิ่มข้าว, ข้าวเปล่า, ข้าวสวย)
      for (const opt of options) {
        const optName = opt.snapshot_option_name || '';
        if (
          optName.includes('เพิ่มข้าว') ||
          optName.includes('ข้าวเปล่า') ||
          optName.includes('ข้าวสวย')
        ) {
          const isExtraSpecial = optName.includes('พิเศษ');
          const portionSize = isExtraSpecial ? 'special' : 'normal';
          const sizeLabel = isExtraSpecial ? 'พิเศษ' : 'ธรรมดา';
          const riceName = `ข้าวสวย (${sizeLabel})`;
          const displayLabel = `เพิ่มข้าว ${sizeLabel} ${item.quantity} จาน`;

          requirements.push({
            id: `${order.id}-${item.id}-opt-rice-${opt.option_id || optName}`,
            orderId: order.id,
            orderItemId: item.id,
            queueNumber: order.queue_number,
            tableName,
            customerName,
            dishName,
            riceType: 'plain',
            portionSize,
            displayLabel,
            riceName,
            quantity: item.quantity,
            unit: 'จาน',
            isSpecial: isExtraSpecial,
            isFriedRice: false,
            isAddonRice: true,
            specialInstruction: item.special_instruction,
            orderStatus: order.status,
            queuedAt: order.queued_at,
          });
        }
      }
    }
  }

  return requirements;
}

/**
 * Aggregate rice summary list for the station top summary KPI cards.
 */
export function aggregateRiceSummary(
  requirements: RiceRequirement[],
  completedIdSet: Set<string>,
): RiceSummaryItem[] {
  // Pre-define standard categories in consistent order
  const standardKeys = [
    'ข้าวสวย (ธรรมดา)',
    'ข้าวสวย (พิเศษ)',
    'ข้าวผัด (ธรรมดา)',
    'ข้าวผัด (พิเศษ)',
  ];

  const summaryMap = new Map<string, RiceSummaryItem>();

  for (const req of requirements) {
    const isDone = completedIdSet.has(req.id);
    const existing = summaryMap.get(req.riceName);

    if (existing) {
      existing.totalQuantity += req.quantity;
      if (isDone) {
        existing.completedQuantity += req.quantity;
      } else {
        existing.pendingQuantity += req.quantity;
      }
    } else {
      summaryMap.set(req.riceName, {
        riceName: req.riceName,
        riceType: req.riceType,
        portionSize: req.portionSize,
        totalQuantity: req.quantity,
        pendingQuantity: isDone ? 0 : req.quantity,
        completedQuantity: isDone ? req.quantity : 0,
        unit: req.unit,
      });
    }
  }

  // Sort: pending quantity desc, with standard keys first
  return Array.from(summaryMap.values()).sort((a, b) => {
    const aIdx = standardKeys.indexOf(a.riceName);
    const bIdx = standardKeys.indexOf(b.riceName);
    if (aIdx !== -1 && bIdx !== -1) {
      return aIdx - bIdx;
    }
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return b.pendingQuantity - a.pendingQuantity;
  });
}
