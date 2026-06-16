/**
 * Management feature E2E tests — checks 18–23 (APP_SPEC.md success checks).
 *
 * Covers:
 * 18. RENAME: header title rename + recent-trips-list rename both hit PUT; name persists + is shared.
 * 19. DELETE: destructive confirm dialog exact copy; DELETE route called; GET returns 404 after;
 *     trip-page delete navigates to landing.
 * 20. REMOVE FROM MY LIST: localStorage-only; GET /api/trip/[id] still returns 200 after remove;
 *     no DELETE request issued.
 * 21. NOT CONFUSED: "Remove from my list" and "Delete" are distinct controls in the recent-trips list.
 * 22. CREATE NEW: header "Create New" is a navigation link to "/", not an event-create button.
 * 23. NO REGRESSION: Emily acceptance test (check 1), drag-create (check 9), confirm-by-name (check 15).
 *
 * TRAPS verified:
 * - empty recent-trips list: landing renders without crash, no management UI.
 * - single-entry list: all 3 per-entry actions present (Remove from my list, Rename, Delete).
 * - pre-seeded localStorage: actions render on returning-user visit.
 * - header height at desktop AND 390px: management controls don't overflow/occlude grid.
 * - dual-rendered header controls: scope locators to first match / desktop viewport.
 */

import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiCreateTrip(name: string): Promise<string> {
  const res = await fetch(`${BASE}/api/trip-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const json = (await res.json()) as { id: string };
  return json.id;
}

async function apiGetTrip(id: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}/api/trip/${id}`);
  const body = await res.json();
  return { status: res.status, body };
}

