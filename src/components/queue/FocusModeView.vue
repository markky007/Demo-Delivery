<template>
  <div class="focus-mode-container animate-fade-in">
    <!-- Focus Navigation Bar -->
    <div class="focus-control-bar q-mb-md">
      <div class="row items-center justify-between wrap q-gutter-y-sm">
        <div class="row items-center q-gutter-x-sm">
          <span class="text-subtitle1 text-weight-bold text-ink">
            ออเดอร์ในครัวทั้งหมด
            <span class="text-primary font-mono q-ml-xs">({{ orders.length }})</span>
          </span>
        </div>

        <!-- Slide Navigation Counter & Arrow Controls -->
        <div v-if="orders.length > 0" class="row items-center q-gutter-sm">
          <span class="slide-counter-label text-body">
            หน้า <strong>{{ focusPage + 1 }}</strong> / <strong>{{ totalFocusPages }}</strong>
            <span class="text-caption text-muted q-ml-xs"> ({{ pageRangeText }}) </span>
          </span>

          <q-btn
            round
            dense
            unelevated
            icon="chevron_left"
            class="apple-circle-arrow-btn"
            :disable="focusPage === 0"
            @click="prevPage"
          >
            <q-tooltip>หน้าก่อนหน้า (ลูกศรซ้าย)</q-tooltip>
          </q-btn>

          <q-btn
            round
            dense
            unelevated
            icon="chevron_right"
            class="apple-circle-arrow-btn"
            :disable="focusPage >= totalFocusPages - 1"
            @click="nextPage"
          >
            <q-tooltip>หน้าถัดไป (ลูกศรขวา)</q-tooltip>
          </q-btn>
        </div>
      </div>

      <!-- Top Mini Thumbnails Strip for Quick Jump -->
      <div v-if="orders.length > 1" class="focus-thumbnails-strip q-mt-xs">
        <q-separator class="apple-hairline q-my-sm" />
        <div class="row items-center justify-between q-mb-xs">
          <div class="text-caption text-body text-weight-medium">
            แตะหมายเลขคิวเพื่อข้ามไปยังหน้านั้น:
          </div>
          <div class="text-caption text-muted">แสดงผลหน้าละสูงสุด 3 ออเดอร์</div>
        </div>
        <div class="thumbnails-scroll-row">
          <div
            v-for="ord in orders"
            :key="ord.id"
            class="mini-order-chip"
            :class="{
              'mini-order-chip--active': isOrderOnCurrentPage(ord.id),
              'mini-order-chip--queued': ord.status === OrderStatus.QUEUED,
              'mini-order-chip--preparing': ord.status === OrderStatus.PREPARING,
              'mini-order-chip--prepared': ord.status === OrderStatus.PREPARED,
            }"
            @click="jumpToOrder(ord.id)"
          >
            <div class="mini-chip-seq font-mono">{{ formatQueueNumber(ord.queue_number) }}</div>
            <div class="mini-chip-table ellipsis">{{ getOrderTableName(ord) }}</div>
            <div class="mini-chip-count font-mono">{{ ord.items?.length || 0 }} รายการ</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State in Focus Mode -->
    <div v-if="orders.length === 0" class="focus-empty-card">
      <div class="empty-icon-bubble q-mb-md">
        <q-icon name="soup_kitchen" size="48px" color="primary" />
      </div>
      <h5 class="q-my-none text-weight-bold text-ink">ไม่มีออเดอร์ที่ต้องทำในขณะนี้</h5>
      <p class="text-muted q-mt-xs q-mb-none">ครัวเคลียร์ออเดอร์เสร็จเรียบร้อยแล้ว</p>
    </div>

    <!-- Main Dynamic Kitchen Slips Carousel (1-3 orders per page) -->
    <div v-else class="focus-slider-wrapper">
      <q-carousel
        v-model="focusPage"
        swipeable
        animated
        transition-prev="slide-right"
        transition-next="slide-left"
        height="auto"
        class="focus-carousel bg-transparent"
      >
        <q-carousel-slide
          v-for="(pageOrders, pageIdx) in focusPages"
          :key="pageIdx"
          :name="pageIdx"
          class="q-pa-none"
        >
          <!-- Mount actual KitchenSlipCard components for current active slide and immediate adjacent slides -->
          <div
            v-if="Math.abs(pageIdx - focusPage) <= 1"
            class="kitchen-slips-container"
            :class="`kitchen-slips-container--count-${pageOrders.length}`"
          >
            <KitchenSlipCard
              v-for="order in pageOrders"
              :key="order.id"
              :order="order"
              :menu-items-map="menuItemsMap"
              :categories-map="categoriesMap"
              @edit="$emit('edit', $event)"
              @history="$emit('history', $event)"
              @advance-status="(id, status) => $emit('advance-status', id, status)"
              @toggle-item="(orderId, itemIds, isCompleted) => $emit('toggle-item', orderId, itemIds, isCompleted)"
            />
          </div>
          <!-- Lightweight placeholder for distant slides to avoid DOM explosion on iPad Safari -->
          <div
            v-else
            class="kitchen-slips-container kitchen-slips-container--placeholder"
            :class="`kitchen-slips-container--count-${pageOrders.length}`"
          >
            <div
              v-for="order in pageOrders"
              :key="order.id"
              class="slip-placeholder-card"
            ></div>
          </div>
        </q-carousel-slide>
      </q-carousel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { OrderStatus } from 'src/types/enums';
