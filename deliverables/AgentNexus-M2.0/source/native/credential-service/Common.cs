// .NET Framework 4.x, C# 5. No package dependencies. Never log protocol payloads.
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.IO.Pipes;
using System.Linq;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;
using Microsoft.Win32;
using Microsoft.Win32.SafeHandles;

namespace AgentNexus.CredentialBoundary
{
    internal static class Fixed
    {
        internal const string ServiceName = "AgentNexusCredential";
        internal const string ServiceAccount = "NT SERVICE\\AgentNexusCredential";
        internal const string InstallRoot = @"C:\Program Files\AgentNexus";
        internal const string DataRoot = @"C:\ProgramData\AgentNexusCredential";
        internal const string QualificationDataRoot = DataRoot + @"\qualification";
        internal const string ServiceExe = InstallRoot + @"\AgentNexusCredential.exe";
        internal const string ClientExe = InstallRoot + @"\pipe-client.exe";
        internal const string HelperExe = InstallRoot + @"\trusted-credential-helper.exe";
        internal const string LauncherExe = InstallRoot + @"\credential-launcher.exe";
        internal const string NodeExe = InstallRoot + @"\node.exe";
        internal const string EngineJs = InstallRoot + @"\app\dist\src\agentnexus\credential-service\engine.js";
        internal const string ConfigFile = DataRoot + @"\service-config.json";
        internal const string ApplicationManifest = InstallRoot + @"\app-manifest.json";
        internal const string QualificationFile = DataRoot + @"\qualification.json";
        internal const string QualificationSignature = DataRoot + @"\qualification.p7s";
        internal const string RequestConsentsFile = DataRoot + @"\request-consents.json";
        internal const string RequestConsentsSignature = DataRoot + @"\request-consents.p7s";
        internal const string PipeName = "AgentNexus.Credential.v1";
        internal const string PipePath = @"\\.\pipe\" + PipeName;
        internal const string DailyPipeName = "AgentNexus.Daily.v1";
        internal const string DailyPipePath = @"\\.\pipe\" + DailyPipeName;
        // Deliberately excludes FILE_CREATE_PIPE_INSTANCE (0x4). GENERIC_WRITE
        // expands to that right on named pipes and is never an operator grant.
        internal const uint DailyClientAccess = 0x00120183;
        internal const int DailyLifetimeMs = 300000;
        internal const int MaxFrameBytes = 1048576;
        internal const int MaxConnections = 4;
        internal const int ConnectTimeoutMs = 5000;
        internal const int FrameTimeoutMs = 15000;
        internal const int IdleTimeoutMs = 30000;
        internal const int WriteTimeoutMs = 10000;
        internal static readonly UTF8Encoding Utf8 = new UTF8Encoding(false, true);
        internal static readonly string[] QualificationTests = {
            "service_account_isolation", "protected_install_acl", "pipe_dacl_remote_reject",
            "medium_integrity_rejection", "server_impersonation_rejection", "same_sid_dpapi_denial",
            "import_ticket_single_use", "confirmation_queue_disconnect", "crash_recovery_no_replay",
            "audit_no_plaintext", "negative_host_or_binary", "trusted_helper_entry_isolation",
            "helper_manifest_launch_binding", "helper_ticket_lifecycle", "helper_memory_clipboard_dump",
            "daily_native_runtime_origin", "daily_medium_pipe_boundary",
            "daily_runtime_process_token_isolation", "daily_runtime_lifecycle_revocation"
        };
    }

    internal sealed class PolicyException : Exception
    {
        internal readonly string Code;
        internal PolicyException(string code) : base(code) { Code = code; }
    }

    internal static class Json
    {
        private static JavaScriptSerializer Serializer()
        {
            return new JavaScriptSerializer { MaxJsonLength = Fixed.MaxFrameBytes, RecursionLimit = 48 };
        }
        internal static Dictionary<string, object> Object(string text)
        {
            try
            {
                new UniqueJson(text).Check();
                Dictionary<string, object> result = Serializer().DeserializeObject(text) as Dictionary<string, object>;
                Require(result != null, "JSON_OBJECT_REQUIRED");
                return result;
            }
            catch (PolicyException) { throw; }
            catch { throw new PolicyException("INVALID_JSON"); }
        }
        internal static string Encode(object value)
        {
            try { return Serializer().Serialize(value); }
            catch { throw new PolicyException("JSON_ENCODING_LIMIT"); }
        }
        internal static void Require(bool value, string code) { if (!value) throw new PolicyException(code); }
        internal static string String(Dictionary<string, object> value, string key)
        {
            object item;
            Require(value.TryGetValue(key, out item) && item is string, "CONFIG_FIELD_INVALID");
            return (string)item;
        }
        internal static int Integer(Dictionary<string, object> value, string key)
        {
            object item;
            Require(value.TryGetValue(key, out item) && item is int, "CONFIG_FIELD_INVALID");
            return (int)item;
        }
        internal static void ExactKeys(Dictionary<string, object> value, params string[] keys)
        {
            Require(value.Count == keys.Length && keys.All(value.ContainsKey), "UNEXPECTED_FIELDS");
        }
        internal static Dictionary<string, object> Request(string text)
        {
            Dictionary<string, object> request = Object(text);
            ExactKeys(request, "id", "method", "params");
            string id = String(request, "id"), method = String(request, "method");
            Require(id.Length > 0 && id.Length <= 128, "RPC_ID_INVALID");
            Require(Regex.IsMatch(method, "^[a-z][a-z0-9_.]{0,79}$", RegexOptions.CultureInvariant), "RPC_METHOD_INVALID");
            Require(method != "session.disconnect" && !method.StartsWith("native.", StringComparison.Ordinal) && !method.StartsWith("runtime.", StringComparison.Ordinal), "RESERVED_METHOD");
            Require(request["params"] is Dictionary<string, object>, "RPC_PARAMS_INVALID");
            return request;
        }
    }

    internal static class Digests
    {
        internal static string Bytes(byte[] value)
        {
            using (SHA256 sha = SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(value)).Replace("-", "").ToLowerInvariant();
        }
        internal static string Stream(Stream value)
        {
            using (SHA256 sha = SHA256.Create())
            {
                long old = value.Position;
                value.Position = 0;
                string hash = BitConverter.ToString(sha.ComputeHash(value)).Replace("-", "").ToLowerInvariant();
                value.Position = old;
                return hash;
            }
        }
        internal static bool IsHash(string value) { return Regex.IsMatch(value ?? "", "^[a-f0-9]{64}$", RegexOptions.CultureInvariant); }
        internal static string MachineId()
        {
            using (RegistryKey root = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64))
            using (RegistryKey key = root.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography", false))
            {
                string guid = key == null ? null : key.GetValue("MachineGuid") as string;
                Json.Require(!String.IsNullOrWhiteSpace(guid), "MACHINE_ID_UNAVAILABLE");
                return Bytes(Fixed.Utf8.GetBytes(guid.ToLowerInvariant()));
            }
        }
    }

    internal sealed class TokenFacts
    {
        internal string Sid;
        internal bool Elevated;
        internal int Integrity;
        internal bool AppContainer;
        internal int SessionId;
        internal string LogonId;
        internal static TokenFacts Read(IntPtr token)
        {
            TokenFacts facts = new TokenFacts();
            IntPtr buffer = Win32.TokenInfo(token, 1);
            try { facts.Sid = new SecurityIdentifier(Marshal.ReadIntPtr(buffer)).Value; }
            finally { Marshal.FreeHGlobal(buffer); }
            facts.Elevated = ReadNumber(token, 20) != 0;
            facts.AppContainer = ReadNumber(token, 29) != 0;
            facts.SessionId = ReadNumber(token, 12);
            buffer = Win32.TokenInfo(token, 10); // TOKEN_STATISTICS.AuthenticationId LUID.
            try { facts.LogonId = unchecked((uint)Marshal.ReadInt32(buffer, 12)).ToString("x8", CultureInfo.InvariantCulture) + unchecked((uint)Marshal.ReadInt32(buffer, 8)).ToString("x8", CultureInfo.InvariantCulture); }
            finally { Marshal.FreeHGlobal(buffer); }
            buffer = Win32.TokenInfo(token, 25);
            try
            {
                string label = new SecurityIdentifier(Marshal.ReadIntPtr(buffer)).Value;
                facts.Integrity = Int32.Parse(label.Substring(label.LastIndexOf('-') + 1), CultureInfo.InvariantCulture);
            }
            finally { Marshal.FreeHGlobal(buffer); }
            return facts;
        }
        private static int ReadNumber(IntPtr token, int kind)
        {
            IntPtr buffer = Win32.TokenInfo(token, kind);
            try { return Marshal.ReadInt32(buffer); }
            finally { Marshal.FreeHGlobal(buffer); }
        }
        internal static TokenFacts Current()
        {
            IntPtr token;
            Win32.Check(Win32.OpenProcessToken(Win32.GetCurrentProcess(), 8, out token), "TOKEN_QUERY_FAILED");
            try { return Read(token); } finally { Win32.CloseHandle(token); }
        }
        internal static void RequireOperator(TokenFacts facts, string expectedSid)
        {
            Json.Require(facts.Sid == expectedSid && facts.Elevated && facts.Integrity >= 0x3000 && !facts.AppContainer, "OPERATOR_TOKEN_REJECTED");
        }
        internal static void RequireDailyOperator(TokenFacts facts, string expectedSid)
        {
            Json.Require(facts.Sid == expectedSid && !facts.Elevated && facts.Integrity == 0x2000 && !facts.AppContainer && facts.SessionId > 0, "DAILY_OPERATOR_TOKEN_REJECTED");
        }
        internal static void RequireService(TokenFacts facts, string serviceSid)
        {
            Json.Require(facts.Sid == serviceSid && !facts.AppContainer && facts.SessionId == 0, "SERVICE_TOKEN_REJECTED");
        }
    }

