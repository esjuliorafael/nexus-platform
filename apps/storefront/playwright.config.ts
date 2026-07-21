import { defineConfig, devices } from '@playwright/test';

const storefrontPort = 3100;
const mockApiPort = 3999;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${storefrontPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node e2e/mock-api.mjs',
      url: `http://127.0.0.1:${mockApiPort}/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm exec next dev -p ${storefrontPort}`,
      url: `http://127.0.0.1:${storefrontPort}`,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        INTERNAL_API_URL: `http://127.0.0.1:${mockApiPort}/api/v1`,
        NEXT_PUBLIC_API_URL: `http://127.0.0.1:${mockApiPort}/api/v1`,
      },
    },
  ],
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['iPhone 14'], browserName: 'chromium' },
    },
  ],
});
