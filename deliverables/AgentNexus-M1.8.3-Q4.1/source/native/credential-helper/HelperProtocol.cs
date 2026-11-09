using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.IO.Pipes;
using System.Linq;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

namespace AgentNexus.CredentialBoundary
{
    internal sealed class HelperTicket
    {
        internal string Id;
        internal string OperationId;
        private readonly Stopwatch age = Stopwatch.StartNew();
        private int lifetimeMs;
        internal bool Current { get { return age.ElapsedMilliseconds < lifetimeMs; } }
        // The Node issuer uses the precise system clock. Framework DateTime
        // can sample an older coarse tick and incorrectly see a newly-issued
        // 30s ticket as more than 30s in the future. Keep the strict lifetime
        // bound, using the same precise Windows wall clock on both sides.
        internal static long NowMs { get { long fileTime; GetSystemTimePreciseAsFileTime(out fileTime); return fileTime / 10000L - 11644473600000L; } }
        [DllImport("kernel32.dll")] private static extern void GetSystemTimePreciseAsFileTime(out long fileTime);
        internal static HelperTicket Parse(Dictionary<string, object> value, string operationId, long now)
        {
            Json.ExactKeys(value, "ticket_id", "operation_id", "expires_at");
            string id = Json.String(value, "ticket_id"), operation = Json.String(value, "operation_id");
            object raw = value["expires_at"];
            Json.Require(raw is long || raw is int, "HELPER_TICKET_INVALID");
            long expires = Convert.ToInt64(raw);
            Json.Require(HelperIntent.IsUuid(id) && operation == operationId && HelperIntent.IsUuid(operation), "HELPER_TICKET_BINDING_INVALID");
            Json.Require(expires > now, "HELPER_TICKET_EXPIRED");
            Json.Require(expires - now <= 30000, "HELPER_TICKET_FUTURE_REJECTED");
            return new HelperTicket { Id = id, OperationId = operation, lifetimeMs = (int)(expires - now) };
        }
        internal Dictionary<string, object> Cancellation()
        {
            return new Dictionary<string, object> { { "ticket_id", Id }, { "operation_id", OperationId } };
        }
    }

    internal sealed class HelperTarget
    {
        internal string Id;
        internal string Name;
        internal string State;
        internal string[] Models;
        internal string DisplayName { get { return VisibleName(Name); } }
        internal string Review { get { return DisplayName + "\r\n" + Id + "\r\nCurrent state: " + State + "\r\nCurrent models: " + (Models.Length == 0 ? "(none)" : String.Join(", ", Models)); } }
        internal static string VisibleName(string value)
        {
            Json.Require(value != null && value.Length > 0 && value.Length <= 80, "HELPER_TARGET_REJECTED");
            StringBuilder output = new StringBuilder("\"");
            for (int i = 0; i < value.Length; i++)
            {
                char item = value[i];
                if (Char.IsHighSurrogate(item) && i + 1 < value.Length && Char.IsLowSurrogate(value[i + 1]))
                {
                    UnicodeCategory pairCategory = CharUnicodeInfo.GetUnicodeCategory(value, i);
                    char low = value[++i];
                    if (pairCategory == UnicodeCategory.Format) output.Append("\\u" + ((int)item).ToString("x4", CultureInfo.InvariantCulture)).Append("\\u" + ((int)low).ToString("x4", CultureInfo.InvariantCulture));
                    else output.Append(item).Append(low);
                    continue;
                }
                UnicodeCategory category = Char.GetUnicodeCategory(item);
                if (Char.IsSurrogate(item) || category == UnicodeCategory.Control || category == UnicodeCategory.Format || category == UnicodeCategory.LineSeparator || category == UnicodeCategory.ParagraphSeparator)
                    output.Append("\\u" + ((int)item).ToString("x4", CultureInfo.InvariantCulture));
                else if (item == '\\' || item == '"') output.Append('\\').Append(item);
                else output.Append(item);
            }
            return output.Append('"').ToString();
        }
    }

    internal static class HelperResponses
    {
        internal static Dictionary<string, object> Success(string raw, string requestId)
        {
            Json.Require(raw != null, "HELPER_PIPE_CLOSED");
            Dictionary<string, object> response = Json.Object(raw);
            object success = null;
            Json.Require(Json.String(response, "id") == requestId && response.TryGetValue("ok", out success) && success is bool, "HELPER_RESPONSE_INVALID");
            if (!(bool)success)
            {
                // Never surface service-provided text or echo a request/payload.
                Json.ExactKeys(response, "id", "ok", "error", "sent", "timed_out", "partial", "http_status");
                throw new PolicyException("HELPER_OPERATION_REJECTED");
            }
            Json.ExactKeys(response, "id", "ok", "value");
            Dictionary<string, object> value = response["value"] as Dictionary<string, object>;
            Json.Require(value != null, "HELPER_RESPONSE_INVALID");
            return value;
        }

