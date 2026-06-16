Name: Wen
Clarity: Yes
Value: Yes
Advocacy: 9

I'm a marketing data analyst; I live in BigQuery/Sheets/Looker and I distrust tools that
transform my data invisibly. My job here: paste the tidy day-by-day itinerary I already
typed for a family reunion and get a correct calendar without re-keying every time/place.

PARSER REGRESSION CHECK (my must-pass): NOT regressed. It is better than I remembered.
I pasted a 3-day, 10-line itinerary (mixed AM/PM, venue names, an apostrophe in "Nonna's").
- "Parse →" gave a "Preview parsed events" step FIRST: "10 events across 3 days will be
  added. Edit titles or times below before confirming." Correct count, correct times
  (3:00pm, 6:30pm, 9:00am, 10:30am, 1:00pm, 3:30pm, 7:00pm, 8:00am, 10:00am, 12:30pm).
- It flagged my day/date mismatches in orange: "(you wrote Fri; Jul 11 is a Sat)". It
  surfaced the discrepancy instead of silently "fixing" it. As a data-hygiene person this
  is exactly the behavior that earns my trust.
- Every inferred end time is labeled "end time assumed (1h)". No hidden transforms.
- Confirmed -> all 3 day tabs (Jul 11/12/13) created, events placed at right times.
- "Save to calendar (.ics)" exported clean ICS: 10 VEVENTs, TZID America/Los_Angeles,
  correct DTSTART/DTEND, SUMMARY preserved incl. the apostrophe, UID per event. This is
  real, importable data out — it's what I actually need.

NEW BLANK PATH: Works like Google Calendar. Drag down the grid -> "(New event) 11:45am –
2:00pm" with a popover (title field, start/end dropdowns, Save / More). Single-click made a
clean 1h block (6:30–7:30pm). Smooth, no console errors anywhere.

SHARE: Copy invite link gives /t/<id>; a fresh no-login browser opened it and saw the
events. "Saved" + "Guest" badges, "Anyone with this link can view & edit." Good.

CLARITY (Yes): Landing says "Turn a messy itinerary into a shared day-by-day calendar — no
app, no login" with two clearly-labeled cards: "Paste an itinerary" vs "Start from a blank
calendar." Two ways in is obvious, not confusing.

VALUE (Yes): Today I'd hand-type events into Google Calendar one by one, or fight a clunky
CSV import. This took one paste + one confirm to get all 10 events with a clean .ics I can
import anywhere. That's a real time save and I'd reach for it every trip.

TOP LIKES: day-of-week mismatch warnings; "end time assumed" honesty; preview-before-commit;
clean spec-correct ICS with apostrophe intact; no-login share link works.

TOP DISLIKES / FRICTION:
- Export is .ics only. I'd love a CSV option too (my whole stack is CSV-in/out); ICS does
  the Google Calendar job, so minor.
- No year in my itinerary -> it assumed 2026 silently. Reasonable, but it warns me about
  day/date mismatches, so it should also surface the assumed YEAR the same way.
- Minor confusion in blank mode: when I had a new-event title field focused, my typed title
  appeared to land on the TRIP NAME at top-left rather than the event, while the event
  stayed "(New event)". Could be my own focus slip, but the two title fields are easy to
  confuse — worth tightening.

BLOCKING ISSUE: None. Zero console errors across paste, parse, confirm, drag-create,
single-click, ICS export, and friend share-link load.

Advocacy 9: It nails the one thing I came for and respects my data. Not a 10 only because
of CSV-out absence and the title-focus ambiguity in blank mode. I'd bring this up unprompted
to anyone planning a group trip.
