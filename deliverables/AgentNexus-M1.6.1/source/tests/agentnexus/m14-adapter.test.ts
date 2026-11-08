import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir,mkdtemp,readFile } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../../src/agentnexus/types.ts';
import { NativeClient,WindowsFileOwner } from '../../src/agentnexus/production/native-client.ts';

const powerShell=process.env.AGENTNEXUS_TEST_POWERSHELL_PATH;
test('M14-ADAPTER REAL_WINDOWS_LIMITED: pinned native RPC maps handle-based files and bounded identities', {skip:process.platform!=='win32'||!powerShell?'NOT_RUN: fixed absolute PowerShell path required':false},async t=>{
  const root=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'.workflow-kit/runtime/AgentNexus-M1.4/data','adapter');await mkdir(root,{recursive:true});const directory=await mkdtemp(join(root,'case-'));
  const script=fileURLToPath(new URL('../../src/agentnexus/production/windows/runtime.ps1',import.meta.url)),native=fileURLToPath(new URL('../../src/agentnexus/production/windows/NativeRuntime.cs',import.meta.url));
  const options={powerShell:powerShell!,script,script_hash:sha256(await readFile(script)),native_hash:sha256(await readFile(native)),temporary_directory:directory};
  await assert.rejects(NativeClient.open({...options,native_hash:'a'.repeat(64)}),{code:'M14_NATIVE_HASH_CHANGED'});
  const client=await NativeClient.open(options);t.after(()=>client.close());const identity=await client.request('identity');assert.equal(identity.pid,client.pid);assert.ok(identity.token.user_sid);
  const owner=new WindowsFileOwner(client),content=Buffer.from('native adapter version');const write=await owner.create(directory,'result.txt',content);assert.equal(write.sha256,sha256(content));
  const read=await owner.read(directory,'result.txt',1024);assert.equal(read.file_id,write.file_id);assert.equal(read.links,1);assert.deepEqual(read.data,content);assert.equal(read.assurance,'REAL_WINDOWS');
  await assert.rejects(owner.read(directory,'../outside',1024),{code:'M14_NATIVE_PATH_REJECTED'});
  await assert.rejects(owner.create(directory,'result.txt',content));
  assert.ok(read.bytes<=24576);
});
