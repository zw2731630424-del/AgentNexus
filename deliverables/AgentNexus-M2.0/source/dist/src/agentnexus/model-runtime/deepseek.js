import { invariant } from '../types.js';
import { snapshot } from '../harness/contracts.js';
import { natural } from './protocol.js';
/** Documentation facts checked on 2026-11-08, never evidence of a paid API call. */
export const DEEPSEEK_FLASH_EVIDENCE = Object.freeze({
    model_id: 'deepseek-flash', served_model_label: 'DeepSeek-V4.1-Flash-1017',
    model_identity_assurance: 'DOCUMENTED_ALIAS_ONLY', context_tokens: 1048576, output_tokens: 393216,
    models_url: 'https://api-docs.deepseek.com/api/list-models/',
    pricing_url: 'https://api-docs.deepseek.com/quick_start/pricing/',
    completion_url: 'https://api-docs.deepseek.com/api/create-chat-completion/', checked_at: '2026-11-08',
});
export const DEEPSEEK_FLASH_RATES = Object.freeze({
    PEAK: Object.freeze({ cache_hit_micros_per_million: 6000, cache_miss_micros_per_million: 300000, output_micros_per_million: 1200000 }),
    OFF_PEAK: Object.freeze({ cache_hit_micros_per_million: 3000, cache_miss_micros_per_million: 150000, output_micros_per_million: 600000 }),
});
/** The Host still enforces its own smaller context bytes and per-request output limits. */
export function createDeepSeekFlashSpec(checked_at, valid_until) {
    invariant(Number.isFinite(Date.parse(checked_at)) && Number.isFinite(Date.parse(valid_until)) && Date.parse(valid_until) > Date.parse(checked_at), 'MODEL181_DEEPSEEK_PRICE_DATE');
    return snapshot({ provider_id: 'deepseek', model_id: 'deepseek-flash', context_tokens: DEEPSEEK_FLASH_EVIDENCE.context_tokens,
        // The local ModelSpec schema supports 65,536; this is not the provider's 393,216-token output ceiling.
        output_tokens: 65536, capabilities: { reasoning: true, tools: true, json: true, streaming: true, multimodal: false },
        price: { currency: 'USD', input_micros_per_million: DEEPSEEK_FLASH_RATES.PEAK.cache_miss_micros_per_million,
            output_micros_per_million: DEEPSEEK_FLASH_RATES.PEAK.output_micros_per_million,
            source: DEEPSEEK_FLASH_EVIDENCE.pricing_url, checked_at, valid_until, assurance: 'REAL' },
        // A local admission limit, not a statement about a provider account's quota.
        requests_per_minute: 60, state: 'ACTIVE', evidence_url: DEEPSEEK_FLASH_EVIDENCE.completion_url, checked_at });
}
/** Public rates yield an estimate; invoice evidence is required before calling it Actual Cost. */
export function deepSeekCost(usage, period) {
    invariant(period === 'PEAK' || period === 'OFF_PEAK', 'MODEL181_DEEPSEEK_PERIOD');
    natural(usage.input_tokens);
    natural(usage.output_tokens);
    if (usage.reasoning_tokens !== null) {
        natural(usage.reasoning_tokens);
        invariant(usage.reasoning_tokens <= usage.output_tokens, 'MODEL18_USAGE_REASONING');
    }
    for (const value of [usage.cache_hit_tokens, usage.cache_miss_tokens])
        if (value !== undefined && value !== null) {
            natural(value);
            invariant(value <= usage.input_tokens, 'MODEL18_USAGE_CACHE');
        }
    const complete = usage.cache_hit_tokens !== undefined && usage.cache_hit_tokens !== null && usage.cache_miss_tokens !== undefined && usage.cache_miss_tokens !== null;
    const hit = complete ? usage.cache_hit_tokens : 0, miss = complete ? usage.cache_miss_tokens : usage.input_tokens;
    invariant(hit + miss === usage.input_tokens, 'MODEL18_USAGE_CACHE');
    const rates = DEEPSEEK_FLASH_RATES[period];
    // completion_tokens already includes reasoning; never add reasoning_tokens again.
    const numerator = BigInt(hit) * BigInt(rates.cache_hit_micros_per_million) + BigInt(miss) * BigInt(rates.cache_miss_micros_per_million) + BigInt(usage.output_tokens) * BigInt(rates.output_micros_per_million);
    const cost = (numerator + 999999n) / 1000000n;
    invariant(cost <= BigInt(Number.MAX_SAFE_INTEGER), 'MODEL18_COST_OVERFLOW');
    return snapshot({ cost_micros: Number(cost), source: 'PROVIDER_USAGE_RATE_ESTIMATE', cache_estimated: !complete });
}
