# Jules — round 1

**1. CLARITY: Yes.** The H1 "Turn a messy itinerary into a shared day-by-day calendar — no app, no login" plus the two clearly-labeled cards ("Paste an itinerary" / "Start from a blank calendar") told me exactly what it is in under 10 seconds. The footer line "Anyone with the link can view and edit — No account or email required" is the exact promise I care about.

**2. VALUE: Yes.** Today I'd dump our camping plan into a Notion page or a group chat and people scroll a wall of text. Pasting my messy list and getting "12 events across 2 days" laid out on a real day grid — with an editable preview before confirming and a Copy invite link / .ics export — genuinely beats that, and nobody has to sign up. I'd actually send this link to the camping group.

**3. ADVOCACY: 8.** The core is slick and the no-login share is the real hook. Two things keep it off a 9: recent-trip names truncate hard on mobile ("Beach ...", "Campi...") so I can't tell trips apart at a glance, and the rename/delete icons sit ~4px apart and are tiny — delete is "for everyone," so an accidental tap is scary.

**Biggest blocker:** None blocking — but on a narrow phone the recent-list name truncation + cramped delete icon make me nervous about destructive taps.

**Management-feature notes (mobile, 390px):**
- Recent list: name / date / "Remove from my list" (grey text) / pencil-rename / red-trash-delete all fit on one line, NO overlap or occlusion. I CAN tell remove-from-list (grey text) from delete (red trash) — color does the work.
- Inline rename is great: pencil swaps the row into a full-width pre-filled input + check/X, and shows the FULL name even though the static row truncates it. Worked cleanly.
- Trip page header at 390px: home/title-with-pencil/"Saved"/Set name/"⋯" all fit, no crowding. "⋯" menu drops Rename trip + Delete trip (red) without occluding the calendar. The "+ Add event" FAB is bottom-right, not blocked by the header.
- Nit: rename + delete icons are ~26px and ~4px apart — below comfortable touch target; risk of mis-tapping the destructive delete.
- Core paste→parse→calendar verified on mobile: sample loaded, 12 events parsed, confirmed onto the day grid. No console/page errors.

```json
{"tester": 6, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Recent-trip names truncate hard on mobile (Beach ..., Campi...) — can't distinguish trips at a glance", "Rename/delete icons ~26px and ~4px apart — fat-finger risk on a destructive delete-for-everyone"], "priorConcernsAddressed": "n/a"}
```
