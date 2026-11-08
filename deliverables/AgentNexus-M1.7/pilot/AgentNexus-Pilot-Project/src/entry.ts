import {open,rename,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {once} from 'node:events';
import {run} from './cli.ts';
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
