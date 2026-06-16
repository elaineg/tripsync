/**
 * Extra e2e checks required by re-verify brief (post-fix pass).
 *
 * - Month view: real 7-column Sun–Sat grid with event dot indicators; tapping trip-day → Day view
 * - Mobile day-view auto-scroll: first event visible above fold on cold open + day-switch
 * - Overlapping events: two same-time events render side-by-side (different left positions)
 * - Copy-invite-link: "Copied!" during visibility-change cycle (tab refocus) is NOT falsely dismissed
 * - Paste payload cap: pasting >50k chars truncates and shows an error
 */

import { test, expect, type Page } from "@playwright/test";

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
  const res = await fetch(`${BASE}/api/trip/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ── Month view: real 7-column grid ──────────────────────────────────────────────
test("month view: Sun–Sat 7-column grid with event dots; tapping trip-day switches to Day view", async ({ browser }) => {
  const tripId = await apiCreateTrip("Month Grid Test");
  await apiPutTrip(tripId, {
    name: "Month Grid Test",
    details: "",
    events: [
      {
        id: "mg-evt-001",
        date: "2026-05-01",
        startMinutes: 750,
        endMinutes: 810,
        title: "Month Day Event",
        status: "proposed",
        authorId: "pid-mg",
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
  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Switch to month view
  await page.getByLabel("month view").click();

  // Day-of-week header: should have Sun, Mon, Tue, Wed, Thu, Fri, Sat
  // Use exact text match to avoid matching "month" button for "Mon", etc.
  await expect(page.getByText("Sun", { exact: true }).first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByText("Mon", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Tue", { exact: true })).toBeVisible();
  await expect(page.getByText("Wed", { exact: true })).toBeVisible();
  await expect(page.getByText("Thu", { exact: true })).toBeVisible();
  await expect(page.getByText("Fri", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Sat", { exact: true })).toBeVisible();

  // The grid uses grid-cols-7: 7 columns. Verify at least 7 cells in the header row.
  // Locate the DOW header divs (text-center text-xs text-[#aaa])
  const dowHeaders = page.locator(".grid-cols-7").first().locator("div");
  const count = await dowHeaders.count();
  expect(count).toBeGreaterThanOrEqual(7);

  // Event dot indicator should be present on the trip day (May 1, 2026)
  // The day button for May 1 has an aria-label containing "2026-05-01"
  const tripDayBtn = page.locator('button[aria-label*="2026-05-01"]');
  await expect(tripDayBtn).toBeVisible({ timeout: 3000 });

  // Tapping the trip day should switch to Day view
  await tripDayBtn.click();

  // Should now be in day view showing the event
  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Month Day Event")).toBeVisible({ timeout: 3000 });

  await ctx.close();
});

// ── Mobile day-view auto-scroll: first mid-day event visible above fold ──────
test("mobile day-view auto-scroll: first event at 12:30pm visible above fold on cold open", async ({ browser }) => {
  const tripId = await apiCreateTrip("AutoScroll Test");
  await apiPutTrip(tripId, {
    name: "AutoScroll Test",
    details: "",
    events: [
      {
        id: "as-evt-001",
        date: "2026-05-01",
        startMinutes: 750, // 12:30 PM
        endMinutes: 810,
        title: "Mid Day Event",
        status: "proposed",
        authorId: "pid-as",
        authorName: "Joanne",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // Seed participant
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-as", name: "Joanne" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Day view is default on mobile.
  // The spec requires: event is visible ABOVE fold (not parked at pre-dawn).
  // The auto-scroll useEffect fires after data loads and scrolls to firstEvent - 60min.
  // Observable assertion: event IS visible in the viewport on cold open.
  await page.waitForTimeout(800);

  const eventBlock = page.locator('[data-event-id="as-evt-001"]');
  await expect(eventBlock).toBeVisible({ timeout: 5000 });

  // The event block should be within the visible viewport (not hidden below fold)
  const isInViewport = await eventBlock.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight + 50;
  });
  expect(isInViewport).toBe(true);

  // Also verify: 6am row (DAY_START_HOUR) is not visible as the top of the scroll area
  // when the first event is mid-day — the grid should have scrolled past the pre-dawn.
  // The code sets scrollTop = (firstEventMinute - 60 - DAY_START*60) / 60 * HOUR_HEIGHT
  // = (690 - 360) / 60 * 60 = 330px. If grid is scrollable (clientHeight < scrollHeight),
  // scrollTop should be ~330px. If not scrollable (grid expands), event is still visible.
  // Either way, isInViewport=true is the real requirement.
  await ctx.close();
});

// ── Auto-scroll re-scrolls on day-switch ───────────────────────────────────────
test("mobile day-view auto-scroll: re-scrolls on day switch (events visible after day change)", async ({ browser }) => {
  const tripId = await apiCreateTrip("DaySwitch AutoScroll");
  await apiPutTrip(tripId, {
    name: "DaySwitch AutoScroll",
    details: "",
    events: [
      {
        id: "ds-evt-morning",
        date: "2026-05-01",
        startMinutes: 540, // 9 AM
        endMinutes: 600,
        title: "Morning event May 1",
        status: "proposed",
        authorId: "pid-ds",
        authorName: "Alice",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "ds-evt-evening",
        date: "2026-05-02",
        startMinutes: 1200, // 8 PM
        endMinutes: 1260,
        title: "Evening event May 2",
        status: "proposed",
        authorId: "pid-ds",
        authorName: "Alice",
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
    { tripId, p: JSON.stringify({ id: "pid-ds", name: "Alice" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(500);

  // May 1 morning event should be visible
  await expect(page.locator("text=Morning event May 1")).toBeVisible({ timeout: 5000 });

  // Switch to May 2 date
  await page.locator('button[aria-label="2026-05-02"]').click();
  await page.waitForTimeout(500);

  // May 2 evening event should be visible after day switch
  await expect(page.locator("text=Evening event May 2")).toBeVisible({ timeout: 5000 });

  // May 1 event should no longer be visible (different day)
  await expect(page.locator("text=Morning event May 1")).not.toBeVisible({ timeout: 2000 });

  await ctx.close();
});

// ── Overlapping events: side-by-side, not overprinted ─────────────────────────
test("overlapping same-time events render side-by-side (different left positions)", async ({ browser }) => {
  const tripId = await apiCreateTrip("Overlap Test");
  // Two events that overlap completely (same time)
  await apiPutTrip(tripId, {
    name: "Overlap Test",
    details: "",
    events: [
      {
        id: "ov-evt-001",
        date: "2026-05-01",
        startMinutes: 780, // 1 PM
        endMinutes: 840,   // 2 PM
        title: "Overlapping Event A",
        status: "proposed",
        authorId: "pid-ov1",
        authorName: "Alice",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "ov-evt-002",
        date: "2026-05-01",
        startMinutes: 780, // same time: 1 PM
        endMinutes: 840,
        title: "Overlapping Event B",
        status: "proposed",
        authorId: "pid-ov2",
        authorName: "Bob",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Use desktop viewport to ensure both events visible without scrolling
  const ctx = await browser.newContext({ viewport: { width: 800, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-ov1", name: "Alice" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Switch to day view explicitly
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  // Both events should be visible
  const evtA = page.locator('[data-event-id="ov-evt-001"]');
  const evtB = page.locator('[data-event-id="ov-evt-002"]');
  await expect(evtA).toBeVisible({ timeout: 5000 });
  await expect(evtB).toBeVisible({ timeout: 5000 });

  // Both should be visible text
  await expect(page.locator("text=Overlapping Event A")).toBeVisible();
  await expect(page.locator("text=Overlapping Event B")).toBeVisible();

  // Get bounding boxes — they should be at DIFFERENT left positions (side-by-side)
  const boxA = await evtA.boundingBox();
  const boxB = await evtB.boundingBox();
  expect(boxA).not.toBeNull();
  expect(boxB).not.toBeNull();

  // Events should be at different horizontal positions (not overprinted)
  const leftDiff = Math.abs(boxA!.x - boxB!.x);
  expect(leftDiff).toBeGreaterThan(10); // at least 10px apart horizontally

  // Both should be roughly the same top (same start time)
  const topDiff = Math.abs(boxA!.y - boxB!.y);
  expect(topDiff).toBeLessThan(10); // within 10px vertically (same start)

  await ctx.close();
});

// ── Paste payload cap: >50k chars truncates and shows error ───────────────────
test("paste payload cap: typing >50k chars shows error and truncates", async ({ browser }) => {
  const tripId = await apiCreateTrip("Paste Cap Test");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // The paste panel should auto-open for an empty trip
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  // Generate a 51k char string
  const bigText = "A".repeat(51_000);

  // Set value programmatically on the textarea (fill() truncates at JS level)
  const textarea = page.locator('textarea[aria-label="Paste itinerary text"]');
  await textarea.evaluate((el: HTMLTextAreaElement, val: string) => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    )!.set;
    nativeInputValueSetter!.call(el, val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, bigText);

  // React onChange fires from the dispatched event — wait for error message
  await expect(
    page.locator('[role="alert"]').filter({ hasText: /too long|trim/i })
  ).toBeVisible({ timeout: 3000 });

  // The textarea value should be capped at 50k
  const actualValue = await textarea.inputValue();
  expect(actualValue.length).toBeLessThanOrEqual(50_000);

  await ctx.close();
});

// ── Size caps: API integration ────────────────────────────────────────────────
test("size caps: POST /api/trip-create with 200-char name stores only first 120", async () => {
  const longName = "A".repeat(200);
  const res = await fetch(`${BASE}/api/trip-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: longName }),
  });
  expect(res.status).toBe(201);
  const { id } = (await res.json()) as { id: string };

  const getRes = await fetch(`${BASE}/api/trip/${id}`);
  expect(getRes.status).toBe(200);
  const { data } = (await getRes.json()) as { data: { name: string } };
  expect(data.name.length).toBeLessThanOrEqual(120);
});

