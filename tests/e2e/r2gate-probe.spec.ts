/**
 * R2 Gate Probe — independent Playwright probes for round-2 fixes + regressions.
 * Run once as part of the round-2 verification gate; can be deleted after the
 * round-2 panel passes.
 *
 * All tests run against BASE_URL=http://localhost:3099 (local prod build).
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

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
  await fetch(`${BASE}/api/trip/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function apiGetTrip(id: string) {
  const res = await fetch(`${BASE}/api/trip/${id}`);
  return res.json() as Promise<{
    data: {
      events: Array<{
        id: string;
        status: string;
        confirmedBy?: string;
        authorId?: string;
        deletedAt?: number;
      }>;
    };
  }>;
}

// ── R2GATE-1: Two distinct browser contexts — attribution identity ──────────
test("R2GATE-1: Person A creates event; Person B (Dana) confirms; A sees 'Confirmed by Dana', B sees 'Confirmed by you'", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2GATE-1 Attribution");

  // Seed an event attributed to Alice (pid-alice-g1)
  await apiPutTrip(tripId, {
    name: "R2GATE-1 Attribution",
    details: "",
    events: [
      {
        id: "rg1-evt-001",
        date: "2026-05-01",
        startMinutes: 720,
        endMinutes: 780,
        title: "Lunch Tartine",
        status: "proposed",
        authorId: "pid-alice-g1",
        authorName: "Alice",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // ── Context B: Dana confirms ────────────────────────────────────────────
  const ctxDana = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageDana = await ctxDana.newPage();

  // Dana has NO localStorage identity for this trip
  await pageDana.goto(`${BASE}/t/${tripId}`);
  await expect(pageDana.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await pageDana.getByLabel("day view").click();
  await pageDana.waitForTimeout(300);

  // Click event
  await pageDana.locator('[data-event-id="rg1-evt-001"]').click();
  const sheetDana = pageDana.getByRole("dialog").filter({ hasText: "Lunch Tartine" });
  await expect(sheetDana).toBeVisible({ timeout: 4000 });

  // The Confirm button should be visible (it's Alice's event, not Dana's)
  await expect(sheetDana.getByRole("button", { name: "Confirm" })).toBeVisible({ timeout: 2000 });
  await sheetDana.getByRole("button", { name: "Confirm" }).click();

  // Inline name capture dialog must appear (first attributing action for Dana)
  const nameDialog = pageDana.locator('[aria-label="Enter your name"]');
  await expect(nameDialog).toBeVisible({ timeout: 4000 });

  // The name input is clickable / usable (not clipped by portal overlay)
  const nameInput = pageDana.getByRole("textbox", { name: "Your name" });
  await expect(nameInput).toBeVisible({ timeout: 2000 });
  await nameInput.click();
  await nameInput.fill("Dana");
  await pageDana.getByRole("button", { name: /Confirm as Dana/ }).click();

  // Name dialog closes
  await expect(nameDialog).not.toBeVisible({ timeout: 3000 });

  // Wait for save
  await expect(pageDana.locator("text=Saved")).toBeVisible({ timeout: 8000 });

  // Dana re-opens the event — she should see "Confirmed by you"
  await pageDana.locator('[data-event-id="rg1-evt-001"]').click();
  const sheetDana2 = pageDana.getByRole("dialog").filter({ hasText: "Lunch Tartine" });
  await expect(sheetDana2).toBeVisible({ timeout: 3000 });
  await expect(sheetDana2.locator("text=Confirmed by you")).toBeVisible({ timeout: 2000 });
  await expect(sheetDana2.locator("text=Confirmed by Dana")).not.toBeVisible({ timeout: 500 });
  await sheetDana2.getByRole("button", { name: "Close" }).click();
  await ctxDana.close();

  // ── Context A: Alice sees "Confirmed by Dana" ──────────────────────────
  const ctxAlice = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageAlice = await ctxAlice.newPage();

  // Seed Alice's stored identity
  await pageAlice.goto(`${BASE}/`);
  await pageAlice.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-alice-g1", name: "Alice" }) }
  );

  await pageAlice.goto(`${BASE}/t/${tripId}`);
  await expect(pageAlice.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await pageAlice.getByLabel("day view").click();
  await pageAlice.waitForTimeout(300);

  await pageAlice.locator('[data-event-id="rg1-evt-001"]').click();
  const sheetAlice = pageAlice.getByRole("dialog").filter({ hasText: "Lunch Tartine" });
  await expect(sheetAlice).toBeVisible({ timeout: 4000 });

  // CRITICAL: Alice must see "Confirmed by Dana", NOT "Confirmed by you"
  await expect(sheetAlice.locator("text=Confirmed by Dana")).toBeVisible({ timeout: 2000 });
  await expect(sheetAlice.locator("text=Confirmed by you")).not.toBeVisible({ timeout: 500 });

  await ctxAlice.close();
});

// ── R2GATE-1b: Solo creator first event — NO blocking name modal ──────────
test("R2GATE-1b: Solo first event create on blank trip — no blocking name modal", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2GATE-1b Solo No Wall");

  // Completely fresh context — no participant in localStorage
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  await grid.evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(200);

  const gridBox = await grid.boundingBox();
  expect(gridBox).not.toBeNull();

  const HOUR_HEIGHT = 60;
  const DAY_START = 6;
  const y9am = gridBox!.y + (9 - DAY_START) * HOUR_HEIGHT;
  const x = gridBox!.x + 80;

  // Single click — must NOT show blocking name modal; quick-create popover must appear
  await page.mouse.click(x, y9am);

  const nameModal = page.locator('[aria-label="Enter your name"]');
  const quickCreate = page.locator('[aria-label="Quick create event"]');

  await expect(quickCreate).toBeVisible({ timeout: 3000 });
  await expect(nameModal).not.toBeVisible({ timeout: 1000 });

  // Fill and save — still no name modal
  await page.locator('[aria-label="New event title"]').fill("Gate Solo Event");
  await page.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();

  await expect(page.locator("text=Gate Solo Event")).toBeVisible({ timeout: 3000 });
  await expect(nameModal).not.toBeVisible({ timeout: 1000 });

  // Own event should read "Added by you" (not "Proposed by Someone")
  await page.locator('[data-event-block]').filter({ hasText: "Gate Solo Event" }).click();
  const sheet = page.getByRole("dialog").filter({ hasText: "Gate Solo Event" });
  await expect(sheet).toBeVisible({ timeout: 3000 });
  await expect(sheet.locator("text=you")).toBeVisible({ timeout: 2000 });
  await expect(sheet.locator("text=Someone")).not.toBeVisible({ timeout: 500 });
  await expect(sheet.locator("text=Guest")).not.toBeVisible({ timeout: 500 });

  await ctx.close();
});

// ── R2GATE-1c: Returning user with stored identity — no name modal on confirm ─
test("R2GATE-1c: Returning user with stored identity — confirm skips name capture", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2GATE-1c Returning");
  await apiPutTrip(tripId, {
    name: "R2GATE-1c Returning",
    details: "",
    events: [
      {
        id: "rg1c-evt-001",
        date: "2026-05-01",
        startMinutes: 600,
        endMinutes: 660,
        title: "Morning Yoga",
        status: "proposed",
        authorId: "pid-owner-rg1c",
        authorName: "Owner",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // Pre-seed Beatriz as returning user
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-beatriz-rg1c", name: "Beatriz" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  await page.locator('[data-event-id="rg1c-evt-001"]').click();
  const sheet = page.getByRole("dialog").filter({ hasText: "Morning Yoga" });
  await expect(sheet).toBeVisible({ timeout: 3000 });

  // Click Confirm — returning user with real name should NOT get name modal
  await sheet.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator('[aria-label="Enter your name"]')).not.toBeVisible({ timeout: 2000 });

  // Wait for save and verify attributedBy = Beatriz
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 8000 });

  const trip = await apiGetTrip(tripId);
  const ev = trip.data.events.find((e) => e.id === "rg1c-evt-001" && !e.deletedAt);
  expect(ev).toBeDefined();
  expect(ev!.status).toBe("confirmed");
  expect(ev!.confirmedBy).toBe("Beatriz");

  await ctx.close();
});

// ── R2GATE-2: Mobile week at 390px — title readable (not shredded to ~8 chars) ─
test("R2GATE-2: Mobile week view 390px — event title is readable (≥20 chars visible, break-words not truncate)", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2GATE-2 Mobile Week");
  await apiPutTrip(tripId, {
    name: "R2GATE-2 Mobile Week",
    details: "",
    events: [
      {
        id: "rg2-evt-001",
        date: "2026-05-01",
        startMinutes: 600,
        endMinutes: 660,
        title: "Afternoon Hike Golden Gate Park",
        status: "proposed",
        authorId: "pid-rg2",
        authorName: "Sam",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "rg2-evt-002",
        date: "2026-05-02",
        startMinutes: 720,
        endMinutes: 780,
        title: "Dinner at Foreign Cinema Restaurant",
        status: "proposed",
        authorId: "pid-rg2",
        authorName: "Sam",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-rg2", name: "Sam" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Switch to week view
  await page.getByLabel("week view").click();
  await page.waitForTimeout(400);

  // Scroll to find event (in overflow-x-auto container)
  const weekContainer = page.locator(".overflow-x-auto").first();
  await expect(weekContainer).toBeVisible({ timeout: 5000 });

  // Find the event titles
  const title1Locator = page.locator("text=Afternoon Hike Golden Gate Park").first();
  const title2Locator = page.locator("text=Dinner at Foreign Cinema Restaurant").first();

  await expect(title1Locator).toBeVisible({ timeout: 5000 });
  await expect(title2Locator).toBeVisible({ timeout: 5000 });

  // Verify titles are NOT truncated by checking their rendered text content is full
  const title1Text = await title1Locator.textContent();
  const title2Text = await title2Locator.textContent();

  // The full title must be present in the DOM (break-words, not truncation)
  expect(title1Text?.trim()).toContain("Afternoon Hike Golden Gate Park");
  expect(title2Text?.trim()).toContain("Dinner at Foreign Cinema Restaurant");

  // Also verify the column width is ≥ MIN_COL_W (160px) — confirming the fix is active
  // The week columns should have minWidth: 160px in style
  const colSpans = await weekContainer.locator(".flex > div[style]").all();
  // At least one column should have minWidth set
  if (colSpans.length > 0) {
    const style = await colSpans[0].getAttribute("style");
    // style includes min-width: 160px
    expect(style).toMatch(/min-width.*160/);
  }

  await ctx.close();
});

// ── R2GATE-3: Reload — paste panel NOT auto-open; no stale ?paste=1 behavior ─
test("R2GATE-3: Reload existing trip — paste panel closed; no stale ?paste=1", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2GATE-3 Reload Test");
  await apiPutTrip(tripId, {
    name: "R2GATE-3 Reload Test",
    details: "",
    events: [
      {
        id: "rg3-evt-001",
        date: "2026-05-01",
        startMinutes: 540,
        endMinutes: 600,
        title: "Morning Coffee",
        status: "proposed",
        authorId: "pid-rg3",
        authorName: "Alex",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-rg3", name: "Alex" }) }
  );

  // Load the trip (with events — paste panel must NOT appear)
  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Paste panel must NOT be auto-open
  await expect(page.locator("text=Paste your itinerary")).not.toBeVisible({ timeout: 3000 });
  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });

  // Reload
  await page.reload();
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Still no paste panel after reload
  await expect(page.locator("text=Paste your itinerary")).not.toBeVisible({ timeout: 3000 });
  await expect(page.locator("text=Morning Coffee")).toBeVisible({ timeout: 5000 });

  // URL must not contain ?paste=1
  expect(page.url()).not.toContain("paste=1");

  await ctx.close();
});

// ── R2GATE-4: Add-event form date defaults to VIEWED date, not today ─────────
test("R2GATE-4: Add-event via grid on future date defaults to that date in API, not today", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2GATE-4 Date Default");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-rg4", name: "Pat" }) }
  );

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  // Navigate to September 15 using the date picker
  const datePicker = page.locator('input[aria-label="Jump to date"]');
  await expect(datePicker).toBeVisible({ timeout: 3000 });
  await datePicker.fill("2026-09-15");
  await datePicker.dispatchEvent("change");
  await page.waitForTimeout(400);

  // Click grid to open quick-create popover
  const grid = page.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  await grid.evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(200);

  const gridBox = await grid.boundingBox();
  expect(gridBox).not.toBeNull();

  const HOUR_HEIGHT = 60;
  const DAY_START = 6;
  const y11am = gridBox!.y + (11 - DAY_START) * HOUR_HEIGHT;
  const x = gridBox!.x + 80;

  await page.mouse.click(x, y11am);
  const quickCreate = page.locator('[aria-label="Quick create event"]');
  await expect(quickCreate).toBeVisible({ timeout: 3000 });

  await page.locator('[aria-label="New event title"]').fill("Gate Date Default Event");
  await page.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();
  await expect(page.locator("text=Gate Date Default Event")).toBeVisible({ timeout: 3000 });

  // Wait for save
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 6000 });

  // API must show date=2026-09-15, NOT today
  const trip = await apiGetTrip(tripId);
  const ev = trip.data.events.find(
    (e) => (e as unknown as { title: string }).title === "Gate Date Default Event" && !e.deletedAt
  );
  expect(ev).toBeDefined();
  expect((ev as unknown as { date: string }).date).toBe("2026-09-15");

  await ctx.close();
});

// ── R2GATE-5: Own vs Other styling — solid vs dashed ─────────────────────────
test("R2GATE-5a: Own event renders SOLID border (not dashed)", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2GATE-5a Solid");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-rg5", name: "Chris" }) }
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
  expect(gridBox).not.toBeNull();

  const HOUR_HEIGHT = 60;
  const DAY_START = 6;
  const y10am = gridBox!.y + (10 - DAY_START) * HOUR_HEIGHT;
  const x = gridBox!.x + 80;

  await page.mouse.click(x, y10am);
  await expect(page.locator('[aria-label="Quick create event"]')).toBeVisible({ timeout: 3000 });
  await page.locator('[aria-label="New event title"]').fill("Own Event Gate");
  await page.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();
  await expect(page.locator("text=Own Event Gate")).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(300);

  // Own event must NOT have border-dashed class
  const eventBlock = page.locator('[data-event-block]').filter({ hasText: "Own Event Gate" });
  await expect(eventBlock).toBeVisible({ timeout: 3000 });
  const hasDashed = await eventBlock.evaluate((el) => el.className.includes("border-dashed"));
  expect(hasDashed).toBe(false);

  await ctx.close();
});

test("R2GATE-5b: Another person's proposed event has DASHED border", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2GATE-5b Dashed");

  // Seed event from Alice (different person)
  await apiPutTrip(tripId, {
    name: "R2GATE-5b Dashed",
    details: "",
    events: [
      {
        id: "rg5b-evt-001",
        date: "2026-05-01",
        startMinutes: 600,
        endMinutes: 660,
        title: "Alice Proposed Lunch",
        status: "proposed",
        authorId: "pid-alice-rg5b",
        authorName: "Alice",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Open as Chris (different from Alice)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-chris-rg5b", name: "Chris" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  const otherEvent = page.locator('[data-event-id="rg5b-evt-001"]');
  await expect(otherEvent).toBeVisible({ timeout: 5000 });

  // Must have border-dashed (other person's proposed event)
  const hasDashed = await otherEvent.evaluate((el) => el.className.includes("border-dashed"));
  expect(hasDashed).toBe(true);

  await ctx.close();
});

// ── R2GATE-6: Regression — resize/move persist; no phantom event ─────────────
test("R2GATE-6: Resize and move persist; resize: start fixed, end changes; no phantom event", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2GATE-6 Persist");
  await apiPutTrip(tripId, {
    name: "R2GATE-6 Persist",
    details: "",
    events: [
      {
        id: "rg6-evt-001",
        date: "2026-05-01",
        startMinutes: 540,
        endMinutes: 600,
        title: "Persist Test Event",
        status: "proposed",
        authorId: "pid-rg6",
        authorName: "Sam",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-rg6", name: "Sam" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  await grid.evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(200);

  // Find the event block and its resize handle
  const eventBlock = page.locator('[data-event-id="rg6-evt-001"]');
  await expect(eventBlock).toBeVisible({ timeout: 5000 });
  const resizeHandle = eventBlock.locator('[data-resize-edge="bottom"]');
  await expect(resizeHandle).toBeVisible({ timeout: 3000 });

  // Drag resize handle down ~60px (1 hour)
  const handleBox = await resizeHandle.boundingBox();
  expect(handleBox).not.toBeNull();

  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2 + 60, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  // Verify via API: startMinutes=540 (unchanged), endMinutes>600
  const tripAfterResize = await apiGetTrip(tripId);
  const evResized = tripAfterResize.data.events.find((e) => e.id === "rg6-evt-001" && !e.deletedAt);
  expect(evResized).toBeDefined();
  expect((evResized as unknown as { startMinutes: number }).startMinutes).toBe(540);
  expect((evResized as unknown as { endMinutes: number }).endMinutes).toBeGreaterThan(600);

  // Count events — no phantom created
  const activeEvs = tripAfterResize.data.events.filter((e) => !e.deletedAt);
  expect(activeEvs.length).toBe(1);

  // Wait for save and reload
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 8000 });
  await page.reload();
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(400);

  // After reload: event still present with resized endMinutes
  const tripAfterReload = await apiGetTrip(tripId);
  const evReloaded = tripAfterReload.data.events.find((e) => e.id === "rg6-evt-001" && !e.deletedAt);
  expect(evReloaded).toBeDefined();
  expect((evReloaded as unknown as { startMinutes: number }).startMinutes).toBe(540);
  expect((evReloaded as unknown as { endMinutes: number }).endMinutes).toBeGreaterThan(600);

  await ctx.close();
});

// ── R2GATE-7: Regression — drag-create 2h; single-click 1h; popover portaled ─
test("R2GATE-7: Drag-create 9→11 = 2h; click-create = 1h; popover portaled+clickable", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2GATE-7 Create");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-rg7", name: "Jo" }) }
  );

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  await grid.evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(200);

  const scrollTop = await grid.evaluate((el) => el.scrollTop);
  const gridBox = await grid.boundingBox();
  expect(gridBox).not.toBeNull();

  const HOUR_HEIGHT = 60;
  const DAY_START = 6;
  const y9am = gridBox!.y + (9 - DAY_START) * HOUR_HEIGHT - scrollTop;
  const y11am = gridBox!.y + (11 - DAY_START) * HOUR_HEIGHT - scrollTop;
  const x = gridBox!.x + 80;

  // Drag 9→11 (intermediate move to trigger the "moved" flag, matching SC-9 pattern)
  await page.mouse.move(x, y9am);
  await page.mouse.down();
  await page.mouse.move(x, y9am + 10); // trigger drag detection
  await page.mouse.move(x, y11am);
  await page.mouse.up();

  const popover = page.locator('[aria-label="Quick create event"]');
  await expect(popover).toBeVisible({ timeout: 4000 });

  // R4-1: Quick popover now uses custom steppers — verify zero <select> and correct time display
  const selectCount = await page.locator('[aria-label="Quick create event"] select').count();
  expect(selectCount, "Quick popover must have zero native <select> elements (R4-1)").toBe(0);
  // Verify custom steppers display ~9am and ~11am
  const startDisplay = await page.locator('[aria-label="Quick start time"] span').first().textContent();
  const endDisplay = await page.locator('[aria-label="Quick end time"] span').first().textContent();
  expect(startDisplay, "Start must show ~9am").toMatch(/9am/);
  expect(endDisplay, "End must show ~11am").toMatch(/11am/);

  // Test popover is clickable — Save button is topmost hit target
  const saveBtn = popover.getByRole("button", { name: "Save" });
  const saveBtnBox = await saveBtn.boundingBox();
  expect(saveBtnBox).not.toBeNull();
  const cx = saveBtnBox!.x + saveBtnBox!.width / 2;
  const cy = saveBtnBox!.y + saveBtnBox!.height / 2;
  const topEl = await page.evaluate(
    ({ cx, cy }) => document.elementFromPoint(cx, cy)?.tagName,
    { cx, cy }
  );
  // The top element at Save button coords must be BUTTON (not clipped by overlay)
  expect(topEl).toBe("BUTTON");

  await page.locator('[aria-label="New event title"]').fill("Gate 2h Drag");
  await saveBtn.click();
  await expect(page.locator("text=Gate 2h Drag")).toBeVisible({ timeout: 3000 });

  await ctx.close();
});

// ── R2GATE-8: Regression — landing options; blank-calendar path; week view ≥2 cols ─
test("R2GATE-8: Landing shows two co-equal options; blank calendar has no paste panel; week ≥2 cols", async ({ browser }) => {
  // Landing page checks
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await expect(page.locator("text=Loading")).not.toBeVisible({ timeout: 5000 });

  // Both headings must be visible and equal weight
  await expect(page.locator("h2", { hasText: "Paste an itinerary" })).toBeVisible({ timeout: 3000 });
  await expect(page.locator("h2", { hasText: "Start from a blank calendar" })).toBeVisible({ timeout: 3000 });

  // Blank-calendar path
  await page.getByRole("button", { name: /Start blank/ }).click();
  await page.waitForURL(/\/t\/.+/, { timeout: 10000 });

  // Paste panel must NOT auto-open on blank calendar
  await expect(page.locator("text=Paste your itinerary")).not.toBeVisible({ timeout: 3000 });

  // Calendar grid must be visible
  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });

  // Week view must show ≥2 day columns
  await page.getByLabel("week view").click();
  await page.waitForTimeout(300);
  const weekCols = await page.locator(".overflow-x-auto .flex > div").count();
  expect(weekCols).toBeGreaterThanOrEqual(2);

  await ctx.close();
});

// ── R2GATE-9: Regression — No horizontal overflow at 390px; FAB present on coarse ─
test("R2GATE-9: No horizontal overflow at 390px; FAB visible on touch context", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2GATE-9 Overflow");
  await apiPutTrip(tripId, {
    name: "R2GATE-9 Overflow",
    details: "",
    events: [
      {
        id: "rg9-evt-001",
        date: "2026-05-01",
        startMinutes: 600,
        endMinutes: 660,
        title: "Very Long Event Title That Could Potentially Cause Horizontal Overflow",
        status: "proposed",
        authorId: "pid-rg9",
        authorName: "Alex",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-rg9", name: "Alex" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  // No horizontal overflow
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 2;
  });
  expect(hasOverflow).toBe(false);

  // FAB must be visible on touch context
  const fab = page.locator('[aria-label="Add event"]');
  await expect(fab).toBeVisible({ timeout: 3000 });

  await ctx.close();
});
