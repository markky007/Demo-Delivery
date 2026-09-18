<template>
  <div class="fry-mode-container animate-fade-in">
    <!-- Station Banner / Top Controls -->
    <div class="fry-top-card q-pa-md q-mb-md">
      <div class="row items-center justify-between wrap q-gutter-md">
        <div class="row items-center">
          <div class="fry-hero-icon-box q-mr-md">
            <q-icon name="local_fire_department" size="28px" color="white" />
          </div>
          <div>
            <div class="row items-center q-gutter-x-sm">
              <h6 class="q-my-none text-weight-bold fry-page-title text-ink">
                เตาทอด & เตรียมของทอด (Fry Station)
              </h6>
              <div class="apple-pill-badge apple-pill-badge--fry font-mono">
                รอทอด {{ pendingFryCount }} ออเดอร์
              </div>
            </div>
          </div>
        </div>

        <div class="row items-center q-gutter-sm">
          <q-btn
            v-if="completedFryItemIds.size > 0"
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
          :class="{ 'apple-filter-btn--active': fryFilter === 'all' }"
          @click="fryFilter = 'all'"
        >
          ทั้งหมด ({{ allFryRequirements.length }})
        </button>
        <button
          type="button"
          class="apple-filter-btn"
          :class="{ 'apple-filter-btn--active': fryFilter === 'pending' }"
          @click="fryFilter = 'pending'"
        >
          <span class="status-dot status-dot--pending q-mr-xs"></span>
          รอทอด ({{ pendingFryRequirements.length }})
        </button>
        <button
          type="button"
          class="apple-filter-btn"
          :class="{ 'apple-filter-btn--active': fryFilter === 'completed' }"
          @click="fryFilter = 'completed'"
        >
          <span class="status-dot status-dot--completed q-mr-xs"></span>
          ทอดเสร็จแล้ว ({{ completedFryRequirements.length }})
        </button>
      </div>
    </div>

    <!-- 3. Order-by-Order Fry Cards Grid -->
    <div v-if="groupedFryOrders.length > 0" class="fry-orders-grid">
      <div
        v-for="orderGroup in groupedFryOrders"
        :key="orderGroup.orderId"
        class="fry-order-card"
        :class="{ 'fry-order-card--all-done': orderGroup.allCompleted }"
      >
        <!-- Order Header -->
        <div class="row items-center justify-between q-pb-sm fry-order-header">
          <div class="row items-center q-gutter-xs">
            <span class="fry-order-queue-badge font-mono">
              #{{ formatQueueNumber(orderGroup.queueNumber) }}
            </span>
            <span class="fry-order-table-title text-weight-bold text-ink">
              {{ orderGroup.tableName }}
            </span>
            <span v-if="orderGroup.customerName" class="text-caption text-muted">
              ({{ orderGroup.customerName }})
            </span>
          </div>

          <div class="row items-center q-gutter-xs">
            <span class="fry-order-time-badge font-mono">
              {{ formatElapsed(orderGroup.queuedAt) }}
            </span>
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              :color="orderGroup.allCompleted ? 'grey-6' : 'deep-orange-9'"
              :label="orderGroup.allCompleted ? 'ยกเลิกติ๊ก' : 'เสร็จทั้งหมด'"
              class="fry-check-all-btn"
              @click="toggleOrderAllFryItems(orderGroup.orderId)"
            />
          </div>
        </div>

        <!-- Items List -->
        <div class="fry-items-checklist q-mt-sm q-gutter-y-xs">
          <div
            v-for="req in orderGroup.items"
            :key="req.id"
            class="fry-item-row"
            :class="{ 'fry-item-row--done': completedFryItemIds.has(req.id) }"
            @click="toggleFryItem(req.id)"
          >
            <div class="row items-center justify-between no-wrap">
              <div class="row items-center no-wrap col">
                <q-checkbox
                  :model-value="completedFryItemIds.has(req.id)"
                  color="deep-orange-8"
                  dense
                  class="q-mr-sm"
                  @update:model-value="toggleFryItem(req.id)"
                  @click.stop
                />
                <div class="col ellipsis">
                  <div class="row items-center q-gutter-xs">
                    <span
                      class="text-weight-bold fry-item-name"
                      :class="{ 'text-strike text-muted': completedFryItemIds.has(req.id) }"
                    >
                      {{ req.fryName }}
                    </span>
                    <q-badge
                      v-if="req.isSpecial"
                      rounded
                      class="apple-sub-badge apple-sub-badge--special"
                    >
                      พิเศษ
                    </q-badge>
                    <q-badge
                      v-if="req.isAddon"
                      rounded
                      class="apple-sub-badge apple-sub-badge--addon"
                    >
                      เพิ่ม
                    </q-badge>
                  </div>
                  <div class="text-caption text-muted ellipsis q-mt-xs">
                    สำหรับ: <span class="text-body text-weight-medium">{{ req.dishName }}</span>
                    <span
                      v-if="req.specialInstruction"
                      class="text-deep-orange-9 text-weight-medium q-ml-xs"
                    >
                      ({{ req.specialInstruction }})
                    </span>
                  </div>
                </div>
              </div>

              <div class="fry-qty-box text-right q-ml-sm">
                <span class="text-weight-bolder fry-qty-num font-mono">{{ req.quantity }}</span>
                <span class="text-caption text-muted q-ml-xs">{{ req.unit }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State for Orders -->
    <div v-else class="fry-all-empty-card text-center q-pa-xl">
      <div class="fry-empty-icon-wrap q-mx-auto q-mb-md">
        <q-icon name="local_fire_department" size="44px" color="deep-orange-6" />
      </div>
      <div class="text-weight-bold text-h6 text-ink">ไม่มีรายการของทอดที่ต้องเตรียม</div>
      <div class="text-caption text-muted q-mt-xs">
        ออเดอร์ในครัวขณะนี้ไม่มีเมนูของทอด หรือของทอดทั้งหมดถูกเตรียมเรียบร้อยแล้ว
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import type { OrderWithItems, MenuItem } from 'src/types/database';
import { formatQueueNumber } from 'src/utils/formatters';
import { useFryStation } from 'src/composables/useFryStation';
import { useElapsedTimer } from 'src/composables/useElapsedTimer';
import { useNotify } from 'src/composables/useNotify';

interface Props {
  orders: OrderWithItems[];
  menuItemsMap: Map<string, MenuItem>;
}

const props = defineProps<Props>();

const ordersRef = toRef(props, 'orders');
const menuItemsMapRef = toRef(props, 'menuItemsMap');

const {
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
} = useFryStation(ordersRef, menuItemsMapRef);

const { formatElapsed } = useElapsedTimer();
const { notifySuccess } = useNotify();

function onClearCompleted() {
  clearCompletedFryItems();
  notifySuccess({
    title: 'ล้างรายการทอดที่เสร็จแล้ว ✨',
    message: 'รีเซ็ตสถานะรายการทอดที่ทำเสร็จแล้วออกจากมุมมอง',
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

.font-mono {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

/* ─── Top Banner Card ─────────────────────────────────────── */
.fry-top-card {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
}

.fry-hero-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ea580c, #c2410c);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);
}

.fry-page-title {
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

.apple-pill-badge--fry {
  background: rgba(182, 68, 0, 0.12);
  color: var(--color-accent-warm, #b64400);
  border: 1px solid rgba(182, 68, 0, 0.25);
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
  background-color: var(--color-accent-warm, #b64400);
}

.status-dot--completed {
  background-color: #16a34a;
}

/* ─── Fry Orders Grid ─────────────────────────────────────── */
.fry-orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.fry-order-card {
  background: #ffffff;
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.fry-order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.07);
}

.fry-order-card--all-done {
  opacity: 0.72;
  background: var(--color-surface-subtle, #fafafc);
}

.fry-order-header {
  border-bottom: 1px solid var(--color-hairline, #d2d2d7);
}

.fry-order-queue-badge {
  background: rgba(0, 113, 227, 0.08);
  color: var(--color-primary, #0071e3);
  font-weight: 800;
  font-size: 0.85rem;
  padding: 2px 8px;
  border-radius: 980px;
}

.fry-order-table-title {
  font-size: 0.95rem;
}

.fry-order-time-badge {
  font-size: 0.75rem;
  color: var(--color-muted, #6e6e73);
  background: var(--color-surface-footer, #f5f5f7);
  padding: 2px 8px;
  border-radius: 980px;
}

.fry-check-all-btn {
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 980px;
}

/* Item Rows */
.fry-item-row {
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid rgba(210, 210, 215, 0.6);
  border-radius: 11px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.fry-item-row:hover {
  background: #ffffff;
  border-color: var(--color-hairline, #d2d2d7);
}

.fry-item-row--done {
  background: rgba(245, 245, 247, 0.8);
  border-color: rgba(210, 210, 215, 0.4);
}

.fry-item-name {
  font-size: 0.92rem;
}

.apple-sub-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 980px;
}

.apple-sub-badge--special {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}

.apple-sub-badge--addon {
  background: rgba(147, 51, 234, 0.12);
  color: #7e22ce;
}

.fry-qty-box {
  min-width: 48px;
}

.fry-qty-num {
  font-size: 1.15rem;
  color: var(--color-ink-strong, #000000);
}

/* Empty Card */
.fry-all-empty-card {
  background: #ffffff;
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
}

.fry-empty-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(234, 88, 12, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
