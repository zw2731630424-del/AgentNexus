"""M1.5.1 observation changes only. No limit, deadline, or assertion is relaxed."""
import pathlib, hashlib, json
base=pathlib.Path(__file__).resolve().parents[2]
path=base/'source/src/agentnexus/production/windows/NativeRuntime.cs'
old=path.read_bytes()
code=old.decode('utf-8')
replacements=[
 ('bool snapshotLost=false;', 'bool snapshotLost=false;Dictionary<string,object> nativeResult=null;string createdAt=null,assignedAt=null,resumedAt=null;'),
 ('pinned.Add(pi.pid,pi.process);CloseHandle', 'createdAt=DateTime.UtcNow.ToString("o");pinned.Add(pi.pid,pi.process);CloseHandle'),
 ('assigned=true;bool inJob;', 'assigned=true;assignedAt=DateTime.UtcNow.ToString("o");bool inJob;'),
 ('resumed=true;', 'resumed=true;resumedAt=DateTime.UtcNow.ToString("o");'),
 ('observations.Add(Obj("identity",Identity(entry.Value,entry.Key,false),', 'long pc,pe,pk,pu;Check(GetProcessTimes(entry.Value,out pc,out pe,out pk,out pu),"Read member final CPU times");observations.Add(Obj("user_cpu_100ns",pu.ToString(),"kernel_cpu_100ns",pk.ToString(),"identity",Identity(entry.Value,entry.Key,false),'),
 ('return Obj("prepare_id",prepared==null?', 'return nativeResult=Obj("process_created_at",createdAt,"job_assigned_at",assignedAt,"process_resumed_at",resumedAt,"observation_wall_ms",clock.ElapsedMilliseconds,"prepare_id",prepared==null?'),
 ('foreach(IntPtr h in pinned.Values)CloseHandle(h);if(pi.thread!=IntPtr.Zero)CloseHandle(pi.thread);', 'bool processHandlesClosed=true;foreach(IntPtr h in pinned.Values)processHandlesClosed&=CloseHandle(h);if(pi.thread!=IntPtr.Zero)processHandlesClosed&=CloseHandle(pi.thread);'),
 ('if(original!=IntPtr.Zero)CloseHandle(original);CloseHandle(job);', 'if(original!=IntPtr.Zero)CloseHandle(original);bool jobClosed=CloseHandle(job);if(nativeResult!=null){nativeResult["job_handle_close_succeeded"]=jobClosed;nativeResult["process_handles_close_succeeded"]=processHandlesClosed;nativeResult["native_cleanup_observed_at"]=DateTime.UtcNow.ToString("o");}')
]
for before,after in replacements:
    assert code.count(before)==1,(before,code.count(before))
    code=code.replace(before,after)
history=base/'evidence/development'
history.mkdir(parents=True,exist_ok=True)
(history/'NativeRuntime-before-observation.cs').write_bytes(old)
path.write_text(code,encoding='utf-8',newline='\n')
(history/'native-observation-change.json').write_text(json.dumps({'before_sha256':hashlib.sha256(old).hexdigest(),'after_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'changes':'timestamps, per-member CPU, actual CloseHandle return observations; limits unchanged'},indent=2)+'\n',encoding='utf-8')
