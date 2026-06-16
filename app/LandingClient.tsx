"use client";

import { useState, useEffect, useRef } from "react";
import Link from "../components/Link";

interface RecentTrip {
  id: string;
  name: string;
  createdAt: number;
}

const RECENT_TRIPS_KEY = "tripsync_recent";

export default function LandingClient() {
  const [tripName, setTripName] = useState("");
  const [loading, setLoading] = useState<"paste" | "blank" | null>(null);
  const [error, setError] = useState("");
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

      {/* Recent trips — only shown after hydration to avoid SSR mismatch */}
      {hydrated && recentTrips.length > 0 && (
        <div className="max-w-xl w-full mt-8">
          <h2 className="text-sm font-semibold text-[#888] mb-3">Recent trips on this device</h2>
          <ul className="space-y-2">
            {recentTrips.map((trip) => (
              <li key={trip.id}>
                <Link
                  href={`/t/${trip.id}`}
                  className="flex items-center justify-between bg-white border border-[#E8E2D8] rounded-xl px-4 py-3 hover:border-[#B5C8E8] transition-colors"
                >
                  <span className="font-medium text-[#1a1a1a]">{trip.name}</span>
                  <span className="text-xs text-[#888]">
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
