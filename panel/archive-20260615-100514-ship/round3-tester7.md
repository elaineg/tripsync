Name: Aisha (product designer, judges craft hard; motivation: a beautiful glanceable phone day-view vs her ugly Notion page)

**Round-2 holdbacks — both RESOLVED, but a NEW critical regression blocks the app.**

1. **Parser 24h-time silent "0 events" — RESOLVED.** My exact natural paste ("Day 1 - Friday / 09:00 Coffee / 10:30 Tram 28 / 14:30-16:00 Lunch / 19:00 Fado show") now previews "6 events across 2 days," correctly reading 24h times AND the 14:30-16:00 range as 2:30pm-4:00pm. Plain prose with no times no longer silently empties: I got a considered pink panel — "Couldn't find any timed events. Try lines like: 9:00 AM Coffee / 14:30 Lunch / 1-2PM Uber… Make sure each day starts with a header like 'Friday May 1' or 'Day 1'." Exactly the explain-itself empty state I asked for. Beautiful work.
2. **"Download all (.ics)" truncation at 390px — RESOLVED.** Label is now "Save to calendar (.ics)", measured scrollWidth == clientWidth, no clip.

**BUT — NEW P0 REGRESSION: the "Add to <trip>" commit silently discards every parsed event.** The preview is perfect, I click "Add to Lisbon weekend", and the calendar stays "No dates yet. Paste an itinerary or add an event." — across Day AND Week views, polled 4+ seconds, no JS console errors, and localStorage holds only a participant id + recents, no event data. Reproduced cleanly 4x at 390px. In round 2 events DID land on the grid (I saw Coffee/Tram/Lunch/Castelo); the round-3 parser rewrite broke the final commit. A "What's your name?" bottom sheet also intermittently steals the Add click. Net effect: I can parse a gorgeous preview but I can NEVER get a single event onto the calendar — so the entire reason I came (a glanceable day view) is unreachable. I couldn't even re-judge the mobile day view because it never populates.

**Clarity: Yes.** Headline still nails it in 5s.
**Value: No (this round).** A calendar I can't put events into has zero value over my Notion page — the parser fixes are wasted behind a broken commit.
**Advocacy: 3/10.** Down from 8. I would NOT recommend a trip calendar where pasting an itinerary results in an empty calendar — that's the one thing it must do. The two craft fixes are genuinely excellent and the preview/empty-state are the most considered parts of the app, which is why this stings: ship the commit fix and this is a 9. Right now it's broken at the core flow.

**Likes:** parser breadth + range parsing; the pink "couldn't find timed events" empty state with mono examples; editable per-event time dropdowns + "end time assumed" labels in preview; "Save to calendar (.ics)" full label; warm-paper palette; "Saved/Aisha" attribution chip.

```json
{"tester": 7, "round": 3, "clarity": "Yes", "value": "No", "advocacy": 3, "topComplaints": ["P0 REGRESSION: clicking 'Add to <trip>' silently discards all parsed events - calendar stays 'No dates yet' in Day & Week views, no console error, nothing in localStorage (worked in round 2); core flow unusable", "'What's your name?' bottom sheet intermittently intercepts the Add click", "cannot re-judge mobile day view because no event ever commits to it"], "priorConcernsAddressed": "all"}
```
