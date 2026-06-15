Name: Priya
Role: Senior backend engineer; skeptical of new tools, hates signups, abandons anything slower than a CLI. Driving to a friend's cabin, wants to drop the group-chat plan somewhere her non-technical friends open on their phones with no account.

clarity: Yes
The headline ("Your friend's trip plan, as a phone-friendly day-by-day calendar you can both open and edit from one link") plus "No app, no login. Paste an itinerary..." told me exactly what it is in ~3 seconds. "No account or email required" under the create button is exactly the line that lowers my guard. I checked the network tab out of habit — create just hits its own backend, no third-party trackers, no auth redirect. Good.

value: Yes (with one mobile caveat below)
Today I dump the plan into the group chat and it scrolls away, or I make a Google Doc nobody opens on their phone. Pasting the raw "Friday May 1 / 12:30PM Emily lands / 1-2PM Uber..." text and getting "12 events across 2 days will be added" parsed into an hourly calendar is genuinely better than re-typing into a Doc. The paste-import is the real time-saver and it nailed messy input including a ranged time and a link. No-login share link is the whole reason I'd pick this over Notion (my friends won't make a Notion account).

advocacy: 5
I'd recommend it cautiously, not unprompted — and the thing holding it back is the exact feature it's sold on: the mobile day view. The desktop flow is clean, but my friends are on phones, and that's where it stumbles.

concerns (ordered by severity):
1. CRITICAL / mobile: the day grid does not scroll. At 390px the column is fixed to viewport height (page height == 844, scrollTop stays 0 after wheel AND after a touch swipe-up). The last event "El Chato 8:30pm" sits at y=1077, well below the fold and unreachable. So on a phone you can see lunch but the entire afternoon/evening is hidden with no way to reach it. For a "phone-first day-by-day calendar" this is the headline feature broken.
2. Mobile cold-open wastes the fold: the grid opens at ~6am and the first real event (12:30pm) is in the bottom third behind ~7 empty morning hours. I land on empty grid and have to hunt downward (which then fails per #1). It should open scrolled to the first event.
3. Swiping/tapping an empty hour pops "What's your name?" / an add-event prompt — easy to trigger by accident while trying to scroll, which compounds #1 (a normal scroll gesture creates events instead).
4. Commit gate timing: "Add to <trip>" doesn't add anything until you pass a "What's your name?" modal. Minor, but I clicked Add and nothing visibly happened the first time.
5. Empty calendar before parsing says "No dates yet" — fine, but the Parse button looks disabled (grey) until you realize the textarea must have content; took a beat.

likes:
- Paste-to-calendar parsing is the star: handled ranges, a maps link, and trip details ("weather 10-20deg, bring ID") correctly; preview-before-commit is the right call.
- Truly no login. "Copied!" confirmation on the invite button with the correct /t/<id> URL in the clipboard — zero friction to share.
- Event detail modal is excellent and friend-ready: big Confirm, Add to Google Calendar, Edit, Delete, no auth wall. A non-technical friend opening the link can confirm or add an event and just types their name once.
- Day/Week/Month + per-day tabs, events placed at correct hours, autosave ("Saved"), proposer name shown. Solid on desktop.

```json
{"tester": 1, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 5, "topComplaints": ["Mobile day grid does not scroll — afternoon/evening events (e.g. El Chato 8:30pm) sit below the fold and are unreachable on a 390px phone", "Mobile cold-open lands on empty 6am-noon hours; first event is in the bottom third instead of scrolled into view", "A normal vertical swipe on the grid triggers an add-event/name prompt instead of scrolling"], "priorConcernsAddressed": "n/a"}
```
