[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# This script compiles and runs pure fixtures only. It never installs/starts services.
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..\..'))
$runtimeRoot = Join-Path $workspaceRoot '.workflow-kit\runtime\AgentNexus-M1.8.3-Q3\native'
$compiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler -PathType Leaf)) { throw 'CSC_NOT_FOUND' }
[void](New-Item -ItemType Directory -Path $runtimeRoot -Force)
$common = Join-Path $PSScriptRoot 'Common.cs'
$contracts = Join-Path $PSScriptRoot '..\qualification-signer\SigningContracts.cs'
$service = Join-Path $runtimeRoot 'AgentNexusCredential.exe'
$client = Join-Path $runtimeRoot 'pipe-client.exe'
$references = @('/r:System.Core.dll', '/r:System.ServiceProcess.dll', '/r:System.Security.dll', '/r:System.Web.Extensions.dll')
$options = @('/nologo', '/target:exe', '/platform:x64', '/optimize+', '/warn:4', '/warnaserror+') + $references
function Invoke-CapturedNative([string]$Executable, [string[]]$ToolArguments, [string]$Label) {
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $Executable
    # Every argument is generated above; none contains a literal quote or trailing backslash.
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
        if (-not $process.WaitForExit(60000)) { $process.Kill(); throw 'NATIVE_BUILD_TOOL_TIMEOUT' }
        $outputText = $outputTask.GetAwaiter().GetResult()
        $errorText = $errorTask.GetAwaiter().GetResult()
        if ($process.ExitCode -ne 0 -or $errorText.Length -ne 0) { throw ($Label + '_FAILED: ' + $errorText + $outputText) }
        return [ordered]@{ label = $Label; exit_code = $process.ExitCode; stderr_empty = $true; stdout = $outputText }
    } finally { $process.Dispose() }
}
$compilerRuns = @()
$compilerRuns += Invoke-CapturedNative $compiler ($options + @("/out:$service", '/main:AgentNexus.CredentialBoundary.ServiceProgram', $common, $contracts, (Join-Path $PSScriptRoot 'CredentialService.cs'), (Join-Path $PSScriptRoot 'DailyRuntime.cs'))) 'SERVICE_COMPILATION'
$compilerRuns += Invoke-CapturedNative $compiler ($options + @("/out:$client", '/main:AgentNexus.CredentialBoundary.ClientProgram', $common, $contracts, (Join-Path $PSScriptRoot 'PipeClient.cs'))) 'CLIENT_COMPILATION'
$tests = @()
foreach ($binary in @($service, $client)) {
    $captured = Invoke-CapturedNative $binary @('--self-test') 'PURE_SELF_TEST'
    $test = $captured.stdout | ConvertFrom-Json
    if ($test.failed -ne 0 -or $test.windows_boundary_qualified -ne $false) { throw 'SELF_TEST_RESULT_INVALID' }
    $tests += [ordered]@{ binary = [IO.Path]::GetFileName($binary); stderr_empty = $captured.stderr_empty; result = $test }
}
$hashes = @()
foreach ($path in @($service, $client, $common, $contracts, (Join-Path $PSScriptRoot 'CredentialService.cs'), (Join-Path $PSScriptRoot 'DailyRuntime.cs'), (Join-Path $PSScriptRoot 'PipeClient.cs'))) {
    $hashes += [ordered]@{ path = $path; sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() }
}
$report = [ordered]@{
    schema = 1
    compiler = $compiler
    compiler_version = (Get-Item -LiteralPath $compiler).VersionInfo.FileVersion
    compiler_runs = $compilerRuns
    built_at_utc = [DateTime]::UtcNow.ToString('o')
    tests = $tests
    hashes = $hashes
    windows_qualification = 'BLOCKED'
    installed_service = $false
    changed_accounts_or_acl = $false
    used_real_credentials_or_network = $false
}
$json = $report | ConvertTo-Json -Depth 12
[IO.File]::WriteAllText((Join-Path $runtimeRoot 'build-report.json'), $json, [Text.UTF8Encoding]::new($false))
Write-Output $json
