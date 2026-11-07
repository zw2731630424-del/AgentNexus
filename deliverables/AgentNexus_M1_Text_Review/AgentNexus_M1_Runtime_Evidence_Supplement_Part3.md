# AgentNexus M1 Runtime Evidence Supplement — Part 3

补充原始运行/模块/早期失败/源码版本与测试索引记录，原始空v2预留仍为空；不将历史或空记录改成PASS。单个原始JSON若超过96KB，完整独占一份文档，不拆开文件或截断。

## .workflow-kit/runtime/AgentNexus-v0.4-M1/license-closure.json

类别：`original_runtime_evidence_or_index`；原始字节数：24843。

源文件 SHA256：

```text
1e0f8cc3a2284d8c9567db03ffaf3d7caa33ea275735740eb4f46e202dd5feca
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0071","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/license-closure.json","bytes":24843,"sha256":"1e0f8cc3a2284d8c9567db03ffaf3d7caa33ea275735740eb4f46e202dd5feca","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/license-closure.json"}} -->
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
      "bytes": 12008,
      "sha256": "d6aafeafd88f6fd5660afa6b4f29b68625d70ffc8f8138f90db657b6acacda5e",
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
      "bytes": 17859,
      "sha256": "96620a3ee83c8b1c65e798ab575fe4ff2a9ccd62ecf69f090d0b70e06fa73824",
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

## .workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-before-close-race-fix.json

类别：`original_runtime_evidence_or_index`；原始字节数：10165。

源文件 SHA256：

```text
319b8bef22cd43925ec367b3d1dda2ff5d47b5f70a1f73761b0c59dbb2e0c176
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0072","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-before-close-race-fix.json","bytes":10165,"sha256":"319b8bef22cd43925ec367b3d1dda2ff5d47b5f70a1f73761b0c59dbb2e0c176","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-before-close-race-fix.json"}} -->
```json
{
  "schema": "agentnexus/m1/control-review-probes/1",
  "captured_utc": "2026-11-06T17:23:35.810Z",
  "before_sha256": {
    "src/agentnexus/types.ts": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75",
    "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
    "src/agentnexus/features.ts": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
    "src/agentnexus/policy.ts": "efc03cd86e873e436a7e1bb195227d6c1b98de9f639dea1f87203d75cdf69a8a",
    "src/agentnexus/gateway.ts": "223d908da4daec469cacc1da8fdcc88f0f2e59af9a981eaff4c1a16c4360d4db",
    "src/agentnexus/host.ts": "a452097b04a29056904e5f2a167778d149199fee890b1efc7f638eede40d7f00",
    "src/agentnexus/storage.ts": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb",
    "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
  },
  "after_sha256": {
    "src/agentnexus/types.ts": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75",
    "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
    "src/agentnexus/features.ts": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
    "src/agentnexus/policy.ts": "efc03cd86e873e436a7e1bb195227d6c1b98de9f639dea1f87203d75cdf69a8a",
    "src/agentnexus/gateway.ts": "223d908da4daec469cacc1da8fdcc88f0f2e59af9a981eaff4c1a16c4360d4db",
    "src/agentnexus/host.ts": "a452097b04a29056904e5f2a167778d149199fee890b1efc7f638eede40d7f00",
    "src/agentnexus/storage.ts": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb",
    "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
  },
  "source_changed_during_probe": [],
  "observations": {
    "inherit_to_off": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-s6PnkD",
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
    },
    "diagnostics_after_failed_stop": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-0B7c1u",
      "stop_failure": "MODULE_STILL_RUNNING",
      "runtime": {
        "id": "devint.runtime",
        "desired": "ON",
        "revision": 0,
        "epoch": 1,
        "health": "FAILED",
        "effective": "BLOCKED",
        "reason": "FAILED"
      },
      "result": {
        "status": "PASS",
        "reason": "BROKER_OPERATION_COMPLETE",
        "operation_id": "c5452288-c107-4d5b-b36b-6b47ccb69727",
        "intent_hash": "b607b045566a3edd93bcfc3966f5e857fb38d6260e904f5e9cb0d350350bd4f4",
        "data": {
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
          "request_id": "45639702-cecd-4f5a-80f8-0e0117bf1b9c",
          "source_sha256": "a8198524f58e72b56283ab71ebddada22840f108b46ef7165bb3fca9919c5558",
          "status": "BLOCKED",
          "timing": {
            "elapsed_ms": 0,
            "started_at": "2026-11-06T17:23:35.260Z"
          },
          "uri": "review://runtime-blocked.json",
          "version": 1
        },
        "stdout_ref": {
          "artifact_id": "feb00a49-12c1-4820-9a29-e5ad395d503e",
          "sha256": "bf4a69941d1bb36d5e61fae635acad7440c15e467ca47a94f6b938551a6a0fb6",
          "bytes": 1005,
          "codec": "zstd",
          "stored_sha256": "7d4a55cf5892273009c0078ff16bb395c9aa0454dce8a51d344d93b502d5ed4b",
          "stored_bytes": 463,
          "media_type": "application/octet-stream",
          "sensitivity": "NORMAL"
        },
        "stderr_ref": {
          "artifact_id": "bbcf0b0d-08d9-4f1b-a3e3-5f8abbb55606",
          "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "bytes": 0,
          "codec": "zstd",
          "stored_sha256": "f96deff1816083fdff8bc3e46c3fe6ca46a6bb49f4d5a00627616c13237a512c",
          "stored_bytes": 13,
          "media_type": "application/octet-stream",
          "sensitivity": "NORMAL"
        },
        "audit_event_id": "dd5d1a5f-9bf9-44e1-be6d-c7f6fffffa47",
        "permit_id": "71f3fa39-c2d0-4c09-adb3-4476b4ef0ccc"
      }
    },
    "expired_approval_clock_rollback": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-uxrgLX",
      "clock_scope": "logical Date.now override in owned probe process; not OS-clock verification",
      "initially_valid": true,
      "valid_after_actual_expiry": false,
      "valid_after_clock_rollback": false,
      "handler_executions": 0,
      "result": {
        "status": "BLOCKED",
        "reason": "POLICY_DENIED",
        "operation_id": "d63c57bd-a63b-43a5-b3ba-8358fa8b07a7",
        "intent_hash": "b009795675a81028deead2e85b9a88e4ca417462af41439fac86ac52102bace5",
        "data": null,
        "stdout_ref": null,
        "stderr_ref": null,
        "audit_event_id": "ee9be57f-f5a0-4261-9b7f-3309b3a2484b",
        "permit_id": null
      }
    },
    "closed_facade": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-KTNNLY",
      "old_context_rows": 0,
      "old_audit_rows": 0,
      "context_error": "SESSION_CLOSED",
      "audit_error": "SESSION_CLOSED",
      "old_context_session_ids": [],
      "replacement_after_old_close": {
        "status": "PASS",
        "reason": "BROKER_OPERATION_COMPLETE",
        "operation_id": "ac269fa4-0656-4248-a8b3-42677787b994",
        "intent_hash": "98bbd8c4b26febe4a0802cdb20d121d04c85b1efffc3aeb698919490921fff3d",
        "data": null,
        "stdout_ref": {
          "artifact_id": "db278ab4-a22b-4ac5-91ea-a78dc4338a9f",
          "sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b",
          "bytes": 4,
          "codec": "zstd",
          "stored_sha256": "db509e5e4f3f8709cee7ab288b5fd21e12d4cec20be94c1d5b4ec12835173edd",
          "stored_bytes": 17,
          "media_type": "application/octet-stream",
          "sensitivity": "NORMAL"
        },
        "stderr_ref": {
          "artifact_id": "812c6215-b1d7-4e88-9b50-f458b3f18ff7",
          "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "bytes": 0,
          "codec": "zstd",
          "stored_sha256": "f96deff1816083fdff8bc3e46c3fe6ca46a6bb49f4d5a00627616c13237a512c",
          "stored_bytes": 13,
          "media_type": "application/octet-stream",
          "sensitivity": "NORMAL"
        },
        "audit_event_id": "c380e6e2-821c-466b-93a2-7fe82459b90b",
        "permit_id": "a8331f44-bf65-4408-b19f-bcbbe2bafb84"
      }
    },
    "same_task_other_agent_read": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-pA7FsJ",
      "other_agent_context_rows": 2,
      "returned_agent_ids": [
        "review-a",
        "review-a"
      ],
      "classification": "contract confirmation needed: task-wide sharing vs agent-private context"
    },
    "session_close_request_race": {
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
    }
  },
  "final_product_acceptance": "PENDING_ROOT_FINAL_TESTS",
  "product_files_modified": false
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-before-timeout-fix.json

类别：`original_runtime_evidence_or_index`；原始字节数：10538。

源文件 SHA256：

```text
11eaae06fde02dc5e2e6b1c3f6ecc4ba3abb04b3b88bbf6281984382369e44cc
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0073","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-before-timeout-fix.json","bytes":10538,"sha256":"11eaae06fde02dc5e2e6b1c3f6ecc4ba3abb04b3b88bbf6281984382369e44cc","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-before-timeout-fix.json"}} -->
```json
{
  "schema": "agentnexus/m1/control-review-probes/1",
  "captured_utc": "2026-11-06T17:25:38.258Z",
  "before_sha256": {
    "src/agentnexus/types.ts": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75",
    "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
    "src/agentnexus/features.ts": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
    "src/agentnexus/policy.ts": "efc03cd86e873e436a7e1bb195227d6c1b98de9f639dea1f87203d75cdf69a8a",
    "src/agentnexus/gateway.ts": "223d908da4daec469cacc1da8fdcc88f0f2e59af9a981eaff4c1a16c4360d4db",
    "src/agentnexus/host.ts": "1aaac029d09a2724be8c4f30767fa1da79a1720cca6c8788966c6020e407e78a",
    "src/agentnexus/storage.ts": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb",
    "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
  },
  "after_sha256": {
    "src/agentnexus/types.ts": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75",
    "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
    "src/agentnexus/features.ts": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
    "src/agentnexus/policy.ts": "efc03cd86e873e436a7e1bb195227d6c1b98de9f639dea1f87203d75cdf69a8a",
    "src/agentnexus/gateway.ts": "223d908da4daec469cacc1da8fdcc88f0f2e59af9a981eaff4c1a16c4360d4db",
    "src/agentnexus/host.ts": "1aaac029d09a2724be8c4f30767fa1da79a1720cca6c8788966c6020e407e78a",
    "src/agentnexus/storage.ts": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb",
    "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
  },
  "source_changed_during_probe": [],
  "observations": {
    "inherit_to_off": {
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
    },
    "diagnostics_after_failed_stop": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-EguEMa",
      "stop_failure": "MODULE_STILL_RUNNING",
      "runtime": {
        "id": "devint.runtime",
        "desired": "ON",
        "revision": 0,
        "epoch": 1,
        "health": "FAILED",
        "effective": "BLOCKED",
        "reason": "FAILED"
      },
      "result": {
        "status": "PASS",
        "reason": "BROKER_OPERATION_COMPLETE",
        "operation_id": "81cf1b15-584e-4b56-9c6a-77e4e944c4ef",
        "intent_hash": "b607b045566a3edd93bcfc3966f5e857fb38d6260e904f5e9cb0d350350bd4f4",
        "data": {
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
        },
        "stdout_ref": {
          "artifact_id": "8a2e0ef8-7783-42e1-b9a0-44b278ba28d2",
          "sha256": "4b3dbc7785619e03a7511f363df6fc790c4b4e71954f09281b99bee5ba59758b",
          "bytes": 1005,
          "codec": "zstd",
          "stored_sha256": "49951a78b3712d2e0f3ddad44d3bd5cdf6992ae19d293fdde6be779a682ab162",
          "stored_bytes": 462,
          "media_type": "application/octet-stream",
          "sensitivity": "NORMAL"
        },
        "stderr_ref": {
          "artifact_id": "345fa9ca-a416-49e3-8b9c-914fcc23e07b",
          "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "bytes": 0,
          "codec": "zstd",
          "stored_sha256": "f96deff1816083fdff8bc3e46c3fe6ca46a6bb49f4d5a00627616c13237a512c",
          "stored_bytes": 13,
          "media_type": "application/octet-stream",
          "sensitivity": "NORMAL"
        },
        "audit_event_id": "5c306839-494c-45bd-8434-2bef0f9aaf6e",
        "permit_id": "d4a17155-fbf9-4c03-87f3-574f5dd00800"
      }
    },
    "expired_approval_clock_rollback": {
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
    "closed_facade": {
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
    "same_task_other_agent_read": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-6XnAVS",
      "other_agent_context_rows": 2,
      "returned_agent_ids": [
        "review-a",
        "review-a"
      ],
      "classification": "contract confirmation needed: task-wide sharing vs agent-private context"
    },
    "session_close_request_race": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-Vs6rN5",
      "request_after_close_started": {
        "code": "SESSION_CLOSED"
      }
    },
    "handler_timeout_clock": {
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
    }
  },
  "final_product_acceptance": "PENDING_ROOT_FINAL_TESTS",
  "product_files_modified": false
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-initial.json

类别：`original_runtime_evidence_or_index`；原始字节数：7389。

源文件 SHA256：

```text
b994cc67418c7a8e6f6ae405ef11d312a1c3774e81640e3ab0a1b0edaabd3812
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0074","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-initial.json","bytes":7389,"sha256":"b994cc67418c7a8e6f6ae405ef11d312a1c3774e81640e3ab0a1b0edaabd3812","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-initial.json"}} -->
```json
{
  "schema": "agentnexus/m1/control-review-probes/1",
  "captured_utc": "2026-11-06T17:21:23.723Z",
  "before_sha256": {
    "src/agentnexus/types.ts": "273780415d1e00476dcfc52ca901a15527d62f1e74c1a46def5757251afcfcd8",
    "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
    "src/agentnexus/features.ts": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
    "src/agentnexus/policy.ts": "efc03cd86e873e436a7e1bb195227d6c1b98de9f639dea1f87203d75cdf69a8a",
    "src/agentnexus/gateway.ts": "223d908da4daec469cacc1da8fdcc88f0f2e59af9a981eaff4c1a16c4360d4db",
    "src/agentnexus/host.ts": "96b2d0bad306956e41cef7942080fd912d5df36d62b7cf68e8bc092e45654f20",
    "src/agentnexus/storage.ts": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb",
    "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
  },
  "after_sha256": {
    "src/agentnexus/types.ts": "273780415d1e00476dcfc52ca901a15527d62f1e74c1a46def5757251afcfcd8",
    "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
    "src/agentnexus/features.ts": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
    "src/agentnexus/policy.ts": "efc03cd86e873e436a7e1bb195227d6c1b98de9f639dea1f87203d75cdf69a8a",
    "src/agentnexus/gateway.ts": "223d908da4daec469cacc1da8fdcc88f0f2e59af9a981eaff4c1a16c4360d4db",
    "src/agentnexus/host.ts": "96b2d0bad306956e41cef7942080fd912d5df36d62b7cf68e8bc092e45654f20",
    "src/agentnexus/storage.ts": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb",
    "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
  },
  "source_changed_during_probe": [],
  "observations": {
    "inherit_to_off": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-zVGrnB",
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
    },
    "diagnostics_after_failed_stop": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-Sj22eX",
      "stop_failure": "MODULE_STILL_RUNNING",
      "runtime": {
        "id": "devint.runtime",
        "desired": "ON",
        "revision": 0,
        "epoch": 1,
        "health": "FAILED",
        "effective": "BLOCKED",
        "reason": "FAILED"
      },
      "result": {
        "status": "PASS",
        "reason": "BROKER_OPERATION_COMPLETE",
        "operation_id": "a91a8955-1f0e-4d88-b593-485da1f2c45c",
        "intent_hash": "b607b045566a3edd93bcfc3966f5e857fb38d6260e904f5e9cb0d350350bd4f4",
        "data": {
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
          "request_id": "6d61c757-ec3e-40af-a74a-d20546f85ba6",
          "source_sha256": "a8198524f58e72b56283ab71ebddada22840f108b46ef7165bb3fca9919c5558",
          "status": "BLOCKED",
          "timing": {
            "elapsed_ms": 0,
            "started_at": "2026-11-06T17:21:23.303Z"
          },
          "uri": "review://runtime-blocked.json",
          "version": 1
        },
        "stdout_ref": {
          "artifact_id": "0ee93d2f-c41e-4d09-ab94-85e1e7289a4b",
          "sha256": "ffd719815fbb7c832158035334912961dbaa4c81ad5406c5603336510358fb06",
          "bytes": 1005,
          "codec": "zstd",
          "stored_sha256": "505aefeb3b5d243a6906b0f452a91146ef7103cdea1f0bf8fcc9e348a830ef2e",
          "stored_bytes": 462,
          "media_type": "application/octet-stream",
          "sensitivity": "NORMAL"
        },
        "stderr_ref": {
          "artifact_id": "dbb56e66-a483-44d5-af49-aa416dba8656",
          "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "bytes": 0,
          "codec": "zstd",
          "stored_sha256": "f96deff1816083fdff8bc3e46c3fe6ca46a6bb49f4d5a00627616c13237a512c",
          "stored_bytes": 13,
          "media_type": "application/octet-stream",
          "sensitivity": "NORMAL"
        },
        "audit_event_id": "bd2b3ba9-1127-4d5a-bb8c-c4e6ffab5fc4",
        "permit_id": "b3ab5cbf-2c01-4017-a3c6-c3e6ac800c08"
      }
    },
    "expired_approval_clock_rollback": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-8ff8ZK",
      "clock_scope": "logical Date.now override in owned probe process; not OS-clock verification",
      "initially_valid": true,
      "valid_after_actual_expiry": false,
      "valid_after_clock_rollback": false,
      "handler_executions": 0,
      "result": {
        "status": "BLOCKED",
        "reason": "POLICY_DENIED",
        "operation_id": "6206c744-28e4-4afb-ae42-ef0856e00470",
        "intent_hash": "b009795675a81028deead2e85b9a88e4ca417462af41439fac86ac52102bace5",
        "data": null,
        "stdout_ref": null,
        "stderr_ref": null,
        "audit_event_id": "3b60ae02-2e52-4ef7-a866-72f77c6cb871",
        "permit_id": null
      }
    },
    "closed_facade": {
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
    "same_task_other_agent_read": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-2pjrV9",
      "other_agent_context_rows": 2,
      "returned_agent_ids": [
        "review-a",
        "review-a"
      ],
      "classification": "contract confirmation needed: task-wide sharing vs agent-private context"
    }
  },
  "final_product_acceptance": "PENDING_ROOT_FINAL_TESTS",
  "product_files_modified": false
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.json

类别：`original_runtime_evidence_or_index`；原始字节数：9613。

源文件 SHA256：

```text
a8d703f12278186cc809a1a84cd40a8f440f133ba8ef5dc5832932e5d0817e6d
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0075","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.json","bytes":9613,"sha256":"a8d703f12278186cc809a1a84cd40a8f440f133ba8ef5dc5832932e5d0817e6d","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.json"}} -->
```json
{
  "schema": "agentnexus/m1/control-review-probes/1",
  "captured_utc": "2026-11-06T17:32:01.655Z",
  "before_sha256": {
    "src/agentnexus/types.ts": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75",
    "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
    "src/agentnexus/features.ts": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
    "src/agentnexus/policy.ts": "efc03cd86e873e436a7e1bb195227d6c1b98de9f639dea1f87203d75cdf69a8a",
    "src/agentnexus/gateway.ts": "61827aaeef516ae7699b890a0e97ccc51c72902f750a889e22a3bcaa748d6bc7",
    "src/agentnexus/host.ts": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
    "src/agentnexus/storage.ts": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d",
    "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
  },
  "after_sha256": {
    "src/agentnexus/types.ts": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75",
    "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
    "src/agentnexus/features.ts": "2a7f4bc603964dcea120b0ba626fc37864588aa0301f2cabe392093a4437a9ce",
    "src/agentnexus/policy.ts": "efc03cd86e873e436a7e1bb195227d6c1b98de9f639dea1f87203d75cdf69a8a",
    "src/agentnexus/gateway.ts": "61827aaeef516ae7699b890a0e97ccc51c72902f750a889e22a3bcaa748d6bc7",
    "src/agentnexus/host.ts": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
    "src/agentnexus/storage.ts": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d",
    "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
  },
  "source_changed_during_probe": [],
  "observations": {
    "inherit_to_off": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-RQ80yS",
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
    },
    "diagnostics_after_failed_stop": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-PWpRSi",
      "stop_failure": "MODULE_STILL_RUNNING",
      "runtime": {
        "id": "devint.runtime",
        "desired": "ON",
        "revision": 0,
        "epoch": 1,
        "health": "FAILED",
        "effective": "BLOCKED",
        "reason": "FAILED"
      },
      "result": {
        "status": "PASS",
        "reason": "BROKER_OPERATION_COMPLETE",
        "operation_id": "1b97f63e-04f4-4fc3-a116-8f958b47c888",
        "intent_hash": "b607b045566a3edd93bcfc3966f5e857fb38d6260e904f5e9cb0d350350bd4f4",
        "data": {
          "checker_id": "unavailable",
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
          "request_id": "188d14d8-04da-4334-905c-2ee3ef1da6fc",
          "source_sha256": "a8198524f58e72b56283ab71ebddada22840f108b46ef7165bb3fca9919c5558",
          "status": "BLOCKED",
          "timing": {
            "elapsed_ms": 0,
            "started_at": "2026-11-06T17:32:00.959Z"
          },
          "uri": "review://runtime-blocked.json",
          "version": 1
        },
        "stdout_ref": {
          "artifact_id": "73019a8e-85fd-436e-b952-90bf238c9238",
          "sha256": "59ad33292511cebb7cb09c6c322c2524b9591654803d43bf961117ddd12d32b6",
          "bytes": 1008,
          "codec": "zstd",
          "stored_sha256": "d0f1b0509280c41d00d04b552d53b16e920b0cb33044bef3bd22e191d5786cdd",
          "stored_bytes": 462,
          "media_type": "application/octet-stream",
          "sensitivity": "NORMAL"
        },
        "stderr_ref": {
          "artifact_id": "0d24b3ce-18e2-40d6-be96-08ad13d696ea",
          "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "bytes": 0,
          "codec": "zstd",
          "stored_sha256": "f96deff1816083fdff8bc3e46c3fe6ca46a6bb49f4d5a00627616c13237a512c",
          "stored_bytes": 13,
          "media_type": "application/octet-stream",
          "sensitivity": "NORMAL"
        },
        "audit_event_id": "c6e70d98-7267-4390-bb8b-ebc2c4d24e2d",
        "permit_id": "4a73f29d-ed0b-40f3-bd4f-fefb37f1214b"
      }
    },
    "expired_approval_clock_rollback": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-GDjq7p",
      "clock_scope": "logical Date.now override in owned probe process; not OS-clock verification",
      "initially_valid": true,
      "valid_after_actual_expiry": false,
      "valid_after_clock_rollback": false,
      "handler_executions": 0,
      "result": {
        "status": "BLOCKED",
        "reason": "POLICY_DENIED",
        "operation_id": "39f1a0dd-5734-4e85-9e23-2d0a54ec3285",
        "intent_hash": "b009795675a81028deead2e85b9a88e4ca417462af41439fac86ac52102bace5",
        "data": null,
        "stdout_ref": null,
        "stderr_ref": null,
        "audit_event_id": "496ccdfe-4ccc-45fa-8c80-f838387a2d01",
        "permit_id": null
      }
    },
    "closed_facade": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-9wLXsi",
      "old_context_rows": 0,
      "old_audit_rows": 0,
      "context_error": "SESSION_CLOSED",
      "audit_error": "SESSION_CLOSED",
      "old_context_session_ids": [],
      "replacement_after_old_close": {
        "status": "PASS",
        "reason": "BROKER_OPERATION_COMPLETE",
        "operation_id": "14bca61b-e093-498d-b0ef-dd6e94f646e9",
        "intent_hash": "98bbd8c4b26febe4a0802cdb20d121d04c85b1efffc3aeb698919490921fff3d",
        "data": null,
        "stdout_ref": {
          "artifact_id": "bee7fc26-295d-42df-b37e-b90133430d1e",
          "sha256": "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b",
          "bytes": 4,
          "codec": "zstd",
          "stored_sha256": "db509e5e4f3f8709cee7ab288b5fd21e12d4cec20be94c1d5b4ec12835173edd",
          "stored_bytes": 17,
          "media_type": "application/octet-stream",
          "sensitivity": "NORMAL"
        },
        "stderr_ref": {
          "artifact_id": "f7fe10f7-bf4e-4554-865a-28a24e484ebe",
          "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "bytes": 0,
          "codec": "zstd",
          "stored_sha256": "f96deff1816083fdff8bc3e46c3fe6ca46a6bb49f4d5a00627616c13237a512c",
          "stored_bytes": 13,
          "media_type": "application/octet-stream",
          "sensitivity": "NORMAL"
        },
        "audit_event_id": "07fd0e20-eb36-43fd-9f3d-78d304966adf",
        "permit_id": "0d3a4475-fa76-40c9-87f3-dbb7b0570ce9"
      }
    },
    "same_task_other_agent_read": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-IhqnbK",
      "other_agent_context_rows": 0,
      "returned_agent_ids": [],
      "classification": "contract confirmation needed: task-wide sharing vs agent-private context"
    },
    "session_close_request_race": {
      "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\control-state-SXviKo",
      "request_after_close_started": {
        "code": "SESSION_CLOSED"
      }
    },
    "handler_timeout_clock": {
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
    }
  },
  "final_product_acceptance": "PENDING_ROOT_FINAL_TESTS",
  "product_files_modified": false
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/final-control-probes.json

类别：`original_runtime_evidence_or_index`；原始字节数：3360。

源文件 SHA256：

```text
e16ddd843b637010f105f0986242a35d66b9b42f738d4c54845882ba51cb7dac
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0076","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/final-control-probes.json","bytes":3360,"sha256":"e16ddd843b637010f105f0986242a35d66b9b42f738d4c54845882ba51cb7dac","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/final-control-probes.json"}} -->
```json
{
  "schema": "agentnexus/m1/final-control-probes/1",
  "captured_utc": "2026-11-06T17:44:10.816Z",
  "status": "PASS",
  "scope": "CTRL-008 controlled Node/SQLite lifecycle plus static final expiry fences; not full product or OS admission",
  "state_store": "I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-v0.4-M1\\reviews\\final-stop-recovery-eolaFd",
  "source_sha256_before": {
    "src/agentnexus/types.ts": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75",
    "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
    "src/agentnexus/features.ts": "ca05754e624100b2dd863224efed67edc9cf0f245c6f63ef0069c544a8331ed6",
    "src/agentnexus/policy.ts": "98cadd7673c9d523733bb9fe1d1d62a036516aa63c9c0441a758dc39a14d18d2",
    "src/agentnexus/gateway.ts": "85ab9f4312f17783ad5a2101c6582e769378489a29f3d62e0919cd3bdb1ff5ec",
    "src/agentnexus/host.ts": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
    "src/agentnexus/storage.ts": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d",
    "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
  },
  "source_sha256_after": {
    "src/agentnexus/types.ts": "101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75",
    "src/agentnexus/control.ts": "b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc",
    "src/agentnexus/features.ts": "ca05754e624100b2dd863224efed67edc9cf0f245c6f63ef0069c544a8331ed6",
    "src/agentnexus/policy.ts": "98cadd7673c9d523733bb9fe1d1d62a036516aa63c9c0441a758dc39a14d18d2",
    "src/agentnexus/gateway.ts": "85ab9f4312f17783ad5a2101c6582e769378489a29f3d62e0919cd3bdb1ff5ec",
    "src/agentnexus/host.ts": "ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c",
    "src/agentnexus/storage.ts": "172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d",
    "src/agentnexus/diagnostics.ts": "d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d"
  },
  "source_changed": [],
  "observations": {
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
  "failure": null,
  "static_expiry_fence_inspection": {
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
  "root_final_suite": "PENDING_ROOT_FINAL_RESULT",
  "product_source_modified": false
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/stop-recovery-probe.json

类别：`original_runtime_evidence_or_index`；原始字节数：1251。

源文件 SHA256：

```text
de96a9aca9d3895c68b3bb82aeb85337787129a33fa9e63480540a34356a1630
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0077","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/stop-recovery-probe.json","bytes":1251,"sha256":"de96a9aca9d3895c68b3bb82aeb85337787129a33fa9e63480540a34356a1630","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/stop-recovery-probe.json"}} -->
```json
{
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
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/run-history.json

类别：`original_runtime_evidence_or_index`；原始字节数：2169。

源文件 SHA256：

```text
d204e793ed1b4d49890ee08c29ad6b57e645f61a6264567cab5d19b5d5689084
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0078","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/run-history.json","bytes":2169,"sha256":"d204e793ed1b4d49890ee08c29ad6b57e645f61a6264567cab5d19b5d5689084","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/run-history.json"}} -->
```json
{
  "schema": "agentnexus/m1-run-history/1",
  "records": [
    {
      "phase": "module_initial_runs",
      "status": "PASS",
      "scope": "Original author module runs retained, not final integrated acceptance",
      "paths": [
        "storage/verification.json",
        "diagnostics/verification.json",
        "integrity/test-run.json"
      ]
    },
    {
      "phase": "gateway_initial_integration",
      "status": "FAIL",
      "observed_tests": 15,
      "pass": 14,
      "fail": 1,
      "failure": "AT-REPLAY peer session saw two context records before SQL identity filters were connected",
      "source": "Actual execution transcript chunk 88be73; root added regression and integrated Store filters. Not recast as PASS."
    },
    {
      "phase": "first_complete_acceptance",
      "status": "PASS",
      "path": "final-run-1/final-verification.json",
      "scope": "Before one-line Store-fault health display clarification; source ZIP and 8 logs preserved"
    },
    {
      "phase": "second_complete_tests",
      "status": "PASS",
      "test_run_utc": "2026-11-06T17:54:41.259308+00:00",
      "tests": {
        "tests": 135,
        "pass": 131,
        "fail": 0,
        "cancelled": 0,
        "skipped": 4,
        "todo": 0
      },
      "tap_sha256": "7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372"
    },
    {
      "phase": "governance_60_second_budget",
      "status": "INCONCLUSIVE",
      "reason": "Actual subprocess timeout during final scanning; tests already completed, old final JSON was not used as new acceptance"
    },
    {
      "phase": "resume_governance_and_finalize",
      "status": "PASS",
      "verification_sha256": "04adc9bd1e896e498172c1be426d04a34411b4f9699c429b9c36cde517fe6561",
      "exact_tested_candidate_rechecked": true,
      "tests_rerun": false,
      "governance_log_sha256": "74b9b169f20d84d2bc14b03ada594625dda519a7f855845ca917f6ec53661344"
    },
    {
      "phase": "storage_v2",
      "status": "NOT_RUN",
      "reason": "Only empty paths were reserved; no test execution or PASS claimed"
    }
  ]
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap

类别：`original_runtime_evidence_or_index`；原始字节数：4177。

源文件 SHA256：

```text
1a82c98c3558c7165b5a7691900d7b9b10e5b42969959a0db45507d94ac0ac77
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0079","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap","bytes":4177,"sha256":"1a82c98c3558c7165b5a7691900d7b9b10e5b42969959a0db45507d94ac0ac77","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap"}} -->
```text
TAP version 13
# Subtest: real SQLite, three independent domain chains and global pagination
ok 1 - real SQLite, three independent domain chains and global pagination
  ---
  duration_ms: 104.0128
  type: 'test'
  ...
# Subtest: synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault
ok 2 - synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault
  ---
  duration_ms: 28.4037
  type: 'test'
  ...
# Subtest: required fields, malformed refs, oversized envelopes and query budgets reject without fault
ok 3 - required fields, malformed refs, oversized envelopes and query budgets reject without fault
  ---
  duration_ms: 23.0751
  type: 'test'
  ...
# Subtest: outbox high water rejects new records, then drains without unbounded queues
ok 4 - outbox high water rejects new records, then drains without unbounded queues
  ---
  duration_ms: 36.5349
  type: 'test'
  ...
# Subtest: second writer and live lock recovery are blocked; real owner death is explicit
ok 5 - second writer and live lock recovery are blocked; real owner death is explicit
  ---
  duration_ms: 238.2662
  type: 'test'
  ...
# Subtest: process crash after file fsync and before receipt reexports no duplicate
ok 6 - process crash after file fsync and before receipt reexports no duplicate
  ---
  duration_ms: 216.7749
  type: 'test'
  ...
# Subtest: unacknowledged crash tail is preserved then repaired from durable outbox
ok 7 - unacknowledged crash tail is preserved then repaired from durable outbox
  ---
  duration_ms: 452.0618
  type: 'test'
  ...
# Subtest: actual export I/O failure freezes writes and preserves outbox until explicit recovery
ok 8 - actual export I/O failure freezes writes and preserves outbox until explicit recovery
  ---
  duration_ms: 30.6218
  type: 'test'
  ...
# Subtest: acknowledged truncation is never silently discarded or rebuilt as success
ok 9 - acknowledged truncation is never silently discarded or rebuilt as success
  ---
  duration_ms: 19.7031
  type: 'test'
  ...
# Subtest: actual artifact publication I/O failure retains bytes and freezes both record and object admission
ok 10 - actual artifact publication I/O failure retains bytes and freezes both record and object admission
  ---
  duration_ms: 25.546
  type: 'test'
  ...
# Subtest: database hash tampering throws, freezes writes and does not fake repair
ok 11 - database hash tampering throws, freezes writes and does not fake repair
  ---
  duration_ms: 19.0584
  type: 'test'
  ...
# Subtest: 32 MiB randomized artifact roundtrip streams with real backpressure and two hashes
ok 12 - 32 MiB randomized artifact roundtrip streams with real backpressure and two hashes
  ---
  duration_ms: 270.2028
  type: 'test'
  ...
# Subtest: cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected
ok 13 - cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected
  ---
  duration_ms: 32.9337
  type: 'test'
  ...
# Subtest: early artifact iterator return is not verification; full corrupted stream fails closed
ok 14 - early artifact iterator return is not verification; full corrupted stream fails closed
  ---
  duration_ms: 36.0803
  type: 'test'
  ...
# Subtest: concurrent artifact admission is bounded and rejects a third stream without queueing
ok 15 - concurrent artifact admission is bounded and rejects a third stream without queueing
  ---
  duration_ms: 20.2566
  type: 'test'
  ...
# Subtest: sealed segments are compressed, chained and verified; stored bit flip is detected
ok 16 - sealed segments are compressed, chained and verified; stored bit flip is detected
  ---
  duration_ms: 103.4877
  type: 'test'
  ...
# Subtest: process-killed partial artifact remains retained without a complete object reference
ok 17 - process-killed partial artifact remains retained without a complete object reference
  ---
  duration_ms: 170.4636
  type: 'test'
  ...
1..17
# tests 17
# suites 0
# pass 17
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2023.9801
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v2.tap

类别：`original_runtime_evidence_or_index`；原始字节数：0。

源文件 SHA256：

```text
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0080","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v2.tap","bytes":0,"sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v2.tap"}} -->
```text
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap

类别：`original_runtime_evidence_or_index`；原始字节数：5121。

源文件 SHA256：

```text
a85e4a146caea6954a01f8e6102c442994413e2560c54d7d1db4ef16b2b01010
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0081","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap","bytes":5121,"sha256":"a85e4a146caea6954a01f8e6102c442994413e2560c54d7d1db4ef16b2b01010","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap"}} -->
```text
TAP version 13
# Subtest: real SQLite, three independent domain chains and global pagination
ok 1 - real SQLite, three independent domain chains and global pagination
  ---
  duration_ms: 95.6861
  type: 'test'
  ...
# Subtest: synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault
ok 2 - synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault
  ---
  duration_ms: 25.3377
  type: 'test'
  ...
# Subtest: agent and session SQL filters apply before LIMIT and preserve global cursor pages
ok 3 - agent and session SQL filters apply before LIMIT and preserve global cursor pages
  ---
  duration_ms: 202.3066
  type: 'test'
  ...
# Subtest: flush covers its captured target after an empty or older shared flush
ok 4 - flush covers its captured target after an empty or older shared flush
  ---
  duration_ms: 26.8269
  type: 'test'
  ...
# Subtest: required fields, malformed refs, oversized envelopes and query budgets reject without fault
ok 5 - required fields, malformed refs, oversized envelopes and query budgets reject without fault
  ---
  duration_ms: 24.0397
  type: 'test'
  ...
# Subtest: outbox high water rejects new records, then drains without unbounded queues
ok 6 - outbox high water rejects new records, then drains without unbounded queues
  ---
  duration_ms: 31.3715
  type: 'test'
  ...
# Subtest: second writer and live lock recovery are blocked; real owner death is explicit
ok 7 - second writer and live lock recovery are blocked; real owner death is explicit
  ---
  duration_ms: 185.9976
  type: 'test'
  ...
# Subtest: process crash after file fsync and before receipt reexports no duplicate
ok 8 - process crash after file fsync and before receipt reexports no duplicate
  ---
  duration_ms: 166.6028
  type: 'test'
  ...
# Subtest: unacknowledged crash tail is preserved then repaired from durable outbox
ok 9 - unacknowledged crash tail is preserved then repaired from durable outbox
  ---
  duration_ms: 357.0622
  type: 'test'
  ...
# Subtest: actual export I/O failure freezes writes and preserves outbox until explicit recovery
ok 10 - actual export I/O failure freezes writes and preserves outbox until explicit recovery
  ---
  duration_ms: 29.537
  type: 'test'
  ...
# Subtest: acknowledged truncation is never silently discarded or rebuilt as success
ok 11 - acknowledged truncation is never silently discarded or rebuilt as success
  ---
  duration_ms: 19.5593
  type: 'test'
  ...
# Subtest: actual artifact publication I/O failure retains bytes and freezes both record and object admission
ok 12 - actual artifact publication I/O failure retains bytes and freezes both record and object admission
  ---
  duration_ms: 28.8332
  type: 'test'
  ...
# Subtest: database hash tampering throws, freezes writes and does not fake repair
ok 13 - database hash tampering throws, freezes writes and does not fake repair
  ---
  duration_ms: 20.3108
  type: 'test'
  ...
# Subtest: 32 MiB randomized artifact roundtrip streams with real backpressure and two hashes
ok 14 - 32 MiB randomized artifact roundtrip streams with real backpressure and two hashes
  ---
  duration_ms: 258.1689
  type: 'test'
  ...
# Subtest: cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected
ok 15 - cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected
  ---
  duration_ms: 28.8291
  type: 'test'
  ...
# Subtest: early artifact iterator return is not verification; full corrupted stream fails closed
ok 16 - early artifact iterator return is not verification; full corrupted stream fails closed
  ---
  duration_ms: 37.2112
  type: 'test'
  ...
# Subtest: concurrent artifact admission is bounded and rejects a third stream without queueing
ok 17 - concurrent artifact admission is bounded and rejects a third stream without queueing
  ---
  duration_ms: 19.8145
  type: 'test'
  ...
# Subtest: abort races a permanently pending source.next without retaining Store writers or accepting late bytes
ok 18 - abort races a permanently pending source.next without retaining Store writers or accepting late bytes
  ---
  duration_ms: 18.8361
  type: 'test'
  ...
# Subtest: concurrent close calls share the real drain and lock-release promise
ok 19 - concurrent close calls share the real drain and lock-release promise
  ---
  duration_ms: 18.353
  type: 'test'
  ...
# Subtest: sealed segments are compressed, chained and verified; stored bit flip is detected
ok 20 - sealed segments are compressed, chained and verified; stored bit flip is detected
  ---
  duration_ms: 96.8435
  type: 'test'
  ...
# Subtest: process-killed partial artifact remains retained without a complete object reference
ok 21 - process-killed partial artifact remains retained without a complete object reference
  ---
  duration_ms: 169.3929
  type: 'test'
  ...
1..21
# tests 21
# suites 0
# pass 21
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2027.7284
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/snapshot.json

类别：`original_runtime_evidence_or_index`；原始字节数：1981。

源文件 SHA256：

```text
de341a5e63ed863bed6e9d19f8467bc1f3f9271cf90a2b551e9bb981fcfe13bc
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0082","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/snapshot.json","bytes":1981,"sha256":"de341a5e63ed863bed6e9d19f8467bc1f3f9271cf90a2b551e9bb981fcfe13bc","language":"json","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/snapshot.json"}} -->
```json
{
  "schema": "agentnexus/storage-snapshot/1",
  "version": "v1",
  "files": [
    {
      "source": "src/agentnexus/storage.ts",
      "snapshot": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/storage.ts",
      "bytes": 31836,
      "sha256": "7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb"
    },
    {
      "source": "src/agentnexus/artifacts.ts",
      "snapshot": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/artifacts.ts",
      "bytes": 12687,
      "sha256": "4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427"
    },
    {
      "source": "src/agentnexus/records.ts",
      "snapshot": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/records.ts",
      "bytes": 6510,
      "sha256": "393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800"
    },
    {
      "source": "tests/agentnexus/storage.test.ts",
      "snapshot": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/storage.test.ts",
      "bytes": 21732,
      "sha256": "e0f269cd0b73b5d70f5e5d91e8e57c9de905a182e81aaf31db6e7c736e95f923"
    },
    {
      "source": "tests/agentnexus/owned-storage-child.mjs",
      "snapshot": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/owned-storage-child.mjs",
      "bytes": 1885,
      "sha256": "7a469bfa662d98f39f06b4483eaa1f49809e490817679cce5f7f1fa366133139"
    },
    {
      "source": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/verification.json",
      "snapshot": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/verification.json",
      "bytes": 5225,
      "sha256": "4a568ab6b447605e354694025165cdc65dc1de8fa061f8b6c61509b236af909d"
    },
    {
      "source": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap",
      "snapshot": ".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap",
      "bytes": 4177,
      "sha256": "1a82c98c3558c7165b5a7691900d7b9b10e5b42969959a0db45507d94ac0ac77"
    }
  ]
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap

类别：`original_runtime_evidence_or_index`；原始字节数：4177。

源文件 SHA256：

```text
1a82c98c3558c7165b5a7691900d7b9b10e5b42969959a0db45507d94ac0ac77
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0083","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap","bytes":4177,"sha256":"1a82c98c3558c7165b5a7691900d7b9b10e5b42969959a0db45507d94ac0ac77","language":"text","fence":"```","wrapper_padding_newline":false,"category":"original_runtime_evidence_or_index","kind":"original","origin":{"kind":"zip","archive":"deliverables/AgentNexus_M1_Audit_Split/03_Runtime_Evidence.zip","member":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap"}} -->
```text
TAP version 13
# Subtest: real SQLite, three independent domain chains and global pagination
ok 1 - real SQLite, three independent domain chains and global pagination
  ---
  duration_ms: 104.0128
  type: 'test'
  ...
