<template>
  <div
    class="kitchen-slip kds-receipt-card"
    :class="{
      'kds-receipt-card--queued': order.status === OrderStatus.QUEUED,
      'kds-receipt-card--preparing': order.status === OrderStatus.PREPARING,
      'kds-receipt-card--prepared': order.status === OrderStatus.PREPARED,
    }"
  >
    <!-- Receipt Top Perforation / Punch Hole Bar -->
    <div class="receipt-hanger-bar">
      <div class="receipt-hanger-hole"></div>
    </div>

    <!-- 1. Receipt Header -->
    <div class="receipt-header">
      <!-- Slip Title Tag & Edit Button -->
      <div class="row items-center justify-between no-wrap q-mb-xs">
        <div class="receipt-type-tag">
          <q-icon name="receipt_long" size="16px" class="q-mr-xs text-primary" />
          <span>ใบสั่งอาหาร (ครัว)</span>
        </div>

        <!-- Edit Button -->
        <q-btn
          flat
          dense
          no-caps
          size="xs"
          class="receipt-edit-btn"
          @click.stop="$emit('edit', order)"
        >
          <q-icon name="edit_note" size="18px" class="q-mr-xs" />
          <span>แก้ไข</span>
          <q-tooltip>แก้ไขรายการอาหาร</q-tooltip>
        </q-btn>
      </div>

      <!-- Queue Number & Table Row -->
      <div class="row items-center justify-between no-wrap q-mt-xs q-mb-sm">
        <div class="row items-baseline no-wrap q-gutter-x-sm">
          <div class="receipt-queue-block">
            <span class="receipt-queue-prefix">คิวที่</span>
            <span class="receipt-queue-number font-mono">{{
              formatQueueNumber(order.queue_number)
            }}</span>
          </div>

          <div
            class="receipt-table-tag"
            :class="{
              'receipt-table-tag--takeaway': isTakeaway,
            }"
          >
            <q-icon
              :name="isTakeaway ? 'shopping_bag' : 'table_restaurant'"
              size="16px"
              class="q-mr-xs"
            />
            <span class="ellipsis">{{ tableName }}</span>
          </div>
        </div>

        <!-- Status Stamp -->
        <div
          class="receipt-status-stamp"
          :class="{
            'receipt-status-stamp--queued': order.status === OrderStatus.QUEUED,
            'receipt-status-stamp--preparing': order.status === OrderStatus.PREPARING,
            'receipt-status-stamp--prepared': order.status === OrderStatus.PREPARED,
          }"
        >
          <q-icon :name="statusIcon" size="15px" class="q-mr-xs" />
          <span>{{ statusLabel }}</span>
        </div>
      </div>

      <!-- Receipt Meta Grid: Time & Timer -->
      <div class="receipt-meta-box row items-center justify-between no-wrap">
        <div class="row items-center text-caption text-body">
          <q-icon name="schedule" size="15px" class="q-mr-xs text-muted" />
          <span>สั่ง: {{ formatTime(order.created_at) }} น.</span>
        </div>

        <div class="receipt-timer-chip" :class="timerClass">
          <q-icon name="timer" size="14px" class="q-mr-xs" />
          <span class="font-mono">รอ {{ elapsedText }}</span>
        </div>
      </div>

      <!-- Customer Revision Alert Banner -->
      <div
        v-if="order.revision && order.revision > 1"
        class="receipt-revision-banner q-mt-xs row items-center justify-between no-wrap"
      >
        <div class="row items-center no-wrap text-weight-medium text-caption">
          <q-icon name="notifications_active" size="16px" class="q-mr-xs text-amber-9" />
          <span>แก้ไขรายการ: เวอร์ชัน {{ order.revision }}</span>
        </div>
        <q-btn
          flat
          dense
          no-caps
          size="xs"
          label="ดูประวัติแก้ไข"
          icon="history"
          class="receipt-rev-btn"
          @click.stop="$emit('history', order)"
        />
      </div>
    </div>

    <!-- 2. Perforated Tear Divider (with Side Cutout Notches) -->
    <div class="receipt-tear-divider">
      <div class="receipt-tear-notch-left"></div>
      <div class="receipt-tear-dash"></div>
      <div class="receipt-tear-notch-right"></div>
    </div>

    <!-- 3. Receipt Items Body -->
    <div class="receipt-body">
      <!-- Columns Header -->
      <div class="receipt-table-header row items-center justify-between no-wrap q-mb-xs">
        <span class="text-caption text-weight-bold text-muted">
          รายการ ({{ consolidatedCount }})
        </span>
        <span class="text-caption text-weight-bold text-muted">จำนวน</span>
      </div>

      <!-- Items List (Grouped by Kitchen Category: อาหาร, ยำ/ต้ม) -->
      <div class="receipt-items-list">
        <div v-for="group in orderGroups" :key="group.key" class="receipt-category-group">
          <!-- Category Station Divider (อาหาร หรือ ยำ/ต้ม) -->
          <div class="receipt-category-divider">
            <div class="receipt-category-pill" :class="`receipt-category-pill--${group.key}`">
              <q-icon :name="group.icon" size="15px" class="q-mr-xs" />
              <span>{{ group.label }}</span>
            </div>
            <div class="receipt-category-rule"></div>
          </div>

          <!-- Dishes List under this Category -->
          <div class="receipt-category-items">
            <div
              v-for="(item, idx) in group.items"
              :key="item.id || idx"
              class="receipt-dish-line"
              :class="{ 'receipt-dish-line--multi': (item.quantity || 1) > 1 }"
            >
              <div class="row items-start justify-between no-wrap">
                <!-- Dish Title & Options & Comment -->
                <div class="receipt-dish-left col q-pr-sm">
                  <div class="receipt-dish-title text-ink">
                    {{ item.snapshot_name }}
                  </div>

                  <!-- Options Breakdown Chips -->
                  <div
                    v-if="item.options && getVisibleOptions(item.options).length > 0"
                    class="receipt-options-flow q-mt-xs"
                  >
                    <span
                      v-for="opt in getVisibleOptions(item.options)"
                      :key="opt.id"
                      class="receipt-opt-badge"
                      :class="`receipt-opt-badge--${getOptionDisplayInfo(opt.snapshot_option_name).category}`"
                    >
                      <q-icon
                        :name="getOptionDisplayInfo(opt.snapshot_option_name).icon"
                        size="12px"
                        class="q-mr-xs"
                      />
                      {{ getOptionDisplayInfo(opt.snapshot_option_name).label }}
                    </span>
                  </div>

                  <!-- Special Instruction / Customer Comment -->
                  <div v-if="item.special_instruction" class="receipt-note-strip q-mt-xs">
                    <q-icon
                      name="chat_bubble_outline"
                      size="14px"
                      class="q-mr-xs receipt-note-icon"
                    />
                    <span class="receipt-note-text">{{ item.special_instruction }}</span>
                  </div>
                </div>

                <!-- Quantity Box (Monospace Receipt Stamp) -->
                <div
                  class="receipt-dish-qty font-mono"
                  :class="{ 'receipt-dish-qty--multi': (item.quantity || 1) > 1 }"
                >
                  {{ item.quantity }}x
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Tear-off Footer Divider -->
    <div class="receipt-tear-divider receipt-tear-divider--footer">
      <div class="receipt-tear-notch-left"></div>
      <div class="receipt-tear-dash"></div>
      <div class="receipt-tear-notch-right"></div>
    </div>

    <!-- 5. Footer Action Button -->
    <div class="receipt-footer">
      <!-- Step 1: QUEUED -> กดรับออเดอร์ (เริ่มทำ) -->
      <q-btn
        v-if="order.status === OrderStatus.QUEUED"
        unelevated
        no-caps
        class="full-width receipt-action-btn receipt-action-btn--start"
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
        class="full-width receipt-action-btn receipt-action-btn--serve"
        @click="$emit('advance-status', order.id, OrderStatus.SERVED)"
      >
        <q-icon name="check_circle" size="20px" class="q-mr-sm" />
        <span class="ellipsis">กดส่งออเดอร์ไป {{ tableName }}</span>
      </q-btn>
    </div>

    <!-- 6. Bottom Sawtooth Jagged Edge -->
    <div class="receipt-sawtooth-bottom"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { OrderStatus } from 'src/types/enums';
