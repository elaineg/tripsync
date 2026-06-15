/**
 * Deterministic paste-itinerary parser (NO LLM — pure TypeScript).
 *
 * Accepts day-headed, time-prefixed itinerary text and returns:
 *   - details: string (non-time lines BEFORE the first day header)
 *   - days: ParsedDay[] (each with a date label and parsed events)
 *
 * Parsing rules:
 *   - DAY HEADERS: lines matching month-name + day patterns like
 *     "Friday May 1", "Sat May 2", "Sunday, May 3", "Friday, May 1st"
 *   - TIME-PREFIXED LINES under each day:
 *       - Single time: "12:30PM title", "9AM: title", "9:00AM title"
 *       - Ranges:      "1-2PM title", "1:30-2PM title", "1PM-2PM title",
 *                      "1:30PM-2:30PM title", "4:30PM-5PM title"
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
}

export interface ParseResult {
  /** Non-time lines before the first day header */
  details: string;
  days: ParsedDay[];
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

/**
 * Try to parse a line as a day header.
 * Returns { label, date } if successful, null otherwise.
 * Patterns:
 *   "Friday May 1", "Fri May 1", "Friday, May 1", "Friday May 1st"
 *   "May 1", "May 1st"  (month + day, no weekday)
 *   Also: "Day 1:", "Day 2 —" etc. (numbered days with no real date)
 */
function parseDayHeader(line: string): { label: string; date: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Pattern: optional weekday, month name, day number
  // e.g. "Friday May 1", "Fri, May 1st", "Saturday May 2"
  const dayHeaderRe =
    /^(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun),?\s+)?([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]*$/i;

  const m = trimmed.match(dayHeaderRe);
  if (m) {
    const monthName = m[1].toLowerCase();
    const dayNum = parseInt(m[2], 10);
    if (monthName in MONTH_MAP) {
      const monthIdx = MONTH_MAP[monthName];
      // Best-effort year: current year (or next year if the month is in the past
      // relative to "now" for SSR-safe purposes we just use a fixed reference)
      const year = new Date().getFullYear();
      const date = new Date(year, monthIdx, dayNum);
      const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
      return { label: trimmed, date: dateStr };
    }
  }

  // Pattern: weekday only at start of line like "Sunday:" or "Day 1:"
  const weekdayRe = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday):?\s*$/i;
  if (weekdayRe.test(trimmed)) {
    // Can't determine date without month info — use a placeholder
    return { label: trimmed.replace(/:$/, ""), date: "" };
  }

  return null;
}

/**
 * Parse a time string like "12:30PM", "9AM", "1:30", "13:00" into minutes-from-midnight.
 * Returns null if not a valid time.
 */
function parseTimeStr(s: string): number | null {
  if (!s) return null;
  s = s.trim().toLowerCase();

  // Try "H:MMam/pm" or "HHam/pm" or "H:MM" (24h) or "HH:MM" (24h)
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

  // 24h format "HH:MM" or "H:MM" (2+ chars with colon)
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
 * Try to parse a line as a time-prefixed event line.
 * Returns { startMinutes, endMinutes, rest } or null.
 *
 * Handles:
 *   "12:30PM Emily lands"
 *   "9AM: Wake up"
 *   "1-2PM Uber to 123 Main St"
 *   "1:30PM-2:30PM ..."
 *   "4:30PM walk ..."
 *   "10PM Bar Part Time"
 */
function parseTimeLine(line: string): {
  startMinutes: number;
  endMinutes: number;
  rest: string;
} | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Regex: optional leading dash/bullet
  const lineBody = trimmed.replace(/^[-•*]\s*/, "");

  // Full pattern: capture the time prefix (with optional range) at the start of the line
  // Time token: digits, optional colon+digits, optional am/pm
  // Range: timeToken - timeToken
  // Single: timeToken (must be followed by space, colon, or end of relevant prefix)

  const timeTokenRe = `\\d{1,2}(?::\\d{2})?\\s*(?:am|pm|AM|PM)?`;

  // Range: e.g. "1-2PM", "1:30-2PM", "1PM-2PM", "1:30PM-2:30PM"
  const rangeRe = new RegExp(
    `^(${timeTokenRe})\\s*[-–]\\s*(${timeTokenRe})\\s*:?\\s+(.+)$`,
    "i"
  );
  const rangeMatch = rangeRe.exec(lineBody);
  if (rangeMatch) {
    let startStr = rangeMatch[1].trim();
    const endStr = rangeMatch[2].trim();
    const rest = rangeMatch[3];

    // Inherit am/pm from end token if start lacks it
    // e.g. "1-2PM" → start="1", end="2PM"
    const hasAmPm = /am|pm/i;
    if (!hasAmPm.test(startStr) && hasAmPm.test(endStr)) {
      const endAmPm = (/am|pm/i.exec(endStr) || ["pm"])[0].toLowerCase();
      // Absorb pm from end
      startStr = startStr + endAmPm;
    }

    const start = parseTimeStr(startStr);
    const end = parseTimeStr(endStr);
    if (start !== null && end !== null) {
      return { startMinutes: start, endMinutes: end, rest };
    }
  }

  // Single time: e.g. "12:30PM Emily lands", "9AM: Wake up", "4:30PM walk..."
  const singleRe = new RegExp(
    `^(${timeTokenRe})\\s*:?\\s+(.+)$`,
    "i"
  );
  const singleMatch = singleRe.exec(lineBody);
  if (singleMatch) {
    const timeStr = singleMatch[1].trim();
    const rest = singleMatch[2];
    const start = parseTimeStr(timeStr);
    if (start !== null) {
      return { startMinutes: start, endMinutes: start, rest };
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
 * Main parse function. Accepts raw itinerary text.
 */
export function parseItinerary(raw: string): ParseResult {
  const lines = raw.split("\n");
  const detailsLines: string[] = [];
  const days: ParsedDay[] = [];
  let currentDay: ParsedDay | null = null;
  let seenFirstDayHeader = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Try day header
    const dayHeader = parseDayHeader(trimmed);
    if (dayHeader !== null) {
      seenFirstDayHeader = true;
      currentDay = {
        label: dayHeader.label,
        date: dayHeader.date,
        events: [],
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
    }
    // Non-time lines under a day header: silently skip (or could append to last event notes)
  }

  return {
    details: detailsLines.join("\n"),
    days,
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
