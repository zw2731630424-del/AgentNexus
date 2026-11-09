// Ordinary-token, fixed-target launcher. Normal execution emits no payload or diagnostics.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text.RegularExpressions;

namespace AgentNexus.CredentialBoundary
{
    // A protected, non-secret launch description. This grants no credential or
    // Daily authority. The elevated Helper independently authenticates the
    // full deployment/approval/service before displaying any input window.
    internal sealed class LauncherPlan : IDisposable
    {
        internal const string PlanFile = Fixed.InstallRoot + @"\launcher-plan.json";
        internal string OperatorSid;
        private readonly List<FileStream> locked = new List<FileStream>();
        internal static LauncherPlan Load()
        {
            LauncherPlan plan = new LauncherPlan();
            try
            {
                using (Deployment pathPolicy = new Deployment())
                {
                    pathPolicy.CheckPath(Fixed.InstallRoot, false, true);
                    pathPolicy.CheckPath(PlanFile, false, false);
                    FileStream input = plan.Lock(PlanFile);
                    Json.Require(input.Length > 0 && input.Length <= 16384, "LAUNCH_PLAN_SIZE_REJECTED");
                    byte[] bytes = new byte[(int)input.Length];
                    int used = 0;
                    while (used < bytes.Length) { int read = input.Read(bytes, used, bytes.Length - used); Json.Require(read > 0, "LAUNCH_PLAN_TRUNCATED"); used += read; }
                    Dictionary<string, object> data;
                    try { data = Json.Object(Fixed.Utf8.GetString(bytes)); }
                    finally { Array.Clear(bytes, 0, bytes.Length); }
                    plan.OperatorSid = ValidateDescription(data, Digests.MachineId(), DateTime.UtcNow);
                    foreach (string image in new[] { Fixed.HelperExe, Fixed.LauncherExe })
                    {
                        pathPolicy.CheckPath(image, false, false);
                        string hash = Json.String(data, image == Fixed.HelperExe ? "helper_sha256" : "launcher_sha256");
                        Json.Require(Digests.IsHash(hash) && Digests.Stream(plan.Lock(image)) == hash, "LAUNCH_PLAN_HASH_REJECTED");
                    }
                }
                return plan;
            }
            catch { plan.Dispose(); throw; }
        }
        internal static string ValidateDescription(Dictionary<string, object> data, string machineId, DateTime now)
        {
            Json.ExactKeys(data, "schema", "machine_id", "operator_sid", "helper_sha256", "launcher_sha256", "policy_epoch", "expires_at_utc", "approval_ref");
            Json.Require(Json.String(data, "schema") == "agentnexus.launcher-plan.v1" && Json.String(data, "machine_id") == machineId, "LAUNCH_PLAN_HOST_REJECTED");
            string sid = Json.String(data, "operator_sid");
            Json.Require(new SecurityIdentifier(sid).IsAccountSid() && Json.Integer(data, "policy_epoch") > 0, "LAUNCH_PLAN_OPERATOR_REJECTED");
            Json.Require(Digests.IsHash(Json.String(data, "helper_sha256")) && Digests.IsHash(Json.String(data, "launcher_sha256")), "LAUNCH_PLAN_HASH_REJECTED");
            DateTime expiry;
            Json.Require(DateTime.TryParseExact(Json.String(data, "expires_at_utc"), "o", CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out expiry) && expiry.Kind == DateTimeKind.Utc && expiry > now && expiry <= now.AddDays(7), "LAUNCH_PLAN_EXPIRED");
            Json.Require(Regex.IsMatch(Json.String(data, "approval_ref"), @"\A[A-Za-z0-9][A-Za-z0-9._:-]{7,127}\z", RegexOptions.CultureInvariant), "LAUNCH_PLAN_REFERENCE_REJECTED");
            return sid;
        }
        private FileStream Lock(string path)
        {
            FileStream stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
            locked.Add(stream); return stream;
        }
        public void Dispose() { foreach (FileStream stream in locked) stream.Dispose(); locked.Clear(); }
    }

