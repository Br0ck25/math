---
description: Add a secret or store buddy (animal, creature or show character)
argument-hint: <name, emoji, element, super move, show if any>
---
Add this buddy: $ARGUMENTS

Steps (read `.claude/rules/content.md` if it did not load):
1. Secret buddy: append ONE row to the END of `secretSpecies` in `src/client/js/04a-data-secret-buddies.js`: `{ name, icon, elem, superMove }` (+ `show` for a cartoon character). The id (`secret_N`) comes from its position, so never insert or reorder. Store buddy: add to `storePets` in `04-data-buddies.js` in price order (Bandit stays last).
2. It must be an animal, creature or monster (people only for real show/storybook characters), and must look different from every other buddy: if its emoji is already used, add a row to `scripts/art/specs.mjs` with a species no other buddy uses, then run `node scripts/make-art.mjs`. Never draw licensed characters.
3. Pack: add its emoji or id to the right pack in `04b-packs.js` if `tests/packs.test.mjs` fails.
4. Raise the counts (buddies, and secret or store) in `tests/content.test.mjs`.
5. A new show: say so in your reply (licensing is the owner's call). Kid-friendly shows only.
6. Run `npm run test:quick`, then commit with the rebuilt `worker.js`.
