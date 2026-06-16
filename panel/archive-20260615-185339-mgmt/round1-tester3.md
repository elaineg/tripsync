# Wen — round 1

(Returning look — this round adds trip management. I re-checked my prior nits, then judged the new features.)

PRIOR CONCERNS RE-CHECK:
- Day/date mismatch warnings: STILL WORK ("you wrote Fri; Jul 11 is a Sat"). Good.
- Assumed YEAR still surfaced silently (no warning like the day-mismatch one): NOT addressed.
- "end time assumed (1h)" honesty + preview-before-commit: still present. Good.

1. CLARITY (Yes) — Landing headline "Turn a messy itinerary into a shared day-by-day calendar — no app, no login" + the two cards ("Paste an itinerary" / "Start from a blank calendar") told me the job in 10 seconds. The new "Recent trips on this device" list at the bottom is self-explanatory.

2. VALUE (Yes) — Today I hand-type events into Google Calendar or fight CSV import. Here I pasted once, got a "Preview parsed events" review (12 events / 2 days) where I fixed times before committing. Parser fidelity is genuinely good: "1-2PM"->13:00-14:00, "2-4PM"->14:00-16:00, single times defaulted to 1h and flagged, the "weather...bring ID" non-event line routed to a Trip Details panel (not a fake event), and the partiful URL stripped from "El Chato" into a link icon. .ics export is valid VCALENDAR, correct TZID + DTSTART/DTEND. The preview step + clean data-out is what earns my trust.

3. ADVOCACY — 6. The paste-to-calendar core is a 9 for me, but a destructive control that silently does nothing drops it hard. For shared trip data, "I deleted it for everyone" must be true; here it's a lie, and that's a trust killer.

Biggest blocker: "Delete trip for everyone" is COMPLETELY non-functional on BOTH entry points — the red trash on the Recent-trips list (aria "Delete trip for everyone") AND "Delete" in the trip-page "Trip options" menu. Clicking fires NO confirmation, NO server request, removes nothing; the trip stays in the list and the URL still loads with all events after reload. I think I deleted it for everyone; it's still live at the share link. Worse than a missing feature.

Management-feature notes:
- Remove vs Delete labels: EXCELLENT and unambiguous. Trash tooltip = "Delete for everyone with the link"; text link = "Remove from my list". I knew which was device-only.
- "Remove from my list" WORKS: drops from this device but the trip URL still loads (200). Correct.
- Rename STICKS: works from trip-page title click (inline input, "Saved") AND from the list pencil ("Rename trip"); persists across nav.
- Naming trap: header "Set name" is actually "Change YOUR name" (display name), NOT the trip name — I first clicked it to rename the trip. Relabel it.
- "Create New" is a nav link to landing, not add-event. Clear.

```json
{"tester": 3, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 6, "topComplaints": ["'Delete trip for everyone' does nothing on either entry point (list trash + header menu) — no confirm, no server call, trip survives reload and stays live at the share link", "Header 'Set name' actually changes YOUR display name, not the trip name — easily mistaken for trip rename"], "priorConcernsAddressed": "some"}
```
