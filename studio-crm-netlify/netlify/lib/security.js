import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

export const ttlSeconds = 14 * 24 * 60 * 60;
export function envReady(env = process.env) {
  return typeof env.CRM_PASSWORD === 'string' && env.CRM_PASSWORD.length >= 12
    && typeof env.SESSION_SECRET === 'string' && env.SESSION_SECRET.length >= 32
    && !env.SESSION_SECRET.includes('replace-with') && !env.CRM_PASSWORD.includes('add-a-unique');
}
export function secureEqual(a, b) {
  const x = createHash('sha256').update(String(a ?? '')).digest();
  const y = createHash('sha256').update(String(b ?? '')).digest();
  return timingSafeEqual(x, y);
}
function mac(text, secret) {
  return createHmac('sha256', secret).update(text).digest('base64url');
}
export function signSession(secret, now = Math.floor(Date.now() / 1000)) {
  const msg = `${now}`;
  return `${msg}.${mac(msg, secret)}`;
}
export function verifySession(cookie, secret, now = Math.floor(Date.now() / 1000)) {
  if (!secret || !cookie || typeof cookie !== 'string') return false;
  const [timestamp, signature, extra] = cookie.split('.');
  if (extra || !/^\d{10,12}$/.test(timestamp || '') || !/^[a-zA-Z0-9_-]{43}$/.test(signature || '')) return false;
  const issued = Number(timestamp);
  if (issued > now + 30 || now - issued > ttlSeconds) return false;
  return secureEqual(signature, mac(timestamp, secret));
}
export function hasSession(request, env = process.env) {
  const cookies = request.headers.get('cookie') || '';
  const raw = cookies.split(';').map(p => p.trim()).find(p => p.startsWith('studio_session='));
  return Boolean(raw && verifySession(raw.substring('studio_session='.length), env.SESSION_SECRET));
}
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
export function json(data, status = 200, moreHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, private',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    ...moreHeaders,
  }});
}
export function safeRequest(request) {
  return sameOrigin(request) && (request.headers.get('content-type') || '').split(';')[0].toLowerCase() === 'application/json';
}
