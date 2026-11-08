import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir,mkdtemp,readdir,readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import { canonical } from '../../src/agentnexus/types.ts';
import { storageFixture,execute,limits } from './m161-storage-fixture.ts';
import type { AgentInput } from '../../src/agentnexus/harness/agents.ts';
import type { MessageHandoff } from '../../src/agentnexus/harness/messages.ts';
const base=process.env.AGENTNEXUS_TEST_DATA_ROOT??join(tmpdir(),'AgentNexus-M161');await mkdir(base,{recursive:true});
async function fixture(){const root=await mkdtemp(join(base,'integrated-'));const h=await openHarness(join(root,'host'));await h.administration.createProject({id:'p',rules:['RULE_VERSION_ONE'],budget:limits});return {root,h};}
async function agent(h:Awaited<ReturnType<typeof openHarness>>,id:string,extra:Partial<AgentInput>={}){return h.administration.createAgent({id,task_id:id,project_id:'p',type:'DEVELOPMENT',budget:{...limits,workers:1},...extra});}
async function feature(h:Awaited<ReturnType<typeof openHarness>>,id:string,state:'ON'|'OFF'){const m=h.administration.features.metadata(),p=await h.administration.features.previewFeatures([{id,state,scope:{}}],m.feature_revision);await h.administration.features.commitFeatures(p.challenge_id,p.preview_hash);}

test('M161 TASK stable ID rejects changed budget, input, and acceptance contracts',async()=>{
  const {h}=await fixture();try{await agent(h,'lead');const input={id:'lead',agent_id:'lead',goal:'Stable task',requirements:{disk_bytes:10},contract:{acceptance:['exact output'],allowed_scope:[]}};
    const task=await h.administration.createTask(input);assert.equal((await h.administration.createTask(input)).creation_hash,task.creation_hash);
    await assert.rejects(h.administration.createTask({...input,requirements:{disk_bytes:11}}),/TASK_DUPLICATE_CONTRACT/);
    await assert.rejects(h.administration.createTask({...input,contract:{acceptance:['different'],allowed_scope:[]}}),/TASK_DUPLICATE_CONTRACT/);
    assert.equal(h.state.count('TASK'),1);assert.equal(h.state.count('MODEL_REQUEST'),0);
  }finally{await h.close();}
});

test('M161 TASK rules update freezes old tasks, new tasks take new version, explicit migration archives the original contract',async()=>{
  const {h}=await fixture();try{
    for(const id of ['old','new','migrate'])await agent(h,id);
    const old=await h.administration.createTask({id:'old',agent_id:'old',goal:'Use captured rules'});const migrating=await h.administration.createTask({id:'migrate',agent_id:'migrate',goal:'Explicit migration'});
    await h.administration.updateProjectRules('p',{version:'2',rules:['RULE_VERSION_TWO']});const next=await h.administration.createTask({id:'new',agent_id:'new',goal:'Use new rules'});
    assert.equal(old.rules_binding.project_rules_version,'1');assert.equal(next.rules_binding.project_rules_version,'2');assert.equal(h.inspectTask('old').rules_binding.rule_hash,old.rules_binding.rule_hash);
    const authorization=await h.store.artifacts.putBytes(Buffer.from('Synthetic explicit migration approval evidence.'));const migrated=await h.administration.migrateTaskRules('migrate','Explicitly upgrade this queued task to rules 2.',authorization);
    assert.equal(migrated.rules_binding.project_rules_version,'2');assert.notEqual(migrated.contract_ref.event_id,migrating.contract_ref.event_id);assert.equal(h.state.count('RULE_MIGRATION'),1);
    for(const id of ['old','new','migrate'])assert.equal((await h.administration.dispatch(id)).state,'SUCCEEDED');
    for(const [id,expected,excluded] of [['old','RULE_VERSION_ONE','RULE_VERSION_TWO'],['new','RULE_VERSION_TWO','RULE_VERSION_ONE']] as const){const view=h.state.list<{view_id:string}>('CONTEXT_VIEW',{task_id:id,limit:1})[0];const reconstructed=await h.context.reconstruct(h.inspectAgent(id).subject,view.view_id);assert(reconstructed.context.text.includes(expected));assert(!reconstructed.context.text.includes(excluded));assert.deepEqual(Buffer.from(reconstructed.bytes),Buffer.from(reconstructed.context.text));}
    const original=await h.context.readRange(h.inspectAgent('migrate').subject,migrating.contract_ref);assert(original.text.includes('"project_rules_version":"1"'));
  }finally{await h.close();}
});

