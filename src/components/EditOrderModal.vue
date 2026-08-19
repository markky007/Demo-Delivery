<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    position="bottom"
    class="edit-order-dialog"
    maximized-mobile
  >
    <q-card class="edit-order-card">
      <!-- Header -->
      <q-card-section class="edit-order-header row items-center justify-between q-py-sm q-px-md">
        <div class="row items-center">
          <q-icon name="edit_note" color="primary" size="24px" class="q-mr-sm" />
          <div>
            <div class="text-weight-bold text-subtitle1 text-dark">
              แก้ไขออเดอร์ #{{ formatQueueNumber(order.queue_number) }}
            </div>
            <div class="text-caption text-grey-7">สามารถแก้ไขได้ก่อนร้านเริ่มทำอาหาร</div>
          </div>
        </div>
        <q-btn flat round dense icon="close" color="grey-7" v-close-popup />
      </q-card-section>

      <q-separator />

      <!-- Body / Items List -->
      <q-card-section class="edit-order-body q-pa-md scroll">
        <!-- Notice Banner -->
        <div class="edit-notice-banner q-mb-md">
          <q-icon name="info" size="18px" class="q-mr-xs text-primary flex-shrink-0" />
          <span> ปรับเปลี่ยนจำนวน แก้ไขหมายเหตุ หรือเพิ่ม/ลดรายการได้ตามต้องการ </span>
        </div>

        <div v-if="items.length === 0" class="text-center q-pa-lg text-grey-6">
          <q-icon name="remove_shopping_cart" size="48px" class="q-mb-sm text-grey-4" />
          <div>ยังไม่มีรายการอาหารในออเดอร์นี้</div>
          <div class="text-caption text-grey-5">กรุณาเพิ่มรายการอาหารอย่างน้อย 1 รายการ</div>
        </div>

        <!-- Editable Items List -->
        <div class="q-gutter-y-sm">
          <div v-for="(item, index) in items" :key="item.temp_id" class="edit-item-card">
            <div class="row justify-between items-start">
              <div class="col">
                <div class="text-weight-bold text-body1 text-dark">
                  {{ item.name }}
                </div>

                <!-- Selected Options Chips -->
                <div
                  v-if="item.selected_options && item.selected_options.length > 0"
                  class="row items-center q-gutter-xs q-mt-xs"
                >
                  <span
                    v-for="opt in item.selected_options"
                    :key="opt.option_id"
                    class="opt-chip"
                    :class="{ 'opt-chip--takeaway': isTakeawayOption(opt.name) }"
                  >
                    <q-icon
                      v-if="isTakeawayOption(opt.name)"
                      name="shopping_bag"
                      size="12px"
                      class="q-mr-xs"
                    />
                    {{ opt.name }}
                    <template v-if="opt.price_adjustment > 0">
                      (+{{ formatPrice(opt.price_adjustment) }})
                    </template>
                  </span>
                </div>

                <!-- Special Instruction Input -->
                <div class="q-mt-sm">
                  <q-input
                    v-model="item.special_instruction"
                    dense
                    outlined
                    placeholder="หมายเหตุเพิ่มเติม (เช่น ไม่ใส่ผัก, เผ็ดน้อย)..."
                    :maxlength="200"
                    class="item-instruction-input"
                  >
                    <template #prepend>
                      <q-icon name="edit_note" size="18px" color="grey-6" />
                    </template>
                  </q-input>
                </div>
              </div>

              <!-- Delete Button -->
              <q-btn
                flat
                round
                dense
                icon="delete_outline"
                color="negative"
                size="sm"
                class="q-ml-sm"
                @click="removeItem(index)"
                aria-label="ลบรายการนี้"
              />
            </div>

            <!-- Price & Quantity Row -->
            <div class="row justify-between items-center q-mt-md pt-border">
              <div class="text-weight-bold text-primary text-subtitle1">
                {{ formatPrice(calculateItemSubtotal(item)) }}
              </div>
              <div class="row items-center">
                <QuantityStepper v-model="item.quantity" :min="1" dense />
              </div>
            </div>
          </div>
        </div>

        <!-- Add More Items Button -->
        <div class="q-mt-md text-center">
          <q-btn
            outline
            rounded
            no-caps
            color="primary"
            class="full-width add-item-btn"
            @click="openAddMenuDialog"
          >
            <q-icon name="add_circle_outline" size="18px" class="q-mr-xs" />
            <span>เพิ่มรายการอาหารอื่นในออเดอร์นี้</span>
          </q-btn>
        </div>
      </q-card-section>

      <q-separator />

      <!-- Footer Summary & Action -->
      <q-card-actions class="edit-order-footer q-pa-md">
        <div class="row justify-between items-center full-width q-mb-sm">
          <span class="text-subtitle2 text-grey-8">ยอดรวมใหม่ ({{ totalCount }} รายการ):</span>
          <span class="text-h6 text-weight-bold text-primary">
            {{ formatPrice(totalAmount) }}
          </span>
        </div>

        <div class="row q-gutter-x-sm full-width">
          <div class="col-4">
            <q-btn
              flat
              no-caps
              rounded
              color="grey-7"
              class="full-width cancel-btn"
              label="ยกเลิก"
              v-close-popup
              :disable="isSaving"
            />
          </div>
          <div class="col">
            <q-btn
              unelevated
              no-caps
              rounded
              color="primary"
              class="full-width save-btn"
              :loading="isSaving"
              :disable="items.length === 0"
              @click="saveOrderChanges"
            >
              <q-icon name="check" size="18px" class="q-mr-xs" />
              <span>บันทึกการแก้ไข</span>
            </q-btn>
          </div>
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Nested Dialog for Adding / Customizing a Menu Item -->
  <q-dialog v-model="showAddItemDialog" position="bottom" maximized-mobile>
    <q-card class="add-menu-card">
      <q-card-section class="row items-center justify-between q-py-sm q-px-md">
        <div class="text-weight-bold text-subtitle1">เลือกรายการอาหารเพื่อเพิ่ม</div>
        <q-btn flat round dense icon="close" color="grey-7" v-close-popup />
      </q-card-section>
      <q-separator />

      <!-- Step 1: Select dish from active menu -->
      <q-card-section v-if="!selectedMenuItem" class="add-menu-body q-pa-md scroll">
        <div v-if="menuStore.isLoading" class="text-center q-pa-md">
          <q-spinner color="primary" size="32px" />
        </div>
        <template v-else>
          <div v-for="category in menuStore.activeCategories" :key="category.id" class="q-mb-md">
            <div class="text-weight-bold text-caption text-grey-7 q-mb-xs">
              {{ category.name }}
            </div>
            <div class="q-gutter-y-xs">
              <div
                v-for="dish in menuStore.itemsByCategory(category.id)"
                :key="dish.id"
                class="menu-selection-row row items-center justify-between q-pa-sm"
                :class="{ 'menu-selection-row--disabled': !dish.is_available }"
                @click="dish.is_available ? selectDishToAdd(dish.id) : null"
              >
                <div>
                  <div class="text-weight-medium text-body2 text-dark">{{ dish.name }}</div>
                  <div class="text-caption text-grey-6">{{ formatPrice(dish.base_price) }}</div>
                </div>
                <div>
                  <q-badge v-if="!dish.is_available" color="grey-5" label="หมด" />
                  <q-icon v-else name="chevron_right" color="grey-5" size="20px" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </q-card-section>

      <!-- Step 2: Configure options & quantity for chosen dish -->
      <q-card-section v-else class="add-menu-body q-pa-md scroll">
        <div class="row items-center justify-between q-mb-sm">
          <div>
            <div class="text-weight-bold text-h6 text-dark">{{ selectedMenuItem.name }}</div>
            <div class="text-subtitle2 text-primary font-weight-bold">
              {{ formatPrice(selectedMenuItem.base_price) }}
            </div>
          </div>
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            label="เปลี่ยนเมนู"
            @click="selectedMenuItem = null"
          />
        </div>

        <!-- Option groups -->
        <div
          v-for="group in selectedMenuItem.option_groups"
          :key="group.id"
          class="option-group-card q-mt-sm"
        >
          <div class="row items-center justify-between q-mb-xs">
            <div class="option-group-name">{{ group.name }}</div>
            <span
              class="group-tag"
              :class="group.is_required ? 'group-tag--required' : 'group-tag--optional'"
            >
              {{ group.is_required ? 'ต้องเลือก' : 'เลือกเพิ่มได้' }}
            </span>
          </div>

          <!-- Single Select -->
          <div v-if="group.selection_type === 'single'" class="options-list">
            <div
              v-for="opt in group.options"
              :key="opt.id"
              class="option-row"
              :class="{
                'option-row--selected': newDishSingleOptions[group.id] === opt.id,
                'option-row--disabled': !opt.is_available,
              }"
              @click="toggleSingleOption(group, opt.id, opt.is_available)"
            >
              <div class="row items-center">
                <q-radio
                  :model-value="newDishSingleOptions[group.id]"
                  :val="opt.id"
                  :disable="!opt.is_available"
                  color="primary"
                  dense
                  class="q-mr-sm pointer-events-none"
                />
                <span class="option-name">{{ opt.name }}</span>
              </div>
              <div class="option-price-adjust">
                <span v-if="opt.price_adjustment > 0"
                  >+{{ formatPrice(opt.price_adjustment) }}</span
                >
                <span v-else-if="opt.price_adjustment < 0">{{
                  formatPrice(opt.price_adjustment)
                }}</span>
                <span v-else class="text-grey-5">—</span>
              </div>
            </div>
          </div>

          <!-- Multi Select -->
          <div v-else class="options-list">
            <div
              v-for="opt in group.options"
              :key="opt.id"
              class="option-row"
              :class="{
                'option-row--selected': newDishMultiOptions[group.id]?.includes(opt.id),
                'option-row--disabled':
                  !opt.is_available ||
                  (group.max_selections !== null &&
                    (newDishMultiOptions[group.id]?.length ?? 0) >= group.max_selections &&
                    !newDishMultiOptions[group.id]?.includes(opt.id)),
              }"
              @click="toggleMultiOption(group.id, opt.id, group.max_selections, opt.is_available)"
            >
              <div class="row items-center">
                <q-checkbox
                  :model-value="newDishMultiOptions[group.id]?.includes(opt.id)"
                  :disable="
                    !opt.is_available ||
                    (group.max_selections !== null &&
                      (newDishMultiOptions[group.id]?.length ?? 0) >= group.max_selections &&
                      !newDishMultiOptions[group.id]?.includes(opt.id))
                  "
                  color="primary"
                  dense
                  class="q-mr-sm pointer-events-none"
                />
                <span class="option-name">{{ opt.name }}</span>
              </div>
              <div class="option-price-adjust">
                <span v-if="opt.price_adjustment > 0"
                  >+{{ formatPrice(opt.price_adjustment) }}</span
                >
                <span v-else-if="opt.price_adjustment < 0">{{
                  formatPrice(opt.price_adjustment)
                }}</span>
                <span v-else class="text-grey-5">—</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Special Instruction -->
        <div class="option-group-card q-mt-sm">
          <div class="option-group-name q-mb-xs">หมายเหตุเพิ่มเติม</div>
          <q-input
            v-model="newDishInstruction"
            outlined
            dense
            placeholder="ระบุข้อความถึงร้าน..."
            :maxlength="200"
          />
        </div>

        <!-- Quantity Stepper -->
        <div class="row items-center justify-between q-mt-md q-pa-sm bg-grey-1 rounded-borders">
          <span class="text-weight-bold">จำนวน</span>
          <QuantityStepper v-model="newDishQuantity" :min="1" />
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions v-if="selectedMenuItem" class="q-pa-md">
        <q-btn
          unelevated
          rounded
          no-caps
          color="primary"
          class="full-width"
          :disable="!isNewDishValid"
          @click="confirmAddDishToOrder"
        >
          <div class="row items-center justify-between full-width q-px-sm">
            <span>เพิ่มเมนูนี้ลงในออเดอร์</span>
            <span>{{ formatPrice(newDishTotal) }}</span>
          </div>
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useNotify } from 'src/composables/useNotify';
import { useMenuStore } from 'src/stores/menuStore';
import { useSessionStore } from 'src/stores/sessionStore';
import { updateOrder } from 'src/services/orderService';
import { formatPrice, formatQueueNumber, isTakeawayOption } from 'src/utils/formatters';
import { isTakeawayName } from 'src/services/tableService';
import { SelectionType } from 'src/types/enums';
import QuantityStepper from 'src/components/QuantityStepper.vue';
import type { OrderWithItems, MenuItemWithOptions } from 'src/types/database';
import type { CreateOrderItemPayload } from 'src/types/cart';

