Name: Dana
Role: Demand-gen marketer, ruthless about time; screenshots tools she likes for the team channel. MacBook + phone, tested at 390px in the REAL committed-trip state (Create → Load sample → Parse → Add to Untitled Trip, 12 events on grid).

**Round-4 nit — re-checked at 390px with events committed:**
1. (Dark "May 1" day-chip overlapping/clipped against the refresh + Copy-invite controls on the toggle row) — **RESOLVED.** Toggle row (y=41) now holds ONLY Day/Week/Month (x17–156) + Refresh (x190–218) + Copy invite link (x222–374); no date chips there. The date chips moved to their OWN full-width row below (y=74): active dark "May 1" at x16–65, white "May 2" at x69–122 — nothing dark overlaps, nothing clipped, scrollWidth==390. The black "M" sliver from R1–R4 is GONE. Screenshot: 04-committed.png.
2. ("Save to calendar (.ics)" label) — still full: "Save to calendar (.ics)" visible at x251–378, within 390. ICS confirmed present (downloaded fine last round). No regression.

**Clarity: Yes.** H1 "Paste a trip itinerary, get a shared day-by-day calendar — no app, no login" + honest sub still nail it in 5 sec.

**Value: Yes.** Re-walked cold: create with no name → real /t/ URL; Load sample → Parse → editable preview ("12 events across 2 days", "end time assumed" notes) → Add to trip → grid auto-opens at 12pm with "Emily lands 12:30pm" at top; "Saved / Guest" status; Trip Details extracted weather/what-to-bring; Copy invite link copied the real /t/ URL (http://localhost:3099/t/-l0WEGx8EQEw6x6cLoivKA); .ics action present; zero console errors. Still beats my Notion+Canva+group-text.

**Advocacy: 9.** Up from 8. The one thing I screenshot to the group — a clean phone view of the loaded calendar — is now actually clean. The date-chip collision that kept it at 8 for four rounds is structurally fixed (own row, no dark overlap, no clipping). Core value was always a 9; the last cosmetic blocker is gone, so I'd bring this up unprompted in the team channel. Not a 10 only because it's still a v1 I haven't stress-tested on messier paste sources, but I'd recommend it today.

**Likes:** Date chips on their own clean row (fix verified); auto-scroll to first event; name-optional create; honest subtitle; editable parse preview with "end time assumed" notes; Trip Details extraction; instant copy-invite of real /t/ URL; full ".ics" label; "Saved/Guest" status pill; zero console errors.

```json
{"tester": 5, "round": 5, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Minor: would want to stress-test parsing on messier real-world paste sources before a 10 — not a blocker"], "priorConcernsAddressed": "all"}
```
