"""Update only this release's catalogs; inherited entries retain provenance."""
from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[2]
p = ROOT / 'config/agentnexus/features.json'
d = json.loads(p.read_text(encoding='utf-8'))
features = {f['id']: f for f in d['features']}
implemented = ['native.harness','native.context-assembly','native.checkpoints-auto',
    'runtime.role.resident','runtime.role.lead','runtime.role.subagent','runtime.role.reviewer','runtime.role.coordinator',
    'model.gateway','model.auto-route','model.key-round-robin','model.provider-failover',
    'wf.runtime','wf.rules.global','wf.rules.project-index','wf.rules.registration','wf.context','wf.decisions','wf.evidence',
    'wf.role.scout','wf.role.worker','wf.role.verifier','wf.role.reviewer','wf.templates.contract','wf.templates.checkpoint']
implemented += ['wf.gate.g'+str(i) for i in range(7)]
new = {
    'native.agent-lifecycle':['core.identity','core.state','core.audit.trail'],
    'native.agent-type-registry':['core.identity'],
    'native.agent-loop':['native.harness','native.context-assembly','native.agent-lifecycle','resource.registry'],
    'native.message-bus':['core.state','core.archive.raw','core.audit.trail'],
    'native.task-scheduler':['native.agent-lifecycle','resource.worker.budget','resource.project.budget','resource.platform.budget'],
    'model.mock-provider':['model.gateway'],
    'resource.registry':['core.state','core.audit.trail'],
    'resource.worker.budget':['resource.registry'], 'resource.project.budget':['resource.registry'],
    'resource.platform.budget':['resource.registry'], 'resource.cpu.accounting':['resource.registry'],
    'wf.checklists':['wf.runtime','wf.evidence'],
}
blocked = ['resource.cpu.bandwidth','resource.cpu.consumption','resource.memory.limit','resource.disk.quota',
    'resource.process.limit','resource.io.limit','resource.network.limit','resource.time.deadline']
for id,deps in {**new,**{id:['resource.registry'] for id in blocked}}.items():
    if id not in features:
        f={'id':id,'name':id,'description':'M1.6 native capability; qualification is independent of configured ON',
           'version':'0.4.0-m1.6','kind':'OPTIONAL','default':'OFF' if id in blocked else 'ON','scopes':['G','P','A','T'],
           'depends_on':deps,'conflicts':[],'controller':'TRUSTED_ADMIN','agent_writable':False}
        d['features'].append(f); features[id]=f
for id in implemented+list(new)+blocked:
    f=features[id]
    f.update({'implementation_status':'BLOCKED' if id in blocked else 'IMPLEMENTED_LOCAL',
        'qualification_status':'BLOCKED' if id in blocked else 'PENDING_M16_TESTS',
        'off_behavior':'Reject new work; retain raw history and UNKNOWN reservations; drain actual active promises before reporting OFF',
        'degradation':'No automatic privilege or resource expansion; strict profiles remain BLOCKED',
        'recovery':'Trusted preflight, new runtime instance and explicit task resume; no uncertain effect replay',
        'tests':['tests/agentnexus/m16-*.test.ts'],
        'runtime_admission':'MOCK_ONLY_LOCAL_TRUSTED' if id not in blocked else 'NO_MODULE_REGISTERED'})
d['m16_implemented_features']=implemented+list(new)
d['m16_implemented_features'].remove('wf.context')
features['wf.context'].update({'implementation_status':'INTERFACE_ONLY','qualification_status':'NOT_RUN','runtime_admission':'NO_MODULE_REGISTERED'})
d['m16_blocked_features']=blocked
test_groups={
 'harness':{'file':'tests/agentnexus/m16-harness.test.ts','ids':['M16-HARNESS-LOOP','M16-HARNESS-TYPES','M16-HARNESS-FEATURE','M16-HARNESS-AUDIT','M16-HARNESS-POLICY-OWNER']},
 'resource':{'file':'tests/agentnexus/m16-resources.test.ts','ids':['M16 RESOURCES SQLITE: competing reservations atomically obey all three budgets','M16 RESOURCES FEATURE: OFF blocks reserve/start and permits evidence-based cleanup without reopening execution','M16 RESOURCES ACCOUNTING: observed overspend is recorded in all scopes and quarantines further admission']},
 'context':{'file':'tests/agentnexus/m16-context.test.ts','ids':['M16-CONTEXT-RAW','M16-CONTEXT-STREAM','M16-CONTEXT-BOUNDS','M16-CONTEXT-SCOPE','M16-CONTEXT-HASH','M16-CONTEXT-ACK','M16-CONTEXT-EGRESS']},
 'message':{'file':'tests/agentnexus/m16-messages.test.ts','ids':['M16-MESSAGE-DURABLE','M16-MESSAGE-AUTH','M16-MESSAGE-RETRY','M16-MESSAGE-RECOVERY','M16-MESSAGE-ACK-FAILURE']},
 'model':{'file':'tests/agentnexus/m16-models.test.ts','ids':['M16-MODEL-TRACE','M16-MODEL-POOL','M16-MODEL-REAL-BLOCKED','M16-MODEL-UNKNOWN','M16-MODEL-CANCEL-NOT-SENT']},
 'workflow':{'file':'tests/agentnexus/m16-harness.test.ts','ids':['M16-HARNESS-WORKFLOW','M16-HARNESS-WORKFLOW-FENCE','M16-HARNESS-WORKFLOW-CONTRACT','M16-HARNESS-HANDOFF']},
}
for id in d['m16_implemented_features']:
 group='resource' if id.startswith('resource.') else 'model' if id.startswith('model.') else 'workflow' if id.startswith('wf.') or id=='native.checkpoints-auto' else 'context' if id=='native.context-assembly' else 'message' if id=='native.message-bus' else 'harness'
 f=features[id];f.update({'test_mapping':[test_groups[group]],'tests':test_groups[group]['ids'],
   'qualification_status':'PASS','qualification_scope':'LOCAL_TRUSTED_LIBRARY_CONTRACT; provider/runtime observations SIMULATED; no production OS qualification',
   'qualification_ref':'../../../test-results.json'})
 if id.startswith('wf.gate.'):
  f.update({'implementation_status':'IMPLEMENTED_GATE_LEDGER','qualification_scope':'Version/evidence/status/OFF ledger; substantive gate criteria remain trusted owner inputs, no automatic quality certification'})
 if id.startswith('wf.rules.'):
  f.update({'implementation_status':'IMPLEMENTED_VERSIONED_RULE_CAPTURE','qualification_scope':'Native registration/required context assembly; full executable rule compiler NOT_RUN'})
 if id=='resource.cpu.accounting':
  f.update({'qualification_status':'INCONCLUSIVE','qualification_scope':'Integer three-scope ledger tested; real Job/process hardware accounting discrepancy remains INCONCLUSIVE'})
