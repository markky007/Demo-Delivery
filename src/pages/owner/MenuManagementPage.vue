<template>
  <q-page class="menu-mgmt-page q-pa-md">
    <div class="menu-mgmt-container">
      <!-- Tabs Header -->
      <div class="row items-center justify-between q-mb-lg flex-wrap q-gutter-y-sm">
        <q-tabs
          v-model="activeTab"
          no-caps
          align="left"
          class="custom-tabs"
          active-color="primary"
          indicator-color="primary"
        >
          <q-tab name="items" label="รายการอาหาร" icon="restaurant_menu" />
          <q-tab name="ingredients" label="จัดการวัตถุดิบ (สต็อก)" icon="inventory_2" />
          <q-tab name="categories" label="หมวดหมู่เมนู" icon="category" />
        </q-tabs>

        <q-btn
          v-if="activeTab === 'items'"
          color="primary"
          unelevated
          no-caps
          rounded
          icon="add"
          label="เพิ่มเมนูอาหาร"
          @click="openAddItemDialog"
          class="add-btn"
        />
        <q-btn
          v-else-if="activeTab === 'categories'"
          color="primary"
          unelevated
          no-caps
          rounded
          icon="add"
          label="เพิ่มหมวดหมู่"
          @click="openAddCategoryDialog"
          class="add-btn"
        />
      </div>

      <!-- 1. Menu Items Tab -->
      <div v-if="activeTab === 'items'">
        <!-- Filter & Search Bar Section -->
        <div class="filter-card q-mb-lg q-pa-md">
          <div class="row items-center justify-between q-col-gutter-md">
            <!-- Category Pills Filter -->
            <div class="col-12 col-md-8">
              <div class="category-pills-scroll">
                <!-- All categories pill -->
                <button
                  type="button"
                  class="cat-filter-pill"
                  :class="{ 'cat-filter-pill--active': filterCategory === null }"
                  @click="filterCategory = null"
                >
                  <q-icon name="apps" size="16px" class="q-mr-xs" />
                  <span>ทั้งหมด</span>
                  <span class="cat-count-badge">{{ menuStore.items.length }}</span>
                </button>

                <!-- Category pills -->
                <button
                  v-for="cat in menuStore.categories"
                  :key="cat.id"
                  type="button"
                  class="cat-filter-pill"
                  :class="{ 'cat-filter-pill--active': filterCategory === cat.id }"
                  @click="filterCategory = cat.id"
                >
                  <span>{{ cat.name }}</span>
                  <span class="cat-count-badge">{{ getItemCountByCategory(cat.id) }}</span>
                </button>
              </div>
            </div>

            <!-- Search input -->
            <div class="col-12 col-md-4">
              <q-input
                v-model="searchQuery"
                outlined
                dense
                placeholder="ค้นหาชื่อเมนู..."
                class="search-input-box"
                clearable
              >
                <template v-slot:prepend>
                  <q-icon name="search" size="18px" color="grey-6" />
                </template>
              </q-input>
            </div>
          </div>

          <!-- Filter Meta Info -->
          <div class="row items-center justify-between q-mt-sm text-caption text-grey-7 q-px-xs">
            <span
              >แสดง <strong>{{ filteredItems.length }}</strong> จาก
              {{ menuStore.items.length }} รายการอาหาร</span
            >
            <span
              v-if="filterCategory !== null || searchQuery"
              class="clear-filter-link cursor-pointer text-weight-medium"
              @click="clearFilters"
            >
              ล้างการกรอง
            </span>
          </div>
        </div>

        <!-- Loading Skeleton -->
        <div v-if="menuStore.isLoading" class="q-mb-lg">
          <LoadingSkeleton type="menu" :count="6" />
        </div>

        <template v-else>
          <!-- Menu Items Grid -->
          <div class="items-grid">
            <div v-for="item in filteredItems" :key="item.id" class="item-card">
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
                  <q-icon v-else name="restaurant" size="24px" color="grey-4" />
                </div>

                <!-- Item Info -->
                <div class="col">
                  <div class="text-weight-bold item-title">{{ item.name }}</div>
                  <div class="item-price q-mt-xs">{{ formatPrice(item.base_price) }}</div>
                  <div class="row items-center flex-wrap q-gutter-xs q-mt-xs">
                    <StatusBadge
                      :status="item.is_available ? 'ACTIVE' : 'SOLDOUT'"
                      mode="raw"
                      :custom-label="item.is_available ? 'พร้อมขาย' : 'หมดชั่วคราว'"
                    />
                    <q-badge v-if="!item.is_active" color="grey-5" label="ปิดการใช้งาน" />
                    <q-badge
                      color="blue-grey-1"
                      text-color="blue-grey-9"
                      class="text-weight-medium"
                    >
                      <q-icon :name="getIngredientIcon(getItemMainIngredient(item))" size="12px" class="q-mr-xs" />
                      {{ getItemMainIngredient(item) }}
                    </q-badge>
                    <q-badge
                      v-if="isItemFried(item)"
                      color="deep-orange-8"
                      rounded
                      class="q-px-xs fry-indicator-badge"
                    >
                      <q-icon name="local_fire_department" size="12px" class="q-mr-xs" />
                      <span>ต้องทอด ({{ getFryLabel(item) }})</span>
                    </q-badge>
                  </div>

                  <!-- Option Groups preview tags on card -->
                  <div
                    v-if="(itemOptionGroupNamesMap[item.id] || []).length > 0"
                    class="item-opt-tags-wrap q-mt-xs"
                  >
                    <span
                      v-for="gName in itemOptionGroupNamesMap[item.id]"
                      :key="gName"
                      class="item-opt-tag"
                    >
                      <q-icon name="tune" size="10px" class="q-mr-xs" />
                      {{ gName }}
                    </span>
                  </div>
                </div>

                <!-- Action Controls -->
                <div class="column items-end q-gutter-xs">
                  <q-btn
                    flat
                    dense
                    round
                    icon="edit"
                    size="sm"
                    color="grey-7"
                    @click="editItem(item)"
                    aria-label="แก้ไขเมนู"
                  />

                  <!-- Quick Availability Toggle Button -->
                  <q-btn
                    unelevated
                    no-caps
                    dense
                    size="sm"
                    :color="item.is_available ? 'red-1' : 'green-1'"
                    :text-color="item.is_available ? 'negative' : 'positive'"
                    :icon="item.is_available ? 'block' : 'check_circle'"
                    :label="item.is_available ? 'ปรับเป็นหมด' : 'เปิดขาย'"
                    class="quick-toggle-btn"
                    @click="toggleAvailability(item)"
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="filteredItems.length === 0"
            class="text-center q-pa-xl text-grey-6 empty-search-card"
          >
            <q-icon name="search_off" size="48px" color="grey-4" class="q-mb-xs" />
            <div class="text-weight-bold text-subtitle1">ไม่พบรายการอาหารที่ค้นหา</div>
            <div class="text-caption text-grey-6 q-mt-xs">
              ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น
            </div>
          </div>
        </template>
      </div>

      <!-- 2. Ingredients Stock Management Tab -->
      <div v-if="activeTab === 'ingredients'">
        <!-- Stats Summary Bar -->
        <div class="row q-col-gutter-md q-mb-lg">
          <div class="col-12 col-sm-4">
            <div class="ing-stat-card">
              <div class="row items-center justify-between">
                <div>
                  <div class="text-caption text-grey-7">วัตถุดิบทั้งหมด</div>
                  <div class="text-h5 text-weight-bold text-dark q-mt-xs">
                    {{ ingredientStats.total }} <span class="text-caption text-weight-normal">ชนิด</span>
                  </div>
                </div>
                <div class="ing-stat-icon-wrap bg-blue-1 text-primary">
                  <q-icon name="inventory_2" size="24px" />
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-sm-4">
            <div class="ing-stat-card">
              <div class="row items-center justify-between">
                <div>
                  <div class="text-caption text-grey-7">วัตถุดิบพร้อมขาย</div>
                  <div class="text-h5 text-weight-bold text-positive q-mt-xs">
                    {{ ingredientStats.available }} <span class="text-caption text-weight-normal">ชนิด</span>
                  </div>
                </div>
                <div class="ing-stat-icon-wrap bg-green-1 text-positive">
                  <q-icon name="check_circle" size="24px" />
                </div>
              </div>
            </div>
          </div>

          <div class="col-12 col-sm-4">
            <div class="ing-stat-card">
              <div class="row items-center justify-between">
                <div>
                  <div class="text-caption text-grey-7">วัตถุดิบที่หมด (ปิดเมนูอยู่)</div>
                  <div class="text-h5 text-weight-bold text-negative q-mt-xs">
                    {{ ingredientStats.soldOut }} <span class="text-caption text-weight-normal">ชนิด</span>
                  </div>
                </div>
                <div class="ing-stat-icon-wrap bg-red-1 text-negative">
                  <q-icon name="block" size="24px" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter & Search Bar Section -->
        <div class="filter-card q-mb-lg q-pa-md">
          <div class="row items-center justify-between q-col-gutter-md">
            <!-- Filter Status Pills -->
            <div class="col-12 col-md-7">
              <div class="category-pills-scroll">
                <button
                  type="button"
                  class="cat-filter-pill"
                  :class="{ 'cat-filter-pill--active': filterIngredientStatus === 'all' }"
                  @click="filterIngredientStatus = 'all'"
                >
                  <q-icon name="apps" size="16px" class="q-mr-xs" />
                  <span>วัตถุดิบทั้งหมด</span>
                  <span class="cat-count-badge">{{ ingredientGroups.length }}</span>
                </button>

                <button
                  type="button"
                  class="cat-filter-pill"
                  :class="{ 'cat-filter-pill--active': filterIngredientStatus === 'soldout' }"
                  @click="filterIngredientStatus = 'soldout'"
                >
                  <q-icon name="block" size="16px" class="q-mr-xs text-negative" />
                  <span>มีเมนูหมด</span>
                  <span class="cat-count-badge">{{ ingredientStats.soldOut }}</span>
                </button>

                <button
                  type="button"
                  class="cat-filter-pill"
                  :class="{ 'cat-filter-pill--active': filterIngredientStatus === 'available' }"
                  @click="filterIngredientStatus = 'available'"
                >
                  <q-icon name="check_circle" size="16px" class="q-mr-xs text-positive" />
                  <span>พร้อมขายครบ</span>
                  <span class="cat-count-badge">{{ ingredientStats.available }}</span>
                </button>
              </div>
            </div>

            <!-- Search input -->
            <div class="col-12 col-md-5">
              <q-input
                v-model="searchIngredientQuery"
                outlined
                dense
                placeholder="ค้นหาชื่อวัตถุดิบ หรือ ชื่อเมนูอาหาร..."
                class="search-input-box"
                clearable
              >
                <template v-slot:prepend>
                  <q-icon name="search" size="18px" color="grey-6" />
                </template>
              </q-input>
            </div>
          </div>

          <!-- Filter Meta Info -->
          <div class="row items-center justify-between q-mt-sm text-caption text-grey-7 q-px-xs">
            <span>
              แสดง <strong>{{ filteredIngredientGroups.length }}</strong> จาก {{ ingredientGroups.length }} กลุ่มวัตถุดิบ
            </span>
            <span
              v-if="filterIngredientStatus !== 'all' || searchIngredientQuery"
              class="clear-filter-link cursor-pointer text-weight-medium"
              @click="clearIngredientFilters"
            >
              ล้างการกรอง
            </span>
          </div>
        </div>

        <!-- Loading Skeleton -->
        <div v-if="menuStore.isLoading" class="q-mb-lg">
          <LoadingSkeleton type="list" :count="4" />
        </div>

        <div
          v-else-if="filteredIngredientGroups.length === 0"
          class="text-center q-pa-xl text-grey-6 empty-search-card"
        >
          <q-icon name="search_off" size="48px" color="grey-4" class="q-mb-xs" />
          <div class="text-weight-bold text-subtitle1">ไม่พบวัตถุดิบหรือรายการอาหารที่ค้นหา</div>
          <div class="text-caption text-grey-6 q-mt-xs">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</div>
        </div>

        <!-- Ingredient Groups List -->
        <div v-else class="ingredients-list q-gutter-y-md">
          <div
            v-for="grp in filteredIngredientGroups"
            :key="grp.name"
            class="ingredient-card"
            :class="{
              'ingredient-card--soldout': grp.isAllSoldOut,
              'ingredient-card--partial': !grp.isAllSoldOut && grp.soldOutCount > 0,
            }"
          >
            <!-- Card Header -->
            <div class="row items-center justify-between q-pa-md ingredient-card-header">
              <!-- Left Info -->
              <div class="row items-center no-wrap col q-mr-md">
                <div
                  class="ingredient-icon-circle q-mr-md"
                  :class="grp.isAllSoldOut ? 'bg-red-1 text-negative' : 'bg-orange-1 text-primary'"
                >
                  <q-icon :name="grp.icon" size="22px" />
                </div>
                <div class="col ellipsis">
                  <div class="row items-center flex-wrap q-gutter-xs">
                    <span class="text-weight-bold text-subtitle1 ingredient-name-text">{{ grp.name }}</span>
                    
                    <span
                      class="ingredient-status-pill"
                      :class="{
                        'pill--soldout': grp.isAllSoldOut,
                        'pill--available': grp.isAllAvailable,
                        'pill--partial': !grp.isAllSoldOut && !grp.isAllAvailable,
                      }"
                    >
                      <q-icon
                        :name="grp.isAllSoldOut ? 'block' : grp.isAllAvailable ? 'check_circle' : 'warning'"
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
                  <div class="text-caption text-grey-7 q-mt-xs">
                    มี <strong>{{ grp.totalCount }}</strong> เมนูอาหารที่ใช้วัตถุดิบนี้ (พร้อมขาย {{ grp.availableCount }} / หมด {{ grp.soldOutCount }})
                  </div>
                </div>
              </div>

              <!-- Right Master Toggle & Accordion Button -->
              <div class="row items-center q-gutter-sm flex-shrink-0">
                <!-- Master Toggle Button for all items in this ingredient -->
                <q-btn
                  v-if="!grp.isAllSoldOut"
                  unelevated
                  no-caps
                  color="red-1"
                  text-color="negative"
                  icon="block"
                  :label="`ปรับเป็นหมด (${grp.availableCount} เมนู)`"
                  class="master-stock-toggle-btn"
                  @click="toggleIngredientStock(grp, false)"
                  :loading="isIngredientUpdating === grp.name"
                >
                  <q-tooltip>ปิดการขายทุกเมนูที่ใช้วัตถุดิบ {{ grp.name }}</q-tooltip>
                </q-btn>
                <q-btn
                  v-else
                  unelevated
                  no-caps
                  color="green-1"
                  text-color="positive"
                  icon="check_circle"
                  :label="`เปิดขายทุกเมนู (${grp.totalCount} เมนู)`"
                  class="master-stock-toggle-btn"
                  @click="toggleIngredientStock(grp, true)"
                  :loading="isIngredientUpdating === grp.name"
                >
                  <q-tooltip>เปิดขายทุกเมนูที่ใช้วัตถุดิบ {{ grp.name }}</q-tooltip>
                </q-btn>

                <!-- Toggle Dropdown Arrow -->
                <q-btn
                  flat
                  dense
                  round
                  :icon="expandedIngredients[grp.name] ? 'expand_less' : 'expand_more'"
                  color="grey-7"
                  @click="expandedIngredients[grp.name] = !expandedIngredients[grp.name]"
                  aria-label="ดูรายการเมนู"
                />
              </div>
            </div>

            <!-- Expandable Nested Dishes Sub-list -->
            <q-slide-transition>
              <div v-show="expandedIngredients[grp.name]" class="ingredient-dishes-panel q-pa-md">
                <div class="row items-center justify-between q-mb-sm">
                  <div class="text-caption text-weight-bold text-grey-8">
                    รายชื่อเมนูอาหารที่ใช้วัตถุดิบ "{{ grp.name }}":
                  </div>
                  <div class="text-caption text-grey-6">
                    คลิกสลับสถานะทีละเมนูได้
                  </div>
                </div>

                <div class="dishes-subgrid">
                  <div
                    v-for="item in grp.items"
                    :key="item.id"
                    class="subdish-card"
                    :class="{ 'subdish-card--soldout': !item.is_available }"
                  >
                    <div class="row items-center justify-between no-wrap">
                      <div class="row items-center no-wrap col q-mr-sm">
                        <div class="subdish-thumb q-mr-sm">
                          <img v-if="item.image_url" :src="item.image_url" :alt="item.name" />
                          <q-icon v-else name="restaurant" size="18px" color="grey-4" />
                        </div>
                        <div class="col ellipsis">
                          <div class="text-weight-bold text-body2 subdish-name ellipsis">{{ item.name }}</div>
                          <div class="row items-center q-gutter-xs q-mt-xs">
                            <span class="text-caption text-primary text-weight-bold">
                              {{ formatPrice(item.base_price) }}
                            </span>
                            <StatusBadge
                              :status="item.is_available ? 'ACTIVE' : 'SOLDOUT'"
                              mode="raw"
                              :custom-label="item.is_available ? 'พร้อมขาย' : 'หมด'"
                            />
                          </div>
                        </div>
                      </div>

                      <q-btn
                        unelevated
                        no-caps
                        dense
                        size="sm"
                        :color="item.is_available ? 'red-1' : 'green-1'"
                        :text-color="item.is_available ? 'negative' : 'positive'"
                        :icon="item.is_available ? 'block' : 'check_circle'"
                        :label="item.is_available ? 'ปรับเป็นหมด' : 'เปิดขาย'"
                        class="quick-toggle-btn"
                        @click="toggleAvailability(item)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </q-slide-transition>
          </div>
        </div>
      </div>

      <!-- 3. Categories Tab -->
      <div v-if="activeTab === 'categories'">
        <!-- Loading Skeleton -->
        <div v-if="menuStore.isLoading" class="q-mb-lg">
          <LoadingSkeleton type="list" :count="4" />
        </div>

        <div v-else class="categories-list q-gutter-y-sm">
          <div v-for="cat in menuStore.categories" :key="cat.id" class="category-item-card">
            <div class="row items-center justify-between">
              <div class="row items-center">
                <q-icon name="drag_indicator" color="grey-4" class="q-mr-sm" />
                <div>
                  <div class="text-weight-bold text-subtitle2">{{ cat.name }}</div>
                  <div class="text-caption text-grey-6">
                    ลำดับการแสดง: {{ cat.sort_order }} • มี
                    {{ getItemCountByCategory(cat.id) }} รายการ
                  </div>
                </div>
              </div>

              <div class="row items-center q-gutter-sm">
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
                  @click="editCategory(cat)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Modal Dialog -->
      <q-dialog v-model="showCatDialog">
        <q-card style="min-width: 340px; max-width: 440px" class="q-pa-sm">
          <q-card-section>
            <div class="text-h6 text-weight-bold">
              {{ editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่' }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none q-gutter-y-md">
            <div>
              <div class="field-label q-mb-xs">ชื่อหมวดหมู่</div>
              <q-input
                v-model="catForm.name"
                outlined
                placeholder="เช่น อาหารจานเดียว, เครื่องดื่ม"
                autofocus
              />
            </div>
            <q-toggle v-model="catForm.is_active" label="เปิดใช้งานหมวดหมู่นี้" color="primary" />
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn flat label="ยกเลิก" no-caps v-close-popup />
            <q-btn
              unelevated
              color="primary"
              label="บันทึก"
              no-caps
              rounded
              @click="saveCategory"
              :loading="isSaving"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- Menu Item Modal Dialog (With Image Upload & Main Ingredient) -->
      <q-dialog v-model="showItemDialog" full-width>
        <q-card style="max-width: 600px" class="q-pa-sm">
          <q-card-section>
            <div class="text-h6 text-weight-bold">
              {{ editingItem ? 'แก้ไขเมนูอาหาร' : 'เพิ่มเมนูอาหารใหม่' }}
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none q-gutter-y-md">
            <!-- Image Upload & Preview Section -->
            <div>
              <div class="field-label q-mb-xs">รูปภาพอาหาร</div>

              <!-- Upload Dropzone / Image Preview -->
              <div class="image-uploader-box">
                <!-- Preview when image exists -->
                <div v-if="previewImageUrl" class="image-preview-wrapper">
                  <img :src="previewImageUrl" alt="Preview" class="preview-img" />
                  <div class="image-overlay-actions">
                    <q-btn
                      unelevated
                      no-caps
                      rounded
                      size="sm"
                      color="white"
                      text-color="dark"
                      icon="photo_camera"
                      label="เปลี่ยนรูปภาพ"
                      @click="triggerFileInput"
                      class="q-mr-xs"
                    />
                    <q-btn
                      unelevated
                      no-caps
                      rounded
                      size="sm"
                      color="negative"
                      icon="delete"
                      label="ลบรูป"
                      @click="removeImage"
                    />
                  </div>
                </div>

                <!-- Empty dropzone when no image -->
                <div v-else class="upload-dropzone" @click="triggerFileInput">
                  <div class="column items-center justify-center q-pa-lg text-center">
                    <div class="upload-icon-circle q-mb-sm">
                      <q-icon name="cloud_upload" size="32px" color="primary" />
                    </div>
                    <div class="text-weight-bold text-subtitle2 text-primary">
                      คลิกเพื่ออัปโหลดรูปภาพอาหาร
                    </div>
                    <div class="text-caption text-grey-6 q-mt-xs">
                      รองรับไฟล์ JPG, PNG, WebP (ขนาดไม่เกิน 5MB)
                    </div>
                  </div>
                </div>

                <!-- Hidden Native File Input -->
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden-file-input"
                  @change="handleFileSelected"
                />
              </div>

              <!-- Optional Direct URL Input Accordion -->
              <q-expansion-item
                dense
                label="หรือใส่ลิงก์รูปภาพโดยตรง (Image URL)"
                header-class="text-caption text-grey-7 q-px-none"
                class="q-mt-xs"
              >
                <q-input
                  v-model="itemForm.image_url"
                  outlined
                  dense
                  placeholder="https://example.com/image.jpg"
                  class="q-mt-xs"
                  @update:model-value="handleUrlInput"
                />
              </q-expansion-item>
            </div>

            <div>
              <div class="field-label q-mb-xs">ชื่อเมนูอาหาร</div>
              <q-input v-model="itemForm.name" outlined placeholder="เช่น ข้าวกะเพราไก่ไข่ดาว" />
            </div>

            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6">
                <div class="field-label q-mb-xs">หมวดหมู่</div>
                <q-select
                  v-model="itemForm.category_id"
                  :options="categoryOptions"
                  outlined
                  emit-value
                  map-options
                  placeholder="เลือกหมวดหมู่"
                />
              </div>
              <div class="col-12 col-sm-6">
                <div class="field-label q-mb-xs">วัตถุดิบหลัก (Main Ingredient)</div>
                <q-select
                  v-model="itemForm.main_ingredient"
                  :options="ingredientSelectOptions"
                  outlined
                  use-input
                  new-value-mode="add-unique"
                  placeholder="เช่น ไก่ทอด, หมูกรอบ, กุ้ง"
                  clearable
                />
              </div>
            </div>

            <div>
              <div class="field-label q-mb-xs">ราคาฐาน (บาท)</div>
              <q-input
                v-model.number="itemForm.base_price"
                outlined
                type="number"
                min="0"
                placeholder="60"
              />
            </div>

            <div>
              <div class="field-label q-mb-xs">รายละเอียดเมนู</div>
              <q-input
                v-model="itemForm.description"
                outlined
                type="textarea"
                autogrow
                placeholder="คำอธิบายรสชาติหรือวัตถุดิบ..."
              />
            </div>

            <!-- Fry Settings Section (การตั้งค่าของทอด) -->
            <div class="fry-settings-box q-pa-md">
              <div class="row items-center justify-between">
                <div class="row items-center">
                  <div class="fry-icon-circle q-mr-sm">
                    <q-icon name="local_fire_department" size="20px" color="deep-orange-9" />
                  </div>
                  <div>
                    <div class="text-weight-bold text-subtitle2 text-deep-orange-10">
                      การตั้งค่าของทอด (Fry Station)
                    </div>
                    <div class="text-caption text-grey-7">
                      เปิดเพื่อส่งรายการของทอดเข้าสู่ "คิวของทอด" ให้คนทอดเตรียมอัตโนมัติ
                    </div>
                  </div>
                </div>
                <q-toggle v-model="itemFryConfig.is_fried" color="deep-orange-8" />
              </div>

              <!-- Fry Details Form when toggle is active -->
              <div v-if="itemFryConfig.is_fried" class="q-mt-md q-pt-sm fry-details-content">
                <!-- Preset chips -->
                <div class="row items-center q-gutter-xs q-mb-sm">
                  <span class="text-caption text-grey-7">เทมเพลตด่วน:</span>
                  <q-chip
                    clickable
                    dense
                    outline
                    color="deep-orange-8"
                    icon="add"
                    @click="applyFryPreset('ไก่ทอด', 'ออเดอร์', 'ไก่ทอดพิเศษ')"
                  >
                    ไก่ทอด
                  </q-chip>
                  <q-chip
                    clickable
                    dense
                    outline
                    color="deep-orange-8"
                    icon="add"
                    @click="applyFryPreset('เอ็นไก่ทอด', 'ออเดอร์', 'เอ็นไก่ทอดพิเศษ')"
                  >
                    เอ็นไก่ทอด
                  </q-chip>
                  <q-chip
                    clickable
                    dense
                    outline
                    color="deep-orange-8"
                    icon="add"
                    @click="
                      applyFryPreset('ปีกไก่ทอด (3 ปีก)', 'ออเดอร์', 'ปีกไก่ทอดพิเศษ (4 ปีก)')
                    "
                  >
                    ปีกไก่
                  </q-chip>
                  <q-chip
                    clickable
                    dense
                    outline
                    color="deep-orange-8"
                    icon="add"
                    @click="applyFryPreset('สามชั้นทอด', 'ออเดอร์', 'สามชั้นทอดพิเศษ')"
                  >
                    สามชั้นทอด
                  </q-chip>
                </div>

                <div class="row q-col-gutter-sm">
                  <div class="col-12 col-sm-8">
                    <div class="field-label q-mb-xs">ชื่อของทอด (ขนาดธรรมดา)</div>
                    <q-input
                      v-model="itemFryConfig.fry_name"
                      outlined
                      dense
                      placeholder="เช่น ไก่ทอด, เอ็นไก่ทอด, ปีกไก่ 2 ปีก"
                    />
                  </div>
                  <div class="col-12 col-sm-4">
                    <div class="field-label q-mb-xs">จำนวน (ธรรมดา)</div>
                    <q-input
                      v-model.number="itemFryConfig.fry_qty"
                      type="number"
                      min="1"
                      outlined
                      dense
                    />
                  </div>
                </div>

                <div class="row q-col-gutter-sm q-mt-xs">
                  <div class="col-12 col-sm-8">
                    <div class="field-label q-mb-xs">ชื่อของทอด (เมื่อสั่งพิเศษ)</div>
                    <q-input
                      v-model="itemFryConfig.special_fry_name"
                      outlined
                      dense
                      placeholder="เช่น ไก่ทอดพิเศษ, เอ็นไก่ทอดพิเศษ (เว้นว่างได้)"
                    />
                  </div>
                  <div class="col-12 col-sm-4">
                    <div class="field-label q-mb-xs">จำนวน (พิเศษ)</div>
                    <q-input
                      v-model.number="itemFryConfig.special_fry_qty"
                      type="number"
                      min="1"
                      outlined
                      dense
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Option Groups Selector Section -->
            <div class="option-groups-section">
              <div class="row items-center justify-between q-mb-xs">
                <div class="field-label text-weight-bold row items-center">
                  <q-icon name="tune" size="18px" color="primary" class="q-mr-xs" />
                  <span>กลุ่มตัวเลือกเสริม (Option Groups)</span>
                </div>
                <q-btn
                  flat
                  dense
                  no-caps
                  color="primary"
                  icon="open_in_new"
                  label="จัดการตัวเลือกเสริม"
                  size="sm"
                  to="/owner/options"
                  class="manage-options-link"
                />
              </div>
              <p class="text-caption text-grey-6 q-mb-sm">
                เลือกกลุ่มตัวเลือกที่เปิดให้ลูกค้าเลือกเพิ่มเติมสำหรับเมนูนี้
              </p>

              <!-- Loading state for option groups -->
              <div v-if="isLoadingOptionGroups" class="q-py-md text-center">
                <q-spinner color="primary" size="24px" />
                <div class="text-caption text-grey-6 q-mt-xs">กำลังโหลดกลุ่มตัวเลือก...</div>
              </div>

              <!-- Empty state when no option groups exist in restaurant -->
              <div
                v-else-if="allOptionGroups.length === 0"
                class="no-options-hint q-pa-md text-center"
              >
                <q-icon name="tune" size="32px" color="grey-4" class="q-mb-xs" />
                <div class="text-weight-medium text-caption text-grey-8">
                  ยังไม่มีการสร้างกลุ่มตัวเลือกในระบบ
                </div>
                <div class="text-caption text-grey-6 q-mt-xs">
                  สร้างกลุ่มตัวเลือกก่อน เช่น ระดับความเผ็ด, เพิ่มไข่ดาว, ระดับความหวาน
                </div>
                <q-btn
                  outline
                  dense
                  no-caps
                  color="primary"
                  icon="add"
                  label="ไปสร้างกลุ่มตัวเลือกใหม่"
                  to="/owner/options"
                  class="q-mt-sm"
                  size="sm"
                />
              </div>

              <!-- Option Groups Selection Cards List -->
              <div v-else class="option-groups-grid q-gutter-y-xs">
                <div
                  v-for="group in allOptionGroups"
                  :key="group.id"
                  class="option-group-card-choice"
                  :class="{
                    'option-group-card-choice--selected': selectedOptionGroupIds.includes(group.id),
                  }"
                  @click="toggleOptionGroup(group.id)"
                >
                  <div class="row items-center justify-between no-wrap">
                    <div class="row items-center no-wrap col">
                      <q-checkbox
                        :model-value="selectedOptionGroupIds.includes(group.id)"
                        @update:model-value="toggleOptionGroup(group.id)"
                        color="primary"
                        dense
                        class="q-mr-sm"
                        @click.stop
                      />
                      <div class="col ellipsis">
                        <div class="row items-center q-gutter-xs flex-wrap">
                          <span class="text-weight-bold text-body2 group-name-title">{{
                            group.name
                          }}</span>
                          <span
                            class="opt-badge"
                            :class="
                              group.selection_type === 'single'
                                ? 'opt-badge--single'
                                : 'opt-badge--multi'
                            "
                          >
                            {{
                              group.selection_type === 'single'
                                ? 'เลือก 1 อย่าง'
                                : 'เลือกได้หลายอย่าง'
                            }}
                          </span>
                          <span v-if="group.is_required" class="opt-badge opt-badge--required">
                            จำเป็นต้องเลือก
                          </span>
                        </div>
                        <div
                          v-if="group.options.length > 0"
                          class="text-caption text-grey-7 ellipsis q-mt-xs"
                        >
                          <span class="text-grey-5">ตัวเลือก: </span>
                          <span>{{ group.options.map((o) => o.name).join(', ') }}</span>
                        </div>
                        <div v-else class="text-caption text-grey-5 q-mt-xs">
                          (ยังไม่มีตัวเลือกย่อยในกลุ่มนี้)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="row items-center justify-between">
              <q-toggle
                v-model="itemForm.is_available"
                label="พร้อมขาย (มีวัตถุดิบ)"
                color="primary"
              />
              <q-toggle v-model="itemForm.is_active" label="เปิดแสดงในเมนู" color="primary" />
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-px-md q-pb-md">
            <q-btn flat label="ยกเลิก" no-caps v-close-popup />
            <q-btn
              unelevated
              color="primary"
              :label="isUploading ? 'กำลังอัปโหลดรูป...' : 'บันทึกเมนู'"
              no-caps
              rounded
              @click="saveItem"
              :loading="isSaving || isUploading"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useMenuStore } from 'src/stores/menuStore';
