$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$base='I:\AI_AgentNexus\deliverables\AgentNexus-M1.8.3-Q4.2'
$test=Get-Content -LiteralPath (Join-Path $base 'evidence/signing-tests.json') -Raw | ConvertFrom-Json
$run=Join-Path 'I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.8.3-Q4.2' ('final-preview-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffffffZ'))
[void][IO.Directory]::CreateDirectory($run)
$fixture=Join-Path $run 'fixture'
[void][IO.Directory]::CreateDirectory($fixture)
Copy-Item -LiteralPath (Join-Path $test.run 'exported-plan') -Destination (Join-Path $run 'input') -Recurse
$fixture=Join-Path $run 'input'
[IO.File]::Copy((Join-Path $test.run 'SIMULATED-local-public.cer'),(Join-Path $fixture 'signer/SIMULATED-preview-public.cer'))
$text=[IO.File]::ReadAllText((Join-Path $base 'source/native/qualification-signer/user-create-certificate.ps1'))
if($text -notmatch "(?s)Add-Type -TypeDefinition @'\r?\n(.*?)\r?\n'@") {throw 'BOOTSTRAP_READER_REQUIRED'}
Add-Type -TypeDefinition $Matches[1]
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$signer=Join-Path $base 'signer/AgentNexus.Qualification.Signer.exe'
$sha=(Get-FileHash -LiteralPath $signer -Algorithm SHA256).Hash.ToLowerInvariant()
$assembly=[Q42PublicToolLoader]::Load($signer,$sha)
$type=$assembly.GetType('AgentNexus.CredentialBoundary.SignerWindow',$true)
$flags=[Reflection.BindingFlags]'Instance,NonPublic'
$window=$type.GetConstructor($flags,$null,[type[]]@([string]),$null).Invoke([object[]]@([string]$fixture))
function Save-Preview([string]$Path) {
    $window.Refresh();[Windows.Forms.Application]::DoEvents()
    $bitmap=[Drawing.Bitmap]::new($window.Width,$window.Height)
    try{$window.DrawToBitmap($bitmap,$window.ClientRectangle);$bitmap.Save($Path,[Drawing.Imaging.ImageFormat]::Png)}finally{$bitmap.Dispose()}
}
try {
    [void]$type.GetMethod('LoadReview',$flags).Invoke($window,[object[]]@($true))
    $window.Show();[Windows.Forms.Application]::DoEvents()
    $review=$type.GetField('review',$flags).GetValue($window)
    $sign=$type.GetField('sign',$flags).GetValue($window)
    $inspect=$type.GetField('inspect',$flags).GetValue($window)
    if($sign.Enabled -or $inspect.Enabled -or $review.Text -notlike '*SIMULATED / UNSIGNED PREVIEW*'){throw 'PREVIEW_NOT_KEYLESS'}
    $image=Join-Path $base 'evidence/signer-preview.png'
    if(Test-Path -LiteralPath $image){$history=Join-Path $base 'evidence/ui-history';[void][IO.Directory]::CreateDirectory($history);[IO.File]::Copy($image,(Join-Path $history ('initial-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffffffZ')+'.png')));[IO.File]::Delete($image)}
    Save-Preview $image
    $review.SelectionStart=$review.Text.IndexOf('NOT_CHECKED');$review.SelectionLength=0;$review.ScrollToCaret()
    Save-Preview (Join-Path $base 'evidence/signer-preview-certificate.png')
    [IO.File]::WriteAllText((Join-Path $base 'evidence/signer-preview-text.txt'),$review.Text,[Text.UTF8Encoding]::new($false))
    $stage=$type.GetField('stage',$flags).GetValue($window);$stage.SelectedIndex=1
    [void]$type.GetMethod('LoadReview',$flags).Invoke($window,[object[]]@($true))
    if($sign.Enabled -or $inspect.Enabled -or $review.Text -notlike '*DEPLOYMENT_APPROVAL*'){throw 'STAGE2_PREVIEW_CONTRACT_FAILED'}
    Save-Preview (Join-Path $base 'evidence/signer-preview-stage2.png')
    $result=[ordered]@{status='PASS_PREVIEW_ONLY';signer_sha256=$sha;run=$run;fixture='SIMULATED_COPY';stages=@('QUALIFICATION_PLAN','DEPLOYMENT_APPROVAL');certificate_store_accessed=$false;private_key_opened=$false;actual_user_confirmation='NOT_RUN';cng='NOT_RUN';system_changes=$false}
    [IO.File]::WriteAllText((Join-Path $base 'evidence/ui-preview.json'),($result | ConvertTo-Json -Depth 12),[Text.UTF8Encoding]::new($false))
    $result | ConvertTo-Json -Compress
}finally{$window.Close();$window.Dispose()}
