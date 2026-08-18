<template>
  <q-page class="dashboard-page q-pa-md">
    <div class="dashboard-container">
      <!-- Welcome Greeting & Quick CTA -->
      <div class="row items-center justify-between q-mb-lg">
        <div>
          <h5 class="q-my-none text-weight-bold page-heading">ภาพรวมร้านค้าวันนี้</h5>
          <p class="text-caption text-grey-7 q-mb-none">สรุปยอดขายและสถานะคิวออเดอร์แบบเรียลไทม์</p>
        </div>
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

      <!-- Stats 4 Cards Grid -->
      <div class="stats-grid q-mb-lg">
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon-wrap--primary">
            <q-icon name="payments" size="24px" color="primary" />
          </div>
          <div class="stat-content">
            <div class="stat-label">ยอดขายวันนี้</div>
            <div class="stat-value text-primary">{{ formatPrice(stats.totalSales) }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon-wrap--blue">
            <q-icon name="receipt_long" size="24px" color="light-blue-8" />
          </div>
          <div class="stat-content">
            <div class="stat-label">จำนวนออเดอร์</div>
            <div class="stat-value">
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
            <div class="stat-value">{{ stats.itemsSold }} <span class="stat-unit">จาน</span></div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon-wrap--green">
            <q-icon name="trending_up" size="24px" color="green-8" />
          </div>
          <div class="stat-content">
            <div class="stat-label">ยอดเฉลี่ยต่อออเดอร์</div>
            <div class="stat-value">{{ formatPrice(stats.avgOrderValue) }}</div>
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
            <div class="queue-stat-count text-light-blue-8">{{ queueCounts.queued }}</div>
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
            <div class="queue-stat-count text-amber-9">{{ queueCounts.preparing }}</div>
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
            <div class="queue-stat-count text-green-7">{{ queueCounts.prepared }}</div>
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
            <div class="queue-stat-count text-blue-grey-6">{{ queueCounts.served }}</div>
            <div class="text-caption text-grey-6">เสิร์ฟถึงโต๊ะแล้ว</div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { supabase } from 'src/services/supabase';
import { formatPrice } from 'src/utils/formatters';
import { OrderStatus } from 'src/types/enums';

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

onMounted(async () => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_amount, status')
      .gte('created_at', todayStart.toISOString());

    if (orders) {
      stats.totalOrders = orders.length;
      stats.totalSales = orders
        .filter((o) => o.status === OrderStatus.SERVED)
        .reduce((sum, o) => sum + (o.total_amount as number), 0);
      stats.avgOrderValue =
        stats.totalOrders > 0
          ? Math.round(
              stats.totalSales /
                Math.max(1, orders.filter((o) => o.status === OrderStatus.SERVED).length),
            )
          : 0;

      queueCounts.queued = orders.filter((o) => o.status === OrderStatus.QUEUED).length;
      queueCounts.preparing = orders.filter((o) => o.status === OrderStatus.PREPARING).length;
      queueCounts.prepared = orders.filter((o) => o.status === OrderStatus.PREPARED).length;
      queueCounts.served = orders.filter((o) => o.status === OrderStatus.SERVED).length;
    }

    const { count } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    stats.itemsSold = count ?? 0;
  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
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

.page-heading {
  color: var(--color-text-primary);
  line-height: 1.2;
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