    internal sealed class ProcessFacts : IDisposable
    {
        internal IntPtr Handle;
        internal uint Pid;
        internal string Path;
        internal string StartId;
        internal long Created;
        internal TokenFacts Token;
        internal static ProcessFacts Open(uint pid)
        {
            ProcessFacts result = new ProcessFacts();
            try
            {
                result.Pid = pid;
                result.Handle = Win32.OpenProcess(0x101000, false, pid); // QUERY_LIMITED_INFORMATION | SYNCHRONIZE
                Json.Require(result.Handle != IntPtr.Zero, "PEER_PROCESS_UNAVAILABLE");
                StringBuilder path = new StringBuilder(32768);
                int size = path.Capacity;
                Win32.Check(Win32.QueryFullProcessImageName(result.Handle, 0, path, ref size), "PEER_IMAGE_UNAVAILABLE");
                result.Path = System.IO.Path.GetFullPath(path.ToString());
                Win32.FILETIME created, exited, kernel, user;
                Win32.Check(Win32.GetProcessTimes(result.Handle, out created, out exited, out kernel, out user), "PEER_TIME_UNAVAILABLE");
                result.Created = ((long)created.High << 32) | created.Low;
                result.StartId = result.Created.ToString("x16", CultureInfo.InvariantCulture);
                IntPtr token;
                Win32.Check(Win32.OpenProcessToken(result.Handle, 8, out token), "PEER_TOKEN_UNAVAILABLE");
                try { result.Token = TokenFacts.Read(token); } finally { Win32.CloseHandle(token); }
                result.RequireAlive();
                return result;
            }
            catch { result.Dispose(); throw; }
        }
        internal void RequireAlive()
        {
            Json.Require(Win32.WaitForSingleObject(Handle, 0) == 0x102, "PEER_PROCESS_EXITED");
            Win32.FILETIME created, exited, kernel, user;
            Win32.Check(Win32.GetProcessTimes(Handle, out created, out exited, out kernel, out user), "PEER_TIME_UNAVAILABLE");
            Json.Require((((long)created.High << 32) | created.Low) == Created, "PEER_PROCESS_CHANGED");
        }
        public void Dispose() { if (Handle != IntPtr.Zero) { Win32.CloseHandle(Handle); Handle = IntPtr.Zero; } }
    }

    internal sealed class ServiceFacts
    {
        internal uint Pid;
        internal static ServiceFacts Read()
        {
            IntPtr scm = Win32.OpenSCManager(null, null, 1);
            Json.Require(scm != IntPtr.Zero, "SCM_UNAVAILABLE");
            IntPtr service = IntPtr.Zero, buffer = IntPtr.Zero;
            try
            {
                service = Win32.OpenService(scm, Fixed.ServiceName, 1 | 4); // QUERY_CONFIG | QUERY_STATUS
                Json.Require(service != IntPtr.Zero, "SERVICE_NOT_INSTALLED");
                int needed;
                Win32.QueryServiceConfig(service, IntPtr.Zero, 0, out needed);
                Json.Require(needed > 0 && needed <= 65536, "SERVICE_CONFIG_INVALID");
                buffer = Marshal.AllocHGlobal(needed);
                Win32.Check(Win32.QueryServiceConfig(service, buffer, needed, out needed), "SERVICE_CONFIG_UNAVAILABLE");
                Win32.QUERY_SERVICE_CONFIG config = (Win32.QUERY_SERVICE_CONFIG)Marshal.PtrToStructure(buffer, typeof(Win32.QUERY_SERVICE_CONFIG));
                string command = Marshal.PtrToStringUni(config.BinaryPath);
                string account = Marshal.PtrToStringUni(config.StartName);
                Json.Require(config.ServiceType == 0x10 && command == "\"" + Fixed.ServiceExe + "\"" && String.Equals(account, Fixed.ServiceAccount, StringComparison.OrdinalIgnoreCase), "SERVICE_REGISTRATION_REJECTED");
                Marshal.FreeHGlobal(buffer); buffer = IntPtr.Zero;
                Win32.SERVICE_STATUS_PROCESS status;
                Win32.Check(Win32.QueryServiceStatusEx(service, 0, out status, Marshal.SizeOf(typeof(Win32.SERVICE_STATUS_PROCESS)), out needed), "SERVICE_STATUS_UNAVAILABLE");
                Json.Require((status.CurrentState == 2 || status.CurrentState == 4) && status.ProcessId > 0, "SERVICE_NOT_RUNNING");
                // An independent virtual account plus an unrestricted service SID is required.
                buffer = Marshal.AllocHGlobal(4);
                Win32.Check(Win32.QueryServiceConfig2(service, 5, buffer, 4, out needed), "SERVICE_SID_MODE_UNAVAILABLE");
                Json.Require(Marshal.ReadInt32(buffer) == 1, "SERVICE_SID_MODE_REJECTED");
                return new ServiceFacts { Pid = status.ProcessId };
            }
            finally
            {
                if (buffer != IntPtr.Zero) Marshal.FreeHGlobal(buffer);
                if (service != IntPtr.Zero) Win32.CloseServiceHandle(service);
                Win32.CloseServiceHandle(scm);
            }
        }
    }

    internal sealed class Deployment : IDisposable
    {
        internal string ServiceSid;
        internal string OperatorSid;
        internal string EvidenceHash;
        internal string MachineId;
        internal int PolicyEpoch;
        internal string Mode;
        internal bool Qualified { get { return Mode == "QUALIFIED"; } }
        internal string QualificationTestApproval;
        internal DateTime ApprovalExpiresUtc;
        internal bool RealImportEnabled;
        internal bool LiveEnabled;
        internal string RealImportApproval;
        internal string LiveApproval;
        private Dictionary<string, object> config;
        private readonly List<FileStream> lockedFiles = new List<FileStream>();
        private static readonly string SystemSid = "S-1-5-18", AdminSid = "S-1-5-32-544";
        private static readonly string InstallerSid = "S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464";

