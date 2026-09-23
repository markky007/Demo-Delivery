<template>
  <div
    class="kitchen-order-card"
    :class="{
      'kitchen-order-card--queued': order.status === OrderStatus.QUEUED,
      'kitchen-order-card--preparing': order.status === OrderStatus.PREPARING,
      'kitchen-order-card--prepared': order.status === OrderStatus.PREPARED,
      'kitchen-order-card--all-done': isAllCompleted,
    }"
  >
    <!-- Top Status Accent Stripe -->
    <div
      class="status-accent-stripe"
      :class="`status-accent-stripe--${order.status.toLowerCase()}`"
    ></div>

    <!-- 1. Header Section -->
    <div class="card-header">
      <!-- Row 1: Destination (Hero Table / Takeaway) & Queue # & Edit Action -->
      <div class="row items-center justify-between no-wrap q-mb-sm">
        <div class="row items-center no-wrap q-gutter-x-sm">
          <!-- Hero Table / Takeaway Badge -->
          <div
            class="destination-badge"
            :class="{ 'destination-badge--takeaway': isTakeaway }"
          >
            <q-icon
              :name="isTakeaway ? 'shopping_bag' : 'table_restaurant'"
              size="18px"
              class="q-mr-xs destination-icon"
            />
            <span class="destination-text ellipsis">{{ tableName }}</span>
          </div>

          <!-- Queue Number Badge -->
          <div class="queue-badge font-mono">
            <span class="queue-prefix">คิว</span>
            <span class="queue-num">{{ formatQueueNumber(order.queue_number) }}</span>
          </div>
        </div>

        <!-- Edit Order Action Button -->
        <button
          type="button"
          class="btn-edit-action"
          @click.stop="$emit('edit', order)"
        >
          <q-icon name="edit_note" size="17px" class="q-mr-xs" />
          <span>แก้ไข</span>
          <q-tooltip anchor="top middle" self="bottom middle">แก้ไขรายการอาหาร</q-tooltip>
        </button>
      </div>

      <!-- Row 2: Status Pill & Time Meta (Order Time & Live Timer) -->
      <div class="row items-center justify-between no-wrap meta-row">
        <!-- Status Stamp Pill -->
        <div
          class="status-pill"
          :class="`status-pill--${order.status.toLowerCase()}`"
        >
          <q-icon :name="statusIcon" size="15px" class="q-mr-xs" />
          <span>{{ statusLabel }}</span>
        </div>

        <!-- Order Time & Elapsed Counter -->
        <div class="row items-center no-wrap q-gutter-x-xs time-meta-box">
          <div class="row items-center text-caption text-secondary no-wrap">
            <q-icon name="schedule" size="14px" class="q-mr-xs text-muted" />
            <span>{{ formatTime(order.created_at) }}</span>
          </div>
          <span class="time-divider">•</span>
          <div class="timer-badge" :class="timerClass">
            <q-icon name="timer" size="13px" class="q-mr-xs" />
            <span class="font-mono">รอ {{ elapsedText }}</span>
          </div>
        </div>
      </div>

      <!-- Customer Revision Banner (v2, v3...) -->
      <div
        v-if="order.revision && order.revision > 1"
        class="revision-alert-banner q-mt-sm row items-center justify-between no-wrap"
      >
        <div class="row items-center no-wrap text-caption text-weight-medium">
          <q-icon name="notifications_active" size="15px" class="q-mr-xs text-amber-9" />
          <span>มีการแก้ไข: เวอร์ชัน {{ order.revision }}</span>
        </div>
        <button
          type="button"
          class="btn-revision-history"
          @click.stop="$emit('history', order)"
        >
          <q-icon name="history" size="14px" class="q-mr-xs" />
          <span>ประวัติ</span>
        </button>
      </div>
    </div>

    <div class="card-divider"></div>

    <!-- 2. Items List & Interactive Checklist Section -->
    <div class="card-body">
      <!-- Items Summary & Checklist Progress Bar -->
      <div class="items-summary-header row items-center justify-between no-wrap q-mb-sm">
        <div class="row items-center no-wrap q-gutter-x-xs">
          <span class="text-caption text-weight-bold text-ink">รายการอาหาร</span>
          <span class="items-total-pill font-mono">{{ consolidatedCount }}</span>
        </div>

        <!-- Checklist Completion Progress Indicator -->
        <div class="checklist-progress-wrap row items-center no-wrap q-gutter-x-xs">
          <div
            class="checklist-progress-pill"
            :class="{ 'checklist-progress-pill--all': isAllCompleted }"
          >
            <q-icon
              :name="isAllCompleted ? 'check_circle' : 'checklist'"
              size="13px"
              class="q-mr-xs"
            />
            <span class="font-mono">{{ completedItemsCount }}/{{ consolidatedCount }} เสร็จ</span>
          </div>
        </div>
      </div>

      <!-- Mini Progress Track -->
      <div class="progress-track-bar q-mb-md">
        <div
          class="progress-fill-bar"
          :style="{ width: `${progressPercentage}%` }"
          :class="{ 'progress-fill-bar--done': isAllCompleted }"
        ></div>
      </div>

      <!-- Grouped Order Items (e.g. อาหาร, ยำ/ต้ม) -->
      <div class="dishes-list">
        <div
          v-for="group in orderGroups"
          :key="group.key"
          class="station-group"
        >
          <!-- Station Sub-header (อาหาร หรือ ยำ/ต้ม) -->
          <div class="station-divider row items-center no-wrap q-mb-xs">
            <div class="station-pill" :class="`station-pill--${group.key}`">
              <q-icon :name="group.icon" size="14px" class="q-mr-xs" />
              <span>{{ group.label }}</span>
            </div>
            <div class="station-rule col q-ml-sm"></div>
          </div>

          <!-- Dishes under this station -->
          <div class="dishes-group-items">
            <div
              v-for="(item, idx) in group.items"
              :key="getItemKey(item, idx)"
              class="dish-row"
              :class="{
                'dish-row--checked': item.is_completed,
                'dish-row--multi-qty': (item.quantity || 1) > 1,
              }"
              @click="handleItemClick(item)"
            >
              <div class="row items-start justify-between no-wrap">
                <!-- Checkbox + Title + Modifiers -->
                <div class="row items-start no-wrap col q-pr-sm">
                  <!-- Interactive Checkbox -->
                  <div
                    class="dish-checkbox"
                    :class="{ 'dish-checkbox--active': item.is_completed }"
                  >
                    <q-icon
                      v-if="item.is_completed"
                      name="check"
                      size="14px"
                    />
                  </div>

                  <!-- Dish Details -->
                  <div class="dish-details col min-width-0">
                    <div class="dish-title-text" :class="{ 'dish-title-text--done': item.is_completed }">
                      {{ item.snapshot_name }}
                    </div>

                    <!-- Option Badges -->
                    <div
                      v-if="item.options && getVisibleOptions(item.options).length > 0"
                      class="dish-options-wrap"
                    >
                      <span
                        v-for="opt in getVisibleOptions(item.options)"
                        :key="opt.id"
                        class="dish-opt-pill"
                        :class="`dish-opt-pill--${getOptionCategory(opt.snapshot_option_name)}`"
                      >
                        <q-icon
                          v-if="getOptionIconName(opt.snapshot_option_name)"
                          :name="getOptionIconName(opt.snapshot_option_name)!"
                          size="13px"
                          class="dish-opt-icon"
                        />
                        <span
                          v-else-if="getOptionPrefixType(opt.snapshot_option_name) === 'plus'"
                          class="dish-opt-plus"
                        >+</span>
                        <span class="dish-opt-text">{{ getOptionCleanLabel(opt.snapshot_option_name) }}</span>
                      </span>
                    </div>

                    <!-- Special Cooking Instruction (Customer Note) -->
                    <div v-if="item.special_instruction" class="special-instruction-card q-mt-xs">
                      <q-icon name="campaign" size="15px" class="q-mr-xs note-icon" />
                      <span class="note-text">{{ item.special_instruction }}</span>
                    </div>
                  </div>
                </div>

                <!-- Quantity Badge -->
                <div
                  class="dish-qty-box font-mono"
                  :class="{
                    'dish-qty-box--multi': (item.quantity || 1) > 1,
                    'dish-qty-box--done': item.is_completed,
                  }"
                >
                  <span class="qty-number">{{ item.quantity }}</span>
                  <span class="qty-times">×</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Footer Action Section -->
    <div class="card-footer">
      <div class="card-divider q-mb-sm"></div>

      <!-- Ready Banner Notification when all items are checked -->
      <div
        v-if="isAllCompleted && (order.status === OrderStatus.PREPARING || order.status === OrderStatus.QUEUED)"
        class="ready-celebration-banner row items-center justify-center no-wrap q-mb-sm"
      >
        <q-icon name="check_circle" size="16px" class="q-mr-xs text-emerald-6" />
        <span>ปรุงเสร็จครบทุกรายการแล้ว พร้อมจัดส่ง!</span>
      </div>

      <!-- Status Action Button -->
      <!-- Step 1: QUEUED -> กดรับออเดอร์ (เริ่มปรุง) -->
      <q-btn
        v-if="order.status === OrderStatus.QUEUED"
        unelevated
        no-caps
        class="full-width action-btn action-btn--start"
        @click="$emit('advance-status', order.id, OrderStatus.PREPARING)"
      >
        <q-icon name="soup_kitchen" size="20px" class="q-mr-sm" />
        <span>กดรับออเดอร์ (เริ่มปรุง)</span>
      </q-btn>

      <!-- Step 2: PREPARING or PREPARED -> กดส่งออเดอร์ (เสร็จสิ้น) -->
      <q-btn
        v-else-if="order.status === OrderStatus.PREPARING || order.status === OrderStatus.PREPARED"
        unelevated
        no-caps
        class="full-width action-btn action-btn--serve"
        :class="{ 'action-btn--pulse': isAllCompleted }"
        @click="$emit('advance-status', order.id, OrderStatus.SERVED)"
      >
        <q-icon name="check_circle" size="20px" class="q-mr-sm" />
        <span class="ellipsis">กดส่งออเดอร์ไป {{ tableName }}</span>
      </q-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { OrderStatus } from 'src/types/enums';
