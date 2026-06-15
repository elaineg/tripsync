/**
 * Deterministic paste-itinerary parser (NO LLM — pure TypeScript).
 *
 * Accepts day-headed, time-prefixed itinerary text and returns:
 *   - details: string (non-time lines BEFORE the first day header)
 *   - days: ParsedDay[] (each with a date label and parsed events)
 *
 * Parsing rules:
 *   - DAY HEADERS: lines matching a wide variety of patterns:
 *       - "Friday May 1", "Fri May 1", "Sunday, May 3", "Friday, May 1st"
 *       - "May 1", "May 1st"  (month + day, no weekday)
 *       - "Saturday Aug 9", "Sat 8/9"
 *       - "Day 1:", "Day 2 —", "Day 1 - Friday", "Day 2 – Saturday"
 *       - Weekday only: "Sunday:" or standalone weekday name
 *       - Month/day numeric: "8/9", "May 9" (month name + day)
 *       - "August 9", "August 9th"
 *   - TIME-PREFIXED LINES under each day:
 *       - 12-hour: "12:30PM title", "9AM: title", "9:00AM title"
 *       - 24-hour: "09:00 Coffee", "9:00 Coffee", "14:30 Lunch", "09:00–10:30 Lunch"
 *       - Ranges:  "1-2PM title", "1:30-2PM title", "1PM-2PM title",
 *                  "1:30PM-2:30PM title", "4:30PM-5PM title",
 *                  "09:00-10:30 title", "14:30–16:00 title"
 *       - Leading bullets/dashes: "- 09:00 Coffee", "• 14:30 Lunch"
 *       - Time-colon-title: "9:00: Coffee", "14:30: Lunch"
 *       - "to" ranges: "1PM to 2PM Lunch"
 *   - URL preservation: if the line (after stripping time) contains a URL
 *     (http:// or https://), it is extracted and stored as event.url
 *   - Non-time lines under a day header are treated as notes/context and
 *     appended to the event notes of the previous event (or ignored if no
 *     prior event)
 */

import { generateId } from "./types";

export interface ParsedEvent {
  id: string;
  startMinutes: number;
  endMinutes: number;
  title: string;
  url?: string;
}

export interface ParsedDay {
  /** Human-readable label, e.g. "Friday May 1" */
  label: string;
  /** ISO date string YYYY-MM-DD (best-effort, using current year) */
  date: string;
  events: ParsedEvent[];
  /** R5-1: non-destructive note when typed weekday disagrees with explicit numeric date */
  weekdayMismatch?: string;
}

export interface ParseResult {
  /** Non-time lines before the first day header */
  details: string;
  days: ParsedDay[];
  /** Lines that were inside a valid day but could not be parsed as timed events */
  skippedLines: string[];
}

// Month name -> 0-indexed month number
const MONTH_MAP: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

// Weekday name → 0-indexed day-of-week (0=Sun)
const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

/**
 * Try to parse a line as a day header.
 * Returns { label, date, weekdayMismatch? } if successful, null otherwise.
 *
 * R5-1 DATE AUTHORITY RULE (the fix for Rob's bug):
 *   - An EXPLICIT numeric month+day (e.g. "Mar 7", "August 9", "May 1") is AUTHORITATIVE.
 *     Use that exact calendar date VERBATIM. NEVER shift it to match a weekday word.
 *   - Use a weekday word to PICK a date ONLY when the header has NO explicit day number
 *     (a bare "Saturday", "Day 1" → sequential dates done in the second pass).
 *   - When a header has BOTH an explicit day number AND a weekday word that DISAGREE,
 *     keep the explicit date; set weekdayMismatch=true so the UI can show a small note.
 *
 * Patterns handled:
 *   "Friday May 1", "Fri May 1", "Friday, May 1", "Friday May 1st"
 *   "May 1", "May 1st"  (month + day, no weekday)
 *   "Saturday Aug 9", "Sat Aug 9", "Day 1:", "Day 2 —" etc.
 *   "Day 1 - Friday", "Day 1 – Saturday May 9"
 *   "August 9", "August 9th", "Fri, May 1"
 *   "Sun 3/9", "Sat 8/9"  (weekday + numeric month/day — numeric is authoritative)
 *   bare "Sunday:" → date="" (resolved to sequential in second pass)
 */
