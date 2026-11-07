// Only fixed synthetic lifecycle cases. No project data or credentials.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const [mode,depth='0']=process.argv.slice(2);
if(mode==='normal')process.stdout.write('normal\n');
else if(mode==='crash')throw Error('fixed lifecycle crash');
else if(mode==='hold'){process.stdout.write('producer-alive\n');setInterval(()=>{},1000);}
else if(mode==='orphan'||mode==='levels'){
  const n=Number(depth);
  if(n<2){const child=spawn(process.execPath,[fileURLToPath(import.meta.url),mode,String(n+1)],{shell:false,windowsHide:true,detached:true,stdio:['ignore','inherit','inherit']});child.unref();process.stdout.write(`spawned-${child.pid}\n`);}
  process.stdout.write(`level-${n}\n`);
  if(mode==='orphan'&&n===0)setTimeout(()=>process.exit(0),250);
  else setInterval(()=>{},1000);
}else process.exitCode=64;