interface SelectedOpt {
  option_id: string;
  name: string;
  price_adjustment: number;
}

interface LocalEditableItem {
  temp_id: string;
  menu_item_id: string;
  name: string;
  base_price: number;
  quantity: number;
  special_instruction: string;
  selected_options: SelectedOpt[];
}

const props = defineProps<{
  modelValue: boolean;
  order: OrderWithItems;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'saved'): void;
}>();

const { notifySuccess, notifyError, notifyWarning } = useNotify();
const menuStore = useMenuStore();
const sessionStore = useSessionStore();

const isSaving = ref(false);
const items = ref<LocalEditableItem[]>([]);

// Nested Add Item dialog states
const showAddItemDialog = ref(false);
const selectedMenuItem = ref<MenuItemWithOptions | null>(null);
const newDishQuantity = ref(1);
const newDishInstruction = ref('');
const newDishSingleOptions = reactive<Record<string, string>>({});
const newDishMultiOptions = reactive<Record<string, string[]>>({});

// Initialize editable items when modal opens
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen && props.order) {
      items.value = props.order.items.map((it) => ({
        temp_id: it.id || crypto.randomUUID(),
        menu_item_id: it.menu_item_id,
        name: it.snapshot_name,
        base_price: it.snapshot_base_price,
        quantity: it.quantity,
        special_instruction: it.special_instruction || '',
        selected_options: (it.options || []).map((o) => ({
          option_id: o.option_id,
          name: o.snapshot_option_name,
          price_adjustment: o.snapshot_price_adjustment,
        })),
      }));
    }
  },
  { immediate: true },
);

