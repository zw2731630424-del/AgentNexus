// Original, fixed-purpose Win32 probe. This is not a deployable security sandbox.
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text;
using System.Threading;
using Microsoft.Win32.SafeHandles;

public static class AgentNexusNativeProbe {
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetProcessTimes(IntPtr h, out long created, out long exited, out long kernel, out long user);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool ProcessIdToSessionId(uint pid, out uint session);
    [DllImport("advapi32.dll", SetLastError=true)] static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
    [DllImport("advapi32.dll", SetLastError=true)] static extern bool CreateRestrictedToken(IntPtr token, uint flags, uint disableCount, IntPtr disable, uint deleteCount, IntPtr delete, uint restrictedCount, IntPtr restricted, out IntPtr result);
    [DllImport("advapi32.dll")] static extern bool IsTokenRestricted(IntPtr token);
    [StructLayout(LayoutKind.Sequential)] struct SID_AND_ATTRIBUTES { public IntPtr sid; public uint attributes; }
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateJobObjectW(IntPtr security, string name);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job, int kind, IntPtr data, uint bytes);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr job, int kind, IntPtr data, uint bytes, out uint returned);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateJobObject(IntPtr job, uint code);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateProcess(IntPtr process, uint code);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint WaitForSingleObject(IntPtr handle, uint ms);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process, out uint code);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcessW(string app, StringBuilder command, IntPtr processSecurity, IntPtr threadSecurity, bool inherit, uint flags, IntPtr environment, string cwd, ref STARTUPINFO startup, out PROCESS_INFORMATION process);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetNamedPipeClientProcessId(SafePipeHandle pipe, out uint pid);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetNamedPipeClientSessionId(SafePipeHandle pipe, out uint session);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateNamedPipeW(string name, uint openMode, uint pipeMode, uint instances, uint outBytes, uint inBytes, uint timeout, ref SECURITY_ATTRIBUTES security);
    [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool ConvertStringSecurityDescriptorToSecurityDescriptorW(string sddl, uint revision, out IntPtr sd, out uint size);
    [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr mem);
    [StructLayout(LayoutKind.Sequential)] struct SECURITY_ATTRIBUTES { public int size; public IntPtr descriptor; public bool inherit; }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct STARTUPINFO { public uint cb; public string reserved, desktop, title; public uint x,y,xSize,ySize,xChars,yChars,fill,flags; public ushort show,reservedSize; public IntPtr reserved2,input,output,error; }
    [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr process, thread; public uint pid, tid; }
    [StructLayout(LayoutKind.Sequential)] struct BASIC_LIMIT { public long processTime,jobTime; public uint flags; public UIntPtr minWorking,maxWorking; public uint processes; public UIntPtr affinity; public uint priority,scheduling; }
    [StructLayout(LayoutKind.Sequential)] struct IO_COUNTERS { public ulong readOps,writeOps,otherOps,readBytes,writeBytes,otherBytes; }
    [StructLayout(LayoutKind.Sequential)] struct EXTENDED_LIMIT { public BASIC_LIMIT basic; public IO_COUNTERS io; public UIntPtr processMemory,jobMemory,peakProcess,peakJob; }
    static void Check(bool ok, string operation) { if (!ok) throw new Win32Exception(Marshal.GetLastWin32Error(),operation); }
    static Dictionary<string,object> Obj(params object[] items) { var d=new Dictionary<string,object>(); for(int i=0;i<items.Length;i+=2)d[(string)items[i]]=items[i+1]; return d; }
    static string Quote(string s) { if(s.IndexOf('"')>=0 || s.EndsWith("\\")) throw new ArgumentException("Probe path spelling"); return "\""+s+"\""; }
    static Dictionary<string,object> Identity(IntPtr process, uint pid) {
        long created,exited,kernel,user; Check(GetProcessTimes(process,out created,out exited,out kernel,out user),"GetProcessTimes");
        uint session; Check(ProcessIdToSessionId(pid,out session),"ProcessIdToSessionId");
        IntPtr token; Check(OpenProcessToken(process,8,out token),"OpenProcessToken");
        string sid; try { using(var wi=new WindowsIdentity(token)) sid=wi.User.Value; } finally { CloseHandle(token); }
        return Obj("os","windows","principal",sid,"pid",pid,"start_id",created.ToString(),"os_session",session.ToString());
    }
    static uint[] Members(IntPtr job) {
        IntPtr data=Marshal.AllocHGlobal(8+16*IntPtr.Size);
        try { uint returned; Check(QueryInformationJobObject(job,3,data,(uint)(8+16*IntPtr.Size),out returned),"Job process IDs");
            int assigned=Marshal.ReadInt32(data),count=Marshal.ReadInt32(data,4);
            if(count<0||count>16||assigned!=count) throw new InvalidOperationException("Incomplete Job membership");
            var result=new uint[count]; for(int i=0;i<count;i++) result[i]=(uint)Marshal.ReadIntPtr(data,8+i*IntPtr.Size).ToInt64(); return result;
        } finally { Marshal.FreeHGlobal(data); }
    }
    public static object JobProbe(string node, string fixture, string mode) {
        if(mode!="normal" && mode!="hold" && mode!="orphan")throw new ArgumentException("fixed probe mode");
        IntPtr job=CreateJobObjectW(IntPtr.Zero,null); Check(job!=IntPtr.Zero,"CreateJobObject");
        PROCESS_INFORMATION pi=new PROCESS_INFORMATION(); var handles=new Dictionary<uint,IntPtr>(); var members=new List<object>();
        bool assigned=false; string termination=null; int activeBefore=-1; bool rootBefore=false;
        try {
            var limits=new EXTENDED_LIMIT(); limits.basic.flags=0x2000|0x8|0x100|0x200; limits.basic.processes=4;
            limits.processMemory=(UIntPtr)(256UL*1024*1024); limits.jobMemory=(UIntPtr)(512UL*1024*1024);
            IntPtr data=Marshal.AllocHGlobal(Marshal.SizeOf<EXTENDED_LIMIT>());
            try { Marshal.StructureToPtr(limits,data,false); Check(SetInformationJobObject(job,9,data,(uint)Marshal.SizeOf<EXTENDED_LIMIT>()),"Set Job limits"); } finally { Marshal.FreeHGlobal(data); }
            var si=new STARTUPINFO(); si.cb=(uint)Marshal.SizeOf<STARTUPINFO>(); si.flags=1; si.show=0;
            string win=Environment.GetFolderPath(Environment.SpecialFolder.Windows);
            IntPtr environment=Marshal.StringToHGlobalUni("SystemRoot="+win+"\0WINDIR="+win+"\0\0");
            try { Check(CreateProcessW(node,new StringBuilder(Quote(node)+" "+Quote(fixture)+" "+mode),IntPtr.Zero,IntPtr.Zero,false,0x4|0x400|0x8000000,environment,Path.GetDirectoryName(fixture),ref si,out pi),"CreateProcess suspended"); }
            finally { Marshal.FreeHGlobal(environment); }
            handles.Add(pi.pid,pi.process); var root=Identity(pi.process,pi.pid);
            Check(AssignProcessToJobObject(job,pi.process),"Assign suspended process"); assigned=true;
            Check(ResumeThread(pi.thread)!=0xffffffff,"ResumeThread");
            var watch=Stopwatch.StartNew();
            while(watch.ElapsedMilliseconds<2000) {
                var ids=Members(job);
                foreach(uint pid in ids) if(!handles.ContainsKey(pid)) { IntPtr h=OpenProcess(0x100000|0x1000,false,pid); Check(h!=IntPtr.Zero,"Pin child process"); handles.Add(pid,h); }
                rootBefore=WaitForSingleObject(pi.process,0)==0; activeBefore=ids.Length;
                if(mode=="normal" && activeBefore==0)break;
                if(mode=="orphan" && rootBefore && activeBefore>0)break;
                if(mode=="hold" && watch.ElapsedMilliseconds>300)break;
                Thread.Sleep(10);
            }
            if(activeBefore>0) { termination=DateTime.UtcNow.ToString("o"); Check(TerminateJobObject(job,77),"TerminateJobObject"); }
            watch.Restart(); while(Members(job).Length!=0 && watch.ElapsedMilliseconds<3000)Thread.Sleep(10);
            bool empty=Members(job).Length==0;
            foreach(var handle in handles.Values) WaitForSingleObject(handle,3000);
            foreach(var item in handles) { uint code; Check(GetExitCodeProcess(item.Value,out code),"GetExitCodeProcess"); members.Add(Obj("process",Identity(item.Value,item.Key),"exited",WaitForSingleObject(item.Value,0)==0,"exit_code",code)); }
            return Obj("probe","job-"+mode,"root",root,"members",members,"active_before_termination",activeBefore,"root_exited_before_termination",rootBefore,
                "termination_requested_at",termination,"tree_empty_observed",empty,"root_exit_observed",WaitForSingleObject(pi.process,0)==0,
                "membership_complete",false,"source","WINDOWS_PRIMITIVE","release_authority",false,"job_flags",limits.basic.flags,"observed_at",DateTime.UtcNow.ToString("o"));
        } finally {
            if(assigned) { TerminateJobObject(job,78); var until=Stopwatch.StartNew(); while(Members(job).Length>0&&until.ElapsedMilliseconds<3000)Thread.Sleep(10); }
            else if(pi.process!=IntPtr.Zero) { TerminateProcess(pi.process,78); WaitForSingleObject(pi.process,3000); }
            foreach(var h in handles.Values) CloseHandle(h); if(pi.thread!=IntPtr.Zero)CloseHandle(pi.thread); CloseHandle(job);
        }
    }
    public static object RestrictedTokenProbe() {
        using(var self=Process.GetCurrentProcess()) { IntPtr token,restricted;
            Check(OpenProcessToken(self.Handle,0x2|0x8|0x1,out token),"Open own token");
            var sid=WindowsIdentity.GetCurrent().User; var bytes=new byte[sid.BinaryLength]; sid.GetBinaryForm(bytes,0);
            IntPtr sidMemory=Marshal.AllocHGlobal(bytes.Length), list=Marshal.AllocHGlobal(Marshal.SizeOf<SID_AND_ATTRIBUTES>());
            Marshal.Copy(bytes,0,sidMemory,bytes.Length); var entry=new SID_AND_ATTRIBUTES(); entry.sid=sidMemory; Marshal.StructureToPtr(entry,list,false);
            try { Check(CreateRestrictedToken(token,1,0,IntPtr.Zero,0,IntPtr.Zero,1,list,out restricted),"CreateRestrictedToken");
                try { return Obj("probe","restricted-token","token_restricted",IsTokenRestricted(restricted),"worker_launched",false,"release_authority",false); } finally { CloseHandle(restricted); }
            } finally { Marshal.FreeHGlobal(list); Marshal.FreeHGlobal(sidMemory); CloseHandle(token); }
        }
    }
    public static object PipeProbe(string node, string fixture, bool authorizeClient) {
        string name="AgentNexus-probe-"+Guid.NewGuid().ToString("N"), sid=WindowsIdentity.GetCurrent().User.Value;
        IntPtr sd; uint size; Check(ConvertStringSecurityDescriptorToSecurityDescriptorW("D:P(A;;GA;;;"+sid+")",1,out sd,out size),"Private pipe descriptor");
        SafePipeHandle safe;
        try { var sa=new SECURITY_ATTRIBUTES(); sa.size=Marshal.SizeOf<SECURITY_ATTRIBUTES>(); sa.descriptor=sd; sa.inherit=false;
            IntPtr pipe=CreateNamedPipeW("\\\\.\\pipe\\"+name,0x3|0x40000000|0x80000,0x8,1,4096,4096,0,ref sa);
            Check(pipe!=new IntPtr(-1),"Create private local pipe"); safe=new SafePipeHandle(pipe,true);
        } finally { LocalFree(sd); }
        using(safe) using(var server=new NamedPipeServerStream(PipeDirection.InOut,true,false,safe)) using(var cancel=new CancellationTokenSource(8000)) {
            var waiting=server.WaitForConnectionAsync(cancel.Token);
            var start=new ProcessStartInfo(node); start.UseShellExecute=false; start.CreateNoWindow=true; start.RedirectStandardError=true;
            start.ArgumentList.Add(fixture); start.ArgumentList.Add("pipe"); start.ArgumentList.Add(name); start.Environment.Clear();
            start.Environment["SystemRoot"]=Environment.GetFolderPath(Environment.SpecialFolder.Windows);
            using(var child=Process.Start(start)) {
                try {
                    try { waiting.GetAwaiter().GetResult(); }
                    catch { if(child.HasExited) { var error=new char[2048]; int read=child.StandardError.Read(error,0,error.Length); throw new InvalidOperationException("Pipe child exit "+child.ExitCode+": "+new string(error,0,read)); } throw; }
                    uint pid,session;
                    Check(GetNamedPipeClientProcessId(server.SafePipeHandle,out pid),"Pipe peer PID"); Check(GetNamedPipeClientSessionId(server.SafePipeHandle,out session),"Pipe peer session");
                    IntPtr h=OpenProcess(0x100000|0x1000,false,pid); Check(h!=IntPtr.Zero,"Pin pipe peer");
                    try {
                        var peer=Identity(h,pid); var expected=authorizeClient ? Identity(child.Handle,(uint)child.Id) : Identity(Process.GetCurrentProcess().Handle,(uint)Process.GetCurrentProcess().Id);
                        var buffer=new byte[1024]; int n=server.ReadAsync(buffer,0,buffer.Length,cancel.Token).GetAwaiter().GetResult();
                        bool match=pid==(uint)child.Id && (uint)expected["pid"]==pid && (string)expected["start_id"]==(string)peer["start_id"] && (string)expected["principal"]==(string)peer["principal"] && (string)expected["os_session"]==session.ToString();
                        server.WriteByte(1); server.Flush();
                        if(!child.WaitForExit(3000))throw new InvalidOperationException("Pipe child exit unverified");
                        return Obj("probe",authorizeClient?"pipe-authorized":"pipe-foreign-process","peer",peer,"expected",expected,"peer_authenticated",match,
                            "untrusted_claim",Encoding.UTF8.GetString(buffer,0,n),"remote_clients_rejected",true,"child_exit_code",child.ExitCode,"source","WINDOWS_PRIMITIVE");
                    } finally { CloseHandle(h); }
                } finally { if(!child.HasExited) { child.Kill(true); child.WaitForExit(3000); } }
            }
        }
    }
}
