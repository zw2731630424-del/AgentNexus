import { canonical, invariant, sha256 } from '../types.js';
import { identifier, snapshot } from './contracts.js';
export const DEVELOPMENT_ROLES = ['RESEARCH', 'ARCHITECTURE', 'CODING', 'TEST', 'DEBUG', 'REVIEW', 'DOCUMENTATION', 'INTEGRATION'];
function fields(value, names) { invariant(Object.keys(value).sort().join(',') === [...names].sort().join(','), 'DEVELOPMENT_PLAN_FIELDS'); }
export function pilotPath(value) {
    invariant(typeof value === 'string' && value.length > 0 && value.length <= 160 && value === value.normalize('NFC') &&
        !value.includes('\\') && !value.includes(':') && !value.startsWith('/') && value.split('/').every(part => /^[A-Za-z0-9_.-]+$/.test(part) && !['.', '..'].includes(part) && !/[. ]$/.test(part) &&
        !/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)), 'DEVELOPMENT_OUTPUT_PATH');
    return value;
}
/** A model proposes a DAG; only this trusted validator can admit its bounded scope. */
export function validateDevelopmentPlan(input, envelope) {
    const p = snapshot(input, 32768);
    fields(p, ['schema', 'project_id', 'requirements_sha256', 'goal', 'tasks']);
    invariant(p.schema === 'agentnexus/development-plan/1' && p.project_id === envelope.project_id && /^[a-f0-9]{64}$/.test(p.requirements_sha256), 'DEVELOPMENT_PLAN_SCOPE');
    invariant(typeof p.goal === 'string' && Buffer.byteLength(p.goal) > 0 && Buffer.byteLength(p.goal) <= 2048, 'DEVELOPMENT_PLAN_GOAL');
    invariant(Number.isSafeInteger(envelope.max_tasks) && envelope.max_tasks >= 1 && envelope.max_tasks <= 16 && Array.isArray(p.tasks) && p.tasks.length > 0 && p.tasks.length <= envelope.max_tasks, 'DEVELOPMENT_PLAN_LIMIT');
    const allowed = new Set(envelope.allowed_outputs.map(pilotPath).map(path => path.toLowerCase()));
    invariant(allowed.size === envelope.allowed_outputs.length, 'DEVELOPMENT_ENVELOPE_COLLISION');
    const ids = new Set(), ownership = new Map();
    let requests = 0, disk = 0;
    for (const task of p.tasks) {
        fields(task, ['id', 'role', 'goal', 'dependencies', 'priority', 'outputs', 'acceptance', 'model_strategy', 'estimated_requests', 'disk_bytes']);
        identifier(task.id);
        invariant(task.id.length <= 64 && !ids.has(task.id), 'DEVELOPMENT_TASK_DUPLICATE');
        ids.add(task.id);
        invariant(DEVELOPMENT_ROLES.includes(task.role) && ['LOW_COST', 'DESIGN', 'REASONING'].includes(task.model_strategy), 'DEVELOPMENT_ROLE');
        invariant(typeof task.goal === 'string' && task.goal.length > 0 && Buffer.byteLength(task.goal) <= 1024, 'DEVELOPMENT_TASK_GOAL');
        invariant(Number.isSafeInteger(task.priority) && task.priority >= 0 && task.priority <= 100, 'DEVELOPMENT_TASK_PRIORITY');
        invariant(Array.isArray(task.dependencies) && task.dependencies.length <= 16 && new Set(task.dependencies).size === task.dependencies.length, 'DEVELOPMENT_DEPENDENCY');
        invariant(Array.isArray(task.outputs) && task.outputs.length <= 12 && new Set(task.outputs).size === task.outputs.length, 'DEVELOPMENT_OUTPUT_LIMIT');
        if (['RESEARCH', 'ARCHITECTURE', 'REVIEW'].includes(task.role))
            invariant(task.outputs.length === 0, 'DEVELOPMENT_READ_ONLY_ROLE');
        for (const path of task.outputs) {
            pilotPath(path);
            const key = path.toLowerCase();
            invariant(allowed.has(key), 'DEVELOPMENT_OUTPUT_SCOPE');
            invariant(![...ownership.keys()].some(old => old === key || old.startsWith(key + '/') || key.startsWith(old + '/')), 'DEVELOPMENT_FILE_CONFLICT');
            ownership.set(key, task.id);
        }
        invariant(Array.isArray(task.acceptance) && task.acceptance.length > 0 && task.acceptance.length <= 12 && task.acceptance.every(item => typeof item === 'string' && item.length > 0 && Buffer.byteLength(item) <= 512), 'DEVELOPMENT_ACCEPTANCE');
        invariant(Number.isSafeInteger(task.estimated_requests) && task.estimated_requests > 0 && task.estimated_requests <= 32 && Number.isSafeInteger(task.disk_bytes) && task.disk_bytes >= 0 && task.disk_bytes <= 1048576, 'DEVELOPMENT_RESOURCE_REQUEST');
        requests += task.estimated_requests;
        disk += task.disk_bytes;
    }
    invariant(requests <= envelope.max_requests && disk <= envelope.max_disk_bytes, 'DEVELOPMENT_RESOURCE_ENVELOPE');
    for (const task of p.tasks)
        for (const id of task.dependencies)
            invariant(ids.has(id) && id !== task.id, 'DEVELOPMENT_DEPENDENCY');
    const remaining = new Set(ids), done = new Set(), batches = [];
    while (remaining.size) {
        const ready = p.tasks.filter(task => remaining.has(task.id) && task.dependencies.every(id => done.has(id))).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
        invariant(ready.length > 0, 'DEVELOPMENT_DEPENDENCY_CYCLE');
        batches.push(ready.map(task => task.id));
        for (const task of ready) {
            remaining.delete(task.id);
            done.add(task.id);
        }
    }
    return snapshot({ plan: p, batches, owners: Object.fromEntries(ownership) });
}
export class DevelopmentAdmission {
    #state;
    #context;
    constructor(state, context) { this.#state = state; this.#context = context; }
    async admit(admin, actor, source, requirements, envelope) {
        this.#state.checkAdmin(admin);
        invariant(actor.agent_type === 'DEVELOPMENT' && actor.project_id === envelope.project_id, 'DEVELOPMENT_AUTHORITY');
        this.#state.require('native.harness', actor);
        this.#state.require('wf.runtime', actor);
        const raw = await this.#context.readRange(actor, source), original = await this.#context.readRange(actor, requirements);
        invariant(Buffer.byteLength(raw.text) <= 32768 && Buffer.byteLength(original.text) <= 65536, 'DEVELOPMENT_INPUT_LIMIT');
        const response = JSON.parse(raw.text);
        const request = this.#state.get('MODEL_REQUEST', response.request_id) ?? this.#state.get('MODEL18_REQUEST', response.request_id);
        const task = this.#state.get('TASK', actor.task_id);
        invariant(source.task_id === actor.task_id && ['SIMULATED', 'REAL'].includes(response.status) && response.assurance === response.status && response.reply?.kind === 'WAIT' && request?.state === 'SUCCEEDED' &&
            canonical(request.owner) === canonical(actor) && canonical(request.result) === canonical(response) && task?.history.some(ref => canonical(ref) === canonical(source)), 'DEVELOPMENT_MODEL_PROVENANCE');
        const proposer = await this.#context.reconstruct(request.owner, request.context_view_id);
        invariant(proposer.context.entries.some(entry => canonical(entry.source) === canonical(requirements) && entry.text === original.text), 'DEVELOPMENT_REQUIREMENTS_NOT_IN_MODEL_CONTEXT');
        const parsed = JSON.parse(response.reply.text);
        const validated = validateDevelopmentPlan(parsed, envelope);
        invariant(parsed.requirements_sha256 === sha256(original.text), 'DEVELOPMENT_REQUIREMENTS_BINDING');
        const hash = sha256(canonical(validated.plan)), id = sha256(actor.project_id + ':' + actor.task_id + ':' + hash);
        return this.#state.change(actor, 'DEVELOPMENT_PLAN_ADMITTED', () => {
            const old = this.#state.get('DEVELOPMENT_PLAN', id);
            if (old)
                return old;
            invariant(this.#state.count('DEVELOPMENT_PLAN') < 128, 'DEVELOPMENT_PLAN_CAPACITY');
            const record = { id, revision: 0, subject: actor, plan: validated.plan, plan_sha256: hash, source, requirements, proposer_request_id: response.request_id, batches: validated.batches, owners: validated.owners, assurance: response.assurance === 'REAL' ? 'REAL_MODEL_NATIVE_EXECUTION' : 'SIMULATED_MODEL_NATIVE_EXECUTION' };
            this.#state.insert('DEVELOPMENT_PLAN', id, actor, 'ADMITTED', record);
            return snapshot(record);
        }, { plan_id: id, plan_sha256: hash, requirements_sha256: parsed.requirements_sha256, model_assurance: response.assurance, permissions_derived_from_model: false });
    }
}