# Subtest: synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault
ok 2 - synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault
  ---
  duration_ms: 28.4037
  type: 'test'
  ...
# Subtest: required fields, malformed refs, oversized envelopes and query budgets reject without fault
ok 3 - required fields, malformed refs, oversized envelopes and query budgets reject without fault
  ---
  duration_ms: 23.0751
  type: 'test'
  ...
# Subtest: outbox high water rejects new records, then drains without unbounded queues
ok 4 - outbox high water rejects new records, then drains without unbounded queues
  ---
  duration_ms: 36.5349
  type: 'test'
  ...
# Subtest: second writer and live lock recovery are blocked; real owner death is explicit
ok 5 - second writer and live lock recovery are blocked; real owner death is explicit
  ---
  duration_ms: 238.2662
  type: 'test'
  ...
# Subtest: process crash after file fsync and before receipt reexports no duplicate
ok 6 - process crash after file fsync and before receipt reexports no duplicate
  ---
  duration_ms: 216.7749
  type: 'test'
  ...
# Subtest: unacknowledged crash tail is preserved then repaired from durable outbox
ok 7 - unacknowledged crash tail is preserved then repaired from durable outbox
  ---
  duration_ms: 452.0618
  type: 'test'
  ...
# Subtest: actual export I/O failure freezes writes and preserves outbox until explicit recovery
ok 8 - actual export I/O failure freezes writes and preserves outbox until explicit recovery
  ---
  duration_ms: 30.6218
  type: 'test'
  ...
