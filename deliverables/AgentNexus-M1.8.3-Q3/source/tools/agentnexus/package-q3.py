"""Stage an auditable payload only. Never installs, signs, resets a ledger or starts anything."""
import hashlib, json, shutil, zipfile
from pathlib import Path

source = Path(__file__).resolve().parents[2]
bundle = source.parent
workspace = bundle.parent.parent
runtime = workspace / '.workflow-kit/runtime/AgentNexus-M1.8.3-Q3'
payload = bundle / 'payload'
approval = bundle / 'approval'

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
def copy(src, dest):
    assert src.is_file() and not src.is_symlink(), str(src)
    dest.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(src, dest)

assert not payload.exists(), 'Refuse to overwrite a staged payload; review and explicitly select a new bundle instead.'
payload.mkdir(); approval.mkdir(exist_ok=True)
for name in ['AgentNexusCredential.exe', 'pipe-client.exe', 'trusted-credential-helper.exe']:
    copy(runtime / 'native' / name, payload / name)
copy(runtime / 'native-launcher/credential-launcher.exe', payload / 'credential-launcher.exe')
copy(Path('D:/Nodejs/node.exe'), payload / 'node.exe')
shutil.copytree(source / 'dist', payload / 'app/dist')
shutil.copytree(source / 'desktop', payload / 'app/desktop')
shutil.copytree(workspace / 'deliverables/AgentNexus-Model-Provider-UI/source/node_modules/electron/dist', payload / 'app/runtime')
write(payload / 'app/package.json', {'name': 'agentnexus', 'version': '0.4.0-m1.8.3-q3', 'private': True, 'type': 'module', 'main': 'desktop/main.mjs'})
for name in ['LICENSE', 'LICENSE.txt']:
    if Path('D:/Nodejs', name).is_file(): copy(Path('D:/Nodejs', name), payload / 'licenses/node-LICENSE.txt'); break
else:
    copy(source / 'assets/licenses/node-v24.15.0-LICENSE.txt', payload / 'licenses/node-LICENSE.txt')

app_files = [{'path': p.relative_to(payload).as_posix(), 'sha256': sha(p)} for p in sorted((payload/'app').rglob('*')) if p.is_file()]
write(payload / 'app-manifest.json', {'schema': 'agentnexus.application-manifest.v1', 'files': app_files})
historical_plan = json.loads((workspace/'deliverables/AgentNexus-M1.8.3-Q1/deployment-plan.json').read_text(encoding='utf-8'))
operator_sid = 'S-1-5-21-2532670394-1554971530-4095700938-1001'
service_sid = historical_plan['service']['precomputed_sid']
machine_id = historical_plan['machine_id_sha256']
mapping = {'service_sha256': 'AgentNexusCredential.exe', 'client_sha256': 'pipe-client.exe', 'helper_sha256': 'trusted-credential-helper.exe', 'launcher_sha256': 'credential-launcher.exe', 'node_sha256': 'node.exe', 'engine_sha256': 'app/dist/src/agentnexus/credential-service/engine.js', 'application_manifest_sha256': 'app-manifest.json'}
hashes = {key: sha(payload/relative) for key, relative in mapping.items()}
config = json.loads((source/'native/credential-service/service-config.template.json').read_text(encoding='utf-8'))
config.update(hashes); config.update(operator_sid=operator_sid, policy_epoch=3)
write(approval/'candidate/service-config.json', config)
qualification = json.loads((source/'native/credential-service/qualification.template.json').read_text(encoding='utf-8'))
qualification.update(hashes); qualification.update(machine_id=machine_id, service_sid=service_sid, policy_epoch=3)
write(approval/'candidate/qualification.json', qualification)
launch = json.loads((source/'native/credential-launcher/launcher-plan.template.json').read_text(encoding='utf-8'))
launch.update(machine_id=machine_id, operator_sid=operator_sid, policy_epoch=3, helper_sha256=hashes['helper_sha256'], launcher_sha256=hashes['launcher_sha256'])
write(payload/'launcher-plan.json', launch)
files = [{'path': p.relative_to(payload).as_posix(), 'target': 'C:/Program Files/AgentNexus/'+p.relative_to(payload).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted(payload.rglob('*')) if p.is_file()]
manifest = {'schema': 'agentnexus.q3.installation-manifest.v1', 'complete_payload_staged': True, 'deployment_approved': False, 'scope': 'QUALIFICATION_ONLY', 'node_version': '24.15.0', 'electron_version': '45.2.3', 'files': files,
    'start': {'desktop': {'executable': 'C:/Program Files/AgentNexus/app/runtime/electron.exe', 'arguments': ['C:/Program Files/AgentNexus/app'], 'integrity': 'MEDIUM', 'uac': False}, 'service': {'executable': 'C:/Program Files/AgentNexus/AgentNexusCredential.exe', 'arguments': [], 'identity': 'NT SERVICE\\AgentNexusCredential', 'session': 0}, 'runtime': {'executable': 'C:/Program Files/AgentNexus/AgentNexusCredential.exe', 'arguments': ['--daily-runtime'], 'caller': 'SERVICE_ONLY_PRIVATE_INHERITED_HANDLES'}, 'daily_client': {'executable': 'C:/Program Files/AgentNexus/pipe-client.exe', 'arguments': ['--daily', '--stdio'], 'uac': False}},
    'not_in_production_payload': ['synthetic-credential-ui.exe', 'synthetic-ui-driver.exe', 'private keys', 'real API keys', 'test databases'], 'production_qualified': False}
write(approval/'installation-manifest.json', manifest)
write(approval/'deployment-approval.UNSIGNED.json', {'schema': 'agentnexus.q3.deployment-approval.v1', 'scope': 'QUALIFICATION_ONLY', 'deployment_approved': False, 'start_service': False, 'approval_ref': '', 'expires_at_utc': '1970-01-01T00:00:00Z', 'installation_manifest_sha256': sha(approval/'installation-manifest.json'), 'service_config_sha256': sha(approval/'candidate/service-config.json'), 'qualification_sha256': sha(approval/'candidate/qualification.json'), 'operator_sid': operator_sid, 'service_sid': service_sid, 'machine_id': machine_id, 'real_import_enabled': False, 'live_enabled': False})
write(approval/'payload-summary.json', {'files': len(files), 'bytes': sum(f['bytes'] for f in files), 'hashes': hashes, 'machine_and_service_sid_origin': 'Q1 frozen host plan; native deploy-time revalidation required', 'native_binaries_signed_here': False, 'authority_pin': 'EXTERNAL_APPROVAL_REQUIRED', 'installation_executed': False})
rows=[]
with zipfile.ZipFile(bundle/'AgentNexus-M1.8.3-Q3-source.zip', 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for p in sorted(source.rglob('*')):
        if p.is_file() and not any(part in {'dist','node_modules','raw','__pycache__'} for part in p.relative_to(source).parts):
            rel=p.relative_to(source).as_posix(); rows.append({'path':rel,'bytes':p.stat().st_size,'sha256':sha(p)}); archive.write(p,rel)
write(bundle/'source-manifest.json', {'schema': 'agentnexus.q3.source-manifest.v1', 'files': rows, 'collection_sha256': hashlib.sha256(json.dumps(rows,sort_keys=True,separators=(',',':')).encode()).hexdigest()})
print(json.dumps({'payload_files':len(files),'payload_bytes':sum(f['bytes'] for f in files),'source_files':len(rows),'deployment_executed':False}))
