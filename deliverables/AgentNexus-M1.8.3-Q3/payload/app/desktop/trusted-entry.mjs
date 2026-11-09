import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, isAbsolute } from 'node:path';
import { entryIntent } from '../dist/src/agentnexus/desktop/trusted-entry.js';

export const FIXED_LAUNCHER = 'C:\\Program Files\\AgentNexus\\credential-launcher.exe';
export const FIXED_HELPER = 'C:\\Program Files\\AgentNexus\\trusted-credential-helper.exe';
export function launcherArguments(input) {
  const intent = entryIntent(input);
  return ['--action', intent.action, '--provider-id', intent.provider_id, '--operation-id', intent.operation_id,
    '--name', intent.name, '--model-ids', intent.model_ids.join(','), ...(intent.credential_id ? ['--credential-id', intent.credential_id] : [])];
}
export function helperExitResult(code, action) {
  if (code === 0) return { status: action === 'DELETE' ? 'REVOKED' : 'CREDENTIAL_SAVED', reason: 'HELPER_COMPLETED_REFRESH_REQUIRED' };
  if (code === 21) return { status: 'IPC_BLOCKED', reason: 'TRUSTED_ENTRY_BLOCKED' };
  return { status: 'INCONCLUSIVE', reason: 'HELPER_CANCELLED_OR_UNKNOWN' };
}
/** Normal-token launch only. The native binary alone validates deployment and requests runas. */
export function fixedTrustedEntryPort() {
  return Object.freeze({
    async readiness() {
      const blocked = reason => ({ status: 'BLOCKED', reason, same_sid_elevation_required: true, uac_verified: false });
      if (process.platform !== 'win32' || !existsSync(FIXED_LAUNCHER) || !existsSync(FIXED_HELPER)) return blocked('TRUSTED_ENTRY_UNAVAILABLE');
      return new Promise(resolve => {
        let settled = false, output = '', child, timer;
        const done = value => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } };
        try {
          child = spawn(FIXED_LAUNCHER, ['--readiness'], { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'], cwd: 'C:\\Program Files\\AgentNexus', env: { SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows' } });
          timer = setTimeout(() => { child.kill(); done(blocked('TRUSTED_ENTRY_PROBE_FAILED')); }, 10000);
          child.stdout.on('data', bytes => { output += bytes.toString('utf8'); if (output.length > 2048) { child.kill(); done(blocked('TRUSTED_ENTRY_PROBE_FAILED')); } });
          child.once('error', () => done(blocked('TRUSTED_ENTRY_PROBE_FAILED')));
          child.once('close', code => {
            try {
              const value = JSON.parse(output);
              const reasons = ['TRUSTED_ENTRY_READY', 'TRUSTED_ENTRY_REQUIRES_MEDIUM_TOKEN', 'SAME_SID_ELEVATION_UNAVAILABLE', 'TRUSTED_ENTRY_FIXED_PATH_REQUIRED', 'TRUSTED_ENTRY_LAUNCH_PLAN_BLOCKED', 'TRUSTED_ENTRY_SERVICE_UNAVAILABLE'];
              if (code !== 0 || Object.keys(value).sort().join(',') !== 'reason,same_sid_elevation_required,schema,status,uac_verified' || value.schema !== 'agentnexus.trusted-entry-readiness.v1' || !reasons.includes(value.reason) || !['READY', 'BLOCKED'].includes(value.status) || (value.status === 'READY') !== (value.reason === 'TRUSTED_ENTRY_READY') || value.same_sid_elevation_required !== true || value.uac_verified !== false) throw Error();
              done({ status: value.status, reason: value.reason, same_sid_elevation_required: true, uac_verified: false });
            } catch { done(blocked('TRUSTED_ENTRY_PROBE_FAILED')); }
          });
        } catch { done(blocked('TRUSTED_ENTRY_PROBE_FAILED')); }
      });
    },
    async open(input) {
      const args = launcherArguments(input);
      if (process.platform !== 'win32' || !existsSync(FIXED_LAUNCHER) || !existsSync(FIXED_HELPER)) return { status: 'IPC_BLOCKED', reason: 'TRUSTED_ENTRY_UNAVAILABLE' };
      return new Promise(resolve => {
        let settled = false;
        const done = value => { if (!settled) { settled = true; resolve(value); } };
        try {
          // No shell, input stream, payload result, inherited stdio or caller-selected executable.
          const child = spawn(FIXED_LAUNCHER, args, { shell: false, windowsHide: true, stdio: 'ignore', cwd: 'C:\\Program Files\\AgentNexus', env: { SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows' } });
          child.once('error', () => done({ status: 'IPC_BLOCKED', reason: 'TRUSTED_ENTRY_BLOCKED' }));
          child.once('exit', (code, signal) => done(helperExitResult(signal ? null : code, input.action)));
        } catch { done({ status: 'IPC_BLOCKED', reason: 'TRUSTED_ENTRY_BLOCKED' }); }
      });
    },
  });
}

