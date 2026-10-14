// =====================================================================
//  OPTIONAL ACCOUNTS  (needs a KV namespace bound as MATH_KV; without it the
//  game works exactly as before and the Account section explains it is off)
// =====================================================================
const PBKDF2_ITERS = 100000;          // Workers' maximum; stored per account so it can be changed later
const SESSION_TTL = 60 * 60 * 24 * 30; // stay signed in for 30 days
const MAX_SAVE_BYTES = ECON.save.hardLimitBytes;
const NAME_RE = /^[a-z0-9_-]{3,20}$/;

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
async function newSession(kv, name) {
  const token = toB64(rand(32)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await kv.put('sess:' + await sha256Hex(token), JSON.stringify({ name: name, at: Date.now() }), { expirationTtl: SESSION_TTL });
  return token;
}
async function authenticate(request, kv) {
  const h = request.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const rec = await kv.get('sess:' + await sha256Hex(m[1]), 'json');
  return rec && rec.name ? { name: rec.name, tokenHash: await sha256Hex(m[1]) } : null;
}
async function checkPassword(kv, name, password) {
  const acct = await kv.get('acct:' + name, 'json');
  if (!acct) return false;
  const h = await hashPassword(password, fromB64(acct.salt), acct.iters || PBKDF2_ITERS);
  return safeEq(h, acct.hash);
}
