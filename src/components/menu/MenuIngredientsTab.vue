<template>
  <div class="menu-ingredients-tab">
    <!-- 1. Stats Summary Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-4">
        <div class="ing-stat-card">
          <div class="row items-center justify-between no-wrap">
            <div>
              <div class="text-caption text-muted">วัตถุดิบทั้งหมด</div>
              <div class="text-h5 text-weight-bold text-ink font-mono q-mt-xs">
                {{ stats.total }}
                <span class="text-caption text-weight-normal text-muted">ชนิด</span>
              </div>
            </div>
            <div class="ing-stat-icon-wrap ing-stat-icon-wrap--blue">
              <q-icon name="inventory_2" size="22px" />
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-sm-4">
        <div class="ing-stat-card">
          <div class="row items-center justify-between no-wrap">
            <div>
              <div class="text-caption text-muted">พร้อมขายครบ</div>
              <div class="text-h5 text-weight-bold text-positive font-mono q-mt-xs">
                {{ stats.available }}
                <span class="text-caption text-weight-normal text-muted">ชนิด</span>
              </div>
            </div>
            <div class="ing-stat-icon-wrap ing-stat-icon-wrap--green">
              <q-icon name="check_circle" size="22px" />
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-sm-4">
        <div class="ing-stat-card" :class="{ 'ing-stat-card--highlight': stats.soldOut > 0 }">
          <div class="row items-center justify-between no-wrap">
            <div>
              <div class="text-caption text-muted">มีเมนูหมด (ปิดเมนูอยู่)</div>
              <div
                class="text-h5 text-weight-bold font-mono q-mt-xs"
                :class="stats.soldOut > 0 ? 'text-negative' : 'text-muted'"
              >
                {{ stats.soldOut }}
                <span class="text-caption text-weight-normal text-muted">ชนิด</span>
              </div>
            </div>
            <div
              class="ing-stat-icon-wrap"
              :class="stats.soldOut > 0 ? 'ing-stat-icon-wrap--red' : 'ing-stat-icon-wrap--neutral'"
            >
              <q-icon name="block" size="22px" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Filter & Search Bar -->
    <div class="menu-filter-card q-mb-lg">
      <div class="row items-center justify-between q-col-gutter-md">
        <!-- Status Filter Segment -->
        <div class="col-12 col-md-7">
          <div class="apple-status-filter">
            <button
              type="button"
              class="status-segment-btn"
              :class="{ 'status-segment-btn--active': filterStatus === 'all' }"
              @click="filterStatus = 'all'"
            >
              <q-icon name="apps" size="14px" class="q-mr-xs" />
              <span>วัตถุดิบทั้งหมด</span>
              <span class="pill-count-badge">{{ ingredientGroups.length }}</span>
            </button>

            <button
              type="button"
              class="status-segment-btn"
              :class="{ 'status-segment-btn--active': filterStatus === 'soldout' }"
              @click="filterStatus = 'soldout'"
            >
              <span class="status-dot dot-soldout"></span>
              <span>มีเมนูหมด</span>
              <span class="pill-count-badge">{{ stats.soldOut }}</span>
            </button>

            <button
              type="button"
              class="status-segment-btn"
              :class="{ 'status-segment-btn--active': filterStatus === 'available' }"
              @click="filterStatus = 'available'"
            >
              <span class="status-dot dot-available"></span>
              <span>พร้อมขายครบ</span>
              <span class="pill-count-badge">{{ stats.available }}</span>
            </button>
          </div>
        </div>

        <!-- Search Input -->
        <div class="col-12 col-md-5">
          <q-input
            v-model="searchQuery"
            outlined
            dense
            placeholder="ค้นหาชื่อวัตถุดิบ หรือ เมนูอาหาร..."
            class="apple-search-box"
            clearable
          >
            <template v-slot:prepend>
              <q-icon name="search" size="18px" class="text-muted" />
            </template>
          </q-input>
        </div>
      </div>

      <!-- Filter Meta Info -->
      <div class="row items-center justify-between q-mt-sm q-px-xs text-caption">
        <span class="text-muted">
          แสดง <strong>{{ filteredGroups.length }}</strong> จาก
          {{ ingredientGroups.length }} กลุ่มวัตถุดิบ
        </span>
        <button
          v-if="filterStatus !== 'all' || searchQuery.trim()"
          type="button"
          class="clear-filter-btn"
          @click="clearFilters"
        >
          <q-icon name="filter_alt_off" size="14px" class="q-mr-xs" />
          <span>ล้างตัวกรองทั้งหมด</span>
        </button>
      </div>
    </div>

    <!-- 3. Loading Skeleton -->
    <div v-if="isLoading" class="q-mb-lg">
      <LoadingSkeleton type="list" :count="4" />
    </div>

    <!-- 4. Empty Results -->
    <div v-else-if="filteredGroups.length === 0" class="apple-empty-card q-pa-xl text-center">
      <div class="empty-icon-circle q-mx-auto q-mb-md">
        <q-icon name="search_off" size="32px" color="primary" />
      </div>
      <div class="text-weight-bold text-subtitle1 text-ink">ไม่พบวัตถุดิบหรือเมนูอาหารที่ค้นหา</div>
      <div class="text-caption text-muted q-mt-xs">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</div>
    </div>

    <!-- 5. Ingredient Cards List -->
    <div v-else class="ingredients-list q-gutter-y-md">
      <div
        v-for="grp in filteredGroups"
        :key="grp.name"
        class="ingredient-card"
        :class="{
          'ingredient-card--soldout': grp.isAllSoldOut,
          'ingredient-card--partial': !grp.isAllSoldOut && grp.soldOutCount > 0,
        }"
      >
        <!-- Card Header -->
        <div
          class="row items-center justify-between q-pa-md ingredient-card-header flex-wrap q-gutter-y-sm"
        >
          <!-- Left Info -->
          <div class="row items-center no-wrap col-12 col-sm-auto q-mr-md">
            <div
              class="ingredient-icon-circle q-mr-md"
              :class="grp.isAllSoldOut ? 'bg-red-soft text-negative' : 'bg-blue-soft text-primary'"
            >
              <q-icon :name="grp.icon" size="22px" />
            </div>

            <div class="col ellipsis">
              <div class="row items-center flex-wrap q-gutter-xs">
                <span class="text-weight-bold text-subtitle1 text-ink">{{ grp.name }}</span>

                <span
                  class="ingredient-status-pill"
                  :class="{
                    'pill--soldout': grp.isAllSoldOut,
                    'pill--available': grp.isAllAvailable,
                    'pill--partial': !grp.isAllSoldOut && !grp.isAllAvailable,
                  }"
                >
                  <q-icon
                    :name="
                      grp.isAllSoldOut ? 'block' : grp.isAllAvailable ? 'check_circle' : 'warning'
                    "
                    size="13px"
                    class="q-mr-xs"
                  />
                  <span>
                    {{
                      grp.isAllSoldOut
                        ? 'หมดทุกเมนู'
                        : grp.isAllAvailable
                          ? 'พร้อมขายทุกเมนู'
                          : `มีเมนูหมด (${grp.soldOutCount}/${grp.totalCount})`
                    }}
                  </span>
                </span>
              </div>
              <div class="text-caption text-muted q-mt-xs">
                มี <strong>{{ grp.totalCount }}</strong> เมนูอาหารที่ใช้วัตถุดิบนี้ (พร้อมขาย
                {{ grp.availableCount }} / หมด {{ grp.soldOutCount }})
              </div>
            </div>
          </div>

          <!-- Right: Master Toggle & Accordion Button -->
          <div class="row items-center q-gutter-sm flex-shrink-0">
            <!-- Master Toggle Button -->
            <button
              v-if="!grp.isAllSoldOut"
              type="button"
              class="master-toggle-btn toggle-soldout"
              :disabled="isIngredientUpdating === grp.name"
              @click="emit('toggle-ingredient-stock', grp, false)"
            >
              <q-spinner v-if="isIngredientUpdating === grp.name" size="14px" class="q-mr-xs" />
              <q-icon v-else name="block" size="14px" class="q-mr-xs" />
              <span>ปรับเป็นหมด ({{ grp.availableCount }} เมนู)</span>
            </button>

            <button
              v-else
              type="button"
              class="master-toggle-btn toggle-available"
              :disabled="isIngredientUpdating === grp.name"
              @click="emit('toggle-ingredient-stock', grp, true)"
            >
              <q-spinner v-if="isIngredientUpdating === grp.name" size="14px" class="q-mr-xs" />
              <q-icon v-else name="check_circle" size="14px" class="q-mr-xs" />
              <span>เปิดขายทุกเมนู ({{ grp.totalCount }} เมนู)</span>
            </button>

            <!-- Expand Toggle Arrow -->
            <q-btn
              flat
              dense
              round
              :icon="expandedMap[grp.name] ? 'expand_less' : 'expand_more'"
              color="grey-7"
              @click="toggleExpand(grp.name)"
              aria-label="ดูรายการเมนู"
            />
          </div>
        </div>

        <!-- Expandable Sub-dishes Panel -->
        <q-slide-transition>
          <div v-show="expandedMap[grp.name]" class="ingredient-dishes-panel q-pa-md">
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-caption text-weight-semibold text-ink">
                รายชื่อเมนูอาหารที่ใช้วัตถุดิบ "{{ grp.name }}":
              </div>
              <div class="text-caption text-muted">คลิกสลับสถานะทีละเมนูได้</div>
            </div>

            <div class="dishes-subgrid">
              <div
                v-for="dish in grp.items"
                :key="dish.id"
                class="subdish-card"
                :class="{ 'subdish-card--soldout': !dish.is_available }"
              >
                <div class="row items-center justify-between no-wrap">
                  <div class="row items-center no-wrap col q-mr-sm">
                    <div class="subdish-thumb q-mr-sm">
                      <img v-if="dish.image_url" :src="dish.image_url" :alt="dish.name" />
                      <q-icon v-else name="restaurant" size="18px" color="grey-4" />
                    </div>
                    <div class="col ellipsis">
                      <div class="text-weight-semibold text-body2 text-ink ellipsis">
                        {{ dish.name }}
                      </div>
                      <div class="row items-center q-gutter-xs q-mt-xs">
                        <span class="text-caption text-primary text-weight-bold font-mono">
                          {{ formatPrice(dish.base_price) }}
                        </span>
                        <StatusBadge
                          :status="dish.is_available ? 'ACTIVE' : 'SOLDOUT'"
                          mode="raw"
                          :custom-label="dish.is_available ? 'พร้อมขาย' : 'หมด'"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Quick Toggle Button -->
                  <button
                    type="button"
                    class="subdish-toggle-btn"
                    :class="
                      dish.is_available ? 'subdish-toggle--soldout' : 'subdish-toggle--available'
                    "
                    @click="emit('toggle-dish-availability', dish)"
                  >
                    <q-icon
                      :name="dish.is_available ? 'block' : 'check_circle'"
                      size="12px"
                      class="q-mr-xs"
                    />
                    <span>{{ dish.is_available ? 'ปรับเป็นหมด' : 'เปิดขาย' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </q-slide-transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import type { MenuItem } from 'src/types/database';
import { formatPrice } from 'src/utils/formatters';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';

export interface IngredientGroupItem {
  name: string;
  icon: string;
  items: MenuItem[];
  totalCount: number;
  availableCount: number;
  soldOutCount: number;
  isAllSoldOut: boolean;
  isAllAvailable: boolean;
}

const props = defineProps<{
  ingredientGroups: IngredientGroupItem[];
  stats: { total: number; soldOut: number; available: number };
  isIngredientUpdating: string | null;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (
    e: 'toggle-ingredient-stock',
    grp: { name: string; items: MenuItem[] },
    targetAvailable: boolean,
  ): void;
  (e: 'toggle-dish-availability', item: MenuItem): void;
}>();

const filterStatus = ref<'all' | 'soldout' | 'available'>('all');
const searchQuery = ref('');
const expandedMap = reactive<Record<string, boolean>>({});

function toggleExpand(name: string) {
  expandedMap[name] = !expandedMap[name];
}

function clearFilters() {
  filterStatus.value = 'all';
  searchQuery.value = '';
}

const filteredGroups = computed(() => {
  let list = props.ingredientGroups;

  if (filterStatus.value === 'soldout') {
    list = list.filter((g) => g.soldOutCount > 0);
  } else if (filterStatus.value === 'available') {
    list = list.filter((g) => g.isAllAvailable);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list
      .map((g) => {
        const matchesGroupName = g.name.toLowerCase().includes(q);
        const matchingDishes = g.items.filter((i) => i.name.toLowerCase().includes(q));
        if (matchesGroupName) return g;
        if (matchingDishes.length > 0) {
          return {
            ...g,
            items: matchingDishes,
          };
        }
        return null;
      })
      .filter((g): g is IngredientGroupItem => g !== null);
  }

  return list;
});
</script>

<style scoped>
/* Stats Cards */
.ing-stat-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-lg, 18px);
  padding: 16px 20px;
  box-shadow: var(--shadow-subtle, 0 1px 2px rgba(0, 0, 0, 0.04));
}

