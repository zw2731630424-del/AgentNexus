using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.ServiceProcess;
using System.Text;
using System.Threading;
using Microsoft.Win32.SafeHandles;

namespace AgentNexus.CredentialBoundary
{
    internal static class ServiceProgram
    {
        private static int Main(string[] args)
        {
            try
            {
                if (args.Length == 1 && args[0] == "--self-test") return PureTests.Run();
                if (args.Length == 1 && (args[0] == "--attest-engine" || args[0] == "--attest-consents"))
                {
                    // This is a read-only helper, not an alternate service/engine launch mode.
                    using (Deployment deployment = Deployment.Load())
                    {
                        TokenFacts.RequireService(TokenFacts.Current(), deployment.ServiceSid);
                        Identity.RequireEngineParent(deployment);
                        Console.OutputEncoding = Fixed.Utf8;
                        Console.WriteLine(Json.Encode(args[0] == "--attest-engine" ? deployment.Attestation() : deployment.VerifiedConsents()));
                        return 0;
                    }
                }
                Json.Require(args.Length == 0 && !Environment.UserInteractive, "SCM_START_REQUIRED");
                ServiceBase.Run(new CredentialService());
                return 0;
            }
            catch (PolicyException error)
            {
                Console.Error.WriteLine("CREDENTIAL_BOUNDARY_BLOCKED:" + error.Code);
                return 78;
            }
            catch
            {
                Console.Error.WriteLine("CREDENTIAL_BOUNDARY_BLOCKED:VALIDATION_FAILED");
                return 78;
            }
        }
    }

    internal sealed class Session
    {
        internal readonly string Channel = Guid.NewGuid().ToString("N");
        internal readonly NamedPipeServerStream Pipe;
        internal readonly Frames Frames;
        internal Dictionary<string, object> Peer;
        internal Session(NamedPipeServerStream pipe, WaitHandle stop) { Pipe = pipe; Frames = new Frames(pipe, stop); }
        internal object Envelope(Dictionary<string, object> request)
        {
            return new Dictionary<string, object> { { "channel", Channel }, { "peer", Peer }, { "request", request } };
        }
        internal void Abort()
        {
            try { Win32.CancelIoEx(Pipe.SafePipeHandle, IntPtr.Zero); } catch { }
        }
    }

    internal sealed class CredentialService : ServiceBase
    {
        private readonly ManualResetEvent stop = new ManualResetEvent(false);
        private readonly object sessionsLock = new object();
        private readonly Dictionary<string, Session> sessions = new Dictionary<string, Session>(StringComparer.Ordinal);
        private readonly List<NamedPipeServerStream> listeners = new List<NamedPipeServerStream>();
        private Deployment deployment;
        private EngineProcess engine;
        private Timer approvalExpiry;
        private int failed;

