using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Security.Principal;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Threading;

namespace AgentNexus.CredentialBoundary
{
    internal static class ClientProgram
    {
        private static int Main(string[] args)
        {
            try
            {
                if (args.Length == 1 && args[0] == "--self-test") return PureTests.Run();
                if (args.Length == 2 && args[0] == "--daily" && args[1] == "--stdio") return RunDaily();
                if (args.Length == 2 && args[0] == "--approved-os-probe") return ApprovedProbe.Run(args[1]);
                Json.Require(args.Length == 1 && args[0] == "--stdio", "FIXED_STDIO_MODE_REQUIRED");
                Console.OutputEncoding = Fixed.Utf8;
                using (ManualResetEvent stop = new ManualResetEvent(false))
                using (Deployment deployment = Deployment.Load())
                {
                    TokenFacts.RequireOperator(TokenFacts.Current(), deployment.OperatorSid);
                    using (ProcessFacts self = ProcessFacts.Open((uint)Process.GetCurrentProcess().Id))
                        Json.Require(String.Equals(self.Path, Fixed.ClientExe, StringComparison.OrdinalIgnoreCase), "CLIENT_IMAGE_REJECTED");
                    // Identification is enough for token inspection; no delegation is granted to the server.
                    using (NamedPipeClientStream pipe = new NamedPipeClientStream(".", Fixed.PipeName, PipeDirection.InOut, PipeOptions.Asynchronous, TokenImpersonationLevel.Identification))
                    {
                        pipe.Connect(Fixed.ConnectTimeoutMs);
                        Identity.Server(pipe, deployment, null);
                        string serverStart = Identity.ServerStart(pipe);
                        Identity.Server(pipe, deployment, serverStart);
                        Frames pipeFrames = new Frames(pipe, stop);
                        Frames standardInput = new Frames(Console.OpenStandardInput(), stop);
                        Frames standardOutput = new Frames(Console.OpenStandardOutput(), stop);
                        Exception failed = null;
                        Thread receive = new Thread(delegate()
                        {
                            try
                            {
                                for (;;)
                                {
                                    string response = pipeFrames.Read(Timeout.Infinite);
                                    if (response == null) break;
                                    Identity.Server(pipe, deployment, serverStart);
                                    Json.Object(response);
                                    standardOutput.WriteText(response);
                                }
                            }
                            catch (Exception error) { failed = error; }
                            finally { stop.Set(); try { pipe.Dispose(); } catch { } }
                        });
                        receive.IsBackground = true;
                        receive.Start();
                        try
                        {
                            for (;;)
                            {
                                string request = standardInput.Read(Timeout.Infinite);
                                if (request == null) break;
                                Identity.Server(pipe, deployment, serverStart);
                                pipeFrames.Write(Json.Request(request));
                            }
                        }
                        finally { stop.Set(); pipe.Dispose(); receive.Join(1000); }
                        Json.Require(failed == null, "PIPE_SERVER_DISCONNECTED");
                    }
                }
                return 0;
            }
            catch (PolicyException error) { Console.Error.WriteLine("CREDENTIAL_CLIENT_BLOCKED:" + error.Code); return 78; }
            catch { Console.Error.WriteLine("CREDENTIAL_CLIENT_BLOCKED:TRANSPORT_FAILED"); return 78; }
        }
        private static int RunDaily()
        {
            Console.OutputEncoding = Fixed.Utf8;
            string serviceSid = Identity.DailyServiceSid();
            TokenFacts own = TokenFacts.Current();
            Json.Require(!own.Elevated && own.Integrity == 0x2000 && !own.AppContainer && own.SessionId > 0, "DAILY_MEDIUM_TOKEN_REQUIRED");
            using (ManualResetEvent stop = new ManualResetEvent(false))
            using (NamedPipeClientStream pipe = DailyClientPipe.Connect())
            {
                Identity.DailyServer(pipe, serviceSid, null);
                string start = Identity.ServerStart(pipe);
                Identity.DailyServer(pipe, serviceSid, start);
                Frames transport = new Frames(pipe, stop);
                Frames input = new Frames(Console.OpenStandardInput(), stop);
                Frames output = new Frames(Console.OpenStandardOutput(), stop);
                Exception failed = null;
                Thread receive = new Thread(delegate()
                {
                    try
                    {
                        for (;;)
                        {
                            string raw = transport.Read(Timeout.Infinite);
                            if (raw == null) break;
                            Identity.DailyServer(pipe, serviceSid, start);
                            Json.Object(raw);
                            output.WriteText(raw);
                        }
                    }
                    catch (Exception error) { failed = error; }
                    finally { stop.Set(); try { pipe.Dispose(); } catch { } }
                });
                receive.IsBackground = true;
                receive.Start();
                try
                {
                    for (;;)
                    {
                        string raw = input.Read(Timeout.Infinite);
                        if (raw == null) break;
                        Dictionary<string, object> request = Json.Request(raw);
                        DailyProtocol.RequireMethod(Json.String(request, "method"));
                        Identity.DailyServer(pipe, serviceSid, start);
                        transport.Write(request);
                    }
                }
                finally { stop.Set(); pipe.Dispose(); receive.Join(1000); }
                Json.Require(failed == null, "DAILY_SERVER_DISCONNECTED");
            }
            return 0;
        }
    }

