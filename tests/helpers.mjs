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
