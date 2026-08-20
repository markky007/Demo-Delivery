<template>
  <q-page class="order-mgmt-page q-pa-md">
    <div class="mgmt-container">
      <!-- ─── 1. Header Bar ─────────────────────────────────────────── -->
      <div class="row items-center justify-between q-mb-md flex-wrap q-gutter-y-sm">
        <div class="col-12 col-sm-auto">
          <div class="row items-center q-gutter-sm">
            <div class="page-icon-wrapper">
              <q-icon name="assignment" size="26px" color="primary" />
            </div>
            <div>
              <div class="row items-center q-gutter-xs">
                <h5 class="q-my-none text-weight-bold page-title">จัดการออเดอร์</h5>
                <q-badge
                  rounded
                  :color="isRealtimeConnected ? 'green-1' : 'grey-3'"
                  :text-color="isRealtimeConnected ? 'green-9' : 'grey-7'"
                  class="q-px-sm py-xs text-caption text-weight-medium"
                >
                  <span
                    class="live-dot q-mr-xs"
                    :class="{ 'live-dot--active': isRealtimeConnected }"
                  />
                  {{ isRealtimeConnected ? 'เชื่อมต่อเรียลไทม์' : 'ออฟไลน์' }}
                </q-badge>
              </div>
              <p class="text-caption text-grey-7 q-mb-none q-mt-xs">
                ตรวจสอบประวัติ ค้นหาออเดอร์ และจัดการลบออเดอร์พร้อมล้างเซสชันโต๊ะ
              </p>
            </div>
          </div>
        </div>

        <div class="col-12 col-sm-auto row items-center q-gutter-sm">
          <!-- View Toggle: Cards vs Table -->
          <q-btn-toggle
            v-model="viewMode"
            rounded
            unelevated
            dense
            toggle-color="primary"
            color="white"
            text-color="grey-8"
            class="view-toggle shadow-subtle"
            :options="[
              { icon: 'grid_view', value: 'cards', slot: 'cards' },
              { icon: 'table_rows', value: 'table', slot: 'table' },
            ]"
          >
            <template v-slot:cards>
              <q-tooltip class="bg-dark">มุมมองการ์ด</q-tooltip>
            </template>
            <template v-slot:table>
              <q-tooltip class="bg-dark">มุมมองตาราง</q-tooltip>
            </template>
          </q-btn-toggle>

          <!-- Refresh Button -->
          <q-btn
            unelevated
            rounded
            no-caps
            color="white"
            text-color="grey-9"
            icon="refresh"
            :loading="isLoading"
            label="รีเฟรช"
            class="shadow-subtle action-header-btn"
            @click="loadOrders"
          />
        </div>
      </div>

      <!-- ─── 2. Metric Stats Summary Cards ──────────────────────────── -->
      <div class="stats-grid q-mb-lg">
        <!-- 1. Total Orders -->
        <div class="stat-card" @click="selectedStatus = 'ALL'">
          <div class="stat-card-icon stat-icon-total">
            <q-icon name="receipt_long" size="24px" />
          </div>
          <div class="stat-card-info">
            <span class="stat-label">ออเดอร์ทั้งหมด (ช่วงเวลานี้)</span>
            <div class="stat-value text-grey-9">
              {{ dateScopedOrders.length }} <span class="stat-unit">รายการ</span>
            </div>
          </div>
        </div>

        <!-- 2. In Kitchen / Active -->
        <div
          class="stat-card stat-clickable"
          :class="{ 'stat-card--highlight': inKitchenCount > 0 }"
          @click="selectedStatus = OrderStatus.PREPARING"
        >
          <div class="stat-card-icon stat-icon-kitchen">
            <q-icon name="soup_kitchen" size="24px" />
          </div>
          <div class="stat-card-info">
            <span class="stat-label">กำลังดำเนินการในครัว</span>
            <div class="stat-value text-amber-9">
              {{ inKitchenCount }} <span class="stat-unit">ออเดอร์</span>
            </div>
          </div>
        </div>

        <!-- 3. Served Orders -->
        <div class="stat-card stat-clickable" @click="selectedStatus = OrderStatus.SERVED">
          <div class="stat-card-icon stat-icon-served">
            <q-icon name="done_all" size="24px" />
          </div>
          <div class="stat-card-info">
            <span class="stat-label">เสิร์ฟครบเรียบร้อย</span>
            <div class="stat-value text-green-9">
              {{ servedCount }} <span class="stat-unit">ออเดอร์</span>
            </div>
          </div>
        </div>

        <!-- 4. Total Amount -->
        <div class="stat-card">
          <div class="stat-card-icon stat-icon-amount">
            <q-icon name="payments" size="24px" />
          </div>
          <div class="stat-card-info">
            <span class="stat-label">มูลค่ารวม (ตามที่แสดง)</span>
            <div class="stat-value text-primary font-mono">
              {{ formatPrice(totalRevenue) }}
            </div>
          </div>
        </div>
      </div>

      <!-- ─── 3. Filter & Search Panel ─────────────────────────────────── -->
      <div class="filter-panel q-mb-lg">
        <!-- Top Row: Date Presets & Custom inputs -->
        <div class="row items-center justify-between q-mb-md flex-wrap q-gutter-sm">
          <div class="row items-center q-gutter-xs date-presets">
            <span class="text-caption text-grey-7 text-weight-medium q-mr-xs">ช่วงเวลา:</span>
            <q-btn
              v-for="preset in datePresets"
              :key="preset.id"
              unelevated
              rounded
              dense
              no-caps
              size="sm"
              :label="preset.label"
              :class="selectedDatePreset === preset.id ? 'preset-btn--active' : 'preset-btn--idle'"
              class="q-px-md date-preset-btn"
              @click="applyDatePreset(preset.id)"
            />
          </div>

          <!-- Custom Date Pickers (Shown when custom is selected) -->
          <div
            v-if="selectedDatePreset === 'CUSTOM'"
            class="row items-center q-gutter-xs custom-date-box"
          >
            <q-input
              v-model="customDateFrom"
              outlined
              dense
              type="date"
              label="ตั้งแต่วันที่"
              class="date-input"
            />
            <span class="text-grey-6">-</span>
            <q-input
              v-model="customDateTo"
              outlined
              dense
              type="date"
              label="ถึงวันที่"
              class="date-input"
            />
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              icon="search"
              label="ค้นหา"
              size="sm"
              class="q-px-sm"
              @click="loadOrders"
            />
          </div>
        </div>

        <q-separator class="q-my-sm separator-subtle" />

        <!-- Status Filter Tabs / Pills -->
        <div class="row items-center justify-between q-my-sm flex-wrap q-gutter-y-sm">
          <div class="row items-center q-gutter-xs status-pills-row">
            <q-btn
              v-for="st in statusFilterOptions"
              :key="st.value"
              unelevated
              rounded
              dense
              no-caps
              size="sm"
              :class="selectedStatus === st.value ? st.activeClass : 'status-pill--idle'"
              class="q-px-md q-py-xs status-pill"
              @click="selectedStatus = st.value"
            >
              <q-icon :name="st.icon" size="15px" class="q-mr-xs" />
              <span>{{ st.label }}</span>
              <span class="status-count-badge q-ml-xs">
                {{ getStatusCount(st.value) }}
              </span>
            </q-btn>
          </div>

          <!-- Reset Filter Button if any filter active -->
          <q-btn
            v-if="isAnyFilterActive"
            flat
            dense
            no-caps
            color="negative"
            icon="clear_all"
            label="ล้างตัวกรอง"
            size="sm"
            class="reset-filter-btn"
            @click="resetFilters"
          />
        </div>

        <q-separator class="q-my-sm separator-subtle" />

        <!-- Bottom Controls Row: Search, Table Filter, Sort -->
        <div class="row items-center q-gutter-sm flex-wrap q-pt-xs">
          <!-- Search input -->
          <div class="col-12 col-md-4">
            <q-input
              v-model="searchQuery"
              outlined
              dense
              rounded
              clearable
              placeholder="ค้นหาเลขคิว (#01), โต๊ะ, ชื่อลูกค้า, เมนูอาหาร..."
              class="search-input"
            >
              <template v-slot:prepend>
                <q-icon name="search" size="18px" color="grey-6" />
              </template>
            </q-input>
          </div>

          <!-- Dining / Table filter -->
          <div class="col-12 col-sm-6 col-md-3">
            <q-select
              v-model="selectedTableFilter"
              :options="tableFilterOptions"
              outlined
              dense
              rounded
              emit-value
              map-options
              label="กรองโต๊ะ / สั่งกลับบ้าน"
              class="filter-select"
            >
              <template v-slot:prepend>
                <q-icon name="table_restaurant" size="18px" color="grey-6" />
              </template>
            </q-select>
          </div>

          <!-- Sort filter -->
          <div class="col-12 col-sm-6 col-md-3">
            <q-select
              v-model="sortBy"
              :options="sortOptions"
              outlined
              dense
              rounded
              emit-value
              map-options
              label="เรียงลำดับ"
              class="filter-select"
            >
              <template v-slot:prepend>
                <q-icon name="sort" size="18px" color="grey-6" />
              </template>
            </q-select>
          </div>

          <!-- Result Count Info -->
          <div class="col-12 col-md text-right gt-sm text-caption text-grey-7">
            พบ <strong>{{ filteredOrders.length }}</strong> รายการ
          </div>
        </div>
      </div>

      <!-- ─── 4. Orders Content ───────────────────────────────────────── -->
      <!-- Loading State -->
      <div v-if="isLoading" class="q-py-md">
        <LoadingSkeleton type="table" :count="6" />
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredOrders.length === 0" class="empty-wrap q-py-xl">
        <EmptyState
          icon="manage_search"
          title="ไม่พบรายการออเดอร์"
          description="ไม่พบรายการออเดอร์ที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองที่เลือก"
        >
          <template #action>
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              label="ล้างตัวกรองทั้งหมด"
              class="q-mt-sm"
              @click="resetFilters"
            />
          </template>
        </EmptyState>
      </div>

      <!-- ─── Mode A: Card Grid View ─────────────────────────────────── -->
      <div v-else-if="viewMode === 'cards'" class="order-cards-grid">
        <div
          v-for="order in filteredOrders"
          :key="order.id"
          class="order-card column justify-between"
          :class="`order-card--${order.status.toLowerCase()}`"
        >
          <!-- Card Top Bar: Queue, Table, Status -->
          <div>
            <div class="order-card-header row items-center justify-between q-mb-sm">
              <!-- Queue Number Pill -->
              <div class="queue-chip">
                <span class="queue-hash">#</span>
                <span class="queue-num">{{ formatQueueNumOnly(order.queue_number) }}</span>
              </div>

              <!-- Table / Destination Badge -->
              <div
                class="table-chip"
                :class="
                  order.table_session?.customer_name ? 'table-chip--takeaway' : 'table-chip--dinein'
                "
              >
                <q-icon
                  :name="order.table_session?.customer_name ? 'shopping_bag' : 'table_restaurant'"
                  size="15px"
                  class="q-mr-xs"
                />
                <span class="text-weight-bold ellipsis text-caption">
                  {{ getTableDisplayName(order) }}
                </span>
              </div>

              <!-- Order Status Badge -->
              <StatusBadge :status="order.status" />
            </div>

            <!-- Time and Item Count Row -->
            <div class="row items-center justify-between text-caption text-grey-6 q-mb-sm q-px-xs">
              <div class="row items-center q-gutter-xs">
                <q-icon name="schedule" size="13px" />
                <span>{{ formatTime(order.created_at) }}</span>
                <span class="text-grey-4">•</span>
                <span>{{ formatElapsed(order.created_at) }}</span>
              </div>
              <div class="text-weight-medium">{{ order.items?.length || 0 }} รายการ</div>
            </div>

            <q-separator class="separator-subtle q-mb-sm" />

            <!-- Items List -->
            <div class="order-card-items-list">
              <div
                v-for="(item, idx) in order.items"
                :key="item.id || idx"
                class="order-card-item-row"
              >
                <div class="row items-start q-gutter-xs full-width">
                  <span class="item-quantity-pill">{{ item.quantity }}x</span>
                  <div class="col">
                    <div class="row items-center justify-between">
                      <span class="text-weight-bold text-grey-9 item-title">
                        {{ item.snapshot_name }}
                      </span>
                      <span class="text-caption text-grey-7 font-mono">
                        {{ formatPrice(item.subtotal) }}
                      </span>
                    </div>

                    <!-- Options list if any -->
                    <div
                      v-if="item.options && item.options.length > 0"
                      class="options-tags-row q-mt-xs"
                    >
                      <span v-for="opt in item.options" :key="opt.id" class="opt-tag">
                        {{ opt.snapshot_option_name }}
                      </span>
                    </div>

                    <!-- Special Cooking Note -->
                    <div v-if="item.special_instruction" class="note-box q-mt-xs">
                      <q-icon name="edit_note" size="13px" color="orange-8" class="q-mr-xs" />
                      <span class="text-orange-9 text-caption">{{ item.special_instruction }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Card Bottom Bar: Total & Actions -->
          <div class="order-card-footer q-mt-md">
            <q-separator class="separator-subtle q-mb-sm" />
            <div class="row items-center justify-between">
              <div>
                <span class="text-caption text-grey-6 block">ยอดรวม</span>
                <span class="text-subtitle1 text-weight-bold text-primary font-mono">
                  {{ formatPrice(order.total_amount) }}
                </span>
              </div>

              <!-- Action buttons -->
              <div class="row items-center q-gutter-xs">
                <q-btn
                  flat
                  rounded
                  dense
                  no-caps
                  size="sm"
                  color="primary"
                  icon="visibility"
                  label="ดูรายละเอียด"
                  class="q-px-sm"
                  @click="openOrderDetails(order)"
                />
                <q-btn
                  flat
                  round
                  dense
                  color="negative"
                  icon="delete_outline"
                  size="sm"
                  class="delete-btn-hover"
                  @click="promptDeleteOrder(order)"
                >
                  <q-tooltip class="bg-negative">ลบออเดอร์และล้างเซสชันโต๊ะ</q-tooltip>
                </q-btn>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Mode B: Table View ─────────────────────────────────────── -->
      <div v-else class="orders-table-wrapper">
        <q-table
          :rows="filteredOrders"
          :columns="columns"
          row-key="id"
          flat
          bordered
          class="orders-table"
          :rows-per-page-options="[15, 30, 50, 100]"
          :pagination="{ rowsPerPage: 15 }"
        >
          <!-- Cell: Queue Number -->
          <template v-slot:body-cell-queue_number="props">
            <q-td :props="props">
              <div class="queue-badge-pill">
                <span class="queue-badge-hash">#</span>
                <span class="queue-badge-num">{{
                  formatQueueNumOnly(props.row.queue_number)
                }}</span>
              </div>
            </q-td>
          </template>

          <!-- Cell: Table / Destination -->
          <template v-slot:body-cell-table="props">
            <q-td :props="props">
              <div class="column">
                <div class="row items-center q-gutter-xs">
                  <q-icon
                    :name="
                      props.row.table_session?.customer_name ? 'shopping_bag' : 'table_restaurant'
                    "
                    size="16px"
                    :color="props.row.table_session?.customer_name ? 'orange-9' : 'primary'"
                  />
                  <span class="text-weight-bold text-grey-9">
                    {{ getTableDisplayName(props.row) }}
                  </span>
                </div>
                <div class="text-caption text-grey-6 row items-center q-gutter-xs q-mt-xs">
                  <q-icon name="schedule" size="12px" />
                  <span>{{ formatTime(props.row.created_at) }}</span>
                  <span class="text-grey-5">•</span>
                  <span>{{ formatElapsed(props.row.created_at) }}</span>
                </div>
              </div>
            </q-td>
          </template>

          <!-- Cell: Items Summary -->
          <template v-slot:body-cell-items="props">
            <q-td :props="props" class="items-cell">
              <div class="items-summary-list">
                <div
                  v-for="(item, idx) in props.row.items"
                  :key="item.id || idx"
                  class="item-summary-line"
                >
                  <span class="item-qty-badge">{{ item.quantity }}x</span>
                  <span class="item-name text-weight-medium text-grey-9">
                    {{ item.snapshot_name }}
                  </span>
                  <!-- Options pills if any -->
                  <div
                    v-if="item.options && item.options.length > 0"
                    class="item-options-inline text-caption text-grey-7"
                  >
                    ({{
                      item.options.map((o: OrderItemOption) => o.snapshot_option_name).join(', ')
                    }})
                  </div>
                  <!-- Special note if any -->
                  <div v-if="item.special_instruction" class="item-note-inline">
                    <q-icon name="edit_note" size="13px" color="orange-8" class="q-mr-xs" />
                    <span class="text-orange-9 text-caption">{{ item.special_instruction }}</span>
                  </div>
                </div>
              </div>
            </q-td>
          </template>

          <!-- Cell: Total Amount -->
          <template v-slot:body-cell-total_amount="props">
            <q-td :props="props">
              <div class="text-weight-bold text-primary font-mono text-subtitle2">
                {{ formatPrice(props.row.total_amount) }}
              </div>
              <div class="text-caption text-grey-6">{{ props.row.items?.length || 0 }} รายการ</div>
            </q-td>
          </template>

          <!-- Cell: Status -->
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <StatusBadge :status="props.row.status" />
            </q-td>
          </template>

          <!-- Cell: Actions -->
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <div class="row items-center justify-end q-gutter-xs">
                <!-- View Details -->
                <q-btn
                  flat
                  round
                  dense
                  color="primary"
                  icon="visibility"
                  size="sm"
                  class="action-btn-icon"
                  @click="openOrderDetails(props.row)"
                >
                  <q-tooltip class="bg-dark">ดูรายละเอียดออเดอร์</q-tooltip>
                </q-btn>

                <!-- Delete & Clear Order -->
                <q-btn
                  flat
                  round
                  dense
                  color="negative"
                  icon="delete_outline"
                  size="sm"
                  class="action-btn-icon action-btn-delete"
                  @click="promptDeleteOrder(props.row)"
                >
                  <q-tooltip class="bg-negative">ลบออเดอร์และล้างเซสชันโต๊ะ</q-tooltip>
                </q-btn>
              </div>
            </q-td>
          </template>
        </q-table>
      </div>

      <!-- ─── 5. Order Detail Modal Dialog ────────────────────────────── -->
      <q-dialog v-model="showDetailModal" transition-show="scale" transition-hide="scale">
        <q-card v-if="selectedOrder" class="detail-card">
          <!-- Modal Header -->
          <q-card-section class="detail-header row items-center justify-between">
            <div class="row items-center q-gutter-sm">
              <div class="detail-queue-badge">
                #{{ formatQueueNumOnly(selectedOrder.queue_number) }}
              </div>
              <div>
                <div class="text-subtitle1 text-weight-bold text-grey-9">
                  รายละเอียดออเดอร์ #{{ formatQueueNumOnly(selectedOrder.queue_number) }}
                </div>
                <div class="text-caption text-grey-7">
                  {{ getTableDisplayName(selectedOrder) }}
                </div>
              </div>
            </div>
            <q-btn flat round dense icon="close" v-close-popup color="grey-7" />
          </q-card-section>

          <q-separator class="separator-subtle" />

          <!-- Modal Body -->
          <q-card-section class="q-pa-md scroll detail-body">
            <!-- Info chips -->
            <div class="info-chips-row q-mb-md">
              <div class="info-chip">
                <span class="info-chip-label">สถานะออเดอร์</span>
                <StatusBadge :status="selectedOrder.status" />
              </div>
              <div class="info-chip">
                <span class="info-chip-label">เวลาที่สั่ง</span>
                <span class="text-caption text-weight-medium text-grey-9">
                  {{ formatDateTime(selectedOrder.created_at) }}
                </span>
              </div>
              <div class="info-chip">
                <span class="info-chip-label">ระยะเวลา</span>
                <span class="text-caption text-weight-medium text-grey-8">
                  {{ formatElapsed(selectedOrder.created_at) }}
                </span>
              </div>
            </div>

            <!-- Items List -->
            <div class="text-weight-bold text-subtitle2 text-grey-9 q-mb-sm">
              รายการอาหาร ({{ selectedOrder.items?.length || 0 }} รายการ)
            </div>

            <div class="detail-items-list q-mb-md">
              <div v-for="item in selectedOrder.items" :key="item.id" class="detail-item-row">
                <div class="col">
                  <div class="row items-center q-gutter-xs">
                    <span class="text-weight-bold text-primary">{{ item.quantity }}x</span>
                    <span class="text-weight-medium text-grey-9">{{ item.snapshot_name }}</span>
                  </div>
                  <!-- Options -->
                  <div
                    v-if="item.options && item.options.length > 0"
                    class="detail-options-list text-caption text-grey-7 q-mt-xs"
                  >
                    <div
                      v-for="opt in item.options"
                      :key="opt.id"
                      class="row items-center justify-between option-subrow"
                    >
                      <span>• {{ opt.snapshot_group_name }}: {{ opt.snapshot_option_name }}</span>
                      <span v-if="opt.snapshot_price_adjustment > 0" class="text-grey-6 font-mono">
                        +{{ formatPrice(opt.snapshot_price_adjustment) }}
                      </span>
                    </div>
                  </div>
                  <!-- Special note -->
                  <div
                    v-if="item.special_instruction"
                    class="q-mt-xs text-orange-9 text-caption bg-orange-1 q-pa-xs rounded-borders"
                  >
                    <q-icon name="edit_note" size="14px" class="q-mr-xs" />
                    โน้ต: {{ item.special_instruction }}
                  </div>
                </div>

                <!-- Subtotal -->
                <div class="text-weight-bold text-grey-9 font-mono q-ml-md self-start">
                  {{ formatPrice(item.subtotal) }}
                </div>
              </div>
            </div>

            <!-- Summary Total -->
            <div class="detail-total-box row items-center justify-between q-pa-md">
              <span class="text-weight-bold text-grey-8">ยอดเงินรวมทั้งหมด</span>
              <span class="text-h6 text-weight-bold text-primary font-mono">
                {{ formatPrice(selectedOrder.total_amount) }}
              </span>
            </div>

            <!-- Technical IDs -->
            <div
              class="technical-info q-mt-md q-pa-sm text-caption text-grey-6 bg-grey-1 rounded-borders"
            >
              <div>
                <strong>Order ID:</strong> <span class="font-mono">{{ selectedOrder.id }}</span>
              </div>
              <div v-if="selectedOrder.table_session_id">
                <strong>Session ID:</strong>
                <span class="font-mono">{{ selectedOrder.table_session_id }}</span>
              </div>
            </div>
          </q-card-section>

          <q-separator class="separator-subtle" />

          <!-- Modal Actions -->
          <q-card-actions align="between" class="q-pa-md">
            <q-btn
              flat
              no-caps
              color="negative"
              icon="delete_outline"
              label="ลบออเดอร์นี้"
              @click="promptDeleteOrderFromModal"
            />
            <q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              label="ปิดหน้าต่าง"
              class="q-px-lg"
              v-close-popup
            />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- ─── 6. Delete Confirmation Dialog ───────────────────────────── -->
      <q-dialog
        v-model="showDeleteDialog"
        persistent
        transition-show="scale"
        transition-hide="scale"
      >
        <q-card v-if="orderToDelete" class="delete-dialog-card">
          <q-card-section class="text-center q-pt-lg q-pb-none">
            <div class="delete-icon-wrapper q-mx-auto q-mb-md">
              <q-icon name="delete_forever" size="36px" color="negative" />
            </div>
            <div class="text-h6 text-weight-bold text-grey-9">ยืนยันการลบออเดอร์?</div>
            <div class="text-subtitle2 text-primary q-mt-xs font-mono">
              คิว #{{ formatQueueNumOnly(orderToDelete.queue_number) }} ({{
                getTableDisplayName(orderToDelete)
              }})
            </div>
          </q-card-section>

          <q-card-section class="q-px-lg q-py-md">
            <div class="delete-warning-box q-pa-md rounded-borders">
              <div class="row items-center text-negative text-weight-bold q-mb-xs">
                <q-icon name="warning" size="18px" class="q-mr-xs" />
                คำเตือน: การลบข้อมูลทั้งหมดที่เกี่ยวข้อง (Clear All)
              </div>
              <p class="text-caption text-grey-8 q-mb-xs">
                การดำเนินการนี้จะทำการลบข้อมูลออกจากระบบอย่างถาวร ได้แก่:
              </p>
              <ul class="delete-checklist q-my-none text-caption text-grey-7">
                <li>ลบรายการออเดอร์และรายการอาหารทั้งหมดในออเดอร์นี้</li>
                <li>ลบบิล (Bill) และยอดรวมการชำระเงินที่เกี่ยวข้อง</li>
                <li>
                  ล้างเซสชันของโต๊ะ (Table Session) คืนสถานะ <strong>"โต๊ะว่าง"</strong> ทันที
                </li>
              </ul>
            </div>
          </q-card-section>

          <q-card-actions align="center" class="q-pb-lg q-px-lg q-gutter-sm">
            <q-btn
              flat
              rounded
              no-caps
              label="ยกเลิก"
              color="grey-7"
              class="q-px-lg"
              :disable="isDeleting"
              v-close-popup
            />
            <q-btn
              unelevated
              rounded
              no-caps
              color="negative"
              icon="delete"
              :loading="isDeleting"
              label="ยืนยันการลบและล้างข้อมูล"
              class="q-px-lg"
              @click="handleConfirmDeleteOrder"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from 'src/services/supabase';
