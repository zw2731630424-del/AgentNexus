// TEST EXECUTABLE ONLY. Never included in the production Helper build.
// Same Windows SID, Low/Medium token, inherited private stdio; no production pipe.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

namespace AgentNexus.CredentialBoundary
{
    internal static class SyntheticUiFixture
    {
        internal const string Canary = "synthetic-test-q3-ui-boundary-canary-0192837465";
        internal const string Name = "Q3 Synthetic UI Canary";
        internal const string WindowTitle = "AgentNexus Synthetic Credential Test";
        internal static HelperIntent Intent()
        {
            return HelperIntent.Parse(new[] { "--action", "ADD", "--provider-id", "deepseek", "--operation-id", Guid.NewGuid().ToString("D"), "--name", Name, "--model-ids", "deepseek-flash" });
        }
        internal static bool Ordinary(TokenFacts facts)
        {
            return facts != null && !facts.Elevated && (facts.Integrity == 0x1000 || facts.Integrity == 0x2000) && !facts.AppContainer && facts.SessionId > 0;
        }
    }

    internal static class SyntheticUiProgram
    {
        [STAThread]
        private static int Main(string[] args)
        {
            try
            {
                Json.Require(args.Length == 1 && args[0] == "--synthetic-ui-worker", "SYNTHETIC_ENTRY_REQUIRED");
                TokenFacts token = TokenFacts.Current();
                Json.Require(SyntheticUiFixture.Ordinary(token), "SYNTHETIC_ORDINARY_TOKEN_REQUIRED");
                string image = Path.GetFullPath(Process.GetCurrentProcess().MainModule.FileName);
                Json.Require(Regex.IsMatch(image, @"\\\.workflow-kit\\runtime\\AgentNexus-M1\.8\.3-Q3\\native-helper-ui\\synthetic-credential-ui\.exe\z", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant), "SYNTHETIC_RUNTIME_PATH_REQUIRED");
                using (ProcessFacts parent = ProcessFacts.Open(Win32.ParentPid((uint)Process.GetCurrentProcess().Id)))
                {
                    Json.Require(SyntheticUiFixture.Ordinary(parent.Token) && parent.Token.Integrity == token.Integrity && parent.Token.Sid == token.Sid && parent.Token.SessionId == token.SessionId, "SYNTHETIC_SAME_SID_PARENT_REQUIRED");
                    parent.RequireAlive();
                }
                Json.Require(Console.IsInputRedirected && Console.IsOutputRedirected, "SYNTHETIC_PRIVATE_STDIO_REQUIRED");
                HelperIntent intent = SyntheticUiFixture.Intent();
                using (Deployment deployment = new Deployment { Mode = "QUALIFICATION_ONLY", PolicyEpoch = 1, RealImportEnabled = false })
                using (SyntheticControllerTransport transport = new SyntheticControllerTransport(intent))
                {
                    HelperTarget target;
                    using (IHelperRpcSession bootstrap = transport.Session())
                        target = HelperResponses.Snapshot(bootstrap.Call("snapshot", new Dictionary<string, object>(), false), intent, deployment);
                    Application.EnableVisualStyles();
                    Application.SetCompatibleTextRenderingDefault(false);
                    Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
                    using (TrustedCredentialForm form = new TrustedCredentialForm(deployment, intent, target, transport.Session))
                    {
                        form.Text = SyntheticUiFixture.WindowTitle;
                        form.TransactionFailed += delegate(string code) { transport.Event("synthetic.ui.blocked", new Dictionary<string, object> { { "reason", code } }); };
                        form.Shown += delegate { transport.Event("synthetic.ui.shown", new Dictionary<string, object> { { "pid", Process.GetCurrentProcess().Id }, { "same_sid", true }, { "elevated", false }, { "integrity", token.Integrity == 0x1000 ? "LOW" : "MEDIUM" } }); };
                        ThreadExceptionEventHandler handler = delegate { form.FailClosed(); };
                        Application.ThreadException += handler;
                        try
                        {
                            Application.Run(form);
                            transport.Event("synthetic.ui.closed", new Dictionary<string, object> { { "exit_code", form.ExitCode }, { "save_acknowledged", transport.SaveAcknowledged } });
                            return form.ExitCode;
                        }
                        finally { Application.ThreadException -= handler; }
                    }
                }
            }
            catch (PolicyException error) { return Blocked(error.Code); }
            catch { return Blocked("SYNTHETIC_UI_UNEXPECTED_FAILURE"); }
        }
        private static int Blocked(string reason)
        {
            // Only test-owned finite policy codes; never exception messages,
            // paths, identity strings, request bodies or credential values.
            if (!Regex.IsMatch(reason ?? "", @"\A[A-Z][A-Z0-9_]{0,95}\z", RegexOptions.CultureInvariant)) reason = "SYNTHETIC_UI_BLOCKED";
            try { Console.WriteLine(Json.Encode(new { @event = "synthetic.ui.blocked", reason = reason, assurance = "SIMULATED", uac_verified = "NOT_RUN" })); } catch { }
            return 21;
        }
    }

