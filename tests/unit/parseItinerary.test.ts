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
