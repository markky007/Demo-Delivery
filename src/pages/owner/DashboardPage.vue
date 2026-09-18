<template>
  <q-page class="dashboard-page q-pa-lg">
    <div class="dashboard-container">
      <!-- ─── Welcome Greeting & Quick CTA Header ───────────────────────── -->
      <div class="row items-center justify-between q-mb-xl header-section">
        <div>
          <div class="row items-center q-gutter-sm">
            <h1 class="page-heading">ภาพรวมร้านค้าวันนี้</h1>
            <div class="live-pill">
              <span class="live-dot"></span>
              LIVE
            </div>
          </div>
          <p class="page-subheading q-mb-none q-mt-xs">
            สรุปยอดขาย การวิเคราะห์เชิงธุรกิจ และสถานะหน้าร้านแบบเรียลไทม์
            <span v-if="lastRefreshedText" class="text-muted">
              • อัปเดตล่าสุด: {{ lastRefreshedText }}
            </span>
          </p>
        </div>

        <div class="row items-center q-gutter-sm header-actions">
          <q-btn
            unelevated
            dense
            no-caps
            color="surface-alt"
            text-color="ink"
            icon="refresh"
            label="รีเฟรชข้อมูล"
            :loading="isRefreshing"
            @click="refreshData"
            class="pill-btn secondary-action-btn q-px-md"
          />
          <q-btn
            color="primary"
            unelevated
            no-caps
            icon="soup_kitchen"
            label="ดูคิวออเดอร์"
            to="/owner/queue"
            class="pill-btn primary-action-btn q-px-lg"
          />
        </div>
      </div>

      <!-- Loading Skeleton -->
      <LoadingSkeleton v-if="isLoading" type="dashboard" />

      <template v-else>
        <!-- ─── 1. Stats 4 Cards Grid (Apple Style) ────────────────────────── -->
        <div class="stats-grid q-mb-xl">
          <div class="stat-card">
            <div class="stat-header row items-center justify-between">
              <span class="stat-label">ยอดขายวันนี้</span>
              <div class="stat-icon-wrap stat-icon-wrap--primary">
                <q-icon name="payments" size="20px" color="primary" />
              </div>
            </div>
            <div class="stat-value text-ink font-mono q-mt-sm">
              {{ formatPrice(stats.totalSales) }}
            </div>
            <div class="stat-caption text-muted">รวมทุกออเดอร์ในวันนี้</div>
          </div>

          <div class="stat-card">
            <div class="stat-header row items-center justify-between">
              <span class="stat-label">จำนวนออเดอร์</span>
              <div class="stat-icon-wrap stat-icon-wrap--blue">
                <q-icon name="receipt_long" size="20px" color="primary" />
              </div>
            </div>
            <div class="stat-value text-ink font-mono q-mt-sm">
              {{ stats.totalOrders }} <span class="stat-unit">รายการ</span>
            </div>
            <div class="stat-caption text-muted">ออเดอร์ที่เข้ามาทั้งหมด</div>
          </div>

          <div class="stat-card">
            <div class="stat-header row items-center justify-between">
              <span class="stat-label">จำนวนจานที่ขาย</span>
              <div class="stat-icon-wrap stat-icon-wrap--amber">
                <q-icon name="restaurant" size="20px" color="amber-9" />
              </div>
            </div>
            <div class="stat-value text-ink font-mono q-mt-sm">
              {{ stats.itemsSold }} <span class="stat-unit">จาน</span>
            </div>
            <div class="stat-caption text-muted">ปริมาณเมนูที่จำหน่าย</div>
          </div>

          <div class="stat-card">
            <div class="stat-header row items-center justify-between">
              <span class="stat-label">ยอดเฉลี่ยต่อออเดอร์</span>
              <div class="stat-icon-wrap stat-icon-wrap--green">
                <q-icon name="trending_up" size="20px" color="positive" />
              </div>
            </div>
            <div class="stat-value text-ink font-mono q-mt-sm">
              {{ formatPrice(stats.avgOrderValue) }}
            </div>
            <div class="stat-caption text-muted">Basket Size เฉลี่ย</div>
          </div>
        </div>

        <!-- ─── 2. Operational & Settlement Pulse (Replaces Kitchen Queue) ──── -->
        <div class="row q-col-gutter-lg q-mb-xl">
          <div class="col-12 col-md-6">
            <TableOccupancyCard
              :occupied-tables="tableStats.occupiedTables"
              :total-tables="tableStats.totalTables"
              :avg-dwell-mins="tableStats.avgDwellMins"
              :turnover-rate="tableStats.turnoverRate"
            />
          </div>
          <div class="col-12 col-md-6">
            <SettlementSummaryCard
              :paid-sales="settlementStats.paidSales"
              :pending-sales="settlementStats.pendingSales"
              :paid-bills-count="settlementStats.paidBillsCount"
              :total-bills-count="settlementStats.totalBillsCount"
            />
          </div>
        </div>

        <!-- ─── 3. Meal Period Rush Breakdown (New Insight Graph) ───────────── -->
        <div class="q-mb-xl">
          <MealPeriodChart :meal-periods="mealPeriods" />
        </div>

        <!-- ─── 4. Primary Peak Time Hourly Curve Chart ─────────────────────── -->
        <div class="q-mb-xl">
          <HourlyPeakTimeChart :hourly-data="hourlyData" />
        </div>

        <!-- ─── 5. Secondary Analytics Row: Best Selling & Category Breakdown ── -->
        <div class="row q-col-gutter-lg q-mb-xl">
          <div class="col-12 col-md-6">
            <TopSellingItemsChart :items="topSellingItems" />
          </div>
          <div class="col-12 col-md-6">
            <CategorySalesChart :categories="categoryDistribution" />
          </div>
        </div>

        <!-- ─── 6. Tertiary Analytics Row: Dining Type & Kitchen Velocity ───── -->
        <div class="row q-col-gutter-lg q-mb-xl">
          <div class="col-12 col-md-5">
            <DiningTypeCard
              :dine-in-orders="diningStats.dineInOrders"
              :dine-in-sales="diningStats.dineInSales"
              :takeaway-orders="diningStats.takeawayOrders"
              :takeaway-sales="diningStats.takeawaySales"
            />
          </div>
          <div class="col-12 col-md-7">
            <KitchenVelocityCard
              :avg-wait-mins="velocityStats.avgWaitMins"
              :avg-cook-mins="velocityStats.avgCookMins"
              :avg-total-mins="velocityStats.avgTotalMins"
            />
          </div>
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from 'src/services/supabase';
import { formatPrice, formatTime } from 'src/utils/formatters';
import type { OrderStatus } from 'src/types/enums';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import HourlyPeakTimeChart, {
  type HourlyDataPoint,
} from 'src/components/dashboard/HourlyPeakTimeChart.vue';
import TopSellingItemsChart, {
  type TopMenuItem,
} from 'src/components/dashboard/TopSellingItemsChart.vue';
import CategorySalesChart, {
  type CategoryData,
} from 'src/components/dashboard/CategorySalesChart.vue';
import DiningTypeCard from 'src/components/dashboard/DiningTypeCard.vue';
import KitchenVelocityCard from 'src/components/dashboard/KitchenVelocityCard.vue';
import TableOccupancyCard from 'src/components/dashboard/TableOccupancyCard.vue';
import SettlementSummaryCard from 'src/components/dashboard/SettlementSummaryCard.vue';
import MealPeriodChart, { type MealPeriodItem } from 'src/components/dashboard/MealPeriodChart.vue';

