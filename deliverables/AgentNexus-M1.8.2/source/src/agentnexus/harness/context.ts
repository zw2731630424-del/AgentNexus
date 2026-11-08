import { TextDecoder } from 'node:util';
import { auditEvent, canonical, invariant, NexusError, now, sha256, uid } from '../types.ts';
import type { ArtifactRef, ContextInput, Identity, Json, StoredRecord } from '../types.ts';
import { validateArtifactRef, validateRecord } from '../records.ts';
import { identifier, snapshot, subject as validateSubject } from './contracts.ts';
import type { Subject } from './contracts.ts';
import type { NativeState } from './state.ts';

export type ContextKind = 'RAW' | 'SUMMARY' | 'RETRIEVAL' | 'DERIVED_INDEX';
export type ContextSection = 'PROJECT_RULES' | 'AGENT_CONTRACT' | 'TASK_CONTRACT' | 'RECENT_INTERACTION' |
  'WORK_STATE' | 'HISTORY' | 'FILE_CONTENT' | 'DECISION' | 'TOOL_RESULT' | 'AGENT_MESSAGE' | 'ARTIFACT';
export type ContextSource = {
  event_id: string; record_hash: string; project_id: string; task_id: string; kind: ContextKind;
  payload_ref: ArtifactRef; offset: number; length: number;
};
export type ContextVersionBinding = { reference: string; version: string; sha256: string };
export type ContextTaskBinding = {
  project_rules_version: string; rule_hash: string; feature_epoch: number; policy_epoch: number; workflow_version: string;
};
export type ContextSelection = { source: ContextSource; section: ContextSection; required: boolean; binding?: ContextVersionBinding };
export type ContextEntry = ContextSelection & { range_sha256: string; text: string };
export type AssembledContext = {
  view_id: string; project_id: string; task_id: string; agent_id: string; text: string; bytes: number;
  sha256: string; entries: ContextEntry[]; omitted: ContextSource[];
  // Optional in the public type so a persisted M1.6 view remains readable. Every new assembly has these fields.
  assembly_version?: string; input_ref?: ArtifactRef; manifest_ref?: ArtifactRef; provenance_sha256?: string; bindings?: ContextTaskBinding;
};
type View = Omit<AssembledContext, 'text' | 'entries'> & {
  revision: number; entries: Omit<ContextEntry, 'text'>[]; runtime_instance_id: string;
};
const KINDS: ContextKind[] = ['RAW', 'SUMMARY', 'RETRIEVAL', 'DERIVED_INDEX'];
const SECTIONS: ContextSection[] = ['PROJECT_RULES', 'AGENT_CONTRACT', 'TASK_CONTRACT', 'RECENT_INTERACTION',
  'WORK_STATE', 'HISTORY', 'FILE_CONTENT', 'DECISION', 'TOOL_RESULT', 'AGENT_MESSAGE', 'ARTIFACT'];
export const CONTEXT_ASSEMBLY_VERSION = 'agentnexus/context-assembly/1.6.1';
export const CONTEXT_LIMITS = Object.freeze({ maxBytes: 256 * 1024, maxSources: 32, maxScanBytes: 512 * 1024 * 1024,
  maxCaptureBytes: 512 * 1024 * 1024, maxConcurrentReads: 2, maxQueuedReads: 8 });
