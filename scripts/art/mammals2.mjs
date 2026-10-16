// More mammals: every species here has its own silhouette (ears, snout, horns, markings), so no two buddies share a template.
// Same contract as mammals.mjs: (p, o) => { svg, a }.
import { ell, circ, path, poly, line, dot, eyes, blush, smile, noseDot, whiskers, shoulders, st, darken, lighten } from './lib.mjs';

const A = (x = 50, y = 24, w = 60, ey = 50, ny = 80) => ({ x, y, w, ey, ny });
const sh = (p, fill) => shoulders(p, fill || p.c);
const eyz = (p, o = {}) => eyes(p, { y: o.ey || 50, dx: o.dx || 12, r: o.r || 5.4, mood: o.mood || 'happy', iris: o.iris });
const headE = (p, rx = 30, ry = 27, cy = 54, fill) => ell(50, cy, rx, ry, fill || p.a, p);
const spots = (list, fill, r = 2.6) => list.map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s || r}" fill="${fill}"/>`).join('');
const rosettes = (list, fill) => list.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="${fill}" stroke-width="1.8"/><circle cx="${x}" cy="${y}" r="0.9" fill="${fill}"/>`).join('');

export const mammals2 = {
  fennec: (p, o = {}) => ({ svg: sh(p) + path('M 32 46 L 8 2 L 47 33 Z', p.a, p) + path('M 68 46 L 92 2 L 53 33 Z', p.a, p) + path('M 31 40 L 15 11 L 40 33 Z', p.x, p, 0) + path('M 69 40 L 85 11 L 60 33 Z', p.x, p, 0)
    + headE(p, 28, 25, 55) + path('M 28 56 C 30 70 42 78 50 78 C 58 78 70 70 72 56 C 64 66 36 66 28 56 Z', p.b, p, 0) + ell(50, 66, 10, 8, p.b, p, 2.2) + noseDot(p, 50, 62, 3.4) + smile(p, 50, 69, 5)
    + eyes(p, { y: 51, dx: 12, r: 6.4 }) + line('M 22 50 L 16 47 M 78 50 L 84 47', p.o, 2.2) + blush(p, 50, 63, 21, 3.4), a: A(50, 20, 56, 51) }),

  platypus: (p, o = {}) => ({ svg: sh(p) + circ(23, 40, 6, p.a, p) + circ(77, 40, 6, p.a, p) + headE(p, 31, 24, 50)
    + `<path d="M 18 62 C 18 52 82 52 82 62 C 82 78 66 84 50 84 C 34 84 18 78 18 62 Z" fill="${o.bill || '#475569'}" ${st(p, 3)}/><path d="M 26 62 C 30 58 70 58 74 62" fill="none" stroke="${lighten(o.bill || '#475569', 0.35)}" stroke-width="2.4" stroke-linecap="round"/>`
    + dot(41, 63, 2.2, p.o) + dot(59, 63, 2.2, p.o) + smile(p, 50, 75, 8) + eyes(p, { y: 46, dx: 16, r: 4.6 }) + blush(p, 50, 56, 26, 3), a: A(50, 28, 60, 46) }),

  porcupine: (p, o = {}) => { let q = ''; for (let i = 0; i < 17; i++) { const t = Math.PI + (i / 16) * Math.PI; const x = 50 + Math.cos(t) * 46, y = 60 + Math.sin(t) * 48; q += `<path d="M ${50 + Math.cos(t) * 24} ${60 + Math.sin(t) * 22} L ${x} ${y}" fill="none" stroke="${p.o}" stroke-width="5.2" stroke-linecap="round"/><path d="M ${50 + Math.cos(t) * 26} ${60 + Math.sin(t) * 24} L ${x} ${y}" fill="none" stroke="${i % 2 ? p.b : (o.quill || p.c)}" stroke-width="2.6" stroke-linecap="round"/>`; }
    return { svg: sh(p) + q + circ(25, 40, 6.5, p.a, p) + circ(75, 40, 6.5, p.a, p) + headE(p, 28, 25, 56) + ell(50, 68, 15, 10, p.b, p, 2.4) + ell(50, 62, 6.4, 5, p.o, p, 0) + dot(48, 60.6, 1.4, '#fff') + smile(p, 50, 72, 5) + eyes(p, { y: 52, dx: 12, r: 4.6 }) + blush(p, 50, 64, 22, 3.2), a: A(50, 18, 56, 52) }; },

  armadillo: (p, o = {}) => { let b = ''; for (let i = 0; i < 4; i++) b += `<path d="M ${16 + i * 3} ${74 + i * 5} Q 50 ${64 + i * 5} ${84 - i * 3} ${74 + i * 5}" fill="none" stroke="${p.o}" stroke-width="2.4"/>`;
    return { svg: `<path d="M 10 96 C 12 70 30 62 50 62 C 70 62 88 70 90 96 Z" fill="${p.c}" ${st(p, 3)}/>` + b + path('M 22 54 L 8 44 L 28 36 Z', p.a, p) + path('M 78 54 L 92 44 L 72 36 Z', p.a, p)
      + path('M 20 50 C 20 24 80 24 80 50 C 80 56 70 52 50 52 C 30 52 20 56 20 50 Z', p.c, p) + `<path d="M 28 36 L 30 48 M 40 30 L 41 47 M 50 28 L 50 47 M 60 30 L 59 47 M 72 36 L 70 48" stroke="${p.o}" stroke-width="2.2" stroke-linecap="round"/>`
      + path('M 24 54 C 24 52 76 52 76 54 C 76 74 62 84 50 86 C 38 84 24 74 24 54 Z', p.a, p) + path('M 38 62 C 40 58 60 58 62 62 C 62 74 56 80 50 80 C 44 80 38 74 38 62 Z', p.b, p, 2) + noseDot(p, 50, 72, 3.6) + smile(p, 50, 77, 4.4) + eyes(p, { y: 57, dx: 13, r: 4.8 }), a: A(50, 28, 56, 57, 84) }; },

  polarbear: (p, o = {}) => ({ svg: sh(p) + circ(30, 31, 7, p.a, p) + circ(70, 31, 7, p.a, p) + circ(30, 32, 3.4, p.x, p, 0) + circ(70, 32, 3.4, p.x, p, 0) + ell(50, 52, 29, 24, p.a, p)
    + ell(50, 68, 17, 14, p.b, p, 2.6) + `<path d="M 42 62 C 42 57 58 57 58 62 C 58 67 54 69 50 69 C 46 69 42 67 42 62 Z" fill="#1F2937"/><circle cx="47" cy="60.4" r="1.2" fill="#fff"/>` + line('M 50 69 L 50 73', p.o, 2) + smile(p, 50, 73, 5) + eyes(p, { y: 47, dx: 13, r: 4.4 }), a: A(50, 26, 58, 47) }),

  redpanda: (p, o = {}) => ({ svg: sh(p, darken(p.a, 0.4)) + path('M 24 44 L 20 22 L 40 34 Z', p.a, p) + path('M 76 44 L 80 22 L 60 34 Z', p.a, p) + path('M 25 40 L 23 28 L 34 35 Z', '#FFFFFF', p, 0) + path('M 75 40 L 77 28 L 66 35 Z', '#FFFFFF', p, 0)
    + headE(p, 31, 26, 55) + path('M 20 56 C 18 44 30 46 30 54 C 34 64 24 68 20 56 Z', '#FFFFFF', p, 2) + path('M 80 56 C 82 44 70 46 70 54 C 66 64 76 68 80 56 Z', '#FFFFFF', p, 2)
    + ell(50, 67, 15, 11, '#FFFFFF', p, 2.4) + path('M 36 48 C 34 56 36 62 40 64 M 64 48 C 66 56 64 62 60 64', p.c, p, 0).replace('fill="' + p.c + '"', 'fill="none"') + `<g fill="none" stroke="${p.c}" stroke-width="4" stroke-linecap="round"><path d="M 36 46 C 34 54 36 60 40 62"/><path d="M 64 46 C 66 54 64 60 60 62"/></g>`
    + noseDot(p, 50, 62, 3.8, '#1F2937') + smile(p, 50, 69, 5) + eyes(p, { y: 50, dx: 12, r: 4.8 }), a: A(50, 22, 60, 50) }),

  wombat: (p, o = {}) => ({ svg: sh(p) + circ(27, 36, 6, p.a, p) + circ(73, 36, 6, p.a, p) + path('M 18 56 C 16 30 84 30 82 56 C 84 80 66 84 50 84 C 34 84 16 80 18 56 Z', p.a, p) + ell(50, 68, 19, 13, p.b, p, 2.4)
    + path('M 38 60 C 38 54 62 54 62 60 C 62 67 56 69 50 69 C 44 69 38 67 38 60 Z', '#3B2A1D', p, 0) + circ(46, 59, 1.4, '#fff', p, 0) + smile(p, 50, 75, 5) + eyes(p, { y: 46, dx: 17, r: 3.8, mood: 'calm' }), a: A(50, 26, 60, 46) }),

  snowleopard: (p, o = {}) => ({ svg: `<path d="M 78 96 C 94 90 94 66 82 60" fill="none" stroke="${p.o}" stroke-width="12" stroke-linecap="round"/><path d="M 78 96 C 94 90 94 66 82 60" fill="none" stroke="${p.a}" stroke-width="7" stroke-linecap="round"/>` + sh(p, p.b) + circ(27, 35, 8, p.a, p) + circ(73, 35, 8, p.a, p) + circ(27, 36, 3.6, '#1F2937', p, 0) + circ(73, 36, 3.6, '#1F2937', p, 0)
    + path('M 14 54 C 10 44 18 36 22 40 C 24 28 76 28 78 40 C 82 36 90 44 86 54 C 88 70 70 84 50 84 C 30 84 12 70 14 54 Z', p.a, p) + rosettes([[32, 40], [68, 40], [24, 58], [76, 58], [50, 33]], p.c) + ell(50, 66, 14, 10, '#FFFFFF', p, 2.4) + noseDot(p, 50, 61, 3.6, p.x) + line('M 50 63 L 50 67 M 50 67 Q 46 71 43 68 M 50 67 Q 54 71 57 68', p.o, 2) + eyes(p, { y: 50, dx: 12, r: 5, iris: o.iris || '#A7F3D0' }), a: A(50, 26, 62, 50) }),

  cheetah: (p, o = {}) => ({ svg: sh(p) + circ(29, 35, 7, p.a, p) + circ(71, 35, 7, p.a, p) + circ(29, 36, 3, '#1F2937', p, 0) + circ(71, 36, 3, '#1F2937', p, 0) + ell(50, 54, 26, 26, p.a, p)
    + path('M 24 56 C 28 72 38 80 50 80 C 62 80 72 72 76 56 C 66 68 34 68 24 56 Z', p.b, p, 0) + ell(50, 67, 11, 8, p.b, p, 2.2) + noseDot(p, 50, 61, 3.4, '#1F2937') + line('M 50 63 L 50 67', p.o, 2) + smile(p, 50, 69, 4.6)
    + spots([[36, 36], [44, 32], [56, 32], [64, 36], [30, 46], [70, 46], [50, 38], [46, 42], [54, 42]], p.o, 2) + `<g fill="none" stroke="#1F2937" stroke-width="3.6" stroke-linecap="round"><path d="M 38 56 C 34 62 32 68 34 72"/><path d="M 62 56 C 66 62 68 68 66 72"/></g>` + eyes(p, { y: 50, dx: 12, r: 4.8, iris: '#F59E0B' }), a: A(50, 28, 52, 50) }),

  lioncub: (p, o = {}) => ({ svg: sh(p) + circ(22, 38, 9, p.a, p) + circ(78, 38, 9, p.a, p) + circ(22, 38, 4.4, p.x, p, 0) + circ(78, 38, 4.4, p.x, p, 0) + headE(p, 33, 29, 55)
    + `<path d="M 40 30 C 38 20 46 16 50 22 C 54 16 62 20 60 30 C 56 26 44 26 40 30 Z" fill="${o.mane || p.c}" ${st(p, 2.6)}/>` + ell(50, 68, 14, 10, p.b, p, 2.4) + `<polygon points="50,62 46,58 54,58" fill="${p.x}" stroke="${p.o}" stroke-width="1.6" stroke-linejoin="round"/>` + line('M 50 62 L 50 67', p.o, 2) + smile(p, 50, 69, 5) + eyes(p, { y: 52, dx: 13, r: 6.4 }) + blush(p, 50, 64, 23, 4), a: A(50, 22, 66, 52) }),

  sunlion: (p, o = {}) => { let m = ''; for (let i = 0; i < 14; i++) { const t = (i / 14) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t); m += `<path d="M ${50 + c * 22} ${52 + s * 21} Q ${50 + c * 40 - s * 8} ${52 + s * 38 + c * 8} ${50 + c * 46} ${52 + s * 44} Q ${50 + c * 38 + s * 9} ${52 + s * 34 - c * 9} ${50 + c * 22} ${52 + s * 21} Z" fill="${i % 2 ? '#FACC15' : '#F97316'}" ${st(p, 2.4)}/>`; }
    return { svg: sh(p) + m + circ(30, 34, 8, p.a, p) + circ(70, 34, 8, p.a, p) + headE(p, 24, 22, 54) + ell(50, 64, 12, 9, p.b, p, 2.2) + `<polygon points="50,58 46,54 54,54" fill="${p.x}" stroke="${p.o}" stroke-width="1.6" stroke-linejoin="round"/>` + smile(p, 50, 67, 5) + eyes(p, { y: 49, dx: 10, r: 4.6 }), a: A(50, 20, 62, 49) }; },

  flyingfox: (p, o = {}) => ({ svg: `<path d="M 4 70 C 2 50 14 40 26 44 L 30 80 Z" fill="${p.c}" ${st(p, 3)}/><path d="M 96 70 C 98 50 86 40 74 44 L 70 80 Z" fill="${p.c}" ${st(p, 3)}/>` + sh(p, o.mantle || '#F59E0B') + path('M 32 44 L 28 22 L 46 34 Z', p.a, p) + path('M 68 44 L 72 22 L 54 34 Z', p.a, p)
    + path('M 18 54 C 22 34 78 34 82 54 C 78 74 64 82 50 82 C 36 82 22 74 18 54 Z', p.a, p) + ell(50, 66, 14, 11, p.b, p, 2.4) + noseDot(p, 50, 61, 4, '#1F2937') + smile(p, 50, 70, 5) + eyes(p, { y: 50, dx: 12, r: 5.6, iris: '#F59E0B' }) + blush(p, 50, 62, 22, 3.4), a: A(50, 24, 56, 50) }),

  longear: (p, o = {}) => ({ svg: `<path d="M 6 64 C 6 48 16 44 24 50 L 30 80 Z" fill="${p.c}" ${st(p, 3)}/><path d="M 94 64 C 94 48 84 44 76 50 L 70 80 Z" fill="${p.c}" ${st(p, 3)}/>` + sh(p)
    + `<path d="M 36 50 C 22 38 22 12 32 2 C 40 16 46 30 46 44 Z" fill="${p.a}" ${st(p, 3)}/><path d="M 64 50 C 78 38 78 12 68 2 C 60 16 54 30 54 44 Z" fill="${p.a}" ${st(p, 3)}/><path d="M 32 40 C 28 30 28 20 32 10 M 68 40 C 72 30 72 20 68 10" fill="none" stroke="${p.k}" stroke-width="2.4" stroke-linecap="round"/>`
    + ell(50, 62, 22, 20, p.a, p) + ell(50, 70, 11, 8, p.b, p, 2.2) + noseDot(p, 50, 67, 3, p.x) + path('M 44 74 Q 50 80 56 74 L 54 78 L 52 75 L 50 78 L 48 75 L 46 78 Z', '#fff', p, 1.4) + eyes(p, { y: 58, dx: 10, r: 5 }), a: A(50, 36, 44, 58) }),

  horseshoe: (p, o = {}) => ({ svg: `<path d="M 24 56 C 10 44 4 30 2 18 C 12 22 18 20 24 14 C 26 22 30 28 34 32 Z" fill="${p.c}" ${st(p, 3)}/><path d="M 76 56 C 90 44 96 30 98 18 C 88 22 82 20 76 14 C 74 22 70 28 66 32 Z" fill="${p.c}" ${st(p, 3)}/>` + sh(p)
    + path('M 28 46 C 20 36 22 22 32 18 C 38 28 40 36 40 44 Z', p.a, p) + path('M 72 46 C 80 36 78 22 68 18 C 62 28 60 36 60 44 Z', p.a, p) + ell(50, 58, 26, 22, p.a, p)
    + `<path d="M 36 60 C 34 50 44 46 50 50 C 56 46 66 50 64 60 C 62 68 54 70 50 66 C 46 70 38 68 36 60 Z" fill="${o.nose || p.x}" ${st(p, 2.6)}/><circle cx="45" cy="60" r="2.2" fill="${p.o}"/><circle cx="55" cy="60" r="2.2" fill="${p.o}"/>` + `<path d="M 42 72 Q 50 78 58 72" fill="none" stroke="${p.o}" stroke-width="2.4" stroke-linecap="round"/>` + eyes(p, { y: 46, dx: 14, r: 3.4 }), a: A(50, 32, 52, 46) }),

  sugarglider: (p, o = {}) => ({ svg: `<path d="M 4 78 C 2 56 12 44 28 50 L 30 84 Z" fill="${p.b}" ${st(p, 3)}/><path d="M 96 78 C 98 56 88 44 72 50 L 70 84 Z" fill="${p.b}" ${st(p, 3)}/>` + sh(p, p.b) + circ(22, 36, 10, p.a, p) + circ(78, 36, 10, p.a, p) + circ(22, 36, 5, p.x, p, 0) + circ(78, 36, 5, p.x, p, 0)
    + ell(50, 56, 27, 25, p.a, p) + `<path d="M 50 32 L 50 52" stroke="${p.o}" stroke-width="3.4" stroke-linecap="round"/><ellipse cx="50" cy="68" rx="12" ry="9" fill="${p.b}" stroke="${p.o}" stroke-width="2.2"/>` + noseDot(p, 50, 63, 3) + smile(p, 50, 71, 4.4) + eyes(p, { y: 52, dx: 12, r: 7.4 }), a: A(50, 28, 56, 52) }),

  moose: (p, o = {}) => ({ svg: sh(p) + `<g fill="${o.antler || '#B7791F'}" stroke="${p.o}" stroke-width="3" stroke-linejoin="round"><path d="M 28 34 C 14 36 2 28 4 14 C 10 12 14 18 18 14 C 22 10 24 18 26 12 C 30 20 36 26 36 34 Z"/><path d="M 72 34 C 86 36 98 28 96 14 C 90 12 86 18 82 14 C 78 10 76 18 74 12 C 70 20 64 26 64 34 Z"/></g>`
    + ellipsesEars(p) + path('M 24 48 C 24 32 76 32 76 48 C 78 62 70 66 66 74 C 62 90 38 90 34 74 C 30 66 22 62 24 48 Z', p.a, p) + ell(50, 72, 15, 12, p.c, p, 2.4) + dot(44, 70, 2, p.o) + dot(56, 70, 2, p.o)
    + `<path d="M 44 86 C 42 94 50 98 50 98 C 50 98 58 94 56 86" fill="${p.c}" ${st(p, 2.4)}/>` + eyes(p, { y: 48, dx: 14, r: 4.4 }), a: A(50, 26, 56, 48, 88) }),

  kudu: (p, o = {}) => ({ svg: sh(p) + `<g fill="none" stroke-linecap="round"><path d="M 36 32 C 24 24 40 14 30 4 C 22 -2 28 10 22 8" stroke="${p.o}" stroke-width="7"/><path d="M 64 32 C 76 24 60 14 70 4 C 78 -2 72 10 78 8" stroke="${p.o}" stroke-width="7"/><path d="M 36 32 C 24 24 40 14 30 4 C 22 -2 28 10 22 8" stroke="${o.horn || '#FDE68A'}" stroke-width="3.6"/><path d="M 64 32 C 76 24 60 14 70 4 C 78 -2 72 10 78 8" stroke="${o.horn || '#FDE68A'}" stroke-width="3.6"/></g>`
    + `<ellipse cx="18" cy="46" rx="13" ry="7" transform="rotate(-24 18 46)" fill="${p.a}" ${st(p, 3)}/><ellipse cx="82" cy="46" rx="13" ry="7" transform="rotate(24 82 46)" fill="${p.a}" ${st(p, 3)}/>` + path('M 28 40 C 30 30 70 30 72 40 C 74 56 62 76 50 82 C 38 76 26 56 28 40 Z', p.a, p) + `<path d="M 36 44 L 50 52 L 64 44" fill="none" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round"/><ellipse cx="50" cy="70" rx="9" ry="7" fill="${p.b}" ${st(p, 2.2)}/>` + noseDot(p, 50, 68, 3.2) + eyes(p, { y: 52, dx: 11, r: 4.6 }), a: A(50, 28, 44, 52) }),

  mandrill: (p, o = {}) => ({ svg: sh(p) + circ(21, 52, 9, p.a, p) + circ(79, 52, 9, p.a, p) + headE(p, 28, 25, 50) + path('M 22 50 C 22 40 78 40 78 50 C 80 62 70 70 50 70 C 30 70 20 62 22 50 Z', p.a, p, 0)
    + `<path d="M 42 52 L 58 52 L 58 66 C 58 74 42 74 42 66 Z" fill="${o.nose || '#EF4444'}" ${st(p, 2.4)}/><path d="M 34 52 C 30 60 32 68 38 72 L 42 66 L 42 54 Z M 66 52 C 70 60 68 68 62 72 L 58 66 L 58 54 Z" fill="#3B82F6" ${st(p, 2.2)}/>` + path('M 32 76 C 38 92 62 92 68 76 C 60 82 40 82 32 76 Z', '#FDE047', p, 2.4) + dot(46, 66, 1.6, p.o) + dot(54, 66, 1.6, p.o) + eyes(p, { y: 46, dx: 11, r: 4.4, mood: 'fierce' }), a: A(50, 25, 56, 46) }),

  tarsier: (p, o = {}) => ({ svg: sh(p) + `<ellipse cx="20" cy="44" rx="10" ry="14" transform="rotate(-16 20 44)" fill="${p.a}" ${st(p, 3)}/><ellipse cx="80" cy="44" rx="10" ry="14" transform="rotate(16 80 44)" fill="${p.a}" ${st(p, 3)}/><ellipse cx="21" cy="44" rx="5" ry="9" transform="rotate(-16 21 44)" fill="${p.x}"/><ellipse cx="79" cy="44" rx="5" ry="9" transform="rotate(16 79 44)" fill="${p.x}"/>` + ell(50, 56, 27, 24, p.a, p)
    + `<circle cx="36" cy="50" r="13" fill="#fff" ${st(p, 2.6)}/><circle cx="64" cy="50" r="13" fill="#fff" ${st(p, 2.6)}/><circle cx="37" cy="51" r="9" fill="${o.iris || '#B45309'}"/><circle cx="63" cy="51" r="9" fill="${o.iris || '#B45309'}"/><circle cx="37" cy="51" r="5" fill="${p.e}"/><circle cx="63" cy="51" r="5" fill="${p.e}"/><circle cx="34" cy="47" r="2.2" fill="#fff"/><circle cx="60" cy="47" r="2.2" fill="#fff"/>`
    + noseDot(p, 50, 66, 2.8, p.x) + smile(p, 50, 71, 4), a: A(50, 32, 56, 50) }),

  capybara: (p, o = {}) => ({ svg: sh(p) + circ(24, 38, 5.4, p.a, p) + circ(76, 38, 5.4, p.a, p) + path('M 18 54 C 16 34 84 34 82 54 C 84 76 70 84 50 84 C 30 84 16 76 18 54 Z', p.a, p) + path('M 30 62 C 30 56 70 56 70 62 C 72 76 62 82 50 82 C 38 82 28 76 30 62 Z', p.c, p, 2.4) + `<ellipse cx="50" cy="63" rx="17" ry="7" fill="#3B2A1D"/>` + dot(43, 62, 2, '#000') + dot(57, 62, 2, '#000') + smile(p, 50, 73, 6) + eyes(p, { y: 48, dx: 14, r: 3.6, mood: 'sleepy' }), a: A(50, 28, 62, 48) }),

  guineapig: (p, o = {}) => ({ svg: sh(p) + `<path d="M 24 44 C 14 40 14 28 26 30 C 32 32 34 38 34 44 Z" fill="${p.x}" ${st(p, 3)}/><path d="M 76 44 C 86 40 86 28 74 30 C 68 32 66 38 66 44 Z" fill="${p.x}" ${st(p, 3)}/>` + ell(50, 56, 31, 27, p.a, p) + path('M 50 31 C 42 40 42 56 38 70 C 44 80 56 80 62 70 C 58 56 58 40 50 31 Z', '#FFFFFF', p, 0) + circ(28, 58, 9, p.c, p, 0) + circ(72, 52, 7, p.c, p, 0)
    + ell(50, 68, 12, 9, p.b, p, 2) + noseDot(p, 50, 63, 3, p.x) + smile(p, 50, 71, 4.4) + eyes(p, { y: 52, dx: 14, r: 5 }) + blush(p, 50, 64, 24, 3.6), a: A(50, 28, 62, 52) }),

  pika: (p, o = {}) => ({ svg: sh(p) + circ(24, 34, 13, p.a, p) + circ(76, 34, 13, p.a, p) + circ(24, 34, 8, p.k, p, 0) + circ(76, 34, 8, p.k, p, 0) + circ(24, 34, 13, 'none', p, 0) + `<path d="M 11 34 A 13 13 0 0 1 37 34" fill="none" stroke="#FFFFFF" stroke-width="2.4"/><path d="M 63 34 A 13 13 0 0 1 89 34" fill="none" stroke="#FFFFFF" stroke-width="2.4"/>` + ell(50, 58, 28, 25, p.a, p)
    + ell(50, 68, 11, 8, p.b, p, 2) + noseDot(p, 50, 62, 3, '#1F2937') + smile(p, 50, 70, 4) + eyes(p, { y: 52, dx: 13, r: 4.6 }) + blush(p, 50, 63, 21, 3.4), a: A(50, 30, 56, 52) }),

  chipmunk: (p, o = {}) => ({ svg: sh(p) + circ(26, 36, 8, p.a, p) + circ(74, 36, 8, p.a, p) + headE(p, 31, 26, 55) + `<g fill="none" stroke-linecap="round"><path d="M 50 30 L 50 48" stroke="#1F2937" stroke-width="3"/><path d="M 40 31 C 38 40 36 46 32 52 M 60 31 C 62 40 64 46 68 52" stroke="#1F2937" stroke-width="3"/><path d="M 45 30 C 44 38 42 44 40 48 M 55 30 C 56 38 58 44 60 48" stroke="#FEF3C7" stroke-width="2.4"/></g>`
    + ell(32, 66, 11, 9, p.b, p, 0) + ell(68, 66, 11, 9, p.b, p, 0) + ell(50, 66, 12, 9, p.b, p, 2.2) + noseDot(p, 50, 61, 3.2) + `<rect x="46.4" y="68" width="3.4" height="5" rx="1" fill="#fff" stroke="${p.o}" stroke-width="1.2"/><rect x="50.2" y="68" width="3.4" height="5" rx="1" fill="#fff" stroke="${p.o}" stroke-width="1.2"/>` + eyes(p, { y: 52, dx: 13, r: 4.8 }), a: A(50, 28, 60, 52) }),

  jerboa: (p, o = {}) => ({ svg: sh(p) + `<ellipse cx="26" cy="36" rx="11" ry="20" transform="rotate(-14 26 36)" fill="${p.a}" ${st(p, 3)}/><ellipse cx="74" cy="36" rx="11" ry="20" transform="rotate(14 74 36)" fill="${p.a}" ${st(p, 3)}/><ellipse cx="26" cy="37" rx="5.4" ry="14" transform="rotate(-14 26 37)" fill="${p.x}"/><ellipse cx="74" cy="37" rx="5.4" ry="14" transform="rotate(14 74 37)" fill="${p.x}"/>`
    + ell(50, 60, 24, 22, p.a, p) + ell(50, 68, 11, 8, p.b, p, 2) + noseDot(p, 50, 64, 3, p.x) + whiskers(p, 50, 66, 9) + smile(p, 50, 72, 3.6) + eyes(p, { y: 55, dx: 11, r: 6.2 }), a: A(50, 38, 48, 55) }),

  bison: (p, o = {}) => ({ svg: sh(p, darken(p.a, 0.3)) + `<path d="M 24 40 C 8 40 6 22 14 16 C 16 24 24 28 30 30 Z" fill="${o.horn || '#FDE68A'}" ${st(p, 3)}/><path d="M 76 40 C 92 40 94 22 86 16 C 84 24 76 28 70 30 Z" fill="${o.horn || '#FDE68A'}" ${st(p, 3)}/>`
    + path('M 12 62 C 4 40 18 20 34 20 C 42 12 58 12 66 20 C 82 20 96 40 88 62 C 90 82 70 92 50 92 C 30 92 10 82 12 62 Z', darken(p.a, 0.3), p) + path('M 28 48 C 28 38 72 38 72 48 C 74 62 66 76 56 80 C 50 82 50 82 44 80 C 34 76 26 62 28 48 Z', p.a, p) + path('M 40 80 C 40 92 60 92 60 80 C 56 84 44 84 40 80 Z', darken(p.a, 0.3), p, 2.4) + ell(50, 68, 12, 8, p.c, p, 2.2) + dot(46, 68, 1.8, p.o) + dot(54, 68, 1.8, p.o) + eyes(p, { y: 50, dx: 12, r: 4, mood: 'fierce' }), a: A(50, 18, 62, 50, 86) }),

  tapir: (p, o = {}) => ({ svg: sh(p) + `<path d="M 20 44 C 14 30 24 24 32 32 L 34 46 Z" fill="${p.a}" ${st(p, 3)}/><path d="M 80 44 C 86 30 76 24 68 32 L 66 46 Z" fill="${p.a}" ${st(p, 3)}/><path d="M 20 38 C 18 32 22 28 26 30 L 28 36 Z" fill="#fff"/><path d="M 80 38 C 82 32 78 28 74 30 L 72 36 Z" fill="#fff"/>`
    + path('M 22 54 C 20 34 80 34 78 54 C 80 74 66 82 50 82 C 34 82 20 74 22 54 Z', p.a, p) + (o.stripes ? `<g fill="none" stroke="${o.stripes}" stroke-width="3.2" stroke-linecap="round"><path d="M 32 40 C 36 44 38 50 38 56 M 68 40 C 64 44 62 50 62 56 M 50 34 L 50 44"/></g>` : '') + path('M 38 62 C 38 54 62 54 62 62 L 62 78 C 62 90 52 92 50 92 C 48 92 38 90 38 78 Z', p.b, p, 2.6) + dot(45, 80, 1.8, p.o) + dot(55, 80, 1.8, p.o) + eyes(p, { y: 50, dx: 15, r: 4 }), a: A(50, 30, 58, 50, 90) }),

  elephant: (p, o = {}) => ({ svg: sh(p) + `<path d="M 28 30 C 4 20 -2 52 10 66 C 18 76 30 72 32 62 Z" fill="${p.a}" ${st(p, 3)}/><path d="M 72 30 C 96 20 102 52 90 66 C 82 76 70 72 68 62 Z" fill="${p.a}" ${st(p, 3)}/><path d="M 24 36 C 12 34 10 52 16 60 M 76 36 C 88 34 90 52 84 60" fill="none" stroke="${p.x}" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`
    + ell(50, 48, 26, 24, p.a, p) + path('M 40 56 C 38 74 38 86 44 92 C 48 96 54 94 54 90 C 56 86 52 82 52 76 L 60 56 Z', p.a, p, 3) + `<path d="M 42 64 L 52 64 M 42 72 L 50 72 M 42 80 L 49 80" stroke="${p.o}" stroke-width="1.6" stroke-linecap="round"/><path d="M 34 62 C 28 70 30 80 36 82 C 38 76 38 70 40 66 Z M 66 62 C 72 70 70 80 64 82 C 62 76 62 70 60 66 Z" fill="#FFF7E0" ${st(p, 2.4)}/>` + eyes(p, { y: 44, dx: 12, r: 4.4 }), a: A(50, 24, 58, 44) }),

  persian: (p, o = {}) => ({ svg: sh(p, p.b) + path('M 24 44 L 22 24 L 40 36 Z', p.a, p) + path('M 76 44 L 78 24 L 60 36 Z', p.a, p) + path('M 24 40 L 24 30 L 33 37 Z', p.x, p, 0) + path('M 76 40 L 76 30 L 67 37 Z', p.x, p, 0)
    + path('M 12 58 C 8 46 16 38 22 42 C 24 30 76 30 78 42 C 84 38 92 46 88 58 C 92 70 84 76 78 76 C 76 88 24 88 22 76 C 16 76 8 70 12 58 Z', p.a, p) + ell(50, 60, 17, 14, p.b, p, 2.2) + `<path d="M 45 58 L 55 58 L 50 63 Z" fill="${p.x}" ${st(p, 1.6)}/>` + smile(p, 50, 67, 4.6) + whiskers(p, 50, 64, 10) + eyes(p, { y: 50, dx: 13, r: 6, iris: o.iris || '#F59E0B' }), a: A(50, 28, 66, 50) }),

  husky: (p, o = {}) => ({ svg: sh(p, p.c) + path('M 24 46 L 22 22 L 42 34 Z', p.c, p) + path('M 76 46 L 78 22 L 58 34 Z', p.c, p) + path('M 27 40 L 26 28 L 36 35 Z', p.b, p, 0) + path('M 73 40 L 74 28 L 64 35 Z', p.b, p, 0) + path('M 20 52 C 22 32 78 32 80 52 C 80 70 66 82 50 84 C 34 82 20 70 20 52 Z', p.c, p)
    + path('M 50 34 C 40 38 36 46 38 58 L 28 62 C 36 80 64 80 72 62 L 62 58 C 64 46 60 38 50 34 Z', p.b, p, 0) + path('M 50 34 L 46 52 L 54 52 Z', p.c, p, 0) + ell(50, 66, 13, 10, p.b, p, 2.2) + noseDot(p, 50, 61, 3.8) + smile(p, 50, 70, 5, true) + eyes(p, { y: 49, dx: 12, r: 4.8, iris: o.iris || '#7DD3FC' }), a: A(50, 24, 60, 49) }),

  jackal: (p, o = {}) => ({ svg: sh(p, p.c) + path('M 28 46 L 20 -2 L 44 30 Z', p.a, p) + path('M 72 46 L 80 -2 L 56 30 Z', p.a, p) + path('M 29 36 L 22 8 L 38 28 Z', p.k, p, 0) + path('M 71 36 L 78 8 L 62 28 Z', p.k, p, 0) + path('M 22 54 C 24 36 76 36 78 54 C 76 66 62 72 56 80 C 52 86 48 86 44 80 C 38 72 24 66 22 54 Z', p.a, p)
    + path('M 40 62 C 42 56 58 56 60 62 C 60 74 56 82 50 84 C 44 82 40 74 40 62 Z', p.b, p, 2.2) + noseDot(p, 50, 80, 3.6) + (o.scar ? line('M 62 40 L 70 54', '#B91C1C', 2.6) : '') + eyes(p, { y: 50, dx: 13, r: 4.6, mood: 'fierce', iris: o.iris || '#FBBF24' }), a: A(50, 28, 56, 50) }),
};

function ellipsesEars(p) { return `<ellipse cx="22" cy="46" rx="11" ry="6" transform="rotate(-24 22 46)" fill="${p.a}" ${st(p, 3)}/><ellipse cx="78" cy="46" rx="11" ry="6" transform="rotate(24 78 46)" fill="${p.a}" ${st(p, 3)}/>`; }
