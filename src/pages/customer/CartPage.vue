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
        <div class="cart-header row items-center justify-between q-mb-sm">
          <h6 class="q-my-none text-weight-bold cart-heading">
            รายการที่เลือก ({{ cartStore.itemCount }} รายการ)
          </h6>
          <q-btn
            flat
            dense
            no-caps
            color="grey-7"
            size="sm"
            label="ล้างตะกร้า"
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
                <div v-if="item.selected_options.length > 0" class="cart-item-options q-mt-xs">
                  <span
                    v-for="opt in item.selected_options"
                    :key="opt.option_id"
                    class="option-chip"
                  >
                    {{ opt.name }}
                    <template v-if="opt.price_adjustment > 0"
                      >+{{ formatPrice(opt.price_adjustment) }}</template
                    >
                  </span>
                </div>

                <!-- Special Instruction -->
                <div v-if="item.special_instruction" class="cart-item-note q-mt-xs">
                  <q-icon name="edit_note" size="16px" class="q-mr-xs" />
                  <span>{{ item.special_instruction }}</span>
                </div>

                <!-- Price + Quantity Stepper -->
                <div class="row items-center justify-between q-mt-md">
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

        <!-- Summary Card -->
        <div class="cart-summary-card q-mt-lg">
          <div class="row justify-between items-center q-mb-xs">
            <span class="text-grey-7">จำนวนรายการทั้งหมด</span>
            <span class="text-weight-medium">{{ cartStore.itemCount }} รายการ</span>
          </div>
          <q-separator class="q-my-sm" />
          <div class="row justify-between items-center">
            <span class="text-subtitle1 text-weight-bold">ยอดรวมสุทธิ</span>
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
              <span>ยืนยันการสั่งอาหาร</span>
              <span>{{ formatPrice(cartStore.totalAmount) }}</span>
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
import { formatPrice } from 'src/utils/formatters';
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
    notifyError('ไม่พบข้อมูลเซสชัน กรุณาสแกน QR Code ใหม่อีกครั้ง');
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
        notifyWarning(posResult.message);
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
        notifyError(
          `คุณอยู่นอกพื้นที่ร้านอาหาร (ห่างออกไป ${formatDistance(distance)}) จึงไม่สามารถสั่งอาหารได้ กรุณาสั่งอาหารขณะอยู่ที่ร้านเท่านั้น`,
        );
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

    // 3. Submit order
    await createOrder({
      table_session_id: sessionStore.tableSession.id,
      guest_session_token: sessionStore.guestSession.session_token,
      items,
    });

    cartStore.clearCart();
    notifySuccess('ส่งออเดอร์เรียบร้อยแล้ว!');
    void router.push(`/t/${publicToken.value}/orders`);
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : '';
    if (rawMsg.includes('session is not active') || rawMsg.includes('closed')) {
      notifyError('รอบโต๊ะนี้ได้ทำการเช็คบิล/ปิดรอบไปแล้ว กรุณาสแกน QR Code ที่โต๊ะใหม่อีกครั้ง');
      void router.push(`/t/${publicToken.value}`);
    } else {
      notifyError(rawMsg || 'ไม่สามารถส่งออเดอร์ได้ กรุณาลองใหม่อีกครั้ง');
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
  color: var(--color-text-primary);
}

.cart-item-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 14px;
  box-shadow: var(--shadow-subtle);
}

.cart-item-thumb {
  width: 68px;
  height: 68px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-surface-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
  background: var(--color-surface-subtle);
  color: var(--color-text-secondary);
  font-size: 0.76rem;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.cart-item-note {
  font-size: 0.8rem;
  color: var(--color-status-preparing);
  display: flex;
  align-items: center;
}

.cart-item-subtotal {
  font-weight: 700;
  color: var(--color-primary);
  font-size: 1.05rem;
}

.cart-summary-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 16px;
  box-shadow: var(--shadow-subtle);
}

.confirm-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--color-border);
  padding: 12px 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 50;
  max-width: 600px;
  margin: 0 auto;
}

.confirm-btn {
  border-radius: var(--radius-lg);
  height: 52px;
  font-size: 1rem;
  box-shadow: var(--shadow-md);
}
</style>
