<template>
  <div class="apple-table-wrapper">
    <q-table
      :rows="orders"
      :columns="columns"
      row-key="id"
      flat
      class="apple-orders-table"
      :rows-per-page-options="[15, 30, 50, 100]"
      :pagination="{ rowsPerPage: 15 }"
    >
      <!-- Cell: Queue Number -->
      <template #body-cell-queue_number="props">
        <q-td :props="props">
          <div class="apple-queue-pill font-code">
            <span class="queue-hash">#</span>
            <span class="queue-num">{{ formatQueueNum(props.row.queue_number) }}</span>
          </div>
        </q-td>
      </template>

      <!-- Cell: Table / Destination -->
      <template #body-cell-table="props">
        <q-td :props="props">
          <div class="column">
            <div class="row items-center q-gutter-x-xs">
              <q-icon
                :name="props.row.table_session?.customer_name ? 'shopping_bag' : 'table_restaurant'"
                size="15px"
                :class="props.row.table_session?.customer_name ? 'text-amber-9' : 'text-primary'"
              />
              <span class="font-weight-600 text-ink">
                {{ getTableDisplayName(props.row) }}
              </span>
            </div>
            <div class="text-caption text-muted row items-center q-gutter-x-xs q-mt-xs">
              <q-icon name="schedule" size="13px" />
              <span>{{ formatTime(props.row.created_at) }}</span>
              <span class="text-muted-light">•</span>
              <span>{{ formatElapsed(props.row.created_at) }}</span>
            </div>
          </div>
        </q-td>
      </template>

      <!-- Cell: Items Summary -->
      <template #body-cell-items="props">
        <q-td :props="props" class="items-cell">
          <div class="items-summary-list">
            <div
              v-for="(item, idx) in props.row.items"
              :key="item.id || idx"
              class="item-summary-line"
            >
              <span class="item-qty-badge font-tabular">{{ item.quantity }}×</span>
              <span class="item-name font-weight-500 text-ink">
                {{ item.snapshot_name }}
              </span>

              <!-- Options pills if any -->
              <span
                v-if="item.options && item.options.length > 0"
                class="item-options-text text-caption text-muted"
              >
                ({{ item.options.map((o: OrderItemOption) => o.snapshot_option_name).join(', ') }})
              </span>

              <!-- Special note if any -->
              <span v-if="item.special_instruction" class="item-note-chip">
                <q-icon name="edit_note" size="14px" class="q-mr-xs text-amber-9" />
                <span class="text-caption">{{ item.special_instruction }}</span>
              </span>
            </div>
          </div>
        </q-td>
      </template>

      <!-- Cell: Total Amount -->
      <template #body-cell-total_amount="props">
        <q-td :props="props">
          <div class="order-price font-tabular">
            {{ formatPrice(props.row.total_amount) }}
          </div>
          <div class="text-caption text-muted">{{ props.row.items?.length || 0 }} รายการ</div>
        </q-td>
      </template>

      <!-- Cell: Status -->
      <template #body-cell-status="props">
        <q-td :props="props">
          <StatusBadge :status="props.row.status" />
        </q-td>
      </template>

      <!-- Cell: Actions -->
      <template #body-cell-actions="props">
        <q-td :props="props">
          <div class="row items-center justify-end q-gutter-x-xs">
            <!-- Edit Order -->
            <button
              type="button"
              class="table-action-btn table-action-btn--edit"
              @click="$emit('edit', props.row)"
            >
              <q-icon name="edit_note" size="16px" />
              <q-tooltip class="bg-dark">แก้ไขรายการอาหาร</q-tooltip>
            </button>

            <!-- View Details -->
            <button
              type="button"
              class="table-action-btn table-action-btn--detail"
              @click="$emit('viewDetails', props.row)"
            >
              <q-icon name="visibility" size="16px" />
              <q-tooltip class="bg-dark">ดูรายละเอียดออเดอร์</q-tooltip>
            </button>

            <!-- Delete Order -->
            <button
              type="button"
              class="table-action-btn table-action-btn--delete"
              @click="$emit('deleteOrder', props.row)"
            >
              <q-icon name="delete_outline" size="16px" />
              <q-tooltip class="bg-negative">ลบออเดอร์และล้างเซสชันโต๊ะ</q-tooltip>
            </button>
          </div>
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script setup lang="ts">
import type { OrderWithItems, OrderItemOption } from 'src/types/database';
import { formatPrice, formatTime, formatElapsed } from 'src/utils/formatters';
import StatusBadge from 'src/components/StatusBadge.vue';

defineProps<{
  orders: OrderWithItems[];
}>();

