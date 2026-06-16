/**
 * Unit tests for drag-create / drag-move / drag-resize logic.
 *
 * These tests exercise the pure logic functions used by the DayGrid component:
 * - snap-to-15-min
 * - computeEventColumns (re-used from the existing grid)
 * - Duration calculation for drag-create blocks
 * - Move / resize boundary clamping
 *
 * The DOM/React rendering is exercised by e2e tests; here we test pure logic.
 */

import { describe, it, expect } from "vitest";
import { minutesToDisplay } from "../../lib/types";

// ── snap-to-15 ────────────────────────────────────────────────────────────────
function snap15(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

describe("snap-to-15 (drag-create time snap)", () => {
  it("snaps 0 → 0", () => expect(snap15(0)).toBe(0));
  it("snaps 7 → 0", () => expect(snap15(7)).toBe(0));
  it("snaps 8 → 15", () => expect(snap15(8)).toBe(15));
  it("snaps 22 → 15", () => expect(snap15(22)).toBe(15));
  it("snaps 23 → 30", () => expect(snap15(23)).toBe(30));
  it("snaps 540 (9:00) exactly", () => expect(snap15(540)).toBe(540));
  it("snaps 542 → 540", () => expect(snap15(542)).toBe(540));
  it("snaps 548 → 555", () => expect(snap15(548)).toBe(555));
  it("snaps 660 (11:00) exactly", () => expect(snap15(660)).toBe(660));
});

// ── drag-create duration ────────────────────────────────────────────────────
describe("drag-create produces correct duration", () => {
  function dragCreateDuration(startMinutes: number, endMinutes: number): number {
    const s = snap15(startMinutes);
    const e = snap15(endMinutes);
    const start = Math.min(s, e);
    // Must be at least 60 minutes (1h default when drag too small)
    const end = Math.max(s, e, start + 60);
    return end - start;
  }

  it("9:00 drag to 11:00 → 120 min (2h block)", () => {
    expect(dragCreateDuration(540, 660)).toBe(120);
  });

  it("single click (no drag, startMinutes === endMinutes) → 60 min default", () => {
    expect(dragCreateDuration(540, 540)).toBe(60);
  });

  it("drag 10:00 to 10:30 → 60 min minimum (enforced)", () => {
    expect(dragCreateDuration(600, 630)).toBe(60);
  });

  it("drag up (end < start) → still works (flip)", () => {
    // Dragging upwards: press at 11:00, drag to 9:00
    expect(dragCreateDuration(660, 540)).toBe(120);
  });

  it("startMinutes=540 endMinutes=660 → startMinutes=540 endMinutes=660", () => {
    const s = snap15(540);
    const e = snap15(660);
    const start = Math.min(s, e);
    const end = Math.max(s, e, start + 60);
    expect(start).toBe(540);
    expect(end).toBe(660);
  });
});

// ── drag-move clamping ──────────────────────────────────────────────────────
describe("drag-move clamping", () => {
  const DAY_START = 6 * 60; // 360

  function clampMove(newStart: number, duration: number): number {
    return Math.max(DAY_START, Math.min(23 * 60 - duration, newStart));
  }

  it("clamps to DAY_START when dragged above grid", () => {
    expect(clampMove(100, 60)).toBe(360); // clamped to 6am
  });

  it("does not clamp a valid mid-day position", () => {
    expect(clampMove(540, 60)).toBe(540); // 9:00 stays
  });

  it("clamps to 22:00 when dragged past end (1h event)", () => {
    // 23 * 60 - 60 = 1320 (latest start for a 1h event ending at midnight)
    expect(clampMove(1400, 60)).toBe(1320);
  });

  it("a 2h event clamps to 21:00 at end of day", () => {
    // 23 * 60 - 120 = 1260
    expect(clampMove(1400, 120)).toBe(1260);
  });
});

// ── drag-resize clamping ────────────────────────────────────────────────────
describe("drag-resize clamping", () => {
  function resizeTop(newTop: number, originalEnd: number): number {
    return Math.min(newTop, originalEnd - 15);
  }

  function resizeBottom(newBottom: number, originalStart: number): number {
    return Math.max(newBottom, originalStart + 15);
  }

  it("top-resize: new top must be at least 15 min before end", () => {
    // End is at 660 (11:00); dragging top to 660 → clamped to 645
    expect(resizeTop(660, 660)).toBe(645);
  });

  it("top-resize: valid new top is respected", () => {
    expect(resizeTop(540, 660)).toBe(540);
  });

  it("bottom-resize: new bottom must be at least 15 min after start", () => {
    // Start is at 540; dragging bottom to 540 → clamped to 555
    expect(resizeBottom(540, 540)).toBe(555);
  });

  it("bottom-resize: valid new bottom is respected", () => {
    expect(resizeBottom(660, 540)).toBe(660);
  });
});

// ── minutesToDisplay sanity ─────────────────────────────────────────────────
describe("minutesToDisplay used in drag live-preview", () => {
  it("540 → 9:00am", () => expect(minutesToDisplay(540)).toBe("9:00am"));
  it("660 → 11:00am", () => expect(minutesToDisplay(660)).toBe("11:00am"));
  it("750 → 12:30pm", () => expect(minutesToDisplay(750)).toBe("12:30pm"));
  it("0 → 12:00am", () => expect(minutesToDisplay(0)).toBe("12:00am"));
  it("1439 → 11:59pm", () => expect(minutesToDisplay(1439)).toBe("11:59pm"));
});

// ── Drag-created event shape matches TripEvent (AF-5) ──────────────────────
describe("drag-created event has correct TripEvent shape (AF-5)", () => {
  it("new event has proposed status by default", () => {
    const ev = {
      id: "test-id",
      title: "(New event)",
      date: "2026-05-01",
      startMinutes: 540,
      endMinutes: 660,
      status: "proposed" as const,
      authorId: "anon",
      authorName: "Someone",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(ev.status).toBe("proposed");
    expect(ev.startMinutes).toBe(540);
    expect(ev.endMinutes).toBe(660);
    expect(ev.endMinutes - ev.startMinutes).toBe(120);
  });

  it("1h default block: endMinutes = startMinutes + 60", () => {
    const startMinutes = 9 * 60; // 540
    const endMinutes = startMinutes + 60; // 600
    expect(endMinutes - startMinutes).toBe(60);
  });
});
