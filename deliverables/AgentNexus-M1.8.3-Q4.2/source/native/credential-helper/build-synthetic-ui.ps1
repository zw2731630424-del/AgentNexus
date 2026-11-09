[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Compilation only. A dedicated controller supplies a synthetic service and
# explicitly drives visible controls; this script does not start a window/UAC.
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..\..'))
$runtimeRoot = Join-Path $workspaceRoot '.workflow-kit\runtime\AgentNexus-M1.8.3-Q3\native-helper-ui'
$compiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler -PathType Leaf)) { throw 'CSC_NOT_FOUND' }
[void](New-Item -ItemType Directory -Path $runtimeRoot -Force)
$common = Join-Path $PSScriptRoot '..\credential-service\Common.cs'
$contracts = Join-Path $PSScriptRoot '..\qualification-signer\SigningContracts.cs'
$shared = @($common, $contracts, (Join-Path $PSScriptRoot 'HelperIntent.cs'), (Join-Path $PSScriptRoot 'HelperProtocol.cs'), (Join-Path $PSScriptRoot 'TrustedCredentialHelper.cs'), (Join-Path $PSScriptRoot 'HelperTests.cs'))
$manifest = Join-Path $PSScriptRoot 'helper.manifest'
$worker = Join-Path $runtimeRoot 'synthetic-credential-ui.exe'
$driver = Join-Path $runtimeRoot 'synthetic-ui-driver.exe'
$base = @('/nologo', '/target:exe', '/platform:x64', '/langversion:5', '/optimize+', '/warn:4', '/warnaserror+', '/r:System.Core.dll', '/r:System.Security.dll', '/r:System.Web.Extensions.dll', '/r:System.Windows.Forms.dll', '/r:System.Drawing.dll', "/win32manifest:$manifest")
& $compiler @base '/define:SYNTHETIC_HELPER_UI' '/main:AgentNexus.CredentialBoundary.SyntheticUiProgram' "/out:$worker" @shared (Join-Path $PSScriptRoot 'SyntheticUiWorker.cs')
if ($LASTEXITCODE -ne 0) { throw 'SYNTHETIC_UI_COMPILATION_FAILED' }
$wpf = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\WPF'
& $compiler @base '/main:AgentNexus.CredentialBoundary.SyntheticUiDriver' "/out:$driver" "/r:$wpf\UIAutomationClient.dll" "/r:$wpf\UIAutomationTypes.dll" "/r:$wpf\WindowsBase.dll" $common $contracts (Join-Path $PSScriptRoot 'SyntheticUiDriver.cs')
if ($LASTEXITCODE -ne 0) { throw 'SYNTHETIC_UI_DRIVER_COMPILATION_FAILED' }
$report = [ordered]@{ schema = 1; suite = 'M1.8.3-Q3_SYNTHETIC_HELPER_UI_BUILD'; worker = $worker; driver = $driver; worker_sha256 = (Get-FileHash -LiteralPath $worker -Algorithm SHA256).Hash.ToLowerInvariant(); driver_sha256 = (Get-FileHash -LiteralPath $driver -Algorithm SHA256).Hash.ToLowerInvariant(); ui_launched = 'NOT_RUN'; uac_verified = 'NOT_RUN'; installed_service = $false; changed_accounts_or_acl = $false; real_key_or_network = $false }
$json = $report | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText((Join-Path $runtimeRoot 'build-report.json'), $json, [Text.UTF8Encoding]::new($false))
Write-Output $json