import type { OrderWithItems, MenuItem, MenuCategory } from 'src/types/database';
import {
  formatQueueNumber,
  formatTime,
  getVisibleOptions,
  consolidateOrderItems,
  groupOrderItemsForKitchen,
} from 'src/utils/formatters';
import { isTakeawayName } from 'src/services/tableService';
import { useElapsedTimer } from 'src/composables/useElapsedTimer';
import { playStatusDoneChime } from 'src/utils/audioService';

interface Props {
  order: OrderWithItems;
  menuItemsMap: Map<string, MenuItem>;
  categoriesMap: Map<string, MenuCategory>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'edit', order: OrderWithItems): void;
  (e: 'history', order: OrderWithItems): void;
  (e: 'advance-status', orderId: string, newStatus: OrderStatus): void;
  (e: 'toggle-item', orderId: string, itemIds: string[], isCompleted: boolean): void;
}>();

const { formatElapsed, getTimerColorClass } = useElapsedTimer();

// ─── Interactive Dish Checklist State & Key Helpers ─────────
function getItemKey(
  item: { id?: string; item_ids?: string[]; snapshot_name?: string },
  idx: number,
): string {
  if (item.item_ids && item.item_ids.length > 0) {
    return `${props.order.id}_${item.item_ids.join('_')}`;
  }
  if (item.id) {
    return `${props.order.id}_${item.id}`;
  }
  return `${props.order.id}_item_${idx}_${item.snapshot_name || ''}`;
}

