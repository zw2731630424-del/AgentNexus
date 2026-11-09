import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture,model } from './m18-fixture.ts';
import { wireFixture } from '../../src/agentnexus/model-runtime/transport.ts';
import { canonical } from '../../src/agentnexus/types.ts';

test('M18 MULTI SIMULATED wire adapters drive two concurrent independent subcontexts, structured messages and read-only review',async t=>{
  let reached=0,release!:()=>void,active=0,peak=0;const barrier=new Promise<void>(r=>release=r),seen:{model:string;prompt:string}[]=[];
  const f=await fixture(t,{eventLoop:{maxConcurrent:3},models:[model('synthetic-lead','openai'),model('synthetic-code','deepseek'),model('synthetic-review','glm')],
    routes:{wire:{DEVELOPMENT:['openai:synthetic-lead'],SUBAGENT:['deepseek:synthetic-code'],BACKGROUND_REVIEWER:['glm:synthetic-review']}},
    respond:async request=>{const body=JSON.parse(request.body),prompt=body.messages[1].content;seen.push({model:body.model,prompt});
      if(body.model==='synthetic-code'){assert.equal(prompt.includes('LEAD_PRIVATE_MARKER'),false);active++;peak=Math.max(peak,active);if(++reached===2)release();await barrier;active--;return wireFixture(JSON.stringify({kind:'FINAL',text:JSON.stringify({schema:'synthetic-delivery/1',status:'SIMULATED',evidence:'fixture-only'})}));}
      return wireFixture(JSON.stringify({kind:'WAIT',text:JSON.stringify({status:'SIMULATED',finding:'This fixture proves message wiring only.'})}));}});
  const lead=await f.agent('lead','work',{read_tasks:['research','coding','review']}),research=await f.agent('research','research',{type:'SUBAGENT',parent_id:lead.id,read_tasks:['work'],work_role:'SCOUT'}),coding=await f.agent('coding','coding',{type:'SUBAGENT',parent_id:lead.id,read_tasks:['work'],work_role:'WORKER'}),review=await f.agent('review','review',{type:'BACKGROUND_REVIEWER',read_tasks:['work'],work_role:'REVIEWER',tools:[],file_scope:[]});
  assert.notEqual(research.context_ref!.event_id,coding.context_ref!.event_id);assert.notEqual(research.subject.runtime_instance_id,coding.subject.runtime_instance_id);
  await f.h.administration.createTask({id:'work',agent_id:'lead',goal:'LEAD_PRIVATE_MARKER: coordinate scoped subtasks',max_turns:8});assert.equal((await f.h.administration.dispatch('work')).state,'WAITING');
  for(const child of [research,coding]){await f.h.administration.createTask({id:child.id,agent_id:child.id,goal:'Inspect only your independent task and return a structured delivery.'});await f.h.bindAgent(lead.id).sendText({receiver_agent_id:child.id,message_type:'TASK_ASSIGNMENT',text:JSON.stringify({task:child.id,scope:'synthetic fixture only'}),dedup_key:'task.'+child.id});}
  await f.h.administration.startEvents();await f.h.administration.idleEvents();assert.equal(f.h.inspectTask('research').state,'SUCCEEDED');assert.equal(f.h.inspectTask('coding').state,'SUCCEEDED');assert.equal(peak,2);
  await f.h.administration.createTask({id:'review',agent_id:'review',goal:'Independently review the scoped synthetic deliveries; do not modify code.'});await f.h.bindAgent(lead.id).sendText({receiver_agent_id:'review',message_type:'REVIEW_REQUEST',text:'Read only the supplied public fixture evidence.',dedup_key:'review.task'});await f.h.administration.idleEvents();assert.equal(f.h.inspectTask('review').state,'WAITING');
  assert.equal(seen.some(s=>s.model==='synthetic-lead'),true);assert.equal(seen.some(s=>s.model==='synthetic-code'),true);assert.equal(seen.some(s=>s.model==='synthetic-review'),true);assert.deepEqual(f.h.inspectAgent('review').tools,[]);
  const deliveries=f.h.state.list<any>('MESSAGE').filter(m=>m.receiver.agent_id==='lead'&&m.message_type==='RESULT');assert.equal(deliveries.length,2);assert.equal(f.h.inspectTask('work').received_message_ids.length,2);
  assert.equal(canonical(f.h.inspectAgent('coding').subject).includes('vault'),false);await f.h.store.verify();
});
