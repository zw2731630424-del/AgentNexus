"""Investigation-only instrumentation; never a production helper or qualification."""
import pathlib, shutil, json, hashlib, sys
base=pathlib.Path(__file__).resolve().parents[2]
old=base.parent/'AgentNexus-M1.5/source/src/agentnexus/production/windows'
variant=sys.argv[1] if len(sys.argv)>1 else 'original'
assert variant in ['original','no-rate','per-process']
dest=base/('evidence/cpu-investigation/helper'+('' if variant=='original' else '-'+variant))
dest.mkdir(parents=True,exist_ok=True)
for name in ['runtime.ps1','BootstrapNative.cs']:
    shutil.copyfile(old/name,dest/name)
code=(old/'NativeRuntime.cs').read_text(encoding='utf-8')
code=code.replace('bool snapshotLost=false;', '''bool snapshotLost=false;var images=new Dictionary<uint,string>();
            var samples=new List<object>();long lastSample=-100;var milestones=new List<object>();
            bool helperInJob;Check(IsProcessInJob(GetCurrentProcess(),IntPtr.Zero,out helperInJob),"Inherited helper Job check");
            milestones.Add(Obj("event","JOB_CONFIGURED","utc",DateTime.UtcNow.ToString("o"),"wall_ms",clock.ElapsedMilliseconds));''')
code=code.replace('pinned.Add(pi.pid,pi.process);CloseHandle', 'milestones.Add(Obj("event","CREATED_SUSPENDED","utc",DateTime.UtcNow.ToString("o"),"wall_ms",clock.ElapsedMilliseconds));pinned.Add(pi.pid,pi.process);CloseHandle')
code=code.replace('assigned=true;bool inJob;', 'assigned=true;milestones.Add(Obj("event","ASSIGNED","utc",DateTime.UtcNow.ToString("o"),"wall_ms",clock.ElapsedMilliseconds));bool inJob;')
code=code.replace('resumed=true;', 'resumed=true;milestones.Add(Obj("event","RESUMED","utc",DateTime.UtcNow.ToString("o"),"wall_ms",clock.ElapsedMilliseconds));')
code=code.replace('if(rootExitAt==null&&WaitForSingleObject(pi.process,0)==0)rootExitAt=', '''if(samples.Count<128&&clock.ElapsedMilliseconds-lastSample>=50){lastSample=clock.ElapsedMilliseconds;var usage=JobGet<JOB_ACCOUNTING>(job,1);long sumU=0,sumK=0;foreach(var entry in pinned){long c,e,k,u;Check(GetProcessTimes(entry.Value,out c,out e,out k,out u),"Sample process CPU");sumU+=u;sumK+=k;}samples.Add(new object[]{lastSample,usage.userTime,usage.kernelTime,usage.periodUser,usage.periodKernel,usage.totalProcesses,usage.activeProcesses,sumU,sumK});}
                    foreach(var entry in pinned)if(!images.ContainsKey(entry.Key)){try{images.Add(entry.Key,BootstrapProcessImage(entry.Value));}catch{}}
                    if(rootExitAt==null&&WaitForSingleObject(pi.process,0)==0)rootExitAt=''')
code=code.replace('observations.Add(Obj("identity",Identity(entry.Value,entry.Key,false),', 'long pc,pe,pk,pu;Check(GetProcessTimes(entry.Value,out pc,out pe,out pk,out pu),"Final process CPU");observations.Add(Obj("image",images.ContainsKey(entry.Key)?images[entry.Key]:"UNAVAILABLE","user_cpu_100ns",pu,"kernel_cpu_100ns",pk,"identity",Identity(entry.Value,entry.Key,false),')
code=code.replace('return Obj("prepare_id",prepared==null?', '''var finalLimit=JobGet<EXTENDED_LIMIT>(job,9);return Obj("diagnostic_only",true,"os_version",Environment.OSVersion.VersionString,"helper_in_inherited_job",helperInJob,"milestones",milestones,"cpu_samples_columns",new[]{"wall_ms","job_user_100ns","job_kernel_100ns","period_user_100ns","period_kernel_100ns","historical_processes","active_processes","pinned_user_100ns","pinned_kernel_100ns"},"cpu_samples",samples,"final_job_flags",finalLimit.basic.flags,"final_job_time_100ns",finalLimit.basic.jobTime,"job_signaled",WaitForSingleObject(job,0)==0,"prepare_id",prepared==null?''')
if variant=='no-rate':
    code=code.replace('JobSet(job,15,new CPU_LIMIT{flags=1|4,rate=(uint)cpu});','')
    code=code.replace('actualCpu.flags==5&&actualCpu.rate==(uint)cpu','actualCpu.flags==0')
if variant=='per-process':
    code=code.replace('setting.basic.jobTime=(long)cpuMs*10000;', 'setting.basic.jobTime=(long)cpuMs*10000;setting.basic.flags|=2;setting.basic.processTime=(long)cpuMs*10000;')
(dest/'NativeRuntime.cs').write_text(code,encoding='utf-8',newline='\n')
meta={'purpose':'instrumentation only; unchanged job CPU budget; no software CPU enforcement','variant':variant,'source_sha256':hashlib.sha256((old/'NativeRuntime.cs').read_bytes()).hexdigest(),'diagnostic_sha256':hashlib.sha256((dest/'NativeRuntime.cs').read_bytes()).hexdigest()}
(dest.parent/('instrumentation-'+variant+'.json')).write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
print(json.dumps(meta))
