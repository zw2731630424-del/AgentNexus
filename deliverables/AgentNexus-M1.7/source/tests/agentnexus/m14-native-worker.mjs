// Fixed synthetic fixture. No account/profile/ACL/system configuration changes.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
const mode = process.argv[2];
if (mode === 'normal') {
  process.stdout.write('native-fixture-stdout\n');
  process.stderr.write('native-fixture-stderr\n');
} else if (mode === 'marker') {
  writeFileSync(process.argv[3], 'executed-after-resume\n', {flag:'wx'});
  process.stdout.write('marker-created\n');
} else if (mode === 'hold') {
  process.stdout.write('holding\n');
  setInterval(() => {}, 1000);
} else if (mode === 'cpu') {
  let value = 1;
  for (;;) { value = Math.imul(value, 1664525) + 1013904223; if (value === 0) process.stderr.write(''); }
} else if (mode === 'flood') {
  const output = Buffer.alloc(4096, 0x78);
  async function flood() {
    for (let i = 0; i < 100000; i++) {
      if (!process.stdout.write(output)) await new Promise(resolve => process.stdout.once('drain', resolve));
    }
  }
  await flood();
} else if (mode === 'orphan') {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'hold'], { stdio: ['ignore', 'inherit', 'inherit'], shell: false, detached:true });
  child.unref();
  setTimeout(() => process.exit(0), 150);
} else {
  process.stderr.write('unknown fixed fixture mode\n');
  process.exitCode = 64;
}