import { useNotify } from 'src/composables/useNotify';
import { supabase } from 'src/services/supabase';
import { uploadMenuImage, createLocalPreviewUrl } from 'src/services/storageService';
import { formatPrice } from 'src/utils/formatters';
import { inferFryConfigFromName } from 'src/utils/fryHelper';
import {
  STANDARD_INGREDIENTS,
  inferMainIngredient,
  getIngredientIcon,
} from 'src/utils/ingredientHelper';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import type { MenuCategory, MenuItem, OptionGroup, Option, FryConfig } from 'src/types/database';

export interface OptionGroupWithSubOptions extends OptionGroup {
  options: Option[];
}

const menuStore = useMenuStore();
const { notifySuccess, notifyError } = useNotify();

const activeTab = ref('items');
const filterCategory = ref<string | null>(null);
const searchQuery = ref('');
const showCatDialog = ref(false);
const showItemDialog = ref(false);
const isSaving = ref(false);
const isUploading = ref(false);
const editingCategory = ref<MenuCategory | null>(null);
const editingItem = ref<MenuItem | null>(null);

// Ingredients Stock Management State
const searchIngredientQuery = ref('');
const filterIngredientStatus = ref<'all' | 'soldout' | 'available'>('all');
const isIngredientUpdating = ref<string | null>(null);
const expandedIngredients = reactive<Record<string, boolean>>({});