import { fetchManageOrders, deleteOrderAndSession } from 'src/services/orderService';
import { fetchTables } from 'src/services/tableService';
import type { OrderWithItems, TableWithQR, OrderItemOption } from 'src/types/database';
import { OrderStatus } from 'src/types/enums';
import { formatPrice, formatDateTime, formatTime, formatElapsed } from 'src/utils/formatters';
import StatusBadge from 'src/components/StatusBadge.vue';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import EmptyState from 'src/components/EmptyState.vue';

const $q = useQuasar();

// ─── View Mode & UI State ──────────────────────────────────────────────
const viewMode = ref<'cards' | 'table'>('cards');
const isLoading = ref(true);
const isDeleting = ref(false);
const isRealtimeConnected = ref(false);

// Raw Data loaded for the current Date Range
const dateScopedOrders = ref<OrderWithItems[]>([]);
const tables = ref<TableWithQR[]>([]);

// ─── Filter States ─────────────────────────────────────────────────────
const selectedDatePreset = ref<
  'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'
>('TODAY');
const customDateFrom = ref('');
const customDateTo = ref('');

const selectedStatus = ref<OrderStatus | 'ALL'>('ALL');
const selectedTableFilter = ref<string>('ALL');
const searchQuery = ref('');
const sortBy = ref<'CREATED_DESC' | 'CREATED_ASC' | 'QUEUE_ASC' | 'QUEUE_DESC' | 'AMOUNT_DESC'>(
  'CREATED_DESC',
);

