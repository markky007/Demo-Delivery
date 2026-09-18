<template>
  <q-layout view="hHh lpR fFf" class="customer-layout">
    <!-- Apple Minimalist Fixed Blurred Header -->
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
        <div v-else class="header-logo-badge">
          <img :src="logoMarkSvg" alt="DEMO" class="header-logo-icon" />
        </div>

        <q-toolbar-title class="text-center customer-title">
          <div v-if="pageTitle" class="customer-page-name">{{ pageTitle }}</div>
          <div
            v-if="tableName"
            class="customer-table-pill"
            :class="{ 'customer-table-pill--takeaway': isTakeawayName(tableName) }"
          >
            <q-icon
              :name="isTakeawayName(tableName) ? 'shopping_bag' : 'table_restaurant'"
              size="14px"
              class="q-mr-xs"
            />
            <span>{{ displayTableName }}</span>
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

    <!-- Floating Sticky Cart Summary Bar (Apple Pill CTA) -->
    <div v-if="showCartBar" class="floating-cart-wrapper">
      <q-btn
        class="floating-cart-btn full-width"
        :class="{ 'floating-cart-btn--bouncing': isCartBouncing }"
        color="primary"
        unelevated
        no-caps
        :to="cartRoute"
      >
        <div class="row items-center justify-between full-width q-px-sm">
          <div class="row items-center">
            <div
              class="cart-count-badge q-mr-sm tabular-nums"
              :class="{ 'animate-badge-bounce': isCartBouncing }"
            >
              {{ cartStore.itemCount }}
            </div>
            <div class="column text-left">
              <span class="cart-btn-label">ดูตะกร้าอาหาร</span>
              <span class="cart-btn-sub">พร้อมส่งออเดอร์</span>
            </div>
          </div>
          <div class="row items-center">
            <span class="cart-total-price tabular-nums">{{ formatPrice(cartStore.totalAmount) }}</span>
            <q-icon name="arrow_forward" size="18px" class="q-ml-xs cart-arrow-icon" />
          </div>
        </div>
      </q-btn>
    </div>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/sessionStore';
import { useCartStore } from 'src/stores/cartStore';
import { isTakeawayName } from 'src/services/tableService';
import { formatPrice } from 'src/utils/formatters';
import logoMarkSvg from 'src/assets/logo-mark.svg';

import { supabase } from 'src/services/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useNotify } from 'src/composables/useNotify';
import type { Table, TableSession } from 'src/types/database';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const cartStore = useCartStore();
const { notifyInfo } = useNotify();

const isScrolled = ref(false);
const isCartBouncing = ref(false);
let sessionRealtimeChannel: RealtimeChannel | null = null;
let bounceTimeout: ReturnType<typeof setTimeout> | null = null;

watch(
  () => cartStore.itemCount,
  (newCount, oldCount) => {
    if (newCount > (oldCount || 0)) {
      isCartBouncing.value = true;
      if (bounceTimeout) clearTimeout(bounceTimeout);
      bounceTimeout = setTimeout(() => {
        isCartBouncing.value = false;
      }, 400);
    }
  },
);

const publicToken = computed(
  () => (route.params.publicToken as string) || sessionStore.publicToken || '',
);

const tableName = computed(() => sessionStore.tableName || '');

const displayTableName = computed(() => {
  if (isTakeawayName(sessionStore.tableName)) {
    return sessionStore.customerName
      ? `สั่งกลับบ้าน • ${sessionStore.customerName}`
      : 'สั่งกลับบ้าน (Takeaway)';
  }
  return sessionStore.tableName || '';
});

const pageTitle = computed(() => {
  if (route.name === 'customer-welcome') return '';
  return (route.meta.title as string) || '';
});

const showBack = computed(
  () => route.name !== 'customer-welcome' && route.name !== 'customer-menu',
);

const showCartBar = computed(() => cartStore.itemCount > 0 && route.name === 'customer-menu');

const cartRoute = computed(() => `/t/${publicToken.value}/cart`);
const ordersRoute = computed(() => `/t/${publicToken.value}/orders`);

function goBack() {
  if (route.name === 'customer-order-detail') {
    const backState = (window.history.state as { back?: string } | null)?.back;
    if (!backState || backState.includes('/cart')) {
      void router.push(`/t/${publicToken.value}/menu`);
      return;
    }
  }
  router.back();
}

function handleScroll() {
  isScrolled.value = window.scrollY > 10;
}

