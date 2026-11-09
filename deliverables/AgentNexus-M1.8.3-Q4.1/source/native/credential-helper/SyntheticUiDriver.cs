// Integration-test driver. Interacts with the real WinForms controls through
// UI Automation; it cannot drive production Helper or UAC windows.
using System;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Automation;
using System.Windows.Forms;

namespace AgentNexus.CredentialBoundary
{
    internal static class SyntheticUiDriver
    {
        private const string Canary = "synthetic-test-q3-ui-boundary-canary-0192837465";
        private static AutomationElement Find(int pid, string name)
        {
            Stopwatch limit = Stopwatch.StartNew();
            while (limit.ElapsedMilliseconds < 15000)
            {
                AutomationElement result = AutomationElement.RootElement.FindFirst(TreeScope.Descendants,
                    new AndCondition(new PropertyCondition(AutomationElement.ProcessIdProperty, pid), new PropertyCondition(AutomationElement.NameProperty, name)));
                if (result != null) return result;
                Thread.Sleep(100);
            }
            throw new InvalidOperationException("SYNTHETIC_UI_CONTROL_NOT_FOUND");
        }
        private static void Click(AutomationElement element)
        {
            if (!element.Current.IsEnabled || element.Current.IsOffscreen) throw new InvalidOperationException("SYNTHETIC_UI_CONTROL_UNAVAILABLE");
            ((InvokePattern)element.GetCurrentPattern(InvokePattern.Pattern)).Invoke();
        }
        private static void EnterCanary(AutomationElement element, int pid)
        {
            if (!element.Current.IsPassword || !element.Current.IsEnabled) throw new InvalidOperationException("SYNTHETIC_PASSWORD_CONTROL_REQUIRED");
            element.SetFocus();
            object raw;
            if (element.TryGetCurrentPattern(ValuePattern.Pattern, out raw))
            {
                try { ((ValuePattern)raw).SetValue(Canary); return; }
                catch (InvalidOperationException) { }
            }
            AutomationElement focused = AutomationElement.FocusedElement;
            if (focused == null || focused.Current.ProcessId != pid || focused.Current.Name != "CredentialSecret") throw new InvalidOperationException("SYNTHETIC_UI_FOCUS_REQUIRED");
            SendKeys.SendWait(Canary);
        }
        [MTAThread]
        private static int Main(string[] args)
        {
            try
            {
                int pid;
                if (args.Length != 4 || args[0] != "--pid" || !Int32.TryParse(args[1], out pid) || pid <= 0 || args[2] != "--case" || (args[3] != "save" && args[3] != "cancel" && args[3] != "review-cancel")) return 21;
                TokenFacts token = TokenFacts.Current();
                Json.Require(!token.Elevated && (token.Integrity == 0x1000 || token.Integrity == 0x2000) && !token.AppContainer && token.SessionId > 0, "SYNTHETIC_ORDINARY_TOKEN_REQUIRED");
                using (ProcessFacts target = ProcessFacts.Open((uint)pid))
                {
                    Json.Require(!target.Token.Elevated && target.Token.Integrity == token.Integrity && !target.Token.AppContainer && target.Token.SessionId == token.SessionId && target.Token.Sid == token.Sid, "SYNTHETIC_SAME_SID_TARGET_REQUIRED");
                    Json.Require(Regex.IsMatch(Path.GetFullPath(target.Path), @"\\\.workflow-kit\\runtime\\AgentNexus-M1\.8\.3-Q3\\native-helper-ui\\synthetic-credential-ui\.exe\z", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant), "SYNTHETIC_TARGET_PATH_REQUIRED");
                    target.RequireAlive();
                    Find(pid, "AgentNexus Synthetic Credential Test");
                    if (args[3] == "cancel") Click(Find(pid, "CredentialCancel"));
                    else
                    {
                        EnterCanary(Find(pid, "CredentialSecret"), pid);
                        AutomationElement submit = Find(pid, "CredentialSubmit");
                        ThreadPool.QueueUserWorkItem(delegate { try { Click(submit); } catch { } });
                        Click(Find(pid, args[3] == "save" ? "CredentialApprove" : "CredentialReviewCancel"));
                    }
                    Json.Require(Win32.WaitForSingleObject(target.Handle, 30000) == 0, "SYNTHETIC_UI_EXIT_TIMEOUT");
                }
                Console.WriteLine(Json.Encode(new { schema = "agentnexus.synthetic-helper-ui-driver.v1", result = "PASS", ui_launched = true, test_case = args[3], control_actions = args[3] == "cancel" ? 1 : 3, canary_logged = false, uac_verified = "NOT_RUN" }));
                return 0;
            }
            catch { Console.WriteLine("{\"result\":\"FAIL\",\"uac_verified\":\"NOT_RUN\"}"); return 21; }
        }
    }
}
