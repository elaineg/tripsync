"use client";

import { useState, useEffect, useRef } from "react";
import Link from "../../../components/Link";
import type { TripData, TripEvent } from "../../../lib/types";
import { generateId, getAuthorColor, minutesToDisplay, formatDate, AUTHOR_COLORS } from "../../../lib/types";
import { parseItinerary, EMILY_ITINERARY } from "../../../lib/parseItinerary";
import { googleCalendarUrl, generateIcs, downloadIcs } from "../../../lib/calendarExport";

// ── localStorage keys ─────────────────────────────────────────────────────────
function participantKey(secret: string) { return `ts_participant_${secret}`; }
const RECENT_TRIPS_KEY = "tripsync_recent";

interface Participant {
  id: string;
  name: string;
}

// ── View types ─────────────────────────────────────────────────────────────────
type CalView = "day" | "week" | "month";

// ── Name prompt modal ──────────────────────────────────────────────────────────
function NamePromptModal({
  onConfirm,
}: {
  onConfirm: (name: string) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-label="Enter your name"
    >
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold mb-1">What&rsquo;s your name?</h2>
        <p className="text-sm text-[#666] mb-4">
          So others can see who made changes and confirmations.
        </p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Joanne"
          className="w-full border border-[#E8E2D8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#B5C8E8]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onConfirm(value.trim());
          }}
          aria-label="Your name"
        />
        <button
          className="mt-4 w-full bg-[#1a1a1a] text-white rounded-xl py-3 font-semibold hover:bg-[#333] disabled:opacity-40 transition-colors"
          disabled={!value.trim()}
          onClick={() => value.trim() && onConfirm(value.trim())}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ── Copy invite link button ────────────────────────────────────────────────────
function CopyLinkButton({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/t/${secret}`
      : `/t/${secret}`;

  function handleCopy() {
    if (timerRef.current) clearTimeout(timerRef.current);
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/t/${secret}`
        : `/t/${secret}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => {
          setCopied(true);
          setShowFallback(false);
          timerRef.current = setTimeout(() => setCopied(false), 3000);
        },
        () => {
          // Clipboard blocked — show fallback
          setCopied(true);
          setShowFallback(true);
          timerRef.current = setTimeout(() => { setCopied(false); setShowFallback(false); }, 8000);
        }
      );
    } else {
      setCopied(true);
      setShowFallback(true);
      timerRef.current = setTimeout(() => { setCopied(false); setShowFallback(false); }, 8000);
    }
  }

  return (
    <div>
      <button
        aria-label="Copy invite link"
        onClick={handleCopy}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
          copied
            ? "bg-green-100 border-green-300 text-green-800"
            : "bg-white border-[#E8E2D8] text-[#1a1a1a] hover:border-[#B5C8E8]"
        }`}
      >
        {copied ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy invite link
          </>
        )}
      </button>
      {/* aria-live region for accessibility */}
      <div aria-live="polite" className="sr-only">
        {copied && !showFallback ? "Link copied to clipboard" : ""}
      </div>
      {/* Fallback for blocked clipboard */}
      {showFallback && (
        <div role="alert" className="mt-2 text-xs text-[#888]">
          Copy failed — select and copy this link:
          <input
            readOnly
            value={fullUrl}
            className="block w-full mt-1 border border-[#E8E2D8] rounded-lg px-2 py-1 text-xs bg-white"
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
    </div>
  );
}

// ── Paste import panel ─────────────────────────────────────────────────────────
import type { ParseResult } from "../../../lib/parseItinerary";

