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
  const isOwner = ref(false);
  const isLoading = ref(true);
  let authListenerInstalled = false;

  // ─── Getters ─────────────────────────────────────────
  const isAuthenticated = computed(() => !!user.value && isOwner.value);

  // ─── Actions ─────────────────────────────────────────

  async function initialize() {
    isLoading.value = true;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      user.value = session?.user ?? null;
      if (session) {
        const { data, error } = await supabase.rpc('is_owner');
        isOwner.value = !error && data === true;
      } else {
        isOwner.value = false;
      }
    } catch {
      user.value = null;
      isOwner.value = false;
    } finally {
      isLoading.value = false;
    }

    // Listen for auth changes
    if (!authListenerInstalled) {
      authListenerInstalled = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user ?? null;
        isOwner.value = false;
        if (session) {
          setTimeout(() => {
            void supabase.rpc('is_owner').then(({ data, error }) => {
              isOwner.value = !error && data === true;
            });
          }, 0);
        }
      });
    }
  }

  async function login(email: string, password: string): Promise<{ error: string | null }> {
    isLoading.value = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message };
      }
      user.value = data.user;
      const { data: ownerAccess, error: ownerError } = await supabase.rpc('is_owner');
      if (ownerError || ownerAccess !== true) {
        await supabase.auth.signOut();
        user.value = null;
        isOwner.value = false;
        return { error: 'บัญชีนี้ไม่มีสิทธิ์เข้าหน้าเจ้าของร้าน' };
      }
      isOwner.value = true;
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
    isOwner.value = false;
  }

  return {
    user,
    isOwner,
    isLoading,
    isAuthenticated,
    initialize,
    login,
    logout,
  };
});
