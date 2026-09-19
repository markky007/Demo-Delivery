<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    position="bottom"
    class="product-detail-dialog"
    maximized-mobile
  >
    <div class="bottom-sheet-card">
      <!-- Grabber Drag Handle (Delivery App Standard) -->
      <div class="sheet-grabber-wrap">
        <div class="sheet-grabber-bar"></div>
      </div>

      <!-- Close circular button -->
      <button
        type="button"
        class="sheet-close-btn"
        @click="closeModal"
        aria-label="ปิด"
      >
        <q-icon name="close" size="18px" />
      </button>

      <!-- Content Scrollable Body -->
      <div class="sheet-body scroll" ref="bodyScrollRef">
        <!-- Skeleton Loading State -->
        <div v-if="isLoading" class="q-pa-md">
          <LoadingSkeleton type="product-detail" />
        </div>

        <template v-else-if="item">
          <!-- Hero Product Image -->
          <div class="sheet-image-wrapper">
            <img
              v-if="item.image_url"
              :src="item.image_url"
              :alt="item.name"
              class="sheet-image"
              loading="lazy"
            />
            <div v-else class="sheet-image-placeholder">
              <q-icon name="restaurant" size="56px" color="grey-4" />
            </div>
            <div v-if="!item.is_available" class="sheet-soldout-overlay">
              <span class="sheet-soldout-badge">หมดชั่วคราว</span>
            </div>
          </div>

          <!-- Dish Info Title & Description -->
          <div class="sheet-info-header q-px-md q-pt-md">
            <div class="row justify-between items-start no-wrap">
              <div class="col">
                <h5 class="sheet-title q-my-none">{{ item.name }}</h5>
                <p v-if="item.description" class="sheet-desc q-mt-xs q-mb-none">
                  {{ item.description }}
                </p>
              </div>
              <div class="sheet-base-price text-right q-ml-md tabular-nums">
                {{ formatPrice(item.base_price) }}
              </div>
            </div>

            <!-- Sold out banner -->
            <div v-if="!item.is_available" class="sheet-warning-banner q-mt-sm">
              <q-icon name="info" size="16px" class="q-mr-xs flex-shrink-0" />
              <span>เมนูนี้หมดชั่วคราว ไม่สามารถสั่งได้ในขณะนี้</span>
            </div>
          </div>

          <!-- Option Groups List -->
          <div class="sheet-options-container q-px-md q-pb-md">
            <div
              v-for="group in item.option_groups"
              :key="group.id"
              :id="`opt-group-${group.id}`"
              class="sheet-group-card q-mt-md"
              :class="{
                'sheet-group-card--error': missingGroupIds.has(group.id),
                'sheet-group-card--locked':
                  isTakeawaySession && isDiningOptionGroup(group.name),
              }"
            >
              <!-- Group Title & Requirement Pill -->
              <div class="row items-center justify-between q-mb-xs">
                <div class="row items-center no-wrap group-title-row">
                  <q-icon
                    v-if="isTakeawaySession && isDiningOptionGroup(group.name)"
                    name="lock"
                    size="15px"
                    class="q-mr-xs text-orange-9"
                  />
                  <span class="group-name">{{ group.name }}</span>
                </div>

                <span
                  v-if="isTakeawaySession && isDiningOptionGroup(group.name)"
                  class="group-badge group-badge--locked"
                >
                  <q-icon name="lock" size="11px" class="q-mr-xs" />
                  ล็อกตาม QR สั่งกลับบ้าน
                </span>
                <span
                  v-else
                  class="group-badge"
                  :class="group.is_required ? 'group-badge--required' : 'group-badge--optional'"
                >
                  {{ group.is_required ? 'จำเป็นต้องเลือก' : 'เลือกเพิ่มได้' }}
                </span>
              </div>

              <!-- Group Guidance Hint -->
              <div class="group-hint q-mb-sm">
                <template v-if="isTakeawaySession && isDiningOptionGroup(group.name)">
                  <span class="text-orange-9">
                    ระบบตั้งค่าเป็นสั่งกลับบ้านโดยอัตโนมัติ
                  </span>
                </template>
                <template v-else-if="group.selection_type === SelectionType.SINGLE">
                  เลือกได้ 1 รายการ
                </template>
                <template v-else>
                  เลือกได้
                  <template v-if="group.min_selections > 0">
                    อย่างน้อย {{ group.min_selections }}
                  </template>
                  <template v-if="group.max_selections">
                    , สูงสุด {{ group.max_selections }} รายการ
                  </template>
                </template>
              </div>

              <!-- Validation Error Warning -->
              <div v-if="missingGroupIds.has(group.id)" class="group-error-msg q-mb-sm">
                <q-icon name="error_outline" size="14px" class="q-mr-xs" />
                <span v-if="group.selection_type === SelectionType.SINGLE">
                  กรุณาเลือก 1 ตัวเลือกในกลุ่มนี้
                </span>
                <span v-else>
                  กรุณาเลือกอย่างน้อย {{ group.min_selections || 1 }} รายการ
                </span>
              </div>

              <!-- Single Select (Radio List) -->
              <div v-if="group.selection_type === SelectionType.SINGLE" class="options-list">
                <div
                  v-for="opt in group.options"
                  :key="opt.id"
                  class="option-row"
                  :class="{
                    'option-row--selected': selectedOptions[group.id] === opt.id,
                    'option-row--disabled':
                      !isOptionEffectivelyAvailable(opt) ||
                      (isTakeawaySession &&
                        isDiningOptionGroup(group.name) &&
                        !isTakeawayOption(opt.name)),
                    'option-row--locked':
                      isTakeawaySession &&
                      isDiningOptionGroup(group.name) &&
                      isTakeawayOption(opt.name),
                  }"
                  @click="toggleSingleOption(group, opt.id, isOptionEffectivelyAvailable(opt))"
                >
                  <div class="row items-center">
                    <q-radio
                      :model-value="selectedOptions[group.id]"
                      :val="opt.id"
                      :disable="
                        !isOptionEffectivelyAvailable(opt) ||
                        (isTakeawaySession && isDiningOptionGroup(group.name))
                      "
                      color="primary"
                      dense
                      class="q-mr-sm pointer-events-none"
                    />
                    <span class="option-label">
                      {{ opt.name }}
                    </span>
                    <span v-if="!isOptionEffectivelyAvailable(opt)" class="opt-tag-soldout q-ml-sm">
                      หมด
                    </span>
                    <span
                      v-else-if="
                        isTakeawaySession &&
                        isDiningOptionGroup(group.name) &&
                        isTakeawayOption(opt.name)
                      "
                      class="opt-tag-locked q-ml-sm"
                    >
                      <q-icon name="lock" size="10px" class="q-mr-xs" />ล็อกตาม QR
                    </span>
                  </div>

                  <div class="option-price-diff tabular-nums">
                    <span v-if="!isOptionEffectivelyAvailable(opt)" class="text-caption text-grey-5">
                      หมดชั่วคราว
                    </span>
                    <span
                      v-else-if="
                        isTakeawaySession &&
                        isDiningOptionGroup(group.name) &&
                        !isTakeawayOption(opt.name)
                      "
                      class="text-caption text-grey-5"
                    >
                      (ทานที่ร้าน)
                    </span>
                    <span v-else-if="opt.price_adjustment > 0">
                      +{{ formatPrice(opt.price_adjustment) }}
                    </span>
                    <span v-else-if="opt.price_adjustment < 0">
                      {{ formatPrice(opt.price_adjustment) }}
                    </span>
                    <span v-else class="text-caption text-grey-5">ฟรี</span>
                  </div>
                </div>
              </div>

              <!-- Multi Select (Checkbox List) -->
              <div v-else class="options-list">
                <div
                  v-for="opt in group.options"
                  :key="opt.id"
                  class="option-row"
                  :class="{
                    'option-row--selected': multiSelectedOptions[group.id]?.includes(opt.id),
                    'option-row--disabled':
                      !isOptionEffectivelyAvailable(opt) ||
                      (group.max_selections !== null &&
                        (multiSelectedOptions[group.id]?.length ?? 0) >= group.max_selections &&
                        !multiSelectedOptions[group.id]?.includes(opt.id)),
                  }"
                  @click="
                    toggleMultiOption(
                      group.id,
                      opt.id,
                      group.max_selections,
                      isOptionEffectivelyAvailable(opt),
                    )
                  "
                >
                  <div class="row items-center">
                    <q-checkbox
                      :model-value="multiSelectedOptions[group.id]?.includes(opt.id)"
                      :disable="
                        !isOptionEffectivelyAvailable(opt) ||
                        (group.max_selections !== null &&
                          (multiSelectedOptions[group.id]?.length ?? 0) >= group.max_selections &&
                          !multiSelectedOptions[group.id]?.includes(opt.id))
                      "
                      color="primary"
                      dense
                      class="q-mr-sm pointer-events-none"
                    />
                    <span class="option-label">
                      {{ opt.name }}
                    </span>
                    <span v-if="!isOptionEffectivelyAvailable(opt)" class="opt-tag-soldout q-ml-sm">
                      หมด
                    </span>
                  </div>

                  <div class="option-price-diff tabular-nums">
                    <span v-if="!isOptionEffectivelyAvailable(opt)" class="text-caption text-grey-5">
                      หมดชั่วคราว
                    </span>
                    <span v-else-if="opt.price_adjustment > 0">
                      +{{ formatPrice(opt.price_adjustment) }}
                    </span>
                    <span v-else-if="opt.price_adjustment < 0">
                      {{ formatPrice(opt.price_adjustment) }}
                    </span>
                    <span v-else class="text-caption text-grey-5">ฟรี</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Special Kitchen Instruction Card -->
            <div class="sheet-group-card q-mt-md">
              <div class="row items-center justify-between q-mb-xs">
                <span class="group-name">รายละเอียดเพิ่มเติม / หมายเหตุถึงครัว</span>
                <span class="text-caption text-grey-6">ไม่บังคับ</span>
              </div>
              <p class="group-hint q-mb-sm">
                เช่น เผ็ดน้อย, ไม่ใส่ผัก, แยกน้ำซุป
              </p>
              <q-input
                v-model="specialInstruction"
                outlined
                autogrow
                placeholder="ระบุข้อความถึงทางร้าน..."
                :maxlength="MAX_SPECIAL_INSTRUCTION_LENGTH"
                counter
                dense
                class="special-textarea"
                bg-color="white"
              />
            </div>
          </div>
        </template>
      </div>

      <!-- Sticky Bottom Footer Action (Stepper + Pill CTA) -->
      <div v-if="item" class="sheet-footer">
        <div class="row items-center justify-between q-gutter-x-md">
          <!-- Quantity Stepper -->
          <div class="quantity-stepper-box">
            <button
              type="button"
              class="stepper-btn"
              :disabled="quantity <= 1 || !item.is_available"
              @click="quantity > 1 && quantity--"
              aria-label="ลดจำนวน"
            >
              <q-icon name="remove" size="18px" />
            </button>
            <span class="stepper-value tabular-nums">{{ quantity }}</span>
            <button
              type="button"
              class="stepper-btn"
              :disabled="!item.is_available"
              @click="quantity++"
              aria-label="เพิ่มจำนวน"
            >
              <q-icon name="add" size="18px" />
            </button>
          </div>

          <!-- Add to Cart Pill Button -->
          <button
            type="button"
            class="sheet-submit-btn col"
            :disabled="!item.is_available"
            @click="handleAddToCart"
          >
            <div class="row items-center justify-between full-width q-px-sm">
              <span class="submit-btn-label">
                {{ !item.is_available ? 'หมดชั่วคราว' : 'เพิ่มลงตะกร้า' }}
              </span>
              <span v-if="item.is_available" class="submit-btn-price tabular-nums">
                {{ formatPrice(itemTotal) }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useMenuStore } from 'src/stores/menuStore';
