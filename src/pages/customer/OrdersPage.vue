<template>
  <q-page class="orders-page q-pa-md">
    <div v-if="isLoading" class="column items-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <template v-else>
      <!-- Session total -->
      <div v-if="allOrders.length > 0" class="session-total q-mb-md">
        <div class="row justify-between items-center">
          <span class="text-grey-7">Session Total</span>
          <span class="text-h6 text-weight-bold">{{ formatPrice(sessionTotal) }}</span>
        </div>
      </div>

      <!-- Current orders -->
      <div v-if="currentOrders.length > 0" class="q-mb-lg">
        <h6 class="section-title q-mb-sm">Current Orders</h6>
        <div
          v-for="order in currentOrders"
          :key="order.id"
          class="order-card q-mb-sm"
          @click="openOrder(order.id)"
        >
          <div class="row items-center justify-between">
            <div>
              <span class="order-number">{{ formatQueueNumber(order.queue_number) }}</span>
              <span class="order-items-count q-ml-sm text-grey-6">
                {{ order.items.length }} item{{ order.items.length > 1 ? 's' : '' }}
              </span>
            </div>
            <q-badge
              :color="statusColor(order.status)"
              :label="customerStatusLabel(order.status)"
              class="order-status-badge"
            />
          </div>
          <div class="row items-center justify-between q-mt-sm">
            <span class="text-grey-6 text-caption">{{ formatTime(order.created_at) }}</span>
            <span class="text-weight-bold">{{ formatPrice(order.total_amount) }}</span>
          </div>
        </div>
      </div>

      <!-- Order history -->
      <div v-if="historyOrders.length > 0">
        <h6 class="section-title q-mb-sm">History</h6>
        <div
          v-for="order in historyOrders"
          :key="order.id"
          class="order-card order-card-history q-mb-sm"
          @click="openOrder(order.id)"
        >
          <div class="row items-center justify-between">
            <div>
              <span class="order-number">{{ formatQueueNumber(order.queue_number) }}</span>
              <span class="order-items-count q-ml-sm text-grey-6">
                {{ order.items.length }} item{{ order.items.length > 1 ? 's' : '' }}
              </span>
            </div>
            <q-badge color="grey-5" label="เสิร์ฟแล้ว" class="order-status-badge" />
          </div>
          <div class="row items-center justify-between q-mt-sm">
            <span class="text-grey-6 text-caption">{{ formatTime(order.created_at) }}</span>
            <span class="text-weight-bold text-grey-7">{{ formatPrice(order.total_amount) }}</span>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="allOrders.length === 0" class="column items-center q-pa-xl">
        <q-icon name="receipt_long" size="64px" color="grey-4" />
        <h6 class="q-mt-md text-grey-6">No orders yet</h6>
        <q-btn color="primary" unelevated no-caps :to="`/t/${publicToken}/menu`" class="q-mt-md">
          Browse Menu
        </q-btn>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/sessionStore';
import { fetchSessionOrders } from 'src/services/orderService';
import { supabase } from 'src/services/supabase';
import { formatPrice, formatTime, formatQueueNumber } from 'src/utils/formatters';
import { CustomerStatusLabel, OrderStatus } from 'src/types/enums';
import { STATUS_COLORS } from 'src/utils/constants';
import type { OrderWithItems } from 'src/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

const allOrders = ref<OrderWithItems[]>([]);
const isLoading = ref(true);
let realtimeChannel: RealtimeChannel | null = null;

const publicToken = computed(() => route.params.publicToken as string);

const currentOrders = computed(() =>
  allOrders.value
    .filter((o) => o.status !== OrderStatus.SERVED)
    .sort((a, b) => b.queue_number - a.queue_number),
);

const historyOrders = computed(() =>
  allOrders.value
    .filter((o) => o.status === OrderStatus.SERVED)
    .sort((a, b) => b.queue_number - a.queue_number),
);

const sessionTotal = computed(() => allOrders.value.reduce((sum, o) => sum + o.total_amount, 0));

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'grey-6';
}

function customerStatusLabel(status: string): string {
  return CustomerStatusLabel[status as OrderStatus] ?? status;
}

function openOrder(orderId: string) {
  void router.push(`/t/${publicToken.value}/orders/${orderId}`);
}

onMounted(async () => {
  if (!sessionStore.tableSession) {
    void router.replace(`/t/${publicToken.value}`);
    return;
  }

  try {
    allOrders.value = await fetchSessionOrders(sessionStore.tableSession.id);
  } finally {
    isLoading.value = false;
  }

  // Subscribe to realtime updates for this session's orders
  realtimeChannel = supabase
    .channel(`orders:session:${sessionStore.tableSession.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `table_session_id=eq.${sessionStore.tableSession.id}`,
      },
      () => {
        void (async () => {
          if (sessionStore.tableSession) {
            allOrders.value = await fetchSessionOrders(sessionStore.tableSession.id);
          }
        })();
      },
    )
    .subscribe();
});

onUnmounted(() => {
  if (realtimeChannel) {
    void supabase.removeChannel(realtimeChannel);
  }
});
</script>

<style scoped>
.orders-page {
  background: #f5f7fa;
  min-height: 100vh;
}

.session-total {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.order-card {
  background: white;
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.1s;
}

.order-card:active {
  transform: scale(0.98);
}

.order-card-history {
  opacity: 0.7;
}

.order-number {
  font-weight: 700;
  font-size: 1rem;
  color: #1a1a2e;
}

.order-status-badge {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 8px;
}
</style>
