<template>
  <q-page class="bills-page q-pa-md">
    <div class="bills-container">
      <!-- Header Section -->
      <div class="row items-center justify-between q-mb-md header-section">
        <div>
          <h5 class="q-my-none text-weight-bold page-title">บิลและโต๊ะที่เปิดอยู่</h5>
          <p class="text-caption text-grey-7 q-mb-none">
            ติดตามสถานะโต๊ะ ความคืบหน้าอาหารในครัว และการเช็กบิลชำระเงินแบบเรียลไทม์
          </p>
        </div>
        <div class="row items-center q-gutter-sm">
          <q-badge color="positive" rounded class="q-px-sm q-py-xs realtime-badge">
            <span class="pulse-dot pulse-dot--green q-mr-xs"></span>
            <span>อัปเดตเรียลไทม์</span>
          </q-badge>
          <q-btn
            flat
            round
            dense
            color="primary"
            icon="refresh"
            :loading="isRefreshing"
            @click="refreshData"
          >
            <q-tooltip>รีเฟรชข้อมูลล่าสุด</q-tooltip>
          </q-btn>
          <q-btn
            outline
            color="primary"
            no-caps
            rounded
            icon="table_restaurant"
            label="จัดการโต๊ะและ QR"
            to="/owner/tables"
            class="manage-tables-btn"
          />
        </div>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="isLoading" class="q-mb-lg">
        <LoadingSkeleton type="tables" :count="6" />
      </div>

      <template v-else>
        <!-- Top Stats Overview Bar -->
        <div class="stats-overview-grid q-mb-lg">
          <!-- Total Tables -->
          <div
            class="stat-card"
            :class="{ 'stat-card--selected': selectedFilter === 'ALL' }"
            @click="selectedFilter = 'ALL'"
          >
            <div class="stat-icon-wrapper bg-blue-1 text-blue-9">
              <q-icon name="table_restaurant" size="22px" />
            </div>
            <div class="stat-details">
              <div class="stat-label">โต๊ะทั้งหมด</div>
              <div class="stat-value">{{ tables.length }} <span class="unit">โต๊ะ</span></div>
            </div>
          </div>

          <!-- Cooking / In Kitchen -->
          <div
            class="stat-card"
            :class="{ 'stat-card--selected': selectedFilter === 'COOKING' }"
            @click="selectedFilter = 'COOKING'"
          >
            <div class="stat-icon-wrapper bg-amber-1 text-amber-9">
              <q-icon name="soup_kitchen" size="22px" />
            </div>
            <div class="stat-details">
              <div class="stat-label">กำลังทำ / รอเสิร์ฟ</div>
              <div class="stat-value text-amber-9">
                {{ cookingCount }} <span class="unit">โต๊ะ</span>
              </div>
            </div>
          </div>

          <!-- Ready to Pay (All served) -->
          <div
            class="stat-card"
            :class="{ 'stat-card--selected': selectedFilter === 'READY_TO_PAY' }"
            @click="selectedFilter = 'READY_TO_PAY'"
          >
            <div class="stat-icon-wrapper bg-green-1 text-green-8">
              <q-icon name="receipt_long" size="22px" />
            </div>
            <div class="stat-details">
              <div class="stat-label">เสิร์ฟครบ / รอเช็กบิล</div>
              <div class="stat-value text-green-8">
                {{ readyToPayCount }} <span class="unit">โต๊ะ</span>
              </div>
            </div>
          </div>

          <!-- Paid / Ready to Clear -->
          <div
            class="stat-card"
            :class="{ 'stat-card--selected': selectedFilter === 'PAID' }"
            @click="selectedFilter = 'PAID'"
          >
            <div class="stat-icon-wrapper bg-purple-1 text-purple-9">
              <q-icon name="task_alt" size="22px" />
            </div>
            <div class="stat-details">
              <div class="stat-label">ชำระแล้ว / รอเคลียร์</div>
              <div class="stat-value text-purple-9">
                {{ paidCount }} <span class="unit">โต๊ะ</span>
              </div>
            </div>
          </div>

          <!-- Seated / Waiting to order -->
          <div
            class="stat-card"
            :class="{ 'stat-card--selected': selectedFilter === 'SEATED_NO_ORDER' }"
            @click="selectedFilter = 'SEATED_NO_ORDER'"
          >
            <div class="stat-icon-wrapper bg-cyan-1 text-cyan-9">
              <q-icon name="touch_app" size="22px" />
            </div>
            <div class="stat-details">
              <div class="stat-label">รอลูกค้าสั่งอาหาร</div>
              <div class="stat-value text-cyan-9">
                {{ seatedNoOrderCount }} <span class="unit">โต๊ะ</span>
              </div>
            </div>
          </div>

          <!-- Available Tables -->
          <div
            class="stat-card"
            :class="{ 'stat-card--selected': selectedFilter === 'AVAILABLE' }"
            @click="selectedFilter = 'AVAILABLE'"
          >
            <div class="stat-icon-wrapper bg-grey-2 text-grey-7">
              <q-icon name="chair_alt" size="22px" />
            </div>
            <div class="stat-details">
              <div class="stat-label">โต๊ะว่างพร้อมใช้</div>
              <div class="stat-value text-grey-8">
                {{ availableCount }} <span class="unit">โต๊ะ</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Total Active Revenue Highlight Card -->
        <div class="revenue-overview-bar q-mb-md row items-center justify-between">
          <div class="row items-center">
            <div class="revenue-icon-wrap q-mr-md">
              <q-icon name="payments" size="24px" color="primary" />
            </div>
            <div>
              <div class="text-caption text-grey-7">
                ยอดรวมบิลที่เปิดอยู่ทั้งหมด ({{ activeCount }} โต๊ะ)
              </div>
              <div class="text-h6 text-weight-bolder text-primary">
                {{ formatPrice(totalActiveAmount) }}
              </div>
            </div>
          </div>
          <div class="row items-center q-gutter-x-sm text-caption text-grey-6 gt-xs">
            <span
              >🟢 รอเช็กบิล: <strong>{{ readyToPayCount }}</strong></span
            >
            <span>•</span>
            <span
              >🟠 อยู่ในครัว: <strong>{{ cookingCount }}</strong></span
            >
            <span>•</span>
            <span
              >🟣 ชำระแล้ว: <strong>{{ paidCount }}</strong></span
            >
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="toolbar-card q-mb-md">
          <div class="row items-center justify-between q-col-gutter-sm">
            <!-- Filter Tabs -->
            <div class="col-12 col-lg-auto">
              <div class="filter-pills-row">
                <button
                  class="filter-pill-btn"
                  :class="{ active: selectedFilter === 'ALL' }"
                  @click="selectedFilter = 'ALL'"
                >
                  ทั้งหมด ({{ tables.length }})
                </button>
                <button
                  class="filter-pill-btn filter-pill-btn--cooking"
                  :class="{ active: selectedFilter === 'COOKING' }"
                  @click="selectedFilter = 'COOKING'"
                >
                  <span class="dot-indicator dot-amber"></span>
                  กำลังทำ/รอเสิร์ฟ ({{ cookingCount }})
                </button>
                <button
                  class="filter-pill-btn filter-pill-btn--ready-pay"
                  :class="{ active: selectedFilter === 'READY_TO_PAY' }"
                  @click="selectedFilter = 'READY_TO_PAY'"
                >
                  <span class="dot-indicator dot-green"></span>
                  พร้อมเช็กบิล ({{ readyToPayCount }})
                </button>
                <button
                  class="filter-pill-btn filter-pill-btn--paid"
                  :class="{ active: selectedFilter === 'PAID' }"
                  @click="selectedFilter = 'PAID'"
                >
                  <span class="dot-indicator dot-purple"></span>
                  ชำระแล้ว/รอเคลียร์ ({{ paidCount }})
                </button>
                <button
                  class="filter-pill-btn filter-pill-btn--seated"
                  :class="{ active: selectedFilter === 'SEATED_NO_ORDER' }"
                  @click="selectedFilter = 'SEATED_NO_ORDER'"
                >
                  <span class="dot-indicator dot-cyan"></span>
                  รอลูกค้าสั่ง ({{ seatedNoOrderCount }})
                </button>
                <button
                  class="filter-pill-btn filter-pill-btn--available"
                  :class="{ active: selectedFilter === 'AVAILABLE' }"
                  @click="selectedFilter = 'AVAILABLE'"
                >
                  <span class="dot-indicator dot-grey"></span>
                  โต๊ะว่าง ({{ availableCount }})
                </button>
              </div>
            </div>

            <!-- Search input -->
            <div class="col-12 col-lg-4">
              <q-input
                v-model="searchQuery"
                dense
                outlined
                placeholder="ค้นหาชื่อโต๊ะ หรือ สั่งกลับบ้าน..."
                clearable
                class="search-input"
              >
                <template #prepend>
                  <q-icon name="search" size="18px" color="grey-6" />
                </template>
              </q-input>
            </div>
          </div>
        </div>

        <!-- Cards Grid -->
        <div v-if="filteredTableCards.length > 0" class="cards-grid">
          <div
            v-for="item in filteredTableCards"
            :key="item.session?.id || item.table.id"
            class="table-status-card"
            :class="`table-status-card--${item.tableStatus.toLowerCase().replace(/_/g, '-')}`"
          >
            <!-- Card Header -->
            <div class="card-top-bar">
              <div class="row items-center">
                <div class="table-icon-avatar" :class="item.avatarClass">
                  <q-icon
                    :name="item.isTakeaway ? 'shopping_bag' : 'table_restaurant'"
                    size="20px"
                  />
                </div>
                <div class="q-ml-sm">
                  <div class="row items-center q-gutter-xs">
                    <span class="table-card-title">{{
                      item.isTakeaway && item.session?.customer_name
                        ? `สั่งกลับบ้าน (${item.session.customer_name})`
                        : item.table.name
                    }}</span>
                    <q-badge
                      v-if="item.isTakeaway"
                      color="orange-9"
                      rounded
                      class="q-px-xs text-caption text-weight-medium"
                    >
                      กลับบ้าน
                    </q-badge>
                    <q-badge
                      v-if="item.session?.customer_name"
                      color="amber-9"
                      rounded
                      class="q-px-xs text-caption text-weight-bold"
                    >
                      {{ item.session.customer_name }}
                    </q-badge>
                  </div>
                  <div class="text-caption text-grey-6">
                    <template v-if="item.session">
                      <q-icon name="schedule" size="12px" class="q-mr-xs" />
                      <span>เริ่ม {{ item.startedAtTime }}</span>
                    </template>
                    <template v-else>
                      <span class="text-positive text-weight-medium">พร้อมรับลูกค้า</span>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Status Badge (High Visibility & Clear Meaning) -->
              <div class="status-badge-container">
                <div class="table-main-status-badge" :class="item.statusBadge.badgeClass">
                  <span
                    v-if="item.statusBadge.isPulse"
                    class="live-status-dot"
                    :class="`live-status-dot--${item.statusBadge.dotColor}`"
                  ></span>
                  <q-icon :name="item.statusBadge.icon" size="14px" class="q-mr-xs" />
                  <span>{{ item.statusBadge.label }}</span>
                </div>
              </div>
            </div>

            <!-- Card Body: ACTIVE SESSION -->
            <div v-if="item.session" class="card-body-active column justify-between">
              <div>
                <!-- Duration & Orders metadata chips -->
                <div class="meta-tags-row q-mt-sm">
                  <div class="meta-tag">
                    <q-icon name="timer" size="14px" class="q-mr-xs text-grey-7" />
                    <span>นั่งมาแล้ว {{ item.elapsedTime }}</span>
                  </div>
                  <div v-if="item.orderCount > 0" class="meta-tag">
                    <q-icon name="receipt_long" size="14px" class="q-mr-xs text-grey-7" />
                    <span>{{ item.orderCount }} ออเดอร์ ({{ item.totalItemCount }} จาน)</span>
                  </div>
                  <div v-else class="meta-tag text-cyan-9 bg-cyan-1">
                    <q-icon name="edit_note" size="14px" class="q-mr-xs" />
                    <span>ยังไม่มีการสั่งอาหาร</span>
                  </div>
                </div>

                <!-- Kitchen Progress Status Box -->
                <div class="serving-progress-box q-my-sm">
                  <div class="row items-center justify-between text-caption q-mb-xs">
                    <div class="row items-center">
                      <q-icon
                        :name="item.kitchenIcon"
                        size="16px"
                        :class="item.kitchenIconColor"
                        class="q-mr-xs"
                      />
                      <span class="text-weight-bold" :class="item.kitchenTextColor">
                        {{ item.kitchenText }}
                      </span>
                    </div>
                    <span v-if="item.orderCount > 0" class="text-weight-medium text-grey-7">
                      เสิร์ฟแล้ว {{ item.servedOrdersCount }}/{{ item.orderCount }} คิว
                    </span>
                  </div>

                  <!-- Mini Progress Bar (if orders exist) -->
                  <div v-if="item.orderCount > 0" class="progress-bar-track">
                    <div
                      class="progress-bar-fill"
                      :class="item.progressBarColorClass"
                      :style="{ width: `${item.servingPercentage}%` }"
                    ></div>
                  </div>

                  <!-- Kitchen stage breakdown badges -->
                  <div
                    v-if="item.orderCount > 0"
                    class="row items-center q-gutter-x-xs q-mt-xs text-caption"
                  >
                    <span v-if="item.servedOrdersCount > 0" class="stage-tag stage-tag--served">
                      เสิร์ฟครบ {{ item.servedOrdersCount }}
                    </span>
                    <span
                      v-if="item.preparingOrdersCount > 0"
                      class="stage-tag stage-tag--preparing"
                    >
                      กำลังทำ {{ item.preparingOrdersCount }}
                    </span>
                    <span v-if="item.queuedOrdersCount > 0" class="stage-tag stage-tag--queued">
                      รอทำ {{ item.queuedOrdersCount }}
                    </span>
                  </div>
                </div>

                <!-- Total Amount Highlight Box -->
                <div
                  class="bill-amount-box q-my-sm"
                  :class="{
                    'bill-amount-box--ready-pay': item.tableStatus === 'READY_TO_PAY',
                    'bill-amount-box--paid': item.tableStatus === 'PAID',
                  }"
                >
                  <div class="row items-center justify-between">
                    <div>
                      <span class="text-caption text-grey-7 font-weight-500">
                        {{ item.isPaid ? 'ยอดชำระแล้ว' : 'ยอดรวมบิลปัจจุบัน' }}
                      </span>
                      <div v-if="item.isPaid" class="text-caption text-positive font-size-11">
                        <q-icon name="check_circle" size="12px" class="q-mr-xs" />
                        ชำระเงินเรียบร้อย
                      </div>
                    </div>
                    <span
                      class="text-h6 text-weight-bolder"
                      :class="
                        item.isPaid
                          ? 'text-purple-9'
                          : item.isReadyToPay
                            ? 'text-green-8'
                            : 'text-primary'
                      "
                    >
                      {{ formatPrice(item.totalAmount) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Contextual Action Buttons -->
              <div class="card-footer-actions q-mt-md">
                <!-- 1. PAID: Quick Clear Table Button & Receipt -->
                <div v-if="item.tableStatus === 'PAID'" class="row q-gutter-xs">
                  <q-btn
                    unelevated
                    no-caps
                    color="purple-8"
                    class="col action-main-btn action-main-btn--paid"
                    @click="promptClearTable(item)"
                    :loading="clearingSessionId === item.session.id"
                  >
                    <q-icon name="cleaning_services" size="16px" class="q-mr-xs" />
                    <span>เคลียร์โต๊ะ (เปิดโต๊ะใหม่)</span>
                  </q-btn>
                  <q-btn
                    outline
                    no-caps
                    color="grey-8"
                    class="action-secondary-btn"
                    @click="openBill(item.session.id)"
                  >
                    <q-icon name="receipt" size="15px" class="q-mr-xs" />
                    <span>ใบเสร็จ</span>
                  </q-btn>
                </div>

                <!-- 2. READY_TO_PAY: Check Bill Button -->
                <div v-else-if="item.tableStatus === 'READY_TO_PAY'" class="row q-gutter-xs">
                  <q-btn
                    unelevated
                    no-caps
                    color="positive"
                    class="col action-main-btn action-main-btn--ready-pay"
                    @click="openBill(item.session.id)"
                  >
                    <q-icon name="payments" size="17px" class="q-mr-xs" />
                    <span>เช็กบิล / รับเงิน ({{ formatPrice(item.totalAmount) }})</span>
                    <q-icon name="arrow_forward" size="14px" class="q-ml-xs" />
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    color="primary"
                    icon="swap_horiz"
                    class="action-icon-btn"
                    @click="promptTransferTable(item)"
                  >
                    <q-tooltip>ขอย้ายโต๊ะ (สลับไปโต๊ะว่าง)</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    color="grey-7"
                    icon="qr_code_2"
                    class="action-icon-btn"
                    @click="showTableQR(item.table)"
                  >
                    <q-tooltip>ดู QR ประจำโต๊ะ</q-tooltip>
                  </q-btn>
                </div>

                <!-- 3. SEATED_NO_ORDER: Cancel Session / Reset to Available & Manage -->
                <div v-else-if="item.tableStatus === 'SEATED_NO_ORDER'" class="row q-gutter-xs">
                  <q-btn
                    unelevated
                    no-caps
                    color="negative"
                    class="col action-main-btn action-main-btn--cancel"
                    @click="promptCancelSession(item)"
                    :loading="cancellingSessionId === item.session.id"
                  >
                    <q-icon name="person_remove" size="16px" class="q-mr-xs" />
                    <span>ยกเลิกเซสชัน (คืนโต๊ะว่าง)</span>
                  </q-btn>
                  <q-btn
                    outline
                    no-caps
                    color="primary"
                    class="action-secondary-btn"
                    @click="openBill(item.session.id)"
                  >
                    <q-icon name="receipt" size="15px" class="q-mr-xs" />
                    <span>ดูบิล</span>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    color="primary"
                    icon="swap_horiz"
                    class="action-icon-btn"
                    @click="promptTransferTable(item)"
                  >
                    <q-tooltip>ขอย้ายโต๊ะ (สลับไปโต๊ะว่าง)</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    color="grey-7"
                    icon="qr_code_2"
                    class="action-icon-btn"
                    @click="showTableQR(item.table)"
                  >
                    <q-tooltip>ดู QR ประจำโต๊ะ</q-tooltip>
                  </q-btn>
                </div>

                <!-- 4. COOKING: Manage Bill -->
                <div v-else class="row q-gutter-xs">
                  <q-btn
                    unelevated
                    no-caps
                    color="primary"
                    class="col action-main-btn"
                    @click="openBill(item.session.id)"
                  >
                    <q-icon name="receipt" size="16px" class="q-mr-xs" />
                    <span>ดูบิล / จัดการบิล</span>
                    <q-icon name="arrow_forward" size="14px" class="q-ml-xs" />
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    color="primary"
                    icon="swap_horiz"
                    class="action-icon-btn"
                    @click="promptTransferTable(item)"
                  >
                    <q-tooltip>ขอย้ายโต๊ะ (สลับไปโต๊ะว่าง)</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    color="grey-7"
                    icon="qr_code_2"
                    class="action-icon-btn"
                    @click="showTableQR(item.table)"
                  >
                    <q-tooltip>ดู QR ประจำโต๊ะ</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </div>

            <!-- Card Body: AVAILABLE TABLE (โต๊ะว่าง) -->
            <div v-else class="card-body-empty column justify-between">
              <div class="empty-table-placeholder q-my-md text-center">
                <div class="empty-table-icon-circle q-mx-auto q-mb-sm">
                  <q-icon name="chair_alt" size="30px" color="grey-6" />
                </div>
                <div class="text-subtitle2 font-weight-600 text-grey-8">
                  โต๊ะว่าง พร้อมให้บริการ
                </div>
                <div class="text-caption text-grey-5 font-size-11 q-mt-xs">
                  เมื่อลูกค้าสแกน QR หรือเปิดสั่งอาหาร ระบบจะเปิดบิลและนับเวลาอัตโนมัติ
                </div>
              </div>

              <div class="card-footer-actions q-mt-auto row q-gutter-xs">
                <q-btn
                  outline
                  no-caps
                  color="primary"
                  class="col action-secondary-btn"
                  @click="showTableQR(item.table)"
                >
                  <q-icon name="qr_code_2" size="16px" class="q-mr-xs" />
                  <span>ดู QR โต๊ะ</span>
                </q-btn>
                <q-btn
                  unelevated
                  no-caps
                  color="secondary"
                  class="col action-secondary-btn"
                  @click="openDirectCustomerLink(item.table)"
                >
                  <q-icon name="open_in_new" size="15px" class="q-mr-xs" />
                  <span>เปิดสั่งอาหาร</span>
                </q-btn>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty Result State -->
        <div v-else class="empty-results-card q-pa-xl text-center">
          <div class="empty-icon-circle q-mx-auto q-mb-md">
            <q-icon name="table_restaurant" size="44px" color="primary" />
          </div>
          <div class="text-h6 text-weight-bold q-mb-xs">
            <template v-if="tables.length === 0"> ยังไม่มีโต๊ะในระบบ </template>
            <template v-else> ไม่พบโต๊ะที่ตรงกับสถานะ "{{ currentFilterLabel }}" </template>
          </div>
          <p class="text-caption text-grey-7 q-mb-lg max-w-400 q-mx-auto">
            <template v-if="tables.length === 0">
              เริ่มต้นด้วยการเพิ่มโต๊ะและสร้าง QR Code เพื่อให้ลูกค้าสามารถสแกนสั่งอาหารได้ทันที
            </template>
            <template v-else>
              ลองเปลี่ยนคำค้นหา หรือกดเลือกแท็บ "ทั้งหมด" เพื่อดูสถานะโต๊ะทั้งหมดในร้าน
            </template>
          </p>
          <q-btn
            v-if="tables.length === 0"
            color="primary"
            unelevated
            rounded
            no-caps
            icon="add"
            label="ไปที่หน้าจัดการโต๊ะ"
            to="/owner/tables"
            class="q-px-lg"
          />
          <q-btn
            v-else
            outline
            color="primary"
            rounded
            no-caps
            label="แสดงโต๊ะทั้งหมด"
            @click="resetFilter"
            class="q-px-lg"
          />
        </div>
      </template>

      <!-- Quick QR Code Dialog -->
      <q-dialog v-model="showQRModal">
        <q-card
          style="min-width: 320px; max-width: 380px"
          class="q-pa-md text-center border-radius-lg"
        >
          <q-card-section class="q-pb-none">
            <div class="row items-center justify-between">
              <span class="text-h6 text-weight-bold">{{ selectedTable?.name }}</span>
              <q-btn icon="close" flat round dense v-close-popup />
            </div>
            <div class="text-caption text-grey-7">สแกนเพื่อสั่งอาหารประจำโต๊ะนี้</div>
          </q-card-section>

          <q-card-section class="column items-center q-py-md">
            <div class="qr-preview-box">
              <canvas ref="qrCanvasRef" class="qr-canvas-element"></canvas>
            </div>
            <div class="text-caption text-grey-6 q-mt-sm ellipsis full-width">
              {{ selectedTableUrl }}
            </div>
          </q-card-section>

          <q-card-actions align="center" class="q-gutter-xs">
            <q-btn
              outline
              no-caps
              rounded
              size="sm"
              color="primary"
              icon="content_copy"
              label="คัดลอกลิงก์"
              @click="copyTableLink"
            />
            <q-btn
              unelevated
              no-caps
              rounded
              size="sm"
              color="primary"
              icon="open_in_new"
              label="เปิดหน้าลูกค้า"
              @click="openSelectedTableLink"
            />
            <q-btn
              flat
              no-caps
              rounded
              size="sm"
              color="warning"
              icon="refresh"
              label="สร้าง QR ใหม่"
              @click="handleRegenerateQRFromModal"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- Quick Confirm Clear Table Dialog -->
      <q-dialog v-model="showConfirmClearModal">
        <q-card style="min-width: 320px; max-width: 400px" class="q-pa-md border-radius-lg">
          <q-card-section class="text-center q-pb-xs">
            <div class="clear-confirm-icon-wrap q-mx-auto q-mb-sm">
              <q-icon name="cleaning_services" size="32px" color="purple-9" />
            </div>
            <div class="text-h6 text-weight-bold">ยืนยันการเคลียร์โต๊ะ?</div>
            <div class="text-body2 text-grey-8 q-mt-xs">
              {{ tableToClear?.table.name }} ชำระเงินเรียบร้อยแล้ว
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">
              การเคลียร์โต๊ะจะปิดบิลเซสชันนี้ และเปลี่ยนสถานะกลับเป็น
              <strong>"โต๊ะว่าง"</strong> เพื่อพร้อมรับลูกค้ารายถัดไป
            </div>
          </q-card-section>

          <q-card-actions align="stretch" class="column q-gutter-y-xs q-mt-md">
            <q-btn
              unelevated
              no-caps
              rounded
              color="purple-8"
              label="ยืนยันเคลียร์โต๊ะ / เปิดรับลูกค้าใหม่"
              :loading="isClearingDirect"
              @click="handleConfirmClearTable"
              class="full-width"
            />
            <q-btn
              flat
              no-caps
              rounded
              color="grey-7"
              label="ยกเลิก"
              v-close-popup
              class="full-width"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- Quick Confirm Cancel / Reset Seated Session Dialog -->
      <q-dialog v-model="showConfirmCancelModal">
        <q-card style="min-width: 320px; max-width: 400px" class="q-pa-md border-radius-lg">
          <q-card-section class="text-center q-pb-xs">
            <div class="cancel-confirm-icon-wrap q-mx-auto q-mb-sm">
              <q-icon name="person_remove" size="32px" color="negative" />
            </div>
            <div class="text-h6 text-weight-bold">ยืนยันยกเลิกการเปิดโต๊ะ?</div>
            <div class="text-body2 text-grey-8 q-mt-xs">
              {{ tableToCancel?.table.name }} (ยังไม่มีรายการสั่งอาหาร)
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">
              การยกเลิกจะปิดเซสชันนี้ และเปลี่ยนสถานะกลับเป็น <strong>"โต๊ะว่าง"</strong> ทันที
              เพื่อให้ลูกค้ารายอื่นสามารถสแกนเปิดโต๊ะได้ใหม่
            </div>
          </q-card-section>

          <q-card-actions align="stretch" class="column q-gutter-y-xs q-mt-md">
            <q-btn
              unelevated
              no-caps
              rounded
              color="negative"
              label="ยืนยันยกเลิกเซสชัน (คืนโต๊ะว่าง)"
              :loading="isCancellingDirect"
              @click="handleConfirmCancelSession"
              class="full-width"
            />
            <q-btn
              flat
              no-caps
              rounded
              color="grey-7"
              label="ปิดหน้าต่าง"
              v-close-popup
              class="full-width"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- Transfer Table Modal Dialog -->
      <q-dialog v-model="showTransferModal">
        <q-card style="min-width: 360px; max-width: 480px" class="q-pa-md border-radius-lg transfer-dialog-card">
          <q-card-section class="q-pb-xs">
            <div class="row items-center no-wrap q-mb-sm">
              <div class="transfer-modal-icon-wrap q-mr-sm">
                <q-icon name="swap_horiz" size="24px" color="primary" />
              </div>
              <div>
                <div class="text-h6 text-weight-bold">ขอย้ายโต๊ะอาหาร</div>
                <div class="text-caption text-grey-7">
                  โอนย้ายออเดอร์และบิลทั้งหมดไปยังโต๊ะใหม่ที่ว่างอยู่
                </div>
              </div>
            </div>

            <!-- Current Table Info Card -->
            <div v-if="tableToTransfer" class="transfer-source-card q-pa-sm q-my-sm">
              <div class="row items-center justify-between">
                <div class="row items-center">
                  <q-icon name="table_restaurant" size="18px" class="q-mr-xs text-primary" />
                  <span class="text-weight-bold text-body2">
                    {{
                      tableToTransfer.isTakeaway && tableToTransfer.session?.customer_name
                        ? `สั่งกลับบ้าน (${tableToTransfer.session.customer_name})`
                        : tableToTransfer.table.name
                    }}
                  </span>
                </div>
                <span class="text-caption text-grey-7">
                  {{ tableToTransfer.orderCount }} ออเดอร์ • {{ formatPrice(tableToTransfer.totalAmount) }}
                </span>
              </div>
            </div>

            <!-- Target Table Selection -->
            <div class="q-mt-md">
              <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">
                เลือกโต๊ะว่างปลายทางที่ต้องการย้ายไป:
              </div>

              <!-- When No Empty Tables Available -->
              <div
                v-if="availableTablesForTransfer.length === 0"
                class="no-available-tables-box q-pa-md text-center"
              >
                <q-icon name="do_not_disturb_on" size="32px" color="amber-9" class="q-mb-xs" />
                <div class="text-weight-bold text-amber-10">ไม่มีโต๊ะว่างในขณะนี้</div>
                <div class="text-caption text-grey-7 q-mt-xs">
                  โต๊ะอื่นในร้านมีลูกค้านั่งเต็มทั้งหมดแล้ว กรุณาเคลียร์โต๊ะที่ชำระเงินแล้ว หรือรอให้มีโต๊ะว่างก่อน
                </div>
              </div>

              <!-- Available Tables Grid -->
              <div v-else class="available-tables-grid q-mt-xs">
                <div
                  v-for="targetTbl in availableTablesForTransfer"
                  :key="targetTbl.id"
                  class="target-table-item"
                  :class="{ 'target-table-item--selected': selectedTargetTableId === targetTbl.id }"
                  @click="selectedTargetTableId = targetTbl.id"
                >
                  <div class="row items-center justify-between">
                    <div class="row items-center">
                      <q-icon name="table_restaurant" size="18px" class="target-table-icon q-mr-xs" />
                      <span class="target-table-name text-weight-bold">{{ targetTbl.name }}</span>
                    </div>
                    <q-icon
                      v-if="selectedTargetTableId === targetTbl.id"
                      name="check_circle"
                      size="18px"
                      color="primary"
                    />
                    <span v-else class="target-table-free-badge">ว่าง</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notice Info Box -->
            <div v-if="selectedTargetTableId" class="transfer-hint-box q-pa-sm q-mt-md">
              <div class="row items-start no-wrap">
                <q-icon name="info" size="16px" color="primary" class="q-mr-xs q-mt-xs" />
                <div class="text-caption text-grey-8 font-size-11">
                  เมื่อกดยืนยัน รายการอาหารและยอดเงินจะย้ายไปที่
                  <strong class="text-primary">{{
                    tables.find((t) => t.id === selectedTargetTableId)?.name
                  }}</strong>
                  ทันที และโต๊ะเดิมจะกลับไปเป็นสถานะ <strong>"โต๊ะว่าง"</strong>
                </div>
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="stretch" class="column q-gutter-y-xs q-mt-md">
            <q-btn
              unelevated
              no-caps
              rounded
              color="primary"
              :label="
                selectedTargetTableId
                  ? `ยืนยันย้ายไป ${tables.find((t) => t.id === selectedTargetTableId)?.name || 'โต๊ะใหม่'}`
                  : 'กรุณาเลือกโต๊ะว่าง'
              "
              :disabled="!selectedTargetTableId || availableTablesForTransfer.length === 0"
              :loading="isTransferring"
              @click="handleConfirmTransferTable"
              class="full-width font-weight-600"
            />
            <q-btn
              flat
              no-caps
              rounded
              color="grey-7"
              label="ยกเลิก"
              v-close-popup
              class="full-width"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from 'src/services/supabase';
import { fetchTables, generateQRToken, isTakeawayName } from 'src/services/tableService';
import { closeTableSession, transferTableSession } from 'src/services/sessionService';
import { formatPrice, formatTime, formatElapsed } from 'src/utils/formatters';
import { getAppUrl } from 'src/utils/constants';
import { useNotify } from 'src/composables/useNotify';
import QRCode from 'qrcode';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import type { TableWithQR } from 'src/types/database';
import { OrderStatus } from 'src/types/enums';
import type { RealtimeChannel } from '@supabase/supabase-js';

const router = useRouter();
const { notifySuccess, notifyInfo, notifyError } = useNotify();

export type TableOperationalStatus =
  | 'AVAILABLE' // โต๊ะว่าง
  | 'SEATED_NO_ORDER' // เปิดโต๊ะแล้ว • รอลูกค้าสั่งอาหาร
  | 'COOKING' // กำลังทำอาหาร / รอเสิร์ฟ
  | 'READY_TO_PAY' // เสิร์ฟครบ 100% • รอเช็กบิล
  | 'PAID'; // ชำระเงินแล้ว • รอเคลียร์โต๊ะ

interface RawSessionOrder {
  id: string;
  queue_number: number;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  items: {
    id: string;
    quantity: number;
    snapshot_name: string;
    subtotal: number;
    options?: { id: string; snapshot_option_name: string; snapshot_price_adjustment: number }[];
  }[];
}

interface RawSessionBill {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

interface RawSession {
  id: string;
  table_id: string;
  customer_name?: string | null;
  status: string;
  created_at: string;
  table: { id: string; name: string } | null;
  orders: RawSessionOrder[];
  bill: RawSessionBill[] | null;
}

interface StatusBadgeInfo {
  label: string;
  subLabel: string;
  icon: string;
  badgeClass: string;
  isPulse: boolean;
  dotColor: string;
}

interface TableCardItem {
  table: TableWithQR;
  session: RawSession | null;
  tableStatus: TableOperationalStatus;
  statusBadge: StatusBadgeInfo;
  orderCount: number;
  totalItemCount: number;
  totalAmount: number;
  isPaid: boolean;
  isReadyToPay: boolean;
  servedOrdersCount: number;
  preparingOrdersCount: number;
  queuedOrdersCount: number;
  servingPercentage: number;
  kitchenText: string;
  kitchenTextColor: string;
  kitchenIcon: string;
  kitchenIconColor: string;
  progressBarColorClass: string;
  elapsedTime: string;
  startedAtTime: string;
  avatarClass: string;
  isTakeaway: boolean;
}

const tables = ref<TableWithQR[]>([]);
const activeSessions = ref<RawSession[]>([]);
const isLoading = ref(true);
const isRefreshing = ref(false);

const selectedFilter = ref<
  'ALL' | 'COOKING' | 'READY_TO_PAY' | 'PAID' | 'SEATED_NO_ORDER' | 'AVAILABLE'
>('ALL');
const searchQuery = ref('');

// QR Dialog State
const showQRModal = ref(false);
const selectedTable = ref<TableWithQR | null>(null);
const selectedTableUrl = ref('');
const qrCanvasRef = ref<HTMLCanvasElement | null>(null);

// Clear Table Modal State
const showConfirmClearModal = ref(false);
const tableToClear = ref<TableCardItem | null>(null);
const isClearingDirect = ref(false);
const clearingSessionId = ref<string | null>(null);

// Cancel Seated Session Modal State
const showConfirmCancelModal = ref(false);
const tableToCancel = ref<TableCardItem | null>(null);
const isCancellingDirect = ref(false);
const cancellingSessionId = ref<string | null>(null);

// Transfer Table Modal State
const showTransferModal = ref(false);
const tableToTransfer = ref<TableCardItem | null>(null);
const selectedTargetTableId = ref<string | null>(null);
const isTransferring = ref(false);

const availableTablesForTransfer = computed(() => {
  if (!tableToTransfer.value) return [];
  const currentTableId = tableToTransfer.value.table.id;
  const occupiedTableIds = new Set(
    activeSessions.value.filter((s) => s.status === 'ACTIVE').map((s) => s.table_id),
  );

  return tables.value.filter(
    (t) =>
      t.is_active &&
      t.id !== currentTableId &&
      !isTakeawayName(t.name) &&
      !occupiedTableIds.has(t.id),
  );
});

let realtimeSessions: RealtimeChannel | null = null;
let realtimeOrders: RealtimeChannel | null = null;
let timerInterval: ReturnType<typeof setInterval>;

onMounted(async () => {
  await loadAllData();
  setupRealtime();

  // Refresh timer every 30s for elapsed time updates
  timerInterval = setInterval(() => {
    // triggers recomputation
    activeSessions.value = [...activeSessions.value];
  }, 30000);
});

onUnmounted(() => {
  if (realtimeSessions) void supabase.removeChannel(realtimeSessions);
  if (realtimeOrders) void supabase.removeChannel(realtimeOrders);
  clearInterval(timerInterval);
});

async function loadAllData() {
  try {
    const [tablesData, sessionsRes] = await Promise.all([
      fetchTables(),
      supabase
        .from('table_sessions')
        .select(
          `
          id,
          table_id,
          customer_name,
          status,
          created_at,
          table:tables(id, name),
          orders(
            id,
            queue_number,
            status,
            total_amount,
            created_at,
            items:order_items(id, quantity, snapshot_name, subtotal, options:order_item_options(id, snapshot_option_name, snapshot_price_adjustment))
          ),
          bill:bills(id, total_amount, status, created_at, paid_at)
        `,
        )
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false }),
    ]);

    tables.value = tablesData.filter((t) => t.is_active);
    activeSessions.value = (sessionsRes.data ?? []) as unknown as RawSession[];
  } finally {
    isLoading.value = false;
  }
}

async function refreshData() {
  isRefreshing.value = true;
  try {
    await loadAllData();
    notifyInfo('อัปเดตข้อมูลล่าสุดเรียบร้อย');
  } finally {
    isRefreshing.value = false;
  }
}

function setupRealtime() {
  realtimeSessions = supabase
    .channel('realtime:table_sessions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => {
      void loadAllData();
    })
    .subscribe();

  realtimeOrders = supabase
    .channel('realtime:orders_bills_page')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      void loadAllData();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => {
      void loadAllData();
    })
    .subscribe();
}

