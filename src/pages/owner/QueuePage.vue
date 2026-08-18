<template>
  <q-page class="queue-page q-pa-md">
    <!-- Loading -->
    <div v-if="isLoading" class="column items-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <template v-else>
      <!-- Queue columns / Kanban layout -->
      <div class="queue-grid">
        <!-- QUEUED Column -->
        <div class="queue-column">
          <div class="queue-column-header queued-header">
            <q-icon name="schedule" class="q-mr-sm" />
            QUEUED
            <q-badge :label="queueStore.queuedOrders.length" class="q-ml-sm" />
          </div>
          <div class="queue-column-body">
            <div v-for="order in queueStore.queuedOrders" :key="order.id" class="queue-order-card">
              <div class="row items-center justify-between q-mb-xs">
                <span class="queue-number">{{ formatQueueNumber(order.queue_number) }}</span>
                <span class="elapsed-time">{{ formatElapsed(order.created_at) }}</span>
              </div>
              <div class="order-items-summary">
                <div v-for="item in order.items" :key="item.id" class="order-item-line">
                  <span>{{ item.snapshot_name }} x{{ item.quantity }}</span>
                  <span v-if="item.special_instruction" class="item-note-icon" title="Has note"
                    >📝</span
                  >
                </div>
              </div>
              <div class="row justify-end q-mt-sm">
                <q-btn
                  color="orange-8"
                  unelevated
                  dense
                  no-caps
                  size="sm"
                  @click="advanceStatus(order.id, OrderStatus.PREPARING)"
                >
                  Start Preparing
                </q-btn>
              </div>
            </div>
            <div v-if="queueStore.queuedOrders.length === 0" class="empty-column">
              No queued orders
            </div>
          </div>
        </div>

        <!-- PREPARING Column -->
        <div class="queue-column">
          <div class="queue-column-header preparing-header">
            <q-icon name="restaurant" class="q-mr-sm" />
            PREPARING
            <q-badge :label="queueStore.preparingOrders.length" class="q-ml-sm" />
          </div>
          <div class="queue-column-body">
            <div
              v-for="order in queueStore.preparingOrders"
              :key="order.id"
              class="queue-order-card preparing-card"
              :class="{ 'order-updated': order.revision > 1 }"
            >
              <div class="row items-center justify-between q-mb-xs">
                <span class="queue-number">{{ formatQueueNumber(order.queue_number) }}</span>
                <span class="elapsed-time">{{
                  formatElapsed(order.preparing_at || order.created_at)
                }}</span>
              </div>
              <q-badge
                v-if="order.revision > 1"
                color="warning"
                text-color="dark"
                label="⚠️ Updated"
                class="q-mb-xs"
              />
              <div class="order-items-summary">
                <div v-for="item in order.items" :key="item.id" class="order-item-line">
                  <span>{{ item.snapshot_name }} x{{ item.quantity }}</span>
                  <span v-if="item.special_instruction" class="item-note-icon" title="Has note"
                    >📝</span
                  >
                </div>
              </div>
              <div class="row justify-end q-mt-sm">
                <q-btn
                  color="green-7"
                  unelevated
                  dense
                  no-caps
                  size="sm"
                  @click="advanceStatus(order.id, OrderStatus.PREPARED)"
                >
                  Mark Ready
                </q-btn>
              </div>
            </div>
            <div v-if="queueStore.preparingOrders.length === 0" class="empty-column">
              No orders being prepared
            </div>
          </div>
        </div>

        <!-- PREPARED Column -->
        <div class="queue-column">
          <div class="queue-column-header prepared-header">
            <q-icon name="check_circle" class="q-mr-sm" />
            PREPARED
            <q-badge :label="queueStore.preparedOrders.length" class="q-ml-sm" />
          </div>
          <div class="queue-column-body">
            <div
              v-for="order in queueStore.preparedOrders"
              :key="order.id"
              class="queue-order-card prepared-card"
              :class="{
                'can-serve': queueStore.canServe(order),
                blocked: !queueStore.canServe(order),
              }"
            >
              <div class="row items-center justify-between q-mb-xs">
                <span class="queue-number">{{ formatQueueNumber(order.queue_number) }}</span>
                <span class="elapsed-time">{{
                  formatElapsed(order.prepared_at || order.created_at)
                }}</span>
              </div>
              <div class="order-items-summary">
                <div v-for="item in order.items" :key="item.id" class="order-item-line">
                  <span>{{ item.snapshot_name }} x{{ item.quantity }}</span>
                </div>
              </div>
              <div class="row items-center justify-between q-mt-sm">
                <q-badge
                  v-if="!queueStore.canServe(order)"
                  color="grey-4"
                  text-color="grey-7"
                  label="Waiting for earlier orders"
                />
                <q-space />
                <q-btn
                  color="blue-grey-7"
                  unelevated
                  dense
                  no-caps
                  size="sm"
                  :disable="!queueStore.canServe(order)"
                  @click="advanceStatus(order.id, OrderStatus.SERVED)"
                >
                  Confirm Served
                </q-btn>
              </div>
            </div>
            <div v-if="queueStore.preparedOrders.length === 0" class="empty-column">
              No prepared orders
            </div>
          </div>
        </div>

        <!-- SERVED Column (collapsed) -->
        <div class="queue-column served-column">
          <div class="queue-column-header served-header">
            <q-icon name="done_all" class="q-mr-sm" />
            SERVED
            <q-badge :label="queueStore.servedOrders.length" class="q-ml-sm" />
          </div>
          <div class="queue-column-body">
            <div
              v-for="order in queueStore.servedOrders.slice(0, 10)"
              :key="order.id"
              class="queue-order-card served-card"
            >
              <div class="row items-center justify-between">
                <span class="queue-number text-grey-6">{{
                  formatQueueNumber(order.queue_number)
                }}</span>
                <span class="text-grey-5 text-caption">{{
                  formatTime(order.served_at || order.created_at)
                }}</span>
              </div>
            </div>
            <div v-if="queueStore.servedOrders.length === 0" class="empty-column">
              No served orders today
            </div>
          </div>
        </div>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useQueueStore } from 'src/stores/queueStore';