        internal CredentialService()
        {
            ServiceName = Fixed.ServiceName;
            AutoLog = false;
            CanStop = true;
            CanShutdown = true;
        }
        protected override void OnStart(string[] args)
        {
            try
            {
                Json.Require(args.Length == 0, "SCM_ARGUMENTS_REJECTED");
                deployment = Deployment.Load();
                TokenFacts.RequireService(TokenFacts.Current(), deployment.ServiceSid);
                ServiceFacts registered = ServiceFacts.Read();
                Json.Require(registered.Pid == (uint)Process.GetCurrentProcess().Id, "SCM_PROCESS_MISMATCH");
                using (ProcessFacts self = ProcessFacts.Open(registered.Pid))
                    Json.Require(String.Equals(self.Path, Fixed.ServiceExe, StringComparison.OrdinalIgnoreCase), "SERVICE_IMAGE_REJECTED");
                deployment.RequireCurrentApproval();
                // Qualification, hashes, ACLs and identity are checked before child or IPC creation.
                engine = EngineProcess.Start(deployment, stop);
                for (int i = 0; i < Fixed.MaxConnections; i++) listeners.Add(CreateListener(i == 0));
                foreach (NamedPipeServerStream listener in listeners)
                {
                    NamedPipeServerStream captured = listener;
                    ThreadPool.QueueUserWorkItem(delegate { Listen(captured); });
                }
                ThreadPool.QueueUserWorkItem(delegate { ReadEngine(); });
                int remaining = (int)Math.Min(Int32.MaxValue, Math.Max(1, (deployment.ApprovalExpiresUtc - DateTime.UtcNow).TotalMilliseconds));
                approvalExpiry = new Timer(delegate { FailBroker(); }, null, remaining, Timeout.Infinite);
            }
            catch
            {
                Shutdown();
                ExitCode = 78;
                throw new InvalidOperationException("CREDENTIAL_SERVICE_STARTUP_BLOCKED");
            }
        }
        private NamedPipeServerStream CreateListener(bool first)
        {
            // Explicit protected DACL, mandatory High label, and remote rejection at creation.
            string sddl = "D:P(A;;GA;;;SY)(A;;GA;;;BA)(A;;GA;;;" + deployment.ServiceSid + ")S:(ML;;NW;;;HI)";
            IntPtr descriptor;
            uint size;
            Native.Check(Native.ConvertStringSecurityDescriptorToSecurityDescriptor(sddl, 1, out descriptor, out size), "PIPE_DACL_INVALID");
            try
            {
                Win32.SECURITY_ATTRIBUTES attributes = new Win32.SECURITY_ATTRIBUTES { Length = Marshal.SizeOf(typeof(Win32.SECURITY_ATTRIBUTES)), Descriptor = descriptor, Inherit = false };
                IntPtr handle = Native.CreateNamedPipe(Fixed.PipePath, 3 | 0x40000000u | (first ? 0x00080000u : 0), 0x00000008, Fixed.MaxConnections, 65536, 65536, Fixed.ConnectTimeoutMs, ref attributes);
                Json.Require(handle != new IntPtr(-1), first ? "PIPE_FIRST_INSTANCE_REJECTED" : "PIPE_INSTANCE_CREATE_FAILED");
                SafePipeHandle safe = new SafePipeHandle(handle, true);
                try { return new NamedPipeServerStream(PipeDirection.InOut, true, false, safe); }
                catch { safe.Dispose(); throw; }
            }
            finally { Native.LocalFree(descriptor); }
        }
        private void Listen(NamedPipeServerStream pipe)
        {
            while (!stop.WaitOne(0))
            {
                Session session = null;
                try
                {
                    IAsyncResult pending = pipe.BeginWaitForConnection(null, null);
                    int ready;
                    using (WaitHandle connected = pending.AsyncWaitHandle)
                        ready = WaitHandle.WaitAny(new[] { connected, stop });
                    if (ready != 0) return;
                    pipe.EndWaitForConnection(pending);
                    session = new Session(pipe, stop);
                    for (;;)
                    {
                        string raw = session.Frames.Read(Fixed.IdleTimeoutMs);
                        if (raw == null) break;
                        // Read first, then impersonate the actual last-message token. Never trust peer JSON.
                        Dictionary<string, object> peer = Identity.Client(pipe, deployment);
                        Dictionary<string, object> request = Json.Request(raw);
                        RequireHelperMethod(Json.String(request, "method"));
                        deployment.RequireCurrentApproval();
                        deployment.ValidateRequestForMode(request);
                        if (session.Peer == null)
                        {
                            session.Peer = peer;
                            lock (sessionsLock) sessions.Add(session.Channel, session);
                        }
                        else
                        {
                            Json.Require(Object.Equals(session.Peer["process_id"], peer["process_id"]) && Object.Equals(session.Peer["start_id"], peer["start_id"]) && Object.Equals(session.Peer["sid"], peer["sid"]) && Object.Equals(session.Peer["session_id"], peer["session_id"]), "CONNECTION_IDENTITY_CHANGED");
                        }
                        engine.Input.Write(session.Envelope(request));
                    }
                }
                catch (PolicyException) { /* Generic disconnect only. Never log untrusted data. */ }
                catch (IOException) { }
                catch (ObjectDisposedException) { if (!stop.WaitOne(0)) FailBroker(); }
                catch { if (!stop.WaitOne(0)) FailBroker(); }
                finally
                {
                    if (session != null && session.Peer != null)
                    {
                        lock (sessionsLock) sessions.Remove(session.Channel);
                        if (!stop.WaitOne(0))
                        {
                            try
                            {
                                engine.Input.Write(session.Envelope(new Dictionary<string, object> {
                                    { "id", "disconnect-" + Guid.NewGuid().ToString("N") },
                                    { "method", "session.disconnect" }, { "params", new Dictionary<string, object>() }
                                }));
                            }
                            catch { FailBroker(); }
                        }
                    }
                    if (session != null) session.Frames.Dispose();
                    try { if (pipe.IsConnected) pipe.Disconnect(); }
                    catch { if (!stop.WaitOne(0)) FailBroker(); }
                }
                // Keep and reuse all four initial handles. Never leave an unguarded recreation gap.
                if (stop.WaitOne(0)) return;
                try { if (pipe.SafePipeHandle.IsClosed) { FailBroker(); return; } }
                catch { FailBroker(); return; }
            }
        }
        internal static void RequireHelperMethod(string method)
        {
            Json.Require(method == "snapshot" || method == "credential.prepare" || method == "credential.save" ||
                method == "credential.state" || method == "credential.delete" || method == "credential.models" ||
                method == "credential.ticket.cancel", "HELPER_METHOD_DENIED");
        }
        private void ReadEngine()
        {
            try
            {
                for (;;)
                {
                    string raw = engine.Output.Read(Timeout.Infinite);
                    Json.Require(raw != null, "ENGINE_EXITED");
                    deployment.RequireCurrentApproval();
                    Dictionary<string, object> wrapper = Json.Object(raw);
                    Json.ExactKeys(wrapper, "channel", "response");
                    string channel = Json.String(wrapper, "channel");
                    Json.Require(channel.Length == 32 && wrapper["response"] is Dictionary<string, object>, "ENGINE_RESPONSE_INVALID");
                    Session session;
                    lock (sessionsLock) sessions.TryGetValue(channel, out session);
                    if (session == null) continue; // Reject unknown/retired channels; never broadcast or select fallback.
                    try { session.Frames.Write(wrapper["response"]); }
                    catch { session.Abort(); }
                }
            }
            catch { if (!stop.WaitOne(0)) FailBroker(); }
        }
        private void FailBroker()
        {
            if (Interlocked.Exchange(ref failed, 1) != 0) return;
            ThreadPool.QueueUserWorkItem(delegate { try { Stop(); } catch { Shutdown(); } });
        }
        protected override void OnStop() { Shutdown(); }
        protected override void OnShutdown() { Shutdown(); }
        private void Shutdown()
        {
            stop.Set();
            Timer closingTimer = Interlocked.Exchange(ref approvalExpiry, null);
            if (closingTimer != null) closingTimer.Dispose();
            // Closing the job kills Node and every child, including a pending attestation helper.
            if (engine != null) engine.Dispose();
            foreach (NamedPipeServerStream pipe in listeners) { try { pipe.Dispose(); } catch { } }
            listeners.Clear();
            lock (sessionsLock) sessions.Clear();
            if (deployment != null) deployment.Dispose();
        }
    }