    internal sealed class LauncherIntent
    {
        internal string Action, Provider, Operation, Name, Models, Target;
        private const string Uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
        private const string EmptyUuid = "00000000-0000-0000-0000-000000000000";
        internal static LauncherIntent Parse(string[] args)
        {
            Json.Require(args != null && (args.Length == 10 || args.Length == 12) && args.Sum(a => a == null ? 10000 : a.Length) <= 512, "INTENT_INVALID");
            string[] keys = { "--action", "--provider-id", "--operation-id", "--name", "--model-ids", "--credential-id" };
            Dictionary<string, string> fields = new Dictionary<string, string>(StringComparer.Ordinal);
            for (int i = 0; i < args.Length; i += 2)
            {
                Json.Require(keys.Contains(args[i]) && !fields.ContainsKey(args[i]) && args[i + 1] != null, "INTENT_INVALID");
                fields.Add(args[i], args[i + 1]);
            }
            Json.Require(keys.Take(5).All(fields.ContainsKey), "INTENT_INVALID");
            string action = fields["--action"], name = fields["--name"];
            Json.Require(new[] { "ADD", "ROTATE", "ENABLE", "DISABLE", "DELETE", "MODELS" }.Contains(action) && fields["--provider-id"] == "deepseek", "INTENT_SCOPE_REJECTED");
            Json.Require(fields["--operation-id"] != EmptyUuid && Regex.IsMatch(fields["--operation-id"], "^" + Uuid + "\\z", RegexOptions.CultureInvariant), "INTENT_INVALID");
            Json.Require(name == name.Trim() && Regex.IsMatch(name, @"^[\p{L}\p{N} ._-]{1,80}\z", RegexOptions.CultureInvariant), "INTENT_INVALID");
            string models = fields["--model-ids"];
            string[] modelIds = models.Length == 0 ? new string[0] : models.Split(',');
            Json.Require(modelIds.Length <= 2 && modelIds.Distinct(StringComparer.Ordinal).Count() == modelIds.Length && modelIds.All(m => m == "deepseek-flash" || m == "deepseek-v4-pro"), "INTENT_SCOPE_REJECTED");
            Json.Require(!new[] { "ADD", "ROTATE", "ENABLE" }.Contains(action) || modelIds.Length > 0, "INTENT_SCOPE_REJECTED");
            string target;
            bool hasTarget = fields.TryGetValue("--credential-id", out target);
            Json.Require(action == "ADD" ? !hasTarget : hasTarget && target != "key." + EmptyUuid && Regex.IsMatch(target, "^key\\." + Uuid + "\\z", RegexOptions.CultureInvariant), "INTENT_TARGET_REJECTED");
            return new LauncherIntent { Action = action, Provider = "deepseek", Operation = fields["--operation-id"], Name = name, Models = models, Target = target };
        }
        internal string Arguments()
        {
            // The allowlist excludes quotes, backslashes and controls in every value.
            string result = "--action " + Action + " --provider-id deepseek --operation-id " + Operation + " --name \"" + Name + "\" --model-ids \"" + Models + "\"";
            return Target == null ? result : result + " --credential-id " + Target;
        }
    }

