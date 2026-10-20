// =====================================================================
//  ADVENTURE ART: the world pictures (art/world/*.svg, built into WORLD_ART) are one hidden sprite sheet, drawn with <use>.
//  The map sets colours with CSS variables (--w-grass, --hero-skin, ...), so a land recolours the whole set. No emoji in the world.
// =====================================================================
function mountWorldArt() {
  if (document.getElementById('world-art')) return;
  const sheet = document.createElement('div');
  sheet.id = 'world-art';
  sheet.setAttribute('aria-hidden', 'true');
  sheet.innerHTML = WORLD_ART;
  document.body.appendChild(sheet);
}
// One picture, sized by its box (CSS): worldSprite('t-grass'), worldSprite('p-body-down-0', 'hero').
function worldSprite(id, cls) {
  mountWorldArt();
  return '<svg class="w-sprite' + (cls ? ' ' + cls : '') + '" viewBox="0 0 100 100" aria-hidden="true"><use href="#w-' + id + '"/></svg>';
}
// The hero: a body and a hair layer stacked. look = {skin, hair, outfit, style} (colours as CSS colours); dir down|up|left|right; frame 0|1.
function heroSprite(look, dir, frame) {
  const l = look || {};
  const vars = '--hero-skin:' + (l.skin || '#F2C9A0') + ';--hero-hair:' + (l.hair || '#5B3A1E') + ';--hero-outfit:' + (l.outfit || '#3B82F6');
  return '<span class="w-hero" style="' + vars + '">' + worldSprite('p-body-' + dir + '-' + (frame ? 1 : 0)) + worldSprite('p-hair-' + ((l.style | 0) % 4) + '-' + dir) + '</span>';
}
