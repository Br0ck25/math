# How Pokémon Gold is built (notes from pret/pokegold)

Read this when you work on maps, the world or story pacing. It is not loaded automatically (the CLAUDE.md file map only points here). Facts come from the pret/pokegold sources and Bulbapedia; what we copy and what we do differently is at the end.

## Maps are built from blocks, not tiles
- `maps/<Name>.blk` is a grid of single bytes. Each byte is one **block**: a 4x4-tile patch (32x32 px) taken from the map's tileset (`gfx/tilesets`, `data/tilesets/*_metatiles.bin`). A house, a row of trees, a ledge or a grass field is a prebuilt block; the map only says which block goes where. That is why Gold's land looks rich and regular.
- `data/tilesets/*_collision.asm` gives every block four collision types: `FLOOR`, `WALL`, `TALL_GRASS`, `WATER`, ledge hops (`HOP_DOWN`, `HOP_LEFT`, `HOP_RIGHT`...), `HEADBUTT_TREE`, doors, carpets and caves. So grass, water and ledges are properties of the tile, not separate objects.
- `data/maps/attributes.asm` (`map_attributes`): border block (what is drawn outside the map), height and width, the blocks, the script and events pointers, and **connections**. A connection names a neighbour in one of four directions plus an **offset**, so walking off the edge of Route 29 scrolls straight onto Route 30 with no loading. Towns and routes are therefore one continuous world; only buildings and caves use warps.
- Each map has an `.asm` script file with `warp_events` (doors), `coord_events` (invisible triggers, e.g. the rival and the catching tutorial), `bg_events` (signs), `object_events` (people, items on the ground, fruit trees) and `scene` scripts. A person can be hidden by an event flag, or by the weekday and time of day (`checktime`, `VAR_WEEKDAY`; Tuscany of Tuesday gives a Pink Bow only on Tuesdays).

## Wild buddies
`data/wild/johto_grass.asm`: one block per area, an encounter rate for morning/day/night, then seven slots per time of day `db level, SPECIES` (the slots have fixed odds in the engine: 30, 30, 20, 10, 5, 4, 1 percent). Gold and Silver differ in some entries. Water and fishing have their own files.

## Things you are not simply given
- The **Map Card** (the Town Map in the Pokégear) is not part of the Pokégear. In Cherrygrove City the Guide Gent walks you round the town (Pokécenter, Mart, the road to Route 30, the sea) and gives it at the end of the tour (`ENGINE_MAP_CARD`). The **Radio Card** comes from a quiz at the Goldenrod Radio Tower; the **Expansion Card** (Kanto radio) after the Power Plant quest. The phone and clock are there from the start. Walking into a town for the first time also registers its **Fly point**.
- Key items come from people and events (Old Rod from the Olivine fisher, bicycle voucher, Card Key...). HMs (Cut, Flash, Surf, Strength, Whirlpool, Waterfall, Fly) are given by story people, and each opens terrain: Cut trees on the road, boulders, water, whirlpools, waterfalls, dark caves.

## Routes in practice
Routes wind (up, left, up, right), are 4-6 tiles wide at the narrowest, and are filled with tall grass fields with clear edges. They offer more than one way: a ledge you hop down (one way), a Cut tree that opens a shortcut, water you can cross later with Surf, a side route with a house or a gate building (Route 29/46 gate). Trainers stand with a line of sight; items lie in the open or behind HM terrain. Houses sit on routes (berry or gift people), and gates buildings join routes to towns.

## What we copy and what we do not
- Copied: stat and damage rules, catch rule, wild slot odds, time of day, trainer sight, ledges, forced grass, Cut-like Trim charm, the Map Card hand-over, phone calls, side games, key-item gating.
- Different on purpose: math answers drive battles; six elements; maps are plain rows of letters in `src/client/js/24*-ow-*.js` (tile chars in `OW_TILES`) and not blocks with connections, so each map is its own screen joined by warps. `24vb-ow-blocks.js` is our version of blocks: every route is a 7 x 12 grid of 2 x 2 blocks laid out from a road plan (a winding road, a tall-grass band, fields, a pond with an islet, a house, a ledge, a Trim lane), and `24ve-ow-sides.js` adds the side path and the house room. Tests that need known tiles use `grassSpot`, `sightStand` and `nextTo` (tests/helpers.mjs) or `classicRoute1()`.
