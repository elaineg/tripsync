# Panel Synthesis — TripSync Round 2

All round-1 P0 dealbreakers (mobile day-grid scroll, cold-open auto-scroll, persistence
flush-on-commit, copy-link flush-then-confirm) are RESOLVED and re-verified by every tester.
Result: 10/10 now clarity=Yes AND value=Yes. Three testers clear the ≥9 advocacy bar; seven
sit at 8, one point short.

## Score table

| # | Persona | Clarity | Value | Advocacy (R1→R2) | Bar |
|---|---------|---------|-------|------------------|-----|
| 1 | Priya   | Yes | Yes | 5 → 8 | |
| 2 | Marcus  | Yes | Yes | 6 → 8 | |
| 3 | Wen     | Yes | Yes | 7 → 9 | **PASS** |
| 4 | Tomás   | Yes | Yes | 4 → 8 | |
| 5 | Dana    | Yes | Yes | 7 → 8 | |
| 6 | Jules   | Yes | Yes | 7 → 9 | **PASS** |
| 7 | Aisha   | Yes | Yes | 6 → 8 | |
| 8 | Rob     | Yes | Yes | 5 → 8 | |
| 9 | Elena   | Yes | Yes | 2 → 8 | |
| 10| Sam     | Yes | Yes | 6 → 9 | **PASS** |

PASS (≥9): Wen, Jules, Sam. Under bar (8): Priya, Marcus, Tomás, Dana, Aisha, Rob, Elena.

## Holdbacks keeping the seven 8s under 9 (grouped by cause)

### H1 — Parser silently fails on real / 24h itineraries  — RECURRING (Aisha, Rob) — HIGHEST PRIORITY round-3 fix
The parser returns "0 events across 0 days" for 24-hour time formats ("09:00 Coffee", no
AM/PM) and for testers' OWN pasted itineraries — only the built-in sample parsed cleanly. It
fails SILENTLY: no warning, no explanation, just an empty result, so the user assumes the tool
is broken and bounces. This is the PRIMARY flow silently breaking on real-world input — the
single biggest product risk now that the mobile blockers are gone.
- Aisha (8): "my natural paste using '09:00 Coffee' (24h, no AM/PM) parsed to '0 events'
  SILENTLY — a 0-event result must explain itself or the train user gives up."
- Rob (8): "my own pasted itinerary parsed to '0 events' — only the built-in sample parsed
  cleanly; a real user pasting a messy group-text could hit the same wall and bounce. Fix the
  paste-anything robustness and I'm at 9."
- (Related, single-persona signal toward parser robustness: Elena notes the parser overlaps
  adjacent events 4:30–5:30 vs 5:15 — minor, tolerable.)

### H2 — Name-gate on commit silently loses the parsed import  — RECURRING (Priya, Marcus, Elena)
Commit pops a "What's your name?" modal before the save fires; the modal is unexpected
mid-flow, and bailing/cancelling it SILENTLY DISCARDS the whole parsed import. The brief's
design decision says name should be asked on first INTERACTION (browse-first) — the current
build gates the paste-commit itself, which is the wrong moment and has a data-loss failure mode.
- Elena (8): "the name-gate on commit is a silent failure mode (bail = lose import) and should
  auto-save a draft."
- Priya (8): "the friend still hits a 'What's your name?' modal on first confirm — a small
  speed bump."
- Marcus (8): "commit gated behind an unexpected 'What's your name?' modal mid-flow."
- (Sam, a PASS at 9, also flags it as a minor: name prompt fires mid-flow rather than at trip
  creation — reinforces the fix without being a holdback for him.)

### H3 — Cosmetic mobile CSS: black sliver + truncated .ics label  — RECURRING (Marcus, Dana, Jules, Aisha)
Two cheap polish nits at 390px: (a) a thin black rounded "sliver" still pokes out to the right
of the Day/Week/Month view toggle; (b) the "Download all (.ics)" header label truncates to
"Downloa…". Visual-craft personas screenshot exactly this and read it as "is that broken?"
- Dana (8): "persistent black date-pill sliver + truncated 'Downloa...' label — fix those and
  it's a 9."
- Marcus (8): "thin black day-chip sliver still peeks between view-toggle and refresh at 390px."
- Aisha (8): "'Download all (.ics)' truncated to 'Downloa…' at 390px."
- Jules (9, PASS): "tiny cosmetic black sliver to the right of 'Month'" — reinforces; was his
  only block to a 10.

### H4 — Bulk add is .ics only; per-event Google bounces through sign-in  — RECURRING (Priya, Sam, Wen, Elena) — FRAMING/MITIGATION ONLY
Testers want a true one-tap bulk "add everything to Google Calendar"; the only bulk mechanism
is the .ics download, and per-event Google add routes through a Google sign-in screen before
prefill. True bulk Google add requires OAuth — OUT OF SCOPE (no credentials, free-tier rule).
The .ics is the correct bulk mechanism. Round-3 action is framing only: lead with the .ics as
the primary "add everything" action, keep per-event Google as secondary, frame honestly. Do NOT
add OAuth.
- Elena (8), Priya (8), Sam (9), Wen (9): all want bulk one-tap-to-Google; accept .ics as fine
  but want the honest path led clearly.

### H5 — View-only / no-edit link option  — SINGLE PERSONA (Tomás) — OUT OF SCOPE BY DESIGN
Tomás wants a "view-only link" toggle / edit lock / undo so a forwarded link can't give a
stranger delete rights. This DEPRIORITIZES: free editing by anyone with the link is the core
CUJ (two trusted travel companions co-editing one plan, per design decision 5). It is a
deliberate design choice, not a bug — not a round-3 fix. The honest "anyone with this link can
view and edit — share only with your companions" banner already sets the expectation.
(Tomás also notes the sample is a SF city trip not beach-house flavored — cosmetic, non-blocking.)

## Round-3 priority order
1. H1 — parser 24h-time + real-paste robustness + helpful empty-parse message (unblocks Aisha, Rob)
2. H2 — name optional/skippable, never discard the import (unblocks Priya, Marcus, Elena)
3. H3 — kill the black sliver + un-truncate the .ics label (unblocks Dana, Marcus; helps Aisha, Jules)
4. H4 — lead with .ics as primary bulk path, per-event Google secondary, framed honestly (helps Priya, Elena)
5. H5 — out of scope by design (Tomás); note, do not build.