export const SYNTHETIC_UI_CANARY = 'synthetic-test-q3-ui-boundary-canary-0192837465';
export const SYNTHETIC_UI_NAME = 'Q3 Synthetic UI Canary';
const syntheticMetadata = Object.freeze({ provider_id: 'deepseek', name: SYNTHETIC_UI_NAME, notes: '', max_concurrency: 1, requests_per_minute: 120, models: ['deepseek-flash'], model_wire_ids: { 'deepseek-flash': 'deepseek-flash' } });
const canonical = value => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
const digest = value => createHash('sha256').update(value).digest('hex');
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const testUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value) && value !== '00000000-0000-0000-0000-000000000000';

/** Test-only controller: a separate non-elevated WinForms worker, inherited stdio,
 * and a controller-owned private synthetic service channel. Never selected by
 * fixedTrustedEntryPort, and cannot launch a Program Files/UAC executable. */
export function syntheticTrustedEntryPort({ workerPath, invokeHelper, disconnectHelper, onStarted, onEvent } = {}) {
  if (process.platform !== 'win32' || typeof workerPath !== 'string' || !isAbsolute(workerPath) || !/[\\/]\.workflow-kit[\\/]runtime[\\/]AgentNexus-M1\.8\.3-Q3[\\/]native-helper-ui[\\/]synthetic-credential-ui\.exe$/i.test(workerPath) || typeof invokeHelper !== 'function' || typeof disconnectHelper !== 'function') throw Error('SYNTHETIC_UI_CONTROLLER_REQUIRED');
  let busy = false;
  return Object.freeze({
    async readiness() { return { status: existsSync(workerPath) ? 'READY' : 'BLOCKED', reason: existsSync(workerPath) ? 'SYNTHETIC_UI_ONLY' : 'SYNTHETIC_UI_UNAVAILABLE', same_sid_elevation_required: false, uac_verified: false }; },
    async open(input) {
      const intent = entryIntent(input);
      if (busy || intent.action !== 'ADD' || intent.provider_id !== 'deepseek' || intent.name !== SYNTHETIC_UI_NAME || intent.model_ids.join(',') !== 'deepseek-flash' || !existsSync(workerPath)) return { status: 'IPC_BLOCKED', reason: 'TRUSTED_ENTRY_BLOCKED' };
      busy = true;
      const helperChannel = randomUUID();
      return new Promise(resolve => {
        let child, timer, settled = false, failed = false, shown = false, acknowledged = false, serviceAcknowledged = false, mutationAttempted = false, closed = false, ticketId, operationId;
        let buffer = Buffer.alloc(0), queue = Promise.resolve();
        const emit = value => { try { onEvent?.(Object.freeze(value)); } catch { fail(); } };
        const done = async value => {
          if (settled) return; settled = true; clearTimeout(timer);
          try { await disconnectHelper(helperChannel); } catch { value = { status: 'INCONCLUSIVE', reason: 'HELPER_CANCELLED_OR_UNKNOWN' }; }
          busy = false; resolve(value);
        };
        const fail = () => { failed = true; child?.kill(); };
        const rpc = async request => {
          if (!exact(request, ['id', 'method', 'params']) || !testUuid(request.id)) throw Error('SYNTHETIC_UI_RPC_REJECTED');
          const p = request.params;
          if (request.method === 'snapshot') { if (!exact(p, [])) throw Error(); }
          else if (request.method === 'credential.prepare') {
            if (!shown || !exact(p, ['operation_id', 'metadata_hash', 'secret_sha256']) || operationId || !testUuid(p.operation_id) || p.metadata_hash !== digest(canonical(syntheticMetadata)) || p.secret_sha256 !== digest(SYNTHETIC_UI_CANARY)) throw Error('SYNTHETIC_UI_FIXED_PAYLOAD_REQUIRED');
            operationId = p.operation_id;
          } else if (request.method === 'credential.save') {
            const { secret_b64, import_ticket, import_operation_id, ...metadata } = p ?? {};
            if (!shown || mutationAttempted || !exact(p, [...Object.keys(syntheticMetadata), 'secret_b64', 'import_ticket', 'import_operation_id']) || !ticketId || import_ticket !== ticketId || import_operation_id !== operationId || secret_b64 !== Buffer.from(SYNTHETIC_UI_CANARY).toString('base64') || canonical(metadata) !== canonical(syntheticMetadata)) throw Error('SYNTHETIC_UI_FIXED_PAYLOAD_REQUIRED');
            mutationAttempted = true;
          } else if (request.method === 'credential.ticket.cancel') {
            if (!exact(p, ['ticket_id', 'operation_id']) || p.ticket_id !== ticketId || p.operation_id !== operationId) throw Error('SYNTHETIC_UI_TICKET_REJECTED');
          } else throw Error('SYNTHETIC_UI_METHOD_REJECTED');
          try {
            const response = await invokeHelper(helperChannel, request);
            if (response?.id !== request.id || typeof response.ok !== 'boolean') throw Error('SYNTHETIC_UI_RESPONSE_REJECTED');
            if (request.method === 'credential.prepare' && response.ok) {
              if (!testUuid(response.value?.ticket_id) || response.value.operation_id !== operationId) throw Error('SYNTHETIC_UI_TICKET_REJECTED');
              ticketId = response.value.ticket_id;
            }
            if (request.method === 'credential.save' && response.ok) {
              if (!exact(response.value, ['stored', 'key_id', 'classification']) || response.value.stored !== true || response.value.classification !== 'SYNTHETIC' || typeof response.value.key_id !== 'string' || !response.value.key_id.startsWith('key.') || !testUuid(response.value.key_id.slice(4))) throw Error('SYNTHETIC_UI_ACK_REJECTED');
              serviceAcknowledged = true;
            }
            const wire = JSON.stringify(response) + '\n';
            if (Buffer.byteLength(wire) > 16384 || settled || child.stdin.destroyed) throw Error('SYNTHETIC_UI_RESPONSE_REJECTED');
            await new Promise((yes, no) => child.stdin.write(wire, error => error ? no(error) : yes()));
          } finally { if (p && Object.hasOwn(p, 'secret_b64')) p.secret_b64 = undefined; }
        };
        const receive = value => {
          if (!value?.event) { queue = queue.then(() => rpc(value)); void queue.catch(fail); return; }
          if (value.assurance !== 'SIMULATED' || value.uac_verified !== 'NOT_RUN') throw Error();
          if (value.event === 'synthetic.ui.shown') {
            if (shown || value.pid !== child.pid || value.same_sid !== true || value.elevated !== false || !['LOW', 'MEDIUM'].includes(value.integrity)) throw Error();
            shown = true; emit({ event: value.event, pid: child.pid, helper_channel: helperChannel, same_sid: true, elevated: false, integrity: value.integrity, ui_launched: true, uac_verified: 'NOT_RUN' });
            void Promise.resolve(onStarted?.({ pid: child.pid, helper_channel: helperChannel })).catch(fail);
          } else if (value.event === 'synthetic.ui.save.ack') {
            if (!shown || acknowledged || !serviceAcknowledged || !ticketId || value.stored !== true) throw Error();
            acknowledged = true; emit({ event: value.event, stored: true, uac_verified: 'NOT_RUN' });
          } else if (value.event === 'synthetic.ui.closed') {
            if (!shown || closed || value.save_acknowledged !== acknowledged || ![0, 20, 21].includes(value.exit_code)) throw Error();
            closed = true; emit({ event: value.event, exit_code: value.exit_code, save_acknowledged: acknowledged, uac_verified: 'NOT_RUN' });
          } else if (value.event === 'synthetic.ui.blocked' && typeof value.reason === 'string' && /^[A-Z][A-Z0-9_]{0,95}$/.test(value.reason)) {
            emit({ event: value.event, reason: value.reason, uac_verified: 'NOT_RUN' }); failed = true;
          } else throw Error('SYNTHETIC_UI_EVENT_REJECTED');
        };
        try {
          child = spawn(workerPath, ['--synthetic-ui-worker'], { shell: false, windowsHide: false, stdio: ['pipe', 'pipe', 'pipe'], cwd: dirname(workerPath), env: { SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows' } });
          timer = setTimeout(fail, 190000);
          child.stdin.on('error', fail); child.stderr.on('data', bytes => { bytes.fill(0); fail(); });
          child.stdout.on('data', bytes => {
            try {
              buffer = Buffer.concat([buffer, bytes]);
              if (buffer.length > 32768) throw Error('SYNTHETIC_UI_FRAME_LIMIT');
              for (;;) { const end = buffer.indexOf(10); if (end < 0) break; if (end > 16384) throw Error(); const line = buffer.subarray(0, end).toString('utf8'); buffer = Buffer.from(buffer.subarray(end + 1)); receive(JSON.parse(line)); }
            } catch { fail(); }
          });
          child.once('error', () => { failed = true; void done({ status: 'IPC_BLOCKED', reason: 'TRUSTED_ENTRY_BLOCKED' }); });
          child.once('close', (code, signal) => { void done(!failed && !signal && shown && closed && (code !== 0 || acknowledged) ? helperExitResult(code, intent.action) : { status: 'INCONCLUSIVE', reason: 'HELPER_CANCELLED_OR_UNKNOWN' }); });
        } catch { void done({ status: 'IPC_BLOCKED', reason: 'TRUSTED_ENTRY_BLOCKED' }); }
      });
    },
  });
}
