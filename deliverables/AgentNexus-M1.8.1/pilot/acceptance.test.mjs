// HOST_AUTHORED_ACCEPTANCE. NOT_RUN: generated-code PROCESS qualification absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from './initial/summary.mjs';
test('empty',()=>assert.deepEqual(summarize([]),{count:0,total:'0'}));
test('exact integers',()=>assert.deepEqual(summarize([{id:'a',value:'9007199254740993'},{id:'b',value:'7'}]),{count:2,total:'9007199254741000'}));
test('signed cancellation',()=>assert.deepEqual(summarize([{id:'a',value:'1000000000000000000000'},{id:'b',value:'-1000000000000000000000'}]),{count:2,total:'0'}));
test('idempotency',()=>assert.deepEqual(summarize([{id:'a',value:'2'},{id:'a',value:'2'}]),{count:1,total:'2'}));
test('conflict',()=>assert.throws(()=>summarize([{id:'a',value:'2'},{id:'a',value:'3'}]),/E_CONFLICT/));
test('invalid',()=>{for(const value of ['01','-0','1.0','+1','1e3',''])assert.throws(()=>summarize([{id:'a',value}]),/E_INPUT/);});
test('immutable',()=>{const input=[Object.freeze({id:'a',value:'1'})];Object.freeze(input);assert.deepEqual(summarize(input),{count:1,total:'1'});});
