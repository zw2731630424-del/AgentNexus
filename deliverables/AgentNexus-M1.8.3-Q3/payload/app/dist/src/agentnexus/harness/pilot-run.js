import { mkdir, readFile, writeFile, readdir, lstat, copyFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, dirname, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { openHarness } from './index.js';
import { canonical, invariant, sha256 } from '../types.js';
import { PILOT_REQUIREMENTS, PILOT_FILES, ROLE_PATHS, ANALYTICS_FIXED, pilotResponder } from './pilot-fixtures.js';
import { runPilotChecks } from './pilot-checker.js';
const LIMITS = { workers: 4, memory_bytes: 268435456, processes: 8, disk_bytes: 67108864, model_tokens: 2000000, model_requests: 1000, model_cost_micros: 10000000, wall_ms: 10000000 };
const WORKER = { ...LIMITS, workers: 1, memory_bytes: 67108864, processes: 1, model_requests: 128 };
const AUX = ['debug', 'review-before', 'review-final', 'resident', 'coordinator', 'test-runner', 'delivery'];
const RESOURCE_ROLES = ['code-model', 'code-analytics', 'code-cli', 'test', 'docs', 'delivery'];
async function jsonFile(path, value) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); }
async function fileHash(path) { const h = createHash('sha256'); for await (const block of createReadStream(path))
    h.update(block); return h.digest('hex'); }
