$ErrorActionPreference = 'Stop'
$taskRuntimeRoot = [IO.Path]::GetFullPath('I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M2.0')
if (([IO.File]::GetAttributes($taskRuntimeRoot) -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Task runtime root is a reparse point' }
$queue = [Collections.Generic.Queue[string]]::new()
$queue.Enqueue($taskRuntimeRoot)
$links = [Collections.Generic.List[object]]::new()
while ($queue.Count -gt 0) {
    $folder = $queue.Dequeue()
    foreach ($entry in [IO.Directory]::EnumerateFileSystemEntries($folder)) {
        $absoluteEntry = [IO.Path]::GetFullPath($entry)
        if (-not $absoluteEntry.StartsWith($taskRuntimeRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Entry escaped task runtime root' }
        $attributes = [IO.File]::GetAttributes($absoluteEntry)
        if (($attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            $item = Get-Item -LiteralPath $absoluteEntry -Force
            $links.Add([pscustomobject]@{ path=$absoluteEntry; target=$item.Target; attributes=[string]$attributes; operation='REMOVE_REPARSE_ENTRY_ONLY_NON_RECURSIVE'; status='PENDING' })
        } elseif (($attributes -band [IO.FileAttributes]::Directory) -ne 0) {
            $queue.Enqueue($absoluteEntry)
        }
    }
}
$manifest = Join-Path $taskRuntimeRoot 'test-link-cleanup.json'
$links | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifest -Encoding utf8
foreach ($link in $links) {
    $attributes = [IO.File]::GetAttributes($link.path)
    if (($attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) { throw 'Entry is no longer a reparse point; refused removal' }
    if (($attributes -band [IO.FileAttributes]::Directory) -ne 0) { [IO.Directory]::Delete($link.path, $false) }
    else { [IO.File]::Delete($link.path) }
    $link.status = 'REMOVED_LINK_ENTRY_TARGET_UNTOUCHED'
}
$links | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifest -Encoding utf8
Write-Output ('Removed only own test reparse entries: ' + $links.Count)