function handleItemClick(item: {
  id?: string;
  item_ids?: string[];
  is_completed?: boolean;
}) {
  const targetIds =
    item.item_ids && item.item_ids.length > 0 ? item.item_ids : item.id ? [item.id] : [];
  if (targetIds.length === 0) return;
  const nextCompleted = !item.is_completed;
  emit('toggle-item', props.order.id, targetIds, nextCompleted);
}

// ─── Table & Order Computed Info ────────────────────────────
const tableName = computed(() => {
  const rawName = props.order.table_session?.table?.name;
  const customerName = props.order.table_session?.customer_name;

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
});

const isTakeaway = computed(() => isTakeawayName(tableName.value));

const statusLabel = computed(() => {
  switch (props.order.status) {
    case OrderStatus.QUEUED:
      return 'รอรับออเดอร์';
    case OrderStatus.PREPARING:
      return 'กำลังปรุงอาหาร';
    case OrderStatus.PREPARED:
      return 'เตรียมเสร็จแล้ว';
    case OrderStatus.SERVED:
      return 'ส่งออเดอร์แล้ว';
    default:
      return props.order.status;
  }
});

const statusIcon = computed(() => {
  switch (props.order.status) {
    case OrderStatus.QUEUED:
      return 'schedule';
    case OrderStatus.PREPARING:
      return 'soup_kitchen';
    case OrderStatus.PREPARED:
      return 'check_circle';
    case OrderStatus.SERVED:
      return 'done_all';
    default:
      return 'info';
  }
});

