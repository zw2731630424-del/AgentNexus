using System;
using System.IO;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Reflection;
using System.Security.Cryptography;
using Microsoft.Win32.SafeHandles;
public static class Q42PublicToolLoader {
    [StructLayout(LayoutKind.Sequential)] private struct Info {
        public uint Attributes; public System.Runtime.InteropServices.ComTypes.FILETIME Created, Accessed, Written;
        public uint Volume, High, Low, Links, IndexHigh, IndexLow;
    }
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true, EntryPoint="CreateFileW")]
    private static extern SafeFileHandle Open(string path,uint access,uint share,IntPtr security,uint disposition,uint flags,IntPtr template);
    [DllImport("kernel32.dll",SetLastError=true)] private static extern bool GetFileInformationByHandle(SafeFileHandle handle,out Info info);
    private static SafeFileHandle Checked(string path,bool directory) {
        SafeFileHandle handle=Open(path,directory?0x81U:0x80000000U,1,IntPtr.Zero,3,directory?0x02200000U:0x00200000U,IntPtr.Zero);
        Info info;
        if(handle.IsInvalid || !GetFileInformationByHandle(handle,out info) || (info.Attributes&0x400)!=0 || (((info.Attributes&0x10)!=0)!=directory)) {
            handle.Dispose(); throw new IOException("LOCAL_NONREPARSE_TOOL_SNAPSHOT_REQUIRED");
        }
        return handle;
    }
    public static Assembly Load(string path,string expected) {
        if(path.Length<3 || !Char.IsLetter(path[0]) || path[1]!=':' || path[2]!='\\' || path.IndexOf(':',2)>=0) throw new IOException("LOCAL_TOOL_PATH_REQUIRED");
        DriveType drive=new DriveInfo(path.Substring(0,3)).DriveType;
        if(drive!=DriveType.Fixed && drive!=DriveType.Removable) throw new IOException("LOCAL_TOOL_DRIVE_REQUIRED");
        Stack<string> parents=new Stack<string>(); List<SafeFileHandle> locks=new List<SafeFileHandle>();
        for(string p=Path.GetDirectoryName(path); !String.IsNullOrEmpty(p); p=Path.GetDirectoryName(p)) parents.Push(p);
        try {
            foreach(string parent in parents) locks.Add(Checked(parent,true));
            using(SafeFileHandle handle=Checked(path,false)) using(FileStream stream=new FileStream(handle,FileAccess.Read)) {
                if(stream.Length<=0 || stream.Length>2097152) throw new IOException("TOOL_SIZE_REQUIRED");
                byte[] bytes=new byte[(int)stream.Length]; int done=0;
                while(done<bytes.Length) {int read=stream.Read(bytes,done,bytes.Length-done); if(read<=0) throw new IOException("TOOL_TRUNCATED"); done+=read;}
                using(SHA256 hash=SHA256.Create()) if(BitConverter.ToString(hash.ComputeHash(bytes)).Replace("-","").ToLowerInvariant()!=expected) throw new IOException("REVIEWED_TOOL_HASH_REQUIRED");
                return Assembly.Load(bytes);
            }
        } finally {foreach(SafeFileHandle handle in locks) handle.Dispose();}
    }
}