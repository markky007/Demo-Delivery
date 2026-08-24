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

// ─── Query Functions ────────────────────────────────────────────────────────

/**
 * Fetch raw sales data for the given date range from Supabase.
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

  // Run queries in parallel for high performance
  const [billsRes, ordersRes, orderItemsRes, menuItemsRes] = await Promise.all([
    // 1. Paid Bills in period
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
      .order('paid_at', { ascending: false }),

    // 2. Orders in period
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
      .order('created_at', { ascending: true }),

    // 3. Order Items with menu items & category & options
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
      .lte('created_at', toIso),

    // 4. All active/available menu items for zero-sales / dead-stock detection
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
      .order('name', { ascending: true }),
  ]);

  if (billsRes.error) console.error('Error fetching bills:', billsRes.error);
  if (ordersRes.error) console.error('Error fetching orders:', ordersRes.error);
  if (orderItemsRes.error) console.error('Error fetching order items:', orderItemsRes.error);
  if (menuItemsRes.error) console.error('Error fetching menu items:', menuItemsRes.error);

  return {
    bills: (billsRes.data as unknown as RawBillData[]) || [],
    orders: (ordersRes.data as unknown as RawOrderData[]) || [],
    orderItems: (orderItemsRes.data as unknown as RawOrderItemData[]) || [],
    allMenuItems: (menuItemsRes.data as unknown as RawMenuItemData[]) || [],
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
    if (dayFilter === 'weekdays') return day >= 1 && day <= 5;
    if (dayFilter === 'weekends') return day === 0 || day === 6;
    return true;
  };

  const filteredBills = bills.filter((b) => isMatchingDay(b.paid_at || b.created_at));
  const filteredOrders = orders.filter((o) => isMatchingDay(o.created_at));
  const orderIdSet = new Set(filteredOrders.map((o) => o.id));
  const filteredOrderItems = orderItems.filter(
    (it) => orderIdSet.has(it.order_id) || isMatchingDay(it.created_at),
  );

  return {
    filteredBills,
    filteredOrders,
    filteredOrderItems,
  };
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
    const dateKey = cur.toISOString().slice(0, 10);
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
  const activeDaysSet = new Set(bills.map((b) => (b.paid_at || b.created_at).slice(0, 10)));
  const activeSalesDays = Math.max(1, activeDaysSet.size);

  const avgDailySales = Math.round(totalSales / activeSalesDays);
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
      stat.distinctDays.add(d.toISOString().slice(0, 10));
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
    // Number of occurrences of this day in selected period (fallback to actual active days or 1)
    const occurrences = Math.max(1, dayOfWeekCountMap.get(dayIdx) || stat.distinctDays.size || 1);

    const avgSales = Math.round(stat.sales / occurrences);
    const avgOrders = Math.round(stat.orders / occurrences);
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
      daysCount: occurrences,
    };
  });

  // Best Selling Day of Week (based on average daily sales)
  const sortedDays = [...dayOfWeekData].sort((a, b) => b.avgSales - a.avgSales);
  const topDay = sortedDays[0];
  const bestDayOfWeek =
    topDay && topDay.totalSales > 0
      ? {
          dayName: topDay.dayName,
          avgSales: topDay.avgSales,
        }
      : null;

  // Weekdays (จ.-พฤ.) vs Weekend/Peak (ศ.-ส.)
  const weekdayDays = dayOfWeekData.filter((d) => d.dayIndex >= 1 && d.dayIndex <= 4);
  const weekendDays = dayOfWeekData.filter((d) => d.dayIndex === 5 || d.dayIndex === 6);

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

  // Aggregate ordered items
  orderItems.forEach((it) => {
    const key = it.menu_item_id || it.snapshot_name;
    const catName = it.menu_item?.category?.name || 'เมนูทั่วไป';
    const name = it.snapshot_name || it.menu_item?.name || 'เมนูไม่มีชื่อ';
    const price = it.snapshot_base_price || it.menu_item?.base_price || 0;
    const dateStr = (it.created_at || '').slice(0, 10);

    const existing = itemMap.get(key) || {
      id: it.menu_item_id || key,
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

  // Include active menu items with 0 sales
  allMenuItems.forEach((m) => {
    if (!itemMap.has(m.id)) {
      itemMap.set(m.id, {
        id: m.id,
        name: m.name,
        categoryName: m.category?.name || 'เมนูทั่วไป',
        basePrice: m.base_price,
        quantity: 0,
        revenue: 0,
        dates: new Set<string>(),
      });
    }
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

  // Top Selling Items (sorted by quantity and revenue)
  const topSellingItems = allItemsList
    .filter((it) => it.quantitySold > 0)
    .sort((a, b) => b.quantitySold - a.quantitySold || b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  // Slow Moving Items (1 - 3 sold)
  const slowMovingItems = allItemsList
    .filter((it) => it.quantitySold > 0 && it.quantitySold <= 3)
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
    const catName = it.menu_item?.category?.name || 'เมนูทั่วไป';
    const catId = it.menu_item?.category?.id || catName;

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

  // ─── 8. Top Add-on Options ───────────────────────────────────────────────
  const addonMap = new Map<
    string,
    { name: string; groupName: string; count: number; revenue: number }
  >();

  orderItems.forEach((it) => {
    if (it.options && Array.isArray(it.options)) {
      it.options.forEach((opt) => {
        const name = opt.snapshot_option_name;
        // Exclude generic/default options
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
    slowMovingItems,
    zeroSalesItems,
    categoryDistribution,
    topAddons,
    diningType: [diningTypeSummary],
    diningTypeSummary,
    insights,
  };
}
