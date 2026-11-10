import { createHmac, timingSafeEqual } from 'node:crypto';
import { canonical, invariant } from '../types.js';
import { LIMITS, validateEnvelope } from './contracts.js';
export function encodeFrame(envelope, secret) {
    validateEnvelope(envelope);
    invariant(secret.byteLength === 32, 'IPC_KEY');
    const body = canonical(envelope), mac = createHmac('sha256', secret).update(body).digest('hex');
    const bytes = Buffer.from(canonical({ envelope, mac }));
    invariant(bytes.length <= LIMITS.frame, 'IPC_FRAME_LIMIT');
    const prefix = Buffer.alloc(4);
    prefix.writeUInt32BE(bytes.length);
    return Buffer.concat([prefix, bytes]);
}
export function decodeFrame(bytes, secret) {
    invariant(bytes.byteLength > 0 && bytes.byteLength <= LIMITS.frame, 'IPC_FRAME_LIMIT');
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes), packet = JSON.parse(raw);
    invariant(packet && Object.keys(packet).sort().join(',') === 'envelope,mac' && canonical(packet) === raw, 'IPC_NONCANONICAL');
    invariant(typeof packet.mac === 'string' && /^[a-f0-9]{64}$/.test(packet.mac) && secret.byteLength === 32, 'IPC_MAC');
    const expected = createHmac('sha256', secret).update(canonical(packet.envelope)).digest();
    invariant(timingSafeEqual(expected, Buffer.from(packet.mac, 'hex')), 'IPC_MAC');
    validateEnvelope(packet.envelope);
    return packet.envelope;
}
/** One in-flight bounded frame. The socket owner must pause until consume/ACK finishes. */
export class FrameReader {
    #prefix = Buffer.alloc(4);
    #used = 0;
    #body = null;
    #offset = 0;
    #failed = false;
    push(chunk) {
        invariant(!this.#failed, 'IPC_READER_CLOSED');
        try {
            invariant(chunk.byteLength > 0 && chunk.byteLength <= LIMITS.frame + 4, 'IPC_FRAME_LIMIT');
            let i = 0;
            if (this.#used < 4) {
                const n = Math.min(4 - this.#used, chunk.byteLength);
                this.#prefix.set(chunk.subarray(0, n), this.#used);
                this.#used += n;
                i += n;
                if (this.#used === 4) {
                    const size = this.#prefix.readUInt32BE();
                    invariant(size > 0 && size <= LIMITS.frame, 'IPC_FRAME_LIMIT');
                    this.#body = Buffer.alloc(size);
                }
            }
            if (this.#body) {
                invariant(chunk.byteLength - i <= this.#body.length - this.#offset, 'IPC_PIPELINING_FORBIDDEN');
                this.#body.set(chunk.subarray(i), this.#offset);
                this.#offset += chunk.byteLength - i;
                if (this.#offset === this.#body.length) {
                    const out = this.#body;
                    this.#used = 0;
                    this.#body = null;
                    this.#offset = 0;
                    return out;
                }
            }
            return null;
        }
        catch (error) {
            this.#failed = true;
            throw error;
        }
    }
    close() { this.#failed = true; this.#body = null; }
}
