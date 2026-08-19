<template>
  <q-page class="welcome-page column items-center justify-center q-pa-lg">
    <!-- Loading state -->
    <LoadingSkeleton v-if="isLoading" type="welcome" />

    <!-- Error state -->
    <div
      v-else-if="errorMessage"
      class="column items-center q-gutter-md text-center welcome-card q-pa-xl"
    >
      <div class="welcome-icon-wrap welcome-icon-wrap--error">
        <q-icon :name="errorIcon" size="48px" color="negative" />
      </div>
      <h5 class="q-my-sm text-weight-bold">{{ errorMessage }}</h5>
      <p class="text-grey-7">{{ errorDescription }}</p>
    </div>

    <!-- Welcome state -->
    <div v-else class="column items-center text-center welcome-card q-pa-xl">
      <!-- Restaurant logo / Icon -->
      <div class="welcome-logo-wrap q-mb-md">
        <img :src="logoSvg" alt="DEMO Bang saen" class="welcome-logo-img" />
      </div>

      <h4 class="q-my-none text-weight-bold welcome-restaurant-name">
        {{ sessionStore.restaurantName || 'ร้านอาหาร' }}
      </h4>

      <div class="welcome-table-badge q-my-md">
        <q-icon name="table_restaurant" size="20px" class="q-mr-xs" />
        <span>{{ sessionStore.tableName }}</span>
      </div>

      <p class="welcome-tagline text-grey-7 q-mb-xl">
        พร้อมสั่งอาหารแล้วหรือยัง? เลือกเมนูอร่อยได้ทันที
      </p>

      <q-btn
        color="primary"
        unelevated
        no-caps
        size="lg"
        class="welcome-start-btn full-width"
        @click="startOrdering"
        :loading="isJoining"
      >
        <q-icon name="restaurant_menu" class="q-mr-sm" />
        <span>เริ่มสั่งอาหาร</span>
      </q-btn>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/sessionStore';
import { useCartStore } from 'src/stores/cartStore';
import { resolveTableFromToken } from 'src/services/tableService';
import { joinOrCreateSession, getOrCreateGuestToken } from 'src/services/sessionService';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import logoSvg from 'src/assets/logo.svg';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const cartStore = useCartStore();

const isLoading = ref(true);
const isJoining = ref(false);
const errorMessage = ref('');
const errorDescription = ref('');
const errorIcon = ref('error_outline');

onMounted(async () => {
  const publicToken = route.params.publicToken as string;

  if (!publicToken) {
    errorMessage.value = 'QR Code ไม่ถูกต้อง';
    errorDescription.value = 'ไม่พบรหัส QR Code สำหรับโต๊ะอาหาร';
    errorIcon.value = 'qr_code_scanner';
    isLoading.value = false;
    return;
  }

  try {
    const result = await resolveTableFromToken(publicToken);

    if (result.status === 'EXPIRED') {
      errorMessage.value = 'QR Code นี้หมดอายุแล้ว';
      errorDescription.value =
        'โต๊ะนี้ได้ทำการปิดรอบบริการหรือ QR Code หมดอายุแล้ว กรุณาสแกน QR Code ใหม่ที่โต๊ะ หรือติดต่อพนักงาน';
      errorIcon.value = 'timer_off';
      isLoading.value = false;
      return;
    }

    if (result.status === 'INACTIVE') {
      errorMessage.value = 'โต๊ะนี้ยังไม่เปิดให้บริการ';
      errorDescription.value = 'โต๊ะนี้อยู่ในสถานะปิดบริการชั่วคราว กรุณาติดต่อพนักงานประจำร้าน';
      errorIcon.value = 'block';
      isLoading.value = false;
      return;
    }

    if (result.status === 'NOT_FOUND') {
      errorMessage.value = 'ไม่พบข้อมูล QR Code';
      errorDescription.value = 'รหัส QR Code นี้ไม่ถูกต้องหรือถูกยกเลิกแล้ว กรุณาสแกนใหม่อีกครั้ง';
      errorIcon.value = 'search_off';
      isLoading.value = false;
      return;
    }

    const guestToken = getOrCreateGuestToken();
    const { tableSession, guestSession } = await joinOrCreateSession(result.table.id, guestToken);

    sessionStore.setContext(
      result.restaurant,
      result.table,
      tableSession,
      guestSession,
      publicToken,
    );

    cartStore.initForSession(tableSession.id);
  } catch (err) {
    errorMessage.value = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
    errorDescription.value = 'ไม่สามารถโหลดข้อมูลโต๊ะอาหารได้ กรุณาสแกนใหม่อีกครั้ง';
    errorIcon.value = 'error_outline';
    console.error('Welcome page error:', err);
  } finally {
    isLoading.value = false;
  }
});

async function startOrdering() {
  isJoining.value = true;
  const publicToken = route.params.publicToken as string;
  await router.push(`/t/${publicToken}/menu`);
}
</script>

<style scoped>
.welcome-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, #ffffff 0%, var(--color-background) 100%);
}

.welcome-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.welcome-icon-wrap {
  width: 96px;
  height: 96px;
  border-radius: var(--radius-xl);
  background: var(--color-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-logo-wrap {
  width: 140px;
  max-width: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-logo-img {
  width: 100%;
  height: auto;
  object-fit: contain;
}

.welcome-icon-wrap--error {
  background: var(--color-status-soldout-bg);
}

.welcome-restaurant-name {
  font-size: 1.65rem;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.welcome-table-badge {
  display: inline-flex;
  align-items: center;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  padding: 8px 24px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  font-size: 1.15rem;
}

.welcome-tagline {
  font-size: 0.95rem;
  line-height: 1.5;
}

.welcome-start-btn {
  border-radius: var(--radius-lg);
  height: 54px;
  font-size: 1.05rem;
  font-weight: 600;
  box-shadow: var(--shadow-md);
}
</style>
