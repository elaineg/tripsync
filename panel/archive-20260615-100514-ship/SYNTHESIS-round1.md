# TripSync — Panel Synthesis, Round 1

**Result: 0/10 passing** (advocacy bar = 9 + Yes/Yes). Clarity is universally Yes; value is
Yes for 9/10 (Elena = No). The product is loved on DESKTOP — the paste-parser, no-login
share, and per-event Google add all land. Every failure is concentrated in two places: the
**mobile day view** (the headline feature) and **persistence/share timing**. Fix those and
this clears the bar.

## Score table

| Tester | Persona | Clarity | Value | Advocacy |
|--------|---------|---------|-------|----------|
| Elena  | Eng manager, lives in GCal | Yes | **No** | **2** |
| Tomás  | Ops analyst, multi-family beach week | Yes | Yes | **4** |
| Priya  | Backend eng, cabin trip | Yes | Yes | **5** |
| Rob    | Visual designer, ski trip | Yes | Yes | **5** |
| Marcus | Frontend eng, notices janky CSS | Yes | Yes | **6** |
| Aisha  | Product designer, craft-hard | Yes | Yes | **6** |
| Sam    | PM, bachelor party, mobile-heavy | Yes | Yes | **6** |
| Wen    | Marketing analyst, data-hygiene | Yes | Yes | **7** |
| Dana   | Demand-gen marketer | Yes | Yes | **7** |
| Jules  | Community marketer, anti-login | Yes | Yes | **7** |

## Complaints grouped by cause

### CAUSE A — Mobile day grid does not scroll (P0, headline feature broken) — 5 personas
**Priya, Tomás, Rob, Sam** (+ implicated for everyone on mobile). At 390px the day-hourly grid
is height-locked: `document.scrollHeight == viewport (844)`, `scrollY` stuck at 0, inner grid
`overflow-y: hidden` clipping ~1080px of content to ~643px. Events after midday are physically
unreachable — Rob/Sam both pin El Chato 8:30pm at **y≈1077, off-screen, untappable**; dinner
5:15pm at y≈882 also clipped. Vertical swipe AND wheel do nothing. For a product named
"phone-friendly day-by-day calendar," the entire afternoon/evening is invisible on a phone.
**Priya sub-finding:** a vertical swipe on an empty slot triggers the add-event/"What's your
name?" prompt instead of scrolling — the scroll gesture creates events. RECURS, real, blocker.

### CAUSE B — Cold mobile open lands on empty morning hours; no working auto-scroll — 7 personas
**Marcus, Dana, Jules, Aisha, Sam, Priya, Rob.** Day view cold-opens at ~5–7am on a wall of
empty hours; the first real event (12:30pm) sits below the fold or barely peeks at the bottom.
The intended auto-scroll-to-first-event does not fire on mobile — it can't, because the grid
can't scroll at all (tied to A). A cold phone open shows a blank grid, not the plan. Aisha:
"I open the link and see a blank grid, not a beautiful glanceable day — exactly the thing I
came for." RECURS across 7, real, blocker (resolved by fixing A + real auto-scroll).

### CAUSE C — Persistence/share RACE reads as "events never save" (P0) — 4 personas
**Elena (the only No / 2), Marcus, Tomás, Jules.** The commit of a paste-import does not flush
an immediate save — the write is debounced (~2–3s). Within that window a reload or a friend
opening the link sees "No dates yet. Paste an itinerary" — i.e. an empty trip. Elena's network
trace: on commit there is NO save request (only trip-create + a GET), so she concluded events
NEVER persist and scored VALUE=No. Marcus/Tomás/Jules saw the friend get a blank trip for
~1.5s until "Saved" appears. The #1 action is commit→copy link→share, and people copy the link
the instant events appear. The debounce is correct for drag-flurries, but the **first commit
of a paste-import and any structural add must FLUSH immediately**, and **Copy-invite must
guarantee persistence before it confirms** (flush-then-confirm). Validator/verifier missed this
because they waited past the debounce. RECURS, real, P0 blocker.

### CAUSE D — Parse preview is read-only with silent transforms (trust gap) — 1 persona (Wen)
**Wen (scored 7).** The preview silently auto-assigns 1h durations to open-ended events
("9:00 AM Grandma arrives" → 9–10am) and silently overrode a typed weekday ("Saturday Aug 9"
placed on "Sun, Aug 9") with no flag. Preview is read-only (Add or Cancel only). Single-persona
but it's the data-hygiene analyst's core value and a clean fix: show the resolved date+weekday
per day, disclose the "end time assumed (1h)" default, respect an explicit weekday word when
present, and allow editing rows in the preview. Single-persona, real, secondary.

### CAUSE E — Bulk export oversells "Add to Google Calendar" — 4 personas
**Dana, Elena, Sam, Jules** (+ Wen, Rob noted the label mismatch). The homepage subtitle "Add
events straight to Google Calendar" implies one-tap bulk Google add, but bulk is an **.ics
download** (and it stays hidden until at least one event is confirmed). Dana: 12 events = 12
manual taps. Fix the COPY to be accurate (per-event → Google Calendar; all → download .ics to
import into any calendar) and surface the bulk export without requiring a confirm first. RECURS,
real, secondary.

### CAUSE F — Mobile chrome eats the screen / pills clip — 5 personas
**Marcus, Dana, Aisha, Sam, Jules** (+ Rob, Tomás touch on crowding). Sticky toolbar + Trip
Details card + orange "anyone with this link" banner stack consumes >half of the 390px screen
before any event shows. The Day/Week/Month + day pills (May 1 / May 2) clip against the
refresh/Copy buttons — Marcus/Dana/Jules/Rob all report a black sliver / cut-off date pill at
390px. Tighten the mobile header to the ≤96px budget so the grid gets the screen. RECURS, real,
secondary.

### CAUSE G — Run-on headline — 1 persona (Rob)
**Rob.** "Understood it, but it tries to say 4 things at once." Tighten the H1; the subhead
does the real work. Single-persona, minor.

### Single-persona notes (not blocking, log only)
- **Tomás:** wants a view-only / edit-lock link option; sample is SF-flavored not beach-flavored.
- **Aisha:** proposed events (dashed pink) have no on-grid "proposed" label — illegible until tapped.
- **Elena:** parser overlaps events (4:30–5:30 vs 5:15–6:15) — tolerated.
- **Marcus:** one transient 405 on mobile load, did not recur. **Wen:** one empty cold-open then
  clean retry (possible hydration flake) — watch.
- **Sam/Priya:** name prompt fires mid-action (on first confirm/import) — mildly surprising but persists.

## Verdict for next build
Three blockers must close to clear the bar: **A** (grid must scroll), **B** (auto-scroll to
first event — unblocked by A), **C** (immediate flush so share works instantly). **E** and **F**
are cheap, recur across 4–5 personas, and each costs ~1 advocacy point — do them in the same
round. **D** and **G** are single-persona polish; do D too since it converts Wen's 7 toward 9 at
low cost. With A/B/C/E/F fixed, the desktop-8s (Marcus/Sam/Rob/Dana/Jules/Wen) should clear 9.
