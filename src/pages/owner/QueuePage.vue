<template>
  <q-page class="queue-page q-pa-md">
    <!-- Loading Skeleton -->
    <LoadingSkeleton v-if="isLoading" type="queue" />

    <template v-else>
      <!-- Queue Header Bar -->
      <div class="queue-top-header q-mb-md">
        <div class="row items-center justify-between wrap q-gutter-y-sm">
          <div>
            <div class="row items-center q-gutter-x-sm">
              <h5 class="q-my-none text-weight-bold page-title">คิวออเดอร์ในครัว</h5>
              <q-badge color="primary" rounded class="q-px-sm q-py-xs">
                <q-icon name="sync" size="14px" class="q-mr-xs animate-spin-slow" />
                <span>เรียลไทม์</span>
              </q-badge>
            </div>
            <p class="text-caption text-grey-7 q-mb-none q-mt-xs">
              จัดการคิวอาหาร โหมดทำอาหารขนาดใหญ่ และภาพรวมครัว
            </p>
          </div>

          <!-- Quick Stats & View Switcher & Audio Controls -->
          <div class="row items-center q-gutter-sm">
            <!-- Sound Toggle Button -->
            <q-btn
              flat
              dense
              round
              :icon="soundEnabled ? 'volume_up' : 'volume_off'"
              :color="soundEnabled ? 'primary' : 'grey-6'"
              @click="toggleSound"
            >
              <q-tooltip>{{
                soundEnabled ? 'เปิดเสียงเตือนอยู่ (คลิกเพื่อปิด)' : 'ปิดเสียงเตือน (คลิกเพื่อเปิด)'
              }}</q-tooltip>
            </q-btn>

            <!-- Mode Switcher Buttons -->
            <q-btn-group unelevated class="view-toggle-group">
              <q-btn
                no-caps
                :unelevated="viewMode === 'focus'"
                :flat="viewMode !== 'focus'"
                :color="viewMode === 'focus' ? 'primary' : 'grey-3'"
                :text-color="viewMode === 'focus' ? 'white' : 'grey-8'"
                class="view-toggle-btn"
                @click="viewMode = 'focus'"
              >
                <q-icon name="view_carousel" size="18px" class="q-mr-xs" />
                <span class="text-weight-bold">โหมดโฟกัสทำอาหาร</span>
                <q-badge v-if="activeKitchenOrders.length > 0" color="amber-9" floating rounded>
                  {{ activeKitchenOrders.length }}
                </q-badge>
              </q-btn>

              <q-btn
                no-caps
                :unelevated="viewMode === 'overview'"
                :flat="viewMode !== 'overview'"
                :color="viewMode === 'overview' ? 'primary' : 'grey-3'"
                :text-color="viewMode === 'overview' ? 'white' : 'grey-8'"
                class="view-toggle-btn"
                @click="viewMode = 'overview'"
              >
                <q-icon name="view_kanban" size="18px" class="q-mr-xs" />
                <span class="text-weight-bold">ดูภาพรวม</span>
              </q-btn>

              <q-btn
                no-caps
                :unelevated="viewMode === 'fry'"
                :flat="viewMode !== 'fry'"
                :color="viewMode === 'fry' ? 'deep-orange-8' : 'grey-3'"
                :text-color="viewMode === 'fry' ? 'white' : 'grey-8'"
                class="view-toggle-btn"
                @click="viewMode = 'fry'"
              >
                <q-icon name="local_fire_department" size="18px" class="q-mr-xs" />
                <span class="text-weight-bold">คิวของทอด</span>
                <q-badge v-if="pendingFryCount > 0" color="deep-orange-9" floating rounded>
                  {{ pendingFryCount }}
                </q-badge>
              </q-btn>
            </q-btn-group>
          </div>
        </div>

        <!-- Kitchen Status Summary Counters -->
        <div class="row q-gutter-sm q-mt-sm">
          <div
            class="stat-chip stat-chip--queued"
            @click="
              focusFilter = 'queued';
              viewMode = 'focus';
            "
          >
            <q-icon name="schedule" size="16px" class="q-mr-xs text-light-blue-8" />
            <span
              >รอเริ่มทำ: <strong>{{ queueStore.queuedOrders.length }}</strong></span
            >
          </div>
          <div
            class="stat-chip stat-chip--preparing"
            @click="
              focusFilter = 'preparing';
              viewMode = 'focus';
            "
          >
            <q-icon name="soup_kitchen" size="16px" class="q-mr-xs text-amber-9" />
            <span
              >กำลังปรุง: <strong>{{ queueStore.preparingOrders.length }}</strong></span
            >
          </div>
          <div
            class="stat-chip stat-chip--prepared"
            @click="
              focusFilter = 'prepared';
              viewMode = 'focus';
            "
          >
            <q-icon name="check_circle" size="16px" class="q-mr-xs text-green-7" />
            <span
              >พร้อมเสิร์ฟ: <strong>{{ queueStore.preparedOrders.length }}</strong></span
            >
          </div>
          <div class="stat-chip stat-chip--fry" @click="viewMode = 'fry'">
            <q-icon name="local_fire_department" size="16px" class="q-mr-xs text-deep-orange-8" />
            <span
              >ของทอดรอทำ: <strong>{{ pendingFryCount }}</strong> ชิ้น</span
            >
          </div>
          <div class="stat-chip stat-chip--served" @click="viewMode = 'overview'">
            <q-icon name="done_all" size="16px" class="q-mr-xs text-grey-7" />
            <span
              >เสิร์ฟแล้ววันนี้: <strong>{{ queueStore.servedOrders.length }}</strong></span
            >
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- VIEW 1: FOCUS COOK SLIDER MODE (มุมมองโฟกัสทำอาหารขนาดใหญ่ สไลด์ได้) -->
      <!-- ========================================================================= -->
      <div v-if="viewMode === 'focus'" class="focus-mode-container animate-fade-in">
        <!-- Focus Filter & Navigation Header -->
        <div class="focus-control-bar q-mb-md">
          <div class="row items-center justify-between wrap q-gutter-y-sm">
            <!-- Filter Tabs -->
            <div class="row items-center q-gutter-xs">
              <q-btn
                unelevated
                rounded
                dense
                no-caps
                size="sm"
                class="q-px-md filter-tab-btn"
                :class="{ 'filter-tab-btn--active': focusFilter === 'all' }"
                @click="setFocusFilter('all')"
              >
                ทั้งหมดในครัว ({{ activeKitchenOrders.length }})
              </q-btn>
              <q-btn
                unelevated
                rounded
                dense
                no-caps
                size="sm"
                class="q-px-md filter-tab-btn"
                :class="{ 'filter-tab-btn--active': focusFilter === 'queued' }"
                @click="setFocusFilter('queued')"
              >
                <q-badge color="light-blue-8" rounded class="q-mr-xs" />
                รอเริ่มทำ ({{ queueStore.queuedOrders.length }})
              </q-btn>
              <q-btn
                unelevated
                rounded
                dense
                no-caps
                size="sm"
                class="q-px-md filter-tab-btn"
                :class="{ 'filter-tab-btn--active': focusFilter === 'preparing' }"
                @click="setFocusFilter('preparing')"
              >
                <q-badge color="amber-9" rounded class="q-mr-xs" />
                กำลังปรุง ({{ queueStore.preparingOrders.length }})
              </q-btn>
              <q-btn
                unelevated
                rounded
                dense
                no-caps
                size="sm"
                class="q-px-md filter-tab-btn"
                :class="{ 'filter-tab-btn--active': focusFilter === 'prepared' }"
                @click="setFocusFilter('prepared')"
              >
                <q-badge color="green-7" rounded class="q-mr-xs" />
                พร้อมเสิร์ฟ ({{ queueStore.preparedOrders.length }})
              </q-btn>
            </div>

            <!-- Slide Navigation Counter & Arrow Controls -->
            <div v-if="filteredFocusOrders.length > 0" class="row items-center q-gutter-sm">
              <span class="slide-counter-label">
                ออเดอร์ที่ <strong>{{ currentSlideIndex + 1 }}</strong> จาก
                <strong>{{ filteredFocusOrders.length }}</strong>
              </span>

              <q-btn
                round
                dense
                unelevated
                icon="chevron_left"
                class="slider-arrow-btn"
                :disable="currentSlideIndex === 0"
                @click="prevSlide"
              >
                <q-tooltip>ออเดอร์ก่อนหน้า (ลูกศรซ้าย)</q-tooltip>
              </q-btn>

              <q-btn
                round
                dense
                unelevated
                icon="chevron_right"
                class="slider-arrow-btn"
                :disable="currentSlideIndex >= filteredFocusOrders.length - 1"
                @click="nextSlide"
              >
                <q-tooltip>ออเดอร์ถัดไป (ลูกศรขวา)</q-tooltip>
              </q-btn>

              <q-btn
                outline
                dense
                no-caps
                icon="view_kanban"
                label="ดูภาพรวม"
                class="overview-back-btn q-px-sm"
                @click="viewMode = 'overview'"
              />
            </div>
          </div>
        </div>

        <!-- Empty State in Focus Mode -->
        <div v-if="filteredFocusOrders.length === 0" class="focus-empty-card">
          <q-icon name="soup_kitchen" size="64px" color="primary" class="q-mb-md opacity-60" />
          <h5 class="q-my-none text-weight-bold">ไม่มีออเดอร์ที่ต้องทำในหมวดนี้</h5>
          <p class="text-grey-7 q-mt-xs q-mb-md">
            {{
              focusFilter === 'all'
                ? 'ครัวเคลียร์ออเดอร์เสร็จเรียบร้อยแล้ว'
                : 'ไม่มีรายการในสถานะที่เลือก'
            }}
          </p>
          <div class="row q-gutter-sm">
            <q-btn
              v-if="focusFilter !== 'all'"
              unelevated
              no-caps
              color="primary"
              label="ดูออเดอร์ทั้งหมดในครัว"
              @click="setFocusFilter('all')"
            />
            <q-btn
              outline
              no-caps
              color="grey-8"
              icon="view_kanban"
              label="กลับไปดูภาพรวมทุกคอลัมน์"
              @click="viewMode = 'overview'"
            />
          </div>
        </div>

        <!-- Main Swipeable Carousel of Large Cards -->
        <div v-else class="focus-slider-wrapper">
          <q-carousel
            v-model="currentSlideId"
            swipeable
            animated
            transition-prev="slide-right"
            transition-next="slide-left"
            height="auto"
            class="focus-carousel bg-transparent"
          >
            <q-carousel-slide
              v-for="order in filteredFocusOrders"
              :key="order.id"
              :name="order.id"
              class="q-pa-none"
            >
              <div
                class="chef-large-card"
                :class="{
                  'chef-large-card--queued': order.status === OrderStatus.QUEUED,
                  'chef-large-card--preparing': order.status === OrderStatus.PREPARING,
                  'chef-large-card--prepared': order.status === OrderStatus.PREPARED,
                }"
              >
                <!-- Card Header: Queue Number, Table, Status, Elapsed Time -->
                <div class="chef-card-header">
                  <div class="row items-center justify-between wrap q-gutter-y-sm">
                    <div class="row items-center q-gutter-x-md">
                      <div class="chef-queue-badge">
                        <span class="chef-queue-label">คิวที่</span>
                        <span class="chef-queue-number">{{
                          formatQueueNumber(order.queue_number)
                        }}</span>
                      </div>

                      <div
                        class="chef-table-badge"
                        :class="{
                          'chef-table-badge--takeaway': isTakeawayName(getTableName(order)),
                        }"
                      >
                        <q-icon
                          :name="
                            isTakeawayName(getTableName(order))
                              ? 'shopping_bag'
                              : 'table_restaurant'
                          "
                          size="20px"
                          class="q-mr-xs"
                          :color="isTakeawayName(getTableName(order)) ? 'orange-9' : 'primary'"
                        />
                        <span
                          class="chef-table-name"
                          :class="{ 'text-orange-9': isTakeawayName(getTableName(order)) }"
                        >
                          {{ getTableName(order) }}
                        </span>
                      </div>
                    </div>

                    <!-- Status & Timer Badges -->
                    <div class="row items-center q-gutter-x-sm">
                      <div
                        class="chef-status-pill"
                        :class="{
                          'chef-status-pill--queued': order.status === OrderStatus.QUEUED,
                          'chef-status-pill--preparing': order.status === OrderStatus.PREPARING,
                          'chef-status-pill--prepared': order.status === OrderStatus.PREPARED,
                        }"
                      >
                        <q-icon :name="getStatusIcon(order.status)" size="18px" class="q-mr-xs" />
                        <span>{{ getStatusLabel(order.status) }}</span>
                      </div>

                      <div class="chef-timer-pill" :class="getTimerColorClass(order.created_at)">
                        <q-icon name="timer" size="16px" class="q-mr-xs" />
                        <span>รอมาแล้ว {{ formatElapsed(order.created_at) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Revision Alert Banner -->
                  <div v-if="order.revision > 1" class="chef-revision-alert q-mt-sm">
                    <q-icon
                      name="notification_important"
                      size="20px"
                      class="q-mr-xs animate-bounce"
                    />
                    <span
                      ><strong>คำเตือน:</strong> ลูกค้ารายการนี้มีการแก้ไขรายการอาหาร (เวอร์ชัน
                      {{ order.revision }})</span
                    >
                  </div>
                </div>

                <!-- Card Body: Large Dish Items List -->
                <div class="chef-card-body">
                  <div class="chef-dishes-header">
                    <span class="chef-dishes-title"
                      >รายการอาหารที่ต้องทำ ({{ getTotalDishesCount(order) }} จาน)</span
                    >
                    <span class="text-caption text-grey-6"
                      >เวลาสั่ง {{ formatTime(order.created_at) }}</span
                    >
                  </div>

                  <div class="chef-dishes-grid">
                    <div
                      v-for="(item, idx) in order.items"
                      :key="item.id || idx"
                      class="chef-dish-row"
                    >
                      <div class="row items-start no-wrap">
                        <!-- Big Quantity Badge -->
                        <div class="chef-dish-qty-box">{{ item.quantity }}x</div>

                        <!-- Dish Details -->
                        <div class="chef-dish-info q-ml-md col">
                          <div class="chef-dish-name">
                            {{ item.snapshot_name }}
                          </div>

                          <!-- Options / Addons List -->
                          <div
                            v-if="item.options && getVisibleOptions(item.options).length > 0"
                            class="chef-options-wrap q-mt-xs"
                          >
                            <span
                              v-for="opt in getVisibleOptions(item.options)"
                              :key="opt.id"
                              class="chef-option-chip"
                              :class="{
                                'chef-option-chip--takeaway': isTakeawayOption(
                                  opt.snapshot_option_name,
                                ),
                              }"
                            >
                              <q-icon
                                v-if="isTakeawayOption(opt.snapshot_option_name)"
                                name="shopping_bag"
                                size="13px"
                                class="q-mr-xs"
                              />
                              {{
                                isTakeawayOption(opt.snapshot_option_name)
                                  ? opt.snapshot_option_name
                                  : `+ ${opt.snapshot_option_name}`
                              }}
                            </span>
                          </div>

                          <!-- Special Instruction / Note -->
                          <div v-if="item.special_instruction" class="chef-special-note q-mt-xs">
                            <q-icon name="edit_note" size="18px" class="q-mr-xs" />
                            <span>{{ item.special_instruction }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Giant Action Button Bar -->
                <div class="chef-card-footer">
                  <div class="row items-center q-col-gutter-md">
                    <div class="col-12 col-sm-8">
                      <!-- 1. QUEUED -> Start Preparing Button -->
                      <q-btn
                        v-if="order.status === OrderStatus.QUEUED"
                        unelevated
                        no-caps
                        size="lg"
                        class="full-width chef-main-btn chef-main-btn--start"
                        @click="advanceStatusAndProceed(order.id, OrderStatus.PREPARING)"
                      >
                        <q-icon name="soup_kitchen" size="24px" class="q-mr-sm" />
                        <span class="text-weight-bold">🔥 เริ่มเตรียมออเดอร์นี้</span>
                      </q-btn>

                      <!-- 2. PREPARING -> Prepared Button -->
                      <q-btn
                        v-else-if="order.status === OrderStatus.PREPARING"
                        unelevated
                        no-caps
                        size="lg"
                        class="full-width chef-main-btn chef-main-btn--done"
                        @click="advanceStatusAndProceed(order.id, OrderStatus.PREPARED)"
                      >
                        <q-icon name="check_circle" size="24px" class="q-mr-sm" />
                        <span class="text-weight-bold">✅ ปรุงเสร็จแล้ว (พร้อมเสิร์ฟ)</span>
                      </q-btn>

                      <!-- 3. PREPARED -> Confirm Served Button -->
                      <q-btn
                        v-else-if="order.status === OrderStatus.PREPARED"
                        unelevated
                        no-caps
                        size="lg"
                        class="full-width chef-main-btn"
                        :class="
                          queueStore.canServe(order)
                            ? 'chef-main-btn--serve'
                            : 'chef-main-btn--disabled'
                        "
                        :disable="!queueStore.canServe(order)"
                        @click="advanceStatusAndProceed(order.id, OrderStatus.SERVED)"
                      >
                        <q-icon name="done_all" size="24px" class="q-mr-sm" />
                        <span class="text-weight-bold">
                          {{
                            queueStore.canServe(order)
                              ? '🍽️ ยืนยันว่าเสิร์ฟเรียบร้อย'
                              : '⏳ รอเสิร์ฟตามลำดับคิว'
                          }}
                        </span>
                      </q-btn>
                    </div>

                    <div class="col-12 col-sm-4">
                      <!-- Quick Switch Back to Overview Button -->
                      <q-btn
                        outline
                        no-caps
                        size="lg"
                        class="full-width chef-secondary-btn"
                        @click="viewMode = 'overview'"
                      >
                        <q-icon name="view_kanban" size="20px" class="q-mr-sm" />
                        <span>ดูภาพรวมทั้งหมด</span>
                      </q-btn>
                    </div>
                  </div>
                </div>
              </div>
            </q-carousel-slide>
          </q-carousel>

          <!-- Bottom Mini Thumbnails Strip for Quick Jump -->
          <div v-if="filteredFocusOrders.length > 1" class="focus-thumbnails-strip q-mt-md">
            <div class="text-caption text-grey-7 q-mb-xs text-weight-medium">
              สลับไปยังออเดอร์อื่นอย่างรวดเร็ว (แตะเลือกเพื่อดู):
            </div>
            <div class="thumbnails-scroll-row">
              <div
                v-for="ord in filteredFocusOrders"
                :key="ord.id"
                class="mini-order-chip"
                :class="{
                  'mini-order-chip--active': ord.id === currentSlideId,
                  'mini-order-chip--queued': ord.status === OrderStatus.QUEUED,
                  'mini-order-chip--preparing': ord.status === OrderStatus.PREPARING,
                  'mini-order-chip--prepared': ord.status === OrderStatus.PREPARED,
                }"
                @click="jumpToOrder(ord.id)"
              >
                <div class="mini-chip-seq">{{ formatQueueNumber(ord.queue_number) }}</div>
                <div class="mini-chip-table">{{ getTableName(ord) }}</div>
                <div class="mini-chip-count">{{ ord.items.length }} รายการ</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- VIEW 2: OVERVIEW KANBAN 4 COLUMNS MODE (แบบภาพรวมเดิม) -->
      <!-- ========================================================================= -->
      <div v-else-if="viewMode === 'overview'" class="overview-mode-container animate-fade-in">
        <!-- Quick Banner to Jump into Focus Mode -->
        <div v-if="activeKitchenOrders.length > 0" class="overview-focus-banner q-mb-md">
          <div class="row items-center justify-between wrap q-gutter-sm">
            <div class="row items-center">
              <q-icon name="soup_kitchen" size="24px" class="q-mr-sm text-primary" />
              <div>
                <strong class="text-primary"
                  >มี {{ activeKitchenOrders.length }} ออเดอร์กำลังรอในครัว</strong
                >
                <div class="text-caption text-grey-7">
                  กดเพื่อเปิดหน้าจอขยายใหญ่สำหรับคนทำอาหาร สไลด์และกดเริ่มทำได้สะดวก
                </div>
              </div>
            </div>
            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="view_carousel"
              label="เปิดโหมดโฟกัสทำอาหาร (ขยายใหญ่)"
              class="text-weight-bold"
              @click="viewMode = 'focus'"
            />
          </div>
        </div>

        <!-- Kanban 4 Columns Grid -->
        <div class="queue-kanban-grid">
          <!-- 1. QUEUED (รายการใหม่) -->
          <div class="queue-column queue-column--queued">
            <div class="queue-column-header bg-light-blue-1 text-light-blue-9">
              <div class="row items-center">
                <q-icon name="schedule" size="18px" class="q-mr-xs text-light-blue-8" />
                <span class="column-title">รายการใหม่ (รอเริ่ม)</span>
              </div>
              <span class="column-count-badge bg-light-blue-8 text-white">
                {{ queueStore.queuedOrders.length }}
              </span>
            </div>

            <div class="queue-column-body">
              <div
                v-for="order in queueStore.queuedOrders"
                :key="order.id"
                class="queue-card queue-card--queued"
              >
                <!-- Card Header -->
                <div class="row items-center justify-between q-mb-xs">
                  <div class="row items-center q-gutter-x-xs">
                    <span class="queue-seq-number">{{
                      formatQueueNumber(order.queue_number)
                    }}</span>
                    <span
                      class="queue-table-badge"
                      :class="{
                        'queue-table-badge--takeaway': isTakeawayName(getTableName(order)),
                      }"
                    >
                      <q-icon
                        v-if="isTakeawayName(getTableName(order))"
                        name="shopping_bag"
                        size="12px"
                        class="q-mr-xs"
                      />
                      {{ getTableName(order) }}
                    </span>
                  </div>
                  <div class="elapsed-badge">
                    <q-icon name="timer" size="13px" class="q-mr-xs" />
                    <span>{{ formatElapsed(order.created_at) }}</span>
                  </div>
                </div>

                <!-- Dishes List -->
                <div class="dishes-list q-my-sm">
                  <div v-for="item in order.items" :key="item.id" class="dish-item-row">
                    <div class="dish-name-line">
                      <span class="text-weight-bold text-primary q-mr-xs"
                        >{{ item.quantity }}x</span
                      >
                      <span>{{ item.snapshot_name }}</span>
                    </div>
                    <!-- Options -->
                    <div
                      v-if="item.options && getVisibleOptions(item.options).length > 0"
                      class="dish-options-line text-grey-7"
                    >
                      <span
                        v-for="opt in getVisibleOptions(item.options)"
                        :key="opt.id"
                        class="dish-opt-chip q-mr-xs"
                        :class="{
                          'dish-opt-chip--takeaway': isTakeawayOption(opt.snapshot_option_name),
                        }"
                      >
                        <q-icon
                          v-if="isTakeawayOption(opt.snapshot_option_name)"
                          name="shopping_bag"
                          size="11px"
                          class="q-mr-xs"
                        />
                        {{
                          isTakeawayOption(opt.snapshot_option_name)
                            ? opt.snapshot_option_name
                            : `+${opt.snapshot_option_name}`
                        }}
                      </span>
                    </div>
                    <!-- Special note -->
                    <div v-if="item.special_instruction" class="dish-special-note">
                      <q-icon name="edit_note" size="14px" class="q-mr-xs" />
                      <span>{{ item.special_instruction }}</span>
                    </div>
                  </div>
                </div>

                <!-- Action Button -->
                <div class="card-action-bar q-mt-sm">
                  <q-btn
                    unelevated
                    no-caps
                    class="full-width action-btn action-btn--preparing"
                    @click="advanceStatus(order.id, OrderStatus.PREPARING)"
                  >
                    <q-icon name="soup_kitchen" size="16px" class="q-mr-xs" />
                    <span>เริ่มเตรียมอาหาร</span>
                  </q-btn>
                </div>
              </div>

              <div v-if="queueStore.queuedOrders.length === 0" class="empty-column-state">
                <q-icon name="check_circle_outline" size="32px" color="grey-4" class="q-mb-xs" />
                <div>ไม่มีออเดอร์ใหม่</div>
              </div>
            </div>
          </div>

          <!-- 2. PREPARING (กำลังเตรียม) -->
          <div class="queue-column queue-column--preparing">
            <div class="queue-column-header bg-amber-1 text-amber-10">
              <div class="row items-center">
                <q-icon name="soup_kitchen" size="18px" class="q-mr-xs text-amber-9" />
                <span class="column-title">กำลังเตรียม</span>
              </div>
              <span class="column-count-badge bg-amber-9 text-white">
                {{ queueStore.preparingOrders.length }}
              </span>
            </div>

            <div class="queue-column-body">
              <div
                v-for="order in queueStore.preparingOrders"
                :key="order.id"
                class="queue-card queue-card--preparing"
                :class="{ 'queue-card--updated': order.revision > 1 }"
              >
                <!-- Card Header -->
                <div class="row items-center justify-between q-mb-xs">
                  <div class="row items-center q-gutter-x-xs">
                    <span class="queue-seq-number">{{
                      formatQueueNumber(order.queue_number)
                    }}</span>
                    <span
                      class="queue-table-badge"
                      :class="{
                        'queue-table-badge--takeaway': isTakeawayName(getTableName(order)),
                      }"
                    >
                      <q-icon
                        v-if="isTakeawayName(getTableName(order))"
                        name="shopping_bag"
                        size="12px"
                        class="q-mr-xs"
                      />
                      {{ getTableName(order) }}
                    </span>
                  </div>
                  <div class="elapsed-badge elapsed-badge--amber">
                    <q-icon name="timer" size="13px" class="q-mr-xs" />
                    <span>{{ formatElapsed(order.preparing_at || order.created_at) }}</span>
                  </div>
                </div>

                <!-- Revision alert -->
                <div v-if="order.revision > 1" class="revision-banner q-mb-xs">
                  <q-icon name="notification_important" size="14px" class="q-mr-xs" />
                  <span>ลูกค้ารายการนี้มีการแก้ไข</span>
                </div>

                <!-- Dishes List -->
                <div class="dishes-list q-my-sm">
                  <div v-for="item in order.items" :key="item.id" class="dish-item-row">
                    <div class="dish-name-line">
                      <span class="text-weight-bold text-amber-9 q-mr-xs"
                        >{{ item.quantity }}x</span
                      >
                      <span>{{ item.snapshot_name }}</span>
                    </div>
                    <!-- Options -->
                    <div
                      v-if="item.options && getVisibleOptions(item.options).length > 0"
                      class="dish-options-line text-grey-7"
                    >
                      <span
                        v-for="opt in getVisibleOptions(item.options)"
                        :key="opt.id"
                        class="dish-opt-chip q-mr-xs"
                        :class="{
                          'dish-opt-chip--takeaway': isTakeawayOption(opt.snapshot_option_name),
                        }"
                      >
                        <q-icon
                          v-if="isTakeawayOption(opt.snapshot_option_name)"
                          name="shopping_bag"
                          size="11px"
                          class="q-mr-xs"
                        />
                        {{
                          isTakeawayOption(opt.snapshot_option_name)
                            ? opt.snapshot_option_name
                            : `+${opt.snapshot_option_name}`
                        }}
                      </span>
                    </div>
                    <div v-if="item.special_instruction" class="dish-special-note">
                      <q-icon name="edit_note" size="14px" class="q-mr-xs" />
                      <span>{{ item.special_instruction }}</span>
                    </div>
                  </div>
                </div>

                <!-- Action Button -->
                <div class="card-action-bar q-mt-sm">
                  <q-btn
                    unelevated
                    no-caps
                    class="full-width action-btn action-btn--prepared"
                    @click="advanceStatus(order.id, OrderStatus.PREPARED)"
                  >
                    <q-icon name="check_circle" size="16px" class="q-mr-xs" />
                    <span>เตรียมเสร็จแล้ว</span>
                  </q-btn>
                </div>
              </div>

              <div v-if="queueStore.preparingOrders.length === 0" class="empty-column-state">
                <q-icon name="restaurant" size="32px" color="grey-4" class="q-mb-xs" />
                <div>ไม่มีรายการที่กำลังเตรียม</div>
              </div>
            </div>
          </div>

          <!-- 3. PREPARED (เตรียมเสร็จแล้ว / พร้อมเสิร์ฟ) -->
          <div class="queue-column queue-column--prepared">
            <div class="queue-column-header bg-green-1 text-green-9">
              <div class="row items-center">
                <q-icon name="check_circle" size="18px" class="q-mr-xs text-green-7" />
                <span class="column-title">เตรียมเสร็จแล้ว</span>
              </div>
              <span class="column-count-badge bg-green-7 text-white">
                {{ queueStore.preparedOrders.length }}
              </span>
            </div>

            <div class="queue-column-body">
              <div
                v-for="order in queueStore.preparedOrders"
                :key="order.id"
                class="queue-card queue-card--prepared"
                :class="{
                  'queue-card--can-serve': queueStore.canServe(order),
                  'queue-card--blocked': !queueStore.canServe(order),
                }"
              >
                <!-- Card Header -->
                <div class="row items-center justify-between q-mb-xs">
                  <div class="row items-center q-gutter-x-xs">
                    <span class="queue-seq-number">{{
                      formatQueueNumber(order.queue_number)
                    }}</span>
                    <span
                      class="queue-table-badge"
                      :class="{
                        'queue-table-badge--takeaway': isTakeawayName(getTableName(order)),
                      }"
                    >
                      <q-icon
                        v-if="isTakeawayName(getTableName(order))"
                        name="shopping_bag"
                        size="12px"
                        class="q-mr-xs"
                      />
                      {{ getTableName(order) }}
                    </span>
                  </div>
                  <div class="elapsed-badge elapsed-badge--green">
                    <q-icon name="timer" size="13px" class="q-mr-xs" />
                    <span>{{ formatElapsed(order.prepared_at || order.created_at) }}</span>
                  </div>
                </div>

                <!-- Dishes List -->
                <div class="dishes-list q-my-sm">
                  <div v-for="item in order.items" :key="item.id" class="dish-item-row">
                    <div class="dish-name-line">
                      <span class="text-weight-bold text-green-8 q-mr-xs"
                        >{{ item.quantity }}x</span
                      >
                      <span>{{ item.snapshot_name }}</span>
                    </div>
                    <!-- Options -->
                    <div
                      v-if="item.options && getVisibleOptions(item.options).length > 0"
                      class="dish-options-line text-grey-7"
                    >
                      <span
                        v-for="opt in getVisibleOptions(item.options)"
                        :key="opt.id"
                        class="dish-opt-chip q-mr-xs"
                        :class="{
                          'dish-opt-chip--takeaway': isTakeawayOption(opt.snapshot_option_name),
                        }"
                      >
                        <q-icon
                          v-if="isTakeawayOption(opt.snapshot_option_name)"
                          name="shopping_bag"
                          size="11px"
                          class="q-mr-xs"
                        />
                        {{
                          isTakeawayOption(opt.snapshot_option_name)
                            ? opt.snapshot_option_name
                            : `+${opt.snapshot_option_name}`
                        }}
                      </span>
                    </div>
                    <div v-if="item.special_instruction" class="dish-special-note">
                      <q-icon name="edit_note" size="14px" class="q-mr-xs" />
                      <span>{{ item.special_instruction }}</span>
                    </div>
                  </div>
                </div>

                <!-- FIFO Block Notice if earlier order is not served yet -->
                <div v-if="!queueStore.canServe(order)" class="fifo-block-banner q-mb-sm">
                  <q-icon name="hourglass_top" size="14px" class="q-mr-xs" />
                  <span>รอเสิร์ฟตามลำดับคิวก่อนหน้า</span>
                </div>

                <!-- Action Button: Confirm Served -->
                <div class="card-action-bar q-mt-sm">
                  <q-btn
                    unelevated
                    no-caps
                    class="full-width action-btn"
                    :class="
                      queueStore.canServe(order)
                        ? 'action-btn--serve-ready'
                        : 'action-btn--serve-disabled'
                    "
                    :disable="!queueStore.canServe(order)"
                    @click="advanceStatus(order.id, OrderStatus.SERVED)"
                  >
                    <q-icon name="done_all" size="16px" class="q-mr-xs" />
                    <span>{{
                      queueStore.canServe(order) ? 'ยืนยันว่าเสิร์ฟครบแล้ว' : 'รอคิวก่อนหน้า'
                    }}</span>
                  </q-btn>
                </div>
              </div>

              <div v-if="queueStore.preparedOrders.length === 0" class="empty-column-state">
                <q-icon name="room_service" size="32px" color="grey-4" class="q-mb-xs" />
                <div>ไม่มีอาหารรอเสิร์ฟ</div>
              </div>
            </div>
          </div>

          <!-- 4. SERVED (เสิร์ฟครบแล้ว) -->
          <div class="queue-column queue-column--served">
            <div class="queue-column-header bg-grey-2 text-grey-8">
              <div class="row items-center">
                <q-icon name="done_all" size="18px" class="q-mr-xs text-grey-7" />
                <span class="column-title">เสิร์ฟแล้ว</span>
              </div>
              <span class="column-count-badge bg-grey-6 text-white">
                {{ queueStore.servedOrders.length }}
              </span>
            </div>

            <div class="queue-column-body">
              <div
                v-for="order in queueStore.servedOrders.slice(0, 20)"
                :key="order.id"
                class="queue-card queue-card--served"
              >
                <div class="row items-center justify-between">
                  <div class="row items-center">
                    <span class="queue-seq-number text-grey-7">
                      {{ formatQueueNumber(order.queue_number) }}
                    </span>
                    <span
                      class="queue-table-badge"
                      :class="[
                        isTakeawayName(getTableName(order))
                          ? 'queue-table-badge--takeaway'
                          : 'queue-table-badge--muted',
                        'q-ml-xs',
                      ]"
                    >
                      <q-icon
                        v-if="isTakeawayName(getTableName(order))"
                        name="shopping_bag"
                        size="12px"
                        class="q-mr-xs"
                      />
                      {{ getTableName(order) }}
                    </span>
                    <span class="text-caption text-grey-6 q-ml-sm">
                      ({{ order.items.length }} รายการ)
                    </span>
                  </div>
                  <span class="text-caption text-grey-5">
                    {{ formatTime(order.served_at || order.created_at) }}
                  </span>
                </div>
              </div>

              <div v-if="queueStore.servedOrders.length === 0" class="empty-column-state">
                <q-icon name="history" size="32px" color="grey-4" class="q-mb-xs" />
                <div>ยังไม่มีรายการที่เสิร์ฟวันนี้</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- VIEW 3: FRY STATION QUEUE MODE (มุมมองคิวของทอด / เตรียมวัตถุดิบทอด) -->
      <!-- ========================================================================= -->
      <div v-else-if="viewMode === 'fry'" class="fry-mode-container animate-fade-in">
        <!-- Station Banner / Top Controls -->
        <div class="fry-top-card q-pa-md q-mb-md">
          <div class="row items-center justify-between wrap q-gutter-md">
            <div class="row items-center">
              <div class="fry-hero-icon-box q-mr-md">
                <q-icon name="local_fire_department" size="32px" color="white" />
              </div>
              <div>
                <div class="row items-center q-gutter-xs">
                  <h6 class="q-my-none text-weight-bold fry-page-title">
                    เตาทอด & เตรียมของทอด (Fry Station)
                  </h6>
                  <q-badge color="deep-orange-9" rounded class="q-px-sm">
                    <span>รอทอด {{ pendingFryCount }} ชิ้น</span>
                  </q-badge>
                </div>
                <p class="text-caption text-grey-7 q-mb-none q-mt-xs">
                  รายการของทอดที่ต้องเตรียมจากออเดอร์ในครัว ติ๊กเพื่อจำสถานะทอดเสร็จแล้ว
                </p>
              </div>
            </div>

            <div class="row items-center q-gutter-sm">
              <q-btn
                v-if="completedFryItemIds.size > 0"
                outline
                dense
                no-caps
                color="grey-7"
                icon="refresh"
                label="ล้างที่ติ๊กเสร็จแล้ว"
                @click="clearCompletedFryItems"
                class="q-px-sm"
              />
              <q-btn
                unelevated
                no-caps
                color="deep-orange-8"
                icon="view_carousel"
                label="สลับไปโหมดโฟกัสทำอาหาร"
                class="text-weight-bold"
                @click="viewMode = 'focus'"
              />
            </div>
          </div>
        </div>

        <!-- 1. Live Fry Summary KPI Cards -->
        <div class="q-mb-md">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-weight-bold text-subtitle2 row items-center text-grey-9">
              <q-icon name="analytics" size="18px" color="deep-orange-8" class="q-mr-xs" />
              <span>สรุปรวมของทอดทั้งหมดที่ต้องเตรียม (Live Summary)</span>
            </div>
            <div class="text-caption text-grey-6">คำนวณจากทุกออเดอร์ที่ยังไม่เสิร์ฟในครัว</div>
          </div>

          <div v-if="frySummaryList.length > 0" class="fry-summary-grid">
            <div
              v-for="sum in frySummaryList"
              :key="sum.fryName"
              class="fry-summary-card"
              :class="{ 'fry-summary-card--all-done': sum.pendingQuantity === 0 }"
            >
              <div class="row items-center justify-between no-wrap">
                <span class="text-weight-bold text-body2 fry-sum-name ellipsis">{{
                  sum.fryName
                }}</span>
                <span
                  class="fry-sum-badge"
                  :class="
                    sum.pendingQuantity === 0 ? 'fry-sum-badge--done' : 'fry-sum-badge--pending'
                  "
                >
                  {{
                    sum.pendingQuantity === 0
                      ? 'ทอดครบแล้ว'
                      : `รอ ${sum.pendingQuantity} ${sum.unit}`
                  }}
                </span>
              </div>
              <div class="row items-baseline justify-between q-mt-xs">
                <div class="text-caption text-grey-6">
                  ยอดรวม: <strong>{{ sum.totalQuantity }}</strong> {{ sum.unit }}
                </div>
                <div class="text-caption text-green-7 text-weight-medium">
                  เสร็จแล้ว {{ sum.completedQuantity }}/{{ sum.totalQuantity }}
                </div>
              </div>
              <q-linear-progress
                :value="sum.totalQuantity > 0 ? sum.completedQuantity / sum.totalQuantity : 0"
                color="deep-orange-8"
                track-color="orange-1"
                class="q-mt-xs rounded-borders"
                size="4px"
              />
            </div>
          </div>

          <div v-else class="fry-summary-empty q-pa-md text-center">
            <q-icon name="check_circle" size="28px" color="green-6" class="q-mr-xs" />
            <span class="text-weight-medium text-grey-8"
              >ไม่มีรายการของทอดที่ต้องเตรียมในขณะนี้</span
            >
          </div>
        </div>

        <!-- 2. Filter Tabs for Orders -->
        <div class="row items-center justify-between q-mb-md">
          <div class="row items-center q-gutter-xs">
            <q-btn
              unelevated
              rounded
              dense
              no-caps
              size="sm"
              class="q-px-md filter-tab-btn"
              :class="{ 'filter-tab-btn--active': fryFilter === 'all' }"
              @click="fryFilter = 'all'"
            >
              ทั้งหมด ({{ allFryRequirements.length }})
            </q-btn>
            <q-btn
              unelevated
              rounded
              dense
              no-caps
              size="sm"
              class="q-px-md filter-tab-btn"
              :class="{ 'filter-tab-btn--active': fryFilter === 'pending' }"
              @click="fryFilter = 'pending'"
            >
              <q-badge color="deep-orange-8" rounded class="q-mr-xs" />
              รอทอด ({{ pendingFryRequirements.length }})
            </q-btn>
            <q-btn
              unelevated
              rounded
              dense
              no-caps
              size="sm"
              class="q-px-md filter-tab-btn"
              :class="{ 'filter-tab-btn--active': fryFilter === 'completed' }"
              @click="fryFilter = 'completed'"
            >
              <q-badge color="green-7" rounded class="q-mr-xs" />
              ทอดเสร็จแล้ว ({{ completedFryRequirements.length }})
            </q-btn>
          </div>
        </div>

        <!-- 3. Order-by-Order Fry Cards Grid -->
        <div v-if="groupedFryOrders.length > 0" class="fry-orders-grid">
          <div
            v-for="orderGroup in groupedFryOrders"
            :key="orderGroup.orderId"
            class="fry-order-card"
            :class="{ 'fry-order-card--all-done': orderGroup.allCompleted }"
          >
            <!-- Order Header -->
            <div class="row items-center justify-between q-pb-sm fry-order-header">
              <div class="row items-center q-gutter-xs">
                <span class="fry-order-queue-badge">
                  #{{ formatQueueNumber(orderGroup.queueNumber) }}
                </span>
                <span class="fry-order-table-title text-weight-bold">
                  {{ orderGroup.tableName }}
                </span>
                <span v-if="orderGroup.customerName" class="text-caption text-grey-7">
                  ({{ orderGroup.customerName }})
                </span>
              </div>

              <div class="row items-center q-gutter-xs">
                <span class="fry-order-time-badge">
                  {{ formatElapsed(orderGroup.queuedAt) }}
                </span>
                <q-btn
                  flat
                  dense
                  no-caps
                  size="sm"
                  :color="orderGroup.allCompleted ? 'grey-6' : 'deep-orange-9'"
                  :label="orderGroup.allCompleted ? 'ยกเลิกติ๊ก' : 'เสร็จทั้งหมด'"
                  @click="toggleOrderAllFryItems(orderGroup.orderId)"
                  class="fry-check-all-btn"
                />
              </div>
            </div>

            <!-- Items List -->
            <div class="fry-items-checklist q-mt-sm q-gutter-y-xs">
              <div
                v-for="req in orderGroup.items"
                :key="req.id"
                class="fry-item-row"
                :class="{ 'fry-item-row--done': completedFryItemIds.has(req.id) }"
                @click="toggleFryItem(req.id)"
              >
                <div class="row items-center justify-between no-wrap">
                  <div class="row items-center no-wrap col">
                    <q-checkbox
                      :model-value="completedFryItemIds.has(req.id)"
                      @update:model-value="toggleFryItem(req.id)"
                      color="deep-orange-8"
                      dense
                      class="q-mr-sm"
                      @click.stop
                    />
                    <div class="col ellipsis">
                      <div class="row items-center q-gutter-xs">
                        <span
                          class="text-weight-bold fry-item-name"
                          :class="{ 'text-strike text-grey-6': completedFryItemIds.has(req.id) }"
                        >
                          {{ req.fryName }}
                        </span>
                        <q-badge v-if="req.isSpecial" color="amber-9" rounded class="q-px-xs">
                          พิเศษ
                        </q-badge>
                        <q-badge v-if="req.isAddon" color="purple-7" rounded class="q-px-xs">
                          เพิ่ม
                        </q-badge>
                      </div>
                      <div class="text-caption text-grey-6 ellipsis q-mt-xs">
                        สำหรับ: {{ req.dishName }}
                        <span
                          v-if="req.specialInstruction"
                          class="text-deep-orange-9 text-weight-medium q-ml-xs"
                        >
                          ({{ req.specialInstruction }})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="fry-qty-box text-right q-ml-sm">
                    <span class="text-weight-bolder fry-qty-num">{{ req.quantity }}</span>
                    <span class="text-caption text-grey-6 q-ml-xs">{{ req.unit }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State for Orders -->
        <div v-else class="fry-all-empty-card text-center q-pa-xl">
          <div class="fry-empty-icon-wrap q-mx-auto q-mb-md">
            <q-icon name="local_fire_department" size="48px" color="deep-orange-5" />
          </div>
          <div class="text-weight-bold text-h6 text-grey-8">ไม่มีรายการของทอดที่ต้องเตรียม</div>
          <div class="text-caption text-grey-6 q-mt-xs">
            ออเดอร์ในครัวขณะนี้ไม่มีเมนูของทอด หรือของทอดทั้งหมดถูกเตรียมเรียบร้อยแล้ว
          </div>
        </div>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useQueueStore } from 'src/stores/queueStore';