test('M161 TASK handoff repeats the same frozen plan and preserves old rules after project update',async()=>{
  const {h}=await fixture();try{await agent(h,'lead',{read_tasks:['child']});await agent(h,'child',{type:'SUBAGENT',parent_id:'lead',read_tasks:['lead']});
    const source=await h.administration.createTask({id:'lead',agent_id:'lead',goal:'Delegate once'});await h.administration.updateProjectRules('p',{version:'2',rules:['RULE_VERSION_TWO']});
    const target=await h.administration.handoffTask('lead','child');const again=await h.administration.handoffTask('lead','child');assert.equal(again.creation_hash,target.creation_hash);assert.equal(again.rules_binding.rule_hash,source.rules_binding.rule_hash);assert.equal(h.state.count('TASK_HANDOFF'),1);assert.equal(h.state.count('TASK'),2);assert.equal(again.history.length,target.history.length);
    assert.equal((await h.administration.dispatch('child')).state,'SUCCEEDED');assert.equal(h.inspectTask('lead').state,'QUEUED');assert.equal((await h.administration.dispatch('lead')).state,'SUCCEEDED');
  }finally{await h.close();}
});

test('M161 GATE actual file candidate is bound from trusted PASS to the approved Storage input',async()=>{
  const root=await mkdtemp(join(base,'gate-write-')),h=await storageFixture(root);try{
    const a=await h.administration.captureStorageSource('writer',Buffer.from('approved A')),b=await h.administration.captureStorageSource('writer',Buffer.from('different B'));
    const baseline=await h.store.artifacts.putBytes(Buffer.from('baseline')),profile=await h.store.artifacts.putBytes(Buffer.from(canonical({schema:'agentnexus/gate-profile/1',required_checkers:{},manual_gates:[],qualification:'LOCAL_TRUSTED_LIBRARY'})));
    const task=await h.administration.createTask({id:'task',agent_id:'writer',goal:'Publish the Gate-bound candidate',requirements:{disk_bytes:32},gate_requirements:[{gate_id:'g1',record_id:null,candidate_hash:a.payload_ref.sha256,baseline_hash:baseline.sha256,test_profile_hash:profile.sha256}]});
    const gate=await h.administration.nativeGate('writer',{gate_id:'g1',binding:task.rules_binding,candidate_ref:a.payload_ref,baseline_ref:baseline,test_profile_ref:profile,evidence:[],author_id:'writer'});assert.equal(gate.status,'PASS');await h.administration.bindTaskGate('task','g1',gate.id);
    const request={resource_id:'project:files',path:'result.txt',mode:'CREATE' as const,expected_version:null,expected_sha256:null,source:b};await assert.rejects(h.administration.requestStorageWrite('task',request),/TASK_GATE_CANDIDATE_MISMATCH/);assert.equal(h.state.count('STORAGE_WRITE'),0);assert.deepEqual(await readdir(join(root,'files')),[]);
    await h.administration.requestStorageWrite('task',{...request,source:a});assert.equal((await execute(h)).state,'SUCCEEDED');assert.equal((await readFile(join(root,'files/result.txt'))).toString(),'approved A');
  }finally{await h.close();}
});

