import { storageFixture,prepare,execute } from './m161-storage-fixture.ts';
const [root,stop]=process.argv.slice(2);
let chunks=0;
const pause=async(phase,w)=>{if(phase==='WRITE_CHUNK'&&stop===phase&&++chunks<2)return;if(phase===stop){process.send?.({phase,operation_id:w.id,state:w.state,temp_path:w.temp_path});setInterval(()=>{},1000);await new Promise(()=>{});}};
const h=await storageFixture(root,{storage:{onStage:pause,beforeIO:pause}});
const bytes=stop==='WRITE_CHUNK'?Buffer.alloc(131072,65):Buffer.from('durable child content');
await prepare(h,bytes,bytes.length);
await execute(h);
await h.close();
