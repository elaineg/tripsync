# Panel Synthesis — TripSync, Round 1 (add-feature: blank-calendar start + GCal drag-create)

## Scores

| Tester | Persona | Clarity | Value | Advocacy |
|--------|---------|:-------:|:-----:|:--------:|
| 1 | Priya (backend eng) | Yes | Yes | 8 |
| 2 | Marcus (frontend eng) | Yes | Yes | 8 |
| 3 | Wen (marketing data analyst) | Yes | Yes | **9** |
| 4 | Tomás (ops analyst) | Yes | Yes | 7 |
| 5 | Dana (demand-gen marketer) | Yes | **No** | 5 |
| 6 | Jules (community runner) | Yes | Yes | 8 |
| 7 | Aisha (product designer) | Yes | Yes | 8 |
| 8 | Rob (brand designer) | Yes | Yes | 8 |
| 9 | Elena (eng manager) | Yes | Yes | 8 |
| 10 | Sam (trip organizer) | Yes | Yes | 8 |

**Exit bar:** ≥9 testers at advocacy≥9 ∧ clarity=Yes ∧ value=Yes.
**Current:** 1/10 (Wen only). Clarity is 10/10 and value is 9/10 (Dana the lone No).

## Pass strategy
Eight testers sit at exactly 8, each with concrete, fixable complaints; Tomás sits at 7 with one
near-blocker (date navigation). Lifting the 8s (and Tomás) to ≥9 clears the bar with **Dana as
the one allowable miss** — her advocacy-5 is gated on a Canva-grade visual bar (value=No) that a
reasonable visual lift may not fully meet, but the same lift resolves Aisha's and Marcus's color
complaints. So: ship the seven mechanical/UX fixes below cleanly, attempt the visual lift, and
9/10 is reachable without converting Dana.

## Complaints behind every advocacy<9 / non-Yes, grouped by cause

### CAUSE 1 — Resize handle invisible + edge-drag does the wrong thing  ★RECURS (4): Priya, Marcus, Tomás, Aisha
Dominant new-feature flaw. No visible bottom-edge grip and no resize cursor; grabbing near the
edge MOVES the whole block by an hour (Marcus, Tomás) or STARTS A NEW EVENT (Aisha) instead of
resizing. Priya: "friends will think resize is broken." Edge/body/empty-grid gestures overlap and
are ambiguous. This is the single most-named flaw of the round.

### CAUSE 2 — "What's your name?" modal blocks the first/most-important action  ★RECURS (5): Priya, Jules, Elena, Sam, Rob
The name modal fires on/before the first add-event (or first mobile "+" tap) and modal-blocks the
screen. Has a Skip, but it interrupts the exact moment the user wants to create/share. Elena/Sam:
felt like a detour on a 30-second mobile budget. Jules: would make it tap-away dismissible.

### CAUSE 3 — Solo attribution reads as a bug  ★RECURS (3): Elena, Sam, Rob
On a solo/own trip the creator's own freshly-added events show "Proposed by Someone/Guest" + a
Confirm button. Elena: "I never proposed anything to anyone… 'Someone' reads like a bug." Rob:
anonymous "Someone" until you act undercuts the who-did-what trust the tool sells. Tightly coupled
to Cause 2 (deferred/lazy name capture leaves default attribution reading wrong).

### CAUSE 4 — Blank-calendar future-trip date navigation missing  ★RECURS (4): Tomás (near-blocker), Sam, Dana, (Rob adjacent)
Starting blank for a future trip strands the user on today. Tomás: August trip, Month view has no
prev/next arrows, no date picker until after an event exists — "stuck on June," the single thing
holding his score to 7. Sam/Dana: day-name itineraries silently map to THIS weekend (Jun 15-17)
with no chance to set real trip dates up front → risk of sending wrong dates for a future trip.

### CAUSE 5 — Week view collapses / inconsistent  RECURS (2): Tomás, Marcus
Tomás: "Week" showed only a SINGLE day, not a 7-day spread — odd for a week-named tool. Marcus saw
Sat+Sun side-by-side (correct), so it renders inconsistently. Must reliably show the multi-day
spread.

### CAUSE 6 — Mobile create affordance: desktop wording + unlabeled FAB  ★RECURS (2): Jules, Aisha
Mobile grid hint reads desktop language ("Drag down the grid… or click a slot") — should say
"tap." The mobile "+ Add event" FAB is a bare icon (no visible label), easy to miss on an empty
blank calendar; mobile blank empty-state has NO guidance while desktop does (Aisha: empty-state
parity).

### CAUSE 7 — Saved-event color inconsistency / washed-out  RECURS (2): Aisha, Marcus
Saved events render pale blue on desktop but PINK with a DASHED border on mobile (dashed = reads as
"draft/unsaved" even though header says "Saved"). Anonymous/guest events render washed-out grey and
look unfinished (Marcus too). Need consistent saved styling, solid borders for saved, and the
creator's own events should not look washed-out.

### CAUSE 8 — Blank grid loads scrolled to noon  Single-persona: Rob
Blank-calendar grid loads scrolled to ~noon, hiding 9–10am morning arrivals below the fold. Should
default to early morning (~8am) or the earliest event. (Single-named but a real polish miss; cheap.)

### CAUSE 9 — "Visual" calendar isn't visual enough  Dana (value=No, adv 5); partially Aisha, Marcus
Dana's value-blocker: Week view reads as a "plain beige agenda list with pale-green pills," no
per-day color/icons/theming — not screenshot-worthy / not Canva-grade. Aisha's pink/dashed and
Marcus's washed-out-grey complaints are the same flatness from a craft angle. The visual lift
(color differentiation, cleaner less-beige week/day rendering) should clear Aisha+Marcus even if
Dana's bar remains the one allowable miss.

## Single-persona quirks (note, not gate)
- Marcus: Day/Week/Month switcher is a styled div, not a real `<button>` (no ARIA/keyboard focus) —
  a11y; cheap to fix alongside, doesn't gate.
- Wen (already 9): wants CSV export; wants the assumed YEAR surfaced like day/date mismatches;
  blank-mode title field vs trip-name field easy to confuse. Nice-to-haves toward a 10.
- Aisha: native `<select>` time pickers break the custom styling (cosmetic).
- Rob/Sam: paste parser is picky about natural formats / "Day N" headers (parser tolerance —
  already addressed in prior rounds; out of this feature's scope unless cheap).
- Elena/Sam: want a one-click "add WHOLE trip to Google Calendar" (bulk Google add needs OAuth =
  out of scope; .ics is the honest bulk path — prior-round decision H4, do not regress).

## Verdict
1/10 at the bar. Dominant causes are Cause 1 (resize, 4 testers), Cause 2 (name-prompt block, 5),
Cause 3 (solo attribution, 3), Cause 4 (blank date nav, 4). Fixing causes 1–8 cleanly should lift
all eight 8s + Tomás to ≥9; Cause 9 visual lift is best-effort with Dana the allowable miss.
Target next round: ≥9/10.
