import json,pathlib
root=pathlib.Path(__file__).resolve().parents[3]/'deliverables/AgentNexus-M1.4/source'
p=root/'config/agentnexus/features.json';data=json.loads(p.read_text('utf-8'))
deps={
 'runtime.host.production':['core.identity','core.state','core.audit.trail'],
 'runtime.worker.production':['runtime.host.production'],
 'runtime.ipc.windows.production':['runtime.host.production'],
 'runtime.sandbox.windows.production':['runtime.worker.production'],
 'runtime.file_broker':['runtime.host.production','audit.producer.file'],
 'runtime.process_supervisor':['runtime.worker.production','audit.producer.process'],
 'runtime.exit_proof.production':['runtime.process_supervisor'],
 'runtime.resource_release.production':['runtime.exit_proof.production'],
 'audit.producer.broker':['core.audit.trail'],
 'audit.producer.file':['core.audit.trail'],
 'audit.producer.process':['core.audit.trail'],
 'runtime.broker.production':['runtime.worker.production','runtime.ipc.windows.production','runtime.sandbox.windows.production','runtime.file_broker','runtime.process_supervisor','runtime.exit_proof.production','runtime.resource_release.production','audit.producer.broker'],
}
existing={f['id'] for f in data['features']}
assert set(deps)&existing=={'audit.producer.process'}
for name,requires in deps.items():
 if name in existing: continue
 data['features'].append({'id':name,'kind':'OPTIONAL','default':'OFF','scopes':['G'],'depends_on':requires,'conflicts':[],'version':'0.4.0-m1.4','implementation_status':'CANDIDATE_COMBINATION_DEPLOYMENT_BLOCKED','off_behavior':'Reject new protected work; revoke active authorization; terminate owned work and retain uncertain resources. Never expose direct spawn, shell or Host database.','degradation':'BLOCKED; no weaker identity, IPC, sandbox, file or release fallback','recovery':'Trusted bootstrap; exact OS/SID/helper/tool/profile qualification; fresh boot and grant; reconcile old claims without replay','tests':['M14-PERMIT','M14-IPC','M14-SANDBOX','M14-FILE','M14-EXIT','M14-RECOVERY','M14-AUDIT']})
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
p=root/'config/agentnexus/policies.json';data=json.loads(p.read_text('utf-8'))
for name,owner in [('P.REMOTE_PERMIT','Production Execution Broker'),('P.FILE_BROKER','File Broker'),('P.PRODUCTION_QUALIFICATION','Deployment Qualification Owner')]:
 data['policies'].append({'id':name,'level':'L0','degradable':False,'enforcement_owner':owner,'default_mode':'ENFORCE','version':'0.4.0-m1.4','scope':'runtime/operation/resource/profile','modes':{mode:'Independent owner always enforces. Missing verified implementation or exact evidence DENY/BLOCKED.' for mode in ['ENFORCE','AUDIT_ONLY','DISABLED']},'failure':'DENY/BLOCKED; retain consumed authorization and UNKNOWN resources','implementation_status':'CANDIDATE_DEPLOYMENT_BLOCKED','test_ids':['M14-PERMIT','M14-FILE','M14-EXIT','M14-FEATURE']})
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
p=root/'package.json';data=json.loads(p.read_text('utf-8'));data['version']='0.4.0-m1.4';data['scripts']['verify:m14']='node tools/agentnexus/verify-m14.mjs';p.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8',newline='\n')
print('Added 11 Feature / 3 non-degradable Policy entries; reused existing audit.producer.process in M1.4 only')