interface FetchedOrder {
  id: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  queued_at: string;
  preparing_at: string | null;
  prepared_at: string | null;
  served_at: string | null;
  table_session_id: string;
  table_session?: {
    id: string;
    table?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

interface FetchedOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  snapshot_name: string;
  quantity: number;
  subtotal: number;
  created_at: string;
  menu_item?: {
    id: string;
    name: string;
    category?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

const isLoading = ref(true);
const isRefreshing = ref(false);
const lastRefreshedText = ref('');

let realtimeChannel: RealtimeChannel | null = null;

const stats = reactive({
  totalSales: 0,
  totalOrders: 0,
  itemsSold: 0,
  avgOrderValue: 0,
});

const tableStats = reactive({
  occupiedTables: 0,
  totalTables: 0,
  avgDwellMins: 0,
  turnoverRate: 0,
});

const settlementStats = reactive({
  paidSales: 0,
  pendingSales: 0,
  paidBillsCount: 0,
  totalBillsCount: 0,
});

const mealPeriods = ref<MealPeriodItem[]>([]);
const hourlyData = ref<HourlyDataPoint[]>([]);
const topSellingItems = ref<TopMenuItem[]>([]);
const categoryDistribution = ref<CategoryData[]>([]);

const diningStats = reactive({
  dineInOrders: 0,
  dineInSales: 0,
  takeawayOrders: 0,
  takeawaySales: 0,
});

const velocityStats = reactive({
  avgWaitMins: 0,
  avgCookMins: 0,
  avgTotalMins: 0,
});

async function loadDashboardData() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Fetch orders of today with table session info
    const { data: rawOrders, error: ordersErr } = await supabase
      .from('orders')
      .select(
        `
        id,
        total_amount,
        status,
        created_at,
        queued_at,
        preparing_at,
        prepared_at,
        served_at,
        table_session_id,
        table_session:table_sessions(
          id,
          table:tables(id, name)
        )
      `,
      )
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: true });

