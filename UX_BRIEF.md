# UX Brief — TripSync

## 1. Problem statement
Your friend's trip plan, as a phone-friendly day-by-day calendar you can both open and edit
from one link — no app, no login — and add straight to your own Google Calendar.

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
- **D3 — Copy-link confirmation that survives everything.** The persistent "Copy invite link"
  button turns green and swaps its label to "Copied!" in place (no toast that vanishes), backed
  by `aria-live="polite"`. If clipboard is blocked it reveals a pre-selected read-only input with
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

### Day-hourly hero grid
- Vertical hourly grid, labeled hour rows, 15-min snap. Events positioned by start/end.
- Event block: author-color left bar + fill; title; time; link glyph if URL present. Proposed =
  dashed border + ~60% opacity. Confirmed = solid + check + "Confirmed by <name>" caption.
- Tap event → bottom sheet: title/time/location/notes (links tappable), Edit, Confirm, Add to
  Google Calendar (Google render URL | Download .ics), Delete. Tap empty slot → new-event sheet.
- **HARD REQUIREMENT (When2meet fatal flaw): a plain vertical swipe ALWAYS scrolls the grid.**
  Moving/resizing an event requires an explicit drag-handle (small grip on the block) OR a
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
