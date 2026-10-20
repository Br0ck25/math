// The pictures of the Adventure world (terrain tiles and the hero), drawn in the house style: 100x100 viewBox, thick dark outlines, flat colours, no text.
// Colours that change from land to land are CSS variables with a Sunny Meadow fallback (see `fill()`), so one tile set serves every land.
// scripts/make-world-art.mjs writes each entry to art/world/<id>.svg.
export const INK = '#1E293B';
const PAL = {
  grass: '#86D06A', grassD: '#5FB04C', path: '#E8D3A0', pathD: '#CDB27A', water: '#5BB8F0', waterL: '#B6E3FA', sand: '#F3E3A5', sandD: '#DCC57E',
  rock: '#94A3B8', rockD: '#64748B', leaf: '#3FA05A', leafD: '#2C7A43', wood: '#A16207', floor: '#EADFC2', floorD: '#D3C39B', wall: '#C9B58A', roof: '#DC5A4A', roofD: '#B2402F'
};
// style="fill:var(--w-grass,#86D06A)": presentation attributes cannot hold var(), a style attribute can.
const css = (name, prop) => prop + ':var(--w-' + name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + ',' + PAL[name] + ')';
const fill = (name) => 'style="' + css(name, 'fill') + '"';
const stroke = (name, w) => 'style="' + css(name, 'stroke') + '" stroke-width="' + (w || 3) + '"';
const outline = 'stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const rect = (x, y, w, h, name) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" ' + fill(name) + '/>';
const tuft = (x, y, name) => '<path d="M' + x + ' ' + y + 'l-3 -9 l5 6 l2 -10 l2 10 l5 -6 l-3 9z" ' + fill(name) + '/>';
const dot = (x, y, r, name) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" ' + fill(name) + '/>';
const wrap = (body) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + body + '</svg>';
const flower = (x, y, color) => '<circle cx="' + x + '" cy="' + y + '" r="9" fill="' + color + '" stroke="' + INK + '" stroke-width="2"/><circle cx="' + x + '" cy="' + y + '" r="3.5" fill="#F59E0B"/>';