// ─── Modals ────────────────────────────────────────────────────────────
const showDetailModal = ref(false);
const selectedOrder = ref<OrderWithItems | null>(null);

const showDeleteDialog = ref(false);
const orderToDelete = ref<OrderWithItems | null>(null);

// Realtime
let realtimeChannel: RealtimeChannel | null = null;

// ─── Options Configurations ────────────────────────────────────────────
const datePresets = [
  { id: 'TODAY', label: 'วันนี้' },
  { id: 'YESTERDAY', label: 'เมื่อวาน' },
  { id: 'LAST_7_DAYS', label: '7 วันล่าสุด' },
  { id: 'THIS_MONTH', label: 'เดือนนี้' },
  { id: 'ALL', label: 'ทั้งหมด' },
  { id: 'CUSTOM', label: 'กำหนดเอง...' },
] as const;

const statusFilterOptions = [
  { value: 'ALL', label: 'ทั้งหมด', icon: 'list_alt', activeClass: 'status-pill--active-all' },
  {
    value: OrderStatus.QUEUED,
    label: 'รอคิว',
    icon: 'schedule',
    activeClass: 'status-pill--active-queued',
  },
  {
    value: OrderStatus.PREPARING,
    label: 'กำลังปรุง',
    icon: 'soup_kitchen',
    activeClass: 'status-pill--active-preparing',
  },
  {
    value: OrderStatus.PREPARED,
    label: 'ปรุงเสร็จ',
    icon: 'check_circle_outline',
    activeClass: 'status-pill--active-prepared',
  },
  {
    value: OrderStatus.SERVED,
    label: 'เสิร์ฟแล้ว',
    icon: 'done_all',
    activeClass: 'status-pill--active-served',
  },
] as const;