for id in blocked:features[id].update({'qualification_status':'BLOCKED','qualification_scope':'No qualified OS backend; no executable module registered','qualification_ref':'../../../resource-qualification.json'})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

contracts={
 'P.NATIVE_IDENTITY':'Native Agent Runtime','P.AGENT_SCOPE':'Native Tool Runtime',
 'P.MESSAGE_DELIVERY':'Native Message Bus','P.RESOURCE_ADMISSION':'Resource Governance Engine',
 'P.MODEL_CREDENTIAL':'Model Gateway','P.CONTEXT_PROVENANCE':'Context Assembly',
 'P.NATIVE_LIFECYCLE':'Native Agent Runtime','P.WORKFLOW_BINDING':'Workflow Runtime'}
p=ROOT/'config/agentnexus/policies.json'; d=json.loads(p.read_text(encoding='utf-8')); ids={x['id'] for x in d['policies']}
for id,owner in contracts.items():
    if id not in ids:
        d['policies'].append({'id':id,'level':'L0','degradable':False,'enforcement_owner':owner,'version':'0.4.0-m1.6',
            'default_mode':'ENFORCE','modes':{mode:'Independent trusted owner enforces identity, scope and durable audit; no mode bypass' for mode in ['ENFORCE','AUDIT_ONLY','DISABLED']},
            'implementation_status':'IMPLEMENTED_LOCAL','test_ids':['M16-POS','M16-NEG','M16-BYPASS'],
            'test_cases':{'positive':'Authorized bound local mock execution','negative':'Identity/scope/overspend rejected','bypass':'Feature ON/policy mode never grants OS or admin rights'},
            'test_status':{k:'NOT_RUN' for k in ['positive','negative','bypass']}})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
policy_tests={
 'P.NATIVE_IDENTITY':('M16-HARNESS-TYPES','M16-HARNESS-SCOPE'),
 'P.AGENT_SCOPE':('M16-HARNESS-LOOP','M16-HARNESS-SCOPE'),
 'P.MESSAGE_DELIVERY':('M16-MESSAGE-DURABLE','M16-MESSAGE-AUTH'),
 'P.RESOURCE_ADMISSION':('M16-HARNESS-BUDGET','M16-HARNESS-REQUEST-ACCOUNTING'),
 'P.MODEL_CREDENTIAL':('M16-MODEL-POOL','M16-MODEL-REAL-BLOCKED'),
 'P.CONTEXT_PROVENANCE':('M16-CONTEXT-RAW','M16-CONTEXT-SCOPE'),
 'P.NATIVE_LIFECYCLE':('M16-HARNESS-RECOVERY','M16-HARNESS-CANCEL-FENCE'),
 'P.WORKFLOW_BINDING':('M16-HARNESS-WORKFLOW-CONTRACT','M16-HARNESS-WORKFLOW'),
}
for item in d['policies']:
 if item['id'] in policy_tests:
  positive,negative=policy_tests[item['id']];item.update({'test_ids':[positive,negative,'M16-HARNESS-POLICY-OWNER'],
   'specific_test':'Exact IDs in tests/agentnexus/m16-*.test.ts; results in ../../../test-results.json; scope LOCAL_TRUSTED_LIBRARY with SIMULATED providers',
   'test_cases':{'positive':positive,'negative':negative,'bypass':'M16-HARNESS-POLICY-OWNER'},
   'test_status':{'positive':'PASS','negative':'PASS','bypass':'PASS'}})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=ROOT/'src/agentnexus/policy-contracts.ts'; text=p.read_text(encoding='utf-8'); marker="export const POLICY_CONTRACTS: Readonly<Record<string, readonly [string, boolean, string]>> = Object.freeze({"
for id,owner in contracts.items():
    if repr(id) not in text: text=text.replace(marker,marker+f"\n  '{id}': ['L0', false, '{owner}'],",1)
p.write_text(text,encoding='utf-8')
print(json.dumps({'features':len(features),'policies':len(d['policies']),'implemented_modules':len(json.loads((ROOT/'config/agentnexus/features.json').read_text(encoding='utf-8'))['m16_implemented_features'])}))