const ingredientSelectOptions = STANDARD_INGREDIENTS.map((i) => i.name);

// Option Groups State
const allOptionGroups = ref<OptionGroupWithSubOptions[]>([]);
const itemOptionGroupMap = ref<Record<string, string[]>>({});
const selectedOptionGroupIds = ref<string[]>([]);
const isLoadingOptionGroups = ref(false);

// Fry Config Form State
const itemFryConfig = reactive<FryConfig>({
  is_fried: false,
  fry_name: '',
  fry_qty: 1,
  special_fry_name: '',
  special_fry_qty: 1,
  unit: 'ออเดอร์',
});

// File input refs for image upload
const fileInputRef = ref<HTMLInputElement | null>(null);
const pendingImageFile = ref<File | null>(null);
const previewImageUrl = ref<string>('');

let restaurantId = '';

const catForm = reactive({
  name: '',
  is_active: true,
});

const itemForm = reactive({
  name: '',
  description: '',
  base_price: 0,
  image_url: '',
  category_id: '',
  main_ingredient: '',
  is_active: true,
  is_available: true,
});

function getItemMainIngredient(item: MenuItem): string {
  return inferMainIngredient(item.name, item.main_ingredient);
}

function isItemFried(item: MenuItem): boolean {
  if (item.fry_config && typeof item.fry_config.is_fried === 'boolean') {
    return item.fry_config.is_fried;
  }
  const inferred = inferFryConfigFromName(item.name);
  return Boolean(inferred?.is_fried);
}

