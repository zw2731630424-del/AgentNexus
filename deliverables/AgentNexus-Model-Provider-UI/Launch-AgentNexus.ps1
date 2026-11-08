$ErrorActionPreference = 'Stop'
$desktopSource = Join-Path $PSScriptRoot 'source'
$desktopNode = (Get-Command node -ErrorAction Stop).Source
& $desktopNode (Join-Path $desktopSource 'tools/agentnexus/launch-desktop.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Desktop launch failed.' }
