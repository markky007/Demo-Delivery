import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/specs',
  globalSetup: './tests/e2e/global-setup.mjs',
  reporter: [['list'], ['allure-playwright', { resultsDir: 'allure-results' }]],
  use: { baseURL: 'http://127.0.0.1:9000' },
});