        internal static HelperTarget Snapshot(Dictionary<string, object> value, HelperIntent intent, Deployment deployment)
        {
            Json.ExactKeys(value, "qualification", "keys", "usage", "policy_epoch", "service_instance", "daily_gateway");
            Dictionary<string, object> daily = value["daily_gateway"] as Dictionary<string, object>;
            Json.Require(daily != null, "HELPER_SNAPSHOT_REJECTED");
            Json.ExactKeys(daily, "status", "reason", "medium_listener_created", "uac_required", "synthetic_protocol_available");
            Json.Require(Json.String(daily, "status") == "BLOCKED" && new[] { "DAILY_SERVICE_DEPLOYMENT_NOT_VERIFIED", "DAILY_NATIVE_RUNTIME_AUTHENTICATION_NOT_IMPLEMENTED" }.Contains(Json.String(daily, "reason")) && daily["medium_listener_created"] is bool && !(bool)daily["medium_listener_created"] && daily["uac_required"] is bool && !(bool)daily["uac_required"] && daily["synthetic_protocol_available"] is bool && (bool)daily["synthetic_protocol_available"], "HELPER_DAILY_STATUS_REJECTED");
            Json.Require(Json.Integer(value, "policy_epoch") == deployment.PolicyEpoch && HelperIntent.IsUuid(Json.String(value, "service_instance")), "HELPER_SNAPSHOT_REJECTED");
            Dictionary<string, object> qualification = value["qualification"] as Dictionary<string, object>;
            object[] keys = value["keys"] as object[];
            Json.Require(qualification != null && keys != null && keys.Length <= 2048, "HELPER_SNAPSHOT_REJECTED");
            string mode = Json.String(qualification, "mode");
            Json.Require(mode == (deployment.Qualified ? "REAL" : "SIMULATED"), "HELPER_SNAPSHOT_REJECTED");
            if (intent.ImportsSecret)
            {
                object allowed;
                string entry = deployment.Qualified ? "real_key_entry" : "synthetic_key_entry";
                Json.Require(qualification.TryGetValue(entry, out allowed) && allowed is bool && (bool)allowed && (!deployment.Qualified || deployment.RealImportEnabled), "HELPER_IMPORT_BLOCKED");
            }
            if (intent.Action == "ADD") return null;
            HelperTarget target = null;
            foreach (object raw in keys)
            {
                Dictionary<string, object> key = raw as Dictionary<string, object>;
                Json.Require(key != null, "HELPER_SNAPSHOT_REJECTED");
                if (Json.String(key, "key_id") != intent.CredentialId) continue;
                Json.Require(target == null && Json.String(key, "provider_id") == intent.Provider, "HELPER_TARGET_REJECTED");
                string name = Json.String(key, "name"), state = Json.String(key, "state");
                object[] scope = key["models"] as object[];
                Json.Require(name.Length > 0 && name.Length <= 80 && new[] { "ACTIVE", "DISABLED", "INVALID", "RATE_LIMITED", "EXPIRED", "ROTATING", "QUARANTINED" }.Contains(state) && scope != null && scope.Length <= 128 && scope.All(m => m is string && Regex.IsMatch((string)m, @"\A[A-Za-z0-9_.:-]{1,128}\z", RegexOptions.CultureInvariant)) && scope.Cast<string>().Distinct(StringComparer.Ordinal).Count() == scope.Length, "HELPER_TARGET_REJECTED");
                target = new HelperTarget { Id = intent.CredentialId, Name = name, State = state, Models = scope.Cast<string>().ToArray() };
            }
            Json.Require(target != null, "HELPER_TARGET_REJECTED");
            return target;
        }

        internal static void Completed(string action, Dictionary<string, object> value)
        {
            if (action == "ADD" || action == "ROTATE")
            {
                Json.ExactKeys(value, "stored", "key_id", "classification");
                Json.Require(value["stored"] is bool && (bool)value["stored"] && HelperIntent.IsCredentialId(Json.String(value, "key_id")) && new[] { "SYNTHETIC", "SECRET" }.Contains(Json.String(value, "classification")), "HELPER_RESULT_INVALID");
            }
            else
            {
                string field = action == "DELETE" ? "deleted" : "saved";
                Json.ExactKeys(value, field);
                Json.Require(value[field] is bool && (bool)value[field], "HELPER_RESULT_INVALID");
            }
        }
    }