defineEmits<{
  (e: 'viewDetails', order: OrderWithItems): void;
  (e: 'edit', order: OrderWithItems): void;
  (e: 'deleteOrder', order: OrderWithItems): void;
}>();

const columns = [
  {
    name: 'queue_number',
    label: 'คิว',
    field: 'queue_number',
    align: 'left' as const,
    sortable: true,
    style: 'width: 90px',
  },
  {
    name: 'table',
    label: 'โต๊ะ / ปลายทาง',
    field: (row: OrderWithItems) => getTableDisplayName(row),
    align: 'left' as const,
    sortable: true,
    style: 'min-width: 170px',
  },
  {
    name: 'items',
    label: 'รายการอาหาร',
    field: 'items',
    align: 'left' as const,
    style: 'min-width: 280px',
  },
  {
    name: 'total_amount',
    label: 'ยอดรวม',
    field: 'total_amount',
    align: 'right' as const,
    sortable: true,
    style: 'width: 120px',
  },
  {
    name: 'status',
    label: 'สถานะ',
    field: 'status',
    align: 'center' as const,
    sortable: true,
    style: 'width: 140px',
  },
  {
    name: 'actions',
    label: 'จัดการ',
    field: 'id',
    align: 'right' as const,
    style: 'width: 120px',
  },
];

function formatQueueNum(num: number): string {
  return String(num).padStart(3, '0');
}

function getTableDisplayName(order: OrderWithItems): string {
  if (order.table_session?.customer_name) {
    return `สั่งกลับบ้าน (${order.table_session.customer_name})`;
  }
  return order.table_session?.table?.name || 'ไม่ระบุโต๊ะ';
}
</script>

<style scoped>
.apple-table-wrapper {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.apple-orders-table {
  background: transparent;
}

.apple-orders-table :deep(thead tr th) {
  background: var(--color-surface-footer, #f5f5f7);
  color: var(--color-muted, #6e6e73);
  font-size: 0.8125rem;
  font-weight: 600;
  border-bottom: 1px solid var(--color-hairline, #d2d2d7);
  padding: 12px 16px;
}

.apple-orders-table :deep(tbody tr td) {
  font-size: 0.875rem;
  border-bottom: 1px solid var(--color-surface-alt, #e8e8ed);
  padding: 12px 16px;
}

.apple-orders-table :deep(tbody tr:last-child td) {
  border-bottom: none;
}

.apple-orders-table :deep(tbody tr:hover) {
  background: var(--color-surface-subtle, #fafafc);
}

/* Queue Pill */
.apple-queue-pill {
  display: inline-flex;
  align-items: baseline;
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 980px;
  padding: 3px 10px;
  font-weight: 700;
}

.queue-hash {
  font-size: 0.75rem;
  color: var(--color-muted, #6e6e73);
  margin-right: 1px;
}

.queue-num {
  font-size: 0.9375rem;
  color: var(--color-primary, #0071e3);
  font-variant-numeric: tabular-nums;
}

/* Items Summary */
.items-cell {
  white-space: normal;
}

.items-summary-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-summary-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
}

.item-qty-badge {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-ink, #1d1d1f);
  font-weight: 700;
  font-size: 0.75rem;
  padding: 1px 6px;
  border-radius: 4px;
}

.item-note-chip {
  display: inline-flex;
  align-items: center;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  color: #92400e;
  padding: 1px 6px;
  border-radius: 4px;
}

.order-price {
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--color-primary, #0071e3);
}

/* Table Actions */
.table-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 980px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-hairline, #d2d2d7);
  background: #ffffff;
  color: var(--color-muted, #6e6e73);
  cursor: pointer;
  outline: none;
  transition: all 0.18s ease;
}

.table-action-btn:hover {
  background: var(--color-surface-subtle, #fafafc);
  border-color: #b0b0b8;
  color: var(--color-ink, #1d1d1f);
}

.table-action-btn--edit:hover {
  color: #c2410c;
  background: #fff7ed;
  border-color: #fed7aa;
}

.table-action-btn--detail:hover {
  color: var(--color-primary, #0071e3);
  background: #eff6ff;
  border-color: #bfdbfe;
}

.table-action-btn--delete:hover {
  color: #dc2626;
  background: #fee2e2;
  border-color: #fecaca;
}

/* Utilities */
.font-code {
  font-family: var(--app-font-code, monospace);
}

.font-tabular {
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-variant-numeric: tabular-nums;
}

.font-weight-500 {
  font-weight: 500;
}

.font-weight-600 {
  font-weight: 600;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

.text-muted-light {
  color: var(--color-muted-light, #86868b);
}
</style>
