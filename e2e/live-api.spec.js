const { test: base, expect } = require("@playwright/test");

// Read the real response from the running frontend in every case. No API mocking.
const test = base.extend({
  attractions: async ({ page }, use) => {
    const [response] = await Promise.all([
      page.waitForResponse((result) => new URL(result.url()).pathname === "/api/attractions"),
      page.goto("/"),
    ]);
    expect(response.ok(), "The running frontend must reach its real API").toBeTruthy();
    const rows = await response.json();
    expect(Array.isArray(rows)).toBeTruthy();
    expect(rows.length, "Seed the real database before running browser tests").toBeGreaterThan(0);
    await expect(page.getByRole("article")).toHaveCount(rows.length);
    await use(rows);
  },
});

function cardFor(page, place) {
  return page.getByRole("article", { name: place.name, exact: true });
}

test("displays real API rows and loads a real attraction image", async ({ page, attractions }, testInfo) => {
  await expect(page.getByRole("heading", { name: "Attractions", exact: true })).toBeVisible();
  await expect(page.getByRole("article").getByRole("heading"))
    .toHaveText(attractions.map((place) => place.name));
  const place = attractions.find((row) => row.coverimage);
  expect(place, "The real dataset must include an attraction with an image").toBeDefined();
  const picture = cardFor(page, place).getByRole("img", { name: place.name, exact: true });
  await expect(picture).toHaveAttribute("src", place.coverimage);
  await picture.scrollIntoViewIfNeeded();
  await expect.poll(() => picture.evaluate((img) => img.complete && img.naturalWidth > 0), {
    timeout: 15_000,
    message: `The real attraction image must load: ${place.coverimage}`,
  }).toBeTruthy();
  await testInfo.attach("real-api-page", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("searches a real name ignoring case and surrounding spaces", async ({ page, attractions }) => {
  const place = attractions[0];
  await page.getByRole("searchbox").fill(`  ${place.name.toUpperCase()}  `);
  await expect(cardFor(page, place)).toBeVisible();
  await expect(page.getByRole("article").filter({ hasNotText: place.name })).toHaveCount(0);
});

test("searches text from a real description", async ({ page, attractions }) => {
  const place = attractions.find((row) => row.detail?.trim());
  expect(place, "A real description is required for this test").toBeDefined();
  const phrase = place.detail.trim();
  const expected = attractions.filter((row) => [row.name, row.detail || ""]
    .some((text) => text.toLowerCase().includes(phrase.toLowerCase())));
  await page.getByRole("searchbox").fill(phrase);
  await expect(page.getByRole("article")).toHaveCount(expected.length);
  await expect(cardFor(page, place)).toBeVisible();
});

test("city view search reflects the real database rather than mock data", async ({ page, attractions }) => {
  const matchingPlaces = attractions.filter((place) => /city view/i.test(`${place.name} ${place.detail || ""}`));
  await page.getByRole("searchbox").fill("city view");
  await expect(page.getByRole("article")).toHaveCount(matchingPlaces.length);
  if (matchingPlaces.length === 0) {
    await expect(page.getByText("No attractions match your filters.", { exact: true })).toBeVisible();
  } else {
    await expect(page.getByRole("article").getByRole("heading"))
      .toHaveText(matchingPlaces.map((place) => place.name));
  }
});

test("clears search, sorting and favorites filter to restore the real list", async ({ page, attractions }) => {
  const missing = "__playwright_no_matching_attraction_7fba1c__";
  expect(JSON.stringify(attractions)).not.toContain(missing);
  await page.getByRole("searchbox").fill(missing);
  await page.getByLabel("Sort by").selectOption("name-desc");
  await page.getByRole("checkbox", { name: "Favorites only" }).check();
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.getByLabel("Sort by")).toHaveValue("default");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByRole("article").getByRole("heading"))
    .toHaveText(attractions.map((place) => place.name));
});

test("sorts the real attraction names in both directions", async ({ page, attractions }) => {
  const names = attractions.map((place) => place.name).sort(new Intl.Collator("en").compare);
  await page.getByLabel("Sort by").selectOption("name-asc");
  await expect(page.getByRole("article").getByRole("heading")).toHaveText(names);
  await page.getByLabel("Sort by").selectOption("name-desc");
  await expect(page.getByRole("article").getByRole("heading")).toHaveText([...names].reverse());
});

test("opens and closes real location coordinates", async ({ page, attractions }) => {
  const place = attractions[0];
  const card = cardFor(page, place);
  const latitude = card.getByText(String(place.latitude), { exact: true });
  await expect(latitude).not.toBeVisible();
  await card.getByText("View details", { exact: true }).click();
  await expect(latitude).toBeVisible();
  await expect(card.getByText(String(place.longitude), { exact: true })).toBeVisible();
  await card.getByText("View details", { exact: true }).click();
  await expect(latitude).not.toBeVisible();
});

test("saves a real favorite across reload then filters and removes it", async ({ page, attractions }) => {
  const place = attractions[0];
  const favorite = cardFor(page, place).getByRole("button", { name: `Favorite ${place.name}`, exact: true });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("checkbox", { name: "Favorites only" }).check();
  await expect(page.getByRole("article")).toHaveCount(1);
  await favorite.click();
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.reload();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
});

test("searches and filters real favorites on a narrow screen", async ({ page, attractions }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const place = attractions[0];
  await page.getByRole("searchbox").fill(place.name);
  await cardFor(page, place).getByRole("button", { name: `Favorite ${place.name}`, exact: true }).click();
  await page.getByRole("checkbox", { name: "Favorites only" }).check();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(cardFor(page, place)).toBeVisible();
});
