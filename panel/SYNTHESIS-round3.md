# Panel Synthesis — TripSync ROUND 3 (drag-create trip calendar)

## Verdict: 6/10 at the exit bar (advocacy ≥9 ∧ clarity ∧ value) — a REGRESSION from R2's 8/10.

Rob's R2 confirm-attribution blocker is FIXED and stable (7→9). But the R2 styling/identity
changes regressed THREE previously-passing testers — Marcus 9→7, Aisha 9→6, Elena 9→8 — and
all three regressions trace to ONE root cause (see below). Dana 6 (value=No) is the one
allowable miss. Net movement is backwards: we traded one fixed blocker for three new misses.

## Score table

| # | Tester | Round | Clarity | Value | Advocacy | Δ vs R2 | At bar? |
|---|--------|-------|---------|-------|----------|---------|---------|
| 1 | Priya  | carried | Yes | Yes | 9 | — | YES |
| 2 | Marcus | 3 | Yes | Yes | 7 | 9→7 ▼ | no |
| 3 | Wen    | carried | Yes | Yes | 9 | — | YES |
| 4 | Tomás  | carried | Yes | Yes | 9 | — | YES |
| 5 | Dana   | 3 | Yes | **No** | 6 | 5→6 ▲ | no (allowable) |
| 6 | Jules  | 3 | Yes | Yes | 9 | — | YES |
| 7 | Aisha  | 3 | Yes | Yes | 6 | 9→6 ▼ | no |
| 8 | Rob    | 3 | Yes | Yes | 9 | 7→9 ▲ | YES |
| 9 | Elena  | 3 | Yes | Yes | 8 | 9→8 ▼ | no |
| 10| Sam    | 3 | Yes | Yes | 9 | — | YES |

At bar: Priya, Wen, Tomás, Jules, Rob, Sam = **6/10**. Below: Marcus 7, Aisha 6, Elena 8, Dana 6.

## ROOT CAUSE (one bug behind all three regressions): identity keyed off a NAME STRING.

The R2 identity model compares actor-to-viewer by NAME, not by a stable device id. Two
consequences, both proven by testers:

- **No name ⇒ no identity for the SELF.** A solo creator who never set a name has no identity,
  so their OWN events fail the "is this mine?" check and render as someone-else's
  unconfirmed-**proposed** chrome. Marcus pulled computed styles on his own SAVED titled event:
  `event-proposed border-2 border-dashed`, `opacity: 0.65`, `background: rgba(181,200,232,0.533)`
  — the washed-out dashed "draft" look, on his own committed event, as creator. There is no UI
  state that can make it solid (no confirm/finalize on own events, no name field). Aisha
  confirmed the same: own freshly-saved event is dashed "Proposed by you" until she clicks
  Confirm on each one.
- **No name ⇒ matches the "you" fallback for a NON-AUTHOR.** A fresh viewer with no name set
  matches the empty-string "you" branch, so opening the CREATOR's event they see "Proposed by
  you" with a Confirm button — backwards (Elena reproduced; Rob saw the same residual: a fresh
  friend sees "Proposed by you" on the owner's proposal until they interact). The viewer never
  proposed anything.

The R2 verifier gate MISSED this because it almost certainly tested with a name already set —
the empty/no-name case is exactly the cold default and is where both failures live.

## Grouped complaints

**A. Own events render unfinished / dashed-faded (Marcus 7, Aisha 6, Dana-partial).** Driven
by root cause: the unnamed creator's own committed events are styled as another-person's
proposed event. Marcus: own SAVED event = dashed + opacity 0.65. The "own=solid" split R2
CLAIMED to ship is NOT in the build (Marcus verified localStorage holds only recent-trips +
hint-dismissed — no identity marker the renderer could key off).

**B. Backwards attribution for a fresh non-author viewer (Elena 8, Rob 9-residual).** A new
viewer sees "Proposed by you" on the creator's event because no-name matches the "you" fallback.

**C. One-state-renders-three-ways across view×breakpoint (Aisha 6).** Same own unconfirmed
event: desktop-Day = dashed/blue "Proposed by you"; mobile-Day = SOLID/MINT-GREEN
`rgba(168,213,186)`, no proposed label; mobile-Week = dashed/blue. The cross-breakpoint color
split (mint on 390px Day vs blue `rgba(181,200,232)` desktop) regressed — R2 had verified it
fixed. "The calendar looks like two different apps" on phone vs laptop.

**D. Native `<select>` time pickers reappeared in the editor (Aisha 6).** R2 removed/custom-
styled them and Aisha praised "zero `<select>` anywhere"; they're back as OS-chrome dropdowns.

**E. Allowable miss — Dana value=No (6).** Her three flagged fixes all landed (390px Week
titles wrap; reload no longer re-pops paste panel; confirmed events go solid). Her bar is
per-type COLOR/icons/imagery (Canva-grade); every event is one flat dusty-rose pill. We are
deliberately NOT chasing the visual overhaul — it risks regressing the passers.

**F. Known limitations / nits — NOT addressed this round (avoid regression risk):**
- Sam 9 & Elena 8: bulk "add whole trip to Google Calendar" — GCal render URLs are per-event;
  .ics is the honest bulk path. Out of scope (no OAuth). Both otherwise at/near bar.
- Jules 9: "Untitled Trip" naming nudge + Week-view add affordance — nits on a passing tester.
- Dana: auto-confirm creator's pasted events; name persistence across reload; trip-date picker.
- Rob/Sam: parser rejects natural pastes ("Fri 6pm Drive up to Tahoe") — prior parser scope.

## Decision / strategy

This round is a ROOT-CAUSE fix, NOT symptom patches. Replace name-string identity with a
stable per-device participant ID (R3-1). That single fix makes own events compute correctly
for the unnamed solo creator (R3-2) and fixes the backwards "you" for a fresh viewer (R3-1).
Then enforce ONE event-style source of truth across all four view×breakpoint combos (R3-3)
and restore the custom time pickers (R3-4). Projected: Marcus, Aisha, Elena → ≥9; Rob/Jules/
Sam/Priya/Wen/Tomás held = **9/10 with Dana as the one allowable miss**. Builder MUST
self-verify with COMPUTED STYLES on the unnamed-creator case (the R2 claim was false).
