Name: Dana
Role: Demand-gen marketer, ruthless about time; screenshots tools she likes for the team channel. MacBook + phone, tested at 390px in the REAL loaded-trip state (Create → Load sample → Parse → Add to trip, modal dismissed, 8 events on grid).

**Round-3 nits — re-checked at 390px with events present:**
1. (Black sliver/box poking right of Day/Week/Month toggle) — **NOT RESOLVED.** No horizontal page overflow now (scrollWidth==390), but the day-jump chips "May 1"(165–214) / "May 2"(218–271) render on the SAME ROW as the view toggle and now OVERLAP the refresh button (190–218) and "Copy invite link"(222–374). The active "May 1" chip is dark (bg rgb(26,26,26)) and gets covered by the refresh control, so all I see is a black box reading "M" jammed right after "Month" — verbatim the "wait, is that broken?" sliver from R1/R2/R3. It's not clipped by an overflow ancestor; it's a collision between the day-chip selector and the action controls. Screenshot: 71-togglerow.png.
2. ("Save to calendar (.ics)" truncating to "Save to cale…") — **RESOLVED.** Now a link-style action in the strip, full label "Save to calendar (.ics)" visible (left 251, right 378, within 390, no clipping ancestor). The "(.ics)" is on-screen. .ics actually downloaded ("Untitled-Trip.ics"). Nit gone.

**Clarity: Yes.** H1 "Paste a trip itinerary, get a shared day-by-day calendar — no app, no login" + honest sub nail it in 5 sec. Unchanged.

**Value: Yes.** Re-walked cold: create with no name → real /t/ URL; Load sample → Parse → 8 events across 2 days; grid auto-opens at 12pm with "Emily lands 12:30pm" right at top (no dead morning); Trip Details extracted weather/what-to-bring; Copy invite link copied the real /t/ URL; .ics downloaded; zero console errors. Still beats my Notion+Canva+group-text.

**Advocacy: 8.** Unchanged. The ICS label fix is real and I appreciate it — but the ONE thing I screenshot to the group is a clean phone view, and there's still a black "M" box colliding with the toggle in the exact loaded state friends will see. Core value is a 9; one persistent 390px collision keeps it at 8. Make the day-chips wrap to their own row (or hide on Day view) so they stop overlapping the toggle/refresh/Copy controls and it's a 9.

**Likes:** ICS label now fully visible + actually downloads; auto-scroll to first event; name-optional create; honest subtitle; editable parse preview with "end time assumed" notes; Trip Details extraction; instant copy-invite; one-link friend open; zero console errors.

```json
{"tester": 5, "round": 4, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Day-jump chips (active 'May 1' is dark) overlap the refresh + Copy-invite controls on the toggle row at 390px, so a black 'M' box still pokes out right of Day/Week/Month — same 'is this broken?' glitch", "Day-chip selector and view-toggle/action controls share one row and collide on a phone instead of wrapping"], "priorConcernsAddressed": "some"}
```
