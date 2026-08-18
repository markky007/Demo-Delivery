<template>
  <q-layout view="lHh Lpr lFf">
    <!-- Sidebar navigation for owner -->
    <q-drawer
      v-model="drawerOpen"
      :mini="miniDrawer"
      :width="260"
      :mini-width="72"
      bordered
      class="owner-drawer"
      :breakpoint="768"
    >
      <q-list>
        <!-- Logo / Brand -->
        <q-item class="owner-brand q-py-md">
          <q-item-section avatar>
            <q-icon name="restaurant" color="primary" size="28px" />
          </q-item-section>
          <q-item-section v-if="!miniDrawer">
            <q-item-label class="text-weight-bold text-h6">QR Food</q-item-label>
            <q-item-label caption>Owner Dashboard</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator />

        <!-- Navigation items -->
        <q-item
          v-for="nav in navItems"
          :key="nav.route"
          clickable
          v-ripple
          :to="nav.route"
          active-class="owner-nav-active"
          class="owner-nav-item"
        >
          <q-item-section avatar>
            <q-icon :name="nav.icon" />
          </q-item-section>
          <q-item-section v-if="!miniDrawer">
            <q-item-label>{{ nav.label }}</q-item-label>
          </q-item-section>
          <q-tooltip v-if="miniDrawer" anchor="center right" self="center left">
            {{ nav.label }}
          </q-tooltip>
        </q-item>
      </q-list>

      <q-space />

      <!-- Mini toggle + logout at bottom -->
      <q-list class="q-mb-sm">
        <q-separator />
        <q-item clickable v-ripple @click="miniDrawer = !miniDrawer" class="owner-nav-item">
          <q-item-section avatar>
            <q-icon :name="miniDrawer ? 'chevron_right' : 'chevron_left'" />
          </q-item-section>
          <q-item-section v-if="!miniDrawer">
            <q-item-label>Collapse</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable v-ripple @click="handleLogout" class="owner-nav-item text-negative">
          <q-item-section avatar>
            <q-icon name="logout" />
          </q-item-section>
          <q-item-section v-if="!miniDrawer">
            <q-item-label>Logout</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- Header -->
    <q-header class="owner-header" bordered>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          @click="drawerOpen = !drawerOpen"
          class="lt-md"
          aria-label="Toggle menu"
        />
        <q-toolbar-title class="text-weight-bold">
          {{ pageTitle }}
        </q-toolbar-title>
        <q-space />
        <div class="text-caption text-grey-6 q-mr-md gt-xs">
          {{ currentTime }}
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/authStore';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const drawerOpen = ref(true);
const miniDrawer = ref(false);
const currentTime = ref('');
let timeInterval: ReturnType<typeof setInterval>;

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', route: '/owner/dashboard' },
  { label: 'Order Queue', icon: 'list_alt', route: '/owner/queue' },
  { label: 'Tables', icon: 'table_restaurant', route: '/owner/tables' },
  { label: 'Menu', icon: 'restaurant_menu', route: '/owner/menu' },
  { label: 'Options', icon: 'tune', route: '/owner/options' },
  { label: 'Bills', icon: 'receipt', route: '/owner/bills' },
  { label: 'Sales', icon: 'bar_chart', route: '/owner/sales' },
];

const pageTitle = computed(() => (route.meta.title as string) || 'Dashboard');

function updateTime() {
  currentTime.value = new Date().toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
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
.owner-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #1a1a2e;
}

.owner-drawer {
  background: #fafbfc;
}

.owner-brand {
  min-height: 64px;
}

.owner-nav-item {
  border-radius: 8px;
  margin: 2px 8px;
  min-height: 44px;
}

.owner-nav-active {
  background: rgba(25, 118, 210, 0.08);
  color: #1976d2;
  font-weight: 600;
}
</style>
