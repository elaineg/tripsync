"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  name: string; // may be "" for unnamed participants
}

// ── Event-state helper — ONE source of truth for styling (R3-3) ───────────────
// Maps event state + isOwn to a canonical set of style descriptors.
// Used in BOTH DayGrid and WeekView so all four view×breakpoint combos match.
function getEventStyle(status: "proposed" | "confirmed", isOwn: boolean): {
  isDashed: boolean;
  opacity: number;
  bgAlpha: string; // hex alpha suffix for backgroundColor
  classes: string; // tailwind classes for border
} {
  if (status === "confirmed") {
    // Confirmed: solid, full opacity, vivid
    return { isDashed: false, opacity: 1, bgAlpha: "dd", classes: "border-l-4" };
  }
  if (isOwn) {
    // Own/unconfirmed proposed: solid, full opacity, vivid (R3-2)
    return { isDashed: false, opacity: 1, bgAlpha: "dd", classes: "border-l-4" };
  }
  // Someone else's proposed: dashed, reduced opacity (Aisha approved semantics)
  return { isDashed: true, opacity: 0.65, bgAlpha: "88", classes: "border-2 border-dashed" };
}

// ── View types ─────────────────────────────────────────────────────────────────
type CalView = "day" | "week" | "month";

// ── Inline name-capture for first attributing action (R2-1) ───────────────────
// Shown ONLY at the moment of a collaborator's first confirm/propose — never on solo create.
// Renders as a portal at fixed coords so grid overflow never clips it (AF-4).
function InlineNameCapture({
  prompt,
  onConfirm,
  onSkip,
}: {
  prompt: string;
  onConfirm: (name: string) => void;
  onSkip: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const panel = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 px-4 pb-4 sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-label="Enter your name"
      onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}
    >
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-base font-bold">{prompt}</h2>
          <button onClick={onSkip} className="text-sm text-[#aaa] hover:text-[#666] ml-4" aria-label="Skip name entry">
            Skip
          </button>
        </div>
        <p className="text-xs text-[#888] mb-3">So others can see who confirmed.</p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your name"
          className="w-full border border-[#E8E2D8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B5C8E8]"
          aria-label="Your name"
          onKeyDown={(e) => {
            if (e.key === "Enter") { if (value.trim()) onConfirm(value.trim()); else onSkip(); }
            if (e.key === "Escape") onSkip();
          }}
        />
        <div className="flex gap-2 mt-3">
          <button
            className="flex-1 bg-[#1a1a1a] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#333] disabled:opacity-40 transition-colors"
            disabled={!value.trim()}
            onClick={() => value.trim() && onConfirm(value.trim())}
          >
            Confirm as {value.trim() || "…"}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
}

