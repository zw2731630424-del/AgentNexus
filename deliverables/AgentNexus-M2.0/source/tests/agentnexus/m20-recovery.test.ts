import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {SecurityController} from '../../src/agentnexus/security/controller.ts';
import {defaultProfile} from '../../src/agentnexus/security/profile.ts';
import {CredentialVault,createVaultAdminCapability,SyntheticMemoryProtector} from '../../src/agentnexus/model-runtime/vault.ts';
import {openDesktopService} from '../../src/agentnexus/desktop/service.ts';
async function root(){const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'.workflow-kit/runtime/m20-recovery');await mkdir(base,{recursive:true});return mkdtemp(join(base,'case-'));}
const environment=()=>({osStorage:true,storageAssurance:'REAL' as const,service:false,qualified:[]});
test('M20 legacy bootstrap preserves strict mode and never resets or migrates old accounting',async()=>{
  const dir=await root();await mkdir(join(dir,'host'));const ledger=new DatabaseSync(join(dir,'host/kernel.sqlite'));ledger.exec('CREATE TABLE inherited_usage(tokens INTEGER NOT NULL); INSERT INTO inherited_usage VALUES(41)');ledger.close();
  let c=SecurityController.open(join(dir,'security'),environment);assert.equal(c.profile().mode,'HARDENED_DEPLOYMENT_MODE');assert.equal(c.legacyLedgerPending,true);const plan=c.preview(defaultProfile(),0);c.commit(plan.id,plan.hash,'APPLY_SECURITY_CHANGE');c.close();
  c=SecurityController.open(join(dir,'security'),environment);assert.equal(c.profile().mode,'LOCAL_DEVELOPMENT_MODE');assert.equal(c.snapshot().realLedgerAuthority,'UNRESOLVED_LEGACY_LEDGER_NO_MIGRATION');c.close();
  const check=new DatabaseSync(join(dir,'host/kernel.sqlite'),{readOnly:true});assert.equal((check.prepare('SELECT tokens FROM inherited_usage').get() as any).tokens,41);check.close();
});
test('M20 pending secret metadata is rejected before credential intent audit is created',async()=>{
  const dir=await root(),protector=new SyntheticMemoryProtector(),service=await openDesktopService(dir,{protector,syntheticCredentialFixture:true}),op=service.openOperator();
  const sentinel='synthetic-test-pending-provider-secret-abcdef';
  try{await op.invoke('provider.save',{id:sentinel,name:'Synthetic',preset_id:'custom',protocol:'openai-compatible',base_url:'https://synthetic.invalid',enabled:true,revision:-1});await op.invoke('model.save',{provider_id:sentinel,model_id:'test',name:'Test',enabled:true,context_tokens:65536,output_tokens:4096,capabilities:{reasoning:false,tools:false,json:true,streaming:true,multimodal:false},revision:-1});await assert.rejects(op.invoke('credential.save',{provider_id:sentinel,name:'Test',notes:'',secret:Buffer.from(sentinel),max_concurrency:1,requests_per_minute:120}),/CREDENTIAL_SAVE_FAILED/);
    const db=new DatabaseSync(join(dir,'host/kernel.sqlite'),{readOnly:true});const row=db.prepare("SELECT count(*) n FROM anx_records WHERE json_extract(body,'$.phase')='DESKTOP_CREDENTIAL_INTENT'").get() as any;assert.equal(row.n,0);db.close();
  }finally{op.revoke();await service.close();protector.destroy();}
});
test('M20 lost OS-delete acknowledgement, expiry and guard quarantine keep a recoverable terminal tombstone',async()=>{
  const dir=await root(),admin=createVaultAdminCapability(),values=new Map<string,Buffer>();let lose=true,reads=0;
  const protector={id:'synthetic-reference-store',protection:'SYNTHETIC_REFERENCE_STORE',async protect(b:Uint8Array){const id=randomUUID();values.set(id,Buffer.from(b));return Buffer.from(id);},async unprotect(b:Uint8Array){reads++;const v=values.get(Buffer.from(b).toString());assert.ok(v,'MISSING_REFERENCE');return Buffer.from(v);},async forget(b:Uint8Array){const id=Buffer.from(b).toString();values.get(id)?.fill(0);values.delete(id);if(lose){lose=false;throw Error('SIMULATED_ACK_LOST');}}};
  let v=await CredentialVault.open({root:dir,admin,mode:'LOCAL',protector});const secret=Buffer.from('synthetic-test-deleting-secret-abcdef');await v.add(admin,{key_id:'key',provider_id:'provider',models:['model'],secret,max_concurrency:1,requests_per_minute:120,expires_at:Date.now()+50});
  await assert.rejects(v.removeStored(admin,'key'),/SIMULATED_ACK_LOST/);assert.equal(v.list(admin)[0].state,'DELETING');assert.throws(()=>v.guard.assertSafe(secret,'TEST'),/VAULT_KNOWN_SECRET_BLOCKED/);await new Promise(r=>setTimeout(r,80));assert.equal(v.list(admin)[0].state,'DELETING');assert.throws(()=>v.setState(admin,'key','ACTIVE'),/VAULT_DELETE_PENDING/);v.close();
  const before=reads;v=await CredentialVault.open({root:dir,admin,mode:'LOCAL',protector});assert.equal(reads,before);assert.equal(v.list(admin)[0].state,'DELETING');await v.removeStored(admin,'key');assert.equal(v.list(admin).length,0);v.close();secret.fill(0);
});
test('M20 disabled OS storage performs no secret reads and blocks metadata/prompt persistence until protection returns',async()=>{
  const dir=await root(),admin=createVaultAdminCapability(),inner=new SyntheticMemoryProtector();let reads=0;
  const protector={id:inner.id,protection:inner.protection,protect:(b:Uint8Array)=>inner.protect(b),unprotect:(b:Uint8Array)=>{reads++;return inner.unprotect(b);}};
  const vault=await CredentialVault.open({root:join(dir,'local-vault'),admin,mode:'LOCAL',protector});const sentinel='synthetic-test-storage-disabled-secret-abcdef';await vault.add(admin,{key_id:'key',provider_id:'provider',models:['model'],secret:Buffer.from(sentinel),max_concurrency:1,requests_per_minute:120});vault.close();
  const c=SecurityController.open(join(dir,'security'),environment),p=defaultProfile();p.features['credentials.osStorage']=false;const plan=c.preview(p,0);c.commit(plan.id,plan.hash,'APPLY_SECURITY_CHANGE');c.close();
  const before=reads,service=await openDesktopService(dir,{security:true,protector}),op=service.openOperator();
  try{assert.equal(reads,before);const s=await op.invoke('snapshot') as any;assert.equal(s.security.features.find((f:any)=>f.id==='credentials.secretRedaction').status,'BLOCKED');await assert.rejects(op.invoke('provider.save',{id:sentinel}),/SECURITY_SECRET_BOUNDARY_UNAVAILABLE/);await assert.rejects(service.bindAgent('development').complete(sentinel),/SECURITY_CREDENTIAL_BACKEND_BLOCKED/);
    const q=s.security.desired;q.dataEgress.scopes=[{scope:'PROVIDER',id:sentinel,classification:'PUBLIC',decision:'ALLOW'}];await assert.rejects(op.invoke('security.preview',{profile:q,revision:s.security.revision}),/SECURITY_SECRET_BOUNDARY_UNAVAILABLE/);assert.equal(reads,before);
  }finally{op.revoke();await service.close();inner.destroy();}
});