const sortOptions = [
  { label: 'เวลาสั่งล่าสุด (ใหม่ → เก่า)', value: 'CREATED_DESC' },
  { label: 'เวลาสั่งแรกสุด (เก่า → ใหม่)', value: 'CREATED_ASC' },
  { label: 'เลขคิวน้อย → มาก (#1, #2...)', value: 'QUEUE_ASC' },
  { label: 'เลขคิวมาก → น้อย', value: 'QUEUE_DESC' },
  { label: 'ยอดเงินสูงสุด → ต่ำสุด', value: 'AMOUNT_DESC' },
];

const tableFilterOptions = computed(() => {
  const opts: { label: string; value: string }[] = [
    { label: 'ทุกโต๊ะ / ทุกประเภท', value: 'ALL' },
    { label: '🍽️ เฉพาะทานที่ร้าน (ทุกโต๊ะ)', value: 'DINE_IN' },
    { label: '🥡 เฉพาะสั่งกลับบ้าน', value: 'TAKEAWAY' },
  ];

  for (const t of tables.value) {
    opts.push({ label: `โต๊ะ: ${t.name}`, value: `TABLE_${t.id}` });
  }

  return opts;
});

// ─── Table Columns ─────────────────────────────────────────────────────
const columns = [
  {
    name: 'queue_number',
    label: 'คิว',
    field: 'queue_number',
    align: 'left' as const,
    sortable: true,
    style: 'width: 90px',
  },
  {
    name: 'table',
    label: 'โต๊ะ / ปลายทาง',
    field: (row: OrderWithItems) => getTableDisplayName(row),
    align: 'left' as const,
    sortable: true,
    style: 'min-width: 170px',
  },
  {
    name: 'items',
    label: 'รายการอาหาร',
    field: 'items',
    align: 'left' as const,
    style: 'min-width: 280px',
  },
  {
    name: 'total_amount',
    label: 'ยอดรวม',
    field: 'total_amount',
    align: 'right' as const,
    sortable: true,
    style: 'width: 120px',
  },
  {
    name: 'status',
    label: 'สถานะ',
    field: 'status',
    align: 'center' as const,
    sortable: true,
    style: 'width: 140px',
  },
  {
    name: 'actions',
    label: 'จัดการ',
    field: 'id',
    align: 'right' as const,
    style: 'width: 110px',
  },
];

