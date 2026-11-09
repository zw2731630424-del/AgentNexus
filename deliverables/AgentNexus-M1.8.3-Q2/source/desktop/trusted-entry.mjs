import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
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
