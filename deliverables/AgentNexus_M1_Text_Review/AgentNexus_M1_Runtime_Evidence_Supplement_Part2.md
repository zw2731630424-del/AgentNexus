# AgentNexus M1 Runtime Evidence Supplement — Part 2

补充原始运行/模块/早期失败/源码版本与测试索引记录，原始空v2预留仍为空；不将历史或空记录改成PASS。单个原始JSON若超过96KB，完整独占一份文档，不拆开文件或截断。

## .workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/syntax.json

类别：`original_runtime_evidence_or_index`；原始字节数：1950。

源文件 SHA256：

```text
267a9b2523878a8918b004ca763dc2bf517402f8bc2bdbe449bb84a31a18d5f0
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0061","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/syntax.json","bytes":1950,"sha256":"267a9b2523878a8918b004ca763dc2bf517402f8bc2bdbe449bb84a31a18d5f0","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/syntax.json"}} -->
```json
[
  {
    "path": "src/agentnexus/artifacts.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "src/agentnexus/checkers/python_ast.py",
    "exit_code": 0,
    "scope": "Python AST of trusted checker only"
  },
  {
    "path": "src/agentnexus/cli.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "src/agentnexus/control.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "src/agentnexus/diagnostics.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "src/agentnexus/features.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "src/agentnexus/gateway.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "src/agentnexus/host.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "src/agentnexus/integrity.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "src/agentnexus/policy.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "src/agentnexus/records.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "src/agentnexus/storage.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "src/agentnexus/types.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "tests/agentnexus/control.test.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "tests/agentnexus/diagnostics.test.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "tests/agentnexus/gateway.test.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "tests/agentnexus/integrity.test.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "tests/agentnexus/owned-storage-child.mjs",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "tests/agentnexus/storage.test.ts",
    "exit_code": 0,
    "stderr": ""
  },
  {
    "path": "tools/agentnexus/run-tests.mjs",
    "exit_code": 0,
    "stderr": ""
  }
]
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/test-results.json

类别：`original_runtime_evidence_or_index`；原始字节数：30638。

源文件 SHA256：