function buildTableCardItem(
  table: TableWithQR,
  session: RawSession | null,
  isTakeaway: boolean,
): TableCardItem {
  if (!session) {
    return {
      table,
      session: null,
      tableStatus: 'AVAILABLE',
      statusBadge: {
        label: isTakeaway ? 'พร้อมรับสั่งกลับบ้าน' : 'โต๊ะว่าง',
        subLabel: 'พร้อมรับลูกค้า',
        icon: isTakeaway ? 'shopping_bag' : 'chair_alt',
        badgeClass: 'badge-status--available',
        isPulse: false,
        dotColor: 'grey',
      },
      orderCount: 0,
      totalItemCount: 0,
      totalAmount: 0,
      isPaid: false,
      isReadyToPay: false,
      servedOrdersCount: 0,
      preparingOrdersCount: 0,
      queuedOrdersCount: 0,
      servingPercentage: 0,
      kitchenText: isTakeaway ? 'ยังไม่มีออเดอร์กลับบ้าน' : 'โต๊ะว่าง',
      kitchenTextColor: 'text-grey-7',
      kitchenIcon: isTakeaway ? 'shopping_bag' : 'chair_alt',
      kitchenIconColor: 'text-grey-6',
      progressBarColorClass: 'bg-grey-4',
      elapsedTime: '',
      startedAtTime: '',
      avatarClass: isTakeaway ? 'bg-orange-1 text-orange-9' : 'bg-grey-2 text-grey-7',
      isTakeaway,
    };
  }

  const orders = session.orders || [];
  const bill = session.bill?.[0] ?? null;
  const orderCount = orders.length;

  let totalItemCount = 0;
  let totalOrdersAmount = 0;
  let servedOrdersCount = 0;
  let preparingOrdersCount = 0;
  let queuedOrdersCount = 0;

  for (const order of orders) {
    totalOrdersAmount += order.total_amount || 0;
    if (order.status === OrderStatus.SERVED) {
      servedOrdersCount++;
    } else if (order.status === OrderStatus.PREPARING || order.status === OrderStatus.PREPARED) {
      preparingOrdersCount++;
    } else if (order.status === OrderStatus.QUEUED) {
      queuedOrdersCount++;
    }

    if (order.items) {
      for (const item of order.items) {
        totalItemCount += item.quantity || 1;
      }
    }
  }

  const totalAmount = bill?.total_amount || totalOrdersAmount;
  const isPaid = bill?.status === 'PAID';
  const allServed = orderCount > 0 && servedOrdersCount === orderCount;
  const isReadyToPay = allServed && !isPaid;
  const isCooking = orderCount > 0 && !allServed && !isPaid;
  const isSeatedNoOrder = orderCount === 0 && !isPaid;

  const servingPercentage = orderCount > 0 ? Math.round((servedOrdersCount / orderCount) * 100) : 0;

  let tableStatus: TableOperationalStatus = 'AVAILABLE';
  let statusBadge: StatusBadgeInfo = {
    label: 'โต๊ะว่าง',
    subLabel: 'พร้อมรับลูกค้า',
    icon: 'chair_alt',
    badgeClass: 'badge-status--available',
    isPulse: false,
    dotColor: 'grey',
  };
  let kitchenText = 'ยังไม่ได้สั่งอาหาร';
  let kitchenTextColor = 'text-grey-7';
  let kitchenIcon = 'pending';
  let kitchenIconColor = 'text-grey-6';
  let progressBarColorClass = 'bg-primary';
  let avatarClass = isTakeaway ? 'bg-orange-1 text-orange-9' : 'bg-primary-soft text-primary';

  if (isPaid) {
    tableStatus = 'PAID';
    statusBadge = {
      label: isTakeaway ? 'ชำระแล้ว • รอรับอาหารกลับ' : 'ชำระแล้ว • รอเคลียร์โต๊ะ',
      subLabel: 'พร้อมปิดรายการ',
      icon: 'task_alt',
      badgeClass: 'badge-status--paid',
      isPulse: true,
      dotColor: 'purple',
    };
    kitchenText = 'ชำระเงินแล้ว';
    kitchenTextColor = 'text-purple-9';
    kitchenIcon = 'check_circle';
    kitchenIconColor = 'text-purple-8';
    progressBarColorClass = 'bg-purple-8';
    avatarClass = 'bg-purple-1 text-purple-9';
  } else if (isReadyToPay) {
    tableStatus = 'READY_TO_PAY';
    statusBadge = {
      label: isTakeaway ? 'ทำเสร็จครบ • รอชำระเงิน' : 'เสิร์ฟครบ • รอเช็กบิล',
      subLabel: 'พร้อมรับชำระเงิน',
      icon: 'receipt_long',
      badgeClass: 'badge-status--ready-pay',
      isPulse: true,
      dotColor: 'green',
    };
    kitchenText = isTakeaway ? 'อาหารปรุงเสร็จครบทุกรายการแล้ว' : 'เสิร์ฟครบทุกรายการแล้ว';
    kitchenTextColor = 'text-green-9';
    kitchenIcon = 'done_all';
    kitchenIconColor = 'text-green-8';
    progressBarColorClass = 'bg-green-8';
    avatarClass = 'bg-green-1 text-green-9';
  } else if (isCooking) {
    tableStatus = 'COOKING';
    statusBadge = {
      label: `กำลังทำอาหาร (${servedOrdersCount}/${orderCount})`,
      subLabel: 'มีรายการกำลังปรุงในครัว',
      icon: 'soup_kitchen',
      badgeClass: 'badge-status--cooking',
      isPulse: true,
      dotColor: 'amber',
    };

    if (preparingOrdersCount > 0) {
      kitchenText = `กำลังปรุงอาหารในครัว (${preparingOrdersCount} คิว)`;
      kitchenTextColor = 'text-amber-10';
      kitchenIcon = 'soup_kitchen';
      kitchenIconColor = 'text-amber-9';
      progressBarColorClass = 'bg-amber-8';
    } else {
      kitchenText = `มีออเดอร์ใหม่รอเริ่มทำ (${queuedOrdersCount} คิว)`;
      kitchenTextColor = 'text-cyan-10';
      kitchenIcon = 'schedule';
      kitchenIconColor = 'text-cyan-8';
      progressBarColorClass = 'bg-cyan-8';
    }
    avatarClass = 'bg-amber-1 text-amber-9';
  } else if (isSeatedNoOrder) {
    tableStatus = 'SEATED_NO_ORDER';
    statusBadge = {
      label: isTakeaway ? 'เปิดรายการแล้ว • รอลูกค้าสั่ง' : 'เปิดโต๊ะแล้ว • รอลูกค้าสั่ง',
      subLabel: 'ลูกค้ากำลังเลือกเมนู',
      icon: 'touch_app',
      badgeClass: 'badge-status--seated',
      isPulse: true,
      dotColor: 'cyan',
    };
    kitchenText = 'ยังไม่มีรายการสั่งอาหาร';
    kitchenTextColor = 'text-cyan-9';
    kitchenIcon = 'touch_app';
    kitchenIconColor = 'text-cyan-8';
    progressBarColorClass = 'bg-cyan-8';
    avatarClass = 'bg-cyan-1 text-cyan-9';
  }

  return {
    table,
    session,
    tableStatus,
    statusBadge,
    orderCount,
    totalItemCount,
    totalAmount,
    isPaid,
    isReadyToPay,
    servedOrdersCount,
    preparingOrdersCount,
    queuedOrdersCount,
    servingPercentage,
    kitchenText,
    kitchenTextColor,
    kitchenIcon,
    kitchenIconColor,
    progressBarColorClass,
    elapsedTime: formatElapsed(session.created_at),
    startedAtTime: formatTime(session.created_at),
    avatarClass,
    isTakeaway,
  };
}

