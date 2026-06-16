# Panel Synthesis — Trip-Management add-feature, Round 1

**Result: 0/10 at the 9-advocacy bar.** Every tester rated clarity=Yes and value=Yes; the
feature WORKS (validator + verifier confirmed delete→404 and rename-persists end-to-end).
The panel clusters at 8 purely on CRAFT / SURFACING of the new management controls — not on
function, not on trust (the for-everyone confirm modal earned explicit praise from 7 testers).

## Score table

| Tester | Clarity | Value | Advocacy |
|--------|---------|-------|----------|
| Priya  | Yes     | Yes   | 8        |
| Marcus | Yes     | Yes   | 8        |
| Wen    | Yes     | Yes   | 6        |
| Tomás  | Yes     | Yes   | 8        |
| Dana   | Yes     | Yes   | 7        |
| Jules  | Yes     | Yes   | 8        |
| Aisha  | Yes     | Yes   | 8        |
| Rob    | Yes     | Yes   | 8        |
| Elena  | Yes     | Yes   | 8        |
| Sam    | Yes     | Yes   | 8        |

Mean 7.7; eight at 8, Dana 7, Wen 6. No 9s. Exit bar = ≥9 testers at advocacy≥9 ∧ clarity=Yes ∧ value=Yes.

## Complaints grouped by cause

### CAUSE 1 — Recent-trips row: labeling hierarchy is BACKWARDS (RECURS 8× — DOMINANT)
Priya, Tomás, Dana, Jules, Aisha, Rob, Elena, Sam. The harmless "Remove from my list" gets
full text while the DESTRUCTIVE delete is a tiny (~26px) unlabeled red trash ICON sitting
~4px from the pencil; the device-vs-everyone scope lives ONLY in hover tooltips, invisible on
mobile/touch. Rob: "the most dangerous control is the least labeled." Jules/Elena: ~26px
targets ~4px apart = fat-finger risk on a destructive, for-everyone action. Aisha: a text link
flush against two bare icons reads as two visual languages, clumsy. This is the single
convergent reason the panel sits at 8. **REAL — fix.**

### CAUSE 2 — Mobile recent-trip name truncation (RECURS 3×)
Jules ("Beach…", "Campi…"), Sam ("Veg…", "Mike…"), Aisha (tight cluster). Names truncate so
hard you can't tell trips apart at a glance at 375–390px. **REAL — fix.**

### CAUSE 3 — "Set name" / trip-rename confusion (RECURS 2×)
Wen first clicked the header "Set name" trying to rename the TRIP (it sets the user's DISPLAY
name); Aisha notes "Set name" persists awkwardly next to the green "Saved" after a name is
set. The display-name control reads like a trip-rename control because they sit adjacent.
**REAL — fix.**

### CAUSE 4 — Inline-rename Enter also navigates into the trip (1×, but a genuine bug)
Marcus: pressing Enter in the landing recent-list rename field saves the rename BUT also
navigates into the trip; Enter should save and STAY on the list. The rename input is nested
in / triggered by the row's navigation Link. Single-persona but a real defect a reviewer
flags instantly. **REAL — fix.**

### CAUSE 5 — "Create New" under-surfaced on the trip page (1×, but spec-mandated)
Sam couldn't find how to spin up the next trip — only a tiny home icon; the trip-page "⋯"
menu has only Rename/Delete. Spec check 22 requires a labeled "Create New" control. Single
persona but it fails an existing acceptance check. **REAL — fix.**

### CAUSE 6 — Delete-confirm robustness (2×, conflicting evidence → harden)
Wen (via automation) reported the for-everyone delete fired NO confirm and removed nothing on
both entry points; Elena saw no confirm on mobile. EIGHT other testers saw the confirm modal
fire correctly on both surfaces, and the verifier confirmed delete→404. Likely an
automation/testid or mobile-render gap rather than a logic failure — but it dropped Wen to 6.
**HARDEN — guarantee the modal is a reliably-rendered, mobile-friendly dialog on BOTH the
list trash and the header menu, desktop AND mobile (builder adds testids).**

## Deferred / OUT OF SCOPE for this feature run (NOT fixes — note only)
Pre-existing or unrelated asks, not trip-management craft; chasing them risks regressing passers:
- Dana — Canva-grade per-category event color / cover imagery (the standing allowable visual miss).
- Rob — per-person event color coding.
- Tomás — read-only / view-only share mode (deliberate design choice; edit-by-link is the CUJ).
- Wen — surfacing the assumed YEAR as a warning (parser nice-to-have).
- Elena / Sam — bulk add-all-to-Google-Calendar (needs OAuth = out of scope; .ics is the bulk path).
- Aisha — considered empty-state for Recent trips; "Remove from my list" undo/toast (nice-to-haves).
- Marcus — parser robustness on genuinely messy real input (prior parser scope).

## Convergence
Fix the six REAL causes above (1 dominant + 2–6) with the precise labels/sizes/placement
specified in UX_BRIEF; carry Dana as the standing allowable visual miss. That lifts the eight
8s + Wen + Dana past the bar without touching the event-styling/confirm-semantics surfaces
that just recovered from the R3 regression. Target next round: ≥9/10.