    // The production implementation below always owns a direct authenticated
    // fixed pipe. The separate test executable supplies its bounded synthetic
    // transport; it is not compiled into the production Helper.
    internal interface IHelperRpcSession : IDisposable
    {
        bool MutationAttempted { get; }
        Dictionary<string, object> Call(string method, Dictionary<string, object> parameters, bool mutation);
        void CancelTicket(HelperTicket ticket);
        void Abort();
    }

    internal sealed class HelperRpcSession : IHelperRpcSession
    {
        private readonly Deployment deployment;
        private readonly NamedPipeClientStream pipe;
        private readonly ManualResetEvent stop = new ManualResetEvent(false);
        private readonly object ioLock = new object();
        private readonly Frames responses;
        private readonly string serverStart;
        private int disposed;
        public bool MutationAttempted { get; private set; }

        internal HelperRpcSession(Deployment deployment)
        {
            this.deployment = deployment;
            pipe = new NamedPipeClientStream(".", Fixed.PipeName, PipeDirection.InOut, PipeOptions.Asynchronous, TokenImpersonationLevel.Identification);
            try
            {
                pipe.Connect(Fixed.ConnectTimeoutMs);
                Identity.Server(pipe, deployment, null);
                serverStart = Identity.ServerStart(pipe);
                Identity.Server(pipe, deployment, serverStart);
                responses = new Frames(pipe, stop);
            }
            catch { pipe.Dispose(); stop.Dispose(); throw; }
        }

        public Dictionary<string, object> Call(string method, Dictionary<string, object> parameters, bool mutation)
        {
            Json.Require(new[] { "snapshot", "credential.prepare", "credential.save", "credential.state", "credential.delete", "credential.models", "credential.ticket.cancel" }.Contains(method), "HELPER_METHOD_DENIED");
            lock (ioLock)
            {
                Json.Require(disposed == 0 && !stop.WaitOne(0), "HELPER_SESSION_CLOSED");
                Identity.Server(pipe, deployment, serverStart);
                string id = Guid.NewGuid().ToString("D");
                Dictionary<string, object> request = new Dictionary<string, object> { { "id", id }, { "method", method }, { "params", parameters } };
                if (mutation) MutationAttempted = true;
                Write(request);
                string raw = responses.Read(Fixed.FrameTimeoutMs);
                Identity.Server(pipe, deployment, serverStart);
                return HelperResponses.Success(raw, id);
            }
        }

        private void Write(Dictionary<string, object> request)
        {
            // The CLR JSON/base64 strings cannot be reliably erased. Clear our
            // mutable wire buffer immediately after I/O, and retain no payload.
            byte[] bytes = Fixed.Utf8.GetBytes(Json.Encode(request) + "\n");
            try
            {
                Json.Require(bytes.Length <= Fixed.MaxFrameBytes + 1, "HELPER_FRAME_TOO_LARGE");
                IAsyncResult pending = pipe.BeginWrite(bytes, 0, bytes.Length, null, null);
                int ready;
                using (WaitHandle completed = pending.AsyncWaitHandle)
                {
                    ready = WaitHandle.WaitAny(new[] { completed, stop }, Fixed.WriteTimeoutMs);
                    if (ready != 0)
                    {
                        Abort();
                        if (completed.WaitOne(1000)) { try { pipe.EndWrite(pending); } catch { } }
                        throw new PolicyException("HELPER_WRITE_ABORTED");
                    }
                }
                pipe.EndWrite(pending);
                pipe.Flush();
            }
            finally { Array.Clear(bytes, 0, bytes.Length); }
        }

        public void CancelTicket(HelperTicket ticket)
        {
            if (ticket == null || disposed != 0) return;
            Dictionary<string, object> result = Call("credential.ticket.cancel", ticket.Cancellation(), false);
            Json.ExactKeys(result, "cancelled", "automatic_retry");
            Json.Require(result["cancelled"] is bool && (bool)result["cancelled"] && result["automatic_retry"] is bool && !(bool)result["automatic_retry"], "HELPER_CANCEL_REJECTED");
        }
        public void Abort()
        {
            if (Interlocked.Exchange(ref disposed, 1) != 0) return;
            stop.Set();
            try { Win32.CancelIoEx(pipe.SafePipeHandle, IntPtr.Zero); } catch { }
            try { pipe.Dispose(); } catch { }
        }
        public void Dispose()
        {
            Abort();
            // Call() holds this lock, so no pending frame waiter can observe a
            // disposed stop handle. Abort already wakes/cancels its bounded I/O.
            lock (ioLock) { responses.Dispose(); stop.Dispose(); }
        }
    }
}
