import { canonical, invariant, sha256 } from '../types.js';
/** Explicit Codex-authored simulation fixtures, never a claim of general LLM code generation. */
export const PILOT_REQUIREMENTS = Object.freeze({ schema: 'agentnexus/pilot-requirements/1', project_id: 'pilot', name: 'AgentNexus-Pilot-Project',
    goal: 'Build an offline task-management and weighted progress analysis CLI with persistent JSON data.',
    capabilities: ['versioned-task-model', 'weighted-analytics', 'cli', 'unit-tests', 'integration-tests', 'documentation'],
    acceptance: ['Reject malformed, duplicate, negative and unsafe integer data.', 'Enforce optimistic task versions and legal state transitions.',
        'Weighted completion uses estimated minutes; empty or zero-weight input returns zero.', 'Persist CLI changes under an exclusive data lock and atomically replace valid JSON.',
        'Provide reproducible syntax, strict types, unit and CLI integration checks.'],
    boundaries: ['Independent test workspace only.', 'No real Provider, credentials, arbitrary shell, external effects, Git commit or push.'] });
export const MODEL_SOURCE = String.raw `export type Status = 'todo'|'doing'|'done';
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
`;
export const ANALYTICS_BUGGY = String.raw `import {validateTask} from './model.js';
import type {Task} from './model.js';
export function summarize(input:readonly Task[]){
  const tasks=input.map(validateTask),ids=new Set(tasks.map(t=>t.id));if(ids.size!==tasks.length)throw Error('DUPLICATE_ID');
  let estimated=0,spent=0,completed=0;
  for(const task of tasks){estimated+=task.estimate_minutes;spent+=task.spent_minutes;if(task.status==='done')completed+=task.estimate_minutes;}
  if(!Number.isSafeInteger(estimated)||!Number.isSafeInteger(spent))throw Error('TOTAL_OVERFLOW');
  const completion_percent=100*completed/estimated;
  return {count:tasks.length,todo:tasks.filter(t=>t.status==='todo').length,doing:tasks.filter(t=>t.status==='doing').length,done:tasks.filter(t=>t.status==='done').length,estimated_minutes:estimated,spent_minutes:spent,completion_percent};
}
`;
export const ANALYTICS_FIXED = ANALYTICS_BUGGY.replace('100*completed/estimated', 'estimated===0?0:100*completed/estimated');
export const CLI_SOURCE = String.raw `import {TaskBook} from './model.js';
import type {Status} from './model.js';
import {summarize} from './analytics.js';
export function run(args:readonly string[],raw:string|null):{exit_code:number;stdout:string;state:string|null}{
  try {const book=raw===null?new TaskBook():TaskBook.parse(raw),[command,...values]=args;let result:unknown;
    const integer=(x:string|undefined)=>{if(!x||!/^(0|[1-9][0-9]*)$/.test(x)||!Number.isSafeInteger(Number(x)))throw Error('INVALID_NUMBER');return Number(x);};
    if(command==='add'&&values.length===3)result=book.add(values[0],values[1],integer(values[2]));
    else if(command==='advance'&&values.length===3)result=book.advance(values[0],integer(values[1]),values[2] as Status);
    else if(command==='spend'&&values.length===3)result=book.spend(values[0],integer(values[1]),integer(values[2]));
    else if(command==='remove'&&values.length===2){book.remove(values[0],integer(values[1]));result={removed:values[0]};}
    else if(command==='list'&&values.length===0)result=book.list();
    else if(command==='report'&&values.length===0)result=summarize(book.list());
    else throw Error('USAGE: add id title minutes | advance id version status | spend id version minutes | remove id version | list | report');
    return {exit_code:0,stdout:JSON.stringify(result),state:book.serialize()};
  }catch(error){return {exit_code:2,stdout:JSON.stringify({error:error instanceof Error?error.message:'UNKNOWN'}),state:raw};}
}
`;
export const ENTRY_SOURCE = String.raw `import {open,rename,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {once} from 'node:events';
import {run} from './cli.js';
const [flag,name,...args]=process.argv.slice(2);
if(flag!=='--data'||!name){console.error('Usage: node src/entry.ts --data <file.json> <command>');process.exitCode=2;}
else {const path=resolve(name),lockPath=path+'.lock',temp=path+'.tmp-'+process.pid;let lock:Awaited<ReturnType<typeof open>>|null=null,tempOwned=false;
  try {lock=await open(lockPath,'wx');let raw:string|null=null;try{const data=await open(path,'r');try{if((await data.stat()).size>16777216)throw Object.assign(Error('DATA_SIZE_LIMIT'),{code:'DATA_SIZE_LIMIT'});const chunks:Buffer[]=[];let bytes=0;for await(const chunk of data.createReadStream({highWaterMark:65536,autoClose:false})){bytes+=chunk.length;if(bytes>16777216)throw Object.assign(Error('DATA_SIZE_LIMIT'),{code:'DATA_SIZE_LIMIT'});chunks.push(chunk);}raw=new TextDecoder('utf8',{fatal:true}).decode(Buffer.concat(chunks,bytes));}finally{await data.close();}}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    const result=run(args,raw);
    if(result.exit_code===0&&result.state!==raw){const file=await open(temp,'wx');tempOwned=true;try{await file.writeFile(result.state!,'utf8');await file.sync();}finally{await file.close();}await rename(temp,path);tempOwned=false;}
    const output=Buffer.from(result.stdout+'\n');for(let offset=0;offset<output.length;offset+=65536)if(!process.stdout.write(output.subarray(offset,offset+65536)))await once(process.stdout,'drain');process.exitCode=result.exit_code;
  }catch(e){console.error(JSON.stringify({error:(e as NodeJS.ErrnoException).code??'IO_ERROR'}));process.exitCode=3;}
  finally{if(tempOwned)await unlink(temp);if(lock){await lock.close();await unlink(lockPath);}}
}
`;
const MODEL_TESTS = String.raw `import test from 'node:test';import assert from 'node:assert/strict';import {TaskBook,validateTask} from '../src/model.js';
test('model CRUD, version fence and transitions',()=>{const b=new TaskBook();const task=b.add('a','Research',60);task.title='mutated';assert.equal(b.list()[0].title,'Research');assert.throws(()=>b.advance('a',9,'doing'),/VERSION_CONFLICT/);assert.throws(()=>b.advance('a',1,'done'),/INVALID_TRANSITION/);assert.equal(b.advance('a',1,'doing').version,2);b.spend('a',2,15);b.advance('a',3,'done');assert.equal(b.list()[0].spent_minutes,15);const copy=TaskBook.parse(b.serialize());copy.remove('a',4);assert.equal(copy.list().length,0);assert.equal(b.list().length,1);});
test('model rejects duplicates, malformed data and unsafe integers',()=>{const b=new TaskBook();const t=b.add('x','Valid',0);assert.throws(()=>b.add('x','Again',1),/DUPLICATE_ID/);for(const change of [{id:'../x'},{title:' '},{estimate_minutes:-1},{spent_minutes:Infinity},{version:0},{extra:true}])assert.throws(()=>validateTask({...t,...change}),/INVALID_TASK/);assert.throws(()=>TaskBook.parse(JSON.stringify({schema:1,tasks:[t,t]})),/DUPLICATE_ID/);assert.throws(()=>TaskBook.parse('{broken'));assert.throws(()=>TaskBook.parse(JSON.stringify({schema:2,tasks:[]})),/INVALID_DATA/);assert.throws(()=>b.spend('x',1,Number.MAX_SAFE_INTEGER+1),/INVALID_MINUTES/);});
test('read snapshots cannot mutate stored data',()=>{const b=new TaskBook();b.add('x','Immutable',1);b.list()[0].version=99;assert.equal(b.list()[0].version,1);});
test('capacity rejection preserves parseable data',()=>{const b=new TaskBook(Array.from({length:10000},(_,i)=>({id:'t'+i,title:'T',status:'todo',estimate_minutes:0,spent_minutes:0,version:1})));const before=b.serialize();assert.throws(()=>b.add('overflow','T',0),/TASK_CAPACITY/);assert.equal(b.serialize(),before);assert.equal(TaskBook.parse(before).list().length,10000);});
test('oversized JSON input is rejected before parsing',()=>{assert.throws(()=>TaskBook.parse(' '.repeat(16777217)),/DATA_SIZE_LIMIT/);});
`;
const ANALYTICS_TESTS = String.raw `import test from 'node:test';import assert from 'node:assert/strict';import {summarize} from '../src/analytics.js';import type {Task} from '../src/model.js';
const task=(id:string,estimate_minutes:number,status:Task['status']):Task=>({id,title:id,status,estimate_minutes,spent_minutes:0,version:1});
test('analytics uses estimate weights rather than task counts',()=>{const result=summarize([task('a',90,'done'),task('b',30,'todo')]);assert.equal(result.completion_percent,75);assert.equal(result.count,2);assert.equal(result.done,1);});
test('empty and zero weight analytics are finite zero',()=>{assert.equal(summarize([]).completion_percent,0);assert.equal(summarize([task('a',0,'done')]).completion_percent,0);});
test('analytics rejects duplicates, negative values and overflow',()=>{const t=task('x',1,'todo');assert.throws(()=>summarize([t,t]),/DUPLICATE_ID/);assert.throws(()=>summarize([{...t,estimate_minutes:-1}]),/INVALID_TASK/);assert.throws(()=>summarize([task('a',Number.MAX_SAFE_INTEGER,'todo'),task('b',1,'todo')]),/TOTAL_OVERFLOW/);});
`;
const CLI_TESTS = String.raw `import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {join} from 'node:path';import {run} from '../src/cli.js';
test('CLI roundtrip and bad command preserve previous valid state',()=>{const created=run(['add','a','Task','60'],null);assert.equal(created.exit_code,0);const conflict=run(['advance','a','999','doing'],created.state);assert.equal(conflict.exit_code,2);assert.equal(conflict.state,created.state);assert.equal(JSON.parse(run(['list'],created.state).stdout).length,1);assert.equal(run(['add','x','bad','NaN'],created.state).exit_code,2);assert.equal(run(['unknown'],created.state).exit_code,2);});
test('real CLI persists, rejects conflicts, corruption and a held lock',async()=>{const root=process.env.AGENTNEXUS_PILOT_SCRATCH;assert(root,'Host scratch is required');await mkdir(root,{recursive:true});const file=join(root,'cli-data.json'),entry=join(process.cwd(),'src/entry.ts');const invoke=(...args:string[])=>execFileSync(process.execPath,[entry,'--data',file,...args],{cwd:process.cwd(),env:process.env,encoding:'utf8',windowsHide:true});assert.equal(JSON.parse(invoke('add','a','Persistent','30')).version,1);assert.equal(JSON.parse(invoke('advance','a','1','doing')).version,2);const before=await readFile(file,'utf8');assert.throws(()=>invoke('advance','a','1','done'));assert.equal(await readFile(file,'utf8'),before);await writeFile(file+'.lock','held');assert.throws(()=>invoke('list'));assert.equal(await readFile(file,'utf8'),before);const broken=join(root,'corrupt.json');await writeFile(broken,'{bad');assert.throws(()=>execFileSync(process.execPath,[entry,'--data',broken,'list'],{env:process.env,windowsHide:true}));assert.equal(await readFile(broken,'utf8'),'{bad');});
`;
const README = String.raw `# AgentNexus-Pilot-Project

Offline task management with versioned tasks, weighted progress, JSON persistence and an explicit CLI data lock.

Requires Node 24.15.0. Run: node src/entry.ts --data ./tasks.json add task1 "Read requirements" 60
Then: node src/entry.ts --data ./tasks.json advance task1 1 doing
Use list, report, spend id version minutes, or remove id version. Commands return JSON. Exit 0 means success, 2 means validation/usage failure, and 3 means I/O or lock failure.

Task versions reject stale updates. Invalid data is preserved. Each CLI operation holds an exclusive .lock and replaces the JSON file from an fsynced temporary file. An abandoned lock needs explicit owner inspection; it is never silently removed. This is local process coordination, not a hostile-process security boundary or a power-loss durability guarantee.

Input JSON is capped at 16 MiB and 10,000 tasks. File reads and stdout use 64 KiB chunks; JSON decoding is bounded by that cap. Invalid UTF-8 is rejected without replacing the original file.

Tests: AGENTNEXUS_PILOT_SCRATCH must name an independent empty test directory; run node --test tests/model.test.ts tests/analytics.test.ts tests/cli.test.ts. The AgentNexus fixed Host checker supplies it and runs strict TypeScript checks with pinned local tools.

Provenance: the Native Harness published these files through Storage Owner using an explicitly simulated, Codex-authored fixture provider. Local orchestration and tests are real; general LLM autonomous development and real-provider integration remain unverified.
`;
const PACKAGE = JSON.stringify({ name: 'agentnexus-pilot-project', version: '0.1.0', private: true, type: 'module', engines: { node: '24.15.0' }, scripts: { test: 'node --test tests/model.test.ts tests/analytics.test.ts tests/cli.test.ts' } }, null, 2) + '\n';
const TSCONFIG = JSON.stringify({ compilerOptions: { target: 'ES2024', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, allowImportingTsExtensions: true, types: ['node'] }, include: ['src/**/*.ts', 'tests/**/*.ts'] }, null, 2) + '\n';
export const PILOT_FILES = Object.freeze({ 'src/model.ts': MODEL_SOURCE, 'src/analytics.ts': ANALYTICS_BUGGY, 'src/cli.ts': CLI_SOURCE, 'src/entry.ts': ENTRY_SOURCE,
    'tests/model.test.ts': MODEL_TESTS, 'tests/analytics.test.ts': ANALYTICS_TESTS, 'tests/cli.test.ts': CLI_TESTS, 'package.json': PACKAGE, 'tsconfig.json': TSCONFIG, 'README.md': README });