    if (ordersErr) {
      console.error('Error fetching orders for dashboard:', ordersErr);
    }

    const orders = (rawOrders as unknown as FetchedOrder[]) || null;

    // 2. Fetch order items of today with menu items and category info
    const { data: rawOrderItems, error: itemsErr } = await supabase
      .from('order_items')
      .select(
        `
        id,
        order_id,
        menu_item_id,
        snapshot_name,
        quantity,
        subtotal,
        created_at,
        menu_item:menu_items(
          id,
          name,
          category:menu_categories(id, name)
        )
      `,
      )
      .gte('created_at', todayStart.toISOString());

    if (itemsErr) {
      console.error('Error fetching order items for dashboard:', itemsErr);
    }

    const orderItems = (rawOrderItems as unknown as FetchedOrderItem[]) || null;

    // 3. Fetch active tables & table sessions for occupancy metrics
    const { data: rawTables } = await supabase
      .from('tables')
      .select('id, name, is_active')
      .eq('is_active', true);

    const dineInTables = (rawTables || []).filter(
      (t) => !t.name.includes('กลับบ้าน') && !t.name.toLowerCase().includes('takeaway'),
    );
    const dineInTableIds = new Set(dineInTables.map((t) => t.id));
    tableStats.totalTables = dineInTables.length;

    const { data: rawSessions } = await supabase
      .from('table_sessions')
      .select('id, table_id, status, created_at, closed_at')
      .gte('created_at', todayStart.toISOString());

    if (rawSessions) {
      const activeSessions = rawSessions.filter(
        (s) => s.status === 'ACTIVE' && dineInTableIds.has(s.table_id),
      );
      tableStats.occupiedTables = activeSessions.length;

      const closedSessions = rawSessions.filter(
        (s) => s.closed_at && dineInTableIds.has(s.table_id),
      );
      if (closedSessions.length > 0) {
        const totalDwell = closedSessions.reduce((sum, s) => {
          const diff = (new Date(s.closed_at).getTime() - new Date(s.created_at).getTime()) / 60000;
          return sum + Math.max(0, diff);
        }, 0);
        tableStats.avgDwellMins = Math.round(totalDwell / closedSessions.length);
      } else {
        tableStats.avgDwellMins = 0;
      }

      tableStats.turnoverRate =
        tableStats.totalTables > 0 ? rawSessions.length / tableStats.totalTables : 0;
    }

    // 4. Fetch bills of today for settlement pulse
    const { data: rawBills } = await supabase
      .from('bills')
      .select('id, total_amount, status, created_at, paid_at')
      .gte('created_at', todayStart.toISOString());