import { useCartStore } from 'src/stores/cartStore';
import { useSessionStore } from 'src/stores/sessionStore';
import { useNotify } from 'src/composables/useNotify';
import { isTakeawayName } from 'src/services/tableService';
import { formatPrice, isDiningOptionGroup, isTakeawayOption } from 'src/utils/formatters';
import { isOptionAvailable } from 'src/utils/ingredientHelper';
import { MAX_SPECIAL_INSTRUCTION_LENGTH } from 'src/utils/constants';
import { SelectionType } from 'src/types/enums';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import type { MenuItemWithOptions, Option } from 'src/types/database';
import type { CartItemOption } from 'src/types/cart';

const props = defineProps<{
  modelValue: boolean;
  itemId: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'added-to-cart', payload: { itemName: string; quantity: number }): void;
}>();

const menuStore = useMenuStore();
const cartStore = useCartStore();
const sessionStore = useSessionStore();
const { notifySuccess, notifyWarning } = useNotify();

const item = ref<MenuItemWithOptions | null>(null);
const isLoading = ref(false);
const quantity = ref(1);
const specialInstruction = ref('');
const selectedOptions = reactive<Record<string, string>>({});
const multiSelectedOptions = reactive<Record<string, string[]>>({});
const missingGroupIds = ref<Set<string>>(new Set());
const bodyScrollRef = ref<HTMLElement | null>(null);

