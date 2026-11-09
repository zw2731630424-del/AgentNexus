import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, opendir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { TextDecoder } from 'node:util';
import { canonical, NexusError, sha256 } from './types.js';
// Independently authored. Only a trusted Host may select controlled_static after
// exclusively creating a local, quiescent staging tree (including trusted root
// ancestors, no reparse points/ADS). This library does not authenticate that fact.
// Do not use Node path checks as an adversarial filesystem/OS execution boundary.
export const INTEGRITY_LIMITS = Object.freeze({
    maxFiles: 256,
    maxTotalBytes: 16 * 1024 * 1024,
    maxFileBytes: 8 * 1024 * 1024,
    maxManifestBytes: 128 * 1024,
    maxDirectories: 256,
    maxEntries: 513,
    maxDepth: 12,
    maxComponentBytes: 64,
    maxRelativeBytes: 240,
    maxWindowsAbsoluteCharacters: 240,
    readBufferBytes: 64 * 1024,
    maxDetails: 32,
    maxDetailBytes: 8192,
    maxDurationMs: 10000,
    hashConcurrency: 1,
});
class Rejection extends NexusError {
    status;
    path;
    constructor(status, code, path) {
        super(code);
        this.status = status;
        this.path = path;
    }
}
function reject(code, path) { throw new Rejection('FAIL', code, path); }
function budget(code, path) { throw new Rejection('INCONCLUSIVE', code, path); }
function objectWithKeys(value, keys) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}
function sameMetadata(a, b) {
    return a.dev === b.dev && a.ino === b.ino && a.mode === b.mode && a.nlink === b.nlink
        && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
}
function identityAvailable(info) {
    return typeof info.ino === 'bigint' && info.ino > 0n && typeof info.dev === 'bigint';
}
// Includes ancestor components, so Dir/a + dir/b and file a + a/b conflict.
class PortablePaths {
    nodes = new Map();
    add(path, kind) {
        if (path.length === 0 || path.length > INTEGRITY_LIMITS.maxRelativeBytes)
            reject('PATH_PROFILE', path);
        const parts = path.split('/');
        if (parts.length > INTEGRITY_LIMITS.maxDepth)
            budget('DEPTH_BUDGET', path);
        for (const part of parts) {
            if (part.length === 0 || part.length > INTEGRITY_LIMITS.maxComponentBytes
                || !/^[A-Za-z0-9._-]+$/.test(part) || part === '.' || part === '..' || part.endsWith('.')
                || /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part))
                reject('PATH_PROFILE', path);
        }
        for (let i = 0; i < parts.length; i++) {
            const prefix = parts.slice(0, i + 1).join('/');
            const key = prefix.toLowerCase();
            const expectedKind = i === parts.length - 1 ? kind : 'directory';
            const prior = this.nodes.get(key);
            if (prior && prior.path !== prefix)
                reject('PATH_CASE_COLLISION', path);
            if (prior && prior.kind !== expectedKind)
                reject('PATH_PREFIX_CONFLICT', path);
            this.nodes.set(key, { path: prefix, kind: expectedKind });
        }
    }
}
export async function verifyPackage(root, options) {
    const startedAt = performance.now();
    let startedWork = false;
    let filesChecked = 0;
    let bytesChecked = 0;
    let manifestHash = null;
    let detailCount = 0;
    const details = [];
    const checks = {
        schema: false, canonical: false, portablePaths: false, bidirectional: false,
        fileContents: false, secondInventory: false,
        sourceMode: options?.sourceMode ?? 'INVALID',
        assurance: 'NO_OS_ADMISSION',
        hostPrecondition: 'trusted Host selects mode; controlled_static requires exclusive local staging, trusted ancestors, no hostile writer/reparse/ADS',
        allWindowsReparseTags: 'NOT_VERIFIED_BY_NODE',
        alternateDataStreams: 'NOT_ENUMERATED_BY_NODE',
        adversarialTOCTOU: 'NOT_CLOSED',
        deadlineEnforcement: 'COOPERATIVE_BETWEEN_FS_OPERATIONS',
        runtimeOrLicenseAdmission: 'NOT_EVALUATED',
        maxOpenFileHandles: 1,
    };
    const addDetail = (code, path) => {
        detailCount++;
        const value = path === undefined ? { code } : { code, path: path.slice(0, 240) };
        if (details.length < INTEGRITY_LIMITS.maxDetails
            && Buffer.byteLength(canonical([...details, value])) <= INTEGRITY_LIMITS.maxDetailBytes)
            details.push(value);
    };
    const finish = (status, reason) => ({
        status, reason, filesChecked, bytesChecked, manifest_sha256: manifestHash,
        details, detailCount, detailsTruncated: detailCount > details.length, checks,
    });
    try {
        if (!options || typeof options !== 'object'
            || Object.keys(options).some(key => !['sourceMode', 'maxFiles', 'maxTotalBytes', 'signal'].includes(key))
            || !['controlled_static', 'mutable'].includes(options.sourceMode))
            reject('INVALID_OPTIONS');
        const maxFiles = options.maxFiles ?? INTEGRITY_LIMITS.maxFiles;
        const maxTotalBytes = options.maxTotalBytes ?? INTEGRITY_LIMITS.maxTotalBytes;
        if (!Number.isSafeInteger(maxFiles) || maxFiles < 0 || maxFiles > INTEGRITY_LIMITS.maxFiles
            || !Number.isSafeInteger(maxTotalBytes) || maxTotalBytes < 0 || maxTotalBytes > INTEGRITY_LIMITS.maxTotalBytes
            || (options.signal !== undefined && !(options.signal instanceof AbortSignal)))
            reject('INVALID_OPTIONS');
        checks.maxFiles = maxFiles;
        checks.maxTotalBytes = maxTotalBytes;
        const checkpoint = () => {
            if (options.signal?.aborted)
                throw new Rejection(startedWork ? 'INCONCLUSIVE' : 'NOT_RUN', 'CANCELLED');
            if (performance.now() - startedAt > INTEGRITY_LIMITS.maxDurationMs)
                budget('TIME_BUDGET');
        };
        checkpoint();
        if (typeof root !== 'string' || !isAbsolute(root) || root.includes('\0') || /^[/\\]{2}/.test(root))
            reject('INVALID_ROOT');
        startedWork = true;
        let rootInfo;
        try {
            rootInfo = await lstat(root, { bigint: true });
        }
        catch (error) {
            if (error.code === 'ENOENT')
                reject('ROOT_NOT_FOUND');
            throw error;
        }
        checkpoint();
        if (rootInfo.isSymbolicLink())
            reject('LINK_PATH', '.');
        if (!rootInfo.isDirectory())
            reject('ROOT_NOT_DIRECTORY');
        if (!identityAvailable(rootInfo))
            budget('IDENTITY_UNAVAILABLE', '.');
        const base = await realpath(resolve(root));
        const absolute = (path) => {
            const full = join(base, ...path.split('/'));
            const rel = relative(base, full);
            if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep))
                reject('PATH_ESCAPE', path);
            if (process.platform === 'win32' && full.length > INTEGRITY_LIMITS.maxWindowsAbsoluteCharacters)
                reject('WINDOWS_PATH_LENGTH', path);
            return full;
        };
        const validateMetadata = (info, path, kind) => {
            if (info.isSymbolicLink())
                reject('LINK_PATH', path);
            if (kind === 'file' ? !info.isFile() : !info.isDirectory())
                reject('NON_REGULAR_ENTRY', path);
            if (!identityAvailable(info))
                budget('IDENTITY_UNAVAILABLE', path);
            if (info.dev !== rootInfo.dev)
                reject('CROSS_DEVICE', path);
            if (kind === 'file') {
                if (info.nlink > 1n)
                    reject('HARDLINK_PATH', path);
                if (info.nlink !== 1n)
                    budget('LINK_COUNT_UNAVAILABLE', path);
            }
        };
        const readRegular = async (path, expected, cap, payload) => {
            checkpoint();
            validateMetadata(expected, path, 'file');
            if (expected.size > BigInt(cap))
                budget(payload ? 'FILE_BYTES_BUDGET' : 'MANIFEST_BYTES_BUDGET', path);
            let handle;
            try {
                const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0);
                handle = await open(absolute(path), flags);
                const before = await handle.stat({ bigint: true });
                validateMetadata(before, path, 'file');
                if (!sameMetadata(before, expected))
                    reject('CHANGED_BEFORE_READ', path);
                const hash = createHash('sha256');
                const chunks = [];
                const buffer = Buffer.allocUnsafe(INTEGRITY_LIMITS.readBufferBytes);
                let count = 0;
                while (true) {
                    checkpoint();
                    // A one-byte probe detects growth at a limit without reading a whole
                    // extra chunk beyond either file or cumulative payload budgets.
                    const length = Math.min(buffer.length, cap - count + 1, payload ? maxTotalBytes - bytesChecked + 1 : buffer.length);
                    const read = await handle.read(buffer, 0, length, count);
                    checkpoint();
                    if (read.bytesRead === 0)
                        break;
                    count += read.bytesRead;
                    if (payload) {
                        bytesChecked += read.bytesRead;
                        if (bytesChecked > maxTotalBytes)
                            budget('TOTAL_BYTES_BUDGET', path);
                    }
                    else
                        chunks.push(Buffer.from(buffer.subarray(0, read.bytesRead)));
                    if (count > cap)
                        budget(payload ? 'FILE_BYTES_BUDGET' : 'MANIFEST_BYTES_BUDGET', path);
                    hash.update(buffer.subarray(0, read.bytesRead));
                }
                const after = await handle.stat({ bigint: true });
                validateMetadata(after, path, 'file');
                if (!sameMetadata(before, after) || BigInt(count) !== before.size)
                    reject('CHANGED_DURING_READ', path);
                return { digest: hash.digest('hex'), raw: payload ? null : Buffer.concat(chunks), info: after };
            }
            finally {
                if (handle)
                    await handle.close();
            }
        };
        let manifestInfo;
        try {
            manifestInfo = await lstat(absolute('manifest.json'), { bigint: true });
        }
        catch (error) {
            if (error.code === 'ENOENT')
                reject('MANIFEST_MISSING');
            throw error;
        }
        const manifestRead = await readRegular('manifest.json', manifestInfo, INTEGRITY_LIMITS.maxManifestBytes, false);
        const raw = manifestRead.raw;
        manifestHash = sha256(raw);
        let manifest;
        try {
            manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw));
        }
        catch {
            reject('MANIFEST_JSON');
        }
        if (!objectWithKeys(manifest, ['schema', 'profile', 'files'])
            || manifest.schema !== 'agentnexus/package/1' || manifest.profile !== 'portable-ascii-v1'
            || !Array.isArray(manifest.files))
            reject('MANIFEST_SCHEMA');
        if (manifest.files.length > maxFiles)
            budget('FILE_COUNT_BUDGET');
        const entries = [];
        const listedPaths = new PortablePaths();
        const listed = new Set();
        const wantedDirs = new Set();
        let declaredBytes = 0;
        let previousPath;
        for (const item of manifest.files) {
            checkpoint();
            if (!objectWithKeys(item, ['path', 'bytes', 'sha256']) || typeof item.path !== 'string'
                || typeof item.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(item.sha256)
                || typeof item.bytes !== 'number' || !Number.isSafeInteger(item.bytes) || item.bytes < 0)
                reject('MANIFEST_ENTRY');
            if (item.path === 'manifest.json')
                reject('MANIFEST_LISTS_SELF', item.path);
            if (listed.has(item.path))
                reject('DUPLICATE_PATH', item.path);
            listedPaths.add(item.path, 'file');
            absolute(item.path);
            if (previousPath !== undefined && previousPath >= item.path)
                reject('MANIFEST_ORDER', item.path);
            previousPath = item.path;
            if (item.bytes > INTEGRITY_LIMITS.maxFileBytes)
                budget('FILE_BYTES_BUDGET', item.path);
            declaredBytes += item.bytes;
            if (declaredBytes > maxTotalBytes)
                budget('TOTAL_BYTES_BUDGET');
            listed.add(item.path);
            const components = item.path.split('/');
            for (let i = 1; i < components.length; i++)
                wantedDirs.add(components.slice(0, i).join('/'));
            entries.push({ path: item.path, bytes: item.bytes, sha256: item.sha256 });
        }
        checks.schema = true;
        checks.portablePaths = true;
        // Re-encoding the entire input, not just comparing parsed values, also rejects
        // duplicate JSON keys and alternative escapes that JSON.parse discards.
        if (!raw.equals(Buffer.from(canonical(manifest) + '\n', 'utf8')))
            reject('MANIFEST_NONCANONICAL');
        checks.canonical = true;
        const inventory = async () => {
            const files = new Map();
            const directories = new Map();
            const seenIdentity = new Set();
            const portable = new PortablePaths();
            const queue = [''];
            let count = 0;
            let actualBytes = 0n;
            for (let index = 0; index < queue.length; index++) {
                checkpoint();
                const current = queue[index];
                const directoryPath = current === '' ? base : absolute(current);
                const before = await lstat(directoryPath, { bigint: true });
                validateMetadata(before, current || '.', 'directory');
                if (current === '' && !sameMetadata(before, rootInfo))
                    reject('ROOT_CHANGED');
                const directory = await opendir(directoryPath, { bufferSize: 16 });
                try {
                    while (true) {
                        checkpoint();
                        const entry = await directory.read();
                        if (!entry)
                            break;
                        if (++count > INTEGRITY_LIMITS.maxEntries)
                            budget('ENTRY_COUNT_BUDGET');
                        const path = current === '' ? entry.name : current + '/' + entry.name;
                        // Validate spelling before resolving or opening an entry.
                        portable.add(path, entry.isDirectory() ? 'directory' : 'file');
                        const info = await lstat(absolute(path), { bigint: true });
                        if (info.isSymbolicLink())
                            reject('LINK_PATH', path);
                        const kind = info.isDirectory() ? 'directory' : 'file';
                        portable.add(path, kind);
                        validateMetadata(info, path, kind);
                        const identity = info.dev.toString() + ':' + info.ino.toString();
                        if (seenIdentity.has(identity))
                            reject('REPEATED_FILE_IDENTITY', path);
                        seenIdentity.add(identity);
                        if (kind === 'directory') {
                            directories.set(path, info);
                            if (directories.size > INTEGRITY_LIMITS.maxDirectories)
                                budget('DIRECTORY_COUNT_BUDGET');
                            queue.push(path);
                        }
                        else {
                            files.set(path, info);
                            if (files.size - (files.has('manifest.json') ? 1 : 0) > maxFiles)
                                budget('FILE_COUNT_BUDGET');
                            if (path !== 'manifest.json' && info.size > BigInt(INTEGRITY_LIMITS.maxFileBytes))
                                budget('FILE_BYTES_BUDGET', path);
                            if (path !== 'manifest.json')
                                actualBytes += info.size;
                            if (actualBytes > BigInt(maxTotalBytes))
                                budget('TOTAL_BYTES_BUDGET', path);
                        }
                    }
                }
                finally {
                    await directory.close();
                }
                const after = await lstat(directoryPath, { bigint: true });
                if (!sameMetadata(before, after))
                    reject('DIRECTORY_CHANGED', current || '.');
            }
            return { files, directories };
        };
        const actual = await inventory();
        if (!actual.files.has('manifest.json'))
            reject('MANIFEST_EXACT_PATH');
        if (!sameMetadata(actual.files.get('manifest.json'), manifestRead.info))
            reject('MANIFEST_CHANGED');
        for (const path of listed)
            if (!actual.files.has(path))
                addDetail('MISSING_FILE', path);
        for (const path of actual.files.keys())
            if (path !== 'manifest.json' && !listed.has(path))
                addDetail('UNLISTED_FILE', path);
        for (const path of actual.directories.keys())
            if (!wantedDirs.has(path))
                addDetail('UNLISTED_DIRECTORY', path);
        for (const path of wantedDirs)
            if (!actual.directories.has(path))
                addDetail('MISSING_DIRECTORY', path);
        if (detailCount > 0)
            return finish('FAIL', 'INVENTORY_MISMATCH');
        checks.bidirectional = true;
        for (const item of entries) {
            checkpoint();
            const expected = actual.files.get(item.path);
            if (expected.size !== BigInt(item.bytes))
                reject('BYTES_MISMATCH', item.path);
            const content = await readRegular(item.path, expected, INTEGRITY_LIMITS.maxFileBytes, true);
            if (content.digest !== item.sha256)
                reject('HASH_MISMATCH', item.path);
            filesChecked++;
        }
        checks.fileContents = true;
        const again = await inventory();
        for (const [kind, first, second] of [
            ['file', actual.files, again.files], ['directory', actual.directories, again.directories],
        ]) {
            if (first.size !== second.size)
                reject('TREE_CHANGED', kind);
            for (const [path, info] of first)
                if (!second.has(path) || !sameMetadata(info, second.get(path)))
                    reject('TREE_CHANGED', path);
        }
        checkpoint();
        checks.secondInventory = true;
        if (options.sourceMode === 'mutable')
            return finish('INCONCLUSIVE', 'TOCTOU_NOT_CLOSED');
        checks.assurance = 'CONTROLLED_STATIC_HOST_PRECONDITION_ONLY';
        return finish('PASS', 'CONTROLLED_STATIC_CONTENT_MATCH');
    }
    catch (error) {
        if (error instanceof Rejection) {
            addDetail(error.code, error.path);
            return finish(error.status, error.code);
        }
        if (error instanceof NexusError) {
            addDetail(error.code);
            return finish('FAIL', error.code);
        }
        const code = error?.code;
        if (code === 'ENOENT' || code === 'ENOTDIR') {
            addDetail('SOURCE_CHANGED');
            return finish('FAIL', 'SOURCE_CHANGED');
        }
        if (code === 'ELOOP') {
            addDetail('LINK_PATH');
            return finish('FAIL', 'LINK_PATH');
        }
        addDetail(typeof code === 'string' && /^[A-Z0-9_]{1,48}$/.test(code) ? code : 'IO_ERROR');
        return finish('INCONCLUSIVE', 'IO_ERROR');
    }
}
