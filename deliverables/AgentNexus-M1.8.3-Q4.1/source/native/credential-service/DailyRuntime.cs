// Fixed native relay under the independent service identity. No caller-supplied
// application, command, environment, filesystem path, Subject authority or Key.
using System;
using System.Collections.Generic;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Threading;
using Microsoft.Win32.SafeHandles;

namespace AgentNexus.CredentialBoundary
{
    internal static class DailyServerReadback
    {
        internal static void Enable(Deployment deployment)
        {
            // Only the already-running service process/token receive query
            // grants, so Medium can verify the real server's token. No disk,
            // account, SCM configuration or persistent system ACL is modified.
            // QUERY_LIMITED_INFORMATION + SYNCHRONIZE do not grant VM read,
            // injection, duplicate-handle or control rights. TOKEN_QUERY alone
            // does not permit duplication, impersonation or token adjustment.
            Set(Win32.GetCurrentProcess(), deployment, "0x00101000");
            IntPtr token;
            Win32.Check(Win32.OpenProcessToken(Win32.GetCurrentProcess(), 0x000c0008, out token), "SERVER_TOKEN_READBACK_OPEN_FAILED");
            try { Set(token, deployment, "0x00000008"); }
            finally { Win32.CloseHandle(token); }
        }
        private static void Set(IntPtr handle, Deployment deployment, string rights)
        {
            IntPtr descriptor;
            uint length;
            Native.Check(Native.ConvertStringSecurityDescriptorToSecurityDescriptor("O:" + deployment.ServiceSid + "D:P(A;;GA;;;SY)(A;;GA;;;BA)(A;;GA;;;" + deployment.ServiceSid + ")(A;;" + rights + ";;;" + deployment.OperatorSid + ")", 1, out descriptor, out length), "SERVER_READBACK_DACL_INVALID");
            try
            {
                bool present, defaulted;
                IntPtr dacl, owner;
                Native.Check(Native.GetSecurityDescriptorDacl(descriptor, out present, out dacl, out defaulted), "SERVER_READBACK_DACL_UNAVAILABLE");
                Native.Check(Native.GetSecurityDescriptorOwner(descriptor, out owner, out defaulted), "SERVER_READBACK_OWNER_UNAVAILABLE");
                Json.Require(present && dacl != IntPtr.Zero && owner != IntPtr.Zero && Native.SetSecurityInfo(handle, 6, 0x80000005, owner, IntPtr.Zero, dacl, IntPtr.Zero) == 0, "SERVER_READBACK_DACL_FAILED");
            }
            finally { Native.LocalFree(descriptor); }
        }
    }

    internal static class DailyPipes
    {
        internal static string Descriptor(string serviceSid, string operatorSid)
        {
            return "O:" + serviceSid + "D:P(A;;GA;;;SY)(A;;GA;;;" + serviceSid + ")(A;;0x00120183;;;" + operatorSid + ")S:(ML;;NW;;;ME)";
        }
        internal static NamedPipeServerStream Create(Deployment deployment, bool first)
        {
            IntPtr descriptor;
            uint size;
            Native.Check(Native.ConvertStringSecurityDescriptorToSecurityDescriptor(Descriptor(deployment.ServiceSid, deployment.OperatorSid), 1, out descriptor, out size), "DAILY_PIPE_DACL_INVALID");
            try
            {
                Win32.SECURITY_ATTRIBUTES attributes = new Win32.SECURITY_ATTRIBUTES { Length = Marshal.SizeOf(typeof(Win32.SECURITY_ATTRIBUTES)), Descriptor = descriptor, Inherit = false };
                // Duplex/overlapped; local message pipe; Medium MIC; retain all
                // initial handles rather than recreating an unguarded pipe name.
                IntPtr raw = Native.CreateNamedPipe(Fixed.DailyPipePath, 3 | 0x40000000u | (first ? 0x00080000u : 0), 0x4 | 0x2 | 0x8,
                    Fixed.MaxConnections, 65536, 65536, Fixed.ConnectTimeoutMs, ref attributes);
                Json.Require(raw != new IntPtr(-1), first ? "DAILY_FIRST_INSTANCE_REJECTED" : "DAILY_INSTANCE_CREATE_FAILED");
                SafePipeHandle handle = new SafePipeHandle(raw, true);
                try { return new NamedPipeServerStream(PipeDirection.InOut, true, false, handle); }
                catch { handle.Dispose(); throw; }
            }
            finally { Native.LocalFree(descriptor); }
        }
    }

    internal static class DailyRuntimeProgram
    {
        internal static int Run()
        {
            // This mode cannot be used from a Medium process. Both tokens and
            // the live parent SCM process are inspected, then Deployment pins
            // every fixed executable/application dependency for the lifetime.
            using (Deployment deployment = Deployment.Load())
            using (ManualResetEvent stop = new ManualResetEvent(false))
            {
                TokenFacts.RequireService(TokenFacts.Current(), deployment.ServiceSid);
                Identity.RequireDailyParent(deployment);
                Frames input = new Frames(Console.OpenStandardInput(), stop);
                Frames output = new Frames(Console.OpenStandardOutput(), stop);
                string first = input.Read(Fixed.ConnectTimeoutMs);
                Json.Require(first != null, "DAILY_BOOTSTRAP_REQUIRED");
                Dictionary<string, object> bootstrap = Json.Object(first);
                Json.ExactKeys(bootstrap, "kind", "channel", "peer");
                Json.Require(Json.String(bootstrap, "kind") == "bootstrap", "DAILY_BOOTSTRAP_REQUIRED");
                string channel = Json.String(bootstrap, "channel");
                Json.Require(Regex.IsMatch(channel, "^[a-f0-9]{32}$", RegexOptions.CultureInvariant), "DAILY_PRIVATE_CHANNEL_INVALID");
                Dictionary<string, object> peer = bootstrap["peer"] as Dictionary<string, object>;
                Json.Require(peer != null, "DAILY_PRIVATE_IDENTITY_INVALID");
                DailyProtocol.RequirePeer(peer, deployment.ServiceSid, deployment.OperatorSid);
                for (;;)
                {
                    string raw = input.Read(Fixed.IdleTimeoutMs);
                    if (raw == null) return 0;
                    deployment.RequireCurrentApproval();
                    DailyProtocol.RequirePeer(peer, deployment.ServiceSid, deployment.OperatorSid);
                    Dictionary<string, object> command = Json.Object(raw);
                    Json.ExactKeys(command, "kind", "request");
                    Json.Require(Json.String(command, "kind") == "request", "DAILY_PRIVATE_COMMAND_DENIED");
                    Dictionary<string, object> request = Json.Request(Json.Encode(command["request"]));
                    DailyProtocol.RequireMethod(Json.String(request, "method"));
                    output.Write(new Dictionary<string, object> { { "channel", channel }, { "peer", peer }, { "request", request } });
                }
            }
        }
    }
}
