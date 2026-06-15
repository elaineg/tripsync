# Panel Synthesis — Round 4 (TripSync)

**Result: 6/10 at advocacy ≥9** (down from R3's 7/10 — the R4 date "fix" was wrong and
introduced a regression). Two PASS testers hit a clean 10; four carried at 9; four sub-bar.

## Score table

| # | Tester | Role | R3 | R4 | Pass (≥9) | Note |
|---|--------|------|----|----|-----------|------|
| 7 | Aisha  | Product designer | 3 | **5** | no | date off-by-one + Skip-won't-dismiss + clipped pill |
| 2 | Marcus | Frontend eng | 8 | **8** | no | dark date-chip sliver (4th round unfixed) |
| 5 | Dana   | Demand-gen marketer | 8 | **8** | no | day-chips collide with toggle/action row at 390px |
| 8 | Rob    | Trip organizer | 9 | **5** | no | **REGRESSED** — named-month date shift, corrupts .ics |
| 3 | Wen    | Marketing data analyst | 8 | **10** | yes | skip-notice fix landed; date refactor no regression |
| 9 | Elena  | Engineering manager | 9 | **10** | yes | name-skip-per-session fixed; clean re-walk |
| 1 | Priya  | (carried R3) | 9 | **9*** | yes | *carried, not re-tested |
| 6 | Tomás  | (carried R3) | 9 | **9*** | yes | *carried, not re-tested |
| 4 | Jules  | (carried R3) | 9 | **9*** | yes | *carried, not re-tested |
| 10| Sam    | (carried R3) | 9 | **9*** | yes | *carried, not re-tested |

*Carried at 9 from round 3, not re-tested this round.

R4 wins to PRESERVE (do not regress): silent partial-drop notice (Wen 10), name-skip
remembered per session on import (Elena 10), commit+render+persist of pasted events
(Aisha confirms it lands), full ".ics" label (Dana confirms un-truncated + downloads).

---

## Issues grouped by cause (priority order)

### R5-1 (P0 — the date bug, now correctly root-caused) — UNBLOCKS Rob + Aisha
Reported by Rob (5, regressed from 9) and Aisha (5). Round-4's date change was the WRONG
fix and is the reason the count dropped 7→6.

**Symptoms (precise):**
- "Friday Mar 7" → renders/commits/exports as **Mar 6**; preview literally shows
  "Friday Mar 7 → Fri, Mar 6" (Aisha, Rob).
- "Saturday, March 8" → **Mar 7** (Rob).
- NUMERIC headers like "Sun 3/9" parse CORRECTLY → Mar 9 (Rob) — so it's a new
  named-vs-numeric inconsistency; consecutive days show a gap (Mar 7 then Mar 9).
- **Not cosmetic:** the exported .ics bakes in the wrong day — "Marco arrives" (Fri Mar 7)
  exports `DTSTART ...20260306T170000` (Mar 6). Friends' real calendars get the wrong day.
  This is a data-integrity bug, not a display label.

**Why Wen (10) and Elena (10) did NOT see it:**
- Wen's headers had MATCHING weekday+date ("Saturday Aug 8" — Aug 8 2026 IS a Saturday),
  so the value was used verbatim → correct.
- Elena's sample had a CONTRADICTORY "Friday July 11" (Jul 11 2026 is a Saturday); the
  parser snapped it to the weekday (Fri Jul 10) and she read that as defensible. It happened
  to look reasonable to her, but it's the SAME override mechanism that corrupts Rob's data.

**ROOT CAUSE:** the parser's weekday-snapping logic OVERRIDES an explicit numeric
month+day. When the stated weekday word doesn't match the typed date, it MOVES the date to
the nearest matching weekday — silently corrupting explicit dates and shipping the wrong day
into exported .ics files.

**THE FIX:** an explicit numeric month+day is AUTHORITATIVE and must NEVER be shifted by a
weekday word. Use a weekday word to pick a date ONLY when the header has no explicit day
number (a bare "Saturday", "Day 1"). When both are present and they disagree, KEEP the
explicit date (optionally show a small non-moving note: "(you wrote Friday; Mar 7 is a Thu)"
— but never move the date). This unblocks Rob + Aisha and will NOT regress Wen (matching
dates used verbatim) or Elena (her bare/contradictory cases still resolve, just authored
correctly).

### R5-2 (P0 — new bug from round 4) — UNBLOCKS Aisha
Reported by Aisha (5). The "What's your name?" sheet's **Skip** button does NOT dismiss it:
it re-pops on the next interaction and intercepts subsequent clicks (Aisha's date-pill taps
were stolen repeatedly). Only typing a name + Continue stops it (0 reappearances after).

**Note — two name-prompt paths.** Elena's skip-on-import worked cleanly (R4-4 resolved), so
the prompt that pops AFTER import / on a later interaction is a SEPARATE path that Skip does
not dismiss. **Fix:** Skip must immediately and permanently dismiss the name prompt for the
session in ALL paths (same session-flag both paths read), and must never steal/intercept
clicks while open.

### R5-3 (cosmetic but 4th ROUND — structural fix required) — UNBLOCKS Marcus + Dana
Reported by Marcus (8) and Dana (8), each on its 4th consecutive round; also seen by Aisha.
The round-4 wrap did not fix it.

**Precise diagnosis:** a dark `bg-[#1a1a1a]` (rgb 26,26,26) date-jump "day chip"
(e.g. "Jun 15" / "May 1") sits in an `overflow:auto` strip on the **same row** as the
view-toggle (Day/Week/Month) + refresh + Copy-invite buttons. At 390px the active dark chip
is clipped to a ~17px dark sliver ("M") and/or overlaps the refresh + Copy controls (Dana:
chips at 165–271 collide with refresh 190–218 and Copy 222–374). It reads as "is this
broken?" — the exact eyesore flagged in R1/R2/R3.

**FIX (structural, must end this):** move the day-navigation date chips to their OWN row,
full width, BELOW the view-toggle + action buttons. Nothing dark may be clipped or overlap
on the toggle/action row at 390px; eliminate the dark active-chip bleed.

### Minor (note — don't necessarily fix this round)
- Aisha's clipped date pill is the same artifact as R5-3 (covered by R5-3 fix).
- 1h-default end times can visually overlap adjacent events (Elena, Aisha) — acceptable;
  labeled "end time assumed (1h)", transparent, both testers declined to dock for it.
