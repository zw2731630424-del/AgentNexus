import { request as httpsRequest } from 'node:https';
import { canonical, invariant, NexusError } from '../types.js';
/** Local-mode adapter only. Existing UnifiedModelGateway still owns credentials, parsing and accounting. */
export class LocalDevelopmentHttpsTransport {
    assurance = 'REAL';
    #security;
    #endpoint;
    #priceConfigured;
    #pending = new Map();
    constructor(security, endpoint, priceConfigured) { this.#security = security; this.#endpoint = endpoint; this.#priceConfigured = priceConfigured; }
    async preflight(input) {
        invariant(this.#security.profile().mode === 'LOCAL_DEVELOPMENT_MODE' && this.#security.feature('credentials.osStorage'), 'SECURITY_LOCAL_NETWORK_BOUNDARY');
        invariant(input.model.price.assurance === 'REAL' && this.#priceConfigured(input.model.provider_id, input.model.model_id), 'SECURITY_LOCAL_PRICE_REQUIRED');
        const u = new URL(input.request.url);
        invariant(u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash && !u.port, 'SECURITY_LOCAL_HTTPS_REQUIRED');
        if (this.#security.feature('execution.networkRestriction'))
            invariant(input.request.url === this.#endpoint(input.model.provider_id), 'SECURITY_NETWORK_ENDPOINT_DENIED');
        const id = input.request.headers['x-agentnexus-request-id'];
        invariant(id && this.#pending.size < 16 && !this.#pending.has(id), 'SECURITY_LOCAL_NETWORK_REPLAY');
        this.#pending.set(id, { request: JSON.parse(canonical(input.request)), revision: this.#security.snapshot().revision });
    }
    abandon(id) { this.#pending.delete(id); }
    async send(request, authorization, signal) {
        const id = request.headers['x-agentnexus-request-id'], pending = this.#pending.get(id);
        this.#pending.delete(id);
        invariant(pending && canonical(pending.request) === canonical(request) && pending.revision === this.#security.snapshot().revision, 'SECURITY_LOCAL_NETWORK_ADMISSION_REQUIRED');
        invariant(!signal.aborted && this.#security.profile().mode === 'LOCAL_DEVELOPMENT_MODE' && /^Bearer [^\r\n]+$/.test(authorization), 'SECURITY_LOCAL_NETWORK_REVOKED');
        return new Promise((accept, reject) => {
            const req = httpsRequest(request.url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'text/event-stream', authorization, 'content-length': Buffer.byteLength(request.body) }, signal, agent: false, rejectUnauthorized: true }, response => {
                const headers = {};
                for (const [key, value] of Object.entries(response.headers))
                    if (['content-type', 'retry-after'].includes(key) && typeof value === 'string')
                        headers[key] = value;
                accept({ status: response.statusCode ?? 0, headers, body: response });
            });
            req.once('error', () => reject(new NexusError('SECURITY_LOCAL_NETWORK_FAILURE')));
            req.end(request.body);
        });
    }
}
