---
description: Add a buddy gear piece (bought or secret/earned)
argument-hint: <name, icon, slot, price or earn rule>
---
Add this gear piece: $ARGUMENTS

Steps (do not explore beyond these; read `.claude/rules/content.md` if it did not load):
1. Append ONE row at the end of `accessoriesList` in `src/client/js/04-data-buddies.js`, copying the shape of its neighbours: `{ id, name, icon, cost, slot, renderIcon }`. `slot` is one of head, face, neck, back, side, aura. Never add CSS or pixel offsets. Never reorder or rename ids.
2. A secret piece instead has `cost: 0` and `earn: { key, n, text }` (a counter that `checkEarnedGear()` in `08c-earned-gear.js` already tracks; reuse an existing `key`).
3. Raise the gear count (`gear: N`, and the title) in `tests/content.test.mjs` by the number you added.
4. If you set a price, run `npm run sim` and check the economy tests still pass.
5. Run `npm run test:quick`, then commit with the rebuilt `worker.js`.
