import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const mode=process.argv[2];
if(mode==='multi'||mode==='child'){
  const count=mode==='multi'?2:1;
  for(let i=0;i<count;i++)spawn(process.execPath,[fileURLToPath(import.meta.url),'spin'],{shell:false,windowsHide:true,stdio:'ignore'});
  if(mode==='child'){setInterval(()=>{},1000);}else{for(;;)Math.sqrt(Math.random());}
}else if(['single','long','spin'].includes(mode)){for(;;)Math.sqrt(Math.random());}
else process.exitCode=2;
