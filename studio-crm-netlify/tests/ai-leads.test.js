import {test} from 'node:test';import assert from 'node:assert/strict';import {qualify,defaults,settings,safeUrl,localParts} from '../netlify/lib/lead-agent.js';
const lead={name:'Fitness A',analysis:'test',outreach:'message',score:9,sources:['https://example.com'],website:'https://example.com'};
test('duplicate rejection and score threshold',()=>{assert.equal(qualify([lead,lead],[],defaults).length,1);assert.equal(qualify([lead],[{company:'Fitness A'}],defaults).length,0);assert.equal(qualify([{...lead,score:3}],[],defaults).length,0);});
test('unsafe URLs and missing sources',()=>{assert.equal(safeUrl('javascript:alert(1)'),'');assert.equal(qualify([{...lead,sources:['javascript:alert(1)']}],[],defaults).length,0);});
test('settings bounded and Sofia DST',()=>{assert.throws(()=>settings({...defaults,count:11}));assert.equal(localParts(new Date('2026-11-26T06:00:00Z')).hour,8);assert.equal(localParts(new Date('2026-07-01T05:00:00Z')).hour,8);});