function subscribeToSessionUpdates() {
  if (!sessionStore.tableSession?.id) return;
  if (sessionRealtimeChannel) {
    void supabase.removeChannel(sessionRealtimeChannel);
  }

  sessionRealtimeChannel = supabase
    .channel(`customer_session_${sessionStore.tableSession.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'table_sessions',
        filter: `id=eq.${sessionStore.tableSession.id}`,
      },
      (payload) => {
        void (async () => {
          const updated = payload.new as {
            table_id?: string;
            customer_name?: string;
            merged_into_session_id?: string | null;
          };

          // 1. If this session was merged into another table session
          if (updated?.merged_into_session_id) {
            const { data: targetSession } = await supabase
              .from('table_sessions')
              .select('*, table:tables(*)')
              .eq('id', updated.merged_into_session_id)
              .maybeSingle();

            if (targetSession) {
              const targetTable = (targetSession as unknown as { table?: Table }).table;
              if (targetTable) {
                sessionStore.updateTable(targetTable);
              }
              sessionStore.updateTableSession(targetSession as TableSession);

              notifyInfo(
                `โต๊ะของคุณถูกย้ายมารวมกับ ${targetTable?.name || 'โต๊ะใหม่'} เรียบร้อยแล้ว`,
                {
                  title: 'ย้ายรวมโต๊ะสำเร็จ 🔀',
                  caption: 'ออเดอร์และบิลทั้งหมดถูกโอนมารวมกันเรียบร้อย',
                },
              );

              // Re-subscribe to the new active session
              subscribeToSessionUpdates();
            }
            return;
          }

          // 2. Standard table transfer
          if (updated?.table_id && updated.table_id !== sessionStore.table?.id) {
            const { data: newTable } = await supabase
              .from('tables')
              .select('*')
              .eq('id', updated.table_id)
              .maybeSingle();
            if (newTable) {
              sessionStore.updateTable(newTable);
            }
          }
        })();
      },
    )
    .subscribe();
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  subscribeToSessionUpdates();
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  if (sessionRealtimeChannel) {
    void supabase.removeChannel(sessionRealtimeChannel);
  }
});
</script>

<style scoped>
.customer-layout {
  background-color: var(--color-background);
  min-height: 100vh;
  color: var(--color-text-primary);
}

/* 44px Fixed Translucent Blurred Navigation Bar */
.customer-header {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid transparent;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.customer-header--scrolled {
  background: rgba(255, 255, 255, 0.92);
  border-bottom-color: var(--color-hairline);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.customer-toolbar {
  min-height: 44px;
  height: 44px;
  padding: 0 14px;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
}

.header-action-btn {
  width: 34px;
  height: 34px;
  min-height: 34px;
  background: var(--color-surface-footer);
  color: var(--color-ink) !important;
  border-radius: var(--radius-pill);
  transition: background 0.15s ease, transform 0.15s ease;
}

.header-action-btn:hover {
  background: var(--color-surface-alt);
}

.header-action-btn:active {
  transform: scale(0.95);
}

.header-logo-badge {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-logo-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.header-placeholder {
  width: 34px;
}

.customer-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.customer-page-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-ink);
  line-height: 1.2;
  letter-spacing: 0;
}

.customer-table-pill {
  display: inline-flex;
  align-items: center;
  background: var(--color-surface-footer);
  color: var(--color-text-primary);
  border: 1px solid var(--color-hairline);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  margin-top: 1px;
}

.customer-table-pill--takeaway {
  background: #fff7ed;
  color: #b64400;
  border-color: #fed7aa;
}

.customer-page-container {
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
}

/* Floating Sticky Cart Summary (Apple Pill CTA) */
.floating-cart-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 100;
  max-width: 520px;
  margin: 0 auto;
  pointer-events: none;
}

.floating-cart-btn {
  pointer-events: auto;
  border-radius: var(--radius-pill);
  height: 52px;
  background: var(--color-primary) !important;
  color: #ffffff !important;
  box-shadow: 0 6px 20px rgba(0, 113, 227, 0.32);
  font-weight: 600;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
}

.floating-cart-btn:hover {
  background: var(--color-primary-hover) !important;
  box-shadow: 0 8px 26px rgba(0, 113, 227, 0.4);
}

.floating-cart-btn:active {
  transform: scale(0.98);
}

.floating-cart-btn--bouncing {
  animation: cartBtnPop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes cartBtnPop {
  0% { transform: scale(1); }
  40% { transform: scale(1.03) translateY(-2px); }
  100% { transform: scale(1); }
}

.cart-count-badge {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  border-radius: var(--radius-pill);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.88rem;
  font-weight: 800;
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.cart-btn-label {
  font-size: 0.94rem;
  font-weight: 600;
  line-height: 1.2;
}

.cart-btn-sub {
  font-size: 0.72rem;
  opacity: 0.85;
  font-weight: 400;
  line-height: 1;
}

.cart-total-price {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0;
}

.cart-arrow-icon {
  transition: transform 0.2s ease;
}

.floating-cart-btn:hover .cart-arrow-icon {
  transform: translateX(3px);
}

/* Page transitions */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(3px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

@keyframes slideUp {
  from {
    transform: translateY(16px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
