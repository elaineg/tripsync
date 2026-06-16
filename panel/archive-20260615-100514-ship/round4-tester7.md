Name: Aisha (product designer, judges craft hard; motivation: a beautiful glanceable phone day-view vs her ugly Notion page)

**Round-3 P0 — RESOLVED.** I pasted my exact natural itinerary (24h times: "09:00 Coffee", a "14:30-16:00 Lunch" range, plus "Day 1 - Friday" / "Day 2 - Saturday" headers), hit Parse, clicked "Add to Lisbon weekend" — and the events now ACTUALLY LAND. Coffee 9:00–10:00am, Tram 28, Lunch (range read correctly as 2:30pm–4:00pm), Fado all render on the Day grid; the calendar is no longer "No dates yet." Reloaded — still there. Verified at 390px. This was the one thing that had to work, and it works. The day-view itself is genuinely beautiful: warm paper grid, soft event blocks, clean hour rails — exactly the glanceable phone view I wanted over my Notion bullets.

**BUT new defects, two real, one critical-for-me:**
1. **Dated-header OFF-BY-ONE.** Round-4's explicit check fails. I pasted "Friday Mar 7 / 20:00 Late dinner". The preview literally reads **"Friday Mar 7 → Fri, Mar 6"** and after commit the event renders on the **Mar 6** pill, not Mar 7. It's a date-shift (timezone) bug visible right in the preview. I can't trust a trip calendar that silently moves my dinner a day earlier.
2. **"What's your name?" sheet still steals clicks.** Clicking **Skip** does NOT dismiss it — it re-pops on the next interaction and intercepted my date-pill taps repeatedly. Only typing a name + Continue stops it (0 reappearances after that). Skip should mean skip.
3. **Dark sliver by the toggle is still there (390px).** The row is "Day | Week | Month | [dark date pill clipped to just 'M'] | refresh | Copy invite link" — the date strip is crammed into the toggle row and the selected pill is chopped off. The bulk button label "Save to calendar (.ics)" is NOT truncated (good), but this clipped dark pill is the same craft smell I flagged.

**Clarity: Yes.** Headline nails it in 5s.
**Value: No.** The commit works now, but a calendar that shows "Mar 7 → Mar 6" can't replace my Notion page — I'd have wrong dates. So close.
**Advocacy: 5/10.** Up from 3 (core flow restored, day-view is lovely), but the off-by-one date bug + Skip-that-won't-skip keep it well under recommendable. Fix the date shift and the Skip nag and this is a 9.

**Likes:** events finally land + persist; 24h + range parsing; the editable "8:00pm – 9:00pm / end time assumed" preview rows; warm-paper day grid; Saved/Aisha attribution chip; full ".ics" label.

```json
{"tester": 7, "round": 4, "clarity": "Yes", "value": "No", "advocacy": 5, "topComplaints": ["Dated-header OFF-BY-ONE: 'Friday Mar 7' previews and commits as Fri Mar 6 (timezone date shift, visible in preview 'Friday Mar 7 -> Fri, Mar 6') - wrong dates make the trip calendar untrustworthy", "'What's your name?' sheet: clicking Skip does not dismiss it; it re-pops and steals subsequent clicks (only typing a name stops it)", "390px toggle row still crams a clipped dark date pill ('M' sliver) between Month and the refresh icon"], "priorConcernsAddressed": "some"}
```
