[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ObserverPath)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Read-only OS queries. Writes evidence only to this task's workspace runtime.
# No Apply, SCM mutation, UAC, account/ACL/policy change, pipe connection or Key.
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$runtime = Join-Path $workspace '.workflow-kit\runtime\AgentNexus-M1.8.3-Q4'
$observer = [IO.Path]::GetFullPath($ObserverPath)
if (-not $observer.StartsWith($runtime + '\', [StringComparison]::OrdinalIgnoreCase) -or
    [IO.Path]::GetFileName($observer) -ne 'observe-processes.exe') { throw 'Q4_OBSERVER_PATH_REQUIRED' }
$output = Join-Path $runtime ('host-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ-') + [Guid]::NewGuid().ToString('N').Substring(0,8))
[void][IO.Directory]::CreateDirectory($output)
function Save-Json([string]$Name, $Value) {
    [IO.File]::WriteAllText((Join-Path $output $Name), ($Value | ConvertTo-Json -Depth 12), [Text.UTF8Encoding]::new($false))
}
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$os = Get-CimInstance Win32_OperatingSystem
$version = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
$uac = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'
$machine = (Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Cryptography' -Name MachineGuid).MachineGuid.ToLowerInvariant()
$machineId = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($machine))).ToLowerInvariant()
$serviceInventory = @(Get-CimInstance Win32_Service | Select-Object Name,State,StartMode,StartName,PathName,ProcessId,ServiceType)
Save-Json 'service-inventory.json' $serviceInventory
$targets = foreach ($path in @('C:\','C:\Program Files','C:\ProgramData','C:\Program Files\AgentNexus','C:\ProgramData\AgentNexusCredential')) {
    if (Test-Path -LiteralPath $path) {
        $item = Get-Item -LiteralPath $path -Force
        $acl = Get-Acl -LiteralPath $path
        [ordered]@{ path=$path; exists=$true; attributes=$item.Attributes.ToString();
            owner=$acl.GetOwner([Security.Principal.SecurityIdentifier]).Value; sddl=$acl.Sddl;
            audit_sacl_or_mandatory_label_read=$false }
    } else { [ordered]@{ path=$path; exists=$false } }
}
try { $sid = ([Security.Principal.NTAccount]::new('NT SERVICE\AgentNexusCredential')).Translate([Security.Principal.SecurityIdentifier]).Value; $sidError=$null }
catch { $sid=$null; $sidError=$_.Exception.Message }
$scQuery = @(& 'C:\Windows\System32\sc.exe' queryex AgentNexusCredential 2>&1); $queryExit=$LASTEXITCODE
$scSid = @(& 'C:\Windows\System32\sc.exe' showsid AgentNexusCredential 2>&1); $sidExit=$LASTEXITCODE
$certs = foreach ($store in @('Cert:\CurrentUser\My','Cert:\LocalMachine\My')) {
    foreach ($cert in Get-ChildItem -LiteralPath $store) {
        [ordered]@{ store=$store; subject=$cert.Subject; issuer=$cert.Issuer;
            der_sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($cert.RawData)).ToLowerInvariant();
            not_before_utc=$cert.NotBefore.ToUniversalTime().ToString('o'); not_after_utc=$cert.NotAfter.ToUniversalTime().ToString('o');
            has_private_key=$cert.HasPrivateKey; eku=@($cert.EnhancedKeyUsageList | ForEach-Object { $_.ObjectId }) }
    }
}
$observerHash = (Get-FileHash -LiteralPath $observer -Algorithm SHA256).Hash.ToLowerInvariant()
$tokenRaw = @(& $observer ([string]$PID) 2>&1); $observerExit=$LASTEXITCODE
[IO.File]::WriteAllText((Join-Path $output 'process-token.raw.log'), ($tokenRaw -join [Environment]::NewLine), [Text.UTF8Encoding]::new($false))
$token = if ($observerExit -eq 0) { ($tokenRaw -join '') | ConvertFrom-Json } else { $null }
$report = [ordered]@{
    schema='agentnexus.q4.host-preflight.v1'; observed_at_utc=[DateTime]::UtcNow.ToString('o');
    mode='READ_ONLY_PREFLIGHT'; host=$env:COMPUTERNAME; machine_id=$machineId;
    os=[ordered]@{ caption=$os.Caption; version=$os.Version; build=$os.BuildNumber; ubr=$version.UBR;
        architecture=$os.OSArchitecture; display_version=$version.DisplayVersion; last_boot_utc=$os.LastBootUpTime.ToUniversalTime().ToString('o') };
    operator=[ordered]@{ name=$identity.Name; sid=$identity.User.Value;
        administrator_enabled=([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator);
        process_id=$PID; session_id=(Get-Process -Id $PID).SessionId; whoami_all=@(& 'C:\Windows\System32\whoami.exe' /all);
        native_process_token=$token; observer_exit=$observerExit; observer_sha256=$observerHash; observer=$observer };
    uac=$uac | Select-Object EnableLUA,ConsentPromptBehaviorAdmin,ConsentPromptBehaviorUser,PromptOnSecureDesktop,FilterAdministratorToken,EnableInstallerDetection,EnableVirtualization;
    targets=@($targets); service_inventory_count=$serviceInventory.Count; service_inventory_file='service-inventory.json';
    target_services=@($serviceInventory | Where-Object { $_.Name -match 'AgentNexus' });
    target_processes=@(Get-CimInstance Win32_Process -Filter "Name = 'AgentNexusCredential.exe' OR Name = 'trusted-credential-helper.exe' OR Name = 'credential-launcher.exe' OR Name = 'pipe-client.exe'" | Select-Object Name,ProcessId,ParentProcessId,ExecutablePath,SessionId);
    agentnexus_pipes=@([IO.Directory]::GetFiles('\\.\pipe\') | Where-Object { $_ -match 'AgentNexus' });
    service_sid_query=[ordered]@{ resolved_sid=$sid; resolution_error=$sidError; sc_showsid=$scSid; sc_showsid_exit=$sidExit;
        sc_query=$scQuery; sc_query_exit=$queryExit; runtime_token_verified=$false; activation_verified=$false };
    personal_certificates=@($certs); system_changes=$false; named_pipe_connected=$false;
    target_os_security_qualification='NOT_RUN'
}
Save-Json 'host-preflight.json' $report
Save-Json 'actual-parent-acl-sddl.json' @($targets | Where-Object { $_.exists })
Save-Json 'public-certificates.json' @($certs)
[ordered]@{ output=$output; host=$report.host; machine_id=$machineId; service_query_exit=$queryExit;
    target_service_count=$report.target_services.Count; observer_exit=$observerExit; system_changes=$false } | ConvertTo-Json -Compress
