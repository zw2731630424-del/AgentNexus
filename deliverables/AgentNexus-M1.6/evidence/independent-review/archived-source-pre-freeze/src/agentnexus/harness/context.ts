import { TextDecoder } from 'node:util';
import { auditEvent, canonical, invariant, NexusError, now, sha256, uid } from '../types.ts';
import type { ArtifactRef, ContextInput, Identity, Json, StoredRecord } from '../types.ts';
import { validateRecord } from '../records.ts';
import { identifier, snapshot, subject as validateSubject } from './contracts.ts';
import type { Subject } from './contracts.ts';
import type { NativeState } from './state.ts';

export type ContextKind = 'RAW' | 'SUMMARY' | 'RETRIEVAL' | 'DERIVED_INDEX';
export type ContextSection = 'PROJECT_RULES' | 'AGENT_CONTRACT' | 'TASK_CONTRACT' | 'RECENT_INTERACTION' |
  'WORK_STATE' | 'HISTORY' | 'FILE_CONTENT' | 'DECISION' | 'TOOL_RESULT' | 'AGENT_MESSAGE';
export type ContextSource = {
  event_id: string; record_hash: string; project_id: string; task_id: string; kind: ContextKind;
  payload_ref: ArtifactRef; offset: number; length: number;
};
export type ContextSelection = { source: ContextSource; section: ContextSection; required: boolean };
export type ContextEntry = ContextSelection & { range_sha256: string; text: string };
export type AssembledContext = {
  view_id: string; project_id: string; task_id: string; agent_id: string; text: string; bytes: number;
  sha256: string; entries: ContextEntry[]; omitted: ContextSource[];
};
type View = Omit<AssembledContext, 'text' | 'entries'> & {
  revision: number; entries: Omit<ContextEntry, 'text'>[]; runtime_instance_id: string;
};
const KINDS: ContextKind[] = ['RAW', 'SUMMARY', 'RETRIEVAL', 'DERIVED_INDEX'];
const SECTIONS: ContextSection[] = ['PROJECT_RULES', 'AGENT_CONTRACT', 'TASK_CONTRACT', 'RECENT_INTERACTION',
  'WORK_STATE', 'HISTORY', 'FILE_CONTENT', 'DECISION', 'TOOL_RESULT', 'AGENT_MESSAGE'];
export const CONTEXT_LIMITS = Object.freeze({ maxBytes: 256 * 1024, maxSources: 32, maxScanBytes: 512 * 1024 * 1024, maxCaptureBytes: 512 * 1024 * 1024 });
function identity(s: Subject): Identity { return { agent_id: s.agent_id, project_id: s.project_id, task_id: s.task_id, session_id: s.session_id }; }
function viewOf(context: AssembledContext, s: Subject): View {
  const { text: _text, entries, ...metadata } = context;
  return { ...metadata, revision: 0, runtime_instance_id: s.runtime_instance_id,
    entries: entries.map(({ text: _entryText, ...entry }) => entry) };
}

/** Verify that a model receives exactly an acknowledged, source-bound context view. */
export function assertContextView(state: NativeState, s: Subject, input: AssembledContext): AssembledContext {
  const context = snapshot(input, 600 * 1024);
  identifier(context.view_id);
  invariant(context.project_id === s.project_id && context.task_id === s.task_id && context.agent_id === s.agent_id, 'CONTEXT_VIEW_SCOPE');
  invariant(typeof context.text === 'string' && Buffer.byteLength(context.text) === context.bytes && context.bytes <= CONTEXT_LIMITS.maxBytes && sha256(context.text) === context.sha256, 'CONTEXT_VIEW_HASH');
  invariant(Array.isArray(context.entries) && context.entries.length <= CONTEXT_LIMITS.maxSources &&
    context.entries.every(entry => typeof entry.text === 'string' && sha256(entry.text) === entry.range_sha256) &&
    context.entries.map(entry => entry.text).join('\n\n') === context.text, 'CONTEXT_VIEW_HASH');
  const stored = state.get<View>('CONTEXT_VIEW', context.view_id);
  invariant(stored && canonical(stored) === canonical(viewOf(context, s)), 'CONTEXT_VIEW_UNACKNOWLEDGED');
  const exported = state.store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE r.operation_id=? AND r.domain='audit' AND json_extract(r.body,'$.phase')='CONTEXT_ASSEMBLED'").get(context.view_id);
  invariant(exported, 'CONTEXT_VIEW_UNACKNOWLEDGED');
  return context;
}

