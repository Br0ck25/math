---
description: Add a boss monster (also becomes a boss buddy automatically)
argument-hint: <name, emoji, element, baseHp, taunts>
---
Add this boss: $ARGUMENTS

Steps (read `.claude/rules/content.md` and `battles.md` if they did not load):
1. Append ONE row at the END of `monstersList` in `src/client/js/02-data-core.js`: `{ name, icon, baseHp, element, taunts: [two taunts] }`, beside the others of its element comment. Saves use list position, so never insert or reorder. It must be an animal, creature or monster.
2. Nothing else is needed: its boss buddy (`boss_<position>`) is generated. If it shares an emoji with another buddy or boss, give it its own picture via `scripts/art/specs.mjs` and `node scripts/make-art.mjs`.
3. Raise `bosses` and `buddies` in `tests/content.test.mjs`.
4. Run `npm run test:quick`, then commit with the rebuilt `worker.js`.
