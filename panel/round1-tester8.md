Name: Rob
Clarity: Yes
Value: Yes
Advocacy: 8

I'm Rob — freelance brand designer, splitting a ski cabin with three friends, sick of being
the guy who manually maintains a master plan nobody reads. Tested on desktop at 1280px.

CLARITY — Yes. The headline "Turn a messy itinerary into a shared day-by-day calendar — no
app, no login" plus "no account or email required" told me exactly what it is in under 5
seconds. The two cards ("Paste an itinerary" / "Start from a blank calendar — Drag on the
grid to add events") made the two ways to start obvious. I knew where to click immediately.

VALUE — Yes, this actually fits my situation. The blank-calendar drag flow is the real win:
I named the trip, hit "Start blank," click-dragged on the hourly grid and got a clean
12:00pm–2:00pm block with a Google-Calendar-style popover (title field + two time dropdowns
+ Save). Single-click made a 1h block, and I dragged the event to move it (2pm→4pm, time
relabeled correctly). It feels like GCal, which I know. The killer part for MY problem: I
opened the share link in a totally separate browser as a "friend" and it instantly saw my
event — no login, no prompt. Friend could open an event and there's a green CONFIRM button
plus "Add to Google Calendar / Edit / Delete." When I confirmed, it asked "What's your
name?" and then the block showed a green check "Confirmed by Rob" — and the friend's browser
saw "Confirmed by Rob" too. That's exactly the "everyone adds their arrival and confirms
what they're in for" thing I wanted, and the .ics / Add-to-Google-Calendar export means it
lands in the calendar people actually live in. Today I do this in a Google Doc + a group
text that everyone ignores; this is genuinely less work.

TOP LIKES
- Drag-to-create on the grid behaves like Google Calendar; zero learning curve.
- Confirm + "Confirmed by Rob" attribution synced across two separate browsers, no login.
- Copy invite link worked (clipboard got a clean /t/<id> URL, button flipped to "Copied!"),
  and it strips the ?blank= param — the link you share looks right.

TOP DISLIKES / FRICTION
- Name is captured LAZILY, only on your first confirm/edit. Until then every event reads
  "Proposed by Someone" / "Confirmed by Someone." For a 4-person trip where the whole point
  is "who's arriving when," I'd rather it ask my name once up front so nothing is anonymous.
- The grid loads scrolled to ~noon. To add a morning arrival (9–10am) I had to scroll up;
  not obvious, and a friend on a quick phone glance might miss the morning entirely.
- Paste-itinerary is picky: my natural paste "Fri 6pm Drive up to Tahoe / Sat 9am Lift
  opens" was rejected ("Couldn't find any timed events"); it wants "Day 1" headers and
  "9:00 AM" formats. Good error message + sample link, but most real pastes won't match.

BLOCKING ISSUE — None. Full create→share→add→confirm→export loop worked across two browsers
with no JS errors. (Copy verified visually; clipboard read worked in my test env.)

ADVOCACY — 8. I'd actually send this to my cabin group chat this week. It's not a 9–10 only
because (a) anonymous "Someone" attribution until you act undercuts the trust the whole tool
is selling, and (b) the morning events sit below the fold on load. Fix the name-up-front and
default-scroll-to-trip-start and it's a 9.

```json
{"tester": 8, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Author shows as 'Someone' until you act — no upfront name prompt undercuts who-did-what trust", "Grid loads scrolled to noon; morning arrival events sit below the fold", "Paste-itinerary parser rejects natural formats like 'Fri 6pm Drive up'"], "priorConcernsAddressed": "n/a"}
```
