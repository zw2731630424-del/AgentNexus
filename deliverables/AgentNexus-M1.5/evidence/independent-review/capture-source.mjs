import {readFile,readdir,lstat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../../deliverables/AgentNexus-M1.5/source/',import.meta.url));
const output=dirname(fileURLToPath(import.meta.url));
const tag=process.argv[2]??new Date().toISOString().replaceAll(/[^0-9TZ]/g,'');
if(!/^[a-zA-Z0-9-]+$/.test(tag))throw Error('Invalid snapshot tag');
const files=[];const excluded=[];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function walk(path,prefix=''){
  const entries=await readdir(path,{withFileTypes:true});entries.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
  for(const entry of entries){const rel=prefix+entry.name,absolute=join(path,entry.name);
    if(['node_modules','.git'].includes(entry.name)&&entry.isDirectory()){excluded.push(rel+'/');continue;}
    const stat=await lstat(absolute);if(stat.isSymbolicLink())throw Error('Unreviewed source link: '+rel);
    if(stat.isDirectory())await walk(absolute,rel+'/');else if(stat.isFile()){const bytes=await readFile(absolute);files.push({path:rel,bytes:bytes.length,sha256:hash(bytes)});}else throw Error('Unreviewed non-file: '+rel);
  }
}
await walk(root);files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
const aggregate=hash(files.map(file=>file.sha256+'  '+file.path+'\n').join(''));
const manifest={schema:'agentnexus/independent-source-snapshot/1',timestamp:new Date().toISOString(),root,excluded,aggregate_definition:'SHA256 of lowercase SHA256 + two spaces + source-relative slash path + LF, paths sorted by JavaScript ordinal order',aggregate_sha256:aggregate,files};
const bytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n'),path=join(output,'source-snapshot-'+tag+'.json');await writeFile(path,bytes,{flag:'wx'});
console.log(JSON.stringify({path,files:files.length,excluded,aggregate_sha256:aggregate,manifest_sha256:hash(bytes)},null,2));