        internal static Deployment Load()
        {
            Deployment result = new Deployment();
            try
            {
                result.ServiceSid = ((SecurityIdentifier)new NTAccount(Fixed.ServiceAccount).Translate(typeof(SecurityIdentifier))).Value;
                result.CheckPath(Fixed.InstallRoot, false, true);
                result.CheckPath(Fixed.DataRoot, true, true);
                byte[] configBytes = result.LockRead(Fixed.ConfigFile, true, 65536);
                result.config = Json.Object(Fixed.Utf8.GetString(configBytes));
                Json.Require(Json.Integer(result.config, "schema_version") == 1, "CONFIG_SCHEMA_REJECTED");
                result.OperatorSid = Json.String(result.config, "operator_sid");
                Json.Require(new SecurityIdentifier(result.OperatorSid).IsAccountSid(), "OPERATOR_SID_INVALID");
                result.PolicyEpoch = Json.Integer(result.config, "policy_epoch");
                Json.Require(result.PolicyEpoch > 0, "POLICY_EPOCH_INVALID");
                object live, importing = null;
                Json.Require(result.config.TryGetValue("live_enabled", out live) && live is bool && result.config.TryGetValue("real_import_enabled", out importing) && importing is bool, "REAL_OPERATION_POLICY_INVALID");
                result.LiveEnabled = (bool)live;
                result.RealImportEnabled = (bool)importing;
                result.RealImportApproval = Json.String(result.config, "real_import_approval_ref");
                result.LiveApproval = Json.String(result.config, "live_approval_ref");
                result.QualificationTestApproval = Json.String(result.config, "qualification_test_approval_ref");
                Json.Require(!result.RealImportEnabled || ValidApproval(result.RealImportApproval), "REAL_IMPORT_NOT_APPROVED");
                Json.Require(!result.LiveEnabled || (result.RealImportEnabled && ValidApproval(result.LiveApproval) && result.LiveApproval != result.RealImportApproval), "LIVE_NOT_SEPARATELY_APPROVED");
                result.CheckHash(Fixed.ServiceExe, "service_sha256");
                result.CheckHash(Fixed.ClientExe, "client_sha256");
                result.CheckHash(Fixed.HelperExe, "helper_sha256");
                result.CheckHash(Fixed.LauncherExe, "launcher_sha256");
                result.CheckHash(Fixed.NodeExe, "node_sha256");
                result.CheckHash(Fixed.EngineJs, "engine_sha256");
                result.CheckHash(Fixed.ApplicationManifest, "application_manifest_sha256");
                result.VerifyApplicationManifest();
                result.VerifyQualification();
                result.CheckDataTree(result.Qualified ? Fixed.DataRoot + @"\engine" : Fixed.QualificationDataRoot);
                result.CheckDataTree(Fixed.DataRoot + @"\temp");
                return result;
            }
            catch { result.Dispose(); throw; }
        }
        internal void CheckPath(string path, bool data, bool requireProtected)
        {
            string full = System.IO.Path.GetFullPath(path);
            string root = data ? Fixed.DataRoot : Fixed.InstallRoot;
            Json.Require(full.Equals(root, StringComparison.OrdinalIgnoreCase) || full.StartsWith(root + "\\", StringComparison.OrdinalIgnoreCase), "PATH_OUTSIDE_FIXED_ROOT");
            string cursor = full;
            while (!String.IsNullOrEmpty(cursor))
            {
                Json.Require(File.Exists(cursor) || Directory.Exists(cursor), "PROTECTED_PATH_MISSING");
                Json.Require((File.GetAttributes(cursor) & FileAttributes.ReparsePoint) == 0, "REPARSE_PATH_REJECTED");
                if (cursor.Equals(root, StringComparison.OrdinalIgnoreCase) || cursor.StartsWith(root + "\\", StringComparison.OrdinalIgnoreCase)) CheckAcl(cursor, data, requireProtected && cursor == full);
                else CheckAncestorAcl(cursor);
                string parent = System.IO.Path.GetDirectoryName(cursor);
                if (parent == cursor) break;
                cursor = parent;
            }
        }
        private void CheckAcl(string path, bool data, bool requireProtected)
        {
            FileSystemSecurity acl = Directory.Exists(path) ? (FileSystemSecurity)Directory.GetAccessControl(path, AccessControlSections.Access | AccessControlSections.Owner) : File.GetAccessControl(path, AccessControlSections.Access | AccessControlSections.Owner);
            HashSet<string> trusted = new HashSet<string>(new[] { SystemSid, AdminSid, InstallerSid }, StringComparer.Ordinal);
            // Only state subdirectories are service-writable. Signed plans/qualifications remain admin-only.
            bool sensitive = data && SensitiveStatePath(path);
            if (sensitive) trusted.Add(ServiceSid);
            string owner = ((SecurityIdentifier)acl.GetOwner(typeof(SecurityIdentifier))).Value;
            Json.Require(trusted.Contains(owner), "UNTRUSTED_PATH_OWNER");
            RawSecurityDescriptor raw = new RawSecurityDescriptor(acl.GetSecurityDescriptorBinaryForm(), 0);
            Json.Require(raw.DiscretionaryAcl != null, "NULL_DACL_REJECTED");
            Json.Require(!requireProtected || acl.AreAccessRulesProtected, "INHERITED_ROOT_DACL_REJECTED");
            const FileSystemRights writes = FileSystemRights.Write | FileSystemRights.Delete | FileSystemRights.DeleteSubdirectoriesAndFiles | FileSystemRights.ChangePermissions | FileSystemRights.TakeOwnership;
            foreach (FileSystemAccessRule rule in acl.GetAccessRules(true, true, typeof(SecurityIdentifier)))
            {
                if ((rule.PropagationFlags & PropagationFlags.InheritOnly) != 0) continue;
                if (sensitive && rule.AccessControlType == AccessControlType.Allow && ContainsSensitiveRead(rule.FileSystemRights))
                    Json.Require(trusted.Contains(((SecurityIdentifier)rule.IdentityReference).Value), "UNTRUSTED_SENSITIVE_READ_ACE");
                if (rule.AccessControlType == AccessControlType.Allow && (((long)rule.FileSystemRights & ((long)writes | 0x50000000L)) != 0))
                    Json.Require(trusted.Contains(((SecurityIdentifier)rule.IdentityReference).Value), "UNTRUSTED_WRITE_ACE");
            }
        }
        private static void CheckAncestorAcl(string path)
        {
            DirectorySecurity acl = Directory.GetAccessControl(path, AccessControlSections.Access | AccessControlSections.Owner);
            HashSet<string> trusted = new HashSet<string>(new[] { SystemSid, AdminSid, InstallerSid }, StringComparer.Ordinal);
            Json.Require(trusted.Contains(((SecurityIdentifier)acl.GetOwner(typeof(SecurityIdentifier))).Value), "UNTRUSTED_ANCESTOR_OWNER");
            RawSecurityDescriptor raw = new RawSecurityDescriptor(acl.GetSecurityDescriptorBinaryForm(), 0);
            Json.Require(raw.DiscretionaryAcl != null, "NULL_ANCESTOR_DACL_REJECTED");
            // A broad CREATE_CHILD permission on ProgramData is harmless once the protected root exists;
            // DELETE_CHILD, DELETE, WRITE_DAC/OWNER or GENERIC_ALL could replace that root.
            foreach (FileSystemAccessRule rule in acl.GetAccessRules(true, true, typeof(SecurityIdentifier)))
                if ((rule.PropagationFlags & PropagationFlags.InheritOnly) == 0 && rule.AccessControlType == AccessControlType.Allow && (((long)rule.FileSystemRights & 0x100D0040L) != 0))
                    Json.Require(trusted.Contains(((SecurityIdentifier)rule.IdentityReference).Value), "UNTRUSTED_ANCESTOR_REPLACEMENT_ACE");
        }
        private static bool Within(string path, string root)
        {
            return path.Equals(root, StringComparison.OrdinalIgnoreCase) || path.StartsWith(root + "\\", StringComparison.OrdinalIgnoreCase);
        }
        private static bool SensitiveStatePath(string path)
        {
            return Within(path, Fixed.DataRoot + @"\engine") || Within(path, Fixed.DataRoot + @"\temp") || Within(path, Fixed.QualificationDataRoot);
        }
        internal static bool ContainsSensitiveRead(FileSystemRights rights)
        {
            const long readMask = 0x90020089L; // GENERIC_READ/ALL, READ_CONTROL, READ_DATA, READ_EA, READ_ATTRIBUTES.
            return ((long)rights & readMask) != 0;
        }
        private void CheckDataTree(string root)
        {
            CheckPath(root, true, false);
            Stack<string> directories = new Stack<string>();
            directories.Push(root);
            int count = 0;
            while (directories.Count > 0)
                foreach (string entry in Directory.GetFileSystemEntries(directories.Pop()))
                {
                    Json.Require(++count <= 20000, "STATE_TREE_TOO_LARGE");
                    CheckPath(entry, true, false);
                    if (Directory.Exists(entry)) directories.Push(entry);
                }
        }
        private static bool ValidApproval(string value)
        {
            return Regex.IsMatch(value ?? "", "^APPROVED-[A-Za-z0-9][A-Za-z0-9_.:-]{7,159}$", RegexOptions.CultureInvariant);
        }
        // Called only after CMS verification in production. Fixtures exercise the state policy, not OS qualification.
        internal static void RequireModePolicy(string mode, string decision, bool realImport, bool live, string realRef, string liveRef, string qualificationRef)
        {
            Json.Require(mode == "QUALIFICATION_ONLY" || mode == "QUALIFIED", "QUALIFICATION_MODE_INVALID");
            if (mode == "QUALIFICATION_ONLY")
            {
                Json.Require((decision == "NOT_RUN" || decision == "BLOCKED") && ValidApproval(qualificationRef), "QUALIFICATION_TEST_APPROVAL_REQUIRED");
                Json.Require(!realImport && !live && realRef == "" && liveRef == "", "QUALIFICATION_REAL_OPERATIONS_DENIED");
            }
            else Json.Require(decision == "PASS", "QUALIFICATION_NOT_PASSED");
        }
        internal static void RequireTestResult(string mode, string observed)
        {
            Json.Require(mode == "QUALIFIED" ? observed == "PASS" : mode == "QUALIFICATION_ONLY" && (observed == "NOT_RUN" || observed == "BLOCKED"), "QUALIFICATION_TEST_RESULT_REJECTED");
        }
        internal void ValidateRequestForMode(Dictionary<string, object> request)
        {
            if (Mode != "QUALIFICATION_ONLY" || (string)request["method"] != "credential.save") return;
            Dictionary<string, object> parameters = (Dictionary<string, object>)request["params"];
            string encoded = Json.String(parameters, "secret_b64");
            Json.Require(encoded.Length <= 5500, "QUALIFICATION_SYNTHETIC_KEY_REQUIRED");
            byte[] clear = null;
            try
            {
                try { clear = Convert.FromBase64String(encoded); } catch { throw new PolicyException("QUALIFICATION_SYNTHETIC_KEY_REQUIRED"); }
                byte[] prefix = Encoding.ASCII.GetBytes("synthetic-test-");
                Json.Require(clear.Length >= 24 && clear.Length <= 4096 && clear.Take(prefix.Length).SequenceEqual(prefix), "QUALIFICATION_SYNTHETIC_KEY_REQUIRED");
            }
            finally { if (clear != null) Array.Clear(clear, 0, clear.Length); }
        }
        private HashSet<string> CheckTree(string root)
        {
            CheckPath(root, false, false);
            // No recursive enumeration follows a junction: inspect each directory before descending.
            Stack<string> directories = new Stack<string>();
            directories.Push(root);
            int count = 0;
            HashSet<string> files = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            while (directories.Count > 0)
            {
                string directory = directories.Pop();
                foreach (string entry in Directory.GetFileSystemEntries(directory))
                {
                    Json.Require(++count <= 20000, "INSTALL_TREE_TOO_LARGE");
                    CheckPath(entry, false, false);
                    if (Directory.Exists(entry)) directories.Push(entry);
                    else files.Add(System.IO.Path.GetFullPath(entry));
                }
            }
            return files;
        }
        private void VerifyApplicationManifest()
        {
            Dictionary<string, object> manifest = Json.Object(Fixed.Utf8.GetString(LockRead(Fixed.ApplicationManifest, false, 1048576)));
            Json.Require(Json.String(manifest, "schema") == "agentnexus.application-manifest.v1", "APPLICATION_MANIFEST_SCHEMA_REJECTED");
            object entries;
            Json.Require(manifest.TryGetValue("files", out entries) && entries is object[], "APPLICATION_MANIFEST_FILES_MISSING");
            HashSet<string> actual = CheckTree(Fixed.InstallRoot + @"\app");
            foreach (object entry in (object[])entries)
            {
                Dictionary<string, object> file = entry as Dictionary<string, object>;
                Json.Require(file != null, "APPLICATION_MANIFEST_ENTRY_INVALID");
                string relative = Json.String(file, "path"), hash = Json.String(file, "sha256");
                Json.Require(relative.StartsWith("app/", StringComparison.Ordinal) && relative.IndexOf('\\') < 0 && relative.IndexOf(':') < 0 && !relative.Split('/').Any(p => p == ".." || p == "." || String.IsNullOrWhiteSpace(p) || p.EndsWith(".", StringComparison.Ordinal) || p.EndsWith(" ", StringComparison.Ordinal)) && Digests.IsHash(hash), "APPLICATION_MANIFEST_PATH_REJECTED");
                string path = System.IO.Path.GetFullPath(Fixed.InstallRoot + "\\" + relative.Replace('/', '\\'));
                Json.Require(Within(path, Fixed.InstallRoot + @"\app") && actual.Remove(path), "APPLICATION_MANIFEST_FILE_REJECTED");
                CheckPath(path, false, false);
                FileStream stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
                lockedFiles.Add(stream);
                Json.Require(Digests.Stream(stream) == hash, "APPLICATION_MANIFEST_HASH_MISMATCH");
            }
            Json.Require(actual.Count == 0, "APPLICATION_MANIFEST_INCOMPLETE");
        }
        private byte[] LockRead(string path, bool data, int maximum)
        {
            CheckPath(path, data, false);
            FileStream stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
            lockedFiles.Add(stream); // Deny file mutation/replacement for the lifetime of the service/client.
            Json.Require(stream.Length > 0 && stream.Length <= maximum, "PROTECTED_FILE_SIZE_INVALID");
            byte[] bytes = new byte[(int)stream.Length];
            int done = 0;
            while (done < bytes.Length)
            {
                int count = stream.Read(bytes, done, bytes.Length - done);
                Json.Require(count != 0, "PROTECTED_FILE_TRUNCATED");
                done += count;
            }
            return bytes;
        }
        private void CheckHash(string path, string field)
        {
            CheckPath(path, false, false);
            string expected = Json.String(config, field);
            Json.Require(Digests.IsHash(expected), "MANIFEST_HASH_INVALID");
            FileStream stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
            lockedFiles.Add(stream);
            Json.Require(Digests.Stream(stream) == expected, "MANIFEST_HASH_MISMATCH");
        }
        private void VerifyQualification()
        {
            byte[] evidence = LockRead(Fixed.QualificationFile, true, 262144);
            byte[] signature = LockRead(Fixed.QualificationSignature, true, 131072);
            VerifyDetached(evidence, signature);
            Dictionary<string, object> document = Json.Object(Fixed.Utf8.GetString(evidence));
            MachineId = Digests.MachineId();
            Json.Require(Json.String(document, "schema") == "agentnexus.windows-qualification.v1" && Json.String(document, "scope") == "WINDOWS_BOUNDARY_ONLY", "QUALIFICATION_SCHEMA_REJECTED");
            Json.Require(Json.String(document, "machine_id") == MachineId && Json.String(document, "service_sid") == ServiceSid && Json.Integer(document, "policy_epoch") == PolicyEpoch, "QUALIFICATION_HOST_MISMATCH");
            DateTime issued, expires = default(DateTime);
            Json.Require(DateTime.TryParse(Json.String(document, "issued_at_utc"), CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out issued) && DateTime.TryParse(Json.String(document, "expires_at_utc"), CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out expires), "QUALIFICATION_TIME_INVALID");
            Json.Require(issued <= DateTime.UtcNow && expires > DateTime.UtcNow && expires > issued && expires - issued <= TimeSpan.FromDays(7), "QUALIFICATION_EXPIRED");
            ApprovalExpiresUtc = expires;
            foreach (string field in new[] { "service_sha256", "client_sha256", "helper_sha256", "launcher_sha256", "node_sha256", "engine_sha256", "application_manifest_sha256" })
                Json.Require(Json.String(document, field) == Json.String(config, field), "QUALIFICATION_BINARY_MISMATCH");
            foreach (string field in new[] { "live_enabled", "real_import_enabled", "live_approval_ref", "real_import_approval_ref", "qualification_test_approval_ref" })
            {
                object value;
                Json.Require(document.TryGetValue(field, out value) && Object.Equals(value, config[field]), "QUALIFICATION_APPROVAL_MISMATCH");
            }
            Mode = Json.String(document, "status"); // Only the signed plan chooses a mode; no CLI/environment/config switch.
            RequireModePolicy(Mode, Json.String(document, "decision"), RealImportEnabled, LiveEnabled, RealImportApproval, LiveApproval, QualificationTestApproval);
            object testsValue;
            Json.Require(document.TryGetValue("tests", out testsValue) && testsValue is object[], "QUALIFICATION_TESTS_MISSING");
            RequireQualificationNames(((object[])testsValue).Select(delegate(object item) {
                Dictionary<string, object> test = item as Dictionary<string, object>;
                Json.Require(test != null, "QUALIFICATION_TEST_REJECTED");
                return Json.String(test, "name");
            }));
            foreach (object item in (object[])testsValue)
            {
                Dictionary<string, object> test = item as Dictionary<string, object>;
                Json.Require(test != null, "QUALIFICATION_TEST_REJECTED");
                string observed = Json.String(test, "observed_result");
                RequireTestResult(Mode, observed);
                if (!Qualified)
                {
                    continue; // An approved plan is not evidence. Never read/generate hypothetical PASS artifacts.
                }
                string file = Json.String(test, "evidence_file"), hash = Json.String(test, "evidence_sha256");
                Json.Require(Regex.IsMatch(file, "^[a-z0-9][a-z0-9_.-]{0,119}\\.json$", RegexOptions.CultureInvariant) && Digests.IsHash(hash), "QUALIFICATION_ARTIFACT_INVALID");
                byte[] artifact = LockRead(Fixed.DataRoot + @"\qualification-evidence\" + file, true, 1048576);
                Json.Require(Digests.Bytes(artifact) == hash, "QUALIFICATION_ARTIFACT_MISMATCH");
            }
            if (config.ContainsKey("signing_mode") && Json.String(config, "signing_mode") == SigningContract.Local)
                VerifyLocalInstalled(document, evidence, signature);
            EvidenceHash = Digests.Bytes(evidence);
        }
        internal static void RequireQualificationNames(IEnumerable<string> names)
        {
            HashSet<string> required = new HashSet<string>(Fixed.QualificationTests, StringComparer.Ordinal);
            foreach (string name in names) Json.Require(required.Remove(name), "QUALIFICATION_TEST_REJECTED");
            Json.Require(required.Count == 0, "QUALIFICATION_TESTS_INCOMPLETE");
        }
        private void VerifyDetached(byte[] evidence, byte[] signature)
        {
            string pin = Json.String(config, "authority_certificate_sha256");
            Json.Require(Digests.IsHash(pin), "QUALIFICATION_AUTHORITY_UNCONFIGURED");
            if (config.ContainsKey("signing_mode"))
            {
                string signingMode = Json.String(config, "signing_mode");
                Json.Require(signingMode == SigningContract.Local || signingMode == SigningContract.Production, "SIGNING_MODE_REJECTED");
                if (signingMode == SigningContract.Local)
                {
                    SigningContract.NoReal(config);
                    System.Security.Cryptography.X509Certificates.X509Certificate2 localCertificate = SigningContract.Cms(evidence, signature, pin, Json.String(config, "signer_id"), signingMode, DateTime.UtcNow);
                    SigningContract.CertificateWindow(localCertificate, SigningContract.Read(evidence));
                    return;
                }
            }
            DetachedDer.Require(signature);
            SignedCms signed = new SignedCms(new ContentInfo(evidence), true);
            try { signed.Decode(signature); signed.CheckSignature(true); }
            catch { throw new PolicyException("QUALIFICATION_SIGNATURE_INVALID"); }
            Json.Require(signed.Detached && signed.SignerInfos.Count == 1 && signed.SignerInfos[0].Certificate != null && signed.SignerInfos[0].CounterSignerInfos.Count == 0, "QUALIFICATION_SIGNER_INVALID");
            string digest = signed.SignerInfos[0].DigestAlgorithm.Value;
            Json.Require(digest == "2.16.840.1.101.3.4.2.1" || digest == "2.16.840.1.101.3.4.2.2" || digest == "2.16.840.1.101.3.4.2.3", "QUALIFICATION_WEAK_DIGEST_REJECTED");
            System.Security.Cryptography.X509Certificates.X509Certificate2 certificate = signed.SignerInfos[0].Certificate;
            Json.Require(Digests.Bytes(certificate.RawData) == pin && certificate.NotBefore.ToUniversalTime() <= DateTime.UtcNow && certificate.NotAfter.ToUniversalTime() > DateTime.UtcNow, "QUALIFICATION_SIGNER_REJECTED");
            // Applies even to legacy configs without a signing_mode field.
            // A local-purpose key can never enter QUALIFIED through the old verifier.
            SigningContract.Certificate(certificate, pin, certificate.Subject, SigningContract.Production, DateTime.UtcNow);
        }
        private void VerifyLocalInstalled(Dictionary<string, object> plan, byte[] evidence, byte[] signature)
        {
            SigningContract.Plan(plan, MachineId, OperatorSid, DateTime.UtcNow, true);
            Json.Require(Mode == "QUALIFICATION_ONLY" && !Qualified && PolicyEpoch == SigningContract.LocalEpoch, "LOCAL_CANNOT_BECOME_PRODUCTION");
            SigningContract.NoReal(config);
            Json.Require(Json.String(plan, "signer_certificate_der_sha256") == Json.String(config, "authority_certificate_sha256") && Json.String(plan, "signer_id") == Json.String(config, "signer_id"), "LOCAL_RUNTIME_SIGNER_BINDING");
            byte[] manifestBytes = LockRead(Fixed.DataRoot + @"\installation-manifest.json", true, 1048576);
            byte[] policyBytes = LockRead(Fixed.DataRoot + @"\signature-policy.json", true, 16384);
            byte[] changesBytes = LockRead(Fixed.DataRoot + @"\system-changes.json", true, 16384);
            Json.Require(Json.String(plan, "installation_manifest_sha256") == Digests.Bytes(manifestBytes) && Json.String(plan, "service_config_sha256") == Digests.Bytes(LockRead(Fixed.ConfigFile, true, 65536)) && Json.String(plan, "signature_policy_sha256") == Digests.Bytes(policyBytes) && Json.String(plan, "system_changes_sha256") == Digests.Bytes(changesBytes), "LOCAL_RUNTIME_METADATA_HASH");
            Json.Require(SigningContract.Canonical(SigningContract.Read(policyBytes)) == SigningContract.Canonical(SigningContract.Policy()) && SigningContract.Canonical(SigningContract.Read(changesBytes)) == SigningContract.Canonical(SigningContract.SystemChanges()), "LOCAL_RUNTIME_SCOPE");
            byte[] approvalBytes = LockRead(Fixed.DataRoot + @"\deployment-approval.json", true, 65536);
            byte[] approvalSignature = LockRead(Fixed.DataRoot + @"\deployment-approval.p7s", true, 131072);
            SigningContract.Cms(approvalBytes, approvalSignature, Json.String(config, "authority_certificate_sha256"), Json.String(config, "signer_id"), SigningContract.Local, DateTime.UtcNow);
            SigningContract.Approval(SigningContract.Read(approvalBytes), plan, evidence, signature, DateTime.UtcNow, true);
            Dictionary<string, object> manifest = SigningContract.Read(manifestBytes);
            Json.Require(Json.String(manifest, "schema") == "agentnexus.q3.installation-manifest.v1" && Json.String(manifest, "scope") == "QUALIFICATION_ONLY" && !SigningContract.Bool(manifest, "production_qualified"), "LOCAL_RUNTIME_MANIFEST");
            object[] files = manifest["files"] as object[]; Json.Require(files != null, "LOCAL_RUNTIME_FILES");
            HashSet<string> names = new HashSet<string>(StringComparer.OrdinalIgnoreCase); int total = 0;
            foreach (Dictionary<string, object> file in files.Cast<Dictionary<string, object>>())
            {
                string relative = Json.String(file, "path");
                Json.Require(Regex.IsMatch(relative, @"\A[A-Za-z0-9_. /-]+\z") && !relative.Split('/').Any(x => x == "" || x == "." || x == ".." || x.EndsWith(".") || x.EndsWith(" ")) && names.Add(relative), "LOCAL_RUNTIME_PATH");
                string path = Fixed.InstallRoot + "\\" + relative.Replace('/', '\\');
                CheckPath(path, false, false);
                FileStream stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read); lockedFiles.Add(stream);
                Json.Require(stream.Length == Json.Integer(file, "bytes") && Digests.Stream(stream) == Json.String(file, "sha256"), "LOCAL_RUNTIME_PAYLOAD_HASH");
                total = checked(total + (int)stream.Length);
            }
            Json.Require(files.Length == Json.Integer(plan, "payload_files") && total == Json.Integer(plan, "payload_bytes"), "LOCAL_RUNTIME_TOTALS");
            HashSet<string> actual = CheckTree(Fixed.InstallRoot);
            Json.Require(actual.SetEquals(names.Select(n => Fixed.InstallRoot + "\\" + n.Replace('/', '\\'))), "LOCAL_RUNTIME_FILE_SET");
            Dictionary<string, object> receipt = SigningContract.Read(LockRead(Fixed.DataRoot + @"\installation-receipt.json", true, 16384));
            Json.Require(Json.String(receipt, "deployment_id") == Json.String(plan, "deployment_id") && Json.Integer(receipt, "policy_epoch") == SigningContract.LocalEpoch && Json.String(receipt, "approval_sha256") == Digests.Bytes(approvalBytes), "LOCAL_RUNTIME_CONSUMPTION_RECEIPT");
        }
        internal Dictionary<string, object> VerifiedConsents()
        {
            if (!Qualified) return new Dictionary<string, object> { { "consents", new object[0] } };
            bool file = File.Exists(Fixed.RequestConsentsFile), signature = File.Exists(Fixed.RequestConsentsSignature);
            Json.Require(!Directory.Exists(Fixed.RequestConsentsFile) && !Directory.Exists(Fixed.RequestConsentsSignature), "CONSENT_PATH_REJECTED");
            if (!file && !signature) return new Dictionary<string, object> { { "consents", new object[0] } };
            Json.Require(file && signature, "CONSENT_SIGNATURE_REQUIRED");
            byte[] bytes = LockRead(Fixed.RequestConsentsFile, true, Fixed.MaxFrameBytes);
            VerifyDetached(bytes, LockRead(Fixed.RequestConsentsSignature, true, 131072));
            Dictionary<string, object> document = Json.Object(Fixed.Utf8.GetString(bytes));
            Json.Require(Json.String(document, "schema") == "agentnexus.request-consents.v1" && Json.String(document, "machine_id") == MachineId && Json.String(document, "service_sid") == ServiceSid && Json.Integer(document, "policy_epoch") == PolicyEpoch, "CONSENT_HOST_MISMATCH");
            Json.Require(ValidApproval(Json.String(document, "external_user_review_ref")), "CONSENT_USER_REVIEW_REQUIRED");
            DateTime issued, expires = default(DateTime);
            Json.Require(DateTime.TryParse(Json.String(document, "issued_at_utc"), CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out issued) && DateTime.TryParse(Json.String(document, "expires_at_utc"), CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out expires), "CONSENT_TIME_INVALID");
            Json.Require(issued <= DateTime.UtcNow && expires > DateTime.UtcNow && expires > issued && expires - issued <= TimeSpan.FromDays(7), "CONSENT_EXPIRED");
            object entries;
            Json.Require(document.TryGetValue("consents", out entries) && entries is object[] && ((object[])entries).Length <= 64, "CONSENT_ENTRIES_INVALID");
            foreach (object item in (object[])entries)
            {
                Dictionary<string, object> entry = item as Dictionary<string, object>;
                Json.Require(entry != null, "CONSENT_ENTRY_INVALID");
                Json.ExactKeys(entry, "input", "decisions", "classification", "approval_ref");
                string classification = Json.String(entry, "classification");
                Json.Require((classification == "PUBLIC" || classification == "SYNTHETIC") && entry["input"] is Dictionary<string, object> && entry["decisions"] is Dictionary<string, object> && ValidApproval(Json.String(entry, "approval_ref")), "CONSENT_SCOPE_REJECTED");
            }
            return new Dictionary<string, object> {
                { "consents", entries }, { "issued_at_utc", Json.String(document, "issued_at_utc") },
                { "expires_at_utc", Json.String(document, "expires_at_utc") },
                { "external_user_review_ref", Json.String(document, "external_user_review_ref") }
            };
        }
        internal Dictionary<string, object> Attestation()
        {
            RequireCurrentApproval();
            return new Dictionary<string, object> { { "mode", Mode }, { "qualified", Qualified }, { "service_sid", ServiceSid }, { "evidence_sha256", EvidenceHash }, { "machine_id", MachineId }, { "policy_epoch", PolicyEpoch }, { "expires_at_utc", ApprovalExpiresUtc.ToUniversalTime().ToString("o", CultureInfo.InvariantCulture) }, { "qualification_test_approval_ref", QualificationTestApproval }, { "real_import_enabled", RealImportEnabled }, { "live_enabled", LiveEnabled }, { "real_import_approval_ref", RealImportApproval }, { "live_approval_ref", LiveApproval } };
        }
        internal void RequireCurrentApproval() { Json.Require(DateTime.UtcNow < ApprovalExpiresUtc, "QUALIFICATION_EXPIRED"); }
        public void Dispose() { foreach (FileStream stream in lockedFiles) stream.Dispose(); lockedFiles.Clear(); }
    }

