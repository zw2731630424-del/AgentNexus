[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Read-only inventory. No sc.exe, New-Service, Set-Acl, account creation, IPC or key access.
$checks = [Collections.Generic.List[object]]::new()
function Add-Check([string]$Id, [string]$Status, [string]$Observation) {
    $checks.Add([ordered]@{ id = $Id; status = $Status; observation = $Observation })
}
$installRoot = 'C:\Program Files\AgentNexus'
$dataRoot = 'C:\ProgramData\AgentNexusCredential'
$compiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
Add-Check 'framework_compiler' $(if (Test-Path -LiteralPath $compiler -PathType Leaf) { 'OBSERVED' } else { 'BLOCKED' }) $compiler
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
Add-Check 'current_token' 'OBSERVED' ('sid={0}; administrator_enabled={1}; service_identity_required_for_runtime=true' -f $identity.User.Value, $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))
foreach ($path in @($installRoot, $dataRoot)) {
    if (-not (Test-Path -LiteralPath $path -PathType Container)) { Add-Check 'protected_root' 'BLOCKED' "$path is absent"; continue }
    $item = Get-Item -LiteralPath $path -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { Add-Check 'protected_root' 'BLOCKED' "$path is a reparse point"; continue }
    $acl = Get-Acl -LiteralPath $path
    Add-Check 'protected_root' 'OBSERVED_UNQUALIFIED' ('{0}; owner={1}; dacl_protected={2}; ACEs require privileged native qualification' -f $path, $acl.Owner, $acl.AreAccessRulesProtected)
}
$required = @(
    "$installRoot\AgentNexusCredential.exe", "$installRoot\pipe-client.exe", "$installRoot\trusted-credential-helper.exe", "$installRoot\credential-launcher.exe", "$installRoot\node.exe", "$installRoot\app-manifest.json",
    "$installRoot\app\dist\src\agentnexus\credential-service\engine.js",
    "$dataRoot\service-config.json", "$dataRoot\qualification.json", "$dataRoot\qualification.p7s"
)
foreach ($path in $required) {
    if (Test-Path -LiteralPath $path -PathType Leaf) {
        Add-Check 'fixed_artifact' 'OBSERVED_UNQUALIFIED' ('{0}; sha256={1}' -f $path, (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant())
    } else { Add-Check 'fixed_artifact' 'BLOCKED' "$path is absent" }
}
foreach ($path in @("$dataRoot\engine", "$dataRoot\qualification", "$dataRoot\temp")) {
    if (Test-Path -LiteralPath $path -PathType Container) {
        Add-Check 'sensitive_state_tree' 'OBSERVED_UNQUALIFIED' "$path exists; selected runtime tree requires native recursive read/write ACL and reparse checks"
    } else { Add-Check 'sensitive_state_tree' 'BLOCKED' "$path is absent; read-only preflight did not create it" }
}
Add-Check 'signed_qualification_plan' 'BLOCKED' 'Only a separately approved, host/binary-bound CMS plan may select QUALIFICATION_ONLY; this inventory cannot authorize it'
$serviceRegistry = 'HKLM:\SYSTEM\CurrentControlSet\Services\AgentNexusCredential'
if (Test-Path -LiteralPath $serviceRegistry) {
    $registration = Get-ItemProperty -LiteralPath $serviceRegistry
    Add-Check 'scm_registration' 'OBSERVED_UNQUALIFIED' ('account={0}; image={1}; actual process token/creation time must be reverified by native client' -f $registration.ObjectName, $registration.ImagePath)
} else { Add-Check 'scm_registration' 'BLOCKED' 'Service is not installed; no installation was attempted' }
try {
    $serviceSid = ([Security.Principal.NTAccount]::new('NT SERVICE\AgentNexusCredential')).Translate([Security.Principal.SecurityIdentifier]).Value
    Add-Check 'virtual_service_sid' 'OBSERVED_UNQUALIFIED' $serviceSid
} catch { Add-Check 'virtual_service_sid' 'BLOCKED' 'Virtual service SID could not be resolved; no account was created' }
foreach ($id in @('service_account_isolation', 'protected_install_acl', 'pipe_dacl_remote_reject', 'medium_integrity_rejection', 'server_impersonation_rejection', 'same_sid_dpapi_denial', 'import_ticket_single_use', 'confirmation_queue_disconnect', 'crash_recovery_no_replay', 'audit_no_plaintext', 'negative_host_or_binary')) {
    Add-Check $id 'BLOCKED' 'Requires approved installed-service OS verification and signed evidence; pure fixtures cannot qualify it'
}
$report = [ordered]@{
    schema = 1
    mode = 'READ_ONLY_PREFLIGHT'
    checked_at_utc = [DateTime]::UtcNow.ToString('o')
    overall = 'BLOCKED'
    production_service_qualified = $false
    qualification_only_plan_activated = $false
    installed_or_started_service = $false
    changed_accounts_acl_registry_or_system_settings = $false
    connected_named_pipe = $false
    read_or_imported_real_credentials = $false
    contacted_provider_api = $false
    checks = $checks
}
Write-Output ($report | ConvertTo-Json -Depth 10)
