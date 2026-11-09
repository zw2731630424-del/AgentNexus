[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Compilation and pure parser/token-predicate fixtures only. Never launch normal mode here.
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..\..'))
$runtimeRoot = Join-Path $workspaceRoot '.workflow-kit\runtime\AgentNexus-M1.8.3-Q3\native-launcher'
$compiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler -PathType Leaf)) { throw 'CSC_NOT_FOUND' }
[void](New-Item -ItemType Directory -Path $runtimeRoot -Force)
$binary = Join-Path $runtimeRoot 'credential-launcher.exe'
$common = Join-Path $PSScriptRoot '..\credential-service\Common.cs'
$arguments = @('/nologo', '/target:exe', '/platform:x64', '/optimize+', '/warn:4', '/warnaserror+', '/r:System.Core.dll', '/r:System.ServiceProcess.dll', '/r:System.Security.dll', '/r:System.Web.Extensions.dll', "/out:$binary", '/main:AgentNexus.CredentialBoundary.LauncherProgram', ("/win32manifest:" + (Join-Path $PSScriptRoot 'launcher.manifest')), $common, (Join-Path $PSScriptRoot 'CredentialLauncher.cs'))
function Invoke-PureTool([string]$Executable, [string[]]$ToolArguments) {
  $start = [Diagnostics.ProcessStartInfo]::new()
  $start.FileName = $Executable
  foreach ($argument in $ToolArguments) { if ($argument.Contains('"') -or $argument.EndsWith('\')) { throw 'BUILD_ARGUMENT_REJECTED' } }
  $start.Arguments = ($ToolArguments | ForEach-Object { '"' + $_ + '"' }) -join ' '
  $start.UseShellExecute = $false; $start.CreateNoWindow = $true
  $start.RedirectStandardOutput = $true; $start.RedirectStandardError = $true
  $process = [Diagnostics.Process]::Start($start)
  try {
    $outputTask = $process.StandardOutput.ReadToEndAsync(); $errorTask = $process.StandardError.ReadToEndAsync()
    if (-not $process.WaitForExit(60000)) { $process.Kill(); throw 'PURE_TOOL_TIMEOUT' }
    $outputText = $outputTask.GetAwaiter().GetResult(); $errorText = $errorTask.GetAwaiter().GetResult()
    if ($process.ExitCode -ne 0 -or $errorText.Length -ne 0) { throw ('PURE_TOOL_FAILED:' + $errorText + $outputText) }
    return $outputText
  } finally { $process.Dispose() }
}
$compilation = Invoke-PureTool $compiler $arguments
$test = (Invoke-PureTool $binary @('--self-test')) | ConvertFrom-Json
if ($test.failed -ne 0 -or $test.windows_boundary_qualified -ne $false -or $test.uac_invoked -ne $false) { throw 'SELF_TEST_RESULT_INVALID' }
$report = [ordered]@{ schema = 1; compiler = $compiler; compiler_version = (Get-Item -LiteralPath $compiler).VersionInfo.FileVersion; compilation = $compilation; self_test = $test; binary_sha256 = (Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash.ToLowerInvariant(); os_uac = 'NOT_RUN'; installed = $false; used_real_credentials_or_network = $false }
$json = $report | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText((Join-Path $runtimeRoot 'build-report.json'), $json, [Text.UTF8Encoding]::new($false))
Write-Output $json
