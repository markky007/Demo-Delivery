import { describe, expect, it } from 'vitest';
import { assertSafeTestEnvironment } from '../e2e/guard.mjs';
import { step } from 'allure-js-commons';
import { setCaseMeta } from './allureMeta';

describe('E2E production guard', () => {
  const base = {
    SUPABASE_URL: 'http://127.0.0.1:54321',
    PROD_SUPABASE_URL: 'https://production.supabase.co',
    SUPABASE_ANON_KEY: 'test-public-key',
    TEST_DB_MODE: 'local',
  };
  it('TC-GUARD-001 accepts local test Supabase', async () => {
    await setCaseMeta('TC-GUARD-001', 'Environment guard', 'Local connection', 'blocker');
    await step('Validate a local URL', async () => {
      expect(() => assertSafeTestEnvironment(base)).not.toThrow();
    });
  });
  it('TC-GUARD-002 blocks production URL', async () => {
    await setCaseMeta('TC-GUARD-002', 'Environment guard', 'Production block', 'blocker');
    await step('Reject production URL', async () => {
      expect(() =>
        assertSafeTestEnvironment({ ...base, SUPABASE_URL: base.PROD_SUPABASE_URL }),
      ).toThrow(/Production/);
    });
  });
  it('TC-GUARD-003 blocks a missing production reference', async () => {
    await setCaseMeta('TC-GUARD-003', 'Environment guard', 'Missing reference', 'blocker');
    await step('Reject missing production reference', async () => {
      expect(() => assertSafeTestEnvironment({ ...base, PROD_SUPABASE_URL: '' })).toThrow();
    });
  });
});
