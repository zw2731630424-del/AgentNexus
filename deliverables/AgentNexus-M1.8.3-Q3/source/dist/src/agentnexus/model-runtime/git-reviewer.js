import { spawn } from 'node:child_process';
import { isAbsolute } from 'node:path';
import { canonical, invariant, NexusError, sha256 } from '../types.js';
import { validateArtifactRef } from '../records.js';
import { hostSubject, identifier, snapshot } from '../harness/contracts.js';
const ENTITY = 'm18_git_review';
const LIMIT = 128;
const HASH = /^[a-f0-9]{64}$/;
const COMMIT = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
function fields(value, names) {
    invariant(Object.keys(value).sort().join(',') === [...names].sort().join(','), 'GIT18_FIELDS');
}
function commits(base, head) {
    invariant(typeof base === 'string' && typeof head === 'string' && COMMIT.test(base) && COMMIT.test(head)
        && base.length === head.length, 'GIT18_COMMIT');
}
function sources(input) {
    invariant(Array.isArray(input) && input.length > 0 && input.length <= 64, 'GIT18_SOURCE_SET');
    invariant(Buffer.byteLength(canonical(input)) <= 5000, 'GIT18_SOURCE_SET_LIMIT');
    const seen = new Set();
    for (const source of input) {
        fields(source, ['path', 'sha256']);
        invariant(typeof source.path === 'string' && source.path.length > 0 && source.path.length <= 240
            && !/[\\\x00-\x1f\x7f:]/.test(source.path) && !source.path.startsWith('/')
            && source.path.split('/').every(p => p && p !== '.' && p !== '..' && !/[. ]$/.test(p))
            && HASH.test(source.sha256) && !seen.has(source.path.toLowerCase()), 'GIT18_SOURCE_SET');
        seen.add(source.path.toLowerCase());
    }
}
function event(input) {
    const value = snapshot(input, 20000);
    fields(value, ['event_id', 'kind', 'base', 'head', 'author_agent_id', 'project_id', 'repository_id',
        'task_id', 'session_id', 'candidate_sha256', 'source_set', 'rules', ...(value.push_source === undefined ? [] : ['push_source'])]);
    for (const key of ['event_id', 'author_agent_id', 'project_id', 'repository_id', 'task_id', 'session_id'])
        identifier(value[key]);
    commits(value.base, value.head);
    invariant(HASH.test(value.candidate_sha256), 'GIT18_CANDIDATE');
    invariant(value.kind === 'COMMIT' || value.kind === 'PUSH', 'GIT18_EVENT_KIND');
    sources(value.source_set);
    sources(value.rules);
    if (value.kind === 'PUSH') {
        invariant(value.push_source, 'GIT18_PUSH_SOURCE_REQUIRED');
        fields(value.push_source, ['kind', 'event_ref']);
        identifier(value.push_source.event_ref);
        invariant(value.push_source.kind === 'HOST_LOCAL_PUSH_EVENT', 'GIT18_PUSH_SOURCE_REQUIRED');
    }
    else
        invariant(value.push_source === undefined, 'GIT18_EVENT_KIND');
    return value;
}
function binding(input) {
    for (const value of [input.project_id, input.repository_id])
        identifier(value);
    commits(input.base, input.head);
    invariant(HASH.test(input.diff_sha256) && HASH.test(input.candidate_sha256), 'GIT18_BINDING');
    sources(input.source_set);
    sources(input.rules);
}
function exact(a, b) {
    return canonical({ project_id: a.project_id, repository_id: a.repository_id, base: a.base, head: a.head,
        diff_sha256: a.diff_sha256, candidate_sha256: a.candidate_sha256, source_set: a.source_set, rules: a.rules })
        === canonical({ project_id: b.project_id, repository_id: b.repository_id, base: b.base, head: b.head,
            diff_sha256: b.diff_sha256, candidate_sha256: b.candidate_sha256, source_set: b.source_set, rules: b.rules });
}
/** Trusted Host reader only. It cannot commit, push, run hooks, consult credentials or accept shell arguments.
 * Git may read repository metadata/configuration; dangerous execution/transport settings are overridden.
 * A hostile same-account repository/filesystem is outside this local-library assurance.
 */
