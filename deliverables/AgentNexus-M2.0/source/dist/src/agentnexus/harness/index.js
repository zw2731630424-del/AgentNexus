import { readFile } from 'node:fs/promises';
import { openHost } from '../host.js';
import { canonical, invariant, sha256, uid } from '../types.js';
import { NativeState } from './state.js';
import { AGENT_TYPES, hostSubject, identifier, identityOf, snapshot } from './contracts.js';
import { AgentRuntime } from './agents.js';
import { ContextAssembly } from './context.js';
import { MessageBus } from './messages.js';
import { ModelGateway } from './models.js';
import { BudgetManager } from '../resources/index.js';
import { NativeToolRuntime } from './tools.js';
import { TaskScheduler } from './scheduler.js';
import { WorkflowRuntime } from './workflow.js';
import { RulesCompiler } from './rules.js';
import { NativeGateEngine } from './gates.js';
import { StorageOwner } from './storage-owner.js';
import { ResidentEventLoop } from './event-loop.js';
import { DevelopmentAdmission } from './development.js';
const DEFAULT_LIMITS = Object.freeze({ workers: 4, memory_bytes: 268435456, processes: 16, disk_bytes: 67108864, cpu_user_us: 10000000, cpu_kernel_us: 10000000,
    io_read_bytes: 67108864, io_write_bytes: 67108864, log_bytes: 8388608, network_connections: 0, network_bytes: 0, model_tokens: 1000000, model_requests: 1000, model_cost_micros: 10000000, wall_ms: 3000000 });