// ─── Active Filter Checker ─────────────────────────────────────────────
const isAnyFilterActive = computed(() => {
  return (
    selectedStatus.value !== 'ALL' ||
    selectedTableFilter.value !== 'ALL' ||
    Boolean(searchQuery.value && searchQuery.value.trim()) ||
    selectedDatePreset.value !== 'TODAY'
  );
});

// ─── Reactive Filtered & Sorted Orders ─────────────────────────────────
const filteredOrders = computed(() => {
  let list = [...dateScopedOrders.value];

  // 1. Status Filter
  if (selectedStatus.value !== 'ALL') {
    list = list.filter((o) => o.status === selectedStatus.value);
  }

  // 2. Table / Dining Type Filter
  if (selectedTableFilter.value === 'DINE_IN') {
    list = list.filter((o) => !o.table_session?.customer_name);
  } else if (selectedTableFilter.value === 'TAKEAWAY') {
    list = list.filter((o) => Boolean(o.table_session?.customer_name));
  } else if (selectedTableFilter.value.startsWith('TABLE_')) {
    const targetTableId = selectedTableFilter.value.replace('TABLE_', '');
    list = list.filter((o) => o.table_session?.table?.id === targetTableId);
  }

  // 3. Search Query Filter
  if (searchQuery.value && searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((order) => {
      // Queue number
      const qNumStr = String(order.queue_number);
      if (qNumStr.includes(q) || `#${qNumStr}`.includes(q)) return true;

      // Table name / Customer name
      const tableName = order.table_session?.table?.name?.toLowerCase() || '';
      const custName = order.table_session?.customer_name?.toLowerCase() || '';
      if (tableName.includes(q) || custName.includes(q)) return true;

      // Item names & instructions
      if (
        order.items?.some(
          (it) =>
            it.snapshot_name.toLowerCase().includes(q) ||
            (it.special_instruction && it.special_instruction.toLowerCase().includes(q)),
        )
      ) {
        return true;
      }

      // Order ID
      if (order.id.toLowerCase().includes(q)) return true;

      return false;
    });
  }

  // 4. Sorting
  list.sort((a, b) => {
    switch (sortBy.value) {
      case 'CREATED_ASC':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'QUEUE_ASC':
        return a.queue_number - b.queue_number;
      case 'QUEUE_DESC':
        return b.queue_number - a.queue_number;
      case 'AMOUNT_DESC':
        return (b.total_amount || 0) - (a.total_amount || 0);
      case 'CREATED_DESC':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return list;
});

// ─── Status Counts (Based on current Date Range) ───────────────────────
function getStatusCount(status: OrderStatus | 'ALL'): number {
  if (status === 'ALL') return dateScopedOrders.value.length;
  return dateScopedOrders.value.filter((o) => o.status === status).length;
}

// ─── Computed Stats ────────────────────────────────────────────────────
const inKitchenCount = computed(
  () =>
    dateScopedOrders.value.filter(
      (o) =>
        o.status === OrderStatus.QUEUED ||
        o.status === OrderStatus.PREPARING ||
        o.status === OrderStatus.PREPARED,
    ).length,
);

const servedCount = computed(
  () => dateScopedOrders.value.filter((o) => o.status === OrderStatus.SERVED).length,
);

const totalRevenue = computed(() =>
  filteredOrders.value.reduce((sum, o) => sum + (o.total_amount || 0), 0),
);

// ─── Helpers ───────────────────────────────────────────────────────────
function formatQueueNumOnly(num: number): string {
  return String(num).padStart(3, '0');
}

function getTableDisplayName(order: OrderWithItems): string {
  if (order.table_session?.customer_name) {
    return `สั่งกลับบ้าน (${order.table_session.customer_name})`;
  }
  return order.table_session?.table?.name || 'ไม่ระบุโต๊ะ';
}

function toLocalYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Date Preset Handler ───────────────────────────────────────────────
function applyDatePreset(
  preset: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM',
) {
  selectedDatePreset.value = preset;
  const now = new Date();

  if (preset === 'TODAY') {
    customDateFrom.value = toLocalYMD(now);
    customDateTo.value = toLocalYMD(now);
  } else if (preset === 'YESTERDAY') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    customDateFrom.value = toLocalYMD(yesterday);
    customDateTo.value = toLocalYMD(yesterday);
  } else if (preset === 'LAST_7_DAYS') {
    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 6);
    customDateFrom.value = toLocalYMD(past7);
    customDateTo.value = toLocalYMD(now);
  } else if (preset === 'THIS_MONTH') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    customDateFrom.value = toLocalYMD(firstDay);
    customDateTo.value = toLocalYMD(now);
  } else if (preset === 'ALL') {
    customDateFrom.value = '';
    customDateTo.value = '';
  }

  void loadOrders();
}