function getFryLabel(item: MenuItem): string {
  if (item.fry_config?.fry_name) {
    return item.fry_config.fry_name;
  }
  const inferred = inferFryConfigFromName(item.name);
  return inferred?.fry_name || item.name;
}

function applyFryPreset(name: string, unit = 'ออเดอร์', specialName?: string) {
  itemFryConfig.is_fried = true;
  itemFryConfig.fry_name = name;
  itemFryConfig.unit = unit;
  itemFryConfig.fry_qty = 1;
  itemFryConfig.special_fry_name = specialName || `${name}พิเศษ`;
  itemFryConfig.special_fry_qty = 1;
}

const categoryOptions = computed(() =>
  menuStore.categories.map((c) => ({ label: c.name, value: c.id })),
);

// Pre-computed category item counts for O(1) badge lookups
const categoryItemCountMap = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {};
  for (const item of menuStore.items) {
    map[item.category_id] = (map[item.category_id] || 0) + 1;
  }
  return map;
});

function getItemCountByCategory(catId: string | null): number {
  if (!catId) return menuStore.items.length;
  return categoryItemCountMap.value[catId] || 0;
}

// Pre-computed item option group names lookup map for O(1) card rendering
const itemOptionGroupNamesMap = computed<Record<string, string[]>>(() => {
  const groupNameById = new Map<string, string>();
  for (const g of allOptionGroups.value) {
    groupNameById.set(g.id, g.name);
  }
  const result: Record<string, string[]> = {};
  for (const [itemId, groupIds] of Object.entries(itemOptionGroupMap.value)) {
    result[itemId] = groupIds
      .map((gid) => groupNameById.get(gid))
      .filter((name): name is string => Boolean(name));
  }
  return result;
});

