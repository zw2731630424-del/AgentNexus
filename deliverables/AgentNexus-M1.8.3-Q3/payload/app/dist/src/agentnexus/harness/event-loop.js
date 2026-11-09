import { canonical, invariant, now, sha256 } from '../types.js';
import { AGENT_TYPES, identifier, snapshot, subject } from './contracts.js';
export const RESIDENT_EVENT_LIMITS = Object.freeze({ concurrent: 4, records: 512, pending: 256, batch: 32 });
const KIND = 'RESIDENT_EVENT';
const KINDS = ['MESSAGE_DELIVERABLE', 'TASK_READY', 'CAPACITY_AVAILABLE', 'DEPENDENCY_COMPLETED'];
const TERMINAL = ['SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT', 'UNKNOWN_QUARANTINED'];
const UNSETTLED = ['PENDING', 'DISPATCHING'];
/** Bounded durable wake control plane; idle waiting never calls a model. A settled wake is not Task completion. */
export class ResidentEventLoop {
    #state;
    #adapter;
    #concurrent;
    #maxRecords;
    #maxPending;
    #running = false;
    #stopping = false;
    #scheduled = false;
    #repump = false;
    #signal = 0;
    #peak = 0;
    #pumping = null;
    #active = new Map();
    #failure = null;
    constructor(state, adapter, options = {}) {
        invariant(Object.keys(options).every(key => ['maxConcurrent', 'maxRecords', 'maxPending'].includes(key)), 'EVENT_OPTIONS');
        invariant(typeof adapter.inspectTask === 'function' && typeof adapter.dispatch === 'function' && typeof adapter.resume === 'function', 'EVENT_ADAPTER_REQUIRED');
        this.#concurrent = options.maxConcurrent ?? 3;
        this.#maxRecords = options.maxRecords ?? RESIDENT_EVENT_LIMITS.records;
        this.#maxPending = options.maxPending ?? Math.min(128, this.#maxRecords);
        for (const [value, maximum] of [[this.#concurrent, RESIDENT_EVENT_LIMITS.concurrent], [this.#maxRecords, RESIDENT_EVENT_LIMITS.records], [this.#maxPending, RESIDENT_EVENT_LIMITS.pending]])
            invariant(Number.isSafeInteger(value) && value >= 1 && value <= maximum, 'EVENT_LIMIT');
        invariant(this.#maxPending <= this.#maxRecords, 'EVENT_LIMIT');
        this.#state = state;
        this.#adapter = { ...adapter };
    }
    #all() {
        const records = [];
        let after;
        for (;;) {
            const page = this.#state.list(KIND, { ...(after ? { after } : {}), limit: 100 });
            records.push(...page);
            invariant(records.length <= RESIDENT_EVENT_LIMITS.records, 'EVENT_CAPACITY');
            if (page.length < 100)
                return records;
            after = page.at(-1).id;
        }
    }
    #sameTask(event, task) {
        const target = event.input.target;
        subject(task.subject);
        invariant(task.id === target.task_id && task.subject.task_id === target.task_id && task.subject.project_id === target.project_id && task.subject.agent_id === target.agent_id, 'EVENT_TASK_SCOPE');
        invariant(Array.isArray(task.dependencies) && task.dependencies.length <= 16 && Array.isArray(task.received_message_ids) && task.received_message_ids.length <= 32, 'EVENT_TASK_SNAPSHOT');
    }
    #enabled(actor) {
        return ['runtime.role.resident', 'native.harness', 'native.task-scheduler', 'native.agent-loop', AGENT_TYPES[actor.agent_type].feature].every(feature => this.#state.enabled(feature, actor));
    }
    async #write(event, state, reason, changes = {}) {
        return this.#state.change(event.input.target, 'WORKFLOW_EVENT_' + state, () => {
            const current = this.#state.get(KIND, event.id);
            invariant(current && current.revision === event.revision, 'EVENT_REVISION_CONFLICT');
            const next = { ...current, ...changes, state, reason: reason.slice(0, 256), revision: current.revision + 1,
                finished_at: UNSETTLED.includes(state) ? null : now() };
            this.#state.update(KIND, current.id, current.revision, state, next);
            return snapshot(next);
        }, { event_id: event.id, task_id: event.input.target.task_id, state, reason: reason.slice(0, 256), task_completion_claim: false }, event.id);
    }
    async enqueue(admin, input) {
        this.#state.checkAdmin(admin);
        invariant(!this.#failure, 'EVENT_LOOP_FAULTED');
        const data = snapshot(input);
        invariant(Object.keys(data).every(key => ['kind', 'target', 'dedup_key', 'payload_sha256', 'message_id', 'priority', 'effect'].includes(key)), 'EVENT_FIELDS');
        invariant(KINDS.includes(data.kind), 'EVENT_KIND');
        subject(data.target);
        identifier(data.dedup_key);
        invariant(/^[a-f0-9]{64}$/.test(data.payload_sha256), 'EVENT_PAYLOAD_HASH');
        invariant(data.effect === undefined || data.effect === 'INTERNAL', 'EVENT_EXTERNAL_EFFECT');
        if (data.message_id !== undefined)
            identifier(data.message_id);
        invariant(data.kind !== 'MESSAGE_DELIVERABLE' || data.message_id !== undefined, 'EVENT_MESSAGE_REQUIRED');
        const priority = data.priority ?? 0;
        invariant(Number.isSafeInteger(priority) && priority >= 0 && priority <= 9, 'EVENT_PRIORITY');
        invariant(this.#enabled(data.target), 'EVENT_FEATURE_BLOCKED');
        const normalized = { ...data, priority, effect: 'INTERNAL' };
        const target = normalized.target, id = sha256(canonical({ project_id: target.project_id, task_id: target.task_id, agent_id: target.agent_id, dedup_key: data.dedup_key }));
        // A restart may replace the transient runtime/session; logical ownership and all event content remain fixed.
        const { runtime_instance_id: _runtime, session_id: _session, ...logicalTarget } = target;
        const requestHash = sha256(canonical({ ...normalized, target: logicalTarget }));
        const event = await this.#state.change(target, 'WORKFLOW_EVENT_ADMITTED', () => {
            invariant(this.#enabled(target), 'EVENT_FEATURE_BLOCKED');
            const old = this.#state.get(KIND, id);
            if (old) {
                invariant(old.request_hash === requestHash, 'EVENT_DEDUP_CONFLICT');
                return old;
            }
            invariant(this.#state.count(KIND) < this.#maxRecords, 'EVENT_HISTORY_CAPACITY');
            const pending = this.#state.count(KIND, { state: 'PENDING' }) + this.#state.count(KIND, { state: 'DISPATCHING' });
            invariant(pending < this.#maxPending, 'EVENT_QUEUE_BACKPRESSURE');
            const record = { id, revision: 0, sequence: this.#state.count(KIND) + 1, request_hash: requestHash,
                input: normalized, state: 'PENDING', reason: 'DURABLE_EVENT_ADMITTED', task_state: null, attempts: 0, created_at: now(), finished_at: null,
                dispatch_boot: null, wait_boot: null, wait_signal: -1 };
            this.#state.insert(KIND, id, target, 'PENDING', record);
            return snapshot(record);
        }, { event_id: id, task_id: target.task_id, kind: data.kind, payload_sha256: data.payload_sha256, automatic_external_retry: false }, id);
        // NativeState.change returns only after the existing SQLite / Archive outbox durability barrier.
        this.#signal++;
        this.#requestPump();
        return event;
    }
    list(admin) { this.#state.checkAdmin(admin); return this.#all(); }
    status(admin) {
        this.#state.checkAdmin(admin);
        const all = this.#all();
        return Object.freeze({ running: this.#running, active: this.#active.size,
            pending: all.filter(event => event.state === 'PENDING').length, records: all.length, peak_active: this.#peak, faulted: !!this.#failure });
    }
    async recover(admin) {
        this.#state.checkAdmin(admin);
        invariant(!this.#running && !this.#stopping && !this.#pumping && this.#active.size === 0, 'EVENT_LOOP_BUSY');
        let indeterminate = 0;
        for (const event of this.#all()) {
            if (event.state === 'DISPATCHING') {
                await this.#write(event, 'INDETERMINATE', 'HOST_RESTART_DISPATCH_UNKNOWN');
                indeterminate++;
            }
            else if (event.state === 'PENDING')
                await this.#write(event, 'PENDING', 'RECOVERED_EXPLICIT_START_REQUIRED', { wait_boot: null, wait_signal: -1 });
        }
        return { pending: this.#state.count(KIND, { state: 'PENDING' }), indeterminate };
    }
    async start(admin) {
        this.#state.checkAdmin(admin);
        invariant(!this.#stopping && !this.#failure, 'EVENT_LOOP_FAULTED');
        if (this.#running)
            return;
        invariant(this.#state.count(KIND, { state: 'DISPATCHING' }) === 0 && this.#active.size === 0, 'EVENT_RECOVERY_REQUIRED');
        this.#running = true;
        this.#signal++;
        this.#requestPump();
    }
    async stop(admin) {
        this.#state.checkAdmin(admin);
        this.#running = false;
        this.#stopping = true;
        try {
            await this.idle(admin);
        }
        finally {
            this.#stopping = false;
        }
    }
    /** Waits for current known work only; blocked PENDING records do not spin or keep an idle process alive. */
    async idle(admin) {
        this.#state.checkAdmin(admin);
        while (this.#scheduled || this.#pumping || this.#active.size) {
            if (this.#scheduled && !this.#pumping)
                await Promise.resolve();
            else
                await Promise.allSettled([...(this.#pumping ? [this.#pumping] : []), ...this.#active.values()]);
        }
        if (this.#failure)
            throw this.#failure;
    }
    #requestPump() {
        if (!this.#running || this.#failure)
            return;
        if (this.#pumping) {
            this.#repump = true;
            return;
        }
        if (this.#scheduled)
            return;
        this.#scheduled = true;
        queueMicrotask(() => {
            this.#scheduled = false;
            if (!this.#running || this.#failure)
                return;
            const work = this.#pump();
            this.#pumping = work;
            void work.catch(error => { this.#failure = error; this.#running = false; }).finally(() => {
                this.#pumping = null;
                if (this.#repump) {
                    this.#repump = false;
                    this.#requestPump();
                }
            });
        });
    }
    async #wait(event, reason, signal, state) {
        await this.#write(event, 'PENDING', reason, { wait_boot: this.#state.boot_id, wait_signal: signal, ...(state ? { task_state: state } : {}) });
    }
    async #pump() {
        const events = this.#all().filter(event => event.state === 'PENDING').sort((a, b) => (b.input.priority ?? 0) - (a.input.priority ?? 0) || a.sequence - b.sequence);
        let examined = 0;
        for (const event of events) {
            if (!this.#running || this.#active.size >= this.#concurrent)
                break;
            if (event.wait_boot === this.#state.boot_id && event.wait_signal === this.#signal)
                continue;
            if (this.#active.has(event.input.target.task_id))
                continue;
            if (examined++ >= RESIDENT_EVENT_LIMITS.batch) {
                this.#repump = true;
                break;
            }
            const signal = this.#signal;
            let task;
            try {
                task = this.#adapter.inspectTask(event.input.target.task_id);
                if (task)
                    this.#sameTask(event, task);
            }
            catch {
                await this.#write(event, 'BLOCKED', 'TRUSTED_TASK_INSPECTION_FAILED');
                continue;
            }
            if (!task) {
                await this.#write(event, 'BLOCKED', 'TASK_MISSING');
                continue;
            }
            if (event.input.message_id && task.received_message_ids.includes(event.input.message_id)) {
                await this.#write(event, 'SETTLED', 'MESSAGE_ALREADY_ADOPTED_NOT_TASK_COMPLETION', { task_state: task.state });
                continue;
            }
            if (task.state === 'UNKNOWN_QUARANTINED') {
                await this.#write(event, 'INDETERMINATE', 'TASK_UNKNOWN_NO_AUTOMATIC_REPLAY', { task_state: task.state });
                continue;
            }
            if (TERMINAL.includes(task.state)) {
                await this.#write(event, task.state === 'CANCELLED' ? 'CANCELLED' : 'BLOCKED', 'TASK_TERMINAL_EVENT_NOT_ADOPTED', { task_state: task.state });
                continue;
            }
            if (!this.#enabled(task.subject)) {
                await this.#wait(event, 'EVENT_FEATURE_BLOCKED', signal, task.state);
                continue;
            }
            const safeWait = event.input.kind === 'MESSAGE_DELIVERABLE' && task.state === 'WAITING' && task.reason === 'WAIT' && task.pending_tool === null && task.reservation_id === null;
            if (!['QUEUED', 'WAITING_RESOURCES'].includes(task.state) && !safeWait) {
                await this.#wait(event, 'TASK_NOT_AUTOMATICALLY_RESUMABLE:' + (task.reason ?? task.state), signal, task.state);
                continue;
            }
            let dependenciesReady = true;
            for (const id of task.dependencies) {
                identifier(id);
                const dependency = this.#adapter.inspectTask(id);
                if (!dependency || dependency.subject.project_id !== task.subject.project_id || dependency.state !== 'SUCCEEDED') {
                    dependenciesReady = false;
                    break;
                }
            }
            if (!dependenciesReady) {
                await this.#wait(event, 'DEPENDENCY_NOT_READY', signal, task.state);
                continue;
            }
            this.#launch(event, signal);
        }
    }
    #launch(event, signal) {
        const taskId = event.input.target.task_id;
        const work = this.#execute(event, signal);
        this.#active.set(taskId, work);
        this.#peak = Math.max(this.#peak, this.#active.size);
        void work.catch(error => { this.#failure = error; this.#running = false; }).finally(() => {
            this.#active.delete(taskId);
            this.#requestPump();
        });
    }
    async #execute(event, signal) {
        let claimed = await this.#write(event, 'DISPATCHING', 'TRUSTED_DISPATCH_INTENT', { dispatch_boot: this.#state.boot_id, attempts: event.attempts + 1 });
        try {
            let task = this.#adapter.inspectTask(event.input.target.task_id);
            invariant(task, 'EVENT_TASK_MISSING');
            this.#sameTask(event, task);
            if (!this.#running || !this.#enabled(task.subject)) {
                await this.#wait(claimed, 'STOPPED_OR_FEATURE_BLOCKED_BEFORE_DISPATCH', signal, task.state);
                return;
            }
            if (task.state === 'WAITING') {
                invariant(event.input.kind === 'MESSAGE_DELIVERABLE' && task.reason === 'WAIT' && task.pending_tool === null && task.reservation_id === null, 'EVENT_UNSAFE_RESUME');
                await this.#adapter.resume(task.id);
                task = this.#adapter.inspectTask(task.id);
                invariant(task, 'EVENT_TASK_MISSING');
                this.#sameTask(event, task);
            }
            if (!this.#running || !this.#enabled(task.subject) || !['QUEUED', 'WAITING_RESOURCES'].includes(task.state)) {
                await this.#wait(claimed, 'STOPPED_OR_TASK_CHANGED_BEFORE_DISPATCH', signal, task.state);
                return;
            }
            // The Host's existing dispatch performs inbox leases, atomic handoff, gate, budget and Tool Gateway checks.
            const result = await this.#adapter.dispatch(task.id);
            this.#sameTask(event, result);
            if (result.state === 'UNKNOWN_QUARANTINED' || ['RUNNING', 'DISPATCHING', 'STOPPING'].includes(result.state)) {
                await this.#write(claimed, 'INDETERMINATE', 'DISPATCH_RESULT_UNKNOWN_NO_AUTOMATIC_REPLAY', { task_state: result.state });
            }
            else if (result.state === 'QUEUED' || result.state === 'WAITING_RESOURCES') {
                // Preserve the signal observed before dispatch: a capacity/completion event may arrive while the call is awaiting.
                await this.#wait(claimed, result.reason ?? 'DISPATCH_PRECONDITION_WAIT', signal, result.state);
            }
            else if (event.input.message_id && !result.received_message_ids.includes(event.input.message_id)) {
                await this.#write(claimed, 'BLOCKED', 'DISPATCH_RETURNED_WITHOUT_MESSAGE_ADOPTION', { task_state: result.state });
                this.#signal++;
            }
            else {
                await this.#write(claimed, result.state === 'CANCELLED' ? 'CANCELLED' : 'SETTLED', 'DISPATCH_RETURNED_' + result.state + '_NOT_GATE_ACCEPTANCE', { task_state: result.state });
                this.#signal++;
            }
        }
        catch (error) {
            if (this.#state.faulted)
                throw error;
            claimed = this.#state.get(KIND, event.id);
            if (claimed.state === 'DISPATCHING')
                await this.#write(claimed, 'INDETERMINATE', 'TRUSTED_DISPATCH_FAILED_RECONCILIATION_REQUIRED');
        }
    }
}
