[CmdletBinding()]
param([Parameter(Mandatory=$true)][ValidateSet('SOFTWARE_CNG','TPM_CNG')][string]$Method,
      [Parameter(Mandatory=$true)][string]$NewPublicOutputDirectory)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# USER-RUN ONLY in a signing session/device inaccessible to Codex.
# No Root/TrustedPublisher import, no auto-pin, no private-key export.
if (-not [Environment]::UserInteractive) { throw 'INTERACTIVE_USER_SESSION_REQUIRED' }
if (-not [IO.Path]::IsPathRooted($NewPublicOutputDirectory) -or (Test-Path -LiteralPath $NewPublicOutputDirectory)) { throw 'NEW_ABSOLUTE_PUBLIC_OUTPUT_DIRECTORY_REQUIRED' }
$provider = if ($Method -ceq 'TPM_CNG') { 'Microsoft Platform Crypto Provider' } else { 'Microsoft Software Key Storage Provider' }
$subject = 'CN=AgentNexus Local Qualification User Signer'
$eku = '1.3.6.1.5.5.7.3.36'
Write-Host ('Create a user-owned LOCAL_QUALIFICATION certificate in CurrentUser\My on THIS signing device. Provider: ' + $provider)
Write-Host ('Subject: ' + $subject + '; RSA 3072; SHA256; DigitalSignature; non-CA; purpose ' + $eku)
Write-Host 'Private key: NonExportable; ProtectHigh requested. No silent fallback if unsupported. Certificate validity: 90 days.'
Write-Host 'TPM and NonExportable do not prove same-SID signing resistance or trusted on-screen confirmation. Review independently; keep Codex out of this signing session.'
Write-Host 'This changes the user My certificate store, creates a private CNG key, and writes only public DER/metadata to the new output folder. It does NOT trust this certificate.'
if ((Read-Host 'Type CREATE LOCAL QUALIFICATION CERTIFICATE to authorize these exact operations') -cne 'CREATE LOCAL QUALIFICATION CERTIFICATE') { throw 'USER_CERTIFICATE_CREATION_NOT_APPROVED' }
$params = @{
    Type='Custom'; Subject=$subject; Provider=$provider; KeyAlgorithm='RSA'; KeyLength=3072; HashAlgorithm='SHA256';
    KeyUsage='DigitalSignature'; KeyExportPolicy='NonExportable'; KeyProtection='ProtectHigh';
    CertStoreLocation='Cert:\CurrentUser\My'; NotAfter=[DateTime]::Now.AddDays(90);
    TextExtension=@(('2.5.29.37={text}' + $eku),'2.5.29.19={critical}{text}ca=false')
}
$certificate = New-SelfSignedCertificate @params
[void](New-Item -ItemType Directory -Path $NewPublicOutputDirectory)
$der = $certificate.Export([Security.Cryptography.X509Certificates.X509ContentType]::Cert)
$sha = [Security.Cryptography.SHA256]::Create()
try { $pin = [BitConverter]::ToString($sha.ComputeHash($der)).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
[IO.File]::WriteAllBytes((Join-Path $NewPublicOutputDirectory 'local-qualification-public.cer'),$der)
$public = [ordered]@{ status='PUBLIC_CERTIFICATE_ONLY_NOT_TRUSTED'; subject=$certificate.Subject; certificate_der_sha256=$pin; provider=$provider; nonexportable_requested=$true; high_protection_requested=$true; actual_trusted_user_presence='NOT_RUN'; tpm_key_attestation='NOT_RUN'; windows_root_imported=$false; codex_has_private_key=$false }
[IO.File]::WriteAllText((Join-Path $NewPublicOutputDirectory 'public-metadata.json'),($public | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
Write-Host ('DER SHA256 (not Windows SHA1 Thumbprint): ' + $pin)
Write-Host 'Independently compare this full fingerprint on the signing device and deployment device. Do not send any PFX/private key/password to an agent. No trust anchor was added.'
