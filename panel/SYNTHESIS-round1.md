# TripSync — VIEW-ONLY share-link add-feature — Panel SYNTHESIS round 1

Feature under test: read-only `/v/` share link alongside the editable `/t/` link.

## 1. Score table

| Name   | Clarity | Value    | Advocacy | view-only-works |
|--------|---------|----------|----------|-----------------|
| Priya  | Yes     | Marginal | 8        | Yes             |
| Marcus | Yes     | Yes      | 8        | Yes             |
| Wen    | Yes     | Yes      | 8        | Yes             |
| Tomás  | Yes     | Yes      | 9        | Yes             |
| Dana   | Yes     | Yes      | 8        | Yes             |
| Jules  | Yes     | Yes      | 8        | Yes             |
| Aisha  | Yes     | Yes      | 8        | Yes             |
| Rob    | Yes     | Marginal | 7        | Yes             |
| Elena  | Yes     | Yes      | 8        | Yes             |
| Sam    | Yes     | Yes      | 9        | Yes             |

- **At the ≥9 advocacy bar: 2/10** (Tomás 9, Sam 9).
- **Clarity = Yes: 10/10.**
- **view-only genuinely read-only with no boundary leak: 10/10** confirmed (distinct `/v/` route, banner present, edit affordances REMOVED not greyed/dead, clicking grid/event creates nothing, personal `.ics`/Add-to-Google-Calendar export still works for the recipient).
- **Tomás's prior-round read-only ask: RESOLVED** ("That's precisely what I asked for").

## 2. Complaints grouped by cause

### [IN-SCOPE FIX] Read-only mode leaks an edit hint on empty days — 4×
Raised by **Marcus, Dana, Aisha, Elena.** Empty-day onboarding copy
"Tap a slot to add an event, or use the + button below." renders under the
yellow View-only banner — a dead edit affordance that names a "+ button" that
isn't there and directly contradicts "you can't edit." Gone once events exist,
so a half-built/empty shared trip is where it bites.

### [IN-SCOPE FIX] View-only "Copy" button is non-parallel / wrong-link risk + testid on wrong element — 6×
Raised by **Priya, Marcus, Wen, Tomás, Aisha, Sam.** The view row's button is a
bare, lower-contrast "Copy" sitting next to the wide "Copy invite link" (edit) —
non-parallel label/width/weight, easy to grab the wrong link at a glance. Should
read "Copy view-only link" and match the edit button's weight. Separately (Wen),
the `share-edit-link` testid sits on a label DIV, not the actionable
"Copy invite link" button — move it onto the actual control.

### [IN-SCOPE FIX] Share link opens on TODAY with an empty grid — 3×
Raised by **Aisha, Elena** (and Priya touches the date-trust theme). The `/v/`
(and `/t/`) link lands on today's date with a blank grid because the trip's
events are on other dates; the viewer sees an empty calendar until they navigate
to the trip's first day. Land on the trip's FIRST event day. (Mitigates the
parser symptom below; Jules noted dates already auto-select correctly when the
parse lands on real trip dates — so the fix is to default the view to the first
populated day.)

### [IN-SCOPE FIX] Share + export controls buried in collapsed "Trip Details ▼" — 3×
Raised by **Rob, Elena** (and Aisha on the export side). Sharing is the core job
but the two-link share block — and the killer personal export (Download .ics /
Add to Google Calendar) — sit inside a collapsed "Trip Details ▼" panel, taking
a click to find. Surface share + export above the fold (especially on `/v/`).

### [OUT-OF-SCOPE / STRUCTURAL] Parser maps weekday names to today's dates — 3×
Raised by **Priya, Marcus** (and Jules's format-mismatch is adjacent). Paste of
"Friday/Saturday/Sunday" remaps to today's actual dates (e.g. Sat→Mon Jun 15)
instead of the trip's intended dates. Pre-existing PARSER behavior, NOT the
view-only feature. The date-default fix above mitigates the empty-grid SYMPTOM;
true weekday-to-date trust is a separate parser deepen, not this round.

### [OUT-OF-SCOPE / single-persona]
- **Wen** — wants CSV in/out for a spreadsheet diff workflow (.ics only today).
- **Rob** — wants an RSVP/"confirmed" visibility control; also plans trips
  ~monthly, so value=Marginal (audience recurrence non-fit), advocacy 7.
- **Sam** — slightly nervous about "anyone can edit" wording on the edit link
  (did not block; advocacy 9).
- **Jules** — can copy/share the link BEFORE confirming parsed events, so a
  hasty user can send an empty trip; plus natural one-line "Friday 5pm…" format
  failed to parse (parser-format, adjacent to the structural parser item).

**Likely structural holdouts:** Rob (value=Marginal, monthly use) and possibly
Priya (parser weekday→date trust, value=Marginal). The **in-scope-fixable 8s**
are Marcus, Dana, Aisha, Elena, Wen, Jules — their point-off is concrete polish,
not the feature's logic (Dana and Aisha both explicitly scored the view-only
feature itself a 9, docking the overall ~1 pt for these bugs/aesthetic).

## 3. Verdict

The view-only feature is a **functional success**: unanimous (10/10) confirmation
that the `/v/` link is genuinely read-only with no boundary leak, plus 10/10
clarity and Tomás's prior read-only ask resolved. The 8-cluster is driven by four
concrete IN-SCOPE polish fixes, not by the feature's correctness.

**Plan:** do ONE fix round targeting the four in-scope fixes, then DELTA-RETEST
only the sub-bar testers (Priya, Marcus, Wen, Dana, Jules, Aisha, Rob, Elena).
**Carry Tomás (9) and Sam (9) forward** — passing, no need to re-spawn.

The four in-scope fixes:
1. Remove the empty-day "Tap a slot to add an event…" edit hint from read-only mode.
2. Make the view-only Copy button parallel — "Copy view-only link", matched
   weight/width to "Copy invite link"; move `share-edit-link` testid onto the
   actionable element.
3. Default the share/view to land on the trip's FIRST event day, not today.
4. Surface the share block + personal export above the collapsed "Trip Details ▼".

**Predicted ceiling:** structural holdouts are **Rob** (value=Marginal, monthly
use — audience recurrence non-fit) and possibly **Priya** (parser weekday→date
trust). 9/10-at-9+ may or may not be reachable; if the fix round plateaus with
only audience non-fits left, **PARK** rather than chase the parser deepen in this
feature's panel.
