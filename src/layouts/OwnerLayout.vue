<template>
  <q-layout view="lHh Lpr lFf" class="owner-layout">
    <!-- Sidebar navigation for owner -->
    <q-drawer
      v-model="drawerOpen"
      :mini="miniDrawer"
      :width="270"
      :mini-width="76"
      bordered
      class="owner-drawer"
      :breakpoint="900"
    >
      <div class="column full-height justify-between">
        <q-list class="q-pt-sm">
          <!-- Logo / Brand Header -->
          <q-item class="owner-brand q-my-xs q-mx-sm">
            <q-item-section avatar>
              <div class="owner-brand-icon">
                <img :src="logoMarkSvg" alt="DEMO" class="owner-brand-logo" />
              </div>
            </q-item-section>
            <q-item-section v-if="!miniDrawer">
              <q-item-label class="text-weight-bold text-subtitle1 brand-title"
                >DEMO Bang saen</q-item-label
              >
              <q-item-label caption class="brand-subtitle">ผู้ดูแลร้าน (Owner)</q-item-label>
            </q-item-section>
          </q-item>

          <q-separator class="q-my-sm q-mx-md separator-subtle" />

          <!-- Navigation items -->
          <div class="q-px-sm">
            <q-item
              v-for="nav in navItems"
              :key="nav.route"
              clickable
              v-ripple
              :to="nav.route"
              active-class="owner-nav-active"
              class="owner-nav-item q-my-xs"
            >
              <q-item-section avatar class="nav-avatar">
                <q-icon :name="nav.icon" size="22px" />
              </q-item-section>
              <q-item-section v-if="!miniDrawer">
                <q-item-label class="nav-label">{{ nav.label }}</q-item-label>
              </q-item-section>
              <q-tooltip v-if="miniDrawer" anchor="center right" self="center left" class="bg-dark">
                {{ nav.label }}
              </q-tooltip>
            </q-item>
          </div>
        </q-list>

        <!-- Mini toggle + logout at bottom -->
        <q-list class="q-pa-sm q-mb-xs">
          <q-separator class="q-mb-sm separator-subtle" />
          <q-item clickable v-ripple @click="miniDrawer = !miniDrawer" class="owner-nav-item gt-sm">
            <q-item-section avatar class="nav-avatar">
              <q-icon :name="miniDrawer ? 'chevron_right' : 'chevron_left'" size="22px" />
            </q-item-section>
            <q-item-section v-if="!miniDrawer">
              <q-item-label class="nav-label text-grey-7">{{
                miniDrawer ? 'ขยายเมนู' : 'ย่อเมนู'
              }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            v-ripple
            @click="handleLogout"
            class="owner-nav-item logout-item text-negative"
          >
            <q-item-section avatar class="nav-avatar">
              <q-icon name="logout" size="22px" />
            </q-item-section>
            <q-item-section v-if="!miniDrawer">
              <q-item-label class="nav-label text-weight-medium">ออกจากระบบ</q-item-label>
            </q-item-section>
            <q-tooltip
              v-if="miniDrawer"
              anchor="center right"
              self="center left"
              class="bg-negative"
            >
              ออกจากระบบ
            </q-tooltip>
          </q-item>
        </q-list>
      </div>
    </q-drawer>

    <!-- Header -->
    <q-header class="owner-header" bordered>
      <q-toolbar class="owner-toolbar">
        <q-btn
          flat
          dense
          round
          icon="menu"
          @click="drawerOpen = !drawerOpen"
          class="lt-md q-mr-sm"
          aria-label="เปิดเมนู"
        />
        <q-toolbar-title class="owner-title text-weight-bold">
          {{ pageTitle }}
        </q-toolbar-title>
        <q-space />
        <div class="row items-center time-badge gt-xs">
          <q-icon name="schedule" size="16px" class="q-mr-xs text-grey-6" />
          <span class="text-caption text-weight-medium text-grey-8">{{ currentTime }}</span>
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container class="owner-page-container">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/authStore';
import logoMarkSvg from 'src/assets/logo-mark.svg';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const drawerOpen = ref(true);
const miniDrawer = ref(false);
const currentTime = ref('');
let timeInterval: ReturnType<typeof setInterval>;

const navItems = [
  { label: 'ภาพรวมร้านค้า', icon: 'dashboard', route: '/owner/dashboard' },
  { label: 'คิวออเดอร์', icon: 'soup_kitchen', route: '/owner/queue' },
  { label: 'จัดการโต๊ะและ QR', icon: 'table_restaurant', route: '/owner/tables' },
  { label: 'จัดการเมนูอาหาร', icon: 'restaurant_menu', route: '/owner/menu' },
  { label: 'ตัวเลือกเสริม', icon: 'tune', route: '/owner/options' },
  { label: 'บิลและการชำระเงิน', icon: 'receipt_long', route: '/owner/bills' },
  { label: 'ประวัติยอดขาย', icon: 'bar_chart', route: '/owner/sales' },
];

const pageTitle = computed(() => (route.meta.title as string) || 'ภาพรวมร้านค้า');

function updateTime() {
  const time = new Date().toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  currentTime.value = `${time} น.`;
}

async function handleLogout() {
  await authStore.logout();
  void router.push('/owner/login');
}

onMounted(() => {
  updateTime();
  timeInterval = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  clearInterval(timeInterval);
});
</script>

<style scoped>
.owner-layout {
  background-color: var(--color-background);
  min-height: 100vh;
}

.owner-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.owner-toolbar {
  min-height: 56px;
  padding: 0 16px;
}

.owner-title {
  font-size: 1.15rem;
  color: var(--color-text-primary);
}

.time-badge {
  background: var(--color-surface-subtle);
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
}

.owner-drawer {
  background: #ffffff;
  border-right: 1px solid var(--color-border);
}

.owner-brand {
  min-height: 54px;
  border-radius: var(--radius-md);
  background: var(--color-surface-subtle);
}

.owner-brand-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: #ffffff;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.owner-brand-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand-title {
  color: var(--color-text-primary);
  line-height: 1.2;
}

.brand-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}

.separator-subtle {
  background: var(--color-border-subtle);
}

.owner-nav-item {
  border-radius: var(--radius-sm);
  min-height: 44px;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.owner-nav-item:hover {
  background: var(--color-surface-subtle);
  color: var(--color-text-primary);
}

.owner-nav-active {
  background: var(--color-primary-soft) !important;
  color: var(--color-primary) !important;
  font-weight: 600;
}

.nav-avatar {
  min-width: 40px;
}

.nav-label {
  font-size: 0.92rem;
}

.logout-item:hover {
  background: var(--color-status-soldout-bg);
}

.owner-page-container {
  padding: 0;
}

/* Transitions */
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
</style>
