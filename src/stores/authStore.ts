/**
 * Pinia store for owner authentication state.
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from 'src/services/supabase';
import type { User } from '@supabase/supabase-js';

export const useAuthStore = defineStore('auth', () => {
  // ─── State ───────────────────────────────────────────
  const user = ref<User | null>(null);
  const isLoading = ref(true);

  // ─── Getters ─────────────────────────────────────────
  const isAuthenticated = computed(() => !!user.value);

  // ─── Actions ─────────────────────────────────────────

  async function initialize() {
    isLoading.value = true;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      user.value = session?.user ?? null;
    } catch {
      user.value = null;
    } finally {
      isLoading.value = false;
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null;
    });
  }

  async function login(email: string, password: string): Promise<{ error: string | null }> {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message };
      }
      user.value = data.user;
      return { error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      return { error: msg };
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    user.value = null;
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    initialize,
    login,
    logout,
  };
});
