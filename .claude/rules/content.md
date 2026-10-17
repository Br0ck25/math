---
paths:
  - "src/client/js/02-data-core.js"
  - "src/client/js/04*.js"
  - "src/client/js/08*.js"
  - "src/client/js/09-bosses.js"
  - "src/client/js/30-collection-book.js"
  - "art/**"
  - "scripts/art/**"
  - "scripts/make-art.mjs"
  - "tests/content.test.mjs"
  - "tests/packs.test.mjs"
  - "tests/art*.test.mjs"
---

## Adding content (buddies, bosses, gear)
- Append new rows; never reorder or rename ids (saves refer to ids and, for bosses, to list position; secret buddies get `secret_N` from their position).
  Store buddies stay in price order with the Bandit last. Evolved forms must keep the buddy's own face (use its animal, never a bare symbol): the glow, element badge and aura come from `formMarkup`.
- Every buddy and boss is an animal, creature or monster, never an object, plant or weather (`tests/content.test.mjs` checks the picture). Real characters from shows and storybooks (`show`, mythic and legend buddies) may be people, with the emoji that fits the real character (Bluey is a dog, Homer a man). SpongeBob, Patrick and Papaw are the only exceptions (no emoji for their kind).
- Cartoon-cast buddies carry a `show` and use the real characters' names and signature moves. The owner decided to drop the earlier "no real characters" rule: licensing is the owner's call, so say in the PR when a new show is added. There is still no copied artwork or long quotes (emoji only), and only kid-friendly shows (rated for children / PG at most): never adult-rated ones. Their themed gear is bought or earned by collecting the cast (`cartoons`, `headliners` counters). Say so in the PR if a new show raises licensing questions; the owner decides about publishing.
- Every boss in `monstersList` is also a buddy (`bossBuddies`, generated from the list; id `boss_<position>`), won by beating it 3 times in its Alpha form. A new boss needs nothing extra, but boss buddies are placed in packs by element.
- Licensed artwork goes in `art/buddies/<buddy id>.png` (see `art/README.md`; `npm run art` lists the ids). The build embeds it and `applyBuddyArt()` (`08d-buddy-art.js`) swaps it in for the emoji: a buddy's `icon` is then an `<img>`, so never put a buddy's `icon` into plain text, use `emojiOf()` / `.emoji` there. Never draw or generate artwork of licensed characters yourself: it comes from the owner. The one exception is the six folk-tale characters (Arthur, Robin, Alice, Sinbad, Aladdin, Dorothy), who come from public-domain stories and are drawn in the house style (100x100 viewBox, thick dark outlines, flat colours, transparent background) from the stories themselves, never from a film's look.
- Every buddy and boss must look different from every other (`tests/art-generated.test.mjs`): if a new one would share an emoji, draw it by adding a row to `scripts/art/specs.mjs` (species, colour, accessory). Every row needs its own species: never recolour an animal another buddy already uses, add a real, different animal's template in `scripts/art/*2.mjs` (the test checks it) and run `node scripts/make-art.mjs`, which writes `art/buddies/<id>.svg` in the house style. A file without the generated marker is hand-made by the owner and is never overwritten. Licensed characters are never added to the specs (see above).
- Every buddy belongs to exactly one pack (`04b-packs.js`); the Collection Book groups by pack. A new buddy is placed by its show, its id or its emoji; `tests/packs.test.mjs` fails if one lands in the catch-all, so add its emoji or id to the right pack.
- Gear needs a `slot` (see Reuse). A piece with `earn: {key, n, text}` and `cost: 0` is a secret: it is awarded by `checkEarnedGear()` (`08c-earned-gear.js`) and never sold.
- Sizes are asserted in `tests/content.test.mjs` (currently 353 buddies, 55 bosses, 121 gear). Change the test together with the data, and run `npm run sim` if prices change.


