Name: Rob
Role: Freelance brand/visual designer. Splitting a ski-trip rental with 3 friends; want ONE link everyone adds arrival times to and confirms, instead of me babysitting a master plan everyone ignores.

## Clarity: Yes
Within 5s I got it: "No app, no login. Paste an itinerary and watch it become a visual hourly calendar. Add events straight to Google Calendar." The "Anyone with the link can view and edit — share only with your travel companions. No account or email required" line nailed the no-login pitch. The headline itself is a run-on mouthful ("Your friend's trip plan, as a phone-friendly day-by-day calendar you can both open and edit from one link") — I understood it, but it tries to say 4 things at once. Subhead does the real work.

## Value: Yes (desktop) — this is exactly my workflow today
Today I keep a Google Doc / group text that nobody updates, and I retype it into my own calendar. Here: pasted itinerary → "12 events across 2 days" parsed cleanly, grouped by day, time ranges + a link extracted, even pulled a trip-details/weather panel out. Friend opened the link with NO login, hit Confirm, was asked "What's your name?", and the event showed "✓ Marco" — that confirm-what-you're-in-for loop is the whole reason I'd use this. "Add all confirmed (.ics)" + per-event "Add to Google Calendar" close the loop into my real calendar. On desktop this genuinely saves me the master-plan grunt work.

## Advocacy: 5/10
The idea and desktop execution are a real 8 for me. It drops to 5 because the ONE thing the homepage promises — "phone-friendly day-by-day calendar" — is broken on a phone, and that's where my friends will open it. I can't recommend a "send your friends a link" tool whose mobile day view doesn't work.

## Concerns (ordered)
1. CRITICAL / MOBILE: At 390px, Day view's hourly grid is `overflow-y: hidden` (content 1080px clipped to ~643px) — it CANNOT scroll. El Chato (8:30pm) sits at y=1077, totally unreachable. Vertical swipe / wheel does nothing (page body == viewport, inner grid clipped). All evening events — après-ski dinners, bars, the stuff friends care about — are invisible and untappable on a phone.
2. MOBILE: Cold phone open lands on EMPTY morning hours (5am–12pm); first event (12:30pm) is below the fold and there's no auto-scroll to the first event. You open the headline view and see nothing.
3. MOBILE: The Day/Week/Month toggle row is clipped on the right — a day-tab (May 1/May 2) is cut off behind the refresh button at 390px.
4. Headline copy is a run-on; tighten it.
5. "Add to Google Calendar" is labeled per-event but bulk is an .ics download ("Add all confirmed (.ics)") — fine for me, but the label promises Google specifically.

## Likes
- True no-login collaboration: friend confirmed an event and got name-attributed (✓ Marco) with zero account.
- Paste parser is impressively good (12 events, day grouping, link + weather panel extraction).
- Desktop Day view is a proper hourly calendar with side-by-side overlap handling; "Saving…" + your-name badge are reassuring.
- "Copied!" confirmation is clear and the clipboard held the correct trip URL.

```json
{"tester": 8, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 5, "topComplaints": ["Mobile Day view grid is overflow-hidden — evening events unreachable, no swipe scroll", "Mobile cold open lands on empty morning hours, no auto-scroll to first event", "Mobile toggle row clips a day-tab behind the refresh button"], "priorConcernsAddressed": "n/a"}
```
