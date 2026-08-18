<template>
  <q-page class="queue-page q-pa-md">
    <!-- Loading Skeleton -->
    <LoadingSkeleton v-if="isLoading" type="queue" />

    <template v-else>
      <!-- Queue Header Bar -->
      <div class="row items-center justify-between q-mb-md">
        <div>
          <h5 class="q-my-none text-weight-bold page-title">คิวออเดอร์ในครัว</h5>
          <p class="text-caption text-grey-7 q-mb-none">
            จัดการลำดับการทำอาหารและเสิร์ฟตามคิว (FIFO)
          </p>
        </div>
        <div class="row items-center q-gutter-sm">
          <q-badge color="primary" rounded class="q-px-sm q-py-xs">
            <q-icon name="sync" size="14px" class="q-mr-xs animate-spin-slow" />
            <span>อัปเดตแบบเรียลไทม์</span>
          </q-badge>
        </div>
      </div>

      <!-- Kanban 4 Columns Grid -->
      <div class="queue-kanban-grid">
        <!-- 1. QUEUED (รายการใหม่) -->
        <div class="queue-column queue-column--queued">
          <div class="queue-column-header bg-light-blue-1 text-light-blue-9">
            <div class="row items-center">
              <q-icon name="schedule" size="18px" class="q-mr-xs text-light-blue-8" />
              <span class="column-title">รายการใหม่</span>
            </div>
            <span class="column-count-badge bg-light-blue-8 text-white">
              {{ queueStore.queuedOrders.length }}
            </span>
          </div>

          <div class="queue-column-body">
            <div
              v-for="order in queueStore.queuedOrders"
              :key="order.id"
              class="queue-card queue-card--queued"
            >
              <!-- Card Header -->
              <div class="row items-center justify-between q-mb-xs">
                <div class="row items-center">
                  <span class="queue-seq-number">{{ formatQueueNumber(order.queue_number) }}</span>
                </div>
                <div class="elapsed-badge">
                  <q-icon name="timer" size="13px" class="q-mr-xs" />
                  <span>{{ formatElapsed(order.created_at) }}</span>
                </div>
              </div>

              <!-- Dishes List -->
              <div class="dishes-list q-my-sm">
                <div v-for="item in order.items" :key="item.id" class="dish-item-row">
                  <div class="dish-name-line">
                    <span class="text-weight-bold text-primary q-mr-xs">{{ item.quantity }}x</span>
                    <span>{{ item.snapshot_name }}</span>
                  </div>
                  <!-- Special note -->
                  <div v-if="item.special_instruction" class="dish-special-note">
                    <q-icon name="edit_note" size="14px" class="q-mr-xs" />
                    <span>{{ item.special_instruction }}</span>
                  </div>
                </div>
              </div>

              <!-- Action Button -->
              <div class="card-action-bar q-mt-sm">
                <q-btn
                  unelevated
                  no-caps
                  class="full-width action-btn action-btn--preparing"
                  @click="advanceStatus(order.id, OrderStatus.PREPARING)"
                >
                  <q-icon name="soup_kitchen" size="16px" class="q-mr-xs" />
                  <span>เริ่มเตรียมอาหาร</span>
                </q-btn>
              </div>
            </div>

            <div v-if="queueStore.queuedOrders.length === 0" class="empty-column-state">
              <q-icon name="check_circle_outline" size="32px" color="grey-4" class="q-mb-xs" />
              <div>ไม่มีออเดอร์ใหม่</div>
            </div>
          </div>
        </div>

        <!-- 2. PREPARING (กำลังเตรียม) -->
        <div class="queue-column queue-column--preparing">
          <div class="queue-column-header bg-amber-1 text-amber-10">
            <div class="row items-center">
              <q-icon name="soup_kitchen" size="18px" class="q-mr-xs text-amber-9" />
              <span class="column-title">กำลังเตรียม</span>
            </div>
            <span class="column-count-badge bg-amber-9 text-white">
              {{ queueStore.preparingOrders.length }}
            </span>
          </div>

          <div class="queue-column-body">
            <div
              v-for="order in queueStore.preparingOrders"
              :key="order.id"
              class="queue-card queue-card--preparing"
              :class="{ 'queue-card--updated': order.revision > 1 }"
            >
              <!-- Card Header -->
              <div class="row items-center justify-between q-mb-xs">
                <div class="row items-center">
                  <span class="queue-seq-number">{{ formatQueueNumber(order.queue_number) }}</span>
                </div>
                <div class="elapsed-badge elapsed-badge--amber">
                  <q-icon name="timer" size="13px" class="q-mr-xs" />
                  <span>{{ formatElapsed(order.preparing_at || order.created_at) }}</span>
                </div>
              </div>

              <!-- Revision alert -->
              <div v-if="order.revision > 1" class="revision-banner q-mb-xs">
                <q-icon name="notification_important" size="14px" class="q-mr-xs" />
                <span>ลูกค้ารายการนี้มีการแก้ไข</span>
              </div>

              <!-- Dishes List -->
              <div class="dishes-list q-my-sm">
                <div v-for="item in order.items" :key="item.id" class="dish-item-row">
                  <div class="dish-name-line">
                    <span class="text-weight-bold text-amber-9 q-mr-xs">{{ item.quantity }}x</span>
                    <span>{{ item.snapshot_name }}</span>
                  </div>
                  <div v-if="item.special_instruction" class="dish-special-note">
                    <q-icon name="edit_note" size="14px" class="q-mr-xs" />
                    <span>{{ item.special_instruction }}</span>
                  </div>
                </div>
              </div>

              <!-- Action Button -->
              <div class="card-action-bar q-mt-sm">
                <q-btn
                  unelevated
                  no-caps
                  class="full-width action-btn action-btn--prepared"
                  @click="advanceStatus(order.id, OrderStatus.PREPARED)"
                >
                  <q-icon name="check_circle" size="16px" class="q-mr-xs" />
                  <span>เตรียมเสร็จแล้ว</span>
                </q-btn>
              </div>
            </div>

            <div v-if="queueStore.preparingOrders.length === 0" class="empty-column-state">
              <q-icon name="restaurant" size="32px" color="grey-4" class="q-mb-xs" />
              <div>ไม่มีรายการที่กำลังเตรียม</div>
            </div>
          </div>
        </div>

        <!-- 3. PREPARED (เตรียมเสร็จแล้ว / พร้อมเสิร์ฟ) -->
        <div class="queue-column queue-column--prepared">
          <div class="queue-column-header bg-green-1 text-green-9">
            <div class="row items-center">
              <q-icon name="check_circle" size="18px" class="q-mr-xs text-green-7" />
              <span class="column-title">เตรียมเสร็จแล้ว</span>
            </div>
            <span class="column-count-badge bg-green-7 text-white">
              {{ queueStore.preparedOrders.length }}
            </span>
          </div>

          <div class="queue-column-body">
            <div
              v-for="order in queueStore.preparedOrders"
              :key="order.id"
              class="queue-card queue-card--prepared"
              :class="{
                'queue-card--can-serve': queueStore.canServe(order),
                'queue-card--blocked': !queueStore.canServe(order),
              }"
            >
              <!-- Card Header -->
              <div class="row items-center justify-between q-mb-xs">
                <div class="row items-center">
                  <span class="queue-seq-number">{{ formatQueueNumber(order.queue_number) }}</span>
                </div>
                <div class="elapsed-badge elapsed-badge--green">
                  <q-icon name="timer" size="13px" class="q-mr-xs" />
                  <span>{{ formatElapsed(order.prepared_at || order.created_at) }}</span>
                </div>
              </div>

              <!-- Dishes List -->
              <div class="dishes-list q-my-sm">
                <div v-for="item in order.items" :key="item.id" class="dish-item-row">
                  <div class="dish-name-line">
                    <span class="text-weight-bold text-green-8 q-mr-xs">{{ item.quantity }}x</span>
                    <span>{{ item.snapshot_name }}</span>
                  </div>
                </div>
              </div>

              <!-- FIFO Block Notice if earlier order is not served yet -->
              <div v-if="!queueStore.canServe(order)" class="fifo-block-banner q-mb-sm">
                <q-icon name="hourglass_top" size="14px" class="q-mr-xs" />
                <span>รอเสิร์ฟตามลำดับคิวก่อนหน้า</span>
              </div>

              <!-- Action Button: Confirm Served -->
              <div class="card-action-bar q-mt-sm">
                <q-btn
                  unelevated
                  no-caps
                  class="full-width action-btn"
                  :class="
                    queueStore.canServe(order)
                      ? 'action-btn--serve-ready'
                      : 'action-btn--serve-disabled'
                  "
                  :disable="!queueStore.canServe(order)"
                  @click="advanceStatus(order.id, OrderStatus.SERVED)"
                >
                  <q-icon name="done_all" size="16px" class="q-mr-xs" />
                  <span>{{
                    queueStore.canServe(order) ? 'ยืนยันว่าเสิร์ฟครบแล้ว' : 'รอคิวก่อนหน้า'
                  }}</span>
                </q-btn>
              </div>
            </div>

            <div v-if="queueStore.preparedOrders.length === 0" class="empty-column-state">
              <q-icon name="room_service" size="32px" color="grey-4" class="q-mb-xs" />
              <div>ไม่มีอาหารรอเสิร์ฟ</div>
            </div>
          </div>
        </div>

        <!-- 4. SERVED (เสิร์ฟครบแล้ว) -->
        <div class="queue-column queue-column--served">
          <div class="queue-column-header bg-grey-2 text-grey-8">
            <div class="row items-center">
              <q-icon name="done_all" size="18px" class="q-mr-xs text-grey-7" />
              <span class="column-title">เสิร์ฟแล้ว</span>
            </div>
            <span class="column-count-badge bg-grey-6 text-white">
              {{ queueStore.servedOrders.length }}
            </span>
          </div>

          <div class="queue-column-body">
            <div
              v-for="order in queueStore.servedOrders.slice(0, 15)"
              :key="order.id"
              class="queue-card queue-card--served"
            >
              <div class="row items-center justify-between">
                <div class="row items-center">
                  <span class="queue-seq-number text-grey-7">
                    {{ formatQueueNumber(order.queue_number) }}
                  </span>
                  <span class="text-caption text-grey-6 q-ml-sm">
                    ({{ order.items.length }} รายการ)
                  </span>
                </div>
                <span class="text-caption text-grey-5">
                  {{ formatTime(order.served_at || order.created_at) }}
                </span>
              </div>
            </div>

            <div v-if="queueStore.servedOrders.length === 0" class="empty-column-state">
              <q-icon name="history" size="32px" color="grey-4" class="q-mb-xs" />
              <div>ยังไม่มีรายการที่เสิร์ฟวันนี้</div>
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
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
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
          const orders = await fetchTodayOrders();
          queueStore.setOrders(orders);

          if (payload.eventType === 'INSERT') {
            notifyWarning('มีออเดอร์ใหม่เข้ามา!');
          }
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as { revision?: number };
            if (newData.revision && newData.revision > 1) {
              notifyWarning('ลูกค้ามีการแก้ไขรายการอาหาร');
            }
          }
        })();
      },
    )
    .subscribe();

  elapsedInterval = setInterval(() => {
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
    const labelMap: Record<string, string> = {
      [OrderStatus.PREPARING]: 'เริ่มเตรียมอาหารแล้ว',
      [OrderStatus.PREPARED]: 'เตรียมเสร็จเรียบร้อย',
      [OrderStatus.SERVED]: 'ยืนยันการเสิร์ฟสำเร็จ',
    };
    notifySuccess(labelMap[newStatus] || 'อัปเดตสถานะสำเร็จ');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะได้';
    notifyError(msg);
  }
}
</script>

