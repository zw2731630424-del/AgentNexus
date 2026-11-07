# AgentNexus M1.5.1 independent final code review

**Code review: PASS_LIMITED. Acceptance: FAIL/BLOCKED. Production qualification: false.** No open reproducible product P0/P1 was identified in the stated scope. Known cumulative CPU failure and the retained integrated TOCTOU fixture failure prevent acceptance. This is the final independent read-only opinion; earlier independently executed probes remain bound to their original source bytes.

## Exact revision and review scope

Final source: **100 files**, set SHA256 `3f4c9e1b30f7d956b7be9c6330872cf87f32681f86c39a9b3b09c97c9bc581a0`. Previous reviewer snapshot and all executed independent checks: `4825d2432a01a497a68971fab57909bc9613b38ff087346afbcceba56f7aa9fa`. Author manifest, current source and all 100 ZIP members match the final set. The retained old reviewer snapshot is unchanged. Relative to the previous freeze, exactly one file changes: [NativeRuntime.cs](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/source/src/agentnexus/production/windows/NativeRuntime.cs); there are no additions or removals.

The only edit is the cleanup-loop comment and early-break condition. See [byte reconciliation](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/readonly-final-byte-verification.json) and [exact patch](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/readonly-final-diff.patch). In this final phase, no new OS experiment, link, process test, CPU workload, model run or full regression was executed.

Baseline reading comprises all 43 product TypeScript files and 12 non-native-only test TypeScript files, the requested inherited non-native tools/checkers/fixtures, historical M1.2/M1.3/M1.4 reports and issue ledger, ADR001-029, and M1.5 original independent-review text. All new M1.5.1 files were fully read. NativeRuntime changed lines plus launch/cleanup and file-boundary context were reviewed; full inherited native C#/PowerShell and the two native-only TS suites remain parent semantic-review scope. The old CPU adjudicator received targeted reading only. Catalogs were fully parsed/traversed as JSON structures, not claimed as literal prose reading. Complete per-file reading methods and SHA256 are in [final reading manifest](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/final-reading-manifest.json), referencing the unchanged [111-entry historical input manifest](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/reading-manifest.json).

## Lifecycle observation correction

The old raw cases `seq-single-8` and `parallel-multi-4` both have `history_complete_observed=true`, assigned/pinned counts **2/2** and **6/6**, empty Job and settled output, but an earlier `root_exit_observed=false`; later member samples are all `exited=true`, with root exit code **123**. This is a **process-lifecycle observation race**, not evidence of two missing historical members. See [raw-bound correction](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/lifecycle-observation-correction.json).

The old cleanup loop could stop when the Job was empty and both output pumps completed. The new loop also requires `WaitForSingleObject(handle,0)==0` for every retained process handle. Root and observed child handles remain pinned and have synchronization access. The formula `Math.Max(clock.ElapsedMilliseconds,deadline-80)`, 2ms poll interval, CPU settings, termination policy and existing finally cleanup are unchanged. Wait failure/non-signaled results cannot satisfy the early-break condition. The fix addresses the identified premature-break path within the existing cutoff. At cutoff, unverified observations remain possible; static review does not prove new timing behavior.

The result still fixes `membership_complete=false`, `parentage_complete=false`, `proof_status=EXIT_UNVERIFIED` and `release_authority=false`. The patch grants no release authority or production qualification. This reviewer did not retest the changed process path.

## Preserved independent evidence and limited reuse

| Evidence | Original source | Result and limit |
|---|---|---|
| Independent boundary models | `4825...` | **10/10 PASS**, 0 FAIL. Synthetic OS observations; no production Host/Worker qualification. |
| First native file attempt | `4825...` | Host restriction `EPERM`; **0/80** attacks. Preserved as inconclusive, not discarded. |
| Independent file-boundary probe | `4825...` | **80/80** predetermined race reads; 27 safe, 53 denied; 40 actual junction installations. Before/after positive baselines and deterministic junction denial completed. |

The successful native file run contains **85 raw responses**: 30 successes, all exactly the original `safe` bytes/hash/file identity, and 55 denials with no result/payload. Denials are WIN32_2 x47, REPARSE_REJECTED x7, WIN32_1921 x1. All raw responses were rechecked read-only. It is current-account file-primitive evidence only. See [retained evidence reconciliation](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/retained-evidence-recheck.json), [file probe result](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/native-file-probe-u/data/result.json) and [raw file responses](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/native-file-probe-u/data/case-p89cis/raw/d80477d3-ed7b-4289-ad1d-8dfaee8a3c2b.jsonl).

`Relative`, `FileOperation`, all adjacent file-boundary helpers, the file RPC transport and all other 99 files are byte-identical between freezes. This permits limited reuse for the unchanged file path. It does **not** constitute a 3f4c native/full-suite rerun or validate the changed process cleanup behavior. The earlier source snapshot, scripts, stdout/stderr and run metadata remain intact at their original paths.

## Retained author failures

The previous frozen author regression is independently recounted from its retained JSON and archived workspace: **305 tests = 295 PASS + 8 SKIP + 2 FAIL**, exit 1 (case JSON labels those eight skipped cases NOT_RUN). Both failures remain recorded. The CPU case accumulated **2921.875ms total CPU = 2812.5ms user + 109.375ms kernel** and required helper DEADLINE termination. The directory-replacement case stopped at RPC `m151-18` on `WIN32_1921`.

The latter raw log contains baseline plus **17 attack responses**, not the planned 40 attacks: 8 safe successes and 10 structural no-payload denials. The final denial is absent from the test whitelist. Microsoft identifies 1921 as `ERROR_CANT_RESOLVE_FILENAME`. [Microsoft system error reference](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--1700-3999-) No outside bytes were observed in those responses. This is a validation expectation gap with an incomplete original attack sequence; it is not a demonstrated implementation escape. The original failed test and assertion are unchanged, and the independent 80-attack probe does not turn that original FAIL into PASS. See [original frame counts](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/author-tocTou-evidence.json).

The retained **58-case CPU qualification independently recomputes to 57 FAIL / 1 PASS**. All 58 historical-count observations were complete; `membership_complete=false` is intentionally conservative. No production guarantee follows from the one incidental PASS. The current patch does not change the CPU budget, tolerance, Job flags, deadlines or CPU semantics. See [58-case raw/arithmetic recheck](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/cpu-evidence-recheck.json).

The parent owns subsequent CPU and full regression on the new 3f4c source. Those are not rerun or attested by this reviewer. Earlier 4825 failures remain intermediate-freeze evidence and are not overwritten.

## Gates and acceptance boundary

The fixed resource capability gate rejects REAL_WINDOWS in `QualificationGate.admit` before certificate selection and in Host prepare before reservation/native creation; Broker repeats qualification before consume/start. Control-plane construction can initialize. A valid trusted TCB certificate cannot remove the current hard CPU block. The original PROCESS/EXTERNAL_EFFECT gate remains blocked. Earlier independent model checks also covered audit flush failure before prepare/start, permit replay, tampered MAC, false sandbox limits, unknown tree/output/IPC and held resource claims.

No confirmed product P0/P1 is open in this review scope. The CPU capability failure, original integrated TOCTOU FAIL, distinct-account/composed isolation, real ExitProof/release, reboot/hard-power-loss and Ubuntu gaps keep overall acceptance **FAIL/BLOCKED**. Same-account primitives and simulated models confer no production release authority. No account, ACL, profile, service, firewall or product changes were made by this reviewer.

Machine-readable authoritative report: [final-review.json](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/final-review.json).