function PasteImportPanel({
  tripName,
  onConfirm,
  onCancel,
  participant,
}: {
  tripName: string;
  onConfirm: (result: ParseResult) => void;
  onCancel: () => void;
  participant: Participant | null;
}) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [step, setStep] = useState<"input" | "preview">("input");

  function handleLoadSample() {
    setText(EMILY_ITINERARY);
  }

  function handleParse() {
    if (!text.trim()) return;
    const result = parseItinerary(text);
    setPreview(result);
    setStep("preview");
  }

  function handleConfirm() {
    if (preview) onConfirm(preview);
  }

  if (step === "preview" && preview) {
    const totalEvents = preview.days.reduce((sum, d) => sum + d.events.length, 0);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Preview parsed events</h2>
          <button onClick={() => setStep("input")} className="text-sm text-[#666] hover:text-black underline">
            Back
          </button>
        </div>

        {preview.details && (
          <div className="bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl p-4">
            <p className="text-xs font-semibold text-[#888] mb-1 uppercase tracking-wide">
              Trip Details panel
            </p>
            <p className="text-sm whitespace-pre-wrap text-[#444]">{preview.details}</p>
          </div>
        )}

        <p className="text-sm text-[#666]">
          {totalEvents} event{totalEvents !== 1 ? "s" : ""} across {preview.days.length} day
          {preview.days.length !== 1 ? "s" : ""} will be added to the calendar.
        </p>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {preview.days.map((day) => (
            <div key={day.date + day.label}>
              <h3 className="text-sm font-semibold text-[#1a1a1a] mb-2">{day.label}</h3>
              <ul className="space-y-1">
                {day.events.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-start gap-3 bg-white border border-[#E8E2D8] rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="text-[#888] whitespace-nowrap min-w-0">
                      {minutesToDisplay(ev.startMinutes)}
                      {ev.endMinutes !== ev.startMinutes
                        ? `–${minutesToDisplay(ev.endMinutes)}`
                        : ""}
                    </span>
                    <span className="min-w-0">
                      {ev.title}
                      {ev.url && (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-blue-600 underline text-xs"
                        >
                          link
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Confirm / Cancel */}
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-[#1a1a1a] text-white rounded-xl py-3 font-semibold hover:bg-[#333] transition-colors"
          >
            Add to {tripName}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-white border border-[#E8E2D8] text-[#666] rounded-xl py-3 font-medium hover:border-[#aaa] transition-colors"
          >
            Cancel
          </button>
        </div>
        {!participant && (
          <p role="status" className="text-xs text-[#888] text-center">
            Your name will be asked before events are added.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Paste your itinerary</h2>
        <button onClick={onCancel} className="text-sm text-[#666] hover:text-black underline">
          Skip
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Friday May 1\n12:30PM Emily lands\n1-2PM Uber to 123 Main St\n2-4PM unpack\n..."}
        className="w-full border border-[#E8E2D8] rounded-xl px-4 py-3 text-sm min-h-[200px] resize-y focus:outline-none focus:ring-2 focus:ring-[#B5C8E8] bg-white font-mono leading-relaxed"
        aria-label="Paste itinerary text"
      />
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleParse}
          disabled={!text.trim()}
          className="flex-1 min-w-[120px] bg-[#1a1a1a] text-white rounded-xl py-2.5 font-semibold hover:bg-[#333] disabled:opacity-40 transition-colors"
        >
          Parse →
        </button>
        <button
          onClick={handleLoadSample}
          className="text-sm text-[#666] hover:text-black underline"
          aria-label="Load sample itinerary"
        >
          Load sample itinerary
        </button>
      </div>
    </div>
  );
}

// ── Event bottom sheet ─────────────────────────────────────────────────────────
function EventBottomSheet({
  event,
  onClose,
  onEdit,
  onDelete,
  onConfirm,
  onAddToCalendar,
}: {
  event: TripEvent;
  onClose: () => void;
  onEdit: (event: TripEvent) => void;
  onDelete: (id: string) => void;
  onConfirm: (id: string) => void;
  onAddToCalendar: (event: TripEvent) => void;
}) {
  const color = getAuthorColor(event.authorId);
  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Event details"
    >
      <div
        className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color bar */}
        <div
          className="w-8 h-1.5 rounded-full mb-4"
          style={{ backgroundColor: color }}
        />
        <h2 className="text-lg font-bold leading-tight mb-1">{event.title}</h2>
        <p className="text-sm text-[#666] mb-1">
          {minutesToDisplay(event.startMinutes)}
          {event.endMinutes !== event.startMinutes
            ? ` – ${minutesToDisplay(event.endMinutes)}`
            : ""}
        </p>
        {event.location && (
          <p className="text-sm text-[#666] mb-1">{event.location}</p>
        )}
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-blue-600 underline mb-2 break-all"
            aria-label={`Open link: ${event.url}`}
          >
            {event.url}
          </a>
        )}
        {event.notes && (
          <p className="text-sm text-[#444] mb-2 whitespace-pre-wrap">{event.notes}</p>
        )}
        {/* Status */}
        {event.status === "confirmed" ? (
          <div className="flex items-center gap-1.5 text-sm text-green-700 mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Confirmed by {event.confirmedBy ?? "someone"}
          </div>
        ) : (
          <p className="text-xs text-[#aaa] mb-4">Proposed by {event.authorName}</p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {event.status === "proposed" && (
            <button
              onClick={() => onConfirm(event.id)}
              className="w-full bg-green-600 text-white rounded-xl py-2.5 font-semibold hover:bg-green-700 transition-colors"
            >
              Confirm
            </button>
          )}
          <button
            onClick={() => onAddToCalendar(event)}
            className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-semibold hover:bg-blue-700 transition-colors"
          >
            Add to Google Calendar
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(event)}
              className="flex-1 border border-[#E8E2D8] text-[#333] rounded-xl py-2.5 font-medium hover:border-[#aaa] transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(event.id)}
              className="flex-1 border border-red-200 text-red-600 rounded-xl py-2.5 font-medium hover:border-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
          <button onClick={onClose} className="text-sm text-[#888] py-1">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Event edit sheet ───────────────────────────────────────────────────────────
function EventEditSheet({
  event,
  dates,
  onSave,
  onClose,
}: {
  event: Partial<TripEvent> & { id: string };
  dates: string[]; // available dates YYYY-MM-DD
  onSave: (ev: Partial<TripEvent> & { id: string }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(event.title ?? "");
  const [date, setDate] = useState(event.date ?? (dates[0] ?? ""));
  const [startH, setStartH] = useState(
    Math.floor((event.startMinutes ?? 540) / 60).toString()
  );
  const [startM, setStartM] = useState(
    ((event.startMinutes ?? 540) % 60).toString().padStart(2, "0")
  );
  const [endH, setEndH] = useState(
    Math.floor((event.endMinutes ?? 600) / 60).toString()
  );
  const [endM, setEndM] = useState(
    ((event.endMinutes ?? 600) % 60).toString().padStart(2, "0")
  );
  const [url, setUrl] = useState(event.url ?? "");
  const [notes, setNotes] = useState(event.notes ?? "");
  const [location, setLocation] = useState(event.location ?? "");

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const mins = ["00", "15", "30", "45"];

  function handleSave() {
    if (!title.trim()) return;
    const startMinutes = parseInt(startH) * 60 + parseInt(startM);
    const endMinutes = parseInt(endH) * 60 + parseInt(endM);
    onSave({
      ...event,
      title: title.trim(),
      date,
      startMinutes,
      endMinutes: endMinutes > startMinutes ? endMinutes : startMinutes + 60,
      url: url.trim() || undefined,
      notes: notes.trim() || undefined,
      location: location.trim() || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit event"
    >
      <div
        className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">{event.title ? "Edit event" : "New event"}</h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#888] mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-[#E8E2D8] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B5C8E8]"
              placeholder="Event title"
              autoFocus
              aria-label="Event title"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#888] mb-1">Date</label>
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-[#E8E2D8] rounded-xl px-3 py-2 text-sm focus:outline-none"
              aria-label="Event date"
            >
              {dates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#888] mb-1">Start</label>
              <div className="flex gap-1">
                <select
                  value={startH}
                  onChange={(e) => setStartH(e.target.value)}
                  className="flex-1 border border-[#E8E2D8] rounded-xl px-2 py-2 text-sm focus:outline-none"
                  aria-label="Start hour"
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>
                      {h === 0 ? "12" : h > 12 ? h - 12 : h}{h < 12 ? "am" : "pm"}
                    </option>
                  ))}
                </select>
                <select
                  value={startM}
                  onChange={(e) => setStartM(e.target.value)}
                  className="w-14 border border-[#E8E2D8] rounded-xl px-2 py-2 text-sm focus:outline-none"
                  aria-label="Start minute"
                >
                  {mins.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#888] mb-1">End</label>
              <div className="flex gap-1">
                <select
                  value={endH}
                  onChange={(e) => setEndH(e.target.value)}
                  className="flex-1 border border-[#E8E2D8] rounded-xl px-2 py-2 text-sm focus:outline-none"
                  aria-label="End hour"
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>
                      {h === 0 ? "12" : h > 12 ? h - 12 : h}{h < 12 ? "am" : "pm"}
                    </option>
                  ))}
                </select>
                <select
                  value={endM}
                  onChange={(e) => setEndM(e.target.value)}
                  className="w-14 border border-[#E8E2D8] rounded-xl px-2 py-2 text-sm focus:outline-none"
                  aria-label="End minute"
                >
                  {mins.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#888] mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-[#E8E2D8] rounded-xl px-3 py-2 text-sm focus:outline-none"
              placeholder="Optional"
              aria-label="Event location"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#888] mb-1">Link (URL)</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border border-[#E8E2D8] rounded-xl px-3 py-2 text-sm focus:outline-none"
              placeholder="https://"
              aria-label="Event link"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#888] mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-[#E8E2D8] rounded-xl px-3 py-2 text-sm focus:outline-none min-h-[60px] resize-none"
              placeholder="Optional notes"
              aria-label="Event notes"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 bg-[#1a1a1a] text-white rounded-xl py-2.5 font-semibold hover:bg-[#333] disabled:opacity-40 transition-colors"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-[#E8E2D8] text-[#666] rounded-xl py-2.5 font-medium hover:border-[#aaa] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Day hourly grid ────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 60; // px per hour in the grid
const DAY_START_HOUR = 6; // start rendering from 6am
const DAY_END_HOUR = 24; // render up to midnight

function DayGrid({
  date,
  events,
  onEventTap,
  onSlotTap,
}: {
  date: string;
  events: TripEvent[];
  onEventTap: (event: TripEvent) => void;
  onSlotTap: (minutes: number) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const totalHours = DAY_END_HOUR - DAY_START_HOUR;
  const totalHeight = totalHours * HOUR_HEIGHT;

  // On mount, scroll to first event or 8am
  useEffect(() => {
    if (!gridRef.current) return;
    const firstEvent = events.filter((e) => !e.deletedAt)[0];
    const scrollToMinute = firstEvent
      ? Math.max(firstEvent.startMinutes - 60, DAY_START_HOUR * 60)
      : 8 * 60;
    const scrollToHour = scrollToMinute / 60 - DAY_START_HOUR;
    gridRef.current.scrollTop = scrollToHour * HOUR_HEIGHT;
  }, [events, date]);

  function minutesToTop(minutes: number): number {
    return ((minutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT;
  }

  function minutesToHeight(startMinutes: number, endMinutes: number): number {
    return ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
  }

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>) {
    // Don't fire if an event block was clicked
    if ((e.target as HTMLElement).closest("[data-event-block]")) return;
    const rect = gridRef.current!.getBoundingClientRect();
    const y = e.clientY - rect.top + (gridRef.current?.scrollTop ?? 0);
    const minutesFromStart = Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15;
    const totalMinutes = (DAY_START_HOUR * 60) + minutesFromStart;
    onSlotTap(Math.max(0, Math.min(23 * 60, totalMinutes)));
  }

  const activeEvents = events.filter((e) => !e.deletedAt && e.date === date);

  return (
    <div
      ref={gridRef}
      className="day-grid-scroll relative overflow-y-auto flex-1"
      style={{ minHeight: 0 }}
      aria-label="Day schedule"
    >
      {/* Grid background click target */}
      <div
        className="relative"
        style={{ height: `${totalHeight}px` }}
        onClick={handleGridClick}
      >
        {/* Hour rows */}
        {Array.from({ length: totalHours }, (_, i) => {
          const hour = DAY_START_HOUR + i;
          const label =
            hour === 0
              ? "12am"
              : hour < 12
              ? `${hour}am`
              : hour === 12
              ? "12pm"
              : `${hour - 12}pm`;
          return (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-[#E8E2D8]"
              style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            >
              <span className="absolute -top-2.5 left-2 text-xs text-[#aaa] select-none">
                {label}
              </span>
            </div>
          );
        })}

        {/* 30-minute lines */}
        {Array.from({ length: totalHours }, (_, i) => (
          <div
            key={`half-${i}`}
            className="absolute left-12 right-0 border-t border-[#E8E2D8]/50"
            style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
          />
        ))}

        {/* Event blocks */}
        {activeEvents.map((event) => {
          const top = minutesToTop(event.startMinutes);
          const height = Math.max(
            minutesToHeight(event.startMinutes, event.endMinutes),
            22
          );
          const color = getAuthorColor(event.authorId);
          const isProposed = event.status === "proposed";
          return (
            <div
              key={event.id}
              data-event-block="true"
              data-event-id={event.id}
              className={`absolute left-12 right-2 rounded-lg px-2 py-1 cursor-pointer select-none transition-opacity ${
                isProposed ? "event-proposed border-2" : "event-confirmed border-l-4"
              }`}
              style={{
                top: `${top}px`,
                height: `${height}px`,
                backgroundColor: `${color}${isProposed ? "99" : "dd"}`,
                borderColor: color,
              }}
              onClick={() => onEventTap(event)}
              aria-label={`${event.title} at ${minutesToDisplay(event.startMinutes)}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onEventTap(event);
              }}
            >
              <p className="text-xs font-semibold leading-tight truncate text-[#1a1a1a]">
                {event.title}
              </p>
              <p className="text-xs text-[#444] leading-tight">
                {minutesToDisplay(event.startMinutes)}
                {event.endMinutes !== event.startMinutes
                  ? ` – ${minutesToDisplay(event.endMinutes)}`
                  : ""}
              </p>
              {event.status === "confirmed" && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  <svg className="w-3 h-3 text-green-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-green-700 leading-tight truncate">
                    Confirmed by {event.confirmedBy ?? ""}
                  </span>
                </div>
              )}
              {event.url && (
                <svg className="w-3 h-3 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week view ──────────────────────────────────────────────────────────────────
function WeekView({
  dates,
  events,
  selectedDate,
  onDateSelect,
  onEventTap,
}: {
  dates: string[];
  events: TripEvent[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onEventTap: (event: TripEvent) => void;
}) {
  if (dates.length === 0) return <div className="p-4 text-[#888]">No dates yet.</div>;

  return (
    <div className="overflow-x-auto">
      <div className="flex" style={{ minWidth: `${Math.max(dates.length * 120, 300)}px` }}>
        {dates.map((date) => {
          const dayEvents = events.filter((e) => !e.deletedAt && e.date === date);
          const isSelected = date === selectedDate;
          return (
            <div
              key={date}
              className={`flex-1 border-r border-[#E8E2D8] last:border-r-0 ${isSelected ? "bg-[#F0EDE8]" : ""}`}
              style={{ minWidth: "120px" }}
            >
              <button
                onClick={() => onDateSelect(date)}
                className="w-full text-center py-2 text-xs font-semibold text-[#666] hover:text-[#1a1a1a] border-b border-[#E8E2D8]"
              >
                {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </button>
              <div className="p-2 space-y-1 min-h-[200px]">
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-[#ccc] text-center mt-4">—</p>
                ) : (
                  dayEvents.map((ev) => {
                    const color = getAuthorColor(ev.authorId);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => onEventTap(ev)}
                        className={`w-full text-left rounded-lg px-2 py-1 text-xs border ${
                          ev.status === "proposed"
                            ? "opacity-70 border-dashed"
                            : "border-solid"
                        }`}
                        style={{ borderColor: color, backgroundColor: `${color}44` }}
                      >
                        <span className="font-medium leading-tight block truncate">
                          {minutesToDisplay(ev.startMinutes)}{" "}
                          {ev.title}
                        </span>
                        {ev.status === "confirmed" && (
                          <span className="text-green-700 text-xs">✓ {ev.confirmedBy}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Month view ─────────────────────────────────────────────────────────────────
function MonthView({
  dates,
  events,
  selectedDate,
  onDateSelect,
  onEventTap,
}: {
  dates: string[];
  events: TripEvent[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onEventTap: (event: TripEvent) => void;
}) {
  if (dates.length === 0) return <div className="p-4 text-[#888]">No dates yet.</div>;

  const eventsByDate: Record<string, TripEvent[]> = {};
  for (const ev of events) {
    if (!ev.deletedAt) {
      (eventsByDate[ev.date] ??= []).push(ev);
    }
  }

  return (
    <div className="p-4">
      <div className="space-y-3">
        {dates.map((date) => {
          const dayEvents = eventsByDate[date] ?? [];
          const isSelected = date === selectedDate;
          const label = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
          return (
            <div key={date} className={`rounded-xl border ${isSelected ? "border-[#B5C8E8]" : "border-[#E8E2D8]"} bg-white`}>
              <button
                className="w-full text-left px-4 py-2 font-semibold text-sm flex items-center justify-between"
                onClick={() => onDateSelect(date)}
              >
                <span>{label}</span>
                <span className="text-xs text-[#aaa]">{dayEvents.length} events</span>
              </button>
              {dayEvents.length > 0 && (
                <div className="px-4 pb-3 space-y-1 border-t border-[#E8E2D8]">
                  {dayEvents.map((ev) => {
                    const color = getAuthorColor(ev.authorId);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => onEventTap(ev)}
                        className={`w-full text-left flex items-start gap-2 py-1 text-sm ${
                          ev.status === "proposed" ? "opacity-70" : ""
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                          style={{ backgroundColor: color }}
                        />
                        <span className="min-w-0">
                          <span className="text-[#888] text-xs mr-1">
                            {minutesToDisplay(ev.startMinutes)}
                          </span>
                          <span className="font-medium text-[#1a1a1a]">{ev.title}</span>
                          {ev.status === "confirmed" && (
                            <span className="ml-1 text-green-700 text-xs">✓</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main TripPageClient ────────────────────────────────────────────────────────
export default function TripPageClient({ secret }: { secret: string }) {
  const [trip, setTrip] = useState<TripData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false); // true after server GET completes
  const [serverHydrated, setServerHydrated] = useState(false); // guard: don't PUT until true
  const [view, setView] = useState<CalView>("day");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TripEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<(Partial<TripEvent> & { id: string }) | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tripRef = useRef<TripData | null>(null);

  // ── Load trip from server on mount ──────────────────────────────────────────
  useEffect(() => {
    async function init() {
      // Read participant from localStorage (only in effect — SSR safe)
      try {
        const raw = window.localStorage.getItem(participantKey(secret));
        if (raw) {
          const p = JSON.parse(raw) as Participant;
          if (p.id && p.name) setParticipant(p);
        }
      } catch { /* ignore */ }

      // Load trip
      try {
        const res = await fetch(`/api/trip/${secret}`);
        if (res.status === 404) {
          setLoadError("Trip not found. The link may be invalid.");
          setHydrated(true);
          return;
        }
        if (!res.ok) throw new Error("Server error");
        const body = (await res.json()) as { data: TripData };
        const t = body.data;
        setTrip(t);
        tripRef.current = t;
        // Set default view: Day on mobile, Week on desktop
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
          setView(t.events.filter((e) => !e.deletedAt).length > 0 ? "week" : "day");
        }
        // Set selectedDate to first event date or today
        const activeDates = getUniqueDates(t.events);
        if (activeDates.length > 0) {
          const today = formatDate(new Date());
          setSelectedDate(activeDates.includes(today) ? today : activeDates[0]);
        }
        // Show paste panel if no events (empty trip)
        if (t.events.filter((e) => !e.deletedAt).length === 0) {
          setShowPastePanel(true);
        }
        // Mark hydration complete — BEFORE setServerHydrated so guard is set first
        setServerHydrated(true);
        setHydrated(true);
      } catch {
        setLoadError("Could not load trip. Please try again.");
        setHydrated(true);
      }
    }
    void init();

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [secret]);

  // Update recent trips when trip name loads
  useEffect(() => {
    if (!trip) return;
    try {
      const raw = window.localStorage.getItem(RECENT_TRIPS_KEY);
      const existing: Array<{ id: string; name: string; createdAt: number }> = raw
        ? (JSON.parse(raw) as Array<{ id: string; name: string; createdAt: number }>)
        : [];
      const updated = [
        { id: secret, name: trip.name, createdAt: trip.createdAt },
        ...existing.filter((t) => t.id !== secret),
      ].slice(0, 10);
      window.localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  }, [trip, secret]);

  // Tab-focus refresh
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && serverHydrated) {
        fetch(`/api/trip/${secret}`)
          .then((res) => res.ok ? res.json() as Promise<{ data: TripData }> : null)
          .then((body) => {
            if (body) {
              setTrip(body.data);
              tripRef.current = body.data;
            }
          })
          .catch(() => { /* silent */ });
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [secret, serverHydrated]);

  // ── Debounced save ───────────────────────────────────────────────────────────
  function scheduleSave(updated: TripData) {
    if (!serverHydrated) return; // guard: never write before server read
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(() => {
      doSave(updated);
    }, 2500);
  }

  function doSave(data: TripData, beacon = false) {
    const body = JSON.stringify(data);
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(`/api/trip/${secret}`, body);
      return;
    }
    fetch(`/api/trip/${secret}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    })
      .then((res) => {
        if (res.ok) setSaveStatus("saved");
        else setSaveStatus("error");
      })
      .catch(() => setSaveStatus("error"));
  }

  // Flush on blur/visibilitychange/beforeunload
  useEffect(() => {
    function flush() {
      if (saveTimerRef.current && tripRef.current && serverHydrated) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        doSave(tripRef.current, true);
      }
    }
    window.addEventListener("blur", flush);
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("blur", flush);
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [secret, serverHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Participant / name prompt ─────────────────────────────────────────────────
  function requireParticipant(action: () => void) {
    if (participant) {
      action();
    } else {
      setPendingAction(() => action);
      setShowNamePrompt(true);
    }
  }

  function handleNameConfirm(name: string) {
    const id = generateId();
    const p: Participant = { id, name };
    setParticipant(p);
    try {
      window.localStorage.setItem(participantKey(secret), JSON.stringify(p));
    } catch { /* ignore */ }
    setShowNamePrompt(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }

  // ── Trip mutation helpers ─────────────────────────────────────────────────────
  function updateTrip(updater: (t: TripData) => TripData) {
    setTrip((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      tripRef.current = updated;
      scheduleSave(updated);
      return updated;
    });
  }

  // ── Paste import confirm ──────────────────────────────────────────────────────
  // After name is confirmed, the participant state might not be updated yet.
  // Use a ref pattern: read localStorage directly for freshest value.
  function handlePasteConfirmWithNameCheck(result: ParseResult) {
    if (!participant) {
      // Show name prompt, then confirm
      setPendingAction(() => () => {
        // After name set, participant will be set - re-trigger with current participant
        // We need to capture result in closure
        handlePasteImportWithParticipant(result);
      });
      setShowNamePrompt(true);
    } else {
      handlePasteImportWithParticipant(result);
    }
  }

  function handlePasteImportWithParticipant(result: ParseResult) {
    // Read participant directly from localStorage since state may not be updated yet
    let p = participant;
    if (!p) {
      try {
        const raw = window.localStorage.getItem(participantKey(secret));
        if (raw) p = JSON.parse(raw) as Participant;
      } catch { /* ignore */ }
    }
    if (!p) return; // should not happen

    const theParticipant = p;
    const now = Date.now();
    updateTrip((prev) => {
      const newEvents: TripEvent[] = result.days.flatMap((day) =>
        day.events.map((ev) => ({
          ...ev,
          date: day.date,
          status: "proposed" as const,
          authorId: theParticipant.id,
          authorName: theParticipant.name,
          createdAt: now,
          updatedAt: now,
        }))
      );
      const details = [prev.details, result.details].filter(Boolean).join("\n").trim();
      const allDates = getUniqueDates([...prev.events, ...newEvents]);
      if (allDates.length > 0) {
        const today = formatDate(new Date());
        setSelectedDate(allDates.includes(today) ? today : allDates[0]);
      }
      return {
        ...prev,
        details,
        events: [...prev.events, ...newEvents],
        updatedAt: now,
      };
    });
    setShowPastePanel(false);
  }

  // ── Event actions ─────────────────────────────────────────────────────────────
  function handleEventTap(event: TripEvent) {
    setSelectedEvent(event);
  }

  function handleEventEdit(event: TripEvent) {
    setSelectedEvent(null);
    requireParticipant(() => setEditingEvent(event));
  }

  function handleEventDelete(id: string) {
    setSelectedEvent(null);
    requireParticipant(() => {
      const now = Date.now();
      updateTrip((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.id === id ? { ...e, deletedAt: now, updatedAt: now } : e
        ),
        updatedAt: now,
      }));
    });
  }

  function handleEventConfirm(id: string) {
    setSelectedEvent(null);
    requireParticipant(() => {
      // Read participant from localStorage since state may lag
      let p = participant;
      if (!p) {
        try {
          const raw = window.localStorage.getItem(participantKey(secret));
          if (raw) p = JSON.parse(raw) as Participant;
        } catch { /* ignore */ }
      }
      const confirmerName = p?.name ?? "Someone";
      const now = Date.now();
      updateTrip((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.id === id
            ? { ...e, status: "confirmed", confirmedBy: confirmerName, updatedAt: now }
            : e
        ),
        updatedAt: now,
      }));
    });
  }

  function handleEventSave(ev: Partial<TripEvent> & { id: string }) {
    setEditingEvent(null);
    const p = participant;
    const now = Date.now();
    updateTrip((prev) => {
      const existing = prev.events.find((e) => e.id === ev.id);
      if (existing) {
        return {
          ...prev,
          events: prev.events.map((e) =>
            e.id === ev.id ? { ...e, ...ev, updatedAt: now } : e
          ),
          updatedAt: now,
        };
      }
      // New event
      const newEv: TripEvent = {
        id: ev.id,
        title: ev.title ?? "Untitled",
        date: ev.date ?? selectedDate,
        startMinutes: ev.startMinutes ?? 9 * 60,
        endMinutes: ev.endMinutes ?? 10 * 60,
        url: ev.url,
        notes: ev.notes,
        location: ev.location,
        status: "proposed",
        authorId: p?.id ?? "anon",
        authorName: p?.name ?? "Someone",
        createdAt: now,
        updatedAt: now,
      };
      return {
        ...prev,
        events: [...prev.events, newEv],
        updatedAt: now,
      };
    });
    // Update selectedDate if needed
    if (ev.date && ev.date !== selectedDate) {
      const allDates = getUniqueDates([...(trip?.events ?? [])]);
      if (!allDates.includes(ev.date ?? "")) {
        setSelectedDate(ev.date ?? selectedDate);
      }
    }
  }

  function handleSlotTap(minutes: number) {
    requireParticipant(() => {
      setEditingEvent({
        id: generateId(),
        date: selectedDate,
        startMinutes: minutes,
        endMinutes: minutes + 60,
      });
    });
  }

  function handleAddToCalendar(event: TripEvent) {
    window.open(googleCalendarUrl(event), "_blank", "noopener");
  }

  function handleBulkIcs() {
    if (!trip) return;
    const confirmed = trip.events.filter((e) => !e.deletedAt && e.status === "confirmed");
    if (confirmed.length === 0) {
      alert("No confirmed events to export.");
      return;
    }
    const icsContent = generateIcs(confirmed);
    downloadIcs(icsContent, `${trip.name.replace(/[^a-z0-9]/gi, "-")}.ics`);
  }

  function handleDetailsChange(details: string) {
    updateTrip((prev) => ({ ...prev, details, updatedAt: Date.now() }));
  }

  function handleTripNameChange(name: string) {
    updateTrip((prev) => ({ ...prev, name, updatedAt: Date.now() }));
  }

  function handleRefresh() {
    fetch(`/api/trip/${secret}`)
      .then((res) => res.ok ? res.json() as Promise<{ data: TripData }> : null)
      .then((body) => {
        if (body) {
          setTrip(body.data);
          tripRef.current = body.data;
        }
      })
      .catch(() => setSaveStatus("error"));
  }

  // ── Derived data ──────────────────────────────────────────────────────────────
  const uniqueDates = trip ? getUniqueDates(trip.events) : [];
  const activeEvents = trip ? trip.events.filter((e) => !e.deletedAt) : [];

  // ── Loading / error states ────────────────────────────────────────────────────
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[#888]">Loading trip…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <p role="alert" className="text-red-600 text-lg mb-4">{loadError}</p>
        <Link href="/" className="text-blue-600 underline">Create a new trip</Link>
      </div>
    );
  }

  if (!trip) return null;

  const confirmedEvents = activeEvents.filter((e) => e.status === "confirmed");
  const availableDates = uniqueDates.length > 0 ? uniqueDates : [formatDate(new Date())];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Sticky header ──────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-[#FAF7F2] border-b border-[#E8E2D8] px-4 py-2" style={{ maxHeight: "96px" }}>
        {/* Top row: trip name + share/actions */}
        <div className="flex items-center justify-between gap-2 min-h-0">
          {/* Trip name — inline editable */}
          <input
            type="text"
            value={trip.name}
            onChange={(e) => handleTripNameChange(e.target.value)}
            className="flex-1 min-w-0 text-base font-bold bg-transparent focus:outline-none focus:ring-0 truncate text-[#1a1a1a]"
            aria-label="Trip name"
          />
          {/* Save status */}
          {saveStatus === "saving" && (
            <span className="text-xs text-[#aaa] flex-shrink-0">Saving…</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-green-600 flex-shrink-0">Saved</span>
          )}
          {saveStatus === "error" && (
            <span role="alert" className="text-xs text-red-500 flex-shrink-0">Save failed</span>
          )}

          {/* Participant chip */}
          {participant && (
            <button
              onClick={() => setShowNamePrompt(true)}
              className="flex-shrink-0 text-xs bg-white border border-[#E8E2D8] rounded-full px-2 py-1 font-medium hover:border-[#B5C8E8] transition-colors"
              aria-label="Change your name"
            >
              {participant.name}
            </button>
          )}
        </div>

        {/* Second row: view switcher + date strip + actions */}
        <div className="flex items-center gap-2 mt-1 min-h-0 overflow-x-auto">
          {/* View switcher */}
          <div className="flex-shrink-0 flex rounded-lg border border-[#E8E2D8] overflow-hidden bg-white text-xs">
            {(["day", "week", "month"] as CalView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2 py-1 capitalize font-medium transition-colors ${
                  view === v
                    ? "bg-[#1a1a1a] text-white"
                    : "text-[#666] hover:text-[#1a1a1a]"
                }`}
                aria-label={`${v} view`}
                aria-pressed={view === v}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Date strip (day view) */}
          {view === "day" && uniqueDates.length > 0 && (
            <div className="flex gap-1 overflow-x-auto flex-shrink min-w-0">
              {uniqueDates.map((d) => {
                const label = new Date(d + "T00:00:00");
                const isSelected = d === selectedDate;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(d)}
                    className={`flex-shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-[#1a1a1a] text-white"
                        : "bg-white border border-[#E8E2D8] text-[#666] hover:border-[#B5C8E8]"
                    }`}
                    aria-label={d}
                    aria-pressed={isSelected}
                  >
                    {label.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </button>
                );
              })}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Copy link + refresh */}
          <div className="flex-shrink-0 flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-lg border border-[#E8E2D8] bg-white text-[#666] hover:text-[#1a1a1a] transition-colors"
              aria-label="Refresh trip"
              title="Refresh"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <CopyLinkButton secret={secret} />
          </div>
        </div>
      </header>

      {/* ── Share framing (below header) ────────────────────────────────────── */}
      {/* Shown inline in the CopyLinkButton context — framing in honest-framing section */}

      {/* ── Trip details card ────────────────────────────────────────────────── */}
      {(trip.details || detailsExpanded) && (
        <div className="flex-shrink-0 bg-white border-b border-[#E8E2D8] px-4 py-2">
          <button
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#888] uppercase tracking-wide mb-1"
            aria-expanded={detailsExpanded}
          >
            <span>Trip Details</span>
            <span>{detailsExpanded ? "▲" : "▼"}</span>
          </button>
          {!detailsExpanded ? (
            <p
              className="text-sm text-[#444] line-clamp-2 cursor-pointer"
              onClick={() => setDetailsExpanded(true)}
            >
              {trip.details || "Tap to add trip notes, weather, what to bring…"}
            </p>
          ) : (
            <textarea
              value={trip.details}
              onChange={(e) => handleDetailsChange(e.target.value)}
              className="w-full text-sm text-[#444] bg-transparent focus:outline-none resize-none min-h-[80px]"
              placeholder="Weather, what to bring, dress code, general reminders…"
              aria-label="Trip details"
            />
          )}
        </div>
      )}
      {!trip.details && !detailsExpanded && (
        <div className="flex-shrink-0 px-4 py-1 border-b border-[#E8E2D8]">
          <button
            onClick={() => setDetailsExpanded(true)}
            className="text-xs text-[#aaa] hover:text-[#666]"
            aria-label="Open Trip Details"
          >
            + Add trip details (weather, what to bring…)
          </button>
        </div>
      )}

      {/* ── Honest framing strip ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-[#FFF8F0] border-b border-[#E8E2D8] px-4 py-1.5 flex items-center justify-between gap-2">
        <p className="text-xs text-[#888]">
          Anyone with this link can view and edit — share only with your travel companions.
        </p>
        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            onClick={() => setShowPastePanel(true)}
            className="text-xs text-[#666] hover:text-[#1a1a1a] underline"
          >
            Paste itinerary
          </button>
          {confirmedEvents.length > 0 && (
            <button
              onClick={handleBulkIcs}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Add all confirmed (.ics)
            </button>
          )}
        </div>
      </div>

      {/* ── Paste import panel (when shown) ──────────────────────────────────── */}
      {showPastePanel && (
        <div className="flex-shrink-0 bg-white border-b border-[#E8E2D8] px-4 py-4 max-h-[80vh] overflow-y-auto">
          <PasteImportPanel
            tripName={trip.name}
            onConfirm={handlePasteConfirmWithNameCheck}
            onCancel={() => setShowPastePanel(false)}
            participant={participant}
          />
        </div>
      )}

      {/* ── Calendar content (scrollable) ─────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {view === "day" && selectedDate && (
          <DayGrid
            date={selectedDate}
            events={activeEvents}
            onEventTap={handleEventTap}
            onSlotTap={handleSlotTap}
          />
        )}
        {view === "day" && !selectedDate && (
          <div className="p-4 text-[#888] text-sm">
            No dates yet. Paste an itinerary or add an event.
          </div>
        )}
        {view === "week" && (
          <div className="h-full overflow-y-auto">
            <WeekView
              dates={availableDates}
              events={activeEvents}
              selectedDate={selectedDate}
              onDateSelect={(d) => { setSelectedDate(d); setView("day"); }}
              onEventTap={handleEventTap}
            />
          </div>
        )}
        {view === "month" && (
          <div className="h-full overflow-y-auto">
            <MonthView
              dates={availableDates}
              events={activeEvents}
              selectedDate={selectedDate}
              onDateSelect={(d) => { setSelectedDate(d); setView("day"); }}
              onEventTap={handleEventTap}
            />
          </div>
        )}
      </div>

      {/* ── Add event FAB ─────────────────────────────────────────────────────── */}
      {view === "day" && selectedDate && !showPastePanel && (
        <div className="flex-shrink-0 absolute bottom-4 right-4 z-10">
          <button
            onClick={() => handleSlotTap(9 * 60)}
            className="w-12 h-12 bg-[#1a1a1a] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#333] transition-colors"
            aria-label="Add event"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {showNamePrompt && (
        <NamePromptModal onConfirm={handleNameConfirm} />
      )}

      {selectedEvent && (
        <EventBottomSheet
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEventEdit}
          onDelete={handleEventDelete}
          onConfirm={handleEventConfirm}
          onAddToCalendar={handleAddToCalendar}
        />
      )}

      {editingEvent && (
        <EventEditSheet
          event={editingEvent}
          dates={availableDates}
          onSave={handleEventSave}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function getUniqueDates(events: TripEvent[]): string[] {
  const dates = new Set<string>();
  for (const ev of events) {
    if (!ev.deletedAt && ev.date) dates.add(ev.date);
  }
  return Array.from(dates).sort();
}

// Suppress unused import warning for AUTHOR_COLORS
void AUTHOR_COLORS;
