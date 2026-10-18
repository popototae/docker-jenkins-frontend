const { defineConfig, devices } = require("@playwright/test");
const liveConfig = require("./playwright.config");
const baseURL = "http://127.0.0.1:3100";

module.exports = defineConfig({
  ...liveConfig,
  use: { ...liveConfig.use, baseURL },
  projects: [{
    name: "mock-chromium",
    testMatch: "attractions.spec.js",
    use: { ...devices["Desktop Chrome"] },
  }],
  webServer: {
    command: "npx next dev --turbopack --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
