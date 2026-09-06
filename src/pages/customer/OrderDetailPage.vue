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
          <div class="row items-center justify-between no-wrap">
            <div>
              <div class="order-badge-label row items-center q-gutter-x-xs q-mb-xs">
                <q-icon name="receipt_long" size="14px" color="grey-7" />
                <span class="text-caption text-grey-7 text-weight-medium">หมายเลขรายการ</span>
              </div>
              <div class="order-number text-weight-bolder">
                {{ formatQueueNumber(order.queue_number) }}
              </div>
            </div>
            <StatusBadge :status="order.status" mode="customer" />
          </div>
          <div class="text-grey-6 text-caption q-mt-sm row items-center">
            <q-icon name="schedule" size="14px" class="q-mr-xs text-grey-5" />
            <span>สั่งเมื่อ {{ formatDateTime(order.created_at) }}</span>
          </div>
        </div>

        <!-- Live Queue Tracking Card -->
        <div class="queue-hero-card q-mb-md">
          <div class="row items-center justify-between q-mb-sm">
            <div class="row items-center q-gutter-x-xs">
              <q-icon name="query_builder" size="18px" color="primary" />
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
            <q-icon
              :name="statusBannerIcon"
              size="18px"
              class="q-mr-xs flex-shrink-0"
              :class="{
                'animate-steam': order.status === OrderStatus.PREPARING,
                'bounce-anim': order.status === OrderStatus.PREPARED,
              }"
            />
            <span>{{ statusBannerMessage }}</span>
          </div>
        </div>

        <!-- Status Progress Stepper -->
        <div class="status-tracker-card q-mb-md">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-weight-bold text-subtitle2">สถานะการทำอาหาร</div>
            <div v-if="order.status === OrderStatus.PREPARING" class="cooking-hint-pill">
              <span class="q-mr-xs">👨‍🍳</span>
              <span>กำลังปรุงอย่างพิถีพิถัน</span>
            </div>
            <div v-else-if="order.status === OrderStatus.PREPARED" class="ready-hint-pill">
              <span class="q-mr-xs">🔔</span>
              <span>อาหารพร้อมเสิร์ฟแล้ว</span>
            </div>
          </div>

          <div class="tracker-stepper">
            <div class="stepper-dots-row">
              <!-- Step 1: Queued -->
              <div
                class="step-dot"
                :class="{
                  'step-dot--active': true,
                  'step-dot--completed': isStepCompleted(1),
                }"
              >
                <q-icon :name="isStepCompleted(1) ? 'check' : 'receipt_long'" size="18px" />
              </div>

              <!-- Connector 1-2 -->
              <div
                class="step-connector"
                :class="{ 'step-connector--active': isStepCompleted(1) }"
              ></div>

              <!-- Step 2: Preparing -->
              <div
                class="step-dot"
                :class="{
                  'step-dot--active': isStepActive(2),
                  'step-dot--completed': isStepCompleted(2),
                  'step-dot--cooking': order.status === OrderStatus.PREPARING,
                }"
              >
                <q-icon
                  :name="isStepCompleted(2) ? 'check' : 'soup_kitchen'"
                  size="18px"
                  :class="{ 'animate-steam': order.status === OrderStatus.PREPARING }"
                />
              </div>

              <!-- Connector 2-3 -->
              <div
                class="step-connector"
                :class="{ 'step-connector--active': isStepCompleted(2) }"
              ></div>

              <!-- Step 3: Served -->
              <div
                class="step-dot"
                :class="{
                  'step-dot--active': isStepActive(3),
                  'step-dot--completed': isStepCompleted(3),
                  'step-dot--served': order.status === OrderStatus.SERVED,
                }"
              >
                <q-icon
                  :name="order.status === OrderStatus.SERVED ? 'done_all' : 'check'"
                  size="18px"
                />
              </div>
            </div>

            <div class="stepper-labels-row q-mt-sm">
              <div class="step-label" :class="{ 'step-label--active': true }">รับออเดอร์แล้ว</div>
              <div class="step-label" :class="{ 'step-label--active': isStepActive(2) }">
                กำลังเตรียมอาหาร
              </div>
              <div class="step-label" :class="{ 'step-label--active': isStepActive(3) }">
                เสิร์ฟแล้ว
              </div>
            </div>
          </div>
        </div>

        <!-- Order Items Breakdown -->
        <div class="order-items-card q-mb-md">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-weight-bold text-subtitle2">
              รายการอาหารที่สั่ง
              <span class="text-caption text-grey-6 q-ml-xs">({{ order.items.length }} รายการ)</span>
            </div>
          </div>

          <!-- Revision Info Banner (If edited) -->
          <div
            v-if="order.revision > 1"
            class="revised-info-banner q-mb-sm row items-center justify-between"
          >
            <div class="row items-center col-auto">
              <q-icon name="history" size="16px" color="amber-9" class="q-mr-xs" />
              <span class="text-caption text-weight-bold text-amber-10">
                รายการนี้เคยมีการแก้ไข (เวอร์ชัน {{ order.revision }})
              </span>
            </div>
            <q-btn
              flat
              dense
              no-caps
              size="xs"
              color="amber-10"
              icon="visibility"
              label="ย้อนดูเมนูก่อนแก้ไข"
              class="q-px-xs text-weight-bold"
              @click="showHistoryModal = true"
            />
          </div>

          <!-- Editable Notice Banner when shop hasn't started -->
          <div v-if="isEditable" class="editable-hint-banner q-mb-sm">
            <div class="row items-center justify-between full-width no-wrap">
              <div class="row items-center text-caption text-primary q-mr-sm">
                <q-icon name="edit_note" size="18px" class="q-mr-xs flex-shrink-0" />
                <span>ร้านยังไม่เริ่มทำ สามารถแก้ไขรายการได้</span>
              </div>
              <q-btn
                unelevated
                no-caps
                rounded
                color="primary"
                size="sm"
                class="edit-order-btn q-px-sm"
                @click="showEditModal = true"
              >
                <q-icon name="edit" size="13px" class="q-mr-xs" />
                <span>แก้ไข</span>
              </q-btn>
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
                      :class="{ 'opt-tag--takeaway': isTakeawayOption(opt.snapshot_option_name) }"
                    >
                      <q-icon
                        v-if="isTakeawayOption(opt.snapshot_option_name)"
                        name="shopping_bag"
                        size="11px"
                        class="q-mr-xs"
                      />
                      {{
                        isTakeawayOption(opt.snapshot_option_name)
                          ? opt.snapshot_option_name
                          : `+ ${opt.snapshot_option_name}`
                      }}
                      <template v-if="opt.snapshot_price_adjustment > 0">
                        (+{{ formatPrice(opt.snapshot_price_adjustment) }})
                      </template>
                    </span>
                  </div>

                  <!-- Special Instruction -->
                  <div v-if="item.special_instruction" class="dish-note q-mt-xs">
                    <q-icon name="edit_note" size="15px" class="q-mr-xs" />
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
            <span class="text-subtitle1 text-weight-bold text-grey-8">ยอดรวมรายการนี้</span>
            <span class="text-h6 text-weight-bolder text-primary">
              {{ formatPrice(order.total_amount) }}
            </span>
          </div>
        </div>

        <!-- Action Buttons: Order More & View Table Orders -->
        <div class="order-actions-section q-mt-md q-mb-xl q-gutter-y-sm">
          <q-btn
            unelevated
            no-caps
            rounded
            color="primary"
            class="full-width add-more-order-btn"
            :to="`/t/${publicToken}/menu`"
          >
            <q-icon name="add" size="20px" class="q-mr-xs" />
            <span class="text-weight-bold">สั่งอาหารเพิ่ม</span>
          </q-btn>

          <q-btn
            outline
            no-caps
            rounded
            color="grey-8"
            class="full-width view-all-orders-btn"
            :to="`/t/${publicToken}/orders`"
          >
            <q-icon name="receipt_long" size="18px" class="q-mr-xs text-primary" />
            <span>ดูรายการอาหารทั้งหมดของโต๊ะ</span>
          </q-btn>
        </div>

        <!-- Edit Order Modal Dialog -->
        <EditOrderModal v-if="order" v-model="showEditModal" :order="order" @saved="onOrderSaved" />

        <!-- Order History Modal (View-only) -->
        <OrderHistoryModal
          v-if="order"
          v-model="showHistoryModal"
          :order-id="order.id"
          :queue-number="order.queue_number"
        />
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore } from 'src/stores/sessionStore';
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
  isTakeawayOption,
} from 'src/utils/formatters';
import { OrderStatus, EditableStatuses } from 'src/types/enums';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import EditOrderModal from 'src/components/EditOrderModal.vue';
import OrderHistoryModal from 'src/components/OrderHistoryModal.vue';
import type { OrderWithItems } from 'src/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

