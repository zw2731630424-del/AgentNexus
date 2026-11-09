import { spawn } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NexusError, now, sha256, uid } from './types.js';
const MAX_SOURCE = 256 * 1024;
const MAX_STDOUT = 128 * 1024;
const MAX_STDERR = 32 * 1024;
const MAX_DIAGNOSTICS = 200;
const MAX_JOBS = 18;
const MAX_PENDING_BYTES = 4 * 1024 * 1024;
const MAX_DOCUMENTS = 128;
const CHECKER_DIRECTORY = fileURLToPath(new URL('./checkers/', import.meta.url));
const PYTHON_CHECKER = fileURLToPath(new URL('./checkers/python_ast.py', import.meta.url));
const POWERSHELL_CHECKER = fileURLToPath(new URL('./checkers/powershell_ast.ps1', import.meta.url));
function dimension(status, reason, coverage, applicable = true) {
    return { status, reason, coverage, applicable };
}
function message(text) { return Buffer.from(text).subarray(0, 1024).toString('utf8').replace(/\uFFFD$/, ''); }
function information(code, text) {
    return { code, severity: 'information', message: message(text), range: null };
}
function languageName(value) {
    const aliases = { py: 'python', ps1: 'powershell', pwsh: 'powershell', cs: 'csharp', 'c#': 'csharp', js: 'javascript', ts: 'typescript', yml: 'yaml' };
    return aliases[value.toLowerCase()] ?? value.toLowerCase();
}
function sourceFeatures(language) {
    const root = ['devint.runtime', 'devint.syntax-validator', 'devint.code-diagnostics'];
    if (['powershell', 'bash', 'zsh'].includes(language))
        return [...root, 'devint.command-parser', `devint.command.${language}`];
    if (['python', 'csharp', 'javascript', 'typescript', 'json', 'yaml', 'sql', 'dockerfile'].includes(language))
        root.push(`devint.code.${language}`);
    return root;
}
function validUnicode(value) {
    return !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value);
}
function validRequest(request, limit) {
    if (!request || typeof request !== 'object' || typeof request.source !== 'string' || typeof request.language !== 'string')
        return 'INVALID_REQUEST';
    if (!/^[A-Za-z0-9_+#.-]{1,32}$/.test(request.language))
        return 'INVALID_LANGUAGE';
    if (typeof request.document_uri !== 'string' || !request.document_uri || request.document_uri.includes('\0') || Buffer.byteLength(request.document_uri) > 2048)
        return 'INVALID_DOCUMENT_URI';
    if (!Number.isSafeInteger(request.version) || request.version < 0)
        return 'INVALID_DOCUMENT_VERSION';
    if (request.dialect !== undefined && (typeof request.dialect !== 'string' || request.dialect.length > 64))
        return 'INVALID_DIALECT';
    if (Buffer.byteLength(request.source) > limit)
        return 'SOURCE_LIMIT';
    if (!validUnicode(request.source) || !validUnicode(request.document_uri))
        return 'INVALID_UNICODE';
    return null;
}
function abortOutcome(reason) {
    const code = typeof reason === 'string' ? reason : 'CANCELLED';
    return { status: code === 'VALIDATION_BYPASSED' ? 'BYPASSED' : 'INCONCLUSIVE', reason: code, diagnostics: [] };
}
/** Trusted local library. These parse-only adapters are not an OS sandbox or an authorization service. */
export class DevelopmentIntelligence {
    #options;
    #maxSourceBytes;
    #timeoutMs;
    #disposed = false;
    #running = 0;
    #pendingBytes = 0;
    #jobs = new Map();
    #documents = new Map();
    #waiters = [];
    #children = new Set();
    #unconfirmedChildren = new Set();
    constructor(options = {}) {
        this.#options = { ...options };
        this.#maxSourceBytes = options.maxSourceBytes ?? MAX_SOURCE;
        this.#timeoutMs = options.timeoutMs ?? 3000;
        if (!Number.isInteger(this.#maxSourceBytes) || this.#maxSourceBytes < 1 || this.#maxSourceBytes > MAX_SOURCE)
            throw new NexusError('INVALID_SOURCE_LIMIT');
        if (!Number.isInteger(this.#timeoutMs) || this.#timeoutMs < 1 || this.#timeoutMs > 30000)
            throw new NexusError('INVALID_TIMEOUT');
        for (const value of [options.pythonPath, options.powerShellPath, options.gitPath]) {
            if (value !== undefined && (typeof value !== 'string' || !isAbsolute(value) || value.includes('\0')))
                throw new NexusError('CHECKER_PATH_MUST_BE_ABSOLUTE');
        }
    }
    async check(request, signal) {
        const invalid = validRequest(request, this.#maxSourceBytes);
        if (invalid)
            return this.#invalidResult(request, invalid);
        // Copy input before the first await; callers cannot mutate a running document snapshot.
        const snapshot = { ...request, language: languageName(request.language) };
        return this.#run(snapshot, sourceFeatures(snapshot.language), signal, context => this.#checkSource(context), 'syntax');
    }
    async checkArguments(request, signal) {
        if (!request || !['git', 'python'].includes(request.family) || !Array.isArray(request.argv) || request.argv.length > 128 || request.argv.some(arg => typeof arg !== 'string' || arg.includes('\0') || Buffer.byteLength(arg) > 4096 || !validUnicode(arg))) {
            return this.#invalidResult({ language: 'argv', source: '', document_uri: request?.document_uri, version: request?.version }, 'INVALID_ARGUMENT_REQUEST', 'args');
        }
        const family = request.family;
        const argv = [...request.argv];
        const snapshot = { language: family, source: JSON.stringify({ family, argv }), document_uri: request.document_uri, version: request.version };
        const invalid = validRequest(snapshot, Math.min(this.#maxSourceBytes, 65536));
        if (invalid)
            return this.#invalidResult(snapshot, invalid, 'args');
        const featureIds = ['devint.runtime', 'devint.command-parser', 'devint.argument-validator', family === 'git' ? 'devint.command.git' : 'devint.command.python-cli'];
        return this.#run(snapshot, featureIds, signal, context => this.#checkArgv(context, family, argv), 'args');
    }
    closeDocument(uri) {
        const state = this.#documents.get(uri);
        state?.active?.controller.abort('DOCUMENT_CLOSED');
        this.#documents.delete(uri);
    }
    dispose() {
        this.#disposed = true;
        for (const context of this.#jobs.values())
            context.controller.abort('DISPOSED');
        this.#documents.clear();
    }
    getActivity() {
        return { jobs: this.#jobs.size, running: this.#running, queued: this.#waiters.length, pendingBytes: this.#pendingBytes,
            children: this.#children.size, unconfirmedChildren: this.#unconfirmedChildren.size, documents: this.#documents.size };
    }
    async drain(timeoutMs = 1000) {
        if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 1000)
            throw new NexusError('INVALID_DRAIN_TIMEOUT');
        const deadline = performance.now() + timeoutMs;
        while (this.#jobs.size || this.#running || this.#waiters.length || this.#pendingBytes || this.#children.size || this.#unconfirmedChildren.size) {
            if (performance.now() >= deadline)
                throw new NexusError('DIAGNOSTIC_DRAIN_TIMEOUT', 'Known diagnostic processes or queued work have not been confirmed drained.');
            await new Promise(resolve => setTimeout(resolve, Math.min(10, Math.max(1, deadline - performance.now()))));
        }
    }
    async disposeAndWait(timeoutMs = 1000) {
        this.dispose();
        await this.drain(timeoutMs);
    }
    #enabled(id) { return this.#options.featureEnabled ? this.#options.featureEnabled(id) === true : true; }
    #epoch() { return this.#options.featureEpoch?.() ?? 0; }
    #revision() { return this.#options.configRevision?.() ?? 0; }
    #base(request) {
        return {
            request_id: uid(), uri: typeof request?.document_uri === 'string' ? request.document_uri.slice(0, 2048) : '',
            version: Number.isSafeInteger(request?.version) ? request.version : 0,
            source_sha256: typeof request?.source === 'string' && Buffer.byteLength(request.source) <= this.#maxSourceBytes ? sha256(request.source) : '',
            checker_id: 'agentnexus-development-intelligence', checker_version: '0.1',
            feature_epoch: this.#epoch(), config_revision: this.#revision(),
            dimensions: {
                syntax: dimension('NOT_RUN', 'NOT_STARTED', 'none'),
                args: dimension('NOT_RUN', 'NOT_APPLICABLE', 'none', false),
                environment: dimension('NOT_RUN', 'NOT_STARTED', 'none'),
                safety: dimension('INCONCLUSIVE', 'STATIC_ANALYSIS_NOT_SAFETY_PROOF', 'no OS isolation, resource authorization or target execution established'),
                authorization: dimension('NOT_RUN', 'OWNER_TOOL_GATEWAY', 'diagnostic service cannot issue permits'),
            },
            status: 'NOT_RUN', reason: 'NOT_STARTED', diagnostics: [], evidence_refs: [],
            timing: { started_at: now(), elapsed_ms: 0 },
        };
    }
    #invalidResult(request, reason, target = 'syntax') {
        const result = this.#base(request);
        result.status = 'FAIL';
        result.reason = reason;
        result.dimensions[target] = dimension('FAIL', reason, 'bounded request envelope');
        result.diagnostics = [information(reason, 'The diagnostic request is outside the supported input contract.')];
        return result;
    }
    async #run(request, featureIds, signal, work, target) {
        const started = performance.now();
        const result = this.#base(request);
        if (target === 'args') {
            result.dimensions.syntax = dimension('NOT_RUN', 'STRUCTURED_ARGV_NO_SHELL_PARSE', 'no shell string is interpreted', false);
            result.dimensions.args = dimension('NOT_RUN', 'NOT_STARTED', 'registered argv subset');
        }
        const complete = (outcome) => {
            result.status = outcome.status;
            result.reason = outcome.reason;
            result.dimensions[target] = outcome.checked_dimension ?? dimension(outcome.status, outcome.reason, target === 'args' ? `${request.language}_argv_registered_subset` : `${request.language}_parse_only`);
            result.diagnostics = outcome.diagnostics ?? [];
            result.checker_id = outcome.checker_id ?? result.checker_id;
            result.checker_version = outcome.checker_version ?? result.checker_version;
            if (outcome.environment)
                result.dimensions.environment = outcome.environment;
            result.timing.elapsed_ms = Math.round((performance.now() - started) * 1000) / 1000;
            return result;
        };
        if (this.#disposed)
            return complete({ status: 'BLOCKED', reason: 'DISPOSED' });
        try {
            if (featureIds.some(id => !this.#enabled(id)))
                return complete({ status: 'BYPASSED', reason: 'VALIDATION_BYPASSED' });
            if (!this.#enabled('devint.environment-checker'))
                result.dimensions.environment = dimension('BYPASSED', 'VALIDATION_BYPASSED', 'optional environment diagnostics');
            if (!this.#enabled('devint.safety-preflight'))
                result.dimensions.safety = dimension('BYPASSED', 'VALIDATION_BYPASSED', 'optional safety preflight');
        }
        catch {
            return complete({ status: 'BLOCKED', reason: 'FEATURE_UNAVAILABLE' });
        }
        if (signal?.aborted)
            return complete(abortOutcome('CANCELLED'));
        const fingerprint = sha256(`${request.language}\0${request.dialect ?? ''}\0${request.source}`);
        const previous = this.#documents.get(request.document_uri);
        if (previous && (request.version < previous.version || (request.version === previous.version && fingerprint !== previous.fingerprint))) {
            return complete({ status: 'INCONCLUSIVE', reason: request.version < previous.version ? 'STALE_VERSION' : 'VERSION_HASH_MISMATCH' });
        }
        if (!previous && this.#documents.size >= MAX_DOCUMENTS)
            return complete({ status: 'BLOCKED', reason: 'DOCUMENT_LIMIT' });
        const bytes = Buffer.byteLength(request.source);
        if (this.#jobs.size >= MAX_JOBS || this.#pendingBytes + bytes > MAX_PENDING_BYTES)
            return complete({ status: 'BLOCKED', reason: 'QUEUE_LIMIT' });
        const context = { id: result.request_id, request, fingerprint, bytes, result, controller: new AbortController(), featureIds };
        previous?.active?.controller.abort('SUPERSEDED_REQUEST');
        this.#documents.set(request.document_uri, { version: request.version, fingerprint, token: context.id, active: context });
        this.#jobs.set(context.id, context);
        this.#pendingBytes += bytes;
        const onAbort = () => context.controller.abort('CANCELLED');
        signal?.addEventListener('abort', onAbort, { once: true });
        const timer = setTimeout(() => context.controller.abort('TIME_LIMIT'), this.#timeoutMs);
        const monitor = setInterval(() => {
            try {
                if (featureIds.some(id => !this.#enabled(id)))
                    context.controller.abort('VALIDATION_BYPASSED');
                else if (this.#epoch() !== result.feature_epoch || this.#revision() !== result.config_revision)
                    context.controller.abort('STALE_CONFIGURATION');
            }
            catch {
                context.controller.abort('FEATURE_UNAVAILABLE');
            }
        }, 25);
        let acquired = false;
        let outcome;
        try {
            await this.#acquire(context);
            acquired = true;
            if (context.controller.signal.aborted)
                outcome = abortOutcome(context.controller.signal.reason);
            else
                outcome = await work(context);
        }
        catch (error) {
            outcome = context.controller.signal.aborted ? abortOutcome(context.controller.signal.reason) : { status: 'INCONCLUSIVE', reason: error instanceof NexusError ? error.code : 'CHECKER_FAILED' };
        }
        finally {
            clearTimeout(timer);
            clearInterval(monitor);
            signal?.removeEventListener('abort', onAbort);
            this.#jobs.delete(context.id);
            this.#pendingBytes -= bytes;
            if (acquired)
                this.#release();
        }
        // A returned result is never authoritative for a superseded/closed/disabled document.
        try {
            if (featureIds.some(id => !this.#enabled(id)))
                outcome = abortOutcome('VALIDATION_BYPASSED');
            else if (this.#epoch() !== result.feature_epoch || this.#revision() !== result.config_revision)
                outcome = abortOutcome('STALE_CONFIGURATION');
            else if (this.#documents.get(request.document_uri)?.token !== context.id)
                outcome = abortOutcome(this.#disposed ? 'DISPOSED' : 'STALE_VERSION');
            else if (context.controller.signal.aborted && outcome.reason !== 'CHECKER_TERMINATION_UNCONFIRMED')
                outcome = abortOutcome(context.controller.signal.reason);
            if (!this.#enabled('devint.environment-checker'))
                outcome.environment = dimension('BYPASSED', 'VALIDATION_BYPASSED', 'optional environment diagnostics');
            if (!this.#enabled('devint.safety-preflight'))
                result.dimensions.safety = dimension('BYPASSED', 'VALIDATION_BYPASSED', 'optional safety preflight');
        }
        catch {
            outcome = { status: 'BLOCKED', reason: 'FEATURE_UNAVAILABLE' };
        }
        const current = this.#documents.get(request.document_uri);
        if (current?.token === context.id)
            current.active = null;
        return complete(outcome);
    }
    async #acquire(context) {
        if (context.controller.signal.aborted)
            throw new NexusError('CANCELLED');
        if (this.#running < 2) {
            this.#running++;
            return;
        }
        await new Promise((resolve, reject) => {
            const waiter = { context, resolve, reject, onAbort: () => {
                    const index = this.#waiters.indexOf(waiter);
                    if (index !== -1)
                        this.#waiters.splice(index, 1);
                    reject(new NexusError('CANCELLED'));
                } };
            this.#waiters.push(waiter);
            context.controller.signal.addEventListener('abort', waiter.onAbort, { once: true });
        });
    }
    #release() {
        this.#running--;
        while (this.#waiters.length) {
            const waiter = this.#waiters.shift();
            waiter.context.controller.signal.removeEventListener('abort', waiter.onAbort);
            if (waiter.context.controller.signal.aborted) {
                waiter.reject(new NexusError('CANCELLED'));
                continue;
            }
            this.#running++;
            waiter.resolve();
            break;
        }
    }
    async #checkSource(context) {
        const { request } = context;
        const language = request.language;
        if (!['python', 'powershell', 'json'].includes(language))
            return { status: 'NOT_RUN', reason: language === 'sql' ? 'SQL_CHECKER_NOT_IMPLEMENTED' : 'CHECKER_NOT_IMPLEMENTED' };
        const dialects = { json: ['json', 'rfc8259'], python: ['python3'], powershell: ['powershell7', '7'] };
        if (request.dialect !== undefined && !dialects[language].includes(request.dialect.toLowerCase()))
            return { status: 'NOT_RUN', reason: 'UNSUPPORTED_DIALECT' };
        if (language === 'json') {
            // Yield once so a newer document or already queued cancellation can fence this snapshot.
            await new Promise(resolve => setImmediate(resolve));
            if (context.controller.signal.aborted)
                return abortOutcome(context.controller.signal.reason);
            const environment = this.#enabled('devint.environment-checker') ? dimension('PASS', 'BUILTIN_PARSER', 'JSON.parse in the reported Node runtime; OS hard isolation NOT_RUN') : undefined;
            try {
                JSON.parse(request.source);
                return { status: 'PASS', reason: 'JSON_PARSE_ONLY', checker_id: 'json-parse', checker_version: `Node-${process.versions.node}`, environment };
            }
            catch {
                // V8 may quote long source fragments in SyntaxError messages. Do not echo them.
                return { status: 'FAIL', reason: 'SYNTAX_ERROR', checker_id: 'json-parse', checker_version: `Node-${process.versions.node}`, environment, diagnostics: [{ code: 'JSON_SYNTAX_ERROR', severity: 'error', message: 'Invalid JSON syntax.', range: null }] };
            }
        }
        if (this.#unconfirmedChildren.size)
            return { status: 'BLOCKED', reason: 'CHECKER_TERMINATION_UNCONFIRMED' };
        const executable = language === 'python' ? this.#options.pythonPath : this.#options.powerShellPath;
        const script = language === 'python' ? PYTHON_CHECKER : POWERSHELL_CHECKER;
        if (!executable)
            return { status: 'BLOCKED', reason: 'CHECKER_NOT_CONFIGURED', environment: dimension('BLOCKED', 'CHECKER_NOT_CONFIGURED', 'Host must provide an absolute trusted interpreter path') };
        let scriptHash;
        try {
            const [executableStat, scriptStat] = await Promise.all([lstat(executable), lstat(script)]);
            if (!executableStat.isFile() || executableStat.isSymbolicLink() || !scriptStat.isFile() || scriptStat.isSymbolicLink() || scriptStat.size > 65536)
                return { status: 'BLOCKED', reason: 'INVALID_CHECKER_FILE' };
            scriptHash = sha256(await readFile(script));
        }
        catch {
            return { status: 'BLOCKED', reason: 'CHECKER_UNAVAILABLE', environment: dimension('BLOCKED', 'CHECKER_UNAVAILABLE', 'configured interpreter and fixed adapter files') };
        }
        if (context.controller.signal.aborted)
            return abortOutcome(context.controller.signal.reason);
        const argv = language === 'python' ? ['-I', '-B', '-S', script] : ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', script];
        const outcome = await this.#child(executable, argv, context);
        if (outcome.checker_version)
            outcome.checker_version += `/adapter-${scriptHash.slice(0, 16)}`;
        if (outcome.status === 'PASS' || outcome.status === 'FAIL') {
            if (this.#enabled('devint.environment-checker'))
                outcome.environment = dimension('PASS', 'TRUSTED_ADAPTER_RESPONDED', 'fixed interpreter/adapter launch and reported version only; hard RSS/process-tree isolation NOT_RUN');
        }
        return outcome;
    }
    #child(executable, argv, context) {
        return new Promise(resolve => {
            const env = {};
            // Only the Windows OS loader root is inherited. Never copy arbitrary env, PATH or credentials.
            if (process.platform === 'win32') {
                if (process.env.SystemRoot)
                    env.SystemRoot = process.env.SystemRoot;
                if (process.env.WINDIR)
                    env.WINDIR = process.env.WINDIR;
            }
            env.PSModulePath = '';
            const child = spawn(executable, argv, { cwd: CHECKER_DIRECTORY, env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
            this.#children.add(child);
            const output = Buffer.alloc(MAX_STDOUT);
            let stdoutBytes = 0;
            let stderrBytes = 0;
            let finished = false;
            let failure = null;
            let killTimer;
            const finish = (outcome) => {
                if (finished)
                    return;
                finished = true;
                if (killTimer)
                    clearTimeout(killTimer);
                context.controller.signal.removeEventListener('abort', onAbort);
                resolve(outcome);
            };
            const stop = (reason) => {
                if (finished)
                    return;
                failure ??= reason;
                child.stdin.destroy();
                child.kill();
                killTimer ??= setTimeout(() => {
                    this.#unconfirmedChildren.add(child);
                    finish({ status: 'INCONCLUSIVE', reason: 'CHECKER_TERMINATION_UNCONFIRMED' });
                }, 500);
            };
            const onAbort = () => stop(typeof context.controller.signal.reason === 'string' ? context.controller.signal.reason : 'CANCELLED');
            context.controller.signal.addEventListener('abort', onAbort, { once: true });
            child.stdout.on('data', (chunk) => {
                if (finished || failure)
                    return;
                if (stdoutBytes + chunk.length > MAX_STDOUT) {
                    stop('OUTPUT_LIMIT');
                    return;
                }
                chunk.copy(output, stdoutBytes);
                stdoutBytes += chunk.length;
            });
            child.stderr.on('data', (chunk) => { stderrBytes += chunk.length; if (stderrBytes > MAX_STDERR && !failure)
                stop('OUTPUT_LIMIT'); });
            child.stdin.on('error', () => { if (!failure)
                stop('CHECKER_STDIN_FAILED'); });
            child.on('error', () => finish({ status: 'BLOCKED', reason: 'CHECKER_START_FAILED' }));
            child.on('close', code => {
                this.#children.delete(child);
                this.#unconfirmedChildren.delete(child);
                if (failure) {
                    finish(failure === 'VALIDATION_BYPASSED' ? abortOutcome(failure) : { status: 'INCONCLUSIVE', reason: failure });
                    return;
                }
                if (code !== 0) {
                    finish({ status: 'INCONCLUSIVE', reason: 'CHECKER_EXIT_FAILED' });
                    return;
                }
                try {
                    const text = new TextDecoder('utf-8', { fatal: true }).decode(output.subarray(0, stdoutBytes));
                    finish(parseCheckerOutput(JSON.parse(text), context.request));
                }
                catch {
                    finish({ status: 'INCONCLUSIVE', reason: 'INVALID_CHECKER_OUTPUT' });
                }
            });
            if (context.controller.signal.aborted)
                onAbort();
            else
                child.stdin.end(Buffer.from(context.request.source, 'utf8'));
        });
    }
    async #checkArgv(context, family, argv) {
        const outcome = family === 'git' ? gitArguments(argv) : pythonArguments(argv);
        outcome.checked_dimension = dimension(outcome.status, outcome.reason, `${family}_argv_registered_subset`);
        outcome.checker_id = `${family}-argv-schema`;
        outcome.checker_version = '0.1';
        if (!this.#enabled('devint.environment-checker'))
            return outcome;
        const executable = family === 'python' ? this.#options.pythonPath : this.#options.gitPath;
        if (!executable) {
            outcome.environment = dimension('NOT_RUN', 'TARGET_EXECUTABLE_NOT_CONFIGURED', 'argv schema only; target executable version and cwd are not probed');
            return outcome;
        }
        try {
            const stat = await lstat(executable);
            outcome.environment = stat.isFile() && !stat.isSymbolicLink()
                ? dimension('PASS', 'HOST_EXECUTABLE_FILE_EXISTS', 'configured absolute file only; version, cwd, repository, dependencies and execution NOT_RUN')
                : dimension('BLOCKED', 'TARGET_EXECUTABLE_UNAVAILABLE', 'configured absolute file only');
        }
        catch {
            outcome.environment = dimension('BLOCKED', 'TARGET_EXECUTABLE_UNAVAILABLE', 'configured absolute file only');
        }
        if (outcome.environment.status === 'BLOCKED' && outcome.status === 'PASS') {
            outcome.status = 'BLOCKED';
            outcome.reason = 'TARGET_EXECUTABLE_UNAVAILABLE';
        }
        return outcome;
    }
}
function parseCheckerOutput(payload, request) {
    const value = payload;
    const expected = request.language === 'python' ? 'python-ast' : 'powershell-ast';
    if (!value || value.schema !== 'agentnexus/checker/0.1' || value.checker_id !== expected || typeof value.checker_version !== 'string' || value.checker_version.length > 128 || !['PASS', 'FAIL', 'INCONCLUSIVE'].includes(value.status) || typeof value.reason !== 'string' || value.reason.length > 128 || !Array.isArray(value.diagnostics) || value.diagnostics.length > MAX_DIAGNOSTICS)
        throw new NexusError('INVALID_CHECKER_OUTPUT');
    const lines = request.source.split('\n').map(line => line.endsWith('\r') ? line.slice(0, -1) : line);
    const diagnostics = value.diagnostics.map((item) => {
        const d = item;
        if (!d || typeof d.code !== 'string' || d.code.length > 128 || !['error', 'warning', 'information'].includes(d.severity) || typeof d.message !== 'string' || Buffer.byteLength(d.message) > 1024)
            throw new NexusError('INVALID_CHECKER_OUTPUT');
        if (d.range !== null) {
            for (const point of [d.range?.start, d.range?.end]) {
                if (!point || !Number.isInteger(point.line) || point.line < 0 || point.line >= lines.length || !Number.isInteger(point.character) || point.character < 0 || point.character > lines[point.line].length)
                    throw new NexusError('INVALID_CHECKER_OUTPUT');
            }
            if (d.range.end.line < d.range.start.line || (d.range.end.line === d.range.start.line && d.range.end.character < d.range.start.character))
                throw new NexusError('INVALID_CHECKER_OUTPUT');
        }
        return { code: d.code, severity: d.severity, message: d.message, range: d.range };
    });
    if (value.status === 'PASS' && diagnostics.some(d => d.severity === 'error'))
        throw new NexusError('INVALID_CHECKER_OUTPUT');
    if (value.status === 'FAIL' && !diagnostics.some(d => d.severity === 'error'))
        throw new NexusError('INVALID_CHECKER_OUTPUT');
    return { status: value.status, reason: value.reason, checker_id: expected, checker_version: value.checker_version, diagnostics };
}
function argumentFailure(reason, status = 'FAIL') {
    return { status, reason, diagnostics: [information(reason, 'Argument is outside the registered command subset; the target program was not run.')] };
}
function gitArguments(argv) {
    const [command, ...args] = argv;
    if (!['status', 'diff', 'log', 'show', 'rev-parse'].includes(command))
        return argumentFailure(command?.startsWith('-') ? 'GIT_GLOBAL_OPTIONS_NOT_SUPPORTED' : 'UNKNOWN_COMMAND_CONTRACT', command?.startsWith('-') ? 'FAIL' : 'NOT_RUN');
    const allowed = {
        status: new Set(['--short', '-s', '--branch', '-b', '--show-stash', '--porcelain', '--porcelain=v1', '--porcelain=v2', '--untracked-files=no', '--untracked-files=normal', '--untracked-files=all']),
        diff: new Set(['--stat', '--name-only', '--name-status', '--cached', '--staged', '--color=never', '--no-ext-diff', '--no-textconv', '--exit-code', '--quiet']),
        log: new Set(['--oneline', '--no-decorate', '--decorate=no', '--no-color']),
        show: new Set(['--stat', '--name-only', '--name-status', '--no-color', '--no-ext-diff', '--no-textconv']),
        'rev-parse': new Set(['--show-toplevel', '--show-prefix', '--is-inside-work-tree', '--git-dir', '--verify']),
    };
    let paths = false;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (paths) {
            if (!arg)
                return argumentFailure('EMPTY_PATHSPEC');
            continue;
        }
        if (arg === '--' && command !== 'rev-parse') {
            paths = true;
            continue;
        }
        if (allowed[command].has(arg))
            continue;
        if (command === 'log' && arg === '-n' && /^(?:0|[1-9][0-9]{0,2}|1000)$/.test(args[i + 1] ?? '')) {
            i++;
            continue;
        }
        if (command === 'log' && /^--max-count=(?:0|[1-9][0-9]{0,2}|1000)$/.test(arg))
            continue;
        if (['show', 'rev-parse'].includes(command) && /^(?:HEAD|[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(arg))
            continue;
        return argumentFailure('UNSUPPORTED_ARGUMENT');
    }
    if (command === 'rev-parse' && (args.length === 0 || (args.includes('--verify') && !args.some(arg => /^(?:HEAD|[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(arg)))))
        return argumentFailure('MISSING_REQUIRED_ARGUMENT');
    return { status: 'PASS', reason: 'ARGUMENT_SCHEMA_ONLY' };
}
function pythonArguments(argv) {
    if (argv.length === 1 && ['--version', '-V', '--help', '-h'].includes(argv[0]))
        return { status: 'PASS', reason: 'ARGUMENT_SCHEMA_ONLY' };
    let i = 0;
    const flags = new Set(['-I', '-B', '-S', '-E', '-s', '-u']);
    const seen = new Set();
    while (i < argv.length && flags.has(argv[i])) {
        if (seen.has(argv[i]))
            return argumentFailure('DUPLICATE_OPTION');
        seen.add(argv[i++]);
    }
    const target = argv[i++];
    if (!target || target === '-' || target === '-i')
        return argumentFailure('INTERACTIVE_ENTRY_NOT_SUPPORTED', 'BLOCKED');
    if (target === '-c') {
        if (i >= argv.length)
            return argumentFailure('MISSING_REQUIRED_ARGUMENT');
        return { status: 'PASS', reason: 'ARGUMENT_SCHEMA_ONLY_INLINE_SOURCE_NOT_PARSED' };
    }
    if (target === '-m') {
        if (!/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(argv[i] ?? ''))
            return argumentFailure('INVALID_MODULE_NAME');
        return { status: 'PASS', reason: 'ARGUMENT_SCHEMA_ONLY_MODULE_NOT_IMPORTED' };
    }
    if (target === '--') {
        if (!argv[i] || argv[i] === '-')
            return argumentFailure('MISSING_SCRIPT_ARGUMENT');
        return { status: 'PASS', reason: 'ARGUMENT_SCHEMA_ONLY_SCRIPT_NOT_READ' };
    }
    if (target.startsWith('-'))
        return argumentFailure('UNSUPPORTED_INTERPRETER_OPTION');
    return { status: 'PASS', reason: 'ARGUMENT_SCHEMA_ONLY_SCRIPT_NOT_READ' };
}
