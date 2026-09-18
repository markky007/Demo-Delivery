<template>
  <div class="rice-mode-container animate-fade-in">
    <!-- Station Banner / Top Controls -->
    <div class="rice-top-card q-pa-md q-mb-md">
      <div class="row items-center justify-between wrap q-gutter-md">
        <div class="row items-center">
          <div class="rice-hero-icon-box q-mr-md">
            <q-icon name="rice_bowl" size="28px" color="white" />
          </div>
          <div>
            <div class="row items-center q-gutter-x-sm">
              <h6 class="q-my-none text-weight-bold rice-page-title text-ink">
                จุดตักข้าว & เตรียมข้าว (Rice Station)
              </h6>
              <div class="apple-pill-badge apple-pill-badge--rice font-mono">
                รอตัก {{ pendingRiceCount }} รายการ
              </div>
            </div>
          </div>
        </div>

        <div class="row items-center q-gutter-sm">
          <q-btn
            v-if="completedRiceItemIds.size > 0"
            outline
            dense
            no-caps
            color="grey-8"
            icon="refresh"
            label="ล้างที่ติ๊กเสร็จแล้ว"
            class="apple-pill-action-btn q-px-md"
            @click="onClearCompleted"
          />
        </div>
      </div>
    </div>

    <!-- Filter Tabs for Orders (Apple Segmented Style) -->
    <div class="row items-center justify-between q-mb-md">
      <div class="apple-filter-group">
        <button
          type="button"
          class="apple-filter-btn"
          :class="{ 'apple-filter-btn--active': riceFilter === 'all' }"
          @click="riceFilter = 'all'"
        >
          ทั้งหมด ({{ allRiceRequirements.length }})
        </button>
        <button
          type="button"
          class="apple-filter-btn"
          :class="{ 'apple-filter-btn--active': riceFilter === 'pending' }"
          @click="riceFilter = 'pending'"
        >
          <span class="status-dot status-dot--pending q-mr-xs"></span>
          รอตัก ({{ pendingRiceRequirements.length }})
        </button>
        <button
          type="button"
          class="apple-filter-btn"
          :class="{ 'apple-filter-btn--active': riceFilter === 'completed' }"
          @click="riceFilter = 'completed'"
        >
          <span class="status-dot status-dot--completed q-mr-xs"></span>
          ตักเสร็จแล้ว ({{ completedRiceRequirements.length }})
        </button>
      </div>
    </div>

    <!-- 3. Order-by-Order Rice Cards Grid -->
    <div v-if="groupedRiceOrders.length > 0" class="rice-orders-grid">
      <div
        v-for="orderGroup in groupedRiceOrders"
        :key="orderGroup.orderId"
        class="rice-order-card"
        :class="{ 'rice-order-card--all-done': orderGroup.allCompleted }"
      >
        <!-- Order Header -->
        <div class="row items-center justify-between q-pb-sm rice-order-header">
          <div class="row items-center q-gutter-xs">
            <span class="rice-order-queue-badge font-mono">
              #{{ formatQueueNumber(orderGroup.queueNumber) }}
            </span>
            <span
              class="rice-order-table-title text-weight-bold"
              :class="{
                'text-accent-warm': isTakeawayName(orderGroup.tableName),
                'text-ink': !isTakeawayName(orderGroup.tableName),
              }"
            >
              {{ orderGroup.tableName }}
            </span>
            <q-badge
              v-if="isTakeawayName(orderGroup.tableName)"
              rounded
              class="apple-sub-badge apple-sub-badge--takeaway"
            >
              <q-icon name="shopping_bag" size="11px" class="q-mr-xs" />
              กลับบ้าน
            </q-badge>
            <span
              v-if="
                orderGroup.customerName && !orderGroup.tableName.includes(orderGroup.customerName)
              "
              class="text-caption text-muted"
            >
              ({{ orderGroup.customerName }})
            </span>
          </div>

          <div class="row items-center q-gutter-xs">
            <span class="rice-order-time-badge font-mono">
              {{ formatElapsed(orderGroup.queuedAt) }}
            </span>
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              :color="orderGroup.allCompleted ? 'grey-6' : 'amber-9'"
              :label="orderGroup.allCompleted ? 'ยกเลิกติ๊ก' : 'เสร็จทั้งหมด'"
              class="rice-check-all-btn"
              @click="toggleOrderAllRiceItems(orderGroup.orderId)"
            />
          </div>
        </div>

        <!-- Items List -->
        <div class="rice-items-checklist q-mt-sm q-gutter-y-xs">
          <div
            v-for="req in orderGroup.items"
            :key="req.id"
            class="rice-item-row"
            :class="{
              'rice-item-row--done': completedRiceItemIds.has(req.id),
              'rice-item-row--fried': req.isFriedRice,
              'rice-item-row--takeaway': req.isTakeaway,
            }"
            @click="toggleRiceItem(req.id)"
          >
            <div class="row items-center justify-between no-wrap">
              <div class="row items-center no-wrap col">
                <q-checkbox
                  :model-value="completedRiceItemIds.has(req.id)"
                  color="amber-9"
                  dense
                  class="q-mr-sm"
                  @update:model-value="toggleRiceItem(req.id)"
                  @click.stop
                />
                <div class="col ellipsis">
                  <div class="row items-center q-gutter-xs wrap">
                    <!-- Main display label -->
                    <span
                      class="text-weight-bold rice-item-name"
                      :class="{
                        'text-strike text-muted': completedRiceItemIds.has(req.id),
                        'text-accent-warm': req.isTakeaway && !completedRiceItemIds.has(req.id),
                        'text-ink': !req.isTakeaway || completedRiceItemIds.has(req.id),
                      }"
                    >
                      {{ req.displayLabel }}
                    </span>

                    <!-- Portion & Category Badges (Apple Pill Badges) -->
                    <q-badge
                      v-if="req.isTakeaway"
                      rounded
                      class="apple-sub-badge apple-sub-badge--takeaway"
                    >
                      <q-icon name="shopping_bag" size="11px" class="q-mr-xs" />
                      กลับบ้าน
                    </q-badge>
                    <q-badge
                      v-if="req.isFriedRice"
                      rounded
                      class="apple-sub-badge apple-sub-badge--fried"
                    >
                      ข้าวผัด
                    </q-badge>
                    <q-badge
                      v-if="req.isSpecial"
                      rounded
                      class="apple-sub-badge apple-sub-badge--special"
                    >
                      พิเศษ
                    </q-badge>
                    <q-badge
                      v-else-if="!req.isFriedRice && !req.isTakeaway"
                      rounded
                      class="apple-sub-badge apple-sub-badge--normal"
                    >
                      ธรรมดา
                    </q-badge>
                    <q-badge
                      v-if="req.isAddonRice"
                      rounded
                      class="apple-sub-badge apple-sub-badge--addon"
                    >
                      เพิ่มข้าว
                    </q-badge>
                  </div>
                  <div class="text-caption text-muted ellipsis q-mt-xs">
                    เมนู: <strong class="text-body">{{ req.dishName }}</strong>
                    <span
                      v-if="req.specialInstruction"
                      class="text-deep-orange-9 text-weight-medium q-ml-xs"
                    >
                      ({{ req.specialInstruction }})
                    </span>
                  </div>
                </div>
              </div>

              <div class="rice-qty-box text-right q-ml-sm">
                <span
                  class="text-weight-bolder rice-qty-num font-mono"
                  :class="{ 'text-accent-warm': req.isTakeaway }"
                >
                  {{ req.quantity }}
                </span>
                <span class="text-caption text-muted q-ml-xs">{{ req.unit }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State for Orders -->
    <div v-else class="rice-all-empty-card text-center q-pa-xl">
      <div class="rice-empty-icon-wrap q-mx-auto q-mb-md">
        <q-icon name="rice_bowl" size="44px" color="amber-7" />
      </div>
      <div class="text-weight-bold text-h6 text-ink">ไม่มีรายการจานข้าวที่ต้องตัก</div>
      <div class="text-caption text-muted q-mt-xs">
        ออเดอร์ในครัวขณะนี้ไม่มีเมนูข้าว หรือข้าวทุกจานถูกตักเตรียมเรียบร้อยแล้ว
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import type { OrderWithItems, MenuItem, MenuCategory } from 'src/types/database';
import { formatQueueNumber } from 'src/utils/formatters';
import { isTakeawayName } from 'src/services/tableService';
import { useRiceStation } from 'src/composables/useRiceStation';
import { useElapsedTimer } from 'src/composables/useElapsedTimer';
import { useNotify } from 'src/composables/useNotify';

interface Props {
  orders: OrderWithItems[];
  menuItemsMap: Map<string, MenuItem>;
  categoriesMap: Map<string, MenuCategory>;
}

const props = defineProps<Props>();

const ordersRef = toRef(props, 'orders');
const menuItemsMapRef = toRef(props, 'menuItemsMap');
const categoriesMapRef = toRef(props, 'categoriesMap');

const {
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
} = useRiceStation(ordersRef, menuItemsMapRef, categoriesMapRef);

const { formatElapsed } = useElapsedTimer();
const { notifySuccess } = useNotify();

function onClearCompleted() {
  clearCompletedRiceItems();
  notifySuccess({
    title: 'ล้างรายการตักข้าวที่เสร็จแล้ว ✨',
    message: 'รีเซ็ตสถานะรายการตักข้าวที่เสร็จแล้วออกจากมุมมอง',
  });
}
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

.text-accent-warm {
  color: var(--color-accent-warm, #b64400);
}

.font-mono {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

/* ─── Top Banner Card ─────────────────────────────────────── */
.rice-top-card {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
}

.rice-hero-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
}

.rice-page-title {
  font-size: 1.15rem;
  letter-spacing: -0.01em;
}

.apple-pill-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 980px;
  font-size: 0.8rem;
  font-weight: 700;
}

.apple-pill-badge--rice {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
  border: 1px solid rgba(217, 119, 6, 0.25);
}

.apple-pill-action-btn {
  border-radius: 980px !important;
  border: 1px solid var(--color-hairline, #d2d2d7);
  font-weight: 600;
  transition: all 0.18s ease;
}

.apple-pill-action-btn:hover {
  background: #ffffff;
  color: var(--color-ink-strong, #000000);
}

/* ─── Apple Segmented Filter Tabs ─────────────────────────── */
.apple-filter-group {
  display: inline-flex;
  align-items: center;
  background: var(--color-surface-footer, #f5f5f7);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 980px;
  padding: 3px;
  gap: 2px;
}

.apple-filter-btn {
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  color: var(--color-muted, #6e6e73);
  padding: 5px 14px;
  border-radius: 980px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: all 0.18s ease;
  white-space: nowrap;
}

.apple-filter-btn:hover:not(.apple-filter-btn--active) {
  color: var(--color-ink, #1d1d1f);
}

.apple-filter-btn--active {
  background: #ffffff;
  color: var(--color-ink-strong, #000000);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot--pending {
  background-color: #d97706;
}

.status-dot--completed {
  background-color: #16a34a;
}

/* ─── Rice Orders Grid ────────────────────────────────────── */
.rice-orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.rice-order-card {
  background: #ffffff;
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.rice-order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.07);
}

.rice-order-card--all-done {
  opacity: 0.72;
  background: var(--color-surface-subtle, #fafafc);
}

.rice-order-header {
  border-bottom: 1px solid var(--color-hairline, #d2d2d7);
}

.rice-order-queue-badge {
  background: rgba(0, 113, 227, 0.08);
  color: var(--color-primary, #0071e3);
  font-weight: 800;
  font-size: 0.85rem;
  padding: 2px 8px;
  border-radius: 980px;
}

.rice-order-table-title {
  font-size: 0.95rem;
}

.rice-order-time-badge {
  font-size: 0.75rem;
  color: var(--color-muted, #6e6e73);
  background: var(--color-surface-footer, #f5f5f7);
  padding: 2px 8px;
  border-radius: 980px;
}

.rice-check-all-btn {
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 980px;
}

/* Item Rows */
.rice-item-row {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid rgba(210, 210, 215, 0.6);
  border-radius: 11px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.rice-item-row:hover {
  background: #ffffff;
  border-color: var(--color-hairline, #d2d2d7);
}

.rice-item-row--done {
  background: rgba(245, 245, 247, 0.8);
  border-color: rgba(210, 210, 215, 0.4);
}

.rice-item-row--takeaway {
  border-left: 3px solid var(--color-accent-warm, #b64400);
}

.rice-item-row--fried {
  border-left: 3px solid #ea580c;
}

.rice-item-name {
  font-size: 0.92rem;
}

.apple-sub-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 980px;
}

.apple-sub-badge--takeaway {
  background: rgba(182, 68, 0, 0.12);
  color: var(--color-accent-warm, #b64400);
}

.apple-sub-badge--fried {
  background: rgba(234, 88, 12, 0.12);
  color: #ea580c;
}

.apple-sub-badge--special {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}

.apple-sub-badge--normal {
  background: var(--color-surface-footer, #f5f5f7);
  color: var(--color-muted, #6e6e73);
  border: 1px solid var(--color-hairline, #d2d2d7);
}

.apple-sub-badge--addon {
  background: rgba(147, 51, 234, 0.12);
  color: #7e22ce;
}

.rice-qty-box {
  min-width: 48px;
}

.rice-qty-num {
  font-size: 1.15rem;
  color: var(--color-ink-strong, #000000);
}

/* Empty Card */
.rice-all-empty-card {
  background: #ffffff;
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
}

.rice-empty-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