import type { OrderWithItems, MenuItem, MenuCategory } from 'src/types/database';
import { formatQueueNumber } from 'src/utils/formatters';
import { isTakeawayName } from 'src/services/tableService';
import KitchenSlipCard from './KitchenSlipCard.vue';

interface Props {
  orders: OrderWithItems[];
  menuItemsMap: Map<string, MenuItem>;
  categoriesMap: Map<string, MenuCategory>;
}

const props = defineProps<Props>();

defineEmits<{
  (e: 'edit', order: OrderWithItems): void;
  (e: 'history', order: OrderWithItems): void;
  (e: 'advance-status', orderId: string, newStatus: OrderStatus): void;
  (e: 'toggle-item', orderId: string, itemIds: string[], isCompleted: boolean): void;
}>();

const FOCUS_PAGE_SIZE = 3;
const focusPage = ref<number>(0);

const focusPages = computed<OrderWithItems[][]>(() => {
  const list = props.orders;
  if (list.length === 0) return [];
  if (list.length <= FOCUS_PAGE_SIZE) {
    return [list];
  }
  const pages: OrderWithItems[][] = [];
  for (let i = 0; i <= list.length - FOCUS_PAGE_SIZE; i++) {
    pages.push(list.slice(i, i + FOCUS_PAGE_SIZE));
  }
  return pages;
});

const totalFocusPages = computed(() => Math.max(1, focusPages.value.length));

// Keep focusPage within valid bounds
watch(
  focusPages,
  (newPages) => {
    if (newPages.length > 0) {
      if (focusPage.value >= newPages.length) {
        focusPage.value = Math.max(0, newPages.length - 1);
      }
    } else {
      focusPage.value = 0;
    }
  },
  { immediate: true },
);

function prevPage() {
  if (focusPage.value > 0) {
    focusPage.value--;
  }
}

function nextPage() {
  if (focusPage.value < focusPages.value.length - 1) {
    focusPage.value++;
  }
}

function jumpToOrder(orderId: string) {
  const orderIdx = props.orders.findIndex((o) => o.id === orderId);
  if (orderIdx !== -1 && focusPages.value.length > 0) {
    focusPage.value = Math.min(orderIdx, focusPages.value.length - 1);
  }
}

function isOrderOnCurrentPage(orderId: string): boolean {
  const curPage = focusPages.value[focusPage.value];
  return curPage ? curPage.some((o) => o.id === orderId) : false;
}

