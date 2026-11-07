# AgentNexus M1 Runtime Evidence

以下为原始最终日志、结果、审查（包括整改前CHANGES_REQUIRED）、demo及后续存储复审。均原字节嵌入，没有重跑、没有重建结果。NOT_RUN/FAIL保留。

## .workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap

类别：`original_runtime_evidence_or_index`；原始字节数：27367。

源文件 SHA256：

```text
7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0043","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap","bytes":27367,"sha256":"7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap"}} -->
```text
TAP version 13
# Subtest: FT-RESOLVE: defaults, child narrowing, ancestor veto, explicit INHERIT
ok 1 - FT-RESOLVE: defaults, child narrowing, ancestor veto, explicit INHERIT
  ---
  duration_ms: 92.6004
  type: 'test'
  ...
# Subtest: FT: unknown IDs, illegal scopes and non-admin payloads rejected
ok 2 - FT: unknown IDs, illegal scopes and non-admin payloads rejected
  ---
  duration_ms: 34.3366
  type: 'test'
  ...
# Subtest: FT-DEPENDENCY: rejects partial disable and does not enable a dependency implicitly
ok 3 - FT-DEPENDENCY: rejects partial disable and does not enable a dependency implicitly
  ---
  duration_ms: 47.0369
  type: 'test'
  ...
# Subtest: FT: mutual conflict, wrong preview hash and stale revision cannot commit
ok 4 - FT: mutual conflict, wrong preview hash and stale revision cannot commit
  ---
  duration_ms: 49.5928
  type: 'test'
  ...
# Subtest: FT-OFF: live work aborts; failure remains FAILED until explicit recovery
ok 5 - FT-OFF: live work aborts; failure remains FAILED until explicit recovery
  ---
  duration_ms: 50.8186
  type: 'test'
  ...
# Subtest: FT-RETAIN: configuration survives real reopen, facts remain and old epoch is invalid
ok 6 - FT-RETAIN: configuration survives real reopen, facts remain and old epoch is invalid
  ---
  duration_ms: 65.8959
  type: 'test'
  ...
# Subtest: FT-INHERIT-OFF: ON to INHERIT must quiesce when default is OFF
ok 7 - FT-INHERIT-OFF: ON to INHERIT must quiesce when default is OFF
  ---
  duration_ms: 54.6608
  type: 'test'
  ...
# Subtest: FT-LATE-STOP: timeout cannot recover or enable until the old stop actually settles
ok 8 - FT-LATE-STOP: timeout cannot recover or enable until the old stop actually settles
  ---
  duration_ms: 1057.8041
  type: 'test'
  ...
# Subtest: FT catalog is capacity, unimplemented module never becomes enabled from default ON
ok 9 - FT catalog is capacity, unimplemented module never becomes enabled from default ON
  ---
  duration_ms: 40.1658
  type: 'test'
  ...
# Subtest: P.ADMIN_MODE: forged admin, L0 degradation and missing reason rejected
ok 10 - P.ADMIN_MODE: forged admin, L0 degradation and missing reason rejected
  ---
  duration_ms: 32.7851
  type: 'test'
  ...
# Subtest: P.ADMIN_MODE: two distinct confirmations, preview binding and challenge replay
ok 11 - P.ADMIN_MODE: two distinct confirmations, preview binding and challenge replay
  ---
  duration_ms: 42.8062
  type: 'test'
  ...
# Subtest: P.MODE: same denied request has distinct enforce/audit/disabled behavior
ok 12 - P.MODE: same denied request has distinct enforce/audit/disabled behavior
  ---
  duration_ms: 49.296
  type: 'test'
  ...
# Subtest: P.MODE: selected IDs and project scope; explicit ENFORCE dominates overlap
ok 13 - P.MODE: selected IDs and project scope; explicit ENFORCE dominates overlap
  ---
  duration_ms: 50.457
  type: 'test'
  ...
# Subtest: P.MODE: PDP fault stays closed in ENFORCE and AUDIT_ONLY; DISABLED actually skips PDP
ok 14 - P.MODE: PDP fault stays closed in ENFORCE and AUDIT_ONLY; DISABLED actually skips PDP
  ---
  duration_ms: 49.0332
  type: 'test'
  ...
# Subtest: P.MODE-EXPIRY: real deadline freezes until persisted-chain preflight
ok 15 - P.MODE-EXPIRY: real deadline freezes until persisted-chain preflight
  ---
  duration_ms: 1420.0419
  type: 'test'
  ...
# Subtest: P.MODE-RECOVERY: reboot never restores a permissive lease without preflight
ok 16 - P.MODE-RECOVERY: reboot never restores a permissive lease without preflight
  ---
  duration_ms: 706.5232
  type: 'test'
  ...
# Subtest: P.APPROVAL: hash/identity/epoch/expiry bind grants and no self-reported approval
ok 17 - P.APPROVAL: hash/identity/epoch/expiry bind grants and no self-reported approval
  ---
  duration_ms: 266.6203
  type: 'test'
  ...
# Subtest: P.APPROVAL-EXPIRY: real expiry cannot revive under an in-process clock rollback
ok 18 - P.APPROVAL-EXPIRY: real expiry cannot revive under an in-process clock rollback
  ---
  duration_ms: 350.6064
  type: 'test'
  ...
# Subtest: Json canonical contract rejects accessors/cycles/nonfinite numbers
ok 19 - Json canonical contract rejects accessors/cycles/nonfinite numbers
  ---
  duration_ms: 0.5719
  type: 'test'
  ...
# Subtest: JSON uses real JSON.parse and preserves independent safety/authorization dimensions
ok 20 - JSON uses real JSON.parse and preserves independent safety/authorization dimensions
  ---
  duration_ms: 6.3624
  type: 'test'
  ...
# Subtest: Python AST actually parses valid/invalid source, with explicitly limited coverage
ok 21 - Python AST actually parses valid/invalid source, with explicitly limited coverage
  ---
  duration_ms: 433.5544
  type: 'test'
  ...
# Subtest: PowerShell Parser actually returns AST diagnostics and UTF-16 positions
ok 22 - PowerShell Parser actually returns AST diagnostics and UTF-16 positions
  ---
  duration_ms: 818.1031
  type: 'test'
  ...
# Subtest: Python and PowerShell source side effects remain unexecuted
ok 23 - Python and PowerShell source side effects remain unexecuted
  ---
  duration_ms: 382.914
  type: 'test'
  ...
# Subtest: all relevant source Feature OFF paths bypass without a configured parser
ok 24 - all relevant source Feature OFF paths bypass without a configured parser
  ---
  duration_ms: 0.4717
  type: 'test'
  ...
# Subtest: optional environment/safety OFF remains BYPASSED while syntax independently runs
ok 25 - optional environment/safety OFF remains BYPASSED while syntax independently runs
  ---
  duration_ms: 0.6016
  type: 'test'
  ...
# Subtest: missing parsers and unsupported languages/dialects never produce PASS
ok 26 - missing parsers and unsupported languages/dialects never produce PASS
  ---
  duration_ms: 0.5408
  type: 'test'
  ...
# Subtest: new document version, same-version hash mismatch and close fence old results
ok 27 - new document version, same-version hash mismatch and close fence old results
  ---
  duration_ms: 0.7487
  type: 'test'
  ...
# Subtest: real parser requests respect newer versions and Feature epoch changes
ok 28 - real parser requests respect newer versions and Feature epoch changes
  ---
  duration_ms: 147.0285
  type: 'test'
  ...
# Subtest: AbortSignal, timeout and dispose are bounded and never become PASS
ok 29 - AbortSignal, timeout and dispose are bounded and never become PASS
  ---
  duration_ms: 1.3393
  type: 'test'
  ...
# Subtest: source/Unicode/request budgets reject before parsing and constructor budgets are fixed
ok 30 - source/Unicode/request budgets reject before parsing and constructor budgets are fixed
  ---
  duration_ms: 0.6055
  type: 'test'
  ...
# Subtest: queue admission caps concurrent work and recovers after backpressure
ok 31 - queue admission caps concurrent work and recovers after backpressure
  ---
  duration_ms: 2.1428
  type: 'test'
  ...
# Subtest: PowerShell error floods remain bounded and do not turn truncation into PASS
ok 32 - PowerShell error floods remain bounded and do not turn truncation into PASS
  ---
  duration_ms: 510.9983
  type: 'test'
  ...
# Subtest: registered Git/Python argv schemas are static, limited and independently typed
ok 33 - registered Git/Python argv schemas are static, limited and independently typed
  ---
  duration_ms: 1.5155
  type: 'test'
  ...
# Subtest: argv environment checks inspect only the Host file and preserve the actual args result
ok 34 - argv environment checks inspect only the Host file and preserve the actual args result
  ---
  duration_ms: 0.7813
  type: 'test'
  ...
# Subtest: argv family and values are copied before asynchronous work
ok 35 - argv family and values are copied before asynchronous work
  ---
  duration_ms: 0.2249
  type: 'test'
  ...
# Subtest: argument Feature OFF bypasses schema and dispose prevents subsequent work
ok 36 - argument Feature OFF bypasses schema and dispose prevents subsequent work
  ---
  duration_ms: 0.2097
  type: 'test'
  ...
# Subtest: disposeAndWait confirms real interpreter child close and all queued work is drained
ok 37 - disposeAndWait confirms real interpreter child close and all queued work is drained
  ---
  duration_ms: 97.1763
  type: 'test'
  ...
# Subtest: AT/Context/Artifact: real invocation produces separate hash-linked facts and byte-exact output
ok 38 - AT/Context/Artifact: real invocation produces separate hash-linked facts and byte-exact output
  ---
  duration_ms: 166.3404
  type: 'test'
  ...
# Subtest: P.MODE+Gateway: same safe synthetic operation blocked/enforced, would-deny, and unevaluated
ok 39 - P.MODE+Gateway: same safe synthetic operation blocked/enforced, would-deny, and unevaluated
  ---
  duration_ms: 173.0621
  type: 'test'
  ...
# Subtest: P.SANDBOX: DISABLED does not admit arbitrary execution or close independent protection
ok 40 - P.SANDBOX: DISABLED does not admit arbitrary execution or close independent protection
  ---
  duration_ms: 64.1717
  type: 'test'
  ...
# Subtest: P.IDENTITY: facade has no administration and JSON admin/mode flags cannot elevate
ok 41 - P.IDENTITY: facade has no administration and JSON admin/mode flags cannot elevate
  ---
  duration_ms: 47.3077
  type: 'test'
  ...
# Subtest: P.APPROVAL_REPLAY: exact approval executes once; altered intent and replay denied
ok 42 - P.APPROVAL_REPLAY: exact approval executes once; altered intent and replay denied
  ---
  duration_ms: 125.8512
  type: 'test'
  ...
# Subtest: P.DB_ATOMIC: 16 concurrent duplicate requests invoke a real handler at most once
ok 43 - P.DB_ATOMIC: 16 concurrent duplicate requests invoke a real handler at most once
  ---
  duration_ms: 93.3012
  type: 'test'
  ...
# Subtest: P.WORKSPACE_WRITER: concurrent distinct calls cannot overwrite active resource; modes cannot change mid-action
ok 44 - P.WORKSPACE_WRITER: concurrent distinct calls cannot overwrite active resource; modes cannot change mid-action
  ---
  duration_ms: 116.2973
  type: 'test'
  ...
# Subtest: AT-IOFAIL-before: actual SQLite readonly persistence failure prevents handler execution
ok 45 - AT-IOFAIL-before: actual SQLite readonly persistence failure prevents handler execution
  ---
  duration_ms: 102.1128
  type: 'test'
  ...
# Subtest: AT-IOFAIL-after: actual effect with unrecordable result keeps claim and never replays
ok 46 - AT-IOFAIL-after: actual effect with unrecordable result keeps claim and never replays
  ---
  duration_ms: 95.1152
  type: 'test'
  ...
# Subtest: P.TIMEOUT: timeout retains owned lease until actual handler settlement and never resets claim
ok 47 - P.TIMEOUT: timeout retains owned lease until actual handler settlement and never resets claim
  ---
  duration_ms: 104.6834
  type: 'test'
  ...
# Subtest: AT-REPLAY: reconstruction is readonly and session scope does not grant peer context
ok 48 - AT-REPLAY: reconstruction is readonly and session scope does not grant peer context
  ---
  duration_ms: 94.8365
  type: 'test'
  ...
# Subtest: P.IDENTITY-revocation: old facade cannot read or close a replacement session
ok 49 - P.IDENTITY-revocation: old facade cannot read or close a replacement session
  ---
  duration_ms: 138.2991
  type: 'test'
  ...
# Subtest: P.IDENTITY-close-race: close revokes facade before its first asynchronous cleanup
ok 50 - P.IDENTITY-close-race: close revokes facade before its first asynchronous cleanup
  ---
  duration_ms: 98.8032
  type: 'test'
  ...
# Subtest: P.TIMEOUT-clock: handler deadline uses elapsed time under a wall-clock rollback
ok 51 - P.TIMEOUT-clock: handler deadline uses elapsed time under a wall-clock rollback
  ---
  duration_ms: 113.0805
  type: 'test'
  ...
# Subtest: P.MODE-START: a bypass expiring during a real delayed durability barrier cannot execute
ok 52 - P.MODE-START: a bypass expiring during a real delayed durability barrier cannot execute
  ---
  duration_ms: 486.4564
  type: 'test'
  ...
# Subtest: DI integration: malformed code remains FAIL, checks OFF are BYPASSED, raw/audit continue
ok 53 - DI integration: malformed code remains FAIL, checks OFF are BYPASSED, raw/audit continue
  ---
  duration_ms: 164.3713
  type: 'test'
  ...
# Subtest: Tool OFF rejects invocation, diagnostics log OFF does not silence core audit, oversized request is bounded
ok 54 - Tool OFF rejects invocation, diagnostics log OFF does not silence core audit, oversized request is bounded
  ---
  duration_ms: 70.0373
  type: 'test'
  ...
# Subtest: P.ARG_BINDING: mutation by schema or caller cannot replace the authorized snapshot
ok 55 - P.ARG_BINDING: mutation by schema or caller cannot replace the authorized snapshot
  ---
  duration_ms: 86.8136
  type: 'test'
  ...
# Subtest: DI command checking keeps argv preview as data and cannot execute Git/Python
ok 56 - DI command checking keeps argv preview as data and cannot execute Git/Python
  ---
  duration_ms: 93.4785
  type: 'test'
  ...
# Subtest: controlled static bytes close over binary, empty and nested same-name files
ok 57 - controlled static bytes close over binary, empty and nested same-name files
  ---
  duration_ms: 46.0737
  type: 'test'
  ...
# Subtest: empty package permits exactly its manifest, with zero payload budgets
ok 58 - empty package permits exactly its manifest, with zero payload budgets
  ---
  duration_ms: 5.7818
  type: 'test'
  ...
# Subtest: matching mutable tree is INCONCLUSIVE, never a trusted release root
ok 59 - matching mutable tree is INCONCLUSIVE, never a trusted release root
  ---
  duration_ms: 7.2545
  type: 'test'
  ...
# Subtest: same-size modified content fails its SHA-256
ok 60 - same-size modified content fails its SHA-256
  ---
  duration_ms: 7.5368
  type: 'test'
  ...
# Subtest: appended content fails declared byte size
ok 61 - appended content fails declared byte size
  ---
  duration_ms: 6.0254
  type: 'test'
  ...
# Subtest: missing and unlisted files are both reported by full relative path
ok 62 - missing and unlisted files are both reported by full relative path
  ---
  duration_ms: 7.3039
  type: 'test'
  ...
# Subtest: unlisted nested manifest and SHA256SUMS names are never self exceptions
    # Subtest: sub/manifest.json
    ok 1 - sub/manifest.json
      ---
      duration_ms: 7.3023
      type: 'test'
      ...
    # Subtest: validation/SHA256SUMS.txt
    ok 2 - validation/SHA256SUMS.txt
      ---
      duration_ms: 8.2442
      type: 'test'
      ...
    # Subtest: unexpected.cjs
    ok 3 - unexpected.cjs
      ---
      duration_ms: 5.8195
      type: 'test'
      ...
    # Subtest: .hidden
    ok 4 - .hidden
      ---
      duration_ms: 5.6043
      type: 'test'
      ...
    1..4
ok 63 - unlisted nested manifest and SHA256SUMS names are never self exceptions
  ---
  duration_ms: 27.7673
  type: 'test'
  ...
