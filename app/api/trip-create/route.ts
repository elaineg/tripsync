/**
 * POST /api/trip-create
 * Body: { name: string }
 * Creates a new trip with a random secret ID, stores in DB.
 * Returns: { id: string }
 *
 * runtime = "nodejs" — libsql is NOT edge-compatible.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { generateId, emptyTrip } from "../../../lib/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let name = "Untitled Trip";
  try {
    const body = (await req.json()) as { name?: string };
    if (body.name && typeof body.name === "string") {
      name = body.name.trim().slice(0, 120) || "Untitled Trip";
    }
  } catch {
    // Use default name
  }

  const id = generateId();
  const trip = emptyTrip(name);
  const now = Date.now();

  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO trips (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)",
    args: [id, JSON.stringify(trip), now, now],
  });

  return NextResponse.json({ id }, { status: 201 });
}
