import type { OrderWithItems, MenuItem, FryConfig } from '../types/database';
import { OrderStatus } from '../types/enums';

export interface FryRequirement {
  id: string; // unique item key for checkbox state
  orderId: string;
  orderItemId: string;
  queueNumber: number;
  tableName: string;
  customerName?: string | null | undefined;
  dishName: string;
  fryName: string;
  quantity: number;
  unit: string;
  isSpecial: boolean;
  isAddon: boolean;
  specialInstruction?: string | null | undefined;
  orderStatus: string;
  queuedAt: string;
}

export interface FrySummaryItem {
  fryName: string;
  totalQuantity: number;
  pendingQuantity: number;
  completedQuantity: number;
  unit: string;
}

/**
 * Auto-detect fallback fry configuration from item name if not explicitly set in database.
 */
export function inferFryConfigFromName(name: string): FryConfig | null {
  const cleanName = name.trim();

  // 1. เต้าหู้ไข่ (ตัวเลือกเพิ่มเติม)
  if (cleanName.includes('เต้าหู้ไข่')) {
    return {
      is_fried: true,
      fry_name: 'เต้าหู้ไข่',
      fry_qty: 1,
      special_fry_name: 'เต้าหู้ไข่พิเศษ',
      special_fry_qty: 1,
      unit: 'ออเดอร์',
    };
  }

  // 2. เอ็นไก่ทอด
  if (cleanName.includes('เอ็นไก่ทอด')) {
    return {
      is_fried: true,
      fry_name: 'เอ็นไก่ทอด',
      fry_qty: 1,
      special_fry_name: 'เอ็นไก่ทอดพิเศษ',
      special_fry_qty: 1,
      unit: 'ออเดอร์',
    };
  }

  // 3. ปีกไก่
  if (cleanName.includes('ปีกไก่')) {
    if (cleanName.includes('ราดซอส')) {
      return {
        is_fried: true,
        fry_name: 'ปีกไก่ราดซอส (2 ปีก)',
        fry_qty: 1,
        special_fry_name: 'ปีกไก่ราดซอสพิเศษ',
        special_fry_qty: 1,
        unit: 'ออเดอร์',
      };
    }
    return {
      is_fried: true,
      fry_name: 'ปีกไก่ทอด (3 ปีก)',
      fry_qty: 1,
      special_fry_name: 'ปีกไก่ทอดพิเศษ (4 ปีก)',
      special_fry_qty: 1,
      unit: 'ออเดอร์',
    };
  }

  // 4. สามชั้น
  if (cleanName.includes('สามชั้น')) {
    if (cleanName.includes('ราดซอส')) {
      return {
        is_fried: true,
        fry_name: 'สามชั้นทอดราดซอส',
        fry_qty: 1,
        special_fry_name: 'สามชั้นทอดราดซอสพิเศษ',
        special_fry_qty: 1,
        unit: 'ออเดอร์',
      };
    }
    return {
      is_fried: true,
      fry_name: 'สามชั้นทอด',
      fry_qty: 1,
      special_fry_name: 'สามชั้นทอดพิเศษ',
      special_fry_qty: 1,
      unit: 'ออเดอร์',
    };
  }

  // 5. ไก่ทอด
  if (cleanName.includes('ไก่ทอด')) {
    if (cleanName.includes('ราดซอส')) {
      return {
        is_fried: true,
        fry_name: 'ไก่ทอดราดซอส',
        fry_qty: 1,
        special_fry_name: 'ไก่ทอดราดซอสพิเศษ',
        special_fry_qty: 1,
        unit: 'ออเดอร์',
      };
    }
    return {
      is_fried: true,
      fry_name: 'ไก่ทอด',
      fry_qty: 1,
      special_fry_name: 'ไก่ทอดพิเศษ',
      special_fry_qty: 1,
      unit: 'ออเดอร์',
    };
  }

  return null;
}

/**
 * Extract all fried item requirements from a list of active orders.
 */
