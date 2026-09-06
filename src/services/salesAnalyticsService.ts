/**
 * Sales Analytics Service
 * Provides queries and statistical calculations for restaurant sales history,
 * day-of-week trends, hourly traffic patterns, menu performance, and business insights.
 */

import { supabase } from './supabase';
import { formatPrice } from 'src/utils/formatters';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface RawBillData {
  id: string;
  table_session_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  table_session?: {
    customer_name?: string | null;
    table?: {
      id?: string;
      name?: string;
    } | null;
  } | null;
}

export interface RawOrderData {
  id: string;
  table_session_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  queued_at: string;
  preparing_at: string | null;
  prepared_at: string | null;
  served_at: string | null;
  table_session?: {
    customer_name?: string | null;
    table?: {
      id?: string;
      name?: string;
    } | null;
  } | null;
}

export interface RawOrderItemData {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  snapshot_name: string;
  snapshot_base_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
  menu_item?: {
    id: string;
    name: string;
    base_price: number;
    is_active: boolean;
    category?: {
      id: string;
      name: string;
    } | null;
  } | null;
  options?: {
    id: string;
    snapshot_option_name: string;
    snapshot_group_name: string;
    snapshot_price_adjustment: number;
  }[];
}

export interface RawMenuItemData {
  id: string;
  name: string;
  base_price: number;
  is_active: boolean;
  is_available: boolean;
  category?: {
    id: string;
    name: string;
  } | null;
}

// ─── Processed Analytics Interfaces ─────────────────────────────────────────

export interface DayOfWeekDataPoint {
  dayIndex: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  dayName: string; // 'จันทร์', 'อังคาร', etc.
  shortName: string; // 'จ.', 'อ.', etc.
  totalSales: number;
  avgSales: number;
  totalOrders: number;
  avgOrders: number;
  billCount: number;
  salesPercentage: number;
  daysCount: number; // number of distinct days of this day-of-week in period
}

export interface HourlyDataPoint {
  hour: number; // 0..23
  label: string; // "12:00"
  orderCount: number;
  totalSales: number;
  avgSalesPerHour: number;
  avgOrdersPerHour: number;
}

export interface MealPeriodSummary {
  periodKey: 'lunch' | 'afternoon' | 'dinner' | 'late';
  title: string;
  timeRange: string;
  icon: string;
  totalSales: number;
  salesPercentage: number;
  orderCount: number;
}

export interface MenuItemPerformance {
  id: string;
  name: string;
  categoryName: string;
  basePrice: number;
  quantitySold: number;
  totalRevenue: number;
  revenueShare: number; // %
  status: 'star' | 'normal' | 'slow' | 'zero';
  daysWithSales: number;
}

export interface TopAddonOption {
  name: string;
  groupName: string;
  count: number;
  totalRevenue: number;
}

export interface CategorySalesSummary {
  id: string;
  name: string;
  totalSales: number;
  totalQuantity: number;
  percentage: number;
}

export interface DiningTypeSummary {
  dineInBills: number;
  dineInSales: number;
  takeawayBills: number;
  takeawaySales: number;
  dineInPercentage: number;
  takeawayPercentage: number;
}

export interface AnalyticsKpiSummary {
  totalSales: number;
  totalBills: number;
  totalDishes: number;
  activeSalesDays: number;
  avgDailySales: number;
  avgBillValue: number;
  avgDishesPerBill: number;
  bestDayOfWeek: {
    dayName: string;
    avgSales: number;
  } | null;
  peakHour: {
    label: string;
    avgOrders: number;
    avgSales: number;
  } | null;
}

export interface BusinessInsightItem {
  type: 'success' | 'warning' | 'info' | 'primary';
  category: 'star' | 'dead_stock' | 'peak_hour' | 'slow_day' | 'basket_size';
  icon: string;
  title: string;
  description: string;
  actionRecommendation: string;
}

export interface FullSalesAnalytics {
  kpis: AnalyticsKpiSummary;
  dayOfWeekData: DayOfWeekDataPoint[];
  weekdayVsWeekend: {
    weekdayAvgSales: number;
    weekendAvgSales: number;
    diffPercentage: number;
    higherType: 'weekend' | 'weekday' | 'equal';
  };
  hourlyData: HourlyDataPoint[];
  mealPeriods: MealPeriodSummary[];
  topSellingItems: MenuItemPerformance[];
  drinkItems?: MenuItemPerformance[];
  slowMovingItems: MenuItemPerformance[];
  zeroSalesItems: MenuItemPerformance[];
  categoryDistribution: CategorySalesSummary[];
  topAddons: TopAddonOption[];
  diningType: DiningTypeSummary[];
  diningTypeSummary: DiningTypeSummary;
  insights: BusinessInsightItem[];
}

