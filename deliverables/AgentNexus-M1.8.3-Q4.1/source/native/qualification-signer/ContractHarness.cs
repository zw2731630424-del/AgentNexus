// Diagnostic-only test entry. Never included in deployment/signing executables.
// Input contains synthetic documents, PUBLIC certificates and CMS, never private keys.
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Principal;

namespace AgentNexus.CredentialBoundary
{
    internal static class ContractHarness
    {
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
                else if (action == "export-plan" || action == "export-approval")
                {
                    bool deploy = action == "export-approval";
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