const isTakeawaySession = computed(() => isTakeawayName(sessionStore.tableName));

function isOptionEffectivelyAvailable(
  opt: Option | { name: string; is_available?: boolean },
): boolean {
  return isOptionAvailable(opt, menuStore.items);
}

// Watch dialog open & load item with options
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen && props.itemId) {
      await loadItem(props.itemId);
    } else {
      resetState();
    }
  },
);

async function loadItem(itemId: string) {
  isLoading.value = true;
  try {
    const fetched = await menuStore.fetchItemWithOptions(itemId, true);
    item.value = fetched;

    if (fetched) {
      // Initialize option selections
      for (const group of fetched.option_groups) {
        if (group.selection_type === SelectionType.MULTI) {
          multiSelectedOptions[group.id] = [];
        } else if (group.selection_type === SelectionType.SINGLE) {
          // If customer is on a takeaway session, auto-select and lock takeaway option
          if (isDiningOptionGroup(group.name) && isTakeawaySession.value) {
            const takeawayOpt =
              group.options.find(
                (o) => isTakeawayOption(o.name) && isOptionEffectivelyAvailable(o),
              ) || group.options.find((o) => isTakeawayOption(o.name));
            if (takeawayOpt) {
              selectedOptions[group.id] = takeawayOpt.id;
            }
          }
        }
      }
    }
  } finally {
    isLoading.value = false;
  }
}