// Table cards mapped data with clear and rich statuses
const tableCards = computed<TableCardItem[]>(() => {
  const cards: TableCardItem[] = [];

  for (const table of tables.value) {
    const isTakeaway = isTakeawayName(table.name);

    if (isTakeaway) {
      const takeawaySessions = activeSessions.value.filter((s) => s.table_id === table.id);

      if (takeawaySessions.length > 0) {
        for (const session of takeawaySessions) {
          cards.push(buildTableCardItem(table, session, isTakeaway));
        }
      } else {
        cards.push(buildTableCardItem(table, null, isTakeaway));
      }
    } else {
      const session = activeSessions.value.find((s) => s.table_id === table.id) ?? null;
      cards.push(buildTableCardItem(table, session, isTakeaway));
    }
  }

  return cards;
});

// Top Overview Stats Computed
const activeCount = computed(() => tableCards.value.filter((c) => c.session !== null).length);
const cookingCount = computed(
  () => tableCards.value.filter((c) => c.tableStatus === 'COOKING').length,
);
const readyToPayCount = computed(
  () => tableCards.value.filter((c) => c.tableStatus === 'READY_TO_PAY').length,
);
const paidCount = computed(() => tableCards.value.filter((c) => c.tableStatus === 'PAID').length);
const seatedNoOrderCount = computed(
  () => tableCards.value.filter((c) => c.tableStatus === 'SEATED_NO_ORDER').length,
);
const availableCount = computed(
  () => tableCards.value.filter((c) => c.tableStatus === 'AVAILABLE').length,
);
const totalActiveAmount = computed(() =>
  tableCards.value.reduce((sum, c) => sum + (c.session && !c.isPaid ? c.totalAmount : 0), 0),
);

