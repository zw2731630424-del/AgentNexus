# AgentNexus M1 Source Review — Part 3

原件逐字节嵌入，保留CRLF/BOM/末尾换行。原始内容不格式化。每节标记中的bytes只计原文件；无末尾LF时补的分隔换行属于包装。integrity库仅测试导入，不是Host模块；JSON是运行数据，runner是测试入口。

## src/agentnexus/cli.ts

类别：`current_native_implementation`；原始字节数：1928。

源文件 SHA256：

```text
458b10cdbe3236b0e5ace1439334095bc30243fafeaf071273de956d22511b15
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0012","path":"src/agentnexus/cli.ts","bytes":1928,"sha256":"458b10cdbe3236b0e5ace1439334095bc30243fafeaf071273de956d22511b15","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/cli.ts"}} -->
```typescript
import { fileURLToPath } from 'node:url';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { openHost } from './host.ts';

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== 'demo') {
    process.stdout.write('Usage: node src/agentnexus/cli.ts demo\n'); process.exitCode = 2; return;
  }
  const base = fileURLToPath(new URL('../../.workflow-kit/runtime/AgentNexus-v0.4-M1/demos/', import.meta.url));
  await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, 'local-'));
  const host = await openHost(root);
  const agent = host.bindAgent({ agent_id: 'demo-agent', project_id: 'demo-project', task_id: 'demo-task', session_id: 'demo-session' });
  try {
    const echo = await agent.request({ call_id: 'echo-1', tool_id: 'native.echo', tool_version: '1', arguments: { message: 'AgentNexus native M1', real_model: false } });
    const diagnostics = await agent.request({ call_id: 'json-1', tool_id: 'native.diagnostics', tool_version: '1', arguments: { language: 'json', source: '{"broken":}', document_uri: 'memory:demo.json', version: 1 } });
    const timeline = agent.reconstructTask();
    const verification = await host.store.verify();
    process.stdout.write(JSON.stringify({
      scope: 'Real local broker/SQLite/artifact/JSON checks with synthetic inputs; no model or shell execution',
      root, deployment: host.deployment, echo, diagnostics,
      reconstruction: { events: timeline.records.length, next_cursor: timeline.next_cursor, replay: timeline.replay }, verification,
    }, null, 2) + '\n');
    if (echo.status !== 'PASS' || diagnostics.status !== 'PASS' || (diagnostics.data as any)?.status !== 'FAIL') process.exitCode = 1;
  } finally { await agent.close(); await host.close(); }
}
main().catch(error => { process.stderr.write(`${error.code ?? error.name}: ${error.message}\n`); process.exitCode = 1; });
```
<!-- agentnexus-export-end -->

## src/agentnexus/checkers/python_ast.py

类别：`current_native_implementation`；原始字节数：2998。

源文件 SHA256：

```text
a9595eca900b49c4ec88e82599c28569b01e543ed8ecb52908ae0772b104fc6e
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0013","path":"src/agentnexus/checkers/python_ast.py","bytes":2998,"sha256":"a9595eca900b49c4ec88e82599c28569b01e543ed8ecb52908ae0772b104fc6e","language":"python","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/checkers/python_ast.py"}} -->
```python
"""AgentNexus trusted, parse-only stdin adapter. Never executes the supplied source."""

import ast
import json
import platform
import sys


MAX_SOURCE_BYTES = 256 * 1024
SCHEMA = "agentnexus/checker/0.1"


def bounded_message(value):
    return str(value).encode("utf-8")[:1024].decode("utf-8", "ignore")


def point(lines, line_number, offset):
    line_index = max(0, min((line_number or 1) - 1, len(lines) - 1))
    line = lines[line_index].rstrip("\r\n")
    # SyntaxError offsets are one-based Unicode-character offsets, not AST byte offsets.
    column = max(0, min((offset or 1) - 1, len(line)))
    return {"line": line_index, "character": len(line[:column].encode("utf-16-le")) // 2}


def main():
    result = {
        "schema": SCHEMA,
        "checker_id": "python-ast",
        "checker_version": platform.python_version(),
        "status": "PASS",
        "reason": "AST_PARSE_ONLY",
        "diagnostics": [],
    }
    try:
        raw = sys.stdin.buffer.read(MAX_SOURCE_BYTES + 1)
        if len(raw) > MAX_SOURCE_BYTES:
            result.update(status="INCONCLUSIVE", reason="SOURCE_LIMIT")
        elif sys.version_info < (3, 12) or sys.version_info.major != 3:
            result.update(status="INCONCLUSIVE", reason="UNSUPPORTED_PYTHON_VERSION")
        else:
            source = raw.decode("utf-8", "strict")
            try:
                # mode='exec' selects the module grammar; it does not execute anything.
                ast.parse(source, filename="<diagnostic>", mode="exec")
            except SyntaxError as error:
                lines = source.splitlines(keepends=True) or [""]
                location = None
                if error.lineno and error.offset and 1 <= error.lineno <= len(lines):
                    start = point(lines, error.lineno, error.offset)
                    end = point(lines, error.end_lineno or error.lineno, error.end_offset or error.offset)
                    if (end["line"], end["character"]) < (start["line"], start["character"]):
                        end = start.copy()
                    location = {"start": start, "end": end}
                result.update(status="FAIL", reason="SYNTAX_ERROR")
                result["diagnostics"] = [{
                    "code": "PYTHON_SYNTAX_ERROR", "severity": "error",
                    "message": bounded_message(error.msg),
                    "range": location,
                }]
    except UnicodeDecodeError:
        result.update(status="FAIL", reason="INVALID_UTF8")
    except (RecursionError, MemoryError):
        result.update(status="INCONCLUSIVE", reason="PARSER_RESOURCE_LIMIT")
    except Exception:
        # Do not return exception repr/tracebacks containing process configuration or source.
        result.update(status="INCONCLUSIVE", reason="CHECKER_FAILED")
    data = json.dumps(result, ensure_ascii=True, separators=(",", ":")).encode("ascii")
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


if __name__ == "__main__":
    main()
```
<!-- agentnexus-export-end -->

