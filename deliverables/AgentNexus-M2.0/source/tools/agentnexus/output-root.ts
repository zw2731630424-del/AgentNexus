import { realpath } from 'node:fs/promises';
import { basename,dirname,resolve,sep } from 'node:path';

/** Resolve existing ancestors, including Windows case/short-name/reparse aliases. */
export async function outsideSource(source:string,requested:string):Promise<string>{
  const canonicalSource=await realpath(resolve(source));let current=resolve(requested);const tail:string[]=[];
  for(;;){try{current=resolve(await realpath(current),...tail);break;}catch(error){
    if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
    const parent=dirname(current);if(parent===current)throw error;tail.unshift(basename(current));current=parent;
  }}
  const key=(value:string)=>process.platform==='win32'?value.toLowerCase():value;
  const candidate=key(current),protectedRoot=key(canonicalSource);
  if(candidate===protectedRoot||candidate.startsWith(protectedRoot+sep))throw Error('Output must be outside candidate source');
  return current;
}