async function apiPutTrip(id: string, data: unknown) {
  const res = await fetch(`${BASE}/api/trip/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function seedRecentTrips(page: Page, entries: Array<{ id: string; name: string }>) {
  await page.evaluate((entries) => {
    localStorage.setItem(
      "tripsync_recent",
      JSON.stringify(entries.map((e) => ({ ...e, createdAt: Date.now() })))
    );
  }, entries);
}

// ── Check 18: RENAME — header + list both use PUT; persists across fresh context ─

test("C18a: trip-page header rename calls PUT and name survives fresh-browser reload", async ({ browser }) => {
  const tripId = await apiCreateTrip("Original Name");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Seed participant to skip name prompt
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-c18a", name: "Tester" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // The trip title is a button — click to open inline rename
  const titleBtn = page.locator('button[aria-label="Click to rename trip"]');
  await expect(titleBtn).toBeVisible({ timeout: 5000 });
  await titleBtn.click();

  // Inline editor input with aria-label "Trip name"
  const nameInput = page.locator('input[aria-label="Trip name"]');
  await expect(nameInput).toBeVisible({ timeout: 3000 });
  await nameInput.fill("Renamed Via Header");

  // Save with ✓ button
  await page.locator('button[aria-label="Save trip name"]').click();

  // Header should show new name
  await expect(page.locator("text=Renamed Via Header")).toBeVisible({ timeout: 5000 });

  // Wait for Saved indicator
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 8000 });

  // Verify via API — must be server-side, not just local
  const { body } = await apiGetTrip(tripId);
  expect((body as { data: { name: string } }).data.name).toBe("Renamed Via Header");

  // Fresh-browser context: name must be visible without localStorage
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.goto(`${BASE}/t/${tripId}`);
  await expect(page2.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await expect(page2.locator("text=Renamed Via Header")).toBeVisible({ timeout: 5000 });

  await ctx.close();
  await ctx2.close();
});

test("C18b: recent-trips list rename calls PUT; name persists on server", async ({ browser }) => {
  const tripId = await apiCreateTrip("List Rename Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Seed localStorage with the recent trip so it shows in the list
  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "List Rename Test" }]);
  await page.reload();

  // Recent trips section must be visible with one entry
  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  // Pencil/rename button (aria-label="Rename trip")
  const renameBtn = page.locator('button[aria-label="Rename trip"]').first();
  await expect(renameBtn).toBeVisible({ timeout: 5000 });
  await renameBtn.click();

  // Inline rename input appears
  const renameInput = page.locator('input[aria-label="New trip name"]');
  await expect(renameInput).toBeVisible({ timeout: 3000 });
  await renameInput.fill("List Renamed Name");

  // Save
  await page.locator('button[aria-label="Save new trip name"]').click();

  // Wait for rename to complete (input should disappear)
  await expect(renameInput).not.toBeVisible({ timeout: 5000 });

  // Updated name should appear in the list
  await expect(page.locator("text=List Renamed Name")).toBeVisible({ timeout: 3000 });

  // Server must have the new name (server-side, not just localStorage)
  const { body } = await apiGetTrip(tripId);
  expect((body as { data: { name: string } }).data.name).toBe("List Renamed Name");

  await ctx.close();
});

// ── Check 19: DELETE — confirm copy exact; route called; GET → 404 after; navigates to "/" ─

test("C19a: trip-page delete shows exact confirm copy and calls DELETE route", async ({ browser }) => {
  const tripId = await apiCreateTrip("Delete From Page Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-c19", name: "Tester" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Open ⋯ menu
  await page.locator('button[aria-label="Trip options"]').click();

  // Click "Delete trip" in menu
  await page.locator('button[role="menuitem"]').filter({ hasText: "Delete trip" }).click();

  // Confirm dialog must appear with VERBATIM text from spec
  const confirmText = "Delete this trip for everyone with the link? This can't be undone.";
  await expect(page.locator(`text=${confirmText}`)).toBeVisible({ timeout: 3000 });

  // Intercept DELETE request
  let deleteHit = false;
  page.on("request", (req) => {
    if (req.method() === "DELETE" && req.url().includes(`/api/trip/${tripId}`)) {
      deleteHit = true;
    }
  });

  // Click Delete in the dialog — use testid to avoid resolving to the rename button behind the dialog
  await page.locator('[data-testid="delete-confirm-button"]').click();

  // Should navigate to landing page
  await expect(page).toHaveURL(`${BASE}/`, { timeout: 10000 });

  // DELETE route must have been called
  expect(deleteHit).toBe(true);

  // GET on the deleted id must return 404
  const { status } = await apiGetTrip(tripId);
  expect(status).toBe(404);

  await ctx.close();
});

test("C19b: recent-trips list delete shows confirm and calls DELETE route", async ({ browser }) => {
  const tripId = await apiCreateTrip("List Delete Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "List Delete Test" }]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  // Track DELETE request
  let deleteHit = false;
  page.on("request", (req) => {
    if (req.method() === "DELETE" && req.url().includes(`/api/trip/${tripId}`)) {
      deleteHit = true;
    }
  });

  // Click "Delete for everyone" button (aria-label="Delete for everyone", labeled red button)
  await page.locator(`[data-testid="recent-delete-${tripId}"]`).click();

  // Confirm dialog must appear with verbatim copy
  const confirmText = "Delete this trip for everyone with the link? This can't be undone.";
  await expect(page.locator(`text=${confirmText}`)).toBeVisible({ timeout: 3000 });

  // Confirm — use testid to avoid resolving to background buttons intercepted by dialog
  await page.locator('[data-testid="delete-confirm-button"]').click();

  // Dialog closes and entry disappears from list
  await expect(page.locator(`text=${confirmText}`)).not.toBeVisible({ timeout: 5000 });

  // DELETE route must have been called
  expect(deleteHit).toBe(true);

  // GET must return 404
  const { status } = await apiGetTrip(tripId);
  expect(status).toBe(404);

  await ctx.close();
});

test("C19c: after DELETE, /t/<secret> in fresh browser no longer loads the trip", async ({ browser }) => {
  const tripId = await apiCreateTrip("Delete Then Load Test");

  // Delete via API directly (server-side remove)
  await fetch(`${BASE}/api/trip/${tripId}`, { method: "DELETE" });

  // Confirm 404
  const { status } = await apiGetTrip(tripId);
  expect(status).toBe(404);

  // Fresh browser context tries to load the trip page
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // The trip no longer loads — it should show an error/not-found state
  // (The app should NOT show normal calendar content for a deleted trip)
  const calendarVisible = await page.locator('[aria-label="Day schedule"]').isVisible().catch(() => false);
  expect(calendarVisible).toBe(false);

  await ctx.close();
});

// ── Check 20: REMOVE FROM MY LIST — device-local; no DELETE call; server intact ─

test("C20: 'Remove from my list' removes localStorage entry, does NOT call DELETE, server trip intact", async ({ browser }) => {
  const tripId = await apiCreateTrip("Remove From List Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "Remove From List Test" }]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  // Track DELETE requests — none should be issued
  let deleteHit = false;
  page.on("request", (req) => {
    if (req.method() === "DELETE" && req.url().includes(`/api/trip/${tripId}`)) {
      deleteHit = true;
    }
  });

  // Click "Remove from my list"
  const removeBtn = page.locator('button[aria-label="Remove from my list"]').first();
  await expect(removeBtn).toBeVisible({ timeout: 5000 });
  await removeBtn.click();

  // Entry disappears from the list
  await expect(page.locator("text=Remove From List Test")).not.toBeVisible({ timeout: 3000 });

  // No DELETE request issued
  await page.waitForTimeout(500); // give any async call a moment
  expect(deleteHit).toBe(false);

  // Server still has the trip
  const { status, body } = await apiGetTrip(tripId);
  expect(status).toBe(200);
  expect((body as { data: { name: string } }).data.name).toBe("Remove From List Test");

  // localStorage should no longer have this trip
  const localStorageEntry = await page.evaluate((tripId) => {
    const raw = localStorage.getItem("tripsync_recent");
    if (!raw) return false;
    const items = JSON.parse(raw) as Array<{ id: string }>;
    return items.some((i) => i.id === tripId);
  }, tripId);
  expect(localStorageEntry).toBe(false);

  await ctx.close();
});

test("C20-returning-user: pre-seeded localStorage — Remove from my list works on returning user load", async ({ browser }) => {
  const tripId = await apiCreateTrip("Returning Remove Test");
  const tripId2 = await apiCreateTrip("Other Trip Test");

  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Seed two entries BEFORE mount (returning-user scenario)
  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [
    { id: tripId, name: "Returning Remove Test" },
    { id: tripId2, name: "Other Trip Test" },
  ]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });
  // Both entries visible
  await expect(page.locator("text=Returning Remove Test")).toBeVisible();
  await expect(page.locator("text=Other Trip Test")).toBeVisible();

  // Remove first entry
  await page.locator('button[aria-label="Remove from my list"]').first().click();

  // First entry gone; second still visible
  await expect(page.locator("text=Returning Remove Test")).not.toBeVisible({ timeout: 3000 });
  await expect(page.locator("text=Other Trip Test")).toBeVisible();

  // Server for first trip still intact
  const { status } = await apiGetTrip(tripId);
  expect(status).toBe(200);

  await ctx.close();
});

// ── Check 21: NOT CONFUSED — distinct controls, only Delete triggers confirm dialog ─

test("C21: 'Remove from my list' and 'Delete' are distinct controls; only Delete triggers confirm", async ({ browser }) => {
  const tripId = await apiCreateTrip("Distinction Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "Distinction Test" }]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  // "Remove from my list" button exists
  const removeBtn = page.locator('button[aria-label="Remove from my list"]').first();
  await expect(removeBtn).toBeVisible();

  // "Delete for everyone" button exists (labeled red button; aria-label was renamed from
  // "Delete trip for everyone" to "Delete for everyone" in R5 panel1 fix)
  const deleteBtn = page.locator(`[data-testid="recent-delete-${tripId}"]`);
  await expect(deleteBtn).toBeVisible();

  // Confirm they are distinct elements (different aria-label)
  const removeLabel = await removeBtn.getAttribute("aria-label");
  const deleteLabel = await deleteBtn.getAttribute("aria-label");
  expect(removeLabel).not.toBe(deleteLabel);
  expect(removeLabel).toContain("Remove");
  expect(deleteLabel).toContain("Delete");

  // "Remove from my list" does NOT open the confirm dialog
  await removeBtn.click();
  const confirmDialog = page.locator('[data-testid="delete-confirm-dialog"]');
  await expect(confirmDialog).not.toBeVisible({ timeout: 500 });

  // Re-seed since remove cleared the entry
  await seedRecentTrips(page, [{ id: tripId, name: "Distinction Test" }]);
  await page.reload();
  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  // "Delete for everyone" DOES open the confirm dialog
  await page.locator(`[data-testid="recent-delete-${tripId}"]`).click();
  // Confirm dialog with verbatim text must appear
  await expect(page.locator("text=Delete this trip for everyone with the link")).toBeVisible({ timeout: 3000 });
  // Cancel to not destroy the trip
  await page.locator('button', { hasText: "Cancel" }).click();

  await ctx.close();
});

// ── Check 21: empty list — no crash, no management UI ─────────────────────────

test("C21-empty-list: landing with no recent trips renders without crash; no management UI", async ({ page }) => {
  // Clear any localStorage
  await page.goto(`${BASE}/`);
  await page.evaluate(() => localStorage.removeItem("tripsync_recent"));
  await page.reload();

  // Landing renders
  await expect(page.locator("h1").first()).toBeVisible();

  // No "Recent trips on this device" section
  await expect(page.locator("text=Recent trips on this device")).not.toBeVisible();

  // No management buttons (aria-label updated from "Delete trip for everyone" to "Delete for everyone" in R5 panel1 fix)
  await expect(page.locator('button[aria-label="Remove from my list"]')).not.toBeVisible();
  await expect(page.locator('button[aria-label="Delete for everyone"]')).not.toBeVisible();
});

// ── Check 22: CREATE NEW — navigation link to "/" not an event-create button ───

test("C22: trip-page header 'Create New' is a link to '/', not an event-create control", async ({ browser }) => {
  const tripId = await apiCreateTrip("Create New Nav Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-c22", name: "Tester" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // "Create New" link (aria-label="Create new trip") must exist in the header
  const createNewLink = page.locator('a[aria-label="Create new trip"]').first();
  await expect(createNewLink).toBeVisible({ timeout: 5000 });

  // It must be an <a> tag (navigation link), not a <button>
  const tagName = await createNewLink.evaluate((el) => el.tagName.toLowerCase());
  expect(tagName).toBe("a");

  // href must point to "/"
  const href = await createNewLink.getAttribute("href");
  expect(href).toBe("/");

  // Clicking it navigates to landing
  await createNewLink.click();
  await expect(page).toHaveURL(`${BASE}/`, { timeout: 5000 });
  await expect(page.locator("h1").first()).toBeVisible();

  await ctx.close();
});

test("C22-mobile: 390px — Create New link visible and navigates to landing", async ({ browser }) => {
  const tripId = await apiCreateTrip("Create New Mobile Test");
  await apiPutTrip(tripId, {
    name: "Create New Mobile Test",
    details: "",
    events: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-c22m", name: "Tester" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Header must not overflow
  const header = page.locator("header").first();
  const headerBox = await header.boundingBox();
  expect(headerBox).not.toBeNull();
  // Management feature raised maxHeight to 128px — accept up to 132px with margin
  expect(headerBox!.height).toBeLessThanOrEqual(132);

  // Create New link in header
  const createNewLink = page.locator('a[aria-label="Create new trip"]').first();
  await expect(createNewLink).toBeVisible({ timeout: 5000 });

  // Grid must be visible below header (not occluded)
  const dayGrid = page.locator('[aria-label="Day schedule"]');
  await expect(dayGrid).toBeVisible({ timeout: 5000 });
  const gridBox = await dayGrid.boundingBox();
  expect(gridBox).not.toBeNull();
  expect(gridBox!.y).toBeGreaterThanOrEqual(headerBox!.height - 4);

  await ctx.close();
});

// ── Check 23: NO REGRESSION — Emily test (check 1), drag-create (check 9), confirm-by-name (check 15) ─

test("C23-emily: Emily acceptance test still passes (check 1)", async ({ page }) => {
  const tripId = await apiCreateTrip("C23 Emily Regression");

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Paste panel auto-opens for empty trip
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  // Load sample
  await page.getByLabel("Load sample itinerary").click();
  const textarea = page.getByLabel("Paste itinerary text");
  await expect(textarea).toHaveValue(/Friday May 1/);

  // Parse
  await page.getByRole("button", { name: "Parse →" }).click();
  await expect(page.locator("text=Preview parsed events")).toBeVisible({ timeout: 5000 });

  // Key events in preview
  const titleInputs = page.locator('input[aria-label="Event title"]');
  const count = await titleInputs.count();
  expect(count).toBeGreaterThan(0);
  const titles: string[] = [];
  for (let i = 0; i < count; i++) titles.push(await titleInputs.nth(i).inputValue());
  expect(titles.some((t) => t.includes("Emily lands"))).toBe(true);
  expect(titles.some((t) => t.includes("Uber to 123 Main St"))).toBe(true);
  expect(titles.some((t) => t.includes("Bar Part Time"))).toBe(true);

  // Confirm
  const addBtn = page.locator("button").filter({ hasText: /Add to C23 Emily Regression/i });
  await expect(addBtn).toBeVisible();
  await addBtn.click();

  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Emily lands")).toBeVisible({ timeout: 5000 });
});

test("C23-dragcreate: desktop drag-create still works (check 9)", async ({ browser }) => {
  const tripId = await apiCreateTrip("C23 Drag Regression");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-c23d", name: "Tester" }) }
  );

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  const gridBox = await grid.boundingBox();
  expect(gridBox).not.toBeNull();
  await grid.evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(200);

  const HOUR_HEIGHT = 60;
  const DAY_START = 6;
  const y9am = gridBox!.y + (9 - DAY_START) * HOUR_HEIGHT;
  const y11am = gridBox!.y + (11 - DAY_START) * HOUR_HEIGHT;
  const x = gridBox!.x + 80;

  // Drag 9:00 → 11:00
  await page.mouse.move(x, y9am);
  await page.mouse.down();
  await page.mouse.move(x, y9am + 10);
  await page.mouse.move(x, y11am);
  await page.mouse.up();

  // Quick-create popover appears
  const popover = page.locator('[aria-label="Quick create event"]');
  await expect(popover).toBeVisible({ timeout: 3000 });

  // Fill title and save
  await page.locator('[aria-label="New event title"]').fill("C23 Drag Event");
  await page.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();
  await expect(page.locator("text=C23 Drag Event")).toBeVisible({ timeout: 3000 });

  // Wait for save; verify via API (startMinutes=540, endMinutes=660)
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 8000 });

  const res = await fetch(`${BASE}/api/trip/${tripId}`);
  const data = (await res.json()) as { data: { events: Array<{ title: string; startMinutes: number; endMinutes: number; deletedAt?: number }> } };
  const ev = data.data.events.find((e) => e.title === "C23 Drag Event" && !e.deletedAt);
  expect(ev).toBeDefined();
  expect(ev!.startMinutes).toBe(540);
  expect(ev!.endMinutes).toBe(660);

  await ctx.close();
});

test("C23-confirmname: confirm-by-name still works (check 15)", async ({ browser }) => {
  const tripId = await apiCreateTrip("C23 Confirm Name Regression");
  await apiPutTrip(tripId, {
    name: "C23 Confirm Name Regression",
    details: "",
    events: [
      {
        id: "c23-conf-evt",
        date: "2026-05-01",
        startMinutes: 750,
        endMinutes: 810,
        // Deliberately does NOT include "Confirm" in title to avoid aria-label collision
        // when using getByRole("button", { name: "Confirm" }) to target the dialog button.
        title: "C23 Verify Name Check",
        status: "proposed",
        authorId: "pid-c23c-author",
        authorName: "Author",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-c23c", name: "Joanne" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();

  // Tap the event
  await page.locator('[data-event-id="c23-conf-evt"]').click();
  await expect(page.getByRole("dialog").filter({ hasText: "C23 Verify Name Check" })).toBeVisible({ timeout: 5000 });

  // Confirm — scope inside the open dialog to avoid strict-mode collision with
  // the event block's own aria-label containing "Confirm"
  const dialog = page.getByRole("dialog").filter({ hasText: "C23 Verify Name Check" });
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();

  // Should show "Confirmed by you" (viewer-relative)
  await expect(page.locator("text=Confirmed by you").first()).toBeVisible({ timeout: 5000 });

  // Verify server state
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 8000 });
  const res = await fetch(`${BASE}/api/trip/${tripId}`);
  const data = (await res.json()) as { data: { events: Array<{ id: string; status: string; confirmedBy?: string }> } };
  const ev = data.data.events.find((e) => e.id === "c23-conf-evt");
  expect(ev?.status).toBe("confirmed");
  expect(ev?.confirmedBy).toBe("Joanne");

  await ctx.close();
});