function resetFilters() {
  selectedStatus.value = 'ALL';
  selectedTableFilter.value = 'ALL';
  searchQuery.value = '';
  sortBy.value = 'CREATED_DESC';
  applyDatePreset('TODAY');
}

// ─── Data Loading ──────────────────────────────────────────────────────
async function loadOrders() {
  isLoading.value = true;
  try {
    const fetched = await fetchManageOrders({
      dateFrom: customDateFrom.value ? customDateFrom.value : undefined,
      dateTo: customDateTo.value ? customDateTo.value : undefined,
      status: 'ALL', // Fetch all for the date range so client filtering & counts are accurate
    });
    dateScopedOrders.value = fetched;
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : 'ไม่สามารถโหลดรายการออเดอร์ได้',
      position: 'top',
    });
  } finally {
    isLoading.value = false;
  }
}

async function loadInitialData() {
  applyDatePreset('TODAY');
  try {
    const tbls = await fetchTables();
    tables.value = tbls;
  } catch {
    // Ignore silent table load error
  }
  setupRealtime();
}

// ─── Realtime Subscription ─────────────────────────────────────────────
function setupRealtime() {
  if (realtimeChannel) void supabase.removeChannel(realtimeChannel);

  realtimeChannel = supabase
    .channel('realtime:owner_order_mgmt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      void loadOrders();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => {
      void loadOrders();
    })
    .subscribe((status) => {
      isRealtimeConnected.value = (status as string) === 'SUBSCRIBED';
    });
}

