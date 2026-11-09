import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const executable = join(root, 'node_modules/electron/dist/electron.exe');
if (!existsSync(executable)) throw new Error('DESKTOP_RUNTIME_MISSING: Restore the pinned dependencies first.');
if (!existsSync(join(root, 'dist/src/agentnexus/desktop/service.js'))) {
  const built = spawnSync(process.execPath, [join(root, 'tools/agentnexus/build-desktop.mjs')], { cwd: root, stdio: 'inherit', windowsHide: true });
  if (built.status !== 0) throw new Error('DESKTOP_BUILD_FAILED');
}
const env = { ...process.env };
for (const key of ['ELECTRON_RUN_AS_NODE', 'AGENTNEXUS_DESKTOP_E2E', 'AGENTNEXUS_DESKTOP_TEST_ROOT']) delete env[key];
const child = spawn(executable, [root], { cwd: root, env, detached: true, stdio: 'ignore', windowsHide: true });
child.once('error', () => { process.stderr.write('DESKTOP_LAUNCH_FAILED\n'); process.exitCode = 1; });
child.once('spawn', () => { process.stdout.write('AgentNexus Desktop started.\n'); child.unref(); });
