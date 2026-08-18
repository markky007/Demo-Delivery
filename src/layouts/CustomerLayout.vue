<template>
  <q-layout view="hHh lpR fFf">
    <!-- Minimal header for customer - shows table context -->
    <q-header class="customer-header" bordered>
      <q-toolbar class="customer-toolbar">
        <q-btn
          v-if="showBack"
          flat
          dense
          round
          icon="arrow_back"
          @click="goBack"
          aria-label="Go back"
        />
        <q-toolbar-title class="text-center customer-title">
          {{ pageTitle || tableName }}
        </q-toolbar-title>
        <q-btn
          v-if="sessionStore.hasSession"
          flat
          dense
          round
          icon="receipt_long"
          :to="ordersRoute"
          aria-label="View orders"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Sticky cart summary bar -->
    <q-footer v-if="cartStore.itemCount > 0" class="cart-footer" bordered>
      <q-btn
        class="cart-footer-btn full-width"
        color="primary"
        unelevated
        no-caps
        size="lg"
        :to="cartRoute"
      >
        <div class="row items-center justify-between full-width">
          <q-badge color="white" text-color="primary" :label="cartStore.itemCount" />
          <span class="text-weight-medium">View Cart</span>
          <span class="text-weight-bold">{{ formatPrice(cartStore.totalAmount) }}</span>
        </div>
      </q-btn>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/sessionStore';
import { useCartStore } from 'src/stores/cartStore';
import { formatPrice } from 'src/utils/formatters';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const cartStore = useCartStore();

const publicToken = computed(
  () => (route.params.publicToken as string) || sessionStore.publicToken || '',
);

const tableName = computed(() => (sessionStore.tableName ? `Table ${sessionStore.tableName}` : ''));

const pageTitle = computed(() => (route.meta.title as string) || '');

const showBack = computed(
  () => route.name !== 'customer-welcome' && route.name !== 'customer-menu',
);

const cartRoute = computed(() => `/t/${publicToken.value}/cart`);

const ordersRoute = computed(() => `/t/${publicToken.value}/orders`);

function goBack() {
  router.back();
}
</script>

<style scoped>
.customer-header {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.customer-toolbar {
  min-height: 48px;
  padding: 0 8px;
}

.customer-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
}

.cart-footer {
  background: transparent;
  padding: 8px 12px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}

.cart-footer-btn {
  border-radius: 14px;
  height: 52px;
  font-size: 0.95rem;
}

.cart-footer-btn .q-badge {
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 10px;
}
</style>