function parseDayHeader(line: string): { label: string; date: string; weekdayMismatch?: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Strip common leading decorators: "**", "##", "---", "===", "Day X:" prefix markers
  const stripped = trimmed.replace(/^[#*\-=]+\s*/, "").replace(/\s*[:\-–—]+\s*$/, "").trim();

  // Pattern: "Day N" or "Day N - weekday" or "Day N – Month Day"
  // e.g. "Day 1:", "Day 2 —", "Day 1 - Friday", "Day 2 – Saturday May 9"
  const dayNRe = /^day\s+\d+/i;
  if (dayNRe.test(stripped)) {
    // Look for a date within this line (month + day after the dash)
    const afterDash = stripped.replace(/^day\s+\d+\s*[-–—,]?\s*/i, "").trim();
    // If afterDash has month+day info, parse it
    const subResult = parseDayHeader(afterDash);
    if (subResult && subResult.date) {
      return { label: stripped, date: subResult.date };
    }
    // No date info, return as label-only
    return { label: stripped, date: "" };
  }

  const weekdayCapRe = `(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)`;
  const monthCapRe = Object.keys(MONTH_MAP).filter((k) => k.length > 3 || ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].includes(k)).join("|");

  // R5-1: Helper to build a dateStr from explicit numeric month+day (LOCAL time, no UTC shift).
  // When an explicit weekday is present but disagrees, we keep the explicit date and
  // return a weekdayMismatch note instead of moving the date.
  function buildExplicitDateStr(
    monthName: string,
    dayNum: number,
    explicitWeekdayRaw: string | null
  ): { date: string; weekdayMismatch?: string } {
    const monthIdx = MONTH_MAP[monthName.toLowerCase()];
    if (monthIdx === undefined) return { date: "" };
    const year = new Date().getFullYear();
    // AUTHORITATIVE: construct exactly the typed date in local time.
    const date = new Date(year, monthIdx, dayNum);
    const dateStr = toLocalDateStr(date);

    // If a weekday was specified, check for a mismatch (informational only — do NOT move date).
    if (explicitWeekdayRaw && explicitWeekdayRaw.toLowerCase() in WEEKDAY_MAP) {
      const typedDow = WEEKDAY_MAP[explicitWeekdayRaw.toLowerCase()];
      const actualDow = date.getDay();
      if (typedDow !== actualDow) {
        const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const mismatch = `(you wrote ${dayNames[typedDow]}; ${date.toLocaleDateString("en-US",{month:"short",day:"numeric"})} is a ${dayNames[actualDow]})`;
        return { date: dateStr, weekdayMismatch: mismatch };
      }
    }
    return { date: dateStr };
  }

  // Pattern: optional weekday, month name, day number
  // e.g. "Friday May 1", "Fri, May 1st", "Saturday May 2", "August 9", "May 1"
  // Also: "Saturday, Aug 9" or "Sat Aug 9"
  const dayHeaderRe = new RegExp(
    `^(?:${weekdayCapRe}[,.]?\\s+)?` +
    `(${monthCapRe})\\s+(\\d{1,2})(?:st|nd|rd|th)?` +
    `(?:[,\\s]|$)`,
    "i"
  );

  const m = stripped.match(dayHeaderRe);
  if (m) {
    const explicitWeekdayRaw = m[1] ?? null;
    const monthName = m[2].toLowerCase();
    const dayNum = parseInt(m[3], 10);
    if (monthName in MONTH_MAP) {
      // R5-1: explicit numeric month+day is AUTHORITATIVE — never shift it.
      const { date: dateStr, weekdayMismatch } = buildExplicitDateStr(monthName, dayNum, explicitWeekdayRaw);
      return { label: trimmed, date: dateStr, weekdayMismatch };
    }
  }

  // Pattern: weekday + numeric date like "Sat 8/9" or "Sun 3/9" (month/day numeric)
  // R5-1: numeric month/day is AUTHORITATIVE — weekday is ignored for date selection.
  const weekdayNumericRe = new RegExp(
    `^${weekdayCapRe}[,.]?\\s+(\\d{1,2})/(\\d{1,2})\\s*$`,
    "i"
  );
  const wn = stripped.match(weekdayNumericRe);
  if (wn) {
    const month0 = parseInt(wn[2], 10) - 1;  // "8/9" → month=8, day=9
    const dayNum = parseInt(wn[3], 10);
    const year = new Date().getFullYear();
    const date = new Date(year, month0, dayNum);
    const dateStr = toLocalDateStr(date);
    return { label: trimmed, date: dateStr };
  }

  // Pattern: weekday only at start of line like "Sunday:" or "Monday" standalone
  // No numeric day → date resolved in second pass (sequential).
  const weekdayOnlyRe = new RegExp(`^${weekdayCapRe}[,.]?\\s*$`, "i");
  if (weekdayOnlyRe.test(stripped)) {
    return { label: stripped, date: "" };
  }

  // Pattern: weekday name + month name + day number (more permissive form)
  // e.g. "Sunday, June 2", "Monday, June 3"
  // Already handled above by dayHeaderRe; this is a fallback for any case it missed.
  const weekdayMonthRe = new RegExp(
    `^${weekdayCapRe}[,.]?\\s+(${monthCapRe})\\s+(\\d{1,2})(?:st|nd|rd|th)?`,
    "i"
  );
  const wm = stripped.match(weekdayMonthRe);
  if (wm) {
    const explicitWeekdayRaw = wm[1] ?? null;
    const monthName = wm[2].toLowerCase();
    const dayNum = parseInt(wm[3], 10);
    if (monthName in MONTH_MAP) {
      // R5-1: explicit numeric month+day is AUTHORITATIVE — never shift it.
      const { date: dateStr, weekdayMismatch } = buildExplicitDateStr(monthName, dayNum, explicitWeekdayRaw);
      return { label: trimmed, date: dateStr, weekdayMismatch };
    }
  }

  return null;
}

/**
 * Parse a time string like "12:30PM", "9AM", "1:30", "13:00", "09:00" into minutes-from-midnight.
 * Returns null if not a valid time.
 */
function parseTimeStr(s: string): number | null {
  if (!s) return null;
  s = s.trim().toLowerCase();

  // Try "H:MMam/pm" or "HHam/pm" or bare "H:MM" (24h) or "HH:MM" (24h)
  const withAmpm = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/.exec(s);
  if (withAmpm) {
    let h = parseInt(withAmpm[1], 10);
    const min = withAmpm[2] ? parseInt(withAmpm[2], 10) : 0;
    const ampm = withAmpm[3];
    if (ampm === "am") {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h += 12;
    }
    if (h >= 0 && h < 24 && min >= 0 && min < 60) {
      return h * 60 + min;
    }
    return null;
  }

  // 24h format "HH:MM" or "H:MM" (must have colon + 2 digit minutes)
  const h24 = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (h24) {
    const h = parseInt(h24[1], 10);
    const m = parseInt(h24[2], 10);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return h * 60 + m;
    }
    return null;
  }

  return null;
}

