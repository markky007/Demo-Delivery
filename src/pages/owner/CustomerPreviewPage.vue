<template>
  <q-page class="customer-preview-page q-pa-md">
    <!-- Top Control Bar -->
    <div class="preview-control-bar q-mb-md">
      <div class="row items-center justify-between q-col-gutter-sm">
        <!-- Title & Sandbox Notice -->
        <div class="col-12 col-md-auto row items-center">
          <div class="preview-title-wrap row items-center">
            <q-icon name="smartphone" size="28px" color="primary" class="q-mr-sm" />
            <div>
              <div class="row items-center">
                <span class="text-weight-bold text-subtitle1 q-mr-sm"
                  >จำลองหน้าจอลูกค้า (Customer Preview)</span
                >
                <span class="sandbox-badge">
                  <q-icon name="shield" size="14px" class="q-mr-xs" />
                  โหมดปลอดภัย (Sandbox)
                </span>
              </div>
              <div class="text-caption text-grey-7">
                ตรวจสอบการแสดงผลเมนู ราคา และตัวเลือกเสริม โดยไม่กระทบกับออเดอร์หรือบิลจริง
              </div>
            </div>
          </div>
        </div>

        <!-- Controls: Table Switcher, Device Switcher, Quick Actions -->
        <div class="col-12 col-md-auto row items-center q-gutter-x-sm q-gutter-y-xs">
          <!-- Table Selector -->
          <div class="control-item">
            <q-select
              v-model="selectedTable"
              :options="tableOptions"
              option-label="name"
              dense
              outlined
              emit-value
              map-options
              bg-color="white"
              class="table-select"
              options-dense
            >
              <template #prepend>
                <q-icon
                  :name="isTakeawaySelected ? 'shopping_bag' : 'table_restaurant'"
                  :color="isTakeawaySelected ? 'orange-9' : 'primary'"
                  size="18px"
                />
              </template>
              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section avatar class="min-avatar">
                    <q-icon
                      :name="isTakeawayName(scope.opt.name) ? 'shopping_bag' : 'table_restaurant'"
                      :color="isTakeawayName(scope.opt.name) ? 'orange-9' : 'primary'"
                      size="18px"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ scope.opt.name }}</q-item-label>
                    <q-item-label caption v-if="isTakeawayName(scope.opt.name)">
                      โหมดสั่งกลับบ้าน
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <!-- Device Viewport Switcher -->
          <q-btn-toggle
            v-model="viewportMode"
            no-caps
            unelevated
            dense
            toggle-color="primary"
            color="grey-3"
            text-color="grey-8"
            class="viewport-toggle"
            :options="[
              { label: 'มือถือ (390px)', value: 'mobile', icon: 'smartphone' },
              { label: 'แท็บเล็ต (600px)', value: 'tablet', icon: 'tablet_mac' },
              { label: 'เต็มจอ', value: 'full', icon: 'fullscreen' },
            ]"
          />

          <!-- Action Buttons -->
          <q-btn
            flat
            round
            dense
            color="primary"
            icon="refresh"
            @click="reloadMenuData"
            :loading="isReloading"
          >
            <q-tooltip>รีเฟรชข้อมูลเมนูจากฐานข้อมูล</q-tooltip>
          </q-btn>

          <q-btn flat round dense color="grey-7" icon="restart_alt" @click="resetPreview">
            <q-tooltip>รีเซ็ตหน้าจอจำลอง</q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>

    <!-- Safety Notice Banner -->
    <div class="safety-banner q-mb-md row items-center justify-between">
      <div class="row items-center">
        <q-icon name="verified_user" color="positive" size="20px" class="q-mr-sm" />
        <span class="text-caption text-grey-9">
          <strong>ปลอดภัย 100%:</strong> การกดเลือกเมนู ปรับแต่งท็อปปิ้ง
          และทดลองกดยืนยันสั่งอาหารในหน้านี้ ทำงานแบบจำลองในระบบ (In-Memory)
          ไม่มีการบันทึกลงฐานข้อมูลออเดอร์หรือบิลจริง
        </span>
      </div>
      <div class="row items-center q-gutter-x-md gt-xs">
        <span class="text-caption text-grey-7">
          หมวดหมู่: <strong>{{ menuStore.activeCategories.length }}</strong>
        </span>
        <span class="text-caption text-grey-7">
          เมนูอาหาร: <strong>{{ menuStore.activeItems.length }}</strong>
        </span>
      </div>
    </div>

    <!-- Main Workspace: Device Mockup Stage -->
    <div class="preview-stage-container" :class="`stage--${viewportMode}`">
      <!-- Device Frame Wrap -->
      <div class="device-frame" :class="`device-frame--${viewportMode}`">
        <!-- Phone Speaker & Camera Notch (for mobile mockup) -->
        <div v-if="viewportMode === 'mobile'" class="device-notch">
          <div class="notch-speaker"></div>
          <div class="notch-camera"></div>
        </div>

        <!-- Phone / Tablet Screen Container -->
        <div class="device-screen">
          <!-- Sandbox Ribbon Badge in Screen -->
          <div class="screen-sandbox-ribbon">
            <span>PREVIEW MODE</span>
          </div>

          <!-- Customer Screen Top Header -->
          <div class="mock-customer-header" :class="{ 'header--scrolled': isScrolled }">
            <div class="mock-header-toolbar row items-center justify-between">
              <!-- Left Action: Back or Logo -->
              <button
                v-if="currentScreen !== 'menu' && currentScreen !== 'welcome'"
                class="mock-header-btn"
                @click="goBackScreen"
                title="ย้อนกลับ"
              >
                <q-icon name="arrow_back" size="18px" color="dark" />
              </button>
              <div v-else class="mock-logo-wrap">
                <img :src="logoMarkSvg" alt="DEMO" class="mock-logo-img" />
              </div>

              <!-- Center Title & Table Badge -->
              <div class="mock-header-title text-center">
                <div class="mock-page-title">{{ getScreenTitle() }}</div>
                <div
                  v-if="currentScreen !== 'welcome'"
                  class="mock-table-pill"
                  :class="{ 'mock-table-pill--takeaway': isTakeawaySelected }"
                >
                  <q-icon
                    :name="isTakeawaySelected ? 'shopping_bag' : 'table_restaurant'"
                    size="13px"
                    class="q-mr-xs"
                  />
                  <span>{{
                    isTakeawaySelected
                      ? `สั่งกลับบ้าน • ${previewCustomerName || 'ลูกค้าทดลอง'}`
                      : selectedTable?.name
                  }}</span>
                </div>
              </div>

              <!-- Right Action: Orders / Cart Icon -->
              <button
                v-if="currentScreen !== 'welcome'"
                class="mock-header-btn"
                @click="goToOrdersScreen"
                title="ดูประวัติออเดอร์จำลอง"
              >
                <q-icon name="receipt_long" size="18px" color="dark" />
              </button>
              <div v-else style="width: 32px"></div>
            </div>
          </div>

          <!-- Screen Body Router / Views -->
          <div class="mock-screen-content" @scroll="onScreenScroll">
            <!-- ════════════════════ SCREEN 1: WELCOME SCREEN ════════════════════ -->
            <div
              v-if="currentScreen === 'welcome'"
              class="mock-welcome-view column items-center justify-center q-pa-lg"
            >
              <div class="welcome-mock-card column items-center text-center q-pa-lg">
                <div class="welcome-logo-box q-mb-md">
                  <img :src="logoSvg" alt="DEMO Bang saen" class="welcome-logo-asset" />
                </div>
                <h6 class="q-my-none text-weight-bold">
                  {{ restaurantInfo?.name || 'DEMO Bang saen' }}
                </h6>
                <div
                  class="mock-table-pill q-my-md"
                  :class="{ 'mock-table-pill--takeaway': isTakeawaySelected }"
                  style="font-size: 0.95rem; padding: 6px 16px"
                >
                  <q-icon
                    :name="isTakeawaySelected ? 'shopping_bag' : 'table_restaurant'"
                    size="18px"
                    class="q-mr-xs"
                  />
                  <span>{{
                    isTakeawaySelected ? 'สั่งกลับบ้าน (Takeaway)' : selectedTable?.name
                  }}</span>
                </div>

                <p class="text-caption text-grey-7 q-mb-md">
                  {{
                    isTakeawaySelected
                      ? 'ระบุชื่อของคุณเพื่อเปิดรายการสั่งกลับบ้านและรับอาหาร'
                      : 'พร้อมสั่งอาหารแล้วหรือยัง? เลือกเมนูอร่อยได้ทันที'
                  }}
                </p>

                <!-- Takeaway customer name input -->
                <div v-if="isTakeawaySelected" class="full-width q-mb-md text-left">
                  <label class="text-caption text-weight-bold text-grey-8 block q-mb-xs">
                    ชื่อลูกค้า / ผู้สั่งอาหาร <span class="text-negative">*</span>
                  </label>
                  <q-input
                    v-model="previewCustomerName"
                    outlined
                    dense
                    placeholder="เช่น คุณสมชาย, คุณแอน"
                    bg-color="white"
                  >
                    <template #prepend>
                      <q-icon name="person" size="18px" color="grey-6" />
                    </template>
                  </q-input>
                </div>

                <q-btn
                  color="primary"
                  unelevated
                  no-caps
                  class="full-width welcome-btn"
                  @click="currentScreen = 'menu'"
                >
                  <q-icon
                    :name="isTakeawaySelected ? 'shopping_bag' : 'restaurant_menu'"
                    size="18px"
                    class="q-mr-xs"
                  />
                  <span>{{
                    isTakeawaySelected ? 'เริ่มสั่งกลับบ้าน (ทดลอง)' : 'เริ่มสั่งอาหาร (ทดลอง)'
                  }}</span>
                </q-btn>
              </div>
            </div>

            <!-- ════════════════════ SCREEN 2: MENU PAGE ════════════════════ -->
            <div v-else-if="currentScreen === 'menu'" class="mock-menu-view">
              <!-- Loading Skeleton -->
              <div v-if="menuStore.isLoading" class="q-pa-md">
                <LoadingSkeleton type="menu" :count="4" />
              </div>

              <template v-else>
                <!-- Hero Section: Minigame -->
                <div class="q-px-sm q-pt-sm">
                  <RandomMenuGame v-if="!isSearching" />
                </div>

                <!-- Sticky Category Pills + Search -->
                <div class="category-tabs-sticky">
                  <div class="category-pills-row">
                    <button
                      v-for="cat in menuStore.activeCategories"
                      :key="cat.id"
                      class="mock-category-pill"
                      :class="{
                        'mock-category-pill--active': !isSearching && activeCategory === cat.id,
                      }"
                      @click="selectCategory(cat.id)"
                    >
                      {{ cat.name }}
                    </button>
                  </div>

                  <!-- Search Bar -->
                  <div class="search-wrap q-mt-xs">
                    <div class="search-box">
                      <q-icon name="search" size="16px" class="text-grey-6 q-mr-xs" />
                      <input
                        v-model="searchInput"
                        type="text"
                        placeholder="ค้นหาเมนูอาหาร..."
                        class="mock-search-input"
                        @input="onSearchInput"
                      />
                      <button v-if="searchInput" class="search-clear" @click="clearSearch">
                        <q-icon name="close" size="14px" />
                      </button>
                    </div>
                    <div v-if="isSearching" class="text-caption text-grey-7 q-mt-xs q-px-xs">
                      พบ <strong>{{ currentMenuItems.length }}</strong> รายการที่ตรงกับ "{{
                        searchQuery
                      }}"
                    </div>
                  </div>
                </div>

                <!-- Menu Items Grid -->
                <div class="menu-grid-section q-pa-sm">
                  <!-- Empty search -->
                  <EmptyState
                    v-if="isSearching && currentMenuItems.length === 0"
                    icon="search_off"
                    title="ไม่พบเมนูที่ค้นหา"
                    :description="`ไม่พบเมนูที่ตรงกับ '${searchQuery}'`"
                  />

                  <!-- Empty category -->
                  <EmptyState
                    v-else-if="!isSearching && currentMenuItems.length === 0"
                    icon="restaurant_menu"
                    title="ยังไม่มีเมนูในหมวดหมู่นี้"
                    description="กรุณาเลือกดูหมวดหมู่อื่นด้านบน"
                  />

                  <!-- Grid Cards -->
                  <div v-else class="mock-menu-grid">
                    <div
                      v-for="item in currentMenuItems"
                      :key="item.id"
                      class="mock-menu-card"
                      :class="{ 'mock-menu-card--soldout': !item.is_available }"
                      @click="openProductDetail(item)"
                    >
                      <!-- Image Wrap -->
                      <div class="mock-card-img-wrap">
                        <img
                          v-if="item.image_url"
                          :src="item.image_url"
                          :alt="item.name"
                          class="mock-card-img"
                          loading="lazy"
                        />
                        <div v-else class="mock-card-img-placeholder">
                          <q-icon name="restaurant" size="28px" color="grey-4" />
                        </div>
                        <!-- Sold Out Overlay -->
                        <div v-if="!item.is_available" class="soldout-badge-overlay">
                          <span>หมดชั่วคราว</span>
                        </div>
                      </div>

                      <!-- Content -->
                      <div class="mock-card-body">
                        <div class="mock-item-name">{{ item.name }}</div>
                        <div v-if="item.description" class="mock-item-desc">
                          {{ item.description }}
                        </div>
                        <div class="row items-center justify-between q-mt-auto q-pt-xs">
                          <div class="mock-item-price">{{ formatPrice(item.base_price) }}</div>
                          <div
                            class="mock-add-btn"
                            :class="{ 'mock-add-btn--disabled': !item.is_available }"
                          >
                            <q-icon :name="item.is_available ? 'add' : 'block'" size="14px" />
                            <span class="q-ml-xs">{{ item.is_available ? 'เลือก' : 'หมด' }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <!-- ════════════════════ SCREEN 3: PRODUCT DETAIL ════════════════════ -->
            <div
              v-else-if="currentScreen === 'product-detail' && activeDetailItem"
              class="mock-product-detail-view"
            >
              <!-- Product Image -->
              <div class="detail-hero-img-wrap">
                <img
                  v-if="activeDetailItem.image_url"
                  :src="activeDetailItem.image_url"
                  :alt="activeDetailItem.name"
                  class="detail-hero-img"
                />
                <div v-else class="detail-hero-img-placeholder">
                  <q-icon name="restaurant" size="48px" color="grey-4" />
                </div>
              </div>

              <!-- Product Info & Options Form -->
              <div class="detail-body q-pa-md">
                <div class="row items-start justify-between">
                  <div class="col">
                    <h6 class="q-my-none text-weight-bold detail-item-title">
                      {{ activeDetailItem.name }}
                    </h6>
                    <p
                      v-if="activeDetailItem.description"
                      class="text-caption text-grey-7 q-mt-xs q-mb-none"
                    >
                      {{ activeDetailItem.description }}
                    </p>
                  </div>
                  <div class="text-h6 text-weight-bold text-primary q-ml-md">
                    {{ formatPrice(activeDetailItem.base_price) }}
                  </div>
                </div>

                <!-- Sold out warning -->
                <div v-if="!activeDetailItem.is_available" class="detail-soldout-alert q-mt-sm">
                  <q-icon name="info" size="18px" class="q-mr-xs" />
                  <span>เมนูนี้หมดชั่วคราว ไม่สามารถสั่งได้ในขณะนี้</span>
                </div>

                <!-- Option Groups -->
                <div
                  v-for="group in activeDetailItem.option_groups"
                  :id="`preview-group-${group.id}`"
                  :key="group.id"
                  class="detail-option-group q-mt-md"
                  :class="{
                    'detail-option-group--error': detailMissingGroupIds.has(group.id),
                    'detail-option-group--takeaway-locked':
                      isTakeawaySelected && isDiningOptionGroup(group.name),
                  }"
                >
                  <div class="row items-center justify-between q-mb-xs">
                    <div class="text-weight-bold text-subtitle2 row items-center no-wrap">
                      <q-icon
                        v-if="isTakeawaySelected && isDiningOptionGroup(group.name)"
                        name="lock"
                        size="16px"
                        class="q-mr-xs text-orange-9"
                      />
                      <span>{{ group.name }}</span>
                    </div>
                    <span
                      v-if="isTakeawaySelected && isDiningOptionGroup(group.name)"
                      class="group-pill-tag group-pill-tag--takeaway-locked"
                    >
                      <q-icon name="lock" size="12px" class="q-mr-xs" />
                      สั่งกลับบ้าน (ล็อกอัตโนมัติ)
                    </span>
                    <span
                      v-else
                      class="group-pill-tag"
                      :class="group.is_required ? 'group-pill-tag--req' : 'group-pill-tag--opt'"
                    >
                      {{ group.is_required ? 'ต้องเลือก' : 'เลือกเพิ่มได้' }}
                    </span>
                  </div>

                  <div class="text-caption text-grey-6 q-mb-xs">
                    <template v-if="isTakeawaySelected && isDiningOptionGroup(group.name)">
                      <span class="text-orange-9 text-weight-medium">
                        สแกนจากจุดบริการสั่งกลับบ้าน ระบบล็อกตัวเลือกนี้เป็นสั่งกลับบ้านโดยอัตโนมัติ
                      </span>
                    </template>
                    <template v-else-if="group.selection_type === 'single'"
                      >เลือกได้ 1 รายการ</template
                    >
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
                  <div
                    v-if="detailMissingGroupIds.has(group.id)"
                    class="group-validation-error q-mb-sm"
                  >
                    <q-icon name="error_outline" size="16px" class="q-mr-xs" />
                    <span v-if="group.selection_type === 'single'"
                      >กรุณาเลือกตัวเลือกในกลุ่มนี้</span
                    >
                    <span v-else>กรุณาเลือกอย่างน้อย {{ group.min_selections || 1 }} รายการ</span>
                  </div>

                  <!-- Radio Options (Single) -->
                  <div v-if="group.selection_type === 'single'" class="q-gutter-y-xs">
                    <div
                      v-for="opt in group.options"
                      :key="opt.id"
                      class="mock-option-row row items-center justify-between"
                      :class="{
                        'mock-option-row--selected': detailSelectedOptions[group.id] === opt.id,
                        'mock-option-row--disabled':
                          !opt.is_available ||
                          (isTakeawaySelected &&
                            isDiningOptionGroup(group.name) &&
                            !isTakeawayOption(opt.name)),
                        'mock-option-row--locked':
                          isTakeawaySelected &&
                          isDiningOptionGroup(group.name) &&
                          isTakeawayOption(opt.name),
                      }"
                      @click="toggleSingleDetailOption(group, opt.id, opt.is_available)"
                    >
                      <div class="row items-center">
                        <q-radio
                          :model-value="detailSelectedOptions[group.id]"
                          :val="opt.id"
                          :disable="
                            !opt.is_available ||
                            (isTakeawaySelected && isDiningOptionGroup(group.name))
                          "
                          color="primary"
                          dense
                          class="q-mr-sm pointer-events-none"
                        />
                        <span
                          :class="{
                            'text-grey-6':
                              !opt.is_available ||
                              (isTakeawaySelected &&
                                isDiningOptionGroup(group.name) &&
                                !isTakeawayOption(opt.name)),
                          }"
                        >
                          {{ opt.name }}
                        </span>
                        <span v-if="!opt.is_available" class="opt-sold-badge q-ml-xs">หมด</span>
                        <span
                          v-else-if="
                            isTakeawaySelected &&
                            isDiningOptionGroup(group.name) &&
                            isTakeawayOption(opt.name)
                          "
                          class="opt-locked-chip q-ml-sm"
                        >
                          <q-icon name="lock" size="10px" class="q-mr-xs" />ล็อกตาม QR
                        </span>
                      </div>
                      <div class="text-caption text-weight-bold text-primary">
                        <span v-if="!opt.is_available" class="text-grey-5">หมด</span>
                        <span
                          v-else-if="
                            isTakeawaySelected &&
                            isDiningOptionGroup(group.name) &&
                            !isTakeawayOption(opt.name)
                          "
                          class="text-caption text-grey-5"
                        >
                          (สำหรับทานที่ร้าน)
                        </span>
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

                  <!-- Checkbox Options (Multi) -->
                  <div v-else class="q-gutter-y-xs">
                    <div
                      v-for="opt in group.options"
                      :key="opt.id"
                      class="mock-option-row row items-center justify-between"
                      :class="{
                        'mock-option-row--selected': detailMultiOptions[group.id]?.includes(opt.id),
                        'mock-option-row--disabled':
                          !opt.is_available ||
                          (group.max_selections !== null &&
                            (detailMultiOptions[group.id]?.length ?? 0) >= group.max_selections &&
                            !detailMultiOptions[group.id]?.includes(opt.id)),
                      }"
                      @click="
                        toggleMultiDetailOption(
                          group.id,
                          opt.id,
                          group.max_selections,
                          opt.is_available,
                        )
                      "
                    >
                      <div class="row items-center">
                        <q-checkbox
                          :model-value="detailMultiOptions[group.id]?.includes(opt.id)"
                          :disable="!opt.is_available"
                          color="primary"
                          dense
                          class="q-mr-sm pointer-events-none"
                        />
                        <span :class="{ 'text-grey-6': !opt.is_available }">{{ opt.name }}</span>
                        <span v-if="!opt.is_available" class="opt-sold-badge q-ml-xs">หมด</span>
                      </div>
                      <div class="text-caption text-weight-bold text-primary">
                        <span v-if="!opt.is_available" class="text-grey-5">หมด</span>
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
                </div>

                <!-- Special Instruction -->
                <div class="detail-option-group q-mt-md">
                  <div class="text-weight-bold text-subtitle2 q-mb-xs">
                    รายละเอียดเพิ่มเติม / หมายเหตุถึงร้าน
                  </div>
                  <q-input
                    v-model="detailSpecialInstruction"
                    outlined
                    dense
                    autogrow
                    placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย, แยกน้ำ..."
                    :maxlength="200"
                    counter
                  />
                </div>

                <!-- Quantity Stepper -->
                <div class="row items-center justify-between detail-option-group q-mt-md">
                  <div>
                    <div class="text-weight-bold">จำนวนจาน</div>
                    <div class="text-caption text-grey-6">เลือกจำนวนที่ต้องการสั่ง</div>
                  </div>
                  <QuantityStepper v-model="detailQuantity" :min="1" />
                </div>
              </div>

              <!-- Add to Cart Sticky Action -->
              <div class="detail-sticky-footer">
                <q-btn
                  color="primary"
                  unelevated
                  no-caps
                  class="full-width detail-add-btn"
                  :disable="!activeDetailItem.is_available"
                  @click="addDetailToPreviewCart"
                >
                  <div class="row items-center justify-between full-width q-px-sm">
                    <span class="text-weight-bold">
                      {{
                        !activeDetailItem.is_available
                          ? 'เมนูนี้หมดชั่วคราว'
                          : 'เพิ่มลงตะกร้า (ทดลอง)'
                      }}
                    </span>
                    <span class="text-weight-bold">{{ formatPrice(calculatedDetailTotal) }}</span>
                  </div>
                </q-btn>
              </div>
            </div>

            <!-- ════════════════════ SCREEN 4: CART PAGE ════════════════════ -->
            <div v-else-if="currentScreen === 'cart'" class="mock-cart-view q-pa-md">
              <EmptyState
                v-if="previewCartItems.length === 0"
                icon="shopping_basket"
                title="ยังไม่มีรายการอาหารในตะกร้า"
                description="เลือกเมนูอร่อยจากหน้ารายการอาหารแล้วกลับมาทดลองสั่งได้เลย"
                action-label="ดูเมนูอาหาร"
                @action="currentScreen = 'menu'"
              />

              <div v-else>
                <div class="row items-center justify-between q-mb-sm">
                  <div class="text-weight-bold text-subtitle1">
                    รายการที่เลือก ({{ previewCartItemCount }} รายการ)
                  </div>
                  <q-btn
                    flat
                    dense
                    no-caps
                    color="grey-7"
                    size="sm"
                    label="ล้างตะกร้า"
                    @click="clearPreviewCart"
                  />
                </div>

                <!-- Cart Items List -->
                <div class="q-gutter-y-sm">
                  <div
                    v-for="item in previewCartItems"
                    :key="item.cart_item_id"
                    class="mock-cart-card"
                  >
                    <div class="row no-wrap items-start">
                      <div class="mock-cart-thumb q-mr-sm">
                        <img v-if="item.image_url" :src="item.image_url" :alt="item.name" />
                        <q-icon v-else name="restaurant" size="20px" color="grey-4" />
                      </div>
                      <div class="col">
                        <div class="row items-start justify-between">
                          <div class="text-weight-bold text-body2">{{ item.name }}</div>
                          <q-btn
                            flat
                            round
                            dense
                            icon="close"
                            size="xs"
                            color="grey-6"
                            @click="removePreviewCartItem(item.cart_item_id)"
                          />
                        </div>

                        <!-- Selected options chips -->
                        <div
                          v-if="item.selected_options.length > 0"
                          class="row wrap q-gutter-xs q-mt-xs"
                        >
                          <span
                            v-for="opt in item.selected_options"
                            :key="opt.option_id"
                            class="mock-opt-chip"
                            :class="{ 'mock-opt-chip--takeaway': isTakeawayOption(opt.name) }"
                          >
                            {{ opt.name }}
                            <template v-if="opt.price_adjustment > 0"
                              >+{{ formatPrice(opt.price_adjustment) }}</template
                            >
                          </span>
                        </div>

                        <!-- Note -->
                        <div
                          v-if="item.special_instruction"
                          class="text-caption text-orange-9 q-mt-xs"
                        >
                          <q-icon name="edit_note" size="14px" /> {{ item.special_instruction }}
                        </div>

                        <!-- Price + Stepper -->
                        <div class="row items-center justify-between q-mt-sm">
                          <span class="text-weight-bold text-primary">{{
                            formatPrice(item.subtotal)
                          }}</span>
                          <QuantityStepper
                            :model-value="item.quantity"
                            :min="1"
                            dense
                            @update:model-value="
                              (val) => updatePreviewCartItemQty(item.cart_item_id, val)
                            "
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Summary Box -->
                <div class="mock-cart-summary q-mt-md">
                  <div class="row justify-between text-caption text-grey-7 q-mb-xs">
                    <span>จำนวนรายการทั้งหมด</span>
                    <span class="text-weight-medium">{{ previewCartItemCount }} รายการ</span>
                  </div>
                  <q-separator class="q-my-xs" />
                  <div class="row justify-between items-center text-subtitle1">
                    <span class="text-weight-bold">ยอดรวมสุทธิ</span>
                    <span class="text-weight-bold text-primary text-h6">{{
                      formatPrice(previewCartTotal)
                    }}</span>
                  </div>
                </div>

                <!-- Checkout Button -->
                <div class="mock-cart-action-wrap q-mt-md">
                  <q-btn
                    color="primary"
                    unelevated
                    no-caps
                    class="full-width detail-add-btn"
                    @click="submitMockOrder"
                    :loading="isSubmittingMock"
                  >
                    <div class="row items-center justify-between full-width q-px-sm">
                      <span class="text-weight-bold">ยืนยันการสั่งอาหาร (ทดลอง)</span>
                      <span class="text-weight-bold">{{ formatPrice(previewCartTotal) }}</span>
                    </div>
                  </q-btn>
                </div>
              </div>
            </div>

            <!-- ════════════════════ SCREEN 5: ORDER SUCCESS / STATUS ════════════════════ -->
            <div v-else-if="currentScreen === 'orders'" class="mock-orders-view q-pa-md">
              <!-- If we have a simulated recent order -->
              <div v-if="lastMockOrder" class="mock-order-success-card q-pa-md text-center">
                <div class="mock-success-icon-wrap q-mb-sm">
                  <q-icon name="check_circle" size="44px" color="positive" />
                </div>
                <h6 class="q-my-none text-weight-bold text-positive">จำลองสั่งอาหารสำเร็จ!</h6>
                <p class="text-caption text-grey-7 q-mb-md">
                  ระบบจำลองการส่งออเดอร์เรียบร้อย รายการอาหารและราคาถูกต้อง
                </p>

                <!-- Order Ticket Mockup -->
                <div class="mock-ticket-box text-left q-pa-md q-mb-md">
                  <div class="row items-center justify-between q-mb-xs">
                    <span class="text-weight-bold text-subtitle2">หมายเลขออเดอร์จำลอง</span>
                    <q-badge color="positive" text-color="white" label="รับออเดอร์แล้ว (จำลอง)" />
                  </div>
                  <div class="text-h6 text-weight-bolder text-primary q-mb-xs">
                    #PREVIEW-{{ lastMockOrder.orderNumber }}
                  </div>
                  <div class="text-caption text-grey-7 q-mb-sm">
                    โต๊ะ: <strong>{{ lastMockOrder.tableName }}</strong> • เวลา:
                    {{ lastMockOrder.time }}
                  </div>

                  <q-separator class="q-my-sm" />

                  <!-- Ordered Items -->
                  <div class="q-gutter-y-xs q-mb-sm">
                    <div
                      v-for="(item, idx) in lastMockOrder.items"
                      :key="idx"
                      class="row items-start justify-between text-body2"
                    >
                      <div class="col">
                        <div>
                          <strong>{{ item.quantity }}x</strong> {{ item.name }}
                        </div>
                        <div
                          v-if="item.selected_options.length > 0"
                          class="text-caption text-grey-6"
                        >
                          {{ item.selected_options.map((o) => o.name).join(', ') }}
                        </div>
                        <div v-if="item.special_instruction" class="text-caption text-orange-9">
                          Note: {{ item.special_instruction }}
                        </div>
                      </div>
                      <div class="text-weight-bold text-grey-9 q-ml-sm">
                        {{ formatPrice(item.subtotal) }}
                      </div>
                    </div>
                  </div>

                  <q-separator class="q-my-sm" />

                  <div class="row justify-between items-center text-subtitle2">
                    <span class="text-weight-bold">ยอดรวมจำลอง:</span>
                    <span class="text-weight-bold text-primary text-subtitle1">{{
                      formatPrice(lastMockOrder.totalAmount)
                    }}</span>
                  </div>
                </div>

                <!-- Explanatory Alert -->
                <div class="mock-safe-alert q-pa-sm q-mb-md text-left row no-wrap items-center">
                  <q-icon name="info" size="20px" color="primary" class="q-mr-sm flex-shrink-0" />
                  <span class="text-caption text-grey-8">
                    <strong>หมายเหตุ:</strong> ออเดอร์นี้เป็นเพียงการจำลองในหน้าต่างนี้เท่านั้น
                    จะ<strong>ไม่ถูกส่ง</strong>ไปยังหน้าจัดการออเดอร์ คิวครัว
                    หรือระบบบิลจริงของร้าน
                  </span>
                </div>

                <div class="row q-gutter-x-sm">
                  <q-btn
                    outline
                    no-caps
                    color="primary"
                    class="col"
                    label="ทดลองสั่งใหม่"
                    @click="resetToMenuScreen"
                  />
                  <q-btn
                    unelevated
                    no-caps
                    color="primary"
                    class="col"
                    label="กลับหน้าเมนู"
                    @click="currentScreen = 'menu'"
                  />
                </div>
              </div>

              <!-- No recent mock orders -->
              <EmptyState
                v-else
                icon="receipt_long"
                title="ยังไม่มีประวัติการสั่งจำลอง"
                description="คุณยังไม่ได้กดทดลองสั่งอาหารในรอบนี้ ลองเลือกเมนูและกดยืนยันในตะกร้าดูสิ"
                action-label="ไปเลือกเมนูอาหาร"
                @action="currentScreen = 'menu'"
              />
            </div>
          </div>

          <!-- Floating Sticky Cart Bar (visible only in menu screen when cart has items) -->
          <div
            v-if="currentScreen === 'menu' && previewCartItemCount > 0"
            class="mock-floating-cart-bar"
          >
            <button class="mock-floating-cart-btn" @click="currentScreen = 'cart'">
              <div class="row items-center justify-between full-width">
                <div class="row items-center">
                  <div class="mock-cart-badge q-mr-sm">{{ previewCartItemCount }}</div>
                  <span class="text-weight-bold">ดูตะกร้าอาหาร (ทดลอง)</span>
                </div>
                <div class="row items-center">
                  <span class="text-weight-bolder q-mr-xs">{{
                    formatPrice(previewCartTotal)
                  }}</span>
                  <q-icon name="arrow_forward" size="16px" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useMenuStore } from 'src/stores/menuStore';
