// =====================================================================
//  BUDDY LOOK: the picture of a buddy, with its evolution decoration
// =====================================================================
// =====================================================================
//  EVOLUTION LOOK: evolved buddies keep their own face, plus a glow in their element's colour,
//  an element badge, and (final form) a faint aura and sparkle. No per-buddy art needed.
// =====================================================================
const ELEM_EMOJI = { fire: '🔥', water: '💧', nature: '🌿', electric: '⚡', dark: '🌑', magic: '✨', shadow: '🌌' };
function elemColor(element) { return ELEM_COLORS[element] || '#a855f7'; }

// Decoration layer for a buddy at evolution `stage` (0 = none). Sized from the --u of the box it is placed in.
function formMarkup(stage, element) {
  if (!stage) return '';
  const em = ELEM_EMOJI[element] || '⭐';
  let h = '<span class="evo-badge" style="width:calc(var(--u) * 0.34); height:calc(var(--u) * 0.34); font-size:calc(var(--u) * 0.2);">' + em + '</span>';
  if (stage === 1) {
    h += '<span class="evo-crest" aria-hidden="true"></span>';
  }
  if (stage >= 2) {
    h += '<span class="evo-wings" aria-hidden="true"></span>';
    h += '<span class="evo-crown" aria-hidden="true" style="font-size:calc(var(--u) * 0.28);">👑</span>';
    h += '<span class="evo-runes" aria-hidden="true">✦</span>';
    h += '<span class="evo-aura" style="font-size:calc(var(--u) * 1.15);">' + em + '</span>';
    h += '<span class="evo-spark" style="font-size:calc(var(--u) * 0.26);">✨</span>';
  }
  return h;
}
// A buddy picture of `px` pixels with its evolution look (and optional extra gear markup) for menus and modals.
function avatarHtml(pet, px, gearHtml) {
  return '<span class="buddy-avatar' + (state.shinies[pet.id] ? ' shiny' : '') + ' stage-wrap-' + (pet.stage || 0) + '" style="--u:' + px + 'px; --evo:' + elemColor(pet.element) + ';"><span class="buddy-glyph stage-' + pet.stage + '">' + pet.icon +
    '</span><span class="gear-layer">' + formMarkup(pet.stage, pet.element) + (gearHtml || '') + '</span></span>';
}
