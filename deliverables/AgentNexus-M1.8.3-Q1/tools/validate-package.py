"""Validate review artifacts and mappings without performing system changes."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import runpy

m=runpy.run_path(str(Path(__file__).resolve().parent/'prepare-package.py'))
q=m['Q'];load=m['load'];write=m['write'];digest=m['digest'];walk=m['walk']
errors=[];json_files=[];links=[]
for p in walk(q,{'__pycache__'}):
    if p.suffix=='.json':
        try:load(p);json_files.append(p.relative_to(q).as_posix())
        except Exception as e:errors.append('INVALID_JSON: '+str(p)+': '+str(e))
    if p.suffix=='.md':
        for target in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
            if '://' in target or target.startswith('#'):continue
            dest=(p.parent/target.split('#',1)[0]).resolve()
            links.append({'from':p.relative_to(q).as_posix(),'target':target,'exists':dest.is_file()})
            if not dest.is_file():errors.append('MISSING_LINK: '+str(p)+': '+target)
plan=load(q/'deployment-plan.json');accept=load(q/'acceptance.json')
if plan['scope']!='QUALIFICATION_ONLY' or plan['executable_system_change_set'] or plan['deployment_approved'] or plan['installation_authorized'] or plan['start_authorized']:errors.append('APPROVAL_GATE_BREACH')
if any(accept[k]!=0 for k in ['real_api_keys','real_provider_requests','real_tokens','real_cost_usd','q1_os_tests_executed']):errors.append('UNEXPECTED_EXECUTION')
if plan['budget']['inherited_authorization_tokens']!=100000000 or plan['budget']['new_real_authorization']!=0:errors.append('BUDGET_CHANGED')
cfg=load(q/'approval/service-config.candidate.json')
if cfg['real_import_enabled'] or cfg['live_enabled'] or cfg['authority_certificate_sha256'] is not None or cfg['qualification_test_approval_ref']:errors.append('UNAPPROVED_CONFIGURATION')
tests=load(q/'tests/windows-attack-tests.json')['rows']
if len(tests)!=32 or len({x['test_id'] for x in tests})!=32:errors.append('OS_MATRIX_COUNT')
for t in tests:
    if t['status']!='NOT_RUN' or t['actual_result'] is not None or t['raw_logs'] or any(t[k] is not None for k in ['actual_process_identity','sid','integrity_level','pid','start_id']):errors.append('FABRICATED_OS_RESULT: '+t['test_id'])
criteria=load(q/'tests/windows-qualification.json')['criteria']
if len(criteria)!=11 or any(t['status']!='NOT_RUN' for t in criteria):errors.append('QUALIFICATION_MATRIX')
manifest=load(q/'approval/installation-manifest.json')
destinations=set()
for f in manifest['files']:
    destination=f['destination'].casefold()
    if destination in destinations or not destination.startswith('c:\\program files\\agentnexus\\'):errors.append('UNSAFE_DESTINATION: '+destination)
    destinations.add(destination)
    if digest(Path(f['source']))!=f['sha256']:errors.append('CANDIDATE_HASH_CHANGED: '+f['source'])
app=load(q/'approval/app-manifest.json')
app_paths={x['path'] for x in app['files']}
if len(app_paths)!=len(app['files']) or any(not x.startswith('app/') or '..' in x.split('/') or ':' in x or '\\' in x for x in app_paths):errors.append('APPLICATION_MANIFEST_PATHS')
if cfg['application_manifest_sha256']!=digest(q/'approval/app-manifest.json'):errors.append('APPLICATION_MANIFEST_BINDING')
if load(q/'evidence/source-verification.json')['status']!='PASS' or load(q/'evidence/m183-published-checksums.json')['status']!='PASS' or load(q/'evidence/build-comparison.stdout.json')['decision']!='PASS':errors.append('BASELINE_VERIFICATION')
if load(q/'evidence/historical-preservation.after.json')['status']!='PASS':errors.append('HISTORICAL_PRESERVATION')
if load(q/'evidence/governance-full-root.json')['exit_code']!=0 or load(q/'evidence/governance-delta.json')['status']!='PASS':errors.append('GOVERNANCE_GATE')
if load(q/'evidence/historical-same-sid-fail.json')['historical_result']['status']!='ISOLATION_FAIL':errors.append('HISTORICAL_FAILURE_LOST')
report={'schema':'agentnexus.q1.package-validation.v1','checked_at_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'status':'PASS' if not errors else 'FAIL','errors':errors,'json_files_checked':len(json_files),'local_links_checked':len(links),'candidate_mappings_checked':len(manifest['files']),'os_test_contracts':len(tests),'qualification_criteria':len(criteria),'named_pipe_connected':False,'system_mutations':False,'production_qualification':'BLOCKED','validation_scope':'Artifact structure, local links, exact candidate hashes, preserved baseline and no-execution assertions. Not an OS attack test.','links':links}
write('evidence/package-validation.json',report)
print(json.dumps({k:v for k,v in report.items() if k not in ['links']},ensure_ascii=False))
if errors:raise SystemExit(1)