import { fetchRestaurant } from 'src/services/restaurantService';
import { fetchTables, isTakeawayName } from 'src/services/tableService';
import { formatPrice, isTakeawayOption, isDiningOptionGroup } from 'src/utils/formatters';
import { SelectionType } from 'src/types/enums';
import { useNotify } from 'src/composables/useNotify';
import EmptyState from 'src/components/EmptyState.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import QuantityStepper from 'src/components/QuantityStepper.vue';
import RandomMenuGame from 'src/components/RandomMenuGame.vue';
import logoMarkSvg from 'src/assets/logo-mark.svg';
import logoSvg from 'src/assets/logo.svg';
import type { Restaurant, TableWithQR, MenuItem, MenuItemWithOptions } from 'src/types/database';
import type { CartItemOption } from 'src/types/cart';

interface MockCartItem {
  cart_item_id: string;
  menu_item_id: string;
  name: string;
  base_price: number;
  image_url: string | null;
  quantity: number;
  special_instruction: string;
  selected_options: CartItemOption[];
  subtotal: number;
}

interface MockOrderRecord {
  orderNumber: number;
  tableName: string;
  customerName?: string;
  time: string;
  items: MockCartItem[];
  totalAmount: number;
}

const menuStore = useMenuStore();
const { notifySuccess, notifyWarning } = useNotify();

