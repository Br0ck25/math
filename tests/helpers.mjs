// Shared test helpers: an in-memory KV, the built Worker, and a browser page wired to it.
import { chromium } from 'playwright';

export function fakeKV() {
  const m = new Map();
  const live = (k) => {
    const e = m.get(k);
    if (e && e.exp && e.exp < Date.now()) { m.delete(k); return null; }
    return e || null;
  };
  return {
    m,
    async get(k, type) { const e = live(k); return e ? (type === 'json' ? JSON.parse(e.v) : e.v) : null; },
    async put(k, v, o = {}) { m.set(k, { v: String(v), meta: o.metadata, exp: o.expirationTtl ? Date.now() + o.expirationTtl * 1000 : 0 }); },
    async delete(k) { m.delete(k); },
    async list({ prefix = '', limit = 1000 } = {}) {
      const keys = [...m.keys()].filter((k) => k.startsWith(prefix) && live(k)).slice(0, limit);
      return { keys: keys.map((name) => ({ name, metadata: m.get(name).meta })) };
    }
  };
}

export async function loadWorker() { return (await import('../worker.js')).default; }

export async function call(worker, env, path, method = 'GET', body, token) {
  const res = await worker.fetch(new Request('http://localhost' + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  }), env, {});
  let data = null;
  try { data = await res.clone().json(); } catch (e) {}
  return { status: res.status, data, headers: res.headers };
}

export const launch = () => chromium.launch();

// A fresh browser context whose network goes straight to the built Worker (so real headers, incl. the CSP, apply).
// opts.fast shrinks every setTimeout 20x so animations and pauses do not slow the tests down.
export async function openGame(browser, worker, env, opts = {}) {
  const context = await browser.newContext({ viewport: opts.viewport || { width: 420, height: 800 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  // New players start with a wild buddy; most tests were written for a boss, so a game with no save starts on one (opts.wildStart keeps the real start).
  if (!opts.wildStart) await page.addInitScript(() => {
    try { if (!localStorage.getItem('math_quest_save')) localStorage.setItem('math_quest_save', JSON.stringify({ v: 1, currentMonsterIndex: 0, bossLevel: 5, recentBossTypes: ['fire'] })); } catch (e) { /* no storage */ }
  });
  if (!opts.adventureBoot) await page.addInitScript(() => { window.__noAdventureBoot = true; });      // the game starts on the Adventure map; most tests are about the main screen
  // Routes are laid out from blocks, so tests ask the map where to stand: window.grassSpot(map) is the tile just below two tall-grass tiles in a column that no trainer can see.
  await page.addInitScript(() => {
    window.nextTo = function (id, x, y) {                          // a walkable tile beside (x, y) and the way to face it
      const m = OW_MAPS[id];
      for (const [dx, dy, face] of [[0, 1, 'up'], [0, -1, 'down'], [-1, 0, 'right'], [1, 0, 'left']]) if (owWalkable(m, x + dx, y + dy) && !owNpcAt(m, x + dx, y + dy)) return { x: x + dx, y: y + dy, face };
      return null;
    };
    window.sightStand = function (mapId, npcId) {                  // two tiles from the trainer along its line of sight, and the way to face to step into it
      const n = OW_MAPS[mapId].npcs.find((p) => p.id === npcId), d = OW_STEP[n.face];
      return { x: n.x + d[0] * 2, y: n.y + d[1] * 2, back: { left: 'right', right: 'left', up: 'down', down: 'up' }[n.face] };
    };
    window.classicRoute1 = function () {                           // Route 1 as it was drawn by hand: tests of trainer sight and battles need known tiles
      const m = OW_MAPS.route1;
      m.rows = ['TTTTTT..TTTTTT', 'T,,T,,..,,,,,T', 'T,,g,,..,,,,,T', 'TTT"",..,,**,T', 'T,,"",..,,**,T', 'T,,,,,..,,,,YT', 'T,,,,,..""",,T', 'T,,,,,..""",,T', 'T,,,,,..""",,T', 'T,,,,,..,,,,,T', 'T""",,..,,,,,T', 'T""",,..,,,,,T',
        'T""",,..,,b,,T', 'T,,,,,..,,,,,T', 'T,,*,,..,,,,,T', 'T,,,,,..""",,T', 'T,,,,,..""",,T', 'T,,,,,..,,,,,T', 'T,"",,..,,,,,T', 'T,"",,..,,,,,T', 'T,,,,,..,,,,,T', 'T,,,,,..,,,,,T', 'T,,,,,..,,,,,T', 'TTTTTT..TTTTTT'];
      const at = { 'route1-pia': [3, 9, 'right'], 'route1-leo': [10, 14, 'left'], 'route1-riley': [10, 20, 'left'] };
      m.npcs = m.npcs.filter((n) => at[n.id]); m.npcs.forEach((n) => { [n.x, n.y, n.face] = at[n.id]; });
      m.objects = [{ id: 'route1-berries', type: 'pickup', x: 11, y: 9, give: 'berry' }, { id: 'route1-nook-gem', type: 'pickup', x: 1, y: 1, give: 'gems' }, { id: 'route1-nook-net', type: 'pickup', x: 2, y: 1, give: 'net' }];
      m.trees = { '12,5': 'route1-tree' }; m.warps = m.warps.filter((w) => w.y === 0 || w.y === 23);
    };
    window.grassSpot = function (id) {                              // a walkable tile with two tall-grass tiles in a line from it (face to step into them; back to step out), seen by no trainer
      const m = OW_MAPS[id || 'route1'];
      for (let y = 1; y < m.rows.length - 2; y++) for (let x = 1; x < 13; x++) for (const [dx, dy, face, back] of [[0, -1, 'up', 'down'], [0, 1, 'down', 'up'], [-1, 0, 'left', 'right'], [1, 0, 'right', 'left']]) {
        const cells = [[x, y], [x + dx, y + dy], [x + 2 * dx, y + 2 * dy]];
        if (cells.some(([cx, cy]) => !m.rows[cy] || !OW_TILES[m.rows[cy].charAt(cx)])) continue;
        if (owTileAt(m, cells[0][0], cells[0][1]).grass || !owWalkable(m, x, y) || !owTileAt(m, cells[1][0], cells[1][1]).grass || !owTileAt(m, cells[2][0], cells[2][1]).grass) continue;
        if (cells.some(([cx, cy]) => owTrainerSeeing(m, cx, cy) || owNpcAt(m, cx, cy) || owWarpAt(m, cx, cy))) continue;
        return { x, y, face, back };
      }
      return null;
    };

  });
  if (opts.init) await page.addInitScript(opts.init);          // runs before the game loads
  if (opts.fast) {
    await page.addInitScript(() => {
      const st = window.setTimeout.bind(window);
      window.setTimeout = (f, ms, ...a) => st(f, (ms || 0) / 20, ...a);
    });
  }
  await page.route('**/*', async (route) => {
    const req = route.request();
    const res = await worker.fetch(new Request(req.url(), { method: req.method(), headers: req.headers(), body: req.postData() || undefined }), env, {});
    await route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) });
  });
  await page.goto('http://localhost/');
  return { page, errors, context };
}

// Creates an account for the page's player and signs the page in.
export async function signUp(page, name) {
  await page.evaluate(async (n) => {
    acctEnabled = true;
    const r = await api('/api/register', 'POST', { name: n, password: 'secret1', state: state });
    startSession(n, r.data.token, r.data.version);
  }, name);
}
