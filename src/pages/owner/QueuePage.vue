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
            <!-- Sound Controls & Volume Menu -->
            <q-btn
              flat
              dense
              round
              :icon="
                !soundEnabled
                  ? 'volume_off'
                  : soundVolume === 0
                    ? 'volume_mute'
                    : soundVolume <= 50
                      ? 'volume_down'
                      : 'volume_up'
              "
              :color="soundEnabled && soundVolume > 0 ? 'primary' : 'grey-6'"
            >
              <q-tooltip>
                {{
                  soundEnabled
                    ? `เสียงเตือนออเดอร์ (ความดัง ${soundVolume}%)`
                    : 'ปิดเสียงเตือน (คลิกเพื่อตั้งค่า)'
                }}
              </q-tooltip>

              <q-menu
                anchor="bottom right"
                self="top right"
                class="q-pa-md shadow-4"
                style="min-width: 320px; max-width: 360px; border-radius: 14px"
              >
                <div class="column q-gutter-y-sm">
                  <!-- Header with Switch -->
                  <div class="row items-center justify-between">
                    <div class="row items-center q-gutter-x-xs">
                      <q-icon
                        :name="soundEnabled ? 'notifications_active' : 'notifications_off'"
                        :color="soundEnabled ? 'primary' : 'grey-6'"
                        size="20px"
                      />
                      <span class="text-weight-bold text-subtitle2">เสียงเตือนออเดอร์</span>
                    </div>
                    <q-toggle
                      v-model="soundEnabled"
                      color="primary"
                      dense
                      @update:model-value="onSoundToggle"
                    />
                  </div>

                  <q-separator class="q-my-xs" />

                  <!-- Sound Type Selector -->
                  <div class="column q-gutter-y-xs" :class="{ 'text-grey-5': !soundEnabled }">
                    <span class="text-caption text-weight-medium">ประเภทเสียงแจ้งเตือน</span>
                    <div class="row q-gutter-xs">
                      <q-btn
                        size="xs"
                        :outline="soundType !== 'voice'"
                        :unelevated="soundType === 'voice'"
                        dense
                        :disable="!soundEnabled"
                        :color="soundType === 'voice' ? 'primary' : 'grey-7'"
                        label="🗣️ เสียงพูด"
                        class="col q-py-xs text-weight-bold"
                        @click="onSoundTypeChange('voice')"
                      >
                        <q-tooltip>เสียงคนพูดแจ้งเตือน</q-tooltip>
                      </q-btn>
                      <q-btn
                        size="xs"
                        :outline="soundType !== 'chime'"
                        :unelevated="soundType === 'chime'"
                        dense
                        :disable="!soundEnabled"
                        :color="soundType === 'chime' ? 'primary' : 'grey-7'"
                        label="🔔 กระดิ่ง"
                        class="col q-py-xs text-weight-bold"
                        @click="onSoundTypeChange('chime')"
                      >
                        <q-tooltip>เสียงกระดิ่งใสๆ กังวาน</q-tooltip>
                      </q-btn>
                      <q-btn
                        size="xs"
                        :outline="soundType !== 'both'"
                        :unelevated="soundType === 'both'"
                        dense
                        :disable="!soundEnabled"
                        :color="soundType === 'both' ? 'primary' : 'grey-7'"
                        label="🔔+🗣️ คู่"
                        class="col q-py-xs text-weight-bold"
                        @click="onSoundTypeChange('both')"
                      >
                        <q-tooltip>เสียงกระดิ่ง + เสียงพูด</q-tooltip>
                      </q-btn>
                    </div>
                  </div>

                  <!-- Voice Pattern Selection (Shown when voice or both is active) -->
                  <template v-if="soundType === 'voice' || soundType === 'both'">
                    <q-separator class="q-my-xs" />

                    <div class="column q-gutter-y-xs" :class="{ 'text-grey-5': !soundEnabled }">
                      <div class="row items-center justify-between">
                        <span class="text-caption text-weight-medium">ข้อความเสียงพูด</span>
                        <span
                          class="text-caption text-primary text-weight-bold ellipsis"
                          style="max-width: 150px"
                        >
                          {{ previewVoiceSample }}
                        </span>
                      </div>

                      <q-select
                        v-model="voicePattern"
                        :options="VOICE_PATTERN_OPTIONS"
                        emit-value
                        map-options
                        dense
                        outlined
                        options-dense
                        :disable="!soundEnabled"
                        class="full-width"
                        @update:model-value="onVoicePatternChange"
                      >
                        <template #option="scope">
                          <q-item v-bind="scope.itemProps" class="q-py-xs">
                            <q-item-section>
                              <q-item-label class="text-weight-bold text-caption">
                                {{ scope.opt.label }}
                              </q-item-label>
                              <q-item-label caption class="text-grey-7">
                                ตัวอย่าง: "{{ scope.opt.example }}"
                              </q-item-label>
                            </q-item-section>
                          </q-item>
                        </template>
                      </q-select>

                      <!-- Custom Voice Text Input -->
                      <div v-if="voicePattern === 'custom'" class="q-mt-xs">
                        <q-input
                          v-model="customVoiceText"
                          outlined
                          dense
                          placeholder="พิมพ์ข้อความที่ต้องการให้พูด..."
                          :disable="!soundEnabled"
                          @update:model-value="onCustomVoiceTextChange"
                        >
                          <template #append>
                            <q-btn
                              flat
                              round
                              dense
                              icon="play_arrow"
                              color="primary"
                              size="sm"
                              @click="testSound"
                            >
                              <q-tooltip>ลองฟังเสียง</q-tooltip>
                            </q-btn>
                          </template>
                        </q-input>
                      </div>

                      <!-- Speech Speed Selector -->
                      <div class="row items-center justify-between q-mt-xs">
                        <span class="text-caption text-grey-7">ความเร็วเสียงพูด:</span>
                        <div class="row q-gutter-xs">
                          <q-btn
                            size="xs"
                            :outline="voiceSpeed !== 0.85"
                            :unelevated="voiceSpeed === 0.85"
                            dense
                            :disable="!soundEnabled"
                            :color="voiceSpeed === 0.85 ? 'primary' : 'grey-6'"
                            label="0.85x ช้า"
                            class="q-px-xs"
                            @click="onVoiceSpeedChange(0.85)"
                          />
                          <q-btn
                            size="xs"
                            :outline="voiceSpeed !== 1.0"
                            :unelevated="voiceSpeed === 1.0"
                            dense
                            :disable="!soundEnabled"
                            :color="voiceSpeed === 1.0 ? 'primary' : 'grey-6'"
                            label="1.0x ปกติ"
                            class="q-px-xs"
                            @click="onVoiceSpeedChange(1.0)"
                          />
                          <q-btn
                            size="xs"
                            :outline="voiceSpeed !== 1.2"
                            :unelevated="voiceSpeed === 1.2"
                            dense
                            :disable="!soundEnabled"
                            :color="voiceSpeed === 1.2 ? 'primary' : 'grey-6'"
                            label="1.2x เร็ว"
                            class="q-px-xs"
                            @click="onVoiceSpeedChange(1.2)"
                          />
                        </div>
                      </div>
                    </div>
                  </template>

                  <q-separator class="q-my-xs" />

                  <!-- Volume Slider Section -->
                  <div class="column q-gutter-y-xs" :class="{ 'text-grey-5': !soundEnabled }">
                    <div class="row items-center justify-between text-caption">
                      <span class="text-weight-medium">ระดับความดัง</span>
                      <span class="text-weight-bold text-primary">{{
                        soundEnabled ? soundVolume + '%' : 'ปิด'
                      }}</span>
                    </div>

                    <div class="row items-center q-gutter-x-sm no-wrap">
                      <q-icon
                        name="volume_mute"
                        size="18px"
                        :color="soundEnabled ? 'grey-7' : 'grey-5'"
                      />
                      <q-slider
                        v-model="soundVolume"
                        :min="0"
                        :max="100"
                        :step="5"
                        :disable="!soundEnabled"
                        color="primary"
                        class="col"
                        @change="onVolumeChange"
                      />
                      <q-icon
                        name="volume_up"
                        size="18px"
                        :color="soundEnabled ? 'grey-7' : 'grey-5'"
                      />
                    </div>

                    <!-- Volume Presets -->
                    <div class="row q-gutter-xs justify-between q-mt-xs">
                      <q-btn
                        size="xs"
                        outline
                        dense
                        :disable="!soundEnabled"
                        :color="soundVolume === 50 ? 'primary' : 'grey-6'"
                        label="50%"
                        class="q-px-sm"
                        @click="setPresetVolume(50)"
                      />
                      <q-btn
                        size="xs"
                        outline
                        dense
                        :disable="!soundEnabled"
                        :color="soundVolume === 80 ? 'primary' : 'grey-6'"
                        label="80%"
                        class="q-px-sm"
                        @click="setPresetVolume(80)"
                      />
                      <q-btn
                        size="xs"
                        outline
                        dense
                        :disable="!soundEnabled"
                        :color="soundVolume === 100 ? 'primary' : 'grey-6'"
                        label="100% (ดังสุด)"
                        class="q-px-sm"
                        @click="setPresetVolume(100)"
                      />
                    </div>
                  </div>

                  <q-separator class="q-my-xs" />

                  <!-- Test Sound Button -->
                  <q-btn
                    unelevated
                    no-caps
                    size="sm"
                    color="primary"
                    :icon="soundType === 'voice' ? 'record_voice_over' : 'volume_up'"
                    :label="testButtonLabel"
                    class="full-width text-weight-bold"
                    :disable="!soundEnabled"
                    @click="testSound"
                  />
                </div>
              </q-menu>
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

              <q-btn
                no-caps
                :unelevated="viewMode === 'rice'"
                :flat="viewMode !== 'rice'"
                :color="viewMode === 'rice' ? 'amber-9' : 'grey-3'"
                :text-color="viewMode === 'rice' ? 'white' : 'grey-8'"
                class="view-toggle-btn"
                @click="viewMode = 'rice'"
              >
                <q-icon name="rice_bowl" size="18px" class="q-mr-xs" />
                <span class="text-weight-bold">คิวตักข้าว</span>
                <q-badge v-if="pendingRiceCount > 0" color="amber-9" floating rounded>
                  {{ pendingRiceCount }}
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
              >รอรับ: <strong>{{ queueStore.queuedOrders.length }}</strong></span
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
              >กำลังทำ: <strong>{{ queueStore.preparingOrders.length }}</strong></span
            >
          </div>
          <div
            v-if="queueStore.preparedOrders.length > 0"
            class="stat-chip stat-chip--prepared"
            @click="
              focusFilter = 'prepared';
              viewMode = 'focus';
            "
          >
            <q-icon name="check_circle" size="16px" class="q-mr-xs text-green-7" />
            <span
              >พร้อมส่ง: <strong>{{ queueStore.preparedOrders.length }}</strong></span
            >
          </div>
          <div class="stat-chip stat-chip--fry" @click="viewMode = 'fry'">
            <q-icon name="local_fire_department" size="16px" class="q-mr-xs text-deep-orange-8" />
            <span
              >ของทอดรอทำ: <strong>{{ pendingFryCount }}</strong> ออเดอร์</span
            >
          </div>
          <div class="stat-chip stat-chip--rice" @click="viewMode = 'rice'">
            <q-icon name="rice_bowl" size="16px" class="q-mr-xs text-amber-9" />
            <span
              >ข้าวรอตัก: <strong>{{ pendingRiceCount }}</strong> จาน</span
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
      <!-- VIEW 1: FOCUS COOK SLIP MODE (มุมมองโฟกัสทำอาหาร แสดงครั้งละสูงสุด 3 ออเดอร์ สไตล์สลิป) -->
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
                รอรับออเดอร์ ({{ queueStore.queuedOrders.length }})
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
                กำลังทำ ({{ queueStore.preparingOrders.length }})
              </q-btn>
              <q-btn
                v-if="queueStore.preparedOrders.length > 0"
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
                พร้อมส่ง ({{ queueStore.preparedOrders.length }})
              </q-btn>
            </div>

            <!-- Slide Navigation Counter & Arrow Controls -->
            <div v-if="filteredFocusOrders.length > 0" class="row items-center q-gutter-sm">
              <span class="slide-counter-label">
                หน้า <strong>{{ focusPage + 1 }}</strong> / <strong>{{ totalFocusPages }}</strong>
                <span class="text-caption text-grey-6 q-ml-xs"
                  >({{ getPageRangeText(focusPage) }})</span
                >
              </span>

              <q-btn
                round
                dense
                unelevated
                icon="chevron_left"
                class="slider-arrow-btn"
                :disable="focusPage === 0"
                @click="prevPage"
              >
                <q-tooltip>หน้าก่อนหน้า (ลูกศรซ้าย)</q-tooltip>
              </q-btn>

              <q-btn
                round
                dense
                unelevated
                icon="chevron_right"
                class="slider-arrow-btn"
                :disable="focusPage >= totalFocusPages - 1"
                @click="nextPage"
              >
                <q-tooltip>หน้าถัดไป (ลูกศรขวา)</q-tooltip>
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

        <!-- Main Dynamic Kitchen Slips Carousel (1-3 orders per page) -->
        <div v-else class="focus-slider-wrapper">
          <q-carousel
            v-model="focusPage"
            swipeable
            animated
            transition-prev="slide-right"
            transition-next="slide-left"
            height="auto"
            class="focus-carousel bg-transparent"
          >
            <q-carousel-slide
              v-for="(pageOrders, pageIdx) in focusPages"
              :key="pageIdx"
              :name="pageIdx"
              class="q-pa-none"
            >
              <div
                class="kitchen-slips-container"
                :class="`kitchen-slips-container--count-${pageOrders.length}`"
              >
                <div
                  v-for="order in pageOrders"
                  :key="order.id"
                  class="kitchen-slip"
                  :class="{
                    'kitchen-slip--queued': order.status === OrderStatus.QUEUED,
                    'kitchen-slip--preparing': order.status === OrderStatus.PREPARING,
                    'kitchen-slip--prepared': order.status === OrderStatus.PREPARED,
                  }"
                >
                  <!-- Slip Top Perforation Edge -->
                  <div class="slip-ticket-edge slip-ticket-edge--top"></div>

                  <!-- Slip Header: Queue Number, Table, Status, Elapsed Time -->
                  <div class="slip-header">
                    <div class="row items-center justify-between no-wrap q-mb-sm">
                      <!-- Big Queue Badge -->
                      <div class="slip-queue-badge">
                        <span class="slip-queue-label">คิวที่</span>
                        <span class="slip-queue-number">{{
                          formatQueueNumber(order.queue_number)
                        }}</span>
                      </div>

                      <!-- Table Badge & Quick Edit Button -->
                      <div class="row items-center q-gutter-x-xs">
                        <div
                          class="slip-table-badge"
                          :class="{
                            'slip-table-badge--takeaway': isTakeawayName(getTableName(order)),
                          }"
                        >
                          <q-icon
                            :name="
                              isTakeawayName(getTableName(order))
                                ? 'shopping_bag'
                                : 'table_restaurant'
                            "
                            size="18px"
                            class="q-mr-xs"
                            :color="isTakeawayName(getTableName(order)) ? 'orange-9' : 'primary'"
                          />
                          <span
                            class="slip-table-name"
                            :class="{ 'text-orange-9': isTakeawayName(getTableName(order)) }"
                          >
                            {{ getTableName(order) }}
                          </span>
                        </div>

                        <q-btn
                          flat
                          dense
                          round
                          size="sm"
                          color="primary"
                          icon="edit_note"
                          class="slip-quick-edit-btn"
                          @click.stop="openEditOrderDialog(order)"
                        >
                          <q-tooltip>แก้ไขเมนูในออเดอร์นี้ (กรณีลูกค้าสั่งผิด)</q-tooltip>
                        </q-btn>
                      </div>
                    </div>

                    <!-- Status & Timer Badges Row -->
                    <div class="row items-center justify-between q-gutter-x-xs q-gutter-y-xs">
                      <div
                        class="slip-status-pill"
                        :class="{
                          'slip-status-pill--queued': order.status === OrderStatus.QUEUED,
                          'slip-status-pill--preparing': order.status === OrderStatus.PREPARING,
                          'slip-status-pill--prepared': order.status === OrderStatus.PREPARED,
                        }"
                      >
                        <q-icon :name="getStatusIcon(order.status)" size="15px" class="q-mr-xs" />
                        <span>{{ getStatusLabel(order.status) }}</span>
                      </div>

                      <div class="slip-timer-pill" :class="getTimerColorClass(order.created_at)">
                        <q-icon name="timer" size="14px" class="q-mr-xs" />
                        <span>รอ {{ formatElapsed(order.created_at) }}</span>
                      </div>
                    </div>

                    <!-- Revision Alert Banner -->
                    <div v-if="order.revision > 1" class="slip-revision-alert q-mt-xs">
                      <q-icon
                        name="notification_important"
                        size="17px"
                        class="q-mr-xs animate-bounce"
                      />
                      <span><strong>แก้ไขรายการ:</strong> เวอร์ชัน {{ order.revision }}</span>
                    </div>
                  </div>

                  <!-- Perforated Dashed Divider -->
                  <div class="slip-divider-dashed"></div>

                  <!-- Slip Body: Dish Items List with crystal clear option badges -->
                  <div class="slip-body">
                    <div class="slip-dishes-header row items-center justify-between">
                      <span class="slip-dishes-title">
                        รายการอาหาร ({{ getTotalDishesCount(order) }} จาน)
                      </span>
                      <div class="row items-center q-gutter-x-xs">
                        <q-btn
                          outline
                          dense
                          no-caps
                          size="xs"
                          color="primary"
                          icon="edit"
                          label="แก้ไขเมนู"
                          class="slip-edit-menu-btn q-px-xs"
                          @click.stop="openEditOrderDialog(order)"
                        >
                          <q-tooltip>แก้ไข/เพิ่ม/ลบ รายการอาหาร (กรณีลูกค้าสั่งผิด)</q-tooltip>
                        </q-btn>
                        <span class="text-caption text-grey-6 q-ml-xs">
                          {{ formatTime(order.created_at) }}
                        </span>
                      </div>
                    </div>

                    <div class="slip-dishes-list">
                      <div
                        v-for="(item, idx) in order.items"
                        :key="item.id || idx"
                        class="slip-dish-card"
                      >
                        <div class="row items-start no-wrap">
                          <!-- Distinct Quantity Box -->
                          <div class="slip-dish-qty-box">{{ item.quantity }}x</div>

                          <!-- Dish Details -->
                          <div class="slip-dish-info q-ml-sm col">
                            <div class="slip-dish-name">
                              {{ item.snapshot_name }}
                            </div>

                            <!-- Options / Addons List (Highlighted & Categorized) -->
                            <div
                              v-if="item.options && getVisibleOptions(item.options).length > 0"
                              class="slip-options-wrap q-mt-xs"
                            >
                              <span
                                v-for="opt in getVisibleOptions(item.options)"
                                :key="opt.id"
                                class="slip-option-chip"
                                :class="`slip-option-chip--${getOptionDisplayInfo(opt.snapshot_option_name).category}`"
                              >
                                <q-icon
                                  :name="getOptionDisplayInfo(opt.snapshot_option_name).icon"
                                  size="13px"
                                  class="q-mr-xs"
                                />
                                {{ getOptionDisplayInfo(opt.snapshot_option_name).label }}
                              </span>
                            </div>

                            <!-- Special Instruction / Note -->
                            <div v-if="item.special_instruction" class="slip-special-note q-mt-xs">
                              <q-icon name="edit_note" size="16px" class="q-mr-xs" />
                              <span>{{ item.special_instruction }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Slip Footer & Action Button (Reduced 2-Step Flow + Edit Action) -->
                  <div class="slip-footer">
                    <div class="row q-gutter-x-xs items-stretch full-width no-wrap">
                      <!-- Step 1: QUEUED -> กดรับออเดอร์ (เริ่มทำ) -->
                      <div class="col">
                        <q-btn
                          v-if="order.status === OrderStatus.QUEUED"
                          unelevated
                          no-caps
                          size="md"
                          class="full-width slip-action-btn slip-action-btn--start"
                          @click="advanceStatusAndProceed(order.id, OrderStatus.PREPARING)"
                        >
                          <q-icon name="soup_kitchen" size="20px" class="q-mr-xs" />
                          <span class="text-weight-bold">🍳 กดรับออเดอร์</span>
                        </q-btn>

                        <!-- Step 2: PREPARING or PREPARED -> กดส่งออเดอร์ (เสร็จสิ้น) -->
                        <q-btn
                          v-else-if="
                            order.status === OrderStatus.PREPARING ||
                            order.status === OrderStatus.PREPARED
                          "
                          unelevated
                          no-caps
                          size="md"
                          class="full-width slip-action-btn slip-action-btn--serve"
                          @click="advanceStatusAndProceed(order.id, OrderStatus.SERVED)"
                        >
                          <q-icon name="done_all" size="20px" class="q-mr-xs" />
                          <span class="text-weight-bold">🍽️ กดส่งออเดอร์</span>
                        </q-btn>
                      </div>

                      <!-- Edit Order Button in slip footer -->
                      <q-btn
                        outline
                        dense
                        no-caps
                        color="grey-4"
                        text-color="primary"
                        class="slip-footer-edit-btn q-px-sm"
                        @click.stop="openEditOrderDialog(order)"
                      >
                        <q-icon name="edit_note" size="22px" />
                        <q-tooltip>แก้ไขเมนูในออเดอร์ (กรณีลูกค้าสั่งผิด)</q-tooltip>
                      </q-btn>
                    </div>
                  </div>

                  <!-- Slip Bottom Perforation Edge -->
                  <div class="slip-ticket-edge slip-ticket-edge--bottom"></div>
                </div>
              </div>
            </q-carousel-slide>
          </q-carousel>

          <!-- Bottom Mini Thumbnails Strip for Quick Jump -->
          <div v-if="filteredFocusOrders.length > 1" class="focus-thumbnails-strip q-mt-md">
            <div class="row items-center justify-between q-mb-xs">
              <div class="text-caption text-grey-7 text-weight-medium">
                รายการออเดอร์ทั้งหมดในครัว (แตะเพื่อไปยังหน้านั้น):
              </div>
              <div class="text-caption text-grey-6">แสดงผลทีละสูงสุด 3 ออเดอร์ / หน้า</div>
            </div>
            <div class="thumbnails-scroll-row">
              <div
                v-for="ord in filteredFocusOrders"
                :key="ord.id"
                class="mini-order-chip"
                :class="{
                  'mini-order-chip--active': isOrderOnCurrentPage(ord.id),
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
                  <div class="row items-center q-gutter-x-xs">
                    <div class="elapsed-badge">
                      <q-icon name="timer" size="13px" class="q-mr-xs" />
                      <span>{{ formatElapsed(order.created_at) }}</span>
                    </div>
                    <q-btn
                      flat
                      dense
                      round
                      size="xs"
                      color="grey-7"
                      icon="edit_note"
                      class="q-ml-xs"
                      @click.stop="openEditOrderDialog(order)"
                    >
                      <q-tooltip>แก้ไขเมนูในออเดอร์นี้</q-tooltip>
                    </q-btn>
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
                  <div class="row items-center q-gutter-x-xs">
                    <div class="elapsed-badge elapsed-badge--amber">
                      <q-icon name="timer" size="13px" class="q-mr-xs" />
                      <span>{{ formatElapsed(order.preparing_at || order.created_at) }}</span>
                    </div>
                    <q-btn
                      flat
                      dense
                      round
                      size="xs"
                      color="grey-7"
                      icon="edit_note"
                      class="q-ml-xs"
                      @click.stop="openEditOrderDialog(order)"
                    >
                      <q-tooltip>แก้ไขเมนูในออเดอร์นี้</q-tooltip>
                    </q-btn>
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
                    <span>รอทอด {{ pendingFryCount }} ออเดอร์</span>
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

      <!-- ========================================================================= -->
      <!-- VIEW 4: RICE STATION QUEUE MODE (มุมมองจุดตักข้าว / ฝ่ายตักข้าว) -->
      <!-- ========================================================================= -->
      <div v-else-if="viewMode === 'rice'" class="rice-mode-container animate-fade-in">
        <!-- Station Banner / Top Controls -->
        <div class="rice-top-card q-pa-md q-mb-md">
          <div class="row items-center justify-between wrap q-gutter-md">
            <div class="row items-center">
              <div class="rice-hero-icon-box q-mr-md">
                <q-icon name="rice_bowl" size="32px" color="white" />
              </div>
              <div>
                <div class="row items-center q-gutter-xs">
                  <h6 class="q-my-none text-weight-bold rice-page-title">
                    จุดตักข้าว & เตรียมข้าว (Rice Station)
                  </h6>
                  <q-badge color="amber-9" rounded class="q-px-sm text-weight-bold">
                    <span>รอตัก {{ pendingRiceCount }} รายการ</span>
                  </q-badge>
                </div>
                <p class="text-caption text-grey-7 q-mb-none q-mt-xs">
                  สรุปจำนวนจานข้าวธรรมดา/พิเศษ ข้าวผัด และตักข้าวกลับบ้าน ที่ต้องตักจากออเดอร์ในครัว
                </p>
              </div>
            </div>

            <div class="row items-center q-gutter-sm">
              <q-btn
                v-if="completedRiceItemIds.size > 0"
                outline
                dense
                no-caps
                color="grey-7"
                icon="refresh"
                label="ล้างที่ติ๊กเสร็จแล้ว"
                @click="clearCompletedRiceItems"
                class="q-px-sm"
              />
              <q-btn
                unelevated
                no-caps
                color="amber-9"
                icon="view_carousel"
                label="สลับไปโหมดโฟกัสทำอาหาร"
                class="text-weight-bold"
                @click="viewMode = 'focus'"
              />
            </div>
          </div>
        </div>

        <!-- 1. Live Rice Summary KPI Cards -->
        <div class="q-mb-md">
          <div class="row items-center justify-between q-mb-sm">
            <div class="text-weight-bold text-subtitle2 row items-center text-grey-9">
              <q-icon name="analytics" size="18px" color="amber-9" class="q-mr-xs" />
              <span>สรุปรวมข้าวทั้งหมดที่ต้องตัก (Live Summary)</span>
            </div>
            <div class="text-caption text-grey-6">คำนวณจากทุกออเดอร์ที่ยังไม่เสิร์ฟในครัว</div>
          </div>

          <div v-if="riceSummaryList.length > 0" class="rice-summary-grid">
            <div
              v-for="sum in riceSummaryList"
              :key="sum.riceName"
              class="rice-summary-card"
              :class="{
                'rice-summary-card--all-done': sum.pendingQuantity === 0,
                'rice-summary-card--fried': sum.riceType === 'fried',
                'rice-summary-card--takeaway': sum.isTakeaway,
              }"
            >
              <div class="row items-center justify-between no-wrap">
                <div class="row items-center q-gutter-xs ellipsis">
                  <q-icon
                    :name="
                      sum.isTakeaway
                        ? 'shopping_bag'
                        : sum.riceType === 'fried'
                          ? 'outdoor_grill'
                          : 'rice_bowl'
                    "
                    size="18px"
                    :color="
                      sum.isTakeaway
                        ? 'orange-9'
                        : sum.riceType === 'fried'
                          ? 'deep-orange-7'
                          : 'amber-9'
                    "
                  />
                  <span class="text-weight-bold text-body2 rice-sum-name ellipsis">{{
                    sum.riceName
                  }}</span>
                </div>
                <span
                  class="rice-sum-badge"
                  :class="
                    sum.pendingQuantity === 0 ? 'rice-sum-badge--done' : 'rice-sum-badge--pending'
                  "
                >
                  {{
                    sum.pendingQuantity === 0
                      ? 'ตักครบแล้ว'
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
                :color="
                  sum.isTakeaway
                    ? 'orange-8'
                    : sum.riceType === 'fried'
                      ? 'deep-orange-7'
                      : 'amber-8'
                "
                track-color="amber-1"
                class="q-mt-xs rounded-borders"
                size="4px"
              />
            </div>
          </div>

          <div v-else class="rice-summary-empty q-pa-md text-center">
            <q-icon name="check_circle" size="28px" color="green-6" class="q-mr-xs" />
            <span class="text-weight-medium text-grey-8">ไม่มีรายการข้าวที่ต้องตักในขณะนี้</span>
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
              :class="{ 'filter-tab-btn--active': riceFilter === 'all' }"
              @click="riceFilter = 'all'"
            >
              ทั้งหมด ({{ allRiceRequirements.length }})
            </q-btn>
            <q-btn
              unelevated
              rounded
              dense
              no-caps
              size="sm"
              class="q-px-md filter-tab-btn"
              :class="{ 'filter-tab-btn--active': riceFilter === 'pending' }"
              @click="riceFilter = 'pending'"
            >
              <q-badge color="amber-9" rounded class="q-mr-xs" />
              รอตัก ({{ pendingRiceRequirements.length }})
            </q-btn>
            <q-btn
              unelevated
              rounded
              dense
              no-caps
              size="sm"
              class="q-px-md filter-tab-btn"
              :class="{ 'filter-tab-btn--active': riceFilter === 'completed' }"
              @click="riceFilter = 'completed'"
            >
              <q-badge color="green-7" rounded class="q-mr-xs" />
              ตักเสร็จแล้ว ({{ completedRiceRequirements.length }})
            </q-btn>
          </div>
        </div>

        <!-- 3. Order-by-Order Rice Cards Grid -->
        <div v-if="groupedRiceOrders.length > 0" class="rice-orders-grid">
          <div
            v-for="orderGroup in groupedRiceOrders"
            :key="orderGroup.orderId"
            class="rice-order-card"
            :class="{ 'rice-order-card--all-done': orderGroup.allCompleted }"
          >
            <!-- Order Header -->
            <div class="row items-center justify-between q-pb-sm rice-order-header">
              <div class="row items-center q-gutter-xs">
                <span class="rice-order-queue-badge">
                  #{{ formatQueueNumber(orderGroup.queueNumber) }}
                </span>
                <span
                  class="rice-order-table-title text-weight-bold"
                  :class="{ 'text-orange-9': isTakeawayName(orderGroup.tableName) }"
                >
                  {{ orderGroup.tableName }}
                </span>
                <q-badge
                  v-if="isTakeawayName(orderGroup.tableName)"
                  color="orange-9"
                  rounded
                  class="q-px-xs text-weight-bold"
                >
                  <q-icon name="shopping_bag" size="12px" class="q-mr-xs" />
                  กลับบ้าน
                </q-badge>
                <span
                  v-if="
                    orderGroup.customerName &&
                    !orderGroup.tableName.includes(orderGroup.customerName)
                  "
                  class="text-caption text-grey-7"
                >
                  ({{ orderGroup.customerName }})
                </span>
              </div>

              <div class="row items-center q-gutter-xs">
                <span class="rice-order-time-badge">
                  {{ formatElapsed(orderGroup.queuedAt) }}
                </span>
                <q-btn
                  flat
                  dense
                  no-caps
                  size="sm"
                  :color="orderGroup.allCompleted ? 'grey-6' : 'amber-9'"
                  :label="orderGroup.allCompleted ? 'ยกเลิกติ๊ก' : 'เสร็จทั้งหมด'"
                  @click="toggleOrderAllRiceItems(orderGroup.orderId)"
                  class="rice-check-all-btn"
                />
              </div>
            </div>

            <!-- Items List -->
            <div class="rice-items-checklist q-mt-sm q-gutter-y-xs">
              <div
                v-for="req in orderGroup.items"
                :key="req.id"
                class="rice-item-row"
                :class="{
                  'rice-item-row--done': completedRiceItemIds.has(req.id),
                  'rice-item-row--fried': req.isFriedRice,
                  'rice-item-row--takeaway': req.isTakeaway,
                }"
                @click="toggleRiceItem(req.id)"
              >
                <div class="row items-center justify-between no-wrap">
                  <div class="row items-center no-wrap col">
                    <q-checkbox
                      :model-value="completedRiceItemIds.has(req.id)"
                      @update:model-value="toggleRiceItem(req.id)"
                      color="amber-9"
                      dense
                      class="q-mr-sm"
                      @click.stop
                    />
                    <div class="col ellipsis">
                      <div class="row items-center q-gutter-xs wrap">
                        <!-- Main display label (e.g. ธรรมดา 1 จาน / พิเศษ 2 จาน / ตักข้าวกลับบ้าน ธรรมดา 1 กล่อง) -->
                        <span
                          class="text-weight-bold rice-item-name"
                          :class="{
                            'text-strike text-grey-6': completedRiceItemIds.has(req.id),
                            'text-orange-9': req.isTakeaway && !completedRiceItemIds.has(req.id),
                          }"
                        >
                          {{ req.displayLabel }}
                        </span>

                        <!-- Portion & Category Badges -->
                        <q-badge
                          v-if="req.isTakeaway"
                          color="orange-9"
                          rounded
                          class="q-px-xs text-weight-bold"
                        >
                          <q-icon name="shopping_bag" size="12px" class="q-mr-xs" />
                          กลับบ้าน
                        </q-badge>
                        <q-badge
                          v-if="req.isFriedRice"
                          color="deep-orange-7"
                          rounded
                          class="q-px-xs text-weight-bold"
                        >
                          ข้าวผัด
                        </q-badge>
                        <q-badge
                          v-if="req.isSpecial"
                          color="amber-9"
                          rounded
                          class="q-px-xs text-weight-bold"
                        >
                          พิเศษ
                        </q-badge>
                        <q-badge
                          v-else-if="!req.isFriedRice && !req.isTakeaway"
                          color="grey-7"
                          outline
                          rounded
                          class="q-px-xs"
                        >
                          ธรรมดา
                        </q-badge>
                        <q-badge v-if="req.isAddonRice" color="purple-7" rounded class="q-px-xs">
                          เพิ่มข้าว
                        </q-badge>
                      </div>
                      <div class="text-caption text-grey-6 ellipsis q-mt-xs">
                        เมนู: <strong class="text-grey-8">{{ req.dishName }}</strong>
                        <span
                          v-if="req.specialInstruction"
                          class="text-deep-orange-9 text-weight-medium q-ml-xs"
                        >
                          ({{ req.specialInstruction }})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="rice-qty-box text-right q-ml-sm">
                    <span
                      class="text-weight-bolder rice-qty-num"
                      :class="{ 'text-orange-9': req.isTakeaway }"
                    >
                      {{ req.quantity }}
                    </span>
                    <span class="text-caption text-grey-6 q-ml-xs">{{ req.unit }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State for Orders -->
        <div v-else class="rice-all-empty-card text-center q-pa-xl">
          <div class="rice-empty-icon-wrap q-mx-auto q-mb-md">
            <q-icon name="rice_bowl" size="48px" color="amber-7" />
          </div>
          <div class="text-weight-bold text-h6 text-grey-8">ไม่มีรายการจานข้าวที่ต้องตัก</div>
          <div class="text-caption text-grey-6 q-mt-xs">
            ออเดอร์ในครัวขณะนี้ไม่มีเมนูข้าว หรือข้าวทุกจานถูกตักเตรียมเรียบร้อยแล้ว
          </div>
        </div>
      </div>

      <!-- Kitchen Order Edit Dialog (Focus Mode & Overview) -->
      <EditOrderModal
        v-if="editingOrder"
        v-model="showEditModal"
        :order="editingOrder"
        :is-kitchen="true"
        @saved="onOrderEdited"
      />
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
  getOptionDisplayInfo,
  isTakeawayOption,
} from 'src/utils/formatters';
import { isTakeawayName } from 'src/services/tableService';
import {
  extractFryRequirementsFromOrders,
  aggregateFrySummary,
  type FryRequirement,
  type FrySummaryItem,
} from 'src/utils/fryHelper';
import {
  extractRiceRequirementsFromOrders,
  aggregateRiceSummary,
  type RiceRequirement,
  type RiceSummaryItem,
} from 'src/utils/riceHelper';
import { OrderStatus } from 'src/types/enums';
import type { OrderWithItems } from 'src/types/database';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import EditOrderModal from 'src/components/EditOrderModal.vue';
import {
  playNewOrderChime,
  playStatusDoneChime,
  isSoundEnabled,
  setSoundEnabled,
  getSoundVolume,
  setSoundVolume,
  getSoundType,
  setSoundType,
  getVoicePattern,
  setVoicePattern,
  getCustomVoiceText,
  setCustomVoiceText,
  getVoiceSpeed,
  setVoiceSpeed,
  buildSpeechText,
  VOICE_PATTERN_OPTIONS,
  type SoundType,
  type VoicePattern,
} from 'src/utils/audioService';
import type { RealtimeChannel } from '@supabase/supabase-js';

