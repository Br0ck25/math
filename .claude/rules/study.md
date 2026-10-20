---
paths:
  - "src/client/js/37*.js"
  - "src/client/js/38-study.js"
  - "src/shared/study.js"
---
## Study (trivia mode)
- The banks are in `37-study-data.js` and the `37a`-`37h` files; `38-study.js` picks questions (`studyMcq`, `studyChoices`, `studyBuiltin`). While trivia mode is on (`studyOn`, switched in Settings by `toggleStudy()`), `makeMcq()` returns a study question in the same shape, so Adventure battles, signs, tournaments and duels all ask school-subject questions.
- There is no Study screen, no flashcards and no parent-added questions any more. Question ids look like `[a-z]{3,7}[0-9]{1,4}` (`STUDY_ID_RE`); a new bank file needs a row in `scripts/test-changed.mjs` only if it has its own test.