    internal sealed class SyntheticControllerTransport : IDisposable
    {
        private readonly HelperIntent intent;
        private readonly Dictionary<string, object> metadata;
        private readonly Stream input = Console.OpenStandardInput();
        private readonly Stream output = Console.OpenStandardOutput();
        private readonly ManualResetEvent stop = new ManualResetEvent(false);
        private readonly Frames responses;
        private readonly object io = new object();
        private string ticketId;
        private int stopped;
        internal bool SaveAcknowledged { get; private set; }
        internal SyntheticControllerTransport(HelperIntent intent)
        {
            this.intent = intent;
            metadata = intent.Metadata(SyntheticUiFixture.Name, new[] { "deepseek-flash" });
            responses = new Frames(input, stop, Abort);
        }
        internal IHelperRpcSession Session() { return new SyntheticControllerSession(this); }
        internal void Event(string name, Dictionary<string, object> value)
        {
            lock (io)
            {
                value.Add("event", name); value.Add("assurance", "SIMULATED"); value.Add("uac_verified", "NOT_RUN");
                Write(value);
            }
        }
        private void Write(Dictionary<string, object> value)
        {
            byte[] wire = Fixed.Utf8.GetBytes(Json.Encode(value) + "\n");
            try { Json.Require(wire.Length <= 16384, "SYNTHETIC_FRAME_LIMIT"); output.Write(wire, 0, wire.Length); output.Flush(); }
            finally { Array.Clear(wire, 0, wire.Length); }
        }
        internal Dictionary<string, object> Call(string method, Dictionary<string, object> parameters)
        {
            lock (io)
            {
                Json.Require(stopped == 0, "SYNTHETIC_CHANNEL_CLOSED");
                RequireFixedPayload(method, parameters);
                string id = Guid.NewGuid().ToString("D");
                Write(new Dictionary<string, object> { { "id", id }, { "method", method }, { "params", parameters } });
                Dictionary<string, object> result = HelperResponses.Success(responses.Read(Fixed.FrameTimeoutMs), id);
                if (method == "credential.prepare") ticketId = HelperTicket.Parse(result, intent.OperationId, HelperTicket.NowMs).Id;
                if (method == "credential.save")
                {
                    HelperResponses.Completed("ADD", result);
                    Json.Require(Json.String(result, "classification") == "SYNTHETIC", "SYNTHETIC_ACK_REQUIRED");
                    SaveAcknowledged = true;
                    Event("synthetic.ui.save.ack", new Dictionary<string, object> { { "stored", true } });
                }
                return result;
            }
        }
        private void RequireFixedPayload(string method, Dictionary<string, object> p)
        {
            if (method == "snapshot") { Json.ExactKeys(p); return; }
            if (method == "credential.prepare")
            {
                Json.ExactKeys(p, "operation_id", "metadata_hash", "secret_sha256");
                Json.Require(ticketId == null && Json.String(p, "operation_id") == intent.OperationId && Json.String(p, "metadata_hash") == HelperCanonical.Hash(metadata) && Json.String(p, "secret_sha256") == Digests.Bytes(Fixed.Utf8.GetBytes(SyntheticUiFixture.Canary)), "SYNTHETIC_FIXED_PAYLOAD_REQUIRED");
                return;
            }
            if (method == "credential.ticket.cancel")
            {
                Json.ExactKeys(p, "ticket_id", "operation_id");
                Json.Require(ticketId != null && Json.String(p, "ticket_id") == ticketId && Json.String(p, "operation_id") == intent.OperationId, "SYNTHETIC_TICKET_OWNER_REQUIRED"); return;
            }
            Json.Require(method == "credential.save", "SYNTHETIC_METHOD_DENIED");
            Json.ExactKeys(p, metadata.Keys.Concat(new[] { "secret_b64", "import_ticket", "import_operation_id" }).ToArray());
            Json.Require(ticketId != null && Json.String(p, "import_ticket") == ticketId && Json.String(p, "import_operation_id") == intent.OperationId && Json.String(p, "secret_b64") == Convert.ToBase64String(Fixed.Utf8.GetBytes(SyntheticUiFixture.Canary)), "SYNTHETIC_FIXED_PAYLOAD_REQUIRED");
            Dictionary<string, object> actual = p.Where(item => metadata.ContainsKey(item.Key)).ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal);
            Json.Require(HelperCanonical.Hash(actual) == HelperCanonical.Hash(metadata), "SYNTHETIC_FIXED_PAYLOAD_REQUIRED");
        }
        internal void Abort()
        {
            if (Interlocked.Exchange(ref stopped, 1) != 0) return;
            stop.Set(); try { input.Dispose(); } catch { }
        }
        public void Dispose() { Abort(); lock (io) { responses.Dispose(); stop.Dispose(); output.Dispose(); } }
    }

    internal sealed class SyntheticControllerSession : IHelperRpcSession
    {
        private readonly SyntheticControllerTransport transport;
        private bool disposed;
        public bool MutationAttempted { get; private set; }
        internal SyntheticControllerSession(SyntheticControllerTransport transport) { this.transport = transport; }
        public Dictionary<string, object> Call(string method, Dictionary<string, object> parameters, bool mutation)
        {
            Json.Require(!disposed, "SYNTHETIC_SESSION_CLOSED");
            if (mutation) MutationAttempted = true;
            return transport.Call(method, parameters);
        }
        public void CancelTicket(HelperTicket ticket)
        {
            Dictionary<string, object> result = Call("credential.ticket.cancel", ticket.Cancellation(), false);
            Json.ExactKeys(result, "cancelled", "automatic_retry");
            Json.Require(result["cancelled"] is bool && (bool)result["cancelled"] && result["automatic_retry"] is bool && !(bool)result["automatic_retry"], "SYNTHETIC_CANCEL_REJECTED");
        }
        public void Abort() { disposed = true; transport.Abort(); }
        public void Dispose() { disposed = true; }
    }
}