.ing-stat-card--highlight {
  border-color: rgba(220, 38, 38, 0.25);
  background: #fffcfc;
}

.ing-stat-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ing-stat-icon-wrap--blue {
  background: rgba(0, 113, 227, 0.1);
  color: var(--color-primary, #0071e3);
}

.ing-stat-icon-wrap--green {
  background: #e8f5e9;
  color: #16a34a;
}

.ing-stat-icon-wrap--red {
  background: #fee2e2;
  color: #dc2626;
}

.ing-stat-icon-wrap--neutral {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-muted, #6e6e73);
}

/* Filter Card */
.menu-filter-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-lg, 18px);
  padding: 16px 20px;
  box-shadow: var(--shadow-subtle, 0 1px 2px rgba(0, 0, 0, 0.04));
}

.apple-status-filter {
  display: inline-flex;
  align-items: center;
  background: var(--color-surface-alt, #e8e8ed);
  padding: 3px;
  border-radius: var(--radius-pill, 980px);
  gap: 2px;
  overflow-x: auto;
  max-width: 100%;
}

.status-segment-btn {
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  color: var(--color-muted, #6e6e73);
  padding: 5px 12px;
  border-radius: var(--radius-pill, 980px);
  font-family: var(--app-font-family, sans-serif);
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.status-segment-btn:hover {
  color: var(--color-ink, #1d1d1f);
}

.status-segment-btn--active {
  background: var(--color-surface, #ffffff) !important;
  color: var(--color-ink, #1d1d1f) !important;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.pill-count-badge {
  background: rgba(0, 0, 0, 0.08);
  color: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: var(--radius-pill, 980px);
  margin-left: 6px;
  font-variant-numeric: tabular-nums;
}

.status-segment-btn--active .pill-count-badge {
  background: rgba(0, 113, 227, 0.1);
  color: var(--color-primary, #0071e3);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
  display: inline-block;
}

.dot-available {
  background: #16a34a;
}

.dot-soldout {
  background: #dc2626;
}

.apple-search-box {
  background: var(--color-surface-subtle, #fafafc);
  border-radius: var(--radius-pill, 980px);
}

.apple-search-box :deep(.q-field__control) {
  border-radius: var(--radius-pill, 980px);
  border-color: var(--color-hairline, #d2d2d7);
  background: var(--color-surface, #ffffff);
  height: 38px;
}

.clear-filter-btn {
  background: transparent;
  border: none;
  color: var(--color-primary, #0071e3);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0;
  outline: none;
}

.clear-filter-btn:hover {
  text-decoration: underline;
}

/* Empty Card */
.apple-empty-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-lg, 18px);
}

.empty-icon-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--color-surface-alt, #e8e8ed);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Ingredient Cards */
.ingredient-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-lg, 18px);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.ingredient-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.ingredient-card--soldout {
  border-color: #fecaca;
  background: #fffcfc;
}

.ingredient-card--partial {
  border-color: #fed7aa;
}

.ingredient-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md, 11px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bg-red-soft {
  background: #fee2e2;
}

.bg-blue-soft {
  background: rgba(0, 113, 227, 0.1);
}

.ingredient-status-pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill, 980px);
  display: inline-flex;
  align-items: center;
}

.pill--soldout {
  background: #fee2e2;
  color: #dc2626;
}

.pill--available {
  background: #dcfce7;
  color: #16a34a;
}

.pill--partial {
  background: #ffedd5;
  color: #ea580c;
}

/* Master Toggle Button */
.master-toggle-btn {
  display: inline-flex;
  align-items: center;
  border: none;
  font-family: var(--app-font-family, sans-serif);
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: var(--radius-pill, 980px);
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.toggle-soldout {
  background: #fee2e2;
  color: #dc2626;
}

.toggle-soldout:hover:not(:disabled) {
  background: #fecaca;
}

.toggle-available {
  background: #dcfce7;
  color: #16a34a;
}

.toggle-available:hover:not(:disabled) {
  background: #bbf7d0;
}

.master-toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Expandable Dishes Subgrid */
.ingredient-dishes-panel {
  background: var(--color-surface-subtle, #fafafc);
  border-top: 1px solid var(--color-hairline, #d2d2d7);
}

.dishes-subgrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.subdish-card {
  background: var(--color-surface, #ffffff);
  border-radius: var(--radius-md, 11px);
  border: 1px solid var(--color-hairline, #d2d2d7);
  padding: 10px 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  transition: all 0.15s ease;
}

.subdish-card:hover {
  border-color: rgba(0, 113, 227, 0.3);
}

.subdish-card--soldout {
  opacity: 0.8;
  background: #fdf2f2;
  border-color: #fecaca;
}

.subdish-thumb {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-sm, 8px);
  background: var(--color-surface-subtle, #fafafc);
  border: 1px solid var(--color-hairline, #d2d2d7);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.subdish-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.subdish-toggle-btn {
  display: inline-flex;
  align-items: center;
  border: none;
  font-family: var(--app-font-family, sans-serif);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-pill, 980px);
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
  white-space: nowrap;
}

.subdish-toggle--soldout {
  background: #fee2e2;
  color: #dc2626;
}

.subdish-toggle--soldout:hover {
  background: #fecaca;
}

.subdish-toggle--available {
  background: #dcfce7;
  color: #16a34a;
}

.subdish-toggle--available:hover {
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
