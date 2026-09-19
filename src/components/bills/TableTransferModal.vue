<template>
  <div>
    <!-- Main Transfer & Merge Modal Dialog -->
    <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
      <q-card class="apple-modal-card">
        <!-- Dialog Header -->
        <q-card-section class="q-pb-sm">
          <div class="row items-center justify-between no-wrap">
            <div class="row items-center q-gutter-x-sm">
              <div
                class="modal-avatar"
                :class="{ 'modal-avatar--amber': selectedTargetIsOccupied }"
              >
                <q-icon
                  :name="selectedTargetIsOccupied ? 'merge_type' : 'swap_horiz'"
                  size="22px"
                />
              </div>
              <div>
                <div class="modal-title">
                  {{ selectedTargetIsOccupied ? 'รวมโต๊ะอาหาร (Table Merge)' : 'ขอย้ายโต๊ะอาหาร' }}
                </div>
                <div class="modal-subtitle">
                  {{
                    selectedTargetIsOccupied
                      ? 'รวมออเดอร์และยอดบิลเข้ากับโต๊ะที่มีลูกค้านั่งอยู่แล้ว'
                      : 'โอนย้ายออเดอร์และบิลทั้งหมดไปยังโต๊ะใหม่ หรือสั่งกลับบ้าน'
                  }}
                </div>
              </div>
            </div>
            <q-btn icon="close" flat round dense v-close-popup class="text-muted" />
          </div>

          <!-- Current Source Table Summary -->
          <div v-if="tableToTransfer" class="source-table-card q-mt-md">
            <div class="row items-center justify-between">
              <div class="row items-center">
                <q-icon name="table_restaurant" size="18px" class="q-mr-xs text-primary" />
                <span class="text-weight-bold text-ink">
                  {{
                    tableToTransfer.isTakeaway && tableToTransfer.session?.customer_name
                      ? `สั่งกลับบ้าน (${tableToTransfer.session.customer_name})`
                      : tableToTransfer.table.name
                  }}
                </span>
              </div>
              <span class="text-caption text-muted font-tabular">
                {{ tableToTransfer.orderCount }} ออเดอร์ •
                {{ formatPrice(tableToTransfer.totalAmount) }}
              </span>
            </div>
          </div>
        </q-card-section>

        <!-- Dialog Body: Select Target Table -->
        <q-card-section class="q-py-sm">
          <div class="row items-center justify-between q-mb-sm">
            <span class="section-label">เลือกโต๊ะปลายทาง:</span>
            <!-- Filter Pills -->
            <div class="apple-mini-filter">
              <button
                type="button"
                class="mini-filter-pill"
                :class="{ 'mini-filter-pill--active': transferFilter === 'all' }"
                @click="$emit('update:transferFilter', 'all')"
              >
                ทั้งหมด ({{ allTargetTables.length }})
              </button>
              <button
                type="button"
                class="mini-filter-pill"
                :class="{ 'mini-filter-pill--active': transferFilter === 'empty' }"
                @click="$emit('update:transferFilter', 'empty')"
              >
                ว่าง ({{ allTargetTables.filter((t) => !t.isOccupied).length }})
              </button>
              <button
                type="button"
                class="mini-filter-pill"
                :class="{ 'mini-filter-pill--active': transferFilter === 'occupied' }"
                @click="$emit('update:transferFilter', 'occupied')"
              >
                รวมโต๊ะ ({{ allTargetTables.filter((t) => t.isOccupied).length }})
              </button>
            </div>
          </div>

          <!-- Empty filtered target list -->
          <div
            v-if="filteredTargetTables.length === 0"
            class="empty-targets-box text-center q-pa-md"
          >
            <q-icon name="info" size="24px" class="text-muted q-mb-xs" />
            <div class="text-weight-bold text-ink">ไม่พบโต๊ะในหมวดหมู่นี้</div>
            <div class="text-caption text-muted">
              ลองเลือกตัวกรอง "ทั้งหมด" เพื่อดูโต๊ะทั้งหมดในร้าน
            </div>
          </div>

          <!-- Target Tables Grid -->
          <div v-else class="targets-grid">
            <div
              v-for="targetTbl in filteredTargetTables"
              :key="targetTbl.table.id"
              class="target-item"
              :class="{
                'target-item--selected': selectedTargetTableId === targetTbl.table.id,
                'target-item--occupied': targetTbl.isOccupied,
                'target-item--takeaway': targetTbl.isTakeaway,
              }"
              @click="$emit('select-target', targetTbl)"
            >
              <div class="row items-center justify-between no-wrap">
                <div class="row items-center ellipsis q-mr-xs">
                  <q-icon
                    :name="
                      targetTbl.isTakeaway
                        ? 'shopping_bag'
                        : targetTbl.isOccupied
                          ? 'group'
                          : 'table_restaurant'
                    "
                    size="18px"
                    class="q-mr-xs"
                    :class="{
                      'text-orange-9': targetTbl.isTakeaway,
                      'text-amber-9': targetTbl.isOccupied,
                      'text-muted': !targetTbl.isOccupied && !targetTbl.isTakeaway,
                    }"
                  />
                  <span class="target-name ellipsis">{{ targetTbl.table.name }}</span>
                </div>

                <div>
                  <q-icon
                    v-if="selectedTargetTableId === targetTbl.table.id"
                    name="check_circle"
                    size="18px"
                    :color="targetTbl.isOccupied ? 'amber-9' : 'primary'"
                  />
                  <span
                    v-else-if="targetTbl.isTakeaway"
                    class="target-badge target-badge--takeaway"
                  >
                    กลับบ้าน
                  </span>
                  <span
                    v-else-if="targetTbl.isOccupied"
                    class="target-badge target-badge--occupied"
                  >
                    รวมโต๊ะ
                  </span>
                  <span v-else class="target-badge target-badge--free"> ว่าง </span>
                </div>
              </div>

              <div
                v-if="targetTbl.isOccupied"
                class="target-sub text-caption font-tabular q-mt-xs ellipsis"
              >
                {{ targetTbl.orderCount }} ออเดอร์ • {{ formatPrice(targetTbl.totalAmount) }}
              </div>
            </div>
          </div>

          <!-- Customer Name Input when Target is Takeaway -->
          <div v-if="selectedTargetIsTakeaway" class="takeaway-name-box q-mt-sm">
            <div class="text-caption text-weight-bold text-orange-10 q-mb-xs row items-center">
              <q-icon name="person" size="15px" class="q-mr-xs" />
              <span>ชื่อลูกค้าสำหรับสั่งกลับบ้าน (ระบุหรือไม่ก็ได้):</span>
            </div>
            <q-input
              :model-value="transferCustomerName"
              @update:model-value="$emit('update:transferCustomerName', String($event ?? ''))"
              outlined
              dense
              :placeholder="`เช่น คุณสมชาย (ค่าเริ่มต้น: 'ลูกค้าจาก ${tableToTransfer?.table.name || 'โต๊ะเดิม'}')`"
              class="apple-text-input"
            />
          </div>

          <!-- Merge Preview Box when Target is Occupied Table -->
          <div
            v-if="selectedTargetIsOccupied && selectedTargetTable && tableToTransfer"
            class="merge-preview-card q-mt-md"
          >
            <div class="row items-center text-amber-10 text-weight-bold text-caption q-mb-xs">
              <q-icon name="merge_type" size="16px" class="q-mr-xs" />
              <span>สรุปข้อมูลการรวมโต๊ะ (Merge Preview)</span>
            </div>

            <div class="merge-breakdown q-my-xs">
              <div class="row items-center justify-between text-caption text-grey-8">
                <span>{{ tableToTransfer.table.name }} (โต๊ะต้นทาง):</span>
                <span class="font-tabular font-weight-600">
                  {{ tableToTransfer.orderCount }} ออเดอร์ •
                  {{ formatPrice(tableToTransfer.totalAmount) }}
                </span>
              </div>
              <div class="row items-center justify-between text-caption text-grey-8 q-mt-xs">
                <span>{{ selectedTargetTable.table.name }} (โต๊ะปลายทาง):</span>
                <span class="font-tabular font-weight-600">
                  {{ selectedTargetTable.orderCount }} ออเดอร์ •
                  {{ formatPrice(selectedTargetTable.totalAmount) }}
                </span>
              </div>
              <div class="divider q-my-xs"></div>
              <div
                class="row items-center justify-between text-caption text-weight-bolder text-amber-10"
              >
                <span>รวมทั้งหมดที่ {{ selectedTargetTable.table.name }}:</span>
                <span class="font-tabular">
                  {{ tableToTransfer.orderCount + selectedTargetTable.orderCount }} ออเดอร์ •
                  {{ formatPrice(tableToTransfer.totalAmount + selectedTargetTable.totalAmount) }}
                </span>
              </div>
            </div>

            <div class="text-caption font-size-11 text-muted q-mt-xs">
              💡 เมื่อรวมโต๊ะ ออเดอร์จะโอนไปที่
              <strong>{{ selectedTargetTable.table.name }}</strong> และ
              <strong>{{ tableToTransfer.table.name }}</strong> จะกลับเป็น
              <strong class="text-positive">"โต๊ะว่าง"</strong> ทันที
            </div>
          </div>
        </q-card-section>

        <!-- Actions -->
        <q-card-actions align="stretch" class="column q-gutter-y-xs q-pa-md">
          <q-btn
            unelevated
            no-caps
            :class="[
              'apple-pill-btn full-width',
              selectedTargetIsOccupied ? 'apple-pill-btn--amber' : 'apple-pill-btn--primary',
            ]"
            :icon="selectedTargetIsOccupied ? 'merge_type' : 'swap_horiz'"
            :label="
              selectedTargetTableId
                ? selectedTargetIsOccupied
                  ? `ดำเนินการรวมโต๊ะเข้ากับ ${selectedTargetTable?.table.name}`
                  : `ยืนยันย้ายไป ${selectedTargetTable?.table.name || 'โต๊ะใหม่'}`
                : 'กรุณาเลือกโต๊ะปลายทาง'
            "
            :disabled="!selectedTargetTableId || allTargetTables.length === 0"
            :loading="isTransferring"
            @click="$emit('confirm-transfer')"
          />
          <q-btn
            flat
            no-caps
            label="ยกเลิก"
            v-close-popup
            class="apple-pill-btn apple-pill-btn--flat full-width text-muted"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Safety Confirmation Dialog to Prevent Accidental Moves/Merges -->
    <q-dialog :model-value="showMergeConfirmDialog" persistent>
      <q-card class="apple-modal-card apple-modal-card--confirm">
        <q-card-section class="text-center q-pb-none">
          <div
            class="confirm-icon-wrap q-mx-auto q-mb-sm"
            :class="{ 'confirm-icon-wrap--amber': selectedTargetIsOccupied }"
          >
            <q-icon :name="selectedTargetIsOccupied ? 'merge_type' : 'swap_horiz'" size="28px" />
          </div>
          <div class="modal-title">
            {{ selectedTargetIsOccupied ? 'ยืนยันการรวมโต๊ะอาหาร' : 'ยืนยันการย้ายโต๊ะอาหาร' }}
          </div>
          <div class="modal-subtitle q-mt-xs">
            {{
              selectedTargetIsOccupied
                ? 'กรุณาตรวจสอบข้อมูลก่อนรวมโต๊ะ รายการนี้ไม่สามารถย้อนกลับอัตโนมัติได้'
                : 'ต้องการย้ายรายการทั้งหมดไปยังโต๊ะใหม่หรือไม่'
            }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div
            v-if="selectedTargetIsOccupied && selectedTargetTable && tableToTransfer"
            class="merge-summary-box q-pa-sm q-mb-sm"
          >
            <div class="row items-center justify-between text-caption q-mb-xs">
              <span class="text-muted">โต๊ะต้นทาง (จะเคลียร์ว่าง):</span>
              <span class="text-weight-bold text-negative">
                {{ tableToTransfer.table.name }} ({{ tableToTransfer.orderCount }} รายการ •
                {{ formatPrice(tableToTransfer.totalAmount) }})
              </span>
            </div>
            <div class="row items-center justify-between text-caption q-mb-xs">
              <span class="text-muted">โต๊ะปลายทาง (โต๊ะรวม):</span>
              <span class="text-weight-bold text-primary">
                {{ selectedTargetTable.table.name }} ({{ selectedTargetTable.orderCount }} รายการ •
                {{ formatPrice(selectedTargetTable.totalAmount) }})
              </span>
            </div>
            <div class="divider q-my-xs"></div>
            <div
              class="row items-center justify-between text-body2 text-weight-bolder text-amber-10"
            >
              <span>ยอดเงินรวมบิลใหม่:</span>
              <span class="font-tabular">
                {{ formatPrice(tableToTransfer.totalAmount + selectedTargetTable.totalAmount) }}
              </span>
            </div>
          </div>

          <div
            class="notice-box q-pa-sm"
            :class="{ 'notice-box--amber': selectedTargetIsOccupied }"
          >
            <div class="row items-start no-wrap">
              <q-icon
                :name="selectedTargetIsOccupied ? 'warning' : 'info'"
                size="16px"
                class="q-mr-xs q-mt-xs"
              />
              <div class="text-caption font-size-11">
                <template v-if="selectedTargetIsOccupied">
                  ออเดอร์ทั้งหมดจะถูกรวมเข้ากับ
                  <strong>{{ selectedTargetTable?.table.name }}</strong> และ
                  <strong>{{ tableToTransfer?.table.name }}</strong>
                  จะถูกเคลียร์กลับเป็นโต๊ะว่างทันที
                </template>
                <template v-else>
                  ออเดอร์ทั้งหมดจะย้ายไปที่
                  <strong>{{ selectedTargetTable?.table.name }}</strong> และ
                  <strong>{{ tableToTransfer?.table.name }}</strong> จะกลับเป็นโต๊ะว่าง
                </template>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="stretch" class="column q-gutter-y-xs q-pa-md">
          <q-btn
            unelevated
            no-caps
            :class="[
              'apple-pill-btn full-width',
              selectedTargetIsOccupied ? 'apple-pill-btn--amber' : 'apple-pill-btn--primary',
            ]"
            :icon="selectedTargetIsOccupied ? 'merge_type' : 'swap_horiz'"
            :label="selectedTargetIsOccupied ? 'ยืนยันรวมโต๊ะ' : 'ยืนยันย้ายโต๊ะ'"
            :loading="isTransferring"
            @click="$emit('execute-transfer')"
          />
          <q-btn
            flat
            no-caps
            label="ยกเลิก / ตรวจสอบอีกครั้ง"
            class="apple-pill-btn apple-pill-btn--flat full-width text-muted"
            :disable="isTransferring"
            @click="$emit('close-confirm-dialog')"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { formatPrice } from 'src/utils/formatters';
