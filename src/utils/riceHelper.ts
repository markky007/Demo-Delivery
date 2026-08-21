import type { OrderWithItems, MenuItem, MenuCategory } from '../types/database';
import { OrderStatus } from '../types/enums';
import { isTakeawayName } from '../services/tableService';
import { isTakeawayOption } from './formatters';

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
  displayLabel: string; // e.g. "ธรรมดา 1 จาน", "พิเศษ 2 จาน", "ตักข้าวกลับบ้าน ธรรมดา 1 กล่อง", "ตักข้าวกลับบ้าน พิเศษ 2 กล่อง"
  riceName: string; // e.g. "ข้าวสวย (ธรรมดา)", "ข้าวสวย (พิเศษ)", "ตักข้าวกลับบ้าน (ธรรมดา)", "ตักข้าวกลับบ้าน (พิเศษ)"
  quantity: number;
  unit: string;
  isSpecial: boolean;
  isFriedRice: boolean;
  isAddonRice?: boolean;
  isTakeaway?: boolean;
  specialInstruction?: string | null | undefined;
  orderStatus: string;
  queuedAt: string;
}

export interface RiceSummaryItem {
  riceName: string;
  riceType: 'plain' | 'fried' | 'sticky';
  portionSize: 'normal' | 'special';
  isTakeaway?: boolean | undefined;
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
 * Check if the dish/category is explicitly a non-rice dish (e.g. soup/yam, noodles/pad see ew, drinks, desserts, appetizers)
 * Rule: All categories require rice EXCEPT "ยำ/ต้ม" and "ผัดซีอิ้ว" (plus drinks/desserts/appetizers).
 */
export function isExcludedFromRice(dishName: string, categoryName?: string | null): boolean {
  const cleanDish = dishName.toLowerCase().trim();
  const cleanCat = (categoryName || '').toLowerCase().trim();

  // 1. หมวดหมู่ ยำ/ต้ม (Soup / Tom Yum / Yam / Salads / Curries soup)
  const soupAndYamCatKeywords = [
    'ยำ/ต้ม',
    'ต้ม/ยำ',
    'ยำ / ต้ม',
    'ต้ม / ยำ',
    'ยำ',
    'ต้ม',
    'ต้มยำ',
    'แกงจืด',
    'ต้มจืด',
    'ต้มแซ่บ',
    'ต้มข่า',
    'แกงส้ม',
    'แกงเลียง',
    'แกงป่า',
    'ซุป',
    'soup',
    'tom yum',
    'salad',
    'yum',
  ];

  for (const kw of soupAndYamCatKeywords) {
    if (cleanCat.includes(kw)) {
      // If category is soup/yam and dish is not explicitly a rice dish (e.g. ข้าวผัด, ราดข้าว)
      if (
        !cleanDish.includes('ข้าวผัด') &&
        !cleanDish.includes('ราดข้าว') &&
        !cleanDish.includes('ข้าวหน้า') &&
        !cleanDish.includes('ข้าวสวย')
      ) {
        return true;
      }
    }
  }

  // Check if dish itself is clearly a soup or yum dish without rice
  const soupAndYamDishKeywords = [
    'ต้มยำ',
    'แกงจืด',
    'ต้มจืด',
    'ต้มแซ่บ',
    'ต้มข่า',
    'แกงส้ม',
    'แกงเลียง',
    'ยำวุ้นเส้น',
    'ยำมาม่า',
    'ยำรวมมิตร',
    'ยำหมูยอ',
    'ยำไข่ดาว',
    'ยำกุนเชียง',
    'ยำเล็บมือนาง',
    'ยำแซลมอน',
    'ยำกุ้งสด',
    'ยำปูม้า',
    'ยำหอยแครง',
  ];
  for (const kw of soupAndYamDishKeywords) {
    if (cleanDish.includes(kw)) {
      if (
        !cleanDish.includes('ราดข้าว') &&
        !cleanDish.includes('ข้าวผัด') &&
        !cleanDish.includes('ข้าวหน้า') &&
        !cleanDish.includes('ข้าวสวย')
      ) {
        return true;
      }
    }
  }

  // 2. หมวดหมู่ ผัดซีอิ้ว / ผัดซีอิ๊ว / เส้น / Noodles
  const noodleKeywords = [
    'ผัดซีอิ้ว',
    'ผัดซีอิ๊ว',
    'ก๋วยเตี๋ยว',
    'ผัดไทย',
    'ราดหน้า',
    'บะหมี่',
    'เส้นหมี่',
    'เส้นใหญ่',
    'เส้นเล็ก',
    'วุ้นเส้น',
    'สุกี้',
    'มาม่า',
    'ราเมง',
    'พาสต้า',
    'สปาเก็ตตี้',
    'อุด้ง',
    'กวยจั๊บ',
    'noodle',
    'noodles',
    'pad thai',
    'pad see ew',
  ];

  for (const kw of noodleKeywords) {
    if (cleanCat.includes(kw) || cleanDish.includes(kw)) {
      // If dish contains noodles and not explicitly "ข้าว"
      if (!cleanDish.includes('ข้าว') && !cleanDish.includes('rice')) {
        return true;
      }
    }
  }

  // 3. Drinks / Desserts / Snacks
  const excludedCategoryKeywords = [
    'เครื่องดื่ม',
    'drinks',
    'drink',
    'beverage',
    'beverages',
    'ขนม',
    'dessert',
    'desserts',
    'ของหวาน',
    'ไอศกรีม',
    'ice cream',
  ];

  for (const kw of excludedCategoryKeywords) {
    if (cleanCat.includes(kw) || cleanDish.includes(kw)) {
      // If category is drink/dessert and dish doesn't explicitly ask for rice
      if (!cleanDish.includes('ข้าวเหนียว') && !cleanDish.includes('ข้าว')) {
        return true;
      }
    }
  }

  // 4. Appetizers / ของทานเล่น (without rice in name)
  if (
    cleanCat.includes('appetizer') ||
    cleanCat.includes('ของทานเล่น') ||
    cleanCat.includes('ทานเล่น') ||
    cleanCat.includes('snack') ||
    cleanCat.includes('snacks')
  ) {
    if (!cleanDish.includes('ข้าว')) {
      return true;
    }
  }

  // 5. Items with "ข้าวโพด" (corn) or "ข้าวเกรียบ" that aren't rice dishes
  if (
    (cleanDish.includes('ข้าวโพด') || cleanDish.includes('ข้าวเกรียบ')) &&
    !cleanDish.includes('ข้าวผัด') &&
    !cleanDish.includes('ราดข้าว') &&
    !cleanDish.includes('ข้าวหน้า') &&
    !cleanDish.includes('ข้าวสวย')
  ) {
    return true;
  }

  return false;
}

/**
 * Check if an item represents a rice-based dish.
 * All categories/dishes require rice EXCEPT the excluded ones (ยำ/ต้ม, ผัดซีอิ้ว/เส้น, เครื่องดื่ม, ของหวาน/ของทานเล่น).
 */
export function isRiceDishItem(dishName: string, categoryName?: string | null): boolean {
  if (isExcludedFromRice(dishName, categoryName)) {
    return false;
  }

  // All other categories and dishes require rice by default
  return true;
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
    const rawTableName = order.table_session?.table?.name;
    const customerName = order.table_session?.customer_name;
    const isOrderTakeaway =
      isTakeawayName(rawTableName) ||
      !rawTableName ||
      (customerName ? isTakeawayName(customerName) : false);

    const tableName = rawTableName
      ? isTakeawayName(rawTableName) && customerName
        ? `สั่งกลับบ้าน (${customerName})`
        : rawTableName
      : customerName
        ? `สั่งกลับบ้าน (${customerName})`
        : 'หน้าร้าน / กลับบ้าน';

    for (const item of order.items || []) {
      const menuItem = menuItemsMap?.get(item.menu_item_id);
      const category = menuItem?.category_id ? categoriesMap?.get(menuItem.category_id) : undefined;
      const categoryName = category?.name;
      const dishName = item.snapshot_name || menuItem?.name || '';

      const options = item.options || [];

      // Check if item options specify takeaway / packaging
      const isItemTakeaway =
        isOrderTakeaway ||
        options.some(
          (opt) =>
            isTakeawayOption(opt.snapshot_option_name) ||
            (opt.snapshot_option_name || '').includes('กลับบ้าน') ||
            (opt.snapshot_option_name || '').includes('ใส่กล่อง') ||
            (opt.snapshot_option_name || '').includes('ใส่ห่อ') ||
            (opt.snapshot_option_name || '').includes('ห่อกลับ'),
        );

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
        const unit = isItemTakeaway ? 'กล่อง' : 'จาน';

        let displayLabel: string;
        let riceName: string;

        if (isItemTakeaway) {
          displayLabel = `ตักข้าวกลับบ้าน ${sizeLabel}${typeSuffix} ${item.quantity} ${unit}`;
          const baseType = isSticky ? 'ข้าวเหนียว' : isFried ? 'ข้าวผัด' : 'ข้าวสวย';
          riceName = `ตักข้าวกลับบ้าน (${baseType !== 'ข้าวสวย' ? `${baseType} ` : ''}${sizeLabel})`;
        } else {
          displayLabel = `${sizeLabel}${typeSuffix} ${item.quantity} จาน`;
          const baseType = isSticky ? 'ข้าวเหนียว' : isFried ? 'ข้าวผัด' : 'ข้าวสวย';
          riceName = `${baseType} (${sizeLabel})`;
        }

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
          unit,
          isSpecial,
          isFriedRice: isFried,
          isAddonRice: false,
          isTakeaway: isItemTakeaway,
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
          const unit = isItemTakeaway ? 'กล่อง' : 'จาน';

          let displayLabel: string;
          let riceName: string;

          if (isItemTakeaway) {
            displayLabel = `ตักข้าวกลับบ้าน เพิ่มข้าว ${sizeLabel} ${item.quantity} ${unit}`;
            riceName = `ตักข้าวกลับบ้าน (เพิ่มข้าว ${sizeLabel})`;
          } else {
            displayLabel = `เพิ่มข้าว ${sizeLabel} ${item.quantity} จาน`;
            riceName = `ข้าวสวย (${sizeLabel})`;
          }

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
            unit,
            isSpecial: isExtraSpecial,
            isFriedRice: false,
            isAddonRice: true,
            isTakeaway: isItemTakeaway,
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
    'ตักข้าวกลับบ้าน (ธรรมดา)',
    'ตักข้าวกลับบ้าน (พิเศษ)',
    'ข้าวผัด (ธรรมดา)',
    'ข้าวผัด (พิเศษ)',
    'ตักข้าวกลับบ้าน (ข้าวผัด ธรรมดา)',
    'ตักข้าวกลับบ้าน (ข้าวผัด พิเศษ)',
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
        isTakeaway: req.isTakeaway,
        totalQuantity: req.quantity,
        pendingQuantity: isDone ? 0 : req.quantity,
        completedQuantity: isDone ? req.quantity : 0,
        unit: req.unit,
      });
    }
  }

  // Sort: standard keys in priority order, then by pending quantity desc
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