const elapsedText = computed(() => formatElapsed(props.order.created_at));
const timerClass = computed(() => getTimerColorClass(props.order.created_at));

const consolidatedItems = computed(() => consolidateOrderItems(props.order.items));
const consolidatedCount = computed(() => consolidatedItems.value.length);

const orderGroups = computed(() => {
  return groupOrderItemsForKitchen(
    consolidatedItems.value,
    props.menuItemsMap,
    props.categoriesMap,
  );
});

// Checklist progress computed directly from item states
const completedItemsCount = computed(() => {
  return consolidatedItems.value.filter((item) => Boolean(item.is_completed)).length;
});

const progressPercentage = computed(() => {
  if (consolidatedCount.value === 0) return 0;
  return Math.min(100, Math.round((completedItemsCount.value / consolidatedCount.value) * 100));
});

const isAllCompleted = computed(() => {
  return consolidatedCount.value > 0 && completedItemsCount.value === consolidatedCount.value;
});

// Play audio chime when an order's items all transition to completed
watch(isAllCompleted, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    try {
      playStatusDoneChime();
    } catch {
      // Audio autoplay policy fallback
    }
  }
});

// ─── Option Formatting Helpers ──────────────────────────────
function getOptionCategory(optName?: string | null): string {
  if (!optName) return 'addon';
  const name = optName.toLowerCase().trim();
  if (
    name.includes('เผ็ด') ||
    name.includes('พริก') ||
    name.includes('spicy') ||
    name.includes('chili')
  ) {
    return 'spicy';
  }
  if (name.includes('ไข่') || name.includes('egg')) {
    return 'egg';
  }
  if (
    name.includes('พิเศษ') ||
    name.includes('จัมโบ้') ||
    name.includes('extra') ||
    name.includes('special') ||
    name.includes('large')
  ) {
    return 'special';
  }
  if (
    name.includes('ใส่กล่อง') ||
    name.includes('แยกน้ำ') ||
    name.includes('แยกข้าว') ||
    name.includes('กลับบ้าน')
  ) {
    return 'takeaway';
  }
  if (name.includes('หวาน') || name.includes('sweet') || name.includes('sugar')) {
    return 'sweet';
  }
  return 'addon';
}

function getOptionIconName(optName?: string | null): string | null {
  const category = getOptionCategory(optName);
  switch (category) {
    case 'spicy':
      return 'local_fire_department';
    case 'special':
      return 'star';
    case 'takeaway':
      return 'shopping_bag';
    case 'sweet':
      return 'water_drop';
    default:
      return null; // Both egg and standard addons use clean "+" prefix!
  }
}

function getOptionCleanLabel(optName?: string | null): string {
  if (!optName) return '';
  return optName.replace(/^([^\p{L}\p{N}]|\s)+/gu, '').trim() || optName;
}

function getOptionPrefixType(optName?: string | null): 'plus' | 'none' {
  if (!optName) return 'plus';
  const category = getOptionCategory(optName);
  if (category === 'egg' || category === 'addon') {
    const clean = getOptionCleanLabel(optName);
    if (
      clean.startsWith('ไม่') ||
      clean.startsWith('แยก') ||
      clean.startsWith('ลด') ||
      clean.startsWith('งด')
    ) {
      return 'none';
    }
    return 'plus';
  }
  return 'none';
}
</script>

<style scoped>
.font-mono {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.text-ink {
  color: #1e293b;
}

.text-secondary {
  color: #64748b;
}

.text-muted {
  color: #94a3b8;
}

/* ==========================================================
   MODERN DIGITAL KDS CARD (Apple / Square POS Minimalist Style)
   ========================================================== */

.kitchen-order-card {
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.04),
    0 10px 24px -3px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition:
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.2s ease;
  min-height: 470px;
  margin-bottom: 16px;
}

.kitchen-order-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 16px -2px rgba(0, 0, 0, 0.06),
    0 16px 32px -4px rgba(0, 0, 0, 0.08);
}

.kitchen-order-card--all-done {
  border-color: #86efac;
}

