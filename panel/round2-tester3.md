# Wen — round 2

PRIOR CONCERNS RE-CHECK:
- DELETE bug (my R1 blocker): FIXED, end-to-end, both entry points. Header ⋯ → Delete and list "Delete for everyone" each open the confirm dialog (testid delete-confirm-dialog) reading exactly "Delete this trip for everyone with the link? This can't be undone." Confirming fires exactly ONE `DELETE /api/trip/<id>` → 200, redirects home, and reloading the trip URL shows "not found." From the list it deletes only the targeted trip; a sibling trip stayed alive. This is the correct, honest destructive behavior I demanded.
- "Remove from my list" scope: CORRECT — clicking it issued NO DELETE and the server trip still loaded (200). Grey "Remove from my list" vs red labeled "Delete for everyone" + the always-visible scope caption make device-local vs everyone unmistakable.
- "Set name" confusion: RESOLVED — the header control is now "Your name" (no more "Set name"), so I no longer mistake it for renaming the trip.
- Rename: works from BOTH the list pencil ("Rename trip") and the header title (click "Untitled Trip" → inline input); the header rename persisted across a reload.

1. CLARITY (Yes) — Same strong cold-open as R1: the headline "Turn a messy itinerary into a shared day-by-day calendar — no app, no login" plus the two cards tell me the job and audience in ~10 seconds. Nothing new muddied it.

2. VALUE (Yes) — Beats hand-typing into Google Calendar or fighting CSV import. Pasted my reunion text, got a preview, committed; the hike and "El Chato" event parsed and the non-event "bring ID" line stayed out of the calendar. Parser fidelity I care about held up, and a destructive action now does what it says.

3. ADVOCACY — 9. The one thing that capped me at 6 (a destructive control that lied) is genuinely fixed and verified: one DELETE, real 404, surgical scoping, clear confirm copy. With trustworthy delete + clean parse + no login, I'd now bring this up unprompted to family-trip organizers. Not a 10 only because I'd want the assumed-YEAR surfaced as a warning (like the day/date mismatch is) before I fully trust it for dates spanning a year boundary.

Biggest blocker: None that's disqualifying. Minor: assumed/inferred YEAR is still applied silently with no warning banner, unlike the good day-vs-date mismatch warning.

Prior delete bug resolved? YES — verified end-to-end (confirm → single DELETE 200 → trip 404s) on both the list and header entry points, and "Remove from my list" correctly leaves the server trip alive.

```json
{"tester": 3, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Assumed/inferred YEAR is still applied silently with no warning, unlike the day/date-mismatch warning"], "priorConcernsAddressed": "all"}
```