    internal static class Identity
    {
        internal static Dictionary<string, object> DailyClient(NamedPipeServerStream pipe, Deployment deployment)
        {
            uint pid, session;
            Win32.Check(Win32.GetNamedPipeClientProcessId(pipe.SafePipeHandle, out pid), "PIPE_CLIENT_PID_UNAVAILABLE");
            Win32.Check(Win32.GetNamedPipeClientSessionId(pipe.SafePipeHandle, out session), "PIPE_CLIENT_SESSION_UNAVAILABLE");
            TokenFacts origin;
            Win32.Check(Win32.ImpersonateNamedPipeClient(pipe.SafePipeHandle), "PIPE_IMPERSONATION_FAILED");
            try
            {
                IntPtr token;
                Win32.Check(Win32.OpenThreadToken(Win32.GetCurrentThread(), 8, true, out token), "PIPE_TOKEN_UNAVAILABLE");
                try { origin = TokenFacts.Read(token); } finally { Win32.CloseHandle(token); }
            }
            finally { if (!Win32.RevertToSelf()) Environment.FailFast("CREDENTIAL_REVERT_FAILED"); }
            TokenFacts.RequireDailyOperator(origin, deployment.OperatorSid);
            Json.Require((uint)origin.SessionId == session, "PIPE_TOKEN_SESSION_MISMATCH");
            // The public Medium endpoint authenticates the message token itself.
            // An independent service SID is not assumed to have OpenProcess or
            // TOKEN_QUERY rights on an untrusted operator process. The kernel
            // connection PID is continuity data, never a Runtime entitlement;
            // Runtime process/token/liveness comes from the retained native child.
            return new Dictionary<string, object> { { "operator_sid", origin.Sid }, { "session_id", origin.SessionId },
                { "process_id", (long)pid }, { "logon_id", origin.LogonId } };
        }
        internal static bool SameDailyOrigin(Dictionary<string, object> first, Dictionary<string, object> current)
        {
            return new[] { "operator_sid", "session_id", "logon_id", "process_id" }.All(key => first.ContainsKey(key) && current.ContainsKey(key) && Object.Equals(first[key], current[key]));
        }
        internal static Dictionary<string, object> Client(NamedPipeServerStream pipe, Deployment deployment)
        {
            uint pid, session;
            Win32.Check(Win32.GetNamedPipeClientProcessId(pipe.SafePipeHandle, out pid), "PIPE_CLIENT_PID_UNAVAILABLE");
            Win32.Check(Win32.GetNamedPipeClientSessionId(pipe.SafePipeHandle, out session), "PIPE_CLIENT_SESSION_UNAVAILABLE");
            TokenFacts impersonated;
            Win32.Check(Win32.ImpersonateNamedPipeClient(pipe.SafePipeHandle), "PIPE_IMPERSONATION_FAILED");
            try
            {
                IntPtr token;
                Win32.Check(Win32.OpenThreadToken(Win32.GetCurrentThread(), 8, true, out token), "PIPE_TOKEN_UNAVAILABLE");
                try { impersonated = TokenFacts.Read(token); } finally { Win32.CloseHandle(token); }
            }
            finally { if (!Win32.RevertToSelf()) Environment.FailFast("CREDENTIAL_REVERT_FAILED"); }
            TokenFacts.RequireOperator(impersonated, deployment.OperatorSid);
            using (ProcessFacts process = ProcessFacts.Open(pid))
            {
                TokenFacts.RequireOperator(process.Token, deployment.OperatorSid);
                Json.Require(process.Token.Sid == impersonated.Sid && process.Token.Integrity == impersonated.Integrity && process.Token.SessionId == impersonated.SessionId && (uint)process.Token.SessionId == session, "PIPE_TOKEN_PROCESS_MISMATCH");
                // Q2 management has no generic stdio relay. Only the installed,
                // manifest-locked, elevated credential form may use this channel.
                // This check supplements token/channel checks; it does not claim
                // that an image path or digest prevents process injection.
                Json.Require(String.Equals(process.Path, Fixed.HelperExe, StringComparison.OrdinalIgnoreCase), "CLIENT_IMAGE_REJECTED");
                process.RequireAlive();
                return new Dictionary<string, object> {
                    { "sid", impersonated.Sid }, { "elevated", true }, { "integrity", "high" },
                    { "process_id", (long)pid }, { "start_id", process.StartId }, { "session_id", impersonated.SessionId },
                    { "service_sid", deployment.ServiceSid }, { "authenticated", true }, { "kind", "CREDENTIAL_HELPER" }
                };
            }
        }
        internal static void Server(NamedPipeClientStream pipe, Deployment deployment, string expectedStart)
        {
            deployment.RequireCurrentApproval();
            DailyServer(pipe, deployment.ServiceSid, expectedStart);
        }
        // Medium callers cannot read the protected credential/config tree. SCM
        // registration + the actual service process token authenticate their
        // server without copying protected deployment material into the client.
        internal static string DailyServiceSid()
        {
            return ((SecurityIdentifier)new NTAccount(Fixed.ServiceAccount).Translate(typeof(SecurityIdentifier))).Value;
        }
        internal static void DailyServer(NamedPipeClientStream pipe, string serviceSid, string expectedStart)
        {
            uint pid, session;
            Win32.Check(Win32.GetNamedPipeServerProcessId(pipe.SafePipeHandle, out pid), "PIPE_SERVER_PID_UNAVAILABLE");
            Win32.Check(Win32.GetNamedPipeServerSessionId(pipe.SafePipeHandle, out session), "PIPE_SERVER_SESSION_UNAVAILABLE");
            ServiceFacts registered = ServiceFacts.Read();
            Json.Require(pid == registered.Pid && session == 0, "PIPE_SERVER_SCM_MISMATCH");
            using (ProcessFacts process = ProcessFacts.Open(pid))
            {
                TokenFacts.RequireService(process.Token, serviceSid);
                Json.Require(String.Equals(process.Path, Fixed.ServiceExe, StringComparison.OrdinalIgnoreCase), "SERVER_IMAGE_REJECTED");
                Json.Require(expectedStart == null || process.StartId == expectedStart, "SERVER_PROCESS_CHANGED");
                process.RequireAlive();
            }
        }
        internal static void RequireDailyParent(Deployment deployment)
        {
            using (ProcessFacts own = ProcessFacts.Open((uint)Process.GetCurrentProcess().Id))
            using (ProcessFacts parent = ProcessFacts.Open(Win32.ParentPid(own.Pid)))
            {
                TokenFacts.RequireService(own.Token, deployment.ServiceSid);
                TokenFacts.RequireService(parent.Token, deployment.ServiceSid);
                Json.Require(parent.Pid == ServiceFacts.Read().Pid && parent.Created < own.Created &&
                    String.Equals(own.Path, Fixed.ServiceExe, StringComparison.OrdinalIgnoreCase) && String.Equals(parent.Path, Fixed.ServiceExe, StringComparison.OrdinalIgnoreCase), "DAILY_PARENT_REJECTED");
                own.RequireAlive(); parent.RequireAlive();
            }
        }
        internal static string ServerStart(NamedPipeClientStream pipe)
        {
            uint pid;
            Win32.Check(Win32.GetNamedPipeServerProcessId(pipe.SafePipeHandle, out pid), "PIPE_SERVER_PID_UNAVAILABLE");
            using (ProcessFacts process = ProcessFacts.Open(pid)) return process.StartId;
        }
        internal static void RequireEngineParent(Deployment deployment)
        {
            uint own = (uint)Process.GetCurrentProcess().Id;
            uint parent = Win32.ParentPid(own);
            using (ProcessFacts helper = ProcessFacts.Open(own))
            using (ProcessFacts node = ProcessFacts.Open(parent))
            using (ProcessFacts service = ProcessFacts.Open(Win32.ParentPid(parent)))
            {
                TokenFacts.RequireService(helper.Token, deployment.ServiceSid);
                TokenFacts.RequireService(node.Token, deployment.ServiceSid);
                TokenFacts.RequireService(service.Token, deployment.ServiceSid);
                Json.Require(String.Equals(helper.Path, Fixed.ServiceExe, StringComparison.OrdinalIgnoreCase) && String.Equals(node.Path, Fixed.NodeExe, StringComparison.OrdinalIgnoreCase) && String.Equals(service.Path, Fixed.ServiceExe, StringComparison.OrdinalIgnoreCase), "ATTESTATION_PARENT_IMAGE_REJECTED");
                Json.Require(ServiceFacts.Read().Pid == service.Pid && service.Created < node.Created && node.Created < helper.Created, "ATTESTATION_PARENT_CHAIN_REJECTED");
                helper.RequireAlive(); node.RequireAlive(); service.RequireAlive();
            }
        }
    }

