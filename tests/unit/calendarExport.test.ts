/**
 * Unit tests for calendarExport.ts
 * Verifies Google Calendar URL format and .ics generation for spec success checks 9.
 */
import { describe, it, expect } from "vitest";
import { googleCalendarUrl, generateIcs } from "../../lib/calendarExport";
import { parseItinerary } from "../../lib/parseItinerary";
import type { TripEvent } from "../../lib/types";

function makeEvent(overrides: Partial<TripEvent> = {}): TripEvent {
  return {
    id: "test-id-001",
    date: "2026-05-01",
    startMinutes: 750,   // 12:30 PM
    endMinutes: 810,     // 1:30 PM
    title: "Emily lands",
    status: "proposed",
    authorId: "pid1",
    authorName: "Joanne",
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    ...overrides,
  };
}

describe("googleCalendarUrl", () => {
  it("builds a URL starting with calendar.google.com/calendar/render", () => {
    const url = googleCalendarUrl(makeEvent());
    expect(url).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render/);
  });

  it("includes action=TEMPLATE", () => {
    const url = googleCalendarUrl(makeEvent());
    expect(url).toContain("action=TEMPLATE");
  });

  it("includes text= matching the event title", () => {
    const url = googleCalendarUrl(makeEvent({ title: "Emily lands" }));
    expect(url).toContain("text=Emily+lands");
  });

  it("includes dates= param with start/end in YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS format", () => {
    // 12:30 PM = 20260501T123000; 1:30 PM = 20260501T013000 (wrong) → 13:30 → T133000
    const url = googleCalendarUrl(makeEvent({ startMinutes: 750, endMinutes: 810 }));
    // 750 min = 12h30m → 20260501T123000
    // 810 min = 13h30m → 20260501T133000
    expect(url).toContain("dates=20260501T123000%2F20260501T133000");
  });

  it("includes ctz= timezone param", () => {
    const url = googleCalendarUrl(makeEvent());
    expect(url).toContain("ctz=");
  });

  it("uses range: 1PM to 2PM correctly", () => {
    // 1PM = 780 min, 2PM = 840 min
    const url = googleCalendarUrl(makeEvent({ startMinutes: 780, endMinutes: 840 }));
    expect(url).toContain("20260501T130000%2F20260501T140000");
  });
});

describe("generateIcs", () => {
  it("outputs BEGIN:VCALENDAR and END:VCALENDAR", () => {
    const ics = generateIcs([makeEvent({ status: "confirmed" })]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("outputs one VEVENT per event", () => {
    const events = [
      makeEvent({ id: "e1", title: "Event 1", status: "confirmed" }),
      makeEvent({ id: "e2", title: "Event 2", status: "confirmed", startMinutes: 660, endMinutes: 720 }),
    ];
    const ics = generateIcs(events);
    const beginCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(beginCount).toBe(2);
  });

  it("only includes events passed in (caller must filter confirmed)", () => {
    const proposed = makeEvent({ id: "p1", status: "proposed" });
    const confirmed = makeEvent({ id: "c1", status: "confirmed" });
    // generateIcs takes a list — caller passes only confirmed events per spec
    const ics = generateIcs([confirmed]);
    expect(ics).toContain("BEGIN:VEVENT");
    const icsAll = generateIcs([proposed, confirmed]);
    const beginCount = (icsAll.match(/BEGIN:VEVENT/g) || []).length;
    expect(beginCount).toBe(2); // generateIcs doesn't filter by status, caller does
  });

  it("DTSTART uses TZID and correct datetime", () => {
    // 12:30 PM = 20260501T123000
    const ics = generateIcs([makeEvent({ startMinutes: 750, status: "confirmed" })]);
    expect(ics).toMatch(/DTSTART;TZID=America\/Los_Angeles:20260501T123000/);
  });

  it("DTEND uses TZID and correct datetime", () => {
    // 810 = 1:30 PM → 20260501T133000
    const ics = generateIcs([makeEvent({ endMinutes: 810, status: "confirmed" })]);
    expect(ics).toMatch(/DTEND;TZID=America\/Los_Angeles:20260501T133000/);
  });

  it("SUMMARY matches event title", () => {
    const ics = generateIcs([makeEvent({ title: "El Chato", status: "confirmed" })]);
    expect(ics).toContain("SUMMARY:El Chato");
  });

  it("excludes soft-deleted events", () => {
    const deleted = makeEvent({ id: "del1", deletedAt: 1700000001000, status: "confirmed" });
    const ics = generateIcs([deleted]);
    // deletedAt events are filtered by generateIcs
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("includes COMMENT with confirmer name when status is confirmed", () => {
    const ev = makeEvent({ status: "confirmed", confirmedBy: "Joanne" });
    const ics = generateIcs([ev]);
    expect(ics).toContain("COMMENT:Confirmed by Joanne");
  });
});

// ── R5-1: .ics DTSTART must use the authoritative explicit date, never the shifted weekday date ──
describe("R5-1: .ics DTSTART uses authoritative explicit date — not shifted by weekday word", () => {
  it("'Friday Mar 7\\n17:00 Marco arrives' → DTSTART contains 20260307, NOT 20260306", () => {
    // Rob's verified bug: "Friday Mar 7" exported DTSTART ...20260306T170000 (Mar 6 = wrong).
    // Root cause was weekday-snapping overriding the explicit numeric date.
    // With the R5-1 fix, Mar 7 is authoritative and .ics must show 20260307.
    const parsed = parseItinerary("Friday Mar 7\n17:00 Marco arrives");
    expect(parsed.days).toHaveLength(1);
    expect(parsed.days[0].date).toMatch(/^\d{4}-03-07$/);

    // Build a TripEvent from the parsed data (simulate what handlePasteImportWithParticipant does)
    const day = parsed.days[0];
    const ev = parsed.days[0].events[0];
    const tripEvent: TripEvent = {
      id: ev.id,
      date: day.date,
      startMinutes: ev.startMinutes,
      endMinutes: ev.endMinutes,
      title: ev.title,
      status: "proposed",
      authorId: "pid-test",
      authorName: "Rob",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const ics = generateIcs([tripEvent]);
    // DTSTART must contain the date for March 7 (20260307), NOT March 6 (20260306)
    expect(ics).toContain("20260307");
    expect(ics).not.toContain("20260306");
    // Full DTSTART line format check
    expect(ics).toMatch(/DTSTART[^:]*:20260307T170000/);
  });

  it("'Saturday Aug 8' (Aug 8 2026 IS a Saturday) → DTSTART contains 20260808", () => {
    // Wen's case: matching weekday+date → should be verbatim, no shift
    const parsed = parseItinerary("Saturday Aug 8\n09:00 Coffee");
    expect(parsed.days[0].date).toMatch(/^\d{4}-08-08$/);

    const day = parsed.days[0];
    const ev = parsed.days[0].events[0];
    const tripEvent: TripEvent = {
      id: ev.id, date: day.date, startMinutes: ev.startMinutes, endMinutes: ev.endMinutes,
      title: ev.title, status: "proposed", authorId: "pid-wen", authorName: "Wen",
      createdAt: Date.now(), updatedAt: Date.now(),
    };

    const ics = generateIcs([tripEvent]);
    expect(ics).toContain("20260808");
    expect(ics).toMatch(/DTSTART[^:]*:20260808T090000/);
  });
});
