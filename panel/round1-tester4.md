Name: Tomás
Role: Operations analyst, medium-tech, Edge on a corporate Windows laptop. Coordinating a multi-family beach house week; need ONE link relatives of all ages can open with no signup/install.

## Clarity — Yes
In 5 seconds I got it: "Your friend's trip plan, as a phone-friendly day-by-day calendar you can both open and edit from one link" + "No app, no login. Paste an itinerary and watch it become a visual hourly calendar." One field "Name your trip", one button. That's exactly my job. The "No account or email required" line directly answers the question my relatives always ask.

## Value — Yes (with a serious caveat)
Today I do this in a shared Excel/Google Sheet and a Teams thread, and half my relatives never open it because it's a wall of cells. The paste-import is genuinely impressive: I pasted a blob, it parsed 12 events across 2 days into an hourly grid AND pulled out a "weather / bring a jacket / bring ID" trip-details panel on its own. Week view is a clean column-per-day agenda I'd actually share. This beats my spreadsheet on legibility. BUT the value depends entirely on relatives opening it on their PHONES, and that's where it falls down (below).

## Advocacy — 4/10
The desktop flow is lovely, but the headline promise ("phone-friendly day-by-day") is broken for me. I would NOT confidently send this to Grandma's phone today.

## Concerns (ordered)
1. MOBILE DAY VIEW DOESN'T SCROLL (dealbreaker). At 390px the day grid is locked: page scrollHeight == viewport, window.scrollTo does nothing, vertical swipe moves nothing. I land on empty 6am–noon hours; the first event (12:30pm) is barely at the bottom, and everything from ~4:30pm on — dinner, evening, ALL of Saturday — is clipped off-screen and physically unreachable. A relative opening the link can only ever see midday. This is the one thing the product is named after.
2. No auto-scroll to the first/current event — even if scroll were fixed, opening to a blank 6am makes it look empty.
3. Cross-device sync RACE. Twice, when I added events and shared quickly, a fresh "friend" browser opened the /t/ link and saw "No dates yet." It only synced reliably after I waited for the "Saved" indicator. If I copy the link the moment I finish, my relatives get an empty trip. Needs a clear save/sync state before "Copy invite link" is safe.
4. Privacy/trust (my Excel instinct): "Anyone with the link can view AND edit" with no login means any relative who forwards it gives a stranger edit/delete rights, and there's no per-person lock or undo I could find. For company data I'd never use this; for family it's acceptable but I'd want a "view-only link" option.
5. Sample itinerary is a SF city trip (Foreign Cinema, Haight vintage), not beach-house-flavored — minor, but it didn't sell my exact case.

## Likes
- Paste-to-calendar parsing is the magic; auto-extracted trip-details panel is a delight.
- Name dialog ("What's your name? So others can see who made changes") is friendly and explains itself.
- "Copied!" green confirmation is obvious; clipboard returned the real /t/ link.
- Event tap shows Confirm / Add to Google Calendar / Edit / Delete / "Proposed by Tomás" — clear collaboration model.
- Week + Month + Day toggle, no-login, zero friction to start.

```json
{"tester": 4, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 4, "topComplaints": ["Mobile day view does not scroll — evening + Saturday events are clipped and unreachable on a phone, breaking the headline feature", "Cross-device sync race: sharing the link right after adding events shows the friend 'No dates yet' until 'Saved' appears", "Day view opens on empty 6am hours with no auto-scroll to first event", "No-login 'anyone can view AND edit' link has no view-only option or edit lock"], "priorConcernsAddressed": "n/a"}
```
