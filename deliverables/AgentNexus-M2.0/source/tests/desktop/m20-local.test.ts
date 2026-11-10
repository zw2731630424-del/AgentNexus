import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { openDesktopService } from '../../src/agentnexus/desktop/service.ts';
import { defaultProfile } from '../../src/agentnexus/security/profile.ts';
import { WindowsCredentialManagerStorage } from '../../src/agentnexus/security/os-credentials.ts';

async function dir(){const p=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'.workflow-kit/runtime/m20-local');await mkdir(p,{recursive:true});return mkdtemp(join(p,'local-'));}
test('M20 native Windows Credential Manager: synthetic bytes roundtrip, namespace isolation and deletion', {skip:process.platform!=='win32'},async()=>{
  const storage=new WindowsCredentialManagerStorage(await dir()),other=new WindowsCredentialManagerStorage(await dir());const clear=Buffer.from('synthetic-test-native-credman-roundtrip-abcdef');const reference=await storage.protect(clear);
  try{const restored=await storage.unprotect(reference);assert.ok(Buffer.from(restored).equals(clear));restored.fill(0);assert.ok(!Buffer.from(reference).includes(clear));assert.throws(()=>other.unprotect(reference),/SECURITY_OS_CREDENTIAL_REFERENCE/);}finally{await storage.forget(reference);clear.fill(0);}
  await assert.rejects(storage.unprotect(reference),/SECURITY_OS_STORAGE_FAILED/);
});
test('M20 actual Local Desktop: no TPM/service, direct entry, Gateway, budgets, Agents, persistence and mode migration', {skip:process.platform!=='win32'},async()=>{
  const root=await dir();let service=await openDesktopService(root),op=service.openOperator();const invoke=(m:string,p:any={})=>op.invoke(m,p) as Promise<any>;let keyId:string|undefined;
  try{
    let s=await invoke('snapshot');assert.equal(s.security.active.mode,'LOCAL_DEVELOPMENT_MODE');assert.equal(s.credential_entry.direct,true);assert.equal(s.security.features.find((f:any)=>f.id==='credentials.isolatedService').status,'DISABLED');assert.equal(s.qualification.credential_service,'NOT_REQUIRED');assert.equal(s.agents.length,8);
    await invoke('provider.save',{id:'local',name:'Local Synthetic',preset_id:'custom',protocol:'openai-compatible',base_url:'https://synthetic.invalid/v1',enabled:true,revision:-1});
    const m=await invoke('model.save',{provider_id:'local',model_id:'synthetic-chat',name:'Synthetic Chat',enabled:true,context_tokens:65536,output_tokens:4096,capabilities:{reasoning:false,tools:false,json:true,streaming:true,multimodal:false},revision:-1});
    const sentinel='synthetic-test-m20-local-never-persist-clear-abcdef',bytes=Buffer.from(sentinel);
    const saved=await invoke('credential.save',{provider_id:'local',name:'Test Key',notes:'',secret:bytes,max_concurrency:4,requests_per_minute:120});keyId=saved.key_id;assert.equal(saved.status,'CREDENTIAL_SAVED');assert.ok(bytes.every(v=>v===0));
    const connection=await invoke('connection.test',{provider_id:'local',model_ref:m.ref,mode:'SIMULATED'});assert.equal(connection.simulation_passed,true);assert.notEqual(connection.status,'CONNECTED');
    await invoke('binding.save',{agent_id:'development',primary:m.ref,fallbacks:[],auto_route:false,failover:false,budget_tokens:1000000,revision:-1});
    const agents=['development','coding','reviewer'];const results=await Promise.all(agents.map(id=>service.bindAgent(id).complete('Synthetic local collaboration for '+id)));assert.ok(results.every(r=>r.outcome==='SUCCEEDED'&&r.assurance==='SIMULATED'));
    s=await invoke('snapshot');const used=s.usage.simulated_budget.used.tokens;assert.equal(used,120);assert.equal(s.usage.global.limit,100000000);assert.equal(s.usage.global.used,0);assert.equal(s.usage.real.input_tokens,0);assert.equal(s.keys[0].protection,'WINDOWS_CREDENTIAL_MANAGER_CURRENT_USER');
    assert.deepEqual(Object.keys(service.bindAgent('coding')),['complete']);await assert.rejects(invoke('security.commit',{id:'fake',hash:'0',confirmation:'APPLY_SECURITY_CHANGE',role:'Agent'}),/INVALID_INPUT/);await assert.rejects(invoke('credential.read',{key_id:keyId}),/METHOD_DENIED/);
    const p=s.security.desired;p.features['budget.global']=false;p.features['budget.costDisplay']=false;p.budgets.globalTokens=1000;let plan=await invoke('security.preview',{profile:p,revision:s.security.revision});await invoke('security.commit',{id:plan.id,hash:plan.hash,confirmation:'APPLY_SECURITY_CHANGE'});
    assert.equal((await service.bindAgent('development').complete('Synthetic budgets disabled only at platform scope')).outcome,'SUCCEEDED');
    s=await invoke('snapshot');assert.equal(s.usage.simulated_budget.used.tokens,used+30);assert.equal(s.security.active.features['budget.global'],false);
    const enabled=s.security.desired;enabled.features['budget.global']=true;plan=await invoke('security.preview',{profile:enabled,revision:s.security.revision});await invoke('security.commit',{id:plan.id,hash:plan.hash,confirmation:'APPLY_SECURITY_CHANGE'});
    assert.equal((await service.bindAgent('development').complete('This exceeds the configured 1000 token preflight budget')).outcome,'FAILED');
    const beforeRestart=(await invoke('snapshot')).usage.simulated_budget.used.tokens;op.revoke();await service.close();service=await openDesktopService(root);op=service.openOperator();s=await invoke('snapshot');assert.equal(s.keys.length,1);assert.equal(s.usage.simulated_budget.used.tokens,beforeRestart);assert.equal(s.security.active.features['budget.costDisplay'],false);
    for(const file of ['host/kernel.sqlite','host/kernel.sqlite-wal','local-vault/vault.sqlite','local-vault/vault.sqlite-wal','security/security.sqlite','security/security.sqlite-wal']){const b=await readFile(join(root,file)).catch(()=>Buffer.alloc(0));assert.equal(b.includes(Buffer.from(sentinel)),false,file);}
    const hardened=defaultProfile('HARDENED_DEPLOYMENT_MODE');plan=await invoke('security.preview',{profile:hardened,revision:s.security.revision});await invoke('security.commit',{id:plan.id,hash:plan.hash,confirmation:'APPLY_SECURITY_CHANGE'});assert.equal((await invoke('snapshot')).security.pendingRestart,true);
    op.revoke();await service.close();service=await openDesktopService(root);op=service.openOperator();s=await invoke('snapshot');assert.equal(s.security.active.mode,'HARDENED_DEPLOYMENT_MODE');assert.equal(s.security.qualification,'BLOCKED');assert.equal(s.keys.length,0);await assert.rejects(service.bindAgent('development').complete('No local fallback'),/SECURITY_CREDENTIAL_BACKEND_BLOCKED/);
    plan=await invoke('security.preview',{profile:defaultProfile(),revision:s.security.revision});await invoke('security.commit',{id:plan.id,hash:plan.hash,confirmation:'APPLY_SECURITY_CHANGE'});op.revoke();await service.close();service=await openDesktopService(root);op=service.openOperator();s=await invoke('snapshot');assert.equal(s.keys.length,1);assert.equal(s.usage.simulated_budget.used.tokens,beforeRestart);assert.equal(s.security.legacyQualificationUnchanged,true);
  }finally{if(keyId)await invoke('credential.delete',{key_id:keyId}).catch(()=>{});op.revoke();await service.close();}
});