const currentFilterLabel = computed(() => {
  switch (selectedFilter.value) {
    case 'COOKING':
      return 'กำลังทำ / รอเสิร์ฟ';
    case 'READY_TO_PAY':
      return 'เสิร์ฟครบ / รอเช็กบิล';
    case 'PAID':
      return 'ชำระแล้ว / รอเคลียร์';
    case 'SEATED_NO_ORDER':
      return 'รอลูกค้าสั่งอาหาร';
    case 'AVAILABLE':
      return 'โต๊ะว่าง';
    default:
      return 'ทั้งหมด';
  }
});

// Filtered cards
const filteredTableCards = computed(() => {
  let list = tableCards.value;

  if (selectedFilter.value === 'COOKING') {
    list = list.filter((c) => c.tableStatus === 'COOKING');
  } else if (selectedFilter.value === 'READY_TO_PAY') {
    list = list.filter((c) => c.tableStatus === 'READY_TO_PAY');
  } else if (selectedFilter.value === 'PAID') {
    list = list.filter((c) => c.tableStatus === 'PAID');
  } else if (selectedFilter.value === 'SEATED_NO_ORDER') {
    list = list.filter((c) => c.tableStatus === 'SEATED_NO_ORDER');
  } else if (selectedFilter.value === 'AVAILABLE') {
    list = list.filter((c) => c.tableStatus === 'AVAILABLE');
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((c) => c.table.name.toLowerCase().includes(q));
  }

  // Smart Sort: Ready to Pay -> Cooking -> Seated -> Paid -> Available -> Sort Order
  const statusPriority: Record<TableOperationalStatus, number> = {
    READY_TO_PAY: 1,
    COOKING: 2,
    SEATED_NO_ORDER: 3,
    PAID: 4,
    AVAILABLE: 5,
  };

  return list.sort((a, b) => {
    const pA = statusPriority[a.tableStatus];
    const pB = statusPriority[b.tableStatus];
    if (pA !== pB) return pA - pB;
    return a.table.sort_order - b.table.sort_order;
  });
});

