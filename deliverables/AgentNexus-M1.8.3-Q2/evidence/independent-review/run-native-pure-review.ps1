[CmdletBinding()]
param([switch]$HelperOnly)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Independent local compilation + explicit pure-test branches only. Never launch
# any normal/helper/launcher/service operation or alter OS security/deployment.
$reviewEvidence = $PSScriptRoot
$reviewSource = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\source'))
$reviewCompiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$reviewCommon = Join-Path $reviewSource 'native\credential-service\Common.cs'
$reviewHelper = Join-Path $reviewSource 'native\credential-helper'
$reviewLauncher = Join-Path $reviewSource 'native\credential-launcher'
$reviewBaseArgs = @('/nologo','/target:exe','/platform:x64','/langversion:5','/optimize+','/warn:4','/warnaserror+','/r:System.Core.dll','/r:System.Security.dll','/r:System.Web.Extensions.dll')
$reviewResults = @()
function Invoke-ReviewPure([string]$Name, [string[]]$CompilerArgs, [string[]]$Sources, [string[]]$TestArgs) {
    $reviewExe = Join-Path $reviewEvidence ($Name + '.exe')
    $reviewCompile = & $reviewCompiler @reviewBaseArgs @CompilerArgs ('/out:' + $reviewExe) @Sources 2>&1
    $reviewCompileExit = $LASTEXITCODE
    $reviewCompile | Set-Content -LiteralPath (Join-Path $reviewEvidence ($Name + '-compile.log')) -Encoding utf8
    if ($reviewCompileExit -ne 0) { throw ('PURE_COMPILATION_FAILED:' + $Name) }
    $reviewOutput = & $reviewExe @TestArgs 2>&1
    $reviewExit = $LASTEXITCODE
    $reviewOutput | Set-Content -LiteralPath (Join-Path $reviewEvidence ($Name + '-result.json')) -Encoding utf8
    if ($reviewExit -ne 0) { throw ('PURE_TEST_FAILED:' + $Name) }
    $reviewParsed = ($reviewOutput -join [Environment]::NewLine) | ConvertFrom-Json
    if ($reviewParsed.windows_boundary_qualified -ne $false -or $reviewParsed.failed -ne 0) { throw ('PURE_EVIDENCE_INVALID:' + $Name) }
    return [pscustomobject]@{ name=$Name; compile_exit=0; test_exit=$reviewExit; command=($reviewExe + ' ' + ($TestArgs -join ' ')); binary_sha256=(Get-FileHash -LiteralPath $reviewExe -Algorithm SHA256).Hash.ToLowerInvariant(); result=$reviewParsed }
}
$reviewHelperSources = @($reviewCommon,(Join-Path $reviewHelper 'HelperIntent.cs'),(Join-Path $reviewHelper 'HelperProtocol.cs'),(Join-Path $reviewHelper 'TrustedCredentialHelper.cs'),(Join-Path $reviewHelper 'HelperTests.cs'))
$reviewResults += Invoke-ReviewPure 'helper-pure-review' @('/main:AgentNexus.CredentialBoundary.TrustedHelperProgram',('/win32manifest:' + (Join-Path $reviewHelper 'helper.manifest')),'/r:System.Windows.Forms.dll','/r:System.Drawing.dll') $reviewHelperSources @('--self-test')
if (-not $HelperOnly) {
    $reviewResults += Invoke-ReviewPure 'launcher-pure-review' @('/main:AgentNexus.CredentialBoundary.LauncherProgram',('/win32manifest:' + (Join-Path $reviewLauncher 'launcher.manifest'))) @($reviewCommon,(Join-Path $reviewLauncher 'CredentialLauncher.cs')) @('--self-test')
    $reviewResults += Invoke-ReviewPure 'service-pure-review' @('/main:AgentNexus.CredentialBoundary.ServiceProgram','/r:System.ServiceProcess.dll') @($reviewCommon,(Join-Path $reviewSource 'native\credential-service\CredentialService.cs')) @('--self-test')
}
$reviewResultFile = if ($HelperOnly) { 'native-helper-final-review-results.json' } else { 'native-pure-review-results.json' }
$reviewResults | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $reviewEvidence $reviewResultFile) -Encoding utf8
$reviewResults | ConvertTo-Json -Depth 10
