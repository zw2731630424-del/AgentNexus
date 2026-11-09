import { readFile } from 'node:fs/promises';
import { createPublicKey } from 'node:crypto';
import { canonical, invariant, sha256 } from '../types.js';
import { keys } from '../runtime/contracts.js';
import { authenticated, DeadlineGuard, validateGrant } from '../production/contracts.js';
import { relativeFile } from '../production/file-broker.js';
export function digestArguments(value) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && 'file' in value) {
        keys(value, ['file']);
        const a = value;
        keys(a.file, ['resource_id', 'path', 'expected_hash', 'max_bytes']);
        relativeFile(a.file.path);
        invariant(typeof a.file.resource_id === 'string' && a.file.resource_id.length <= 256 && /^[a-f0-9]{64}$/.test(a.file.expected_hash) && Number.isSafeInteger(a.file.max_bytes) && a.file.max_bytes > 0 && a.file.max_bytes <= 4096, 'M15_FILE_DIGEST_SCOPE');
        return a;
    }
    keys(value, ['data_base64']);
    const a = value;
    invariant(typeof a.data_base64 === 'string' && a.data_base64.length <= 10924, 'M15_DIGEST_LIMIT');
    const bytes = Buffer.from(a.data_base64, 'base64');
    invariant(bytes.length <= 8192 && bytes.toString('base64') === a.data_base64, 'M15_DIGEST_ENCODING');
    return a;
}
export function workerInput(argumentsValue, g, input, key) {
    const args = digestArguments(argumentsValue);
    if ('data_base64' in args) {
        invariant(input === null, 'M15_UNEXPECTED_BROKER_INPUT');
        return Buffer.from(args.data_base64, 'base64');
    }
    invariant(input !== null, 'M15_BROKER_INPUT_REQUIRED');
    keys(input, ['permit', 'data_base64']);
    const f = authenticated(input.permit, key);
    new DeadlineGuard().check(f.issued_at, f.expires_at);
    invariant(f.schema === 'agentnexus/file-permit/1' && f.action === 'READ' && f.operation_id === g.operation_id && f.runtime_id === g.runtime_id && f.worker_instance_id === g.worker_instance_id && f.host_boot_id === g.host_boot_id && f.project_id === g.logical.project_id && f.task_id === g.logical.task_id && f.resource_id === g.resource_id && f.resource_id === args.file.resource_id && f.profile_hash === g.profile_hash && f.path === args.file.path && f.expected_hash === args.file.expected_hash && f.content_hash === null && f.max_bytes === args.file.max_bytes && f.policy_epoch === g.policy_epoch && f.feature_epoch === g.feature_epoch, 'M15_FILE_BOOTSTRAP_BINDING');
    invariant(typeof input.data_base64 === 'string' && input.data_base64.length <= 5464, 'M15_FILE_BOOTSTRAP_LIMIT');
    const data = Buffer.from(input.data_base64, 'base64');
    invariant(data.length <= f.max_bytes && data.toString('base64') === input.data_base64 && sha256(data) === f.expected_hash, 'M15_FILE_BOOTSTRAP_CONTENT');
    return data;
}
export function executeFiniteWorker(packet, publicKey, pid) {
    invariant(packet !== null && typeof packet === 'object', 'M15_WORKER_SCHEMA');
    keys(packet, ['schema', 'permit', 'arguments', ...('input' in packet ? ['input'] : [])]);
    const p = packet;
    invariant(p.schema === 'agentnexus/worker-bootstrap/1', 'M15_WORKER_SCHEMA');
    const g = authenticated(p.permit, createPublicKey(publicKey));
    validateGrant(g);
    new DeadlineGuard().check(g.issued_at, g.expires_at);
    invariant(g.process.pid === pid && g.tool_id === 'nexus.digest' && g.tool_version === '1' && g.arguments_hash === sha256(canonical(p.arguments)), 'M15_WORKER_BINDING');
    const data = workerInput(p.arguments, g, p.input ?? null, createPublicKey(publicKey));
    return { sha256: sha256(data), bytes: data.length, operation_id: g.operation_id, worker_instance_id: g.worker_instance_id };
}
export async function workerMain() {
    const args = process.argv.slice(2);
    invariant(args.length === 4 && args[0] === '--host-key' && args[2] === '--key-sha256', 'M15_WORKER_ARGUMENTS');
    const keyBytes = await readFile(args[1]);
    invariant(sha256(keyBytes) === args[3], 'M15_WORKER_KEY_CHANGED');
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        invariant(size <= 16384, 'M15_WORKER_BOOTSTRAP_LIMIT');
        chunks.push(bytes);
    }
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)), packet = JSON.parse(raw);
    invariant(canonical(packet) === raw, 'M15_WORKER_NONCANONICAL');
    const result = executeFiniteWorker(packet, keyBytes.toString('utf8'), process.pid);
    await new Promise((resolve, reject) => process.stdout.write(canonical(result) + '\n', error => error ? reject(error) : resolve()));
}
// Importing argument/schema helpers never runs a task.
if (process.argv[1] && new URL(import.meta.url).pathname.toLowerCase().endsWith(process.argv[1].replaceAll('\\', '/').split('/').at(-1).toLowerCase())) {
    void workerMain().catch(() => { process.stderr.write('WORKER_BOOTSTRAP_REJECTED\n'); process.exitCode = 2; });
}