export const ROLE_PATHS = Object.freeze({ 'code-model': ['src/model.ts'], 'code-analytics': ['src/analytics.ts'], 'code-cli': ['src/cli.ts', 'src/entry.ts'], test: ['tests/model.test.ts', 'tests/analytics.test.ts', 'tests/cli.test.ts'], docs: ['README.md', 'package.json', 'tsconfig.json'] });
export function makePilotPlan(requirements) {
    invariant(requirements.schema === PILOT_REQUIREMENTS.schema && requirements.project_id === 'pilot' && requirements.capabilities.includes('weighted-analytics'), 'PILOT_UNSUPPORTED_REQUIREMENTS');
    const work = (id, role, dependencies, outputs, priority = 5) => ({ id, role, dependencies, outputs, priority, goal: 'Implement ' + id + ' for the original task CLI requirements.', acceptance: ['Provide original source references and verifiable artifacts.'], model_strategy: role === 'ARCHITECTURE' ? 'DESIGN' : 'LOW_COST', estimated_requests: 24, disk_bytes: 65536 });
    const tasks = [work('research', 'RESEARCH', [], [], 9), work('architecture', 'ARCHITECTURE', ['research'], [], 9), ...['code-model', 'code-analytics', 'code-cli'].map(id => work(id, 'CODING', ['architecture'], ROLE_PATHS[id].map(path => id + '/' + path), 8)),
        work('test', 'TEST', ['code-model', 'code-analytics', 'code-cli'], ROLE_PATHS.test.map(path => 'test/' + path)), work('docs', 'DOCUMENTATION', ['architecture'], ROLE_PATHS.docs.map(path => 'docs/' + path)),
        work('integration', 'INTEGRATION', ['test', 'docs'], Object.keys(PILOT_FILES).map(path => 'AgentNexus-Pilot-Project/' + path))];
    return { schema: 'agentnexus/development-plan/1', project_id: 'pilot', requirements_sha256: sha256(canonical(requirements)), goal: requirements.goal, tasks };
}
function values(input) { return input.context.entries.flatMap(entry => { try {
    const parsed = JSON.parse(entry.text);
    return parsed && typeof parsed === 'object' ? [parsed] : [];
}
catch {
    return [];
} }); }
export function pilotResponder(sourceHash) {
    return { id: 'pilot-context-fixtures', version: '1.7', source_sha256: sourceHash, respond(input) {
            const data = values(input), contractEntry = input.context.entries.find(e => e.section === 'TASK_CONTRACT');
            invariant(contractEntry, 'PILOT_TASK_CONTRACT_MISSING');
            const contract = JSON.parse(JSON.parse(contractEntry.text).goal);
            const messages = input.context.entries.filter(entry => ['resident', 'review-before', 'review-final'].includes(entry.source.task_id)).flatMap(entry => { try {
                const value = JSON.parse(entry.text);
                return value && typeof value.pilot_signal === 'string' ? [value] : [];
            }
            catch {
                return [];
            } });
            let reply;
            if (contract.pilot_role === 'lead') {
                const requirements = data.find(value => value.schema === 'agentnexus/pilot-requirements/1');
                invariant(requirements, 'PILOT_REQUIREMENTS_MISSING');
                const accepted = input.context.entries.some(entry => entry.source.task_id === 'resident' && (() => { try {
                    const value = JSON.parse(entry.text);
                    return value.pilot_signal === 'ACCEPTED' && value.authority === 'NATIVE_GATE_ENGINE' && typeof value.gate_record_id === 'string';
                }
                catch {
                    return false;
                } })());
                if (accepted)
                    reply = { kind: 'FINAL', text: canonical({ status: 'LOCAL_EXECUTION_COMPLETE', model_assurance: 'SIMULATED' }) };
                else if (messages.some(value => value.pilot_signal === 'REVIEW_FINDINGS'))
                    reply = { kind: 'WAIT', text: canonical({ action: 'REPAIR', path: 'src/analytics.ts', reason: 'Guard zero estimated minutes as required by the original acceptance contract.' }) };
                else if (messages.some(value => value.pilot_signal === 'QUESTION'))
                    reply = { kind: 'WAIT', text: canonical({ action: 'ANSWER', receiver: 'code-cli', text: 'The original requirements explicitly require zero for empty and zero-weight metrics.', requirements_sha256: sha256(canonical(requirements)) }) };
                else
                    reply = { kind: 'WAIT', text: canonical(makePilotPlan(requirements)) };
            }
            else if (contract.pilot_role === 'research')
                reply = { kind: 'FINAL', text: canonical({ facts: ['Original requirements require version fences, weighted progress and finite empty input.', 'No network or real model provider is allowed.'], references: input.context.entries.filter(e => e.section === 'FILE_CONTENT' || e.section === 'PROJECT_RULES').map(e => ({ event_id: e.source.event_id, sha256: e.range_sha256 })), inferences: ['Independent pure modules can be developed in parallel.'], missing: [] }) };
            else if (contract.pilot_role === 'architecture')
                reply = { kind: 'FINAL', text: canonical({ modules: ['model', 'analytics', 'cli'], interfaces: ['TaskBook', 'summarize', 'run'], parallel_tasks: ['code-model', 'code-analytics', 'code-cli'], decisions: ['Use safe integer minutes and immutable snapshots.', 'Use versioned mutations and explicit JSON lock.'], references: input.context.entries.map(e => e.source.event_id) }) };
            else if (contract.pilot_role === 'review')
                reply = { kind: 'WAIT', text: canonical({ action: 'REVIEW_REQUEST', candidate_binding: messages.at(-1) ?? null, scope: 'Independent read-only syntax, types, unit, numerical and CLI checks; retain all findings.' }) };
            else if (contract.pilot_role === 'test-runner')
                reply = messages.some(value => value.pilot_signal === 'TESTS_PASSED') ? { kind: 'FINAL', text: 'Actual fixed-runner evidence received.' } : { kind: 'WAIT', text: canonical({ action: 'TEST_REQUEST', scope: 'Host fixed Node and strict TypeScript profile; no arbitrary process permission.' }) };
            else if (contract.pilot_role === 'resident') {
                const question = data.find(value => value.pilot_signal === 'QUESTION');
                reply = { kind: 'WAIT', text: canonical(question ? { action: 'FORWARD_QUESTION', receiver: 'lead', reply_to: 'code-cli', question: question.question } : { action: 'RESIDENT_CHECKPOINT', received: messages.length, model_assurance: 'SIMULATED' }) };
            }
            else if (contract.pilot_role === 'coordinator')
                reply = { kind: 'WAIT', text: canonical({ action: 'COORDINATOR_ADVICE', priorities: ['architecture', 'code-model', 'code-analytics', 'code-cli', 'test', 'integration'], decisions_changed: false }) };
            else {
                const files = contract.files ?? [], outputs = data.flatMap(value => value.data && typeof value.data === 'object' ? [value.data] : []);
                const sources = contract.sources ?? data.find(value => value.schema === 'agentnexus/pilot-source-manifest/1')?.sources;
                if (sources) {
                    invariant(Array.isArray(sources) && sources.length === files.length && new Set(sources.map(item => item.path)).size === files.length && sources.every(item => files.includes(item.path) && item.source.offset === 0 && item.source.length === item.source.payload_ref.bytes && item.source.payload_ref.sha256 === sha256(PILOT_FILES[item.path])), 'PILOT_SOURCE_MANIFEST_INCOMPLETE_OR_MISMATCH');
                }
                let turn = Number(input.request.request_id.slice(input.request.request_id.lastIndexOf('.') + 1));
                invariant(Number.isSafeInteger(turn) && turn > 0, 'PILOT_TURN_ID');
                if (contract.pilot_role.startsWith('code-') && turn === 1)
                    return { reply: { kind: 'TOOL_CALL', tool_name: 'native.pilot.parallel-barrier', arguments: { lane: contract.pilot_role } }, input_tokens: Math.ceil(input.context.bytes / 4), output_tokens: 32, cost_micros: 0 };
                if (contract.pilot_role.startsWith('code-'))
                    turn--;
                if (contract.pilot_role === 'code-cli' && turn === 1)
                    return { reply: { kind: 'WAIT', text: canonical({ action: 'QUESTION', receiver: 'resident', question: 'Confirm the required result for empty or zero-weight metrics before wiring the CLI.' }) }, input_tokens: Math.ceil(input.context.bytes / 4), output_tokens: 64, cost_micros: 0 };
                if (contract.pilot_role === 'code-cli') {
                    const requirements = data.find(value => value.schema === 'agentnexus/pilot-requirements/1');
                    const answer = input.context.entries.filter(entry => entry.source.task_id === 'lead').some(entry => { try {
                        const value = JSON.parse(entry.text);
                        return value.pilot_signal === 'ANSWER' && value.requirements_sha256 === sha256(canonical(requirements)) && typeof value.text === 'string' && value.text.includes('zero');
                    }
                    catch {
                        return false;
                    } });
                    invariant(answer, 'PILOT_ANSWER_NOT_IN_CONTEXT');
                    turn--;
                }
                if (contract.pilot_role === 'debug')
                    invariant(input.context.entries.some(entry => entry.section === 'FILE_CONTENT' && entry.source.payload_ref.sha256 === contract.replacement?.sha256 && entry.text === ANALYTICS_BUGGY), 'PILOT_DEBUG_ORIGINAL_FILE_REQUIRED');
                // The durable request ID, rather than a lossy recent-history window, fixes each fixture step.
                const path = files[sources ? turn - 1 : Math.floor((turn - 1) / 2)];
                if (!path)
                    reply = { kind: 'FINAL', text: canonical({ role: contract.pilot_role, files, artifacts_verified_by_host_required: true }) };
                else {
                    const content = contract.pilot_role === 'debug' ? ANALYTICS_FIXED : PILOT_FILES[path];
                    invariant(typeof content === 'string', 'PILOT_FIXTURE_PATH');
                    const direct = sources?.find(item => item.path === path)?.source;
                    const staged = outputs.find(value => value.schema === 'agentnexus/pilot-staged/1' && value.path === path && (value.source?.payload_ref.sha256 === sha256(content)));
                    const source = direct ?? staged?.source;
                    if (!source)
                        reply = { kind: 'TOOL_CALL', tool_name: 'native.pilot.stage', arguments: { path, content } };
                    else
                        reply = { kind: 'TOOL_CALL', tool_name: 'native.storage.write', resource_id: contract.resource_id, arguments: { resource_id: contract.resource_id, path, mode: contract.replacement ? 'REPLACE' : 'CREATE', expected_version: contract.replacement?.version ?? null, expected_sha256: contract.replacement?.sha256 ?? null, source } };
                }
            }
            return { reply, input_tokens: Math.ceil(input.context.bytes / 4), output_tokens: Math.ceil(Buffer.byteLength(canonical(reply)) / 4), cost_micros: 0 };
        } };
}
