import { createHash } from 'node:crypto';
import { invariant } from '../types.js';
import { STREAM_LIMITS } from './streaming.js';
/** Streaming hashes are safe for incomplete/secret-bearing responses. Raw partial
 * bytes are never published to ordinary Archive or logs before the secret guard.
 * Pull-based iteration preserves downstream backpressure and bounded memory.
 */
export function responseEvidence(source) {
    const hash = createHash('sha256');
    let bytes = 0, chunks = 0, eof = false, closed = false, digest = null;
    const body = (async function* () {
        try {
            for await (const raw of source) {
                invariant(raw instanceof Uint8Array && raw.length <= STREAM_LIMITS.chunk_bytes, 'MODEL18_STREAM_CHUNK_LIMIT');
                invariant(bytes + raw.length <= STREAM_LIMITS.total_bytes, 'MODEL18_STREAM_TOTAL_LIMIT');
                const chunk = Buffer.from(raw);
                bytes += chunk.length;
                chunks++;
                hash.update(chunk);
                yield chunk;
            }
            eof = true;
        }
        finally {
            closed = true;
            digest = hash.digest('hex');
        }
    })();
    return { body, inspect: () => ({ sha256: digest ?? hash.copy().digest('hex'), bytes, chunks, eof, closed, raw_partial_published: false }) };
}
