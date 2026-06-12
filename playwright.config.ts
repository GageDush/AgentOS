import { defineConfig } from "@playwright/test";

const apiUrl = process.env.E2E_API_URL ?? "http://127.0.0.1:8787";
const appUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: appUrl,
    trace: "on-first-retry"
  },
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: "pnpm --filter @agentos/api dev",
          url: `${apiUrl}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000
        },
        {
          command: "pnpm --filter @agentos/command-center dev",
          url: appUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000
        }
      ]
});