// ─── Actions: View Details ─────────────────────────────────────────────
function openOrderDetails(order: OrderWithItems) {
  selectedOrder.value = order;
  showDetailModal.value = true;
}

// ─── Actions: Delete Order & Cascade Session ────────────────────────────
function promptDeleteOrder(order: OrderWithItems) {
  orderToDelete.value = order;
  showDeleteDialog.value = true;
}

function promptDeleteOrderFromModal() {
  if (!selectedOrder.value) return;
  orderToDelete.value = selectedOrder.value;
  showDetailModal.value = false;
  showDeleteDialog.value = true;
}

async function handleConfirmDeleteOrder() {
  if (!orderToDelete.value) return;
  const targetOrder = orderToDelete.value;
  const qNum = formatQueueNumOnly(targetOrder.queue_number);
  const targetName = getTableDisplayName(targetOrder);

  isDeleting.value = true;
  try {
    const res = await deleteOrderAndSession(targetOrder.id);
    if (res.success) {
      $q.notify({
        type: 'positive',
        message: `ลบออเดอร์คิว #${qNum} (${targetName}) และเคลียร์ข้อมูลเรียบร้อยแล้ว`,
        icon: 'check_circle',
        position: 'top',
      });
      showDeleteDialog.value = false;
      orderToDelete.value = null;
      await loadOrders();
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบออเดอร์',
      icon: 'error',
      position: 'top',
    });
  } finally {
    isDeleting.value = false;
  }
}

// ─── Lifecycle ─────────────────────────────────────────────────────────
onMounted(() => {
  void loadInitialData();
});

onUnmounted(() => {
  if (realtimeChannel) void supabase.removeChannel(realtimeChannel);
});
</script>

<style scoped>
.order-mgmt-page {
  background-color: var(--color-background);
  min-height: 100vh;
}

.mgmt-container {
  max-width: 1440px;
  margin: 0 auto;
}

.page-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-title {
  color: var(--color-text-primary);
  font-size: 1.35rem;
  line-height: 1.2;
}

.live-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #9e9e9e;
}

.live-dot--active {
  background-color: #4caf50;
  box-shadow: 0 0 6px #4caf50;
  animation: pulse-dot 2s infinite ease-in-out;
}

