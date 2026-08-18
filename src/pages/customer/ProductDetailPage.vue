<template>
  <q-page class="product-detail-page">
    <!-- Loading -->
    <div v-if="isLoading" class="column items-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <template v-else-if="item">
      <!-- Product image -->
      <div class="product-image-wrapper">
        <img v-if="item.image_url" :src="item.image_url" :alt="item.name" class="product-image" />
        <div v-else class="product-image-placeholder">
          <q-icon name="restaurant" size="64px" color="grey-4" />
        </div>
      </div>

      <div class="product-info q-px-md q-pt-md">
        <!-- Name + Price -->
        <h5 class="product-name q-my-none">{{ item.name }}</h5>
        <div class="product-price q-mt-xs">{{ formatPrice(item.base_price) }}</div>
        <p v-if="item.description" class="product-desc q-mt-sm">
          {{ item.description }}
        </p>

        <!-- Sold out notice -->
        <q-banner v-if="!item.is_available" class="bg-negative text-white q-mt-md" rounded>
          <template v-slot:avatar>
            <q-icon name="warning" />
          </template>
          This item is currently sold out
        </q-banner>

        <!-- Option Groups -->
        <div v-for="group in item.option_groups" :key="group.id" class="option-group q-mt-lg">
          <div class="option-group-header">
            <span class="option-group-name">{{ group.name }}</span>
            <q-badge v-if="group.is_required" color="negative" label="Required" class="q-ml-sm" />
          </div>
          <div v-if="group.min_selections > 0 || group.max_selections" class="option-group-hint">
            <template v-if="group.selection_type === 'single'">Choose one</template>
            <template v-else>
              Choose
              <template v-if="group.min_selections > 0"
                >at least {{ group.min_selections }}</template
              >
              <template v-if="group.max_selections">, up to {{ group.max_selections }}</template>
            </template>
          </div>

          <!-- Single select -->
          <q-option-group
            v-if="group.selection_type === 'single'"
            v-model="selectedOptions[group.id]"
            :options="groupOptions(group)"
            type="radio"
            class="q-mt-sm"
          />

          <!-- Multi select -->
          <div v-else class="q-mt-sm">
            <q-checkbox
              v-for="opt in group.options"
              :key="opt.id"
              v-model="multiSelectedOptions[group.id]"
              :val="opt.id"
              :label="optionLabel(opt)"
              :disable="
                !opt.is_available ||
                (group.max_selections !== null &&
                  (multiSelectedOptions[group.id]?.length ?? 0) >= group.max_selections &&
                  !multiSelectedOptions[group.id]?.includes(opt.id))
              "
              class="option-checkbox"
            />
          </div>
        </div>

        <!-- Special instruction -->
        <div class="q-mt-lg">
          <div class="option-group-name q-mb-sm">Special Instructions</div>
          <q-input
            v-model="specialInstruction"
            outlined
            autogrow
            placeholder="e.g. No vegetables, less spicy..."
            :maxlength="MAX_SPECIAL_INSTRUCTION_LENGTH"
            counter
            class="special-input"
          />
        </div>

        <!-- Quantity -->
        <div class="row items-center justify-center q-mt-lg q-mb-md quantity-row">
          <q-btn
            round
            flat
            icon="remove"
            color="primary"
            :disable="quantity <= 1"
            @click="quantity--"
          />
          <span class="quantity-display q-mx-lg">{{ quantity }}</span>
          <q-btn round flat icon="add" color="primary" @click="quantity++" />
        </div>
      </div>

      <!-- Add to cart button -->
      <div class="add-to-cart-wrapper q-px-md q-pb-md">
        <q-btn
          color="primary"
          unelevated
          no-caps
          size="lg"
          class="full-width add-to-cart-btn"
          :disable="!item.is_available || !isValid"
          @click="addToCart"
        >
          Add to Cart — {{ formatPrice(itemTotal) }}
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
import type { MenuItemWithOptions, OptionGroup, Option } from 'src/types/database';
import type { CartItemOption } from 'src/types/cart';
import { SelectionType } from 'src/types/enums';

const route = useRoute();
const router = useRouter();
const menuStore = useMenuStore();
const cartStore = useCartStore();
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

  // Initialize default selections for required single-select groups
  if (item.value) {
    for (const group of item.value.option_groups) {
      if (group.selection_type === SelectionType.SINGLE && group.is_required) {
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

function groupOptions(group: OptionGroup & { options: Option[] }) {
  return group.options.map((opt) => ({
    label: optionLabel(opt),
    value: opt.id,
    disable: !opt.is_available,
  }));
}

function optionLabel(opt: Option): string {
  if (opt.price_adjustment > 0) {
    return `${opt.name} +${formatPrice(opt.price_adjustment)}`;
  }
  if (opt.price_adjustment < 0) {
    return `${opt.name} ${formatPrice(opt.price_adjustment)}`;
  }
  return opt.name;
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

  notifySuccess('Added to cart');
  router.back();
}
</script>

<style scoped>
.product-detail-page {
  background: white;
  padding-bottom: 100px;
}

.product-image-wrapper {
  width: 100%;
  height: 280px;
  overflow: hidden;
  background: #f0f0f0;
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
  background: #f5f5f5;
}

.product-name {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1a1a2e;
}

.product-price {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1976d2;
}

.product-desc {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.5;
}

.option-group {
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.option-group-header {
  display: flex;
  align-items: center;
}

.option-group-name {
  font-weight: 600;
  font-size: 1rem;
  color: #1a1a2e;
}

.option-group-hint {
  font-size: 0.8rem;
  color: #888;
  margin-top: 2px;
}

.option-checkbox {
  display: block;
  margin-bottom: 4px;
}

.special-input :deep(.q-field__control) {
  border-radius: 12px;
}

.quantity-row {
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.quantity-display {
  font-size: 1.5rem;
  font-weight: 700;
  min-width: 48px;
  text-align: center;
}

.add-to-cart-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
}

.add-to-cart-btn {
  border-radius: 14px;
  height: 52px;
  font-size: 1rem;
  font-weight: 600;
}
</style>
