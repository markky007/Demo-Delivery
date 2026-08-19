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

      <div
        class="welcome-table-badge q-my-md"
        :class="{ 'welcome-table-badge--takeaway': isTakeaway }"
      >
        <q-icon :name="isTakeaway ? 'shopping_bag' : 'table_restaurant'" size="20px" class="q-mr-xs" />
        <span>{{ isTakeaway ? 'สั่งกลับบ้าน (Takeaway)' : sessionStore.tableName }}</span>
      </div>

      <p class="welcome-tagline text-grey-7 q-mb-md">
        {{
          isTakeaway
            ? 'ระบุชื่อของคุณเพื่อเปิดรายการสั่งกลับบ้านและรับอาหาร'
            : 'พร้อมสั่งอาหารแล้วหรือยัง? เลือกเมนูอร่อยได้ทันที'
        }}
      </p>

      <!-- Customer Name Input for Takeaway -->
      <div v-if="isTakeaway" class="welcome-name-container full-width q-mb-lg text-left">
        <label class="welcome-input-label q-mb-xs block">
          <q-icon name="badge" size="18px" class="q-mr-xs text-orange-9" />
          <span class="text-weight-bold text-grey-9">ชื่อลูกค้า / ผู้สั่งอาหาร</span>
          <span class="text-negative text-weight-bold q-ml-xs">*</span>
        </label>
        <q-input
          v-model="customerName"
          outlined
          dense
          placeholder="เช่น คุณสมชาย, คุณแอน"
          class="welcome-name-input"
          bg-color="white"
          :error="nameError"
          error-message="กรุณาระบุชื่อของคุณก่อนเริ่มสั่งอาหาร"
          :disable="isJoining"
          @keyup.enter="startOrdering"
          @update:model-value="nameError = false"
        >
          <template #prepend>
            <q-icon name="person" color="grey-6" size="20px" />
          </template>
        </q-input>
        <div class="text-caption text-grey-6 q-mt-xs">
          💡 ใช้สำหรับเรียกคิวและพิมพ์ในใบเสร็จรับอาหาร
        </div>
      </div>

      <!-- Existing Active Session Notice if any -->
      <div v-if="hasActiveGuestSession && isTakeaway" class="active-session-hint q-mb-md full-width">
        <q-icon name="history" size="18px" color="orange-9" class="q-mr-xs" />
        <span class="text-caption text-orange-9">
          คุณมีรายการสั่งในชื่อ <strong>{{ activeSessionCustomerName }}</strong> กำลังดำเนินการอยู่
        </span>
      </div>

      <q-btn
        color="primary"
        unelevated
        no-caps
        size="lg"
        class="welcome-start-btn full-width"
        @click="startOrdering"
        :loading="isJoining"
      >
        <q-icon :name="isTakeaway ? 'shopping_bag' : 'restaurant_menu'" class="q-mr-sm" />
        <span>{{ startButtonLabel }}</span>
      </q-btn>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from 'src/stores/sessionStore';
import { useCartStore } from 'src/stores/cartStore';
import { resolveTableFromToken, isTakeawayName } from 'src/services/tableService';
import {
  joinOrCreateSession,
  createTakeawaySession,
  getActiveTakeawaySessionForGuest,
  getOrCreateGuestToken,
} from 'src/services/sessionService';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import logoSvg from 'src/assets/logo.svg';
import type { TableSession, GuestSession } from 'src/types/database';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const cartStore = useCartStore();

const isTakeaway = computed(() => isTakeawayName(sessionStore.tableName));

const isLoading = ref(true);
const isJoining = ref(false);
const customerName = ref('');
const nameError = ref(false);
const errorMessage = ref('');
const errorDescription = ref('');
const errorIcon = ref('error_outline');

const hasActiveGuestSession = ref(false);
const activeSessionCustomerName = ref('');
let existingActiveTableSession: TableSession | null = null;
let existingActiveGuestSession: GuestSession | null = null;

