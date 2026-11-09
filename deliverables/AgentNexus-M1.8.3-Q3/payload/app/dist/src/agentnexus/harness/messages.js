import { auditEvent, canonical, invariant, sha256, uid } from '../types.js';
import { hostSubject, identifier, identityOf, snapshot, subject as validateSubject } from './contracts.js';
import { ContextAssembly } from './context.js';
const PENDING = ['QUEUED', 'LEASED', 'INDETERMINATE'];
const MAX_RECORDS = 4096;
/** Host-bound, persistent at-least-once internal delivery; external effects require reconciliation. */
export class MessageBus {
    #state;
    #options;
    #context;
    #lastWall = Date.now();
    #clockFault = false;
    constructor(state, options) {
        invariant(typeof options.resolve === 'function' && typeof options.authorize === 'function', 'MESSAGE_AUTHORITY_REQUIRED');
        for (const [value, min, max] of [[options.maxPending ?? 256, 1, 1024], [options.maxBytes ?? 4 * 1024 * 1024, 1, 16 * 1024 * 1024],
            [options.leaseMs ?? 30000, 1, 60000], [options.maxAttempts ?? 3, 1, 8]])
            invariant(Number.isSafeInteger(value) && value >= min && value <= max, 'MESSAGE_LIMIT');
        this.#state = state;
        this.#options = { ...options };
        this.#context = new ContextAssembly(state, { readTask: options.readTask });
    }
    #now() {
        const wall = Date.now();
        if (wall < this.#lastWall - 100)
            this.#clockFault = true;
        this.#lastWall = Math.max(wall, this.#lastWall);
        invariant(!this.#clockFault, 'MESSAGE_CLOCK_INVALID');
        return wall;
    }
    #current(s) {
        validateSubject(s);
        const resolved = this.#options.resolve(s.agent_id, s.project_id);
        invariant(resolved && canonical(resolved) === canonical(s), 'MESSAGE_STALE_BINDING');
        return s;
    }
    #all(projectId) {
        const output = [];
        let after;
        for (;;) {
            const page = this.#state.list('MESSAGE', { ...(projectId ? { project_id: projectId } : {}), ...(after ? { after } : {}), limit: 100 });
            output.push(...page);
            invariant(output.length <= MAX_RECORDS, 'MESSAGE_CAPACITY');
            if (page.length < 100)
                return output;
            after = page.at(-1).message_id;
        }
    }
    #write(message, changes) {
        const next = snapshot({ ...message, ...changes, revision: message.revision + 1 });
        this.#state.update('MESSAGE', message.message_id, message.revision, next.delivery_state, next);
        return next;
    }
    #clearLease = { lease_token: null, lease_boot: null, lease_until: null, lease_deadline_mono: null };
    #sweep(projectId, wall, limit = 32) {
        let transitions = 0;
        for (const message of this.#all(projectId)) {
            if (transitions >= limit)
                break;
            if (!PENDING.includes(message.delivery_state) || message.delivery_state === 'INDETERMINATE')
                continue;
            const leaseExpired = message.delivery_state === 'LEASED' && (message.lease_boot !== this.#state.boot_id ||
                wall >= message.lease_until || performance.now() >= message.lease_deadline_mono);
            const expired = wall >= message.expires_at;
            if (!leaseExpired && !expired)
                continue;
            const uncertain = message.delivery_state === 'LEASED' && message.effect === 'EXTERNAL';
            const delivery_state = uncertain ? 'INDETERMINATE' : expired ? 'EXPIRED' :
                message.attempts >= (this.#options.maxAttempts ?? 3) ? 'DEAD_LETTER' : 'QUEUED';
            this.#write(message, { delivery_state, ...this.#clearLease,
                available_at: wall + (delivery_state === 'QUEUED' ? Math.min(1000, 10 * 2 ** message.attempts) : 0) });
            this.#state.store.audit(auditEvent(identityOf({ ...hostSubject(this.#state.boot_id), project_id: message.project_id, task_id: message.task_id }), { operation_id: message.operation_id ?? message.message_id,
                operation_type: 'AGENT_MESSAGE', phase: 'MESSAGE_RECOVERY_TRANSITION', detail: { message_id: message.message_id, task_id: message.task_id,
                    correlation_id: message.correlation_id, previous_state: message.delivery_state, delivery_state, automatic_external_retry: false } }));
            transitions++;
        }
        return transitions;
    }
    #lease(s, messageId, token) {
        identifier(messageId);
        identifier(token);
        const message = this.#state.get('MESSAGE', messageId);
        invariant(message && message.project_id === s.project_id && message.receiver.agent_id === s.agent_id &&
            message.receiver.task_id === s.task_id && message.receiver.session_id === s.session_id, 'MESSAGE_RECEIVER_DENIED');
        invariant(message.delivery_state === 'LEASED' && message.lease_token === token && message.lease_boot === this.#state.boot_id &&
            this.#now() < message.lease_until && performance.now() < message.lease_deadline_mono, 'MESSAGE_LEASE_STALE');
        invariant(this.#now() < message.expires_at, 'MESSAGE_EXPIRED');
        return message;
    }
    #receiver(s, message) {
        this.#current(s);
        invariant(message.project_id === s.project_id && message.receiver.agent_id === s.agent_id && message.task_id === s.task_id, 'MESSAGE_RECEIVER_DENIED');
        invariant(this.#options.authorize(message.sender, s, message.message_type) === true, 'MESSAGE_PERMISSION_DENIED');
    }
    #task(s) {
        const task = this.#state.get('TASK', s.task_id);
        invariant(task && task.id === s.task_id && canonical(task.subject) === canonical(s), 'MESSAGE_TASK_SCOPE');
        return task;
    }
    #operationId(message) {
        return sha256(canonical({ project_id: message.project_id, task_id: message.task_id, operation_id: message.operation_id ?? message.message_id }));
    }
    #signature(message) {
        return sha256(canonical({ sender: { agent_id: message.sender.agent_id, project_id: message.sender.project_id, task_id: message.sender.task_id },
            receiver_agent_id: message.receiver.agent_id, task_id: message.task_id, message_type: message.message_type, payload: message.payload, correlation_id: message.correlation_id }));
    }
    /** Narrow Host-only cross-project advisory lane with no command, tool, grant or external-effect API. */
    async enqueueCoordinatorNotice(admin, sender, receiver, payload, dedupKey) {
        this.#state.checkAdmin(admin);
        const origin = snapshot(sender), target = snapshot(receiver);
        this.#current(origin);
        this.#current(target);
        identifier(dedupKey);
        invariant(origin.agent_type === 'COORDINATOR', 'MESSAGE_COORDINATOR_REQUIRED');
        this.#state.require('native.message-bus', origin);
        this.#state.require('native.message-bus', target);
        invariant(this.#options.authorize(origin, target, 'COORDINATOR_NOTICE') === true, 'MESSAGE_PERMISSION_DENIED');
        const source = this.#context.validate(target, payload);
        invariant(source.project_id === target.project_id && source.task_id === target.task_id, 'MESSAGE_TASK_SCOPE');
        const logicalOrigin = { agent_id: origin.agent_id, project_id: origin.project_id, task_id: origin.task_id }, logicalTarget = { agent_id: target.agent_id, project_id: target.project_id, task_id: target.task_id };
        const id = sha256(canonical({ sender: logicalOrigin, receiver: logicalTarget, message_type: 'COORDINATOR_NOTICE', dedup_key: dedupKey })), requestHash = sha256(canonical({ sender: logicalOrigin, receiver: logicalTarget, message_type: 'COORDINATOR_NOTICE', dedup_key: dedupKey,
            payload_sha256: source.payload_ref.sha256, offset: source.offset, length: source.length })), wall = this.#now();
        const message = await this.#state.change(origin, 'MESSAGE_COORDINATOR_NOTICE_ENQUEUED', () => {
            this.#current(origin);
            this.#current(target);
            this.#state.require('native.message-bus', origin);
            this.#state.require('native.message-bus', target);
            invariant(this.#options.authorize(origin, target, 'COORDINATOR_NOTICE') === true, 'MESSAGE_PERMISSION_DENIED');
            this.#context.validate(target, source);
            this.#sweep(target.project_id, wall);
            const old = this.#state.get('MESSAGE', id);
            if (old) {
                invariant(old.request_hash === requestHash, 'MESSAGE_DEDUP_CONFLICT');
                return old;
            }
            invariant(this.#state.count('MESSAGE') < MAX_RECORDS, 'MESSAGE_CAPACITY');
            const pending = this.#all(target.project_id).filter(message => PENDING.includes(message.delivery_state));
            invariant(pending.length < (this.#options.maxPending ?? 256) && pending.reduce((bytes, message) => bytes + message.payload.length, 0) + source.length <= (this.#options.maxBytes ?? 4 * 1024 * 1024), 'MESSAGE_BACKPRESSURE');
            const created = { message_id: id, sender: origin, receiver: target, project_id: target.project_id, task_id: target.task_id, session_id: target.session_id,
                message_type: 'COORDINATOR_NOTICE', payload: source, priority: 0, created_at: wall, expires_at: wall + 300000, correlation_id: id, operation_id: id, effect: 'INTERNAL',
                dedup_key: dedupKey, request_hash: requestHash, sequence: this.#state.count('MESSAGE') + 1, delivered_at: null, acknowledged_at: null,
                delivery_state: 'QUEUED', attempts: 0, available_at: wall, ...this.#clearLease, revision: 0 };
            this.#state.insert('MESSAGE', id, target, 'QUEUED', created);
            this.#state.insert('MESSAGE_WAKE', id, target, 'PENDING', { revision: 0, message_id: id, state: 'PENDING', attempts: 0 });
            this.#state.store.audit(auditEvent(identityOf(target), { operation_id: id, operation_type: 'COORDINATOR_NOTICE', phase: 'MESSAGE_COORDINATOR_NOTICE_BOUND',
                context_event_refs: [source.event_id], detail: { message_id: id, origin, receiver: target, payload_record_hash: source.record_hash,
                    advisory_only: true, external_effect: false, cross_project_raw_read_granted: false } }));
            return snapshot(created);
        }, { message_id: id, origin_project: origin.project_id, receiver_project: target.project_id, receiver_task: target.task_id, advisory_only: true }, id);
        if (message.delivery_state === 'QUEUED')
            await this.#notify(message);
        return message;
    }
    /** Trusted, synchronous task adoption + receipt + message ACK in one existing SQLite/outbox transaction. */
    async handoff(admin, receiver, messageId, leaseToken, apply) {
        this.#state.checkAdmin(admin);
        validateSubject(receiver);
        const s = snapshot(receiver);
        identifier(messageId);
        identifier(leaseToken);
        invariant(typeof apply === 'function', 'MESSAGE_HANDOFF_REQUIRED');
        this.#current(s);
        return this.#state.change(s, 'MESSAGE_TASK_HANDOFF', () => {
            const message = this.#state.get('MESSAGE', messageId);
            invariant(message, 'MESSAGE_UNKNOWN');
            this.#receiver(s, message);
            const existing = this.#state.get('MESSAGE_HANDOFF', messageId);
            if (existing) {
                invariant(message.delivery_state === 'ACKNOWLEDGED' && existing.task_id === s.task_id && existing.project_id === s.project_id &&
                    existing.receiver_agent_id === s.agent_id && existing.payload_record_hash === message.payload.record_hash &&
                    existing.operation_id === (message.operation_id ?? message.message_id) && existing.correlation_id === message.correlation_id, 'MESSAGE_HANDOFF_CONFLICT');
                // The old token is deliberately not reused as execution authority. Current resolver + logical scope remain mandatory.
                return existing;
            }
            this.#state.require('native.message-bus', s);
            const leased = this.#lease(s, messageId, leaseToken);
            this.#context.validate(s, leased.payload);
            let task = this.#task(s);
            invariant(this.#state.count('MESSAGE_HANDOFF', { project_id: s.project_id, task_id: s.task_id }) < 32, 'MESSAGE_HANDOFF_LIMIT');
            const operationId = this.#operationId(leased), operation = this.#state.get('MESSAGE_OPERATION', operationId);
            let duplicateOf = null;
            if (operation) {
                invariant(operation.signature === this.#signature(leased), 'MESSAGE_OPERATION_CONFLICT');
                duplicateOf = operation.message_id;
            }
            else {
                invariant(!['SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT', 'UNKNOWN_QUARANTINED'].includes(task.state), 'MESSAGE_TASK_TERMINAL');
                const applied = apply(snapshot(leased));
                invariant(!applied || typeof applied.then !== 'function', 'MESSAGE_ASYNC_HANDOFF');
                task = this.#task(s);
                invariant(task.received_message_ids.includes(messageId) && task.history.some(source => canonical(source) === canonical(leased.payload)), 'MESSAGE_TASK_HANDOFF_INCOMPLETE');
                this.#state.insert('MESSAGE_OPERATION', operationId, s, 'ACCEPTED', { revision: 0, message_id: messageId, signature: this.#signature(leased) });
            }
            const receipt = { revision: 0, message_id: messageId, project_id: s.project_id, receiver_agent_id: s.agent_id, task_id: s.task_id,
                operation_id: leased.operation_id ?? leased.message_id, correlation_id: leased.correlation_id, payload_record_hash: leased.payload.record_hash,
                state: 'ACCEPTED', accepted_at: this.#now(), accepted_turns: task.turns, task_revision: task.revision, result_ref: null, duplicate_of: duplicateOf };
            this.#state.insert('MESSAGE_HANDOFF', messageId, s, receipt.state, receipt);
            this.#write(leased, { delivery_state: 'ACKNOWLEDGED', acknowledged_at: this.#now(), ...this.#clearLease });
            return snapshot(receipt);
        }, { message_id: messageId, task_id: s.task_id, delivery_ack_is_not_task_completion: true }, messageId);
    }
    /** Compute progress from the trusted task projection, never an Agent-supplied PASS/completed label. */
    async reconcileTask(admin, actor, taskId) {
        this.#state.checkAdmin(admin);
        validateSubject(actor);
        actor = snapshot(actor);
        identifier(taskId);
        invariant(taskId === actor.task_id, 'MESSAGE_TASK_SCOPE');
        const task = this.#task(actor), receipts = this.#state.list('MESSAGE_HANDOFF', { project_id: actor.project_id, task_id: taskId, limit: 100 });
        invariant(receipts.length <= 32, 'MESSAGE_HANDOFF_LIMIT');
        if (task.state === 'SUCCEEDED') {
            invariant(task.result_ref && task.reservation_id === null, 'MESSAGE_TASK_COMPLETION_EVIDENCE');
            await this.#context.readRange(actor, task.result_ref); // Actual result bytes pass the complete Artifact/Zstd hash barrier.
        }
        return this.#state.change(actor, 'MESSAGE_TASK_RECONCILED', () => {
            const current = this.#task(actor);
            invariant(current.revision === task.revision, 'MESSAGE_TASK_REVISION_CONFLICT');
            return receipts.map(previous => {
                const old = this.#state.get('MESSAGE_HANDOFF', previous.message_id);
                invariant(old.revision === previous.revision, 'MESSAGE_HANDOFF_CONFLICT');
                if (['COMPLETED', 'FAILED', 'INDETERMINATE'].includes(old.state))
                    return old;
                const state = current.state === 'UNKNOWN_QUARANTINED' ? 'INDETERMINATE' : current.state === 'SUCCEEDED' ? 'COMPLETED' :
                    ['FAILED', 'CANCELLED', 'TIMED_OUT'].includes(current.state) ? 'FAILED' : current.turns > old.accepted_turns ? 'PROCESSED' : 'ACCEPTED';
                if (state === old.state && old.task_revision === current.revision)
                    return old;
                const next = { ...old, state, task_revision: current.revision, result_ref: state === 'COMPLETED' ? current.result_ref : null, revision: old.revision + 1 };
                this.#state.update('MESSAGE_HANDOFF', old.message_id, old.revision, state, next);
                return snapshot(next);
            });
        }, { task_id: taskId, task_state: task.state, task_revision: task.revision, receipts: receipts.length }, taskId);
    }
    async #notify(message) {
        const wake = this.#state.get('MESSAGE_WAKE', message.message_id);
        if (!wake || wake.state === 'NOTIFIED' || wake.attempts >= 8 || this.#now() >= message.expires_at)
            return false;
        const receiver = this.#options.resolve(message.receiver.agent_id, message.project_id);
        if (!receiver || receiver.task_id !== message.task_id || this.#options.authorize(message.sender, receiver, message.message_type) !== true)
            return false;
        let notified = false;
        try {
            await this.#options.onDeliverable?.(snapshot(receiver), message.message_id);
            notified = true;
        }
        catch { /* Durable pending wake survives sender exit and restart. */ }
        await this.#state.change(hostSubject(this.#state.boot_id), notified ? 'MESSAGE_WAKE_NOTIFIED' : 'MESSAGE_WAKE_PENDING', () => {
            const current = this.#state.get('MESSAGE_WAKE', message.message_id);
            if (current.state === 'NOTIFIED')
                return;
            this.#state.update('MESSAGE_WAKE', message.message_id, current.revision, notified ? 'NOTIFIED' : 'PENDING', { ...current, revision: current.revision + 1, state: notified ? 'NOTIFIED' : 'PENDING', attempts: current.attempts + 1 });
        }, { message_id: message.message_id, receiver: receiver.agent_id, task_id: message.task_id, operation_id: message.operation_id ?? message.message_id }, message.message_id);
        return notified;
    }
    /** Explicit host recovery; at most 32 wake attempts. No model/tool/task is executed by this method. */
    async recover(admin, limit = 32) {
        this.#state.checkAdmin(admin);
        invariant(Number.isSafeInteger(limit) && limit >= 1 && limit <= 32, 'MESSAGE_RECOVERY_LIMIT');
        const wall = this.#now();
        await this.#state.change(hostSubject(this.#state.boot_id), 'MESSAGE_RECOVERED', () => {
            const messages = this.#all();
            let remaining = 32;
            for (const project of new Set(messages.map(message => message.project_id))) {
                if (!remaining)
                    break;
                remaining -= this.#sweep(project, wall, remaining);
            }
            for (const message of messages)
                if (message.delivery_state === 'QUEUED' && !this.#state.get('MESSAGE_WAKE', message.message_id))
                    this.#state.insert('MESSAGE_WAKE', message.message_id, message.receiver, 'PENDING', { revision: 0, message_id: message.message_id, state: 'PENDING', attempts: 0 });
        }, { host_boot_id: this.#state.boot_id, automatic_execution: false });
        let wakes = 0, attempted = 0;
        for (const message of this.#all()) {
            if (attempted >= limit)
                break;
            if (message.delivery_state !== 'QUEUED' || this.#state.get('MESSAGE_WAKE', message.message_id)?.state !== 'PENDING')
                continue;
            attempted++;
            if (await this.#notify(message))
                wakes++;
        }
        return { wakes, pending: this.#state.count('MESSAGE_WAKE', { state: 'PENDING' }) };
    }
    bind(candidate) {
        const s = snapshot(candidate);
        this.#current(s);
        return Object.freeze({
            send: async (input) => {
                this.#current(s);
                this.#state.require('native.message-bus', s);
                const request = snapshot(input);
                invariant(Object.keys(request).every(k => ['receiver_agent_id', 'message_type', 'payload', 'dedup_key', 'priority', 'expires_at', 'correlation_id', 'effect', 'task_id', 'operation_id'].includes(k)), 'MESSAGE_FIELDS');
                identifier(request.receiver_agent_id);
                identifier(request.message_type);
                identifier(request.dedup_key);
                if (request.correlation_id !== undefined)
                    identifier(request.correlation_id);
                if (request.operation_id !== undefined)
                    identifier(request.operation_id);
                if (request.task_id !== undefined)
                    identifier(request.task_id);
                invariant(request.effect === undefined || ['INTERNAL', 'EXTERNAL'].includes(request.effect), 'MESSAGE_EFFECT');
                const receiver = this.#options.resolve(request.receiver_agent_id, s.project_id);
                invariant(receiver && receiver.project_id === s.project_id, 'MESSAGE_PROJECT_DENIED');
                validateSubject(receiver);
                const target = snapshot(receiver);
                invariant(request.task_id === undefined || request.task_id === target.task_id, 'MESSAGE_TASK_SCOPE');
                invariant(this.#options.authorize(s, target, request.message_type) === true, 'MESSAGE_PERMISSION_DENIED');
                const payload = this.#context.validate(s, request.payload), wall = this.#now(), priority = request.priority ?? 0, expires = request.expires_at ?? wall + 300000;
                invariant(Number.isSafeInteger(priority) && priority >= 0 && priority <= 9 && Number.isSafeInteger(expires) && expires > wall && expires <= wall + 86400000, 'MESSAGE_ENVELOPE');
                const id = sha256(canonical({ sender: { agent_id: s.agent_id, project_id: s.project_id, task_id: s.task_id }, dedup_key: request.dedup_key }));
                const hash = sha256(canonical(request));
                const message = await this.#state.change(s, 'MESSAGE_ENQUEUED', () => {
                    this.#current(s);
                    this.#state.require('native.message-bus', s);
                    this.#sweep(s.project_id, wall);
                    invariant(canonical(this.#options.resolve(target.agent_id, target.project_id)) === canonical(target), 'MESSAGE_STALE_BINDING');
                    invariant(this.#options.authorize(s, target, request.message_type) === true, 'MESSAGE_PERMISSION_DENIED');
                    this.#context.validate(s, payload);
                    const old = this.#state.get('MESSAGE', id);
                    if (old) {
                        invariant(old.request_hash === hash, 'MESSAGE_DEDUP_CONFLICT');
                        if (old.delivery_state === 'QUEUED' && !this.#state.get('MESSAGE_WAKE', id))
                            this.#state.insert('MESSAGE_WAKE', id, s, 'PENDING', { revision: 0, message_id: id, state: 'PENDING', attempts: 0 });
                        return old;
                    }
                    invariant(this.#state.count('MESSAGE') < MAX_RECORDS, 'MESSAGE_CAPACITY');
                    const pending = this.#all(s.project_id).filter(message => PENDING.includes(message.delivery_state));
                    invariant(pending.length < (this.#options.maxPending ?? 256) && pending.reduce((n, message) => n + message.payload.length, 0) + payload.length <= (this.#options.maxBytes ?? 4 * 1024 * 1024), 'MESSAGE_BACKPRESSURE');
                    const created = { message_id: id, sender: s, receiver: target, project_id: s.project_id, task_id: target.task_id, session_id: target.session_id,
                        message_type: request.message_type, payload, priority, created_at: wall, expires_at: expires, correlation_id: request.correlation_id ?? request.operation_id ?? id, effect: request.effect ?? 'INTERNAL',
                        operation_id: request.operation_id ?? id, sequence: this.#state.count('MESSAGE') + 1, delivered_at: null, acknowledged_at: null,
                        dedup_key: request.dedup_key, request_hash: hash, delivery_state: 'QUEUED', attempts: 0, available_at: wall, lease_token: null,
                        lease_boot: null, lease_until: null, lease_deadline_mono: null, revision: 0 };
                    this.#state.insert('MESSAGE', id, s, 'QUEUED', created);
                    this.#state.insert('MESSAGE_WAKE', id, s, 'PENDING', { revision: 0, message_id: id, state: 'PENDING', attempts: 0 });
                    return snapshot(created);
                }, { message_id: id, receiver: target.agent_id, payload_event_id: payload.event_id }, id);
                // Only after NativeState's DB+archive ACK. Callback failure cannot delete or unacknowledge the durable message.
                if (message.delivery_state === 'QUEUED')
                    await this.#notify(message);
                return message;
            },
            receive: async (options = {}) => {
                this.#current(s);
                this.#state.require('native.message-bus', s);
                const limit = options.limit ?? 1;
                invariant(Object.keys(options).every(k => k === 'limit') && Number.isSafeInteger(limit) && limit >= 1 && limit <= 16, 'MESSAGE_RECEIVE_LIMIT');
                const wall = this.#now();
                return this.#state.change(s, 'MESSAGE_LEASED', () => {
                    this.#current(s);
                    this.#sweep(s.project_id, wall);
                    for (const message of this.#all(s.project_id)) {
                        if (message.delivery_state !== 'QUEUED' || message.effect !== 'INTERNAL' || message.receiver.agent_id !== s.agent_id ||
                            message.receiver.task_id !== s.task_id || message.receiver.session_id === s.session_id || message.receiver.runtime_instance_id === s.runtime_instance_id ||
                            this.#options.authorize(message.sender, s, message.message_type) !== true)
                            continue;
                        // A trusted resolver selected the replacement runtime for this logical receiver. Rebinding is itself a durable fact.
                        this.#write(message, { receiver: s, session_id: s.session_id });
                        this.#state.store.audit(auditEvent({ agent_id: s.agent_id, project_id: s.project_id, task_id: s.task_id, session_id: s.session_id }, { operation_id: message.message_id, operation_type: 'AGENT_MESSAGE', phase: 'MESSAGE_RECEIVER_REBOUND',
                            detail: { message_id: message.message_id, old_session_id: message.receiver.session_id, new_session_id: s.session_id,
                                old_runtime_instance_id: message.receiver.runtime_instance_id, new_runtime_instance_id: s.runtime_instance_id, external_effect_replayed: false } }));
                    }
                    return this.#all(s.project_id).filter(message => message.delivery_state === 'QUEUED' && message.receiver.agent_id === s.agent_id &&
                        message.receiver.task_id === s.task_id && message.receiver.session_id === s.session_id && message.available_at <= wall && wall < message.expires_at &&
                        this.#options.authorize(message.sender, s, message.message_type) === true)
                        .sort((a, b) => b.priority - a.priority || (a.sequence ?? a.created_at) - (b.sequence ?? b.created_at) || a.message_id.localeCompare(b.message_id)).slice(0, limit)
                        .map(message => {
                        this.#context.validate(s, message.payload);
                        return this.#write(message, { delivery_state: 'LEASED', attempts: message.attempts + 1, lease_token: uid(), delivered_at: wall,
                            lease_boot: this.#state.boot_id, lease_until: wall + (this.#options.leaseMs ?? 30000), lease_deadline_mono: performance.now() + (this.#options.leaseMs ?? 30000) });
                    });
                }, { limit });
            },
            ack: async (messageId, leaseToken) => {
                this.#current(s);
                return this.#state.change(s, 'MESSAGE_ACKNOWLEDGED', () => {
                    const message = this.#lease(s, messageId, leaseToken);
                    this.#receiver(s, message);
                    return this.#write(message, { delivery_state: 'ACKNOWLEDGED', acknowledged_at: this.#now(), ...this.#clearLease });
                }, { message_id: messageId, task_complete: false }, messageId);
            },
            retry: async (messageId, leaseToken, outcome) => {
                this.#current(s);
                invariant(['KNOWN_NOT_SENT', 'UNKNOWN'].includes(outcome), 'MESSAGE_RETRY_OUTCOME');
                return this.#state.change(s, 'MESSAGE_RETRY_RECORDED', () => {
                    const old = this.#lease(s, messageId, leaseToken);
                    const delivery_state = outcome === 'UNKNOWN' || old.effect === 'EXTERNAL' ? 'INDETERMINATE' : old.attempts >= (this.#options.maxAttempts ?? 3) ? 'DEAD_LETTER' : 'QUEUED';
                    return this.#write(old, { delivery_state, lease_token: null, lease_boot: null, lease_until: null, lease_deadline_mono: null,
                        available_at: this.#now() + Math.min(1000, 10 * 2 ** old.attempts) });
                }, { message_id: messageId, outcome }, messageId);
            },
            revoke: async (messageId) => {
                this.#current(s);
                identifier(messageId);
                return this.#state.change(s, 'MESSAGE_REVOKED', () => {
                    const old = this.#state.get('MESSAGE', messageId);
                    invariant(old && old.sender.agent_id === s.agent_id && old.sender.project_id === s.project_id && old.sender.task_id === s.task_id, 'MESSAGE_SENDER_DENIED');
                    invariant(['QUEUED', 'LEASED'].includes(old.delivery_state), 'MESSAGE_TERMINAL');
                    return this.#write(old, { delivery_state: old.delivery_state === 'LEASED' && old.effect === 'EXTERNAL' ? 'INDETERMINATE' : 'REVOKED', lease_token: null, lease_boot: null, lease_until: null, lease_deadline_mono: null });
                }, { message_id: messageId }, messageId);
            },
        });
    }
}
