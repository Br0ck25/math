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
9. **(Done: every gym is a room to walk through, in three layouts (one math switch, two switches, three trainer lanes), with fire gyms under sun and water gyms in rain; trainer classes fight in their own style.) Trainer and gym feel.** Gold gyms have puzzles (switches, ice, mazes, tracks); ours are a chain of trainers then a leader. Trainers have no classes with distinct teams beyond our hand-written ones, and no double battles (Gold II has none either).
10. **Sound and animation.** (Per-area music done.) battle wipes and cries done; attack effects are typed CSS only.
11. **(Partly done: orchard, paddock and boulder stamps.) Town shape.** Towns are still one family of plan (Center, Mart, house, gym in slots); Gold towns differ more, and its connected maps scroll with no screen change.

## Suggested next three
1. A cave generator with a Flash-style dark floor (item 1).
2. A Surf charm and a water crossing (item 2).
3. A set of utility moves: weather, a charge move, Protect and Rest (item 3).

## Second pass (after the items above)
Checked by searching the code for each feature; "not found" means no match in `src/client/js`.
1. **(Partly done: Thunder Wave, Sleep Powder, Toxic, Confuse Ray, Leech Seed and Headbutt flinch, Counter and Hidden Power, as Game Corner TMs; trainers' buddies of level 15 and up use the status ones; no Thief, Mean Look or Perish Song.) Move variety is now the biggest battle gap.** Moves are one Normal line, four tiers per type, six stat moves and about a dozen TMs. Not found: status-only moves (Thunder Wave, Sleep Powder, Toxic, Confuse Ray), flinch, Leech Seed, Counter, Thief, Mean Look, Hidden Power, Perish Song, Curse, Encore, Spikes, OHKO moves. **Step:** a dozen of these as TMs and learnset slots, with the effects in `abHit`/`abUtil`.
2. **Held items (partly done):** eleven now: the eight before, the Type Charm (own-type +10%, which stands in for Charcoal and the rest), King's Rock, Bright Powder and Exp. Share. Not found: Everstone and the many niche items.
3. **(Partly done: with the Water Steps charm the hero rides over any water, and water buddies bite; an Open Sea map behind Captain Wade's dock door has four islets that only a surfer reaches.) Surf as real travel.** Water is for fishing, bridges and one stone crossing per pond; there is no sea to cross, so no route that is only reachable by water (Gold's Routes 19 to 21, Cianwood, Whirl Islands).
4. **(Done: Name Rater Odette in Mystic Peak gives the lead a nickname from a fixed list, shown in battle.) Nicknames and the Name Rater.**
5. **Gym mechanics beyond the riddle and sky** (switches, ice, mazes) and a different team style per trainer class.
6. **Set pieces:** Red Gyarados at the Lake of Rage, the Slowpoke Well, Ho-Oh and Lugia quests. Not found as such; roaming legends and the sleepers stand in for some.
7. **Still deliberately out:** Mystery Gift and linking (no sharing between players), seamless scrolling maps and wider towns (too many hard-coded edges).

## Economy check (against Gold)
- **Prices:** every Mart item's price matches Gold's (Potion 300 up to Full Restore 3000, Revive 1500, status heals 100 to 600, Poké Ball 200 / Great 600 / Ultra 1200, Repel 350 / Max 700, vitamins 9800, Ether 1200, X items 350 to 550). A test lists them. Items sell for half.
- **Earning:** only trainers pay (class base x the level of the last buddy: 16, or 100 for leaders, the Elite Four, the Champion and the Master), plus Mom's savings, selling items and the Game Corner (50 coins for 1000 gems, slots paying back about nine tenths). The Dex gem milestones were removed because Gold pays no money for the Dex; Prof. Pi's rating gives items instead. Online duel stakes are the only other gem flow and are between players.

Also done since the second pass: Everstone (the holder keeps the form it had when given the stone), trainer classes (Hiker tougher, Swimmer and Pilot quicker, Sailor stronger hits, Ace a little better at everything, Bug Catcher frail but fast), Smokescreen and every other stat move now have a picture, and a second open sea off Coral Reach.

## Third pass (after playing the map on a phone)
Done in this pass: Game Boy style touch controls (see-through arrows bottom left, A and B bottom right), the map now shows about ten tiles across a phone as Gold does (it was seven), a side path's gap shows the side path past it (a sliding step animation was tried and removed: it made walking look glitchy), and the ground has details (worn road edges, bright pond shores, flowers, tufts and stones).
Still missing, in the order a Gold player would notice:
1. **(Done: two strollers per town wander near home, talk differently after dark and say a proud word with three badges and as Champion.) People who move.**
2. **(Done: the Center and gym are five wide, the Mart four, houses two or three; the gym is a row taller in a top slot; each has its own roof; houses have windows, chimneys and a mailbox; buildings sit anywhere along their slot.) Building variety.** **Step:** per-building art (windows, awnings, a chimney, a fountain for the Center), and bigger special buildings (the Radio Tower, the gym) that stand out.
3. **(Partly done: three lamp posts per town; fences and flower beds come from the town stamps.) Town life.** Mailboxes beside houses and five or six villagers per town are done, so towns now have seven to nine people in all. **Step:** more stamps and more NPC lines per town.
4. **(Done: ponds shimmer, and rain falls on the map on rainy and stormy days, outdoors only; snow falls in the cold lands Mystic Peak, the Cross and the Summit.) Water and weather in the picture.**
5. **(Done: the buddy hops behind a step, and a tap on the D-pad toward a new direction only turns the hero on the spot, holding walks.) Walking frames.**
6. **(Partly done: every town, route and cave plays its own transposed, rotated and re-timed take on the tune of its kind.) Per-place music.** Gold has composed themes.
7. **Still deliberately out:** Mystery Gift and linking.

Also added in this pass: Settings > Options > "Questions" turns fight questions and puzzle-sign questions off for a game with no maths (duels between players still ask).

Route fills: each route has a theme (wood, rocky pass, flower meadow, open country, stony flat) and eight road plans, so routes differ in what lines the road as well as in bends (`24vb-ow-blocks.js`).

Town layouts: every town now has its own hand-picked plan (`24vbz-ow-town-plans.js`), as Gold's towns are each drawn by hand: a village green with a pond (Meadow), terraces with a ledge (Ember, Summit with a frozen pond), a harbour with a quay and bridge (Tide), a lagoon with a pier (Coral), a wood (Grove, Thistle's park), a grid of three avenues (Volt), a marsh of ponds (Gloom), a staircase of stepped columns (Mystic), a plaza with fountains (Skyreach), a river with a bridge (Cinder), two avenues with a market strip (Spark), a lake with a ring path (Dusk), a diamond garden (Prism) and a crossroads of diagonal paths (Cross). Mirroring, building order and sizes differ too, and towns are 18 to 22 tall. The slot layout stays as the fall-back. Towns are still 16 wide with their edge gaps where the side games expect them.

