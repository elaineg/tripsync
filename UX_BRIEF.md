# UX Brief — TripSync

> ## ROUND-5 FIXES (panel R4: 6/10 at advocacy ≥9 — DOWN from 7; R4's date "fix" was wrong and regressed Rob 9→5)
> Two clean 10s (Wen, Elena) + four carried 9s (Priya, Tomás, Jules, Sam). Sub-bar: Aisha 5,
> Marcus 8, Dana 8, Rob 5. Fix in priority order; R5-1 is the gate and the regression.
> Do NOT regress any R4 win: the silent partial-drop notice (Wen), name-skip-remembered-per-
> session on import (Elena), commit+render+persist of pasted events (Aisha confirmed it lands),
> full un-truncated ".ics" label that actually downloads (Dana).
>
> - **R5-1 (P0 — HIGHEST, the date bug, now correctly root-caused; unblocks Rob + Aisha).**
>   R4's "build dates in local time" change was the WRONG fix and introduced a regression.
>   Symptoms: "Friday Mar 7" renders/commits/exports as **Mar 6**; "Saturday March 8" → **Mar 7**;
>   but NUMERIC headers like "Sun 3/9" parse CORRECTLY (Rob) — a named-vs-numeric inconsistency.
>   It is NOT cosmetic: the exported **.ics bakes in the wrong day** — "Marco arrives" (Fri Mar 7)
>   exports `DTSTART ...20260306T170000`. Friends' real calendars get the wrong arrival day.
>   - **ROOT CAUSE:** the parser's weekday-snapping OVERRIDES an explicit numeric month+day —
>     when the stated weekday doesn't match the typed date, it MOVES the date to the nearest
>     matching weekday, silently corrupting explicit dates (and the .ics).
>   - **THE FIX:** an explicit numeric month+day is **AUTHORITATIVE** and must NEVER be shifted by
>     a weekday word. Use a weekday word to pick a date ONLY when the header has no explicit day
>     number (a bare "Saturday", "Day 1"). When BOTH are present and they DISAGREE, keep the
>     explicit date — optionally show a small NON-MOVING note ("you wrote Friday; Mar 7 is a Thu"),
>     but never move the date. This will NOT regress Wen (her matching weekday+date is used verbatim)
>     or Elena (bare/contradictory headers still resolve to a real date).
>   - **Checkable (acceptance):** pasting "Friday Mar 7\n17:00 Marco" resolves to **March 7** in
>     (a) the parse preview, (b) the day tabs, (c) the rendered calendar grid, AND (d) the exported
>     .ics `DTSTART` (`...20260307T170000`, NOT 0306). A bare-weekday header ("Saturday\n09:00 Coffee"
>     or "Day 1") still picks a correct real date. A MATCHING weekday+date ("Saturday Aug 8", where
>     Aug 8 is a Saturday) is used verbatim — no shift. Numeric "Sun 3/9" stays Mar 9. No header
>     shifts an explicit numeric date by a day in preview, tabs, grid, or .ics.
>
> - **R5-2 (P0 — new R4 bug; unblocks Aisha).** The "What's your name?" sheet's **Skip** button
>   does NOT dismiss it — it re-pops on the next interaction and steals/intercepts clicks; only
>   typing a name + Continue stops it. Note: Elena's skip-on-IMPORT works (R4 fix held), so there
>   are TWO name-prompt paths — the one that pops AFTER import isn't dismissed by Skip.
>   - **The fix:** Skip must IMMEDIATELY and PERMANENTLY dismiss the name prompt for the session in
>     ALL paths (both paths read the same session-skip flag); while open it must never intercept or
>     steal taps from controls beneath it.
>   - **Checkable (acceptance):** after a paste-commit, when the post-import name sheet appears,
>     tapping **Skip** dismisses it and it does NOT reappear on the next interaction (date-pill tap,
>     Confirm, Delete, or empty-slot tap); those taps land on their real targets, not the sheet.
>     The header name chip is still the way to set a name later.
>
> - **R5-3 (cosmetic but 4th ROUND — structural; unblocks Marcus + Dana).** A dark `bg-[#1a1a1a]`
>   (rgb 26,26,26) date-jump "day chip" (e.g. "Jun 15"/"May 1") sits in an `overflow:auto` strip on
>   the SAME ROW as the refresh + Copy-invite buttons + view toggle, so at 390px the active dark chip
>   is clipped to a ~17px dark sliver ("M") and/or overlaps the refresh + Copy controls. The R4 wrap
>   did not fix it. This bug has now survived FOUR "fixed it" claims and is eroding craft trust.
>   - **The fix (structural, must end this):** move the day-navigation date chips to their OWN row,
>     FULL WIDTH, BELOW the view-toggle + action buttons. Nothing dark may be clipped or overlap on
>     the toggle/action row; eliminate the dark active-chip bleed entirely.
>   - **Checkable (acceptance):** at 390px in the loaded-trip state (events present, modal dismissed),
>     NO dark chip is clipped or overlaps the refresh/Copy controls or the Day/Week/Month toggle —
>     zero dark sliver/box beside or after the toggle; the date chips live on a separate full-width
>     row, each fully visible, every control's right edge ≤390px. Verify on a real 390px touch viewport.
>
> - **Minor / NO-FIX (note only):** Aisha's clipped date pill is the same artifact as R5-3 (the R5-3
>   fix covers it); the 1h-default end-time visual overlap of adjacent events (Elena, Aisha) is
>   acceptable — it's labeled "end time assumed (1h)" and both testers declined to dock for it.
>
> ## ROUND-4 FIXES (panel R3: 7/10 at advocacy ≥9; clarity 10/10. Block: a R3 regression + a 3rd-round mobile bug)
> Progress 0→3→7 — one regression away from passing. Do NOT regress any R1/R2/R3 win
> (mobile scroll, auto-scroll, persistence flush, optional name, 24h parser, helpful empty-state).
> Fix in priority order; R4-1 is the gate.
>
> - **R4-1 (P0 — REGRESSION introduced in R3, HIGHEST priority) — every previewed event MUST
>   commit and RENDER on the calendar** (unblocks Aisha 8→3→9; fixes Rob's date label). The R3
>   parser/date rewrite broke the FINAL commit: clicking "Add to <trip>" silently discards all
>   parsed events — the calendar stays "No dates yet" in Day AND Week, with NO console error and
>   NOTHING persisted (Aisha reproduced 4× with 24h times + "Day 1 - Friday" headers). Root cause
>   is bad date resolution: (a) headers with no explicit month/day ("Day 1") produce **Invalid
>   Date**, so events are filtered out on commit/render; (b) a **JS timezone off-by-one** (dates
>   built from ambiguous strings / UTC vs local) shifts dates back a day (Rob: "Friday Mar 7" →
>   "Fri, Mar 6"). Fixes:
>   - **EVERY event that appears in the preview MUST commit and render** — there is no input that
>     parses into the preview but vanishes on Add. The commit path must not silently drop events.
>   - **Construct all dates in LOCAL time** (e.g. `new Date(y, m, d)` / explicit local
>     components — never parse an ambiguous date string that defaults to UTC). No off-by-one: the
>     date shown in the preview is the date that renders in the day tabs and grid.
>   - **Headers without an explicit month/day get sensible SEQUENTIAL real dates** (Day 1 → the
>     trip's first concrete date, Day 2 → next day, etc.) — NEVER Invalid Date. If a real date
>     genuinely cannot be derived, reject the line into the helpful "couldn't read this" message
>     (R4-3), never silently filter it out at commit.
>   - **Checkable:** paste "Day 1 - Friday\n09:00 Coffee\n14:30 Lunch" → preview shows 2 events →
>     click Add → BOTH events render on the day grid (Day AND Week) on real dates, persist on
>     reload, and appear on a fresh-context invite link. Paste "Friday Mar 7\n17:00 Marco" → the
>     preview, day tab, and grid all read **Mar 7** (not Mar 6). No input that previews N events
>     commits fewer than N. The verifier MUST assert commit+render on the calendar, not just that
>     events appear in the preview.
>
> - **R4-2 (recurring — THIRD round, P0) — the mobile 390px action strip must FIT or WRAP, with
>   no clipped/overflowing controls and no dark bleed** (unblocks Marcus + Dana, both → 9). The
>   R3 fix only changed the button, not the overflowing container, so it returns in the real
>   loaded-trip state. Dana's diagnosis: (a) a dark `rounded-lg` button (bg ~rgb(26,26,26)) is
>   clipped to just its rounded LEFT edge, crowding the Day/Week/Month toggle once a trip has
>   events (the "black sliver"); (b) the bulk button's right edge (~450px) is clipped by an
>   `overflow-hidden`/`overflow-x-auto` ANCESTOR at 390px, truncating "Save to calendar (.ics)"
>   to "Save to cale…". Fixes:
>   - The entire action strip must FIT within 390px or WRAP onto a second row — no horizontal
>     overflow, no element clipped by an ancestor, no control truncated. Fix the CONTAINER, not
>     just the label.
>   - No dark sliver/bleed at the right edge of the Day/Week/Month toggle in any state (empty OR
>     loaded-trip). The control after the toggle must sit fully within the viewport with breathing
>     room, not clipped to a rounded nub.
>   - **Checkable:** at 390px in the loaded-trip state (after paste→commit, modal dismissed),
>     measure that NO element extends beyond the viewport (every control's right edge ≤ 390px,
>     left edge ≥ 0); the bulk-export button shows its COMPLETE label "Save to calendar (.ics)";
>     zero dark sliver beside the view toggle. Verify on a real 390px touch viewport, loaded state.
>
> - **R4-3 (Wen — data hygiene) — surface a count of skipped/unparsed lines** (lifts Wen toward
>   10). A single unparseable line inside an otherwise-valid paste ("noon Checkout") is currently
>   dropped SILENTLY — its day header renders empty with no flag. The all-garbage case warns
>   loudly; a partial drop must too.
>   - On commit (or in the preview), show a small non-blocking notice: "N line(s) couldn't be
>     read and were skipped" — ideally listing or letting the user view the skipped lines so they
>     can fix the paste. It omits rather than mistransforms (keep that), but it must NOT be silent.
>   - **Checkable:** pasting a valid block containing one unparseable line (e.g. "noon Checkout")
>     parses the good events AND shows a visible "1 line skipped" notice — never a silent omission.
>
> - **R4-4 (Elena) — remember a skipped name for the session** (lifts Elena toward 10). Skipping
>   the name once on import is safe and persists, but the modal re-prompts on the FIRST
>   Confirm/Delete after a skip.
>   - If the user skips/dismisses the name prompt once, do NOT re-prompt on the next write
>     interaction this session — ask at most once per session. The header chip remains the way to
>     set a name later.
>   - **Checkable:** import → Skip the name → Confirm or Delete an event → the name modal does NOT
>     reappear; the action still fires its PUT and survives reload.
>
> - **Minor / NO-FIX (note only):** Tomás wants a beach-house sample (cosmetic — SF sample fine);
>   Elena/Aisha noted near-adjacent events overlap (4:30 vs 5:15) — that's the existing
>   column-tiling, acceptable; Priya's optional "may ask you to sign in to Google" note on the
>   per-event button is nice-to-have, not required.

> ## ROUND-3 FIXES (RESOLVED — kept for history; do not regress) (panel R2: 10/10 clarity+value; 3 PASS at ≥9, seven at 8 — push the 8s to ≥9)
> All R1/R2 P0 dealbreakers (mobile scroll, auto-scroll, persistence flush) are RESOLVED — do
> not regress them. The seven 8s are held back by the items below. H1 is the highest priority:
> the PRIMARY flow (paste → calendar) silently breaks on real-world input.
>
> - **H1 (highest) — Parser must accept real itineraries and NEVER fail silently** (unblocks
>   Aisha, Rob). Today only the built-in sample parses; 24-hour times ("09:00 Coffee",
>   "14:30 Lunch") and testers' own pasted text return "0 events" with NO message.
>   - **(a) Accept 24-hour times** with or without a trailing label: "09:00", "9:00", "14:30",
>     "09:00 Coffee", "09:00–10:30 Coffee", alongside the existing AM/PM forms.
>   - **(b) Broaden line/header tolerance** for common day-headers ("Day 1", "Friday",
>     "Fri May 1", "May 1", "5/1", "Monday, June 2") and time-line variants (en/em dash or
>     "to" ranges, time-then-title or title-then-time, leading bullets/dashes).
>   - **(c) NEVER fail silently.** If a paste yields 0 events (or only Trip-Details lines),
>     show a clear, friendly inline message in the preview area — NOT an empty calendar —
>     explaining the accepted format with 2–3 concrete example lines (e.g. "Couldn't find any
>     timed events. Try lines like '9:00 AM Coffee' or '14:30 Lunch — Cafe Central'."), so the
>     user can fix their paste. Keep the original pasted text visible so they can edit it.
>   - **Checkable:** pasting "Day 1 — Friday\n09:00 Coffee\n14:30 Lunch" parses 2 events on
>     the correct day; pasting random prose shows the helpful empty-parse message, never a blank
>     calendar and never a silent 0-event commit.
>
> - **H2 — Name is optional/skippable, and the parsed import is NEVER discarded** (unblocks
>   Priya, Marcus, Elena). Today commit gates on a "What's your name?" modal and bailing it
>   silently loses the whole import. Per design decision in Identity (below), the name is asked
>   on first WRITE interaction, browse-first — it must not gate the paste-commit itself.
>   - The paste-import COMMITS (events written + persisted) regardless of the name step.
>   - If the name step is shown, it offers a clear "Skip" / dismiss; skipping or cancelling
>     commits the import anyway and attributes actions to an anonymous participant until a name
>     is set later (editable from the header chip).
>   - **Checkable:** parse the sample → commit → dismiss/cancel the name prompt → all events are
>     still present, saved (PUT fired), and visible on reload and on a fresh-context invite link.
>
> - **H3 — Kill the two cosmetic 390px nits** (unblocks Dana, Marcus; helps Aisha, Jules).
>   - No black "sliver" pokes out to the right of the Day/Week/Month view toggle at 390px.
>   - The bulk-export button label renders in full at 390px (no "Downloa…" truncation) — shorten
>     the label, wrap, or widen so the full word shows.
>   - **Checkable:** at 390px, zero stray dark sliver beside the view toggle; the export button
>     shows its complete label.
>
> - **H4 (framing only — do NOT add OAuth) — Lead with .ics as the primary "add everything"
>   path** (helps Priya, Elena; honest for all). True bulk one-tap Google add needs OAuth =
>   out of scope (no credentials, free-tier rule). The .ics is the correct bulk mechanism.
>   - Make the bulk .ics the visually PRIMARY "add the whole trip to your calendar" action;
>     keep per-event "Add to Google Calendar" as the secondary path.
>   - Frame honestly: e.g. "Add the whole trip → Download .ics (imports into Google/Apple/
>     Outlook)" as primary; per-event Google add labeled as the one-event convenience.
>   - **Checkable:** the bulk .ics action is the prominent add-to-calendar affordance; no copy
>     claims a one-tap bulk Google add.
>
> - **H5 — OUT OF SCOPE BY DESIGN** (Tomás, single persona): no view-only/read-only link. Free
>   editing by anyone with the link is the core CUJ (two trusted companions co-editing one plan).
>   The honest "anyone with this link can view and edit" banner already sets expectations. Do NOT
>   build an edit-lock — note as a deliberate design choice.

> ## ROUND-2 MUST-FIX (RESOLVED — kept for history; do not regress) (panel R1 = 0/10; address every item, A/B/C are blockers)
> Desktop is loved; all failures are mobile day-view + save timing. Builder must verify each
> on a REAL 390px touch viewport, not desktop.
> - **A (P0) — Mobile day grid MUST scroll.** Today at 390px `document.scrollHeight ==
>   viewport`, inner grid is `overflow-y:hidden`, evening events (El Chato 8:30pm at y≈1077)
>   are clipped off-screen and untappable. Make the day grid a real vertically-scrollable
>   region (see Day-grid layout rules below).
> - **B (P0) — Cold mobile open auto-scrolls to the first event.** Unblocked by A. No more
>   landing on empty 5am–noon hours.
> - **C (P0) — Save flushes immediately on commit/structural change; Copy-invite is
>   flush-then-confirm.** Today a friend opening the link <~2s after commit sees "No dates yet"
>   (debounced write); Elena's trace showed NO save call on commit. See Persistence model below.
> - **E — Fix Google-Calendar copy + surface bulk export.** Bulk is an .ics download, not bulk
>   Google add; stop overselling and stop hiding it behind a confirm.
> - **F — Tighten mobile header to ≤96px; stop clipping the day/view pills.**
> - **D — Parse preview shows resolved date+weekday, discloses the 1h default, respects typed
>   weekday, is editable.**
> - **G — Tighten the run-on headline.**

## 1. Problem statement
Your friend's messy itinerary, turned into a shared day-by-day calendar you both open and edit
from one link — no app, no login.

(Hero headline — tighten from the R1 run-on per CAUSE G; the subhead carries "Paste an
itinerary and watch it become a visual hourly calendar." Do NOT claim bulk Google-add — see E.)

## 2. Primary user action
OPEN a shared trip link on a phone and SEE today's plan at a glance (Emily's "just look").
The creator's primary action is SEED: paste a written itinerary and watch it become the
calendar. Landing-for-a-shared-link always renders the calendar first; landing-for-a-creator
renders the paste box pre-filled with the sample so the outcome is visible before typing.

## 3. Emotional tone
Calm, warm, trustworthy — "your trip is in good hands." Friendly humanist sans (Inter), warm
neutral background (#FAF7F2 / soft sand), generous vertical rhythm on the day grid (comfortable
touch targets, not dense spreadsheet rows). Author colors are soft saturated pastels, never neon.

## 4. Design decisions (the considered, delightful, checkable ones)
- **D1 — Default = glance, edit = revealed.** The day view shows ONLY: trip name, date strip,
  Trip Details card, and the hourly grid with events. NO edit toolbar, NO drag handles, NO
  confirm buttons until you tap an event (opens a bottom sheet with Edit / Confirm / Add-to-
  Calendar) or tap an empty slot (adds an event). Collab chrome never sits on top of the grid.
- **D2 — Empty trip = the paste box IS the hero**, not a blank calendar. A single large textarea
  reading "Paste your itinerary here," a "Load sample itinerary" link beneath it, and a Parse
  button. Parsing opens a PREVIEW (events bucketed by day + a "Details" bucket) with Confirm /
  Cancel — nothing is written to the server until Confirm.
  - **CAUSE D — the preview is honest and editable.** Each day bucket shows the RESOLVED date +
    weekday it will be placed on (so Wen sees "Sat, Aug 9" vs "Sun, Aug 9" and catches a
    mismatch). When an explicit weekday word is typed, RESPECT it (don't silently move it). Lines
    with no end time get a default 1h block that is DISCLOSED inline ("end time assumed — 1h").
    Rows are editable in the preview (fix a time/duration/title) before Confirm, not just
    Add/Cancel.
- **D4 — Save flushes immediately on commit and structural change (CAUSE C, P0).** Persistence
  model: debounce ONLY incremental drags/edits (resize, move, text tweaks) to absorb flurries;
  but the FIRST commit of a paste-import and any STRUCTURAL mutation (add/delete/confirm event)
  FLUSHES to the server immediately — no debounce window. "Saved" must reflect real server state,
  never optimistically show before the write lands (Elena's trace had zero save call on commit —
  that's the bug to kill). Result: a friend opening the link the instant events appear sees them.
- **D3 — Copy-link confirmation that survives everything, AND guarantees the trip is saved
  first (CAUSE C).** The persistent "Copy invite link" button is **flush-then-confirm**: on
  click it first awaits a completed save (flush any pending debounced write), THEN copies and
  turns green / swaps to "Copied!" in place (no toast that vanishes), backed by
  `aria-live="polite"`. The link a friend opens must ALWAYS already contain the events. If a save
  is in flight the button shows "Saving…" briefly, then "Copied!" — it never confirms before the
  server has the trip. If clipboard is blocked it reveals a pre-selected read-only input with
  "Copy failed — select and copy this link." State is owned by the button, so re-render keeps it.

## 5. The 5-second check (cold visitor, shared link, 390px phone, ABOVE THE FOLD)
1. **Headline area (sticky, compact):** trip name ("Joanne visits — July") + a horizontal
   scrollable date strip with the current/first day selected. Height ≤ ~96px so it never buries
   the grid; it must NOT overlap grid tap targets (see Layout rules).
2. **Subtitle / Trip Details card:** one collapsible card showing the preamble (weather, what to
   bring) — collapsed-to-2-lines by default on mobile so it doesn't push the grid down.
3. **Primary action visible:** the hourly DAY GRID with the day's events rendered immediately —
   author-colored blocks, proposed dashed/translucent, confirmed solid + check + "Confirmed by X".
   A tap on any event or empty slot is the obvious next move; events with links show a link glyph.
4. **Pre-filled example:** a real seeded trip always has events; an empty creator trip shows the
   sample loaded in the paste box. A cold visitor never sees a blank box.

---
## Layout & hierarchy spec (so two builders converge)

### Views & switcher
- Month / Week / Day segmented control, placed in the sticky header (top, discoverable — not
  buried). **Day is default on mobile; Week default on desktop.** Day grid is the hero; polish it
  hardest (Addendum 2: the mobile day view is the whole product).

### Mobile header budget (CAUSE F — 5 personas: clipped pills, chrome eats the screen)
- The ENTIRE sticky header (trip name + view switcher + date strip + Copy + refresh) fits in a
  ≤96px budget on a 390px phone. Below it: the scrollable day grid gets the rest of the screen.
- **Nothing clips.** R1 clipped a black sliver of the May 1 / May 2 day pill against the
  refresh/Copy buttons (Marcus, Dana, Jules, Rob). The date strip is its own horizontally
  scrollable row that does NOT collide with the action buttons; if space is tight, move
  Copy/refresh onto their own compact row or into icons — never let them overlap the pills.
- The "anyone with this link can view and edit" banner and the Trip Details card do NOT both
  expand above the grid on mobile: collapse the banner to a single small line (or a lock icon
  with a tap-to-read), and keep Trip Details collapsed-to-2-lines (D1). Combined chrome must not
  push the first event below the fold. Honor mobile-sticky-overlay-occludes-tap-targets.

### Export & "Add to Google Calendar" (CAUSE E — 4+ personas: oversold + hidden)
- **Honest copy.** Per-event = "Add to Google Calendar" (real render?action=TEMPLATE URL).
  Bulk = "Download .ics (import to any calendar)" — NOT "add all to Google Calendar." The
  homepage subtitle must NOT imply one-tap bulk Google add (Dana/Elena/Sam/Jules). State the
  two paths plainly.
- **Surface bulk export without a gate.** R1 hid the bulk .ics until at least one event was
  confirmed. Show the bulk-export affordance whenever the trip has events; if it exports only
  confirmed events, label it "Download confirmed (.ics)" and make the confirm-first relationship
  visible, not a surprise.

### Day-hourly hero grid
- Vertical hourly grid, labeled hour rows, 15-min snap. Events positioned by start/end.
- Event block: author-color left bar + fill; title; time; link glyph if URL present. Proposed =
  dashed border + ~60% opacity + a small "Proposed" tag/icon ON the block (Aisha: dashed alone
  isn't legible until tapped). Confirmed = solid + check + "Confirmed by <name>" caption.
- Tap event → bottom sheet: title/time/location/notes (links tappable), Edit, Confirm, Add to
  Google Calendar (Google render URL | Download .ics), Delete. Tap empty slot → new-event sheet.

- **CAUSE A — the grid MUST be a real vertically-scrollable region (P0 blocker, 5 personas).**
  The R1 build height-locked the grid (`overflow-y:hidden`, doc height == viewport, scrollTop
  stuck 0), so every event past midday was clipped off-screen and unreachable on a phone. The
  fix:
  - The hour rows live in ONE dedicated scroll container with `overflow-y: auto` and an INTRINSIC
    height that EXCEEDS the viewport (full 24h, or at minimum first-event→last-event+margin), so
    there is genuinely something to scroll to. The grid's content height must be > its visible
    height — assert this.
  - That scroll container is the only thing that scrolls in the day view; the sticky header sits
    above it and never overlaps the first hour rows (see header rules + friction guardrails).
  - **Checkable:** on a 390px touch viewport, a vertical swipe up moves the grid and the last
    event of the day (e.g. an 8:30pm block) becomes visible and TAPPABLE. `scrollTop` changes
    from 0 on swipe. Verify on a real touch viewport, not desktop.

- **CAUSE B — auto-scroll to the first event on cold open (P0 blocker, 7 personas).** Once A is
  fixed, on mount the day view programmatically scrolls its container so the FIRST event of the
  selected day (or "now" if today is in range) is near the top of the visible area — never a wall
  of empty 5am–noon hours. Gate to mount; re-run when the selected day changes. Honor the
  cold-load-auto-open friction lesson: this is a scroll, not an auto-opened panel, and it must
  not push the grid below the fold.

- **CAUSE A (tap vs swipe) — scrolling must NEVER create an event (Priya).** Distinguish a TAP
  (no/low movement, short duration) from a SWIPE (vertical movement beyond a small threshold)
  before firing the add-event/name prompt on an empty slot. A scroll gesture that happens to
  start on an empty slot scrolls — it does not open the new-event sheet. Only a deliberate tap
  adds an event.

- **HARD REQUIREMENT (When2meet fatal flaw): a plain vertical swipe ALWAYS scrolls the grid.**
  Moving/resizing an EVENT requires an explicit drag-handle (small grip on the block) OR a
  long-press (~400ms) that visibly "lifts" the block before any move. Never bind move/resize to a
  bare touchstart+drag. Verified on a real 390px touch viewport, not desktop drag.

### Identity
- No name prompt on load — browse first. On the FIRST write interaction (add/edit/confirm),
  inline-ask "What's your name?" once, then store {name, participantId} in localStorage keyed by
  the secret. Name is editable from a small chip in the header; returning on the device auto-resumes.

### Honest framing
- Near the Copy-invite-link button (create screen AND a small share affordance in-app):
  "Anyone with this link can view and edit — share only with your travel companions." Never claim
  "nothing leaves your browser."

### Trip Details panel
- Pinned card above the grid, editable by anyone, holds non-time-bound notes (weather, what to
  bring, dress code). Receives the parsed preamble. Collapsed by default on mobile.

### Friction-lesson guardrails (apply in layout)
- **Sticky header must not occlude grid tap targets:** the grid's scroll/tap area starts BELOW the
  sticky header; no sticky overlay covers the first hour rows or event edges.
- **Auto-open gated to desktop:** any auto-expanded panel (e.g. share/details) is desktop-only;
  on mobile nothing auto-opens that would push the day-grid hero below the fold.
- **Primary/new affordances stay discoverable:** view switcher, Copy-invite, and Add-to-Calendar
  live at the top or in the obvious event sheet — never buried in an overflow menu.