// State
const restaurantInfo = ref<Restaurant | null>(null);
const tablesList = ref<TableWithQR[]>([]);
const selectedTable = ref<TableWithQR | null>(null);
const previewCustomerName = ref('ลูกค้าทดลอง');
const viewportMode = ref<'mobile' | 'tablet' | 'full'>('mobile');
const currentScreen = ref<'welcome' | 'menu' | 'product-detail' | 'cart' | 'orders'>('menu');
const isScrolled = ref(false);
const isReloading = ref(false);
const isSubmittingMock = ref(false);

// Menu State
const activeCategory = ref('');
const searchInput = ref('');
const searchQuery = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;

// Product Detail State
const activeDetailItem = ref<MenuItemWithOptions | null>(null);
const detailQuantity = ref(1);
const detailSpecialInstruction = ref('');
const detailSelectedOptions = reactive<Record<string, string>>({});
const detailMultiOptions = reactive<Record<string, string[]>>({});
const detailMissingGroupIds = ref<Set<string>>(new Set());

// In-Memory Preview Cart (Isolated from real store)
const previewCartItems = ref<MockCartItem[]>([]);
const lastMockOrder = ref<MockOrderRecord | null>(null);

const isTakeawaySelected = computed(() => isTakeawayName(selectedTable.value?.name));

