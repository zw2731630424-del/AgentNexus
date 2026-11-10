[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$BundleRoot, [switch]$Apply, [switch]$StartService,
      [string]$ApprovalDocument, [string]$DetachedSignature, [string]$AuthorityCertificateSha256)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
function Hash-Bytes([byte[]]$Bytes, [string]$Algorithm = 'SHA256') {
    $digest = [Security.Cryptography.HashAlgorithm]::Create($Algorithm)
    try { return ,$digest.ComputeHash($Bytes) } finally { $digest.Dispose() }
}
$bundle = [IO.Path]::GetFullPath($BundleRoot)
$payload = Join-Path $bundle 'payload'
$manifestPath = Join-Path $bundle 'approval\installation-manifest.json'
$manifestBytes = [IO.File]::ReadAllBytes($manifestPath)
$manifest = [Text.Encoding]::UTF8.GetString($manifestBytes) | ConvertFrom-Json
$initialManifestHash = [BitConverter]::ToString((Hash-Bytes $manifestBytes)).Replace('-','').ToLowerInvariant()
if ($manifest.schema -ne 'agentnexus.q3.installation-manifest.v1') { throw 'MANIFEST_SCHEMA' }
$approvedPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($entry in $manifest.files) {
    if ($entry.path -notmatch '^[a-zA-Z0-9_. /-]+$' -or $entry.path.Split('/') -contains '..') { throw 'PAYLOAD_PATH' }
    foreach ($part in $entry.path.Split('/')) { if (-not $part -or $part -eq '.' -or $part.EndsWith('.') -or $part.EndsWith(' ')) { throw 'PAYLOAD_PATH_ALIAS' } }
    if (-not $approvedPaths.Add($entry.path)) { throw 'DUPLICATE_PAYLOAD_PATH' }
    $file = [IO.Path]::GetFullPath((Join-Path $payload $entry.path))
    if (-not $file.StartsWith($payload + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'PAYLOAD_ESCAPE' }
    if ((Get-Item -LiteralPath $file -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'PAYLOAD_REPARSE' }
    if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw 'PAYLOAD_HASH' }
}
$allPayload = @(Get-ChildItem -LiteralPath $payload -Recurse -Force)
if (@($allPayload | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count -ne 0) { throw 'PAYLOAD_REPARSE' }
if (@($allPayload | Where-Object { -not $_.PSIsContainer }).Count -ne @($manifest.files).Count) { throw 'PAYLOAD_EXTRA_FILE' }
foreach ($actual in $allPayload | Where-Object { -not $_.PSIsContainer }) { if (-not $approvedPaths.Contains($actual.FullName.Substring($payload.Length + 1).Replace('\','/'))) { throw 'PAYLOAD_FILE_SET_MISMATCH' } }
if (-not $Apply) { [ordered]@{ status='PAYLOAD_VERIFIED_ONLY'; files=@($manifest.files).Count; system_changes=$false; approved=$false } | ConvertTo-Json; exit 0 }

# This branch must only be invoked after a separate explicit deployment approval.
# It cannot request UAC, accepts no arbitrary commands, and never provisions REAL quota.
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'APPROVED_ADMIN_SESSION_REQUIRED' }
if ($AuthorityCertificateSha256 -cnotmatch '^[a-f0-9]{64}$' -or -not $ApprovalDocument -or -not $DetachedSignature) { throw 'EXTERNAL_SIGNED_DEPLOYMENT_APPROVAL_REQUIRED' }
$sourceLocks = [Collections.Generic.List[IDisposable]]::new()
$sourceStreams = @{}
trap { if (Test-Path variable:sourceLocks) { foreach ($sourceLock in $sourceLocks) { $sourceLock.Dispose() } }; throw $_ }
foreach ($path in @($manifestPath,$ApprovalDocument,$DetachedSignature,(Join-Path $bundle 'approval\candidate\service-config.json'),(Join-Path $bundle 'approval\candidate\qualification.json'),(Join-Path $bundle 'approval\candidate\qualification.p7s')) + @($manifest.files | ForEach-Object { Join-Path $payload $_.path })) {
    $fullSource = [IO.Path]::GetFullPath($path)
    $stream = [IO.File]::Open($fullSource,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
    $sourceLocks.Add($stream); $sourceStreams[$fullSource] = $stream
}
if ((Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $initialManifestHash) { throw 'MANIFEST_CHANGED_DURING_REVIEW' }
function Read-LockedBytes([string]$Path) {
    $read = $sourceStreams[[IO.Path]::GetFullPath($Path)]
    if ($null -eq $read -or $read.Length -gt 4194304) { throw 'LOCKED_METADATA_REQUIRED' }
    $read.Position = 0; $memory = [IO.MemoryStream]::new()
    try { $read.CopyTo($memory); return ,$memory.ToArray() } finally { $memory.Dispose(); $read.Position = 0 }
}
function Hash-Locked([string]$Path) { return [BitConverter]::ToString((Hash-Bytes (Read-LockedBytes $Path))).Replace('-','').ToLowerInvariant() }
if ((Hash-Locked $manifestPath) -ne $initialManifestHash) { throw 'LOCKED_MANIFEST_MISMATCH' }
foreach ($entry in $manifest.files) {
    $held = $sourceStreams[[IO.Path]::GetFullPath((Join-Path $payload $entry.path))]; $held.Position = 0
    $digest = [Security.Cryptography.SHA256]::Create()
    try { $heldHash = [BitConverter]::ToString($digest.ComputeHash($held)).Replace('-','').ToLowerInvariant() } finally { $digest.Dispose(); $held.Position = 0 }
    if ($heldHash -ne $entry.sha256) { throw 'LOCKED_PAYLOAD_HASH_MISMATCH' }
}
[void][Reflection.Assembly]::Load('System.Security.Cryptography.Pkcs')
$signedBytes = Read-LockedBytes $ApprovalDocument
$cms = [Security.Cryptography.Pkcs.SignedCms]::new([Security.Cryptography.Pkcs.ContentInfo]::new($signedBytes), $true)
$cms.Decode((Read-LockedBytes $DetachedSignature)); $cms.CheckSignature($true)
if ($cms.SignerInfos.Count -ne 1) { throw 'APPROVAL_SIGNER_COUNT' }
$certificate = $cms.SignerInfos[0].Certificate
$sha = [Security.Cryptography.SHA256]::Create()
try { $certificateHash = [BitConverter]::ToString($sha.ComputeHash($certificate.RawData)).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
if ($certificateHash -ne $AuthorityCertificateSha256 -or $certificate.NotBefore.ToUniversalTime() -gt [DateTime]::UtcNow -or $certificate.NotAfter.ToUniversalTime() -le [DateTime]::UtcNow) { throw 'APPROVAL_CERTIFICATE' }
if ($cms.SignerInfos[0].DigestAlgorithm.Value -notin @('2.16.840.1.101.3.4.2.1','2.16.840.1.101.3.4.2.2','2.16.840.1.101.3.4.2.3')) { throw 'APPROVAL_DIGEST' }
$approved = [Text.Encoding]::UTF8.GetString($signedBytes) | ConvertFrom-Json
if ($approved.schema -ne 'agentnexus.q3.deployment-approval.v1' -or $approved.scope -ne 'QUALIFICATION_ONLY' -or $approved.deployment_approved -ne $true -or $approved.real_import_enabled -ne $false -or $approved.live_enabled -ne $false -or $approved.approval_ref -notmatch '^APPROVED-[A-Za-z0-9_.:-]+$' -or [DateTime]::Parse($approved.expires_at_utc).ToUniversalTime() -le [DateTime]::UtcNow) { throw 'DEPLOYMENT_NOT_APPROVED' }
foreach ($pair in @(@($manifestPath,'installation_manifest_sha256'), @((Join-Path $bundle 'approval\candidate\service-config.json'),'service_config_sha256'), @((Join-Path $bundle 'approval\candidate\qualification.json'),'qualification_sha256'))) {
    if ((Hash-Locked $pair[0]) -ne $approved.($pair[1])) { throw 'SIGNED_APPROVAL_HASH_MISMATCH' }
}
$configurationPath = Join-Path $bundle 'approval\candidate\service-config.json'
$qualificationPath = Join-Path $bundle 'approval\candidate\qualification.json'
$configurationBytes = Read-LockedBytes $configurationPath
$qualificationBytes = Read-LockedBytes $qualificationPath
$configuration = [Text.Encoding]::UTF8.GetString($configurationBytes) | ConvertFrom-Json
$qualification = [Text.Encoding]::UTF8.GetString($qualificationBytes) | ConvertFrom-Json
if ($configuration.schema_version -ne 1 -or $qualification.schema -ne 'agentnexus.windows-qualification.v1' -or $qualification.scope -ne 'WINDOWS_BOUNDARY_ONLY') { throw 'QUALIFICATION_SCHEMA' }
foreach ($document in @($approved,$configuration,$qualification)) { foreach ($flag in @('real_import_enabled','live_enabled')) { if ($document.$flag -isnot [bool] -or $document.$flag -ne $false) { throw 'QUALIFICATION_REAL_FLAGS' } } }
if ($approved.deployment_approved -isnot [bool] -or $approved.start_service -isnot [bool]) { throw 'DEPLOYMENT_FLAG_TYPES' }
if ($configuration.authority_certificate_sha256 -ne $AuthorityCertificateSha256 -or $configuration.real_import_enabled -ne $false -or $configuration.live_enabled -ne $false -or $qualification.status -ne 'QUALIFICATION_ONLY' -or $qualification.decision -notin @('NOT_RUN','BLOCKED')) { throw 'QUALIFICATION_ONLY_SIGNED_CONFIGURATION_REQUIRED' }
$qualificationSignature = Join-Path $bundle 'approval\candidate\qualification.p7s'
if (-not (Test-Path -LiteralPath $qualificationSignature -PathType Leaf)) { throw 'QUALIFICATION_SIGNATURE_REQUIRED' }
$qcms = [Security.Cryptography.Pkcs.SignedCms]::new([Security.Cryptography.Pkcs.ContentInfo]::new($qualificationBytes), $true)
$qcms.Decode((Read-LockedBytes $qualificationSignature)); $qcms.CheckSignature($true)
if ($qcms.SignerInfos.Count -ne 1 -or $qcms.SignerInfos[0].DigestAlgorithm.Value -notin @('2.16.840.1.101.3.4.2.1','2.16.840.1.101.3.4.2.2','2.16.840.1.101.3.4.2.3')) { throw 'QUALIFICATION_SIGNER_MISMATCH' }
$qCertificateHash = [BitConverter]::ToString((Hash-Bytes $qcms.SignerInfos[0].Certificate.RawData)).Replace('-','').ToLowerInvariant()
if ($qCertificateHash -ne $AuthorityCertificateSha256) { throw 'QUALIFICATION_CERTIFICATE_PIN_MISMATCH' }
$machineText = (Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Cryptography' -Name MachineGuid).MachineGuid.ToLowerInvariant()
$machineSha = Hash-Bytes ([Text.Encoding]::UTF8.GetBytes($machineText))
$machineId = [BitConverter]::ToString($machineSha).Replace('-','').ToLowerInvariant()
if ($approved.machine_id -ne $machineId -or $qualification.machine_id -ne $machineId -or $configuration.operator_sid -ne $approved.operator_sid -or $qualification.service_sid -ne $approved.service_sid -or $qualification.policy_epoch -ne $configuration.policy_epoch -or $configuration.policy_epoch -ne 3) { throw 'APPROVED_HOST_SCOPE_MISMATCH' }
$launch = [Text.Encoding]::UTF8.GetString((Read-LockedBytes (Join-Path $payload 'launcher-plan.json'))) | ConvertFrom-Json
if ($launch.machine_id -ne $machineId -or $launch.operator_sid -ne $approved.operator_sid -or $launch.policy_epoch -ne 3 -or [DateTime]::Parse($launch.expires_at_utc).ToUniversalTime() -le [DateTime]::UtcNow -or $launch.approval_ref -notmatch '^APPROVED-') { throw 'LAUNCH_PLAN_NOT_APPROVED' }
if ($launch.schema -ne 'agentnexus.launcher-plan.v1' -or [DateTime]::Parse($launch.expires_at_utc).ToUniversalTime() -gt [DateTime]::UtcNow.AddDays(7) -or $launch.helper_sha256 -ne $configuration.helper_sha256 -or $launch.launcher_sha256 -ne $configuration.launcher_sha256) { throw 'LAUNCH_PLAN_BINARY_OR_EXPIRY_MISMATCH' }
$issued = [DateTime]::Parse($qualification.issued_at_utc).ToUniversalTime(); $expires = [DateTime]::Parse($qualification.expires_at_utc).ToUniversalTime()
if ($issued -gt [DateTime]::UtcNow -or $expires -le [DateTime]::UtcNow -or $expires -le $issued -or ($expires-$issued).TotalDays -gt 7) { throw 'QUALIFICATION_TIME_INVALID' }
foreach ($field in @('service_sha256','client_sha256','helper_sha256','launcher_sha256','node_sha256','engine_sha256','application_manifest_sha256','qualification_test_approval_ref','real_import_enabled','live_enabled','real_import_approval_ref','live_approval_ref')) { if ($qualification.$field -ne $configuration.$field) { throw 'QUALIFICATION_CONFIG_MISMATCH' } }
if ($configuration.qualification_test_approval_ref -notmatch '^APPROVED-' -or $configuration.real_import_approval_ref -ne '' -or $configuration.live_approval_ref -ne '') { throw 'QUALIFICATION_TEST_AUTHORIZATION_REQUIRED' }
$expectedTests = @('service_account_isolation','protected_install_acl','pipe_dacl_remote_reject','medium_integrity_rejection','server_impersonation_rejection','same_sid_dpapi_denial','import_ticket_single_use','confirmation_queue_disconnect','crash_recovery_no_replay','audit_no_plaintext','negative_host_or_binary','trusted_helper_entry_isolation','helper_manifest_launch_binding','helper_ticket_lifecycle','helper_memory_clipboard_dump','daily_native_runtime_origin','daily_medium_pipe_boundary','daily_runtime_process_token_isolation','daily_runtime_lifecycle_revocation')
$testNames = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($test in $qualification.tests) { if ($test.name -notin $expectedTests -or -not $testNames.Add($test.name) -or $test.observed_result -notin @('NOT_RUN','BLOCKED')) { throw 'QUALIFICATION_TEST_SCHEMA' } }
if ($testNames.Count -ne $expectedTests.Count) { throw 'QUALIFICATION_TESTS_INCOMPLETE' }
$binaryPaths = @{ service_sha256='AgentNexusCredential.exe'; client_sha256='pipe-client.exe'; helper_sha256='trusted-credential-helper.exe'; launcher_sha256='credential-launcher.exe'; node_sha256='node.exe'; engine_sha256='app/dist/src/agentnexus/credential-service/engine.js'; application_manifest_sha256='app-manifest.json' }
foreach ($field in $binaryPaths.Keys) { $expected = @($manifest.files | Where-Object { $_.path -ceq $binaryPaths[$field] }); if ($expected.Count -ne 1 -or $configuration.$field -ne $expected[0].sha256) { throw 'CONFIGURATION_PAYLOAD_HASH_MISMATCH' } }
if ($StartService -and $approved.start_service -ne $true) { throw 'SERVICE_START_NOT_APPROVED' }
$install = 'C:\Program Files\AgentNexus'; $data = 'C:\ProgramData\AgentNexusCredential'; $name = 'AgentNexusCredential'
$sidDigest = Hash-Bytes ([Text.Encoding]::Unicode.GetBytes($name.ToUpperInvariant())) 'SHA1'
$expectedServiceSid = 'S-1-5-80-' + ((0..4 | ForEach-Object { [BitConverter]::ToUInt32($sidDigest, $_ * 4).ToString() }) -join '-')
if ($expectedServiceSid -ne $approved.service_sid) { throw 'APPROVED_SERVICE_SID_MISMATCH' }
$trustedOwners = @('S-1-5-18','S-1-5-32-544','S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464')
foreach ($ancestor in @('C:\','C:\Program Files','C:\ProgramData')) {
    if ((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'INSTALL_ANCESTOR_REPARSE' }
    $ancestorAcl = Get-Acl -LiteralPath $ancestor
    if ($ancestorAcl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin $trustedOwners) { throw 'INSTALL_ANCESTOR_OWNER' }
    foreach ($ace in $ancestorAcl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])) {
        if ($ace.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow -and -not ($ace.PropagationFlags -band [Security.AccessControl.PropagationFlags]::InheritOnly) -and (([long]$ace.FileSystemRights -band 0x100D0040L) -ne 0) -and $ace.IdentityReference.Value -notin $trustedOwners) { throw 'INSTALL_ANCESTOR_REPLACEABLE' }
    }
}
foreach ($target in @($install,$data)) { if (Test-Path -LiteralPath $target) { throw 'EXISTING_TARGET_REFUSED_KEEP_VAULT_LEDGER' } }
if (Get-Service -Name $name -ErrorAction SilentlyContinue) { throw 'EXISTING_SERVICE_REFUSED' }
function Invoke-ServiceControl([string[]]$Arguments) { & 'C:\Windows\System32\sc.exe' @Arguments; if ($LASTEXITCODE -ne 0) { throw 'SERVICE_CONTROL_FAILED_PRESERVE_PARTIAL_INSTALL' } }
Invoke-ServiceControl @('create',$name,'type=','own','start=','demand','binPath=','"C:\Program Files\AgentNexus\AgentNexusCredential.exe"','obj=','NT SERVICE\AgentNexusCredential')
Invoke-ServiceControl @('sidtype',$name,'unrestricted')
$serviceSid = ([Security.Principal.NTAccount]::new('NT SERVICE\AgentNexusCredential')).Translate([Security.Principal.SecurityIdentifier]).Value
if ($serviceSid -ne $approved.service_sid) { throw 'SERVICE_SID_MISMATCH_PRESERVE_STOPPED_SERVICE' }
Invoke-ServiceControl @('sdset',$name,'D:P(A;;GA;;;SY)(A;;GA;;;BA)(A;;CCLC;;;AU)')
[void](New-Item -ItemType Directory -Path $install)
function Protect-NewRoot([string]$Path, [bool]$PublicRead) {
    $rootSddl = 'O:BAG:BAD:P(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;0x001200a9;;;' + $serviceSid + ')'
    if ($PublicRead) { $rootSddl += '(A;OICI;0x001200a9;;;BU)' }
    $rootAcl = [Security.AccessControl.DirectorySecurity]::new(); $rootAcl.SetSecurityDescriptorSddlForm($rootSddl)
    Set-Acl -LiteralPath $Path -AclObject $rootAcl
}
Protect-NewRoot $install $true
function Copy-LockedFile([string]$From, [string]$To) {
    $read = $sourceStreams[[IO.Path]::GetFullPath($From)]; $read.Position = 0
    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($To))
    $write = [IO.File]::Open($To,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
    try { $read.CopyTo($write); $write.Flush($true) } finally { $write.Dispose() }
}
foreach ($entry in $manifest.files) { Copy-LockedFile (Join-Path $payload $entry.path) (Join-Path $install $entry.path) }
[void](New-Item -ItemType Directory -Path $data); Protect-NewRoot $data $false
foreach ($directory in @((Join-Path $data 'qualification'),(Join-Path $data 'temp'),(Join-Path $data 'engine'))) { [void](New-Item -ItemType Directory -Path $directory) }
Copy-LockedFile $configurationPath (Join-Path $data 'service-config.json')
Copy-LockedFile $qualificationPath (Join-Path $data 'qualification.json')
Copy-LockedFile $qualificationSignature (Join-Path $data 'qualification.p7s')
foreach ($scope in @(@($install,$false),@($data,$true))) {
    $items = @((Get-Item -LiteralPath $scope[0])) + @(Get-ChildItem -LiteralPath $scope[0] -Recurse -Force)
    foreach ($item in $items) {
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'TARGET_REPARSE_REFUSED' }
        $acl = if ($item.PSIsContainer) { [Security.AccessControl.DirectorySecurity]::new() } else { [Security.AccessControl.FileSecurity]::new() }
        $acl.SetOwner([Security.Principal.SecurityIdentifier]::new('S-1-5-32-544')); $acl.SetAccessRuleProtection($true,$false)
        $inherit = if ($item.PSIsContainer) { [Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit' } else { [Security.AccessControl.InheritanceFlags]::None }
        foreach ($sid in @('S-1-5-18','S-1-5-32-544',$serviceSid)) {
            $stateRoot = @((Join-Path $data 'engine'),(Join-Path $data 'qualification'),(Join-Path $data 'temp')) | Where-Object { $item.FullName.Equals($_,[StringComparison]::OrdinalIgnoreCase) -or $item.FullName.StartsWith($_ + '\',[StringComparison]::OrdinalIgnoreCase) }
            $rights = if ($sid -eq $serviceSid -and -not $stateRoot) { [Security.AccessControl.FileSystemRights]::ReadAndExecute } else { [Security.AccessControl.FileSystemRights]::FullControl }
            $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new($sid),$rights,$inherit,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow))
        }
        if (-not $scope[1]) { $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-5-32-545'),[Security.AccessControl.FileSystemRights]::ReadAndExecute,$inherit,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow)) }
        Set-Acl -LiteralPath $item.FullName -AclObject $acl
    }
}
foreach ($entry in $manifest.files) { if ((Get-FileHash -LiteralPath (Join-Path $install $entry.path) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw 'INSTALLED_HASH_MISMATCH_KEEP_SERVICE_STOPPED' } }
foreach ($actual in Get-ChildItem -LiteralPath $install -Recurse -Force | Where-Object { -not $_.PSIsContainer }) { if (-not $approvedPaths.Contains($actual.FullName.Substring($install.Length + 1).Replace('\','/'))) { throw 'INSTALLED_UNAPPROVED_FILE_KEEP_SERVICE_STOPPED' } }
foreach ($pair in @(@((Join-Path $data 'service-config.json'),'service_config_sha256'),@((Join-Path $data 'qualification.json'),'qualification_sha256'))) { if ((Get-FileHash -LiteralPath $pair[0] -Algorithm SHA256).Hash.ToLowerInvariant() -ne $approved.($pair[1])) { throw 'INSTALLED_CONFIGURATION_MISMATCH_KEEP_SERVICE_STOPPED' } }
if ($StartService) { Invoke-ServiceControl @('start',$name) }
[ordered]@{ status='QUALIFICATION_INSTALL_ONLY'; service_started=[bool]$StartService; real_import=$false; live=$false; rollback='Stop approved service; preserve program/data/vault/ledger/audit; never remove automatically' } | ConvertTo-Json
foreach ($sourceLock in $sourceLocks) { $sourceLock.Dispose() }
