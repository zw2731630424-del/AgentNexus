import { auditEvent, canonical, invariant, sha256, uid } from '../types.ts';
import { identifier, snapshot, subject as validateSubject } from './contracts.ts';
import type { Subject } from './contracts.ts';
import { ContextAssembly } from './context.ts';
import type { ContextSource } from './context.ts';
import type { NativeState } from './state.ts';

export type DeliveryState = 'QUEUED' | 'LEASED' | 'ACKNOWLEDGED' | 'EXPIRED' | 'REVOKED' | 'DEAD_LETTER' | 'INDETERMINATE';
export type MessageSend = {
  receiver_agent_id: string; message_type: string; payload: ContextSource; dedup_key: string;
  priority?: number; expires_at?: number; correlation_id?: string; effect?: 'INTERNAL' | 'EXTERNAL';
};
export type AgentMessage = {
  message_id: string; sender: Subject; receiver: Subject; project_id: string; task_id: string; session_id: string;
  message_type: string; payload: ContextSource; priority: number; created_at: number; expires_at: number;
  correlation_id: string; effect: 'INTERNAL' | 'EXTERNAL'; dedup_key: string; request_hash: string;
  delivery_state: DeliveryState; attempts: number; available_at: number; lease_token: string | null;
  lease_boot: string | null; lease_until: number | null; lease_deadline_mono: number | null; revision: number;
};
export type MessageBusOptions = {
  resolve: (agentId: string, projectId: string) => Subject | null;
  authorize: (sender: Subject, receiver: Subject, messageType: string) => boolean;
  readTask?: (subject: Subject, taskId: string) => boolean;
  maxPending?: number; maxBytes?: number; leaseMs?: number; maxAttempts?: number;
  onDeliverable?: (receiver: Subject, messageId: string) => Promise<void> | void;
};
const PENDING: DeliveryState[] = ['QUEUED','LEASED','INDETERMINATE'];
const MAX_RECORDS = 4096;

