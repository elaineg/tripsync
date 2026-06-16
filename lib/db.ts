/**
 * Lazily-instantiated libsql/Turso client for TripSync.
 *
 * - Does NOT connect at import/module-evaluation time — safe for next build
 *   even without env vars present.
 * - On first use, runs CREATE TABLE IF NOT EXISTS to ensure the schema exists.
 * - Runtime: nodejs (libsql is NOT edge-compatible).
 *
 * Env vars:
 *   TURSO_DATABASE_URL  — e.g. libsql://<db>.turso.io  (prod: set by deployer)
 *   TURSO_AUTH_TOKEN    — Turso auth token              (prod only)
 *
 * LOCAL DEV FALLBACK: if TURSO_DATABASE_URL is not set, falls back to
 *   file:./local.db  (a SQLite file in the app root, no token needed).
 *   This lets `next start` on a local build work with zero remote deps.
 */

import { createClient, type Client } from "@libsql/client";

let _client: Client | null = null;
let _initialized = false;

function getClient(): Client {
  if (!_client) {
    const url =
      process.env.TURSO_DATABASE_URL ?? "file:./local.db";
    const authToken = process.env.TURSO_AUTH_TOKEN;
    _client = createClient({ url, authToken });
  }
  return _client;
}

export async function getDb(): Promise<Client> {
  const client = getClient();
  if (!_initialized) {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    // Add view_token column if it doesn't exist (safe for existing DBs)
    try {
      await client.execute(`ALTER TABLE trips ADD COLUMN view_token TEXT`);
    } catch {
      // Column already exists — ignore
    }
    // Add an index on view_token for fast lookups (if not already there)
    try {
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_trips_view_token ON trips(view_token)`);
    } catch {
      // Ignore
    }
    _initialized = true;
  }
  return client;
}

/**
 * Look up a trip by its view token.
 * Returns the row id (the edit secret) and data, or null if not found.
 * Lazily mints and persists a view token if the trip has none (backfill for old trips).
 */
export async function getTripByViewToken(
  viewToken: string
): Promise<{ id: string; data: string } | null> {
  const client = getClient();
  const result = await client.execute({
    sql: "SELECT id, data FROM trips WHERE view_token = ?",
    args: [viewToken],
  });
  if (result.rows.length > 0) {
    return {
      id: result.rows[0].id as string,
      data: result.rows[0].data as string,
    };
  }
  return null;
}

/**
 * Ensure a trip has a view token; mint+persist one lazily if missing.
 * Returns the view token.
 */
export async function ensureViewToken(
  tripId: string,
  generateId: () => string
): Promise<string> {
  const client = getClient();
  const result = await client.execute({
    sql: "SELECT view_token FROM trips WHERE id = ?",
    args: [tripId],
  });
  if (result.rows.length === 0) return "";
  const existing = result.rows[0].view_token as string | null;
  if (existing) return existing;
  // Mint a fresh token
  const token = generateId();
  await client.execute({
    sql: "UPDATE trips SET view_token = ? WHERE id = ?",
    args: [token, tripId],
  });
  return token;
}
