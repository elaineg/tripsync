/**
 * GET  /api/trip/[id] → { data: TripData } | 404
 * PUT  /api/trip/[id] → 200 | 400 | 404 | 413
 *
 * PUT body: TripData JSON (stringified).
 * Last-write-wins; no field-level merge.
 *
 * runtime = "nodejs" — libsql is NOT edge-compatible.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { isValidTripId, type TripData } from "../../../../lib/types";

const MAX_PAYLOAD_BYTES = 1_000_000;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _req: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const { id } = await ctx.params;

  if (!isValidTripId(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT data FROM trips WHERE id = ?",
    args: [id],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const data = JSON.parse(result.rows[0].data as string) as TripData;
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "corrupt" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const { id } = await ctx.params;

  if (!isValidTripId(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (raw.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  // Validate JSON
  let parsedData: unknown;
  try {
    parsedData = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!parsedData || typeof parsedData !== "object" || Array.isArray(parsedData)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const data = parsedData as Partial<TripData>;
  if (typeof data.name !== "string" || !Array.isArray(data.events)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const db = await getDb();

  // Ensure trip exists
  const existing = await db.execute({
    sql: "SELECT id FROM trips WHERE id = ?",
    args: [id],
  });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const now = Date.now();
  await db.execute({
    sql: "UPDATE trips SET data = ?, updated_at = ? WHERE id = ?",
    args: [raw, now, id],
  });

  return NextResponse.json({ ok: true });
}