import type { TableWithQR } from 'src/types/database';
import type { TableCardItem, TransferSourceTable } from 'src/types/tableCard';

export interface TargetTableOption {
  table: TableWithQR;
  isTakeaway: boolean;
  isOccupied: boolean;
  orderCount: number;
  totalAmount: number;
  customerName?: string | null | undefined;
}

defineProps<{
  modelValue: boolean;
  tableToTransfer: TableCardItem | TransferSourceTable | null;
  allTargetTables: TargetTableOption[];
  filteredTargetTables: TargetTableOption[];
  selectedTargetTableId: string | null;
  selectedTargetTable: TargetTableOption | null;
  selectedTargetIsOccupied: boolean;
  selectedTargetIsTakeaway: boolean;
  transferCustomerName: string;
  transferFilter: 'all' | 'empty' | 'occupied';
  isTransferring: boolean;
  showMergeConfirmDialog: boolean;
}>();

defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'update:transferFilter', filter: 'all' | 'empty' | 'occupied'): void;
  (e: 'update:transferCustomerName', name: string): void;
  (e: 'select-target', target: TargetTableOption): void;
  (e: 'confirm-transfer'): void;
  (e: 'execute-transfer'): void;
  (e: 'close-confirm-dialog'): void;
}>();
</script>

<style scoped>
.apple-modal-card {
  width: 100%;
  max-width: 520px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
}

