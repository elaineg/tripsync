/**
 * R2 Fix acceptance tests (Round-2 panel feedback fixes).
 *
 * R2-1: Confirm/propose attribution identity — viewer-relative display.
 *        Person B confirms Person A's event; A sees "Confirmed by Dana", B sees "Confirmed by you".
 *        Solo creator still creates event with NO blocking name modal.
 * R2-3: Paste panel does NOT re-open on reload (no ?paste=1 stale param).
 * R2-4: Add-event form date defaults to CURRENTLY VIEWED date, not today.
 * R2-5: Own/added events render SOLID border, not dashed.
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
        deletedAt?: number;
      }>;
    };
  }>;
}

// ── R2-1: Two-identity attribution: person B confirms, A sees "Confirmed by Dana" ──
test("R2-1: person B (Dana) confirms event; person A sees 'Confirmed by Dana', not 'Confirmed by you'", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2-1 Attribution Test");
  await apiPutTrip(tripId, {
    name: "R2-1 Attribution Test",
    details: "",
    events: [
      {
        id: "r21-evt-001",
        date: "2026-05-01",
        startMinutes: 750,
        endMinutes: 810,
        title: "Dinner Foreign Cinema",
        status: "proposed",
        authorId: "pid-alice",
        authorName: "Alice",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // ── Person B (Dana) opens the trip in a fresh context and confirms ────────
  const ctxDana = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageDana = await ctxDana.newPage();

  // Dana has no stored identity for this trip
  await pageDana.goto(`${BASE}/t/${tripId}`);
  await expect(pageDana.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await pageDana.getByLabel("day view").click();

  // Tap the event
  await pageDana.locator('[data-event-id="r21-evt-001"]').click();
  const sheetDana = pageDana.getByRole("dialog").filter({ hasText: "Dinner Foreign Cinema" });
  await expect(sheetDana).toBeVisible({ timeout: 3000 });

  // Dana should see a "Confirm" button (it's Alice's event, not Dana's)
  await expect(sheetDana.getByRole("button", { name: "Confirm" })).toBeVisible();
  await sheetDana.getByRole("button", { name: "Confirm" }).click();

  // R2-1: Name capture modal should appear for Dana (first attributing action)
  const nameCaptureDialog = pageDana.locator('[aria-label="Enter your name"]');
  await expect(nameCaptureDialog).toBeVisible({ timeout: 3000 });

  // Dana enters her name
  await pageDana.getByRole("textbox", { name: "Your name" }).fill("Dana");
  await pageDana.getByRole("button", { name: /Confirm as Dana/ }).click();

  // Name dialog dismisses; event confirmed
  await expect(nameCaptureDialog).not.toBeVisible({ timeout: 2000 });

  // Wait for save
  await expect(pageDana.locator("text=Saved")).toBeVisible({ timeout: 6000 });

  // R2-1: In Dana's OWN view, confirmed by "you"
  // Re-open event sheet to check attribution
  await pageDana.locator('[data-event-id="r21-evt-001"]').click();
  const sheetDana2 = pageDana.getByRole("dialog").filter({ hasText: "Dinner Foreign Cinema" });
  await expect(sheetDana2).toBeVisible({ timeout: 3000 });
  // Dana sees "Confirmed by you" (her own action)
  await expect(sheetDana2.locator("text=Confirmed by you")).toBeVisible({ timeout: 2000 });
  await sheetDana2.getByRole("button", { name: "Close" }).click();

  await ctxDana.close();

  // ── Person A (Alice) opens the trip — should see "Confirmed by Dana" ─────
  const ctxAlice = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageAlice = await ctxAlice.newPage();

  // Seed Alice's identity
  await pageAlice.goto(`${BASE}/`);
  await pageAlice.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-alice", name: "Alice" }) }
  );

  await pageAlice.goto(`${BASE}/t/${tripId}`);
  await expect(pageAlice.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await pageAlice.getByLabel("day view").click();

  // Alice taps the event
  await pageAlice.locator('[data-event-id="r21-evt-001"]').click();
  const sheetAlice = pageAlice.getByRole("dialog").filter({ hasText: "Dinner Foreign Cinema" });
  await expect(sheetAlice).toBeVisible({ timeout: 3000 });

  // R2-1: Alice sees "Confirmed by Dana" — NOT "Confirmed by you"
  await expect(sheetAlice.locator("text=Confirmed by Dana")).toBeVisible({ timeout: 2000 });
  await expect(sheetAlice.locator("text=Confirmed by you")).not.toBeVisible({ timeout: 500 });

  await ctxAlice.close();
});

// ── R2-1: Solo creator still creates first event with NO blocking name modal ───
test("R2-1 guardrail: solo creator creates first event with NO blocking name modal", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2-1 Solo No Wall Test");

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

  // Click empty slot — must NOT show a blocking name modal
  await page.mouse.click(x, y10am);

  const nameModal = page.locator('[aria-label="Enter your name"]');
  const popover = page.locator('[aria-label="Quick create event"]');

  // Popover appears, name modal must NOT appear
  await expect(popover).toBeVisible({ timeout: 3000 });
  await expect(nameModal).not.toBeVisible({ timeout: 1000 });

  // Save the event — still no name modal
  await page.locator('[aria-label="New event title"]').fill("Solo Event No Wall");
  await page.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();

  await expect(page.locator("text=Solo Event No Wall")).toBeVisible({ timeout: 3000 });
  await expect(nameModal).not.toBeVisible({ timeout: 1000 });

  await ctx.close();
});

// ── R2-1: Returning user with stored identity still gets correct attribution ───
test("R2-1 returning user: pre-existing stored identity still applies on confirm", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2-1 Returning User Test");
  await apiPutTrip(tripId, {
    name: "R2-1 Returning User Test",
    details: "",
    events: [
      {
        id: "r21-ret-evt-001",
        date: "2026-05-01",
        startMinutes: 600,
        endMinutes: 660,
        title: "Returning User Confirm Test",
        status: "proposed",
        authorId: "pid-owner-ret",
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

  // Pre-seed "Marcus" as returning user
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-marcus-ret", name: "Marcus" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();

  // Marcus taps and confirms — should NOT show name capture (he already has a name)
  await page.locator('[data-event-id="r21-ret-evt-001"]').click();
  const sheet = page.getByRole("dialog").filter({ hasText: "Returning User Confirm Test" });
  await expect(sheet).toBeVisible({ timeout: 3000 });
  await sheet.getByRole("button", { name: "Confirm", exact: true }).click();

  // No name capture should appear (Marcus already has a real name stored)
  await expect(page.locator('[aria-label="Enter your name"]')).not.toBeVisible({ timeout: 1500 });

  // Wait for save
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 6000 });

  // Verify confirmedBy = "Marcus" via API
  const trip = await apiGetTrip(tripId);
  const ev = trip.data.events.find((e) => e.id === "r21-ret-evt-001" && !e.deletedAt);
  expect(ev).toBeDefined();
  expect(ev!.status).toBe("confirmed");
  expect(ev!.confirmedBy).toBe("Marcus");

  await ctx.close();
});

// ── R2-3: Paste panel does NOT re-open on reload ─────────────────────────────
test("R2-3: loading a trip with events and reloading does NOT re-open the paste panel", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2-3 Paste Reload Test");
  await apiPutTrip(tripId, {
    name: "R2-3 Paste Reload Test",
    details: "",
    events: [
      {
        id: "r23-evt-001",
        date: "2026-05-01",
        startMinutes: 540,
        endMinutes: 600,
        title: "Morning coffee",
        status: "proposed",
        authorId: "pid-r23",
        authorName: "Alice",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-r23", name: "Alice" }) }
  );

  // Load the trip (has events — no paste panel)
  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Paste panel should NOT be open (trip has events)
  await expect(page.locator("text=Paste your itinerary")).not.toBeVisible({ timeout: 2000 });

  // Reload the page
  await page.reload();
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Paste panel must STILL NOT be open after reload
  await expect(page.locator("text=Paste your itinerary")).not.toBeVisible({ timeout: 2000 });

  // Calendar must be showing with the event
  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Morning coffee")).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── R2-3: ?paste=1 URL param is stripped from URL after panel opens ────────────
test("R2-3: ?paste=1 URL param is stripped after panel opens (so reload does not re-trigger)", async ({ page }) => {
  const tripId = await apiCreateTrip("R2-3 URL Param Strip Test");

  // Navigate with ?paste=1 (landing-page paste flow adds this)
  await page.goto(`${BASE}/t/${tripId}?paste=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Paste panel opens
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  // Wait a moment for URL replacement
  await page.waitForTimeout(500);

  // URL should no longer contain ?paste=1
  const currentUrl = page.url();
  expect(currentUrl).not.toContain("paste=1");
  expect(currentUrl).toMatch(/\/t\/[A-Za-z0-9\-_]{22,}$/);
});

// ── R2-4: Add-event form date defaults to CURRENTLY VIEWED date ───────────────
test("R2-4: navigating to a future date and opening add-event form defaults to that date", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2-4 Date Default Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-r24", name: "Sam" }) }
  );

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  // Navigate to August 1 using the date picker (blank calendar)
  const datePicker = page.locator('input[aria-label="Jump to date"]');
  await expect(datePicker).toBeVisible({ timeout: 3000 });
  await datePicker.fill("2026-08-01");
  await datePicker.dispatchEvent("change");
  await page.waitForTimeout(300);

  // Open the grid and click a slot (quick-create path on desktop)
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

  // Click to open quick-create popover
  await page.mouse.click(x, y10am);
  const popover = page.locator('[aria-label="Quick create event"]');
  await expect(popover).toBeVisible({ timeout: 3000 });

  // Save the event (quick-create; date is set internally)
  await page.locator('[aria-label="New event title"]').fill("R2-4 Future Event");
  await page.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();
  await expect(page.locator("text=R2-4 Future Event")).toBeVisible({ timeout: 3000 });

  // Wait for save
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 5000 });

  // Verify via API: event must be on 2026-08-01
  const trip = await apiGetTrip(tripId);
  const ev = trip.data.events.find(
    (e) => (e as unknown as { title: string }).title === "R2-4 Future Event" && !e.deletedAt
  );
  expect(ev).toBeDefined();
  expect((ev as unknown as { date: string }).date).toBe("2026-08-01");

  await ctx.close();
});

// ── R2-5: Own/added events render SOLID border (not dashed) ──────────────────
test("R2-5: creator's own event renders with solid border, not dashed", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2-5 Solid Border Test");

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-r25", name: "Dana" }) }
  );

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  // Create an event as Dana (own event)
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
  await page.locator('[aria-label="New event title"]').fill("Own Event Solid");
  await page.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();
  await expect(page.locator("text=Own Event Solid")).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(300);

  // Find the event block and check it does NOT have border-dashed class
  const eventBlock = page.locator('[data-event-block]').filter({ hasText: "Own Event Solid" });
  await expect(eventBlock).toBeVisible({ timeout: 3000 });

  // R2-5: own event must have 'event-confirmed' class (solid), not 'event-proposed' (dashed)
  // Actually with R2-5 fix: own events use solid border even when status=proposed
  // The class is 'event-proposed border-2 border-dashed' for OTHERS' proposed events
  // Own events should NOT have border-dashed
  const hasDashed = await eventBlock.evaluate((el) =>
    el.className.includes("border-dashed")
  );
  expect(hasDashed).toBe(false);

  await ctx.close();
});

// ── R2-5: Another person's proposed event still renders DASHED ────────────────
test("R2-5: another person's unconfirmed event keeps dashed border (Aisha semantics intact)", async ({ browser }) => {
  const tripId = await apiCreateTrip("R2-5 Dashed Border Test");

  // Seed event from "Alice" (a different author)
  await apiPutTrip(tripId, {
    name: "R2-5 Dashed Border Test",
    details: "",
    events: [
      {
        id: "r25-other-evt",
        date: "2026-05-01",
        startMinutes: 600,
        endMinutes: 660,
        title: "Alice Proposed Event",
        status: "proposed",
        authorId: "pid-alice-r25",
        authorName: "Alice",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Open as Dana (a different user)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-dana-r25", name: "Dana" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  // Alice's event should still be dashed (proposed by someone else)
  const otherEventBlock = page.locator('[data-event-id="r25-other-evt"]');
  await expect(otherEventBlock).toBeVisible({ timeout: 5000 });

  const hasDashed = await otherEventBlock.evaluate((el) =>
    el.className.includes("border-dashed")
  );
  // R2-5: OTHERS' proposed events KEEP dashed border
  expect(hasDashed).toBe(true);

  await ctx.close();
});

// ── R3-1/R3-2: UNNAMED solo creator's own event renders SOLID (not dashed) ────
// Root-cause test: the solo creator has NO name set when creating the event.
// R3-1 ensures a stable participantId is created at init even without a name,
// so isOwnEvent = true by ID comparison, and R3-2 renders the event solid.
test("R3-2: unnamed solo creator's own event is SOLID + full-opacity on desktop AND 390px mobile, Day and Week", async ({ browser }) => {
  const tripId = await apiCreateTrip("R3-2 Solid Unnamed Test");

  // Desktop — create event without setting any name
  const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageDesktop = await ctxDesktop.newPage();

  // Fresh context — NO participant seeded (unnamed solo creator)
  await pageDesktop.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(pageDesktop.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await pageDesktop.getByLabel("day view").click();
  await pageDesktop.waitForTimeout(500);

  // Verify a stable participantId was auto-created (empty name is OK)
  const storedParticipant = await pageDesktop.evaluate(
    (key) => window.localStorage.getItem(key),
    `ts_participant_${tripId}`
  );
  expect(storedParticipant).not.toBeNull();
  const pData = JSON.parse(storedParticipant!);
  expect(pData.id).toBeTruthy(); // id must exist
  // name may be empty — that's fine for R3-1

  // Create an event without entering a name
  const grid = pageDesktop.locator('[aria-label="Day schedule"]');
  await grid.evaluate((el) => { el.scrollTop = 0; });
  const gridBox = await grid.boundingBox();
  const y = gridBox!.y + (10 - 6) * 60;
  const x = gridBox!.x + 80;
  await pageDesktop.mouse.click(x, y);
  const popover = pageDesktop.locator('[aria-label="Quick create event"]');
  await expect(popover).toBeVisible({ timeout: 3000 });
  await pageDesktop.locator('[aria-label="New event title"]').fill("Unnamed Creator Event");
  await pageDesktop.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();
  await expect(pageDesktop.locator("text=Unnamed Creator Event")).toBeVisible({ timeout: 3000 });
  await pageDesktop.waitForTimeout(500);

  // Day view desktop: own event must NOT have border-dashed; must have data-event-own=true
  const eventBlockDesktop = pageDesktop.locator('[data-event-block]').filter({ hasText: "Unnamed Creator Event" });
  await expect(eventBlockDesktop).toBeVisible({ timeout: 3000 });

  const desktopDayResult = await eventBlockDesktop.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      hasDashed: el.className.includes("border-dashed"),
      borderStyle: cs.borderStyle,
      opacity: parseFloat(cs.opacity),
      isOwn: el.getAttribute("data-event-own"),
    };
  });
  expect(desktopDayResult.hasDashed).toBe(false);
  expect(desktopDayResult.borderStyle).not.toContain("dashed");
  expect(desktopDayResult.opacity).toBeGreaterThanOrEqual(0.99);
  expect(desktopDayResult.isOwn).toBe("true");

  // Week view desktop: same event must be solid
  await pageDesktop.getByLabel("week view").click();
  await pageDesktop.waitForTimeout(500);
  const weekBtnDesktop = pageDesktop.locator("button").filter({ hasText: "Unnamed Creator Event" }).first();
  const desktopWeekResult = await weekBtnDesktop.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return { borderStyle: cs.borderStyle, opacity: parseFloat(cs.opacity) };
  });
  expect(desktopWeekResult.borderStyle).not.toContain("dashed");
  expect(desktopWeekResult.opacity).toBeGreaterThanOrEqual(0.99);

  await ctxDesktop.close();

  // Mobile 390px — seed same participant (same device simulated)
  const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageMobile = await ctxMobile.newPage();

  await pageMobile.goto(`${BASE}/`);
  await pageMobile.evaluate(({ key, val }) => {
    window.localStorage.setItem(key, val);
  }, { key: `ts_participant_${tripId}`, val: storedParticipant! });

  await pageMobile.goto(`${BASE}/t/${tripId}`);
  await expect(pageMobile.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await pageMobile.getByLabel("day view").click();
  await pageMobile.waitForTimeout(500);

  // Day view mobile: own event must be solid
  const eventBlockMobile = pageMobile.locator('[data-event-block]').filter({ hasText: "Unnamed Creator Event" }).first();
  const mobileDayResult = await eventBlockMobile.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      hasDashed: el.className.includes("border-dashed"),
      borderStyle: cs.borderStyle,
      opacity: parseFloat(cs.opacity),
      isOwn: el.getAttribute("data-event-own"),
      backgroundColor: cs.backgroundColor,
    };
  });
  expect(mobileDayResult.hasDashed).toBe(false);
  expect(mobileDayResult.borderStyle).not.toContain("dashed");
  expect(mobileDayResult.opacity).toBeGreaterThanOrEqual(0.99);
  expect(mobileDayResult.isOwn).toBe("true");

  // Week view mobile: same event must be solid
  await pageMobile.getByLabel("week view").click();
  await pageMobile.waitForTimeout(500);
  const weekBtnMobile = pageMobile.locator("button").filter({ hasText: "Unnamed Creator Event" }).first();
  const mobileWeekResult = await weekBtnMobile.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return { borderStyle: cs.borderStyle, opacity: parseFloat(cs.opacity) };
  });
  expect(mobileWeekResult.borderStyle).not.toContain("dashed");
  expect(mobileWeekResult.opacity).toBeGreaterThanOrEqual(0.99);

  await ctxMobile.close();
});

// ── R3-1: Non-author viewer sees "the organizer" NOT "you" ──────────────────
// A fresh viewer (different device, no stored identity for the trip) opens the creator's
// event and must see "Proposed by the organizer" or "Proposed by <name>", NEVER "Proposed by you".
test("R3-1: non-author viewer (no identity) sees 'Proposed by the organizer' NOT 'Proposed by you'", async ({ browser }) => {
  const tripId = await apiCreateTrip("R3-1 Attribution Test");
  // Seed the organizer's event (authorId is a unique device ID, name is empty — unnamed solo creator)
  await apiPutTrip(tripId, {
    name: "R3-1 Attribution Test",
    details: "",
    events: [
      {
        id: "r31-org-evt",
        date: "2026-07-01",
        startMinutes: 600,
        endMinutes: 660,
        title: "Organizer's Plan",
        status: "proposed",
        authorId: "pid-organizer-r31",
        authorName: "", // unnamed organizer
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Fresh viewer — no stored identity (different device)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  // No localStorage seed → this viewer has a different participantId

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(500);

  // Tap the organizer's event
  const eventBlock = page.locator('[data-event-id="r31-org-evt"]');
  await expect(eventBlock).toBeVisible({ timeout: 5000 });
  await eventBlock.click();
  await page.waitForTimeout(300);

  const sheet = page.getByRole("dialog").filter({ hasText: "Organizer's Plan" });
  await expect(sheet).toBeVisible({ timeout: 3000 });
  const sheetText = await sheet.textContent();

  // R3-1: MUST NOT see "Proposed by you" — viewer is not the author
  expect(sheetText).not.toContain("Proposed by you");
  // MUST see "Proposed by the organizer" (unnamed author → neutral label)
  expect(sheetText).toContain("Proposed by the organizer");

  // Also verify the event renders as dashed (not own) from the viewer's perspective
  const isOwnAttr = await eventBlock.getAttribute("data-event-own");
  expect(isOwnAttr).toBe("false");

  await ctx.close();
});
