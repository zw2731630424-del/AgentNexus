import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
const review = dirname(fileURLToPath(import.meta.url)); const root = resolve(review, '../../../..');
const initial = JSON.parse(await readFile(join(review, 'source-manifest.json'), 'utf8'));
const finalDir = 'revision-mw5uhrqi';
const final = JSON.parse(await readFile(join(review, finalDir, 'source-manifest.json'), 'utf8'));
const products = ['policy-contracts','policy','control','gateway','reconciliation','host'].map(x => `src/agentnexus/${x}.ts`);
const tests = ['security','reconciliation','gateway','control'].map(x => `tests/agentnexus/${x}.test.ts`);
const find = (manifest, path) => { const r = manifest.files.find(x => x.path === path); if (!r) throw new Error('Missing manifest path: ' + path); return { path: r.path, sha256: r.sha256 }; };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const finalCandidateFiles = products.map(x => find(final, x));
const finalTests = tests.map(x => find(final, x));
const drift = [];
for (const r of [...finalCandidateFiles, ...finalTests]) { const actual = hash(await readFile(join(root, r.path))); if (actual !== r.sha256) drift.push({ ...r, current_sha256: actual }); }
const designs = [];
for (const path of ['deliverables/AgentNexus-M1.2/policy-enforcement-design.md','deliverables/AgentNexus-M1.2/operation-reconciliation-design.md']) designs.push({ path, sha256: hash(await readFile(join(root, path))), coverage: 'read in full, including final updated design' });
const evidencePaths = ['source-manifest.json','tests.tap','test-result.json','probe.mjs','probe-results.json','producer-probe.mjs','producer-results.json','current-probe.mjs',`${finalDir}/source-manifest.json`,`${finalDir}/tests.tap`,`${finalDir}/test-result.json`,`${finalDir}/probe.stderr.txt`,`${finalDir}/probe-results.retry1.json`,`${finalDir}/probe.retry1.stdout.txt`,`${finalDir}/probe.retry1.stderr.txt`,`${finalDir}/producer-results.json`];
const evidence = [];
for (const path of evidencePaths) evidence.push({ path, sha256: hash(await readFile(join(review, path))) });
const initialTests = JSON.parse(await readFile(join(review, 'test-result.json'), 'utf8'));
const finalTestResult = JSON.parse(await readFile(join(review, finalDir, 'test-result.json'), 'utf8'));
const report = {
  schema: 'agentnexus/m1.2/independent-security-review/1',
  created_at: new Date().toISOString(),
  reviewer: '/root/m12_security_review',
  review_mode: 'Independent read-only product review; synthetic probes and evidence confined to this delegated runtime directory',
  conclusion: drift.length ? 'SOURCE_DRIFT_REQUIRES_REBINDING' : 'NO_OPEN_FINDINGS_IDENTIFIED_IN_FINAL_REVIEWED_SCOPE',
  open_findings: [],
  final_candidate_files: finalCandidateFiles,
  reviewed_test_files: finalTests,
  final_candidate_drift: drift,
  scope: {
    product_files: products,
    test_files: tests,
    designs,
    threat_boundary: 'Trusted local library and registered trusted handlers; Host/bootstrap/raw Store are privileged objects. This is not an OS or malicious same-process JS boundary.',
    review_topics: ['policy bypass and privilege escalation','exact intent/resource/approval binding','replay and atomic permit consumption','TOCTOU and last invocation fence','concurrent reconciliation and challenge consumption','crash recovery and no automatic retry','Writer release requires confirmed local settlement','unknown output producer and false success states'],
    supporting_reads: [
      { ...find(final, 'src/agentnexus/artifacts.ts'), coverage: 'full' },
      { ...find(final, 'src/agentnexus/features.ts'), coverage: 'full' },
      { ...find(final, 'src/agentnexus/types.ts'), coverage: 'full' },
      { ...find(final, 'src/agentnexus/storage.ts'), coverage: 'targeted transaction/flush/fault/recovery/close paths, not a fresh whole-store audit' },
      { ...find(final, 'tests/agentnexus/reconciliation-child.mjs'), coverage: 'full final crash fixture' }
    ],
    rules: { root_agents_read: true, project_rules_index_present: false, workflow_route_read: true, matching_workflow: null, governance_policy_read: true, subagents_spawned: false }
  },
  snapshots: [
    { name: 'initial-tested', copied_at: initial.copied_at, manifest: 'source-manifest.json', files: [...products, ...tests].map(x => find(initial, x)), note: 'Parent tightened policy/tool field validation between the first live read and this snapshot; findings and initial tests bind to these actual copied bytes.' },
    { name: 'final-reviewed', copied_at: final.copied_at, manifest: `${finalDir}/source-manifest.json`, files: [...finalCandidateFiles, ...finalTests], note: 'Final diffs from the initial snapshot were read; the current workspace hashes were compared again when this report was written.' }
  ],
  findings: [
    {
      id: 'M12-IR-001', severity: 'P2', status: 'RESOLVED_AND_INDEPENDENTLY_VERIFIED',
      title: 'ENFORCE could persist an independent-owner mode that the same runtime refused to read',
      original_locations: [{ path: 'src/agentnexus/policy.ts', line: 93, role: 'prepare skipped the owner restriction for ENFORCE' }, { path: 'src/agentnexus/policy.ts', line: 69, role: 'persisted mode always passed through validateSelection' }],
      affected_sha256: find(initial, 'src/agentnexus/policy.ts').sha256,
      impact: 'A legitimate administrator request to enforce P.IDENTITY committed successfully, then ordinary policy lookup at that scope and the next openHost failed with INDEPENDENT_POLICY_OWNER. This is persistent availability loss, not an authorization elevation.',
      reproduction: ['Open a new synthetic Host.', 'PrepareMode with scope={}, mode=ENFORCE, policy_ids=[P.IDENTITY], reason present, expires_at=null.', 'Confirm PREVIEW_ACK and RISK_ACK, then CommitMode; commit fulfilled.', 'modeFor(P.STYLE,{}) failed with INDEPENDENT_POLICY_OWNER.', 'Close and reopen the Host; openHost failed with INDEPENDENT_POLICY_OWNER.'],
      original_evidence: 'probe-results.json: results[0]',
      recommendation: 'Use the same independent-owner selection contract before persisting every application mode, including ENFORCE, so valid administrative writes remain readable.',
      fix_locations: [{ path: 'src/agentnexus/policy.ts', line: 93 }],
      fixed_sha256: find(final, 'src/agentnexus/policy.ts').sha256,
      verification: { evidence: `${finalDir}/probe-results.retry1.json: results[0]`, result: 'Prepare rejected with NON_DEGRADABLE_POLICY; ordinary P.STYLE mode lookup remained ENFORCE and reopen succeeded.', regression: 'M12-PE-MODE-OWNER passed in the final isolated test run.' }
    },
    {
      id: 'M12-IR-002', severity: 'P2', status: 'RESOLVED_AND_INDEPENDENTLY_VERIFIED',
      title: 'Completing the handler disabled the timeout while stdout or stderr could still be pending',
      original_locations: [{ path: 'src/agentnexus/gateway.ts', line: 200, role: 'handlerTimer cleared after handler fulfillment' }, { path: 'src/agentnexus/gateway.ts', line: 206, role: 'stdout consumption had no remaining deadline' }, { path: 'src/agentnexus/gateway.ts', line: 207, role: 'stderr consumption had no remaining deadline' }],
      affected_sha256: find(initial, 'src/agentnexus/gateway.ts').sha256,
      impact: 'An output producer could keep the operation and Writer occupied indefinitely beyond timeout_ms. If it later finished, the expired operation returned PASS and released its Writer. The initial probe did not demonstrate release while the producer remained unconfirmed; the defect was unbounded output time and false post-deadline success.',
      reproduction: ['Register an approved synthetic LOCAL_WRITE with timeout_ms=20; execute immediately returns data=null and stdout with next() waiting on a test-controlled promise.', 'At 120ms, request was still pending, state STARTED, executor_state UNKNOWN, Writer count 1.', 'Resolve next() with done=true.', 'The original request returned PASS/BROKER_OPERATION_COMPLETE and operation SUCCEEDED/SETTLED with no Writer.'],
      original_evidence: 'probe-results.json: results[1]',
      recommendation: 'Keep an elapsed execution deadline through handler, output consumption, result, and ACK barriers; cancel output on expiry, never convert a late phase to PASS, and preserve UNKNOWN/Writer without an actual producer settlement observation.',
      fix_locations: [{ path: 'src/agentnexus/gateway.ts', line: 100, role: 'elapsed deadline check' }, { path: 'src/agentnexus/gateway.ts', line: 195, role: 'timer begins before handler invocation' }, { path: 'src/agentnexus/gateway.ts', line: 217, role: 'output uses cancellation signal' }, { path: 'src/agentnexus/gateway.ts', line: 258, role: 'timer cleared only when the request path finishes' }],
      fixed_sha256: find(final, 'src/agentnexus/gateway.ts').sha256,
      verification: { evidence: `${finalDir}/probe-results.retry1.json: results[1]`, result: 'By 120ms the request returned INCONCLUSIVE/TOOL_TIMEOUT; executor stayed UNKNOWN and Writer remained. The store correctly faulted on unknown producer cleanup. After explicit Store recovery, an administrator release attempt still failed with EXECUTOR_EXIT_NOT_CONFIRMED.', regression: 'M12-REC-OUTPUT-TIMEOUT passed, including restart retention and no replay.' }
    }
  ],
  additional_security_checks: [
    { topic: 'Exact resource and last authorization fence', evidence: `${finalDir}/probe-results.retry1.json: results[2]`, result: 'A trusted resource resolver took 600ms on its final invocation against a 400ms exact approval. Final result was BLOCKED/APPROVAL_EXPIRED_BEFORE_START, executions=0, executor NOT_INVOKED, Writer absent. Source review confirms the resolver and context construction precede the final epoch/clock checks; resource_id is part of intentHash and the frozen execution context.' },
    { topic: 'Unknown output producer cannot be released by adjudication or by restart', evidence: [`producer-results.json`,`${finalDir}/producer-results.json`], result: 'With stdout.next rejecting and iterator.return never acknowledging, the Gateway returned INCONCLUSIVE, executor remained UNKNOWN, incomplete artifact metadata said producer_cleanup=UNKNOWN and producer_exit=NOT_VERIFIED, and Writer remained. ADJUDICATE with release=true failed. A final human outcome without release was appendable; after reopen RELEASE_WRITER still failed with EXECUTOR_EXIT_NOT_CONFIRMED.' },
    { topic: 'Authority and policy boundaries', evidence: `${finalDir}/tests.tap`, result: 'Reviewed and tested the frozen Agent/tool context, non-forgeable trusted admin object identity, strict policy/capability fields, default non-allowing evaluator behavior, mandatory exact LOCAL_WRITE approval even when optional policies are disabled, epoch and replay checks. PROCESS and EXTERNAL_EFFECT remain unconditionally SANDBOX_NOT_VERIFIED before application policy evaluation.' },
    { topic: 'Reconciliation concurrency and stale projections', evidence: `${finalDir}/tests.tap`, result: 'Reviewed challenge hash/payload/boot/expiry binding, complete evidence reads, gate plus same-transaction rechecks, revision/request uniqueness and append-only records. Inactive CLAIMED/STARTED states are now accepted for adjudication after a store fault, while requestActive veto and running/executor_state exit requirements still govern release. This does not promote unknown exit evidence.' }
  ],
  test_runs: [
    { ...initialTests, evidence_directory: '.', total: 71, passed: 71, failed: 0, cancelled: 0, skipped: 0 },
    { ...finalTestResult, evidence_directory: finalDir, total: 74, passed: 74, failed: 0, cancelled: 0, skipped: 0 }
  ],
  probe_runs: [
    { evidence: 'probe-results.json', exit_code: 0, purpose: 'Initial reproduction of both findings' },
    { evidence: 'producer-results.json', exit_code: 0, purpose: 'Initial independent unknown-producer negative test' },
    { evidence: `${finalDir}/probe.stderr.txt`, exit_code: 1, purpose: 'First final probe attempt stopped during cleanup because the reviewer directly closed a session after the expected Store fault; this was a probe cleanup omission, not a product-test failure. Original stderr is preserved.' },
    { evidence: `${finalDir}/probe-results.retry1.json`, exit_code: 0, purpose: 'Only the probe was corrected to explicitly recover the faulted synthetic Store before session close; it was rerun against the same unchanged final source snapshot. Passed test suite was not repeated.' },
    { evidence: `${finalDir}/producer-results.json`, exit_code: 0, purpose: 'Final independent unknown-producer negative test, including restart' }
  ],
  limits: [
    'This is a bounded review of six product files, four test files, two designs, and the listed supporting paths. Absence of an identified open finding is not proof that the full product is safe.',
    'All execution was local and synthetic in immutable source copies with AGENTNEXUS_TEST_DATA_ROOT set to the delegated independent-review/d directory. No original/history tests were run in-place.',
    'No model, external Provider, scientific experiment, production endpoint, Git commit, or push was used.',
    'OS administrator authentication and peer identity were not verified; arbitrary sandbox/process execution remains BLOCKED. Local capability checks are not an OS authentication or malicious same-process JS guarantee.',
    'The existing real child kill fixtures validate local crash windows only. They do not prove OS process-tree termination, hard power-loss durability, or real-world side-effect truth.',
    'A source producer with unconfirmed cleanup remains UNKNOWN after local cancellation or after the old Host exits. The retained Writer may require a future Broker/exit verifier; this review does not grant release authority based on manual outcome evidence alone.',
    'Hash verification proves the referenced bytes, not the real-world interpretation of administrator evidence.',
    'An intermediate failed custom probe left only synthetic evidence in this delegated runtime directory; its stderr was retained and no historical evidence was overwritten.',
    'Final conclusions bind to the recorded final hashes. Later source changes require re-review.'
  ],
  status_boundaries: { trusted_local_review: 'COMPLETED_WITH_RECORDED_FINDINGS_RESOLVED', os_admin_auth: 'NOT_RUN', os_sandbox: 'BLOCKED', os_process_tree_exit: 'NOT_RUN', external_provider: 'NOT_RUN', real_model: 'NOT_RUN', scientific_execution: 'NOT_RUN' },
  evidence
};
await writeFile(join(review, 'review.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ path: join(review, 'review.json'), conclusion: report.conclusion, final_candidate_files: finalCandidateFiles, drift }));