# Subtest: acknowledged truncation is never silently discarded or rebuilt as success
ok 9 - acknowledged truncation is never silently discarded or rebuilt as success
  ---
  duration_ms: 19.7031
  type: 'test'
  ...
# Subtest: actual artifact publication I/O failure retains bytes and freezes both record and object admission
ok 10 - actual artifact publication I/O failure retains bytes and freezes both record and object admission
  ---
  duration_ms: 25.546
  type: 'test'
  ...
# Subtest: database hash tampering throws, freezes writes and does not fake repair
ok 11 - database hash tampering throws, freezes writes and does not fake repair
  ---
  duration_ms: 19.0584
  type: 'test'
  ...
# Subtest: 32 MiB randomized artifact roundtrip streams with real backpressure and two hashes
ok 12 - 32 MiB randomized artifact roundtrip streams with real backpressure and two hashes
  ---
  duration_ms: 270.2028
  type: 'test'
  ...
# Subtest: cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected
ok 13 - cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected
  ---
  duration_ms: 32.9337
  type: 'test'
  ...
# Subtest: early artifact iterator return is not verification; full corrupted stream fails closed
ok 14 - early artifact iterator return is not verification; full corrupted stream fails closed
  ---
  duration_ms: 36.0803
  type: 'test'
  ...
# Subtest: concurrent artifact admission is bounded and rejects a third stream without queueing
ok 15 - concurrent artifact admission is bounded and rejects a third stream without queueing
  ---
  duration_ms: 20.2566
  type: 'test'
  ...
# Subtest: sealed segments are compressed, chained and verified; stored bit flip is detected
ok 16 - sealed segments are compressed, chained and verified; stored bit flip is detected
  ---
  duration_ms: 103.4877
  type: 'test'
  ...
# Subtest: process-killed partial artifact remains retained without a complete object reference
ok 17 - process-killed partial artifact remains retained without a complete object reference
  ---
  duration_ms: 170.4636
  type: 'test'
  ...
1..17
# tests 17
# suites 0
# pass 17
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2023.9801
```
<!-- agentnexus-export-end -->