const tableOptions = computed(() => {
  if (tablesList.value.length > 0) return tablesList.value;
  // Default mock fallback
  return [
    {
      id: 'mock-1',
      name: 'โต๊ะ 1',
      sort_order: 1,
      is_active: true,
      restaurant_id: '',
      created_at: '',
      updated_at: '',
      active_qr: null,
    },
    {
      id: 'mock-takeaway',
      name: 'สั่งกลับบ้าน',
      sort_order: 0,
      is_active: true,
      restaurant_id: '',
      created_at: '',
      updated_at: '',
      active_qr: null,
    },
  ];
});

const isSearching = computed(() => searchQuery.value.trim().length > 0);

const currentMenuItems = computed(() => {
  if (isSearching.value) {
    const q = searchQuery.value.toLowerCase();
    return menuStore.activeItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)),
    );
  }
  return activeCategory.value ? menuStore.itemsByCategory(activeCategory.value) : [];
});

const previewCartItemCount = computed(() =>
  previewCartItems.value.reduce((sum, item) => sum + item.quantity, 0),
);
const previewCartTotal = computed(() =>
  previewCartItems.value.reduce((sum, item) => sum + item.subtotal, 0),
);

onMounted(async () => {
  await loadInitialData();
});

async function loadInitialData() {
  try {
    const [rest, tables] = await Promise.all([
      fetchRestaurant().catch(() => null),
      fetchTables().catch(() => []),
      menuStore.loadMenu(true),
    ]);

    if (rest) restaurantInfo.value = rest;
    if (tables && tables.length > 0) {
      tablesList.value = tables;
      selectedTable.value = tables[0] || null;
    }

    if (menuStore.activeCategories.length > 0) {
      activeCategory.value = menuStore.activeCategories[0]?.id ?? '';
    }
  } catch (err) {
    console.error('Failed to load preview data:', err);
  }
}