    // Strict UTF-8 NDJSON. Both directions cap the entire line, not just a JSON field.
    internal sealed class Frames : IDisposable
    {
        private readonly Stream stream;
        private readonly WaitHandle stop;
        private readonly byte[] buffer = new byte[8192];
        private int offset, length;
        private readonly object writeLock = new object();
        private readonly Action onAbort;
        internal Frames(Stream stream, WaitHandle stop) : this(stream, stop, null) { }
        internal Frames(Stream stream, WaitHandle stop, Action onAbort) { this.stream = stream; this.stop = stop; this.onAbort = onAbort; }
        internal string Read(int idleMs)
        {
            using (MemoryStream line = new MemoryStream())
            {
                try
                {
                Stopwatch frameTimer = null;
                for (;;)
                {
                    if (offset == length)
                    {
                        int wait = idleMs;
                        if (frameTimer != null)
                        {
                            long remaining = Math.Max(0L, (long)Fixed.FrameTimeoutMs - frameTimer.ElapsedMilliseconds);
                            wait = (int)Math.Min((long)Int32.MaxValue, remaining);
                        }
                        IAsyncResult pending = stream.BeginRead(buffer, 0, buffer.Length, null, null);
                        int ready;
                        using (WaitHandle completed = pending.AsyncWaitHandle)
                        {
                            ready = WaitHandle.WaitAny(new[] { completed, stop }, wait);
                            if (ready != 0)
                            {
                                Abort();
                                if (completed.WaitOne(1000)) { try { stream.EndRead(pending); } catch { } }
                                else stream.Dispose();
                                throw new PolicyException(ready == 1 ? "STOPPED" : "FRAME_TIMEOUT");
                            }
                        }
                        length = stream.EndRead(pending); offset = 0;
                        if (length == 0) { Json.Require(line.Length == 0, "TRUNCATED_FRAME"); return null; }
                    }
                    // Start on the first consumed byte, including a prefix left in the previous read buffer.
                    // One monotonic budget covers the entire frame and is never reset by later I/O.
                    if (frameTimer == null) frameTimer = Stopwatch.StartNew();
                    byte value = buffer[offset++];
                    if (value == 10)
                    {
                        Json.Require(line.Length > 0, "EMPTY_FRAME");
                        byte[] bytes = line.ToArray();
                        try
                        {
                            Json.Require(bytes[bytes.Length - 1] != 13, "CRLF_NOT_SUPPORTED");
                            try { return Fixed.Utf8.GetString(bytes); } catch { throw new PolicyException("INVALID_UTF8"); }
                        }
                        finally { Array.Clear(bytes, 0, bytes.Length); }
                    }
                    Json.Require(line.Length < Fixed.MaxFrameBytes, "FRAME_TOO_LARGE");
                    line.WriteByte(value);
                }
                }
                finally { byte[] scratch = line.GetBuffer(); Array.Clear(scratch, 0, scratch.Length); }
            }
        }
        internal void Write(object value) { WriteText(Json.Encode(value)); }
        internal void WriteText(string value)
        {
            byte[] bytes = Fixed.Utf8.GetBytes(value + "\n");
            try
            {
            Json.Require(bytes.Length <= Fixed.MaxFrameBytes + 1 && value.IndexOf('\n') < 0 && value.IndexOf('\r') < 0, "FRAME_TOO_LARGE");
            lock (writeLock)
            {
                IAsyncResult pending = stream.BeginWrite(bytes, 0, bytes.Length, null, null);
                int ready;
                using (WaitHandle completed = pending.AsyncWaitHandle)
                {
                    ready = WaitHandle.WaitAny(new[] { completed, stop }, Fixed.WriteTimeoutMs);
                    if (ready != 0)
                    {
                        Abort();
                        if (completed.WaitOne(1000)) { try { stream.EndWrite(pending); } catch { } }
                        else stream.Dispose();
                        throw new PolicyException(ready == 1 ? "STOPPED" : "WRITE_TIMEOUT");
                    }
                }
                stream.EndWrite(pending);
                stream.Flush();
            }
            }
            finally { Array.Clear(bytes, 0, bytes.Length); }
        }
        public void Dispose() { Array.Clear(buffer, 0, buffer.Length); offset = length = 0; }
        private void Abort()
        {
            if (onAbort != null) onAbort(); // Kill a hung child before closing synchronous anonymous-pipe I/O.
            PipeStream pipe = stream as PipeStream;
            if (pipe != null) Win32.CancelIoEx(pipe.SafePipeHandle, IntPtr.Zero);
            else stream.Dispose();
        }
    }

