# Narrow read-only inventory. No account/ACL/profile/right/task/firewall changes.
$ErrorActionPreference='Stop'
$deploymentRoot='I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.5\deployment'
$accounts=@()
foreach($name in @('AgentNexusHostM14','AgentNexusWorkerM14')){
  try{$sid=([Security.Principal.NTAccount]::new($env:COMPUTERNAME,$name)).Translate([Security.Principal.SecurityIdentifier]).Value;$accounts+=@{name=$name;exists=$true;sid=$sid;status='EXISTS_STOP_NO_REUSE';standard_account_verified=$false}}
  catch [Security.Principal.IdentityNotMappedException]{$accounts+=@{name=$name;exists=$false;sid=$null;status='ABSENT';standard_account_verified=$false}}
  catch{$accounts+=@{name=$name;exists=$null;sid=$null;status='INCONCLUSIVE';error_type=$_.Exception.GetType().FullName;standard_account_verified=$false}}
}
$directories=@()
foreach($root in @($deploymentRoot,'I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.4\deployment')){
  foreach($suffix in @('','host','broker','code','runtime','launcher','configuration','workspaces\m15-synthetic\input','workspaces\m15-synthetic\task','workspaces\m15-synthetic\tmp','workspaces\m15-synthetic\output')){
    $path=if($suffix){Join-Path $root $suffix}else{$root}
    try{$item=Get-Item -LiteralPath $path -Force;$reparse=($item.Attributes-band[IO.FileAttributes]::ReparsePoint)-ne0;$acl=Get-Acl -LiteralPath $path;$directories+=@{path=$path;exists=$true;reparse=$reparse;owner=$acl.Owner;sddl=$acl.Sddl;status='EXISTS_STOP_NO_MUTATION'}}
    catch [System.Management.Automation.ItemNotFoundException]{$directories+=@{path=$path;exists=$false;sddl=$null;status='ABSENT'}}
    catch{$directories+=@{path=$path;exists=$null;sddl=$null;status='INCONCLUSIVE';error_type=$_.Exception.GetType().FullName}}
  }
}
$tasks=@()
try{$scheduler=New-Object -ComObject 'Schedule.Service';$scheduler.Connect();foreach($name in @('HostBroker','WorkerLauncher')){
    $path='\AgentNexus\M1.5\'+$name
    try{$task=$scheduler.GetFolder('\AgentNexus\M1.5').GetTask($name);$xml=[Text.Encoding]::UTF8.GetBytes($task.Xml);$sha=[Security.Cryptography.SHA256]::Create();try{$hash=[Convert]::ToHexString($sha.ComputeHash($xml)).ToLowerInvariant()}finally{$sha.Dispose()};$tasks+=@{path=$path;exists=$true;xml_sha256=$hash;status='EXISTS_STOP_NO_MUTATION'}}
    catch{$tasks+=@{path=$path;exists=$null;status='NOT_FOUND_OR_INACCESSIBLE';hresult=$_.Exception.HResult}}
  }}catch{$tasks+=@{path='\AgentNexus\M1.5';exists=$null;status='INCONCLUSIVE';error_type=$_.Exception.GetType().FullName}}
$identity=[Security.Principal.WindowsIdentity]::GetCurrent();$node=(Get-Command node).Source;$ps=(Get-Process -Id $PID).Path
@{schema='agentnexus/m1.5/preflight/1';observed_at=[DateTime]::UtcNow.ToString('o');read_only=$true;accounts=$accounts;directories=$directories;tasks=$tasks;
  current_token=@{user_sid=$identity.User.Value;groups=@($identity.Groups|ForEach-Object{$_.Value});independent_host_worker_verified=$false};
  execution_environment=@{os=[Environment]::OSVersion.VersionString;node_path=$node;node_sha256=(Get-FileHash -LiteralPath $node -Algorithm SHA256).Hash.ToLowerInvariant();powershell_path=$ps;powershell_sha256=(Get-FileHash -LiteralPath $ps -Algorithm SHA256).Hash.ToLowerInvariant()};
  appcontainer=@{name='AgentNexus.M14.Worker';worker_hive='NOT_RUN: exact Worker hive unavailable until separately authorized account bootstrap';profile_created=$false};
  operator='REQUIRED: an existing standard Operator SID distinct from Host/Worker; none selected/created by this inventory';
  logon_rights='NOT_RUN: no LSA export/mutation';system_changes=@();deployment_authorized=$false}|ConvertTo-Json -Depth 12
