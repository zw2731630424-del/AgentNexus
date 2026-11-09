$ErrorActionPreference = 'Stop'
$base = Join-Path $PSScriptRoot ('path-lock-' + [Guid]::NewGuid().ToString('N'))
$source = Join-Path $base 'source'
$renamed = Join-Path $base 'renamed'
[void][IO.Directory]::CreateDirectory($source)
$file = Join-Path $source 'held.txt'
[IO.File]::WriteAllText($file,'reviewed content')
$stream = [IO.File]::Open($file,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
try {
    $moved = $false
    $moveFailure = $null
    try { [IO.Directory]::Move($source,$renamed); $moved = $true } catch { $moveFailure = $_.Exception.GetType().FullName + ': ' + $_.Exception.Message }
    $result = [ordered]@{ scope='PURE_OFFLINE_FILESYSTEM_ONLY'; file_share='Read'; ancestor_rename_succeeded=$moved; error=$moveFailure; base=$base; system_acl_changes=$false; service_changes=$false }
} finally { $stream.Dispose() }
$result.after_dispose_rename_succeeded = $false
try { if (-not $moved) { [IO.Directory]::Move($source,$renamed); $result.after_dispose_rename_succeeded = $true } } catch { $result.after_dispose_error = $_.Exception.Message }
$result | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText((Join-Path $base 'result.json'),($result | ConvertTo-Json -Depth 4))
