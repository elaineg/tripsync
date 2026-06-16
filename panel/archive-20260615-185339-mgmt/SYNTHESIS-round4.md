# Panel Synthesis — Round 4 (TripSync add-feature)

Exit bar: advocacy ≥9 ∧ clarity=Yes ∧ value=Yes.

## Score table

| Tester | Persona | Advocacy | Clarity | Value | At bar? | Note |
|--------|---------|----------|---------|-------|---------|------|
| 1  | Priya  | 9 | Yes | Yes | YES | carried at 9 |
| 2  | Marcus | 9 | Yes | Yes | YES | recovered 7→9 (own-events-solid verified via computed style) |
| 3  | Wen    | 9 | Yes | Yes | YES | carried at 9 |
| 4  | Tomás  | 9 | Yes | Yes | YES | carried at 9 |
| 5  | Dana   | 6 | Yes | No  | no  | allowable miss (visual/color + confirm-all) |
| 6  | Jules  | 9 | Yes | Yes | YES | held at 9 |
| 7  | Aisha  | 8 | Yes | Yes | no  | two surgical issues (R4-1, R4-2) |
| 8  | Rob    | 9 | Yes | Yes | YES | recovered/held at 9 (confirm-attribution survived id rework) |
| 9  | Elena  | 9 | Yes | Yes | YES | recovered 8→9 (non-author "Proposed by organizer" fixed) |
| 10 | Sam    | 9 | Yes | Yes | YES | held at 9 |

**State: 8/10 at the exit bar.** Clarity 10/10, value 9/10.

## Recovery from R3 (the regressions are healed)
The R3 root-cause fix (id-based identity, own events solid) landed and is verified at the
computed-style level by multiple testers:
- Marcus 7→9: own events compute SOLID border + opacity 1 (own, even unnamed creator);
  other-person events compute dashed + 0.65. Two-context check passes.
- Elena 8→9: a fresh non-author viewer now sees "Proposed by the organizer", never "by you".
- Rob held 9: confirm-attribution survived the id rework; his pre-name fallback bug also fixed.
- Sam, Jules held 9: future-date inheritance, share+confirm, mobile Week legibility all intact.
No regressions reported by any tester.

## Two remaining misses

### Aisha (8 — the convergence target; two concrete surgical issues)
Both on the PRIMARY desktop create path (the quick drag-create popover). She verified the
craft-consistency root fix at the rgba level and gives back 2 points for it, but holds at 8 on:
1. **Quick-create popover still uses native `<select>` time pickers** — the full "More" editor
   got the custom steppers, but the more-prominent first-touch path did not. Two treatments
   for one task; the un-fixed one on the prominent path.
2. **Quick-create Save silently DROPS the typed title** — typed "Tram 28 ride", input held it,
   Save persisted "(New event)". Reproduced twice. A NEW functional P1 first-run data-loss bug
   on the headline create path. The "More" editor saves the title fine; only the quick popover drops it.

→ Fix both → Aisha = 9 → **9/10**, ship.

### Dana (6, value=No — the documented ALLOWABLE MISS)
Functionally everything worked end-to-end, 0 console errors; her consistency + name-persist
gripes are fixed (she credits both). value=No stands on two visual/state items she's been
consistent about across rounds:
- Monochrome — every event the identical pale pill; "visual trip calendar" reads one-color.
  Wants per-type/rotating color (her Canva bar).
- Shared link shows DASHED "proposed" pills to viewers and to the creator until each event is
  manually confirmed; no Confirm-all / auto-confirm-creator-events, so a shared link looks like
  an unfinished draft.

**Deliberately NOT chased this round.** Per-type color + auto-confirm/Confirm-all would touch
the confirm semantics and own/other styling that Rob, Aisha, and Elena now depend on (and that
just recovered from the R3 regression). Chasing one holdout risks re-breaking three passers.
Dana remains the one allowable miss.

## Convergence path
Fix Aisha's two items (R4-1, R4-2 below) → Aisha 9 → **9/10 at the exit bar**, ship with Dana
as the documented allowable visual-bar miss.
