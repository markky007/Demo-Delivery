<template>
  <div class="apple-order-card column justify-between">
    <!-- Card Top Body -->
    <div>
      <!-- 1. Header: Queue #, Destination / Table, Status Badge -->
      <div class="card-header row items-center justify-between no-wrap q-mb-sm">
        <div class="row items-center q-gutter-x-xs no-wrap">
          <!-- Monospace Queue Chip -->
          <div class="apple-queue-chip font-code">
            <span class="queue-hash">#</span>
            <span class="queue-num">{{ formatQueueNum(order.queue_number) }}</span>
          </div>

          <!-- Table or Takeaway Pill -->
          <div
            class="destination-pill ellipsis"
            :class="isTakeaway ? 'destination-pill--takeaway' : 'destination-pill--dinein'"
          >
            <q-icon
              :name="isTakeaway ? 'shopping_bag' : 'table_restaurant'"
              size="14px"
              class="q-mr-xs"
            />
            <span class="text-caption font-weight-600 ellipsis">
              {{ destinationName }}
            </span>
          </div>
        </div>

        <!-- Status Badge -->
        <StatusBadge :status="order.status" />
      </div>

      <!-- 2. Timestamp & Item Count Row -->
      <div class="row items-center justify-between text-caption text-muted q-mb-sm q-px-xs">
        <div class="row items-center q-gutter-x-xs">
          <q-icon name="schedule" size="14px" />
          <span>{{ formatTime(order.created_at) }}</span>
          <span class="text-muted-light">•</span>
          <span>{{ formatElapsed(order.created_at) }}</span>
        </div>
        <div class="font-weight-500">{{ order.items?.length || 0 }} รายการ</div>
      </div>

      <div class="card-hairline-separator q-mb-sm"></div>

      <!-- 3. Order Items List -->
      <div class="order-items-list">
        <div v-for="(item, idx) in order.items" :key="item.id || idx" class="order-item-row">
          <div class="row items-start q-gutter-x-sm full-width no-wrap">
            <span class="item-qty-pill font-tabular">{{ item.quantity }}×</span>
            <div class="col min-width-0">
              <div class="row items-center justify-between no-wrap">
                <span class="item-title font-weight-600 ellipsis">
                  {{ item.snapshot_name }}
                </span>
                <span class="item-subtotal text-caption font-tabular text-muted">
                  {{ formatPrice(item.subtotal) }}
                </span>
              </div>

              <!-- Options Tags -->
              <div v-if="item.options && item.options.length > 0" class="options-tags-row q-mt-xs">
                <span v-for="opt in item.options" :key="opt.id" class="opt-tag">
                  {{ opt.snapshot_option_name }}
                </span>
              </div>

              <!-- Special Cooking Instruction -->
              <div v-if="item.special_instruction" class="note-box q-mt-xs">
                <q-icon name="edit_note" size="15px" class="q-mr-xs note-icon" />
                <span class="note-text text-caption">{{ item.special_instruction }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Card Bottom Footer: Total & Actions -->
    <div class="card-footer q-mt-md">
      <div class="card-hairline-separator q-mb-sm"></div>
      <div class="row items-center justify-between">
        <div>
          <span class="text-caption text-muted block">ยอดรวม</span>
          <span class="order-total-price font-tabular">
            {{ formatPrice(order.total_amount) }}
          </span>
        </div>

        <!-- Action Buttons -->
        <div class="row items-center q-gutter-x-xs">
          <!-- Edit Order Items -->
          <button
            type="button"
            class="card-action-pill card-action-pill--edit"
            @click="$emit('edit', order)"
          >
            <q-icon name="edit_note" size="16px" class="q-mr-xs" />
            <span>แก้ไข</span>
            <q-tooltip class="bg-dark">แก้ไขรายการอาหาร</q-tooltip>
          </button>

          <!-- View Details Modal -->
          <button
            type="button"
            class="card-action-pill card-action-pill--detail"
            @click="$emit('viewDetails', order)"
          >
            <q-icon name="visibility" size="15px" class="q-mr-xs" />
            <span>รายละเอียด</span>
            <q-tooltip class="bg-dark">ดูรายละเอียดออเดอร์</q-tooltip>
          </button>

          <!-- Delete Order Button -->
          <button
            type="button"
            class="card-action-icon card-action-icon--delete"
            @click="$emit('deleteOrder', order)"
          >
            <q-icon name="delete_outline" size="17px" />
            <q-tooltip class="bg-negative">ลบออเดอร์และล้างเซสชันโต๊ะ</q-tooltip>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { OrderWithItems } from 'src/types/database';
import { formatPrice, formatTime, formatElapsed } from 'src/utils/formatters';
import StatusBadge from 'src/components/StatusBadge.vue';

const props = defineProps<{
  order: OrderWithItems;
}>();

defineEmits<{
  (e: 'viewDetails', order: OrderWithItems): void;
  (e: 'edit', order: OrderWithItems): void;
  (e: 'deleteOrder', order: OrderWithItems): void;
}>();

const isTakeaway = computed(() => Boolean(props.order.table_session?.customer_name));

const destinationName = computed(() => {
  if (props.order.table_session?.customer_name) {
    return `กลับบ้าน (${props.order.table_session.customer_name})`;
  }
  return props.order.table_session?.table?.name || 'ไม่ระบุโต๊ะ';
});

function formatQueueNum(num: number): string {
  return String(num).padStart(3, '0');
}
</script>

<style scoped>
.apple-order-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 20px;
  padding: 16px 18px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.apple-order-card:hover {
  transform: translateY(-2px);
  border-color: #b0b0b8;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
}

/* Monospace Queue Chip */
.apple-queue-chip {
  display: inline-flex;
  align-items: baseline;
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  color: var(--color-ink, #1d1d1f);
  border-radius: 8px;
  padding: 3px 8px;
  font-weight: 700;
  line-height: 1;
}

.queue-hash {
  font-size: 0.75rem;
  color: var(--color-muted, #6e6e73);
  margin-right: 1px;
}

.queue-num {
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-primary, #0071e3);
}

/* Destination Pill */
.destination-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 980px;
  max-width: 150px;
}

.destination-pill--dinein {
  background: #f5f5f7;
  color: var(--color-ink, #1d1d1f);
  border: 1px solid var(--color-hairline, #d2d2d7);
}

.destination-pill--takeaway {
  background: #fff8e1;
  color: #b45309;
  border: 1px solid #fef3c7;
}

.card-hairline-separator {
  height: 1px;
  background: var(--color-surface-alt, #e8e8ed);
  width: 100%;
}

/* Items List */
.order-items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 2px;
}

.order-item-row {
  padding: 4px 0;
}

.item-qty-pill {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-ink, #1d1d1f);
  font-weight: 700;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 6px;
  flex-shrink: 0;
  line-height: 1.2;
}

.item-title {
  font-size: 0.875rem;
  color: var(--color-ink, #1d1d1f);
}

.item-subtotal {
  font-size: 0.8125rem;
  flex-shrink: 0;
  margin-left: 8px;
}

.options-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.opt-tag {
  background: var(--color-surface-subtle, #fafafc);
  color: var(--color-muted, #6e6e73);
  border: 1px solid var(--color-hairline, #d2d2d7);
  padding: 1px 6px;
  border-radius: 980px;
  font-size: 0.6875rem;
}

.note-box {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  padding: 2px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
}

.note-icon {
  color: #d97706;
  flex-shrink: 0;
}

.note-text {
  color: #92400e;
  font-size: 0.75rem;
}

/* Order Total Price */
.order-total-price {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-primary, #0071e3);
  line-height: 1.2;
}

/* Action Buttons */
.card-action-pill {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-hairline, #d2d2d7);
  background: #ffffff;
  color: var(--color-ink, #1d1d1f);
  padding: 4px 10px;
  border-radius: 980px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.18s ease;
}

.card-action-pill:hover {
  background: var(--color-surface-subtle, #fafafc);
  border-color: #b0b0b8;
}

.card-action-pill--edit:hover {
  color: #c2410c;
  background: #fff7ed;
  border-color: #fed7aa;
}

.card-action-pill--detail:hover {
  color: var(--color-primary, #0071e3);
  background: #eff6ff;
  border-color: #bfdbfe;
}

.card-action-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 980px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-muted, #6e6e73);
  cursor: pointer;
  outline: none;
  transition: all 0.18s ease;
}

.card-action-icon--delete:hover {
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

.text-muted {
  color: var(--color-muted, #6e6e73);
}

.text-muted-light {
  color: var(--color-muted-light, #86868b);
}

.min-width-0 {
  min-width: 0;
}
</style>