function calculateItemSubtotal(item: LocalEditableItem): number {
  const optsTotal = item.selected_options.reduce((sum, opt) => sum + opt.price_adjustment, 0);
  return (item.base_price + optsTotal) * item.quantity;
}

const totalCount = computed(() => items.value.reduce((sum, it) => sum + it.quantity, 0));
const totalAmount = computed(() =>
  items.value.reduce((sum, it) => sum + calculateItemSubtotal(it), 0),
);

function removeItem(index: number) {
  items.value.splice(index, 1);
}

// ─── Add Menu Dish Flow ───────────────────────────────────
async function openAddMenuDialog() {
  selectedMenuItem.value = null;
  showAddItemDialog.value = true;
  if (menuStore.categories.length === 0) {
    await menuStore.loadMenu();
  }
}

async function selectDishToAdd(dishId: string) {
  const fullItem = await menuStore.fetchItemWithOptions(dishId);
  if (!fullItem) return;

  selectedMenuItem.value = fullItem;
  newDishQuantity.value = 1;
  newDishInstruction.value = '';

  // Clear options
  for (const k in newDishSingleOptions) delete newDishSingleOptions[k];
  for (const k in newDishMultiOptions) delete newDishMultiOptions[k];

  // Auto-select defaults
  const isTakeawaySession = isTakeawayName(sessionStore.tableName);
  for (const group of fullItem.option_groups) {
    if (group.selection_type === SelectionType.SINGLE && group.is_required) {
      const isDiningGroup = group.name === 'รูปแบบการทาน' || group.name === 'ทานที่ร้าน / กลับบ้าน';

      if (isDiningGroup) {
        if (isTakeawaySession) {
          const takeawayOpt = group.options.find(
            (o) => (o.name === 'สั่งกลับบ้าน' || o.name === 'กลับบ้าน') && o.is_available,
          );
          if (takeawayOpt) {
            newDishSingleOptions[group.id] = takeawayOpt.id;
            continue;
          }
        }
        const dineInOpt = group.options.find((o) => o.name === 'ทานที่ร้าน' && o.is_available);
        if (dineInOpt) {
          newDishSingleOptions[group.id] = dineInOpt.id;
          continue;
        }
      }

      const firstAvail = group.options.find((o) => o.is_available);
      if (firstAvail) {
        newDishSingleOptions[group.id] = firstAvail.id;
      }
    }
  }
}

