# AgentNexus M1 Runtime Evidence Supplement — Part 1

补充原始运行/模块/早期失败/源码版本与测试索引记录，原始空v2预留仍为空；不将历史或空记录改成PASS。单个原始JSON若超过96KB，完整独占一份文档，不拆开文件或截断。

## .workflow-kit/runtime/AgentNexus-v0.4-M1/demo.stderr.txt

类别：`original_runtime_evidence_or_index`；原始字节数：0。

源文件 SHA256：

```text
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0050","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/demo.stderr.txt","bytes":0,"sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/demo.stderr.txt"}} -->
```text
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap

类别：`original_runtime_evidence_or_index`；原始字节数：4166。

源文件 SHA256：

```text
efd37cab25de4e616f64bba6e4a854b68fb7335c629559b31fb16986cffe4080
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0051","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap","bytes":4166,"sha256":"efd37cab25de4e616f64bba6e4a854b68fb7335c629559b31fb16986cffe4080","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap"}} -->
```text
TAP version 13
# Subtest: JSON uses real JSON.parse and preserves independent safety/authorization dimensions
ok 1 - JSON uses real JSON.parse and preserves independent safety/authorization dimensions
  ---
  duration_ms: 8.1581
  type: 'test'
  ...
# Subtest: Python AST actually parses valid/invalid source, with explicitly limited coverage
ok 2 - Python AST actually parses valid/invalid source, with explicitly limited coverage
  ---
  duration_ms: 430.2107
  type: 'test'
  ...
# Subtest: PowerShell Parser actually returns AST diagnostics and UTF-16 positions
ok 3 - PowerShell Parser actually returns AST diagnostics and UTF-16 positions
  ---
  duration_ms: 921.1043
  type: 'test'
  ...
# Subtest: Python and PowerShell source side effects remain unexecuted
ok 4 - Python and PowerShell source side effects remain unexecuted
  ---
  duration_ms: 427.6099
  type: 'test'
  ...
# Subtest: all relevant source Feature OFF paths bypass without a configured parser
ok 5 - all relevant source Feature OFF paths bypass without a configured parser
  ---
  duration_ms: 0.4352
  type: 'test'
  ...
# Subtest: optional environment/safety OFF remains BYPASSED while syntax independently runs
ok 6 - optional environment/safety OFF remains BYPASSED while syntax independently runs
  ---
  duration_ms: 0.5932
  type: 'test'
  ...
# Subtest: missing parsers and unsupported languages/dialects never produce PASS
ok 7 - missing parsers and unsupported languages/dialects never produce PASS
  ---
  duration_ms: 0.5788
  type: 'test'
  ...
# Subtest: new document version, same-version hash mismatch and close fence old results
ok 8 - new document version, same-version hash mismatch and close fence old results
  ---
  duration_ms: 0.9244
  type: 'test'
  ...
# Subtest: real parser requests respect newer versions and Feature epoch changes
ok 9 - real parser requests respect newer versions and Feature epoch changes
  ---
  duration_ms: 208.3987
  type: 'test'
  ...
# Subtest: AbortSignal, timeout and dispose are bounded and never become PASS
ok 10 - AbortSignal, timeout and dispose are bounded and never become PASS
  ---
  duration_ms: 1.4206
  type: 'test'
  ...
# Subtest: source/Unicode/request budgets reject before parsing and constructor budgets are fixed
ok 11 - source/Unicode/request budgets reject before parsing and constructor budgets are fixed
  ---
  duration_ms: 0.802
  type: 'test'
  ...
# Subtest: queue admission caps concurrent work and recovers after backpressure
ok 12 - queue admission caps concurrent work and recovers after backpressure
  ---
  duration_ms: 2.6175
  type: 'test'
  ...
# Subtest: PowerShell error floods remain bounded and do not turn truncation into PASS
ok 13 - PowerShell error floods remain bounded and do not turn truncation into PASS
  ---
  duration_ms: 518.7719
  type: 'test'
  ...
# Subtest: registered Git/Python argv schemas are static, limited and independently typed
ok 14 - registered Git/Python argv schemas are static, limited and independently typed
  ---
  duration_ms: 1.341
  type: 'test'
  ...
# Subtest: argv environment checks inspect only the Host file and preserve the actual args result
ok 15 - argv environment checks inspect only the Host file and preserve the actual args result
  ---
  duration_ms: 0.5739
  type: 'test'
  ...
# Subtest: argv family and values are copied before asynchronous work
ok 16 - argv family and values are copied before asynchronous work
  ---
  duration_ms: 0.1769
  type: 'test'
  ...
# Subtest: argument Feature OFF bypasses schema and dispose prevents subsequent work
ok 17 - argument Feature OFF bypasses schema and dispose prevents subsequent work
  ---
  duration_ms: 0.1707
  type: 'test'
  ...
# Subtest: disposeAndWait confirms real interpreter child close and all queued work is drained
ok 18 - disposeAndWait confirms real interpreter child close and all queued work is drained
  ---
  duration_ms: 136.4489
  type: 'test'
  ...
1..18
# tests 18
# suites 0
# pass 18
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2805.1615
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.v2.tap

类别：`original_runtime_evidence_or_index`；原始字节数：365。

源文件 SHA256：

```text
2cd56834dc32700442bab5ba891e9c7ef048848807baef0ebbbd45d2f9646011
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0052","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.v2.tap","bytes":365,"sha256":"2cd56834dc32700442bab5ba891e9c7ef048848807baef0ebbbd45d2f9646011","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.v2.tap"}} -->
```text
TAP version 13
# Subtest: Python AST actually parses valid/invalid source, with explicitly limited coverage
ok 1 - Python AST actually parses valid/invalid source, with explicitly limited coverage
  ---
  duration_ms: 404.941
  type: 'test'
  ...
1..1
# tests 1
# suites 0
# pass 1
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 548.0984
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/verification.json

类别：`original_runtime_evidence_or_index`；原始字节数：12044。

源文件 SHA256：