async function reloadMenuData() {
  isReloading.value = true;
  try {
    await menuStore.loadMenu(true);
    notifySuccess('รีเฟรชข้อมูลเมนูจากฐานข้อมูลเรียบร้อย');
  } finally {
    isReloading.value = false;
  }
}

function resetPreview() {
  previewCartItems.value = [];
  lastMockOrder.value = null;
  currentScreen.value = 'welcome';
  notifySuccess('รีเซ็ตหน้าจอจำลองเรียบร้อย');
}

function resetToMenuScreen() {
  currentScreen.value = 'menu';
}

function getScreenTitle() {
  switch (currentScreen.value) {
    case 'welcome':
      return '';
    case 'menu':
      return 'เมนูอาหาร';
    case 'product-detail':
      return 'เลือกเมนูอาหาร';
    case 'cart':
      return 'ตะกร้าของคุณ';
    case 'orders':
      return 'รายการอาหารที่สั่ง';
    default:
      return 'เมนูอาหาร';
  }
}

function goBackScreen() {
  if (currentScreen.value === 'product-detail' || currentScreen.value === 'cart') {
    currentScreen.value = 'menu';
  } else if (currentScreen.value === 'orders') {
    currentScreen.value = 'menu';
  }
}

function goToOrdersScreen() {
  currentScreen.value = 'orders';
}