const pageRangeText = computed(() => {
  const total = props.orders.length;
  if (total === 0) return '0 ออเดอร์';
  const start = focusPage.value + 1;
  const end = Math.min(focusPage.value + FOCUS_PAGE_SIZE, total);
  if (start === end) {
    return `ออเดอร์ที่ ${start} จากทั้งหมด ${total}`;
  }
  return `ออเดอร์ที่ ${start} - ${end} จากทั้งหมด ${total}`;
});

function getOrderTableName(order: OrderWithItems): string {
  const rawName = order.table_session?.table?.name;
  const customerName = order.table_session?.customer_name;
  if (rawName) {
    if (isTakeawayName(rawName) && customerName) {
      return `กลับบ้าน (${customerName})`;
    }
    return rawName;
  }
  if (customerName) {
    return `กลับบ้าน (${customerName})`;
  }
  return 'หน้าร้าน / กลับบ้าน';
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') {
    prevPage();
  } else if (e.key === 'ArrowRight') {
    nextPage();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-body {
  color: var(--color-body, #414143);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

.font-mono {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.apple-hairline {
  background-color: var(--color-hairline, #d2d2d7);
  opacity: 0.6;
}

/* ─── VIEW 1: FOCUS MODE CONTAINER ────────────────────────── */
.focus-mode-container {
  max-width: 1440px;
  margin: 0 auto;
}

.focus-control-bar {
  background: #ffffff;
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
  padding: 12px 18px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.slide-counter-label {
  font-size: 0.88rem;
}

.apple-circle-arrow-btn {
  background: var(--color-surface-footer, #f5f5f7);
  color: var(--color-ink, #1d1d1f);
  border: 1px solid var(--color-hairline, #d2d2d7);
  width: 36px;
  height: 36px;
  transition: all 0.18s ease;
}

.apple-circle-arrow-btn:not([disabled]):hover {
  background: var(--color-primary, #0071e3);
  color: #ffffff;
  border-color: var(--color-primary, #0071e3);
}

/* Thumbnails Strip */
.focus-thumbnails-strip {
  width: 100%;
}

.thumbnails-scroll-row {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.mini-order-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 11px;
  padding: 6px 12px;
  min-width: 90px;
  max-width: 130px;
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
}

.mini-order-chip:hover {
  background: #ffffff;
  border-color: var(--color-primary, #0071e3);
  transform: translateY(-1px);
}

.mini-order-chip--active {
  background: #ffffff;
  border: 2px solid var(--color-primary, #0071e3) !important;
  box-shadow: 0 2px 8px rgba(0, 113, 227, 0.18);
}

.mini-chip-seq {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--color-ink-strong, #000000);
}

.mini-chip-table {
  font-size: 0.75rem;
  color: var(--color-body, #414143);
  font-weight: 600;
  width: 100%;
}

.mini-chip-count {
  font-size: 0.7rem;
  color: var(--color-muted, #6e6e73);
}

/* Status side-indicator border */
.mini-order-chip--queued {
  border-left: 3px solid var(--color-primary, #0071e3);
}

.mini-order-chip--preparing {
  border-left: 3px solid #d97706;
}

.mini-order-chip--prepared {
  border-left: 3px solid #16a34a;
}

/* Empty Card */
.focus-empty-card {
  background: #ffffff;
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
  padding: 48px 24px;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.empty-icon-bubble {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(0, 113, 227, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Dynamic Kitchen Slips Layout Grid */
.kitchen-slips-container {
  display: grid;
  gap: 18px;
  width: 100%;
  align-items: stretch;
}

.kitchen-slips-container--count-1 {
  grid-template-columns: minmax(0, 1fr);
  max-width: 520px;
  margin: 0 auto;
}

.kitchen-slips-container--count-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 1040px;
  margin: 0 auto;
}

.kitchen-slips-container--count-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-width: 1440px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .kitchen-slips-container--count-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .kitchen-slips-container--count-2,
  .kitchen-slips-container--count-3 {
    grid-template-columns: minmax(0, 1fr);
  }
}

.slip-placeholder-card {
  min-height: 470px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  border: 1px dashed var(--color-hairline, #d2d2d7);
}
</style>