function resetState() {
  quantity.value = 1;
  specialInstruction.value = '';
  Object.keys(selectedOptions).forEach((k) => delete selectedOptions[k]);
  Object.keys(multiSelectedOptions).forEach((k) => delete multiSelectedOptions[k]);
  missingGroupIds.value.clear();
}

function closeModal() {
  emit('update:modelValue', false);
}

function toggleSingleOption(
  group: { id: string; name?: string; is_required: boolean },
  optId: string,
  isAvailable: boolean,
) {
  if (!isAvailable) return;
  if (isTakeawaySession.value && isDiningOptionGroup(group.name)) return;

  if (selectedOptions[group.id] === optId) {
    if (!group.is_required) {
      delete selectedOptions[group.id];
    }
  } else {
    selectedOptions[group.id] = optId;
  }

  if (selectedOptions[group.id]) {
    missingGroupIds.value.delete(group.id);
  }
}

function toggleMultiOption(
  groupId: string,
  optId: string,
  maxSelections: number | null,
  isAvailable: boolean,
) {
  if (!isAvailable) return;
  const current = multiSelectedOptions[groupId] || [];
  const idx = current.indexOf(optId);

  if (idx > -1) {
    current.splice(idx, 1);
  } else {
    if (maxSelections === null || current.length < maxSelections) {
      current.push(optId);
    }
  }
  multiSelectedOptions[groupId] = [...current];

  const group = item.value?.option_groups.find((g) => g.id === groupId);
  if (group) {
    const min = group.min_selections || 1;
    if (multiSelectedOptions[groupId].length >= min) {
      missingGroupIds.value.delete(groupId);
    }
  }
}

const optionsTotal = computed(() => {
  if (!item.value) return 0;
  let total = 0;

  for (const group of item.value.option_groups) {
    if (group.selection_type === SelectionType.SINGLE && selectedOptions[group.id]) {
      const opt = group.options.find((o) => o.id === selectedOptions[group.id]);
      if (opt) total += opt.price_adjustment;
    }
    if (group.selection_type === SelectionType.MULTI) {
      const selected = multiSelectedOptions[group.id] ?? [];
      for (const optId of selected) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) total += opt.price_adjustment;
      }
    }
  }

  return total;
});

const itemTotal = computed(() => {
  if (!item.value) return 0;
  return (item.value.base_price + optionsTotal.value) * quantity.value;
});

