import { randomUUID } from 'node:crypto';
export const STAGES = {lead:'Запитване', contact:'Разговор', offer:'Оферта', confirmed:'Потвърден', completed:'Завършен', lost:'Отказан'};
export const TYPES = ['Еднократно видео','Reels пакет','Месечен абонамент','Събитие','Спортно събитие','Продуктово видео','Друго'];
export const INCOME = ['Видео заснемане','Монтаж','Месечен абонамент','Събитие','Друг приход'];
export const EXPENSE = ['Техника','Софтуер','Транспорт','Консумативи','Подизпълнители','Реклама','Обучение','Друг разход'];
export const initial = () => ({version: 1, revision: 0, clients: [], projects: [], transactions: []});
const string = (s, max) => String(s ?? '').trim().slice(0, max);
const id = (s) => typeof s === 'string' && /^[0-9a-f-]{36}$/.test(s);
const date = (s) => { if (!s) return ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null; const d = new Date(s + 'T12:00:00Z'); return Number.isNaN(d.getTime()) || !d.toISOString().startsWith(s) ? null : s; };
const int = (s) => Number.isSafeInteger(s) && s >= 0 && s <= 1000000000000;
export class ValidationError extends Error {}
function err(msg) { throw new ValidationError(msg); }
function linked(db, type, value) {
  if (!value) return null;
  if (!id(value) || !db[type].some(x => x.id === value)) err('Свързаният запис не съществува.');
  return value;
}
export function cleanPayload(db, type, item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) err('Невалидни данни.');
  if (type === 'clients') {
    const name = string(item.name, 120);
    if (!name) err('Името на клиента е задължително.');
    return { name, company: string(item.company,120), instagram: string(item.instagram,150), email: string(item.email,180), phone: string(item.phone,70), notes: string(item.notes,3000) };
  }
  if (type === 'projects') {
    const title = string(item.title, 180);
    if (!title) err('Името на проекта е задължително.');
    const amount_cents = Number(item.amount_cents);
    if (!int(amount_cents)) err('Невалидна сума на проекта.');
    const shoot_date = date(item.shoot_date), followup_date = date(item.followup_date);
    if (shoot_date === null || followup_date === null) err('Невалидна дата.');
    return { title, client_id: linked(db,'clients',item.client_id), kind: string(item.kind,80), stage: Object.hasOwn(STAGES,item.stage) ? item.stage : 'lead', amount_cents, shoot_date, followup_date, notes:string(item.notes,3000) };
  }
  if (type === 'transactions') {
    const kind = item.kind === 'income' || item.kind === 'expense' ? item.kind : null;
    const amount_cents = Number(item.amount_cents);
    if (!kind || !int(amount_cents) || amount_cents === 0) err('Избери приход/разход и положителна сума.');
    const tx_date = date(item.date);
    if (!tx_date) err('Избери валидна дата.');
    const project_id = linked(db,'projects',item.project_id), client_id = linked(db,'clients',item.client_id);
    return { kind, amount_cents, date: tx_date, category: string(item.category, 90) || 'Друго', note:string(item.note,500), client_id, project_id };
  }
  err('Непознат тип запис.');
}
export function mutate(db, {action, type, id: recordId, payload}) {
  if (!['clients', 'projects', 'transactions'].includes(type)) err('Невалиден тип.');
  if (!['create','update','delete'].includes(action)) err('Невалидно действие.');
  const next = structuredClone(db);
  if (action === 'create') {
    const cleaned = cleanPayload(next,type,payload);
    next[type].push({id: randomUUID(), ...cleaned, created_at: new Date().toISOString()});
  } else {
    const idx = next[type].findIndex(x => x.id === recordId);
    if (idx < 0) err('Записът вече не съществува.');
    if (action === 'update') next[type][idx] = {...next[type][idx], ...cleanPayload(next,type,payload),updated_at:new Date().toISOString()};
    else {
      if (type === 'clients' && (next.projects.some(p => p.client_id === recordId) || next.transactions.some(t => t.client_id === recordId))) {
        err('Първо премахни връзките към клиента от проектите и плащанията.');
      }
      next[type].splice(idx, 1);
      if (type === 'projects') for (const t of next.transactions) if (t.project_id === recordId) t.project_id = null;
    }
  }
  next.revision = (next.revision || 0) + 1;
  return next;
}
export function validateRestore(raw) {
  if (!raw || !Array.isArray(raw.clients) || !Array.isArray(raw.projects) || !Array.isArray(raw.transactions)) err('Невалиден архив.');
  const db = initial();
  for (const t of ['clients','projects','transactions']) {
    if (raw[t].length > 20000) err('Архивът е прекалено голям.');
    const ids = new Set();
    for (const item of raw[t]) {
      if (!id(item.id) || ids.has(item.id)) err('Невалидни/повторени идентификатори в архива.');
      ids.add(item.id);
      db[t].push({id:item.id, ...cleanPayload(db,t,item), created_at: string(item.created_at,50) || new Date().toISOString()});
    }
  }
  db.revision = Number.isSafeInteger(raw.revision) ? raw.revision + 1 : 1;
  return db;
}
