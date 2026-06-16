# Panel Synthesis — Round 3 (TripSync)

**Result: 7/10 at advocacy ≥ 9.** Clarity 10/10, value 9/10 (Aisha = No).
Progress across rounds: **0 → 3 → 7** — not stalled, one regression away from passing.

## Score table

| # | Tester | Role | Clarity | Value | Advocacy | Note |
|---|--------|------|---------|-------|----------|------|
| 1 | Priya | Backend eng, skeptic | Yes | Yes | **9** | up from 8 |
| 2 | Marcus | Frontend eng | Yes | Yes | 8 | black sliver 390px (3rd round) |
| 3 | Wen | Marketing data analyst | Yes | Yes | **9** | held; +silent partial-drop |
| 4 | Tomás | Ops analyst | Yes | Yes | **9** | up from 8 |
| 5 | Dana | Demand-gen marketer | Yes | Yes | 8 | 390px overflow (sliver + truncated .ics) |
| 7 | Aisha | Product designer | Yes | **No** | **3** | dropped 8→3, P0 REGRESSION |
| 8 | Rob | Brand/visual designer | Yes | Yes | **9** | up from 8; off-by-one date label |
| 9 | Elena | Eng manager | Yes | Yes | **9** | up from 8; name re-prompt |
| — | Jules | (carried R2) | Yes | Yes | **9** | not re-tested |
| — | Sam | (carried R2) | Yes | Yes | **9** | not re-tested |

Passing (≥9): Priya, Wen, Tomás, Rob, Elena, Jules*, Sam* = **7/10** (*carried).
Sub-bar: Marcus 8, Dana 8, Aisha 3.

## Issues grouped by cause

### R4-1 (P0 — REGRESSION introduced in round 3 — TOP priority) — recurring symptom across 2 testers
**Aisha (8→3, value=No):** clicking "Add to <trip>" SILENTLY DISCARDS every parsed event.
The preview is perfect ("6 events across 2 days"), she clicks Add, and the calendar stays
"No dates yet. Paste an itinerary or add an event." in **both Day and Week** views.
Reproduced cleanly **4×** at 390px, **no JS console errors**, localStorage holds only a
participant id + recents — **no event data**. Her input used 24h times + "Day 1 - Friday"
style headers. In round 2 events DID land; the round-3 parser/date rewrite broke commit.
**Rob (still 9, related symptom):** an off-by-one date — "Friday Mar 7" renders "Fri, Mar 6"
in preview and day tabs ("Mar 6 / Mar 8"); event TIMES are correct, only the header date shifts.

**Root cause (one bug family, two faces):** the round-3 broadened parser/date-resolution
produces BAD dates for some inputs.
(a) Headers with no real month/day ("Day 1") resolve to **Invalid Date**, so those events get
filtered out on commit/render → nothing lands (Aisha).
(b) A JS **timezone off-by-one** — dates built from ambiguous strings / UTC vs local — shifts
the date back a day (Rob), and pushes borderline events out of range / into Invalid Date too.
The R3 verify MISSED it because it asserted events PARSE (appear in preview), not that they
COMMIT and RENDER on the calendar. This is the one thing the app must do; it is the only reason
the panel isn't already passing strongly.

### R4-2 (recurring — Marcus + Dana — THIRD round unfixed) — mobile 390px action-strip overflow
The "black sliver" / clipped-toolbar bug, flagged in R1, R2, and again R3. The R3 fix changed
the BUTTON but not the overflowing CONTAINER, so it returns in the real loaded-trip state.
**Dana's precise diagnosis:**
- A dark `rounded-lg` button (bg ~rgb(26,26,26)) is clipped to just its rounded LEFT edge,
  crowding the Day/Week/Month toggle once a trip has events (the "black sliver").
- The bulk button's right edge (~450px) is clipped by an `overflow-hidden`/`overflow-x-auto`
  ANCESTOR at 390px, so "Save to calendar (.ics)" truncates to "Save to cale…" — the "(.ics)"
  is off-screen. DOM text-overflow reports false because the clip is at the ancestor, not ellipsis.
**Marcus:** same black nub between "Month" and the refresh icon; survives two "fixed it" rounds,
dents his trust that small visual bugs get squashed. The action strip HORIZONTALLY OVERFLOWS
390px and is clipped/hidden behind an ancestor.

### R4-3 (single — Wen — data hygiene) — silent line drop
A single unparseable line inside an otherwise-valid paste ("noon Checkout") is dropped silently:
only `12pm`/`9am` parsed, the "Friday Aug 14" header renders with NO event under it and NO
"1 line couldn't be read" notice. The all-garbage case warns loudly; a partial drop vanishes
unflagged. Safer than R1's silent-override (it omits, doesn't mistransform) but for data hygiene
the user must be told a line was skipped. Surface a count of skipped/unparsed lines.

### R4-4 (single — Elena) — name modal re-prompts after a skipped import
Skipping the name on import is now safe (persists), but the modal re-prompts on the FIRST
Confirm/Delete after a skip. Skipping once should be remembered for the session — don't re-prompt
on the next write interaction.

## Minor / no-fix nits (note, don't necessarily fix)
- **Tomás:** wants a beach-house sample on first open (cosmetic; SF sample is fine).
- **Elena + Aisha:** parser overlaps near-adjacent events (4:30–5:30 vs 5:15) — that's the
  existing column-tiling behavior, **acceptable**, not a fix.
- **Priya:** a one-line "may ask you to sign in to Google" note on the per-event Google button
  would preempt a pause (optional polish; Google's own behavior).

## Round-4 priority (ordered)
1. **R4-1 (P0, regression)** — make every previewed event COMMIT + RENDER; local-time dates;
   no Invalid Date for header-only days. Unblocks Aisha (8→3→9), fixes Rob's date label.
2. **R4-2 (recurring)** — make the mobile action strip FIT/WRAP at 390px; no clip, no dark bleed.
   Unblocks Marcus + Dana (both → 9).
3. **R4-3** — surface "N line(s) skipped" on partial parse. Lifts Wen toward 10, helps trust.
4. **R4-4** — remember a skipped name for the session. Lifts Elena toward 10.
