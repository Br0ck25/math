# Our world on Gold's Johto graph

The aim: the same layout and flow as Gold's Johto (the lettered key on the Johto map), in our own tiles, names and exact rooms. We follow the graph, the landmark types and the proportions. We do not copy Gold's tile data.

## 1. Places: Gold -> ours
| Gold | Ours | State |
|---|---|---|
| New Bark Town (A) | Cozy Hollow | done (start town) |
| Route 29 / Cherrygrove (B, C) / Routes 30, 31 (D, E) | Route 1 (one road) | Cherrygrove done (village east of Cozy Hollow, `24vs-ow-places.js`); two more routes to do |
| Violet City, Sprout Tower (F) | Meadow Town | town done; tower to do |
| Route 32, Ruins of Alph, Union Cave (G, H, I) | Route 2 (Ember road) | Ruins of Alph done (courtyard and chamber, west of Ember Hills); its puzzle and a Union-Cave link to do |
| Azalea Town, Slowpoke Well, Ilex Forest (J, K) | Ember Hills; Leaf Grove's road is already an Ilex-style maze | town done; Slowpoke Well done |
| Route 34, Goldenrod City, Radio Tower (L, M) | Tide Bay (the hub city: 28 tall, five-floor Dept. Store, Underground); Spark City has the Radio Tower | hub city done (width stays 16) |
| Routes 35 to 37, National Park (N, O, P, Q) | Route 4; the Park beside Meadow Town | Park done; Route 36 tree to do |
| Ecruteak City, Tin and Burned Towers (R) | Leaf Grove | town done; towers to do |
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
2. **Small places done:** Cherrygrove, Lake of Rage, Ruins of Alph, the Whirl Islands, Dark Cave (two mouths on the road home from Skyreach, a boulder in a side branch), Union Cave (two mouths on Route 2), the Dragon's Den and the Slowpoke Well (lit caverns with a pool and a bridge). The Ruins quiz stones already live in the route caves. Still to do: the red fish at the Lake of Rage, sleeping buddies in the Well. Each is a hand-drawn map in `24va-` or a new file.
3. **The hub city (done except width):** Tide Bay is 28 tall with a five-floor Dept. Store and an Underground; it stays 16 wide because the edge gaps and side games are fixed to that width.
4. **Towers:** Sprout Tower and the Tin Tower as multi-floor climbs.
5. **Per-route tricks:** the Sudowoodo tree, Route 29's night tree, toll gate, bug-catching park days.
6. **Second journey on a Kanto-like graph:** ring with a central city.