function toggleOptionGroup(groupId: string) {
  const idx = selectedOptionGroupIds.value.indexOf(groupId);
  if (idx > -1) {
    selectedOptionGroupIds.value.splice(idx, 1);
  } else {
    selectedOptionGroupIds.value.push(groupId);
  }
}

async function loadOptionGroups() {
  isLoadingOptionGroups.value = true;
  try {
    const { data: groups, error: gErr } = await supabase
      .from('option_groups')
      .select('*, options(*)')
      .order('sort_order');

    if (gErr || !groups) {
      allOptionGroups.value = [];
      return;
    }

    allOptionGroups.value = groups.map((g: OptionGroup & { options?: Option[] }) => ({
      ...g,
      options: (g.options ?? []).sort((a, b) => a.sort_order - b.sort_order),
    }));
  } catch (err) {
    console.error('Failed to load option groups:', err);
  } finally {
    isLoadingOptionGroups.value = false;
  }
}

async function loadItemOptionGroups() {
  try {
    const { data, error: err } = await supabase
      .from('menu_item_option_groups')
      .select('menu_item_id, option_group_id, sort_order')
      .order('sort_order');

    if (err || !data) return;

    const map: Record<string, string[]> = {};
    data.forEach((row) => {
      if (row.menu_item_id && row.option_group_id) {
        if (!map[row.menu_item_id]) {
          map[row.menu_item_id] = [];
        }
        map[row.menu_item_id]!.push(row.option_group_id);
      }
    });
    itemOptionGroupMap.value = map;
  } catch (err) {
    console.error('Failed to load menu item option group mappings:', err);
  }
}

