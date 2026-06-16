NAME: Wen

```json
{"name":"Wen","clarity":"Yes","value":"Yes","advocacy":8,"view_only_clear":"Yes","prior_concern_addressed":"Partial","complaints":["No CSV export — still .ics-only. As a marketing data analyst I live in Sheets; I can't pull the parsed plan into a spreadsheet to diff/QA the parse or re-import it. Known out-of-scope, but it's the single thing keeping me off a 9.","Tiny: I'd still love a 'CSV (Sheets)' option sitting right next to 'Save to calendar (.ics)' — even a one-click table dump."]}
```

PRIOR CONCERN 1 (link confusion) — FIXED. The two share links are now genuinely unconfusable. Both are real, parallel buttons with copy icons: "Copy invite link" (under "Edit link — anyone can edit") and "Copy view-only link" (under "View-only link — read-only"), with the helper line "Edit = companions who plan with you · View-only = anyone you just want to show." I clicked each and read the clipboard: edit copied /t/aS2n… , view copied a DIFFERENT /v/EGrn… slug — different URLs, different powers, both spelled out. A hurried relative cannot grab the wrong one anymore. The view button is no longer a bare "Copy".

PRIOR CONCERN 2 (CSV) — NOT addressed, confirmed out-of-scope. Only .ics export exists. Noted, not a regression.

CLARITY — Yes. Headline + two cards unchanged and still land in ~10s: "paste your typed trip plan, it becomes a shareable day-by-day calendar, no login."

VALUE — Yes, recurring (every family/work trip). Re-verified the data-trust behavior that won me: parse flagged "8 events across 2 days," each event shows editable time dropdowns and "end time assumed (1h)" — no invisible transforms. Titles/times all correct. .ics carried all 5 events with right SUMMARYs. Today I'd hand-type into Google Calendar; this is faster AND auditable. Only gap vs my workflow: I still can't round-trip through Sheets.

VIEW-ONLY — Yes, genuinely read-only, no regression. /v/ link shows yellow banner "View-only — you can't edit this trip. Ask the trip owner for the edit link to make changes," renders all events on the correct Jul 10/11 days, zero edit affordances (no Parse/Confirm/Create New/Delete/Paste), clicking the grid creates nothing — and it STILL has its own "Download .ics" (5 VEVENTs) so a relative can pull the plan into their calendar without mangling mine. Edit link retains full event editing. No parser regression.

ADVOCACY — 8. I'd bring it up to anyone planning a group trip; the link fix removed my one usability nit. Held at 8 (not 9) ENTIRELY by the missing CSV/Sheets export — explicitly known out-of-scope, but as a data analyst it's the difference between "useful tool I mention" and "tool I evangelize." Everything that was in scope is now clean.
