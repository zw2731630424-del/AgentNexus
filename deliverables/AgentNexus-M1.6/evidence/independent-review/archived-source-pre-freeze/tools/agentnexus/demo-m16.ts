import { mkdir,mkdtemp,readFile,writeFile } from 'node:fs/promises';
import { resolve,join,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import { AGENT_TYPES } from '../../src/agentnexus/harness/contracts.ts';
import { sha256 } from '../../src/agentnexus/types.ts';

const args=process.argv.slice(2);
if(args.length!==4||args[0]!=='--output-root'||args[2]!=='--rules')throw Error('Use --output-root <outside source> --rules <explicit project rules file>');
const base=resolve(args[1]),source=resolve(fileURLToPath(new URL('../../',import.meta.url)));
if(base===source||base.startsWith(source+sep))throw Error('Demo data must be outside source');
const rules=await readFile(resolve(args[3]),'utf8');if(Buffer.byteLength(rules)>16384)throw Error('Rules exceed demo capture budget');
await mkdir(base,{recursive:true});const root=await mkdtemp(join(base,'native-'));
const mockModels=['mock-main','mock-sub','mock-review'].map(model_id=>({model_id,provider_id:'mock-provider',max_input_tokens:65536,max_output_tokens:4096,input_cost_micros_per_token:1,output_cost_micros_per_token:1}));
const routes=Object.fromEntries(Object.keys(AGENT_TYPES).map(type=>[type,[type==='SUBAGENT'?'mock-sub':type==='BACKGROUND_REVIEWER'?'mock-review':'mock-main']]));
const h=await openHarness(root,{models:mockModels,routes:{mock:routes},mocks:{
  'mock-main':[{reply:{kind:'WAIT',text:'Wait for delegated work'}},{reply:{kind:'TOOL_CALL',tool_name:'native.echo',arguments:{message:'Native Gateway integration'}}},{reply:{kind:'WAIT',text:'Wait for review'}},{reply:{kind:'FINAL',text:'SIMULATED integration complete'}}],
  'mock-sub':[{reply:{kind:'FINAL',text:'SIMULATED structured subagent deliverable'}}],
  'mock-review':[{reply:{kind:'TOOL_CALL',tool_name:'native.diagnostics',arguments:{language:'json',source:'{"broken":}',document_uri:'memory:review.json',version:1}}},{reply:{kind:'FINAL',text:'SIMULATED reviewer: JSON fixture has invalid syntax'}}],
}});
const budget={workers:1,memory_bytes:67108864,model_tokens:100000,model_requests:100,model_cost_micros:1000000,wall_ms:1000000};
try {
  await h.administration.createProject({id:'demo',rules:[rules]});
  const meta=h.administration.features.metadata(),change=await h.administration.features.previewFeatures([{id:'runtime.role.coordinator',scope:{},state:'ON'}],meta.feature_revision);
  await h.administration.features.commitFeatures(change.challenge_id,change.preview_hash);
  await h.administration.createAgent({id:'resident',project_id:'demo',task_id:'demo-resident',type:'RESIDENT',budget});
  await h.administration.createAgent({id:'lead',project_id:'demo',task_id:'demo-lead',type:'DEVELOPMENT',read_tasks:['demo-sub','demo-review'],budget});
  await h.administration.createAgent({id:'sub',project_id:'demo',task_id:'demo-sub',type:'SUBAGENT',parent_id:'lead',work_role:'WORKER',budget});
  await h.administration.createAgent({id:'reviewer',project_id:'demo',task_id:'demo-review',type:'BACKGROUND_REVIEWER',work_role:'REVIEWER',tools:[{tool_id:'native.diagnostics',version:'1',capability:'READ_ONLY',resources:[]}],budget});
  await h.administration.createAgent({id:'coordinator',project_id:'demo',task_id:'demo-coordinate',type:'COORDINATOR',budget});
  await h.administration.createTask({id:'demo-lead',agent_id:'lead',goal:'Integrate a subagent result and source-bound review; use restricted tools.'});
  await h.administration.createTask({id:'demo-sub',agent_id:'sub',goal:'Return a structured simulated deliverable without filesystem effects.'});
  const candidate='{"broken":}',input=await h.administration.captureContext('reviewer',candidate);
  await h.administration.createTask({id:'demo-review',agent_id:'reviewer',goal:'Check this exact captured JSON fixture; report correctness only.',
    review_binding:{commit:'112d915c97ee6e6214f7ce05eab8bd492bbb9bc6',diff_sha256:sha256(candidate),candidate_sha256:sha256(candidate),author_agent_id:'lead'},
    inputs:[{source:input,section:'FILE_CONTENT',required:true}]});
  await h.administration.dispatch('demo-lead');await h.administration.dispatch('demo-sub');
  await h.administration.dispatch('demo-lead');await h.administration.dispatch('demo-review');
  const task=await h.administration.dispatch('demo-lead');
  const review=h.inspectTask('demo-review');
  await h.administration.gate('reviewer',{gate_id:'g3',status:'SIMULATED',candidate_hash:sha256(candidate),baseline:'112d915c97ee6e6214f7ce05eab8bd492bbb9bc6',test_profile_hash:sha256('m16-demo-json'),evidence_refs:[review.result_ref!.payload_ref],author_id:'lead',reviewer_id:'reviewer',reason:'Mock review loop; native JSON parser executed on the captured fixture'});
  const integrity=await h.store.verify();
  const result={schema:'agentnexus/m16/demo/1',root,qualification:h.qualification,task_state:task.state,types:Object.keys(AGENT_TYPES),model_requests:h.state.count('MODEL_REQUEST'),messages:h.state.count('MESSAGE'),received_message_ids:task.received_message_ids,
    review_state:review.state,active_reservations:h.state.count('resource_reservation',{state:'ACTIVE'}),unknown_reservations:h.state.count('resource_reservation',{state:'UNKNOWN_QUARANTINED'}),integrity,
    limitations:['No real provider','No production OS worker','No automatic Git watcher','Gate is SIMULATED; JSON parser result is a local check']};
  await writeFile(join(root,'demo-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(task.state!=='SUCCEEDED'||review.state!=='SUCCEEDED'||result.active_reservations!==0)process.exitCode=1;
}finally{await h.close();}