function clearFilters() {
  filterCategory.value = null;
  searchQuery.value = '';
}

const filteredItems = computed(() => {
  let list = menuStore.items;

  if (filterCategory.value) {
    list = list.filter((i) => i.category_id === filterCategory.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q)),
    );
  }

  return list;
});

// ─── Ingredients Tab Computations & Actions ─────────────────────────

const ingredientGroups = computed(() => {
  const groupsMap: Record<string, MenuItem[]> = {};

  for (const item of menuStore.items) {
    const ing = getItemMainIngredient(item);
    if (!groupsMap[ing]) {
      groupsMap[ing] = [];
    }
    groupsMap[ing].push(item);
  }

  const list = Object.entries(groupsMap).map(([name, items]) => {
    const totalCount = items.length;
    const availableCount = items.filter((i) => i.is_available).length;
    const soldOutCount = totalCount - availableCount;
    return {
      name,
      icon: getIngredientIcon(name),
      items: items.sort((a, b) => a.name.localeCompare(b.name, 'th')),
      totalCount,
      availableCount,
      soldOutCount,
      isAllSoldOut: availableCount === 0,
      isAllAvailable: availableCount === totalCount,
    };
  });

  return list.sort((a, b) => {
    if (a.soldOutCount > 0 && b.soldOutCount === 0) return -1;
    if (a.soldOutCount === 0 && b.soldOutCount > 0) return 1;
    return b.totalCount - a.totalCount;
  });
});

const ingredientStats = computed(() => {
  const total = ingredientGroups.value.length;
  const soldOut = ingredientGroups.value.filter((g) => g.soldOutCount > 0).length;
  const available = total - soldOut;
  return { total, soldOut, available };
});

const filteredIngredientGroups = computed(() => {
  let list = ingredientGroups.value;

  if (filterIngredientStatus.value === 'soldout') {
    list = list.filter((g) => g.soldOutCount > 0);
  } else if (filterIngredientStatus.value === 'available') {
    list = list.filter((g) => g.isAllAvailable);
  }

  if (searchIngredientQuery.value.trim()) {
    const q = searchIngredientQuery.value.trim().toLowerCase();
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
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }

  return list;
});

function clearIngredientFilters() {
  filterIngredientStatus.value = 'all';
  searchIngredientQuery.value = '';
}

async function toggleIngredientStock(
  grp: { name: string; items: MenuItem[] },
  targetAvailable: boolean,
) {
  isIngredientUpdating.value = grp.name;
  const itemIds = grp.items.map((i) => i.id);

  // Optimistic UI update in menuStore
  menuStore.updateMultipleItemsLocally(itemIds, { is_available: targetAvailable });
  notifySuccess(
    `ปรับวัตถุดิบ "${grp.name}" (${itemIds.length} เมนู) เป็น ${
      targetAvailable ? 'เปิดขาย' : 'หมดชั่วคราว'
    } แล้ว`,
  );

  try {
    const { error } = await supabase
      .from('menu_items')
      .update({
        is_available: targetAvailable,
        updated_at: new Date().toISOString(),
      })
      .in('id', itemIds);

    if (error) throw error;
  } catch (err) {
    await menuStore.loadMenu(true);
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถปรับสถานะวัตถุดิบได้');
  } finally {
    isIngredientUpdating.value = null;
  }
}

async function loadRestaurantId() {
  if (restaurantId) return;
  const { data } = await supabase.from('restaurants').select('id').limit(1).single();
  if (data) restaurantId = data.id;
}

onMounted(async () => {
  await Promise.all([
    loadRestaurantId(),
    menuStore.loadMenu(true),
    loadOptionGroups(),
    loadItemOptionGroups(),
  ]);
});

