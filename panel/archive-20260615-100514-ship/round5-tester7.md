Name: Aisha (product designer, judges craft hard; motivation: a beautiful glanceable phone day-view vs her ugly Notion page)

**Round-4 blockers — re-checked first:**
1. **OFF-BY-ONE date — RESOLVED.** Pasted "Friday Mar 7" + 24h times. Preview now reads **"Friday Mar 7 → Sat, Mar 7"** (it keeps Mar 7 and even flags my weekday slip: "you wrote Fri; Mar 7 is a Sat" — considerate touch). After commit the date chip is **Mar 7**, not Mar 6. The downloaded .ics confirms it end-to-end: all three events `DTSTART;TZID=America/Los_Angeles:20260307T...` (Coffee 0900, Lunch 1430-1600, Dinner 2000). No silent day-shift anywhere. This was THE blocker and it's gone.
2. **"What's your name?" Skip — RESOLVED.** Clicking Skip dismisses the sheet instantly and it stays gone — tapped the date chip and two grid spots after, zero re-pops, no click-stealing. Round-4's nag is fixed.
3. **390px dark sliver — RESOLVED.** Toggle row is clean (Day | Week | Month + refresh + Copy invite link); the **Mar 7 chip is on its own row** below, full and legible — no clipped "M", no dark sliver. Events land at the right hours, full labels, ".ics" label not truncated.

**Clarity: Yes.** Headline + subhead explain it in 5s.
**Value: Yes** (up from No). The dates are finally trustworthy across preview, day view, and the exported .ics, so this genuinely replaces my squinty Notion bullet page — the warm-paper day grid is exactly the glanceable phone view I wanted, and the .ics drops straight into my calendar.
**Advocacy: 9/10.** Up from 5. Core flow is solid, both blockers fixed, and the craft is now what made me want this in the first place. Not a 10 only because I'd want a tiny inline confirm when an .ics downloads (it was silent — I had to trust it worked) and the event-detail sheet says "Proposed by Guest" which reads oddly when I'm the only person; minor polish, not blockers.

**Likes:** dates correct everywhere incl. exported .ics with TZID (no UTC shift); the "Mar 7 is a Sat" weekday-mismatch hint; Skip that actually skips; clean 390px header with the date chip on its own row; warm-paper day grid; range parsing (2:30-4:00pm); Saved/attribution chips.

```json
{"tester": 7, "round": 5, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": [".ics download is silent — no inline confirmation toast, I had to trust it saved", "event detail sheet reads 'Proposed by Guest' which is odd copy when I'm the sole editor"], "priorConcernsAddressed": "all"}
```
