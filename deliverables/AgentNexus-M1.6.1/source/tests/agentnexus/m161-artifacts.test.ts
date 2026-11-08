import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir,mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ArtifactStore } from '../../src/agentnexus/artifacts.ts';
import { sha256 } from '../../src/agentnexus/types.ts';
const base=process.env.AGENTNEXUS_TEST_DATA_ROOT??join(tmpdir(),'AgentNexus-M161');await mkdir(base,{recursive:true});
async function fixture(){const store=new ArtifactStore(await mkdtemp(join(base,'queue-')));await store.initialize();return store;}
test('M161 ARTIFACT queued writers retain two active streams, sixteen waiters, and legacy reject-third semantics',async()=>{
  const store=await fixture();let release!:()=>void;const gate=new Promise<void>(r=>release=r);async function* slow(){await gate;yield Buffer.from('slow');}
  try{const a=store.put(slow()),b=store.put(slow());await assert.rejects(store.put([Buffer.from('legacy')]),{code:'BACKPRESSURE'});
    const queued=Array.from({length:16},(_,i)=>store.putBytesQueued(Buffer.from(String(i))));assert.equal(store.stats.activePuts,2);assert.equal(store.stats.queuedPuts,16);await assert.rejects(store.putBytesQueued(Buffer.from('overflow')),/ARTIFACT_QUEUE_BACKPRESSURE/);
    release();const refs=await Promise.all([a,b,...queued]);assert.equal(refs.length,18);assert.equal(store.stats.maxActivePuts,2);assert.equal(store.stats.maxQueuedPuts,16);assert.equal(store.stats.queuedPuts,0);assert.equal(store.stats.activePuts,0);for(let i=0;i<16;i++)assert.equal(refs[i+2].sha256,sha256(String(i)));
  }finally{release();await store.close();}
});
test('M161 ARTIFACT aborting a queued producer never starts its iterator and leaves no queued capacity',async()=>{
  const store=await fixture();let release!:()=>void;const gate=new Promise<void>(r=>release=r);async function* slow(){await gate;yield Buffer.from('slow');}let started=0;async function* queued(){started++;yield Buffer.from('unstarted');}
  const a=store.put(slow()),b=store.put(slow()),controller=new AbortController();const cancelled=assert.rejects(store.putQueued(queued(),{signal:controller.signal}),/cancel fixture/);controller.abort(Error('cancel fixture'));
  try{await cancelled;assert.equal(started,0);assert.equal(store.stats.queuedPuts,0);release();await Promise.all([a,b]);assert.equal(store.stats.activePuts,0);
  }finally{release();await store.close();}
});
test('M161 ARTIFACT close rejects queued work while awaiting the two actual producers',async()=>{
  const store=await fixture();let release!:()=>void;const gate=new Promise<void>(r=>release=r);async function* slow(){await gate;yield Buffer.from('slow');}const a=store.put(slow()),b=store.put(slow());
  const rejected=assert.rejects(store.putBytesQueued(Buffer.from('pending')),/STORE_CLOSED/);let closed=false;const closing=store.close().then(()=>closed=true);await rejected;assert.equal(closed,false);assert.equal(store.stats.queuedPuts,0);release();await Promise.all([a,b,closing]);assert.equal(closed,true);assert.equal(store.stats.activePuts,0);
});
