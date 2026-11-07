import {writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {outsideSource} from '../../source/tools/agentnexus/output-root.ts';
const evidence=dirname(fileURLToPath(import.meta.url)),source=resolve(evidence,'../../source'),checks=[];
for(const path of [source.toLowerCase(),join(source,'review-output-must-not-be-created').toLowerCase()]){
  let rejected=false,reason=null;try{await outsideSource(source,path);}catch(e){rejected=true;reason=e.message;}
  checks.push({path,rejected,reason,status:rejected?'PASS':'FAIL'});
}
const allowed=await outsideSource(source,evidence);checks.push({path:evidence,resolved:allowed,status:allowed.toLowerCase()===evidence.toLowerCase()?'PASS':'FAIL'});
const result={schema:'agentnexus/independent-review/output-root/1.6',platform:process.platform,node:process.version,observed_at:new Date().toISOString(),
  assurance:'Actual product helper and existing ancestor realpath; no output directories were created',checks};
await writeFile(join(evidence,'output-root-final.json'),JSON.stringify(result,null,2)+'\n');process.stdout.write(JSON.stringify(result)+'\n');if(checks.some(c=>c.status==='FAIL'))process.exitCode=1;
