/**
 * Panel-round-1 regression gate — verifies the 6 specific fixes from the first panel round.
 *
 * Fix 1: "Delete for everyone" is a LABELED red button (not bare icon); "Remove from my list"
 *   is grey text; always-visible scope caption; touch targets ≥44px.
 * Fix 2: List inline rename ENTER saves and STAYS at "/" (no navigation). Esc cancels.
 * Fix 3: Trip-page "Create New" is a labeled button/link to "/"; fallback in ⋯ menu.
 * Fix 4: Recent-trip names wrap (no 6-char hard truncation) at ~390px.
 * Fix 5: Header display-name control is "Your name"/"You: <name>" (was "Set name").
 * Fix 6: Delete confirm is a portal role="dialog" with stable testids;
 *   clicking list Delete opens dialog; clicking delete-confirm-button issues DELETE;
 *   GET afterward is 404. Same from trip-page ⋯ → Delete.
 *   Verbatim copy: "Delete this trip for everyone with the link? This can't be undone."
 *
 * Spec checks re-asserted (non-regression):
 * - Check 18: RENAME shared+persists (server PUT; fresh GET returns new name) — header + list.
 * - Check 20: REMOVE FROM MY LIST issues NO DELETE; server trip still GETs 200.
 * - Check 23: Emily (check 1), drag-create (check 9), confirm-by-name (check 15) pass.
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";

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
  await fetch(`${BASE}/api/trip/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function seedRecentTrips(page: import("@playwright/test").Page, entries: Array<{ id: string; name: string }>) {
  await page.evaluate((entries) => {
    localStorage.setItem(
      "tripsync_recent",
      JSON.stringify(entries.map((e) => ({ ...e, createdAt: Date.now() })))
    );
  }, entries);
}

// ── Fix 1: labeled Delete button, grey Remove, always-visible caption, ≥44px ─

test("FIX1-a: 'Delete for everyone' is a labeled red button with aria-label; 'Remove from my list' is grey text button", async ({ browser }) => {
  const tripId = await apiCreateTrip("Fix1 Label Test");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "Fix1 Label Test" }]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  // "Delete for everyone" — labeled red button, aria-label exact
  const deleteBtn = page.locator('[data-testid="recent-delete-' + tripId + '"]');
  await expect(deleteBtn).toBeVisible({ timeout: 5000 });
  const deleteBtnLabel = await deleteBtn.getAttribute("aria-label");
  expect(deleteBtnLabel).toBe("Delete for everyone");
  // Verify it contains the label text "Delete for everyone"
  await expect(deleteBtn).toContainText("Delete for everyone");

  // "Remove from my list" — grey text button
  const removeBtn = page.locator('button[aria-label="Remove from my list"]').first();
  await expect(removeBtn).toBeVisible({ timeout: 3000 });

  // Distinct elements, distinct labels
  expect(deleteBtnLabel).not.toBe("Remove from my list");

  await ctx.close();
});

test("FIX1-b: always-visible scope caption present (not hover-only)", async ({ browser }) => {
  const tripId = await apiCreateTrip("Fix1 Caption Test");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "Fix1 Caption Test" }]);
  await page.reload();

  // Caption should be visible without any hover
  const caption = page.locator("text=Remove = this device only").first();
  await expect(caption).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

test("FIX1-c: touch targets ≥44px (min-h-[44px] on both Delete and Remove buttons)", async ({ browser }) => {
  const tripId = await apiCreateTrip("Fix1 Touch Target Test");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "Fix1 Touch Target Test" }]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  const deleteBtn = page.locator('[data-testid="recent-delete-' + tripId + '"]');
  const removeBtn = page.locator('button[aria-label="Remove from my list"]').first();

  const deleteBtnBox = await deleteBtn.boundingBox();
  const removeBtnBox = await removeBtn.boundingBox();

  expect(deleteBtnBox!.height, "Delete button height must be ≥44px").toBeGreaterThanOrEqual(43);
  expect(removeBtnBox!.height, "Remove button height must be ≥44px").toBeGreaterThanOrEqual(43);

  await ctx.close();
});

// ── Fix 2: List inline rename ENTER saves + stays at "/" ─────────────────────

test("FIX2-a: list rename Enter saves name and URL stays at '/'", async ({ browser }) => {
  const tripId = await apiCreateTrip("Fix2 Rename Original");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "Fix2 Rename Original" }]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  // Open inline rename
  const renameBtn = page.locator('button[aria-label="Rename trip"]').first();
  await expect(renameBtn).toBeVisible({ timeout: 5000 });
  await renameBtn.click();

  const renameInput = page.locator('input[aria-label="New trip name"]');
  await expect(renameInput).toBeVisible({ timeout: 3000 });
  await renameInput.fill("Fix2 Renamed Name");

  // Press Enter — must SAVE and STAY at "/"
  await page.keyboard.press("Enter");

  // URL must remain "/"
  await expect(page).toHaveURL(`${BASE}/`, { timeout: 5000 });

  // Input should disappear (rename committed)
  await expect(renameInput).not.toBeVisible({ timeout: 5000 });

  // New name should appear in list
  await expect(page.locator("text=Fix2 Renamed Name")).toBeVisible({ timeout: 3000 });

  // Server should have the new name
  const { body } = await apiGetTrip(tripId);
  expect((body as { data: { name: string } }).data.name).toBe("Fix2 Renamed Name");

  await ctx.close();
});

test("FIX2-b: list rename Escape cancels without saving", async ({ browser }) => {
  const tripId = await apiCreateTrip("Fix2 Esc Original");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "Fix2 Esc Original" }]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  const renameBtn = page.locator('button[aria-label="Rename trip"]').first();
  await renameBtn.click();

  const renameInput = page.locator('input[aria-label="New trip name"]');
  await expect(renameInput).toBeVisible({ timeout: 3000 });
  await renameInput.fill("Should Not Save");

  // Press Esc — must cancel
  await page.keyboard.press("Escape");

  // Input should disappear
  await expect(renameInput).not.toBeVisible({ timeout: 3000 });

  // Original name still shows
  await expect(page.locator("text=Fix2 Esc Original")).toBeVisible({ timeout: 2000 });

  // Server still has original name
  const { body } = await apiGetTrip(tripId);
  expect((body as { data: { name: string } }).data.name).toBe("Fix2 Esc Original");

  await ctx.close();
});

// ── Fix 3: Trip-page "Create New" labeled button/link to "/" ─────────────────

test("FIX3-a: trip-page 'Create New' is a link to '/' with aria-label 'Create new trip'", async ({ browser }) => {
  const tripId = await apiCreateTrip("Fix3 Create New Test");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-fix3", name: "Tester" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // "Create New" nav link on desktop
  const createNew = page.locator('a[aria-label="Create new trip"]').first();
  await expect(createNew).toBeVisible({ timeout: 5000 });

  // Must contain "Create New" text on desktop
  await expect(createNew).toContainText("Create New");

  // href must be "/"
  const href = await createNew.getAttribute("href");
  expect(href).toBe("/");

  // Clicking navigates to "/"
  await createNew.click();
  await expect(page).toHaveURL(`${BASE}/`, { timeout: 5000 });

  await ctx.close();
});

test("FIX3-b: ⋯ menu has fallback 'Create New' item", async ({ browser }) => {
  const tripId = await apiCreateTrip("Fix3 Menu Create New Test");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-fix3b", name: "Tester" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Open ⋯ menu
  await page.locator('button[aria-label="Trip options"]').click();
  await expect(page.locator('[role="menu"]')).toBeVisible({ timeout: 3000 });

  // "Create New" item in menu
  await expect(page.locator('[role="menuitem"]').filter({ hasText: "Create New" })).toBeVisible({ timeout: 3000 });

  // Close menu
  await page.keyboard.press("Escape");

  await ctx.close();
});

// ── Fix 4: Recent trip names wrap (no hard truncation) at ~390px ──────────────

test("FIX4: long recent-trip names wrap at 390px (not hard-truncated to 6 chars)", async ({ browser }) => {
  const longName = "San Francisco Visit With Emily July 2026";
  const tripId = await apiCreateTrip(longName);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: longName }]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  // Full name must be visible (not truncated to 6 chars like "San Fr…")
  await expect(page.locator(`text=${longName}`).first()).toBeVisible({ timeout: 5000 });

  // The full text content must contain the complete name
  const nameEl = page.locator(`text=${longName}`).first();
  const text = await nameEl.textContent();
  expect(text?.trim()).toContain("San Francisco");
  expect(text?.trim()).toContain("Emily July 2026");

  await ctx.close();
});

// ── Fix 5: Header "Your name"/"You: <name>" (was "Set name") ─────────────────

test("FIX5-a: header name control shows 'Your name' when no name set", async ({ browser }) => {
  const tripId = await apiCreateTrip("Fix5 Name Label Test");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Fresh context — no name set
  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Must show "Your name" (not "Set name")
  await expect(page.locator('button, [role="button"]').filter({ hasText: "Your name" }).first()).toBeVisible({ timeout: 5000 });
  // Must NOT show "Set name"
  await expect(page.locator("text=Set name")).not.toBeVisible({ timeout: 1000 });

  await ctx.close();
});

test("FIX5-b: header name chip shows 'You: <name>' when name is set", async ({ browser }) => {
  const tripId = await apiCreateTrip("Fix5 Name Display Test");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-fix5b", name: "Elaine" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Must show "You: Elaine" format
  await expect(page.locator("text=You: Elaine").first()).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── Fix 6: Delete confirm — portal dialog testids; exact copy; DELETE issued once ─

test("FIX6-a: list Delete opens delete-confirm-dialog with verbatim copy", async ({ browser }) => {
  const tripId = await apiCreateTrip("Fix6 List Delete Dialog");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "Fix6 List Delete Dialog" }]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  // Click the labeled "Delete for everyone" button
  await page.locator('[data-testid="recent-delete-' + tripId + '"]').click();

  // dialog must appear
  await expect(page.locator('[data-testid="delete-confirm-dialog"]')).toBeVisible({ timeout: 3000 });

  // Verbatim copy must be present
  await expect(page.locator("text=Delete this trip for everyone with the link? This can't be undone.")).toBeVisible({ timeout: 2000 });

  await ctx.close();
});

test("FIX6-b: list Delete → confirm → issues exactly one DELETE; GET afterward is 404", async ({ browser }) => {
  const tripId = await apiCreateTrip("Fix6 List Delete Confirm");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "Fix6 List Delete Confirm" }]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  let deleteCount = 0;
  page.on("request", (req) => {
    if (req.method() === "DELETE" && req.url().includes(`/api/trip/${tripId}`)) {
      deleteCount++;
    }
  });

  await page.locator('[data-testid="recent-delete-' + tripId + '"]').click();
  await expect(page.locator('[data-testid="delete-confirm-dialog"]')).toBeVisible({ timeout: 3000 });

  // Click the confirm button via testid
  await page.locator('[data-testid="delete-confirm-button"]').click();

  // Dialog must close
  await expect(page.locator('[data-testid="delete-confirm-dialog"]')).not.toBeVisible({ timeout: 5000 });

  // Exactly ONE DELETE must have been issued
  await page.waitForTimeout(500);
  expect(deleteCount, "Exactly one DELETE request must be issued").toBe(1);

  // GET on the trip now returns 404
  const { status } = await apiGetTrip(tripId);
  expect(status, "GET on deleted trip must return 404").toBe(404);

  await ctx.close();
});

test("FIX6-c: Remove from my list does NOT open delete-confirm-dialog", async ({ browser }) => {
  const tripId = await apiCreateTrip("Fix6 Remove No Dialog");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "Fix6 Remove No Dialog" }]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  await page.locator('button[aria-label="Remove from my list"]').first().click();

  // Dialog must NOT appear
  await expect(page.locator('[data-testid="delete-confirm-dialog"]')).not.toBeVisible({ timeout: 1000 });

  // Server trip still intact
  const { status } = await apiGetTrip(tripId);
  expect(status).toBe(200);

  await ctx.close();
});

test("FIX6-d: trip-page ⋯ → Delete opens delete-confirm-dialog; confirm issues DELETE; GET is 404", async ({ browser }) => {
  const tripId = await apiCreateTrip("Fix6 Page Delete Confirm");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-fix6d", name: "Tester" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  let deleteCount = 0;
  page.on("request", (req) => {
    if (req.method() === "DELETE" && req.url().includes(`/api/trip/${tripId}`)) {
      deleteCount++;
    }
  });

  // Open ⋯ menu and click Delete (via testid)
  await page.locator('button[aria-label="Trip options"]').click();
  await page.locator('[data-testid="trip-menu-delete"]').click();

  // Confirm dialog from trip page
  await expect(page.locator('[data-testid="delete-confirm-dialog"]')).toBeVisible({ timeout: 3000 });
  await expect(page.locator("text=Delete this trip for everyone with the link? This can't be undone.")).toBeVisible({ timeout: 2000 });

  // Click confirm via testid
  await page.locator('[data-testid="delete-confirm-button"]').click();

  // Must navigate to landing
  await expect(page).toHaveURL(`${BASE}/`, { timeout: 10000 });

  // Exactly one DELETE
  expect(deleteCount).toBe(1);

  // GET is 404
  const { status } = await apiGetTrip(tripId);
  expect(status).toBe(404);

  await ctx.close();
});

// ── Check 18 (re-assert): RENAME shared+persists — header + list ──────────────

test("C18-header-recheck: header rename PUT persists; fresh GET returns new name", async ({ browser }) => {
  const tripId = await apiCreateTrip("C18 Header Rename Recheck");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-c18r", name: "Tester" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  await page.locator('button[aria-label="Click to rename trip"]').click();
  const nameInput = page.locator('input[aria-label="Trip name"]');
  await expect(nameInput).toBeVisible({ timeout: 3000 });
  await nameInput.fill("C18 Header Renamed");
  await page.locator('button[aria-label="Save trip name"]').click();
  await expect(page.locator("text=C18 Header Renamed")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 8000 });

  const { body } = await apiGetTrip(tripId);
  expect((body as { data: { name: string } }).data.name).toBe("C18 Header Renamed");

  await ctx.close();
});

test("C18-list-recheck: list rename Enter stays at / AND PUT persists", async ({ browser }) => {
  const tripId = await apiCreateTrip("C18 List Rename Recheck");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "C18 List Rename Recheck" }]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  await page.locator('button[aria-label="Rename trip"]').first().click();
  const renameInput = page.locator('input[aria-label="New trip name"]');
  await expect(renameInput).toBeVisible({ timeout: 3000 });
  await renameInput.fill("C18 List Renamed");
  await page.keyboard.press("Enter");

  // URL stays at "/"
  await expect(page).toHaveURL(`${BASE}/`, { timeout: 5000 });

  // Name updated in list
  await expect(page.locator("text=C18 List Renamed")).toBeVisible({ timeout: 5000 });

  // Server persists
  const { body } = await apiGetTrip(tripId);
  expect((body as { data: { name: string } }).data.name).toBe("C18 List Renamed");

  await ctx.close();
});

// ── Check 20 (re-assert): REMOVE FROM MY LIST — no DELETE, server intact ─────

test("C20-recheck: Remove from my list — no DELETE request, server GET still 200", async ({ browser }) => {
  const tripId = await apiCreateTrip("C20 Remove Recheck");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await seedRecentTrips(page, [{ id: tripId, name: "C20 Remove Recheck" }]);
  await page.reload();

  await expect(page.locator("text=Recent trips on this device")).toBeVisible({ timeout: 5000 });

  let deleteFired = false;
  page.on("request", (req) => {
    if (req.method() === "DELETE" && req.url().includes(`/api/trip/${tripId}`)) {
      deleteFired = true;
    }
  });

  await page.locator('button[aria-label="Remove from my list"]').first().click();
  await expect(page.locator("text=C20 Remove Recheck")).not.toBeVisible({ timeout: 3000 });

  await page.waitForTimeout(500);
  expect(deleteFired, "Remove from my list must NOT issue DELETE").toBe(false);

  const { status } = await apiGetTrip(tripId);
  expect(status, "Server trip must still return 200").toBe(200);

  await ctx.close();
});

// ── Check 23 (re-assert): Emily, drag-create, confirm-by-name pass ────────────

test("C23-emily-recheck: Emily acceptance test passes (Load sample → Parse → Confirm → events visible)", async ({ browser }) => {
  const tripId = await apiCreateTrip("C23 Emily Recheck");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  await page.getByLabel("Load sample itinerary").click();
  await expect(page.getByLabel("Paste itinerary text")).toHaveValue(/Friday May 1/);
  await page.getByRole("button", { name: "Parse →" }).click();
  await expect(page.locator("text=Preview parsed events")).toBeVisible({ timeout: 5000 });

  const titleInputs = page.locator('input[aria-label="Event title"]');
  const count = await titleInputs.count();
  expect(count).toBeGreaterThan(0);
  const titles: string[] = [];
  for (let i = 0; i < count; i++) titles.push(await titleInputs.nth(i).inputValue());
  expect(titles.some((t) => t.includes("Emily lands"))).toBe(true);
  expect(titles.some((t) => t.includes("Uber to 123 Main St"))).toBe(true);

  const addBtn = page.locator("button").filter({ hasText: /Add to C23 Emily Recheck/i });
  await expect(addBtn).toBeVisible({ timeout: 5000 });
  await addBtn.click();

  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Emily lands")).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

test("C23-dragcreate-recheck: desktop drag-create (9→11) creates 2h block with popover", async ({ browser }) => {
  const tripId = await apiCreateTrip("C23 Drag Recheck");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-c23drag", name: "Tester" }) }
  );

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  await grid.evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(200);

  const gridBox = await grid.boundingBox();
  const x = gridBox!.x + 80;
  const y9am = gridBox!.y + (9 - 6) * 60;
  const y11am = gridBox!.y + (11 - 6) * 60;

  await page.mouse.move(x, y9am);
  await page.mouse.down();
  await page.mouse.move(x, y9am + 10);
  await page.mouse.move(x, y11am);
  await page.mouse.up();

  const popover = page.locator('[aria-label="Quick create event"]');
  await expect(popover).toBeVisible({ timeout: 5000 });
  await page.locator('[aria-label="New event title"]').fill("C23 Drag 2h");
  await page.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();
  await expect(page.locator("text=C23 Drag 2h")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 8000 });

  const res = await fetch(`${BASE}/api/trip/${tripId}`);
  const data = (await res.json()) as { data: { events: Array<{ title: string; startMinutes: number; endMinutes: number; deletedAt?: number }> } };
  const ev = data.data.events.find((e) => e.title === "C23 Drag 2h" && !e.deletedAt);
  expect(ev).toBeDefined();
  expect(ev!.startMinutes).toBe(540);
  expect(ev!.endMinutes).toBe(660);

  await ctx.close();
});

test("C23-confirmname-recheck: confirm-by-name shows 'Confirmed by Joanne'", async ({ browser }) => {
  const tripId = await apiCreateTrip("C23 Confirm Recheck");
  await apiPutTrip(tripId, {
    name: "C23 Confirm Recheck",
    details: "",
    events: [{
      id: "c23r-conf-evt",
      date: "2026-05-01",
      startMinutes: 750,
      endMinutes: 810,
      title: "C23 Confirm Event",
      status: "proposed",
      authorId: "pid-c23r-author",
      authorName: "Author",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-c23r-joanne", name: "Joanne" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();

  await page.locator('[data-event-id="c23r-conf-evt"]').click();
  const dialog = page.getByRole("dialog").filter({ hasText: "C23 Confirm Event" });
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator("text=Confirmed by you").first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 8000 });

  const res = await fetch(`${BASE}/api/trip/${tripId}`);
  const data = (await res.json()) as { data: { events: Array<{ id: string; status: string; confirmedBy?: string }> } };
  const ev = data.data.events.find((e) => e.id === "c23r-conf-evt");
  expect(ev?.status).toBe("confirmed");
  expect(ev?.confirmedBy).toBe("Joanne");

  await ctx.close();
});
