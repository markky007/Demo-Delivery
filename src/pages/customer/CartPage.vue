<template>
  <q-page class="cart-page q-pa-md">
    <!-- Empty cart -->
    <EmptyState
      v-if="cartStore.isEmpty"
      icon="shopping_basket"
      title="ยังไม่มีรายการอาหารในตะกร้า"
      description="เลือกเมนูอร่อยจากหน้ารายการอาหารแล้วกลับมาสั่งได้เลย"
      action-label="ดูเมนูอาหาร"
      :action-to="`/t/${publicToken}/menu`"
    />

    <!-- Cart items list -->
    <template v-else>
      <div class="cart-container">
        <!-- Dining Context Banner -->
        <div class="cart-context-banner q-mb-sm row items-center justify-between">
          <div class="row items-center">
            <q-icon
              :name="sessionStore.customerName ? 'shopping_bag' : 'table_restaurant'"
              size="18px"
              class="q-mr-xs text-primary"
            />
            <span class="text-weight-bold text-dark">
              {{
                sessionStore.customerName
                  ? `สั่งกลับบ้าน (${sessionStore.customerName})`
                  : sessionStore.tableName
              }}
            </span>
          </div>
          <span class="text-caption text-grey-7">กำลังเลือก {{ cartStore.itemCount }} รายการ</span>
        </div>

        <div class="cart-header row items-center justify-between q-mb-sm">
          <h6 class="q-my-none text-weight-bold cart-heading">รายการอาหารในตะกร้า</h6>
          <q-btn
            flat
            dense
            no-caps
            color="negative"
            size="sm"
            icon="delete_outline"
            label="ล้างทั้งหมด"
            class="clear-cart-btn"
            @click="cartStore.clearCart()"
          />
        </div>

        <!-- Items list -->
        <div class="cart-list q-gutter-y-sm">
          <div v-for="item in cartStore.items" :key="item.cart_item_id" class="cart-item-card">
            <div class="row no-wrap items-start">
              <!-- Food Image Thumbnail -->
              <div class="cart-item-thumb q-mr-md">
                <img v-if="item.image_url" :src="item.image_url" :alt="item.name" />
                <q-icon v-else name="restaurant" size="24px" color="grey-4" />
              </div>

              <!-- Dish Info -->
              <div class="col">
                <div class="row items-start justify-between">
                  <div class="cart-item-name">{{ item.name }}</div>
                  <q-btn
                    flat
                    dense
                    round
                    icon="close"
                    size="sm"
                    color="grey-5"
                    @click="cartStore.removeItem(item.cart_item_id)"
                    aria-label="ลบรายการ"
                  />
                </div>

                <!-- Selected Options -->
                <div
                  v-if="getVisibleOptions(item.selected_options).length > 0"
                  class="cart-item-options q-mt-xs"
                >
                  <span
                    v-for="opt in getVisibleOptions(item.selected_options)"
                    :key="opt.option_id"
                    class="option-chip"
                    :class="{ 'option-chip--takeaway': isTakeawayOption(opt.name) }"
                  >
                    <q-icon
                      v-if="isTakeawayOption(opt.name)"
                      name="shopping_bag"
                      size="12px"
                      class="q-mr-xs"
                    />
                    {{ opt.name }}
                    <template v-if="opt.price_adjustment > 0"
                      >+{{ formatPrice(opt.price_adjustment) }}</template
                    >
                  </span>
                </div>

                <!-- Special Instruction -->
                <div v-if="item.special_instruction" class="cart-item-note q-mt-xs">
                  <q-icon name="edit_note" size="16px" class="q-mr-xs text-orange-9" />
                  <span>{{ item.special_instruction }}</span>
                </div>

                <!-- Price + Quantity Stepper -->
                <div class="row items-center justify-between q-mt-sm">
                  <span class="cart-item-subtotal">{{ formatPrice(item.subtotal) }}</span>
                  <QuantityStepper
                    :model-value="item.quantity"
                    :min="1"
                    dense
                    @update:model-value="
                      (val) => cartStore.updateItemQuantity(item.cart_item_id, val)
                    "
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary Receipt Card -->
        <div class="cart-summary-card q-mt-md">
          <div class="summary-card-header row items-center justify-between q-mb-sm">
            <span class="text-weight-bold text-subtitle2">สรุปรายการคำสั่งซื้อ</span>
            <span class="text-caption text-grey-6">
              {{
                isTakeawayName(sessionStore.tableName)
                  ? 'สั่งกลับบ้าน (Takeaway)'
                  : `โต๊ะ ${sessionStore.tableName}`
              }}
            </span>
          </div>

          <div class="row justify-between items-center text-body2 text-grey-8 q-mb-xs">
            <span>จำนวนอาหารทั้งหมด</span>
            <span class="text-weight-medium">{{ cartStore.itemCount }} จาน</span>
          </div>

          <div class="row justify-between items-center text-body2 text-grey-8 q-mb-xs">
            <span>ค่าอาหารรวม</span>
            <span class="text-weight-medium">{{ formatPrice(cartStore.totalAmount) }}</span>
          </div>

          <q-separator class="q-my-sm" />

          <div class="row justify-between items-center">
            <span class="text-subtitle1 text-weight-bold text-dark">ยอดรวมสุทธิ</span>
            <span class="text-h6 text-weight-bold text-primary">{{
              formatPrice(cartStore.totalAmount)
            }}</span>
          </div>
        </div>

        <!-- Confirm order button wrapper -->
        <div class="confirm-wrapper">
          <q-btn
            color="primary"
            unelevated
            no-caps
            size="lg"
            class="full-width confirm-btn"
            @click="confirmOrder"
            :loading="isSubmitting"
          >
            <div class="row items-center justify-between full-width q-px-sm">
              <span class="text-weight-bold">ยืนยันการสั่งอาหาร</span>
              <span class="text-weight-bold text-h6">{{ formatPrice(cartStore.totalAmount) }}</span>
            </div>
          </q-btn>
        </div>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCartStore } from 'src/stores/cartStore';