function toggleSingleOption(
  group: { id: string; is_required: boolean },
  optId: string,
  isAvailable: boolean,
) {
  if (!isAvailable) return;
  if (newDishSingleOptions[group.id] === optId && !group.is_required) {
    delete newDishSingleOptions[group.id];
  } else {
    newDishSingleOptions[group.id] = optId;
  }
}

function toggleMultiOption(
  groupId: string,
  optId: string,
  maxSelections: number | null,
  isAvailable: boolean,
) {
  if (!isAvailable) return;
  if (!newDishMultiOptions[groupId]) {
    newDishMultiOptions[groupId] = [];
  }
  const idx = newDishMultiOptions[groupId].indexOf(optId);
  if (idx > -1) {
    newDishMultiOptions[groupId].splice(idx, 1);
  } else {
    if (maxSelections !== null && newDishMultiOptions[groupId].length >= maxSelections) {
      return;
    }
    newDishMultiOptions[groupId].push(optId);
  }
}

const isNewDishValid = computed(() => {
  if (!selectedMenuItem.value) return false;
  for (const group of selectedMenuItem.value.option_groups) {
    if (group.is_required) {
      if (group.selection_type === SelectionType.SINGLE) {
        if (!newDishSingleOptions[group.id]) return false;
      } else {
        const count = newDishMultiOptions[group.id]?.length ?? 0;
        if (count < group.min_selections) return false;
      }
    }
  }
  return true;
});

