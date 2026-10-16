// =====================================================================
//  BUDDY ART: licensed pictures that replace a buddy's emoji (see art/README.md).
//  scripts/build.mjs embeds art/buddies/<buddy id>.png as BUDDY_ART. A buddy with art gets an <img> as its `icon`, exactly like the
//  Bandit's drawing, so every place that already shows a buddy's picture shows the art. `emoji` keeps the original for plain text,
//  pack placement and the trading card's fallback. A buddy without art is untouched.
// =====================================================================
const ART_URIS = {};                                  // id -> data: URI of the picture
const ART_IMGS = {};                                  // id -> Image, made only when a trading card needs it (200 decoded images at load made every page slow)
function artHtml(uri) { return '<img class="buddy-img" alt="" draggable="false" src="' + uri + '">'; }
function applyBuddyArt(map) {
  allBuddies().forEach(function (b) {
    const uri = map[b.id];
    if (!uri || b.emoji) return;
    b.emoji = b.icon;
    b.icon = artHtml(uri);
    (b.forms || []).forEach(function (f) { f.emoji = f.icon; f.icon = b.icon; });
    ART_URIS[b.id] = uri;
  });
  // A boss that is also a buddy (`m.buddy`) shows the same picture in the fight and in the Dex.
  monstersList.forEach(function (m) {
    const uri = m.buddy && map[m.buddy];
    if (!uri || m.emoji) return;
    m.emoji = m.icon;
    m.icon = artHtml(uri);
  });
}
// Puts a picture into an element that only this code fills, but only when it changed: re-creating an <img> makes the browser decode it again.
function setIconHtml(el, html) {
  if (el._icon === html) return;
  el._icon = html;
  el.innerHTML = html;
}
// The emoji of a buddy or form even when it has art: for text, toasts and the card's fallback.
function emojiOf(x) { return x.emoji || x.icon; }
// The art as a loaded picture for the trading card canvas, or null (no art, or still loading: the card shows the emoji and is drawn again when the picture arrives).
function artImage(id) {
  const uri = ART_URIS[id];
  if (!uri) return null;
  let im = ART_IMGS[id];
  if (!im) { im = ART_IMGS[id] = new Image(); im.onload = artLoaded; im.src = uri; }
  return im.complete && im.naturalWidth ? im : null;
}
// A card picture finished loading: draw the card that is on screen again.
function artLoaded() {
  if (document.getElementById('bosscard-modal').style.display === 'flex') renderBossCard();
  if (document.getElementById('hub-modal').style.display === 'flex' && hubTab === 'card') renderCardTab();
}
applyBuddyArt(BUDDY_ART);
