import { performance } from 'node:perf_hooks';
import { auditEvent, canonical, invariant, NexusError, now, sha256, uid } from '../types.js';
import { intentHash } from '../gateway.js';
import { identityOf, snapshot } from './contracts.js';
import { AGENT_TYPES } from './contracts.js';
const TERMINAL = ['SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT', 'UNKNOWN_QUARANTINED'];
/** Durable bounded scheduler and native loop. No timer releases a resource. */
export class TaskScheduler {
    #d;
    #active = new Map();
    #closed = false;
    constructor(dependencies) { invariant(Number.isSafeInteger(dependencies.maxConcurrent ?? 4) && (dependencies.maxConcurrent ?? 4) >= 1 && (dependencies.maxConcurrent ?? 4) <= 16, 'SCHEDULER_CONCURRENCY_LIMIT'); invariant(Number.isSafeInteger(dependencies.model_output_tokens ?? 1024) && (dependencies.model_output_tokens ?? 1024) >= 1 && (dependencies.model_output_tokens ?? 1024) <= 4096, 'SCHEDULER_MODEL_OUTPUT_LIMIT'); invariant(Number.isSafeInteger(dependencies.model_context_bytes ?? 32768) && (dependencies.model_context_bytes ?? 32768) >= 1 && (dependencies.model_context_bytes ?? 32768) <= 262144, 'SCHEDULER_CONTEXT_LIMIT'); this.#d = dependencies; }
    get(id) { const task = this.#d.state.get('TASK', id); invariant(task, 'TASK_UNKNOWN'); return task; }
    #project(id) { const project = this.#d.state.get('PROJECT', id); invariant(project, 'PROJECT_UNKNOWN'); return project; }
    #current(task) { const agent = this.#d.agents.get(task.subject.agent_id); invariant(agent.subject.project_id === task.subject.project_id && agent.subject.task_id === task.id, 'TASK_AGENT_BINDING'); return agent.subject; }
    async #update(id, phase, changes, detail = {}) {
        const actor = this.#current(this.get(id));
        return this.#d.state.change(actor, phase, () => {
            const task = this.get(id);
            const time = Date.now();
            let waiting = task.waiting_ms, paused = task.paused_ms;
            if (changes.state && changes.state !== task.state) {
                if (['QUEUED', 'WAITING_RESOURCES', 'WAITING'].includes(task.state))
                    waiting += Math.max(0, time - task.state_since);
                if (task.state === 'PAUSED')
                    paused += Math.max(0, time - task.state_since);
            }
            const next = { ...task, ...changes, subject: actor, revision: task.revision + 1, waiting_ms: waiting, paused_ms: paused, state_since: changes.state && changes.state !== task.state ? time : task.state_since };
            this.#d.state.update('TASK', id, task.revision, next.state, next);
            return snapshot(next);
        }, { task_id: id, state: changes.state ?? null, reason: changes.reason ?? null, ...detail });
    }
    async create(admin, input) {
        this.#d.state.checkAdmin(admin);
        const p = snapshot(input);
        const agent = this.#d.agents.get(p.agent_id), actor = agent.subject;
        invariant(actor.task_id === p.id, 'TASK_AGENT_BINDING');
        this.#d.state.require('native.task-scheduler', actor);
        this.#d.agents.current(actor);
        invariant(p.id.length <= 96, 'TASK_ID_LENGTH');
        invariant(this.#project(actor.project_id).state === 'ACTIVE', 'PROJECT_NOT_ACTIVE');
        invariant(typeof p.goal === 'string' && Buffer.byteLength(p.goal) > 0 && Buffer.byteLength(p.goal) <= 8192, 'TASK_GOAL_LIMIT');
        const maxTurns = p.max_turns ?? 8, wall = p.wall_ms ?? 30000;
        invariant(p.history_window === undefined || typeof p.history_window === 'boolean', 'TASK_HISTORY_POLICY');
        const historyWindow = p.history_window ?? this.#d.history_window ?? false;
        invariant(Number.isSafeInteger(maxTurns) && maxTurns > 0 && maxTurns <= 32 && Number.isSafeInteger(wall) && wall >= 10 && wall <= 300000, 'TASK_LIMIT');
        const dependencies = p.dependencies ?? [];
        invariant(dependencies.length <= 16 && new Set(dependencies).size === dependencies.length && !dependencies.includes(p.id), 'TASK_DEPENDENCY');
        for (const id of dependencies) {
            const dependency = this.get(id);
            invariant(dependency.subject.project_id === actor.project_id, 'TASK_DEPENDENCY_SCOPE');
        }
        const existing = this.#d.state.get('TASK', p.id);
        const creationHash = sha256(canonical(p));
        if (existing) {
            invariant(existing.creation_hash === creationHash, 'TASK_DUPLICATE_CONTRACT');
            return existing;
        }
        invariant(this.#d.state.count('TASK') < 512, 'TASK_QUEUE_LIMIT');
        const requirements = { workers: 1, memory_bytes: 16777216, wall_ms: wall, ...p.requirements };
        invariant(requirements.workers === 1, 'TASK_REQUIRES_ONE_WORKER');
        if (p.contract) {
            this.#d.state.require('wf.templates.contract', actor);
            invariant(p.contract.acceptance.length > 0 && p.contract.acceptance.length <= 16 && p.contract.allowed_scope.length <= 16 && p.contract.allowed_scope.every(resource => agent.file_scope.includes(resource)) && p.contract.acceptance.every(item => typeof item === 'string' && item.length > 0 && item.length <= 512), 'WORKFLOW_TASK_CONTRACT');
        }
        const inputs = p.inputs ?? [];
        invariant(inputs.length <= 8, 'TASK_CONTEXT_INPUT_LIMIT');
        for (const item of inputs)
            this.#d.context.validate(actor, item.source);
        if (p.review_binding) {
            const author = this.#d.agents.get(p.review_binding.author_agent_id);
            invariant(actor.agent_type === 'BACKGROUND_REVIEWER' && author.subject.project_id === actor.project_id && author.id !== actor.agent_id && /^[a-f0-9]{40,64}$/.test(p.review_binding.commit) && /^[a-f0-9]{64}$/.test(p.review_binding.diff_sha256) && /^[a-f0-9]{64}$/.test(p.review_binding.candidate_sha256), 'REVIEW_VERSION_BINDING');
        }
        const rulesBinding = p.rules_binding ?? this.#d.rules.captureBinding(actor);
        const registry = this.#d.rules.assertBinding(actor, rulesBinding);
        invariant(registry.sources.every(source => source.context_source), 'TASK_RULE_SOURCE_REQUIRED');
        const gateRequirements = p.gate_requirements ?? [];
        invariant(gateRequirements.length <= 7 && new Set(gateRequirements.map(g => g.gate_id)).size === gateRequirements.length, 'TASK_GATE_CONTRACT');
        for (const gate of gateRequirements) {
            invariant(Object.keys(gate).sort().join(',') === 'baseline_hash,candidate_hash,gate_id,record_id,test_profile_hash' && /^g[0-6]$/.test(gate.gate_id) && gate.record_id === null, 'TASK_GATE_CONTRACT');
            for (const hash of [gate.candidate_hash, gate.baseline_hash, gate.test_profile_hash])
                invariant(/^[a-f0-9]{64}$/.test(hash), 'TASK_GATE_CONTRACT');
        }
        const ref = await this.#d.context.capture(actor, 'RAW', Buffer.from(canonical({ goal: p.goal, dependencies, requirements, max_turns: maxTurns, wall_ms: wall, workflow_contract: p.contract ?? null, review_binding: p.review_binding ?? null, inputs, rules_binding: rulesBinding, gate_requirements: gateRequirements, ...(historyWindow ? { history_window: { max_references: 32, raw_archive_unchanged: true } } : {}) })), { maxBytes: 16384 });
        const task = { id: p.id, revision: 0, subject: actor, state: 'QUEUED', goal: p.goal, contract_ref: ref, dependencies, requirements, max_turns: maxTurns, turns: 0, attempts: 0,
            created_at: now(), deadline_at: Date.now() + wall, started_at: null, finished_at: null, startup_ms: 0, execution_ms: 0, waiting_ms: 0, paused_ms: 0, state_since: Date.now(), reservation_id: null,
            history: [], pending_tool: null, result_ref: null, reason: null, stop_reason: null, received_message_ids: [], persistent_write: false, inputs, review_binding: p.review_binding ?? null, rules_binding: rulesBinding, gate_requirements: gateRequirements, creation_hash: creationHash, ...(historyWindow ? { history_window: true, history_dropped: 0 } : {}) };
        await this.#d.state.change(actor, 'TASK_CREATED', () => { this.#d.state.require('native.task-scheduler', actor); this.#d.agents.current(actor); invariant(this.#d.state.count('TASK') < 512, 'TASK_QUEUE_LIMIT'); this.#d.state.insert('TASK', p.id, actor, task.state, task); });
        return snapshot(task);
    }
    async dispatch(admin, id) {
        this.#d.state.checkAdmin(admin);
        invariant(!this.#closed, 'SCHEDULER_CLOSED');
        invariant(!this.#active.has(id), 'TASK_ALREADY_DISPATCHED');
        invariant(this.#active.size < (this.#d.maxConcurrent ?? 4), 'SCHEDULER_CONCURRENCY_LIMIT');
        const task = this.get(id);
        invariant(['QUEUED', 'WAITING_RESOURCES'].includes(task.state), 'TASK_DISPATCH_STATE');
        invariant(![...this.#active.keys()].some(key => this.get(key).subject.agent_id === task.subject.agent_id), 'AGENT_TURN_ACTIVE');
        const controller = new AbortController();
        const promise = this.#turn(admin, id, controller);
        this.#active.set(id, { promise, controller });
        try {
            return await promise;
        }
        finally {
            this.#active.delete(id);
        }
    }
    #unsettled(actor) {
        return !!this.#d.state.store.db.prepare("SELECT 1 FROM control_operations WHERE subject=? AND (executor_state='UNKNOWN' OR state IN ('CLAIMED','STARTED','INDETERMINATE','RESULT_RECORDED')) LIMIT 1").get(actor.agent_id);
    }
    #checkGates(task, actor) {
        invariant(task.rules_binding, 'TASK_RULES_MIGRATION_REQUIRED');
        this.#d.rules.assertBinding(actor, task.rules_binding);
        const requirements = task.gate_requirements ?? [], required = this.#d.gates.requiredGates(actor, task.rules_binding);
        invariant(required.every(id => requirements.some(g => g.gate_id === id)), 'TASK_GATE_REQUIRED');
        for (const gate of requirements) {
            invariant(gate.record_id, 'TASK_GATE_REQUIRED');
            this.#d.gates.assertPass(actor, gate.record_id, { gate_id: gate.gate_id, binding: task.rules_binding, candidate_hash: gate.candidate_hash, baseline_hash: gate.baseline_hash, test_profile_hash: gate.test_profile_hash });
        }
    }
    #persistent(actor, task) {
        const operations = this.#d.state.store.db.prepare("SELECT operation_id FROM control_operations WHERE subject=? AND workspace IS NOT NULL AND executor_state!='NOT_INVOKED' AND json_extract(request_key,'$.identity.project_id')=? AND json_extract(request_key,'$.identity.task_id')=? LIMIT 33").all(actor.agent_id, actor.project_id, actor.task_id);
        if (operations.length > 32 || operations.some(op => !this.#d.storage.acknowledged(op.operation_id)))
            return true;
        if (task.persistent_write)
            return false;
        const request = task.pending_tool;
        if (!request)
            return false;
        const grant = this.#d.agents.get(actor.agent_id).tools.find(tool => tool.tool_id === request.tool_id && tool.version === request.tool_version);
        if (grant?.capability !== 'LOCAL_WRITE')
            return false;
        const key = canonical({ identity: identityOf(actor), call_id: request.call_id });
        const operation = this.#d.state.store.db.prepare('SELECT executor_state FROM control_operations WHERE request_key=?').get(key);
        return !!operation && operation.executor_state !== 'NOT_INVOKED' && !this.#d.storage.acknowledged(this.#d.state.store.db.prepare('SELECT operation_id FROM control_operations WHERE request_key=?').get(key).operation_id);
    }
    async #reserve(admin, task) {
        const actor = this.#current(task), project = this.#project(actor.project_id);
        await this.#d.prepareResources?.();
        await this.#d.budgets.configure(admin, actor, { id: actor.resource_budget_id, scope: 'WORKER', owner_id: actor.runtime_instance_id, limits: this.#d.agents.get(actor.agent_id).worker_limits });
        if (task.reservation_id) {
            await this.#d.budgets.drainWaiters(admin, actor, 1);
            return this.#d.budgets.inspect(admin, actor, task.reservation_id);
        }
        const id = uid();
        // Record the planned id before reserve. A crash never invents a second reservation.
        await this.#update(task.id, 'TASK_RESERVATION_PLANNED', { state: 'DISPATCHING', reservation_id: id, attempts: task.attempts + 1 });
        return this.#d.budgets.reserve(admin, actor, { id, worker_budget_id: actor.resource_budget_id, project_budget_id: project.budget_id, platform_budget_id: this.#d.platform_budget_id,
            amounts: task.requirements, mode: 'SIMULATED', operation_id: id, wait: true, expires_at: task.deadline_at });
    }
    async #release(admin, task, elapsed) {
        if (!task.reservation_id)
            return;
        const actor = this.#current(task);
        let reservation = this.#d.budgets.inspect(admin, actor, task.reservation_id);
        invariant(!this.#persistent(actor, task), 'PERSISTENT_DISK_OWNER_UNVERIFIED');
        if (reservation.state === 'ACTIVE') {
            await this.#d.budgets.adoptStorage(admin, actor, reservation.id);
            reservation = this.#d.budgets.inspect(admin, actor, reservation.id);
        }
        if (reservation.state === 'RELEASED')
            return;
        if (reservation.state === 'RESERVED') {
            const token = await this.#d.budgets.issueClosure(admin, actor, reservation.id, 'NEVER_STARTED');
            await this.#d.budgets.release(admin, actor, reservation.id, token);
            return;
        }
        invariant(reservation.state === 'ACTIVE' && !this.#unsettled(actor), 'TASK_EXIT_UNVERIFIED');
        const values = { wall_ms: Math.ceil(elapsed) };
        await this.#d.budgets.account(admin, actor, reservation.id, { sequence: reservation.sequence + 1, source: 'SIMULATED', values, evidence_hash: sha256(canonical({ task_id: task.id, elapsed_ms: elapsed, handler_and_outputs_settled: true, os_release: false })), complete: true });
        const token = await this.#d.budgets.issueClosure(admin, actor, reservation.id, 'SIMULATED_SETTLED');
        await this.#d.budgets.release(admin, actor, reservation.id, token);
    }
    async #remember(id, source, extra = {}) {
        const task = this.get(id), next = this.#history(task, source);
        return this.#update(id, next.dropped.length ? 'TASK_HISTORY_WINDOW_ADVANCED' : 'TASK_CONTEXT_ADVANCED', { ...extra, history: next.history, ...(task.history_window ? { history_dropped: next.total } : {}) }, next.dropped.length ? { dropped_source_refs: next.dropped, history_dropped: next.total, raw_archive_unchanged: true } : {});
    }
    #history(task, source) {
        invariant(task.history.length <= 32, 'TASK_HISTORY_REFERENCE_LIMIT');
        if (task.history.length === 32)
            invariant(task.history_window === true, 'TASK_HISTORY_REFERENCE_LIMIT');
        const dropped = task.history.length === 32 ? [task.history[0]] : [];
        return { history: [...(dropped.length ? task.history.slice(1) : task.history), source], dropped, total: (task.history_dropped ?? 0) + dropped.length };
    }
    async #tool(admin, id, request, signal) {
        const actor = this.#current(this.get(id));
        this.#checkGates(this.get(id), actor);
        const definition = this.#d.tools.preview(actor, request);
        const gates = this.get(id).gate_requirements;
        if (definition.capability === 'LOCAL_WRITE' && gates.length) {
            invariant(definition.id === 'native.storage.write', 'TASK_GATE_TOOL_BINDING_REQUIRED');
            const write = this.#d.storage.validate(request.arguments);
            invariant(gates.every(gate => gate.candidate_hash === write.source.payload_ref.sha256), 'TASK_GATE_CANDIDATE_MISMATCH');
        }
        // ToolGateway owns schema, Feature, Policy, approval, permit, intent and output closure.
        const result = await this.#d.tools.run(actor, request, signal);
        const operation = this.#d.state.store.db.prepare('SELECT executor_state FROM control_operations WHERE operation_id=?').get(result.operation_id);
        const persistent = definition.capability === 'LOCAL_WRITE' && !!operation && operation.executor_state !== 'NOT_INVOKED';
        if (persistent)
            await this.#update(id, 'TASK_PERSISTENT_WRITE_OBSERVED', { persistent_write: true });
        const original = this.#d.state.store.db.prepare("SELECT event_id FROM anx_records WHERE domain='context' AND operation_id=? AND json_extract(body,'$.kind')='tool.result' ORDER BY seq DESC LIMIT 1").get(result.operation_id);
        const source = original ? this.#d.context.source(actor, original.event_id) : await this.#d.context.capture(actor, 'RAW', Buffer.from(canonical(result)), { maxBytes: 65536 });
        await this.#remember(id, source, { pending_tool: null, persistent_write: this.get(id).persistent_write || persistent });
        return result;
    }
    async #turn(admin, id, controller) {
        let timer;
        const started = performance.now();
        let executionStarted = started;
        let entered = false;
        try {
            let task = this.get(id);
            const actor = this.#current(task);
            this.#d.state.require('native.agent-loop', actor);
            this.#d.state.require('native.task-scheduler', actor);
            this.#d.agents.current(actor);
            this.#d.state.require(AGENT_TYPES[actor.agent_type].feature, actor);
            invariant(this.#project(actor.project_id).state === 'ACTIVE', 'PROJECT_NOT_ACTIVE');
            for (const dependency of task.dependencies)
                invariant(this.get(dependency).state === 'SUCCEEDED', 'TASK_DEPENDENCY_NOT_READY');
            invariant(Date.now() < task.deadline_at, 'TASK_DEADLINE');
            invariant(!this.#d.state.store.db.prepare("SELECT 1 FROM m16_entities WHERE kind='TASK_HANDOFF' AND state='PLANNED' AND (json_extract(body,'$.source_task_id')=? OR json_extract(body,'$.input.id')=?) LIMIT 1").get(task.id, task.id), 'TASK_HANDOFF_INCOMPLETE');
            this.#checkGates(task, actor);
            const reservation = await this.#reserve(admin, task);
            if (reservation.state === 'WAITING') {
                const stop = this.get(id).stop_reason;
                if (stop) {
                    await this.#d.budgets.cancelWait(admin, actor, reservation.id, stop);
                    return this.#update(id, 'TASK_WAIT_CANCELLED', { state: stop, reservation_id: null, reason: stop });
                }
                return this.#update(id, 'TASK_RESOURCE_WAIT', { state: 'WAITING_RESOURCES', reason: 'INSUFFICIENT_BUDGET' });
            }
            invariant(reservation.state === 'RESERVED', 'TASK_RESOURCE_REJECTED');
            if (controller.signal.aborted || this.get(id).stop_reason) {
                task = this.get(id);
                await this.#release(admin, task, 0);
                return this.#update(id, 'TASK_STOPPED_BEFORE_START', { state: task.stop_reason === 'PAUSED' ? 'PAUSED' : task.stop_reason ?? 'CANCELLED', reservation_id: null, reason: task.stop_reason ?? 'CANCELLED' });
            }
            await this.#d.budgets.start(admin, actor, reservation.id);
            entered = true;
            task = await this.#update(id, 'TASK_DISPATCHED', { state: 'RUNNING', started_at: task.started_at ?? now(), reason: null });
            let agent = this.#d.agents.get(actor.agent_id);
            if (agent.lifecycle === 'WAITING') {
                await this.#d.agents.transition(admin, agent.id, 'RESUMING');
                agent = this.#d.agents.get(agent.id);
            }
            invariant(['READY', 'RESUMING'].includes(agent.lifecycle), 'AGENT_NOT_READY');
            await this.#d.agents.transition(admin, agent.id, 'RUNNING');
            task = await this.#update(id, 'TASK_EXECUTION_ENTERED', { startup_ms: task.startup_ms + Math.ceil(performance.now() - started) });
            executionStarted = performance.now();
            timer = setTimeout(() => { controller.abort('TIMED_OUT'); void this.stop(admin, id, 'TIMED_OUT').catch(() => { }); }, Math.max(1, task.deadline_at - Date.now()));
            if (controller.signal.aborted || this.get(id).stop_reason)
                task = await this.#update(id, 'TASK_STOP_OBSERVED', { state: 'STOPPING' });
            if (task.pending_tool && task.state === 'RUNNING') {
                if (!task.pending_tool.approval_id) {
                    await this.#update(id, 'TASK_APPROVAL_WAIT', { state: 'WAITING', reason: 'APPROVAL_REQUIRED' });
                }
                else {
                    const result = await this.#tool(admin, id, task.pending_tool, controller.signal);
                    if (result.status !== 'PASS' && !controller.signal.aborted)
                        await this.#update(id, 'TASK_TOOL_FAILED', { state: result.status === 'INCONCLUSIVE' ? 'UNKNOWN_QUARANTINED' : 'FAILED', reason: result.reason });
                }
            }
            while (this.get(id).state === 'RUNNING') {
                task = this.get(id);
                this.#checkGates(task, actor);
                if (this.#persistent(actor, task)) {
                    await this.#update(id, 'TASK_DISK_OWNER_UNVERIFIED', { state: 'UNKNOWN_QUARANTINED', reason: 'PERSISTENT_DISK_OWNER_UNVERIFIED' });
                    break;
                }
                this.#d.state.require(AGENT_TYPES[actor.agent_type].feature, actor);
                if (controller.signal.aborted || task.stop_reason) {
                    await this.#update(id, 'TASK_STOP_OBSERVED', { state: task.stop_reason === 'PAUSED' ? 'PAUSED' : task.stop_reason ?? 'CANCELLED', reason: task.stop_reason ?? 'CANCELLED' });
                    break;
                }
                if (Date.now() >= task.deadline_at) {
                    await this.#update(id, 'TASK_DEADLINE_OBSERVED', { state: 'TIMED_OUT', reason: 'TASK_DEADLINE' });
                    break;
                }
                invariant(task.turns < task.max_turns, 'TASK_TURN_LIMIT');
                this.#d.state.require('wf.rules.project-index', actor);
                invariant(task.rules_binding, 'TASK_RULES_MIGRATION_REQUIRED');
                const registry = this.#d.rules.assertBinding(actor, task.rules_binding);
                if (registry.sources.some(source => source.id.startsWith('global.')))
                    this.#d.state.require('wf.rules.global', actor);
                const frozenRules = registry.sources.map(source => { invariant(source.context_source, 'TASK_RULE_SOURCE_REQUIRED'); return { source: source.context_source, section: 'PROJECT_RULES', required: true, binding: { reference: registry.id + ':' + source.id, version: registry.version, sha256: source.payload_ref.sha256 } }; });
                const base = [...frozenRules,
                    { source: this.#d.agents.get(actor.agent_id).context_ref, section: 'AGENT_CONTRACT', required: true },
                    { source: task.contract_ref, section: 'TASK_CONTRACT', required: true }, ...task.inputs];
                const slots = Math.max(0, Math.min(12, 32 - base.length));
                const selections = [...base, ...(slots ? task.history.slice(-slots) : []).map(source => ({ source, section: 'RECENT_INTERACTION', required: false }))];
                const { registry_id: _registryId, ...contextBinding } = task.rules_binding;
                const view = await this.#d.context.assemble(actor, selections, { maxBytes: this.#d.model_context_bytes ?? 32768, maxSources: 32, bindings: contextBinding, signal: controller.signal });
                this.#d.state.require('native.agent-loop', actor);
                invariant(this.#project(actor.project_id).state === 'ACTIVE', 'PROJECT_NOT_ACTIVE');
                if (controller.signal.aborted || this.get(id).stop_reason)
                    continue;
                task = await this.#update(id, 'TASK_MODEL_INTENT', { turns: task.turns + 1 });
                this.#d.agents.current(actor);
                const result = await this.#d.models.bind(actor).complete({ request_id: id + '.turn.' + task.turns, context: view, max_output_tokens: this.#d.model_output_tokens ?? 1024 }, controller.signal);
                const source = await this.#d.context.capture(actor, 'RAW', Buffer.from(canonical(result)), { maxBytes: 32768 });
                await this.#remember(id, source);
                if (result.outcome !== 'SUCCEEDED' || !result.reply) {
                    if (controller.signal.aborted && result.outcome !== 'INDETERMINATE')
                        await this.#update(id, 'TASK_MODEL_CANCELLED_BEFORE_SEND', { state: 'STOPPING', reason: result.reason });
                    else
                        await this.#update(id, 'TASK_MODEL_FAILED', { state: result.outcome === 'INDETERMINATE' ? 'UNKNOWN_QUARANTINED' : 'FAILED', reason: result.reason });
                    break;
                }
                if (controller.signal.aborted || this.get(id).stop_reason)
                    continue;
                const reply = result.reply;
                if (reply.kind === 'FINAL') {
                    await this.#update(id, 'TASK_RESULT', { state: 'SUCCEEDED', result_ref: source, reason: result.assurance === 'REAL' ? 'REAL_MODEL_COMPLETE' : 'SIMULATED_MODEL_COMPLETE' });
                    break;
                }
                if (reply.kind === 'WAIT' || reply.kind === 'HANDOFF') {
                    await this.#update(id, 'TASK_WAIT', { state: 'WAITING', reason: reply.kind });
                    break;
                }
                const request = this.#d.tools.request(actor, reply.tool_name, reply.tool_version ?? '1', reply.arguments ?? null, reply.resource_id);
                const tool = this.#d.tools.preview(actor, request);
                await this.#update(id, 'TASK_TOOL_INTENT', { pending_tool: request });
                if (tool.capability === 'LOCAL_WRITE') {
                    await this.#update(id, 'TASK_APPROVAL_WAIT', { state: 'WAITING', reason: 'APPROVAL_REQUIRED' });
                    break;
                }
                const output = await this.#tool(admin, id, request, controller.signal);
                if (output.status !== 'PASS' && !controller.signal.aborted) {
                    await this.#update(id, 'TASK_TOOL_FAILED', { state: output.status === 'INCONCLUSIVE' ? 'UNKNOWN_QUARANTINED' : 'FAILED', reason: output.reason });
                    break;
                }
            }
            task = this.get(id);
            if (task.state === 'STOPPING')
                task = await this.#update(id, 'TASK_STOP_OBSERVED', { state: task.stop_reason === 'PAUSED' ? 'PAUSED' : task.stop_reason ?? 'CANCELLED', reason: task.stop_reason ?? 'CANCELLED' });
            if (this.#unsettled(actor) || task.state === 'UNKNOWN_QUARANTINED' || this.#persistent(actor, task)) {
                await this.#d.budgets.unknown(admin, actor, reservation.id, 'TASK_EFFECT_OR_EXIT_UNKNOWN');
                await this.#update(id, 'TASK_QUARANTINED', { state: 'UNKNOWN_QUARANTINED', reason: task.persistent_write ? 'PERSISTENT_DISK_OWNER_UNVERIFIED' : 'TASK_EFFECT_OR_EXIT_UNKNOWN' });
                await this.#d.agents.transition(admin, actor.agent_id, 'UNKNOWN_QUARANTINED', 'TASK_EFFECT_OR_EXIT_UNKNOWN');
            }
            else {
                await this.#release(admin, task, performance.now() - started);
                task = await this.#update(id, 'TASK_HANDLER_SETTLED', { reservation_id: null, execution_ms: task.execution_ms + Math.ceil(performance.now() - executionStarted), finished_at: TERMINAL.includes(task.state) ? now() : null });
                const target = task.review_binding?.author_agent_id ?? this.#d.agents.get(actor.agent_id).parent_id;
                if (task.state === 'SUCCEEDED' && target && task.result_ref && this.#d.deliver) {
                    try {
                        await this.#d.deliver(actor, target, task.result_ref, task.id);
                    }
                    catch {
                        await this.#update(id, 'TASK_DELIVERY_PENDING', { reason: 'DELIVERY_PENDING_EXPLICIT_RECONCILIATION' });
                    }
                }
                if (['WAITING', 'PAUSED'].includes(task.state))
                    await this.#d.agents.transition(admin, actor.agent_id, 'WAITING', task.reason);
                else {
                    await this.#d.agents.transition(admin, actor.agent_id, 'STOPPING', task.reason);
                    await this.#d.agents.transition(admin, actor.agent_id, 'STOPPED', task.reason);
                }
            }
            if (this.#d.state.enabled('native.checkpoints-auto', actor) && this.#d.state.enabled('wf.templates.checkpoint', actor))
                await this.#checkpoint(admin, id);
            return this.get(id);
        }
        catch (error) {
            let task = this.get(id);
            const actor = this.#current(task);
            const reason = error instanceof NexusError ? error.code : 'TASK_INTERNAL_FAILURE';
            const reservation = task.reservation_id ? this.#d.state.get('resource_reservation', task.reservation_id) : null;
            const unknownModel = ['MODEL_REQUEST', 'MODEL18_REQUEST'].some(kind => this.#d.state.count(kind, { project_id: actor.project_id, agent_id: actor.agent_id, task_id: actor.task_id, state: 'INDETERMINATE' }) > 0);
            if (this.#d.state.faulted || task.state === 'UNKNOWN_QUARANTINED' || reservation?.state === 'UNKNOWN_QUARANTINED' || this.#persistent(actor, task) || unknownModel || this.#unsettled(actor)) {
                if (reservation && ['ACTIVE', 'RESERVED'].includes(reservation.state))
                    await this.#d.budgets.unknown(admin, actor, reservation.id, reason.slice(0, 1024)).catch(() => { });
                await this.#update(id, 'TASK_FAILURE_QUARANTINED', { state: 'UNKNOWN_QUARANTINED', reason: reason.slice(0, 1024) }).catch(() => { });
                const agent = this.#d.agents.get(actor.agent_id);
                if (['RUNNING', 'STOPPING'].includes(agent.lifecycle))
                    await this.#d.agents.transition(admin, agent.id, 'UNKNOWN_QUARANTINED', reason.slice(0, 1024)).catch(() => { });
                if (this.#d.state.faulted)
                    throw error;
                if (this.get(id).state !== 'UNKNOWN_QUARANTINED')
                    throw new NexusError('TASK_RECONCILIATION_REQUIRED');
            }
            else if (!entered && !reservation && (reason === 'TASK_GATE_REQUIRED' || reason.startsWith('NATIVE_GATE_') || reason === 'TASK_HANDOFF_INCOMPLETE')) {
                return this.#update(id, 'TASK_GATE_BLOCKED', { state: 'QUEUED', reason });
            }
            else if (!entered && !reservation && (reason === 'TASK_DEPENDENCY_NOT_READY' || reason === 'PROJECT_NOT_ACTIVE')) {
                // These are recoverable scheduling preconditions; no worker started.
                return task;
            }
            else {
                if (reservation && ['RESERVED', 'ACTIVE'].includes(reservation.state))
                    await this.#release(admin, task, entered ? performance.now() - started : 0);
                const stopped = task.stop_reason === 'PAUSED' ? 'PAUSED' : task.stop_reason;
                task = await this.#update(id, 'TASK_REJECTED', { state: stopped ?? (reason === 'TASK_DEADLINE' ? 'TIMED_OUT' : 'FAILED'), reason: reason.slice(0, 1024), finished_at: stopped === 'PAUSED' ? null : now(), reservation_id: null });
                const agent = this.#d.agents.get(actor.agent_id);
                if (agent.lifecycle === 'RUNNING') {
                    if (stopped === 'PAUSED')
                        await this.#d.agents.transition(admin, agent.id, 'WAITING', task.reason);
                    else {
                        await this.#d.agents.transition(admin, agent.id, 'STOPPING', task.reason);
                        await this.#d.agents.transition(admin, agent.id, 'STOPPED', task.reason);
                    }
                }
            }
            return this.get(id);
        }
        finally {
            if (timer)
                clearTimeout(timer);
        }
    }
    async #checkpoint(admin, id) {
        const task = this.get(id), actor = this.#current(task);
        await this.#d.workflow.checkpoint(admin, actor, { task_revision: task.revision, context_cursor: Number(this.#d.state.store.db.prepare('SELECT COALESCE(MAX(seq),0) AS n FROM anx_records').get().n),
            pending_operation_ids: task.pending_tool ? [task.pending_tool.call_id] : [], reservation_ids: task.reservation_id ? [task.reservation_id] : [], candidate_hash: sha256(canonical({ task_id: id, goal: task.goal })), note: task.reason ?? task.state });
    }
    async approveTool(admin, id, reason) {
        this.#d.state.checkAdmin(admin);
        const task = this.get(id), actor = this.#current(task);
        invariant(task.state === 'WAITING' && task.reason === 'APPROVAL_REQUIRED' && task.pending_tool && !task.pending_tool.approval_id, 'TASK_NO_PENDING_APPROVAL');
        this.#d.tools.preview(actor, task.pending_tool);
        const approval = await this.#d.approve(intentHash(identityOf(actor), task.pending_tool), actor, reason);
        await this.#update(id, 'TASK_TOOL_APPROVED', { pending_tool: { ...task.pending_tool, approval_id: approval } });
        return approval;
    }
    async requestStorageWrite(admin, id, args) {
        this.#d.state.checkAdmin(admin);
        const task = this.get(id), actor = this.#current(task);
        const request = this.#d.storage.validate(args);
        invariant(task.state === 'QUEUED' && !task.reservation_id && !task.pending_tool && !this.#active.has(id), 'TASK_STORAGE_REQUEST_STATE');
        invariant(task.gate_requirements.every(gate => gate.candidate_hash === request.source.payload_ref.sha256), 'TASK_GATE_CANDIDATE_MISMATCH');
        const tool = this.#d.tools.request(actor, 'native.storage.write', '1', request, request.resource_id);
        return this.#update(id, 'TASK_STORAGE_APPROVAL_REQUIRED', { state: 'WAITING', reason: 'APPROVAL_REQUIRED', pending_tool: tool });
    }
    async bindGate(admin, id, gateId, recordId) {
        this.#d.state.checkAdmin(admin);
        const task = this.get(id), actor = this.#current(task);
        invariant(['QUEUED', 'WAITING', 'PAUSED'].includes(task.state) && !task.reservation_id && !this.#active.has(id), 'TASK_GATE_BIND_STATE');
        const requirement = task.gate_requirements.find(g => g.gate_id === gateId);
        invariant(requirement, 'TASK_GATE_CONTRACT');
        this.#d.gates.assertPass(actor, recordId, { gate_id: gateId, binding: task.rules_binding, candidate_hash: requirement.candidate_hash, baseline_hash: requirement.baseline_hash, test_profile_hash: requirement.test_profile_hash });
        return this.#update(id, 'TASK_GATE_BOUND', { gate_requirements: task.gate_requirements.map(g => g.gate_id === gateId ? { ...g, record_id: recordId } : g) });
    }
    async resume(admin, id) {
        this.#d.state.checkAdmin(admin);
        const task = this.get(id);
        invariant(['WAITING', 'PAUSED'].includes(task.state) && !this.#active.has(id), 'TASK_RESUME_STATE');
        invariant(!this.#d.state.store.db.prepare("SELECT 1 FROM m16_entities WHERE kind='TASK_HANDOFF' AND state='PLANNED' AND json_extract(body,'$.source_task_id')=? LIMIT 1").get(id), 'TASK_HANDOFF_INCOMPLETE');
        invariant(!this.#unsettled(this.#current(task)), 'TASK_EXIT_UNVERIFIED');
        return this.#update(id, 'TASK_RESUMED', { state: 'QUEUED', stop_reason: null, reason: null });
    }
    async stop(admin, id, reason = 'CANCELLED') {
        this.#d.state.checkAdmin(admin);
        invariant(['CANCELLED', 'PAUSED', 'TIMED_OUT'].includes(reason), 'TASK_STOP_REASON');
        const task = this.get(id);
        invariant(!TERMINAL.includes(task.state), 'TASK_TERMINAL');
        const active = this.#active.get(id);
        if (active) {
            active.controller.abort(reason);
            return this.#update(id, 'TASK_STOP_REQUESTED', { state: 'STOPPING', stop_reason: reason, reason });
        }
        if (task.reservation_id) {
            const r = this.#d.budgets.inspect(admin, this.#current(task), task.reservation_id);
            if (r.state === 'RESERVED')
                await this.#release(admin, task, 0);
            else if (r.state === 'WAITING')
                await this.#d.budgets.cancelWait(admin, this.#current(task), r.id, reason);
            else
                invariant(r.state === 'REJECTED' || r.state === 'RELEASED', 'TASK_EXIT_UNVERIFIED');
        }
        const result = await this.#update(id, 'TASK_STOPPED', { state: reason, stop_reason: reason, reservation_id: null, reason, finished_at: reason === 'PAUSED' ? null : now() });
        const agent = this.#d.agents.get(task.subject.agent_id);
        if (reason === 'PAUSED' && agent.lifecycle === 'READY')
            await this.#d.agents.transition(admin, agent.id, 'WAITING', reason);
        if (reason !== 'PAUSED' && ['READY', 'WAITING', 'RESUMING'].includes(agent.lifecycle)) {
            await this.#d.agents.transition(admin, agent.id, 'STOPPING', reason);
            await this.#d.agents.transition(admin, agent.id, 'STOPPED', reason);
        }
        return result;
    }
    async wake(admin, actor) {
        this.#d.state.checkAdmin(admin);
        const task = this.#d.state.get('TASK', actor.task_id);
        if (task && task.subject.agent_id === actor.agent_id && task.state === 'WAITING' && !task.reason?.startsWith('HANDOFF_PENDING:') && !this.#active.has(task.id))
            await this.resume(admin, task.id);
    }
    async acceptMessage(admin, actor, messageId, source) {
        this.#d.state.checkAdmin(admin);
        const task = this.get(actor.task_id);
        invariant(task.subject.agent_id === actor.agent_id && task.subject.project_id === actor.project_id, 'TASK_MESSAGE_SCOPE');
        if (task.received_message_ids.includes(messageId))
            return;
        invariant(task.received_message_ids.length < 32, 'TASK_MESSAGE_LIMIT');
        this.#d.context.validate(actor, source);
        await this.#remember(task.id, source, { received_message_ids: [...task.received_message_ids, messageId] });
    }
    acceptMessageInTransaction(admin, actor, message) {
        this.#d.state.checkAdmin(admin);
        const task = this.get(actor.task_id);
        invariant(task.subject.agent_id === actor.agent_id && task.subject.project_id === actor.project_id && message.receiver.agent_id === actor.agent_id, 'TASK_MESSAGE_SCOPE');
        if (task.received_message_ids.includes(message.message_id))
            return;
        invariant(task.received_message_ids.length < 32 && (task.history.length < 32 || task.history_window === true), 'TASK_MESSAGE_LIMIT');
        this.#d.context.validate(actor, message.payload);
        const next = this.#history(task, message.payload);
        this.#d.state.update('TASK', task.id, task.revision, task.state, { ...task, revision: task.revision + 1, history: next.history, ...(task.history_window ? { history_dropped: next.total } : {}), received_message_ids: [...task.received_message_ids, message.message_id] });
        if (next.dropped.length)
            this.#d.state.store.audit(auditEvent(identityOf(actor), { operation_id: message.operation_id, operation_type: 'NATIVE_HARNESS', phase: 'TASK_HISTORY_WINDOW_ADVANCED', context_event_refs: next.dropped.map(source => source.event_id), detail: { dropped_source_refs: next.dropped, history_dropped: next.total, raw_archive_unchanged: true } }));
    }
    async migrateRules(admin, id, reason, authorization) {
        this.#d.state.checkAdmin(admin);
        const task = this.get(id), actor = this.#current(task);
        invariant(['QUEUED', 'WAITING', 'PAUSED'].includes(task.state) && !task.reservation_id && !task.pending_tool && !this.#active.has(id), 'TASK_RULE_MIGRATION_STATE');
        invariant(task.rules_binding, 'TASK_LEGACY_RULE_MIGRATION_REQUIRED');
        const to = this.#d.rules.captureBinding(actor);
        invariant(this.#d.gates.requiredGates(actor, to).every(gate => task.gate_requirements.some(g => g.gate_id === gate)), 'TASK_RULE_MIGRATION_GATE_CONTRACT_REQUIRED');
        const migration = await this.#d.rules.migrate(admin, actor, { from: task.rules_binding, to, reason, authorization_ref: authorization });
        const contract = await this.#d.context.capture(actor, 'RAW', Buffer.from(canonical({ schema: 'agentnexus/task-rule-migration/1', goal: task.goal, dependencies: task.dependencies, requirements: task.requirements,
            original_contract_ref: task.contract_ref, migration_id: migration.id, from: migration.from, to: migration.to, reason })), { maxBytes: 16384 });
        return this.#d.state.change(actor, 'TASK_RULES_MIGRATED', () => {
            const current = this.get(id);
            invariant(current.revision === task.revision && !this.#active.has(id), 'TASK_RULE_MIGRATION_CONFLICT');
            const next = { ...current, rules_binding: migration.to, contract_ref: contract, gate_requirements: current.gate_requirements.map(g => ({ ...g, record_id: null })), revision: current.revision + 1 };
            this.#d.state.update('TASK', id, current.revision, next.state, next);
            return snapshot(next);
        }, { migration_id: migration.id, from: migration.from.rule_hash, to: migration.to.rule_hash });
    }
    async quiesce(admin, scope, type, workRole) {
        this.#d.state.checkAdmin(admin);
        const matches = [...this.#active.entries()].filter(([id]) => {
            const actor = this.get(id).subject;
            return (!type || actor.agent_type === type) && (!workRole || this.#d.agents.get(actor.agent_id).work_role === workRole) && Object.entries(scope).every(([key, value]) => actor[key] === value);
        });
        for (const [id] of matches)
            if (!TERMINAL.includes(this.get(id).state))
                await this.stop(admin, id, 'PAUSED');
        await Promise.all(matches.map(([, active]) => active.promise));
    }
    async handoff(admin, id, targetAgentId) {
        this.#d.state.checkAdmin(admin);
        const original = this.get(id), target = this.#d.agents.get(targetAgentId);
        const planId = sha256(original.subject.project_id + ':' + id);
        let plan = this.#d.state.get('TASK_HANDOFF', planId);
        if (plan) {
            invariant(plan.target_agent_id === targetAgentId, 'TASK_HANDOFF_CONFLICT');
            if (plan.state === 'COMPLETED')
                return this.get(plan.input.id);
            invariant(typeof plan.input.history_window === 'boolean', 'TASK_HANDOFF_HISTORY_POLICY_MIGRATION_REQUIRED');
        }
        invariant(['QUEUED', 'WAITING', 'PAUSED'].includes(original.state) && !original.reservation_id && !original.pending_tool && !original.persistent_write && !this.#active.has(id), 'TASK_HANDOFF_STATE');
        invariant(target.subject.project_id === original.subject.project_id && target.subject.task_id !== id && target.read_tasks.includes(id), 'TASK_HANDOFF_SCOPE');
        invariant(original.deadline_at > Date.now(), 'TASK_DEADLINE');
        this.#d.context.validate(target.subject, original.contract_ref);
        if (!plan) {
            const input = { id: target.subject.task_id, agent_id: targetAgentId, goal: original.goal, requirements: original.requirements, max_turns: original.max_turns, wall_ms: Math.max(10, original.deadline_at - Date.now()), rules_binding: original.rules_binding, inputs: original.inputs, dependencies: original.dependencies, gate_requirements: original.gate_requirements.map(g => ({ ...g, record_id: null })), history_window: original.history_window === true };
            plan = await this.#d.state.change(this.#current(original), 'TASK_HANDOFF_INTENT', () => {
                const existing = this.#d.state.get('TASK_HANDOFF', planId);
                if (existing) {
                    invariant(existing.target_agent_id === targetAgentId, 'TASK_HANDOFF_CONFLICT');
                    return existing;
                }
                const current = this.get(id);
                invariant(current.revision === original.revision && !this.#active.has(id), 'TASK_HANDOFF_CONFLICT');
                const record = { id: planId, revision: 0, state: 'PLANNED', source_task_id: id, target_agent_id: targetAgentId, input, deadline_at: original.deadline_at, contract_ref: original.contract_ref };
                this.#d.state.insert('TASK_HANDOFF', planId, current.subject, 'PLANNED', record);
                this.#d.state.update('TASK', id, current.revision, 'WAITING', { ...current, revision: current.revision + 1, state: 'WAITING', reason: 'HANDOFF_PENDING:' + input.id });
                return snapshot(record);
            }, { target_agent_id: targetAgentId, target_task_id: input.id, rules_hash: original.rules_binding.rule_hash });
        }
        let next = this.#d.state.get('TASK', plan.input.id);
        if (next)
            invariant(next.creation_hash === sha256(canonical(plan.input)), 'TASK_DUPLICATE_CONTRACT');
        else
            next = await this.create(admin, plan.input);
        const frozen = plan;
        await this.#d.state.change(this.#current(this.get(id)), 'TASK_HANDED_OFF', () => {
            const currentPlan = this.#d.state.get('TASK_HANDOFF', planId);
            if (currentPlan.state === 'COMPLETED')
                return;
            const source = this.get(id), destination = this.get(frozen.input.id);
            invariant(source.state === 'WAITING' && source.reason === 'HANDOFF_PENDING:' + destination.id && destination.state === 'QUEUED', 'TASK_HANDOFF_CONFLICT');
            const next = destination.history.some(ref => canonical(ref) === canonical(frozen.contract_ref)) ? { history: destination.history, dropped: [], total: destination.history_dropped ?? 0 } : this.#history(destination, frozen.contract_ref);
            this.#d.state.update('TASK', destination.id, destination.revision, destination.state, { ...destination, history: next.history, ...(destination.history_window ? { history_dropped: next.total } : {}), deadline_at: Math.min(destination.deadline_at, frozen.deadline_at), revision: destination.revision + 1 });
            if (next.dropped.length)
                this.#d.state.store.audit(auditEvent(identityOf(this.#current(destination)), { operation_id: frozen.id, operation_type: 'NATIVE_HARNESS', phase: 'TASK_HISTORY_WINDOW_ADVANCED', context_event_refs: next.dropped.map(source => source.event_id), detail: { dropped_source_refs: next.dropped, history_dropped: next.total, raw_archive_unchanged: true, handoff_plan_id: frozen.id } }));
            this.#d.state.update('TASK', id, source.revision, 'WAITING', { ...source, state: 'WAITING', reason: 'HANDOFF:' + destination.id, revision: source.revision + 1 });
            this.#d.state.update('TASK_HANDOFF', planId, currentPlan.revision, 'COMPLETED', { ...currentPlan, state: 'COMPLETED', revision: currentPlan.revision + 1 });
        }, { target_task_id: frozen.input.id, plan_id: planId });
        if (this.#d.agents.get(original.subject.agent_id).lifecycle === 'READY')
            await this.#d.agents.transition(admin, original.subject.agent_id, 'WAITING', 'HANDOFF');
        return this.get(frozen.input.id);
    }
    async expire(admin) {
        this.#d.state.checkAdmin(admin);
        let after, total = 0;
        for (;;) {
            const page = this.#d.state.list('TASK', { ...(after ? { after } : {}), limit: 32 });
            if (!page.length)
                break;
            for (const task of page)
                if (!TERMINAL.includes(task.state) && task.deadline_at <= Date.now()) {
                    await this.stop(admin, task.id, 'TIMED_OUT');
                    total++;
                }
            after = page.at(-1).id;
        }
        return total;
    }
    async recover(admin) {
        this.#d.state.checkAdmin(admin);
        let after;
        for (;;) {
            const page = this.#d.state.list('TASK', { ...(after ? { after } : {}), limit: 32 });
            if (!page.length)
                break;
            for (const task of page) {
                if (TERMINAL.includes(task.state))
                    continue;
                const actor = this.#current(task), unsafe = ['RUNNING', 'DISPATCHING', 'STOPPING', 'WAITING_RESOURCES'].includes(task.state) || !!task.reservation_id || this.#unsettled(actor);
                const pending = task.pending_tool ? { ...task.pending_tool } : null;
                if (pending)
                    delete pending.approval_id;
                const handoff = this.#d.state.get('TASK_HANDOFF', sha256(task.subject.project_id + ':' + task.id));
                await this.#update(task.id, 'TASK_RECOVERED', { state: unsafe ? 'UNKNOWN_QUARANTINED' : task.state, pending_tool: pending,
                    reason: unsafe ? 'HOST_RESTART_REQUIRES_RECONCILIATION' : pending ? 'APPROVAL_REQUIRED' : handoff?.state === 'PLANNED' ? 'HANDOFF_PENDING:' + handoff.input.id : task.reason?.startsWith('HANDOFF:') ? task.reason : 'RECOVERED_EXPLICIT_DISPATCH_REQUIRED' });
            }
            after = page.at(-1).id;
        }
    }
    activeCount() { return this.#active.size; }
    async close() { invariant(this.#active.size === 0, 'SCHEDULER_ACTIVE_TASKS'); this.#closed = true; }
}