    // Called under the owning Session submission barrier. The native relay does
    // not retain payloads, but accounts for the bytes awaiting engine completion
    // so its fixed count limit also bounds the engine's queued request retention.
    internal sealed class RpcWindow
    {
        private sealed class Pending
        {
            internal string Method;
            internal int Bytes, Delta, Ack;
        }
        private readonly Dictionary<string, Pending> pending = new Dictionary<string, Pending>(StringComparer.Ordinal);
        private readonly Dictionary<string, Pending> finished = new Dictionary<string, Pending>(StringComparer.Ordinal);
        private readonly Queue<string> finishedOrder = new Queue<string>();
        private int bytes;
        internal int Count { get { return pending.Count; } }
        internal const int MaxBytes = 4 * 1024 * 1024;
        internal bool Admit(Dictionary<string, object> request, int frameBytes)
        {
            string id = Json.String(request, "id"), method = Json.String(request, "method");
            Json.Require(!pending.ContainsKey(id), "RPC_DUPLICATE_INFLIGHT_ID");
            if (method == "stream.ack")
            {
                Dictionary<string, object> parameters = (Dictionary<string, object>)request["params"];
                Json.ExactKeys(parameters, "request_id", "seq");
                string target = Json.String(parameters, "request_id");
                int sequence = Json.Integer(parameters, "seq");
                Pending active;
                bool forwarding = pending.TryGetValue(target, out active);
                // A consumer callback may finish after cancellation emitted its
                // terminal response. Accept that one final ACK locally, using
                // bounded tombstones; do not resurrect/forward a retired request.
                if (!forwarding) finished.TryGetValue(target, out active);
                Json.Require(active != null && active.Method == "daily.execute" && sequence > 0 && sequence == active.Delta && active.Ack < sequence, "RPC_ACK_NOT_PENDING");
                active.Ack = sequence;
                return forwarding;
            }
            Json.Require(!finished.ContainsKey(id), "RPC_REUSED_STREAM_ID");
            Json.Require(frameBytes > 0 && frameBytes <= Fixed.MaxFrameBytes && bytes <= MaxBytes - frameBytes &&
                pending.Count < (method == "request.cancel" ? 64 : 60), "RPC_PENDING_LIMIT");
            pending.Add(id, new Pending { Method = method, Bytes = frameBytes });
            bytes += frameBytes;
            return true;
        }
        internal bool Response(Dictionary<string, object> response)
        {
            string id = Json.String(response, "id");
            Pending active;
            if (!pending.TryGetValue(id, out active)) return false;
            object eventValue;
            if (response.TryGetValue("event", out eventValue))
            {
                int sequence = Json.Integer(response, "seq");
                Json.Require(Object.Equals(eventValue, "delta") && active.Method == "daily.execute" && sequence == active.Delta + 1 && active.Ack == active.Delta, "RPC_ENGINE_STREAM_ORDER");
                active.Delta = sequence;
            }
            else
            {
                object ok;
                Json.Require(response.TryGetValue("ok", out ok) && ok is bool, "RPC_ENGINE_TERMINAL_REQUIRED");
                bytes -= active.Bytes;
                pending.Remove(id);
                if (active.Method == "daily.execute")
                {
                    while (finishedOrder.Count >= 64) finished.Remove(finishedOrder.Dequeue());
                    finished.Add(id, active); finishedOrder.Enqueue(id);
                }
            }
            return true;
        }
        internal void Clear() { pending.Clear(); finished.Clear(); finishedOrder.Clear(); bytes = 0; }
    }

    internal static class DailyProtocol
    {
        internal static void RequireMethod(string method)
        {
            Json.Require(method == "snapshot" || method == "daily.prepare" || method == "daily.execute" || method == "request.cancel" || method == "stream.ack", "DAILY_METHOD_DENIED");
        }
        internal static Dictionary<string, object> Peer(string serviceSid, Dictionary<string, object> origin)
        {
            return new Dictionary<string, object> {
                { "authenticated", true }, { "kind", "DAILY_RUNTIME" }, { "service_sid", serviceSid },
                { "operator_sid", Json.String(origin, "operator_sid") }, { "session_id", Json.Integer(origin, "session_id") },
                { "runtime_identity", Guid.NewGuid().ToString("D") },
                { "expires_at_ms", (long)(DateTime.UtcNow.AddMilliseconds(Fixed.DailyLifetimeMs) - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds }
            };
        }
        internal static void RequirePeer(Dictionary<string, object> peer, string serviceSid, string operatorSid)
        {
            Json.ExactKeys(peer, "authenticated", "kind", "service_sid", "operator_sid", "session_id", "runtime_identity", "expires_at_ms");
            Guid identity;
            Json.Require(Object.Equals(peer["authenticated"], true) && Json.String(peer, "kind") == "DAILY_RUNTIME" &&
                Json.String(peer, "service_sid") == serviceSid && Json.String(peer, "operator_sid") == operatorSid &&
                Json.Integer(peer, "session_id") > 0 && Guid.TryParseExact(Json.String(peer, "runtime_identity"), "D", out identity), "DAILY_PRIVATE_IDENTITY_INVALID");
            long expiry;
            Json.Require(Int64.TryParse(Convert.ToString(peer["expires_at_ms"], CultureInfo.InvariantCulture), out expiry), "DAILY_EXPIRY_INVALID");
            long now = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
            Json.Require(expiry > now && expiry <= now + Fixed.DailyLifetimeMs, "DAILY_RUNTIME_EXPIRED");
        }
    }

    internal static class DailyClientPipe
    {
        internal static NamedPipeClientStream Connect()
        {
            Stopwatch clock = Stopwatch.StartNew();
            for (;;)
            {
                // SECURITY_SQOS_PRESENT | SECURITY_IDENTIFICATION, no delegation.
                SafePipeHandle handle = Win32.CreateFile(Fixed.DailyPipePath, Fixed.DailyClientAccess, 0, IntPtr.Zero, 3, 0x40000000 | 0x00100000 | 0x00010000, IntPtr.Zero);
                if (!handle.IsInvalid)
                {
                    try { return new NamedPipeClientStream(PipeDirection.InOut, true, true, handle); }
                    catch { handle.Dispose(); throw; }
                }
                int error = Marshal.GetLastWin32Error();
                handle.Dispose();
                Json.Require(error == 231 && clock.ElapsedMilliseconds < Fixed.ConnectTimeoutMs, "DAILY_PIPE_CONNECT_FAILED");
                Win32.WaitNamedPipe(Fixed.DailyPipePath, 100);
            }
        }
    }

