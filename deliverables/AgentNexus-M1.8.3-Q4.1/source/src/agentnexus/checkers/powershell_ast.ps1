# AgentNexus trusted parse-only adapter. Supplied stdin is never invoked or evaluated.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$PSModuleAutoLoadingPreference = 'None'

function New-ResultDictionary([hashtable] $Fields) {
    $dictionary = [System.Collections.Generic.Dictionary[string, object]]::new()
    foreach ($key in $Fields.Keys) { $dictionary.Add([string]$key, $Fields[$key]) }
    return ,$dictionary
}

function Limit-Message([string] $Text) {
    if ($Text.Length -le 256) { return $Text }
    return $Text.Substring(0, 256)
}

$diagnostics = [System.Collections.Generic.List[object]]::new()
$result = New-ResultDictionary @{
    schema = 'agentnexus/checker/0.1'
    checker_id = 'powershell-ast'
    checker_version = ($PSVersionTable.PSVersion.ToString() + '/SMA-' + [System.Management.Automation.Language.Parser].Assembly.GetName().Version.ToString())
    status = 'PASS'
    reason = 'POWERSHELL_PARSE_ONLY'
    diagnostics = $diagnostics
}

try {
    $inputStream = [Console]::OpenStandardInput()
    $memory = [System.IO.MemoryStream]::new()
    $buffer = [byte[]]::new(8192)
    $limit = 256 * 1024
    while ($memory.Length -le $limit) {
        $remaining = [int][Math]::Min($buffer.Length, $limit + 1 - $memory.Length)
        $count = $inputStream.Read($buffer, 0, $remaining)
        if ($count -eq 0) { break }
        $memory.Write($buffer, 0, $count)
    }
    if ($memory.Length -gt $limit) {
        $result['status'] = 'INCONCLUSIVE'
        $result['reason'] = 'SOURCE_LIMIT'
    } elseif ($PSVersionTable.PSVersion.Major -ne 7) {
        $result['status'] = 'INCONCLUSIVE'
        $result['reason'] = 'UNSUPPORTED_POWERSHELL_VERSION'
    } else {
        $source = [System.Text.UTF8Encoding]::new($false, $true).GetString($memory.ToArray())
        $tokens = $null
        $parseErrors = $null
        $ast = [System.Management.Automation.Language.Parser]::ParseInput($source, '<diagnostic>', [ref]$tokens, [ref]$parseErrors)
        $errorCount = $parseErrors.Count
        if ($errorCount -gt 0) {
            $result['status'] = 'FAIL'
            $result['reason'] = 'SYNTAX_ERROR'
            for ($i = 0; $i -lt [Math]::Min(200, $errorCount); $i++) {
                $parseError = $parseErrors[$i]
                $extent = $parseError.Extent
                $start = New-ResultDictionary @{ line = [int]($extent.StartLineNumber - 1); character = [int]($extent.StartColumnNumber - 1) }
                $end = New-ResultDictionary @{ line = [int]($extent.EndLineNumber - 1); character = [int]($extent.EndColumnNumber - 1) }
                $range = New-ResultDictionary @{ start = $start; end = $end }
                $diagnostic = New-ResultDictionary @{
                    code = ('POWERSHELL_' + $parseError.ErrorId)
                    severity = 'error'
                    message = (Limit-Message $parseError.Message)
                    range = $range
                }
                $diagnostics.Add($diagnostic)
            }
            if ($errorCount -gt 200) {
                $result['status'] = 'INCONCLUSIVE'
                $result['reason'] = 'DIAGNOSTICS_LIMIT'
            }
        }
    }
} catch {
    $result['status'] = 'INCONCLUSIVE'
    $result['reason'] = 'CHECKER_FAILED'
    $diagnostics.Clear()
} finally {
    if ($null -ne $memory) { $memory.Dispose() }
    if ($null -ne $inputStream) { $inputStream.Dispose() }
}

# System.Text.Json avoids importing configuration-sensitive PowerShell utility modules.
$json = [System.Text.Json.JsonSerializer]::Serialize($result, $result.GetType())
$outputBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$outputStream = [Console]::OpenStandardOutput()
$outputStream.Write($outputBytes, 0, $outputBytes.Length)
$outputStream.Flush()
