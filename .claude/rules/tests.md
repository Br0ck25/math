---
paths:
  - "tests/**"
---

## Tests
- `tests/helpers.mjs` has `openGame` (browser wired to the built Worker with real headers), `signUp`, `fakeKV`, `call`.
  `openGame(..., { fast: true })` makes timers 20x shorter. Use `serviceWorkers: 'block'` (already set) because the page is served through test routes.
- Add the failing case first when fixing a bug. Prefer asserting behaviour (state, text, API results) over pixel positions.
- Math generators are covered by `tests/generators.test.mjs`. A new math type must pass it unchanged.


- Timers scaled by `fast` mean `setTimeout`-based waits in tests need generous multipliers. `tests/guards.test.mjs` holds guards for old mistakes (deleted functions, duel notification kinds, service worker in tests); add to it rather than to CLAUDE.md.
- Chrome hides iPhone canvas bugs: draw every canvas emoji with `fillEmoji()` (`tests/cards.test.mjs` enforces it); a green desktop run is not proof for iOS.