// ─── Thai Day Names ─────────────────────────────────────────────────────────

const THAI_DAYS: { [key: number]: { name: string; short: string; order: number } } = {
  1: { name: 'วันจันทร์', short: 'จันทร์', order: 1 },
  2: { name: 'วันอังคาร', short: 'อังคาร', order: 2 },
  3: { name: 'วันพุธ', short: 'พุธ', order: 3 },
  4: { name: 'วันพฤหัสบดี', short: 'พฤหัส', order: 4 },
  5: { name: 'วันศุกร์', short: 'ศุกร์', order: 5 },
  6: { name: 'วันเสาร์', short: 'เสาร์', order: 6 },
  0: { name: 'วันอาทิตย์', short: 'อาทิตย์', order: 7 },
};

// ─── Query Helpers ─────────────────────────────────────────────────────────

const PAGE_SIZE = 1000;

/**
 * Helper to fetch all rows across pages for large datasets in Supabase.
 */
async function fetchAllRows<T>(
  queryBuilder: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T[]> {
  let allRows: T[] = [];
  let from = 0;
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryBuilder(from, to);
    if (error) {
      console.error('Error fetching paginated data:', error);
      throw error instanceof Error ? error : new Error(JSON.stringify(error));
    }
    const items = (data as T[]) || [];
    if (items.length === 0) break;
    allRows = allRows.concat(items);
    if (items.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
}

/**
 * Convert date string or Date to local date string (YYYY-MM-DD)
 */
export function toLocalDateString(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Query Functions ────────────────────────────────────────────────────────

/**
 * Fetch raw sales data for the given date range from Supabase with pagination.
 */
export async function fetchSalesDataForPeriod(
  startDate: Date,
  endDate: Date,
): Promise<{
  bills: RawBillData[];
  orders: RawOrderData[];
  orderItems: RawOrderItemData[];
  allMenuItems: RawMenuItemData[];
}> {
  const fromIso = startDate.toISOString();
  const toIso = endDate.toISOString();

  // Run queries in parallel for high performance, with auto-pagination
  const [bills, orders, orderItems, menuItemsRes] = await Promise.all([
    // 1. Paid Bills in period
    fetchAllRows<RawBillData>((from, to) =>
      supabase
        .from('bills')
        .select(
          `
          id,
          table_session_id,
          total_amount,
          status,
          created_at,
          paid_at,
          table_session:table_sessions (
            customer_name,
            table:tables(id, name)
          )
        `,
        )
        .eq('status', 'PAID')
        .gte('paid_at', fromIso)
        .lte('paid_at', toIso)
        .order('paid_at', { ascending: false })
        .range(from, to),
    ),

    // 2. Orders in period
    fetchAllRows<RawOrderData>((from, to) =>
      supabase
        .from('orders')
        .select(
          `
          id,
          table_session_id,
          total_amount,
          status,
          created_at,
          queued_at,
          preparing_at,
          prepared_at,
          served_at,
          table_session:table_sessions (
            customer_name,
            table:tables(id, name)
          )
        `,
        )
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .order('created_at', { ascending: true })
        .range(from, to),
    ),

    // 3. Order Items with menu items & category & options
    fetchAllRows<RawOrderItemData>((from, to) =>
      supabase
        .from('order_items')
        .select(
          `
          id,
          order_id,
          menu_item_id,
          snapshot_name,
          snapshot_base_price,
          quantity,
          subtotal,
          created_at,
          menu_item:menu_items (
            id,
            name,
            base_price,
            is_active,
            category:menu_categories (
              id,
              name
            )
          ),
          options:order_item_options (
            id,
            snapshot_option_name,
            snapshot_group_name,
            snapshot_price_adjustment
          )
        `,
        )
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .range(from, to),
    ),

    // 4. All active/available menu items for zero-sales / dead-stock detection
    fetchAllRows<RawMenuItemData>((from, to) =>
      supabase
        .from('menu_items')
        .select(
          `
          id,
          name,
          base_price,
          is_active,
          is_available,
          category:menu_categories (
            id,
            name
          )
        `,
        )
        .eq('is_active', true)
        .order('name', { ascending: true })
        .range(from, to),
    ),
  ]);

  return {
    bills,
    orders,
    orderItems,
    allMenuItems: menuItemsRes,
  };
}

// ─── Analytics Engine ───────────────────────────────────────────────────────

/**
 * Filter data by selected Day-of-Week filter ('all', 'mon', 'tue', ..., 'weekdays', 'weekends').
 */
export function filterDataByDayOfWeek(
  bills: RawBillData[],
  orders: RawOrderData[],
  orderItems: RawOrderItemData[],
  dayFilter: string,
): {
  filteredBills: RawBillData[];
  filteredOrders: RawOrderData[];
  filteredOrderItems: RawOrderItemData[];
} {
  if (dayFilter === 'all') {
    return {
      filteredBills: bills,
      filteredOrders: orders,
      filteredOrderItems: orderItems,
    };
  }

  const isMatchingDay = (dateStr: string): boolean => {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    if (dayFilter === 'mon') return day === 1;
    if (dayFilter === 'tue') return day === 2;
    if (dayFilter === 'wed') return day === 3;
    if (dayFilter === 'thu') return day === 4;
    if (dayFilter === 'fri') return day === 5;
    if (dayFilter === 'sat') return day === 6;
    if (dayFilter === 'sun') return day === 0;
    if (dayFilter === 'weekdays') return day >= 1 && day <= 4; // Mon - Thu
    if (dayFilter === 'weekends') return day === 5 || day === 6; // Fri - Sat (shop closed Sun)
    return true;
  };

  const filteredBills = bills.filter((b) => isMatchingDay(b.paid_at || b.created_at));
  const filteredOrders = orders.filter((o) => isMatchingDay(o.created_at));
  const orderIdSet = new Set(filteredOrders.map((o) => o.id));
  const filteredOrderItems = orderItems.filter((it) => orderIdSet.has(it.order_id));

  return {
    filteredBills,
    filteredOrders,
    filteredOrderItems,
  };
}

/**
 * Helper to identify whether an item is a beverage/drink.
 * Drinks are excluded from "Top Selling Items" (food) and categorized under "เครื่องดื่ม".
 */
export function isDrinkItem(name?: string | null, categoryName?: string | null): boolean {
  if (categoryName === 'เครื่องดื่ม') return true;
  const n = (name || '').trim();
  if (
    n === 'น้ำขวด' ||
    n === 'น้ำเปล่า' ||
    n === 'น้ำกระป๋อง' ||
    n === 'น้ำอัดลมกระป๋อง' ||
    n.startsWith('น้ำอัดลม') ||
    n.startsWith('น้ำดื่ม') ||
    n.includes('กระป๋อง') ||
    n.includes('เครื่องดื่ม')
  ) {
    return true;
  }
  return false;
}

/**
 * Helper to identify whether an option group belongs to toppings/addons to be evaluated for Top Addons.
 * Only 'เพิ่มเติม' and 'เนื้อสัตว์เพิ่มเติม' / 'เนื้อสัตว์ (เพิ่มเติม)' are included.
 */
export function isAllowedAddonGroup(groupName?: string | null): boolean {
  if (!groupName) return false;
  const clean = groupName.trim();
  if (clean === 'เพิ่มเติม') return true;
  if (
    clean === 'เนื้อสัตว์ (เพิ่มเติม)' ||
    clean === 'เนื้อสัตว์เพิ่มเติม' ||
    clean === 'เนื้อสัตว์(เพิ่มเติม)'
  ) {
    return true;
  }
  if (
    clean.includes('เพิ่มเติม') &&
    !clean.includes('รูปแบบ') &&
    !clean.includes('เผ็ด') &&
    !clean.includes('ปริมาณ')
  ) {
    return true;
  }
  return false;
}

/**
 * Compute full statistical analytics from raw records.
 */
export function computeSalesAnalytics(
  bills: RawBillData[],
  orders: RawOrderData[],
  orderItems: RawOrderItemData[],
  allMenuItems: RawMenuItemData[],
  startDate: Date,
  endDate: Date,
): FullSalesAnalytics {
  // ─── 1. Distinct Calendar Days in Selection ──────────────────────────────
  const dayCountMap = new Map<string, Date>(); // YYYY-MM-DD -> Date
  const dayOfWeekCountMap = new Map<number, number>(); // 0..6 -> count of distinct days

  for (let i = 0; i <= 6; i++) {
    dayOfWeekCountMap.set(i, 0);
  }

  // Count distinct calendar days present in range
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (cur <= end) {
    const dateKey = toLocalDateString(cur);
    dayCountMap.set(dateKey, new Date(cur));
    const dayOfWeek = cur.getDay();
    dayOfWeekCountMap.set(dayOfWeek, (dayOfWeekCountMap.get(dayOfWeek) || 0) + 1);
    cur.setDate(cur.getDate() + 1);
  }

  const totalCalendarDays = Math.max(1, dayCountMap.size);

  // ─── 2. Key Metrics Aggregations ─────────────────────────────────────────
  const totalSales = bills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const totalBills = bills.length;
  const totalDishes = orderItems.reduce((sum, it) => sum + (it.quantity || 1), 0);

  // Active sales days (days with at least 1 paid bill)
  const activeDaysSet = new Set(bills.map((b) => toLocalDateString(b.paid_at || b.created_at)));
  const activeSalesDays = activeDaysSet.size;

  const avgDailySales = activeSalesDays > 0 ? Math.round(totalSales / activeSalesDays) : 0;
  const avgBillValue = totalBills > 0 ? Math.round(totalSales / totalBills) : 0;
  const avgDishesPerBill = totalBills > 0 ? Number((totalDishes / totalBills).toFixed(1)) : 0;

  // ─── 3. Day of Week Breakdown (จันทร์ - เสาร์, ร้านปิดวันอาทิตย์) ─────────
  // Mon -> Sat (ordered 1, 2, 3, 4, 5, 6)
  const dayOrder = [1, 2, 3, 4, 5, 6];
  const dayStatsMap = new Map<
    number,
    {
      sales: number;
      orders: number;
      bills: number;
      distinctDays: Set<string>;
    }
  >();

  dayOrder.forEach((d) => {
    dayStatsMap.set(d, {
      sales: 0,
      orders: 0,
      bills: 0,
      distinctDays: new Set<string>(),
    });
  });

  bills.forEach((b) => {
    const d = new Date(b.paid_at || b.created_at);
    const dayOfWeek = d.getDay();
    const stat = dayStatsMap.get(dayOfWeek);
    if (stat) {
      stat.sales += b.total_amount || 0;
      stat.bills += 1;
      stat.distinctDays.add(toLocalDateString(d));
    }
  });

  orders.forEach((o) => {
    const d = new Date(o.created_at);
    const dayOfWeek = d.getDay();
    const stat = dayStatsMap.get(dayOfWeek);
    if (stat) {
      stat.orders += 1;
    }
  });

  const dayOfWeekData: DayOfWeekDataPoint[] = dayOrder.map((dayIdx) => {
    const info = THAI_DAYS[dayIdx] || {
      name: `วัน (${dayIdx})`,
      short: `${dayIdx}`,
      order: dayIdx,
    };
    const stat = dayStatsMap.get(dayIdx)!;
    // Number of active sales days for this specific day of the week
    const activeDaysForThisDay = stat.distinctDays.size;

    const avgSales = activeDaysForThisDay > 0 ? Math.round(stat.sales / activeDaysForThisDay) : 0;
    const avgOrders = activeDaysForThisDay > 0 ? Math.round(stat.orders / activeDaysForThisDay) : 0;
    const salesPercentage =
      totalSales > 0 ? Number(((stat.sales / totalSales) * 100).toFixed(1)) : 0;

    return {
      dayIndex: dayIdx,
      dayName: info.name,
      shortName: info.short,
      totalSales: stat.sales,
      avgSales,
      totalOrders: stat.orders,
      avgOrders,
      billCount: stat.bills,
      salesPercentage,
      daysCount: activeDaysForThisDay,
    };
  });

  // Best Selling Day of Week (based on average daily sales among days with sales)
  const activeDaysOnly = dayOfWeekData.filter((d) => d.daysCount > 0 && d.totalSales > 0);
  const sortedDays = [...activeDaysOnly].sort((a, b) => b.avgSales - a.avgSales);
  const topDay = sortedDays[0];
  const bestDayOfWeek =
    topDay && topDay.avgSales > 0
      ? {
          dayName: topDay.dayName,
          avgSales: topDay.avgSales,
        }
      : null;

  // Weekdays (จ.-พฤ.) vs Weekend/Peak (ศ.-ส.)
  const weekdayDays = dayOfWeekData.filter(
    (d) => d.dayIndex >= 1 && d.dayIndex <= 4 && d.daysCount > 0,
  );
  const weekendDays = dayOfWeekData.filter(
    (d) => (d.dayIndex === 5 || d.dayIndex === 6) && d.daysCount > 0,
  );

  const weekdayAvgSales =
    weekdayDays.length > 0
      ? Math.round(weekdayDays.reduce((sum, d) => sum + d.avgSales, 0) / weekdayDays.length)
      : 0;

  const weekendAvgSales =
    weekendDays.length > 0
      ? Math.round(weekendDays.reduce((sum, d) => sum + d.avgSales, 0) / weekendDays.length)
      : 0;

  let diffPercentage = 0;
  let higherType: 'weekend' | 'weekday' | 'equal' = 'equal';

  if (weekendAvgSales > weekdayAvgSales && weekdayAvgSales > 0) {
    diffPercentage = Math.round(((weekendAvgSales - weekdayAvgSales) / weekdayAvgSales) * 100);
    higherType = 'weekend';
  } else if (weekdayAvgSales > weekendAvgSales && weekendAvgSales > 0) {
    diffPercentage = Math.round(((weekdayAvgSales - weekendAvgSales) / weekendAvgSales) * 100);
    higherType = 'weekday';
  }

  // ─── 4. Hourly Peak Distribution (11:00 - 23:00 ร้านเปิด 11 โมง) ───────────
  const hourMap = new Map<number, { orders: number; sales: number }>();
  for (let h = 11; h <= 23; h++) {
    hourMap.set(h, { orders: 0, sales: 0 });
  }

  orders.forEach((o) => {
    const h = new Date(o.created_at).getHours();
    if (hourMap.has(h)) {
      const curH = hourMap.get(h)!;
      curH.orders += 1;
      curH.sales += o.total_amount || 0;
    }
  });

  const hourlyData: HourlyDataPoint[] = Array.from(hourMap.entries()).map(([hour, data]) => {
    const avgSalesPerHour = Math.round(data.sales / totalCalendarDays);
    const avgOrdersPerHour = Math.round(data.orders / totalCalendarDays);
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      orderCount: data.orders,
      totalSales: data.sales,
      avgSalesPerHour,
      avgOrdersPerHour,
    };
  });

  // Identify Peak Hour (based on total or average sales)
  const sortedHours = [...hourlyData].sort((a, b) => b.totalSales - a.totalSales);
  const topHour = sortedHours[0];
  const peakHour =
    topHour && topHour.totalSales > 0
      ? {
          label: `${topHour.label} - ${String((topHour.hour + 1) % 24).padStart(2, '0')}:00 น.`,
          avgOrders: topHour.avgOrdersPerHour,
          avgSales: topHour.avgSalesPerHour,
        }
      : null;

  // ─── 5. Meal Periods Breakdown (เริ่มตั้งแต่ 11:00 น.) ───────────────────────
  const mealPeriodBuckets = {
    lunch: {
      hours: [11, 12, 13],
      title: 'มื้อเที่ยง',
      timeRange: '11:00 - 14:00 น.',
      icon: 'lunch_dining',
      sales: 0,
      orders: 0,
    },
    afternoon: {
      hours: [14, 15, 16],
      title: 'มื้อบ่าย / ของว่าง',
      timeRange: '14:00 - 17:00 น.',
      icon: 'local_cafe',
      sales: 0,
      orders: 0,
    },
    dinner: {
      hours: [17, 18, 19, 20],
      title: 'มื้อเย็น / ค่ำ',
      timeRange: '17:00 - 21:00 น.',
      icon: 'dinner_dining',
      sales: 0,
      orders: 0,
    },
    late: {
      hours: [21, 22, 23],
      title: 'มื้อดึก',
      timeRange: '21:00 - 24:00 น.',
      icon: 'nights_stay',
      sales: 0,
      orders: 0,
    },
  };

  hourlyData.forEach((h) => {
    for (const [, bucket] of Object.entries(mealPeriodBuckets)) {
      if (bucket.hours.includes(h.hour)) {
        bucket.sales += h.totalSales;
        bucket.orders += h.orderCount;
      }
    }
  });

  const totalMealSales = Object.values(mealPeriodBuckets).reduce((sum, b) => sum + b.sales, 0);

  const mealPeriods: MealPeriodSummary[] = (
    Object.keys(mealPeriodBuckets) as (keyof typeof mealPeriodBuckets)[]
  ).map((key) => {
    const b = mealPeriodBuckets[key];
    const percentage =
      totalMealSales > 0 ? Number(((b.sales / totalMealSales) * 100).toFixed(1)) : 0;
    return {
      periodKey: key,
      title: b.title,
      timeRange: b.timeRange,
      icon: b.icon,
      totalSales: b.sales,
      salesPercentage: percentage,
      orderCount: b.orders,
    };
  });

  // ─── 6. Menu Performance Matrix (Best Sellers vs Slow Movers vs Zero) ─────
  // Lookup maps for known menu items to properly connect order_items missing menu_item_id
  const menuById = new Map<string, RawMenuItemData>();
  const menuByName = new Map<string, RawMenuItemData>();

  allMenuItems.forEach((m) => {
    menuById.set(m.id, m);
    if (m.name) {
      menuByName.set(m.name.trim().toLowerCase(), m);
    }
  });

  const itemMap = new Map<
    string,
    {
      id: string;
      name: string;
      categoryName: string;
      basePrice: number;
      quantity: number;
      revenue: number;
      dates: Set<string>;
    }
  >();

  // Prepopulate all active menu items so their base info exists and zero-sales items start at 0
  allMenuItems.forEach((m) => {
    const isDrink = isDrinkItem(m.name, m.category?.name);
    itemMap.set(m.id, {
      id: m.id,
      name: m.name,
      categoryName: isDrink ? 'เครื่องดื่ม' : m.category?.name || 'เมนูทั่วไป',
      basePrice: m.base_price,
      quantity: 0,
      revenue: 0,
      dates: new Set<string>(),
    });
  });

  // Aggregate ordered items
  orderItems.forEach((it) => {
    let matchedMenu: RawMenuItemData | undefined;
    if (it.menu_item_id && menuById.has(it.menu_item_id)) {
      matchedMenu = menuById.get(it.menu_item_id);
    } else if (it.snapshot_name && menuByName.has(it.snapshot_name.trim().toLowerCase())) {
      matchedMenu = menuByName.get(it.snapshot_name.trim().toLowerCase());
    }

    const key = matchedMenu ? matchedMenu.id : it.menu_item_id || it.snapshot_name || 'unknown';
    const name = it.snapshot_name || matchedMenu?.name || it.menu_item?.name || 'เมนูไม่มีชื่อ';
    let catName = matchedMenu?.category?.name || it.menu_item?.category?.name || 'เมนูทั่วไป';
    if (isDrinkItem(name, catName)) {
      catName = 'เครื่องดื่ม';
    }
    const price =
      it.snapshot_base_price || matchedMenu?.base_price || it.menu_item?.base_price || 0;
    const dateStr = it.created_at ? toLocalDateString(it.created_at) : '';

    const existing = itemMap.get(key) || {
      id: key,
      name,
      categoryName: catName,
      basePrice: price,
      quantity: 0,
      revenue: 0,
      dates: new Set<string>(),
    };

    existing.quantity += it.quantity || 1;
    existing.revenue += it.subtotal || 0;
    if (dateStr) existing.dates.add(dateStr);

    itemMap.set(key, existing);
  });

  const allItemsList: MenuItemPerformance[] = Array.from(itemMap.values()).map((it) => {
    const revenueShare = totalSales > 0 ? Number(((it.revenue / totalSales) * 100).toFixed(1)) : 0;
    let status: 'star' | 'normal' | 'slow' | 'zero' = 'normal';

    if (it.quantity === 0) {
      status = 'zero';
    } else if (it.quantity < 3) {
      status = 'slow';
    } else if (revenueShare >= 8 || it.quantity >= 20) {
      status = 'star';
    }

    return {
      id: it.id,
      name: it.name,
      categoryName: it.categoryName,
      basePrice: it.basePrice,
      quantitySold: it.quantity,
      totalRevenue: it.revenue,
      revenueShare,
      status,
      daysWithSales: it.dates.size,
    };
  });

  // Top Selling Food Items (exclude drinks! Water, canned drinks, soda go to drinks category)
  const topSellingItems = allItemsList
    .filter(
      (it) =>
        it.quantitySold > 0 &&
        it.categoryName !== 'เครื่องดื่ม' &&
        !isDrinkItem(it.name, it.categoryName),
    )
    .sort((a, b) => b.quantitySold - a.quantitySold || b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  // Drink items tracked separately
  const drinkItems = allItemsList
    .filter(
      (it) =>
        it.quantitySold > 0 &&
        (it.categoryName === 'เครื่องดื่ม' || isDrinkItem(it.name, it.categoryName)),
    )
    .sort((a, b) => b.quantitySold - a.quantitySold || b.totalRevenue - a.totalRevenue);

  // Slow Moving Items (1 - 3 sold) - only food items
  const slowMovingItems = allItemsList
    .filter(
      (it) =>
        it.quantitySold > 0 &&
        it.quantitySold <= 3 &&
        it.categoryName !== 'เครื่องดื่ม' &&
        !isDrinkItem(it.name, it.categoryName),
    )
    .sort((a, b) => a.quantitySold - b.quantitySold);

  // Zero Sales Items (0 sold in period)
  const zeroSalesItems = allItemsList
    .filter((it) => it.quantitySold === 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  // ─── 7. Category Distribution ────────────────────────────────────────────
  const categoryMap = new Map<
    string,
    { id: string; name: string; sales: number; quantity: number }
  >();

  orderItems.forEach((it) => {
    const name = it.snapshot_name || it.menu_item?.name || '';
    let matchedMenu: RawMenuItemData | undefined;
    if (it.menu_item_id && menuById.has(it.menu_item_id)) {
      matchedMenu = menuById.get(it.menu_item_id);
    } else if (name && menuByName.has(name.trim().toLowerCase())) {
      matchedMenu = menuByName.get(name.trim().toLowerCase());
    }

    let catName = matchedMenu?.category?.name || it.menu_item?.category?.name;
    let catId = matchedMenu?.category?.id || it.menu_item?.category?.id;

    if (isDrinkItem(name, catName)) {
      catName = 'เครื่องดื่ม';
      catId = 'drink_category';
    } else {
      catName = catName || 'เมนูทั่วไป';
      catId = catId || catName;
    }

    const existing = categoryMap.get(catId) || {
      id: catId,
      name: catName,
      sales: 0,
      quantity: 0,
    };

    existing.sales += it.subtotal || 0;
    existing.quantity += it.quantity || 1;
    categoryMap.set(catId, existing);
  });

  const totalCatSales = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.sales, 0);

  const categoryDistribution: CategorySalesSummary[] = Array.from(categoryMap.values())
    .map((c) => ({
      id: c.id,
      name: c.name,
      totalSales: c.sales,
      totalQuantity: c.quantity,
      percentage: totalCatSales > 0 ? Number(((c.sales / totalCatSales) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.totalSales - a.totalSales);

  // ─── 8. Top Add-on Options (เฉพาะ 'เพิ่มเติม' และ 'เนื้อสัตว์เพิ่มเติม') ─────────
  const addonMap = new Map<
    string,
    { name: string; groupName: string; count: number; revenue: number }
  >();

  orderItems.forEach((it) => {
    if (it.options && Array.isArray(it.options)) {
      it.options.forEach((opt) => {
        // Only include options from 'เพิ่มเติม' and 'เนื้อสัตว์เพิ่มเติม' / 'เนื้อสัตว์ (เพิ่มเติม)'
        if (!isAllowedAddonGroup(opt.snapshot_group_name)) {
          return;
        }

        const name = opt.snapshot_option_name;
        // Exclude generic/default options if any
        if (
          name &&
          name !== 'ธรรมดา' &&
          name !== 'ปกติ' &&
          name !== 'ทานที่ร้าน' &&
          name !== 'Dine-in'
        ) {
          const key = `${opt.snapshot_group_name || ''}_${name}`;
          const existing = addonMap.get(key) || {
            name,
            groupName: opt.snapshot_group_name || 'ตัวเลือก',
            count: 0,
            revenue: 0,
          };
          existing.count += it.quantity || 1;
          existing.revenue += (opt.snapshot_price_adjustment || 0) * (it.quantity || 1);
          addonMap.set(key, existing);
        }
      });
    }
  });

  const topAddons: TopAddonOption[] = Array.from(addonMap.values())
    .map((item) => ({
      name: item.name,
      groupName: item.groupName,
      count: item.count,
      totalRevenue: item.revenue,
    }))
    .sort((a, b) => b.count - a.count || b.totalRevenue - a.totalRevenue)
    .slice(0, 8);

  // ─── 9. Dining Type Summary (Dine-in vs Takeaway) ─────────────────────────
  let dineInBills = 0;
  let dineInSales = 0;
  let takeawayBills = 0;
  let takeawaySales = 0;

  bills.forEach((b) => {
    const rawTableName = b.table_session?.table?.name || '';
    const isTakeaway =
      rawTableName.includes('กลับบ้าน') || rawTableName.toLowerCase().includes('takeaway');

    if (isTakeaway) {
      takeawayBills += 1;
      takeawaySales += b.total_amount || 0;
    } else {
      dineInBills += 1;
      dineInSales += b.total_amount || 0;
    }
  });

  const diningTypeSummary: DiningTypeSummary = {
    dineInBills,
    dineInSales,
    takeawayBills,
    takeawaySales,
    dineInPercentage: totalSales > 0 ? Number(((dineInSales / totalSales) * 100).toFixed(1)) : 0,
    takeawayPercentage:
      totalSales > 0 ? Number(((takeawaySales / totalSales) * 100).toFixed(1)) : 0,
  };

  // ─── 10. Automated Business Insights & Recommendations ───────────────────
  const insights: BusinessInsightItem[] = [];

  // Insight 1: Star Menu Driver
  if (topSellingItems.length > 0 && topSellingItems[0]) {
    const starItem = topSellingItems[0];
    insights.push({
      type: 'success',
      category: 'star',
      icon: 'military_tech',
      title: `เมนูสร้างรายได้อันดับ 1: ${starItem.name}`,
      description: `สร้างยอดขาย ${formatPrice(starItem.totalRevenue)} (${starItem.quantitySold} จาน) คิดเป็น ${starItem.revenueShare}% ของยอดขายอาหารทั้งหมด`,
      actionRecommendation:
        'เป็นเมนูแม่เหล็กของร้าน ควรจัดเตรียมสต็อกวัตถุดิบหลักให้เพียงพอ และอาจจัดโปรโมชั่นคู่เครื่องดื่มเพื่อเพิ่มยอดต่อบิล',
    });
  }

  // Insight 2: Peak Time & Staffing
  if (peakHour) {
    insights.push({
      type: 'primary',
      category: 'peak_hour',
      icon: 'alarm_on',
      title: `ช่วงเวลาเร่งด่วน: ${peakHour.label}`,
      description: `มีออเดอร์เฉลี่ย ${peakHour.avgOrders} รายการ และยอดขายเฉลี่ย ${formatPrice(peakHour.avgSales)} ในชั่วโมงนี้`,
      actionRecommendation:
        'จัดกำลังพลในครัวและพนักงานเสิร์ฟให้พร้อมสูงสุดช่วงเวลานี้ เพื่อลดเวลารออาหารและเพิ่มความพึงพอใจของลูกค้า',
    });
  }

  // Insight 3: Day of Week Trend
  if (bestDayOfWeek && dayOfWeekData.length >= 7) {
    const lowestDay = sortedDays[sortedDays.length - 1];
    if (lowestDay) {
      insights.push({
        type: 'info',
        category: 'slow_day',
        icon: 'calendar_month',
        title: `แนวโน้มรายวัน: ${bestDayOfWeek.dayName} ขายดีที่สุด`,
        description: `${bestDayOfWeek.dayName} มียอดขายเฉลี่ยสูงสุด ${formatPrice(bestDayOfWeek.avgSales)}/วัน ในขณะที่ ${lowestDay.dayName} มียอดขายเฉลี่ยต่ำสุด (${formatPrice(lowestDay.avgSales)}/วัน)`,
        actionRecommendation: `พิจารณาทำโปรโมชั่นพิเศษหรือคูปองส่วนลดเฉพาะ${lowestDay.dayName} เพื่อกระตุ้นยอดขายในวันที่มีลูกค้าน้อย`,
      });
    }
  }

  // Insight 4: Dead Stock / Slow Moving Warning
  if (zeroSalesItems.length > 0 || slowMovingItems.length > 0) {
    const zeroCount = zeroSalesItems.length;
    const slowCount = slowMovingItems.length;
    insights.push({
      type: 'warning',
      category: 'dead_stock',
      icon: 'warning_amber',
      title: `ตรวจพบเมนูขายช้าหรือไม่มีคนสั่ง ${zeroCount + slowCount} เมนู`,
      description: `มี ${zeroCount} เมนูที่ไม่มีคนสั่งเลยในช่วงเวลานี้ และ ${slowCount} เมนูที่ขายได้น้อยมาก`,
      actionRecommendation:
        'ควรพิจารณาปรับรูปภาพ/ตำแหน่งเมนูบนแอป จัดเซ็ตคอมโบ้ หรือตัดเมนูที่ต้นทุนวัตถุดิบสูงออกเพื่อลดของเหลือทิ้ง (Food Waste)',
    });
  }

  // Insight 5: Basket Size / Add-on Opportunity
  if (topAddons.length > 0 && topAddons[0]) {
    const topAddon = topAddons[0];
    insights.push({
      type: 'primary',
      category: 'basket_size',
      icon: 'add_shopping_cart',
      title: `ท็อปปิ้งเสริมยอดนิยม: ${topAddon.name}`,
      description: `ลูกค้าสั่งเสริมถึง ${topAddon.count} ครั้ง สร้างรายได้เพิ่มเติม ${formatPrice(topAddon.totalRevenue)}`,
      actionRecommendation:
        'แนะนำให้ตั้งเป็นตัวเลือกเสริมที่แนะนำ (Recommended Add-on) หน้าสั่งอาหาร เพื่อเพิ่มค่าเฉลี่ยยอดสั่งต่อบิล (AOV)',
    });
  }

  const kpis: AnalyticsKpiSummary = {
    totalSales,
    totalBills,
    totalDishes,
    activeSalesDays,
    avgDailySales,
    avgBillValue,
    avgDishesPerBill,
    bestDayOfWeek,
    peakHour,
  };

  return {
    kpis,
    dayOfWeekData,
    weekdayVsWeekend: {
      weekdayAvgSales,
      weekendAvgSales,
      diffPercentage,
      higherType,
    },
    hourlyData,
    mealPeriods,
    topSellingItems,
    drinkItems,
    slowMovingItems,
    zeroSalesItems,
    categoryDistribution,
    topAddons,
    diningType: [diningTypeSummary],
    diningTypeSummary,
    insights,
  };
}