const startButtonLabel = computed(() => {
  if (isTakeaway.value) {
    if (hasActiveGuestSession.value) {
      return 'เข้าสู่เมนูสั่งอาหารต่อ';
    }
    return 'เริ่มสั่งกลับบ้าน';
  }
  return 'เริ่มสั่งอาหาร';
});

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

    // Set restaurant and table metadata in store WITHOUT creating any session in DB yet
    sessionStore.setTableContext(result.restaurant, result.table, publicToken);

    // Check if this guest already has an active takeaway session in progress (e.g. refreshed page)
    const guestToken = getOrCreateGuestToken();
    const isTakeawayTable = isTakeawayName(result.table.name);

    if (isTakeawayTable) {
      const activeTakeaway = await getActiveTakeawaySessionForGuest(result.table.id, guestToken);
      if (activeTakeaway) {
        hasActiveGuestSession.value = true;
        existingActiveTableSession = activeTakeaway.tableSession;
        existingActiveGuestSession = activeTakeaway.guestSession;
        activeSessionCustomerName.value = activeTakeaway.tableSession.customer_name || '';
        customerName.value = activeSessionCustomerName.value;
      }
    }
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
  if (!sessionStore.table || !sessionStore.restaurant) return;

  const publicToken = route.params.publicToken as string;
  const guestToken = getOrCreateGuestToken();

  try {
    isJoining.value = true;

    if (isTakeaway.value) {
      // If customer already has an active session and hasn't changed their name, reuse existing session
      if (
        hasActiveGuestSession.value &&
        existingActiveTableSession &&
        existingActiveGuestSession &&
        customerName.value.trim() === activeSessionCustomerName.value
      ) {
        sessionStore.setContext(
          sessionStore.restaurant,
          sessionStore.table,
          existingActiveTableSession,
          existingActiveGuestSession,
          publicToken,
        );
        cartStore.initForSession(existingActiveTableSession.id);
        await router.push(`/t/${publicToken}/menu`);
        return;
      }

      // Validate customer name
      const trimmedName = customerName.value.trim();
      if (!trimmedName) {
        nameError.value = true;
        isJoining.value = false;
        return;
      }

      // Create a NEW takeaway session specifically for this customer
      const { tableSession, guestSession } = await createTakeawaySession(
        sessionStore.table.id,
        guestToken,
        trimmedName,
      );

      sessionStore.setContext(
        sessionStore.restaurant,
        sessionStore.table,
        tableSession,
        guestSession,
        publicToken,
      );

      cartStore.initForSession(tableSession.id);
      await router.push(`/t/${publicToken}/menu`);
    } else {
      // Regular Dine-in table session
      const { tableSession, guestSession } = await joinOrCreateSession(
        sessionStore.table.id,
        guestToken,
      );

      sessionStore.setContext(
        sessionStore.restaurant,
        sessionStore.table,
        tableSession,
        guestSession,
        publicToken,
      );

      cartStore.initForSession(tableSession.id);
      await router.push(`/t/${publicToken}/menu`);
    }
  } catch (err) {
    console.error('Failed to start ordering session:', err);
    errorMessage.value = 'เกิดข้อผิดพลาดในการเริ่มต้นสั่งอาหาร';
    errorDescription.value = 'ไม่สามารถสร้างรอบการสั่งอาหารได้ กรุณาลองใหม่อีกครั้ง';
    errorIcon.value = 'error_outline';
  } finally {
    isJoining.value = false;
  }
}
</script>

<style scoped>
.welcome-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, #ffffff 0%, var(--color-background) 100%);
}

.welcome-card {
  width: 100%;
  max-width: 440px;
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

.welcome-table-badge--takeaway {
  background: #ffedd5;
  color: #ea580c;
  border: 1.5px solid #fed7aa;
}

.welcome-tagline {
  font-size: 0.95rem;
  line-height: 1.5;
}

.welcome-name-container {
  background: #fdfbf7;
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px dashed #fed7aa;
}

.welcome-input-label {
  font-size: 0.9rem;
}

.welcome-name-input :deep(.q-field__control) {
  border-radius: var(--radius-md);
}

.active-session-hint {
  background: #fff7ed;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid #ffedd5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-start-btn {
  border-radius: var(--radius-lg);
  height: 54px;
  font-size: 1.05rem;
  font-weight: 600;
  box-shadow: var(--shadow-md);
}
</style>
