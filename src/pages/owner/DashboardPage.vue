<template>
  <q-page class="dashboard-page q-pa-md">
    <!-- Stats cards -->
    <div class="stats-grid q-mb-lg">
      <q-card flat bordered class="stat-card">
        <q-card-section>
          <div class="stat-label">Today's Sales</div>
          <div class="stat-value">{{ formatPrice(stats.totalSales) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="stat-card">
        <q-card-section>
          <div class="stat-label">Orders</div>
          <div class="stat-value">{{ stats.totalOrders }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="stat-card">
        <q-card-section>
          <div class="stat-label">Items Sold</div>
          <div class="stat-value">{{ stats.itemsSold }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="stat-card">
        <q-card-section>
          <div class="stat-label">Avg Order Value</div>
          <div class="stat-value">{{ formatPrice(stats.avgOrderValue) }}</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Current queue summary -->
    <h6 class="q-mb-sm text-weight-bold">Current Queue</h6>
    <div class="queue-summary-grid q-mb-lg">
      <q-card flat bordered class="queue-stat queued">
        <q-card-section class="row items-center no-wrap">
          <q-icon name="schedule" size="28px" class="q-mr-md" />
          <div>
            <div class="text-caption">Queued</div>
            <div class="text-h5 text-weight-bold">{{ queueCounts.queued }}</div>
          </div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="queue-stat preparing">
        <q-card-section class="row items-center no-wrap">
          <q-icon name="restaurant" size="28px" class="q-mr-md" />
          <div>
            <div class="text-caption">Preparing</div>
            <div class="text-h5 text-weight-bold">{{ queueCounts.preparing }}</div>
          </div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="queue-stat prepared">
        <q-card-section class="row items-center no-wrap">
          <q-icon name="check_circle" size="28px" class="q-mr-md" />
          <div>
            <div class="text-caption">Ready to Serve</div>
            <div class="text-h5 text-weight-bold">{{ queueCounts.prepared }}</div>
          </div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="queue-stat served">
        <q-card-section class="row items-center no-wrap">
          <q-icon name="done_all" size="28px" class="q-mr-md" />
          <div>
            <div class="text-caption">Served</div>
            <div class="text-h5 text-weight-bold">{{ queueCounts.served }}</div>
          </div>
        </q-card-section>
      </q-card>
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

    // Fetch today's orders
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

    // Fetch items sold count
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
  background: #f5f7fa;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  border-radius: 12px;
}

.stat-label {
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
}

.queue-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.queue-stat {
  border-radius: 12px;
}

.queue-stat.queued {
  border-left: 4px solid #1976d2;
}
.queue-stat.preparing {
  border-left: 4px solid #ef6c00;
}
.queue-stat.prepared {
  border-left: 4px solid #388e3c;
}
.queue-stat.served {
  border-left: 4px solid #607d8b;
}
</style>
