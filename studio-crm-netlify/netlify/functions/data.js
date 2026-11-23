import { getStore } from '@netlify/blobs';
import { envReady, hasSession, json, safeRequest } from '../lib/security.js';
import { initial, mutate, validateRestore, ValidationError } from '../lib/model.js';

// Site-wide, strong-consistency Blob; survives all redeploys.
// Conditional ETag writes prevent lost updates across tabs.
const NAME = 'studio-crm-private';
const KEY = 'data-v1';
export default async function handler(request) {
  if (!envReady()) return json({error: 'Липсва конфигурация.'}, 503);
  if (!hasSession(request)) return json({error: 'Влез с парола.'}, 401);
  if (!['GET','POST'].includes(request.method)) return json({error:'Method not allowed'},405);
  if (request.method === 'POST' && !safeRequest(request)) return json({error:'Невалидна заявка.'},403);
  const store = getStore({name: NAME, consistency:'strong'});
  try {
    const existing = await store.getWithMetadata(KEY,{type:'json', consistency:'strong'});
    const db = existing ? existing.data : initial();
    if (!existing && request.method === 'GET') return json(db);
    if (request.method === 'GET') return json(db);
    const length = Number(request.headers.get('content-length') || 0);
    if (length > 2500000) return json({error: 'Архивът е над 2.5 MB.'},413);
    const input = await request.json().catch(() => null);
    if (!input) return json({error:'Невалиден JSON.'},400);
    if (!Number.isInteger(input.revision) || input.revision !== db.revision) return json({error:'Данните са променени в друг прозорец. Презареди.'},409);
    const next = input.action === 'restore' ? validateRestore(input.backup) : mutate(db,input);
    if (input.action === 'restore') next.revision = db.revision + 1;
    const result = await store.setJSON(KEY, next, existing ? {onlyIfMatch:existing.etag} : {onlyIfNew:true});
    if (!result.modified) return json({error:'Данните са променени. Презареди и опитай отново.'},409);
    return json(next);
  } catch (e) {
    if (e instanceof ValidationError) return json({error:e.message},400);
    console.error('Studio CRM database operation failed:', e);
    return json({error:'Проблем със съхранението. Опитай отново.'},500);
  }
}
