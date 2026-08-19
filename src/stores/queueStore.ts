/**
 * Pinia store for the owner's order queue.
 * Manages live order data for the operational queue view.
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { OrderStatus } from 'src/types/enums';
import type { OrderWithItems } from 'src/types/database';

export const useQueueStore = defineStore('queue', () => {
  // ─── State ───────────────────────────────────────────
  const orders = ref<OrderWithItems[]>([]);
  const isLoading = ref(false);

  // ─── Getters ─────────────────────────────────────────
  const queuedOrders = computed(() =>
    orders.value
      .filter((o) => o.status === OrderStatus.QUEUED)
      .sort((a, b) => a.queue_number - b.queue_number),
  );

  const preparingOrders = computed(() =>
    orders.value
      .filter((o) => o.status === OrderStatus.PREPARING)
      .sort((a, b) => a.queue_number - b.queue_number),
  );

  const preparedOrders = computed(() =>
    orders.value
      .filter((o) => o.status === OrderStatus.PREPARED)
      .sort((a, b) => a.queue_number - b.queue_number),
  );

  const servedOrders = computed(() =>
    orders.value
      .filter((o) => o.status === OrderStatus.SERVED)
      .sort((a, b) => a.queue_number - b.queue_number),
  );

  /**
   * The lowest queue_number among non-SERVED orders.
   * Used to determine which PREPARED orders can be served.
   */
  const lowestUnservedQueueNumber = computed(() => {
    const unserved = orders.value.filter((o) => o.status !== OrderStatus.SERVED);
    if (unserved.length === 0) return null;
    return Math.min(...unserved.map((o) => o.queue_number));
  });

  /**
   * Check if an order can be served.
   */
  function canServe(order: OrderWithItems): boolean {
    return order.status === OrderStatus.PREPARED || order.status === OrderStatus.PREPARING;
  }

  // ─── Actions ─────────────────────────────────────────

  function setOrders(newOrders: OrderWithItems[]) {
    orders.value = newOrders;
  }

  function upsertOrder(order: OrderWithItems) {
    const idx = orders.value.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      orders.value[idx] = order;
    } else {
      orders.value.push(order);
    }
  }

  function removeOrder(orderId: string) {
    orders.value = orders.value.filter((o) => o.id !== orderId);
  }

  return {
    orders,
    isLoading,
    queuedOrders,
    preparingOrders,
    preparedOrders,
    servedOrders,
    lowestUnservedQueueNumber,
    canServe,
    setOrders,
    upsertOrder,
    removeOrder,
  };
});
