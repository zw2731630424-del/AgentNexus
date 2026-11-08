export type Status = 'todo'|'doing'|'done';
export type Task = {id:string;title:string;status:Status;estimate_minutes:number;spent_minutes:number;version:number};
const exact=(x:object,k:string[])=>Object.keys(x).sort().join(',')===k.sort().join(',');
const number=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
export function validateTask(value:unknown):Task {
  const t=value as Task;
  if(!t||typeof t!=='object'||!exact(t,['id','title','status','estimate_minutes','spent_minutes','version'])||
    typeof t.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(t.id)||typeof t.title!=='string'||!t.title.trim()||t.title.length>200||
    !['todo','doing','done'].includes(t.status)||!number(t.estimate_minutes)||!number(t.spent_minutes)||!number(t.version)||t.version<1)throw Error('INVALID_TASK');
  return {...t};
}
export class TaskBook {
  #tasks=new Map<string,Task>();
  constructor(tasks:unknown[]=[]){if(tasks.length>10000)throw Error('TASK_CAPACITY');for(const item of tasks){const t=validateTask(item);if(this.#tasks.has(t.id))throw Error('DUPLICATE_ID');this.#tasks.set(t.id,t);}}
  static parse(raw:string):TaskBook {if(Buffer.byteLength(raw)>16777216)throw Error('DATA_SIZE_LIMIT');const x=JSON.parse(raw);if(!x||!exact(x,['schema','tasks'])||x.schema!==1||!Array.isArray(x.tasks)||x.tasks.length>10000)throw Error('INVALID_DATA');return new TaskBook(x.tasks);}
  add(id:string,title:string,estimate_minutes:number):Task {if(this.#tasks.has(id))throw Error('DUPLICATE_ID');if(this.#tasks.size>=10000)throw Error('TASK_CAPACITY');const task=validateTask({id,title,status:'todo',estimate_minutes,spent_minutes:0,version:1});this.#tasks.set(id,task);return {...task};}
  #current(id:string,version:number):Task {const task=this.#tasks.get(id);if(!task)throw Error('NOT_FOUND');if(task.version!==version)throw Error('VERSION_CONFLICT');if(task.version===Number.MAX_SAFE_INTEGER)throw Error('VERSION_OVERFLOW');return task;}
  advance(id:string,version:number,status:Status):Task {const old=this.#current(id,version);const transitions={todo:['doing'],doing:['todo','done'],done:['doing']};if(!transitions[old.status].includes(status))throw Error('INVALID_TRANSITION');const next=validateTask({...old,status,version:old.version+1});this.#tasks.set(id,next);return {...next};}
  spend(id:string,version:number,minutes:number):Task {const old=this.#current(id,version);if(!number(minutes)||!number(old.spent_minutes+minutes))throw Error('INVALID_MINUTES');const next={...old,spent_minutes:old.spent_minutes+minutes,version:old.version+1};this.#tasks.set(id,next);return {...next};}
  remove(id:string,version:number):void {this.#current(id,version);this.#tasks.delete(id);}
  list():Task[]{return [...this.#tasks.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(t=>({...t}));}
  serialize():string {return JSON.stringify({schema:1,tasks:this.list()});}
}
