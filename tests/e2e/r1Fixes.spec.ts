/**
 * R1 Fix acceptance tests (Round-1 panel feedback fixes).
 *
 * R1-1: Resize handle is visible; dragging bottom handle changes END time, not START.
 *        A drag starting on the handle does NOT create a second event.
 * R1-2: On a blank trip, creating an event via the grid shows NO blocking name modal.
 * R1-3: A freshly created event on a solo trip does NOT show "Proposed by Someone"/"Proposed by Guest".
 * R1-4: From a blank trip, user can navigate/jump to a future date and create an event there.
 * R1-5: Week view shows ≥2 day columns even on a blank/single-day trip.
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
    data: { events: Array<{ id: string; startMinutes: number; endMinutes: number; title: string; date: string; deletedAt?: number }> };
  }>;
}

// ── R1-1: Visible resize handle; dragging it changes END time not START ────────
test("R1-1: bottom resize handle visible; dragging it changes endMinutes while startMinutes stays fixed", async ({ browser }) => {
  const tripId = await apiCreateTrip("R1-1 Resize Test");
  await apiPutTrip(tripId, {
    name: "R1-1 Resize Test",
    details: "",
    events: [
      {
        id: "r11-evt-001",
        date: "2026-05-01",
        startMinutes: 540,  // 9:00
        endMinutes: 600,    // 10:00
        title: "Resize Handle Test",
        status: "proposed",
        authorId: "pid-r11",
        authorName: "TestUser",
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
    { tripId, p: JSON.stringify({ id: "pid-r11", name: "TestUser" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  await grid.evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(300);

  // Locate the event block and its bottom resize handle
  const eventBlock = page.locator('[data-event-id="r11-evt-001"]');
  await expect(eventBlock).toBeVisible({ timeout: 5000 });
  const blockBox = await eventBlock.boundingBox();
  expect(blockBox).not.toBeNull();

  // R1-1: bottom handle has data-resize-edge="bottom"
  const bottomHandle = page.locator('[data-event-id="r11-evt-001"] [data-resize-edge="bottom"]');
  await expect(bottomHandle).toBeVisible({ timeout: 3000 });

  // Grab bottom handle and drag it down ~1 hour (60px)
  const HOUR_HEIGHT = 60;
  const handleY = blockBox!.y + blockBox!.height - 4;
  const handleX = blockBox!.x + blockBox!.width / 2;

  await page.mouse.move(handleX, handleY);
  await page.mouse.down();
  await page.mouse.move(handleX, handleY + 10);
  await page.mouse.move(handleX, handleY + HOUR_HEIGHT - 5);
  await page.mouse.move(handleX, handleY + HOUR_HEIGHT);
  await page.mouse.up();

  // Wait for API write
  await page.waitForTimeout(2000);

  // Verify: endMinutes increased, startMinutes unchanged
  const trip = await apiGetTrip(tripId);
  const ev = trip.data.events.find((e) => e.id === "r11-evt-001" && !e.deletedAt);
  expect(ev).toBeDefined();
  // Start must be unchanged (9:00 = 540)
  expect(ev!.startMinutes).toBe(540);
  // End must be greater than original 600 (10:00)
  expect(ev!.endMinutes).toBeGreaterThan(600);

  await ctx.close();
});

// ── R1-1: Dragging bottom handle does NOT create a second event ───────────────
test("R1-1: dragging the bottom resize handle does NOT create a new event", async ({ browser }) => {
  const tripId = await apiCreateTrip("R1-1 No Create Test");
  await apiPutTrip(tripId, {
    name: "R1-1 No Create Test",
    details: "",
    events: [
      {
        id: "r11-nc-001",
        date: "2026-05-01",
        startMinutes: 540,
        endMinutes: 600,
        title: "Single Event",
        status: "proposed",
        authorId: "pid-r11nc",
        authorName: "TestUser",
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
    { tripId, p: JSON.stringify({ id: "pid-r11nc", name: "TestUser" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await grid.evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(300);

  const eventBlock = page.locator('[data-event-id="r11-nc-001"]');
  await expect(eventBlock).toBeVisible({ timeout: 5000 });
  const blockBox = await eventBlock.boundingBox();
  expect(blockBox).not.toBeNull();

  const HOUR_HEIGHT = 60;
  const handleY = blockBox!.y + blockBox!.height - 4;
  const handleX = blockBox!.x + blockBox!.width / 2;

  // Drag the bottom handle (resize gesture)
  await page.mouse.move(handleX, handleY);
  await page.mouse.down();
  await page.mouse.move(handleX, handleY + 10);
  await page.mouse.move(handleX, handleY + HOUR_HEIGHT);
  await page.mouse.up();

  // Wait — a new quick-create popover must NOT appear
  await page.waitForTimeout(1000);
  await expect(page.locator('[aria-label="Quick create event"]')).not.toBeVisible({ timeout: 1000 });

  // API: must still have only 1 event (no second event created)
  await page.waitForTimeout(1500);
  const trip = await apiGetTrip(tripId);
  const activeEvents = trip.data.events.filter((e) => !e.deletedAt);
  expect(activeEvents.length).toBe(1);

  await ctx.close();
});

// ── R1-2: Creating event on blank trip shows NO blocking name modal ───────────
test("R1-2: blank trip — create event via grid with NO name modal appearing first", async ({ browser }) => {
  const tripId = await apiCreateTrip("R1-2 No Name Modal Test");

  // Fresh context — no participant in localStorage (first-time user)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // No localStorage seed — fresh user with no name
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

  // Click empty slot to create event — must NOT show a blocking name modal
  await page.mouse.click(x, y10am);

  // R1-2: Quick-create popover should appear WITHOUT any name modal
  const nameModal = page.locator('[aria-label="Enter your name"]');
  const popover = page.locator('[aria-label="Quick create event"]');

  // The popover should appear; the name modal must NOT appear
  await expect(popover).toBeVisible({ timeout: 3000 });
  await expect(nameModal).not.toBeVisible({ timeout: 1000 });

  // Save the event — still no name modal
  await page.locator('[aria-label="New event title"]').fill("R1-2 Test Event");
  await page.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();

  // Event renders — still no name modal blocking
  await expect(page.locator("text=R1-2 Test Event")).toBeVisible({ timeout: 3000 });
  await expect(nameModal).not.toBeVisible({ timeout: 1000 });

  await ctx.close();
});

// ── R1-3: Own events never show "Proposed by Someone"/"Proposed by Guest" ─────
test("R1-3: freshly created event on solo trip does NOT show 'Proposed by Someone' or 'Proposed by Guest'", async ({ browser }) => {
  const tripId = await apiCreateTrip("R1-3 Solo Attribution Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Fresh user (no name set) — creates an event
  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await grid.evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(200);

  const gridBox = await grid.boundingBox();
  expect(gridBox).not.toBeNull();

  const HOUR_HEIGHT = 60;
  const DAY_START = 6;
  const y9am = gridBox!.y + (9 - DAY_START) * HOUR_HEIGHT;
  const x = gridBox!.x + 80;

  // Create event
  await page.mouse.click(x, y9am);
  await expect(page.locator('[aria-label="Quick create event"]')).toBeVisible({ timeout: 3000 });
  await page.locator('[aria-label="New event title"]').fill("My Solo Event");
  await page.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();
  await expect(page.locator("text=My Solo Event")).toBeVisible({ timeout: 3000 });

  // Click the event to open bottom sheet
  await page.locator("text=My Solo Event").first().click();
  const sheet = page.getByRole("dialog").filter({ hasText: "My Solo Event" });
  await expect(sheet).toBeVisible({ timeout: 3000 });

  // R1-3: Must NOT show "Proposed by Someone" or "Proposed by Guest"
  await expect(sheet.locator("text=Proposed by Someone")).not.toBeVisible();
  await expect(sheet.locator("text=Proposed by Guest")).not.toBeVisible();
  // Must NOT show a "Confirm" button (creator doesn't confirm their own event)
  // Actually for own events the Confirm button is hidden per R1-3

  await ctx.close();
});

// ── R1-4: Blank trip can navigate to a future date and create event there ──────
test("R1-4: blank trip — can navigate to future date and create event there", async ({ browser }) => {
  const tripId = await apiCreateTrip("R1-4 Date Nav Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-r14", name: "R14User" }) }
  );

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  // R1-4: blank calendar shows a date picker or prev/next arrows
  // Use the date picker (for blank trip there are no date chips, so a date input appears)
  const datePicker = page.locator('input[aria-label="Jump to date"]');
  await expect(datePicker).toBeVisible({ timeout: 3000 });

  // Navigate to August 15 (a future date)
  await datePicker.fill("2026-08-15");
  await datePicker.dispatchEvent("change");
  await page.waitForTimeout(300);

  // The day grid should now be on 2026-08-15 — create an event
  const grid = page.locator('[aria-label="Day schedule"]');
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
  await page.locator('[aria-label="New event title"]').fill("August Event");
  await page.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();

  await expect(page.locator("text=August Event")).toBeVisible({ timeout: 3000 });

  // Verify via API: event is on August 15
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 5000 });
  const trip = await apiGetTrip(tripId);
  const ev = trip.data.events.find((e) => e.title === "August Event" && !e.deletedAt);
  expect(ev).toBeDefined();
  expect(ev!.date).toBe("2026-08-15");

  await ctx.close();
});

// ── R1-5: Week view shows ≥2 day columns even on blank trip ───────────────────
test("R1-5: week view shows ≥2 day columns even on a blank/single-day trip", async ({ browser }) => {
  const tripId = await apiCreateTrip("R1-5 Week Multi-Col Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-r15", name: "R15User" }) }
  );

  // Blank trip — 0 events
  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Switch to week view
  await page.getByLabel("week view").click();
  await page.waitForTimeout(300);

  // R1-5: Week view must show ≥2 day-column headers (not collapse to 1)
  // Day columns are rendered as flex children; each has a date button at top
  // The week view renders displayDates which is 7 days for a blank trip
  const dayHeaders = page.locator('[aria-label="week view"]');
  // There should be multiple date buttons in the week grid
  const weekGrid = page.locator('.overflow-x-auto .flex').first();
  await expect(weekGrid).toBeVisible({ timeout: 3000 });

  // Count day-column header buttons (these are the date buttons at top of each column)
  // They render as <button> inside the week grid flex container
  const columnHeaders = weekGrid.locator('button').filter({ hasText: /Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/ });
  const count = await columnHeaders.count();
  expect(count).toBeGreaterThanOrEqual(2);

  await ctx.close();
});
