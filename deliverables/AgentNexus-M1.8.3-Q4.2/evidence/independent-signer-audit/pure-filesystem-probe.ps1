param([Parameter(Mandatory=$true)][string]$BundleRoot,[Parameter(Mandatory=$true)][string]$NewWorkRoot)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
if(Test-Path -LiteralPath $NewWorkRoot){throw 'INDEPENDENT_PROBE_WORKROOT_MUST_BE_NEW'}
[void][IO.Directory]::CreateDirectory($NewWorkRoot)
trap{
    [IO.File]::WriteAllText((Join-Path $NewWorkRoot 'probe-error.txt'),($_.Exception.ToString()+"`n"+$_.ScriptStackTrace),[Text.UTF8Encoding]::new($false))
    throw
}
$assembly=[Reflection.Assembly]::Load([IO.File]::ReadAllBytes((Join-Path $BundleRoot 'signer\AgentNexus.Qualification.Signer.exe')))
$flags=[Reflection.BindingFlags]'Instance,NonPublic'
$static=[Reflection.BindingFlags]'Static,NonPublic'
$outputType=$assembly.GetType('AgentNexus.CredentialBoundary.AtomicOutput',$true)
$directoryType=$assembly.GetType('AgentNexus.CredentialBoundary.LocalDirectory',$true)
$bundleType=$assembly.GetType('AgentNexus.CredentialBoundary.QualificationBundle',$true)
$results=[Collections.Generic.List[object]]::new()
function Assert-Probe([string]$Name,[bool]$Condition,[object]$Details){
    $results.Add([ordered]@{id=$Name;status=$(if($Condition){'PASS'}else{'FAIL'});details=$Details})
    if(-not $Condition){throw ('INDEPENDENT_PROBE_FAILED:'+ $Name)}
}
function Invoke-Internal([object]$Value,[string]$Method,[object[]]$Parameters){
    $Value.GetType().GetMethod($Method,$flags).Invoke($Value,$Parameters)
}
function New-Output([string]$Path){[Activator]::CreateInstance($outputType,$flags,$null,[object[]]@($Path),$null)}
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public sealed class AuditMappedFile : IDisposable {
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern SafeFileHandle CreateFileMapping(SafeFileHandle file, IntPtr security, uint protection, uint high, uint low, string name);
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr MapViewOfFile(SafeFileHandle mapping, uint access, uint high, uint low, UIntPtr bytes);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool UnmapViewOfFile(IntPtr view);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true, EntryPoint="CreateFileW")] static extern SafeFileHandle OpenFile(string path, uint access, uint share, IntPtr security, uint disposition, uint flags, IntPtr template);
    SafeFileHandle mapping; IntPtr view;
    public AuditMappedFile(string path) {
        using(FileStream input=new FileStream(path,FileMode.Open,FileAccess.ReadWrite,FileShare.ReadWrite)) {
            mapping=CreateFileMapping(input.SafeFileHandle,IntPtr.Zero,4,0,0,null);
            if(mapping.IsInvalid) throw new IOException("MAP_CREATE:"+Marshal.GetLastWin32Error());
            view=MapViewOfFile(mapping,2,0,0,UIntPtr.Zero);
            if(view==IntPtr.Zero) throw new IOException("MAP_VIEW:"+Marshal.GetLastWin32Error());
        }
    }
    public void Mutate(){Marshal.WriteByte(view,(byte)(Marshal.ReadByte(view)^1));}
    public static int DirectoryWriterError(string path) {
        using(SafeFileHandle handle=OpenFile(path,0x40000000,3,IntPtr.Zero,3,0x02200000,IntPtr.Zero)) return handle.IsInvalid?Marshal.GetLastWin32Error():0;
    }
    public static int FileReaderError(string path) {
        using(SafeFileHandle handle=OpenFile(path,0x80000000,1,IntPtr.Zero,3,0x00200000,IntPtr.Zero)) return handle.IsInvalid?Marshal.GetLastWin32Error():0;
    }
    public void Dispose(){if(view!=IntPtr.Zero){UnmapViewOfFile(view);view=IntPtr.Zero;}if(mapping!=null)mapping.Dispose();}
}
'@

# Inspect the actual release PE: no diagnostic callback or diagnostic entry type.
$q=$assembly.GetType('AgentNexus.CredentialBoundary.QualificationBundle',$true)
Assert-Probe 'release-no-publication-callback' ($null -eq $q.GetField('PublicationProbe',$static)) 'Reflection-only; release assembly entry point not invoked'
Assert-Probe 'release-no-contract-harness-type' ($null -eq $assembly.GetType('AgentNexus.CredentialBoundary.ContractHarness',$false)) 'Diagnostic harness absent from release Signer'

# Empty-directory protection must deny a write handle, not merely deny rename.
$empty=Join-Path $NewWorkRoot 'empty'
$output=New-Output $empty
try{
    $errorCode=[AuditMappedFile]::DirectoryWriterError($empty)
    Assert-Probe 'release-empty-directory-writer-denied' ($errorCode -eq 32) ([ordered]@{win32_error=$errorCode;expected=32})
    [void](Invoke-Internal $output 'Check' @())
}finally{$output.Dispose()}
Assert-Probe 'directory-writer-control-after-release' ([AuditMappedFile]::DirectoryWriterError($empty) -eq 0) 'Same path and token; only the directory lock has been released'

