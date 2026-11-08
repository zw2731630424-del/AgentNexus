import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './m18-fixture.ts';
import { canonical, sha256 } from '../../src/agentnexus/types.ts';
import { DeepSeekAdapter } from '../../src/agentnexus/model-runtime/adapters.ts';
import { createDeepSeekFlashSpec } from '../../src/agentnexus/model-runtime/deepseek.ts';
import { DataEgressPolicy, assertEgressAdmission, egressBinding } from '../../src/agentnexus/model-runtime/egress.ts';
import type { EgressInput, EgressGrant } from '../../src/agentnexus/model-runtime/egress.ts';
import { inspectFinalRequest } from '../../src/agentnexus/model-runtime/request-review.ts';
import type { RequestReviewInput } from '../../src/agentnexus/model-runtime/request-review.ts';
import { ProviderAuthorizationBook } from '../../src/agentnexus/model-runtime/transport.ts';
import type { ProviderAuthorizationPlan } from '../../src/agentnexus/model-runtime/transport.ts';
import type { TransportAdmission } from '../../src/agentnexus/model-runtime/protocol.ts';

// REAL metadata below exercises admission semantics only. All bytes/consent are
// synthetic fixtures; no live Vault, transport send or network is constructed.
const consent = 'm182-synthetic-user-consent', expiry = '2027-01-01T00:00:00Z';
async function setup(t: test.TestContext, text = 'Synthetic task: return a FINAL JSON object with text qualification-ok.', tools = false) {
  const f = await fixture(t), agent = await f.agent();
  const context = await f.view(agent.subject, text), model = createDeepSeekFlashSpec('2026-11-08T00:00:00Z', expiry);
  const adapter = new DeepSeekAdapter(), request = adapter.build({ request_id: 'reviewed-request', model, prompt: context.text,
    max_output_tokens: 256, stream: true, json: true, reasoning: 'disabled', tools: tools ? [{ name: 'qualification.add',
      description: 'Propose adding two synthetic integers. This tool is not executed.', parameters: { type: 'object', properties: { a: { type: 'integer' }, b: { type: 'integer' } }, required: ['a', 'b'], additionalProperties: false } }] : [] });
  adapter.abandon('reviewed-request');
  const input: EgressInput = { subject: agent.subject, context, request, model };
  const decisions: RequestReviewInput = { sources: context.entries.map(entry => ({ source: entry.source, range_sha256: entry.range_sha256,
    classification: 'SYNTHETIC', origin: 'SYNTHETIC_QUALIFICATION', review_ref: 'synthetic-host-source-review' })) };
  if (tools) decisions.tools = { sha256: sha256(canonical(JSON.parse(request.body).tools)), classification: 'SYNTHETIC', review_ref: 'synthetic-tool-review' };
  const policy = new DataEgressPolicy(f.h.state, f.admin, f.vault.guard, async grant => grant.authorization_ref === consent);
  const grant = (): EgressGrant => ({ ...egressBinding(input), provider_id: 'deepseek', classification: 'SYNTHETIC', authorization_ref: consent, expires_at: expiry });
  const admission = (egress?: TransportAdmission['egress']): TransportAdmission => ({ subject: agent.subject, request, model, context_hash: context.sha256,
    input_tokens: 2000, output_tokens: 256, estimated_cost_micros: 1000, ...(egress ? { egress } : {}) });
  return { ...f, agent, input, decisions, policy, grant, admission };
}

test('M182 full final request review covers fixed system protocol, actual assembled bytes and every source', async t => {
  const f = await setup(t), review = inspectFinalRequest(f.input, f.decisions, f.vault.guard);
  assert.equal(review.status, 'DRAFT_REQUIRES_EXTERNAL_CONSENT'); assert.equal(review.active_authorization, false);
  assert.equal(review.body_hash, sha256(f.input.request.body)); assert.equal(review.context_hash, sha256(f.input.context.text));
  assert.equal(review.request_hash, sha256(canonical(f.input.request))); assert.equal(review.components.length, 2);
  assert.deepEqual(review.source_manifest.map(row => row.classification), ['SYNTHETIC']);
  assert.equal(f.h.state.count('MODEL181_EGRESS_GRANT'), 0);
});