/**
 * Determine if a string looks like a time token (has digits + optional am/pm or colon).
 * Used to distinguish 24h time prefixes from random numbers.
 */
function looksLike24hTime(s: string): boolean {
  // "09:00", "9:00", "14:30" — requires colon for 24h bare (avoids "9" matching a numbered list)
  return /^\d{1,2}:\d{2}$/.test(s.trim());
}

/**
 * Try to parse a line as a time-prefixed event line.
 * Returns { startMinutes, endMinutes, rest } or null.
 *
 * Handles:
 *   "12:30PM Emily lands"       — 12h AM/PM single
 *   "9AM: Wake up"              — 12h with colon separator
 *   "1-2PM Uber to 123 Main"  — 12h range (PM inherited)
 *   "1:30PM-2:30PM ..."         — 12h range explicit
 *   "09:00 Coffee"              — 24h single
 *   "14:30 Lunch"               — 24h single
 *   "09:00-10:30 Coffee"        — 24h range
 *   "14:30–16:00 Lunch"         — 24h range (en-dash)
 *   "09:00: Coffee"             — 24h with colon separator
 *   "- 09:00 Coffee"            — leading bullet/dash
 *   "• 14:30 Lunch"             — leading bullet
 *   "1PM to 2PM Lunch"          — "to" range
 */