function openBill(sessionId: string) {
  void router.push(`/owner/bills/${sessionId}`);
}

function resetFilter() {
  selectedFilter.value = 'ALL';
  searchQuery.value = '';
}

// Clear table prompt & action
function promptClearTable(item: TableCardItem) {
  tableToClear.value = item;
  showConfirmClearModal.value = true;
}

async function handleConfirmClearTable() {
  if (!tableToClear.value?.session) return;
  const sessionId = tableToClear.value.session.id;
  const tableName = tableToClear.value.table.name;

  isClearingDirect.value = true;
  clearingSessionId.value = sessionId;
  try {
    await closeTableSession(sessionId);
    showConfirmClearModal.value = false;
    tableToClear.value = null;
    notifySuccess(`เคลียร์ ${tableName} สำเร็จ พร้อมรับลูกค้าใหม่แล้ว`);
    await loadAllData();
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถเคลียร์โต๊ะได้');
  } finally {
    isClearingDirect.value = false;
    clearingSessionId.value = null;
  }
}

// Cancel seated session prompt & action
function promptCancelSession(item: TableCardItem) {
  tableToCancel.value = item;
  showConfirmCancelModal.value = true;
}

async function handleConfirmCancelSession() {
  if (!tableToCancel.value?.session) return;
  const sessionId = tableToCancel.value.session.id;
  const tableName = tableToCancel.value.table.name;

  isCancellingDirect.value = true;
  cancellingSessionId.value = sessionId;
  try {
    await closeTableSession(sessionId);
    showConfirmCancelModal.value = false;
    tableToCancel.value = null;
    notifySuccess(`ยกเลิกการเปิด ${tableName} สำเร็จ โต๊ะกลับเป็นสถานะว่างแล้ว`);
    await loadAllData();
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถยกเลิกเซสชันได้');
  } finally {
    isCancellingDirect.value = false;
    cancellingSessionId.value = null;
  }
}

