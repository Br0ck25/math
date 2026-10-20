// Builds worker.js (the single file Cloudflare runs) from src/.
//   node scripts/build.mjs          write worker.js
//   node scripts/build.mjs --check  fail if worker.js is out of date
// `assemble()` is also used by scripts/lint.mjs so both always look at exactly what ships.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readDir = (dir, ext) => fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith(ext)).sort()
  .map((f) => read(path.join(dir, f)));

// Licensed artwork for buddies: art/buddies/<buddy id>.png|webp|jpg|gif|svg becomes `BUDDY_ART` (id -> data: URI) in the page script.
// The page is one self-contained file, so the pictures travel inside it: keep them small (see art/README.md).
const ART_TYPES = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml' };
const ART_FILE_MAX = 150 * 1024, ART_TOTAL_MAX = 2.5 * 1024 * 1024;
export function artFiles() {
  const dir = path.join(root, 'art/buddies');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => !f.startsWith('.') && f !== 'README.md').sort().map((f) => {
    const m = /^([a-z0-9_]+)\.(png|webp|jpe?g|gif|svg)$/i.exec(f);
    if (!m) throw new Error('art/buddies/' + f + ': name it <buddy id>.png (or .webp .jpg .gif .svg), for example toon_bluey.png');
    const bytes = fs.readFileSync(path.join(dir, f));
    if (bytes.length > ART_FILE_MAX) throw new Error('art/buddies/' + f + ' is ' + Math.round(bytes.length / 1024) + ' KB: shrink it below ' + ART_FILE_MAX / 1024 + ' KB (about 256 px wide, WebP or PNG)');
    if (m[2].toLowerCase() === 'svg' && /<script|\bon\w+\s*=/i.test(bytes.toString('utf8'))) throw new Error('art/buddies/' + f + ': svg pictures may not contain scripts or event handlers');
    return { id: m[1].toLowerCase(), file: f, bytes: bytes };
  });
}
// An svg with only a viewBox, or with width/height="100%", has no natural size in some browsers (Firefox, iOS Safari), so the trading card
// could not draw it. Give it the viewBox's width and height when it has no fixed size.
export function sizeSvg(text) {
  return text.replace(/<svg\b([^>]*)>/i, (tag, attrs) => {
    const fixed = (n) => new RegExp('\\b' + n + '\\s*=\\s*["\']\\s*[\\d.]+\\s*(px)?\\s*["\']', 'i').test(attrs);
    if (fixed('width') || fixed('height')) return tag;
    const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i.exec(attrs);
    if (!vb) return tag;
    return '<svg width="' + vb[1] + '" height="' + vb[2] + '"' + attrs.replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, '') + '>';
  });
}
function artChunk() {
  const files = artFiles(), map = {};
  let total = 0;
  files.forEach((a) => {
    const isSvg = /\.svg$/i.test(a.file), bytes = isSvg ? Buffer.from(sizeSvg(a.bytes.toString('utf8'))) : a.bytes;
    total += bytes.length;
    map[a.id] = 'data:' + ART_TYPES[a.file.split('.').pop().toLowerCase()] + ';base64,' + bytes.toString('base64');
  });
  if (total > ART_TOTAL_MAX) throw new Error('art/buddies is ' + (total / 1024 / 1024).toFixed(1) + ' MB in all: the Worker has a size limit, keep it below ' + ART_TOTAL_MAX / 1024 / 1024 + ' MB');
  return 'const BUDDY_ART = ' + JSON.stringify(map) + ';';
}

// The Adventure world: art/world/<id>.svg (terrain, the hero, objects; see scripts/world-art.mjs) becomes one hidden sprite sheet, `WORLD_ART`,
// of <symbol id="w-<id>"> pictures that the map draws with <use>. Colours come from CSS variables, so a land can recolour the whole set.
const WORLD_FILE_MAX = 6 * 1024, WORLD_TOTAL_MAX = 300 * 1024;
export function worldArtFiles(dir = path.join(root, 'art/world')) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => !f.startsWith('.')).sort().map((f) => {
    const m = /^([a-z0-9-]+)\.svg$/.exec(f);
    if (!m) throw new Error('art/world/' + f + ': name it <id>.svg with lowercase letters, digits and dashes, for example t-grass.svg');
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    if (text.length > WORLD_FILE_MAX) throw new Error('art/world/' + f + ' is ' + Math.round(text.length / 1024) + ' KB: keep each world picture below ' + WORLD_FILE_MAX / 1024 + ' KB');
    if (/<script|\bon\w+\s*=|<image|<foreignObject|<style|\bhref\s*=/i.test(text)) throw new Error('art/world/' + f + ': world pictures may not contain scripts, event handlers, images, styles or links');
    const vb = /<svg\b[^>]*\bviewBox\s*=\s*["']([^"']+)["']/i.exec(text), inner = /<svg\b[^>]*>([\s\S]*)<\/svg>/i.exec(text);
    if (!vb || !inner) throw new Error('art/world/' + f + ': it needs an <svg> with a viewBox');
    return { id: m[1], viewBox: vb[1], inner: inner[1].replace(/<!--[\s\S]*?-->/g, '').trim() };
  });
}
function worldChunk() {
  const symbols = worldArtFiles().map((a) => '<symbol id="w-' + a.id + '" viewBox="' + a.viewBox + '">' + a.inner + '</symbol>').join('');
  if (symbols.length > WORLD_TOTAL_MAX) throw new Error('art/world is ' + Math.round(symbols.length / 1024) + ' KB in all: the Worker has a size limit, keep it below ' + WORLD_TOTAL_MAX / 1024 + ' KB');
  return 'const WORLD_ART = ' + JSON.stringify('<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" focusable="false">' + symbols + '</svg>') + ';';
}

export function assemble() {
  const css = read('src/client/styles.css');
  const shared = [read('src/shared/econ.js'), read('src/shared/study.js')].join('\n');
  const js = [shared, artChunk(), worldChunk()].concat(readDir('src/client/js', '.js')).join('\n');
  new vm.Script(js, { filename: 'client script (src/shared + src/client/js)' });   // throws on a syntax error
  if (/<\/script/i.test(js)) throw new Error('src/client/js must not contain "</script"');
  const page = read('src/client/index.html').replace('{{CSS}}', () => css).replace('{{JS}}', () => js);
  const build = crypto.createHash('sha256').update(page).digest('hex').slice(0, 8);
  const serverJs = [shared].concat(readDir('src/server', '.js')).join('\n').replace('__BUILD__', build);
  const out =
    '// GENERATED by scripts/build.mjs from src/. Do not edit this file: edit src/ and run `npm run build`.\n' +
    'const HTML = ' + JSON.stringify(page) + ';\n\n' + serverJs;
  return { js, page, serverJs, build, out };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { build, out } = assemble();
  const target = path.join(root, 'worker.js');
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== out) {
      console.error('worker.js is out of date. Run `npm run build` and commit the result.');
      process.exit(1);
    }
    console.log('worker.js is up to date (build ' + build + ')');
  } else {
    fs.writeFileSync(target, out);
    console.log('wrote worker.js (build ' + build + ', ' + Math.round(out.length / 1024) + ' KB)');
  }
}
