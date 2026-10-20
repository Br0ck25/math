// The Adventure world pictures (art/world, scripts/world-art.mjs): valid files, built into one sprite sheet, drawn with <use>, and no emoji.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';
import { worldArtFiles } from '../scripts/build.mjs';
import { WORLD } from '../scripts/world-art.mjs';
import { worldSvg } from '../scripts/make-world-art.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'art/world');

let browser, page, errors;
before(async () => {
  browser = await launch();
  ({ page, errors } = await openGame(browser, await loadWorker(), { MATH_KV: fakeKV() }, { fast: true }));
});
after(async () => { await browser.close(); });

test('every picture in the generator is on disk and current (run node scripts/make-world-art.mjs)', () => {
  Object.keys(WORLD).forEach((id) => {
    const file = path.join(dir, id + '.svg');
    assert.ok(fs.existsSync(file), id + '.svg is missing');
    assert.equal(fs.readFileSync(file, 'utf8'), worldSvg(id), id + '.svg is out of date');
  });
  assert.deepEqual(fs.readdirSync(dir).map((f) => f.replace(/\.svg$/, '')).filter((id) => !WORLD[id]), [], 'files with no entry in scripts/world-art.mjs (hand-made ones need the entry removed from this check)');
});

test('the files are small, safe and follow the house style (100x100 box, no text)', () => {
  const files = worldArtFiles();
  assert.equal(files.length, Object.keys(WORLD).length);
  files.forEach((a) => {
    assert.equal(a.viewBox, '0 0 100 100', a.id);
    const text = fs.readFileSync(path.join(dir, a.id + '.svg'), 'utf8');
    assert.ok(!/<text|<script|<image|<style/i.test(text), a.id + ' has text, script, image or style');
    assert.ok(text.length < 4096, a.id + ' is ' + text.length + ' bytes');
  });
  assert.ok(files.reduce((n, a) => n + a.inner.length, 0) < 120 * 1024, 'the whole set should stay small');
});

test('no two terrain tiles look the same', () => {
  const seen = {};
  worldArtFiles().filter((a) => a.id.startsWith('t-')).forEach((a) => {
    assert.ok(!seen[a.inner], a.id + ' is identical to ' + seen[a.inner]);
    seen[a.inner] = a.id;
  });
});

test('the build refuses bad names, scripts, links and oversized world pictures', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'world-art-'));
  const put = (name, body) => fs.writeFileSync(path.join(tmp, name), body);
  const svg = (inner) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + inner + '</svg>';
  try {
    put('t-ok.svg', svg('<rect width="100" height="100"/>'));
    assert.equal(worldArtFiles(tmp).length, 1);
    put('Bad_Name.svg', svg('<rect/>'));
    assert.throws(() => worldArtFiles(tmp), /name it <id>\.svg/);
    fs.rmSync(path.join(tmp, 'Bad_Name.svg'));
    put('t-ok.svg', svg('<script>alert(1)</script>'));
    assert.throws(() => worldArtFiles(tmp), /may not contain scripts/);
    put('t-ok.svg', svg('<rect onclick="x()"/>'));
    assert.throws(() => worldArtFiles(tmp), /may not contain scripts/);
    put('t-ok.svg', svg('<use href="http://example.com/a.svg#x"/>'));
    assert.throws(() => worldArtFiles(tmp), /may not contain scripts/);
    put('t-ok.svg', svg('<rect/>' + ' '.repeat(7000)));
    assert.throws(() => worldArtFiles(tmp), /keep each world picture below/);
    put('t-ok.svg', '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');
    assert.throws(() => worldArtFiles(tmp), /needs an <svg> with a viewBox/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('the page carries one sprite sheet with a symbol for every picture, and draws a sprite with <use>', async () => {
  const ids = await page.evaluate(() => { mountWorldArt(); mountWorldArt(); return Array.from(document.querySelectorAll('#world-art symbol')).map((s) => s.id); });
  assert.deepEqual(ids.sort(), Object.keys(WORLD).map((id) => 'w-' + id).sort());
  assert.equal(await page.evaluate(() => document.querySelectorAll('#world-art').length), 1, 'mounting twice must not duplicate the sheet');
  const box = await page.evaluate(() => {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:64px;height:64px';
    host.innerHTML = worldSprite('t-grass');
    document.body.appendChild(host);
    const r = host.querySelector('svg').getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  assert.deepEqual(box, { w: 64, h: 64 });
});

test('the hero stacks a body and a hair layer in every direction and takes its colours from CSS variables', async () => {
  const out = await page.evaluate(() => ['down', 'up', 'left', 'right'].map((d) => {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:96px;height:96px';
    host.innerHTML = heroSprite({ skin: 'rgb(1, 2, 3)', hair: '#112233', outfit: '#445566', style: 2 }, d, 1);
    document.body.appendChild(host);
    const hero = host.querySelector('.w-hero'), skin = getComputedStyle(hero).getPropertyValue('--hero-skin').trim();
    const uses = Array.from(host.querySelectorAll('use')).map((u) => u.getAttribute('href'));
    return { d, skin, uses };
  }));
  out.forEach((o) => {
    assert.equal(o.skin, 'rgb(1, 2, 3)');
    assert.deepEqual(o.uses, ['#w-p-body-' + o.d + '-1', '#w-p-hair-2-' + o.d]);
  });
  assert.deepEqual(errors, []);
});

test('the world uses pictures, never emoji', () => {
  const emoji = /\p{Extended_Pictographic}/u;
  const jsDir = path.join(root, 'src/client/js');
  const files = fs.readdirSync(jsDir).filter((f) => /^24[f-z]-ow-/.test(f)).map((f) => path.join(jsDir, f))
    .concat(fs.readdirSync(dir).map((f) => path.join(dir, f)));
  assert.ok(files.length > 40);
  files.forEach((f) => assert.ok(!emoji.test(fs.readFileSync(f, 'utf8')), path.relative(root, f) + ' contains an emoji'));
});
