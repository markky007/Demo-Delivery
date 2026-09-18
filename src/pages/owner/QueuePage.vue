<template>
  <q-page class="queue-page q-pa-md">
    <!-- Loading Skeleton -->
    <LoadingSkeleton v-if="isLoading" type="queue" />

    <template v-else>
      <!-- Queue Header Bar & View Switcher -->
      <QueueHeader
        v-model:view-mode="viewMode"
        :active-orders-count="activeKitchenOrders.length"
        :pending-fry-count="pendingFryCount"
        :pending-rice-count="pendingRiceCount"
      />

      <!-- Station Views -->
      <!-- VIEW 1: FOCUS COOK SLIP MODE -->
      <FocusModeView
        v-if="viewMode === 'focus'"
        :orders="activeKitchenOrders"
        :menu-items-map="menuItemsMap"
        :categories-map="categoriesMap"
        @edit="openEditOrderDialog"
        @history="openOrderHistoryDialog"
        @advance-status="advanceStatusAndProceed"
      />

      <!-- VIEW 2: FRY STATION MODE -->
      <FryStationView
        v-else-if="viewMode === 'fry'"
        :orders="queueStore.orders"
        :menu-items-map="menuItemsMap"
      />

      <!-- VIEW 3: RICE STATION MODE -->
      <RiceStationView
        v-else-if="viewMode === 'rice'"
        :orders="queueStore.orders"
        :menu-items-map="menuItemsMap"
        :categories-map="categoriesMap"
      />

      <!-- Kitchen Order Edit Dialog -->
      <EditOrderModal
        v-if="editingOrder"
        v-model="showEditModal"
        :order="editingOrder"
        :is-kitchen="true"
        @saved="onOrderEdited"
      />

      <!-- Order Revision History Modal -->
      <OrderHistoryModal
        v-if="historyOrder"
        v-model="showHistoryModal"
        :order-id="historyOrder.id"
        :queue-number="historyOrder.queue_number"
      />
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, toRef, onMounted, onUnmounted } from 'vue';
import { useQueueStore } from 'src/stores/queueStore';
import { useMenuStore } from 'src/stores/menuStore';
import { useNotify } from 'src/composables/useNotify';
import { useFryStation } from 'src/composables/useFryStation';
import { useRiceStation } from 'src/composables/useRiceStation';
import { useElapsedTimer } from 'src/composables/useElapsedTimer';
import { fetchTodayOrders, advanceOrderStatus } from 'src/services/orderService';
import { supabase } from 'src/services/supabase';
import { formatQueueNumber, formatPrice } from 'src/utils/formatters';
import { isTakeawayName } from 'src/services/tableService';
import { OrderStatus } from 'src/types/enums';
import type { OrderWithItems } from 'src/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { playNewOrderChime, playStatusDoneChime } from 'src/utils/audioService';

import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import EditOrderModal from 'src/components/EditOrderModal.vue';
import OrderHistoryModal from 'src/components/OrderHistoryModal.vue';
import QueueHeader from 'src/components/queue/QueueHeader.vue';
import FocusModeView from 'src/components/queue/FocusModeView.vue';
import FryStationView from 'src/components/queue/FryStationView.vue';
import RiceStationView from 'src/components/queue/RiceStationView.vue';

const queueStore = useQueueStore();
const menuStore = useMenuStore();
const { notifySuccess, notifyError, notifyWarning } = useNotify();
const { release: releaseElapsedTimer } = useElapsedTimer();

const isLoading = ref(true);
const viewMode = ref<'focus' | 'fry' | 'rice'>('focus');

const menuItemsMap = computed(() => new Map(menuStore.items.map((i) => [i.id, i])));
const categoriesMap = computed(() => new Map(menuStore.categories.map((c) => [c.id, c])));

