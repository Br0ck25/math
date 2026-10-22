# Making our land like Gold's: the plan

Sources used: the two maps you attached (the Johto region map with its lettered key, and the full-game map with interiors), our own code, and `docs/gold-review.md`.
vgmaps.de could not be opened from this session (Cloudflare blocks it with a "Just a moment" page for both a fetch and curl), so nothing below is read off the vgmaps page itself. The attached images carry the same information at the level we need. For exact layouts, the better source is the pret/pokegold disassembly (map blocks, connections and warps), which we already used for battle numbers.

## 1. How Gold's land is built (from your two maps)
- **A web, not a chain.** Johto's key has 43 lettered places. Towns have 2 to 4 exits, and several routes run between the same two places (29/30/31 to Violet, 32 and the Ruins, 45/46 looping back to the start). Goldenrod is a four-way hub. The player can reach most places in more than one order, and the gates are gyms, a fog, a tree or water, not walls of trees.
- **Landmarks sit on routes.** Union Cave, Ilex Forest, Dark Cave, Ice Path, Mt. Mortar, the Whirl Islands, the Lake of Rage, Tin and Burned Tower, the Ruins of Alph, the National Park. Each is a place with its own shape and rule, not an ordinary road.
- **Each route has one trick.** Route 29 has ledges and a time-of-day tree, 30/31 a berry house and Headbutt, 32 the Pokémon Center camp and a long grass strip, 34 the Day Care, 35/36 the Sudowoodo tree, 40/41 swimming, 43 the toll gate, 45 a ledge run, 46 a short hop. Ours differ only by theme and layout.
- **Interiors are much larger than ours.** The full-game map shows the Goldenrod Dept. Store and Underground, the Radio Tower, Sprout and Tin Towers (many floors), the Bell Tower, Whirl Islands, Union Cave and Dark Cave (big mazes), and each gym as its own puzzle room.
- **Kanto is a second whole map**, joined by Route 26/27/28 and Mt. Silver at the end.

## 2. What we have now
- 16 gym lands in one chain (Cozy Hollow, then Meadow to Summit), each with a generated route, a town built from a hand-picked plan, Center, Mart, house and a walkable gym.
- 5 link roads between towns, 2 sides of each route as side paths, 6 caves with 2 floors, the Park, Lighthouse, Safari, Radio Tower, Battle Tower, Game Corner, Open Seas, and a second journey beyond the Peak.
- A Gizmo map with a coast, mountains, river, lakes, cave arches and link roads, a Trainer Card, and a phone.
- Start money is now 3000 gems, as on Gold's Trainer Card.

## 3. The gaps, biggest first
1. **Not a web yet.** Five links join eight towns; the rest of the 17 places still have one road in and one out.
2. **No hub city.** Every town is the same size (16 wide, 18 to 22 tall). Gold has a few big cities (Goldenrod, Olivine, Ecruteak) and many tiny villages (New Bark, Cherrygrove, Mahogany).
3. **Routes are all the same shape (a 14 by 24 strip).** Gold's are long, wide or branching, and some are cave-like or water-filled.
4. **Landmarks are missing or thin:** a forest maze (Ilex), a big tower to climb (Sprout/Tin), Union Cave style multi-floor caves with an exit on another route, the Ruins puzzle, the Whirl Islands, Lake of Rage, Ice Path with sliding ice, a dark cave you need Flash for.
5. **Interiors are small.** A Mart, Center, house and gym only; no Dept. Store with floors, no Underground, no multi-floor tower, gyms have one layout idea each.
6. **No Kanto-sized second region.** "Beyond the Peak" is a copy of the engine, not a different map.
7. **The Town Map is a diagram.** Gold's map is the land itself, with lettered places (in your key) and the player's face. We have nodes and arches.

## 4. The plan, in the order I would do it
Each step ships on its own, with tests and a green full suite.

