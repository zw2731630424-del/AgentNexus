param([Parameter(Mandatory = $true)][ValidateSet('Protect','Unprotect')][string]$Operation)
# This helper is not an isolation boundary. It runs only for the owning host.
# Binary input/output are anonymous pipes; do not add payload arguments or logs.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$inputBytes = $null
$outputBytes = $null
$memory = $null
try {
  Add-Type -AssemblyName System.Security
  $stream = [Console]::OpenStandardInput()
  $memory = [System.IO.MemoryStream]::new()
  $chunk = [byte[]]::new(4096)
  while (($count = $stream.Read($chunk, 0, $chunk.Length)) -gt 0) {
    if (($memory.Length + $count) -gt 65536) { throw 'DPAPI_INPUT_LIMIT' }
    $memory.Write($chunk, 0, $count)
  }
  [Array]::Clear($chunk, 0, $chunk.Length)
  $inputBytes = $memory.ToArray()
  if ($inputBytes.Length -eq 0) { throw 'DPAPI_INPUT_EMPTY' }
  $entropy = [Text.Encoding]::UTF8.GetBytes('AgentNexus/Vault/M1.8/CurrentUser')
  $scope = [System.Security.Cryptography.DataProtectionScope]::CurrentUser
  if ($Operation -eq 'Protect') {
    $outputBytes = [System.Security.Cryptography.ProtectedData]::Protect($inputBytes, $entropy, $scope)
  } else {
    $outputBytes = [System.Security.Cryptography.ProtectedData]::Unprotect($inputBytes, $entropy, $scope)
  }
  $output = [Console]::OpenStandardOutput()
  $output.Write($outputBytes, 0, $outputBytes.Length)
  $output.Flush()
} catch {
  [Console]::Error.WriteLine('DPAPI_OPERATION_FAILED')
  exit 1
} finally {
  if ($null -ne $inputBytes) { [Array]::Clear($inputBytes, 0, $inputBytes.Length) }
  if ($null -ne $outputBytes) { [Array]::Clear($outputBytes, 0, $outputBytes.Length) }
  if ($null -ne $memory) { $memory.Dispose() }
}
