# UX Brief — TripSync

> ## ROUND-4 FIXES (add-feature panel R4: 8/10 at the exit bar — the R3 regressions RECOVERED)
> Marcus 7→9, Elena 8→9; Rob/Sam/Jules held at 9; Priya/Wen/Tomás carried at 9. The id-based
> identity + own-events-solid root fix landed and is verified at the computed-style level — no
> regressions. TWO misses remain: **Aisha (8)** with two surgical issues, and **Dana (6,
> value=No)** the documented allowable visual-bar miss. Convergence: fix Aisha's two items
> below → Aisha 9 → 9/10, ship with Dana as the allowable miss. BOTH fixes live on the QUICK
> drag-create popover — the PRIMARY desktop first-touch create path every desktop user hits.
> Do NOT regress any prior win (own=solid via id ownership, other=dashed/proposed, viewer-
> relative confirm attribution, mobile Week legibility, future-date inheritance, no name wall
> before a solo creator's first create, the custom steppers + title-save in the full "More" editor).
>
> - **R4-1 (Aisha — craft consistency on the primary path) — the QUICK drag-create popover must
>   use the SAME custom time picker as the full editor; ZERO native `<select>` in the quick
>   popover.** R3 added custom (non-native) time steppers to the full EventEditSheet ("More"),
>   but the QUICK drag-create popover — the default first-touch create path — STILL renders two
>   native OS `<select>` time dropdowns (e.g. 10:15am / 12:15pm). The same task has two different
>   picker treatments, and the un-fixed native one sits on the MORE prominent path.
>   - **The fix:** render the SAME custom stepper time control (the ‹ 10am › ‹ 15 › steppers used
>     in "More") inside the quick-create popover. No native `<select>` time element anywhere in
>     the quick popover.
>   - **Checkable:** after a drag-create on a fine-pointer viewport, the quick popover's time
>     range is set via the custom stepper control; the popover contains ZERO native `<select>`
>     elements — byte-for-byte the same picker as the full "More" editor.
>
> - **R4-2 (Aisha — NEW functional P1; first-run data loss on the headline create path) — the
>   quick-create Save must PERSIST the typed title.** In the quick drag-create popover: type a
>   title (e.g. "Tram 28 ride"), the input visibly holds it, hit Save → the event persists as
>   "(New event)" — the typed title is SILENTLY dropped. Reproduced TWICE (even after a Tab
>   blur). The full "More" editor saves the title fine; only the quick popover drops it. Likely a
>   state/ref commit race — quick-create Save reads a stale/empty title value rather than the
>   typed input. This is on the path EVERY desktop user hits first, so it's a real user's very
>   first event losing its name — high priority.
>   - **The fix:** quick-create Save must persist EXACTLY the typed title. An EMPTY title still
>     falls back to "(New event)" (per AF-2), but a NON-EMPTY typed title must NEVER be dropped.
>     Commit the live input value on Save (not a stale ref).
>   - **Checkable:** drag-create → type "Tram 28 ride" → Save → the chip and the persisted event
>     read "Tram 28 ride" (NOT "(New event)"), survive reload and a fresh-context invite link.
>     Drag-create → leave title empty → Save → falls back to "(New event)". Verified twice.
>
> - **Minor / NO-FIX (the ALLOWABLE MISS — note only):** Dana value=No is the ONE documented
>   allowable miss. Her two items — (a) per-type/rotating event COLOR (every event is one flat
>   pill; "visual trip calendar" reads monochrome) and (b) auto-confirm-the-creator's-events /
>   "Confirm all" so a shared link doesn't render as dashed "proposed" drafts — are DELIBERATELY
>   NOT chased this round. Both touch the confirm semantics and own/other styling that Rob,
>   Aisha, and Elena now depend on and that JUST recovered from the R3 regression; chasing one
>   holdout risks re-breaking three passers. Sam/Elena bulk "add whole trip to Google Calendar"
>   = known OAuth-out-of-scope limitation (.ics is the bulk path), both at bar. Jules/Marcus
>   Day-vs-Week per-density border/hue difference = deliberate density affordance, not a bug.
>   Rob's natural-paste parser pickiness = prior parser scope, low impact (he builds on the grid).
>
> ## ROUND-3 FIXES (add-feature panel R3: 6/10 — a REGRESSION from R2's 8/10)
> Rob's R2 confirm-attribution blocker is FIXED and stable (7→9). But the R2 styling/identity
> changes REGRESSED three previously-passing testers — Marcus 9→7, Aisha 9→6, Elena 9→8 — and
> ALL THREE trace to ONE root cause: identity is keyed off a NAME STRING, so an unnamed solo
> creator has no self-identity and a fresh viewer matches the empty "you" fallback. This round
> is a ROOT-CAUSE fix, NOT symptom patches. Dana (6, value=No) stays the ONE ALLOWABLE MISS
> (Canva-grade per-type color/imagery — deliberately not chased; it risks the other passers).
> Do NOT regress any prior win (no name wall before a solo creator's first create; viewer-
> relative confirm attribution; mobile Week legibility; clean reload; viewed-date inheritance).
>
> **CRITICAL builder directive — the R2 build FALSELY CLAIMED the own-events-solid fix landed.**
> Marcus pulled computed styles and proved own events are STILL dashed + opacity 0.65. Claims
> are not accepted this round. The builder MUST SELF-VERIFY with COMPUTED STYLES before handing
> off: (a) an own event created by a SOLO creator with NO NAME SET, on BOTH desktop AND 390px
> mobile, asserting SOLID border + FULL opacity (no dashed, no opacity:0.65); (b) an other-
> person proposed event, asserting DASHED; and (c) the attribution text shown to a NON-AUTHOR
> viewer with no name set — it must NOT say "you". Paste the computed-style readouts as evidence.
>
> - **R3-1 (P0 — ROOT CAUSE; fixes Elena 8→9, enables R3-2/R3-3; unblocks Marcus 7) — replace
>   NAME-STRING identity with a STABLE per-device PARTICIPANT ID.** Today identity compares by
>   name, so: (a) a SOLO creator who hasn't set a name has NO identity → their own committed
>   events fail the "is this mine?" check → render as another-person's dashed/faded "proposed"
>   (Marcus: his own SAVED titled event computes `event-proposed border-dashed opacity:0.65`);
>   (b) any viewer without a name MATCHES the "you" fallback → a fresh NON-AUTHOR opening the
>   creator's event sees "Proposed by you" (Elena) — backwards.
>   - **Establish a stable participant ID at trip-create / first event, EVEN WHEN NO NAME IS
>     SET.** Persist it in localStorage keyed by the trip secret (e.g. `ts_participant_<secret>`).
>     The name (if/when given) attaches to that id; the id exists with or without a name.
>   - **Stamp every event's `authorId` and every confirm's `confirmerId` with that device id.**
>     Compare by ID, NEVER by name string.
>   - `isOwnEvent = event.authorId === this device's participantId` — not a name comparison.
>   - **Attribution display:** show "you" ONLY when the actor's id === this device's id.
>     Otherwise show the actor's NAME; if the actor has no name yet, show a NEUTRAL label —
>     "the organizer" for the trip creator, "a guest"/"someone" otherwise — NEVER "you" for a
>     non-self actor. So a fresh viewer sees "Proposed by the organizer", never "Proposed by you".
>   - **This MUST work for the UNNAMED solo creator (the cold default)** — that empty/no-name
>     case is exactly what the R2 verifier gate missed and where all three regressions live.
>   - **Checkable:** solo creator with NO name set creates an event → `isOwnEvent` is true (own
>     id matches) → it reads as theirs, not "proposed", and renders solid (R3-2). A FRESH viewer
>     (different device, no name) opening the creator's event reads "Proposed by the organizer",
>     never "Proposed by you", and is not falsely attributed.
>
> - **R3-2 (P0 — root styling; Marcus, Aisha, Dana-partial) — OWN events render SOLID border +
>   FULL opacity at EVERY breakpoint and view.** A creator's OWN events must render SOLID border
>   + full opacity (DROP `opacity:0.65` and `border-dashed` for own events) on desktop AND
>   mobile, in Day AND Week. Dashed + faded is reserved ONLY for ANOTHER person's unconfirmed-
>   proposed event. This MUST be driven by the id-based `isOwnEvent` from R3-1 so it actually
>   applies to the unnamed solo creator. (R2 claimed this landed but it did NOT — Marcus's
>   computed styles prove own events are still dashed/faded.)
>   - **Checkable:** the unnamed solo creator's own event computes a SOLID border + opacity 1 on
>     1280px AND 390px, in Day AND Week. Another participant's unconfirmed-proposed event still
>     computes dashed + reduced opacity. Verified via getComputedStyle, not eyeballs.
>
> - **R3-3 (Aisha — exact prescription) — ONE event-style source of truth across Day/Week ×
>   desktop/mobile.** The SAME logical state must render the SAME fill color and the SAME
>   dashed(other-proposed)/solid(own-or-confirmed) rule in ALL FOUR view×breakpoint combos.
>   Eliminate the cross-breakpoint color split: an own event computes mint-green
>   `rgba(168,213,186)` on 390px Day vs blue `rgba(181,200,232)` on desktop — pick ONE palette
>   and apply it everywhere. No single state may render three different ways (today an own
>   unconfirmed event renders desktop-Day dashed/blue, mobile-Day solid/green-no-label,
>   mobile-Week dashed/blue).
>   - **Checkable:** one and the same event computes IDENTICAL fill color and the same dashed/
>     solid treatment at 390px and 1280px, in Day and Week — four readouts, one result.
>
> - **R3-4 (Aisha) — restore the CUSTOM time pickers; zero native `<select>` in the editor.**
>   Native `<select>` time pickers reappeared in the drag-create/edit editor (they were custom-
>   styled and praised in R2). Restore the custom styling.
>   - **Checkable:** the create/edit editor contains ZERO native `<select>` elements; time is
>     chosen via the custom-styled control.
>
> - **Minor / NO-FIX (note only):** Dana value=No is the ONE allowable miss (per-type color/
>   icons/imagery is the visual overhaul we are NOT chasing — R3-2/R3-3 give her consistent
>   finished styling, not the colorful Canva-grade overhaul). Sam/Elena bulk "add whole trip to
>   Google Calendar" = known limitation (GCal render URLs are per-event; .ics is the bulk path,
>   no OAuth) — not addressed; both at/near bar. Jules's "Untitled Trip" naming nudge + Week-view
>   add affordance are nits on a PASSING tester — skip to avoid regression risk.

