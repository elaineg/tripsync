Name: Marcus
Clarity: Yes
Value: Yes
Advocacy: 8

I'm a frontend eng (2 yrs), Chrome + devtools open, and I came in already wanting exactly
this: my weekend plan for two visiting friends lives in a Google Doc nobody opens on their
phone. I want a share link that turns into a clean glanceable calendar.

CLARITY (Yes): The H1 "Turn a messy itinerary into a shared day-by-day calendar — no app, no
login" plus the subline about Google Calendar / .ics nailed it in ~3s. Two cards — "Paste an
itinerary" vs "Start from a blank calendar (Drag on the grid to add events)" — made the two
paths obvious. "Anyone with the link can view and edit — No account or email required" is the
line that made me trust it. Zero console errors on load.

VALUE (Yes): Today I keep a Google Doc and re-type the plan into my own calendar. TripSync
beat that on both fronts. I pasted a 2-day SF itinerary and the parser nailed 7 events across
2 days, mapped "Saturday July 18" → "Sat, Jul 18", defaulted missing end times to 1h (flagged
"end time assumed"), and gave me an editable preview before committing. The WEEK view — Sat
and Sun side-by-side as clean event chips — is the exact glanceable thing my friends would
actually open. The share link round-trips: I opened it in a fresh browser (no localStorage)
and saw the full trip + title. The .ics export is a real VCALENDAR (correct TZID, DTSTART/
DTEND) that drops straight into Google Calendar. That's the doc-replacement I wanted.

DRAG CRAFT (the part I judged hardest): genuinely Google-Calendar-grade. Click-drag down the
grid shows a live preview block with a running "10:00am – 12:00pm" label, snaps cleanly to the
hour, and on release pops an inline editor with the title auto-focused and start/end pre-filled.
Single-click made a tidy 1h block. Move worked — dragged a 2h event from 10am to 1pm and it
kept its duration. No layout shift, no jank, smooth at 60fps. "Saved" + author color-coding
(my events went rose once I set my name) is a thoughtful collab touch.

TOP LIKES: parser quality + editable preview; the Week side-by-side view; no-login share link
that truly round-trips; polished drag-create with live time label; valid .ics export.

DISLIKES / FRICTION: (1) The Day/Week/Month switcher isn't a real <button> — it's a styled
div with no button/ARIA role, so it's not keyboard-focusable. Works on mouse click, but as a
frontend eng that's a visible a11y gap. (2) In the anonymous "Guest" blank-calendar flow,
events render washed-out grey until you set a name — looked unfinished until I realized color =
author. (3) Resizing: when I grabbed near the bottom edge the whole block translated by an hour
instead of just extending — the resize hit-area feels thin / easy to miss vs Google Cal.
(4) Minor: the header view toggle is unresponsive while the parse-preview screen is open.

BLOCKING ISSUE: none. Everything core worked end to end.

Why 8 and not 9: I'd share this in team Slack — it's that good and the "free, no login" hook is
real. It's not a 9/10 yet because the resize handle is fiddly and the view toggle's missing
button semantics are the kind of thing I notice immediately. Tighten those and it's a 9.

```json
{"tester": 2, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8,
 "topComplaints": ["Resize hit-area too thin — grabbing the bottom edge moves the whole event instead of resizing", "Day/Week/Month toggle isn't a real button (no ARIA/keyboard focus)", "Anonymous Guest events render washed-out grey until you set a name"],
 "priorConcernsAddressed": "n/a"}
```