    // Process Orders Data
    if (orders) {
      stats.totalOrders = orders.length;
      stats.totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      stats.avgOrderValue =
        stats.totalOrders > 0 ? Math.round(stats.totalSales / stats.totalOrders) : 0;

      // Settlement calculations
      if (rawBills && rawBills.length > 0) {
        const paid = rawBills.filter((b) => b.status === 'PAID');
        settlementStats.paidBillsCount = paid.length;
        settlementStats.totalBillsCount = rawBills.length;
        settlementStats.paidSales = paid.reduce((sum, b) => sum + (b.total_amount || 0), 0);

        const pending = rawBills.filter((b) => b.status === 'PENDING');
        const pendingAmountFromBills = pending.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        settlementStats.pendingSales = Math.max(
          pendingAmountFromBills,
          Math.max(0, stats.totalSales - settlementStats.paidSales),
        );
      } else {
        settlementStats.paidSales = stats.totalSales;
        settlementStats.pendingSales = 0;
        settlementStats.paidBillsCount = stats.totalOrders;
        settlementStats.totalBillsCount = stats.totalOrders;
      }

      // ─── Compute Meal Periods Breakdown ───────────────────
      type MealKey = 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'late';
      const periodBuckets: Record<MealKey, { sales: number; orders: number }> = {
        morning: { sales: 0, orders: 0 },
        lunch: { sales: 0, orders: 0 },
        afternoon: { sales: 0, orders: 0 },
        dinner: { sales: 0, orders: 0 },
        late: { sales: 0, orders: 0 },
      };

      orders.forEach((ord) => {
        const h = new Date(ord.created_at).getHours();
        const amt = ord.total_amount || 0;

        if (h >= 8 && h < 11) {
          periodBuckets.morning.sales += amt;
          periodBuckets.morning.orders += 1;
        } else if (h >= 11 && h < 14) {
          periodBuckets.lunch.sales += amt;
          periodBuckets.lunch.orders += 1;
        } else if (h >= 14 && h < 17) {
          periodBuckets.afternoon.sales += amt;
          periodBuckets.afternoon.orders += 1;
        } else if (h >= 17 && h < 21) {
          periodBuckets.dinner.sales += amt;
          periodBuckets.dinner.orders += 1;
        } else {
          periodBuckets.late.sales += amt;
          periodBuckets.late.orders += 1;
        }
      });

      const totalPeriodSales = Math.max(1, stats.totalSales);
      mealPeriods.value = [
        {
          id: 'morning',
          name: 'มื้อเช้า',
          timeRange: '08:00 - 11:00',
          icon: '🌅',
          sales: periodBuckets.morning.sales,
          orderCount: periodBuckets.morning.orders,
          percent: Math.round((periodBuckets.morning.sales / totalPeriodSales) * 100),
        },
        {
          id: 'lunch',
          name: 'มื้อกลางวัน (Rush)',
          timeRange: '11:00 - 14:00',
          icon: '☀️',
          sales: periodBuckets.lunch.sales,
          orderCount: periodBuckets.lunch.orders,
          percent: Math.round((periodBuckets.lunch.sales / totalPeriodSales) * 100),
        },
        {
          id: 'afternoon',
          name: 'มื้อบ่าย / ของว่าง',
          timeRange: '14:00 - 17:00',
          icon: '☕',
          sales: periodBuckets.afternoon.sales,
          orderCount: periodBuckets.afternoon.orders,
          percent: Math.round((periodBuckets.afternoon.sales / totalPeriodSales) * 100),
        },
        {
          id: 'dinner',
          name: 'มื้อเย็น (Rush)',
          timeRange: '17:00 - 21:00',
          icon: '🌙',
          sales: periodBuckets.dinner.sales,
          orderCount: periodBuckets.dinner.orders,
          percent: Math.round((periodBuckets.dinner.sales / totalPeriodSales) * 100),
        },
        {
          id: 'late',
          name: 'มื้อดึก',
          timeRange: '21:00 - 24:00',
          icon: '🌃',
          sales: periodBuckets.late.sales,
          orderCount: periodBuckets.late.orders,
          percent: Math.round((periodBuckets.late.sales / totalPeriodSales) * 100),
        },
      ];

      // ─── Compute Hourly Peak Time Buckets ─────────────────
      const hourMap = new Map<number, { orderCount: number; totalSales: number }>();
      for (let h = 8; h <= 22; h++) {
        hourMap.set(h, { orderCount: 0, totalSales: 0 });
      }

      orders.forEach((ord) => {
        const h = new Date(ord.created_at).getHours();
        const existing = hourMap.get(h) || { orderCount: 0, totalSales: 0 };
        existing.orderCount += 1;
        existing.totalSales += ord.total_amount || 0;
        hourMap.set(h, existing);
      });

      const sortedHours = Array.from(hourMap.keys()).sort((a, b) => a - b);
      hourlyData.value = sortedHours.map((h) => {
        const item = hourMap.get(h)!;
        return {
          hour: h,
          label: `${String(h).padStart(2, '0')}:00`,
          orderCount: item.orderCount,
          totalSales: item.totalSales,
        };
      });

      // ─── Compute Dine-in vs Takeaway ───────────────────────
      let dOrders = 0;
      let dSales = 0;
      let tOrders = 0;
      let tSales = 0;

      orders.forEach((ord) => {
        const tableName = ord.table_session?.table?.name || '';
        const isTakeaway =
          tableName === 'สั่งกลับบ้าน' || tableName.toLowerCase().includes('takeaway');

        if (isTakeaway) {
          tOrders++;
          tSales += ord.total_amount || 0;
        } else {
          dOrders++;
          dSales += ord.total_amount || 0;
        }
      });

      diningStats.dineInOrders = dOrders;
      diningStats.dineInSales = dSales;
      diningStats.takeawayOrders = tOrders;
      diningStats.takeawaySales = tSales;

      // ─── Compute Kitchen Velocity ─────────────────────────
      let totalWaitMins = 0;
      let waitCount = 0;
      let totalCookMins = 0;
      let cookCount = 0;
      let totalServedMins = 0;
      let servedSpeedCount = 0;

      orders.forEach((ord) => {
        const tQueued = ord.queued_at
          ? new Date(ord.queued_at).getTime()
          : new Date(ord.created_at).getTime();

        if (ord.preparing_at) {
          const tPrep = new Date(ord.preparing_at).getTime();
          const diff = Math.max(0, (tPrep - tQueued) / 60000);
          if (diff < 240) {
            totalWaitMins += diff;
            waitCount++;
          }
        }

        if (ord.preparing_at && ord.prepared_at) {
          const tPrep = new Date(ord.preparing_at).getTime();
          const tDone = new Date(ord.prepared_at).getTime();
          const diff = Math.max(0, (tDone - tPrep) / 60000);
          if (diff < 240) {
            totalCookMins += diff;
            cookCount++;
          }
        }

        if (ord.served_at) {
          const tServed = new Date(ord.served_at).getTime();
          const diff = Math.max(0, (tServed - tQueued) / 60000);
          if (diff < 240) {
            totalServedMins += diff;
            servedSpeedCount++;
          }
        }
      });

      velocityStats.avgWaitMins = waitCount > 0 ? totalWaitMins / waitCount : 0;
      velocityStats.avgCookMins = cookCount > 0 ? totalCookMins / cookCount : 0;
      velocityStats.avgTotalMins = servedSpeedCount > 0 ? totalServedMins / servedSpeedCount : 0;
    } else {
      stats.totalOrders = 0;
      stats.totalSales = 0;
      stats.avgOrderValue = 0;
      settlementStats.paidSales = 0;
      settlementStats.pendingSales = 0;
      settlementStats.paidBillsCount = 0;
      settlementStats.totalBillsCount = 0;
      mealPeriods.value = [];
    }

