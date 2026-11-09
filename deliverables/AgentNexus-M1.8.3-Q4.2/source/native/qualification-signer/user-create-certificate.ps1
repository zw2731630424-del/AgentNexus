[CmdletBinding()]
param([Parameter(Mandatory=$true)][ValidateSet('SOFTWARE_CNG','TPM_CNG')][string]$Method,
      [Parameter(Mandatory=$true)][string]$NewPublicOutputDirectory)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
# USER-RUN ONLY. This script is never run by Codex. No signing or trust import.
# Creation and subsequent metadata access have their own explicit consent below.
$ExpectedSignerSha256 = '6668d6a16739a31fea0d3c474bfc6f17a2bd8e0eb7760b7a8f2cb9728a23ce9b'
if($PSVersionTable.PSEdition -ne 'Desktop' -or $PSVersionTable.PSVersion.Major -ne 5){throw 'USER_OWNED_WINDOWS_POWERSHELL_5_SESSION_REQUIRED'}
if ($NewPublicOutputDirectory -cnotmatch '^[A-Za-z]:[\\/]' -or $NewPublicOutputDirectory.Substring(2).Contains(':')) { throw 'LOCAL_ABSOLUTE_OUTPUT_REQUIRED' }
$drive=[IO.DriveInfo]::new([IO.Path]::GetPathRoot($NewPublicOutputDirectory))
if ($drive.DriveType -notin @([IO.DriveType]::Fixed,[IO.DriveType]::Removable)) { throw 'LOCAL_DRIVE_REQUIRED' }
if (-not [Environment]::UserInteractive) { throw 'INTERACTIVE_USER_SESSION_REQUIRED' }
$provider=if($Method -eq 'TPM_CNG'){'Microsoft Platform Crypto Provider'}else{'Microsoft Software Key Storage Provider'}
$subject='CN=AgentNexus Local Qualification User Signer'
$eku='1.3.6.1.5.5.7.3.36'
Write-Host ('LOCAL_QUALIFICATION only. This creates a private CNG key and certificate in THIS user CurrentUser\My. Provider: '+$provider)
Write-Host ('Subject: '+$subject+'; RSA 3072; SHA256; DigitalSignature; non-CA; sole EKU '+$eku+'; validity 90 days.')
Write-Host 'NonExportable + ProtectHigh requested; actual Export/UI policy will be inspected through a private-key-associated handle after creation.'
Write-Host 'This may prompt. It does not sign, add Root/TrustedPublisher trust, grant production rights or export a private key.'
Write-Host 'Same SID in another desktop/session is insufficient isolation. Keep the agent outside this device/security principal.'
Write-Host 'If creation or policy inspection fails, preserve any created certificate/key and partial public output for user review; do not automatically delete or retry.'
if((Read-Host 'Type CREATE LOCAL QUALIFICATION CERTIFICATE to authorize creation AND CNG metadata access') -cne 'CREATE LOCAL QUALIFICATION CERTIFICATE'){throw 'USER_CERTIFICATE_CREATION_NOT_APPROVED'}
$signer=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\signer\AgentNexus.Qualification.Signer.exe'))
# Bootstrap only: snapshot an exact local public executable before executing it.
# No store/key/signature APIs. Hash and Assembly.Load consume the SAME byte[].
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Reflection;
using System.Security.Cryptography;
using Microsoft.Win32.SafeHandles;
public static class Q42PublicToolLoader {
    [StructLayout(LayoutKind.Sequential)] private struct Info {
        public uint Attributes; public System.Runtime.InteropServices.ComTypes.FILETIME Created, Accessed, Written;
        public uint Volume, High, Low, Links, IndexHigh, IndexLow;
    }
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true, EntryPoint="CreateFileW")]
    private static extern SafeFileHandle Open(string path,uint access,uint share,IntPtr security,uint disposition,uint flags,IntPtr template);
    [DllImport("kernel32.dll",SetLastError=true)] private static extern bool GetFileInformationByHandle(SafeFileHandle handle,out Info info);
    private static SafeFileHandle Checked(string path,bool directory) {
        SafeFileHandle handle=Open(path,directory?0x81U:0x80000000U,1,IntPtr.Zero,3,directory?0x02200000U:0x00200000U,IntPtr.Zero);
        Info info;
        if(handle.IsInvalid || !GetFileInformationByHandle(handle,out info) || (info.Attributes&0x400)!=0 || (((info.Attributes&0x10)!=0)!=directory)) {
            handle.Dispose(); throw new IOException("LOCAL_NONREPARSE_TOOL_SNAPSHOT_REQUIRED");
        }
        return handle;
    }
    public static Assembly Load(string path,string expected) {
        if(path.Length<3 || !Char.IsLetter(path[0]) || path[1]!=':' || path[2]!='\\' || path.IndexOf(':',2)>=0) throw new IOException("LOCAL_TOOL_PATH_REQUIRED");
        DriveType drive=new DriveInfo(path.Substring(0,3)).DriveType;
        if(drive!=DriveType.Fixed && drive!=DriveType.Removable) throw new IOException("LOCAL_TOOL_DRIVE_REQUIRED");
        Stack<string> parents=new Stack<string>(); List<SafeFileHandle> locks=new List<SafeFileHandle>();
        for(string p=Path.GetDirectoryName(path); !String.IsNullOrEmpty(p); p=Path.GetDirectoryName(p)) parents.Push(p);
        try {
            foreach(string parent in parents) locks.Add(Checked(parent,true));
            using(SafeFileHandle handle=Checked(path,false)) using(FileStream stream=new FileStream(handle,FileAccess.Read)) {
                if(stream.Length<=0 || stream.Length>2097152) throw new IOException("TOOL_SIZE_REQUIRED");
                byte[] bytes=new byte[(int)stream.Length]; int done=0;
                while(done<bytes.Length) {int read=stream.Read(bytes,done,bytes.Length-done); if(read<=0) throw new IOException("TOOL_TRUNCATED"); done+=read;}
                using(SHA256 hash=SHA256.Create()) if(BitConverter.ToString(hash.ComputeHash(bytes)).Replace("-","").ToLowerInvariant()!=expected) throw new IOException("REVIEWED_TOOL_HASH_REQUIRED");
                return Assembly.Load(bytes);
            }
        } finally {foreach(SafeFileHandle handle in locks) handle.Dispose();}
    }
}
'@
$assembly=[Q42PublicToolLoader]::Load($signer,$ExpectedSignerSha256)
$type=$assembly.GetType('AgentNexus.CredentialBoundary.AtomicOutput',$true)
$flags=[Reflection.BindingFlags]'Instance,NonPublic'
# Reuse the audited local directory/file transaction; no second signing implementation.
$constructor=$type.GetConstructor($flags,$null,[type[]]@([string]),$null)
if($null -eq $constructor){throw 'REVIEWED_PUBLIC_OUTPUT_CONSTRUCTOR_REQUIRED'}
$output=$constructor.Invoke([object[]]@([string]$NewPublicOutputDirectory))
try {
    $params=@{Type='Custom';Subject=$subject;Provider=$provider;KeyAlgorithm='RSA';KeyLength=3072;HashAlgorithm='SHA256';KeyUsage='DigitalSignature';KeyExportPolicy='NonExportable';KeyProtection='ProtectHigh';CertStoreLocation='Cert:\CurrentUser\My';NotAfter=[DateTime]::Now.AddDays(90);TextExtension=@(('2.5.29.37={text}'+$eku),'2.5.29.19={critical}{text}ca=false')}
    $certificate=New-SelfSignedCertificate @params
    $actual=$null
    $rsa=[Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($certificate)
    try {
        if($rsa -isnot [Security.Cryptography.RSACng]){throw 'USER_CNG_KEY_REQUIRED'}
        $key=$rsa.Key
        $actual=[ordered]@{provider=$key.Provider.Provider;container=$key.KeyName;unique_container=$key.UniqueName;export_policy=$key.ExportPolicy.ToString();ui_protection=$key.UIPolicy.ProtectionLevel.ToString();machine_key=$key.IsMachineKey;key_usage=$key.KeyUsage.ToString()}
        if($key.IsMachineKey -or $key.Provider.Provider -cne $provider -or $key.ExportPolicy -ne [Security.Cryptography.CngExportPolicies]::None -or -not ($key.UIPolicy.ProtectionLevel -band [Security.Cryptography.CngUIProtectionLevels]::ForceHighProtection)){throw 'CREATED_KEY_POLICY_NOT_QUALIFIED_PRESERVE_FOR_USER_REVIEW'}
    } finally {if($null -ne $rsa){$rsa.Dispose()}}
    $der=$certificate.RawData
    $hasher=[Security.Cryptography.SHA256]::Create()
    try{$pin=[BitConverter]::ToString($hasher.ComputeHash($der)).Replace('-','').ToLowerInvariant()}finally{$hasher.Dispose()}
    $public=[ordered]@{status='PUBLIC_CERTIFICATE_ONLY_NOT_TRUSTED';subject=$certificate.Subject;issuer=$certificate.Issuer;serial_number=$certificate.SerialNumber;certificate_der_sha256=$pin;not_before_utc=$certificate.NotBefore.ToUniversalTime().ToString('o');not_after_utc=$certificate.NotAfter.ToUniversalTime().ToString('o');cng=$actual;actual_per_signature_prompt='NOT_RUN';same_sid_resistance='INCONCLUSIVE';tpm_key_attestation='NOT_RUN';private_key_exported=$false;actual_signature_created=$false;root_or_publisher_imported=$false;isolation='USER_MUST_INDEPENDENTLY_VERIFY'}
    $write=$type.GetMethod('Write',$flags)
    [void]$write.Invoke($output,[object[]]@('local-qualification-public.cer',[byte[]]$der))
    [void]$write.Invoke($output,[object[]]@('public-metadata.json',[Text.UTF8Encoding]::new($false).GetBytes(($public | ConvertTo-Json -Depth 12))))
    [void]$type.GetMethod('Check',$flags).Invoke($output,@())
    Write-Host ('PUBLIC DER SHA256 (not Windows SHA1 Thumbprint): '+$pin)
    Write-Host 'Independently compare every digit. Certificate creation is not pin trust, signature authorization or installation approval.'
} finally {if($null -ne $output){$output.Dispose()}}