import { useMenuStore } from 'src/stores/menuStore';
import { useNotify } from 'src/composables/useNotify';
import { fetchTodayOrders, advanceOrderStatus } from 'src/services/orderService';
import { supabase } from 'src/services/supabase';
import {
  formatQueueNumber,
  formatElapsed,
  formatTime,
  getVisibleOptions,
  isTakeawayOption,
} from 'src/utils/formatters';
import { isTakeawayName } from 'src/services/tableService';
import {
  extractFryRequirementsFromOrders,
  aggregateFrySummary,
  type FryRequirement,
  type FrySummaryItem,
} from 'src/utils/fryHelper';
import { OrderStatus } from 'src/types/enums';
import type { OrderWithItems } from 'src/types/database';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import {
  playNewOrderChime,
  playStatusDoneChime,
  isSoundEnabled,
  setSoundEnabled,
} from 'src/utils/audioService';
import type { RealtimeChannel } from '@supabase/supabase-js';

const queueStore = useQueueStore();
const menuStore = useMenuStore();
const { notifySuccess, notifyError, notifyWarning } = useNotify();

const isLoading = ref(true);
const viewMode = ref<'focus' | 'overview' | 'fry'>('focus');
const focusFilter = ref<'all' | 'queued' | 'preparing' | 'prepared'>('all');
const fryFilter = ref<'all' | 'pending' | 'completed'>('all');
const currentSlideId = ref<string>('');
const soundEnabled = ref<boolean>(isSoundEnabled());

