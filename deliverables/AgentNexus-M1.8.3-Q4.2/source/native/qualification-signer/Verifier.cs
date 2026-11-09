using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Security.Cryptography.X509Certificates;

namespace AgentNexus.CredentialBoundary
{
    public static class ApprovedInstallerFileOps
    {
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool CreateDirectory(string path, ref Win32.SECURITY_ATTRIBUTES security);
        // Only called after signed approval and the installer's final manual prompt.
        // Security descriptor is supplied at creation, rather than applied to an open root later.
        public static void CreateNewProtectedRoot(string path)
        {
            Json.Require(path == Fixed.InstallRoot || path == Fixed.DataRoot, "FIXED_NEW_ROOT_ONLY");
            string sddl = "O:BAG:BAD:P(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;0x001200a9;;;" + SigningContract.ServiceSid() + ")";
            if (path == Fixed.InstallRoot) sddl += "(A;OICI;0x001200a9;;;BU)";
            DirectorySecurity acl = new DirectorySecurity(); acl.SetSecurityDescriptorSddlForm(sddl);
            byte[] descriptor = acl.GetSecurityDescriptorBinaryForm(); IntPtr memory = Marshal.AllocHGlobal(descriptor.Length);
            try
            {
                Marshal.Copy(descriptor, 0, memory, descriptor.Length);
                Win32.SECURITY_ATTRIBUTES attributes = new Win32.SECURITY_ATTRIBUTES { Length = Marshal.SizeOf(typeof(Win32.SECURITY_ATTRIBUTES)), Descriptor = memory, Inherit = false };
                Json.Require(CreateDirectory(path, ref attributes), "NEW_PROTECTED_ROOT_REQUIRED");
            }
            finally { Marshal.FreeHGlobal(memory); }
        }
    }
    // Deliberately no public signing API. This facade only verifies and copies held files.
    public sealed class VerifiedInstallation : IDisposable
    {
        private QualificationBundle bundle;
        public string PlanJson { get { return Json.Encode(bundle.Plan); } }
        public string ManifestJson { get { return Json.Encode(bundle.Manifest); } }
        public string ApprovalJson { get { return Json.Encode(bundle.DeploymentApproval); } }
        public string ApprovalSha256 { get { return Digests.Bytes(bundle.ApprovalBytes); } }
        public string ManifestSha256 { get { return Json.String(bundle.Plan, "installation_manifest_sha256"); } }
        private VerifiedInstallation(QualificationBundle value) { bundle = value; }
        public static VerifiedInstallation Open(string root, string independentPin)
        {
            QualificationBundle candidate = new QualificationBundle(root);
            try
            {
                string sid; using (WindowsIdentity identity = WindowsIdentity.GetCurrent()) sid = identity.User.Value;
                candidate.Verify(independentPin, Digests.MachineId(), sid, DateTime.UtcNow);
                Json.Require(Json.String(candidate.Plan, "target_host") == Environment.MachineName, "HOST_NAME_MISMATCH");
                return new VerifiedInstallation(candidate);
            }
            catch { candidate.Dispose(); throw; }
        }
        public void Copy(string relative, string destination) { bundle.CopyHeld(relative, destination); }
        public void RequireFreshInstall()
        {
            SigningContract.RequireFreshEpoch(Json.Integer(bundle.Plan, "policy_epoch"), File.Exists(Fixed.DataRoot + @"\installation-receipt.json"));
            Json.Require(!Directory.Exists(Fixed.InstallRoot) && !File.Exists(Fixed.InstallRoot) && !Directory.Exists(Fixed.DataRoot) && !File.Exists(Fixed.DataRoot), "EXISTING_TARGET_REFUSED");
        }
        public void RecheckTime()
        {
            DateTime now = DateTime.UtcNow; SigningContract.Time(bundle.Plan, now);
            string pin = Json.String(bundle.Plan, "signer_certificate_der_sha256"), subject = Json.String(bundle.Plan, "signer_id");
            SigningContract.Cms(bundle.PlanBytes, bundle.PlanSignature, pin, subject, SigningContract.Local, now);
            SigningContract.Cms(bundle.ApprovalBytes, bundle.ApprovalSignature, pin, subject, SigningContract.Local, now);
        }
        public void Dispose() { if (bundle != null) { bundle.Dispose(); bundle = null; } }
    }

    internal static class VerifierProgram
    {
        private static int Main(string[] args)
        {
            try
            {
                if (args.Length == 1 && args[0] == "--describe")
                {
                    Console.WriteLine(Json.Encode(new Dictionary<string, object> { { "signature_policy", SigningContract.Policy() }, { "system_changes", SigningContract.SystemChanges() }, { "service_sid", SigningContract.ServiceSid() } })); return 0;
                }
                if (args.Length == 3 && args[0] == "--public-certificate")
                {
                    string publicPath = LocalPaths.Require(args[1]); byte[] der;
                    using (QualificationBundle input = new QualificationBundle(Path.GetDirectoryName(publicPath))) der = input.Bytes(Path.GetFileName(publicPath), 131072);
                    using (X509Certificate2 cert = SigningContract.PublicCertificate(der))
                    {
                        Json.Require(der.SequenceEqual(cert.RawData), "EXACT_PUBLIC_DER_REQUIRED");
                        SigningContract.Certificate(cert, args[2], cert.Subject, SigningContract.Local, DateTime.UtcNow);
                        Console.WriteLine(Json.Encode(SigningContract.CertificateMetadata(cert)));
                    }
                    return 0;
                }
                if (args.Length == 1 && args[0] == "--identity")
                {
                    string sid; using (WindowsIdentity identity = WindowsIdentity.GetCurrent()) sid = identity.User.Value;
                    Console.WriteLine(Json.Encode(new Dictionary<string, object> { { "host", Environment.MachineName }, { "machine_id", Digests.MachineId() }, { "operator_sid", sid }, { "service_sid", SigningContract.ServiceSid() }, { "policy_epoch", SigningContract.LocalEpoch }, { "system_changes", false } })); return 0;
                }
                Json.Require(args.Length == 2 || args.Length == 3, "USAGE_INSPECT_OR_VERIFY");
                if (args[0] == "--verify" && args.Length == 3)
                {
                    using (VerifiedInstallation result = VerifiedInstallation.Open(args[1], args[2]))
                        Console.WriteLine(Json.Encode(new Dictionary<string, object> { { "status", "SIGNED_LOCAL_VERIFIED_ONLY" }, { "installation_manifest_sha256", result.ManifestSha256 }, { "system_changes", false }, { "deployment_executed", false }, { "production_qualified", false } }));
                }
                else if (args[0] == "--inspect" && args.Length == 2)
                {
                    using (QualificationBundle result = new QualificationBundle(args[1]))
                    {
                        string sid; using (WindowsIdentity identity = WindowsIdentity.GetCurrent()) sid = identity.User.Value;
                        result.Candidate(Digests.MachineId(), sid, DateTime.UtcNow, false);
                        Console.WriteLine(Json.Encode(new Dictionary<string, object> { { "status", "UNSIGNED_CANDIDATE_INSPECTED_NO_GO" }, { "files", result.FileCount }, { "bytes", result.TotalBytes }, { "system_changes", false }, { "approved", false }, { "actual_signature_check", "NOT_REQUESTED" } }));
                    }
                }
                else throw new PolicyException("USAGE_INSPECT_OR_VERIFY");
                return 0;
            }
            catch (Exception e) { Console.Error.WriteLine(e is PolicyException ? e.Message : e.GetType().Name); return 21; }
        }
    }
}
