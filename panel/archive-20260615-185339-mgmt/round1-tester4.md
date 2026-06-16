# Tomás — round 1

Ops analyst, Excel/Tableau/Jira all day, IT blocks installs, wary of pasting company data — but this is a personal beach-house week in a browser tool, so it fits. This round I exercised the new trip-management features and re-checked my prior gripes.

Prior concerns re-checked:
- "No way to reach a future month from a blank calendar (defaults to today)" — ADDRESSED. Blank mode now shows a "Go to:" date field (2026-06-16) with prev/next arrows, so I can jump to my August week. This was my #1 blocker; it's fixed.
- "Week view showed one day, not 7" — UNCONFIRMED this round (my view-toggle click didn't register; couldn't re-verify), so I'm leaving it as an open question, not a pass.

CLARITY — Yes. "Turn a messy itinerary into a shared day-by-day calendar — no app, no login" plus "Anyone with the link can view & edit... No account or email required" told me what it is and who it's for in ~5s. The two start cards (Paste vs Start blank) make the paths obvious.

VALUE — Yes. Today I'd fight a SharePoint Excel half my relatives can't open on their phones plus a Teams thread. Here: paste our rough plan → Parse → editable preview ("12 events across 2 days," "end time assumed") → "Add to..." → a clean calendar with side-by-side overlaps and a "Save to calendar (.ics)" export. One no-login link I can send Grandma. That genuinely beats my spreadsheet.

ADVOCACY — 8. I'd raise it next time family or ops coordinates a group thing. Held off 9 because there's still no read-only/view-only share — "anyone with the link can edit" handed to 15 relatives means one fat-finger changes the shared plan, and I can't restrict it.

Biggest blocker: No view-only share mode. Universal edit-by-link is risky for a large mixed-age family; I want most people viewing and only me editing.

Management-feature notes:
- Recent list ("Recent trips on this device" — honest label) per row: "Remove from my list" (text), pencil=Rename, red trash=Delete. Tooltips are explicit — "Remove from my list (device-only; trip stays on the server)" vs "Delete for everyone with the link" — and the trash fires a modal: "Delete this trip for everyone with the link? This can't be undone." (red Delete + Cancel). As a cautious coordinator I do NOT fear accidentally nuking the shared plan. Good guardrail.
- Nit: the red trash sits right next to "Remove from my list" with no visible label; the for-everyone vs for-me distinction is only clear on hover. A tiny "Delete for all" label would beat relying on tooltips.
- Trip page: title pencil to rename, "..." menu = "Rename trip" + red "Delete trip", "Create New" top-left, live "Saved" status. Discoverable and clean.
- Core sanity: paste → Load sample → Parse → confirm → events landed correctly. No console errors.

```json
{"tester": 4, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["No read-only/view-only share mode — anyone with the link can edit, risky for 15 relatives", "Red Delete trash sits next to 'Remove from my list' with no visible label; for-everyone vs for-me only clear on hover"], "priorConcernsAddressed": "some"}
```
