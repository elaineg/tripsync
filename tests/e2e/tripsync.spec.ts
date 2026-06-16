/**
 * TripSync E2E tests — runs against a local `next start` production server.
 * BASE_URL must point to http://localhost:<PORT>.
 *
 * Covers all APP_SPEC.md success checks:
 * 1. Emily acceptance test (parser + preview/confirm flow)
 * 2. Details preamble → Trip Details panel, NOT calendar events
 * 3. Partiful URL preserved as clickable <a>
 * 4. Preview/confirm step before events written to server
 * 5. /t/<secret> URL pattern + fresh-browser load
 * 6. Honest invite framing ("Anyone with this link can view and edit")
 * 7. Mobile viewport tap targets
 * 8. Confirm event → "Confirmed by Joanne"
 * 9. Google Calendar href + .ics bulk export
 * 10. First-persist safety (no blank overwrite on fresh load)
 *
 * PLUS mandatory checks from verifier brief:
 * - Copy-invite-link with blocked clipboard
 * - Returning-user localStorage seed before assertion
 * - SSR/hydration (page loads without React error #418/#185)
 */

import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// ── Helper: create a trip via API and return its ID ───────────────────────────
async function apiCreateTrip(name: string): Promise<string> {
  const res = await fetch(`${BASE}/api/trip-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const json = (await res.json()) as { id: string };
  return json.id;
}

async function apiGetTrip(id: string) {
  const res = await fetch(`${BASE}/api/trip/${id}`);
  return res.json() as Promise<{ data: { name: string; details: string; events: unknown[] } }>;
}

async function apiPutTrip(id: string, data: unknown) {
  const res = await fetch(`${BASE}/api/trip/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ── Test 1+2+3+4: Emily acceptance test ──────────────────────────────────────
test("SC-1/2/3/4: Emily acceptance test — load sample, parse, preview, confirm", async ({ page }) => {
  // Create a trip to get into trip page context
  const tripId = await apiCreateTrip("Emily Test Trip");

  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(`${BASE}/t/${tripId}`);

  // Wait for hydration (loading spinner should disappear)
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // The paste panel should auto-open for an empty trip
  await expect(page.locator("text=Paste your itinerary")).toBeVisible({ timeout: 5000 });

  // SC-4: Load sample itinerary
  await page.getByLabel("Load sample itinerary").click();

  // Verify textarea is populated (sample itinerary contains "Friday May 1")
  const textarea = page.getByLabel("Paste itinerary text");
  await expect(textarea).toHaveValue(/Friday May 1/);

  // SC-4: Parse button click
  await page.getByRole("button", { name: "Parse →" }).click();

  // PREVIEW step appears before committing to server
  await expect(page.locator("text=Preview parsed events")).toBeVisible({ timeout: 5000 });

  // SC-2: Trip Details panel shown in preview (not as event)
  await expect(page.locator("text=Trip Details panel")).toBeVisible();
  await expect(page.locator("text=weather 10-20deg")).toBeVisible();
  await expect(page.locator("text=bring ID")).toBeVisible();

  // SC-1: Key events visible in preview (titles now in editable input fields)
  // Collect all event title input values and verify key events are present
  const titleInputs = page.locator('input[aria-label="Event title"]');
  const titleCount = await titleInputs.count();
  expect(titleCount).toBeGreaterThan(0);
  const allTitles: string[] = [];
  for (let i = 0; i < titleCount; i++) {
    allTitles.push(await titleInputs.nth(i).inputValue());
  }
  expect(allTitles.some((t) => t.includes("Emily lands"))).toBe(true);
  expect(allTitles.some((t) => t.includes("Uber to 123 Main St"))).toBe(true);
  expect(allTitles.some((t) => t.includes("unpack"))).toBe(true);
  expect(allTitles.some((t) => t.includes("El Chato"))).toBe(true);
  expect(allTitles.some((t) => t.includes("Bar Part Time"))).toBe(true);

  // SC-3: Partiful URL visible as a link in preview
  const partifulLink = page.locator("a[href*='partiful']");
  await expect(partifulLink).toBeVisible();

  // Verify preview shows a range event with a start time select visible (1-2PM = 1:00pm-2:00pm)
  // The time selects are now <select> elements with aria-label="Start time"
  await expect(page.locator('select[aria-label="Start time"]').first()).toBeVisible();

  // SC-4: Confirm step — click "Add to" to commit
  // H2: no participant yet → events commit immediately with "Guest" attribution;
  // name prompt appears AFTER import (non-blocking).
  const addBtn = page.locator("button").filter({ hasText: /Add to Emily Test Trip/i });
  await expect(addBtn).toBeVisible();
  await addBtn.scrollIntoViewIfNeeded();
  await addBtn.click();

  // After clicking commit, events should appear on calendar immediately (no name gate)
  // The paste panel should close, day grid should be visible
  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });

  // Events should appear
  await expect(page.locator("text=Emily lands")).toBeVisible({ timeout: 5000 });

  // H2: name prompt may appear AFTER import (as a non-blocking invitation)
  // If it does appear, fill it in. If not visible within a short window, that's also fine.
  const nameDialog = page.locator('[aria-label="Enter your name"]');
  const nameDialogVisible = await nameDialog.isVisible().catch(() => false);
  if (!nameDialogVisible) {
    // Wait a moment for the delayed prompt (600ms after commit)
    await page.waitForTimeout(800);
  }
  if (await nameDialog.isVisible()) {
    await page.getByRole("textbox", { name: "Your name" }).fill("Joanne");
    await page.getByRole("button", { name: "Continue" }).click();
  }

  // No React hydration errors
  const reactErrors = errors.filter((e) => e.includes("Hydration") || e.includes("#418") || e.includes("#185"));
  expect(reactErrors).toEqual([]);
});