    internal static class PureTests
    {
        internal static int Run()
        {
            int passed = 0;
            string sid = "S-1-5-21-111-222-333-1001";
            TokenFacts good = new TokenFacts { Sid = sid, Elevated = true, Integrity = 0x3000, AppContainer = false, SessionId = 1 };
            TokenFacts.RequireOperator(good, sid); passed++;
            Deployment.RequireQualificationNames(Fixed.QualificationTests); passed++;
            Reject(delegate { Deployment.RequireQualificationNames(Fixed.QualificationTests.Take(15)); }); passed++;
            Reject(delegate { Deployment.RequireQualificationNames(Fixed.QualificationTests.Concat(new[] { "old-evidence" })); }); passed++;
            Reject(delegate { Deployment.RequireQualificationNames(Fixed.QualificationTests.Concat(new[] { Fixed.QualificationTests[0] })); }); passed++;
            TokenFacts medium = new TokenFacts { Sid = sid, Elevated = false, Integrity = 0x2000, SessionId = 1 };
            TokenFacts.RequireDailyOperator(medium, sid); passed++;
            foreach (TokenFacts bad in new[] { good,
                new TokenFacts { Sid = sid, Integrity = 0x1000, SessionId = 1 },
                new TokenFacts { Sid = sid, Integrity = 0x2000, SessionId = 0 },
                new TokenFacts { Sid = sid, Integrity = 0x2000, SessionId = 1, AppContainer = true },
                new TokenFacts { Sid = "S-1-5-18", Integrity = 0x2000, SessionId = 1 }
            }) { Reject(delegate { TokenFacts.RequireDailyOperator(bad, sid); }); passed++; }
            Json.Require((Fixed.DailyClientAccess & 4) == 0 && (Fixed.DailyClientAccess & 0x40000000) == 0, "DAILY_CREATE_INSTANCE_RIGHT_FORBIDDEN"); passed++;
            foreach (string allowed in new[] { "snapshot", "daily.prepare", "daily.execute", "request.cancel", "stream.ack" }) { DailyProtocol.RequireMethod(allowed); passed++; }
            foreach (string denied in new[] { "credential.save", "credential.delete", "credential.prepare", "credential.models", "broker.execute", "broker.prepare", "budget.configure", "native.bootstrap", "runtime.attach", "session.disconnect" }) { Reject(delegate { DailyProtocol.RequireMethod(denied); }); passed++; }
            Dictionary<string, object> origin = new Dictionary<string, object> { { "operator_sid", sid }, { "session_id", 1 }, { "process_id", 10L }, { "start_id", "fixture" }, { "logon_id", "0000000000000001" } };
            Dictionary<string, object> peer = DailyProtocol.Peer("S-1-5-80-1", origin);
            DailyProtocol.RequirePeer(peer, "S-1-5-80-1", sid); passed++;
            Reject(delegate { DailyProtocol.RequirePeer(peer, "S-1-5-80-2", sid); }); passed++;
            Reject(delegate { DailyProtocol.RequirePeer(peer, "S-1-5-80-1", "S-1-5-18"); }); passed++;
            Json.Require(Identity.SameDailyOrigin(origin, new Dictionary<string, object>(origin)), "DAILY_ORIGIN_EQUALITY"); passed++;
            Dictionary<string, object> changed = new Dictionary<string, object>(origin); changed["session_id"] = 2;
            Json.Require(!Identity.SameDailyOrigin(origin, changed), "DAILY_SESSION_CHANGE_REJECTED"); passed++;
            changed = new Dictionary<string, object>(origin); changed["operator_sid"] = "S-1-5-18";
            Json.Require(!Identity.SameDailyOrigin(origin, changed), "DAILY_IDENTITY_CHANGE_REJECTED"); passed++;
            changed = new Dictionary<string, object>(origin); changed["logon_id"] = "0000000000000002";
            Json.Require(!Identity.SameDailyOrigin(origin, changed), "DAILY_LOGON_CHANGE_REJECTED"); passed++;
            Func<string, string, Dictionary<string, object>> rpc = delegate(string id, string method) { return Json.Request(Json.Encode(new { id = id, method = method, @params = new { } })); };
            RpcWindow window = new RpcWindow();
            window.Admit(rpc("pending", "snapshot"), 64);
            Reject(delegate { window.Admit(rpc("pending", "snapshot"), 64); }); passed++;
            Json.Require(window.Response(Json.Object("{\"id\":\"pending\",\"ok\":true}")) && window.Count == 0, "RPC_TERMINAL_RELEASE"); passed++;
            Json.Require(!window.Response(Json.Object("{\"id\":\"retired\",\"ok\":true}")), "RPC_UNKNOWN_RESPONSE_IGNORED"); passed++;
            for (int index = 0; index < 60; index++) window.Admit(rpc("bounded-" + index, "snapshot"), 64);
            Reject(delegate { window.Admit(rpc("over-normal", "snapshot"), 64); }); passed++;
            for (int index = 0; index < 4; index++) window.Admit(rpc("cancel-" + index, "request.cancel"), 64);
            Reject(delegate { window.Admit(rpc("over-control", "request.cancel"), 64); }); passed++;
            window.Clear(); Json.Require(window.Count == 0, "RPC_RETIRE_CLEARS_WINDOW"); passed++;
            for (int index = 0; index < 4; index++) window.Admit(rpc("bytes-" + index, "snapshot"), Fixed.MaxFrameBytes);
            Reject(delegate { window.Admit(rpc("over-bytes", "snapshot"), 1); }); passed++;
            window.Clear();
            window.Admit(rpc("stream", "daily.execute"), 256);
            Dictionary<string, object> ack = Json.Request("{\"id\":\"ack-1\",\"method\":\"stream.ack\",\"params\":{\"request_id\":\"stream\",\"seq\":1}}");
            Reject(delegate { window.Admit(ack, 128); }); passed++;
            Json.Require(window.Response(Json.Object("{\"id\":\"stream\",\"event\":\"delta\",\"seq\":1}")) && window.Count == 1, "RPC_DELTA_DOES_NOT_RELEASE"); passed++;
            Reject(delegate { window.Response(Json.Object("{\"id\":\"stream\",\"event\":\"delta\",\"seq\":2}")); }); passed++;
            window.Admit(ack, 128); Json.Require(window.Count == 1, "RPC_ACK_DOES_NOT_CONSUME_SLOT"); passed++;
            Reject(delegate { window.Admit(ack, 128); }); passed++;
            Json.Require(window.Response(Json.Object("{\"id\":\"stream\",\"event\":\"delta\",\"seq\":2}")), "RPC_NEXT_ACKED_DELTA"); passed++;
            Json.Require(window.Response(Json.Object("{\"id\":\"stream\",\"ok\":false}")) && window.Count == 0, "RPC_FAILURE_RELEASE"); passed++;
            Dictionary<string, object> lateAck = Json.Request("{\"id\":\"ack-2\",\"method\":\"stream.ack\",\"params\":{\"request_id\":\"stream\",\"seq\":2}}");
            Json.Require(!window.Admit(lateAck, 128) && window.Count == 0, "RPC_LATE_CANCEL_ACK_CONSUMED_LOCALLY"); passed++;
            Reject(delegate { window.Admit(lateAck, 128); }); passed++;
            Reject(delegate { window.Admit(rpc("stream", "daily.execute"), 128); }); passed++;
            foreach (TokenFacts bad in new[] {
                new TokenFacts { Sid = sid, Elevated = false, Integrity = 0x2000 },
                new TokenFacts { Sid = sid, Elevated = true, Integrity = 0x1000 },
                new TokenFacts { Sid = sid, Elevated = true, Integrity = 0x2000 },
                new TokenFacts { Sid = sid, Elevated = true, Integrity = 0x3000, AppContainer = true },
                new TokenFacts { Sid = "S-1-5-18", Elevated = true, Integrity = 0x4000 }
            }) { Reject(delegate { TokenFacts.RequireOperator(bad, sid); }); passed++; }
            string qualificationApproval = "APPROVED-QUALIFICATION-TEST-FIXTURE";
            Deployment.RequireModePolicy("QUALIFICATION_ONLY", "BLOCKED", false, false, "", "", qualificationApproval); passed++;
            Deployment.RequireModePolicy("QUALIFICATION_ONLY", "NOT_RUN", false, false, "", "", qualificationApproval); passed++;
            Deployment.RequireModePolicy("QUALIFIED", "PASS", false, false, "", "", ""); passed++;
            foreach (Action bad in new Action[] {
                delegate { Deployment.RequireModePolicy("BLOCKED", "BLOCKED", false, false, "", "", qualificationApproval); },
                delegate { Deployment.RequireModePolicy("QUALIFICATION_ONLY", "PASS", false, false, "", "", qualificationApproval); },
                delegate { Deployment.RequireModePolicy("QUALIFICATION_ONLY", "NOT_RUN", false, false, "", "", ""); },
                delegate { Deployment.RequireModePolicy("QUALIFICATION_ONLY", "NOT_RUN", true, false, "", "", qualificationApproval); },
                delegate { Deployment.RequireModePolicy("QUALIFICATION_ONLY", "NOT_RUN", false, true, "", "", qualificationApproval); },
                delegate { Deployment.RequireModePolicy("QUALIFICATION_ONLY", "NOT_RUN", false, false, "APPROVED-REAL-IMPORT", "", qualificationApproval); },
                delegate { Deployment.RequireModePolicy("QUALIFICATION_ONLY", "NOT_RUN", false, false, "", "APPROVED-LIVE-REQUEST", qualificationApproval); },
                delegate { Deployment.RequireModePolicy("QUALIFIED", "NOT_RUN", false, false, "", "", qualificationApproval); },
                delegate { Deployment.RequireTestResult("QUALIFICATION_ONLY", "PASS"); },
                delegate { Deployment.RequireTestResult("QUALIFIED", "BLOCKED"); }
            }) { Reject(bad); passed++; }
            Deployment.RequireTestResult("QUALIFICATION_ONLY", "NOT_RUN"); passed++;
            Json.Require(Deployment.ContainsSensitiveRead(FileSystemRights.ReadData) && Deployment.ContainsSensitiveRead((FileSystemRights)unchecked((int)0x80000000)) && Deployment.ContainsSensitiveRead((FileSystemRights)0x10000000) && !Deployment.ContainsSensitiveRead(FileSystemRights.WriteData), "SELF_TEST_SENSITIVE_READ_MASK_FAILED"); passed++;
            Deployment plan = new Deployment { Mode = "QUALIFICATION_ONLY", ApprovalExpiresUtc = DateTime.UtcNow.AddMinutes(1) };
            Dictionary<string, object> attestation = plan.Attestation();
            Json.Require((string)attestation["mode"] == "QUALIFICATION_ONLY" && !(bool)attestation["qualified"] && !(bool)attestation["real_import_enabled"] && !(bool)attestation["live_enabled"], "SELF_TEST_PLAN_ATTESTATION_FAILED"); passed++;
            Reject(delegate { new Deployment { ApprovalExpiresUtc = DateTime.UtcNow.AddSeconds(-1) }.RequireCurrentApproval(); }); passed++;
            plan.ValidateRequestForMode(Json.Request(Json.Encode(new { id = "fixture-1", method = "credential.save", @params = new { secret_b64 = Convert.ToBase64String(Fixed.Utf8.GetBytes("synthetic-test-qualification-fixture")) } }))); passed++;
            Reject(delegate { plan.ValidateRequestForMode(Json.Request(Json.Encode(new { id = "fixture-2", method = "credential.save", @params = new { secret_b64 = Convert.ToBase64String(Fixed.Utf8.GetBytes("unapproved-test-token-value-without-prefix")) } }))); }); passed++;
            Json.Request("{\"id\":\"1\",\"method\":\"health.read\",\"params\":{}}"); passed++;
            foreach (string invalid in new[] {
                "{\"id\":\"1\",\"method\":\"health.read\",\"params\":{},\"peer\":{\"authenticated\":true}}",
                "{\"id\":\"1\",\"method\":\"session.disconnect\",\"params\":{}}",
                "{\"id\":\"1\",\"method\":\"native.bootstrap\",\"params\":{}}",
                "{\"id\":\"1\",\"method\":\"health.read\",\"params\":[]}", "[]", "{"
            }) { Reject(delegate { Json.Request(invalid); }); passed++; }
            using (ManualResetEvent stop = new ManualResetEvent(false))
            {
                using (MemoryStream stream = new MemoryStream(Fixed.Utf8.GetBytes("{\"x\":1}\n{\"x\":2}\n")))
                {
                    Frames frames = new Frames(stream, stop);
                    Json.Require(frames.Read(1000) == "{\"x\":1}" && frames.Read(1000) == "{\"x\":2}" && frames.Read(1000) == null, "SELF_TEST_FAILED"); passed++;
                }
                string secondFrame = "{\"payload\":\"" + new string('x', 10000) + "\"}";
                using (MemoryStream stream = new MemoryStream(Fixed.Utf8.GetBytes("{\"x\":1}\n" + secondFrame + "\n")))
                {
                    Frames frames = new Frames(stream, stop);
                    Json.Require(frames.Read(1000) == "{\"x\":1}" && stream.Position == 8192, "SELF_TEST_BUFFER_PREFIX_REQUIRED");
                    Json.Require(frames.Read(1000) == secondFrame && frames.Read(1000) == null, "SELF_TEST_CROSS_BUFFER_FRAME_FAILED"); passed++;
                }
                using (MemoryStream stream = new MemoryStream(Encoding.ASCII.GetBytes(new string('x', Fixed.MaxFrameBytes) + "\n")))
                { Json.Require(new Frames(stream, stop).Read(1000).Length == Fixed.MaxFrameBytes, "SELF_TEST_FRAME_BOUNDARY_FAILED"); passed++; }
                foreach (byte[] invalid in new[] { Fixed.Utf8.GetBytes("\n"), Fixed.Utf8.GetBytes("{}\r\n"), Fixed.Utf8.GetBytes("{}"), new byte[] { 0xff, 10 }, Encoding.ASCII.GetBytes(new string('x', Fixed.MaxFrameBytes + 1) + "\n") })
                    using (MemoryStream stream = new MemoryStream(invalid))
                    { Reject(delegate { new Frames(stream, stop).Read(1000); }); passed++; }
            }
            Console.WriteLine(Json.Encode(new { schema = 1, mode = "PURE_SELF_TEST", passed = passed, failed = 0, windows_boundary_qualified = false, installed_service = false, touched_real_credentials = false }));
            return 0;
        }
        private static void Reject(Action action)
        {
            try { action(); } catch (PolicyException) { return; }
            throw new PolicyException("SELF_TEST_EXPECTED_REJECTION");
        }
    }

