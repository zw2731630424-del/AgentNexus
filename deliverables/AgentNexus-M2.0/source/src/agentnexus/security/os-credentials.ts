import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { invariant, sha256 } from '../types.ts';
import type { CredentialProviderInterface } from '../model-runtime/vault.ts';

/** Current-user CredMan adapter. No elevation, service, TPM, certificate or environment secrets. */
export class WindowsCredentialManagerStorage implements CredentialProviderInterface {
  readonly id = 'windows-credential-manager-v1';
  readonly protection = 'WINDOWS_CREDENTIAL_MANAGER_CURRENT_USER';
  readonly assurance = 'REAL';
  #prefix: string; #busy = 0; #waiters: (()=>void)[] = []; #poisoned = false;
  constructor(namespace: string) { this.#prefix = 'AgentNexus:M2:' + sha256(namespace).slice(0, 32) + ':'; }
  async protect(bytes: Uint8Array): Promise<Uint8Array> {
    invariant(bytes.length > 0 && bytes.length <= 2560, 'SECURITY_OS_CREDENTIAL_SIZE');
    const target = this.#prefix + randomUUID();
    await this.#run('WRITE', target, bytes); return Buffer.from(target);
  }
  unprotect(reference: Uint8Array): Promise<Uint8Array> { return this.#run('READ', this.#target(reference)); }
  async forget(reference: Uint8Array) { await this.#run('DELETE', this.#target(reference)); }
  #target(reference: Uint8Array) { const value = Buffer.from(reference).toString('utf8'); invariant(value.startsWith(this.#prefix) && /^[a-f0-9-]{36}$/.test(value.slice(this.#prefix.length)), 'SECURITY_OS_CREDENTIAL_REFERENCE'); return value; }
  async #run(operation: string, target: string, bytes?: Uint8Array): Promise<Uint8Array> {
    invariant(process.platform === 'win32', 'SECURITY_OS_STORAGE_NOT_AVAILABLE');
    invariant(!this.#poisoned, 'SECURITY_OS_STORAGE_RESTART_REQUIRED');
    if (this.#busy >= 2) { invariant(this.#waiters.length < 16, 'SECURITY_OS_STORAGE_BUSY'); await new Promise<void>(r => this.#waiters.push(r)); }
    else this.#busy++;
    const executable = existsSync('C:/Program Files/PowerShell/7/pwsh.exe') ? 'C:/Program Files/PowerShell/7/pwsh.exe' : 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
    const input = Buffer.from(JSON.stringify({ operation, target, blob: bytes ? Buffer.from(bytes).toString('base64') : '' }));
    try {
      invariant(!this.#poisoned, 'SECURITY_OS_STORAGE_RESTART_REQUIRED');
      return await new Promise<Uint8Array>((accept, reject) => {
        const child = spawn(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', fileURLToPath(new URL('./wincred.ps1', import.meta.url))], { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows', POWERSHELL_TELEMETRY_OPTOUT: '1' } });
        const chunks: Buffer[] = []; let length = 0, failed = false, finished = false;
        let termination: NodeJS.Timeout | undefined;
        const finish = (code:number|null, unconfirmed=false) => { if(finished)return;finished=true;clearTimeout(timer);clearTimeout(termination);input.fill(0);const output=Buffer.concat(chunks);for(const b of chunks)b.fill(0);if(failed||code!==0||unconfirmed){output.fill(0);if(unconfirmed)this.#poisoned=true;reject(Object.assign(new Error(unconfirmed?'SECURITY_OS_STORAGE_TERMINATION_UNCONFIRMED':'SECURITY_OS_STORAGE_FAILED'),{code:unconfirmed?'SECURITY_OS_STORAGE_TERMINATION_UNCONFIRMED':'SECURITY_OS_STORAGE_FAILED'}));}else accept(output); };
        const terminate = () => { failed=true;if(finished||termination)return;termination=setTimeout(()=>{child.stdin.destroy();child.stdout.destroy();child.stderr.destroy();child.unref();finish(null,true);},2000);try{child.kill();}catch{} };
        const timer = setTimeout(terminate, 15000);
        child.on('error', () => { failed = true; });
        child.stdin.on('error', () => { failed = true; }); child.stdout.on('error', () => { failed = true; }); child.stderr.on('error', () => { failed = true; });
        child.stdout.on('data', (b: Buffer) => { if(finished){b.fill(0);return;} length += b.length; if (length > 4096) { b.fill(0); terminate(); } else chunks.push(b); });
        child.stderr.on('data', (b: Buffer) => { failed = true; b.fill(0); });
        child.on('close', code => finish(code));
        child.stdin.end(input);
      });
    } finally { input.fill(0); const next=this.#waiters.shift();if(next)next();else this.#busy--; }
  }
}
