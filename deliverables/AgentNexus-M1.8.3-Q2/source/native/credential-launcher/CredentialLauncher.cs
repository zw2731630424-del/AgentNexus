// Ordinary-token, fixed-target launcher. Normal execution emits no payload or diagnostics.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;

namespace AgentNexus.CredentialBoundary
{
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
            Console.WriteLine(Json.Encode(new { schema = "agentnexus.launcher-self-test.v1", passed = passed, failed = 0, windows_boundary_qualified = false, uac_invoked = false }));
            return 0;
        }
        [STAThread]
        private static int Main(string[] args)
        {
            try
            {
                if (args.Length == 1 && args[0] == "--self-test") return SelfTest();
                LauncherIntent intent = LauncherIntent.Parse(args);
                TokenFacts token = TokenFacts.Current();
                Json.Require(NormalToken(token), "LAUNCHER_TOKEN_REJECTED");
                string image = System.IO.Path.GetFullPath(Process.GetCurrentProcess().MainModule.FileName);
                Json.Require(String.Equals(image, Fixed.LauncherExe, StringComparison.OrdinalIgnoreCase), "LAUNCHER_PATH_REJECTED");
                using (Deployment deployment = Deployment.Load())
                {
                    Json.Require(token.Sid == deployment.OperatorSid, "LAUNCHER_OPERATOR_REJECTED");
                    deployment.RequireCurrentApproval();
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
