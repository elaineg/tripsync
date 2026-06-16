# Panel Synthesis — Trip-Management add-feature, Round 2

**Result: 8/10 at the 9-advocacy bar (clarity & value unanimous Yes, 10/10).** Advocacy arc
across rounds: 0 → 8. Every one of the 10 testers confirmed their round-1 trip-management
complaint is fixed; the feature that was the entire scope of this run is unanimously approved.
The two sub-bar testers are held SOLELY by pre-existing, out-of-scope items (see below).

## Score table

| Tester | Clarity | Value | Advocacy | Prior concern resolved? |
|--------|---------|-------|----------|-------------------------|
| Priya  | Yes     | Yes   | 9        | all                     |
| Marcus | Yes     | Yes   | 9        | all                     |
| Wen    | Yes     | Yes   | 9        | all                     |
| Tomás  | Yes     | Yes   | 8        | all (mgmt nit fixed)    |
| Dana   | Yes     | Yes   | 8        | all (mgmt nit fixed)    |
| Jules  | Yes     | Yes   | 9        | all                     |
| Aisha  | Yes     | Yes   | 9        | some (3 of 4)           |
| Rob    | Yes     | Yes   | 9        | all                     |
| Elena  | Yes     | Yes   | 9        | all                     |
| Sam    | Yes     | Yes   | 9        | all                     |

At-bar (advocacy≥9 ∧ clarity=Yes ∧ value=Yes): **8/10.** Both sub-bar testers (Tomás, Dana)
rate clarity=Yes and value=Yes and explicitly say the management feature itself is resolved.

## Round-1 → Round-2 deltas (what each fix resolved)

### Dominant R1 complaint RESOLVED for all 8 who raised it — backwards delete labeling/scope
Round 1's single convergent reason the panel sat at 8 (recurred 8×: Priya, Tomás, Dana,
Jules, Aisha, Rob, Elena, Sam) was the backwards labeling hierarchy: a destructive,
for-everyone delete shown as a tiny unlabeled red trash icon while the harmless "Remove from
my list" got full text, with device-vs-everyone scope living only in hover tooltips. Every one
of these 8 confirms it FIXED in round 2:
- Recent-trip rows now show three plainly LABELED text actions — "Rename" (pencil), grey
  "Remove from my list", red "Delete for everyone" (text + trash icon) — plus an
  ALWAYS-VISIBLE caption "Remove = this device only · Delete = everyone with the link" (no
  hover needed; works on touch). Confirmed by Priya, Tomás, Dana, Jules, Aisha, Rob, Sam.
- Tap targets: each action ~44px tall on separate rows (Jules measured 56px apart; Elena
  measured the red button 149×44 at 390px), killing the fat-finger risk on the destructive
  action. Confirmed by Jules, Elena, Aisha.

### Mobile recent-trip name truncation (R1 recurred 3×) RESOLVED
Jules, Sam, Aisha. Long trip names now wrap cleanly to 2 lines at 375–390px instead of
6-char "Beach…/Campi…" truncation. Jules verified two long names wrap; Sam verified all three
of his trips show full to 2 lines, zero truncation.

### "Set name" / trip-rename confusion (R1 recurred 2×) RESOLVED
Wen, Aisha. The display-name control is relabeled "Your name" (Priya: reads "You: Priya"
after set), removing the mistake-for-trip-rename ambiguity; the awkward "Set name" persisting
next to green "Saved" is gone. Confirmed by Wen, Aisha.

### Inline-rename Enter also navigated into trip (R1, Marcus) — BUG FIXED
Marcus verified by screenshot: renaming from the landing list and pressing Enter now SAVES
and STAYS on the list (URL stays at `/`, no navigation into the trip).

### "Create New" under-surfaced on trip page (R1, Sam — spec check 22) RESOLVED
Now a clearly-labeled control top-left of the trip page ("Create New" desktop, compact "+ New"
mobile). Confirmed by Sam, Dana, Rob, Tomás, Priya.

### Delete-confirm robustness (R1, Wen 6 + Elena) HARDENED + VERIFIED
Wen — the R1 delete blocker that capped her at 6 — verified end-to-end on BOTH entry points:
confirm dialog (testid delete-confirm-dialog) → exactly ONE `DELETE /api/trip/<id>` → 200 →
home redirect → trip URL 404s; sibling trip survives; "Remove from my list" issues no DELETE
(server trip still 200). Elena verified the confirm modal fires reliably on her phone viewport.

## Two remaining sub-bar testers — both out-of-scope / deferred

- **Dana (advocacy 8, value=Yes).** Her ONLY remaining blocker is the DEFERRED Canva-grade
  calendar VISUAL restyle (per-event/per-category color, cover) — she explicitly calls it "a
  joy gap, not a function gap, and not the management feature this round touched," and confirms
  the new management UI "polished and fully resolved my round-1 flags." This is the standing
  allowable visual miss, identical to the prior 9/10 ship's lone miss. OUT OF SCOPE: converting
  it requires touching the fenced proposed/confirmed event-block styling that Rob's, Aisha's,
  and Elena's confirm-flow approval depends on — high regression risk.

- **Tomás (advocacy 8, value=Yes).** Held SOLELY by the absence of a read-only / view-only
  share mode (wants coordinator-only editing for 15 mixed-age relatives). He explicitly says he
  is held "NOT because of the management UI (now excellent)." OUT OF SCOPE: read-only share is
  in the spec's "Out of scope" and contradicts the no-account open-edit-by-link wedge that is
  the product's core CUJ.

## Small in-scope nits still open from at-bar testers (minor follow-ups, NOT ship blockers)
- **Aisha (9):** empty Recent-trips state still absent — on a fresh device the "Recent trips
  on this device" heading doesn't render a "trips you make will show up here" placeholder. A
  considered-detail polish item; she advocates at 9 regardless. (priorConcernsAddressed=some.)
- **Sam (9):** trip-page HEADER title still truncates ("Mike's Bachel…") at 375px even though
  recent-list names now wrap to 2 lines; non-blocking (tap-to-rename pencil beside it).
- Non-management nice-to-haves repeated from R1 (not this run's scope): parser strictness on
  casual phrasing (Jules, Rob, Elena, Marcus), silent assumed-YEAR (Wen), bulk add-all-to-
  Google-Calendar/OAuth (Elena), per-person color (Rob).

## Convergence / decision
The management feature — the entire scope of this run — is unanimously confirmed fixed.
Per the panel-plateaus-at-ceiling and don't-grind lessons, the run SHIPS at 8/10 carrying
Dana (deferred visual restyle) and Tomás (out-of-scope read-only share) as documented
allowable misses rather than grinding another round against out-of-scope/fenced asks with low
conversion odds and real regression risk. The two small in-scope nits (Aisha empty-state, Sam
header truncation) are logged as minor follow-ups.
