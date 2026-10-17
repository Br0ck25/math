---
paths:
  - "src/client/js/03b-parent-controls.js"
  - "src/client/js/23-parent-report.js"
  - "src/client/js/35*.js"
  - "src/client/js/36-challenge.js"
  - "src/server/15-parents.js"
  - "src/server/16-challenges.js"
  - "tests/parent*.test.mjs"
  - "tests/challenge*.test.mjs"
---

## Parents (portal, settings, timed challenge)
- A parent has their own account at `/parent` (same page, `isPortal()`; the game never loads there, and `syncNow()` must never upload from it). No email, so no password recovery. Server: `15-parents.js`, `16-challenges.js`; client: `35-parent-portal.js` (child's "link a parent" section and the parent page), `03b-parent-controls.js`, `36-challenge.js`. Limits are in `ECON.parents`.
- Linking: the child's device (PIN-gated Parent Report) makes a one-time code; the parent types it. Every key has one writer (`grant:` child, `plinks:` parent, `ctl:`/`chall:` primary parent, `cprog:` child). The first linked parent is the primary and the only one who can change settings; settings and challenges count only while their writer is still the child's primary link.
- Parents get report numbers only (`kidSummary()`), never the save, the PIN hash or friend names. Reuse `reportParts()` for the report on both sides.
- Settings (`setControls`/`applyControls`): lowest grade band, allowed math types, duels, daily time goal, adaptive switch, and "extra practice" (`boost`: +10% steps of all problems for a weak type, applied in `typeShares()` via `applyBoost()`, never locks anything). A parent can watch up to `ECON.parents.maxKids` children, each with their own settings. Every new way to change grade, math types or duels must respect `ctlFloor()`, `opsLocked()` (a parent's math-type list is used exactly by `getActiveOps()`, even above the player's grade; make problems at `opGrade(op)`, never below a type's own `minGrade`) and `duelsLocked()`; easier problems must never go below the floor. The server clamps the cloud save too.
- Timed challenge: the parent picks problems, minutes and gems per answer (1 by default; the prize is capped by `ECON.parents.challenge.maxGems`). The server owns the clock (starts at the child's Start tap) and accepts a claim only in time and not faster than `minSecPerProblem` per answer. The device adds the gems once per challenge id (`state.challengePaid`). Only correct practice answers count (`challengeCorrect()` in `checkAnswer`), never duels, tournaments or the vault. Running out of time costs nothing and is worded kindly.