const route = useRoute();
const sessionStore = useSessionStore();

const order = ref<OrderWithItems | null>(null);
const activeKitchenOrders = ref<ActiveKitchenOrder[]>([]);
const isLoading = ref(true);
const showEditModal = ref(false);
const showHistoryModal = ref(false);
let realtimeChannel: RealtimeChannel | null = null;
let refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const publicToken = computed(
  () => (route.params.publicToken as string) || sessionStore.publicToken || '',
);

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
    order.value.created_at,
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
  padding-bottom: 40px;
}

.order-detail-container {
  max-width: 600px;
  margin: 0 auto;
}

.order-header-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 16px 20px;
  box-shadow: var(--shadow-subtle);
}

.order-badge-label {
  letter-spacing: 0.02em;
}

.order-number {
  color: var(--color-primary);
  font-size: 1.75rem;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

/* Queue Hero Card */
.queue-hero-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 18px 20px;
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
  border-radius: 14px;
  padding: 14px 12px;
  text-align: center;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 96px;
}

.queue-metric-box--highlight {
  background: #fffdf5;
  border-color: #fed7aa;
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
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.metric-sub {
  font-size: 0.74rem;
  color: var(--color-text-muted);
  margin-top: 4px;
  font-weight: 500;
}

.queue-status-banner {
  display: flex;
  align-items: center;
  padding: 11px 14px;
  border-radius: 12px;
  font-size: 0.84rem;
  line-height: 1.45;
  font-weight: 500;
  border: 1px solid transparent;
}

.queue-status-banner--queued {
  background-color: #f0f9ff;
  color: #0369a1;
  border-color: #bae6fd;
}

.queue-status-banner--preparing {
  background-color: #fffbeb;
  color: #b45309;
  border-color: #fde68a;
}

.queue-status-banner--prepared {
  background-color: #f0fdf4;
  color: #15803d;
  border-color: #bbf7d0;
}

.queue-status-banner--served {
  background-color: #f8fafc;
  color: #475569;
  border-color: #e2e8f0;
}

/* Status Tracker */
.status-tracker-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 18px 20px;
  box-shadow: var(--shadow-subtle);
}

