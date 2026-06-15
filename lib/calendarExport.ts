/**
 * Calendar export utilities: Google Calendar render URL + .ics generation.
 * Pure module — no browser APIs except where explicitly named (safe for SSR with guards).
 */

import type { TripEvent } from "./types";
import { parseDate } from "./types";

/**
 * Format a date+minutes to Google Calendar YYYYMMDDTHHMMSS format.
 * We use local time (no Z suffix) so ctz param pins the correct hour.
 */
function toGcalDt(dateStr: string, minutes: number): string {
  const date = parseDate(dateStr);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const y = date.getUTCFullYear().toString();
  const mo = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  const hh = h.toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  return `${y}${mo}${d}T${hh}${mm}00`;
}

/**
 * Build a Google Calendar "Add to Calendar" render URL for a single event.
 * Opens without OAuth — the user picks their account in the browser.
 */
export function googleCalendarUrl(event: TripEvent, tz = "America/Los_Angeles"): string {
  const start = toGcalDt(event.date, event.startMinutes);
  const end = toGcalDt(event.date, event.endMinutes);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    ctz: tz,
    details: [event.notes ?? "", event.url ?? ""].filter(Boolean).join("\n"),
    location: event.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate an .ics file string for a list of events.
 */
export function generateIcs(events: TripEvent[], tz = "America/Los_Angeles"): string {
  const vevents = events
    .filter((e) => !e.deletedAt)
    .map((e) => {
      const start = toGcalDt(e.date, e.startMinutes);
      const end = toGcalDt(e.date, e.endMinutes);
      const description = [e.notes ?? "", e.url ?? ""].filter(Boolean).join("\\n");
      return [
        "BEGIN:VEVENT",
        `UID:${e.id}@tripsync`,
        `DTSTART;TZID=${tz}:${start}`,
        `DTEND;TZID=${tz}:${end}`,
        `SUMMARY:${icsEscape(e.title)}`,
        description ? `DESCRIPTION:${icsEscape(description)}` : null,
        e.location ? `LOCATION:${icsEscape(e.location)}` : null,
        e.status === "confirmed" && e.confirmedBy
          ? `COMMENT:Confirmed by ${icsEscape(e.confirmedBy)}`
          : null,
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n");
    });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TripSync//EN",
    `X-WR-CALNAME:TripSync`,
    `X-WR-TIMEZONE:${tz}`,
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n");
}

function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Trigger .ics download in the browser.
 * Call only in a browser context.
 */
export function downloadIcs(icsContent: string, filename = "tripsync.ics"): void {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