function onScreenScroll(e: Event) {
  const el = e.target as HTMLElement;
  isScrolled.value = el.scrollTop > 10;
}

function selectCategory(catId: string) {
  activeCategory.value = catId;
  clearSearch();
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery.value = searchInput.value.trim();
  }, 300);
}

function clearSearch() {
  searchInput.value = '';
  searchQuery.value = '';
  if (searchTimer) clearTimeout(searchTimer);
}

// ─── Product Detail & Customization logic ────────────────────
async function openProductDetail(item: MenuItem) {
  const itemWithOptions = await menuStore.fetchItemWithOptions(item.id, true);
  if (!itemWithOptions) return;

  activeDetailItem.value = itemWithOptions;
  detailQuantity.value = 1;
  detailSpecialInstruction.value = '';

  // Reset option selections
  Object.keys(detailSelectedOptions).forEach((k) => delete detailSelectedOptions[k]);
  Object.keys(detailMultiOptions).forEach((k) => delete detailMultiOptions[k]);
  detailMissingGroupIds.value = new Set();

  for (const group of itemWithOptions.option_groups) {
    if (group.selection_type === SelectionType.MULTI) {
      detailMultiOptions[group.id] = [];
    } else if (group.selection_type === SelectionType.SINGLE) {
      if (isDiningOptionGroup(group.name) && isTakeawaySelected.value) {
        const takeawayOpt =
          group.options.find((o) => isTakeawayOption(o.name) && o.is_available) ||
          group.options.find((o) => isTakeawayOption(o.name));
        if (takeawayOpt) {
          detailSelectedOptions[group.id] = takeawayOpt.id;
          detailMissingGroupIds.value.delete(group.id);
        }
      }
    }
  }

  currentScreen.value = 'product-detail';
}

function toggleSingleDetailOption(
  group: { id: string; name?: string; is_required: boolean },
  optId: string,
  isAvailable: boolean,
) {
  if (!isAvailable) return;

  // Lock dining option if previewing as takeaway
  if (isTakeawaySelected.value && isDiningOptionGroup(group.name)) {
    return;
  }

  if (detailSelectedOptions[group.id] === optId) {
    if (!group.is_required) {
      delete detailSelectedOptions[group.id];
    }
  } else {
    detailSelectedOptions[group.id] = optId;
  }

  if (detailSelectedOptions[group.id]) {
    detailMissingGroupIds.value.delete(group.id);
  }
}

