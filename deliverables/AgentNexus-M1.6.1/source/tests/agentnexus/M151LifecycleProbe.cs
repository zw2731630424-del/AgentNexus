// Test fixture only. Controls only caller-supplied synthetic processes after
// matching their kernel creation time on a retained handle. No release authority.
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.ComponentModel;
using System.Collections.Generic;
public static class M151LifecycleProbe {
    [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
    [DllImport("kernel32.dll",SetLastError=true)] public static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetProcessTimes(IntPtr handle,out long created,out long exited,out long kernel,out long user);
    [DllImport("kernel32.dll",SetLastError=true)] static extern uint WaitForSingleObject(IntPtr handle,uint ms);
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateProcess(IntPtr handle,uint code);
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcessW(string app,StringBuilder command,IntPtr ps,IntPtr ts,bool inherit,uint flags,IntPtr env,string cwd,ref STARTUPINFO startup,out PROCESS_INFORMATION process);
    [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct STARTUPINFO {public uint cb;public string reserved,desktop,title;public uint x,y,xSize,ySize,xChars,yChars,fill,flags;public ushort show,reservedSize;public IntPtr reserved2,input,output,error;}
    [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION {public IntPtr process,thread;public uint pid,tid;}
    public static IntPtr Pin(uint pid,string expected) {
        IntPtr handle=OpenProcess(0x1000|0x100000,false,pid);
        if(handle==IntPtr.Zero)throw new Win32Exception(Marshal.GetLastWin32Error());
        try{long c,e,k,u;if(!GetProcessTimes(handle,out c,out e,out k,out u))throw new Win32Exception(Marshal.GetLastWin32Error());if(c.ToString()!=expected)throw new InvalidOperationException("PROCESS_IDENTITY_MISMATCH");return handle;}
        catch{CloseHandle(handle);throw;}
    }
    public static bool Exited(IntPtr handle,uint ms){return WaitForSingleObject(handle,ms)==0;}
    public static object Breakaway(string executable,string fixture){
        if(executable.Contains("\"")||fixture.Contains("\""))throw new ArgumentException("Fixed path spelling");
        var si=new STARTUPINFO();si.cb=(uint)Marshal.SizeOf<STARTUPINFO>();var pi=new PROCESS_INFORMATION();
        bool created=CreateProcessW(executable,new StringBuilder("\""+executable+"\" \""+fixture+"\" hold"),IntPtr.Zero,IntPtr.Zero,false,0x01000000|0x08000000,IntPtr.Zero,null,ref si,out pi);
        int error=created?0:Marshal.GetLastWin32Error();bool cleanup=!created;
        if(created){try{cleanup=TerminateProcess(pi.process,125)&&Exited(pi.process,3000);}finally{CloseHandle(pi.thread);CloseHandle(pi.process);}}
        return new Dictionary<string,object>{{"created",created},{"win32_error",error},{"unexpected_child_cleanup_observed",cleanup},{"release_authority",false}};
    }
}
