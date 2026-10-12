import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: 'ui-tests',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    timezoneId: 'UTC',
  },
  webServer: {
    command: 'node scripts/serve.mjs dist 4173',
    port: 4173,
    reuseExistingServer: true,
  },
});