```text
8e8a6d90fed9dd3b015b74fa1517d2162a38f821161d3a6c899de104fec81c4b
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0062","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/test-results.json","bytes":30638,"sha256":"8e8a6d90fed9dd3b015b74fa1517d2162a38f821161d3a6c899de104fec81c4b","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/test-results.json"}} -->
```json
{
  "utc": "2026-11-06T17:51:09.855726+00:00",
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
  "tap_sha256": "9492c2ff19b7504baf34b42e80a5a3b2460f0f0d579f14d7605aee7b9ccb6a6e",
  "scope": "Real local implementations with synthetic data; OS sandbox and models NOT_RUN"
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/govern-final.log

类别：`original_runtime_evidence_or_index`；原始字节数：24。

源文件 SHA256：

```text
74b9b169f20d84d2bc14b03ada594625dda519a7f855845ca917f6ec53661344
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0063","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/govern-final.log","bytes":24,"sha256":"74b9b169f20d84d2bc14b03ada594625dda519a7f855845ca917f6ec53661344","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/govern-final.log"}} -->
```text
Governance check: PASS
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-01.json

类别：`original_runtime_evidence_or_index`；原始字节数：1368。

源文件 SHA256：

```text
f5086eddec462029bf31c1484b7c01b2efdea0d991d999e6b9ebb6562561fd6f
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0064","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-01.json","bytes":1368,"sha256":"f5086eddec462029bf31c1484b7c01b2efdea0d991d999e6b9ebb6562561fd6f","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-01.json"}} -->
```json
{
  "schema": "agentnexus/m1/integrity-test-run/1",
  "started_utc": "2026-11-06T17:04:50.645632+00:00",
  "ended_utc": "2026-11-06T17:04:50.796198+00:00",
  "command_argv": [
    "D:\\Nodejs\\node.exe",
    "--test",
    "--test-reporter=tap",
    "tests/agentnexus/integrity.test.ts"
  ],
  "cwd": "I:\\AI_AgentNexus",
  "exit_code": 1,
  "elapsed_seconds": 0.14100000000325963,
  "platform": "Windows-11-10.0.26200-SP0",
  "node_version": "v24.15.0",
  "tap": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
  "tap_sha256": "af0c62c7d73c4a412421fb57ee11230c8459e0cbd8fcb97e2c178fc2c3428dff",
  "tap_bytes": 904,
  "summary": {
    "tests": 1,
    "suites": 0,
    "pass": 0,
    "fail": 1,
    "cancelled": 0,
    "skipped": 0,
    "todo": 0,
    "duration_ms": 75.8472
  },
  "not_run_real_os_tests": [],
  "source_sha256": {
    "src/agentnexus/integrity.ts": "bca7c1099e4336a2afac0c7a0947eeb19d23e4e71dcd79684105e04d154829d0",
    "tests/agentnexus/integrity.test.ts": "7c18d10d572f3b984e7d20ab6722a5a0cdf0755a41c94a684339fbcd6bcfbfc1",
    "src/agentnexus/types.ts": "25405c2752b9d5fa7466fa479507473c12d52acd57ba616683a54d3a7dd3028a"
  },
  "scope": "actual local Node/fs/hash behavior on new owned synthetic fixtures; no models, Kit code, OS identity boundary, adversarial TOCTOU or bundled runtime license admission",
  "status": "FAIL"
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-01.tap

类别：`original_runtime_evidence_or_index`；原始字节数：904。

源文件 SHA256：

```text
af0c62c7d73c4a412421fb57ee11230c8459e0cbd8fcb97e2c178fc2c3428dff
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0065","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-01.tap","bytes":904,"sha256":"af0c62c7d73c4a412421fb57ee11230c8459e0cbd8fcb97e2c178fc2c3428dff","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-01.tap"}} -->
```text
TAP version 13
# node:internal/modules/run_main:76
#   const type = getNearestParentPackageJSONType(mainPath);
#                ^
# Error: Invalid package config \\\\?\\I:\\AI_AgentNexus\\package.json.
#     at shouldUseESMLoader (node:internal/modules/run_main:76:16)
#     at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:147:20)
#     at node:internal/main/run_main_module:33:47 {
#   code: 'ERR_INVALID_PACKAGE_CONFIG'
# }
# Node.js v24.15.0
# Subtest: tests\\agentnexus\\integrity.test.ts
not ok 1 - tests\\agentnexus\\integrity.test.ts
  ---
  duration_ms: 69.6651
  type: 'test'
  location: 'I:\\AI_AgentNexus\\tests\\agentnexus\\integrity.test.ts:1:1'
  failureType: 'testCodeFailure'
  exitCode: 1
  signal: ~
  error: 'test failed'
  code: 'ERR_TEST_FAILURE'
  ...
1..1
# tests 1
# suites 0
# pass 0
# fail 1
# cancelled 0
# skipped 0
# todo 0
# duration_ms 75.8472
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.json

类别：`original_runtime_evidence_or_index`；原始字节数：1927。

源文件 SHA256：

```text
a4f2252044c9bf459a6f4e378313f44980de6e98f2042fef4defee433557a492
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0066","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.json","bytes":1927,"sha256":"a4f2252044c9bf459a6f4e378313f44980de6e98f2042fef4defee433557a492","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.json"}} -->
```json
{
  "schema": "agentnexus/m1/integrity-test-run/1",
  "started_utc": "2026-11-06T17:07:24.343739+00:00",
  "ended_utc": "2026-11-06T17:07:25.727566+00:00",
  "command_argv": [
    "D:\\Nodejs\\node.exe",
    "--test",
    "--test-reporter=tap",
    "tests/agentnexus/integrity.test.ts"
  ],
  "cwd": "I:\\AI_AgentNexus",
  "exit_code": 1,
  "elapsed_seconds": 1.375,
  "platform": "Windows-11-10.0.26200-SP0",
  "node_version": "v24.15.0",
  "tap": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
  "tap_sha256": "f75d61f608a6e8c79a9a875560fa2d0f231d2d7681b7eb4f77c9cdd70b86783f",
  "tap_bytes": 11281,
  "summary": {
    "tests": 58,
    "suites": 0,
    "pass": 53,
    "fail": 1,
    "cancelled": 0,
    "skipped": 4,
    "todo": 0,
    "duration_ms": 1319.4265
  },
  "not_run_real_os_tests": [
    "ok 28 - real OS file symlink is rejected without following its target # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
    "ok 29 - real OS dir link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
    "ok 30 - real OS junction link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
    "ok 31 - real OS hardlink to an outside object is rejected by link count # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS"
  ],
  "source_sha256": {
    "src/agentnexus/integrity.ts": "bca7c1099e4336a2afac0c7a0947eeb19d23e4e71dcd79684105e04d154829d0",
    "tests/agentnexus/integrity.test.ts": "802d2ab1c441e87d88c77da998752ee3a6b5e4298c5ccf20b2c56facfe7e1567",
    "src/agentnexus/types.ts": "273780415d1e00476dcfc52ca901a15527d62f1e74c1a46def5757251afcfcd8"
  },
  "scope": "actual local Node/fs/hash behavior on new owned synthetic fixtures; no models, Kit code, OS identity boundary, adversarial TOCTOU or bundled runtime license admission",
  "status": "FAIL"
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap

类别：`original_runtime_evidence_or_index`；原始字节数：11281。

源文件 SHA256：

```text
f75d61f608a6e8c79a9a875560fa2d0f231d2d7681b7eb4f77c9cdd70b86783f
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0067","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap","bytes":11281,"sha256":"f75d61f608a6e8c79a9a875560fa2d0f231d2d7681b7eb4f77c9cdd70b86783f","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap"}} -->
```text
TAP version 13
# Subtest: controlled static bytes close over binary, empty and nested same-name files
ok 1 - controlled static bytes close over binary, empty and nested same-name files
  ---
  duration_ms: 25.0667
  type: 'test'
  ...
# Subtest: empty package permits exactly its manifest, with zero payload budgets
ok 2 - empty package permits exactly its manifest, with zero payload budgets
  ---
  duration_ms: 4.8611
  type: 'test'
  ...
# Subtest: matching mutable tree is INCONCLUSIVE, never a trusted release root
ok 3 - matching mutable tree is INCONCLUSIVE, never a trusted release root
  ---
  duration_ms: 6.2261
  type: 'test'
  ...
# Subtest: same-size modified content fails its SHA-256
ok 4 - same-size modified content fails its SHA-256
  ---
  duration_ms: 6.4955
  type: 'test'
  ...
# Subtest: appended content fails declared byte size
ok 5 - appended content fails declared byte size
  ---
  duration_ms: 5.0613
  type: 'test'
  ...
# Subtest: missing and unlisted files are both reported by full relative path
ok 6 - missing and unlisted files are both reported by full relative path
  ---
  duration_ms: 4.9689
  type: 'test'
  ...
# Subtest: unlisted nested manifest and SHA256SUMS names are never self exceptions
    # Subtest: sub/manifest.json
    ok 1 - sub/manifest.json
      ---
      duration_ms: 5.7732
      type: 'test'
      ...
    # Subtest: validation/SHA256SUMS.txt
    ok 2 - validation/SHA256SUMS.txt
      ---
      duration_ms: 6.59
      type: 'test'
      ...
    # Subtest: unexpected.cjs
    ok 3 - unexpected.cjs
      ---
      duration_ms: 4.8589
      type: 'test'
      ...
    # Subtest: .hidden
    ok 4 - .hidden
      ---
      duration_ms: 4.711
      type: 'test'
      ...
    1..4
ok 7 - unlisted nested manifest and SHA256SUMS names are never self exceptions
  ---
  duration_ms: 22.5016
  type: 'test'
  ...
# Subtest: root manifest is required and cannot list itself
ok 8 - root manifest is required and cannot list itself
  ---
  duration_ms: 3.5874
  type: 'test'
  ...
# Subtest: root manifest directory and non-directory roots fail
ok 9 - root manifest directory and non-directory roots fail
  ---
  duration_ms: 3.9041
  type: 'test'
  ...
# Subtest: duplicate JSON keys are rejected despite JSON.parse last-wins semantics
ok 10 - duplicate JSON keys are rejected despite JSON.parse last-wins semantics
  ---
  duration_ms: 5.0437
  type: 'test'
  ...
# Subtest: duplicate complete path and unsorted arrays fail independently
ok 11 - duplicate complete path and unsorted arrays fail independently
  ---
  duration_ms: 4.4908
  type: 'test'
  ...
# Subtest: case conflicts include ancestor directories and file-directory prefixes
    # Subtest: A vs a
    ok 1 - A vs a
      ---
      duration_ms: 3.1089
      type: 'test'
      ...
    # Subtest: Dir/a vs dir/b
    ok 2 - Dir/a vs dir/b
      ---
      duration_ms: 3.32
      type: 'test'
      ...
    # Subtest: a vs a/b
    ok 3 - a vs a/b
      ---
      duration_ms: 4.1335
      type: 'test'
      ...
    1..3
ok 12 - case conflicts include ancestor directories and file-directory prefixes
  ---
  duration_ms: 10.9076
  type: 'test'
  ...
# Subtest: path traversal, device aliases, malformed separators and Unicode reject before payload reads
    # Subtest: "../outside"
    ok 1 - "../outside"
      ---
      duration_ms: 4.4739
      type: 'test'
      ...
    # Subtest: "./a"
    ok 2 - "./a"
      ---
      duration_ms: 3.5572
      type: 'test'
      ...
    # Subtest: "a//b"
    ok 3 - "a//b"
      ---
      duration_ms: 6.1629
      type: 'test'
      ...
    # Subtest: "/outside"
    ok 4 - "/outside"
      ---
      duration_ms: 3.8612
      type: 'test'
      ...
    # Subtest: "C:/outside"
    ok 5 - "C:/outside"
      ---
      duration_ms: 3.5562
      type: 'test'
      ...
    # Subtest: "//server/share"
    ok 6 - "//server/share"
      ---
      duration_ms: 3.3194
      type: 'test'
      ...
    # Subtest: "a\\\\b"
    ok 7 - "a\\\\b"
      ---
      duration_ms: 3.3441
      type: 'test'
      ...
    # Subtest: "a:stream"
    ok 8 - "a:stream"
      ---
      duration_ms: 3.8359
      type: 'test'
      ...
    # Subtest: "NUL.txt"
    ok 9 - "NUL.txt"
      ---
      duration_ms: 6.7215
      type: 'test'
      ...
    # Subtest: "COM1"
    ok 10 - "COM1"
      ---
      duration_ms: 4.6204
      type: 'test'
      ...
    # Subtest: "con.tar.gz"
    ok 11 - "con.tar.gz"
      ---
      duration_ms: 5.3963
      type: 'test'
      ...
    # Subtest: "a."
    ok 12 - "a."
      ---
      duration_ms: 4.4996
      type: 'test'
      ...
    # Subtest: "a "
    ok 13 - "a "
      ---
      duration_ms: 5.7808
      type: 'test'
      ...
    # Subtest: "PROGRA~1/file"
    ok 14 - "PROGRA~1/file"
      ---
      duration_ms: 5.8328
      type: 'test'
      ...
    # Subtest: ""
    ok 15 - ""
      ---
      duration_ms: 5.2294
      type: 'test'
      ...
    # Subtest: "a\\u0000b"
    ok 16 - "a\\u0000b"
      ---
      duration_ms: 5.5469
      type: 'test'
      ...
    # Subtest: "é"
    ok 17 - "é"
      ---
      duration_ms: 5.0764
      type: 'test'
      ...
    # Subtest: "é"
    ok 18 - "é"
      ---
      duration_ms: 5.7966
      type: 'test'
      ...
    # Subtest: "İ"
    ok 19 - "İ"
      ---
      duration_ms: 5.1265
      type: 'test'
      ...
    # Subtest: "a/a/"
    ok 20 - "a/a/"
      ---
      duration_ms: 5.0695
      type: 'test'
      ...
    1..20
ok 13 - path traversal, device aliases, malformed separators and Unicode reject before payload reads
  ---
  duration_ms: 98.7205
  type: 'test'
  ...
# Subtest: schema, digest and byte count reject invalid declarations
ok 14 - schema, digest and byte count reject invalid declarations
  ---
  duration_ms: 18.8021
  type: 'test'
  ...
# Subtest: canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes
ok 15 - canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes
  ---
  duration_ms: 10.8542
  type: 'test'
  ...
# Subtest: extra empty directory and file-vs-directory mismatch cannot disappear
ok 16 - extra empty directory and file-vs-directory mismatch cannot disappear
  ---
  duration_ms: 8.9082
  type: 'test'
  ...
# Subtest: file count and total bytes budgets work at exact limit and limit plus one
ok 17 - file count and total bytes budgets work at exact limit and limit plus one
  ---
  duration_ms: 8.818
  type: 'test'
  ...
# Subtest: actual unlisted content also consumes size and count budgets
ok 18 - actual unlisted content also consumes size and count budgets
  ---
  duration_ms: 7.1193
  type: 'test'
  ...
# Subtest: manifest and single-file caps are enforced without reading an oversized payload
ok 19 - manifest and single-file caps are enforced without reading an oversized payload
  ---
  duration_ms: 7.3735
  type: 'test'
  ...
# Subtest: path length and depth have bounded rejection
ok 20 - path length and depth have bounded rejection
  ---
  duration_ms: 5.8599
  type: 'test'
  ...
# Subtest: actual default file and directory count limits accept the edge and reject one more
not ok 21 - actual default file and directory count limits accept the edge and reject one more
  ---
  duration_ms: 762.1301
  type: 'test'
  location: 'I:\\AI_AgentNexus\\tests\\agentnexus\\integrity.test.ts:281:1'
  failureType: 'testCodeFailure'
  error: |-
    {"status":"INCONCLUSIVE","reason":"ENTRY_COUNT_BUDGET","filesChecked":0,"bytesChecked":0,"manifest_sha256":"6187c73c4eb3b30f053c799054261718b23d7b6ba663a8d294aa3fdb4b849330","details":[{"code":"ENTRY_COUNT_BUDGET"}],"detailCount":1,"detailsTruncated":false,"checks":{"schema":true,"canonical":true,"portablePaths":true,"bidirectional":false,"fileContents":false,"secondInventory":false,"sourceMode":"controlled_static","assurance":"NO_OS_ADMISSION","hostPrecondition":"trusted Host selects mode; controlled_static requires exclusive local staging, trusted ancestors, no hostile writer/reparse/ADS","allWindowsReparseTags":"NOT_VERIFIED_BY_NODE","alternateDataStreams":"NOT_ENUMERATED_BY_NODE","adversarialTOCTOU":"NOT_CLOSED","deadlineEnforcement":"COOPERATIVE_BETWEEN_FS_OPERATIONS","runtimeOrLicenseAdmission":"NOT_EVALUATED","maxOpenFileHandles":1,"maxFiles":256,"maxTotalBytes":16777216}}
    + actual - expected
    
    + 'ENTRY_COUNT_BUDGET'
    - 'FILE_COUNT_BUDGET'
    
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: 'FILE_COUNT_BUDGET'
  actual: 'ENTRY_COUNT_BUDGET'
  operator: 'strictEqual'
  stack: |-
    expected (file:///I:/AI_AgentNexus/tests/agentnexus/integrity.test.ts:50:10)
    async TestContext.<anonymous> (file:///I:/AI_AgentNexus/tests/agentnexus/integrity.test.ts:293:3)
    async Test.run (node:internal/test_runner/test:1208:7)
    async Test.processPendingSubtests (node:internal/test_runner/test:831:7)
  ...
# Subtest: actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject
ok 22 - actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject
  ---
  duration_ms: 44.0567
  type: 'test'
  ...
# Subtest: maximum component and depth are accepted on an actually created portable path
ok 23 - maximum component and depth are accepted on an actually created portable path
  ---
  duration_ms: 28.6588
  type: 'test'
  ...
# Subtest: Host cannot expand limits or choose an unknown mode; relative roots reject
ok 24 - Host cannot expand limits or choose an unknown mode; relative roots reject
  ---
  duration_ms: 3.2848
  type: 'test'
  ...
# Subtest: pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work
ok 25 - pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work
  ---
  duration_ms: 6.0841
  type: 'test'
  ...
# Subtest: diagnostic count and encoded bytes remain bounded for many extra files
ok 26 - diagnostic count and encoded bytes remain bounded for many extra files
  ---
  duration_ms: 45.6768
  type: 'test'
  ...
# Subtest: candidate scripts, package metadata and git-looking files are data and never executed
ok 27 - candidate scripts, package metadata and git-looking files are data and never executed
  ---
  duration_ms: 11.5848
  type: 'test'
  ...
# Subtest: real OS file symlink is rejected without following its target
ok 28 - real OS file symlink is rejected without following its target # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 3.8592
  type: 'test'
  ...
# Subtest: real OS dir link is rejected
ok 29 - real OS dir link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 3.9231
  type: 'test'
  ...
# Subtest: real OS junction link is rejected
ok 30 - real OS junction link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 4.048
  type: 'test'
  ...
# Subtest: real OS hardlink to an outside object is rejected by link count
ok 31 - real OS hardlink to an outside object is rejected by link count # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 3.6443
  type: 'test'
  ...
1..31
# tests 58
# suites 0
# pass 53
# fail 1
# cancelled 0
# skipped 4
# todo 0
# duration_ms 1319.4265
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/implementation.json

类别：`original_runtime_evidence_or_index`；原始字节数：9330。

源文件 SHA256：

```text
d83e0ea23ef1b1939e430492c10b0b0326a2c8376d02a0eb694124e3a5c28ca4
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0068","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/implementation.json","bytes":9330,"sha256":"d83e0ea23ef1b1939e430492c10b0b0326a2c8376d02a0eb694124e3a5c28ca4","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/implementation.json"}} -->
```json
{
  "schema": "agentnexus/m1/integrity-implementation/1",
  "captured_utc": "2026-11-06T17:09:51.645511+00:00",
  "status": "IMPLEMENTED_LOCAL_CONTROLLED_STATIC_SCOPE; ROOT_INDEPENDENT_REVIEW_PENDING",
  "files": [
    {
      "path": "src/agentnexus/integrity.ts",
      "bytes": 18691,
      "sha256": "172a40c429c9e8a99f8cc1fcee2ef500adb4e7d378f0f6188fbbe7f792edfe66",
      "provenance": "independently authored in authorized M1; synthetic fixture expressions only",
      "third_party_expression_imported": false,
      "project_distribution_license": "NOT_SELECTED_BY_THIS_SUBTASK"
    },
    {
      "path": "tests/agentnexus/integrity.test.ts",
      "bytes": 21578,
      "sha256": "ecc6655be30a7d7690f04e5d26c61f09eaaa988ae1075b63327fe98c97c93277",
      "provenance": "independently authored in authorized M1; synthetic fixture expressions only",
      "third_party_expression_imported": false,
      "project_distribution_license": "NOT_SELECTED_BY_THIS_SUBTASK"
    }
  ],
  "imports": {
    "src/agentnexus/integrity.ts": [
      "node:crypto",
      "node:fs",
      "node:fs",
      "node:fs/promises",
      "node:fs/promises",
      "node:path",
      "node:util",
      "./types.ts",
      "./types.ts"
    ],
    "tests/agentnexus/integrity.test.ts": [
      "node:assert/strict",
      "node:crypto",
      "node:fs",
      "node:fs/promises",
      "node:path",
      "node:test",
      "node:test",
      "../../src/agentnexus/integrity.ts",
      "../../src/agentnexus/integrity.ts",
      "../../src/agentnexus/types.ts"
    ]
  },
  "new_npm_runtime_dependencies": 0,
  "new_npm_development_dependencies": 0,
  "kit_source_or_test_imports": 0,
  "shared_dependency": {
    "path": "src/agentnexus/types.ts",
    "sha256_at_test": "273780415d1e00476dcfc52ca901a15527d62f1e74c1a46def5757251afcfcd8",
    "uses": [
      "Status",
      "NexusError",
      "canonical",
      "sha256"
    ],
    "modified_by_this_subtask": false
  },
  "api": {
    "name": "verifyPackage",
    "options": [
      "sourceMode",
      "maxFiles",
      "maxTotalBytes",
      "signal"
    ],
    "statuses": [
      "PASS",
      "FAIL",
      "NOT_RUN",
      "INCONCLUSIVE",
      "BLOCKED",
      "BYPASSED"
    ],
    "required_result_fields": [
      "status",
      "reason",
      "filesChecked",
      "bytesChecked",
      "checks",
      "details",
      "detailCount",
      "detailsTruncated",
      "manifest_sha256"
    ]
  },
  "manifest": {
    "schema": "agentnexus/package/1",
    "profile": "portable-ascii-v1",
    "self_exceptions": [
      "manifest.json"
    ],
    "canonical": "shared canonical recursively sorted keys + exactly one LF, raw bytes must match",
    "entries": "sorted unique full relative path, nonnegative safe bytes, lowercase SHA256",
    "bidirectional": "all payload files and derived directories, no hidden/cache/basename ignore"
  },
  "limits": {
    "maxFiles": 256,
    "maxTotalBytes": 16777216,
    "maxFileBytes": 8388608,
    "maxManifestBytes": 131072,
    "maxDirectories": 256,
    "maxEntries": 513,
    "maxDepth": 12,
    "maxComponentBytes": 64,
    "maxRelativeBytes": 240,
    "maxWindowsAbsoluteCharacters": 240,
    "readBufferBytes": 65536,
    "maxDetails": 32,
    "maxDetailBytes": 8192,
    "maxDurationMs": 10000,
    "hashConcurrency": 1
  },
  "limits_probe_command_argv": [
    "D:\\Nodejs\\node.exe",
    "--input-type=module",
    "-e",
    "import { INTEGRITY_LIMITS } from \"./src/agentnexus/integrity.ts\"; console.log(JSON.stringify(INTEGRITY_LIMITS));"
  ],
  "budget_implementation": {
    "streaming": "one file at a time, 64KiB buffer, no payload buffering",
    "growth_probe": "at most one detection byte beyond file/total cap after metadata size preflight",
    "details": "at most 32 records and 8192 canonical UTF-8 bytes",
    "wall_time": "10s monotonic checkpoints between async fs operations, not a hard OS deadline",
    "hard_RSS_limit": "NOT_IMPLEMENTED; no claim of process/OS enforcement"
  },
  "security_scope": {
    "controlled_static": "only trusted Host may select after exclusively creating quiescent local staging with trusted ancestors and no reparse/ADS; returned checks expose the precondition; no caller/OS identity authentication provided",
    "mutable": "matching tree is always INCONCLUSIVE/TOCTOU_NOT_CLOSED; known deterministic malformed/hash errors may be FAIL; never PASS",
    "windows_all_reparse_tags": "NOT_VERIFIED_BY_NODE",
    "alternate_data_streams": "NOT_ENUMERATED_BY_NODE",
    "adversarial_TOCTOU": "NOT_CLOSED; no OS admission",
    "real_OS_link_rejection": "NOT_RUN for four EPERM fixture-creation failures; logic is present but no real OS PASS claimed",
    "untrusted_candidate_execution": "never import/eval/execute candidates; actual malicious-content sentinel tests PASS",
    "external_runtime_redistribution_license": "BLOCKED; entire Node/Python/PowerShell distribution closure not performed",
    "unlicensed_Kit_copy_distribution": "BLOCKED unchanged"
  },
  "test_evidence": {
    "json": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/test-run.json",
    "tap": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
    "command_argv": [
      "D:\\Nodejs\\node.exe",
      "--test",
      "--test-reporter=tap",
      "tests/agentnexus/integrity.test.ts"
    ],
    "exit_code": 0,
    "summary": {
      "tests": 58,
      "suites": 0,
      "pass": 54,
      "fail": 0,
      "cancelled": 0,
      "skipped": 4,
      "todo": 0,
      "duration_ms": 1789.3877
    },
    "not_run": [
      "ok 28 - real OS file symlink is rejected without following its target # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
      "ok 29 - real OS dir link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
      "ok 30 - real OS junction link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
      "ok 31 - real OS hardlink to an outside object is rejected by link count # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS"
    ],
    "scope": "actual local Node/fs/hash behavior on new owned synthetic fixtures; no models, Kit code, OS identity boundary, adversarial TOCTOU or bundled runtime license admission"
  },
  "verified_cases": [
    "canonical binary/empty/nested same-name success",
    "missing/unlisted/hidden/extra empty directory",
    "same-size SHA and byte-size tamper",
    "duplicate JSON keys and complete paths",
    "ancestor case and file-directory conflicts",
    "absolute/parent/UNC/drive/device/ADS syntax/Unicode profile",
    "bad UTF8/BOM/noncanonical JSON/schema/sha/size",
    "single manifest exact self-exception",
    "actual 256-files + 256-directories + manifest edge",
    "actual single file 8MiB and total16MiB edge plus overflow",
    "manifest/relative path/depth/component caps",
    "tightened Host count/total budgets",
    "pre/in-flight cancellation",
    "diagnostic count/byte bounds",
    "listed and unlisted malicious scripts/package/git metadata never execute"
  ],
  "remaining_unverified": [
    "Ubuntu run",
    "real OS links blocked by EPERM",
    "other Windows reparse tags",
    "ADS enumeration",
    "OS identity and hostile-writer exclusion",
    "adversarial TOCTOU",
    "hard hung-I/O timeout or RSS enforcement",
    "10s elapsed-budget failure injection",
    "source license admission for a complete product/runtime distribution"
  ],
  "retained_attempts": [
    {
      "tap": "attempt-01.tap",
      "json": "attempt-01.json",
      "module_test_state": "NOT_RUN",
      "explanation": "root package.json was temporarily empty during shared bootstrap; Node loader exited ERR_INVALID_PACKAGE_CONFIG before module tests"
    },
    {
      "tap": "attempt-02.tap",
      "json": "attempt-02.json",
      "module_test_state": "FAIL_RESOLVED",
      "explanation": "new combined-limit test expected FILE_COUNT_BUDGET but ENTRY_COUNT_BUDGET correctly took precedence at 514th entry; fixed expectation and added a flat independent file-count overflow case"
    }
  ],
  "validation": {
    "node_test": "PASS",
    "governance_check": "PASS",
    "frozen_design_modified": false,
    "M0_or_original_kit_modified": false,
    "root_independent_acceptance": "PENDING",
    "source_hashes_match_test_run": "PASS"
  },
  "performed_actions": {
    "new_files_via_govern": true,
    "hooks": false,
    "commit_push": false,
    "research_project_execution": false,
    "model_execution": false,
    "key_scan": false,
    "new_dependency_install": false,
    "candidate_program_execution": false
  },
  "evidence_sha256": {
    "integrity.tap": "219cf8196b126b0c8d96501ec55fc36a814df64c7a7322ab2bae84081fec5818",
    "test-run.json": "8ffb9dc980a3c23af1deb86d025af8d184bd3d364bcf37a87e56f01d28fc7527",
    "attempt-01.tap": "af0c62c7d73c4a412421fb57ee11230c8459e0cbd8fcb97e2c178fc2c3428dff",
    "attempt-01.json": "f5086eddec462029bf31c1484b7c01b2efdea0d991d999e6b9ebb6562561fd6f",
    "attempt-02.tap": "f75d61f608a6e8c79a9a875560fa2d0f231d2d7681b7eb4f77c9cdd70b86783f",
    "attempt-02.json": "a4f2252044c9bf459a6f4e378313f44980de6e98f2042fef4defee433557a492",
    "run_tests.py": "5e8073e5906254ee404373c22756bfcfb0bcd77b3c5e638a2c6a3d292e3e5b7e"
  }
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap

类别：`original_runtime_evidence_or_index`；原始字节数：9705。

源文件 SHA256：

```text
219cf8196b126b0c8d96501ec55fc36a814df64c7a7322ab2bae84081fec5818
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0069","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap","bytes":9705,"sha256":"219cf8196b126b0c8d96501ec55fc36a814df64c7a7322ab2bae84081fec5818","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap"}} -->
```text
TAP version 13
# Subtest: controlled static bytes close over binary, empty and nested same-name files
ok 1 - controlled static bytes close over binary, empty and nested same-name files
  ---
  duration_ms: 25.3575
  type: 'test'
  ...
# Subtest: empty package permits exactly its manifest, with zero payload budgets
ok 2 - empty package permits exactly its manifest, with zero payload budgets
  ---
  duration_ms: 5.9397
  type: 'test'
  ...
# Subtest: matching mutable tree is INCONCLUSIVE, never a trusted release root
ok 3 - matching mutable tree is INCONCLUSIVE, never a trusted release root
  ---
  duration_ms: 7.2838
  type: 'test'
  ...
# Subtest: same-size modified content fails its SHA-256
ok 4 - same-size modified content fails its SHA-256
  ---
  duration_ms: 7.4722
  type: 'test'
  ...
# Subtest: appended content fails declared byte size
ok 5 - appended content fails declared byte size
  ---
  duration_ms: 5.7553
  type: 'test'
  ...
# Subtest: missing and unlisted files are both reported by full relative path
ok 6 - missing and unlisted files are both reported by full relative path
  ---
  duration_ms: 6.1535
  type: 'test'
  ...
# Subtest: unlisted nested manifest and SHA256SUMS names are never self exceptions
    # Subtest: sub/manifest.json
    ok 1 - sub/manifest.json
      ---
      duration_ms: 7.3303
      type: 'test'
      ...
    # Subtest: validation/SHA256SUMS.txt
    ok 2 - validation/SHA256SUMS.txt
      ---
      duration_ms: 9.0158
      type: 'test'
      ...
    # Subtest: unexpected.cjs
    ok 3 - unexpected.cjs
      ---
      duration_ms: 6.289
      type: 'test'
      ...
    # Subtest: .hidden
    ok 4 - .hidden
      ---
      duration_ms: 5.6974
      type: 'test'
      ...
    1..4
ok 7 - unlisted nested manifest and SHA256SUMS names are never self exceptions
  ---
  duration_ms: 29.0482
  type: 'test'
  ...
# Subtest: root manifest is required and cannot list itself
ok 8 - root manifest is required and cannot list itself
  ---
  duration_ms: 5.8015
  type: 'test'
  ...
# Subtest: root manifest directory and non-directory roots fail
ok 9 - root manifest directory and non-directory roots fail
  ---
  duration_ms: 5.1489
  type: 'test'
  ...
# Subtest: duplicate JSON keys are rejected despite JSON.parse last-wins semantics
ok 10 - duplicate JSON keys are rejected despite JSON.parse last-wins semantics
  ---
  duration_ms: 6.6665
  type: 'test'
  ...
# Subtest: duplicate complete path and unsorted arrays fail independently
ok 11 - duplicate complete path and unsorted arrays fail independently
  ---
  duration_ms: 5.6725
  type: 'test'
  ...
# Subtest: case conflicts include ancestor directories and file-directory prefixes
    # Subtest: A vs a
    ok 1 - A vs a
      ---
      duration_ms: 3.6128
      type: 'test'
      ...
    # Subtest: Dir/a vs dir/b
    ok 2 - Dir/a vs dir/b
      ---
      duration_ms: 3.777
      type: 'test'
      ...
    # Subtest: a vs a/b
    ok 3 - a vs a/b
      ---
      duration_ms: 3.1971
      type: 'test'
      ...
    1..3
ok 12 - case conflicts include ancestor directories and file-directory prefixes
  ---
  duration_ms: 10.9714
  type: 'test'
  ...
# Subtest: path traversal, device aliases, malformed separators and Unicode reject before payload reads
    # Subtest: "../outside"
    ok 1 - "../outside"
      ---
      duration_ms: 5.4017
      type: 'test'
      ...
    # Subtest: "./a"
    ok 2 - "./a"
      ---
      duration_ms: 4.3188
      type: 'test'
      ...
    # Subtest: "a//b"
    ok 3 - "a//b"
      ---
      duration_ms: 5.8812
      type: 'test'
      ...
    # Subtest: "/outside"
    ok 4 - "/outside"
      ---
      duration_ms: 4.2883
      type: 'test'
      ...
    # Subtest: "C:/outside"
    ok 5 - "C:/outside"
      ---
      duration_ms: 5.5516
      type: 'test'
      ...
    # Subtest: "//server/share"
    ok 6 - "//server/share"
      ---
      duration_ms: 5.2519
      type: 'test'
      ...
    # Subtest: "a\\\\b"
    ok 7 - "a\\\\b"
      ---
      duration_ms: 4.6438
      type: 'test'
      ...
    # Subtest: "a:stream"
    ok 8 - "a:stream"
      ---
      duration_ms: 5.0128
      type: 'test'
      ...
    # Subtest: "NUL.txt"
    ok 9 - "NUL.txt"
      ---
      duration_ms: 4.3439
      type: 'test'
      ...
    # Subtest: "COM1"
    ok 10 - "COM1"
      ---
      duration_ms: 4.7259
      type: 'test'
      ...
    # Subtest: "con.tar.gz"
    ok 11 - "con.tar.gz"
      ---
      duration_ms: 4.4007
      type: 'test'
      ...
    # Subtest: "a."
    ok 12 - "a."
      ---
      duration_ms: 4.0913
      type: 'test'
      ...
    # Subtest: "a "
    ok 13 - "a "
      ---
      duration_ms: 3.8119
      type: 'test'
      ...
    # Subtest: "PROGRA~1/file"
    ok 14 - "PROGRA~1/file"
      ---
      duration_ms: 3.6116
      type: 'test'
      ...
    # Subtest: ""
    ok 15 - ""
      ---
      duration_ms: 4.5892
      type: 'test'
      ...
    # Subtest: "a\\u0000b"
    ok 16 - "a\\u0000b"
      ---
      duration_ms: 4.8348
      type: 'test'
      ...
    # Subtest: "é"
    ok 17 - "é"
      ---
      duration_ms: 4.3733
      type: 'test'
      ...
    # Subtest: "é"
    ok 18 - "é"
      ---
      duration_ms: 5.1305
      type: 'test'
      ...
    # Subtest: "İ"
    ok 19 - "İ"
      ---
      duration_ms: 5.2008
      type: 'test'
      ...
    # Subtest: "a/a/"
    ok 20 - "a/a/"
      ---
      duration_ms: 5.1952
      type: 'test'
      ...
    1..20
ok 13 - path traversal, device aliases, malformed separators and Unicode reject before payload reads
  ---
  duration_ms: 96.8778
  type: 'test'
  ...
# Subtest: schema, digest and byte count reject invalid declarations
ok 14 - schema, digest and byte count reject invalid declarations
  ---
  duration_ms: 17.4737
  type: 'test'
  ...
# Subtest: canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes
ok 15 - canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes
  ---
  duration_ms: 11.108
  type: 'test'
  ...
# Subtest: extra empty directory and file-vs-directory mismatch cannot disappear
ok 16 - extra empty directory and file-vs-directory mismatch cannot disappear
  ---
  duration_ms: 7.4058
  type: 'test'
  ...
# Subtest: file count and total bytes budgets work at exact limit and limit plus one
ok 17 - file count and total bytes budgets work at exact limit and limit plus one
  ---
  duration_ms: 8.061
  type: 'test'
  ...
# Subtest: actual unlisted content also consumes size and count budgets
ok 18 - actual unlisted content also consumes size and count budgets
  ---
  duration_ms: 5.101
  type: 'test'
  ...
# Subtest: manifest and single-file caps are enforced without reading an oversized payload
ok 19 - manifest and single-file caps are enforced without reading an oversized payload
  ---
  duration_ms: 5.558
  type: 'test'
  ...
# Subtest: path length and depth have bounded rejection
ok 20 - path length and depth have bounded rejection
  ---
  duration_ms: 5.1291
  type: 'test'
  ...
# Subtest: actual default file and directory count limits accept the edge and reject one more
ok 21 - actual default file and directory count limits accept the edge and reject one more
  ---
  duration_ms: 1134.5155
  type: 'test'
  ...
# Subtest: actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject
ok 22 - actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject
  ---
  duration_ms: 53.9937
  type: 'test'
  ...
# Subtest: maximum component and depth are accepted on an actually created portable path
ok 23 - maximum component and depth are accepted on an actually created portable path
  ---
  duration_ms: 33.6235
  type: 'test'
  ...
# Subtest: Host cannot expand limits or choose an unknown mode; relative roots reject
ok 24 - Host cannot expand limits or choose an unknown mode; relative roots reject
  ---
  duration_ms: 4.5037
  type: 'test'
  ...
# Subtest: pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work
ok 25 - pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work
  ---
  duration_ms: 8.2656
  type: 'test'
  ...
# Subtest: diagnostic count and encoded bytes remain bounded for many extra files
ok 26 - diagnostic count and encoded bytes remain bounded for many extra files
  ---
  duration_ms: 57.9299
  type: 'test'
  ...
# Subtest: candidate scripts, package metadata and git-looking files are data and never executed
ok 27 - candidate scripts, package metadata and git-looking files are data and never executed
  ---
  duration_ms: 16.6019
  type: 'test'
  ...
# Subtest: real OS file symlink is rejected without following its target
ok 28 - real OS file symlink is rejected without following its target # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 5.0574
  type: 'test'
  ...
# Subtest: real OS dir link is rejected
ok 29 - real OS dir link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 4.2569
  type: 'test'
  ...
# Subtest: real OS junction link is rejected
ok 30 - real OS junction link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 4.1898
  type: 'test'
  ...
# Subtest: real OS hardlink to an outside object is rejected by link count
ok 31 - real OS hardlink to an outside object is rejected by link count # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 3.7314
  type: 'test'
  ...
1..31
# tests 58
# suites 0
# pass 54
# fail 0
# cancelled 0
# skipped 4
# todo 0
# duration_ms 1789.3877
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/test-run.json

类别：`original_runtime_evidence_or_index`；原始字节数：1926。

源文件 SHA256：

```text
8ffb9dc980a3c23af1deb86d025af8d184bd3d364bcf37a87e56f01d28fc7527
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0070","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/test-run.json","bytes":1926,"sha256":"8ffb9dc980a3c23af1deb86d025af8d184bd3d364bcf37a87e56f01d28fc7527","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/test-run.json"}} -->
```json
{
  "schema": "agentnexus/m1/integrity-test-run/1",
  "started_utc": "2026-11-06T17:08:17.263695+00:00",
  "ended_utc": "2026-11-06T17:08:19.129540+00:00",
  "command_argv": [
    "D:\\Nodejs\\node.exe",
    "--test",
    "--test-reporter=tap",
    "tests/agentnexus/integrity.test.ts"
  ],
  "cwd": "I:\\AI_AgentNexus",
  "exit_code": 0,
  "elapsed_seconds": 1.875,
  "platform": "Windows-11-10.0.26200-SP0",
  "node_version": "v24.15.0",
  "tap": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
  "tap_sha256": "219cf8196b126b0c8d96501ec55fc36a814df64c7a7322ab2bae84081fec5818",
  "tap_bytes": 9705,
  "summary": {
    "tests": 58,
    "suites": 0,
    "pass": 54,
    "fail": 0,
    "cancelled": 0,
    "skipped": 4,
    "todo": 0,
    "duration_ms": 1789.3877
  },
  "not_run_real_os_tests": [
    "ok 28 - real OS file symlink is rejected without following its target # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
    "ok 29 - real OS dir link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
    "ok 30 - real OS junction link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
    "ok 31 - real OS hardlink to an outside object is rejected by link count # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS"
  ],
  "source_sha256": {
    "src/agentnexus/integrity.ts": "172a40c429c9e8a99f8cc1fcee2ef500adb4e7d378f0f6188fbbe7f792edfe66",
    "tests/agentnexus/integrity.test.ts": "ecc6655be30a7d7690f04e5d26c61f09eaaa988ae1075b63327fe98c97c93277",
    "src/agentnexus/types.ts": "273780415d1e00476dcfc52ca901a15527d62f1e74c1a46def5757251afcfcd8"
  },
  "scope": "actual local Node/fs/hash behavior on new owned synthetic fixtures; no models, Kit code, OS identity boundary, adversarial TOCTOU or bundled runtime license admission",
  "status": "PASS"
}
```
<!-- agentnexus-export-end -->