// Active kitchen orders (QUEUED + PREPARING + PREPARED)
const activeKitchenOrders = computed(() => {
  return queueStore.orders
    .filter(
      (o) =>
        o.status === OrderStatus.QUEUED ||
        o.status === OrderStatus.PREPARING ||
        o.status === OrderStatus.PREPARED,
    )
    .sort((a, b) => a.queue_number - b.queue_number);
});

// Stations composables to track badge counts
const ordersRef = toRef(queueStore, 'orders');
const { pendingFryCount } = useFryStation(ordersRef, menuItemsMap);
const { pendingRiceCount } = useRiceStation(ordersRef, menuItemsMap, categoriesMap);

// Edit & History Modal States
const showEditModal = ref(false);
const editingOrder = ref<OrderWithItems | null>(null);

const showHistoryModal = ref(false);
const historyOrder = ref<OrderWithItems | null>(null);

function openEditOrderDialog(order: OrderWithItems) {
  editingOrder.value = order;
  showEditModal.value = true;
}

function openOrderHistoryDialog(order: OrderWithItems) {
  historyOrder.value = order;
  showHistoryModal.value = true;
}

async function onOrderEdited() {
  const orders = await fetchTodayOrders();
  queueStore.setOrders(orders);
  if (editingOrder.value) {
    const updated = orders.find((o) => o.id === editingOrder.value?.id);
    if (updated) {
      editingOrder.value = updated;
    }
  }
}

function getTableName(order: OrderWithItems): string {
  const rawName = order.table_session?.table?.name;
  const customerName = order.table_session?.customer_name;
  if (rawName) {
    if (isTakeawayName(rawName) && customerName) {
      return `สั่งกลับบ้าน (${customerName})`;
    }
    return rawName;
  }
  if (customerName) {
    return `สั่งกลับบ้าน (${customerName})`;
  }
  return 'หน้าร้าน / กลับบ้าน';
}

// Track known order revisions to detect actual customer edits
const knownRevisions = new Map<string, number>();

function updateKnownRevisions(orders: { id: string; revision?: number }[]) {
  knownRevisions.clear();
  for (const o of orders) {
    if (o.revision !== undefined) {
      knownRevisions.set(o.id, o.revision);
    }
  }
}

// Realtime Channel & Debounced Reload
let realtimeChannel: RealtimeChannel | null = null;
let reloadTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedOrdersReload(onFinish?: (orders: OrderWithItems[]) => void, delayMs = 250) {
  if (reloadTimeout) clearTimeout(reloadTimeout);
  reloadTimeout = setTimeout(() => {
    void (async () => {
      try {
        const orders = await fetchTodayOrders();
        queueStore.setOrders(orders);
        onFinish?.(orders);
      } catch (e) {
        console.error('Failed to reload orders:', e);
      }
    })();
  }, delayMs);
}

