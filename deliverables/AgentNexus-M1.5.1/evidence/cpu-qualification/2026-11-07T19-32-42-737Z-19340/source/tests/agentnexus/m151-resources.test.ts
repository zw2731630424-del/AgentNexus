import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { assertResourceExecutionQualified, WINDOWS_RESOURCE_MECHANISMS } from '../../src/agentnexus/production/resources.ts';
import { QualificationGate, COMBINATION_CHECKS } from '../../src/agentnexus/production/qualification.ts';
import type { Qualification } from '../../src/agentnexus/production/qualification.ts';
import type { Runtime, Tool } from '../../src/agentnexus/production/contracts.ts';
import { signed } from '../../src/agentnexus/production/contracts.ts';
import type { SandboxProfile } from '../../src/agentnexus/runtime/contracts.ts';
import { profileHash } from '../../src/agentnexus/runtime/contracts.ts';
import { sha256 } from '../../src/agentnexus/types.ts';

test('M151 RESOURCE CONTRACT SIMULATED: valid signed full-check Windows certificate cannot enable a known failed CPU capability', () => {
  const host={os:'windows' as const,principal:'S-1-5-21-10-20-30-1001',pid:1001,start_id:'10',os_session:'1'};
  const worker={...host,principal:'S-1-5-21-10-20-30-1002',pid:1002,start_id:'20'};
  const profile:SandboxProfile={id:'m151',version:1,os:'windows',os_version:'SYNTHETIC',principal:worker.principal,accessible:['task'],read_only:['runtime'],writable:['output'],network:'DENY',limits:{memory_bytes:67108864,cpu_ms:80,wall_ms:4000,file_bytes:4096,processes:4,output_bytes:8192},lifetime:'ONE_OPERATION',exit_requirement:'COMPLETE_PROCESS_TREE'};
  const helper=sha256('synthetic helper'),key=generateKeyPairSync('ed25519');
  const tool:Tool={id:'synthetic',version:'1',feature_id:'runtime.worker.production',policy_ids:['P.COMMAND_RISK'],capability:'PROCESS',profile_hash:profileHash(profile),executable_hash:sha256('synthetic executable')};
  const runtime:Runtime={runtime_id:'runtime',logical:{agent_id:'agent',project_id:'project',task_id:'task',session_id:'session',role:'worker'},process:worker,parent:host,worker_instance_id:'instance',host_boot_id:'host-boot',broker_boot_id:'broker-boot',generation:1,profile,profile_hash:profileHash(profile),state:'ACTIVE',assurance:'REAL_WINDOWS'};
  const q:Qualification={schema:'agentnexus/qualification/1',profile_hash:runtime.profile_hash,helper_hash:helper,tool_hash:tool.executable_hash,host_sid:host.principal,worker_sid:worker.principal,os_version:profile.os_version,assurance:'REAL_WINDOWS',checks:[...COMBINATION_CHECKS],evidence_hash:sha256('synthetic full certificate'),expires_at:Date.now()+30000};
  const gate=new QualificationGate(key.publicKey,[signed(q,key.privateKey)],host);
  assert.throws(()=>gate.admit(runtime,tool,helper),{code:'M151_CPU_HARD_LIMIT_NOT_QUALIFIED'});
  const simulated={...runtime,assurance:'SIMULATED' as const};
  const model=new QualificationGate(key.publicKey,[signed({...q,assurance:'SIMULATED'},key.privateKey)],host);
  assert.equal(model.admit(simulated,tool,helper).assurance,'SIMULATED');
});

test('M151 RESOURCE CONTRACT: no runtime flag or unsupported assurance opens production', () => {
  assert.doesNotThrow(()=>assertResourceExecutionQualified('SIMULATED'));
  assert.throws(()=>assertResourceExecutionQualified('REAL_WINDOWS'),{code:'M151_CPU_HARD_LIMIT_NOT_QUALIFIED'});
  assert.equal(WINDOWS_RESOURCE_MECHANISMS.find(m=>m.resource==='CPU')?.qualification,'FAIL');
  assert.equal(Object.isFrozen(WINDOWS_RESOURCE_MECHANISMS),true);
  for(const mechanism of WINDOWS_RESOURCE_MECHANISMS)assert.equal(Object.isFrozen(mechanism),true);
});