import { useSessionStore } from 'src/stores/sessionStore';
import { useNotify } from 'src/composables/useNotify';
import { createOrder } from 'src/services/orderService';
import { isTakeawayName } from 'src/services/tableService';
import {
  formatPrice,
  formatQueueNumber,
  getVisibleOptions,
  isTakeawayOption,
} from 'src/utils/formatters';
import { getCurrentPosition, calculateDistanceMeters, formatDistance } from 'src/utils/geoUtils';
import EmptyState from 'src/components/EmptyState.vue';
import QuantityStepper from 'src/components/QuantityStepper.vue';
import type { CreateOrderItemPayload } from 'src/types/cart';

const route = useRoute();
const router = useRouter();
const cartStore = useCartStore();
const sessionStore = useSessionStore();
const { notifySuccess, notifyError, notifyWarning } = useNotify();

const publicToken = computed(() => route.params.publicToken as string);
const isSubmitting = ref(false);

async function confirmOrder() {
  if (!sessionStore.tableSession || !sessionStore.guestSession) {
    notifyError('ไม่พบข้อมูลเซสชัน กรุณาสแกน QR Code ใหม่อีกครั้ง', {
      title: 'ไม่พบเซสชันโต๊ะ',
      caption: 'กรุณาสแกน QR Code ที่โต๊ะใหม่อีกครั้งเพื่อเริ่มสั่งอาหาร',
    });
    return;
  }

  isSubmitting.value = true;

  try {
    // 1. Geolocation verification if enabled by restaurant
    const rest = sessionStore.restaurant;
    if (
      rest?.is_geofence_enabled &&
      rest.latitude !== null &&
      rest.latitude !== undefined &&
      rest.longitude !== null &&
      rest.longitude !== undefined
    ) {
      const posResult = await getCurrentPosition();

      if (!posResult.success) {
        notifyWarning(posResult.message, {
          title: 'แจ้งเตือนพิกัดตำแหน่ง',
        });
        isSubmitting.value = false;
        return;
      }

      const distance = calculateDistanceMeters(
        posResult.latitude,
        posResult.longitude,
        rest.latitude,
        rest.longitude,
      );

      const maxAllowed = rest.geofence_radius_meters ?? 100;

      if (distance > maxAllowed) {
        notifyError(`คุณอยู่ห่างจากร้าน ${formatDistance(distance)}`, {
          title: 'อยู่นอกพื้นที่ร้านอาหาร 📍',
          caption: 'ระบบอนุญาตให้สั่งอาหารขณะอยู่ที่ร้านเท่านั้น',
          timeout: 5000,
        });
        isSubmitting.value = false;
        return;
      }
    }

    // 2. Prepare payload
    const items: CreateOrderItemPayload[] = cartStore.items.map((item) => {
      const optionIds = item.selected_options.map((o) => o.option_id);
      return {
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        special_instruction: item.special_instruction,
        selected_option_ids: optionIds,
        option_ids: optionIds,
      };
    });

    const itemCount = cartStore.itemCount;
    const orderTotal = cartStore.totalAmount;

    // 3. Submit order
    const createdOrder = await createOrder({
      table_session_id: sessionStore.tableSession.id,
      guest_session_token: sessionStore.guestSession.session_token,
      items,
    });

    const qNum = createdOrder?.queue_number ? formatQueueNumber(createdOrder.queue_number) : '';

    cartStore.clearCart();
    notifySuccess(`${itemCount} รายการอาหาร • ยอดรวม ${formatPrice(orderTotal)}`, {
      title: qNum ? `🎉 ส่งออเดอร์สำเร็จ • คิว ${qNum}` : '🎉 ส่งออเดอร์สำเร็จ',
      caption: 'ระบบได้ส่งรายการไปยังครัวเรียบร้อยแล้ว สามารถติดตามสถานะได้แบบเรียลไทม์',
      timeout: 5000,
    });
    if (createdOrder?.id) {
      void router.push(`/t/${publicToken.value}/orders/${createdOrder.id}`);
    } else {
      void router.push(`/t/${publicToken.value}/orders`);
    }
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : '';
    if (rawMsg.includes('session is not active') || rawMsg.includes('closed')) {
      notifyError('รอบโต๊ะนี้ได้ทำการเช็คบิล/ปิดรอบไปแล้ว', {
        title: 'เซสชันโต๊ะปิดแล้ว',
        caption: 'กรุณาสแกน QR Code ที่โต๊ะใหม่อีกครั้งเพื่อเปิดรอบใหม่',
        timeout: 5000,
      });
      void router.push(`/t/${publicToken.value}`);
    } else {
      notifyError(rawMsg || 'ไม่สามารถส่งออเดอร์ได้ กรุณาลองใหม่อีกครั้ง', {
        title: 'ส่งออเดอร์ไม่สำเร็จ',
      });
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.cart-page {
  background: var(--color-background);
  min-height: 100vh;
  padding-bottom: 120px;
}

.cart-container {
  max-width: 600px;
  margin: 0 auto;
}

.cart-heading {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.cart-context-banner {
  background: var(--color-surface-footer);
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-hairline);
  padding: 8px 14px;
}

.clear-cart-btn {
  font-size: 0.8rem;
  font-weight: 600;
}

.cart-item-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 14px 16px;
  box-shadow: var(--shadow-card);
  transition: transform 0.15s ease;
}

.cart-item-thumb {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-surface-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--color-hairline);
}

.cart-item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-item-name {
  font-weight: 600;
  font-size: 0.98rem;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.cart-item-options {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.option-chip {
  background: var(--color-surface-footer);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-hairline);
  font-size: 0.74rem;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-variant-numeric: tabular-nums;
}

.option-chip--takeaway {
  background: #fff7ed;
  color: #b64400;
  font-weight: 600;
  border: 1px solid #fed7aa;
}

.cart-item-note {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  background: var(--color-surface-footer);
  border: 1px solid var(--color-hairline);
  padding: 3px 8px;
  border-radius: var(--radius-xs);
  width: fit-content;
}

.cart-item-subtotal {
  font-weight: 800;
  color: var(--color-text-primary);
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
}

.cart-summary-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 16px 18px;
  box-shadow: var(--shadow-card);
}

.summary-card-header {
  border-bottom: 1px dashed var(--color-hairline);
  padding-bottom: 8px;
}

.confirm-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-top: 1px solid var(--color-hairline);
  padding: 12px 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 50;
  max-width: 600px;
  margin: 0 auto;
}

.confirm-btn {
  border-radius: var(--radius-pill);
  height: 52px;
  font-size: 1.05rem;
  background: var(--color-primary) !important;
  color: #ffffff !important;
  box-shadow: 0 6px 20px rgba(0, 113, 227, 0.32);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.confirm-btn:hover:not(:disabled) {
  background: var(--color-primary-hover) !important;
  box-shadow: 0 8px 26px rgba(0, 113, 227, 0.4);
}

.confirm-btn:active {
  transform: scale(0.98);
}
</style>