.cooking-hint-pill {
  display: inline-flex;
  align-items: center;
  background: #fef3c7;
  color: #b45309;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid #fde68a;
  animation: subtleFloat 2.5s ease-in-out infinite;
}

.ready-hint-pill {
  display: inline-flex;
  align-items: center;
  background: #dcfce7;
  color: #15803d;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid #bbf7d0;
  animation: subtleFloat 2.5s ease-in-out infinite;
}

.tracker-stepper {
  padding: 8px 4px 4px;
}

.stepper-dots-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.step-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f8fafc;
  color: #94a3b8;
  border: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 2;
  transition: all 0.25s ease;
}

.step-dot--active {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.step-dot--cooking {
  background: #fff7ed !important;
  color: #ea580c !important;
  border-color: #ea580c !important;
  box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.15);
}

.step-dot--completed {
  background: #16a34a !important;
  color: #ffffff !important;
  border-color: #16a34a !important;
}

.step-dot--served {
  background: #f1f5f9 !important;
  color: #64748b !important;
  border-color: #cbd5e1 !important;
}

.step-connector {
  flex: 1;
  height: 2px;
  background: #e2e8f0;
  margin: 0 8px;
  transition: background-color 0.25s ease;
}

.step-connector--active {
  background: #16a34a;
}

.stepper-labels-row {
  display: flex;
  justify-content: space-between;
}

.step-label {
  flex: 1;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  padding: 0 4px;
}

.step-label--active {
  color: var(--color-text-primary);
  font-weight: 600;
}

/* Items breakdown */
.order-items-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 18px 20px;
  box-shadow: var(--shadow-subtle);
}

.order-dish-row + .order-dish-row {
  border-top: 1px solid var(--color-border-subtle);
}

.dish-name {
  font-size: 0.98rem;
  color: var(--color-text-primary);
}

.dish-options {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.opt-tag {
  display: inline-flex;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 0.74rem;
  font-weight: 500;
  padding: 2px 9px;
  border-radius: var(--radius-pill);
}

.opt-tag--takeaway {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #ea580c;
  font-weight: 600;
}

.dish-note {
  font-size: 0.78rem;
  color: #d97706;
  background: #fffdf5;
  border: 1px solid #fef3c7;
  padding: 3px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
}

.dish-qty {
  font-size: 0.85rem;
}

.dish-price {
  font-size: 1rem;
  color: var(--color-text-primary);
}

.edit-order-btn {
  font-weight: 600;
  padding: 4px 12px;
}

.editable-hint-banner {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 8px 12px;
}

.revised-info-banner {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 10px;
  padding: 8px 12px;
}

/* Action buttons */
.add-more-order-btn {
  height: 48px;
  font-size: 0.96rem;
  box-shadow: 0 4px 14px rgba(224, 88, 54, 0.25);
}

.view-all-orders-btn {
  height: 44px;
  font-size: 0.92rem;
  background: #ffffff;
  border-color: var(--color-border);
}
</style>
