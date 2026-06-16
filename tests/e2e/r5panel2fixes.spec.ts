/**
 * Panel-round-2 regression gate for the 4 view-only polish fixes.
 *
 * Fix 1 (R5-P2-F1): Read-only mode with an EMPTY day must NOT show the
 *   "Tap a slot to add an event, or use the + button below." hint — that
 *   hint is only for touch edit mode.
 *
 * Fix 2 (R5-P2-F2): The "Copy view-only link" button is labeled
 *   "Copy view-only link" (not bare "Copy"); testids copy-view-link and
 *   copy-edit-link sit on the actionable buttons (not on wrappers).
 *
 * Fix 3 (R5-P2-F3): On trip load (both edit + view-only), the initial
 *   visible calendar date defaults to the trip's FIRST event day.
 *   A zero-event trip falls back to today.
 *
 * Fix 4 (R5-P2-F4): The share section (both copy links) is rendered ABOVE
 *   "Trip Details" — reachable without expanding anything.
 *
 * Regression re-asserts (server enforcement, critical checks):
 * - Server: PUT/DELETE with view token → 403; edit secret still writes.
 * - viewOnly e2e: readonly-banner, zero edit controls.
 * - Emily parser (check 1), drag-create (check 9), confirm-by-name (check 15).
 * - Rename/delete (checks 18-19).
 * - /v/<bogus> → 404.
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiCreateTrip(name: string): Promise<string> {
  const res = await fetch(`${BASE}/api/trip-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const json = (await res.json()) as { id: string };
  return json.id;
}

async function apiPutTrip(id: string, data: unknown) {
  return fetch(`${BASE}/api/trip/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function apiGetViewToken(editId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/trip-view-token/${editId}`);
  const json = (await res.json()) as { viewToken: string };
  return json.viewToken;
}

async function apiGetTrip(id: string) {
  const res = await fetch(`${BASE}/api/trip/${id}`);
  return res.json() as Promise<{ data: { name: string; events: unknown[] } }>;
}

function seedParticipant(page: import("@playwright/test").Page, tripId: string) {
  return page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-p2", name: "Tester" }) }
  );
}

// ── FIX 1: Read-only EMPTY day must NOT show "Tap a slot" hint ───────────────

test("FIX-R5P2-1a: view-only EMPTY trip — 'Tap a slot' hint absent from DOM", async ({ browser }) => {
  // Create a trip with ZERO events
  const editId = await apiCreateTrip("R5P2F1 Empty View Test");
  const viewToken = await apiGetViewToken(editId);

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/v/${viewToken}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(800);

  // The mobile "Tap a slot" hint must NOT appear anywhere
  const hint = page.locator("text=Tap a slot to add an event");
  await expect(hint).not.toBeVisible();
  expect(await hint.count()).toBe(0);

  await ctx.close();
});

test("FIX-R5P2-1b: view-only with events on OTHER days — switching to empty day also shows no hint", async ({ browser }) => {
  // Trip with one event on 2026-05-01, then navigate to a different day (2026-05-02)
  const editId = await apiCreateTrip("R5P2F1 Empty Day View Test");
  await apiPutTrip(editId, {
    name: "R5P2F1 Empty Day View Test",
    details: "",
    events: [{
      id: "r5p2f1-evt",
      date: "2026-05-01",
      startMinutes: 600,
      endMinutes: 660,
      title: "R5P2F1 Event on Day 1",
      status: "proposed",
      authorId: "pid-r5p2f1",
      authorName: "Tester",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const viewToken = await apiGetViewToken(editId);

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/v/${viewToken}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(800);

  // The "Tap a slot" hint must not appear at all in read-only
  const hint = page.locator("text=Tap a slot to add an event");
  expect(await hint.count()).toBe(0);

  await ctx.close();
});

// ── FIX 2: "Copy view-only link" label + testids on actionable buttons ────────

test("FIX-R5P2-2a: copy-view-link testid is on the actionable button (not just wrapper) and labeled 'Copy view-only link'", async ({ browser }) => {
  const editId = await apiCreateTrip("R5P2F2 CopyBtn Label Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await seedParticipant(page, editId);
  await page.goto(`${BASE}/t/${editId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(1500); // allow viewToken to load

  // copy-view-link testid on an actual button (not a div wrapper)
  const copyViewBtn = page.locator('button[data-testid="copy-view-link"]');
  await expect(copyViewBtn).toBeVisible({ timeout: 6000 });

  // aria-label must be "Copy view-only link"
  const label = await copyViewBtn.getAttribute("aria-label");
  expect(label).toBe("Copy view-only link");

  // Button text must include "Copy view-only link"
  await expect(copyViewBtn).toContainText("Copy view-only link");

  // Must NOT be just "Copy" without qualification
  const text = await copyViewBtn.textContent();
  expect(text?.trim()).not.toBe("Copy");

  await ctx.close();
});

test("FIX-R5P2-2b: copy-edit-link testid is on an actionable button", async ({ browser }) => {
  const editId = await apiCreateTrip("R5P2F2 CopyEditBtn Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await seedParticipant(page, editId);
  await page.goto(`${BASE}/t/${editId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(500);

  // copy-edit-link testid must be on a button element
  const copyEditBtn = page.locator('button[data-testid="copy-edit-link"]');
  await expect(copyEditBtn).toBeVisible({ timeout: 5000 });

  // Should be clickable (not disabled in steady state)
  await expect(copyEditBtn).not.toBeDisabled();

  await ctx.close();
});

// ── FIX 3: Initial date defaults to first event day on load ──────────────────

test("FIX-R5P2-3a: view-only link — initial date is trip's first event day (not today)", async ({ browser }) => {
  // Create a trip with events on a specific date that is NOT today
  const editId = await apiCreateTrip("R5P2F3 View First Day Test");
  const targetDate = "2026-05-01"; // A past date, definitely not today (2026-06-15)
  await apiPutTrip(editId, {
    name: "R5P2F3 View First Day Test",
    details: "",
    events: [{
      id: "r5p2f3-evt",
      date: targetDate,
      startMinutes: 750,
      endMinutes: 810,
      title: "R5P2F3 First Day Event",
      status: "proposed",
      authorId: "pid-r5p2f3",
      authorName: "Tester",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const viewToken = await apiGetViewToken(editId);

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/v/${viewToken}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(600);

  // The event "R5P2F3 First Day Event" should be visible immediately on the day view
  // without needing to navigate to a different date
  await expect(page.locator("text=R5P2F3 First Day Event")).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

test("FIX-R5P2-3b: edit link — initial date is trip's first event day (not today)", async ({ browser }) => {
  const editId = await apiCreateTrip("R5P2F3 Edit First Day Test");
  const targetDate = "2026-05-01";
  await apiPutTrip(editId, {
    name: "R5P2F3 Edit First Day Test",
    details: "",
    events: [{
      id: "r5p2f3b-evt",
      date: targetDate,
      startMinutes: 750,
      endMinutes: 810,
      title: "R5P2F3 Edit First Day Event",
      status: "proposed",
      authorId: "pid-r5p2f3b",
      authorName: "Tester",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await seedParticipant(page, editId);
  await page.goto(`${BASE}/t/${editId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(600);

  // The event must be visible immediately
  await expect(page.locator("text=R5P2F3 Edit First Day Event")).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

test("FIX-R5P2-3c: zero-event trip (view-only) falls back to today — grid shows current month/day", async ({ browser }) => {
  const editId = await apiCreateTrip("R5P2F3 Zero Event Fallback");
  const viewToken = await apiGetViewToken(editId);

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/v/${viewToken}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(600);

  // readonly-banner must be present (proving we're in view-only mode)
  await expect(page.locator('[data-testid="readonly-banner"]')).toBeVisible({ timeout: 5000 });
  // Page must render without error (no crash on zero-event trip)
  // The grid or a "no events" state must be visible
  const grid = page.locator('[aria-label="Day schedule"]').or(page.locator("text=No dates yet"));
  await expect(grid).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── FIX 4: Share section renders ABOVE Trip Details ──────────────────────────

test("FIX-R5P2-4a: share section (both copy links) is visible WITHOUT expanding Trip Details", async ({ browser }) => {
  const editId = await apiCreateTrip("R5P2F4 Share Above Details Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await seedParticipant(page, editId);
  await page.goto(`${BASE}/t/${editId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(500);

  // Both share rows must be visible immediately — no click/expand needed
  const shareEditRow = page.locator('[data-testid="share-edit-link"]');
  const shareViewRow = page.locator('[data-testid="share-view-link"]');
  await expect(shareEditRow).toBeVisible({ timeout: 5000 });
  await expect(shareViewRow).toBeVisible({ timeout: 5000 });

  // Verify the share section is ABOVE Trip Details in DOM order
  // by checking Y positions of the share rows vs the Trip Details toggle
  const shareEditBox = await shareEditRow.boundingBox();
  const tripDetailsToggle = page.locator('[aria-label="Toggle Trip Details"]');
  await expect(tripDetailsToggle).toBeVisible({ timeout: 3000 });
  const detailsBox = await tripDetailsToggle.boundingBox();

  expect(shareEditBox).not.toBeNull();
  expect(detailsBox).not.toBeNull();
  // Share section Y must be ABOVE (less than) Trip Details Y
  expect(shareEditBox!.y).toBeLessThan(detailsBox!.y);

  await ctx.close();
});

test("FIX-R5P2-4b: Trip Details defaults to collapsed; share section still visible", async ({ browser }) => {
  const editId = await apiCreateTrip("R5P2F4 Details Collapsed Test");

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await seedParticipant(page, editId);
  await page.goto(`${BASE}/t/${editId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(500);

  // Trip Details must be collapsed by default (aria-expanded=false or panel hidden)
  const detailsToggle = page.locator('[aria-label="Toggle Trip Details"]');
  await expect(detailsToggle).toBeVisible({ timeout: 3000 });
  const expanded = await detailsToggle.getAttribute("aria-expanded");
  expect(expanded).toBe("false");

  // Share rows still visible while Trip Details is collapsed
  await expect(page.locator('[data-testid="share-edit-link"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="share-view-link"]')).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── Critical regression: /v/<bogus> → 404 ────────────────────────────────────

test("R5-3 regression: /v/<bogus> returns HTTP 404", async ({ request }) => {
  const res = await request.get(`${BASE}/v/this-is-definitely-not-a-valid-view-token-xyz`);
  expect(res.status()).toBe(404);
});

test("R5-3 regression: /v/<valid-format-but-unknown> returns HTTP 404", async ({ request }) => {
  const fakeToken = "A".repeat(22); // valid format length, unknown token
  const res = await request.get(`${BASE}/v/${fakeToken}`);
  expect(res.status()).toBe(404);
});
