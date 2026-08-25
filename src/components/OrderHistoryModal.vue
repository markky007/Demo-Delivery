<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    position="standard"
    class="order-history-dialog"
  >
    <q-card class="order-history-card">
      <!-- Header -->
      <q-card-section class="order-history-header row items-center justify-between q-py-sm q-px-md">
        <div class="row items-center">
          <q-icon name="history" color="primary" size="24px" class="q-mr-sm" />
          <div>
            <div class="text-weight-bold text-subtitle1 text-dark">
              ประวัติรายการก่อนแก้ไข
              <span v-if="queueNumber !== undefined">#{{ formatQueueNumber(queueNumber) }}</span>
            </div>
            <div class="text-caption text-grey-7">
              ตรวจสอบรายการอาหารและตัวเลือกในเวอร์ชันก่อนหน้า
            </div>
          </div>
        </div>
        <q-btn flat round dense icon="close" color="grey-7" v-close-popup />
      </q-card-section>

      <q-separator />

      <!-- Notice Banner (Explicitly stating view-only, not undo) -->
      <div class="history-notice-banner q-mx-md q-mt-md">
        <q-icon name="info" size="18px" color="primary" class="q-mr-xs flex-shrink-0" />
        <span>
          <strong>โหมดตรวจสอบข้อมูล:</strong> หน้านี้แสดงรายการอาหารก่อนที่จะมีการแก้ไข
          (สำหรับดูข้อมูลย้อนหลังเท่านั้น ไม่ใช่การยกเลิกหรือกู้คืนการแก้ไข)
        </span>
      </div>

      <!-- Body Content -->
      <q-card-section class="order-history-body q-pa-md scroll">
        <!-- Loading State -->
        <div v-if="isLoading" class="text-center q-pa-xl text-grey-6">
          <q-spinner color="primary" size="40px" class="q-mb-md" />
          <div>กำลังโหลดประวัติรายการอาหาร...</div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="histories.length === 0"
          class="text-center q-pa-xl text-grey-6 column items-center"
        >
          <q-icon name="history_toggle_off" size="56px" class="text-grey-4 q-mb-sm" />
          <div class="text-weight-bold text-body1 text-grey-8">ไม่พบประวัติรายการก่อนแก้ไข</div>
          <div class="text-caption text-grey-5 q-mt-xs">
            ออเดอร์นี้ยังไม่เคยถูกบันทึกประวัติการแก้ไข หรือเป็นออเดอร์เวอร์ชันแรกเริ่ม
          </div>
        </div>

        <!-- History Revisions List -->
        <div v-else class="q-gutter-y-md">
          <div
            v-for="(hist, hIdx) in histories"
            :key="hist.id || hIdx"
            class="history-version-card"
          >
            <!-- Version Header -->
            <div class="history-version-header row items-center justify-between q-pa-sm">
              <div class="row items-center q-gutter-x-sm">
                <q-badge
                  color="amber-9"
                  text-color="white"
                  class="text-weight-bold q-px-sm q-py-xs"
                >
                  <q-icon name="restore" size="13px" class="q-mr-xs" />
                  เวอร์ชัน {{ hist.revision }}
                  {{ hist.revision === 1 ? ' (ต้นฉบับ)' : '' }}
                </q-badge>
                <span class="text-caption text-grey-7">
                  {{ formatTime(hist.created_at) }} ({{ formatDateTime(hist.created_at) }})
                </span>
              </div>
              <q-badge
                outline
                :color="hist.edited_by === 'KITCHEN' ? 'deep-orange' : 'primary'"
                class="text-caption"
              >
                {{ hist.edited_by === 'KITCHEN' ? 'แก้ไขโดยครัว/ร้าน' : 'แก้ไขโดยลูกค้า' }}
              </q-badge>
            </div>

            <q-separator />

            <!-- Items in this revision -->
            <div class="history-items-list q-pa-sm">
              <div
                v-for="(item, iIdx) in hist.items_snapshot"
                :key="item.id || iIdx"
                class="history-item-row q-py-xs"
              >
                <div class="row justify-between items-start">
                  <div class="col">
                    <div class="row items-baseline">
                      <span class="text-weight-bold text-primary q-mr-sm"
                        >{{ item.quantity }}x</span
                      >
                      <span class="text-weight-bold text-dark">{{ item.snapshot_name }}</span>
                    </div>

                    <!-- Options -->
                    <div
                      v-if="item.options && getVisibleOptions(item.options).length > 0"
                      class="row items-center q-gutter-xs q-mt-xs"
                    >
                      <span
                        v-for="opt in getVisibleOptions(item.options)"
                        :key="opt.id || opt.option_id"
                        class="history-opt-chip"
                        :class="{
                          'history-opt-chip--takeaway': isTakeawayOption(opt.snapshot_option_name),
                        }"
                      >
                        <q-icon
                          v-if="isTakeawayOption(opt.snapshot_option_name)"
                          name="shopping_bag"
                          size="11px"
                          class="q-mr-xs"
                        />
                        {{ opt.snapshot_option_name }}
                        <template v-if="opt.snapshot_price_adjustment > 0">
                          (+{{ formatPrice(opt.snapshot_price_adjustment) }})
                        </template>
                      </span>
                    </div>

                    <!-- Special Instruction -->
                    <div v-if="item.special_instruction" class="history-item-note q-mt-xs">
                      <q-icon name="edit_note" size="14px" class="q-mr-xs text-grey-6" />
                      <span>{{ item.special_instruction }}</span>
                    </div>
                  </div>

                  <div class="text-right text-weight-bold text-grey-9 q-ml-sm">
                    {{ formatPrice(item.subtotal) }}
                  </div>
                </div>
              </div>
            </div>

            <q-separator dashed />

            <!-- Version Subtotal -->
            <div class="row justify-between items-center q-pa-sm history-version-footer">
              <span class="text-caption text-grey-7">
                รวม
                {{ hist.items_snapshot.reduce((acc, it) => acc + (it.quantity || 1), 0) }} รายการ
              </span>
              <div class="row items-baseline q-gutter-x-xs">
                <span class="text-caption text-grey-8">ยอดรวมเวอร์ชันนี้:</span>
                <span class="text-weight-bold text-body1 text-primary">
                  {{ formatPrice(hist.total_amount) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <!-- Footer -->
      <q-card-actions align="right" class="q-pa-md bg-grey-1">
        <q-btn flat rounded no-caps color="grey-8" label="ปิดหน้าต่าง" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { fetchOrderHistory } from 'src/services/orderService';
import { formatPrice, formatQueueNumber, isTakeawayOption } from 'src/utils/formatters';
import type { OrderHistory, OrderHistorySnapshotOption } from 'src/types/database';

const props = defineProps<{
  modelValue: boolean;
  orderId: string;
  queueNumber?: number;
}>();

defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const isLoading = ref(false);
const histories = ref<OrderHistory[]>([]);

watch(
  () => [props.modelValue, props.orderId],
  async ([isOpen, orderId]) => {
    if (isOpen && orderId) {
      await loadHistory(orderId as string);
    }
  },
  { immediate: true },
);

async function loadHistory(id: string) {
  isLoading.value = true;
  try {
    histories.value = await fetchOrderHistory(id);
  } catch (err) {
    console.error('Failed to load order history:', err);
    histories.value = [];
  } finally {
    isLoading.value = false;
  }
}

function getVisibleOptions(options?: OrderHistorySnapshotOption[]): OrderHistorySnapshotOption[] {
  if (!options) return [];
  return options.filter((opt) => {
    const name = opt.snapshot_option_name?.trim();
    // Exclude default "ทานที่ร้าน" to reduce visual clutter if preferred, but keep takeaway
    return name !== 'ทานที่ร้าน';
  });
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
  } catch {
    return iso;
  }
}
</script>

<style scoped>
.order-history-card {
  width: 100%;
  max-width: 550px;
  max-height: 85vh;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
}

.order-history-header {
  background: #ffffff;
}

.order-history-body {
  flex: 1;
  overflow-y: auto;
  background: #f8fafc;
}

.history-notice-banner {
  display: flex;
  align-items: center;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.82rem;
  color: #1e40af;
  line-height: 1.4;
}

.history-version-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.history-version-header {
  background: #f1f5f9;
}

.history-items-list {
  background: #ffffff;
}

.history-item-row {
  border-bottom: 1px dashed #f1f5f9;
}

.history-item-row:last-child {
  border-bottom: none;
}

.history-opt-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f3f4f6;
  color: #374151;
  font-weight: 500;
}

.history-opt-chip--takeaway {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  font-weight: 600;
}

.history-item-note {
  font-size: 0.78rem;
  color: #4b5563;
  background: #f9fafb;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
}

.history-version-footer {
  background: #fafafa;
}
</style>