function loadPersistedFryCompletedIds(): string[] {
  try {
    const raw = localStorage.getItem('demo_delivery_completed_fry_ids');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const completedFryItemIds = ref<Set<string>>(new Set(loadPersistedFryCompletedIds()));

let realtimeChannel: RealtimeChannel | null = null;
let elapsedInterval: ReturnType<typeof setInterval>;

// Active kitchen orders (QUEUED + PREPARING + PREPARED)
const activeKitchenOrders = computed(() => {
  return queueStore.orders
    .filter((o) => o.status === OrderStatus.QUEUED || o.status === OrderStatus.PREPARING)
    .sort((a, b) => a.queue_number - b.queue_number);
});

// Filtered list of orders in Focus View
const filteredFocusOrders = computed<OrderWithItems[]>(() => {
  if (focusFilter.value === 'queued') {
    return queueStore.queuedOrders;
  }
  if (focusFilter.value === 'preparing') {
    return queueStore.preparingOrders;
  }
  if (focusFilter.value === 'prepared') {
    return queueStore.preparedOrders;
  }
  // 'all': show queued + preparing, or prepared if no active cooking
  const active = queueStore.orders
    .filter((o) => o.status === OrderStatus.QUEUED || o.status === OrderStatus.PREPARING)
    .sort((a, b) => a.queue_number - b.queue_number);

  if (active.length === 0 && queueStore.preparedOrders.length > 0) {
    return queueStore.preparedOrders;
  }
  return active;
});

// Current slide index within the filtered list
const currentSlideIndex = computed(() => {
  const list = filteredFocusOrders.value;
  if (list.length === 0) return 0;
  const idx = list.findIndex((o) => o.id === currentSlideId.value);
  return idx >= 0 ? idx : 0;
});

// Automatically ensure currentSlideId points to a valid order in the filtered list
watch(
  filteredFocusOrders,
  (newList) => {
    if (newList.length > 0) {
      const exists = newList.some((o) => o.id === currentSlideId.value);
      if (!exists && newList[0]) {
        currentSlideId.value = newList[0].id;
      }
    } else {
      currentSlideId.value = '';
    }
  },
  { immediate: true },
);

function prevSlide() {
  const list = filteredFocusOrders.value;
  if (currentSlideIndex.value > 0) {
    const prev = list[currentSlideIndex.value - 1];
    if (prev) {
      currentSlideId.value = prev.id;
    }
  }
}

function nextSlide() {
  const list = filteredFocusOrders.value;
  if (currentSlideIndex.value < list.length - 1) {
    const next = list[currentSlideIndex.value + 1];
    if (next) {
      currentSlideId.value = next.id;
    }
  }
}

function jumpToOrder(orderId: string) {
  currentSlideId.value = orderId;
}

function setFocusFilter(filter: 'all' | 'queued' | 'preparing' | 'prepared') {
  focusFilter.value = filter;
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  setSoundEnabled(soundEnabled.value);
  if (soundEnabled.value) {
    playNewOrderChime();
    notifySuccess('เปิดเสียงแจ้งเตือนออเดอร์ใหม่แล้ว');
  } else {
    notifyWarning('ปิดเสียงแจ้งเตือนแล้ว');
  }
}

function getTableName(order: OrderWithItems): string {
  const rawName = order.table_session?.table?.name;
  const customerName = order.table_session?.customer_name;

  if (rawName) {
    if (isTakeawayName(rawName) && customerName) {
      return `สั่งกลับบ้าน (${customerName})`;
    }
    return rawName;
  }
  if (customerName) {
    return `สั่งกลับบ้าน (${customerName})`;
  }
  return 'หน้าร้าน / กลับบ้าน';
}

function getTotalDishesCount(order: OrderWithItems): number {
  return order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
}

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.QUEUED:
      return 'รอเริ่มเตรียมอาหาร';
    case OrderStatus.PREPARING:
      return 'กำลังปรุงอาหาร';
    case OrderStatus.PREPARED:
      return 'เตรียมเสร็จแล้ว (พร้อมเสิร์ฟ)';
    case OrderStatus.SERVED:
      return 'เสิร์ฟครบแล้ว';
    default:
      return status;
  }
}

