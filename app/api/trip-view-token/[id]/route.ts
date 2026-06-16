/**
 * GET /api/trip-view-token/[id]
 * Given the edit secret (id), returns (or lazily mints) the view token.
 * Called from the edit page's share UI to populate the view-only link.
 *
 * Response: { viewToken: string }
 *
 * Security: this endpoint requires the EDIT SECRET in the URL — only the
 * edit-link holder can learn the view token. The view-only link holder
 * cannot call this (they don't know the edit secret).
 *
 * runtime = "nodejs" — libsql is NOT edge-compatible.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb, ensureViewToken } from "../../../../lib/db";
import { isValidTripId, generateId } from "../../../../lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _req: NextRequest,
  ctx: RouteContext
): Promise<NextResponse> {
  const { id } = await ctx.params;

  if (!isValidTripId(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await getDb();
  const viewToken = await ensureViewToken(id, generateId);
  if (!viewToken) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ viewToken });
}
