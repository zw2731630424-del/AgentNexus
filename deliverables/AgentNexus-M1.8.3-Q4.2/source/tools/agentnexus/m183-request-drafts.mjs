import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import { DeepSeekAdapter } from '../../src/agentnexus/model-runtime/adapters.ts';
import { createDeepSeekFlashSpec } from '../../src/agentnexus/model-runtime/deepseek.ts';
import { inspectFinalRequest } from '../../src/agentnexus/model-runtime/request-review.ts';
import { canonical, sha256 } from '../../src/agentnexus/types.ts';
const out = fileURLToPath(new URL('../../../evidence/requests/', import.meta.url));
const runtime = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8.3/request-drafts/' + Date.now() + '/', import.meta.url));
await mkdir(out, { recursive: true });
const limits = { workers: 4, memory_bytes: 268435456, processes: 8, disk_bytes: 67108864, wall_ms: 3000000, model_tokens: 100000000, model_requests: 4096, model_cost_micros: 1000000000 };
const h = await openHarness(runtime, { platform_limits: limits });
const plan = [
  ['text', ['Synthetic text test. Return a FINAL reply whose text is exactly hello.']],
  ['json', ['Synthetic JSON test. Return a FINAL reply whose text contains the JSON object {"status":"ok","n":3}.']],
  ['utf8-stream', ['Synthetic UTF-8 streaming test. Return a FINAL reply whose text is exactly 你好，世界。🌏']],
  ['tool-intent', ['Synthetic intent test. Propose qualification.add with a=2 and b=3. Do not execute any tool.']],
  ['context', ['Synthetic previous user turn: the chosen color is blue.', 'Synthetic previous assistant turn: I recorded blue.', 'Synthetic current turn: return a FINAL reply naming the chosen color.']],
];
const index = [];
try {
  await h.administration.createProject({ id: 'm183-public-readiness', rules: ['Only fixed synthetic qualification data is used.'], budget: limits });
  const a = await h.administration.createAgent({ id: 'development', project_id: 'm183-public-readiness', task_id: 'readiness', type: 'DEVELOPMENT', model_binding: 'mock', budget: { ...limits, workers: 1 } });
  for (let n = 0; n < plan.length; n++) {
    const [name, texts] = plan[n], id = 'm183-smoke-0' + (n + 1), selections = [];
    for (const text of texts) { const source = await h.context.capture(a.subject, 'RAW', Buffer.from(text)); selections.push({ source, section: texts.length > 1 && selections.length < 2 ? 'HISTORY' : 'TASK_CONTRACT', required: true }); }
    const context = await h.context.assemble(a.subject, selections, { maxBytes: 8192 });
    const model = createDeepSeekFlashSpec('2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z'), adapter = new DeepSeekAdapter();
    const tools = name === 'tool-intent' ? [{ name: 'qualification.add', description: 'Propose adding two synthetic integers; no execution occurs.', parameters: { type: 'object', properties: { a: { type: 'integer' }, b: { type: 'integer' } }, required: ['a','b'], additionalProperties: false } }] : [];
    const request = adapter.build({ request_id: id, model, prompt: context.text, max_output_tokens: 256, stream: true, json: true, reasoning: 'disabled', tools }); adapter.abandon(id);
    const decisions = { sources: context.entries.map(e => ({ source: e.source, range_sha256: e.range_sha256, classification: 'SYNTHETIC', origin: 'SYNTHETIC_QUALIFICATION', review_ref: 'draft-review-pending' })), ...(tools.length ? { tools: { classification: 'SYNTHETIC', review_ref: 'draft-tool-review-pending', sha256: sha256(canonical(JSON.parse(request.body).tools)) } } : {}) };
    const input = { subject: a.subject, context, context_hash: context.sha256, model, request, input_tokens: Buffer.byteLength(request.body) + 4096, output_tokens: 256 };
    const report = inspectFinalRequest(input, decisions, { assertSafe() {} });
    const dir = join(out, id); await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'body.json'), request.body); await writeFile(join(dir, 'input.json'), JSON.stringify(input, null, 2) + '\n'); await writeFile(join(dir, 'review.json'), JSON.stringify(report, null, 2) + '\n'); await writeFile(join(dir, 'decisions.json'), JSON.stringify(decisions, null, 2) + '\n');
    index.push({ id, name, endpoint: request.url, model_id: model.model_id, request_hash: report.request_hash, body_hash: sha256(request.body), context_hash: context.sha256, sources_hash: report.sources_hash, input_token_upper_bound: input.input_tokens, output_token_upper_bound: 256, credential_handle_id: null, token_reservation_id: null, operation_id: null, signed_consent: false, execution: 'BLOCKED', review_status: 'DRAFT_REQUIRES_USER_REVIEW_AND_NATIVE_BOUNDARY', body_file: id + '/body.json', note: name === 'context' ? 'Multiple reviewed history sources in the existing Harness context; not a verified native provider multi-turn session.' : 'Existing fixed structured-reply protocol is preserved.' });
  }
} finally { await h.close(); }
await writeFile(join(out, 'index.json'), JSON.stringify({ status: 'UNSENT_DRAFTS', token_authorization_limit: 100000000, actual_reserved_tokens: 0, real_requests: 0, items: index }, null, 2) + '\n');
console.log(JSON.stringify({ out, drafts: index.length, real_requests: 0 }));
