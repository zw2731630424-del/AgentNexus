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
p=ROOT/'src/agentnexus/policy-contracts.ts'; text=p.read_text(encoding='utf-8'); marker="export const POLICY_CONTRACTS: Readonly<Record<string, readonly [string, boolean, string]>> = Object.freeze({"
for id,owner in contracts.items():
    if repr(id) not in text: text=text.replace(marker,marker+f"\n  '{id}': ['L0', false, '{owner}'],",1)
p.write_text(text,encoding='utf-8')
print(json.dumps({'features':len(features),'policies':len(d['policies']),'implemented_modules':len(implemented)+len(new)}))
