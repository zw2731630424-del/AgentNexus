// Actual Node built-in SQLite binding smoke and concurrent reservation; synthetic only.
import { DatabaseSync } from 'node:sqlite';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
if(!isMainThread){
  const d=new DatabaseSync(workerData.file); d.exec('PRAGMA busy_timeout=15000');
  parentPort.postMessage('ready');
  parentPort.once('message',()=>{
    let claimed=false;
    try{d.prepare('INSERT INTO claim VALUES (?)').run('one');claimed=true;}catch(e){if(!String(e).includes('UNIQUE'))throw e;}
    const granted=d.prepare('UPDATE budget SET remaining=remaining-1000 WHERE remaining>=1000').run().changes;
    d.close();parentPort.postMessage({claimed,granted:Number(granted)});parentPort.close();
  });
}else{
  const root=path.dirname(fileURLToPath(import.meta.url)), file=path.join(root,'node-sqlite-probe-v2.sqlite');
  const d=new DatabaseSync(file); d.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE claim(id TEXT PRIMARY KEY); CREATE TABLE budget(remaining INTEGER CHECK(remaining>=0)); INSERT INTO budget VALUES(10000)');
  const version=d.prepare('select sqlite_version() as v').get().v;
  const workers=Array.from({length:16},()=>new Worker(new URL(import.meta.url),{workerData:{file}}));
  const results=workers.map(w=>new Promise((resolve,reject)=>{w.once('message',()=>{w.once('message',resolve);w.once('error',reject);});}));
  await Promise.all(workers.map(w=>new Promise((resolve,reject)=>{w.once('online',resolve);w.once('error',reject);}))); 
  // Worker listener queues the start message until its database is ready.
  workers.forEach(w=>w.postMessage('start'));
  const r=await Promise.all(results);await Promise.all(workers.map(w=>new Promise(resolve=>{if(w.threadId===-1)resolve();else w.once('exit',resolve);}))); 
  const claims=r.filter(x=>x.claimed).length, grants=r.reduce((n,x)=>n+x.granted,0), remaining=d.prepare('SELECT remaining FROM budget').get().remaining;
  d.exec('BEGIN IMMEDIATE; UPDATE budget SET remaining=123; ROLLBACK');
  const rolledBack=d.prepare('SELECT remaining FROM budget').get().remaining;
  d.close();
  const report={kind:'M0 real Node SQLite binding; synthetic concurrency, no product/model',node:process.version,sqlite:version,time_utc:new Date().toISOString(),results:[{id:'NODE-SQLITE-CLAIM',status:claims===1?'PASS':'FAIL',workers:16,claims},{id:'NODE-SQLITE-BUDGET',status:grants===10&&remaining===0?'PASS':'FAIL',grants,remaining},{id:'NODE-SQLITE-ROLLBACK',status:rolledBack===0?'PASS':'FAIL',remaining:rolledBack}],limitations:['not WAL-reset regression reproducer','not power-cut durability test','not production policy test']};
  await writeFile(path.join(root,'node-sqlite-probe-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  if(report.results.some(x=>x.status!=='PASS'))process.exitCode=1;
}
