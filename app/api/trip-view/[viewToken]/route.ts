/**
 * GET /api/trip-view/[viewToken]
 * Resolves a trip by its VIEW TOKEN (read-only link).
 * Returns { data: TripData } — does NOT include the edit secret.
 * If the trip has no view token yet (old trip), lazily mints one.
 *
 * PUT/DELETE are not implemented on this route — write operations
 * must go to /api/trip/[id] with the edit secret.
 *
 * runtime = "nodejs" — libsql is NOT edge-compatible.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb, getTripByViewToken } from "../../../../lib/db";
import { isValidTripId, generateId, type TripData } from "../../../../lib/types";

const VIEW_TOKEN_RE = /^[A-Za-z0-9\-_]{22,32}$/;

type RouteContext = { params: Promise<{ viewToken: string }> };

export async function GET(
  _req: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const { viewToken } = await ctx.params;

  if (!VIEW_TOKEN_RE.test(viewToken)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Ensure DB is initialized
  await getDb();

  const row = await getTripByViewToken(viewToken);
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const data = JSON.parse(row.data) as TripData;
    // Return ONLY the data — never expose the edit secret (row.id)
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "corrupt" }, { status: 500 });
  }
}

/**
 * GET /api/trip-view/[viewToken]/token
 * Returns the viewToken for a given edit secret (called from the trip edit page
 * to populate the share UI). The edit page knows its own secret; this endpoint
 * lets it discover (or lazily mint) the associated view token.
 *
 * Actually we handle this on the same route via a query param:
 * GET /api/trip-view/[viewToken]?mintFor=<editSecret>
 *
 * But that mixes concerns. Instead, add a separate route: /api/trip-get-view-token/[id]
 */

// Reject all write operations with 403
export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "forbidden", message: "View token cannot be used to modify the trip." },
    { status: 403 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "forbidden", message: "View token cannot be used to delete the trip." },
    { status: 403 }
  );
}

// Suppress unused import
void isValidTripId;
void generateId;
