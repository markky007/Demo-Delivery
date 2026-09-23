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

  /**
   * Optimistically update order item checklist status in-place.
   * Eliminates UI re-render storms and provides 0ms response.
   */
  function setItemCompleted(orderId: string, itemIds: string[], isCompleted: boolean) {
    const targetOrder = orders.value.find((o) => o.id === orderId);
    if (!targetOrder || !targetOrder.items) return;

    let modified = false;
    for (const item of targetOrder.items) {
      if (itemIds.includes(item.id)) {
        item.is_completed = isCompleted;
        item.completed_at = isCompleted ? new Date().toISOString() : null;
        modified = true;
      }
    }

    if (modified) {
      targetOrder.updated_at = new Date().toISOString();
    }
  }

  /**
   * Optimistically update order status for instant UI transitions (0ms response).
   */
  function updateOrderStatusOptimistic(orderId: string, newStatus: OrderStatus) {
    const targetOrder = orders.value.find((o) => o.id === orderId);
    if (!targetOrder) return;

    targetOrder.status = newStatus;
    const nowIso = new Date().toISOString();

    if (newStatus === OrderStatus.PREPARING && !targetOrder.preparing_at) {
      targetOrder.preparing_at = nowIso;
    } else if (newStatus === OrderStatus.PREPARED && !targetOrder.prepared_at) {
      targetOrder.prepared_at = nowIso;
    } else if (newStatus === OrderStatus.SERVED && !targetOrder.served_at) {
      targetOrder.served_at = nowIso;
    }
    targetOrder.updated_at = nowIso;
  }

  /**
   * Patch order details in-place without replacing the whole array.
   */
  function patchOrder(orderId: string, partial: Partial<OrderWithItems>) {
    const targetOrder = orders.value.find((o) => o.id === orderId);
    if (!targetOrder) return;
    Object.assign(targetOrder, partial);
    targetOrder.updated_at = new Date().toISOString();
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
    setItemCompleted,
    updateOrderStatusOptimistic,
    patchOrder,
  };
});