// Transfer table prompt & action
function promptTransferTable(item: TableCardItem) {
  tableToTransfer.value = item;
  selectedTargetTableId.value = null;
  showTransferModal.value = true;
}

async function handleConfirmTransferTable() {
  if (!tableToTransfer.value?.session || !selectedTargetTableId.value) return;

  isTransferring.value = true;
  try {
    const res = await transferTableSession(
      tableToTransfer.value.session.id,
      selectedTargetTableId.value,
    );
    notifySuccess(
      `ย้ายจาก ${res.sourceTableName || tableToTransfer.value.table.name} ไปยัง ${res.targetTableName} เรียบร้อยแล้ว`,
    );
    showTransferModal.value = false;
    tableToTransfer.value = null;
    selectedTargetTableId.value = null;
    await loadAllData();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการย้ายโต๊ะ';
    notifyError(msg);
  } finally {
    isTransferring.value = false;
  }
}

async function showTableQR(table: TableWithQR) {
  selectedTable.value = table;
  if (table.active_qr) {
    const baseUrl = getAppUrl();
    selectedTableUrl.value = `${baseUrl}/t/${table.active_qr.public_token}`;
  } else {
    selectedTableUrl.value = '';
  }
  showQRModal.value = true;
  await nextTick();
  if (qrCanvasRef.value && selectedTableUrl.value) {
    void QRCode.toCanvas(qrCanvasRef.value, selectedTableUrl.value, { width: 180, margin: 2 });
  }
}

