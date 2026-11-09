param([Parameter(Mandatory=$true)][string]$BundleRoot,[Parameter(Mandatory=$true)][string]$LogRoot)
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$script=Join-Path $BundleRoot 'source\native\qualification-signer\user-create-certificate.ps1'
$text=[IO.File]::ReadAllText($script)
$errors=@();$ast=[Management.Automation.Language.Parser]::ParseFile($script,[ref]$null,[ref]$errors)
if($errors.Count){throw 'CREATION_SCRIPT_PARSE_FAILED'}
$selection=@($text -split "`r?`n"|Where-Object{$_ -like '$provider=if*'})
if($selection.Count -ne 1){throw 'PROVIDER_EXPRESSION_REQUIRED'}
# Only the original parameter binder and this one provider expression are invoked.
$select=[ScriptBlock]::Create($ast.ParamBlock.Extent.Text+"`n"+$selection[0]+"`n"+'$provider')
$cases=@()
foreach($method in @('TPM_CNG','tpm_cng','TpM_CnG','SOFTWARE_CNG','software_cng')){
    $actual=&$select -Method $method -NewPublicOutputDirectory 'C:\UNUSED-PUBLIC-PARSER-PROBE'
    $expected=if($method -like 'TPM*'){'Microsoft Platform Crypto Provider'}else{'Microsoft Software Key Storage Provider'}
    if($actual -cne $expected){throw 'METHOD_PROVIDER_DOWNGRADE'}
    $cases+=([ordered]@{method=$method;provider=$actual;status='PASS'})
}
if($text -notmatch "(?s)Add-Type -TypeDefinition @'\r?\n(.*?)\r?\n'@") {throw 'PUBLIC_BOOTSTRAP_NOT_FOUND'}
Add-Type -TypeDefinition $Matches[1]
$expectedHash=([regex]::Match($text,"\`$ExpectedSignerSha256 = '([a-f0-9]{64})'")).Groups[1].Value
if($expectedHash.Length -ne 64){throw 'FIXED_SIGNER_HASH_REQUIRED'}
$path=Join-Path $BundleRoot 'signer\AgentNexus.Qualification.Signer.exe'
$loaded=[Q42PublicToolLoader]::Load($path,$expectedHash)
if($null -eq $loaded.GetType('AgentNexus.CredentialBoundary.AtomicOutput')){throw 'PUBLIC_BOOTSTRAP_LOAD_FAILED'}
$wrongHash=$false;$unc=$false
try{[void][Q42PublicToolLoader]::Load($path,('0'*64))}catch{$wrongHash=$_.Exception.ToString().Contains('REVIEWED_TOOL_HASH_REQUIRED')}
try{[void][Q42PublicToolLoader]::Load('\\invalid.example\share\x',$expectedHash)}catch{$unc=$_.Exception.ToString().Contains('LOCAL_TOOL_PATH_REQUIRED')}
if(-not $wrongHash -or -not $unc){throw 'BOOTSTRAP_NEGATIVE_NOT_DENIED'}
$result=[ordered]@{status='PASS';provider_selection=$cases;exact_fixed_hash_loaded=$expectedHash;wrong_hash_denied=$wrongHash;unc_rejected_before_io=$unc;certificate_script_executed=$false;user_key_access=$false;certificate_store_access=$false}
[IO.File]::WriteAllText((Join-Path $LogRoot 'public-script-boundaries.json'),($result|ConvertTo-Json -Depth 12),[Text.UTF8Encoding]::new($false))
$result|ConvertTo-Json -Depth 12
