import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, invariant, NexusError, sha256, uid } from '../types.js';
import { keys } from '../runtime/contracts.js';
import { NativeClient } from '../production/native-client.js';
import { attestationPins, attestNativeClient, validateConfig } from './config.js';
import { AuthenticatedSession, LauncherLink, NativePipeChannel } from './session.js';
import { startHostRuntime, startWorkerLauncher } from './runtime.js';
async function publicHelper(c, configPath, configHash, role) {
    invariant(sha256(await readFile(process.execPath)) === c.node.sha256 && process.version === c.node.version, 'M15_NODE_FINGERPRINT');
    const n = await NativeClient.open({ powerShell: c.powershell.path, powerShell_hash: c.powershell.sha256, script: c.native.script, script_hash: c.native.script_hash, native_hash: c.native.native_hash, bootstrap_hash: c.native.bootstrap_hash, temporary_directory: role === 'HOST' ? c.host_root : dirname(configPath) });
    try {
        const pins = attestationPins(c, configPath, configHash).filter(p => role === 'HOST' || (![c.host_root, c.broker_root, c.launcher_root, c.host_key, c.broker_key, c.resource.root].map(path => resolve(path).toLowerCase()).includes(resolve(p.path).toLowerCase())));
        await attestNativeClient(n, c, pins, role === 'HOST' ? c.host_sid : c.operator_sid);
        return n;
    }
    catch (error) {
        n.close();
        throw error;
    }
}
async function serveControl(owner, c, configPath, configHash, signal) {
    while (!signal.aborted) {
        const native = await publicHelper(c, configPath, configHash, 'HOST');
        try {
            const endpoint = await native.request('bootstrap.pipe.listen', { name: c.admin_pipe_name, peer_sid: c.operator_sid, peer_image: c.powershell.path, peer_image_sha256: c.powershell.sha256 }, { deadline_ms: 2000, signal });
            // The protected endpoint remains ready during idle; each timed-out accept is explicitly recreated.
            let channel;
            try {
                channel = await native.request('bootstrap.pipe.accept', { endpoint_id: endpoint.endpoint_id }, { deadline_ms: 30000, signal });
            }
            catch (error) {
                if (signal.aborted)
                    break;
                continue;
            }
            const session = await AuthenticatedSession.host(new NativePipeChannel(native, channel.channel_id, channel.peer));
            try {
                while (!signal.aborted) {
                    const r = await session.receive(Date.now() + 30000, signal);
                    let result;
                    const p = r.payload;
                    try {
                        switch (r.kind) {
                            case 'STATUS':
                                keys(p, []);
                                result = owner.status();
                                break;
                            case 'PREPARE': {
                                keys(p, ['logical', 'arguments']);
                                const v = p;
                                result = await owner.prepare(v.logical, v.arguments);
                                break;
                            }
                            case 'APPROVE': {
                                keys(p, ['intent_hash', 'identity', 'reason']);
                                const v = p;
                                result = { approval_id: await owner.approve(v.intent_hash, v.identity, v.reason) };
                                break;
                            }
                            case 'EXECUTE': {
                                keys(p, ['runtime_id', 'request']);
                                const v = p;
                                result = await owner.request(v.runtime_id, v.request);
                                break;
                            }
                            case 'RECONCILE_PREVIEW':
                                result = await owner.administration.prepareReconciliation(p);
                                break;
                            case 'RECONCILE_COMMIT': {
                                keys(p, ['challenge_id', 'preview_hash']);
                                const v = p;
                                result = await owner.commitReconciliation(v.challenge_id, v.preview_hash);
                                break;
                            }
                            case 'ACK_RELEASE': {
                                keys(p, ['operation_id']);
                                result = await owner.acknowledgeRelease(p.operation_id);
                                break;
                            }
                            case 'INSPECT_OPERATION': {
                                keys(p, ['operation_id']);
                                result = owner.administration.inspectOperation(p.operation_id);
                                break;
                            }
                            default: throw new NexusError('M15_CONTROL_METHOD');
                        }
                        await session.send('RESULT', JSON.parse(canonical(result)), r.request_id, r.operation_id, r.expires, signal);
                    }
                    catch (error) {
                        await session.send('ERROR', { reason: error instanceof NexusError ? error.code : 'CONTROL_UNCERTAIN', automatic_retry: false }, r.request_id, r.operation_id, r.expires, signal);
                    }
                }
            }
            finally {
                session.close();
            }
        }
        catch (error) {
            if (signal.aborted)
                break;
            process.stderr.write(canonical({ event: 'CONTROL_CONNECTION_CLOSED', automatic_retry: false }) + '\n');
        }
        finally {
            native.close();
        }
    }
}
export async function operatorCommand(configPath, configHash, method, payload) {
    const raw = await readFile(configPath);
    invariant(sha256(raw) === configHash, 'M15_CONFIG_HASH');
    const c = validateConfig(JSON.parse(raw.toString('utf8'))), native = await publicHelper(c, configPath, configHash, 'OPERATOR');
    try {
        const connection = await native.request('bootstrap.pipe.connect', { name: c.admin_pipe_name, peer_sid: c.host_sid, peer_image: c.powershell.path, peer_image_sha256: c.powershell.sha256 }, { deadline_ms: 10000 });
        const session = await AuthenticatedSession.launcher(new NativePipeChannel(native, connection.channel_id, connection.peer));
        return await new LauncherLink(session).call(method, payload, uid(), Date.now() + 30000);
    }
    finally {
        native.close();
    }
}
export async function bootstrapMain(args = process.argv.slice(2)) {
    invariant(args.length >= 5 && ['host', 'launcher', 'operator'].includes(args[0]) && args[1] === '--config' && args[3] === '--sha256', 'M15_ENTRY_ARGUMENTS');
    const role = args[0], configPath = resolve(args[2]), configHash = args[4];
    const shutdown = new AbortController();
    const stop = () => shutdown.abort(new NexusError('M15_SHUTDOWN'));
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    try {
        if (role === 'operator') {
            invariant(args.length === 7, 'M15_OPERATOR_ARGUMENTS');
            const payload = JSON.parse(args[6]);
            process.stdout.write(canonical(await operatorCommand(configPath, configHash, args[5], payload)) + '\n');
            return;
        }
        invariant(args.length === 5, 'M15_ENTRY_ARGUMENTS');
        if (role === 'launcher') {
            await startWorkerLauncher(configPath, configHash, shutdown.signal);
            return;
        }
        const owner = await startHostRuntime(configPath, configHash, shutdown.signal);
        try {
            const raw = await readFile(configPath);
            invariant(sha256(raw) === configHash, 'M15_CONFIG_HASH');
            const config = validateConfig(JSON.parse(raw.toString('utf8')));
            process.stdout.write(canonical(owner.status()) + '\n');
            await serveControl(owner, config, configPath, configHash, shutdown.signal);
        }
        finally {
            await owner.close();
        }
    }
    finally {
        process.removeListener('SIGINT', stop);
        process.removeListener('SIGTERM', stop);
    }
}
if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === resolve(fileURLToPath(import.meta.url)).toLowerCase())
    void bootstrapMain().catch(error => { process.stderr.write(canonical({ status: 'BLOCKED', reason: error instanceof NexusError ? error.code : 'BOOTSTRAP_FAILED', automatic_retry: false }) + '\n'); process.exitCode = 2; });
