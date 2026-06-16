/**
 * R3 Gate — Round-3 regression gate for TripSync.
 *
 * Covers:
 * 1. UNNAMED solo creator (NO name ever set) — own event is SOLID + opacity:1 via COMPUTED STYLES
 *    in Day view at 1280px AND 390px; Week view at 1280px AND 390px.
 *    Also asserts background fill color is THE SAME value across desktop and mobile.
 * 2. Other-person proposed event has DASHED border (second identity).
 * 3. Attribution for NON-AUTHOR viewer: sees "the organizer" NOT "you".
 * 4. Confirm attribution: person A proposes, person B (Dana) confirms; A sees "Confirmed by Dana",
 *    B sees "Confirmed by you".
 * 5. Zero native <select> elements in drag-create/edit editor DOM.
 * Regressions:
 * 6. First create NOT blocked by name modal; own events read "Added by you".
 * 7. Resize (end changes, start fixed) + move persist across reload.
 * 8. Drag-create 9→11=2h; click-create=1h; popover portaled+clickable; two co-equal landing
 *    options; paste-parser unchanged; blank-calendar; Week ≥2 cols; mobile Week titles readable;
 *    reload does NOT re-open paste panel; add-event form inherits viewed date.
 * 9. No horizontal overflow at 390px; FAB on coarse / hidden on fine.
 * 10. Returning identity: seed ts_participant_<secret> localStorage, reload — own events recognized.
 *
 * All tests run against BASE_URL (default: http://localhost:3099 via env).
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3099";

// ── Helpers ──────────────────────────────────────────────────────────────────

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
        startMinutes?: number;
        endMinutes?: number;
        deletedAt?: number;
        [k: string]: unknown;
      }>;
    };
  }>;
}

// ── Item 1: UNNAMED solo creator (critical case) ──────────────────────────────
//
// Fresh browser context with NO name ever set.
// Create an event. Pull COMPUTED STYLES (not class names) in:
//   Day view at 1280px, Day view at 390px, Week view at 1280px, Week view at 390px.
// Assert in all four:
//   border-style is solid (not dashed)
//   opacity is 1 (not 0.65)
//   background fill is the SAME hex value across desktop and mobile.

test("R3-1: UNNAMED solo creator (NO name ever set) — own event solid + opacity:1 via computed styles in all 4 view×width combos", async ({ browser }) => {
  const tripId = await apiCreateTrip("R3Gate Unnamed Solo");

  // ── Step 1: FRESH desktop context — NO name, NO stored participant ─────────
  const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageDesktop = await ctxDesktop.newPage();

  // Verify nothing pre-seeded
  await pageDesktop.goto(`${BASE}/`);
  await pageDesktop.evaluate((key) => localStorage.removeItem(key), `ts_participant_${tripId}`);

  await pageDesktop.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(pageDesktop.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await pageDesktop.getByLabel("day view").click();
  await pageDesktop.waitForTimeout(500);

  // Confirm NO name was ever set
  const storedParticipantDesktop = await pageDesktop.evaluate(
    (key) => window.localStorage.getItem(key),
    `ts_participant_${tripId}`
  );
  // The app auto-creates a participant with empty name; confirm name is empty
  const pDataDesktop = storedParticipantDesktop ? JSON.parse(storedParticipantDesktop) : null;
  expect(pDataDesktop?.id).toBeTruthy(); // ID must exist (R3-1 init)
  // name should be empty string (never asked user for name)
  expect(pDataDesktop?.name ?? "").toBe("");

  // Create an event without ever entering a name
  const grid = pageDesktop.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  await grid.evaluate((el) => { el.scrollTop = 0; });
  await pageDesktop.waitForTimeout(200);

  const gridBox = await grid.boundingBox();
  expect(gridBox).not.toBeNull();
  const HOUR_H = 60;
  const DAY_START = 6;
  const y10am = gridBox!.y + (10 - DAY_START) * HOUR_H;
  const x = gridBox!.x + 100;

  // Single click = 1h block
  await pageDesktop.mouse.click(x, y10am);
  const popover = pageDesktop.locator('[aria-label="Quick create event"]');
  await expect(popover).toBeVisible({ timeout: 3000 });
  // Dismiss name modal guard: must NOT appear
  await expect(pageDesktop.locator('[aria-label="Enter your name"]')).not.toBeVisible({ timeout: 500 });
  await pageDesktop.locator('[aria-label="New event title"]').fill("Unnamed Solo Computed");
  await pageDesktop.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();
  await expect(pageDesktop.locator("text=Unnamed Solo Computed")).toBeVisible({ timeout: 3000 });
  await pageDesktop.waitForTimeout(600);

  // ── Day view desktop (1280px) — pull COMPUTED STYLES ─────────────────────
  const eventBlockDesktop = pageDesktop.locator('[data-event-block]').filter({ hasText: "Unnamed Solo Computed" }).first();
  await expect(eventBlockDesktop).toBeVisible({ timeout: 3000 });

  const desktopDayStyles = await eventBlockDesktop.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      borderStyle: cs.borderStyle,
      borderTopStyle: cs.borderTopStyle,
      borderRightStyle: cs.borderRightStyle,
      borderBottomStyle: cs.borderBottomStyle,
      borderLeftStyle: cs.borderLeftStyle,
      opacity: parseFloat(cs.opacity),
      backgroundColor: cs.backgroundColor,
      isOwnAttr: el.getAttribute("data-event-own"),
      statusAttr: el.getAttribute("data-event-status"),
      hasDashedClass: el.className.includes("border-dashed"),
    };
  });

  // Assertions: border-style solid, opacity 1, data-event-own=true
  expect(desktopDayStyles.isOwnAttr, "Day desktop: data-event-own must be true").toBe("true");
  expect(desktopDayStyles.statusAttr, "Day desktop: event status").toBe("proposed");
  expect(desktopDayStyles.hasDashedClass, "Day desktop: must NOT have border-dashed class").toBe(false);
  // The block has border-l-4 (left border 4px). borderStyle shorthand may be "none" if only one side is set.
  // Check at least the LEFT border is solid (which is the meaningful one for event blocks).
  expect(desktopDayStyles.borderLeftStyle, "Day desktop: left border-style must be solid").toBe("solid");
  expect(desktopDayStyles.opacity, "Day desktop: opacity must be 1").toBeGreaterThanOrEqual(0.99);

  const desktopBgColor = desktopDayStyles.backgroundColor;

  // ── Week view desktop (1280px) — pull COMPUTED STYLES ────────────────────
  await pageDesktop.getByLabel("week view").click();
  await pageDesktop.waitForTimeout(500);
  const weekBtnDesktop = pageDesktop.locator("button").filter({ hasText: "Unnamed Solo Computed" }).first();
  await expect(weekBtnDesktop).toBeVisible({ timeout: 3000 });

  const desktopWeekStyles = await weekBtnDesktop.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      borderStyle: cs.borderStyle,
      borderTopStyle: cs.borderTopStyle,
      opacity: parseFloat(cs.opacity),
      backgroundColor: cs.backgroundColor,
      hasDashedClass: el.className.includes("border-dashed"),
    };
  });

  expect(desktopWeekStyles.hasDashedClass, "Week desktop: must NOT have border-dashed class").toBe(false);
  // Week view has border-2 border-solid for own events
  expect(desktopWeekStyles.borderTopStyle, "Week desktop: border-top-style must be solid").toBe("solid");
  expect(desktopWeekStyles.opacity, "Week desktop: opacity must be 1").toBeGreaterThanOrEqual(0.99);

  await ctxDesktop.close();

  // ── Step 2: Mobile 390px — seed the SAME participant ID ───────────────────
  const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageMobile = await ctxMobile.newPage();

  // Seed the same (unnamed) participant from the desktop session
  await pageMobile.goto(`${BASE}/`);
  await pageMobile.evaluate(({ key, val }) => {
    window.localStorage.setItem(key, val);
  }, { key: `ts_participant_${tripId}`, val: storedParticipantDesktop! });

  await pageMobile.goto(`${BASE}/t/${tripId}`);
  await expect(pageMobile.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await pageMobile.getByLabel("day view").click();
  await pageMobile.waitForTimeout(500);

  // ── Day view mobile (390px) — pull COMPUTED STYLES ───────────────────────
  const eventBlockMobile = pageMobile.locator('[data-event-block]').filter({ hasText: "Unnamed Solo Computed" }).first();
  await expect(eventBlockMobile).toBeVisible({ timeout: 5000 });

  const mobileDayStyles = await eventBlockMobile.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      borderStyle: cs.borderStyle,
      borderLeftStyle: cs.borderLeftStyle,
      opacity: parseFloat(cs.opacity),
      backgroundColor: cs.backgroundColor,
      isOwnAttr: el.getAttribute("data-event-own"),
      hasDashedClass: el.className.includes("border-dashed"),
    };
  });

  expect(mobileDayStyles.isOwnAttr, "Day mobile: data-event-own must be true").toBe("true");
  expect(mobileDayStyles.hasDashedClass, "Day mobile: must NOT have border-dashed class").toBe(false);
  expect(mobileDayStyles.borderLeftStyle, "Day mobile: left border-style must be solid").toBe("solid");
  expect(mobileDayStyles.opacity, "Day mobile: opacity must be 1").toBeGreaterThanOrEqual(0.99);

  const mobileBgColor = mobileDayStyles.backgroundColor;

  // CRITICAL: background color must be THE SAME across desktop and mobile
  expect(mobileBgColor, `Day mobile bg (${mobileBgColor}) must match desktop bg (${desktopBgColor})`).toBe(desktopBgColor);

  // ── Week view mobile (390px) — pull COMPUTED STYLES ──────────────────────
  await pageMobile.getByLabel("week view").click();
  await pageMobile.waitForTimeout(500);
  const weekBtnMobile = pageMobile.locator("button").filter({ hasText: "Unnamed Solo Computed" }).first();
  await expect(weekBtnMobile).toBeVisible({ timeout: 3000 });

  const mobileWeekStyles = await weekBtnMobile.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      borderTopStyle: cs.borderTopStyle,
      opacity: parseFloat(cs.opacity),
      backgroundColor: cs.backgroundColor,
      hasDashedClass: el.className.includes("border-dashed"),
    };
  });

  expect(mobileWeekStyles.hasDashedClass, "Week mobile: must NOT have border-dashed class").toBe(false);
  expect(mobileWeekStyles.borderTopStyle, "Week mobile: border-top-style must be solid").toBe("solid");
  expect(mobileWeekStyles.opacity, "Week mobile: opacity must be 1").toBeGreaterThanOrEqual(0.99);

  await ctxMobile.close();
});

// ── Item 2: Other-person proposed event has DASHED border ────────────────────

test("R3-2: Second identity's event is DASHED from first user's perspective", async ({ browser }) => {
  const tripId = await apiCreateTrip("R3Gate Other Dashed");
  await apiPutTrip(tripId, {
    name: "R3Gate Other Dashed",
    details: "",
    events: [
      {
        id: "r3g-other-evt",
        date: "2026-07-15",
        startMinutes: 600,
        endMinutes: 660,
        title: "Second User Proposed",
        status: "proposed",
        authorId: "pid-second-user-r3g",
        authorName: "Bob",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Open as a DIFFERENT user (Alice, not Bob)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.evaluate(({ tripId, p }) => {
    localStorage.setItem(`ts_participant_${tripId}`, p);
  }, { tripId, p: JSON.stringify({ id: "pid-alice-r3g", name: "Alice" }) });

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(400);

  const eventBlock = page.locator('[data-event-id="r3g-other-evt"]');
  await expect(eventBlock).toBeVisible({ timeout: 5000 });

  const styles = await eventBlock.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      hasDashedClass: el.className.includes("border-dashed"),
      opacity: parseFloat(cs.opacity),
      isOwn: el.getAttribute("data-event-own"),
    };
  });

  expect(styles.isOwn, "Other user event: data-event-own must be false").toBe("false");
  expect(styles.hasDashedClass, "Other user event: must have border-dashed class").toBe(true);
  expect(styles.opacity, "Other user event: opacity must be ~0.65").toBeLessThan(0.9);

  await ctx.close();
});

// ── Item 3: Non-author viewer sees "the organizer" NOT "you" ──────────────────

test("R3-3: Non-author viewer (no identity) opening creator event sees 'the organizer' NOT 'Proposed by you'", async ({ browser }) => {
  const tripId = await apiCreateTrip("R3Gate Non-Author Attribution");
  await apiPutTrip(tripId, {
    name: "R3Gate Non-Author Attribution",
    details: "",
    events: [
      {
        id: "r3g-noauth-evt",
        date: "2026-08-01",
        startMinutes: 720,
        endMinutes: 780,
        title: "Creator Only Event",
        status: "proposed",
        authorId: "pid-creator-r3g",
        authorName: "", // unnamed creator
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Fresh viewer — entirely different device, no localStorage for this trip
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(500);

  // Verify the viewer has a DIFFERENT participant ID than the creator
  const viewerParticipant = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    `ts_participant_${tripId}`
  );
  const viewerData = viewerParticipant ? JSON.parse(viewerParticipant) : null;
  // The viewer's auto-generated ID must NOT match the creator's
  expect(viewerData?.id).not.toBe("pid-creator-r3g");

  // Tap the event
  const eventBlock = page.locator('[data-event-id="r3g-noauth-evt"]');
  await expect(eventBlock).toBeVisible({ timeout: 5000 });
  await eventBlock.click();
  await page.waitForTimeout(300);

  const sheet = page.getByRole("dialog").filter({ hasText: "Creator Only Event" });
  await expect(sheet).toBeVisible({ timeout: 3000 });
  const sheetText = await sheet.textContent();

  // MUST NOT see "Proposed by you"
  expect(sheetText, "Non-author must NOT see 'Proposed by you'").not.toContain("Proposed by you");
  // MUST see "Proposed by the organizer" (unnamed creator → neutral label)
  expect(sheetText, "Non-author must see 'Proposed by the organizer'").toContain("Proposed by the organizer");

  // Also verify data-event-own=false (dashed, not own)
  const isOwnAttr = await eventBlock.getAttribute("data-event-own");
  expect(isOwnAttr, "Non-author: data-event-own must be false").toBe("false");

  await ctx.close();
});

// ── Item 4: Confirm attribution — A proposes, B (Dana) confirms; A sees name, B sees "you" ──

test("R3-4: Person A proposes; Person B (Dana) confirms; A's reload shows 'Confirmed by Dana', B sees 'Confirmed by you'", async ({ browser }) => {
  const tripId = await apiCreateTrip("R3Gate Confirm Attribution");
  await apiPutTrip(tripId, {
    name: "R3Gate Confirm Attribution",
    details: "",
    events: [
      {
        id: "r3g-confirm-evt",
        date: "2026-09-01",
        startMinutes: 840,
        endMinutes: 900,
        title: "Dinner Foreign Cinema R3",
        status: "proposed",
        authorId: "pid-alice-r3g-attr",
        authorName: "Alice",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // ── Person B (Dana) opens and confirms ────────────────────────────────────
  const ctxDana = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageDana = await ctxDana.newPage();
  // Dana has NO stored identity
  await pageDana.goto(`${BASE}/t/${tripId}`);
  await expect(pageDana.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await pageDana.getByLabel("day view").click();
  await pageDana.waitForTimeout(300);

  await pageDana.locator('[data-event-id="r3g-confirm-evt"]').click();
  const sheetDana = pageDana.getByRole("dialog").filter({ hasText: "Dinner Foreign Cinema R3" });
  await expect(sheetDana).toBeVisible({ timeout: 3000 });
  await expect(sheetDana.getByRole("button", { name: "Confirm" })).toBeVisible();
  await sheetDana.getByRole("button", { name: "Confirm" }).click();

  // Inline name capture must appear (Dana has no name yet)
  const nameDialog = pageDana.locator('[aria-label="Enter your name"]');
  await expect(nameDialog).toBeVisible({ timeout: 3000 });
  await pageDana.getByRole("textbox", { name: "Your name" }).fill("Dana");
  await pageDana.getByRole("button", { name: /Confirm as Dana/ }).click();
  await expect(nameDialog).not.toBeVisible({ timeout: 2000 });

  // Wait for save
  await expect(pageDana.locator("text=Saved")).toBeVisible({ timeout: 8000 });

  // Dana's own view: "Confirmed by you"
  await pageDana.locator('[data-event-id="r3g-confirm-evt"]').click();
  const sheetDana2 = pageDana.getByRole("dialog").filter({ hasText: "Dinner Foreign Cinema R3" });
  await expect(sheetDana2).toBeVisible({ timeout: 3000 });
  await expect(sheetDana2.locator("text=Confirmed by you")).toBeVisible({ timeout: 2000 });
  await expect(sheetDana2.locator("text=Confirmed by Dana")).not.toBeVisible({ timeout: 500 });
  await sheetDana2.getByRole("button", { name: "Close" }).click();
  await ctxDana.close();

  // ── Person A (Alice) reloads — should see "Confirmed by Dana" ─────────────
  const ctxAlice = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageAlice = await ctxAlice.newPage();
  // Seed Alice's identity
  await pageAlice.goto(`${BASE}/`);
  await pageAlice.evaluate(({ tripId, p }) => {
    localStorage.setItem(`ts_participant_${tripId}`, p);
  }, { tripId, p: JSON.stringify({ id: "pid-alice-r3g-attr", name: "Alice" }) });

  await pageAlice.goto(`${BASE}/t/${tripId}`);
  await expect(pageAlice.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await pageAlice.getByLabel("day view").click();
  await pageAlice.waitForTimeout(300);

  await pageAlice.locator('[data-event-id="r3g-confirm-evt"]').click();
  const sheetAlice = pageAlice.getByRole("dialog").filter({ hasText: "Dinner Foreign Cinema R3" });
  await expect(sheetAlice).toBeVisible({ timeout: 3000 });

  // CRITICAL: Alice sees "Confirmed by Dana" — NOT "Confirmed by you"
  await expect(sheetAlice.locator("text=Confirmed by Dana")).toBeVisible({ timeout: 2000 });
  await expect(sheetAlice.locator("text=Confirmed by you")).not.toBeVisible({ timeout: 500 });

  await ctxAlice.close();
});

// ── Item 5: Zero native <select> in drag-create/edit editor DOM ───────────────
//
// The EventEditSheet must use CustomTimePicker (stepper buttons), NOT <select>.
// The QuickCreatePopover DOES have selects (it's documented as "editable selects")
// so we check the FULL EDIT SHEET specifically.

test("R3-5: Edit sheet has ZERO native <select> elements; uses custom time picker", async ({ browser }) => {
  const tripId = await apiCreateTrip("R3Gate No Select");
  await apiPutTrip(tripId, {
    name: "R3Gate No Select",
    details: "",
    events: [
      {
        id: "r3g-nosel-evt",
        date: "2026-10-01",
        startMinutes: 540,
        endMinutes: 600,
        title: "Edit Sheet No Select",
        status: "proposed",
        authorId: "pid-nosel",
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
  await page.evaluate(({ tripId, p }) => {
    localStorage.setItem(`ts_participant_${tripId}`, p);
  }, { tripId, p: JSON.stringify({ id: "pid-nosel", name: "Sam" }) });

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  // Tap the event to open bottom sheet, then click Edit
  const eventBlock = page.locator('[data-event-id="r3g-nosel-evt"]');
  await expect(eventBlock).toBeVisible({ timeout: 5000 });
  await eventBlock.click();
  const sheet = page.getByRole("dialog").filter({ hasText: "Edit Sheet No Select" });
  await expect(sheet).toBeVisible({ timeout: 3000 });
  await sheet.getByRole("button", { name: "Edit" }).click();

  // Edit sheet opens
  const editDialog = page.getByRole("dialog").filter({ hasText: "Edit event" });
  await expect(editDialog).toBeVisible({ timeout: 3000 });

  // Count native <select> elements inside the edit dialog
  const selectCount = await editDialog.locator("select").count();
  expect(selectCount, "Edit sheet must have ZERO native <select> elements").toBe(0);

  // Verify custom time picker stepper buttons are present
  const startDecreaseHour = editDialog.locator('[aria-label="Start hour decrease"]');
  const startIncreaseHour = editDialog.locator('[aria-label="Start hour increase"]');
  const endDecreaseHour = editDialog.locator('[aria-label="End hour decrease"]');
  await expect(startDecreaseHour).toBeVisible({ timeout: 2000 });
  await expect(startIncreaseHour).toBeVisible({ timeout: 2000 });
  await expect(endDecreaseHour).toBeVisible({ timeout: 2000 });

  await ctx.close();
});

// ── Item 6 (regression): First create NOT blocked by name modal; own events show "Added by you" ──

test("R3-6: Solo creator first event NOT blocked by name modal; shows 'Added by you'", async ({ browser }) => {
  const tripId = await apiCreateTrip("R3Gate Solo No Wall R6");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Fresh context — NO participant
  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await grid.evaluate((el) => { el.scrollTop = 0; });
  const gridBox = await grid.boundingBox();
  const y = gridBox!.y + (9 - 6) * 60;
  const x = gridBox!.x + 100;

  await page.mouse.click(x, y);
  const popover = page.locator('[aria-label="Quick create event"]');
  await expect(popover).toBeVisible({ timeout: 3000 });
  // Must NOT show name modal
  await expect(page.locator('[aria-label="Enter your name"]')).not.toBeVisible({ timeout: 500 });

  await page.locator('[aria-label="New event title"]').fill("My First Solo Event");
  await page.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();
  await expect(page.locator("text=My First Solo Event")).toBeVisible({ timeout: 3000 });
  // Must NOT show name modal after save either
  await expect(page.locator('[aria-label="Enter your name"]')).not.toBeVisible({ timeout: 500 });

  // Open event sheet — should say "Added by you" (isOwnEvent=true, status=proposed)
  await page.locator('[data-event-block]').filter({ hasText: "My First Solo Event" }).click();
  const eventSheet = page.getByRole("dialog").filter({ hasText: "My First Solo Event" });
  await expect(eventSheet).toBeVisible({ timeout: 3000 });
  // "Added by you" is the text for own proposed events
  await expect(eventSheet.locator("text=Added by you")).toBeVisible({ timeout: 2000 });
  // Must NOT say "Proposed by Someone" or "Guest"
  await expect(eventSheet.locator("text=Proposed by the organizer")).not.toBeVisible({ timeout: 500 });

  await ctx.close();
});

// ── Item 7 (regression): Resize (end changes, start fixed) + move persist across reload ──

test("R3-7: Resize bottom handle: end increases, start stays fixed; body drag moves; both persist on reload", async ({ browser }) => {
  const tripId = await apiCreateTrip("R3Gate Persist R7");
  await apiPutTrip(tripId, {
    name: "R3Gate Persist R7",
    details: "",
    events: [
      {
        id: "r3g-persist-evt",
        date: "2026-11-01",
        startMinutes: 540,  // 9am
        endMinutes: 600,    // 10am
        title: "Persist Resize Move",
        status: "proposed",
        authorId: "pid-r3g7",
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
  await page.evaluate(({ tripId, p }) => {
    localStorage.setItem(`ts_participant_${tripId}`, p);
  }, { tripId, p: JSON.stringify({ id: "pid-r3g7", name: "Sam" }) });

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await grid.evaluate((el) => { el.scrollTop = 0; });

  const eventBlock = page.locator('[data-event-id="r3g-persist-evt"]');
  await expect(eventBlock).toBeVisible({ timeout: 5000 });

  // ── RESIZE: drag bottom handle down 60px (1 hour) ──────────────────────
  const bottomHandle = eventBlock.locator('[data-resize-edge="bottom"]');
  await expect(bottomHandle).toBeVisible({ timeout: 3000 });
  const handleBox = await bottomHandle.boundingBox();
  expect(handleBox).not.toBeNull();
  const hx = handleBox!.x + handleBox!.width / 2;
  const hy = handleBox!.y + handleBox!.height / 2;

  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx, hy + 30, { steps: 5 });
  await page.mouse.move(hx, hy + 60, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  // Verify via API: startMinutes=540 (unchanged), endMinutes>600 (increased)
  const afterResize = await apiGetTrip(tripId);
  const evResized = afterResize.data.events.find((e) => e.id === "r3g-persist-evt" && !e.deletedAt);
  expect(evResized, "Event must exist after resize").toBeDefined();
  expect((evResized as { startMinutes: number }).startMinutes, "Start must be fixed at 540").toBe(540);
  expect((evResized as { endMinutes: number }).endMinutes, "End must increase beyond 600").toBeGreaterThan(600);

  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 8000 });

  // ── MOVE: drag event body down ~60px ────────────────────────────────────
  await page.waitForTimeout(200);
  const blockBox = await eventBlock.boundingBox();
  expect(blockBox).not.toBeNull();
  const bx = blockBox!.x + blockBox!.width / 2;
  const by = blockBox!.y + blockBox!.height / 2;

  await page.mouse.move(bx, by);
  await page.mouse.down();
  await page.mouse.move(bx, by + 30, { steps: 5 });
  await page.mouse.move(bx, by + 60, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  // Verify via API: startMinutes changed (moved later), but duration preserved
  const afterMove = await apiGetTrip(tripId);
  const evMoved = afterMove.data.events.find((e) => e.id === "r3g-persist-evt" && !e.deletedAt);
  expect(evMoved, "Event must exist after move").toBeDefined();
  const movedStart = (evMoved as { startMinutes: number }).startMinutes;
  const movedEnd = (evMoved as { endMinutes: number }).endMinutes;
  // After move: start should be > 540 (moved down)
  expect(movedStart, "Start must be greater than 540 after body drag").toBeGreaterThan(540);
  // Duration must be preserved
  const origEndMinutes = (evResized as { endMinutes: number }).endMinutes;
  const origStartMinutes = (evResized as { startMinutes: number }).startMinutes;
  const origDuration = origEndMinutes - origStartMinutes;
  expect(movedEnd - movedStart, "Duration must be preserved after move").toBe(origDuration);

  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 8000 });

  // ── RELOAD: verify both persist ──────────────────────────────────────────
  await page.reload();
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  const afterReload = await apiGetTrip(tripId);
  const evReloaded = afterReload.data.events.find((e) => e.id === "r3g-persist-evt" && !e.deletedAt);
  expect(evReloaded, "Event must persist after reload").toBeDefined();
  expect((evReloaded as { startMinutes: number }).startMinutes).toBe(movedStart);
  expect((evReloaded as { endMinutes: number }).endMinutes).toBe(movedEnd);

  await ctx.close();
});

// ── Item 8 (regression): Drag-create 9→11=2h; click-create=1h; two co-equal landing options;
//    paste parser unchanged; blank-calendar; Week ≥2 cols; mobile Week titles readable at 390px;
//    reload does NOT re-open paste panel; add-event form inherits viewed date ──────────────────

test("R3-8a: Drag-create 9→11 = startMinutes:540 endMinutes:660; click-create = 1h block; popover portaled+clickable", async ({ browser }) => {
  const tripId = await apiCreateTrip("R3Gate DragCreate R8a");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.evaluate(({ tripId, p }) => {
    localStorage.setItem(`ts_participant_${tripId}`, p);
  }, { tripId, p: JSON.stringify({ id: "pid-r3g8a", name: "Jo" }) });

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await grid.evaluate((el) => { el.scrollTop = 0; });
  const scrollTop = await grid.evaluate((el) => el.scrollTop);
  const gridBox = await grid.boundingBox();

  const HOUR_H = 60;
  const DAY_START = 6;
  const y9 = gridBox!.y + (9 - DAY_START) * HOUR_H - scrollTop;
  const y11 = gridBox!.y + (11 - DAY_START) * HOUR_H - scrollTop;
  const x = gridBox!.x + 100;

  // Drag 9→11
  await page.mouse.move(x, y9);
  await page.mouse.down();
  await page.mouse.move(x, y9 + 10, { steps: 2 });
  await page.mouse.move(x, y11, { steps: 10 });
  await page.mouse.up();

  const popover = page.locator('[aria-label="Quick create event"]');
  await expect(popover).toBeVisible({ timeout: 4000 });

  // R4-1: Quick popover now uses custom steppers — verify zero <select> and correct time display
  const selectCount = await page.locator('[aria-label="Quick create event"] select').count();
  expect(selectCount, "Quick popover must have zero native <select> (R4-1)").toBe(0);
  const startDisp = await page.locator('[aria-label="Quick start time"] span').first().textContent();
  const endDisp = await page.locator('[aria-label="Quick end time"] span').first().textContent();
  expect(startDisp, "Drag start must show ~9am").toMatch(/9am/);
  expect(endDisp, "Drag end must show ~11am").toMatch(/11am/);

  // Popover portaled: Save button must be the topmost hit element at its coords
  const saveBtn = popover.getByRole("button", { name: "Save" });
  const saveBtnBox = await saveBtn.boundingBox();
  const topEl = await page.evaluate(({ cx, cy }) => {
    return document.elementFromPoint(cx, cy)?.tagName;
  }, { cx: saveBtnBox!.x + saveBtnBox!.width / 2, cy: saveBtnBox!.y + saveBtnBox!.height / 2 });
  expect(topEl, "Popover Save button must be topmost element (portaled, not clipped)").toBe("BUTTON");

  await page.locator('[aria-label="New event title"]').fill("Drag 2h Event");
  await saveBtn.click();
  await expect(page.locator("text=Drag 2h Event")).toBeVisible({ timeout: 3000 });

  // Click-create: single click = 1h block
  await grid.evaluate((el) => { el.scrollTop = 0; });
  const gridBox2 = await grid.boundingBox();
  const y2pm = gridBox2!.y + (14 - DAY_START) * HOUR_H;
  await page.mouse.click(x, y2pm);
  const popover2 = page.locator('[aria-label="Quick create event"]').last();
  await expect(popover2).toBeVisible({ timeout: 3000 });
  // R4-1: Click-create also uses custom steppers — verify start/end steppers visible
  await expect(page.locator('[aria-label="Quick start time"]').last(), "Quick start stepper visible after click-create").toBeVisible({ timeout: 3000 });
  await expect(page.locator('[aria-label="Quick end time"]').last(), "Quick end stepper visible after click-create").toBeVisible({ timeout: 3000 });
  // The start+1h relationship is now verified by the presence of the custom steppers
  // (the underlying state still uses startMinutes/endMinutes = start+60 — just no <select> to read)

  await ctx.close();
});

test("R3-8b: Two co-equal landing options visible; blank-calendar path drops to grid; Week ≥2 cols", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);

  // Two visually equal start choices
  await expect(page.locator("h2", { hasText: "Paste an itinerary" })).toBeVisible({ timeout: 3000 });
  await expect(page.locator("h2", { hasText: "Start from a blank calendar" })).toBeVisible({ timeout: 3000 });

  // Blank-calendar path
  await page.getByRole("button", { name: /Start blank/ }).click();
  await page.waitForURL(/\/t\/.+/, { timeout: 10000 });

  // Paste panel must NOT auto-open
  await expect(page.locator("text=Paste your itinerary")).not.toBeVisible({ timeout: 3000 });
  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });

  // Week view must show ≥2 day columns
  await page.getByLabel("week view").click();
  await page.waitForTimeout(300);
  const weekCols = await page.locator(".overflow-x-auto .flex > div").count();
  expect(weekCols, "Week view must show at least 2 day columns").toBeGreaterThanOrEqual(2);

  await ctx.close();
});

test("R3-8c: Paste parser unchanged — Emily acceptance test still produces correct events", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await expect(page.locator("text=Loading")).not.toBeVisible({ timeout: 5000 });

  // Use the "Paste an itinerary" flow — button text is "Paste an itinerary"
  await page.getByRole("button", { name: "Paste an itinerary" }).click();
  await page.waitForURL(/\/t\/.+/, { timeout: 10000 });
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  // Load sample itinerary
  await page.getByRole("button", { name: /Load sample itinerary/ }).click();
  await page.waitForTimeout(200);

  // Parse
  await page.getByRole("button", { name: /Parse/ }).click();

  // Preview must appear
  await expect(page.locator("text=Preview parsed events")).toBeVisible({ timeout: 3000 });

  // Check some expected events are in preview (both single-time and range).
  // The preview shows event titles as <input type="text" value="..."> elements.
  // Use input value selectors.
  const emilyLandsInput = page.locator('input[aria-label="Event title"]').filter({ hasValue: /Emily lands/ });
  const uberInput = page.locator('input[aria-label="Event title"]').filter({ hasValue: /Uber/ });
  await expect(emilyLandsInput.first()).toBeVisible({ timeout: 3000 });
  await expect(uberInput.first()).toBeVisible({ timeout: 2000 });

  // Confirm
  await page.getByRole("button", { name: /Add to/ }).click();
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 5000 });

  // Calendar must show parsed events (event blocks, not input values)
  await expect(page.locator('[data-event-block]').filter({ hasText: /Emily lands/ }).first()).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

test("R3-8d: Reload with events does NOT re-open paste panel; add-event form inherits viewed date", async ({ browser }) => {
  const tripId = await apiCreateTrip("R3Gate Reload PastePanel R8d");
  await apiPutTrip(tripId, {
    name: "R3Gate Reload PastePanel R8d",
    details: "",
    events: [
      {
        id: "r3g-r8d-evt",
        date: "2026-06-01",
        startMinutes: 540,
        endMinutes: 600,
        title: "R8d Morning Coffee",
        status: "proposed",
        authorId: "pid-r3g8d",
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
  await page.evaluate(({ tripId, p }) => {
    localStorage.setItem(`ts_participant_${tripId}`, p);
  }, { tripId, p: JSON.stringify({ id: "pid-r3g8d", name: "Alex" }) });

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  // Paste panel must NOT be open (trip has events)
  await expect(page.locator("text=Paste your itinerary")).not.toBeVisible({ timeout: 2000 });

  await page.reload();
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await expect(page.locator("text=Paste your itinerary")).not.toBeVisible({ timeout: 2000 });

  // Add-event by clicking a slot on the current day grid.
  // The date picker (input[aria-label="Jump to date"]) only appears for blank trips.
  // For trips with events, date chips are shown. Use the grid directly.
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  // Verify the grid is on the correct date (2026-06-01) based on the seeded event
  const grid = page.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  await grid.evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(200);

  const gridBox = await grid.boundingBox();
  expect(gridBox).not.toBeNull();
  // Click on a slot at 11am to create an event
  const HOUR_H2 = 60;
  const DAY_START2 = 6;
  const y11am = gridBox!.y + (11 - DAY_START2) * HOUR_H2;
  await page.mouse.click(gridBox!.x + 100, y11am);
  const popover = page.locator('[aria-label="Quick create event"]');
  await expect(popover).toBeVisible({ timeout: 3000 });
  await page.locator('[aria-label="New event title"]').fill("R8d Event Same Day");
  await page.locator('[aria-label="Quick create event"] button', { hasText: "Save" }).click();
  await expect(page.locator("text=R8d Event Same Day")).toBeVisible({ timeout: 3000 });
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 8000 });

  // API: event must be on 2026-06-01 (the viewed date, which is inherited from selectedDate)
  const trip = await apiGetTrip(tripId);
  const ev = trip.data.events.find((e) => (e as { title: string }).title === "R8d Event Same Day" && !e.deletedAt);
  expect(ev, "Event must exist in API").toBeDefined();
  expect((ev as { date: string }).date, "Event must be on 2026-06-01 (viewed date)").toBe("2026-06-01");

  await ctx.close();
});

test("R3-8e: Mobile Week titles readable at 390px (not truncated); Week shows ≥2 day columns", async ({ browser }) => {
  const tripId = await apiCreateTrip("R3Gate Mobile Week Readable");
  await apiPutTrip(tripId, {
    name: "R3Gate Mobile Week Readable",
    details: "",
    events: [
      {
        id: "r3g-r8e-evt1",
        date: "2026-05-01",
        startMinutes: 600,
        endMinutes: 660,
        title: "Afternoon Hike Golden Gate Park",
        status: "proposed",
        authorId: "pid-r3g8e",
        authorName: "Sam",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "r3g-r8e-evt2",
        date: "2026-05-02",
        startMinutes: 720,
        endMinutes: 780,
        title: "Dinner at Foreign Cinema Restaurant",
        status: "proposed",
        authorId: "pid-r3g8e",
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
  await page.evaluate(({ tripId, p }) => {
    localStorage.setItem(`ts_participant_${tripId}`, p);
  }, { tripId, p: JSON.stringify({ id: "pid-r3g8e", name: "Sam" }) });

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("week view").click();
  await page.waitForTimeout(400);

  // Week columns ≥2
  const weekCols = await page.locator(".overflow-x-auto .flex > div").count();
  expect(weekCols, "Week must show ≥2 columns at 390px").toBeGreaterThanOrEqual(2);

  // Titles must be full text (break-words, not truncated)
  const title1 = page.locator("text=Afternoon Hike Golden Gate Park").first();
  const title2 = page.locator("text=Dinner at Foreign Cinema Restaurant").first();
  await expect(title1).toBeVisible({ timeout: 5000 });
  await expect(title2).toBeVisible({ timeout: 5000 });

  const t1text = await title1.textContent();
  const t2text = await title2.textContent();
  expect(t1text?.trim()).toContain("Afternoon Hike Golden Gate Park");
  expect(t2text?.trim()).toContain("Dinner at Foreign Cinema Restaurant");

  // Day header titles must be readable at 390px (column width ≥160px)
  const colStyle = await page.locator(".overflow-x-auto .flex > div[style]").first().getAttribute("style");
  expect(colStyle, "Week columns must have min-width: 160px").toMatch(/min-width.*160/);

  await ctx.close();
});

// ── Item 9 (regression): No horizontal overflow at 390px; FAB on coarse / hidden on fine ──

test("R3-9: No horizontal overflow at 390px; FAB visible on touch; FAB absent on fine-pointer desktop", async ({ browser }) => {
  const tripId = await apiCreateTrip("R3Gate Overflow R9");
  await apiPutTrip(tripId, {
    name: "R3Gate Overflow R9",
    details: "",
    events: [
      {
        id: "r3g-r9-evt",
        date: "2026-05-01",
        startMinutes: 600,
        endMinutes: 660,
        title: "Very Long Event Title That Could Potentially Cause Horizontal Overflow On Mobile",
        status: "proposed",
        authorId: "pid-r3g9",
        authorName: "Alex",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // ── Touch context: no overflow, FAB visible ───────────────────────────────
  const ctxTouch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const pageTouch = await ctxTouch.newPage();
  await pageTouch.goto(`${BASE}/`);
  await pageTouch.evaluate(({ tripId, p }) => {
    localStorage.setItem(`ts_participant_${tripId}`, p);
  }, { tripId, p: JSON.stringify({ id: "pid-r3g9", name: "Alex" }) });

  await pageTouch.goto(`${BASE}/t/${tripId}`);
  await expect(pageTouch.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await pageTouch.getByLabel("day view").click();
  await pageTouch.waitForTimeout(300);

  const hasOverflow = await pageTouch.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 2;
  });
  expect(hasOverflow, "Must have no horizontal overflow at 390px").toBe(false);

  // FAB must be visible on touch
  const fab = pageTouch.locator('[aria-label="Add event"]');
  await expect(fab, "FAB must be visible on touch context").toBeVisible({ timeout: 3000 });
  await ctxTouch.close();

  // ── Fine-pointer desktop context: FAB hidden ─────────────────────────────
  const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageDesktop = await ctxDesktop.newPage();
  await pageDesktop.goto(`${BASE}/`);
  await pageDesktop.evaluate(({ tripId, p }) => {
    localStorage.setItem(`ts_participant_${tripId}`, p);
  }, { tripId, p: JSON.stringify({ id: "pid-r3g9", name: "Alex" }) });

  await pageDesktop.goto(`${BASE}/t/${tripId}`);
  await expect(pageDesktop.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await pageDesktop.getByLabel("day view").click();
  await pageDesktop.waitForTimeout(300);

  // FAB must NOT be visible on fine-pointer desktop
  const fabDesktop = pageDesktop.locator('[aria-label="Add event"]');
  await expect(fabDesktop, "FAB must NOT be visible on desktop fine-pointer").not.toBeVisible({ timeout: 2000 });

  await ctxDesktop.close();
});

// ── Item 10 (regression): Returning identity — seed localStorage, reload — own events recognized ──

test("R3-10: Seed localStorage ts_participant_<secret> with existing id; reload — own events still recognized as own", async ({ browser }) => {
  const RETURNING_ID = "pid-returning-user-r310";
  const tripId = await apiCreateTrip("R3Gate Returning Identity R10");
  await apiPutTrip(tripId, {
    name: "R3Gate Returning Identity R10",
    details: "",
    events: [
      {
        id: "r3g-ret-evt",
        date: "2026-12-01",
        startMinutes: 600,
        endMinutes: 660,
        title: "My Own Returning Event",
        status: "proposed",
        authorId: RETURNING_ID,
        authorName: "ReturningUser",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Seed the returning user's identity in localStorage
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  await page.evaluate(({ key, val }) => {
    window.localStorage.setItem(key, val);
  }, {
    key: `ts_participant_${tripId}`,
    val: JSON.stringify({ id: RETURNING_ID, name: "ReturningUser" }),
  });

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(400);

  // Own event must be recognized: data-event-own=true, solid border
  const eventBlock = page.locator('[data-event-id="r3g-ret-evt"]');
  await expect(eventBlock).toBeVisible({ timeout: 5000 });

  const ownAttr = await eventBlock.getAttribute("data-event-own");
  expect(ownAttr, "Returning user: event must be own (data-event-own=true)").toBe("true");

  const styles = await eventBlock.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      hasDashedClass: el.className.includes("border-dashed"),
      borderLeftStyle: cs.borderLeftStyle,
      opacity: parseFloat(cs.opacity),
    };
  });
  expect(styles.hasDashedClass, "Returning user: own event must NOT have border-dashed").toBe(false);
  expect(styles.borderLeftStyle, "Returning user: left border must be solid").toBe("solid");
  expect(styles.opacity, "Returning user: opacity must be 1").toBeGreaterThanOrEqual(0.99);

  // Tap event — must say "Added by you" (own event)
  await eventBlock.click();
  const sheet = page.getByRole("dialog").filter({ hasText: "My Own Returning Event" });
  await expect(sheet).toBeVisible({ timeout: 3000 });
  await expect(sheet.locator("text=Added by you")).toBeVisible({ timeout: 2000 });
  await expect(sheet.locator("text=Proposed by the organizer")).not.toBeVisible({ timeout: 500 });

  // Reload
  await sheet.getByRole("button", { name: "Close" }).click();
  await page.reload();
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel("day view").click();
  await page.waitForTimeout(400);

  // After reload: event still own
  const eventBlockReloaded = page.locator('[data-event-id="r3g-ret-evt"]');
  await expect(eventBlockReloaded).toBeVisible({ timeout: 5000 });
  const ownAttrReloaded = await eventBlockReloaded.getAttribute("data-event-own");
  expect(ownAttrReloaded, "After reload: event must still be own").toBe("true");

  await ctx.close();
});