const newDishTotal = computed(() => {
  if (!selectedMenuItem.value) return 0;
  let optTotal = 0;
  for (const group of selectedMenuItem.value.option_groups) {
    const singleId = newDishSingleOptions[group.id];
    if (singleId) {
      const opt = group.options.find((o) => o.id === singleId);
      if (opt) optTotal += opt.price_adjustment;
    }
    const multiIds = newDishMultiOptions[group.id] || [];
    for (const mId of multiIds) {
      const opt = group.options.find((o) => o.id === mId);
      if (opt) optTotal += opt.price_adjustment;
    }
  }
  return (selectedMenuItem.value.base_price + optTotal) * newDishQuantity.value;
});

function confirmAddDishToOrder() {
  if (!selectedMenuItem.value || !isNewDishValid.value) return;

  const chosenOptions: SelectedOpt[] = [];
  for (const group of selectedMenuItem.value.option_groups) {
    const singleId = newDishSingleOptions[group.id];
    if (singleId) {
      const opt = group.options.find((o) => o.id === singleId);
      if (opt) {
        chosenOptions.push({
          option_id: opt.id,
          name: opt.name,
          price_adjustment: opt.price_adjustment,
        });
      }
    }
    const multiIds = newDishMultiOptions[group.id] || [];
    for (const mId of multiIds) {
      const opt = group.options.find((o) => o.id === mId);
      if (opt) {
        chosenOptions.push({
          option_id: opt.id,
          name: opt.name,
          price_adjustment: opt.price_adjustment,
        });
      }
    }
  }

  items.value.push({
    temp_id: crypto.randomUUID(),
    menu_item_id: selectedMenuItem.value.id,
    name: selectedMenuItem.value.name,
    base_price: selectedMenuItem.value.base_price,
    quantity: newDishQuantity.value,
    special_instruction: newDishInstruction.value,
    selected_options: chosenOptions,
  });

  showAddItemDialog.value = false;
  selectedMenuItem.value = null;
  notifySuccess('เพิ่มรายการลงในออเดอร์แล้ว');
}