function getStatusIcon(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.QUEUED:
      return 'schedule';
    case OrderStatus.PREPARING:
      return 'soup_kitchen';
    case OrderStatus.PREPARED:
      return 'check_circle';
    case OrderStatus.SERVED:
      return 'done_all';
    default:
      return 'info';
  }
}

function getTimerColorClass(createdAtStr: string): string {
  const diffMin = Math.floor(Math.max(0, Date.now() - new Date(createdAtStr).getTime()) / 60000);
  if (diffMin >= 15) return 'chef-timer-pill--danger';
  if (diffMin >= 8) return 'chef-timer-pill--warning';
  return 'chef-timer-pill--normal';
}

// Fry Station Computeds & Handlers
const menuItemsMap = computed(() => new Map(menuStore.items.map((i) => [i.id, i])));

const allFryRequirements = computed<FryRequirement[]>(() => {
  return extractFryRequirementsFromOrders(queueStore.orders, menuItemsMap.value);
});

const pendingFryRequirements = computed(() =>
  allFryRequirements.value.filter((r) => !completedFryItemIds.value.has(r.id)),
);

const completedFryRequirements = computed(() =>
  allFryRequirements.value.filter((r) => completedFryItemIds.value.has(r.id)),
);

const pendingFryCount = computed(() =>
  pendingFryRequirements.value.reduce((sum, r) => sum + r.quantity, 0),
);

