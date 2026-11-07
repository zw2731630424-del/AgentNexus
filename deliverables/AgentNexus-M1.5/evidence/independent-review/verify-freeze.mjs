import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const [beforeName,afterName,expectedSet,tag,parentName='source-freeze.json']=process.argv.slice(2);
for(const name of [beforeName,afterName])if(!/^[a-zA-Z0-9-]+\.json$/.test(name??''))throw Error('Invalid manifest file name');
if(!/^[a-f0-9]{64}$/.test(expectedSet??'')||!/^[a-zA-Z0-9-]+$/.test(tag??''))throw Error('Invalid expected set/tag');
if(!/^[a-zA-Z0-9-]+\.json$/.test(parentName))throw Error('Invalid parent manifest file name');
const hash=value=>createHash('sha256').update(value).digest('hex');
const beforeBytes=await readFile(join(root,beforeName)),afterBytes=await readFile(join(root,afterName)),before=JSON.parse(beforeBytes),after=JSON.parse(afterBytes);
const parentBytes=await readFile(new URL('../'+parentName,import.meta.url)),parent=JSON.parse(parentBytes);
function setDigest(files){return hash([...files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0).map(f=>f.path+'\0'+f.sha256+'\n').join(''));}
function compare(a,b){const left=new Map(a.map(f=>[f.path,f])),right=new Map(b.map(f=>[f.path,f]));const mismatches=[];for(const path of new Set([...left.keys(),...right.keys()])){const l=left.get(path),r=right.get(path);if(!l||!r||l.sha256!==r.sha256||l.bytes!==r.bytes)mismatches.push({path,left:l??null,right:r??null});}return mismatches;}
const comparisons={before_after:compare(before.files,after.files),parent_before:compare(parent.files,before.files)};
const observed={parent:parent.set_sha256,before:setDigest(before.files),after:setDigest(after.files)};
const report={schema:'agentnexus/independent-freeze-verification/1',timestamp:new Date().toISOString(),expected_set_sha256:expectedSet,source_files:before.files.length,observed,comparisons,matched:Object.values(observed).every(v=>v===expectedSet)&&Object.values(comparisons).every(v=>v.length===0),set_definition:'SHA256 of source-relative slash path + NUL + lowercase SHA256 + LF, paths sorted by ordinal order',before_manifest:beforeName,before_manifest_sha256:hash(beforeBytes),after_manifest:afterName,after_manifest_sha256:hash(afterBytes),parent_manifest_file:parentName,parent_manifest_sha256:hash(parentBytes)};
const path=join(root,'freeze-verification-'+tag+'.json');await writeFile(path,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,path},null,2));if(!report.matched)process.exitCode=1;