    internal static class Win32
    {
        internal static void Check(bool result, string code) { if (!result) throw new PolicyException(code); }
        [StructLayout(LayoutKind.Sequential)] internal struct FILETIME { internal uint Low, High; }
        [StructLayout(LayoutKind.Sequential)] internal struct SECURITY_ATTRIBUTES { internal int Length; internal IntPtr Descriptor; [MarshalAs(UnmanagedType.Bool)] internal bool Inherit; }
        [StructLayout(LayoutKind.Sequential)] internal struct QUERY_SERVICE_CONFIG { internal uint ServiceType, StartType, ErrorControl; internal IntPtr BinaryPath, LoadOrderGroup; internal uint TagId; internal IntPtr Dependencies, StartName, DisplayName; }
        [StructLayout(LayoutKind.Sequential)] internal struct SERVICE_STATUS_PROCESS { internal uint ServiceType, CurrentState, ControlsAccepted, Win32ExitCode, ServiceSpecificExitCode, CheckPoint, WaitHint, ProcessId, ServiceFlags; }
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] internal struct PROCESSENTRY32 { internal uint Size, Usage, ProcessId; internal UIntPtr DefaultHeapId; internal uint ModuleId, Threads, ParentProcessId; internal int BasePriority; internal uint Flags; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)] internal string ExeFile; }
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool CloseHandle(IntPtr handle);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] internal static extern SafePipeHandle CreateFile(string path, uint access, uint sharing, IntPtr attributes, uint creation, uint flags, IntPtr template);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] internal static extern bool WaitNamedPipe(string path, int timeout);
        [DllImport("kernel32.dll", EntryPoint = "CreateNamedPipeW", CharSet = CharSet.Unicode, SetLastError = true)] internal static extern IntPtr CreateNamedPipeProbe(string name, uint openMode, uint pipeMode, int instances, int outBuffer, int inBuffer, int timeout, IntPtr attributes);
        [DllImport("kernel32.dll")] internal static extern IntPtr GetCurrentProcess();
        [DllImport("kernel32.dll")] internal static extern IntPtr GetCurrentThread();
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] internal static extern bool QueryFullProcessImageName(IntPtr process, uint flags, StringBuilder path, ref int size);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool GetProcessTimes(IntPtr process, out FILETIME created, out FILETIME exited, out FILETIME kernel, out FILETIME user);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);
        [DllImport("advapi32.dll", SetLastError = true)] internal static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
        [DllImport("advapi32.dll", SetLastError = true)] internal static extern bool OpenThreadToken(IntPtr thread, uint access, bool openAsSelf, out IntPtr token);
        [DllImport("advapi32.dll", SetLastError = true)] private static extern bool GetTokenInformation(IntPtr token, int kind, IntPtr buffer, int length, out int returned);
        internal static IntPtr TokenInfo(IntPtr token, int kind)
        {
            int size;
            GetTokenInformation(token, kind, IntPtr.Zero, 0, out size);
            Json.Require(size > 0 && size <= 1048576, "TOKEN_INFORMATION_UNAVAILABLE");
            IntPtr buffer = Marshal.AllocHGlobal(size);
            if (!GetTokenInformation(token, kind, buffer, size, out size)) { Marshal.FreeHGlobal(buffer); throw new PolicyException("TOKEN_INFORMATION_UNAVAILABLE"); }
            return buffer;
        }
        [DllImport("advapi32.dll", SetLastError = true)] internal static extern bool ImpersonateNamedPipeClient(SafePipeHandle pipe);
        [DllImport("advapi32.dll", SetLastError = true)] internal static extern bool RevertToSelf();
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool GetNamedPipeClientProcessId(SafePipeHandle pipe, out uint pid);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool GetNamedPipeClientSessionId(SafePipeHandle pipe, out uint session);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool GetNamedPipeServerProcessId(SafePipeHandle pipe, out uint pid);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool GetNamedPipeServerSessionId(SafePipeHandle pipe, out uint session);
        [DllImport("kernel32.dll", SetLastError = true)] internal static extern bool CancelIoEx(SafePipeHandle pipe, IntPtr overlapped);
        [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] internal static extern IntPtr OpenSCManager(string machine, string database, uint access);
        [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] internal static extern IntPtr OpenService(IntPtr scm, string service, uint access);
        [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] internal static extern bool QueryServiceConfig(IntPtr service, IntPtr config, int size, out int needed);
        [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)] internal static extern bool QueryServiceConfig2(IntPtr service, int level, IntPtr config, int size, out int needed);
        [DllImport("advapi32.dll", SetLastError = true)] internal static extern bool QueryServiceStatusEx(IntPtr service, int level, out SERVICE_STATUS_PROCESS status, int size, out int needed);
        [DllImport("advapi32.dll", SetLastError = true)] internal static extern bool CloseServiceHandle(IntPtr service);
        [DllImport("kernel32.dll", SetLastError = true)] private static extern IntPtr CreateToolhelp32Snapshot(uint flags, uint pid);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] private static extern bool Process32First(IntPtr snapshot, ref PROCESSENTRY32 entry);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] private static extern bool Process32Next(IntPtr snapshot, ref PROCESSENTRY32 entry);
        internal static uint ParentPid(uint pid)
        {
            IntPtr snapshot = CreateToolhelp32Snapshot(2, 0);
            Json.Require(snapshot != new IntPtr(-1), "PROCESS_SNAPSHOT_UNAVAILABLE");
            try
            {
                PROCESSENTRY32 entry = new PROCESSENTRY32 { Size = (uint)Marshal.SizeOf(typeof(PROCESSENTRY32)) };
                bool exists = Process32First(snapshot, ref entry);
                while (exists) { if (entry.ProcessId == pid) return entry.ParentProcessId; exists = Process32Next(snapshot, ref entry); }
                throw new PolicyException("PROCESS_PARENT_UNAVAILABLE");
            }
            finally { CloseHandle(snapshot); }
        }
        internal static List<uint> FixedServiceChildren(uint servicePid)
        {
            List<uint> result = new List<uint>();
            IntPtr snapshot = CreateToolhelp32Snapshot(2, 0);
            Json.Require(snapshot != new IntPtr(-1), "PROBE_PROCESS_SNAPSHOT_FAILED");
            try
            {
                PROCESSENTRY32 entry = new PROCESSENTRY32(); entry.Size = (uint)Marshal.SizeOf(typeof(PROCESSENTRY32));
                if (Process32First(snapshot, ref entry)) do
                {
                    if (entry.ParentProcessId == servicePid && String.Equals(entry.ExeFile, "AgentNexusCredential.exe", StringComparison.OrdinalIgnoreCase)) result.Add(entry.ProcessId);
                } while (Process32Next(snapshot, ref entry));
            }
            finally { CloseHandle(snapshot); }
            return result;
        }
    }
}