## src/agentnexus/checkers/powershell_ast.ps1

类别：`current_native_implementation`；原始字节数：3780。

源文件 SHA256：

```text
90079d41e2083df61ee87456cbe81a4d1863b2f4053df0ab9e78b668e3789ae8
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0014","path":"src/agentnexus/checkers/powershell_ast.ps1","bytes":3780,"sha256":"90079d41e2083df61ee87456cbe81a4d1863b2f4053df0ab9e78b668e3789ae8","language":"powershell","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/checkers/powershell_ast.ps1"}} -->
```powershell
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
```
<!-- agentnexus-export-end -->

## package.json

类别：`current_package_metadata`；原始字节数：293。

源文件 SHA256：

```text
e23288d939a3706e522bf34a1d87802242b418749c37f1e54c5b481562ffd809
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0015","path":"package.json","bytes":293,"sha256":"e23288d939a3706e522bf34a1d87802242b418749c37f1e54c5b481562ffd809","language":"json","fence":"```","wrapper_padding_newline":false,"category":"current_package_metadata","kind":"original","origin":{"kind":"workspace","path":"package.json"}} -->
```json
{
  "name": "agentnexus",
  "version": "0.4.0-m1.1",
  "private": true,
  "type": "module",
  "engines": { "node": "24.15.0" },
  "scripts": {
    "test": "node tools/agentnexus/run-tests.mjs",
    "demo": "node src/agentnexus/cli.ts demo"
  },
  "dependencies": {},
  "devDependencies": {}
}
```
<!-- agentnexus-export-end -->

## tools/agentnexus/run-tests.mjs

类别：`current_test_bootstrap`；原始字节数：667。

源文件 SHA256：

```text
7b1b45b072e55e4c2e079e90aa963d94584a871496945ed88b737cb42dd4c0b7
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0016","path":"tools/agentnexus/run-tests.mjs","bytes":667,"sha256":"7b1b45b072e55e4c2e079e90aa963d94584a871496945ed88b737cb42dd4c0b7","language":"javascript","fence":"```","wrapper_padding_newline":false,"category":"current_test_bootstrap","kind":"original","origin":{"kind":"workspace","path":"tools/agentnexus/run-tests.mjs"}} -->
```javascript
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));
const files = readdirSync(new URL('../../tests/agentnexus/', import.meta.url))
  .filter(name => name.endsWith('.test.ts')).sort().map(name => `tests/agentnexus/${name}`);
if (!files.length) throw new Error('No AgentNexus tests found');
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', ...files], { cwd: root, stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
```
<!-- agentnexus-export-end -->

