const { defineConfig, devices } = require("@playwright/test");

// Test the running app. Use playwright.mock.config.js for controlled API responses.
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

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
      name: "live-api",
      testMatch: "live-api.spec.js",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
