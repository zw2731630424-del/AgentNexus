# Read-only, narrow deployment inventory. Never creates accounts, profiles or tasks.
$ErrorActionPreference='Stop'
$deploymentRoot='I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.4\deployment'
$accounts=@()
foreach($name in @('AgentNexusHostM14','AgentNexusWorkerM14')) {
  try {$sid=([Security.Principal.NTAccount]::new($env:COMPUTERNAME,$name)).Translate([Security.Principal.SecurityIdentifier]).Value;$accounts+=@{name=$name;exists=$true;sid=$sid;standard_account_verified=$false}}
  catch [Security.Principal.IdentityNotMappedException] {$accounts+=@{name=$name;exists=$false;sid=$null;standard_account_verified=$false}}
}
$directories=@()
foreach($suffix in @('','host','broker','code','runtime','worker','workspaces\m14-synthetic\task','workspaces\m14-synthetic\tmp','workspaces\m14-synthetic\output')) {
  $path=if($suffix){Join-Path $deploymentRoot $suffix}else{$deploymentRoot}
  if(Test-Path -LiteralPath $path){$item=Get-Item -LiteralPath $path -Force;if(($item.Attributes-band[IO.FileAttributes]::ReparsePoint)-ne0){throw 'Deployment inventory refuses reparse target'};$acl=Get-Acl -LiteralPath $path;$directories+=@{path=$path;exists=$true;sddl=$acl.Sddl}}
  else {$directories+=@{path=$path;exists=$false;sddl=$null}}
}
$node=(Get-Command node).Source;$ps=(Get-Process -Id $PID).Path
$result=@{schema='agentnexus/m1.4/preflight/1';observed_at=[DateTime]::UtcNow.ToString('o');read_only=$true;accounts=$accounts;directories=$directories;
  execution_environment=@{os=[Environment]::OSVersion.VersionString;node_path=$node;node_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $node).Hash.ToLowerInvariant();powershell_path=$ps;powershell_sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $ps).Hash.ToLowerInvariant()};
  appcontainer=@{name='AgentNexus.M14.Worker';worker_hive_existence='NOT_RUN: Worker account hive unavailable; no profile created'};
  logon_rights='NOT_RUN: no policy export or mutation; inspect exact new SID rights only after account approval';scheduled_tasks='NOT_RUN: no task creation; final entrypoints are an additional deployment gate';system_changes=@()}
$result|ConvertTo-Json -Depth 12