import type { OrderWithItems, MenuItem, MenuCategory } from 'src/types/database';
import {
  formatQueueNumber,
  formatTime,
  getVisibleOptions,
  getOptionDisplayInfo,
  consolidateOrderItems,
  groupOrderItemsForKitchen,
} from 'src/utils/formatters';
import { isTakeawayName } from 'src/services/tableService';
import { useElapsedTimer } from 'src/composables/useElapsedTimer';

interface Props {
  order: OrderWithItems;
  menuItemsMap: Map<string, MenuItem>;
  categoriesMap: Map<string, MenuCategory>;
}

const props = defineProps<Props>();

defineEmits<{
  (e: 'edit', order: OrderWithItems): void;
  (e: 'history', order: OrderWithItems): void;
  (e: 'advance-status', orderId: string, newStatus: OrderStatus): void;
}>();

const { formatElapsed, getTimerColorClass } = useElapsedTimer();

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
</script>

<style scoped>
.font-mono {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-body {
  color: var(--color-body, #414143);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

/* ==========================================================
   AUTHENTIC RECEIPT / SLIP KDS TICKET (Apple Minimalist Finish)
   ========================================================== */

.kds-receipt-card {
  background: #ffffff;
  border-radius: 18px 18px 0 0;
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-bottom: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  position: relative;
  transition:
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 480px;
  margin-bottom: 12px;
}

.kds-receipt-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.09);
}

.kds-receipt-card--queued {
  border-top: 4px solid var(--color-primary, #0071e3);
}

.kds-receipt-card--preparing {
  border-top: 4px solid #d97706;
}

.kds-receipt-card--prepared {
  border-top: 4px solid #16a34a;
}

/* Top Punch Hole / Hanger Hook */
.receipt-hanger-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0 4px;
}

.receipt-hanger-hole {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #f1f5f9;
  border: 1.5px solid var(--color-hairline, #d2d2d7);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.12);
}

/* 1. Header */
.receipt-header {
  padding: 6px 18px 12px;
}

.receipt-type-tag {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted, #6e6e73);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.receipt-edit-btn {
  color: var(--color-muted, #6e6e73);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 980px;
  padding: 2px 10px;
  font-weight: 600;
  transition: all 0.18s ease;
}

.receipt-edit-btn:hover {
  color: var(--color-primary, #0071e3);
  border-color: var(--color-primary, #0071e3);
  background: rgba(0, 113, 227, 0.05);
}

.receipt-queue-block {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.receipt-queue-prefix {
  font-size: 0.85rem;
  color: var(--color-muted, #6e6e73);
  font-weight: 500;
}

.receipt-queue-number {
  font-size: 1.65rem;
  font-weight: 800;
  color: var(--color-ink-strong, #000000);
  line-height: 1;
}

.receipt-table-tag {
  display: inline-flex;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--color-surface-footer, #f5f5f7);
  color: var(--color-ink, #1d1d1f);
  padding: 4px 10px;
  border-radius: 980px;
  border: 1px solid var(--color-hairline, #d2d2d7);
  max-width: 140px;
}

.receipt-table-tag--takeaway {
  background: rgba(182, 68, 0, 0.1);
  color: var(--color-accent-warm, #b64400);
  border-color: rgba(182, 68, 0, 0.25);
}

.receipt-status-stamp {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 980px;
  letter-spacing: 0.01em;
}

.receipt-status-stamp--queued {
  background: rgba(0, 113, 227, 0.1);
  color: var(--color-primary, #0071e3);
  border: 1px solid rgba(0, 113, 227, 0.25);
}

.receipt-status-stamp--preparing {
  background: rgba(217, 119, 6, 0.1);
  color: #d97706;
  border: 1px solid rgba(217, 119, 6, 0.25);
}

.receipt-status-stamp--prepared {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
  border: 1px solid rgba(22, 163, 74, 0.25);
}

.receipt-meta-box {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid rgba(210, 210, 215, 0.6);
  border-radius: 11px;
  padding: 6px 12px;
}

.receipt-timer-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 980px;
}

.chef-timer-pill--normal {
  background: rgba(110, 110, 115, 0.1);
  color: var(--color-muted, #6e6e73);
}

.chef-timer-pill--warning {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}

.chef-timer-pill--danger {
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
  animation: pulse-danger 1.5s infinite ease-in-out;
}

@keyframes pulse-danger {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.65;
  }
}

.receipt-revision-banner {
  background: rgba(217, 119, 6, 0.1);
  border: 1px solid rgba(217, 119, 6, 0.25);
  border-radius: 980px;
  padding: 4px 12px;
  color: #92400e;
}

.receipt-rev-btn {
  color: #92400e;
  font-weight: 600;
}

/* 2. Perforated Tear Divider */
.receipt-tear-divider {
  position: relative;
  display: flex;
  align-items: center;
  margin: 0;
  height: 18px;
}

.receipt-tear-notch-left,
.receipt-tear-notch-right {
  position: absolute;
  width: 14px;
  height: 14px;
  background: var(--color-background, #fbf9f6);
  border-radius: 50%;
  border: 1px solid var(--color-hairline, #d2d2d7);
  z-index: 2;
}

.receipt-tear-notch-left {
  left: -7px;
}

.receipt-tear-notch-right {
  right: -7px;
}

.receipt-tear-dash {
  width: 100%;
  border-bottom: 1.5px dashed var(--color-hairline, #d2d2d7);
  margin: 0 8px;
}

/* 3. Items Body */
.receipt-body {
  padding: 8px 18px;
  flex: 1;
}

.receipt-table-header {
  border-bottom: 1px solid rgba(210, 210, 215, 0.6);
  padding-bottom: 4px;
}

.receipt-category-divider {
  display: flex;
  align-items: center;
  margin: 10px 0 6px;
  gap: 8px;
}

.receipt-category-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 980px;
  background: var(--color-surface-footer, #f5f5f7);
  color: var(--color-ink, #1d1d1f);
  border: 1px solid var(--color-hairline, #d2d2d7);
}

.receipt-category-pill--food {
  background: rgba(0, 113, 227, 0.08);
  color: var(--color-primary, #0071e3);
  border-color: rgba(0, 113, 227, 0.2);
}

.receipt-category-pill--soup_salad {
  background: rgba(182, 68, 0, 0.08);
  color: var(--color-accent-warm, #b64400);
  border-color: rgba(182, 68, 0, 0.2);
}

.receipt-category-rule {
  flex: 1;
  height: 1px;
  background: var(--color-hairline, #d2d2d7);
  opacity: 0.6;
}

.receipt-dish-line {
  padding: 8px 0;
  border-bottom: 1px solid rgba(210, 210, 215, 0.35);
}

.receipt-dish-line--multi {
  background: rgba(0, 113, 227, 0.02);
  border-radius: 8px;
  padding: 8px 6px;
}

.receipt-dish-title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
}

.receipt-opt-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 980px;
  background: var(--color-surface-footer, #f5f5f7);
  color: var(--color-body, #414143);
  margin-right: 4px;
  margin-bottom: 3px;
  border: 1px solid rgba(210, 210, 215, 0.6);
}

.receipt-opt-badge--meat {
  background: rgba(182, 68, 0, 0.08);
  color: var(--color-accent-warm, #b64400);
}

.receipt-opt-badge--size {
  background: rgba(217, 119, 6, 0.08);
  color: #b45309;
}

.receipt-opt-badge--fry {
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
}

.receipt-note-strip {
  display: flex;
  align-items: flex-start;
  background: rgba(217, 119, 6, 0.08);
  border-radius: 8px;
  padding: 4px 8px;
  color: #92400e;
  font-size: 0.78rem;
  font-weight: 500;
}

.receipt-dish-qty {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-ink-strong, #000000);
  background: var(--color-surface-footer, #f5f5f7);
  border: 1px solid var(--color-hairline, #d2d2d7);
  padding: 3px 10px;
  border-radius: 8px;
  min-width: 44px;
  text-align: center;
}

.receipt-dish-qty--multi {
  background: rgba(0, 113, 227, 0.1);
  color: var(--color-primary, #0071e3);
  border-color: rgba(0, 113, 227, 0.3);
}

/* 4. Footer */
.receipt-footer {
  padding: 8px 18px 14px;
}

.receipt-action-btn {
  border-radius: 980px !important;
  height: 44px;
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.receipt-action-btn--start {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
}

.receipt-action-btn--start:hover {
  background: #0066cc !important;
}

.receipt-action-btn--serve {
  background: #34c759 !important;
  color: #ffffff !important;
}

.receipt-action-btn--serve:hover {
  background: #2ebd51 !important;
}

/* 5. Sawtooth Bottom Edge */
.receipt-sawtooth-bottom {
  height: 10px;
  width: 100%;
  background: radial-gradient(circle, transparent 4px, #ffffff 4px);
  background-size: 12px 12px;
  background-position: -6px 0;
  position: absolute;
  bottom: -9px;
  left: 0;
  right: 0;
  filter: drop-shadow(0 2px 1px rgba(0, 0, 0, 0.03));
}
</style>
