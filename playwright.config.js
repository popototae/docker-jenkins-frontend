const { defineConfig, devices } = require("@playwright/test");

// Default: start our local frontend on a test-only port.
// E2E_BASE_URL: test a frontend that is already running instead.
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3100";

module.exports = defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["junit", { outputFile: process.env.PLAYWRIGHT_JUNIT_OUTPUT_FILE || "test-results/junit.xml" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testMatch: "attractions.spec.js",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "live-api",
      testMatch: "live-api.spec.js",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: "npx next dev --turbopack --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
