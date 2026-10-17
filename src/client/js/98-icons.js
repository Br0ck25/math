// =====================================================================
//  ICONS: custom pictures for the everyday emoji (gems, trophies, locks, ...). House style as the buddy art: 100x100, thick dark
//  outline, flat colours. iconize() wraps each such emoji in text in <span class="ico">; the emoji stays as the span's text (so
//  textContent, copy and screen readers still work) and CSS hides it behind the picture. A MutationObserver covers everything the
//  page writes later. Buddy faces are not here (they have art/buddies). Emoji not in ICONS are left alone; canvas text is untouched.
// =====================================================================
function iconStar(cx, cy, R, r, n, rot) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (rot || -90) * Math.PI / 180 + i * Math.PI / n, d = i % 2 ? r : R;
    pts.push((cx + d * Math.cos(a)).toFixed(1) + ',' + (cy + d * Math.sin(a)).toFixed(1));
  }
  return '<polygon points="' + pts.join(' ') + '"';
}
const ICON_INK = '#1E293B';
const ICON_BODIES = {
  '💎': '<polygon points="50,90 10,38 28,14 72,14 90,38" fill="#38BDF8"/><path d="M10 38H90M28 14L40 38L50 90M72 14L60 38L50 90M40 38L50 14L60 38" fill="none" stroke-width="3"/>',
  '✨': '<path d="M45 8Q48 40 82 45Q48 50 45 82Q42 50 8 45Q42 40 45 8Z" fill="#FDE047"/><path d="M80 6Q81 17 92 19Q81 21 80 32Q79 21 68 19Q79 17 80 6Z" fill="#FDE047" stroke-width="3"/><path d="M80 68Q81 78 90 80Q81 82 80 92Q79 82 70 80Q79 78 80 68Z" fill="#FDE047" stroke-width="3"/>',
  '⚡': '<polygon points="58,6 20,56 46,56 38,94 80,40 54,40" fill="#FACC15"/>',
  '🏆': '<path d="M28 18H14Q12 46 32 48M72 18H86Q88 46 68 48" fill="none" stroke-width="13"/><path d="M28 18H14Q12 46 32 48M72 18H86Q88 46 68 48" fill="none" stroke="#FBBF24" stroke-width="6"/><path d="M28 12H72V40Q72 64 50 66Q28 64 28 40Z" fill="#FBBF24"/><rect x="43" y="66" width="14" height="14" fill="#F59E0B"/><rect x="28" y="80" width="44" height="12" rx="3" fill="#B45309"/>',
  '🔒': '<path d="M31 46V32Q31 12 50 12Q69 12 69 32V46" fill="none" stroke-width="15"/><path d="M31 46V32Q31 12 50 12Q69 12 69 32V46" fill="none" stroke="#CBD5E1" stroke-width="8"/><rect x="18" y="44" width="64" height="46" rx="9" fill="#F59E0B"/><circle cx="50" cy="63" r="7" fill="' + ICON_INK + '"/><rect x="47" y="63" width="6" height="14" fill="' + ICON_INK + '"/>',
  '✅': '<rect x="10" y="10" width="80" height="80" rx="18" fill="#22C55E"/><path d="M28 52L44 68L74 32" fill="none" stroke="#fff" stroke-width="11"/>',
  '⚔': '<path d="M22 78L80 20M78 78L20 20" fill="none" stroke-width="14"/><path d="M22 78L80 20M78 78L20 20" fill="none" stroke="#E2E8F0" stroke-width="6"/><path d="M14 58L42 86M86 58L58 86" fill="none" stroke="#B45309" stroke-width="9"/><path d="M14 86L26 74M86 86L74 74" fill="none" stroke="#B45309" stroke-width="9"/>',
  '👑': '<path d="M12 80L8 30L30 50L50 16L70 50L92 30L88 80Z" fill="#FBBF24"/><circle cx="50" cy="62" r="6" fill="#EF4444"/><circle cx="26" cy="66" r="4" fill="#38BDF8" stroke-width="3"/><circle cx="74" cy="66" r="4" fill="#38BDF8" stroke-width="3"/>',
  '⭐': iconStar(50, 54, 44, 19, 5) + ' fill="#FBBF24"/>',
  '🌟': iconStar(50, 52, 34, 15, 5) + ' fill="#FDE047"/><path d="M50 4V12M10 20L17 26M90 20L83 26M6 56H14M94 56H86" fill="none" stroke="#FBBF24" stroke-width="5"/>',
  '🔥': '<path d="M50 6Q70 30 78 48Q92 68 74 84Q62 94 50 94Q34 94 26 80Q14 62 34 44Q36 56 44 56Q40 30 50 6Z" fill="#F97316"/><path d="M50 52Q64 68 60 80Q56 88 50 88Q42 88 40 78Q40 66 50 52Z" fill="#FDE047" stroke-width="3"/>',
  '🛡': '<path d="M50 8L86 20V48Q86 76 50 92Q14 76 14 48V20Z" fill="#3B82F6"/><path d="M50 22L74 30V48Q74 66 50 80Z" fill="#93C5FD" stroke-width="3"/>',
  '📚': '<rect x="14" y="62" width="72" height="24" rx="4" fill="#EF4444"/><rect x="20" y="38" width="64" height="24" rx="4" fill="#3B82F6"/><rect x="10" y="14" width="70" height="24" rx="4" fill="#22C55E"/><path d="M24 74H70M30 50H70M22 26H64" fill="none" stroke="#fff" stroke-width="4"/>',
  '🎁': '<rect x="14" y="42" width="72" height="46" rx="5" fill="#EF4444"/><rect x="8" y="28" width="84" height="18" rx="5" fill="#F87171"/><rect x="43" y="28" width="14" height="60" fill="#FDE047"/><path d="M50 28Q34 8 28 20Q26 30 50 28Q74 30 72 20Q66 8 50 28Z" fill="#FDE047"/>',
  '🎯': '<circle cx="50" cy="50" r="42" fill="#F8FAFC"/><circle cx="50" cy="50" r="30" fill="#EF4444"/><circle cx="50" cy="50" r="18" fill="#F8FAFC"/><circle cx="50" cy="50" r="7" fill="#EF4444"/>',
  '⚠': '<polygon points="50,8 94,86 6,86" fill="#FACC15"/><rect x="45" y="34" width="10" height="30" rx="3" fill="' + ICON_INK + '" stroke="none"/><circle cx="50" cy="74" r="6" fill="' + ICON_INK + '" stroke="none"/>',
  '☠': '<path d="M50 8C26 8 14 26 16 46C17 56 24 62 32 64V82H68V64C76 62 83 56 84 46C86 26 74 8 50 8Z" fill="#F1F5F9"/><circle cx="36" cy="46" r="9" fill="' + ICON_INK + '"/><circle cx="64" cy="46" r="9" fill="' + ICON_INK + '"/><path d="M50 56L44 66H56Z" fill="' + ICON_INK + '" stroke-width="3"/><path d="M42 72V82M50 72V82M58 72V82" fill="none" stroke-width="3"/>',
  '🎒': '<path d="M36 28Q36 8 50 8Q64 8 64 28" fill="none" stroke-width="13"/><path d="M36 28Q36 8 50 8Q64 8 64 28" fill="none" stroke="#FDBA74" stroke-width="6"/><rect x="18" y="26" width="64" height="64" rx="18" fill="#F97316"/><rect x="31" y="56" width="38" height="26" rx="7" fill="#FDBA74" stroke-width="4"/>',
  '💥': iconStar(50, 50, 46, 24, 9, -80) + ' fill="#FB923C"/>' + iconStar(50, 50, 26, 13, 9, -80) + ' fill="#FDE047" stroke-width="3"/>',
  '🎉': '<polygon points="10,92 28,40 62,74" fill="#FBBF24"/><path d="M42 18V32M70 40L82 34M56 8L62 20M84 62L94 66M72 14L78 26" fill="none" stroke="#EC4899" stroke-width="5"/><circle cx="76" cy="52" r="5" fill="#38BDF8" stroke-width="3"/><circle cx="52" cy="40" r="5" fill="#22C55E" stroke-width="3"/><circle cx="88" cy="24" r="5" fill="#EF4444" stroke-width="3"/>',
  '🧮': '<rect x="10" y="14" width="80" height="72" rx="8" fill="#FEF3C7"/><path d="M12 38H88M12 62H88" fill="none" stroke-width="3"/><circle cx="26" cy="26" r="7" fill="#EF4444"/><circle cx="44" cy="26" r="7" fill="#EF4444"/><circle cx="62" cy="50" r="7" fill="#3B82F6"/><circle cx="76" cy="50" r="7" fill="#3B82F6"/><circle cx="30" cy="74" r="7" fill="#22C55E"/><circle cx="48" cy="74" r="7" fill="#22C55E"/><circle cx="66" cy="74" r="7" fill="#22C55E"/>',
  '❤': '<path d="M50 88C14 62 6 38 20 22Q36 10 50 30Q64 10 80 22C94 38 86 62 50 88Z" fill="#EF4444"/><path d="M26 30Q32 24 38 28" fill="none" stroke="#fff" stroke-width="5"/>',
  '💔': '<path d="M50 88C14 62 6 38 20 22Q36 10 50 30Q64 10 80 22C94 38 86 62 50 88Z" fill="#EF4444"/><path d="M50 30L42 46L56 56L46 70L52 80" fill="none" stroke="#F8FAFC" stroke-width="6"/>',
  '❄': '<path d="M50 8V92M13 29L87 71M13 71L87 29" fill="none" stroke-width="14"/><path d="M50 8V92M13 29L87 71M13 71L87 29" fill="none" stroke="#BAE6FD" stroke-width="6"/>',
  '🏅': '<path d="M26 6L44 38H64L46 6Z" fill="#3B82F6"/><path d="M74 6L56 38H36L54 6Z" fill="#EF4444"/><circle cx="50" cy="64" r="28" fill="#FBBF24"/><circle cx="50" cy="64" r="16" fill="#FDE047" stroke-width="3"/>',
  '☁': '<path d="M26 80Q6 80 6 62Q6 46 26 44Q32 20 58 22Q82 24 82 46Q96 48 94 64Q92 80 74 80Z" fill="#F1F5F9"/>',
  '🐾': '<ellipse cx="50" cy="68" rx="24" ry="20" fill="#A16207"/><circle cx="20" cy="42" r="10" fill="#A16207"/><circle cx="38" cy="22" r="10" fill="#A16207"/><circle cx="62" cy="22" r="10" fill="#A16207"/><circle cx="80" cy="42" r="10" fill="#A16207"/>',
  '⚙': '<path fill-rule="evenodd" d="' + iconStar(50, 50, 44, 34, 8, -90).replace('<polygon points="', 'M').replace(/ /g, 'L').replace(/"$/, 'Z') + 'M36 50a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z" fill="#94A3B8"/>',
  '💧': '<path d="M50 6Q84 46 84 62Q84 92 50 92Q16 92 16 62Q16 46 50 6Z" fill="#38BDF8"/><path d="M34 62Q34 74 44 78" fill="none" stroke="#fff" stroke-width="6"/>',
  '🌑': '<circle cx="50" cy="50" r="42" fill="#64748B"/><circle cx="36" cy="38" r="8" fill="#475569" stroke-width="3"/><circle cx="64" cy="60" r="11" fill="#475569" stroke-width="3"/><circle cx="40" cy="70" r="5" fill="#475569" stroke-width="3"/>',
  '🏟': '<path d="M8 36V66Q8 88 50 88Q92 88 92 66V36Z" fill="#94A3B8"/><ellipse cx="50" cy="36" rx="42" ry="18" fill="#E2E8F0"/><ellipse cx="50" cy="36" rx="28" ry="10" fill="#22C55E" stroke-width="3"/>',
  '⏳': '<path d="M24 12H76L54 50L76 88H24L46 50Z" fill="#FEF3C7"/><path d="M36 76H64L56 62H44Z" fill="#F59E0B" stroke-width="3"/><rect x="16" y="6" width="68" height="10" rx="3" fill="#B45309"/><rect x="16" y="84" width="68" height="10" rx="3" fill="#B45309"/>',
  '⏱': '<rect x="42" y="6" width="16" height="12" rx="3" fill="#94A3B8"/><circle cx="50" cy="56" r="36" fill="#F1F5F9"/><path d="M50 56V32" fill="none" stroke-width="7"/><path d="M50 56L68 66" fill="none" stroke="#EF4444" stroke-width="6"/>',
  '❌': '<path d="M22 22L78 78M78 22L22 78" fill="none" stroke-width="20"/><path d="M22 22L78 78M78 22L22 78" fill="none" stroke="#EF4444" stroke-width="10"/>',
  '💨': '<path d="M8 34H56Q74 34 74 22Q74 12 62 12M8 54H78Q94 54 94 66Q94 78 80 78M8 74H44" fill="none" stroke-width="14"/><path d="M8 34H56Q74 34 74 22Q74 12 62 12M8 54H78Q94 54 94 66Q94 78 80 78M8 74H44" fill="none" stroke="#E2E8F0" stroke-width="6"/>',
  '🗺': '<path d="M6 22L34 12L66 24L94 14V78L66 88L34 76L6 86Z" fill="#FDE68A"/><path d="M34 12V76M66 24V88" fill="none" stroke-width="3"/><path d="M48 42L58 54M58 42L48 54" fill="none" stroke="#EF4444" stroke-width="5"/>',
  '🔄': '<path d="M78 36A32 32 0 0 0 22 40M22 64A32 32 0 0 0 78 60" fill="none" stroke="#38BDF8" stroke-width="11"/><polygon points="86,12 86,46 54,40" fill="#38BDF8"/><polygon points="14,88 14,54 46,60" fill="#38BDF8"/>',
  '🎓': '<path d="M24 48V70Q50 88 76 70V48Z" fill="#475569"/><polygon points="50,12 96,34 50,56 4,34" fill="#334155"/><path d="M88 38V68" fill="none" stroke-width="11"/><path d="M88 38V68" fill="none" stroke="#FBBF24" stroke-width="5"/><circle cx="88" cy="72" r="5" fill="#FBBF24" stroke-width="3"/>',
  '🚀': '<polygon points="30,52 12,78 32,70" fill="#EF4444"/><polygon points="70,52 88,78 68,70" fill="#EF4444"/><path d="M38 70L50 96L62 70Z" fill="#FB923C"/><path d="M50 4Q76 24 70 68H30Q24 24 50 4Z" fill="#F1F5F9"/><circle cx="50" cy="38" r="9" fill="#38BDF8"/>',
  '📖': '<path d="M50 24Q30 12 6 20V82Q30 74 50 86Z" fill="#F8FAFC"/><path d="M50 24Q70 12 94 20V82Q70 74 50 86Z" fill="#F1F5F9"/><path d="M16 36Q30 34 40 40M16 52Q30 50 40 56M84 36Q70 34 60 40M84 52Q70 50 60 56" fill="none" stroke-width="3"/>',
  '🌊': '<path d="M4 54Q20 20 40 42Q50 20 68 34Q84 16 96 40V84H4Z" fill="#38BDF8"/><path d="M10 66Q24 56 38 66T66 66T92 62" fill="none" stroke="#fff" stroke-width="5"/>',
  '🍀': '<circle cx="36" cy="34" r="19" fill="#22C55E"/><circle cx="64" cy="34" r="19" fill="#22C55E"/><circle cx="36" cy="60" r="19" fill="#22C55E"/><circle cx="64" cy="60" r="19" fill="#22C55E"/><path d="M50 52Q54 80 70 94" fill="none" stroke-width="13"/><path d="M50 52Q54 80 70 94" fill="none" stroke="#15803D" stroke-width="6"/>',
  '🫧': '<circle cx="38" cy="60" r="30" fill="#BAE6FD" fill-opacity=".6"/><circle cx="76" cy="26" r="16" fill="#BAE6FD" fill-opacity=".6"/><path d="M24 54Q28 44 38 42" fill="none" stroke="#fff" stroke-width="5"/>'
};
const ICON_URIS = {};
const ICON_RE = new RegExp('(' + Object.keys(ICON_BODIES).join('|') + ')\\uFE0F?', 'gu');
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
    sp.style.backgroundImage = iconUri(m[1]);
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
