<template>
  <q-page class="welcome-page column items-center justify-center">
    <!-- Loading state -->
    <div v-if="isLoading" class="column items-center q-gutter-md">
      <q-spinner-dots size="48px" color="primary" />
      <p class="text-grey-6">Verifying table...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="errorMessage" class="column items-center q-gutter-md text-center q-px-lg">
      <q-icon name="error_outline" size="64px" color="negative" />
      <h5 class="q-my-sm text-weight-bold">{{ errorMessage }}</h5>
      <p class="text-grey-6">Please scan the QR code at your table to start ordering.</p>
    </div>

    <!-- Welcome state -->
    <div v-else class="column items-center q-gutter-lg text-center q-px-lg welcome-content">
      <!-- Restaurant logo placeholder -->
      <div class="welcome-logo">
        <q-icon name="restaurant" size="56px" color="primary" />
      </div>

      <div>
        <h4 class="q-my-none text-weight-bold welcome-restaurant-name">
          {{ sessionStore.restaurantName }}
        </h4>
        <div class="welcome-table-badge q-mt-md">
          <q-icon name="table_restaurant" size="20px" class="q-mr-xs" />
          Table {{ sessionStore.tableName }}
        </div>
      </div>

      <q-btn
        color="primary"
        unelevated
        no-caps
        size="xl"
        class="welcome-start-btn"
        @click="startOrdering"
        :loading="isJoining"
      >
        <q-icon name="restaurant_menu" class="q-mr-sm" />
        Start Ordering
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
import type { Restaurant } from 'src/types/database';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const cartStore = useCartStore();

const isLoading = ref(true);
const isJoining = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  const publicToken = route.params.publicToken as string;

  if (!publicToken) {
    errorMessage.value = 'Invalid QR code';
    isLoading.value = false;
    return;
  }

  try {
    // Resolve the QR token
    const result = await resolveTableFromToken(publicToken);

    if (!result) {
      errorMessage.value = 'This table is currently unavailable.';
      isLoading.value = false;
      return;
    }

    // Store the context
    const guestToken = getOrCreateGuestToken();
    const { tableSession, guestSession } = await joinOrCreateSession(result.table.id, guestToken);

    sessionStore.setContext(
      result.restaurant as Restaurant,
      result.table,
      tableSession,
      guestSession,
      publicToken,
    );

    // Initialize cart for this session
    cartStore.initForSession(tableSession.id);
  } catch (err) {
    errorMessage.value = 'Something went wrong. Please try scanning the QR code again.';
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
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
}

.welcome-content {
  max-width: 400px;
}

.welcome-logo {
  width: 96px;
  height: 96px;
  border-radius: 24px;
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 32px rgba(25, 118, 210, 0.25);
}

.welcome-logo .q-icon {
  color: white;
}

.welcome-restaurant-name {
  font-size: 1.75rem;
  color: #1a1a2e;
}

.welcome-table-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(25, 118, 210, 0.1);
  color: #1976d2;
  padding: 8px 20px;
  border-radius: 24px;
  font-weight: 600;
  font-size: 1.1rem;
}

.welcome-start-btn {
  border-radius: 16px;
  padding: 12px 48px;
  font-size: 1.1rem;
  font-weight: 600;
  min-width: 240px;
  box-shadow: 0 4px 20px rgba(25, 118, 210, 0.3);
}
</style>
