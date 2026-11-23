import test from 'node:test';
import assert from 'node:assert/strict';
import { initial, mutate, validateRestore, ValidationError } from '../netlify/lib/model.js';
import { secureEqual, signSession, verifySession, envReady } from '../netlify/lib/security.js';
const secret='1234567890abcdef1234567890abcdef12345678';
function add(db,type,payload){return mutate(db,{action:'create',type,payload})}
function sample(){
 let db=add(initial(),'clients',{name:'Тест Клиент',company:'Studio'});
 const c=db.clients[0];
 db=add(db,'projects',{title:'Проект',client_id:c.id,kind:'Reels пакет',stage:'confirmed',amount_cents:30000,shoot_date:'2026-11-24'});
 const p=db.projects[0];
 db=add(db,'transactions',{kind:'income',amount_cents:10000,date:'2026-11-23',category:'Капаро',client_id:c.id,project_id:p.id});
 return {db,c,p};
}
test('New CRM is empty',()=>{assert.deepEqual(initial().clients,[]);assert.equal(initial().revision,0)});
test('Creates clients, projects and partial payments',()=>{const {db,c,p}=sample();assert.equal(db.clients[0].name,c.name);assert.equal(db.projects[0].amount_cents,30000);assert.equal(db.transactions[0].amount_cents,10000);assert.equal(db.revision,3);assert.equal(30000-db.transactions.filter(t=>t.project_id===p.id).reduce((a,b)=>a+b.amount_cents,0),20000)});
test('Protects invalid amounts, dates and client refs',()=>{const {db}=sample();assert.throws(()=>add(db,'transactions',{kind:'income',amount_cents:-10,date:'2026-11-23'}),ValidationError);assert.throws(()=>add(db,'transactions',{kind:'expense',amount_cents:100,date:'2026-02-30'}),ValidationError);assert.throws(()=>add(db,'projects',{title:'No',amount_cents:0,client_id:'deadbeef'}),ValidationError)});
test('Cannot delete client with linked records',()=>{const {db,c}=sample();assert.throws(()=>mutate(db,{action:'delete',type:'clients',id:c.id}),ValidationError)});
test('Deleting project detaches payments without losing money',()=>{const {db,p}=sample();const result=mutate(db,{action:'delete',type:'projects',id:p.id});assert.equal(result.transactions[0].project_id,null);assert.equal(result.transactions[0].amount_cents,10000)});
test('Update is immutable',()=>{const {db,p}=sample();const result=mutate(db,{action:'update',type:'projects',id:p.id,payload:{...p,title:'Updated'}});assert.equal(db.projects[0].title,'Проект');assert.equal(result.projects[0].title,'Updated')});
test('JSON backup can be restored with relationships intact',()=>{const {db}=sample();const result=validateRestore(JSON.parse(JSON.stringify(db)));assert.equal(result.transactions[0].project_id,db.projects[0].id);assert.equal(result.transactions[0].client_id,db.clients[0].id)});
test('Backup rejects duplicate IDs and broken relationships',()=>{const {db}=sample();const duplicate=structuredClone(db);duplicate.clients.push({...duplicate.clients[0]});assert.throws(()=>validateRestore(duplicate),ValidationError);const broken=structuredClone(db);broken.transactions[0].project_id='00000000-0000-0000-0000-000000000000';assert.throws(()=>validateRestore(broken),ValidationError)});
test('Session signed and expires',()=>{const t=signSession(secret,1700000000);assert.equal(verifySession(t,secret,1700000001),true);assert.equal(verifySession(t+'x',secret,1700000001),false);assert.equal(verifySession(t,secret,1700000000+15*86400),false)});
test('Secrets must be configured',()=>{assert.equal(envReady({CRM_PASSWORD:'long-private-password',SESSION_SECRET:secret}),true);assert.equal(envReady({CRM_PASSWORD:'123',SESSION_SECRET:secret}),false);assert.equal(secureEqual('foo','foo'),true);assert.equal(secureEqual('foo','bar'),false)});