function collectSelectedOptions(): CartItemOption[] {
  if (!item.value) return [];
  const result: CartItemOption[] = [];

  for (const group of item.value.option_groups) {
    if (group.selection_type === SelectionType.SINGLE && selectedOptions[group.id]) {
      const opt = group.options.find((o) => o.id === selectedOptions[group.id]);
      if (opt) {
        result.push({
          option_id: opt.id,
          option_group_id: group.id,
          name: opt.name,
          group_name: group.name,
          price_adjustment: opt.price_adjustment,
        });
      }
    }
    if (group.selection_type === SelectionType.MULTI) {
      const selected = multiSelectedOptions[group.id] ?? [];
      for (const optId of selected) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) {
          result.push({
            option_id: opt.id,
            option_group_id: group.id,
            name: opt.name,
            group_name: group.name,
            price_adjustment: opt.price_adjustment,
          });
        }
      }
    }
  }

  return result;
}

function validateOptions(): {
  isValid: boolean;
  missingGroups: { id: string; name: string }[];
  unavailableOptionName?: string;
} {
  if (!item.value) return { isValid: false, missingGroups: [] };
  const missing: { id: string; name: string }[] = [];

  for (const group of item.value.option_groups) {
    if (group.is_required) {
      if (group.selection_type === SelectionType.SINGLE) {
        if (!selectedOptions[group.id]) {
          missing.push({ id: group.id, name: group.name });
        }
      } else if (group.selection_type === SelectionType.MULTI) {
        const selected = multiSelectedOptions[group.id] ?? [];
        const min = group.min_selections || 1;
        if (selected.length < min) {
          missing.push({ id: group.id, name: group.name });
        }
      }
    }

    // Check stock
    if (group.selection_type === SelectionType.SINGLE && selectedOptions[group.id]) {
      const opt = group.options.find((o) => o.id === selectedOptions[group.id]);
      if (opt && !isOptionEffectivelyAvailable(opt)) {
        return { isValid: false, missingGroups: [], unavailableOptionName: opt.name };
      }
    }
    if (group.selection_type === SelectionType.MULTI) {
      const selected = multiSelectedOptions[group.id] ?? [];
      for (const optId of selected) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt && !isOptionEffectivelyAvailable(opt)) {
          return { isValid: false, missingGroups: [], unavailableOptionName: opt.name };
        }
      }
    }
  }

  return { isValid: missing.length === 0, missingGroups: missing };
}

