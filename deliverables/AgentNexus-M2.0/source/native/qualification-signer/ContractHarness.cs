// Diagnostic-only test entry. Never included in deployment/signing executables.
// Input contains synthetic documents, PUBLIC certificates and CMS, never private keys.
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Principal;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

namespace AgentNexus.CredentialBoundary
{
    internal static class ContractHarness
    {
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "CreateFileW")]
        private static extern SafeFileHandle OpenWriteProbe(string path, uint access, uint share, IntPtr security, uint disposition, uint flags, IntPtr template);
        private static byte[] FileArg(Dictionary<string, object> input, string key) { return File.ReadAllBytes(Json.String(input, key)); }
        private static int Main(string[] args)
        {
            try
            {
                Dictionary<string, object> input = SigningContract.Read(File.ReadAllBytes(args[0]));
                string action = Json.String(input, "action");
                string sid; using (WindowsIdentity identity = WindowsIdentity.GetCurrent()) sid = identity.User.Value;
                if (action == "identity") Console.WriteLine(Json.Encode(new Dictionary<string, object> { { "machine_id", Digests.MachineId() }, { "operator_sid", sid }, { "service_sid", SigningContract.ServiceSid() }, { "host", Environment.MachineName } }));
                else if (action == "cms") SigningContract.Cms(FileArg(input, "content"), FileArg(input, "signature"), Json.String(input, "pin"), Json.String(input, "subject"), Json.String(input, "mode"), DateTime.UtcNow);
                else if (action == "certificate")
                {
                    using (X509Certificate2 cert = new X509Certificate2(FileArg(input, "certificate")))
                        SigningContract.Certificate(cert, Digests.Bytes(cert.RawData), cert.Subject, SigningContract.Local, DateTime.UtcNow);
                }
                else if (action == "public-der") { using (X509Certificate2 cert = SigningContract.PublicCertificate(FileArg(input, "certificate"))) { } }
                else if (action == "public-key-mismatch")
                {
                    using (X509Certificate2 cert = new X509Certificate2(FileArg(input, "certificate")))
                    using (X509Certificate2 other = new X509Certificate2(FileArg(input, "other")))
                    using (RSA key = other.GetRSAPublicKey()) UserCng.MatchPublicKey(key, cert);
                }
                else if (action == "missing-private-key")
                {
                    using (X509Certificate2 cert = new X509Certificate2(FileArg(input, "certificate"))) Json.Require(cert.HasPrivateKey, "USER_STORE_SIGNING_CERTIFICATE_REQUIRED");
                }
                else if (action == "local-path") LocalPaths.Require(Json.String(input, "path"));
                else if (action == "cms-signature-oid") Json.Require(DetachedDer.SignatureAlgorithm(FileArg(input, "signature")) == Json.String(input, "expected_oid"), "SIGNATURE_OID_PARSER_FAILURE");
                else if (action == "authorization-gate")
                {
                    int opens = 0, signatures = 0;
                    bool yes = SigningContract.Bool(input, "confirm");
                    bool ran = UserConsent.Run(delegate { return yes; }, delegate { opens++; if (SigningContract.Bool(input, "key_unavailable")) throw new PolicyException("SIMULATED_PRIVATE_KEY_UNAVAILABLE"); signatures++; });
                    Json.Require(ran == yes && opens == (yes ? 1 : 0) && signatures == (yes ? 1 : 0), "AUTHORIZATION_GATE_FAILURE");
                }
                else if (action == "atomic-output")
                {
                    using (AtomicOutput output = new AtomicOutput(Json.String(input, "output")))
                    {
                        string mutation = Json.String(input, "mutation"); bool denied = false;
                        if (mutation == "empty-directory-write")
                        {
                            using (SafeFileHandle writer = OpenWriteProbe(output.Root, 2, 7, IntPtr.Zero, 3, 0x02200000, IntPtr.Zero))
                                Json.Require(writer.IsInvalid && Marshal.GetLastWin32Error() == 32, "EMPTY_DIRECTORY_WRITE_HANDLE_NOT_DENIED");
                            denied = true;
                        }
                        output.Write("nested/content.json", Fixed.Utf8.GetBytes("snapshot"));
                        if (mutation == "write") { try { File.WriteAllText(Path.Combine(output.Root, "nested/content.json"), "attacker"); } catch (IOException) { denied = true; } }
                        else if (mutation == "rename") { try { Directory.Move(output.Root, output.Root + ".moved"); } catch (IOException) { denied = true; } }
                        else if (mutation == "extra") { File.WriteAllText(Path.Combine(output.Root, "extra.txt"), "attacker"); output.Check(); }
                        else if (mutation == "directory") { Directory.CreateDirectory(Path.Combine(output.Root, "extra")); output.Check(); }
                        else if (mutation == "normal") denied = true;
                        Json.Require(denied, "OUTPUT_MUTATION_NOT_DENIED"); output.Check();
                    }
                }
                else if (action == "added-after-review")
                {
                    using (QualificationBundle b = new QualificationBundle(Json.String(input, "root")))
                    {
                        b.Candidate(Digests.MachineId(), sid, DateTime.UtcNow, true);
                        File.WriteAllText(Path.Combine(b.Root, "payload/injected.txt"), "attacker"); b.RecheckSources();
                    }
                }
                else if (action == "snapshot-clone")
                {
                    using (QualificationBundle b = new QualificationBundle(Json.String(input, "root")))
                    {
                        b.Candidate(Digests.MachineId(), sid, DateTime.UtcNow, true);
                        byte[] bytes = b.Bytes("payload/app/package.json", 16384); string expected = Digests.Bytes(bytes); bytes[0] ^= 1;
                        Json.Require(Digests.Bytes(b.Bytes("payload/app/package.json", 16384)) == expected, "INTERNAL_SNAPSHOT_MUTABLE"); b.RecheckSources();
                    }
                }
                else if (action == "runtime-detached")
                {
                    using (Deployment runtime = new Deployment())
                    {
                        System.Reflection.BindingFlags binding = System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance;
                        typeof(Deployment).GetField("config", binding).SetValue(runtime, SigningContract.Read(FileArg(input, "config")));
                        try { typeof(Deployment).GetMethod("VerifyDetached", binding).Invoke(runtime, new object[] { FileArg(input, "content"), FileArg(input, "signature") }); }
                        catch (System.Reflection.TargetInvocationException ex) { throw ex.InnerException; }
                    }
                }
                else if (action == "plan") SigningContract.Plan(SigningContract.Read(FileArg(input, "plan")), Digests.MachineId(), sid, DateTime.UtcNow, true);
                else if (action == "approval")
                {
                    byte[] p = FileArg(input, "plan"); SigningContract.Approval(SigningContract.Read(FileArg(input, "approval")), SigningContract.Read(p), p, FileArg(input, "plan_signature"), DateTime.UtcNow, true);
                }
                else if (action == "bundle")
                {
                    using (VerifiedInstallation b = VerifiedInstallation.Open(Json.String(input, "root"), Json.String(input, "pin"))) { }
                }
                else if (action == "signed-plan")
                {
                    using (QualificationBundle b = new QualificationBundle(Json.String(input, "root"))) b.Candidate(Digests.MachineId(), sid, DateTime.UtcNow, true);
                }
                else if (action == "review") SigningContract.RequireReview(SigningContract.Bool(input, "isolated"), SigningContract.Bool(input, "target_verified"), Json.String(input, "typed"), Json.String(input, "expected"));
                else if (action == "epoch") SigningContract.RequireFreshEpoch(Json.Integer(input, "epoch"), SigningContract.Bool(input, "receipt_exists"));
                else if (action == "json") SigningContract.Read(FileArg(input, "content"));
                else if (action == "locked-mutation")
                {
                    using (QualificationBundle b = new QualificationBundle(Json.String(input, "root")))
                    {
                        b.Candidate(Digests.MachineId(), sid, DateTime.UtcNow, true);
                        bool denied = false;
                        try { File.WriteAllText(Path.Combine(b.Root, "payload/app/package.json"), "attacker replacement"); }
                        catch (IOException) { denied = true; }
                        Json.Require(denied, "HELD_DEPENDENCY_MUTATION_NOT_DENIED");
                    }
                }
                else if (action == "export-plan" || action == "export-approval" || action == "export-cut")
                {
                    bool deploy = action == "export-approval";
#if SIGNING_DIAGNOSTIC
                    if (action == "export-cut") QualificationBundle.PublicationProbe = delegate(string phase) { if (phase == Json.String(input, "phase")) { Console.WriteLine("SIMULATED_EXPORT_PROCESS_EXIT:" + phase); Environment.Exit(73); } };
#endif
                    using (QualificationBundle b = new QualificationBundle(Json.String(input, "root")))
                    {
                        b.Candidate(Digests.MachineId(), sid, DateTime.UtcNow, deploy);
                        b.Export(Json.String(input, "output"), FileArg(input, "reviewed"), FileArg(input, "signature"), deploy);
                    }
                }
                else if (action == "interrupted-publish")
                {
                    string destination = Json.String(input, "output"); Directory.CreateDirectory(destination);
                    QualificationBundle.WriteNew(Path.Combine(destination, "partial-review-only.json"), FileArg(input, "reviewed"));
                    Console.WriteLine("SIMULATED_PROCESS_EXIT_BEFORE_SIGNATURE_PUBLICATION"); Environment.Exit(73);
                }
                else throw new PolicyException("UNKNOWN_TEST_ACTION");
                if (action != "identity") Console.WriteLine("ACCEPTED"); return 0;
            }
            catch (Exception e) { Console.WriteLine(e is PolicyException ? e.Message : e.GetType().Name); return 21; }
        }
    }
}
