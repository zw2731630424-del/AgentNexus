param([Parameter(Mandatory=$true)][string]$NodePath)
$ErrorActionPreference='Stop'
if (-not $IsWindows) { throw 'Windows only' }
$projectRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$fixture=Join-Path $projectRoot 'tests/agentnexus/runtime-worker.mjs'
Add-Type -Path (Join-Path $projectRoot 'src/agentnexus/runtime/windows/NativeProbe.cs')
$cases=[Collections.Generic.List[object]]::new()
foreach($mode in @('normal','hold','orphan')) {
  try { $observation=[AgentNexusNativeProbe]::JobProbe($NodePath,$fixture,$mode); $cases.Add(@{name="job-$mode";status='OBSERVED';observation=$observation}) }
  catch { $cases.Add(@{name="job-$mode";status='INCONCLUSIVE';reason=$_.Exception.GetBaseException().Message}) }
}
foreach($authorized in @($true,$false)) {
  try { $observation=[AgentNexusNativeProbe]::PipeProbe($NodePath,$fixture,$authorized); $cases.Add(@{name="pipe-$authorized";status='OBSERVED';observation=$observation}) }
  catch { $cases.Add(@{name="pipe-$authorized";status='INCONCLUSIVE';reason=$_.Exception.GetBaseException().Message}) }
}
try { $cases.Add(@{name='restricted-token';status='OBSERVED';observation=[AgentNexusNativeProbe]::RestrictedTokenProbe()}) }
catch { $cases.Add(@{name='restricted-token';status='INCONCLUSIVE';reason=$_.Exception.GetBaseException().Message}) }
$result=@{schema='agentnexus/windows-primitive-probes/1';os=[Environment]::OSVersion.VersionString;runtime=$PSVersionTable.PSVersion.ToString();at=[DateTime]::UtcNow.ToString('o');cases=$cases;deployment='BLOCKED';system_configuration_modified=$false}
$json=[Text.Json.JsonSerializer]::Serialize($result,$result.GetType(),[Text.Json.JsonSerializerOptions]@{MaxDepth=64})
[Console]::Out.WriteLine($json)