const queueStore = useQueueStore();
const menuStore = useMenuStore();
const { notifySuccess, notifyError, notifyWarning } = useNotify();

const isLoading = ref(true);
const viewMode = ref<'focus' | 'overview' | 'fry' | 'rice'>('focus');
const focusFilter = ref<'all' | 'queued' | 'preparing' | 'prepared'>('all');
const fryFilter = ref<'all' | 'pending' | 'completed'>('all');
const riceFilter = ref<'all' | 'pending' | 'completed'>('all');
const FOCUS_PAGE_SIZE = 3;
const focusPage = ref<number>(0);
const soundEnabled = ref<boolean>(isSoundEnabled());
const soundVolume = ref<number>(getSoundVolume());
const soundType = ref<SoundType>(getSoundType());
const voicePattern = ref<VoicePattern>(getVoicePattern());
const customVoiceText = ref<string>(getCustomVoiceText());
const voiceSpeed = ref<number>(getVoiceSpeed());

const previewVoiceSample = computed(() => {
  return buildSpeechText(
    voicePattern.value,
    { tableName: 'โต๊ะ 1', queueNumber: 1 },
    customVoiceText.value,
  );
});

const testButtonLabel = computed(() => {
  if (soundType.value === 'chime') return 'ทดสอบเสียงกระดิ่ง (Chime)';
  const sample = previewVoiceSample.value;
  if (soundType.value === 'both') {
    return `ทดสอบกระดิ่ง + "${sample}"`;
  }
  return `ทดสอบเสียงพูด ("${sample}")`;
});