@keyframes pulse-dot {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

.shadow-subtle {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.separator-subtle {
  background: var(--color-border-subtle);
}

.action-header-btn {
  border: 1px solid var(--color-border);
}

.view-toggle {
  border: 1px solid var(--color-border);
}

/* ─── Top Stats Grid ─── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.stat-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.2s ease;
}

.stat-clickable {
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.stat-card--highlight {
  border-color: #ffe082;
  background: #fffdf5;
}

.stat-card-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-total {
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
}

.stat-icon-kitchen {
  background: #fff8e1;
  color: #f57f17;
}

.stat-icon-served {
  background: #e8f5e9;
  color: #2e7d32;
}

.stat-icon-amount {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.stat-card-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-unit {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-text-secondary);
}

/* ─── Filter Panel ─── */
.filter-panel {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.date-presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.date-preset-btn {
  transition: all 0.15s ease;
}

.preset-btn--active {
  background: var(--color-primary) !important;
  color: #ffffff !important;
  font-weight: 600;
}

.preset-btn--idle {
  background: var(--color-surface-subtle) !important;
  color: var(--color-text-secondary) !important;
  border: 1px solid var(--color-border);
}

.custom-date-box {
  background: var(--color-surface-subtle);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.date-input {
  width: 140px;
}

.search-input {
  width: 100%;
}

.filter-select {
  width: 100%;
}

/* ─── Status Pills ─── */
.status-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-pill {
  border-radius: var(--radius-pill);
  font-weight: 600;
  transition: all 0.15s ease;
}

.status-pill--idle {
  background: var(--color-surface-subtle) !important;
  color: var(--color-text-secondary) !important;
  border: 1px solid var(--color-border);
}

.status-pill--active-all {
  background: var(--color-text-primary) !important;
  color: #ffffff !important;
}

.status-pill--active-queued {
  background: #f59e0b !important;
  color: #ffffff !important;
}

.status-pill--active-preparing {
  background: #3b82f6 !important;
  color: #ffffff !important;
}

.status-pill--active-prepared {
  background: #06b6d4 !important;
  color: #ffffff !important;
}

.status-pill--active-served {
  background: #10b981 !important;
  color: #ffffff !important;
}

.status-count-badge {
  background: rgba(0, 0, 0, 0.12);
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  font-size: 0.72rem;
}

.reset-filter-btn {
  font-weight: 600;
}

/* ─── Order Cards Grid ─── */
.order-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.order-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: #cbd5e1;
}

.order-card--preparing {
  border-left: 4px solid #3b82f6;
}

.order-card--queued {
  border-left: 4px solid #f59e0b;
}

.order-card--prepared {
  border-left: 4px solid #06b6d4;
}

.order-card--served {
  border-left: 4px solid #10b981;
}

.queue-chip {
  display: inline-flex;
  align-items: baseline;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-weight: 800;
  font-family: monospace;
}

.queue-hash {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-right: 1px;
}

.queue-num {
  font-size: 1rem;
}

.table-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  max-width: 140px;
}

.table-chip--dinein {
  background: #eff6ff;
  color: #1e40af;
  border: 1px solid #dbeafe;
}

.table-chip--takeaway {
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #ffedd5;
}

.order-card-items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-card-item-row {
  padding: 6px 0;
  border-bottom: 1px dashed var(--color-border-subtle);
}

.order-card-item-row:last-child {
  border-bottom: none;
}

.item-quantity-pill {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 700;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
}

.item-title {
  font-size: 0.9rem;
}

.options-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.opt-tag {
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-subtle);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.note-box {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  padding: 2px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.delete-btn-hover:hover {
  background: #fee2e2 !important;
}

/* ─── Orders Table ─── */
.orders-table-wrapper {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.orders-table {
  background: transparent;
}

.queue-badge-pill {
  display: inline-flex;
  align-items: baseline;
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 4px 10px;
  font-weight: 700;
}

.queue-badge-hash {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-right: 2px;
}

.queue-badge-num {
  font-size: 1rem;
  color: var(--color-primary);
  font-family: monospace;
}

.items-cell {
  white-space: normal;
}

.items-summary-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-summary-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 0.88rem;
}

.item-qty-badge {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 700;
  font-size: 0.75rem;
  padding: 1px 6px;
  border-radius: 4px;
}

.item-options-inline {
  font-style: italic;
}

.item-note-inline {
  display: inline-flex;
  align-items: center;
  background: #fff8e1;
  padding: 1px 6px;
  border-radius: 4px;
}

.action-btn-icon {
  transition: all 0.15s ease;
}

.action-btn-delete:hover {
  background: #ffebee !important;
}

/* ─── Detail Modal ─── */
.detail-card {
  width: 100%;
  max-width: 580px;
  border-radius: var(--radius-lg);
  background: #ffffff;
}

.detail-header {
  padding: 16px 20px;
}

.detail-queue-badge {
  background: var(--color-primary);
  color: #ffffff;
  font-weight: 700;
  font-size: 1.1rem;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-family: monospace;
}

.detail-body {
  max-height: 70vh;
}

.info-chips-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.info-chip {
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-chip-label {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.detail-items-list {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.detail-item-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.detail-item-row:last-child {
  border-bottom: none;
}

.option-subrow {
  padding: 2px 0;
}

.detail-total-box {
  background: var(--color-primary-soft);
  border: 1px solid var(--color-primary-subtle);
  border-radius: var(--radius-md);
}

/* ─── Delete Dialog ─── */
.delete-dialog-card {
  width: 100%;
  max-width: 480px;
  border-radius: var(--radius-lg);
  background: #ffffff;
}

.delete-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #ffebee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-warning-box {
  background: #fff5f5;
  border: 1px solid #ffcdd2;
}

.delete-checklist {
  padding-left: 18px;
  line-height: 1.6;
}

.empty-wrap {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
</style>
