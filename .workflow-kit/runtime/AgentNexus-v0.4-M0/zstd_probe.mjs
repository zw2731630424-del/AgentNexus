// M0 synthetic streaming feasibility probe. No product implementation or model.
import { createZstdCompress, createZstdDecompress, constants } from 'node:zlib';
import { Readable, Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.dirname(fileURLToPath(import.meta.url));
const file=path.join(root,'zstd-synthetic-v2.zst');
const bytes=32*1024*1024, chunkSize=64*1024;
const original=createHash('sha256');
let drainWaits=0, peakRss=process.memoryUsage().rss, randomState=0x1254ABCD;
async function* source(){
  for(let offset=0;offset<bytes;offset+=chunkSize){
    const chunk=Buffer.alloc(chunkSize);
    for(let i=0;i<chunk.length;i++){randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;chunk[i]=randomState&255;}
    original.update(chunk);peakRss=Math.max(peakRss,process.memoryUsage().rss);
    yield chunk;
  }
}
const sink=createWriteStream(file,{flags:'wx',highWaterMark:16384});
sink.on('drain',()=>{drainWaits++;});
const compressor=createZstdCompress({params:{[constants.ZSTD_c_compressionLevel]:3,[constants.ZSTD_c_checksumFlag]:1},chunkSize:16384});
await pipeline(Readable.from(source(),{highWaterMark:1}),compressor,sink);
const handle=await open(file,'r+');await handle.sync();await handle.close();
const decoded=createHash('sha256');let decodedBytes=0;
await pipeline(createReadStream(file,{highWaterMark:chunkSize}),createZstdDecompress(),new Writable({write(chunk,encoding,callback){decoded.update(chunk);decodedBytes+=chunk.length;callback();}}));
const inputHash=original.digest('hex'), outputHash=decoded.digest('hex');
let corruptRejected=false;
// The checksum rejects a modified compressed frame; mutate a separate file.
const corrupt=path.join(root,'zstd-corrupt-v2.zst');
await pipeline(createReadStream(file),new Transform({transform(chunk,e,callback){if(!this.flipped && chunk.length>16){chunk=Buffer.from(chunk);chunk[16]^=0x40;this.flipped=true;}callback(null,chunk);}}),createWriteStream(corrupt,{flags:'wx'}));
try{await pipeline(createReadStream(corrupt),createZstdDecompress(),new Writable({write(c,e,cb){cb();}}));}catch{corruptRejected=true;}
const report={input_pattern:'deterministic xorshift32 bytes to exercise backpressure',kind:'M0 synthetic real Zstandard stream; not real-model validation',node:process.version,time_utc:new Date().toISOString(),results:[{id:'ZSTD-ROUNDTRIP',status:decodedBytes===bytes&&inputHash===outputHash?'PASS':'FAIL',bytes,decodedBytes,input_sha256:inputHash,decoded_sha256:outputHash},{id:'ZSTD-CORRUPTION',status:corruptRejected?'PASS':'FAIL',checksum:true},{id:'ZSTD-STREAM-PIPELINE',status:drainWaits>0?'PASS':'INCONCLUSIVE',chunk_size:chunkSize,drain_events:drainWaits,observed_peak_rss:peakRss,compressed_bytes:(await stat(file)).size}],limitations:['Node Zstandard API is experimental','RSS observation is not a soak test','no hardware power-cut test','no product archive or provider calls']};
await writeFile(path.join(root,'zstd-probe-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.results.some(x=>x.status!=='PASS'))process.exitCode=1;
