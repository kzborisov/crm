import { envReady, hasSession, json, safeRequest, secureEqual, signSession, ttlSeconds } from '../lib/security.js';

export default async function handler(request) {
  if (!envReady()) return json({error: 'Системата не е конфигурирана. Добави CRM_PASSWORD и SESSION_SECRET в Netlify.'}, 503);
  if (request.method === 'GET') return json({authenticated: hasSession(request)});
  if (request.method !== 'POST') return json({error: 'Method not allowed'}, 405);
  if (!safeRequest(request)) return json({error: 'Невалидна заявка.'}, 403);
  const body = await request.json().catch(() => ({}));
  if (body.action === 'logout') return json({ok: true}, 200,
    {'set-cookie':'studio_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict'});
  if (body.action !== 'login' || typeof body.password !== 'string') return json({error: 'Невалидна заявка.'}, 400);
  if (body.password.length > 500 || !secureEqual(body.password, process.env.CRM_PASSWORD)) {
    return json({error: 'Грешна парола.'}, 401);
  }
  return json({ok: true}, 200, {
    'set-cookie': `studio_session=${signSession(process.env.SESSION_SECRET)}; Max-Age=${ttlSeconds}; Path=/; HttpOnly; Secure; SameSite=Strict`,
  });
}