# Subtest: root manifest is required and cannot list itself
ok 64 - root manifest is required and cannot list itself
  ---
  duration_ms: 5.331
  type: 'test'
  ...
# Subtest: root manifest directory and non-directory roots fail
ok 65 - root manifest directory and non-directory roots fail
  ---
  duration_ms: 4.4881
  type: 'test'
  ...
# Subtest: duplicate JSON keys are rejected despite JSON.parse last-wins semantics
ok 66 - duplicate JSON keys are rejected despite JSON.parse last-wins semantics
  ---
  duration_ms: 6.3436
  type: 'test'
  ...
# Subtest: duplicate complete path and unsorted arrays fail independently
ok 67 - duplicate complete path and unsorted arrays fail independently
  ---
  duration_ms: 5.428
  type: 'test'
  ...
# Subtest: case conflicts include ancestor directories and file-directory prefixes
    # Subtest: A vs a
    ok 1 - A vs a
      ---
      duration_ms: 4.0673
      type: 'test'
      ...
    # Subtest: Dir/a vs dir/b
    ok 2 - Dir/a vs dir/b
      ---
      duration_ms: 4.2427
      type: 'test'
      ...
    # Subtest: a vs a/b
    ok 3 - a vs a/b
      ---
      duration_ms: 6.5029
      type: 'test'
      ...
    1..3
ok 68 - case conflicts include ancestor directories and file-directory prefixes
  ---
  duration_ms: 15.3344
  type: 'test'
  ...
# Subtest: path traversal, device aliases, malformed separators and Unicode reject before payload reads
    # Subtest: "../outside"
    ok 1 - "../outside"
      ---
      duration_ms: 5.2886
      type: 'test'
      ...
    # Subtest: "./a"
    ok 2 - "./a"
      ---
      duration_ms: 4.7405
      type: 'test'
      ...
    # Subtest: "a//b"
    ok 3 - "a//b"
      ---
      duration_ms: 5.1763
      type: 'test'
      ...
    # Subtest: "/outside"
    ok 4 - "/outside"
      ---
      duration_ms: 4.5287
      type: 'test'
      ...
    # Subtest: "C:/outside"
    ok 5 - "C:/outside"
      ---
      duration_ms: 4.4399
      type: 'test'
      ...
    # Subtest: "//server/share"
    ok 6 - "//server/share"
      ---
      duration_ms: 5.047
      type: 'test'
      ...
    # Subtest: "a\\\\b"
    ok 7 - "a\\\\b"
      ---
      duration_ms: 5.4682
      type: 'test'
      ...
    # Subtest: "a:stream"
    ok 8 - "a:stream"
      ---
      duration_ms: 4.4504
      type: 'test'
      ...
    # Subtest: "NUL.txt"
    ok 9 - "NUL.txt"
      ---
      duration_ms: 4.8727
      type: 'test'
      ...
    # Subtest: "COM1"
    ok 10 - "COM1"
      ---
      duration_ms: 5.5261
      type: 'test'
      ...
    # Subtest: "con.tar.gz"
    ok 11 - "con.tar.gz"
      ---
      duration_ms: 4.7166
      type: 'test'
      ...
    # Subtest: "a."
    ok 12 - "a."
      ---
      duration_ms: 4.5538
      type: 'test'
      ...
    # Subtest: "a "
    ok 13 - "a "
      ---
      duration_ms: 5.7142
      type: 'test'
      ...
    # Subtest: "PROGRA~1/file"
    ok 14 - "PROGRA~1/file"
      ---
      duration_ms: 4.9382
      type: 'test'
      ...
    # Subtest: ""
    ok 15 - ""
      ---
      duration_ms: 4.7052
      type: 'test'
      ...
    # Subtest: "a\\u0000b"
    ok 16 - "a\\u0000b"
      ---
      duration_ms: 4.9186
      type: 'test'
      ...
    # Subtest: "é"
    ok 17 - "é"
      ---
      duration_ms: 5.1454
      type: 'test'
      ...
    # Subtest: "é"
    ok 18 - "é"
      ---
      duration_ms: 5.125
      type: 'test'
      ...
    # Subtest: "İ"
    ok 19 - "İ"
      ---
      duration_ms: 5.6558
      type: 'test'
      ...
    # Subtest: "a/a/"
    ok 20 - "a/a/"
      ---
      duration_ms: 4.7794
      type: 'test'
      ...
    1..20
ok 69 - path traversal, device aliases, malformed separators and Unicode reject before payload reads
  ---
  duration_ms: 102.2502
  type: 'test'
  ...
# Subtest: schema, digest and byte count reject invalid declarations
ok 70 - schema, digest and byte count reject invalid declarations
  ---
  duration_ms: 15.3417
  type: 'test'
  ...
# Subtest: canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes
ok 71 - canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes
  ---
  duration_ms: 10.6302
  type: 'test'
  ...
# Subtest: extra empty directory and file-vs-directory mismatch cannot disappear
ok 72 - extra empty directory and file-vs-directory mismatch cannot disappear
  ---
  duration_ms: 8.289
  type: 'test'
  ...
# Subtest: file count and total bytes budgets work at exact limit and limit plus one
ok 73 - file count and total bytes budgets work at exact limit and limit plus one
  ---
  duration_ms: 9.5833
  type: 'test'
  ...
# Subtest: actual unlisted content also consumes size and count budgets
ok 74 - actual unlisted content also consumes size and count budgets
  ---
  duration_ms: 6.2789
  type: 'test'
  ...
# Subtest: manifest and single-file caps are enforced without reading an oversized payload
ok 75 - manifest and single-file caps are enforced without reading an oversized payload
  ---
  duration_ms: 5.8979
  type: 'test'
  ...
# Subtest: path length and depth have bounded rejection
ok 76 - path length and depth have bounded rejection
  ---
  duration_ms: 5.9978
  type: 'test'
  ...
# Subtest: actual default file and directory count limits accept the edge and reject one more
ok 77 - actual default file and directory count limits accept the edge and reject one more
  ---
  duration_ms: 1040.7113
  type: 'test'
  ...
# Subtest: actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject
ok 78 - actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject
  ---
  duration_ms: 47.3515
  type: 'test'
  ...
# Subtest: maximum component and depth are accepted on an actually created portable path
ok 79 - maximum component and depth are accepted on an actually created portable path
  ---
  duration_ms: 31.8846
  type: 'test'
  ...
# Subtest: Host cannot expand limits or choose an unknown mode; relative roots reject
ok 80 - Host cannot expand limits or choose an unknown mode; relative roots reject
  ---
  duration_ms: 3.2713
  type: 'test'
  ...
# Subtest: pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work
ok 81 - pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work
  ---
  duration_ms: 6.9132
  type: 'test'
  ...
# Subtest: diagnostic count and encoded bytes remain bounded for many extra files
ok 82 - diagnostic count and encoded bytes remain bounded for many extra files
  ---
  duration_ms: 53.6636
  type: 'test'
  ...
# Subtest: candidate scripts, package metadata and git-looking files are data and never executed
ok 83 - candidate scripts, package metadata and git-looking files are data and never executed
  ---
  duration_ms: 13.6591
  type: 'test'
  ...
# Subtest: real OS file symlink is rejected without following its target
ok 84 - real OS file symlink is rejected without following its target # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 4.6256
  type: 'test'
  ...
# Subtest: real OS dir link is rejected
ok 85 - real OS dir link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 4.2473
  type: 'test'
  ...
# Subtest: real OS junction link is rejected
ok 86 - real OS junction link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 4.4716
  type: 'test'
  ...
# Subtest: real OS hardlink to an outside object is rejected by link count
ok 87 - real OS hardlink to an outside object is rejected by link count # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 4.1604
  type: 'test'
  ...
# Subtest: real SQLite, three independent domain chains and global pagination
ok 88 - real SQLite, three independent domain chains and global pagination
  ---
  duration_ms: 108.0035
  type: 'test'
  ...
# Subtest: synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault
ok 89 - synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault
  ---
  duration_ms: 28.4596
  type: 'test'
  ...
# Subtest: agent and session SQL filters apply before LIMIT and preserve global cursor pages
ok 90 - agent and session SQL filters apply before LIMIT and preserve global cursor pages
  ---
  duration_ms: 221.0731
  type: 'test'
  ...
# Subtest: flush covers its captured target after an empty or older shared flush
ok 91 - flush covers its captured target after an empty or older shared flush
  ---
  duration_ms: 30.9032
  type: 'test'
  ...
# Subtest: required fields, malformed refs, oversized envelopes and query budgets reject without fault
ok 92 - required fields, malformed refs, oversized envelopes and query budgets reject without fault
  ---
  duration_ms: 25.4093
  type: 'test'
  ...
# Subtest: outbox high water rejects new records, then drains without unbounded queues
ok 93 - outbox high water rejects new records, then drains without unbounded queues
  ---
  duration_ms: 36.2069
  type: 'test'
  ...
# Subtest: second writer and live lock recovery are blocked; real owner death is explicit
ok 94 - second writer and live lock recovery are blocked; real owner death is explicit
  ---
  duration_ms: 230.5204
  type: 'test'
  ...
# Subtest: process crash after file fsync and before receipt reexports no duplicate
ok 95 - process crash after file fsync and before receipt reexports no duplicate
  ---
  duration_ms: 205.5032
  type: 'test'
  ...
# Subtest: unacknowledged crash tail is preserved then repaired from durable outbox
ok 96 - unacknowledged crash tail is preserved then repaired from durable outbox
  ---
  duration_ms: 455.5491
  type: 'test'
  ...
# Subtest: actual export I/O failure freezes writes and preserves outbox until explicit recovery
ok 97 - actual export I/O failure freezes writes and preserves outbox until explicit recovery
  ---
  duration_ms: 32.0677
  type: 'test'
  ...
# Subtest: acknowledged truncation is never silently discarded or rebuilt as success
ok 98 - acknowledged truncation is never silently discarded or rebuilt as success
  ---
  duration_ms: 22.345
  type: 'test'
  ...
# Subtest: actual artifact publication I/O failure retains bytes and freezes both record and object admission
ok 99 - actual artifact publication I/O failure retains bytes and freezes both record and object admission
  ---
  duration_ms: 28.9865
  type: 'test'
  ...
# Subtest: database hash tampering throws, freezes writes and does not fake repair
ok 100 - database hash tampering throws, freezes writes and does not fake repair
  ---
  duration_ms: 20.8347
  type: 'test'
  ...
# Subtest: 32 MiB randomized artifact roundtrip streams with real backpressure and two hashes
ok 101 - 32 MiB randomized artifact roundtrip streams with real backpressure and two hashes
  ---
  duration_ms: 275.7796
  type: 'test'
  ...
# Subtest: cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected
ok 102 - cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected
  ---
  duration_ms: 32.4128
  type: 'test'
  ...
# Subtest: early artifact iterator return is not verification; full corrupted stream fails closed
ok 103 - early artifact iterator return is not verification; full corrupted stream fails closed
  ---
  duration_ms: 39.9431
  type: 'test'
  ...
# Subtest: concurrent artifact admission is bounded and rejects a third stream without queueing
ok 104 - concurrent artifact admission is bounded and rejects a third stream without queueing
  ---
  duration_ms: 42.405
  type: 'test'
  ...
# Subtest: abort races a permanently pending source.next without retaining Store writers or accepting late bytes
ok 105 - abort races a permanently pending source.next without retaining Store writers or accepting late bytes
  ---
  duration_ms: 21.5713
  type: 'test'
  ...
# Subtest: concurrent close calls share the real drain and lock-release promise
ok 106 - concurrent close calls share the real drain and lock-release promise
  ---
  duration_ms: 20.3931
  type: 'test'
  ...
# Subtest: sealed segments are compressed, chained and verified; stored bit flip is detected
ok 107 - sealed segments are compressed, chained and verified; stored bit flip is detected
  ---
  duration_ms: 103.0305
  type: 'test'
  ...
# Subtest: process-killed partial artifact remains retained without a complete object reference
ok 108 - process-killed partial artifact remains retained without a complete object reference
  ---
  duration_ms: 199.2909
  type: 'test'
  ...
1..108
# tests 135
# suites 0
# pass 131
# fail 0
# cancelled 0
# skipped 4
# todo 0
# duration_ms 14618.3748
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/test-results.json

类别：`original_runtime_evidence_or_index`；原始字节数：30638。

源文件 SHA256：