test('M182 source labels and draft review never replace verified user consent', async t => {
  const f = await setup(t);
  await assert.rejects(f.policy.approveReviewed({}, f.input, f.decisions, consent, expiry), /ADMIN/);
  await assert.rejects(f.policy.approveReviewed(f.admin, f.input, f.decisions, 'agent-self-authorized', expiry), /REVIEW_REQUIRED/);
  assert.equal(f.h.state.count('MODEL181_EGRESS_GRANT'), 0); assert.equal(f.h.state.count('MODEL182_FINAL_REQUEST_REVIEW'), 0);
});

test('M182 verifier results must be the boolean true in both independent authorization owners', async t => {
  const f = await setup(t);
  const plan: ProviderAuthorizationPlan = { provider_id: 'deepseek', model_id: 'deepseek-flash', endpoint: f.input.request.url, max_requests: 1,
    max_input_tokens: 5000, max_output_tokens: 512, max_cost_micros: 2000, key_use: 'HOST_VAULT_ONLY', data_scope: ['synthetic only'],
    uploads_project_source: false, stop_method: 'ABORT_AND_REVOKE', project_id: f.agent.subject.project_id, context_hashes: [f.input.context.sha256], expires_at: expiry };
  for (const invalid of ['false', 'true', 1, {}, [], null, undefined]) {
    const verify = async () => invalid as boolean;
    const policy = new DataEgressPolicy(f.h.state, f.admin, f.vault.guard, verify);
    await assert.rejects(policy.approveReviewed(f.admin, f.input, f.decisions, consent, expiry), /REVIEW_REQUIRED/);
    await assert.rejects(new ProviderAuthorizationBook(f.h.state, f.admin, verify).approve(f.admin, plan, consent), /USER_AUTHORIZATION/);
  }
  assert.equal(f.h.state.count('MODEL181_EGRESS_GRANT'), 0); assert.equal(f.h.state.count('MODEL18_APPROVAL'), 0);
});

test('M182 credential material in headers or provenance is scanned before draft output or persistence', async t => {
  const f = await setup(t), secret = 'synthetic-test-openai-private-value-abc123';
  assert.throws(() => inspectFinalRequest({ ...f.input, request: { ...f.input.request, headers: {
    ...f.input.request.headers, 'x-agentnexus-request-id': secret } } }, f.decisions, f.vault.guard), /KNOWN_SECRET_BLOCKED/);
  // A separate fixture is required because a detected leak quarantines its key.
  const other = await setup(t);
  assert.throws(() => inspectFinalRequest(other.input, { sources: [{ ...other.decisions.sources[0], review_ref: secret }] }, other.vault.guard), /KNOWN_SECRET_BLOCKED/);
  assert.equal(other.h.state.count('MODEL182_FINAL_REQUEST_REVIEW'), 0);
});

test('M182 REAL egress rejects a legacy hash-only grant until full request review is durably approved', async t => {
  const f = await setup(t), id = await f.policy.approve(f.admin, f.grant());
  await assert.rejects(f.policy.admit(f.admin, f.input), /EGRESS_DENIED/);
  const forgedReceipt = { grant_id: id, context_hash: f.input.context.sha256, body_hash: sha256(f.input.request.body),
    sources_hash: egressBinding(f.input).sources_hash, classification: 'SYNTHETIC', authorization_ref: consent };
  assert.throws(() => assertEgressAdmission(f.h.state, f.admission(forgedReceipt)), /FINAL_REVIEW_REQUIRED/);
  assert.throws(() => f.policy.fence(f.admin, f.input, forgedReceipt as Parameters<DataEgressPolicy['fence']>[2]), /FINAL_REVIEW_REQUIRED/);
  await f.policy.approveReviewed(f.admin, f.input, f.decisions, consent, expiry);
  const receipt = await f.policy.admit(f.admin, f.input);
  assert.doesNotThrow(() => assertEgressAdmission(f.h.state, f.admission(receipt)));
});