// Kitchen Order Edit Modal States
const showEditModal = ref(false);
const editingOrder = ref<OrderWithItems | null>(null);

function openEditOrderDialog(order: OrderWithItems) {
  editingOrder.value = order;
  showEditModal.value = true;
}

async function onOrderEdited() {
  const orders = await fetchTodayOrders();
  queueStore.setOrders(orders);
  if (editingOrder.value) {
    const updated = orders.find((o) => o.id === editingOrder.value?.id);
    if (updated) {
      editingOrder.value = updated;
    }
  }
}

function loadPersistedFryCompletedIds(): string[] {
  try {
    const raw = localStorage.getItem('demo_delivery_completed_fry_ids');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadPersistedRiceCompletedIds(): string[] {
  try {
    const raw = localStorage.getItem('demo_delivery_completed_rice_ids');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const completedFryItemIds = ref<Set<string>>(new Set(loadPersistedFryCompletedIds()));
const completedRiceItemIds = ref<Set<string>>(new Set(loadPersistedRiceCompletedIds()));

let realtimeChannel: RealtimeChannel | null = null;
let elapsedInterval: ReturnType<typeof setInterval>;

// Track known order revisions in memory to detect actual edits vs status changes.
// Supabase realtime doesn't send old record fields without REPLICA IDENTITY FULL,
// so we compare against our own snapshot instead.
const knownRevisions = new Map<string, number>();

function updateKnownRevisions(orders: { id: string; revision?: number }[]) {
  knownRevisions.clear();
  for (const o of orders) {
    if (o.revision !== undefined) {
      knownRevisions.set(o.id, o.revision);
    }
  }
}

// Active kitchen orders (QUEUED + PREPARING + PREPARED)
const activeKitchenOrders = computed(() => {
  return queueStore.orders
    .filter(
      (o) =>
        o.status === OrderStatus.QUEUED ||
        o.status === OrderStatus.PREPARING ||
        o.status === OrderStatus.PREPARED,
    )
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
  // 'all': show all active kitchen orders
  return activeKitchenOrders.value;
});

// Group filtered focus orders into pages of up to 3 orders
const focusPages = computed<OrderWithItems[][]>(() => {
  const list = filteredFocusOrders.value;
  if (list.length === 0) return [];
  const pages: OrderWithItems[][] = [];
  for (let i = 0; i < list.length; i += FOCUS_PAGE_SIZE) {
    pages.push(list.slice(i, i + FOCUS_PAGE_SIZE));
  }
  return pages;
});

const totalFocusPages = computed(() => Math.max(1, focusPages.value.length));

// Automatically keep focusPage within valid range
watch(
  focusPages,
  (newPages) => {
    if (newPages.length > 0) {
      if (focusPage.value >= newPages.length) {
        focusPage.value = Math.max(0, newPages.length - 1);
      }
    } else {
      focusPage.value = 0;
    }
  },
  { immediate: true },
);

function prevPage() {
  if (focusPage.value > 0) {
    focusPage.value--;
  }
}

function nextPage() {
  if (focusPage.value < focusPages.value.length - 1) {
    focusPage.value++;
  }
}

function jumpToOrder(orderId: string) {
  const pageIdx = focusPages.value.findIndex((page) => page.some((o) => o.id === orderId));
  if (pageIdx !== -1) {
    focusPage.value = pageIdx;
  }
}

function isOrderOnCurrentPage(orderId: string): boolean {
  const curPage = focusPages.value[focusPage.value];
  return curPage ? curPage.some((o) => o.id === orderId) : false;
}

function getPageRangeText(pageIdx: number): string {
  const total = filteredFocusOrders.value.length;
  if (total === 0) return '0 ออเดอร์';
  const start = pageIdx * FOCUS_PAGE_SIZE + 1;
  const end = Math.min((pageIdx + 1) * FOCUS_PAGE_SIZE, total);
  if (start === end) {
    return `ออเดอร์ที่ ${start} จากทั้งหมด ${total}`;
  }
  return `ออเดอร์ที่ ${start} - ${end} จากทั้งหมด ${total}`;
}

function setFocusFilter(filter: 'all' | 'queued' | 'preparing' | 'prepared') {
  focusFilter.value = filter;
  focusPage.value = 0;
}

function onSoundToggle(val: boolean) {
  setSoundEnabled(val);
  if (val) {
    testSound();
    notifySuccess('เปิดเสียงแจ้งเตือนออเดอร์แล้ว');
  } else {
    notifyWarning('ปิดเสียงแจ้งเตือนแล้ว');
  }
}

function onSoundTypeChange(val: SoundType) {
  soundType.value = val;
  setSoundType(val);
  testSound();
}

function onVoicePatternChange(val: VoicePattern) {
  voicePattern.value = val;
  setVoicePattern(val);
  testSound();
}

function onCustomVoiceTextChange(val: string | number | null) {
  const str = String(val || '');
  customVoiceText.value = str;
  setCustomVoiceText(str);
}

function onVoiceSpeedChange(speed: number) {
  voiceSpeed.value = speed;
  setVoiceSpeed(speed);
  testSound();
}

function onVolumeChange(val: number | null) {
  if (val !== null) {
    setSoundVolume(val);
    testSound();
  }
}

function setPresetVolume(vol: number) {
  soundVolume.value = vol;
  setSoundVolume(vol);
  testSound();
}

function testSound() {
  const sampleContext = {
    tableName: 'โต๊ะ 1',
    queueNumber: 1,
  };
  playNewOrderChime(soundVolume.value, sampleContext);
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
      return 'รอรับออเดอร์';
    case OrderStatus.PREPARING:
      return 'กำลังปรุงอาหาร';
    case OrderStatus.PREPARED:
      return 'เตรียมเสร็จแล้ว';
    case OrderStatus.SERVED:
      return 'ส่งออเดอร์แล้ว';
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
const categoriesMap = computed(() => new Map(menuStore.categories.map((c) => [c.id, c])));

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

// Rice Station Computeds & Handlers
const allRiceRequirements = computed<RiceRequirement[]>(() => {
  return extractRiceRequirementsFromOrders(
    queueStore.orders,
    menuItemsMap.value,
    categoriesMap.value,
  );
});

const pendingRiceRequirements = computed(() =>
  allRiceRequirements.value.filter((r) => !completedRiceItemIds.value.has(r.id)),
);

const completedRiceRequirements = computed(() =>
  allRiceRequirements.value.filter((r) => completedRiceItemIds.value.has(r.id)),
);

const pendingRiceCount = computed(() =>
  pendingRiceRequirements.value.reduce((sum, r) => sum + r.quantity, 0),
);

const riceSummaryList = computed<RiceSummaryItem[]>(() => {
  return aggregateRiceSummary(allRiceRequirements.value, completedRiceItemIds.value);
});

const groupedRiceOrders = computed(() => {
  const list =
    riceFilter.value === 'pending'
      ? pendingRiceRequirements.value
      : riceFilter.value === 'completed'
        ? completedRiceRequirements.value
        : allRiceRequirements.value;

  const map = new Map<
    string,
    {
      orderId: string;
      queueNumber: number;
      tableName: string;
      customerName?: string | null | undefined;
      orderStatus: string;
      queuedAt: string;
      items: RiceRequirement[];
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
    if (!completedRiceItemIds.value.has(req.id)) {
      group.allCompleted = false;
    }
  }

  return Array.from(map.values()).sort((a, b) => a.queueNumber - b.queueNumber);
});

function persistRiceCompletedIds() {
  try {
    localStorage.setItem(
      'demo_delivery_completed_rice_ids',
      JSON.stringify([...completedRiceItemIds.value]),
    );
  } catch (e) {
    console.error('Failed to save rice completed ids:', e);
  }
}

function toggleRiceItem(reqId: string) {
  if (completedRiceItemIds.value.has(reqId)) {
    completedRiceItemIds.value.delete(reqId);
  } else {
    completedRiceItemIds.value.add(reqId);
  }
  completedRiceItemIds.value = new Set(completedRiceItemIds.value);
  persistRiceCompletedIds();
}

function toggleOrderAllRiceItems(orderId: string) {
  const orderReqs = allRiceRequirements.value.filter((r) => r.orderId === orderId);
  const allDone = orderReqs.every((r) => completedRiceItemIds.value.has(r.id));
  for (const req of orderReqs) {
    if (allDone) {
      completedRiceItemIds.value.delete(req.id);
    } else {
      completedRiceItemIds.value.add(req.id);
    }
  }
  completedRiceItemIds.value = new Set(completedRiceItemIds.value);
  persistRiceCompletedIds();
}

function clearCompletedRiceItems() {
  completedRiceItemIds.value = new Set();
  persistRiceCompletedIds();
  notifySuccess('ล้างรายการตักข้าวที่ติ๊กเสร็จแล้วเรียบร้อย');
}

// Keyboard shortcuts for kitchen navigation (Left/Right to slide pages)
function handleKeydown(e: KeyboardEvent) {
  if (viewMode.value !== 'focus') return;
  if (e.key === 'ArrowLeft') {
    prevPage();
  } else if (e.key === 'ArrowRight') {
    nextPage();
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);
  void menuStore.loadMenu();

  try {
    const orders = await fetchTodayOrders();
    queueStore.setOrders(orders);
    updateKnownRevisions(orders);

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
          const prevRevisions = new Map(knownRevisions);
          const orders = await fetchTodayOrders();
          queueStore.setOrders(orders);
          updateKnownRevisions(orders);

          if (payload.eventType === 'INSERT') {
            const insertedId = (payload.new as { id?: string })?.id;
            const newOrder = orders.find((o) => o.id === insertedId);
            // Skip notification for owner Quick Add items (inserted as SERVED directly)
            if (newOrder && newOrder.status !== OrderStatus.SERVED) {
              const tableName = getTableName(newOrder);
              const queueNumber = newOrder.queue_number;
              playNewOrderChime(undefined, { tableName, queueNumber });
              notifyWarning('🔔 มีออเดอร์ใหม่เข้ามา!');
            }
          }
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as { id?: string; revision?: number; status?: OrderStatus };
            // Compare against our in-memory snapshot to detect actual revision changes
            const prevRevision = newData.id ? (prevRevisions.get(newData.id) ?? 1) : 1;
            if (newData.revision && newData.revision > 1 && newData.revision > prevRevision) {
              playNewOrderChime(undefined, 'ลูกค้ามีการแก้ไขรายการอาหาร');
              notifyWarning('⚠️ ลูกค้ามีการแก้ไขรายการอาหาร');
            }
            if (newData.status === OrderStatus.PREPARED) {
              playStatusDoneChime();
            }
          }
        })();
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'table_sessions',
      },
      () => {
        void (async () => {
          const orders = await fetchTodayOrders();
          queueStore.setOrders(orders);
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
      [OrderStatus.PREPARING]: 'รับออเดอร์แล้ว กำลังปรุงอาหาร 🔥',
      [OrderStatus.PREPARED]: 'เตรียมอาหารเสร็จเรียบร้อย ✅',
      [OrderStatus.SERVED]: 'ส่งออเดอร์เรียบร้อยแล้ว 🍽️',
    };
    notifySuccess(labelMap[newStatus] || 'อัปเดตสถานะสำเร็จ');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะได้';
    notifyError(msg);
  }
}

async function advanceStatusAndProceed(orderId: string, newStatus: OrderStatus) {
  await advanceStatus(orderId, newStatus);
  if (newStatus === OrderStatus.PREPARED || newStatus === OrderStatus.SERVED) {
    playStatusDoneChime();
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

/* ─── VIEW 1: FOCUS MODE (Kitchen Order Slips - Up to 3 per view) ───────────── */
.focus-mode-container {
  max-width: 1440px;
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

/* Dynamic Kitchen Slips Layout Grid */
.kitchen-slips-container {
  display: grid;
  gap: 16px;
  width: 100%;
  align-items: stretch;
}

.kitchen-slips-container--count-1 {
  grid-template-columns: minmax(0, 1fr);
  max-width: 520px;
  margin: 0 auto;
}

.kitchen-slips-container--count-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 1040px;
  margin: 0 auto;
}

.kitchen-slips-container--count-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-width: 1440px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .kitchen-slips-container--count-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .kitchen-slips-container--count-2,
  .kitchen-slips-container--count-3 {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* Kitchen Order Slip Card */
.kitchen-slip {
  background: #ffffff;
  border-radius: 14px;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.07);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: all 0.22s ease;
  min-height: 460px;
}

.kitchen-slip:hover {
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.11);
}

.kitchen-slip--queued {
  border-top: 6px solid #0284c7;
}

.kitchen-slip--preparing {
  border-top: 6px solid #d97706;
  background: #fffdfb;
}

.kitchen-slip--prepared {
  border-top: 6px solid #16a34a;
  background: #fbfdfb;
}

/* Ticket Edge Pattern */
.slip-ticket-edge {
  height: 4px;
  background-image: radial-gradient(circle, #e2e8f0 2px, transparent 2px);
  background-size: 8px 8px;
  opacity: 0.9;
}

.slip-header {
  padding: 14px 16px 10px 16px;
  background: inherit;
}

.slip-queue-badge {
  display: inline-flex;
  align-items: baseline;
  background: #1e293b;
  color: #ffffff;
  padding: 4px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.slip-queue-label {
  font-size: 0.75rem;
  font-weight: 500;
  opacity: 0.85;
  margin-right: 4px;
}

.slip-queue-number {
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.04em;
}

.slip-table-badge {
  display: inline-flex;
  align-items: center;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  padding: 4px 10px;
  border-radius: 8px;
}

.slip-table-badge--takeaway {
  background: #ffedd5;
  border-color: #fed7aa;
}

.slip-table-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #334155;
}

.slip-status-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 9999px;
}

.slip-status-pill--queued {
  background: #e0f2fe;
  color: #0284c7;
}

.slip-status-pill--preparing {
  background: #fef3c7;
  color: #d97706;
}

.slip-status-pill--prepared {
  background: #dcfce7;
  color: #16a34a;
}

.slip-timer-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
}

.slip-timer-pill--normal {
  background: #f8fafc;
  color: #64748b;
}

.slip-timer-pill--warning {
  background: #fffbeb;
  border-color: #fde68a;
  color: #b45309;
  font-weight: 700;
}

.slip-timer-pill--danger {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
  font-weight: 800;
  animation: pulse-danger 2s infinite;
}

.slip-revision-alert {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
}

.slip-divider-dashed {
  border-bottom: 2px dashed #e2e8f0;
  margin: 0 14px;
}

/* Slip Body */
.slip-body {
  padding: 12px 16px;
  flex: 1;
}

.slip-dishes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6px;
  margin-bottom: 10px;
  border-bottom: 1px dashed #cbd5e1;
}

.slip-dishes-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #334155;
}

.slip-dishes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.slip-dish-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  transition: background 0.15s ease;
}

