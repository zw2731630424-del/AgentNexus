import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openHarness} from '../../source/src/agentnexus/harness/index.ts';
import {sha256} from '../../source/src/agentnexus/types.ts';

const evidence=dirname(fileURLToPath(import.meta.url));await mkdir(join(evidence,'runtime'),{recursive:true});
const root=await mkdtemp(join(evidence,'runtime','workflow-race-')),h=await openHarness(root);let release;
const output={node:process.version,observed_at:new Date().toISOString(),name:'gate-off-during-evidence-verification'};
try{
  await h.administration.createProject({id:'probe',rules:['Independent review mock workflow evidence only.']});
  const actor=await h.administration.createAgent({id:'lead',project_id:'probe',task_id:'review-task',type:'DEVELOPMENT',budget:{workers:1}});
  let reached,used=false;const ready=new Promise(r=>reached=r),gate=new Promise(r=>release=r),read=h.store.artifacts.read.bind(h.store.artifacts);
  h.store.artifacts.read=async function*(ref){for await(const chunk of read(ref)){yield chunk;if(!used){used=true;reached();await gate;}}};
  try{
    const running=h.administration.gate('lead',{gate_id:'g2',status:'SIMULATED',candidate_hash:sha256('review fixture only'),baseline:'112d915c97ee6e6214f7ce05eab8bd492bbb9bc6',
      test_profile_hash:sha256('independent feature race'),evidence_refs:[actor.context_ref.payload_ref],reason:'Fixture status only; no product or OS qualification',author_id:'lead',reviewer_id:null});
    await ready;const meta=h.administration.features.metadata(),preview=await h.administration.features.previewFeatures([{id:'wf.gate.g2',scope:{project_id:'probe'},state:'OFF'}],meta.feature_revision);
    await h.administration.features.commitFeatures(preview.challenge_id,preview.preview_hash);release();const record=await running;
    Object.assign(output,{feature_effective:h.state.enabled('wf.gate.g2',actor.subject),record_status:record.status,record_feature_enabled:record.feature_enabled});
  }finally{release?.();h.store.artifacts.read=read;}
}catch(e){Object.assign(output,{probe_error:String(e),stack:e.stack});}finally{release?.();await h.close();}
const label=process.env.REVIEW_RUN_LABEL??'initial';await writeFile(join(evidence,'workflow-results-'+label+'.json'),JSON.stringify(output,null,2)+'\n');process.stdout.write(JSON.stringify(output)+'\n');
