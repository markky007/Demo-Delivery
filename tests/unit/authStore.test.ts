import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { step } from 'allure-js-commons';
import { setCaseMeta } from './allureMeta';

const api = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock('src/services/supabase', () => ({ supabase: { auth: api, rpc: api.rpc } }));
import { useAuthStore } from '../../src/stores/authStore';

describe('owner authentication', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    api.signOut.mockResolvedValue({ error: null });
  });

  it('TC-AUTH-001 accepts an authenticated allowlisted owner', async () => {
    await setCaseMeta('TC-AUTH-001', 'Auth', 'Owner login', 'critical');
    const user = { id: 'owner-a' };
    api.signInWithPassword.mockResolvedValue({ data: { user }, error: null });
    api.rpc.mockResolvedValue({ data: true, error: null });
    const store = useAuthStore();
    await step('Sign in and verify owner allowlist', async () => {
      expect(await store.login('owner@example.test', 'secret')).toEqual({ error: null });
    });
    expect(store.isAuthenticated).toBe(true);
    expect(api.rpc).toHaveBeenCalledWith('is_owner');
  });

  it('TC-AUTH-002 reports invalid credentials without authentication', async () => {
    await setCaseMeta('TC-AUTH-002', 'Auth', 'Rejected login', 'critical');
    api.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login' },
    });
    const store = useAuthStore();
    await step('Submit invalid credentials', async () => {
      expect(await store.login('bad@example.test', 'wrong')).toEqual({ error: 'Invalid login' });
    });
    expect(store.isAuthenticated).toBe(false);
    expect(store.isLoading).toBe(false);
  });

  it('TC-AUTH-003 signs out a user missing owner access', async () => {
    await setCaseMeta('TC-AUTH-003', 'Auth', 'Non-owner rejection', 'blocker');
    api.signInWithPassword.mockResolvedValue({ data: { user: { id: 'user-b' } }, error: null });
    api.rpc.mockResolvedValue({ data: false, error: null });
    const store = useAuthStore();
    await step('Verify allowlist denial', async () => {
      expect((await store.login('user@example.test', 'secret')).error).toMatch(/ไม่มีสิทธิ์/);
    });
    expect(api.signOut).toHaveBeenCalledOnce();
    expect(store.isAuthenticated).toBe(false);
  });

  it('TC-AUTH-004 clears owner state on logout', async () => {
    await setCaseMeta('TC-AUTH-004', 'Auth', 'Owner logout', 'critical');
    api.signInWithPassword.mockResolvedValue({ data: { user: { id: 'owner-a' } }, error: null });
    api.rpc.mockResolvedValue({ data: true, error: null });
    const store = useAuthStore();
    await store.login('owner@example.test', 'secret');
    await step('Sign out and inspect state', async () => {
      await store.logout();
    });
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });
});
