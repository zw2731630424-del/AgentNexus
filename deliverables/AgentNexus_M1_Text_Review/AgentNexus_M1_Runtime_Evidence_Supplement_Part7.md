# AgentNexus M1 Runtime Evidence Supplement — Part 7

补充原始运行/模块/早期失败/源码版本与测试索引记录，原始空v2预留仍为空；不将历史或空记录改成PASS。单个原始JSON若超过96KB，完整独占一份文档，不拆开文件或截断。

## test_evidence_index.json

类别：`original_runtime_evidence_or_index`；原始字节数：788410。

源文件 SHA256：

```text
07edc4589857a4cd01e75f12ab938447889c53245c3419d45cc1ba88d17295f2
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0091","path":"test_evidence_index.json","bytes":788410,"sha256":"07edc4589857a4cd01e75f12ab938447889c53245c3419d45cc1ba88d17295f2","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":"test_evidence_index.json"}} -->
```json
{
  "schema": "agentnexus/audit-test-evidence-index/1",
  "generated_utc": "2026-11-07T00:04:19.215579+00:00",
  "provenance": "New navigational index only. All underlying logs/JSON are original bytes. Audit-local IDs were assigned during packaging, not claimed to have existed in historical logs.",
  "primary_run": {
    "log": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
    "results": ".workflow-kit/runtime/AgentNexus-v0.4-M1/test-results.json",
    "verification": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-verification.json",
    "totals": {
      "tests": 135,
      "pass": 131,
      "fail": 0,
      "cancelled": 0,
      "skipped": 4,
      "todo": 0
    },
    "duration_ms": 14618.3748,
    "recorded_run_timestamp_utc": "2026-11-06T17:54:41.259308+00:00",
    "exact_test_start_utc": "NOT_AVAILABLE",
    "exact_test_end_utc": "NOT_AVAILABLE",
    "timestamp_semantics": "Historical verifier batch/run marker; exact test process boundaries are not recorded for final integrated run.",
    "environment": {
      "node": "v24.15.0",
      "sqlite": "3.51.3",
      "zstd": "1.5.7",
      "platform": "win32"
    },
    "tests_reexecuted_during_packaging": false
  },
  "primary_cases": [
    {
      "test_id": "M1-FINAL-0001",
      "stable_case_id": "CASE-19b75189411c664975f5",
      "ordinal": 1,
      "tap_local_ordinal": 1,
      "tap_indent": 0,
      "name": "FT-RESOLVE: defaults, child narrowing, ancestor veto, explicit INHERIT",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 3,
      "duration_ms": 92.6004,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 41,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "fault_recovery",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 3,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0002",
      "stable_case_id": "CASE-5137dca393e865e7f75b",
      "ordinal": 2,
      "tap_local_ordinal": 2,
      "tap_indent": 0,
      "name": "FT: unknown IDs, illegal scopes and non-admin payloads rejected",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 9,
      "duration_ms": 34.3366,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 53,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "local_integration",
        "negative",
        "permissions"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 9,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0003",
      "stable_case_id": "CASE-8c8ba293d1ba739ab0dd",
      "ordinal": 3,
      "tap_local_ordinal": 3,
      "tap_indent": 0,
      "name": "FT-DEPENDENCY: rejects partial disable and does not enable a dependency implicitly",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 15,
      "duration_ms": 47.0369,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 60,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "local_integration",
        "negative"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 15,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0004",
      "stable_case_id": "CASE-c1bce0d309b131ee1cd2",
      "ordinal": 4,
      "tap_local_ordinal": 4,
      "tap_indent": 0,
      "name": "FT: mutual conflict, wrong preview hash and stale revision cannot commit",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 21,
      "duration_ms": 49.5928,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 68,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 21,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0005",
      "stable_case_id": "CASE-a44cd1be6c84fd3e90e9",
      "ordinal": 5,
      "tap_local_ordinal": 5,
      "tap_indent": 0,
      "name": "FT-OFF: live work aborts; failure remains FAILED until explicit recovery",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 27,
      "duration_ms": 50.8186,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 77,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "fault_recovery",
        "local_integration",
        "negative"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 27,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0006",
      "stable_case_id": "CASE-6e28025d3b3072943fc4",
      "ordinal": 6,
      "tap_local_ordinal": 6,
      "tap_indent": 0,
      "name": "FT-RETAIN: configuration survives real reopen, facts remain and old epoch is invalid",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 33,
      "duration_ms": 65.8959,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 91,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "fault_recovery",
        "local_integration",
        "negative"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 33,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0007",
      "stable_case_id": "CASE-f9f9403998c730367b51",
      "ordinal": 7,
      "tap_local_ordinal": 7,
      "tap_indent": 0,
      "name": "FT-INHERIT-OFF: ON to INHERIT must quiesce when default is OFF",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 39,
      "duration_ms": 54.6608,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 103,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "fault_recovery",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 39,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0008",
      "stable_case_id": "CASE-8acf52e3658a54e4e32d",
      "ordinal": 8,
      "tap_local_ordinal": 8,
      "tap_indent": 0,
      "name": "FT-LATE-STOP: timeout cannot recover or enable until the old stop actually settles",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 45,
      "duration_ms": 1057.8041,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 113,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "fault_recovery",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 45,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0009",
      "stable_case_id": "CASE-9c931058fe8855f97e05",
      "ordinal": 9,
      "tap_local_ordinal": 9,
      "tap_indent": 0,
      "name": "FT catalog is capacity, unimplemented module never becomes enabled from default ON",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 51,
      "duration_ms": 40.1658,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 126,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "fault_recovery",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 51,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0010",
      "stable_case_id": "CASE-d6fc972534d9f300b314",
      "ordinal": 10,
      "tap_local_ordinal": 10,
      "tap_indent": 0,
      "name": "P.ADMIN_MODE: forged admin, L0 degradation and missing reason rejected",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 57,
      "duration_ms": 32.7851,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 132,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "local_integration",
        "negative",
        "permissions"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 57,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0011",
      "stable_case_id": "CASE-7aea7c40455bb21bdc3d",
      "ordinal": 11,
      "tap_local_ordinal": 11,
      "tap_indent": 0,
      "name": "P.ADMIN_MODE: two distinct confirmations, preview binding and challenge replay",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 63,
      "duration_ms": 42.8062,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 140,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "local_integration",
        "negative",
        "permissions"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 63,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0012",
      "stable_case_id": "CASE-80106cf9d82cf8ea77f7",
      "ordinal": 12,
      "tap_local_ordinal": 12,
      "tap_indent": 0,
      "name": "P.MODE: same denied request has distinct enforce/audit/disabled behavior",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 69,
      "duration_ms": 49.296,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 151,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "local_integration",
        "negative"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 69,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0013",
      "stable_case_id": "CASE-8a8af5eb22d5caa93539",
      "ordinal": 13,
      "tap_local_ordinal": 13,
      "tap_indent": 0,
      "name": "P.MODE: selected IDs and project scope; explicit ENFORCE dominates overlap",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 75,
      "duration_ms": 50.457,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 161,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 75,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0014",
      "stable_case_id": "CASE-f6c3eba3b28f36d5f088",
      "ordinal": 14,
      "tap_local_ordinal": 14,
      "tap_indent": 0,
      "name": "P.MODE: PDP fault stays closed in ENFORCE and AUDIT_ONLY; DISABLED actually skips PDP",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 81,
      "duration_ms": 49.0332,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 169,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "fault_recovery",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 81,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0015",
      "stable_case_id": "CASE-b684084974af0f1cc401",
      "ordinal": 15,
      "tap_local_ordinal": 15,
      "tap_indent": 0,
      "name": "P.MODE-EXPIRY: real deadline freezes until persisted-chain preflight",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 87,
      "duration_ms": 1420.0419,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 176,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 87,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0016",
      "stable_case_id": "CASE-c8b94c6a2dddcc18fb99",
      "ordinal": 16,
      "tap_local_ordinal": 16,
      "tap_indent": 0,
      "name": "P.MODE-RECOVERY: reboot never restores a permissive lease without preflight",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 93,
      "duration_ms": 706.5232,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 184,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "concurrency",
        "control",
        "fault_recovery",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 93,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0017",
      "stable_case_id": "CASE-c162e1132b50f4e7e2fc",
      "ordinal": 17,
      "tap_local_ordinal": 17,
      "tap_indent": 0,
      "name": "P.APPROVAL: hash/identity/epoch/expiry bind grants and no self-reported approval",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 99,
      "duration_ms": 266.6203,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 193,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "local_integration",
        "permissions"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 99,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0018",
      "stable_case_id": "CASE-b3f21d21be7c495e7dfe",
      "ordinal": 18,
      "tap_local_ordinal": 18,
      "tap_indent": 0,
      "name": "P.APPROVAL-EXPIRY: real expiry cannot revive under an in-process clock rollback",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 105,
      "duration_ms": 350.6064,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 203,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "local_integration",
        "permissions"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Controlled clock override"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 105,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0019",
      "stable_case_id": "CASE-6a48cb9c2937ace1214e",
      "ordinal": 19,
      "tap_local_ordinal": 19,
      "tap_indent": 0,
      "name": "Json canonical contract rejects accessors/cycles/nonfinite numbers",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 111,
      "duration_ms": 0.5719,
      "test_file": "tests/agentnexus/control.test.ts",
      "test_declaration_line": 209,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "control",
        "local_integration",
        "negative"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 111,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0020",
      "stable_case_id": "CASE-61c18413db2f151f7af2",
      "ordinal": 20,
      "tap_local_ordinal": 20,
      "tap_indent": 0,
      "name": "JSON uses real JSON.parse and preserves independent safety/authorization dimensions",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 117,
      "duration_ms": 6.3624,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 22,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 117,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0021",
      "stable_case_id": "CASE-409d8cde07bcfc0225dd",
      "ordinal": 21,
      "tap_local_ordinal": 21,
      "tap_indent": 0,
      "name": "Python AST actually parses valid/invalid source, with explicitly limited coverage",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 123,
      "duration_ms": 433.5544,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 42,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration",
        "negative"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 123,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0022",
      "stable_case_id": "CASE-6e4d7f19a04ca9030f92",
      "ordinal": 22,
      "tap_local_ordinal": 22,
      "tap_indent": 0,
      "name": "PowerShell Parser actually returns AST diagnostics and UTF-16 positions",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 129,
      "duration_ms": 818.1031,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 74,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 129,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0023",
      "stable_case_id": "CASE-3dd1a0b0ab95fdffdf9e",
      "ordinal": 23,
      "tap_local_ordinal": 23,
      "tap_indent": 0,
      "name": "Python and PowerShell source side effects remain unexecuted",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 135,
      "duration_ms": 382.914,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 88,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 135,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0024",
      "stable_case_id": "CASE-8abb81f18b73d9398f1c",
      "ordinal": 24,
      "tap_local_ordinal": 24,
      "tap_indent": 0,
      "name": "all relevant source Feature OFF paths bypass without a configured parser",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 141,
      "duration_ms": 0.4717,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 110,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 141,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0025",
      "stable_case_id": "CASE-01b69608c70d9d355709",
      "ordinal": 25,
      "tap_local_ordinal": 25,
      "tap_indent": 0,
      "name": "optional environment/safety OFF remains BYPASSED while syntax independently runs",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 147,
      "duration_ms": 0.6016,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 126,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 147,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0026",
      "stable_case_id": "CASE-b9e06e320ba56ef2915f",
      "ordinal": 26,
      "tap_local_ordinal": 26,
      "tap_indent": 0,
      "name": "missing parsers and unsupported languages/dialects never produce PASS",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 153,
      "duration_ms": 0.5408,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 136,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 153,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0027",
      "stable_case_id": "CASE-5a59867d1bc148a83e71",
      "ordinal": 27,
      "tap_local_ordinal": 27,
      "tap_indent": 0,
      "name": "new document version, same-version hash mismatch and close fence old results",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 159,
      "duration_ms": 0.7487,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 151,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 159,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0028",
      "stable_case_id": "CASE-46748265536fc366737b",
      "ordinal": 28,
      "tap_local_ordinal": 28,
      "tap_indent": 0,
      "name": "real parser requests respect newer versions and Feature epoch changes",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 165,
      "duration_ms": 147.0285,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 171,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 165,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0029",
      "stable_case_id": "CASE-accc001719368a63bb38",
      "ordinal": 29,
      "tap_local_ordinal": 29,
      "tap_indent": 0,
      "name": "AbortSignal, timeout and dispose are bounded and never become PASS",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 171,
      "duration_ms": 1.3393,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 193,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "fault_recovery",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 171,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0030",
      "stable_case_id": "CASE-6255ca37710b442bb2fe",
      "ordinal": 30,
      "tap_local_ordinal": 30,
      "tap_indent": 0,
      "name": "source/Unicode/request budgets reject before parsing and constructor budgets are fixed",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 177,
      "duration_ms": 0.6055,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 215,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration",
        "negative"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 177,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0031",
      "stable_case_id": "CASE-bdcfbe85d595674606d5",
      "ordinal": 31,
      "tap_local_ordinal": 31,
      "tap_indent": 0,
      "name": "queue admission caps concurrent work and recovers after backpressure",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 183,
      "duration_ms": 2.1428,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 226,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "concurrency",
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 183,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0032",
      "stable_case_id": "CASE-1d7d52e12752e631fcd0",
      "ordinal": 32,
      "tap_local_ordinal": 32,
      "tap_indent": 0,
      "name": "PowerShell error floods remain bounded and do not turn truncation into PASS",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 189,
      "duration_ms": 510.9983,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 236,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 189,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0033",
      "stable_case_id": "CASE-f09ee169b41dd35e6241",
      "ordinal": 33,
      "tap_local_ordinal": 33,
      "tap_indent": 0,
      "name": "registered Git/Python argv schemas are static, limited and independently typed",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 195,
      "duration_ms": 1.5155,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 247,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 195,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0034",
      "stable_case_id": "CASE-3c951fd4c2e9620678ff",
      "ordinal": 34,
      "tap_local_ordinal": 34,
      "tap_indent": 0,
      "name": "argv environment checks inspect only the Host file and preserve the actual args result",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 201,
      "duration_ms": 0.7813,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 271,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 201,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0035",
      "stable_case_id": "CASE-6d45f2fbe9f74154f947",
      "ordinal": 35,
      "tap_local_ordinal": 35,
      "tap_indent": 0,
      "name": "argv family and values are copied before asynchronous work",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 207,
      "duration_ms": 0.2249,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 281,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 207,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0036",
      "stable_case_id": "CASE-426ed51b62a51f4e8625",
      "ordinal": 36,
      "tap_local_ordinal": 36,
      "tap_indent": 0,
      "name": "argument Feature OFF bypasses schema and dispose prevents subsequent work",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 213,
      "duration_ms": 0.2097,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 294,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 213,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0037",
      "stable_case_id": "CASE-a0adddb19983c74f3eb0",
      "ordinal": 37,
      "tap_local_ordinal": 37,
      "tap_indent": 0,
      "name": "disposeAndWait confirms real interpreter child close and all queued work is drained",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 219,
      "duration_ms": 97.1763,
      "test_file": "tests/agentnexus/diagnostics.test.ts",
      "test_declaration_line": 305,
      "source_files": [
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "concurrency",
        "diagnostics",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 219,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0038",
      "stable_case_id": "CASE-5043835c413f07a444d2",
      "ordinal": 38,
      "tap_local_ordinal": 38,
      "tap_indent": 0,
      "name": "AT/Context/Artifact: real invocation produces separate hash-linked facts and byte-exact output",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 225,
      "duration_ms": 166.3404,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 39,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "gateway",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 225,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0039",
      "stable_case_id": "CASE-32b3704035c6a7b868f5",
      "ordinal": 39,
      "tap_local_ordinal": 39,
      "tap_indent": 0,
      "name": "P.MODE+Gateway: same safe synthetic operation blocked/enforced, would-deny, and unevaluated",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 231,
      "duration_ms": 173.0621,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 52,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "gateway",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 231,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0040",
      "stable_case_id": "CASE-915ccb8d3c9d0d20e46a",
      "ordinal": 40,
      "tap_local_ordinal": 40,
      "tap_indent": 0,
      "name": "P.SANDBOX: DISABLED does not admit arbitrary execution or close independent protection",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 237,
      "duration_ms": 64.1717,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 62,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "gateway",
        "local_integration",
        "permissions"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 237,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0041",
      "stable_case_id": "CASE-a29f969fa7fe989e858b",
      "ordinal": 41,
      "tap_local_ordinal": 41,
      "tap_indent": 0,
      "name": "P.IDENTITY: facade has no administration and JSON admin/mode flags cannot elevate",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 243,
      "duration_ms": 47.3077,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 69,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "gateway",
        "local_integration",
        "permissions"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 243,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0042",
      "stable_case_id": "CASE-a0029638c1ffcd5b7033",
      "ordinal": 42,
      "tap_local_ordinal": 42,
      "tap_indent": 0,
      "name": "P.APPROVAL_REPLAY: exact approval executes once; altered intent and replay denied",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 249,
      "duration_ms": 125.8512,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 76,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "gateway",
        "local_integration",
        "negative",
        "permissions"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 249,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0043",
      "stable_case_id": "CASE-ca04917d25c5c6f2ad25",
      "ordinal": 43,
      "tap_local_ordinal": 43,
      "tap_indent": 0,
      "name": "P.DB_ATOMIC: 16 concurrent duplicate requests invoke a real handler at most once",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 255,
      "duration_ms": 93.3012,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 88,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "concurrency",
        "gateway",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 255,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0044",
      "stable_case_id": "CASE-045090acef00c2e5bccf",
      "ordinal": 44,
      "tap_local_ordinal": 44,
      "tap_indent": 0,
      "name": "P.WORKSPACE_WRITER: concurrent distinct calls cannot overwrite active resource; modes cannot change mid-action",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 261,
      "duration_ms": 116.2973,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 94,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "concurrency",
        "gateway",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 261,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0045",
      "stable_case_id": "CASE-df1285807908e79c2229",
      "ordinal": 45,
      "tap_local_ordinal": 45,
      "tap_indent": 0,
      "name": "AT-IOFAIL-before: actual SQLite readonly persistence failure prevents handler execution",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 267,
      "duration_ms": 102.1128,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 107,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "fault_recovery",
        "gateway",
        "local_integration",
        "negative"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 267,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0046",
      "stable_case_id": "CASE-4874a66b53142d38a25d",
      "ordinal": 46,
      "tap_local_ordinal": 46,
      "tap_indent": 0,
      "name": "AT-IOFAIL-after: actual effect with unrecordable result keeps claim and never replays",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 273,
      "duration_ms": 95.1152,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 113,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "gateway",
        "local_integration",
        "negative"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 273,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0047",
      "stable_case_id": "CASE-d06fb8f1203de39ba200",
      "ordinal": 47,
      "tap_local_ordinal": 47,
      "tap_indent": 0,
      "name": "P.TIMEOUT: timeout retains owned lease until actual handler settlement and never resets claim",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 279,
      "duration_ms": 104.6834,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 122,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "concurrency",
        "fault_recovery",
        "gateway",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 279,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0048",
      "stable_case_id": "CASE-a44be26a6f3778c588d2",
      "ordinal": 48,
      "tap_local_ordinal": 48,
      "tap_indent": 0,
      "name": "AT-REPLAY: reconstruction is readonly and session scope does not grant peer context",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 285,
      "duration_ms": 94.8365,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 132,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "gateway",
        "local_integration",
        "negative",
        "permissions"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 285,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0049",
      "stable_case_id": "CASE-d57c655227797ba0ca79",
      "ordinal": 49,
      "tap_local_ordinal": 49,
      "tap_indent": 0,
      "name": "P.IDENTITY-revocation: old facade cannot read or close a replacement session",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 291,
      "duration_ms": 138.2991,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 141,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "gateway",
        "local_integration",
        "permissions"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 291,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0050",
      "stable_case_id": "CASE-b705682b0d7d3b95b3d3",
      "ordinal": 50,
      "tap_local_ordinal": 50,
      "tap_indent": 0,
      "name": "P.IDENTITY-close-race: close revokes facade before its first asynchronous cleanup",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 297,
      "duration_ms": 98.8032,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 147,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "concurrency",
        "gateway",
        "local_integration",
        "permissions"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 297,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0051",
      "stable_case_id": "CASE-f58916370aac40b545ab",
      "ordinal": 51,
      "tap_local_ordinal": 51,
      "tap_indent": 0,
      "name": "P.TIMEOUT-clock: handler deadline uses elapsed time under a wall-clock rollback",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 303,
      "duration_ms": 113.0805,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 155,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "fault_recovery",
        "gateway",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Controlled clock override"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 303,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0052",
      "stable_case_id": "CASE-f5064097e608de32a56d",
      "ordinal": 52,
      "tap_local_ordinal": 52,
      "tap_indent": 0,
      "name": "P.MODE-START: a bypass expiring during a real delayed durability barrier cannot execute",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 309,
      "duration_ms": 486.4564,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 164,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "gateway",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 309,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0053",
      "stable_case_id": "CASE-2927cf10f11bd1e68a2a",
      "ordinal": 53,
      "tap_local_ordinal": 53,
      "tap_indent": 0,
      "name": "DI integration: malformed code remains FAIL, checks OFF are BYPASSED, raw/audit continue",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 315,
      "duration_ms": 164.3713,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 173,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "gateway",
        "local_integration",
        "negative"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 315,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0054",
      "stable_case_id": "CASE-d40c58abacc2737a1bbb",
      "ordinal": 54,
      "tap_local_ordinal": 54,
      "tap_indent": 0,
      "name": "Tool OFF rejects invocation, diagnostics log OFF does not silence core audit, oversized request is bounded",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 321,
      "duration_ms": 70.0373,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 184,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "gateway",
        "local_integration",
        "negative"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 321,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0055",
      "stable_case_id": "CASE-22a3b2cf9f088c842dbb",
      "ordinal": 55,
      "tap_local_ordinal": 55,
      "tap_indent": 0,
      "name": "P.ARG_BINDING: mutation by schema or caller cannot replace the authorized snapshot",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 327,
      "duration_ms": 86.8136,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 192,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "gateway",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 327,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0056",
      "stable_case_id": "CASE-75fe4dcdeb820101493e",
      "ordinal": 56,
      "tap_local_ordinal": 56,
      "tap_indent": 0,
      "name": "DI command checking keeps argv preview as data and cannot execute Git/Python",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 333,
      "duration_ms": 93.4785,
      "test_file": "tests/agentnexus/gateway.test.ts",
      "test_declaration_line": 198,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/checkers/powershell_ast.ps1",
        "src/agentnexus/checkers/python_ast.py",
        "src/agentnexus/control.ts",
        "src/agentnexus/diagnostics.ts",
        "src/agentnexus/features.ts",
        "src/agentnexus/gateway.ts",
        "src/agentnexus/host.ts",
        "src/agentnexus/policy.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "gateway",
        "local_integration"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": true,
      "fake_backend_scope": "Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.",
      "uses_test_doubles_or_spies": true,
      "test_double_details": [
        "Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source"
      ],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 333,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0057",
      "stable_case_id": "CASE-580d7ae0841d16e502e5",
      "ordinal": 57,
      "tap_local_ordinal": 57,
      "tap_indent": 0,
      "name": "controlled static bytes close over binary, empty and nested same-name files",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 339,
      "duration_ms": 46.0737,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 61,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 339,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0058",
      "stable_case_id": "CASE-7cc653f2c97bb80de7fd",
      "ordinal": 58,
      "tap_local_ordinal": 58,
      "tap_indent": 0,
      "name": "empty package permits exactly its manifest, with zero payload budgets",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 345,
      "duration_ms": 5.7818,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 80,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 345,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0059",
      "stable_case_id": "CASE-97863c93cde42f1465cb",
      "ordinal": 59,
      "tap_local_ordinal": 59,
      "tap_indent": 0,
      "name": "matching mutable tree is INCONCLUSIVE, never a trusted release root",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 351,
      "duration_ms": 7.2545,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 88,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "concurrency",
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 351,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0060",
      "stable_case_id": "CASE-f3531c1e39579eac3eec",
      "ordinal": 60,
      "tap_local_ordinal": 60,
      "tap_indent": 0,
      "name": "same-size modified content fails its SHA-256",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 357,
      "duration_ms": 7.5368,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 97,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 357,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0061",
      "stable_case_id": "CASE-7a6da7d0062fa78334cc",
      "ordinal": 61,
      "tap_local_ordinal": 61,
      "tap_indent": 0,
      "name": "appended content fails declared byte size",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 363,
      "duration_ms": 6.0254,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 104,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 363,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0062",
      "stable_case_id": "CASE-d944b484f3f4ea42f792",
      "ordinal": 62,
      "tap_local_ordinal": 62,
      "tap_indent": 0,
      "name": "missing and unlisted files are both reported by full relative path",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 369,
      "duration_ms": 7.3039,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 111,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 369,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0063",
      "stable_case_id": "CASE-76f5b95aaf14c79eec77",
      "ordinal": 63,
      "tap_local_ordinal": 1,
      "tap_indent": 4,
      "name": "sub/manifest.json",
      "parents": [
        "unlisted nested manifest and SHA256SUMS names are never self exceptions"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 376,
      "duration_ms": 7.3023,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 121,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 376,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0064",
      "stable_case_id": "CASE-9be6f43c1533e43ef69f",
      "ordinal": 64,
      "tap_local_ordinal": 2,
      "tap_indent": 4,
      "name": "validation/SHA256SUMS.txt",
      "parents": [
        "unlisted nested manifest and SHA256SUMS names are never self exceptions"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 382,
      "duration_ms": 8.2442,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 121,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 382,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0065",
      "stable_case_id": "CASE-a122280074f801f4d277",
      "ordinal": 65,
      "tap_local_ordinal": 3,
      "tap_indent": 4,
      "name": "unexpected.cjs",
      "parents": [
        "unlisted nested manifest and SHA256SUMS names are never self exceptions"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 388,
      "duration_ms": 5.8195,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 121,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 388,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0066",
      "stable_case_id": "CASE-7e179fcdbcbcc3d50c3e",
      "ordinal": 66,
      "tap_local_ordinal": 4,
      "tap_indent": 4,
      "name": ".hidden",
      "parents": [
        "unlisted nested manifest and SHA256SUMS names are never self exceptions"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 394,
      "duration_ms": 5.6043,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 121,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 394,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0067",
      "stable_case_id": "CASE-ec4a4e144f485b311f74",
      "ordinal": 67,
      "tap_local_ordinal": 63,
      "tap_indent": 0,
      "name": "unlisted nested manifest and SHA256SUMS names are never self exceptions",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 400,
      "duration_ms": 27.7673,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 121,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 400,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0068",
      "stable_case_id": "CASE-77c9b3989326c16211e3",
      "ordinal": 68,
      "tap_local_ordinal": 64,
      "tap_indent": 0,
      "name": "root manifest is required and cannot list itself",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 406,
      "duration_ms": 5.331,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 135,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 406,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0069",
      "stable_case_id": "CASE-ca8653f6705de6febe48",
      "ordinal": 69,
      "tap_local_ordinal": 65,
      "tap_indent": 0,
      "name": "root manifest directory and non-directory roots fail",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 412,
      "duration_ms": 4.4881,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 142,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 412,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0070",
      "stable_case_id": "CASE-d678688974b1191c703b",
      "ordinal": 70,
      "tap_local_ordinal": 66,
      "tap_indent": 0,
      "name": "duplicate JSON keys are rejected despite JSON.parse last-wins semantics",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 418,
      "duration_ms": 6.3436,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 151,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 418,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0071",
      "stable_case_id": "CASE-cc4313d923fdc023dacd",
      "ordinal": 71,
      "tap_local_ordinal": 67,
      "tap_indent": 0,
      "name": "duplicate complete path and unsorted arrays fail independently",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 424,
      "duration_ms": 5.428,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 161,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 424,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0072",
      "stable_case_id": "CASE-af0bb9a60181469f8d1f",
      "ordinal": 72,
      "tap_local_ordinal": 1,
      "tap_indent": 4,
      "name": "A vs a",
      "parents": [
        "case conflicts include ancestor directories and file-directory prefixes"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 431,
      "duration_ms": 4.0673,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 169,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 431,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0073",
      "stable_case_id": "CASE-af683f83fce0d7da9f1c",
      "ordinal": 73,
      "tap_local_ordinal": 2,
      "tap_indent": 4,
      "name": "Dir/a vs dir/b",
      "parents": [
        "case conflicts include ancestor directories and file-directory prefixes"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 437,
      "duration_ms": 4.2427,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 169,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 437,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0074",
      "stable_case_id": "CASE-ccce1de12d6bac8db042",
      "ordinal": 74,
      "tap_local_ordinal": 3,
      "tap_indent": 4,
      "name": "a vs a/b",
      "parents": [
        "case conflicts include ancestor directories and file-directory prefixes"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 443,
      "duration_ms": 6.5029,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 169,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 443,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0075",
      "stable_case_id": "CASE-d987ea53b13fe0c675e2",
      "ordinal": 75,
      "tap_local_ordinal": 68,
      "tap_indent": 0,
      "name": "case conflicts include ancestor directories and file-directory prefixes",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 449,
      "duration_ms": 15.3344,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 169,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 449,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0076",
      "stable_case_id": "CASE-a0752f1a35ea962d0f9c",
      "ordinal": 76,
      "tap_local_ordinal": 1,
      "tap_indent": 4,
      "name": "\"../outside\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 456,
      "duration_ms": 5.2886,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 456,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0077",
      "stable_case_id": "CASE-878ac6e3ed40924e1a7b",
      "ordinal": 77,
      "tap_local_ordinal": 2,
      "tap_indent": 4,
      "name": "\"./a\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 462,
      "duration_ms": 4.7405,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 462,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0078",
      "stable_case_id": "CASE-5d3a50f41384e4f84578",
      "ordinal": 78,
      "tap_local_ordinal": 3,
      "tap_indent": 4,
      "name": "\"a//b\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 468,
      "duration_ms": 5.1763,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 468,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0079",
      "stable_case_id": "CASE-644ea7b0a1ca1439e830",
      "ordinal": 79,
      "tap_local_ordinal": 4,
      "tap_indent": 4,
      "name": "\"/outside\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 474,
      "duration_ms": 4.5287,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 474,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0080",
      "stable_case_id": "CASE-0443cb365acacd92a5f3",
      "ordinal": 80,
      "tap_local_ordinal": 5,
      "tap_indent": 4,
      "name": "\"C:/outside\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 480,
      "duration_ms": 4.4399,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 480,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0081",
      "stable_case_id": "CASE-9870aec09750c398b742",
      "ordinal": 81,
      "tap_local_ordinal": 6,
      "tap_indent": 4,
      "name": "\"//server/share\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 486,
      "duration_ms": 5.047,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 486,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0082",
      "stable_case_id": "CASE-ad1195708ae9d5194e32",
      "ordinal": 82,
      "tap_local_ordinal": 7,
      "tap_indent": 4,
      "name": "\"a\\\\\\\\b\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 492,
      "duration_ms": 5.4682,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 492,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0083",
      "stable_case_id": "CASE-071d20eb432f4f182ed4",
      "ordinal": 83,
      "tap_local_ordinal": 8,
      "tap_indent": 4,
      "name": "\"a:stream\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 498,
      "duration_ms": 4.4504,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 498,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0084",
      "stable_case_id": "CASE-434f715550d7c7a7d643",
      "ordinal": 84,
      "tap_local_ordinal": 9,
      "tap_indent": 4,
      "name": "\"NUL.txt\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 504,
      "duration_ms": 4.8727,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 504,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0085",
      "stable_case_id": "CASE-752219794bc6d79ed8b6",
      "ordinal": 85,
      "tap_local_ordinal": 10,
      "tap_indent": 4,
      "name": "\"COM1\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 510,
      "duration_ms": 5.5261,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 510,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0086",
      "stable_case_id": "CASE-c9bd303fc56a4b937362",
      "ordinal": 86,
      "tap_local_ordinal": 11,
      "tap_indent": 4,
      "name": "\"con.tar.gz\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 516,
      "duration_ms": 4.7166,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 516,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0087",
      "stable_case_id": "CASE-e46020b31fad395d5551",
      "ordinal": 87,
      "tap_local_ordinal": 12,
      "tap_indent": 4,
      "name": "\"a.\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 522,
      "duration_ms": 4.5538,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 522,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0088",
      "stable_case_id": "CASE-7c0d57b2413cd39fd30b",
      "ordinal": 88,
      "tap_local_ordinal": 13,
      "tap_indent": 4,
      "name": "\"a \"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 528,
      "duration_ms": 5.7142,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 528,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0089",
      "stable_case_id": "CASE-6b0357109fcaf8941318",
      "ordinal": 89,
      "tap_local_ordinal": 14,
      "tap_indent": 4,
      "name": "\"PROGRA~1/file\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 534,
      "duration_ms": 4.9382,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 534,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0090",
      "stable_case_id": "CASE-8bff36483b283399ff8a",
      "ordinal": 90,
      "tap_local_ordinal": 15,
      "tap_indent": 4,
      "name": "\"\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 540,
      "duration_ms": 4.7052,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 540,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0091",
      "stable_case_id": "CASE-d86140b938ee30115fc0",
      "ordinal": 91,
      "tap_local_ordinal": 16,
      "tap_indent": 4,
      "name": "\"a\\\\u0000b\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 546,
      "duration_ms": 4.9186,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 546,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0092",
      "stable_case_id": "CASE-81324ee653d7c4a40020",
      "ordinal": 92,
      "tap_local_ordinal": 17,
      "tap_indent": 4,
      "name": "\"é\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 552,
      "duration_ms": 5.1454,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 552,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0093",
      "stable_case_id": "CASE-1c24092e6e4737778913",
      "ordinal": 93,
      "tap_local_ordinal": 18,
      "tap_indent": 4,
      "name": "\"é\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 558,
      "duration_ms": 5.125,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 558,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0094",
      "stable_case_id": "CASE-4c0f0891da5c725525c6",
      "ordinal": 94,
      "tap_local_ordinal": 19,
      "tap_indent": 4,
      "name": "\"İ\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 564,
      "duration_ms": 5.6558,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 564,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0095",
      "stable_case_id": "CASE-c6e70f41d947686eaf1b",
      "ordinal": 95,
      "tap_local_ordinal": 20,
      "tap_indent": 4,
      "name": "\"a/a/\"",
      "parents": [
        "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
      ],
      "status": "PASS",
      "reason": null,
      "log_line": 570,
      "duration_ms": 4.7794,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 570,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0096",
      "stable_case_id": "CASE-1c38a86e6032ecfc8172",
      "ordinal": 96,
      "tap_local_ordinal": 69,
      "tap_indent": 0,
      "name": "path traversal, device aliases, malformed separators and Unicode reject before payload reads",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 576,
      "duration_ms": 102.2502,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 183,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 576,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0097",
      "stable_case_id": "CASE-507cc7860fae5a176d9e",
      "ordinal": 97,
      "tap_local_ordinal": 70,
      "tap_indent": 0,
      "name": "schema, digest and byte count reject invalid declarations",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 582,
      "duration_ms": 15.3417,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 203,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 582,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0098",
      "stable_case_id": "CASE-d0949b726f93f5eba5f3",
      "ordinal": 98,
      "tap_local_ordinal": 71,
      "tap_indent": 0,
      "name": "canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 588,
      "duration_ms": 10.6302,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 220,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 588,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0099",
      "stable_case_id": "CASE-b9708645ea691a281e6f",
      "ordinal": 99,
      "tap_local_ordinal": 72,
      "tap_indent": 0,
      "name": "extra empty directory and file-vs-directory mismatch cannot disappear",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 594,
      "duration_ms": 8.289,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 232,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 594,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0100",
      "stable_case_id": "CASE-e3b4deae85a31cb795a5",
      "ordinal": 100,
      "tap_local_ordinal": 73,
      "tap_indent": 0,
      "name": "file count and total bytes budgets work at exact limit and limit plus one",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 600,
      "duration_ms": 9.5833,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 242,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 600,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0101",
      "stable_case_id": "CASE-391df7e0c8cbf1a1c777",
      "ordinal": 101,
      "tap_local_ordinal": 74,
      "tap_indent": 0,
      "name": "actual unlisted content also consumes size and count budgets",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 606,
      "duration_ms": 6.2789,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 252,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 606,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0102",
      "stable_case_id": "CASE-b58b09d6d81426aa34e2",
      "ordinal": 102,
      "tap_local_ordinal": 75,
      "tap_indent": 0,
      "name": "manifest and single-file caps are enforced without reading an oversized payload",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 612,
      "duration_ms": 5.8979,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 261,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 612,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0103",
      "stable_case_id": "CASE-d0f9d1c729457c22eca1",
      "ordinal": 103,
      "tap_local_ordinal": 76,
      "tap_indent": 0,
      "name": "path length and depth have bounded rejection",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 618,
      "duration_ms": 5.9978,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 273,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 618,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0104",
      "stable_case_id": "CASE-68fabba08fc4e5e7f64f",
      "ordinal": 104,
      "tap_local_ordinal": 77,
      "tap_indent": 0,
      "name": "actual default file and directory count limits accept the edge and reject one more",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 624,
      "duration_ms": 1040.7113,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 281,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "fault_recovery",
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 624,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0105",
      "stable_case_id": "CASE-611b8e274cd33da11948",
      "ordinal": 105,
      "tap_local_ordinal": 78,
      "tap_indent": 0,
      "name": "actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 630,
      "duration_ms": 47.3515,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 303,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 630,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0106",
      "stable_case_id": "CASE-8065056792b072f822c6",
      "ordinal": 106,
      "tap_local_ordinal": 79,
      "tap_indent": 0,
      "name": "maximum component and depth are accepted on an actually created portable path",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 636,
      "duration_ms": 31.8846,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 318,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 636,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0107",
      "stable_case_id": "CASE-3f7296c282e0a51056cc",
      "ordinal": 107,
      "tap_local_ordinal": 80,
      "tap_indent": 0,
      "name": "Host cannot expand limits or choose an unknown mode; relative roots reject",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 642,
      "duration_ms": 3.2713,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 327,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 642,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0108",
      "stable_case_id": "CASE-e70f0f3c690ea58c3732",
      "ordinal": 108,
      "tap_local_ordinal": 81,
      "tap_indent": 0,
      "name": "pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 648,
      "duration_ms": 6.9132,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 342,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 648,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0109",
      "stable_case_id": "CASE-bf34680e7800441b6a10",
      "ordinal": 109,
      "tap_local_ordinal": 82,
      "tap_indent": 0,
      "name": "diagnostic count and encoded bytes remain bounded for many extra files",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 654,
      "duration_ms": 53.6636,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 355,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 654,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0110",
      "stable_case_id": "CASE-6de984248773d9ecc9a0",
      "ordinal": 110,
      "tap_local_ordinal": 83,
      "tap_indent": 0,
      "name": "candidate scripts, package metadata and git-looking files are data and never executed",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 660,
      "duration_ms": 13.6591,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 366,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "unit_and_filesystem"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 660,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0111",
      "stable_case_id": "CASE-cbeb8642e2c3ac73d095",
      "ordinal": 111,
      "tap_local_ordinal": 84,
      "tap_indent": 0,
      "name": "real OS file symlink is rejected without following its target",
      "parents": [],
      "status": "NOT_RUN",
      "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
      "log_line": 666,
      "duration_ms": 4.6256,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 381,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "permissions",
        "unit_and_filesystem"
      ],
      "execution_status": "NOT_RUN",
      "actually_executed": false,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 666,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0112",
      "stable_case_id": "CASE-5c2055d46eda7c1b3090",
      "ordinal": 112,
      "tap_local_ordinal": 85,
      "tap_indent": 0,
      "name": "real OS dir link is rejected",
      "parents": [],
      "status": "NOT_RUN",
      "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
      "log_line": 672,
      "duration_ms": 4.2473,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 392,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "unit_and_filesystem"
      ],
      "execution_status": "NOT_RUN",
      "actually_executed": false,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 672,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0113",
      "stable_case_id": "CASE-233fcbf702dd705ca89a",
      "ordinal": 113,
      "tap_local_ordinal": 86,
      "tap_indent": 0,
      "name": "real OS junction link is rejected",
      "parents": [],
      "status": "NOT_RUN",
      "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
      "log_line": 678,
      "duration_ms": 4.4716,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 392,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "permissions",
        "unit_and_filesystem"
      ],
      "execution_status": "NOT_RUN",
      "actually_executed": false,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 678,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0114",
      "stable_case_id": "CASE-9e9ff1ff4d489d69ec69",
      "ordinal": 114,
      "tap_local_ordinal": 87,
      "tap_indent": 0,
      "name": "real OS hardlink to an outside object is rejected by link count",
      "parents": [],
      "status": "NOT_RUN",
      "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
      "log_line": 684,
      "duration_ms": 4.1604,
      "test_file": "tests/agentnexus/integrity.test.ts",
      "test_declaration_line": 405,
      "source_files": [
        "src/agentnexus/integrity.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "integrity",
        "negative",
        "permissions",
        "unit_and_filesystem"
      ],
      "execution_status": "NOT_RUN",
      "actually_executed": false,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 684,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0115",
      "stable_case_id": "CASE-c2e68cbc3bd689271c4d",
      "ordinal": 115,
      "tap_local_ordinal": 88,
      "tap_indent": 0,
      "name": "real SQLite, three independent domain chains and global pagination",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 690,
      "duration_ms": 108.0035,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 66,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "local_integration",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 690,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0116",
      "stable_case_id": "CASE-6ab08c83ab7ab31b6ac5",
      "ordinal": 116,
      "tap_local_ordinal": 89,
      "tap_indent": 0,
      "name": "synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 696,
      "duration_ms": 28.4596,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 86,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "fault_recovery",
        "local_integration",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 696,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0117",
      "stable_case_id": "CASE-efdeb9e4b77f16fb0e08",
      "ordinal": 117,
      "tap_local_ordinal": 90,
      "tap_indent": 0,
      "name": "agent and session SQL filters apply before LIMIT and preserve global cursor pages",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 702,
      "duration_ms": 221.0731,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 104,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "local_integration",
        "permissions",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 702,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0118",
      "stable_case_id": "CASE-8e7ac512df2949295a92",
      "ordinal": 118,
      "tap_local_ordinal": 91,
      "tap_indent": 0,
      "name": "flush covers its captured target after an empty or older shared flush",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 708,
      "duration_ms": 30.9032,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 126,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "local_integration",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 708,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0119",
      "stable_case_id": "CASE-730bcf4f196f7e41db45",
      "ordinal": 119,
      "tap_local_ordinal": 92,
      "tap_indent": 0,
      "name": "required fields, malformed refs, oversized envelopes and query budgets reject without fault",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 714,
      "duration_ms": 25.4093,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 139,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "fault_recovery",
        "local_integration",
        "negative",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 714,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0120",
      "stable_case_id": "CASE-4004cec851059fd3accf",
      "ordinal": 120,
      "tap_local_ordinal": 93,
      "tap_indent": 0,
      "name": "outbox high water rejects new records, then drains without unbounded queues",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 720,
      "duration_ms": 36.2069,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 152,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "concurrency",
        "local_integration",
        "negative",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 720,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0121",
      "stable_case_id": "CASE-552bf963ecca2e1a3a23",
      "ordinal": 121,
      "tap_local_ordinal": 94,
      "tap_indent": 0,
      "name": "second writer and live lock recovery are blocked; real owner death is explicit",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 726,
      "duration_ms": 230.5204,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 167,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "fault_recovery",
        "local_integration",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 726,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0122",
      "stable_case_id": "CASE-52fbe13dc7dabbf76806",
      "ordinal": 122,
      "tap_local_ordinal": 95,
      "tap_indent": 0,
      "name": "process crash after file fsync and before receipt reexports no duplicate",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 732,
      "duration_ms": 205.5032,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 178,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "fault_recovery",
        "local_integration",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 732,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0123",
      "stable_case_id": "CASE-e5aa3ec66cc716cdf46a",
      "ordinal": 123,
      "tap_local_ordinal": 96,
      "tap_indent": 0,
      "name": "unacknowledged crash tail is preserved then repaired from durable outbox",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 738,
      "duration_ms": 455.5491,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 189,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "fault_recovery",
        "local_integration",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 738,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0124",
      "stable_case_id": "CASE-bf0d81a155f4a5158918",
      "ordinal": 124,
      "tap_local_ordinal": 97,
      "tap_indent": 0,
      "name": "actual export I/O failure freezes writes and preserves outbox until explicit recovery",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 744,
      "duration_ms": 32.0677,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 203,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "fault_recovery",
        "local_integration",
        "negative",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 744,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0125",
      "stable_case_id": "CASE-beece81a082ea6c786e6",
      "ordinal": 125,
      "tap_local_ordinal": 98,
      "tap_indent": 0,
      "name": "acknowledged truncation is never silently discarded or rebuilt as success",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 750,
      "duration_ms": 22.345,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 218,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "local_integration",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 750,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0126",
      "stable_case_id": "CASE-8bd29b46a53a43f2460f",
      "ordinal": 126,
      "tap_local_ordinal": 99,
      "tap_indent": 0,
      "name": "actual artifact publication I/O failure retains bytes and freezes both record and object admission",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 756,
      "duration_ms": 28.9865,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 228,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "fault_recovery",
        "local_integration",
        "negative",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 756,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0127",
      "stable_case_id": "CASE-4fded14ec03f3aef079a",
      "ordinal": 127,
      "tap_local_ordinal": 100,
      "tap_indent": 0,
      "name": "database hash tampering throws, freezes writes and does not fake repair",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 762,
      "duration_ms": 20.8347,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 242,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "fault_recovery",
        "local_integration",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 762,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0128",
      "stable_case_id": "CASE-e61a559c937e57ffafa2",
      "ordinal": 128,
      "tap_local_ordinal": 101,
      "tap_indent": 0,
      "name": "32 MiB randomized artifact roundtrip streams with real backpressure and two hashes",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 768,
      "duration_ms": 275.7796,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 250,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "concurrency",
        "local_integration",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 768,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0129",
      "stable_case_id": "CASE-a6b7169199f1ed5a12eb",
      "ordinal": 129,
      "tap_local_ordinal": 102,
      "tap_indent": 0,
      "name": "cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 774,
      "duration_ms": 32.4128,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 271,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "local_integration",
        "negative",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 774,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0130",
      "stable_case_id": "CASE-a52cc5811ba38a048f03",
      "ordinal": 130,
      "tap_local_ordinal": 103,
      "tap_indent": 0,
      "name": "early artifact iterator return is not verification; full corrupted stream fails closed",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 780,
      "duration_ms": 39.9431,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 287,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "fault_recovery",
        "local_integration",
        "negative",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 780,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0131",
      "stable_case_id": "CASE-99bf8981dd152ecc15ad",
      "ordinal": 131,
      "tap_local_ordinal": 104,
      "tap_indent": 0,
      "name": "concurrent artifact admission is bounded and rejects a third stream without queueing",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 786,
      "duration_ms": 42.405,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 298,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "concurrency",
        "local_integration",
        "negative",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 786,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0132",
      "stable_case_id": "CASE-e9172aafc361d0f22096",
      "ordinal": 132,
      "tap_local_ordinal": 105,
      "tap_indent": 0,
      "name": "abort races a permanently pending source.next without retaining Store writers or accepting late bytes",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 792,
      "duration_ms": 21.5713,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 310,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "concurrency",
        "local_integration",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 792,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0133",
      "stable_case_id": "CASE-b4fcf1b06955c6bc5187",
      "ordinal": 133,
      "tap_local_ordinal": 106,
      "tap_indent": 0,
      "name": "concurrent close calls share the real drain and lock-release promise",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 798,
      "duration_ms": 20.3931,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 333,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "concurrency",
        "local_integration",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 798,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0134",
      "stable_case_id": "CASE-9bfea3c6e9ee024af2a7",
      "ordinal": 134,
      "tap_local_ordinal": 107,
      "tap_indent": 0,
      "name": "sealed segments are compressed, chained and verified; stored bit flip is detected",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 804,
      "duration_ms": 103.0305,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 348,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "local_integration",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 804,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    },
    {
      "test_id": "M1-FINAL-0135",
      "stable_case_id": "CASE-c6962c22ad95950eb7b3",
      "ordinal": 135,
      "tap_local_ordinal": 108,
      "tap_indent": 0,
      "name": "process-killed partial artifact remains retained without a complete object reference",
      "parents": [],
      "status": "PASS",
      "reason": null,
      "log_line": 810,
      "duration_ms": 199.2909,
      "test_file": "tests/agentnexus/storage.test.ts",
      "test_declaration_line": 360,
      "source_files": [
        "src/agentnexus/artifacts.ts",
        "src/agentnexus/records.ts",
        "src/agentnexus/storage.ts",
        "src/agentnexus/types.ts"
      ],
      "test_categories": [
        "local_integration",
        "storage"
      ],
      "execution_status": "PASS",
      "actually_executed": true,
      "uses_simulated_or_synthetic_data": true,
      "uses_fake_backend": false,
      "fake_backend_scope": "No model/provider backend; real local implementation and synthetic data.",
      "uses_test_doubles_or_spies": false,
      "test_double_details": [],
      "uses_fake_model_backend": false,
      "real_model_validation": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
        "line": 810,
        "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
      },
      "source_snapshot_binding": "Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json",
      "started_utc": "NOT_AVAILABLE",
      "ended_utc": "NOT_AVAILABLE",
      "timing_note": "Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized."
    }
  ],
  "all_original_M1_tap_runs": [
    {
      "run_id": "RUN-3d69c3cb1b1f03f3",
      "log": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
      "sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372",
      "bytes": 27367,
      "totals": {
        "tests": 135,
        "pass": 131,
        "fail": 0,
        "cancelled": 0,
        "skipped": 4,
        "todo": 0
      },
      "duration_ms": 14618.3748,
      "cases": [
        {
          "ordinal": 1,
          "tap_local_ordinal": 1,
          "tap_indent": 0,
          "name": "FT-RESOLVE: defaults, child narrowing, ancestor veto, explicit INHERIT",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 3,
          "duration_ms": 92.6004,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0001",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 3
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 2,
          "tap_local_ordinal": 2,
          "tap_indent": 0,
          "name": "FT: unknown IDs, illegal scopes and non-admin payloads rejected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 9,
          "duration_ms": 34.3366,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0002",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 9
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 3,
          "tap_local_ordinal": 3,
          "tap_indent": 0,
          "name": "FT-DEPENDENCY: rejects partial disable and does not enable a dependency implicitly",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 15,
          "duration_ms": 47.0369,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0003",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 15
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 4,
          "tap_local_ordinal": 4,
          "tap_indent": 0,
          "name": "FT: mutual conflict, wrong preview hash and stale revision cannot commit",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 21,
          "duration_ms": 49.5928,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0004",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 21
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 5,
          "tap_local_ordinal": 5,
          "tap_indent": 0,
          "name": "FT-OFF: live work aborts; failure remains FAILED until explicit recovery",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 27,
          "duration_ms": 50.8186,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0005",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 27
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 6,
          "tap_local_ordinal": 6,
          "tap_indent": 0,
          "name": "FT-RETAIN: configuration survives real reopen, facts remain and old epoch is invalid",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 33,
          "duration_ms": 65.8959,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0006",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 33
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 7,
          "tap_local_ordinal": 7,
          "tap_indent": 0,
          "name": "FT-INHERIT-OFF: ON to INHERIT must quiesce when default is OFF",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 39,
          "duration_ms": 54.6608,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0007",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 39
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 8,
          "tap_local_ordinal": 8,
          "tap_indent": 0,
          "name": "FT-LATE-STOP: timeout cannot recover or enable until the old stop actually settles",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 45,
          "duration_ms": 1057.8041,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0008",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 45
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 9,
          "tap_local_ordinal": 9,
          "tap_indent": 0,
          "name": "FT catalog is capacity, unimplemented module never becomes enabled from default ON",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 51,
          "duration_ms": 40.1658,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0009",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 51
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 10,
          "tap_local_ordinal": 10,
          "tap_indent": 0,
          "name": "P.ADMIN_MODE: forged admin, L0 degradation and missing reason rejected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 57,
          "duration_ms": 32.7851,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0010",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 57
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 11,
          "tap_local_ordinal": 11,
          "tap_indent": 0,
          "name": "P.ADMIN_MODE: two distinct confirmations, preview binding and challenge replay",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 63,
          "duration_ms": 42.8062,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0011",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 63
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 12,
          "tap_local_ordinal": 12,
          "tap_indent": 0,
          "name": "P.MODE: same denied request has distinct enforce/audit/disabled behavior",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 69,
          "duration_ms": 49.296,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0012",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 69
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 13,
          "tap_local_ordinal": 13,
          "tap_indent": 0,
          "name": "P.MODE: selected IDs and project scope; explicit ENFORCE dominates overlap",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 75,
          "duration_ms": 50.457,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0013",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 75
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 14,
          "tap_local_ordinal": 14,
          "tap_indent": 0,
          "name": "P.MODE: PDP fault stays closed in ENFORCE and AUDIT_ONLY; DISABLED actually skips PDP",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 81,
          "duration_ms": 49.0332,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0014",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 81
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 15,
          "tap_local_ordinal": 15,
          "tap_indent": 0,
          "name": "P.MODE-EXPIRY: real deadline freezes until persisted-chain preflight",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 87,
          "duration_ms": 1420.0419,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0015",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 87
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 16,
          "tap_local_ordinal": 16,
          "tap_indent": 0,
          "name": "P.MODE-RECOVERY: reboot never restores a permissive lease without preflight",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 93,
          "duration_ms": 706.5232,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0016",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 93
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 17,
          "tap_local_ordinal": 17,
          "tap_indent": 0,
          "name": "P.APPROVAL: hash/identity/epoch/expiry bind grants and no self-reported approval",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 99,
          "duration_ms": 266.6203,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0017",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 99
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 18,
          "tap_local_ordinal": 18,
          "tap_indent": 0,
          "name": "P.APPROVAL-EXPIRY: real expiry cannot revive under an in-process clock rollback",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 105,
          "duration_ms": 350.6064,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0018",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 105
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 19,
          "tap_local_ordinal": 19,
          "tap_indent": 0,
          "name": "Json canonical contract rejects accessors/cycles/nonfinite numbers",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 111,
          "duration_ms": 0.5719,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0019",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 111
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 20,
          "tap_local_ordinal": 20,
          "tap_indent": 0,
          "name": "JSON uses real JSON.parse and preserves independent safety/authorization dimensions",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 117,
          "duration_ms": 6.3624,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0020",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 117
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 21,
          "tap_local_ordinal": 21,
          "tap_indent": 0,
          "name": "Python AST actually parses valid/invalid source, with explicitly limited coverage",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 123,
          "duration_ms": 433.5544,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0021",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 123
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 22,
          "tap_local_ordinal": 22,
          "tap_indent": 0,
          "name": "PowerShell Parser actually returns AST diagnostics and UTF-16 positions",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 129,
          "duration_ms": 818.1031,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0022",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 129
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 23,
          "tap_local_ordinal": 23,
          "tap_indent": 0,
          "name": "Python and PowerShell source side effects remain unexecuted",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 135,
          "duration_ms": 382.914,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0023",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 135
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 24,
          "tap_local_ordinal": 24,
          "tap_indent": 0,
          "name": "all relevant source Feature OFF paths bypass without a configured parser",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 141,
          "duration_ms": 0.4717,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0024",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 141
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 25,
          "tap_local_ordinal": 25,
          "tap_indent": 0,
          "name": "optional environment/safety OFF remains BYPASSED while syntax independently runs",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 147,
          "duration_ms": 0.6016,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0025",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 147
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 26,
          "tap_local_ordinal": 26,
          "tap_indent": 0,
          "name": "missing parsers and unsupported languages/dialects never produce PASS",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 153,
          "duration_ms": 0.5408,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0026",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 153
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 27,
          "tap_local_ordinal": 27,
          "tap_indent": 0,
          "name": "new document version, same-version hash mismatch and close fence old results",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 159,
          "duration_ms": 0.7487,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0027",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 159
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 28,
          "tap_local_ordinal": 28,
          "tap_indent": 0,
          "name": "real parser requests respect newer versions and Feature epoch changes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 165,
          "duration_ms": 147.0285,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0028",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 165
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 29,
          "tap_local_ordinal": 29,
          "tap_indent": 0,
          "name": "AbortSignal, timeout and dispose are bounded and never become PASS",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 171,
          "duration_ms": 1.3393,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0029",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 171
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 30,
          "tap_local_ordinal": 30,
          "tap_indent": 0,
          "name": "source/Unicode/request budgets reject before parsing and constructor budgets are fixed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 177,
          "duration_ms": 0.6055,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0030",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 177
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 31,
          "tap_local_ordinal": 31,
          "tap_indent": 0,
          "name": "queue admission caps concurrent work and recovers after backpressure",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 183,
          "duration_ms": 2.1428,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0031",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 183
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 32,
          "tap_local_ordinal": 32,
          "tap_indent": 0,
          "name": "PowerShell error floods remain bounded and do not turn truncation into PASS",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 189,
          "duration_ms": 510.9983,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0032",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 189
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 33,
          "tap_local_ordinal": 33,
          "tap_indent": 0,
          "name": "registered Git/Python argv schemas are static, limited and independently typed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 195,
          "duration_ms": 1.5155,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0033",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 195
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 34,
          "tap_local_ordinal": 34,
          "tap_indent": 0,
          "name": "argv environment checks inspect only the Host file and preserve the actual args result",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 201,
          "duration_ms": 0.7813,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0034",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 201
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 35,
          "tap_local_ordinal": 35,
          "tap_indent": 0,
          "name": "argv family and values are copied before asynchronous work",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 207,
          "duration_ms": 0.2249,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0035",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 207
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 36,
          "tap_local_ordinal": 36,
          "tap_indent": 0,
          "name": "argument Feature OFF bypasses schema and dispose prevents subsequent work",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 213,
          "duration_ms": 0.2097,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0036",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 213
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 37,
          "tap_local_ordinal": 37,
          "tap_indent": 0,
          "name": "disposeAndWait confirms real interpreter child close and all queued work is drained",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 219,
          "duration_ms": 97.1763,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0037",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 219
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 38,
          "tap_local_ordinal": 38,
          "tap_indent": 0,
          "name": "AT/Context/Artifact: real invocation produces separate hash-linked facts and byte-exact output",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 225,
          "duration_ms": 166.3404,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0038",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 225
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 39,
          "tap_local_ordinal": 39,
          "tap_indent": 0,
          "name": "P.MODE+Gateway: same safe synthetic operation blocked/enforced, would-deny, and unevaluated",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 231,
          "duration_ms": 173.0621,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0039",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 231
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 40,
          "tap_local_ordinal": 40,
          "tap_indent": 0,
          "name": "P.SANDBOX: DISABLED does not admit arbitrary execution or close independent protection",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 237,
          "duration_ms": 64.1717,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0040",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 237
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 41,
          "tap_local_ordinal": 41,
          "tap_indent": 0,
          "name": "P.IDENTITY: facade has no administration and JSON admin/mode flags cannot elevate",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 243,
          "duration_ms": 47.3077,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0041",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 243
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 42,
          "tap_local_ordinal": 42,
          "tap_indent": 0,
          "name": "P.APPROVAL_REPLAY: exact approval executes once; altered intent and replay denied",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 249,
          "duration_ms": 125.8512,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0042",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 249
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 43,
          "tap_local_ordinal": 43,
          "tap_indent": 0,
          "name": "P.DB_ATOMIC: 16 concurrent duplicate requests invoke a real handler at most once",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 255,
          "duration_ms": 93.3012,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0043",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 255
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 44,
          "tap_local_ordinal": 44,
          "tap_indent": 0,
          "name": "P.WORKSPACE_WRITER: concurrent distinct calls cannot overwrite active resource; modes cannot change mid-action",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 261,
          "duration_ms": 116.2973,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0044",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 261
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 45,
          "tap_local_ordinal": 45,
          "tap_indent": 0,
          "name": "AT-IOFAIL-before: actual SQLite readonly persistence failure prevents handler execution",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 267,
          "duration_ms": 102.1128,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0045",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 267
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 46,
          "tap_local_ordinal": 46,
          "tap_indent": 0,
          "name": "AT-IOFAIL-after: actual effect with unrecordable result keeps claim and never replays",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 273,
          "duration_ms": 95.1152,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0046",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 273
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 47,
          "tap_local_ordinal": 47,
          "tap_indent": 0,
          "name": "P.TIMEOUT: timeout retains owned lease until actual handler settlement and never resets claim",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 279,
          "duration_ms": 104.6834,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0047",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 279
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 48,
          "tap_local_ordinal": 48,
          "tap_indent": 0,
          "name": "AT-REPLAY: reconstruction is readonly and session scope does not grant peer context",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 285,
          "duration_ms": 94.8365,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0048",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 285
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 49,
          "tap_local_ordinal": 49,
          "tap_indent": 0,
          "name": "P.IDENTITY-revocation: old facade cannot read or close a replacement session",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 291,
          "duration_ms": 138.2991,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0049",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 291
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 50,
          "tap_local_ordinal": 50,
          "tap_indent": 0,
          "name": "P.IDENTITY-close-race: close revokes facade before its first asynchronous cleanup",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 297,
          "duration_ms": 98.8032,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0050",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 297
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 51,
          "tap_local_ordinal": 51,
          "tap_indent": 0,
          "name": "P.TIMEOUT-clock: handler deadline uses elapsed time under a wall-clock rollback",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 303,
          "duration_ms": 113.0805,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0051",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 303
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 52,
          "tap_local_ordinal": 52,
          "tap_indent": 0,
          "name": "P.MODE-START: a bypass expiring during a real delayed durability barrier cannot execute",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 309,
          "duration_ms": 486.4564,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0052",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 309
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 53,
          "tap_local_ordinal": 53,
          "tap_indent": 0,
          "name": "DI integration: malformed code remains FAIL, checks OFF are BYPASSED, raw/audit continue",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 315,
          "duration_ms": 164.3713,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0053",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 315
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 54,
          "tap_local_ordinal": 54,
          "tap_indent": 0,
          "name": "Tool OFF rejects invocation, diagnostics log OFF does not silence core audit, oversized request is bounded",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 321,
          "duration_ms": 70.0373,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0054",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 321
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 55,
          "tap_local_ordinal": 55,
          "tap_indent": 0,
          "name": "P.ARG_BINDING: mutation by schema or caller cannot replace the authorized snapshot",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 327,
          "duration_ms": 86.8136,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0055",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 327
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 56,
          "tap_local_ordinal": 56,
          "tap_indent": 0,
          "name": "DI command checking keeps argv preview as data and cannot execute Git/Python",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 333,
          "duration_ms": 93.4785,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0056",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 333
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 57,
          "tap_local_ordinal": 57,
          "tap_indent": 0,
          "name": "controlled static bytes close over binary, empty and nested same-name files",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 339,
          "duration_ms": 46.0737,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0057",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 339
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 58,
          "tap_local_ordinal": 58,
          "tap_indent": 0,
          "name": "empty package permits exactly its manifest, with zero payload budgets",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 345,
          "duration_ms": 5.7818,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0058",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 345
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 59,
          "tap_local_ordinal": 59,
          "tap_indent": 0,
          "name": "matching mutable tree is INCONCLUSIVE, never a trusted release root",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 351,
          "duration_ms": 7.2545,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0059",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 351
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 60,
          "tap_local_ordinal": 60,
          "tap_indent": 0,
          "name": "same-size modified content fails its SHA-256",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 357,
          "duration_ms": 7.5368,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0060",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 357
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 61,
          "tap_local_ordinal": 61,
          "tap_indent": 0,
          "name": "appended content fails declared byte size",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 363,
          "duration_ms": 6.0254,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0061",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 363
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 62,
          "tap_local_ordinal": 62,
          "tap_indent": 0,
          "name": "missing and unlisted files are both reported by full relative path",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 369,
          "duration_ms": 7.3039,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0062",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 369
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 63,
          "tap_local_ordinal": 1,
          "tap_indent": 4,
          "name": "sub/manifest.json",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 376,
          "duration_ms": 7.3023,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0063",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 376
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 64,
          "tap_local_ordinal": 2,
          "tap_indent": 4,
          "name": "validation/SHA256SUMS.txt",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 382,
          "duration_ms": 8.2442,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0064",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 382
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 65,
          "tap_local_ordinal": 3,
          "tap_indent": 4,
          "name": "unexpected.cjs",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 388,
          "duration_ms": 5.8195,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0065",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 388
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 66,
          "tap_local_ordinal": 4,
          "tap_indent": 4,
          "name": ".hidden",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 394,
          "duration_ms": 5.6043,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0066",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 394
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 67,
          "tap_local_ordinal": 63,
          "tap_indent": 0,
          "name": "unlisted nested manifest and SHA256SUMS names are never self exceptions",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 400,
          "duration_ms": 27.7673,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0067",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 400
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 68,
          "tap_local_ordinal": 64,
          "tap_indent": 0,
          "name": "root manifest is required and cannot list itself",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 406,
          "duration_ms": 5.331,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0068",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 406
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 69,
          "tap_local_ordinal": 65,
          "tap_indent": 0,
          "name": "root manifest directory and non-directory roots fail",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 412,
          "duration_ms": 4.4881,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0069",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 412
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 70,
          "tap_local_ordinal": 66,
          "tap_indent": 0,
          "name": "duplicate JSON keys are rejected despite JSON.parse last-wins semantics",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 418,
          "duration_ms": 6.3436,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0070",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 418
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 71,
          "tap_local_ordinal": 67,
          "tap_indent": 0,
          "name": "duplicate complete path and unsorted arrays fail independently",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 424,
          "duration_ms": 5.428,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0071",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 424
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 72,
          "tap_local_ordinal": 1,
          "tap_indent": 4,
          "name": "A vs a",
          "parents": [
            "case conflicts include ancestor directories and file-directory prefixes"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 431,
          "duration_ms": 4.0673,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0072",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 431
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 73,
          "tap_local_ordinal": 2,
          "tap_indent": 4,
          "name": "Dir/a vs dir/b",
          "parents": [
            "case conflicts include ancestor directories and file-directory prefixes"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 437,
          "duration_ms": 4.2427,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0073",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 437
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 74,
          "tap_local_ordinal": 3,
          "tap_indent": 4,
          "name": "a vs a/b",
          "parents": [
            "case conflicts include ancestor directories and file-directory prefixes"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 443,
          "duration_ms": 6.5029,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0074",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 443
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 75,
          "tap_local_ordinal": 68,
          "tap_indent": 0,
          "name": "case conflicts include ancestor directories and file-directory prefixes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 449,
          "duration_ms": 15.3344,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0075",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 449
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 76,
          "tap_local_ordinal": 1,
          "tap_indent": 4,
          "name": "\"../outside\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 456,
          "duration_ms": 5.2886,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0076",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 456
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 77,
          "tap_local_ordinal": 2,
          "tap_indent": 4,
          "name": "\"./a\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 462,
          "duration_ms": 4.7405,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0077",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 462
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 78,
          "tap_local_ordinal": 3,
          "tap_indent": 4,
          "name": "\"a//b\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 468,
          "duration_ms": 5.1763,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0078",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 468
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 79,
          "tap_local_ordinal": 4,
          "tap_indent": 4,
          "name": "\"/outside\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 474,
          "duration_ms": 4.5287,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0079",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 474
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 80,
          "tap_local_ordinal": 5,
          "tap_indent": 4,
          "name": "\"C:/outside\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 480,
          "duration_ms": 4.4399,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0080",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 480
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 81,
          "tap_local_ordinal": 6,
          "tap_indent": 4,
          "name": "\"//server/share\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 486,
          "duration_ms": 5.047,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0081",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 486
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 82,
          "tap_local_ordinal": 7,
          "tap_indent": 4,
          "name": "\"a\\\\\\\\b\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 492,
          "duration_ms": 5.4682,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0082",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 492
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 83,
          "tap_local_ordinal": 8,
          "tap_indent": 4,
          "name": "\"a:stream\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 498,
          "duration_ms": 4.4504,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0083",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 498
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 84,
          "tap_local_ordinal": 9,
          "tap_indent": 4,
          "name": "\"NUL.txt\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 504,
          "duration_ms": 4.8727,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0084",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 504
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 85,
          "tap_local_ordinal": 10,
          "tap_indent": 4,
          "name": "\"COM1\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 510,
          "duration_ms": 5.5261,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0085",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 510
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 86,
          "tap_local_ordinal": 11,
          "tap_indent": 4,
          "name": "\"con.tar.gz\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 516,
          "duration_ms": 4.7166,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0086",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 516
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 87,
          "tap_local_ordinal": 12,
          "tap_indent": 4,
          "name": "\"a.\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 522,
          "duration_ms": 4.5538,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0087",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 522
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 88,
          "tap_local_ordinal": 13,
          "tap_indent": 4,
          "name": "\"a \"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 528,
          "duration_ms": 5.7142,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0088",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 528
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 89,
          "tap_local_ordinal": 14,
          "tap_indent": 4,
          "name": "\"PROGRA~1/file\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 534,
          "duration_ms": 4.9382,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0089",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 534
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 90,
          "tap_local_ordinal": 15,
          "tap_indent": 4,
          "name": "\"\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 540,
          "duration_ms": 4.7052,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0090",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 540
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 91,
          "tap_local_ordinal": 16,
          "tap_indent": 4,
          "name": "\"a\\\\u0000b\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 546,
          "duration_ms": 4.9186,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0091",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 546
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 92,
          "tap_local_ordinal": 17,
          "tap_indent": 4,
          "name": "\"é\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 552,
          "duration_ms": 5.1454,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0092",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 552
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 93,
          "tap_local_ordinal": 18,
          "tap_indent": 4,
          "name": "\"é\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 558,
          "duration_ms": 5.125,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0093",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 558
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 94,
          "tap_local_ordinal": 19,
          "tap_indent": 4,
          "name": "\"İ\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 564,
          "duration_ms": 5.6558,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0094",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 564
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 95,
          "tap_local_ordinal": 20,
          "tap_indent": 4,
          "name": "\"a/a/\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 570,
          "duration_ms": 4.7794,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0095",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 570
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 96,
          "tap_local_ordinal": 69,
          "tap_indent": 0,
          "name": "path traversal, device aliases, malformed separators and Unicode reject before payload reads",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 576,
          "duration_ms": 102.2502,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0096",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 576
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 97,
          "tap_local_ordinal": 70,
          "tap_indent": 0,
          "name": "schema, digest and byte count reject invalid declarations",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 582,
          "duration_ms": 15.3417,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0097",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 582
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 98,
          "tap_local_ordinal": 71,
          "tap_indent": 0,
          "name": "canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 588,
          "duration_ms": 10.6302,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0098",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 588
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 99,
          "tap_local_ordinal": 72,
          "tap_indent": 0,
          "name": "extra empty directory and file-vs-directory mismatch cannot disappear",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 594,
          "duration_ms": 8.289,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0099",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 594
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 100,
          "tap_local_ordinal": 73,
          "tap_indent": 0,
          "name": "file count and total bytes budgets work at exact limit and limit plus one",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 600,
          "duration_ms": 9.5833,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0100",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 600
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 101,
          "tap_local_ordinal": 74,
          "tap_indent": 0,
          "name": "actual unlisted content also consumes size and count budgets",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 606,
          "duration_ms": 6.2789,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0101",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 606
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 102,
          "tap_local_ordinal": 75,
          "tap_indent": 0,
          "name": "manifest and single-file caps are enforced without reading an oversized payload",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 612,
          "duration_ms": 5.8979,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0102",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 612
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 103,
          "tap_local_ordinal": 76,
          "tap_indent": 0,
          "name": "path length and depth have bounded rejection",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 618,
          "duration_ms": 5.9978,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0103",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 618
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 104,
          "tap_local_ordinal": 77,
          "tap_indent": 0,
          "name": "actual default file and directory count limits accept the edge and reject one more",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 624,
          "duration_ms": 1040.7113,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0104",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 624
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 105,
          "tap_local_ordinal": 78,
          "tap_indent": 0,
          "name": "actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 630,
          "duration_ms": 47.3515,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0105",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 630
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 106,
          "tap_local_ordinal": 79,
          "tap_indent": 0,
          "name": "maximum component and depth are accepted on an actually created portable path",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 636,
          "duration_ms": 31.8846,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0106",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 636
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 107,
          "tap_local_ordinal": 80,
          "tap_indent": 0,
          "name": "Host cannot expand limits or choose an unknown mode; relative roots reject",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 642,
          "duration_ms": 3.2713,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0107",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 642
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 108,
          "tap_local_ordinal": 81,
          "tap_indent": 0,
          "name": "pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 648,
          "duration_ms": 6.9132,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0108",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 648
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 109,
          "tap_local_ordinal": 82,
          "tap_indent": 0,
          "name": "diagnostic count and encoded bytes remain bounded for many extra files",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 654,
          "duration_ms": 53.6636,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0109",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 654
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 110,
          "tap_local_ordinal": 83,
          "tap_indent": 0,
          "name": "candidate scripts, package metadata and git-looking files are data and never executed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 660,
          "duration_ms": 13.6591,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0110",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 660
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 111,
          "tap_local_ordinal": 84,
          "tap_indent": 0,
          "name": "real OS file symlink is rejected without following its target",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 666,
          "duration_ms": 4.6256,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0111",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 666
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 112,
          "tap_local_ordinal": 85,
          "tap_indent": 0,
          "name": "real OS dir link is rejected",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 672,
          "duration_ms": 4.2473,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0112",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 672
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 113,
          "tap_local_ordinal": 86,
          "tap_indent": 0,
          "name": "real OS junction link is rejected",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 678,
          "duration_ms": 4.4716,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0113",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 678
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 114,
          "tap_local_ordinal": 87,
          "tap_indent": 0,
          "name": "real OS hardlink to an outside object is rejected by link count",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 684,
          "duration_ms": 4.1604,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0114",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 684
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 115,
          "tap_local_ordinal": 88,
          "tap_indent": 0,
          "name": "real SQLite, three independent domain chains and global pagination",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 690,
          "duration_ms": 108.0035,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0115",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 690
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 116,
          "tap_local_ordinal": 89,
          "tap_indent": 0,
          "name": "synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 696,
          "duration_ms": 28.4596,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0116",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 696
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 117,
          "tap_local_ordinal": 90,
          "tap_indent": 0,
          "name": "agent and session SQL filters apply before LIMIT and preserve global cursor pages",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 702,
          "duration_ms": 221.0731,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0117",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 702
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 118,
          "tap_local_ordinal": 91,
          "tap_indent": 0,
          "name": "flush covers its captured target after an empty or older shared flush",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 708,
          "duration_ms": 30.9032,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0118",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 708
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 119,
          "tap_local_ordinal": 92,
          "tap_indent": 0,
          "name": "required fields, malformed refs, oversized envelopes and query budgets reject without fault",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 714,
          "duration_ms": 25.4093,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0119",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 714
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 120,
          "tap_local_ordinal": 93,
          "tap_indent": 0,
          "name": "outbox high water rejects new records, then drains without unbounded queues",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 720,
          "duration_ms": 36.2069,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0120",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 720
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 121,
          "tap_local_ordinal": 94,
          "tap_indent": 0,
          "name": "second writer and live lock recovery are blocked; real owner death is explicit",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 726,
          "duration_ms": 230.5204,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0121",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 726
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 122,
          "tap_local_ordinal": 95,
          "tap_indent": 0,
          "name": "process crash after file fsync and before receipt reexports no duplicate",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 732,
          "duration_ms": 205.5032,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0122",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 732
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 123,
          "tap_local_ordinal": 96,
          "tap_indent": 0,
          "name": "unacknowledged crash tail is preserved then repaired from durable outbox",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 738,
          "duration_ms": 455.5491,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0123",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 738
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 124,
          "tap_local_ordinal": 97,
          "tap_indent": 0,
          "name": "actual export I/O failure freezes writes and preserves outbox until explicit recovery",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 744,
          "duration_ms": 32.0677,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0124",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 744
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 125,
          "tap_local_ordinal": 98,
          "tap_indent": 0,
          "name": "acknowledged truncation is never silently discarded or rebuilt as success",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 750,
          "duration_ms": 22.345,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0125",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 750
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 126,
          "tap_local_ordinal": 99,
          "tap_indent": 0,
          "name": "actual artifact publication I/O failure retains bytes and freezes both record and object admission",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 756,
          "duration_ms": 28.9865,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0126",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 756
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 127,
          "tap_local_ordinal": 100,
          "tap_indent": 0,
          "name": "database hash tampering throws, freezes writes and does not fake repair",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 762,
          "duration_ms": 20.8347,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0127",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 762
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 128,
          "tap_local_ordinal": 101,
          "tap_indent": 0,
          "name": "32 MiB randomized artifact roundtrip streams with real backpressure and two hashes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 768,
          "duration_ms": 275.7796,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0128",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 768
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 129,
          "tap_local_ordinal": 102,
          "tap_indent": 0,
          "name": "cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 774,
          "duration_ms": 32.4128,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0129",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 774
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 130,
          "tap_local_ordinal": 103,
          "tap_indent": 0,
          "name": "early artifact iterator return is not verification; full corrupted stream fails closed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 780,
          "duration_ms": 39.9431,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0130",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 780
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 131,
          "tap_local_ordinal": 104,
          "tap_indent": 0,
          "name": "concurrent artifact admission is bounded and rejects a third stream without queueing",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 786,
          "duration_ms": 42.405,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0131",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 786
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 132,
          "tap_local_ordinal": 105,
          "tap_indent": 0,
          "name": "abort races a permanently pending source.next without retaining Store writers or accepting late bytes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 792,
          "duration_ms": 21.5713,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0132",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 792
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 133,
          "tap_local_ordinal": 106,
          "tap_indent": 0,
          "name": "concurrent close calls share the real drain and lock-release promise",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 798,
          "duration_ms": 20.3931,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0133",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 798
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 134,
          "tap_local_ordinal": 107,
          "tap_indent": 0,
          "name": "sealed segments are compressed, chained and verified; stored bit flip is detected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 804,
          "duration_ms": 103.0305,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0134",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 804
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 135,
          "tap_local_ordinal": 108,
          "tap_indent": 0,
          "name": "process-killed partial artifact remains retained without a complete object reference",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 810,
          "duration_ms": 199.2909,
          "execution_id": "RUN-3d69c3cb1b1f03f3-0135",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap",
            "line": 810
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        }
      ],
      "original_metadata_records": [
        {
          "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/test-results.json",
          "sha256": "e72ea36f1fbf031c1c750f422bc1ecceed4cc324fc738163bc7a04fe437fb524",
          "recorded_timing_fields": {
            "utc": "2026-11-06T17:54:41.259308+00:00"
          },
          "source_environment_and_command_binding_fields": {
            "command": [
              "node",
              "tools/agentnexus/run-tests.mjs"
            ]
          },
          "exact_started_utc": "NOT_AVAILABLE",
          "exact_ended_utc": "NOT_AVAILABLE"
        },
        {
          "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-verification.json",
          "sha256": "04adc9bd1e896e498172c1be426d04a34411b4f9699c429b9c36cde517fe6561",
          "recorded_timing_fields": {
            "utc": "2026-11-06T17:59:57.797474+00:00",
            "test_run_utc": "2026-11-06T17:54:41.259308+00:00"
          },
          "source_environment_and_command_binding_fields": {
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
            "versions": {
              "node": "v24.15.0",
              "sqlite": "3.51.3",
              "zstd": "1.5.7",
              "platform": "win32"
            }
          },
          "exact_started_utc": "NOT_AVAILABLE",
          "exact_ended_utc": "NOT_AVAILABLE"
        }
      ],
      "record_status": "RAW_EVIDENCE_RETAINED",
      "case_count_matches_log_total": true
    },
    {
      "run_id": "RUN-0f958d9b5874471c",
      "log": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
      "sha256": "efd37cab25de4e616f64bba6e4a854b68fb7335c629559b31fb16986cffe4080",
      "bytes": 4166,
      "totals": {
        "tests": 18,
        "pass": 18,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0
      },
      "duration_ms": 2805.1615,
      "cases": [
        {
          "ordinal": 1,
          "tap_local_ordinal": 1,
          "tap_indent": 0,
          "name": "JSON uses real JSON.parse and preserves independent safety/authorization dimensions",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 3,
          "duration_ms": 8.1581,
          "execution_id": "RUN-0f958d9b5874471c-0001",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 3
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 2,
          "tap_local_ordinal": 2,
          "tap_indent": 0,
          "name": "Python AST actually parses valid/invalid source, with explicitly limited coverage",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 9,
          "duration_ms": 430.2107,
          "execution_id": "RUN-0f958d9b5874471c-0002",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 9
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 3,
          "tap_local_ordinal": 3,
          "tap_indent": 0,
          "name": "PowerShell Parser actually returns AST diagnostics and UTF-16 positions",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 15,
          "duration_ms": 921.1043,
          "execution_id": "RUN-0f958d9b5874471c-0003",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 15
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 4,
          "tap_local_ordinal": 4,
          "tap_indent": 0,
          "name": "Python and PowerShell source side effects remain unexecuted",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 21,
          "duration_ms": 427.6099,
          "execution_id": "RUN-0f958d9b5874471c-0004",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 21
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 5,
          "tap_local_ordinal": 5,
          "tap_indent": 0,
          "name": "all relevant source Feature OFF paths bypass without a configured parser",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 27,
          "duration_ms": 0.4352,
          "execution_id": "RUN-0f958d9b5874471c-0005",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 27
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 6,
          "tap_local_ordinal": 6,
          "tap_indent": 0,
          "name": "optional environment/safety OFF remains BYPASSED while syntax independently runs",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 33,
          "duration_ms": 0.5932,
          "execution_id": "RUN-0f958d9b5874471c-0006",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 33
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 7,
          "tap_local_ordinal": 7,
          "tap_indent": 0,
          "name": "missing parsers and unsupported languages/dialects never produce PASS",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 39,
          "duration_ms": 0.5788,
          "execution_id": "RUN-0f958d9b5874471c-0007",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 39
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 8,
          "tap_local_ordinal": 8,
          "tap_indent": 0,
          "name": "new document version, same-version hash mismatch and close fence old results",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 45,
          "duration_ms": 0.9244,
          "execution_id": "RUN-0f958d9b5874471c-0008",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 45
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 9,
          "tap_local_ordinal": 9,
          "tap_indent": 0,
          "name": "real parser requests respect newer versions and Feature epoch changes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 51,
          "duration_ms": 208.3987,
          "execution_id": "RUN-0f958d9b5874471c-0009",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 51
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 10,
          "tap_local_ordinal": 10,
          "tap_indent": 0,
          "name": "AbortSignal, timeout and dispose are bounded and never become PASS",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 57,
          "duration_ms": 1.4206,
          "execution_id": "RUN-0f958d9b5874471c-0010",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 57
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 11,
          "tap_local_ordinal": 11,
          "tap_indent": 0,
          "name": "source/Unicode/request budgets reject before parsing and constructor budgets are fixed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 63,
          "duration_ms": 0.802,
          "execution_id": "RUN-0f958d9b5874471c-0011",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 63
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 12,
          "tap_local_ordinal": 12,
          "tap_indent": 0,
          "name": "queue admission caps concurrent work and recovers after backpressure",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 69,
          "duration_ms": 2.6175,
          "execution_id": "RUN-0f958d9b5874471c-0012",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 69
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 13,
          "tap_local_ordinal": 13,
          "tap_indent": 0,
          "name": "PowerShell error floods remain bounded and do not turn truncation into PASS",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 75,
          "duration_ms": 518.7719,
          "execution_id": "RUN-0f958d9b5874471c-0013",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 75
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 14,
          "tap_local_ordinal": 14,
          "tap_indent": 0,
          "name": "registered Git/Python argv schemas are static, limited and independently typed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 81,
          "duration_ms": 1.341,
          "execution_id": "RUN-0f958d9b5874471c-0014",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 81
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 15,
          "tap_local_ordinal": 15,
          "tap_indent": 0,
          "name": "argv environment checks inspect only the Host file and preserve the actual args result",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 87,
          "duration_ms": 0.5739,
          "execution_id": "RUN-0f958d9b5874471c-0015",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 87
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 16,
          "tap_local_ordinal": 16,
          "tap_indent": 0,
          "name": "argv family and values are copied before asynchronous work",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 93,
          "duration_ms": 0.1769,
          "execution_id": "RUN-0f958d9b5874471c-0016",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 93
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 17,
          "tap_local_ordinal": 17,
          "tap_indent": 0,
          "name": "argument Feature OFF bypasses schema and dispose prevents subsequent work",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 99,
          "duration_ms": 0.1707,
          "execution_id": "RUN-0f958d9b5874471c-0017",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 99
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 18,
          "tap_local_ordinal": 18,
          "tap_indent": 0,
          "name": "disposeAndWait confirms real interpreter child close and all queued work is drained",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 105,
          "duration_ms": 136.4489,
          "execution_id": "RUN-0f958d9b5874471c-0018",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
            "line": 105
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        }
      ],
      "original_metadata_records": [
        {
          "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/verification.json",
          "sha256": "e2334ddb133a9601fd2a99213e58b94b40fee3e4a3b3b22f4a6c4f6ddaf9a397",
          "recorded_timing_fields": {
            "observed_at": "2026-11-06T17:13:28.161Z"
          },
          "source_environment_and_command_binding_fields": {
            "runtime": {
              "node": "24.15.0",
              "platform": "win32",
              "architecture": "x64",
              "python_path": "C:/Users/28642/AppData/Local/Programs/Python/Python312/python.exe",
              "powershell_path": "C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1104-709-0_26.1104.709.0_x64__3k8sg7r9htsxt/dependencies/native/powershell/pwsh.exe"
            }
          },
          "exact_started_utc": "NOT_AVAILABLE",
          "exact_ended_utc": "NOT_AVAILABLE"
        }
      ],
      "record_status": "RAW_EVIDENCE_RETAINED",
      "case_count_matches_log_total": true
    },
    {
      "run_id": "RUN-68742774ddd12015",
      "log": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.v2.tap",
      "sha256": "2cd56834dc32700442bab5ba891e9c7ef048848807baef0ebbbd45d2f9646011",
      "bytes": 365,
      "totals": {
        "tests": 1,
        "pass": 1,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0
      },
      "duration_ms": 548.0984,
      "cases": [
        {
          "ordinal": 1,
          "tap_local_ordinal": 1,
          "tap_indent": 0,
          "name": "Python AST actually parses valid/invalid source, with explicitly limited coverage",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 3,
          "duration_ms": 404.941,
          "execution_id": "RUN-68742774ddd12015-0001",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.v2.tap",
            "line": 3
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        }
      ],
      "original_metadata_records": [
        {
          "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/verification.v2.json",
          "sha256": "4ecd91187ad9a8a0bffa3915d605ecbb64bd9e197d869c5b2f806610f22891b3",
          "recorded_timing_fields": {
            "observed_at": "2026-11-06T17:50:26.641Z"
          },
          "source_environment_and_command_binding_fields": {
            "runtime": {
              "node": "24.15.0",
              "platform": "win32"
            }
          },
          "exact_started_utc": "NOT_AVAILABLE",
          "exact_ended_utc": "NOT_AVAILABLE"
        }
      ],
      "record_status": "RAW_EVIDENCE_RETAINED",
      "case_count_matches_log_total": true
    },
    {
      "run_id": "RUN-4f4867d67f980391",
      "log": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
      "sha256": "9492c2ff19b7504baf34b42e80a5a3b2460f0f0d579f14d7605aee7b9ccb6a6e",
      "bytes": 27360,
      "totals": {
        "tests": 135,
        "pass": 131,
        "fail": 0,
        "cancelled": 0,
        "skipped": 4,
        "todo": 0
      },
      "duration_ms": 11748.902,
      "cases": [
        {
          "ordinal": 1,
          "tap_local_ordinal": 1,
          "tap_indent": 0,
          "name": "FT-RESOLVE: defaults, child narrowing, ancestor veto, explicit INHERIT",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 3,
          "duration_ms": 72.5918,
          "execution_id": "RUN-4f4867d67f980391-0001",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 3
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 2,
          "tap_local_ordinal": 2,
          "tap_indent": 0,
          "name": "FT: unknown IDs, illegal scopes and non-admin payloads rejected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 9,
          "duration_ms": 31.1081,
          "execution_id": "RUN-4f4867d67f980391-0002",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 9
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 3,
          "tap_local_ordinal": 3,
          "tap_indent": 0,
          "name": "FT-DEPENDENCY: rejects partial disable and does not enable a dependency implicitly",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 15,
          "duration_ms": 36.7497,
          "execution_id": "RUN-4f4867d67f980391-0003",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 15
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 4,
          "tap_local_ordinal": 4,
          "tap_indent": 0,
          "name": "FT: mutual conflict, wrong preview hash and stale revision cannot commit",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 21,
          "duration_ms": 40.9792,
          "execution_id": "RUN-4f4867d67f980391-0004",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 21
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 5,
          "tap_local_ordinal": 5,
          "tap_indent": 0,
          "name": "FT-OFF: live work aborts; failure remains FAILED until explicit recovery",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 27,
          "duration_ms": 41.8314,
          "execution_id": "RUN-4f4867d67f980391-0005",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 27
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 6,
          "tap_local_ordinal": 6,
          "tap_indent": 0,
          "name": "FT-RETAIN: configuration survives real reopen, facts remain and old epoch is invalid",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 33,
          "duration_ms": 59.949,
          "execution_id": "RUN-4f4867d67f980391-0006",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 33
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 7,
          "tap_local_ordinal": 7,
          "tap_indent": 0,
          "name": "FT-INHERIT-OFF: ON to INHERIT must quiesce when default is OFF",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 39,
          "duration_ms": 47.4621,
          "execution_id": "RUN-4f4867d67f980391-0007",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 39
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 8,
          "tap_local_ordinal": 8,
          "tap_indent": 0,
          "name": "FT-LATE-STOP: timeout cannot recover or enable until the old stop actually settles",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 45,
          "duration_ms": 1064.3305,
          "execution_id": "RUN-4f4867d67f980391-0008",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 45
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 9,
          "tap_local_ordinal": 9,
          "tap_indent": 0,
          "name": "FT catalog is capacity, unimplemented module never becomes enabled from default ON",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 51,
          "duration_ms": 35.0598,
          "execution_id": "RUN-4f4867d67f980391-0009",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 51
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 10,
          "tap_local_ordinal": 10,
          "tap_indent": 0,
          "name": "P.ADMIN_MODE: forged admin, L0 degradation and missing reason rejected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 57,
          "duration_ms": 29.268,
          "execution_id": "RUN-4f4867d67f980391-0010",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 57
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 11,
          "tap_local_ordinal": 11,
          "tap_indent": 0,
          "name": "P.ADMIN_MODE: two distinct confirmations, preview binding and challenge replay",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 63,
          "duration_ms": 36.2537,
          "execution_id": "RUN-4f4867d67f980391-0011",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 63
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 12,
          "tap_local_ordinal": 12,
          "tap_indent": 0,
          "name": "P.MODE: same denied request has distinct enforce/audit/disabled behavior",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 69,
          "duration_ms": 44.5028,
          "execution_id": "RUN-4f4867d67f980391-0012",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 69
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 13,
          "tap_local_ordinal": 13,
          "tap_indent": 0,
          "name": "P.MODE: selected IDs and project scope; explicit ENFORCE dominates overlap",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 75,
          "duration_ms": 44.9012,
          "execution_id": "RUN-4f4867d67f980391-0013",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 75
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 14,
          "tap_local_ordinal": 14,
          "tap_indent": 0,
          "name": "P.MODE: PDP fault stays closed in ENFORCE and AUDIT_ONLY; DISABLED actually skips PDP",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 81,
          "duration_ms": 46.9868,
          "execution_id": "RUN-4f4867d67f980391-0014",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 81
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 15,
          "tap_local_ordinal": 15,
          "tap_indent": 0,
          "name": "P.MODE-EXPIRY: real deadline freezes until persisted-chain preflight",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 87,
          "duration_ms": 1155.5649,
          "execution_id": "RUN-4f4867d67f980391-0015",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 87
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 16,
          "tap_local_ordinal": 16,
          "tap_indent": 0,
          "name": "P.MODE-RECOVERY: reboot never restores a permissive lease without preflight",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 93,
          "duration_ms": 63.6826,
          "execution_id": "RUN-4f4867d67f980391-0016",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 93
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 17,
          "tap_local_ordinal": 17,
          "tap_indent": 0,
          "name": "P.APPROVAL: hash/identity/epoch/expiry bind grants and no self-reported approval",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 99,
          "duration_ms": 36.5924,
          "execution_id": "RUN-4f4867d67f980391-0017",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 99
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 18,
          "tap_local_ordinal": 18,
          "tap_indent": 0,
          "name": "P.APPROVAL-EXPIRY: real expiry cannot revive under an in-process clock rollback",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 105,
          "duration_ms": 118.4836,
          "execution_id": "RUN-4f4867d67f980391-0018",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 105
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 19,
          "tap_local_ordinal": 19,
          "tap_indent": 0,
          "name": "Json canonical contract rejects accessors/cycles/nonfinite numbers",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 111,
          "duration_ms": 0.4657,
          "execution_id": "RUN-4f4867d67f980391-0019",
          "test_file": "tests/agentnexus/control.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 111
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 20,
          "tap_local_ordinal": 20,
          "tap_indent": 0,
          "name": "JSON uses real JSON.parse and preserves independent safety/authorization dimensions",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 117,
          "duration_ms": 5.6805,
          "execution_id": "RUN-4f4867d67f980391-0020",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 117
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 21,
          "tap_local_ordinal": 21,
          "tap_indent": 0,
          "name": "Python AST actually parses valid/invalid source, with explicitly limited coverage",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 123,
          "duration_ms": 392.6824,
          "execution_id": "RUN-4f4867d67f980391-0021",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 123
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 22,
          "tap_local_ordinal": 22,
          "tap_indent": 0,
          "name": "PowerShell Parser actually returns AST diagnostics and UTF-16 positions",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 129,
          "duration_ms": 790.3726,
          "execution_id": "RUN-4f4867d67f980391-0022",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 129
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 23,
          "tap_local_ordinal": 23,
          "tap_indent": 0,
          "name": "Python and PowerShell source side effects remain unexecuted",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 135,
          "duration_ms": 405.1387,
          "execution_id": "RUN-4f4867d67f980391-0023",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 135
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 24,
          "tap_local_ordinal": 24,
          "tap_indent": 0,
          "name": "all relevant source Feature OFF paths bypass without a configured parser",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 141,
          "duration_ms": 0.4026,
          "execution_id": "RUN-4f4867d67f980391-0024",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 141
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 25,
          "tap_local_ordinal": 25,
          "tap_indent": 0,
          "name": "optional environment/safety OFF remains BYPASSED while syntax independently runs",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 147,
          "duration_ms": 0.6061,
          "execution_id": "RUN-4f4867d67f980391-0025",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 147
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 26,
          "tap_local_ordinal": 26,
          "tap_indent": 0,
          "name": "missing parsers and unsupported languages/dialects never produce PASS",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 153,
          "duration_ms": 0.4941,
          "execution_id": "RUN-4f4867d67f980391-0026",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 153
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 27,
          "tap_local_ordinal": 27,
          "tap_indent": 0,
          "name": "new document version, same-version hash mismatch and close fence old results",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 159,
          "duration_ms": 0.7315,
          "execution_id": "RUN-4f4867d67f980391-0027",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 159
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 28,
          "tap_local_ordinal": 28,
          "tap_indent": 0,
          "name": "real parser requests respect newer versions and Feature epoch changes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 165,
          "duration_ms": 159.2905,
          "execution_id": "RUN-4f4867d67f980391-0028",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 165
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 29,
          "tap_local_ordinal": 29,
          "tap_indent": 0,
          "name": "AbortSignal, timeout and dispose are bounded and never become PASS",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 171,
          "duration_ms": 1.3341,
          "execution_id": "RUN-4f4867d67f980391-0029",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 171
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 30,
          "tap_local_ordinal": 30,
          "tap_indent": 0,
          "name": "source/Unicode/request budgets reject before parsing and constructor budgets are fixed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 177,
          "duration_ms": 0.4799,
          "execution_id": "RUN-4f4867d67f980391-0030",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 177
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 31,
          "tap_local_ordinal": 31,
          "tap_indent": 0,
          "name": "queue admission caps concurrent work and recovers after backpressure",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 183,
          "duration_ms": 1.7847,
          "execution_id": "RUN-4f4867d67f980391-0031",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 183
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 32,
          "tap_local_ordinal": 32,
          "tap_indent": 0,
          "name": "PowerShell error floods remain bounded and do not turn truncation into PASS",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 189,
          "duration_ms": 462.5865,
          "execution_id": "RUN-4f4867d67f980391-0032",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 189
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 33,
          "tap_local_ordinal": 33,
          "tap_indent": 0,
          "name": "registered Git/Python argv schemas are static, limited and independently typed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 195,
          "duration_ms": 1.3216,
          "execution_id": "RUN-4f4867d67f980391-0033",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 195
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 34,
          "tap_local_ordinal": 34,
          "tap_indent": 0,
          "name": "argv environment checks inspect only the Host file and preserve the actual args result",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 201,
          "duration_ms": 0.5674,
          "execution_id": "RUN-4f4867d67f980391-0034",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 201
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 35,
          "tap_local_ordinal": 35,
          "tap_indent": 0,
          "name": "argv family and values are copied before asynchronous work",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 207,
          "duration_ms": 0.1673,
          "execution_id": "RUN-4f4867d67f980391-0035",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 207
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 36,
          "tap_local_ordinal": 36,
          "tap_indent": 0,
          "name": "argument Feature OFF bypasses schema and dispose prevents subsequent work",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 213,
          "duration_ms": 0.164,
          "execution_id": "RUN-4f4867d67f980391-0036",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 213
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 37,
          "tap_local_ordinal": 37,
          "tap_indent": 0,
          "name": "disposeAndWait confirms real interpreter child close and all queued work is drained",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 219,
          "duration_ms": 36.2674,
          "execution_id": "RUN-4f4867d67f980391-0037",
          "test_file": "tests/agentnexus/diagnostics.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 219
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 38,
          "tap_local_ordinal": 38,
          "tap_indent": 0,
          "name": "AT/Context/Artifact: real invocation produces separate hash-linked facts and byte-exact output",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 225,
          "duration_ms": 137.5763,
          "execution_id": "RUN-4f4867d67f980391-0038",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 225
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 39,
          "tap_local_ordinal": 39,
          "tap_indent": 0,
          "name": "P.MODE+Gateway: same safe synthetic operation blocked/enforced, would-deny, and unevaluated",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 231,
          "duration_ms": 154.9972,
          "execution_id": "RUN-4f4867d67f980391-0039",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 231
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 40,
          "tap_local_ordinal": 40,
          "tap_indent": 0,
          "name": "P.SANDBOX: DISABLED does not admit arbitrary execution or close independent protection",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 237,
          "duration_ms": 59.3895,
          "execution_id": "RUN-4f4867d67f980391-0040",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 237
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 41,
          "tap_local_ordinal": 41,
          "tap_indent": 0,
          "name": "P.IDENTITY: facade has no administration and JSON admin/mode flags cannot elevate",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 243,
          "duration_ms": 42.8905,
          "execution_id": "RUN-4f4867d67f980391-0041",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 243
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 42,
          "tap_local_ordinal": 42,
          "tap_indent": 0,
          "name": "P.APPROVAL_REPLAY: exact approval executes once; altered intent and replay denied",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 249,
          "duration_ms": 113.3091,
          "execution_id": "RUN-4f4867d67f980391-0042",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 249
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 43,
          "tap_local_ordinal": 43,
          "tap_indent": 0,
          "name": "P.DB_ATOMIC: 16 concurrent duplicate requests invoke a real handler at most once",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 255,
          "duration_ms": 82.1284,
          "execution_id": "RUN-4f4867d67f980391-0043",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 255
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 44,
          "tap_local_ordinal": 44,
          "tap_indent": 0,
          "name": "P.WORKSPACE_WRITER: concurrent distinct calls cannot overwrite active resource; modes cannot change mid-action",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 261,
          "duration_ms": 101.4134,
          "execution_id": "RUN-4f4867d67f980391-0044",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 261
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 45,
          "tap_local_ordinal": 45,
          "tap_indent": 0,
          "name": "AT-IOFAIL-before: actual SQLite readonly persistence failure prevents handler execution",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 267,
          "duration_ms": 87.3243,
          "execution_id": "RUN-4f4867d67f980391-0045",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 267
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 46,
          "tap_local_ordinal": 46,
          "tap_indent": 0,
          "name": "AT-IOFAIL-after: actual effect with unrecordable result keeps claim and never replays",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 273,
          "duration_ms": 84.7707,
          "execution_id": "RUN-4f4867d67f980391-0046",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 273
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 47,
          "tap_local_ordinal": 47,
          "tap_indent": 0,
          "name": "P.TIMEOUT: timeout retains owned lease until actual handler settlement and never resets claim",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 279,
          "duration_ms": 108.8367,
          "execution_id": "RUN-4f4867d67f980391-0047",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 279
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 48,
          "tap_local_ordinal": 48,
          "tap_indent": 0,
          "name": "AT-REPLAY: reconstruction is readonly and session scope does not grant peer context",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 285,
          "duration_ms": 87.1125,
          "execution_id": "RUN-4f4867d67f980391-0048",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 285
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 49,
          "tap_local_ordinal": 49,
          "tap_indent": 0,
          "name": "P.IDENTITY-revocation: old facade cannot read or close a replacement session",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 291,
          "duration_ms": 119.2337,
          "execution_id": "RUN-4f4867d67f980391-0049",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 291
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 50,
          "tap_local_ordinal": 50,
          "tap_indent": 0,
          "name": "P.IDENTITY-close-race: close revokes facade before its first asynchronous cleanup",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 297,
          "duration_ms": 83.571,
          "execution_id": "RUN-4f4867d67f980391-0050",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 297
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 51,
          "tap_local_ordinal": 51,
          "tap_indent": 0,
          "name": "P.TIMEOUT-clock: handler deadline uses elapsed time under a wall-clock rollback",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 303,
          "duration_ms": 109.7643,
          "execution_id": "RUN-4f4867d67f980391-0051",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 303
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 52,
          "tap_local_ordinal": 52,
          "tap_indent": 0,
          "name": "P.MODE-START: a bypass expiring during a real delayed durability barrier cannot execute",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 309,
          "duration_ms": 471.082,
          "execution_id": "RUN-4f4867d67f980391-0052",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 309
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 53,
          "tap_local_ordinal": 53,
          "tap_indent": 0,
          "name": "DI integration: malformed code remains FAIL, checks OFF are BYPASSED, raw/audit continue",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 315,
          "duration_ms": 143.9547,
          "execution_id": "RUN-4f4867d67f980391-0053",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 315
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 54,
          "tap_local_ordinal": 54,
          "tap_indent": 0,
          "name": "Tool OFF rejects invocation, diagnostics log OFF does not silence core audit, oversized request is bounded",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 321,
          "duration_ms": 62.6217,
          "execution_id": "RUN-4f4867d67f980391-0054",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 321
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 55,
          "tap_local_ordinal": 55,
          "tap_indent": 0,
          "name": "P.ARG_BINDING: mutation by schema or caller cannot replace the authorized snapshot",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 327,
          "duration_ms": 81.1537,
          "execution_id": "RUN-4f4867d67f980391-0055",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 327
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 56,
          "tap_local_ordinal": 56,
          "tap_indent": 0,
          "name": "DI command checking keeps argv preview as data and cannot execute Git/Python",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 333,
          "duration_ms": 84.8067,
          "execution_id": "RUN-4f4867d67f980391-0056",
          "test_file": "tests/agentnexus/gateway.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 333
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 57,
          "tap_local_ordinal": 57,
          "tap_indent": 0,
          "name": "controlled static bytes close over binary, empty and nested same-name files",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 339,
          "duration_ms": 30.8112,
          "execution_id": "RUN-4f4867d67f980391-0057",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 339
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 58,
          "tap_local_ordinal": 58,
          "tap_indent": 0,
          "name": "empty package permits exactly its manifest, with zero payload budgets",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 345,
          "duration_ms": 6.187,
          "execution_id": "RUN-4f4867d67f980391-0058",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 345
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 59,
          "tap_local_ordinal": 59,
          "tap_indent": 0,
          "name": "matching mutable tree is INCONCLUSIVE, never a trusted release root",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 351,
          "duration_ms": 7.0448,
          "execution_id": "RUN-4f4867d67f980391-0059",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 351
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 60,
          "tap_local_ordinal": 60,
          "tap_indent": 0,
          "name": "same-size modified content fails its SHA-256",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 357,
          "duration_ms": 7.7854,
          "execution_id": "RUN-4f4867d67f980391-0060",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 357
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 61,
          "tap_local_ordinal": 61,
          "tap_indent": 0,
          "name": "appended content fails declared byte size",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 363,
          "duration_ms": 5.4976,
          "execution_id": "RUN-4f4867d67f980391-0061",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 363
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 62,
          "tap_local_ordinal": 62,
          "tap_indent": 0,
          "name": "missing and unlisted files are both reported by full relative path",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 369,
          "duration_ms": 5.5948,
          "execution_id": "RUN-4f4867d67f980391-0062",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 369
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 63,
          "tap_local_ordinal": 1,
          "tap_indent": 4,
          "name": "sub/manifest.json",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 376,
          "duration_ms": 6.8039,
          "execution_id": "RUN-4f4867d67f980391-0063",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 376
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 64,
          "tap_local_ordinal": 2,
          "tap_indent": 4,
          "name": "validation/SHA256SUMS.txt",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 382,
          "duration_ms": 6.4431,
          "execution_id": "RUN-4f4867d67f980391-0064",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 382
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 65,
          "tap_local_ordinal": 3,
          "tap_indent": 4,
          "name": "unexpected.cjs",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 388,
          "duration_ms": 5.8327,
          "execution_id": "RUN-4f4867d67f980391-0065",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 388
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 66,
          "tap_local_ordinal": 4,
          "tap_indent": 4,
          "name": ".hidden",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 394,
          "duration_ms": 17.141,
          "execution_id": "RUN-4f4867d67f980391-0066",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 394
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 67,
          "tap_local_ordinal": 63,
          "tap_indent": 0,
          "name": "unlisted nested manifest and SHA256SUMS names are never self exceptions",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 400,
          "duration_ms": 36.9056,
          "execution_id": "RUN-4f4867d67f980391-0067",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 400
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 68,
          "tap_local_ordinal": 64,
          "tap_indent": 0,
          "name": "root manifest is required and cannot list itself",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 406,
          "duration_ms": 3.8781,
          "execution_id": "RUN-4f4867d67f980391-0068",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 406
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 69,
          "tap_local_ordinal": 65,
          "tap_indent": 0,
          "name": "root manifest directory and non-directory roots fail",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 412,
          "duration_ms": 4.1724,
          "execution_id": "RUN-4f4867d67f980391-0069",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 412
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 70,
          "tap_local_ordinal": 66,
          "tap_indent": 0,
          "name": "duplicate JSON keys are rejected despite JSON.parse last-wins semantics",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 418,
          "duration_ms": 6.2695,
          "execution_id": "RUN-4f4867d67f980391-0070",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 418
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 71,
          "tap_local_ordinal": 67,
          "tap_indent": 0,
          "name": "duplicate complete path and unsorted arrays fail independently",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 424,
          "duration_ms": 4.6285,
          "execution_id": "RUN-4f4867d67f980391-0071",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 424
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 72,
          "tap_local_ordinal": 1,
          "tap_indent": 4,
          "name": "A vs a",
          "parents": [
            "case conflicts include ancestor directories and file-directory prefixes"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 431,
          "duration_ms": 3.2893,
          "execution_id": "RUN-4f4867d67f980391-0072",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 431
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 73,
          "tap_local_ordinal": 2,
          "tap_indent": 4,
          "name": "Dir/a vs dir/b",
          "parents": [
            "case conflicts include ancestor directories and file-directory prefixes"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 437,
          "duration_ms": 4.9038,
          "execution_id": "RUN-4f4867d67f980391-0073",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 437
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 74,
          "tap_local_ordinal": 3,
          "tap_indent": 4,
          "name": "a vs a/b",
          "parents": [
            "case conflicts include ancestor directories and file-directory prefixes"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 443,
          "duration_ms": 3.5516,
          "execution_id": "RUN-4f4867d67f980391-0074",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 443
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 75,
          "tap_local_ordinal": 68,
          "tap_indent": 0,
          "name": "case conflicts include ancestor directories and file-directory prefixes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 449,
          "duration_ms": 12.0882,
          "execution_id": "RUN-4f4867d67f980391-0075",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 449
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 76,
          "tap_local_ordinal": 1,
          "tap_indent": 4,
          "name": "\"../outside\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 456,
          "duration_ms": 3.9843,
          "execution_id": "RUN-4f4867d67f980391-0076",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 456
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 77,
          "tap_local_ordinal": 2,
          "tap_indent": 4,
          "name": "\"./a\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 462,
          "duration_ms": 3.8675,
          "execution_id": "RUN-4f4867d67f980391-0077",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 462
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 78,
          "tap_local_ordinal": 3,
          "tap_indent": 4,
          "name": "\"a//b\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 468,
          "duration_ms": 4.0878,
          "execution_id": "RUN-4f4867d67f980391-0078",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 468
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 79,
          "tap_local_ordinal": 4,
          "tap_indent": 4,
          "name": "\"/outside\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 474,
          "duration_ms": 4.6009,
          "execution_id": "RUN-4f4867d67f980391-0079",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 474
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 80,
          "tap_local_ordinal": 5,
          "tap_indent": 4,
          "name": "\"C:/outside\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 480,
          "duration_ms": 5.2372,
          "execution_id": "RUN-4f4867d67f980391-0080",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 480
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 81,
          "tap_local_ordinal": 6,
          "tap_indent": 4,
          "name": "\"//server/share\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 486,
          "duration_ms": 4.6877,
          "execution_id": "RUN-4f4867d67f980391-0081",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 486
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 82,
          "tap_local_ordinal": 7,
          "tap_indent": 4,
          "name": "\"a\\\\\\\\b\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 492,
          "duration_ms": 4.234,
          "execution_id": "RUN-4f4867d67f980391-0082",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 492
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 83,
          "tap_local_ordinal": 8,
          "tap_indent": 4,
          "name": "\"a:stream\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 498,
          "duration_ms": 4.9101,
          "execution_id": "RUN-4f4867d67f980391-0083",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 498
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 84,
          "tap_local_ordinal": 9,
          "tap_indent": 4,
          "name": "\"NUL.txt\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 504,
          "duration_ms": 4.3094,
          "execution_id": "RUN-4f4867d67f980391-0084",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 504
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 85,
          "tap_local_ordinal": 10,
          "tap_indent": 4,
          "name": "\"COM1\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 510,
          "duration_ms": 4.2162,
          "execution_id": "RUN-4f4867d67f980391-0085",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 510
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 86,
          "tap_local_ordinal": 11,
          "tap_indent": 4,
          "name": "\"con.tar.gz\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 516,
          "duration_ms": 4.5565,
          "execution_id": "RUN-4f4867d67f980391-0086",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 516
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 87,
          "tap_local_ordinal": 12,
          "tap_indent": 4,
          "name": "\"a.\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 522,
          "duration_ms": 4.8407,
          "execution_id": "RUN-4f4867d67f980391-0087",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 522
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 88,
          "tap_local_ordinal": 13,
          "tap_indent": 4,
          "name": "\"a \"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 528,
          "duration_ms": 4.1045,
          "execution_id": "RUN-4f4867d67f980391-0088",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 528
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 89,
          "tap_local_ordinal": 14,
          "tap_indent": 4,
          "name": "\"PROGRA~1/file\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 534,
          "duration_ms": 4.4071,
          "execution_id": "RUN-4f4867d67f980391-0089",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 534
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 90,
          "tap_local_ordinal": 15,
          "tap_indent": 4,
          "name": "\"\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 540,
          "duration_ms": 4.7247,
          "execution_id": "RUN-4f4867d67f980391-0090",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 540
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 91,
          "tap_local_ordinal": 16,
          "tap_indent": 4,
          "name": "\"a\\\\u0000b\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 546,
          "duration_ms": 4.1778,
          "execution_id": "RUN-4f4867d67f980391-0091",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 546
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 92,
          "tap_local_ordinal": 17,
          "tap_indent": 4,
          "name": "\"é\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 552,
          "duration_ms": 3.9498,
          "execution_id": "RUN-4f4867d67f980391-0092",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 552
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 93,
          "tap_local_ordinal": 18,
          "tap_indent": 4,
          "name": "\"é\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 558,
          "duration_ms": 4.6449,
          "execution_id": "RUN-4f4867d67f980391-0093",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 558
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 94,
          "tap_local_ordinal": 19,
          "tap_indent": 4,
          "name": "\"İ\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 564,
          "duration_ms": 3.9634,
          "execution_id": "RUN-4f4867d67f980391-0094",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 564
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 95,
          "tap_local_ordinal": 20,
          "tap_indent": 4,
          "name": "\"a/a/\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 570,
          "duration_ms": 3.6275,
          "execution_id": "RUN-4f4867d67f980391-0095",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 570
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 96,
          "tap_local_ordinal": 69,
          "tap_indent": 0,
          "name": "path traversal, device aliases, malformed separators and Unicode reject before payload reads",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 576,
          "duration_ms": 89.0276,
          "execution_id": "RUN-4f4867d67f980391-0096",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 576
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 97,
          "tap_local_ordinal": 70,
          "tap_indent": 0,
          "name": "schema, digest and byte count reject invalid declarations",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 582,
          "duration_ms": 13.4236,
          "execution_id": "RUN-4f4867d67f980391-0097",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 582
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 98,
          "tap_local_ordinal": 71,
          "tap_indent": 0,
          "name": "canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 588,
          "duration_ms": 7.9996,
          "execution_id": "RUN-4f4867d67f980391-0098",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 588
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 99,
          "tap_local_ordinal": 72,
          "tap_indent": 0,
          "name": "extra empty directory and file-vs-directory mismatch cannot disappear",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 594,
          "duration_ms": 8.0949,
          "execution_id": "RUN-4f4867d67f980391-0099",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 594
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 100,
          "tap_local_ordinal": 73,
          "tap_indent": 0,
          "name": "file count and total bytes budgets work at exact limit and limit plus one",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 600,
          "duration_ms": 8.1122,
          "execution_id": "RUN-4f4867d67f980391-0100",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 600
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 101,
          "tap_local_ordinal": 74,
          "tap_indent": 0,
          "name": "actual unlisted content also consumes size and count budgets",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 606,
          "duration_ms": 5.277,
          "execution_id": "RUN-4f4867d67f980391-0101",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 606
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 102,
          "tap_local_ordinal": 75,
          "tap_indent": 0,
          "name": "manifest and single-file caps are enforced without reading an oversized payload",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 612,
          "duration_ms": 4.8602,
          "execution_id": "RUN-4f4867d67f980391-0102",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 612
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 103,
          "tap_local_ordinal": 76,
          "tap_indent": 0,
          "name": "path length and depth have bounded rejection",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 618,
          "duration_ms": 3.9691,
          "execution_id": "RUN-4f4867d67f980391-0103",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 618
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 104,
          "tap_local_ordinal": 77,
          "tap_indent": 0,
          "name": "actual default file and directory count limits accept the edge and reject one more",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 624,
          "duration_ms": 928.8077,
          "execution_id": "RUN-4f4867d67f980391-0104",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 624
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 105,
          "tap_local_ordinal": 78,
          "tap_indent": 0,
          "name": "actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 630,
          "duration_ms": 41.5899,
          "execution_id": "RUN-4f4867d67f980391-0105",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 630
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 106,
          "tap_local_ordinal": 79,
          "tap_indent": 0,
          "name": "maximum component and depth are accepted on an actually created portable path",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 636,
          "duration_ms": 26.6226,
          "execution_id": "RUN-4f4867d67f980391-0106",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 636
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 107,
          "tap_local_ordinal": 80,
          "tap_indent": 0,
          "name": "Host cannot expand limits or choose an unknown mode; relative roots reject",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 642,
          "duration_ms": 2.8442,
          "execution_id": "RUN-4f4867d67f980391-0107",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 642
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 108,
          "tap_local_ordinal": 81,
          "tap_indent": 0,
          "name": "pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 648,
          "duration_ms": 5.7512,
          "execution_id": "RUN-4f4867d67f980391-0108",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 648
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 109,
          "tap_local_ordinal": 82,
          "tap_indent": 0,
          "name": "diagnostic count and encoded bytes remain bounded for many extra files",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 654,
          "duration_ms": 48.2203,
          "execution_id": "RUN-4f4867d67f980391-0109",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 654
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 110,
          "tap_local_ordinal": 83,
          "tap_indent": 0,
          "name": "candidate scripts, package metadata and git-looking files are data and never executed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 660,
          "duration_ms": 12.0539,
          "execution_id": "RUN-4f4867d67f980391-0110",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 660
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 111,
          "tap_local_ordinal": 84,
          "tap_indent": 0,
          "name": "real OS file symlink is rejected without following its target",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 666,
          "duration_ms": 3.733,
          "execution_id": "RUN-4f4867d67f980391-0111",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 666
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 112,
          "tap_local_ordinal": 85,
          "tap_indent": 0,
          "name": "real OS dir link is rejected",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 672,
          "duration_ms": 3.5639,
          "execution_id": "RUN-4f4867d67f980391-0112",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 672
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 113,
          "tap_local_ordinal": 86,
          "tap_indent": 0,
          "name": "real OS junction link is rejected",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 678,
          "duration_ms": 4.3934,
          "execution_id": "RUN-4f4867d67f980391-0113",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 678
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 114,
          "tap_local_ordinal": 87,
          "tap_indent": 0,
          "name": "real OS hardlink to an outside object is rejected by link count",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 684,
          "duration_ms": 3.3987,
          "execution_id": "RUN-4f4867d67f980391-0114",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 684
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 115,
          "tap_local_ordinal": 88,
          "tap_indent": 0,
          "name": "real SQLite, three independent domain chains and global pagination",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 690,
          "duration_ms": 97.9646,
          "execution_id": "RUN-4f4867d67f980391-0115",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 690
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 116,
          "tap_local_ordinal": 89,
          "tap_indent": 0,
          "name": "synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 696,
          "duration_ms": 25.3859,
          "execution_id": "RUN-4f4867d67f980391-0116",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 696
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 117,
          "tap_local_ordinal": 90,
          "tap_indent": 0,
          "name": "agent and session SQL filters apply before LIMIT and preserve global cursor pages",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 702,
          "duration_ms": 198.6897,
          "execution_id": "RUN-4f4867d67f980391-0117",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 702
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 118,
          "tap_local_ordinal": 91,
          "tap_indent": 0,
          "name": "flush covers its captured target after an empty or older shared flush",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 708,
          "duration_ms": 27.4047,
          "execution_id": "RUN-4f4867d67f980391-0118",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 708
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 119,
          "tap_local_ordinal": 92,
          "tap_indent": 0,
          "name": "required fields, malformed refs, oversized envelopes and query budgets reject without fault",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 714,
          "duration_ms": 20.9112,
          "execution_id": "RUN-4f4867d67f980391-0119",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 714
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 120,
          "tap_local_ordinal": 93,
          "tap_indent": 0,
          "name": "outbox high water rejects new records, then drains without unbounded queues",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 720,
          "duration_ms": 31.3933,
          "execution_id": "RUN-4f4867d67f980391-0120",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 720
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 121,
          "tap_local_ordinal": 94,
          "tap_indent": 0,
          "name": "second writer and live lock recovery are blocked; real owner death is explicit",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 726,
          "duration_ms": 178.6449,
          "execution_id": "RUN-4f4867d67f980391-0121",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 726
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 122,
          "tap_local_ordinal": 95,
          "tap_indent": 0,
          "name": "process crash after file fsync and before receipt reexports no duplicate",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 732,
          "duration_ms": 185.3666,
          "execution_id": "RUN-4f4867d67f980391-0122",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 732
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 123,
          "tap_local_ordinal": 96,
          "tap_indent": 0,
          "name": "unacknowledged crash tail is preserved then repaired from durable outbox",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 738,
          "duration_ms": 433.1586,
          "execution_id": "RUN-4f4867d67f980391-0123",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 738
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 124,
          "tap_local_ordinal": 97,
          "tap_indent": 0,
          "name": "actual export I/O failure freezes writes and preserves outbox until explicit recovery",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 744,
          "duration_ms": 32.3434,
          "execution_id": "RUN-4f4867d67f980391-0124",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 744
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 125,
          "tap_local_ordinal": 98,
          "tap_indent": 0,
          "name": "acknowledged truncation is never silently discarded or rebuilt as success",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 750,
          "duration_ms": 22.2769,
          "execution_id": "RUN-4f4867d67f980391-0125",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 750
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 126,
          "tap_local_ordinal": 99,
          "tap_indent": 0,
          "name": "actual artifact publication I/O failure retains bytes and freezes both record and object admission",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 756,
          "duration_ms": 27.1863,
          "execution_id": "RUN-4f4867d67f980391-0126",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 756
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 127,
          "tap_local_ordinal": 100,
          "tap_indent": 0,
          "name": "database hash tampering throws, freezes writes and does not fake repair",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 762,
          "duration_ms": 19.2056,
          "execution_id": "RUN-4f4867d67f980391-0127",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 762
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 128,
          "tap_local_ordinal": 101,
          "tap_indent": 0,
          "name": "32 MiB randomized artifact roundtrip streams with real backpressure and two hashes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 768,
          "duration_ms": 265.9668,
          "execution_id": "RUN-4f4867d67f980391-0128",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 768
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 129,
          "tap_local_ordinal": 102,
          "tap_indent": 0,
          "name": "cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 774,
          "duration_ms": 28.0356,
          "execution_id": "RUN-4f4867d67f980391-0129",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 774
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 130,
          "tap_local_ordinal": 103,
          "tap_indent": 0,
          "name": "early artifact iterator return is not verification; full corrupted stream fails closed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 780,
          "duration_ms": 38.1978,
          "execution_id": "RUN-4f4867d67f980391-0130",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 780
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 131,
          "tap_local_ordinal": 104,
          "tap_indent": 0,
          "name": "concurrent artifact admission is bounded and rejects a third stream without queueing",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 786,
          "duration_ms": 21.9493,
          "execution_id": "RUN-4f4867d67f980391-0131",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 786
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 132,
          "tap_local_ordinal": 105,
          "tap_indent": 0,
          "name": "abort races a permanently pending source.next without retaining Store writers or accepting late bytes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 792,
          "duration_ms": 21.5857,
          "execution_id": "RUN-4f4867d67f980391-0132",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 792
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 133,
          "tap_local_ordinal": 106,
          "tap_indent": 0,
          "name": "concurrent close calls share the real drain and lock-release promise",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 798,
          "duration_ms": 20.4103,
          "execution_id": "RUN-4f4867d67f980391-0133",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 798
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 134,
          "tap_local_ordinal": 107,
          "tap_indent": 0,
          "name": "sealed segments are compressed, chained and verified; stored bit flip is detected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 804,
          "duration_ms": 102.6549,
          "execution_id": "RUN-4f4867d67f980391-0134",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 804
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 135,
          "tap_local_ordinal": 108,
          "tap_indent": 0,
          "name": "process-killed partial artifact remains retained without a complete object reference",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 810,
          "duration_ms": 181.4257,
          "execution_id": "RUN-4f4867d67f980391-0135",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap",
            "line": 810
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        }
      ],
      "original_metadata_records": [
        {
          "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/test-results.json",
          "sha256": "8e8a6d90fed9dd3b015b74fa1517d2162a38f821161d3a6c899de104fec81c4b",
          "recorded_timing_fields": {
            "utc": "2026-11-06T17:51:09.855726+00:00"
          },
          "source_environment_and_command_binding_fields": {
            "command": [
              "node",
              "tools/agentnexus/run-tests.mjs"
            ]
          },
          "exact_started_utc": "NOT_AVAILABLE",
          "exact_ended_utc": "NOT_AVAILABLE"
        },
        {
          "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/final-verification.json",
          "sha256": "2f7e49d3b634ca5339e8797f47c20a4d1ba16bcf3ea9294c259ef83a7ac032b3",
          "recorded_timing_fields": {
            "utc": "2026-11-06T17:51:09.855726+00:00"
          },
          "source_environment_and_command_binding_fields": {
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
                "bytes": 11883,
                "sha256": "ca05754e624100b2dd863224efed67edc9cf0f245c6f63ef0069c544a8331ed6"
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
                "bytes": 17724,
                "sha256": "030655a357b66b656e3dcdadeab44848b26c5eb2a1dc82d29787987abf62aba1"
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
            "versions": {
              "node": "v24.15.0",
              "sqlite": "3.51.3",
              "zstd": "1.5.7",
              "platform": "win32"
            }
          },
          "exact_started_utc": "NOT_AVAILABLE",
          "exact_ended_utc": "NOT_AVAILABLE"
        }
      ],
      "record_status": "RAW_EVIDENCE_RETAINED",
      "case_count_matches_log_total": true
    },
    {
      "run_id": "RUN-15e56842285cf724",
      "log": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-01.tap",
      "sha256": "af0c62c7d73c4a412421fb57ee11230c8459e0cbd8fcb97e2c178fc2c3428dff",
      "bytes": 904,
      "totals": {
        "tests": 1,
        "pass": 0,
        "fail": 1,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0
      },
      "duration_ms": 75.8472,
      "cases": [
        {
          "ordinal": 1,
          "tap_local_ordinal": 1,
          "tap_indent": 0,
          "name": "tests\\\\agentnexus\\\\integrity.test.ts",
          "parents": [],
          "status": "FAIL",
          "reason": null,
          "log_line": 13,
          "duration_ms": 69.6651,
          "execution_id": "RUN-15e56842285cf724-0001",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-01.tap",
            "line": 13
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        }
      ],
      "original_metadata_records": [
        {
          "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-01.json",
          "sha256": "f5086eddec462029bf31c1484b7c01b2efdea0d991d999e6b9ebb6562561fd6f",
          "recorded_timing_fields": {
            "started_utc": "2026-11-06T17:04:50.645632+00:00",
            "ended_utc": "2026-11-06T17:04:50.796198+00:00"
          },
          "source_environment_and_command_binding_fields": {
            "source_sha256": {
              "src/agentnexus/integrity.ts": "bca7c1099e4336a2afac0c7a0947eeb19d23e4e71dcd79684105e04d154829d0",
              "tests/agentnexus/integrity.test.ts": "7c18d10d572f3b984e7d20ab6722a5a0cdf0755a41c94a684339fbcd6bcfbfc1",
              "src/agentnexus/types.ts": "25405c2752b9d5fa7466fa479507473c12d52acd57ba616683a54d3a7dd3028a"
            },
            "node_version": "v24.15.0",
            "platform": "Windows-11-10.0.26200-SP0",
            "command_argv": [
              "D:\\Nodejs\\node.exe",
              "--test",
              "--test-reporter=tap",
              "tests/agentnexus/integrity.test.ts"
            ]
          },
          "exact_started_utc": "2026-11-06T17:04:50.645632+00:00",
          "exact_ended_utc": "2026-11-06T17:04:50.796198+00:00"
        }
      ],
      "record_status": "RAW_EVIDENCE_RETAINED",
      "case_count_matches_log_total": true
    },
    {
      "run_id": "RUN-0fb29063256d8c23",
      "log": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
      "sha256": "f75d61f608a6e8c79a9a875560fa2d0f231d2d7681b7eb4f77c9cdd70b86783f",
      "bytes": 11281,
      "totals": {
        "tests": 58,
        "pass": 53,
        "fail": 1,
        "cancelled": 0,
        "skipped": 4,
        "todo": 0
      },
      "duration_ms": 1319.4265,
      "cases": [
        {
          "ordinal": 1,
          "tap_local_ordinal": 1,
          "tap_indent": 0,
          "name": "controlled static bytes close over binary, empty and nested same-name files",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 3,
          "duration_ms": 25.0667,
          "execution_id": "RUN-0fb29063256d8c23-0001",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 3
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 2,
          "tap_local_ordinal": 2,
          "tap_indent": 0,
          "name": "empty package permits exactly its manifest, with zero payload budgets",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 9,
          "duration_ms": 4.8611,
          "execution_id": "RUN-0fb29063256d8c23-0002",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 9
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 3,
          "tap_local_ordinal": 3,
          "tap_indent": 0,
          "name": "matching mutable tree is INCONCLUSIVE, never a trusted release root",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 15,
          "duration_ms": 6.2261,
          "execution_id": "RUN-0fb29063256d8c23-0003",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 15
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 4,
          "tap_local_ordinal": 4,
          "tap_indent": 0,
          "name": "same-size modified content fails its SHA-256",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 21,
          "duration_ms": 6.4955,
          "execution_id": "RUN-0fb29063256d8c23-0004",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 21
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 5,
          "tap_local_ordinal": 5,
          "tap_indent": 0,
          "name": "appended content fails declared byte size",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 27,
          "duration_ms": 5.0613,
          "execution_id": "RUN-0fb29063256d8c23-0005",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 27
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 6,
          "tap_local_ordinal": 6,
          "tap_indent": 0,
          "name": "missing and unlisted files are both reported by full relative path",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 33,
          "duration_ms": 4.9689,
          "execution_id": "RUN-0fb29063256d8c23-0006",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 33
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 7,
          "tap_local_ordinal": 1,
          "tap_indent": 4,
          "name": "sub/manifest.json",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 40,
          "duration_ms": 5.7732,
          "execution_id": "RUN-0fb29063256d8c23-0007",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 40
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 8,
          "tap_local_ordinal": 2,
          "tap_indent": 4,
          "name": "validation/SHA256SUMS.txt",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 46,
          "duration_ms": 6.59,
          "execution_id": "RUN-0fb29063256d8c23-0008",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 46
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 9,
          "tap_local_ordinal": 3,
          "tap_indent": 4,
          "name": "unexpected.cjs",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 52,
          "duration_ms": 4.8589,
          "execution_id": "RUN-0fb29063256d8c23-0009",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 52
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 10,
          "tap_local_ordinal": 4,
          "tap_indent": 4,
          "name": ".hidden",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 58,
          "duration_ms": 4.711,
          "execution_id": "RUN-0fb29063256d8c23-0010",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 58
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 11,
          "tap_local_ordinal": 7,
          "tap_indent": 0,
          "name": "unlisted nested manifest and SHA256SUMS names are never self exceptions",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 64,
          "duration_ms": 22.5016,
          "execution_id": "RUN-0fb29063256d8c23-0011",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 64
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 12,
          "tap_local_ordinal": 8,
          "tap_indent": 0,
          "name": "root manifest is required and cannot list itself",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 70,
          "duration_ms": 3.5874,
          "execution_id": "RUN-0fb29063256d8c23-0012",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 70
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 13,
          "tap_local_ordinal": 9,
          "tap_indent": 0,
          "name": "root manifest directory and non-directory roots fail",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 76,
          "duration_ms": 3.9041,
          "execution_id": "RUN-0fb29063256d8c23-0013",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 76
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 14,
          "tap_local_ordinal": 10,
          "tap_indent": 0,
          "name": "duplicate JSON keys are rejected despite JSON.parse last-wins semantics",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 82,
          "duration_ms": 5.0437,
          "execution_id": "RUN-0fb29063256d8c23-0014",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 82
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 15,
          "tap_local_ordinal": 11,
          "tap_indent": 0,
          "name": "duplicate complete path and unsorted arrays fail independently",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 88,
          "duration_ms": 4.4908,
          "execution_id": "RUN-0fb29063256d8c23-0015",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 88
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 16,
          "tap_local_ordinal": 1,
          "tap_indent": 4,
          "name": "A vs a",
          "parents": [
            "case conflicts include ancestor directories and file-directory prefixes"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 95,
          "duration_ms": 3.1089,
          "execution_id": "RUN-0fb29063256d8c23-0016",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 95
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 17,
          "tap_local_ordinal": 2,
          "tap_indent": 4,
          "name": "Dir/a vs dir/b",
          "parents": [
            "case conflicts include ancestor directories and file-directory prefixes"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 101,
          "duration_ms": 3.32,
          "execution_id": "RUN-0fb29063256d8c23-0017",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 101
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 18,
          "tap_local_ordinal": 3,
          "tap_indent": 4,
          "name": "a vs a/b",
          "parents": [
            "case conflicts include ancestor directories and file-directory prefixes"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 107,
          "duration_ms": 4.1335,
          "execution_id": "RUN-0fb29063256d8c23-0018",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 107
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 19,
          "tap_local_ordinal": 12,
          "tap_indent": 0,
          "name": "case conflicts include ancestor directories and file-directory prefixes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 113,
          "duration_ms": 10.9076,
          "execution_id": "RUN-0fb29063256d8c23-0019",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 113
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 20,
          "tap_local_ordinal": 1,
          "tap_indent": 4,
          "name": "\"../outside\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 120,
          "duration_ms": 4.4739,
          "execution_id": "RUN-0fb29063256d8c23-0020",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 120
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 21,
          "tap_local_ordinal": 2,
          "tap_indent": 4,
          "name": "\"./a\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 126,
          "duration_ms": 3.5572,
          "execution_id": "RUN-0fb29063256d8c23-0021",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 126
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 22,
          "tap_local_ordinal": 3,
          "tap_indent": 4,
          "name": "\"a//b\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 132,
          "duration_ms": 6.1629,
          "execution_id": "RUN-0fb29063256d8c23-0022",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 132
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 23,
          "tap_local_ordinal": 4,
          "tap_indent": 4,
          "name": "\"/outside\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 138,
          "duration_ms": 3.8612,
          "execution_id": "RUN-0fb29063256d8c23-0023",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 138
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 24,
          "tap_local_ordinal": 5,
          "tap_indent": 4,
          "name": "\"C:/outside\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 144,
          "duration_ms": 3.5562,
          "execution_id": "RUN-0fb29063256d8c23-0024",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 144
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 25,
          "tap_local_ordinal": 6,
          "tap_indent": 4,
          "name": "\"//server/share\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 150,
          "duration_ms": 3.3194,
          "execution_id": "RUN-0fb29063256d8c23-0025",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 150
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 26,
          "tap_local_ordinal": 7,
          "tap_indent": 4,
          "name": "\"a\\\\\\\\b\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 156,
          "duration_ms": 3.3441,
          "execution_id": "RUN-0fb29063256d8c23-0026",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 156
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 27,
          "tap_local_ordinal": 8,
          "tap_indent": 4,
          "name": "\"a:stream\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 162,
          "duration_ms": 3.8359,
          "execution_id": "RUN-0fb29063256d8c23-0027",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 162
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 28,
          "tap_local_ordinal": 9,
          "tap_indent": 4,
          "name": "\"NUL.txt\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 168,
          "duration_ms": 6.7215,
          "execution_id": "RUN-0fb29063256d8c23-0028",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 168
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 29,
          "tap_local_ordinal": 10,
          "tap_indent": 4,
          "name": "\"COM1\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 174,
          "duration_ms": 4.6204,
          "execution_id": "RUN-0fb29063256d8c23-0029",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 174
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 30,
          "tap_local_ordinal": 11,
          "tap_indent": 4,
          "name": "\"con.tar.gz\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 180,
          "duration_ms": 5.3963,
          "execution_id": "RUN-0fb29063256d8c23-0030",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 180
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 31,
          "tap_local_ordinal": 12,
          "tap_indent": 4,
          "name": "\"a.\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 186,
          "duration_ms": 4.4996,
          "execution_id": "RUN-0fb29063256d8c23-0031",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 186
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 32,
          "tap_local_ordinal": 13,
          "tap_indent": 4,
          "name": "\"a \"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 192,
          "duration_ms": 5.7808,
          "execution_id": "RUN-0fb29063256d8c23-0032",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 192
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 33,
          "tap_local_ordinal": 14,
          "tap_indent": 4,
          "name": "\"PROGRA~1/file\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 198,
          "duration_ms": 5.8328,
          "execution_id": "RUN-0fb29063256d8c23-0033",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 198
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 34,
          "tap_local_ordinal": 15,
          "tap_indent": 4,
          "name": "\"\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 204,
          "duration_ms": 5.2294,
          "execution_id": "RUN-0fb29063256d8c23-0034",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 204
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 35,
          "tap_local_ordinal": 16,
          "tap_indent": 4,
          "name": "\"a\\\\u0000b\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 210,
          "duration_ms": 5.5469,
          "execution_id": "RUN-0fb29063256d8c23-0035",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 210
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 36,
          "tap_local_ordinal": 17,
          "tap_indent": 4,
          "name": "\"é\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 216,
          "duration_ms": 5.0764,
          "execution_id": "RUN-0fb29063256d8c23-0036",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 216
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 37,
          "tap_local_ordinal": 18,
          "tap_indent": 4,
          "name": "\"é\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 222,
          "duration_ms": 5.7966,
          "execution_id": "RUN-0fb29063256d8c23-0037",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 222
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 38,
          "tap_local_ordinal": 19,
          "tap_indent": 4,
          "name": "\"İ\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 228,
          "duration_ms": 5.1265,
          "execution_id": "RUN-0fb29063256d8c23-0038",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 228
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 39,
          "tap_local_ordinal": 20,
          "tap_indent": 4,
          "name": "\"a/a/\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 234,
          "duration_ms": 5.0695,
          "execution_id": "RUN-0fb29063256d8c23-0039",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 234
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 40,
          "tap_local_ordinal": 13,
          "tap_indent": 0,
          "name": "path traversal, device aliases, malformed separators and Unicode reject before payload reads",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 240,
          "duration_ms": 98.7205,
          "execution_id": "RUN-0fb29063256d8c23-0040",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 240
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 41,
          "tap_local_ordinal": 14,
          "tap_indent": 0,
          "name": "schema, digest and byte count reject invalid declarations",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 246,
          "duration_ms": 18.8021,
          "execution_id": "RUN-0fb29063256d8c23-0041",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 246
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 42,
          "tap_local_ordinal": 15,
          "tap_indent": 0,
          "name": "canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 252,
          "duration_ms": 10.8542,
          "execution_id": "RUN-0fb29063256d8c23-0042",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 252
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 43,
          "tap_local_ordinal": 16,
          "tap_indent": 0,
          "name": "extra empty directory and file-vs-directory mismatch cannot disappear",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 258,
          "duration_ms": 8.9082,
          "execution_id": "RUN-0fb29063256d8c23-0043",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 258
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 44,
          "tap_local_ordinal": 17,
          "tap_indent": 0,
          "name": "file count and total bytes budgets work at exact limit and limit plus one",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 264,
          "duration_ms": 8.818,
          "execution_id": "RUN-0fb29063256d8c23-0044",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 264
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 45,
          "tap_local_ordinal": 18,
          "tap_indent": 0,
          "name": "actual unlisted content also consumes size and count budgets",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 270,
          "duration_ms": 7.1193,
          "execution_id": "RUN-0fb29063256d8c23-0045",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 270
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 46,
          "tap_local_ordinal": 19,
          "tap_indent": 0,
          "name": "manifest and single-file caps are enforced without reading an oversized payload",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 276,
          "duration_ms": 7.3735,
          "execution_id": "RUN-0fb29063256d8c23-0046",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 276
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 47,
          "tap_local_ordinal": 20,
          "tap_indent": 0,
          "name": "path length and depth have bounded rejection",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 282,
          "duration_ms": 5.8599,
          "execution_id": "RUN-0fb29063256d8c23-0047",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 282
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 48,
          "tap_local_ordinal": 21,
          "tap_indent": 0,
          "name": "actual default file and directory count limits accept the edge and reject one more",
          "parents": [],
          "status": "FAIL",
          "reason": null,
          "log_line": 288,
          "duration_ms": 762.1301,
          "execution_id": "RUN-0fb29063256d8c23-0048",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 288
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 49,
          "tap_local_ordinal": 22,
          "tap_indent": 0,
          "name": "actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 313,
          "duration_ms": 44.0567,
          "execution_id": "RUN-0fb29063256d8c23-0049",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 313
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 50,
          "tap_local_ordinal": 23,
          "tap_indent": 0,
          "name": "maximum component and depth are accepted on an actually created portable path",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 319,
          "duration_ms": 28.6588,
          "execution_id": "RUN-0fb29063256d8c23-0050",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 319
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 51,
          "tap_local_ordinal": 24,
          "tap_indent": 0,
          "name": "Host cannot expand limits or choose an unknown mode; relative roots reject",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 325,
          "duration_ms": 3.2848,
          "execution_id": "RUN-0fb29063256d8c23-0051",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 325
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 52,
          "tap_local_ordinal": 25,
          "tap_indent": 0,
          "name": "pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 331,
          "duration_ms": 6.0841,
          "execution_id": "RUN-0fb29063256d8c23-0052",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 331
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 53,
          "tap_local_ordinal": 26,
          "tap_indent": 0,
          "name": "diagnostic count and encoded bytes remain bounded for many extra files",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 337,
          "duration_ms": 45.6768,
          "execution_id": "RUN-0fb29063256d8c23-0053",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 337
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 54,
          "tap_local_ordinal": 27,
          "tap_indent": 0,
          "name": "candidate scripts, package metadata and git-looking files are data and never executed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 343,
          "duration_ms": 11.5848,
          "execution_id": "RUN-0fb29063256d8c23-0054",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 343
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 55,
          "tap_local_ordinal": 28,
          "tap_indent": 0,
          "name": "real OS file symlink is rejected without following its target",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 349,
          "duration_ms": 3.8592,
          "execution_id": "RUN-0fb29063256d8c23-0055",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 349
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 56,
          "tap_local_ordinal": 29,
          "tap_indent": 0,
          "name": "real OS dir link is rejected",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 355,
          "duration_ms": 3.9231,
          "execution_id": "RUN-0fb29063256d8c23-0056",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 355
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 57,
          "tap_local_ordinal": 30,
          "tap_indent": 0,
          "name": "real OS junction link is rejected",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 361,
          "duration_ms": 4.048,
          "execution_id": "RUN-0fb29063256d8c23-0057",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 361
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 58,
          "tap_local_ordinal": 31,
          "tap_indent": 0,
          "name": "real OS hardlink to an outside object is rejected by link count",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 367,
          "duration_ms": 3.6443,
          "execution_id": "RUN-0fb29063256d8c23-0058",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap",
            "line": 367
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        }
      ],
      "original_metadata_records": [
        {
          "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.json",
          "sha256": "a4f2252044c9bf459a6f4e378313f44980de6e98f2042fef4defee433557a492",
          "recorded_timing_fields": {
            "started_utc": "2026-11-06T17:07:24.343739+00:00",
            "ended_utc": "2026-11-06T17:07:25.727566+00:00"
          },
          "source_environment_and_command_binding_fields": {
            "source_sha256": {
              "src/agentnexus/integrity.ts": "bca7c1099e4336a2afac0c7a0947eeb19d23e4e71dcd79684105e04d154829d0",
              "tests/agentnexus/integrity.test.ts": "802d2ab1c441e87d88c77da998752ee3a6b5e4298c5ccf20b2c56facfe7e1567",
              "src/agentnexus/types.ts": "273780415d1e00476dcfc52ca901a15527d62f1e74c1a46def5757251afcfcd8"
            },
            "node_version": "v24.15.0",
            "platform": "Windows-11-10.0.26200-SP0",
            "command_argv": [
              "D:\\Nodejs\\node.exe",
              "--test",
              "--test-reporter=tap",
              "tests/agentnexus/integrity.test.ts"
            ]
          },
          "exact_started_utc": "2026-11-06T17:07:24.343739+00:00",
          "exact_ended_utc": "2026-11-06T17:07:25.727566+00:00"
        }
      ],
      "record_status": "RAW_EVIDENCE_RETAINED",
      "case_count_matches_log_total": true
    },
    {
      "run_id": "RUN-9119d87db20276ff",
      "log": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
      "sha256": "219cf8196b126b0c8d96501ec55fc36a814df64c7a7322ab2bae84081fec5818",
      "bytes": 9705,
      "totals": {
        "tests": 58,
        "pass": 54,
        "fail": 0,
        "cancelled": 0,
        "skipped": 4,
        "todo": 0
      },
      "duration_ms": 1789.3877,
      "cases": [
        {
          "ordinal": 1,
          "tap_local_ordinal": 1,
          "tap_indent": 0,
          "name": "controlled static bytes close over binary, empty and nested same-name files",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 3,
          "duration_ms": 25.3575,
          "execution_id": "RUN-9119d87db20276ff-0001",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 3
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 2,
          "tap_local_ordinal": 2,
          "tap_indent": 0,
          "name": "empty package permits exactly its manifest, with zero payload budgets",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 9,
          "duration_ms": 5.9397,
          "execution_id": "RUN-9119d87db20276ff-0002",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 9
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 3,
          "tap_local_ordinal": 3,
          "tap_indent": 0,
          "name": "matching mutable tree is INCONCLUSIVE, never a trusted release root",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 15,
          "duration_ms": 7.2838,
          "execution_id": "RUN-9119d87db20276ff-0003",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 15
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 4,
          "tap_local_ordinal": 4,
          "tap_indent": 0,
          "name": "same-size modified content fails its SHA-256",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 21,
          "duration_ms": 7.4722,
          "execution_id": "RUN-9119d87db20276ff-0004",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 21
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 5,
          "tap_local_ordinal": 5,
          "tap_indent": 0,
          "name": "appended content fails declared byte size",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 27,
          "duration_ms": 5.7553,
          "execution_id": "RUN-9119d87db20276ff-0005",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 27
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 6,
          "tap_local_ordinal": 6,
          "tap_indent": 0,
          "name": "missing and unlisted files are both reported by full relative path",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 33,
          "duration_ms": 6.1535,
          "execution_id": "RUN-9119d87db20276ff-0006",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 33
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 7,
          "tap_local_ordinal": 1,
          "tap_indent": 4,
          "name": "sub/manifest.json",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 40,
          "duration_ms": 7.3303,
          "execution_id": "RUN-9119d87db20276ff-0007",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 40
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 8,
          "tap_local_ordinal": 2,
          "tap_indent": 4,
          "name": "validation/SHA256SUMS.txt",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 46,
          "duration_ms": 9.0158,
          "execution_id": "RUN-9119d87db20276ff-0008",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 46
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 9,
          "tap_local_ordinal": 3,
          "tap_indent": 4,
          "name": "unexpected.cjs",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 52,
          "duration_ms": 6.289,
          "execution_id": "RUN-9119d87db20276ff-0009",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 52
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 10,
          "tap_local_ordinal": 4,
          "tap_indent": 4,
          "name": ".hidden",
          "parents": [
            "unlisted nested manifest and SHA256SUMS names are never self exceptions"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 58,
          "duration_ms": 5.6974,
          "execution_id": "RUN-9119d87db20276ff-0010",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 58
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 11,
          "tap_local_ordinal": 7,
          "tap_indent": 0,
          "name": "unlisted nested manifest and SHA256SUMS names are never self exceptions",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 64,
          "duration_ms": 29.0482,
          "execution_id": "RUN-9119d87db20276ff-0011",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 64
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 12,
          "tap_local_ordinal": 8,
          "tap_indent": 0,
          "name": "root manifest is required and cannot list itself",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 70,
          "duration_ms": 5.8015,
          "execution_id": "RUN-9119d87db20276ff-0012",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 70
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 13,
          "tap_local_ordinal": 9,
          "tap_indent": 0,
          "name": "root manifest directory and non-directory roots fail",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 76,
          "duration_ms": 5.1489,
          "execution_id": "RUN-9119d87db20276ff-0013",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 76
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 14,
          "tap_local_ordinal": 10,
          "tap_indent": 0,
          "name": "duplicate JSON keys are rejected despite JSON.parse last-wins semantics",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 82,
          "duration_ms": 6.6665,
          "execution_id": "RUN-9119d87db20276ff-0014",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 82
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 15,
          "tap_local_ordinal": 11,
          "tap_indent": 0,
          "name": "duplicate complete path and unsorted arrays fail independently",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 88,
          "duration_ms": 5.6725,
          "execution_id": "RUN-9119d87db20276ff-0015",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 88
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 16,
          "tap_local_ordinal": 1,
          "tap_indent": 4,
          "name": "A vs a",
          "parents": [
            "case conflicts include ancestor directories and file-directory prefixes"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 95,
          "duration_ms": 3.6128,
          "execution_id": "RUN-9119d87db20276ff-0016",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 95
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 17,
          "tap_local_ordinal": 2,
          "tap_indent": 4,
          "name": "Dir/a vs dir/b",
          "parents": [
            "case conflicts include ancestor directories and file-directory prefixes"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 101,
          "duration_ms": 3.777,
          "execution_id": "RUN-9119d87db20276ff-0017",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 101
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 18,
          "tap_local_ordinal": 3,
          "tap_indent": 4,
          "name": "a vs a/b",
          "parents": [
            "case conflicts include ancestor directories and file-directory prefixes"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 107,
          "duration_ms": 3.1971,
          "execution_id": "RUN-9119d87db20276ff-0018",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 107
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 19,
          "tap_local_ordinal": 12,
          "tap_indent": 0,
          "name": "case conflicts include ancestor directories and file-directory prefixes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 113,
          "duration_ms": 10.9714,
          "execution_id": "RUN-9119d87db20276ff-0019",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 113
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 20,
          "tap_local_ordinal": 1,
          "tap_indent": 4,
          "name": "\"../outside\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 120,
          "duration_ms": 5.4017,
          "execution_id": "RUN-9119d87db20276ff-0020",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 120
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 21,
          "tap_local_ordinal": 2,
          "tap_indent": 4,
          "name": "\"./a\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 126,
          "duration_ms": 4.3188,
          "execution_id": "RUN-9119d87db20276ff-0021",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 126
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 22,
          "tap_local_ordinal": 3,
          "tap_indent": 4,
          "name": "\"a//b\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 132,
          "duration_ms": 5.8812,
          "execution_id": "RUN-9119d87db20276ff-0022",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 132
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 23,
          "tap_local_ordinal": 4,
          "tap_indent": 4,
          "name": "\"/outside\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 138,
          "duration_ms": 4.2883,
          "execution_id": "RUN-9119d87db20276ff-0023",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 138
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 24,
          "tap_local_ordinal": 5,
          "tap_indent": 4,
          "name": "\"C:/outside\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 144,
          "duration_ms": 5.5516,
          "execution_id": "RUN-9119d87db20276ff-0024",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 144
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 25,
          "tap_local_ordinal": 6,
          "tap_indent": 4,
          "name": "\"//server/share\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 150,
          "duration_ms": 5.2519,
          "execution_id": "RUN-9119d87db20276ff-0025",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 150
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 26,
          "tap_local_ordinal": 7,
          "tap_indent": 4,
          "name": "\"a\\\\\\\\b\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 156,
          "duration_ms": 4.6438,
          "execution_id": "RUN-9119d87db20276ff-0026",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 156
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 27,
          "tap_local_ordinal": 8,
          "tap_indent": 4,
          "name": "\"a:stream\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 162,
          "duration_ms": 5.0128,
          "execution_id": "RUN-9119d87db20276ff-0027",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 162
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 28,
          "tap_local_ordinal": 9,
          "tap_indent": 4,
          "name": "\"NUL.txt\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 168,
          "duration_ms": 4.3439,
          "execution_id": "RUN-9119d87db20276ff-0028",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 168
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 29,
          "tap_local_ordinal": 10,
          "tap_indent": 4,
          "name": "\"COM1\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 174,
          "duration_ms": 4.7259,
          "execution_id": "RUN-9119d87db20276ff-0029",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 174
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 30,
          "tap_local_ordinal": 11,
          "tap_indent": 4,
          "name": "\"con.tar.gz\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 180,
          "duration_ms": 4.4007,
          "execution_id": "RUN-9119d87db20276ff-0030",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 180
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 31,
          "tap_local_ordinal": 12,
          "tap_indent": 4,
          "name": "\"a.\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 186,
          "duration_ms": 4.0913,
          "execution_id": "RUN-9119d87db20276ff-0031",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 186
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 32,
          "tap_local_ordinal": 13,
          "tap_indent": 4,
          "name": "\"a \"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 192,
          "duration_ms": 3.8119,
          "execution_id": "RUN-9119d87db20276ff-0032",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 192
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 33,
          "tap_local_ordinal": 14,
          "tap_indent": 4,
          "name": "\"PROGRA~1/file\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 198,
          "duration_ms": 3.6116,
          "execution_id": "RUN-9119d87db20276ff-0033",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 198
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 34,
          "tap_local_ordinal": 15,
          "tap_indent": 4,
          "name": "\"\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 204,
          "duration_ms": 4.5892,
          "execution_id": "RUN-9119d87db20276ff-0034",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 204
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 35,
          "tap_local_ordinal": 16,
          "tap_indent": 4,
          "name": "\"a\\\\u0000b\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 210,
          "duration_ms": 4.8348,
          "execution_id": "RUN-9119d87db20276ff-0035",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 210
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 36,
          "tap_local_ordinal": 17,
          "tap_indent": 4,
          "name": "\"é\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 216,
          "duration_ms": 4.3733,
          "execution_id": "RUN-9119d87db20276ff-0036",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 216
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 37,
          "tap_local_ordinal": 18,
          "tap_indent": 4,
          "name": "\"é\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 222,
          "duration_ms": 5.1305,
          "execution_id": "RUN-9119d87db20276ff-0037",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 222
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 38,
          "tap_local_ordinal": 19,
          "tap_indent": 4,
          "name": "\"İ\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 228,
          "duration_ms": 5.2008,
          "execution_id": "RUN-9119d87db20276ff-0038",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 228
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 39,
          "tap_local_ordinal": 20,
          "tap_indent": 4,
          "name": "\"a/a/\"",
          "parents": [
            "path traversal, device aliases, malformed separators and Unicode reject before payload reads"
          ],
          "status": "PASS",
          "reason": null,
          "log_line": 234,
          "duration_ms": 5.1952,
          "execution_id": "RUN-9119d87db20276ff-0039",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 234
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 40,
          "tap_local_ordinal": 13,
          "tap_indent": 0,
          "name": "path traversal, device aliases, malformed separators and Unicode reject before payload reads",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 240,
          "duration_ms": 96.8778,
          "execution_id": "RUN-9119d87db20276ff-0040",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 240
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 41,
          "tap_local_ordinal": 14,
          "tap_indent": 0,
          "name": "schema, digest and byte count reject invalid declarations",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 246,
          "duration_ms": 17.4737,
          "execution_id": "RUN-9119d87db20276ff-0041",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 246
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 42,
          "tap_local_ordinal": 15,
          "tap_indent": 0,
          "name": "canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 252,
          "duration_ms": 11.108,
          "execution_id": "RUN-9119d87db20276ff-0042",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 252
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 43,
          "tap_local_ordinal": 16,
          "tap_indent": 0,
          "name": "extra empty directory and file-vs-directory mismatch cannot disappear",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 258,
          "duration_ms": 7.4058,
          "execution_id": "RUN-9119d87db20276ff-0043",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 258
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 44,
          "tap_local_ordinal": 17,
          "tap_indent": 0,
          "name": "file count and total bytes budgets work at exact limit and limit plus one",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 264,
          "duration_ms": 8.061,
          "execution_id": "RUN-9119d87db20276ff-0044",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 264
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 45,
          "tap_local_ordinal": 18,
          "tap_indent": 0,
          "name": "actual unlisted content also consumes size and count budgets",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 270,
          "duration_ms": 5.101,
          "execution_id": "RUN-9119d87db20276ff-0045",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 270
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 46,
          "tap_local_ordinal": 19,
          "tap_indent": 0,
          "name": "manifest and single-file caps are enforced without reading an oversized payload",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 276,
          "duration_ms": 5.558,
          "execution_id": "RUN-9119d87db20276ff-0046",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 276
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 47,
          "tap_local_ordinal": 20,
          "tap_indent": 0,
          "name": "path length and depth have bounded rejection",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 282,
          "duration_ms": 5.1291,
          "execution_id": "RUN-9119d87db20276ff-0047",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 282
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 48,
          "tap_local_ordinal": 21,
          "tap_indent": 0,
          "name": "actual default file and directory count limits accept the edge and reject one more",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 288,
          "duration_ms": 1134.5155,
          "execution_id": "RUN-9119d87db20276ff-0048",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 288
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 49,
          "tap_local_ordinal": 22,
          "tap_indent": 0,
          "name": "actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 294,
          "duration_ms": 53.9937,
          "execution_id": "RUN-9119d87db20276ff-0049",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 294
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 50,
          "tap_local_ordinal": 23,
          "tap_indent": 0,
          "name": "maximum component and depth are accepted on an actually created portable path",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 300,
          "duration_ms": 33.6235,
          "execution_id": "RUN-9119d87db20276ff-0050",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 300
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 51,
          "tap_local_ordinal": 24,
          "tap_indent": 0,
          "name": "Host cannot expand limits or choose an unknown mode; relative roots reject",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 306,
          "duration_ms": 4.5037,
          "execution_id": "RUN-9119d87db20276ff-0051",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 306
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 52,
          "tap_local_ordinal": 25,
          "tap_indent": 0,
          "name": "pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 312,
          "duration_ms": 8.2656,
          "execution_id": "RUN-9119d87db20276ff-0052",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 312
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 53,
          "tap_local_ordinal": 26,
          "tap_indent": 0,
          "name": "diagnostic count and encoded bytes remain bounded for many extra files",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 318,
          "duration_ms": 57.9299,
          "execution_id": "RUN-9119d87db20276ff-0053",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 318
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 54,
          "tap_local_ordinal": 27,
          "tap_indent": 0,
          "name": "candidate scripts, package metadata and git-looking files are data and never executed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 324,
          "duration_ms": 16.6019,
          "execution_id": "RUN-9119d87db20276ff-0054",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 324
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 55,
          "tap_local_ordinal": 28,
          "tap_indent": 0,
          "name": "real OS file symlink is rejected without following its target",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 330,
          "duration_ms": 5.0574,
          "execution_id": "RUN-9119d87db20276ff-0055",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 330
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 56,
          "tap_local_ordinal": 29,
          "tap_indent": 0,
          "name": "real OS dir link is rejected",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 336,
          "duration_ms": 4.2569,
          "execution_id": "RUN-9119d87db20276ff-0056",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 336
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 57,
          "tap_local_ordinal": 30,
          "tap_indent": 0,
          "name": "real OS junction link is rejected",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 342,
          "duration_ms": 4.1898,
          "execution_id": "RUN-9119d87db20276ff-0057",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 342
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 58,
          "tap_local_ordinal": 31,
          "tap_indent": 0,
          "name": "real OS hardlink to an outside object is rejected by link count",
          "parents": [],
          "status": "NOT_RUN",
          "reason": "NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS",
          "log_line": 348,
          "duration_ms": 3.7314,
          "execution_id": "RUN-9119d87db20276ff-0058",
          "test_file": "tests/agentnexus/integrity.test.ts",
          "actually_executed": false,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
            "line": 348
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        }
      ],
      "original_metadata_records": [
        {
          "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/test-run.json",
          "sha256": "8ffb9dc980a3c23af1deb86d025af8d184bd3d364bcf37a87e56f01d28fc7527",
          "recorded_timing_fields": {
            "started_utc": "2026-11-06T17:08:17.263695+00:00",
            "ended_utc": "2026-11-06T17:08:19.129540+00:00"
          },
          "source_environment_and_command_binding_fields": {
            "source_sha256": {
              "src/agentnexus/integrity.ts": "172a40c429c9e8a99f8cc1fcee2ef500adb4e7d378f0f6188fbbe7f792edfe66",
              "tests/agentnexus/integrity.test.ts": "ecc6655be30a7d7690f04e5d26c61f09eaaa988ae1075b63327fe98c97c93277",
              "src/agentnexus/types.ts": "273780415d1e00476dcfc52ca901a15527d62f1e74c1a46def5757251afcfcd8"
            },
            "node_version": "v24.15.0",
            "platform": "Windows-11-10.0.26200-SP0",
            "command_argv": [
              "D:\\Nodejs\\node.exe",
              "--test",
              "--test-reporter=tap",
              "tests/agentnexus/integrity.test.ts"
            ]
          },
          "exact_started_utc": "2026-11-06T17:08:17.263695+00:00",
          "exact_ended_utc": "2026-11-06T17:08:19.129540+00:00"
        }
      ],
      "record_status": "RAW_EVIDENCE_RETAINED",
      "case_count_matches_log_total": true
    },
    {
      "run_id": "RUN-431d1f07f7962a28",
      "log": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
      "sha256": "1a82c98c3558c7165b5a7691900d7b9b10e5b42969959a0db45507d94ac0ac77",
      "bytes": 4177,
      "totals": {
        "tests": 17,
        "pass": 17,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0
      },
      "duration_ms": 2023.9801,
      "cases": [
        {
          "ordinal": 1,
          "tap_local_ordinal": 1,
          "tap_indent": 0,
          "name": "real SQLite, three independent domain chains and global pagination",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 3,
          "duration_ms": 104.0128,
          "execution_id": "RUN-431d1f07f7962a28-0001",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 3
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 2,
          "tap_local_ordinal": 2,
          "tap_indent": 0,
          "name": "synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 9,
          "duration_ms": 28.4037,
          "execution_id": "RUN-431d1f07f7962a28-0002",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 9
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 3,
          "tap_local_ordinal": 3,
          "tap_indent": 0,
          "name": "required fields, malformed refs, oversized envelopes and query budgets reject without fault",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 15,
          "duration_ms": 23.0751,
          "execution_id": "RUN-431d1f07f7962a28-0003",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 15
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 4,
          "tap_local_ordinal": 4,
          "tap_indent": 0,
          "name": "outbox high water rejects new records, then drains without unbounded queues",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 21,
          "duration_ms": 36.5349,
          "execution_id": "RUN-431d1f07f7962a28-0004",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 21
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 5,
          "tap_local_ordinal": 5,
          "tap_indent": 0,
          "name": "second writer and live lock recovery are blocked; real owner death is explicit",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 27,
          "duration_ms": 238.2662,
          "execution_id": "RUN-431d1f07f7962a28-0005",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 27
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 6,
          "tap_local_ordinal": 6,
          "tap_indent": 0,
          "name": "process crash after file fsync and before receipt reexports no duplicate",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 33,
          "duration_ms": 216.7749,
          "execution_id": "RUN-431d1f07f7962a28-0006",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 33
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 7,
          "tap_local_ordinal": 7,
          "tap_indent": 0,
          "name": "unacknowledged crash tail is preserved then repaired from durable outbox",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 39,
          "duration_ms": 452.0618,
          "execution_id": "RUN-431d1f07f7962a28-0007",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 39
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 8,
          "tap_local_ordinal": 8,
          "tap_indent": 0,
          "name": "actual export I/O failure freezes writes and preserves outbox until explicit recovery",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 45,
          "duration_ms": 30.6218,
          "execution_id": "RUN-431d1f07f7962a28-0008",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 45
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 9,
          "tap_local_ordinal": 9,
          "tap_indent": 0,
          "name": "acknowledged truncation is never silently discarded or rebuilt as success",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 51,
          "duration_ms": 19.7031,
          "execution_id": "RUN-431d1f07f7962a28-0009",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 51
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 10,
          "tap_local_ordinal": 10,
          "tap_indent": 0,
          "name": "actual artifact publication I/O failure retains bytes and freezes both record and object admission",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 57,
          "duration_ms": 25.546,
          "execution_id": "RUN-431d1f07f7962a28-0010",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 57
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 11,
          "tap_local_ordinal": 11,
          "tap_indent": 0,
          "name": "database hash tampering throws, freezes writes and does not fake repair",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 63,
          "duration_ms": 19.0584,
          "execution_id": "RUN-431d1f07f7962a28-0011",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 63
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 12,
          "tap_local_ordinal": 12,
          "tap_indent": 0,
          "name": "32 MiB randomized artifact roundtrip streams with real backpressure and two hashes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 69,
          "duration_ms": 270.2028,
          "execution_id": "RUN-431d1f07f7962a28-0012",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 69
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 13,
          "tap_local_ordinal": 13,
          "tap_indent": 0,
          "name": "cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 75,
          "duration_ms": 32.9337,
          "execution_id": "RUN-431d1f07f7962a28-0013",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 75
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 14,
          "tap_local_ordinal": 14,
          "tap_indent": 0,
          "name": "early artifact iterator return is not verification; full corrupted stream fails closed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 81,
          "duration_ms": 36.0803,
          "execution_id": "RUN-431d1f07f7962a28-0014",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 81
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 15,
          "tap_local_ordinal": 15,
          "tap_indent": 0,
          "name": "concurrent artifact admission is bounded and rejects a third stream without queueing",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 87,
          "duration_ms": 20.2566,
          "execution_id": "RUN-431d1f07f7962a28-0015",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 87
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 16,
          "tap_local_ordinal": 16,
          "tap_indent": 0,
          "name": "sealed segments are compressed, chained and verified; stored bit flip is detected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 93,
          "duration_ms": 103.4877,
          "execution_id": "RUN-431d1f07f7962a28-0016",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 93
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 17,
          "tap_local_ordinal": 17,
          "tap_indent": 0,
          "name": "process-killed partial artifact remains retained without a complete object reference",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 99,
          "duration_ms": 170.4636,
          "execution_id": "RUN-431d1f07f7962a28-0017",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
            "line": 99
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        }
      ],
      "original_metadata_records": [
        {
          "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/verification.json",
          "sha256": "4a568ab6b447605e354694025165cdc65dc1de8fa061f8b6c61509b236af909d",
          "recorded_timing_fields": {
            "observed_at": "2026-11-06T17:16:25.275Z"
          },
          "source_environment_and_command_binding_fields": {
            "candidate": [
              {
                "path": "src/agentnexus/storage.ts",
                "bytes": 31836,
                "sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
              },
              {
                "path": "src/agentnexus/artifacts.ts",
                "bytes": 12687,
                "sha256": "4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427"
              },
              {
                "path": "src/agentnexus/records.ts",
                "bytes": 6510,
                "sha256": "393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800"
              },
              {
                "path": "tests/agentnexus/storage.test.ts",
                "bytes": 21732,
                "sha256": "e0f269cd0b73b5d70f5e5d91e8e57c9de905a182e81aaf31db6e7c736e95f923"
              },
              {
                "path": "tests/agentnexus/owned-storage-child.mjs",
                "bytes": 1885,
                "sha256": "7a469bfa662d98f39f06b4483eaa1f49809e490817679cce5f7f1fa366133139"
              }
            ],
            "node": "v24.15.0",
            "platform": "win32",
            "command": "node --test --test-reporter=tap --test-concurrency=1 tests/agentnexus/storage.test.ts"
          },
          "exact_started_utc": "NOT_AVAILABLE",
          "exact_ended_utc": "NOT_AVAILABLE"
        }
      ],
      "record_status": "RAW_EVIDENCE_RETAINED",
      "case_count_matches_log_total": true
    },
    {
      "run_id": "RUN-ccd399f8cdb11c4d",
      "log": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v2.tap",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "bytes": 0,
      "totals": {},
      "duration_ms": null,
      "cases": [],
      "original_metadata_records": [
        {
          "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/verification.v2.json",
          "status": "NOT_RUN_EMPTY_RESERVED_FILE"
        }
      ],
      "record_status": "NOT_RUN",
      "case_count_matches_log_total": null
    },
    {
      "run_id": "RUN-a0ceadd25824f0ba",
      "log": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
      "sha256": "a85e4a146caea6954a01f8e6102c442994413e2560c54d7d1db4ef16b2b01010",
      "bytes": 5121,
      "totals": {
        "tests": 21,
        "pass": 21,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0
      },
      "duration_ms": 2027.7284,
      "cases": [
        {
          "ordinal": 1,
          "tap_local_ordinal": 1,
          "tap_indent": 0,
          "name": "real SQLite, three independent domain chains and global pagination",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 3,
          "duration_ms": 95.6861,
          "execution_id": "RUN-a0ceadd25824f0ba-0001",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 3
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 2,
          "tap_local_ordinal": 2,
          "tap_indent": 0,
          "name": "synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 9,
          "duration_ms": 25.3377,
          "execution_id": "RUN-a0ceadd25824f0ba-0002",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 9
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 3,
          "tap_local_ordinal": 3,
          "tap_indent": 0,
          "name": "agent and session SQL filters apply before LIMIT and preserve global cursor pages",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 15,
          "duration_ms": 202.3066,
          "execution_id": "RUN-a0ceadd25824f0ba-0003",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 15
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 4,
          "tap_local_ordinal": 4,
          "tap_indent": 0,
          "name": "flush covers its captured target after an empty or older shared flush",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 21,
          "duration_ms": 26.8269,
          "execution_id": "RUN-a0ceadd25824f0ba-0004",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 21
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 5,
          "tap_local_ordinal": 5,
          "tap_indent": 0,
          "name": "required fields, malformed refs, oversized envelopes and query budgets reject without fault",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 27,
          "duration_ms": 24.0397,
          "execution_id": "RUN-a0ceadd25824f0ba-0005",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 27
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 6,
          "tap_local_ordinal": 6,
          "tap_indent": 0,
          "name": "outbox high water rejects new records, then drains without unbounded queues",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 33,
          "duration_ms": 31.3715,
          "execution_id": "RUN-a0ceadd25824f0ba-0006",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 33
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 7,
          "tap_local_ordinal": 7,
          "tap_indent": 0,
          "name": "second writer and live lock recovery are blocked; real owner death is explicit",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 39,
          "duration_ms": 185.9976,
          "execution_id": "RUN-a0ceadd25824f0ba-0007",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 39
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 8,
          "tap_local_ordinal": 8,
          "tap_indent": 0,
          "name": "process crash after file fsync and before receipt reexports no duplicate",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 45,
          "duration_ms": 166.6028,
          "execution_id": "RUN-a0ceadd25824f0ba-0008",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 45
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 9,
          "tap_local_ordinal": 9,
          "tap_indent": 0,
          "name": "unacknowledged crash tail is preserved then repaired from durable outbox",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 51,
          "duration_ms": 357.0622,
          "execution_id": "RUN-a0ceadd25824f0ba-0009",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 51
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 10,
          "tap_local_ordinal": 10,
          "tap_indent": 0,
          "name": "actual export I/O failure freezes writes and preserves outbox until explicit recovery",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 57,
          "duration_ms": 29.537,
          "execution_id": "RUN-a0ceadd25824f0ba-0010",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 57
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 11,
          "tap_local_ordinal": 11,
          "tap_indent": 0,
          "name": "acknowledged truncation is never silently discarded or rebuilt as success",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 63,
          "duration_ms": 19.5593,
          "execution_id": "RUN-a0ceadd25824f0ba-0011",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 63
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 12,
          "tap_local_ordinal": 12,
          "tap_indent": 0,
          "name": "actual artifact publication I/O failure retains bytes and freezes both record and object admission",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 69,
          "duration_ms": 28.8332,
          "execution_id": "RUN-a0ceadd25824f0ba-0012",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 69
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 13,
          "tap_local_ordinal": 13,
          "tap_indent": 0,
          "name": "database hash tampering throws, freezes writes and does not fake repair",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 75,
          "duration_ms": 20.3108,
          "execution_id": "RUN-a0ceadd25824f0ba-0013",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 75
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 14,
          "tap_local_ordinal": 14,
          "tap_indent": 0,
          "name": "32 MiB randomized artifact roundtrip streams with real backpressure and two hashes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 81,
          "duration_ms": 258.1689,
          "execution_id": "RUN-a0ceadd25824f0ba-0014",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 81
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 15,
          "tap_local_ordinal": 15,
          "tap_indent": 0,
          "name": "cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 87,
          "duration_ms": 28.8291,
          "execution_id": "RUN-a0ceadd25824f0ba-0015",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 87
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 16,
          "tap_local_ordinal": 16,
          "tap_indent": 0,
          "name": "early artifact iterator return is not verification; full corrupted stream fails closed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 93,
          "duration_ms": 37.2112,
          "execution_id": "RUN-a0ceadd25824f0ba-0016",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 93
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 17,
          "tap_local_ordinal": 17,
          "tap_indent": 0,
          "name": "concurrent artifact admission is bounded and rejects a third stream without queueing",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 99,
          "duration_ms": 19.8145,
          "execution_id": "RUN-a0ceadd25824f0ba-0017",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 99
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 18,
          "tap_local_ordinal": 18,
          "tap_indent": 0,
          "name": "abort races a permanently pending source.next without retaining Store writers or accepting late bytes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 105,
          "duration_ms": 18.8361,
          "execution_id": "RUN-a0ceadd25824f0ba-0018",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 105
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 19,
          "tap_local_ordinal": 19,
          "tap_indent": 0,
          "name": "concurrent close calls share the real drain and lock-release promise",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 111,
          "duration_ms": 18.353,
          "execution_id": "RUN-a0ceadd25824f0ba-0019",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 111
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 20,
          "tap_local_ordinal": 20,
          "tap_indent": 0,
          "name": "sealed segments are compressed, chained and verified; stored bit flip is detected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 117,
          "duration_ms": 96.8435,
          "execution_id": "RUN-a0ceadd25824f0ba-0020",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 117
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 21,
          "tap_local_ordinal": 21,
          "tap_indent": 0,
          "name": "process-killed partial artifact remains retained without a complete object reference",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 123,
          "duration_ms": 169.3929,
          "execution_id": "RUN-a0ceadd25824f0ba-0021",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap",
            "line": 123
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        }
      ],
      "original_metadata_records": [
        {
          "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/verification.v3.json",
          "sha256": "d2658f021124fa727c09e909baec4934b9fd191204f6f83c92b00acf59dfb433",
          "recorded_timing_fields": {
            "observed_at": "2026-11-06T17:55:03.633Z"
          },
          "source_environment_and_command_binding_fields": {
            "candidate": [
              {
                "path": "src/agentnexus/storage.ts",
                "bytes": 33030,
                "sha256": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d"
              },
              {
                "path": "src/agentnexus/artifacts.ts",
                "bytes": 15666,
                "sha256": "f89cd95c7c373e1551d509f82596e54e203f0bb02b2934e1c2108040ef48bc49"
              },
              {
                "path": "src/agentnexus/records.ts",
                "bytes": 6510,
                "sha256": "393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800"
              },
              {
                "path": "tests/agentnexus/storage.test.ts",
                "bytes": 28870,
                "sha256": "d0cae519ebfce054002a51b10b292cc870f2bbe01c67706dd1fd9a203525a3da"
              },
              {
                "path": "tests/agentnexus/owned-storage-child.mjs",
                "bytes": 1885,
                "sha256": "7a469bfa662d98f39f06b4483eaa1f49809e490817679cce5f7f1fa366133139"
              }
            ],
            "node": "v24.15.0",
            "platform": "win32",
            "command": "node --test --test-reporter=tap --test-concurrency=1 tests/agentnexus/storage.test.ts"
          },
          "exact_started_utc": "NOT_AVAILABLE",
          "exact_ended_utc": "NOT_AVAILABLE"
        }
      ],
      "record_status": "RAW_EVIDENCE_RETAINED",
      "case_count_matches_log_total": true
    },
    {
      "run_id": "RUN-a36a1bf602c1f459",
      "log": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
      "sha256": "1a82c98c3558c7165b5a7691900d7b9b10e5b42969959a0db45507d94ac0ac77",
      "bytes": 4177,
      "totals": {
        "tests": 17,
        "pass": 17,
        "fail": 0,
        "cancelled": 0,
        "skipped": 0,
        "todo": 0
      },
      "duration_ms": 2023.9801,
      "cases": [
        {
          "ordinal": 1,
          "tap_local_ordinal": 1,
          "tap_indent": 0,
          "name": "real SQLite, three independent domain chains and global pagination",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 3,
          "duration_ms": 104.0128,
          "execution_id": "RUN-a36a1bf602c1f459-0001",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 3
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 2,
          "tap_local_ordinal": 2,
          "tap_indent": 0,
          "name": "synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 9,
          "duration_ms": 28.4037,
          "execution_id": "RUN-a36a1bf602c1f459-0002",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 9
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 3,
          "tap_local_ordinal": 3,
          "tap_indent": 0,
          "name": "required fields, malformed refs, oversized envelopes and query budgets reject without fault",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 15,
          "duration_ms": 23.0751,
          "execution_id": "RUN-a36a1bf602c1f459-0003",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 15
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 4,
          "tap_local_ordinal": 4,
          "tap_indent": 0,
          "name": "outbox high water rejects new records, then drains without unbounded queues",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 21,
          "duration_ms": 36.5349,
          "execution_id": "RUN-a36a1bf602c1f459-0004",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 21
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 5,
          "tap_local_ordinal": 5,
          "tap_indent": 0,
          "name": "second writer and live lock recovery are blocked; real owner death is explicit",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 27,
          "duration_ms": 238.2662,
          "execution_id": "RUN-a36a1bf602c1f459-0005",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 27
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 6,
          "tap_local_ordinal": 6,
          "tap_indent": 0,
          "name": "process crash after file fsync and before receipt reexports no duplicate",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 33,
          "duration_ms": 216.7749,
          "execution_id": "RUN-a36a1bf602c1f459-0006",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 33
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 7,
          "tap_local_ordinal": 7,
          "tap_indent": 0,
          "name": "unacknowledged crash tail is preserved then repaired from durable outbox",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 39,
          "duration_ms": 452.0618,
          "execution_id": "RUN-a36a1bf602c1f459-0007",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 39
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 8,
          "tap_local_ordinal": 8,
          "tap_indent": 0,
          "name": "actual export I/O failure freezes writes and preserves outbox until explicit recovery",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 45,
          "duration_ms": 30.6218,
          "execution_id": "RUN-a36a1bf602c1f459-0008",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 45
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 9,
          "tap_local_ordinal": 9,
          "tap_indent": 0,
          "name": "acknowledged truncation is never silently discarded or rebuilt as success",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 51,
          "duration_ms": 19.7031,
          "execution_id": "RUN-a36a1bf602c1f459-0009",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 51
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 10,
          "tap_local_ordinal": 10,
          "tap_indent": 0,
          "name": "actual artifact publication I/O failure retains bytes and freezes both record and object admission",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 57,
          "duration_ms": 25.546,
          "execution_id": "RUN-a36a1bf602c1f459-0010",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 57
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 11,
          "tap_local_ordinal": 11,
          "tap_indent": 0,
          "name": "database hash tampering throws, freezes writes and does not fake repair",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 63,
          "duration_ms": 19.0584,
          "execution_id": "RUN-a36a1bf602c1f459-0011",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 63
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 12,
          "tap_local_ordinal": 12,
          "tap_indent": 0,
          "name": "32 MiB randomized artifact roundtrip streams with real backpressure and two hashes",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 69,
          "duration_ms": 270.2028,
          "execution_id": "RUN-a36a1bf602c1f459-0012",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 69
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 13,
          "tap_local_ordinal": 13,
          "tap_indent": 0,
          "name": "cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 75,
          "duration_ms": 32.9337,
          "execution_id": "RUN-a36a1bf602c1f459-0013",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 75
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 14,
          "tap_local_ordinal": 14,
          "tap_indent": 0,
          "name": "early artifact iterator return is not verification; full corrupted stream fails closed",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 81,
          "duration_ms": 36.0803,
          "execution_id": "RUN-a36a1bf602c1f459-0014",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 81
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 15,
          "tap_local_ordinal": 15,
          "tap_indent": 0,
          "name": "concurrent artifact admission is bounded and rejects a third stream without queueing",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 87,
          "duration_ms": 20.2566,
          "execution_id": "RUN-a36a1bf602c1f459-0015",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 87
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 16,
          "tap_local_ordinal": 16,
          "tap_indent": 0,
          "name": "sealed segments are compressed, chained and verified; stored bit flip is detected",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 93,
          "duration_ms": 103.4877,
          "execution_id": "RUN-a36a1bf602c1f459-0016",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 93
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        },
        {
          "ordinal": 17,
          "tap_local_ordinal": 17,
          "tap_indent": 0,
          "name": "process-killed partial artifact remains retained without a complete object reference",
          "parents": [],
          "status": "PASS",
          "reason": null,
          "log_line": 99,
          "duration_ms": 170.4636,
          "execution_id": "RUN-a36a1bf602c1f459-0017",
          "test_file": "tests/agentnexus/storage.test.ts",
          "actually_executed": true,
          "uses_simulated_or_synthetic_data": true,
          "uses_fake_model_backend": false,
          "original_log": {
            "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
            "line": 99
          },
          "source_version_note": "Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality."
        }
      ],
      "original_metadata_records": [],
      "record_status": "RAW_EVIDENCE_RETAINED",
      "case_count_matches_log_total": true
    }
  ],
  "historical_M0_workflow_cases": [
    {
      "test_id": "M0-WORKFLOW-0001",
      "name": "test_all_todo_placeholder_forms_fail",
      "test_file": "ai-workflow-kit-v4/tests/test_check_task.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 4
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0002",
      "name": "test_bad_utf8_exits_two",
      "test_file": "ai-workflow-kit-v4/tests/test_check_task.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 5
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0003",
      "name": "test_code_fence_body_counts_as_section_content",
      "test_file": "ai-workflow-kit-v4/tests/test_check_task.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 6
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0004",
      "name": "test_code_fence_fake_heading_ignored",
      "test_file": "ai-workflow-kit-v4/tests/test_check_task.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 7
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0005",
      "name": "test_explicit_kind_overrides_filename",
      "test_file": "ai-workflow-kit-v4/tests/test_check_task.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 8
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0006",
      "name": "test_filled_examples_pass",
      "test_file": "ai-workflow-kit-v4/tests/test_check_task.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 9
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0007",
      "name": "test_freeze_containing_ruling_heading",
      "test_file": "ai-workflow-kit-v4/tests/test_check_task.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 10
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0008",
      "name": "test_missing_and_empty_sections_fail",
      "test_file": "ai-workflow-kit-v4/tests/test_check_task.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 11
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0009",
      "name": "test_strict_warning_fails",
      "test_file": "ai-workflow-kit-v4/tests/test_check_task.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 12
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0010",
      "name": "test_template_todo_fails",
      "test_file": "ai-workflow-kit-v4/tests/test_check_task.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 13
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0011",
      "name": "test_check_rejects_new_root_file_and_unregistered_empty_directory",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 14
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0012",
      "name": "test_custom_hookspath_is_refused_without_modification",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 15
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0013",
      "name": "test_direct_generated_index_edit_cannot_be_washed_by_refresh",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 16
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0014",
      "name": "test_direct_rules_edit_cannot_be_refreshed_and_explicit_registration",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 17
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0015",
      "name": "test_disable_then_init_reenables_governance",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 18
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0016",
      "name": "test_docs_index_body_is_preserved_and_run_violation_fails",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 19
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0017",
      "name": "test_hook_preserves_preexisting_hook_and_disable_keeps_user_docs",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "NOT_RUN",
      "reason": "skipped 'User boundary: no hook installation or git commit/push, including fixtures'",
      "actually_executed": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 20
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0018",
      "name": "test_init_preserves_existing_rules_and_legacy_mess",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 21
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0019",
      "name": "test_knowledge_requires_four_nonempty_sections",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 22
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0020",
      "name": "test_new_rejects_traversal_and_wrong_class_and_indexes_knowledge",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 23
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0021",
      "name": "test_non_code_project_does_not_create_calls_document",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 24
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0022",
      "name": "test_other_language_call_map_is_labeled_manual_required",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 25
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0023",
      "name": "test_policy_direct_edit_requires_explicit_rules_registration",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 26
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0024",
      "name": "test_python_syntax_map_refresh_and_non_code_no_calls",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 27
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0025",
      "name": "test_real_commit_rejects_staged_rogue_file_then_chains_original_hook",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "NOT_RUN",
      "reason": "skipped 'User boundary: no hook installation or git commit/push, including fixtures'",
      "actually_executed": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 28
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0026",
      "name": "test_rules_limits_and_progress_headings_are_rejected",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 29
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0027",
      "name": "test_staged_rules_and_missing_staged_files_cannot_bypass_gate",
      "test_file": "ai-workflow-kit-v4/tests/test_govern.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 30
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0028",
      "name": "test_default_install_and_repeat_stay_lite",
      "test_file": "ai-workflow-kit-v4/tests/test_lean_modes.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 31
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0029",
      "name": "test_direct_full_to_lite_is_rejected_without_project_changes",
      "test_file": "ai-workflow-kit-v4/tests/test_lean_modes.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 32
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0030",
      "name": "test_existing_git_project_stays_without_new_hook_or_native_adapter",
      "test_file": "ai-workflow-kit-v4/tests/test_lean_modes.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 33
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0031",
      "name": "test_full_state_is_not_downgraded_and_legacy_defaults_to_full",
      "test_file": "ai-workflow-kit-v4/tests/test_lean_modes.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 34
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0032",
      "name": "test_full_upgrade_roles_and_explicit_hook",
      "test_file": "ai-workflow-kit-v4/tests/test_lean_modes.py",
      "execution_status": "NOT_RUN",
      "reason": "skipped 'User boundary: no hook installation or git commit/push, including fixtures'",
      "actually_executed": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 35
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0033",
      "name": "test_governance_check_still_protects_classification_and_rules",
      "test_file": "ai-workflow-kit-v4/tests/test_lean_modes.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 36
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0034",
      "name": "test_managed_agents_upgrade_keeps_bytes_and_writes_unloaded_suggestion",
      "test_file": "ai-workflow-kit-v4/tests/test_lean_modes.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 37
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0035",
      "name": "test_manual_governance_upgrade_is_retained_by_repeat_install",
      "test_file": "ai-workflow-kit-v4/tests/test_lean_modes.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 38
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0036",
      "name": "test_project_rules_seed_is_registered_before_refresh_and_preserved_on_uninstall",
      "test_file": "ai-workflow-kit-v4/tests/test_lean_modes.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 39
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0037",
      "name": "test_already_registered_strict_project_rule_is_not_reregistered",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 40
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0038",
      "name": "test_backup_junction_refuses_before_changing_agents",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "NOT_RUN",
      "reason": "skipped 'junction creation unavailable'",
      "actually_executed": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 41
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0039",
      "name": "test_codex_client_is_rejected_without_installing",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 42
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0040",
      "name": "test_corrupt_empty_inventory_refuses_uninstall_without_changes",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 43
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0041",
      "name": "test_default_install_is_generic",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 44
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0042",
      "name": "test_existing_config_reinstall_and_uninstall",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 45
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0043",
      "name": "test_existing_non_utf8_rules_are_preserved",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 46
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0044",
      "name": "test_initial_install_and_idempotent",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 47
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0045",
      "name": "test_metadata_symlink_refused",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "NOT_RUN",
      "reason": "skipped 'directory symlink creation is unavailable'",
      "actually_executed": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 48
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0046",
      "name": "test_migrate_rejects_install_only_options",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 49
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0047",
      "name": "test_missing_payload_preflight",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 50
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0048",
      "name": "test_modified_role_refuses_reinstall",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 51
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0049",
      "name": "test_path_traversal_refused",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 52
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0050",
      "name": "test_preserves_existing_agents_and_config",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 53
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0051",
      "name": "test_project_rules_directory_collision_is_preflighted_before_install_writes",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 54
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0052",
      "name": "test_project_rules_parent_file_conflict_is_preflighted",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 55
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0053",
      "name": "test_real_payloads_install_generic_only",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 56
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0054",
      "name": "test_removed_managed_block_refuses_reinstall",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 57
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0055",
      "name": "test_tamper_refuses_without_partial_uninstall",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 58
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0056",
      "name": "test_unchanged_install_preserves_file_timestamp",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 59
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0057",
      "name": "test_uninstall_restores_and_preserves_outside_agents_change",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 60
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0058",
      "name": "test_uninstall_restores_original_agents_exactly",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 61
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0059",
      "name": "test_unmanaged_role_collision_changes_no_project_files",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 62
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0060",
      "name": "test_v3_codex_migration_modified_role_is_atomic",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 63
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0061",
      "name": "test_v3_codex_migration_preserves_agents_and_user_codex_files",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 64
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0062",
      "name": "test_v3_generic_upgrade_keeps_existing_agents_bytes",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 65
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0063",
      "name": "test_verify_detects_modified_agents_block",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 66
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0064",
      "name": "test_verify_rejects_uninstalled_manifest",
      "test_file": "ai-workflow-kit-v4/tests/test_manage.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 67
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0065",
      "name": "test_added_formal_rule_requires_registration_and_cannot_be_refreshed_or_reinitialized",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 68
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0066",
      "name": "test_alias_lookup_cannot_register_a_name_absent_from_exact_inventory",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 69
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0067",
      "name": "test_authorization_claims_remain_pending_with_before_after_hashes",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 70
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0068",
      "name": "test_client_rule_registration_is_exact_and_classified",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 71
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0069",
      "name": "test_custom_rules_do_not_inherit_agents_size_or_responsibility_limits",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 72
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0070",
      "name": "test_disabled_reenable_cannot_wash_edited_rules",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 73
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0071",
      "name": "test_initial_inventory_protects_all_agents_and_project_rules_in_both_profiles",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 74
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0072",
      "name": "test_junction_rule_paths_and_project_roots_are_refused",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "NOT_RUN",
      "reason": "skipped 'OS denied junction creation: Access is denied.'",
      "actually_executed": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 75
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0073",
      "name": "test_legacy_multiple_project_rules_remain_usable_and_register_one_at_a_time",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 76
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0074",
      "name": "test_legacy_project_rules_do_not_grandfather_new_files",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 77
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0075",
      "name": "test_legacy_project_rules_preserve_disable_and_reenable_compatibility",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 78
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0076",
      "name": "test_linked_rule_paths_are_refused",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "NOT_RUN",
      "reason": "skipped 'symlink creation unavailable without OS privileges'",
      "actually_executed": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 79
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0077",
      "name": "test_new_codex_directory_is_not_implicitly_allowed",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 80
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0078",
      "name": "test_project_rules_directory_cannot_be_ignored",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 81
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0079",
      "name": "test_protected_rules_cannot_be_hidden_by_policy",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 82
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0080",
      "name": "test_registered_rule_edits_and_deletions_are_protected",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 83
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0081",
      "name": "test_registry_cannot_be_removed_or_added_through_policy",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 84
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0082",
      "name": "test_reparse_attributes_are_rejected_without_native_link_privileges",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 85
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0083",
      "name": "test_schema_one_without_optional_registry_is_preserved_safely",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 86
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0084",
      "name": "test_staged_custom_rule_versions_and_deletions_are_checked",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "NOT_RUN",
      "reason": "skipped 'User boundary: no hook installation or git commit/push, including fixtures'",
      "actually_executed": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 87
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0085",
      "name": "test_staged_renames_cannot_hide_protected_rule_or_policy_deletions",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "NOT_RUN",
      "reason": "skipped 'User boundary: no hook installation or git commit/push, including fixtures'",
      "actually_executed": false,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 88
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0086",
      "name": "test_staged_symlink_mode_cannot_hide_behind_identical_blob_hash",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 89
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0087",
      "name": "test_strict_external_rule_rejects_every_self_reported_source",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 90
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0088",
      "name": "test_strict_registration_records_pending_without_accepting_baseline",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 91
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0089",
      "name": "test_strict_requirement_cannot_be_downgraded_by_policy_or_registration",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 92
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0090",
      "name": "test_strict_review_policy_validates_optional_fields",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 93
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0091",
      "name": "test_unsafe_rule_paths_and_metadata_are_rejected",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 94
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0092",
      "name": "test_windows_case_alias_registration_preserves_policy_and_baseline",
      "test_file": "ai-workflow-kit-v4/tests/test_project_rules.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 95
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0093",
      "name": "test_changed_code_and_partial_main_hashes_require_new_review",
      "test_file": "ai-workflow-kit-v4/tests/test_review.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 96
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0094",
      "name": "test_findings_must_be_resolved_and_main_cannot_be_reviewer",
      "test_file": "ai-workflow-kit-v4/tests/test_review.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 97
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0095",
      "name": "test_git_scope_cannot_omit_changed_core_or_review_stale_index",
      "test_file": "ai-workflow-kit-v4/tests/test_review.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 98
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0096",
      "name": "test_missing_record_and_main_review_fail",
      "test_file": "ai-workflow-kit-v4/tests/test_review.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 99
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0097",
      "name": "test_normal_lite_needs_no_review",
      "test_file": "ai-workflow-kit-v4/tests/test_review.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 100
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0098",
      "name": "test_opt_in_record_is_formal_only_and_no_self_review",
      "test_file": "ai-workflow-kit-v4/tests/test_review.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 101
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0099",
      "name": "test_path_escape_and_record_outside_tasks_fail",
      "test_file": "ai-workflow-kit-v4/tests/test_review.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 102
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    },
    {
      "test_id": "M0-WORKFLOW-0100",
      "name": "test_task_scope_outside_path_can_opt_in",
      "test_file": "ai-workflow-kit-v4/tests/test_review.py",
      "execution_status": "PASS",
      "reason": null,
      "actually_executed": true,
      "original_log": {
        "path": ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-unittest.log",
        "line": 103
      },
      "scope": "Historical isolated Workflow Kit tests; not M1 product/model verification."
    }
  ],
  "review_probes": [
    {
      "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-initial.json",
      "source": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.ts",
      "version_binding": "Use each original source_sha256/source_snapshot; not necessarily current bytes."
    },
    {
      "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-before-close-race-fix.json",
      "source": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.ts",
      "version_binding": "Use each original source_sha256/source_snapshot; not necessarily current bytes."
    },
    {
      "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-before-timeout-fix.json",
      "source": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.ts",
      "version_binding": "Use each original source_sha256/source_snapshot; not necessarily current bytes."
    },
    {
      "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.json",
      "source": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.ts",
      "version_binding": "Use each original source_sha256/source_snapshot; not necessarily current bytes."
    },
    {
      "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/final-control-probes.json",
      "source": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/final-control-probes.ts",
      "version_binding": "Use each original source_sha256/source_snapshot; not necessarily current bytes."
    },
    {
      "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/stop-recovery-probe.json",
      "source": "NOT_AVAILABLE",
      "version_binding": "Use each original source_sha256/source_snapshot; not necessarily current bytes."
    },
    {
      "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.json",
      "source": "NOT_AVAILABLE",
      "version_binding": "Use each original source_sha256/source_snapshot; not necessarily current bytes."
    },
    {
      "path": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.v3.json",
      "source": "NOT_AVAILABLE",
      "version_binding": "Use each original source_sha256/source_snapshot; not necessarily current bytes."
    }
  ],
  "full_contract_NOT_RUN_reference": ".workflow-kit/tasks/AgentNexus-v0.4-M0.1/reports/M1_test_matrix.json",
  "models_and_OS_boundary": "NOT_RUN; synthetic fixtures, test doubles and real local parsers are not real provider or OS sandbox validation."
}
```
<!-- agentnexus-export-end -->