**Step 1: widen the web (small, safe).**
Add link roads until every town has 2 to 4 exits (target: 12 links, 3 to 4 exits for the middle towns). Give links a type (cave link through a mountain, water link by boat or bridge, road link) so a link can be a cave floor or a Surf route and not always a winding road. Put the gates on the links, not the main road. Update the Gizmo drawing from the graph, not a hand list.

**Step 2: make towns different sizes.**
Allow towns to be 12 to 28 wide and 14 to 30 tall (the engine already handles variable map sizes; side games and the park prove it). Add "village" (12 by 14, one house, Center only), "city" (24 by 26, two districts) and one "hub city" (30 by 30, Goldenrod-like: a Dept. Store, a Game Corner, a Radio Tower, a Bike shop, and four exits). Edge gaps then come from the town's own exits, not fixed rows.

**Step 3: landmark routes (hand-drawn, not generated).**
Write 8 to 10 routes by hand in a new `24vs-` file, each its own shape and trick, using the lettered Johto map as the brief:
- Ilex-style forest maze (a cut tree and a shrine), a National Park-like walled park with a bug contest, a Sudowoodo-style blocking tree on a route, an Ice Path with sliding ice, a Lake of Rage-like lake with a boat, a dark cave that needs the Night Lamp, a Union Cave that connects two routes.
Everything else stays generated, but gets 3 to 4 more themes and variable length (24 to 40 tall).

**Step 4: real interiors.**
- A Dept. Store with 5 floors (each floor sells a different group; a rooftop with a vending machine and a Tag buyer).
- One multi-floor tower (a Sprout Tower with a pole in the middle and sages) and a Bell/Tin Tower style climb.
- Gyms: give each of the 16 a distinct puzzle (trainers in a maze, spinner tiles, ice, water switches, invisible walls, a rotating wall) as Gold does, using the existing `map.doors` and switch support.
- Houses with a few specific people (a Move Deleter, a Berry grower, a Name Rater, a Kimono-girl-style trial).

**Step 5: a second region as a different map.**
Kanto's shape in Gold is a vertical hub with a loop. Make "Beyond the Peak" a different town graph (a ring with a central city) rather than the same lattice, and add Mt. Silver at the end of it, with its own Red-style final fight.

**Step 6: Town Map from the land.**
Draw the Gizmo map from the actual town graph and land shapes: a lettered place list (A to k in your key), the player's face on the map, a place name under the cursor, the roads drawn along the real links, and an area page per buddy (where each lives) as Gold's Pokédex has.

**Step 7: polish and rules.**
Per-route tricks (tree on a route, ledge runs, a toll gate), a daily event per weekday (Sunny's tips, Buena), the Bug-Catching Contest on its three days, Mom's savings, rematches with the phone.

## 5. What to decide before we start
- **Hand-drawn or generated?** I recommend a mix: generated routes with more shape types for most of the game, hand-drawn landmarks for the 8 to 10 places a player remembers.
- **Layout copying:** we take the shape and the ideas (a hub city, a forest maze, ice, a lake), never the tile data. Our names, our art, our story.
- **Size of the first slice:** Steps 1 and 2 together are one session; Step 3 is two sessions (routes), Step 4 is three (interiors), Step 5 is two, Step 6 is one.

## 6. Progress
- **Step 1 (web), first part done:** nine link roads (`24vr-ow-links.js`) of different sizes (24 to 32 wide, 13 to 16 tall), three of them crossing a river by a bridge; 13 of the 17 towns now have a third exit. Still to do: cave and water links, gates on links, more links so every town has 2 to 4 exits.
- **Step 2 (sizes), first part done:** towns now run from 18 to 30 tall, and a tall town gets a second district of closed houses, a pond and flower beds. Still to do: towns of different widths (needs the edge gaps and the side games' fixed coordinates to follow the town's own width), a village size and a true hub city.
- **Routes (Step 3, first part):** routes are now 24 to 36 tall (block rows 12 to 18), with the road running longer before it bends. Hand-drawn landmark routes are still to do.
- **Found on the way:** towns were laid out with a random-comparator sort, which Chrome and Safari run differently, so a phone and a computer could build different towns from one save. Fixed with a fixed shuffle and a guard test.
