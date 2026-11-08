$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$handles=[Collections.Generic.List[IntPtr]]::new()
try {
    Add-Type -Path (Join-Path $PSScriptRoot 'M151LifecycleProbe.cs')
    $line=[Console]::ReadLine()
    if ($line.Length -gt 65535) { throw 'Fixture frame limit' }
    $request=ConvertFrom-Json -InputObject $line -AsHashtable
    if ($request.mode -eq 'breakaway') { $result=[M151LifecycleProbe]::Breakaway($request.executable,$request.fixture) }
    elseif ($request.mode -eq 'wait') {
        if ($request.processes.Count -lt 1 -or $request.processes.Count -gt 16) { throw 'Fixture identity limit' }
        foreach ($identity in $request.processes) { $handles.Add([M151LifecycleProbe]::Pin([uint32]$identity.pid,[string]$identity.start_id)) }
        [Console]::WriteLine('{"event":"PINNED"}')
        $exits=@();foreach ($handle in $handles) { $exits+= [M151LifecycleProbe]::Exited($handle,5000) }
        $result=@{exits=$exits;processes=$request.processes;release_authority=$false;membership_complete=$false}
    } else { throw 'Unsupported fixed fixture mode' }
    [Console]::WriteLine((ConvertTo-Json -InputObject @{ok=$true;result=$result} -Depth 12 -Compress))
} catch { [Console]::WriteLine((ConvertTo-Json -InputObject @{ok=$false;error=$_.Exception.GetBaseException().Message} -Compress)) }
finally { foreach ($handle in $handles) { [void][M151LifecycleProbe]::CloseHandle($handle) } }
