import { invariant, NexusError } from '../types.js';
import { snapshot } from '../harness/contracts.js';
import { natural, STRUCTURED_REPLY_INSTRUCTION, validateReply } from './protocol.js';
import { sseEvents, STREAM_LIMITS } from './streaming.js';
export const PROVIDER_ENDPOINTS = Object.freeze({ openai: 'https://api.openai.com/v1/chat/completions', deepseek: 'https://api.deepseek.com/chat/completions', glm: 'https://open.bigmodel.cn/api/paas/v4/chat/completions' });
export const PROVIDER_SOURCES = Object.freeze({
    openai: 'https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create',
    deepseek: 'https://api-docs.deepseek.com/api/create-chat-completion/',
    glm: 'https://docs.bigmodel.cn/api-reference/模型-api/对话补全', checked_at: '2026-11-08'
});
// Official request IDs checked on 2026-11-08. A served snapshot label is not a request ID.
export const DEEPSEEK_MODEL_IDS = Object.freeze(['deepseek-flash', 'deepseek-v4-pro']);
export class ProviderFault extends NexusError {
    category;
    constructor(category) { super('MODEL18_' + category); this.category = category; }
}
/** Only validated token counts survive a failed parse; provider text and error messages never do. */
export class ProviderParseFault extends NexusError {
    observed_usage;
    constructor(code, observed) {
        super(/^[A-Z][A-Z0-9_]{0,95}$/.test(code) ? code : 'MODEL18_PARSE_FAILURE');
        this.name = 'ProviderParseFault';
        if (observed === null) {
            this.observed_usage = null;
            return;
        }
        natural(observed.input_tokens);
        natural(observed.output_tokens);
        if (observed.reasoning_tokens !== null) {
            natural(observed.reasoning_tokens);
            invariant(observed.reasoning_tokens <= observed.output_tokens, 'MODEL18_USAGE_REASONING');
        }
        const copy = { input_tokens: observed.input_tokens, output_tokens: observed.output_tokens, reasoning_tokens: observed.reasoning_tokens };
        for (const field of ['cache_hit_tokens', 'cache_miss_tokens'])
            if (observed[field] !== undefined) {
                const value = observed[field];
                if (value !== null) {
                    natural(value);
                    invariant(value <= observed.input_tokens, 'MODEL18_USAGE_CACHE');
                }
                copy[field] = value;
            }
        if (copy.cache_hit_tokens !== undefined && copy.cache_hit_tokens !== null && copy.cache_miss_tokens !== undefined && copy.cache_miss_tokens !== null)
            invariant(copy.cache_hit_tokens + copy.cache_miss_tokens === copy.input_tokens, 'MODEL18_USAGE_CACHE');
        this.observed_usage = snapshot(copy);
    }
}
function usage(input) {
    if (input === undefined || input === null)
        return null;
    invariant(typeof input === 'object' && !Array.isArray(input), 'MODEL18_USAGE_SCHEMA');
    const u = input;
    natural(u.prompt_tokens);
    natural(u.completion_tokens);
    if (u.total_tokens !== undefined) {
        natural(u.total_tokens);
        invariant(u.total_tokens === u.prompt_tokens + u.completion_tokens, 'MODEL18_USAGE_TOTAL');
    }
    const reasoning = u.completion_tokens_details?.reasoning_tokens ?? null;
    if (reasoning !== null) {
        natural(reasoning);
        invariant(reasoning <= u.completion_tokens, 'MODEL18_USAGE_REASONING');
    }
    const meter = { input_tokens: u.prompt_tokens, output_tokens: u.completion_tokens, reasoning_tokens: reasoning };
    let hit = u.prompt_cache_hit_tokens, miss = u.prompt_cache_miss_tokens;
    const alias = u.prompt_tokens_details?.cached_tokens;
    for (const value of [hit, miss, alias])
        if (value !== undefined) {
            natural(value);
            invariant(value <= u.prompt_tokens, 'MODEL18_USAGE_CACHE');
        }
    if (alias !== undefined) {
        invariant(hit === undefined || hit === alias, 'MODEL18_USAGE_CACHE_ALIAS');
        hit = alias;
    }
    // Total prompt usage and either cache count determine the other without inventing metering.
    if (hit !== undefined || miss !== undefined) {
        hit ??= u.prompt_tokens - miss;
        miss ??= u.prompt_tokens - hit;
        invariant(hit + miss === u.prompt_tokens, 'MODEL18_USAGE_CACHE');
        meter.cache_hit_tokens = hit;
        meter.cache_miss_tokens = miss;
    }
    return meter;
}
/** Shared chat wire framing with explicit per-provider field policy; no SDK in Agent Runtime. */
export class ChatProviderAdapter {
    provider_id;
    endpoint;
    timeout_ms;
    retry_policy = 'PROVEN_NOT_SENT_ONLY';
    #nativeTools = new Map();
    constructor(provider, options = {}) {
        this.provider_id = provider;
        invariant(provider === 'compatible' || Object.hasOwn(PROVIDER_ENDPOINTS, provider), 'MODEL18_PROVIDER');
        this.endpoint = options.endpoint ?? (provider === 'compatible' ? '' : PROVIDER_ENDPOINTS[provider]);
        const url = new URL(this.endpoint);
        invariant(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.port === '', 'MODEL18_ENDPOINT');
        invariant(provider === 'compatible' || this.endpoint === PROVIDER_ENDPOINTS[provider], 'MODEL18_ENDPOINT');
        this.timeout_ms = options.timeout_ms ?? 30000;
        natural(this.timeout_ms, 120000);
        invariant(this.timeout_ms >= 10, 'MODEL18_TIMEOUT');
    }
    build(input) {
        invariant(input.model.provider_id === this.provider_id && input.stream === true && input.model.capabilities.streaming, 'MODEL18_CAPABILITY');
        if (this.provider_id === 'deepseek' && input.model.price.assurance === 'REAL')
            invariant(DEEPSEEK_MODEL_IDS.includes(input.model.model_id), 'MODEL18_DEEPSEEK_MODEL_ID');
        natural(input.max_output_tokens, input.model.output_tokens);
        invariant(input.max_output_tokens > 0, 'MODEL18_OUTPUT_LIMIT');
        invariant(!input.json || input.model.capabilities.json, 'MODEL18_CAPABILITY');
        invariant(input.reasoning === 'disabled' || input.model.capabilities.reasoning, 'MODEL18_CAPABILITY');
        invariant(input.tools.length <= 16 && (!input.tools.length || input.model.capabilities.tools), 'MODEL18_CAPABILITY');
        const body = { model: input.model.model_id, messages: [{ role: 'system', content: STRUCTURED_REPLY_INSTRUCTION }, { role: 'user', content: input.prompt }], stream: true };
        // OpenAI includes hidden reasoning in max_completion_tokens; DeepSeek/GLM use max_tokens.
        if (this.provider_id === 'openai') {
            body.max_completion_tokens = input.max_output_tokens;
            body.stream_options = { include_usage: true };
            body.store = false;
            if (input.reasoning === 'enabled')
                body.reasoning_effort = 'medium';
        }
        else {
            body.max_tokens = input.max_output_tokens;
            if (this.provider_id === 'deepseek')
                body.stream_options = { include_usage: true };
            if (this.provider_id === 'deepseek' || this.provider_id === 'glm')
                body.thinking = { type: input.reasoning === 'enabled' ? 'enabled' : 'disabled' };
        }
        if (input.json)
            body.response_format = { type: 'json_object' };
        if (input.tools.length) {
            body.tools = input.tools.map(tool => { invariant(/^[A-Za-z0-9_.:-]{1,64}$/.test(tool.name), 'MODEL18_TOOL_NAME'); return { type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.parameters } }; });
        }
        // The response parser allows only the names supplied for this request. Registry is bounded by in-flight gateway limit.
        invariant(this.#nativeTools.size < 32 && !this.#nativeTools.has(input.request_id), 'MODEL18_ADAPTER_BACKPRESSURE');
        this.#nativeTools.set(input.request_id, { tools: new Set(input.tools.map(tool => tool.name)), model: input.model.model_id, real: input.model.price.assurance === 'REAL' });
        return snapshot({ method: 'POST', url: this.endpoint, body: JSON.stringify(body), headers: { 'content-type': 'application/json', accept: 'text/event-stream', 'x-agentnexus-request-id': input.request_id } }, 1024 * 1024);
    }
    error(status) { return status === 401 || status === 403 ? 'AUTH' : status === 429 ? 'RATE_LIMIT' : status === 400 || status === 404 || status === 422 ? 'CAPABILITY' : status >= 500 ? 'PROVIDER' : 'REQUEST'; }
    abandon(requestId) { this.#nativeTools.delete(requestId); }
    async parse(response, signal, guard) {
        // Transport echoes this trusted local correlation header; remote responses cannot choose another request's tools.
        const local = response.headers['x-agentnexus-local-request-id'];
        const binding = local ? this.#nativeTools.get(local) : undefined;
        let meter = null;
        try {
            invariant(binding, 'MODEL18_RESPONSE_BINDING');
            const allowed = binding.tools;
            if (response.status !== 200)
                throw new ProviderFault(this.error(response.status));
            invariant(/^text\/event-stream(?:;|$)/i.test(response.headers['content-type'] ?? ''), 'MODEL18_CONTENT_TYPE');
            const strictDeepSeek = this.provider_id === 'deepseek' && binding.real;
            let content = '', reasoningTail = '', providerId = '', model = '', finish = null, done = false, fingerprint = null, fingerprintSeen = false;
            let tool = null;
            for await (const data of sseEvents(response.body, signal)) {
                guard.assertSafe(data, 'STREAM_EVENT');
                if (data === '[DONE]') {
                    done = true;
                    break;
                }
                let event;
                try {
                    event = JSON.parse(data);
                }
                catch {
                    throw new NexusError('MODEL18_STREAM_JSON');
                }
                invariant(event && typeof event === 'object' && !Array.isArray(event) && !event.error && Array.isArray(event.choices), 'MODEL18_STREAM_SCHEMA');
                invariant(typeof event.id === 'string' && event.id.length > 0 && event.id.length <= 256, 'MODEL18_RESPONSE_ID');
                if (providerId)
                    invariant(providerId === event.id, 'MODEL18_STREAM_ID_CHANGED');
                else
                    providerId = event.id;
                if (event.model !== undefined) {
                    invariant(typeof event.model === 'string' && event.model === binding.model, 'MODEL18_RESPONSE_MODEL');
                    if (model)
                        invariant(model === event.model, 'MODEL18_STREAM_MODEL_CHANGED');
                    else
                        model = event.model;
                }
                else
                    invariant(!binding.real, 'MODEL18_RESPONSE_MODEL');
                if (Object.hasOwn(event, 'system_fingerprint')) {
                    invariant(event.system_fingerprint === null || (typeof event.system_fingerprint === 'string' && event.system_fingerprint.length <= 256), 'MODEL18_RESPONSE_FINGERPRINT');
                    if (fingerprintSeen)
                        invariant(fingerprint === event.system_fingerprint, 'MODEL18_STREAM_FINGERPRINT_CHANGED');
                    else {
                        fingerprint = event.system_fingerprint;
                        fingerprintSeen = true;
                    }
                }
                const next = usage(event.usage);
                if (next) {
                    invariant(meter === null, 'MODEL18_USAGE_DUPLICATE');
                    meter = next;
                }
                invariant(event.choices.length <= 1, 'MODEL18_MULTIPLE_CHOICES');
                if (strictDeepSeek) {
                    invariant(event.choices.length === 1, 'MODEL18_STREAM_SCHEMA');
                    if (next)
                        invariant(event.choices[0]?.finish_reason !== null && event.choices[0]?.finish_reason !== undefined, 'MODEL18_USAGE_POSITION');
                }
                for (const choice of event.choices) {
                    invariant(choice.index === 0 && choice.delta && typeof choice.delta === 'object', 'MODEL18_STREAM_SCHEMA');
                    const delta = choice.delta;
                    if (finish !== null)
                        invariant(!strictDeepSeek && Object.keys(delta).length === 0 && choice.finish_reason === null, 'MODEL18_STREAM_AFTER_FINISH');
                    if (delta.content !== undefined && delta.content !== null) {
                        invariant(typeof delta.content === 'string', 'MODEL18_STREAM_SCHEMA');
                        content += delta.content;
                        invariant(Buffer.byteLength(content) <= STREAM_LIMITS.output_bytes, 'MODEL18_OUTPUT_LIMIT');
                    }
                    // Reasoning deltas are never archived or exposed as final output; usage totals include their metering.
                    if (delta.reasoning_content !== undefined && delta.reasoning_content !== null) {
                        invariant(typeof delta.reasoning_content === 'string', 'MODEL18_STREAM_SCHEMA');
                        const joined = reasoningTail + delta.reasoning_content;
                        guard.assertSafe(joined, 'REASONING_LEAK_GUARD');
                        reasoningTail = joined.slice(-32768);
                    }
                    if (delta.tool_calls !== undefined) {
                        invariant(Array.isArray(delta.tool_calls) && delta.tool_calls.length <= 1, 'MODEL18_TOOL_CALL_LIMIT');
                        for (const call of delta.tool_calls) {
                            invariant(call.index === 0 && (!call.type || call.type === 'function'), 'MODEL18_TOOL_CALL_SCHEMA');
                            if (!tool) {
                                invariant(typeof call.id === 'string' && call.id.length > 0 && call.id.length <= 128, 'MODEL18_TOOL_CALL_ID');
                                tool = { id: call.id, name: '', arguments: '' };
                            }
                            else if (call.id !== undefined)
                                invariant(call.id === tool.id, 'MODEL18_TOOL_CALL_ID');
                            if (call.function?.name !== undefined) {
                                invariant(typeof call.function.name === 'string', 'MODEL18_TOOL_CALL_SCHEMA');
                                tool.name += call.function.name;
                            }
                            if (call.function?.arguments !== undefined) {
                                invariant(typeof call.function.arguments === 'string', 'MODEL18_TOOL_CALL_SCHEMA');
                                tool.arguments += call.function.arguments;
                            }
                            invariant(tool.name.length <= 128 && Buffer.byteLength(tool.arguments) <= 16384, 'MODEL18_TOOL_CALL_LIMIT');
                        }
                    }
                    if (choice.finish_reason !== null && choice.finish_reason !== undefined) {
                        invariant(finish === null && ['stop', 'tool_calls', 'length', 'content_filter', 'sensitive', ...(this.provider_id === 'deepseek' ? ['aborted', 'insufficient_system_resource'] : [])].includes(choice.finish_reason), 'MODEL18_FINISH_REASON');
                        finish = choice.finish_reason;
                    }
                }
            }
            invariant(done && finish !== null, 'MODEL18_STREAM_INCOMPLETE');
            invariant(finish === 'stop' || finish === 'tool_calls', 'MODEL18_RESPONSE_INCOMPLETE');
            guard.assertSafe(content, 'MODEL_RESPONSE');
            if (tool)
                guard.assertSafe(JSON.stringify(tool), 'MODEL_TOOL_RESPONSE');
            let reply;
            if (tool) {
                invariant(finish === 'tool_calls' && content.trim() === '' && allowed.has(tool.name), 'MODEL18_TOOL_CALL_SCHEMA');
                let args;
                try {
                    args = JSON.parse(tool.arguments);
                }
                catch {
                    throw new NexusError('MODEL18_TOOL_CALL_INCOMPLETE');
                }
                reply = validateReply({ kind: 'TOOL_CALL', tool_name: tool.name, arguments: args });
            }
            else {
                invariant(finish === 'stop', 'MODEL18_TOOL_CALL_INCOMPLETE');
                let parsed;
                try {
                    parsed = JSON.parse(content);
                }
                catch {
                    throw new NexusError('MODEL18_RESPONSE_JSON');
                }
                reply = validateReply(parsed);
            }
            guard.assertSafe(JSON.stringify(reply), 'NORMALIZED_RESPONSE');
            return snapshot({ provider_request_id: providerId, reply, usage: meter, finish_reason: finish, ...(model ? { response_model: model } : {}), ...(fingerprintSeen ? { system_fingerprint: fingerprint } : {}) });
        }
        catch (error) {
            if (error instanceof ProviderFault)
                throw error;
            throw new ProviderParseFault(error instanceof NexusError ? error.code : 'MODEL18_PARSE_FAILURE', meter);
        }
        finally {
            if (local)
                this.#nativeTools.delete(local);
        }
    }
}
export class OpenAIAdapter extends ChatProviderAdapter {
    constructor(options = {}) { super('openai', options); }
}
export class DeepSeekAdapter extends ChatProviderAdapter {
    constructor(options = {}) { super('deepseek', options); }
}
export class GLMAdapter extends ChatProviderAdapter {
    constructor(options = {}) { super('glm', options); }
}
