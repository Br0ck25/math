# Math Quest against Pokémon Gold: what matches, what differs, what is missing

Last checked after the money, items and Wardrobe changes. "Gold" facts come from Bulbapedia and the pret/pokegold sources; where a number is ours it says so.

## Matches
- **People and screens:** the first buddy starts at level 5; you from behind and the trainer are shown before a fight; every buddy is male or female (shown next to the level; legends and the ultra trio have none) and a Day Care egg needs a male and a female of one type; routes run left and right too, through side paths (alternating east and west).
- **Party and lead:** six buddies, the lead goes first, a PC box for the rest (Team window), resting buddies cannot lead.
- **Battle:** turn order by Speed and priority, Gen II damage order, critical hits 17/256, STAB, type chart, luck 217-255, PP, Struggle, accuracy, stat stages, statuses (burn, poison, paralysis, sleep, freeze, confusion), catch formula with shakes, Quick Claw, Scope Lens, held berry and Leftovers, experience formula, level growth (cubic), forget-a-move prompt, Move Tutor, run chance that grows with Speed and tries, blackout loses half the money.
- **Money:** only trainers pay; Marts buy items back at half price; math signs are practice and pay nothing. Prize = class base x level of the last buddy (ordinary trainers 16, leaders, Elite Four, Champion and Master 100). Wild buddies, level-ups, badges and story beats pay nothing.
- **World:** towns, routes, caves-as-nooks, gyms (trainers then leader), eight badges, charms standing in for HM gates, Elite Four then Champion, a second journey with eight more gyms and a final master, Buddy Centers that heal for free, Marts with stock that grows with badges, Day Care with eggs, trade NPCs, a trade evolution, roaming legend, shiny buddies, time of day, shake trees, fishing rods (Old, Good, Super), Repel, Gizmo (map, clock, calls, tips), Dex with seen and caught, rival fights.
- **Moves:** every kind has its own learnset (two moves at the start, about ten by level 50, a new one every 6 to 8 levels), six stat moves with Gold's stages, and TMs: each gym leader gives one and a Move Tutor teaches it (an element TM only to buddies of that type).
- **Wild tables:** every route and side path has its own hand-written five kinds with set odds (30, 30, 20, 15, 5), a level range around the route's level that rises route by route, and morning, day and night variants.
- **Friendship and obedience:** wins, levels and walks raise a buddy's friendship (a faint lowers it) and four kinds evolve when it is high; a buddy from a Trader disobeys above the level its badges allow (10 plus 10 a badge); eggs can pass a parent's TM move.
- **Winding routes and Town Map:** every route has tree walls across the road with gaps that alternate sides, so the way north runs up, left, up, right, through the grass; the Gizmo map is a Town Map with a red dot for you and tap-to-travel squares.
- **Water and dirt:** routes have bare dirt gaps in the tree walls and a pond with a wooden bridge to an islet where a swimmer waits (water can be fished). The maps are our own hand-built tile rows, not Gold's: only mechanics were checked against pret/pokegold, so Gold's real layouts (Surf-only shores, many parallel paths) are still not copied.
- **Ledges and thick edges:** most routes have a ledge you can hop down over but not climb, and a second row of trees along both edges.
- **Route land:** big tall-grass fields, a house with a room on most routes, and a Trim-charm shortcut through the tree walls (a second way past the zigzag). The Town Map is not given at the start: Guide Ivy in Meadow Town hands over the Map Card, as the old man in Cherrygrove does. See `docs/gold-research.md` for how Gold builds its world.
- **Block routes:** every route is laid out from 2x2 blocks (`24vb-ow-blocks.js`): a road that winds up, left, up, right, a tall-grass band across the whole road, tall-grass fields, thick tree edges, a ledge, a pond with a bridge to an islet and a swimmer, a house with a room, a thick wood with the nook cut into it, and a Trim-charm lane that cuts straight through a bend. The route's own file still lists the people and finds; the generator stands them on the new land (trainers look at the road from a clear row).
- **Town blocks:** every town is laid out by `24vc-ow-towns.js`: the main road up the middle, a cross street, and the Buddy Center, Mart, house and gym in four of six slots (each with a path from its door to the road), a pond, garden, grove or plaza in the other two, a wood with the nook cut in, and the people, signs and finds stood on the new land. Towns still share one 16x16 size and the edge gaps at rows 4-8 that the side games cut into.
- **Radio Card:** the Gizmo radio (Tips) is not tuned at the start; a five-question quiz at the Radio Tower counter in Spark City (once the first-floor guard is beaten) wins the Radio Card, as in Gold.
- **Vitamins and berry bushes:** HP Up, Protein, Iron, Carbos and Calcium (Mart, 5 badges) raise one stat of one buddy for good, up to ten of each (Stats tab); the berry bush on each route grows back every day.
- **Special nets, Bicycle, Itemfinder:** the Level Net (x2/x4/x8 by level), Fast Net (x4 on faster foes), Lure Net (x3 on fished ones) and Friend Net (a caught buddy starts as a good friend) are sold from 3-4 badges; Cyclist Ray in Volt Valley gives the Bicycle (faster hold-to-walk) and Dowser Fen in Ember Hills the Itemfinder, which shows a hidden find on every route within three tiles.
- **Rooms:** the house, Buddy Center and Mart rooms are 12 x 10 (pink floor in the Center, wood in houses, a patterned rug; the Radio Tower floors, hideouts, Game Corner and Safari Gate too) with a bed, table, plants, a healing machine, a PC and shelves, and black around them as in Gold; the second trainer on a route watches the grass, so the road can be passed without a battle (the first one watches the road, as Gold's do).
- **Apricorns, Kurt and Max Revive:** an Apricorn tree on every route grows back daily; Kurt in Leaf Grove's house turns two Apricorns into a Level, Fast, Lure or Friend Net; the Max Revive is a Game Corner prize. Towns are 16, 18 or 20 tall.
- **Seamless edges:** past the top or bottom of a route the map shows the next town in its own colours, lined up with where the edge warp lands, with that map's people and finds. The towns are still hand-written rows joined by warps, not Gold's blocks with connections.
- **Forced grass:** every route has a band of tall grass across the whole road, so there is no way past without stepping on it (Repel helps).
- **Items:** Ether, PP Up (up to three times a move) and Escape Rope are in.
- **Side games:** the Catching Contest, a Game Corner with slots and prizes in Spark City, the Safari Zone in Thistle Wood (balls, bait, rocks, no fighting) and the Battle Tower in the Summit Citadel (seven trainers, a PP Up a day).
- **Phone calls:** a trainer you beat calls through the Gizmo once a day for a rematch, back on the map and stronger.
- **Set pieces:** the Radio Tower takeover in Spark City (three floors, Boss Static), the Lighthouse quest, the Scramblers' plots and Master Ori on Silver Peak.
- **Side game and quest:** the Catching Contest and the Lighthouse fetch quest.
- **Evolution and stats:** the Link Trader's trade evolutions, Evolution Stones (a stone kind takes its first evolution at once) and Gold's badge boost (each of the first eight badges raises one stat by an eighth).
- **Items:** Potion, Super Potion, Full Heal, Revive, Catch Net (a Poke Ball), Hyper Potion (200 HP), Max Potion, Full Restore, the five status cures, Great Net (x1.5), Ultra Net (x2), Repel, Max Repel, Elixir (10 PP back), X Attack, X Defend and X Speed, Evolution Stone, bag limit 99; held items; potions found on the ground.

## Differs on purpose
- **Math:** every attack needs a right answer; a wrong answer is a miss. This is the game.
- **Six types, not seventeen.** Moves are one Normal and four tiers per type.
- **One of each buddy** (a duplicate becomes a spare for trades) instead of many of the same species.
- **Currency is called gems.**
- **Stats:** a fixed build per kind (hand-tuned for about 40), no hidden DVs, no stat experience.

## Still missing
0. **From the pret/pokegold item list:** nothing from the pret item list that a mart sells (Max Revive is a Game Corner prize, as in Gold).
1. **Wild lists and teams written for every place:** all sixteen routes now have hand-written wild tables, and every route and side-path trainer and every gym trainer has a hand-written team. Gym leaders are fixed per land but drawn from the boss list, and learnsets are generated per kind.
2. **More side games:** only one game of each kind exists (one slot machine, one Safari field, one Tower mode).
3. **Seventeen types and the abilities of later games** are outside Gold anyway.
