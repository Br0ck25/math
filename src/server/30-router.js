async function handleApi(request, env, url) {
  const path = url.pathname;
  if (path === '/api/status') return json({ enabled: !!env.MATH_KV });
  const kv = env.MATH_KV;
  if (!kv) return json({ error: 'Online accounts are not set up on this server yet.' }, 501);
  if (request.method !== 'GET' && request.method !== 'POST' && request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405);

  let body = {};
  if (request.method !== 'GET') {
    try {
      const txt = await request.text();
      if (txt.length > MAX_SAVE_BYTES + 5000) return json({ error: 'Too large' }, 413);
      body = txt ? JSON.parse(txt) : {};
    } catch (e) { return json({ error: 'Bad request' }, 400); }
  }

  if (path === '/api/register' && request.method === 'POST') {
    const name = String(body.name || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!NAME_RE.test(name)) return json({ error: 'Player names are 3-20 letters, numbers, - or _.' }, 400);
    if (password.length < 6 || password.length > 100) return json({ error: 'Passwords need at least 6 characters.' }, 400);
    if (await kv.get('acct:' + name)) return json({ error: 'That player name is taken. Try another!' }, 409);
    const salt = rand(16);
    const hash = await hashPassword(password, salt, PBKDF2_ITERS);
    await kv.put('acct:' + name, JSON.stringify({ salt: toB64(salt), hash: hash, iters: PBKDF2_ITERS, created: Date.now() }));
    let version = 0;
    if (validState(body.state) && JSON.stringify(body.state).length <= MAX_SAVE_BYTES) {
      version = 1;
      await kv.put('save:' + name, JSON.stringify({ state: body.state, version: 1, updatedAt: Date.now() }));
    }
    return json({ ok: true, name: name, token: await newSession(kv, name), version: version });
  }

  if (path === '/api/login' && request.method === 'POST') {
    const name = String(body.name || '').trim().toLowerCase();
    const password = String(body.password || '');
    const failKey = 'fail:' + name;
    const fails = parseInt((await kv.get(failKey)) || '0', 10);
    if (fails >= 8) return json({ error: 'Too many tries. Please wait 15 minutes and try again.' }, 429);
    if (!NAME_RE.test(name) || !password || !(await checkPassword(kv, name, password))) {
      if (NAME_RE.test(name)) await kv.put(failKey, String(fails + 1), { expirationTtl: 900 });
      return json({ error: 'Wrong player name or password.' }, 401);
    }
    await kv.delete(failKey);
    const save = await kv.get('save:' + name, 'json');
    return json({ ok: true, name: name, token: await newSession(kv, name), save: save || null });
  }

  const who = await authenticate(request, kv);
  if (!who) return json({ error: 'Please sign in again.' }, 401);

  if (path === '/api/save' && request.method === 'GET') {
    return json({ save: (await kv.get('save:' + who.name, 'json')) || null });
  }

  if (path === '/api/save' && request.method === 'PUT') {
    if (!validState(body.state)) return json({ error: 'Invalid save' }, 400);
    if (JSON.stringify(body.state).length > MAX_SAVE_BYTES) return json({ error: 'Save too large' }, 413);
    const cur = await kv.get('save:' + who.name, 'json');
    const curVersion = cur ? cur.version : 0;
    if (!body.force && Number(body.baseVersion) !== curVersion) return json({ conflict: true, save: cur || null }, 409);
    const next = { state: body.state, version: curVersion + 1, updatedAt: Date.now() };
    await kv.put('save:' + who.name, JSON.stringify(next));
    return json({ ok: true, version: next.version, updatedAt: next.updatedAt });
  }

  if (path.indexOf('/api/duel/') === 0) return handleDuel(path, request, url, kv, who, body);

  if (path === '/api/logout' && request.method === 'POST') {
    await kv.delete('sess:' + who.tokenHash);
    return json({ ok: true });
  }

  if (path === '/api/delete' && request.method === 'POST') {
    if (!(await checkPassword(kv, who.name, String(body.password || '')))) return json({ error: 'Wrong password.' }, 401);
    await kv.delete('acct:' + who.name);
    await kv.delete('save:' + who.name);
    await kv.delete('sess:' + who.tokenHash);
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}

// Headers added to every response. The page needs inline script/style (it is one self-contained file),
// but nothing may load from, or send data to, any other site.
const SECURITY_HEADERS = {
  'content-security-policy': "upgrade-insecure-requests; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  // browsers that reached us over https must keep using https (ignored over http; no includeSubDomains so other sites on the domain are untouched)
  'strict-transport-security': 'max-age=15552000',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'x-frame-options': 'DENY'
};
function withSecurityHeaders(res) {
  const out = new Response(res.body, res);
  Object.keys(SECURITY_HEADERS).forEach(function (k) { out.headers.set(k, SECURITY_HEADERS[k]); });
  return out;
}

// Plain http gets sent to https (browsers label http pages "Not secure" and many school and office filters block them).
// Cloudflare tells us how the visitor really connected in the cf-visitor header. Local development stays on http.
function insecureRequest(request, url) {
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname) || /\.localhost$/.test(url.hostname)) return false;
  return url.protocol === 'http:' || /"scheme"\s*:\s*"http"/.test(request.headers.get('cf-visitor') || '');
}

async function route(request, env, ctx) {
    const url = new URL(request.url);
    if (insecureRequest(request, url)) {
      url.protocol = 'https:';
      return new Response(null, { status: 301, headers: { location: url.toString(), 'cache-control': 'no-store' } });
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        return json({ error: 'Something went wrong. Please try again.' }, 500);
      }
    }

    if (url.pathname === "/manifest.json") {
      return new Response(JSON.stringify(MANIFEST), {
        headers: {
          "content-type": "application/manifest+json;charset=UTF-8",
          "cache-control": "public, max-age=86400"
        }
      });
    }

    if (url.pathname === "/sw.js") {
      return new Response(SW, {
        headers: {
          "content-type": "application/javascript;charset=UTF-8",
          "cache-control": "public, max-age=0"
        }
      });
    }

    return new Response(HTML, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
        "cache-control": "no-cache"
      }
    });
  }

export default {
  async fetch(request, env, ctx) {
    return withSecurityHeaders(await route(request, env, ctx));
  }
};
