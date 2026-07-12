import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.PORDEE_E2E_PORT ?? "5173";
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm dev --host 127.0.0.1 --port ${e2ePort}`,
    env: {
      AUTH_EMAIL_FROM:
        process.env.AUTH_EMAIL_FROM ?? "Pordee <no-reply@pordee.test>",
      RESEND_API_KEY: process.env.RESEND_API_KEY ?? "re_e2e_not_used",
    },
    url: e2eBaseUrl,
    reuseExistingServer: process.env.PORDEE_E2E_REUSE_SERVER === "true",
    timeout: 120_000,
  },
});