// ── Name prompt modal ──────────────────────────────────────────────────────────
// R1-2: Name is optional — shown ONLY post-import or from header chip (never blocks create).
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
// R1-3: currentParticipantId is passed so we can detect "own" events and never
// show "Proposed by Someone" / Confirm button to the event's own creator.
// R2-1: currentParticipantName passed for viewer-relative display.
function EventBottomSheet({
  event,
  onClose,
  onEdit,
  onDelete,
  onConfirm,
  onAddToCalendar,
  currentParticipantId,
  currentParticipantName,
}: {
  event: TripEvent;
  onClose: () => void;
  onEdit: (event: TripEvent) => void;
  onDelete: (id: string) => void;
  onConfirm: (id: string) => void;
  onAddToCalendar: (event: TripEvent) => void;
  currentParticipantId: string | null;
  currentParticipantName: string | null;
}) {
  const color = getAuthorColor(event.authorId);
  // R1-3: "own" means the current device created this event (by authorId match)
  const isOwnEvent = currentParticipantId !== null && event.authorId === currentParticipantId;
  // R1-3: Only show Confirm button for OTHERS' proposed events, not own
  const showConfirm = event.status === "proposed" && !isOwnEvent;

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
        {/* R3-1/R2-1: Status attribution — viewer-relative, ID-based */}
        {event.status === "confirmed" ? (
          <div className="flex items-center gap-1.5 text-sm text-green-700 mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {/* R2-1: viewer-relative — "you" if confirmer name matches viewer's name */}
            Confirmed by {
              event.confirmedBy
                ? (currentParticipantName && event.confirmedBy === currentParticipantName
                    ? "you"
                    : event.confirmedBy)
                : "someone"
            }
          </div>
        ) : isOwnEvent ? (
          <p className="text-xs text-[#5a8a5a] mb-4">Added by you</p>
        ) : (
          // R3-1: for non-own events, show author name or neutral label — NEVER "you" for a non-self actor
          <p className="text-xs text-[#aaa] mb-4">
            Proposed by{" "}
            {event.authorName && event.authorName !== "you" && event.authorName !== "Guest"
              ? event.authorName
              : "the organizer"}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {/* R1-3: Only show Confirm for others' proposed events */}
          {showConfirm && (
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

// ── Custom time picker (R3-4 — zero native <select> in editor) ───────────────
// Styled with +/- stepper buttons and a read-only display — completely replaces <select>.
// The display looks like a pill button row, consistent with the rest of the custom UI.
function CustomTimePicker({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  ariaPrefix,
}: {
  hour: string;
  minute: string;
  onHourChange: (h: string) => void;
  onMinuteChange: (m: string) => void;
  ariaPrefix: string;
}) {
  const h = parseInt(hour);
  const m = parseInt(minute);
  const MINS = ["00", "15", "30", "45"];

  function prevHour() { onHourChange(((h - 1 + 24) % 24).toString()); }
  function nextHour() { onHourChange(((h + 1) % 24).toString()); }
  function prevMin() { onMinuteChange(MINS[((MINS.indexOf(minute) ?? 0) - 1 + 4) % 4]); }
  function nextMin() { onMinuteChange(MINS[((MINS.indexOf(minute) ?? 0) + 1) % 4]); }

  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? "am" : "pm";
  const displayHour = `${h12}${ampm}`;
  const displayMin = minute.padStart(2, "0");

  return (
    <div className="flex gap-1" aria-label={`${ariaPrefix} time`}>
      {/* Hour stepper */}
      <div className="flex items-center border border-[#E8E2D8] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={prevHour}
          className="px-2 py-2 text-[#666] hover:bg-[#F0EDE8] text-xs transition-colors"
          aria-label={`${ariaPrefix} hour decrease`}
        >‹</button>
        <span className="px-2 text-sm font-medium text-[#1a1a1a] min-w-[44px] text-center select-none">
          {displayHour}
        </span>
        <button
          type="button"
          onClick={nextHour}
          className="px-2 py-2 text-[#666] hover:bg-[#F0EDE8] text-xs transition-colors"
          aria-label={`${ariaPrefix} hour increase`}
        >›</button>
      </div>
      {/* Minute stepper */}
      <div className="flex items-center border border-[#E8E2D8] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={prevMin}
          className="px-2 py-2 text-[#666] hover:bg-[#F0EDE8] text-xs transition-colors"
          aria-label={`${ariaPrefix} minute decrease`}
        >‹</button>
        <span className="px-1.5 text-sm font-medium text-[#1a1a1a] min-w-[28px] text-center select-none">
          {displayMin}
        </span>
        <button
          type="button"
          onClick={nextMin}
          className="px-2 py-2 text-[#666] hover:bg-[#F0EDE8] text-xs transition-colors"
          aria-label={`${ariaPrefix} minute increase`}
        >›</button>
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
  // R3-4: date is now a free input (not a select from dates array)
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
            {/* R3-4: Use <input type="date"> — not a native <select> */}
            <input
              type="date"
              value={date}
              onChange={(e) => { if (e.target.value) setDate(e.target.value); }}
              className="w-full border border-[#E8E2D8] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B5C8E8] bg-white"
              aria-label="Event date"
            />
          </div>

          {/* R3-4: Custom-styled time pickers — zero native <select> in editor */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#888] mb-1">Start</label>
              <CustomTimePicker
                hour={startH}
                minute={startM}
                onHourChange={setStartH}
                onMinuteChange={setStartM}
                ariaPrefix="Start"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#888] mb-1">End</label>
              <CustomTimePicker
                hour={endH}
                minute={endM}
                onHourChange={setEndH}
                onMinuteChange={setEndM}
                ariaPrefix="End"
              />
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

// ── Drag hint localStorage key ─────────────────────────────────────────────────
const DRAG_HINT_KEY = "tripsync_drag_hint_dismissed";

// ── Quick-create popover (GCal-style, rendered as a PORTAL) ───────────────────
// AF-4: Must be a portal to document.body with fixed coords — NOT position:absolute
// inside the grid container — so overflow-hidden never clips it.
function QuickCreatePopover({
  anchorRect,    // bounding rect of the just-created event block (viewport-relative)
  startMinutes,
  endMinutes,
  onSave,
  onDismiss,
  onMoreOptions,
}: {
  anchorRect: DOMRect;
  startMinutes: number;
  endMinutes: number;
  onSave: (title: string, start: number, end: number) => void;
  onDismiss: () => void;
  onMoreOptions: (title: string, start: number, end: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(startMinutes);
  const [end, setEnd] = useState(endMinutes);
  // R4-1: derive hour/minute strings from minutes integer for CustomTimePicker
  const startH = Math.floor(start / 60).toString();
  const startM = (start % 60).toString().padStart(2, "0");
  const endH = Math.floor(end / 60).toString();
  const endM = (end % 60).toString().padStart(2, "0");
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Dismiss on click-outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onDismiss]);

  // AF-4: position popover at fixed coords — flip left/bottom if near viewport edge
  // R4-1: POPOVER_W/H enlarged to fit two CustomTimePicker rows (taller than old <select>s)
  const POPOVER_W = 300;
  const POPOVER_H = 260;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // Anchor to the right of the block; flip left if near right edge
  let left = anchorRect.right + 8;
  if (left + POPOVER_W > vw - 8) {
    left = anchorRect.left - POPOVER_W - 8;
  }
  if (left < 8) left = 8;

  // Anchor to the top of the block; flip up if near bottom edge
  let top = anchorRect.top;
  if (top + POPOVER_H > vh - 8) {
    top = vh - POPOVER_H - 8;
  }
  if (top < 8) top = 8;

  function handleSave() {
    // AF-2: empty title saves as "(New event)" — never silently discard the block
    const finalTitle = title.trim() || "(New event)";
    onSave(finalTitle, start, end);
  }

  const popover = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-label="Quick create event"
      className="fixed z-[200] bg-white border border-[#E8E2D8] rounded-2xl shadow-xl p-4 flex flex-col gap-3"
      style={{ left, top, width: POPOVER_W }}
    >
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Event title"
        className="w-full border border-[#E8E2D8] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B5C8E8]"
        aria-label="New event title"
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); handleSave(); }
          if (e.key === "Escape") { e.preventDefault(); onDismiss(); }
        }}
      />
      {/* R4-1: Custom time pickers — zero native <select> in the quick popover.
          Uses the same CustomTimePicker control as EventEditSheet (craft consistency). */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#888] w-10 flex-shrink-0">Start</span>
          <CustomTimePicker
            hour={startH}
            minute={startM}
            onHourChange={(h) => {
              const ns = parseInt(h) * 60 + parseInt(startM);
              setStart(ns);
              if (ns >= end) setEnd(ns + 60);
            }}
            onMinuteChange={(m) => {
              const ns = parseInt(startH) * 60 + parseInt(m);
              setStart(ns);
              if (ns >= end) setEnd(ns + 60);
            }}
            ariaPrefix="Quick start"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#888] w-10 flex-shrink-0">End</span>
          <CustomTimePicker
            hour={endH}
            minute={endM}
            onHourChange={(h) => setEnd(parseInt(h) * 60 + parseInt(endM))}
            onMinuteChange={(m) => setEnd(parseInt(endH) * 60 + parseInt(m))}
            ariaPrefix="Quick end"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          data-testid="quick-create-save"
          onClick={handleSave}
          className="flex-1 bg-[#1a1a1a] text-white rounded-xl py-2 text-sm font-semibold hover:bg-[#333] transition-colors"
        >
          Save
        </button>
        <button
          onClick={() => onMoreOptions(title.trim() || "(New event)", start, end)}
          className="flex-1 border border-[#E8E2D8] text-[#666] rounded-xl py-2 text-sm font-medium hover:border-[#aaa] transition-colors"
        >
          More
        </button>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(popover, document.body);
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

// State for drag-create / drag-move / drag-resize in the day grid
interface DragCreate {
  type: "create";
  startMinutes: number;
  currentMinutes: number;
}
interface DragMove {
  type: "move";
  eventId: string;
  originalStart: number;
  originalEnd: number;
  anchorOffsetMinutes: number; // where the pointer hit within the event
  currentMinutes: number; // new startMinutes being dragged to
}
interface DragResize {
  type: "resize";
  eventId: string;
  edge: "top" | "bottom";
  originalStart: number;
  originalEnd: number;
  currentMinutes: number;
}
type DragState = DragCreate | DragMove | DragResize | null;

function DayGrid({
  date,
  events,
  onEventTap,
  onSlotTap,
  isPointerFine,
  onDragCreateCommit,
  onDragMove,
  onDragResize,
  showDragHint,
  onDragHintDismiss,
  currentParticipantId,
  currentParticipantName,
}: {
  date: string;
  events: TripEvent[];
  onEventTap: (event: TripEvent) => void;
  onSlotTap: (minutes: number) => void;
  isPointerFine: boolean;
  /** Called with (startMinutes, endMinutes) when drag is committed. Returns a DOMRect for the new block (viewport coords). */
  onDragCreateCommit: (startMinutes: number, endMinutes: number) => DOMRect;
  onDragMove: (eventId: string, newStartMinutes: number) => void;
  onDragResize: (eventId: string, edge: "top" | "bottom", newMinutes: number) => void;
  showDragHint: boolean;
  onDragHintDismiss: () => void;
  /** R2-5: current viewer's participantId — own events render solid, not dashed */
  currentParticipantId: string | null;
  /** R2-1: current viewer's name — for viewer-relative "Confirmed by you/name" */
  currentParticipantName: string | null;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const totalHours = DAY_END_HOUR - DAY_START_HOUR;
  const totalHeight = totalHours * HOUR_HEIGHT;

  const activeEvents = events.filter((e) => !e.deletedAt && e.date === date);

  // A/B/R1-8: On date change, auto-scroll so the first event on that day is near
  // the top of the visible scroll area (1 hour of padding above).
  // R1-8: Falls back to 8am (not noon) for blank calendars so morning is visible.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      if (!gridRef.current) return;
      const dayEvents = events.filter((e) => !e.deletedAt && e.date === date);
      const sorted = [...dayEvents].sort((a, b) => a.startMinutes - b.startMinutes);
      const firstEvent = sorted[0];
      // R1-8: blank calendar defaults to 8am (480min); with events scroll to 1h before first
      const scrollToMinute = firstEvent
        ? Math.max(firstEvent.startMinutes - 60, DAY_START_HOUR * 60)
        : 8 * 60; // 8am default
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

  // Convert clientY → snapped minutes
  function clientYToMinutes(clientY: number, snap = 15): number {
    const rect = gridRef.current!.getBoundingClientRect();
    const y = clientY - rect.top + (gridRef.current?.scrollTop ?? 0);
    const rawMins = (y / HOUR_HEIGHT) * 60;
    const snapped = Math.round(rawMins / snap) * snap;
    return Math.max(DAY_START_HOUR * 60, Math.min(23 * 60 + 45, (DAY_START_HOUR * 60) + snapped));
  }

  // ── Drag state (pointer-fine desktop only) ─────────────────────────────────
  const dragRef = useRef<DragState>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  // Track whether a drag actually happened (distinguish from click)
  const dragMovedRef = useRef(false);

  // ── Hover state for empty slot affordance (fine pointer only) ─────────────
  const [hoverMinutes, setHoverMinutes] = useState<number | null>(null);

  // ── Mouse event handlers (drag-create, drag-move, drag-resize) ────────────
  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!isPointerFine) return;
    if (e.button !== 0) return; // left button only
    const target = e.target as HTMLElement;
    const eventBlock = target.closest("[data-event-block]") as HTMLElement | null;
    const resizeEdge = target.getAttribute("data-resize-edge") as "top" | "bottom" | null;

    e.preventDefault();
    dragMovedRef.current = false;

    if (resizeEdge && eventBlock) {
      // Drag-resize
      const eid = eventBlock.getAttribute("data-event-id")!;
      const ev = activeEvents.find((e) => e.id === eid);
      if (!ev) return;
      const state: DragResize = {
        type: "resize",
        eventId: eid,
        edge: resizeEdge,
        originalStart: ev.startMinutes,
        originalEnd: ev.endMinutes,
        currentMinutes: resizeEdge === "top" ? ev.startMinutes : ev.endMinutes,
      };
      dragRef.current = state;
      setDragState(state);
      return;
    }

    if (eventBlock && !resizeEdge) {
      // Drag-move: compute anchor offset within the event
      const eid = eventBlock.getAttribute("data-event-id")!;
      const ev = activeEvents.find((e) => e.id === eid);
      if (!ev) return;
      const clickedMinutes = clientYToMinutes(e.clientY);
      const anchorOffset = clickedMinutes - ev.startMinutes;
      const state: DragMove = {
        type: "move",
        eventId: eid,
        originalStart: ev.startMinutes,
        originalEnd: ev.endMinutes,
        anchorOffsetMinutes: anchorOffset,
        currentMinutes: ev.startMinutes,
      };
      dragRef.current = state;
      setDragState(state);
      return;
    }

    // Drag-create on empty slot
    const startMins = clientYToMinutes(e.clientY);
    const state: DragCreate = {
      type: "create",
      startMinutes: startMins,
      currentMinutes: startMins,
    };
    dragRef.current = state;
    setDragState(state);
  }

  useEffect(() => {
    if (!isPointerFine) return;

    function handleMouseMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;

      const currentMins = clientYToMinutes(e.clientY);
      dragMovedRef.current = true;

      if (drag.type === "create") {
        const updated: DragCreate = { ...drag, currentMinutes: currentMins };
        dragRef.current = updated;
        setDragState({ ...updated });
      } else if (drag.type === "move") {
        const updated: DragMove = { ...drag, currentMinutes: currentMins - drag.anchorOffsetMinutes };
        dragRef.current = updated;
        setDragState({ ...updated });
      } else if (drag.type === "resize") {
        const updated: DragResize = { ...drag, currentMinutes: currentMins };
        dragRef.current = updated;
        setDragState({ ...updated });
      }
    }

    function handleMouseUp(_e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      setDragState(null);
      setHoverMinutes(null);

      if (!dragMovedRef.current) {
        // Click without drag — on empty slot, open quick-create for 1h block
        if (drag.type === "create") {
          const mins = drag.startMinutes;
          onDragCreateCommit(mins, mins + 60);
          onDragHintDismiss();
        }
        return;
      }

      if (drag.type === "create") {
        const rawStart = drag.startMinutes;
        const rawCurrent = drag.currentMinutes;
        const startMins = Math.min(rawStart, rawCurrent);
        const endMins = Math.max(rawStart, rawCurrent, startMins + 60);
        onDragCreateCommit(startMins, endMins);
        onDragHintDismiss();
      } else if (drag.type === "move") {
        const duration = drag.originalEnd - drag.originalStart;
        const newStart = Math.max(DAY_START_HOUR * 60, Math.min(23 * 60 - duration, drag.currentMinutes));
        onDragMove(drag.eventId, newStart);
      } else if (drag.type === "resize") {
        if (drag.edge === "top") {
          const newStart = Math.min(drag.currentMinutes, drag.originalEnd - 15);
          onDragResize(drag.eventId, "top", newStart);
        } else {
          const newEnd = Math.max(drag.currentMinutes, drag.originalStart + 15);
          onDragResize(drag.eventId, "bottom", newEnd);
        }
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPointerFine, onDragCreateCommit, onDragMove, onDragResize, onDragHintDismiss]);

  // ── Touch handlers (touch: tap only — no drag-create) ─────────────────────
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const TAP_THRESHOLD_PX = 8;
  const TAP_THRESHOLD_MS = 400;

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

    if (dx > TAP_THRESHOLD_PX || dy > TAP_THRESHOLD_PX || dt > TAP_THRESHOLD_MS) return;

    const target = e.target as HTMLElement;
    if (target.closest("[data-event-block]")) return;

    const rect = gridRef.current!.getBoundingClientRect();
    const y = t.clientY - rect.top + (gridRef.current?.scrollTop ?? 0);
    const minutesFromStart = Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15;
    const totalMinutes = (DAY_START_HOUR * 60) + minutesFromStart;
    onSlotTap(Math.max(0, Math.min(23 * 60, totalMinutes)));
  }

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>) {
    if (isPointerFine) return; // handled by mouse drag system
    if ((e.target as HTMLElement).closest("[data-event-block]")) return;
    if ((e as unknown as { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities?.firesTouchEvents) return;
    const rect = gridRef.current!.getBoundingClientRect();
    const y = e.clientY - rect.top + (gridRef.current?.scrollTop ?? 0);
    const minutesFromStart = Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15;
    const totalMinutes = (DAY_START_HOUR * 60) + minutesFromStart;
    onSlotTap(Math.max(0, Math.min(23 * 60, totalMinutes)));
  }

  function handleMouseMoveGrid(e: React.MouseEvent<HTMLDivElement>) {
    if (!isPointerFine) return;
    if (dragRef.current) return; // during drag, handled globally
    const target = e.target as HTMLElement;
    if (target.closest("[data-event-block]")) {
      setHoverMinutes(null);
      return;
    }
    setHoverMinutes(clientYToMinutes(e.clientY));
  }

  function handleMouseLeaveGrid() {
    if (!dragRef.current) setHoverMinutes(null);
  }

  // Compute drag-in-progress preview block
  let dragPreview: { top: number; height: number } | null = null;
  if (dragState?.type === "create") {
    const rawStart = dragState.startMinutes;
    const rawCurrent = dragState.currentMinutes;
    const previewStart = Math.min(rawStart, rawCurrent);
    const previewEnd = Math.max(rawStart, rawCurrent, previewStart + 15);
    dragPreview = {
      top: minutesToTop(previewStart),
      height: minutesToHeight(previewStart, previewEnd),
    };
  }

  // P3-1: Compute per-event column layout to avoid overlapping blocks
  const columnLayout = computeEventColumns(activeEvents);
  const GUTTER_PX = 48;
  const RIGHT_PAD_PX = 8;

  // Map events with drag overrides for move/resize previews
  const eventsWithDragOverride = activeEvents.map((ev) => {
    if (dragState?.type === "move" && dragState.eventId === ev.id && dragMovedRef.current) {
      const duration = ev.endMinutes - ev.startMinutes;
      const newStart = Math.max(DAY_START_HOUR * 60, Math.min(23 * 60 - duration, dragState.currentMinutes));
      return { ...ev, startMinutes: newStart, endMinutes: newStart + duration };
    }
    if (dragState?.type === "resize" && dragState.eventId === ev.id && dragMovedRef.current) {
      if (dragState.edge === "top") {
        const newStart = Math.min(dragState.currentMinutes, ev.endMinutes - 15);
        return { ...ev, startMinutes: newStart };
      } else {
        const newEnd = Math.max(dragState.currentMinutes, ev.startMinutes + 15);
        return { ...ev, endMinutes: newEnd };
      }
    }
    return ev;
  });

  return (
    <div className="relative h-full flex flex-col">
      {/* One-time drag hint (fine pointer, empty grid) */}
      {showDragHint && isPointerFine && (
        <div
          role="status"
          className="absolute top-2 left-12 right-2 z-10 bg-[#EEF3FF] border border-[#B5C8E8] rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-[#3a5a9a] shadow-sm"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
          </svg>
          <span className="flex-1">Drag down the grid to block out time, or click a slot for a 1-hour event.</span>
          <button
            onClick={onDragHintDismiss}
            className="ml-1 text-[#7a9acc] hover:text-[#3a5a9a]"
            aria-label="Dismiss drag hint"
          >
            ✕
          </button>
        </div>
      )}
      {/* R1-6: Mobile empty-state hint — show on touch (coarse pointer) when no events */}
      {!isPointerFine && activeEvents.length === 0 && (
        <div
          role="status"
          className="absolute top-2 left-4 right-4 z-10 bg-[#EEF3FF] border border-[#B5C8E8] rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-[#3a5a9a] shadow-sm"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="flex-1">Tap a slot to add an event, or use the + button below.</span>
        </div>
      )}

      {/* Scrollable grid */}
      <div
        ref={gridRef}
        className="day-grid-scroll overflow-y-auto flex-1 min-h-0"
        style={{ WebkitOverflowScrolling: "touch", cursor: isPointerFine ? "cell" : "default" } as React.CSSProperties}
        aria-label="Day schedule"
      >
        <div
          className="relative"
          style={{ height: `${totalHeight}px` }}
          onMouseDown={isPointerFine ? handleMouseDown : undefined}
          onMouseMove={isPointerFine ? handleMouseMoveGrid : undefined}
          onMouseLeave={isPointerFine ? handleMouseLeaveGrid : undefined}
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

          {/* Hover slot highlight (fine pointer, empty slot) */}
          {isPointerFine && hoverMinutes !== null && !dragState && (
            <div
              className="absolute left-12 right-2 pointer-events-none"
              style={{
                top: `${minutesToTop(hoverMinutes)}px`,
                height: `${HOUR_HEIGHT / 4}px`, // 15-min slot
                backgroundColor: "rgba(181,200,232,0.25)",
                borderRadius: "4px",
              }}
            />
          )}

          {/* Drag-create in-progress block */}
          {dragPreview && dragState?.type === "create" && (() => {
            const rawStart = dragState.startMinutes;
            const rawCurrent = dragState.currentMinutes;
            const previewStart = Math.min(rawStart, rawCurrent);
            const previewEnd = Math.max(rawStart, rawCurrent, previewStart + 15);
            return (
              <div
                className="absolute left-12 right-2 pointer-events-none rounded-lg border-2 border-[#B5C8E8]"
                style={{
                  top: `${dragPreview.top}px`,
                  height: `${Math.max(dragPreview.height, 15)}px`,
                  backgroundColor: "rgba(181,200,232,0.4)",
                }}
              >
                <span className="text-xs text-[#3a5a9a] font-medium px-1 pt-0.5 block">
                  {minutesToDisplay(previewStart)} – {minutesToDisplay(previewEnd)}
                </span>
              </div>
            );
          })()}

          {/* Event blocks */}
          {eventsWithDragOverride.map((event) => {
            const top = minutesToTop(event.startMinutes);
            const height = Math.max(
              minutesToHeight(event.startMinutes, event.endMinutes),
              22
            );
            const color = getAuthorColor(event.authorId);
            // R3-1/R3-2: "own" = current viewer is the author (by participantId match, not name)
            const isOwnEvent = currentParticipantId !== null && event.authorId === currentParticipantId;
            // R3-3: use shared getEventStyle helper for ONE source of truth across views
            const evStyle = getEventStyle(event.status, isOwnEvent);
            const layout = columnLayout.get(event.id) ?? { col: 0, totalCols: 1 };
            const { col, totalCols } = layout;

            const gutterAndPad = GUTTER_PX + RIGHT_PAD_PX;
            const colGap = 2;
            const leftCalc = totalCols === 1
              ? `${GUTTER_PX}px`
              : `calc(${GUTTER_PX}px + ${col} * (100% - ${gutterAndPad}px - ${(totalCols - 1) * colGap}px) / ${totalCols} + ${col * colGap}px)`;
            const widthCalc = totalCols === 1
              ? `calc(100% - ${GUTTER_PX + RIGHT_PAD_PX}px)`
              : `calc((100% - ${gutterAndPad}px - ${(totalCols - 1) * colGap}px) / ${totalCols})`;

            const isDragging = dragState &&
              ((dragState.type === "move" && dragState.eventId === event.id) ||
               (dragState.type === "resize" && dragState.eventId === event.id));

            return (
              <div
                key={event.id}
                data-event-block="true"
                data-event-id={event.id}
                data-event-own={isOwnEvent ? "true" : "false"}
                data-event-status={event.status}
                className={`absolute rounded-lg px-2 select-none ${evStyle.classes} ${
                  isDragging ? "opacity-75 shadow-lg" : ""
                }`}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: leftCalc,
                  width: widthCalc,
                  // R3-3: single bgAlpha from getEventStyle — same value across all breakpoints/views
                  backgroundColor: `${color}${evStyle.bgAlpha}`,
                  borderColor: color,
                  // R3-2: own/confirmed = full opacity; other-proposed = reduced
                  opacity: isDragging ? 0.75 : evStyle.opacity,
                  // R1-1: body of block = grab cursor; but override to pointer when not fine
                  cursor: isPointerFine ? (isDragging ? "grabbing" : "grab") : "pointer",
                  // R1-9: give own/confirmed events a subtle shadow for depth
                  boxShadow: !evStyle.isDashed ? `0 1px 3px ${color}55` : undefined,
                  paddingTop: isPointerFine ? "10px" : "4px", // space for top handle
                  paddingBottom: isPointerFine ? "10px" : "4px", // space for bottom handle
                }}
                onClick={(e) => {
                  // Only fire onEventTap if NOT a drag
                  if (!dragMovedRef.current) {
                    e.stopPropagation();
                    onEventTap(event);
                  }
                }}
                aria-label={`${event.title} at ${minutesToDisplay(event.startMinutes)}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onEventTap(event);
                }}
              >
                {/* R1-1: Top resize handle — VISIBLE grip bar (fine pointer only) */}
                {isPointerFine && (
                  <div
                    data-resize-edge="top"
                    className="absolute top-0 left-0 right-0 flex items-center justify-center"
                    style={{ height: "10px", zIndex: 2, cursor: "ns-resize" }}
                    title="Drag to resize"
                  >
                    {/* Visible grip bar */}
                    <div
                      className="rounded-full pointer-events-none"
                      style={{ width: "24px", height: "3px", backgroundColor: `${color}cc`, marginTop: "3px" }}
                    />
                  </div>
                )}
                <p className="text-xs font-semibold leading-tight truncate text-[#1a1a1a]">
                  {event.title}
                </p>
                <p className="text-xs text-[#555] leading-tight">
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
                    {/* R2-1: viewer-relative — "you" if confirmer matches the viewer's name */}
                    <span className="text-xs text-green-700 leading-tight truncate">
                      {event.confirmedBy
                        ? `Confirmed by ${
                            currentParticipantName && event.confirmedBy === currentParticipantName
                              ? "you"
                              : event.confirmedBy
                          }`
                        : ""}
                    </span>
                  </div>
                )}
                {event.url && (
                  <svg className="w-3 h-3 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                )}
                {/* R1-1: Bottom resize handle — VISIBLE grip bar (fine pointer only) */}
                {isPointerFine && (
                  <div
                    data-resize-edge="bottom"
                    className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
                    style={{ height: "10px", zIndex: 2, cursor: "ns-resize" }}
                    title="Drag to resize"
                  >
                    {/* Visible grip bar */}
                    <div
                      className="rounded-full pointer-events-none"
                      style={{ width: "24px", height: "3px", backgroundColor: `${color}cc`, marginBottom: "3px" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ── Week view ──────────────────────────────────────────────────────────────────
// R1-5: Week view always shows ≥2 day columns — when trip has only 1 explicit date,
// we pad to show the following day too; when blank (0 dates), show 7 days from today.
function WeekView({
  dates,
  events,
  selectedDate,
  onDateSelect,
  onEventTap,
  currentParticipantId,
}: {
  dates: string[];
  events: TripEvent[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onEventTap: (event: TripEvent) => void;
  /** R3-3: current viewer's participantId — own events render solid across all views */
  currentParticipantId: string | null;
}) {
  // R1-5: ensure at least 2 columns — for blank or single-day trips
  let displayDates = dates;
  if (dates.length === 0) {
    // blank trip: show 7 days from selectedDate (or today)
    const anchor = selectedDate ? new Date(selectedDate + "T00:00:00") : new Date();
    displayDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  } else if (dates.length === 1) {
    // single-day trip: show that day + the next 3 days for context
    const base = new Date(dates[0] + "T00:00:00");
    displayDates = Array.from({ length: 4 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }

  // R2-2: On mobile (≤390px) showing 3+ columns shreds every title.
  // Limit visible columns: show at most 3 trip dates (or 3 blank days) on mobile;
  // each column is at least 160px so titles can breathe.
  // The container uses overflow-x-auto so the user can still scroll to see all days.
  const MIN_COL_W = 160; // wider column so "6:00pm Check-in" is not truncated

  return (
    <div className="overflow-x-auto">
      {/* R1-9/R2-2: cleaner week view — white background, distinct day headers, wider columns */}
      <div className="flex bg-white" style={{ minWidth: `${Math.max(displayDates.length * MIN_COL_W, 300)}px` }}>
        {displayDates.map((date) => {
          const dayEvents = events.filter((e) => !e.deletedAt && e.date === date);
          const isSelected = date === selectedDate;
          const isOriginalDate = dates.includes(date);
          return (
            <div
              key={date}
              className={`flex-1 border-r border-[#E8E2D8] last:border-r-0 ${isSelected ? "bg-[#F0F4FF]" : "bg-white"}`}
              style={{ minWidth: `${MIN_COL_W}px` }}
            >
              <button
                onClick={() => onDateSelect(date)}
                className={`w-full text-center py-2.5 text-xs font-semibold border-b border-[#E8E2D8] transition-colors ${
                  isSelected
                    ? "bg-[#3a5a9a] text-white"
                    : isOriginalDate
                    ? "text-[#1a1a1a] hover:bg-[#F0F4FF]"
                    : "text-[#aaa] hover:bg-[#F8F8F8]"
                }`}
              >
                {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </button>
              <div className="p-2 space-y-1 min-h-[200px]">
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-[#ddd] text-center mt-4">—</p>
                ) : (
                  dayEvents.map((ev) => {
                    const color = getAuthorColor(ev.authorId);
                    // R3-3: use the shared getEventStyle helper — same logic as DayGrid
                    const isOwn = currentParticipantId !== null && ev.authorId === currentParticipantId;
                    const evStyle = getEventStyle(ev.status, isOwn);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => onEventTap(ev)}
                        // R3-3: use canonical style classes (not just isConfirmed)
                        // R2-2: title wraps (break-words) instead of truncating so it stays readable
                        className={`w-full text-left rounded-lg px-2 py-1.5 text-xs border-2 transition-colors hover:opacity-90 ${
                          evStyle.isDashed ? "border-dashed" : "border-solid"
                        }`}
                        style={{
                          borderColor: color,
                          // R3-3: same fill alpha as DayGrid (bgAlpha suffix)
                          backgroundColor: `${color}${evStyle.bgAlpha}`,
                          opacity: evStyle.opacity,
                        }}
                      >
                        {/* R2-2: show time on its own line, then title wrapping — avoids shredding */}
                        <span className="font-medium leading-tight block text-[#555]">
                          {minutesToDisplay(ev.startMinutes)}
                        </span>
                        <span className="font-semibold leading-tight block break-words text-[#1a1a1a]">
                          {ev.title}
                        </span>
                        {ev.status === "confirmed" && (
                          <span className="text-green-700 text-xs font-medium">✓ {ev.confirmedBy}</span>
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
// R1-4: Has prev/next navigation and works on blank calendars (starts on current month).
function MonthView({
  dates,
  events,
  selectedDate,
  onDateSelect,
  onNavigateDate,
}: {
  dates: string[];
  events: TripEvent[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onEventTap: (event: TripEvent) => void;
  // R1-4: callback to navigate to a date (for prev/next month + day selection)
  onNavigateDate: (date: string) => void;
}) {
  // R1-4: internal month offset for blank calendars; default to selectedDate month or today
  const today = new Date();
  const initialMonth = selectedDate
    ? new Date(selectedDate + "T00:00:00")
    : (dates.length > 0 ? new Date(dates[0] + "T00:00:00") : today);
  const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth.getMonth()); // 0-based

  // Build set of trip dates
  const tripDateSet = new Set(dates);

  // R1-4: Build event index
  const eventsByDate: Record<string, TripEvent[]> = {};
  for (const ev of events) {
    if (!ev.deletedAt) {
      (eventsByDate[ev.date] ??= []).push(ev);
    }
  }

  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // R1-4: Single navigable month (prev/next controls)
  const year = viewYear;
  const month = viewMonth;
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (month === 0) { setViewYear(year - 1); setViewMonth(11); }
    else setViewMonth(month - 1);
  }
  function nextMonth() {
    if (month === 11) { setViewYear(year + 1); setViewMonth(0); }
    else setViewMonth(month + 1);
  }

  // Build grid cells: leading empty cells + days of month
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad trailing cells to complete the final week row
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-4 overflow-y-auto">
      {/* R1-4: Month nav header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg border border-[#E8E2D8] hover:bg-[#F0EDE8] text-[#555] transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-sm font-bold text-[#1a1a1a]">{monthLabel}</h3>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg border border-[#E8E2D8] hover:bg-[#F0EDE8] text-[#555] transition-colors"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

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
          const isToday = dateStr === todayStr;
          const dayEvts = eventsByDate[dateStr] ?? [];
          const hasConfirmed = dayEvts.some((e) => e.status === "confirmed");
          const count = dayEvts.length;

          return (
            <button
              key={dateStr}
              onClick={() => {
                if (isTripDay) {
                  onDateSelect(dateStr);
                } else {
                  // R1-4: allow picking any date to navigate there (for blank calendar)
                  onNavigateDate(dateStr);
                }
              }}
              className={`relative flex flex-col items-center justify-start py-1 rounded-lg transition-colors
                ${isTripDay ? "cursor-pointer hover:bg-[#F0EDE8]" : "cursor-pointer hover:bg-[#F8F8F8] opacity-50"}
                ${isSelected ? "bg-[#1a1a1a] text-white hover:bg-[#333]" : ""}
                ${isToday && !isSelected ? "ring-1 ring-[#B5C8E8]" : ""}
              `}
              aria-label={`${dateStr}${count > 0 ? `, ${count} event${count !== 1 ? "s" : ""}` : ""}`}
              aria-pressed={isSelected || undefined}
            >
              <span className={`text-sm font-medium leading-none ${isSelected ? "text-white" : isTripDay ? "text-[#1a1a1a]" : "text-[#999]"}`}>
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
  // R3-1: stable per-device participant ID, always set at init — even when name is empty.
  // This ref is the AUTHORITATIVE source for authorId stamping, so drag-create and
  // handleEventSave always use the right ID even if the participant state is being updated.
  const participantIdRef = useRef<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  // R4-4: track whether the user has already skipped the name prompt this session
  const hasSkippedNameRef = useRef(false);
  const [selectedEvent, setSelectedEvent] = useState<TripEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<(Partial<TripEvent> & { id: string }) | null>(null);
  // R2-1: lazy name capture for first attributing action on a shared trip
  const [inlineNameCapture, setInlineNameCapture] = useState<{
    prompt: string;
    onConfirmed: (name: string) => void;
  } | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tripRef = useRef<TripData | null>(null);
  // C: track in-flight save promise so Copy can await it
  const saveInFlightRef = useRef<Promise<void> | null>(null);

  // AF-3: pointer type — init to false (SSR safe); read matchMedia in useEffect
  const [isPointerFine, setIsPointerFine] = useState(false);

  // AF-2: one-time drag hint — SSR safe, read localStorage in useEffect
  const [showDragHint, setShowDragHint] = useState(false);
  const [dragHintReady, setDragHintReady] = useState(false);

  // Quick-create popover state (managed at TripPageClient level)
  // R4-2: eventId is stored so handleQuickCreateSave finds the event by stable ID,
  // not by fragile title-string lookup — eliminating the title-drop bug entirely.
  const [quickCreatePopover, setQuickCreatePopover] = useState<{
    anchorRect: DOMRect;
    startMinutes: number;
    endMinutes: number;
    date: string;
    eventId: string;
  } | null>(null);

  // Ref to the day-grid container for computing anchored DOMRect
  const dayGridContainerRef = useRef<HTMLDivElement>(null);

  // AF-3: detect pointer type in effect (SSR-safe — never read matchMedia during render)
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    setIsPointerFine(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsPointerFine(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // AF-2: one-time drag hint — read localStorage in effect (SSR-safe)
  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(DRAG_HINT_KEY);
      setDragHintReady(true);
      if (!dismissed) {
        setShowDragHint(true);
      }
    } catch {
      setDragHintReady(true);
    }
  }, []);

  // ── Load trip from server on mount ──────────────────────────────────────────
  useEffect(() => {
    async function init() {
      // Read URL params (SSR-safe: only in effect)
      const params = new URLSearchParams(window.location.search);
      const isBlankMode = params.get("blank") === "1";
      const isPasteMode = params.get("paste") === "1";

      // R3-1: Load or create a stable per-device participant ID.
      // A participant with an empty name is valid — the name is optional and set lazily.
      // We need a stable ID from the very first moment (even before any event is created)
      // so that authorId comparison works for an unnamed solo creator.
      try {
        const raw = window.localStorage.getItem(participantKey(secret));
        if (raw) {
          const p = JSON.parse(raw) as Participant;
          // Accept any participant with a valid id, even if name is empty
          if (p.id) {
            setParticipant(p);
            participantIdRef.current = p.id;
          }
        }
        // If no stored participant, create one NOW with an empty name.
        // This ensures a stable ID exists from page load — the name is captured lazily.
        if (!participantIdRef.current) {
          const newId = generateId();
          const newP: Participant = { id: newId, name: "" };
          participantIdRef.current = newId;
          setParticipant(newP);
          try {
            window.localStorage.setItem(participantKey(secret), JSON.stringify(newP));
          } catch { /* ignore */ }
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
        // Set default view: always Day (spec hero view)
        // (week was the old desktop default; Day is the primary spec view)
        // Set selectedDate to first event date or today
        const activeDates = getUniqueDates(t.events);
        const today = formatDate(new Date());
        if (activeDates.length > 0) {
          setSelectedDate(activeDates.includes(today) ? today : activeDates[0]);
        } else {
          // No events yet — default to today so the grid is visible (blank calendar)
          setSelectedDate(today);
        }
        // Show paste panel: only if paste mode OR (has no events AND not blank mode)
        const hasActiveEvents = t.events.filter((e) => !e.deletedAt).length > 0;
        if (isPasteMode || (!hasActiveEvents && !isBlankMode)) {
          setShowPastePanel(true);
          // R2-3: strip ?paste=1 from URL immediately after opening the panel so
          // a normal reload doesn't re-open the paste panel (replaceState leaves history clean).
          if (isPasteMode) {
            try {
              const cleanUrl = window.location.pathname;
              window.history.replaceState(null, "", cleanUrl);
            } catch { /* ignore */ }
          }
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
  // R1-2/R3-1: NEVER block the first create with a name prompt — always run action directly.
  // A participant with a stable ID is created at init; name is set lazily.
  function requireParticipant(action: () => void) {
    // R3-1: participant is always set at init (with empty name if no name yet).
    // Just run the action — the participant always exists now.
    if (participant) {
      action();
    } else {
      // Fallback (should not happen after R3-1 init fix): create a participant now.
      const guestId = participantIdRef.current ?? generateId();
      participantIdRef.current = guestId;
      const guestP: Participant = { id: guestId, name: "" };
      setParticipant(guestP);
      try {
        window.localStorage.setItem(participantKey(secret), JSON.stringify(guestP));
      } catch { /* ignore */ }
      action();
    }
  }

  function handleNameConfirm(name: string) {
    // R3-1: always preserve the stable participantId — never generate a new one on name set.
    // Events already authored with this id remain attributed to this device.
    const existingId = participant?.id ?? participantIdRef.current ?? generateId();
    participantIdRef.current = existingId;
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

  // Always-current ref so drag callbacks (useCallback []) can call updateTrip
  // without capturing a stale closure where serverHydrated is still false.
  const updateTripRef = useRef(updateTrip);
  useEffect(() => {
    updateTripRef.current = updateTrip;
  });

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
    // H2/R3-1: if still no participant state, use the stable participantIdRef
    // (which was created at init). Never generate a new ID here.
    if (!p) {
      const guestId = participantIdRef.current ?? generateId();
      participantIdRef.current = guestId;
      p = { id: guestId, name: "" };
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
    // R3-1: always use the stable participantId
    const theParticipant = resolvedParticipant ?? participant ?? { id: participantIdRef.current ?? generateId(), name: "" };
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

  function doConfirm(id: string, confirmerName: string) {
    const now = Date.now();
    updateTrip((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === id
          ? { ...e, status: "confirmed", confirmedBy: confirmerName, updatedAt: now }
          : e
      ),
      updatedAt: now,
    }), true);
  }

  function handleEventConfirm(id: string) {
    setSelectedEvent(null);
    // R2-1: if participant has no real name ("you", "Guest", or none), capture lazily
    // before stamping confirmation — so the attribution is meaningful.
    // GUARDRAIL: never block a SOLO creator's first create (R1-2 protected); this only
    // fires on CONFIRM (cross-person attribution moment), not on create.
    const currentP = participant;
    const hasRealName = currentP && currentP.name !== "" && currentP.name !== "you" && currentP.name !== "Guest";
    if (!hasRealName) {
      // Show inline name capture at the moment of attribution
      setInlineNameCapture({
        prompt: "Confirm as…",
        onConfirmed: (name: string) => {
          setInlineNameCapture(null);
          // R3-1: preserve stable participantId — never generate a new one on name set
          const existingId = currentP?.id ?? participantIdRef.current ?? generateId();
          participantIdRef.current = existingId;
          const p: Participant = { id: existingId, name };
          setParticipant(p);
          try { window.localStorage.setItem(participantKey(secret), JSON.stringify(p)); } catch { /* ignore */ }
          doConfirm(id, name);
        },
      });
    } else {
      requireParticipant(() => {
        // Read participant from localStorage since state may lag
        let p = participant;
        if (!p) {
          try {
            const raw = window.localStorage.getItem(participantKey(secret));
            if (raw) p = JSON.parse(raw) as Participant;
          } catch { /* ignore */ }
        }
        const confirmerName = p?.name ?? "you";
        doConfirm(id, confirmerName);
      });
    }
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
      // New event — R3-1: use participantIdRef for authoritative ID
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
        authorId: participantIdRef.current ?? p?.id ?? "anon",
        authorName: p?.name ?? "",
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

  // ── Drag-create handler (desktop fine-pointer only) ────────────────────────
  // Called by DayGrid when a drag-create gesture completes.
  // Creates a TripEvent, persists it (immediate flush), and returns a DOMRect
  // for positioning the quick-create popover.
  const handleDragCreateCommit = useCallback((startMinutes: number, endMinutes: number): DOMRect => {
    const p = participant;
    // R3-1: use participantIdRef for authoritative ID — always set at init
    const authorId = participantIdRef.current ?? p?.id ?? "anon";
    const authorName = p?.name ?? "";
    const now = Date.now();
    const newId = generateId();
    // R3-1: stamp event with stable authorId so isOwnEvent check works for unnamed users
    const newEvent: TripEvent = {
      id: newId,
      title: "(New event)",
      date: selectedDate,
      startMinutes,
      endMinutes: Math.max(endMinutes, startMinutes + 15),
      status: "proposed",
      authorId,
      authorName,
      createdAt: now,
      updatedAt: now,
    };

    // Add to trip state and flush immediately
    const prev = tripRef.current;
    if (prev) {
      const updated: TripData = {
        ...prev,
        events: [...prev.events, newEvent],
        updatedAt: now,
      };
      tripRef.current = updated;
      setTrip(updated);
      void flushSave(updated);
      // Update selectedDate if needed
      if (!getUniqueDates(prev.events).includes(selectedDate)) {
        // already selected; no-op
      }
    }

    // Compute an approx DOMRect for the new event block (for popover positioning)
    // The grid container is dayGridContainerRef
    const container = dayGridContainerRef.current;
    let rect: DOMRect;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const HOUR_H = 60;
      const DAY_START = 6;
      const GUTTER = 48;
      const top = containerRect.top + ((startMinutes - DAY_START * 60) / 60) * HOUR_H - (container.scrollTop ?? 0);
      const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_H, 22);
      rect = new DOMRect(
        containerRect.left + GUTTER,
        top,
        containerRect.width - GUTTER - 8,
        height
      );
    } else {
      rect = new DOMRect(100, 100, 200, 60);
    }

    // Show quick-create popover
    // R4-2: store newId so handleQuickCreateSave finds by ID — not fragile title lookup
    setQuickCreatePopover({
      anchorRect: rect,
      startMinutes,
      endMinutes: Math.max(endMinutes, startMinutes + 15),
      date: selectedDate,
      eventId: newId,
    });

    return rect;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant, selectedDate]);

  // ── Drag-move handler ──────────────────────────────────────────────────────
  const handleDragMove = useCallback((eventId: string, newStartMinutes: number) => {
    const now = Date.now();
    updateTripRef.current((prev) => {
      const ev = prev.events.find((e) => e.id === eventId);
      if (!ev) return prev;
      const duration = ev.endMinutes - ev.startMinutes;
      const clampedStart = Math.max(0, Math.min(23 * 60 + 45 - duration, newStartMinutes));
      return {
        ...prev,
        events: prev.events.map((e) =>
          e.id === eventId
            ? { ...e, startMinutes: clampedStart, endMinutes: clampedStart + duration, updatedAt: now }
            : e
        ),
        updatedAt: now,
      };
    }, true);
  }, []);

  // ── Drag-resize handler ────────────────────────────────────────────────────
  const handleDragResize = useCallback((eventId: string, edge: "top" | "bottom", newMinutes: number) => {
    const now = Date.now();
    updateTripRef.current((prev) => {
      const ev = prev.events.find((e) => e.id === eventId);
      if (!ev) return prev;
      let newStart = ev.startMinutes;
      let newEnd = ev.endMinutes;
      if (edge === "top") {
        newStart = Math.min(newMinutes, ev.endMinutes - 15);
      } else {
        newEnd = Math.max(newMinutes, ev.startMinutes + 15);
      }
      return {
        ...prev,
        events: prev.events.map((e) =>
          e.id === eventId
            ? { ...e, startMinutes: newStart, endMinutes: newEnd, updatedAt: now }
            : e
        ),
        updatedAt: now,
      };
    }, true);
  }, []);

  // ── Drag hint dismissal ────────────────────────────────────────────────────
  function handleDragHintDismiss() {
    setShowDragHint(false);
    try {
      window.localStorage.setItem(DRAG_HINT_KEY, "1");
    } catch { /* ignore */ }
  }

  // ── Quick-create popover save ──────────────────────────────────────────────
  // R4-2: look up the event by stable eventId stored in quickCreatePopover,
  // never by title string — the old title-match was the root cause of the title-drop bug.
  function handleQuickCreateSave(title: string, startMinutes: number, endMinutes: number) {
    if (!quickCreatePopover) return;
    const { eventId } = quickCreatePopover;
    const now = Date.now();
    updateTrip((prev) => {
      const target = prev.events.find((e) => e.id === eventId && !e.deletedAt);
      if (!target) return prev;
      return {
        ...prev,
        events: prev.events.map((e) =>
          e.id === eventId
            ? { ...e, title, startMinutes, endMinutes: Math.max(endMinutes, startMinutes + 15), updatedAt: now }
            : e
        ),
        updatedAt: now,
      };
    }, true);
    setQuickCreatePopover(null);
  }

  function handleQuickCreateMoreOptions(title: string, startMinutes: number, endMinutes: number) {
    if (!quickCreatePopover) return;
    const { eventId } = quickCreatePopover;
    // Update the placeholder title then open full edit sheet
    handleQuickCreateSave(title || "(New event)", startMinutes, endMinutes);
    setQuickCreatePopover(null);
    // Find the event we just updated and open edit sheet — by ID (R4-2)
    const prev = tripRef.current;
    if (!prev) return;
    const target = prev.events.find((e) => e.id === eventId && !e.deletedAt);
    if (target) setEditingEvent(target);
  }

  function handleQuickCreateDismiss() {
    // AF-2: dismiss leaves the "(New event)" block in place (don't discard)
    setQuickCreatePopover(null);
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
  // R2-4: availableDates always includes selectedDate (the currently viewed date) so the
  // add-event form defaults to the date the user is looking at, not "today" when navigated away.
  const baseDates = uniqueDates.length > 0 ? uniqueDates : [formatDate(new Date())];
  const availableDates = baseDates.includes(selectedDate) || !selectedDate
    ? baseDates
    : [...baseDates, selectedDate].sort();

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

          {/* Participant chip — show name if set; show "Set name" prompt if unnamed */}
          {participant && (
            <button
              onClick={() => setShowNamePrompt(true)}
              className="flex-shrink-0 text-xs bg-white border border-[#E8E2D8] rounded-full px-2 py-1 font-medium hover:border-[#B5C8E8] transition-colors"
              aria-label="Change your name"
            >
              {participant.name && participant.name !== "" ? participant.name : "Set name"}
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

        {/* Third row: date nav (day view) — OWN full-width row */}
        {/* R5-3: structural fix — date chips are on a dedicated row so they never collide
            with the toggle/action buttons at any viewport width. */}
        {/* R1-4: prev/next arrows for date navigation on Day view */}
        {view === "day" && (
          <div className="flex items-center gap-1 mt-1 w-full min-w-0">
            {/* R1-4: prev date arrow */}
            <button
              onClick={() => {
                const allDates = uniqueDates.length > 0 ? uniqueDates : [formatDate(new Date())];
                const idx = allDates.indexOf(selectedDate);
                if (idx > 0) setSelectedDate(allDates[idx - 1]);
                else {
                  // Go to previous day even outside trip dates
                  const d = new Date(selectedDate + "T00:00:00");
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().slice(0, 10));
                }
              }}
              className="flex-shrink-0 p-1 rounded border border-[#E8E2D8] bg-white text-[#666] hover:border-[#B5C8E8] transition-colors"
              aria-label="Previous day"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Date chips strip (scrollable) */}
            {uniqueDates.length > 0 ? (
              <div className="flex-1 min-w-0 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
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
            ) : (
              /* R1-4: blank calendar — show a date picker so user can navigate to future dates */
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="text-xs text-[#888] flex-shrink-0">Go to:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
                  className="flex-1 min-w-0 text-xs border border-[#E8E2D8] rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#B5C8E8]"
                  aria-label="Jump to date"
                />
              </div>
            )}

            {/* R1-4: next date arrow */}
            <button
              onClick={() => {
                const allDates = uniqueDates.length > 0 ? uniqueDates : [formatDate(new Date())];
                const idx = allDates.indexOf(selectedDate);
                if (idx >= 0 && idx < allDates.length - 1) setSelectedDate(allDates[idx + 1]);
                else {
                  // Go to next day even outside trip dates
                  const d = new Date(selectedDate + "T00:00:00");
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().slice(0, 10));
                }
              }}
              className="flex-shrink-0 p-1 rounded border border-[#E8E2D8] bg-white text-[#666] hover:border-[#B5C8E8] transition-colors"
              aria-label="Next day"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* R1-4: Week view also needs prev/next nav — handled inline in the week row */}
        {view === "week" && (
          <div className="flex items-center justify-between mt-1 w-full min-w-0">
            <button
              onClick={() => {
                const d = new Date(selectedDate + "T00:00:00");
                d.setDate(d.getDate() - 7);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
              className="flex-shrink-0 p-1 rounded border border-[#E8E2D8] bg-white text-[#666] hover:border-[#B5C8E8] transition-colors"
              aria-label="Previous week"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xs text-[#888] font-medium">
              Week of{" "}{new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <button
              onClick={() => {
                const d = new Date(selectedDate + "T00:00:00");
                d.setDate(d.getDate() + 7);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
              className="flex-shrink-0 p-1 rounded border border-[#E8E2D8] bg-white text-[#666] hover:border-[#B5C8E8] transition-colors"
              aria-label="Next week"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
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
          <div className="h-full" ref={dayGridContainerRef}>
            <DayGrid
              date={selectedDate}
              events={activeEvents}
              onEventTap={handleEventTap}
              onSlotTap={handleSlotTap}
              isPointerFine={isPointerFine}
              onDragCreateCommit={handleDragCreateCommit}
              onDragMove={handleDragMove}
              onDragResize={handleDragResize}
              showDragHint={dragHintReady && showDragHint && isPointerFine && activeEvents.filter(e => !e.deletedAt && e.date === selectedDate).length === 0}
              onDragHintDismiss={handleDragHintDismiss}
              currentParticipantId={participant?.id ?? null}
              currentParticipantName={participant?.name ?? null}
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
            {/* R1-5: WeekView always shows multiple days; uses uniqueDates which may be empty (blank trip) */}
            <WeekView
              dates={uniqueDates}
              events={activeEvents}
              selectedDate={selectedDate}
              onDateSelect={(d) => { setSelectedDate(d); setView("day"); }}
              onEventTap={handleEventTap}
              currentParticipantId={participant?.id ?? null}
            />
          </div>
        )}
        {view === "month" && (
          <div className="h-full overflow-y-auto">
            {/* R1-4: MonthView manages its own month navigation internally */}
            <MonthView
              dates={uniqueDates}
              events={activeEvents}
              selectedDate={selectedDate}
              onDateSelect={(d) => { setSelectedDate(d); setView("day"); }}
              onEventTap={handleEventTap}
              onNavigateDate={(d) => { setSelectedDate(d); setView("day"); }}
            />
          </div>
        )}
      </div>

      {/* ── Add event FAB — touch/coarse-pointer ONLY (AF-3, R1-6)  ────────── */}
      {/* AF-4: position:fixed so it never widens any toolbar row. */}
      {/* Hidden on (pointer:fine) — desktop uses drag-to-create as the primary path. */}
      {/* R1-6: FAB shows visible "Add event" text label, not a bare icon */}
      {/* R2-4: FAB taps open form with the CURRENTLY VIEWED date (not 9am today) */}
      {view === "day" && selectedDate && !showPastePanel && !isPointerFine && (
        <button
          onClick={() => handleSlotTap(9 * 60)}
          className="fixed bottom-4 right-4 z-30 bg-[#1a1a1a] text-white rounded-full shadow-lg flex items-center gap-2 px-4 py-3 hover:bg-[#333] transition-colors"
          aria-label="Add event"
          data-testid="add-event-fab"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-semibold">Add event</span>
        </button>
      )}

      {/* ── Quick-create popover (AF-2 — portal, fine pointer only) ─────────── */}
      {quickCreatePopover && (
        <QuickCreatePopover
          anchorRect={quickCreatePopover.anchorRect}
          startMinutes={quickCreatePopover.startMinutes}
          endMinutes={quickCreatePopover.endMinutes}
          onSave={handleQuickCreateSave}
          onDismiss={handleQuickCreateDismiss}
          onMoreOptions={handleQuickCreateMoreOptions}
        />
      )}

      {/* ── R2-1: Inline lazy name capture (first confirm action) ─────────── */}
      {inlineNameCapture && (
        <InlineNameCapture
          prompt={inlineNameCapture.prompt}
          onConfirm={inlineNameCapture.onConfirmed}
          onSkip={() => {
            // Skip: close capture and run confirm with a generic name
            const skippedCapture = inlineNameCapture;
            setInlineNameCapture(null);
            // R3-1: use existing participant; if none, use the stable participantId from ref
            const existingP = participant;
            const autoId = existingP?.id ?? participantIdRef.current ?? generateId();
            participantIdRef.current = autoId;
            // For the confirm attribution label when skipping, use a generic label
            const confirmLabel = existingP?.name && existingP.name !== "" ? existingP.name : "someone";
            if (!existingP) {
              const autoP: Participant = { id: autoId, name: "" };
              setParticipant(autoP);
              try { window.localStorage.setItem(participantKey(secret), JSON.stringify(autoP)); } catch { /* ignore */ }
            }
            skippedCapture.onConfirmed(confirmLabel);
          }}
        />
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
          currentParticipantId={participant?.id ?? null}
          currentParticipantName={participant?.name ?? null}
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
