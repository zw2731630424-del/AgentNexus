[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$base=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$workspace=[IO.Path]::GetFullPath((Join-Path $base '..\..'))
$run=Join-Path $workspace ('.workflow-kit\runtime\AgentNexus-M1.8.3-Q4.2\readonly-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffffffZ'))
[void][IO.Directory]::CreateDirectory($run)
$utf8=[Text.UTF8Encoding]::new($false)
$script=Join-Path $base 'source\native\qualification-signer\user-create-certificate.ps1'
$text=[IO.File]::ReadAllText($script)
$errors=@();[void][Management.Automation.Language.Parser]::ParseFile($script,[ref]$null,[ref]$errors)
if($errors.Count){throw 'CREATION_SCRIPT_PARSE_FAILED'}
$selection=($text -split "`r?`n" | Where-Object {$_ -like '$provider=if*'})
if(@($selection).Count -ne 1){throw 'PROVIDER_SELECTION_EXPRESSION_REQUIRED'}
$select=[ScriptBlock]::Create('param([string]$Method)' + "`n" + $selection + "`n" + '$provider')
foreach($method in @('TPM_CNG','tpm_cng')){if((& $select $method) -cne 'Microsoft Platform Crypto Provider'){throw 'TPM_SELECTION_DOWNGRADED'}}
foreach($method in @('SOFTWARE_CNG','software_cng')){if((& $select $method) -cne 'Microsoft Software Key Storage Provider'){throw 'SOFTWARE_SELECTION_CHANGED'}}
if($text -notmatch "(?s)Add-Type -TypeDefinition @'\r?\n(.*?)\r?\n'@") {throw 'PUBLIC_BOOTSTRAP_READER_NOT_FOUND'}
# Compile and execute ONLY the public binary snapshot loader. Never invoke creation script/body.
$code=$Matches[1]; [IO.File]::WriteAllText((Join-Path $run 'public-loader.cs'),$code,$utf8)
Add-Type -TypeDefinition $code
$signer=Join-Path $base 'signer\AgentNexus.Qualification.Signer.exe'
$pin=(Get-FileHash -LiteralPath $signer -Algorithm SHA256).Hash.ToLowerInvariant()
$loaded=[Q42PublicToolLoader]::Load($signer,$pin)
if($null -eq $loaded.GetType('AgentNexus.CredentialBoundary.AtomicOutput')){throw 'PUBLIC_SNAPSHOT_LOAD_FAILED'}
$wrongHashDenied=$false;try{[void][Q42PublicToolLoader]::Load($signer,('0'*64))}catch{if($_.Exception.InnerException.Message -like '*REVIEWED_TOOL_HASH_REQUIRED*'){$wrongHashDenied=$true}else{throw}}
$uncDenied=$false;try{[void][Q42PublicToolLoader]::Load('\\invalid.example\share\signer.exe',$pin)}catch{if($_.Exception.InnerException.Message -like '*LOCAL_TOOL_PATH_REQUIRED*'){$uncDenied=$true}else{throw}}
if(-not $wrongHashDenied -or -not $uncDenied){throw 'PUBLIC_LOADER_NEGATIVE_CASE_NOT_DENIED'}
$facade=$loaded.GetType('AgentNexus.CredentialBoundary.AtomicOutput',$true)
$flags=[Reflection.BindingFlags]'Instance,NonPublic'
$constructor=$facade.GetConstructor($flags,$null,[type[]]@([string]),$null)
$out=$constructor.Invoke([object[]]@([string](Join-Path $run 'public-output')))
try {
    [void]$facade.GetMethod('Write',$flags).Invoke($out,[object[]]@('public-only.json',$utf8.GetBytes('{"synthetic":true}')))
    [void]$facade.GetMethod('Check',$flags).Invoke($out,@())
} finally {$out.Dispose()}
$verifier=Join-Path $base 'signer\AgentNexus.Qualification.Verifier.exe'
$identity=@(& $verifier --identity);$identityExit=$LASTEXITCODE
[IO.File]::WriteAllText((Join-Path $run 'identity.stdout.json'),($identity -join ''),$utf8)
$start=[Diagnostics.ProcessStartInfo]::new($signer,'--approve --automatic');$start.UseShellExecute=$false;$start.CreateNoWindow=$true
$process=[Diagnostics.Process]::Start($start)
try{if(-not $process.WaitForExit(10000)){throw 'INVALID_ARGUMENT_REJECTION_TIMEOUT'};$automaticExit=$process.ExitCode}finally{$process.Dispose()}
$argumentsRejected=($automaticExit -eq 21)
if($identityExit -ne 0 -or -not $argumentsRejected){throw 'READ_ONLY_ENTRY_CONTRACT_FAILED'}
$result=[ordered]@{status='PASS';run=$run;creation_script_parsed_only=$true;public_loader_snapshot_load=$true;wrong_tool_hash_denied=$wrongHashDenied;unc_rejected_before_io=$uncDenied;atomic_public_output_reflection_verified=$true;automatic_signing_args_rejected=$argumentsRejected;identity_exit=$identityExit;certificate_creation_script_executed=$false;certificate_store_accessed=$false;private_key_opened=$false;actual_signature='NOT_RUN';system_changes=$false}
[IO.File]::WriteAllText((Join-Path $run 'result.json'),($result | ConvertTo-Json -Depth 12),$utf8)
[IO.File]::WriteAllText((Join-Path $base 'evidence\read-only-checks.json'),($result | ConvertTo-Json -Depth 12),$utf8)
$destination=Join-Path $base ('evidence\readonly\'+[IO.Path]::GetFileName($run));[void][IO.Directory]::CreateDirectory($destination)
foreach($file in Get-ChildItem -LiteralPath $run -File){[IO.File]::Copy($file.FullName,(Join-Path $destination $file.Name))}
$result | ConvertTo-Json -Compress
