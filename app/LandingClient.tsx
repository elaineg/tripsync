"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "../components/Link";

interface RecentTrip {
  id: string;
  name: string;
  createdAt: number;
}

const RECENT_TRIPS_KEY = "tripsync_recent";

// ── Delete confirm dialog — portal, focus-trapped, accessible (TM-R1-6) ──────
function DeleteConfirmDialog({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);

  // Focus trap: on mount focus the Cancel button (safe default)
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Trap Tab within the dialog
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && !loading) { onCancel(); return; }
    if (e.key !== "Tab") return;
    const focusable = [cancelRef.current, deleteRef.current].filter(Boolean) as HTMLElement[];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  if (typeof document === "undefined") return null;

  const dialog = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      data-testid="delete-confirm-dialog"
      onKeyDown={handleKeyDown}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="delete-confirm-title" className="text-base font-bold text-[#1a1a1a] mb-2">
          Delete this trip for everyone with the link? This can&apos;t be undone.
        </h2>
        <div className="flex flex-col gap-3 mt-4 sm:flex-row">
          <button
            ref={deleteRef}
            data-testid="delete-confirm-button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-[#C0392B] text-white rounded-xl py-3 font-semibold hover:bg-[#a93226] disabled:opacity-50 transition-colors min-h-[44px]"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-[#E8E2D8] text-[#666] rounded-xl py-3 font-medium hover:border-[#aaa] disabled:opacity-50 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

export default function LandingClient() {
  const [tripName, setTripName] = useState("");
  const [loading, setLoading] = useState<"paste" | "blank" | null>(null);
  const [error, setError] = useState("");
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // M1: per-entry rename state — which entry is being renamed and draft value
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // M2/M3: confirm delete dialog (TM-R1-6: portal + testids)
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // M3: soft "Removed — undo" state
  const [removedId, setRemovedId] = useState<string | null>(null);
  const removedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadRecent() {
      try {
        const raw = window.localStorage.getItem(RECENT_TRIPS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as RecentTrip[];
          if (Array.isArray(parsed)) {
            setRecentTrips(parsed.slice(0, 5));
          }
        }
      } catch {
        // ignore
      }
      setHydrated(true);
    }
    void loadRecent();
  }, []);

  // Focus rename input when a rename starts
  useEffect(() => {
    if (renamingId) {
      setTimeout(() => renameInputRef.current?.focus(), 50);
    }
  }, [renamingId]);

  // M1: start inline rename for a list entry
  function startRename(trip: RecentTrip) {
    setRenamingId(trip.id);
    setRenameDraft(trip.name);
  }

  // M1: save rename — PUTs the new name to the server, updates localStorage
  // TM-R1-2: stopPropagation so Enter does NOT trigger the row link navigation
  const saveRename = useCallback(async (id: string) => {
    const newName = renameDraft.trim();
    if (!newName || renameLoading) return;
    setRenameLoading(true);
    try {
      // Fetch current trip data to perform a full PUT (server requires full TripData)
      const getRes = await fetch(`/api/trip/${id}`);
      if (!getRes.ok) throw new Error("fetch failed");
      const body = (await getRes.json()) as { data: { name: string; details?: string; events: unknown[]; createdAt: number; updatedAt: number } };
      const updated = { ...body.data, name: newName, updatedAt: Date.now() };
      const putRes = await fetch(`/api/trip/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!putRes.ok) throw new Error("put failed");
      // Update localStorage
      try {
        const raw = window.localStorage.getItem(RECENT_TRIPS_KEY);
        const existing: RecentTrip[] = raw ? (JSON.parse(raw) as RecentTrip[]) : [];
        const next = existing.map((t) => t.id === id ? { ...t, name: newName } : t);
        window.localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(next));
        setRecentTrips(next.slice(0, 5));
      } catch { /* ignore */ }
    } catch {
      // silent fail — name reverts
    } finally {
      setRenameLoading(false);
      setRenamingId(null);
    }
  }, [renameDraft, renameLoading]);

  // M3: Remove from my list — device-local only, does NOT call DELETE
  function removeFromList(id: string) {
    try {
      const raw = window.localStorage.getItem(RECENT_TRIPS_KEY);
      const existing: RecentTrip[] = raw ? (JSON.parse(raw) as RecentTrip[]) : [];
      const next = existing.filter((t) => t.id !== id);
      window.localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(next));
      setRecentTrips(next.slice(0, 5));
    } catch { /* ignore */ }
    // Show soft "Removed" notice
    setRemovedId(id);
    if (removedTimerRef.current) clearTimeout(removedTimerRef.current);
    removedTimerRef.current = setTimeout(() => setRemovedId(null), 3000);
  }

  // M2: confirm delete — calls DELETE /api/trip/[id], removes from localStorage
  async function confirmDelete(id: string) {
    if (deleteLoading) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/trip/${id}`, { method: "DELETE" });
      // Remove from localStorage regardless of server result
      try {
        const raw = window.localStorage.getItem(RECENT_TRIPS_KEY);
        const existing: RecentTrip[] = raw ? (JSON.parse(raw) as RecentTrip[]) : [];
        const next = existing.filter((t) => t.id !== id);
        window.localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(next));
        setRecentTrips(next.slice(0, 5));
      } catch { /* ignore */ }
    } catch {
      // silent fail
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
    }
  }

  async function createTrip(path: "paste" | "blank") {
    if (loading) return;
    const name = tripName.trim() || "Untitled Trip";
    setLoading(path);
    setError("");
    try {
      const res = await fetch("/api/trip-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Server error");
      const { id } = (await res.json()) as { id: string };
      // Store in recent trips
      try {
        const raw = window.localStorage.getItem(RECENT_TRIPS_KEY);
        const existing: RecentTrip[] = raw ? (JSON.parse(raw) as RecentTrip[]) : [];
        const updated = [
          { id, name, createdAt: Date.now() },
          ...existing.filter((t) => t.id !== id),
        ].slice(0, 10);
        window.localStorage.setItem(RECENT_TRIPS_KEY, JSON.stringify(updated));
      } catch {
        // ignore localStorage errors
      }
      // For blank calendar, pass a flag so TripPageClient knows not to show paste panel
      if (path === "blank") {
        window.location.href = `/t/${id}?blank=1`;
      } else {
        window.location.href = `/t/${id}?paste=1`;
      }
    } catch {
      setError("Could not create trip. Please try again.");
      setLoading(null);
    }
  }

  return (
    <main className="flex flex-col min-h-screen items-center justify-center px-4 py-16">
      {/* Hero headline */}
      <div className="max-w-xl w-full text-center mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a1a] leading-tight mb-3">
          Turn a messy itinerary into a shared day-by-day calendar &mdash; no app, no login
        </h1>
        <p className="text-[#5a5a5a] text-lg">
          One link, open and edit on any phone. Add events to Google Calendar or download
          the whole trip as a .ics file for any calendar app.
        </p>
      </div>

      {/* Trip name input */}
      <div className="max-w-xl w-full mb-6">
        <label
          htmlFor="trip-name"
          className="block text-sm font-semibold text-[#1a1a1a] mb-2"
        >
          Name your trip
        </label>
        <input
          ref={inputRef}
          id="trip-name"
          type="text"
          value={tripName}
          onChange={(e) => setTripName(e.target.value)}
          placeholder="Joanne visits — July"
          className="w-full border border-[#E8E2D8] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#B5C8E8] bg-[#FAF7F2] placeholder:text-[#aaa]"
          autoFocus
          aria-label="Trip name"
          onKeyDown={(e) => {
            if (e.key === "Enter") void createTrip("paste");
          }}
        />
      </div>

      {/* Two co-equal start cards */}
      <div className="max-w-xl w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Card A: Paste an itinerary */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D8] p-6 flex flex-col gap-3">
          {/* Clipboard icon */}
          <div className="w-10 h-10 bg-[#FAF7F2] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#5a5a5a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#1a1a1a] mb-1">Paste an itinerary</h2>
            <p className="text-sm text-[#666] leading-snug">
              Already have a plan in a doc? Paste it and we&apos;ll turn it into a calendar.
            </p>
          </div>
          <button
            type="button"
            disabled={!!loading}
            onClick={() => void createTrip("paste")}
            className="w-full bg-[#1a1a1a] text-white rounded-xl py-3 text-base font-semibold hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "paste" ? "Creating…" : "Paste an itinerary"}
          </button>
        </div>

        {/* Card B: Start from a blank calendar */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8E2D8] p-6 flex flex-col gap-3">
          {/* Calendar/grid icon */}
          <div className="w-10 h-10 bg-[#FAF7F2] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#5a5a5a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#1a1a1a] mb-1">Start from a blank calendar</h2>
            <p className="text-sm text-[#666] leading-snug">
              Prefer to build it yourself? Drag on the grid to add events.
            </p>
          </div>
          <button
            type="button"
            disabled={!!loading}
            onClick={() => void createTrip("blank")}
            className="w-full bg-[#1a1a1a] text-white rounded-xl py-3 text-base font-semibold hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "blank" ? "Creating…" : "Start blank"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-red-600 text-sm text-center">
          {error}
        </p>
      )}

      <p className="max-w-xl text-xs text-[#888] text-center leading-relaxed">
        Anyone with the link can view and edit — share only with your travel companions.
        No account or email required.
      </p>

      {/* TM-R1-6: Delete confirm dialog — portal, focus-trapped, reliable on both surfaces */}
      {hydrated && deletingId && (
        <DeleteConfirmDialog
          onConfirm={() => void confirmDelete(deletingId)}
          onCancel={() => !deleteLoading && setDeletingId(null)}
          loading={deleteLoading}
        />
      )}

      {/* Recent trips — only shown after hydration to avoid SSR mismatch */}
      {hydrated && recentTrips.length > 0 && (
        <div className="max-w-xl w-full mt-8">
          <h2 className="text-sm font-semibold text-[#888] mb-3">Recent trips on this device</h2>
          {/* TM-R1-1b: always-visible scope caption above the list */}
          <p className="text-xs text-[#999] mb-2">
            Remove = this device only &middot; Delete = everyone with the link
          </p>
          <ul className="space-y-2">
            {recentTrips.map((trip) => (
              <li
                key={trip.id}
                className="bg-white border border-[#E8E2D8] rounded-xl hover:border-[#B5C8E8] transition-colors"
              >
                {renamingId === trip.id ? (
                  /* M1: Inline rename form — TM-R1-2: NOT nested inside the nav Link */
                  <div className="flex items-center gap-2 px-4 py-3">
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      className="flex-1 min-w-0 border border-[#B5C8E8] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#B5C8E8]"
                      aria-label="New trip name"
                      onKeyDown={(e) => {
                        // TM-R1-2: Enter saves and STAYS on the list; must not navigate
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          void saveRename(trip.id);
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setRenamingId(null);
                        }
                      }}
                    />
                    <button
                      onClick={(e) => { e.preventDefault(); void saveRename(trip.id); }}
                      disabled={renameLoading || !renameDraft.trim()}
                      className="text-xs bg-[#1a1a1a] text-white rounded-lg px-2 py-1.5 font-medium hover:bg-[#333] disabled:opacity-40 transition-colors"
                      aria-label="Save new trip name"
                    >
                      {renameLoading ? "…" : "✓"}
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); setRenamingId(null); }}
                      className="text-xs text-[#888] rounded-lg px-2 py-1.5 hover:text-[#333] transition-colors"
                      aria-label="Cancel rename"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  /* TM-R1-1, TM-R1-4, M3-LAYOUT: two-row on mobile, one-row on desktop */
                  <div className="px-4 py-3">
                    {/* Row 1: Trip name (wraps up to 2 lines on mobile) + date */}
                    <Link
                      href={`/t/${trip.id}`}
                      className="block mb-2 sm:mb-0"
                      aria-label={`Open trip: ${trip.name}`}
                    >
                      <span
                        className="font-medium text-[#1a1a1a] block"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        } as React.CSSProperties}
                      >
                        {trip.name}
                      </span>
                      <span className="text-xs text-[#aaa] block mt-0.5">
                        {new Date(trip.createdAt).toLocaleDateString()}
                      </span>
                    </Link>

                    {/* Row 2: Actions — full width, ≥44px targets, ≥12px gaps (M3-LAYOUT) */}
                    {/* Desktop: actions inline after name in one row via flex. Mobile: own row. */}
                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                      {/* M1: Pencil rename button — ≥44px */}
                      <button
                        onClick={(e) => { e.preventDefault(); startRename(trip); }}
                        className="flex items-center gap-1 text-xs text-[#888] hover:text-[#1a1a1a] rounded-lg px-2 py-2.5 hover:bg-[#F0EDE8] transition-colors min-h-[44px] whitespace-nowrap"
                        aria-label="Rename trip"
                        title="Rename trip"
                      >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="hidden sm:inline">Rename</span>
                      </button>

                      {/* M3: "Remove from my list" — muted grey text-button, ≥44px, NO red, NO confirm */}
                      <button
                        onClick={(e) => { e.preventDefault(); removeFromList(trip.id); }}
                        className="flex-1 sm:flex-none text-xs text-[#888] hover:text-[#555] px-2 py-2.5 rounded-lg hover:bg-[#F0EDE8] transition-colors whitespace-nowrap min-h-[44px]"
                        aria-label="Remove from my list"
                      >
                        Remove from my list
                      </button>

                      {/* M2/TM-R1-1a: "Delete for everyone" — LABELED red button, trash glyph, ≥44px */}
                      <button
                        data-testid={`recent-delete-${trip.id}`}
                        onClick={(e) => { e.preventDefault(); setDeletingId(trip.id); }}
                        className="flex items-center gap-1.5 text-xs text-[#C0392B] hover:text-[#a93226] hover:bg-red-50 rounded-lg px-2 py-2.5 font-medium transition-colors whitespace-nowrap min-h-[44px]"
                        aria-label="Delete for everyone"
                      >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete for everyone
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {/* M3: soft "Removed" notice */}
          {removedId && (
            <p role="status" className="text-xs text-[#888] mt-2 text-center">
              Removed from this device. The shared trip link still works.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