```text
e72ea36f1fbf031c1c750f422bc1ecceed4cc324fc738163bc7a04fe437fb524
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0044","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/test-results.json","bytes":30638,"sha256":"e72ea36f1fbf031c1c750f422bc1ecceed4cc324fc738163bc7a04fe437fb524","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/test-results.json"}} -->
```json
{
  "utc": "2026-11-06T17:54:41.259308+00:00",
  "command": [
    "node",
    "tools/agentnexus/run-tests.mjs"
  ],
  "exit_code": 0,
  "totals": {
    "tests": 135,
    "pass": 131,
    "fail": 0,
    "cancelled": 0,
    "skipped": 4,
    "todo": 0
  },
  "cases": [
    {
      "ordinal": 1,
      "tap_local_ordinal": 1,
      "tap_indent": 0,
      "name": "FT-RESOLVE: defaults, child narrowing, ancestor veto, explicit INHERIT",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 2,
      "tap_local_ordinal": 2,
      "tap_indent": 0,
      "name": "FT: unknown IDs, illegal scopes and non-admin payloads rejected",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 3,
      "tap_local_ordinal": 3,
      "tap_indent": 0,
      "name": "FT-DEPENDENCY: rejects partial disable and does not enable a dependency implicitly",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 4,
      "tap_local_ordinal": 4,
      "tap_indent": 0,
      "name": "FT: mutual conflict, wrong preview hash and stale revision cannot commit",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 5,
      "tap_local_ordinal": 5,
      "tap_indent": 0,
      "name": "FT-OFF: live work aborts; failure remains FAILED until explicit recovery",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 6,
      "tap_local_ordinal": 6,
      "tap_indent": 0,
      "name": "FT-RETAIN: configuration survives real reopen, facts remain and old epoch is invalid",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 7,
      "tap_local_ordinal": 7,
      "tap_indent": 0,
      "name": "FT-INHERIT-OFF: ON to INHERIT must quiesce when default is OFF",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 8,
      "tap_local_ordinal": 8,
      "tap_indent": 0,
      "name": "FT-LATE-STOP: timeout cannot recover or enable until the old stop actually settles",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 9,
      "tap_local_ordinal": 9,
      "tap_indent": 0,
      "name": "FT catalog is capacity, unimplemented module never becomes enabled from default ON",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 10,
      "tap_local_ordinal": 10,
      "tap_indent": 0,
      "name": "P.ADMIN_MODE: forged admin, L0 degradation and missing reason rejected",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 11,
      "tap_local_ordinal": 11,
      "tap_indent": 0,
      "name": "P.ADMIN_MODE: two distinct confirmations, preview binding and challenge replay",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 12,
      "tap_local_ordinal": 12,
      "tap_indent": 0,
      "name": "P.MODE: same denied request has distinct enforce/audit/disabled behavior",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 13,
      "tap_local_ordinal": 13,
      "tap_indent": 0,
      "name": "P.MODE: selected IDs and project scope; explicit ENFORCE dominates overlap",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 14,
      "tap_local_ordinal": 14,
      "tap_indent": 0,
      "name": "P.MODE: PDP fault stays closed in ENFORCE and AUDIT_ONLY; DISABLED actually skips PDP",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 15,
      "tap_local_ordinal": 15,
      "tap_indent": 0,
      "name": "P.MODE-EXPIRY: real deadline freezes until persisted-chain preflight",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 16,
      "tap_local_ordinal": 16,
      "tap_indent": 0,
      "name": "P.MODE-RECOVERY: reboot never restores a permissive lease without preflight",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 17,
      "tap_local_ordinal": 17,
      "tap_indent": 0,
      "name": "P.APPROVAL: hash/identity/epoch/expiry bind grants and no self-reported approval",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 18,
      "tap_local_ordinal": 18,
      "tap_indent": 0,
      "name": "P.APPROVAL-EXPIRY: real expiry cannot revive under an in-process clock rollback",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 19,
      "tap_local_ordinal": 19,
      "tap_indent": 0,
      "name": "Json canonical contract rejects accessors/cycles/nonfinite numbers",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 20,
      "tap_local_ordinal": 20,
      "tap_indent": 0,
      "name": "JSON uses real JSON.parse and preserves independent safety/authorization dimensions",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 21,
      "tap_local_ordinal": 21,
      "tap_indent": 0,
      "name": "Python AST actually parses valid/invalid source, with explicitly limited coverage",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 22,
      "tap_local_ordinal": 22,
      "tap_indent": 0,
      "name": "PowerShell Parser actually returns AST diagnostics and UTF-16 positions",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 23,
      "tap_local_ordinal": 23,
      "tap_indent": 0,
      "name": "Python and PowerShell source side effects remain unexecuted",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 24,
      "tap_local_ordinal": 24,
      "tap_indent": 0,
      "name": "all relevant source Feature OFF paths bypass without a configured parser",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 25,
      "tap_local_ordinal": 25,
      "tap_indent": 0,
      "name": "optional environment/safety OFF remains BYPASSED while syntax independently runs",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 26,
      "tap_local_ordinal": 26,
      "tap_indent": 0,
      "name": "missing parsers and unsupported languages/dialects never produce PASS",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 27,
      "tap_local_ordinal": 27,
      "tap_indent": 0,
      "name": "new document version, same-version hash mismatch and close fence old results",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 28,
      "tap_local_ordinal": 28,
      "tap_indent": 0,
      "name": "real parser requests respect newer versions and Feature epoch changes",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 29,
      "tap_local_ordinal": 29,
      "tap_indent": 0,
      "name": "AbortSignal, timeout and dispose are bounded and never become PASS",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 30,
      "tap_local_ordinal": 30,
      "tap_indent": 0,
      "name": "source/Unicode/request budgets reject before parsing and constructor budgets are fixed",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 31,
      "tap_local_ordinal": 31,
      "tap_indent": 0,
      "name": "queue admission caps concurrent work and recovers after backpressure",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 32,
      "tap_local_ordinal": 32,
      "tap_indent": 0,
      "name": "PowerShell error floods remain bounded and do not turn truncation into PASS",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 33,
      "tap_local_ordinal": 33,
      "tap_indent": 0,
      "name": "registered Git/Python argv schemas are static, limited and independently typed",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 34,
      "tap_local_ordinal": 34,
      "tap_indent": 0,
      "name": "argv environment checks inspect only the Host file and preserve the actual args result",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 35,
      "tap_local_ordinal": 35,
      "tap_indent": 0,
      "name": "argv family and values are copied before asynchronous work",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 36,
      "tap_local_ordinal": 36,
      "tap_indent": 0,
      "name": "argument Feature OFF bypasses schema and dispose prevents subsequent work",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 37,
      "tap_local_ordinal": 37,
      "tap_indent": 0,
      "name": "disposeAndWait confirms real interpreter child close and all queued work is drained",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 38,
      "tap_local_ordinal": 38,
      "tap_indent": 0,
      "name": "AT/Context/Artifact: real invocation produces separate hash-linked facts and byte-exact output",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 39,
      "tap_local_ordinal": 39,
      "tap_indent": 0,
      "name": "P.MODE+Gateway: same safe synthetic operation blocked/enforced, would-deny, and unevaluated",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 40,
      "tap_local_ordinal": 40,
      "tap_indent": 0,
      "name": "P.SANDBOX: DISABLED does not admit arbitrary execution or close independent protection",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 41,
      "tap_local_ordinal": 41,
      "tap_indent": 0,
      "name": "P.IDENTITY: facade has no administration and JSON admin/mode flags cannot elevate",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 42,
      "tap_local_ordinal": 42,
      "tap_indent": 0,
      "name": "P.APPROVAL_REPLAY: exact approval executes once; altered intent and replay denied",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 43,
      "tap_local_ordinal": 43,
      "tap_indent": 0,
      "name": "P.DB_ATOMIC: 16 concurrent duplicate requests invoke a real handler at most once",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 44,
      "tap_local_ordinal": 44,
      "tap_indent": 0,
      "name": "P.WORKSPACE_WRITER: concurrent distinct calls cannot overwrite active resource; modes cannot change mid-action",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 45,
      "tap_local_ordinal": 45,
      "tap_indent": 0,
      "name": "AT-IOFAIL-before: actual SQLite readonly persistence failure prevents handler execution",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 46,
      "tap_local_ordinal": 46,
      "tap_indent": 0,
      "name": "AT-IOFAIL-after: actual effect with unrecordable result keeps claim and never replays",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 47,
      "tap_local_ordinal": 47,
      "tap_indent": 0,
      "name": "P.TIMEOUT: timeout retains owned lease until actual handler settlement and never resets claim",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 48,
      "tap_local_ordinal": 48,
      "tap_indent": 0,
      "name": "AT-REPLAY: reconstruction is readonly and session scope does not grant peer context",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 49,
      "tap_local_ordinal": 49,
      "tap_indent": 0,
      "name": "P.IDENTITY-revocation: old facade cannot read or close a replacement session",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 50,
      "tap_local_ordinal": 50,
      "tap_indent": 0,
      "name": "P.IDENTITY-close-race: close revokes facade before its first asynchronous cleanup",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 51,
      "tap_local_ordinal": 51,
      "tap_indent": 0,
      "name": "P.TIMEOUT-clock: handler deadline uses elapsed time under a wall-clock rollback",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 52,
      "tap_local_ordinal": 52,
      "tap_indent": 0,
      "name": "P.MODE-START: a bypass expiring during a real delayed durability barrier cannot execute",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 53,
      "tap_local_ordinal": 53,
      "tap_indent": 0,
      "name": "DI integration: malformed code remains FAIL, checks OFF are BYPASSED, raw/audit continue",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 54,
      "tap_local_ordinal": 54,
      "tap_indent": 0,
      "name": "Tool OFF rejects invocation, diagnostics log OFF does not silence core audit, oversized request is bounded",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 55,
      "tap_local_ordinal": 55,
      "tap_indent": 0,
      "name": "P.ARG_BINDING: mutation by schema or caller cannot replace the authorized snapshot",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 56,
      "tap_local_ordinal": 56,
      "tap_indent": 0,
      "name": "DI command checking keeps argv preview as data and cannot execute Git/Python",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 57,
      "tap_local_ordinal": 57,
      "tap_indent": 0,
      "name": "controlled static bytes close over binary, empty and nested same-name files",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 58,
      "tap_local_ordinal": 58,
      "tap_indent": 0,
      "name": "empty package permits exactly its manifest, with zero payload budgets",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 59,
      "tap_local_ordinal": 59,
      "tap_indent": 0,
      "name": "matching mutable tree is INCONCLUSIVE, never a trusted release root",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 60,
      "tap_local_ordinal": 60,
      "tap_indent": 0,
      "name": "same-size modified content fails its SHA-256",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 61,
      "tap_local_ordinal": 61,
      "tap_indent": 0,
      "name": "appended content fails declared byte size",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 62,
      "tap_local_ordinal": 62,
      "tap_indent": 0,
      "name": "missing and unlisted files are both reported by full relative path",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 63,
      "tap_local_ordinal": 1,
      "tap_indent": 4,
      "name": "sub/manifest.json",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 64,
      "tap_local_ordinal": 2,
      "tap_indent": 4,
      "name": "validation/SHA256SUMS.txt",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 65,
      "tap_local_ordinal": 3,
      "tap_indent": 4,
      "name": "unexpected.cjs",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 66,
      "tap_local_ordinal": 4,
      "tap_indent": 4,
      "name": ".hidden",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 67,
      "tap_local_ordinal": 63,
      "tap_indent": 0,
      "name": "unlisted nested manifest and SHA256SUMS names are never self exceptions",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 68,
      "tap_local_ordinal": 64,
      "tap_indent": 0,
      "name": "root manifest is required and cannot list itself",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 69,
      "tap_local_ordinal": 65,
      "tap_indent": 0,
      "name": "root manifest directory and non-directory roots fail",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 70,
      "tap_local_ordinal": 66,
      "tap_indent": 0,
      "name": "duplicate JSON keys are rejected despite JSON.parse last-wins semantics",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 71,
      "tap_local_ordinal": 67,
      "tap_indent": 0,
      "name": "duplicate complete path and unsorted arrays fail independently",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 72,
      "tap_local_ordinal": 1,
      "tap_indent": 4,
      "name": "A vs a",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 73,
      "tap_local_ordinal": 2,
      "tap_indent": 4,
      "name": "Dir/a vs dir/b",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 74,
      "tap_local_ordinal": 3,
      "tap_indent": 4,
      "name": "a vs a/b",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 75,
      "tap_local_ordinal": 68,
      "tap_indent": 0,
      "name": "case conflicts include ancestor directories and file-directory prefixes",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 76,
      "tap_local_ordinal": 1,
      "tap_indent": 4,
      "name": "\"../outside\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 77,
      "tap_local_ordinal": 2,
      "tap_indent": 4,
      "name": "\"./a\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 78,
      "tap_local_ordinal": 3,
      "tap_indent": 4,
      "name": "\"a//b\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 79,
      "tap_local_ordinal": 4,
      "tap_indent": 4,
      "name": "\"/outside\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 80,
      "tap_local_ordinal": 5,
      "tap_indent": 4,
      "name": "\"C:/outside\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 81,
      "tap_local_ordinal": 6,
      "tap_indent": 4,
      "name": "\"//server/share\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 82,
      "tap_local_ordinal": 7,
      "tap_indent": 4,
      "name": "\"a\\\\\\\\b\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 83,
      "tap_local_ordinal": 8,
      "tap_indent": 4,
      "name": "\"a:stream\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 84,
      "tap_local_ordinal": 9,
      "tap_indent": 4,
      "name": "\"NUL.txt\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 85,
      "tap_local_ordinal": 10,
      "tap_indent": 4,
      "name": "\"COM1\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 86,
      "tap_local_ordinal": 11,
      "tap_indent": 4,
      "name": "\"con.tar.gz\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 87,
      "tap_local_ordinal": 12,
      "tap_indent": 4,
      "name": "\"a.\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 88,
      "tap_local_ordinal": 13,
      "tap_indent": 4,
      "name": "\"a \"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 89,
      "tap_local_ordinal": 14,
      "tap_indent": 4,
      "name": "\"PROGRA~1/file\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 90,
      "tap_local_ordinal": 15,
      "tap_indent": 4,
      "name": "\"\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 91,
      "tap_local_ordinal": 16,
      "tap_indent": 4,
      "name": "\"a\\\\u0000b\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 92,
      "tap_local_ordinal": 17,
      "tap_indent": 4,
      "name": "\"é\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 93,
      "tap_local_ordinal": 18,
      "tap_indent": 4,
      "name": "\"é\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 94,
      "tap_local_ordinal": 19,
      "tap_indent": 4,
      "name": "\"İ\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 95,
      "tap_local_ordinal": 20,
      "tap_indent": 4,
      "name": "\"a/a/\"",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 96,
      "tap_local_ordinal": 69,
      "tap_indent": 0,
      "name": "path traversal, device aliases, malformed separators and Unicode reject before payload reads",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 97,
      "tap_local_ordinal": 70,
      "tap_indent": 0,
      "name": "schema, digest and byte count reject invalid declarations",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 98,
      "tap_local_ordinal": 71,
      "tap_indent": 0,
      "name": "canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 99,
      "tap_local_ordinal": 72,
      "tap_indent": 0,
      "name": "extra empty directory and file-vs-directory mismatch cannot disappear",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 100,
      "tap_local_ordinal": 73,
      "tap_indent": 0,
      "name": "file count and total bytes budgets work at exact limit and limit plus one",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 101,
      "tap_local_ordinal": 74,
      "tap_indent": 0,
      "name": "actual unlisted content also consumes size and count budgets",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 102,
      "tap_local_ordinal": 75,
      "tap_indent": 0,
      "name": "manifest and single-file caps are enforced without reading an oversized payload",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 103,
      "tap_local_ordinal": 76,
      "tap_indent": 0,
      "name": "path length and depth have bounded rejection",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 104,
      "tap_local_ordinal": 77,
      "tap_indent": 0,
      "name": "actual default file and directory count limits accept the edge and reject one more",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 105,
      "tap_local_ordinal": 78,
      "tap_indent": 0,
      "name": "actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 106,
      "tap_local_ordinal": 79,
      "tap_indent": 0,
      "name": "maximum component and depth are accepted on an actually created portable path",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 107,
      "tap_local_ordinal": 80,
      "tap_indent": 0,
      "name": "Host cannot expand limits or choose an unknown mode; relative roots reject",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 108,
      "tap_local_ordinal": 81,
      "tap_indent": 0,
      "name": "pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 109,
      "tap_local_ordinal": 82,
      "tap_indent": 0,
      "name": "diagnostic count and encoded bytes remain bounded for many extra files",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 110,
      "tap_local_ordinal": 83,
      "tap_indent": 0,
      "name": "candidate scripts, package metadata and git-looking files are data and never executed",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 111,
      "tap_local_ordinal": 84,
      "tap_indent": 0,
      "name": "real OS file symlink is rejected without following its target",
      "status": "NOT_RUN",
      "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS"
    },
    {
      "ordinal": 112,
      "tap_local_ordinal": 85,
      "tap_indent": 0,
      "name": "real OS dir link is rejected",
      "status": "NOT_RUN",
      "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS"
    },
    {
      "ordinal": 113,
      "tap_local_ordinal": 86,
      "tap_indent": 0,
      "name": "real OS junction link is rejected",
      "status": "NOT_RUN",
      "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS"
    },
    {
      "ordinal": 114,
      "tap_local_ordinal": 87,
      "tap_indent": 0,
      "name": "real OS hardlink to an outside object is rejected by link count",
      "status": "NOT_RUN",
      "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS"
    },
    {
      "ordinal": 115,
      "tap_local_ordinal": 88,
      "tap_indent": 0,
      "name": "real SQLite, three independent domain chains and global pagination",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 116,
      "tap_local_ordinal": 89,
      "tap_indent": 0,
      "name": "synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 117,
      "tap_local_ordinal": 90,
      "tap_indent": 0,
      "name": "agent and session SQL filters apply before LIMIT and preserve global cursor pages",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 118,
      "tap_local_ordinal": 91,
      "tap_indent": 0,
      "name": "flush covers its captured target after an empty or older shared flush",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 119,
      "tap_local_ordinal": 92,
      "tap_indent": 0,
      "name": "required fields, malformed refs, oversized envelopes and query budgets reject without fault",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 120,
      "tap_local_ordinal": 93,
      "tap_indent": 0,
      "name": "outbox high water rejects new records, then drains without unbounded queues",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 121,
      "tap_local_ordinal": 94,
      "tap_indent": 0,
      "name": "second writer and live lock recovery are blocked; real owner death is explicit",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 122,
      "tap_local_ordinal": 95,
      "tap_indent": 0,
      "name": "process crash after file fsync and before receipt reexports no duplicate",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 123,
      "tap_local_ordinal": 96,
      "tap_indent": 0,
      "name": "unacknowledged crash tail is preserved then repaired from durable outbox",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 124,
      "tap_local_ordinal": 97,
      "tap_indent": 0,
      "name": "actual export I/O failure freezes writes and preserves outbox until explicit recovery",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 125,
      "tap_local_ordinal": 98,
      "tap_indent": 0,
      "name": "acknowledged truncation is never silently discarded or rebuilt as success",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 126,
      "tap_local_ordinal": 99,
      "tap_indent": 0,
      "name": "actual artifact publication I/O failure retains bytes and freezes both record and object admission",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 127,
      "tap_local_ordinal": 100,
      "tap_indent": 0,
      "name": "database hash tampering throws, freezes writes and does not fake repair",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 128,
      "tap_local_ordinal": 101,
      "tap_indent": 0,
      "name": "32 MiB randomized artifact roundtrip streams with real backpressure and two hashes",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 129,
      "tap_local_ordinal": 102,
      "tap_indent": 0,
      "name": "cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 130,
      "tap_local_ordinal": 103,
      "tap_indent": 0,
      "name": "early artifact iterator return is not verification; full corrupted stream fails closed",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 131,
      "tap_local_ordinal": 104,
      "tap_indent": 0,
      "name": "concurrent artifact admission is bounded and rejects a third stream without queueing",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 132,
      "tap_local_ordinal": 105,
      "tap_indent": 0,
      "name": "abort races a permanently pending source.next without retaining Store writers or accepting late bytes",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 133,
      "tap_local_ordinal": 106,
      "tap_indent": 0,
      "name": "concurrent close calls share the real drain and lock-release promise",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 134,
      "tap_local_ordinal": 107,
      "tap_indent": 0,
      "name": "sealed segments are compressed, chained and verified; stored bit flip is detected",
      "status": "PASS",
      "reason": null
    },
    {
      "ordinal": 135,
      "tap_local_ordinal": 108,
      "tap_indent": 0,
      "name": "process-killed partial artifact remains retained without a complete object reference",
      "status": "PASS",
      "reason": null
    }
  ],
  "tap_sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372",
  "scope": "Real local implementations with synthetic data; OS sandbox and models NOT_RUN"
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/final-verification.json

类别：`original_runtime_evidence_or_index`；原始字节数：8175。

源文件 SHA256：

```text
04adc9bd1e896e498172c1be426d04a34411b4f9699c429b9c36cde517fe6561
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0045","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-verification.json","bytes":8175,"sha256":"04adc9bd1e896e498172c1be426d04a34411b4f9699c429b9c36cde517fe6561","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-verification.json"}} -->
```json
{
  "schema": "agentnexus/m01-m1-final-verification/1",
  "utc": "2026-11-06T17:59:57.797474+00:00",
  "status": "PASS",
  "checks": [
    {
      "id": "RUNTIME",
      "status": "PASS",
      "scope": "Actual installed binding, not a model or OS sandbox test",
      "detail": {
        "node": "v24.15.0",
        "sqlite": "3.51.3",
        "zstd": "1.5.7",
        "platform": "win32"
      }
    },
    {
      "id": "M0_AND_PROTECTED_UNCHANGED",
      "status": "PASS",
      "scope": "24 historical deliverables + 112 original rules/inputs/Kit files",
      "detail": []
    },
    {
      "id": "COMPLETE_M0_EVIDENCE_UNCHANGED",
      "status": "PASS",
      "scope": "11,784 protected M0 source/cache/input/rule files, actual file hashes",
      "detail": {
        "checked": 11784,
        "errors": []
      }
    },
    {
      "id": "CACHED_CANDIDATE_MATCH",
      "status": "PASS",
      "scope": "Resume only if the exact already-tested source candidate still matches its post-test closure certificate",
      "detail": null
    },
    {
      "id": "SOURCE_SYNTAX",
      "status": "PASS",
      "scope": "Node erasable TypeScript syntax and Python AST; static TypeScript type checking NOT_RUN",
      "detail": {
        "checked": 20
      }
    },
    {
      "id": "LOCAL_M1_TESTS",
      "status": "PASS",
      "scope": "Real native code/SQLite/Zstd/filesystem/known parser/process tests with synthetic inputs; no real model; reused exact recorded run",
      "detail": {
        "tests": 135,
        "pass": 131,
        "fail": 0,
        "cancelled": 0,
        "skipped": 4,
        "todo": 0
      }
    },
    {
      "id": "NATIVE_DEMO",
      "status": "PASS",
      "scope": "Actual local Tool/Audit/Context/Artifact + JSON checker, explicitly no model/Shell; recorded execution retained",
      "detail": {
        "exit_code": "recorded run, not rerun",
        "root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\demos\\local-CCvTqN",
        "verification": {
          "records": 23,
          "segments": 1,
          "pending": 0,
          "objects": 8,
          "incomplete": 0
        }
      }
    },
    {
      "id": "CANDIDATE_STABLE",
      "status": "PASS",
      "scope": "Exact source candidate unchanged throughout all checks",
      "detail": null
    },
    {
      "id": "CATALOG_COPY",
      "status": "PASS",
      "scope": "Runtime receives the reviewed versioned definitions; executable availability separate",
      "detail": {
        "features": 142,
        "policies": 34
      }
    },
    {
      "id": "M1_SOURCE_DEPENDENCY_CLOSURE",
      "status": "PASS",
      "scope": "Zero npm dependencies, complete actually introduced source candidate and node:* edges; external runtime redistribution BLOCKED",
      "detail": {
        "files": 24,
        "import_edges": 144,
        "unresolved": []
      }
    },
    {
      "id": "DELIVERY_LINKS",
      "status": "PASS",
      "scope": "Local references in new delivery",
      "detail": []
    },
    {
      "id": "GOVERNANCE",
      "status": "PASS",
      "scope": "Existing lite gates only; no rule edits, hooks, commits or push",
      "detail": {
        "exit_code": 0,
        "log": ".workflow-kit\\runtime\\AgentNexus-v0.4-M1\\govern-final.log"
      }
    }
  ],
  "tests": {
    "tests": 135,
    "pass": 131,
    "fail": 0,
    "cancelled": 0,
    "skipped": 4,
    "todo": 0
  },
  "versions": {
    "node": "v24.15.0",
    "sqlite": "3.51.3",
    "zstd": "1.5.7",
    "platform": "win32"
  },
  "candidate_files": [
    {
      "path": "config/agentnexus/features.json",
      "bytes": 390886,
      "sha256": "ed7b7ad4fd9d8e34bc28b9873cc397dd33932b0f27f21eb550f70951361154a7"
    },
    {
      "path": "config/agentnexus/policies.json",
      "bytes": 91143,
      "sha256": "74cb43697d45606fb2f3ad716b28a5125b5faff808de8973c3ab28c77e41c7b3"
    },
    {
      "path": "package.json",
      "bytes": 293,
      "sha256": "e23288d939a3706e522bf34a1d87802242b418749c37f1e54c5b481562ffd809"
    },
    {
      "path": "src/agentnexus/artifacts.ts",
      "bytes": 15666,
      "sha256": "f89cd95c7c373e1551d509f82596e54e203f0bb02b2934e1c2108040ef48bc49"
    },
    {
      "path": "src/agentnexus/checkers/powershell_ast.ps1",
      "bytes": 3780,
      "sha256": "90079d41e2083df61ee87456cbe81a4d1863b2f4053df0ab9e78b668e3789ae8"
    },
    {
      "path": "src/agentnexus/checkers/python_ast.py",
      "bytes": 2998,
      "sha256": "a9595eca900b49c4ec88e82599c28569b01e543ed8ecb52908ae0772b104fc6e"
    },
    {
      "path": "src/agentnexus/cli.ts",
      "bytes": 1928,
      "sha256": "458b10cdbe3236b0e5ace1439334095bc30243fafeaf071273de956d22511b15"
    },
    {
      "path": "src/agentnexus/control.ts",
      "bytes": 7027,
      "sha256": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc"
    },
    {
      "path": "src/agentnexus/diagnostics.ts",
      "bytes": 31299,
      "sha256": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
    },
    {
      "path": "src/agentnexus/features.ts",
      "bytes": 12008,
      "sha256": "d6aafeafd88f6fd5660afa6b4f29b68625d70ffc8f8138f90db657b6acacda5e"
    },
    {
      "path": "src/agentnexus/gateway.ts",
      "bytes": 18759,
      "sha256": "85ab9f4312f17783ad5a2101c6582e769378489a29f3d62e0919cd3bdb1ff5ec"
    },
    {
      "path": "src/agentnexus/host.ts",
      "bytes": 16750,
      "sha256": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c"
    },
    {
      "path": "src/agentnexus/integrity.ts",
      "bytes": 18691,
      "sha256": "172a40c429c9e8a99f8cc1fcee2ef500adb4e7d378f0f6188fbbe7f792edfe66"
    },
    {
      "path": "src/agentnexus/policy.ts",
      "bytes": 13815,
      "sha256": "98cadd7673c9d523733bb9fe1d1d62a036516aa63c9c0441a758dc39a14d18d2"
    },
    {
      "path": "src/agentnexus/records.ts",
      "bytes": 6510,
      "sha256": "393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800"
    },
    {
      "path": "src/agentnexus/storage.ts",
      "bytes": 33030,
      "sha256": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d"
    },
    {
      "path": "src/agentnexus/types.ts",
      "bytes": 6814,
      "sha256": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75"
    },
    {
      "path": "tests/agentnexus/control.test.ts",
      "bytes": 16933,
      "sha256": "c392c452fad08a00ce91c0b010f27bc99699c5b9c3e58416a08b9f8413f79441"
    },
    {
      "path": "tests/agentnexus/diagnostics.test.ts",
      "bytes": 19069,
      "sha256": "67eef7a1adfc1b2baceb62ca4cd157d8737332e8595f0d93a63bcfb853257394"
    },
    {
      "path": "tests/agentnexus/gateway.test.ts",
      "bytes": 17859,
      "sha256": "96620a3ee83c8b1c65e798ab575fe4ff2a9ccd62ecf69f090d0b70e06fa73824"
    },
    {
      "path": "tests/agentnexus/integrity.test.ts",
      "bytes": 21578,
      "sha256": "ecc6655be30a7d7690f04e5d26c61f09eaaa988ae1075b63327fe98c97c93277"
    },
    {
      "path": "tests/agentnexus/owned-storage-child.mjs",
      "bytes": 1885,
      "sha256": "7a469bfa662d98f39f06b4483eaa1f49809e490817679cce5f7f1fa366133139"
    },
    {
      "path": "tests/agentnexus/storage.test.ts",
      "bytes": 28870,
      "sha256": "d0cae519ebfce054002a51b10b292cc870f2bbe01c67706dd1fd9a203525a3da"
    },
    {
      "path": "tools/agentnexus/run-tests.mjs",
      "bytes": 667,
      "sha256": "7b1b45b072e55e4c2e079e90aa963d94584a871496945ed88b737cb42dd4c0b7"
    }
  ],
  "reused_recorded_tests": true,
  "test_run_utc": "2026-11-06T17:54:41.259308+00:00",
  "scope": "M0.1 evidence and restricted local M1 kernel only; full deployment BLOCKED",
  "blocked": [
    "unlicensed Kit reuse/distribution",
    "runtime binary redistribution",
    "OS admin authentication and arbitrary execution"
  ],
  "model_validation": "NOT_RUN",
  "static_type_check": "NOT_RUN"
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-review.json

类别：`original_runtime_evidence_or_index`；原始字节数：39563。

源文件 SHA256：

```text
d8e058bfa2504342c2fef7208d701c7d7e03f98ff2b6f42287d2b5f9238de3d1
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0046","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-review.json","bytes":39563,"sha256":"d8e058bfa2504342c2fef7208d701c7d7e03f98ff2b6f42287d2b5f9238de3d1","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-review.json"}} -->
```json
{
  "schema": "agentnexus/m1/control-readonly-review/1",
  "updated_utc": "2026-11-06T18:04:03.292442+00:00",
  "status": "PASS",
  "final_acceptance": "GRANTED_FOR_THIS_REVIEW_SCOPE_ONLY; OS_AND_WHOLE_PRODUCT_NOT_GRANTED",
  "reviewed_files": [
    "src/agentnexus/types.ts",
    "src/agentnexus/control.ts",
    "src/agentnexus/features.ts",
    "src/agentnexus/policy.ts",
    "src/agentnexus/gateway.ts",
    "src/agentnexus/host.ts"
  ],
  "supporting_reads": [
    "storage query/transaction/flush",
    "DIE feature gates",
    "control/gateway tests",
    "M0/M0.1 internal protocol and audit design"
  ],
  "product_files_modified": false,
  "findings": [
    {
      "id": "CTRL-001",
      "severity": "P2",
      "title": "INHERIT resolving OFF skipped work draining",
      "status": "RESOLVED_AND_BOUND_TO_FINAL_CANDIDATE",
      "locations": [
        {
          "path": "src/agentnexus/features.ts",
          "line": 115,
          "role": "current related implementation/fix anchor",
          "sha256": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
          "last_probed_sha256": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
          "current_sha256_at_update": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce"
        }
      ],
      "reproduction_steps": [
        "Register OPTIONAL default OFF with a stop callback; change ON and acquire a lease.",
        "Commit INHERIT. Pre-fix branch checked only literal OFF and skipped cancellation."
      ],
      "recommendation": "Drain every overlay-resolved transition to OFF; block completion while owned work remains.",
      "evidence": {
        "pre_fix": "STATIC_CONFIRMED; main fixed before first dynamic probe, not a pre-fix runtime PASS",
        "post_fix": {
          "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-mEsK5S",
          "failure": "MODULE_STILL_RUNNING",
          "resolved": {
            "id": "review.optional",
            "desired": "ON",
            "revision": 1,
            "epoch": 2,
            "health": "FAILED",
            "effective": "BLOCKED",
            "reason": "FAILED"
          },
          "active_count": 1,
          "lease_aborted": true,
          "stop_calls": 1
        }
      },
      "final_locations": [
        {
          "path": "src/agentnexus/features.ts",
          "line": 118,
          "sha256": "d6aafeafd88f6fd5660afa6b4f29b68625d70ffc8f8138f90db657b6acacda5e"
        }
      ]
    },
    {
      "id": "CTRL-002",
      "severity": "P2",
      "title": "DIE desired ON bypassed FAILED/BLOCKED health",
      "status": "RESOLVED_AND_BOUND_TO_FINAL_CANDIDATE",
      "locations": [
        {
          "path": "src/agentnexus/host.ts",
          "line": 94,
          "role": "current related implementation/fix anchor",
          "sha256": "d9566fb1eac23c0406632fe38625c7373b705ee3fff5f7a1f6791e629e75c2b6",
          "last_probed_sha256": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
          "current_sha256_at_update": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c"
        }
      ],
      "reproduction_steps": [
        "Hold a devint.runtime lease; request OFF to force MODULE_STILL_RUNNING/FAILED.",
        "Release lease without health recovery; invoke native.diagnostics JSON checker."
      ],
      "recommendation": "Gate failed/quiescing/recovering modules before recreating checkers; inspect effective eligibility.",
      "evidence": {
        "pre_fix": "STATIC_CONFIRMED; main fixed before first dynamic probe",
        "post_fix": {
          "runtime": {
            "id": "devint.runtime",
            "desired": "ON",
            "revision": 0,
            "epoch": 1,
            "health": "FAILED",
            "effective": "BLOCKED",
            "reason": "FAILED"
          },
          "diagnostic_data": {
            "checker_id": "disabled",
            "checker_version": "none",
            "config_revision": 0,
            "diagnostics": [],
            "dimensions": {
              "args": {
                "applicable": true,
                "coverage": "none",
                "reason": "MODULE_UNAVAILABLE:devint.runtime",
                "status": "BLOCKED"
              },
              "authorization": {
                "applicable": false,
                "coverage": "none",
                "reason": "OWNER_TOOL_GATEWAY",
                "status": "NOT_RUN"
              },
              "environment": {
                "applicable": true,
                "coverage": "none",
                "reason": "MODULE_UNAVAILABLE:devint.runtime",
                "status": "BLOCKED"
              },
              "safety": {
                "applicable": true,
                "coverage": "none",
                "reason": "MODULE_UNAVAILABLE:devint.runtime",
                "status": "BLOCKED"
              },
              "syntax": {
                "applicable": true,
                "coverage": "none",
                "reason": "MODULE_UNAVAILABLE:devint.runtime",
                "status": "BLOCKED"
              }
            },
            "evidence_refs": [],
            "feature_epoch": 1,
            "reason": "MODULE_UNAVAILABLE:devint.runtime",
            "request_id": "d41d3fc0-ddc3-4c6e-8808-415c1c91cf38",
            "source_sha256": "a8198524f58e72b56283ab71ebddada22840f108b46ef7165bb3fca9919c5558",
            "status": "BLOCKED",
            "timing": {
              "elapsed_ms": 0,
              "started_at": "2026-11-06T17:25:37.569Z"
            },
            "uri": "review://runtime-blocked.json",
            "version": 1
          }
        },
        "interpretation": "diagnostic data.status BLOCKED is correct; top-level Broker completion PASS is intentional and distinct"
      },
      "final_locations": [
        {
          "path": "src/agentnexus/host.ts",
          "line": 100,
          "sha256": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c"
        }
      ]
    },
    {
      "id": "CTRL-003",
      "severity": "P1",
      "title": "Wall-clock-only grant expiry could revive unused approval/permit",
      "status": "RESOLVED_AND_BOUND_TO_FINAL_CANDIDATE",
      "locations": [
        {
          "path": "src/agentnexus/control.ts",
          "line": 9,
          "role": "current related implementation/fix anchor",
          "sha256": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
          "last_probed_sha256": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
          "current_sha256_at_update": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc"
        },
        {
          "path": "src/agentnexus/policy.ts",
          "line": 131,
          "role": "current related implementation/fix anchor",
          "sha256": "efc03cd86e873e436a7e1bb195227d6c1b98de9f639dea1f87203d75cdf69a8a",
          "last_probed_sha256": "efc03cd86e873e436a7e1bb195227d6c1b98de9f639dea1f87203d75cdf69a8a",
          "current_sha256_at_update": "98cadd7673c9d523733bb9fe1d1d62a036516aa63c9c0441a758dc39a14d18d2"
        }
      ],
      "reproduction_steps": [
        "Mint a 100ms approval and wait 160ms until expiry.",
        "Roll Date.now back 10s only in the owned probe process; recheck and submit the exact intent."
      ],
      "recommendation": "Bind challenges/grants/permits to boot identity plus monotonic deadline and rollback guard; preserve consumed state.",
      "evidence": {
        "pre_fix": "STATIC_CONFIRMED; main fixed before first dynamic probe",
        "post_fix": {
          "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-Ymcfiq",
          "clock_scope": "logical Date.now override in owned probe process; not OS-clock verification",
          "initially_valid": true,
          "valid_after_actual_expiry": false,
          "valid_after_clock_rollback": false,
          "handler_executions": 0,
          "result": {
            "status": "BLOCKED",
            "reason": "POLICY_DENIED",
            "operation_id": "97b781e8-df3e-49e9-82bd-56a3a940cd7e",
            "intent_hash": "b009795675a81028deead2e85b9a88e4ca417462af41439fac86ac52102bace5",
            "data": null,
            "stdout_ref": null,
            "stderr_ref": null,
            "audit_event_id": "5d8d10b2-4910-40f5-9861-7c05e0ed4c69",
            "permit_id": null
          }
        },
        "scope": "logical clock control flow only; no OS clock changes"
      },
      "final_locations": [
        {
          "path": "src/agentnexus/control.ts",
          "line": 9,
          "sha256": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc"
        },
        {
          "path": "src/agentnexus/policy.ts",
          "line": 135,
          "sha256": "98cadd7673c9d523733bb9fe1d1d62a036516aa63c9c0441a758dc39a14d18d2"
        }
      ]
    },
    {
      "id": "CTRL-004",
      "severity": "P2",
      "title": "Closed facade retained reads and stale close removed a replacement",
      "status": "RESOLVED_AND_BOUND_TO_FINAL_CANDIDATE",
      "locations": [
        {
          "path": "src/agentnexus/host.ts",
          "line": 158,
          "role": "current related implementation/fix anchor",
          "sha256": "d9566fb1eac23c0406632fe38625c7373b705ee3fff5f7a1f6791e629e75c2b6",
          "last_probed_sha256": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
          "current_sha256_at_update": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c"
        },
        {
          "path": "src/agentnexus/host.ts",
          "line": 172,
          "role": "current related implementation/fix anchor",
          "sha256": "d9566fb1eac23c0406632fe38625c7373b705ee3fff5f7a1f6791e629e75c2b6",
          "last_probed_sha256": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
          "current_sha256_at_update": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c"
        }
      ],
      "reproduction_steps": [
        "Close facade A; rebind identical identity as B and record an echo.",
        "Call A.context/reconstructTask; old A could read B records.",
        "Call A.close again; old code deleted B and B.request failed SESSION_CLOSED."
      ],
      "recommendation": "Check current binding on every entry; make stale close idempotent and identity-bound.",
      "evidence": {
        "before": {
          "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-gV69Dv",
          "old_context_rows": 2,
          "old_audit_rows": 8,
          "old_context_session_ids": [
            "review-session",
            "review-session"
          ],
          "replacement_after_old_close": {
            "code": "SESSION_CLOSED"
          }
        },
        "after": {
          "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-35LYw5",
          "old_context_rows": 0,
          "old_audit_rows": 0,
          "context_error": "SESSION_CLOSED",
          "audit_error": "SESSION_CLOSED",
          "old_context_session_ids": [],
          "replacement_after_old_close": {
            "status": "PASS",
            "reason": "BROKER_OPERATION_COMPLETE",
            "operation_id": "b901caff-bcd2-4c4b-8252-550f8999310e",
            "intent_hash": "98bbd8c4b26febe4a0802cdb20d121d04c85b1efffc3aeb698919490921fff3d",
            "data": null,
            "stdout_ref": {
              "artifact_id": "a0adf79e-9274-4544-8aec-e7d87ce400b6",
              "sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b",
              "bytes": 4,
              "codec": "zstd",
              "stored_sha256": "db509e5e4f3f8709cee7ab288b5fd21e12d4cec20be94c1d5b4ec12835173edd",
              "stored_bytes": 17,
              "media_type": "application/octet-stream",
              "sensitivity": "NORMAL"
            },
            "stderr_ref": {
              "artifact_id": "ae105068-28bc-4820-aa06-9b1da7786572",
              "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              "bytes": 0,
              "codec": "zstd",
              "stored_sha256": "f96deff1816083fdff8bc3e46c3fe6ca46a6bb49f4d5a00627616c13237a512c",
              "stored_bytes": 13,
              "media_type": "application/octet-stream",
              "sensitivity": "NORMAL"
            },
            "audit_event_id": "befbd251-31a1-435e-89b4-2590a03a1705",
            "permit_id": "aaa4476c-6c55-43d6-9f07-ad9292760f09"
          }
        },
        "before_source_sha256": "96b2d0bad306956e41cef7942080fd912d5df36d62b7cf68e8bc092e45654f20"
      },
      "final_locations": [
        {
          "path": "src/agentnexus/host.ts",
          "line": 168,
          "sha256": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c"
        },
        {
          "path": "src/agentnexus/host.ts",
          "line": 182,
          "sha256": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c"
        }
      ]
    },
    {
      "id": "CTRL-005",
      "severity": "P2",
      "title": "Raw-context queries ignored Agent and Session boundaries",
      "status": "RESOLVED_AND_BOUND_TO_FINAL_CANDIDATE",
      "locations": [
        {
          "path": "src/agentnexus/host.ts",
          "line": 171,
          "role": "current related implementation/fix anchor",
          "sha256": "d9566fb1eac23c0406632fe38625c7373b705ee3fff5f7a1f6791e629e75c2b6",
          "last_probed_sha256": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
          "current_sha256_at_update": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c"
        },
        {
          "path": "src/agentnexus/storage.ts",
          "line": 206,
          "role": "current related implementation/fix anchor",
          "sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb",
          "last_probed_sha256": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d",
          "current_sha256_at_update": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d"
        }
      ],
      "reproduction_steps": [
        "Bind A and B with same project/task but distinct agent/session.",
        "Record via A; B.context returned two A records."
      ],
      "recommendation": "Apply parameterized project/task/agent/session filters before pagination; broader task reads need a separate explicit trusted authorization.",
      "evidence": {
        "confirmed_authorization_contract": "parent clarified raw Agent context is private by default",
        "before": {
          "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-2pjrV9",
          "other_agent_context_rows": 2,
          "returned_agent_ids": [
            "review-a",
            "review-a"
          ],
          "classification": "contract confirmation needed: task-wide sharing vs agent-private context"
        },
        "latest_pending": {
          "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-6XnAVS",
          "other_agent_context_rows": 2,
          "returned_agent_ids": [
            "review-a",
            "review-a"
          ],
          "classification": "contract confirmation needed: task-wide sharing vs agent-private context"
        },
        "storage_final_recheck": "WAITING_STORAGE_AUTHOR"
      },
      "latest_pending": null,
      "verification_after_storage_fix": {
        "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-IhqnbK",
        "other_agent_context_rows": 0,
        "returned_agent_ids": [],
        "classification": "contract confirmation needed: task-wide sharing vs agent-private context"
      },
      "verification": "Parameterized Agent/Session filters and index observed; actual cross-Agent query returned zero rows.",
      "final_locations": [
        {
          "path": "src/agentnexus/host.ts",
          "line": 181,
          "sha256": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c"
        },
        {
          "path": "src/agentnexus/storage.ts",
          "line": 209,
          "sha256": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d"
        }
      ]
    },
    {
      "id": "CTRL-006",
      "severity": "P2",
      "title": "Session close admitted a new request across its first await",
      "status": "RESOLVED_AND_BOUND_TO_FINAL_CANDIDATE",
      "locations": [
        {
          "path": "src/agentnexus/host.ts",
          "line": 176,
          "role": "current related implementation/fix anchor",
          "sha256": "d9566fb1eac23c0406632fe38625c7373b705ee3fff5f7a1f6791e629e75c2b6",
          "last_probed_sha256": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
          "current_sha256_at_update": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c"
        }
      ],
      "reproduction_steps": [
        "Call const closing=agent.close().",
        "Before awaiting closing, submit native.echo in the same tick.",
        "Intermediate code returned PASS for that newly admitted request."
      ],
      "recommendation": "Revoke eligibility before the first await; include closing in all facade guards.",
      "evidence": {
        "before": {
          "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-8LzVoO",
          "request_after_close_started": {
            "status": "PASS",
            "reason": "BROKER_OPERATION_COMPLETE",
            "operation_id": "7d8172ca-f340-4917-a725-9dc47ab29d90",
            "intent_hash": "50e3cfab561237ae7580a2553415f4e930181d7ca11b47e196d143206f036603",
            "data": {
              "synthetic": true
            },
            "stdout_ref": {
              "artifact_id": "9bc0823a-26ae-4a65-aec0-42e489deb9bc",
              "sha256": "a8198524f58e72b56283ab71ebddada22840f108b46ef7165bb3fca9919c5558",
              "bytes": 18,
              "codec": "zstd",
              "stored_sha256": "b49c1e31c5bd30a729308397156d3cd0221eab7a3975f1780eb5c55cab687a39",
              "stored_bytes": 31,
              "media_type": "application/octet-stream",
              "sensitivity": "NORMAL"
            },
            "stderr_ref": {
              "artifact_id": "a1dc7178-a96d-4e8c-b3c9-df537146e326",
              "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              "bytes": 0,
              "codec": "zstd",
              "stored_sha256": "f96deff1816083fdff8bc3e46c3fe6ca46a6bb49f4d5a00627616c13237a512c",
              "stored_bytes": 13,
              "media_type": "application/octet-stream",
              "sensitivity": "NORMAL"
            },
            "audit_event_id": "0a77a0ca-ae41-409e-a42e-bfc25fd5670b",
            "permit_id": "25e0ed39-3e13-4eb0-9bdd-58c976a15972"
          }
        },
        "after": {
          "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-Vs6rN5",
          "request_after_close_started": {
            "code": "SESSION_CLOSED"
          }
        },
        "before_source_sha256": "a452097b04a29056904e5f2a167778d149199fee890b1efc7f638eede40d7f00"
      },
      "final_locations": [
        {
          "path": "src/agentnexus/host.ts",
          "line": 186,
          "sha256": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c"
        }
      ]
    },
    {
      "id": "CTRL-007",
      "severity": "P2",
      "title": "Handler timeout subtracted wall time after start barrier",
      "status": "RESOLVED_AND_BOUND_TO_FINAL_CANDIDATE",
      "locations": [
        {
          "path": "src/agentnexus/gateway.ts",
          "line": 148,
          "role": "current related implementation/fix anchor",
          "sha256": "61827aaeef516ae7699b890a0e97ccc51c72902f750a889e22a3bcaa748d6bc7",
          "last_probed_sha256": "61827aaeef516ae7699b890a0e97ccc51c72902f750a889e22a3bcaa748d6bc7",
          "current_sha256_at_update": "85ab9f4312f17783ad5a2101c6582e769378489a29f3d62e0919cd3bdb1ff5ec"
        }
      ],
      "reproduction_steps": [
        "Register pure Promise handler with timeout_ms=20.",
        "At invocation roll Date.now back 10s in probe process and keep promise pending.",
        "After 80ms request was still pending; restoring clock and resolving returned PASS."
      ],
      "recommendation": "Use performance.now for handler deadline/remaining time; retain ownership until actual settlement independently of timeout response.",
      "evidence": {
        "before": {
          "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-gy5Dg7",
          "clock_scope": "logical Date.now override in owned probe; not OS clock verification",
          "timeout_ms": 20,
          "request_settled_after_80ms": false,
          "result": {
            "status": "PASS",
            "reason": "BROKER_OPERATION_COMPLETE",
            "operation_id": "47422234-b3b4-427f-9786-84f016707ac6",
            "intent_hash": "209aa6625f65a7c141ea332e50a6389cb3321b0671772432eb42b8d12451b823",
            "data": {
              "synthetic": true
            },
            "stdout_ref": {
              "artifact_id": "65f75a25-67c9-4c44-97c3-8a6fcdda5fe8",
              "sha256": "a8198524f58e72b56283ab71ebddada22840f108b46ef7165bb3fca9919c5558",
              "bytes": 18,
              "codec": "zstd",
              "stored_sha256": "b49c1e31c5bd30a729308397156d3cd0221eab7a3975f1780eb5c55cab687a39",
              "stored_bytes": 31,
              "media_type": "application/octet-stream",
              "sensitivity": "NORMAL"
            },
            "stderr_ref": {
              "artifact_id": "9bde0480-a701-446f-8d7f-e7b25f79eea5",
              "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
              "bytes": 0,
              "codec": "zstd",
              "stored_sha256": "f96deff1816083fdff8bc3e46c3fe6ca46a6bb49f4d5a00627616c13237a512c",
              "stored_bytes": 13,
              "media_type": "application/octet-stream",
              "sensitivity": "NORMAL"
            },
            "audit_event_id": "ffe2f120-64c6-4950-ae1f-29da6bc094ac",
            "permit_id": "5e96990a-c357-4601-ac45-329e1bc00909"
          }
        },
        "before_source_sha256": "223d908da4daec469cacc1da8fdcc88f0f2e59af9a981eaff4c1a16c4360d4db",
        "main_fix_observed": "performance.now deadline and remaining duration",
        "scope": "logical clock control flow only; not OS-clock verification",
        "post_fix": {
          "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-9A5vMo",
          "clock_scope": "logical Date.now override in owned probe; not OS clock verification",
          "timeout_ms": 20,
          "request_settled_after_80ms": true,
          "result": {
            "status": "INCONCLUSIVE",
            "reason": "TOOL_TIMEOUT",
            "operation_id": "5a3e6bfd-be4c-47fc-8bab-9532735183b8",
            "intent_hash": "209aa6625f65a7c141ea332e50a6389cb3321b0671772432eb42b8d12451b823",
            "data": null,
            "stdout_ref": null,
            "stderr_ref": null,
            "audit_event_id": "6ec9dada-cadb-4775-b4a0-0d84fa6d1565",
            "permit_id": "311bbc81-c5b5-45b1-9b07-f55852d1600d"
          }
        },
        "before_reference": "control-probes-before-timeout-fix.json.observations.handler_timeout_clock"
      },
      "final_locations": [
        {
          "path": "src/agentnexus/gateway.ts",
          "line": 153,
          "sha256": "85ab9f4312f17783ad5a2101c6582e769378489a29f3d62e0919cd3bdb1ff5ec"
        }
      ]
    },
    {
      "id": "CTRL-008",
      "severity": "P2",
      "title": "Recovery can race an unsettled timed-out stop",
      "status": "RESOLVED_AND_BOUND_TO_FINAL_CANDIDATE",
      "locations": [
        {
          "path": "src/agentnexus/features.ts",
          "line": 121,
          "sha256_observed": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce"
        },
        {
          "path": "src/agentnexus/features.ts",
          "line": 142,
          "sha256_observed": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce"
        }
      ],
      "reproduction_steps": [
        "Register an idle enabled module with stop waiting on a controlled Promise and preflight marking service ready.",
        "Commit OFF; after 1s stop race throws DRAIN_TIMEOUT, health FAILED, but original stop Promise is still pending.",
        "Call recoverModule; because #owned is empty, preflight completes and health becomes ENABLED/ON.",
        "Resolve the original stop; its late cleanup closes the recovered service while Feature resolution remains ENABLED/ON."
      ],
      "recommendation": "Track pending stop settlement per module/scope and reject or wait for recover/enable until settled; serialize recover through the mutation gate and prevent stale lifecycle work from changing a newer generation.",
      "evidence": {
        "path": "stop-recovery-probe.json",
        "observed": {
          "schema": "agentnexus/m1/stop-recovery-probe/1",
          "captured_utc": "2026-11-06T17:37:05.740Z",
          "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\stop-recovery-CxjmPi",
          "features_sha256_before": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
          "features_sha256_after": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
          "failure": "DRAIN_TIMEOUT",
          "failed": {
            "id": "review.lifecycle",
            "desired": "ON",
            "revision": 0,
            "epoch": 1,
            "health": "FAILED",
            "effective": "BLOCKED",
            "reason": "FAILED"
          },
          "recovered": {
            "id": "review.lifecycle",
            "desired": "ON",
            "revision": 0,
            "epoch": 1,
            "health": "ENABLED",
            "effective": "ON",
            "reason": "READY"
          },
          "before_late_stop": {
            "ready": true,
            "preflights": 1,
            "stopSettled": false
          },
          "after_late_stop": {
            "ready": false,
            "preflights": 1,
            "stopSettled": true,
            "resolution": {
              "id": "review.lifecycle",
              "desired": "ON",
              "revision": 0,
              "epoch": 1,
              "health": "ENABLED",
              "effective": "ON",
              "reason": "READY"
            }
          },
          "scope": "owned synthetic lifecycle only; no product writes or OS work"
        },
        "scope": "synthetic module lifecycle, no OS/process actions; no product source writes"
      },
      "verification_after_main_fix": {
        "pending": {
          "stop_failure": "DRAIN_TIMEOUT",
          "recovery_failure": "MODULE_STOP_PENDING",
          "enabling_failure": "MODULE_STOP_PENDING",
          "active_count": 1,
          "ready": true,
          "preflights": 0,
          "stopSettled": false
        },
        "recovered": {
          "resolution": {
            "id": "review.lifecycle",
            "desired": "ON",
            "revision": 0,
            "epoch": 1,
            "health": "ENABLED",
            "effective": "ON",
            "reason": "READY"
          },
          "ready": true,
          "preflights": 1,
          "stopSettled": true
        }
      },
      "final_probe_reference": "final-control-probes.json",
      "final_locations": [
        {
          "path": "src/agentnexus/features.ts",
          "line": 14,
          "sha256": "d6aafeafd88f6fd5660afa6b4f29b68625d70ffc8f8138f90db657b6acacda5e"
        },
        {
          "path": "src/agentnexus/features.ts",
          "line": 153,
          "sha256": "d6aafeafd88f6fd5660afa6b4f29b68625d70ffc8f8138f90db657b6acacda5e"
        }
      ]
    }
  ],
  "latest_probe_source_sha256": {
    "src/agentnexus/types.ts": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75",
    "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
    "src/agentnexus/features.ts": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
    "src/agentnexus/policy.ts": "efc03cd86e873e436a7e1bb195227d6c1b98de9f639dea1f87203d75cdf69a8a",
    "src/agentnexus/gateway.ts": "61827aaeef516ae7699b890a0e97ccc51c72902f750a889e22a3bcaa748d6bc7",
    "src/agentnexus/host.ts": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
    "src/agentnexus/storage.ts": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d",
    "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
  },
  "source_changed_during_latest_probe": [],
  "known_main_issues_not_duplicated": [
    "START_INTENT before invocation vs observed STARTED after invocation",
    "retain handler lease on lost audit/completion receipt until actual handler settlement"
  ],
  "reviewed_non_findings": [
    "trusted bootstrap token kept out of Agent facade; deployment explicitly BLOCKED for OS identity/sandbox",
    "arguments/identity snapshot before first await; deep-frozen execution args",
    "permit+approval consume, writer claim, operation claim and audit append in one synchronous transaction; required flush before handler invocation",
    "published output refs and RESULT/context same-transaction append; required flush before ACK",
    "no automatic retry of indeterminate side effects; consumed nonce/unique request guards",
    "diagnostic outcome is separate from successful Broker completion"
  ],
  "limits": [
    "OS peer authentication/hostile-process isolation remain BLOCKED",
    "pre-fix CTRL-001..003 dynamic runs were NOT_RUN because main fixed before first probe",
    "clock probes are local logical overrides, not OS system-clock tests",
    "Four real OS links NOT_RUN due EPERM; not OS PASS",
    "Static TypeScript type checking and real model validation remain NOT_RUN",
    "Kit copy/distribution, runtime redistribution and real OS admin/arbitrary execution remain BLOCKED"
  ],
  "evidence": {
    "command": "node .workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.ts",
    "exit_code": 0,
    "initial": "control-probes-initial.json",
    "intermediate": "control-probes-before-close-race-fix.json",
    "latest_before_timeout_fix": "control-probes-before-timeout-fix.json",
    "latest": "control-probes.json",
    "probe_source": "control-probes.ts",
    "sha256": {
      "control-probes-before-close-race-fix.json": "319b8bef22cd43925ec367b3d1dda2ff5d47b5f70a1f73761b0c59dbb2e0c176",
      "control-probes-before-timeout-fix.json": "11eaae06fde02dc5e2e6b1c3f6ecc4ba3abb04b3b88bbf6281984382369e44cc",
      "control-probes-initial.json": "b994cc67418c7a8e6f6ae405ef11d312a1c3774e81640e3ab0a1b0edaabd3812",
      "control-probes.json": "a8d703f12278186cc809a1a84cd40a8f440f133ba8ef5dc5832932e5d0817e6d",
      "stop-recovery-probe.json": "de96a9aca9d3895c68b3bb82aeb85337787129a33fa9e63480540a34356a1630",
      "final-control-probes.json": "e16ddd843b637010f105f0986242a35d66b9b42f738d4c54845882ba51cb7dac",
      "final-control-probes.ts": "3e76ca67b1f039436e75a331f2d2dd6d32f7a5c2b2942afb6364be2e00549ddd"
    },
    "probe_source_sha256": "de2381560f636824e80c135e97dd5ded48f4e1fae580238525676532da870368",
    "final_targeted_command": "node .workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/final-control-probes.ts",
    "final_targeted_exit_code": 0
  },
  "governance": "PASS (main final recorded check and prior reviewer check)",
  "source_changed_after_latest_probe": [
    "src/agentnexus/features.ts"
  ],
  "local_targeted_recheck": "PASS: earlier seven cases, final CTRL008, static expiry fences, reviewed one-line fault guard and actual final-suite candidate binding",
  "final_candidate_sha256": {
    "src/agentnexus/types.ts": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75",
    "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
    "src/agentnexus/features.ts": "d6aafeafd88f6fd5660afa6b4f29b68625d70ffc8f8138f90db657b6acacda5e",
    "src/agentnexus/policy.ts": "98cadd7673c9d523733bb9fe1d1d62a036516aa63c9c0441a758dc39a14d18d2",
    "src/agentnexus/gateway.ts": "85ab9f4312f17783ad5a2101c6582e769378489a29f3d62e0919cd3bdb1ff5ec",
    "src/agentnexus/host.ts": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
    "src/agentnexus/storage.ts": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d",
    "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
  },
  "previous_seven_case_probe_sha256": {
    "src/agentnexus/types.ts": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75",
    "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
    "src/agentnexus/features.ts": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
    "src/agentnexus/policy.ts": "efc03cd86e873e436a7e1bb195227d6c1b98de9f639dea1f87203d75cdf69a8a",
    "src/agentnexus/gateway.ts": "61827aaeef516ae7699b890a0e97ccc51c72902f750a889e22a3bcaa748d6bc7",
    "src/agentnexus/host.ts": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
    "src/agentnexus/storage.ts": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d",
    "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
  },
  "final_targeted_recheck": "PASS_CTRL008_AND_STATIC_EXPIRY_FENCES",
  "static_main_expiry_fix_review": {
    "mode_guard_call_lines": [
      122,
      147
    ],
    "mode_guard_call_count": 2,
    "first_guard_before_claim_transaction": true,
    "second_guard_after_start_intent_flush": true,
    "no_await_between_last_guard_and_handler": true,
    "assert_modes_body_uses_modeFor_and_epoch": true,
    "assert_modes_body_does_not_call_PDP": true,
    "consumed_permit_rechecked_before_handler": true,
    "consumed_approval_rechecked_before_handler": true,
    "scope": "static control-flow inspection only; root owns delayed-flush execution regressions"
  },
  "root_final_suite": {
    "status": "PASS",
    "final_verification": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-verification.json",
    "final_verification_utc": "2026-11-06T17:59:57.797474+00:00",
    "final_verification_sha256": "04adc9bd1e896e498172c1be426d04a34411b4f9699c429b9c36cde517fe6561",
    "test_results": ".workflow-kit/runtime/AgentNexus-v0.4-M1/test-results.json",
    "test_run_utc": "2026-11-06T17:54:41.259308+00:00",
    "test_results_sha256": "e72ea36f1fbf031c1c750f422bc1ecceed4cc324fc738163bc7a04fe437fb524",
    "tap": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
    "tap_sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372",
    "actual_counts": {
      "tests": 135,
      "pass": 131,
      "fail": 0,
      "cancelled": 0,
      "skipped": 4,
      "todo": 0
    },
    "checks": {
      "count": 12,
      "all_pass": true
    },
    "recorded_tests_reused": true,
    "cached_candidate_match": "PASS",
    "not_run": [
      {
        "ordinal": 111,
        "tap_local_ordinal": 84,
        "tap_indent": 0,
        "name": "real OS file symlink is rejected without following its target",
        "status": "NOT_RUN",
        "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS"
      },
      {
        "ordinal": 112,
        "tap_local_ordinal": 85,
        "tap_indent": 0,
        "name": "real OS dir link is rejected",
        "status": "NOT_RUN",
        "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS"
      },
      {
        "ordinal": 113,
        "tap_local_ordinal": 86,
        "tap_indent": 0,
        "name": "real OS junction link is rejected",
        "status": "NOT_RUN",
        "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS"
      },
      {
        "ordinal": 114,
        "tap_local_ordinal": 87,
        "tap_indent": 0,
        "name": "real OS hardlink to an outside object is rejected by link count",
        "status": "NOT_RUN",
        "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS"
      }
    ],
    "reviewer_reran_full_suite": false,
    "note": "The 17:54 real suite is reused unchanged; 17:59 completion resumes governance/manifest after the first governance timeout. No new full-suite run is claimed."
  },
  "scope": "Independent read-only review of eight remediations and inspected types/control/features/policy/gateway/host code, supporting storage/DIE paths and controlled local probes. Does not approve OS authentication/sandbox or the entire product.",
  "final_candidate_binding": {
    "actual_candidate_file_count": 24,
    "snapshot_manifest": ".workflow-kit/tasks/AgentNexus-v0.4-M0.1/reports/source_snapshot_manifest.json",
    "snapshot_manifest_sha256": "cebfcaf56d609804276d7109ce84a1db2430d85b45aaa568f2bf41a4680e2403",
    "snapshot_matches_verification": true,
    "all_24_current_candidate_bytes_match": true,
    "current_reviewed_8_files": {
      "src/agentnexus/types.ts": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75",
      "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
      "src/agentnexus/features.ts": "d6aafeafd88f6fd5660afa6b4f29b68625d70ffc8f8138f90db657b6acacda5e",
      "src/agentnexus/policy.ts": "98cadd7673c9d523733bb9fe1d1d62a036516aa63c9c0441a758dc39a14d18d2",
      "src/agentnexus/gateway.ts": "85ab9f4312f17783ad5a2101c6582e769378489a29f3d62e0919cd3bdb1ff5ec",
      "src/agentnexus/host.ts": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
      "src/agentnexus/storage.ts": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d",
      "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
    },
    "independent_probe_byte_identical_files": 7,
    "post_probe_delta_review": "PASS_STATIC_SINGLE_FAIL_CLOSED_GUARD; included in the real final suite",
    "post_probe_delta": {
      "path": "src/agentnexus/features.ts",
      "before_sha256": "ca05754e624100b2dd863224efed67edc9cf0f245c6f63ef0069c544a8331ed6",
      "final_sha256": "d6aafeafd88f6fd5660afa6b4f29b68625d70ffc8f8138f90db657b6acacda5e",
      "old_source_archive": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/m1-source-final.zip",
      "added_lines": [
        "    if (this.#store.faulted) return { ...base, effective: 'BLOCKED', reason: 'CORE_STORAGE_UNAVAILABLE', health: 'FAILED' };"
      ],
      "removed_lines": []
    },
    "source_archive": {
      "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/m1-source-final.zip",
      "sha256": "191c92befd644afd142480b1c1b600f95a242437e02ce7d1fec0d20f73b05a54",
      "bytes": 118106
    },
    "source_archive_hash_verified": true
  },
  "writes_complete": true
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.json

类别：`original_runtime_evidence_or_index`；原始字节数：29484。

源文件 SHA256：

```text
49d658b1b43597214f460a52fea42c31afd9896d7180271b5f0a2dfe871da797
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0047","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.json","bytes":29484,"sha256":"49d658b1b43597214f460a52fea42c31afd9896d7180271b5f0a2dfe871da797","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.json"}} -->
```json
{
  "schema": "agentnexus/storage-integrity-review/0.1",
  "status": "CHANGES_REQUIRED",
  "observed_at": "2026-11-06T17:23:29.557Z",
  "reviewer": "diagnostics_m01 independent of storage/integrity authors",
  "node": "v24.15.0",
  "platform": "win32",
  "run_root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\storage-integrity-probe-hu8ard",
  "product_and_test_files_read_only": true,
  "source_snapshot": [
    {
      "file": "src/agentnexus/storage.ts",
      "bytes": 31836,
      "sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
    },
    {
      "file": "src/agentnexus/artifacts.ts",
      "bytes": 12687,
      "sha256": "4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427"
    },
    {
      "file": "src/agentnexus/records.ts",
      "bytes": 6510,
      "sha256": "393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800"
    },
    {
      "file": "src/agentnexus/integrity.ts",
      "bytes": 18691,
      "sha256": "172a40c429c9e8a99f8cc1fcee2ef500adb4e7d378f0f6188fbbe7f792edfe66"
    },
    {
      "file": "tests/agentnexus/storage.test.ts",
      "bytes": 21732,
      "sha256": "e0f269cd0b73b5d70f5e5d91e8e57c9de905a182e81aaf31db6e7c736e95f923"
    },
    {
      "file": "tests/agentnexus/integrity.test.ts",
      "bytes": 21578,
      "sha256": "ecc6655be30a7d7690f04e5d26c61f09eaaa988ae1075b63327fe98c97c93277"
    },
    {
      "file": "tests/agentnexus/owned-storage-child.mjs",
      "bytes": 1885,
      "sha256": "7a469bfa662d98f39f06b4483eaa1f49809e490817679cce5f7f1fa366133139"
    }
  ],
  "source_changed_during_probe": [],
  "probes": [
    {
      "id": "FLUSH_TARGET_WINDOW",
      "root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\storage-integrity-probe-hu8ard\\flush-target",
      "target_seq": 1,
      "exported_after_both_flushes": 0,
      "pending_after_both_flushes": 1,
      "physical_raw_segments_after_both_flushes": [],
      "bug_reproduced": true,
      "pending_after_third_flush": 0
    },
    {
      "id": "STALLED_SOURCE_ABORT",
      "root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\storage-integrity-probe-hu8ard\\blocked-source-abort",
      "put_after_abort_150ms": "PENDING",
      "active_puts_after_abort": 1,
      "close_after_additional_150ms": "PENDING",
      "bug_reproduced": true,
      "put_after_source_release": "REJECTED",
      "error_after_source_release": "ABORT_ERR",
      "close_after_source_release": "FULFILLED",
      "active_puts_final": 0
    },
    {
      "id": "CONCURRENT_CLOSE",
      "root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\storage-integrity-probe-hu8ard\\concurrent-close",
      "second_close_returned": true,
      "first_close_at_second_return": "PENDING",
      "active_puts_at_second_return": 1,
      "writer_lock_at_second_return": true,
      "bug_reproduced": true,
      "writer_lock_after_first_close": false
    },
    {
      "id": "ACK_CORRUPTION_REJECTED",
      "root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\storage-integrity-probe-hu8ard\\ack-corruption",
      "normal": {
        "records": 2,
        "segments": 1,
        "pending": 0,
        "objects": 1,
        "incomplete": 0
      },
      "verify_error": "ACKNOWLEDGED_TAIL_CORRUPT",
      "recover_error": "ACKNOWLEDGED_TAIL_CORRUPT",
      "faulted": true,
      "raw_size_after_attempts": 2156,
      "expected_corrupt_size": 2156,
      "passed": true
    },
    {
      "id": "ARTIFACT_REFS_AND_SECRET",
      "root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\storage-integrity-probe-hu8ard\\refs-secret",
      "identical_raw_hash": true,
      "different_ids": true,
      "media_types": [
        "text/plain",
        "application/json"
      ],
      "forged_metadata_error": "ARTIFACT_REF_MISMATCH",
      "explicit_secret_error": "SECRET_UNSUPPORTED",
      "healthy_after_request_errors": true,
      "roundtrip": "same bytes",
      "content_dedup": "NOT_IMPLEMENTED; UUID object identity, exact full-Ref manifest match",
      "passed": true
    },
    {
      "id": "INTEGRITY_SCOPE",
      "root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\storage-integrity-probe-hu8ard\\integrity-controlled",
      "controlled": {
        "status": "PASS",
        "reason": "CONTROLLED_STATIC_CONTENT_MATCH",
        "filesChecked": 2,
        "bytesChecked": 29,
        "manifest_sha256": "3205ae8021f3e476310c4b2690128f020685aa6689ca728750a08b62529a73cc",
        "details": [],
        "detailCount": 0,
        "detailsTruncated": false,
        "checks": {
          "schema": true,
          "canonical": true,
          "portablePaths": true,
          "bidirectional": true,
          "fileContents": true,
          "secondInventory": true,
          "sourceMode": "controlled_static",
          "assurance": "CONTROLLED_STATIC_HOST_PRECONDITION_ONLY",
          "hostPrecondition": "trusted Host selects mode; controlled_static requires exclusive local staging, trusted ancestors, no hostile writer/reparse/ADS",
          "allWindowsReparseTags": "NOT_VERIFIED_BY_NODE",
          "alternateDataStreams": "NOT_ENUMERATED_BY_NODE",
          "adversarialTOCTOU": "NOT_CLOSED",
          "deadlineEnforcement": "COOPERATIVE_BETWEEN_FS_OPERATIONS",
          "runtimeOrLicenseAdmission": "NOT_EVALUATED",
          "maxOpenFileHandles": 1,
          "maxFiles": 256,
          "maxTotalBytes": 16777216
        }
      },
      "mutable": {
        "status": "INCONCLUSIVE",
        "reason": "TOCTOU_NOT_CLOSED",
        "filesChecked": 2,
        "bytesChecked": 29,
        "manifest_sha256": "3205ae8021f3e476310c4b2690128f020685aa6689ca728750a08b62529a73cc",
        "details": [],
        "detailCount": 0,
        "detailsTruncated": false,
        "checks": {
          "schema": true,
          "canonical": true,
          "portablePaths": true,
          "bidirectional": true,
          "fileContents": true,
          "secondInventory": true,
          "sourceMode": "mutable",
          "assurance": "NO_OS_ADMISSION",
          "hostPrecondition": "trusted Host selects mode; controlled_static requires exclusive local staging, trusted ancestors, no hostile writer/reparse/ADS",
          "allWindowsReparseTags": "NOT_VERIFIED_BY_NODE",
          "alternateDataStreams": "NOT_ENUMERATED_BY_NODE",
          "adversarialTOCTOU": "NOT_CLOSED",
          "deadlineEnforcement": "COOPERATIVE_BETWEEN_FS_OPERATIONS",
          "runtimeOrLicenseAdmission": "NOT_EVALUATED",
          "maxOpenFileHandles": 1,
          "maxFiles": 256,
          "maxTotalBytes": 16777216
        }
      },
      "unlisted": {
        "status": "FAIL",
        "reason": "INVENTORY_MISMATCH",
        "filesChecked": 0,
        "bytesChecked": 0,
        "manifest_sha256": "3205ae8021f3e476310c4b2690128f020685aa6689ca728750a08b62529a73cc",
        "details": [
          {
            "code": "UNLISTED_FILE",
            "path": "extra.txt"
          }
        ],
        "detailCount": 1,
        "detailsTruncated": false,
        "checks": {
          "schema": true,
          "canonical": true,
          "portablePaths": true,
          "bidirectional": false,
          "fileContents": false,
          "secondInventory": false,
          "sourceMode": "controlled_static",
          "assurance": "NO_OS_ADMISSION",
          "hostPrecondition": "trusted Host selects mode; controlled_static requires exclusive local staging, trusted ancestors, no hostile writer/reparse/ADS",
          "allWindowsReparseTags": "NOT_VERIFIED_BY_NODE",
          "alternateDataStreams": "NOT_ENUMERATED_BY_NODE",
          "adversarialTOCTOU": "NOT_CLOSED",
          "deadlineEnforcement": "COOPERATIVE_BETWEEN_FS_OPERATIONS",
          "runtimeOrLicenseAdmission": "NOT_EVALUATED",
          "maxOpenFileHandles": 1,
          "maxFiles": 256,
          "maxTotalBytes": 16777216
        }
      },
      "passed": true,
      "os_link_ads_reparse_tests": "NOT_RUN in this independent review"
    }
  ],
  "completed_at": "2026-11-06T17:26:54.911447+00:00",
  "summary": {
    "confirmed_findings": 3,
    "priority_counts": {
      "P1": 1,
      "P2": 2
    },
    "independent_synthetic_probes": 6,
    "author_suite_status": "SOURCE_REVIEWED_NOT_INDEPENDENTLY_RERUN",
    "product_or_test_edits": false,
    "scope": "Library behavior and controlled synthetic filesystem fixtures; no model, credentials, scientific workload, installation, OS security change or broad OS admission."
  },
  "findings": [
    {
      "id": "STOR-REV-01",
      "priority": "P1",
      "title": "flush can join an already drained promise without covering the newly appended intent",
      "locations": [
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\storage.ts",
          "repository_path": "src/agentnexus/storage.ts",
          "start_line": 224,
          "end_line": 228,
          "source_sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\storage.ts",
          "repository_path": "src/agentnexus/storage.ts",
          "start_line": 230,
          "end_line": 248,
          "source_sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
        }
      ],
      "confidence": "REPRODUCED_WITH_PUBLIC_API",
      "impact": "A caller can await its post-append flush successfully while that caller's seq remains in anx_outbox and no raw export exists. Gateway uses this promise as the pre-execution intent barrier. The record is still durable in SQLite; this probe establishes premature export-barrier acknowledgement, not demonstrated loss of committed database facts.",
      "reproduction": {
        "probe_id": "FLUSH_TARGET_WINDOW",
        "fixture_precondition": "Fresh KernelStore with an empty durable outbox.",
        "code": "const first = store.flush();\nconst record = store.audit(event);\nconst second = store.flush();\nawait Promise.all([first, second]);\n// Inspect anx_exports, anx_outbox and the segments directory.",
        "observed": {
          "target_seq": 1,
          "exported_seq": 0,
          "pending": 1,
          "raw_segments": [],
          "pending_after_third_flush": 0
        },
        "expected": "Each flush captures an entry target and resolves only when that target seq has an acknowledged, synced export."
      },
      "recommendation": "Capture target=max(seq) at flush entry. After joining any existing flush, re-check lastOnDisk >= target; start/wait another export pass if needed. Prefer draining to an explicit target rather than requiring a globally empty outbox. Preserve fault propagation and do not clear or overwrite a newer in-flight promise.",
      "test_gap": {
        "location": {
          "path": "I:\\AI_AgentNexus\\tests\\agentnexus\\storage.test.ts",
          "repository_path": "tests/agentnexus/storage.test.ts",
          "start_line": 109,
          "end_line": 121,
          "source_sha256": "e0f269cd0b73b5d70f5e5d91e8e57c9de905a182e81aaf31db6e7c736e95f923"
        },
        "description": "Existing outbox budget test flushes sequentially; it does not append between an empty/draining flush and its promise-finally cleanup. Add the deterministic public-API overlap above plus active-writer overlap."
      }
    },
    {
      "id": "STOR-REV-02",
      "priority": "P2",
      "title": "Artifact cancellation and store close wait indefinitely for a stalled async producer",
      "locations": [
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\artifacts.ts",
          "repository_path": "src/agentnexus/artifacts.ts",
          "start_line": 82,
          "end_line": 91,
          "source_sha256": "4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\artifacts.ts",
          "repository_path": "src/agentnexus/artifacts.ts",
          "start_line": 101,
          "end_line": 104,
          "source_sha256": "4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\artifacts.ts",
          "repository_path": "src/agentnexus/artifacts.ts",
          "start_line": 206,
          "end_line": 207,
          "source_sha256": "4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\storage.ts",
          "repository_path": "src/agentnexus/storage.ts",
          "start_line": 436,
          "end_line": 444,
          "source_sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
        }
      ],
      "confidence": "REPRODUCED_WITH_GATED_ASYNC_GENERATOR",
      "impact": "After a source yields one chunk and then awaits an unresolved promise, AbortSignal does not settle put; the active slot remains occupied and KernelStore.close also waits for that put. Two such producers can consume both artifact slots. The existing cancellation test only aborts between cooperative yields. This is a liveness and shutdown gap; incomplete bytes remain retained.",
      "reproduction": {
        "probe_id": "STALLED_SOURCE_ABORT",
        "code": "async function* source() {\n  yield Buffer.from(\"first\");\n  entered(); await gate;\n  yield Buffer.from(\"second\");\n}\nconst put = store.artifacts.put(source(), {signal: controller.signal});\nawait sourceEntered; controller.abort();\n// Observe before resolving gate; then release it for safe fixture cleanup.",
        "observed": {
          "put_after_abort_150ms": "PENDING",
          "active_puts_after_abort": 1,
          "close_after_additional_150ms": "PENDING",
          "bug_reproduced": true,
          "put_after_source_release": "REJECTED",
          "error_after_source_release": "ABORT_ERR",
          "close_after_source_release": "FULFILLED",
          "active_puts_final": 0
        },
        "expected": "Cancellation/close has a bounded, truthful outcome even when source.next is not cooperative; unresolved producer ownership cannot be presented as drained."
      },
      "recommendation": "Define a cancellable producer contract and propagate the signal to producer ownership, or isolate producer execution behind an owner that can be terminated. Bound close/drain waiting and reject with an explicit quiescing/termination-unconfirmed outcome if the producer has not settled. Keep the active producer/incomplete state and any claim fenced; do not fix this by racing and removing ownership while a live producer remains.",
      "test_gap": {
        "locations": [
          {
            "path": "I:\\AI_AgentNexus\\tests\\agentnexus\\storage.test.ts",
            "repository_path": "tests/agentnexus/storage.test.ts",
            "start_line": 228,
            "end_line": 240,
            "source_sha256": "e0f269cd0b73b5d70f5e5d91e8e57c9de905a182e81aaf31db6e7c736e95f923"
          },
          {
            "path": "I:\\AI_AgentNexus\\tests\\agentnexus\\storage.test.ts",
            "repository_path": "tests/agentnexus/storage.test.ts",
            "start_line": 254,
            "end_line": 263,
            "source_sha256": "e0f269cd0b73b5d70f5e5d91e8e57c9de905a182e81aaf31db6e7c736e95f923"
          }
        ],
        "description": "Add a producer blocked inside next(), abort while blocked, and verify bounded cancellation/close behavior and truthful active ownership; current tests either abort at a yield boundary or explicitly release the source before close."
      }
    },
    {
      "id": "STOR-REV-03",
      "priority": "P2",
      "title": "A concurrent second close resolves before the first close has drained and released its writer lock",
      "locations": [
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\storage.ts",
          "repository_path": "src/agentnexus/storage.ts",
          "start_line": 436,
          "end_line": 450,
          "source_sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
        }
      ],
      "confidence": "REPRODUCED_WITH_PUBLIC_API",
      "impact": "Once closing=true, another close returns immediately. A shutdown caller can observe a fulfilled close while an artifact stream remains active, the first close is pending and writer.lock still exists. Module shutdown or repeat close callers must await the same completion/failure outcome.",
      "reproduction": {
        "probe_id": "CONCURRENT_CLOSE",
        "code": "const put = store.artifacts.put(gatedSource());\nawait sourceEntered;\nconst first = store.close();\nawait store.close();\n// At this point the first close is pending and writer.lock still exists.\nreleaseSource(); await put; await first;",
        "observed": {
          "second_close_returned": true,
          "first_close_at_second_return": "PENDING",
          "active_puts_at_second_return": 1,
          "writer_lock_at_second_return": true,
          "bug_reproduced": true,
          "writer_lock_after_first_close": false
        },
        "expected": "Every close caller awaits the actual close attempt, including its error. A closing flag alone is not a completed shutdown."
      },
      "recommendation": "Cache a closePromise before beginning drain/cleanup and return it for every concurrent/repeated close. Preserve rejection when shutdown cannot be confirmed; do not turn a failed/in-progress close into a resolved promise solely because closing/closed was set.",
      "test_gap": {
        "location": {
          "path": "I:\\AI_AgentNexus\\tests\\agentnexus\\storage.test.ts",
          "repository_path": "tests/agentnexus/storage.test.ts",
          "start_line": 254,
          "end_line": 263,
          "source_sha256": "e0f269cd0b73b5d70f5e5d91e8e57c9de905a182e81aaf31db6e7c736e95f923"
        },
        "description": "The active-stream test releases both streams before its final close. Add simultaneous close calls while a source remains gated, and assert neither resolves before actual drain and lock release."
      }
    }
  ],
  "confirmed_guarantees": [
    {
      "id": "ACK-DAMAGE",
      "basis": "INDEPENDENT_PROBE_AND_SOURCE",
      "probe_id": "ACK_CORRUPTION_REJECTED",
      "result": "Observed ACKNOWLEDGED_TAIL_CORRUPT on truncated acknowledged raw export; verification/recovery faulted and preserved the corrupt byte count instead of silently rebuilding as success.",
      "locations": [
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\storage.ts",
          "repository_path": "src/agentnexus/storage.ts",
          "start_line": 273,
          "end_line": 299,
          "source_sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\storage.ts",
          "repository_path": "src/agentnexus/storage.ts",
          "start_line": 341,
          "end_line": 345,
          "source_sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
        }
      ]
    },
    {
      "id": "CRASH-WINDOW-DESIGN",
      "basis": "SOURCE_AND_AUTHOR_TEST_REVIEW_ONLY",
      "result": "Record+outbox are written in one SQLite transaction; export file sync precedes receipt commit. Complete file-before-receipt lines are synced and acknowledged during recovery. The author has process-kill tests for that window; this independent review did not rerun those test files or hardware power loss.",
      "locations": [
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\storage.ts",
          "repository_path": "src/agentnexus/storage.ts",
          "start_line": 174,
          "end_line": 188,
          "source_sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\storage.ts",
          "repository_path": "src/agentnexus/storage.ts",
          "start_line": 244,
          "end_line": 256,
          "source_sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\storage.ts",
          "repository_path": "src/agentnexus/storage.ts",
          "start_line": 388,
          "end_line": 406,
          "source_sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
        },
        {
          "path": "I:\\AI_AgentNexus\\tests\\agentnexus\\storage.test.ts",
          "repository_path": "tests/agentnexus/storage.test.ts",
          "start_line": 135,
          "end_line": 158,
          "source_sha256": "e0f269cd0b73b5d70f5e5d91e8e57c9de905a182e81aaf31db6e7c736e95f923"
        }
      ]
    },
    {
      "id": "REF-METADATA",
      "basis": "INDEPENDENT_PROBE_AND_SOURCE",
      "probe_id": "ARTIFACT_REFS_AND_SECRET",
      "result": "A changed media_type on an otherwise genuine Ref was rejected as ARTIFACT_REF_MISMATCH without faulting the store. Exact full-Ref canonical equality is checked before referencing a published object. Identical content is currently stored under distinct UUIDs; content-based deduplication is not implemented and must not be reported as a tested optimization.",
      "locations": [
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\artifacts.ts",
          "repository_path": "src/agentnexus/artifacts.ts",
          "start_line": 76,
          "end_line": 79,
          "source_sha256": "4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\artifacts.ts",
          "repository_path": "src/agentnexus/artifacts.ts",
          "start_line": 124,
          "end_line": 137,
          "source_sha256": "4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\records.ts",
          "repository_path": "src/agentnexus/records.ts",
          "start_line": 26,
          "end_line": 36,
          "source_sha256": "393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800"
        }
      ]
    },
    {
      "id": "SECRET-CLASSIFICATION",
      "basis": "INDEPENDENT_PROBE_AND_SOURCE",
      "probe_id": "ARTIFACT_REFS_AND_SECRET",
      "result": "An explicitly classified sensitivity=SECRET input is rejected as SECRET_UNSUPPORTED. No claim of encryption, credential scanning or perfect detection of unclassified secret bytes is established.",
      "locations": [
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\artifacts.ts",
          "repository_path": "src/agentnexus/artifacts.ts",
          "start_line": 54,
          "end_line": 62,
          "source_sha256": "4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\records.ts",
          "repository_path": "src/agentnexus/records.ts",
          "start_line": 26,
          "end_line": 35,
          "source_sha256": "393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800"
        }
      ]
    },
    {
      "id": "RESOURCE-SCOPE",
      "basis": "SOURCE_AND_AUTHOR_TEST_REVIEW_ONLY",
      "result": "Artifact put admits at most two streams; input chunks, per-object bytes and stored bytes have checks. Raw/stored streams are hashed and complete reads validate both hashes. Event frames, outbox bytes and query pages are bounded. These checks do not establish an OS RSS ceiling, a producer deadline, or a hardware durability guarantee.",
      "locations": [
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\artifacts.ts",
          "repository_path": "src/agentnexus/artifacts.ts",
          "start_line": 54,
          "end_line": 65,
          "source_sha256": "4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\artifacts.ts",
          "repository_path": "src/agentnexus/artifacts.ts",
          "start_line": 82,
          "end_line": 104,
          "source_sha256": "4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\artifacts.ts",
          "repository_path": "src/agentnexus/artifacts.ts",
          "start_line": 141,
          "end_line": 174,
          "source_sha256": "4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\storage.ts",
          "repository_path": "src/agentnexus/storage.ts",
          "start_line": 178,
          "end_line": 188,
          "source_sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\storage.ts",
          "repository_path": "src/agentnexus/storage.ts",
          "start_line": 206,
          "end_line": 216,
          "source_sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
        }
      ]
    },
    {
      "id": "PACKAGE-INTEGRITY-SCOPE",
      "basis": "INDEPENDENT_PROBE_AND_SOURCE",
      "probe_id": "INTEGRITY_SCOPE",
      "result": "Controlled static matching bytes returned PASS with the stated Host precondition, mutable matching bytes returned INCONCLUSIVE/TOCTOU_NOT_CLOSED, and an extra unlisted file returned FAIL. Full relative paths, canonical encoding, count/byte caps, no source execution and two metadata inventories are present.",
      "locations": [
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\integrity.ts",
          "repository_path": "src/agentnexus/integrity.ts",
          "start_line": 1,
          "end_line": 27,
          "source_sha256": "172a40c429c9e8a99f8cc1fcee2ef500adb4e7d378f0f6188fbbe7f792edfe66"
        },
        {
          "path": "I:\\AI_AgentNexus\\src\\agentnexus\\integrity.ts",
          "repository_path": "src/agentnexus/integrity.ts",
          "start_line": 293,
          "end_line": 335,
          "source_sha256": "172a40c429c9e8a99f8cc1fcee2ef500adb4e7d378f0f6188fbbe7f792edfe66"
        }
      ]
    }
  ],
  "scope_limits": {
    "windows_directory_durability": {
      "status": "NOT_RUN_FOR_HARDWARE_POWER_LOSS",
      "source": {
        "path": "I:\\AI_AgentNexus\\src\\agentnexus\\artifacts.ts",
        "repository_path": "src/agentnexus/artifacts.ts",
        "start_line": 23,
        "end_line": 29,
        "source_sha256": "4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427"
      },
      "detail": "syncDirectory returns false on win32; source and author report explicitly disclose this. File fsync and process recovery cannot be expanded into a hard-power-loss admission."
    },
    "integrity_source_mode": {
      "status": "HOST_PRECONDITION_ONLY",
      "detail": "controlled_static is selected by a trusted Host and does not authenticate that the source is immutable. Root ancestors, hostile writer absence, all reparse tags and ADS absence are external preconditions."
    },
    "mutable_reparse_ads_toctou": {
      "status": "NO_OS_ADMISSION",
      "detail": "Independent review did not create link/ADS/reparse fixtures or prove adversarial race closure. The implementation explicitly reports allWindowsReparseTags=NOT_VERIFIED_BY_NODE, alternateDataStreams=NOT_ENUMERATED_BY_NODE and adversarialTOCTOU=NOT_CLOSED; cooperative deadline checks occur between filesystem operations."
    },
    "storage_os_path_boundary": {
      "status": "NOT_AN_OS_SANDBOX",
      "detail": "ensureDirectory checks the selected directory, not all hostile ancestor/reparse/handle races. Store/DatabaseSync remain trusted library objects; private local Host storage and deployment admission are required."
    },
    "author_report_handling": {
      "status": "NOT_AUTOMATICALLY_ACCEPTED",
      "detail": "Read author tests and storage verification summary, but did not run test files that overwrite author-owned verification artifacts. Only the six listed independent probes are claimed executed here."
    },
    "not_run": [
      "hardware power interruption",
      "long soak",
      "OS authentication or sandbox escape",
      "Ubuntu",
      "Provider credentials/Key access",
      "real model execution",
      "scientific workloads",
      "complete distribution license closure",
      "full upstream/native decoder resource proof"
    ]
  },
  "source_changed_after_probe": [],
  "followup": "Product fixes and independent rerun belong to the main agent/module owner. Findings above bind the recorded reviewed SHA256; a later change does not retroactively erase this evidence."
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/demo.json

