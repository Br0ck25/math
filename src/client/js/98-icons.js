// =====================================================================
//  ICONS: custom pictures for the everyday emoji (gems, trophies, locks, ...). House style as the buddy art: 100x100, thick dark
//  outline, flat colours. iconize() wraps each such emoji in text in <span class="ico">; the emoji stays as the span's text (so
//  textContent, copy and screen readers still work) and CSS hides it behind the picture. A MutationObserver covers everything the
//  page writes later. Buddy faces are not here (they have art/buddies). Emoji not in ICONS are left alone; canvas text is untouched.
// =====================================================================
Object.assign(ICON_BODIES, ICON_BODIES_UI, ICON_BODIES_GEAR, ICON_BODIES_MORE, ICON_BODIES_FOOD);
const ICON_URIS = {};
// Buddy and boss emoji turn into that buddy's picture (the first buddy that uses the emoji), so toasts and lists show the art.
(function addBuddyIcons() {
  const add = function (e, id) {
    const key = typeof e === 'string' ? e.replace(/\uFE0F/g, '') : '';
    if (!key || key.charAt(0) === '<' || ICON_BODIES[key] || ICON_URIS[key] || !ART_URIS[id]) return;
    ICON_URIS[key] = 'url("' + ART_URIS[id] + '")';
  };
  allBuddies().forEach(function (b) { add(b.emoji, b.id); (b.forms || []).forEach(function (f) { add(f.emoji, b.id); }); });
  monstersList.forEach(function (m) { if (m.buddy) add(m.emoji, m.buddy); });
})();
// Not inside a ZWJ sequence unless the whole sequence has a picture. A variation selector may follow any character; longer emoji first.
const ICON_RE = new RegExp('(?<!\\u200D)(' + Object.keys(ICON_BODIES).concat(Object.keys(ICON_URIS)).sort(function (x, y) { return y.length - x.length; }).map(function (k) {
  return Array.from(k).map(function (c) { return c + '\\uFE0F?'; }).join('');
}).join('|') + ')(?!\\u200D)', 'gu');
function iconUri(e) {
  if (!ICON_URIS[e]) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g stroke="' + ICON_INK + '" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">' + ICON_BODIES[e] + '</g></svg>';
    ICON_URIS[e] = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }
  return ICON_URIS[e];
}
const ICON_SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|SELECT|TITLE|CANVAS|SVG)$/;
function iconize(node) {
  if (!node) return;
  if (node.nodeType === 3) { iconizeText(node); return; }
  if (node.nodeType !== 1 || ICON_SKIP.test(node.nodeName.toUpperCase()) || node.classList.contains('ico')) return;
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode: function (t) {
      const p = t.parentNode;
      return p && !ICON_SKIP.test(p.nodeName.toUpperCase()) && !(p.classList && p.classList.contains('ico')) && t.nodeValue.search(ICON_RE) >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const found = [];
  while (walker.nextNode()) found.push(walker.currentNode);
  found.forEach(iconizeText);
}
function iconizeText(t) {
  const p = t.parentNode, s = t.nodeValue;
  if (!p || ICON_SKIP.test(p.nodeName.toUpperCase()) || (p.classList && p.classList.contains('ico'))) return;
  ICON_RE.lastIndex = 0;
  const frag = document.createDocumentFragment();
  let last = 0, m;
  while ((m = ICON_RE.exec(s))) {
    if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
    const sp = document.createElement('span');
    sp.className = 'ico';
    sp.style.backgroundImage = iconUri(m[1].replace(/\uFE0F/g, ''));
    sp.textContent = m[0];
    frag.appendChild(sp);
    last = m.index + m[0].length;
  }
  if (!last) return;
  if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
  // In a flex or grid parent every piece would become its own item (spaces lost, gaps added): keep the text together in one box.
  if (/flex|grid/.test(getComputedStyle(p).display)) { const box = document.createElement('span'); box.appendChild(frag); p.replaceChild(box, t); return; }
  p.replaceChild(frag, t);
}
(function startIcons() {
  if (typeof MutationObserver === 'undefined') return;
  const root = document.body;
  const obs = new MutationObserver(function (recs) {
    obs.disconnect();
    recs.forEach(function (r) {
      if (r.type === 'characterData') iconize(r.target);
      else r.addedNodes.forEach(iconize);
    });
    obs.observe(root, { childList: true, subtree: true, characterData: true });
  });
  iconize(root);
  obs.observe(root, { childList: true, subtree: true, characterData: true });
})();