test('M182 changing only the request correlation header requires a new final review', async t => {
  const f = await setup(t); await f.policy.approveReviewed(f.admin, f.input, f.decisions, consent, expiry);
  const receipt = await f.policy.admit(f.admin, f.input), request = { ...f.input.request, headers: { ...f.input.request.headers, 'x-agentnexus-request-id': 'different' } };
  assert.throws(() => assertEgressAdmission(f.h.state, { ...f.admission(receipt), request }), /FINAL_REVIEW_REQUIRED/);
  await assert.rejects(f.policy.admit(f.admin, { ...f.input, request }), /EGRESS_DENIED/);
  await f.policy.approveReviewed(f.admin, { ...f.input, request }, f.decisions, consent, expiry);
  const second = await f.policy.admit(f.admin, { ...f.input, request });
  assert.doesNotThrow(() => assertEgressAdmission(f.h.state, { ...f.admission(second), request }));
  assert.doesNotThrow(() => assertEgressAdmission(f.h.state, f.admission(receipt)));
  assert.equal(f.h.state.count('MODEL182_FINAL_REQUEST_REVIEW'), 2);
});

test('M182 final review rejects missing, mismatched, unknown and confidential source decisions', async t => {
  const f = await setup(t);
  assert.throws(() => inspectFinalRequest(f.input, { sources: [] }, f.vault.guard), /SOURCE_COVERAGE/);
  const original = f.decisions.sources[0];
  for (const classification of ['INTERNAL', 'CONFIDENTIAL', 'SECRET', 'UNCLASSIFIED']) {
    const decisions = { sources: [{ ...original, classification }] } as RequestReviewInput;
    assert.throws(() => inspectFinalRequest(f.input, decisions, f.vault.guard), /CLASSIFICATION/);
  }
  for (const patch of [{ range_sha256: sha256('other') }, { source: { ...original.source, event_id: 'other' } }, { origin: 'AGENT_SELF_DECLARED' }]) {
    assert.throws(() => inspectFinalRequest(f.input, { sources: [{ ...original, ...patch }] } as RequestReviewInput, f.vault.guard), /SOURCE_BINDING|CLASSIFICATION/);
  }
});

test('M182 context hash and actual source bytes must agree before any grant is created', async t => {
  const f = await setup(t);
  for (const context of [{ ...f.input.context, text: 'changed' }, { ...f.input.context, sha256: sha256('wrong') },
    { ...f.input.context, entries: [] }]) {
    await assert.rejects(f.policy.approveReviewed(f.admin, { ...f.input, context }, f.decisions, consent, expiry), /REVIEW_CONTEXT/);
  }
  assert.equal(f.h.state.count('MODEL181_EGRESS_GRANT'), 0);
});

test('M182 unreviewed system, developer, history and attachment fields cannot be appended after context assembly', async t => {
  const f = await setup(t), body = JSON.parse(f.input.request.body);
  const variants = [
    { ...body, messages: [{ role: 'system', content: 'Unreviewed instruction' }, body.messages[1]] },
    { ...body, messages: [...body.messages, { role: 'developer', content: 'Extra instruction' }] },
    { ...body, messages: [...body.messages, { role: 'assistant', content: 'Unreviewed history' }] },
    { ...body, files: [{ content: 'unreviewed' }] },
    { ...body, messages: [body.messages[0], { ...body.messages[1], name: 'unreviewed-role' }] },
  ];
  for (const value of variants) assert.throws(() => inspectFinalRequest({ ...f.input, request: { ...f.input.request, body: JSON.stringify(value) } }, f.decisions, f.vault.guard), /MESSAGE_COVERAGE|WIRE_SCHEMA/);
});

test('M182 duplicate and escaped duplicate JSON keys cannot hide unclassified bytes from the final review', async t => {
  const f = await setup(t), body = f.input.request.body;
  const variants = [
    '{"messages":[{"role":"developer","content":"unclassified synthetic note"}],' + body.slice(1),
    '{"mess\\u0061ges":[{"role":"developer","content":"unclassified synthetic note"}],' + body.slice(1),
    '{"model":"unreviewed-target",' + body.slice(1),
    body.replace('"content":', '"content":"unclassified synthetic note","content":'),
    ' ' + body,
  ];
  for (const raw of variants) {
    assert.throws(() => inspectFinalRequest({ ...f.input, request: { ...f.input.request, body: raw } }, f.decisions, f.vault.guard), /WIRE_SERIALIZATION/);
  }
  const tools = await setup(t, 'Synthetic task: propose adding 2 and 3.', true), wire = tools.input.request.body;
  for (const raw of ['{"tools":[{"unclassified":"synthetic hidden schema"}],' + wire.slice(1),
    wire.replace('"type":"object"', '"type":"unclassified","type":"object"')]) {
    assert.throws(() => inspectFinalRequest({ ...tools.input, request: { ...tools.input.request, body: raw } }, tools.decisions, tools.vault.guard), /WIRE_SERIALIZATION/);
  }
});