function copyTableLink() {
  if (!selectedTableUrl.value) return;
  void navigator.clipboard.writeText(selectedTableUrl.value);
  notifySuccess('คัดลอกลิงก์โต๊ะแล้ว');
}

function openSelectedTableLink() {
  if (!selectedTableUrl.value) return;
  window.open(selectedTableUrl.value, '_blank');
}

async function handleRegenerateQRFromModal() {
  if (!selectedTable.value) return;
  try {
    const newQr = await generateQRToken(selectedTable.value.id);
    selectedTable.value.active_qr = newQr;
    const baseUrl = getAppUrl();
    selectedTableUrl.value = `${baseUrl}/t/${newQr.public_token}`;
    await nextTick();
    if (qrCanvasRef.value && selectedTableUrl.value) {
      void QRCode.toCanvas(qrCanvasRef.value, selectedTableUrl.value, { width: 180, margin: 2 });
    }
    await loadAllData();
    notifySuccess('สร้าง QR Code ใหม่เรียบร้อยแล้ว');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'สร้าง QR ใหม่ไม่สำเร็จ');
  }
}

function openDirectCustomerLink(table: TableWithQR) {
  if (table.active_qr) {
    const baseUrl = getAppUrl();
    window.open(`${baseUrl}/t/${table.active_qr.public_token}`, '_blank');
  } else {
    void router.push('/owner/tables');
  }
}
</script>

<style scoped>
.bills-page {
  background: var(--color-background);
  min-height: 100vh;
}

.bills-container {
  max-width: 1320px;
  margin: 0 auto;
}

.page-title {
  color: var(--color-text-primary);
  line-height: 1.2;
}

.header-section {
  flex-wrap: wrap;
  gap: 12px;
}

.realtime-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 600;
  background: #dcfce7 !important;
  color: #15803d !important;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.pulse-dot--green {
  background-color: #16a34a;
  box-shadow: 0 0 0 rgba(22, 163, 74, 0.4);
  animation: pulse-ring-green 1.8s infinite;
}

