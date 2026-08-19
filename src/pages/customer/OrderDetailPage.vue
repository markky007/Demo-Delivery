<template>
  <q-page class="order-detail-page q-pa-md">
    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="order-detail-container">
      <LoadingSkeleton type="order-detail" />
    </div>

    <template v-else-if="order">
      <div class="order-detail-container">
        <!-- Order Header & Number -->
        <div class="order-header-card q-mb-md">
          <div class="row items-center justify-between">
            <div>
              <div class="text-caption text-grey-7">หมายเลขรายการ</div>
              <h4 class="q-my-none text-weight-bold order-number">
                {{ formatQueueNumber(order.queue_number) }}
              </h4>
            </div>
            <StatusBadge :status="order.status" mode="customer" />
          </div>
          <div class="text-grey-6 text-caption q-mt-xs">
            สั่งเมื่อ {{ formatDateTime(order.created_at) }}
          </div>
        </div>

        <!-- Live Queue Tracking Card -->
        <div class="queue-hero-card q-mb-md">
          <div class="row items-center justify-between q-mb-sm">
            <div class="row items-center q-gutter-x-xs">
              <q-icon name="schedule" size="18px" color="primary" />
              <span class="text-weight-bold text-subtitle2 text-dark">ข้อมูลลำดับคิวในครัว</span>
            </div>
            <div class="row items-center text-caption live-badge">
              <span class="pulse-dot q-mr-xs"></span>
              <span>อัปเดตสด</span>
            </div>
          </div>

          <!-- 2 Main Stat Metric Boxes -->
          <div class="row q-col-gutter-sm q-mb-sm">
            <!-- Metric 1: Queue Position -->
            <div class="col-6">
              <div
                class="queue-metric-box"
                :class="{
                  'queue-metric-box--highlight':
                    order.status === OrderStatus.PREPARING ||
                    (order.status === OrderStatus.QUEUED && queueInfo.queuesAhead === 0),
                  'queue-metric-box--prepared': order.status === OrderStatus.PREPARED,
                  'queue-metric-box--served': order.status === OrderStatus.SERVED,
                }"
              >
                <div class="metric-label">ลำดับคิวของคุณ</div>
                <div class="metric-value">
                  <template v-if="order.status === OrderStatus.SERVED">
                    <span class="text-grey-7">เสิร์ฟแล้ว</span>
                  </template>
                  <template v-else-if="order.status === OrderStatus.PREPARED">
                    <span class="text-green-8">พร้อมเสิร์ฟ</span>
                  </template>
                  <template v-else-if="queueInfo.queuePosition > 0">
                    <span class="text-primary">คิวที่ {{ queueInfo.queuePosition }}</span>
                  </template>
                  <template v-else>
                    <span>-</span>
                  </template>
                </div>
                <div class="metric-sub">
                  <template v-if="order.status === OrderStatus.SERVED">
                    เสร็จสิ้นเรียบร้อย
                  </template>
                  <template v-else-if="order.status === OrderStatus.PREPARED">
                    กำลังนำมาเสิร์ฟ
                  </template>
                  <template v-else-if="queueInfo.queuesAhead === 0"> คิวปัจจุบัน </template>
                  <template v-else> จาก {{ queueInfo.totalActive }} คิวในครัว </template>
                </div>
              </div>
            </div>

            <!-- Metric 2: Queues Ahead -->
            <div class="col-6">
              <div
                class="queue-metric-box"
                :class="{
                  'queue-metric-box--highlight':
                    order.status === OrderStatus.PREPARING ||
                    (order.status === OrderStatus.QUEUED && queueInfo.queuesAhead === 0),
                  'queue-metric-box--prepared': order.status === OrderStatus.PREPARED,
                  'queue-metric-box--served': order.status === OrderStatus.SERVED,
                }"
              >
                <div class="metric-label">ต้องรออีก</div>
                <div class="metric-value">
                  <template v-if="order.status === OrderStatus.SERVED">
                    <span class="text-grey-7">0 คิว</span>
                  </template>
                  <template v-else-if="order.status === OrderStatus.PREPARED">
                    <span class="text-green-8">0 คิว</span>
                  </template>
                  <template v-else-if="queueInfo.queuesAhead === 0">
                    <span class="text-amber-9">0 คิว</span>
                  </template>
                  <template v-else>
                    <span class="text-primary">{{ queueInfo.queuesAhead }} คิว</span>
                  </template>
                </div>
                <div class="metric-sub">
                  <template v-if="order.status === OrderStatus.SERVED"> ได้รับอาหารแล้ว </template>
                  <template v-else-if="order.status === OrderStatus.PREPARED">
                    รอพนักงานเสิร์ฟ
                  </template>
                  <template v-else-if="queueInfo.queuesAhead === 0">
                    {{ order.status === OrderStatus.PREPARING ? 'กำลังทำอยู่' : 'คิวถัดไป' }}
                  </template>
                  <template v-else> คิวก่อนหน้าคุณ </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Dynamic Status Message Banner -->
          <div class="queue-status-banner" :class="statusBannerClass">
            <q-icon :name="statusBannerIcon" size="18px" class="q-mr-xs flex-shrink-0" />
            <span>{{ statusBannerMessage }}</span>
          </div>
        </div>

        <!-- Status Progress Stepper -->
        <div class="status-tracker-card q-mb-md">
          <div class="text-weight-bold text-subtitle2 q-mb-md">สถานะการทำอาหาร</div>
          <div class="tracker-steps">
            <!-- Step 1: Queued -->
            <div
              class="tracker-step"
              :class="{
                'tracker-step--active': true,
                'tracker-step--completed': isStepCompleted(1),
              }"
            >
              <div class="step-dot">
                <q-icon :name="isStepCompleted(1) ? 'check' : 'schedule'" size="16px" />
              </div>
              <div class="step-label">รับออเดอร์แล้ว</div>
            </div>

            <div class="tracker-line" :class="{ 'tracker-line--active': isStepCompleted(1) }"></div>

            <!-- Step 2: Preparing -->
            <div
              class="tracker-step"
              :class="{
                'tracker-step--active': isStepActive(2),
                'tracker-step--completed': isStepCompleted(2),
              }"
            >
              <div class="step-dot">
                <q-icon :name="isStepCompleted(2) ? 'check' : 'soup_kitchen'" size="16px" />
              </div>
              <div class="step-label">กำลังเตรียมอาหาร</div>
            </div>

            <div class="tracker-line" :class="{ 'tracker-line--active': isStepCompleted(2) }"></div>

            <!-- Step 3: Served -->
            <div
              class="tracker-step"
              :class="{
                'tracker-step--active': isStepActive(3),
                'tracker-step--completed': isStepCompleted(3),
              }"
            >
              <div class="step-dot">
                <q-icon name="done_all" size="16px" />
              </div>
              <div class="step-label">เสิร์ฟแล้ว</div>
            </div>
          </div>
        </div>

        <!-- Order Items Breakdown -->
        <div class="order-items-card q-mb-md">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-weight-bold text-subtitle2">รายการอาหารที่สั่ง</div>
            <q-btn
              v-if="isEditable"
              unelevated
              no-caps
              rounded
              color="primary"
              size="sm"
              class="edit-order-btn"
              @click="showEditModal = true"
            >
              <q-icon name="edit_note" size="16px" class="q-mr-xs" />
              <span>แก้ไขออเดอร์</span>
            </q-btn>
          </div>

          <!-- Editable Notice Banner when shop hasn't started -->
          <div v-if="isEditable" class="editable-hint-banner q-mb-sm">
            <div class="row items-center justify-between full-width">
              <div class="row items-center text-caption text-primary">
                <q-icon name="edit_note" size="16px" class="q-mr-xs flex-shrink-0" />
                <span>ร้านยังไม่เริ่มทำ สามารถแก้ไขรายการได้</span>
              </div>
              <q-btn
                flat
                dense
                no-caps
                color="primary"
                size="sm"
                label="กดแก้ไข"
                class="q-ml-xs text-weight-bold"
                @click="showEditModal = true"
              />
            </div>
          </div>

          <div class="items-list">
            <div v-for="item in order.items" :key="item.id" class="order-dish-row q-py-sm">
              <div class="row justify-between items-start">
                <div class="col">
                  <div class="dish-name text-weight-bold">{{ item.snapshot_name }}</div>

                  <!-- Options -->
                  <div
                    v-if="getVisibleOptions(item.options).length > 0"
                    class="dish-options q-mt-xs"
                  >
                    <span
                      v-for="opt in getVisibleOptions(item.options)"
                      :key="opt.id"
                      class="opt-tag"
                    >
                      {{ opt.snapshot_option_name }}
                      <template v-if="opt.snapshot_price_adjustment > 0">
                        (+{{ formatPrice(opt.snapshot_price_adjustment) }})
                      </template>
                    </span>
                  </div>

                  <!-- Special Instruction -->
                  <div v-if="item.special_instruction" class="dish-note q-mt-xs">
                    <q-icon name="edit_note" size="16px" class="q-mr-xs" />
                    <span>{{ item.special_instruction }}</span>
                  </div>
                </div>

                <div class="text-right text-no-wrap q-ml-md">
                  <div class="dish-qty text-grey-7">x{{ item.quantity }}</div>
                  <div class="dish-price text-weight-bold">{{ formatPrice(item.subtotal) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Total calculation -->
          <q-separator class="q-my-md" />
          <div class="row justify-between items-center">
            <span class="text-subtitle1 text-weight-bold">ยอดรวมรายการนี้</span>
            <span class="text-h6 text-weight-bold text-primary">
              {{ formatPrice(order.total_amount) }}
            </span>
          </div>
        </div>

        <!-- Edit Order Modal Dialog -->
        <EditOrderModal
          v-if="order"
          v-model="showEditModal"
          :order="order"
          @saved="onOrderSaved"
        />
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  fetchOrder,
  fetchActiveKitchenOrders,
  calculateQueuePosition,
  type ActiveKitchenOrder,
} from 'src/services/orderService';
import { supabase } from 'src/services/supabase';
import {
  formatPrice,
  formatDateTime,
  formatQueueNumber,
  getVisibleOptions,
} from 'src/utils/formatters';
import { OrderStatus, EditableStatuses } from 'src/types/enums';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import EditOrderModal from 'src/components/EditOrderModal.vue';
import type { OrderWithItems } from 'src/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

const route = useRoute();

const order = ref<OrderWithItems | null>(null);
const activeKitchenOrders = ref<ActiveKitchenOrder[]>([]);
const isLoading = ref(true);
const showEditModal = ref(false);
let realtimeChannel: RealtimeChannel | null = null;
let refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const isEditable = computed(() => !!order.value && EditableStatuses.includes(order.value.status));

const queueInfo = computed(() => {
  if (!order.value) {
    return {
      queuesAhead: 0,
      queuePosition: 0,
      totalActive: 0,
      statusText: '',
      isCurrentOrNext: false,
    };
  }
  return calculateQueuePosition(
    order.value.queue_number,
    order.value.status,
    activeKitchenOrders.value,
  );
});

const statusBannerMessage = computed(() => {
  if (!order.value) return '';

  if (order.value.status === OrderStatus.SERVED) {
    return 'อาหารเสิร์ฟถึงโต๊ะเรียบร้อยแล้ว ขอให้อร่อยกับมื้ออาหารครับ';
  }
  if (order.value.status === OrderStatus.PREPARED) {
    return 'อาหารปรุงเสร็จเรียบร้อยแล้ว! พนักงานกำลังนำมาเสิร์ฟที่โต๊ะของคุณ';
  }
  if (order.value.status === OrderStatus.PREPARING) {
    if (queueInfo.value.queuesAhead === 0) {
      return 'เชฟกำลังปรุงอาหารออเดอร์นี้ของคุณอยู่ครับ';
    }
    return `ครัวเริ่มเตรียมออเดอร์นี้แล้ว (มีอีก ${queueInfo.value.queuesAhead} คิวก่อนหน้ากำลังทำ)`;
  }
  // OrderStatus.QUEUED
  if (queueInfo.value.queuesAhead === 0) {
    return 'ถึงคิวของคุณแล้ว! ครัวกำลังจะเริ่มปรุงอาหารในลำดับถัดไป';
  }
  return `ออเดอร์อยู่ในคิวรอทำ โดยมีอีก ${queueInfo.value.queuesAhead} คิวก่อนหน้า ครัวกำลังทยอยทำตามลำดับครับ`;
});

const statusBannerIcon = computed(() => {
  if (!order.value) return 'info';
  if (order.value.status === OrderStatus.SERVED) return 'done_all';
  if (order.value.status === OrderStatus.PREPARED) return 'check_circle';
  if (order.value.status === OrderStatus.PREPARING) return 'soup_kitchen';
  return 'schedule';
});

const statusBannerClass = computed(() => {
  if (!order.value) return '';
  if (order.value.status === OrderStatus.SERVED) return 'queue-status-banner--served';
  if (order.value.status === OrderStatus.PREPARED) return 'queue-status-banner--prepared';
  if (order.value.status === OrderStatus.PREPARING) return 'queue-status-banner--preparing';
  return 'queue-status-banner--queued';
});

function isStepActive(step: number): boolean {
  if (!order.value) return false;
  if (step === 1) return true;
  if (step === 2)
    return (
      order.value.status === OrderStatus.PREPARING ||
      order.value.status === OrderStatus.PREPARED ||
      order.value.status === OrderStatus.SERVED
    );
  if (step === 3) return order.value.status === OrderStatus.SERVED;
  return false;
}

function isStepCompleted(step: number): boolean {
  if (!order.value) return false;
  if (step === 1)
    return (
      order.value.status === OrderStatus.PREPARING ||
      order.value.status === OrderStatus.PREPARED ||
      order.value.status === OrderStatus.SERVED
    );
  if (step === 2) return order.value.status === OrderStatus.SERVED;
  if (step === 3) return order.value.status === OrderStatus.SERVED;
  return false;
}

async function refreshOrderData() {
  const orderId = route.params.orderId as string;
  try {
    const [fetchedOrder, kitchenOrders] = await Promise.all([
      fetchOrder(orderId),
      fetchActiveKitchenOrders(),
    ]);
    order.value = fetchedOrder;
    activeKitchenOrders.value = kitchenOrders;
  } catch {
    // Ignore background refresh errors
  }
}

/** Called after EditOrderModal saves — adds a small delay for RPC transaction to commit */
async function onOrderSaved() {
  await new Promise((resolve) => setTimeout(resolve, 300));
  await refreshOrderData();
}

/** Debounced refresh to prevent race conditions from rapid realtime events */
function debouncedRefresh() {
  if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
  refreshDebounceTimer = setTimeout(() => {
    void refreshOrderData();
  }, 500);
}

onMounted(async () => {
  const orderId = route.params.orderId as string;
  try {
    const [fetchedOrder, kitchenOrders] = await Promise.all([
      fetchOrder(orderId),
      fetchActiveKitchenOrders(),
    ]);
    order.value = fetchedOrder;
    activeKitchenOrders.value = kitchenOrders;
  } finally {
    isLoading.value = false;
  }

  // Subscribe to live changes on orders table
  realtimeChannel = supabase
    .channel(`order-detail-live-queue-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
      },
      () => {
        debouncedRefresh();
      },
    )
    .subscribe();
});

onUnmounted(() => {
  if (realtimeChannel) {
    void supabase.removeChannel(realtimeChannel);
  }
  if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
});
</script>

<style scoped>
.order-detail-page {
  background: var(--color-background);
  min-height: 100vh;
}

.order-detail-container {
  max-width: 600px;
  margin: 0 auto;
}

.order-header-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 16px;
  box-shadow: var(--shadow-subtle);
}

.order-number {
  color: var(--color-primary);
  line-height: 1.2;
}

/* Queue Hero Card */
.queue-hero-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 16px;
  box-shadow: var(--shadow-subtle);
}

.live-badge {
  color: #16a34a;
  font-weight: 600;
  font-size: 0.75rem;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background-color: #22c55e;
  border-radius: 50%;
  display: inline-block;
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

.queue-metric-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  transition: all 0.2s ease;
}

.queue-metric-box--highlight {
  background: #fffbeb;
  border-color: #fde68a;
}

.queue-metric-box--prepared {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.queue-metric-box--served {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.metric-label {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  margin-bottom: 2px;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.2;
}

.metric-sub {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.queue-status-banner {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  line-height: 1.4;
  font-weight: 500;
}

.queue-status-banner--queued {
  background-color: var(--color-status-queued-bg);
  color: #0369a1;
}

.queue-status-banner--preparing {
  background-color: var(--color-status-preparing-bg);
  color: #b45309;
}

.queue-status-banner--prepared {
  background-color: var(--color-status-prepared-bg);
  color: #15803d;
}

.queue-status-banner--served {
  background-color: var(--color-status-served-bg);
  color: #475569;
}

/* Status Tracker */
.status-tracker-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 18px 16px;
  box-shadow: var(--shadow-subtle);
}

.tracker-steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.tracker-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  z-index: 2;
  flex: 1;
}

.step-dot {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-subtle);
  color: var(--color-text-muted);
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  transition: all 0.25s ease;
}

.tracker-step--active .step-dot {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.tracker-step--completed .step-dot {
  background: var(--color-status-prepared);
  color: #ffffff;
  border-color: var(--color-status-prepared);
}

.step-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.tracker-step--active .step-label {
  color: var(--color-text-primary);
  font-weight: 600;
}

.tracker-line {
  height: 2px;
  background: var(--color-border);
  flex: 1;
  margin: 0 4px;
  margin-bottom: 24px;
  transition: background-color 0.25s ease;
}

.tracker-line--active {
  background: var(--color-status-prepared);
}

/* Items breakdown */
.order-items-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 16px;
  box-shadow: var(--shadow-subtle);
}

.order-dish-row + .order-dish-row {
  border-top: 1px solid var(--color-border-subtle);
}

.dish-name {
  font-size: 0.95rem;
  color: var(--color-text-primary);
}

.dish-options {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.opt-tag {
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.dish-note {
  font-size: 0.8rem;
  color: var(--color-status-preparing);
  display: flex;
  align-items: center;
}

.dish-qty {
  font-size: 0.85rem;
}

.dish-price {
  font-size: 0.95rem;
  color: var(--color-text-primary);
}

.edit-order-btn {
  font-weight: 600;
  padding: 4px 12px;
}

.editable-hint-banner {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 6px 10px;
}
</style>