import { useNotify } from 'src/composables/useNotify';
import { fetchTodayOrders, advanceOrderStatus } from 'src/services/orderService';
import { supabase } from 'src/services/supabase';
import { formatQueueNumber, formatElapsed, formatTime } from 'src/utils/formatters';
import { OrderStatus } from 'src/types/enums';
import type { RealtimeChannel } from '@supabase/supabase-js';

const queueStore = useQueueStore();
const { notifySuccess, notifyError, notifyWarning } = useNotify();

const isLoading = ref(true);
let realtimeChannel: RealtimeChannel | null = null;
let elapsedInterval: ReturnType<typeof setInterval>;

onMounted(async () => {
  try {
    const orders = await fetchTodayOrders();
    queueStore.setOrders(orders);
  } finally {
    isLoading.value = false;
  }

  // Subscribe to realtime order changes
  realtimeChannel = supabase
    .channel('orders:restaurant')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
      },
      (payload) => {
        void (async () => {
          // Re-fetch to get full order with items
          const orders = await fetchTodayOrders();
          queueStore.setOrders(orders);

          if (payload.eventType === 'INSERT') {
            notifyWarning('🆕 New order received!');
          }
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as { revision?: number };
            if (newData.revision && newData.revision > 1) {
              notifyWarning('⚠️ Order updated by customer');
            }
          }
        })();
      },
    )
    .subscribe();

  // Update elapsed times every 30 seconds
  elapsedInterval = setInterval(() => {
    // Force re-render by touching the store
    queueStore.setOrders([...queueStore.orders]);
  }, 30000);
});

onUnmounted(() => {
  if (realtimeChannel) {
    void supabase.removeChannel(realtimeChannel);
  }
  clearInterval(elapsedInterval);
});

async function advanceStatus(orderId: string, newStatus: OrderStatus) {
  try {
    await advanceOrderStatus(orderId, newStatus);
    notifySuccess(`Order ${newStatus.toLowerCase()}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update order';
    notifyError(msg);
  }
}
</script>

<style scoped>
.queue-page {
  background: #f0f2f5;
  min-height: 100vh;
}

.queue-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  min-height: calc(100vh - 100px);
}

@media (max-width: 1024px) {
  .queue-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .queue-grid {
    grid-template-columns: 1fr;
  }
}

.queue-column {
  display: flex;
  flex-direction: column;
}

.queue-column-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-radius: 12px 12px 0 0;
  color: white;
}

.queued-header {
  background: #1976d2;
}
.preparing-header {
  background: #ef6c00;
}
.prepared-header {
  background: #388e3c;
}
.served-header {
  background: #607d8b;
}

.queue-column-body {
  flex: 1;
  background: white;
  border-radius: 0 0 12px 12px;
  padding: 12px;
  overflow-y: auto;
  max-height: calc(100vh - 160px);
}

.queue-order-card {
  background: #fafbfc;
  border: 1px solid #e8eaed;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
  transition: box-shadow 0.15s;
}

.queue-order-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.queue-order-card.order-updated {
  border-color: #ff9800;
  border-width: 2px;
}

.queue-order-card.can-serve {
  border-color: #4caf50;
  background: #f1f8e9;
}

.queue-order-card.blocked {
  opacity: 0.7;
}

.served-card {
  padding: 8px 12px;
  opacity: 0.6;
}

.queue-number {
  font-weight: 700;
  font-size: 1.05rem;
  color: #1a1a2e;
}

.elapsed-time {
  font-size: 0.75rem;
  color: #888;
}

.order-items-summary {
  margin-top: 4px;
}

.order-item-line {
  font-size: 0.85rem;
  color: #444;
  line-height: 1.6;
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-note-icon {
  font-size: 0.75rem;
}

.empty-column {
  text-align: center;
  color: #aaa;
  padding: 24px;
  font-size: 0.85rem;
}

.served-column .queue-column-body {
  max-height: calc(100vh - 160px);
}
</style>
