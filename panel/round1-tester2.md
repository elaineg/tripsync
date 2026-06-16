# Marcus — round 1

**1. CLARITY — Yes.** H1 "Turn a messy itinerary into a shared day-by-day calendar — no app, no login" + the two labeled cards ("Paste an itinerary" / "Start from a blank calendar") told me what it is and how to start in well under 30s. "Anyone with the link can view and edit — No account or email required" nailed the no-login hook. Zero console errors on load.

**2. VALUE — Yes.** Today my weekend plan for two visiting friends rots in a Google Doc nobody opens on their phone. I pasted my notes, got a "Preview parsed events" confirm step ("12 events across 2 days will be added", times editable before committing), then a genuinely clean visual day calendar with side-by-side overlap layout, a Copy invite link that worked (clipboard had the /t/ URL, button flipped to "Copied!"), and a valid "Save to calendar (.ics)". This is the glanceable share link I wanted.

**3. ADVOCACY — 8/10.** I'd drop this in team Slack — polished, no-login, parser + .ics is the kind of thing FE folks love. Not a 9 because the parser is only proven on the clean sample (unsure on truly messy real input) and one rename quirk (below) reads as a small bug, which I notice instantly.

**Biggest blocker:** Renaming a trip from the landing list via the pencil, then pressing Enter, commits the rename BUT also navigates me INTO that trip. Enter should save and keep me on the list. Minor, but it's a jank I'd flag in a PR review.

**Management-feature notes:**
- Remove vs Delete distinction is excellent — tooltips spell it out: "Remove from my list (device-only; trip stays on the server)" vs "Delete for everyone with the link". Could tell them apart instantly.
- Delete = proper custom confirm modal ("...for everyone with the link? This can't be undone." red Delete / Cancel, dimmed backdrop) — no native alert(), no jank. Remove has no confirm, which is correct (non-destructive).
- Inline rename UI (row → text input with ✓/✕) is clean, on both the landing list and the header ⋯ menu ("Rename trip" / red "Delete trip" with trash icon).
- "Create New" (header, home icon) is a link to "/" — clearly nav, not add-event. No ambiguity for me.
- Core still solid: paste→sample→Parse→editable preview→"Add to <name>"→calendar; drag-on-grid opens a Start/End/Save quick editor; "Saved" indicator reassures. Both paste and blank flows landed me on a working trip page.

```json
{"tester": 2, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Enter in landing inline-rename saves but also navigates into the trip — should stay on the list", "Parser only exercised on the clean built-in sample; unclear how it copes with genuinely messy pasted notes"], "priorConcernsAddressed": "n/a"}
```
