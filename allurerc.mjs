import { defineConfig } from 'allure';

export default defineConfig({
  name: 'DEMO Bang saen tests',
  output: './allure-report',
  historyPath: './test-history/allure-history.jsonl',
  plugins: { awesome: { options: { reportName: 'DEMO Bang saen tests' } } },
});
