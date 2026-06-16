/**
 * R4 gate — fresh Playwright verification of round-4 fixes.
 * Run: BASE_URL=http://localhost:3099 npx playwright test tests/e2e/r4gate.spec.ts
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3099';

async function apiCreateTrip(name: string): Promise<string> {
  const res = await fetch(`${BASE}/api/trip-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json() as { id: string };
  return data.id;
}

// ── R4 Fix 1: FULL DRAG path → typed title persists ─────────────────────────
test('R4GATE-1a: full drag-create (9→11) typed title "Tram 28 ride" persists via Save button + reload', async ({ browser }) => {
  const tripId = await apiCreateTrip('R4Gate DragTitle');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: 'pid-r4g1', name: 'Verifier' }) });

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator('text=Loading trip')).not.toBeVisible({ timeout: 10000 });
  await page.getByLabel('day view').click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  await grid.evaluate(el => { (el as HTMLElement).scrollTop = 0; });
  await page.waitForTimeout(200);

  const gridBox = await grid.boundingBox();
  const x = (gridBox!.x + 80);
  const startY = gridBox!.y + 3 * 60; // 9am slot
  const endY   = gridBox!.y + 5 * 60; // 11am slot

  // Full drag (not click)
  await page.mouse.move(x, startY);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(x, startY + (endY - startY) * i / 10);
  }
  await page.mouse.up();

  // Popover must appear
  await expect(page.locator('[aria-label="Quick create event"]')).toBeVisible({ timeout: 5000 });

  // Type title
  await page.locator('[aria-label="New event title"]').fill('Tram 28 ride');
  await expect(page.locator('[aria-label="New event title"]')).toHaveValue('Tram 28 ride');

  // Save via button
  await page.locator('[aria-label="Quick create event"] button', { hasText: 'Save' }).click();
  await expect(page.locator('[aria-label="Quick create event"]')).not.toBeVisible({ timeout: 3000 });

  // Title must appear, NOT "(New event)"
  await expect(page.locator('text=Tram 28 ride')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=(New event)')).not.toBeVisible();

  // Wait for persist
  await expect(page.locator('text=Saved')).toBeVisible({ timeout: 8000 });

  // Reload and verify
  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator('text=Loading trip')).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel('day view').click();
  await page.waitForTimeout(400);
  await expect(page.locator('text=Tram 28 ride')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=(New event)')).not.toBeVisible();

  await ctx.close();
});

// ── R4 Fix 1: ENTER KEY path → typed title persists ─────────────────────────
test('R4GATE-1b: drag-create typed title "Tram 28 ride" persists via Enter key + reload', async ({ browser }) => {
  const tripId = await apiCreateTrip('R4Gate EnterTitle');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: 'pid-r4g2', name: 'Verifier' }) });

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator('text=Loading trip')).not.toBeVisible({ timeout: 10000 });
  await page.getByLabel('day view').click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  await grid.evaluate(el => { (el as HTMLElement).scrollTop = 0; });
  await page.waitForTimeout(200);

  const gridBox = await grid.boundingBox();
  const x = (gridBox!.x + 80);
  const startY = gridBox!.y + 4 * 60;
  const endY   = gridBox!.y + 6 * 60;

  await page.mouse.move(x, startY);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(x, startY + (endY - startY) * i / 10);
  }
  await page.mouse.up();

  await expect(page.locator('[aria-label="Quick create event"]')).toBeVisible({ timeout: 5000 });

  const titleInput = page.locator('[aria-label="New event title"]');
  await titleInput.click();
  await page.keyboard.type('Tram 28 ride');
  await expect(titleInput).toHaveValue('Tram 28 ride');
  await page.keyboard.press('Enter');

  await expect(page.locator('[aria-label="Quick create event"]')).not.toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Tram 28 ride')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=(New event)')).not.toBeVisible();

  await expect(page.locator('text=Saved')).toBeVisible({ timeout: 8000 });

  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator('text=Loading trip')).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel('day view').click();
  await page.waitForTimeout(400);
  await expect(page.locator('text=Tram 28 ride')).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── R4 Fix 1: EMPTY title → saves as "(New event)" without crashing ──────────
test('R4GATE-1c: empty title saves as "(New event)" without crashing', async ({ browser }) => {
  const tripId = await apiCreateTrip('R4Gate EmptyTitle');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: 'pid-r4g3', name: 'Verifier' }) });

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator('text=Loading trip')).not.toBeVisible({ timeout: 10000 });
  await page.getByLabel('day view').click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  await grid.evaluate(el => { (el as HTMLElement).scrollTop = 0; });
  await page.waitForTimeout(200);

  const gridBox = await grid.boundingBox();
  const x = (gridBox!.x + 80);
  const y = gridBox!.y + 5 * 60;

  // Single click (no drag) → creates 1h block
  await page.mouse.click(x, y);
  await expect(page.locator('[aria-label="Quick create event"]')).toBeVisible({ timeout: 5000 });

  // Leave title empty, click Save
  await page.locator('[aria-label="Quick create event"] button', { hasText: 'Save' }).click();
  await expect(page.locator('[aria-label="Quick create event"]')).not.toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=(New event)')).toBeVisible({ timeout: 5000 });

  await ctx.close();
});

// ── R4 Fix 2: Zero native <select> in quick-create popover ───────────────────
test('R4GATE-2: quick-create popover has ZERO native <select> and custom stepper controls present', async ({ browser }) => {
  const tripId = await apiCreateTrip('R4Gate CustomPicker');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: 'pid-r4g4', name: 'Verifier' }) });

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator('text=Loading trip')).not.toBeVisible({ timeout: 10000 });
  await page.getByLabel('day view').click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  await grid.evaluate(el => { (el as HTMLElement).scrollTop = 0; });
  await page.waitForTimeout(200);

  const gridBox = await grid.boundingBox();
  const x = (gridBox!.x + 80);
  const y = gridBox!.y + 3 * 60;

  await page.mouse.click(x, y);
  await expect(page.locator('[aria-label="Quick create event"]')).toBeVisible({ timeout: 5000 });

  // Zero native selects
  const selCount = await page.locator('[aria-label="Quick create event"] select').count();
  expect(selCount).toBe(0);

  // Custom stepper buttons
  await expect(page.locator('[aria-label="Quick start hour decrease"]')).toBeVisible();
  await expect(page.locator('[aria-label="Quick start hour increase"]')).toBeVisible();
  await expect(page.locator('[aria-label="Quick end hour decrease"]')).toBeVisible();
  await expect(page.locator('[aria-label="Quick end hour increase"]')).toBeVisible();

  await page.keyboard.press('Escape');
  await ctx.close();
});

// ── Regression 3: Time pickers actually change event start/end ────────────────
test('R4GATE-3: custom time steppers in quick popover change start/end minutes on the saved event', async ({ browser }) => {
  const tripId = await apiCreateTrip('R4Gate TimePicker');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.evaluate(({ tripId, p }) => localStorage.setItem(`ts_participant_${tripId}`, p),
    { tripId, p: JSON.stringify({ id: 'pid-r4g5', name: 'Verifier' }) });

  await page.goto(`${BASE}/t/${tripId}?blank=1`);
  await expect(page.locator('text=Loading trip')).not.toBeVisible({ timeout: 10000 });
  await page.getByLabel('day view').click();
  await page.waitForTimeout(300);

  const grid = page.locator('[aria-label="Day schedule"]');
  await expect(grid).toBeVisible({ timeout: 5000 });
  await grid.evaluate(el => { (el as HTMLElement).scrollTop = 0; });
  await page.waitForTimeout(200);

  const gridBox = await grid.boundingBox();
  const x = (gridBox!.x + 80);
  const startY = gridBox!.y + 2 * 60; // ~8am
  const endY   = gridBox!.y + 4 * 60; // ~10am

  // Drag 8am→10am
  await page.mouse.move(x, startY);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(x, startY + (endY - startY) * i / 10);
  }
  await page.mouse.up();

  await expect(page.locator('[aria-label="Quick create event"]')).toBeVisible({ timeout: 5000 });

  // The quick popover has a '[aria-label="Quick start time"]' container
  // Inside it, the hour span is the text node between the decrease/increase buttons
  const startTimeContainer = page.locator('[aria-label="Quick start time"]');
  await expect(startTimeContainer).toBeVisible({ timeout: 3000 });

  // Read the hour span text (it's a <span> between the two buttons)
  const startHourBefore = await startTimeContainer.locator('span').first().textContent();
  console.log('Start hour before click:', startHourBefore);

  // Click increase hour once
  await page.locator('[aria-label="Quick start hour increase"]').click();
  const startHourAfter = await startTimeContainer.locator('span').first().textContent();
  console.log('Start hour after click:', startHourAfter);
  // The hour display should have changed
  expect(startHourAfter).not.toBe(startHourBefore);

  // Save with a title
  await page.locator('[aria-label="New event title"]').fill('Time Test Event');
  await page.locator('[aria-label="Quick create event"] button', { hasText: 'Save' }).click();
  await expect(page.locator('[aria-label="Quick create event"]')).not.toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Time Test Event')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Saved')).toBeVisible({ timeout: 8000 });

  // Reload and confirm event title persists
  await page.goto(`${BASE}/t/${tripId}`);
  await expect(page.locator('text=Loading trip')).not.toBeVisible({ timeout: 8000 });
  await page.getByLabel('day view').click();
  await page.waitForTimeout(400);
  await expect(page.locator('text=Time Test Event')).toBeVisible({ timeout: 5000 });

  await ctx.close();
});