/** Trusted bootstrap. The returned administration/store handles must never enter a Worker. */
export async function openHarness(root, options = {}) {
    const host = await openHost(root, options.host);
    const token = Object.freeze({});
    const boot = uid();
    let closed = false;
    const checkAdmin = (value) => invariant(value === token && !closed, 'NATIVE_ADMIN_CAPABILITY_REQUIRED');
    try {
        const state = new NativeState(host.store, host.features, checkAdmin, boot), adminSubject = hostSubject(boot);
        let scheduler;
        const catalog = JSON.parse(await readFile(new URL('../../../config/agentnexus/features.json', import.meta.url), 'utf8'));
        const executing = new Set(['native.harness', 'native.context-assembly', 'native.agent-lifecycle', 'native.agent-type-registry', 'native.agent-loop', 'native.task-scheduler',
            'model.gateway', 'model.mock-provider', 'resource.registry', 'resource.worker.budget', 'resource.project.budget', 'resource.platform.budget']);
        for (const id of [...catalog.m16_implemented_features, ...catalog.m161_implemented_features]) {
            const role = Object.entries(AGENT_TYPES).find(([, value]) => value.feature === id)?.[0];
            const workRole = id.startsWith('wf.role.') ? id.slice(8).toUpperCase() : undefined;
            host.administration.registerModule(id, executing.has(id) || role || workRole ? { stop: async (scope) => { if (scheduler)
                    await scheduler.quiesce(token, scope, role, workRole); } } : {});
        }
        const budgets = new BudgetManager(state);
        const readTask = (actor, taskId) => {
            if (taskId === actor.task_id || taskId === 'project-rules')
                return true;
            const agent = state.get('AGENT', actor.agent_id);
            return !!agent && agent.subject.project_id === actor.project_id && agent.subject.runtime_instance_id === actor.runtime_instance_id && agent.read_tasks.includes(taskId);
        };
        const context = new ContextAssembly(state, { readTask }), agents = new AgentRuntime(state, context, budgets), workflow = new WorkflowRuntime(state);
        const rules = new RulesCompiler(state), gates = new NativeGateEngine(state, rules), storage = new StorageOwner(state, context, options.storage);
        host.administration.registerTool(storage.tool(token, id => agents.current(agents.get(id).subject).subject));
        const ensurePlatform = async () => { if (!state.get('resource_budget', 'platform'))
            await budgets.configure(token, adminSubject, { id: 'platform', scope: 'PLATFORM', owner_id: 'platform', limits: options.platform_limits ?? DEFAULT_LIMITS }); };
        if (['resource.registry', 'resource.worker.budget', 'resource.project.budget', 'resource.platform.budget'].every(id => state.enabled(id, adminSubject)))
            await ensurePlatform();
        const modelBudget = {
            reserve: async (actor, demand) => {
                agents.current(actor);
                const project = state.get('PROJECT', actor.project_id);
                invariant(project, 'PROJECT_UNKNOWN');
                const id = uid();
                const reservation = await budgets.reserve(token, actor, { id, worker_budget_id: actor.resource_budget_id, project_budget_id: project.budget_id, platform_budget_id: 'platform',
                    amounts: { model_tokens: demand.input_tokens + demand.output_tokens, model_requests: 1, model_cost_micros: demand.estimated_cost_micros }, mode: 'SIMULATED', operation_id: demand.request_id, wait: false, expires_at: Date.now() + 30000 });
                invariant(reservation.state === 'RESERVED', 'MODEL_BUDGET_EXHAUSTED');
                await budgets.start(token, actor, id);
                return id;
            },
            settle: async (actor, id, usage) => {
                const reservation = budgets.inspect(token, actor, id);
                const dispatched = state.get('MODEL_REQUEST', usage.request_id)?.state === 'SENT';
                await budgets.account(token, actor, id, { sequence: reservation.sequence + 1, source: 'SIMULATED', values: { model_tokens: usage.input_tokens + usage.output_tokens, model_requests: dispatched ? 1 : 0, model_cost_micros: usage.cost_micros }, complete: true, evidence_hash: sha256(canonical(usage)) });
                const closure = await budgets.issueClosure(token, actor, id, 'SIMULATED_SETTLED');
                await budgets.release(token, actor, id, closure);
            },
            retain: async (actor, id, reason) => { const reservation = budgets.inspect(token, actor, id); if (reservation.state !== 'RELEASED')
                await budgets.unknown(token, actor, id, reason); },
        };
        const defaultRoutes = Object.fromEntries(Object.keys(AGENT_TYPES).map(type => [type, ['mock-main']]));
        const runtimePort = options.modelRuntimeFactory?.({ state, admin: token, context, authorizeSubject: s => { agents.current(s); } });
        const models = new ModelGateway(state, { budget: modelBudget, routes: options.routes ?? { mock: defaultRoutes }, mocks: options.mocks ?? { 'mock-main': [] } }, options.simulatedResponder, runtimePort);
        const definitions = options.models ?? [{ model_id: 'mock-main', provider_id: 'mock-provider', max_input_tokens: 65536, max_output_tokens: 4096, input_cost_micros_per_token: 1, output_cost_micros_per_token: 1 }];
        for (const provider of new Set(definitions.map(d => d.provider_id)))
            if (!state.get('MODEL_PROVIDER', provider)) {
                await models.registerProvider(token, { provider_id: provider, kind: 'MOCK' });
                await models.registerKey(token, { key_id: provider + '.mock-key', provider_id: provider, credential_handle: 'vault:mock:' + provider + ':handle', maxConcurrency: 4 });
            }
        for (const definition of definitions)
            if (!state.get('MODEL_MODEL', definition.model_id))
                await models.registerModel(token, definition);
        const sessions = new Map();
        const tools = new NativeToolRuntime(state, agents, host.gateway, (actor, request, signal) => {
            const session = sessions.get(actor.agent_id);
            invariant(session && session.identity.session_id === actor.session_id, 'AGENT_TOOL_SESSION_UNBOUND');
            return session.request(request, signal);
        });
        scheduler = new TaskScheduler({ state, agents, context, budgets, models, tools, workflow, rules, storage, gates, platform_budget_id: 'platform', maxConcurrent: options.maxConcurrent, model_output_tokens: options.modelOutputTokens, model_context_bytes: options.modelContextBytes, history_window: options.historyWindow,
            prepareResources: ensurePlatform,
            approve: (hash, actor, reason) => host.administration.approve(hash, identityOf(actor), reason), deliver: async (actor, target, payload, taskId) => {
                await messages.bind(actor).send({ receiver_agent_id: target, message_type: actor.agent_type === 'BACKGROUND_REVIEWER' ? 'REVIEW_COMPLETED' : 'RESULT', payload, dedup_key: 'completion.' + taskId });
            } });
        const tasks = scheduler;
        const development = new DevelopmentAdmission(state, context);
        const events = new ResidentEventLoop(state, {
            inspectTask: id => state.get('TASK', id),
            dispatch: id => administration.dispatch(id),
            resume: id => tasks.resume(token, id),
        }, options.eventLoop);
        const messages = new MessageBus(state, {
            auditMessage: message => options.host?.adaptiveSecurity?.record('MESSAGE', { message_id: message.message_id, agent_id: message.sender.agent_id, project_id: message.project_id }),
            resolve: (id, project) => { const agent = state.get('AGENT', id); return agent && agent.subject.project_id === project && !['STOPPED', 'FAILED', 'UNKNOWN_QUARANTINED'].includes(agent.lifecycle) ? agent.subject : null; },
            authorize: (sender, receiver, messageType) => {
                if (sender.project_id !== receiver.project_id || messageType === 'COORDINATOR_NOTICE') {
                    try {
                        const record = agents.get(sender.agent_id);
                        agents.current(receiver);
                        return messageType === 'COORDINATOR_NOTICE' && sender.agent_type === 'COORDINATOR' && record.subject.agent_type === 'COORDINATOR' &&
                            record.subject.project_id === sender.project_id && record.subject.task_id === sender.task_id && (record.read_projects ?? []).includes(receiver.project_id) && state.get('PROJECT', sender.project_id)?.state === 'ACTIVE';
                    }
                    catch {
                        return false;
                    }
                }
                try {
                    const record = agents.get(sender.agent_id);
                    agents.current(receiver);
                    return state.get('PROJECT', sender.project_id)?.state === 'ACTIVE' && record.subject.project_id === sender.project_id && record.subject.task_id === sender.task_id && readTask(receiver, sender.task_id);
                }
                catch {
                    return false;
                }
            }, readTask, onDeliverable: async (receiver, messageId) => {
                if (options.eventLoop) {
                    const message = state.get('MESSAGE', messageId);
                    invariant(message, 'MESSAGE_UNKNOWN');
                    await events.enqueue(token, { kind: 'MESSAGE_DELIVERABLE', target: receiver, message_id: messageId, dedup_key: 'message.' + messageId, payload_sha256: sha256(canonical(message.payload)) });
                }
                else
                    await tasks.wake(token, receiver);
                await options.onDeliverable?.(receiver, messageId);
            },
        });
        await budgets.recover(token, adminSubject);
        await storage.recover(token);
        await models.recover(token);
        await agents.recover(token);
        await tasks.recover(token);
        await gates.recover(token, adminSubject);
        await messages.recover(token);
        await state.change(adminSubject, 'HARNESS_BOOTED', () => { }, { model_configuration_sha256: sha256(canonical({ mocks: options.mocks ?? {}, routes: options.routes ?? {}, model_output_tokens: options.modelOutputTokens ?? 1024, model_context_bytes: options.modelContextBytes ?? 32768, simulated_responder: options.simulatedResponder ? { id: options.simulatedResponder.id, version: options.simulatedResponder.version, source_sha256: options.simulatedResponder.source_sha256 } : null })), model_port: runtimePort ? 'HOST_PROVIDED_PER_REQUEST_CONFIGURATION' : 'LEGACY_MOCK', assurance: runtimePort ? 'HOST_MODEL_PORT_LOCAL_RUNTIME' : 'SIMULATED_PROVIDER_LOCAL_RUNTIME', production: 'BLOCKED' });
        async function captureDraft(actor, captureActor, kind, draftId, inputHash, bytes, maxBytes) {
            const owner = uid();
            const phase = kind === 'MESSAGE_TEXT' ? 'MESSAGE_TEXT' : 'MESSAGE_COORDINATOR_TEXT';
            const draft = await state.change(actor, phase + '_ADMITTED', () => {
                const old = state.get(kind, draftId);
                if (old) {
                    invariant(old.input_hash === inputHash, 'MESSAGE_DEDUP_CONFLICT');
                    if (old.source)
                        return old;
                    invariant(old.boot_id !== boot || old.retryable, 'MESSAGE_CAPTURE_INFLIGHT');
                    const next = { ...old, revision: old.revision + 1, owner, boot_id: boot, retryable: false };
                    state.update(kind, draftId, old.revision, 'RESERVING', next);
                    return next;
                }
                invariant(state.count(kind) < 4096, 'MESSAGE_CAPACITY');
                const next = { revision: 0, input_hash: inputHash, owner, boot_id: boot, retryable: false, source: null };
                state.insert(kind, draftId, actor, 'RESERVING', next);
                return next;
            }, { draft_id: draftId, input_hash: inputHash });
            if (draft.source)
                return draft.source;
            try {
                const captured = await context.capture(captureActor, 'RAW', bytes, { maxBytes });
                return await state.change(actor, phase + '_CAPTURED', () => {
                    const current = state.get(kind, draftId);
                    invariant(current.owner === owner && current.boot_id === boot && !current.source, 'MESSAGE_CAPTURE_CONFLICT');
                    state.update(kind, draftId, current.revision, 'CAPTURED', { ...current, revision: current.revision + 1, source: captured, retryable: false });
                    return captured;
                });
            }
            catch (error) {
                // Only an immutable internal capture was attempted. No message or external effect has been published.
                if (!state.faulted)
                    await state.change(actor, phase + '_CAPTURE_RETRYABLE', () => { const current = state.get(kind, draftId); if (current?.owner === owner && !current.source)
                        state.update(kind, draftId, current.revision, 'RETRYABLE', { ...current, revision: current.revision + 1, retryable: true }); }, { draft_id: draftId, message_published: false }).catch(() => { });
                throw error;
            }
        }
        async function createProject(input) {
            checkAdmin(token);
            const p = snapshot(input);
            identifier(p.id);
            invariant(p.id.length <= 96 && p.rules.length >= 1 && p.rules.length <= 8, 'PROJECT_RULES_LIMIT');
            invariant(!state.get('PROJECT', p.id) && state.count('PROJECT') < 32, 'PROJECT_REGISTRY_LIMIT');
            const actor = { ...adminSubject, project_id: p.id, task_id: 'project-rules', policy_scope: p.id };
            state.require('wf.rules.registration', actor);
            const refs = [];
            for (const rule of p.rules) {
                invariant(typeof rule === 'string' && Buffer.byteLength(rule) > 0 && Buffer.byteLength(rule) <= 16384, 'PROJECT_RULES_LIMIT');
                refs.push(await context.capture(actor, 'RAW', Buffer.from(rule), { maxBytes: 16384 }));
            }
            const globalRefs = [];
            invariant((p.global_rules?.length ?? 0) <= 8, 'PROJECT_RULES_LIMIT');
            for (const rule of p.global_rules ?? []) {
                state.require('wf.rules.global', actor);
                invariant(typeof rule === 'string' && Buffer.byteLength(rule) > 0 && Buffer.byteLength(rule) <= 16384, 'PROJECT_RULES_LIMIT');
                globalRefs.push(await context.capture(actor, 'RAW', Buffer.from(rule), { maxBytes: 16384 }));
            }
            const budgetId = 'project.' + p.id;
            await budgets.configure(token, actor, { id: budgetId, scope: 'PROJECT', owner_id: p.id, limits: p.budget ?? DEFAULT_LIMITS });
            const project = { id: p.id, revision: 0, state: 'ACTIVE', budget_id: budgetId, rules: refs, global_rules: globalRefs };
            await state.change(actor, 'PROJECT_CREATED', () => { state.require('wf.rules.registration', actor); invariant(state.count('PROJECT') < 32, 'PROJECT_REGISTRY_LIMIT'); state.insert('PROJECT', p.id, actor, project.state, project); });
            await rules.compile(token, actor, { version: '1', workflow_version: '1.6.1', sources: [...globalRefs.map((source, i) => ({ id: 'global.' + i, format: 'TEXT', payload_ref: source.payload_ref, context_source: source })), ...refs.map((source, i) => ({ id: 'project.' + i, format: 'TEXT', payload_ref: source.payload_ref, context_source: source }))] });
            return snapshot(project);
        }
        async function setProjectState(id, status) {
            checkAdmin(token);
            invariant(['ACTIVE', 'PAUSED', 'CLOSED'].includes(status), 'PROJECT_STATE');
            const project = state.get('PROJECT', id);
            invariant(project, 'PROJECT_UNKNOWN');
            invariant(['ACTIVE', 'PAUSED'].includes(project.state), 'PROJECT_STATE_TRANSITION_PENDING');
            if (status !== 'ACTIVE') {
                await state.change({ ...adminSubject, project_id: id }, 'PROJECT_ADMISSION_CLOSED', () => {
                    const current = state.get('PROJECT', id);
                    invariant(current.state !== 'CLOSED', 'PROJECT_CLOSED');
                    const pending = status === 'CLOSED' ? 'CLOSING' : 'PAUSING';
                    state.update('PROJECT', id, current.revision, pending, { ...current, state: pending, revision: current.revision + 1 });
                });
                await tasks.quiesce(token, { project_id: id });
            }
            await state.change({ ...adminSubject, project_id: id }, 'PROJECT_STATE', () => { const current = state.get('PROJECT', id); invariant(current.state !== 'CLOSED', 'PROJECT_CLOSED'); state.update('PROJECT', id, current.revision, status, { ...current, state: status, revision: current.revision + 1 }); });
            let after;
            for (;;) {
                const page = state.list('AGENT', { project_id: id, ...(after ? { after } : {}), limit: 32 });
                if (!page.length)
                    break;
                for (const agent of page) {
                    if (status === 'CLOSED' && !['STOPPED', 'FAILED', 'UNKNOWN_QUARANTINED'].includes(agent.lifecycle)) {
                        await agents.transition(token, agent.id, 'STOPPING', 'PROJECT_CLOSED');
                        await agents.transition(token, agent.id, 'STOPPED');
                        continue;
                    }
                    if (agent.subject.agent_type !== 'RESIDENT')
                        continue;
                    if (status === 'PAUSED' && agent.lifecycle === 'READY')
                        await agents.transition(token, agent.id, 'WAITING', 'PROJECT_PAUSED');
                    if (status === 'ACTIVE' && agent.lifecycle === 'WAITING') {
                        await agents.transition(token, agent.id, 'RESUMING');
                        await agents.transition(token, agent.id, 'READY');
                    }
                }
                after = page.at(-1).id;
            }
        }
        async function updateProjectRules(projectId, input) {
            checkAdmin(token);
            const project = state.get('PROJECT', projectId);
            invariant(project && project.state !== 'CLOSED', 'PROJECT_UNKNOWN');
            const p = snapshot(input), actor = { ...adminSubject, project_id: projectId, task_id: 'project-rules', policy_scope: projectId };
            invariant(p.rules.length > 0 && p.rules.length + (p.global_rules?.length ?? 0) + (p.dsl?.length ?? 0) <= 16, 'PROJECT_RULES_LIMIT');
            const sources = [], local = [], global = [];
            for (const [prefix, entries] of [['project', p.rules], ['global', p.global_rules ?? []], ['dsl', p.dsl ?? []]]) {
                for (let i = 0; i < entries.length; i++) {
                    const text = entries[i];
                    invariant(typeof text === 'string' && Buffer.byteLength(text) > 0 && Buffer.byteLength(text) <= 65536, 'PROJECT_RULES_LIMIT');
                    const source = await context.capture(actor, 'RAW', Buffer.from(text), { maxBytes: 65536 });
                    sources.push({ id: prefix + '.' + i, format: prefix === 'dsl' ? 'RULE_DSL' : 'TEXT', payload_ref: source.payload_ref, context_source: source });
                    if (prefix === 'project')
                        local.push(source);
                    if (prefix === 'global')
                        global.push(source);
                }
            }
            const registry = await rules.compile(token, actor, { version: p.version, workflow_version: p.workflow_version ?? '1.6.1', sources });
            await state.change(actor, 'PROJECT_RULES_UPDATED', () => { const current = state.get('PROJECT', projectId); state.update('PROJECT', projectId, current.revision, current.state, { ...current, rules: local, global_rules: global, revision: current.revision + 1 }); }, { registry_id: registry.id, rule_hash: registry.rule_hash });
            return registry;
        }
        const administration = Object.freeze({
            createProject, setProjectState, updateProjectRules, createAgent: (input) => agents.create(token, input), createTask: (input) => tasks.create(token, input),
            enqueueEvent: (input) => events.enqueue(token, input), startEvents: () => events.start(token), stopEvents: () => events.stop(token),
            idleEvents: () => events.idle(token), recoverEvents: () => events.recover(token), eventStatus: () => events.status(token), listEvents: () => events.list(token),
            admitDevelopmentPlan: (actorId, source, requirements, envelope) => development.admit(token, agents.get(actorId).subject, source, requirements, envelope),
            // Trusted fixed Host checker only. This closure is never placed on an Agent facade or in a model context.
            runPilotQualityCheck: async (actorId, run) => {
                checkAdmin(token);
                const actor = agents.current(agents.get(actorId).subject).subject, project = state.get('PROJECT', actor.project_id);
                const id = 'quality.' + uid(), started = Date.now();
                const reservation = await budgets.reserve(token, actor, { id, worker_budget_id: actor.resource_budget_id, project_budget_id: project.budget_id, platform_budget_id: 'platform',
                    amounts: { workers: 1, memory_bytes: 67108864, processes: 1, wall_ms: 180000 }, mode: 'SIMULATED', operation_id: id, wait: false, expires_at: Date.now() + 180000 });
                invariant(reservation.state === 'RESERVED', 'PILOT_CHECK_BUDGET_EXHAUSTED');
                await budgets.start(token, actor, id);
                await state.change(actor, 'PILOT_QUALITY_CHECK_STARTED', () => state.insert('PILOT_QUALITY_CHECK', id, actor, 'RUNNING', { id, revision: 0, reservation_id: id, state: 'RUNNING', started_at: started }), { reservation_id: id, os_hard_budget: false });
                try {
                    const report = await run(), commands = [...report.syntax.commands, ...report.types.commands, ...report.tests.commands];
                    const noInvocation = report.execution_started === false && commands.length === 0 && report.status === 'BLOCKED';
                    const completedInvocation = report.execution_started === true && commands.length > 0 && report.status !== 'INCONCLUSIVE' && commands.every(command => command.close_observed);
                    if (!noInvocation && !completedInvocation)
                        await budgets.unknown(token, actor, id, 'FIXED_CHECKER_EXIT_OR_RESULT_NOT_CONFIRMED');
                    else {
                        const held = budgets.inspect(token, actor, id);
                        await budgets.account(token, actor, id, { sequence: held.sequence + 1, source: 'SIMULATED', values: { wall_ms: Date.now() - started }, complete: true, evidence_hash: sha256(canonical({ candidate_hash: report.candidate_hash, status: report.status, commands: commands.map(command => ({ id: command.id, close: command.close_observed, stdout: command.stdout_sha256, stderr: command.stderr_sha256 })) })) });
                        const closure = await budgets.issueClosure(token, actor, id, 'SIMULATED_SETTLED');
                        await budgets.release(token, actor, id, closure);
                    }
                    const budgetState = budgets.inspect(token, actor, id).state;
                    await state.change(actor, 'PILOT_QUALITY_CHECK_SETTLED', () => state.update('PILOT_QUALITY_CHECK', id, 0, report.status, { id, revision: 1, reservation_id: id, state: report.status, budget_state: budgetState, candidate_hash: report.candidate_hash, ended_at: Date.now(), evidence_directory: report.evidence_directory }), { reservation_id: id, status: report.status, known_not_invoked: noInvocation, processes_observed_closed: completedInvocation, budget_state: budgetState, os_tree_qualification: false });
                    return report;
                }
                catch (error) {
                    await budgets.unknown(token, actor, id, 'FIXED_CHECKER_RESULT_UNKNOWN').catch(() => { });
                    throw error;
                }
            },
            dispatch: async (id) => {
                const task = tasks.get(id), actor = agents.get(task.subject.agent_id).subject;
                invariant(!sessions.has(actor.agent_id), 'TASK_ALREADY_DISPATCHED');
                invariant(['QUEUED', 'WAITING_RESOURCES'].includes(task.state), 'TASK_DISPATCH_STATE');
                const session = host.bindAgent(identityOf(actor));
                sessions.set(actor.agent_id, session);
                try {
                    const inbox = await messages.bind(actor).receive({ limit: 16 });
                    for (const message of inbox)
                        await messages.handoff(token, actor, message.message_id, message.lease_token, m => tasks.acceptMessageInTransaction(token, actor, m));
                    const result = await tasks.dispatch(token, id);
                    await messages.reconcileTask(token, agents.get(actor.agent_id).subject, id);
                    return result;
                }
                finally {
                    sessions.delete(actor.agent_id);
                    await session.close();
                }
            },
            resumeTask: (id) => tasks.resume(token, id), cancelTask: (id) => tasks.stop(token, id, 'CANCELLED'), pauseTask: (id) => tasks.stop(token, id, 'PAUSED'),
            handoffTask: (id, targetAgentId) => tasks.handoff(token, id, targetAgentId), tick: () => tasks.expire(token),
            approveTaskTool: (id, reason) => tasks.approveTool(token, id, reason),
            requestStorageWrite: (id, input) => tasks.requestStorageWrite(token, id, input),
            compileRules: async (actorId, input) => {
                checkAdmin(token);
                const actor = agents.get(actorId).subject, p = snapshot(input);
                const sources = [];
                for (const source of p.sources) {
                    if (source.context_source)
                        sources.push(source);
                    else {
                        const owner = { ...adminSubject, project_id: actor.project_id, task_id: 'project-rules', policy_scope: actor.project_id };
                        const captured = await context.capture(owner, 'RAW', host.store.artifacts.read(source.payload_ref), { maxBytes: 65536 });
                        sources.push({ ...source, payload_ref: captured.payload_ref, context_source: captured });
                    }
                }
                return rules.compile(token, actor, { ...p, sources });
            },
            currentRules: (projectId) => rules.current(projectId),
            migrateTaskRules: (id, reason, authorization) => tasks.migrateRules(token, id, reason, authorization),
            bindTaskGate: (id, gateId, recordId) => tasks.bindGate(token, id, gateId, recordId),
            nativeGate: (actorId, input) => gates.evaluate(token, agents.get(actorId).subject, input),
            registerGateChecker: (definition) => gates.registerChecker(token, definition),
            recordGateReview: (actorId, input) => gates.recordHumanReview(token, agents.get(actorId).subject, input),
            registerStorageResource: (actorId, input) => storage.register(token, agents.get(actorId).subject, input),
            inspectStorage: (operationId) => storage.inspect(token, operationId),
            storageVersion: (resourceId, path) => storage.version(token, resourceId, path),
            reconcileStorage: (operationId) => storage.reconcile(token, operationId),
            captureStorageSource: (actorId, bytes, maxBytes = 64 * 1024 * 1024) => context.capture(agents.get(actorId).subject, 'RAW', bytes, { maxBytes }),
            gate: (actorId, input) => workflow.gate(token, agents.get(actorId).subject, input),
            checkpoint: (actorId, input) => workflow.checkpoint(token, agents.get(actorId).subject, input),
            checklist: (actorId, input) => workflow.checklist(token, agents.get(actorId).subject, input),
            captureContext: (actorId, text) => { const actor = agents.get(actorId).subject; agents.current(actor); invariant(typeof text === 'string' && Buffer.byteLength(text) <= 65536, 'TASK_CAPTURE_LIMIT'); return context.capture(actor, 'RAW', Buffer.from(text), { maxBytes: 65536 }); },
            decision: (actorId, value, status) => workflow.decision(token, agents.get(actorId).subject, value, status),
            transitionAgent: (id, next) => agents.transition(token, id, next),
            features: host.administration, registerTool: host.administration.registerTool,
            registerModelProvider: (input) => models.registerProvider(token, input),
            registerModel: (input) => models.registerModel(token, input), registerModelKey: (input) => models.registerKey(token, input),
            setModelKeyState: (id, status) => models.setKeyState(token, id, status),
        });
        return Object.freeze({ administration,
            bindAgent: (id) => {
                const actor = agents.get(id).subject;
                agents.current(actor);
                const bound = messages.bind(actor);
                const live = () => { invariant(!closed, 'HARNESS_CLOSED'); agents.current(actor); };
                return Object.freeze({ identity: snapshot(actor), status: () => { live(); return agents.get(id); },
                    notifyProject: async (input) => {
                        live();
                        const p = snapshot(input);
                        invariant(Object.keys(p).sort().join(',') === 'dedup_key,project_id,receiver_agent_id,text', 'COORDINATOR_NOTICE_SCHEMA');
                        identifier(p.project_id);
                        identifier(p.receiver_agent_id);
                        identifier(p.dedup_key);
                        invariant(actor.agent_type === 'COORDINATOR' && (agents.get(id).read_projects ?? []).includes(p.project_id), 'COORDINATOR_NOTICE_SCOPE');
                        invariant(typeof p.text === 'string' && Buffer.byteLength(p.text) > 0 && Buffer.byteLength(p.text) <= 4096, 'COORDINATOR_NOTICE_LIMIT');
                        const receiver = agents.get(p.receiver_agent_id);
                        invariant(receiver.subject.project_id === p.project_id, 'COORDINATOR_NOTICE_SCOPE');
                        agents.current(receiver.subject);
                        const owner = { ...adminSubject, project_id: receiver.subject.project_id, task_id: receiver.subject.task_id, policy_scope: receiver.subject.project_id };
                        const content = Buffer.from(canonical({ schema: 'agentnexus/coordinator-notice/1', origin: { agent_id: actor.agent_id, project_id: actor.project_id, task_id: actor.task_id }, text: p.text }));
                        const draftId = sha256(canonical({ agent_id: actor.agent_id, project_id: actor.project_id, task_id: actor.task_id, receiver_agent_id: p.receiver_agent_id, receiver_task_id: receiver.subject.task_id, target_project: p.project_id, dedup_key: p.dedup_key }));
                        const payload = await captureDraft(actor, owner, 'COORDINATOR_TEXT', draftId, sha256(canonical(p)), content, 8192);
                        live();
                        return messages.enqueueCoordinatorNotice(token, actor, receiver.subject, payload, p.dedup_key);
                    },
                    projectStates: () => {
                        live();
                        const agent = agents.get(id);
                        invariant(actor.agent_type === 'COORDINATOR', 'COORDINATOR_STATUS_SCOPE');
                        return (agent.read_projects ?? []).map(projectId => {
                            const project = state.get('PROJECT', projectId);
                            invariant(project, 'PROJECT_UNKNOWN');
                            const budget = state.get('resource_budget', project.budget_id);
                            return snapshot({ project_id: projectId, state: project.state, queued_tasks: state.count('TASK', { project_id: projectId, state: 'QUEUED' }), unknown_tasks: state.count('TASK', { project_id: projectId, state: 'UNKNOWN_QUARANTINED' }), held_workers: budget?.held.workers ?? 0, held_disk_bytes: budget?.held.disk_bytes ?? 0 });
                        });
                    },
                    sendText: async (input) => {
                        live();
                        const value = snapshot(input);
                        invariant(Object.keys(value).sort().join(',') === 'dedup_key,message_type,receiver_agent_id,text', 'MESSAGE_SCHEMA');
                        invariant(typeof value.text === 'string' && Buffer.byteLength(value.text) <= 16384, 'MESSAGE_PAYLOAD_LIMIT');
                        identifier(value.dedup_key);
                        identifier(value.message_type);
                        identifier(value.receiver_agent_id);
                        const receiver = state.get('AGENT', value.receiver_agent_id);
                        invariant(receiver && receiver.subject.project_id === actor.project_id, 'MESSAGE_PROJECT_DENIED');
                        agents.current(receiver.subject);
                        invariant(readTask(receiver.subject, actor.task_id), 'MESSAGE_PERMISSION_DENIED');
                        const draftId = sha256(canonical({ agent_id: actor.agent_id, project_id: actor.project_id, task_id: actor.task_id, dedup_key: value.dedup_key }));
                        const source = await captureDraft(actor, actor, 'MESSAGE_TEXT', draftId, sha256(canonical(value)), Buffer.from(value.text), 16384);
                        live();
                        return bound.send({ receiver_agent_id: value.receiver_agent_id, message_type: value.message_type, payload: source, dedup_key: value.dedup_key });
                    }, receive: bound.receive, ack: bound.ack, retry: bound.retry, revoke: bound.revoke,
                    source: (eventId) => { live(); return context.source(actor, eventId); }, readContext: (source) => { live(); return context.readRange(actor, source); },
                });
            },
            inspectAgent: (id) => agents.get(id), inspectTask: (id) => tasks.get(id),
            qualification: Object.freeze({ runtime: 'LOCAL_TRUSTED_LIBRARY', provider: runtimePort ? 'HOST_PORT_CONFIGURED_PER_RESULT_ASSURANCE' : 'SIMULATED', windows_production: 'BLOCKED', strict_cpu: 'BLOCKED', ubuntu: 'NOT_RUN' }),
            // Trusted test/administration inspection, never passed to any Agent or model.
            store: host.store, state, budgets, models, workflow, rules, gates, storage, context, messages,
            close: async () => { if (closed)
                return; await events.stop(token); invariant(storage.activeCount() === 0, 'STORAGE_OPERATIONS_ACTIVE'); await tasks.close(); closed = true; await host.close(); }, });
    }
    catch (error) {
        await host.close().catch(() => { });
        throw error;
    }
}