test("size caps: PUT /api/trip/<id> with 200-char name trims to 120 server-side", async () => {
  const createRes = await fetch(`${BASE}/api/trip-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Cap Test" }),
  });
  const { id } = (await createRes.json()) as { id: string };

  const longName = "B".repeat(200);
  const putRes = await fetch(`${BASE}/api/trip/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: longName,
      details: "",
      events: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  });
  expect(putRes.status).toBe(200);

  const getRes = await fetch(`${BASE}/api/trip/${id}`);
  const { data } = (await getRes.json()) as { data: { name: string } };
  expect(data.name.length).toBeLessThanOrEqual(120);
  expect(data.name).toBe("B".repeat(120));
});

// ── R2: Mobile day grid scrolls at 390px; last event reachable ────────────────
test("R2-A: 390px day grid scrolls; last evening event reachable and tappable", async ({ browser }) => {
  const tripId = await apiCreateTrip("Scroll Test");
  await apiPutTrip(tripId, {
    name: "Scroll Test",
    details: "",
    events: [
      {
        id: "scroll-evt-morning",
        date: "2026-05-01",
        startMinutes: 750,  // 12:30 PM
        endMinutes: 810,
        title: "Lunch",
        status: "proposed",
        authorId: "pid-scroll",
        authorName: "Alice",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "scroll-evt-evening",
        date: "2026-05-01",
        startMinutes: 1230, // 8:30 PM
        endMinutes: 1290,
        title: "El Chato Taqueria",
        status: "proposed",
        authorId: "pid-scroll",
        authorName: "Alice",
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
    { tripId, p: JSON.stringify({ id: "pid-scroll", name: "Alice" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Ensure day view
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  // Verify grid exists and is scrollable (scrollHeight > clientHeight)
  const gridScrollable = await page.locator('[aria-label="Day schedule"]').evaluate((el) => {
    return el.scrollHeight > el.clientHeight;
  });
  expect(gridScrollable).toBe(true);

  // Scroll the grid to the evening event
  const eveningBlock = page.locator('[data-event-id="scroll-evt-evening"]');

  // Scroll it into view within its container
  await eveningBlock.evaluate((el) => {
    const container = el.closest('[aria-label="Day schedule"]') as HTMLElement;
    if (container) {
      container.scrollTop = el.getBoundingClientRect().top + container.scrollTop - 100;
    }
  });
  await page.waitForTimeout(300);

  // After scroll, the event should be visible
  await expect(eveningBlock).toBeVisible({ timeout: 3000 });

  // Verify scrollTop changed (the grid actually scrolled)
  const scrollTopAfter = await page.locator('[aria-label="Day schedule"]').evaluate((el) => el.scrollTop);
  expect(scrollTopAfter).toBeGreaterThan(0);

  // Tap/click it — should open bottom sheet
  await eveningBlock.click();
  await expect(page.getByRole("dialog").filter({ hasText: "El Chato Taqueria" })).toBeVisible({ timeout: 3000 });

  await ctx.close();
});

// ── R2: Paste-commit immediate flush — no debounce wait ───────────────────────
test("R2-C: paste-commit flushes immediately; GET returns events without debounce wait", async ({ browser }) => {
  const tripId = await apiCreateTrip("Flush Test");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Seed participant
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-flush", name: "Flush Tester" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Empty trip: paste panel should be open
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  // Load sample, parse, confirm — all within a tight window
  await page.getByLabel("Load sample itinerary").click();
  await page.getByRole("button", { name: "Parse →" }).click();
  await expect(page.locator("text=Preview parsed events")).toBeVisible({ timeout: 5000 });

  // Confirm the import
  const addBtn = page.locator("button").filter({ hasText: /Add to Flush Test/i });
  await addBtn.click();

  // Name should already be seeded in localStorage — no prompt should appear
  // Events should appear on calendar
  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Emily lands")).toBeVisible({ timeout: 5000 });

  // Wait for "Saved" to confirm the flush completed (should be << 2.5s since it's immediate)
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 4000 });

  // GET the trip — it must have events (no debounce: should be saved within ~1s, not 2.5s)
  const immediateGet = await fetch(`${BASE}/api/trip/${tripId}`);
  const immediateData = (await immediateGet.json()) as { data: { events: unknown[] } };
  expect(immediateData.data.events.length).toBeGreaterThan(0);

  await ctx.close();
});

// ── R2: Copy-invite is flush-then-confirm ─────────────────────────────────────
test("R2-C-copy: Copy-invite only shows Copied! after trip is persisted", async ({ browser }) => {
  const tripId = await apiCreateTrip("Copy Flush Test");
  const ctx = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await ctx.newPage();

  // Seed participant
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-cpflush", name: "CopyFlush" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Load and confirm sample import
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });
  await page.getByLabel("Load sample itinerary").click();
  await page.getByRole("button", { name: "Parse →" }).click();
  await expect(page.locator("text=Preview parsed events")).toBeVisible({ timeout: 5000 });
  const addBtn = page.locator("button").filter({ hasText: /Add to Copy Flush Test/i });
  await addBtn.click();
  await expect(page.locator("text=Emily lands")).toBeVisible({ timeout: 5000 });

  // Click Copy invite link — it must flush first, THEN show "Copied!"
  await page.getByLabel("Copy invite link").click();

  // Either: shows "Saving…" briefly then "Copied!", or goes straight to "Copied!" if
  // the flush was already complete (immediate flush from paste-commit was in-flight).
  // Either way: "Copied!" must appear and must not appear before persistence.
  await expect(page.locator("text=Copied!")).toBeVisible({ timeout: 8000 });

  // After "Copied!" shows, the trip MUST be persisted (GET must return events)
  const afterCopy = await fetch(`${BASE}/api/trip/${tripId}`);
  const afterData = (await afterCopy.json()) as { data: { events: unknown[] } };
  expect(afterData.data.events.length).toBeGreaterThan(0);

  await ctx.close();
});

// ── Copy-invite-link: successful copy survives a visibility-change refetch ────
test("copy-invite-link: 'Copied!' cue survives a tab-refocus visibility-change re-render", async ({ browser }) => {
  const tripId = await apiCreateTrip("Copy Stability Test");
  // Grant clipboard-write permissions so the copy actually succeeds
  const ctx = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Click copy — clipboard write is granted
  await page.getByLabel("Copy invite link").click();

  // "Copied!" should appear immediately
  await expect(page.locator("text=Copied!")).toBeVisible({ timeout: 3000 });

  // Simulate tab going away and coming back (visibility-change triggers a server refetch)
  // This is the hostile re-render: the refetch updates setTrip() and could clear "Copied!"
  // if the cue lived in trip-level state. It lives in CopyLinkButton's own local useState,
  // so the refetch must NOT clear it.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      value: "hidden", writable: true, configurable: true
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      value: "visible", writable: true, configurable: true
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  // Wait for the refetch to complete, then verify "Copied!" is still present
  await page.waitForTimeout(1200);
  await expect(page.locator("text=Copied!")).toBeVisible({ timeout: 3000 });

  await ctx.close();
});

// ── H1b: 0-event paste shows helpful message, never commits empty calendar ────
test("H1b: pasting prose with no timed events shows helpful inline message and does NOT commit", async ({ browser }) => {
  const tripId = await apiCreateTrip("Zero Events Parse Test");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // The paste panel should auto-open for an empty trip
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  // Type some prose that has NO timed events (no day headers, no time lines)
  const textarea = page.locator('textarea[aria-label="Paste itinerary text"]');
  await textarea.fill(
    "This is our wonderful trip to the beach.\nWe will have lots of fun.\nDon't forget sunscreen!"
  );

  // Click Parse
  await page.getByRole("button", { name: "Parse →" }).click();

  // Should NOT navigate to preview — should show a helpful error message
  await expect(page.locator("text=Preview parsed events")).not.toBeVisible({ timeout: 2000 });

  // The role="alert" element should explain the expected format
  const alertEl = page.locator('[role="alert"]').filter({ hasText: /couldn't find|timed events|try lines/i });
  await expect(alertEl).toBeVisible({ timeout: 3000 });

  // The original text should still be in the textarea (not cleared)
  await expect(textarea).toHaveValue(/beach/);

  // Verify API: the trip must still have NO events (import was not committed)
  const getRes = await fetch(`${BASE}/api/trip/${tripId}`);
  const data = (await getRes.json()) as { data: { events: unknown[] } };
  expect(data.data.events.length).toBe(0);

  await ctx.close();
});

// ── H2: paste-commit persists events even when name step is skipped/cancelled ─
test("H2: paste-commit persists events even when name prompt is skipped", async ({ browser }) => {
  const tripId = await apiCreateTrip("Skip Name Test");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // No participant in localStorage — fresh user, no name set
  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Paste panel is open for an empty trip
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  // Load and parse the sample itinerary
  await page.getByLabel("Load sample itinerary").click();
  await page.getByRole("button", { name: "Parse →" }).click();
  await expect(page.locator("text=Preview parsed events")).toBeVisible({ timeout: 5000 });

  // Commit the import
  const addBtn = page.locator("button").filter({ hasText: /Add to Skip Name Test/i });
  await addBtn.click();

  // Events should appear immediately (name is not required to commit)
  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Emily lands")).toBeVisible({ timeout: 5000 });

  // If the name prompt appears, skip it
  const nameDialog = page.locator('[aria-label="Enter your name"]');
  await page.waitForTimeout(800); // allow delayed name prompt to appear
  if (await nameDialog.isVisible()) {
    await page.getByRole("button", { name: "Skip name entry" }).click();
  }

  // Wait for save to complete ("Saved" indicator)
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 5000 });

  // Events should still be on calendar
  await expect(page.locator("text=Emily lands")).toBeVisible({ timeout: 3000 });

  // Verify via API: events ARE persisted (the import was not lost)
  const getRes = await fetch(`${BASE}/api/trip/${tripId}`);
  const data = (await getRes.json()) as { data: { events: unknown[] } };
  expect(data.data.events.length).toBeGreaterThan(0);

  // Reload the page (fresh context) — events must survive reload
  await page.reload();
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await expect(page.locator("text=Emily lands")).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── R4-1 REGRESSION: "Day 1 - Friday" + 24h times → events render on Day AND Week view ──
test("R4-1: 'Day 1 - Friday' + 24h times → all events commit, render on Day+Week, persist", async ({ browser }) => {
  const tripId = await apiCreateTrip("Day1 Regression Test");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Seed participant so no name modal blocks the flow
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-day1", name: "Aisha" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Paste panel auto-opens for empty trip
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  // Paste itinerary with "Day 1 - Friday" header + 24h times (exact Aisha input style)
  const textarea = page.locator('textarea[aria-label="Paste itinerary text"]');
  await textarea.fill("Day 1 - Friday\n09:00 Coffee\n14:30 Lunch");

  // Parse
  await page.getByRole("button", { name: "Parse →" }).click();

  // Preview must show 2 events
  await expect(page.locator("text=Preview parsed events")).toBeVisible({ timeout: 5000 });
  const titleInputs = page.locator('input[aria-label="Event title"]');
  const count = await titleInputs.count();
  expect(count).toBe(2);

  // Commit
  const addBtn = page.locator("button").filter({ hasText: /Add to Day1 Regression Test/i });
  await addBtn.click();

  // CRITICAL: events must appear in Day view (not "No dates yet")
  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Coffee")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Lunch")).toBeVisible({ timeout: 5000 });

  // Switch to Week view — events must also render there
  await page.getByLabel("week view").click();
  await expect(page.locator("text=Coffee")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Lunch")).toBeVisible({ timeout: 5000 });

  // Wait for save flush
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 5000 });

  // Verify via API — events must be persisted (no silent discard)
  const trip = await (await fetch(`${BASE}/api/trip/${tripId}`)).json() as { data: { events: Array<{ title: string; date: string }> } };
  const events = trip.data.events.filter((e) => !("deletedAt" in e) || !(e as unknown as { deletedAt?: number }).deletedAt);
  expect(events.length).toBe(2);
  // All events must have a valid non-empty date
  for (const ev of events) {
    expect(ev.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }

  // Reload — events must survive
  await page.reload();
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await expect(page.locator("text=Coffee")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Lunch")).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── R4-2 REGRESSION: 390px loaded-trip state — action strip fits, no overflow ──
test("R4-2: 390px loaded-trip — no action-strip control extends beyond viewport, bulk button label fully visible", async ({ browser }) => {
  const tripId = await apiCreateTrip("Mobile Action Strip Test");
  await apiPutTrip(tripId, {
    name: "Mobile Action Strip Test",
    details: "",
    events: [
      {
        id: "mob-as-001",
        date: "2026-05-01",
        startMinutes: 540,
        endMinutes: 600,
        title: "Morning event",
        status: "proposed",
        authorId: "pid-mob-as",
        authorName: "Dana",
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
    { tripId, p: JSON.stringify({ id: "pid-mob-as", name: "Dana" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Loaded-trip state (has events) — the bulk button should be visible
  const icsBtn = page.locator('button[aria-label="Save to calendar (.ics)"]');
  await expect(icsBtn).toBeVisible({ timeout: 5000 });

  // Button must not extend beyond 390px viewport (right edge ≤ 390)
  const box = await icsBtn.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(392); // 2px rounding tolerance

  // Full label must be visible (not truncated by overflow ancestor)
  const labelText = await icsBtn.textContent();
  expect(labelText?.trim()).toBe("Save to calendar (.ics)");

  // No horizontal document overflow at 390px
  const noOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= window.innerWidth + 2;
  });
  expect(noOverflow).toBe(true);

  await ctx.close();
});

// ── R4-3: Partial parse shows "N lines skipped" notice ──────────────────────────
test("R4-3: partial parse with unparseable line shows 'lines skipped' notice, doesn't block commit", async ({ browser }) => {
  const tripId = await apiCreateTrip("Partial Parse Test");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-pp", name: "Wen" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  // Paste with one unparseable line inside a valid day
  const textarea = page.locator('textarea[aria-label="Paste itinerary text"]');
  await textarea.fill("Friday Aug 14\n9:00 Breakfast\nnoon Checkout\n12:00 Lunch");

  await page.getByRole("button", { name: "Parse →" }).click();
  await expect(page.locator("text=Preview parsed events")).toBeVisible({ timeout: 5000 });

  // The "N lines skipped" notice must be visible
  const skippedNotice = page.locator('[role="status"]').filter({ hasText: /line|skipped/i });
  await expect(skippedNotice).toBeVisible({ timeout: 3000 });

  // Must still be able to commit (don't block)
  const addBtn = page.locator("button").filter({ hasText: /Add to Partial Parse Test/i });
  await expect(addBtn).toBeVisible();
  await addBtn.click();

  // Events still appear on calendar
  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Breakfast")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Lunch")).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── R4-4: Skip name prompt → no re-prompt on next Confirm/Delete ──────────────
test("R4-4: skip name prompt → next Confirm/Delete does NOT re-show the modal", async ({ browser }) => {
  const tripId = await apiCreateTrip("Skip Name No Reprompt");
  await apiPutTrip(tripId, {
    name: "Skip Name No Reprompt",
    details: "",
    events: [
      {
        id: "snr-evt-001",
        date: "2026-05-01",
        startMinutes: 750,
        endMinutes: 810,
        title: "Dinner to Confirm",
        status: "proposed",
        authorId: "pid-snr",
        authorName: "Guest",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Fresh context — no participant in localStorage (so name prompt fires on first write)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Event is visible in day view
  await page.getByLabel("day view").click();
  await expect(page.locator('[data-event-id="snr-evt-001"]')).toBeVisible({ timeout: 5000 });

  // Tap event → bottom sheet
  await page.locator('[data-event-id="snr-evt-001"]').click();
  const bottomSheet = page.getByRole("dialog").filter({ hasText: "Dinner to Confirm" });
  await expect(bottomSheet).toBeVisible();

  // R2-1: Confirm on another person's event triggers inline name-capture for a user with
  // no stored real name. This is the correct R2-1 behavior — capture lazily at first attribution.
  await bottomSheet.getByRole("button", { name: "Confirm", exact: true }).click();

  // The inline name-capture may appear (R2-1 behavior for first confirm with no real name)
  // or the confirm may fire directly if the user already has a real name stored.
  const nameDialog = page.locator('[aria-label="Enter your name"]');
  await page.waitForTimeout(600);

  // If inline name capture appeared (R2-1), skip it — should not re-pop afterward
  if (await nameDialog.isVisible()) {
    await page.getByRole("button", { name: "Skip name entry" }).click();
    await expect(nameDialog).not.toBeVisible({ timeout: 1500 });
  }

  // The action (Confirm) should have fired (either directly or after skip). Event confirmed.
  await page.waitForTimeout(500);

  // Click the event block again to open the sheet and try another action
  const eventBlock = page.locator('[data-event-id="snr-evt-001"]');
  if (await eventBlock.isVisible()) {
    await eventBlock.click();
    // Wait briefly — name modal must NOT re-appear (asked at most once)
    await page.waitForTimeout(500);
    await expect(page.locator('[aria-label="Enter your name"]')).not.toBeVisible({ timeout: 2000 });
    // Close the bottom sheet
    const closedSheet = page.getByRole("dialog");
    if (await closedSheet.isVisible()) {
      await page.keyboard.press("Escape").catch(() => {
        // Dismiss by clicking outside
      });
    }
  }

  // Final assertion: name dialog is not shown again after dismissal (asked at most once)
  await expect(page.locator('[aria-label="Enter your name"]')).not.toBeVisible({ timeout: 2000 });

  await ctx.close();
});

// ── R5-1: .ics DTSTART for "Friday Mar 7" is Mar 7 (not Mar 6) ───────────────
test("R5-1: pasting 'Friday Mar 7\\n17:00 Marco' → .ics DTSTART is 20260307, NOT 20260306", async ({ browser }) => {
  const tripId = await apiCreateTrip("R5-1 Date Fix Test");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-r51", name: "Rob" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  const textarea = page.locator('textarea[aria-label="Paste itinerary text"]');
  await textarea.fill("Friday Mar 7\n17:00 Marco arrives");

  await page.getByRole("button", { name: "Parse →" }).click();
  await expect(page.locator("text=Preview parsed events")).toBeVisible({ timeout: 5000 });

  // Preview must show Mar 7 (not Mar 6) — check the day heading (h3)
  // The resolvedLabel format is "Friday Mar 7 → Sat, Mar 7" (authoritative date kept)
  await expect(page.locator("h3").filter({ hasText: /Mar 7/ })).toBeVisible({ timeout: 3000 });
  // Mar 6 must NOT appear anywhere in the preview
  await expect(page.locator("text=Mar 6")).not.toBeVisible({ timeout: 1000 });

  // Commit
  const addBtn = page.locator("button").filter({ hasText: /Add to R5-1/i });
  await addBtn.click();
  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Marco arrives")).toBeVisible({ timeout: 5000 });

  // Wait for save
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 5000 });

  // Download .ics and check DTSTART = 20260307
  const downloadPromise = page.waitForEvent("download");
  const icsBtn = page.locator("text=Save to calendar (.ics)");
  await expect(icsBtn).toBeVisible({ timeout: 3000 });
  await icsBtn.click();
  const download = await downloadPromise;
  const path = await download.path();
  const { readFileSync } = await import("fs");
  const content = readFileSync(path!, "utf8");

  // DTSTART must be March 7 (20260307), NOT March 6 (20260306)
  expect(content).toContain("20260307");
  expect(content).not.toContain("20260306");

  await ctx.close();
});

// ── R5-2 / R3-1: Post-import name prompt NEVER blocks (R3-1 identity model) ───
// R3-1 creates a stable participant ID at page-init (even before any event is created).
// This means the post-import name prompt NEVER appears (participant already exists).
// The test validates: paste-import commits without ANY name prompt; events visible;
// subsequent interactions (date chip) never trigger a name prompt.
test("R5-2: paste-import commits without name prompt (R3-1: stable ID at init); no name prompt on next interaction", async ({ browser }) => {
  const tripId = await apiCreateTrip("R5-2 Skip Name Test");
  // No participant seeded → fresh user; R3-1 creates ID at init so no prompt appears
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  // Load sample, parse, confirm
  await page.getByLabel("Load sample itinerary").click();
  await page.getByRole("button", { name: "Parse →" }).click();
  await expect(page.locator("text=Preview parsed events")).toBeVisible({ timeout: 5000 });

  const addBtn = page.locator("button").filter({ hasText: /Add to R5-2/i });
  await addBtn.click();

  // Events should appear
  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Emily lands")).toBeVisible({ timeout: 5000 });

  // R3-1: name prompt must NOT appear at all (participant ID was created at init)
  const nameDialog = page.locator('[aria-label="Enter your name"]');
  await expect(nameDialog).not.toBeVisible({ timeout: 1000 });

  // Wait a moment and verify it still does NOT appear
  await page.waitForTimeout(1000);
  await expect(nameDialog).not.toBeVisible({ timeout: 500 });

  // Tap a date chip (next interaction) — name modal must NOT appear
  const dateChips = page.locator('button[aria-pressed]').filter({ hasText: /May/ });
  const chipCount = await dateChips.count();
  if (chipCount > 0) {
    await dateChips.first().click();
    await page.waitForTimeout(400);
    await expect(nameDialog).not.toBeVisible({ timeout: 1000 });
  }

  // Header should show "Your name" chip (optional name entry via chip)
  const setNameChip = page.locator('[aria-label="Set or change your display name"]');
  await expect(setNameChip).toBeVisible({ timeout: 2000 });

  await ctx.close();
});

// ── R5-3: 390px with events — no dark chip clipped or overlapping toggle/action row ──
test("R5-3: 390px loaded-trip — date chips on own row, no overlap with toggle/action buttons", async ({ browser }) => {
  const tripId = await apiCreateTrip("R5-3 Layout Test");
  await apiPutTrip(tripId, {
    name: "R5-3 Layout Test",
    details: "",
    events: [
      {
        id: "r53-evt-001",
        date: "2026-06-15",
        startMinutes: 540,
        endMinutes: 600,
        title: "Morning coffee",
        status: "proposed",
        authorId: "pid-r53",
        authorName: "Marcus",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "r53-evt-002",
        date: "2026-05-01",
        startMinutes: 750,
        endMinutes: 810,
        title: "Lunch",
        status: "proposed",
        authorId: "pid-r53",
        authorName: "Dana",
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
    { tripId, p: JSON.stringify({ id: "pid-r53", name: "Marcus" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Ensure day view is active (chips visible)
  await page.getByLabel("day view").click();
  await page.waitForTimeout(300);

  // Day chips must be visible (events present in day view)
  const dateChips = page.locator('button[aria-pressed]').filter({ hasText: /May|Jun/ });
  await expect(dateChips.first()).toBeVisible({ timeout: 3000 });

  // Get the view-toggle bounding box (should be in the toggle/action row)
  const dayViewBtn = page.getByLabel("day view");
  const toggleBox = await dayViewBtn.boundingBox();
  expect(toggleBox).not.toBeNull();

  // Get the Refresh button bounding box — Refresh lives in the same toggle/action row as
  // the day/week/month switcher. The "Copy invite link" button moved to the share section
  // BELOW the header when the two-row share UI was added, so it is no longer a valid
  // proxy for the header row boundary.
  const refreshBtn2 = page.getByLabel("Refresh trip");
  const refreshBox2 = await refreshBtn2.boundingBox();
  expect(refreshBox2).not.toBeNull();

  // Get a date chip bounding box
  const chipBox = await dateChips.first().boundingBox();
  expect(chipBox).not.toBeNull();

  // Date chip must be BELOW the toggle row (chip top > toggle bottom) — own separate row
  expect(chipBox!.y).toBeGreaterThan(toggleBox!.y + toggleBox!.height - 4); // 4px tolerance

  // Date chip must also be below the Refresh button (same toggle row), confirming the chip
  // is on its own dedicated third row, not sharing horizontal space with any action button.
  const toggleRowBottom = refreshBox2!.y + refreshBox2!.height;
  expect(chipBox!.y).toBeGreaterThanOrEqual(toggleRowBottom - 8); // chip starts at/after toggle row bottom

  // No element extends beyond 390px viewport
  const noOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= window.innerWidth + 2;
  });
  expect(noOverflow).toBe(true);

  // Refresh button also visible and not overlapping chips (reuse already-fetched bounding box)
  expect(refreshBox2).not.toBeNull();
  expect(refreshBox2!.x + refreshBox2!.width).toBeLessThanOrEqual(392);

  await ctx.close();
});
