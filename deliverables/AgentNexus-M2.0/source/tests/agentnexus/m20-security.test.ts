import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { defaultProfile, validateProfile, resolveFeatures, migrateProfile, SECURITY_FEATURES } from '../../src/agentnexus/security/profile.ts';
import { SecurityController } from '../../src/agentnexus/security/controller.ts';
import { openHost } from '../../src/agentnexus/host.ts';
import { invariant } from '../../src/agentnexus/types.ts';

const env = () => ({ osStorage: true, storageAssurance: 'REAL' as const, service: false, qualified: [] });
async function root() { const p = resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/m20-tests'); await mkdir(p, {recursive:true}); return mkdtemp(join(p,'security-')); }
function change(c:SecurityController, edit:(p:ReturnType<typeof defaultProfile>)=>void) { const p=c.profile();edit(p);const plan=c.preview(p,c.snapshot().revision);return c.commit(plan.id,plan.hash,'APPLY_SECURITY_CHANGE'); }
const identity = {agent_id:'worker',project_id:'project',task_id:'task',session_id:'session'};

test('M20 schema: Local defaults need no service, TPM, signer or CMS; Hardened never silently falls back', () => {
  const local=validateProfile(defaultProfile());
  for(const id of ['credentials.isolatedService','deployment.tpmCng','deployment.signer','deployment.cmsApproval'])assert.equal(local.features[id],false);
  const hardened=defaultProfile('HARDENED_DEPLOYMENT_MODE');assert.equal(hardened.features['deployment.tpmCng'],false);
  assert.ok(resolveFeatures(hardened,env()).some(f=>f.status==='BLOCKED'));
  hardened.features['budget.global']=false;assert.equal(resolveFeatures(hardened,env()).find(f=>f.id==='budget.global')?.status,'BLOCKED');
  hardened.features['credentials.isolatedService']=false; assert.throws(()=>validateProfile(hardened),/SECURITY_HARDENED_NO_DOWNGRADE/);
});
test('M20 schema: strict fields, unsupported versions, fixed secret boundary and invalid combinations rejected',()=>{
  assert.throws(()=>validateProfile({...defaultProfile(),apiKey:'synthetic-test-never-config'}),/SECURITY_SCHEMA/);
  assert.throws(()=>validateProfile({...defaultProfile(),version:99}),/SECURITY_VERSION/);
  const p=defaultProfile();p.features['credentials.secretRedaction']=false;assert.throws(()=>validateProfile(p),/SECURITY_FIXED_BOUNDARY/);
  const q=defaultProfile();q.features['credentials.isolatedService']=true;assert.throws(()=>validateProfile(q),/SECURITY_CREDENTIAL_BACKEND_CONFLICT/);
  const r=defaultProfile();r.features['policy.engine']=false;assert.throws(()=>validateProfile(r),/SECURITY_POLICY_DEPENDENCY/);
  const s=defaultProfile();s.features['data.classification']=false;assert.throws(()=>validateProfile(s),/SECURITY_EGRESS_DEPENDENCY/);
});
test('M20 registry: all categories resolve; simulated storage never becomes enabled or qualified',()=>{
  const features=resolveFeatures(defaultProfile(),{...env(),storageAssurance:'SIMULATED'});
  assert.equal(features.find(f=>f.id==='credentials.osStorage')?.status,'BLOCKED');
  assert.equal(features.find(f=>f.id==='credentials.osStorage')?.verification,'SIMULATED');
  assert.equal(new Set(features.map(f=>f.id)).size,SECURITY_FEATURES.length);
  const p=defaultProfile();p.features['execution.shellApproval']=true;assert.equal(resolveFeatures(p,env()).find(f=>f.id==='execution.shellApproval')?.status,'NOT_AVAILABLE');
});
test('M20 version migration is explicit and only migrates configuration',()=>{
  assert.equal(migrateProfile({version:0,mode:'LOCAL_DEVELOPMENT_MODE'}).from,0);
  assert.deepEqual(migrateProfile(defaultProfile()).profile,defaultProfile());
  assert.throws(()=>migrateProfile({version:0,mode:'LOCAL_DEVELOPMENT_MODE',ledger:[]}),/SECURITY_SCHEMA/);
});
test('M20 plans: exact confirmation, hash binding, one-use and concurrent revision fence',async()=>{
  const dir=await root(),a=SecurityController.open(dir,env),b=SecurityController.open(dir,env);
  try {
    const p=a.profile();p.features['audit.commands']=false;const plan=a.preview(p,0,['development']);
    assert.ok(plan.risks.length);assert.ok(plan.affected.includes('development'));
    assert.throws(()=>a.commit(plan.id,plan.hash,''),/SECURITY_CONFIRMATION_REQUIRED/);
    assert.throws(()=>a.commit(plan.id,'0'.repeat(64),'APPLY_SECURITY_CHANGE'),/SECURITY_PLAN_STALE/);
    const other=b.preview(p,0);a.commit(plan.id,plan.hash,'APPLY_SECURITY_CHANGE');
    assert.throws(()=>a.commit(plan.id,plan.hash,'APPLY_SECURITY_CHANGE'),/SECURITY_PLAN_STALE/);
    assert.throws(()=>b.commit(other.id,other.hash,'APPLY_SECURITY_CHANGE'),/SECURITY_REVISION_CONFLICT/);
    a.verifyAudit(); assert.ok(a.audit().some(r=>r.kind==='PROFILE_CHANGED'&&r.actor==='TRUSTED_MANAGEMENT_UI'&&r.body.before&&r.body.after&&r.body.risk));
  } finally {a.close();b.close();}
});
test('M20 mode migration waits for restart; reopening revalidates and Hardened stays blocked',async()=>{
  const dir=await root();let c=SecurityController.open(dir,env);
  const plan=c.preview(defaultProfile('HARDENED_DEPLOYMENT_MODE'),0);const result=c.commit(plan.id,plan.hash,'APPLY_SECURITY_CHANGE');
  assert.equal(result.pendingRestart,true);assert.equal(result.active.mode,'LOCAL_DEVELOPMENT_MODE');assert.equal(result.desired.mode,'HARDENED_DEPLOYMENT_MODE');
  assert.ok(plan.servicesToRestart.length);assert.ok(plan.incompatible.length);c.close();c=SecurityController.open(dir,env);
  assert.equal(c.snapshot().active.mode,'HARDENED_DEPLOYMENT_MODE');assert.equal(c.snapshot().qualification,'BLOCKED');
  const local=c.preview(defaultProfile(),c.snapshot().revision);assert.equal(local.restart,true);c.commit(local.id,local.hash,'APPLY_SECURITY_CHANGE');c.close();
  c=SecurityController.open(dir,env);assert.equal(c.profile().mode,'LOCAL_DEVELOPMENT_MODE');assert.equal(c.audit().filter(a=>a.kind==='PROFILE_CHANGED').length,2);c.close();
});
test('M20 audit: disabling optional command audit stops its producer; configuration audit remains',async()=>{
  const c=SecurityController.open(await root(),env);
  try { c.record('COMMAND',{tool_id:'synthetic.tool'});change(c,p=>{p.features['audit.commands']=false;});c.record('COMMAND',{tool_id:'synthetic.tool'});assert.equal(c.audit().filter(a=>a.kind==='COMMAND').length,1);assert.equal(c.audit().filter(a=>a.kind==='PROFILE_CHANGED').length,1);assert.throws(()=>c.record('TOOL',{prompt:'sensitive text'} as any),/SECURITY_AUDIT_METADATA_ONLY/); } finally {c.close();}
});
test('M20 audit chain detects persisted edits; it does not claim administrator tamper resistance',async()=>{
  const dir=await root();const c=SecurityController.open(dir,env);c.close();const db=new DatabaseSync(join(dir,'security.sqlite'));db.prepare("UPDATE security_audit SET body='{}' WHERE seq=1").run();db.close();assert.throws(()=>SecurityController.open(dir,env),/SECURITY_AUDIT_INTEGRITY/);
});
test('M20 Data Egress: actual deny, advisory and disabled outcomes; no fabricated admission',async()=>{
  const c=SecurityController.open(await root(),env);
  const input:any={subject:{agent_id:'worker',project_id:'project'},request:{headers:{'x-agentnexus-request-id':'req'},body:'{"messages":[{"content":"private project"}]}'},model:{provider_id:'custom',model_id:'model',price:{assurance:'REAL'}}};
  try {
    assert.throws(()=>c.admitProvider(input),/SECURITY_DATA_EGRESS_BLOCKED/);
    change(c,p=>{p.dataEgress.enforcement='ADVISORY';});assert.equal(c.admitProvider(input).decision,'WOULD_DENY');
    change(c,p=>{p.dataEgress.enforcement='OFF';p.features['data.egress']=false;});assert.equal(c.admitProvider(input).decision,'NOT_ENFORCED');
    change(c,p=>{p.dataEgress.enforcement='ENFORCED';p.features['data.egress']=true;p.dataEgress.scopes=[{scope:'PROVIDER',id:'custom',classification:'INTERNAL',decision:'ALLOW'}];});assert.equal(c.admitProvider(input).decision,'ALLOW');
    const audit=JSON.stringify(c.audit());assert.ok(!audit.includes('private project'));assert.ok(!audit.includes('grant_id'));
  } finally {c.close();}
});
test('M20 generic secret scan really switches off and on independently of known-key boundary',async()=>{
  const c=SecurityController.open(await root(),env);const input:any={subject:{agent_id:'worker',project_id:'project'},request:{headers:{'x-agentnexus-request-id':'req'},body:'{"text":"sk-syntheticNotARealCredential00000000000000"}'},model:{provider_id:'custom',model_id:'model',price:{assurance:'REAL'}}};
  try {change(c,p=>{p.dataEgress.defaultDecision='ALLOW';});assert.throws(()=>c.admitProvider(input),/SECURITY_DATA_EGRESS_BLOCKED/);change(c,p=>{p.features['data.secretScanning']=false;});assert.equal(c.admitProvider(input).decision,'ALLOW');change(c,p=>{p.features['data.secretScanning']=true;});assert.throws(()=>c.admitProvider(input),/SECURITY_DATA_EGRESS_BLOCKED/);}finally{c.close();}
});
test('M20 actual Tool Gateway: ENFORCED blocks, ADVISORY computes, OFF does not evaluate; Agent cannot edit Profile',async()=>{
  const dir=await root(),c=SecurityController.open(join(dir,'security'),env);let evaluated=0;
  const host=await openHost(join(dir,'host'),{adaptiveSecurity:c,ruleEvaluator:()=>{evaluated++;return'DENY';}}),agent=host.bindAgent(identity);
  host.administration.registerTool({id:'synthetic.pure',version:'1',feature_id:'tool.test',capability:'PURE',requires_sandbox:false,policy_ids:['P.STYLE'],schema:()=>{},execute:()=>({data:{ok:true}})});
  const run=(call_id:string)=>agent.request({call_id,tool_id:'synthetic.pure',tool_version:'1',arguments:{}});
  try {
    assert.equal((await run('enforced')).status,'BLOCKED');assert.equal(evaluated,1);
    change(c,p=>{p.policy.enforcement='ADVISORY';});assert.equal((await run('advisory')).status,'PASS');assert.equal(evaluated,2);
    change(c,p=>{p.policy.enforcement='OFF';p.features['policy.enforcement']=false;});assert.equal((await run('off')).status,'PASS');assert.equal(evaluated,2);
    const denied=await agent.request({call_id:'prompt-profile',tool_id:'security.commit',tool_version:'1',arguments:{mode:'OFF'}});assert.equal(denied.status,'BLOCKED');assert.equal(c.profile().policy.enforcement,'OFF');assert.ok(!Object.hasOwn(agent,'administration'));
    change(c,p=>{p.policy.enforcement='ENFORCED';p.features['policy.enforcement']=true;});assert.equal((await run('enforced-again')).status,'BLOCKED');
    const rows=host.store.query('audit',{project_id:'project',limit:100}).map(x=>x.body as any);assert.ok(rows.some(x=>x.detail?.facts?.some((f:any)=>f.result==='WOULD_DENY')));
  } finally {await agent.close();await host.close();c.close();}
});
test('M20 actual validation switch stops validator; optional local write approval is configurable; sandbox owner stays blocked',async()=>{
  const dir=await root(),c=SecurityController.open(join(dir,'security'),env),host=await openHost(join(dir,'host'),{adaptiveSecurity:c}),agent=host.bindAgent(identity);let validations=0,writes=0;
  host.administration.registerTool({id:'synthetic.validate',version:'1',feature_id:'tool.test',capability:'PURE',requires_sandbox:false,policy_ids:['P.STYLE'],schema:()=>{},validate:async()=>{validations++;invariant(false,'SYNTHETIC_VALIDATION_STOP');},execute:()=>({data:null})});
  host.administration.registerTool({id:'synthetic.write',version:'1',feature_id:'tool.test',capability:'LOCAL_WRITE',requires_sandbox:false,policy_ids:['P.COMMAND_RISK'],schema:()=>{},writer_resource:()=>identity.project_id+':counter',execute:()=>{writes++;return{data:null};}});
  host.administration.registerTool({id:'synthetic.process',version:'1',feature_id:'tool.test',capability:'PROCESS',requires_sandbox:true,policy_ids:['P.COMMAND_RISK'],writer_resource:()=>identity.project_id+':process',schema:()=>{},execute:()=>({data:null})});
  const req=(id:string,tool:string,resource_id?:string)=>({call_id:id,tool_id:tool,tool_version:'1',arguments:{},...(resource_id?{resource_id}:{})});
  try{
    assert.equal((await agent.request(req('validation-on','synthetic.validate'))).status,'BLOCKED');assert.equal(validations,1);
    change(c,p=>{p.features['execution.commandValidation']=false;});assert.equal((await agent.request(req('validation-off','synthetic.validate'))).status,'PASS');assert.equal(validations,1);
    assert.equal((await agent.request(req('approval-on','synthetic.write','project:counter'))).status,'BLOCKED');
    change(c,p=>{p.features['policy.approval']=false;p.features['execution.fileWriteApproval']=false;});assert.equal((await agent.request(req('approval-off','synthetic.write','project:counter'))).status,'PASS');assert.equal(writes,1);
    assert.equal((await agent.request(req('wrong-scope','synthetic.write','other:counter'))).status,'BLOCKED');
    change(c,p=>{p.policy.enforcement='OFF';p.features['policy.enforcement']=false;});assert.equal((await agent.request(req('process-still-blocked','synthetic.process'))).reason,'SANDBOX_NOT_VERIFIED');
  }finally{await agent.close();await host.close();c.close();}
});
