<template>
  <q-page class="dashboard-page q-pa-md">
    <div class="dashboard-container">
      <!-- Welcome Greeting & Quick CTA Header -->
      <div class="row items-center justify-between q-mb-lg header-section">
        <div>
          <div class="row items-center q-gutter-sm">
            <h5 class="q-my-none text-weight-bold page-heading">ภาพรวมร้านค้าวันนี้</h5>
            <q-badge color="positive" rounded class="live-badge q-px-sm">
              <span class="live-dot q-mr-xs"></span>
              Live
            </q-badge>
          </div>
          <p class="text-caption text-grey-7 q-mb-none q-mt-xs">
            สรุปยอดขาย กราฟวิเคราะห์ออเดอร์ และสถานะคิวแบบเรียลไทม์
            <span v-if="lastRefreshedText" class="text-grey-6">
              • อัปเดตล่าสุด: {{ lastRefreshedText }}</span
            >
          </p>
        </div>

        <div class="row items-center q-gutter-sm">
          <q-btn
            outline
            dense
            rounded
            no-caps
            color="grey-8"
            icon="refresh"
            label="รีเฟรชข้อมูล"
            :loading="isRefreshing"
            @click="refreshData"
            class="q-px-md refresh-btn"
          />
          <q-btn
            color="primary"
            unelevated
            no-caps
            rounded
            icon="soup_kitchen"
            label="ดูคิวออเดอร์"
            to="/owner/queue"
            class="queue-cta-btn"
          />
        </div>
      </div>

      <!-- Loading Skeleton -->
      <LoadingSkeleton v-if="isLoading" type="dashboard" />

      <template v-else>
        <!-- Stats 4 Cards Grid -->
        <div class="stats-grid q-mb-lg">
          <div class="stat-card">
            <div class="stat-icon-wrap stat-icon-wrap--primary">
              <q-icon name="payments" size="24px" color="primary" />
            </div>
            <div class="stat-content">
              <div class="stat-label">ยอดขายวันนี้</div>
              <div class="stat-value text-primary font-mono">
                {{ formatPrice(stats.totalSales) }}
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrap stat-icon-wrap--blue">
              <q-icon name="receipt_long" size="24px" color="light-blue-8" />
            </div>
            <div class="stat-content">
              <div class="stat-label">จำนวนออเดอร์</div>
              <div class="stat-value font-mono">
                {{ stats.totalOrders }} <span class="stat-unit">รายการ</span>
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrap stat-icon-wrap--amber">
              <q-icon name="restaurant" size="24px" color="amber-9" />
            </div>
            <div class="stat-content">
              <div class="stat-label">จำนวนจานที่ขาย</div>
              <div class="stat-value font-mono">
                {{ stats.itemsSold }} <span class="stat-unit">จาน</span>
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrap stat-icon-wrap--green">
              <q-icon name="trending_up" size="24px" color="green-8" />
            </div>
            <div class="stat-content">
              <div class="stat-label">ยอดเฉลี่ยต่อออเดอร์</div>
              <div class="stat-value font-mono">{{ formatPrice(stats.avgOrderValue) }}</div>
            </div>
          </div>
        </div>

        <!-- Current Queue Summary Section -->
        <div class="section-card q-mb-lg">
          <div class="row items-center justify-between q-mb-md">
            <div>
              <div class="text-weight-bold text-subtitle1">สถานะคิวในครัวขณะนี้</div>
              <div class="text-caption text-grey-7">จำนวนออเดอร์ที่อยู่ในแต่ละขั้นตอน</div>
            </div>
            <q-btn
              flat
              dense
              no-caps
              rounded
              size="sm"
              color="primary"
              label="ไปยังหน้าครัว →"
              to="/owner/queue"
            />
          </div>

          <div class="queue-stats-grid">
            <!-- Queued -->
            <div
              class="queue-stat-card queue-stat-card--queued"
              @click="$router.push('/owner/queue')"
            >
              <div class="row items-center justify-between">
                <span class="queue-stat-label">รับออเดอร์แล้ว</span>
                <q-icon name="schedule" size="20px" class="queue-stat-icon text-light-blue-8" />
              </div>
              <div class="queue-stat-count text-light-blue-8 font-mono">
                {{ queueCounts.queued }}
              </div>
              <div class="text-caption text-grey-6">รอเริ่มทำอาหาร</div>
            </div>

            <!-- Preparing -->
            <div
              class="queue-stat-card queue-stat-card--preparing"
              @click="$router.push('/owner/queue')"
            >
              <div class="row items-center justify-between">
                <span class="queue-stat-label">กำลังเตรียม</span>
                <q-icon name="soup_kitchen" size="20px" class="queue-stat-icon text-amber-9" />
              </div>
              <div class="queue-stat-count text-amber-9 font-mono">{{ queueCounts.preparing }}</div>
              <div class="text-caption text-grey-6">กำลังปรุงในครัว</div>
            </div>

            <!-- Prepared -->
            <div
              class="queue-stat-card queue-stat-card--prepared"
              @click="$router.push('/owner/queue')"
            >
              <div class="row items-center justify-between">
                <span class="queue-stat-label">เตรียมเสร็จแล้ว</span>
                <q-icon name="check_circle" size="20px" class="queue-stat-icon text-green-7" />
              </div>
              <div class="queue-stat-count text-green-7 font-mono">{{ queueCounts.prepared }}</div>
              <div class="text-caption text-grey-6">พร้อมยกไปเสิร์ฟ</div>
            </div>

            <!-- Served -->
            <div
              class="queue-stat-card queue-stat-card--served"
              @click="$router.push('/owner/queue')"
            >
              <div class="row items-center justify-between">
                <span class="queue-stat-label">เสิร์ฟครบแล้ว</span>
                <q-icon name="done_all" size="20px" class="queue-stat-icon text-blue-grey-6" />
              </div>
              <div class="queue-stat-count text-blue-grey-6 font-mono">
                {{ queueCounts.served }}
              </div>
              <div class="text-caption text-grey-6">เสิร์ฟถึงโต๊ะแล้ว</div>
            </div>
          </div>
        </div>

        <!-- 1. Primary Line Chart: Peak Time of Orders & Revenue -->
        <div class="q-mb-lg">
          <HourlyPeakTimeChart :hourly-data="hourlyData" />
        </div>

        <!-- 2. Secondary Analytics Row: Best Selling & Category Breakdown -->
        <div class="row q-col-gutter-lg q-mb-lg">
          <div class="col-12 col-md-6">
            <TopSellingItemsChart :items="topSellingItems" />
          </div>
          <div class="col-12 col-md-6">
            <CategorySalesChart :categories="categoryDistribution" />
          </div>
        </div>

        <!-- 3. Tertiary Analytics Row: Dining Type & Kitchen Velocity -->
        <div class="row q-col-gutter-lg q-mb-lg">
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
import { OrderStatus } from 'src/types/enums';
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

