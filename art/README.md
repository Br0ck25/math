# Buddy art

Put licensed pictures here and the game shows them instead of the emoji. The emoji stays as the fallback for every buddy without a file.

## How
1. Name the file after the buddy's id: `art/buddies/toon_bluey.png`. Run `npm run art` for the list of ids (it marks the ones that have art).
2. `npm run build`, then commit `worker.js` (the pictures are embedded in it).

## Rules
- File types: `.png` `.webp` `.jpg` `.gif` `.svg`. A transparent background looks best (PNG or WebP).
- Square-ish, about **256 px**. Each file may be at most 150 KB and the whole folder 2.5 MB (the Worker has a size limit); the build stops with a message if you go over. WebP is the smallest.
- **SVG tips:** include a `viewBox` (the build adds the width and height from it if they are missing). Turn text into outlines, because the page cannot load fonts. Do not link to outside images or files (a picture loaded as an image cannot fetch them). Remove editor clutter with SVGO to stay under the size limit. Scripts and event handlers are refused.
- One picture is used for every evolution stage (the glow, element badge and aura still show the stage).
- The picture is also drawn on the trading card.
- Only use artwork you hold the licence for.