export function extractFryRequirementsFromOrders(
  orders: OrderWithItems[],
  menuItemsMap?: Map<string, MenuItem>,
): FryRequirement[] {
  const requirements: FryRequirement[] = [];

  // Filter only active unserved kitchen orders (QUEUED and PREPARING)
  const activeOrders = orders.filter(
    (o) => o.status === OrderStatus.QUEUED || o.status === OrderStatus.PREPARING,
  );

  for (const order of activeOrders) {
    const tableName = order.table_session?.table?.name || 'กลับบ้าน / ไม่ระบุ';
    const customerName = order.table_session?.customer_name;

    for (const item of order.items || []) {
      const menuItem = menuItemsMap?.get(item.menu_item_id);

      // 1. Determine base dish fry requirement
      let fryConfig = menuItem?.fry_config;
      if (!fryConfig || fryConfig.is_fried === undefined) {
        // Fallback auto-detection from snapshot name or menu item name
        fryConfig = inferFryConfigFromName(item.snapshot_name || menuItem?.name || '');
      }

      // Check if order item has "พิเศษ" option
      const hasSpecialOption = (item.options || []).some((opt) =>
        opt.snapshot_option_name.includes('พิเศษ'),
      );

      if (fryConfig && fryConfig.is_fried) {
        let fryName = fryConfig.fry_name || item.snapshot_name;
        let qtyPerDish = fryConfig.fry_qty || 1;

        if (hasSpecialOption) {
          if (fryConfig.special_fry_name) {
            fryName = fryConfig.special_fry_name;
          } else if (!fryName.includes('พิเศษ')) {
            fryName = `${fryName} (พิเศษ)`;
          }
          if (fryConfig.special_fry_qty) {
            qtyPerDish = fryConfig.special_fry_qty;
          }
        }

        requirements.push({
          id: `${order.id}-${item.id}-dish`,
          orderId: order.id,
          orderItemId: item.id,
          queueNumber: order.queue_number,
          tableName,
          customerName,
          dishName: item.snapshot_name,
          fryName,
          quantity: qtyPerDish * item.quantity,
          unit: fryConfig.unit || 'ออเดอร์',
          isSpecial: hasSpecialOption,
          isAddon: false,
          specialInstruction: item.special_instruction,
          orderStatus: order.status,
          queuedAt: order.queued_at,
        });
      }

      // 2. Check options for any fried add-on meats (e.g. เพิ่ม ไก่ทอด, สามชั้นทอด, ปีกไก่)
      for (const opt of item.options || []) {
        const optName = opt.snapshot_option_name || '';
        const optFryConfig = inferFryConfigFromName(optName);

        if (optFryConfig && optFryConfig.is_fried) {
          requirements.push({
            id: `${order.id}-${item.id}-opt-${opt.option_id || optName}`,
            orderId: order.id,
            orderItemId: item.id,
            queueNumber: order.queue_number,
            tableName,
            customerName,
            dishName: item.snapshot_name,
            fryName: `${optName} (เพิ่ม)`,
            quantity: (optFryConfig.fry_qty || 1) * item.quantity,
            unit: optFryConfig.unit || 'ออเดอร์',
            isSpecial: false,
            isAddon: true,
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
 * Aggregate fry summary list for the station top summary cards.
 */
export function aggregateFrySummary(
  requirements: FryRequirement[],
  completedIdSet: Set<string>,
): FrySummaryItem[] {
  const summaryMap = new Map<string, FrySummaryItem>();

  for (const req of requirements) {
    const isDone = completedIdSet.has(req.id);
    const existing = summaryMap.get(req.fryName);

    if (existing) {
      existing.totalQuantity += req.quantity;
      if (isDone) {
        existing.completedQuantity += req.quantity;
      } else {
        existing.pendingQuantity += req.quantity;
      }
    } else {
      summaryMap.set(req.fryName, {
        fryName: req.fryName,
        totalQuantity: req.quantity,
        pendingQuantity: isDone ? 0 : req.quantity,
        completedQuantity: isDone ? req.quantity : 0,
        unit: req.unit,
      });
    }
  }

  return Array.from(summaryMap.values()).sort((a, b) => b.pendingQuantity - a.pendingQuantity);
}
