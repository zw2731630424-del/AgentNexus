// Read-only process-token observation. Does not adjust privileges, impersonate or alter a token.
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public static class ProcessTokenProbe {
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool OpenProcessToken(IntPtr process,uint access,out IntPtr token);
 [DllImport("advapi32.dll",SetLastError=true)] static extern bool GetTokenInformation(IntPtr token,int kind,IntPtr info,int size,out int needed);
 [DllImport("advapi32.dll")] static extern IntPtr GetSidSubAuthorityCount(IntPtr sid);
 [DllImport("advapi32.dll")] static extern IntPtr GetSidSubAuthority(IntPtr sid,uint index);
 static string Observe(uint pid) {
  IntPtr process=OpenProcess(0x1000,false,pid),token=IntPtr.Zero,info=IntPtr.Zero;
  if(process==IntPtr.Zero)throw new Exception("OPEN_PROCESS_"+Marshal.GetLastWin32Error());
  try {
   if(!OpenProcessToken(process,8,out token))throw new Exception("OPEN_TOKEN_"+Marshal.GetLastWin32Error());int needed;
   info=Marshal.AllocHGlobal(4096);
   if(!GetTokenInformation(token,20,info,4,out needed))throw new Exception("TOKEN_ELEVATION_"+Marshal.GetLastWin32Error());bool elevated=Marshal.ReadInt32(info)!=0;
   GetTokenInformation(token,25,IntPtr.Zero,0,out needed);if(needed<1||needed>4096)throw new Exception("TOKEN_INTEGRITY_SIZE");
   int actual;if(!GetTokenInformation(token,25,info,needed,out actual))throw new Exception("TOKEN_INTEGRITY_"+Marshal.GetLastWin32Error());
   IntPtr sid=Marshal.ReadIntPtr(info);byte count=Marshal.ReadByte(GetSidSubAuthorityCount(sid));if(count==0)throw new Exception();
   int integrity=Marshal.ReadInt32(GetSidSubAuthority(sid,(uint)(count-1)));
   return "{\"pid\":"+pid+",\"elevated\":"+(elevated?"true":"false")+",\"integrity\":"+integrity+"}";
  } finally { if(info!=IntPtr.Zero)Marshal.FreeHGlobal(info);if(token!=IntPtr.Zero)CloseHandle(token);CloseHandle(process); }
 }
 public static int Main(string[] args) { try {if(args.Length<1||args.Length>8)throw new Exception();var rows=new List<string>();foreach(string arg in args){uint pid;if(!uint.TryParse(arg,out pid)||pid==0)throw new Exception();rows.Add(Observe(pid));}Console.WriteLine("{\"observations\":["+string.Join(",",rows.ToArray())+"],\"read_only\":true,\"os_qualification\":\"NOT_RUN\"}");return 0;}catch(Exception e){Console.Error.WriteLine("PROCESS_OBSERVATION_FAILED_"+e.Message);return 78;} }
}