/** Finite model views over the existing immutable Archive; no replacement history. */
export class ContextAssembly {
  #state: NativeState; #readTask: (s: Subject, taskId: string) => boolean;
  constructor(state: NativeState, options: { readTask?: (s: Subject, taskId: string) => boolean } = {}) {
    this.#state = state; this.#readTask = options.readTask ?? (() => false);
  }
  #record(s: Subject, eventId: string): StoredRecord {
    validateSubject(s); identifier(eventId);
    const row = this.#state.store.db.prepare('SELECT seq,domain,event_id,operation_id,project_id,task_id,previous_hash,hash,body FROM anx_records WHERE event_id=?').get(eventId) as Record<string, unknown> | undefined;
    invariant(row && row.domain === 'context', 'CONTEXT_SOURCE_MISSING');
    const record = validateRecord({ ...row, body: JSON.parse(String(row.body)) });
    invariant(record.project_id === s.project_id, 'CONTEXT_PROJECT_DENIED');
    invariant(record.task_id === s.task_id || this.#readTask(s, record.task_id) === true, 'CONTEXT_TASK_DENIED');
    this.#state.store.artifacts.assertPublished((record.body as unknown as ContextInput).payload_ref);
    return record;
  }
  source(s: Subject, eventId: string, options: { offset?: number; length?: number; expected_record_hash?: string } = {}): ContextSource {
    invariant(Object.keys(options).every(k => ['offset','length','expected_record_hash'].includes(k)), 'CONTEXT_RANGE');
    const record = this.#record(s, eventId), body = record.body as unknown as ContextInput;
    invariant(options.expected_record_hash === undefined || options.expected_record_hash === record.hash, 'CONTEXT_REFERENCE_HASH');
    const offset = options.offset ?? 0, length = options.length ?? body.payload_ref.bytes - offset;
    invariant(Number.isSafeInteger(offset) && Number.isSafeInteger(length) && offset >= 0 && length >= 0 && offset + length <= body.payload_ref.bytes, 'CONTEXT_RANGE');
    const parsed = body.kind.startsWith('harness.') ? body.kind.slice(8) : 'RAW';
    invariant(KINDS.includes(parsed as ContextKind), 'CONTEXT_SOURCE_KIND');
    return snapshot({ event_id: eventId, record_hash: record.hash, project_id: record.project_id, task_id: record.task_id,
      kind: parsed as ContextKind, payload_ref: body.payload_ref, offset, length });
  }
  validate(s: Subject, source: ContextSource): ContextSource {
    const supplied = snapshot(source), actual = this.source(s, supplied.event_id, { offset: supplied.offset, length: supplied.length, expected_record_hash: supplied.record_hash });
    invariant(canonical(actual) === canonical(supplied), 'CONTEXT_REFERENCE_MISMATCH'); return actual;
  }
  async capture(s: Subject, kind: ContextKind, bytes: Uint8Array | AsyncIterable<Uint8Array>, options: {
    operation_id?: string; maxBytes?: number; source_refs?: ContextSource[];
  } = {}): Promise<ContextSource> {
    validateSubject(s); s = snapshot(s); invariant(KINDS.includes(kind), 'CONTEXT_SOURCE_KIND');
    invariant(Object.keys(options).every(k => ['operation_id','maxBytes','source_refs'].includes(k)), 'CONTEXT_CAPTURE_OPTIONS');
    const maxBytes = options.maxBytes ?? 16 * 1024 * 1024;
    invariant(Number.isSafeInteger(maxBytes) && maxBytes >= 0 && maxBytes <= CONTEXT_LIMITS.maxCaptureBytes, 'CONTEXT_CAPTURE_LIMIT');
    const sources = snapshot(options.source_refs ?? []); invariant(sources.length <= CONTEXT_LIMITS.maxSources, 'CONTEXT_SOURCE_LIMIT');
    for (const ref of sources) this.validate(s, ref);
    invariant(kind === 'RAW' || sources.length > 0, 'CONTEXT_DERIVATION_SOURCES_REQUIRED');
    const store = this.#state.store, operation = options.operation_id ?? uid(); identifier(operation);
    const ref = bytes instanceof Uint8Array ? await store.artifacts.putBytes(bytes, { maxBytes, media_type: 'text/plain; charset=utf-8' })
      : await store.artifacts.put(bytes, { maxBytes, media_type: 'text/plain; charset=utf-8' });
    const eventId = uid();
    await this.#state.change(s, 'CONTEXT_CAPTURED', () => {
      for (const source of sources) this.validate(s,source);
      const audit = store.audit(auditEvent(identity(s), { operation_id: operation, operation_type: 'CONTEXT_CAPTURE', phase: kind,
        artifact_refs: [ref], context_event_refs: sources.map(source => source.event_id), detail: { source_refs: sources } as unknown as Json }));
      store.context({ ...identity(s), event_id: eventId, operation_id: operation, observed_at: now(), kind: 'harness.' + kind, payload_ref: ref, audit_event_refs: [audit.event_id] });
    }, { kind, event_id: eventId, payload_sha256: ref.sha256 }, operation);
    return this.source(s, eventId);
  }
  async readRange(s: Subject, source: ContextSource, options: { maxBytes?: number; maxScanBytes?: number } = {}): Promise<{ text: string; range_sha256: string }> {
    const ref = this.validate(s, source), maxBytes = options.maxBytes ?? CONTEXT_LIMITS.maxBytes,
      maxScanBytes = options.maxScanBytes ?? CONTEXT_LIMITS.maxScanBytes;
    invariant(Number.isSafeInteger(maxBytes) && maxBytes >= 0 && maxBytes <= CONTEXT_LIMITS.maxBytes && ref.length <= maxBytes, 'CONTEXT_BYTES_LIMIT');
    invariant(Number.isSafeInteger(maxScanBytes) && maxScanBytes >= 0 && maxScanBytes <= CONTEXT_LIMITS.maxScanBytes && ref.payload_ref.bytes <= maxScanBytes, 'CONTEXT_SCAN_LIMIT');
    const output = Buffer.alloc(ref.length); let offset = 0, copied = 0;
    // Complete iteration is required even after the range ends: ArtifactStore's final hash barrier is authoritative.
    for await (const chunk of this.#state.store.artifacts.read(ref.payload_ref)) {
      const first = Math.max(0, ref.offset - offset), end = Math.min(chunk.length, ref.offset + ref.length - offset);
      if (end > first) { output.set(chunk.subarray(first, end), copied); copied += end - first; }
      offset += chunk.length;
    }
    invariant(copied === ref.length, 'CONTEXT_RANGE');
    let text: string; try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(output); }
    catch { throw new NexusError('CONTEXT_UTF8_BOUNDARY'); }
    return { text, range_sha256: sha256(output) };
  }
  async assemble(s: Subject, input: ContextSelection[], options: { maxBytes: number; maxSources?: number; maxScanBytes?: number }): Promise<AssembledContext> {
    validateSubject(s); s = snapshot(s); this.#state.require('native.context-assembly', s);
    options = snapshot(options); invariant(Object.keys(options).every(k => ['maxBytes','maxSources','maxScanBytes'].includes(k)), 'CONTEXT_ASSEMBLY_LIMIT');
    const selections = snapshot(input), maxSources = options.maxSources ?? CONTEXT_LIMITS.maxSources,
      scanLimit = options.maxScanBytes ?? CONTEXT_LIMITS.maxScanBytes;
    invariant(Number.isSafeInteger(options.maxBytes) && options.maxBytes >= 0 && options.maxBytes <= CONTEXT_LIMITS.maxBytes &&
      Number.isSafeInteger(maxSources) && maxSources > 0 && maxSources <= CONTEXT_LIMITS.maxSources &&
      Number.isSafeInteger(scanLimit) && scanLimit >= 0 && scanLimit <= CONTEXT_LIMITS.maxScanBytes, 'CONTEXT_ASSEMBLY_LIMIT');
    invariant(Array.isArray(selections) && selections.length <= CONTEXT_LIMITS.maxSources, 'CONTEXT_SOURCE_LIMIT');
    const entries: ContextEntry[] = [], omitted: ContextSource[] = []; let bytes = 0, scanned = 0;
    for (const item of selections) {
      invariant(Object.keys(item).sort().join(',') === 'required,section,source' && SECTIONS.includes(item.section) && typeof item.required === 'boolean', 'CONTEXT_SELECTION');
      const source = this.validate(s, item.source);
      const required = item.required || ['PROJECT_RULES','AGENT_CONTRACT','TASK_CONTRACT'].includes(item.section);
      const nextBytes = bytes + source.length + (entries.length ? 2 : 0);
      if (nextBytes > options.maxBytes || entries.length >= maxSources || scanned + source.payload_ref.bytes > scanLimit) {
        invariant(!required, 'CONTEXT_REQUIRED_OVERFLOW'); omitted.push(source); continue;
      }
      const range = await this.readRange(s, source, { maxBytes: options.maxBytes, maxScanBytes: scanLimit - scanned });
      scanned += source.payload_ref.bytes; bytes = nextBytes; entries.push({ ...item, source, required, ...range });
    }
    this.#state.require('native.context-assembly', s);
    const text = entries.map(entry => entry.text).join('\n\n'), view: AssembledContext = { view_id: uid(), project_id: s.project_id, task_id: s.task_id,
      agent_id: s.agent_id, text, bytes, sha256: sha256(text), entries, omitted };
    await this.#state.change(s, 'CONTEXT_ASSEMBLED', () => {
      for (const entry of entries) this.validate(s,entry.source);
      this.#state.insert('CONTEXT_VIEW', view.view_id, s, 'ACKNOWLEDGED', viewOf(view, s));
    },
      { view_id: view.view_id, sha256: view.sha256, bytes, sources: entries.length, omitted: omitted.length }, view.view_id);
    return snapshot(view, 600 * 1024);
  }
}