类别：`original_runtime_evidence_or_index`；原始字节数：4800。

源文件 SHA256：

```text
4383842347119246960587b81966310a786ff8945a5bacfd209dbe6eadcce677
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0048","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/demo.json","bytes":4800,"sha256":"4383842347119246960587b81966310a786ff8945a5bacfd209dbe6eadcce677","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/demo.json"}} -->
```json
{
  "scope": "Real local broker/SQLite/artifact/JSON checks with synthetic inputs; no model or shell execution",
  "root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\demos\\local-CCvTqN",
  "deployment": {
    "status": "BLOCKED",
    "reason": "OS_ADMIN_AUTH_AND_SANDBOX_NOT_VERIFIED",
    "api": "LOCAL_TRUSTED_LIBRARY_ONLY",
    "no_network_listener": true
  },
  "echo": {
    "status": "PASS",
    "reason": "BROKER_OPERATION_COMPLETE",
    "operation_id": "ab3b49e7-855a-4475-879d-5a6d0dee29df",
    "intent_hash": "1638baae27db7886a55584ccebd2908a005a3c8b6f34e3bd221c75fcbeaa45b4",
    "data": {
      "message": "AgentNexus native M1",
      "real_model": false
    },
    "stdout_ref": {
      "artifact_id": "a4c93857-dfea-45b0-9b4a-eb560c3d2145",
      "sha256": "57c204557b25b00f6c119da95e10e9ca948ac3be3faeacd4cf612e9fc2c8dc03",
      "bytes": 53,
      "codec": "zstd",
      "stored_sha256": "2afe67267df13ff6b0da68a571c047b6b5e9f4b8babc70664f0536ae1d6ebcb7",
      "stored_bytes": 66,
      "media_type": "application/octet-stream",
      "sensitivity": "NORMAL"
    },
    "stderr_ref": {
      "artifact_id": "314313ce-17c4-4fff-b899-8ae332f479f3",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "bytes": 0,
      "codec": "zstd",
      "stored_sha256": "f96deff1816083fdff8bc3e46c3fe6ca46a6bb49f4d5a00627616c13237a512c",
      "stored_bytes": 13,
      "media_type": "application/octet-stream",
      "sensitivity": "NORMAL"
    },
    "audit_event_id": "b47cc574-2173-47fe-ade3-844e5f724d4e",
    "permit_id": "96154381-ec14-48b4-ab78-381b5283003b"
  },
  "diagnostics": {
    "status": "PASS",
    "reason": "BROKER_OPERATION_COMPLETE",
    "operation_id": "a4c828cb-9546-4b61-a244-b229de0d9ebb",
    "intent_hash": "2d39e063d0e8a51d45e4893103cb6193c20aac2019f094adaed288b67a127ded",
    "data": {
      "checker_id": "json-parse",
      "checker_version": "Node-24.15.0",
      "config_revision": 0,
      "diagnostics": [
        {
          "code": "JSON_SYNTAX_ERROR",
          "message": "Invalid JSON syntax.",
          "range": null,
          "severity": "error"
        }
      ],
      "dimensions": {
        "args": {
          "applicable": false,
          "coverage": "none",
          "reason": "NOT_APPLICABLE",
          "status": "NOT_RUN"
        },
        "authorization": {
          "applicable": true,
          "coverage": "diagnostic service cannot issue permits",
          "reason": "OWNER_TOOL_GATEWAY",
          "status": "NOT_RUN"
        },
        "environment": {
          "applicable": true,
          "coverage": "JSON.parse in the reported Node runtime; OS hard isolation NOT_RUN",
          "reason": "BUILTIN_PARSER",
          "status": "PASS"
        },
        "safety": {
          "applicable": true,
          "coverage": "no OS isolation, resource authorization or target execution established",
          "reason": "STATIC_ANALYSIS_NOT_SAFETY_PROOF",
          "status": "INCONCLUSIVE"
        },
        "syntax": {
          "applicable": true,
          "coverage": "json_parse_only",
          "reason": "SYNTAX_ERROR",
          "status": "FAIL"
        }
      },
      "evidence_refs": [],
      "feature_epoch": 0,
      "reason": "SYNTAX_ERROR",
      "request_id": "5f93e6c7-195f-44e5-b228-ebdbe8ed7c32",
      "source_sha256": "0f80613450ca8072e84f700960a349f2a5d7de23b66f68993d80d08e37607c9a",
      "status": "FAIL",
      "timing": {
        "elapsed_ms": 2.707,
        "started_at": "2026-11-06T17:55:04.231Z"
      },
      "uri": "memory:demo.json",
      "version": 1
    },
    "stdout_ref": {
      "artifact_id": "f93cf234-faba-432e-9d67-0f71afe8b3c2",
      "sha256": "add0685018597e870947385d731e9f4c8b9e456b775b99c87481a20d2f526ad1",
      "bytes": 1189,
      "codec": "zstd",
      "stored_sha256": "2c23510c781f08ac1f29e8354993c5035e408a2980bfca154559fd847a3aeee4",
      "stored_bytes": 699,
      "media_type": "application/octet-stream",
      "sensitivity": "NORMAL"
    },
    "stderr_ref": {
      "artifact_id": "fe3c7622-6455-40bb-8ac9-aeec83253888",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "bytes": 0,
      "codec": "zstd",
      "stored_sha256": "f96deff1816083fdff8bc3e46c3fe6ca46a6bb49f4d5a00627616c13237a512c",
      "stored_bytes": 13,
      "media_type": "application/octet-stream",
      "sensitivity": "NORMAL"
    },
    "audit_event_id": "9a28350e-41e9-443c-9ade-ac1d659266be",
    "permit_id": "3f8c83a9-0f24-4102-ac07-9c5a433e2e9b"
  },
  "reconstruction": {
    "events": 18,
    "next_cursor": 23,
    "replay": "READ_ONLY_NO_EXECUTOR"
  },
  "verification": {
    "records": 23,
    "segments": 1,
    "pending": 0,
    "objects": 8,
    "incomplete": 0
  }
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.v3.json

类别：`original_runtime_evidence_or_index`；原始字节数：5541。

源文件 SHA256：

```text
6d046139a4b13833349d0fea0f9a611ded739216c814cd5fad193bc787d69ec0
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0049","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.v3.json","bytes":5541,"sha256":"6d046139a4b13833349d0fea0f9a611ded739216c814cd5fad193bc787d69ec0","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.v3.json"}} -->
```json
{
  "schema": "agentnexus/storage-integrity-review/0.3",
  "observed_at": "2026-11-06T17:46:56.405Z",
  "status": "PASS",
  "scope": "Independent v3 recheck of exactly STOR-REV-01/02/03; source-limited Store behavior, not whole-product/OS/mutable-tree admission.",
  "reviewer": "diagnostics_m01",
  "node": "v24.15.0",
  "platform": "win32",
  "run_root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\storage-integrity-probe-v3-kDRBBX",
  "product_or_test_edits": false,
  "author_test_logs_rerun_or_overwritten": false,
  "prior_review": {
    "file": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\storage-integrity-review.json",
    "sha256": "49d658b1b43597214f460a52fea42c31afd9896d7180271b5f0a2dfe871da797",
    "unchanged": true,
    "historical_status": "CHANGES_REQUIRED retained"
  },
  "source_snapshot": [
    {
      "file": "src/agentnexus/storage.ts",
      "bytes": 33030,
      "sha256": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d"
    },
    {
      "file": "src/agentnexus/artifacts.ts",
      "bytes": 15666,
      "sha256": "f89cd95c7c373e1551d509f82596e54e203f0bb02b2934e1c2108040ef48bc49"
    },
    {
      "file": "src/agentnexus/records.ts",
      "bytes": 6510,
      "sha256": "393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800"
    },
    {
      "file": "src/agentnexus/integrity.ts",
      "bytes": 18691,
      "sha256": "172a40c429c9e8a99f8cc1fcee2ef500adb4e7d378f0f6188fbbe7f792edfe66"
    },
    {
      "file": "src/agentnexus/types.ts",
      "bytes": 6814,
      "sha256": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75"
    }
  ],
  "source_changed_during_probes": [],
  "probes": [
    {
      "id": "FLUSH_TARGET_WINDOW",
      "original_finding": "STOR-REV-01",
      "root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\storage-integrity-probe-v3-kDRBBX\\flush-target",
      "target_seq": 1,
      "exported_after_both_flushes": 1,
      "pending_after_both_flushes": 0,
      "physical_raw_lines": 1,
      "resolved": true,
      "active_overlap": {
        "targets": [
          2,
          3
        ],
        "exported": 3,
        "pending": 0
      }
    },
    {
      "id": "STALLED_SOURCE_ABORT",
      "original_finding": "STOR-REV-02",
      "root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\storage-integrity-probe-v3-kDRBBX\\blocked-source-abort",
      "put_150ms_after_abort": "REJECTED",
      "put_error": 20,
      "active_store_puts": 0,
      "store_faulted_before_close": true,
      "new_put_error": "STORE_FAULTED",
      "close_before_source_release": "FULFILLED",
      "close_error": null,
      "producer_exited_before_release": false,
      "metadata": [
        {
          "artifact_id": "100baec1-316d-42c3-9ebc-edb6b33956f8",
          "compressed_bytes_observed": 0,
          "durable_offset": null,
          "input_bytes_observed": 5,
          "producer_cleanup": "UNKNOWN",
          "producer_exit": "NOT_VERIFIED",
          "reason": 20,
          "stage": "PARTIAL",
          "status": "INCOMPLETE",
          "store_output_closed": true
        }
      ],
      "objects_before_release": [],
      "elapsed_ms_before_source_release": 164.49,
      "producer_exited_after_release": true,
      "partial_sizes_before_release": {
        "100baec1-316d-42c3-9ebc-edb6b33956f8.part": 0
      },
      "partial_sizes_after_release": {
        "100baec1-316d-42c3-9ebc-edb6b33956f8.part": 0
      },
      "objects_after_release": [],
      "resolved": true,
      "scope": "PASS for bounded Store-owned pipeline/file cleanup plus truthful UNKNOWN producer state and fail-closed admission. Not proof that an uncontrolled producer exited before source release."
    },
    {
      "id": "CONCURRENT_CLOSE",
      "original_finding": "STOR-REV-03",
      "root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\storage-integrity-probe-v3-kDRBBX\\concurrent-close",
      "same_promise": true,
      "first_before_release": "PENDING",
      "second_before_release": "PENDING",
      "active_puts_before_release": 1,
      "writer_lock_before_release": true,
      "first_after_release": "FULFILLED",
      "second_after_release": "FULFILLED",
      "active_puts_final": 0,
      "writer_lock_final": false,
      "resolved": true
    }
  ],
  "source_fix_locations": [
    {
      "finding": "STOR-REV-01",
      "file": "src/agentnexus/storage.ts",
      "start_line": 230,
      "end_line": 246,
      "behavior": "entry target fence, recheck after joined flush and bounded target scan"
    },
    {
      "finding": "STOR-REV-02",
      "file": "src/agentnexus/artifacts.ts",
      "start_line": 95,
      "end_line": 168,
      "behavior": "abort races blocked next; Store output closed; incomplete producer UNKNOWN/NOT_VERIFIED; unknown cleanup faults Store admission"
    },
    {
      "finding": "STOR-REV-03",
      "file": "src/agentnexus/storage.ts",
      "start_line": 450,
      "end_line": 472,
      "behavior": "all close callers receive the same closePromise"
    }
  ],
  "limits": [
    "Producer execution/OS process-tree exit is not established by aborting the Store pipeline; UNKNOWN cleanup remains explicit.",
    "No additional OS link/reparse/ADS/mutable tree, hard RSS, hardware power loss, Ubuntu or whole-product tests were performed.",
    "Original review and author verification.v3.json/tests.v3.tap were not overwritten."
  ]
}
```
<!-- agentnexus-export-end -->

