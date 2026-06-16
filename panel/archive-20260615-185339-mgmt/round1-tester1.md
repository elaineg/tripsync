# Priya — round 1

**1. CLARITY — Yes.** The H1 "Turn a messy itinerary into a shared day-by-day calendar — no app, no login" plus the two labeled cards ("Paste an itinerary" / "Start from a blank calendar") told me exactly what it does and how to start in well under 30s. The footnote "No account or email required" is the line that made me stop being skeptical — that's the whole reason I'd use this over the group chat.

**2. VALUE — Yes.** Today I'd dump the cabin plan in the Slack/iMessage group thread and people lose it. I pasted "Load sample itinerary," hit Parse →, got a clean preview of 12 events across 2 days with editable start/end times ("end time assumed" flagged honestly), confirmed, and got a real Google-Calendar-style day grid with overlapping events side-by-side. "Copy invite link" + "Save to calendar (.ics)" means my non-technical friends just open a URL on their phone — no install, no signup. That genuinely beats my workflow.

**3. ADVOCACY — 8.** I'd bring this up the next time someone's wrangling a group trip. Not a 9/10 because the value is real but narrow (trips, a few times a year for me, not a daily tool) and the management features are organizer-side polish my friends never see. What holds it back from 9: the landing-list rename/delete are icon-only — scope only readable via hover tooltips that don't exist on touch.

**Biggest blocker:** None blocking. Closest thing: landing "Recent trips" rename (pencil) and delete (trash) are unlabeled icons; on a phone there's no hover, so the careful "Remove from my list (device-only)" vs "Delete for everyone" distinction is invisible until you tap.

**Management-feature notes:**
- "Remove from my list" vs "Delete" — clearly distinguished where it matters: tooltips read "Remove from my list (device-only; trip stays on the server)" vs "Delete for everyone with the link," and trash-delete fires a confirm modal "Delete this trip for everyone with the link? This can't be undone." Excellent. Only gap: those tooltips are hover-only.
- Header pencil rename worked inline (title → "Renamed Cabin Trip", "Saved" confirmed). Landing pencil rename also worked (input pre-filled current name, Enter saved → "Gamma RENAMED").
- Header "..." menu has Rename trip / Delete trip / Copy invite link / Save to calendar — good.
- "Create New" reads as navigation (home icon + word "New"), and it did take me to the landing page. NOT mistakable for an add-event button — correct, since add-event is click-a-slot on the grid.
- Core flow intact: paste→parse→preview→confirm→calendar all worked; blank grid shows "Drag down the grid… or click a slot for a 1-hour event" and clicking a slot opens a tidy title + Start/End stepper editor. 0 console errors throughout.

```json
{"tester": 1, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Landing-list rename/delete are icon-only; the device-only-vs-everyone scope lives in hover tooltips invisible on touch devices", "Value is real but low-frequency (trips, not a weekly tool), and management UI is organizer-only — friends with the link never see it"], "priorConcernsAddressed": "n/a"}
```
