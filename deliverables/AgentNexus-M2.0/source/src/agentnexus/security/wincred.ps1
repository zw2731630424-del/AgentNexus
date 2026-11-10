$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$stage = 'COMPILE'
try {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class NexusWinCred {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
 public struct Credential {
  public uint Flags; public uint Type; public string TargetName; public string Comment;
  public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
  public uint CredentialBlobSize; public IntPtr CredentialBlob; public uint Persist;
  public uint AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
 }
 [DllImport("Advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
 static extern bool Write(ref Credential c, uint flags);
 [DllImport("Advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
 static extern bool Read(string target,uint type,uint flags,out IntPtr c);
 [DllImport("Advapi32.dll", EntryPoint="CredDeleteW", CharSet=CharSet.Unicode, SetLastError=true)]
 static extern bool Delete(string target,uint type,uint flags);
 [DllImport("Advapi32.dll")] static extern void CredFree(IntPtr p);
 public static void Put(string target,byte[] value) {
  IntPtr p=Marshal.AllocHGlobal(value.Length);
  try { Marshal.Copy(value,0,p,value.Length); var c=new Credential {Type=1,TargetName=target,CredentialBlobSize=(uint)value.Length,CredentialBlob=p,Persist=2,UserName="AgentNexus"}; if(!Write(ref c,0)) throw new Exception("CRED_WRITE_FAILED_"+Marshal.GetLastWin32Error()); }
  finally { for(int i=0;i<value.Length;i++) Marshal.WriteByte(p,i,0); Marshal.FreeHGlobal(p); Array.Clear(value,0,value.Length); }
 }
 public static byte[] Get(string target) {
  IntPtr p; if(!Read(target,1,0,out p)) throw new Exception("CRED_READ_FAILED_"+Marshal.GetLastWin32Error());
  try { var c=(Credential)Marshal.PtrToStructure(p,typeof(Credential)); if(c.CredentialBlobSize>2560) throw new Exception("CRED_SIZE"); byte[] v=new byte[c.CredentialBlobSize]; Marshal.Copy(c.CredentialBlob,v,0,v.Length); return v; } finally { CredFree(p); }
 }
 public static void Remove(string target) { if(!Delete(target,1,0) && Marshal.GetLastWin32Error()!=1168) throw new Exception("CRED_DELETE_FAILED_"+Marshal.GetLastWin32Error()); }
}
'@
    $stage = 'INPUT'
    $inputStream = [Console]::OpenStandardInput()
    $buffer = New-Object byte[] 8193
    $count = 0
    while (($n = $inputStream.Read($buffer, $count, $buffer.Length - $count)) -gt 0) { $count += $n; if ($count -ge $buffer.Length) { throw 'INPUT_LIMIT' } }
    $request = [Text.Encoding]::UTF8.GetString($buffer, 0, $count) | ConvertFrom-Json
    [Array]::Clear($buffer, 0, $buffer.Length)
    if ($request.target -cnotmatch '^AgentNexus:M2:[a-f0-9]{32}:[a-f0-9-]{36}$') { throw 'TARGET' }
    $stage = 'NATIVE_' + $request.operation
    switch ($request.operation) {
      'WRITE' { $value = [Convert]::FromBase64String($request.blob); if ($value.Length -lt 1 -or $value.Length -gt 2560) { throw 'SIZE' }; [NexusWinCred]::Put($request.target,$value) }
      'READ' { $value=[NexusWinCred]::Get($request.target); [Console]::OpenStandardOutput().Write($value,0,$value.Length); [Array]::Clear($value,0,$value.Length) }
      'DELETE' { [NexusWinCred]::Remove($request.target) }
      default { throw 'OPERATION' }
    }
    $request = $null
    exit 0
} catch { $native = $_.Exception.InnerException; $diagnostic = if ($native -and $native.Message -match '^CRED_[A-Z_]+_[0-9]+$') { $native.Message } elseif ($native) { $native.GetType().Name } else { $_.Exception.GetType().Name }; [Console]::Error.Write('SECURITY_OS_STORAGE_FAILED_' + $stage + '_' + $diagnostic); exit 1 }