function handleAddToCart() {
  if (!item.value || !item.value.is_available) return;

  const validation = validateOptions();

  if (validation.unavailableOptionName) {
    notifyWarning(
      `ตัวเลือก "${validation.unavailableOptionName}" หมดชั่วคราว กรุณาเปลี่ยนตัวเลือก`,
      { title: 'ตัวเลือกหมดชั่วคราว' },
    );
    return;
  }

  if (!validation.isValid) {
    missingGroupIds.value = new Set(validation.missingGroups.map((g) => g.id));
    const firstMissing = validation.missingGroups[0];
    if (firstMissing) {
      notifyWarning(`กรุณาเลือกตัวเลือกในกลุ่ม "${firstMissing.name}"`, {
        title: 'จำเป็นต้องเลือก',
      });
      // Scroll into view
      const el = document.getElementById(`opt-group-${firstMissing.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  const selectedOpts = collectSelectedOptions();

  cartStore.addItem(
    item.value.id,
    item.value.name,
    item.value.base_price,
    item.value.image_url,
    quantity.value,
    specialInstruction.value.trim(),
    selectedOpts,
  );

  notifySuccess(`เพิ่ม "${item.value.name}" (${quantity.value} รายการ) ลงตะกร้าแล้ว`, {
    title: 'เพิ่มลงตะกร้าเรียบร้อย',
    caption: `รวม ${formatPrice(itemTotal.value)}`,
    timeout: 2000,
  });

  emit('added-to-cart', {
    itemName: item.value.name,
    quantity: quantity.value,
  });

  closeModal();
}
</script>

<style scoped>
.product-detail-dialog {
  z-index: 6000;
}

.bottom-sheet-card {
  background: var(--color-surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  width: 100%;
  max-width: 580px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  max-height: 88vh;
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.12);
  position: relative;
  overflow: hidden;
}

/* Grabber Bar */
.sheet-grabber-wrap {
  width: 100%;
  padding: 8px 0 4px 0;
  display: flex;
  justify-content: center;
  background: transparent;
  cursor: grab;
  z-index: 10;
}

.sheet-grabber-bar {
  width: 38px;
  height: 4.5px;
  background: var(--color-hairline);
  border-radius: var(--radius-pill);
}

/* Close Button (Frosted Circle) */
.sheet-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--color-hairline);
  color: var(--color-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: background 0.15s ease, transform 0.15s ease;
}

.sheet-close-btn:hover {
  background: var(--color-surface-alt);
}

.sheet-close-btn:active {
  transform: scale(0.92);
}

/* Body Scroll */
.sheet-body {
  overflow-y: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch;
}

/* Hero Image */
.sheet-image-wrapper {
  width: 100%;
  height: 220px;
  background: var(--color-surface-footer);
  position: relative;
  overflow: hidden;
}

.sheet-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sheet-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-soldout-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-soldout-badge {
  background: #dc2626;
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 6px 16px;
  border-radius: var(--radius-pill);
}

/* Header & Title */
.sheet-info-header {
  border-bottom: 1px solid var(--color-hairline);
  padding-bottom: 14px;
}

.sheet-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-ink);
  line-height: 1.3;
}

.sheet-desc {
  font-size: 0.88rem;
  color: var(--color-body);
  line-height: 1.48;
}

.sheet-base-price {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--color-primary);
  white-space: nowrap;
}

.sheet-warning-banner {
  background: #fef2f2;
  color: #dc2626;
  font-size: 0.82rem;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
}

/* Option Groups */
.sheet-group-card {
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  padding: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.sheet-group-card--error {
  border-color: #ef4444;
  background: #fff5f5;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
}

.sheet-group-card--locked {
  background: #fffbeb;
  border-color: #fde68a;
}

.group-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-ink);
}

.group-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.group-badge--required {
  background: #fee2e2;
  color: #b64400;
  border: 1px solid #fecaca;
}

.group-badge--optional {
  background: var(--color-surface-alt);
  color: var(--color-muted);
}

.group-badge--locked {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.group-hint {
  font-size: 0.78rem;
  color: var(--color-muted);
  margin-top: 2px;
}

.group-error-msg {
  color: #dc2626;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
}

/* Option Rows */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  cursor: pointer;
  min-height: 46px;
  transition: all 0.15s ease;
}

.option-row:hover {
  background: var(--color-surface-footer);
}

.option-row--selected {
  background: #f0f7ff;
  border-color: var(--color-primary);
  box-shadow: 0 1px 4px rgba(0, 113, 227, 0.12);
}

.option-row--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.option-row--locked {
  background: #fffbeb;
  border-color: #fde68a;
  cursor: default;
}

.option-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-ink);
}

.opt-tag-soldout {
  font-size: 0.7rem;
  background: #fee2e2;
  color: #dc2626;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
}

.opt-tag-locked {
  font-size: 0.7rem;
  background: #fef3c7;
  color: #b45309;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
}

.option-price-diff {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-ink);
  white-space: nowrap;
}

/* Special Textarea */
.special-textarea {
  border-radius: var(--radius-md);
}

/* Sticky Footer */
.sheet-footer {
  position: sticky;
  bottom: 0;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-top: 1px solid var(--color-hairline);
  padding: 12px 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 30;
}

/* Quantity Stepper Box */
.quantity-stepper-box {
  display: flex;
  align-items: center;
  background: var(--color-surface-footer);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-pill);
  padding: 3px 6px;
  height: 48px;
}

.stepper-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
  color: var(--color-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.stepper-btn:hover:not(:disabled) {
  background: var(--color-surface-alt);
}

.stepper-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stepper-value {
  min-width: 32px;
  text-align: center;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-ink);
}

/* Submit Pill Button */
.sheet-submit-btn {
  height: 48px;
  background: var(--color-primary);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-pill);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 113, 227, 0.32);
  transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.sheet-submit-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
  box-shadow: 0 6px 20px rgba(0, 113, 227, 0.4);
}

.sheet-submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.sheet-submit-btn:disabled {
  background: #a1a1a6;
  box-shadow: none;
  cursor: not-allowed;
}

.submit-btn-label {
  font-weight: 600;
}

.submit-btn-price {
  font-size: 1.05rem;
  font-weight: 800;
}
</style>
