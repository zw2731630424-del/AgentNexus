import { randomBytes } from 'node:crypto';
import { canonical, invariant } from '../types.js';
import { keys, sameProcess, snapshot, validateProcess } from '../runtime/contracts.js';
import { authenticated, signed } from '../production/contracts.js';
export async function requireLauncherProof(channel, key, expected) {
    const local = await channel.local(), challenge = { schema: 'agentnexus/launcher-challenge/1', nonce: randomBytes(32).toString('hex'), host_process: local, launcher_process: channel.peer, expires: Date.now() + 3000 };
    await channel.recheck();
    try {
        await channel.write(Buffer.from(canonical(challenge)), challenge.expires);
        const raw = new TextDecoder('utf-8', { fatal: true }).decode(await channel.read(challenge.expires)), packet = JSON.parse(raw);
        invariant(canonical(packet) === raw, 'M15_LAUNCHER_PROOF_ENCODING');
        const p = authenticated(packet, key);
        keys(p, ['schema', 'challenge', 'launcher_owner', 'configuration_hash', 'source_manifest_hash', 'helper_hash']);
        validateProcess(p.launcher_owner);
        invariant(p.schema === 'agentnexus/launcher-instance-proof/1' && canonical(p.challenge) === canonical(challenge) && Date.now() < challenge.expires && p.launcher_owner.principal === expected.worker_sid && p.configuration_hash === expected.configuration_hash && p.source_manifest_hash === expected.source_manifest_hash && p.helper_hash === expected.helper_hash, 'M15_LAUNCHER_INSTANCE_PROOF');
        return challenge.nonce;
    }
    catch (error) {
        channel.close();
        throw error;
    }
}
export async function proveLauncher(channel, key, owner, binding) {
    const local = await channel.local(), deadline = Date.now() + 3000;
    await channel.recheck();
    try {
        const raw = new TextDecoder('utf-8', { fatal: true }).decode(await channel.read(deadline)), c = JSON.parse(raw);
        keys(c, ['schema', 'nonce', 'host_process', 'launcher_process', 'expires']);
        invariant(canonical(c) === raw && c.schema === 'agentnexus/launcher-challenge/1' && /^[a-f0-9]{64}$/.test(c.nonce) && Number.isSafeInteger(c.expires) && c.expires > Date.now() && c.expires - Date.now() <= 3000 && sameProcess(c.host_process, channel.peer) && sameProcess(c.launcher_process, local), 'M15_LAUNCHER_CHALLENGE');
        const proof = { schema: 'agentnexus/launcher-instance-proof/1', challenge: snapshot(c), launcher_owner: owner, ...binding };
        await channel.write(Buffer.from(canonical(signed(proof, key))), c.expires);
    }
    catch (error) {
        channel.close();
        throw error;
    }
}
