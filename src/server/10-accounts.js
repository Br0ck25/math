// =====================================================================
//  OPTIONAL ACCOUNTS  (needs a KV namespace bound as MATH_KV; without it the
//  game works exactly as before and the Account section explains it is off)
//  Accounts keep a player's save in the cloud; sign-in codes and passwords are separate per account.
// =====================================================================
const PBKDF2_ITERS = 100000;          // Workers' maximum; stored per account so it can be changed later
const SESSION_TTL = 60 * 60 * 24 * 30; // stay signed in for 30 days
const MAX_SAVE_BYTES = ECON.save.hardLimitBytes;
const NAME_RE = /^[a-z0-9_-]{3,20}$/;
const KID_NS = { acct: 'acct:', sess: 'sess:', fail: 'fail:', noun: 'player name' };

function rand(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
function toB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromB64(s) {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
function randomId(bytes) { return toB64(rand(bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
async function hashPassword(pw, salt, iters) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iters }, key, 256);
  return toB64(bits);
}
async function sha256Hex(str) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(d)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}
function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
  });
}
function validState(s) {
  return !!s && typeof s === 'object' && !Array.isArray(s) && Array.isArray(s.unlockedPets) && typeof s.gems === 'number';
}
async function newSession(kv, name, ns) {
  const token = randomId(32);
  await kv.put((ns || KID_NS).sess + await sha256Hex(token), JSON.stringify({ name: name, at: Date.now() }), { expirationTtl: SESSION_TTL });
  return token;
}
async function authenticate(request, kv, ns) {
  const h = request.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const rec = await kv.get((ns || KID_NS).sess + await sha256Hex(m[1]), 'json');
  if (!rec || !rec.name) return null;
  return { name: rec.name, tokenHash: await sha256Hex(m[1]) };
}
async function checkPassword(kv, name, password, ns) {
  const acct = await kv.get((ns || KID_NS).acct + name, 'json');
  if (!acct) return false;
  const h = await hashPassword(password, fromB64(acct.salt), acct.iters || PBKDF2_ITERS);
  return safeEq(h, acct.hash);
}
// Validates a name and password and stores the new account. Returns { name } or { res } (an error response to send).
async function createAccount(kv, ns, body) {
  const name = String(body.name || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!NAME_RE.test(name)) return { res: json({ error: ns.noun.charAt(0).toUpperCase() + ns.noun.slice(1) + 's are 3-20 letters, numbers, - or _.' }, 400) };
  if (password.length < 6 || password.length > 100) return { res: json({ error: 'Passwords need at least 6 characters.' }, 400) };
  if (await kv.get(ns.acct + name)) return { res: json({ error: 'That ' + ns.noun + ' is taken. Try another!' }, 409) };
  const salt = rand(16);
  const hash = await hashPassword(password, salt, PBKDF2_ITERS);
  await kv.put(ns.acct + name, JSON.stringify({ salt: toB64(salt), hash: hash, iters: PBKDF2_ITERS, created: Date.now() }));
  return { name: name };
}
// Checks a name and password, with a lockout after too many wrong tries. Returns { name } or { res }.
async function signIn(kv, ns, body) {
  const name = String(body.name || '').trim().toLowerCase();
  const password = String(body.password || '');
  const failKey = ns.fail + name;
  const fails = parseInt((await kv.get(failKey)) || '0', 10);
  if (fails >= 8) return { res: json({ error: 'Too many tries. Please wait 15 minutes and try again.' }, 429) };
  if (!NAME_RE.test(name) || !password || !(await checkPassword(kv, name, password, ns))) {
    if (NAME_RE.test(name)) await kv.put(failKey, String(fails + 1), { expirationTtl: 900 });
    return { res: json({ error: 'Wrong ' + ns.noun + ' or password.' }, 401) };
  }
  await kv.delete(failKey);
  return { name: name };
}