const TILE_BODIES = {
  't-grass': rect(0, 0, 100, 100, 'grass') + tuft(22, 30, 'grassD') + tuft(70, 22, 'grassD') + tuft(48, 64, 'grassD') + tuft(84, 82, 'grassD') + tuft(14, 86, 'grassD'),
  't-tall-grass': rect(0, 0, 100, 100, 'grass') + [8, 30, 52, 74].map((x) => [12, 46, 80].map((y) =>
    '<path d="M' + x + ' ' + (y + 16) + 'l4 -22 l5 12 l5 -16 l5 26z" ' + fill('leaf') + ' stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>').join('')).join(''),
  't-path': rect(0, 0, 100, 100, 'path') + dot(20, 26, 5, 'pathD') + dot(66, 20, 4, 'pathD') + dot(44, 56, 6, 'pathD') + dot(82, 70, 5, 'pathD') + dot(16, 84, 4, 'pathD'),
  't-flower': rect(0, 0, 100, 100, 'grass') + tuft(70, 30, 'grassD') + tuft(20, 84, 'grassD') + flower(24, 30, '#F472B6') + flower(60, 62, '#FDE047') + flower(78, 24, '#FFFFFF') + flower(30, 74, '#FFFFFF'),
  't-water': rect(0, 0, 100, 100, 'water') + [[18, 28], [60, 18], [36, 62], [76, 74]].map((w) =>
    '<path d="M' + w[0] + ' ' + w[1] + 'q8 -9 16 0t16 0" fill="none" ' + stroke('waterL', 4) + ' stroke-linecap="round"/>').join(''),
  't-sand': rect(0, 0, 100, 100, 'sand') + dot(24, 24, 3, 'sandD') + dot(70, 36, 3, 'sandD') + dot(44, 70, 4, 'sandD') + dot(84, 84, 3, 'sandD') + dot(12, 66, 3, 'sandD'),
  't-tree': rect(0, 0, 100, 100, 'grass') + '<rect x="42" y="62" width="16" height="30" rx="3" ' + fill('wood') + ' ' + outline + '/>' +
    '<circle cx="50" cy="40" r="32" ' + fill('leaf') + ' ' + outline + '/><circle cx="38" cy="32" r="8" ' + fill('grass') + '/><path d="M60 48q8 -4 10 -12" fill="none" ' + stroke('leafD', 4) + ' stroke-linecap="round"/>',
  't-rock': rect(0, 0, 100, 100, 'rock') + '<path d="M0 40L28 34L40 52L70 44L100 58M30 100L36 78L62 70L70 100M60 0L66 22L92 28" fill="none" ' + stroke('rockD', 4) + ' stroke-linejoin="round"/>',
  't-fence': rect(0, 0, 100, 100, 'grass') + tuft(20, 90, 'grassD') + [14, 50, 86].map((x) => '<rect x="' + (x - 6) + '" y="30" width="12" height="52" rx="3" ' + fill('wood') + ' ' + outline + '/>').join('') +
    '<rect x="4" y="42" width="92" height="9" rx="3" ' + fill('wood') + ' ' + outline + '/><rect x="4" y="62" width="92" height="9" rx="3" ' + fill('wood') + ' ' + outline + '/>',
  't-bush': rect(0, 0, 100, 100, 'grass') + '<path d="M12 80Q4 56 24 48Q26 26 50 28Q74 26 76 48Q96 56 88 80Z" ' + fill('leaf') + ' ' + outline + '/>' + dot(36, 52, 5, 'grass') + dot(62, 62, 5, 'grass'),
  't-sign': rect(0, 0, 100, 100, 'grass') + tuft(14, 88, 'grassD') + '<rect x="44" y="52" width="12" height="38" ' + fill('wood') + ' ' + outline + '/><rect x="18" y="18" width="64" height="40" rx="6" ' + fill('wood') + ' ' + outline + '/><path d="M30 31H70M30 44H58" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>',
  't-mat': rect(0, 0, 100, 100, 'path') + '<rect x="14" y="30" width="72" height="40" rx="6" fill="#F59E0B" ' + outline + '/><path d="M26 40H74M26 50H74M26 60H74" fill="none" stroke="' + INK + '" stroke-width="3"/>',
  't-floor': rect(0, 0, 100, 100, 'floor') + '<path d="M0 50H100M50 0V50M25 50V100M75 50V100" fill="none" ' + stroke('floorD', 3) + '/>',
  't-wall': rect(0, 0, 100, 100, 'wall') + '<path d="M0 34H100M0 68H100M30 0V34M70 34V68M30 68V100" fill="none" ' + stroke('floorD', 4) + '/><rect x="0" y="92" width="100" height="8" fill="' + INK + '"/>',
  't-roof': rect(0, 0, 100, 100, 'roof') + '<path d="M0 25H100M0 50H100M0 75H100M25 0V25M75 0V25M50 25V50M25 50V75M75 50V75" fill="none" ' + stroke('roofD', 4) + '/><rect x="0" y="92" width="100" height="8" fill="' + INK + '"/>',
  't-house-wall': rect(0, 0, 100, 100, 'wall') + '<path d="M0 36H100M0 70H100" fill="none" ' + stroke('floorD', 4) + '/><rect x="0" y="0" width="100" height="6" fill="' + INK + '"/>',
  't-door': rect(0, 0, 100, 100, 'wall') + '<rect x="0" y="0" width="100" height="6" fill="' + INK + '"/><rect x="22" y="16" width="56" height="84" rx="10" ' + fill('wood') + ' ' + outline + '/><circle cx="64" cy="60" r="5" fill="#FDE047" stroke="' + INK + '" stroke-width="2"/>'
};