// text and per-entry text duplicate at most maxBytes; a JSON-escaped UTF-8 control byte can occupy six bytes.
const VIEW_ENVELOPE_BYTES=12*CONTEXT_LIMITS.maxBytes+2*49152;
type ReadWaiter = { start: () => void; abort: () => void; signal?: AbortSignal };
class ReadPool {
  active = 0; peak = 0; peakQueued = 0; queue: ReadWaiter[] = [];
  acquire(signal?: AbortSignal): Promise<() => void> {
    checkSignal(signal);
    if (this.active < CONTEXT_LIMITS.maxConcurrentReads) { this.active++; this.peak = Math.max(this.peak,this.active); return Promise.resolve(this.#release()); }
    invariant(this.queue.length < CONTEXT_LIMITS.maxQueuedReads,'CONTEXT_READ_BACKPRESSURE');
    return new Promise((resolve,reject) => {
      const waiter:ReadWaiter = { signal, start: () => {
        signal?.removeEventListener('abort',waiter.abort); resolve(this.#release());
      }, abort: () => {
        const index=this.queue.indexOf(waiter); if(index<0)return;
        this.queue.splice(index,1);signal?.removeEventListener('abort',waiter.abort);reject(new NexusError('CONTEXT_CANCELLED'));
      } };
      this.queue.push(waiter); this.peakQueued=Math.max(this.peakQueued,this.queue.length);
      signal?.addEventListener('abort',waiter.abort,{once:true}); if(signal?.aborted)waiter.abort();
    });
  }
  #release(): () => void {
    let released=false;
    return () => { if(released)return;released=true;const waiter=this.queue.shift();if(waiter)waiter.start();else this.active--; };
  }
}
const READ_POOLS = new WeakMap<object,ReadPool>();
function checkSignal(signal?: AbortSignal): void {
  invariant(signal===undefined||signal instanceof AbortSignal,'CONTEXT_SIGNAL');invariant(!signal?.aborted,'CONTEXT_CANCELLED');
}
function versionBinding(source: ContextSource, supplied?: ContextVersionBinding): ContextVersionBinding {
  const binding=snapshot(supplied??{reference:source.event_id,version:source.record_hash,sha256:source.payload_ref.sha256});
  invariant(Object.keys(binding).sort().join(',')==='reference,sha256,version' && typeof binding.reference==='string' &&
    Buffer.byteLength(binding.reference)>0 && Buffer.byteLength(binding.reference)<=256 && !/[\x00-\x1f\x7f]/.test(binding.reference) &&
    typeof binding.version==='string' && Buffer.byteLength(binding.version)>0 && Buffer.byteLength(binding.version)<=128 &&
    /^[a-f0-9]{64}$/.test(binding.sha256) && binding.sha256===source.payload_ref.sha256,'CONTEXT_VERSION_BINDING');
  return binding;
}
function taskBinding(binding: ContextTaskBinding): ContextTaskBinding {
  const value=snapshot(binding);
  invariant(Object.keys(value).sort().join(',')==='feature_epoch,policy_epoch,project_rules_version,rule_hash,workflow_version','CONTEXT_TASK_BINDING');
  identifier(value.project_rules_version);identifier(value.workflow_version);
  invariant(/^[a-f0-9]{64}$/.test(value.rule_hash) && [value.feature_epoch,value.policy_epoch].every(n=>Number.isSafeInteger(n)&&n>=0),'CONTEXT_TASK_BINDING');return value;
}
function identity(s: Subject): Identity { return { agent_id: s.agent_id, project_id: s.project_id, task_id: s.task_id, session_id: s.session_id }; }
function viewOf(context: AssembledContext, s: Subject): View {
  const { text: _text, entries, ...metadata } = context;
  return { ...metadata, revision: 0, runtime_instance_id: s.runtime_instance_id,
    entries: entries.map(({ text: _entryText, ...entry }) => entry) };
}
function withoutManifest(view: View): Omit<View,'manifest_ref'> { const {manifest_ref:_manifest,...body}=view;return body; }
function provenance(view: Pick<AssembledContext,'entries'|'omitted'|'bindings'>): string {
  return sha256(canonical({assembly_version:CONTEXT_ASSEMBLY_VERSION,entries:view.entries.map(({text:_text,...entry})=>entry),omitted:view.omitted,bindings:view.bindings??null}));
}
function storedView(state: NativeState, s: Subject, id: string): View {
  validateSubject(s);identifier(id);const view=state.get<View>('CONTEXT_VIEW',id);
  invariant(view && view.project_id===s.project_id && view.task_id===s.task_id && view.agent_id===s.agent_id,'CONTEXT_VIEW_SCOPE');
  invariant(Number.isSafeInteger(view.bytes)&&view.bytes>=0&&view.bytes<=CONTEXT_LIMITS.maxBytes&&/^[a-f0-9]{64}$/.test(view.sha256)&&
    Array.isArray(view.entries)&&Array.isArray(view.omitted)&&view.entries.length+view.omitted.length<=CONTEXT_LIMITS.maxSources&&
    view.entries.every(entry=>Number.isSafeInteger(entry.source?.length)&&entry.source.length>=0)&&
    view.entries.reduce((bytes,entry)=>bytes+entry.source.length,Math.max(0,view.entries.length-1)*2)===view.bytes,'CONTEXT_VIEW_HASH');
  const exported=state.store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE r.operation_id=? AND r.domain='audit' AND json_extract(r.body,'$.phase')='CONTEXT_ASSEMBLED'").get(id);
  invariant(exported,'CONTEXT_VIEW_UNACKNOWLEDGED');
  if(view.assembly_version!==undefined){
    invariant(view.assembly_version===CONTEXT_ASSEMBLY_VERSION && view.input_ref && view.manifest_ref,'CONTEXT_ASSEMBLY_VERSION');
    validateArtifactRef(view.input_ref);validateArtifactRef(view.manifest_ref);
    invariant(view.input_ref.sha256===view.sha256 && view.input_ref.bytes===view.bytes && view.bytes<=CONTEXT_LIMITS.maxBytes &&
      view.manifest_ref.bytes<=49152 && view.manifest_ref.sha256===sha256(canonical(withoutManifest(view))) &&
      view.provenance_sha256===provenance(view as unknown as AssembledContext),'CONTEXT_PROVENANCE_HASH');
    if(view.bindings)taskBinding(view.bindings);
    const row=state.store.db.prepare("SELECT r.seq,r.domain,r.event_id,r.operation_id,r.project_id,r.task_id,r.previous_hash,r.hash,r.body FROM anx_records r JOIN anx_exports e USING(seq) WHERE r.operation_id=? AND r.domain='audit' AND json_extract(r.body,'$.phase')='CONTEXT_INPUT_COMMITTED'").get(id) as Record<string,unknown>|undefined;
    invariant(row,'CONTEXT_VIEW_UNACKNOWLEDGED');const record=validateRecord({...row,body:JSON.parse(String(row.body))});
    const audit=record.body as unknown as {artifact_refs:ArtifactRef[];detail:{manifest_sha256:string;provenance_sha256:string}};
    invariant(record.project_id===s.project_id && record.task_id===s.task_id && audit.detail.manifest_sha256===view.manifest_ref.sha256 &&
      audit.detail.provenance_sha256===view.provenance_sha256 && canonical(audit.artifact_refs)===canonical([view.input_ref,view.manifest_ref]),'CONTEXT_PROVENANCE_HASH');
    state.store.artifacts.assertPublished(view.input_ref);state.store.artifacts.assertPublished(view.manifest_ref);
  }
  return view;
}

/** Verify that a model receives exactly an acknowledged, source-bound context view. */
export function assertContextView(state: NativeState, s: Subject, input: AssembledContext): AssembledContext {
  const context = snapshot(input, VIEW_ENVELOPE_BYTES);
  identifier(context.view_id);
  invariant(context.project_id === s.project_id && context.task_id === s.task_id && context.agent_id === s.agent_id, 'CONTEXT_VIEW_SCOPE');
  invariant(typeof context.text === 'string' && Buffer.byteLength(context.text) === context.bytes && context.bytes <= CONTEXT_LIMITS.maxBytes && sha256(context.text) === context.sha256, 'CONTEXT_VIEW_HASH');
  invariant(Array.isArray(context.entries) && context.entries.length <= CONTEXT_LIMITS.maxSources &&
    context.entries.every(entry => typeof entry.text === 'string' && sha256(entry.text) === entry.range_sha256) &&
    context.entries.map(entry => entry.text).join('\n\n') === context.text, 'CONTEXT_VIEW_HASH');
  const stored = storedView(state,s,context.view_id), expected=viewOf(context,s);
  // Legacy callers can omit the newly-added metadata; it is taken only from the acknowledged immutable manifest.
  for(const key of ['assembly_version','input_ref','manifest_ref','provenance_sha256','bindings'] as const)
    if(expected[key]===undefined && stored[key]!==undefined)Object.assign(expected,{[key]:stored[key]});
  invariant(canonical(stored)===canonical(expected),'CONTEXT_VIEW_UNACKNOWLEDGED');
  return context;
}

/** Finite model views over the existing immutable Archive; no replacement history. */
export class ContextAssembly {
  #state: NativeState; #readTask: (s: Subject, taskId: string) => boolean; #reads:ReadPool;
  constructor(state: NativeState, options: { readTask?: (s: Subject, taskId: string) => boolean } = {}) {
    this.#state = state; this.#readTask = options.readTask ?? (() => false);
    this.#reads=READ_POOLS.get(state.store)??new ReadPool();READ_POOLS.set(state.store,this.#reads);
  }
  get readStats(): Readonly<{active:number;queued:number;peak:number;peakQueued:number}> {
    return Object.freeze({active:this.#reads.active,queued:this.#reads.queue.length,peak:this.#reads.peak,peakQueued:this.#reads.peakQueued});
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
    const ref = bytes instanceof Uint8Array ? await store.artifacts.putBytesQueued(bytes, { maxBytes, media_type: 'text/plain; charset=utf-8' })
      : await store.artifacts.putQueued(bytes, { maxBytes, media_type: 'text/plain; charset=utf-8' });
    const eventId = uid();
    await this.#state.change(s, 'CONTEXT_CAPTURED', () => {
      for (const source of sources) this.validate(s,source);
      const audit = store.audit(auditEvent(identity(s), { operation_id: operation, operation_type: 'CONTEXT_CAPTURE', phase: kind,
        artifact_refs: [ref], context_event_refs: sources.map(source => source.event_id), detail: { source_refs: sources } as unknown as Json }));
      store.context({ ...identity(s), event_id: eventId, operation_id: operation, observed_at: now(), kind: 'harness.' + kind, payload_ref: ref, audit_event_refs: [audit.event_id] });
    }, { kind, event_id: eventId, payload_sha256: ref.sha256 }, operation);
    return this.source(s, eventId);
  }
  async readRange(s: Subject, source: ContextSource, options: { maxBytes?: number; maxScanBytes?: number; signal?:AbortSignal } = {}): Promise<{ text: string; range_sha256: string }> {
    validateSubject(s);s=snapshot(s);source=snapshot(source);const {signal,...limits}=options;checkSignal(signal);
    invariant(Object.keys(limits).every(k=>['maxBytes','maxScanBytes'].includes(k)),'CONTEXT_RANGE');
    const release=await this.#reads.acquire(signal);try{return await this.#readRange(s,source,{...limits,signal});}finally{release();}
  }
  async #readRange(s: Subject, source: ContextSource, options: { maxBytes?: number; maxScanBytes?: number; signal?:AbortSignal }): Promise<{text:string;range_sha256:string}> {
    checkSignal(options.signal);
    const ref = this.validate(s, source), maxBytes = options.maxBytes ?? CONTEXT_LIMITS.maxBytes,
      maxScanBytes = options.maxScanBytes ?? CONTEXT_LIMITS.maxScanBytes;
    invariant(Number.isSafeInteger(maxBytes) && maxBytes >= 0 && maxBytes <= CONTEXT_LIMITS.maxBytes && ref.length <= maxBytes, 'CONTEXT_BYTES_LIMIT');
    invariant(Number.isSafeInteger(maxScanBytes) && maxScanBytes >= 0 && maxScanBytes <= CONTEXT_LIMITS.maxScanBytes && ref.payload_ref.bytes <= maxScanBytes, 'CONTEXT_SCAN_LIMIT');
    const output = Buffer.alloc(ref.length); let offset = 0, copied = 0;
    // Complete iteration is required even after the range ends: ArtifactStore's final hash barrier is authoritative.
    for await (const chunk of this.#state.store.artifacts.read(ref.payload_ref)) {
      checkSignal(options.signal);
      const first = Math.max(0, ref.offset - offset), end = Math.min(chunk.length, ref.offset + ref.length - offset);
      if (end > first) { output.set(chunk.subarray(first, end), copied); copied += end - first; }
      offset += chunk.length;
    }
    checkSignal(options.signal);this.validate(s,ref);
    invariant(copied === ref.length, 'CONTEXT_RANGE');
    let text: string; try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(output); }
    catch { throw new NexusError('CONTEXT_UTF8_BOUNDARY'); }
    return { text, range_sha256: sha256(output) };
  }
  async assemble(s: Subject, input: ContextSelection[], options: { maxBytes: number; maxSources?: number; maxScanBytes?: number; bindings?:ContextTaskBinding; signal?:AbortSignal }): Promise<AssembledContext> {
    validateSubject(s); s = snapshot(s); this.#state.require('native.context-assembly', s);
    const {signal,...supplied}=options;checkSignal(signal);const limits=snapshot(supplied);
    invariant(Object.keys(limits).every(k => ['maxBytes','maxSources','maxScanBytes','bindings'].includes(k)), 'CONTEXT_ASSEMBLY_LIMIT');
    const selections = snapshot(input), maxSources = limits.maxSources ?? CONTEXT_LIMITS.maxSources,
      scanLimit = limits.maxScanBytes ?? CONTEXT_LIMITS.maxScanBytes;
    invariant(Number.isSafeInteger(limits.maxBytes) && limits.maxBytes >= 0 && limits.maxBytes <= CONTEXT_LIMITS.maxBytes &&
      Number.isSafeInteger(maxSources) && maxSources > 0 && maxSources <= CONTEXT_LIMITS.maxSources &&
      Number.isSafeInteger(scanLimit) && scanLimit >= 0 && scanLimit <= CONTEXT_LIMITS.maxScanBytes, 'CONTEXT_ASSEMBLY_LIMIT');
    invariant(Array.isArray(selections) && selections.length <= CONTEXT_LIMITS.maxSources, 'CONTEXT_SOURCE_LIMIT');
    const binding=limits.bindings?taskBinding(limits.bindings):null;
    const release=await this.#reads.acquire(signal);
    try {
    const entries: ContextEntry[] = [], omitted: ContextSource[] = []; let bytes = 0, scanned = 0;
    for (const item of selections) {
      checkSignal(signal);
      invariant(Object.keys(item).every(k=>['source','section','required','binding'].includes(k)) && SECTIONS.includes(item.section) && typeof item.required === 'boolean', 'CONTEXT_SELECTION');
      const source = this.validate(s, item.source);
      const sourceBinding=versionBinding(source,item.binding);
      const required = item.required || ['PROJECT_RULES','AGENT_CONTRACT','TASK_CONTRACT'].includes(item.section);
      const nextBytes = bytes + source.length + (entries.length ? 2 : 0);
      if (nextBytes > limits.maxBytes || entries.length >= maxSources || scanned + source.payload_ref.bytes > scanLimit) {
        invariant(!required, 'CONTEXT_REQUIRED_OVERFLOW'); omitted.push(source); continue;
      }
      const range = await this.#readRange(s, source, { maxBytes: limits.maxBytes, maxScanBytes: scanLimit - scanned,signal });
      scanned += source.payload_ref.bytes; bytes = nextBytes; entries.push({ ...item, source, required, binding:sourceBinding, ...range });
    }
    // Release read capacity before waiting for writers: a writer's bounded producer may itself read context.
    release();
    checkSignal(signal);this.#state.require('native.context-assembly', s);
    const text = entries.map(entry => entry.text).join('\n\n'), view: AssembledContext = { view_id: uid(), project_id: s.project_id, task_id: s.task_id,
      agent_id: s.agent_id, text, bytes, sha256: sha256(text), entries, omitted,assembly_version:CONTEXT_ASSEMBLY_VERSION,...(binding?{bindings:binding}:{}) };
    view.provenance_sha256=provenance(view);
    view.input_ref=await this.#state.store.artifacts.putBytesQueued(Buffer.from(text,'utf8'),{maxBytes:CONTEXT_LIMITS.maxBytes,media_type:'text/plain; charset=utf-8',signal});
    checkSignal(signal);
    const manifest=Buffer.from(canonical(viewOf(view,s)));invariant(manifest.length<=49152,'CONTEXT_METADATA_LIMIT');
    view.manifest_ref=await this.#state.store.artifacts.putBytesQueued(manifest,{maxBytes:49152,media_type:'application/json',signal});
    checkSignal(signal);
    await this.#state.change(s, 'CONTEXT_ASSEMBLED', () => {
      checkSignal(signal);this.#state.require('native.context-assembly', s);
      for (const entry of entries) { this.validate(s,entry.source);versionBinding(entry.source,entry.binding); }
      this.#state.insert('CONTEXT_VIEW', view.view_id, s, 'ACKNOWLEDGED', viewOf(view, s));
      this.#state.store.audit(auditEvent(identity(s),{operation_id:view.view_id,operation_type:'CONTEXT_ASSEMBLY',phase:'CONTEXT_INPUT_COMMITTED',
        artifact_refs:[view.input_ref!,view.manifest_ref!],context_event_refs:entries.map(entry=>entry.source.event_id),
        detail:{view_id:view.view_id,assembly_version:CONTEXT_ASSEMBLY_VERSION,input_sha256:view.sha256,manifest_sha256:view.manifest_ref!.sha256,
          provenance_sha256:view.provenance_sha256!,truncated:omitted.length>0,omitted:omitted.length}}));
    },
      { view_id: view.view_id, sha256: view.sha256, bytes, sources: entries.length, omitted: omitted.length }, view.view_id);
    return snapshot(view, VIEW_ENVELOPE_BYTES);
    } finally {release();}
  }
  /** Restore exact model UTF-8 bytes from the immutable input object, independently of current files and derived indexes. */
  async reconstruct(s:Subject,viewId:string,options:{signal?:AbortSignal}={}):Promise<{bytes:Uint8Array;context:AssembledContext}> {
    validateSubject(s);s=snapshot(s);checkSignal(options.signal);invariant(Object.keys(options).every(k=>k==='signal'),'CONTEXT_RANGE');
    const release=await this.#reads.acquire(options.signal);
    try {
      const view=storedView(this.#state,s,viewId);let text:string;
      if(view.input_ref && view.manifest_ref){
        const manifest=await this.#readObject(view.manifest_ref,49152,options.signal);
        invariant(manifest.equals(Buffer.from(canonical(withoutManifest(view)))),'CONTEXT_PROVENANCE_HASH');
        const bytes=await this.#readObject(view.input_ref,CONTEXT_LIMITS.maxBytes,options.signal);
        try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{throw new NexusError('CONTEXT_UTF8_BOUNDARY');}
      }else{
        let scanned=0;const pieces:string[]=[];
        for(const entry of view.entries){scanned+=entry.source.payload_ref.bytes;invariant(scanned<=CONTEXT_LIMITS.maxScanBytes,'CONTEXT_SCAN_LIMIT');
          const range=await this.#readRange(s,entry.source,{signal:options.signal});invariant(range.range_sha256===entry.range_sha256,'CONTEXT_PROVENANCE_HASH');pieces.push(range.text);}
        text=pieces.join('\n\n');
      }
      invariant(Buffer.byteLength(text)===view.bytes && sha256(text)===view.sha256,'CONTEXT_VIEW_HASH');
      const input=Buffer.from(text,'utf8');let cursor=0;const entries:ContextEntry[]=[];
      for(const entry of view.entries){
        this.validate(s,entry.source);if(entry.binding)versionBinding(entry.source,entry.binding);
        const bytes=input.subarray(cursor,cursor+entry.source.length);let entryText:string;
        try{entryText=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{throw new NexusError('CONTEXT_UTF8_BOUNDARY');}
        invariant(sha256(bytes)===entry.range_sha256,'CONTEXT_PROVENANCE_HASH');entries.push({...entry,text:entryText});cursor+=entry.source.length;
        if(entries.length<view.entries.length){invariant(input.subarray(cursor,cursor+2).equals(Buffer.from('\n\n')),'CONTEXT_VIEW_HASH');cursor+=2;}
      }
      invariant(cursor===view.bytes,'CONTEXT_VIEW_HASH');checkSignal(options.signal);
      const {revision:_revision,runtime_instance_id:_runtime,...metadata}=view;
      const context:AssembledContext={...metadata,text,entries};return {bytes:input,context:snapshot(context,VIEW_ENVELOPE_BYTES)};
    }finally{release();}
  }
  async #readObject(ref:ArtifactRef,maxBytes:number,signal?:AbortSignal):Promise<Buffer> {
    invariant(ref.bytes<=maxBytes,'CONTEXT_BYTES_LIMIT');const output=Buffer.alloc(ref.bytes);let cursor=0;
    for await(const chunk of this.#state.store.artifacts.read(ref)){checkSignal(signal);output.set(chunk,cursor);cursor+=chunk.length;}
    checkSignal(signal);invariant(cursor===ref.bytes,'CONTEXT_VIEW_HASH');return output;
  }
}
