[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$BundleRoot, [switch]$Apply, [switch]$StartService,
      [string]$AuthorityCertificateSha256)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Q4.2 is INSTALL-STOPPED ONLY. This script never elevates or starts a service.
# Filled by freeze.py after compiling the exact shared verifier; no private key.
$ExpectedVerifierSha256 = '290d4aac30beca71e1e06227098071848f2e100b8929964b300c592a4d85646c'
$bundle = [IO.Path]::GetFullPath($BundleRoot)
$verifier = Join-Path $bundle 'signer\AgentNexus.Qualification.Verifier.exe'
if ($StartService) { throw 'SERVICE_START_REQUIRES_SEPARATE_FUTURE_APPROVAL' }
$verifierLock = [IO.File]::Open($verifier,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
$verified = $null
try {
    $hasher = [Security.Cryptography.SHA256]::Create()
    try { $actualVerifierHash = [BitConverter]::ToString($hasher.ComputeHash($verifierLock)).Replace('-','').ToLowerInvariant(); $verifierLock.Position = 0 }
    finally { $hasher.Dispose() }
    if ($actualVerifierHash -cne $ExpectedVerifierSha256) { throw 'VERIFIER_BINARY_HASH_MISMATCH' }
    if (-not $Apply) {
        if ($AuthorityCertificateSha256) { & $verifier --verify $bundle $AuthorityCertificateSha256 }
        else { & $verifier --inspect $bundle }
        if ($LASTEXITCODE -ne 0) { throw 'READ_ONLY_VERIFICATION_REFUSED' }
        return
    }
    if ($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5) { throw 'USER_OWNED_WINDOWS_POWERSHELL_5_ADMIN_SESSION_REQUIRED' }
    if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'APPROVED_ADMIN_SESSION_REQUIRED_NO_AUTO_ELEVATION' }
    if ($AuthorityCertificateSha256 -cnotmatch '^[a-f0-9]{64}$') { throw 'INDEPENDENT_USER_PIN_REQUIRED' }
    [void][Reflection.Assembly]::LoadFrom($verifier)
    $verified = [AgentNexus.CredentialBoundary.VerifiedInstallation]::Open($bundle,$AuthorityCertificateSha256)
    $verified.RequireFreshInstall()
    $plan = $verified.PlanJson | ConvertFrom-Json
    $approval = $verified.ApprovalJson | ConvertFrom-Json
    $manifest = $verified.ManifestJson | ConvertFrom-Json
    $install = 'C:\Program Files\AgentNexus'; $data = 'C:\ProgramData\AgentNexusCredential'; $name = 'AgentNexusCredential'
    $trustedOwners = @('S-1-5-18','S-1-5-32-544','S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464')
    foreach ($ancestor in @('C:\','C:\Program Files','C:\ProgramData')) {
        if ((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'INSTALL_ANCESTOR_REPARSE' }
        $ancestorAcl = Get-Acl -LiteralPath $ancestor
        if ($ancestorAcl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin $trustedOwners) { throw 'INSTALL_ANCESTOR_OWNER' }
        foreach ($ace in $ancestorAcl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])) {
            if ($ace.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow -and -not ($ace.PropagationFlags -band [Security.AccessControl.PropagationFlags]::InheritOnly) -and (([long]$ace.FileSystemRights -band 0x100D0040L) -ne 0) -and $ace.IdentityReference.Value -notin $trustedOwners) { throw 'INSTALL_ANCESTOR_REPLACEABLE' }
        }
    }
    foreach ($target in @($install,$data)) { if (Test-Path -LiteralPath $target) { throw 'EXISTING_TARGET_OR_CONSUMED_EPOCH_REFUSED_KEEP_VAULT_LEDGER' } }
    if (Get-Service -Name $name -ErrorAction SilentlyContinue) { throw 'EXISTING_SERVICE_REFUSED' }
    Write-Host 'LOCAL_QUALIFICATION / QUALIFICATION_ONLY — INSTALL STOPPED ONLY' -ForegroundColor Yellow
    Write-Host ('Manifest SHA256: ' + $verified.ManifestSha256)
    Write-Host ('Qualification SHA256: ' + $approval.qualification_sha256)
    Write-Host ('Approval SHA256: ' + $verified.ApprovalSha256)
    Write-Host ('Host/Operator/Service/Epoch: ' + $plan.target_host + ' / ' + $plan.operator_sid + ' / ' + $plan.service_sid + ' / ' + $plan.policy_epoch)
    Write-Host ('UTC validity: ' + $plan.issued_at_utc + ' -> ' + $plan.expires_at_utc)
    Write-Host ('Files/bytes: ' + $plan.payload_files + '/' + $plan.payload_bytes)
    $changes = Get-Content -LiteralPath (Join-Path $bundle 'approval\system-changes.json') -Raw | ConvertFrom-Json
    foreach ($change in $changes.changes) { Write-Host (' - ' + $change) }
    Write-Host 'real_import=false; live_provider=false; production_release=false; real_ledger_migration=false'
    $required = 'INSTALL QUALIFICATION ' + $plan.deployment_id
    if ((Read-Host ('User separately approves these exact system changes. Type: ' + $required)) -cne $required) { throw 'INDEPENDENT_ACTUAL_DEPLOYMENT_CONFIRMATION_REQUIRED' }
    $verified.RecheckTime()
    # This is the first system mutation. No overwrite; receipt is written before SCM.
    [AgentNexus.CredentialBoundary.ApprovedInstallerFileOps]::CreateNewProtectedRoot($data)
    $receipt = [ordered]@{ schema='agentnexus.q41.installation-receipt.v1'; policy_epoch=5; deployment_id=$plan.deployment_id; approval_sha256=$verified.ApprovalSha256; consumed_at_utc=[DateTime]::UtcNow.ToString('o'); state='CONSUMED_BEFORE_SCM'; start_service=$false }
    $receiptBytes = [Text.UTF8Encoding]::new($false).GetBytes(($receipt | ConvertTo-Json))
    $receiptPath = Join-Path $data 'installation-receipt.json'
    $receiptStream = [IO.File]::Open($receiptPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
    try { $receiptStream.Write($receiptBytes,0,$receiptBytes.Length); $receiptStream.Flush($true) } finally { $receiptStream.Dispose() }
    function Invoke-ServiceControl([string[]]$Arguments) { & 'C:\Windows\System32\sc.exe' @Arguments; if ($LASTEXITCODE -ne 0) { throw 'SERVICE_CONTROL_FAILED_PRESERVE_PARTIAL_STOPPED_INSTALL' } }
    Invoke-ServiceControl @('create',$name,'type=','own','start=','demand','binPath=','"C:\Program Files\AgentNexus\AgentNexusCredential.exe"','obj=','NT SERVICE\AgentNexusCredential')
    Invoke-ServiceControl @('sidtype',$name,'unrestricted')
    $serviceSid = ([Security.Principal.NTAccount]::new('NT SERVICE\AgentNexusCredential')).Translate([Security.Principal.SecurityIdentifier]).Value
    if ($serviceSid -cne $plan.service_sid) { throw 'SERVICE_SID_MISMATCH_PRESERVE_STOPPED_SERVICE' }
    Invoke-ServiceControl @('sdset',$name,'D:P(A;;GA;;;SY)(A;;GA;;;BA)(A;;CCLC;;;AU)')
    [AgentNexus.CredentialBoundary.ApprovedInstallerFileOps]::CreateNewProtectedRoot($install)
    foreach ($entry in $manifest.files) { $verified.Copy(('payload/' + $entry.path),(Join-Path $install $entry.path)) }
    foreach ($directory in @('qualification','temp','engine')) { [void](New-Item -ItemType Directory -Path (Join-Path $data $directory)) }
    foreach ($mapping in @(@('approval/candidate/service-config.json','service-config.json'),@('approval/qualification-plan.json','qualification.json'),@('approval/qualification-plan.p7s','qualification.p7s'),@('approval/installation-manifest.json','installation-manifest.json'),@('approval/signature-policy.json','signature-policy.json'),@('approval/system-changes.json','system-changes.json'),@('approval/deployment-approval.json','deployment-approval.json'),@('approval/deployment-approval.p7s','deployment-approval.p7s'))) { $verified.Copy($mapping[0],(Join-Path $data $mapping[1])) }
    foreach ($scope in @(@($install,$false),@($data,$true))) {
        $items = @((Get-Item -LiteralPath $scope[0])) + @(Get-ChildItem -LiteralPath $scope[0] -Recurse -Force)
        foreach ($item in $items) {
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'TARGET_REPARSE_REFUSED' }
            $acl = if ($item.PSIsContainer) { [Security.AccessControl.DirectorySecurity]::new() } else { [Security.AccessControl.FileSecurity]::new() }
            $acl.SetOwner([Security.Principal.SecurityIdentifier]::new('S-1-5-32-544')); $acl.SetAccessRuleProtection($true,$false)
            $inherit = if ($item.PSIsContainer) { [Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit' } else { [Security.AccessControl.InheritanceFlags]::None }
            foreach ($sid in @('S-1-5-18','S-1-5-32-544',$serviceSid)) {
                $stateRoot = @('engine','qualification','temp') | ForEach-Object { Join-Path $data $_ } | Where-Object { $item.FullName.Equals($_,[StringComparison]::OrdinalIgnoreCase) -or $item.FullName.StartsWith($_ + '\',[StringComparison]::OrdinalIgnoreCase) }
                $rights = if ($sid -ceq $serviceSid -and -not $stateRoot) { [Security.AccessControl.FileSystemRights]::ReadAndExecute } else { [Security.AccessControl.FileSystemRights]::FullControl }
                $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new($sid),$rights,$inherit,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow))
            }
            if (-not $scope[1]) { $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-5-32-545'),[Security.AccessControl.FileSystemRights]::ReadAndExecute,$inherit,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow)) }
            Set-Acl -LiteralPath $item.FullName -AclObject $acl
        }
    }
    $expected = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($entry in $manifest.files) { [void]$expected.Add($entry.path); if ((Get-FileHash -LiteralPath (Join-Path $install $entry.path) -Algorithm SHA256).Hash.ToLowerInvariant() -cne $entry.sha256) { throw 'INSTALLED_HASH_MISMATCH_KEEP_SERVICE_STOPPED' } }
    $actual = @(Get-ChildItem -LiteralPath $install -Recurse -Force | Where-Object { -not $_.PSIsContainer })
    if ($actual.Count -ne $expected.Count) { throw 'INSTALLED_FILE_COUNT_MISMATCH' }
    foreach ($file in $actual) { if (-not $expected.Contains($file.FullName.Substring($install.Length+1).Replace('\','/'))) { throw 'INSTALLED_FILE_SET_MISMATCH' } }
    $service = Get-Service -Name $name
    if ($service.Status -ne [ServiceProcess.ServiceControllerStatus]::Stopped) { throw 'UNEXPECTED_SERVICE_STATE_REQUIRES_USER_REVIEW' }
    [ordered]@{ status='QUALIFICATION_ONLY_INSTALLED_STOPPED'; service_started=$false; readiness='NOT_RUN'; os_tests='NOT_RUN'; policy_epoch=5; real_import=$false; live_provider=$false; production_release=$false; rollback='Preserve receipt/program/data/vault/ledger/audit; no automatic deletion or restart' } | ConvertTo-Json
} finally { if ($null -ne $verified) { $verified.Dispose() }; $verifierLock.Dispose() }
