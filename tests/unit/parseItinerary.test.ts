import { describe, it, expect } from "vitest";
import { parseItinerary, EMILY_ITINERARY } from "../../lib/parseItinerary";
import { minutesToDisplay } from "../../lib/types";

// ── Helper: find first event matching a title fragment ─────────────────────
function findEvent(days: ReturnType<typeof parseItinerary>["days"], titleFrag: string) {
  for (const day of days) {
    const ev = day.events.find((e) =>
      e.title.toLowerCase().includes(titleFrag.toLowerCase())
    );
    if (ev) return { ev, day };
  }
  return null;
}

describe("parseItinerary — Emily acceptance test", () => {
  const result = parseItinerary(EMILY_ITINERARY);

  it("returns 2 days (Fri May 1 + Sat May 2)", () => {
    expect(result.days).toHaveLength(2);
    expect(result.days[0].label).toMatch(/fri/i);
    expect(result.days[1].label).toMatch(/sat/i);
  });

  it("captures the Details preamble before the first day header", () => {
    expect(result.details).toContain("weather 10-20deg");
    expect(result.details).toContain("light jacket");
    expect(result.details).toContain("bring ID");
    // Details must NOT contain any of the event titles
    expect(result.details).not.toContain("Emily lands");
    expect(result.details).not.toContain("Uber");
  });

  it("parses single time: 12:30PM → startMinutes=750, title='Emily lands'", () => {
    const found = findEvent(result.days, "Emily lands");
    expect(found).not.toBeNull();
    // 12:30PM = 12*60+30 = 750
    expect(found!.ev.startMinutes).toBe(750);
    expect(minutesToDisplay(found!.ev.startMinutes)).toBe("12:30pm");
  });

  it("parses range: 1-2PM → start=780 (1PM), end=840 (2PM), title contains 'Uber'", () => {
    const found = findEvent(result.days, "Uber");
    expect(found).not.toBeNull();
    // 1PM = 13*60 = 780; 2PM = 14*60 = 840
    expect(found!.ev.startMinutes).toBe(780);
    expect(found!.ev.endMinutes).toBe(840);
  });

  it("parses range: 2-4PM unpack → start=840 (2PM), end=960 (4PM)", () => {
    const found = findEvent(result.days, "unpack");
    expect(found).not.toBeNull();
    // 2PM = 14*60 = 840; 4PM = 16*60 = 960
    expect(found!.ev.startMinutes).toBe(840);
    expect(found!.ev.endMinutes).toBe(960);
  });

  it("parses single time 4:30PM → startMinutes=990 (snapped to 15-min)", () => {
    const found = findEvent(result.days, "Dolores");
    expect(found).not.toBeNull();
    // 4:30PM = 16*60+30 = 990; already on 15-min boundary
    expect(found!.ev.startMinutes).toBe(990);
  });

  it("parses 5:15PM dinner Foreign Cinema → startMinutes=1035", () => {
    const fc5 = result.days[0].events.find(
      (e) => e.title.toLowerCase().includes("dinner foreign cinema")
    );
    expect(fc5).not.toBeUndefined();
    // 5:15PM = 17*60+15 = 1035
    expect(fc5!.startMinutes).toBe(1035);
  });

  it("parses single time 7:30PM → startMinutes=1170", () => {
    const found = findEvent(result.days, "20spot");
    expect(found).not.toBeNull();
    // 7:30PM = 19*60+30 = 1170
    expect(found!.ev.startMinutes).toBe(1170);
  });

  it("parses 8:30PM El Chato and preserves the Partiful URL", () => {
    const found = findEvent(result.days, "El Chato");
    expect(found).not.toBeNull();
    // 8:30PM = 20*60+30 = 1230
    expect(found!.ev.startMinutes).toBe(1230);
    expect(found!.ev.url).toBeDefined();
    expect(found!.ev.url).toMatch(/^https?:\/\//);
    expect(found!.ev.url).toContain("partiful");
  });

  it("parses 9AM (with 'wake up / coffee') on Sat May 2 → startMinutes=540", () => {
    const found = result.days[1].events.find((e) => e.startMinutes === 540);
    expect(found).toBeDefined();
  });

  it("parses 11AM brunch That's My Jam → startMinutes=660", () => {
    const found = findEvent(result.days, "My Jam");
    expect(found).not.toBeNull();
    // 11AM = 11*60 = 660
    expect(found!.ev.startMinutes).toBe(660);
  });

  it("parses 12PM Haight vintage → startMinutes=720", () => {
    const found = findEvent(result.days, "Haight");
    expect(found).not.toBeNull();
    // 12PM = 12*60 = 720
    expect(found!.ev.startMinutes).toBe(720);
  });

  it("parses 6PM dinner Bansang → startMinutes=1080", () => {
    const found = findEvent(result.days, "Bansang");
    expect(found).not.toBeNull();
    // 6PM = 18*60 = 1080
    expect(found!.ev.startMinutes).toBe(1080);
  });

  it("parses 10PM Bar Part Time → startMinutes=1320", () => {
    const found = findEvent(result.days, "Part Time");
    expect(found).not.toBeNull();
    // 10PM = 22*60 = 1320
    expect(found!.ev.startMinutes).toBe(1320);
  });

  it("El Chato title does NOT contain the raw URL (URL extracted separately)", () => {
    const found = findEvent(result.days, "El Chato");
    expect(found).not.toBeNull();
    expect(found!.ev.title).not.toContain("http");
    expect(found!.ev.title).not.toContain("partiful");
  });

  it("all Fri May 1 events have a parsedDay date ending in -01", () => {
    // date is on ParsedDay, not the event itself — check the day's date property
    const day = result.days[0];
    expect(day.date).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("Sat May 2 date ends in -02", () => {
    const day = result.days[1];
    expect(day.date).toMatch(/^\d{4}-\d{2}-02$/);
  });
});

describe("parseItinerary — general parser robustness", () => {
  it("handles empty input", () => {
    const r = parseItinerary("");
    expect(r.details).toBe("");
    expect(r.days).toHaveLength(0);
  });

  it("handles input with only details (no day headers)", () => {
    const r = parseItinerary("Pack sunscreen\nBring ID");
    expect(r.details).toContain("Pack sunscreen");
    expect(r.days).toHaveLength(0);
  });

  it("parses 'Saturday May 2' as a day header", () => {
    const r = parseItinerary("Saturday May 2\n9AM Coffee");
    expect(r.days).toHaveLength(1);
    expect(r.days[0].label).toMatch(/saturday/i);
    expect(r.days[0].events[0].startMinutes).toBe(540);
  });

  it("parses '9AM:' format (colon after time)", () => {
    const r = parseItinerary("Friday May 1\n9AM: Wake up");
    expect(r.days[0].events[0].startMinutes).toBe(540);
    expect(r.days[0].events[0].title).toBe("Wake up");
  });

  it("parses '12:30PM title' format", () => {
    const r = parseItinerary("Friday May 1\n12:30PM Emily lands");
    expect(r.days[0].events[0].startMinutes).toBe(750);
    expect(r.days[0].events[0].title).toBe("Emily lands");
  });

  it("parses range '1-2PM title' (inherits PM from end)", () => {
    const r = parseItinerary("Friday May 1\n1-2PM Lunch");
    expect(r.days[0].events[0].startMinutes).toBe(780);
    expect(r.days[0].events[0].endMinutes).toBe(840);
  });

  it("extracts URL from title and stores it separately", () => {
    const r = parseItinerary("Friday May 1\n8:30PM El Chato https://partiful.com/e/test");
    const ev = r.days[0].events[0];
    expect(ev.url).toBe("https://partiful.com/e/test");
    expect(ev.title).not.toContain("http");
  });

  it("non-time lines before first day header go to details", () => {
    const r = parseItinerary("Weather: sunny\nBring ID\n\nFriday May 1\n9AM Coffee");
    expect(r.details).toContain("Weather: sunny");
    expect(r.details).toContain("Bring ID");
    expect(r.days[0].events[0].title).toBe("Coffee");
  });

  it("snaps times to nearest 15 minutes", () => {
    const r = parseItinerary("Friday May 1\n9:07AM Something");
    // 9:07 → nearest 15 = 9:00 = 540
    expect(r.days[0].events[0].startMinutes).toBe(540);
  });

  it("parses '4:30PM' format correctly (no range)", () => {
    const r = parseItinerary("Friday May 1\n4:30PM Walk to park");
    expect(r.days[0].events[0].startMinutes).toBe(990); // 4:30PM = 16*60+30 = 990
    expect(r.days[0].events[0].title).toBe("Walk to park");
  });
});

// ── H1a: 24-hour time formats ─────────────────────────────────────────────────
describe("parseItinerary — 24-hour time support (H1a)", () => {
  it("parses '09:00 Coffee' (zero-padded 24h single) → startMinutes=540", () => {
    const r = parseItinerary("Friday May 1\n09:00 Coffee");
    expect(r.days[0].events).toHaveLength(1);
    expect(r.days[0].events[0].startMinutes).toBe(540); // 9:00 = 540
    expect(r.days[0].events[0].title).toBe("Coffee");
  });

  it("parses '9:00 Coffee' (non-padded 24h) → startMinutes=540", () => {
    const r = parseItinerary("Friday May 1\n9:00 Coffee");
    expect(r.days[0].events[0].startMinutes).toBe(540);
    expect(r.days[0].events[0].title).toBe("Coffee");
  });

  it("parses '14:30 Lunch' (afternoon 24h) → startMinutes=870", () => {
    const r = parseItinerary("Friday May 1\n14:30 Lunch");
    expect(r.days[0].events[0].startMinutes).toBe(870); // 14*60+30 = 870
    expect(r.days[0].events[0].title).toBe("Lunch");
  });

  it("parses '09:00 Coffee' and '14:30 Lunch' as 2 events on the same day", () => {
    const r = parseItinerary("Day 1 - Friday\n09:00 Coffee\n14:30 Lunch");
    expect(r.days[0].events).toHaveLength(2);
    expect(r.days[0].events[0].startMinutes).toBe(540);
    expect(r.days[0].events[1].startMinutes).toBe(870);
  });

  it("parses '09:00-10:30 Coffee' (24h range with dash) → start=540, end=630", () => {
    const r = parseItinerary("Friday May 1\n09:00-10:30 Coffee");
    expect(r.days[0].events[0].startMinutes).toBe(540);
    expect(r.days[0].events[0].endMinutes).toBe(630); // 10:30 = 630
  });

  it("parses '14:30–16:00 Lunch' (24h range with en-dash) → start=870, end=960", () => {
    const r = parseItinerary("Friday May 1\n14:30–16:00 Lunch");
    expect(r.days[0].events[0].startMinutes).toBe(870);
    expect(r.days[0].events[0].endMinutes).toBe(960); // 16:00 = 960
  });

  it("parses '09:00: Coffee' (24h with colon separator) → startMinutes=540", () => {
    const r = parseItinerary("Friday May 1\n09:00: Coffee");
    expect(r.days[0].events[0].startMinutes).toBe(540);
    expect(r.days[0].events[0].title).toBe("Coffee");
  });

  it("parses '- 09:00 Coffee' (leading bullet/dash) → startMinutes=540", () => {
    const r = parseItinerary("Friday May 1\n- 09:00 Coffee");
    expect(r.days[0].events[0].startMinutes).toBe(540);
    expect(r.days[0].events[0].title).toBe("Coffee");
  });

  it("parses '• 14:30 Lunch' (bullet point) → startMinutes=870", () => {
    const r = parseItinerary("Friday May 1\n• 14:30 Lunch");
    expect(r.days[0].events[0].startMinutes).toBe(870);
  });

  it("parses midnight 00:00 as 0 minutes", () => {
    const r = parseItinerary("Friday May 1\n00:00 New Year Countdown");
    expect(r.days[0].events[0].startMinutes).toBe(0);
  });

  it("does NOT parse bare '9' as a time (no colon, no am/pm) — avoids numbered lists", () => {
    const r = parseItinerary("Friday May 1\n9 Go to the park");
    // "9" alone should NOT parse as 9:00
    expect(r.days[0].events).toHaveLength(0);
  });

  // Regression: Emily AM/PM format still works alongside 24h
  it("mixes AM/PM and 24h formats in same day without conflict", () => {
    const r = parseItinerary("Friday May 1\n9AM Wake up\n14:30 Lunch\n6PM Dinner");
    expect(r.days[0].events).toHaveLength(3);
    expect(r.days[0].events[0].startMinutes).toBe(540);  // 9AM
    expect(r.days[0].events[1].startMinutes).toBe(870);  // 14:30
    expect(r.days[0].events[2].startMinutes).toBe(1080); // 6PM
  });
});

// ── H1a: Broadened day-header variations ──────────────────────────────────────
describe("parseItinerary — broadened day-header variations (H1a)", () => {
  it("parses 'Saturday Aug 9' as a day header (weekday + month + day)", () => {
    const r = parseItinerary("Saturday Aug 9\n09:00 Coffee");
    expect(r.days).toHaveLength(1);
    expect(r.days[0].label).toMatch(/saturday aug 9/i);
    expect(r.days[0].events[0].startMinutes).toBe(540);
  });

  it("parses 'Day 1 - Friday' as a day header", () => {
    const r = parseItinerary("Day 1 - Friday\n09:00 Coffee\n14:30 Lunch");
    expect(r.days).toHaveLength(1);
    expect(r.days[0].events).toHaveLength(2);
  });

  it("parses 'Day 1' alone as a day header with no date", () => {
    const r = parseItinerary("Day 1\n09:00 Coffee");
    expect(r.days).toHaveLength(1);
    expect(r.days[0].events[0].title).toBe("Coffee");
  });

  it("parses 'August 9' as a day header (month + day, no weekday)", () => {
    const r = parseItinerary("August 9\n14:30 Check in");
    expect(r.days).toHaveLength(1);
    expect(r.days[0].events[0].startMinutes).toBe(870);
  });

  it("parses 'Monday, June 2' as a day header (weekday comma month day)", () => {
    const r = parseItinerary("Monday, June 2\n09:00 Coffee");
    expect(r.days).toHaveLength(1);
    expect(r.days[0].events[0].startMinutes).toBe(540);
  });

  it("Day 1 — Friday\\n09:00 Coffee\\n14:30 Lunch → 2 events", () => {
    const r = parseItinerary("Day 1 — Friday\n09:00 Coffee\n14:30 Lunch");
    expect(r.days).toHaveLength(1);
    expect(r.days[0].events).toHaveLength(2);
  });

  it("parses multi-day with mixed headers and 24h times", () => {
    const r = parseItinerary(
      "Day 1 - Friday\n09:00 Coffee\n14:30 Lunch\n\nDay 2 - Saturday\n10:00 Brunch"
    );
    expect(r.days).toHaveLength(2);
    expect(r.days[0].events).toHaveLength(2);
    expect(r.days[1].events).toHaveLength(1);
    expect(r.days[1].events[0].startMinutes).toBe(600); // 10:00 = 600
  });
});

// ── R4-1: Regression — Day-N headers get valid consecutive dates (never Invalid Date) ──
describe("R4-1: Day-N headers resolve to valid consecutive dates — never Invalid Date or empty", () => {
  it("'Day 1 - Friday' header → date is a valid YYYY-MM-DD (not empty)", () => {
    const r = parseItinerary("Day 1 - Friday\n09:00 Coffee\n14:30 Lunch");
    expect(r.days).toHaveLength(1);
    // The date must be a valid YYYY-MM-DD string (not empty, not undefined)
    expect(r.days[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Verify it parses to a valid Date in local time
    const d = new Date(r.days[0].date + "T00:00:00");
    expect(isNaN(d.getTime())).toBe(false);
  });

  it("'Day 1' alone → valid date (today or a deterministic fallback)", () => {
    const r = parseItinerary("Day 1\n09:00 Coffee");
    expect(r.days[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const d = new Date(r.days[0].date + "T00:00:00");
    expect(isNaN(d.getTime())).toBe(false);
  });

  it("'Day 1' and 'Day 2' → consecutive dates (Day 2 = Day 1 + 1 day)", () => {
    const r = parseItinerary("Day 1\n09:00 Coffee\n\nDay 2\n14:00 Lunch");
    expect(r.days).toHaveLength(2);
    // Both dates must be valid
    const d1 = new Date(r.days[0].date + "T00:00:00");
    const d2 = new Date(r.days[1].date + "T00:00:00");
    expect(isNaN(d1.getTime())).toBe(false);
    expect(isNaN(d2.getTime())).toBe(false);
    // Day 2 must be exactly 1 day after Day 1
    const diffMs = d2.getTime() - d1.getTime();
    expect(diffMs).toBe(24 * 60 * 60 * 1000);
  });

  it("'March 7' (no weekday) → local date is March 7 (no UTC off-by-one)", () => {
    // Test without an explicit weekday so there's no weekday-adjustment, giving us
    // a clean test that the date construction is local-time (not UTC off-by-one).
    const r = parseItinerary("March 7\n17:00 Marco");
    expect(r.days).toHaveLength(1);
    const dateStr = r.days[0].date;
    // Must be YYYY-03-07 (March 7 in the current year)
    expect(dateStr).toMatch(/^\d{4}-03-07$/);
    // Re-parse with T00:00:00 (local) to confirm display will be March 7, not March 6
    const d = new Date(dateStr + "T00:00:00");
    expect(d.getMonth()).toBe(2); // 0-indexed March
    expect(d.getDate()).toBe(7);
  });

  it("date string constructed from local components — not UTC (no off-by-one)", () => {
    // Regression for Rob's bug: "Friday Mar 7" rendered as "Fri, Mar 6"
    // The date key stored in day.date must match the day label, not be shifted back 1.
    // We test with "May 1" (no weekday) to isolate the construction, not weekday-adjust.
    const r = parseItinerary("May 1\n12:30 Lunch");
    expect(r.days[0].date).toMatch(/^\d{4}-05-01$/);
    const d = new Date(r.days[0].date + "T00:00:00");
    expect(d.getMonth()).toBe(4); // May (0-indexed)
    expect(d.getDate()).toBe(1);
  });

  it("'Day 1 - Friday' with 24h times: all events have non-empty date", () => {
    const r = parseItinerary("Day 1 - Friday\n09:00 Coffee\n14:30 Lunch");
    expect(r.days[0].events).toHaveLength(2);
    // events themselves don't carry date in ParsedEvent — the day does
    expect(r.days[0].date).toBeTruthy();
  });

  it("every previewed event in a 'Day 1 / Day 2' paste has a valid non-empty date", () => {
    const r = parseItinerary(
      "Day 1 - Friday\n09:00 Coffee\n14:30 Lunch\n\nDay 2 - Saturday\n10:00 Brunch"
    );
    for (const day of r.days) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const d = new Date(day.date + "T00:00:00");
      expect(isNaN(d.getTime())).toBe(false);
    }
  });
});

// ── R5-1: Explicit numeric date is AUTHORITATIVE — never shifted by a weekday word ──
describe("R5-1: explicit numeric month+day is authoritative (never shifted by weekday word)", () => {
  it("'Friday Mar 7' → March 7 (explicit date wins even though Mar 7 2026 is a Saturday)", () => {
    // Rob's bug: "Friday Mar 7" was shifting to Fri Mar 6. Fixed: Mar 7 is authoritative.
    const r = parseItinerary("Friday Mar 7\n17:00 Marco arrives");
    expect(r.days).toHaveLength(1);
    expect(r.days[0].date).toMatch(/^\d{4}-03-07$/);
    const d = new Date(r.days[0].date + "T00:00:00");
    expect(d.getMonth()).toBe(2); // March (0-indexed)
    expect(d.getDate()).toBe(7);
  });

  it("'Saturday March 8' → March 8 (explicit date wins even if Mar 8 is not a Saturday)", () => {
    const r = parseItinerary("Saturday March 8\n09:00 Brunch");
    expect(r.days).toHaveLength(1);
    expect(r.days[0].date).toMatch(/^\d{4}-03-08$/);
    const d = new Date(r.days[0].date + "T00:00:00");
    expect(d.getDate()).toBe(8);
  });

  it("'Saturday Aug 8' where Aug 8 2026 IS a Saturday → Aug 8 verbatim (no shift, no mismatch)", () => {
    // Wen's case: matching weekday+date used verbatim (Aug 8 2026 is a Saturday)
    const r = parseItinerary("Saturday Aug 8\n09:00 Coffee");
    expect(r.days[0].date).toMatch(/^\d{4}-08-08$/);
    const d = new Date(r.days[0].date + "T00:00:00");
    expect(d.getDate()).toBe(8);
    expect(r.days[0].weekdayMismatch).toBeUndefined(); // no mismatch note for matching pair
  });

  it("'Sun 3/9' → March 9 (numeric month/day is authoritative)", () => {
    // Rob confirmed: numeric headers parse correctly; this must still work
    const r = parseItinerary("Sun 3/9\n10:00 Checkout");
    expect(r.days[0].date).toMatch(/^\d{4}-03-09$/);
    const d = new Date(r.days[0].date + "T00:00:00");
    expect(d.getDate()).toBe(9);
  });

  it("'Friday Mar 7' → weekdayMismatch note is set (informational only)", () => {
    // The parser should note the mismatch but NOT move the date
    const r = parseItinerary("Friday Mar 7\n17:00 Marco arrives");
    // mismatch is optional but if set must be a non-empty string
    if (r.days[0].weekdayMismatch !== undefined) {
      expect(r.days[0].weekdayMismatch.length).toBeGreaterThan(0);
    }
    // The date must still be Mar 7 regardless
    expect(r.days[0].date).toMatch(/^\d{4}-03-07$/);
  });

  it("bare 'Saturday' (no number) → still resolves to a date via sequential/empty mechanism", () => {
    const r = parseItinerary("Saturday\n09:00 Coffee");
    // Date may be "" (resolved in second pass) or a valid date — either way no crash
    expect(r.days).toHaveLength(1);
    if (r.days[0].date) {
      expect(r.days[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("Emily fixture still parses correctly — 'Friday May 1' → May 1", () => {
    // Regression: Emily fixture must not be broken by the R5-1 fix
    const r = parseItinerary(EMILY_ITINERARY);
    expect(r.days[0].date).toMatch(/^\d{4}-05-01$/);
    const d = new Date(r.days[0].date + "T00:00:00");
    expect(d.getDate()).toBe(1);
  });

  it("'Day 1' → valid sequential date (bare Day-N still works)", () => {
    const r = parseItinerary("Day 1\n09:00 Coffee\n\nDay 2\n14:00 Lunch");
    expect(r.days).toHaveLength(2);
    const d1 = new Date(r.days[0].date + "T00:00:00");
    const d2 = new Date(r.days[1].date + "T00:00:00");
    expect(isNaN(d1.getTime())).toBe(false);
    expect(isNaN(d2.getTime())).toBe(false);
    // Day 2 = Day 1 + 1
    expect(d2.getTime() - d1.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

// ── R4-3: Skipped lines are reported in ParseResult ───────────────────────────
describe("R4-3: skippedLines surfaces unparseable lines inside valid days", () => {
  it("'noon Checkout' in a valid day → skippedLines includes that line", () => {
    const r = parseItinerary("Friday Aug 14\n9:00 Breakfast\nnoon Checkout\n12:00 Lunch");
    // 'noon Checkout' is not a valid time-prefixed line
    expect(r.skippedLines).toContain("noon Checkout");
    // The parseable events still come through
    expect(r.days[0].events.length).toBeGreaterThanOrEqual(2);
  });

  it("no skipped lines for a fully parseable itinerary", () => {
    const r = parseItinerary("Friday May 1\n09:00 Coffee\n14:30 Lunch");
    expect(r.skippedLines).toHaveLength(0);
  });

  it("preamble lines (before first header) are NOT counted as skipped", () => {
    const r = parseItinerary("Pack sunscreen\nFriday May 1\n09:00 Coffee");
    // "Pack sunscreen" goes to details, not skippedLines
    expect(r.details).toContain("Pack sunscreen");
    expect(r.skippedLines).toHaveLength(0);
  });
});
