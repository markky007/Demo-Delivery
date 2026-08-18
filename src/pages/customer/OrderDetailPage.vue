<template>
  <q-page class="order-detail-page q-pa-md">
    <div v-if="isLoading" class="column items-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <template v-else-if="order">
      <!-- Order header -->
      <div class="order-header q-mb-md">
        <div class="row items-center justify-between">
          <h5 class="q-my-none text-weight-bold">{{ formatQueueNumber(order.queue_number) }}</h5>
          <q-badge
            :color="statusColor(order.status)"
            :label="customerStatusLabel(order.status)"
            class="status-badge"
          />
        </div>
        <div class="text-grey-6 q-mt-xs">
          {{ formatDateTime(order.created_at) }}
        </div>
      </div>

      <!-- Order items -->
      <div class="order-items">
        <div v-for="item in order.items" :key="item.id" class="order-item q-mb-md">
          <div class="row justify-between">
            <div class="col">
              <div class="item-name">{{ item.snapshot_name }}</div>
              <div v-if="item.options.length > 0" class="item-options">
                <span v-for="(opt, i) in item.options" :key="opt.id">
                  {{ opt.snapshot_option_name
                  }}<span v-if="opt.snapshot_price_adjustment > 0">
                    +{{ formatPrice(opt.snapshot_price_adjustment) }}</span
                  >{{ i < item.options.length - 1 ? ', ' : '' }}
                </span>
              </div>
              <div v-if="item.special_instruction" class="item-note">
                📝 {{ item.special_instruction }}
              </div>
            </div>
            <div class="text-right text-no-wrap q-ml-md">
              <div class="item-qty">x{{ item.quantity }}</div>
              <div class="item-price">{{ formatPrice(item.subtotal) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Total -->
      <q-separator class="q-my-md" />
      <div class="row justify-between items-center">
        <span class="text-h6 text-weight-medium">Total</span>
        <span class="text-h6 text-weight-bold text-primary">
          {{ formatPrice(order.total_amount) }}
        </span>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { fetchOrder } from 'src/services/orderService';
import { formatPrice, formatDateTime, formatQueueNumber } from 'src/utils/formatters';
import type { OrderStatus } from 'src/types/enums';
import { CustomerStatusLabel } from 'src/types/enums';
import { STATUS_COLORS } from 'src/utils/constants';
import type { OrderWithItems } from 'src/types/database';

const route = useRoute();

const order = ref<OrderWithItems | null>(null);
const isLoading = ref(true);

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'grey-6';
}

function customerStatusLabel(status: string): string {
  return CustomerStatusLabel[status as OrderStatus] ?? status;
}

onMounted(async () => {
  const orderId = route.params.orderId as string;
  order.value = await fetchOrder(orderId);
  isLoading.value = false;
});
</script>

<style scoped>
.order-detail-page {
  background: #f5f7fa;
  min-height: 100vh;
}

.order-header {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.status-badge {
  font-size: 0.8rem;
  padding: 5px 12px;
  border-radius: 8px;
}

.order-items {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.order-item + .order-item {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.item-name {
  font-weight: 600;
  color: #1a1a2e;
}

.item-options {
  font-size: 0.8rem;
  color: #888;
  margin-top: 2px;
}

.item-note {
  font-size: 0.8rem;
  color: #666;
  margin-top: 4px;
  font-style: italic;
}

.item-qty {
  font-size: 0.85rem;
  color: #888;
}

.item-price {
  font-weight: 600;
  color: #1a1a2e;
}
</style>