function parseTimeLine(line: string): {
  startMinutes: number;
  endMinutes: number;
  rest: string;
} | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Strip optional leading dash/bullet/number (e.g. "- 09:00 Coffee", "• 9AM Coffee", "1. 9AM Coffee")
  const lineBody = trimmed.replace(/^[-•*]\s*/, "").replace(/^\d+\.\s+/, "");

  // Time token regex: digits, optional colon+2digits, optional am/pm
  const timeTokenRe = `\\d{1,2}(?::\\d{2})?\\s*(?:am|pm|AM|PM)?`;

  // Range with dash/en-dash/em-dash/to: "1-2PM", "1:30-2PM", "09:00-10:30", "09:00–10:30"
  // Also handles "1PM to 2PM"
  const rangeRe = new RegExp(
    `^(${timeTokenRe})\\s*(?:[-–—]|\\bto\\b)\\s*(${timeTokenRe})\\s*:?\\s+(.+)$`,
    "i"
  );
  const rangeMatch = rangeRe.exec(lineBody);
  if (rangeMatch) {
    let startStr = rangeMatch[1].trim();
    const endStr = rangeMatch[2].trim();
    const rest = rangeMatch[3];

    // Inherit am/pm from end token if start lacks it (e.g. "1-2PM" → start="1", end="2PM")
    const hasAmPm = /am|pm/i;
    if (!hasAmPm.test(startStr) && hasAmPm.test(endStr)) {
      const endAmPm = (/am|pm/i.exec(endStr) || ["pm"])[0].toLowerCase();
      startStr = startStr + endAmPm;
    }

    // For 24h ranges: both tokens must have colons (to avoid "1-2" matching as a range with no label)
    // OR at least one has am/pm
    const start = parseTimeStr(startStr);
    const end = parseTimeStr(endStr);
    if (start !== null && end !== null) {
      // Sanity: if both tokens look like bare integers (no colon, no am/pm), skip
      // e.g. "1-2" alone won't be reached here since rest requires content after
      return { startMinutes: start, endMinutes: end, rest };
    }
  }

  // Range with no label after it (end of line): "09:00-10:30" with title that might be on same line
  // Actually already handled above if there's content after. Skip this sub-case.

  // Single time: e.g. "12:30PM Emily lands", "9AM: Wake up", "14:30 Coffee", "09:00: Check in"
  // Must have something after the time token (not just whitespace)
  const singleRe = new RegExp(
    `^(${timeTokenRe})\\s*:?\\s+(.+)$`,
    "i"
  );
  const singleMatch = singleRe.exec(lineBody);
  if (singleMatch) {
    const timeStr = singleMatch[1].trim();
    const rest = singleMatch[2];
    // For 24h bare integers: require the time to have a colon (e.g. "14:30" not bare "14")
    // AM/PM tokens are always OK regardless of colon.
    const hasAmPm = /am|pm/i.test(timeStr);
    const has24hColon = looksLike24hTime(timeStr);
    if (hasAmPm || has24hColon) {
      const start = parseTimeStr(timeStr);
      if (start !== null) {
        return { startMinutes: start, endMinutes: start, rest };
      }
    }
  }

  return null;
}

/**
 * Extract first URL from a string. Returns { url, textWithoutUrl }.
 */
function extractUrl(text: string): { url: string | undefined; textWithoutUrl: string } {
  const urlRe = /https?:\/\/[^\s)]+/;
  const m = urlRe.exec(text);
  if (!m) return { url: undefined, textWithoutUrl: text };
  const url = m[0];
  const textWithoutUrl = text.replace(url, "").replace(/\s+/g, " ").trim();
  return { url, textWithoutUrl };
}

