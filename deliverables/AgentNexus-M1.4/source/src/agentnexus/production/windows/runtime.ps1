# M1.4 JSONL native RPC. Start with pwsh -NoProfile -NonInteractive -File runtime.ps1.
# Each UTF-8 frame, including LF, is <=65536 bytes. stdout contains JSON only.
# request: {id:string,op:string,deadline_ms:1..30000,params:{...}}
# response: {id,ok:true,result} or {id,ok:false,error:{code,message}}.
# sandbox.run emits {id,event:'stdout'|'stderr',data_base64} frames (4KiB chunks)
# before the final response. Writes block under stdout backpressure; output bytes
# are capped per stream and globally via limits.output_bytes (<=32MiB). The final
# result carries a <=4KiB preview, total counts and actual producer EOF per stream.
# primitive.job uses the same Job path without identity/AppContainer restrictions;
# it is explicitly synthetic, never a fallback. stream_output=true tests streaming.
# sandbox.prepare (same params as run, prepare_ttl_ms:1..30000) returns
# {prepare_id,process,parent,job_id,suspended:true,resumed:false,expires_at} after
# native token/Job verification. All handles stay in this helper process. No user
# code runs before sandbox.resume({prepare_id,expected_process:{principal,pid,
# start_id,os_session}}). The Supervisor signs its Grant for that actual identity.
# Resume consumes prepare_id once; mismatches cancel it. sandbox.observe and
# sandbox.terminate accept {prepare_id}. Terminate applies to an unresumed item.
# The sequential RPC reader cannot receive terminate during a blocking resume;
# killing/closing the helper closes KILL_ON_JOB_CLOSE. Max four pending prepares,
# 128 retained IDs; helper restart invalidates every ID. primitive.prepare/resume/
# observe/terminate share the code path but have no production identity authority.
# Existing approved identity/profile and independent deployment bootstrap wiring
# still need real combination evidence; production remains BLOCKED.
# CPU_TIME capability: FAIL/BLOCKED in the current managed, nested host sandbox.
# A real infinite CPU fixture exceeded configured/read-back JOB_TIME and needed
# the helper wall-deadline termination. Keep this failure as evidence; no setting
# success, bandwidth cap or input boolean can certify cumulative CPU enforcement.
# identity: {pid?}; fields principal/pid/start_id/os_session come from pinned OS handles.
# token.restrict: {restricting_sid?}; returns detailed original/restricted token readback.
# appcontainer.derive: {profile_name}; only derives SID; never creates/checks a profile.
# pipe.server/client: {name:'AgentNexus-M14-...',expected_peer:{principal,pid,start_id,
#   os_session},payload_base64?}; a single connection (max_instances=1), actual local
#   kernel peer verification on both ends before bounded exchange. Expected identity
#   must be supplied by the trusted Supervisor, never copied from a pipe payload.
# file.read/create: {root:'I:\...';relative_path:'a\b';max_bytes:0..24576,
#   content_base64?}. Ancestors remain open without share-write/delete. New output
#   only; no overwrite, mkdir, delete, ADS, UNC, device names, reparse or hard links.
# sandbox.run: {executable,executable_sha256,args:[],cwd,profile_name,expected_worker_sid,host_sid,
#   restricting_sid,limits:{active_processes,process_memory_bytes,job_memory_bytes,
#   cpu_rate:1..10000,cpu_ms:1..30000},stdout_max_bytes,stderr_max_bytes}. cpu_ms
#   defaults to 1000 and configures cumulative USER-MODE JOB_TIME in 100ns units; cpu_rate
#   independently caps bandwidth. Both and TERMINATE-at-end are read back.
#   Requires distinct existing account,
#   externally provisioned profile and all native checks; never falls back.
# All observations have release_authority=false. Job membership history is incomplete.
# A per-request process watchdog closes every handle on a stuck OS call. The Node
# adapter must also enforce a total transport deadline covering startup/compilation.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false, $true)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
try { Add-Type -Path (Join-Path $PSScriptRoot 'NativeRuntime.cs') } catch { [Console]::Error.WriteLine($_.Exception.Message); exit 2 }
$inputStream = [Console]::OpenStandardInput()
$outputStream = [Console]::OpenStandardOutput()
while ($true) {
    $requestId = $null
    $watchdog = $null
    try {
        $frame = [AgentNexusNativeRuntime]::ReadRpcFrame($inputStream)
        if ($null -eq $frame) { break }
        $request = ConvertFrom-Json -InputObject $frame -AsHashtable -Depth 48
        if ($request -isnot [Collections.IDictionary] -or $request.id -isnot [string] -or $request.id.Length -gt 128 -or $request.id.Length -eq 0) { throw 'Invalid RPC object/id' }
        $requestId = $request.id
        [AgentNexusNativeRuntime]::BeginRpc($requestId)
        $deadline = if ($request.Contains('deadline_ms')) { [int]$request.deadline_ms } else { 5000 }
        if ($deadline -lt 1 -or $deadline -gt 30000) { throw 'Invalid RPC deadline' }
        $watchdog = [AgentNexusNativeRuntime]::StartWatchdog($deadline + 500)
        $value = [AgentNexusNativeRuntime]::Dispatch($request)
        $response = @{ id = $requestId; ok = $true; result = $value }
    } catch {
        $exception = $_.Exception
        while ($null -ne $exception.InnerException) { $exception = $exception.InnerException }
        $code = if ($exception -is [AgentNexusNativeRuntime+BoundaryException]) { $exception.Code } elseif ($exception -is [ComponentModel.Win32Exception]) { 'WIN32_' + $exception.NativeErrorCode } elseif ($exception -is [UnauthorizedAccessException]) { 'ACCESS_DENIED' } elseif ($exception -is [OperationCanceledException] -or $exception -is [TimeoutException]) { 'DEADLINE' } else { 'INVALID_REQUEST' }
        $response = @{ id = $requestId; ok = $false; error = @{ code = $code; message = $exception.Message } }
    }
    $encoded = [Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $response -Depth 48 -Compress) + "`n")
    if ($encoded.Length -gt 65536) {
        $encoded = [Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -Compress @{id=$requestId;ok=$false;error=@{code='FRAME_LIMIT';message='Native response exceeds 64KiB'}}) + "`n")
    }
    try { [AgentNexusNativeRuntime]::WriteRpcResponse([Text.Encoding]::UTF8.GetString($encoded).TrimEnd("`n")) }
    finally { if ($null -ne $watchdog) { $watchdog.Dispose() } }
    if ($null -eq $requestId) { exit 3 }
}