async function freezeEngine(output) {
    const source = fileURLToPath(new URL('../../../', import.meta.url)), files = [];
    async function visit(path) {
        const stat = await lstat(path);
        invariant(!stat.isSymbolicLink(), 'PILOT_ENGINE_SOURCE_LINK');
        if (stat.isDirectory()) {
            for (const name of (await readdir(path)).sort())
                if (!['node_modules', '__pycache__'].includes(name))
                    await visit(join(path, name));
        }
        else {
            invariant(stat.isFile(), 'PILOT_ENGINE_SOURCE_FILE');
            const rel = relative(source, path).replaceAll('\\', '/'), hash = await fileHash(path), target = join(output, 'engine-source', rel);
            await mkdir(dirname(target), { recursive: true });
            await copyFile(path, target);
            invariant(hash === await fileHash(path) && hash === await fileHash(target), 'PILOT_ENGINE_CHANGED_DURING_FREEZE');
            files.push({ path: rel, bytes: stat.size, sha256: hash });
        }
    }
    for (const name of ['src', 'tests', 'tools', 'config', 'package.json', 'package-lock.json', 'tsconfig.json'])
        await visit(join(source, name));
    files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    const set = sha256(files.map(file => file.path + '\0' + file.sha256 + '\n').join(''));
    await jsonFile(join(output, 'source-manifest.json'), { schema: 'agentnexus/m17/source/1', files, set_sha256: set });
    return set;
}
function goal(value) { return canonical(value); }
function contract(h, id) { return JSON.parse(h.inspectTask(id).goal); }
function latest(h, id) { const task = h.inspectTask(id); return h.state.get('MODEL_REQUEST', id + '.turn.' + task.turns)?.result?.reply; }
function ref(input) { return { source: input, section: 'FILE_CONTENT', required: true }; }
/** Host integration driver: models propose, validated Host owners execute; no direct Pilot code writes occur here. */
export async function runPilot(outputRoot, options) {
    invariant(/^[a-f0-9]{40,64}$/.test(options.baseline_commit), 'PILOT_BASELINE_COMMIT');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid, root = join(resolve(outputRoot), stamp), projectRoot = join(root, 'AgentNexus-Pilot-Project');
    await mkdir(root, { recursive: true });
    const sourceSet = await freezeEngine(root), startedAt = new Date().toISOString(), fixtureHash = await fileHash(fileURLToPath(new URL('./pilot-fixtures.ts', import.meta.url)));
    const planIds = ['research', 'architecture', 'code-model', 'code-analytics', 'code-cli', 'test', 'docs', 'integration'], allIds = ['lead', ...planIds, ...AUX];
    const routes = { lead: { DEVELOPMENT: ['pilot-design'] }, cheap: { SUBAGENT: ['pilot-small'], RESIDENT: ['pilot-small'], COORDINATOR: ['pilot-small'] }, design: { SUBAGENT: ['pilot-design'] }, reasoning: { SUBAGENT: ['pilot-review'] }, review: { BACKGROUND_REVIEWER: ['pilot-review'] }, delivery: { DEVELOPMENT: ['pilot-design'] } };
    const definitions = ['pilot-small', 'pilot-design', 'pilot-review'].map(model_id => ({ model_id, provider_id: 'pilot-mock', max_input_tokens: 65536, max_output_tokens: 4096, input_cost_micros_per_token: 0, output_cost_micros_per_token: 0 }));
    const harnessOptions = { platform_limits: LIMITS, maxConcurrent: 3, eventLoop: { maxConcurrent: 3 }, modelOutputTokens: 4096, modelContextBytes: 65536, historyWindow: true, routes, models: definitions, mocks: {}, simulatedResponder: pilotResponder(fixtureHash) };
    let h = await openHarness(join(root, 'host'), harnessOptions);
    const report = { schema: 'agentnexus/m17/pilot-run/1', status: 'FAIL', model_autonomy: 'SIMULATED', real_provider: 'SIMULATED', production_os: 'BLOCKED', strict_cpu: 'BLOCKED', root, project_root: projectRoot, source_set_sha256: sourceSet,
        started_at: startedAt, ended_at: '', error: null, plan_id: null, candidate_sha256: null, initial_checks: 'NOT_RUN', final_checks: 'NOT_RUN', gate_records: [], pre_repair_gates: [], role_tasks: [], concurrency: { coding_peak: 0, event_peak: 0, coding_intervals: [] }, recovery: null, resources: null, provenance: null,
        limitations: ['Code-generation strategies are explicit Codex-authored simulation fixtures; general model autonomy is not PASS.', 'Fixed Host runner executes only allowlisted immutable fixture bytes; arbitrary Agent PROCESS/EXTERNAL_EFFECT stays BLOCKED.',
            'Logical budgets and observed process closure do not qualify strict cumulative CPU or hostile-process OS isolation.', 'Multi-file delivery is individually published and revalidated; no multi-file atomic transaction is claimed.', 'OS reboot, hard power loss and real Provider integration are NOT_RUN/SIMULATED.'] };
    const resourceRoots = new Map(), completedControls = new Map(), checks = [], allowedHashes = new Set([...Object.values(PILOT_FILES), ANALYTICS_FIXED].map(sha256));
    const parallelWaiters = new Map();
    const checkEvidence = new WeakMap();
    let requirements, baseline, writeProfile;
    try {
        const meta = h.administration.features.metadata(), on = await h.administration.features.previewFeatures([{ id: 'runtime.role.coordinator', scope: {}, state: 'ON' }], meta.feature_revision);
        await h.administration.features.commitFeatures(on.challenge_id, on.preview_hash);
        await h.administration.createProject({ id: 'pilot', rules: ['Pilot scope only. Preserve original inputs, versions, messages and audit. Models propose; trusted owners approve exact paths. Reviewer, Resident and Coordinator cannot write code.'], global_rules: ['PROCESS and EXTERNAL_EFFECT remain blocked. No credentials, network Provider, commit, push, hooks or OS policy changes.'], budget: LIMITS });
        await h.administration.createProject({ id: 'other', rules: ['Separate project used only for authorized Coordinator status summaries.'], budget: LIMITS });
        const grants = [{ tool_id: 'native.echo', version: '1', capability: 'PURE', resources: [] }, { tool_id: 'native.pilot.stage', version: '1', capability: 'PURE', resources: [] },
            { tool_id: 'native.storage.write', version: '1', capability: 'LOCAL_WRITE', resources: RESOURCE_ROLES.map(role => 'pilot:' + role) },
            { tool_id: 'native.pilot.parallel-barrier', version: '1', capability: 'PURE', resources: [] }];
        await h.administration.createAgent({ id: 'lead', project_id: 'pilot', task_id: 'lead', type: 'DEVELOPMENT', model_binding: 'lead', budget: WORKER, tools: grants, file_scope: RESOURCE_ROLES.map(role => 'pilot:' + role), read_tasks: allIds.filter(id => id !== 'lead'), work_role: 'WORKER' });
        requirements = await h.administration.captureContext('lead', canonical(PILOT_REQUIREMENTS));
        baseline = await h.store.artifacts.putBytesQueued(Buffer.from(canonical({ m161_source_set_sha256: 'd14401d7c39b069555f43c60360d5aab83e40bb32995008652cfcefb9862e9da', commit: options.baseline_commit, historical_failures_preserved: true })), { maxBytes: 4096 });
        for (const role of RESOURCE_ROLES) {
            const path = role === 'delivery' ? projectRoot : join(root, 'workspaces', role);
            resourceRoots.set('pilot:' + role, path);
            await h.administration.registerStorageResource('lead', { id: 'pilot:' + role, project_id: 'pilot', task_id: null, root: path, quota_bytes: 1048576, max_file_bytes: 65536 });
            for (const folder of ['src', 'tests'])
                await mkdir(join(path, folder), { recursive: true });
        }
        await h.state.change(h.inspectAgent('lead').subject, 'PILOT_WORKSPACES_ADMITTED', () => { }, { resources: [...resourceRoots].map(([id, path]) => ({ id, path_sha256: sha256(path) })), code_files_created: 0, directory_bootstrap_owner: 'TRUSTED_HOST' });
        async function registerExtensions() {
            h.administration.registerTool({ id: 'native.pilot.parallel-barrier', version: '1', feature_id: 'native.harness', capability: 'PURE', policy_ids: [], requires_sandbox: false, timeout_ms: 10000,
                schema: args => invariant(args !== null && typeof args === 'object' && !Array.isArray(args) && Object.keys(args).join(',') === 'lane' && ['code-model', 'code-analytics', 'code-cli'].includes(String(args.lane)), 'PILOT_PARALLEL_LANE'),
                execute: async (args, ctx) => {
                    const lane = args.lane;
                    invariant(ctx.identity.task_id === lane && !parallelWaiters.has(lane), 'PILOT_PARALLEL_IDENTITY');
                    await new Promise((resolveWait, reject) => {
                        const aborted = () => { parallelWaiters.delete(lane); reject(Error('PILOT_PARALLEL_CANCELLED')); };
                        ctx.signal.addEventListener('abort', aborted, { once: true });
                        parallelWaiters.set(lane, { resolve: resolveWait, reject, cleanup: () => ctx.signal.removeEventListener('abort', aborted) });
                        if (parallelWaiters.size === 3) {
                            invariant(['code-model', 'code-analytics', 'code-cli'].every(id => h.inspectTask(id).state === 'RUNNING'), 'PILOT_PARALLEL_NOT_RUNNING');
                            for (const waiter of parallelWaiters.values()) {
                                waiter.cleanup();
                                waiter.resolve();
                            }
                        }
                    });
                    return { data: { three_native_tasks_observed_running: true, synchronization: 'EXPLICIT_BOUNDED_TEST_BARRIER', cpu_parallelism_claimed: false } };
                } });
            h.administration.registerTool({ id: 'native.pilot.stage', version: '1', feature_id: 'native.harness', capability: 'PURE', policy_ids: [], requires_sandbox: false,
                schema: args => { invariant(args !== null && typeof args === 'object' && !Array.isArray(args) && Object.keys(args).sort().join(',') === 'content,path', 'PILOT_STAGE_SCHEMA'); const p = args; invariant(typeof p.path === 'string' && typeof p.content === 'string' && Buffer.byteLength(p.content) <= 16384, 'PILOT_STAGE_LIMIT'); },
                execute: async (args, ctx) => {
                    const p = args, actor = h.inspectAgent(ctx.identity.agent_id).subject, task = h.inspectTask(actor.task_id), scope = contract(h, task.id);
                    invariant(scope.files?.includes(p.path) && scope.pilot_role !== 'integration', 'PILOT_STAGE_SCOPE');
                    const expected = scope.pilot_role === 'debug' ? ANALYTICS_FIXED : PILOT_FILES[p.path];
                    invariant(expected === p.content, 'PILOT_UNAPPROVED_FIXTURE');
                    const source = await h.context.capture(actor, 'RAW', Buffer.from(p.content), { operation_id: ctx.operation_id, maxBytes: 16384, source_refs: [task.history.at(-1)] });
                    if (scope.pilot_role.startsWith('code-') && scope.files?.[0] === p.path)
                        await h.bindAgent(actor.agent_id).sendText({ receiver_agent_id: 'lead', message_type: 'PROGRESS', text: canonical({ pilot_signal: 'PROGRESS', task_id: task.id, path: p.path, stage: 'IMMUTABLE_PROPOSAL_CAPTURED', source }), dedup_key: 'progress.' + task.id });
                    return { data: { schema: 'agentnexus/pilot-staged/1', path: p.path, source } };
                } });
            await h.administration.registerGateChecker({ id: 'pilot-file-input', version: '1.7', gates: ['g1'], kind: 'VALIDATION', assurance: 'LOCAL_TRUSTED_LIBRARY', run: ctx => {
                    const task = h.inspectTask(ctx.task_actor.task_id), scope = contract(h, task.id), request = h.storage.validate(task.pending_tool?.arguments), expected = scope.pilot_role === 'debug' ? ANALYTICS_FIXED : PILOT_FILES[request.path];
                    return { status: request.resource_id === scope.resource_id && scope.files?.includes(request.path) && sha256(expected) === ctx.candidate_ref.sha256 && request.source.payload_ref.sha256 === ctx.candidate_ref.sha256 ? 'PASS' : 'FAIL', reason: 'Exact task output, immutable input, role and resource checked by trusted Host.' };
                } });
            writeProfile = await h.store.artifacts.putBytesQueued(Buffer.from(canonical({ schema: 'agentnexus/gate-profile/1', required_checkers: { g1: ['pilot-file-input'] }, manual_gates: [], qualification: 'LOCAL_TRUSTED_LIBRARY' })), { maxBytes: 4096 });
        }
        await registerExtensions();
        async function createAgent(id, role, resourceRole, type = 'SUBAGENT', strategy) {
            const resource = resourceRole ? 'pilot:' + resourceRole : null, readOnly = ['RESEARCH', 'ARCHITECTURE', 'review', 'resident', 'coordinator', 'test-runner'].includes(role);
            await h.administration.createAgent({ id, project_id: 'pilot', task_id: id, type, ...(type === 'SUBAGENT' ? { parent_id: 'lead' } : {}), model_binding: type === 'BACKGROUND_REVIEWER' ? 'review' : type === 'DEVELOPMENT' ? 'delivery' : strategy === 'REASONING' ? 'reasoning' : strategy === 'DESIGN' || role === 'ARCHITECTURE' ? 'design' : 'cheap', budget: WORKER,
                tools: resource ? [grants[1], { ...grants[2], resources: [resource] }, ...(id.startsWith('code-') ? [grants[3]] : [])] : [grants[0]], file_scope: resource ? [resource] : [], read_tasks: allIds.filter(name => name !== id),
                work_role: readOnly ? 'SCOUT' : 'WORKER', ...(type === 'BACKGROUND_REVIEWER' ? { work_role: 'REVIEWER' } : {}), ...(type === 'COORDINATOR' ? { read_projects: ['pilot', 'other'] } : {}), });
        }
        async function createTask(id, scope, inputs = [], dependencies = [], extra = {}) {
            return h.administration.createTask({ id, agent_id: id, goal: goal(scope), inputs: inputs.map(ref), dependencies, max_turns: 32, wall_ms: 300000, requirements: { disk_bytes: 65536 },
                contract: { acceptance: ['Validate original sources and real files; report simulated model provenance.'], allowed_scope: scope.resource_id ? [scope.resource_id] : [] }, ...extra });
        }
        async function enqueue(id, key, priority = 5) { await h.administration.enqueueEvent({ kind: 'TASK_READY', target: h.inspectAgent(id).subject, dedup_key: key, payload_sha256: h.inspectTask(id).creation_hash, priority }); }
        async function control() {
            for (const id of ['code-cli', 'resident', 'lead']) {
                let task;
                try {
                    task = h.inspectTask(id);
                }
                catch {
                    continue;
                }
                if (task.state !== 'WAITING')
                    continue;
                const reply = latest(h, id);
                if (reply?.kind !== 'WAIT' || !reply.text)
                    continue;
                let proposal;
                try {
                    proposal = JSON.parse(reply.text);
                }
                catch {
                    continue;
                }
                if (!['QUESTION', 'FORWARD_QUESTION', 'ANSWER'].includes(String(proposal.action)))
                    continue;
                const key = id + '.' + String(proposal.action) + '.cli-empty-metrics', proposalHash = sha256(canonical(proposal)), prior = completedControls.get(key);
                if (prior) {
                    invariant(prior === proposalHash, 'PILOT_CONTROL_CORRELATION_CONFLICT');
                    continue;
                }
                const send = async (from, to, type, value, dedup) => h.bindAgent(from).sendText({ receiver_agent_id: to, message_type: type, text: canonical(value), dedup_key: dedup });
                if (proposal.action === 'QUESTION') {
                    invariant(id === 'code-cli' && proposal.receiver === 'resident', 'PILOT_CONTROL_ACTOR');
                    await send(id, 'resident', 'QUESTION', { pilot_signal: 'QUESTION', question: proposal.question, reply_to: 'code-cli' }, 'cli.question');
                }
                else if (proposal.action === 'FORWARD_QUESTION') {
                    invariant(id === 'resident' && proposal.receiver === 'lead' && proposal.reply_to === 'code-cli', 'PILOT_CONTROL_ACTOR');
                    await send(id, 'lead', 'QUESTION', { pilot_signal: 'QUESTION', question: proposal.question, reply_to: 'code-cli' }, 'resident.question');
                }
                else if (proposal.action === 'ANSWER') {
                    invariant(id === 'lead' && proposal.receiver === 'code-cli', 'PILOT_CONTROL_ACTOR');
                    await send(id, 'code-cli', 'ANSWER', { pilot_signal: 'ANSWER', text: proposal.text, requirements_sha256: proposal.requirements_sha256 }, 'cli.answer');
                }
                else
                    continue;
                completedControls.set(key, proposalHash);
                await h.state.change(task.subject, 'PILOT_CONTROL_PROPOSAL_HANDLED', () => { }, { request_id: id + '.turn.' + task.turns, action: String(proposal.action), correlation_id: key, proposal_sha256: proposalHash, source_ref: task.history.at(-1) });
            }
        }
        async function approve(id) {
            const task = h.inspectTask(id), scope = contract(h, id), request = h.storage.validate(task.pending_tool.arguments);
            invariant(scope.resource_id === request.resource_id && scope.files?.includes(request.path), 'PILOT_WRITE_CONTRACT');
            const expected = scope.pilot_role === 'debug' ? ANALYTICS_FIXED : PILOT_FILES[request.path];
            invariant(request.source.payload_ref.sha256 === sha256(expected) && request.source.offset === 0 && request.source.length === Buffer.byteLength(expected), 'PILOT_WRITE_SOURCE_BINDING');
            await h.context.readRange(task.subject, request.source, { maxBytes: 65536 });
            const gate = await h.administration.nativeGate(id, { gate_id: 'g1', binding: task.rules_binding, candidate_ref: request.source.payload_ref, baseline_ref: baseline, test_profile_ref: writeProfile, evidence: [], author_id: id });
            invariant(gate.status === 'PASS' && gate.allows_protected, 'PILOT_WRITE_GATE_BLOCKED');
            if (scope.pilot_role === 'debug') {
                const version = h.administration.storageVersion(request.resource_id, request.path);
                invariant(request.mode === 'REPLACE' && version?.version === request.expected_version && version.file.sha256 === request.expected_sha256, 'PILOT_REPAIR_VERSION_CONFLICT');
            }
            else
                invariant(request.mode === 'CREATE' && request.expected_version === null && request.expected_sha256 === null, 'PILOT_UNEXPECTED_REPLACE');
            await h.administration.approveTaskTool(id, 'Authorized M1.7 Pilot exact file proposal, task output, immutable source and program Gate verified.');
            await h.administration.resumeTask(id);
            await enqueue(id, 'approved.' + id + '.' + task.turns, 8);
        }
        async function drive(ids) {
            const deadline = performance.now() + 180000;
            for (const id of ids)
                if (h.inspectTask(id).state !== 'SUCCEEDED')
                    await enqueue(id, 'ready.' + id, 8);
            for (;;) {
                await h.administration.idleEvents();
                await control();
                let approvals = 0;
                for (const id of ids) {
                    const task = h.inspectTask(id);
                    if (['FAILED', 'UNKNOWN_QUARANTINED', 'CANCELLED', 'TIMED_OUT'].includes(task.state))
                        throw Error(id + ':' + task.state + ':' + task.reason);
                    if (task.state === 'WAITING' && task.reason === 'APPROVAL_REQUIRED') {
                        await approve(id);
                        approvals++;
                    }
                }
                if (ids.every(id => h.inspectTask(id).state === 'SUCCEEDED'))
                    return;
                invariant(performance.now() < deadline, 'PILOT_BOUNDED_DRIVER_DEADLINE');
                if (!approvals)
                    await new Promise(resolve => setTimeout(resolve, 5));
            }
        }
        await createTask('lead', { pilot_role: 'lead' }, [requirements]);
        await h.administration.startEvents();
        await enqueue('lead', 'initial.lead', 9);
        await h.administration.idleEvents();
        invariant(h.inspectTask('lead').state === 'WAITING', 'PILOT_PLAN_NOT_PROPOSED');
        const planSource = h.inspectTask('lead').history.at(-1);
        const proposal = JSON.parse(latest(h, 'lead').text);
        const allowedOutputs = [...Object.entries(ROLE_PATHS).flatMap(([role, paths]) => paths.map(path => role + '/' + path)), ...Object.keys(PILOT_FILES).map(path => 'AgentNexus-Pilot-Project/' + path)];
        const admitted = await h.administration.admitDevelopmentPlan('lead', planSource, requirements, { project_id: 'pilot', allowed_outputs: allowedOutputs, max_tasks: 12, max_requests: 300, max_disk_bytes: 1048576 });
        report.plan_id = admitted.id;
        await jsonFile(join(root, 'plan.json'), admitted);
        await h.administration.decision('lead', { plan_id: admitted.id, plan_sha256: admitted.plan_sha256, source: planSource, assurance: 'SIMULATED_MODEL_PROPOSAL' }, 'ACCEPTED');
        for (const id of ['resident', 'coordinator']) {
            await createAgent(id, id, undefined, id === 'resident' ? 'RESIDENT' : 'COORDINATOR');
            await createTask(id, { pilot_role: id }, [requirements]);
            await enqueue(id, 'initial.' + id, 1);
        }
        await h.administration.idleEvents();
        const coordinator = h.bindAgent('coordinator');
        await jsonFile(join(root, 'coordinator-status.json'), { states: coordinator.projectStates(), advice: latest(h, 'coordinator'), permissions: coordinator.status().tools });
        await coordinator.sendText({ receiver_agent_id: 'lead', message_type: 'COORDINATOR_ADVICE', text: canonical({ advice: 'Run independent coding tasks in parallel after architecture; defer integration until test and documentation artifacts exist.', changes_project_decisions: false }), dedup_key: 'coordinator.plan' });
        await h.administration.idleEvents();
        await h.administration.stopEvents();
        const beforeRestart = h.inspectTask('lead'), oldActor = h.inspectAgent('lead').subject, stale = h.bindAgent('lead'), calls = h.state.count('MODEL_REQUEST');
        const checkpointNotice = await h.bindAgent('resident').sendText({ receiver_agent_id: 'lead', message_type: 'CHECKPOINT_NOTICE', text: canonical({ pilot_signal: 'CHECKPOINT', plan_id: admitted.id, task_id: 'lead', requirements_sha256: requirements.payload_ref.sha256 }), dedup_key: 'checkpoint.plan' });
        await h.close();
        let staleRejected = false;
        try {
            stale.status();
        }
        catch {
            staleRejected = true;
        }
        invariant(staleRejected, 'PILOT_OLD_RUNTIME_SURVIVED_CLOSE');
        h = await openHarness(join(root, 'host'), harnessOptions);
        await h.administration.recoverEvents();
        await registerExtensions();
        const afterRestart = h.inspectTask('lead'), newActor = h.inspectAgent('lead').subject;
        invariant(calls === h.state.count('MODEL_REQUEST') && newActor.runtime_instance_id !== oldActor.runtime_instance_id && afterRestart.id === beforeRestart.id && canonical(afterRestart.rules_binding) === canonical(beforeRestart.rules_binding) && canonical(afterRestart.contract_ref) === canonical(beforeRestart.contract_ref), 'PILOT_RESTART_BINDING_CHANGED');
        for (const id of ['lead', 'resident', 'coordinator']) {
            await h.administration.resumeTask(id);
            await enqueue(id, 'checkpoint.resume.' + id, 9);
        }
        await h.administration.startEvents();
        await h.administration.idleEvents();
        const checkpointReceipt = h.state.get('MESSAGE_HANDOFF', checkpointNotice.message_id);
        invariant(checkpointReceipt?.state === 'PROCESSED', 'PILOT_CHECKPOINT_MESSAGE_NOT_RESUMED');
        report.recovery = { status: 'PASS', kind: 'CONTROLLED_HOST_CLOSE_REOPEN_WITH_ORIGINAL_PILOT_TASK', original_task_id: beforeRestart.id, old_runtime_instance_id: oldActor.runtime_instance_id, new_runtime_instance_id: newActor.runtime_instance_id,
            original_contract_ref: beforeRestart.contract_ref, rules_binding: beforeRestart.rules_binding, requirements, admitted_plan_id: admitted.id, automatic_model_calls_on_reopen: 0, stale_facade_rejected: true, message_id: checkpointNotice.message_id,
            abrupt_process_crash: 'SEPARATE_RUNTIME_TESTS', os_reboot: 'NOT_RUN', unknown_effects_replayed: false };
        await jsonFile(join(root, 'recovery.json'), report.recovery);
        const workById = new Map(admitted.plan.tasks.map(work => [work.id, work]));
        const sourcesByTask = new Map();
        async function runWork(id, inputs, files, sources) {
            const work = workById.get(id);
            invariant(work, 'PILOT_WORK_NOT_ADMITTED');
            const resourceRole = id === 'integration' ? 'delivery' : RESOURCE_ROLES.includes(id) ? id : undefined;
            const scope = { pilot_role: id, planned_goal: work.goal, plan_id: admitted.id, model_strategy: work.model_strategy, ...(resourceRole ? { resource_id: 'pilot:' + resourceRole, files: files ?? [...ROLE_PATHS[id]] } : {}), ...(sources ? { sources } : {}) };
            const expectedOutputs = (scope.files ?? []).map(path => (id === 'integration' ? 'AgentNexus-Pilot-Project' : id) + '/' + path);
            invariant(canonical([...work.outputs].sort()) === canonical([...expectedOutputs].sort()) && expectedOutputs.every(path => admitted.owners[path.toLowerCase()] === id), 'PILOT_ADMITTED_OUTPUT_OWNERSHIP_MISMATCH');
            await createAgent(id, work.role, resourceRole, 'SUBAGENT', work.model_strategy);
            await createTask(id, scope, inputs, work.dependencies, { max_turns: work.estimated_requests, requirements: { disk_bytes: work.disk_bytes }, contract: { acceptance: work.acceptance, allowed_scope: scope.resource_id ? [scope.resource_id] : [] } });
            await h.bindAgent('lead').sendText({ receiver_agent_id: id, message_type: 'TASK_CONTRACT', text: canonical({ task_id: id, plan_id: admitted.id, acceptance: work.acceptance, model_strategy: work.model_strategy }), dedup_key: 'delegate.' + id });
        }
        await runWork('research', [requirements]);
        await drive(['research']);
        sourcesByTask.set('research', [h.inspectTask('research').result_ref]);
        await runWork('architecture', [requirements, ...sourcesByTask.get('research')]);
        await drive(['architecture']);
        const architecture = h.inspectTask('architecture').result_ref;
        await h.administration.stopEvents();
        for (const id of ['code-model', 'code-analytics', 'code-cli', 'docs'])
            await runWork(id, [requirements, architecture]);
        await h.administration.startEvents();
        await drive(['code-model', 'code-analytics', 'code-cli', 'docs']);
        const writes = () => h.state.list('STORAGE_WRITE', { project_id: 'pilot', limit: 100 }).filter(write => write.state === 'AUDIT_ACKNOWLEDGED');
        const codeSources = writes().filter(write => write.subject.task_id.startsWith('code-')).map(write => write.request.source);
        await runWork('test', [requirements, architecture, ...codeSources]);
        await drive(['test']);
        const initialSources = Object.keys(PILOT_FILES).map(path => {
            const role = Object.keys(ROLE_PATHS).find(role => ROLE_PATHS[role].includes(path)), write = writes().find(write => write.subject.task_id === role && write.request.path === path);
            invariant(write && write.published?.sha256 === sha256(PILOT_FILES[path]) && write.artifact_ref.sha256 === write.request.source.payload_ref.sha256, 'PILOT_ARTIFACT_SOURCE_CHAIN');
            return { path, source: write.request.source };
        });
        await runWork('integration', [requirements, architecture], Object.keys(PILOT_FILES), initialSources);
        await drive(['integration']);
        async function candidate(final) {
            const files = [], versions = [];
            for (const path of Object.keys(PILOT_FILES).sort()) {
                const version = h.administration.storageVersion('pilot:delivery', path);
                invariant(version, 'PILOT_DELIVERY_MISSING_FILE');
                const actual = await fileHash(join(projectRoot, path)), expected = sha256(final && path === 'src/analytics.ts' ? ANALYTICS_FIXED : PILOT_FILES[path]);
                invariant(actual === expected && version.file.sha256 === actual, 'PILOT_DELIVERY_HASH_MISMATCH');
                const write = h.administration.inspectStorage(version.operation_id);
                invariant(write.state === 'AUDIT_ACKNOWLEDGED' && write.request.path === path && write.request.resource_id === 'pilot:delivery' && write.artifact_ref.sha256 === actual, 'PILOT_DELIVERY_OWNER_CHAIN');
                files.push({ path, sha256: actual, bytes: (await lstat(join(projectRoot, path))).size });
                versions.push({ path, version: version.version, operation_id: version.operation_id, source: write.request.source });
            }
            const value = { schema: 'agentnexus/pilot-candidate/1', files, tree_sha256: sha256(canonical(files)), versions };
            const artifact = await h.store.artifacts.putBytesQueued(Buffer.from(canonical(value)), { maxBytes: 32768, media_type: 'application/json' });
            return { value, artifact };
        }
        async function diff(label) {
            const empty = join(root, 'empty-' + label);
            await mkdir(empty);
            const env = { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_CONFIG_SYSTEM: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_CONFIG_COUNT: '0', GIT_PAGER: '', GIT_EXTERNAL_DIFF: '' };
            if (process.env.SystemRoot)
                env.SystemRoot = process.env.SystemRoot;
            if (process.env.WINDIR)
                env.WINDIR = process.env.WINDIR;
            const argv = ['--no-pager', 'diff', '--no-index', '--no-ext-diff', '--no-textconv', '--', empty, projectRoot], result = spawnSync(options.git_path, argv, { shell: false, windowsHide: true, env, cwd: root, encoding: 'utf8', maxBuffer: 1048576, timeout: 10000 });
            invariant(result.status === 1 && !result.error && Buffer.byteLength(result.stdout) > 0, 'PILOT_GIT_DIFF_NOT_OBSERVED');
            const artifact = await h.store.artifacts.putBytesQueued(Buffer.from(result.stdout), { maxBytes: 1048576 });
            await jsonFile(join(root, 'git-diff-' + label + '.json'), { executable: options.git_path, argv, exit_code: result.status, stdout_sha256: artifact.sha256, source_baseline_commit: options.baseline_commit, pilot_commit_created: false, diff_scope: 'WORKTREE_NO_INDEX_EMPTY_BASE', artifact });
            return artifact;
        }
        async function checksFor(actorId, current, label) {
            const result = await h.administration.runPilotQualityCheck(actorId, () => runPilotChecks({ root: projectRoot, files: current.value.files }, { allowed_hashes: allowedHashes, type_tools_root: options.type_tools_root }));
            invariant(result.candidate_hash === current.value.tree_sha256, 'PILOT_TEST_CANDIDATE_BINDING');
            checks.push(result);
            await jsonFile(join(root, 'checks-' + label + '.json'), result);
            const evidence = await h.store.artifacts.putBytesQueued(Buffer.from(canonical(result)), { maxBytes: 262144, media_type: 'application/json' });
            checkEvidence.set(result, evidence);
            await h.state.change(h.inspectAgent(actorId).subject, 'PILOT_CHECK_EVIDENCE_BOUND', () => { }, { candidate_ref: current.artifact, tree_sha256: current.value.tree_sha256, report_ref: evidence, label });
            return result;
        }
        async function reviewer(id, authorId, current, diffRef) {
            await createAgent(id, 'review', undefined, 'BACKGROUND_REVIEWER');
            const actor = h.inspectAgent(id).subject, diffSource = await h.context.capture(actor, 'RAW', h.store.artifacts.read(diffRef), { maxBytes: 65536 });
            invariant(diffSource.payload_ref.sha256 === diffRef.sha256, 'PILOT_REVIEW_DIFF_SOURCE');
            const candidateSource = await h.context.capture(actor, 'RAW', h.store.artifacts.read(current.artifact), { maxBytes: 32768, source_refs: current.value.versions.map(version => version.source) });
            await createTask(id, { pilot_role: 'review' }, [requirements, diffSource, candidateSource], [], { review_binding: { commit: options.baseline_commit, diff_sha256: diffRef.sha256, candidate_sha256: current.artifact.sha256, author_agent_id: authorId } });
            await h.bindAgent('lead').sendText({ receiver_agent_id: id, message_type: 'REVIEW_REQUEST', text: canonical({ pilot_signal: 'REVIEW_REQUEST', candidate_ref: current.artifact, diff_ref: diffRef, commit: options.baseline_commit, author_id: authorId }), dedup_key: 'request.' + id });
            await enqueue(id, 'initial.' + id, 8);
            await h.administration.idleEvents();
            invariant(h.inspectTask(id).state === 'WAITING', 'PILOT_REVIEWER_NOT_WAITING');
        }
        await createAgent('test-runner', 'test-runner');
        await createTask('test-runner', { pilot_role: 'test-runner' }, [requirements]);
        await enqueue('test-runner', 'initial.test-runner');
        await h.administration.idleEvents();
        const first = await candidate(false), firstDiff = await diff('before');
        await reviewer('review-before', 'lead', first, firstDiff);
        let beforeTests, beforeReview;
        await h.administration.registerGateChecker({ id: 'pilot-tests-before', version: '1.7', gates: ['g3'], kind: 'TEST', assurance: 'LOCAL_TRUSTED_LIBRARY', run: async () => { beforeTests = await checksFor('test-runner', first, 'before-tests'); return { status: beforeTests.status, reason: 'Real pre-repair fixed tests; seeded numerical defect must fail.', evidence_refs: [checkEvidence.get(beforeTests)] }; } });
        await h.administration.registerGateChecker({ id: 'pilot-review-before', version: '1.7', gates: ['g4'], kind: 'INDEPENDENT_REVIEW', reviewer_id: 'review-before', assurance: 'LOCAL_TRUSTED_LIBRARY', run: async () => { beforeReview = await checksFor('review-before', first, 'before-independent-review'); return { status: beforeReview.status, reason: 'Independent read-only pre-repair checks; retain actual numerical failure.', evidence_refs: [checkEvidence.get(beforeReview)] }; } });
        const beforeProfile = await h.store.artifacts.putBytesQueued(Buffer.from(canonical({ schema: 'agentnexus/gate-profile/1', required_checkers: { g3: ['pilot-tests-before'], g4: ['pilot-review-before'] }, manual_gates: [], qualification: 'LOCAL_TRUSTED_LIBRARY' })), { maxBytes: 4096 });
        for (const id of ['g3', 'g4']) {
            const gate = await h.administration.nativeGate('lead', { gate_id: id, binding: h.inspectTask('lead').rules_binding, candidate_ref: first.artifact, baseline_ref: baseline, test_profile_ref: beforeProfile, evidence: [], author_id: 'lead' });
            report.pre_repair_gates.push(gate);
            invariant(gate.status === 'FAIL', 'PILOT_PRE_REPAIR_' + id + '_' + gate.status + ':' + gate.reason);
        }
        invariant(beforeTests?.status === 'FAIL' && beforeTests.tests.status === 'FAIL' && beforeReview?.status === 'FAIL', 'PILOT_SEEDED_NUMERICAL_BUG_NOT_OBSERVED');
        report.initial_checks = 'FAIL';
        const line = (await readFile(join(projectRoot, 'src/analytics.ts'), 'utf8')).split('\n').findIndex(text => text.includes('const completion_percent=')) + 1;
        const finding = { pilot_signal: 'REVIEW_FINDINGS', candidate_sha256: first.artifact.sha256, diff_sha256: firstDiff.sha256, commit: options.baseline_commit, path: 'src/analytics.ts', line,
            description: 'Empty or zero-weight input divides zero by zero and produces NaN instead of the required finite zero.', reproduction: 'node --test tests/analytics.test.ts', evidence_directory: beforeReview.evidence_directory, findings: beforeReview.findings };
        const findingMessage = await h.bindAgent('review-before').sendText({ receiver_agent_id: 'lead', message_type: 'REVIEW_FINDINGS', text: canonical(finding), dedup_key: 'numerical.finding' });
        await h.administration.idleEvents();
        invariant(JSON.parse(latest(h, 'lead').text).action === 'REPAIR', 'PILOT_LEAD_DID_NOT_CHOOSE_REPAIR');
        const old = h.administration.storageVersion('pilot:delivery', 'src/analytics.ts');
        await createAgent('debug', 'DEBUG', 'delivery');
        const originalAnalytics = h.administration.inspectStorage(old.operation_id).request.source;
        await createTask('debug', { pilot_role: 'debug', resource_id: 'pilot:delivery', files: ['src/analytics.ts'], replacement: { path: 'src/analytics.ts', version: old.version, sha256: old.file.sha256 } }, [requirements, findingMessage.payload, originalAnalytics]);
        await h.bindAgent('lead').sendText({ receiver_agent_id: 'debug', message_type: 'REPAIR_CONTRACT', text: canonical({ path: 'src/analytics.ts', expected_version: old.version, expected_sha256: old.file.sha256, decision: JSON.parse(latest(h, 'lead').text) }), dedup_key: 'repair.analytics' });
        await drive(['debug']);
        const final = await candidate(true), finalDiff = await diff('final');
        report.candidate_sha256 = final.artifact.sha256;
        await createAgent('delivery', 'DELIVERY', undefined, 'DEVELOPMENT');
        const profile = await h.store.artifacts.putBytesQueued(Buffer.from(canonical({ schema: 'agentnexus/gate-profile/1', required_checkers: { g0: ['pilot-manifest'], g1: ['pilot-manifest'], g2: ['pilot-manifest'], g3: ['pilot-tests-final'], g4: ['pilot-review-final'], g5: ['pilot-manifest'], g6: ['pilot-manifest'] }, manual_gates: [], qualification: 'LOCAL_TRUSTED_LIBRARY' })), { maxBytes: 4096 });
        await createTask('delivery', { pilot_role: 'delivery' }, [requirements], [], { gate_requirements: [{ gate_id: 'g6', record_id: null, candidate_hash: final.artifact.sha256, baseline_hash: baseline.sha256, test_profile_hash: profile.sha256 }] });
        await reviewer('review-final', 'delivery', final, finalDiff);
        await h.administration.registerGateChecker({ id: 'pilot-manifest', version: '1.7', gates: ['g0', 'g1', 'g2', 'g5', 'g6'], kind: 'VALIDATION', assurance: 'LOCAL_TRUSTED_LIBRARY', run: async (ctx) => { const actual = await candidate(true); return { status: ctx.candidate_ref.sha256 === actual.artifact.sha256 ? 'PASS' : 'FAIL', reason: 'Every actual file, exact Storage Owner version, source and immutable Artifact matches the complete delivery set.', evidence_refs: [actual.artifact] }; } });
        let finalTest, finalReview;
        await h.administration.registerGateChecker({ id: 'pilot-tests-final', version: '1.7', gates: ['g3'], kind: 'TEST', assurance: 'LOCAL_TRUSTED_LIBRARY', run: async (ctx) => { invariant(ctx.candidate_ref.sha256 === final.artifact.sha256, 'PILOT_GATE_TEST_INPUT'); finalTest = await checksFor('test-runner', final, 'final-tests'); return { status: finalTest.status, reason: 'Fixed actual Node syntax, strict TypeScript, unit, numerical and persistent CLI tests.', evidence_refs: [checkEvidence.get(finalTest)] }; } });
        await h.administration.registerGateChecker({ id: 'pilot-review-final', version: '1.7', gates: ['g4'], kind: 'INDEPENDENT_REVIEW', reviewer_id: 'review-final', assurance: 'LOCAL_TRUSTED_LIBRARY', run: async (ctx) => { invariant(ctx.actor.agent_id === 'review-final' && ctx.candidate_ref.sha256 === final.artifact.sha256, 'PILOT_GATE_REVIEW_INPUT'); finalReview = await checksFor('review-final', final, 'final-independent-review'); return { status: finalReview.status, reason: 'Independent read-only re-review of the repaired exact candidate; no code writes.', evidence_refs: [checkEvidence.get(finalReview)] }; } });
        const design = await h.store.artifacts.putBytesQueued(Buffer.from(canonical({ schema: 'agentnexus/design-plan/1', task_id: 'delivery', candidate_hash: final.artifact.sha256, steps: admitted.plan.tasks.map(task => task.goal), acceptance: PILOT_REQUIREMENTS.acceptance })), { maxBytes: 16384 });
        const gateInput = (id) => ({ gate_id: id, binding: h.inspectTask('delivery').rules_binding, candidate_ref: final.artifact, baseline_ref: baseline, test_profile_ref: profile, evidence: [], author_id: 'delivery' });
        for (const id of ['g0', 'g1', 'g2', 'g3', 'g4']) {
            const input = gateInput(id);
            if (id === 'g2')
                input.evidence = [{ kind: 'design-plan', ref: design }];
            const gate = await h.administration.nativeGate('delivery', input);
            report.gate_records.push(gate);
            invariant(gate.status === 'PASS', 'PILOT_' + id.toUpperCase() + '_' + gate.status + ':' + gate.reason);
        }
        invariant(finalTest?.status === 'PASS' && finalReview?.status === 'PASS', 'PILOT_FINAL_CHECKS_REQUIRED');
        report.final_checks = 'PASS';
        const testRef = checkEvidence.get(finalTest), reviewRef = checkEvidence.get(finalReview);
        const delivery = await h.store.artifacts.putBytesQueued(Buffer.from(canonical({ schema: 'agentnexus/delivery/1', task_id: 'delivery', candidate_hash: final.artifact.sha256, baseline_hash: baseline.sha256, test_profile_hash: profile.sha256,
            artifacts: [final.artifact, testRef, reviewRef, finalDiff], remaining: report.limitations })), { maxBytes: 16384 });
        const g5 = await h.administration.nativeGate('delivery', { ...gateInput('g5'), evidence: [{ kind: 'delivery-manifest', ref: delivery }] });
        report.gate_records.push(g5);
        invariant(g5.status === 'PASS', 'PILOT_G5_' + g5.status);
        const g6 = await h.administration.nativeGate('delivery', { ...gateInput('g6'), prior_gate_ids: report.gate_records.map(gate => gate.id) });
        report.gate_records.push(g6);
        invariant(g6.status === 'PASS' && g6.allows_protected, 'PILOT_G6_' + g6.status);
        await h.administration.bindTaskGate('delivery', 'g6', g6.id);
        await drive(['delivery']);
        await h.bindAgent('resident').sendText({ receiver_agent_id: 'test-runner', message_type: 'TEST_RESULT', text: canonical({ pilot_signal: 'TESTS_PASSED', gate_record_id: g6.id, test_ref: testRef }), dedup_key: 'final.tests' });
        await h.bindAgent('resident').sendText({ receiver_agent_id: 'lead', message_type: 'ACCEPTANCE', text: canonical({ pilot_signal: 'ACCEPTED', authority: 'NATIVE_GATE_ENGINE', gate_record_id: g6.id, candidate_ref: final.artifact }), dedup_key: 'final.acceptance' });
        await h.administration.idleEvents();
        invariant(h.inspectTask('lead').state === 'SUCCEEDED' && h.inspectTask('test-runner').state === 'SUCCEEDED', 'PILOT_FINAL_HANDOFF');
        const rows = h.store.db.prepare("SELECT seq,json_extract(body,'$.agent_id') AS agent_id,json_extract(body,'$.phase') AS phase FROM anx_records WHERE domain='audit' AND json_extract(body,'$.agent_id') IN ('code-model','code-analytics','code-cli') AND json_extract(body,'$.phase') IN ('TASK_DISPATCHED','TASK_HANDLER_SETTLED') ORDER BY seq").all();
        const starts = new Map();
        for (const row of rows) {
            if (row.phase === 'TASK_DISPATCHED')
                starts.set(row.agent_id, row.seq);
            else if (starts.has(row.agent_id)) {
                report.concurrency.coding_intervals.push({ id: row.agent_id, start: starts.get(row.agent_id), end: row.seq });
                starts.delete(row.agent_id);
            }
        }
        let active = 0, peak = 0;
        for (const event of report.concurrency.coding_intervals.flatMap(row => [{ seq: row.start, delta: 1 }, { seq: row.end, delta: -1 }]).sort((a, b) => a.seq - b.seq)) {
            active += event.delta;
            peak = Math.max(peak, active);
        }
        report.concurrency.coding_peak = peak;
        report.concurrency.event_peak = h.administration.eventStatus().peak_active;
        invariant(peak >= 3, 'PILOT_THREE_CODING_TASKS_NOT_OVERLAPPING');
        report.resources = { platform: h.state.get('resource_budget', 'platform'), persistent_claims: h.state.list('resource_storage_claim', { project_id: 'pilot', limit: 100 }), quality_checks: h.state.list('PILOT_QUALITY_CHECK', { project_id: 'pilot', limit: 100 }), unknown_reservations: h.state.count('resource_reservation', { state: 'UNKNOWN_QUARANTINED' }) };
        const modelRows = h.state.list('MODEL_REQUEST', { project_id: 'pilot', limit: 100 });
        for (const row of modelRows) {
            invariant(row.context_input_ref && row.context_manifest_ref, 'PILOT_MODEL_INPUT_PROVENANCE');
            await h.context.reconstruct(h.inspectAgent(row.owner.agent_id).subject, row.context_view_id);
        }
        report.provenance = { model_requests: h.state.count('MODEL_REQUEST'), verified_context_views: modelRows.length, artifact_source_chain: 'MODEL_REPLY -> Gateway stage -> immutable raw source -> exact approval -> Storage Owner -> delivery version -> Gate checker', fixture_source_sha256: fixtureHash,
            message_handoffs: h.state.list('MESSAGE_HANDOFF', { project_id: 'pilot', limit: 100 }), source_manifest: final.value, real_model_cost: 0, simulation_usage_ledger_only: true };
        await candidate(true);
        await h.store.verify();
        report.status = 'PASS';
    }
    catch (error) {
        report.error = error instanceof Error ? error.stack ?? error.message : String(error);
    }
    finally {
        await h.administration.stopEvents().catch(error => { report.status = 'FAIL'; report.error ??= String(error); });
        report.role_tasks = h.state.list('TASK', { project_id: 'pilot', limit: 100 }).map(task => { const agent = h.inspectAgent(task.subject.agent_id); return { id: task.id, type: agent.subject.agent_type, role: contract(h, task.id).pilot_role, state: task.state, turns: task.turns, runtime_instance_id: agent.subject.runtime_instance_id, budget_id: agent.subject.resource_budget_id, model_binding: agent.subject.model_binding }; });
        await jsonFile(join(root, 'storage-writes.json'), h.state.list('STORAGE_WRITE', { project_id: 'pilot', limit: 100 }));
        await jsonFile(join(root, 'events.json'), h.administration.listEvents());
        await h.close();
        report.ended_at = new Date().toISOString();
        await jsonFile(join(root, 'report.json'), report);
    }
    return report;
}
