import {validateTask} from './model.ts';
import type {Task} from './model.ts';
export function summarize(input:readonly Task[]){
  const tasks=input.map(validateTask),ids=new Set(tasks.map(t=>t.id));if(ids.size!==tasks.length)throw Error('DUPLICATE_ID');
  let estimated=0,spent=0,completed=0;
  for(const task of tasks){estimated+=task.estimate_minutes;spent+=task.spent_minutes;if(task.status==='done')completed+=task.estimate_minutes;}
  if(!Number.isSafeInteger(estimated)||!Number.isSafeInteger(spent))throw Error('TOTAL_OVERFLOW');
  const completion_percent=estimated===0?0:100*completed/estimated;
  return {count:tasks.length,todo:tasks.filter(t=>t.status==='todo').length,doing:tasks.filter(t=>t.status==='doing').length,done:tasks.filter(t=>t.status==='done').length,estimated_minutes:estimated,spent_minutes:spent,completion_percent};
}
