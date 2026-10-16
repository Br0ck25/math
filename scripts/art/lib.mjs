// Shared parts for the generated buddy pictures: colours, faces and accessories.
// House style (matches the hand-made pictures in art/buddies): 100x100 viewBox, thick dark outlines, flat colours,
// big eyes with a white highlight, a little blush, transparent background.

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
function rgb(hex) { const h = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
function hexOf(r, g, b) { return '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join(''); }
export const darken = (hex, f) => { const [r, g, b] = rgb(hex); return hexOf(r * (1 - f), g * (1 - f), b * (1 - f)); };
export const lighten = (hex, f) => { const [r, g, b] = rgb(hex); return hexOf(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f); };

// A palette from one main colour: outline (dark version), belly/muzzle (light version), accent and eye colour can be overridden.
export function palette(main, o = {}) {
  return { a: main, b: o.light || lighten(main, 0.6), c: o.accent || darken(main, 0.25), o: o.line || darken(main, 0.66), e: o.eye || '#1E293B', k: o.inner || lighten(main, 0.35), x: o.x || '#F472B6' };
}
const W = (w) => `stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
export const st = (p, w = 3) => `stroke="${p.o}" ${W(w)}`;

export function ell(cx, cy, rx, ry, fill, p, w = 3) { return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${st(p, w)}/>`; }
export function circ(cx, cy, r, fill, p, w = 3) { return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${st(p, w)}/>`; }
export function path(d, fill, p, w = 3) { return `<path d="${d}" fill="${fill}" ${st(p, w)}/>`; }
export function poly(points, fill, p, w = 3) { return `<polygon points="${points}" fill="${fill}" ${st(p, w)}/>`; }
export function line(d, color, w = 2.2) { return `<path d="${d}" fill="none" stroke="${color}" ${W(w)}/>`; }
export function dot(cx, cy, r, fill) { return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`; }

// Two big eyes. o: {cx, y, dx, r, mood, iris}. mood: happy (default), calm, sleepy, fierce.
export function eyes(p, o = {}) {
  const { cx = 50, y = 50, dx = 12, r = 5.4, mood = 'happy', iris } = o;
  const eye = (x, s) => {
    let g = `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.18}" fill="#FFFFFF" stroke="${p.o}" ${W(2.2)}/>`;
    if (iris) g += `<circle cx="${x + s * 0.4}" cy="${y + 1}" r="${r * 0.72}" fill="${iris}"/>`;
    g += `<circle cx="${x + s * 0.4}" cy="${y + 1}" r="${r * (iris ? 0.4 : 0.58)}" fill="${p.e}"/><circle cx="${x - s * 0.9}" cy="${y - 1.2}" r="${r * 0.2}" fill="#FFFFFF"/>`;
    if (mood === 'sleepy') g += `<path d="M ${x - r - 1} ${y + 0.5} A ${r + 1} ${r * 1.18 + 1} 0 0 1 ${x + r + 1} ${y + 0.5} Z" fill="${p.a}" stroke="${p.o}" ${W(2)}/>`;
    if (mood === 'fierce') g += `<path d="M ${x - s * (r + 1)} ${y - r - 5} L ${x + s * r} ${y - r + 1}" fill="none" stroke="${p.o}" ${W(3)}/>`;
    if (mood === 'calm') g += `<path d="M ${x - r - 1} ${y - r - 1} Q ${x} ${y - r - 4} ${x + r + 1} ${y - r - 1}" fill="none" stroke="${p.o}" ${W(2.2)}/>`;
    return g;
  };
  return eye(cx - dx, -1) + eye(cx + dx, 1);
}
export const blush = (p, cx = 50, y = 62, dx = 20, r = 4) => `<circle cx="${cx - dx}" cy="${y}" r="${r}" fill="${p.x}" opacity="0.45"/><circle cx="${cx + dx}" cy="${y}" r="${r}" fill="${p.x}" opacity="0.45"/>`;
export const smile = (p, cx = 50, y = 68, w = 6, open = false) => open
  ? `<path d="M ${cx - w} ${y} Q ${cx} ${y + w * 1.3} ${cx + w} ${y} Z" fill="#9F1239" stroke="${p.o}" ${W(2)}/>`
  : line(`M ${cx - w} ${y} Q ${cx} ${y + w * 0.9} ${cx + w} ${y}`, p.o, 2.4);
export const noseDot = (p, cx = 50, y = 59, r = 3.2, fill) => `<ellipse cx="${cx}" cy="${y}" rx="${r}" ry="${r * 0.75}" fill="${fill || p.o}"/><ellipse cx="${cx - r * 0.35}" cy="${y - r * 0.3}" rx="${r * 0.35}" ry="${r * 0.2}" fill="#FFFFFF" opacity="0.6"/>`;
export const whiskers = (p, cx = 50, y = 64, dx = 14) => line(`M ${cx - dx} ${y} L ${cx - dx - 12} ${y - 3}`, p.o, 1.6) + line(`M ${cx - dx} ${y + 3} L ${cx - dx - 12} ${y + 5}`, p.o, 1.6) + line(`M ${cx + dx} ${y} L ${cx + dx + 12} ${y - 3}`, p.o, 1.6) + line(`M ${cx + dx} ${y + 3} L ${cx + dx + 12} ${y + 5}`, p.o, 1.6);
// Shoulders under the head, so every picture reads as a bust like the hand-made ones.
export const shoulders = (p, fill, y = 78) => `<path d="M 18 96 C 20 ${y + 4} 32 ${y} 50 ${y} C 68 ${y} 80 ${y + 4} 82 96 Z" fill="${fill}" ${st(p, 3)}/>`;

// ---------- accessories: drawn last. a = {x, y, w, ey, ny}: the head's top-centre, its width, the eye line and the neck line ----------
export const ACC = {
  crown: ({ x, y, w }) => `<polygon points="${x - w * 0.28},${y + 4} ${x - w * 0.3},${y - 10} ${x - w * 0.14},${y - 3} ${x},${y - 13} ${x + w * 0.14},${y - 3} ${x + w * 0.3},${y - 10} ${x + w * 0.28},${y + 4}" fill="#FACC15" stroke="#92400E" ${W(2.6)}/><circle cx="${x}" cy="${y - 1}" r="2.2" fill="#DC2626" stroke="#7F1D1D" stroke-width="1"/>`,
  bow: ({ x, y, w }) => `<path d="M ${x + w * 0.2} ${y + 3} L ${x + w * 0.4} ${y - 5} L ${x + w * 0.4} ${y + 11} Z M ${x + w * 0.2} ${y + 3} L ${x} ${y - 5} L ${x} ${y + 11} Z" fill="#EC4899" stroke="#9D174D" ${W(2.2)}/><circle cx="${x + w * 0.2}" cy="${y + 3}" r="2.6" fill="#F9A8D4" stroke="#9D174D" stroke-width="1.6"/>`,
  flower: ({ x, y, w }) => { const cx = x + w * 0.24, cy = y + 4; return [[0, -5], [5, -1.5], [3, 4], [-3, 4], [-5, -1.5]].map(([a, b]) => `<circle cx="${cx + a}" cy="${cy + b}" r="3.6" fill="#F472B6" stroke="#9D174D" stroke-width="1.4"/>`).join('') + `<circle cx="${cx}" cy="${cy}" r="3" fill="#FACC15" stroke="#92400E" stroke-width="1.2"/>`; },
  halo: ({ x, y }) => `<ellipse cx="${x}" cy="${y - 6}" rx="13" ry="4.2" fill="none" stroke="#92400E" stroke-width="4.6"/><ellipse cx="${x}" cy="${y - 6}" rx="13" ry="4.2" fill="none" stroke="#FACC15" stroke-width="2.6"/>`,
  star: ({ x, y }) => `<polygon points="${x},${y + 4} ${x + 2.4},${y + 9.5} ${x + 8},${y + 9.8} ${x + 3.6},${y + 13.4} ${x + 5.2},${y + 19} ${x},${y + 15.6} ${x - 5.2},${y + 19} ${x - 3.6},${y + 13.4} ${x - 8},${y + 9.8} ${x - 2.4},${y + 9.5}" fill="#FDE047" stroke="#92400E" stroke-width="1.6" stroke-linejoin="round"/>`,
  bolt: ({ x, y }) => `<polygon points="${x + 3},${y + 3} ${x - 4},${y + 13} ${x},${y + 13} ${x - 3},${y + 22} ${x + 6},${y + 10} ${x + 1},${y + 10}" fill="#FDE047" stroke="#92400E" stroke-width="1.6" stroke-linejoin="round"/>`,
  flame: ({ x, y }) => `<path d="M ${x - 8} ${y + 6} C ${x - 10} ${y - 4} ${x - 2} ${y - 6} ${x - 3} ${y - 14} C ${x + 3} ${y - 8} ${x + 2} ${y - 4} ${x + 4} ${y - 8} C ${x + 10} ${y - 2} ${x + 9} ${y + 3} ${x + 8} ${y + 6} Z" fill="#F97316" stroke="#9A3412" stroke-width="2.2" stroke-linejoin="round"/><path d="M ${x - 3} ${y + 5} C ${x - 4} ${y} ${x} ${y - 1} ${x} ${y - 6} C ${x + 3} ${y - 2} ${x + 4} ${y + 1} ${x + 3} ${y + 5} Z" fill="#FDE047"/>`,
  moon: ({ x, y }) => `<path d="M ${x + 5} ${y + 3} A 8 8 0 1 0 ${x + 5} ${y + 19} A 6.5 6.5 0 1 1 ${x + 5} ${y + 3} Z" fill="#FEF08A" stroke="#92400E" stroke-width="1.6" stroke-linejoin="round"/>`,
  gem: ({ x, y }) => `<polygon points="${x},${y + 3} ${x + 5},${y + 8} ${x},${y + 15} ${x - 5},${y + 8}" fill="#38BDF8" stroke="#075985" stroke-width="1.8" stroke-linejoin="round"/><line x1="${x - 5}" y1="${y + 8}" x2="${x + 5}" y2="${y + 8}" stroke="#E0F2FE" stroke-width="1.2"/>`,
  leaf: ({ x, y, w }) => `<path d="M ${x + w * 0.14} ${y + 5} C ${x + w * 0.14} ${y - 8} ${x + w * 0.34} ${y - 12} ${x + w * 0.4} ${y - 12} C ${x + w * 0.42} ${y - 2} ${x + w * 0.32} ${y + 6} ${x + w * 0.14} ${y + 5} Z" fill="#4ADE80" stroke="#166534" stroke-width="2.2" stroke-linejoin="round"/>`,
  hat: ({ x, y, w }) => `<path d="M ${x - w * 0.34} ${y + 6} Q ${x} ${y + 12} ${x + w * 0.34} ${y + 6} L ${x + w * 0.12} ${y - 6} Q ${x + w * 0.2} ${y - 16} ${x + w * 0.04} ${y - 22} Q ${x - w * 0.14} ${y - 12} ${x - w * 0.12} ${y - 6} Z" fill="#6D28D9" stroke="#2E1065" stroke-width="2.4" stroke-linejoin="round"/><path d="M ${x - w * 0.12} ${y - 3} Q ${x} ${y + 1} ${x + w * 0.12} ${y - 3}" fill="none" stroke="#FACC15" stroke-width="2.4" stroke-linecap="round"/>`,
  scarf: ({ x, w, ny }) => `<path d="M ${x - w * 0.3} ${ny} Q ${x} ${ny + 9} ${x + w * 0.3} ${ny} L ${x + w * 0.3} ${ny + 8} Q ${x} ${ny + 17} ${x - w * 0.3} ${ny + 8} Z" fill="#EF4444" stroke="#7F1D1D" stroke-width="2.4" stroke-linejoin="round"/><path d="M ${x + w * 0.14} ${ny + 10} L ${x + w * 0.22} ${ny + 21} L ${x + w * 0.08} ${ny + 19} Z" fill="#EF4444" stroke="#7F1D1D" stroke-width="2" stroke-linejoin="round"/>`,
  glasses: ({ x, ey }) => `<circle cx="${x - 12}" cy="${ey}" r="8.6" fill="#BAE6FD" fill-opacity="0.3" stroke="#1E293B" stroke-width="2.4"/><circle cx="${x + 12}" cy="${ey}" r="8.6" fill="#BAE6FD" fill-opacity="0.3" stroke="#1E293B" stroke-width="2.4"/><line x1="${x - 3.4}" y1="${ey}" x2="${x + 3.4}" y2="${ey}" stroke="#1E293B" stroke-width="2.4"/>`,
  bandana: ({ x, y, w }) => `<path d="M ${x - w * 0.34} ${y + 8} Q ${x} ${y - 2} ${x + w * 0.34} ${y + 8} L ${x + w * 0.34} ${y + 15} Q ${x} ${y + 6} ${x - w * 0.34} ${y + 15} Z" fill="#EF4444" stroke="#7F1D1D" stroke-width="2.4" stroke-linejoin="round"/><circle cx="${x - 6}" cy="${y + 9}" r="1.2" fill="#FFFFFF"/><circle cx="${x + 5}" cy="${y + 8.5}" r="1.2" fill="#FFFFFF"/>`,
  ring: ({ x, y, w, ey }) => `<ellipse cx="${x}" cy="${ey + 10}" rx="${w * 0.74}" ry="7" fill="none" stroke="#92400E" stroke-width="6" transform="rotate(-12 ${x} ${ey + 10})"/><ellipse cx="${x}" cy="${ey + 10}" rx="${w * 0.74}" ry="7" fill="none" stroke="#FDE68A" stroke-width="3" transform="rotate(-12 ${x} ${ey + 10})"/>`,
  shell: ({ x, y, w }) => `<path d="M ${x - 9} ${y + 6} C ${x - 12} ${y - 10} ${x + 12} ${y - 10} ${x + 9} ${y + 6} Z" fill="#FDBA74" stroke="#9A3412" stroke-width="2.4" stroke-linejoin="round"/><path d="M ${x} ${y + 5} L ${x} ${y - 6} M ${x - 5} ${y + 5} L ${x - 6} ${y - 4} M ${x + 5} ${y + 5} L ${x + 6} ${y - 4}" stroke="#9A3412" stroke-width="1.4"/>`,
  headband: ({ x, y, w }) => `<path d="M ${x - w * 0.34} ${y + 10} Q ${x} ${y + 1} ${x + w * 0.34} ${y + 10}" fill="none" stroke="#2563EB" stroke-width="5" stroke-linecap="round"/><circle cx="${x}" cy="${y + 5.5}" r="2.4" fill="#FDE047" stroke="#92400E" stroke-width="1.2"/>`
};
export const wrap = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">\n<!-- generated by scripts/make-art.mjs -->\n${inner}\n</svg>\n`;