const frySummaryList = computed<FrySummaryItem[]>(() => {
  return aggregateFrySummary(allFryRequirements.value, completedFryItemIds.value);
});

const groupedFryOrders = computed(() => {
  const list =
    fryFilter.value === 'pending'
      ? pendingFryRequirements.value
      : fryFilter.value === 'completed'
        ? completedFryRequirements.value
        : allFryRequirements.value;

  const map = new Map<
    string,
    {
      orderId: string;
      queueNumber: number;
      tableName: string;
      customerName?: string | null | undefined;
      orderStatus: string;
      queuedAt: string;
      items: FryRequirement[];
      allCompleted: boolean;
    }
  >();

  for (const req of list) {
    if (!map.has(req.orderId)) {
      map.set(req.orderId, {
        orderId: req.orderId,
        queueNumber: req.queueNumber,
        tableName: req.tableName,
        customerName: req.customerName,
        orderStatus: req.orderStatus,
        queuedAt: req.queuedAt,
        items: [],
        allCompleted: true,
      });
    }
    const group = map.get(req.orderId)!;
    group.items.push(req);
    if (!completedFryItemIds.value.has(req.id)) {
      group.allCompleted = false;
    }
  }

  return Array.from(map.values()).sort((a, b) => a.queueNumber - b.queueNumber);
});