test('M161 FIVE AGENTS durable messages, independent tasks, event wake, resource competition and coordinator status grants',async()=>{
  const {h}=await fixture();try{
    await feature(h,'runtime.role.coordinator','ON');await h.administration.createProject({id:'other',rules:['Other project private rules'],budget:limits});
    await agent(h,'lead',{read_tasks:['sub','review','resident','coordinator']});await agent(h,'sub',{type:'SUBAGENT',parent_id:'lead',read_tasks:['lead'],work_role:'WORKER'});
    await agent(h,'review',{type:'BACKGROUND_REVIEWER',read_tasks:['lead'],work_role:'REVIEWER'});await agent(h,'resident',{type:'RESIDENT',read_tasks:['lead']});await agent(h,'coordinator',{type:'COORDINATOR',read_tasks:['lead'],read_projects:['p','other']});
    for(const id of ['lead','sub','review','resident','coordinator'])await h.administration.createTask({id,agent_id:id,goal:'Complete limited collaboration',requirements:{workers:1},wall_ms:120000});
    assert.equal(h.state.count('AGENT'),5);assert.equal(h.state.count('MODEL_REQUEST'),0);const coordinator=h.bindAgent('coordinator');assert.deepEqual(coordinator.projectStates().map(p=>p.project_id),['p','other']);assert(!canonical(coordinator.projectStates()).includes('private rules'));assert.equal('decision' in coordinator,false);assert.throws(()=>h.bindAgent('sub').projectStates(),/COORDINATOR_STATUS_SCOPE/);
    await assert.rejects(agent(h,'bad',{read_projects:['other']}),/COORDINATOR_READ_PROJECTS_ONLY/);
    await h.administration.pauseTask('resident');await h.administration.resumeTask('resident');
    const ids:string[]=[];for(const receiver of ['sub','review','resident','coordinator']){const message=await h.bindAgent('lead').sendText({receiver_agent_id:receiver,message_type:'TASK_INPUT',text:'Authorized immutable input',dedup_key:'input.'+receiver});ids.push(message.message_id);}
    await h.bindAgent('sub').sendText({receiver_agent_id:'lead',message_type:'RESULT',text:'Child reply',dedup_key:'sub.reply'});await h.bindAgent('review').sendText({receiver_agent_id:'lead',message_type:'REVIEW',text:'Read-only review report',dedup_key:'review.reply'});await h.bindAgent('resident').sendText({receiver_agent_id:'lead',message_type:'EVENT',text:'Resident event notification',dedup_key:'resident.event'});
    await h.bindAgent('coordinator').sendText({receiver_agent_id:'lead',message_type:'COORDINATION',text:'Scheduling status',dedup_key:'coord.status'});
    const outcomes=await Promise.all(['lead','sub','review','resident','coordinator'].map(id=>h.administration.dispatch(id).catch(e=>e as Error)));
    // Four native turns may be active; the fifth is explicitly retried only if it never entered.
    for(let i=0;i<outcomes.length;i++)if(outcomes[i] instanceof Error||h.inspectTask(['lead','sub','review','resident','coordinator'][i]).state==='WAITING_RESOURCES')assert.equal((await h.administration.dispatch(['lead','sub','review','resident','coordinator'][i])).state,'SUCCEEDED');
    for(const id of ['lead','sub','review','resident','coordinator'])assert.equal(h.inspectTask(id).state,'SUCCEEDED');
    assert.equal(h.state.count('MODEL_REQUEST'),5);for(const id of ['lead','sub','review','resident','coordinator'])assert.equal(h.inspectTask(id).attempts,1);
    const receipts=h.state.list<MessageHandoff>('MESSAGE_HANDOFF',{project_id:'p',limit:32});assert(receipts.length>=8);assert(receipts.every(r=>r.state==='COMPLETED'));
    assert.equal(new Set(receipts.map(r=>r.message_id)).size,receipts.length);assert.equal(h.state.count('resource_reservation',{state:'UNKNOWN_QUARANTINED'}),0);await h.store.verify();
  }finally{await h.close();}
});

test('M161 COORDINATOR notices cross only explicitly granted projects and preserve original identity',async()=>{
  const {h}=await fixture();try{await feature(h,'runtime.role.coordinator','ON');await h.administration.createProject({id:'q',rules:['Private q rules'],budget:limits});await h.administration.createProject({id:'denied',rules:['Private denied rules'],budget:limits});
    await agent(h,'lead');await agent(h,'q-worker',{project_id:'q'});await agent(h,'forbidden',{project_id:'denied'});await agent(h,'coord',{type:'COORDINATOR',read_projects:['p','q']});
    for(const id of ['lead','q-worker','forbidden'])await h.administration.createTask({id,agent_id:id,goal:'Receive only authorized notices'});
    const coord=h.bindAgent('coord');const one=await coord.notifyProject({project_id:'p',receiver_agent_id:'lead',text:'Status request',dedup_key:'p.notice'}),two=await coord.notifyProject({project_id:'q',receiver_agent_id:'q-worker',text:'Scheduling notice',dedup_key:'q.notice'});
    assert.equal(two.sender.project_id,'p');assert.equal(two.sender.agent_id,'coord');assert.equal(two.project_id,'q');assert.equal(two.payload.project_id,'q');assert.equal(two.effect,'INTERNAL');assert.equal(two.message_type,'COORDINATOR_NOTICE');
    const repeated=await coord.notifyProject({project_id:'q',receiver_agent_id:'q-worker',text:'Scheduling notice',dedup_key:'q.notice'});assert.equal(repeated.message_id,two.message_id);assert.equal(repeated.payload.event_id,two.payload.event_id);
    await assert.rejects(coord.notifyProject({project_id:'denied',receiver_agent_id:'forbidden',text:'Unauthorized',dedup_key:'deny'}),/COORDINATOR_NOTICE_SCOPE/);
    await assert.rejects(h.bindAgent('lead').notifyProject({project_id:'q',receiver_agent_id:'q-worker',text:'Unauthorized',dedup_key:'deny'}),/COORDINATOR_NOTICE_SCOPE/);
    await assert.rejects(coord.sendText({receiver_agent_id:'q-worker',message_type:'COMMAND',text:'No generic cross-project send',dedup_key:'deny.generic'}),/MESSAGE_PROJECT_DENIED/);
    for(const id of ['lead','q-worker'])assert.equal((await h.administration.dispatch(id)).state,'SUCCEEDED');assert.equal(h.inspectTask('forbidden').turns,0);
    for(const message of [one,two])assert.equal(h.state.get<MessageHandoff>('MESSAGE_HANDOFF',message.message_id)!.state,'COMPLETED');
  }finally{await h.close();}
});