// Image Upload Helpers
function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  if (!file) return;

  // Validate size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    notifyError('ขนาดไฟล์เกิน 5MB กรุณาเลือกรูปภาพที่มีขนาดเล็กลง');
    return;
  }

  pendingImageFile.value = file;
  previewImageUrl.value = createLocalPreviewUrl(file);
}

function removeImage() {
  pendingImageFile.value = null;
  previewImageUrl.value = '';
  itemForm.image_url = '';
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

function handleUrlInput(val: string | number | null) {
  const str = String(val || '');
  if (!pendingImageFile.value) {
    previewImageUrl.value = str;
  }
}

function openAddCategoryDialog() {
  editingCategory.value = null;
  catForm.name = '';
  catForm.is_active = true;
  showCatDialog.value = true;
}

function editCategory(cat: MenuCategory) {
  editingCategory.value = cat;
  catForm.name = cat.name;
  catForm.is_active = cat.is_active;
  showCatDialog.value = true;
}

async function saveCategory() {
  if (!catForm.name.trim()) return;
  isSaving.value = true;
  try {
    if (editingCategory.value) {
      await supabase
        .from('menu_categories')
        .update({
          name: catForm.name.trim(),
          is_active: catForm.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCategory.value.id);
    } else {
      const maxOrder = Math.max(0, ...menuStore.categories.map((c) => c.sort_order)) + 1;
      await supabase.from('menu_categories').insert({
        restaurant_id: restaurantId,
        name: catForm.name.trim(),
        sort_order: maxOrder,
        is_active: catForm.is_active,
      });
    }
    showCatDialog.value = false;
    await menuStore.loadMenu(true);
    notifySuccess('บันทึกหมวดหมู่เรียบร้อยแล้ว');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกหมวดหมู่ได้');
  } finally {
    isSaving.value = false;
  }
}

function openAddItemDialog() {
  editingItem.value = null;
  resetItemForm();
  const diningGroup = allOptionGroups.value.find(
    (g) => g.name === 'รูปแบบการทาน' || g.name === 'ทานที่ร้าน / กลับบ้าน',
  );
  selectedOptionGroupIds.value = diningGroup ? [diningGroup.id] : [];
  if (menuStore.categories.length > 0) {
    itemForm.category_id = menuStore.categories[0]?.id ?? '';
  }
  showItemDialog.value = true;
}

function editItem(item: MenuItem) {
  editingItem.value = item;
  itemForm.name = item.name;
  itemForm.description = item.description ?? '';
  itemForm.base_price = item.base_price;
  itemForm.image_url = item.image_url ?? '';
  itemForm.category_id = item.category_id;
  itemForm.main_ingredient = item.main_ingredient ?? inferMainIngredient(item.name);
  itemForm.is_active = item.is_active;
  itemForm.is_available = item.is_available;

  // Populate Fry Configuration
  if (item.fry_config && typeof item.fry_config.is_fried === 'boolean') {
    itemFryConfig.is_fried = item.fry_config.is_fried;
    itemFryConfig.fry_name = item.fry_config.fry_name || item.name;
    itemFryConfig.fry_qty = item.fry_config.fry_qty || 1;
    itemFryConfig.special_fry_name = item.fry_config.special_fry_name || '';
    itemFryConfig.special_fry_qty = item.fry_config.special_fry_qty || 1;
    itemFryConfig.unit = item.fry_config.unit || 'ออเดอร์';
  } else {
    const inferred = inferFryConfigFromName(item.name);
    if (inferred) {
      itemFryConfig.is_fried = inferred.is_fried;
      itemFryConfig.fry_name = inferred.fry_name || item.name;
      itemFryConfig.fry_qty = inferred.fry_qty || 1;
      itemFryConfig.special_fry_name = inferred.special_fry_name || '';
      itemFryConfig.special_fry_qty = inferred.special_fry_qty || 1;
      itemFryConfig.unit = inferred.unit || 'ออเดอร์';
    } else {
      itemFryConfig.is_fried = false;
      itemFryConfig.fry_name = item.name;
      itemFryConfig.fry_qty = 1;
      itemFryConfig.special_fry_name = '';
      itemFryConfig.special_fry_qty = 1;
      itemFryConfig.unit = 'ออเดอร์';
    }
  }

  pendingImageFile.value = null;
  previewImageUrl.value = item.image_url ?? '';

  selectedOptionGroupIds.value = [...(itemOptionGroupMap.value[item.id] || [])];

  showItemDialog.value = true;
}

async function saveItem() {
  if (!itemForm.name.trim()) return;
  isSaving.value = true;

  try {
    // If a new image file was picked, upload it to Supabase Storage first
    if (pendingImageFile.value) {
      isUploading.value = true;
      try {
        const uploadedUrl = await uploadMenuImage(pendingImageFile.value);
        itemForm.image_url = uploadedUrl;
      } catch (uploadErr) {
        console.error('Image upload failed, continuing with other data:', uploadErr);
        notifyError('อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        isSaving.value = false;
        isUploading.value = false;
        return;
      } finally {
        isUploading.value = false;
      }
    }

    const fryConfigPayload: FryConfig = {
      is_fried: Boolean(itemFryConfig.is_fried),
      fry_name: itemFryConfig.fry_name?.trim() || itemForm.name.trim(),
      fry_qty: itemFryConfig.fry_qty || 1,
      special_fry_name:
        itemFryConfig.special_fry_name?.trim() ||
        `${itemFryConfig.fry_name || itemForm.name.trim()}พิเศษ`,
      special_fry_qty: itemFryConfig.special_fry_qty || 1,
      unit: itemFryConfig.unit || 'ออเดอร์',
    };

    const detectedIngredient =
      itemForm.main_ingredient?.trim() || inferMainIngredient(itemForm.name);

    const payload: Record<string, unknown> = {
      name: itemForm.name.trim(),
      description: itemForm.description || null,
      base_price: itemForm.base_price,
      image_url: itemForm.image_url || null,
      category_id: itemForm.category_id,
      main_ingredient: detectedIngredient,
      is_active: itemForm.is_active,
      is_available: itemForm.is_available,
      fry_config: itemFryConfig.is_fried ? fryConfigPayload : { is_fried: false },
      updated_at: new Date().toISOString(),
    };

    let targetItemId = editingItem.value?.id;

    if (editingItem.value) {
      await supabase.from('menu_items').update(payload).eq('id', editingItem.value.id);
    } else {
      const maxOrder = Math.max(0, ...menuStore.items.map((i) => i.sort_order)) + 1;
      const { data: insertedItem, error: insertErr } = await supabase
        .from('menu_items')
        .insert({ ...payload, sort_order: maxOrder })
        .select('id')
        .single();
      if (insertErr || !insertedItem) {
        throw insertErr || new Error('ไม่สามารถเพิ่มรายการอาหารได้');
      }
      targetItemId = insertedItem.id;
    }

    // Sync menu_item_option_groups
    if (targetItemId) {
      await supabase.from('menu_item_option_groups').delete().eq('menu_item_id', targetItemId);

      if (selectedOptionGroupIds.value.length > 0) {
        const rowsToInsert = selectedOptionGroupIds.value.map((groupId, index) => ({
          menu_item_id: targetItemId,
          option_group_id: groupId,
          sort_order: index + 1,
        }));
        const { error: linkErr } = await supabase
          .from('menu_item_option_groups')
          .insert(rowsToInsert);
        if (linkErr) {
          console.error('Failed to link option groups to menu item:', linkErr);
        }
      }
    }

    showItemDialog.value = false;
    await Promise.all([menuStore.loadMenu(true), loadItemOptionGroups()]);
    notifySuccess('บันทึกรายการอาหารเรียบร้อยแล้ว');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกรายการอาหารได้');
  } finally {
    isSaving.value = false;
    isUploading.value = false;
  }
}

function resetItemForm() {
  itemForm.name = '';
  itemForm.description = '';
  itemForm.base_price = 0;
  itemForm.image_url = '';
  itemForm.category_id = '';
  itemForm.main_ingredient = '';
  itemForm.is_active = true;
  itemForm.is_available = true;
  itemFryConfig.is_fried = false;
  itemFryConfig.fry_name = '';
  itemFryConfig.fry_qty = 1;
  itemFryConfig.special_fry_name = '';
  itemFryConfig.special_fry_qty = 1;
  itemFryConfig.unit = 'ออเดอร์';
  pendingImageFile.value = null;
  previewImageUrl.value = '';
  selectedOptionGroupIds.value = [];
}

async function toggleAvailability(item: MenuItem) {
  const previousState = item.is_available;
  const newState = !previousState;

  // Optimistic UI update
  menuStore.updateItemLocally(item.id, { is_available: newState });
  notifySuccess(`ปรับสถานะ "${item.name}" เป็น ${newState ? 'พร้อมขาย' : 'หมดชั่วคราว'} แล้ว`);

  try {
    const { error } = await supabase
      .from('menu_items')
      .update({
        is_available: newState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) throw error;
  } catch (err) {
    menuStore.updateItemLocally(item.id, { is_available: previousState });
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถปรับสถานะได้');
  }
}
</script>

<style scoped>
.menu-mgmt-page {
  background: var(--color-background);
}

.menu-mgmt-container {
  max-width: 1200px;
  margin: 0 auto;
}

.custom-tabs {
  background: #ffffff;
  border-radius: var(--radius-pill);
  padding: 4px;
  border: 1px solid var(--color-border);
}

.add-btn {
  padding: 8px 20px;
  font-weight: 600;
}

/* Filter Card */
.filter-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-subtle);
}

.category-pills-scroll {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.category-pills-scroll::-webkit-scrollbar {
  display: none;
}

.cat-filter-pill {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border);
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  font-family: var(--app-font-family);
  font-size: 0.88rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.cat-filter-pill:hover {
  border-color: var(--color-primary-tint);
  background: #ffffff;
  color: var(--color-primary);
}

.cat-filter-pill--active {
  background: var(--color-primary) !important;
  color: #ffffff !important;
  border-color: var(--color-primary) !important;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(224, 88, 54, 0.25);
}

.cat-count-badge {
  background: rgba(45, 35, 30, 0.08);
  color: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: var(--radius-pill);
  margin-left: 6px;
}

.cat-filter-pill--active .cat-count-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.search-input-box {
  background: var(--color-surface-subtle);
  border-radius: var(--radius-pill);
}

.search-input-box :deep(.q-field__control) {
  border-radius: var(--radius-pill);
}

.clear-filter-link {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.clear-filter-link:hover {
  color: var(--color-primary-hover);
}

/* Items Grid */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.item-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.item-thumb {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-title {
  font-size: 1rem;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.item-price {
  font-size: 0.94rem;
  font-weight: 600;
  color: var(--color-primary);
}

.quick-toggle-btn {
  font-size: 0.76rem;
  font-weight: 600;
  padding: 3px 8px;
}

.empty-search-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

/* Category Item Card */
.category-item-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  padding: 14px 18px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-subtle);
}

/* Fry Settings Box */
.fry-settings-box {
  background: #fff7ed;
  border: 1.5px solid #fed7aa;
  border-radius: var(--radius-md);
}

.fry-icon-circle {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-pill);
  background: #ffedd5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fry-indicator-badge {
  font-size: 0.72rem;
  font-weight: 600;
}

.fry-details-content {
  border-top: 1px dashed #fdba74;
}

.field-label {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

/* Image Uploader Box */
.image-uploader-box {
  width: 100%;
}

.hidden-file-input {
  display: none;
}

.upload-dropzone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-subtle);
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-dropzone:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.upload-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-pill);
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.image-preview-wrapper {
  position: relative;
  width: 100%;
  height: 180px;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay-actions {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  padding: 6px 10px;
  border-radius: var(--radius-pill);
}

/* Option Group Selector in Dialog */
.option-groups-section {
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px;
}

.manage-options-link {
  font-size: 0.78rem;
  font-weight: 600;
}

.no-options-hint {
  background: #ffffff;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--color-border);
}

.option-group-card-choice {
  background: #ffffff;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.option-group-card-choice:hover {
  border-color: var(--color-primary-tint);
  background: #fdfdfd;
}

.option-group-card-choice--selected {
  border-color: var(--color-primary) !important;
  background: var(--color-primary-soft) !important;
}

.group-name-title {
  color: var(--color-text-primary);
}

.opt-badge {
  font-size: 0.72rem;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  font-weight: 600;
}

.opt-badge--single {
  background: #eef2ff;
  color: #4f46e5;
}

.opt-badge--multi {
  background: #f0fdf4;
  color: #16a34a;
}

.opt-badge--required {
  background: #fef2f2;
  color: #dc2626;
}

/* Item Card Option Tags */
.item-opt-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.item-opt-tag {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 1px 6px;
}

/* ─── Ingredients Tab Specific Styles ───────────────────────── */
.ing-stat-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-subtle);
}

.ing-stat-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-pill);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ingredient-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  overflow: hidden;
  box-shadow: var(--shadow-subtle);
  transition: all 0.2s ease;
}

.ingredient-card:hover {
  box-shadow: var(--shadow-card);
}

.ingredient-card--soldout {
  border-color: #fecaca;
  background: #fffafa;
}

.ingredient-card--partial {
  border-color: #fed7aa;
}

.ingredient-card-header {
  background: #ffffff;
}

.ingredient-card--soldout .ingredient-card-header {
  background: #fff5f5;
}

.ingredient-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ingredient-name-text {
  font-size: 1.05rem;
  color: var(--color-text-primary);
}

.ingredient-status-pill {
  font-size: 0.76rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
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

.master-stock-toggle-btn {
  font-weight: 600;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
}

.ingredient-dishes-panel {
  background: var(--color-surface-subtle);
  border-top: 1px solid var(--color-border);
}

.dishes-subgrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.subdish-card {
  background: #ffffff;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  padding: 10px 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.15s ease;
}

.subdish-card:hover {
  border-color: var(--color-border-hover, #cbd5e1);
}

.subdish-card--soldout {
  opacity: 0.75;
  background: #fdf2f2;
  border-color: #fecaca;
}

.subdish-thumb {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
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

.subdish-name {
  color: var(--color-text-primary);
  line-height: 1.2;
}
</style>
