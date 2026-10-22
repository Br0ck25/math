# Buddymon against Pokémon Gold: a whole-game review

Method: Gold's systems from pret/pokegold and Bulbapedia (as read earlier in this project; not played side by side), compared with this repo's code and tests. "Match" means the rule or content is in and tested; "Close" means the idea is there with our own numbers; "Missing" means nothing exists. Only the audit in `gold-audit.md` lists what is done in detail; this file ranks what is left.

## Where we match or are close
- **Battle core:** turn order by priority and Speed, Gen II damage order, crits 17/256, STAB, type chart (six types), luck 217-255, stat stages, six statuses, accuracy, PP and Struggle, catch formula with shakes, flee formula, experience and cubic growth, forget-a-move, TMs, friendship evolution, stone and trade evolution, genders, shiny, held berry/Leftovers/Quick Claw/Scope Lens, badge boosts, disobedience.
- **Party and storage:** six buddies, lead goes first, PC box, Day Care and eggs, vitamins, PP Up, special nets (Level, Fast, Lure, Friend) and Apricorns.
- **World structure:** sixteen towns and routes in story order, eight gyms then Elite Four and Champion, a second journey and a final master, badge-gated roads, charm gates standing in for HMs, ledges, forced grass, ponds with bridges, Cut-like shortcuts, houses, Centers, Marts that grow with badges, a Town Map earned from a guide, a Radio Card earned from a quiz, a Bicycle, an Itemfinder, daily berries and Apricorns, time of day, phone rematches, Catching Contest, Safari Zone, Game Corner, Battle Tower, Radio Tower takeover, Lighthouse quest.
- **Economy:** only trainers pay, prize = class base x level, Mart buy/sell at half, blackout halves money, prices from Gold.

## Differences we keep on purpose
Math answers drive every attack; six types not seventeen; no DVs or stat experience (fixed per-species builds); gems for money; one of each buddy; maps are 14 or 16 wide screens joined by warps (edges show the next map) rather than Gold's seamless connected blocks.