    // Process Order Items Data (Best Sellers & Categories)
    if (orderItems) {
      const todayOrderIds = orders ? new Set(orders.map((o) => o.id)) : new Set<string>();
      const todayOrderItems = orderItems.filter((it) => todayOrderIds.has(it.order_id));

      stats.itemsSold = todayOrderItems.reduce((sum, it) => sum + (it.quantity || 1), 0);

      // 1. Top Selling Items
      const itemAggMap = new Map<string, { name: string; quantity: number; subtotal: number }>();
      todayOrderItems.forEach((it) => {
        const name = it.snapshot_name || it.menu_item?.name || 'เมนูไม่มีชื่อ';
        const existing = itemAggMap.get(name) || { name, quantity: 0, subtotal: 0 };
        existing.quantity += it.quantity || 1;
        existing.subtotal += it.subtotal || 0;
        itemAggMap.set(name, existing);
      });

      topSellingItems.value = Array.from(itemAggMap.values())
        .sort((a, b) => b.quantity - a.quantity || b.subtotal - a.subtotal)
        .slice(0, 5);

      // 2. Categories Distribution
      const catAggMap = new Map<string, { name: string; sales: number; itemsCount: number }>();
      todayOrderItems.forEach((it) => {
        const catName = it.menu_item?.category?.name || 'เมนูทั่วไป';
        const existing = catAggMap.get(catName) || { name: catName, sales: 0, itemsCount: 0 };
        existing.sales += it.subtotal || 0;
        existing.itemsCount += it.quantity || 1;
        catAggMap.set(catName, existing);
      });

      categoryDistribution.value = Array.from(catAggMap.values()).sort((a, b) => b.sales - a.sales);
    } else {
      stats.itemsSold = 0;
      topSellingItems.value = [];
      categoryDistribution.value = [];
    }

