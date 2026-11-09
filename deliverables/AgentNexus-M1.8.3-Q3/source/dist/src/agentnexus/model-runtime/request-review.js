import { canonical, invariant, sha256 } from '../types.js';
import { snapshot } from '../harness/contracts.js';
import { STRUCTURED_REPLY_INSTRUCTION } from './protocol.js';
import { egressBinding, egressSources } from './request-binding.js';
const allowed = (value) => value === 'PUBLIC' || value === 'SYNTHETIC';
function reference(value) {
    invariant(typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value), 'MODEL182_REVIEW_REFERENCE');
}
/** First-live review profile, deliberately limited to fixed protocol + synthetic
 * qualification data. It is a byte inspector, not a user-consent authority.
 * Only Host admin code can turn its result into a durable reviewed egress grant.
 */
export function inspectFinalRequest(input, decisions, guard) {
    const view = snapshot(input.context, 4 * 1024 * 1024), request = snapshot(input.request, 2 * 1024 * 1024);
    invariant(input.model.provider_id === 'deepseek' && request.url === 'https://api.deepseek.com/chat/completions' && request.method === 'POST', 'MODEL182_REVIEW_PROVIDER');
    invariant(view.project_id === input.subject.project_id && view.task_id === input.subject.task_id && view.agent_id === input.subject.agent_id &&
        Buffer.byteLength(view.text) === view.bytes && sha256(view.text) === view.sha256 && view.entries.length > 0 &&
        view.entries.map(entry => entry.text).join('\n\n') === view.text, 'MODEL182_REVIEW_CONTEXT');
    invariant(Object.keys(request.headers).sort().join(',') === 'accept,content-type,x-agentnexus-request-id' &&
        request.headers.accept === 'text/event-stream' && request.headers['content-type'] === 'application/json' &&
        /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(request.headers['x-agentnexus-request-id']), 'MODEL182_REVIEW_HEADERS');
    guard.assertSafe(view.text, 'FINAL_REVIEW_CONTEXT');
    guard.assertSafe(canonical(request), 'FINAL_REVIEW_REQUEST');
    guard.assertSafe(canonical(decisions), 'FINAL_REVIEW_PROVENANCE');
    // Reject common sensitive patterns even when a caller labels them PUBLIC.
    // This heuristic supplements trusted source review; it is not general DLP.
    invariant(!/(?:\b[A-Za-z]:[\\/]|\\\\[A-Za-z0-9_.-]+\\|\/(?:home|Users|etc|mnt)\/|\b(?:\d{1,3}\.){3}\d{1,3}\b|\bBearer\s+|\bsk-[A-Za-z0-9_-]{8,}|AI_(?:Consciousness|NeuroWeave|Highlycomplex))/i.test(view.text + '\n' + request.body), 'MODEL182_REVIEW_SENSITIVE_CONTENT');
    const review = snapshot(decisions, 262144);
    invariant(Object.keys(review).every(key => key === 'sources' || key === 'tools') && Array.isArray(review.sources) && review.sources.length === view.entries.length, 'MODEL182_REVIEW_SOURCE_COVERAGE');
    const sources = view.entries.map((entry, index) => {
        const decision = review.sources[index];
        invariant(Object.keys(decision).sort().join(',') === 'classification,origin,range_sha256,review_ref,source' &&
            canonical(decision.source) === canonical(entry.source) && decision.range_sha256 === entry.range_sha256 && sha256(entry.text) === entry.range_sha256, 'MODEL182_REVIEW_SOURCE_BINDING');
        invariant(allowed(decision.classification) && ['PUBLIC_FIXED_PROTOCOL', 'SYNTHETIC_QUALIFICATION'].includes(decision.origin), 'MODEL182_REVIEW_CLASSIFICATION');
        invariant((decision.origin === 'PUBLIC_FIXED_PROTOCOL') === (decision.classification === 'PUBLIC'), 'MODEL182_REVIEW_CLASSIFICATION');
        reference(decision.review_ref);
        return { ...egressSources(view)[index], classification: decision.classification, origin: decision.origin, review_ref: decision.review_ref };
    });
    let body;
    try {
        body = JSON.parse(request.body);
    }
    catch {
        throw Error('MODEL182_REVIEW_JSON');
    }
    // The adapter emits JSON.stringify bytes. Reject any lossy parse, including
    // duplicate/escaped duplicate keys, rather than reviewing only their last value.
    invariant(request.body === JSON.stringify(body), 'MODEL182_REVIEW_WIRE_SERIALIZATION');
    guard.assertSafe(canonical(body), 'FINAL_REVIEW_DECODED_BODY');
    invariant(!/(?:\b[A-Za-z]:[\\/]|\\\\[A-Za-z0-9_.-]+\\|\/(?:home|Users|etc|mnt)\/|\b(?:\d{1,3}\.){3}\d{1,3}\b|\bBearer\s+|\bsk-[A-Za-z0-9_-]{8,}|AI_(?:Consciousness|NeuroWeave|Highlycomplex))/i.test(canonical(body)), 'MODEL182_REVIEW_SENSITIVE_CONTENT');
    const bodyKeys = ['model', 'messages', 'stream', 'stream_options', 'max_tokens', 'thinking', 'response_format', 'tools'];
    invariant(body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).every(key => bodyKeys.includes(key)) &&
        body.model === input.model.model_id && body.stream === true && Number.isSafeInteger(body.max_tokens) && body.max_tokens > 0 &&
        body.max_tokens <= 4096 && canonical(body.stream_options) === canonical({ include_usage: true }) &&
        canonical(body.thinking) === canonical({ type: 'disabled' }) && canonical(body.response_format) === canonical({ type: 'json_object' }), 'MODEL182_REVIEW_WIRE_SCHEMA');
    invariant(Array.isArray(body.messages) && body.messages.length === 2 && body.messages.every((message) => message && Object.keys(message).sort().join(',') === 'content,role' && typeof message.content === 'string') &&
        body.messages[0].role === 'system' && body.messages[0].content === STRUCTURED_REPLY_INSTRUCTION &&
        body.messages[1].role === 'user' && body.messages[1].content === view.text, 'MODEL182_REVIEW_MESSAGE_COVERAGE');
    const components = body.messages.map((message, index) => ({
        location: 'messages[' + index + ']', role: message.role, sha256: sha256(canonical(message)),
        bytes: Buffer.byteLength(canonical(message)), origin: index === 0 ? 'FIXED_PROTOCOL' : 'REVIEWED_CONTEXT_SOURCES',
    }));
    if (body.tools !== undefined) {
        invariant(Array.isArray(body.tools) && body.tools.length > 0 && body.tools.length <= 16 && review.tools &&
            Object.keys(review.tools).sort().join(',') === 'classification,review_ref,sha256' && review.tools.classification === 'SYNTHETIC' &&
            review.tools.sha256 === sha256(canonical(body.tools)), 'MODEL182_REVIEW_TOOL_COVERAGE');
        reference(review.tools.review_ref);
        components.push({ location: 'tools', role: 'tool_schema', sha256: sha256(canonical(body.tools)), bytes: Buffer.byteLength(canonical(body.tools)), origin: 'REVIEWED_SYNTHETIC_TOOL_SCHEMA' });
    }
    else
        invariant(review.tools === undefined, 'MODEL182_REVIEW_TOOL_COVERAGE');
    const classification = sources.every(source => source.classification === 'PUBLIC') && !body.tools ? 'PUBLIC' : 'SYNTHETIC';
    return snapshot({ schema: 'agentnexus/m1.8.2/final-request-review/1', profile: 'FIRST_DEEPSEEK_PUBLIC_SYNTHETIC',
        status: 'DRAFT_REQUIRES_EXTERNAL_CONSENT', ...egressBinding(input), classification,
        request_hash: sha256(canonical(request)), request, context_text: view.text, source_manifest: sources, components,
        forbidden_material_detected: false, credential_header_present: false, active_authorization: false });
}
