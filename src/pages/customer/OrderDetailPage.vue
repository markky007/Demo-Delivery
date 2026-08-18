<template>
  <q-page class="order-detail-page q-pa-md">
    <div v-if="isLoading" class="q-pa-md">
      <LoadingSkeleton type="list" :count="2" />
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
          <div class="text-weight-bold text-subtitle2 q-mb-sm">รายการอาหารที่สั่ง</div>
          <div class="items-list">
            <div v-for="item in order.items" :key="item.id" class="order-dish-row q-py-sm">
              <div class="row justify-between items-start">
                <div class="col">
                  <div class="dish-name text-weight-bold">{{ item.snapshot_name }}</div>

                  <!-- Options -->
                  <div v-if="item.options.length > 0" class="dish-options q-mt-xs">
                    <span v-for="opt in item.options" :key="opt.id" class="opt-tag">
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
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { fetchOrder } from 'src/services/orderService';
import { formatPrice, formatDateTime, formatQueueNumber } from 'src/utils/formatters';
import { OrderStatus } from 'src/types/enums';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import type { OrderWithItems } from 'src/types/database';

const route = useRoute();

const order = ref<OrderWithItems | null>(null);
const isLoading = ref(true);

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

onMounted(async () => {
  const orderId = route.params.orderId as string;
  order.value = await fetchOrder(orderId);
  isLoading.value = false;
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
</style>