export class ReadonlyGitReader {
    #options;
    #active = false;
    constructor(options) {
        for (const path of [options.executable, options.repository])
            invariant(typeof path === 'string'
                && isAbsolute(path) && !/[\x00-\x1f]/.test(path), 'GIT18_ABSOLUTE_PATH');
        const timeout = options.timeout_ms ?? 3000, max = options.max_bytes ?? 262144;
        invariant(Number.isSafeInteger(timeout) && timeout > 0 && timeout <= 30000
            && Number.isSafeInteger(max) && max > 0 && max <= 1048576, 'GIT18_LIMIT');
        this.#options = { executable: options.executable, repository: options.repository, timeout_ms: timeout, max_bytes: max };
    }
    async snapshot(base, head) {
        commits(base, head);
        invariant(!this.#active, 'GIT18_READER_BUSY');
        this.#active = true;
        const o = this.#options, nullFile = process.platform === 'win32' ? 'NUL' : '/dev/null';
        const argv = ['--no-pager', '-c', 'core.hooksPath=' + nullFile, '-c', 'core.fsmonitor=false',
            '-c', 'core.untrackedCache=false', '-c', 'core.attributesFile=' + nullFile, '-c', 'diff.external=',
            '-c', 'credential.helper=', '-c', 'protocol.allow=never', '-c', 'protocol.file.allow=never',
            '-c', 'core.quotePath=true', 'diff', '--no-color', '--no-ext-diff', '--no-textconv',
            '--binary', '--full-index', '--no-renames', '--no-relative', '--ignore-submodules=none',
            '--submodule=short', base, head, '--'];
        const env = { PATH: '', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: nullFile,
            GIT_CONFIG_SYSTEM: nullFile, GIT_CONFIG_COUNT: '0', GIT_ATTR_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0',
            GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never', GIT_NO_LAZY_FETCH: '1', GIT_PROTOCOL_FROM_USER: '0' };
        if (process.platform === 'win32') {
            env.SystemRoot = 'C:\\Windows';
            env.WINDIR = 'C:\\Windows';
        }
        return new Promise((resolve, reject) => {
            let child;
            try {
                child = spawn(o.executable, argv, { cwd: o.repository, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
            }
            catch {
                this.#active = false;
                reject(new NexusError('GIT18_START_FAILED'));
                return;
            }
            const chunks = [];
            let total = 0, reason = null, finished = false;
            let cleanup;
            const fail = (code) => { if (finished)
                return; finished = true; reject(new NexusError(code)); };
            const stop = (code) => {
                reason ??= code;
                child.kill();
                cleanup ??= setTimeout(() => fail('GIT18_CLOSE_UNKNOWN'), 500);
            };
            const timer = setTimeout(() => stop('GIT18_TIMEOUT'), o.timeout_ms);
            child.stdout.on('data', (bytes) => {
                total += bytes.length;
                if (total > o.max_bytes)
                    stop('GIT18_OUTPUT_LIMIT');
                else if (!reason)
                    chunks.push(Buffer.from(bytes));
            });
            child.stderr.on('data', (bytes) => { total += bytes.length; if (total > o.max_bytes)
                stop('GIT18_OUTPUT_LIMIT'); });
            child.once('error', () => { reason = 'GIT18_START_FAILED'; });
            child.once('close', (code, signal) => {
                this.#active = false;
                clearTimeout(timer);
                if (cleanup)
                    clearTimeout(cleanup);
                if (finished)
                    return;
                if (reason || code !== 0 || signal) {
                    fail(reason ?? 'GIT18_DIFF_FAILED');
                    return;
                }
                try {
                    const bytes = Buffer.concat(chunks), diff = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
                    finished = true;
                    resolve(Object.freeze({ base, head, diff, diff_sha256: sha256(bytes) }));
                }
                catch {
                    fail('GIT18_INVALID_DIFF');
                }
            });
        });
    }
}
/** Persistent Host event owner. Creation is at most once; uncertain callbacks require owner reconciliation.
 * createReview must create an independent read-only Reviewer through Harness administration and notify it
 * through MessageBus before returning its receipt. No Worker receives this owner or the Git reader.
 */
export class GitReviewWatcher {
    #state;
    #options;
    constructor(state, admin, options) {
        state.checkAdmin(admin);
        invariant(typeof options.snapshot === 'function' && typeof options.createReview === 'function', 'GIT18_ADAPTER');
        this.#state = state;
        this.#options = { ...options };
    }
    #get(id) { const value = this.#state.get(ENTITY, id); invariant(value, 'GIT18_EVENT_UNKNOWN'); return value; }
    #save(row, changes) {
        const next = snapshot({ ...row, ...changes, revision: row.revision + 1 });
        this.#state.update(ENTITY, row.id, row.revision, next.state, next);
        return next;
    }
    #rows() {
        const rows = [];
        let after;
        for (;;) {
            const page = this.#state.list(ENTITY, { ...(after ? { after } : {}), limit: 100 });
            if (!page.length)
                return rows;
            rows.push(...page);
            after = page.at(-1).id;
        }
    }
    inspect(admin, id) { this.#state.checkAdmin(admin); return this.#get(id); }
    async observe(admin, input) {
        this.#state.checkAdmin(admin);
        const e = event(input), id = sha256(canonical({ project_id: e.project_id, event_id: e.event_id })), eventHash = sha256(canonical(e));
        const prior = this.#state.get(ENTITY, id);
        if (prior) {
            invariant(prior.event_hash === eventHash, 'GIT18_EVENT_REPLAY_CHANGED');
            return prior;
        }
        const inserted = await this.#state.change(hostSubject(this.#state.boot_id), 'GIT_REVIEW_OBSERVED', () => {
            const existing = this.#state.get(ENTITY, id);
            if (existing) {
                invariant(existing.event_hash === eventHash, 'GIT18_EVENT_REPLAY_CHANGED');
                return false;
            }
            invariant(this.#state.count(ENTITY) < LIMIT, 'GIT18_EVENT_CAPACITY');
            for (const old of this.#rows())
                if (old.event.project_id === e.project_id && old.event.repository_id === e.repository_id
                    && old.event.head !== e.head && old.state !== 'STALE')
                    this.#save(old, { state: 'STALE', reason: 'COMMIT_CHANGED' });
            const row = { id, revision: 0, boot_id: this.#state.boot_id, state: 'PENDING', creation_state: 'PENDING',
                event: e, event_hash: eventHash, binding: null, diff_ref: null, receipt: null, result: null, reason: null };
            this.#state.insert(ENTITY, id, { agent_id: e.author_agent_id, project_id: e.project_id, task_id: e.task_id, session_id: e.session_id }, row.state, row);
            return true;
        }, { event_id: e.event_id, event_hash: eventHash, kind: e.kind, base: e.base, head: e.head, automatic_push: false }, id);
        return inserted ? this.dispatchPending(admin, id) : this.#get(id);
    }
    /** Explicit Host continuation of a known-not-created PENDING event. Never resumes CREATING/UNKNOWN. */
    async dispatchPending(admin, id) {
        this.#state.checkAdmin(admin);
        const row = this.#get(id);
        invariant(row.state === 'PENDING', 'GIT18_NOT_PENDING');
        const observed = snapshot(await this.#options.snapshot(row.event.base, row.event.head), 2097152);
        fields(observed, ['base', 'head', 'diff', 'diff_sha256']);
        invariant(observed.base === row.event.base && observed.head === row.event.head && typeof observed.diff === 'string'
            && Buffer.byteLength(observed.diff) <= 1048576 && HASH.test(observed.diff_sha256)
            && sha256(observed.diff) === observed.diff_sha256, 'GIT18_SNAPSHOT_BINDING');
        const b = snapshot({ project_id: row.event.project_id, repository_id: row.event.repository_id,
            base: observed.base, head: observed.head, diff_sha256: observed.diff_sha256, candidate_sha256: row.event.candidate_sha256,
            source_set: row.event.source_set, rules: row.event.rules });
        const ref = await this.#state.store.artifacts.putBytesQueued(Buffer.from(observed.diff), { maxBytes: 1048576, media_type: 'text/x-diff' });
        const claimed = await this.#state.change(hostSubject(this.#state.boot_id), 'GIT_REVIEW_CREATING', () => {
            const current = this.#get(id);
            if (current.state !== 'PENDING')
                return false;
            this.#save(current, { state: 'CREATING', creation_state: 'CREATING', boot_id: this.#state.boot_id, binding: b, diff_ref: ref });
            return true;
        }, { event_id: row.event.event_id, binding: b, diff_ref: ref, gate_authority: false }, id);
        if (!claimed)
            return this.#get(id);
        try {
            const receipt = snapshot(await this.#options.createReview(snapshot({ idempotency_key: id, event: row.event, binding: b,
                diff_ref: ref, role: 'BACKGROUND_REVIEWER', read_only: true, independent_of_agent_id: row.event.author_agent_id })));
            fields(receipt, ['reviewer_agent_id', 'reviewer_task_id', 'notification_id', 'read_only']);
            for (const value of [receipt.reviewer_agent_id, receipt.reviewer_task_id, receipt.notification_id])
                identifier(value);
            invariant(receipt.read_only === true && receipt.reviewer_agent_id !== row.event.author_agent_id
                && receipt.reviewer_task_id !== row.event.task_id, 'GIT18_REVIEWER_INDEPENDENCE');
            return await this.#state.change(hostSubject(this.#state.boot_id), 'GIT_REVIEW_CREATED', () => {
                const current = this.#get(id);
                invariant(current.creation_state === 'CREATING', 'GIT18_CREATION_UNCERTAIN');
                return this.#save(current, { state: current.state === 'STALE' ? 'STALE' : 'CREATED', creation_state: 'CREATED', receipt });
            }, { event_id: row.event.event_id, binding: b, receipt, gate_authority: false }, id);
        }
        catch {
            return this.#state.change(hostSubject(this.#state.boot_id), 'GIT_REVIEW_UNKNOWN', () => {
                const current = this.#get(id);
                return this.#save(current, { state: current.state === 'STALE' ? 'STALE' : 'UNKNOWN', creation_state: 'UNKNOWN', reason: 'CREATION_NOT_CONFIRMED' });
            }, { event_id: row.event.event_id, automatic_retry: false, gate_authority: false }, id);
        }
    }
    async recover(admin) {
        this.#state.checkAdmin(admin);
        let changed = 0;
        for (const row of this.#rows())
            if (row.creation_state === 'CREATING' && row.boot_id !== this.#state.boot_id) {
                changed += await this.#state.change(hostSubject(this.#state.boot_id), 'GIT_REVIEW_RECOVERED', () => {
                    const current = this.#get(row.id);
                    if (current.creation_state !== 'CREATING' || current.boot_id === this.#state.boot_id)
                        return 0;
                    this.#save(current, { state: current.state === 'STALE' ? 'STALE' : 'UNKNOWN', creation_state: 'UNKNOWN', reason: 'HOST_RESTART_DURING_CREATION' });
                    return 1;
                }, { event_id: row.event.event_id, automatic_retry: false }, row.id);
            }
        return changed;
    }
    async acceptResult(admin, id, input) {
        this.#state.checkAdmin(admin);
        const result = snapshot(input, 24000);
        fields(result, ['project_id', 'repository_id', 'base', 'head', 'diff_sha256', 'candidate_sha256', 'source_set', 'rules',
            'reviewer_agent_id', 'reviewer_task_id', 'status', 'evidence_ref']);
        binding(result);
        identifier(result.reviewer_agent_id);
        identifier(result.reviewer_task_id);
        invariant(['PASS', 'FAIL', 'INCONCLUSIVE'].includes(result.status), 'GIT18_RESULT_STATUS');
        validateArtifactRef(result.evidence_ref);
        for await (const _chunk of this.#state.store.artifacts.read(result.evidence_ref)) { /* Complete evidence integrity barrier. */ }
        return this.#state.change(hostSubject(this.#state.boot_id), 'GIT_REVIEW_RESULT_ACCEPTED', () => {
            const row = this.#get(id);
            invariant(row.state === 'CREATED' && row.binding && row.receipt, 'GIT18_RESULT_STATE');
            invariant(exact(row.binding, result), 'GIT18_RESULT_BINDING');
            invariant(row.receipt.reviewer_agent_id === result.reviewer_agent_id && row.receipt.reviewer_task_id === result.reviewer_task_id
                && result.reviewer_agent_id !== row.event.author_agent_id, 'GIT18_RESULT_REVIEWER');
            return this.#save(row, { state: 'ACCEPTED', result });
        }, { event_id: this.#get(id).event.event_id, binding: result, gate_authority: false }, id);
    }
    /** Trusted checker lookup only. This record is evidence, never a Gate PASS or an execution permit. */
    readForGate(admin, id, expected) {
        this.#state.checkAdmin(admin);
        invariant(!this.#state.faulted, 'GIT18_STATE_UNAVAILABLE');
        const b = snapshot(expected);
        binding(b);
        const row = this.#get(id);
        invariant(row.state === 'ACCEPTED' && row.binding && row.result && exact(row.binding, b), 'GIT18_GATE_BINDING');
        return snapshot(row.result);
    }
}
