---
paths:
  - "src/client/styles.css"
  - "src/client/index.html"
  - "tests/layout.test.mjs"
  - "tests/windows.test.mjs"
  - "tests/ui.test.mjs"
  - "tests/contrast.test.mjs"
---

## UI rules
- The page runs full screen on iPhones (status bar overlaps it): keep the `env(safe-area-inset-*)` padding on `.game-container`, modal overlays and fixed banners. Test layouts at 375px with wider letters (iPhone text is wider than the test machine's), not just at 360px.
- Every window gets a sticky ✕ (top-right) automatically from `data-close` / `data-esc` (`addCloseButtons()`); never make people scroll to a bottom button to leave. Window height uses `dvh` so iPhone toolbars cannot hide the bottom.
- Phone first: must work at 320x568, 360x640 and 420x800 with no sideways scroll and the main arena visible without scrolling.
- Tap targets 44px minimum (the keypad may be 34px tall on very short screens). Every icon-only button needs `aria-label`.
- Respect reduced motion (`.reduce-motion`, `motionReduced()`); new animations are disabled by that class automatically, new canvas/particle effects must check it.
- Small text needs 4.5:1 contrast. Use the CSS variables in `:root`, not new one-off colours.
- Short iPhones (SE: 375x548 to 647) are the tightest case: decorative rows hide by height in `styles.css` so the equation and answer box never clip. Windows need `min-width:0` and must stay inside the screen with wide letters; `tests/windows.test.mjs` checks both.
- The answer area (`.arena`, `#equation-mount`) is a size container: the equation is sized from the room it has (`cqh`), and banner then feedback step aside when it is short. Add rows above it freely, but run `tests/layout.test.mjs` (worst case at six phone sizes). Battle team chips are `.swap-chip` (`.team-chip` is the tournament picker).
- Look at your change: screenshot at 360x640 and 420x800 before calling UI work done.


