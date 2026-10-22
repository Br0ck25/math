# Our world on Gold's Johto graph

The aim: the same layout and flow as Gold's Johto (the lettered key on the Johto map), in our own tiles, names and exact rooms. We follow the graph, the landmark types and the proportions. We do not copy Gold's tile data.

## 1. Places: Gold -> ours
| Gold | Ours | State |
|---|---|---|
| New Bark Town (A) | Cozy Hollow | done (start town) |
| Route 29 / Cherrygrove (B, C) / Routes 30, 31 (D, E) | Route 1 (one road) | Cherrygrove done (village east of Cozy Hollow, `24vs-ow-places.js`); two more routes to do |
| Violet City, Sprout Tower (F) | Meadow Town | town done; Sprout Tower done (three floors) |
| Route 32, Ruins of Alph, Union Cave (G, H, I) | Route 2 (Ember road) | Ruins of Alph done (courtyard and chamber, west of Ember Hills); its puzzle and a Union-Cave link to do |
| Azalea Town, Slowpoke Well, Ilex Forest (J, K) | Ember Hills; Leaf Grove's road is already an Ilex-style maze | town done; Slowpoke Well done |
| Route 34, Goldenrod City, Radio Tower (L, M) | Tide Bay (the hub city: 28 tall, five-floor Dept. Store, Underground); Spark City has the Radio Tower | hub city done (width stays 16) |
| Routes 35 to 37, National Park (N, O, P, Q) | Route 4; the Park beside Meadow Town | Park done; Route 36 tree to do |
| Ecruteak City, Tin and Burned Towers (R) | Leaf Grove | town done; Tin Tower done (five floors) |
| Routes 38 and 39, Olivine, Lighthouse (S, T, U) | Volt Valley; the Lighthouse is in Tide Bay | to move |
| Routes 40 and 41, Whirl Islands, Cianwood (V, W, X, Y) | Gloom Marsh and the Open Seas | Open Seas and the Whirl Islands (five islets, surfers only) done |
| Route 42, Mt. Mortar, Mahogany (Z, a, b) | Mystic Peak; Mortar Pass link road | link done; cave to do |
| Route 43, Lake of Rage (c, d) | Lake of Rage (shore path round a lake, west of Mystic Peak) | place done; its red fish to do |
| Route 44, Ice Path, Blackthorn, Dragon's Den (e, f) | Skyreach; Summit Citadel's road is an ice field | Dragon's Den done |
| Routes 45 and 46, Dark Cave (g, h, i) | link road Skyreach to Cozy Hollow (the way home) | link done; Dark Cave done |
| Mt. Silver, Route 28 (j, k) | Silver Peak, the second journey | done |

## 2. Roads (the graph, as drawn on the Gizmo map)
Main road: Hollow - Meadow - Ember - Tide - Grove - Volt - Gloom - Mystic - Skyreach, then the second journey ring (Cinder, Coral, Thistle, Spark, Dusk, Prism, Cross, Summit, Peak).
Second roads (link roads, opened once both towns are seen): Meadow-Grove, Ember-Tide, Tide-Coral, Grove-Volt, Volt-Gloom, Grove-Mystic, Mystic-Cinder, Coral-Cross, Cinder-Summit, Thistle-Prism, Skyreach-Hollow.
Gold's loops done so far: Violet to Ecruteak (Route 36), Ecruteak to Mahogany (Route 42), and the way back from Blackthorn to the start (Routes 45 and 46).

## 3. Stages
1. **Graph and map (done this pass):** the Gizmo map is laid out like Johto's key; the loops above exist as roads.
2. **Small places done:** Cherrygrove, Lake of Rage, Ruins of Alph, the Whirl Islands, Dark Cave (two mouths on the road home from Skyreach, a boulder in a side branch), Union Cave (two mouths on Route 2), the Dragon's Den and the Slowpoke Well (lit caverns with a pool and a bridge). The Ruins quiz stones already live in the route caves. The red fish at the Lake of Rage (a shiny shark, once, with the Fishing Rod), three sleeping buddies in the Well and the Burned Tower (courtyard beside the Tin Tower, two floors, a cellar with three sleeping beasts) are done too. `tests/adventure-walk.test.mjs` walks every warp of every map. Each is a hand-drawn map in `24va-` or a new file.
3. **The hub city (done except width):** Tide Bay is 28 tall with a five-floor Dept. Store and an Underground; it stays 16 wide because the edge gaps and side games are fixed to that width, so a second district is joined on beside it: Tide Bay is now one map 31 wide (a street straight through, a park, Bike Shop, Flower Shop, Fan Club and the Magnet Train station). The Crossroads, hub of the second journey, is built the same way (31 wide, with the other station and a four-floor Crossroads Tower). Gold's other cities are one screen, so the rest stay 16 wide.
4. **Towers (done):** Sprout Tower (three floors, east of Meadow Town) and Tin Tower (five floors, west of Leaf Grove), each with a courtyard, a sage per floor, an elder to beat on the top floor and a quiz stone beside them that pays an Evolution Stone once. Leaf Grove is now 24 tall. Burned Tower is not built.
5. **Per-route tricks:** ledge runs, causeways, ice, forest mazes, shake trees and Cut/Strength/Surf gates are in; night trees now drop only dark and magic buddies. The two road blockers are done as tiles (`t` an odd tree that sleeps in the way and `A` a toll bar) across a full wall of trees on the link roads: Hillside Road (Gold's Route 36; the Gizmo radio wakes the tree) and Fog Road (Route 43; 1000 gems once, `ECON.toll`).
6. **Second journey on a Kanto-like graph (done):** the Magnet Train joins Tide Bay and the Crossroads for the Champion (`ECON.train`, a dashed line on the Gizmo map). the Crossroads is the hub, with a road from each side of it (Coral Reach, Dusk, Prism, Summit) and the Gizmo map draws it at the centre of the ring.