    internal sealed class EngineProcess : IDisposable
    {
        private IntPtr job;
        private IntPtr process;
        private FileStream input, output, errors;
        internal Frames Input;
        internal Frames Output;

        internal static EngineProcess Start(Deployment deployment, WaitHandle stop)
        {
            EngineProcess result = new EngineProcess();
            IntPtr childInput = IntPtr.Zero, parentInput = IntPtr.Zero, parentOutput = IntPtr.Zero, childOutput = IntPtr.Zero, parentErrors = IntPtr.Zero, childErrors = IntPtr.Zero;
            IntPtr attributeList = IntPtr.Zero, handleList = IntPtr.Zero, environment = IntPtr.Zero;
            bool attributesInitialized = false;
            Native.PROCESS_INFORMATION created = new Native.PROCESS_INFORMATION();
            try
            {
                result.job = Native.CreateJobObject(IntPtr.Zero, null);
                Json.Require(result.job != IntPtr.Zero, "JOB_CREATE_FAILED");
                Native.JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = new Native.JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
                limits.Basic.LimitFlags = 0x2000 | 0x8; // KILL_ON_JOB_CLOSE | ACTIVE_PROCESS
                limits.Basic.ActiveProcessLimit = 6; // Node, up to four connection helpers, one attestation helper.
                Native.Check(Native.SetInformationJobObject(result.job, 9, ref limits, Marshal.SizeOf(typeof(Native.JOBOBJECT_EXTENDED_LIMIT_INFORMATION))), "JOB_LIMITS_FAILED");
                Win32.SECURITY_ATTRIBUTES attributes = new Win32.SECURITY_ATTRIBUTES { Length = Marshal.SizeOf(typeof(Win32.SECURITY_ATTRIBUTES)), Inherit = true };
                Native.Check(Native.CreatePipe(out childInput, out parentInput, ref attributes, 65536), "CHILD_PIPE_FAILED");
                Native.Check(Native.CreatePipe(out parentOutput, out childOutput, ref attributes, 65536), "CHILD_PIPE_FAILED");
                Native.Check(Native.CreatePipe(out parentErrors, out childErrors, ref attributes, 65536), "CHILD_PIPE_FAILED");
                Native.Check(Native.SetHandleInformation(parentInput, 1, 0) && Native.SetHandleInformation(parentOutput, 1, 0) && Native.SetHandleInformation(parentErrors, 1, 0), "PARENT_HANDLE_INHERITANCE_FAILED");
                IntPtr attributeSize = IntPtr.Zero;
                Native.InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref attributeSize);
                Json.Require(attributeSize.ToInt64() > 0 && attributeSize.ToInt64() <= 65536, "CHILD_HANDLE_LIST_FAILED");
                attributeList = Marshal.AllocHGlobal(attributeSize);
                Native.Check(Native.InitializeProcThreadAttributeList(attributeList, 1, 0, ref attributeSize), "CHILD_HANDLE_LIST_FAILED");
                attributesInitialized = true;
                handleList = Marshal.AllocHGlobal(IntPtr.Size * 3);
                Marshal.WriteIntPtr(handleList, 0, childInput); Marshal.WriteIntPtr(handleList, IntPtr.Size, childOutput); Marshal.WriteIntPtr(handleList, IntPtr.Size * 2, childErrors);
                Native.Check(Native.UpdateProcThreadAttribute(attributeList, 0, new IntPtr(0x20002), handleList, new IntPtr(IntPtr.Size * 3), IntPtr.Zero, IntPtr.Zero), "CHILD_HANDLE_LIST_FAILED");
                Native.STARTUPINFOEX startup = new Native.STARTUPINFOEX();
                startup.Startup.Size = Marshal.SizeOf(typeof(Native.STARTUPINFOEX));
                startup.Startup.Flags = 0x100;
                startup.Startup.StdInput = childInput; startup.Startup.StdOutput = childOutput; startup.Startup.StdError = childErrors;
                startup.Attributes = attributeList;
                // No PATH, NODE_OPTIONS, credentials, provider URLs or caller-controlled environment.
                SortedDictionary<string, string> variables = new SortedDictionary<string, string>(StringComparer.OrdinalIgnoreCase) {
                    { "AGENTNEXUS_NATIVE_BOUNDARY", "1" }, { "NODE_ENV", "production" },
                    { "SystemRoot", @"C:\Windows" }, { "WINDIR", @"C:\Windows" },
                    { "TEMP", Fixed.DataRoot + @"\temp" }, { "TMP", Fixed.DataRoot + @"\temp" }
                };
                StringBuilder block = new StringBuilder();
                foreach (KeyValuePair<string, string> variable in variables) block.Append(variable.Key).Append('=').Append(variable.Value).Append('\0');
                block.Append('\0'); environment = Marshal.StringToHGlobalUni(block.ToString());
                StringBuilder command = new StringBuilder("\"" + Fixed.NodeExe + "\" \"" + Fixed.EngineJs + "\"");
                Native.Check(Native.CreateProcess(Fixed.NodeExe, command, IntPtr.Zero, IntPtr.Zero, true, 0x4 | 0x400 | 0x80000 | 0x08000000, environment, Fixed.InstallRoot + @"\app", ref startup, out created), "CHILD_CREATE_FAILED");
                result.process = created.Process;
                Native.Check(Native.AssignProcessToJobObject(result.job, result.process), "CHILD_JOB_ASSIGN_FAILED");
                using (ProcessFacts child = ProcessFacts.Open(created.ProcessId))
                {
                    TokenFacts.RequireService(child.Token, deployment.ServiceSid);
                    Json.Require(String.Equals(child.Path, Fixed.NodeExe, StringComparison.OrdinalIgnoreCase), "CHILD_IMAGE_REJECTED");
                }
                result.input = new FileStream(new SafeFileHandle(parentInput, true), FileAccess.Write, 8192, false); parentInput = IntPtr.Zero;
                result.output = new FileStream(new SafeFileHandle(parentOutput, true), FileAccess.Read, 8192, false); parentOutput = IntPtr.Zero;
                result.errors = new FileStream(new SafeFileHandle(parentErrors, true), FileAccess.Read, 8192, false); parentErrors = IntPtr.Zero;
                result.Input = new Frames(result.input, stop, result.Kill); result.Output = new Frames(result.output, stop, result.Kill);
                Json.Require(Native.ResumeThread(created.Thread) != UInt32.MaxValue, "CHILD_RESUME_FAILED");
                ThreadPool.QueueUserWorkItem(delegate { result.DiscardErrors(); });
                return result;
            }
            catch { if (created.Process != IntPtr.Zero) Native.TerminateProcess(created.Process, 78); result.Dispose(); throw; }
            finally
            {
                foreach (IntPtr handle in new[] { childInput, parentInput, parentOutput, childOutput, parentErrors, childErrors, created.Thread }) if (handle != IntPtr.Zero) Win32.CloseHandle(handle);
                if (attributeList != IntPtr.Zero) { if (attributesInitialized) Native.DeleteProcThreadAttributeList(attributeList); Marshal.FreeHGlobal(attributeList); }
                if (handleList != IntPtr.Zero) Marshal.FreeHGlobal(handleList);
                if (environment != IntPtr.Zero) Marshal.FreeHGlobal(environment);
            }
        }
        private void DiscardErrors()
        {
            try { byte[] bytes = new byte[8192]; while (errors.Read(bytes, 0, bytes.Length) > 0) Array.Clear(bytes, 0, bytes.Length); }
            catch { } // Child stderr is never a log, RPC response, file or event.
        }
        public void Dispose()
        {
            Kill();
            if (Input != null) Input.Dispose();
            if (Output != null) Output.Dispose();
            if (input != null) input.Dispose();
            if (output != null) output.Dispose();
            if (errors != null) errors.Dispose();
            IntPtr closing = Interlocked.Exchange(ref process, IntPtr.Zero);
            if (closing != IntPtr.Zero) Win32.CloseHandle(closing);
        }
        private void Kill()
        {
            IntPtr closing = Interlocked.Exchange(ref job, IntPtr.Zero);
            if (closing != IntPtr.Zero) Win32.CloseHandle(closing);
        }
    }

    internal static class Native
    {
        internal static void Check(bool result, string code) { Win32.Check(result, code); }
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] internal struct STARTUPINFO { internal int Size; internal IntPtr Reserved, Desktop, Title; internal uint X, Y, XSize, YSize, XCountChars, YCountChars, FillAttribute, Flags; internal ushort ShowWindow, Reserved2Size; internal IntPtr Reserved2, StdInput, StdOutput, StdError; }
        [StructLayout(LayoutKind.Sequential)] internal struct STARTUPINFOEX { internal STARTUPINFO Startup; internal IntPtr Attributes; }
        [StructLayout(LayoutKind.Sequential)] internal struct PROCESS_INFORMATION { internal IntPtr Process, Thread; internal uint ProcessId, ThreadId; }
        [StructLayout(LayoutKind.Sequential)] internal struct JOBOBJECT_BASIC_LIMIT_INFORMATION { internal long PerProcessUserTimeLimit, PerJobUserTimeLimit; internal uint LimitFlags; internal UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize; internal uint ActiveProcessLimit; internal UIntPtr Affinity; internal uint PriorityClass, SchedulingClass; }
        [StructLayout(LayoutKind.Sequential)] internal struct IO_COUNTERS { internal ulong ReadOperationCount, WriteOperationCount, OtherOperationCount, ReadTransferCount, WriteTransferCount, OtherTransferCount; }
        [StructLayout(LayoutKind.Sequential)] internal struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION { internal JOBOBJECT_BASIC_LIMIT_INFORMATION Basic; internal IO_COUNTERS IoInfo; internal UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed; }
        [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] internal static extern bool ConvertStringSecurityDescriptorToSecurityDescriptor(string descriptor, uint revision, out IntPtr security, out uint size);
        [DllImport("kernel32.dll")] internal static extern IntPtr LocalFree(IntPtr memory);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] internal static extern IntPtr CreateNamedPipe(string name, uint openMode, uint pipeMode, int instances, int outBuffer, int inBuffer, int timeout, ref Win32.SECURITY_ATTRIBUTES attributes);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] internal static extern IntPtr CreateJobObject(IntPtr attributes, string name);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool SetInformationJobObject(IntPtr job, int kind, ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION information, int length);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool CreatePipe(out IntPtr read, out IntPtr write, ref Win32.SECURITY_ATTRIBUTES attributes, int size);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool SetHandleInformation(IntPtr handle, uint mask, uint flags);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool InitializeProcThreadAttributeList(IntPtr list, int count, int flags, ref IntPtr size);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool UpdateProcThreadAttribute(IntPtr list, uint flags, IntPtr attribute, IntPtr value, IntPtr size, IntPtr previous, IntPtr returned);
        [DllImport("kernel32.dll")] internal static extern void DeleteProcThreadAttributeList(IntPtr list);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] internal static extern bool CreateProcess(string application, StringBuilder command, IntPtr processAttributes, IntPtr threadAttributes, bool inherit, uint flags, IntPtr environment, string directory, ref STARTUPINFOEX startup, out PROCESS_INFORMATION process);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern uint ResumeThread(IntPtr thread);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool TerminateProcess(IntPtr process, uint code);
    }
}