function persistFryCompletedIds() {
  try {
    localStorage.setItem(
      'demo_delivery_completed_fry_ids',
      JSON.stringify([...completedFryItemIds.value]),
    );
  } catch (e) {
    console.error('Failed to save fry completed ids:', e);
  }
}

function toggleFryItem(reqId: string) {
  if (completedFryItemIds.value.has(reqId)) {
    completedFryItemIds.value.delete(reqId);
  } else {
    completedFryItemIds.value.add(reqId);
  }
  completedFryItemIds.value = new Set(completedFryItemIds.value);
  persistFryCompletedIds();
}

function toggleOrderAllFryItems(orderId: string) {
  const orderReqs = allFryRequirements.value.filter((r) => r.orderId === orderId);
  const allDone = orderReqs.every((r) => completedFryItemIds.value.has(r.id));
  for (const req of orderReqs) {
    if (allDone) {
      completedFryItemIds.value.delete(req.id);
    } else {
      completedFryItemIds.value.add(req.id);
    }
  }
  completedFryItemIds.value = new Set(completedFryItemIds.value);
  persistFryCompletedIds();
}

function clearCompletedFryItems() {
  completedFryItemIds.value = new Set();
  persistFryCompletedIds();
  notifySuccess('ล้างรายการที่ติ๊กเสร็จแล้วเรียบร้อย');
}

