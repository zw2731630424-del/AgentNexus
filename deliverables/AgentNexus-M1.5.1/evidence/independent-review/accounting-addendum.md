# AgentNexus M1.5.1 CPU accounting addendum

**Read-only arithmetic verified; discrepancy origin INCONCLUSIVE; acceptance FAIL/BLOCKED.** This addendum preserves the original final review and adds no OS or production qualification. No shell command, external program, test, native/OS probe, workload or link was started. Only existing JSON was read and integer arithmetic computed in the tool runtime.

Final source set: `3f4c9e1b30f7d956b7be9c6330872cf87f32681f86c39a9b3b09c97c9bc581a0`. I independently read all 58 final raw JSON responses and recomputed Job CPU minus the sum of retained-member CPU, separately for user and kernel time, using exact 100ns integer arithmetic. Every value matches [the reconciliation table](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/cpu-accounting-reconciliation.json). Its SHA256 is `dc8501c83d8656d0b3ff8dd55f1eb49fadc5d282a214c9be5069cf215995515b`.

| Observation | Result |
|---|---:|
| Cases with any negative component difference | 24/58 |
| Cases with both component differences exactly zero | 34/58 |
| Cases with a positive component difference | 0/58 |
| Negative user / negative kernel components | 18 / 16 |
| Maximum absolute user / kernel difference | 62.5ms / 62.5ms |
| Maximum absolute combined difference within one case | 93.75ms |

All nonzero differences are negative: recorded retained-member CPU sums exceed the corresponding Job reading. Every nonzero difference in this data set is a multiple of 15.625ms. These are measurements and arithmetic properties only. Their source is **INCONCLUSIVE**; they do not establish an OS timer, sampling or accounting implementation, lost CPU, or missing members. Claims that Job and per-process CPU always match exactly, or that an accounting gap is definitively absent, are unsupported.

All 58 final raw responses record root exit observed, all retained members exited, complete historical counts, and assigned count equal to pinned count and member count. These lifecycle observations do not reconcile the CPU values or grant release authority; the frames retain EXIT_UNVERIFIED and release_authority=false.

The small discrepancies do not explain the multi-second strict-budget failures. For example, final 'seq-single-1' has an 80ms budget plus 50ms tolerance, but Job user CPU and summed member user CPU are both **4781.25ms**, with **zero** user or kernel discrepancy. The Job user observation alone exceeds the permitted 130ms by 4651.25ms. For every nonzero discrepancy, the member sum is larger than the Job reading. This supports continued failure of the strict CPU qualification without assigning an internal OS cause.

The [final author CPU report](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/cpu-qualification/2026-11-07T19-49-58-861Z-25456/report.json), SHA256 `479d8fa6a9ca0ee18b4c82586ada86102fde298042f0bd5155647001f2a56ec2`, records **56 FAIL / 2 PASS** for this final source set, aggregate FAIL, production_qualified=false. This reviewer did not execute that workload; this addendum independently audits its recorded arithmetic. The earlier freeze's **57 FAIL / 1 PASS**, original regression failures and incomplete integrated TOCTOU case remain preserved. The hard production admission gates and no-release status remain required.

[Machine-readable addendum](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/accounting-addendum.json) includes all 58 calculations and raw-file hashes. [Original final review](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/final-review.md) and [JSON](I:/AI_AgentNexus/deliverables/AgentNexus-M1.5.1/evidence/independent-review/final-review.json) remain byte-identical (SHA256 `55f1ae65cb7526b25e4baee0186c7cff4149ea90e805e6c7aa6465c2ab2a625e` and `0efc7505e38d1511162b8165858f94bcc681e809722c2cd659f354164754060a`).
