// Desktop metadata and Context Host. CredentialService owns stored credentials and dispatch.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openHarness } from '../harness/index.js';
import { hostSubject, identifier } from '../harness/contracts.js';
import { canonical, sha256 } from '../types.js';
import { CapabilityRegistry, ModelRouter } from '../model-runtime/protocol.js';
import { ChatProviderAdapter, PROVIDER_ENDPOINTS } from '../model-runtime/adapters.js';
import { UnifiedModelGateway } from '../model-runtime/gateway.js';
import { ModelUsageLedger, modelTaskBudgetId } from '../model-runtime/ledger.js';
import { CampaignTokenLedger, M181_TOKEN_LIMIT } from '../model-runtime/campaign.js';
import { FixtureTransport, wireFixture } from '../model-runtime/transport.js';
import { CredentialVault, createVaultAdminCapability } from '../model-runtime/vault.js';
import { DesktopError, METHODS, requireThat, object, textValue, idValue, integer, bool, endpoint, connectionStatus } from './contracts.js';
import { entryIntent, entryResult, unavailableEntry } from './trusted-entry.js';
const TOKEN_LIMIT = M181_TOKEN_LIMIT;
const LIMITS = { workers: 4, memory_bytes: 268435456, processes: 8, disk_bytes: 67108864, wall_ms: 3000000, model_tokens: TOKEN_LIMIT, model_requests: 4096, model_cost_micros: 1000000000 };
function modelRef(m) { return m.provider_id + ':' + m.id; }
function taskKey(s) { return sha256(canonical({ project_id: s.project_id, task_id: s.task_id })); }
function unavailableUsage() {
    const meter = () => ({ input_tokens: null, output_tokens: null, cached_tokens: null, reasoning_tokens: null, requests: null, failed_requests: null, estimated_cost_micros: null, actual_cost_micros: null });
    return { available: false, status: 'SERVICE_UNAVAILABLE', global: { used: null, held: null, unknown: null, limit: null, remaining_tokens: null }, simulated_budget: { held: { tokens: null }, used: { tokens: null } }, real: meter(), simulated: meter(), by_provider: [], by_model: [], by_agent: [], by_task: [], records: [] };
}
/** Decorates the existing compatible adapter; registry IDs remain safe while wire model IDs may contain '/'. */
function adapterFor(p, models, timeout_ms, remote = false) {
    const wireProvider = remote && endpoint(p.base_url) === PROVIDER_ENDPOINTS.deepseek ? 'deepseek' : 'compatible';
    const delegate = new ChatProviderAdapter(wireProvider, { endpoint: endpoint(p.base_url), timeout_ms });
    return {
        provider_id: p.id, endpoint: delegate.endpoint, timeout_ms, retry_policy: delegate.retry_policy,
        build(input) { const m = models.find(m => m.id === input.model.model_id); requireThat(m, 'MODEL_UNAVAILABLE'); return delegate.build({ ...input, model: { ...input.model, provider_id: wireProvider, model_id: m.model_id } }); },
        parse: (...args) => delegate.parse(...args), error: s => delegate.error(s),
        ...{ abandon: (id) => delegate.abandon(id) },
    };
}
export async function openDesktopService(root, options = {}) {
    const timeoutMs = options.timeout_ms ?? 10000;
    integer(timeoutMs, 120000, 10);
    const credentialService = options.credentialService;
    // The no-port path is an explicit synthetic regression fixture, never a production fallback.
    requireThat(credentialService || options.protector || options.syntheticTransport, 'CREDENTIAL_SERVICE_REQUIRED');
    const local = credentialService ? undefined : await (async () => {
        const vaultAdmin = createVaultAdminCapability();
        const powershell = existsSync('C:/Program Files/PowerShell/7/pwsh.exe') ? 'C:/Program Files/PowerShell/7/pwsh.exe' : 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
        const vault = await CredentialVault.open({ root: join(root, 'synthetic-vault'), admin: vaultAdmin, mode: 'SYNTHETIC', protector: options.protector, powershell });
        return { vault, vaultAdmin };
    })();
    const guard = credentialService?.guard ?? local.vault.guard;
    let credentialSnapshot;
    let snapshotUnavailable = false;
    const entryStates = new Map();
    async function refreshCredentials() {
        if (credentialService) {
            try {
                credentialSnapshot = await credentialService.snapshot();
                snapshotUnavailable = false;
            }
            catch {
                snapshotUnavailable = true;
                credentialSnapshot ??= { qualification: { live: 'BLOCKED', credential_service: 'BLOCKED', real_key_entry: false, synthetic_key_entry: false, mode: credentialService.assurance, reason: 'SERVICE_UNAVAILABLE' }, keys: [], policy_epoch: 0, service_instance: 'unavailable', usage: unavailableUsage() };
            }
        }
        return credentialSnapshot;
    }
    // A SIMULATED port explicitly advertising synthetic entry is a regression fixture.
    // A REAL port can never enable this compatibility path, even if metadata is malformed.
    const fixtureEntryAllowed = () => options.syntheticCredentialFixture === true && !options.trustedEntry && (!credentialService || credentialService.assurance === 'SIMULATED' && credentialSnapshot?.qualification.synthetic_key_entry === true);
    const keys = () => credentialService ? credentialSnapshot?.keys ?? [] : local.vault.list(local.vaultAdmin);
    const vaultOptions = () => credentialService ? { broker: credentialService } : { vault: local.vault, vaultAdmin: local.vaultAdmin };
    let h, runtime, ledger;
    let closed = false, closing = false, busy = false;
    const active = new Set(), httpStatuses = new Map();
    const sessions = new WeakSet();
    const presets = options.presets ?? JSON.parse(await readFile(new URL('../../../config/agentnexus/providers.json', import.meta.url), 'utf8')).providers;
    const transport = options.syntheticTransport ?? new FixtureTransport(() => wireFixture(JSON.stringify({ kind: 'FINAL', text: 'SIMULATED · Model Gateway、Key Pool 和统一账本链路已完成。本次未连接外部模型服务。' }), { usage: { prompt_tokens: 20, completion_tokens: 10 } }));
    requireThat(transport.assurance === 'SIMULATED', 'LIVE_BLOCKED');
    const all = (kind) => {
        const result = [];
        let after;
        for (;;) {
            const page = runtime.state.list(kind, { after, limit: 100 });
            result.push(...page);
            if (page.length < 100)
                return result;
            const row = page.at(-1);
            after = row.id ?? row.request_id ?? row.entity_id;
            requireThat(after, 'PROJECTION_INVALID');
        }
    };
    const providers = () => all('DESKTOP_PROVIDER').filter(p => p.state === 'ACTIVE');
    const models = () => all('DESKTOP_MODEL').filter(m => m.state === 'ACTIVE');
    const provider = (id) => { idValue(id); const p = providers().find(p => p.id === id); requireThat(p, 'PROVIDER_NOT_FOUND'); return p; };
    const model = (ref) => { textValue(ref, 200); const m = models().find(m => modelRef(m) === ref); requireThat(m, 'MODEL_UNAVAILABLE'); return m; };
    const safe = (input) => guard.assertSafe(canonical(input), 'DESKTOP_METADATA');
    const owner = () => hostSubject(runtime.state.boot_id);
    async function put(kind, value, phase) {
        safe(value);
        await runtime.state.change(owner(), phase, () => {
            const old = runtime.state.get(kind, value.id);
            requireThat(old ? old.revision + 1 === value.revision : value.revision === 0, 'REVISION_CONFLICT');
            if (old)
                runtime.state.update(kind, value.id, old.revision, value.state, value);
            else
                runtime.state.insert(kind, value.id, owner(), value.state, value);
        }, { id: value.id });
        return value;
    }
    const prefs = () => runtime.state.get('DESKTOP_PREFERENCE', 'operator') ?? { id: 'operator', revision: -1, favorites: [], recent: [], default_model: null, state: 'ACTIVE' };
    const defaultBinding = (id) => ({ revision: -1, id, primary: prefs().default_model ?? providers().find(p => p.enabled && p.default_model)?.default_model ?? null, fallbacks: [], auto_route: true, failover: false, budget_tokens: 1000000, state: 'ACTIVE' });
    const binding = (id) => runtime.state.get('DESKTOP_BINDING', id) ?? defaultBinding(id);
    function spec(m) {
        // These zero-cost values are routing projections only; the broker independently prices dispatch.
        const assurance = credentialService?.assurance ?? 'SIMULATED';
        const evidence = presets.find(p => p.id === provider(m.provider_id).preset_id)?.source;
        const source = assurance === 'SIMULATED' ? 'SYNTHETIC_FIXTURE' : evidence?.startsWith('https://') ? evidence : provider(m.provider_id).base_url;
        return { provider_id: m.provider_id, model_id: m.id, state: m.enabled && provider(m.provider_id).enabled ? 'ACTIVE' : 'DISABLED', context_tokens: m.context_tokens, output_tokens: m.output_tokens, capabilities: m.capabilities, requests_per_minute: 120,
            checked_at: '2026-01-01T00:00:00Z', evidence_url: source, price: { currency: 'USD', input_micros_per_million: 0, output_micros_per_million: 0, source, checked_at: '2026-01-01T00:00:00Z', valid_until: '2099-01-01T00:00:00Z', assurance } };
    }
    function runtimeFor(s, forced, excluded = []) {
        const configured = models(), registry = new CapabilityRegistry();
        for (const m of configured)
            registry.register(spec(m));
        const b = binding(s.agent_id), override = runtime.state.get('DESKTOP_OVERRIDE', taskKey(s));
        let refs = forced ? [forced] : override?.ref ? [override.ref] : [...(b.primary ? [b.primary] : []), ...(b.failover ? b.fallbacks : [])];
        if (!forced && !override?.ref && b.auto_route)
            refs.push(...configured.filter(m => m.enabled).map(modelRef));
        refs = [...new Set(refs)].filter(ref => {
            if (excluded.includes(ref))
                return false;
            const m = configured.find(m => modelRef(m) === ref);
            if (!m)
                return false;
            const p = provider(m.provider_id);
            if (credentialService && (endpoint(p.base_url) !== PROVIDER_ENDPOINTS.deepseek || m.model_id !== 'deepseek-flash'))
                return false;
            return p.enabled && p.protocol === 'openai-compatible' && m.enabled && keys().some(k => k.provider_id === p.id && k.state === 'ACTIVE' && (k.models.includes(m.id) || !!credentialService && k.models.includes(m.model_id)) && k.in_flight < k.max_concurrency);
        });
        requireThat(refs.length > 0, 'NO_AVAILABLE_MODEL');
        const router = new ModelRouter(registry, { desktop: { [s.agent_type]: refs.slice(0, 8) } });
        return new UnifiedModelGateway(runtime.state, runtime.admin, { ...vaultOptions(), guard, ledger, router, adapters: providers().filter(p => p.protocol === 'openai-compatible').map(p => adapterFor(p, configured.filter(m => m.provider_id === p.id), timeoutMs, !!credentialService)),
            transport: { assurance: credentialService?.assurance ?? 'SIMULATED', async preflight(input) { requireThat(!credentialService && input.model.price.assurance === 'SIMULATED', 'LIVE_BLOCKED'); safe(JSON.parse(input.request.body)); await runtime.state.change(s, 'DESKTOP_SYNTHETIC_EGRESS', () => { }, { request_id: input.request.headers['x-agentnexus-request-id'], network: 'DENIED_LOCAL_FIXTURE_ONLY' }); await transport.preflight?.(input); }, async send(...args) { requireThat(!credentialService, 'CREDENTIAL_SERVICE_ONLY'); const response = await transport.send(...args); httpStatuses.set(args[0].headers['x-agentnexus-request-id'], response.status); return response; }, abandon: id => transport.abandon?.(id) },
            authorizeSubject: runtime.authorizeSubject, useWireModelIds: !!credentialService && !fixtureEntryAllowed(), onDelta: options.onDelta });
    }
    async function configureBudgets(s) {
        const budget = binding(s.agent_id).budget_tokens;
        if (credentialService) {
            // Daily callers cannot edit the service ledger. Existing service-side
            // default ceilings and signed request limits are authoritative.
            if (fixtureEntryAllowed())
                await credentialService.invoke('budget.configure', { subject: s, agent_tokens: budget, task_tokens: budget, project_tokens: TOKEN_LIMIT });
            return;
        }
        for (const [scope, id, tokens] of [['AGENT', s.agent_id, budget], ['TASK', modelTaskBudgetId(s), budget], ['PROJECT', s.project_id, TOKEN_LIMIT]])
            await ledger.configure(runtime.admin, { scope, id, assurance: 'SIMULATED', tokens, requests: 4096, cost_micros: 1000000000 });
    }
    async function withSlot(id, action) {
        requireThat(!closed && !closing, 'SESSION_REVOKED');
        identifier(id);
        const unknown = Math.max(runtime.state.count('DESKTOP_REQUEST', { state: 'INDETERMINATE' }), runtime.state.count('MODEL18_REQUEST', { state: 'INDETERMINATE' }));
        requireThat(!active.has(id) && active.size + unknown < 4, 'HOST_BUSY');
        active.add(id);
        try {
            return await action();
        }
        finally {
            active.delete(id);
        }
    }
    async function routedComplete(s, input, forced, signal) {
        runtime.authorizeSubject(s);
        object(input, ['request_id', 'context', 'max_output_tokens']);
        identifier(input.request_id);
        const captured = { request_id: input.request_id, context: input.context, max_output_tokens: input.max_output_tokens };
        const fingerprint = sha256(canonical({ subject: s, input: captured })), old = runtime.state.get('DESKTOP_REQUEST', captured.request_id);
        if (old) {
            requireThat(old.fingerprint === fingerprint && !!old.result, 'REQUEST_CONFLICT');
            return old.result;
        }
        await refreshCredentials();
        if (credentialService)
            requireThat(credentialService.assurance === 'SIMULATED' ? credentialSnapshot?.qualification.synthetic_key_entry === true : credentialSnapshot?.qualification.live === 'QUALIFIED', 'CREDENTIAL_SERVICE_QUALIFICATION_BLOCKED');
        let gateway = runtimeFor(s, forced);
        let record = { id: captured.request_id, revision: 0, state: 'ACTIVE', owner: s, fingerprint, attempts: [], result: null };
        await put('DESKTOP_REQUEST', record, 'DESKTOP_REQUEST_CREATED');
        const excluded = [];
        for (let attempt = 0; attempt < 3; attempt++) {
            const id = captured.request_id + '.a' + attempt;
            let deadlineReached = false;
            const deadline = setTimeout(() => { deadlineReached = true; }, timeoutMs);
            let result;
            try {
                result = await gateway.bind(s).complete({ ...captured, request_id: id }, signal);
            }
            catch {
                const row = runtime.state.get('MODEL18_REQUEST', id);
                result = row?.result ?? { status: 'SIMULATED', assurance: 'SIMULATED', outcome: row ? 'INDETERMINATE' : 'FAILED', request_id: id, provider_id: 'unselected', model_id: 'unselected', reply: null, usage: null, reason: row ? 'DESKTOP_OUTCOME_UNKNOWN' : 'DESKTOP_REJECTED_BEFORE_SEND', response_source: null };
            }
            finally {
                clearTimeout(deadline);
            }
            const remote = runtime.state.get('MODEL183_REMOTE_REQUEST', id);
            const http_status = httpStatuses.get(id) ?? remote?.http_status ?? null;
            httpStatuses.delete(id);
            const timed_out = remote?.timed_out === true || deadlineReached && !signal?.aborted && result.reason === 'MODEL18_SENT_OUTCOME_UNKNOWN';
            record = { ...record, revision: record.revision + 1, attempts: [...record.attempts, { id, provider_id: result.provider_id ?? 'unselected', model_id: result.model_id ?? 'unselected', outcome: result.outcome, http_status, timed_out }] };
            await put('DESKTOP_REQUEST', record, 'DESKTOP_ATTEMPT_RECORDED');
            // Only an acknowledged NOT_SENT result permits a new attempt. UNKNOWN is terminal.
            const usage = runtime.state.get('MODEL18_USAGE', id);
            const provenNotSent = result.outcome === 'FAILED' && (result.reason === 'MODEL18_NOT_SENT' || result.reason === 'DESKTOP_REJECTED_BEFORE_SEND') && (!usage || usage.state === 'NOT_SENT');
            const b = binding(s.agent_id);
            if (!forced && !signal?.aborted && provenNotSent && result.provider_id && result.model_id && (b.failover || b.auto_route) && attempt < 2) {
                excluded.push(result.provider_id + ':' + result.model_id);
                try {
                    gateway = runtimeFor(s, undefined, excluded);
                    continue;
                }
                catch { /* No remaining eligible route. */ }
            }
            const normalized = { ...result, request_id: captured.request_id, usage: result.usage ? { ...result.usage, request_id: captured.request_id } : null };
            record = { ...record, revision: record.revision + 1, state: result.outcome, result: normalized };
            await put('DESKTOP_REQUEST', record, 'DESKTOP_REQUEST_RESULT');
            return normalized;
        }
        throw new DesktopError('REQUEST_CONFLICT');
    }
    try {
        await refreshCredentials();
        h = await openHarness(join(root, 'host'), { host: { contentGuard: guard }, platform_limits: LIMITS,
            modelRuntimeFactory(host) {
                runtime = host;
                ledger = new ModelUsageLedger(host.state, host.admin);
                return {
                    handles: s => s.model_binding === 'desktop', recover: async (admin) => {
                        const recoveryTransport = { assurance: credentialService?.assurance ?? 'SIMULATED', send: (...args) => { requireThat(!credentialService, 'CREDENTIAL_SERVICE_ONLY'); return transport.send(...args); } };
                        const recovery = new UnifiedModelGateway(host.state, host.admin, { ...vaultOptions(), guard, ledger, router: new ModelRouter(new CapabilityRegistry(), {}), adapters: [], transport: recoveryTransport, authorizeSubject: host.authorizeSubject });
                        await recovery.recover(admin);
                    },
                    bind: s => Object.freeze({ complete: async (input, signal) => withSlot(input.request_id, async () => { await configureBudgets(s); return routedComplete(s, input, undefined, signal); }) }),
                };
            } });
        for (const r of all('DESKTOP_REQUEST').filter(r => r.state === 'ACTIVE')) {
            const attempt = r.attempts.at(-1);
            const result = { status: 'SIMULATED', assurance: 'SIMULATED', outcome: 'INDETERMINATE', request_id: r.id, provider_id: attempt?.provider_id ?? 'unselected', model_id: attempt?.model_id ?? 'unselected', reply: null, usage: null, reason: 'DESKTOP_HOST_RESTART_NO_RETRY', response_source: null };
            await put('DESKTOP_REQUEST', { ...r, revision: r.revision + 1, state: 'INDETERMINATE', result }, 'DESKTOP_REQUEST_RECOVERED');
        }
        // Only the explicit legacy regression fixture has Host usage stores.
        const campaign = credentialService ? undefined : new CampaignTokenLedger(runtime.state, runtime.admin, 'REAL');
        if (campaign) {
            await campaign.initialize(runtime.admin, 'm181-inherited-100m-authorization');
            for (const assurance of ['REAL', 'SIMULATED']) {
                try {
                    ledger.totals(runtime.admin, 'PLATFORM', 'platform', assurance);
                }
                catch {
                    await ledger.configure(runtime.admin, { scope: 'PLATFORM', id: 'platform', assurance, tokens: TOKEN_LIMIT, requests: 4096, cost_micros: 1000000000 });
                }
            }
        }
        if (!runtime.state.get('PROJECT', 'desktop'))
            await h.administration.createProject({ id: 'desktop', rules: ['Model switching never changes identity, tools, file scope or policy.', 'LIVE and real credential entry remain BLOCKED.'], budget: LIMITS });
        if (!all('AGENT').length) {
            // Desktop initializes the existing read-only Coordinator role via its audited feature gate.
            // Model selection never touches this gate or any Agent permissions.
            if (!runtime.state.enabled('runtime.role.coordinator')) {
                const metadata = h.administration.features.metadata();
                const preview = await h.administration.features.previewFeatures([{ id: 'runtime.role.coordinator', state: 'ON', scope: {} }], metadata.feature_revision);
                await h.administration.features.commitFeatures(preview.challenge_id, preview.preview_hash);
            }
            for (const [id, type, parent] of [['resident', 'RESIDENT', null], ['development', 'DEVELOPMENT', null], ['coding', 'SUBAGENT', 'development'], ['research', 'SUBAGENT', 'development'], ['test-agent', 'SUBAGENT', 'development'], ['reviewer', 'BACKGROUND_REVIEWER', null], ['math-reviewer', 'BACKGROUND_REVIEWER', null], ['coordinator', 'COORDINATOR', null]]) {
                await h.administration.createAgent({ id, project_id: 'desktop', task_id: id + '.session', type: type, model_binding: 'desktop', ...(parent ? { parent_id: parent } : {}), budget: { ...LIMITS, workers: 1 } });
            }
        }
        function usage() {
            if (credentialService)
                return snapshotUnavailable ? { ...credentialSnapshot.usage, available: false, status: 'SERVICE_UNAVAILABLE' } : credentialSnapshot.usage;
            const rows = all('MODEL18_USAGE');
            const sum = (entries) => ({ input_tokens: entries.reduce((n, r) => n + (r.usage?.input_tokens ?? 0), 0), output_tokens: entries.reduce((n, r) => n + (r.usage?.output_tokens ?? 0), 0), cached_tokens: entries.some(r => r.usage?.cache_hit_tokens != null) ? entries.reduce((n, r) => n + (r.usage?.cache_hit_tokens ?? 0), 0) : null,
                reasoning_tokens: entries.some(r => r.usage?.reasoning_tokens != null) ? entries.reduce((n, r) => n + (r.usage?.reasoning_tokens ?? 0), 0) : null, requests: entries.filter(r => r.sent_at).length, failed_requests: entries.filter(r => r.state === 'UNKNOWN' || r.state === 'NOT_SENT').length, estimated_cost_micros: entries.reduce((n, r) => n + (r.usage?.cost_micros ?? 0), 0), actual_cost_micros: null });
            const group = (by) => [...new Set(rows.map(r => by === 'agent_id' || by === 'task_id' ? r.subject[by] : r[by]))].map(id => ({ id, ...sum(rows.filter(r => (by === 'agent_id' || by === 'task_id' ? r.subject[by] : r[by]) === id)) }));
            return { global: campaign.inspect(runtime.admin), simulated_budget: ledger.totals(runtime.admin, 'PLATFORM', 'platform', 'SIMULATED'), real: sum(rows.filter(r => r.assurance === 'REAL')), simulated: sum(rows.filter(r => r.assurance === 'SIMULATED')), by_provider: group('provider_id'), by_model: group('model_id'), by_agent: group('agent_id'), by_task: group('task_id'), records: rows.map(r => ({ request_id: r.request_id, assurance: r.assurance, state: r.state, provider_id: r.provider_id, model_id: r.model_id, agent_id: r.subject.agent_id, task_id: r.subject.task_id, tokens: r.usage ? r.usage.input_tokens + r.usage.output_tokens : null, held_tokens: r.held.tokens, cost_micros: r.usage?.cost_micros ?? null })) };
        }
        async function snapshot() {
            await refreshCredentials();
            const entries = all('MODEL18_USAGE');
            const listedKeys = credentialService ? credentialSnapshot.keys.map(k => ({ ...k, models: k.models.map(id => models().find(m => m.provider_id === k.provider_id && m.model_id === id)?.id ?? id) })) : local.vault.list(local.vaultAdmin).map(k => { const label = runtime.state.get('DESKTOP_KEY', k.key_id), used = entries.filter(r => r.key_handle_id === k.key_handle_id); return { ...k, name: label?.name ?? k.key_id, notes: label?.notes ?? '', tokens: used.reduce((n, r) => n + (r.usage ? r.usage.input_tokens + r.usage.output_tokens : 0), 0), requests: used.filter(r => r.sent_at).length, errors: used.filter(r => r.state === 'UNKNOWN').length, health: k.state === 'ACTIVE' ? 'UNVERIFIED' : k.state }; });
            const qualification = credentialSnapshot?.qualification ?? { live: 'BLOCKED', credential_service: 'BLOCKED', real_key_entry: false, synthetic_key_entry: true, mode: 'SIMULATED', reason: 'EXPLICIT_SYNTHETIC_REGRESSION_FIXTURE_NO_OS_ISOLATION' };
            const dailyBlocked = !fixtureEntryAllowed() && credentialSnapshot?.daily_gateway?.status === 'BLOCKED';
            const credentialStatuses = providers().map(p => {
                const c = all('DESKTOP_CONNECTION').find(c => c.id === p.id), last = entryStates.get(p.id);
                const unavailable = snapshotUnavailable ? 'SERVICE_UNAVAILABLE' : dailyBlocked || qualification.reason === 'IPC_BLOCKED' ? 'IPC_BLOCKED' : null;
                const status = last?.status === 'INCONCLUSIVE' || last?.status === 'IPC_BLOCKED' ? last.status : !unavailable && c?.status === 'CONNECTED' && c.assurance === 'REAL' ? 'PROVIDER_CONNECTED' : c && ['INVALID_KEY', 'REVOKED', 'DATA_EGRESS_BLOCKED', 'BUDGET_EXCEEDED', 'INCONCLUSIVE'].includes(c.status) ? c.status : last?.status ?? unavailable ?? (listedKeys.some(k => k.provider_id === p.id) ? 'CREDENTIAL_SAVED' : 'NOT_CONFIGURED');
                return { provider_id: p.id, status, reason: last?.reason ?? (unavailable ? qualification.reason : c?.reason ?? status) };
            });
            const value = { schema: 'agentnexus/desktop/1', qualification, budgets_managed_by_service: !!credentialService && !fixtureEntryAllowed(), ...(credentialSnapshot?.daily_gateway ? { daily_gateway: credentialSnapshot.daily_gateway } : {}), credential_entry: { synthetic: fixtureEntryAllowed() || credentialService?.assurance === 'SIMULATED' && credentialSnapshot?.daily_gateway?.status === 'AVAILABLE', real: false, trusted: true, status: options.trustedEntry ? 'READY_FOR_INTENT' : 'IPC_BLOCKED' }, credential_statuses: credentialStatuses, service_status: snapshotUnavailable ? 'SERVICE_UNAVAILABLE' : dailyBlocked || qualification.reason === 'IPC_BLOCKED' ? 'IPC_BLOCKED' : 'AVAILABLE', registry: presets.map(p => ({ ...p, supported: p.protocol === 'openai-compatible' })), providers: providers(), models: models(), keys: listedKeys, connections: all('DESKTOP_CONNECTION'), preferences: prefs(),
                agents: all('AGENT').map(a => ({ id: a.id, type: a.subject.agent_type, lifecycle: a.lifecycle, binding: binding(a.id), task_id: a.subject.task_id })), overrides: all('DESKTOP_OVERRIDE'), usage: usage() };
            safe(value);
            return value;
        }
        async function invalidate(id, reason) {
            const c = runtime.state.get('DESKTOP_CONNECTION', id);
            if (c)
                await put('DESKTOP_CONNECTION', { ...c, revision: c.revision + 1, status: credentialService ? reason === 'CREDENTIAL_REVOKED' ? 'REVOKED' : 'NOT_CONNECTED' : 'NOT_TESTED', reason, simulation_passed: false }, 'DESKTOP_CONNECTION_INVALIDATED');
        }
        async function trustedEntry(input) {
            const intent = entryIntent(input), v = provider(intent.provider_id);
            requireThat(v.id === 'deepseek' && v.protocol === 'openai-compatible' && endpoint(v.base_url) === PROVIDER_ENDPOINTS.deepseek, 'TRUSTED_ENTRY_SCOPE_BLOCKED');
            const configured = models().filter(m => m.provider_id === v.id).map(m => m.model_id);
            requireThat(intent.model_ids.every(id => configured.includes(id)), 'TRUSTED_ENTRY_SCOPE_BLOCKED');
            const target = keys().find(k => k.key_id === intent.credential_id);
            requireThat(!target || target.provider_id === intent.provider_id, 'TRUSTED_ENTRY_SCOPE_BLOCKED');
            await runtime.state.change(owner(), 'DESKTOP_TRUSTED_ENTRY_INTENT', () => { }, { provider_id: intent.provider_id, action: intent.action, operation_id: intent.operation_id });
            let result;
            if (!options.trustedEntry)
                result = unavailableEntry();
            else {
                try {
                    result = entryResult(await options.trustedEntry.open(intent), intent.action);
                }
                catch {
                    result = { status: 'INCONCLUSIVE', reason: 'HELPER_CANCELLED_OR_UNKNOWN' };
                }
            }
            await refreshCredentials();
            if (snapshotUnavailable && (result.status === 'CREDENTIAL_SAVED' || result.status === 'REVOKED'))
                result = { status: 'INCONCLUSIVE', reason: 'SNAPSHOT_UNAVAILABLE' };
            entryStates.set(v.id, result);
            // No helper exit, including zero, is evidence of a Provider connection.
            if (result.status === 'CREDENTIAL_SAVED' || result.status === 'REVOKED')
                await invalidate(v.id, result.status === 'REVOKED' ? 'CREDENTIAL_REVOKED' : 'CREDENTIAL_CHANGED');
            await runtime.state.change(owner(), 'DESKTOP_TRUSTED_ENTRY_RESULT', () => { }, { provider_id: intent.provider_id, action: intent.action, operation_id: intent.operation_id, status: result.status });
            return result;
        }
        const trustedIntentFor = (providerId, action, credential_id) => entryIntent({ provider_id: providerId, model_ids: models().filter(m => m.provider_id === providerId && ['deepseek-flash', 'deepseek-v4-pro'].includes(m.model_id)).map(m => m.model_id), action, name: 'Manage DeepSeek Credential', operation_id: randomUUID(), ...(credential_id ? { credential_id } : {}) });
        async function syncKeyModels(id) {
            const scope = keyModels(id);
            await refreshCredentials();
            await runtime.state.change(owner(), 'DESKTOP_KEY_SCOPE_INTENT', () => { }, { provider_id: id });
            if (credentialService && !fixtureEntryAllowed() && (snapshotUnavailable || credentialSnapshot?.daily_gateway?.status === 'BLOCKED' || credentialSnapshot?.service_instance === 'UNAVAILABLE')) {
                const result = unavailableEntry();
                entryStates.set(id, result);
                await runtime.state.change(owner(), 'DESKTOP_KEY_SCOPE_NOT_CONFIRMED', () => { }, { provider_id: id, status: result.status });
                return result;
            }
            for (const key of keys().filter(k => k.provider_id === id)) {
                if (credentialService && !fixtureEntryAllowed()) {
                    const result = await trustedEntry(trustedIntentFor(id, 'MODELS', key.key_id));
                    if (result.status !== 'CREDENTIAL_SAVED') {
                        await runtime.state.change(owner(), 'DESKTOP_KEY_SCOPE_NOT_CONFIRMED', () => { }, { provider_id: id, status: result.status });
                        return result;
                    }
                }
                else if (credentialService)
                    await credentialService.invoke('credential.models', { key_id: key.key_id, ...scope });
                else
                    local.vault.setModels(local.vaultAdmin, key.key_id, scope.models);
            }
            await refreshCredentials();
            await runtime.state.change(owner(), 'DESKTOP_KEY_SCOPE_UPDATED', () => { }, { provider_id: id });
        }
        function keyModels(id) {
            const configured = models().filter(m => m.provider_id === id);
            return { models: configured.map(m => m.id), model_wire_ids: Object.fromEntries(configured.map(m => [m.id, m.model_id])) };
        }
        async function saveProvider(p) {
            object(p, ['id', 'name', 'preset_id', 'protocol', 'base_url', 'enabled', 'revision']);
            idValue(p.id);
            textValue(p.name, 80);
            textValue(p.preset_id, 96);
            integer(p.revision, 1000000, -1);
            bool(p.enabled);
            endpoint(p.base_url);
            requireThat(['openai-compatible', 'anthropic-compatible', 'google-native'].includes(p.protocol), 'UNSUPPORTED_PROTOCOL');
            requireThat(p.preset_id === 'custom' || presets.some(s => s.id === p.preset_id), 'INVALID_PROVIDER_PRESET');
            requireThat(!p.enabled || p.protocol === 'openai-compatible', 'UNSUPPORTED_PROTOCOL');
            const old = runtime.state.get('DESKTOP_PROVIDER', p.id);
            requireThat(old ? old.revision === p.revision && old.state === 'ACTIVE' : p.revision === -1, 'REVISION_CONFLICT');
            requireThat(providers().length < 32 || old, 'PROVIDER_LIMIT');
            const updated = { id: p.id, name: p.name, preset_id: p.preset_id, protocol: p.protocol, enabled: p.enabled, base_url: p.base_url.replace(/\/$/, ''), revision: p.revision + 1, state: 'ACTIVE', default_model: old?.default_model ?? null };
            await put('DESKTOP_PROVIDER', updated, 'DESKTOP_PROVIDER_SAVED');
            if (old && (old.base_url !== updated.base_url || old.protocol !== updated.protocol || old.enabled !== updated.enabled)) {
                const c = runtime.state.get('DESKTOP_CONNECTION', p.id);
                if (c)
                    await put('DESKTOP_CONNECTION', { ...c, revision: c.revision + 1, status: 'NOT_TESTED', reason: 'CONFIGURATION_CHANGED', simulation_passed: false }, 'DESKTOP_CONNECTION_INVALIDATED');
            }
            return { id: p.id };
        }
        async function complete(agentId, prompt, forced) {
            const request_id = randomUUID();
            return withSlot(request_id, async () => {
                const a = h.inspectAgent(agentId), s = a.subject;
                runtime.authorizeSubject(s);
                await configureBudgets(s);
                const source = await h.context.capture(s, 'RAW', Buffer.from(prompt));
                const context = await h.context.assemble(s, [{ source, section: 'TASK_CONTRACT', required: true }], { maxBytes: 8192 });
                const result = await routedComplete(s, { request_id, context, max_output_tokens: 64 }, forced);
                if (result.outcome === 'SUCCEEDED') {
                    const ref = result.provider_id + ':' + result.model_id, old = prefs();
                    await put('DESKTOP_PREFERENCE', { ...old, revision: old.revision + 1, recent: [ref, ...old.recent.filter(r => r !== ref)].slice(0, 10) }, 'DESKTOP_MODEL_USED');
                }
                return result;
            });
        }
        async function connection(p) {
            object(p, ['provider_id', 'model_ref', 'mode']);
            const v = provider(p.provider_id);
            requireThat(['LIVE', 'SIMULATED'].includes(p.mode));
            await refreshCredentials();
            let status = 'INCONCLUSIVE', reason = 'CREDENTIAL_SERVICE_QUALIFICATION_BLOCKED', request_id = null, simulation_passed = false;
            const blocked = credentialService && p.mode === 'LIVE' && (credentialSnapshot.qualification.live !== 'QUALIFIED' || credentialSnapshot.qualification.credential_service !== 'QUALIFIED');
            if (blocked) {
                status = credentialSnapshot.daily_gateway?.status === 'BLOCKED' && !fixtureEntryAllowed() ? 'IPC_BLOCKED' : snapshotUnavailable ? 'SERVICE_UNAVAILABLE' : 'BLOCKED';
                reason = credentialSnapshot.qualification.reason;
            }
            else {
                endpoint(v.base_url);
                const m = model(p.model_ref);
                requireThat(m.provider_id === v.id && m.enabled && v.enabled, 'MODEL_UNAVAILABLE');
                requireThat(v.protocol === 'openai-compatible', 'UNSUPPORTED_PROTOCOL');
                requireThat(keys().some(k => k.provider_id === v.id && k.state === 'ACTIVE' && (k.models.includes(m.id) || !!credentialService && k.models.includes(m.model_id))), 'CREDENTIAL_REQUIRED');
                if (p.mode === 'SIMULATED') {
                    requireThat(!credentialService || credentialService.assurance === 'SIMULATED', 'SIMULATED_SERVICE_REQUIRED');
                    const r = await complete('development', 'SYNTHETIC protocol connection test. Return FINAL with text OK.', p.model_ref);
                    request_id = r.request_id;
                    simulation_passed = r.outcome === 'SUCCEEDED';
                    reason = simulation_passed ? 'SIMULATED_GATEWAY_PASSED_NO_NETWORK' : r.reason;
                    // A fixture never sets CONNECTED or VERIFIED, including after reload.
                    if (simulation_passed)
                        await put('DESKTOP_MODEL', { ...m, revision: m.revision + 1, verified: 'SIMULATED' }, 'DESKTOP_MODEL_SIMULATED');
                    const request = runtime.state.get('DESKTOP_REQUEST', r.request_id);
                    // Only a trusted transport status is mapped; response text is never published.
                    if (!simulation_passed)
                        status = connectionStatus({ status: request?.attempts.at(-1)?.http_status ?? undefined, timeout: request?.attempts.at(-1)?.timed_out === true });
                }
                else if (credentialService) {
                    requireThat(credentialService.assurance === 'REAL', 'LIVE_BLOCKED');
                    const r = await complete('development', 'PUBLIC protocol connection test. Return FINAL with text OK.', p.model_ref);
                    request_id = r.request_id;
                    reason = r.reason;
                    const request = runtime.state.get('DESKTOP_REQUEST', r.request_id), observed = request?.attempts.at(-1);
                    status = r.assurance === 'REAL' && r.outcome === 'SUCCEEDED' ? 'CONNECTED' : connectionStatus({ status: observed?.http_status ?? undefined, timeout: observed?.timed_out === true });
                    if (status === 'CONNECTED')
                        await put('DESKTOP_MODEL', { ...m, revision: m.revision + 1, verified: 'VERIFIED' }, 'DESKTOP_MODEL_VERIFIED');
                }
            }
            const old = runtime.state.get('DESKTOP_CONNECTION', v.id);
            await put('DESKTOP_CONNECTION', { id: v.id, revision: (old?.revision ?? -1) + 1, state: 'ACTIVE', status, reason, tested_at: new Date().toISOString(), assurance: p.mode === 'SIMULATED' ? 'SIMULATED' : 'REAL', request_id, simulation_passed }, 'DESKTOP_CONNECTION_TESTED');
            return { status, reason, request_id, simulation_passed, live: credentialSnapshot?.qualification.live ?? 'BLOCKED' };
        }
        async function dispatch(method, p) {
            switch (method) {
                case 'snapshot':
                    object(p, []);
                    return snapshot();
                case 'provider.save': return saveProvider(p);
                case 'provider.delete': {
                    object(p, ['id', 'revision']);
                    const v = provider(p.id);
                    requireThat(v.revision === p.revision, 'REVISION_CONFLICT');
                    await refreshCredentials();
                    requireThat(!keys().some(k => k.provider_id === v.id), 'DELETE_KEYS_FIRST');
                    const refs = models().filter(m => m.provider_id === v.id).map(modelRef);
                    requireThat(!all('DESKTOP_BINDING').some(b => [b.primary, ...b.fallbacks].some(r => r && refs.includes(r))) && !all('DESKTOP_OVERRIDE').some(o => refs.includes(o.ref)), 'MODEL_IN_USE');
                    requireThat(!prefs().default_model || !refs.includes(prefs().default_model), 'MODEL_IN_USE');
                    for (const m of models().filter(m => m.provider_id === v.id))
                        await put('DESKTOP_MODEL', { ...m, revision: m.revision + 1, state: 'DELETED' }, 'DESKTOP_MODEL_DELETED');
                    await put('DESKTOP_PROVIDER', { ...v, revision: v.revision + 1, state: 'DELETED' }, 'DESKTOP_PROVIDER_DELETED');
                    return { deleted: true };
                }
                case 'model.save': {
                    object(p, ['provider_id', 'model_id', 'name', 'enabled', 'context_tokens', 'output_tokens', 'capabilities', 'revision', 'catalog_source'], ['provider_id', 'model_id', 'name', 'enabled', 'context_tokens', 'output_tokens', 'capabilities', 'revision']);
                    const v = provider(p.provider_id);
                    textValue(p.model_id, 128);
                    requireThat(/^[A-Za-z0-9][A-Za-z0-9_./:@-]*$/.test(p.model_id));
                    textValue(p.name, 80);
                    bool(p.enabled);
                    integer(p.context_tokens, 2000000, 1);
                    integer(p.output_tokens, 65536, 1);
                    requireThat(p.output_tokens <= p.context_tokens);
                    integer(p.revision, 1000000, -1);
                    object(p.capabilities, ['reasoning', 'tools', 'json', 'streaming', 'multimodal']);
                    for (const cap of Object.values(p.capabilities))
                        bool(cap);
                    const id = 'm.' + sha256(v.id + ':' + p.model_id).slice(0, 24), old = runtime.state.get('DESKTOP_MODEL', id);
                    requireThat(old ? old.revision === p.revision : p.revision === -1, 'REVISION_CONFLICT');
                    requireThat(models().length < 64 || old, 'MODEL_LIMIT');
                    const catalog = p.catalog_source === true ? presets.find(s => s.id === v.preset_id)?.models?.find(m => m.model_id === p.model_id) : undefined;
                    requireThat(p.catalog_source === undefined || p.catalog_source === true && catalog, 'CATALOG_SOURCE_INVALID');
                    const m = { id, revision: p.revision + 1, state: 'ACTIVE', provider_id: v.id, model_id: p.model_id, name: p.name, enabled: p.enabled, context_tokens: p.context_tokens, output_tokens: p.output_tokens, capabilities: p.capabilities, origin: old?.origin ?? (catalog ? 'OFFICIAL_CATALOG' : 'MANUAL'), source: old?.source ?? catalog?.source ?? 'USER_ENTERED_NOT_VERIFIED', verified: 'NOT_TESTED' };
                    await put('DESKTOP_MODEL', m, 'DESKTOP_MODEL_SAVED');
                    const scopeResult = await syncKeyModels(v.id);
                    await invalidate(v.id, 'MODEL_CHANGED');
                    return { id, ref: modelRef(m), credential_scope_status: scopeResult?.status ?? 'SYNCED' };
                }
                case 'model.delete': {
                    object(p, ['ref', 'revision']);
                    const m = model(p.ref);
                    requireThat(m.revision === p.revision, 'REVISION_CONFLICT');
                    requireThat(!all('DESKTOP_BINDING').some(b => b.primary === p.ref || b.fallbacks.includes(p.ref)) && !all('DESKTOP_OVERRIDE').some(o => o.ref === p.ref) && prefs().default_model !== p.ref, 'MODEL_IN_USE');
                    await put('DESKTOP_MODEL', { ...m, revision: m.revision + 1, state: 'DELETED' }, 'DESKTOP_MODEL_DELETED');
                    const v = provider(m.provider_id);
                    if (v.default_model === p.ref)
                        await put('DESKTOP_PROVIDER', { ...v, revision: v.revision + 1, default_model: null }, 'DESKTOP_DEFAULT_CLEARED');
                    const scopeResult = await syncKeyModels(v.id);
                    await invalidate(v.id, 'MODEL_CHANGED');
                    return { deleted: true, credential_scope_status: scopeResult?.status ?? 'SYNCED' };
                }
                case 'model.default': {
                    object(p, ['provider_id', 'ref']);
                    const v = provider(p.provider_id), m = model(p.ref);
                    requireThat(m.provider_id === v.id && m.enabled, 'MODEL_UNAVAILABLE');
                    await put('DESKTOP_PROVIDER', { ...v, revision: v.revision + 1, default_model: p.ref }, 'DESKTOP_DEFAULT_SAVED');
                    return { saved: true };
                }
                case 'credential.entry': return trustedEntry(p);
                case 'credential.save': {
                    // Gate before inspecting any legacy fixture payload. A REAL port never reaches it.
                    requireThat(fixtureEntryAllowed(), 'TRUSTED_ENTRY_REQUIRED');
                    const { saveSyntheticFixture } = await import('./synthetic-credential-fixture.js');
                    return saveSyntheticFixture(p, { service: credentialService, local, provider, scope: keyModels, safe, refresh: refreshCredentials, invalidate,
                        audit: async (phase, value) => { await runtime.state.change(owner(), phase, () => { }, value); },
                        label: value => put('DESKTOP_KEY', value, 'DESKTOP_CREDENTIAL_STORED') });
                }
                case 'credential.state': {
                    object(p, ['key_id', 'enabled']);
                    idValue(p.key_id);
                    bool(p.enabled);
                    await refreshCredentials();
                    const k = keys().find(k => k.key_id === p.key_id);
                    requireThat(k, 'KEY_NOT_FOUND');
                    requireThat(!p.enabled || ['DISABLED', 'ACTIVE'].includes(k.state), 'KEY_REQUIRES_ROTATION');
                    if (credentialService && !fixtureEntryAllowed())
                        return trustedEntry(trustedIntentFor(k.provider_id, p.enabled ? 'ENABLE' : 'DISABLE', k.key_id));
                    await runtime.state.change(owner(), 'DESKTOP_CREDENTIAL_STATE_INTENT', () => { }, { key_id: k.key_id, enabled: p.enabled });
                    if (credentialService)
                        await credentialService.invoke('credential.state', { key_id: p.key_id, enabled: p.enabled });
                    else
                        local.vault.setState(local.vaultAdmin, k.key_id, p.enabled ? 'ACTIVE' : 'DISABLED');
                    await refreshCredentials();
                    await runtime.state.change(owner(), 'DESKTOP_CREDENTIAL_STATE_SAVED', () => { }, { key_id: k.key_id, enabled: p.enabled });
                    await invalidate(k.provider_id, 'CREDENTIAL_CHANGED');
                    return { saved: true };
                }
                case 'credential.delete': {
                    object(p, ['key_id']);
                    idValue(p.key_id);
                    await refreshCredentials();
                    const k = keys().find(k => k.key_id === p.key_id);
                    requireThat(k, 'KEY_NOT_FOUND');
                    await runtime.state.change(owner(), 'DESKTOP_CREDENTIAL_DELETE_INTENT', () => { }, { key_id: p.key_id });
                    if (credentialService && !fixtureEntryAllowed())
                        return trustedEntry(trustedIntentFor(k.provider_id, 'DELETE', k.key_id));
                    if (credentialService)
                        await credentialService.invoke('credential.delete', { key_id: p.key_id });
                    else {
                        local.vault.setState(local.vaultAdmin, p.key_id, 'DISABLED');
                        local.vault.remove(local.vaultAdmin, p.key_id);
                    }
                    await refreshCredentials();
                    await runtime.state.change(owner(), 'DESKTOP_CREDENTIAL_DELETED', () => { }, { key_id: p.key_id });
                    await invalidate(k.provider_id, credentialService ? 'CREDENTIAL_REVOKED' : 'CREDENTIAL_CHANGED');
                    return { deleted: true };
                }
                case 'connection.test': return connection(p);
                case 'binding.save': {
                    object(p, ['agent_id', 'primary', 'fallbacks', 'auto_route', 'failover', 'budget_tokens', 'revision']);
                    idValue(p.agent_id);
                    h.inspectAgent(p.agent_id);
                    bool(p.auto_route);
                    bool(p.failover);
                    integer(p.budget_tokens, TOKEN_LIMIT, 1);
                    integer(p.revision, 1000000, -1);
                    requireThat(p.primary === null || typeof p.primary === 'string');
                    if (p.primary)
                        model(p.primary);
                    requireThat(Array.isArray(p.fallbacks) && p.fallbacks.length <= 7 && new Set(p.fallbacks).size === p.fallbacks.length && !p.fallbacks.includes(p.primary));
                    for (const ref of p.fallbacks)
                        model(ref);
                    const old = binding(p.agent_id);
                    requireThat(old.revision === p.revision, 'REVISION_CONFLICT');
                    requireThat(!credentialService || fixtureEntryAllowed() || p.budget_tokens === old.budget_tokens, 'SERVICE_MANAGED_BUDGET');
                    const { agent_id, ...rest } = p;
                    await put('DESKTOP_BINDING', { ...rest, id: agent_id, revision: p.revision + 1, state: 'ACTIVE' }, 'DESKTOP_BINDING_SAVED');
                    return { saved: true };
                }
                case 'selection.save': {
                    object(p, ['agent_id', 'ref']);
                    idValue(p.agent_id);
                    const s = h.inspectAgent(p.agent_id).subject;
                    if (p.ref !== null)
                        model(p.ref);
                    const id = taskKey(s), old = runtime.state.get('DESKTOP_OVERRIDE', id);
                    await put('DESKTOP_OVERRIDE', { id, revision: (old?.revision ?? -1) + 1, state: 'ACTIVE', ref: p.ref }, 'DESKTOP_TASK_MODEL_SELECTED');
                    return { saved: true };
                }
                case 'preference.save': {
                    object(p, ['favorites', 'default_model', 'revision']);
                    integer(p.revision, 1000000, -1);
                    requireThat(Array.isArray(p.favorites) && p.favorites.length <= 64 && new Set(p.favorites).size === p.favorites.length);
                    for (const ref of p.favorites)
                        model(ref);
                    if (p.default_model !== null)
                        model(p.default_model);
                    const old = prefs();
                    requireThat(p.revision === old.revision, 'REVISION_CONFLICT');
                    await put('DESKTOP_PREFERENCE', { ...old, ...p, revision: old.revision + 1 }, 'DESKTOP_PREFERENCES_SAVED');
                    return { saved: true };
                }
                case 'chat.send': {
                    object(p, ['agent_id', 'text']);
                    idValue(p.agent_id);
                    textValue(p.text, 4096);
                    return complete(p.agent_id, p.text);
                }
                default: throw new DesktopError('METHOD_DENIED');
            }
        }
        // Sessions are object capabilities minted by native bootstrap, never payload identity claims.
        const service = Object.freeze({
            openOperator() {
                const token = Object.freeze({});
                sessions.add(token);
                return Object.freeze({
                    async invoke(method, input = {}) {
                        requireThat(!closed && !closing && sessions.has(token), 'SESSION_REVOKED');
                        requireThat(METHODS.includes(method), 'METHOD_DENIED');
                        // Read-only refresh is allowed while one bounded operation is in flight.
                        requireThat(method === 'snapshot' || !busy, 'HOST_BUSY');
                        if (method !== 'snapshot')
                            busy = true;
                        try {
                            const result = await dispatch(method, input);
                            safe(result);
                            return result;
                        }
                        catch (error) {
                            if (error instanceof DesktopError)
                                throw error;
                            const code = error?.code;
                            throw new DesktopError(typeof code === 'string' && /^(?:VAULT_|MODEL18_|MODEL181_|CREDENTIAL_SERVICE_|BROKER_|SERVICE_)[A-Z0-9_]+$/.test(code) ? code : 'OPERATION_FAILED');
                        }
                        finally {
                            if (method !== 'snapshot')
                                busy = false;
                        }
                    },
                    revoke() { sessions.delete(token); },
                });
            },
            // Completion is the only model capability an Agent/Subagent receives.
            bindAgent(id) { const s = h.inspectAgent(id).subject; return Object.freeze({ complete: async (text) => { requireThat(!closed, 'SESSION_REVOKED'); runtime.authorizeSubject(s); textValue(text, 4096); return complete(id, text); } }); },
            async close() { requireThat(!busy && active.size === 0, 'HOST_BUSY'); if (closed)
                return; closing = true; await h.close(); local?.vault.close(); await credentialService?.close(); closed = true; },
        });
        return service;
    }
    catch (error) {
        await h?.close().catch(() => { });
        local?.vault.close();
        await credentialService?.close().catch(() => { });
        throw error;
    }
}
