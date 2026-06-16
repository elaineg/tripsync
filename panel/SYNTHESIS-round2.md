# Panel Synthesis — TripSync drag-create feature, ROUND 2

**Verdict: 8/10 at the exit bar** (advocacy ≥9 ∧ clarity=Yes ∧ value=Yes). Up from R1's 1/10.
Two misses: **Rob (7)** — a real confirm-attribution correctness bug that REGRESSED him 8→7;
and **Dana (5, value=No)** — the Canva-grade visual holdout, treated as the one allowable miss.

## Score table
| # | Tester | Clarity | Value | Advocacy | At bar | Prior concerns |
|---|--------|---------|-------|----------|--------|----------------|
| 1 | Priya  | Yes | Yes | 9 | ✅ | both fixed (resize + snapping) |
| 2 | Marcus | Yes | Yes | 9 | ✅ | all 4 fixed |
| 3 | Wen    | Yes | Yes | 9 (carried) | ✅ | n/a (not re-tested at 9) |
| 4 | Tomás  | Yes | Yes | 9 | ✅ | all 3 fixed |
| 5 | Dana   | Yes | **No** | **5** | ❌ | some — visual still wireframe |
| 6 | Jules  | Yes | Yes | 9 | ✅ | all 3 fixed |
| 7 | Aisha  | Yes | Yes | 9 | ✅ | all fixed (dashed reframed-legible) |
| 8 | Rob    | Yes | Yes | **7** | ❌ | some (2/3); confirm-attribution bug |
| 9 | Elena  | Yes | Yes | 9 | ✅ | 2/3 fixed |
| 10| Sam    | Yes | Yes | 9 | ✅ | 2/3 fixed |

Clarity 10/10. Value 9/10 (only Dana No). Advocacy ≥9: 8/10.

## Strategy to clear the bar
Fix **Rob's confirm-attribution bug** → Rob to 9 = **9/10**, with Dana the one allowable miss.
Fold in the genuine regressions (R2-2, R2-3) and two low-risk legibility fixes (R2-4, R2-5).
**Do NOT touch surfaces that would regress the 8 passers** — no broad event re-theme, no
re-introducing a name wall before a solo creator's first create (a protected R1 win loved by
Elena/Jules/Sam), no changing the dashed=proposed-by-other semantics Aisha explicitly approved.

## Grouped complaints behind sub-bar / off-10 scores

### BLOCKER — confirm/propose attribution has no identity (Rob, the regression)
Rob drove two real browser contexts (owner + a friend). The friend was NEVER asked their name;
confirmations carry no identity, and "Confirmed by you" displays to EVERYONE. After the friend
confirmed Rob's event, Rob reloaded and his own event read "Confirmed by you" though he never
confirmed it. For a tool whose entire point is "who has confirmed they're in," this is worse
than R1's anonymous "Someone" — it's actively misleading. → **R2-1** (the bar-clearer).

### VALUE=No — visual bar (Dana, the one allowable miss)
All 9 events render as one identical pale-green dashed pill — no per-type color, icons, imagery,
or theming; "reads like a wireframe, won't screenshot it." Functionally everything worked
(parser, .ics, Google template link, no-login share). We are **NOT** chasing the full visual
overhaul this round: a broad re-theme risks regressing the 8 passers (Marcus/Aisha explicitly
like current event styling; Aisha approves dashed=proposed semantics). Dana stays the documented
allowable miss. We take only the targeted, low-risk slice of her feedback (R2-5: a solo creator's
OWN events should look finished, not dashed-wireframe) plus her two genuine regressions below.

### NEW regression — mobile Week truncation (Dana)
At 390px the R1 3-column Week view shreds every title ("6:00pm Chec...", "10:00am Bea..."),
unreadable without tapping. A regression introduced by the R1 fix. → **R2-2**.

### General friction — paste panel re-opens on reload (Dana)
Reloading re-appends `?paste=1` and pops the paste panel over the calendar. → **R2-3**.

### Single-persona polish (Sam) — add-form date default
Mobile "+ Add event" defaults Date to today even when "Go to:" shows a future date (e.g. Aug 1),
risking events on the wrong day. → **R2-4**.

## Off-10 nits (NO-FIX this round — do not act, would risk passers)
- Bulk "add whole trip to Google Calendar" (Elena, Sam) — needs OAuth, out of scope; .ics is the
  honest bulk path. The off-10 caveat for two already-passing 9s.
- Paste parser rejects natural pastes like "Fri 6pm Drive up to Tahoe" (Rob, Sam) — prior-round
  parser scope, not this feature; not weighted by Rob himself.
- Untitled-Trip naming nudge (Jules); popover stacks 5 actions / two greens muddy (Aisha);
  full 7-column Sun–Sat Week incl. empty days (Tomás); opacity:0.65 on unclaimed (Marcus) — all
  explicit non-blocking off-10 nits from passers; leave them to avoid regression risk.