/** Host-bound, persistent at-least-once internal delivery; external effects require reconciliation. */
export class MessageBus {
  #state: NativeState; #options: MessageBusOptions; #context: ContextAssembly;
  #lastWall = Date.now(); #clockFault = false;
  constructor(state: NativeState, options: MessageBusOptions) {
    invariant(typeof options.resolve === 'function' && typeof options.authorize === 'function', 'MESSAGE_AUTHORITY_REQUIRED');
    for (const [value, min, max] of [[options.maxPending ?? 256,1,1024],[options.maxBytes ?? 4*1024*1024,1,16*1024*1024],
      [options.leaseMs ?? 30000,1,60000],[options.maxAttempts ?? 3,1,8]]) invariant(Number.isSafeInteger(value) && value >= min && value <= max, 'MESSAGE_LIMIT');
    this.#state = state; this.#options = { ...options }; this.#context = new ContextAssembly(state, { readTask: options.readTask });
  }
  #now(): number {
    const wall = Date.now(); if (wall < this.#lastWall - 100) this.#clockFault = true;
    this.#lastWall = Math.max(wall, this.#lastWall); invariant(!this.#clockFault, 'MESSAGE_CLOCK_INVALID'); return wall;
  }
  #current(s: Subject): Subject {
    validateSubject(s);
    const resolved = this.#options.resolve(s.agent_id, s.project_id);
    invariant(resolved && canonical(resolved) === canonical(s), 'MESSAGE_STALE_BINDING'); return s;
  }
  #all(projectId?: string): AgentMessage[] {
    const output: AgentMessage[] = []; let after: string | undefined;
    for (;;) {
      const page = this.#state.list<AgentMessage>('MESSAGE', { ...(projectId ? { project_id: projectId } : {}), ...(after ? { after } : {}), limit: 100 });
      output.push(...page); invariant(output.length <= MAX_RECORDS, 'MESSAGE_CAPACITY');
      if (page.length < 100) return output; after = page.at(-1)!.message_id;
    }
  }
  #write(message: AgentMessage, changes: Partial<AgentMessage>): AgentMessage {
    const next = snapshot({ ...message, ...changes, revision: message.revision + 1 });
    this.#state.update('MESSAGE', message.message_id, message.revision, next.delivery_state, next); return next;
  }
  #sweep(projectId: string, wall: number): void {
    for (const message of this.#all(projectId)) {
      if (!PENDING.includes(message.delivery_state) || message.delivery_state === 'INDETERMINATE') continue;
      const leaseExpired = message.delivery_state === 'LEASED' && (message.lease_boot !== this.#state.boot_id ||
        wall >= message.lease_until! || performance.now() >= message.lease_deadline_mono!);
      const expired = wall >= message.expires_at;
      if (!leaseExpired && !expired) continue;
      const uncertain = message.delivery_state === 'LEASED' && message.effect === 'EXTERNAL';
      const delivery_state: DeliveryState = uncertain ? 'INDETERMINATE' : expired ? 'EXPIRED' :
        message.attempts >= (this.#options.maxAttempts ?? 3) ? 'DEAD_LETTER' : 'QUEUED';
      this.#write(message, { delivery_state, lease_token: null, lease_boot: null, lease_until: null, lease_deadline_mono: null,
        available_at: wall + (delivery_state === 'QUEUED' ? Math.min(1000, 10 * 2 ** message.attempts) : 0) });
    }
  }
  #lease(s: Subject, messageId: string, token: string): AgentMessage {
    identifier(messageId); identifier(token); const message = this.#state.get<AgentMessage>('MESSAGE', messageId);
    invariant(message && message.project_id === s.project_id && message.receiver.agent_id === s.agent_id &&
      message.receiver.task_id === s.task_id && message.receiver.session_id === s.session_id, 'MESSAGE_RECEIVER_DENIED');
    invariant(message.delivery_state === 'LEASED' && message.lease_token === token && message.lease_boot === this.#state.boot_id &&
      this.#now() < message.lease_until! && performance.now() < message.lease_deadline_mono!, 'MESSAGE_LEASE_STALE');
    invariant(this.#now() < message.expires_at, 'MESSAGE_EXPIRED'); return message;
  }
  bind(candidate: Subject) {
    const s = snapshot(candidate); this.#current(s);
    return Object.freeze({
      send: async (input: MessageSend): Promise<AgentMessage> => {
        this.#current(s); this.#state.require('native.message-bus', s);
        const request = snapshot(input);
        invariant(Object.keys(request).every(k => ['receiver_agent_id','message_type','payload','dedup_key','priority','expires_at','correlation_id','effect'].includes(k)), 'MESSAGE_FIELDS');
        identifier(request.receiver_agent_id); identifier(request.message_type); identifier(request.dedup_key);
        if (request.correlation_id !== undefined) identifier(request.correlation_id);
        invariant(request.effect === undefined || ['INTERNAL','EXTERNAL'].includes(request.effect), 'MESSAGE_EFFECT');
        const receiver = this.#options.resolve(request.receiver_agent_id, s.project_id);
        invariant(receiver && receiver.project_id === s.project_id, 'MESSAGE_PROJECT_DENIED');
        validateSubject(receiver); const target = snapshot(receiver);
        invariant(this.#options.authorize(s, target, request.message_type) === true, 'MESSAGE_PERMISSION_DENIED');
        const payload = this.#context.validate(s, request.payload), wall = this.#now(), priority = request.priority ?? 0,
          expires = request.expires_at ?? wall + 300000;
        invariant(Number.isSafeInteger(priority) && priority >= 0 && priority <= 9 && Number.isSafeInteger(expires) && expires > wall && expires <= wall + 86400000, 'MESSAGE_ENVELOPE');
        const id = sha256(canonical({ sender: { agent_id: s.agent_id, project_id: s.project_id, task_id: s.task_id }, dedup_key: request.dedup_key }));
        const hash = sha256(canonical(request));
        const message = await this.#state.change(s, 'MESSAGE_ENQUEUED', () => {
          this.#current(s); this.#state.require('native.message-bus', s); this.#sweep(s.project_id, wall);
          const old = this.#state.get<AgentMessage>('MESSAGE', id);
          if (old) { invariant(old.request_hash === hash, 'MESSAGE_DEDUP_CONFLICT'); return old; }
          invariant(this.#state.count('MESSAGE') < MAX_RECORDS, 'MESSAGE_CAPACITY');
          const pending = this.#all(s.project_id).filter(message => PENDING.includes(message.delivery_state));
          invariant(pending.length < (this.#options.maxPending ?? 256) && pending.reduce((n, message) => n + message.payload.length, 0) + payload.length <= (this.#options.maxBytes ?? 4*1024*1024), 'MESSAGE_BACKPRESSURE');
          const created: AgentMessage = { message_id: id, sender: s, receiver: target, project_id: s.project_id, task_id: target.task_id, session_id: target.session_id,
            message_type: request.message_type, payload, priority, created_at: wall, expires_at: expires, correlation_id: request.correlation_id ?? uid(), effect: request.effect ?? 'INTERNAL',
            dedup_key: request.dedup_key, request_hash: hash, delivery_state: 'QUEUED', attempts: 0, available_at: wall, lease_token: null,
            lease_boot: null, lease_until: null, lease_deadline_mono: null, revision: 0 };
          this.#state.insert('MESSAGE', id, s, 'QUEUED', created); return snapshot(created);
        }, { message_id: id, receiver: target.agent_id, payload_event_id: payload.event_id }, id);
        // Only after NativeState's DB+archive ACK. Callback failure cannot delete or unacknowledge the durable message.
        if (message.delivery_state === 'QUEUED') {
          try { await this.#options.onDeliverable?.(target, id); }
          catch { await this.#state.change(s, 'MESSAGE_WAKE_PENDING', () => {}, { message_id: id }, id); }
        }
        return message;
      },
      receive: async (options: { limit?: number } = {}): Promise<AgentMessage[]> => {
        this.#current(s); this.#state.require('native.message-bus', s);
        const limit = options.limit ?? 1; invariant(Object.keys(options).every(k => k === 'limit') && Number.isSafeInteger(limit) && limit >= 1 && limit <= 16, 'MESSAGE_RECEIVE_LIMIT');
        const wall = this.#now();
        return this.#state.change(s, 'MESSAGE_LEASED', () => {
          this.#current(s); this.#sweep(s.project_id, wall);
          for (const message of this.#all(s.project_id)) {
            if (message.delivery_state !== 'QUEUED' || message.effect !== 'INTERNAL' || message.receiver.agent_id !== s.agent_id ||
              message.receiver.task_id !== s.task_id || message.receiver.session_id === s.session_id || message.receiver.runtime_instance_id === s.runtime_instance_id ||
              this.#options.authorize(message.sender,s,message.message_type) !== true) continue;
            // A trusted resolver selected the replacement runtime for this logical receiver. Rebinding is itself a durable fact.
            this.#write(message,{receiver:s,session_id:s.session_id});
            this.#state.store.audit(auditEvent({agent_id:s.agent_id,project_id:s.project_id,task_id:s.task_id,session_id:s.session_id},
              {operation_id:message.message_id,operation_type:'AGENT_MESSAGE',phase:'MESSAGE_RECEIVER_REBOUND',
                detail:{message_id:message.message_id,old_session_id:message.receiver.session_id,new_session_id:s.session_id,
                  old_runtime_instance_id:message.receiver.runtime_instance_id,new_runtime_instance_id:s.runtime_instance_id,external_effect_replayed:false}}));
          }
          return this.#all(s.project_id).filter(message => message.delivery_state === 'QUEUED' && message.receiver.agent_id === s.agent_id &&
            message.receiver.task_id === s.task_id && message.receiver.session_id === s.session_id && message.available_at <= wall &&
            this.#options.authorize(message.sender, s, message.message_type) === true)
            .sort((a,b) => b.priority - a.priority || a.created_at - b.created_at || a.message_id.localeCompare(b.message_id)).slice(0, limit)
            .map(message => this.#write(message, { delivery_state: 'LEASED', attempts: message.attempts + 1, lease_token: uid(),
              lease_boot: this.#state.boot_id, lease_until: wall + (this.#options.leaseMs ?? 30000), lease_deadline_mono: performance.now() + (this.#options.leaseMs ?? 30000) }));
        }, { limit });
      },
      ack: async (messageId: string, leaseToken: string): Promise<AgentMessage> => {
        this.#current(s);
        return this.#state.change(s, 'MESSAGE_ACKNOWLEDGED', () => this.#write(this.#lease(s, messageId, leaseToken),
          { delivery_state: 'ACKNOWLEDGED', lease_token: null, lease_boot: null, lease_until: null, lease_deadline_mono: null }), { message_id: messageId }, messageId);
      },
      retry: async (messageId: string, leaseToken: string, outcome: 'KNOWN_NOT_SENT' | 'UNKNOWN'): Promise<AgentMessage> => {
        this.#current(s); invariant(['KNOWN_NOT_SENT','UNKNOWN'].includes(outcome), 'MESSAGE_RETRY_OUTCOME');
        return this.#state.change(s, 'MESSAGE_RETRY_RECORDED', () => {
          const old = this.#lease(s, messageId, leaseToken);
          const delivery_state: DeliveryState = outcome === 'UNKNOWN' || old.effect === 'EXTERNAL' ? 'INDETERMINATE' : old.attempts >= (this.#options.maxAttempts ?? 3) ? 'DEAD_LETTER' : 'QUEUED';
          return this.#write(old, { delivery_state, lease_token: null, lease_boot: null, lease_until: null, lease_deadline_mono: null,
            available_at: this.#now() + Math.min(1000, 10 * 2 ** old.attempts) });
        }, { message_id: messageId, outcome }, messageId);
      },
      revoke: async (messageId: string): Promise<AgentMessage> => {
        this.#current(s); identifier(messageId);
        return this.#state.change(s, 'MESSAGE_REVOKED', () => {
          const old = this.#state.get<AgentMessage>('MESSAGE', messageId);
          invariant(old && old.sender.agent_id === s.agent_id && old.sender.project_id === s.project_id && old.sender.task_id === s.task_id, 'MESSAGE_SENDER_DENIED');
          invariant(['QUEUED','LEASED'].includes(old.delivery_state), 'MESSAGE_TERMINAL');
          return this.#write(old, { delivery_state: old.delivery_state === 'LEASED' && old.effect === 'EXTERNAL' ? 'INDETERMINATE' : 'REVOKED', lease_token: null, lease_boot: null, lease_until: null, lease_deadline_mono: null });
        }, { message_id: messageId }, messageId);
      },
    });
  }
}
