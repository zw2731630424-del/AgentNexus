// Fixed-purpose synthetic Runtime and pipe client. Production uses the native
// service-created relay; this file never creates a service or grants OS trust.
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { invariant } from '../types.ts';

const mode = process.argv[2], pipe = process.argv[3];
invariant(process.argv.length === 4 && /^\\\\\.\\pipe\\AgentNexus-Q3-Synthetic-[a-f0-9-]{36}$/.test(pipe ?? '') &&
  ['--synthetic-runtime', '--synthetic-client'].includes(mode), 'SYNTHETIC_RUNTIME_ARGUMENTS');
const methods = new Set(['snapshot', 'daily.prepare', 'daily.execute', 'request.cancel', 'stream.ack']);
const maximum = 1024 * 1024;
function frames(stream: NodeJS.ReadableStream, receive: (value: any) => void, fail: () => void) {
  let buffer = Buffer.alloc(0);
  stream.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length > maximum) { fail(); return; }
    for (;;) {
      const end = buffer.indexOf(10); if (end < 0) break;
      const line = buffer.subarray(0, end); buffer = Buffer.from(buffer.subarray(end + 1));
      try { receive(JSON.parse(line.toString('utf8'))); } catch { fail(); return; }
    }
  });
}
if (mode === '--synthetic-client') {
  invariant(!process.send, 'SYNTHETIC_CLIENT_CHANNEL');
  const socket = net.createConnection(pipe); socket.on('error', () => process.exit(78));
  socket.on('data', b => { if (!process.stdout.write(b)) socket.pause(); });
  process.stdout.on('drain', () => socket.resume());
  process.stdin.pipe(socket); socket.on('close', () => process.exit(0));
  process.stdin.on('error', () => socket.destroy()); process.stdout.on('error', () => socket.destroy());
} else {
  invariant(!!process.send, 'SYNTHETIC_INHERITED_AUTHORITY_REQUIRED');
  const channels = new Map<string, net.Socket>();
  const send = (value: any) => { process.send!(value, undefined, undefined, (error: Error | null) => { if (error) process.exit(78); }); };
  const server = net.createServer(socket => {
    if (channels.size >= 16) { socket.destroy(); return; }
    const channel = randomUUID().replaceAll('-', ''); channels.set(channel, socket);
    let queued = 0;
    frames(socket, request => {
      invariant(request && Object.keys(request).sort().join(',') === 'id,method,params' && typeof request.id === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(request.id), 'DAILY_SCHEMA');
      if (!methods.has(request.method)) { socket.write(JSON.stringify({ id: request.id, ok: false, error: 'DAILY_METHOD_DENIED', sent: false }) + '\n'); return; }
      invariant(++queued <= 64, 'DAILY_BACKPRESSURE');
      send({ event: 'request', channel, request });
      // Bounded outstanding RPCs; stream acknowledgements have no reply.
      if (request.method === 'stream.ack') queued--;
    }, () => socket.destroy());
    socket.on('error', () => socket.destroy());
    socket.on('close', () => { channels.delete(channel); send({ event: 'disconnect', channel }); });
    (socket as any).releaseRpc = () => { queued = Math.max(0, queued - 1); };
  });
  process.on('message', (value: any) => {
    const socket = channels.get(value?.channel); if (!socket) return;
    if (!value.response?.event) (socket as any).releaseRpc();
    const line = JSON.stringify(value.response) + '\n';
    if (Buffer.byteLength(line) > maximum || socket.writableLength > 2 * maximum) { socket.destroy(); return; }
    socket.write(line);
  });
  process.on('disconnect', () => { for (const socket of channels.values()) socket.destroy(); server.close(); process.exit(0); });
  server.on('error', () => process.exit(78)); server.listen(pipe); await once(server, 'listening');
  send({ event: 'ready', pid: process.pid });
}
