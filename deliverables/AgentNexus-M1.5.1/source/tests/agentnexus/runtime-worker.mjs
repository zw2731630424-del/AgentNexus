// Fixed synthetic OS probe. Never loads project input or provider credentials.
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';
const [mode, argument] = process.argv.slice(2);
if (mode === 'pipe') {
  const socket = connect('\\\\.\\pipe\\' + argument);
  socket.once('connect', () => socket.write(JSON.stringify({ claimed_pid: 1, claimed_sid: 'S-1-5-18' }) + '\n'));
  socket.once('data', () => { socket.end(); });
  socket.once('error', error => { process.stderr.write(String(error.code) + '\n'); process.exitCode = 2; });
  const timer = setTimeout(() => socket.destroy(), 5000); timer.unref();
} else if (mode === 'orphan') {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'hold'], { windowsHide:true, shell:false, stdio:'ignore', env:{SystemRoot:process.env.SystemRoot ?? ''} });
  child.unref(); child.once('spawn', () => setTimeout(() => process.exit(0), 500));
} else if (mode === 'hold') setTimeout(() => {}, 8000);
else if (mode === 'normal') process.exitCode=0;
else process.exitCode=3;
