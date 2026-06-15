/**
 * Unit tests for size caps (spec check #8 in re-verify brief).
 *
 * - Client-side paste cap: MAX_PASTE_CHARS = 50_000 (in PasteImportPanel)
 * - Client-side name cap: name.slice(0, 120) in handleTripNameChange
 * - Server-side name cap: data.name.slice(0, 120) in PUT route
 * - Server-side payload cap: MAX_PAYLOAD_BYTES = 1_000_000 → 413
 *
 * Source-code presence checks (guards regression on accidental removal).
 * API integration tests live in tests/e2e/extraChecks.spec.ts.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);

describe("size caps — source-code presence", () => {
  it("MAX_PASTE_CHARS = 50_000 present in TripPageClient", () => {
    const src = readFileSync(
      resolve(ROOT, "app/t/[secret]/TripPageClient.tsx"),
      "utf8"
    );
    expect(src).toContain("MAX_PASTE_CHARS = 50_000");
  });

  it("client-side name slice(0, 120) in handleTripNameChange", () => {
    const src = readFileSync(
      resolve(ROOT, "app/t/[secret]/TripPageClient.tsx"),
      "utf8"
    );
    expect(src).toContain("name.slice(0, 120)");
  });

  it("server PUT route trims name to 120 chars", () => {
    const src = readFileSync(
      resolve(ROOT, "app/api/trip/[id]/route.ts"),
      "utf8"
    );
    expect(src).toContain("data.name.slice(0, 120)");
  });

  it("server PUT route enforces MAX_PAYLOAD_BYTES with 413 response", () => {
    const src = readFileSync(
      resolve(ROOT, "app/api/trip/[id]/route.ts"),
      "utf8"
    );
    expect(src).toContain("MAX_PAYLOAD_BYTES = 1_000_000");
    expect(src).toContain("413");
  });

  it("trip-create POST trims name to 120 chars server-side", () => {
    const src = readFileSync(
      resolve(ROOT, "app/api/trip-create/route.ts"),
      "utf8"
    );
    expect(src).toContain(".slice(0, 120)");
  });
});