## Missing, ranked by how much a Gold player would notice
1. **(Done: two-floor dark caves on most routes; Whirl-Islands-style big dungeons are not.) Caves and dungeons.** Gold's world is half caves and towers (Union Cave, Ruins of Alph, Ilex Forest, Dark Cave, Whirl Islands, Mt. Mortar, Ice Path, Tin Tower, Victory Road). We have side nooks only; no multi-floor cave, no darkness (Flash), no ladders between floors in the wild. **Next best step:** a cave generator on the block system (a 2-3 floor dungeon off a route, dark, with its own wild table and a prize).
2. **(Partly done: one stone crossing per pond with the Water Steps charm; Strength boulders in the caves, and a Whirlpool Charm (Skyreach badge) for the second journey nooks; a Falls Charm (Coral Reach badge) for Waterfall.) Terrain HMs beyond Cut:** Surf (crossing water), Strength (boulders), Whirlpool, Waterfall. Our water is for fishing and bridges only, and the charms only open optional nooks. **Step:** a Surf charm that lets the hero cross a marked stretch of water to a second shore.
3. **(Partly done: weather, Protect, Rest and Solar Beam as a charge move; Fly and Dig done, as Game Corner TMs.) Move depth.** No weather (Rain Dance, Sunny Day), no two-turn moves (Fly, Dig, Solar Beam, Skull Bash), no trapping, Protect/Detect/Endure, Counter, Rest/Sleep Talk, Hidden Power, Leech Seed, Mean Look, Perish Song, Thief. Moves are one Normal and four tiers per type plus six stat moves. **Step:** a dozen signature utility moves as TMs (weather, a charge move, Protect, Rest).
4. **(Partly done: Focus Band, Lucky Egg, Amulet Coin, Smoke Ball.) Held items.** Gold has about 40 with battle effects (type boosters, Focus Band, King's Rock, Lucky Egg, Exp. Share, Everstone); we have five. **Step:** the type-power items and Exp. Share/Lucky Egg/Everstone.
5. **(Partly done: three weekday visitors and the Lucky Number.) Calendar events.** Gold's weekday and clock events (Tuscany of Tuesday, Buena's password, the daily Lucky Number, Bug Contest days, roaming swarms by day). We only have a daily Contest cap and daily bushes. **Step:** three weekday visitors and a daily Lucky Number at the Radio Tower.
6. **(Done: three roamers and a sleeping buddy in each cave, woken by a Radio Card tune.) Roaming trio and set-piece encounters.** One roaming legend (Gold has three, plus Red Gyarados at the Lake of Rage, Sudowoodo blocking a road, Snorlax-style sleepers, the Slowpoke Well). **Step:** a sleeping blocker on a route that a story item wakes, and two more roamers.
7. **(Partly done: Mom's savings and Dex "Found on" areas.) Pokégear and menus.** Pokérus done (rare after a wild win, double Exp. for four days). Friend calls with daily gifts and Prof. Pi's Dex rating are done. Still no Mystery Gift. The Menu now has a Trainer Card and Save as Gold's start menu does.
8. **Mini-games:** (Card Flip done) one slot machine and Card Flip; Ruin signs (four questions, an Evolution Stone) in every fourth cave stand in for the Unown puzzle, a second Tower mode (the 14-trainer Marathon) is done, a second Safari mode (the Night Walk) is done.
9. **(Partly done: a gym riddle lets you skip the first trainer; fire gyms are under sun and water gyms in rain.) Trainer and gym feel.** Gold gyms have puzzles (switches, ice, mazes, tracks); ours are a chain of trainers then a leader. Trainers have no classes with distinct teams beyond our hand-written ones, and no double battles (Gold II has none either).
10. **Sound and animation.** (Per-area music done.) battle wipes and cries done; attack effects are typed CSS only.
11. **(Partly done: orchard, paddock and boulder stamps.) Town shape.** Towns are still one family of plan (Center, Mart, house, gym in slots); Gold towns differ more, and its connected maps scroll with no screen change.

## Suggested next three
1. A cave generator with a Flash-style dark floor (item 1).
2. A Surf charm and a water crossing (item 2).
3. A set of utility moves: weather, a charge move, Protect and Rest (item 3).

## Second pass (after the items above)
Checked by searching the code for each feature; "not found" means no match in `src/client/js`.
1. **(Partly done: Thunder Wave, Sleep Powder, Toxic, Confuse Ray, Leech Seed and Headbutt flinch, as Game Corner TMs; foes do not use them yet.) Move variety is now the biggest battle gap.** Moves are one Normal line, four tiers per type, six stat moves and about a dozen TMs. Not found: status-only moves (Thunder Wave, Sleep Powder, Toxic, Confuse Ray), flinch, Leech Seed, Counter, Thief, Mean Look, Hidden Power, Perish Song, Curse, Encore, Spikes, OHKO moves. **Step:** a dozen of these as TMs and learnset slots, with the effects in `abHit`/`abUtil`.
2. **Held items (partly done):** eleven now: the eight before, the Type Charm (own-type +10%, which stands in for Charcoal and the rest), King's Rock, Bright Powder and Exp. Share. Not found: Everstone and the many niche items.
3. **Surf as real travel.** Water is for fishing, bridges and one stone crossing per pond; there is no sea to cross, so no route that is only reachable by water (Gold's Routes 19 to 21, Cianwood, Whirl Islands).
4. **(Done: Name Rater Odette in Mystic Peak gives the lead a nickname from a fixed list, shown in battle.) Nicknames and the Name Rater.**
5. **Gym mechanics beyond the riddle and sky** (switches, ice, mazes) and a different team style per trainer class.
6. **Set pieces:** Red Gyarados at the Lake of Rage, the Slowpoke Well, Ho-Oh and Lugia quests. Not found as such; roaming legends and the sleepers stand in for some.
7. **Still deliberately out:** Mystery Gift and linking (no sharing between players), seamless scrolling maps and wider towns (too many hard-coded edges).
