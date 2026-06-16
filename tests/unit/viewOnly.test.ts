/**
 * Unit / integration tests for the VIEW-ONLY share feature (checks 24-27).
 *
 * Runs against a live local server (BASE_URL env var, default :3000).
 * Tests the HTTP/API layer — server enforcement is the P0 check.
 *
 * Check 24: /api/trip-view-token/[id] returns a distinct viewToken
 * Check 25-API: GET /api/trip-view/[viewToken] returns trip data without edit secret
 * Check 26: PUT and DELETE on /api/trip-view/[viewToken] are rejected 403; state unchanged
 * Check 27-API: edit secret still accepts PUT/DELETE after view-token ops
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// ── Helper: create a trip, return its ID ─────────────────────────────────────
async function createTrip(name: string): Promise<string> {
  const res = await fetch(`${BASE}/api/trip-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  expect(res.ok, `createTrip: expected 200, got ${res.status}`).toBe(true);
  const json = (await res.json()) as { id: string };
  expect(typeof json.id).toBe("string");
  return json.id;
}

async function getTrip(id: string) {
  const res = await fetch(`${BASE}/api/trip/${id}`);
  return { status: res.status, body: await res.json() };
}

async function getViewToken(editId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/trip-view-token/${editId}`);
  expect(res.status).toBe(200);
  const json = (await res.json()) as { viewToken: string };
  expect(typeof json.viewToken).toBe("string");
  return json.viewToken;
}

// ── Check 24: distinct viewToken is returned for the edit-link holder ─────────
describe("Check 24: /api/trip-view-token/[id] mints a distinct view token", () => {
  let editId: string;
  let viewToken: string;

  beforeAll(async () => {
    editId = await createTrip("C24 View Token Test");
  });

  it("GET /api/trip-view-token/[editId] returns { viewToken: string }", async () => {
    const res = await fetch(`${BASE}/api/trip-view-token/${editId}`);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { viewToken: string };
    expect(typeof json.viewToken).toBe("string");
    expect(json.viewToken.length).toBeGreaterThanOrEqual(22);
    viewToken = json.viewToken;
  });

  it("viewToken is different from the edit secret", async () => {
    const vt = await getViewToken(editId);
    expect(vt).not.toBe(editId);
  });

  it("viewToken does NOT contain the edit secret string", async () => {
    const vt = await getViewToken(editId);
    expect(vt).not.toContain(editId);
  });

  it("calling /api/trip-view-token/[id] twice returns the same (idempotent) token", async () => {
    const vt1 = await getViewToken(editId);
    const vt2 = await getViewToken(editId);
    expect(vt1).toBe(vt2);
  });

  it("invalid edit ID returns 404 from view-token endpoint", async () => {
    const res = await fetch(`${BASE}/api/trip-view-token/not-a-real-id`);
    expect(res.status).not.toBe(200);
  });

  // consume viewToken variable
  it("placeholder: viewToken captured", () => { expect(viewToken).toBeDefined(); });
});

// ── Check 25/26: GET via view token returns data WITHOUT edit secret ───────────
describe("Check 25-26: GET /api/trip-view/[viewToken] — data only, no edit secret", () => {
  let editId: string;
  let viewToken: string;

  beforeAll(async () => {
    editId = await createTrip("C25 View Secret Test");
    // Seed an event so we have non-empty data
    const existing = await getTrip(editId);
    const data = (existing.body as { data: Record<string, unknown> }).data;
    await fetch(`${BASE}/api/trip/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        events: [{
          id: "c25-evt",
          date: "2026-05-01",
          startMinutes: 540,
          endMinutes: 600,
          title: "C25 Event",
          status: "proposed",
          authorId: "pid-c25",
          authorName: "C25User",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }],
      }),
    });
    viewToken = await getViewToken(editId);
  });

  it("GET /api/trip-view/[viewToken] returns 200", async () => {
    const res = await fetch(`${BASE}/api/trip-view/${viewToken}`);
    expect(res.status).toBe(200);
  });

  it("response contains { data: { name, events } } — the trip data", async () => {
    const res = await fetch(`${BASE}/api/trip-view/${viewToken}`);
    const json = (await res.json()) as { data: { name: string; events: unknown[] } };
    expect(typeof json.data.name).toBe("string");
    expect(Array.isArray(json.data.events)).toBe(true);
  });

  it("response top-level keys are only 'data' (no 'id' / edit secret exposed)", async () => {
    const res = await fetch(`${BASE}/api/trip-view/${viewToken}`);
    const json = await res.json() as Record<string, unknown>;
    const keys = Object.keys(json);
    expect(keys).toEqual(["data"]);
    expect(keys).not.toContain("id");
  });

  it("the edit secret does NOT appear anywhere in the JSON response body", async () => {
    const res = await fetch(`${BASE}/api/trip-view/${viewToken}`);
    const text = await res.text();
    // The edit secret must not be embedded in the response
    expect(text).not.toContain(editId);
  });

  it("the events are present in the view response (same data as edit route)", async () => {
    const res = await fetch(`${BASE}/api/trip-view/${viewToken}`);
    const json = (await res.json()) as { data: { events: Array<{ id: string }> } };
    expect(json.data.events.some((e) => e.id === "c25-evt")).toBe(true);
  });

  it("view route with invalid viewToken returns 404", async () => {
    const res = await fetch(`${BASE}/api/trip-view/this-is-not-a-real-view-token`);
    expect(res.status).toBe(404);
  });
});

// ── Check 26 (P0): PUT via view token is REJECTED 403 ────────────────────────
describe("Check 26 (P0): PUT /api/trip-view/[viewToken] → 403 (server enforces read-only)", () => {
  let editId: string;
  let viewToken: string;
  const originalName = "C26 PUT Reject Test";

  beforeAll(async () => {
    editId = await createTrip(originalName);
    viewToken = await getViewToken(editId);
  });

  it("PUT /api/trip-view/[viewToken] returns 403", async () => {
    const res = await fetch(`${BASE}/api/trip-view/${viewToken}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "HACKED VIA VIEW TOKEN", events: [] }),
    });
    expect(res.status).toBe(403);
  });

  it("PUT 403 response contains error JSON (no stack trace)", async () => {
    const res = await fetch(`${BASE}/api/trip-view/${viewToken}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "HACKED", events: [] }),
    });
    const json = await res.json() as { error: string; message?: string };
    expect(json.error).toBeDefined();
    // Must not expose a stack trace
    const text = JSON.stringify(json);
    expect(text).not.toMatch(/at\s+\w+\s+\(/);
  });

  it("server state is UNCHANGED after the rejected PUT (trip name still original)", async () => {
    // Issue the attempted attack
    await fetch(`${BASE}/api/trip-view/${viewToken}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "HACKED VIA VIEW TOKEN", events: [] }),
    });
    // Verify via the EDIT route that state is unchanged
    const { status, body } = await getTrip(editId);
    expect(status).toBe(200);
    const tripData = (body as { data: { name: string } }).data;
    expect(tripData.name).toBe(originalName);
  });
});

// ── Check 26 (P0): DELETE via view token is REJECTED 403 ─────────────────────
describe("Check 26 (P0): DELETE /api/trip-view/[viewToken] → 403 (server enforces read-only)", () => {
  let editId: string;
  let viewToken: string;

  beforeAll(async () => {
    editId = await createTrip("C26 DELETE Reject Test");
    viewToken = await getViewToken(editId);
  });

  it("DELETE /api/trip-view/[viewToken] returns 403", async () => {
    const res = await fetch(`${BASE}/api/trip-view/${viewToken}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(403);
  });

  it("DELETE 403 response contains error JSON", async () => {
    const res = await fetch(`${BASE}/api/trip-view/${viewToken}`, {
      method: "DELETE",
    });
    const json = await res.json() as { error: string };
    expect(json.error).toBeDefined();
  });

  it("trip still exists after rejected DELETE (state unchanged)", async () => {
    // Issue the attempted attack
    await fetch(`${BASE}/api/trip-view/${viewToken}`, { method: "DELETE" });
    // Verify trip still exists
    const { status } = await getTrip(editId);
    expect(status).toBe(200);
  });
});

// ── Check 26 / 27: EDIT SECRET still accepts PUT / DELETE after view-token ops ─
describe("Check 27: edit secret still grants full write after view-token operations", () => {
  let editId: string;
  let viewToken: string;

  beforeAll(async () => {
    editId = await createTrip("C27 Edit Still Works");
    viewToken = await getViewToken(editId);
    // Issue a rejected view-token PUT to ensure it didn't break anything
    await fetch(`${BASE}/api/trip-view/${viewToken}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "SHOULD FAIL", events: [] }),
    });
  });

  it("edit secret still allows PUT (rename) after view-token write attempts", async () => {
    const { body: existing } = await getTrip(editId);
    const data = (existing as { data: Record<string, unknown> }).data;
    const res = await fetch(`${BASE}/api/trip/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, name: "C27 Renamed Via Edit" }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("renamed name is reflected in GET (edit write succeeded)", async () => {
    const { status, body } = await getTrip(editId);
    expect(status).toBe(200);
    expect((body as { data: { name: string } }).data.name).toBe("C27 Renamed Via Edit");
  });

  it("edit secret still allows DELETE", async () => {
    const tripId2 = await createTrip("C27 Delete Target");
    const res = await fetch(`${BASE}/api/trip/${tripId2}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("trip is gone after DELETE via edit secret (404)", async () => {
    const tripId3 = await createTrip("C27 Delete Confirm");
    await fetch(`${BASE}/api/trip/${tripId3}`, { method: "DELETE" });
    const { status } = await getTrip(tripId3);
    expect(status).toBe(404);
  });
});

// ── Check 26: viewToken does NOT match the edit-secret path ──────────────────
describe("Check 26: viewToken cannot be used as an edit secret on /api/trip/[id]", () => {
  let editId: string;
  let viewToken: string;

  beforeAll(async () => {
    editId = await createTrip("C26 Cross-path Test");
    viewToken = await getViewToken(editId);
  });

  it("PUT /api/trip/[viewToken] (treating viewToken as edit id) returns 404 (not found)", async () => {
    // The view token is a distinct string that should NOT match any trip id
    const res = await fetch(`${BASE}/api/trip/${viewToken}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "CROSS-PATH HACK", events: [] }),
    });
    // Either 404 (no trip with viewToken as id) or 400 (invalid id format) — never 200
    expect([400, 404]).toContain(res.status);
  });

  it("original trip untouched after cross-path PUT attempt", async () => {
    const { status, body } = await getTrip(editId);
    expect(status).toBe(200);
    expect((body as { data: { name: string } }).data.name).toBe("C26 Cross-path Test");
  });
});