onMounted(async () => {
  void menuStore.loadMenu();

  try {
    const orders = await fetchTodayOrders();
    queueStore.setOrders(orders);
    updateKnownRevisions(orders);
  } finally {
    isLoading.value = false;
  }

  realtimeChannel = supabase
    .channel('orders:kitchen_queue')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
      },
      (payload) => {
        const prevRevisions = new Map(knownRevisions);

        debouncedOrdersReload((orders) => {
          updateKnownRevisions(orders);

          if (payload.eventType === 'INSERT') {
            const insertedId = (payload.new as { id?: string })?.id;
            const newOrder = orders.find((o) => o.id === insertedId);
            if (newOrder && newOrder.status !== OrderStatus.SERVED) {
              const tableName = getTableName(newOrder);
              const queueNumber = newOrder.queue_number;
              const qNumStr = formatQueueNumber(queueNumber);
              const itemCount =
                newOrder.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) ||
                newOrder.items?.length ||
                1;
              const priceText = newOrder.total_amount
                ? ` • ยอดรวม ${formatPrice(newOrder.total_amount)}`
                : '';

              playNewOrderChime(undefined, { tableName, queueNumber });
              notifySuccess(`คิว ${qNumStr} • ${tableName}`, {
                title: '🔔 มีออเดอร์ใหม่เข้ามา!',
                caption: `${itemCount} รายการอาหาร${priceText}`,
                timeout: 6000,
              });
            }
          }

          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as {
              id?: string;
              revision?: number;
              status?: OrderStatus;
            };
            const prevRevision = newData.id ? (prevRevisions.get(newData.id) ?? 1) : 1;
            if (newData.revision && newData.revision > 1 && newData.revision > prevRevision) {
              const updatedOrder = orders.find((o) => o.id === newData.id);
              const tableName = updatedOrder ? getTableName(updatedOrder) : 'ออเดอร์';
              const qNumStr = updatedOrder ? formatQueueNumber(updatedOrder.queue_number) : '';

              playNewOrderChime(undefined, 'ลูกค้ามีการแก้ไขรายการอาหาร');
              notifyWarning(`คิว ${qNumStr} (${tableName}) มีการปรับเปลี่ยนรายการ`, {
                title: '⚠️ ลูกค้าแก้ไขออเดอร์',
                caption: 'กรุณาตรวจสอบจำนวนหรือตัวเลือกที่มีการเปลี่ยนแปลงในครัว',
                timeout: 6000,
              });
            }
            if (newData.status === OrderStatus.PREPARED) {
              playStatusDoneChime();
            }
          }
        });
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'table_sessions',
      },
      () => {
        debouncedOrdersReload();
      },
    )
    .subscribe();
});

onUnmounted(() => {
  if (realtimeChannel) {
    void supabase.removeChannel(realtimeChannel);
  }
  if (reloadTimeout) {
    clearTimeout(reloadTimeout);
  }
  releaseElapsedTimer();
});

async function advanceStatus(orderId: string, newStatus: OrderStatus) {
  try {
    const targetOrder = queueStore.orders.find((o) => o.id === orderId);
    const tableName = targetOrder ? getTableName(targetOrder) : '';
    const qNumStr = targetOrder ? formatQueueNumber(targetOrder.queue_number) : '';

    await advanceOrderStatus(orderId, newStatus);

    if (newStatus === OrderStatus.PREPARING) {
      notifySuccess(`โต๊ะ: ${tableName || 'สั่งกลับบ้าน'}`, {
        title: `รับออเดอร์แล้ว 🔥 • คิว ${qNumStr}`,
        caption: 'เริ่มขั้นตอนเตรียมและปรุงอาหารตามลำดับ',
        timeout: 4000,
      });
    } else if (newStatus === OrderStatus.PREPARED) {
      notifySuccess(`พร้อมเสิร์ฟที่ ${tableName || 'จุดรับอาหารกลับบ้าน'}`, {
        title: `เตรียมอาหารเสร็จแล้ว ✅ • คิว ${qNumStr}`,
        caption: 'กรุณานำอาหารไปเสิร์ฟให้ลูกค้า',
        timeout: 4500,
      });
    } else if (newStatus === OrderStatus.SERVED) {
      notifySuccess(`คิว ${qNumStr} (${tableName || 'สั่งกลับบ้าน'})`, {
        title: 'ส่งออเดอร์เรียบร้อยแล้ว 🍽️',
        caption: 'เสร็จสิ้นขั้นตอนและปิดงานในครัวของออเดอร์นี้',
        timeout: 4000,
      });
    } else {
      notifySuccess('อัปเดตสถานะสำเร็จ', {
        title: `คิว ${qNumStr}`,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะได้';
    notifyError(msg, {
      title: 'อัปเดตสถานะไม่สำเร็จ',
    });
  }
}

async function advanceStatusAndProceed(orderId: string, newStatus: OrderStatus) {
  await advanceStatus(orderId, newStatus);
  if (newStatus === OrderStatus.PREPARED || newStatus === OrderStatus.SERVED) {
    playStatusDoneChime();
  }
}
</script>

<style scoped>
.queue-page {
  background: var(--color-background, #fbf9f6);
  min-height: 100vh;
}
</style>
