// =====================================================================
//  BUDDY ART: licensed pictures that replace a buddy's emoji (see art/README.md).
//  scripts/build.mjs embeds art/buddies/<buddy id>.png as BUDDY_ART. A buddy with art gets an <img> as its `icon`, exactly like the
//  Bandit's drawing, so every place that already shows a buddy's picture shows the art. `emoji` keeps the original for plain text,
//  pack placement and the trading card's fallback. A buddy without art is untouched.
// =====================================================================
const ART_IMGS = {};                                  // id -> Image (for the trading card canvas)
function artHtml(uri) { return '<img class="buddy-img" alt="" draggable="false" src="' + uri + '">'; }
function applyBuddyArt(map) {
  allBuddies().forEach(function (b) {
    const uri = map[b.id];
    if (!uri || b.emoji) return;
    b.emoji = b.icon;
    b.icon = artHtml(uri);
    (b.forms || []).forEach(function (f) { f.emoji = f.icon; f.icon = b.icon; });
    const im = new Image();
    im.src = uri;
    ART_IMGS[b.id] = im;
  });
  // A boss that is also a buddy (`m.buddy`) shows the same picture in the fight and in the Dex.
  monstersList.forEach(function (m) {
    const uri = m.buddy && map[m.buddy];
    if (!uri || m.emoji) return;
    m.emoji = m.icon;
    m.icon = artHtml(uri);
  });
}
// The emoji of a buddy or form even when it has art: for text, toasts and the card's fallback.
function emojiOf(x) { return x.emoji || x.icon; }
// The art as a loaded picture, or null (no art, or not decoded yet).
function artImage(id) { const im = ART_IMGS[id]; return im && im.complete && im.naturalWidth ? im : null; }
applyBuddyArt(BUDDY_ART);
