---
paths:
  - "src/client/js/12*.js"
  - "src/client/js/13*.js"
  - "src/client/js/24*.js"
  - "src/client/js/25*.js"
  - "src/client/js/14-items.js"
  - "tests/wild.test.mjs"
  - "tests/moves.test.mjs"
  - "tests/map.test.mjs"
  - "tests/champion.test.mjs"
  - "tests/legend.test.mjs"
  - "tests/held.test.mjs"
---

## Battles: wild buddies and bosses
- Most battles are against a wild buddy (`13b-wild.js`, numbers in `ECON.wild` / `ECON.sell`); a boss comes after every 5-8 of them. `state.wild.id` is the wild buddy being fought, `''` means a boss. Only bosses count toward `monstersDefeated`, raids, the Alpha buddy rule and the golden vault.
- `getBossInfo()` returns the foe for both; check `.wild` before using boss-only data (`currentMonsterIndex`, weak point, `bossBook`). Pick the next foe with `pickNextFoe()`, never `pickNextBoss()` directly.
- A caught buddy you already own is a spare (`state.spares`); `sellSpare()` / `spareValue()` pay far less than the shop price. Only store and secret buddies appear wild (mythic, ultra and boss buddies keep their own ways).
- Fainted buddies revive only after a boss. Quests that count bosses (`boss`, `flawless`) ignore wild buddies. One free buddy swap per battle (`state.swapUsed`): every way of changing the fighter (team chips, Sanctuary equip, adopting, a caught buddy's Equip Now) must go through `useSwap()`. Only team members can fight (`getTeam()` always includes the fighter; `useSwap()` refuses outsiders; a new buddy joins only if `joinTeamIfRoom()`, otherwise the Sanctuary, adopting and Equip Now ask which team buddy it replaces with `openReplaceModal()`; resting buddies cannot be replaced). When the whole team has fainted everyone is revived. When the fighter faints and a team member can still fight, nothing is replaced automatically: answering waits until the player taps a teammate (`needsSwitch()`, `holdForSwitch()`; the forced switch is not the free swap). A boss with `minLevel` only appears for a strong enough buddy (`bossAvailable()`). Boss and wild attack both grow with level (`bossAtk()`, `wildStats()`).
- Tests start on a boss (`openGame` seeds a save); pass `wildStart: true` for the real start. A test that wins several bosses in a row must set `state.wild.id = ''` and `state.wild.since = 99` so a boss comes next.

## Journey systems (moves, status, roles, map)
- Moves take `ECON.moves.slots` slots per buddy (`equippedMoves()`, saved in `state.moveSet`); a new move marked `optional` is never in the default set. Champions can rematch gyms (`ECON.map.rematch`) and hunt the weekly legend (`24c-legend.js`, `ECON.legend`; `legendPets` are won only that way, a wild fight with `state.wild.legend`). Riley races you to each week's legend on a fixed day (`rileyDay()`); losing the race must stay free and kindly worded. Completing a Dex pack pays once (`ECON.dex`). Catching the golden daily rare sets `state.shinies`.
- Moves (`12c-moves.js`): correct answers charge energy (`ultimateCharge`, 0-3); the Moves sheet spends it. Buddies learn moves by level (`MOVES`). Status effects (`12d-status.js`) change scoring, never whether an answer is right; they are not saved. Roles and held items are in `25b-held.js` (roles come from the element).
- The Map (`24b-map.js`): regions unlock by best buddy level, gyms are trainer battles (never catchable, not counted toward the next boss) and a leader boss; each badge pays once. Use `showStoryModal()` for any story window.
- The Champion's Hall (`24d-champion.js`, `ECON.map.champion`): opens with the sixth badge. It is a gym run (`state.gym.champ`) against Champion Nova's six fixed buddies, one of each type, who may swap mid-fight (`championAfterHit`). Winning it the first time makes you Champion (`state.storySeen.champion`, which rematches and legend hunts need) and pays gems, nets, held items and three earned gear pieces (counter `champion`); later wins pay a little once a day.
- The Ranch (`25d-ranch.js`, `ECON.ranch`, `state.ranch`): buddies off the team work at a station and fill the barn with berries and ore (time away, capped at `capHours`, plus a little per correct answer through `ranchCheer()` in `answerBonuses`). `ranchWorkers()` is what really works (owned, not on the team, within `ranchSlots()`). Four stations (`RANCH_STATIONS`, a new one is a row plus a use for its goods): berries pay for snacks (`canPay` / `spend`), ore crafts Catch Nets, honey feeds Buddy XP, parts brew a Super Potion (`applyPotion`, shared with the shop), and the Nursery makes a normal egg. A Wildcard (shadow) buddy works every station at the matching speed. Goods never pay gems and never expire.
- Trails (`24e-trail.js`, `ECON.explore`, `state.trails`): every land has a daily Trail of five spots, each opened by one `makeMcq` question (a wrong answer only means try again). The layout comes from `dayHash(land + dayKey())`, so only progress is saved. The Stone gate needs one element on the team (`trailGate()`, `PARTNER_SKILLS`; a Wildcard buddy counts as any). Goods go to nets and the Ranch barn (`ranchGive`); gems only for finishing a Trail, the first `trailsPerDay` of a day. `weatherToday()` (same file, `ECON.weather`) picks sunny, rainy or stormy per day; it only shifts the wild-buddy mix in `rollWildSpecies()` and never makes anything harder.
- The Buddy Dex is the old Collection Book (`30-collection-book.js`, ids still `book-*`): `markDexSeen()` when a buddy is met. Catch Nets, the flawless bonus and the daily rare are in `ECON.wild` / `ECON.daily`.
- After a new battle system: new saved fields need defaults and a normalizer; run `npm run sim` (energy moves shorten battles: `HITS_PER_BOSS` in the sim).