    lastRefreshedText.value = formatTime(new Date().toISOString());
  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
}

async function refreshData() {
  isRefreshing.value = true;
  await loadDashboardData();
}

function setupRealtime() {
  realtimeChannel = supabase
    .channel('dashboard_realtime_sync')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
      },
      () => {
        void loadDashboardData();
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'order_items',
      },
      () => {
        void loadDashboardData();
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'table_sessions',
      },
      () => {
        void loadDashboardData();
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bills',
      },
      () => {
        void loadDashboardData();
      },
    )
    .subscribe();
}

onMounted(() => {
  void loadDashboardData();
  setupRealtime();
});

onBeforeUnmount(() => {
  if (realtimeChannel) {
    void supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
});
</script>

<style scoped>
.dashboard-page {
  background-color: #fafafc;
  min-height: 100vh;
}

.dashboard-container {
  max-width: 1240px;
  margin: 0 auto;
}

.header-section {
  flex-wrap: wrap;
  gap: 16px;
}

.page-heading {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.25;
  color: #1d1d1f;
  margin: 0;
  letter-spacing: 0;
}

.page-subheading {
  font-size: 15px;
  color: #6e6e73;
  line-height: 1.5;
  letter-spacing: 0;
}

.live-pill {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: #e6f4ea;
  color: #137333;
  padding: 3px 10px;
  border-radius: 980px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #137333;
  display: inline-block;
  animation: pulse-dot 1.8s infinite;
}

@keyframes pulse-dot {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.3);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.header-actions {
  flex-wrap: wrap;
  gap: 10px;
}

.pill-btn {
  border-radius: 980px;
  font-weight: 600;
  letter-spacing: 0;
  transition: all 0.2s ease;
}

.secondary-action-btn {
  background: #e8e8ed;
  color: #1d1d1f;
  border: 1px solid #d2d2d7;
}

.secondary-action-btn:hover {
  background: #dedee3;
}

.primary-action-btn {
  background: #0071e3 !important;
  color: #ffffff !important;
}

.primary-action-btn:hover {
  background: #0066cc !important;
}

/* Stats 4 Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}

.stat-card {
  background: #ffffff;
  border-radius: 28px;
  border: 1px solid #e8e8ed;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.stat-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6e6e73;
}

.stat-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrap--primary {
  background: #e8f4fd;
}

.stat-icon-wrap--blue {
  background: #e0f2fe;
}

.stat-icon-wrap--amber {
  background: #fef3c7;
}

.stat-icon-wrap--green {
  background: #dcfce7;
}

.stat-value {
  font-size: 1.85rem;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.stat-unit {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #6e6e73;
}

.stat-caption {
  font-size: 0.75rem;
  margin-top: 6px;
}

.text-ink {
  color: #1d1d1f;
}

.text-muted {
  color: #6e6e73;
}
</style>