/** Snap minutes to nearest 15-minute increment */
function snap15(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

/**
 * Format a local Date as YYYY-MM-DD without UTC conversion.
 */
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Main parse function. Accepts raw itinerary text.
 *
 * R4-1 fixes:
 * (a) ALL dates constructed with new Date(y,m,d) — local time; dateStr from local components.
 * (b) "Day 1" / "Day 2" headers with no real month/day get sequential REAL dates
 *     (starting from the first dated day found in the paste, or today if none).
 *     No event ever gets an empty/Invalid date: any date that can't be resolved gets
 *     a sequential fallback so it commits and renders.
 * (c) Non-time lines under a day header are collected as skippedLines (R4-3).
 */
export function parseItinerary(raw: string): ParseResult {
  const lines = raw.split("\n");
  const detailsLines: string[] = [];
  const days: ParsedDay[] = [];
  const skippedLines: string[] = [];
  let currentDay: ParsedDay | null = null;
  let seenFirstDayHeader = false;

  // ── First pass: parse all lines, collecting days with their raw dates ──────
  // We also record which days have empty dates (Day-N headers without real dates).
  for (const line of lines) {
    const trimmed = line.trim();

    // Try day header
    const dayHeader = parseDayHeader(trimmed);
    if (dayHeader !== null) {
      seenFirstDayHeader = true;
      currentDay = {
        label: dayHeader.label,
        date: dayHeader.date, // may be "" for Day-N headers
        events: [],
        weekdayMismatch: dayHeader.weekdayMismatch,
      };
      days.push(currentDay);
      continue;
    }

    if (!seenFirstDayHeader) {
      // Before first day header: collect as details preamble
      if (trimmed) {
        detailsLines.push(trimmed);
      }
      continue;
    }

    if (!currentDay) continue;

    // Try time-prefixed event line
    const timeLine = parseTimeLine(trimmed);
    if (timeLine) {
      const { url, textWithoutUrl } = extractUrl(timeLine.rest);
      const title = textWithoutUrl.trim() || timeLine.rest.trim();
      currentDay.events.push({
        id: generateId(),
        startMinutes: snap15(timeLine.startMinutes),
        endMinutes: snap15(
          timeLine.endMinutes === timeLine.startMinutes
            ? timeLine.startMinutes + 60 // Default 1 hour for point events
            : timeLine.endMinutes
        ),
        title,
        url,
      });
    } else if (trimmed) {
      // R4-3: non-time, non-empty line under a day header — collect as skipped
      skippedLines.push(trimmed);
    }
  }

  // ── R4-1b: Assign sequential real dates to Day-N headers that lack explicit dates ──
  // Strategy:
  //  1. Find the first day with a real date (non-empty).
  //  2. Walk days in order; for each day with empty date, assign the next date
  //     relative to the anchor (or today if no anchor found yet).
  //  3. Guarantee: every day ends up with a valid YYYY-MM-DD string.
  let anchorDate: Date | null = null;
  let anchorIdx = -1;

  // Find the first real date
  for (let i = 0; i < days.length; i++) {
    if (days[i].date) {
      // Validate it parses correctly (all our dateStrs come from local Date components,
      // so appending T00:00:00 gives local-midnight, which is always valid)
      const d = new Date(days[i].date + "T00:00:00");
      if (!isNaN(d.getTime())) {
        anchorDate = d;
        anchorIdx = i;
        break;
      }
    }
  }

  // If no real date at all, use today as anchor for day index 0
  if (anchorDate === null) {
    const today = new Date();
    anchorDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    anchorIdx = 0;
  }

  // Second pass: fill in empty dates using anchor
  for (let i = 0; i < days.length; i++) {
    if (!days[i].date) {
      // Offset from the anchor index
      const offset = i - anchorIdx;
      const d = new Date(
        anchorDate.getFullYear(),
        anchorDate.getMonth(),
        anchorDate.getDate() + offset
      );
      days[i].date = toLocalDateStr(d);
    } else {
      // Validate existing date — re-derive from local components to ensure no UTC shift
      const d = new Date(days[i].date + "T00:00:00");
      if (isNaN(d.getTime())) {
        // Fallback: assign sequential date from anchor
        const offset = i - anchorIdx;
        const fd = new Date(
          anchorDate.getFullYear(),
          anchorDate.getMonth(),
          anchorDate.getDate() + offset
        );
        days[i].date = toLocalDateStr(fd);
      }
    }
  }

  return {
    details: detailsLines.join("\n"),
    days,
    skippedLines,
  };
}

/** The Emily acceptance-test itinerary fixture */
export const EMILY_ITINERARY = `Details:
weather 10-20deg, bring light jacket/cardigan, skirt ok, bring ID

Friday May 1
12:30PM Emily lands
1-2PM Uber to 123 Main St
2-4PM unpack
4:30PM walk to Dolores/Empress Vintage then Foreign Cinema
5:15PM dinner Foreign Cinema
7:30PM 20spot/arcana walk
8:30PM El Chato https://partiful.com/e/abc123

Saturday May 2
9AM wake up / coffee
11AM brunch That's My Jam
12PM Haight vintage
6PM dinner Bansang
10PM Bar Part Time`;