@keyframes pulse-ring-green {
  0% {
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(22, 163, 74, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0);
  }
}

.manage-tables-btn {
  font-weight: 600;
  border-radius: var(--radius-pill);
}

/* Top Stats Overview (6 Cards) */
.stats-overview-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}

@media (max-width: 1200px) {
  .stats-overview-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-overview-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-subtle);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.stat-card--selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  box-shadow: 0 4px 12px rgba(224, 88, 54, 0.15);
}

.stat-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-label {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.stat-value .unit {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--color-text-secondary);
}

/* Revenue Overview Bar */
.revenue-overview-bar {
  background: linear-gradient(135deg, #ffffff 0%, #fff7f2 100%);
  border: 1px solid var(--color-primary-tint);
  border-radius: var(--radius-md);
  padding: 12px 18px;
  box-shadow: var(--shadow-subtle);
}

.revenue-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--color-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Toolbar & Filters */
.toolbar-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  box-shadow: var(--shadow-subtle);
}

.filter-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-pill-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
  font-family: var(--app-font-family);
  font-size: 0.82rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
}

.filter-pill-btn:hover {
  background: #ede5dc;
  color: var(--color-text-primary);
}

.filter-pill-btn.active {
  background: var(--color-primary);
  color: #ffffff;
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(224, 88, 54, 0.25);
}

.filter-pill-btn.active .dot-indicator {
  background-color: #ffffff !important;
}

.dot-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
  display: inline-block;
}

.dot-amber {
  background-color: #f59e0b;
}
.dot-green {
  background-color: #10b981;
}
.dot-purple {
  background-color: #9333ea;
}
.dot-cyan {
  background-color: #06b6d4;
}
.dot-grey {
  background-color: #9ca3af;
}

.search-input :deep(.q-field__control) {
  border-radius: var(--radius-pill);
  height: 38px;
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 16px;
}

.table-status-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 16px;
  box-shadow: var(--shadow-subtle);
  display: flex;
  flex-direction: column;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-height: 270px;
}

.table-status-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

/* Status-specific card accents */
.table-status-card--cooking {
  border-left: 5px solid #f59e0b;
  background: linear-gradient(180deg, #ffffff 0%, #fffdf8 100%);
}

.table-status-card--ready-to-pay {
  border-left: 5px solid #16a34a;
  background: linear-gradient(180deg, #ffffff 0%, #f7fdf9 100%);
  box-shadow: 0 4px 14px rgba(22, 163, 74, 0.08);
}

.table-status-card--paid {
  border-left: 5px solid #9333ea;
  background: linear-gradient(180deg, #ffffff 0%, #faf5ff 100%);
}

.table-status-card--seated-no-order {
  border-left: 5px solid #06b6d4;
  background: linear-gradient(180deg, #ffffff 0%, #f0fdfa 100%);
}

.table-status-card--available {
  border-style: dashed;
  border-color: #cbd5e1;
  background: #fbfbfc;
}

.card-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border-subtle);
  gap: 8px;
}

.table-icon-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.table-card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

/* High Visibility Status Badges */
.status-badge-container {
  display: flex;
  justify-content: flex-end;
}

.table-main-status-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  letter-spacing: 0.2px;
  white-space: nowrap;
}

.badge-status--ready-pay {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
}

.badge-status--cooking {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
}

.badge-status--paid {
  background: #f3e8ff;
  color: #7e22ce;
  border: 1px solid #d8b4fe;
}

.badge-status--seated {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.badge-status--available {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.live-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
  display: inline-block;
}

.live-status-dot--green {
  background-color: #16a34a;
  box-shadow: 0 0 0 rgba(22, 163, 74, 0.4);
  animation: pulse-ring-green 1.8s infinite;
}

.live-status-dot--amber {
  background-color: #f59e0b;
  box-shadow: 0 0 0 rgba(245, 158, 11, 0.4);
  animation: pulse-ring-amber 1.8s infinite;
}

.live-status-dot--purple {
  background-color: #9333ea;
  box-shadow: 0 0 0 rgba(147, 51, 234, 0.4);
  animation: pulse-ring-purple 1.8s infinite;
}

.live-status-dot--cyan {
  background-color: #06b6d4;
  box-shadow: 0 0 0 rgba(6, 182, 212, 0.4);
  animation: pulse-ring-cyan 1.8s infinite;
}

@keyframes pulse-ring-amber {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
  }
  70% {
    box-shadow: 0 0 0 5px rgba(245, 158, 11, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
  }
}

@keyframes pulse-ring-purple {
  0% {
    box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.7);
  }
  70% {
    box-shadow: 0 0 0 5px rgba(147, 51, 234, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(147, 51, 234, 0);
  }
}

@keyframes pulse-ring-cyan {
  0% {
    box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.7);
  }
  70% {
    box-shadow: 0 0 0 5px rgba(6, 182, 212, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(6, 182, 212, 0);
  }
}

/* Card Body Active */
.card-body-active {
  flex: 1;
}

.meta-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-tag {
  background: var(--color-surface-subtle);
  border-radius: var(--radius-xs);
  padding: 3px 8px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  font-weight: 500;
}

.serving-progress-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}

.progress-bar-track {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: var(--radius-pill);
  overflow: hidden;
  margin: 4px 0;
}

.progress-bar-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  transition: width 0.3s ease;
}

.stage-tag {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.stage-tag--served {
  background: #dcfce7;
  color: #166534;
}

.stage-tag--preparing {
  background: #fef3c7;
  color: #92400e;
}

.stage-tag--queued {
  background: #e0f2fe;
  color: #075985;
}

.bill-amount-box {
  background: var(--color-primary-soft);
  border: 1px solid var(--color-primary-tint);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  transition: all 0.2s ease;
}

.bill-amount-box--ready-pay {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.bill-amount-box--paid {
  background: #faf5ff;
  border-color: #e9d5ff;
}

.action-main-btn {
  height: 40px;
  font-weight: 700;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
}

.action-main-btn--ready-pay {
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
}

.action-main-btn--paid {
  box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
}

.action-main-btn--cancel {
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);
}

.action-secondary-btn {
  height: 38px;
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.action-icon-btn {
  background: var(--color-surface-subtle);
  border-radius: var(--radius-sm);
}

/* Empty Table Body */
.card-body-empty {
  flex: 1;
}

.empty-table-placeholder {
  padding: 16px 8px;
}

.empty-table-icon-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.font-size-11 {
  font-size: 0.72rem;
}

.font-weight-500 {
  font-weight: 500;
}

.font-weight-600 {
  font-weight: 600;
}

.border-radius-lg {
  border-radius: var(--radius-lg);
}

.clear-confirm-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f3e8ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel-confirm-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fee2e2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-preview-box {
  background: #ffffff;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-subtle);
}

.qr-canvas-element {
  display: block;
}

.empty-results-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-subtle);
}

.empty-icon-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.max-w-400 {
  max-width: 400px;
}

/* ─── Transfer Dialog Styles ─── */
.transfer-dialog-card {
  background: #ffffff;
}

.transfer-modal-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.transfer-source-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.no-available-tables-box {
  background: #fffbeb;
  border: 1px dashed #fcd34d;
  border-radius: var(--radius-md);
}

.available-tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding: 2px;
}

.target-table-item {
  background: #ffffff;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.target-table-item:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  transform: translateY(-1px);
}

.target-table-item--selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.target-table-icon {
  color: var(--color-text-secondary);
}

.target-table-item--selected .target-table-icon {
  color: var(--color-primary);
}

.target-table-name {
  font-size: 0.85rem;
  color: var(--color-text-primary);
}

.target-table-item--selected .target-table-name {
  color: var(--color-primary);
}

.target-table-free-badge {
  font-size: 10px;
  font-weight: 600;
  color: #15803d;
  background: #dcfce7;
  padding: 2px 6px;
  border-radius: 999px;
}

.transfer-hint-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: var(--radius-md);
}
</style>
