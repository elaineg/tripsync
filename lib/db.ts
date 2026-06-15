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
    _initialized = true;
  }
  return client;
}