// ─── Save Changes via RPC ─────────────────────────────────
async function saveOrderChanges() {
  if (items.value.length === 0) {
    notifyWarning('ต้องมีรายการอาหารอย่างน้อย 1 รายการ');
    return;
  }

  if (!sessionStore.guestSession?.session_token) {
    notifyError('ไม่พบเซสชัน กรุณาสแกน QR Code ใหม่อีกครั้ง');
    return;
  }

  isSaving.value = true;

  try {
    const payloadItems: CreateOrderItemPayload[] = items.value.map((it) => {
      const optIds = it.selected_options.map((o) => o.option_id);
      return {
        menu_item_id: it.menu_item_id,
        quantity: it.quantity,
        special_instruction: it.special_instruction,
        selected_option_ids: optIds,
        option_ids: optIds,
      };
    });

    await updateOrder({
      order_id: props.order.id,
      guest_session_token: sessionStore.guestSession.session_token,
      items: payloadItems,
    });

    notifySuccess('บันทึกการแก้ไขออเดอร์เรียบร้อยแล้ว');
    emit('saved');
    emit('update:modelValue', false);
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : '';
    if (rawMsg.includes('เริ่มเตรียมอาหาร') || rawMsg.includes('Cannot edit order')) {
      notifyError('ไม่สามารถแก้ไขได้ เนื่องจากร้านเริ่มทำอาหารแล้ว');
      emit('saved'); // Refresh status
      emit('update:modelValue', false);
    } else {
      notifyError(rawMsg || 'เกิดข้อผิดพลาดในการบันทึกการแก้ไข');
    }
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.edit-order-card {
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
}

.edit-order-header {
  background: #ffffff;
}

.edit-order-body {
  flex: 1;
  overflow-y: auto;
  background: var(--color-background);
}

.edit-notice-banner {
  display: flex;
  align-items: center;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.8rem;
  color: #1e40af;
}

.edit-item-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 12px 14px;
  box-shadow: var(--shadow-subtle);
}

.pt-border {
  border-top: 1px dashed var(--color-border);
  padding-top: 8px;
}

.opt-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.opt-chip--takeaway {
  background: #ffedd5;
  color: #ea580c;
  font-weight: 600;
  border: 1px solid #fed7aa;
}

.item-instruction-input {
  font-size: 0.85rem;
}

.add-item-btn {
  padding: 8px 16px;
  font-weight: 600;
}

.edit-order-footer {
  background: #ffffff;
  border-top: 1px solid var(--color-border);
}

.cancel-btn,
.save-btn {
  height: 44px;
  font-weight: 600;
}

/* Add Menu Dialog styles */
.add-menu-card {
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
}

.add-menu-body {
  flex: 1;
  overflow-y: auto;
}

.menu-selection-row {
  border-radius: 8px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.15s ease;
}

.menu-selection-row:hover {
  background: var(--color-surface-subtle);
}

.menu-selection-row--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.option-group-card {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  padding: 10px 12px;
}

.option-group-name {
  font-size: 0.88rem;
  font-weight: 700;
}

.group-tag {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.group-tag--required {
  background: #fee2e2;
  color: #dc2626;
}

.group-tag--optional {
  background: #f1f5f9;
  color: #475569;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  cursor: pointer;
}

.option-row--selected {
  background: #eff6ff;
  border-color: var(--color-primary);
}

.option-row--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.option-name {
  font-size: 0.85rem;
}

.option-price-adjust {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}
</style>
