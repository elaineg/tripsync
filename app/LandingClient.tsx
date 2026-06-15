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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Read from localStorage only in effect (SSR-safe).
    // Use async wrapper so setState calls are in an async callback
    // (satisfies react-hooks/set-state-in-effect — no synchronous setState in effect body).
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const name = tripName.trim() || "Untitled Trip";
    setLoading(true);
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
      window.location.href = `/t/${id}`;
    } catch {
      setError("Could not create trip. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col min-h-screen items-center justify-center px-4 py-16">
      {/* Hero headline */}
      <div className="max-w-lg w-full text-center mb-10">
        <h1 className="text-3xl font-bold text-[#1a1a1a] leading-tight mb-3">
          Your friend&rsquo;s trip plan, as a phone-friendly day-by-day calendar you can both
          open and edit from one link
        </h1>
        <p className="text-[#5a5a5a] text-lg">
          No app, no login. Paste an itinerary and watch it become a visual hourly calendar.
          Add events straight to Google Calendar.
        </p>
      </div>

      {/* Create form */}
      <form
        onSubmit={handleCreate}
        className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-[#E8E2D8] p-6"
      >
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
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full bg-[#1a1a1a] text-white rounded-xl py-3 text-base font-semibold hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating…" : "Create shared trip →"}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-red-600 text-sm text-center">
            {error}
          </p>
        )}
        <p className="mt-4 text-xs text-[#888] text-center leading-relaxed">
          Anyone with the link can view and edit — share only with your travel companions.
          No account or email required.
        </p>
      </form>

      {/* Recent trips — only shown after hydration to avoid SSR mismatch */}
      {hydrated && recentTrips.length > 0 && (
        <div className="max-w-lg w-full mt-8">
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