.slip-dish-card:hover {
  background: #f1f5f9;
}

.slip-dish-qty-box {
  background: var(--color-primary);
  color: #ffffff;
  font-size: 1.15rem;
  font-weight: 800;
  min-width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(224, 88, 54, 0.25);
  flex-shrink: 0;
}

.slip-dish-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

/* Slip Option Chips with High Clarity & Categorized Colors */
.slip-options-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.slip-option-chip {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  line-height: 1.3;
}

.slip-option-chip--special {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  color: #92400e;
  font-weight: 700;
}

.slip-option-chip--egg {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #b45309;
  font-weight: 700;
}

.slip-option-chip--spicy {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  font-weight: 700;
}

.slip-option-chip--takeaway {
  background: #ffedd5;
  border: 1px solid #fed7aa;
  color: #c2410c;
  font-weight: 700;
}

.slip-option-chip--sweet {
  background: #e0f2fe;
  border: 1px solid #bae6fd;
  color: #0369a1;
  font-weight: 600;
}

.slip-option-chip--addon {
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-weight: 600;
}

.slip-special-note {
  background: #fef2f2;
  border: 1px solid #fee2e2;
  color: #b91c1c;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  line-height: 1.3;
}

/* Slip Footer */
.slip-footer {
  padding: 12px 16px;
  background: #f8fafc;
  border-top: 1.5px dashed #cbd5e1;
  margin-top: auto;
}

