from pathlib import Path
import json
p=Path('I:/AI_AgentNexus/deliverables/AgentNexus-M1.5/source/config/agentnexus/features.json')
d=json.loads(p.read_text('utf-8'))
items=[('runtime.bootstrap.host',['runtime.host.production']),('runtime.bootstrap.worker',['runtime.worker.production','runtime.bootstrap.host']),('runtime.ipc.persistent',['runtime.ipc.windows.production']),('runtime.exit_closure',['runtime.exit_proof.production']),('runtime.ubuntu.adapter',['core.identity','core.audit.trail'])]
for name,deps in items:
    assert not any(f['id']==name for f in d['features'])
    d['features'].append({'id':name,'kind':'OPTIONAL','default':'OFF','scopes':['G'],'depends_on':deps,'conflicts':[], 'version':'0.4.0-m1.5','implementation_status':'CANDIDATE_DEPLOYMENT_BLOCKED' if 'ubuntu' not in name else 'TECHNICAL_PREPARATION_NOT_RUN','risk':'L0 execution trust boundary; OS deployment and qualification separately required','off_behavior':'Reject protected work, revoke the control session, request termination and retain unknown resources. No direct execution fallback.','degradation':'DENY/BLOCKED; disabling protection never grants its capability','recovery':'Fresh attested boot/peer/session and signed exact permit; reconcile historical resources without replay','tests':['M15-BOOTSTRAP','M15-IPC','M15-CLOSURE','M15-CATALOG']})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Added 5 default-OFF M1.5 Feature definitions; retained all prior objects')