> ## ROUND-2 FIXES (add-feature panel R2: 8/10 at advocacy≥9. Clarity 10/10, value 9/10)
> Eight testers cleared the bar (≥9 ∧ clarity ∧ value). TWO misses: Rob 7 (a real
> confirm-attribution correctness bug, REGRESSED 8→7 — the bar-clearer) and Dana 5 (value=No,
> Canva-grade visual holdout — the ONE allowable miss). Strategy: fix Rob's bug → 9 = 9/10 with
> Dana as the allowable miss; fold in the genuine regressions (R2-2, R2-3) + two low-risk
> legibility fixes (R2-4, R2-5). **Do NOT touch surfaces that would regress the 8 passers:** no
> broad event re-theme (Marcus/Aisha like current styling), no name wall before a SOLO creator's
> first create (protected R1 win — Elena/Jules/Sam), and KEEP dashed-border = another person's
> unconfirmed-proposed event (Aisha explicitly approved this semantics).
>
> **DECISION — Dana's value=No (not screenshot/Canva-grade) is the ONE ALLOWABLE MISS.** We are
> NOT chasing the full visual overhaul this round; per-type colors / icons / cover imagery /
> theming risk regressing the 8 passing testers for one holdout. We take ONLY the targeted,
> low-risk slice of her feedback (R2-5) plus her two genuine regressions (R2-2, R2-3).
>
> - **R2-1 (P0 — THE BAR-CLEARER; Rob, the regression 8→7) — every CONFIRM and PROPOSE must
>   carry the actor's real identity, displayed relative to the viewer.** Bug: when a SECOND
>   person (a friend on the shared link) confirms an event, the confirmation is not stamped with
>   THEIR identity — on the owner's reload it reads "Confirmed by you" though the owner never
>   confirmed; the friend is never asked their name and confirmations carry no identity. For a
>   tool whose whole point is "who has confirmed they're in," this is trust-breaking and worse
>   than R1's anonymous "Someone" (it's misleading, not just blank).
>   - **ONE identity source drives BOTH propose AND confirm** (attribution-must-reuse-one-identity):
>     there must NOT be a parallel/anonymous path for confirm. Give each participant a lightweight
>     per-device identity (a name) for the trip; stamp EVERY propose and EVERY confirm with that
>     participant's name.
>   - **Display attribution relative to the VIEWER:** your own actions read "you"; everyone
>     else's read their actual name. Owner sees "Confirmed by Dana"; Dana sees "Confirmed by you."
>     Same rule for "Added/Proposed by you" vs "Added/Proposed by <name>".
>   - **Capture a collaborator's name LAZILY, at their first ATTRIBUTING action on a shared link**
>     — e.g. an inline "Confirm as <name>" with a one-time name field, or a single lightweight
>     prompt on first confirm/add. Ask ONCE, then reuse for all their subsequent actions.
>   - **Do NOT reintroduce a blocking name wall before a SOLO creator's first create** (the
>     non-blocking R1 behavior loved by Elena/Jules/Sam — protect it). Net: solo creators are
>     never interrupted; a collaborator is asked once at the moment they attribute.
>   - **Checkable:** in a SECOND browser context (genuine friend, no shared storage), confirming
>     an event prompts for that friend's name ONCE, stamps the confirmation with it, and persists.
>     On the OWNER's reload that event reads "Confirmed by <friend>", NOT "Confirmed by you". In
>     the friend's view it reads "Confirmed by you". A SOLO creator still adds + saves their first
>     event with NO blocking name prompt.
>
> - **R2-2 (regression; Dana) — mobile Week view must be legible at 390px.** A NEW regression the
>   R1 3-column Week view introduced: at 390px every event title truncates ("6:00pm Chec...",
>   "10:00am Bea..."), unreadable without tapping.
>   - At 390px do NOT cram 3+ columns that shred titles — either reduce the column count / allow
>     horizontal scroll per the design, OR let titles wrap / ellipsize gracefully so they're
>     readable. (Mobile Day view is already clean — don't touch it.)
>   - **Checkable:** at 390px in Week view, event titles are readable (full or graceful wrap), not
>     truncated mid-word to "...".
>
> - **R2-3 (general friction; Dana) — don't re-open the paste panel on a normal reload.**
>   Reloading the trip re-appends `?paste=1` and pops the paste panel OVER the calendar.
>   - Don't auto-open the paste panel on a normal reload; strip/ignore the `?paste` param after
>     first use so reload returns to the calendar.
>   - **Checkable:** load a trip, reload it → the calendar is shown, the paste panel does NOT
>     auto-open; the URL no longer carries a stale `?paste=1`.
>
> - **R2-4 (single-persona polish; Sam) — create inherits the VIEWED date, not today.** On mobile
>   the "+ Add event" form defaults its Date to today even when the "Go to:" navigator shows a
>   future date (e.g. Aug 1) — risking events saved on the wrong day.
>   - The add-event form AND tap/click-to-create inherit the CURRENTLY-VIEWED date, not today's.
>   - **Checkable:** navigate "Go to:" Aug 1, open "+ Add event" → the form's Date defaults to
>     Aug 1; saving lands the event on Aug 1, not today.
>
> - **R2-5 (targeted legibility, low-risk; Dana "events read like a wireframe") — a SOLO
>   creator's OWN events render SOLID/finished, not dashed.** Keep dashed border = ANOTHER
>   person's unconfirmed-proposed event (Aisha confirmed this is good semantics). But a solo
>   creator's own events ("Added by you") should render solid/finished, not dashed-wireframe.
>   - **Styling only — do NOT broadly re-theme event colors** (the 8 passers are happy; this is
>     the targeted slice of Dana's feedback, NOT the visual overhaul). Other people's proposed
>     events keep dashed.
>   - **Checkable:** on a solo trip, the creator's own events have a SOLID border and finished
>     fill (no dashed-wireframe look); a DIFFERENT participant's unconfirmed event still renders
>     dashed (Aisha's semantics intact).

> ## ROUND-1 FIXES (add-feature panel R1: 1/10 at advocacy≥9 — only Wen. Clarity 10/10, value 9/10)
> Eight testers sit at 8 with concrete fixable complaints; Tomás at 7 (date-nav near-blocker); Dana
> at 5 (value=No, Canva-grade visual bar — the ONE allowable miss). Fixing R1-1…R1-8 cleanly should
> lift all eight 8s + Tomás to ≥9 and clear the bar. R1-9 (visual lift) is best-effort. Fix in
> priority order; R1-1, R1-2, R1-3, R1-4 are the dominant recurring causes. Do NOT regress any prior
> win (parser correctness + preview, no-login share round-trip, mobile scroll/auto-scroll, immediate
> save flush, optional/skippable name, full ".ics" label, the two co-equal start cards).
>
> - **R1-1 (P0 — dominant new-feature flaw; recurs 4×: Priya, Marcus, Tomás, Aisha) — make resize
>   discoverable and the three grid gestures unambiguous.** Today there is no visible grip and no
>   resize cursor; grabbing near the bottom edge MOVES the whole block by an hour (Marcus, Tomás) or
>   STARTS A NEW EVENT (Aisha) instead of resizing — "friends will think resize is broken" (Priya).
>   - **Visible handle:** render a clearly visible drag handle on the event block's BOTTOM edge (and
>     ideally the TOP edge) — e.g. a small centered grip/bar that appears on hover/selection — with
>     an adequate hit-target (≥6–8px tall zone, not a 2px hairline) and `cursor: ns-resize` (or
>     `s-resize`) on hover over that zone.
>   - **Unambiguous, non-overlapping gesture map (fine pointer):** EDGE-drag (within the handle
>     zone) = RESIZE (changes duration only, other end fixed); BODY-drag (anywhere else on the
>     block) = MOVE (preserves duration); EMPTY-grid-drag = CREATE. These three must not overlap:
>     a drag that begins inside an existing block NEVER creates a new event; a drag inside the
>     bottom-handle zone NEVER moves the block; a body-drag NEVER resizes.
>   - **Cursor signals intent:** body of block = `grab`/`move` cursor; handle zone = resize cursor;
>     empty slot = `cell` cursor (already specced AF-2). The cursor must change as the pointer
>     crosses the handle boundary so the user can SEE which gesture they'll get before pressing.
>   - **Checkable:** hovering an event's bottom edge shows a visible handle + resize cursor;
>     dragging that handle changes ONLY the event's end time (start fixed), 15-min snap; dragging the
>     block body moves it preserving duration; a drag starting on a block never creates a second
>     event; resize never fires a move. Verify on desktop (fine pointer).
>
> - **R1-2 (P0 — recurs 5×: Priya, Jules, Elena, Sam, Rob) — never let the name prompt block the
>   first create.** The "What's your name?" modal currently fires on/before the first add-event (and
>   on the first mobile "+" tap) and modal-blocks the most important action — a detour on a 30-second
>   budget (Elena, Sam), a friction speed-bump (Jules), an interrupt right when grabbing the share
>   link (Priya).
>   - **Let the user create immediately:** opening the quick-create popover / add-event sheet and
>     SAVING the first event must NOT require or trigger a blocking name modal. The user types a
>     title and saves; the event lands.
>   - **Capture the name lazily and non-blockingly:** ask for the name only when it actually matters
>     for attribution — e.g. when the user CONFIRMS another person's proposed event, or as an
>     OPTIONAL inline field (a small header "Set your name" chip / an unobtrusive inline field in the
>     sheet), never a full-screen modal that intercepts taps. If ever shown, it is dismissible by
>     tapping away and asked at most once per session (per prior R4-4 / R5-2 — do not regress; this
>     extends the same lazy-name rule to the blank-calendar create path).
>   - **Checkable:** on a fresh blank calendar (desktop drag-create AND mobile "+" tap), creating and
>     saving the first event happens with NO blocking name modal; the event renders and persists; any
>     name affordance is optional/inline and tap-away-dismissible.
>
> - **R1-3 (P0 — recurs 3×: Elena, Sam, Rob; coupled to R1-2) — the creator's own events read as
>   already theirs.** On a solo/own trip the creator's freshly-added events show "Proposed by
>   Someone/Guest" + a Confirm button — "I never proposed anything to anyone; 'Someone' reads like a
>   bug" (Elena); anonymous "Someone" undercuts who-did-what trust (Rob).
>   - **Default attribution is the creator's own:** an event the current device/participant just
>     created reads as ALREADY THEIRS (e.g. "Added by you", or simply no proposed/confirm chrome) —
>     NOT "Proposed by Someone" and NOT showing a Confirm button to its own author.
>   - **Proposed/Confirm chrome appears only for genuine multi-person collaboration:** show the
>     "Proposed by <other>" + Confirm affordance on an event ONLY when a DIFFERENT participant created
>     it (i.e. there is real cross-person collaboration), never on the viewer's own events.
>   - Tie to R1-2's deferred name: before a name is set, the creator's own events still read cleanly
>     as theirs (e.g. "Added by you"), not "Someone."
>   - **Checkable:** on a solo trip, every event the sole user creates shows NO "Proposed by Someone"
>     and NO Confirm-your-own-event button — it reads as already theirs. Opening as a SECOND
>     participant (different device), that participant sees the first user's events as proposed/
>     confirmable; each viewer's OWN events never show proposed/confirm to themselves.
>
> - **R1-4 (P0 — recurs 4×: Tomás near-blocker, Sam, Dana, Rob adjacent) — never strand a
>   blank-calendar user on today.** Starting blank for a future trip (e.g. August) leaves the user
>   stuck on today: Month view has no prev/next arrows and there is no date picker until after an
>   event exists (Tomás — the single thing holding him at 7). Paste-path users get silently mapped to
>   THIS weekend (Sam/Dana) with no chance to set real trip dates.
>   - **Reach any date (both required where applicable):** add prev/next navigation arrows to the
>     Day, Week, AND Month views so the user can move forward/back through dates from an empty
>     calendar; AND/OR add a lightweight upfront "When is your trip?" start-date affordance on the
>     blank-start flow (a single date picker that sets the calendar's initial day) — keep it
>     lightweight: no signup, no multi-step wizard, skippable (defaults to today).
>   - At minimum the blank-calendar flow MUST offer a way to reach a future month BEFORE creating any
>     event (do not require an event to exist before navigation/date-picking is available).
>   - **Checkable:** starting a blank calendar today (Jun 15), the user can navigate to or pick a date
>     in August and create an event there — without first creating a dummy event. Month/Week/Day each
>     have visible prev/next controls (or an equivalent date picker reaches them).
>
> - **R1-5 (recurs 2×: Tomás, Marcus) — Week view reliably renders the multi-day spread.** Tomás saw
>   Week view collapse to a SINGLE day (odd for a week-named tool); Marcus saw the correct Sat+Sun
>   side-by-side — so it renders inconsistently.
>   - Week view must always show the trip's multiple days as side-by-side day columns (a 7-day
>     spread, or at least the trip's days), never collapse to one day regardless of how the trip was
>     started (paste vs blank) or how many days have events.
>   - **Checkable:** with a trip spanning ≥2 days, Week view shows those days as side-by-side columns
>     every time (paste-started and blank-started); it never renders a single day in Week mode.
>
> - **R1-6 (recurs 2×: Jules, Aisha) — fix mobile create affordance.** The on-grid hint reads desktop
>   language ("Drag down the grid… or click a slot") on touch (Jules — "you tap" on a phone); the
>   mobile "+ Add event" FAB is a bare icon with no visible label, easy to miss on an empty blank
>   calendar (Jules, Aisha); the mobile blank empty-state has NO guidance while desktop does (Aisha —
>   empty-state parity).
>   - **Touch-correct copy:** on `(pointer: coarse)` the grid hint says "Tap a slot to add an event"
>     (or "Tap the + to add an event") — never "drag"/"click" wording.
>   - **Labeled create control:** the mobile "+ Add event" FAB shows a visible "Add event" label (text
>     beside the icon, or a labeled pill) — not a bare "+" that reads as decoration on an empty grid.
>   - **Mobile empty-state parity:** the mobile blank empty calendar shows the same kind of helpful
>     guidance the desktop blank grid shows (an inline hint pointing to tap-a-slot / the + button).
>   - **Checkable:** at 390px on an empty blank calendar, the create hint uses "tap" wording, the
>     "+ Add event" control shows a visible text label, and a guidance hint is present (parity with
>     desktop's empty-state hint).
>
> - **R1-7 (recurs 2×: Aisha, Marcus) — consistent, finished saved-event styling.** Saved events look
>   pale blue on desktop but PINK with a DASHED border on mobile (dashed reads as "draft/unsaved" even
>   though the header says "Saved" — Aisha); anonymous/guest events render washed-out grey and look
>   unfinished (Marcus, Aisha).
>   - **Consistent across breakpoints:** a SAVED event uses the SAME fill/treatment on mobile and
>     desktop (pick one saved style); reserve the dashed/translucent style EXCLUSIVELY for the
>     in-progress drag preview and for genuinely-proposed-by-others events (per existing proposed
>     spec) — a saved, owned event has a SOLID border.
>   - **Owned events look finished:** the creator's own events must not render washed-out/grey/
>     unfinished (ties to R1-3 default attribution — an owned event gets a real author color, not the
>     anonymous grey).
>   - **Checkable:** the same saved event renders with identical styling at 390px and 1280px; saved
>     owned events have a SOLID (not dashed) border and a non-washed-out fill; dashed appears only for
>     the live drag preview / others' proposed events.
>
> - **R1-8 (single-persona: Rob; cheap polish) — blank grid defaults scroll to morning.** The
>   blank-calendar grid loads scrolled to ~noon, hiding 9–10am morning arrivals below the fold.
>   - On a fresh blank calendar with no events, default the grid scroll to early morning (~8am); once
>     events exist, scroll to the earliest event (consistent with the existing cold-open auto-scroll,
>     CAUSE B).
>   - **Checkable:** opening a blank calendar shows ~8am at/near the top of the grid (the 9–10am rows
>     are visible without scrolling); a calendar with events scrolls to the earliest event.
>
> - **R1-9 (best-effort visual lift — Dana value=No adv5 the allowable miss; also resolves Aisha +
>   Marcus color complaints) — make the "visual calendar" promise feel real.** Week view reads as a
>   "plain beige agenda list with pale-green pills" — not screenshot-worthy / not Canva-grade (Dana).
>   - Add reasonable event COLOR differentiation (distinct, pleasant author/event colors — not a
>     single flat pale-green) and a cleaner, more calendar-like Week/Day rendering (less flat/beige
>     background, clearer day-column structure, polished event chips with readable contrast).
>   - Best-effort: Dana's Canva-grade bar (cover image / theming / icons) may remain unmet and she
>     stays the one allowable miss — but this lift MUST resolve Aisha's pink/dashed and Marcus's
>     washed-out-grey color complaints (R1-7) and make Week/Day look like a polished calendar, not a
>     stripped-down agenda list.
>   - **Checkable:** Week/Day views show differentiated event colors and a cleaner non-beige
>     calendar-style layout; saved/owned events look finished (no washed-out grey, no stray dashed).
>
> - **Minor / NO-FIX (note only):** Marcus — Day/Week/Month toggle is a styled div not a real
>   `<button>` (cheap a11y fix, fold in if easy; doesn't gate). Wen (already 9) — CSV export and
>   surfacing the assumed YEAR like day/date mismatches are nice-to-haves toward a 10. Aisha — native
>   `<select>` time pickers are cosmetic. Elena/Sam — one-click bulk "add whole trip to Google
>   Calendar" needs OAuth = out of scope; .ics is the honest bulk path (prior H4 decision, do not
>   regress). Rob/Sam — parser pickiness on natural formats is prior-round parser scope, not this
>   feature.

> ## ADD-FEATURE (2026-06-15) — TWO equal start options + Google-Calendar drag-to-create
> Spec checks 7–14. The parser is UNCHANGED and stays a first-class path. Five risks, each a
> paid friction lesson — bake the fix in. Do NOT regress any resolved round-history below.
>
> - **AF-1 — TWO CO-EQUAL START OPTIONS (lesson: added-feature-buried).** A new option bolted
>   onto an existing landing gets visually subordinated and the panel burns rounds finding it.
>   The landing must read, in 5s, as "two ways in" — NEITHER is the lone primary button.
>   - **Exact layout.** Keep "Name your trip" input at top (pre-focused). BELOW it, TWO cards
>     SIDE-BY-SIDE on desktop (≥640px: a 2-col grid, equal width), STACKED full-width on mobile
>     (<640px) — same card chrome, same border, same padding, same height, same heading weight.
>     Each card: an icon (A: clipboard/document; B: grid/calendar), a bold ~text-lg title, and
>     ONE plain subtitle line. The CTA button inside each card has IDENTICAL styling (same color,
>     size, weight) — do not give one the dark filled button and the other a ghost/text link.
>     - Card A — **"Paste an itinerary"** · subtitle "Already have a plan in a doc? Paste it and
>       we'll turn it into a calendar." · button "Paste an itinerary".
>     - Card B — **"Start from a blank calendar"** · subtitle "Prefer to build it yourself? Drag
>       on the grid to add events." · button "Start blank".
>   - Both buttons require a trip name (reuse the existing create call); A then opens the paste
>     panel, B mints an empty trip and lands on `/t/<secret>` with the grid ready (paste panel
>     does NOT auto-take-over — spec check 8).
>   - **Checkable:** at 360–1280px wide both options are visible above the fold with equal visual
>     weight; neither is hidden in a menu or rendered as the sole primary button (check 7).
>
> - **AF-2 — DRAG-CREATE DISCOVERABILITY + AFFORDANCE (desktop primary).** Drag-to-create is
>   invisible until found — signal it; never make the user guess.
>   - **Hover affordance:** on a mouse/fine-pointer viewport, hovering an empty grid slot shows a
>     `cursor: cell` (crosshair-style) cursor and a faint slot highlight, signalling "press and
>     drag here."
>   - **One-time hint:** the FIRST time a desktop user lands on an EMPTY blank-calendar grid, show
>     a single dismissible inline hint near the grid — "Drag down the grid to block out time, or
>     click a slot for a 1-hour event." Dismiss on first drag/click or an × ; remember dismissal
>     in localStorage (per device, not per trip). Do not re-show once used.
>   - **Live feedback DURING drag:** as the user presses and drags, render a translucent
>     in-progress block that grows with the pointer and shows the live start–end time (e.g.
>     "9:00 – 11:00") at its edge, snapped to 15-min. Release commits the block.
>   - **Quick-create popover (GCal-style):** on release (or single-click default 1h block), open
>     a small popover anchored to the new block with: a pre-focused Title field, the resolved
>     time range (editable via the existing time selects), and "More options" (opens the full
>     EventEditSheet for location/notes/link/date). Enter = save; Esc or click-outside = dismiss.
>     If dismissed with an empty title, save as "(New event)" — never silently discard the block
>     the user just dragged (don't repeat the R4 "previewed event vanishes" class).
>   - **Checkable:** drag 9:00→11:00 creates startMinutes=540/endMinutes=660 + popover (check 9);
>     single click = start+60 default, drag-resizable (check 10); move = body-drag, resize =
>     edge-drag, 15-min snap (check 11).
>
> - **AF-3 — DESKTOP vs TOUCH SPLIT (be explicit; detect by pointer, not just width).** Use
>   `matchMedia("(pointer: fine)")` for desktop-drag behavior and `(pointer: coarse)` for touch,
>   not width alone (a narrow desktop window must still get drag-create; a wide tablet must not).
>   - **Fine pointer (desktop):** drag-to-create is the PRIMARY path; the "+ Add event" FAB is
>     HIDDEN. Hover affordance + one-time hint per AF-2.
>   - **Coarse pointer (touch):** drag-to-create is DISABLED (When2meet's fatal flaw). Tap an
>     empty slot = default 1-hour block + quick-create; a visible "+ Add event" button/FAB is the
>     explicit create path. A plain vertical swipe ALWAYS scrolls (never creates/moves). Moving or
>     resizing an EXISTING event needs an explicit drag-handle or long-press (~400ms) — keep this
>     working on touch if feasible, but it is NOT the create path.
>   - **Checkable:** desktop = no FAB, drag creates; 390px touch = drag-create off, tap creates a
>     1h block, "+ Add event" present, swipe scrolls (check 13).
>
> - **AF-4 — NO HORIZONTAL OVERFLOW at 390px (lesson: container-resize-leaves-hardcoded-width-
>   children — THIS app burned FOUR rounds on a clipped chip).** Any new control must not push the
>   toolbar/grid into horizontal scroll on a 390px phone. Fix the CONTAINER, not the symptom.
>   - The "+ Add event" FAB is `position: fixed` bottom-right (or its own full-width row) — it does
>     NOT join the Day/Week/Month toggle row and cannot widen it.
>   - The quick-create popover renders in a PORTAL with fixed/absolute positioning at the document
>     level so the scrollable grid never clips it; if it would overflow the right/bottom edge,
>     flip its anchor to stay fully within the 390px viewport.
>   - Keep every toolbar row full-width; no new element extends past 390px (right edge ≤390px).
>   - **Checkable:** at 390px loaded-trip state, no element's right edge exceeds 390px; the popover
>     is fully visible (not clipped by the grid's overflow), no new horizontal scrollbar appears.
>
> - **AF-5 — DRAG-CREATED EVENT IS IDENTICAL TO A PARSED EVENT (no second-class styling).** A
>   grid-created event uses the same `TripEvent` shape, proposed status, author color, dashed/
>   translucent proposed style, "Proposed" tag, confirm flow, per-event Add-to-Google-Calendar,
>   and bulk .ics inclusion as a parsed event. There is NO "parsed vs manual" visual or behavioral
>   distinction.
>   - **Checkable:** a dragged event is proposed by default, exposes Add-to-Google-Calendar, and
>     appears as a VEVENT in the bulk .ics — indistinguishable in behavior from a parsed one
>     (check 12).
>
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

## ADD-FEATURE (2026-06-15) — TRIP MANAGEMENT: rename · delete · remove-from-list · Create New
Spec flows 1 & 4, success checks 18–23. This adds ONLY calendar-management controls; do NOT
redesign the app or touch the grid/parser/confirm flows. Four controls, two surfaces (trip-page
header + "Recent trips" list). Each control's placement, label, color, and affordance is fixed
below so two builders converge — and each is FIRST-CLASS visible (the panel historically burns
rounds surfacing a working-but-hidden feature: added-feature-buried-panel-surfaces-not-function).

> ## TM ROUND-1 FIXES (trip-management panel R1: 0/10 at adv≥9 — all 10 clarity=Yes, value=Yes)
> The feature WORKS (validator + verifier: delete→404, rename persists end-to-end). The panel
> clusters at 8 PURELY on craft/surfacing of the new controls — Wen 6, Dana 7, eight at 8. Six
> REAL causes below; Dana's Canva-grade per-type color stays the ONE allowable visual miss. Do
> NOT touch the event-styling / confirm-semantics surfaces that just recovered from the R3
> regression. The M1–M4 specs below are AMENDED to these exact values — build to them, not to the
> pre-R1 prose. The DOMINANT fix (TM-R1-1) recurred across 8 of 10 testers.
>
> - **TM-R1-1 (DOMINANT — recurs 8×: Priya, Tomás, Dana, Jules, Aisha, Rob, Elena, Sam) —
>   recent-trips row labeling hierarchy is BACKWARDS; fix label, scope-legibility, target size,
>   and visual distinction.** Today the harmless "Remove from my list" gets full text while the
>   DESTRUCTIVE delete is a ~26px UNLABELED red trash icon ~4px from the pencil, and the
>   device-vs-everyone scope lives ONLY in hover tooltips (invisible on touch). The most dangerous
>   control is the least labeled. Fix ALL FOUR:
>   - **(a) Visible text label on the destructive action.** The delete action carries the VISIBLE
>     text **"Delete for everyone"** (trash glyph + that exact text, red #C0392B) — never a bare
>     icon. The neutral action keeps the full text **"Remove from my list"** (muted grey, no glyph).
>   - **(b) Scope legible WITHOUT hover, on mobile.** Below/beside the two actions render a small
>     always-visible caption (≈12px, muted): "Remove = this device only · Delete = everyone with
>     the link." Scope must be readable with zero hover/tooltip on a 390px touch screen.
>   - **(c) ≥44px touch targets, clearly separated.** Each action is a ≥44px-tall tap target with
>     ≥12px gap between the neutral and destructive action so an accidental destructive tap is
>     unlikely (kills the ~26px / ~4px-apart fat-finger risk Jules/Elena flagged).
>   - **(d) Unmistakably distinct, no shared verb.** Remove-from-list = light/grey/neutral text,
>     no glyph, no confirm; Delete = red + trash glyph + "Delete for everyone" text + the verbatim
>     confirm (M2). No shared lexeme ("Remove" vs "Delete").
>   - **Exact row layout (see M3 below for the full desktop + 390px spec).**
>   - **Checkable:** on a 390px touch viewport with NO hover, both actions show full text, the
>     destructive one reads "Delete for everyone" in red, the scope caption is visible, each tap
>     target is ≥44px tall with ≥12px separation.
>
> - **TM-R1-2 (Marcus — genuine bug) — Enter in the landing rename field SAVES and STAYS on the
>   list.** Pressing Enter in the recent-list inline-rename input saves the rename BUT also
>   navigates into the trip. The rename input must NOT be nested inside / triggered by the row's
>   navigation Link. While the row is in rename mode the Link navigation is suppressed; Enter
>   commits the PUT and the user STAYS on the list (row returns to static display showing the new
>   name). Esc cancels and stays.
>   - **Checkable:** rename a recent-trips entry, press Enter → name updates IN the list, URL stays
>     on `/` (landing), no navigation into `/t/<secret>`.
>
> - **TM-R1-3 (Sam — spec check 22) — surface a labeled "Create New" on the trip page.** Sam
>   couldn't find how to start the next trip (only a tiny home icon; the "⋯" menu had only
>   Rename/Delete). Make it a clearly-LABELED header control **"Create New"** (text + a small
>   plus/home-in-page icon), in the leading nav zone, visually distinct from the grid's bottom-right
>   "+ Add event" FAB. See M4 for placement (desktop + mobile).
>   - **Checkable:** the trip-page header shows a control with the visible word "Create New" that
>     navigates to the landing/create screen; it is not the "+ Add event" FAB.
>
> - **TM-R1-4 (Jules, Sam) — give recent-trip names more room on mobile.** Names truncate to
>   "Beach…", "Mike…", "Veg…" at 375–390px so trips are indistinguishable. The static name in each
>   recent-trips entry WRAPS to up to 2 lines (then ellipsis) on mobile — never single-line
>   hard-truncation at ~6 chars. The name gets the dominant width of the row; actions sit on their
>   own line beneath it on mobile (see M3 mobile layout).
>   - **Checkable:** at 390px a 20-char trip name ("Beach house weekend") shows enough to be
>     distinguished from another ("Beach trip — Mike"), wrapping to a second line rather than "Beach…".
>
> - **TM-R1-5 (Wen, Aisha) — clearly separate the DISPLAY-name control from trip rename.** The
>   header "Set name" (sets YOUR display name) sits next to the trip-title rename and reads like it
>   renames the TRIP (Wen clicked it to rename the trip); it also persists awkwardly next to the
>   green "Saved." Relabel + reposition: the display-name chip reads **"Your name"** (or shows the
>   name once set, e.g. "You: Wen ⌄"), lives at the TRAILING edge of the header next to the "⋯"
>   menu — NOT adjacent to the editable trip title at the leading/center. The trip title is the
>   ONLY rename-the-trip affordance (pencil/underline on the title). The "Your name" chip must not
>   sit flush against the green "Saved" trip-rename confirmation.
>   - **Checkable:** the header has exactly two clearly-distinct name controls — the centered trip
>     TITLE (pencil = rename the trip) and a trailing **"Your name"** chip (sets the user's display
>     name); they are not adjacent and neither reads as the other.
>
> - **TM-R1-6 (Wen, Elena — harden) — the delete confirm modal renders reliably on BOTH surfaces,
>   BOTH viewports.** Wen (automation) saw the for-everyone delete fire no confirm / remove nothing
>   on both entry points; Elena saw no confirm on mobile (8 others saw it work; verifier confirmed
>   delete→404). The confirm must be a real, reliably-rendered, mobile-friendly DIALOG (portal /
>   `role="dialog"`, focus-trapped, dimmed backdrop, full-width buttons at 390px) that fires on
>   BOTH the list "Delete for everyone" AND the header "⋯ → Delete trip", on desktop AND mobile.
>   Builder adds stable testids on the trigger, the dialog, and its Delete/Cancel buttons so
>   automation reliably exercises it.
>   - **Checkable:** tapping the list delete AND the header-menu delete each opens the SAME
>     `role="dialog"` confirm on 390px and 1280px; Cancel dismisses with nothing deleted; Delete
>     calls `DELETE /api/trip/[id]` once and the trip 404s in a fresh browser. Testids present.
>
> - **Minor / NO-FIX (note only):** Dana's Canva-grade per-type/per-category event COLOR and Rob's
>   per-person color = the standing allowable visual miss (do NOT chase — it risks the event-style
>   passers). Tomás's read-only/view-only share = deliberate out-of-scope (edit-by-link is the CUJ,
>   prior H5). Wen's assumed-YEAR warning = parser nice-to-have. Elena/Sam bulk add-all-to-Google =
>   OAuth out of scope (.ics is the bulk path). Aisha's considered empty-state + "Remove" undo/toast
>   = nice-to-haves, not gating. None are trip-management craft; chasing them risks regression.

### M1 — RENAME (inline-edit; shared via PUT; discoverable affordance)
- **Header (trip-page).** The trip title in the sticky header IS the edit affordance: on hover
  (fine pointer) it shows an underline + a small pencil glyph to its right; tap/click anywhere on
  the title swaps it in-place for a text input pre-filled with the current name. A check ("Save")
  and × ("Cancel") sit immediately after the input; Enter saves, Esc cancels. Saving PUTs the new
  name and it is SHARED — everyone on the link sees it on their next load/refresh. The header title
  must visibly look editable BEFORE interaction (the pencil/underline) so it's discovered, not guessed.
- **Recent-trips entry (AMENDED by TM-R1-2).** Each entry gets a small pencil "Rename" icon-button
  (≥44px, aria-label "Rename trip"). Clicking it turns the entry's name into the same inline input +
  check/×. **Entering rename mode SUPPRESSES the row's navigation** (the rename input is NOT nested
  in / triggered by the row's nav Link) so committing does NOT open the trip. **Enter saves the PUT
  and STAYS on the list** (row returns to static display with the new name); Esc cancels and stays.
  Saving PUTs the shared name AND updates this device's localStorage label.
- **Checkable (18):** rename from header and from the list both persist, survive reload, and appear
  in a different browser opening the same `/t/<secret>`. Pressing Enter in the LIST rename input
  updates the name in place and the URL STAYS on `/` (no navigation into the trip).

### M2 — DELETE (heavy, destructive, shared) — BOTH header and list
- **Label & weight everywhere:** the word is "Delete" (never "Remove"). It is the ONLY destructive
  control: rendered in red (#C0392B text / red on hover), with a trash glyph.
- **Header (trip-page):** a "Delete trip" item lives inside an overflow "⋯" / "Trip options" menu
  anchored to the header (NOT a bare always-on red button beside the grid, so it can't be fat-fingered
  and never reads as event chrome). Menu also can hold Rename as a fallback.
- **Recent-trips entry (AMENDED by TM-R1-1):** a LABELED red button reading **"Delete for everyone"**
  (trash glyph + that exact visible text, red #C0392B) — NOT a bare icon, NEVER tooltip-only. It is
  the rightmost / lowest, visually-separated destructive action with a ≥44px touch target and ≥12px
  gap from the neutral "Remove from my list" (see M3 for the full row layout). aria-label matches
  the visible text.
- **Confirm dialog — verbatim copy (both surfaces); a REAL reliably-rendered dialog (TM-R1-6):**
  rendered as a portal `role="dialog"`, focus-trapped, on a dimmed backdrop, with FULL-WIDTH buttons
  at 390px. Title/body reads exactly
  **"Delete this trip for everyone with the link? This can't be undone."** Buttons: a red
  **"Delete"** (destructive) and a neutral **"Cancel"**. It MUST fire on BOTH the list
  "Delete for everyone" AND the header "⋯ → Delete trip", on desktop AND 390px mobile. Only on
  confirm does it call `DELETE /api/trip/[id]` (one request). From the header, a successful delete
  navigates back to the landing page. From the list, the entry is removed after the server confirms.
  Builder adds stable testids on the trigger, the dialog, and the Delete/Cancel buttons.
- **Checkable (19):** after confirmed delete, `/t/<secret>` no longer loads in a fresh browser; the
  header delete returns to landing; the SAME confirm dialog appears from both surfaces at 390px and
  1280px; Cancel deletes nothing.

### M3 — "Remove from my list" (light, device-local) — list ONLY, distinct from Delete
- **Label & weight:** the full phrase **"Remove from my list"** (never just "Remove", never "Delete").
  NEUTRAL: a muted grey text-button (≈14px, grey-600), NO trash glyph, NO red, NO confirm. The full
  text is ALWAYS visible — never hover/tooltip-only (TM-R1-1b).
- **No destructive confirm.** Non-destructive and reversible (re-open the link to re-add). Fires
  immediately (optional soft inline "Removed — undo"). Does NOT call DELETE; edits only this device's
  localStorage. The shared trip is untouched.
- **Always-visible scope caption (TM-R1-1b — replaces the hover tooltips).** A small muted line
  (≈12px, grey-500) is rendered in the entry — visible without any hover, on touch: **"Remove =
  this device only · Delete = everyone with the link."**
- **Disambiguation (check 21 + TM-R1-1d), no shared verb:** the two list actions differ on ALL of —
  WORDING ("Remove from my list" vs "Delete for everyone"), WEIGHT (muted grey text, no glyph vs red
  + trash glyph), and CONSEQUENCE COPY (none/soft vs the verbatim "for everyone … can't be undone"
  confirm). No shared lexeme.

### M3-LAYOUT — exact recent-trips entry layout (DESKTOP + 390px MOBILE) (TM-R1-1, -4)
- **Each entry is a single card/row, ≥56px tall.** Tapping the NAME/DATE region navigates into the
  trip; the action controls are OUTSIDE that nav hit-area (and during rename, nav is suppressed —
  TM-R1-2).
- **Desktop (≥640px) — one row, left-to-right:** [ trip NAME (bold, flex-grow, truncate at the row
  edge only) · date (muted) ] … [ pencil "Rename" (≥44px, aria "Rename trip") ] … gap ≥16px …
  [ muted text-button "Remove from my list" ] … gap ≥16px … [ red labeled button trash +
  "Delete for everyone" ]. The scope caption sits as a small muted line under the name. The red
  Delete is the rightmost, clearly separated, and is the ONLY red element in the row.
- **Mobile (≤390px) — TWO stacked rows inside the entry (TM-R1-4 gives the name room):**
  - Row 1: the trip NAME wraps to UP TO 2 LINES (then ellipsis) — it gets the full row width; the
    date sits beneath it (muted). NO 6-char hard-truncation. (Fixes "Beach…", "Mike…", "Veg…".)
  - Row 2 (full width, beneath the name): the three actions as a horizontal cluster, each a ≥44px-tall
    tap target with ≥12px gaps — [ ✎ Rename ] · [ Remove from my list ] · [ 🗑 Delete for everyone
    (red) ]. Then the muted scope caption line. Right edge ≤390px, no horizontal scroll.
- **No two same-looking adjacent icons** (same-verb-adjacent-controls-read-as-broken): the neutral
  actions are text/light, the destructive one is red + labeled + spaced apart.

### M4 — "Create New" (header navigation, NOT an add-event control) (AMENDED by TM-R1-3)
- **Placement:** TOP-LEFT/leading area of the sticky header (the app-nav zone), deliberately FAR from
  the grid and from the bottom-right "+ Add event" FAB (create-new-not-mistaken-for-add-event).
- **Label & icon — MUST be a LABELED control, not a bare home icon (Sam couldn't find it).** Text
  reads exactly **"Create New"** with a small plus-in-page / home icon to its left, styled as a
  secondary nav button (outline or muted chrome) — NOT the filled accent style of the in-grid create
  affordance, NOT an icon-only button. It navigates to the landing/create screen.
- **Desktop (≥640px):** the full "Create New" text + icon shows in the leading header zone.
- **Mobile (≤390px):** keep the visible word — show the icon + the short label "New" (a labeled pill,
  ≥44px tap target) rather than icon-only, within the ≤96px header budget; it must not widen the
  toolbar or collide with the trailing "Your name" chip / "⋯" menu.
- **Also offer it where users look:** add a "Create New" item to the header "⋯ Trip options" menu as
  a fallback (Sam expected it there alongside Rename/Delete) — but the visible leading-header control
  is the primary path.
- **Checkable (22):** the trip-page header shows a control with the VISIBLE word "Create New" (and a
  "New" labeled control at 390px) that navigates to landing; it is distinct from the "+ Add event"
  FAB and is not an unlabeled icon.

### Empty / single-entry list correctness (optional-ui-gated-on-data-presence)
- The "Recent trips" management UI must render correctly for ZERO entries (the whole list section is
  simply absent — no orphaned headers or action rows) and for exactly ONE entry (its rename / remove /
  delete actions all present and individually operable; removing/deleting the last entry collapses the
  section cleanly with no empty shell left behind).

### M5 — DISPLAY-NAME control distinct from trip rename (TM-R1-5)
- The control that sets the USER'S display name reads **"Your name"** (or, once set, shows it: e.g.
  "You: Wen ⌄") and lives at the TRAILING edge of the header, next to the "⋯ Trip options" menu —
  NOT adjacent to the editable trip title. (Old "Set name" next to the title read as trip-rename and
  was clicked to rename the trip — Wen.) It must not sit flush against the green "Saved" trip-rename
  confirmation (Aisha's noisy-adjacency complaint).
- The trip TITLE (centered/leading, with pencil + underline-on-hover) is the ONLY rename-the-trip
  affordance. Two clearly-distinct controls, not adjacent: TITLE = rename the trip; "Your name" chip
  (trailing) = set the user's display name.
- **Checkable (TM-R1-5):** the header has a centered trip-title rename and a trailing "Your name"
  chip that are visually separated; neither reads as the other.

### Mobile (~390px) notes
- Header at 390px has a ≤96px budget (CAUSE F). The leading "Create New"/"New" labeled control
  (M4), the centered editable trip title, and the trailing cluster ["Your name" chip + "⋯ Trip
  options" menu holding Delete] must all fit WITHOUT widening the toolbar or clipping — use compact
  labeled pills (not icon-only for Create New); the inline rename input replaces the title row
  temporarily (it does not add a row). Nothing occludes the grid or the bottom-right "+ Add event" FAB.
- Recent-trips entry on mobile follows M3-LAYOUT (name wraps to 2 lines on its own; the three
  actions sit on a full-width second row, each ≥44px with ≥12px gaps, red Delete labeled and
  separated from the muted "Remove from my list" so a thumb can't confuse them).

### 5-second discoverability rationale
A returning user lands and immediately sees: their trips in "Recent trips" each with a visible
pencil (rename), a muted "Remove from my list", and a clearly RED, LABELED "Delete for everyone"
button — three obviously different actions with the scope spelled out in a visible caption (no hover
needed), not a hidden menu or a bare icon. Inside a trip, the centered title visibly invites editing
(pencil/underline), a LABELED "Create New" sits in the leading nav zone, the trailing "Your name"
chip is clearly the display-name control (not trip-rename), and Delete lives one tap away in "⋯"
behind a reliable confirm dialog. Nothing management-related is buried; the destructive path is the
only red, confirmed one.

## 1. Problem statement
Your friend's messy itinerary, turned into a shared day-by-day calendar you both open and edit
from one link — no app, no login.

(Hero headline — tighten from the R1 run-on per CAUSE G; the subhead carries "Paste an
itinerary and watch it become a visual hourly calendar." Do NOT claim bulk Google-add — see E.)

## 2. Primary user action
OPEN a shared trip link on a phone and SEE today's plan at a glance (Emily's "just look").
The creator's primary action is SEED a trip, now via TWO co-equal paths (AF-1): (A) PASTE a
written itinerary and watch it become the calendar, or (B) START BLANK and build directly on
the grid — desktop primary = Google-Calendar press-and-drag on the hourly grid (AF-2), touch =
tap-a-slot + "+ Add event" (AF-3). Landing-for-a-shared-link always renders the calendar first.
Landing-for-a-creator shows the two start cards; the paste path pre-fills the sample so the
outcome is visible before typing, the blank path drops onto a grid that signals how to drag.

## 3. Emotional tone
Calm, warm, trustworthy — "your trip is in good hands." Friendly humanist sans (Inter), warm
neutral background (#FAF7F2 / soft sand), generous vertical rhythm on the day grid (comfortable
touch targets, not dense spreadsheet rows). Author colors are soft saturated pastels, never neon.

## 4. Design decisions (the considered, delightful, checkable ones)
- **D1 — Default = glance, edit = revealed.** The day view shows ONLY: trip name, date strip,
  Trip Details card, and the hourly grid with events. NO edit toolbar, NO drag handles, NO
  confirm buttons until you tap an event (opens a bottom sheet with Edit / Confirm / Add-to-
  Calendar) or tap an empty slot (adds an event). Collab chrome never sits on top of the grid.
- **D2 — Empty trip via PASTE = the paste box IS the hero** (the paste-chosen path), not a blank
  calendar. A single large textarea reading "Paste your itinerary here," a "Load sample itinerary"
  link beneath it, and a Parse button. Parsing opens a PREVIEW (events bucketed by day + a
  "Details" bucket) with Confirm / Cancel — nothing is written to the server until Confirm. (The
  BLANK-calendar path skips this and lands on the grid — see AF-1/AF-2.)
- **D5 — Drag-to-create feels like Google Calendar (AF-2).** On the blank-calendar grid a desktop
  user presses, drags a growing live-time block, releases, and types a title in an inline
  popover — the event is on the calendar in one fluid gesture, no form-first detour. The grid
  invites the drag (hover cursor + a one-time hint) so the gesture is discovered, not guessed.
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

## 5. The 5-second check
### 5a. Creator landing (cold visitor, ABOVE THE FOLD) — the dual entry (AF-1)
1. **Headline:** "Turn a messy itinerary into a shared day-by-day calendar — no app, no login."
2. **Subtitle:** "One link, open and edit on any phone. Add events to Google Calendar or .ics."
3. **Pre-focused "Name your trip" input** with placeholder "Joanne visits — July".
4. **TWO co-equal start cards** (side-by-side desktop / stacked mobile, identical chrome):
   "Paste an itinerary" (already wrote a plan) and "Start from a blank calendar" (build it
   yourself). A cold visitor sees, in 5s, that there are two ways in and what each does.

### 5b. Shared-link / loaded trip (cold visitor, 390px phone, ABOVE THE FOLD)
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

### Drag-to-create on the day/week grid (AF-2/AF-3 — desktop primary)
- **Pointer gate:** drag-create binds to MOUSE events on `(pointer: fine)` only. On
  `(pointer: coarse)` it is OFF — touch uses tap-to-create + the "+ Add event" FAB.
- **Empty-slot affordance (fine pointer):** hovering an empty slot shows `cursor: cell` and a
  faint slot highlight. First empty-blank-calendar visit shows the one-time dismissible drag hint
  (localStorage-remembered).
- **Drag gesture:** mousedown on an empty slot → as the pointer moves, draw a translucent
  in-progress block from the start minute to the current minute (15-min snap) showing live
  "H:MM – H:MM" at its edge → mouseup commits the block. A mousedown+mouseup with no movement =
  default 1-hour block (start+60), then drag-resizable.
- **Quick-create popover:** opens anchored to the committed block (PORTAL/fixed so the grid's
  overflow can't clip it — AF-4); pre-focused Title field + editable time range + "More options"
  (→ EventEditSheet); Enter saves, Esc/click-outside dismisses. Empty title saves "(New event)" —
  never discards the dragged block.
- **Existing events:** body-drag to MOVE, edge-drag to RESIZE, 15-min snap (desktop); the new
  event is written as a normal proposed `TripEvent` (AF-5).
- **"+ Add event" FAB:** rendered ONLY on `(pointer: coarse)`; `position: fixed` bottom-right so
  it never widens the toolbar row (AF-4). Hidden on desktop.

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