test('M161 SUBAGENTS use independent contexts and parallel sibling messages without repeated tasks',async()=>{
  const {h}=await fixture();try{await agent(h,'lead',{read_tasks:['a','b']});await agent(h,'a',{type:'SUBAGENT',parent_id:'lead',read_tasks:['lead','b']});await agent(h,'b',{type:'SUBAGENT',parent_id:'lead',read_tasks:['lead','a']});
    for(const id of ['lead','a','b'])await h.administration.createTask({id,agent_id:id,goal:'Independent parallel collaboration'});
    assert.notEqual(h.inspectAgent('a').context_ref!.event_id,h.inspectAgent('b').context_ref!.event_id);assert.notEqual(h.inspectAgent('a').subject.resource_budget_id,h.inspectAgent('b').subject.resource_budget_id);
    for(const [from,to] of [['a','b'],['b','a']] as const)await h.bindAgent(from).sendText({receiver_agent_id:to,message_type:'PROGRESS',text:'Authorized sibling progress',dedup_key:from+'.to.'+to});
    const results=await Promise.all([h.administration.dispatch('a'),h.administration.dispatch('b')]);assert(results.every(t=>t.state==='SUCCEEDED'));assert.equal((await h.administration.dispatch('lead')).state,'SUCCEEDED');
    assert.equal(h.inspectTask('a').attempts,1);assert.equal(h.inspectTask('b').attempts,1);assert(h.state.list<MessageHandoff>('MESSAGE_HANDOFF',{limit:32}).every(m=>m.state==='COMPLETED'));await h.store.verify();
  }finally{await h.close();}
});

test('M161 PROJECT budgets compete atomically and resume a known undispatched waiter once',async()=>{
  const root=await mkdtemp(join(base,'projects-')),h=await openHarness(join(root,'host'),{platform_limits:{...limits,workers:1}});let release!:()=>void;let restore=()=>{};
  try{for(const id of ['p','q'])await h.administration.createProject({id,rules:['Synthetic project rules'],budget:limits});await agent(h,'a');await agent(h,'b',{project_id:'q'});for(const id of ['a','b'])await h.administration.createTask({id,agent_id:id,goal:'Use one shared platform slot',wall_ms:120000});
    let ready!:()=>void;const reached=new Promise<void>(r=>ready=r),gate=new Promise<void>(r=>release=r),flush=h.store.flush.bind(h.store);let held=false;
    h.store.flush=async()=>{await flush();const row=h.store.db.prepare("SELECT json_extract(body,'$.phase') AS phase,json_extract(body,'$.agent_id') AS agent FROM anx_records WHERE domain='audit' ORDER BY seq DESC LIMIT 1").get();if(!held&&row?.phase==='TASK_DISPATCHED'&&row.agent==='a'){held=true;ready();await gate;}};restore=()=>{release();h.store.flush=flush;};
    const running=h.administration.dispatch('a');await reached;assert.equal((await h.administration.dispatch('b')).state,'WAITING_RESOURCES');assert.equal(h.state.count('MODEL_REQUEST'),0);release();assert.equal((await running).state,'SUCCEEDED');assert.equal((await h.administration.dispatch('b')).state,'SUCCEEDED');assert.equal(h.inspectTask('b').attempts,1);assert.equal(h.state.count('MODEL_REQUEST'),2);assert.equal(h.state.count('resource_reservation',{state:'UNKNOWN_QUARANTINED'}),0);
  }finally{restore();await h.close();}
});
