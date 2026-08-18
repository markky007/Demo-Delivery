<template>
  <q-layout view="hHh lpR fFf" class="customer-layout">
    <!-- Minimal warm header for customer - shows table context -->
    <q-header class="customer-header" :class="{ 'customer-header--scrolled': isScrolled }">
      <q-toolbar class="customer-toolbar">
        <q-btn
          v-if="showBack"
          flat
          dense
          round
          icon="arrow_back"
          color="dark"
          @click="goBack"
          aria-label="ย้อนกลับ"
          class="header-action-btn"
        />
        <div v-else class="header-placeholder"></div>

        <q-toolbar-title class="text-center customer-title">
          <div v-if="pageTitle" class="customer-page-name">{{ pageTitle }}</div>
          <div v-if="tableName" class="customer-table-pill">
            <q-icon name="table_restaurant" size="16px" class="q-mr-xs" />
            <span>โต๊ะ {{ tableName }}</span>
          </div>
        </q-toolbar-title>

        <q-btn
          v-if="sessionStore.hasSession"
          flat
          dense
          round
          icon="receipt_long"
          color="dark"
          :to="ordersRoute"
          aria-label="ดูรายการที่สั่ง"
          class="header-action-btn"
        >
          <q-tooltip anchor="bottom middle" self="top middle">รายการอาหารที่สั่ง</q-tooltip>
        </q-btn>
        <div v-else class="header-placeholder"></div>
      </q-toolbar>
    </q-header>

    <q-page-container class="customer-page-container">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>

    <!-- Floating Sticky Cart Summary Bar -->
    <div v-if="showCartBar" class="floating-cart-wrapper">
      <q-btn
        class="floating-cart-btn full-width"
        color="primary"
        unelevated
        no-caps
        :to="cartRoute"
      >
        <div class="row items-center justify-between full-width q-px-sm">
          <div class="row items-center">
            <div class="cart-count-badge q-mr-sm">
              {{ cartStore.itemCount }}
            </div>
            <span class="cart-btn-label">ดูตะกร้าอาหาร</span>
          </div>
          <div class="row items-center">
            <span class="cart-total-price">{{ formatPrice(cartStore.totalAmount) }}</span>
            <q-icon name="arrow_forward" size="18px" class="q-ml-xs" />
          </div>
        </div>
      </q-btn>
    </div>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/sessionStore';
import { useCartStore } from 'src/stores/cartStore';
import { formatPrice } from 'src/utils/formatters';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const cartStore = useCartStore();

const isScrolled = ref(false);

const publicToken = computed(
  () => (route.params.publicToken as string) || sessionStore.publicToken || '',
);

const tableName = computed(() => sessionStore.tableName || '');

const pageTitle = computed(() => {
  if (route.name === 'customer-welcome') return '';
  return (route.meta.title as string) || '';
});

const showBack = computed(
  () => route.name !== 'customer-welcome' && route.name !== 'customer-menu',
);

const showCartBar = computed(
  () =>
    cartStore.itemCount > 0 && route.name !== 'customer-cart' && route.name !== 'customer-welcome',
);

const cartRoute = computed(() => `/t/${publicToken.value}/cart`);
const ordersRoute = computed(() => `/t/${publicToken.value}/orders`);

function goBack() {
  router.back();
}

function handleScroll() {
  isScrolled.value = window.scrollY > 10;
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
.customer-layout {
  background-color: var(--color-background);
  min-height: 100vh;
}

.customer-header {
  background: rgba(251, 249, 246, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid transparent;
  transition: all 0.25s ease;
}

.customer-header--scrolled {
  background: rgba(255, 255, 255, 0.96);
  border-bottom-color: var(--color-border);
  box-shadow: var(--shadow-subtle);
}

.customer-toolbar {
  min-height: 54px;
  padding: 0 12px;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}

.header-action-btn {
  width: 38px;
  height: 38px;
  background: rgba(45, 35, 30, 0.05);
  border-radius: var(--radius-pill);
}

.header-placeholder {
  width: 38px;
}

.customer-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.customer-page-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.customer-table-pill {
  display: inline-flex;
  align-items: center;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  margin-top: 2px;
}

.customer-page-container {
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}

/* Floating Sticky Cart Summary */
.floating-cart-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 100;
  max-width: 560px;
  margin: 0 auto;
  pointer-events: none;
}

.floating-cart-btn {
  pointer-events: auto;
  border-radius: var(--radius-xl);
  height: 56px;
  box-shadow: var(--shadow-float);
  font-weight: 600;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.cart-count-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-pill);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
}

.cart-btn-label {
  font-size: 0.95rem;
}

.cart-total-price {
  font-size: 1.05rem;
  font-weight: 700;
}

/* Page transitions */
.page-fade-enter-active,
.page-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
