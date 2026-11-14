import { assertSafeTestEnvironment } from './guard.mjs';

export default async function globalSetup() {
  assertSafeTestEnvironment();
}