// Keyboard shortcuts for kitchen navigation (Left/Right to slide)
function handleKeydown(e: KeyboardEvent) {
  if (viewMode.value !== 'focus') return;
  if (e.key === 'ArrowLeft') {
    prevSlide();
  } else if (e.key === 'ArrowRight') {
    nextSlide();
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);
  void menuStore.loadMenu();

  try {
    const orders = await fetchTodayOrders();
    queueStore.setOrders(orders);

    // Default to focus view if active orders exist, otherwise overview
    if (orders.some((o) => o.status === OrderStatus.QUEUED || o.status === OrderStatus.PREPARING)) {
      viewMode.value = 'focus';
    }
  } finally {
    isLoading.value = false;
  }

  realtimeChannel = supabase
    .channel('orders:kitchen_queue')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
      },
      (payload) => {
        void (async () => {
          const orders = await fetchTodayOrders();
          queueStore.setOrders(orders);

          if (payload.eventType === 'INSERT') {
            playNewOrderChime();
            notifyWarning('🔔 มีออเดอร์ใหม่เข้ามา!');
            // Auto switch to focus view and highlight the newest order
            const newOrder = payload.new as { id?: string };
            if (newOrder.id) {
              currentSlideId.value = newOrder.id;
            }
            viewMode.value = 'focus';
          }
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as { revision?: number; status?: OrderStatus };
            if (newData.revision && newData.revision > 1) {
              playNewOrderChime();
              notifyWarning('⚠️ ลูกค้ามีการแก้ไขรายการอาหาร');
            }
            if (newData.status === OrderStatus.PREPARED) {
              playStatusDoneChime();
            }
          }
        })();
      },
    )
    .subscribe();

  elapsedInterval = setInterval(() => {
    queueStore.setOrders([...queueStore.orders]);
  }, 30000);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  if (realtimeChannel) {
    void supabase.removeChannel(realtimeChannel);
  }
  clearInterval(elapsedInterval);
});

async function advanceStatus(orderId: string, newStatus: OrderStatus) {
  try {
    await advanceOrderStatus(orderId, newStatus);
    const labelMap: Record<string, string> = {
      [OrderStatus.PREPARING]: 'เริ่มเตรียมอาหารแล้ว 🔥',
      [OrderStatus.PREPARED]: 'เตรียมเสร็จเรียบร้อย ✅',
      [OrderStatus.SERVED]: 'ยืนยันการเสิร์ฟสำเร็จ 🍽️',
    };
    notifySuccess(labelMap[newStatus] || 'อัปเดตสถานะสำเร็จ');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะได้';
    notifyError(msg);
  }
}

async function advanceStatusAndProceed(orderId: string, newStatus: OrderStatus) {
  await advanceStatus(orderId, newStatus);

  // If we just marked it prepared or served, smooth slide to the next pending order
  if (newStatus === OrderStatus.PREPARED || newStatus === OrderStatus.SERVED) {
    playStatusDoneChime();
    const remaining = filteredFocusOrders.value.filter((o) => o.id !== orderId);
    if (remaining.length > 0 && remaining[0]) {
      currentSlideId.value = remaining[0].id;
    }
  }
}
</script>

<style scoped>
.queue-page {
  background: var(--color-background);
  min-height: 100vh;
}

.page-title {
  color: var(--color-text-primary);
  line-height: 1.2;
}

/* ─── Top Controls & Stats ─────────────────────────────── */
.view-toggle-group {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 3px;
}

.view-toggle-btn {
  font-size: 0.88rem;
  padding: 6px 14px;
  border-radius: var(--radius-xs);
  transition: all 0.2s ease;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.82rem;
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  background: #ffffff;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.15s ease;
}

.stat-chip:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-subtle);
}

.stat-chip--queued {
  background: #f0f9ff;
  border-color: #bae6fd;
  color: #0369a1;
}

.stat-chip--preparing {
  background: #fffbeb;
  border-color: #fde68a;
  color: #b45309;
}

.stat-chip--prepared {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}

.stat-chip--served {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #475569;
}

/* ─── VIEW 1: FOCUS MODE (Large Chef Slider) ───────────── */
.focus-mode-container {
  max-width: 960px;
  margin: 0 auto;
}

.focus-control-bar {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 16px;
  box-shadow: var(--shadow-subtle);
}

.filter-tab-btn {
  background: #f1f5f9;
  color: var(--color-text-secondary);
  font-weight: 500;
  transition: all 0.18s ease;
}

.filter-tab-btn--active {
  background: var(--color-primary);
  color: #ffffff;
}

.slide-counter-label {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
}

.slider-arrow-btn {
  background: #f1f5f9;
  color: var(--color-text-primary);
  font-weight: bold;
}

.slider-arrow-btn:not([disabled]):hover {
  background: var(--color-primary);
  color: #ffffff;
}

.overview-back-btn {
  border-color: var(--color-border);
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

.overview-back-btn:hover {
  background: #f8fafc;
  color: var(--color-text-primary);
}

/* Chef Large Card */
.chef-large-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 2px solid var(--color-border);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.25s ease;
}

.chef-large-card--queued {
  border-color: #38bdf8;
  border-top: 6px solid var(--color-status-queued);
}

.chef-large-card--preparing {
  border-color: #fbbf24;
  border-top: 6px solid var(--color-status-preparing);
  background: #fffdfa;
}

.chef-large-card--prepared {
  border-color: #4ade80;
  border-top: 6px solid var(--color-status-prepared);
  background: #f0fdf4;
}

/* Chef Card Header */
.chef-card-header {
  padding: 18px 24px;
  background: #ffffff;
  border-bottom: 1px solid var(--color-border-subtle);
}

.chef-queue-badge {
  display: flex;
  align-items: baseline;
  background: var(--color-text-primary);
  color: #ffffff;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.chef-queue-label {
  font-size: 0.8rem;
  font-weight: 500;
  opacity: 0.85;
  margin-right: 6px;
}

.chef-queue-number {
  font-size: 1.85rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.05em;
}

.chef-table-badge {
  display: inline-flex;
  align-items: center;
  background: var(--color-primary-soft);
  border: 1.5px solid var(--color-primary-tint);
  padding: 6px 14px;
  border-radius: var(--radius-sm);
}

.chef-table-badge--takeaway {
  background: #ffedd5;
  border: 1.5px solid #fed7aa;
}

.chef-table-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
}

.chef-status-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
}

.chef-status-pill--queued {
  background: #e0f2fe;
  color: #0284c7;
}

.chef-status-pill--preparing {
  background: #fef3c7;
  color: #d97706;
}

.chef-status-pill--prepared {
  background: #dcfce7;
  color: #16a34a;
}

.chef-timer-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
}

.chef-timer-pill--normal {
  background: #f8fafc;
  color: var(--color-text-secondary);
}

.chef-timer-pill--warning {
  background: #fffbeb;
  border-color: #fde68a;
  color: #b45309;
  font-weight: 700;
}

.chef-timer-pill--danger {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
  font-weight: 800;
  animation: pulse-danger 2s infinite;
}

.chef-revision-alert {
  background: #fef3c7;
  border: 1px solid #fde68a;
  color: #92400e;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  font-size: 0.92rem;
}