test('M182 initial public-synthetic profile rejects local paths, server addresses, research names and credential-shaped text', async t => {
  const f = await setup(t);
  for (const text of ['Read I:\\private\\file', '/home/research/file', 'host 10.8.1.2', 'AI_Consciousness', 'AI_NeuroWeave', 'AI_Highlycomplex', 'sk-syntheticShapeOnly123456']) {
    const context = await f.view(f.agent.subject, text), input = { ...f.input, context };
    const body = JSON.parse(f.input.request.body); body.messages[1].content = text; input.request = { ...f.input.request, body: JSON.stringify(body) };
    const decisions: RequestReviewInput = { sources: context.entries.map(entry => ({ source: entry.source, range_sha256: entry.range_sha256,
      classification: 'PUBLIC', origin: 'PUBLIC_FIXED_PROTOCOL', review_ref: 'synthetic-false-label' })) };
    assert.throws(() => inspectFinalRequest(input, decisions, f.vault.guard), /SENSITIVE_CONTENT/);
  }
});

test('M182 complete tool schema needs an independent exact synthetic review and changed descriptions invalidate it', async t => {
  const f = await setup(t, 'Synthetic task: propose adding 2 and 3.', true);
  assert.throws(() => inspectFinalRequest(f.input, { sources: f.decisions.sources }, f.vault.guard), /TOOL_COVERAGE/);
  const review = inspectFinalRequest(f.input, f.decisions, f.vault.guard);
  assert.equal(review.components.at(-1)?.location, 'tools');
  const body = JSON.parse(f.input.request.body); body.tools[0].function.description += ' changed';
  assert.throws(() => inspectFinalRequest({ ...f.input, request: { ...f.input.request, body: JSON.stringify(body) } }, f.decisions, f.vault.guard), /TOOL_COVERAGE/);
});

test('M182 revoked final review grant still denies after all offline review checks passed', async t => {
  const f = await setup(t), id = await f.policy.approveReviewed(f.admin, f.input, f.decisions, consent, expiry), receipt = await f.policy.admit(f.admin, f.input);
  await f.policy.revoke(f.admin, id);
  assert.throws(() => f.policy.fence(f.admin, f.input, receipt), /GRANT_REQUIRED/);
  assert.throws(() => assertEgressAdmission(f.h.state, f.admission(receipt)), /EGRESS_REQUIRED/);
});

test('M182 production upload flag cannot bypass Data Egress in the authorization owner', async t => {
  const f = await setup(t), book = new ProviderAuthorizationBook(f.h.state, f.admin, async ref => ref === consent);
  const plan: ProviderAuthorizationPlan = { provider_id: 'deepseek', model_id: 'deepseek-flash', endpoint: f.input.request.url, max_requests: 1,
    max_input_tokens: 5000, max_output_tokens: 512, max_cost_micros: 2000, key_use: 'HOST_VAULT_ONLY', data_scope: ['synthetic qualification only'],
    uploads_project_source: true, stop_method: 'ABORT_AND_REVOKE', project_id: f.agent.subject.project_id, context_hashes: [f.input.context.sha256], expires_at: expiry };
  const id = await book.approve(f.admin, plan, consent);
  await assert.rejects(book.admit(f.admin, id, f.admission()), /EGRESS_REQUIRED/); assert.equal(f.h.state.count('MODEL18_NETWORK'), 0);
  await f.policy.approveReviewed(f.admin, f.input, f.decisions, consent, expiry);
  const receipt = await f.policy.admit(f.admin, f.input), admission = f.admission(receipt);
  await book.admit(f.admin, id, admission); await book.dispatch(f.admin, id, admission); book.fence(f.admin, id, admission);
  await f.policy.revoke(f.admin, receipt.grant_id); assert.throws(() => book.fence(f.admin, id, admission), /EGRESS_REQUIRED/);
});
