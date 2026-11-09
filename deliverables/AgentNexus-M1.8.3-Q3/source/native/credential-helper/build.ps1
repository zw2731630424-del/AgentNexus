[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Deliverable build: C# compiler, pure fixtures, ordinary-token blocked entry.
# No runas, installation, service launch, ACL/account/firewall or network action.
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..\..'))
$runtimeRoot = Join-Path $workspaceRoot '.workflow-kit\runtime\AgentNexus-M1.8.3-Q3\native'
$compiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler -PathType Leaf)) { throw 'CSC_NOT_FOUND' }
[void](New-Item -ItemType Directory -Path $runtimeRoot -Force)
$binary = Join-Path $runtimeRoot 'trusted-credential-helper.exe'
$common = Join-Path $PSScriptRoot '..\credential-service\Common.cs'
$sources = @($common, (Join-Path $PSScriptRoot 'HelperIntent.cs'), (Join-Path $PSScriptRoot 'HelperProtocol.cs'), (Join-Path $PSScriptRoot 'HelperObjectSecurity.cs'), (Join-Path $PSScriptRoot 'TrustedCredentialHelper.cs'), (Join-Path $PSScriptRoot 'HelperTests.cs'))
$manifest = Join-Path $PSScriptRoot 'helper.manifest'
$options = @('/nologo', '/target:winexe', '/platform:x64', '/langversion:5', '/optimize+', '/warn:4', '/warnaserror+', '/main:AgentNexus.CredentialBoundary.TrustedHelperProgram', "/win32manifest:$manifest", "/out:$binary", '/r:System.Core.dll', '/r:System.Security.dll', '/r:System.Web.Extensions.dll', '/r:System.Windows.Forms.dll', '/r:System.Drawing.dll')
function Invoke-HelperTool([string]$Executable, [string[]]$ToolArguments, [string]$Label, [int]$ExpectedExit) {
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $Executable
    foreach ($argument in $ToolArguments) { if ($argument.Contains('"') -or $argument.EndsWith('\')) { throw 'BUILD_ARGUMENT_REJECTED' } }
    $start.Arguments = ($ToolArguments | ForEach-Object { '"' + $_ + '"' }) -join ' '
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $process = [Diagnostics.Process]::Start($start)
    try {
        $outputTask = $process.StandardOutput.ReadToEndAsync()
        $errorTask = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(45000)) { $process.Kill(); throw 'HELPER_TOOL_TIMEOUT' }
        $outputText = $outputTask.GetAwaiter().GetResult()
        $errorText = $errorTask.GetAwaiter().GetResult()
        if ($process.ExitCode -ne $ExpectedExit -or $errorText.Length -ne 0) { throw ($Label + '_FAILED: exit=' + $process.ExitCode + '; ' + $errorText + $outputText) }
        return [ordered]@{ label = $Label; exit_code = $process.ExitCode; stderr_empty = $true; stdout = $outputText }
    } finally { $process.Dispose() }
}
$compiled = Invoke-HelperTool $compiler ($options + $sources) 'HELPER_COMPILATION' 0
$pureRun = Invoke-HelperTool $binary @('--self-test') 'HELPER_PURE_SELF_TEST' 0
$pure = $pureRun.stdout | ConvertFrom-Json
if ($pure.failed -ne 0 -or $pure.windows_boundary_qualified -ne $false -or $pure.uac_executed -ne $false) { throw 'HELPER_PURE_RESULT_INVALID' }

# This entry is permitted only when protected deployment is visibly absent and
# the current process is a non-admin Low/Medium test token. Never High or UAC.
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
try { $administrator = ([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) }
finally { $identity.Dispose() }
$groupProbe = Invoke-HelperTool 'C:\Windows\System32\whoami.exe' @('/groups', '/fo', 'csv', '/nh') 'READ_ONLY_TOKEN_INTEGRITY_PROBE' 0
$groupRows = @($groupProbe.stdout | ConvertFrom-Csv -Header 'name', 'type', 'sid', 'attributes')
$mediumIntegrity = @($groupRows | Where-Object { $_.sid -eq 'S-1-16-8192' }).Count -eq 1
$lowIntegrity = @($groupRows | Where-Object { $_.sid -eq 'S-1-16-4096' }).Count -eq 1
$tokenIntegrity = if ($mediumIntegrity) { 'MEDIUM' } elseif ($lowIntegrity) { 'LOW' } else { 'OTHER' }
$interactiveSession = [Diagnostics.Process]::GetCurrentProcess().SessionId -gt 0
$ordinaryToken = -not $administrator -and ($mediumIntegrity -or $lowIntegrity) -and $interactiveSession
$protectedConfig = 'C:\ProgramData\AgentNexusCredential\service-config.json'
$absentConfig = -not (Test-Path -LiteralPath $protectedConfig -PathType Leaf)
$negative = [ordered]@{ result = 'NOT_RUN'; reason = 'MISSING_DEPLOYMENT_AND_LOW_OR_MEDIUM_NONADMIN_TOKEN_REQUIRED'; ordinary_token = $ordinaryToken; token_integrity = $tokenIntegrity; missing_protected_config = $absentConfig }
if ($ordinaryToken -and $absentConfig) {
    $argsForNegative = @('--action', 'ADD', '--provider-id', 'deepseek', '--operation-id', '11111111-1111-4111-8111-111111111111', '--name', 'Synthetic Key', '--model-ids', 'deepseek-flash')
    $negativeRun = Invoke-HelperTool $binary $argsForNegative 'MISSING_DEPLOYMENT_BLOCKS_BEFORE_INPUT' 21
    if ($negativeRun.stdout.Length -ne 0) { throw 'HELPER_NORMAL_OUTPUT_NOT_EMPTY' }
    $negative = [ordered]@{ result = 'PASS'; exit_code = 21; stdout_empty = $true; stderr_empty = $true; ordinary_token = $true; token_integrity = $tokenIntegrity; medium_integrity = $mediumIntegrity; administrator = $false; interactive_session = $true; missing_protected_config = $true; uac_executed = $false; input_window_started = $false }
}
$hashes = @()
foreach ($path in (@($binary, $manifest, $PSCommandPath) + $sources)) {
    $hashes += [ordered]@{ path = [IO.Path]::GetFullPath($path); sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() }
}
$report = [ordered]@{
    schema = 1; suite = 'M1.8.3-Q3_TRUSTED_HELPER'; compiler = $compiler
    compiler_version = (Get-Item -LiteralPath $compiler).VersionInfo.FileVersion
    built_at_utc = [DateTime]::UtcNow.ToString('o'); compilation = $compiled
    pure_self_test = $pure; missing_deployment_negative = $negative; hashes = $hashes
    windows_qualification = 'BLOCKED'; windows_qualification_tests = 'NOT_RUN'
    trusted_memory_isolation = 'BLOCKED'; process_thread_token_object_protection_implemented = $true
    helper_object_security_runtime_test = 'NOT_RUN'; helper_kernel_object_mutations_executed = $false
    startup_handle_race_closed = $false; service_process_query_mask = '0x00101000'; service_token_query_mask = '0x00000008'
    uac_test = 'NOT_RUN'; trusted_input_ui_test = 'NOT_RUN'
    installed_service = $false; changed_accounts_or_acl = $false; changed_firewall = $false
    used_appcontainer_or_ubuntu = $false; used_real_credentials_or_network = $false
}
$json = $report | ConvertTo-Json -Depth 12
[IO.File]::WriteAllText((Join-Path $runtimeRoot 'helper-build-report.json'), $json, [Text.UTF8Encoding]::new($false))
Write-Output $json
