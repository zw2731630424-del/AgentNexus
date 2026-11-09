[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
# Read-only. No certificate creation/trust, key handles, ACL writes, SCM writes,
# elevation, pipe connection, Provider or user-key operation.
$base=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$workspace=[IO.Path]::GetFullPath((Join-Path $base '..\..'))
$out=Join-Path $workspace ('.workflow-kit\runtime\AgentNexus-M1.8.3-Q4.1\host-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffffffZ'))
[void][IO.Directory]::CreateDirectory($out)
$utf8=[Text.UTF8Encoding]::new($false)
function Save([string]$Name,$Value) { [IO.File]::WriteAllText((Join-Path $out $Name),($Value | ConvertTo-Json -Depth 24),$utf8) }
$identity=[Security.Principal.WindowsIdentity]::GetCurrent()
$version=Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
$guid=(Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Cryptography' -Name MachineGuid).MachineGuid.ToLowerInvariant()
$machine=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($utf8.GetBytes($guid))).ToLowerInvariant()
$query=@(& 'C:\Windows\System32\sc.exe' queryex AgentNexusCredential 2>&1); $queryExit=$LASTEXITCODE
$showSid=@(& 'C:\Windows\System32\sc.exe' showsid AgentNexusCredential 2>&1); $sidExit=$LASTEXITCODE
$certificates=@(foreach($store in @('Cert:\CurrentUser\My','Cert:\LocalMachine\My')) { foreach($cert in Get-ChildItem -LiteralPath $store) { [ordered]@{store=$store;subject=$cert.Subject;der_sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($cert.RawData)).ToLowerInvariant();not_before_utc=$cert.NotBefore.ToUniversalTime().ToString('o');not_after_utc=$cert.NotAfter.ToUniversalTime().ToString('o');has_private_key_metadata_only=$cert.HasPrivateKey;eku=@($cert.EnhancedKeyUsageList | ForEach-Object {$_.ObjectId})} } })
Save 'public-certificate-metadata.json' $certificates
$targets=@(foreach($path in @('C:\Program Files\AgentNexus','C:\ProgramData\AgentNexusCredential')) { [ordered]@{path=$path;exists=(Test-Path -LiteralPath $path)} })
$parents=@(foreach($path in @('C:\','C:\Program Files','C:\ProgramData')) { $acl=Get-Acl -LiteralPath $path; [ordered]@{path=$path;owner=$acl.GetOwner([Security.Principal.SecurityIdentifier]).Value;sddl=$acl.Sddl;attributes=(Get-Item -LiteralPath $path -Force).Attributes.ToString();audit_sacl_or_mic_read=$false} })
Save 'parent-acl-readonly.json' $parents
try { $tpm=Get-Tpm; $tpmResult=[ordered]@{status='READ_ONLY_METADATA';present=$tpm.TpmPresent;ready=$tpm.TpmReady;enabled=$tpm.TpmEnabled;activated=$tpm.TpmActivated;actual_key_generation='NOT_RUN';trusted_user_presence='NOT_RUN'} }
catch { $tpmResult=[ordered]@{status='INCONCLUSIVE';reason=$_.Exception.GetType().Name;actual_key_generation='NOT_RUN';trusted_user_presence='NOT_RUN'} }
try { $pipes=@([IO.Directory]::GetFiles('\\.\pipe\') | Where-Object {$_ -match 'AgentNexus'}); $pipeStatus='NAME_ENUMERATION_ONLY' }
catch { $pipes=@(); $pipeStatus='INCONCLUSIVE' }
$observer=Join-Path $out 'observe-processes.exe'
$common=Join-Path $base 'source/native/credential-service/Common.cs'
$contracts=Join-Path $base 'source/native/qualification-signer/SigningContracts.cs'
$observerSource=Join-Path $base 'source/tools/agentnexus/ObserveProcesses.cs'
$compiler=@(& 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe' /nologo /target:exe /platform:x64 /warn:4 /warnaserror+ /r:System.Core.dll /r:System.Security.dll /r:System.ServiceProcess.dll /r:System.Web.Extensions.dll ('/out:'+$observer) /main:AgentNexus.CredentialBoundary.ObserveProcesses $common $contracts $observerSource 2>&1)
$compileExit=$LASTEXITCODE; Save 'observer-compilation.json' @{exit_code=$compileExit;output=$compiler}
$token=$null; $observerExit=$null
if($compileExit -eq 0) { $raw=@(& $observer ([string]$PID) 2>&1); $observerExit=$LASTEXITCODE; [IO.File]::WriteAllText((Join-Path $out 'process-token.raw.log'),($raw -join [Environment]::NewLine),$utf8); if($observerExit -eq 0) { $token=($raw -join '') | ConvertFrom-Json } }
$report=[ordered]@{schema='agentnexus.q41.host-preflight.v1';observed_at_utc=[DateTime]::UtcNow.ToString('o');host=$env:COMPUTERNAME;machine_id=$machine;os=@{display_version=$version.DisplayVersion;build=$version.CurrentBuild;ubr=$version.UBR};operator=@{sid=$identity.User.Value;administrator_enabled=([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator);native_token=$token;observer_exit=$observerExit};service_query=@{exit_code=$queryExit;raw=$query;showsid_exit=$sidExit;showsid_raw=$showSid};targets=$targets;parent_acls=$parents;public_certificates_count=$certificates.Count;tpm=$tpmResult;pipes=$pipes;pipe_observation=$pipeStatus;pipe_connected=$false;certificate_store_modified=$false;private_key_opened=$false;system_changes=$false;service_started=$false;real_import=$false;live_provider=$false;os_qualification='NOT_RUN'}
Save 'host-preflight.json' $report
$dest=Join-Path $base ('evidence/host/'+[IO.Path]::GetFileName($out)); [void][IO.Directory]::CreateDirectory($dest)
foreach($file in Get-ChildItem -LiteralPath $out -File | Where-Object {$_.Extension -cne '.exe'}) { [IO.File]::Copy($file.FullName,(Join-Path $dest $file.Name)) }
Save 'evidence-files.json' @(Get-ChildItem -LiteralPath $out -File | ForEach-Object {@{name=$_.Name;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}})
[IO.File]::Copy((Join-Path $out 'evidence-files.json'),(Join-Path $dest 'evidence-files.json'))
[IO.File]::WriteAllText((Join-Path $base 'evidence/host-preflight.json'),($report | ConvertTo-Json -Depth 24),$utf8)
Write-Output ([ordered]@{output=$out;service_query_exit=$queryExit;target_paths=$targets;tpm=$tpmResult;system_changes=$false} | ConvertTo-Json -Depth 8 -Compress)
