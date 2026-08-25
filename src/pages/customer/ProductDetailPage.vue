<template>
  <q-page class="product-detail-page">
    <!-- Loading Skeleton -->
    <LoadingSkeleton v-if="isLoading" type="product-detail" />

    <template v-else-if="item">
      <!-- Product Hero Image -->
      <div class="product-image-wrapper">
        <img v-if="item.image_url" :src="item.image_url" :alt="item.name" class="product-image" />
        <div v-else class="product-image-placeholder">
          <q-icon name="restaurant" size="64px" color="grey-4" />
        </div>
      </div>

      <div class="product-content q-px-md q-pt-md">
        <!-- Title & Price -->
        <div class="row justify-between items-start">
          <div class="col">
            <h5 class="product-name q-my-none text-weight-bold">{{ item.name }}</h5>
            <p v-if="item.description" class="product-desc q-mt-xs q-mb-none">
              {{ item.description }}
            </p>
          </div>
          <div class="product-price text-right q-ml-md">
            {{ formatPrice(item.base_price) }}
          </div>
        </div>

        <!-- Sold out notice -->
        <div v-if="!item.is_available" class="sold-out-banner q-mt-md">
          <q-icon name="info" size="20px" class="q-mr-sm" />
          <span>เมนูนี้หมดชั่วคราว ไม่สามารถสั่งได้ในขณะนี้</span>
        </div>

        <!-- Option Groups -->
        <div
          v-for="group in item.option_groups"
          :id="`option-group-${group.id}`"
          :key="group.id"
          class="option-group-card q-mt-md"
          :class="{ 'option-group-card--error': missingGroupIds.has(group.id) }"
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

          <div class="option-group-hint q-mb-sm">
            <template v-if="group.selection_type === 'single'">เลือกได้ 1 รายการ</template>
            <template v-else>
              เลือกได้
              <template v-if="group.min_selections > 0"
                >อย่างน้อย {{ group.min_selections }}</template
              >
              <template v-if="group.max_selections"
                >, สูงสุด {{ group.max_selections }} รายการ</template
              >
            </template>
          </div>

          <!-- Validation Error Alert -->
          <div v-if="missingGroupIds.has(group.id)" class="group-validation-error q-mb-sm">
            <q-icon name="error_outline" size="16px" class="q-mr-xs" />
            <span v-if="group.selection_type === 'single'">กรุณาเลือกตัวเลือกในกลุ่มนี้</span>
            <span v-else>กรุณาเลือกอย่างน้อย {{ group.min_selections || 1 }} รายการ</span>
          </div>

          <!-- Single Select (Radio options styled as rows) -->
          <div v-if="group.selection_type === 'single'" class="options-list">
            <div
              v-for="opt in group.options"
              :key="opt.id"
              class="option-row"
              :class="{
                'option-row--selected': selectedOptions[group.id] === opt.id,
                'option-row--disabled': !opt.is_available,
              }"
              @click="toggleSingleOption(group, opt.id, opt.is_available)"
            >
              <div class="row items-center">
                <q-radio
                  :model-value="selectedOptions[group.id]"
                  :val="opt.id"
                  :disable="!opt.is_available"
                  color="primary"
                  dense
                  class="q-mr-sm pointer-events-none"
                />
                <span class="option-name" :class="{ 'text-grey-6': !opt.is_available }">
                  {{ opt.name }}
                </span>
                <span v-if="!opt.is_available" class="opt-sold-out-chip q-ml-sm"> หมด </span>
              </div>
              <div class="option-price-adjust">
                <span v-if="!opt.is_available" class="text-caption text-grey-5">หมดชั่วคราว</span>
                <span v-else-if="opt.price_adjustment > 0"
                  >+{{ formatPrice(opt.price_adjustment) }}</span
                >
                <span v-else-if="opt.price_adjustment < 0">{{
                  formatPrice(opt.price_adjustment)
                }}</span>
                <span v-else class="text-grey-5">—</span>
              </div>
            </div>
          </div>

          <!-- Multi Select (Checkbox options styled as rows) -->
          <div v-else class="options-list">
            <div
              v-for="opt in group.options"
              :key="opt.id"
              class="option-row"
              :class="{
                'option-row--selected': multiSelectedOptions[group.id]?.includes(opt.id),
                'option-row--disabled':
                  !opt.is_available ||
                  (group.max_selections !== null &&
                    (multiSelectedOptions[group.id]?.length ?? 0) >= group.max_selections &&
                    !multiSelectedOptions[group.id]?.includes(opt.id)),
              }"
              @click="toggleMultiOption(group.id, opt.id, group.max_selections, opt.is_available)"
            >
              <div class="row items-center">
                <q-checkbox
                  :model-value="multiSelectedOptions[group.id]?.includes(opt.id)"
                  :disable="
                    !opt.is_available ||
                    (group.max_selections !== null &&
                      (multiSelectedOptions[group.id]?.length ?? 0) >= group.max_selections &&
                      !multiSelectedOptions[group.id]?.includes(opt.id))
                  "
                  color="primary"
                  dense
                  class="q-mr-sm pointer-events-none"
                />
                <span class="option-name" :class="{ 'text-grey-6': !opt.is_available }">
                  {{ opt.name }}
                </span>
                <span v-if="!opt.is_available" class="opt-sold-out-chip q-ml-sm"> หมด </span>
              </div>
              <div class="option-price-adjust">
                <span v-if="!opt.is_available" class="text-caption text-grey-5">หมดชั่วคราว</span>
                <span v-else-if="opt.price_adjustment > 0"
                  >+{{ formatPrice(opt.price_adjustment) }}</span
                >
                <span v-else-if="opt.price_adjustment < 0">{{
                  formatPrice(opt.price_adjustment)
                }}</span>
                <span v-else class="text-grey-5">—</span>
              </div>
            </div>
          </div>

          <!-- Alert if all options in a required group are unavailable -->
          <div
            v-if="group.is_required && !group.options.some((o) => o.is_available)"
            class="group-unavailable-alert q-mt-sm"
          >
            <q-icon name="error_outline" size="16px" class="q-mr-xs" />
            <span>ตัวเลือกที่จำเป็นในกลุ่มนี้หมดชั่วคราว ไม่สามารถสั่งเมนูนี้ได้</span>
          </div>
        </div>

        <!-- Special Instruction -->
        <div class="option-group-card q-mt-md">
          <div class="option-group-name q-mb-xs">รายละเอียดเพิ่มเติม / หมายเหตุถึงร้าน</div>
          <p class="option-group-hint q-mb-sm">เช่น ไม่ใส่ผัก, เผ็ดน้อย, แยกน้ำซุป</p>
          <q-input
            v-model="specialInstruction"
            outlined
            autogrow
            placeholder="ระบุข้อความถึงทางร้าน..."
            :maxlength="MAX_SPECIAL_INSTRUCTION_LENGTH"
            counter
            class="special-input"
          />
        </div>

        <!-- Quantity Section -->
        <div class="row items-center justify-between quantity-section q-mt-lg q-mb-md q-pa-md">
          <div>
            <div class="text-weight-bold text-subtitle1">จำนวนจาน</div>
            <div class="text-caption text-grey-6">เลือกจำนวนที่ต้องการสั่ง</div>
          </div>
          <QuantityStepper v-model="quantity" :min="1" />
        </div>
      </div>

      <!-- Sticky Add to Cart Footer -->
      <div class="add-to-cart-wrapper">
        <q-btn
          color="primary"
          unelevated
          no-caps
          size="lg"
          class="full-width add-to-cart-btn"
          :disable="!item.is_available"
          @click="addToCart"
        >
          <div class="row items-center justify-between full-width q-px-sm">
            <span class="text-weight-bold">{{
              !item.is_available ? 'เมนูนี้หมดชั่วคราว' : 'เพิ่มลงตะกร้า'
            }}</span>
            <span class="text-weight-bold">{{ formatPrice(itemTotal) }}</span>
          </div>
        </q-btn>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNotify } from 'src/composables/useNotify';
