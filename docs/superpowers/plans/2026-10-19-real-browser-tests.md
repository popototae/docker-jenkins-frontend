# Real browser tests Implementation Plan

**Goal:** Make the normal browser command test the running Docker frontend at http://localhost:3000 with real API responses.

**Architecture:** Default config never starts another app or mocks API responses. An explicit mock config starts dev on port 3100 for the existing 11-case suite. Jenkins selects mock before Build and live after Deploy.

**Tech Stack:** Existing Playwright 1.64.0, Node, Next.js, Docker Compose and Jenkins; no new dependencies or shell helpers.

## Constraints

- Preserve the user's selector edit in e2e/attractions.spec.js and the application/database behavior.
- Never change database rows. Use isolated browser contexts for favorites.
- Real search must reflect real descriptions, including no results for fixture-only city view.

## Task 1: Explicit targets

Files: package.json, playwright.config.js, new playwright.mock.config.js, Jenkinsfile.

- [x] Default config selects live-api, uses E2E_BASE_URL or http://localhost:3000 and has no webServer.
- [x] Mock config extends browser/report settings, selects attractions.spec.js and starts Next on http://127.0.0.1:3100.
- [x] Main/UI/headed/live npm commands select live-api. Add test:browser:mock and test:browser:mock:ui.
- [x] Jenkins pre-build stage uses the mock command/name. Preserve post-deploy network and URL settings.
- [x] Verify separate selections with `npm.cmd run test:browser -- --list` and `npm.cmd run test:browser:mock -- --list`.

## Task 2: Real tests and docs

Files: e2e/live-api.spec.js, README.md, PLAYWRIGHT.md; root README.md and API-TESTING.md comparisons.

- [x] Each case reads the actual /api/attractions response during page navigation and requires a nonempty array.
- [x] Cover real rows/image loading, name and description search, city view result matching the real DB, clear filters, bidirectional sorting, coordinates, favorites across reload/removal and narrow-screen use.
- [x] Preserve mock-only loading/error/empty cases, with explicit command names.
- [x] Document localhost:3000 versus mock:3100, real target overrides in Bash/PowerShell, isolated storage, and actual Jenkins selection.

## Verification and delivery

- [x] Run the real suite against the local Docker stack; image failures must be visible.
- [x] Run the 11 mock cases and 4 unit tests; inspect git diff --check and preserve user edits.
- [x] Review the final commands and direct Jenkins stages, then commit and push the compatible frontend change.