```text
e2334ddb133a9601fd2a99213e58b94b40fee3e4a3b3b22f4a6c4f6ddaf9a397
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0053","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/verification.json","bytes":12044,"sha256":"e2334ddb133a9601fd2a99213e58b94b40fee3e4a3b3b22f4a6c4f6ddaf9a397","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/verification.json"}} -->
```json
{
  "schema": "agentnexus/diagnostics-verification/0.1",
  "observed_at": "2026-11-06T17:13:28.161Z",
  "status": "PASS_WITH_EXPLICIT_NOT_RUN_BOUNDARIES",
  "evidence_kind": "Real local parser processes on synthetic source; no real model, target Git/Python program, project plugin, installation or scientific experiment.",
  "runtime": {
    "node": "24.15.0",
    "platform": "win32",
    "architecture": "x64",
    "python_path": "C:/Users/28642/AppData/Local/Programs/Python/Python312/python.exe",
    "powershell_path": "C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1104-709-0_26.1104.709.0_x64__3k8sg7r9htsxt/dependencies/native/powershell/pwsh.exe"
  },
  "api": {
    "class": "DevelopmentIntelligence",
    "methods": [
      "check(request, signal?) -> Promise<ValidationResult>",
      "checkArguments({family,argv,document_uri,version}, signal?) -> Promise<ValidationResult>",
      "closeDocument(uri)",
      "dispose()",
      "getActivity()",
      "drain(timeoutMs=1000)",
      "disposeAndWait(timeoutMs=1000)"
    ],
    "argument_families": [
      "git",
      "python"
    ],
    "status_scope": "Requested syntax/args coverage only; five dimensions remain independent; authorization always NOT_RUN."
  },
  "tests": {
    "command": "node --test --test-reporter=tap tests/agentnexus/diagnostics.test.ts",
    "tests": 18,
    "pass": 18,
    "fail": 0,
    "cancelled": 0,
    "skipped": 0,
    "todo": 0,
    "log": {
      "file": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
      "bytes": 4166,
      "sha256": "efd37cab25de4e616f64bba6e4a854b68fb7335c629559b31fb16986cffe4080"
    }
  },
  "checks": {
    "native_typescript_syntax": "PASS: node --check on library and test",
    "governance": "PASS: govern.py check --target I:/AI_AgentNexus"
  },
  "parser_observations": [
    {
      "input": {
        "language": "python",
        "source": "text = '中文 😀'\n",
        "document_uri": "evidence:python",
        "version": 1
      },
      "result": {
        "request_id": "1b3668bd-5b74-46aa-8ced-a4009f33460f",
        "uri": "evidence:python",
        "version": 1,
        "source_sha256": "1165921111e7ff84b87f372159779adc8ccafa44eba921003183b9d7702e3ef9",
        "checker_id": "python-ast",
        "checker_version": "3.12.10/adapter-a9595eca900b49c4",
        "feature_epoch": 0,
        "config_revision": 0,
        "dimensions": {
          "syntax": {
            "status": "PASS",
            "reason": "AST_PARSE_ONLY",
            "coverage": "python_parse_only",
            "applicable": true
          },
          "args": {
            "status": "NOT_RUN",
            "reason": "NOT_APPLICABLE",
            "coverage": "none",
            "applicable": false
          },
          "environment": {
            "status": "PASS",
            "reason": "TRUSTED_ADAPTER_RESPONDED",
            "coverage": "fixed interpreter/adapter launch and reported version only; hard RSS/process-tree isolation NOT_RUN",
            "applicable": true
          },
          "safety": {
            "status": "INCONCLUSIVE",
            "reason": "STATIC_ANALYSIS_NOT_SAFETY_PROOF",
            "coverage": "no OS isolation, resource authorization or target execution established",
            "applicable": true
          },
          "authorization": {
            "status": "NOT_RUN",
            "reason": "OWNER_TOOL_GATEWAY",
            "coverage": "diagnostic service cannot issue permits",
            "applicable": true
          }
        },
        "status": "PASS",
        "reason": "AST_PARSE_ONLY",
        "diagnostics": [],
        "evidence_refs": [],
        "timing": {
          "started_at": "2026-11-06T17:13:27.602Z",
          "elapsed_ms": 79.327
        }
      }
    },
    {
      "input": {
        "language": "powershell",
        "source": "$text = '中文 😀'\n",
        "document_uri": "evidence:powershell",
        "version": 1
      },
      "result": {
        "request_id": "72425cbc-67df-433a-ace5-02a557d00ac2",
        "uri": "evidence:powershell",
        "version": 1,
        "source_sha256": "81acf738438306db51b9585fabe4a56179e521d505423c9273bf2da3e886a8cb",
        "checker_id": "powershell-ast",
        "checker_version": "7.6.9/SMA-7.6.0.500/adapter-90079d41e2083df6",
        "feature_epoch": 0,
        "config_revision": 0,
        "dimensions": {
          "syntax": {
            "status": "PASS",
            "reason": "POWERSHELL_PARSE_ONLY",
            "coverage": "powershell_parse_only",
            "applicable": true
          },
          "args": {
            "status": "NOT_RUN",
            "reason": "NOT_APPLICABLE",
            "coverage": "none",
            "applicable": false
          },
          "environment": {
            "status": "PASS",
            "reason": "TRUSTED_ADAPTER_RESPONDED",
            "coverage": "fixed interpreter/adapter launch and reported version only; hard RSS/process-tree isolation NOT_RUN",
            "applicable": true
          },
          "safety": {
            "status": "INCONCLUSIVE",
            "reason": "STATIC_ANALYSIS_NOT_SAFETY_PROOF",
            "coverage": "no OS isolation, resource authorization or target execution established",
            "applicable": true
          },
          "authorization": {
            "status": "NOT_RUN",
            "reason": "OWNER_TOOL_GATEWAY",
            "coverage": "diagnostic service cannot issue permits",
            "applicable": true
          }
        },
        "status": "PASS",
        "reason": "POWERSHELL_PARSE_ONLY",
        "diagnostics": [],
        "evidence_refs": [],
        "timing": {
          "started_at": "2026-11-06T17:13:27.681Z",
          "elapsed_ms": 477.527
        }
      }
    },
    {
      "input": {
        "language": "json",
        "source": "{\"text\":\"中文 😀\"}",
        "document_uri": "evidence:json",
        "version": 1
      },
      "result": {
        "request_id": "75c7943f-e37c-41f8-bb9c-ec22641f85d9",
        "uri": "evidence:json",
        "version": 1,
        "source_sha256": "22198e63b72ca91446f9692b05875c93582a1faccd56a36eeb1a461de29c24be",
        "checker_id": "json-parse",
        "checker_version": "Node-24.15.0",
        "feature_epoch": 0,
        "config_revision": 0,
        "dimensions": {
          "syntax": {
            "status": "PASS",
            "reason": "JSON_PARSE_ONLY",
            "coverage": "json_parse_only",
            "applicable": true
          },
          "args": {
            "status": "NOT_RUN",
            "reason": "NOT_APPLICABLE",
            "coverage": "none",
            "applicable": false
          },
          "environment": {
            "status": "PASS",
            "reason": "BUILTIN_PARSER",
            "coverage": "JSON.parse in the reported Node runtime; OS hard isolation NOT_RUN",
            "applicable": true
          },
          "safety": {
            "status": "INCONCLUSIVE",
            "reason": "STATIC_ANALYSIS_NOT_SAFETY_PROOF",
            "coverage": "no OS isolation, resource authorization or target execution established",
            "applicable": true
          },
          "authorization": {
            "status": "NOT_RUN",
            "reason": "OWNER_TOOL_GATEWAY",
            "coverage": "diagnostic service cannot issue permits",
            "applicable": true
          }
        },
        "status": "PASS",
        "reason": "JSON_PARSE_ONLY",
        "diagnostics": [],
        "evidence_refs": [],
        "timing": {
          "started_at": "2026-11-06T17:13:28.158Z",
          "elapsed_ms": 0.191
        }
      }
    }
  ],
  "argv_observation": {
    "input": {
      "family": "git",
      "argv": [
        "status",
        "--short"
      ],
      "document_uri": "evidence:git-argv",
      "version": 1
    },
    "result": {
      "request_id": "5740e8b2-114c-497f-9f36-0aa7c8db9af6",
      "uri": "evidence:git-argv",
      "version": 1,
      "source_sha256": "b2fbe14bd5b1d9abf311c452499d628588f25465fd11df3d5d5682d0cae78849",
      "checker_id": "git-argv-schema",
      "checker_version": "0.1",
      "feature_epoch": 0,
      "config_revision": 0,
      "dimensions": {
        "syntax": {
          "status": "NOT_RUN",
          "reason": "STRUCTURED_ARGV_NO_SHELL_PARSE",
          "coverage": "no shell string is interpreted",
          "applicable": false
        },
        "args": {
          "status": "PASS",
          "reason": "ARGUMENT_SCHEMA_ONLY",
          "coverage": "git_argv_registered_subset",
          "applicable": true
        },
        "environment": {
          "status": "PASS",
          "reason": "HOST_EXECUTABLE_FILE_EXISTS",
          "coverage": "configured absolute file only; version, cwd, repository, dependencies and execution NOT_RUN",
          "applicable": true
        },
        "safety": {
          "status": "INCONCLUSIVE",
          "reason": "STATIC_ANALYSIS_NOT_SAFETY_PROOF",
          "coverage": "no OS isolation, resource authorization or target execution established",
          "applicable": true
        },
        "authorization": {
          "status": "NOT_RUN",
          "reason": "OWNER_TOOL_GATEWAY",
          "coverage": "diagnostic service cannot issue permits",
          "applicable": true
        }
      },
      "status": "PASS",
      "reason": "ARGUMENT_SCHEMA_ONLY",
      "diagnostics": [],
      "evidence_refs": [],
      "timing": {
        "started_at": "2026-11-06T17:13:28.159Z",
        "elapsed_ms": 0.507
      }
    }
  },
  "activity_after_dispose": {
    "jobs": 0,
    "running": 0,
    "queued": 0,
    "pendingBytes": 0,
    "children": 0,
    "unconfirmedChildren": 0,
    "documents": 0
  },
  "limits": {
    "source_bytes": 262144,
    "stdout_bytes": 131072,
    "stderr_bytes": 32768,
    "diagnostics": 200,
    "message_bytes": 1024,
    "active": 2,
    "queued": 16,
    "pending_bytes": 4194304,
    "document_slots": 128,
    "default_deadline_ms": 3000,
    "kill_confirmation_grace_ms": 500,
    "default_drain_ms": 1000
  },
  "not_run": {
    "os_complete_process_tree_isolation": "NOT_RUN; only known trusted checker child close is observed",
    "hard_rss_memory_limit": "NOT_RUN",
    "ubuntu": "NOT_RUN",
    "lsp": "NOT_RUN",
    "sql": "NOT_RUN; no SQLite prepare on supplied source",
    "csharp_javascript_typescript_yaml_dockerfile_bash_zsh": "NOT_RUN",
    "dependency_distribution_license_closure": "NOT_RUN",
    "full_python_compilation": "NOT_RUN; ast.parse only",
    "target_command_execution_and_authorization": "NOT_RUN; no permit issued"
  },
  "source_integrity": [
    {
      "file": "src/agentnexus/diagnostics.ts",
      "bytes": 31299,
      "sha256": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d",
      "scope": "diagnostics single-writer implementation/test"
    },
    {
      "file": "src/agentnexus/checkers/python_ast.py",
      "bytes": 2998,
      "sha256": "a9595eca900b49c4ec88e82599c28569b01e543ed8ecb52908ae0772b104fc6e",
      "scope": "diagnostics single-writer implementation/test"
    },
    {
      "file": "src/agentnexus/checkers/powershell_ast.ps1",
      "bytes": 3780,
      "sha256": "90079d41e2083df61ee87456cbe81a4d1863b2f4053df0ab9e78b668e3789ae8",
      "scope": "diagnostics single-writer implementation/test"
    },
    {
      "file": "tests/agentnexus/diagnostics.test.ts",
      "bytes": 18607,
      "sha256": "122140951cbcf352abf266a5fddd56bce34bc7c1abb6056a0495ec27f278293e",
      "scope": "diagnostics single-writer implementation/test"
    },
    {
      "file": "src/agentnexus/types.ts",
      "bytes": 6774,
      "sha256": "273780415d1e00476dcfc52ca901a15527d62f1e74c1a46def5757251afcfcd8",
      "scope": "read-only frozen shared contract"
    }
  ],
  "initial_probe_note": "An early Node import saw the parent-owned package.json during its empty creation window. It was rerun after the parent completed the package; no diagnostic implementation result was inferred from that setup failure."
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/verification.v2.json

类别：`original_runtime_evidence_or_index`；原始字节数：3513。

源文件 SHA256：

```text
4ecd91187ad9a8a0bffa3915d605ecbb64bd9e197d869c5b2f806610f22891b3
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0054","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/verification.v2.json","bytes":3513,"sha256":"4ecd91187ad9a8a0bffa3915d605ecbb64bd9e197d869c5b2f806610f22891b3","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/verification.v2.json"}} -->
```json
{
  "schema": "agentnexus/diagnostics-verification/0.2",
  "status": "PASS_TARGETED_PYTHON_STARTUP_ONLY",
  "observed_at": "2026-11-06T17:50:26.641Z",
  "runtime": {
    "node": "24.15.0",
    "platform": "win32"
  },
  "scope": "Narrow confirmation of existing Python child -I -B -S startup and the necessary real-spawn argv assertion. Not a rerun or renewed PASS of the whole product.",
  "change": {
    "product_source_modified": false,
    "reason": "diagnostics.ts already used -I -B -S before this task; no redundant product edit was made.",
    "test_source_modified": "tests/agentnexus/diagnostics.test.ts:42-71",
    "assertion": "Observe the actual child_process.spawn arguments while forwarding to the real Python interpreter; assert argv prefix equals [\"-I\",\"-B\",\"-S\"]. Restore builtin ESM exports after the test.",
    "dependencies_added": false
  },
  "test": {
    "command": "node --test --test-reporter=tap --test-name-pattern \"Python AST actually parses\" tests/agentnexus/diagnostics.test.ts",
    "tests": 1,
    "pass": 1,
    "fail": 0,
    "cancelled": 0,
    "skipped": 0,
    "todo": 0,
    "coverage": [
      "real Python ast.parse and required stdlib imports under -S",
      "actual launch argv prefix -I/-B/-S",
      "valid/invalid source and parse-only scoping limitation",
      "UTF-16 Unicode positions, CRLF and absent NUL error location"
    ],
    "log": {
      "file": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.v2.tap",
      "bytes": 365,
      "sha256": "2cd56834dc32700442bab5ba891e9c7ef048848807baef0ebbbd45d2f9646011"
    }
  },
  "native_typescript_syntax": "PASS: node --check tests/agentnexus/diagnostics.test.ts",
  "source_integrity": [
    {
      "file": "src/agentnexus/diagnostics.ts",
      "bytes": 31299,
      "sha256": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
    },
    {
      "file": "src/agentnexus/checkers/python_ast.py",
      "bytes": 2998,
      "sha256": "a9595eca900b49c4ec88e82599c28569b01e543ed8ecb52908ae0772b104fc6e"
    },
    {
      "file": "src/agentnexus/checkers/powershell_ast.ps1",
      "bytes": 3780,
      "sha256": "90079d41e2083df61ee87456cbe81a4d1863b2f4053df0ab9e78b668e3789ae8"
    },
    {
      "file": "tests/agentnexus/diagnostics.test.ts",
      "bytes": 19069,
      "sha256": "67eef7a1adfc1b2baceb62ca4cd157d8737332e8595f0d93a63bcfb853257394"
    },
    {
      "file": "src/agentnexus/types.ts",
      "bytes": 6814,
      "sha256": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75"
    }
  ],
  "preserved_v1": [
    {
      "file": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/verification.json",
      "bytes": 12044,
      "sha256": "e2334ddb133a9601fd2a99213e58b94b40fee3e4a3b3b22f4a6c4f6ddaf9a397",
      "unchanged": true
    },
    {
      "file": ".workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap",
      "bytes": 4166,
      "sha256": "efd37cab25de4e616f64bba6e4a854b68fb7335c629559b31fb16986cffe4080",
      "unchanged": true
    }
  ],
  "not_run": [
    "full product regression; owner runs separately",
    "OS process-tree isolation/RSS admission",
    "system-site .pth installation or mutation",
    "Provider keys/model/scientific workloads"
  ],
  "storage_v3_review": {
    "file": ".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.v3.json",
    "scope": "Only the three historical findings; separate source-bound report, no OS/mutable/whole-product PASS."
  }
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap

类别：`original_runtime_evidence_or_index`；原始字节数：27360。

源文件 SHA256：

```text
9492c2ff19b7504baf34b42e80a5a3b2460f0f0d579f14d7605aee7b9ccb6a6e
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0055","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap","bytes":27360,"sha256":"9492c2ff19b7504baf34b42e80a5a3b2460f0f0d579f14d7605aee7b9ccb6a6e","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap"}} -->
```text
TAP version 13
# Subtest: FT-RESOLVE: defaults, child narrowing, ancestor veto, explicit INHERIT
ok 1 - FT-RESOLVE: defaults, child narrowing, ancestor veto, explicit INHERIT
  ---
  duration_ms: 72.5918
  type: 'test'
  ...
# Subtest: FT: unknown IDs, illegal scopes and non-admin payloads rejected
ok 2 - FT: unknown IDs, illegal scopes and non-admin payloads rejected
  ---
  duration_ms: 31.1081
  type: 'test'
  ...
# Subtest: FT-DEPENDENCY: rejects partial disable and does not enable a dependency implicitly
ok 3 - FT-DEPENDENCY: rejects partial disable and does not enable a dependency implicitly
  ---
  duration_ms: 36.7497
  type: 'test'
  ...
# Subtest: FT: mutual conflict, wrong preview hash and stale revision cannot commit
ok 4 - FT: mutual conflict, wrong preview hash and stale revision cannot commit
  ---
  duration_ms: 40.9792
  type: 'test'
  ...
# Subtest: FT-OFF: live work aborts; failure remains FAILED until explicit recovery
ok 5 - FT-OFF: live work aborts; failure remains FAILED until explicit recovery
  ---
  duration_ms: 41.8314
  type: 'test'
  ...
# Subtest: FT-RETAIN: configuration survives real reopen, facts remain and old epoch is invalid
ok 6 - FT-RETAIN: configuration survives real reopen, facts remain and old epoch is invalid
  ---
  duration_ms: 59.949
  type: 'test'
  ...
# Subtest: FT-INHERIT-OFF: ON to INHERIT must quiesce when default is OFF
ok 7 - FT-INHERIT-OFF: ON to INHERIT must quiesce when default is OFF
  ---
  duration_ms: 47.4621
  type: 'test'
  ...
# Subtest: FT-LATE-STOP: timeout cannot recover or enable until the old stop actually settles
ok 8 - FT-LATE-STOP: timeout cannot recover or enable until the old stop actually settles
  ---
  duration_ms: 1064.3305
  type: 'test'
  ...
# Subtest: FT catalog is capacity, unimplemented module never becomes enabled from default ON
ok 9 - FT catalog is capacity, unimplemented module never becomes enabled from default ON
  ---
  duration_ms: 35.0598
  type: 'test'
  ...
# Subtest: P.ADMIN_MODE: forged admin, L0 degradation and missing reason rejected
ok 10 - P.ADMIN_MODE: forged admin, L0 degradation and missing reason rejected
  ---
  duration_ms: 29.268
  type: 'test'
  ...
# Subtest: P.ADMIN_MODE: two distinct confirmations, preview binding and challenge replay
ok 11 - P.ADMIN_MODE: two distinct confirmations, preview binding and challenge replay
  ---
  duration_ms: 36.2537
  type: 'test'
  ...
# Subtest: P.MODE: same denied request has distinct enforce/audit/disabled behavior
ok 12 - P.MODE: same denied request has distinct enforce/audit/disabled behavior
  ---
  duration_ms: 44.5028
  type: 'test'
  ...
# Subtest: P.MODE: selected IDs and project scope; explicit ENFORCE dominates overlap
ok 13 - P.MODE: selected IDs and project scope; explicit ENFORCE dominates overlap
  ---
  duration_ms: 44.9012
  type: 'test'
  ...
# Subtest: P.MODE: PDP fault stays closed in ENFORCE and AUDIT_ONLY; DISABLED actually skips PDP
ok 14 - P.MODE: PDP fault stays closed in ENFORCE and AUDIT_ONLY; DISABLED actually skips PDP
  ---
  duration_ms: 46.9868
  type: 'test'
  ...
# Subtest: P.MODE-EXPIRY: real deadline freezes until persisted-chain preflight
ok 15 - P.MODE-EXPIRY: real deadline freezes until persisted-chain preflight
  ---
  duration_ms: 1155.5649
  type: 'test'
  ...
# Subtest: P.MODE-RECOVERY: reboot never restores a permissive lease without preflight
ok 16 - P.MODE-RECOVERY: reboot never restores a permissive lease without preflight
  ---
  duration_ms: 63.6826
  type: 'test'
  ...
# Subtest: P.APPROVAL: hash/identity/epoch/expiry bind grants and no self-reported approval
ok 17 - P.APPROVAL: hash/identity/epoch/expiry bind grants and no self-reported approval
  ---
  duration_ms: 36.5924
  type: 'test'
  ...
# Subtest: P.APPROVAL-EXPIRY: real expiry cannot revive under an in-process clock rollback
ok 18 - P.APPROVAL-EXPIRY: real expiry cannot revive under an in-process clock rollback
  ---
  duration_ms: 118.4836
  type: 'test'
  ...
# Subtest: Json canonical contract rejects accessors/cycles/nonfinite numbers
ok 19 - Json canonical contract rejects accessors/cycles/nonfinite numbers
  ---
  duration_ms: 0.4657
  type: 'test'
  ...
# Subtest: JSON uses real JSON.parse and preserves independent safety/authorization dimensions
ok 20 - JSON uses real JSON.parse and preserves independent safety/authorization dimensions
  ---
  duration_ms: 5.6805
  type: 'test'
  ...
# Subtest: Python AST actually parses valid/invalid source, with explicitly limited coverage
ok 21 - Python AST actually parses valid/invalid source, with explicitly limited coverage
  ---
  duration_ms: 392.6824
  type: 'test'
  ...
# Subtest: PowerShell Parser actually returns AST diagnostics and UTF-16 positions
ok 22 - PowerShell Parser actually returns AST diagnostics and UTF-16 positions
  ---
  duration_ms: 790.3726
  type: 'test'
  ...
# Subtest: Python and PowerShell source side effects remain unexecuted
ok 23 - Python and PowerShell source side effects remain unexecuted
  ---
  duration_ms: 405.1387
  type: 'test'
  ...
# Subtest: all relevant source Feature OFF paths bypass without a configured parser
ok 24 - all relevant source Feature OFF paths bypass without a configured parser
  ---
  duration_ms: 0.4026
  type: 'test'
  ...
# Subtest: optional environment/safety OFF remains BYPASSED while syntax independently runs
ok 25 - optional environment/safety OFF remains BYPASSED while syntax independently runs
  ---
  duration_ms: 0.6061
  type: 'test'
  ...
# Subtest: missing parsers and unsupported languages/dialects never produce PASS
ok 26 - missing parsers and unsupported languages/dialects never produce PASS
  ---
  duration_ms: 0.4941
  type: 'test'
  ...
# Subtest: new document version, same-version hash mismatch and close fence old results
ok 27 - new document version, same-version hash mismatch and close fence old results
  ---
  duration_ms: 0.7315
  type: 'test'
  ...
# Subtest: real parser requests respect newer versions and Feature epoch changes
ok 28 - real parser requests respect newer versions and Feature epoch changes
  ---
  duration_ms: 159.2905
  type: 'test'
  ...
# Subtest: AbortSignal, timeout and dispose are bounded and never become PASS
ok 29 - AbortSignal, timeout and dispose are bounded and never become PASS
  ---
  duration_ms: 1.3341
  type: 'test'
  ...
# Subtest: source/Unicode/request budgets reject before parsing and constructor budgets are fixed
ok 30 - source/Unicode/request budgets reject before parsing and constructor budgets are fixed
  ---
  duration_ms: 0.4799
  type: 'test'
  ...
# Subtest: queue admission caps concurrent work and recovers after backpressure
ok 31 - queue admission caps concurrent work and recovers after backpressure
  ---
  duration_ms: 1.7847
  type: 'test'
  ...
# Subtest: PowerShell error floods remain bounded and do not turn truncation into PASS
ok 32 - PowerShell error floods remain bounded and do not turn truncation into PASS
  ---
  duration_ms: 462.5865
  type: 'test'
  ...
# Subtest: registered Git/Python argv schemas are static, limited and independently typed
ok 33 - registered Git/Python argv schemas are static, limited and independently typed
  ---
  duration_ms: 1.3216
  type: 'test'
  ...
# Subtest: argv environment checks inspect only the Host file and preserve the actual args result
ok 34 - argv environment checks inspect only the Host file and preserve the actual args result
  ---
  duration_ms: 0.5674
  type: 'test'
  ...
# Subtest: argv family and values are copied before asynchronous work
ok 35 - argv family and values are copied before asynchronous work
  ---
  duration_ms: 0.1673
  type: 'test'
  ...
# Subtest: argument Feature OFF bypasses schema and dispose prevents subsequent work
ok 36 - argument Feature OFF bypasses schema and dispose prevents subsequent work
  ---
  duration_ms: 0.164
  type: 'test'
  ...
# Subtest: disposeAndWait confirms real interpreter child close and all queued work is drained
ok 37 - disposeAndWait confirms real interpreter child close and all queued work is drained
  ---
  duration_ms: 36.2674
  type: 'test'
  ...
# Subtest: AT/Context/Artifact: real invocation produces separate hash-linked facts and byte-exact output
ok 38 - AT/Context/Artifact: real invocation produces separate hash-linked facts and byte-exact output
  ---
  duration_ms: 137.5763
  type: 'test'
  ...
# Subtest: P.MODE+Gateway: same safe synthetic operation blocked/enforced, would-deny, and unevaluated
ok 39 - P.MODE+Gateway: same safe synthetic operation blocked/enforced, would-deny, and unevaluated
  ---
  duration_ms: 154.9972
  type: 'test'
  ...
# Subtest: P.SANDBOX: DISABLED does not admit arbitrary execution or close independent protection
ok 40 - P.SANDBOX: DISABLED does not admit arbitrary execution or close independent protection
  ---
  duration_ms: 59.3895
  type: 'test'
  ...
# Subtest: P.IDENTITY: facade has no administration and JSON admin/mode flags cannot elevate
ok 41 - P.IDENTITY: facade has no administration and JSON admin/mode flags cannot elevate
  ---
  duration_ms: 42.8905
  type: 'test'
  ...
# Subtest: P.APPROVAL_REPLAY: exact approval executes once; altered intent and replay denied
ok 42 - P.APPROVAL_REPLAY: exact approval executes once; altered intent and replay denied
  ---
  duration_ms: 113.3091
  type: 'test'
  ...
# Subtest: P.DB_ATOMIC: 16 concurrent duplicate requests invoke a real handler at most once
ok 43 - P.DB_ATOMIC: 16 concurrent duplicate requests invoke a real handler at most once
  ---
  duration_ms: 82.1284
  type: 'test'
  ...
# Subtest: P.WORKSPACE_WRITER: concurrent distinct calls cannot overwrite active resource; modes cannot change mid-action
ok 44 - P.WORKSPACE_WRITER: concurrent distinct calls cannot overwrite active resource; modes cannot change mid-action
  ---
  duration_ms: 101.4134
  type: 'test'
  ...
# Subtest: AT-IOFAIL-before: actual SQLite readonly persistence failure prevents handler execution
ok 45 - AT-IOFAIL-before: actual SQLite readonly persistence failure prevents handler execution
  ---
  duration_ms: 87.3243
  type: 'test'
  ...
# Subtest: AT-IOFAIL-after: actual effect with unrecordable result keeps claim and never replays
ok 46 - AT-IOFAIL-after: actual effect with unrecordable result keeps claim and never replays
  ---
  duration_ms: 84.7707
  type: 'test'
  ...
# Subtest: P.TIMEOUT: timeout retains owned lease until actual handler settlement and never resets claim
ok 47 - P.TIMEOUT: timeout retains owned lease until actual handler settlement and never resets claim
  ---
  duration_ms: 108.8367
  type: 'test'
  ...
# Subtest: AT-REPLAY: reconstruction is readonly and session scope does not grant peer context
ok 48 - AT-REPLAY: reconstruction is readonly and session scope does not grant peer context
  ---
  duration_ms: 87.1125
  type: 'test'
  ...
# Subtest: P.IDENTITY-revocation: old facade cannot read or close a replacement session
ok 49 - P.IDENTITY-revocation: old facade cannot read or close a replacement session
  ---
  duration_ms: 119.2337
  type: 'test'
  ...
# Subtest: P.IDENTITY-close-race: close revokes facade before its first asynchronous cleanup
ok 50 - P.IDENTITY-close-race: close revokes facade before its first asynchronous cleanup
  ---
  duration_ms: 83.571
  type: 'test'
  ...
# Subtest: P.TIMEOUT-clock: handler deadline uses elapsed time under a wall-clock rollback
ok 51 - P.TIMEOUT-clock: handler deadline uses elapsed time under a wall-clock rollback
  ---
  duration_ms: 109.7643
  type: 'test'
  ...
# Subtest: P.MODE-START: a bypass expiring during a real delayed durability barrier cannot execute
ok 52 - P.MODE-START: a bypass expiring during a real delayed durability barrier cannot execute
  ---
  duration_ms: 471.082
  type: 'test'
  ...
# Subtest: DI integration: malformed code remains FAIL, checks OFF are BYPASSED, raw/audit continue
ok 53 - DI integration: malformed code remains FAIL, checks OFF are BYPASSED, raw/audit continue
  ---
  duration_ms: 143.9547
  type: 'test'
  ...
# Subtest: Tool OFF rejects invocation, diagnostics log OFF does not silence core audit, oversized request is bounded
ok 54 - Tool OFF rejects invocation, diagnostics log OFF does not silence core audit, oversized request is bounded
  ---
  duration_ms: 62.6217
  type: 'test'
  ...
# Subtest: P.ARG_BINDING: mutation by schema or caller cannot replace the authorized snapshot
ok 55 - P.ARG_BINDING: mutation by schema or caller cannot replace the authorized snapshot
  ---
  duration_ms: 81.1537
  type: 'test'
  ...
# Subtest: DI command checking keeps argv preview as data and cannot execute Git/Python
ok 56 - DI command checking keeps argv preview as data and cannot execute Git/Python
  ---
  duration_ms: 84.8067
  type: 'test'
  ...
# Subtest: controlled static bytes close over binary, empty and nested same-name files
ok 57 - controlled static bytes close over binary, empty and nested same-name files
  ---
  duration_ms: 30.8112
  type: 'test'
  ...
# Subtest: empty package permits exactly its manifest, with zero payload budgets
ok 58 - empty package permits exactly its manifest, with zero payload budgets
  ---
  duration_ms: 6.187
  type: 'test'
  ...
# Subtest: matching mutable tree is INCONCLUSIVE, never a trusted release root
ok 59 - matching mutable tree is INCONCLUSIVE, never a trusted release root
  ---
  duration_ms: 7.0448
  type: 'test'
  ...
# Subtest: same-size modified content fails its SHA-256
ok 60 - same-size modified content fails its SHA-256
  ---
  duration_ms: 7.7854
  type: 'test'
  ...
# Subtest: appended content fails declared byte size
ok 61 - appended content fails declared byte size
  ---
  duration_ms: 5.4976
  type: 'test'
  ...
# Subtest: missing and unlisted files are both reported by full relative path
ok 62 - missing and unlisted files are both reported by full relative path
  ---
  duration_ms: 5.5948
  type: 'test'
  ...
# Subtest: unlisted nested manifest and SHA256SUMS names are never self exceptions
    # Subtest: sub/manifest.json
    ok 1 - sub/manifest.json
      ---
      duration_ms: 6.8039
      type: 'test'
      ...
    # Subtest: validation/SHA256SUMS.txt
    ok 2 - validation/SHA256SUMS.txt
      ---
      duration_ms: 6.4431
      type: 'test'
      ...
    # Subtest: unexpected.cjs
    ok 3 - unexpected.cjs
      ---
      duration_ms: 5.8327
      type: 'test'
      ...
    # Subtest: .hidden
    ok 4 - .hidden
      ---
      duration_ms: 17.141
      type: 'test'
      ...
    1..4
ok 63 - unlisted nested manifest and SHA256SUMS names are never self exceptions
  ---
  duration_ms: 36.9056
  type: 'test'
  ...
# Subtest: root manifest is required and cannot list itself
ok 64 - root manifest is required and cannot list itself
  ---
  duration_ms: 3.8781
  type: 'test'
  ...
# Subtest: root manifest directory and non-directory roots fail
ok 65 - root manifest directory and non-directory roots fail
  ---
  duration_ms: 4.1724
  type: 'test'
  ...
# Subtest: duplicate JSON keys are rejected despite JSON.parse last-wins semantics
ok 66 - duplicate JSON keys are rejected despite JSON.parse last-wins semantics
  ---
  duration_ms: 6.2695
  type: 'test'
  ...
# Subtest: duplicate complete path and unsorted arrays fail independently
ok 67 - duplicate complete path and unsorted arrays fail independently
  ---
  duration_ms: 4.6285
  type: 'test'
  ...
# Subtest: case conflicts include ancestor directories and file-directory prefixes
    # Subtest: A vs a
    ok 1 - A vs a
      ---
      duration_ms: 3.2893
      type: 'test'
      ...
    # Subtest: Dir/a vs dir/b
    ok 2 - Dir/a vs dir/b
      ---
      duration_ms: 4.9038
      type: 'test'
      ...
    # Subtest: a vs a/b
    ok 3 - a vs a/b
      ---
      duration_ms: 3.5516
      type: 'test'
      ...
    1..3
ok 68 - case conflicts include ancestor directories and file-directory prefixes
  ---
  duration_ms: 12.0882
  type: 'test'
  ...
# Subtest: path traversal, device aliases, malformed separators and Unicode reject before payload reads
    # Subtest: "../outside"
    ok 1 - "../outside"
      ---
      duration_ms: 3.9843
      type: 'test'
      ...
    # Subtest: "./a"
    ok 2 - "./a"
      ---
      duration_ms: 3.8675
      type: 'test'
      ...
    # Subtest: "a//b"
    ok 3 - "a//b"
      ---
      duration_ms: 4.0878
      type: 'test'
      ...
    # Subtest: "/outside"
    ok 4 - "/outside"
      ---
      duration_ms: 4.6009
      type: 'test'
      ...
    # Subtest: "C:/outside"
    ok 5 - "C:/outside"
      ---
      duration_ms: 5.2372
      type: 'test'
      ...
    # Subtest: "//server/share"
    ok 6 - "//server/share"
      ---
      duration_ms: 4.6877
      type: 'test'
      ...
    # Subtest: "a\\\\b"
    ok 7 - "a\\\\b"
      ---
      duration_ms: 4.234
      type: 'test'
      ...
    # Subtest: "a:stream"
    ok 8 - "a:stream"
      ---
      duration_ms: 4.9101
      type: 'test'
      ...
    # Subtest: "NUL.txt"
    ok 9 - "NUL.txt"
      ---
      duration_ms: 4.3094
      type: 'test'
      ...
    # Subtest: "COM1"
    ok 10 - "COM1"
      ---
      duration_ms: 4.2162
      type: 'test'
      ...
    # Subtest: "con.tar.gz"
    ok 11 - "con.tar.gz"
      ---
      duration_ms: 4.5565
      type: 'test'
      ...
    # Subtest: "a."
    ok 12 - "a."
      ---
      duration_ms: 4.8407
      type: 'test'
      ...
    # Subtest: "a "
    ok 13 - "a "
      ---
      duration_ms: 4.1045
      type: 'test'
      ...
    # Subtest: "PROGRA~1/file"
    ok 14 - "PROGRA~1/file"
      ---
      duration_ms: 4.4071
      type: 'test'
      ...
    # Subtest: ""
    ok 15 - ""
      ---
      duration_ms: 4.7247
      type: 'test'
      ...
    # Subtest: "a\\u0000b"
    ok 16 - "a\\u0000b"
      ---
      duration_ms: 4.1778
      type: 'test'
      ...
    # Subtest: "é"
    ok 17 - "é"
      ---
      duration_ms: 3.9498
      type: 'test'
      ...
    # Subtest: "é"
    ok 18 - "é"
      ---
      duration_ms: 4.6449
      type: 'test'
      ...
    # Subtest: "İ"
    ok 19 - "İ"
      ---
      duration_ms: 3.9634
      type: 'test'
      ...
    # Subtest: "a/a/"
    ok 20 - "a/a/"
      ---
      duration_ms: 3.6275
      type: 'test'
      ...
    1..20
ok 69 - path traversal, device aliases, malformed separators and Unicode reject before payload reads
  ---
  duration_ms: 89.0276
  type: 'test'
  ...
# Subtest: schema, digest and byte count reject invalid declarations
ok 70 - schema, digest and byte count reject invalid declarations
  ---
  duration_ms: 13.4236
  type: 'test'
  ...
# Subtest: canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes
ok 71 - canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes
  ---
  duration_ms: 7.9996
  type: 'test'
  ...
# Subtest: extra empty directory and file-vs-directory mismatch cannot disappear
ok 72 - extra empty directory and file-vs-directory mismatch cannot disappear
  ---
  duration_ms: 8.0949
  type: 'test'
  ...
# Subtest: file count and total bytes budgets work at exact limit and limit plus one
ok 73 - file count and total bytes budgets work at exact limit and limit plus one
  ---
  duration_ms: 8.1122
  type: 'test'
  ...
# Subtest: actual unlisted content also consumes size and count budgets
ok 74 - actual unlisted content also consumes size and count budgets
  ---
  duration_ms: 5.277
  type: 'test'
  ...
# Subtest: manifest and single-file caps are enforced without reading an oversized payload
ok 75 - manifest and single-file caps are enforced without reading an oversized payload
  ---
  duration_ms: 4.8602
  type: 'test'
  ...
# Subtest: path length and depth have bounded rejection
ok 76 - path length and depth have bounded rejection
  ---
  duration_ms: 3.9691
  type: 'test'
  ...
# Subtest: actual default file and directory count limits accept the edge and reject one more
ok 77 - actual default file and directory count limits accept the edge and reject one more
  ---
  duration_ms: 928.8077
  type: 'test'
  ...
# Subtest: actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject
ok 78 - actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject
  ---
  duration_ms: 41.5899
  type: 'test'
  ...
# Subtest: maximum component and depth are accepted on an actually created portable path
ok 79 - maximum component and depth are accepted on an actually created portable path
  ---
  duration_ms: 26.6226
  type: 'test'
  ...
# Subtest: Host cannot expand limits or choose an unknown mode; relative roots reject
ok 80 - Host cannot expand limits or choose an unknown mode; relative roots reject
  ---
  duration_ms: 2.8442
  type: 'test'
  ...
# Subtest: pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work
ok 81 - pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work
  ---
  duration_ms: 5.7512
  type: 'test'
  ...
# Subtest: diagnostic count and encoded bytes remain bounded for many extra files
ok 82 - diagnostic count and encoded bytes remain bounded for many extra files
  ---
  duration_ms: 48.2203
  type: 'test'
  ...
# Subtest: candidate scripts, package metadata and git-looking files are data and never executed
ok 83 - candidate scripts, package metadata and git-looking files are data and never executed
  ---
  duration_ms: 12.0539
  type: 'test'
  ...
# Subtest: real OS file symlink is rejected without following its target
ok 84 - real OS file symlink is rejected without following its target # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 3.733
  type: 'test'
  ...
# Subtest: real OS dir link is rejected
ok 85 - real OS dir link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 3.5639
  type: 'test'
  ...
# Subtest: real OS junction link is rejected
ok 86 - real OS junction link is rejected # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 4.3934
  type: 'test'
  ...
# Subtest: real OS hardlink to an outside object is rejected by link count
ok 87 - real OS hardlink to an outside object is rejected by link count # SKIP NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
  ---
  duration_ms: 3.3987
  type: 'test'
  ...
# Subtest: real SQLite, three independent domain chains and global pagination
ok 88 - real SQLite, three independent domain chains and global pagination
  ---
  duration_ms: 97.9646
  type: 'test'
  ...
# Subtest: synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault
ok 89 - synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault
  ---
  duration_ms: 25.3859
  type: 'test'
  ...
# Subtest: agent and session SQL filters apply before LIMIT and preserve global cursor pages
ok 90 - agent and session SQL filters apply before LIMIT and preserve global cursor pages
  ---
  duration_ms: 198.6897
  type: 'test'
  ...
# Subtest: flush covers its captured target after an empty or older shared flush
ok 91 - flush covers its captured target after an empty or older shared flush
  ---
  duration_ms: 27.4047
  type: 'test'
  ...
# Subtest: required fields, malformed refs, oversized envelopes and query budgets reject without fault
ok 92 - required fields, malformed refs, oversized envelopes and query budgets reject without fault
  ---
  duration_ms: 20.9112
  type: 'test'
  ...
# Subtest: outbox high water rejects new records, then drains without unbounded queues
ok 93 - outbox high water rejects new records, then drains without unbounded queues
  ---
  duration_ms: 31.3933
  type: 'test'
  ...
# Subtest: second writer and live lock recovery are blocked; real owner death is explicit
ok 94 - second writer and live lock recovery are blocked; real owner death is explicit
  ---
  duration_ms: 178.6449
  type: 'test'
  ...
# Subtest: process crash after file fsync and before receipt reexports no duplicate
ok 95 - process crash after file fsync and before receipt reexports no duplicate
  ---
  duration_ms: 185.3666
  type: 'test'
  ...
# Subtest: unacknowledged crash tail is preserved then repaired from durable outbox
ok 96 - unacknowledged crash tail is preserved then repaired from durable outbox
  ---
  duration_ms: 433.1586
  type: 'test'
  ...
# Subtest: actual export I/O failure freezes writes and preserves outbox until explicit recovery
ok 97 - actual export I/O failure freezes writes and preserves outbox until explicit recovery
  ---
  duration_ms: 32.3434
  type: 'test'
  ...
# Subtest: acknowledged truncation is never silently discarded or rebuilt as success
ok 98 - acknowledged truncation is never silently discarded or rebuilt as success
  ---
  duration_ms: 22.2769
  type: 'test'
  ...
# Subtest: actual artifact publication I/O failure retains bytes and freezes both record and object admission
ok 99 - actual artifact publication I/O failure retains bytes and freezes both record and object admission
  ---
  duration_ms: 27.1863
  type: 'test'
  ...
# Subtest: database hash tampering throws, freezes writes and does not fake repair
ok 100 - database hash tampering throws, freezes writes and does not fake repair
  ---
  duration_ms: 19.2056
  type: 'test'
  ...
# Subtest: 32 MiB randomized artifact roundtrip streams with real backpressure and two hashes
ok 101 - 32 MiB randomized artifact roundtrip streams with real backpressure and two hashes
  ---
  duration_ms: 265.9668
  type: 'test'
  ...
# Subtest: cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected
ok 102 - cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected
  ---
  duration_ms: 28.0356
  type: 'test'
  ...
# Subtest: early artifact iterator return is not verification; full corrupted stream fails closed
ok 103 - early artifact iterator return is not verification; full corrupted stream fails closed
  ---
  duration_ms: 38.1978
  type: 'test'
  ...
# Subtest: concurrent artifact admission is bounded and rejects a third stream without queueing
ok 104 - concurrent artifact admission is bounded and rejects a third stream without queueing
  ---
  duration_ms: 21.9493
  type: 'test'
  ...
# Subtest: abort races a permanently pending source.next without retaining Store writers or accepting late bytes
ok 105 - abort races a permanently pending source.next without retaining Store writers or accepting late bytes
  ---
  duration_ms: 21.5857
  type: 'test'
  ...
# Subtest: concurrent close calls share the real drain and lock-release promise
ok 106 - concurrent close calls share the real drain and lock-release promise
  ---
  duration_ms: 20.4103
  type: 'test'
  ...
# Subtest: sealed segments are compressed, chained and verified; stored bit flip is detected
ok 107 - sealed segments are compressed, chained and verified; stored bit flip is detected
  ---
  duration_ms: 102.6549
  type: 'test'
  ...
# Subtest: process-killed partial artifact remains retained without a complete object reference
ok 108 - process-killed partial artifact remains retained without a complete object reference
  ---
  duration_ms: 181.4257
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
# duration_ms 11748.902
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/demo.json

类别：`original_runtime_evidence_or_index`；原始字节数：4800。

源文件 SHA256：

```text
67e288651b24d90506266ed0b953dc8c2eeb90fa147b03a6ed0d39fa8484cf6a
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0056","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/demo.json","bytes":4800,"sha256":"67e288651b24d90506266ed0b953dc8c2eeb90fa147b03a6ed0d39fa8484cf6a","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/demo.json"}} -->
```json
{
  "scope": "Real local broker/SQLite/artifact/JSON checks with synthetic inputs; no model or shell execution",
  "root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\demos\\local-61xp9E",
  "deployment": {
    "status": "BLOCKED",
    "reason": "OS_ADMIN_AUTH_AND_SANDBOX_NOT_VERIFIED",
    "api": "LOCAL_TRUSTED_LIBRARY_ONLY",
    "no_network_listener": true
  },
  "echo": {
    "status": "PASS",
    "reason": "BROKER_OPERATION_COMPLETE",
    "operation_id": "3a2501c7-b2df-4dea-9de1-2e8344cd8ccc",
    "intent_hash": "1638baae27db7886a55584ccebd2908a005a3c8b6f34e3bd221c75fcbeaa45b4",
    "data": {
      "message": "AgentNexus native M1",
      "real_model": false
    },
    "stdout_ref": {
      "artifact_id": "2cd78d8d-eb4b-49f7-a547-fb8004d9c298",
      "sha256": "57c204557b25b00f6c119da95e10e9ca948ac3be3faeacd4cf612e9fc2c8dc03",
      "bytes": 53,
      "codec": "zstd",
      "stored_sha256": "2afe67267df13ff6b0da68a571c047b6b5e9f4b8babc70664f0536ae1d6ebcb7",
      "stored_bytes": 66,
      "media_type": "application/octet-stream",
      "sensitivity": "NORMAL"
    },
    "stderr_ref": {
      "artifact_id": "91f1b6d8-44d0-4be2-86d8-2c76ab692b9a",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "bytes": 0,
      "codec": "zstd",
      "stored_sha256": "f96deff1816083fdff8bc3e46c3fe6ca46a6bb49f4d5a00627616c13237a512c",
      "stored_bytes": 13,
      "media_type": "application/octet-stream",
      "sensitivity": "NORMAL"
    },
    "audit_event_id": "c735c83b-ecc1-425e-8ddb-574a2e3f8007",
    "permit_id": "0fb28470-198b-43d1-a906-8bfb222e4a54"
  },
  "diagnostics": {
    "status": "PASS",
    "reason": "BROKER_OPERATION_COMPLETE",
    "operation_id": "c9183ef9-cb9a-42cd-9e78-a6eaaa2c4deb",
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
      "request_id": "1ed5eae4-602f-47cd-895c-0b54a64e8437",
      "source_sha256": "0f80613450ca8072e84f700960a349f2a5d7de23b66f68993d80d08e37607c9a",
      "status": "FAIL",
      "timing": {
        "elapsed_ms": 2.446,
        "started_at": "2026-11-06T17:51:26.413Z"
      },
      "uri": "memory:demo.json",
      "version": 1
    },
    "stdout_ref": {
      "artifact_id": "acd89c18-7661-4f64-8733-2e82f18b72ae",
      "sha256": "01293f48d5d6036977271c8d056843e13b47bd8407a46622851f71ebb2da52ef",
      "bytes": 1189,
      "codec": "zstd",
      "stored_sha256": "9b74d2e4c8998399fdbcce30534446e07cb7be369ac970dbec5dbb4d3baccd7c",
      "stored_bytes": 699,
      "media_type": "application/octet-stream",
      "sensitivity": "NORMAL"
    },
    "stderr_ref": {
      "artifact_id": "2ff90438-862d-4750-9477-079ec0d76345",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "bytes": 0,
      "codec": "zstd",
      "stored_sha256": "f96deff1816083fdff8bc3e46c3fe6ca46a6bb49f4d5a00627616c13237a512c",
      "stored_bytes": 13,
      "media_type": "application/octet-stream",
      "sensitivity": "NORMAL"
    },
    "audit_event_id": "a58e4fed-d667-4052-8e0e-a514d5c748e3",
    "permit_id": "69e649cc-289f-4bc2-861b-6218d9a378ac"
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

## .workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/demo.stderr.txt

类别：`original_runtime_evidence_or_index`；原始字节数：0。

源文件 SHA256：

```text
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0057","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/demo.stderr.txt","bytes":0,"sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/demo.stderr.txt"}} -->
```text
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/final-verification.json

类别：`original_runtime_evidence_or_index`；原始字节数：7781。

源文件 SHA256：

```text
2f7e49d3b634ca5339e8797f47c20a4d1ba16bcf3ea9294c259ef83a7ac032b3
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0058","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/final-verification.json","bytes":7781,"sha256":"2f7e49d3b634ca5339e8797f47c20a4d1ba16bcf3ea9294c259ef83a7ac032b3","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/final-verification.json"}} -->
```json
{
  "schema": "agentnexus/m01-m1-final-verification/1",
  "utc": "2026-11-06T17:51:09.855726+00:00",
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
      "scope": "Real native code/SQLite/Zstd/filesystem/known parser/process tests with synthetic inputs; no real model",
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
      "scope": "Actual local Tool/Audit/Context/Artifact + JSON checker, explicitly no model/Shell",
      "detail": {
        "exit_code": 0,
        "root": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\demos\\local-61xp9E",
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

## .workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/govern-final.log

类别：`original_runtime_evidence_or_index`；原始字节数：24。

源文件 SHA256：

```text
74b9b169f20d84d2bc14b03ada594625dda519a7f855845ca917f6ec53661344
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0059","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/govern-final.log","bytes":24,"sha256":"74b9b169f20d84d2bc14b03ada594625dda519a7f855845ca917f6ec53661344","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/govern-final.log"}} -->
```text
Governance check: PASS
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/license-closure.json

类别：`original_runtime_evidence_or_index`；原始字节数：24843。

源文件 SHA256：

```text
8735e958b08c2f776231d26a2419ed95340cc3470e8377526640a8c1ed7e9eef
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0060","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/license-closure.json","bytes":24843,"sha256":"8735e958b08c2f776231d26a2419ed95340cc3470e8377526640a8c1ed7e9eef","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/license-closure.json"}} -->
```json
{
  "schema": "agentnexus/m1-actual-candidate-provenance/1",
  "status": "PASS",
  "scope": "Complete introduced local source/test/config/tool/package candidate; no runtime binary redistribution",
  "files": [
    {
      "path": "config/agentnexus/features.json",
      "bytes": 390886,
      "sha256": "ed7b7ad4fd9d8e34bc28b9873cc397dd33932b0f27f21eb550f70951361154a7",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "config/agentnexus/policies.json",
      "bytes": 91143,
      "sha256": "74cb43697d45606fb2f3ad716b28a5125b5faff808de8973c3ab28c77e41c7b3",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "package.json",
      "bytes": 293,
      "sha256": "e23288d939a3706e522bf34a1d87802242b418749c37f1e54c5b481562ffd809",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/artifacts.ts",
      "bytes": 15666,
      "sha256": "f89cd95c7c373e1551d509f82596e54e203f0bb02b2934e1c2108040ef48bc49",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/checkers/powershell_ast.ps1",
      "bytes": 3780,
      "sha256": "90079d41e2083df61ee87456cbe81a4d1863b2f4053df0ab9e78b668e3789ae8",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/checkers/python_ast.py",
      "bytes": 2998,
      "sha256": "a9595eca900b49c4ec88e82599c28569b01e543ed8ecb52908ae0772b104fc6e",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/cli.ts",
      "bytes": 1928,
      "sha256": "458b10cdbe3236b0e5ace1439334095bc30243fafeaf071273de956d22511b15",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/control.ts",
      "bytes": 7027,
      "sha256": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/diagnostics.ts",
      "bytes": 31299,
      "sha256": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/features.ts",
      "bytes": 11883,
      "sha256": "ca05754e624100b2dd863224efed67edc9cf0f245c6f63ef0069c544a8331ed6",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/gateway.ts",
      "bytes": 18759,
      "sha256": "85ab9f4312f17783ad5a2101c6582e769378489a29f3d62e0919cd3bdb1ff5ec",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/host.ts",
      "bytes": 16750,
      "sha256": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/integrity.ts",
      "bytes": 18691,
      "sha256": "172a40c429c9e8a99f8cc1fcee2ef500adb4e7d378f0f6188fbbe7f792edfe66",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/policy.ts",
      "bytes": 13815,
      "sha256": "98cadd7673c9d523733bb9fe1d1d62a036516aa63c9c0441a758dc39a14d18d2",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/records.ts",
      "bytes": 6510,
      "sha256": "393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/storage.ts",
      "bytes": 33030,
      "sha256": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "src/agentnexus/types.ts",
      "bytes": 6814,
      "sha256": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "tests/agentnexus/control.test.ts",
      "bytes": 16933,
      "sha256": "c392c452fad08a00ce91c0b010f27bc99699c5b9c3e58416a08b9f8413f79441",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "tests/agentnexus/diagnostics.test.ts",
      "bytes": 19069,
      "sha256": "67eef7a1adfc1b2baceb62ca4cd157d8737332e8595f0d93a63bcfb853257394",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "tests/agentnexus/gateway.test.ts",
      "bytes": 17724,
      "sha256": "030655a357b66b656e3dcdadeab44848b26c5eb2a1dc82d29787987abf62aba1",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "tests/agentnexus/integrity.test.ts",
      "bytes": 21578,
      "sha256": "ecc6655be30a7d7690f04e5d26c61f09eaaa988ae1075b63327fe98c97c93277",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "tests/agentnexus/owned-storage-child.mjs",
      "bytes": 1885,
      "sha256": "7a469bfa662d98f39f06b4483eaa1f49809e490817679cce5f7f1fa366133139",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "tests/agentnexus/storage.test.ts",
      "bytes": 28870,
      "sha256": "d0cae519ebfce054002a51b10b292cc870f2bbe01c67706dd1fd9a203525a3da",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    },
    {
      "path": "tools/agentnexus/run-tests.mjs",
      "bytes": 667,
      "sha256": "7b1b45b072e55e4c2e079e90aa963d94584a871496945ed88b737cb42dd4c0b7",
      "provenance": "independently authored AgentNexus source or generated own catalog",
      "imported_third_party_source": false,
      "distribution_license": "NOT_SELECTED; no public grant inferred"
    }
  ],
  "javascript_import_edges": [
    {
      "file": "src/agentnexus/artifacts.ts",
      "specifier": "node:crypto"
    },
    {
      "file": "src/agentnexus/artifacts.ts",
      "specifier": "node:fs"
    },
    {
      "file": "src/agentnexus/artifacts.ts",
      "specifier": "node:fs/promises"
    },
    {
      "file": "src/agentnexus/artifacts.ts",
      "specifier": "node:path"
    },
    {
      "file": "src/agentnexus/artifacts.ts",
      "specifier": "node:stream"
    },
    {
      "file": "src/agentnexus/artifacts.ts",
      "specifier": "node:stream/promises"
    },
    {
      "file": "src/agentnexus/artifacts.ts",
      "specifier": "node:zlib"
    },
    {
      "file": "src/agentnexus/artifacts.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/artifacts.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/artifacts.ts",
      "specifier": "./records.ts"
    },
    {
      "file": "src/agentnexus/cli.ts",
      "specifier": "node:url"
    },
    {
      "file": "src/agentnexus/cli.ts",
      "specifier": "node:fs/promises"
    },
    {
      "file": "src/agentnexus/cli.ts",
      "specifier": "node:path"
    },
    {
      "file": "src/agentnexus/cli.ts",
      "specifier": "./host.ts"
    },
    {
      "file": "src/agentnexus/control.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/control.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/control.ts",
      "specifier": "./storage.ts"
    },
    {
      "file": "src/agentnexus/control.ts",
      "specifier": "node:perf_hooks"
    },
    {
      "file": "src/agentnexus/diagnostics.ts",
      "specifier": "node:child_process"
    },
    {
      "file": "src/agentnexus/diagnostics.ts",
      "specifier": "node:child_process"
    },
    {
      "file": "src/agentnexus/diagnostics.ts",
      "specifier": "node:fs/promises"
    },
    {
      "file": "src/agentnexus/diagnostics.ts",
      "specifier": "node:path"
    },
    {
      "file": "src/agentnexus/diagnostics.ts",
      "specifier": "node:url"
    },
    {
      "file": "src/agentnexus/diagnostics.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/diagnostics.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/features.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/features.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/features.ts",
      "specifier": "./control.ts"
    },
    {
      "file": "src/agentnexus/features.ts",
      "specifier": "./control.ts"
    },
    {
      "file": "src/agentnexus/features.ts",
      "specifier": "./storage.ts"
    },
    {
      "file": "src/agentnexus/gateway.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/gateway.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/gateway.ts",
      "specifier": "./control.ts"
    },
    {
      "file": "src/agentnexus/gateway.ts",
      "specifier": "./control.ts"
    },
    {
      "file": "src/agentnexus/gateway.ts",
      "specifier": "./storage.ts"
    },
    {
      "file": "src/agentnexus/gateway.ts",
      "specifier": "node:perf_hooks"
    },
    {
      "file": "src/agentnexus/gateway.ts",
      "specifier": "./features.ts"
    },
    {
      "file": "src/agentnexus/gateway.ts",
      "specifier": "./policy.ts"
    },
    {
      "file": "src/agentnexus/host.ts",
      "specifier": "node:fs/promises"
    },
    {
      "file": "src/agentnexus/host.ts",
      "specifier": "./storage.ts"
    },
    {
      "file": "src/agentnexus/host.ts",
      "specifier": "./features.ts"
    },
    {
      "file": "src/agentnexus/host.ts",
      "specifier": "./policy.ts"
    },
    {
      "file": "src/agentnexus/host.ts",
      "specifier": "./policy.ts"
    },
    {
      "file": "src/agentnexus/host.ts",
      "specifier": "./gateway.ts"
    },
    {
      "file": "src/agentnexus/host.ts",
      "specifier": "./gateway.ts"
    },
    {
      "file": "src/agentnexus/host.ts",
      "specifier": "./diagnostics.ts"
    },
    {
      "file": "src/agentnexus/host.ts",
      "specifier": "./diagnostics.ts"
    },
    {
      "file": "src/agentnexus/host.ts",
      "specifier": "./control.ts"
    },
    {
      "file": "src/agentnexus/host.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/host.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/host.ts",
      "specifier": "./features.ts"
    },
    {
      "file": "src/agentnexus/integrity.ts",
      "specifier": "node:crypto"
    },
    {
      "file": "src/agentnexus/integrity.ts",
      "specifier": "node:fs"
    },
    {
      "file": "src/agentnexus/integrity.ts",
      "specifier": "node:fs"
    },
    {
      "file": "src/agentnexus/integrity.ts",
      "specifier": "node:fs/promises"
    },
    {
      "file": "src/agentnexus/integrity.ts",
      "specifier": "node:fs/promises"
    },
    {
      "file": "src/agentnexus/integrity.ts",
      "specifier": "node:path"
    },
    {
      "file": "src/agentnexus/integrity.ts",
      "specifier": "node:util"
    },
    {
      "file": "src/agentnexus/integrity.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/integrity.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/policy.ts",
      "specifier": "node:perf_hooks"
    },
    {
      "file": "src/agentnexus/policy.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/policy.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/policy.ts",
      "specifier": "./control.ts"
    },
    {
      "file": "src/agentnexus/policy.ts",
      "specifier": "./control.ts"
    },
    {
      "file": "src/agentnexus/policy.ts",
      "specifier": "./storage.ts"
    },
    {
      "file": "src/agentnexus/records.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/records.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "node:sqlite"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "node:async_hooks"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "node:crypto"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "node:fs"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "node:fs/promises"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "node:fs/promises"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "node:os"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "node:path"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "node:stream"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "node:stream/promises"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "node:zlib"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "./artifacts.ts"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "./records.ts"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/storage.ts",
      "specifier": "./types.ts"
    },
    {
      "file": "src/agentnexus/types.ts",
      "specifier": "node:crypto"
    },
    {
      "file": "tests/agentnexus/control.test.ts",
      "specifier": "node:test"
    },
    {
      "file": "tests/agentnexus/control.test.ts",
      "specifier": "node:assert/strict"
    },
    {
      "file": "tests/agentnexus/control.test.ts",
      "specifier": "node:fs/promises"
    },
    {
      "file": "tests/agentnexus/control.test.ts",
      "specifier": "node:path"
    },
    {
      "file": "tests/agentnexus/control.test.ts",
      "specifier": "node:timers/promises"
    },
    {
      "file": "tests/agentnexus/control.test.ts",
      "specifier": "../../src/agentnexus/host.ts"
    },
    {
      "file": "tests/agentnexus/control.test.ts",
      "specifier": "../../src/agentnexus/types.ts"
    },
    {
      "file": "tests/agentnexus/control.test.ts",
      "specifier": "../../src/agentnexus/types.ts"
    },
    {
      "file": "tests/agentnexus/control.test.ts",
      "specifier": "../../src/agentnexus/policy.ts"
    },
    {
      "file": "tests/agentnexus/diagnostics.test.ts",
      "specifier": "node:test"
    },
    {
      "file": "tests/agentnexus/diagnostics.test.ts",
      "specifier": "node:assert/strict"
    },
    {
      "file": "tests/agentnexus/diagnostics.test.ts",
      "specifier": "node:fs"
    },
    {
      "file": "tests/agentnexus/diagnostics.test.ts",
      "specifier": "node:child_process"
    },
    {
      "file": "tests/agentnexus/diagnostics.test.ts",
      "specifier": "node:module"
    },
    {
      "file": "tests/agentnexus/diagnostics.test.ts",
      "specifier": "node:fs/promises"
    },
    {
      "file": "tests/agentnexus/diagnostics.test.ts",
      "specifier": "node:path"
    },
    {
      "file": "tests/agentnexus/diagnostics.test.ts",
      "specifier": "node:timers/promises"
    },
    {
      "file": "tests/agentnexus/diagnostics.test.ts",
      "specifier": "../../src/agentnexus/diagnostics.ts"
    },
    {
      "file": "tests/agentnexus/diagnostics.test.ts",
      "specifier": "../../src/agentnexus/types.ts"
    },
    {
      "file": "tests/agentnexus/diagnostics.test.ts",
      "specifier": "../../src/agentnexus/types.ts"
    },
    {
      "file": "tests/agentnexus/gateway.test.ts",
      "specifier": "node:test"
    },
    {
      "file": "tests/agentnexus/gateway.test.ts",
      "specifier": "node:assert/strict"
    },
    {
      "file": "tests/agentnexus/gateway.test.ts",
      "specifier": "node:fs/promises"
    },
    {
      "file": "tests/agentnexus/gateway.test.ts",
      "specifier": "node:path"
    },
    {
      "file": "tests/agentnexus/gateway.test.ts",
      "specifier": "node:timers/promises"
    },
    {
      "file": "tests/agentnexus/gateway.test.ts",
      "specifier": "../../src/agentnexus/host.ts"
    },
    {
      "file": "tests/agentnexus/gateway.test.ts",
      "specifier": "../../src/agentnexus/gateway.ts"
    },
    {
      "file": "tests/agentnexus/gateway.test.ts",
      "specifier": "../../src/agentnexus/gateway.ts"
    },
    {
      "file": "tests/agentnexus/gateway.test.ts",
      "specifier": "../../src/agentnexus/types.ts"
    },
    {
      "file": "tests/agentnexus/gateway.test.ts",
      "specifier": "../../src/agentnexus/types.ts"
    },
    {
      "file": "tests/agentnexus/integrity.test.ts",
      "specifier": "node:assert/strict"
    },
    {
      "file": "tests/agentnexus/integrity.test.ts",
      "specifier": "node:crypto"
    },
    {
      "file": "tests/agentnexus/integrity.test.ts",
      "specifier": "node:fs"
    },
    {
      "file": "tests/agentnexus/integrity.test.ts",
      "specifier": "node:fs/promises"
    },
    {
      "file": "tests/agentnexus/integrity.test.ts",
      "specifier": "node:path"
    },
    {
      "file": "tests/agentnexus/integrity.test.ts",
      "specifier": "node:test"
    },
    {
      "file": "tests/agentnexus/integrity.test.ts",
      "specifier": "node:test"
    },
    {
      "file": "tests/agentnexus/integrity.test.ts",
      "specifier": "../../src/agentnexus/integrity.ts"
    },
    {
      "file": "tests/agentnexus/integrity.test.ts",
      "specifier": "../../src/agentnexus/integrity.ts"
    },
    {
      "file": "tests/agentnexus/integrity.test.ts",
      "specifier": "../../src/agentnexus/types.ts"
    },
    {
      "file": "tests/agentnexus/owned-storage-child.mjs",
      "specifier": "../../src/agentnexus/storage.ts"
    },
    {
      "file": "tests/agentnexus/owned-storage-child.mjs",
      "specifier": "../../src/agentnexus/types.ts"
    },
    {
      "file": "tests/agentnexus/owned-storage-child.mjs",
      "specifier": "../../src/agentnexus/records.ts"
    },
    {
      "file": "tests/agentnexus/owned-storage-child.mjs",
      "specifier": "node:fs/promises"
    },
    {
      "file": "tests/agentnexus/owned-storage-child.mjs",
      "specifier": "node:path"
    },
    {
      "file": "tests/agentnexus/storage.test.ts",
      "specifier": "node:test"
    },
    {
      "file": "tests/agentnexus/storage.test.ts",
      "specifier": "node:assert/strict"
    },
    {
      "file": "tests/agentnexus/storage.test.ts",
      "specifier": "node:crypto"
    },
    {
      "file": "tests/agentnexus/storage.test.ts",
      "specifier": "node:fs/promises"
    },
    {
      "file": "tests/agentnexus/storage.test.ts",
      "specifier": "node:path"
    },
    {
      "file": "tests/agentnexus/storage.test.ts",
      "specifier": "node:url"
    },
    {
      "file": "tests/agentnexus/storage.test.ts",
      "specifier": "node:child_process"
    },
    {
      "file": "tests/agentnexus/storage.test.ts",
      "specifier": "node:events"
    },
    {
      "file": "tests/agentnexus/storage.test.ts",
      "specifier": "../../src/agentnexus/storage.ts"
    },
    {
      "file": "tests/agentnexus/storage.test.ts",
      "specifier": "../../src/agentnexus/artifacts.ts"
    },
    {
      "file": "tests/agentnexus/storage.test.ts",
      "specifier": "../../src/agentnexus/types.ts"
    },
    {
      "file": "tests/agentnexus/storage.test.ts",
      "specifier": "../../src/agentnexus/types.ts"
    },
    {
      "file": "tools/agentnexus/run-tests.mjs",
      "specifier": "node:fs"
    },
    {
      "file": "tools/agentnexus/run-tests.mjs",
      "specifier": "node:url"
    },
    {
      "file": "tools/agentnexus/run-tests.mjs",
      "specifier": "node:child_process"
    }
  ],
  "unresolved_imports": [],
  "external_runtime_edges": [
    {
      "component": "Node",
      "version": "v24.15.0",
      "use": "Installed executable and node:* builtins; SQLite/Zstd embedded",
      "bundled": false,
      "redistribution_admission": "BLOCKED_PENDING_FULL_DISTRIBUTION_CLOSURE"
    },
    {
      "component": "Python",
      "version": "3.12.10",
      "use": "Host-explicit installed parser; direct stdlib imports ast/json/platform/sys; -I -B -S startup",
      "bundled": false
    },
    {
      "component": "PowerShell",
      "version": "7.6.9",
      "use": "Host-explicit installed Language.Parser/.NET assemblies",
      "bundled": false
    }
  ],
  "workflow_kit_code_or_templates_imported": false,
  "project_public_license_selected": false,
  "runtime_binary_distribution_closure": "BLOCKED",
  "note": "Source ownership is not inferred from user-supplied Kit; no third-party product expression imported. This is source-candidate closure, not a legal opinion or whole installed runtime audit."
}
```
<!-- agentnexus-export-end -->

