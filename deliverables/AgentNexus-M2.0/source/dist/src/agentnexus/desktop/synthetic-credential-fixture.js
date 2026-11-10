// Explicit regression fixture only. This module is dynamically imported after the Host's
// synthetic-only gate. Production Renderer/Preload expose no credential.save method.
import { randomUUID } from 'node:crypto';
import { DesktopError, object, requireThat, textValue, integer } from './contracts.js';
import { assertPendingSecretMetadataSafe } from '../model-runtime/vault.js';
export async function saveSyntheticFixture(input, c) {
    let p, clear;
    try {
        object(input, ['provider_id', 'name', 'notes', 'secret', 'rotate_id', 'max_concurrency', 'requests_per_minute'], ['provider_id', 'name', 'notes', 'secret', 'max_concurrency', 'requests_per_minute']);
        p = input;
        const v = c.provider(p.provider_id);
        requireThat(v.protocol === 'openai-compatible', 'UNSUPPORTED_PROTOCOL');
        textValue(p.name, 80);
        requireThat(typeof p.notes === 'string' && p.notes.length <= 500 && !/[\x00-\x1f]/.test(p.notes));
        integer(p.max_concurrency, 16, 1);
        integer(p.requests_per_minute, 10000, 1);
        requireThat(p.secret instanceof Uint8Array && p.secret.byteLength >= 24 && p.secret.byteLength <= (c.localMode ? 2560 : 4096), c.localMode ? 'INVALID_CREDENTIAL' : 'SYNTHETIC_KEY_REQUIRED');
        clear = Buffer.from(p.secret);
        p.secret.fill(0);
        p.secret = undefined;
        requireThat(c.localMode || clear.subarray(0, 15).equals(Buffer.from('synthetic-test-')), 'SYNTHETIC_KEY_REQUIRED');
        const scope = c.scope(v.id);
        requireThat(scope.models.length > 0, 'ADD_MODEL_FIRST');
        try {
            assertPendingSecretMetadataSafe(clear, JSON.stringify({ provider: v, scope, name: p.name, notes: p.notes, rotate_id: p.rotate_id ?? null, max_concurrency: p.max_concurrency, requests_per_minute: p.requests_per_minute }));
        }
        catch {
            throw new DesktopError('CREDENTIAL_SAVE_FAILED');
        }
        c.safe({ name: p.name, notes: p.notes });
        if (c.service) {
            requireThat(c.service.assurance === 'SIMULATED', 'SYNTHETIC_SERVICE_REQUIRED');
            const stored = await c.service.invoke('credential.save', { ...p, ...scope, secret: clear });
            await c.refresh();
            await c.invalidate(v.id, 'CREDENTIAL_CHANGED');
            return stored;
        }
        const { vault, vaultAdmin } = c.local;
        let added = null;
        try {
            const newId = 'key.' + randomUUID();
            if (p.rotate_id)
                requireThat(vault.list(vaultAdmin).some(k => k.key_id === p.rotate_id && k.provider_id === v.id), 'KEY_NOT_FOUND');
            await c.audit('DESKTOP_CREDENTIAL_INTENT', { key_id: newId, provider_id: v.id, action: p.rotate_id ? 'ROTATE' : 'ADD', old_key_id: p.rotate_id ?? null });
            const record = { key_id: newId, provider_id: v.id, models: scope.models, secret: clear, max_concurrency: p.max_concurrency, requests_per_minute: p.requests_per_minute };
            const info = p.rotate_id ? await vault.rotate(vaultAdmin, p.rotate_id, record) : await vault.add(vaultAdmin, record);
            added = info.key_id;
            await c.label({ id: info.key_id, revision: 0, name: p.name, notes: p.notes, state: 'ACTIVE' });
            await c.audit('DESKTOP_CREDENTIAL_SAVED', { key_id: info.key_id, provider_id: v.id, action: p.rotate_id ? 'ROTATE' : 'ADD', status: 'CREDENTIAL_SAVED' });
            await c.invalidate(v.id, 'CREDENTIAL_CHANGED');
            return { stored: true, status: 'CREDENTIAL_SAVED', key_id: info.key_id, classification: info.classification };
        }
        catch (error) {
            if (added) {
                try {
                    await vault.removeStored(vaultAdmin, added);
                }
                catch { /* No acknowledgment after incomplete cleanup. */ }
            }
            await c.audit('DESKTOP_CREDENTIAL_FAILED', { code: error instanceof DesktopError ? error.code : 'CREDENTIAL_SAVE_FAILED' });
            throw error instanceof DesktopError ? error : new DesktopError('CREDENTIAL_SAVE_FAILED');
        }
    }
    finally {
        clear?.fill(0);
        if (input && typeof input === 'object' && 'secret' in input) {
            const secret = input.secret;
            if (secret instanceof Uint8Array)
                secret.fill(0);
            input.secret = undefined;
        }
    }
}