.apple-modal-card--confirm {
  max-width: 440px;
}

.modal-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 113, 227, 0.1);
  color: var(--color-primary, #0071e3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-avatar--amber {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-ink, #1d1d1f);
}

.modal-subtitle {
  font-size: 0.75rem;
  color: var(--color-muted, #6e6e73);
}

.source-table-card {
  background: var(--color-surface-footer, #f5f5f7);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 12px;
  padding: 10px 14px;
}

.section-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink, #1d1d1f);
}

/* Apple Mini Filter */
.apple-mini-filter {
  display: inline-flex;
  align-items: center;
  background: var(--color-surface-footer, #f5f5f7);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 980px;
  padding: 2px;
  gap: 2px;
}

.mini-filter-pill {
  border: none;
  background: transparent;
  color: var(--color-muted, #6e6e73);
  padding: 3px 10px;
  border-radius: 980px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.15s ease;
}

.mini-filter-pill--active {
  background: #ffffff;
  color: var(--color-ink, #1d1d1f);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* Targets Grid */
.targets-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  padding: 2px;
}

@media (max-width: 480px) {
  .targets-grid {
    grid-template-columns: 1fr;
  }
}

.target-item {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.target-item:hover {
  border-color: #b0b0b8;
  background: var(--color-surface-subtle, #fafafc);
}

.target-item--selected {
  border-color: var(--color-primary, #0071e3);
  background: rgba(0, 113, 227, 0.04);
}

.target-item--occupied.target-item--selected {
  border-color: #d97706;
  background: rgba(245, 158, 11, 0.04);
}

.target-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-ink, #1d1d1f);
}

.target-sub {
  color: #b45309;
}

.target-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 980px;
}

.target-badge--free {
  background: rgba(52, 199, 89, 0.12);
  color: #15803d;
}

.target-badge--occupied {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.target-badge--takeaway {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-ink, #1d1d1f);
}

/* Takeaway Name Box */
.takeaway-name-box {
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 12px;
  padding: 10px 12px;
}

/* Merge Preview Card */
.merge-preview-card {
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 12px;
  padding: 12px;
}

.divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
}

/* Confirm Dialog */
.confirm-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(0, 113, 227, 0.1);
  color: var(--color-primary, #0071e3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-icon-wrap--amber {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
}

.merge-summary-box {
  background: var(--color-surface-footer, #f5f5f7);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 12px;
}

.notice-box {
  background: rgba(0, 113, 227, 0.06);
  color: var(--color-primary, #0071e3);
  border-radius: 10px;
}

.notice-box--amber {
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
}

/* Apple Buttons */
.apple-pill-btn {
  border-radius: 980px !important;
  font-size: 0.875rem;
  font-weight: 600;
  height: 40px;
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
}

.apple-pill-btn--primary:hover {
  background: #0066cc !important;
}

.apple-pill-btn--amber {
  background: #d97706 !important;
  color: #ffffff !important;
}

.apple-pill-btn--amber:hover {
  background: #b45309 !important;
}

.apple-pill-btn--flat {
  background: transparent !important;
}

.apple-text-input :deep(.q-field__control) {
  border-radius: 8px;
  background: #ffffff;
}

.font-tabular {
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-variant-numeric: tabular-nums;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

.font-size-11 {
  font-size: 0.6875rem;
}
</style>
