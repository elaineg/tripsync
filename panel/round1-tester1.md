Name: Priya
Clarity: Yes
Value: Yes
Advocacy: 8

I'm a backend eng who lives in a terminal and bounces off anything that smells like a
signup. I cold-loaded localhost:3099 and gave it the cabin-weekend test for real.

## 5-second read
Headline "Turn a messy itinerary into a shared day-by-day calendar — no app, no login"
plus two clearly-labeled cards (Paste an itinerary / Start from a blank calendar) and the
"No account or email required" line. I knew exactly what it was and how to start before I
finished reading. As a skeptic, "no login / no account or email" up front is the thing
that made me keep going instead of closing the tab.

## What I actually did
- Start blank: dragged on the hourly grid -> got an inline editor with a title field and
  two time dropdowns + Save/More. Single-click made a ~1h block. Dragged an event to move
  it (worked), dragged the bottom edge to resize (105px -> 225px, label updated to the new
  time). Feels like Google Calendar, which is the right thing to copy.
- Paste: dropped my group-chat-style itinerary in. The parser is genuinely good — it
  showed "8 events across 3 days," defaulted missing end times to 1h (and labeled them
  "end time assumed"), and CAUGHT my wrong weekdays: "Friday July 11 -> Sat, Jul 11 (you
  wrote Fri; Jul 11 is a Sat)." That correctness check earned trust fast.
- Share: "Copy invite link" copied a clean /t/<id> URL; opened it in a fresh browser with
  no login and it showed every event. That IS my use case — non-technical friends opening
  it on a phone with nothing installed.
- .ics export is a valid VCALENDAR with proper TZID. I'd actually import this.
- Zero console errors in any flow. I checked.

## Top likes
- No login, and it means it. The "What's your name?" prompt has a Skip and says "you can
  set this later" — optional, no email. That's the difference between trust and a closed tab.
- Paste parser flags its own assumptions instead of silently guessing.
- Share link works for a stranger with no account. Core promise delivered.
- Valid .ics export. I'm not locked into their UI.

## Top dislikes / friction
- The bottom-edge resize handle isn't discoverable. My first resize attempt did nothing
  because the event was in a selected/dashed state and there's no visible grip; I had to
  hover the exact edge. Friends will think resize is broken.
- Drag-to-create snapped to 10:45am–1:00pm when I dragged a cleaner range — the snap
  granularity is coarse and a little imprecise. Fine because the dropdowns let me fix it,
  but the first drag rarely lands where you expect.
- The "What's your name?" modal auto-pops right after committing a pasted itinerary and
  intercepts every click until you Skip/Escape. Minor, but it interrupts the moment you
  just want to grab the share link.

## Blocking issues
None. Nothing made me abandon. Everything I tried worked.

## The three answers
1. CLARITY — Yes. Headline + two start cards + "no login" told me what and how in seconds.
2. VALUE — Yes. For dropping a loose group-chat plan into something friends open on a phone
   with no app and no account, this beats what I'd do today (a shared Google Doc that
   nobody can read on a phone, or a Google Calendar that requires everyone to have/join an
   account). The paste-and-correct flow saved me real retyping.
3. ADVOCACY — 8. I'd recommend it for exactly this scenario. It's not a 9/10 because the
   resize handle is invisible and the drag snapping is imprecise — small polish gaps that
   a non-technical friend would stumble on and ping me about. Fix the resize affordance and
   tighten drag snapping and this is a 9 I'd bring up unprompted.