/* Chef Card Body */
.chef-card-body {
  padding: 20px 24px;
  min-height: 220px;
}

.chef-dishes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  margin-bottom: 14px;
  border-bottom: 2px dashed var(--color-border);
}

.chef-dishes-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.chef-dishes-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.chef-dish-row {
  background: #fbf9f6;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  transition: background 0.15s ease;
}

.chef-dish-row:hover {
  background: #f5efe9;
}

.chef-dish-qty-box {
  background: var(--color-primary);
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 800;
  min-width: 52px;
  height: 52px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(224, 88, 54, 0.28);
}

.chef-dish-name {
  font-size: 1.32rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.25;
}

.chef-options-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chef-option-chip {
  background: #ffffff;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
}

.chef-option-chip--takeaway {
  background: #ffedd5;
  border: 1.5px solid #fed7aa;
  color: #ea580c;
  font-weight: 700;
}

.chef-special-note {
  background: #fef2f2;
  border: 1px solid #fee2e2;
  color: #b91c1c;
  font-size: 0.92rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-xs);
  display: inline-flex;
  align-items: center;
}

/* Chef Card Footer & Large Action Buttons */
.chef-card-footer {
  padding: 18px 24px;
  background: #fbf9f6;
  border-top: 1px solid var(--color-border);
}

.chef-main-btn {
  height: 56px;
  font-size: 1.15rem;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.chef-main-btn:hover {
  transform: translateY(-2px);
}

.chef-main-btn--start {
  background: linear-gradient(135deg, #e05836 0%, #c84323 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 16px rgba(224, 88, 54, 0.35);
}

.chef-main-btn--done {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 16px rgba(217, 119, 6, 0.35);
}

.chef-main-btn--serve {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 16px rgba(22, 163, 74, 0.35);
}

.chef-main-btn--disabled {
  background: #cbd5e1 !important;
  color: #64748b !important;
}

.chef-secondary-btn {
  height: 56px;
  font-size: 0.98rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  background: #ffffff;
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}

.chef-secondary-btn:hover {
  background: #f1f5f9;
  color: var(--color-text-primary);
}

/* Bottom Mini Thumbnails Strip */
.focus-thumbnails-strip {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  box-shadow: var(--shadow-subtle);
}

.thumbnails-scroll-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.mini-order-chip {
  flex: 0 0 auto;
  min-width: 110px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: #f8fafc;
  border: 2px solid var(--color-border);
  cursor: pointer;
  text-align: center;
  transition: all 0.18s ease;
}

.mini-order-chip:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary-tint);
}

.mini-order-chip--active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  box-shadow: 0 2px 8px rgba(224, 88, 54, 0.2);
}

.mini-chip-seq {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--color-text-primary);
}

.mini-chip-table {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-top: 1px;
}

.mini-chip-count {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.focus-empty-card {
  background: #ffffff;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: 60px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* ─── VIEW 2: OVERVIEW MODE (Kanban Columns) ───────────── */
.overview-focus-banner {
  background: linear-gradient(135deg, #fff3ed 0%, #ffe6dc 100%);
  border: 1px solid var(--color-primary-tint);
  border-radius: var(--radius-md);
  padding: 12px 18px;
  box-shadow: var(--shadow-subtle);
}

.queue-kanban-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  align-items: start;
}

@media (max-width: 1100px) {
  .queue-kanban-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

@media (max-width: 650px) {
  .queue-kanban-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.queue-column {
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-subtle);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.queue-column-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
}

.column-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.column-count-badge {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
}

.queue-column-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 400px;
  max-height: calc(100vh - 210px);
  overflow-y: auto;
}

/* Kanban Cards */
.queue-card {
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px;
  box-shadow: var(--shadow-subtle);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.queue-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-card);
}

.queue-card--queued {
  border-left: 4px solid var(--color-status-queued);
}

.queue-card--preparing {
  border-left: 4px solid var(--color-status-preparing);
  background: #fffdfa;
}

.queue-card--prepared {
  border-left: 4px solid var(--color-status-prepared);
}

.queue-card--can-serve {
  background: #f0fdf4;
  border-color: #86efac;
}

.queue-card--blocked {
  opacity: 0.82;
}

.queue-card--served {
  padding: 10px 12px;
  opacity: 0.75;
  background: #fafafa;
}

.queue-seq-number {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-text-primary);
  line-height: 1;
}

.queue-table-badge {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  display: inline-flex;
  align-items: center;
}

.queue-table-badge--takeaway {
  background: #ffedd5;
  color: #ea580c;
  border: 1px solid #fed7aa;
}

.queue-table-badge--muted {
  background: #e2e8f0;
  color: #64748b;
}

.dish-opt-chip {
  display: inline-flex;
  align-items: center;
}

.dish-opt-chip--takeaway {
  color: #ea580c;
  font-weight: 700;
  background: #ffedd5;
  padding: 1px 4px;
  border-radius: 3px;
}

.elapsed-badge {
  display: inline-flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.elapsed-badge--amber {
  color: var(--color-status-preparing);
  border-color: #fde68a;
  background: #fffbeb;
}

.elapsed-badge--green {
  color: var(--color-status-prepared);
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.revision-banner {
  display: flex;
  align-items: center;
  background: #fef3c7;
  color: #b45309;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: var(--radius-xs);
}

.fifo-block-banner {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.76rem;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: var(--radius-xs);
}

.dish-item-row {
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 4px;
}

.dish-name-line {
  color: var(--color-text-primary);
}

.dish-options-line {
  font-size: 0.76rem;
  padding-left: 18px;
}

.dish-special-note {
  font-size: 0.78rem;
  color: #dc2626;
  font-weight: 600;
  display: flex;
  align-items: center;
  margin-top: 1px;
}

.action-btn {
  height: 38px;
  font-size: 0.88rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.action-btn--preparing {
  background: var(--color-primary);
  color: #ffffff;
}

.action-btn--prepared {
  background: var(--color-status-preparing);
  color: #ffffff;
}

.action-btn--serve-ready {
  background: var(--color-status-prepared);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
}

.action-btn--serve-disabled {
  background: #e2e8f0;
  color: #94a3b8;
}

.empty-column-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  color: var(--color-text-muted);
  font-size: 0.88rem;
  text-align: center;
}

.animate-spin-slow {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes pulse-danger {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.65;
  }
}

/* ========================================================================= */
/* Fry Station Styles */
/* ========================================================================= */
.stat-chip--fry {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #c2410c;
}

.stat-chip--fry:hover {
  background: #ffedd5;
}

.fry-mode-container {
  max-width: 1300px;
  margin: 0 auto;
}

.fry-top-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.fry-hero-icon-box {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);
}

.fry-page-title {
  color: var(--color-text-primary);
  line-height: 1.2;
}

/* Fry Summary Grid */
.fry-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.fry-summary-card {
  background: #ffffff;
  border: 1.5px solid #fed7aa;
  border-radius: var(--radius-md);
  padding: 14px;
  box-shadow: var(--shadow-subtle);
  transition: all 0.2s ease;
}

.fry-summary-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.fry-summary-card--all-done {
  border-color: #bbf7d0;
  background: #f0fdf4;
  opacity: 0.85;
}

.fry-sum-name {
  color: var(--color-text-primary);
  font-size: 0.95rem;
}

.fry-sum-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.fry-sum-badge--pending {
  background: #ffedd5;
  color: #c2410c;
}

.fry-sum-badge--done {
  background: #dcfce7;
  color: #15803d;
}

.fry-summary-empty {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Fry Orders Grid */
.fry-orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.fry-order-card {
  background: #ffffff;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: var(--shadow-card);
  transition: all 0.2s ease;
}

.fry-order-card--all-done {
  border-color: #86efac;
  background: #f8fafc;
  opacity: 0.8;
}

.fry-order-header {
  border-bottom: 1px solid var(--color-border);
}

.fry-order-queue-badge {
  background: #ffedd5;
  color: #c2410c;
  font-weight: 800;
  font-size: 0.82rem;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.fry-order-table-title {
  font-size: 1rem;
  color: var(--color-text-primary);
}

.fry-order-time-badge {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.fry-check-all-btn {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 1px 6px;
}

.fry-item-row {
  background: #f8fafc;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.fry-item-row:hover {
  background: #fff7ed;
  border-color: #fdba74;
}

.fry-item-row--done {
  background: #f0fdf4 !important;
  border-color: #bbf7d0 !important;
  opacity: 0.75;
}

.fry-item-name {
  font-size: 0.95rem;
  color: var(--color-text-primary);
}

.fry-qty-box {
  flex-shrink: 0;
}

.fry-qty-num {
  font-size: 1.15rem;
  color: #ea580c;
}

.fry-all-empty-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1.5px dashed var(--color-border);
  box-shadow: var(--shadow-subtle);
}

.fry-empty-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #ffedd5;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
