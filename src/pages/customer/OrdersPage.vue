<template>
  <q-page class="orders-page q-pa-md">
    <div v-if="isLoading" class="q-pa-md">
      <LoadingSkeleton type="list" :count="3" />
    </div>

    <template v-else>
      <div class="orders-container">
        <!-- Session Total Header Card -->
        <div v-if="allOrders.length > 0" class="session-total-card q-mb-md">
          <div class="row justify-between items-center">
            <div>
              <div class="text-caption text-grey-7">ยอดรวมทั้งหมดของโต๊ะ</div>
              <div class="text-weight-bold text-h6 text-primary">
                {{ formatPrice(sessionTotal) }}
              </div>
            </div>
            <q-btn
              unelevated
              no-caps
              rounded
              color="primary"
              :to="`/t/${publicToken}/menu`"
              class="add-more-btn"
            >
              <q-icon name="add" size="18px" class="q-mr-xs" />
              <span>สั่งอาหารเพิ่ม</span>
            </q-btn>
          </div>
        </div>

        <!-- Current Active Orders -->
        <div v-if="currentOrders.length > 0" class="q-mb-lg">
          <div class="section-header q-mb-sm">
            <span class="section-title">รายการที่กำลังดำเนินการ</span>
            <q-badge color="primary" rounded :label="currentOrders.length" class="q-ml-sm" />
          </div>

          <div class="orders-list q-gutter-y-sm">
            <div
              v-for="order in currentOrders"
              :key="order.id"
              class="order-card"
              @click="openOrder(order.id)"
            >
              <div class="row items-center justify-between q-mb-xs">
                <div class="row items-center">
                  <span class="order-number">{{ formatQueueNumber(order.queue_number) }}</span>
                  <span class="order-items-count q-ml-sm text-grey-7">
                    ({{ order.items.length }} รายการ)
                  </span>
                </div>
                <StatusBadge :status="order.status" mode="customer" />
              </div>

              <!-- Dish items breakdown -->
              <div class="order-items-list q-my-sm">
                <div
                  v-for="item in order.items"
                  :key="item.id"
                  class="order-item-row q-py-xs"
                >
                  <div class="row justify-between items-center text-body2">
                    <div class="row items-center">
                      <span class="text-weight-medium text-dark">{{ item.snapshot_name }}</span>
                      <span class="text-weight-bold text-primary q-ml-xs">x{{ item.quantity }}</span>
                    </div>
                    <span class="text-weight-bold text-dark">{{ formatPrice(item.subtotal) }}</span>
                  </div>

                  <!-- Selected Options Chips -->
                  <div v-if="item.options && item.options.length > 0" class="row items-center q-gutter-xs q-mt-none">
                    <span
                      v-for="opt in item.options"
                      :key="opt.id"
                      class="order-opt-chip"
                    >
                      + {{ opt.snapshot_option_name }}
                      <template v-if="opt.snapshot_price_adjustment > 0">
                        (+{{ formatPrice(opt.snapshot_price_adjustment) }})
                      </template>
                    </span>
                  </div>

                  <!-- Special Note -->
                  <div v-if="item.special_instruction" class="order-note-text q-mt-none">
                    <q-icon name="edit_note" size="14px" class="q-mr-xs" />
                    <span>{{ item.special_instruction }}</span>
                  </div>
                </div>
              </div>

              <q-separator class="q-my-xs" />

              <div class="row items-center justify-between q-mt-xs text-caption">
                <span class="text-grey-6">{{ formatTime(order.created_at) }}</span>
                <div class="row items-center">
                  <span class="text-grey-7 q-mr-xs">รวมออเดอร์นี้:</span>
                  <span class="text-weight-bold text-subtitle2 text-primary">{{
                    formatPrice(order.total_amount)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- History / Served Orders -->
        <div v-if="historyOrders.length > 0">
          <div class="section-header q-mb-sm">
            <span class="section-title text-grey-7">ประวัติอาหารที่เสิร์ฟแล้ว</span>
            <span class="text-caption text-grey-6 q-ml-xs">({{ historyOrders.length }})</span>
          </div>

          <div class="orders-list q-gutter-y-sm">
            <div
              v-for="order in historyOrders"
              :key="order.id"
              class="order-card order-card--history"
              @click="openOrder(order.id)"
            >
              <div class="row items-center justify-between q-mb-xs">
                <div class="row items-center">
                  <span class="order-number text-grey-8">{{
                    formatQueueNumber(order.queue_number)
                  }}</span>
                  <span class="order-items-count q-ml-sm text-grey-6">
                    ({{ order.items.length }} รายการ)
                  </span>
                </div>
                <StatusBadge :status="order.status" mode="customer" />
              </div>

              <!-- History Dish items breakdown -->
              <div class="order-items-list q-my-sm">
                <div
                  v-for="item in order.items"
                  :key="item.id"
                  class="order-item-row q-py-xs"
                >
                  <div class="row justify-between items-center text-body2">
                    <div class="row items-center">
                      <span class="text-weight-medium text-grey-8">{{ item.snapshot_name }}</span>
                      <span class="text-grey-6 q-ml-xs">x{{ item.quantity }}</span>
                    </div>
                    <span class="text-weight-bold text-grey-8">{{ formatPrice(item.subtotal) }}</span>
                  </div>

                  <!-- Selected Options Chips -->
                  <div v-if="item.options && item.options.length > 0" class="row items-center q-gutter-xs q-mt-none">
                    <span
                      v-for="opt in item.options"
                      :key="opt.id"
                      class="order-opt-chip"
                    >
                      + {{ opt.snapshot_option_name }}
                      <template v-if="opt.snapshot_price_adjustment > 0">
                        (+{{ formatPrice(opt.snapshot_price_adjustment) }})
                      </template>
                    </span>
                  </div>

                  <!-- Special Note -->
                  <div v-if="item.special_instruction" class="order-note-text text-grey-6 q-mt-none">
                    <q-icon name="edit_note" size="14px" class="q-mr-xs" />
                    <span>{{ item.special_instruction }}</span>
                  </div>
                </div>
              </div>

              <q-separator class="q-my-xs" />

              <div class="row items-center justify-between q-mt-xs text-caption">
                <span class="text-grey-5">{{ formatTime(order.created_at) }}</span>
                <div class="row items-center">
                  <span class="text-grey-6 q-mr-xs">รวมออเดอร์นี้:</span>
                  <span class="text-weight-bold text-grey-8">{{
                    formatPrice(order.total_amount)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <EmptyState
          v-if="allOrders.length === 0"
          icon="receipt_long"
          title="ยังไม่มีรายการอาหารที่สั่ง"
          description="เมื่อคุณสั่งอาหาร รายการและสถานะการทำจะแสดงที่นี่"
          action-label="ไปเลือกเมนูอาหาร"
          :action-to="`/t/${publicToken}/menu`"
        />
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
import { OrderStatus } from 'src/types/enums';
import StatusBadge from 'src/components/StatusBadge.vue';
import EmptyState from 'src/components/EmptyState.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
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
  background: var(--color-background);
  min-height: 100vh;
}

.orders-container {
  max-width: 600px;
  margin: 0 auto;
}

.session-total-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 16px;
  box-shadow: var(--shadow-subtle);
}

.add-more-btn {
  padding: 6px 16px;
  font-weight: 600;
  font-size: 0.88rem;
}

.section-header {
  display: flex;
  align-items: center;
}

.section-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-text-primary);
}

.order-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 14px 16px;
  cursor: pointer;
  box-shadow: var(--shadow-subtle);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.order-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-card);
}

.order-card:active {
  transform: scale(0.98);
}

.order-card--history {
  background: var(--color-surface-subtle);
  border-color: transparent;
}

.order-number {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--color-text-primary);
}

.order-items-count {
  font-size: 0.85rem;
}

.order-items-list {
  background: var(--color-surface-subtle);
  border-radius: 8px;
  padding: 8px 12px;
}

.order-item-row:not(:last-child) {
  border-bottom: 1px dashed var(--color-border);
  padding-bottom: 6px;
  margin-bottom: 4px;
}

.order-opt-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  background: #ffffff;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 4px;
  margin-top: 2px;
}

.order-note-text {
  font-size: 0.78rem;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  margin-top: 2px;
}
</style>