## Fourth pass (after the Gizmo map, town and route layouts)
Done since the third pass: every town has its own plan, routes are filled as a wood, rocky pass, flower meadow, open country or stony flat, and the Gizmo Town Map now has a coast, a river the roads bridge, lakes, woods, hills and mountains under the towns (as Gold's Pokégear map has sea and land).
Present and close to Gold (found by searching the code): Pokégear-style Gizmo with map, clock, calls (phone) and tips, radio, Apricorn-style balls and Kurt, Day Care and eggs, Move Deleter and Tutor, bicycle, fishing rods, shake trees, Safari Zone, Bug-Catching-style contest, Itemfinder, Repel, Escape Rope, Rock Smash, Fly, a second journey and Silver Peak.
Still different, in the order a Gold player would notice:
1. **A real second region.** Gold sends you to Kanto with eight more gyms; ours is "Beyond the Peak", built from the same engine, with its own towns and gyms but no old-region revisit.
2. **Berry trees you plant and water**, and Sweet Scent. Not found; shake trees and finds stand in.
3. **Set pieces:** Red Gyarados at the Lake of Rage, the Slowpoke Well, the Radio Tower takeover (our Radio Tower is a visit), Ho-Oh and Lugia quests, the Magnet Train. Roaming legends and sleepers stand in.
4. **Move variety:** no Thief, Mean Look, Perish Song, Baton Pass or Rain Dance style team play.
5. **Maps:** screen-by-screen routes with edge warps, not Gold's seamless scrolling, and every town 16 tiles wide.
6. **Music and sound:** each place has its own re-timed tune of its kind, but no composed themes or cries per species.
7. **The Pokédex area map** (where each buddy lives) is only a list of lands.
8. **Still deliberately out:** Mystery Gift, linking and trading between players, real-world clock events beyond day and night.

## Fifth pass (after comparing the Johto town map, trainer card and phone)
Done: the Gizmo Town Map now looks like Gold's (wave-pattern sea round the coast, brown mountain country, a river the roads bridge, lakes and woods, dark cave arches by each route that has a cave, second roads drawn between linked towns). The Trainer Card is Gold's: name, five-digit number, gems, play time and a case of all sixteen badges, dim until won. The Gizmo has a Phone tab: Mom, Prof. Pi, friends who gave you a key item and trainers you have beaten, each with a Call button.
Second roads (`24vr-ow-links.js`): the land is a web, not a single chain. Five link roads join towns by their east and west gaps (Meadow to Leaf Grove, Tide Bay to Coral Reach, Volt Valley to Gloom Marsh, Coral Reach to the Crossroads, Cinder Mesa to the Summit). Each is a wide winding road with grass, a pond, signs, two trainers and two finds, and opens only once both towns have been seen, so it is a shortcut and never a way past a gym.
Starting money: Gold gives 3000 on the card; we start with 0 gems because every price in the Marts matches Gold's and gems are earned from fights (Gold's Mom saves for you too). Left as is on purpose.
Still different: real second regions beside the first, more link roads (only five so far), and per-route hand-drawn maps. Gold's routes are hand-drawn to fit their places; ours are generated from blocks and themes.
