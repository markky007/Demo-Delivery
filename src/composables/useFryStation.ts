import { ref, computed, type Ref } from 'vue';
import type { MenuItem, OrderWithItems } from 'src/types/database';
import { extractFryRequirementsFromOrders, type FryRequirement } from 'src/utils/fryHelper';

export interface FryOrderGroup {
  orderId: string;
  queueNumber: number;
  tableName: string;
  customerName?: string | null | undefined;
  orderStatus: string;
  queuedAt: string;
  items: FryRequirement[];
  allCompleted: boolean;
}

const STORAGE_KEY = 'demo_delivery_completed_fry_ids';

function loadPersistedFryCompletedIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useFryStation(
  orders: Ref<OrderWithItems[]>,
  menuItemsMap: Ref<Map<string, MenuItem>>,
) {
  const fryFilter = ref<'all' | 'pending' | 'completed'>('all');
  const completedFryItemIds = ref<Set<string>>(new Set(loadPersistedFryCompletedIds()));

  function persistFryCompletedIds() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedFryItemIds.value]));
    } catch (e) {
      console.error('Failed to save fry completed ids:', e);
    }
  }

  const allFryRequirements = computed<FryRequirement[]>(() => {
    return extractFryRequirementsFromOrders(orders.value, menuItemsMap.value);
  });

  const pendingFryRequirements = computed(() =>
    allFryRequirements.value.filter((r) => !completedFryItemIds.value.has(r.id)),
  );

  const completedFryRequirements = computed(() =>
    allFryRequirements.value.filter((r) => completedFryItemIds.value.has(r.id)),
  );

  const pendingFryCount = computed(() =>
    pendingFryRequirements.value.reduce((sum, r) => sum + r.quantity, 0),
  );

  const groupedFryOrders = computed<FryOrderGroup[]>(() => {
    const list =
      fryFilter.value === 'pending'
        ? pendingFryRequirements.value
        : fryFilter.value === 'completed'
          ? completedFryRequirements.value
          : allFryRequirements.value;

    const map = new Map<string, FryOrderGroup>();

    for (const req of list) {
      if (!map.has(req.orderId)) {
        map.set(req.orderId, {
          orderId: req.orderId,
          queueNumber: req.queueNumber,
          tableName: req.tableName,
          customerName: req.customerName,
          orderStatus: req.orderStatus,
          queuedAt: req.queuedAt,
          items: [],
          allCompleted: true,
        });
      }
      const group = map.get(req.orderId)!;
      group.items.push(req);
      if (!completedFryItemIds.value.has(req.id)) {
        group.allCompleted = false;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.queueNumber - b.queueNumber);
  });

  function toggleFryItem(reqId: string) {
    if (completedFryItemIds.value.has(reqId)) {
      completedFryItemIds.value.delete(reqId);
    } else {
      completedFryItemIds.value.add(reqId);
    }
    completedFryItemIds.value = new Set(completedFryItemIds.value);
    persistFryCompletedIds();
  }

  function toggleOrderAllFryItems(orderId: string) {
    const orderReqs = allFryRequirements.value.filter((r) => r.orderId === orderId);
    const allDone = orderReqs.every((r) => completedFryItemIds.value.has(r.id));
    for (const req of orderReqs) {
      if (allDone) {
        completedFryItemIds.value.delete(req.id);
      } else {
        completedFryItemIds.value.add(req.id);
      }
    }
    completedFryItemIds.value = new Set(completedFryItemIds.value);
    persistFryCompletedIds();
  }

  function clearCompletedFryItems() {
    completedFryItemIds.value = new Set();
    persistFryCompletedIds();
  }

  return {
    fryFilter,
    completedFryItemIds,
    allFryRequirements,
    pendingFryRequirements,
    completedFryRequirements,
    pendingFryCount,
    groupedFryOrders,
    toggleFryItem,
    toggleOrderAllFryItems,
    clearCompletedFryItems,
  };
}