/* Status Accent Stripe (Top Bar) */
.status-accent-stripe {
  height: 5px;
  width: 100%;
}

.status-accent-stripe--queued {
  background: linear-gradient(90deg, #0284c7, #38bdf8);
}

.status-accent-stripe--preparing {
  background: linear-gradient(90deg, #ea580c, #f59e0b);
}

.status-accent-stripe--prepared {
  background: linear-gradient(90deg, #16a34a, #4ade80);
}

.status-accent-stripe--served {
  background: #94a3b8;
}

/* 1. Header */
.card-header {
  padding: 16px 18px 12px;
}

/* Destination Badge (Table / Takeaway Hero) */
.destination-badge {
  display: inline-flex;
  align-items: center;
  font-size: 1.05rem;
  font-weight: 700;
  background: #f1f5f9;
  color: #0f172a;
  padding: 6px 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  max-width: 200px;
  letter-spacing: -0.01em;
}

.destination-icon {
  color: #0284c7;
}

.destination-badge--takeaway {
  background: #fff7ed;
  color: #c2410c;
  border-color: #ffedd5;
}

.destination-badge--takeaway .destination-icon {
  color: #ea580c;
}

/* Queue Number Badge */
.queue-badge {
  display: inline-flex;
  align-items: baseline;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 4px 10px;
  border-radius: 10px;
  gap: 4px;
}

.queue-prefix {
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
}

.queue-num {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

/* Edit Action Button */
.btn-edit-action {
  display: inline-flex;
  align-items: center;
  background: transparent;
  border: 1px solid #e2e8f0;
  color: #64748b;
  border-radius: 9999px;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn-edit-action:hover {
  background: #f8fafc;
  color: #0284c7;
  border-color: #0284c7;
}

/* Meta Row (Status & Time) */
.meta-row {
  margin-top: 4px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
}

.status-pill--queued {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.status-pill--preparing {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
}

.status-pill--prepared {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.status-pill--served {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.time-meta-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  padding: 3px 10px;
}

.time-divider {
  color: #cbd5e1;
  font-size: 0.75rem;
}

.timer-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.chef-timer-pill--normal {
  color: #64748b;
}

.chef-timer-pill--warning {
  color: #d97706;
}

.chef-timer-pill--danger {
  color: #dc2626;
  font-weight: 800;
  animation: pulse-alert 1.5s infinite ease-in-out;
}

@keyframes pulse-alert {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Customer Revision Alert Banner */
.revision-alert-banner {
  background: #fefce8;
  border: 1px solid #fef08a;
  border-radius: 10px;
  padding: 5px 10px;
  color: #854d0e;
}

.btn-revision-history {
  display: inline-flex;
  align-items: center;
  background: transparent;
  border: none;
  color: #854d0e;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
}

.btn-revision-history:hover {
  background: rgba(133, 77, 14, 0.1);
}

/* Card Divider */
.card-divider {
  height: 1px;
  background: #f1f5f9;
  margin: 0;
}

/* 2. Items Body */
.card-body {
  padding: 14px 18px;
  flex: 1;
}

.items-summary-header {
  padding-bottom: 2px;
}

.items-total-pill {
  background: #f1f5f9;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 9999px;
}

.checklist-progress-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  background: #f1f5f9;
  color: #64748b;
  padding: 3px 8px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.checklist-progress-pill--all {
  background: #dcfce7;
  color: #15803d;
  border-color: #86efac;
}

/* Mini Progress Track Bar */
.progress-track-bar {
  height: 4px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill-bar {
  height: 100%;
  background: #0284c7;
  border-radius: 9999px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-fill-bar--done {
  background: #16a34a;
}

/* Station Groups (อาหาร, ยำ/ต้ม) */
.station-group {
  margin-bottom: 12px;
}

.station-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
}

.station-pill--food {
  background: #f0f9ff;
  color: #0369a1;
  border-color: #bae6fd;
}

.station-pill--soup_yam {
  background: #fff7ed;
  color: #c2410c;
  border-color: #ffedd5;
}

.station-rule {
  height: 1px;
  background: #f1f5f9;
}

/* Dish Item Row (Interactive Checklist) */
.dish-row {
  padding: 9px 8px;
  border-radius: 12px;
  margin-bottom: 4px;
  cursor: pointer;
  user-select: none;
  border: 1px solid transparent;
  transition: all 0.18s ease;
}

.dish-row:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.dish-row--checked {
  background: #f8fafc;
  opacity: 0.65;
}

.dish-row--checked:hover {
  opacity: 0.85;
}

.dish-row--multi-qty {
  background: rgba(2, 132, 199, 0.02);
}

/* Interactive Checkbox */
.dish-checkbox {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 1.75px solid #cbd5e1;
  margin-top: 1px;
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  color: #ffffff;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dish-row:hover .dish-checkbox {
  border-color: #0284c7;
}

.dish-checkbox--active {
  background: #16a34a !important;
  border-color: #16a34a !important;
  transform: scale(1.05);
}

/* Dish Details */
.dish-title-text {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
  letter-spacing: -0.01em;
  transition: all 0.2s ease;
}

.dish-title-text--done {
  text-decoration: line-through;
  color: #64748b;
}

/* Option Badges */
.dish-options-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}

.dish-opt-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.dish-opt-plus {
  color: #0284c7;
  font-weight: 700;
  font-size: 0.85rem;
  line-height: 1;
  margin-right: 1px;
}

.dish-opt-icon {
  flex-shrink: 0;
}

.dish-opt-text {
  line-height: 1.4;
}

/* Modifiers with specific semantics */
.dish-opt-pill--egg {
  background: #fef9c3;
  color: #854d0e;
  border-color: #fde047;
}

.dish-opt-pill--egg .dish-opt-plus {
  color: #b45309;
}

.dish-opt-pill--spicy {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}

.dish-opt-pill--spicy .dish-opt-icon {
  color: #dc2626;
}

.dish-opt-pill--special {
  background: #faf5ff;
  color: #7e22ce;
  border-color: #e9d5ff;
}

.dish-opt-pill--special .dish-opt-icon {
  color: #9333ea;
}

.dish-opt-pill--takeaway {
  background: #fff7ed;
  color: #c2410c;
  border-color: #fed7aa;
}

.dish-opt-pill--takeaway .dish-opt-icon {
  color: #ea580c;
}

.dish-opt-pill--sweet {
  background: #f0fdf4;
  color: #166534;
  border-color: #bbf7d0;
}

.dish-opt-pill--sweet .dish-opt-icon {
  color: #16a34a;
}

/* Special Cooking Instruction (Customer Note) */
.special-instruction-card {
  display: flex;
  align-items: flex-start;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 5px 9px;
  color: #92400e;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.35;
}

.note-icon {
  color: #d97706;
  margin-top: 1px;
}

/* Quantity Box */
.dish-qty-box {
  display: flex;
  align-items: baseline;
  justify-content: center;
  font-size: 1.15rem;
  font-weight: 800;
  color: #1e293b;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  padding: 3px 9px;
  border-radius: 9px;
  min-width: 44px;
  text-align: center;
  line-height: 1;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.qty-number {
  letter-spacing: -0.02em;
}

.qty-times {
  font-size: 0.85rem;
  color: #64748b;
  margin-left: 1px;
}

.dish-qty-box--multi {
  background: #f0f9ff;
  color: #0284c7;
  border-color: #bae6fd;
  transform: scale(1.04);
}

.dish-qty-box--multi .qty-times {
  color: #0284c7;
}

.dish-qty-box--done {
  opacity: 0.6;
}

/* 3. Footer */
.card-footer {
  padding: 8px 18px 16px;
}

.ready-celebration-banner {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 10px;
  animation: banner-fade-in 0.3s ease;
}

@keyframes banner-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.action-btn {
  border-radius: 14px !important;
  height: 48px;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: -0.01em;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn:active {
  transform: scale(0.985);
}

.action-btn--start {
  background: #0284c7 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
}

.action-btn--start:hover {
  background: #0369a1 !important;
  box-shadow: 0 6px 16px rgba(2, 132, 199, 0.35);
}

.action-btn--serve {
  background: #16a34a !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
}

.action-btn--serve:hover {
  background: #15803d !important;
  box-shadow: 0 6px 16px rgba(22, 163, 74, 0.35);
}

.action-btn--pulse {
  animation: pulse-btn 1.8s infinite ease-in-out;
}

@keyframes pulse-btn {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
  }
  50% {
    box-shadow: 0 6px 20px rgba(22, 163, 74, 0.55);
  }
}
</style>
