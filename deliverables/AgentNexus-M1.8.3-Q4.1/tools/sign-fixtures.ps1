[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$RunDirectory)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
# SIMULATED TEST CERTIFICATES ONLY. No Store, PFX, export of private keys or installation.
$utf8=[Text.UTF8Encoding]::new($false)
function Read-Json([string]$Path) { return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -AsHashtable -DateKind String }
function Save-Json([string]$Path,$Value) { [IO.File]::WriteAllText($Path,($Value | ConvertTo-Json -Depth 48 -Compress),$utf8) }
function Hash-File([string]$Path) { return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Hash-Bytes([byte[]]$Value) { return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Value)).ToLowerInvariant() }
$eku='1.3.6.1.5.5.7.3.36'
$resources=[Collections.Generic.List[IDisposable]]::new()
$certs=@{}
foreach($kind in @('local','other','expired','code','weak','short')) {
    $bits=if($kind -ceq 'weak'){2048}else{3072}; $purpose=if($kind -ceq 'code'){'1.3.6.1.5.5.7.3.3'}else{$eku}
    $rsa=[Security.Cryptography.RSA]::Create($bits); $resources.Add($rsa)
    $request=[Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=SIMULATED AgentNexus Q41 Test Only',$rsa,[Security.Cryptography.HashAlgorithmName]::SHA256,[Security.Cryptography.RSASignaturePadding]::Pkcs1)
    $oids=[Security.Cryptography.OidCollection]::new(); [void]$oids.Add([Security.Cryptography.Oid]::new($purpose))
    $request.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]::new($oids,$true))
    $request.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new([Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature,$true))
    $request.CertificateExtensions.Add([Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($false,$false,0,$true))
    $until=if($kind -ceq 'expired'){[DateTimeOffset]::UtcNow.AddDays(-1)}elseif($kind -ceq 'short'){[DateTimeOffset]::UtcNow.AddHours(1)}else{[DateTimeOffset]::UtcNow.AddDays(30)}
    $cert=$request.CreateSelfSigned([DateTimeOffset]::UtcNow.AddDays(-10),$until); $resources.Add($cert); $certs[$kind]=$cert
    [IO.File]::WriteAllBytes((Join-Path $RunDirectory ('SIMULATED-'+$kind+'-public.cer')),$cert.RawData)
}
function Sign([byte[]]$Content,$Cert,[bool]$Detached=$true,[string]$Digest='2.16.840.1.101.3.4.2.1') {
    $cms=[Security.Cryptography.Pkcs.SignedCms]::new([Security.Cryptography.Pkcs.ContentInfo]::new($Content),$Detached)
    $signer=[Security.Cryptography.Pkcs.CmsSigner]::new($Cert); $signer.DigestAlgorithm=[Security.Cryptography.Oid]::new($Digest); $signer.IncludeOption=[Security.Cryptography.X509Certificates.X509IncludeOption]::EndCertOnly
    $cms.ComputeSignature($signer); return ,$cms.Encode()
}
function Complete([string]$Root,[string]$Name,[string]$Pin) {
    Save-Json (Join-Path $Root ('approval/'+$Name+'.signing-result.json')) @{status='SIGNED_CMS_ONLY';content_sha256=(Hash-File (Join-Path $Root ('approval/'+$Name+'.json')));signature_sha256=(Hash-File (Join-Path $Root ('approval/'+$Name+'.p7s')));certificate_der_sha256=$Pin;authenticode='NOT_GRANTED';deployment_executed=$false}
}
try {
    $spec=Read-Json (Join-Path $RunDirectory 'fixture-spec.json')
    foreach($row in $spec.fixtures) {
        $root=$row.root; $cert=$certs[$row.certificate]; $pin=Hash-Bytes $cert.RawData
        $config=Read-Json (Join-Path $root 'approval/candidate/service-config.json'); $config.authority_certificate_sha256=$pin; $config.signer_id=$cert.Subject; Save-Json (Join-Path $root 'approval/candidate/service-config.json') $config
        $p=Read-Json (Join-Path $root 'approval/qualification-plan.json'); $p.signer_certificate_der_sha256=$pin; $p.signer_id=$cert.Subject; $p.service_config_sha256=Hash-File (Join-Path $root 'approval/candidate/service-config.json')
        Save-Json (Join-Path $root 'approval/qualification-plan.json') $p
        [IO.File]::WriteAllBytes((Join-Path $root 'approval/qualification-plan.p7s'),(Sign ([IO.File]::ReadAllBytes((Join-Path $root 'approval/qualification-plan.json'))) $cert)); Complete $root 'qualification-plan' $pin
        $a=Read-Json (Join-Path $root 'approval/deployment-approval.json')
        foreach($k in @($a.Keys)) { if($p.Contains($k) -and $k -notin @('schema','scope','confirmation_kind','user_confirmed')) { $a[$k]=$p[$k] } }
        $a.qualification_sha256=Hash-File (Join-Path $root 'approval/qualification-plan.json'); $a.qualification_signature_sha256=Hash-File (Join-Path $root 'approval/qualification-plan.p7s')
        foreach($k in $row.approval_overrides.Keys) { $a[$k]=$row.approval_overrides[$k] }
        if($row.same_ref) { $a.approval_ref=$p.qualification_test_approval_ref }
        Save-Json (Join-Path $root 'approval/deployment-approval.json') $a
        [IO.File]::WriteAllBytes((Join-Path $root 'approval/deployment-approval.p7s'),(Sign ([IO.File]::ReadAllBytes((Join-Path $root 'approval/deployment-approval.json'))) $cert)); Complete $root 'deployment-approval' $pin
    }
    $content=[IO.File]::ReadAllBytes((Join-Path $spec.fixtures[0].root 'approval/qualification-plan.json'))
    foreach($kind in @('other','expired','code','weak')) { [IO.File]::WriteAllBytes((Join-Path $RunDirectory ($kind+'.p7s')),(Sign $content $certs[$kind])) }
    [IO.File]::WriteAllBytes((Join-Path $RunDirectory 'attached-same.p7s'),(Sign $content $certs.local $false))
    [IO.File]::WriteAllBytes((Join-Path $RunDirectory 'attached-other.p7s'),(Sign ($utf8.GetBytes('different embedded content')) $certs.local $false))
    [IO.File]::WriteAllBytes((Join-Path $RunDirectory 'sha1.p7s'),(Sign $content $certs.local $true '1.3.14.3.2.26'))
    $multi=[Security.Cryptography.Pkcs.SignedCms]::new([Security.Cryptography.Pkcs.ContentInfo]::new($content),$true)
    foreach($kind in @('local','other')) { $s=[Security.Cryptography.Pkcs.CmsSigner]::new($certs[$kind]); $s.DigestAlgorithm=[Security.Cryptography.Oid]::new('2.16.840.1.101.3.4.2.1'); $multi.ComputeSignature($s) }
    [IO.File]::WriteAllBytes((Join-Path $RunDirectory 'multiple-signers.p7s'),$multi.Encode())
    $public=@{}; foreach($kind in $certs.Keys) { $public[$kind]=@{pin=(Hash-Bytes $certs[$kind].RawData);subject=$certs[$kind].Subject} }
    Save-Json (Join-Path $RunDirectory 'SIMULATED-public-metadata.json') $public
    Write-Output 'SIMULATED_CMS_CREATED_IN_MEMORY_NO_STORE_OR_PRIVATE_EXPORT'
} finally { foreach($item in $resources) { $item.Dispose() } }
