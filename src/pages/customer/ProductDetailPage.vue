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
        <div v-for="group in item.option_groups" :key="group.id" class="option-group-card q-mt-md">
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
              @click="opt.is_available && (selectedOptions[group.id] = opt.id)"
            >
              <div class="row items-center">
                <q-radio
                  v-model="selectedOptions[group.id]"
                  :val="opt.id"
                  :disable="!opt.is_available"
                  color="primary"
                  dense
                  class="q-mr-sm"
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
                  v-model="multiSelectedOptions[group.id]"
                  :val="opt.id"
                  :disable="
                    !opt.is_available ||
                    (group.max_selections !== null &&
                      (multiSelectedOptions[group.id]?.length ?? 0) >= group.max_selections &&
                      !multiSelectedOptions[group.id]?.includes(opt.id))
                  "
                  color="primary"
                  dense
                  class="q-mr-sm"
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
          :disable="!item.is_available || !isValid"
          @click="addToCart"
        >
          <div class="row items-center justify-between full-width q-px-sm">
            <span class="text-weight-bold">เพิ่มลงตะกร้า</span>
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
import { useSessionStore } from 'src/stores/sessionStore';
import { isTakeawayName } from 'src/services/tableService';
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
const sessionStore = useSessionStore();
const { notifySuccess } = useNotify();

const item = ref<MenuItemWithOptions | null>(null);
const isLoading = ref(true);
const quantity = ref(1);
const specialInstruction = ref('');
const selectedOptions = reactive<Record<string, string>>({});
const multiSelectedOptions = reactive<Record<string, string[]>>({});

onMounted(async () => {
  const itemId = route.params.itemId as string;
  item.value = await menuStore.fetchItemWithOptions(itemId);
  isLoading.value = false;

  if (item.value) {
    const isTakeawaySession = isTakeawayName(sessionStore.tableName);

    for (const group of item.value.option_groups) {
      if (group.selection_type === SelectionType.SINGLE && group.is_required) {
        const isDiningGroup =
          group.name === 'รูปแบบการทาน' || group.name === 'ทานที่ร้าน / กลับบ้าน';

        if (isDiningGroup) {
          if (isTakeawaySession) {
            const takeawayOpt = group.options.find(
              (o) => (o.name === 'สั่งกลับบ้าน' || o.name === 'กลับบ้าน') && o.is_available,
            );
            if (takeawayOpt) {
              selectedOptions[group.id] = takeawayOpt.id;
              continue;
            }
          }

          const dineInOpt = group.options.find((o) => o.name === 'ทานที่ร้าน' && o.is_available);
          if (dineInOpt) {
            selectedOptions[group.id] = dineInOpt.id;
            continue;
          }
        }

        const firstAvailable = group.options.find((o) => o.is_available);
        if (firstAvailable) {
          selectedOptions[group.id] = firstAvailable.id;
        }
      }
      if (group.selection_type === SelectionType.MULTI) {
        multiSelectedOptions[group.id] = [];
      }
    }
  }
});

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
}

const isValid = computed(() => {
  if (!item.value) return false;

  for (const group of item.value.option_groups) {
    if (group.is_required) {
      if (group.selection_type === SelectionType.SINGLE && !selectedOptions[group.id]) {
        return false;
      }
      if (group.selection_type === SelectionType.MULTI) {
        const selected = multiSelectedOptions[group.id] ?? [];
        if (selected.length < group.min_selections) return false;
      }
    }
  }

  return true;
});

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

function addToCart() {
  if (!item.value || !isValid.value) return;

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

.option-name {
  font-size: 0.92rem;
  color: var(--color-text-primary);
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
