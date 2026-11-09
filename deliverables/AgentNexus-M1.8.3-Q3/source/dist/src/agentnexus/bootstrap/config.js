import { readFile, readdir, lstat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { canonical, invariant, sha256 } from '../types.js';
import { hash, keys, snapshot, validateProfile } from '../runtime/contracts.js';
import { NativeClient } from '../production/native-client.js';
import { validatePermissionPin, within } from './permissions.js';
function pathBelow(root, path) { const rel = relative(resolve(root), resolve(path)); return !!rel && rel !== '..' && !rel.startsWith('..\\') && !rel.startsWith('../') && !isAbsolute(rel); }
export function validateConfig(value) {
    const c = snapshot(value, 1048576);
    keys(c, ['schema', 'version', 'role', 'host_sid', 'worker_sid', 'operator_sid', 'code_root', 'host_root', 'broker_root', 'launcher_root', 'node', 'powershell', 'native', 'worker_script', 'worker_script_hash', 'host_key', 'host_public_key', 'host_public_key_hash', 'broker_key', 'qualification_public_key', 'launcher_key', 'launcher_public_key', 'launcher_public_key_hash', 'launcher_config_hash', 'qualification_certificates', 'profile', 'pipe_name', 'admin_pipe_name', 'pins', 'source_files', 'enable_features', 'resource']);
    invariant(c.schema === 'agentnexus/bootstrap-config/1' && c.version === 1 && ['HOST', 'LAUNCHER'].includes(c.role), 'M15_CONFIG_VERSION');
    for (const sid of [c.host_sid, c.worker_sid, c.operator_sid])
        invariant(/^S-1-5-21-(?:\d+-){3}\d+$/.test(sid), 'M15_CONFIG_SID');
    invariant(c.host_sid !== c.worker_sid, 'M15_DISTINCT_IDENTITIES_REQUIRED');
    invariant(c.operator_sid !== c.worker_sid && c.operator_sid !== c.host_sid, 'M15_DISTINCT_OPERATOR_REQUIRED');
    keys(c.node, ['path', 'sha256', 'version']);
    keys(c.powershell, ['path', 'sha256']);
    keys(c.native, ['script', 'script_hash', 'native_hash', 'bootstrap_hash']);
    for (const h of [c.node.sha256, c.powershell.sha256, c.native.script_hash, c.native.native_hash, c.native.bootstrap_hash, c.worker_script_hash, c.host_public_key_hash, c.launcher_public_key_hash])
        hash(h);
    if (c.role === 'HOST')
        hash(c.launcher_config_hash);
    else
        invariant(c.launcher_config_hash === null, 'M15_LAUNCHER_CONFIG_SELF_HASH');
    invariant(c.node.version === 'v24.15.0' && typeof c.enable_features === 'boolean', 'M15_NODE_VERSION');
    for (const p of [c.code_root, c.host_root, c.broker_root, c.launcher_root, c.node.path, c.powershell.path, c.native.script, c.worker_script, c.host_key, c.host_public_key, c.broker_key, c.qualification_public_key, c.resource.root, c.launcher_key, c.launcher_public_key])
        invariant(typeof p === 'string' && isAbsolute(p) && p.length <= 2048 && !/[\x00-\x1f]/.test(p), 'M15_CONFIG_PATH');
    invariant(pathBelow(c.code_root, c.worker_script) && pathBelow(c.code_root, c.native.script) && pathBelow(c.host_root, c.host_key) && pathBelow(c.host_root, c.broker_key), 'M15_KEY_BOUNDARY');
    invariant(pathBelow(c.launcher_root, c.launcher_key) && pathBelow(c.code_root, c.launcher_public_key), 'M15_LAUNCHER_KEY_BOUNDARY');
    const roots = [c.code_root, c.host_root, c.broker_root, c.launcher_root, c.resource.root];
    for (let i = 0; i < roots.length; i++)
        for (let j = i + 1; j < roots.length; j++)
            invariant(!within(roots[i], roots[j]) && !within(roots[j], roots[i]), 'M15_ROOT_BOUNDARY');
    validateProfile(c.profile);
    invariant(c.profile.principal === c.worker_sid && c.profile.os === 'windows' && c.profile.network === 'DENY' && c.profile.writable.length === 0, 'M15_PROFILE_BOUNDARY');
    const normalize = (p) => resolve(p).toLowerCase(), ownedPaths = [c.code_root, dirname(c.node.path)].map(normalize).sort();
    invariant(canonical(c.profile.accessible.map(normalize).sort()) === canonical(ownedPaths) && canonical(c.profile.read_only.map(normalize).sort()) === canonical(ownedPaths), 'M15_PROFILE_PATHS');
    // Initial finite tool is one process; no direct writable Worker directory or arbitrary code loading.
    invariant(c.profile.limits.processes === 1 && c.profile.limits.file_bytes <= 24576 && c.profile.limits.output_bytes <= 1048576, 'M15_INITIAL_TOOL_BOUNDS');
    for (const n of [c.pipe_name, c.admin_pipe_name])
        invariant(/^AgentNexus-M15-[A-Za-z0-9-]{1,100}$/.test(n), 'M15_PIPE_NAME');
    invariant(c.pipe_name !== c.admin_pipe_name, 'M15_PIPE_NAME');
    invariant(Array.isArray(c.pins) && c.pins.length > 0 && c.pins.length <= 120 && Array.isArray(c.source_files) && c.source_files.length > 0 && c.source_files.length <= 100, 'M15_PIN_LIMIT');
    const paths = new Set();
    let externalHashPins = 0;
    for (const pin of c.pins) {
        keys(pin, ['path', 'sha256', 'directory', 'sddl', 'owner_sid']);
        invariant(isAbsolute(pin.path) && !paths.has(resolve(pin.path).toLowerCase()) && typeof pin.directory === 'boolean' && typeof pin.sddl === 'string' && pin.sddl.includes('D:P') && typeof pin.owner_sid === 'string', 'M15_PIN');
        paths.add(resolve(pin.path).toLowerCase());
        if (pin.directory)
            invariant(pin.sha256 === null, 'M15_PIN');
        else if (pin.sha256 === null)
            externalHashPins++;
        else
            hash(pin.sha256);
    }
    invariant(externalHashPins === 1, 'M15_EXTERNAL_CONFIG_HASH_REQUIRED');
    const sourceNames = new Set();
    for (const f of c.source_files) {
        keys(f, ['path', 'sha256']);
        hash(f.sha256);
        invariant(pathBelow(c.code_root, join(c.code_root, f.path)) && !f.path.includes('\\') && !sourceNames.has(f.path.toLowerCase()), 'M15_SOURCE_PATH');
        sourceNames.add(f.path.toLowerCase());
        invariant(c.pins.some(p => !p.directory && resolve(p.path).toLowerCase() === resolve(join(c.code_root, f.path)).toLowerCase() && p.sha256 === f.sha256), 'M15_SOURCE_PIN_REQUIRED');
    }
    for (const pin of c.pins)
        validatePermissionPin(c, pin);
    const required = [c.code_root, dirname(c.node.path), dirname(c.powershell.path), c.node.path, c.powershell.path, c.native.script, join(dirname(c.native.script), 'NativeRuntime.cs'), join(dirname(c.native.script), 'BootstrapNative.cs'), c.worker_script, c.host_public_key, c.qualification_public_key, c.launcher_public_key, ...(c.role === 'HOST' ? [c.host_root, c.broker_root, c.host_key, c.broker_key, c.resource.root] : [c.launcher_root, c.launcher_key])];
    for (const p of required)
        invariant(paths.has(resolve(p).toLowerCase()), 'M15_PIN_REQUIRED');
    for (const [path, expected] of [[c.node.path, c.node.sha256], [c.powershell.path, c.powershell.sha256], [c.native.script, c.native.script_hash], [join(dirname(c.native.script), 'NativeRuntime.cs'), c.native.native_hash], [join(dirname(c.native.script), 'BootstrapNative.cs'), c.native.bootstrap_hash], [c.worker_script, c.worker_script_hash], [c.host_public_key, c.host_public_key_hash], [c.launcher_public_key, c.launcher_public_key_hash]])
        invariant(c.pins.some(p => resolve(p.path).toLowerCase() === resolve(path).toLowerCase() && p.sha256 === expected), 'M15_FINGERPRINT_PIN_MISMATCH');
    invariant(c.qualification_certificates.length <= 16, 'M15_QUALIFICATION_LIMIT');
    keys(c.resource, ['id', 'project_id', 'task_id', 'root', 'quota_bytes']);
    invariant(c.resource.id.startsWith(c.resource.project_id + ':') && Number.isSafeInteger(c.resource.quota_bytes) && c.resource.quota_bytes > 0, 'M15_RESOURCE');
    return c;
}
export function attestationPins(config, configPath, configHash) {
    hash(configHash);
    invariant(!within(config.code_root, configPath), 'M15_CONFIG_OUTSIDE_CODE_REQUIRED');
    const external = config.pins.filter(p => !p.directory && p.sha256 === null);
    invariant(external.length === 1 && resolve(external[0].path).toLowerCase() === resolve(configPath).toLowerCase(), 'M15_CONFIG_PIN_REQUIRED');
    return config.pins.map(p => p === external[0] ? { ...p, sha256: configHash } : p);
}
export async function verifyCodeInventory(config, configPath) {
    const actual = new Map();
    const visit = async (dir) => { for (const e of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, e.name), stat = await lstat(path);
        invariant(!stat.isSymbolicLink(), 'M15_SOURCE_LINK');
        if (stat.isDirectory())
            await visit(path);
        else {
            invariant(stat.isFile(), 'M15_SOURCE_TYPE');
            if (resolve(path).toLowerCase() === resolve(configPath).toLowerCase())
                continue;
            invariant(actual.size < 100, 'M15_SOURCE_LIMIT');
            const name = relative(config.code_root, path).replaceAll('\\', '/');
            actual.set(name, sha256(await readFile(path)));
        }
    } };
    await visit(config.code_root);
    invariant(actual.size === config.source_files.length && config.source_files.every(f => actual.get(f.path) === f.sha256), 'M15_SOURCE_MANIFEST_INCOMPLETE');
}
export async function attestNativeClient(native, config, pins, expectedSid) {
    const node = pins.find(p => resolve(p.path).toLowerCase() === resolve(config.node.path).toLowerCase());
    invariant(node, 'M15_NODE_PIN_REQUIRED');
    const batches = [];
    let batch = [node];
    for (const pin of pins) {
        if (pin === node)
            continue;
        const next = [...batch, pin];
        if (next.length > 64 || Buffer.byteLength(canonical({ expected_sid: expectedSid, process_id: process.pid, pins: next })) > 60000) {
            invariant(batch.length > 1, 'M15_PIN_FRAME_LIMIT');
            batches.push(batch);
            batch = [node, pin];
        }
        else
            batch = next;
    }
    batches.push(batch);
    invariant(batches.length <= 4, 'M15_PIN_LEASE_LIMIT');
    let observed;
    const ids = [];
    for (const part of batches) {
        const r = await native.request('bootstrap.attest', { expected_sid: expectedSid, process_id: process.pid, pins: part }, { deadline_ms: 10000 });
        invariant(r.standard_account_verified === true && r.process?.pid === process.pid && r.process?.principal === expectedSid && r.os_version === config.profile.os_version && typeof r.pin_id === 'string', 'M15_OS_ATTESTATION');
        if (observed)
            invariant(canonical(observed) === canonical(r.process), 'M15_BOOTSTRAP_PROCESS_CHANGED');
        observed = snapshot(r.process);
        ids.push(r.pin_id);
    }
    return { process: observed, pin_ids: ids };
}
export async function attestBootstrap(configPath, configHash) {
    invariant(process.platform === 'win32', 'M15_WINDOWS_REQUIRED');
    hash(configHash);
    invariant(isAbsolute(configPath), 'M15_CONFIG_PATH');
    const bytes = await readFile(configPath);
    invariant(bytes.length <= 1048576 && sha256(bytes) === configHash, 'M15_CONFIG_HASH');
    const config = validateConfig(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
    invariant(process.version === config.node.version && resolve(process.execPath).toLowerCase() === resolve(config.node.path).toLowerCase() && sha256(await readFile(process.execPath)) === config.node.sha256, 'M15_NODE_FINGERPRINT');
    invariant(resolve(process.cwd()).toLowerCase() === resolve(config.code_root).toLowerCase(), 'M15_START_DIRECTORY');
    // No database or admin object exists before OS attestation. Config hash is pinned outside Agent input.
    const configPin = config.pins.find(p => resolve(p.path).toLowerCase() === resolve(configPath).toLowerCase());
    invariant(configPin && !configPin.directory && configPin.sha256 === null, 'M15_CONFIG_PIN_REQUIRED');
    const native = await NativeClient.open({ powerShell: config.powershell.path, powerShell_hash: config.powershell.sha256, script: config.native.script, script_hash: config.native.script_hash, native_hash: config.native.native_hash, bootstrap_hash: config.native.bootstrap_hash, temporary_directory: config.role === 'HOST' ? config.host_root : config.launcher_root });
    try {
        const pins = attestationPins(config, configPath, configHash);
        const actual = await attestNativeClient(native, config, pins, config.role === 'HOST' ? config.host_sid : config.worker_sid);
        await verifyCodeInventory(config, configPath);
        invariant(sha256(await readFile(config.worker_script)) === config.worker_script_hash && sha256(await readFile(config.host_public_key)) === config.host_public_key_hash, 'M15_BOOTSTRAP_CODE_CHANGED');
        return { config, native, process: actual.process, pin_id: actual.pin_ids[0], helper_hash: native.helper_hash, close: () => native.close() };
    }
    catch (error) {
        native.close();
        throw error;
    }
}
