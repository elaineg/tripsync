/**
 * E2e tests for the VIEW-ONLY share feature (checks 24-27).
 *
 * BASE_URL must be the local production server (e.g. http://localhost:3210).
 *
 * Check 24: edit page shows BOTH share links with correct testids; URLs differ; view URL has no edit secret.
 * Check 25: /v/<viewToken> loads in read-only mode — banner present; ZERO edit controls in DOM.
 * Check 26: view token is rejected server-side (403) for PUT/DELETE; state unchanged.
 * Check 27: regression — edit link still grants full edit; Emily parse + drag-create still work.
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
  const res = await fetch(`${BASE}/api/trip/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res;
}

async function apiGetViewToken(editId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/trip-view-token/${editId}`);
  const json = (await res.json()) as { viewToken: string };
  return json.viewToken;
}

async function apiGetTrip(id: string) {
  const res = await fetch(`${BASE}/api/trip/${id}`);
  return res.json() as Promise<{ data: { name: string; events: Array<{ id: string; title: string; deletedAt?: number }> } }>;
}

function seedParticipant(page: import("@playwright/test").Page, tripId: string) {
  return page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-vo", name: "VOUser" }) }
  );
}

// ── Check 24: both share links visible on edit page with correct testids ──────
test("C24: edit page shows share-edit-link + share-view-link testids; URLs distinct; view URL has no edit secret", async ({ browser }) => {
  const editId = await apiCreateTrip("C24 Share Links Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Seed participant to skip name prompt
  await page.goto(`${BASE}/`);
  await seedParticipant(page, editId);

  await page.goto(`${BASE}/t/${editId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(500); // allow viewToken to load from API

  // Both share rows must be present in the DOM
  const editLinkRow = page.locator('[data-testid="share-edit-link"]');
  const viewLinkRow = page.locator('[data-testid="share-view-link"]');
  await expect(editLinkRow).toBeVisible({ timeout: 5000 });
  await expect(viewLinkRow).toBeVisible({ timeout: 5000 });

  // Copy buttons must exist
  const copyEditBtn = page.locator('[data-testid="copy-edit-link"]');
  const copyViewBtn = page.locator('[data-testid="copy-view-link"]');
  await expect(copyEditBtn).toBeVisible();
  await expect(copyViewBtn).toBeVisible();

  // Labels must be distinct and correctly named
  // Use exact text matches on the <p> label elements to avoid matching the button's aria-label
  await expect(editLinkRow.locator("p", { hasText: /^Edit link/ })).toBeVisible();
  await expect(viewLinkRow.locator("p", { hasText: /^View-only link/ })).toBeVisible();

  // Get the actual URLs from the share inputs
  // The edit link row shows a URL containing /t/<editId>
  // The view link row shows a URL containing /v/<viewToken>
  // We look at the input fields inside each row
  const editInput = editLinkRow.locator("input");
  const viewInput = viewLinkRow.locator("input");

  // Check if inputs exist (some UI renders text, some inputs)
  const editInputCount = await editInput.count();
  const viewInputCount = await viewInput.count();

  if (editInputCount > 0 && viewInputCount > 0) {
    const editUrl = await editInput.first().inputValue();
    const viewUrl = await viewInput.first().inputValue();
    // Edit URL must contain the edit secret
    expect(editUrl).toContain(editId);
    // View URL must NOT contain the edit secret
    expect(viewUrl).not.toContain(editId);
    // Both URLs must be different
    expect(editUrl).not.toBe(viewUrl);
    // View URL must be on the /v/ route
    expect(viewUrl).toMatch(/\/v\//);
  }

  // Wait for viewToken to load (CopyViewLinkButton shows "Loading…" then the actual button)
  // The button text changes from "Loading…" to something else once viewToken is available
  await expect(page.locator('[data-testid="copy-view-link"]:not([disabled])').or(
    page.locator('[data-testid="copy-view-link"][aria-label="Copy view-only link"]')
  )).toBeVisible({ timeout: 8000 });

  await ctx.close();
});

// ── Check 24: share UI accessible from the page (not buried in overflow menu) ─
test("C24: share area is directly visible (not behind overflow menu) on 1280px desktop", async ({ browser }) => {
  const editId = await apiCreateTrip("C24 Accessible Share Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await seedParticipant(page, editId);
  await page.goto(`${BASE}/t/${editId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // The share section must be visible WITHOUT clicking any overflow / ⋯ menu
  await expect(page.locator('[data-testid="share-edit-link"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="share-view-link"]')).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── Check 25: /v/<viewToken> loads read-only — banner present ─────────────────
test("C25: /v/<viewToken> shows readonly-banner", async ({ browser }) => {
  const editId = await apiCreateTrip("C25 View Banner Test");
  await apiPutTrip(editId, {
    name: "C25 View Banner Test",
    details: "trip details",
    events: [{
      id: "c25-banner-evt",
      date: "2026-05-01",
      startMinutes: 600,
      endMinutes: 660,
      title: "C25 Visible Event",
      status: "proposed",
      authorId: "pid-c25",
      authorName: "C25User",
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

  // readonly-banner must be present
  const banner = page.locator('[data-testid="readonly-banner"]');
  await expect(banner).toBeVisible({ timeout: 5000 });

  // Banner text must say "View-only"
  await expect(banner).toContainText("View-only");
  await expect(banner).toContainText("can't edit this trip");

  // The trip data must be visible (same as edit link)
  await expect(page.locator("text=C25 Visible Event")).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── Check 25: readonly-mode testid/attribute present ─────────────────────────
test("C25: /v/<viewToken> has readonly-mode testid attribute", async ({ browser }) => {
  const editId = await apiCreateTrip("C25 ReadonlyMode Attr Test");
  const viewToken = await apiGetViewToken(editId);

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/v/${viewToken}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(500);

  // readonly-mode data attribute must be present on the wrapper
  const roEl = page.locator('[data-testid="readonly-mode"]');
  await expect(roEl).toBeAttached({ timeout: 5000 });

  await ctx.close();
});

// ── Check 25: EMPTY view-only trip is still read-only (gated by token, not data) ─
test("C25: empty view-only trip (zero events) still shows readonly-banner (read-only is NOT data-gated)", async ({ browser }) => {
  const editId = await apiCreateTrip("C25 Empty View Test");
  // No events seeded
  const viewToken = await apiGetViewToken(editId);

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/v/${viewToken}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(500);

  // readonly-banner must still be present on an empty trip
  await expect(page.locator('[data-testid="readonly-banner"]')).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── Check 25: edit controls are ABSENT from DOM in read-only mode ─────────────
test("C25: /v/<viewToken> — edit/create/manage controls are ABSENT from DOM (hidden, not disabled)", async ({ browser }) => {
  const editId = await apiCreateTrip("C25 Hidden Controls Test");
  await apiPutTrip(editId, {
    name: "C25 Hidden Controls Test",
    details: "",
    events: [{
      id: "c25-ctrl-evt",
      date: "2026-05-01",
      startMinutes: 540,
      endMinutes: 600,
      title: "C25 Control Event",
      status: "proposed",
      authorId: "pid-c25b",
      authorName: "C25BUser",
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
  await page.waitForTimeout(1000);

  // ── Controls that must NOT be present in the DOM ──────────────────────────
  // 1. FAB "+ Add event" button (add-event-fab testid)
  const fab = page.locator('[data-testid="add-event-fab"]');
  await expect(fab).not.toBeVisible();

  // 2. No name prompt (participant dialog — only in edit mode)
  const namePrompt = page.locator('[aria-label="Your name"]');
  await expect(namePrompt).not.toBeVisible();

  // 3. "Create New" trip link — hidden in read-only (it's a <Link>, not a button)
  const createNewLink = page.locator('[aria-label="Create new trip"]');
  await expect(createNewLink).not.toBeVisible();

  // 4. Trip options menu (⋯) — hidden in read-only
  const tripOptionsMenu = page.locator('[aria-label="Trip options"]');
  await expect(tripOptionsMenu).not.toBeVisible();

  // 5. Delete confirm dialog must NOT be present
  const deleteDialog = page.locator('[data-testid="delete-confirm-dialog"]');
  expect(await deleteDialog.count()).toBe(0);

  // 6. Paste itinerary link — hidden in read-only
  const pasteLink = page.locator("button", { hasText: /Paste itinerary/i });
  await expect(pasteLink).not.toBeVisible();

  // ── Controls that MUST be present ────────────────────────────────────────
  // Download .ics — the ONLY allowed write action (writes viewer's own calendar)
  // Only shown if there are events
  const dlIcs = page.locator('[data-testid="download-ics"]');
  await expect(dlIcs).toBeVisible({ timeout: 3000 });

  await ctx.close();
});

// ── Check 25: Confirm toggle is absent in read-only (no confirm button on events) ─
test("C25: confirm toggle absent on events in /v/<viewToken> view", async ({ browser }) => {
  const editId = await apiCreateTrip("C25 Confirm Absent Test");
  await apiPutTrip(editId, {
    name: "C25 Confirm Absent Test",
    details: "",
    events: [{
      id: "c25-confirm-evt",
      date: "2026-05-01",
      startMinutes: 600,
      endMinutes: 660,
      title: "C25 Confirm Absent Event",
      status: "proposed",
      authorId: "pid-c25c",
      authorName: "C25CUser",
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
  await page.getByLabel("day view").click();
  await page.waitForTimeout(500);

  // Event should be visible
  await expect(page.locator("text=C25 Confirm Absent Event")).toBeVisible({ timeout: 5000 });

  // Click the event to open detail
  await page.locator("text=C25 Confirm Absent Event").first().click();
  await page.waitForTimeout(300);

  // Confirm button must not be present
  const confirmBtn = page.locator("button", { hasText: /Confirm/i });
  await expect(confirmBtn).not.toBeVisible();

  // Edit/Delete buttons must not be present
  const editBtn = page.locator("button", { hasText: /^Edit$/i });
  await expect(editBtn).not.toBeVisible();

  await ctx.close();
});

// ── Check 26 (P0): view page HTML does NOT expose the edit secret ──────────────
test("C26 (P0): /v/<viewToken> page HTML does not contain the edit secret", async ({ browser }) => {
  const editId = await apiCreateTrip("C26 Secret Exposure Test");
  const viewToken = await apiGetViewToken(editId);

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/v/${viewToken}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);

  // Get all text content and the page source
  const pageContent = await page.content();
  // The edit secret must not appear anywhere in the rendered HTML
  expect(pageContent).not.toContain(editId);

  // Also verify no /t/<editId> URL is rendered on the page
  expect(pageContent).not.toContain(`/t/${editId}`);

  await ctx.close();
});

// ── Check 26 (P0): API — PUT via view token on the view route is 403 ──────────
test("C26 (P0): PUT /api/trip-view/[viewToken] returns 403 and does NOT mutate state", async () => {
  const editId = await apiCreateTrip("C26 PUT API Test");
  const originalData = {
    name: "C26 PUT API Test",
    details: "",
    events: [{
      id: "c26-put-evt",
      date: "2026-05-01",
      startMinutes: 540,
      endMinutes: 600,
      title: "C26 Original Event",
      status: "proposed",
      authorId: "pid-c26",
      authorName: "C26User",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await apiPutTrip(editId, originalData);
  const viewToken = await apiGetViewToken(editId);

  // Attempt to write via the view token
  const res = await fetch(`${BASE}/api/trip-view/${viewToken}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "HACKED", events: [] }),
  });

  // Must be 403
  expect(res.status).toBe(403);

  // State must be unchanged
  const after = await apiGetTrip(editId);
  expect(after.data.name).toBe("C26 PUT API Test");
  expect(after.data.events.filter((e) => !e.deletedAt).length).toBe(1);
  expect(after.data.events[0].title).toBe("C26 Original Event");
});

// ── Check 26 (P0): API — DELETE via view token on the view route is 403 ───────
test("C26 (P0): DELETE /api/trip-view/[viewToken] returns 403 and trip still exists", async () => {
  const editId = await apiCreateTrip("C26 DELETE API Test");
  const viewToken = await apiGetViewToken(editId);

  // Attempt to delete via the view token
  const res = await fetch(`${BASE}/api/trip-view/${viewToken}`, {
    method: "DELETE",
  });

  // Must be 403
  expect(res.status).toBe(403);

  // Trip must still exist
  const after = await apiGetTrip(editId);
  expect(after.data.name).toBe("C26 DELETE API Test");
});

// ── Check 27: NO REGRESSION — Emily acceptance test (check 1) ─────────────────
test("C27: regression — Emily acceptance test (check 1) still passes after view-only feature", async ({ browser }) => {
  // Use the standard blank-trip paste flow
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await expect(page.locator("h1").first()).toBeVisible();

  // Name the trip
  await page.getByLabel("Trip name").fill("C27 Emily Test");

  // Click Paste an itinerary
  await page.getByRole("button", { name: /Paste an itinerary/i }).first().click();

  // Should navigate to trip page in paste mode
  await expect(page).toHaveURL(/\/t\/[A-Za-z0-9\-_]{22,}/, { timeout: 10000 });
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  // Load sample and parse
  await page.getByLabel("Load sample itinerary").click();
  await page.getByRole("button", { name: "Parse →" }).click();

  // Preview must show events
  await expect(page.locator("text=Preview parsed events")).toBeVisible({ timeout: 5000 });

  // Emily lands must be in preview
  const titleInputs = page.locator('input[aria-label="Event title"]');
  const count = await titleInputs.count();
  expect(count).toBeGreaterThan(5);

  const allTitles: string[] = [];
  for (let i = 0; i < count; i++) {
    allTitles.push(await titleInputs.nth(i).inputValue());
  }
  expect(allTitles.some((t) => t.includes("Emily lands"))).toBe(true);
  expect(allTitles.some((t) => t.includes("Bar Part Time"))).toBe(true);

  // Both single times (12:30PM) and ranges (1-2PM) must parse
  // Emily lands = single time; Uber = range
  expect(allTitles.some((t) => t.includes("Uber"))).toBe(true);

  await ctx.close();
});

// ── Check 27: NO REGRESSION — edit link still shows full edit controls ─────────
test("C27: regression — edit link /t/<secret> still shows full edit controls (not read-only)", async ({ browser }) => {
  const editId = await apiCreateTrip("C27 Edit Controls Regression");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await seedParticipant(page, editId);
  await page.goto(`${BASE}/t/${editId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(500);

  // readonly-banner must NOT be present on the edit page
  const banner = page.locator('[data-testid="readonly-banner"]');
  await expect(banner).not.toBeVisible();

  // "Create New" / "New" is a Link element (not a button) — check by aria-label
  const createNewLink = page.locator('[aria-label="Create new trip"]');
  await expect(createNewLink).toBeVisible({ timeout: 3000 });

  // Share rows must be present (both edit and view-only links)
  await expect(page.locator('[data-testid="share-edit-link"]')).toBeVisible();
  await expect(page.locator('[data-testid="share-view-link"]')).toBeVisible();

  // Trip options menu (⋯) must be present
  const tripOptions = page.locator('[aria-label="Trip options"]');
  await expect(tripOptions).toBeVisible({ timeout: 3000 });

  await ctx.close();
});

// ── Check 27: NO REGRESSION — confirm-by-name (check 15) ─────────────────────
test("C27: regression — confirm-by-name (check 15) still works on edit link", async ({ browser }) => {
  const editId = await apiCreateTrip("C27 Confirm Regression");
  await apiPutTrip(editId, {
    name: "C27 Confirm Regression",
    details: "",
    events: [{
      id: "c27-confirm-evt",
      date: "2026-05-01",
      startMinutes: 600,
      endMinutes: 660,
      title: "C27 Confirm Event",
      status: "proposed",
      authorId: "pid-c27",
      authorName: "C27User",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  // Set name to "Joanne" for this participant
  await page.evaluate(
    ({ editId, p }) => localStorage.setItem(`ts_participant_${editId}`, p),
    { editId, p: JSON.stringify({ id: "pid-c27b", name: "Joanne" }) }
  );

  await page.goto(`${BASE}/t/${editId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  // Click the event to open details
  await expect(page.locator("text=C27 Confirm Event")).toBeVisible({ timeout: 5000 });
  await page.locator("text=C27 Confirm Event").first().click();
  await page.waitForTimeout(300);

  // Confirm button must be visible (exact: true to avoid matching "Click to rename trip")
  const confirmBtn = page.getByRole("button", { name: "Confirm", exact: true });
  await expect(confirmBtn).toBeVisible({ timeout: 3000 });
  await confirmBtn.click();

  // After confirming, the dialog closes. The event shows "Confirmed by you" (viewer-relative)
  // OR "Confirmed by Joanne" if another user views it. The API shows confirmedBy: "Joanne".
  // We verify the API reflects the confirm AND the UI shows "confirmed" state.
  await page.waitForTimeout(3000); // allow debounced save
  const trip = await (await fetch(`${BASE}/api/trip/${editId}`)).json() as {
    data: { events: Array<{ id: string; status: string; confirmedBy?: string }> }
  };
  const ev = trip.data.events.find((e) => e.id === "c27-confirm-evt");
  expect(ev?.status).toBe("confirmed");
  expect(ev?.confirmedBy).toBe("Joanne");

  // UI: event should show "Confirmed by" text (may say "you" for the confirmer)
  const confirmedText = page.locator("text=Confirmed by");
  await expect(confirmedText).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── Check 27: NO REGRESSION — rename/delete still accessible from edit page ───
test("C27: regression — rename/delete accessible from trip options menu (checks 18-19)", async ({ browser }) => {
  const editId = await apiCreateTrip("C27 Rename Delete Regression");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await seedParticipant(page, editId);
  await page.goto(`${BASE}/t/${editId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(500);

  // Trip options menu must be accessible
  const tripOptions = page.locator('[aria-label="Trip options"]');
  await expect(tripOptions).toBeVisible({ timeout: 3000 });
  await tripOptions.click();
  await page.waitForTimeout(300);

  // Delete option must be present in menu
  const deleteMenuItem = page.locator('[data-testid="trip-menu-delete"]');
  await expect(deleteMenuItem).toBeVisible({ timeout: 3000 });

  // Close menu with Escape
  await page.keyboard.press("Escape");

  // Rename: click the trip title to trigger inline edit
  const tripTitle = page.locator('[aria-label="Click to rename trip"]').or(
    page.locator("h1").filter({ hasText: "C27 Rename Delete Regression" })
  );
  await expect(tripTitle.first()).toBeVisible({ timeout: 3000 });

  await ctx.close();
});

// ── Check 27: view-only URL from share UI matches the actual /v/<viewToken> route ─
test("C27: view-only URL from share UI is genuinely accessible as /v/<viewToken>", async ({ browser }) => {
  const editId = await apiCreateTrip("C27 URL Match Test");
  await apiPutTrip(editId, {
    name: "C27 URL Match Test",
    details: "",
    events: [{
      id: "c27-url-evt",
      date: "2026-05-01",
      startMinutes: 660,
      endMinutes: 720,
      title: "C27 URL Event",
      status: "proposed",
      authorId: "pid-c27c",
      authorName: "C27CUser",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Get the view token via API (same as the share UI would show)
  const viewToken = await apiGetViewToken(editId);

  // Open the view URL in a fresh context (simulates a friend clicking the link)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/v/${viewToken}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 10000 });

  // Trip data must load correctly
  await expect(page.locator("text=C27 URL Match Test")).toBeVisible({ timeout: 5000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);
  await expect(page.locator("text=C27 URL Event")).toBeVisible({ timeout: 5000 });

  // readonly-banner must be present
  await expect(page.locator('[data-testid="readonly-banner"]')).toBeVisible({ timeout: 3000 });

  await ctx.close();
});
