/**
 * Pinia store for customer session management.
 * Manages the current table context, table session, and guest session.
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Restaurant, Table, TableSession, GuestSession } from 'src/types/database';
import { SessionStatus } from 'src/types/enums';

export const useSessionStore = defineStore('session', () => {
  // ─── State ───────────────────────────────────────────
  const restaurant = ref<Restaurant | null>(null);
  const table = ref<Table | null>(null);
  const tableSession = ref<TableSession | null>(null);
  const guestSession = ref<GuestSession | null>(null);
  const publicToken = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // ─── Getters ─────────────────────────────────────────
  const isSessionActive = computed(() => tableSession.value?.status === SessionStatus.ACTIVE);

  const hasSession = computed(() => !!tableSession.value && !!guestSession.value);

  const tableName = computed(() => table.value?.name ?? '');

  const restaurantName = computed(() => restaurant.value?.name ?? '');

  // ─── Actions ─────────────────────────────────────────
  function setContext(
    rest: Restaurant,
    tbl: Table,
    session: TableSession,
    guest: GuestSession,
    token: string,
  ) {
    restaurant.value = rest;
    table.value = tbl;
    tableSession.value = session;
    guestSession.value = guest;
    publicToken.value = token;
    error.value = null;
  }

  function clearSession() {
    restaurant.value = null;
    table.value = null;
    tableSession.value = null;
    guestSession.value = null;
    publicToken.value = null;
    error.value = null;
  }

  function setError(msg: string) {
    error.value = msg;
  }

  function setLoading(val: boolean) {
    isLoading.value = val;
  }

  return {
    // State
    restaurant,
    table,
    tableSession,
    guestSession,
    publicToken,
    isLoading,
    error,
    // Getters
    isSessionActive,
    hasSession,
    tableName,
    restaurantName,
    // Actions
    setContext,
    clearSession,
    setError,
    setLoading,
  };
});