import { useMenuStore } from 'src/stores/menuStore';
import { useCartStore } from 'src/stores/cartStore';
import { formatPrice } from 'src/utils/formatters';
import { MAX_SPECIAL_INSTRUCTION_LENGTH } from 'src/utils/constants';
import { SelectionType } from 'src/types/enums';
import QuantityStepper from 'src/components/QuantityStepper.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import type { MenuItemWithOptions } from 'src/types/database';
import type { CartItemOption } from 'src/types/cart';

const route = useRoute();
const router = useRouter();
const menuStore = useMenuStore();
const cartStore = useCartStore();
const { notifySuccess, notifyWarning } = useNotify();

const item = ref<MenuItemWithOptions | null>(null);
const isLoading = ref(true);
const quantity = ref(1);
const specialInstruction = ref('');
const selectedOptions = reactive<Record<string, string>>({});
const multiSelectedOptions = reactive<Record<string, string[]>>({});
const missingGroupIds = ref<Set<string>>(new Set());

onMounted(async () => {
  const itemId = route.params.itemId as string;
  item.value = await menuStore.fetchItemWithOptions(itemId, true);
  isLoading.value = false;

  if (item.value) {
    for (const group of item.value.option_groups) {
      if (group.selection_type === SelectionType.MULTI) {
        multiSelectedOptions[group.id] = [];
      }
    }
  }
});

