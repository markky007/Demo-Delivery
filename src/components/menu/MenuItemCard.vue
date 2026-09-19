<template>
  <div
    class="menu-item-card"
    :class="{
      'menu-item-card--soldout': !item.is_available,
      'menu-item-card--inactive': !item.is_active,
    }"
  >
    <div class="row no-wrap items-start">
      <!-- Item Thumbnail -->
      <div class="item-thumb q-mr-md">
        <img
          v-if="item.image_url"
          :src="item.image_url"
          :alt="item.name"
          loading="lazy"
          decoding="async"
        />
        <div v-else class="thumb-fallback">
          <q-icon name="restaurant" size="26px" class="fallback-icon" />
        </div>
      </div>

      <!-- Item Main Details -->
      <div class="col ellipsis">
        <!-- Category & Title -->
        <div class="row items-center justify-between no-wrap">
          <div class="item-title text-ink ellipsis" :title="item.name">
            {{ item.name }}
          </div>
        </div>

        <!-- Price -->
        <div class="item-price font-mono q-mt-xs">
          {{ formatPrice(item.base_price) }}
        </div>

        <!-- Badges & Indicators Row -->
        <div class="row items-center flex-wrap q-gutter-xs q-mt-xs">
          <!-- Availability Status -->
          <StatusBadge
            :status="item.is_available ? 'ACTIVE' : 'SOLDOUT'"
            mode="raw"
            :custom-label="item.is_available ? 'พร้อมขาย' : 'หมดชั่วคราว'"
          />

          <!-- Inactive Badge -->
          <span v-if="!item.is_active" class="inactive-badge"> ปิดการใช้งาน </span>

          <!-- Main Ingredient -->
          <span class="ingredient-chip">
            <q-icon :name="getIngredientIcon(mainIngredient)" size="12px" class="q-mr-xs" />
            <span>{{ mainIngredient }}</span>
          </span>

          <!-- Fry Station Indicator -->
          <span v-if="isFried" class="fry-chip">
            <q-icon name="local_fire_department" size="12px" class="q-mr-xs" />
            <span>ของทอด ({{ fryLabel }})</span>
          </span>

          <!-- Compact Option Groups Pill (Option A with Tooltip) -->
          <span v-if="optionGroupNames.length > 0" class="option-summary-pill">
            <q-icon name="tune" size="12px" class="q-mr-xs" />
            <span>{{ optionGroupNames.length }} ตัวเลือกเสริม</span>
            <q-tooltip anchor="top middle" self="bottom middle" class="bg-dark text-caption">
              {{ optionGroupNames.join(' • ') }}
            </q-tooltip>
          </span>
        </div>
      </div>
    </div>

    <!-- Bottom Action Bar -->
    <div class="card-action-bar row items-center justify-between q-mt-sm q-pt-sm">
      <span class="text-caption text-muted ellipsis col q-mr-sm">
        {{ categoryName }}
      </span>

      <div class="row items-center q-gutter-xs">
        <!-- Edit Button -->
        <q-btn
          flat
          dense
          round
          icon="edit"
          size="sm"
          color="grey-7"
          class="edit-btn"
          @click="emit('edit', item)"
        >
          <q-tooltip>แก้ไขเมนู</q-tooltip>
        </q-btn>

        <!-- Quick 1-Click Availability Toggle -->
        <button
          type="button"
          class="quick-toggle-pill"
          :class="item.is_available ? 'toggle-to-soldout' : 'toggle-to-available'"
          @click="emit('toggle-availability', item)"
        >
          <q-icon
            :name="item.is_available ? 'block' : 'check_circle'"
            size="13px"
            class="q-mr-xs"
          />
          <span>{{ item.is_available ? 'ปรับเป็นหมด' : 'เปิดขาย' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MenuItem } from 'src/types/database';
import { formatPrice } from 'src/utils/formatters';
import { inferMainIngredient, getIngredientIcon } from 'src/utils/ingredientHelper';
import { inferFryConfigFromName } from 'src/utils/fryHelper';
import StatusBadge from 'src/components/StatusBadge.vue';

const props = defineProps<{
  item: MenuItem;
  optionGroupNames: string[];
  categoryName: string;
}>();

const emit = defineEmits<{
  (e: 'edit', item: MenuItem): void;
  (e: 'toggle-availability', item: MenuItem): void;
}>();

const mainIngredient = computed(() => {
  return inferMainIngredient(props.item.name, props.item.main_ingredient);
});

const isFried = computed(() => {
  if (props.item.fry_config && typeof props.item.fry_config.is_fried === 'boolean') {
    return props.item.fry_config.is_fried;
  }
  const inferred = inferFryConfigFromName(props.item.name);
  return Boolean(inferred?.is_fried);
});

const fryLabel = computed(() => {
  if (props.item.fry_config?.fry_name) {
    return props.item.fry_config.fry_name;
  }
  const inferred = inferFryConfigFromName(props.item.name);
  return inferred?.fry_name || props.item.name;
});
</script>

<style scoped>
.menu-item-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-lg, 18px);
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.menu-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  border-color: rgba(0, 113, 227, 0.25);
}

.menu-item-card--soldout {
  border-color: #fed7aa;
  background: #fffcf8;
}

.menu-item-card--inactive {
  opacity: 0.75;
  background: var(--color-surface-subtle, #fafafc);
}

/* Thumbnail */
.item-thumb {
  width: 76px;
  height: 76px;
  border-radius: var(--radius-md, 11px);
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 100%);
}

.fallback-icon {
  color: var(--color-muted-light, #86868b);
}

/* Text */
.item-title {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.35;
}

.item-price {
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--color-primary, #0071e3);
  letter-spacing: -0.01em;
}

/* Badges & Chips */
.ingredient-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-body, #414143);
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-pill, 980px);
  padding: 2px 8px;
}

.fry-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 600;
  color: #c2410c;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: var(--radius-pill, 980px);
  padding: 2px 8px;
}

.option-summary-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-muted, #6e6e73);
  background: var(--color-surface-alt, #e8e8ed);
  border-radius: var(--radius-pill, 980px);
  padding: 2px 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.option-summary-pill:hover {
  background: #dedee3;
  color: var(--color-ink, #1d1d1f);
}

.inactive-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-muted, #6e6e73);
  background: var(--color-surface-alt, #e8e8ed);
  border-radius: var(--radius-pill, 980px);
  padding: 2px 8px;
}

/* Card Action Bar */
.card-action-bar {
  border-top: 1px solid var(--color-border-subtle, #f5f5f7);
}

.edit-btn {
  transition: all 0.15s ease;
}

.edit-btn:hover {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-ink, #1d1d1f);
}

/* Quick Toggle Pill */
.quick-toggle-pill {
  display: inline-flex;
  align-items: center;
  border: none;
  font-family: var(--app-font-family, sans-serif);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-pill, 980px);
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.toggle-to-soldout {
  background: #fee2e2;
  color: #dc2626;
}

.toggle-to-soldout:hover {
  background: #fecaca;
}

.toggle-to-available {
  background: #dcfce7;
  color: #16a34a;
}

.toggle-to-available:hover {
  background: #bbf7d0;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}

.font-mono {
  font-family: var(--app-font-mono, sans-serif);
  font-variant-numeric: tabular-nums;
}
</style>
