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
// H2: name is optional — the modal shows a Skip button and can be dismissed.
// The paste import is committed BEFORE this modal appears, so dismissing/skipping
// never loses the parsed events.
function NamePromptModal({
  onConfirm,
  onSkip,
}: {
  onConfirm: (name: string) => void;
  onSkip: () => void;
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
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-bold">What&rsquo;s your name?</h2>
          {/* H2: Skip dismisses without losing any data */}
          <button
            onClick={onSkip}
            className="text-sm text-[#aaa] hover:text-[#666] ml-4 mt-0.5"
            aria-label="Skip name entry"
          >
            Skip
          </button>
        </div>
        <p className="text-sm text-[#666] mb-4">
          So others can see who made changes. You can always set this later.
        </p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Joanne"
          className="w-full border border-[#E8E2D8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#B5C8E8]"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (value.trim()) onConfirm(value.trim());
              else onSkip();
            }
            if (e.key === "Escape") onSkip();
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
// C: flush-then-confirm: caller passes onFlush which awaits the save before copy
function CopyLinkButton({ secret, onFlush }: { secret: string; onFlush: () => Promise<void> }) {
  // "idle" | "flushing" | "copied" | "failed"
  const [state, setState] = useState<"idle" | "flushing" | "copied" | "failed">("idle");
  const [showFallback, setShowFallback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/t/${secret}`
      : `/t/${secret}`;

  async function handleCopy() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("flushing");
    // C: flush any pending save BEFORE copying
    try {
      await onFlush();
    } catch { /* ignore flush errors — still try to copy */ }

    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/t/${secret}`
        : `/t/${secret}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => {
          setState("copied");
          setShowFallback(false);
          timerRef.current = setTimeout(() => setState("idle"), 3000);
        },
        () => {
          setState("failed");
          setShowFallback(true);
          timerRef.current = setTimeout(() => { setState("idle"); setShowFallback(false); }, 8000);
        }
      );
    } else {
      setState("failed");
      setShowFallback(true);
      timerRef.current = setTimeout(() => { setState("idle"); setShowFallback(false); }, 8000);
    }
  }

  const copied = state === "copied";
  const flushing = state === "flushing";

  return (
    <div>
      {/* aria-live region: announces copy result to screen readers */}
      <div aria-live="polite" className="sr-only" role="status">
        {copied ? "Link copied to clipboard" : showFallback ? "Copy failed — select the link to copy manually" : flushing ? "Saving…" : ""}
      </div>
      <button
        aria-label="Copy invite link"
        onClick={() => { void handleCopy(); }}
        disabled={flushing}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
          copied
            ? "bg-green-100 border-green-300 text-green-800"
            : flushing
            ? "bg-[#FAF7F2] border-[#E8E2D8] text-[#aaa] cursor-wait"
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
        ) : flushing ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Saving…
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
      {/* Fallback for blocked clipboard — shown only when copy actually failed */}
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

const MAX_PASTE_CHARS = 50_000; // sane cap — prevents absurd payloads

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
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [step, setStep] = useState<"input" | "preview">("input");

  function handleLoadSample() {
    setText(EMILY_ITINERARY);
    setPasteError(null);
  }

  function handleTextChange(val: string) {
    if (val.length > MAX_PASTE_CHARS) {
      setPasteError(`Itinerary too long — please trim to under ${(MAX_PASTE_CHARS / 1000).toFixed(0)}k characters.`);
      setText(val.slice(0, MAX_PASTE_CHARS));
    } else {
      setPasteError(null);
      setText(val);
    }
  }

  function handleParse() {
    if (!text.trim()) return;
    const result = parseItinerary(text);
    // H1b: count total timed events across all days
    const totalEvents = result.days.reduce((sum, d) => sum + d.events.length, 0);
    if (totalEvents === 0) {
      // Show helpful inline message instead of silently showing empty calendar
      setPasteError(
        "Couldn't find any timed events. Try lines like:\n" +
        "  9:00 AM Coffee\n" +
        "  14:30 Lunch — Cafe Central\n" +
        "  1-2PM Uber to hotel\n\n" +
        "Make sure each day starts with a header like 'Friday May 1' or 'Day 1'."
      );
      return;
    }
    setPasteError(null);
    setPreview(result);
    setStep("preview");
  }

  // D: editable preview state — map from eventId to { title, startMinutes, endMinutes }
  const [editedEvents, setEditedEvents] = useState<Record<string, { title: string; startMinutes: number; endMinutes: number }>>({});

  function getEventValue(evId: string, field: "title" | "startMinutes" | "endMinutes", original: string | number) {
    const edits = editedEvents[evId];
    if (!edits) return original;
    return edits[field] ?? original;
  }

  function patchEvent(evId: string, patch: Partial<{ title: string; startMinutes: number; endMinutes: number }>) {
    setEditedEvents((prev) => ({ ...prev, [evId]: { ...prev[evId], ...patch } }));
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
          {preview.days.length !== 1 ? "s" : ""} will be added. Edit titles or times below before confirming.
        </p>
        {/* R4-3: surface skipped/unparseable lines so users know data was omitted */}
        {preview.skippedLines && preview.skippedLines.length > 0 && (
          <div role="status" className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            {preview.skippedLines.length} line{preview.skippedLines.length !== 1 ? "s" : ""} couldn&apos;t be read and {preview.skippedLines.length !== 1 ? "were" : "was"} skipped
            {preview.skippedLines.length <= 5 && (
              <ul className="mt-1 space-y-0.5">
                {preview.skippedLines.map((l, i) => (
                  <li key={i} className="font-mono text-amber-800 truncate">&ldquo;{l}&rdquo;</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <p className="text-xs text-[#aaa]">
          Events without an end time default to 1 hour. End time assumed (1h) is shown as "end time assumed".
        </p>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {preview.days.map((day) => {
            // D: show resolved date+weekday for each day
            let resolvedLabel = day.label;
            if (day.date) {
              const d = new Date(day.date + "T00:00:00");
              const dow = d.toLocaleDateString("en-US", { weekday: "short" });
              const mon = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              resolvedLabel = `${day.label} → ${dow}, ${mon}`;
            }
            return (
              <div key={day.date + day.label}>
                <h3 className="text-sm font-semibold text-[#1a1a1a] mb-1">{resolvedLabel}</h3>
                {/* R5-1: non-destructive weekday mismatch note — date is kept authoritative */}
                {day.weekdayMismatch && (
                  <p className="text-xs text-amber-600 mb-1">{day.weekdayMismatch}</p>
                )}
                <ul className="space-y-1">
                  {day.events.map((ev) => {
                    const currentTitle = (getEventValue(ev.id, "title", ev.title) as string);
                    const currentStart = (getEventValue(ev.id, "startMinutes", ev.startMinutes) as number);
                    const currentEnd = (getEventValue(ev.id, "endMinutes", ev.endMinutes) as number);
                    // D: disclose 1h assumption
                    const wasPointEvent = ev.endMinutes !== ev.startMinutes
                      ? false
                      : (currentEnd - currentStart) === 60;
                    // Actually: original endMinutes is already patched to start+60 for point events
                    // We can detect if endMinutes == startMinutes+60 by storing original. Simple heuristic:
                    // The parser sets endMinutes = startMinutes+60 for point events. We disclose when
                    // there's no explicit end time (endMinutes === startMinutes in original ev from parser,
                    // but parseItinerary already sets endMinutes = start+60). So we look for a "1h" note:
                    // The original ParsedEvent has startMinutes; if endMinutes - startMinutes === 60
                    // and the source line only had a single time (not a range), we should disclose.
                    // Since we can't tell from the parsed result alone, show disclosure when end = start+60.
                    const isDefaultHour = currentEnd - currentStart === 60;
                    void wasPointEvent;

                    const hours24 = Array.from({ length: 24 }, (_, i) => i);
                    const mins15 = [0, 15, 30, 45];

                    return (
                      <li
                        key={ev.id}
                        className="bg-white border border-[#E8E2D8] rounded-lg px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {/* Editable start time */}
                          <select
                            value={currentStart}
                            onChange={(e) => {
                              const ns = parseInt(e.target.value);
                              patchEvent(ev.id, { startMinutes: ns, endMinutes: Math.max(ns + 15, currentEnd) });
                            }}
                            className="text-xs border border-[#E8E2D8] rounded px-1 py-0.5 bg-[#FAF7F2] text-[#444]"
                            aria-label="Start time"
                          >
                            {hours24.flatMap((h) => mins15.map((m) => {
                              const val = h * 60 + m;
                              const label = minutesToDisplay(val);
                              return <option key={val} value={val}>{label}</option>;
                            }))}
                          </select>
                          <span className="text-[#aaa] text-xs">–</span>
                          {/* Editable end time */}
                          <select
                            value={currentEnd}
                            onChange={(e) => patchEvent(ev.id, { endMinutes: parseInt(e.target.value) })}
                            className="text-xs border border-[#E8E2D8] rounded px-1 py-0.5 bg-[#FAF7F2] text-[#444]"
                            aria-label="End time"
                          >
                            {hours24.flatMap((h) => mins15.map((m) => {
                              const val = h * 60 + m;
                              const label = minutesToDisplay(val);
                              return <option key={val} value={val}>{label}</option>;
                            }))}
                          </select>
                          {isDefaultHour && (
                            <span className="text-[#aaa] text-xs italic">end time assumed</span>
                          )}
                        </div>
                        {/* Editable title */}
                        <input
                          type="text"
                          value={currentTitle}
                          onChange={(e) => patchEvent(ev.id, { title: e.target.value })}
                          className="w-full text-sm text-[#1a1a1a] bg-transparent border-b border-[#E8E2D8] focus:outline-none focus:border-[#B5C8E8] pb-0.5"
                          aria-label="Event title"
                        />
                        {ev.url && (
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-block text-blue-600 underline text-xs break-all"
                          >
                            {ev.url}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Confirm / Cancel */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              // D: apply any edits from editedEvents before confirming
              const patched: typeof preview = {
                ...preview,
                days: preview.days.map((day) => ({
                  ...day,
                  events: day.events.map((ev) => ({
                    ...ev,
                    title: (getEventValue(ev.id, "title", ev.title) as string),
                    startMinutes: (getEventValue(ev.id, "startMinutes", ev.startMinutes) as number),
                    endMinutes: (getEventValue(ev.id, "endMinutes", ev.endMinutes) as number),
                  })),
                })),
              };
              onConfirm(patched);
            }}
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
            Events will be added and you can set your name after.
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
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={"Friday May 1\n12:30PM Emily lands\n1-2PM Uber to 123 Main St\n2-4PM unpack\n..."}
        className="w-full border border-[#E8E2D8] rounded-xl px-4 py-3 text-sm min-h-[200px] resize-y focus:outline-none focus:ring-2 focus:ring-[#B5C8E8] bg-white font-mono leading-relaxed"
        aria-label="Paste itinerary text"
      />
      {pasteError && (
        <div role="alert" className="text-xs text-[#a00] bg-red-50 border border-red-200 rounded-xl px-4 py-3 whitespace-pre-wrap font-mono leading-relaxed">
          {pasteError}
        </div>
      )}
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
          {/* H4: per-event Google add is the single-event path — labeled honestly */}
          <button
            onClick={() => onAddToCalendar(event)}
            className="w-full border border-blue-300 text-blue-700 rounded-xl py-2.5 font-medium hover:bg-blue-50 transition-colors"
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

/**
 * Compute non-overlapping column layout for events.
 * Returns a map from event.id → { col, totalCols } so overlapping events
 * render side-by-side rather than stacking on top of each other.
 */
function computeEventColumns(events: TripEvent[]): Map<string, { col: number; totalCols: number }> {
  // Sort by start time, then by id for stable ordering
  const sorted = [...events].sort((a, b) =>
    a.startMinutes !== b.startMinutes ? a.startMinutes - b.startMinutes : a.id.localeCompare(b.id)
  );

  // Assign columns greedily
  const result = new Map<string, { col: number; totalCols: number }>();
  // tracks end minute of last event placed in each column
  const colEnds: number[] = [];

  for (const ev of sorted) {
    let placed = false;
    for (let c = 0; c < colEnds.length; c++) {
      if (ev.startMinutes >= colEnds[c]) {
        result.set(ev.id, { col: c, totalCols: 0 }); // totalCols set after
        colEnds[c] = ev.endMinutes;
        placed = true;
        break;
      }
    }
    if (!placed) {
      result.set(ev.id, { col: colEnds.length, totalCols: 0 });
      colEnds.push(ev.endMinutes);
    }
  }

  const numCols = colEnds.length || 1;

  // Determine totalCols for each event: how many columns overlap its time range
  for (const ev of sorted) {
    const entry = result.get(ev.id);
    if (!entry) continue;
    // Count how many unique columns are used by events that overlap with ev
    const overlappingCols = new Set<number>();
    for (const other of sorted) {
      if (other.startMinutes < ev.endMinutes && other.endMinutes > ev.startMinutes) {
        const otherEntry = result.get(other.id);
        if (otherEntry) overlappingCols.add(otherEntry.col);
      }
    }
    entry.totalCols = Math.max(overlappingCols.size, 1);
  }

  void numCols;
  return result;
}

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

  const activeEvents = events.filter((e) => !e.deletedAt && e.date === date);

  // A/B: On date change, auto-scroll so the first event on that day is near
  // the top of the visible scroll area (1 hour of padding above). Falls back to 8am.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    // Use rAF so the DOM has settled and clientHeight is accurate
    const raf = requestAnimationFrame(() => {
      if (!gridRef.current) return;
      const dayEvents = events.filter((e) => !e.deletedAt && e.date === date);
      const sorted = [...dayEvents].sort((a, b) => a.startMinutes - b.startMinutes);
      const firstEvent = sorted[0];
      const scrollToMinute = firstEvent
        ? Math.max(firstEvent.startMinutes - 60, DAY_START_HOUR * 60)
        : 8 * 60;
      const scrollToHour = scrollToMinute / 60 - DAY_START_HOUR;
      gridRef.current.scrollTop = scrollToHour * HOUR_HEIGHT;
    });
    return () => cancelAnimationFrame(raf);
  }, [date, events]);

  function minutesToTop(minutes: number): number {
    return ((minutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT;
  }

  function minutesToHeight(startMinutes: number, endMinutes: number): number {
    return ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
  }

  // A: Track touch start to distinguish tap vs swipe
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const TAP_THRESHOLD_PX = 8; // max movement (px) to count as a tap
  const TAP_THRESHOLD_MS = 400; // max duration (ms) to count as a tap

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = Math.abs(t.clientX - touchStartRef.current.x);
    const dy = Math.abs(t.clientY - touchStartRef.current.y);
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Not a tap: movement exceeded threshold or too slow
    if (dx > TAP_THRESHOLD_PX || dy > TAP_THRESHOLD_PX || dt > TAP_THRESHOLD_MS) return;

    // A: Check it's not on an event block
    const target = e.target as HTMLElement;
    if (target.closest("[data-event-block]")) return;

    // It's a tap on empty slot
    const rect = gridRef.current!.getBoundingClientRect();
    const y = t.clientY - rect.top + (gridRef.current?.scrollTop ?? 0);
    const minutesFromStart = Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15;
    const totalMinutes = (DAY_START_HOUR * 60) + minutesFromStart;
    onSlotTap(Math.max(0, Math.min(23 * 60, totalMinutes)));
  }

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>) {
    // Don't fire if an event block was clicked
    if ((e.target as HTMLElement).closest("[data-event-block]")) return;
    // On touch devices, touchEnd handles this; on pointer devices use click
    // Skip if this came from a touch sequence (nativeTouches)
    if ((e as unknown as { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities?.firesTouchEvents) return;
    const rect = gridRef.current!.getBoundingClientRect();
    const y = e.clientY - rect.top + (gridRef.current?.scrollTop ?? 0);
    const minutesFromStart = Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15;
    const totalMinutes = (DAY_START_HOUR * 60) + minutesFromStart;
    onSlotTap(Math.max(0, Math.min(23 * 60, totalMinutes)));
  }

  // P3-1: Compute per-event column layout to avoid overlapping blocks
  const columnLayout = computeEventColumns(activeEvents);
  // Left gutter width for hour labels (in pixels, matches "left-12" = 48px)
  const GUTTER_PX = 48;
  const RIGHT_PAD_PX = 8;

  return (
    // A: The grid is the ONLY scrollable region in day view. It must have a
    // bounded height (h-full fills the flex parent which is bounded) and
    // overflow-y:auto so the 1080px+ content height gives real scroll range.
    <div
      ref={gridRef}
      className="day-grid-scroll overflow-y-auto h-full"
      style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      aria-label="Day schedule"
    >
      {/* Grid background: fixed intrinsic content height that EXCEEDS viewport */}
      <div
        className="relative"
        style={{ height: `${totalHeight}px` }}
        onClick={handleGridClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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

        {/* Event blocks — laid out in side-by-side columns when overlapping */}
        {activeEvents.map((event) => {
          const top = minutesToTop(event.startMinutes);
          const height = Math.max(
            minutesToHeight(event.startMinutes, event.endMinutes),
            22
          );
          const color = getAuthorColor(event.authorId);
          const isProposed = event.status === "proposed";
          const layout = columnLayout.get(event.id) ?? { col: 0, totalCols: 1 };
          const { col, totalCols } = layout;

          // Calculate left/width based on column position
          // Available width after gutter and right padding
          // We use inline style with calc to respect the actual container width
          const colWidthPct = (1 / totalCols) * 100;
          const gutterAndPad = GUTTER_PX + RIGHT_PAD_PX;
          // Each column gets an equal share of available width (after gutter).
          // We express this as percentage of total container minus gutter+pad.
          // Use absolute pixel offset from gutter + fractional width.
          const colGap = 2; // px gap between side-by-side events
          // left = GUTTER_PX + col * ((container - gutter - rightpad) / totalCols)
          // expressed with calc:
          const leftCalc = totalCols === 1
            ? `${GUTTER_PX}px`
            : `calc(${GUTTER_PX}px + ${col} * (100% - ${gutterAndPad}px - ${(totalCols - 1) * colGap}px) / ${totalCols} + ${col * colGap}px)`;
          const widthCalc = totalCols === 1
            ? `calc(100% - ${GUTTER_PX + RIGHT_PAD_PX}px)`
            : `calc((100% - ${gutterAndPad}px - ${(totalCols - 1) * colGap}px) / ${totalCols})`;

          void colWidthPct;

          return (
            <div
              key={event.id}
              data-event-block="true"
              data-event-id={event.id}
              className={`absolute rounded-lg px-2 py-1 cursor-pointer select-none transition-opacity ${
                isProposed ? "event-proposed border-2" : "event-confirmed border-l-4"
              }`}
              style={{
                top: `${top}px`,
                height: `${height}px`,
                left: leftCalc,
                width: widthCalc,
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

// ── Month view — real calendar month grid ──────────────────────────────────────
// Shows a proper month grid (Sun–Sat) with dot indicators for trip event days.
// Tapping a day that has events switches to Day view for that date.
function MonthView({
  dates,
  events,
  selectedDate,
  onDateSelect,
}: {
  dates: string[];
  events: TripEvent[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onEventTap: (event: TripEvent) => void;
}) {
  if (dates.length === 0) return <div className="p-4 text-[#888]">No dates yet.</div>;

  // Build a set of trip dates and event counts
  const eventsByDate: Record<string, TripEvent[]> = {};
  for (const ev of events) {
    if (!ev.deletedAt) {
      (eventsByDate[ev.date] ??= []).push(ev);
    }
  }
  const tripDateSet = new Set(dates);

  // Determine which months to show based on trip date range
  const firstDate = new Date(dates[0] + "T00:00:00");
  const lastDate = new Date(dates[dates.length - 1] + "T00:00:00");

  // Build list of months to render
  const months: Array<{ year: number; month: number }> = [];
  let cur = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const end = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
  while (cur <= end) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="p-4 space-y-6 overflow-y-auto">
      {months.map(({ year, month }) => {
        const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        // Build grid cells: leading empty cells + days of month
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: Array<number | null> = [
          ...Array(firstDayOfWeek).fill(null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ];
        // Pad trailing cells to complete the final week row
        while (cells.length % 7 !== 0) cells.push(null);

        return (
          <div key={`${year}-${month}`}>
            <h3 className="text-sm font-bold text-[#1a1a1a] mb-2">{monthLabel}</h3>
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 mb-1">
              {DOW_LABELS.map((d) => (
                <div key={d} className="text-center text-xs text-[#aaa] font-medium py-1">
                  {d}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} />;
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isTripDay = tripDateSet.has(dateStr);
                const isSelected = dateStr === selectedDate;
                const dayEvts = eventsByDate[dateStr] ?? [];
                const hasConfirmed = dayEvts.some((e) => e.status === "confirmed");
                const count = dayEvts.length;

                return (
                  <button
                    key={dateStr}
                    onClick={() => isTripDay ? onDateSelect(dateStr) : undefined}
                    disabled={!isTripDay}
                    className={`relative flex flex-col items-center justify-start py-1 rounded-lg transition-colors
                      ${isTripDay ? "cursor-pointer hover:bg-[#F0EDE8]" : "cursor-default opacity-30"}
                      ${isSelected ? "bg-[#1a1a1a] text-white hover:bg-[#333]" : ""}
                    `}
                    aria-label={isTripDay ? `${dateStr}, ${count} event${count !== 1 ? "s" : ""}` : undefined}
                    aria-pressed={isSelected || undefined}
                  >
                    <span className={`text-sm font-medium leading-none ${isSelected ? "text-white" : isTripDay ? "text-[#1a1a1a]" : "text-[#bbb]"}`}>
                      {day}
                    </span>
                    {/* Event dot indicators */}
                    {isTripDay && count > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: isSelected ? "white" : hasConfirmed ? "#16a34a" : "#B5C8E8" }}
                        />
                        {count > 1 && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isSelected ? "white" : "#B5C8E8" }}
                          />
                        )}
                        {count > 3 && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isSelected ? "white" : "#B5C8E8" }}
                          />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
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
  // R4-4: track whether the user has already skipped the name prompt this session
  const hasSkippedNameRef = useRef(false);
  const [selectedEvent, setSelectedEvent] = useState<TripEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<(Partial<TripEvent> & { id: string }) | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tripRef = useRef<TripData | null>(null);
  // C: track in-flight save promise so Copy can await it
  const saveInFlightRef = useRef<Promise<void> | null>(null);

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
    // C: don't show "Saving…" until the fetch actually fires (after debounce)
    setSaveStatus("idle");
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus("saving");
      void doSave(updated);
    }, 2500);
  }

  // C: immediate flush for structural mutations (paste-import, add/delete/confirm event)
  function flushSave(updated: TripData): Promise<void> {
    if (!serverHydrated) return Promise.resolve();
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setSaveStatus("saving");
    return doSave(updated);
  }

  // C: flushPending — flush any pending debounce OR await any in-flight save
  function flushPending(): Promise<void> {
    // If there's a pending debounced timer, cancel it and flush now
    if (saveTimerRef.current && tripRef.current && serverHydrated) {
      return flushSave(tripRef.current);
    }
    // If a save is already in-flight, wait for it to complete
    if (saveInFlightRef.current) {
      return saveInFlightRef.current;
    }
    return Promise.resolve();
  }

  function doSave(data: TripData, beacon = false): Promise<void> {
    const body = JSON.stringify(data);
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(`/api/trip/${secret}`, body);
      return Promise.resolve();
    }
    // C: track the in-flight promise so Copy can await it
    const p = fetch(`/api/trip/${secret}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    })
      .then((res) => {
        if (res.ok) setSaveStatus("saved");
        else setSaveStatus("error");
      })
      .catch(() => setSaveStatus("error"))
      .finally(() => {
        if (saveInFlightRef.current === p) saveInFlightRef.current = null;
      });
    saveInFlightRef.current = p;
    return p;
  }

  // Flush on blur/visibilitychange/beforeunload
  useEffect(() => {
    function flush() {
      if (saveTimerRef.current && tripRef.current && serverHydrated) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        void doSave(tripRef.current, true);
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
    } else if (hasSkippedNameRef.current) {
      // R4-4: user already skipped the name prompt this session — don't re-prompt.
      // Run the action attributed to "Guest" (the auto-created participant).
      action();
    } else {
      setPendingAction(() => action);
      setShowNamePrompt(true);
    }
  }

  function handleNameConfirm(name: string) {
    // H2: preserve existing participantId if one was auto-assigned (e.g. "Guest")
    // so events attributed to the auto-id remain associated with the confirmed name.
    const existingId = participant?.id ?? generateId();
    const p: Participant = { id: existingId, name };
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
  // C: immediate=true flushes the save immediately (for structural mutations).
  // We compute the update outside setTrip to avoid side-effects in the updater function.
  function updateTrip(updater: (t: TripData) => TripData, immediate = false) {
    const prev = tripRef.current;
    if (!prev) return;
    const updated = updater(prev);
    tripRef.current = updated;
    setTrip(updated);
    if (immediate) {
      void flushSave(updated);
    } else {
      scheduleSave(updated);
    }
  }

  // ── Paste import confirm ──────────────────────────────────────────────────────
  // H2: The paste-import ALWAYS commits, regardless of whether a name is set.
  // If no participant exists, events are attributed to "Guest" and the name prompt
  // is shown AFTER committing (non-blocking). The import is never lost.
  function handlePasteConfirmWithNameCheck(result: ParseResult) {
    // Read participant from state or localStorage
    let p = participant;
    if (!p) {
      try {
        const raw = window.localStorage.getItem(participantKey(secret));
        if (raw) p = JSON.parse(raw) as Participant;
      } catch { /* ignore */ }
    }
    // H2: if still no participant, create a temporary "Guest" participant
    // and commit the import immediately — do NOT gate on name entry
    if (!p) {
      const guestId = generateId();
      p = { id: guestId, name: "Guest" };
      // Persist the guest participant so returning visits are consistent
      try {
        window.localStorage.setItem(participantKey(secret), JSON.stringify(p));
      } catch { /* ignore */ }
      setParticipant(p);
      // Show the name prompt AFTER committing, as a non-blocking invitation to personalize
      // (using setTimeout so the state updates + import commit happen first).
      // R5-2: only show if the user hasn't already skipped the name prompt this session.
      setTimeout(() => {
        if (!hasSkippedNameRef.current) {
          setShowNamePrompt(true);
        }
      }, 600);
    }

    handlePasteImportWithParticipant(result, p);
  }

  function handlePasteImportWithParticipant(result: ParseResult, resolvedParticipant?: Participant) {
    const theParticipant = resolvedParticipant ?? participant ?? { id: generateId(), name: "Guest" };
    const now = Date.now();
    // C: immediate flush — paste-import is a structural mutation
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
    }, true /* immediate flush */);
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
      // C: immediate flush for structural mutation
      updateTrip((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.id === id ? { ...e, deletedAt: now, updatedAt: now } : e
        ),
        updatedAt: now,
      }), true);
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
      // C: immediate flush for structural mutation
      updateTrip((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.id === id
            ? { ...e, status: "confirmed", confirmedBy: confirmerName, updatedAt: now }
            : e
        ),
        updatedAt: now,
      }), true);
    });
  }

  function handleEventSave(ev: Partial<TripEvent> & { id: string }) {
    setEditingEvent(null);
    const p = participant;
    const now = Date.now();
    // C: immediate flush for structural mutation (add/edit event)
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
    }, true);
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
    // E: export confirmed if any; otherwise export all active events
    const confirmed = trip.events.filter((e) => !e.deletedAt && e.status === "confirmed");
    const toExport = confirmed.length > 0
      ? confirmed
      : trip.events.filter((e) => !e.deletedAt);
    if (toExport.length === 0) return;
    const icsContent = generateIcs(toExport);
    downloadIcs(icsContent, `${trip.name.replace(/[^a-z0-9]/gi, "-")}.ics`);
  }

  function handleDetailsChange(details: string) {
    updateTrip((prev) => ({ ...prev, details, updatedAt: Date.now() }));
  }

  function handleTripNameChange(name: string) {
    // Cap trip name at 120 chars client-side (mirrors API)
    updateTrip((prev) => ({ ...prev, name: name.slice(0, 120), updatedAt: Date.now() }));
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
      <header className="flex-shrink-0 bg-[#FAF7F2] border-b border-[#E8E2D8] px-4 py-1.5" style={{ maxHeight: "112px" }}>
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

        {/* Second row: view switcher + refresh + copy-invite (NO date chips here) */}
        {/* R5-3: date chips moved to their own dedicated row below so they NEVER share
            horizontal space with the toggle/action buttons at 390px. */}
        <div className="flex items-center gap-2 mt-1 min-h-0 w-full">
          {/* View switcher — isolated so the bg-[#1a1a1a] active button doesn't bleed
              outside the rounded container and produce a dark sliver at 390px. */}
          <div className="flex-shrink-0 flex rounded-lg bg-white text-xs border border-[#E8E2D8] overflow-hidden">
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

          {/* Flexible spacer */}
          <div className="flex-1" />

          {/* Copy link + refresh — always visible at far right, never squeezed */}
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
            {/* C: flush-then-confirm — flushPending awaits any pending debounced save */}
            <CopyLinkButton secret={secret} onFlush={flushPending} />
          </div>
        </div>

        {/* Third row: date chips (day view only) — OWN full-width row, scrolls freely */}
        {/* R5-3: structural fix — date chips are on a dedicated row so they never collide
            with the toggle/action buttons at any viewport width. Dark active chip is fully
            contained; no overflow-hidden ancestor clips it here. */}
        {view === "day" && uniqueDates.length > 0 && (
          <div className="flex gap-1 overflow-x-auto mt-1 w-full" style={{ scrollbarWidth: "none" }}>
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
      </header>

      {/* ── Share framing (below header) ────────────────────────────────────── */}
      {/* Shown inline in the CopyLinkButton context — framing in honest-framing section */}

      {/* ── Trip details card (collapsed on mobile by default — F) ──────────── */}
      <div className="flex-shrink-0 bg-white border-b border-[#E8E2D8] px-4 py-1.5">
        <button
          onClick={() => setDetailsExpanded(!detailsExpanded)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[#888] uppercase tracking-wide"
          aria-expanded={detailsExpanded}
          aria-label="Toggle Trip Details"
        >
          <span>Trip Details {trip.details && !detailsExpanded ? <span className="normal-case font-normal text-[#aaa]">— tap to expand</span> : ""}</span>
          <span>{detailsExpanded ? "▲" : "▼"}</span>
        </button>
        {detailsExpanded && (
          <div className="mt-1">
            <textarea
              value={trip.details}
              onChange={(e) => handleDetailsChange(e.target.value)}
              className="w-full text-sm text-[#444] bg-transparent focus:outline-none resize-none min-h-[60px]"
              placeholder="Weather, what to bring, dress code, general reminders…"
              aria-label="Trip details"
            />
          </div>
        )}
        {!detailsExpanded && trip.details && (
          <p
            className="text-xs text-[#888] line-clamp-1 cursor-pointer mt-0.5"
            onClick={() => setDetailsExpanded(true)}
          >
            {trip.details}
          </p>
        )}
      </div>

      {/* ── Compact action strip (honest framing + paste + export — F/E/H4) ──────── */}
      {/* R4-2: flex-wrap so the strip wraps to a second row on 390px instead of
          overflowing horizontally. No overflow-x-auto ancestor that would clip buttons. */}
      <div className="flex-shrink-0 bg-[#FFF8F0] border-b border-[#E8E2D8] px-3 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 w-full">
        {/* F: single small line for the framing — not a full banner */}
        <p className="text-xs text-[#aaa]">
          Anyone with this link can view &amp; edit
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-auto">
          <button
            onClick={() => setShowPastePanel(true)}
            className="text-xs text-[#666] hover:text-[#1a1a1a] underline whitespace-nowrap"
          >
            Paste itinerary
          </button>
          {/* E/H4: bulk .ics is the PRIMARY "add to calendar" path — show clearly. */}
          {activeEvents.length > 0 && (
            <button
              onClick={handleBulkIcs}
              className="text-xs text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
              aria-label="Save to calendar (.ics)"
              title={confirmedEvents.length > 0 ? "Download confirmed events as .ics (imports into Google/Apple/Outlook)" : "Download all events as .ics (imports into Google/Apple/Outlook)"}
            >
              Save to calendar (.ics)
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
      {/* A: flex-1 + min-h-0 gives a bounded height so DayGrid's h-full resolves */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === "day" && selectedDate && (
          // A: h-full passes the bounded height into DayGrid
          <div className="h-full">
            <DayGrid
              date={selectedDate}
              events={activeEvents}
              onEventTap={handleEventTap}
              onSlotTap={handleSlotTap}
            />
          </div>
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
        <NamePromptModal
          onConfirm={handleNameConfirm}
          onSkip={() => {
            // H2: dismissing the name prompt is safe — imports are committed before the prompt appears.
            // R4-4: mark that the user has skipped the name prompt this session so we don't re-prompt.
            hasSkippedNameRef.current = true;
            setShowNamePrompt(false);
            if (pendingAction) {
              pendingAction();
              setPendingAction(null);
            }
          }}
        />
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
