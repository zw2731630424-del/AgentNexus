import {readFile} from 'node:fs/promises';
import {createReadStream,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,relative,isAbsolute,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
async function sha(path){const hash=createHash('sha256');for await(const b of createReadStream(path))hash.update(b);return hash.digest('hex');}
const rows=(await readFile(join(root,'SHA256SUMS'),'utf8')).trim().split(/\r?\n/),mismatches=[];
for(const row of rows){const match=/^([a-f0-9]{64})  (.+)$/.exec(row);if(!match)throw Error('INVALID_MANIFEST_LINE');const path=resolve(root,match[2]),rel=relative(root,path);if(isAbsolute(rel)||rel==='..'||rel.startsWith('..\\')||rel.startsWith('../'))throw Error('MANIFEST_PATH_ESCAPES_ROOT');if(!existsSync(path)||await sha(path)!==match[1])mismatches.push(match[2]);}
const archive=join(root,'AgentNexus-M2.0-complete.zip'),receipt=archive+'.sha256';let archiveStatus='NOT_PRESENT_IN_EXTRACTED_PACKAGE';
if(existsSync(archive)&&existsSync(receipt)){const expected=(await readFile(receipt,'utf8')).split(/\s+/)[0];archiveStatus=await sha(archive)===expected?'PASS':'FAIL';if(archiveStatus==='FAIL')mismatches.push('AgentNexus-M2.0-complete.zip');}
process.stdout.write(JSON.stringify({status:mismatches.length?'FAIL':'PASS',checked_content_files:rows.length,archive:archiveStatus,mismatches},null,2)+'\n');process.exitCode=mismatches.length?1:0;
