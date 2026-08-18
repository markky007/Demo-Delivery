<template>
  <q-page class="cart-page">
    <!-- Empty cart -->
    <div v-if="cartStore.isEmpty" class="column items-center justify-center q-pa-xl empty-cart">
      <q-icon name="shopping_cart" size="64px" color="grey-4" />
      <h6 class="q-mt-md q-mb-xs text-grey-6">Your cart is empty</h6>
      <p class="text-grey-5">Add items from the menu to get started</p>
      <q-btn color="primary" unelevated no-caps :to="`/t/${publicToken}/menu`" class="q-mt-md">
        Browse Menu
      </q-btn>
    </div>

    <!-- Cart items -->
    <template v-else>
      <q-list class="cart-list q-px-md q-pt-md">
        <div v-for="item in cartStore.items" :key="item.cart_item_id" class="cart-item q-mb-md">
          <div class="row no-wrap items-start">
            <!-- Image -->
            <div class="cart-item-image q-mr-md">
              <img v-if="item.image_url" :src="item.image_url" :alt="item.name" />
              <q-icon v-else name="restaurant" size="24px" color="grey-4" />
            </div>

            <!-- Details -->
            <div class="col">
              <div class="cart-item-name">{{ item.name }}</div>

              <!-- Options -->
              <div v-if="item.selected_options.length > 0" class="cart-item-options">
                <span v-for="(opt, i) in item.selected_options" :key="opt.option_id">
                  {{ opt.name
                  }}<span v-if="opt.price_adjustment > 0">
                    +{{ formatPrice(opt.price_adjustment) }}</span
                  >{{ i < item.selected_options.length - 1 ? ', ' : '' }}
                </span>
              </div>

              <!-- Special instruction -->
              <div v-if="item.special_instruction" class="cart-item-note">
                📝 {{ item.special_instruction }}
              </div>

              <!-- Price + quantity -->
              <div class="row items-center justify-between q-mt-sm">
                <span class="cart-item-price">{{ formatPrice(item.subtotal) }}</span>
                <div class="row items-center no-wrap">
                  <q-btn
                    round
                    dense
                    flat
                    icon="remove"
                    size="sm"
                    color="primary"
                    @click="decreaseQty(item.cart_item_id, item.quantity)"
                  />
                  <span class="cart-item-qty q-mx-sm">{{ item.quantity }}</span>
                  <q-btn
                    round
                    dense
                    flat
                    icon="add"
                    size="sm"
                    color="primary"
                    @click="cartStore.updateItemQuantity(item.cart_item_id, item.quantity + 1)"
                  />
                </div>
              </div>
            </div>

            <!-- Remove button -->
            <q-btn
              flat
              dense
              round
              icon="close"
              size="sm"
              color="grey-5"
              class="q-ml-sm"
              @click="cartStore.removeItem(item.cart_item_id)"
            />
          </div>
        </div>
      </q-list>

      <!-- Order summary -->
      <div class="order-summary q-px-md q-mt-md">
        <q-separator class="q-mb-md" />
        <div class="row justify-between q-mb-sm">
          <span class="text-grey-7">Subtotal</span>
          <span class="text-weight-bold">{{ formatPrice(cartStore.totalAmount) }}</span>
        </div>
      </div>

      <!-- Confirm button -->
      <div class="confirm-wrapper q-px-md q-py-md">
        <q-btn
          color="primary"
          unelevated
          no-caps
          size="lg"
          class="full-width confirm-btn"
          @click="confirmOrder"
          :loading="isSubmitting"
        >
          Confirm Order — {{ formatPrice(cartStore.totalAmount) }}
        </q-btn>
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
import type { CreateOrderItemPayload } from 'src/types/cart';

const route = useRoute();
const router = useRouter();
const cartStore = useCartStore();
const sessionStore = useSessionStore();
const { notifySuccess, notifyError } = useNotify();

const publicToken = computed(() => route.params.publicToken as string);
const isSubmitting = ref(false);

function decreaseQty(cartItemId: string, currentQty: number) {
  if (currentQty <= 1) {
    cartStore.removeItem(cartItemId);
  } else {
    cartStore.updateItemQuantity(cartItemId, currentQty - 1);
  }
}

async function confirmOrder() {
  if (!sessionStore.tableSession || !sessionStore.guestSession) {
    notifyError('Session not found. Please scan the QR code again.');
    return;
  }

  isSubmitting.value = true;

  try {
    const items: CreateOrderItemPayload[] = cartStore.items.map((item) => ({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      special_instruction: item.special_instruction,
      selected_option_ids: item.selected_options.map((o) => o.option_id),
    }));

    await createOrder({
      table_session_id: sessionStore.tableSession.id,
      guest_session_token: sessionStore.guestSession.session_token,
      items,
    });

    cartStore.clearCart();
    notifySuccess('Order confirmed!');
    void router.push(`/t/${publicToken.value}/orders`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to place order';
    notifyError(message);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.cart-page {
  background: #f5f7fa;
  min-height: 100vh;
  padding-bottom: 100px;
}

.empty-cart {
  min-height: 60vh;
}

.cart-item {
  background: white;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.cart-item-image {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cart-item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-item-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: #1a1a2e;
}

.cart-item-options {
  font-size: 0.8rem;
  color: #888;
  margin-top: 2px;
}

.cart-item-note {
  font-size: 0.8rem;
  color: #666;
  margin-top: 4px;
  font-style: italic;
}

.cart-item-price {
  font-weight: 700;
  color: #1976d2;
  font-size: 0.95rem;
}

.cart-item-qty {
  font-weight: 600;
  font-size: 1rem;
  min-width: 24px;
  text-align: center;
}

.confirm-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
}

.confirm-btn {
  border-radius: 14px;
  height: 52px;
  font-size: 1rem;
  font-weight: 600;
}
</style>