function toggleMultiDetailOption(
  groupId: string,
  optId: string,
  maxSelections: number | null,
  isAvailable: boolean,
) {
  if (!isAvailable) return;
  const current = detailMultiOptions[groupId] || [];
  const idx = current.indexOf(optId);

  if (idx > -1) {
    current.splice(idx, 1);
  } else {
    if (maxSelections === null || current.length < maxSelections) {
      current.push(optId);
    }
  }
  detailMultiOptions[groupId] = [...current];

  const group = activeDetailItem.value?.option_groups.find((g) => g.id === groupId);
  if (group) {
    const min = group.min_selections || 1;
    if (detailMultiOptions[groupId].length >= min) {
      detailMissingGroupIds.value.delete(groupId);
    }
  }
}

const calculatedDetailTotal = computed(() => {
  if (!activeDetailItem.value) return 0;
  let optTotal = 0;

  for (const group of activeDetailItem.value.option_groups) {
    if (group.selection_type === SelectionType.SINGLE && detailSelectedOptions[group.id]) {
      const opt = group.options.find((o) => o.id === detailSelectedOptions[group.id]);
      if (opt) optTotal += opt.price_adjustment;
    }
    if (group.selection_type === SelectionType.MULTI) {
      const selected = detailMultiOptions[group.id] ?? [];
      for (const optId of selected) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) optTotal += opt.price_adjustment;
      }
    }
  }

  return (activeDetailItem.value.base_price + optTotal) * detailQuantity.value;
});