    // Built, never called by build/self-test. Invoke only in an independently
    // approved, already-installed QUALIFICATION_ONLY deployment. No process
    // memory is read/written; no service/account/file/system setting is changed.
    internal static class ApprovedProbe
    {
        internal static int Run(string approval)
        {
            Json.Require(Regex.IsMatch(approval ?? "", "^APPROVED-[A-Za-z0-9_.:-]{8,160}$", RegexOptions.CultureInvariant), "EXPLICIT_PROBE_APPROVAL_REFERENCE_REQUIRED");
            TokenFacts current = TokenFacts.Current();
            Json.Require(!current.Elevated && current.Integrity == 0x2000 && !current.AppContainer && current.SessionId > 0, "PROBE_MEDIUM_TOKEN_REQUIRED");
            string serviceSid = Identity.DailyServiceSid();
            ServiceFacts service = ServiceFacts.Read();
            List<object> observations = new List<object>();
            using (ManualResetEvent stop = new ManualResetEvent(false))
            using (NamedPipeClientStream pipe = DailyClientPipe.Connect())
            {
                Identity.DailyServer(pipe, serviceSid, null);
                Frames frames = new Frames(pipe, stop);
                frames.Write(new { id = "probe-mode", method = "snapshot", @params = new { } });
                string raw = frames.Read(Fixed.FrameTimeoutMs);
                Dictionary<string, object> reply = raw == null ? null : Json.Object(raw);
                object value = null;
                Dictionary<string, object> snapshot = reply != null && reply.TryGetValue("value", out value) ? value as Dictionary<string, object> : null;
                Json.Require(reply != null && reply.ContainsKey("ok") && Object.Equals(reply["ok"], true) && snapshot != null &&
                    snapshot.ContainsKey("deployment_mode") && Object.Equals(snapshot["deployment_mode"], "QUALIFICATION_ONLY"), "PROBE_QUALIFICATION_ONLY_TARGET_REQUIRED");
                observations.Add(new { probe = "qualification-only-mode", verified = true });
            }
            using (ProcessFacts server = ProcessFacts.Open(service.Pid))
            {
                TokenFacts.RequireService(server.Token, serviceSid);
                Json.Require(String.Equals(server.Path, Fixed.ServiceExe, StringComparison.OrdinalIgnoreCase), "PROBE_OWNED_SERVICE_REQUIRED");
                foreach (KeyValuePair<string, uint> right in new Dictionary<string, uint> {
                    { "PROCESS_VM_READ", 0x10 }, { "PROCESS_CREATE_THREAD", 0x2 }, { "PROCESS_VM_OPERATION", 0x8 },
                    { "PROCESS_VM_WRITE", 0x20 }, { "PROCESS_DUP_HANDLE", 0x40 }, { "WRITE_DAC", 0x40000 }, { "WRITE_OWNER", 0x80000 }
                })
                {
                    server.RequireAlive();
                    IntPtr handle = Win32.OpenProcess(right.Value, false, service.Pid);
                    int error = Marshal.GetLastWin32Error();
                    if (handle != IntPtr.Zero) Win32.CloseHandle(handle);
                    observations.Add(new { probe = "service-" + right.Key, cases = new[] { "SRC-04", "SRC-06", "SRC-07", "PRV-04" }, denied = handle == IntPtr.Zero, win32_error = handle == IntPtr.Zero ? error : 0 });
                }
                foreach (KeyValuePair<string, uint> right in new Dictionary<string, uint> { { "TOKEN_DUPLICATE", 2 }, { "TOKEN_ASSIGN_PRIMARY", 1 }, { "TOKEN_IMPERSONATE", 4 }, { "TOKEN_ADJUST_PRIVILEGES", 0x20 }, { "TOKEN_WRITE_DAC", 0x40000 } })
                {
                    server.RequireAlive();
                    IntPtr token;
                    bool opened = Win32.OpenProcessToken(server.Handle, right.Value, out token);
                    int error = Marshal.GetLastWin32Error();
                    if (opened) Win32.CloseHandle(token);
                    observations.Add(new { probe = "service-" + right.Key, cases = new[] { "SRC-05", "SRC-07" }, denied = !opened, win32_error = opened ? 0 : error });
                }
            }
            using (ManualResetEvent stop = new ManualResetEvent(false))
            using (NamedPipeClientStream pipe = DailyClientPipe.Connect())
            {
                Identity.DailyServer(pipe, serviceSid, null);
                Frames frames = new Frames(pipe, stop);
                frames.Write(new { id = "probe-snapshot", method = "snapshot", @params = new { } });
                string response = frames.Read(Fixed.FrameTimeoutMs);
                Dictionary<string, object> reply = response == null ? null : Json.Object(response);
                // Do not print the response or provider metadata into evidence.
                observations.Add(new { probe = "medium-snapshot", cases = new[] { "SRC-01" }, accepted = reply != null && reply.ContainsKey("ok") && Object.Equals(reply["ok"], true) });
                IntPtr extra = Win32.CreateNamedPipeProbe(Fixed.DailyPipePath, 3 | 0x40000000u, 0x4 | 0x2 | 0x8, Fixed.MaxConnections, 65536, 65536, Fixed.ConnectTimeoutMs, IntPtr.Zero);
                int error = Marshal.GetLastWin32Error();
                bool denied = extra == new IntPtr(-1);
                if (!denied) Win32.CloseHandle(extra);
                observations.Add(new { probe = "medium-create-pipe-instance", cases = new[] { "SRC-11", "HLP-07" }, denied = denied, win32_error = denied ? error : 0 });
                foreach (uint pid in Win32.FixedServiceChildren(service.Pid))
                {
                    foreach (uint mask in new uint[] { 0x10, 0x2, 0x8, 0x20, 0x40, 0x40000, 0x80000 })
                    {
                        // Only our fixed service child is eligible. No bytes,
                        // remote thread, dump, DLL or context are ever supplied.
                        if (Win32.ParentPid(pid) != service.Pid) break;
                        IntPtr handle = Win32.OpenProcess(mask, false, pid);
                        int accessError = Marshal.GetLastWin32Error();
                        if (handle != IntPtr.Zero) Win32.CloseHandle(handle);
                        observations.Add(new { probe = "runtime-process-access", cases = new[] { "SRC-04", "SRC-06", "SRC-07", "PRV-04" }, process_id = pid, access_mask = mask, denied = handle == IntPtr.Zero, win32_error = handle == IntPtr.Zero ? accessError : 0 });
                    }
                }
            }
            ProbeDisconnect(serviceSid, "management-on-daily", new { id = "probe-management", method = "credential.state", @params = new { } }, observations, new[] { "DLY-07" });
            ProbeDisconnect(serviceSid, "forged-peer", new { id = "probe-peer", method = "snapshot", @params = new { }, peer = new { authenticated = true, kind = "DAILY_RUNTIME", runtime_identity = Guid.NewGuid().ToString("D") } }, observations, new[] { "SRC-03", "DLY-09" });
            ProbeDisconnect(serviceSid, "runtime-self-registration", new { id = "probe-register", method = "runtime.attach", @params = new { } }, observations, new[] { "SRC-02", "SRC-13", "SRC-14" });
            Console.WriteLine(Json.Encode(new { schema = "agentnexus.q3.approved-native-probes.v1", approval_ref = approval,
                observed_at_utc = DateTime.UtcNow.ToString("o"), scope = "OWNED_BENIGN_ALREADY_DEPLOYED_TARGET_ONLY", observations = observations,
                matrix_case_status = "PARTIAL_OBSERVATIONS_ONLY_REMAINING_70_CASE_PLAN_NOT_RUN", windows_boundary_qualified = false,
                installed_service = false, changed_accounts_or_persistent_acl = false, real_credentials_or_provider_network = false }));
            return 0;
        }
        private static void ProbeDisconnect(string serviceSid, string name, object request, List<object> observations, string[] cases)
        {
            using (ManualResetEvent stop = new ManualResetEvent(false))
            using (NamedPipeClientStream pipe = DailyClientPipe.Connect())
            {
                Identity.DailyServer(pipe, serviceSid, null);
                Frames frames = new Frames(pipe, stop);
                frames.Write(request);
                bool closed = false;
                try { closed = frames.Read(Fixed.FrameTimeoutMs) == null; }
                catch (IOException) { closed = true; }
                observations.Add(new { probe = name, cases = cases, disconnected = closed });
            }
        }
    }
}