$complete=Join-Path $NewWorkRoot 'complete'
$output=New-Output $complete
try{
    [void](Invoke-Internal $output 'Write' ([object[]]@('nested/input.bin',[Text.Encoding]::UTF8.GetBytes('immutable snapshot'))))
    $writeDenied=$false;$renameDenied=$false
    try{[IO.File]::WriteAllText((Join-Path $complete 'nested\input.bin'),'attacker')}catch [IO.IOException]{$writeDenied=$true}
    try{[IO.Directory]::Move($complete,$complete+'.moved')}catch [IO.IOException]{$renameDenied=$true}
    Assert-Probe 'release-output-file-write-denied' $writeDenied 'FileShare.Read; existing output remains unchanged'
    Assert-Probe 'release-output-root-rename-denied' $renameDenied 'Directory handles remain held'
    [void](Invoke-Internal $output 'Check' @())
}finally{$output.Dispose()}

# Existing PUBLIC simulated fixture copied to a new probe-only path. No new signature is created.
$summary=Get-Content -LiteralPath (Join-Path $BundleRoot 'evidence\signing-tests.json') -Raw | ConvertFrom-Json
$fixtureInput=Get-Content -LiteralPath (Join-Path $summary.run 'exported-bundle-reverified.input.json') -Raw | ConvertFrom-Json
$copy=Join-Path $NewWorkRoot 'mapped-fixture'
Copy-Item -LiteralPath $fixtureInput.root -Destination $copy -Recurse
$candidate=$null
try{
    $constructor=$bundleType.GetConstructor($flags,$null,[type[]]@([string]),$null)
    $candidate=$constructor.Invoke([object[]]@([string]$copy))
    $plan=Get-Content -LiteralPath (Join-Path $copy 'approval\qualification-plan.json') -Raw | ConvertFrom-Json
    [void](Invoke-Internal $candidate 'Candidate' ([object[]]@($plan.machine_id,$plan.operator_sid,[DateTime]::UtcNow,$true)))
    $before=[byte[]](Invoke-Internal $candidate 'Bytes' ([object[]]@('payload/app/package.json',1048576)))
    $callerClone=[byte[]](Invoke-Internal $candidate 'Bytes' ([object[]]@('payload/app/package.json',1048576)))
    $callerClone[0]=$callerClone[0] -bxor 1
    $again=[byte[]](Invoke-Internal $candidate 'Bytes' ([object[]]@('payload/app/package.json',1048576)))
    Assert-Probe 'release-snapshot-return-is-clone' ([Convert]::ToBase64String($before) -ceq [Convert]::ToBase64String($again)) 'Caller mutation does not affect internal snapshot'
}finally{if($null -ne $candidate){$candidate.Dispose()}}
$candidate=$null;$mapped=$null
try{
    $mappedPath=Join-Path $copy 'payload\app\package.json'
    $mapped=[AuditMappedFile]::new($mappedPath)
    $readerError=[AuditMappedFile]::FileReaderError($mappedPath)
    if($readerError -ne 0){
        Assert-Probe 'preexisting-mapping-read-open-denied' ($readerError -eq 32) ([ordered]@{win32_error=$readerError;note='Host rejects a sharing-compatible read acquisition while a writable mapping exists; post-acquisition mutation branch was not reached'})
    }else{
        $constructor=$bundleType.GetConstructor($flags,$null,[type[]]@([string]),$null)
        $candidate=$constructor.Invoke([object[]]@([string]$copy))
        [void](Invoke-Internal $candidate 'Candidate' ([object[]]@($plan.machine_id,$plan.operator_sid,[DateTime]::UtcNow,$true)))
        $before=[byte[]](Invoke-Internal $candidate 'Bytes' ([object[]]@('payload/app/package.json',1048576)))
        $mapped.Mutate()
        $after=[byte[]](Invoke-Internal $candidate 'Bytes' ([object[]]@('payload/app/package.json',1048576)))
        Assert-Probe 'release-preexisting-mapping-cannot-change-snapshot' ([Convert]::ToBase64String($before) -ceq [Convert]::ToBase64String($after)) 'Writable mapping existed before snapshot and original file handle was closed'
        $denied=$false;$observed=''
        try{[void](Invoke-Internal $candidate 'RecheckSources' @())}catch{$observed=$_.Exception.ToString();$denied=$observed.Contains('SNAPSHOT_SOURCE_CHANGED')}
        Assert-Probe 'release-recheck-detects-mapped-source-change' $denied $observed
    }
}finally{if($null -ne $candidate){$candidate.Dispose()};if($null -ne $mapped){$mapped.Dispose()}}
Assert-Probe 'mapped-file-reader-control-after-release' ([AuditMappedFile]::FileReaderError($mappedPath) -eq 0) 'Mapping released; same path and token permit reader open'

$result=[ordered]@{status='PASS';checks=$results;new_signatures_created=$false;user_key_access=$false;certificate_store_modified=$false;service_or_acl_operations=$false;actual_cng='NOT_RUN';scope='PURE_FILESYSTEM_ON_NEW_PROBE_PATHS_AND_EXISTING_PUBLIC_SIMULATED_FIXTURE'}
[IO.File]::WriteAllText((Join-Path $NewWorkRoot 'probe-result.json'),($result|ConvertTo-Json -Depth 12),[Text.UTF8Encoding]::new($false))
$result|ConvertTo-Json -Depth 12