function toggleSingleOption(
  group: { id: string; is_required: boolean },
  optId: string,
  isAvailable: boolean,
) {
  if (!isAvailable) return;

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

function validateOptions(): { isValid: boolean; missingGroups: { id: string; name: string }[] } {
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
  }

  return {
    isValid: missing.length === 0,
    missingGroups: missing,
  };
}

function addToCart() {
  if (!item.value || !item.value.is_available) return;

  const validation = validateOptions();
  if (!validation.isValid) {
    const newMissingSet = new Set<string>();
    validation.missingGroups.forEach((g) => newMissingSet.add(g.id));
    missingGroupIds.value = newMissingSet;

    if (validation.missingGroups.length === 1) {
      notifyWarning(`กรุณาเลือก "${validation.missingGroups[0]?.name}" ก่อนเพิ่มลงในตะกร้า`);
    } else {
      const names = validation.missingGroups.map((g) => g.name).join(', ');
      notifyWarning(`กรุณาเลือกตัวเลือกที่จำเป็น: ${names}`);
    }

    const firstMissing = validation.missingGroups[0];
    if (firstMissing) {
      const el = document.getElementById(`option-group-${firstMissing.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  cartStore.addItem(
    item.value.id,
    item.value.name,
    item.value.base_price,
    item.value.image_url,
    quantity.value,
    specialInstruction.value,
    collectSelectedOptions(),
  );

  notifySuccess('เพิ่มลงในตะกร้าเรียบร้อยแล้ว');
  router.back();
}
</script>

<style scoped>
.product-detail-page {
  background: var(--color-background);
  padding-bottom: 120px;
}

.product-image-wrapper {
  width: 100%;
  height: 260px;
  background: var(--color-surface-subtle);
  overflow: hidden;
  position: relative;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-content {
  max-width: 600px;
  margin: 0 auto;
}

.product-name {
  font-size: 1.35rem;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.product-price {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-primary);
  white-space: nowrap;
}

.product-desc {
  color: var(--color-text-secondary);
  font-size: 0.88rem;
  line-height: 1.5;
}

.sold-out-banner {
  display: flex;
  align-items: center;
  background: var(--color-status-soldout-bg);
  color: var(--color-status-soldout);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-weight: 500;
}

/* Option group cards */
.option-group-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 14px 16px;
  box-shadow: var(--shadow-subtle);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.option-group-card--error {
  border: 1.5px solid #ef4444 !important;
  background-color: #fffaf9 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12) !important;
  animation: shake-error 0.35s ease-in-out;
}

@keyframes shake-error {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-3px); }
  40%, 80% { transform: translateX(3px); }
}

.group-validation-error {
  display: flex;
  align-items: center;
  color: #dc2626;
  font-size: 0.82rem;
  font-weight: 600;
  background: #fee2e2;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
}

.option-group-name {
  font-weight: 600;
  font-size: 0.98rem;
  color: var(--color-text-primary);
}

.group-tag {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
}

.group-tag--required {
  background: var(--color-status-soldout-bg);
  color: var(--color-status-soldout);
}

.group-tag--optional {
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
}

.option-group-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-subtle);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.option-row:hover:not(.option-row--disabled) {
  background: #ffffff;
  border-color: var(--color-border);
}

.option-row--selected {
  background: var(--color-primary-soft) !important;
  border-color: var(--color-primary-tint) !important;
}

.option-row--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.option-row :deep(.q-radio),
.option-row :deep(.q-checkbox) {
  pointer-events: none;
}

.option-name {
  font-size: 0.92rem;
  color: var(--color-text-primary);
}

.opt-sold-out-chip {
  background: var(--color-status-soldout-bg);
  color: var(--color-status-soldout);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
}

.group-unavailable-alert {
  display: flex;
  align-items: center;
  background: #fef2f2;
  color: #b91c1c;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
}

.option-price-adjust {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-primary);
}

.special-input :deep(.q-field__control) {
  border-radius: var(--radius-sm);
}

.quantity-section {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-subtle);
}

/* Sticky add to cart */
.add-to-cart-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--color-border);
  padding: 12px 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 50;
  max-width: 600px;
  margin: 0 auto;
}

.add-to-cart-btn {
  border-radius: var(--radius-lg);
  height: 52px;
  font-size: 1rem;
  box-shadow: var(--shadow-md);
}
</style>
