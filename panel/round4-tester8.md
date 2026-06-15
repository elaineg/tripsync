Name: Rob

## Prior concern re-checked first — date off-by-one: NOT RESOLVED (worse than thought)
I was told this was fixed ("dates built in local time"). It is not. I pasted my Whistler plan with explicit dated headers + mixed 24h/AM-PM times:
- "Friday Mar 7" renders **"Fri, Mar 6"** in the preview ("Friday Mar 7 → Fri, Mar 6") AND on the day tabs.
- "Saturday, March 8" renders **"Sat, Mar 7"**.
- "Sun 3/9" renders **"Mon, Mar 9"** (correct).
So every NAMED-month header shifts back exactly one day, while the NUMERIC header (3/9) is correct — a new inconsistency. Consecutive days Mar 8→Mar 9 now show a gap (Mar 7 then Mar 9).
And it's not cosmetic: the exported **.ics has the wrong date baked in** — "Marco arrives" (Fri Mar 7) exports `DTSTART ...20260306T170000` (Mar 6). My friends' real calendars would get the wrong day. Times are still correct.

## Clarity: Yes
Same tight headline, understood in 5s. No change.

## Value: Yes (but undermined by the date bug)
Today I use a Google Doc + group text nobody updates. The flow (390px) still works: create → paste → preview → add → calendar → Copy invite (clipboard === trip URL) → friend opens no-login → Confirm button present and fires → .ics export works. The whole reason for this app is so my friends get the RIGHT plan without me babysitting it — and right now it would put them at the lodge a day early.

## Advocacy: 5/10
Down from 9. No flow regression — paste/preview/commit/copy/confirm/export all still function. But the one thing I flagged is unfixed AND now demonstrably corrupts the .ics export, plus a new named-vs-numeric date inconsistency. I cannot send three friends a ski-trip link that says the wrong arrival day in their calendar. The day it's actually fixed (verified in preview, tabs, AND .ics DTSTART), I'm back to a 9.

## Likes
- Parser still swallows my messy real paste (24h, ranges, varied headers) — 6 events across 3 days, times all correct.
- No-login friend confirm + .ics export still work; name is optional (Skip).
- Preview now SHOWS the resolved date ("Mar 7 → Mar 6") — ironically this made the bug obvious instead of hiding it.

```json
{"tester": 8, "round": 4, "clarity": "Yes", "value": "Yes", "advocacy": 5, "topComplaints": ["Date off-by-one NOT fixed: named-month headers shift back 1 day in preview, tabs, AND exported .ics (Fri Mar 7 -> DTSTART Mar 6); numeric 3/9 parses correctly = new inconsistency", "Wrong date ships into friends' real calendars via .ics, not just a display label"], "priorConcernsAddressed": "none"}
```
