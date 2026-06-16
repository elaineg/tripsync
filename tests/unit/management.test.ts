/**
 * Unit tests for the management feature (checks 18–22).
 *
 * Tests the API route handler logic for:
 * - PUT /api/trip/[id] (rename)
 * - DELETE /api/trip/[id] (shared destructive delete)
 * - GET /api/trip/[id] (404 after delete, 200 after rename)
 *
 * Uses fetch() against the local production server (BASE_URL env).
 * These are integration tests of the API layer, not UI tests.
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// ── Helper: create a trip and return its ID ────────────────────────────────
async function createTrip(name: string): Promise<string> {
  const res = await fetch(`${BASE}/api/trip-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  expect(res.ok).toBe(true);
  const json = (await res.json()) as { id: string };
  return json.id;
}

async function getTrip(id: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}/api/trip/${id}`);
  const body = await res.json();
  return { status: res.status, body };
}

// ── Smoke: server reachable ────────────────────────────────────────────────
describe("Server connectivity", () => {
  it("GET / returns 200", async () => {
    const res = await fetch(`${BASE}/`);
    expect(res.status).toBe(200);
  });
});

// ── Check 18: RENAME — PUT saves new name; GET returns new name ────────────
describe("Check 18: RENAME via PUT /api/trip/[id]", () => {
  let tripId: string;

  beforeAll(async () => {
    tripId = await createTrip("Unit Rename Original");
  });

  it("GET returns original name", async () => {
    const { status, body } = await getTrip(tripId);
    expect(status).toBe(200);
    expect((body as { data: { name: string } }).data.name).toBe("Unit Rename Original");
  });

  it("PUT with new name returns 200", async () => {
    const { body: existing } = await getTrip(tripId);
    const data = (existing as { data: Record<string, unknown> }).data;
    const res = await fetch(`${BASE}/api/trip/${tripId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, name: "Unit Renamed Name" }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("subsequent GET returns the new name (server-side, not local)", async () => {
    const { status, body } = await getTrip(tripId);
    expect(status).toBe(200);
    expect((body as { data: { name: string } }).data.name).toBe("Unit Renamed Name");
  });

  it("PUT with empty name body returns 400", async () => {
    const res = await fetch(`${BASE}/api/trip/${tripId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [] }), // missing name field
    });
    expect(res.status).toBe(400);
  });

  it("PUT on non-existent id returns 404", async () => {
    const res = await fetch(`${BASE}/api/trip/nonexistent-id-that-does-not-exist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", events: [] }),
    });
    // Either 404 (not found) or 400 (invalid id) — not 200
    expect(res.status).not.toBe(200);
  });
});

// ── Check 19: DELETE — removes row; GET returns 404 afterward ─────────────
describe("Check 19: DELETE /api/trip/[id]", () => {
  let tripId: string;

  beforeAll(async () => {
    tripId = await createTrip("Unit Delete Test");
  });

  it("trip exists before delete (GET → 200)", async () => {
    const { status } = await getTrip(tripId);
    expect(status).toBe(200);
  });

  it("DELETE returns 200 (ok)", async () => {
    const res = await fetch(`${BASE}/api/trip/${tripId}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("GET after DELETE returns 404 (row gone from server)", async () => {
    const { status } = await getTrip(tripId);
    expect(status).toBe(404);
  });

  it("DELETE on already-deleted id returns 404", async () => {
    const res = await fetch(`${BASE}/api/trip/${tripId}`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});

// ── Check 20: REMOVE FROM MY LIST — server trip unchanged ─────────────────
// This is a UI/localStorage concern; the API-level invariant is:
// calling GET on a trip DOES NOT destroy it (no implicit side effects).
describe("Check 20: GET does not mutate trip (server safe for remove-from-list)", () => {
  let tripId: string;

  beforeAll(async () => {
    tripId = await createTrip("Unit Remove Test");
    // Seed an event
    const { body: existing } = await getTrip(tripId);
    const data = (existing as { data: Record<string, unknown> }).data;
    await fetch(`${BASE}/api/trip/${tripId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        events: [
          {
            id: "unit-rem-evt",
            date: "2026-05-01",
            startMinutes: 540,
            endMinutes: 600,
            title: "Unit Remove Event",
            status: "proposed",
            authorId: "pid-unit",
            authorName: "UnitUser",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      }),
    });
  });

  it("multiple GETs do NOT delete the trip (remove-from-list is client-only)", async () => {
    const { status: s1 } = await getTrip(tripId);
    const { status: s2 } = await getTrip(tripId);
    const { status: s3 } = await getTrip(tripId);
    expect(s1).toBe(200);
    expect(s2).toBe(200);
    expect(s3).toBe(200);
  });

  it("trip still has its event after multiple GETs", async () => {
    const { body } = await getTrip(tripId);
    const events = (body as { data: { events: Array<{ id: string }> } }).data.events;
    expect(events.some((e) => e.id === "unit-rem-evt")).toBe(true);
  });
});

// ── Check 22: isValidTripId guards — verify invalid IDs get 404/400 ─────────
describe("Check 22 / API guard: invalid ids blocked", () => {
  it("GET with id '../../etc/passwd' returns 404 (invalid id rejected)", async () => {
    const res = await fetch(`${BASE}/api/trip/..%2F..%2Fetc%2Fpasswd`);
    expect([400, 404]).toContain(res.status);
  });

  it("DELETE with empty-ish id returns 404 (no valid trip to delete)", async () => {
    const res = await fetch(`${BASE}/api/trip/aaaabbbbccccddddeeeeaaaa`, { method: "DELETE" });
    // Not found on server (no such trip) — 404
    expect(res.status).toBe(404);
  });
});

// ── TM-R1-2: Enter-saves-stays behavior (logic contract) ─────────────────────
// The UI behavior (no navigation) is a browser concern; here we verify the API
// contract: a rename PUT + subsequent GET returns the new name, confirming the
// server-side half of "Enter saves and stays" (the stay is a UI concern).
describe("TM-R1-2: Rename Enter-saves (API contract)", () => {
  let tripId: string;

  beforeAll(async () => {
    tripId = await createTrip("Enter Save Test Original");
  });

  it("PUT new name → GET reflects the update (rename succeeded)", async () => {
    const { body: existing } = await getTrip(tripId);
    const data = (existing as { data: Record<string, unknown> }).data;
    const res = await fetch(`${BASE}/api/trip/${tripId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, name: "Enter Save Test Renamed" }),
    });
    expect(res.status).toBe(200);
    const { status, body } = await getTrip(tripId);
    expect(status).toBe(200);
    expect((body as { data: { name: string } }).data.name).toBe("Enter Save Test Renamed");
  });
});

// ── TM-R1-6: Delete confirm testids contract (API: trip 404s after delete) ───
// The delete dialog testids (data-testid="delete-confirm-dialog",
// data-testid="delete-confirm-button", data-testid="trip-menu-delete",
// data-testid="recent-delete-<id>") live in the DOM — exercised by e2e/panel.
// Here we verify the server invariant: DELETE → 404, which the confirm button fires.
describe("TM-R1-6: Delete confirm fires DELETE; GET → 404 afterward", () => {
  let tripId: string;

  beforeAll(async () => {
    tripId = await createTrip("Delete Confirm Test");
  });

  it("trip exists before triggering delete", async () => {
    const { status } = await getTrip(tripId);
    expect(status).toBe(200);
  });

  it("DELETE /api/trip/[id] → 200 (simulates confirm-button press)", async () => {
    const res = await fetch(`${BASE}/api/trip/${tripId}`, { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("GET after delete → 404 (trip gone for everyone)", async () => {
    const { status } = await getTrip(tripId);
    expect(status).toBe(404);
  });
});
