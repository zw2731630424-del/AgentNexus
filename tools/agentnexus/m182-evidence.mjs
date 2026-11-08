// Drafts use the production adapter and real Context Assembly, with fabricated
// qualification text only. No transport, live vault, grant or network is enabled.
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openHarness } from '../../deliverables/AgentNexus-M1.8.2/source/src/agentnexus/harness/index.ts';
import { canonical } from '../../deliverables/AgentNexus-M1.8.2/source/src/agentnexus/types.ts';
import { CredentialVault, SyntheticMemoryProtector, createVaultAdminCapability } from '../../deliverables/AgentNexus-M1.8.2/source/src/agentnexus/model-runtime/vault.ts';
import { DeepSeekAdapter } from '../../deliverables/AgentNexus-M1.8.2/source/src/agentnexus/model-runtime/adapters.ts';
import { createDeepSeekFlashSpec, DEEPSEEK_FLASH_EVIDENCE } from '../../deliverables/AgentNexus-M1.8.2/source/src/agentnexus/model-runtime/deepseek.ts';
import { STRUCTURED_REPLY_INSTRUCTION, priceCost } from '../../deliverables/AgentNexus-M1.8.2/source/src/agentnexus/model-runtime/protocol.ts';
import { inspectFinalRequest } from '../../deliverables/AgentNexus-M1.8.2/source/src/agentnexus/model-runtime/request-review.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const run = join(root, '.workflow-kit/runtime/AgentNexus-M1.8.2');
await mkdir(run, { recursive: true }); const out = await mkdtemp(join(run, 'request-drafts-'));
const sha = value => createHash('sha256').update(value).digest('hex');
const json = (name, value) => writeFile(join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const budget = JSON.parse(await readFile(join(root, 'deliverables/AgentNexus-M1.8.1/usage-token-cost.json'), 'utf8'));
if (budget.authorization_total_tokens !== 100000000 || budget.real_provider_requests !== 0 || budget.input_tokens !== 0 || budget.output_tokens !== 0) throw Error('BASELINE_BUDGET_RECONCILIATION_REQUIRED');
const admin = createVaultAdminCapability(), protector = new SyntheticMemoryProtector();
const vault = await CredentialVault.open({ root: join(out, 'empty-synthetic-vault'), admin, protector, mode: 'SYNTHETIC' });
const limits = { workers: 4, memory_bytes: 268435456, disk_bytes: 16777216, wall_ms: 120000, model_tokens: 100000, model_requests: 10, model_cost_micros: 1000000 };
const harness = await openHarness(join(out, 'synthetic-host'), { host: { contentGuard: vault.guard }, platform_limits: limits });
const model = createDeepSeekFlashSpec('2026-11-08T00:00:00Z', '2026-11-09T00:00:00Z');
const add = { name: 'qualification.add', description: 'Propose adding two synthetic integers. The tool is not executed.',
  parameters: { type: 'object', properties: { a: { type: 'integer' }, b: { type: 'integer' } }, required: ['a', 'b'], additionalProperties: false } };
const cases = [
  { id: 'm182-smoke-01', purpose: 'ASCII text carried in the existing structured JSON contract', output: 128, tools: [],
    text: 'Synthetic qualification task. Return exactly this JSON object: {"kind":"FINAL","text":"qualification-ok"}.' },
  { id: 'm182-smoke-02', purpose: 'Chinese input/output and JSON', output: 192, tools: [],
    text: '合成资格任务：计算2加3。仅返回JSON对象，kind为FINAL，text为“合成验证：结果是5”。不引用任何外部资料。' },
  { id: 'm182-smoke-03', purpose: 'Tool-call intent only; no execution', output: 256, tools: [add],
    text: 'Synthetic qualification task. Propose a call to qualification.add with a=2 and b=3. Do not execute the tool, access files, or claim approval. A tool call is a proposal only.' },
];
const index = [];
try {
  await harness.administration.createProject({ id: 'synthetic-qualification', rules: ['Synthetic local container. No project rules are included in request text.'], budget: limits });
  for (const item of cases) {
    const agent = await harness.administration.createAgent({ id: item.id, task_id: item.id, project_id: 'synthetic-qualification',
      type: 'DEVELOPMENT', model_binding: 'deepseek', budget: { ...limits, workers: 1 } });
    const source = await harness.context.capture(agent.subject, 'RAW', Buffer.from(item.text));
    const context = await harness.context.assemble(agent.subject, [{ source, section: 'TASK_CONTRACT', required: true }], { maxBytes: 65536 });
    // Reconstruct from the acknowledged Archive, just as UnifiedModelGateway does.
    const restored = await harness.context.reconstruct(agent.subject, context.view_id);
    const adapter = new DeepSeekAdapter(), request = adapter.build({ request_id: item.id, model, prompt: restored.context.text,
      max_output_tokens: item.output, stream: true, json: true, reasoning: 'disabled', tools: item.tools });
    adapter.abandon(item.id);
    const decisions = { sources: restored.context.entries.map(entry => ({ source: entry.source, range_sha256: entry.range_sha256,
      classification: 'SYNTHETIC', origin: 'SYNTHETIC_QUALIFICATION', review_ref: 'm182-fixed-synthetic-generator-v1' })) };
    if (item.tools.length) decisions.tools = { sha256: sha(canonical(JSON.parse(request.body).tools)), classification: 'SYNTHETIC', review_ref: 'm182-synthetic-add-schema-v1' };
    const review = inspectFinalRequest({ subject: agent.subject, context: restored.context, request, model }, decisions, vault.guard);
    const directory = join(out, item.id); await mkdir(directory);
    await writeFile(join(directory, 'body.json'), request.body, { flag: 'wx' });
    await writeFile(join(directory, 'context.txt'), restored.context.text, { flag: 'wx' });
    await writeFile(join(directory, 'review.json'), JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
    await writeFile(join(directory, 'decisions.json'), JSON.stringify(decisions, null, 2) + '\n', { flag: 'wx' });
    const inputLimit = context.bytes + Buffer.byteLength(STRUCTURED_REPLY_INSTRUCTION) + Buffer.byteLength(canonical(item.tools)) + 4096;
    index.push({ request_id: item.id, purpose: item.purpose, status: 'DRAFT_BLOCKED_NOT_SENT', body_file: item.id + '/body.json',
      context_file: item.id + '/context.txt', review_file: item.id + '/review.json', context_hash: review.context_hash,
      body_hash: review.body_hash, request_hash: review.request_hash, sources_hash: review.sources_hash, review_hash: sha(canonical(review)),
      classification: review.classification, input_token_reservation_upper_bound: inputLimit, output_token_limit: item.output,
      cost_upper_bound_micros_usd: priceCost(model.price, inputLimit, item.output), expected_response_model: 'deepseek-flash',
      observed_response_model: null, model_id: model.model_id, endpoint: request.url, source: 'FIXED_SYNTHETIC_GENERATOR',
      includes_project_rules: false, includes_real_history: false, includes_research: false, includes_code: false,
      includes_local_paths: false, includes_server_details: false, includes_credentials: false });
  }
  const audits = []; let after = 0;
  for (;;) { const page = harness.store.query('audit', { after, limit: 100 }); if (!page.length) break; audits.push(...page); after = page.at(-1).seq; }
  await writeFile(join(out, 'audit.jsonl'), audits.map(row => JSON.stringify(row) + '\n').join(''), { flag: 'wx' });
  await harness.store.verify();
  await json('request-index.json', { status: 'DRAFTS_ONLY', real_requests: 0, model_identity: DEEPSEEK_FLASH_EVIDENCE,
    requests: index, total_reserved_token_upper_bound_if_later_approved: index.reduce((n, row) => n + row.input_token_reservation_upper_bound + row.output_token_limit, 0),
    total_cost_upper_bound_micros_usd: index.reduce((n, row) => n + row.cost_upper_bound_micros_usd, 0),
    global_campaign_id: 'm181-deepseek', authorization_total_tokens: 100000000, baseline_remaining_tokens: budget.remaining_authorized_tokens,
    active_egress_grants: harness.state.count('MODEL181_EGRESS_GRANT'), active_final_reviews: harness.state.count('MODEL182_FINAL_REQUEST_REVIEW'),
    reservations_created: 0, real_credentials_read: false, final_execution_application: 'WITHHELD_VAULT_NOT_QUALIFIED',
    reuse_rule: 'Deploy qualified Host, regenerate and re-review all exact bytes/provenance/hashes/price; these drafts are not reusable live consent.' });
  console.log(JSON.stringify({ out, draft_requests: index.length, requests: index.map(row => ({ id: row.request_id, context_hash: row.context_hash, request_hash: row.request_hash })), real_requests: 0 }));
} finally { await harness.close(); vault.close(); protector.destroy(); }
