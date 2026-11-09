import { invariant, NexusError } from '../types.js';
export const STREAM_LIMITS = Object.freeze({ chunk_bytes: 65536, event_bytes: 65536, total_bytes: 1048576, events: 4096, output_bytes: 32768 });
/** Pull-based SSE parser. No background pump or unbounded queue; UTF-8 and event fragments remain bounded. */
export async function* sseEvents(source, signal) {
    const iterator = source[Symbol.asyncIterator](), decoder = new TextDecoder('utf-8', { fatal: true });
    let line = '', lineBytes = 0, data = [], eventBytes = 0, total = 0, count = 0, skipLF = false, ended = false;
    const read = () => new Promise((resolve, reject) => {
        const abort = () => { cleanup(); reject(new NexusError('MODEL18_STREAM_CANCELLED')); };
        const cleanup = () => signal.removeEventListener('abort', abort);
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) {
            abort();
            return;
        }
        Promise.resolve().then(() => iterator.next()).then(v => { cleanup(); resolve(v); }, () => { cleanup(); reject(new NexusError('MODEL18_STREAM_DISCONNECTED')); });
    });
    try {
        while (!ended) {
            const step = await read();
            ended = step.done === true;
            let text;
            try {
                if (ended)
                    text = decoder.decode();
                else {
                    invariant(step.value instanceof Uint8Array && step.value.length <= STREAM_LIMITS.chunk_bytes, 'MODEL18_STREAM_CHUNK_LIMIT');
                    total += step.value.length;
                    invariant(total <= STREAM_LIMITS.total_bytes, 'MODEL18_STREAM_TOTAL_LIMIT');
                    text = decoder.decode(step.value, { stream: true });
                }
            }
            catch (e) {
                if (e instanceof NexusError)
                    throw e;
                throw new NexusError('MODEL18_STREAM_UTF8');
            }
            for (const char of text) {
                if (skipLF) {
                    skipLF = false;
                    if (char === '\n')
                        continue;
                }
                if (char === '\n' || char === '\r') {
                    if (char === '\r')
                        skipLF = true;
                    if (line === '') {
                        if (data.length) {
                            invariant(++count <= STREAM_LIMITS.events, 'MODEL18_STREAM_EVENT_COUNT');
                            yield data.join('\n');
                            data = [];
                            eventBytes = 0;
                        }
                    }
                    else if (line.startsWith('data:')) {
                        const value = line.slice(5).replace(/^ /, '');
                        data.push(value);
                        eventBytes += Buffer.byteLength(value) + 1;
                        invariant(eventBytes <= STREAM_LIMITS.event_bytes, 'MODEL18_STREAM_EVENT_LIMIT');
                    }
                    else if (!line.startsWith(':'))
                        invariant(/^(event|id|retry):/.test(line), 'MODEL18_STREAM_FIELD');
                    line = '';
                    lineBytes = 0;
                }
                else {
                    line += char;
                    lineBytes += Buffer.byteLength(char);
                    invariant(lineBytes <= STREAM_LIMITS.event_bytes, 'MODEL18_STREAM_LINE_LIMIT');
                }
            }
        }
        invariant(line === '' && data.length === 0, 'MODEL18_STREAM_PARTIAL_EVENT');
    }
    finally {
        // Cancels upstream body readers. An uncooperative test iterator cannot hold shutdown indefinitely.
        if (iterator.return)
            void Promise.resolve(iterator.return()).catch(() => { });
    }
}
