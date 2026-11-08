import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir,mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { limits } from './m161-storage-fixture.ts';
const base=process.env.AGENTNEXUS_TEST_DATA_ROOT??join(tmpdir(),'AgentNexus-M161');await mkdir(base,{recursive:true});
const input={receiver_agent_id:'receiver',message_type:'INPUT',text:'Same exact immutable message',dedup_key:'stable-draft'};
test('M161 DRAFT REAL_PROCESS_CRASH after durable admission resumes exact internal capture without a lost message',async()=>{
  const root=await mkdtemp(join(base,'draft-crash-')),child=spawn(process.execPath,[fileURLToPath(new URL('./m161-draft-child.mjs',import.meta.url)),root],{windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});const exited=once(child,'exit');let stderr='',timer:ReturnType<typeof setTimeout>|undefined;child.stderr!.on('data',b=>{if(stderr.length<65536)stderr+=b;});
  try{await Promise.race([once(child,'message'),exited.then(()=>{throw Error('Draft child exited before ACK: '+stderr);}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Draft child timeout: '+stderr)),10000);})]);}finally{clearTimeout(timer);child.kill();await exited;}
  assert.equal((await KernelStore.recoverAbandonedLock(join(root,'host'))).recovered,true);const h=await openHarness(join(root,'host'));
  try{assert.equal(h.state.count('MESSAGE_TEXT'),1);assert.equal(h.state.count('MESSAGE'),0);const message=await h.bindAgent('sender').sendText(input);assert.equal(h.state.count('MESSAGE'),1);assert.equal(h.state.count('MESSAGE_TEXT'),1);assert.equal((await h.bindAgent('sender').sendText(input)).message_id,message.message_id);assert.equal((await h.administration.dispatch('receiver')).state,'SUCCEEDED');assert.equal(h.inspectTask('receiver').received_message_ids.length,1);await h.store.verify();
  }finally{await h.close();}
});
test('M161 DRAFT transient shared write backpressure releases capture ownership for a same-boot exact retry',async()=>{
  const root=await mkdtemp(join(base,'draft-pressure-')),h=await openHarness(join(root,'host'));let release!:()=>void;
  try{await h.administration.createProject({id:'p',rules:['Synthetic draft recovery'],budget:limits});for(const id of ['sender','receiver'])await h.administration.createAgent({id,project_id:'p',task_id:id,type:'DEVELOPMENT',budget:{...limits,workers:1},read_tasks:id==='receiver'?['sender']:[]});
    const gate=new Promise<void>(r=>release=r);async function* slow(){await gate;yield Buffer.from('x');}const active=[h.store.artifacts.put(slow()),h.store.artifacts.put(slow())],queued=Array.from({length:16},()=>h.store.artifacts.putBytesQueued(Buffer.from('queued')));
    await assert.rejects(h.bindAgent('sender').sendText(input),{code:'ARTIFACT_QUEUE_BACKPRESSURE'});assert.equal(h.state.count('MESSAGE'),0);release();await Promise.all([...active,...queued]);assert.equal(h.store.faulted,false);
    const one=await h.bindAgent('sender').sendText(input),again=await h.bindAgent('sender').sendText(input);assert.equal(one.message_id,again.message_id);assert.equal(h.state.count('MESSAGE'),1);assert.equal(h.state.count('MESSAGE_TEXT'),1);assert.equal(h.store.artifacts.stats.activePuts,0);await h.store.verify();
  }finally{release?.();await h.close();}
});