function validateDetailOptions(): {
  isValid: boolean;
  missingGroups: { id: string; name: string }[];
} {
  if (!activeDetailItem.value) return { isValid: false, missingGroups: [] };

  const missing: { id: string; name: string }[] = [];

  for (const group of activeDetailItem.value.option_groups) {
    if (group.is_required) {
      if (group.selection_type === SelectionType.SINGLE) {
        if (!detailSelectedOptions[group.id]) {
          missing.push({ id: group.id, name: group.name });
        }
      } else if (group.selection_type === SelectionType.MULTI) {
        const selected = detailMultiOptions[group.id] ?? [];
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

function addDetailToPreviewCart() {
  if (!activeDetailItem.value || !activeDetailItem.value.is_available) return;

  const validation = validateDetailOptions();
  if (!validation.isValid) {
    const newMissingSet = new Set<string>();
    validation.missingGroups.forEach((g) => newMissingSet.add(g.id));
    detailMissingGroupIds.value = newMissingSet;

    if (validation.missingGroups.length === 1) {
      notifyWarning(`กรุณาเลือก "${validation.missingGroups[0]?.name}" ก่อนเพิ่มลงในตะกร้า`);
    } else {
      const names = validation.missingGroups.map((g) => g.name).join(', ');
      notifyWarning(`กรุณาเลือกตัวเลือกที่จำเป็น: ${names}`);
    }

    const firstMissing = validation.missingGroups[0];
    if (firstMissing) {
      const el = document.getElementById(`preview-group-${firstMissing.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  const chosenOptions: CartItemOption[] = [];
  for (const group of activeDetailItem.value.option_groups) {
    if (group.selection_type === SelectionType.SINGLE && detailSelectedOptions[group.id]) {
      const opt = group.options.find((o) => o.id === detailSelectedOptions[group.id]);
      if (opt) {
        chosenOptions.push({
          option_id: opt.id,
          option_group_id: group.id,
          name: opt.name,
          group_name: group.name,
          price_adjustment: opt.price_adjustment,
        });
      }
    }
    if (group.selection_type === SelectionType.MULTI) {
      const selected = detailMultiOptions[group.id] ?? [];
      for (const optId of selected) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) {
          chosenOptions.push({
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

  const subtotal = calculatedDetailTotal.value;

  previewCartItems.value.push({
    cart_item_id: `mock-cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    menu_item_id: activeDetailItem.value.id,
    name: activeDetailItem.value.name,
    base_price: activeDetailItem.value.base_price,
    image_url: activeDetailItem.value.image_url,
    quantity: detailQuantity.value,
    special_instruction: detailSpecialInstruction.value.trim(),
    selected_options: chosenOptions,
    subtotal,
  });

  notifySuccess('เพิ่มลงในตะกร้าจำลองเรียบร้อยแล้ว');
  currentScreen.value = 'menu';
}

function clearPreviewCart() {
  previewCartItems.value = [];
}

function removePreviewCartItem(cartItemId: string) {
  previewCartItems.value = previewCartItems.value.filter((i) => i.cart_item_id !== cartItemId);
}

function updatePreviewCartItemQty(cartItemId: string, newQty: number) {
  const item = previewCartItems.value.find((i) => i.cart_item_id === cartItemId);
  if (item && newQty > 0) {
    const singlePrice = item.subtotal / item.quantity;
    item.quantity = newQty;
    item.subtotal = singlePrice * newQty;
  }
}

async function submitMockOrder() {
  if (previewCartItems.value.length === 0) return;
  isSubmittingMock.value = true;

  // Simulate short network delay for realistic feedback
  await new Promise((resolve) => setTimeout(resolve, 450));

  const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const mockOrderNum = Math.floor(Math.random() * 89) + 10;

  lastMockOrder.value = {
    orderNumber: mockOrderNum,
    tableName: selectedTable.value?.name || 'โต๊ะทดลอง',
    customerName: previewCustomerName.value,
    time: `${timeStr} น.`,
    items: [...previewCartItems.value],
    totalAmount: previewCartTotal.value,
  };

  previewCartItems.value = [];
  isSubmittingMock.value = false;
  currentScreen.value = 'orders';
  notifySuccess('ทดสอบส่งออเดอร์จำลองสำเร็จ! (ไม่มีผลกับระบบจริง)');
}
</script>

<style scoped>
.customer-preview-page {
  background-color: #f8fafc;
  min-height: calc(100vh - 56px);
}

/* Control Bar */
.preview-control-bar {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 12px 16px;
  box-shadow: var(--shadow-subtle);
}

.sandbox-badge {
  display: inline-flex;
  align-items: center;
  background: #dcfce7;
  color: #15803d;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  border: 1px solid #bbf7d0;
}

.table-select {
  min-width: 170px;
}

.table-select :deep(.q-field__control) {
  border-radius: var(--radius-sm);
  height: 38px;
}

.min-avatar {
  min-width: 32px;
}

.viewport-toggle {
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

/* Safety Banner */
.safety-banner {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-sm);
  padding: 8px 14px;
}

/* Preview Stage Layout */
.preview-stage-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 750px;
  padding-bottom: 40px;
}

.stage--mobile {
  max-width: 440px;
  margin: 0 auto;
}

.stage--tablet {
  max-width: 660px;
  margin: 0 auto;
}

.stage--full {
  max-width: 100%;
}

/* Device Mockup Shell */
.device-frame {
  width: 100%;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  position: relative;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.device-frame--mobile {
  border: 10px solid #1e293b;
  border-radius: 40px;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.25);
  max-width: 395px;
}

.device-frame--tablet {
  border: 12px solid #334155;
  border-radius: 28px;
  box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.2);
  max-width: 620px;
}

.device-frame--full {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  max-width: 100%;
}

/* Mobile Notch */
.device-notch {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 110px;
  height: 22px;
  background: #1e293b;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.notch-speaker {
  width: 38px;
  height: 4px;
  background: #475569;
  border-radius: 4px;
}

.notch-camera {
  width: 8px;
  height: 8px;
  background: #0f172a;
  border-radius: 50%;
  border: 1px solid #334155;
}

/* Screen Area */
.device-screen {
  background: var(--color-background);
  min-height: 680px;
  max-height: 820px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.screen-sandbox-ribbon {
  position: absolute;
  top: 6px;
  right: -32px;
  background: #f59e0b;
  color: #ffffff;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  padding: 2px 30px;
  transform: rotate(45deg);
  z-index: 90;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

/* Mock Header */
.mock-customer-header {
  background: rgba(251, 249, 246, 0.94);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid transparent;
  position: sticky;
  top: 0;
  z-index: 40;
  transition: all 0.2s ease;
  padding: 8px 12px;
}

.mock-customer-header.header--scrolled {
  background: #ffffff;
  border-bottom-color: var(--color-border);
  box-shadow: var(--shadow-subtle);
}

.mock-header-toolbar {
  min-height: 40px;
}

.mock-header-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(45, 35, 30, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease;
}

.mock-header-btn:hover {
  background: rgba(45, 35, 30, 0.12);
}

.mock-logo-wrap {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mock-logo-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.mock-page-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.mock-table-pill {
  display: inline-flex;
  align-items: center;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  margin-top: 1px;
}

.mock-table-pill--takeaway {
  background: #ffedd5;
  color: #ea580c;
  border: 1px solid #fed7aa;
}

/* Screen Content Scrollable */
.mock-screen-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 70px;
}

/* Welcome View */
.mock-welcome-view {
  min-height: 560px;
}

.welcome-mock-card {
  width: 100%;
  max-width: 340px;
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.welcome-logo-box {
  width: 110px;
}

.welcome-logo-asset {
  width: 100%;
  height: auto;
}

.welcome-btn {
  height: 44px;
  border-radius: var(--radius-md);
  font-weight: 600;
}

/* Menu View */
.category-tabs-sticky {
  position: sticky;
  top: 0;
  z-index: 30;
  background: rgba(251, 249, 246, 0.96);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border);
  padding: 6px 10px;
}

.category-pills-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.category-pills-row::-webkit-scrollbar {
  display: none;
}

.mock-category-pill {
  border: 1px solid var(--color-border);
  background: #ffffff;
  color: var(--color-text-secondary);
  padding: 4px 14px;
  border-radius: var(--radius-pill);
  font-family: var(--app-font-family);
  font-size: 0.82rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mock-category-pill--active {
  background: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
  font-weight: 600;
}

.search-box {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 0 10px;
  height: 32px;
}

.mock-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.82rem;
  color: var(--color-text-primary);
}

.search-clear {
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.mock-menu-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.mock-menu-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
  display: flex;
  flex-direction: column;
}

.mock-menu-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.mock-menu-card--soldout {
  opacity: 0.75;
}

.mock-card-img-wrap {
  position: relative;
  width: 100%;
  padding-top: 70%;
  background: var(--color-surface-subtle);
  overflow: hidden;
}

.mock-card-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mock-card-img-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.soldout-badge-overlay {
  position: absolute;
  inset: 0;
  background: rgba(45, 35, 30, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.soldout-badge-overlay span {
  background: #ffffff;
  color: var(--color-status-soldout);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.mock-card-body {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.mock-item-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--color-text-primary);
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mock-item-desc {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  line-height: 1.3;
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mock-item-price {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-primary);
}

.mock-add-btn {
  display: inline-flex;
  align-items: center;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  font-weight: 600;
}

.mock-add-btn--disabled {
  background: var(--color-surface-subtle);
  color: var(--color-text-muted);
}

/* Product Detail View */
.detail-hero-img-wrap {
  width: 100%;
  height: 200px;
  background: var(--color-surface-subtle);
  overflow: hidden;
}

.detail-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-hero-img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-item-title {
  font-size: 1.15rem;
  line-height: 1.3;
}

.detail-soldout-alert {
  background: var(--color-status-soldout-bg);
  color: var(--color-status-soldout);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
}

.detail-option-group {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  box-shadow: var(--shadow-subtle);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.detail-option-group--error {
  border: 1.5px solid #ef4444 !important;
  background-color: #fffaf9 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12) !important;
  animation: shake-error 0.35s ease-in-out;
}

@keyframes shake-error {
  0%,
  100% {
    transform: translateX(0);
  }
  20%,
  60% {
    transform: translateX(-3px);
  }
  40%,
  80% {
    transform: translateX(3px);
  }
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

.group-pill-tag {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.group-pill-tag--req {
  background: var(--color-status-soldout-bg);
  color: var(--color-status-soldout);
}

.group-pill-tag--opt {
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
}

.group-pill-tag--takeaway-locked {
  background: #fff7ed;
  color: #ea580c;
  border: 1px solid #fed7aa;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}

.detail-option-group--takeaway-locked {
  border-left: 3.5px solid #f97316 !important;
  background: #fffdfa;
}

.mock-option-row {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-subtle);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.85rem;
}

.mock-option-row:hover:not(.mock-option-row--disabled) {
  background: #ffffff;
  border-color: var(--color-border);
}

.mock-option-row--selected {
  background: var(--color-primary-soft) !important;
  border-color: var(--color-primary-tint) !important;
}

.mock-option-row--locked {
  background: #fff7ed !important;
  border-color: #fdba74 !important;
  cursor: default !important;
}

.mock-option-row--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.opt-sold-badge {
  background: var(--color-status-soldout-bg);
  color: var(--color-status-soldout);
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: var(--radius-pill);
}

.detail-sticky-footer {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid var(--color-border);
  padding: 8px 12px;
  z-index: 50;
}

.detail-add-btn {
  height: 46px;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
}

/* Floating Cart Sticky Bar */
.mock-floating-cart-bar {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  z-index: 60;
}

.mock-floating-cart-btn {
  width: 100%;
  height: 48px;
  background: var(--color-primary);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-pill);
  padding: 0 16px;
  cursor: pointer;
  box-shadow: var(--shadow-float);
  display: flex;
  align-items: center;
  transition: transform 0.15s ease;
}

.mock-floating-cart-btn:hover {
  transform: translateY(-2px);
}

.mock-cart-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Cart View */
.mock-cart-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 10px;
  box-shadow: var(--shadow-subtle);
}

.mock-cart-thumb {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-surface-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mock-cart-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mock-opt-chip {
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
}

.mock-opt-chip--takeaway {
  background: #ffedd5;
  color: #ea580c;
  border: 1px solid #fed7aa;
}

.mock-cart-summary {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 12px;
}

/* Orders / Success View */
.mock-order-success-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.mock-success-icon-wrap {
  display: flex;
  justify-content: center;
}

.mock-ticket-box {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: var(--radius-md);
}

.mock-safe-alert {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: var(--radius-sm);
}

.pointer-events-none {
  pointer-events: none;
}
</style>
