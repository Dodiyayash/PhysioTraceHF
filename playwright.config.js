import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/e2e.spec.js',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'msedge', // Uses installed Microsoft Edge on Windows
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ]
    }
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 10000
  }
});