const queueCounts = reactive({
  queued: 0,
  preparing: 0,
  prepared: 0,
  served: 0,
});

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

    // Process Orders Data
    if (orders) {
      stats.totalOrders = orders.length;
      stats.totalSales = orders
        .filter((o) => o.status === OrderStatus.SERVED)
        .reduce((sum, o) => sum + o.total_amount, 0);

      const servedCount = orders.filter((o) => o.status === OrderStatus.SERVED).length;
      stats.avgOrderValue = servedCount > 0 ? Math.round(stats.totalSales / servedCount) : 0;

      queueCounts.queued = orders.filter((o) => o.status === OrderStatus.QUEUED).length;
      queueCounts.preparing = orders.filter((o) => o.status === OrderStatus.PREPARING).length;
      queueCounts.prepared = orders.filter((o) => o.status === OrderStatus.PREPARED).length;
      queueCounts.served = orders.filter((o) => o.status === OrderStatus.SERVED).length;

      // ─── Compute Hourly Peak Time Buckets ─────────────────
      // Initialize full range 08:00 to 22:00
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
    }

    // Process Order Items Data (Best Sellers & Categories)
    if (orderItems) {
      stats.itemsSold = orderItems.reduce((sum, it) => sum + (it.quantity || 1), 0);

      // 1. Top Selling Items
      const itemAggMap = new Map<string, { name: string; quantity: number; subtotal: number }>();
      orderItems.forEach((it) => {
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
      orderItems.forEach((it) => {
        const catName = it.menu_item?.category?.name || 'เมนูทั่วไป';
        const existing = catAggMap.get(catName) || { name: catName, sales: 0, itemsCount: 0 };
        existing.sales += it.subtotal || 0;
        existing.itemsCount += it.quantity || 1;
        catAggMap.set(catName, existing);
      });

      categoryDistribution.value = Array.from(catAggMap.values()).sort((a, b) => b.sales - a.sales);
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
  background: var(--color-background);
}

.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  flex-wrap: wrap;
  gap: 12px;
}

.page-heading {
  color: var(--color-text-primary);
  line-height: 1.2;
}

.live-badge {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
  display: inline-block;
  animation: pulse-dot 1.5s infinite;
}

@keyframes pulse-dot {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.3);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.refresh-btn {
  font-weight: 500;
  background: #ffffff;
}

.queue-cta-btn {
  padding: 8px 20px;
  font-weight: 600;
}

/* Stats 4 Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 16px;
}

.stat-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-subtle);
}

.stat-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrap--primary {
  background: var(--color-primary-soft);
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

.stat-label {
  font-size: 0.84rem;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.stat-value {
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.stat-unit {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* Section Card */
.section-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 20px;
  box-shadow: var(--shadow-subtle);
}

/* Queue Status Grid */
.queue-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.queue-stat-card {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 16px;
  cursor: pointer;
  background: var(--color-surface-subtle);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.queue-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.queue-stat-card--queued {
  border-left: 4px solid var(--color-status-queued);
}

.queue-stat-card--preparing {
  border-left: 4px solid var(--color-status-preparing);
}

.queue-stat-card--prepared {
  border-left: 4px solid var(--color-status-prepared);
}

.queue-stat-card--served {
  border-left: 4px solid var(--color-status-served);
}

.queue-stat-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.queue-stat-count {
  font-size: 2rem;
  font-weight: 700;
  margin: 6px 0 2px;
  line-height: 1;
}
</style>
