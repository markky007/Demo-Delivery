export function assertSafeTestEnvironment(env = process.env) {
  const url = env.SUPABASE_URL;
  const prod = env.PROD_SUPABASE_URL;
  if (!url || !prod)
    throw new Error('SUPABASE_URL and PROD_SUPABASE_URL are required for E2E tests');
  const normalized = (value) => new URL(value).origin;
  if (normalized(url) === normalized(prod) && env.ALLOW_PROD_TESTS !== 'true') {
    throw new Error('Production Supabase URL is blocked for tests');
  }
  if (env.TEST_DB_MODE !== 'local' || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
    throw new Error('Only local Supabase is enabled until a test environment is selected');
  }
  if (!env.SUPABASE_ANON_KEY) throw new Error('SUPABASE_ANON_KEY is required');
  if (env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('Service role key must not be present in frontend tests');
}
