import { ref, computed, type Ref } from 'vue';
import type { MenuItem, MenuCategory, OrderWithItems } from 'src/types/database';
import {
  extractRiceRequirementsFromOrders,
  type RiceRequirement,
} from 'src/utils/riceHelper';

export interface RiceOrderGroup {
  orderId: string;
  queueNumber: number;
  tableName: string;
  customerName?: string | null | undefined;
  orderStatus: string;
  queuedAt: string;
  items: RiceRequirement[];
  allCompleted: boolean;
}

const STORAGE_KEY = 'demo_delivery_completed_rice_ids';

function loadPersistedRiceCompletedIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useRiceStation(
  orders: Ref<OrderWithItems[]>,
  menuItemsMap: Ref<Map<string, MenuItem>>,
  categoriesMap: Ref<Map<string, MenuCategory>>,
) {
  const riceFilter = ref<'all' | 'pending' | 'completed'>('all');
  const completedRiceItemIds = ref<Set<string>>(new Set(loadPersistedRiceCompletedIds()));

  function persistRiceCompletedIds() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedRiceItemIds.value]));
    } catch (e) {
      console.error('Failed to save rice completed ids:', e);
    }
  }

  const allRiceRequirements = computed<RiceRequirement[]>(() => {
    return extractRiceRequirementsFromOrders(
      orders.value,
      menuItemsMap.value,
      categoriesMap.value,
    );
  });

  const pendingRiceRequirements = computed(() =>
    allRiceRequirements.value.filter((r) => !completedRiceItemIds.value.has(r.id)),
  );

  const completedRiceRequirements = computed(() =>
    allRiceRequirements.value.filter((r) => completedRiceItemIds.value.has(r.id)),
  );

  const pendingRiceCount = computed(() =>
    pendingRiceRequirements.value.reduce((sum, r) => sum + r.quantity, 0),
  );

  const groupedRiceOrders = computed<RiceOrderGroup[]>(() => {
    const list =
      riceFilter.value === 'pending'
        ? pendingRiceRequirements.value
        : riceFilter.value === 'completed'
          ? completedRiceRequirements.value
          : allRiceRequirements.value;

    const map = new Map<string, RiceOrderGroup>();

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
      if (!completedRiceItemIds.value.has(req.id)) {
        group.allCompleted = false;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.queueNumber - b.queueNumber);
  });

  function toggleRiceItem(reqId: string) {
    if (completedRiceItemIds.value.has(reqId)) {
      completedRiceItemIds.value.delete(reqId);
    } else {
      completedRiceItemIds.value.add(reqId);
    }
    completedRiceItemIds.value = new Set(completedRiceItemIds.value);
    persistRiceCompletedIds();
  }

  function toggleOrderAllRiceItems(orderId: string) {
    const orderReqs = allRiceRequirements.value.filter((r) => r.orderId === orderId);
    const allDone = orderReqs.every((r) => completedRiceItemIds.value.has(r.id));
    for (const req of orderReqs) {
      if (allDone) {
        completedRiceItemIds.value.delete(req.id);
      } else {
        completedRiceItemIds.value.add(req.id);
      }
    }
    completedRiceItemIds.value = new Set(completedRiceItemIds.value);
    persistRiceCompletedIds();
  }

  function clearCompletedRiceItems() {
    completedRiceItemIds.value = new Set();
    persistRiceCompletedIds();
  }

  return {
    riceFilter,
    completedRiceItemIds,
    allRiceRequirements,
    pendingRiceRequirements,
    completedRiceRequirements,
    pendingRiceCount,
    groupedRiceOrders,
    toggleRiceItem,
    toggleOrderAllRiceItems,
    clearCompletedRiceItems,
  };
}
