[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$OutputDirectory)
# System operations are queries only. The only persistent writes are new Q2 evidence files.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$q2Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$out = [IO.Path]::GetFullPath($OutputDirectory)
if (-not $out.StartsWith($q2Root + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Q2_EVIDENCE_PATH_REQUIRED' }
if (Test-Path -LiteralPath $out) { throw 'EVIDENCE_DIRECTORY_ALREADY_EXISTS' }
[void][IO.Directory]::CreateDirectory($out)
$utf8 = [Text.UTF8Encoding]::new($false)
function Write-Json([string]$Name, $Value) {
    [IO.File]::WriteAllText((Join-Path $out $Name), ($Value | ConvertTo-Json -Depth 24), $utf8)
}
function Observe([scriptblock]$Action) {
    try { return [ordered]@{ status='OBSERVED'; value=(& $Action) } }
    catch { return [ordered]@{ status='INCONCLUSIVE'; error=$_.Exception.Message; error_id=$_.FullyQualifiedErrorId } }
}
function Native-Query([string]$Name, [string]$File, [string[]]$Arguments) {
    $result = (& $File @Arguments 2>&1 | Out-String)
    $exitCode = $LASTEXITCODE
    [IO.File]::WriteAllText((Join-Path $out ($Name + '.txt')), $result, $utf8)
    return [ordered]@{ executable=$File; arguments=$Arguments; exit_code=$exitCode; raw_file=($Name+'.txt'); output=$result }
}

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text;
public static class Q2ReadOnlyNative {
 [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 [DllImport("advapi32.dll", SetLastError=true)] static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
 [DllImport("advapi32.dll", SetLastError=true)] static extern bool GetTokenInformation(IntPtr token, int kind, IntPtr data, int length, out int needed);
 [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool LookupPrivilegeName(string system, ref Luid luid, StringBuilder name, ref int length);
 [StructLayout(LayoutKind.Sequential)] struct Luid { public uint Low; public int High; }
 [StructLayout(LayoutKind.Sequential)] struct LuidAttributes { public Luid Id; public uint Attributes; }
 static IntPtr Info(IntPtr token, int kind) {
   int n; GetTokenInformation(token,kind,IntPtr.Zero,0,out n);
   if(n<=0) throw new Win32Exception(Marshal.GetLastWin32Error());
   IntPtr p=Marshal.AllocHGlobal(n);
   if(!GetTokenInformation(token,kind,p,n,out n)){ int e=Marshal.GetLastWin32Error(); Marshal.FreeHGlobal(p); throw new Win32Exception(e); } return p;
 }
 static int Number(IntPtr token,int kind) { IntPtr p=Info(token,kind); try{return Marshal.ReadInt32(p);}finally{Marshal.FreeHGlobal(p);} }
 public static Dictionary<string,object> Token(uint pid) {
   IntPtr process=OpenProcess(0x1000,false,pid), token=IntPtr.Zero;
   if(process==IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
   try {
     if(!OpenProcessToken(process,8,out token))throw new Win32Exception(Marshal.GetLastWin32Error());
     var d=new Dictionary<string,object>(); d["pid"]=pid;
     IntPtr p=Info(token,1); try{d["user_sid"]=new SecurityIdentifier(Marshal.ReadIntPtr(p)).Value;}finally{Marshal.FreeHGlobal(p);}
     p=Info(token,25); try{d["integrity_sid"]=new SecurityIdentifier(Marshal.ReadIntPtr(p)).Value;}finally{Marshal.FreeHGlobal(p);}
     d["elevated"]=Number(token,20)!=0; d["elevation_type"]=Number(token,18); d["session_id"]=Number(token,12);
     d["is_appcontainer"]=Number(token,29)!=0; d["token_type"]=Number(token,8); d["ui_access"]=Number(token,26)!=0;
     var groups=new List<object>(); p=Info(token,2);
     try{int count=Marshal.ReadInt32(p); int stride=IntPtr.Size==8?16:8; int start=IntPtr.Size==8?8:4;
       for(int i=0;i<count;i++){IntPtr q=IntPtr.Add(p,start+i*stride);groups.Add(new Dictionary<string,object>{{"sid",new SecurityIdentifier(Marshal.ReadIntPtr(q)).Value},{"attributes",unchecked((uint)Marshal.ReadInt32(q,IntPtr.Size))}});}}
     finally{Marshal.FreeHGlobal(p);} d["groups"]=groups;
     var privileges=new List<object>();p=Info(token,3);
     try{int count=Marshal.ReadInt32(p);int stride=Marshal.SizeOf(typeof(LuidAttributes));
       for(int i=0;i<count;i++){var v=(LuidAttributes)Marshal.PtrToStructure(IntPtr.Add(p,4+i*stride),typeof(LuidAttributes));var b=new StringBuilder(256);int size=b.Capacity;
         if(!LookupPrivilegeName(null,ref v.Id,b,ref size))throw new Win32Exception(Marshal.GetLastWin32Error());
         privileges.Add(new Dictionary<string,object>{{"name",b.ToString()},{"attributes",v.Attributes},{"enabled",(v.Attributes&2)!=0}});}}
     finally{Marshal.FreeHGlobal(p);} d["privileges"]=privileges;return d;
   }finally{if(token!=IntPtr.Zero)CloseHandle(token);CloseHandle(process);}
 }
 [StructLayout(LayoutKind.Sequential)] struct LsaAttributes {public int Length;public IntPtr Root,ObjectName;public uint Attributes;public IntPtr Descriptor,Quality;}
 [StructLayout(LayoutKind.Sequential)] struct LsaString {public ushort Length,MaximumLength;public IntPtr Buffer;}
 [DllImport("advapi32.dll")] static extern uint LsaOpenPolicy(IntPtr system,ref LsaAttributes attrs,uint access,out IntPtr policy);
 [DllImport("advapi32.dll")] static extern uint LsaEnumerateAccountRights(IntPtr policy,byte[] sid,out IntPtr rights,out uint count);
 [DllImport("advapi32.dll")] static extern uint LsaNtStatusToWinError(uint status);
 [DllImport("advapi32.dll")] static extern uint LsaFreeMemory(IntPtr memory);
 [DllImport("advapi32.dll")] static extern uint LsaClose(IntPtr policy);
 public static Dictionary<string,object> AccountRights(string sidText) {
   var a=new LsaAttributes();a.Length=Marshal.SizeOf(typeof(LsaAttributes));IntPtr policy,rights=IntPtr.Zero;
   uint status=LsaOpenPolicy(IntPtr.Zero,ref a,0x801,out policy);var d=new Dictionary<string,object>();d["sid"]=sidText;d["open_win32_error"]=LsaNtStatusToWinError(status);
   if(status!=0){d["status"]="INCONCLUSIVE";return d;}
   try{var sid=new SecurityIdentifier(sidText);byte[] bytes=new byte[sid.BinaryLength];sid.GetBinaryForm(bytes,0);uint count;
     status=LsaEnumerateAccountRights(policy,bytes,out rights,out count);d["query_win32_error"]=LsaNtStatusToWinError(status);d["ntstatus_hex"]=status.ToString("x8");
     var names=new List<string>();if(status==0)for(int i=0;i<count;i++){var s=(LsaString)Marshal.PtrToStructure(IntPtr.Add(rights,i*Marshal.SizeOf(typeof(LsaString))),typeof(LsaString));names.Add(Marshal.PtrToStringUni(s.Buffer,s.Length/2));}
     d["explicit_rights"]=names;d["status"]=status==0?"OBSERVED":"INCONCLUSIVE";d["effective_service_logon_verified"]=false;return d;
   }finally{if(rights!=IntPtr.Zero)LsaFreeMemory(rights);LsaClose(policy);}
 }
}
'@

$targetService='AgentNexusCredential'
$targetSid='S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873'
$sc = 'C:\Windows\System32\sc.exe'
$commands=[Collections.Generic.List[object]]::new()
$commands.Add((Native-Query 'whoami-all' 'C:\Windows\System32\whoami.exe' @('/all')))
foreach($operation in @('queryex','qc','qsidtype','qprivs','sdshow','qfailure','qfailureflag','showsid')) {
    $commands.Add((Native-Query ('sc-'+$operation) $sc @($operation,$targetService)))
}
Write-Json 'native-command-results.json' $commands
$currentToken=Observe { [Q2ReadOnlyNative]::Token([uint32]$PID) }
$os=Observe { Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber,OSArchitecture,LastBootUpTime }
$version=Observe { Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' | Select-Object ProductName,DisplayVersion,CurrentBuild,CurrentBuildNumber,UBR,EditionID,InstallationType }
$uac=Observe { Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' | Select-Object EnableLUA,ConsentPromptBehaviorAdmin,ConsentPromptBehaviorUser,PromptOnSecureDesktop,EnableSecureUIAPaths,ValidateAdminCodeSignatures,EnableUIADesktopToggle }
$accounts=Observe { @(Get-LocalUser | Select-Object Name,@{n='sid';e={$_.SID.Value}},Enabled,PrincipalSource) }
$machineId=Observe {
    $guid=(Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Cryptography' -Name MachineGuid).MachineGuid
    $hash=[Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($guid.ToLowerInvariant()))
    [Convert]::ToHexString($hash).ToLowerInvariant()
}
$service=Observe { @(Get-CimInstance Win32_Service -Filter "Name='AgentNexusCredential'" | Select-Object Name,State,Status,StartMode,StartName,PathName,ServiceType,ProcessId) }
$serviceSid=Observe { ([Security.Principal.NTAccount]::new('NT SERVICE\AgentNexusCredential')).Translate([Security.Principal.SecurityIdentifier]).Value }
$pipe=Observe { @(Get-ChildItem -LiteralPath '\\.\pipe\' | Where-Object { $_.Name -eq 'AgentNexus.Credential.v1' } | Select-Object Name) }
$lsa=Observe { [Q2ReadOnlyNative]::AccountRights($targetSid) }
$processes=Observe {
    $found=@(Get-CimInstance Win32_Process -Filter "Name='explorer.exe' OR Name='AgentNexusCredential.exe' OR Name='pipe-client.exe' OR Name='trusted-credential-helper.exe' OR Name='credential-launcher.exe' OR Name='electron.exe' OR Name='node.exe'" |
      Where-Object { $_.Name -ne 'node.exe' -or $_.ExecutablePath -like '*AgentNexus*' })
    foreach($process in $found) {
        [ordered]@{ name=$process.Name; pid=$process.ProcessId; parent_pid=$process.ParentProcessId; session_id=$process.SessionId; image=$process.ExecutablePath; created_at=$process.CreationDate;
          token=(Observe { [Q2ReadOnlyNative]::Token([uint32]$process.ProcessId) }) }
    }
}
$aclRecords=[Collections.Generic.List[object]]::new()
foreach($path in @('C:\','C:\Program Files','C:\ProgramData','C:\Program Files\AgentNexus','C:\ProgramData\AgentNexusCredential','C:\ProgramData\AgentNexusCredential\qualification','C:\ProgramData\AgentNexusCredential\temp')) {
    $entry=Observe {
        if(-not(Test-Path -LiteralPath $path)) { return [ordered]@{path=$path;exists=$false;actual_acl=$null} }
        $item=Get-Item -LiteralPath $path -Force
        $acl=Get-Acl -LiteralPath $path
        $rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]) | ForEach-Object {
          [ordered]@{sid=$_.IdentityReference.Value;rights=[string]$_.FileSystemRights;mask=[long]$_.FileSystemRights;type=[string]$_.AccessControlType;inherited=$_.IsInherited;inheritance=[string]$_.InheritanceFlags;propagation=[string]$_.PropagationFlags}
        })
        [ordered]@{path=$path;exists=$true;attributes=[string]$item.Attributes;is_reparse=(($item.Attributes -band [IO.FileAttributes]::ReparsePoint)-ne 0);owner=$acl.Owner;dacl_protected=$acl.AreAccessRulesProtected;sddl=$acl.Sddl;sacl_and_mandatory_label='NOT_QUERIED_NO_PRIVILEGE_ENABLEMENT';rules=$rules}
    }
    $aclRecords.Add($entry)
}
Write-Json 'actual-acl-sddl.json' $aclRecords
Write-Json 'actual-process-tokens.json' ([ordered]@{collector=$currentToken;processes=$processes;actual_service_token_status='NOT_RUN_SERVICE_ABSENT'})
$runtime=[Collections.Generic.List[object]]::new()
foreach($path in @('D:\Nodejs\node.exe','C:\Program Files\PowerShell\7\pwsh.exe','C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe','C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe')) {
  $runtime.Add((Observe {
    if(-not(Test-Path -LiteralPath $path -PathType Leaf)){return [ordered]@{path=$path;exists=$false}}
    $f=Get-Item -LiteralPath $path;$sig=Get-AuthenticodeSignature -LiteralPath $path;$acl=Get-Acl -LiteralPath $path
    [ordered]@{path=$path;exists=$true;bytes=$f.Length;sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant();file_version=$f.VersionInfo.FileVersion;signature_status=[string]$sig.Status;signer_subject=$(if($sig.SignerCertificate){$sig.SignerCertificate.Subject}else{$null});owner=$acl.Owner;sddl=$acl.Sddl}
  }))
}
Write-Json 'runtime-candidates.json' $runtime
$report=[ordered]@{
 schema='agentnexus.q2.readonly-preflight.v1';checked_at_utc=[DateTime]::UtcNow.ToString('o');timezone='Asia/Shanghai';scope='QUALIFICATION_ONLY';system_mutations_executed=$false;
 os=$os;registry_version=$version;uac=$uac;collector_token=$currentToken;machine_id_sha256=$machineId;local_accounts=$accounts;
 target_service=$service;target_sid_resolution=$serviceSid;target_sid_precomputed=$targetSid;account_rights=$lsa;named_pipe_inventory=$pipe;
 service_token='NOT_RUN_SERVICE_ABSENT';service_process_tree='NOT_RUN_SERVICE_ABSENT';actual_pipe_security='NOT_RUN_PIPE_ABSENT';
 qualification='BLOCKED';real_keys_imported=0;provider_requests_sent=0;real_tokens=0;real_cost_usd=0;named_pipe_connected=$false;
 limitations=@('Read-only observations do not prove denied access.','No service token can be observed before an approved service start.','Existing sandbox accounts are inventory only, not approved test identities.','Actual loaded-module closure requires an approved running service.','LSA explicit rights do not establish effective logon rights without actual service token/groups.')
}
Write-Json 'preflight.json' $report
Write-Json 'collection-complete.json' ([ordered]@{completed=$true;checked_at_utc=$report.checked_at_utc;system_mutations=$false})
Write-Output ([ordered]@{output_directory=$out;checked_at_utc=$report.checked_at_utc;qualification=$report.qualification;system_mutations_executed=$false;collector_token=$currentToken;target_service=$service} | ConvertTo-Json -Depth 5)