.slip-action-btn {
  height: 46px;
  font-size: 0.98rem;
  border-radius: 10px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slip-action-btn:hover {
  transform: translateY(-2px);
}

.slip-action-btn--start {
  background: linear-gradient(135deg, #e05836 0%, #c84323 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(224, 88, 54, 0.35);
}

.slip-action-btn--done {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35);
}

.slip-action-btn--serve {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(22, 163, 74, 0.35);
}

.slip-action-btn--disabled {
  background: #cbd5e1 !important;
  color: #64748b !important;
}

.slip-quick-edit-btn {
  background: #ffedd5;
  color: #ea580c !important;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.slip-quick-edit-btn:hover {
  background: #fed7aa;
  transform: scale(1.05);
}

.slip-edit-menu-btn {
  font-size: 0.78rem;
  border-radius: 6px;
  font-weight: 600;
  border-color: #fdba74 !important;
  background: #fff7ed;
  color: #c2410c !important;
}

.slip-edit-menu-btn:hover {
  background: #ffedd5;
}

.slip-footer-edit-btn {
  border-radius: 10px;
  background: #ffffff;
  border: 1.5px solid #cbd5e1 !important;
  min-width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.slip-footer-edit-btn:hover {
  background: #fff7ed;
  border-color: #ea580c !important;
  transform: translateY(-2px);
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

/* ========================================================================= */
/* Rice Station Styles */
/* ========================================================================= */
.stat-chip--rice {
  background: #fffbeb;
  border-color: #fde68a;
  color: #b45309;
}

.stat-chip--rice:hover {
  background: #fef3c7;
}

.rice-mode-container {
  max-width: 1300px;
  margin: 0 auto;
}

.rice-top-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.rice-hero-icon-box {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.rice-page-title {
  color: var(--color-text-primary);
  line-height: 1.2;
}

/* Rice Summary Grid */
.rice-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.rice-summary-card {
  background: #ffffff;
  border: 1.5px solid #fde68a;
  border-radius: var(--radius-md);
  padding: 14px;
  box-shadow: var(--shadow-subtle);
  transition: all 0.2s ease;
}

.rice-summary-card--fried {
  border-color: #fdba74;
  background: #fffaf5;
}

.rice-summary-card--takeaway {
  border-color: #fb923c;
  background: #fffaf5;
}

.rice-summary-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.rice-summary-card--all-done {
  border-color: #bbf7d0;
  background: #f0fdf4;
  opacity: 0.85;
}

.rice-sum-name {
  color: var(--color-text-primary);
  font-size: 0.95rem;
}

.rice-sum-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.rice-sum-badge--pending {
  background: #fef3c7;
  color: #b45309;
}

.rice-sum-badge--done {
  background: #dcfce7;
  color: #15803d;
}

.rice-summary-empty {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Rice Orders Grid */
.rice-orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.rice-order-card {
  background: #ffffff;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: var(--shadow-card);
  transition: all 0.2s ease;
}

.rice-order-card--all-done {
  border-color: #86efac;
  background: #f8fafc;
  opacity: 0.8;
}

.rice-order-header {
  border-bottom: 1px solid var(--color-border);
}

.rice-order-queue-badge {
  background: #fef3c7;
  color: #b45309;
  font-weight: 800;
  font-size: 0.82rem;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.rice-order-table-title {
  font-size: 1rem;
  color: var(--color-text-primary);
}

.rice-order-time-badge {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.rice-check-all-btn {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 1px 6px;
}

.rice-item-row {
  background: #f8fafc;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.rice-item-row:hover {
  background: #fffbeb;
  border-color: #fde68a;
}

.rice-item-row--fried {
  border-left: 3px solid #f97316;
}

.rice-item-row--takeaway {
  border-left: 3px solid #ea580c;
  background: #fffaf5;
}

.rice-item-row--done {
  background: #f0fdf4 !important;
  border-color: #bbf7d0 !important;
  border-left-color: #86efac !important;
  opacity: 0.75;
}

.rice-item-name {
  font-size: 0.95rem;
  color: var(--color-text-primary);
}

.rice-qty-box {
  flex-shrink: 0;
}

.rice-qty-num {
  font-size: 1.15rem;
  color: #d97706;
}

.rice-all-empty-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1.5px dashed var(--color-border);
  box-shadow: var(--shadow-subtle);
}

.rice-empty-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #fef3c7;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
