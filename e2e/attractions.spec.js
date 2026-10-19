const { test, expect } = require("@playwright/test");
const attractions = require("./fixtures/attractions.json");

// These tests use the real browser and frontend, with a controlled API response.
// See live-api.spec.js for the flow that also calls the real backend.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/attractions", (route) => route.fulfill({ json: attractions }));
});

test("opens the page and displays the attractions", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Attractions", exact: true })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByRole("status")).toHaveText("Showing 3 of 3 attractions · 0 favorites");
  await testInfo.attach("attractions-page", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("searches by name, ignoring case and surrounding spaces", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search attractions" }).fill("  pHI pHI  ");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Phi Phi Islands" })).toBeVisible();
});

test("searches descriptions too", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search attractions" }).fill("city view");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Eiffel Tower" })).toBeVisible();
});

test("shows no matches and clears filters", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("not-a-real-place");
  await page.getByLabel("Sort by").selectOption("name-desc");
  await page.getByRole("checkbox", { name: "Favorites only" }).check();
  await expect(page.getByText("No attractions match your filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.getByLabel("Sort by")).toHaveValue("default");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByRole("article")).toHaveCount(3);
});

test("sorts names in both directions", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Sort by").selectOption("name-asc");
  await expect(page.getByRole("article").getByRole("heading"))
    .toHaveText(["Eiffel Tower", "Mount Fuji", "Phi Phi Islands"]);
  await page.getByLabel("Sort by").selectOption("name-desc");
  await expect(page.getByRole("article").getByRole("heading"))
    .toHaveText(["Phi Phi Islands", "Mount Fuji", "Eiffel Tower"]);
});

test("opens and closes a place's details", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("article", { name: "Phi Phi Islands", exact: true });
  const latitude = card.getByText("7.7376190");
  await expect(latitude).not.toBeVisible();
  await card.getByText("View details", { exact: true }).click();
  await expect(latitude).toBeVisible();
  await card.getByText("View details", { exact: true }).click();
  await expect(latitude).not.toBeVisible();
});

test("saves a favorite across reload, filters it, and removes it", async ({ page }) => {
  await page.goto("/");
  const favorite = page.getByRole("button", { name: "Favorite Phi Phi Islands", exact: true });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("checkbox", { name: "Favorites only" }).check();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Phi Phi Islands" })).toBeVisible();
  await favorite.click();
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Showing 0 of 3 attractions · 0 favorites");
  await page.reload();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
});

test("shows a loading message until the API responds", async ({ page }) => {
  let respond;
  const responseReady = new Promise((resolve) => { respond = resolve; });
  await page.route("**/api/attractions", async (route) => {
    await responseReady;
    await route.fulfill({ json: attractions });
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("Loading...");
  respond();
  await expect(page.getByRole("article")).toHaveCount(3);
});

test("retries after an API error", async ({ page }) => {
  let apiHealthy = false;
  await page.route("**/api/attractions", (route) => {
    return apiHealthy
      ? route.fulfill({ json: attractions })
      : route.fulfill({ status: 500, json: { error: "Internal Server Error" } });
  });
  await page.goto("/");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Error: Failed to fetch");
  apiHealthy = true;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("article")).toHaveCount(3);
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("shows an empty database message", async ({ page }) => {
  await page.route("**/api/attractions", (route) => route.fulfill({ json: [] }));
  await page.goto("/");
  await expect(page.getByText("No attractions found.")).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("search and favorites work on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("searchbox").fill("Japan");
  await page.getByRole("button", { name: "Favorite Mount Fuji", exact: true }).click();
  await page.getByRole("checkbox", { name: "Favorites only" }).check();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Mount Fuji" })).toBeVisible();
});