// ----- the hero: a body (skin, outfit, legs) and a hair layer drawn on top, in four directions. "right" is "left" turned around. -----
const SKIN = 'style="fill:var(--hero-skin,#F2C9A0)"', HAIR = 'style="fill:var(--hero-hair,#5B3A1E)"', SHIRT = 'style="fill:var(--hero-outfit,#3B82F6)"';
const PANTS = 'fill="#334155"';
const flip = (body) => '<g transform="translate(100 0) scale(-1 1)">' + body + '</g>';
const limb = (x, y, w, h, look) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5" ' + look + ' ' + outline + '/>';
function legs(frame, side) {
  const a = frame ? 10 : 0, b = frame ? 0 : 10;          // the two legs swap length when stepping
  return side ? limb(40, 76, 14, 16 + a, PANTS) + limb(48, 76, 14, 16 + b, PANTS) : limb(34, 76, 14, 16 + a, PANTS) + limb(52, 76, 14, 16 + b, PANTS);
}
function bodyOf(dir, frame) {
  const side = dir === 'left';
  const torso = '<rect x="30" y="52" width="40" height="30" rx="9" ' + SHIRT + ' ' + outline + '/>';
  const arms = side ? limb(42, 56, 14, 22, SHIRT) : limb(20, 56, 13, 22, SHIRT) + limb(67, 56, 13, 22, SHIRT);
  const head = '<circle cx="' + (side ? 46 : 50) + '" cy="32" r="22" ' + SKIN + ' ' + outline + '/>';
  const eye = (x) => '<circle cx="' + x + '" cy="36" r="3.5" fill="' + INK + '"/>';
  const smile = (x) => '<path d="M' + x + ' 46q5 4 10 0" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
  const face = dir === 'down' ? eye(41) + eye(59) + smile(45) : side ? eye(34) + smile(32) : '';
  return legs(frame, side) + torso + (side ? '' : arms) + head + face + (side ? arms : '');
}
// Hair: 0 short, 1 long, 2 spiky, 3 ponytail. Each covers the top of the head; from behind it covers all of it.
function hairOf(style, dir) {
  const side = dir === 'left', back = dir === 'up', cx = side ? 46 : 50;
  const cap = back
    ? '<circle cx="' + cx + '" cy="32" r="22.5" ' + HAIR + ' ' + outline + '/>'
    : '<path d="M' + (cx - 22) + ' 34A22 22 0 0 1 ' + (cx + 22) + ' 34Q' + (cx + 12) + ' 20 ' + cx + ' 24Q' + (cx - 12) + ' 20 ' + (cx - 22) + ' 34Z" ' + HAIR + ' ' + outline + '/>';
  if (style === 0) return cap;
  if (style === 1) return cap + (back
    ? '<rect x="' + (cx - 22) + '" y="32" width="44" height="30" rx="12" ' + HAIR + ' ' + outline + '/>'
    : '<rect x="' + (cx - 25) + '" y="30" width="12" height="32" rx="6" ' + HAIR + ' ' + outline + '/><rect x="' + (cx + 13) + '" y="30" width="12" height="32" rx="6" ' + HAIR + ' ' + outline + '/>');
  if (style === 2) return cap + '<path d="M' + (cx - 18) + ' 20L' + (cx - 12) + ' 4L' + (cx - 4) + ' 18L' + cx + ' 2L' + (cx + 5) + ' 18L' + (cx + 13) + ' 4L' + (cx + 18) + ' 20Z" ' + HAIR + ' ' + outline + '/>';
  return cap + '<circle cx="' + (cx + 24) + '" cy="' + (back ? 30 : 22) + '" r="10" ' + HAIR + ' ' + outline + '/>';
}
const HERO_BODIES = {};
for (const dir of ['down', 'up', 'left', 'right']) {
  for (const frame of [0, 1]) HERO_BODIES['p-body-' + dir + '-' + frame] = dir === 'right' ? flip(bodyOf('left', frame)) : bodyOf(dir, frame);
  for (const style of [0, 1, 2, 3]) HERO_BODIES['p-hair-' + style + '-' + dir] = dir === 'right' ? flip(hairOf(style, 'left')) : hairOf(style, dir);
}

const OBJECT_BODIES = {
  'o-paw': '<ellipse cx="50" cy="68" rx="22" ry="18" fill="#A16207" ' + outline + '/>' + [[22, 42], [38, 24], [62, 24], [78, 42]].map((p) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="#A16207" ' + outline + '/>').join('')
};

export const WORLD = {};
for (const bodies of [TILE_BODIES, HERO_BODIES, OBJECT_BODIES]) for (const id of Object.keys(bodies)) WORLD[id] = wrap(bodies[id]);
