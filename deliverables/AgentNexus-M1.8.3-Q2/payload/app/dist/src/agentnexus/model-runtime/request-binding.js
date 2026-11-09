import { canonical, sha256 } from '../types.js';
export function egressSources(context) {
    return context.entries.map(entry => ({ section: entry.section, source: entry.source,
        range_sha256: entry.range_sha256, binding: entry.binding ?? null }));
}
export function egressBinding(input) {
    return { project_id: input.subject.project_id, provider_id: input.model.provider_id, model_id: input.model.model_id,
        endpoint: input.request.url, context_hash: input.context.sha256, body_hash: sha256(input.request.body),
        sources_hash: sha256(canonical(egressSources(input.context))) };
}
