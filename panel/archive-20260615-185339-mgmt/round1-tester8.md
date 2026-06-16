# Rob — round 1

Freelance brand/visual designer, splitting a ski cabin with three friends, sick of being the
guy who maintains a master plan nobody reads. Tested desktop @1280px.

**1. CLARITY: Yes.** Headline "Turn a messy itinerary into a shared day-by-day calendar — no
app, no login" + the two cards (Paste an itinerary / Start from a blank calendar) told me the
whole job in ~10s. "Anyone with the link can view and edit ... No account or email required"
nailed my exact need: one link, everyone edits.

**2. VALUE: Yes — I'd use it for the cabin.** Today I half-maintain this in a Google Doc
nobody reads + a group text. Paste→preview ("12 events across 2 days will be added, edit
before confirming", times editable)→confirm→clean day grid is genuinely less work. Each event
card shows "Added by you" attribution and per-event "Add to Google Calendar" + whole-trip
".ics" export, so each friend can drop their own arrival in and pull it into the calendar they
live in. Copy invite link copied the real /t/ URL (button flipped to "Copied!").

**3. ADVOCACY: 8.** I'd send it to my cabin group chat this week. Held back from 9 by design
nits below, NOT trust — every destructive path is well-guarded.

**Biggest blocker:** Labeling hierarchy of the destructive action is backwards. On the
Recent-trips rows the harmless "Remove from my list" gets full text, while the
nuke-for-everyone action is a tiny unlabeled red trash icon sitting right next to the pencil.
The most dangerous control is the least labeled — a non-designer friend would reflexively hit
the trash thinking "hide this." (Saved only because it DOES fire the "Delete this trip for
everyone with the link? This can't be undone" confirm.)

**Management-feature notes:**
- Local-vs-shared distinction IS clear and I trust it: header reads "Recent trips on this
  device"; "Remove from my list" tooltip = "device-only; trip stays on the server"; trash
  tooltip = "Delete for everyone with the link." BOTH the list trash and the trip-page header
  "Delete trip" fire the same strong red confirm modal (Delete + Cancel). I tested Cancel on
  both — nothing got nuked.
- Inline rename via pencil works (Enter saves, list updated to my new name). Trip-page header
  title pencil + "..." menu (Rename trip / Delete trip) also work. "Create New" home button +
  paste/blank both created distinct /t/ trips; share link strips the ?blank= param.
- Designer gripes: (a) icon-only rename/delete on rows need text labels or clearer affordance,
  per the blocker above; (b) every event renders one flat pink — for 4 people arriving at
  different times I want per-person color coding; that single feature would make this beat my
  doc cold.

```json
{"tester": 8, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Destructive 'Delete for everyone' is an unlabeled red trash icon next to the harmless pencil — labeling hierarchy backwards (mitigated by confirm modal)", "No per-person color coding; all events one flat pink, weak for tracking who arrives when"], "priorConcernsAddressed": "n/a"}
```
