const { test, expect } = require("@playwright/test");

// No page.route() here: Browser -> Next.js /api rewrite -> API -> MySQL.
// Requires a running API with at least one attraction in its database.
test("loads real API data, searches, views details, and saves a favorite", async ({ page }, testInfo) => {
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/attractions"
  );
  await page.goto("/");
  const response = await responsePromise;
  expect(response.ok(), "The real API must return a successful response").toBeTruthy();
  const attractions = await response.json();
  expect(Array.isArray(attractions)).toBeTruthy();
  expect(attractions.length, "Seed the database before running this test").toBeGreaterThan(0);
  await expect(page.getByRole("article")).toHaveCount(attractions.length);
  await testInfo.attach("real-api-page", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  // Take the place name from the actual response, not from hard-coded seed data.
  const place = attractions[0];
  await page.getByRole("searchbox").fill(place.name);
  const card = page.getByRole("article", { name: place.name, exact: true });
  await expect(card.getByRole("heading", { name: place.name, exact: true })).toBeVisible();
  await card.getByText("View details", { exact: true }).click();
  await expect(card.getByText(String(place.latitude), { exact: true })).toBeVisible();
  await card.getByRole("button", { name: `Favorite ${place.name}`, exact: true }).click();
  await page.getByRole("checkbox", { name: "Favorites only" }).check();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("button", { name: `Favorite ${place.name}`, exact: true }))
    .toHaveAttribute("aria-pressed", "true");
});
