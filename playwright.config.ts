import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./frontend/tests",
  timeout: 45000,
  workers: 1,
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL,
    baseURL: process.env.GFC_TEST_URL || "http://127.0.0.1:5173",
    viewport: { width: 1600, height: 1000 },
  },
  webServer: process.env.GFC_TEST_URL
    ? undefined
    : {
        command: "npm run dev -- --strictPort",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: false,
        timeout: 30000,
      },
});
