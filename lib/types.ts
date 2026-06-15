/**
 * TripSync core types.
 * Pure module — no Node.js or browser APIs (safe for unit tests and SSR).
 */

export type EventStatus = "proposed" | "confirmed";

export interface TripEvent {
  id: string;
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Minutes from midnight, 0–1439 */
  startMinutes: number;
  /** Minutes from midnight, 0–1439. If same as startMinutes, treat as point event */
  endMinutes: number;
  title: string;
  /** Optional URL preserved from pasted itinerary */
  url?: string;
  notes?: string;
  location?: string;
  status: EventStatus;
  authorId: string;
  authorName: string;
  /** Name of who confirmed, when status is "confirmed" */
  confirmedBy?: string;
  createdAt: number;
  updatedAt: number;
  /** Soft-delete: set to timestamp when deleted, omit when active */
  deletedAt?: number;
}

export interface TripData {
  name: string;
  /** Trip Details preamble (non-time-bound notes from paste) */
  details: string;
  events: TripEvent[];
  createdAt: number;
  updatedAt: number;
}

export function emptyTrip(name: string): TripData {
  const now = Date.now();
  return {
    name,
    details: "",
    events: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Generate a cryptographically random URL-safe ID (22 chars, 128 bits entropy).
 * Works in Node.js (crypto module) and browser (Web Crypto API).
 */
export function generateId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Node.js fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto") as { randomFillSync: (buf: Uint8Array) => void };
    nodeCrypto.randomFillSync(bytes);
  }
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    result += chars[b0 >> 2];
    result += chars[((b0 & 0x3) << 4) | (b1 >> 4)];
    result += chars[((b1 & 0xf) << 2) | (b2 >> 6)];
    result += chars[b2 & 0x3f];
  }
  return result.slice(0, 22);
}

export const TRIP_ID_RE = /^[A-Za-z0-9\-_]{22,32}$/;

export function isValidTripId(id: string): boolean {
  return TRIP_ID_RE.test(id);
}

/** Author colors (soft pastels) assigned by index mod 6 */
export const AUTHOR_COLORS = [
  "#E8C5A0", // warm peach
  "#A8D5BA", // sage green
  "#B5C8E8", // periwinkle blue
  "#E8B5C8", // dusty rose
  "#C8B5E8", // soft lavender
  "#D5E8A8", // pale lime
];

export function getAuthorColor(participantId: string): string {
  // Simple hash of participantId to pick a stable color
  let hash = 0;
  for (let i = 0; i < participantId.length; i++) {
    hash = (hash * 31 + participantId.charCodeAt(i)) & 0xffff;
  }
  return AUTHOR_COLORS[hash % AUTHOR_COLORS.length];
}

/** Convert minutes-from-midnight to "H:MMam/pm" display */
export function minutesToDisplay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")}${ampm}`;
}

/** Parse "YYYY-MM-DD" date string into a JS Date at midnight UTC */
export function parseDate(dateStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d));
}

/** Format a Date to "YYYY-MM-DD" */
export function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}
