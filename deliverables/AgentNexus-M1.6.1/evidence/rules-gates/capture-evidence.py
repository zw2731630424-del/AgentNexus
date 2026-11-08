"""Bounded metadata-only evidence index. Reads only explicitly listed historical inputs and this release source/log files."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
RELEASE = OUT.parents[1]

def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as handle:
        while chunk := handle.read(65536):
            value.update(chunk)
    return value.hexdigest()

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

full = [
    'AGENTS.md', 'ai-workflow-kit-v4/project-workflows/README.md', '.workflow-kit/governance/policy.json',
    'deliverables/AgentNexus-M1.6.1/original-request.txt',
    *['deliverables/AgentNexus-M1.6/' + name for name in ['README.md','acceptance-report.md','independent-code-review.md','architecture.md','workflow-runtime.md','feature-catalog.md','policy-catalog.md','adr.md','issue-ledger.json','context-model-messaging.md','internal-protocols.md']],
    *['deliverables/AgentNexus-M1.6/source/src/agentnexus/' + name for name in ['harness/state.ts','harness/contracts.ts','harness/workflow.ts','artifacts.ts','storage.ts','features.ts','harness/index.ts','types.ts','records.ts','policy-contracts.ts']],
    *['deliverables/AgentNexus-M1.6/source/' + name for name in ['package.json','tsconfig.json','tools/agentnexus/typecheck-m15.mjs','tools/agentnexus/run-tests.mjs']],
    *['deliverables/AgentNexus-' + release + '/adr.md' for release in ['M1.3','M1.4','M1.5','M1.5.1']],
    'deliverables/AgentNexus-M1.2/issue-ledger.json', 'deliverables/AgentNexus-M1.5.1/issue-ledger.json',
    '.workflow-kit/tasks/AgentNexus-v0.4-M0/architecture/internal_protocols.md',
    *['.workflow-kit/tasks/AgentNexus-v0.4-M0/architecture/adr/' + name for name in ['001-native-boundaries.md','002-stack-storage.md','003-workflow-native.md','004-policy-degradation.md','005-archive-context.md']],
    *['.workflow-kit/tasks/AgentNexus-v0.4-M0.1/architecture/adr/' + name for name in ['006-audit-evidence-domains.md','007-diagnostics-and-execution.md','008-m1-admission.md','009-m1-local-kernel.md']],
]
partial = {
    'ai-workflow-kit-v4/tools/govern.py': 'lines 1-100, 743-810; targeted new/category/rules search',
    'deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/scheduler.ts': 'lines 1-85 and targeted Task/rule/epoch/Gate searches',
    'deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/context.ts': 'lines 1-90',
    'deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/agents.ts': 'lines 1-105',
    'deliverables/AgentNexus-M1.6/source/src/agentnexus/host.ts': 'lines 1-85',
    'deliverables/AgentNexus-M1.6/source/src/agentnexus/control.ts': 'lines 1-110',
    'deliverables/AgentNexus-M1.6/source/tests/agentnexus/m16-harness.test.ts': 'fixture lines 1-36; workflow/gate tests lines 141-157, 209-221, 276-291; targeted full-file test names and workflow searches',
    '.workflow-kit/tasks/AgentNexus-v0.4-M0/architecture/workflow_kit_mapping.md': 'lines 1-100',
    'deliverables/AgentNexus_M1_Text_Review/AgentNexus_M1_Source_Index.md': 'targeted ADR/decision/rule/gate searches',
    'deliverables/AgentNexus_M1_Text_Review/AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md': 'targeted ADR/decision/rule/gate searches',
    'deliverables/AgentNexus-M1.6/evidence/components/read-manifest.json': 'targeted M0 ADR/source reference search',
    'deliverables/AgentNexus-M1.6/phase0-report.md': 'targeted M0 ADR/source reference search',
    'README.md': 'targeted historical M0/M1 routes',
    'deliverables/AgentNexus-M1.6.1/source/config/agentnexus/features.json': 'native.rules-compiler/native.gate-engine complete definitions; static runtime parsers read full JSON',
    'deliverables/AgentNexus-M1.6.1/source/config/agentnexus/policies.json': 'm161_enforcement_bindings section',
    'deliverables/AgentNexus-M1.6.1/source/src/agentnexus/harness/scheduler.ts': 'shared gate/rules interfaces, admission/turn fences, gate bind and migration/handoff sections',
    'deliverables/AgentNexus-M1.6.1/source/src/agentnexus/harness/index.ts': 'shared compiler/engine initialization, project rules update and admin/facade routes',
}
reads = []
for name in full + list(partial):
    path = ROOT / name
    reads.append({'path': str(path), 'sha256_at_capture': digest(path), 'bytes': path.stat().st_size,
                  'coverage': partial.get(name, 'full-file read by tool; tool presentation may have truncated long combined output'),
                  'historical_input_unchanged': '/AgentNexus-M1.6.1/' not in name})
write(OUT / 'read-manifest.json', {'schema':'agentnexus/m161/rules-gates/read-manifest/1', 'generated_at':datetime.now(timezone.utc).isoformat(),
    'project_rules_readme_present':(ROOT/'project-rules/README.md').exists(), 'notes':['SHA256 capture time is explicit. Frozen historical inputs are preserved by the parent baseline manifest.', 'No key files, real provider data or unrelated research files were read.', 'Search results used only as navigation do not imply complete content reading.'], 'files':reads})

for run in sorted((OUT/'runs').iterdir()):
    tap = run/'tests.tap'
    if not tap.exists():
        continue
    body = tap.read_text(encoding='utf-8-sig')
    entries = [{'number':int(number), 'status':'PASS' if status=='ok' else 'FAIL', 'name':name} for status,number,name in re.findall(r'^(ok|not ok) (\d+) - (.+)$',body,re.M)]
    counters = {name:int(value) for name,value in re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$',body,re.M)}
    write(run/'results.json', {'schema':'agentnexus/m161/rules-gates/tap-derived/1', 'source_tap':str(tap), 'source_sha256':digest(tap),
        'assurance':'REAL_LOCAL_SQLITE_ZSTD_ARTIFACT_AND_TRUSTED_LIBRARY; synthetic task/reviewer/human fixtures; no OS/provider qualification', 'counters':counters, 'tests':entries})

owned = [RELEASE/'source/src/agentnexus/harness/rules.ts', RELEASE/'source/src/agentnexus/harness/gates.ts', RELEASE/'source/tests/agentnexus/m161-rules.test.ts', RELEASE/'source/tests/agentnexus/m161-gates.test.ts']
write(OUT/'owned-source-sha256.json', {'schema':'agentnexus/m161/rules-gates/owned-source/1', 'files':[{'path':str(p), 'bytes':p.stat().st_size, 'sha256':digest(p)} for p in owned]})
print(json.dumps({'read_files':len(reads),'owned_files':len(owned),'tap_runs':len(list((OUT/'runs').glob('*/tests.tap')))},ensure_ascii=False))