<style scoped>
.queue-page {
  background: var(--color-background);
  min-height: 100vh;
}

.page-title {
  color: var(--color-text-primary);
  line-height: 1.2;
}

.queue-kanban-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  align-items: start;
}

@media (max-width: 1100px) {
  .queue-kanban-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

@media (max-width: 650px) {
  .queue-kanban-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.queue-column {
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-subtle);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.queue-column-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
}

.column-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.column-count-badge {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
}

.queue-column-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 400px;
  max-height: calc(100vh - 190px);
  overflow-y: auto;
}

/* Cards */
.queue-card {
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px;
  box-shadow: var(--shadow-subtle);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.queue-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-card);
}

.queue-card--queued {
  border-left: 4px solid var(--color-status-queued);
}

.queue-card--preparing {
  border-left: 4px solid var(--color-status-preparing);
  background: #fffdfa;
}

.queue-card--prepared {
  border-left: 4px solid var(--color-status-prepared);
}

.queue-card--can-serve {
  background: #f0fdf4;
  border-color: #86efac;
}

.queue-card--blocked {
  opacity: 0.82;
}

.queue-card--served {
  padding: 10px 12px;
  opacity: 0.75;
  background: #fafafa;
}

.queue-seq-number {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
}

.elapsed-badge {
  display: inline-flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.elapsed-badge--amber {
  color: var(--color-status-preparing);
  border-color: #fde68a;
  background: #fffbeb;
}

.elapsed-badge--green {
  color: var(--color-status-prepared);
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.revision-banner {
  display: flex;
  align-items: center;
  background: #fef3c7;
  color: #b45309;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: var(--radius-xs);
}

.fifo-block-banner {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.76rem;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: var(--radius-xs);
}

.dish-item-row {
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 4px;
}

.dish-name-line {
  color: var(--color-text-primary);
}

.dish-special-note {
  font-size: 0.78rem;
  color: var(--color-status-preparing);
  display: flex;
  align-items: center;
  margin-top: 1px;
}

/* Action Buttons */
.action-btn {
  height: 38px;
  font-size: 0.88rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.action-btn--preparing {
  background: var(--color-primary);
  color: #ffffff;
}

.action-btn--prepared {
  background: var(--color-status-preparing);
  color: #ffffff;
}

.action-btn--serve-ready {
  background: var(--color-status-prepared);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
}

.action-btn--serve-disabled {
  background: #e2e8f0;
  color: #94a3b8;
}

.empty-column-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  color: var(--color-text-muted);
  font-size: 0.88rem;
  text-align: center;
}

.animate-spin-slow {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}
</style>
