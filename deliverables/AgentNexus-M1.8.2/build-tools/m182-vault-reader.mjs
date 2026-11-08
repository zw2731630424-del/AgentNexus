// Negative isolation test: reads ONLY a newly created synthetic probe database.
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { resolve, sep, parse, join } from 'node:path';
import { lstat, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { WindowsCurrentUserDpapiProtector } from '../../deliverables/AgentNexus-M1.8.2/source/src/agentnexus/model-runtime/vault.ts';
const base = fileURLToPath(new URL('../../.workflow-kit/runtime/AgentNexus-M1.8.2/', import.meta.url));
const database = resolve(process.argv[2]);
if (!database.toLowerCase().startsWith(base.toLowerCase()) || !database.endsWith(sep + 'synthetic-vault' + sep + 'vault.sqlite')) throw Error('SYNTHETIC_PROBE_PATH_REQUIRED');
let component = parse(database).root;
for (const part of database.slice(component.length).split(sep)) {
  component = join(component, part); const info = await lstat(component);
  if (info.isSymbolicLink() || (await realpath(component)).toLowerCase() !== component.toLowerCase() ||
    (component === database ? !info.isFile() || info.nlink !== 1 : !info.isDirectory())) throw Error('SYNTHETIC_PROBE_PATH_REQUIRED');
}
const db = new DatabaseSync(database, { readOnly: true });
try {
  const metadata = Object.fromEntries(db.prepare("SELECT key,value FROM metadata WHERE key IN ('mode','protector','protection')").all().map(row => [row.key, row.value]));
  if (db.prepare('PRAGMA application_id').get().application_id !== 0x414e5638 || db.prepare('PRAGMA user_version').get().user_version !== 1 ||
    metadata.mode !== 'SYNTHETIC' || metadata.protector !== 'windows-current-user-dpapi-v1' || metadata.protection !== 'WINDOWS_DPAPI_CURRENT_USER') throw Error('SYNTHETIC_VAULT_METADATA_REQUIRED');
  const row = db.prepare("SELECT ciphertext FROM credentials WHERE key_id='synthetic.probe'").get();
  if (!row) throw Error('SYNTHETIC_PROBE_KEY_REQUIRED');
  const clear = await new WindowsCurrentUserDpapiProtector({ powershell: process.argv[3] }).unprotect(row.ciphertext);
  try {
    if (!Buffer.from(clear).subarray(0, 15).equals(Buffer.from('synthetic-test-'))) throw Error('SYNTHETIC_ONLY');
    console.log(JSON.stringify({ pid: process.pid, file_read: true, decrypt: true, sha256: createHash('sha256').update(clear).digest('hex') }));
  } finally { clear.fill(0); }
} finally { db.close(); }
const timer = setTimeout(() => process.exit(2), 15000);
process.stdin.once('data', () => { clearTimeout(timer); process.stdin.pause(); });
