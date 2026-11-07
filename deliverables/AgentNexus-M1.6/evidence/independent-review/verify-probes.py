"""Check captured observations from genuine product probes; never substitutes for running them."""
from pathlib import Path
import argparse, datetime, hashlib, json, sys

HERE=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--label',default='final');args=parser.parse_args()
paths=[HERE/f'probe-results-{args.label}.json',HERE/f'admission-results-{args.label}.json',HERE/f'workflow-results-{args.label}.json',HERE/f'disk-capture-results-{args.label}.json']
observed={}
for path in paths:
    data=json.loads(path.read_text(encoding='utf-8'))
    for row in data.get('results',[data]):observed[row['name']]=row

checks={
 'role-off-existing-agent':lambda r:r['feature_effective'] is False and r['state'] in ['FAILED','BLOCKED','PAUSED'] and r['model_requests']==0,
 'mock-provider-off':lambda r:r['feature_effective'] is False and r['state'] in ['FAILED','BLOCKED','PAUSED'] and r['model_requests']==0,
 'cancel-before-approved-pending-tool':lambda r:r['write_calls']==0 and r['final_state']=='CANCELLED',
 'project-pause-concurrent-admission':lambda r:r['entered_b_while_pausing'] is False and r['pause_ack']['project_state']=='PAUSED' and r['model_requests_after_pause']==0,
 'restart-approved-pending-tool':lambda r:r['after_reopen']['pending_approval'] is None and r['after_reopen']['write_calls']==0 and r['reapprove_error'] is None and r['new_approval']!=r['old_approval'] and r['write_calls']==1 and r['final_state']=='UNKNOWN_QUARANTINED',
 'cancel-resource-wait-actual':lambda r:r['waiter_state']=='CANCELLED' and r['pending_waiters']==0 and r['models_for_waiter']==0,
 'agent-type-registry-off':lambda r:r['feature_enabled'] is False and bool(r['creation_error']) and r['models']==0,
 'cancel-model-before-fixture-dispatch':lambda r:r['sequence_at_cancel']==0 and r['sequence_after_cancel']==0 and r['model_tokens_spent']==0 and r['task_state']=='CANCELLED',
 'subagent-shares-parent-task':lambda r:r['child_created'] is False and bool(r['creation_error']),
 'sendText-logical-dedupe-after-reopen':lambda r:r['duplicate_message_id']==r['first_message_id'] and r['error'] is None and r['message_records']==1 and r['text_drafts']==1,
 'budget-feature-off-host-reopen':lambda r:r['harness_reopened'] is True and r['reopen_error'] is None,
 'audit-claimed-flush-failure-zero-write':lambda r:r['injected'] is True and r['write_calls']==0 and r['file_exists'] is False and r['task_state'] in ['FAILED','UNKNOWN_QUARANTINED'] and all(x['executor_state']=='NOT_INVOKED' for x in r['gateway_operations']),
 'persistent-disk-after-task-release':lambda r:r['state']=='UNKNOWN_QUARANTINED' and r['write_calls']==1 and r['persistent_bytes']==100 and r['platform_disk_held']>=100 and any(x['state']=='UNKNOWN_QUARANTINED' and x['disk']==100 for x in r['reservations']),
 'gate-off-during-evidence-verification':lambda r:r['feature_effective'] is False and r['record_status']=='BYPASSED' and r['record_feature_enabled'] is False,
 'persistent-write-capture-limit-retains-claims':lambda r:r['result']['write_calls']==1 and r['result']['persistent_file_bytes']==100 and r['result']['task_state']=='UNKNOWN_QUARANTINED' and r['result']['platform_disk_held']>=100 and r['result']['platform_workers_held']==1 and all(x['state']=='SUCCEEDED' and x['executor_state']=='SETTLED' for x in r['result']['gateway_operations']),
}
results=[]
for name,check in checks.items():
    row=observed.get(name)
    try:ok=bool(row is not None and 'probe_error' not in row and 'precondition_failed' not in row and check(row));error=None
    except Exception as e:ok=False;error=str(e)
    results.append({'name':name,'status':'PASS' if ok else 'FAIL','observation':row,'verification_error':error})
out={'schema':'agentnexus/independent-review/probe-verification/1.6','observed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
     'assurance':'ACTUAL_PRODUCT_MODULES_AND_SQLITE; SIMULATED_MODEL_AND_AUDIT_FAILURE; NO_OS_QUALIFICATION',
     'inputs':[{'path':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths],
     'total':len(results),'pass':sum(x['status']=='PASS' for x in results),'fail':sum(x['status']=='FAIL' for x in results),'checks':results}
(HERE/f'probe-verification-{args.label}.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:out[k] for k in ['total','pass','fail']}))
for r in results:
    if r['status']=='FAIL':print(json.dumps(r,ensure_ascii=False))
sys.exit(0 if out['fail']==0 else 1)
