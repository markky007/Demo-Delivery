<template>
  <div class="menu-categories-tab">
    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="q-mb-lg">
      <LoadingSkeleton type="list" :count="4" />
    </div>

    <!-- Empty State -->
    <div v-else-if="categories.length === 0" class="apple-empty-card q-pa-xl text-center">
      <div class="empty-icon-circle q-mx-auto q-mb-md">
        <q-icon name="category" size="32px" color="primary" />
      </div>
      <div class="text-weight-bold text-subtitle1 text-ink">ยังไม่มีหมวดหมู่เมนูในระบบ</div>
      <div class="text-caption text-muted q-mt-xs q-mb-md">
        เริ่มต้นด้วยการสร้างหมวดหมู่ เช่น อาหารจานเดียว, ทานเล่น, เครื่องดื่ม
      </div>
      <q-btn
        unelevated
        no-caps
        icon="add"
        label="เพิ่มหมวดหมู่แรก"
        class="apple-pill-btn apple-pill-btn--primary"
        @click="emit('add')"
      />
    </div>

    <!-- Categories List -->
    <div v-else class="categories-list q-gutter-y-sm">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="category-item-card"
        :class="{ 'category-item-card--inactive': !cat.is_active }"
      >
        <div class="row items-center justify-between no-wrap">
          <div class="row items-center no-wrap col q-mr-md">
            <div class="sort-order-handle q-mr-sm">
              <q-icon name="drag_indicator" size="18px" color="grey-5" />
            </div>

            <div class="category-icon-wrap q-mr-md">
              <q-icon name="folder" size="20px" color="primary" />
            </div>

            <div class="col ellipsis">
              <div class="row items-center q-gutter-xs">
                <span class="text-weight-bold text-subtitle1 text-ink category-name">{{
                  cat.name
                }}</span>
                <span class="category-count-badge">
                  {{ categoryItemCountMap[cat.id] || 0 }} รายการ
                </span>
              </div>
              <div class="text-caption text-muted q-mt-xs">ลำดับการแสดง: {{ cat.sort_order }}</div>
            </div>
          </div>

          <!-- Right Status & Edit -->
          <div class="row items-center q-gutter-sm flex-shrink-0">
            <StatusBadge
              :status="cat.is_active ? 'ACTIVE' : 'INACTIVE'"
              mode="raw"
              :custom-label="cat.is_active ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'"
            />

            <q-btn
              flat
              dense
              round
              icon="edit"
              size="sm"
              color="grey-7"
              class="edit-btn"
              @click="emit('edit', cat)"
            >
              <q-tooltip>แก้ไขหมวดหมู่</q-tooltip>
            </q-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MenuCategory } from 'src/types/database';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';

defineProps<{
  categories: MenuCategory[];
  categoryItemCountMap: Record<string, number>;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'edit', category: MenuCategory): void;
  (e: 'add'): void;
}>();
</script>

<style scoped>
.category-item-card {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: var(--radius-lg, 18px);
  padding: 14px 18px;
  box-shadow: var(--shadow-subtle, 0 1px 2px rgba(0, 0, 0, 0.04));
  transition: all 0.2s ease;
}

.category-item-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 113, 227, 0.3);
}

.category-item-card--inactive {
  opacity: 0.75;
  background: var(--color-surface-subtle, #fafafc);
}

.sort-order-handle {
  cursor: grab;
}

.category-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 113, 227, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.category-name {
  font-size: 1rem;
}

.category-count-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted, #6e6e73);
  background: var(--color-surface-alt, #e8e8ed);
  border-radius: var(--radius-pill, 980px);
  padding: 2px 8px;
}

.edit-btn {
  transition: all 0.15s ease;
}

.edit-btn:hover {
  background: var(--color-surface-alt, #e8e8ed);
  color: var(--color-ink, #1d1d1f);
}

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

.apple-pill-btn {
  border-radius: var(--radius-pill, 980px) !important;
  font-size: 0.875rem;
  font-weight: 600;
  height: 40px;
  padding: 0 20px;
}

.apple-pill-btn--primary {
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-muted {
  color: var(--color-muted, #6e6e73);
}
</style>