    internal static class LauncherProgram
    {
        internal static bool NormalToken(TokenFacts token) { return !token.Elevated && token.Integrity == 0x2000 && !token.AppContainer && token.SessionId > 0; }
        // UAC consent from the same split-admin account is the only supported
        // elevation. A standard user's approving administrator is not the
        // original operator and cannot take over that operator's transaction.
        internal static bool SameSidElevation(TokenFacts original, int elevationType, TokenFacts linked)
        {
            return NormalToken(original) && elevationType == 3 && linked != null && linked.Sid == original.Sid && linked.Elevated && linked.Integrity >= 0x3000 && !linked.AppContainer && linked.SessionId == original.SessionId;
        }
        private static bool CurrentSameSidElevation(TokenFacts original)
        {
            IntPtr token = IntPtr.Zero, type = IntPtr.Zero, linkedInfo = IntPtr.Zero, linked = IntPtr.Zero;
            try
            {
                Win32.Check(Win32.OpenProcessToken(Win32.GetCurrentProcess(), 8, out token), "LAUNCHER_TOKEN_UNAVAILABLE");
                type = Win32.TokenInfo(token, 18);
                int elevationType = Marshal.ReadInt32(type);
                if (elevationType != 3) return false;
                linkedInfo = Win32.TokenInfo(token, 19); linked = Marshal.ReadIntPtr(linkedInfo);
                return SameSidElevation(original, elevationType, TokenFacts.Read(linked));
            }
            catch { return false; }
            finally
            {
                if (linked != IntPtr.Zero) Win32.CloseHandle(linked);
                if (linkedInfo != IntPtr.Zero) Marshal.FreeHGlobal(linkedInfo);
                if (type != IntPtr.Zero) Marshal.FreeHGlobal(type);
                if (token != IntPtr.Zero) Win32.CloseHandle(token);
            }
        }
        private static int Readiness()
        {
            string reason = "TRUSTED_ENTRY_REQUIRES_MEDIUM_TOKEN";
            bool ready = false;
            try
            {
                TokenFacts token = TokenFacts.Current();
                Json.Require(NormalToken(token), reason);
                reason = "SAME_SID_ELEVATION_UNAVAILABLE";
                Json.Require(CurrentSameSidElevation(token), reason);
                reason = "TRUSTED_ENTRY_FIXED_PATH_REQUIRED";
                Json.Require(String.Equals(Path.GetFullPath(Process.GetCurrentProcess().MainModule.FileName), Fixed.LauncherExe, StringComparison.OrdinalIgnoreCase), reason);
                reason = "TRUSTED_ENTRY_LAUNCH_PLAN_BLOCKED";
                using (LauncherPlan plan = LauncherPlan.Load()) Json.Require(plan.OperatorSid == token.Sid, reason);
                reason = "TRUSTED_ENTRY_SERVICE_UNAVAILABLE";
                ServiceFacts.Read();
                ready = true; reason = "TRUSTED_ENTRY_READY";
            }
            catch { }
            Console.WriteLine(Json.Encode(new { schema = "agentnexus.trusted-entry-readiness.v1", status = ready ? "READY" : "BLOCKED", reason = reason, same_sid_elevation_required = true, uac_verified = false }));
            return 0;
        }
        private static int SelfTest()
        {
            int passed = 0;
            string[] valid = { "--action", "ADD", "--provider-id", "deepseek", "--operation-id", "12345678-1234-1234-1234-123456789abc", "--name", "Fixture Key 01", "--model-ids", "deepseek-flash,deepseek-v4-pro" };
            LauncherIntent intent = LauncherIntent.Parse(valid); Json.Require(intent.Arguments().Contains("--name \"Fixture Key 01\""), "SELF_TEST_FAILED"); passed++;
            foreach (string[] invalid in new[] {
                valid.Concat(new[] { "--path", @"C:\temp\helper.exe" }).ToArray(),
                valid.Concat(new[] { "--action", "DELETE" }).ToArray(),
                new[] { "--action", "ADD", "--provider-id", "other", "--operation-id", valid[5], "--name", "Fixture", "--model-ids", "deepseek-flash" },
                new[] { "--action", "ADD", "--provider-id", "deepseek", "--operation-id", valid[5], "--name", "bad\"name", "--model-ids", "deepseek-flash" },
                new[] { "--action", "ADD", "--provider-id", "deepseek", "--operation-id", valid[5], "--name", "Fixture", "--model-ids", "deepseek-flash,deepseek-flash" },
                new[] { "--action", "DELETE", "--provider-id", "deepseek", "--operation-id", valid[5], "--name", "Fixture", "--model-ids", "", "--credential-id", "key.untrusted" },
                new[] { "--action", "ADD", "--provider-id", "deepseek", "--operation-id", valid[5] + "\n", "--name", "Fixture", "--model-ids", "deepseek-flash" },
                new[] { "--action", "ADD", "--provider-id", "deepseek", "--operation-id", valid[5], "--name", "Fixture\n", "--model-ids", "deepseek-flash" },
                valid.Take(8).Concat(new[] { "--method", "credential.save" }).ToArray(),
                valid.Take(8).Concat(new[] { "--env", "PATH=untrusted" }).ToArray(),
                valid.Take(8).Concat(new[] { "--stdin", "value" }).ToArray(),
                valid.Take(8).Concat(new[] { "--script", "untrusted.ps1" }).ToArray(),
                valid.Take(8).Concat(new[] { "--url", "https://untrusted.invalid" }).ToArray(),
                new[] { "--action", "ADD", "--provider-id", "deepseek", "--operation-id", "00000000-0000-0000-0000-000000000000", "--name", "Fixture", "--model-ids", "deepseek-flash" },
                new[] { "--action", "DELETE", "--provider-id", "deepseek", "--operation-id", valid[5], "--name", "Fixture", "--model-ids", "", "--credential-id", "key.00000000-0000-0000-0000-000000000000" }
            })
            {
                bool rejected = false; try { LauncherIntent.Parse(invalid); } catch (PolicyException) { rejected = true; }
                Json.Require(rejected, "SELF_TEST_FAILED"); passed++;
            }
            Json.Require(NormalToken(new TokenFacts { Elevated = false, Integrity = 0x2000, AppContainer = false, SessionId = 1 }), "SELF_TEST_FAILED"); passed++;
            foreach (TokenFacts token in new[] { new TokenFacts { Elevated = true, Integrity = 0x3000, SessionId = 1 }, new TokenFacts { Integrity = 0x1000, SessionId = 1 }, new TokenFacts { Integrity = 0x2000, AppContainer = true, SessionId = 1 }, new TokenFacts { Integrity = 0x2000, SessionId = 0 } }) { Json.Require(!NormalToken(token), "SELF_TEST_FAILED"); passed++; }
            TokenFacts medium = new TokenFacts { Sid = "S-1-5-21-1-2-3-1001", Integrity = 0x2000, SessionId = 1 };
            TokenFacts same = new TokenFacts { Sid = medium.Sid, Elevated = true, Integrity = 0x3000, SessionId = 1 };
            TokenFacts other = new TokenFacts { Sid = "S-1-5-21-1-2-3-500", Elevated = true, Integrity = 0x3000, SessionId = 1 };
            Json.Require(SameSidElevation(medium, 3, same), "SELF_TEST_FAILED"); passed++;
            Json.Require(!SameSidElevation(medium, 1, null) && !SameSidElevation(medium, 3, other), "SELF_TEST_FAILED"); passed++;
            same.SessionId = 2; Json.Require(!SameSidElevation(medium, 3, same), "SELF_TEST_FAILED"); passed++;
            bool syntheticRejected = false; try { LauncherIntent.Parse(new[] { "--synthetic-ui-worker" }); } catch (PolicyException) { syntheticRejected = true; }
            Json.Require(syntheticRejected, "SELF_TEST_FAILED"); passed++;
            DateTime now = new DateTime(2026, 11, 9, 0, 0, 0, DateTimeKind.Utc);
            string machine = new string('1', 64);
            Dictionary<string, object> description = new Dictionary<string, object> {
                { "schema", "agentnexus.launcher-plan.v1" }, { "machine_id", machine }, { "operator_sid", medium.Sid },
                { "helper_sha256", new string('2', 64) }, { "launcher_sha256", new string('3', 64) },
                { "policy_epoch", 1 }, { "expires_at_utc", now.AddHours(1).ToString("o", CultureInfo.InvariantCulture) }, { "approval_ref", "synthetic-launch-plan-review" }
            };
            Json.Require(LauncherPlan.ValidateDescription(description, machine, now) == medium.Sid, "SELF_TEST_FAILED"); passed++;
            foreach (KeyValuePair<string, object> change in new[] {
                new KeyValuePair<string, object>("schema", "other"), new KeyValuePair<string, object>("machine_id", new string('9', 64)),
                new KeyValuePair<string, object>("operator_sid", "S-1-5-32-544"), new KeyValuePair<string, object>("policy_epoch", 0),
                new KeyValuePair<string, object>("helper_sha256", "bad"), new KeyValuePair<string, object>("launcher_sha256", new string('A', 64)),
                new KeyValuePair<string, object>("expires_at_utc", now.ToString("o", CultureInfo.InvariantCulture)),
                new KeyValuePair<string, object>("expires_at_utc", now.AddDays(8).ToString("o", CultureInfo.InvariantCulture)),
                new KeyValuePair<string, object>("expires_at_utc", "2026-11-09T01:00:00"), new KeyValuePair<string, object>("approval_ref", "bad\nreference")
            })
            {
                object before = description[change.Key]; description[change.Key] = change.Value;
                bool blocked = false; try { LauncherPlan.ValidateDescription(description, machine, now); } catch { blocked = true; }
                description[change.Key] = before;
                Json.Require(blocked, "SELF_TEST_FAILED"); passed++;
            }
            Console.WriteLine(Json.Encode(new { schema = "agentnexus.launcher-self-test.v1", passed = passed, failed = 0, windows_boundary_qualified = false, uac_invoked = false }));
            return 0;
        }
        [STAThread]
        private static int Main(string[] args)
        {
            try
            {
                if (args.Length == 1 && args[0] == "--self-test") return SelfTest();
                if (args.Length == 1 && args[0] == "--readiness") return Readiness();
                LauncherIntent intent = LauncherIntent.Parse(args);
                TokenFacts token = TokenFacts.Current();
                Json.Require(NormalToken(token), "LAUNCHER_TOKEN_REJECTED");
                Json.Require(CurrentSameSidElevation(token), "SAME_SID_ELEVATION_UNAVAILABLE");
                string image = System.IO.Path.GetFullPath(Process.GetCurrentProcess().MainModule.FileName);
                Json.Require(String.Equals(image, Fixed.LauncherExe, StringComparison.OrdinalIgnoreCase), "LAUNCHER_PATH_REJECTED");
                using (LauncherPlan plan = LauncherPlan.Load())
                {
                    Json.Require(token.Sid == plan.OperatorSid, "LAUNCHER_OPERATOR_REJECTED");
                    ServiceFacts.Read(); // Read-only SCM check; never starts or installs a service.
                    ShellInfo info = new ShellInfo { Size = Marshal.SizeOf(typeof(ShellInfo)), Mask = 0x40 | 0x100 | 0x400, Verb = "runas", File = Fixed.HelperExe, Parameters = intent.Arguments(), Directory = Fixed.InstallRoot, Show = 1 };
                    if (!ShellExecuteEx(ref info)) return Marshal.GetLastWin32Error() == 1223 ? 20 : 21;
                    if (info.Process == IntPtr.Zero) return 20;
                    try
                    {
                        if (Win32.WaitForSingleObject(info.Process, 600000) != 0) return 20;
                        uint code;
                        if (!GetExitCodeProcess(info.Process, out code)) return 20;
                        return code == 0 ? 0 : code == 21 ? 21 : 20;
                    }
                    finally { Win32.CloseHandle(info.Process); }
                }
            }
            catch { return 21; }
        }
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct ShellInfo
        {
            internal int Size, Mask;
            internal IntPtr Window;
            internal string Verb, File, Parameters, Directory;
            internal int Show;
            internal IntPtr Instance, IdList;
            internal string Class;
            internal IntPtr ClassKey;
            internal uint HotKey;
            internal IntPtr Icon, Process;
        }
        [DllImport("shell32.dll", CharSet = CharSet.Unicode, SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool ShellExecuteEx(ref ShellInfo info);
        [DllImport("kernel32.dll", SetLastError = true)] [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);
    }
}