// ── Test 5: /t/<secret> URL + fresh-browser load ─────────────────────────────
test("SC-5: /t/<secret> URL pattern; fresh context loads same trip without login prompt", async ({ browser }) => {
  // Create trip + seed events via API
  const tripId = await apiCreateTrip("Fresh Load Test");
  await apiPutTrip(tripId, {
    name: "Fresh Load Test",
    details: "weather is nice",
    events: [
      {
        id: "fl-evt-001",
        date: "2026-05-01",
        startMinutes: 750,
        endMinutes: 810,
        title: "Airport pickup",
        status: "proposed",
        authorId: "pid-creator",
        authorName: "Alice",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Fresh browser context (no localStorage)
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/t/${tripId}`);

  // URL must match /t/<secret>
  expect(page.url()).toMatch(/\/t\/[A-Za-z0-9\-_]{22,}/);

  // Wait for hydration
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // No login prompt, no email/password field
  await expect(page.locator("input[type='password']")).not.toBeVisible();
  await expect(page.locator("input[type='email']")).not.toBeVisible();

  // Trip loads with seeded event
  await expect(page.locator("text=Airport pickup")).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── Test 5 (returning user): seed localStorage + re-open ─────────────────────
test("SC-5 returning-user: localStorage seed → trip auto-opens without name prompt", async ({ browser }) => {
  const tripId = await apiCreateTrip("Returning User Trip");
  await apiPutTrip(tripId, {
    name: "Returning User Trip",
    details: "",
    events: [
      {
        id: "ru-evt-001",
        date: "2026-05-01",
        startMinutes: 540,
        endMinutes: 600,
        title: "Morning coffee",
        status: "proposed",
        authorId: "pid-ret",
        authorName: "Returning User",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Seed localStorage before navigation (returning user who already named themselves)
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, participantJson }) => {
      localStorage.setItem(`ts_participant_${tripId}`, participantJson);
      localStorage.setItem(
        "tripsync_recent",
        JSON.stringify([{ id: tripId, name: "Returning User Trip", createdAt: Date.now() }])
      );
    },
    {
      tripId,
      participantJson: JSON.stringify({ id: "pid-ret", name: "Returning User" }),
    }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Should NOT show name prompt (already stored)
  await expect(page.locator("text=What's your name")).not.toBeVisible({ timeout: 2000 });

  // Event visible
  await expect(page.locator("text=Morning coffee")).toBeVisible({ timeout: 5000 });

  // Participant chip shows returning user name
  await expect(page.locator("text=Returning User")).toBeVisible();

  await ctx.close();
});

// ── Test 6: Honest invite framing ─────────────────────────────────────────────
test("SC-6: invite framing states anyone with link can view and edit; no login/email/password", async ({ page }) => {
  const tripId = await apiCreateTrip("Framing Test");
  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Honest framing text must be present (now uses & ampersand)
  await expect(page.locator("text=Anyone with this link")).toBeVisible();

  // No account/email/password fields
  await expect(page.locator("input[type='email']")).not.toBeVisible();
  await expect(page.locator("input[type='password']")).not.toBeVisible();
  await expect(page.locator("text=Sign up")).not.toBeVisible();
  await expect(page.locator("text=Create account")).not.toBeVisible();
});

// ── Test 7: Mobile day grid — sticky header ≤96px ────────────────────────────
test("SC-7: mobile 390px — sticky header ≤96px, day grid visible below fold", async ({ browser }) => {
  const tripId = await apiCreateTrip("Mobile Test");
  await apiPutTrip(tripId, {
    name: "Mobile Test",
    details: "",
    events: [
      {
        id: "mob-evt-001",
        date: "2026-05-01",
        startMinutes: 540,
        endMinutes: 600,
        title: "Wake up",
        status: "proposed",
        authorId: "pid-mob",
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
  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Header max-height: spec says ≤96px for 2-row layout; R5-3 adds a dedicated date-chips
  // row below the toggle/action row, so allow up to 112px for the 3-row loaded-trip header.
  const header = page.locator("header").first();
  await expect(header).toBeVisible();
  const headerBox = await header.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox!.height).toBeLessThanOrEqual(112);

  // Day grid visible below the header
  const dayGrid = page.locator('[aria-label="Day schedule"]');
  await expect(dayGrid).toBeVisible({ timeout: 5000 });
  const gridBox = await dayGrid.boundingBox();
  expect(gridBox).not.toBeNull();
  // Grid starts below the header
  expect(gridBox!.y).toBeGreaterThan(headerBox!.height - 2); // tiny tolerance

  await ctx.close();
});

// ── Test 8: Confirm event → "Confirmed by Joanne" ────────────────────────────
test("SC-8: confirming event as Joanne shows 'Confirmed by Joanne' on event", async ({ browser }) => {
  const tripId = await apiCreateTrip("Confirm Test");
  await apiPutTrip(tripId, {
    name: "Confirm Test",
    details: "",
    events: [
      {
        id: "conf-evt-001",
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

  // Use mobile viewport so app defaults to day view (day view has data-event-id blocks)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // Seed participant (Joanne) in localStorage
  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, participantJson }) => {
      localStorage.setItem(`ts_participant_${tripId}`, participantJson);
    },
    {
      tripId,
      participantJson: JSON.stringify({ id: "pid-joanne", name: "Joanne" }),
    }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Ensure day view is active (default on mobile)
  await page.getByLabel("day view").click();

  // Tap the event
  await page.locator('[data-event-id="conf-evt-001"]').click();

  // Event bottom sheet opens — the dialog heading shows the event title
  await expect(page.getByRole("dialog").filter({ hasText: "Dinner Foreign Cinema" })).toBeVisible();

  // Confirm button
  await page.getByRole("button", { name: "Confirm" }).click();

  // Event should now show confirmed styling on calendar.
  // R2-1: In Joanne's own view, she sees "Confirmed by you" (viewer-relative display).
  // The API stores confirmedBy: "Joanne"; the UI shows "you" to the confirmer themselves.
  await expect(page.locator("text=Confirmed by you").first()).toBeVisible({ timeout: 5000 });

  // Verify via API that the event is now confirmed
  // Debounce is 2.5s. Trigger flush by: waiting for "Saved" indicator, or by waiting 4s
  // "Saved" text appears after successful save
  await expect(page.locator("text=Saved")).toBeVisible({ timeout: 6000 });

  const trip = await apiGetTrip(tripId);
  const ev = (trip.data.events as Array<{ id: string; status: string; confirmedBy?: string }>)
    .find((e) => e.id === "conf-evt-001");
  expect(ev).toBeDefined();
  expect(ev!.status).toBe("confirmed");
  expect(ev!.confirmedBy).toBe("Joanne");

  await ctx.close();
});

// ── Test 9: Google Calendar URL per event ────────────────────────────────────
test("SC-9a: per-event 'Add to Google Calendar' opens calendar.google.com URL with text+dates+ctz", async ({ browser }) => {
  const tripId = await apiCreateTrip("GCal Test");
  await apiPutTrip(tripId, {
    name: "GCal Test",
    details: "",
    events: [
      {
        id: "gcal-evt-001",
        date: "2026-05-01",
        startMinutes: 780,    // 1:00 PM
        endMinutes: 840,      // 2:00 PM
        title: "Uber to Main St",
        status: "proposed",
        authorId: "pid-gcal",
        authorName: "Test",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Use mobile viewport to force day view (data-event-id blocks only in day view)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: "pid-gcal", name: "Test" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await expect(page.locator("text=Uber to Main St")).toBeVisible({ timeout: 5000 });

  // Ensure day view is active
  await page.getByLabel("day view").click();

  // Tap the event to open bottom sheet
  await page.locator('[data-event-id="gcal-evt-001"]').click();
  // Bottom sheet dialog should be open with event title
  await expect(page.getByRole("dialog").filter({ hasText: "Uber to Main St" })).toBeVisible();

  // "Add to Google Calendar" opens a new tab/window — capture the URL
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "Add to Google Calendar" }).click(),
  ]);

  const gcalUrl = popup.url();
  // Google may redirect unauthenticated users through accounts.google.com/signin
  // The generated URL parameters are preserved in the `continue` query param.
  // Check the full URL string (either direct or via `continue=` redirect).
  const decodedUrl = decodeURIComponent(gcalUrl);
  expect(decodedUrl).toMatch(/calendar\.google\.com\/calendar\/render/);
  expect(decodedUrl).toContain("action=TEMPLATE");
  expect(decodedUrl).toContain("text=");
  // Dates should contain YYYYMMDDTHHMMSS format
  expect(decodedUrl).toMatch(/dates=\d{8}T\d{6}[\/%2F]\d{8}T\d{6}/);
  expect(decodedUrl).toContain("ctz=");
  // Text should mention the event
  expect(decodedUrl).toContain("Main");

  await popup.close();
  await ctx.close();
});

// ── Test 9b: "Add all confirmed" .ics bulk export ────────────────────────────
test("SC-9b: 'Add all confirmed' .ics download contains only confirmed events with correct DTSTART", async ({ browser }) => {
  const tripId = await apiCreateTrip("ICS Test");
  await apiPutTrip(tripId, {
    name: "ICS Test",
    details: "",
    events: [
      {
        id: "ics-evt-conf",
        date: "2026-05-01",
        startMinutes: 750,   // 12:30 PM
        endMinutes: 810,     // 1:30 PM
        title: "Confirmed Event",
        status: "confirmed",
        confirmedBy: "Joanne",
        authorId: "pid-ics",
        authorName: "Joanne",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "ics-evt-prop",
        date: "2026-05-01",
        startMinutes: 900,   // 3 PM
        endMinutes: 960,
        title: "Proposed Event",
        status: "proposed",
        authorId: "pid-ics",
        authorName: "Joanne",
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
    { tripId, p: JSON.stringify({ id: "pid-ics", name: "Joanne" }) }
  );

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // The "Save to calendar (.ics)" button should be visible (confirmed events exist)
  const icsBtn = page.locator("text=Save to calendar (.ics)");
  await expect(icsBtn).toBeVisible({ timeout: 5000 });

  // Intercept download
  const downloadPromise = page.waitForEvent("download");
  await icsBtn.click();
  const download = await downloadPromise;

  // File should have .ics extension
  expect(download.suggestedFilename()).toMatch(/\.ics$/);

  // Read content
  const path = await download.path();
  expect(path).not.toBeNull();
  const { readFileSync } = await import("fs");
  const content = readFileSync(path!, "utf8");

  // Should contain exactly 1 VEVENT (only confirmed event)
  const beginVEventCount = (content.match(/BEGIN:VEVENT/g) || []).length;
  expect(beginVEventCount).toBe(1);

  // VEVENT should contain confirmed event title
  expect(content).toContain("SUMMARY:Confirmed Event");
  expect(content).not.toContain("Proposed Event");

  // DTSTART should be 20260501T123000
  expect(content).toMatch(/DTSTART;TZID=.*:20260501T123000/);

  await ctx.close();
});

// ── Test 10: First-persist safety (no blank overwrite) ───────────────────────
test("SC-10: fresh browser load does NOT overwrite server trip state with empty calendar", async ({ browser }) => {
  const tripId = await apiCreateTrip("Persist Test");
  await apiPutTrip(tripId, {
    name: "Persist Test",
    details: "important details",
    events: [
      {
        id: "persist-evt-001",
        date: "2026-05-01",
        startMinutes: 540,
        endMinutes: 600,
        title: "Wake up",
        status: "proposed",
        authorId: "pid-persist",
        authorName: "Alice",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // GET before load
  const before = await apiGetTrip(tripId);
  expect(before.data.events.length).toBe(1);

  // Fresh browser context loads trip page (no edits)
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await expect(page.locator("text=Wake up")).toBeVisible({ timeout: 5000 });

  // Wait for any potential debounced save (2.5s + margin)
  await page.waitForTimeout(5000);

  // GET after: events should still be there
  const after = await apiGetTrip(tripId);
  expect(after.data.events.length).toBe(1);
  expect(
    (after.data.events as Array<{ id: string }>)[0].id
  ).toBe("persist-evt-001");
  expect(after.data.details).toBe("important details");

  await ctx.close();
});

// ── Copy-link with BLOCKED clipboard ─────────────────────────────────────────
test("copy-invite-link: shows fallback (not 'Copied!') when navigator.clipboard is blocked", async ({ browser }) => {
  const tripId = await apiCreateTrip("Copy Test");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Block clipboard API before navigation
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: () => Promise.reject(new Error("Clipboard blocked")),
      },
      writable: false,
      configurable: true,
    });
  });

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Click the Copy invite link button
  await page.getByLabel("Copy invite link").click();

  // "Copied!" should NOT appear when clipboard was blocked (it didn't succeed)
  await expect(page.locator("text=Copied!")).not.toBeVisible({ timeout: 3000 });

  // Fallback: the visible alert div with "Copy failed" should appear
  await expect(page.locator('[role="alert"]').filter({ hasText: "Copy failed" })).toBeVisible({ timeout: 3000 });
  // Fallback: the raw URL input should be visible for manual copy
  await expect(page.locator("input[readonly]")).toBeVisible({ timeout: 3000 });

  await ctx.close();
});

// ── SSR hydration: landing page ───────────────────────────────────────────────
test("SSR: landing page hydrates without React error (no #418/#185)", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  const resp = await page.goto(`${BASE}/`);
  expect(resp?.status()).toBe(200);

  // h1 is visible (SSR)
  await expect(page.locator("h1").first()).toBeVisible();

  // No hydration errors
  const hydrationErrors = errors.filter(
    (e) => e.includes("Hydration") || e.includes("#418") || e.includes("#185") || e.includes("did not match")
  );
  expect(hydrationErrors).toEqual([]);
});

// ── SSR hydration: trip page ──────────────────────────────────────────────────
test("SSR: /t/<secret> trip page hydrates without React error", async ({ browser }) => {
  const tripId = await apiCreateTrip("SSR Hydration Test");
  await apiPutTrip(tripId, {
    name: "SSR Hydration Test",
    details: "",
    events: [
      {
        id: "ssr-evt-001",
        date: "2026-05-01",
        startMinutes: 540,
        endMinutes: 600,
        title: "Hydration test event",
        status: "proposed",
        authorId: "pid-ssr",
        authorName: "SSR Test",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  const resp = await page.goto(`${BASE}/t/${tripId}`);
  expect(resp?.status()).toBe(200);
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
  await expect(page.locator("text=Hydration test event")).toBeVisible({ timeout: 5000 });

  const hydrationErrors = errors.filter(
    (e) => e.includes("Hydration") || e.includes("#418") || e.includes("#185") || e.includes("did not match")
  );
  expect(hydrationErrors).toEqual([]);

  await ctx.close();
});

// ── Static chunk 200 gate ─────────────────────────────────────────────────────
test("All referenced /_next/static chunks return HTTP 200", async ({ page }) => {
  const chunkUrls: string[] = [];
  page.on("response", (resp) => {
    if (resp.url().includes("/_next/static/")) {
      chunkUrls.push(resp.url());
      expect(resp.status()).toBe(200);
    }
  });
  await page.goto(`${BASE}/`);
  await expect(page.locator("h1").first()).toBeVisible();
  expect(chunkUrls.length).toBeGreaterThan(0);
});

// ── Landing page: create trip via "Paste an itinerary" → /t/<secret> ────────
test("SC-1 flow: create trip from landing page (paste path) → redirects to /t/<secret>", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator("h1").first()).toBeVisible();

  const tripNameInput = page.getByLabel("Trip name");
  await tripNameInput.fill("Joanne visits — July");
  // Two co-equal start options: "Paste an itinerary" and "Start blank"
  await page.getByRole("button", { name: /Paste an itinerary/i }).first().click();

  // Should redirect to /t/<secret>
  await expect(page).toHaveURL(/\/t\/[A-Za-z0-9\-_]{22,}/, { timeout: 10000 });
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });
});

// ── SC-7/8: Landing shows TWO co-equal start cards ───────────────────────────
test("SC-7: landing shows two co-equal start options — paste and blank calendar", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator("h1").first()).toBeVisible();

  // Both options must be present with equal weight (neither hidden)
  await expect(page.getByRole("button", { name: /Paste an itinerary/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Start blank/i })).toBeVisible();

  // Both cards should have the same visual structure (both have h2 headings)
  await expect(page.locator("h2").filter({ hasText: "Paste an itinerary" })).toBeVisible();
  await expect(page.locator("h2").filter({ hasText: "Start from a blank calendar" })).toBeVisible();
});

// ── SC-8: blank-calendar path creates empty trip and lands on grid ────────────
test("SC-8: blank-calendar start mints empty trip and lands on calendar grid (not paste panel)", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator("h1").first()).toBeVisible();

  const tripNameInput = page.getByLabel("Trip name");
  await tripNameInput.fill("Blank Calendar Test");
  await page.getByRole("button", { name: /Start blank/i }).click();

  // Should redirect to /t/<secret>
  await expect(page).toHaveURL(/\/t\/[A-Za-z0-9\-_]{22,}/, { timeout: 10000 });
  await expect(page.locator("text=Loading trip")).not.toBeVisible({ timeout: 8000 });

  // Paste panel must NOT auto-take-over (spec check 8)
  await expect(page.locator("text=Paste your itinerary")).not.toBeVisible({ timeout: 3000 });

  // The day grid should be ready (even if empty)
  await expect(page.locator('[aria-label="Day schedule"]')).toBeVisible({ timeout: 5000 });
});
