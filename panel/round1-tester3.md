Name: Wen
Role: Marketing data analyst | high-medium tech | desktop, two monitors | round 1

# Verdict
**Clarity: Yes.** Within 5 seconds the headline ("phone-friendly day-by-day calendar you can both open and edit from one link") plus the subline "Paste an itinerary and watch it become a visual hourly calendar. No app, no login" told me exactly what it is and that it's for sharing a trip plan with companions. "Name your trip" + "Create shared trip" needed zero thought.

**Value: Yes.** Today I keep my family-reunion itinerary in a Google Doc and manually re-key each line into Google Calendar — tedious and once-per-event. Here I pasted my own tidy itinerary (not just the sample) and it parsed all 7 events across 2 days correctly into an hourly day view, with a faithful PREVIEW before commit. That preview is what wins me over: I distrust tools that transform data invisibly, and this shows me the parse before I accept it. Real time saved over hand-entry.

**Advocacy: 7/10.** Genuinely useful and the share-by-link + no-login collaboration actually works (I opened the link in a clean browser AND mobile — events were there; a "friend" confirmed an event and got ✓-attributed by name). It loses points on data-hygiene trust, my core value, not on function.

# Concerns (ordered)
1. **Silent transforms I can't correct in the preview.** Open-ended lines ("9:00 AM Grandma arrives", no end time) were auto-given a 1-hr block (9–10am). It also overrode my typed weekday — I wrote "Saturday August 9", it silently placed it on "Sun, Aug 9" (correct for 2026, but never flagged my mistake). The preview is read-only: I can only Add or Cancel, not fix a time/duration before committing. As an analyst I want to edit rows IN the preview and a note like "end time assumed."
2. **Bulk export is .ics, not "Add all to Google Calendar," and only appears AFTER something is confirmed.** Per-event "Add to Google Calendar" builds a correct render?action=TEMPLATE URL (verified). But I hunted for a bulk Google add and there isn't one — it's "Add all confirmed (.ics)," which is hidden until an event is confirmed. Fine once understood; confusing at first.
3. **Mobile (~390px):** PASSED. Cold friend-open lands on the day timeline with events visible above the fold (Grandma 9am, Brunch, Check-in all in view), tap opens a clean bottom-sheet (Confirm / Add to Google Calendar / Edit / Delete), not covered by sticky bars. Grid scrolls inside its own pane. One initial load looked empty for me but a clean re-run showed events — possible first-paint hydration flake worth watching.

# Likes
- Faithful, legible parse preview before commit — exactly my trust requirement.
- True no-login share: link works in a fresh browser and on phone; name-on-first-edit attribution (✓ Cousin Mei) is tasteful.
- Day/Week/Month all render correctly; "Saving…/Saved" + identity chip give me confidence it persisted.

```json
{"tester": 3, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 7, "topComplaints": ["Read-only parse preview hides/auto-assigns end times & silently overrides typed weekday — can't edit before commit", "No bulk Google-Calendar add; bulk option is .ics and hidden until an event is confirmed", "One mobile cold-open rendered empty before a clean retry showed events (possible hydration flake)"], "priorConcernsAddressed": "n/a"}
```
