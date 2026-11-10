// Shared by the independent Signer, verifier, installer and deployed boundary.
// C# 5 / .NET Framework 4.8. No certificate-store writes or private-key APIs here.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

namespace AgentNexus.CredentialBoundary
{
    internal static class SigningContract
    {
        internal const string Local = "LOCAL_QUALIFICATION", Production = "PRODUCTION_RELEASE";
        // RFC 9336 document-signing purpose, exclusive of code signing. The exact
        // independently approved certificate pin and local schema supply application trust.
        internal const string LocalEku = "1.3.6.1.5.5.7.3.36";
        internal const int LocalEpoch = 5;
        internal static readonly string[] HashFields = { "service_sha256", "client_sha256", "helper_sha256", "launcher_sha256", "node_sha256", "engine_sha256", "application_manifest_sha256" };
        internal static readonly string[] PayloadNames = { "AgentNexusCredential.exe", "pipe-client.exe", "trusted-credential-helper.exe", "credential-launcher.exe", "node.exe", "app/dist/src/agentnexus/credential-service/engine.js", "app-manifest.json" };
        internal static readonly string[] Denied = { "real_import", "live_provider", "production_release", "real_ledger_migration", "real_import_enabled", "live_enabled" };
        internal static bool Bool(Dictionary<string, object> d, string k) { object v; Json.Require(d.TryGetValue(k, out v) && v is bool, "BOOLEAN_REQUIRED:" + k); return (bool)v; }
        internal static void NoReal(Dictionary<string, object> d)
        {
            foreach (string k in Denied) Json.Require(!Bool(d, k), "LOCAL_REAL_PERMISSION_DENIED:" + k);
            foreach (string k in new[] { "real_import_approval_ref", "live_approval_ref" }) Json.Require(Json.String(d, k) == "", "LOCAL_REAL_APPROVAL_DENIED");
        }
        internal static DateTime Utc(string text)
        {
            DateTime value;
            Json.Require(DateTime.TryParseExact(text, "o", CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out value) && value.Kind == DateTimeKind.Utc, "STRICT_UTC_REQUIRED");
            return value;
        }
        internal static void Time(Dictionary<string, object> d, DateTime now)
        {
            DateTime from = Utc(Json.String(d, "issued_at_utc")), to = Utc(Json.String(d, "expires_at_utc"));
            Json.Require(from <= now && to > now && to > from && to - from <= TimeSpan.FromDays(7), "LOCAL_TIME_INVALID");
        }
        internal static bool ApprovalRef(string s) { return Regex.IsMatch(s ?? "", @"\AAPPROVED-[A-Za-z0-9][A-Za-z0-9_.:-]{7,120}\z"); }
        internal static void RequireFreshEpoch(int epoch, bool receiptExists)
        {
            Json.Require(epoch == LocalEpoch, "EPOCH_MISMATCH");
            Json.Require(!receiptExists, "EPOCH_ALREADY_CONSUMED");
        }
        internal static void RequireReview(bool isolated, bool targetVerified, string typed, string expected)
        {
            Json.Require(isolated && targetVerified && !String.IsNullOrEmpty(expected) && typed == expected, "EXPLICIT_USER_CONFIRMATION_REQUIRED");
        }
        internal static void CertificateWindow(X509Certificate2 cert, Dictionary<string, object> plan)
        {
            Json.Require(cert.NotBefore.ToUniversalTime() <= Utc(Json.String(plan, "issued_at_utc")) && cert.NotAfter.ToUniversalTime() >= Utc(Json.String(plan, "expires_at_utc")), "CERTIFICATE_PLAN_WINDOW_MISMATCH");
        }
        internal static string ServiceSid()
        {
            byte[] digest;
            using (SHA1 sha = SHA1.Create()) digest = sha.ComputeHash(Encoding.Unicode.GetBytes(Fixed.ServiceName.ToUpperInvariant()));
            return "S-1-5-80-" + String.Join("-", Enumerable.Range(0, 5).Select(i => BitConverter.ToUInt32(digest, i * 4).ToString(CultureInfo.InvariantCulture)));
        }
        internal static object[] Changes()
        {
            return new object[] {
                "Create only AgentNexusCredential own-process demand Windows Service; no arguments; Session 0",
                "Use only NT SERVICE\\AgentNexusCredential virtual service account; sidtype unrestricted; no custom account or login/debug privilege",
                "Service SCM DACL D:P(A;;GA;;;SY)(A;;GA;;;BA)(A;;CCLC;;;AU)",
                "Create C:\\Program Files\\AgentNexus; protected BA owner; SYSTEM/BA FullControl; service/Users ReadAndExecute; exact manifest files only",
                "Create C:\\ProgramData\\AgentNexusCredential; protected BA owner; SYSTEM/BA FullControl; service ReadAndExecute; no ordinary-user access",
                "Only engine, qualification, temp state subtrees grant service FullControl; config, signatures, receipts and plans remain admin-write only",
                "Create protected C:\\ProgramData\\AgentNexusCredential\\installation-receipt.json BEFORE SCM creation; consume epoch 5 once even on failure; preserve the data root",
                "Fixed High pipe \\\\.\\pipe\\AgentNexus.Credential.v1 and Medium pipe \\\\.\\pipe\\AgentNexus.Daily.v1 only when separately approved service start occurs",
                "Fixed service EXE --daily-runtime; retained handle/private inherited stdio/kill-on-close Job; fixed Launcher and UAC Helper only on later user action",
                "Synthetic Vault, Synthetic Token Ledger and Synthetic Provider only; all real import/live/production/REAL ledger migration permissions false",
                "Install stopped only; start_service=false; service start, readiness, failure stop and 70 OS tests require a subsequent precise approval",
                "No firewall, drivers, Ubuntu, AppContainer, shell exposure, certificate trust import, data deletion, ledger reset, commit or push"
            };
        }
        internal static Dictionary<string, object> Policy()
        {
            return new Dictionary<string, object> {
                { "schema", "agentnexus.q41.signature-policy.v1" }, { "signing_mode", Local },
                { "certificate_eku", LocalEku }, { "rsa_min_bits", 3072 }, { "cms_digest", "SHA256" },
                { "cms_signature", "RSA_PKCS1_V1_5" }, { "certificate_signature_oids", new object[] { "1.2.840.113549.1.1.11", "1.2.840.113549.1.1.12", "1.2.840.113549.1.1.13" } },
                { "certificate_trust", "INDEPENDENT_USER_DER_SHA256_PIN" }, { "max_validity_seconds", 604800 },
                { "policy_epoch", LocalEpoch }, { "authenticode_required", false },
                { "authenticode_assurance", "NOT_GRANTED_BY_CMS" }, { "production_allowed", false }
            };
        }
        internal static Dictionary<string, object> SystemChanges()
        {
            return new Dictionary<string, object> { { "schema", "agentnexus.q41.system-changes.v1" }, { "changes", Changes() } };
        }
        internal static string Canonical(object value)
        {
            Dictionary<string, object> d = value as Dictionary<string, object>;
            if (d != null) return "{" + String.Join(",", d.Keys.OrderBy(k => k, StringComparer.Ordinal).Select(k => Json.Encode(k) + ":" + Canonical(d[k]))) + "}";
            object[] a = value as object[];
            if (a != null) return "[" + String.Join(",", a.Select(Canonical)) + "]";
            return Json.Encode(value);
        }
        internal static Dictionary<string, object> Read(byte[] bytes)
        {
            string text = Fixed.Utf8.GetString(bytes);
            // Reject duplicate/case-alias JSON keys before JavaScriptSerializer can discard them.
            new UniqueJson(text).Check();
            return Json.Object(text);
        }
        internal static bool HasEku(X509Certificate2 cert, string oid)
        {
            foreach (X509Extension ext in cert.Extensions)
            {
                X509EnhancedKeyUsageExtension eku = ext as X509EnhancedKeyUsageExtension;
                if (eku != null && eku.EnhancedKeyUsages.Cast<Oid>().Any(x => x.Value == oid)) return true;
            }
            return false;
        }
        internal static void Certificate(X509Certificate2 cert, string pin, string subject, string mode, DateTime now)
        {
            Json.Require(cert != null && Digests.IsHash(pin) && Digests.Bytes(cert.RawData) == pin, "CERTIFICATE_PIN_MISMATCH");
            Json.Require(cert.Subject == subject && subject.Length > 0, "SIGNER_IDENTITY_MISMATCH");
            Json.Require(cert.NotBefore.ToUniversalTime() <= now && cert.NotAfter.ToUniversalTime() > now, "CERTIFICATE_EXPIRED");
            if (mode == Local)
            {
                X509EnhancedKeyUsageExtension eku = cert.Extensions.OfType<X509EnhancedKeyUsageExtension>().SingleOrDefault();
                X509KeyUsageExtension ku = cert.Extensions.OfType<X509KeyUsageExtension>().SingleOrDefault();
                X509BasicConstraintsExtension bc = cert.Extensions.OfType<X509BasicConstraintsExtension>().SingleOrDefault();
                Json.Require(eku != null && eku.EnhancedKeyUsages.Count == 1 && HasEku(cert, LocalEku) && ku != null && ku.KeyUsages == X509KeyUsageFlags.DigitalSignature && bc != null && !bc.CertificateAuthority, "LOCAL_CERTIFICATE_PURPOSE");
                Json.Require(cert.PublicKey.Oid.Value == "1.2.840.113549.1.1.1" && cert.PublicKey.Key.KeySize >= 3072, "LOCAL_CERTIFICATE_ALGORITHM");
                Json.Require(new[] { "1.2.840.113549.1.1.11", "1.2.840.113549.1.1.12", "1.2.840.113549.1.1.13" }.Contains(cert.SignatureAlgorithm.Value), "LOCAL_CERTIFICATE_SIGNATURE_ALGORITHM");
            }
            else
            {
                Json.Require(mode == Production && !HasEku(cert, LocalEku), "LOCAL_CERTIFICATE_CANNOT_RELEASE_PRODUCTION");
                Json.Require(HasEku(cert, "1.3.6.1.5.5.7.3.3"), "PRODUCTION_CODE_SIGNING_PURPOSE_REQUIRED");
                using (X509Chain chain = new X509Chain())
                {
                    chain.ChainPolicy.RevocationMode = X509RevocationMode.Offline;
                    chain.ChainPolicy.VerificationFlags = X509VerificationFlags.NoFlag;
                    chain.ChainPolicy.VerificationTime = now;
                    chain.ChainPolicy.ApplicationPolicy.Add(new Oid("1.3.6.1.5.5.7.3.3"));
                    Json.Require(chain.Build(cert), "PRODUCTION_TRUST_CHAIN_REQUIRED");
                }
            }
        }
        internal static X509Certificate2 Cms(byte[] content, byte[] signature, string pin, string subject, string mode, DateTime now)
        {
            DetachedDer.Require(signature);
            SignedCms cms = new SignedCms(new ContentInfo(content), true);
            try { cms.Decode(signature); cms.CheckSignature(true); }
            catch { throw new PolicyException("CMS_INVALID"); }
            Json.Require(cms.Detached && cms.SignerInfos.Count == 1 && cms.SignerInfos[0].Certificate != null && cms.SignerInfos[0].CounterSignerInfos.Count == 0, "CMS_SIGNER_COUNT_OR_ATTACHED_CONTENT");
            Json.Require(cms.SignerInfos[0].DigestAlgorithm.Value == "2.16.840.1.101.3.4.2.1", "CMS_SHA256_REQUIRED");
            if (mode == Local) Json.Require(DetachedDer.SignatureAlgorithm(signature) == "1.2.840.113549.1.1.1" || DetachedDer.SignatureAlgorithm(signature) == "1.2.840.113549.1.1.11", "CMS_RSA_PKCS1_SHA256_REQUIRED");
            X509Certificate2 cert = cms.SignerInfos[0].Certificate;
            Certificate(cert, pin, subject, mode, now);
            return cert;
        }
        internal static Dictionary<string, object> CertificateMetadata(X509Certificate2 cert)
        {
            return new Dictionary<string, object> {
                { "certificate_name", cert.GetNameInfo(X509NameType.SimpleName, false) }, { "subject", cert.Subject }, { "issuer", cert.Issuer }, { "serial_number", cert.SerialNumber },
                { "der_sha256", Digests.Bytes(cert.RawData) }, { "not_before_utc", cert.NotBefore.ToUniversalTime().ToString("o") }, { "not_after_utc", cert.NotAfter.ToUniversalTime().ToString("o") },
                { "public_key_algorithm", cert.PublicKey.Oid.Value }, { "public_key_bits", cert.PublicKey.Key.KeySize }, { "certificate_signature_algorithm", cert.SignatureAlgorithm.Value },
                { "key_usage", String.Join(",", cert.Extensions.OfType<X509KeyUsageExtension>().Select(e => e.KeyUsages.ToString())) },
                { "eku", cert.Extensions.OfType<X509EnhancedKeyUsageExtension>().SelectMany(e => e.EnhancedKeyUsages.Cast<Oid>()).Select(e => (object)e.Value).ToArray() },
                { "purpose", LocalEku }, { "private_key_accessed_by_metadata_inspection", false }, { "trusted_automatically", false }
            };
        }
        internal static X509Certificate2 PublicCertificate(byte[] der)
        {
            Json.Require(der != null && der.Length > 0 && der.Length <= 131072 && X509Certificate2.GetCertContentType(der) == X509ContentType.Cert, "PUBLIC_DER_ONLY_NO_PFX");
            X509Certificate2 cert = new X509Certificate2(der);
            try { Json.Require(der.SequenceEqual(cert.RawData) && !cert.HasPrivateKey, "EXACT_PUBLIC_DER_REQUIRED"); return cert; }
            catch { cert.Dispose(); throw; }
        }
        internal static void Host(Dictionary<string, object> plan, string machine, string sid, DateTime now)
        {
            Json.Require(Json.String(plan, "machine_id") == machine && Digests.IsHash(machine), "HOST_MISMATCH");
            Json.Require(Json.String(plan, "operator_sid") == sid && new SecurityIdentifier(sid).IsAccountSid(), "OPERATOR_SID_MISMATCH");
            Json.Require(Json.String(plan, "service_sid") == ServiceSid(), "SERVICE_SID_MISMATCH");
            Json.Require(Json.Integer(plan, "policy_epoch") == LocalEpoch, "EPOCH_MISMATCH");
            Time(plan, now);
        }
        internal static void Plan(Dictionary<string, object> p, string machine, string sid, DateTime now, bool confirmed)
        {
            string[] keys = new[] { "schema", "status", "decision", "scope", "machine_id", "service_sid", "policy_epoch", "qualification_test_approval_ref", "issued_at_utc", "expires_at_utc", "tests", "real_import_enabled", "real_import_approval_ref", "live_enabled", "live_approval_ref", "signing_mode", "operator_sid", "target_host", "installation_manifest_sha256", "service_config_sha256", "signature_policy_sha256", "system_changes_sha256", "installer_sha256", "verifier_sha256", "signer_tool_sha256", "payload_files", "payload_bytes", "deployment_id", "signer_id", "signer_certificate_der_sha256", "user_confirmed", "confirmation_kind", "real_import", "live_provider", "production_release", "real_ledger_migration" }.Concat(HashFields).ToArray();
            Json.ExactKeys(p, keys);
            Json.Require(Json.String(p, "schema") == "agentnexus.windows-qualification.v1" && Json.String(p, "signing_mode") == Local && Json.String(p, "status") == "QUALIFICATION_ONLY" && Json.String(p, "scope") == "WINDOWS_BOUNDARY_ONLY" && (Json.String(p, "decision") == "NOT_RUN" || Json.String(p, "decision") == "BLOCKED"), "LOCAL_QUALIFICATION_SCOPE_REQUIRED");
            NoReal(p); Host(p, machine, sid, now);
            Json.Require(Json.String(p, "target_host").Length > 0 && Json.String(p, "signer_id").Length > 0 && ApprovalRef(Json.String(p, "qualification_test_approval_ref")), "LOCAL_IDENTITY_OR_REFERENCE");
            Guid id; Json.Require(Guid.TryParseExact(Json.String(p, "deployment_id"), "D", out id) && id != Guid.Empty, "DEPLOYMENT_ID_REQUIRED");
            foreach (string k in HashFields.Concat(new[] { "installation_manifest_sha256", "service_config_sha256", "signature_policy_sha256", "system_changes_sha256", "installer_sha256", "verifier_sha256", "signer_tool_sha256" })) Json.Require(Digests.IsHash(Json.String(p, k)), "PLAN_HASH_REQUIRED:" + k);
            Json.Require(Json.Integer(p, "payload_files") > 0 && Json.Integer(p, "payload_bytes") > 0, "PAYLOAD_TOTALS_REQUIRED");
            Json.Require(Json.String(p, "confirmation_kind") == "QUALIFICATION_PLAN" && (!confirmed || Bool(p, "user_confirmed")), "USER_CONFIRMATION_REQUIRED");
        }
        internal static void Approval(Dictionary<string, object> a, Dictionary<string, object> p, byte[] planBytes, byte[] planSignature, DateTime now, bool confirmed)
        {
            Json.ExactKeys(a, "schema", "signing_mode", "scope", "deployment_approved", "start_service", "approval_ref", "qualification_sha256", "qualification_signature_sha256", "installation_manifest_sha256", "service_config_sha256", "signature_policy_sha256", "system_changes_sha256", "installer_sha256", "verifier_sha256", "signer_tool_sha256", "payload_files", "payload_bytes", "machine_id", "operator_sid", "service_sid", "target_host", "policy_epoch", "deployment_id", "issued_at_utc", "expires_at_utc", "signer_id", "signer_certificate_der_sha256", "user_confirmed", "confirmation_kind", "real_import", "live_provider", "production_release", "real_ledger_migration", "real_import_enabled", "live_enabled", "real_import_approval_ref", "live_approval_ref");
            Json.Require(Json.String(a, "schema") == "agentnexus.q41.deployment-approval.v1" && Json.String(a, "signing_mode") == Local && Json.String(a, "scope") == "QUALIFICATION_ONLY", "DEPLOYMENT_SCOPE_REQUIRED");
            NoReal(a); Time(a, now);
            foreach (string field in new[] { "installation_manifest_sha256", "service_config_sha256", "signature_policy_sha256", "system_changes_sha256", "installer_sha256", "verifier_sha256", "signer_tool_sha256", "payload_files", "payload_bytes", "machine_id", "operator_sid", "service_sid", "target_host", "policy_epoch", "deployment_id", "issued_at_utc", "expires_at_utc", "signer_id", "signer_certificate_der_sha256" }) Json.Require(Object.Equals(a[field], p[field]), "APPROVAL_BINDING_MISMATCH:" + field);
            Json.Require(Json.String(a, "qualification_sha256") == Digests.Bytes(planBytes) && Json.String(a, "qualification_signature_sha256") == Digests.Bytes(planSignature), "QUALIFICATION_SIGNATURE_BINDING");
            Json.Require(!Bool(a, "start_service"), "SERVICE_START_REQUIRES_SEPARATE_FUTURE_APPROVAL");
            Json.Require(Json.String(a, "confirmation_kind") == "DEPLOYMENT_APPROVAL" && (!confirmed || (Bool(a, "deployment_approved") && Bool(a, "user_confirmed"))) && ApprovalRef(Json.String(a, "approval_ref")) && Json.String(a, "approval_ref") != Json.String(p, "qualification_test_approval_ref"), "SEPARATE_DEPLOYMENT_CONFIRMATION_REQUIRED");
        }
    }

    // A small lexical guard, followed by the platform JSON parser for full grammar.
    // Object keys are decoded before ordinal-ignore-case duplicate detection.
    internal sealed class UniqueJson
    {
        private readonly string text; private int at, depth;
        internal UniqueJson(string value) { text = value; }
        private void Space() { while (at < text.Length && Char.IsWhiteSpace(text[at])) at++; }
        private char Peek() { Space(); Json.Require(at < text.Length, "JSON_TRUNCATED"); return text[at]; }
        private string Str()
        {
            Json.Require(Peek() == '"', "JSON_STRING_REQUIRED"); int start = at++;
            while (at < text.Length)
            {
                char c = text[at++];
                if (c == '\\') { Json.Require(at < text.Length, "JSON_ESCAPE"); at++; }
                else if (c == '"') return (string)new System.Web.Script.Serialization.JavaScriptSerializer().DeserializeObject(text.Substring(start, at - start));
            }
            throw new PolicyException("JSON_STRING_TRUNCATED");
        }
        private void Value()
        {
            Json.Require(++depth <= 48, "JSON_DEPTH"); char c = Peek();
            if (c == '{')
            {
                at++; HashSet<string> keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                if (Peek() == '}') at++;
                else while (true)
                {
                    Json.Require(keys.Add(Str()), "DUPLICATE_JSON_KEY"); Json.Require(Peek() == ':', "JSON_COLON"); at++; Value();
                    c = Peek(); at++; if (c == '}') break; Json.Require(c == ',', "JSON_COMMA");
                }
            }
            else if (c == '[')
            {
                at++; if (Peek() == ']') at++;
                else while (true) { Value(); c = Peek(); at++; if (c == ']') break; Json.Require(c == ',', "JSON_COMMA"); }
            }
            else if (c == '"') Str();
            else { int start = at; while (at < text.Length && !Char.IsWhiteSpace(text[at]) && ",]}".IndexOf(text[at]) < 0) at++; Json.Require(at > start, "JSON_VALUE"); }
            depth--;
        }
        internal void Check() { Value(); Space(); Json.Require(at == text.Length, "JSON_TRAILING_DATA"); }
    }

    internal sealed class QualificationBundle : IDisposable
    {
#if SIGNING_DIAGNOSTIC
        internal static Action<string> PublicationProbe;
        private static void Probe(string phase) { if (PublicationProbe != null) PublicationProbe(phase); }
#else
        [System.Diagnostics.Conditional("SIGNING_DIAGNOSTIC")] private static void Probe(string phase) { }
#endif
        private readonly Dictionary<string, FileStream> held = new Dictionary<string, FileStream>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, byte[]> snapshots = new Dictionary<string, byte[]>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, SafeFileHandle> sourceDirectories = new Dictionary<string, SafeFileHandle>(StringComparer.OrdinalIgnoreCase);
        private long snapshotBytes;
        private readonly bool publicationReadback;
        internal readonly string Root;
        internal Dictionary<string, object> Manifest, Configuration, Plan, DeploymentApproval;
        internal byte[] PlanBytes, PlanSignature, ApprovalBytes, ApprovalSignature;
        internal int FileCount, TotalBytes;
        internal QualificationBundle(string root) : this(root, false) { }
        internal QualificationBundle(string root, bool readback)
        {
            Root = LocalPaths.Require(root).TrimEnd('\\'); publicationReadback = readback;
            try { PinSourceDirectories(Root); } catch { Dispose(); throw; }
        }
        internal static void CheckAncestors(string path)
        {
            LocalPaths.Require(path);
            Stack<string> ancestors = new Stack<string>();
            for (string cursor = Path.GetFullPath(path); !String.IsNullOrEmpty(cursor); cursor = Path.GetDirectoryName(cursor)) ancestors.Push(cursor);
            foreach (string cursor in ancestors) Json.Require((File.GetAttributes(cursor) & FileAttributes.ReparsePoint) == 0, "SOURCE_REPARSE_REJECTED");
        }
        private void PinSourceDirectories(string path)
        {
            if (sourceDirectories.ContainsKey(path)) return;
            string parent = Path.GetDirectoryName(path); if (!String.IsNullOrEmpty(parent)) PinSourceDirectories(parent);
            sourceDirectories.Add(path, LocalDirectory.Open(path));
        }
        internal byte[] Bytes(string relative, int max)
        {
            string path = Path.GetFullPath(Path.Combine(Root, relative));
            Json.Require(path.StartsWith(Root + "\\", StringComparison.OrdinalIgnoreCase), "BUNDLE_ESCAPE"); PinSourceDirectories(Path.GetDirectoryName(path)); CheckAncestors(path);
            byte[] bytes;
            if (!snapshots.TryGetValue(path, out bytes))
            {
                FileStream stream = LocalDirectory.OpenFile(path, publicationReadback);
                try
                {
                    Json.Require(stream.Length > 0 && stream.Length <= max && snapshotBytes + stream.Length <= 805306368, "BUNDLE_SNAPSHOT_SIZE");
                    bytes = new byte[(int)stream.Length]; int done = 0;
                    while (done < bytes.Length) { int n = stream.Read(bytes, done, bytes.Length - done); Json.Require(n > 0, "BUNDLE_TRUNCATED"); done += n; }
                    stream.Position = 0; held.Add(path, stream); snapshots.Add(path, bytes); snapshotBytes += bytes.Length;
                }
                catch { stream.Dispose(); throw; }
            }
            Json.Require(bytes.Length <= max, "BUNDLE_METADATA_SIZE");
            // Callers cannot alter the validated internal snapshot.
            return (byte[])bytes.Clone();
        }
        internal void Payload()
        {
            Manifest = SigningContract.Read(Bytes("approval/installation-manifest.json", 1048576));
            Json.Require(Json.String(Manifest, "schema") == "agentnexus.q3.installation-manifest.v1" && Json.String(Manifest, "scope") == "QUALIFICATION_ONLY" && !SigningContract.Bool(Manifest, "deployment_approved") && !SigningContract.Bool(Manifest, "production_qualified"), "MANIFEST_SCOPE");
            object[] entries = Manifest["files"] as object[]; Json.Require(entries != null && entries.Length > 0 && entries.Length < 20000, "MANIFEST_FILES");
            HashSet<string> names = new HashSet<string>(StringComparer.OrdinalIgnoreCase); FileCount = 0; TotalBytes = 0;
            foreach (object item in entries)
            {
                Dictionary<string, object> e = item as Dictionary<string, object>; Json.Require(e != null, "MANIFEST_ENTRY"); Json.ExactKeys(e, "path", "target", "bytes", "sha256");
                string rel = Json.String(e, "path");
                Json.Require(Regex.IsMatch(rel, @"\A[A-Za-z0-9_. /-]+\z") && !rel.Split('/').Any(x => x == "" || x == "." || x == ".." || x.EndsWith(".") || x.EndsWith(" ") || Regex.IsMatch(x, @"\A(?i:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)")) && names.Add(rel), "PAYLOAD_PATH_OR_DUPLICATE");
                Json.Require(Json.String(e, "target") == "C:/Program Files/AgentNexus/" + rel, "PAYLOAD_TARGET");
                byte[] snapshot = Bytes("payload/" + rel, 536870912);
                Json.Require(snapshot.Length == Json.Integer(e, "bytes") && Digests.Bytes(snapshot) == Json.String(e, "sha256"), "PAYLOAD_HASH_OR_BYTES");
                FileCount++; TotalBytes = checked(TotalBytes + snapshot.Length);
            }
            RequirePayloadSet(names);
            // Independently validate the app closure against the installation manifest.
            Dictionary<string, object> app = SigningContract.Read(Bytes("payload/app-manifest.json", 1048576));
            Json.Require(Json.String(app, "schema") == "agentnexus.application-manifest.v1", "APP_MANIFEST_SCHEMA");
            HashSet<string> appSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (Dictionary<string, object> e in ((object[])app["files"]).Cast<Dictionary<string, object>>())
            {
                string rel = Json.String(e, "path"); Json.Require(rel.StartsWith("app/", StringComparison.Ordinal) && appSet.Add(rel), "APP_MANIFEST_PATH");
                Dictionary<string, object> installed = entries.Cast<Dictionary<string, object>>().SingleOrDefault(x => Json.String(x, "path") == rel);
                Json.Require(installed != null && Json.String(installed, "sha256") == Json.String(e, "sha256"), "APP_MANIFEST_BINDING");
            }
            Json.Require(appSet.SetEquals(names.Where(x => x.StartsWith("app/", StringComparison.Ordinal))), "APP_MANIFEST_FILE_SET");
        }
        private void RequirePayloadSet(HashSet<string> names)
        {
            HashSet<string> actual = new HashSet<string>(StringComparer.OrdinalIgnoreCase); Stack<string> dirs = new Stack<string>(); dirs.Push(Path.Combine(Root, "payload")); int count = 0;
            while (dirs.Count > 0) foreach (string path in Directory.GetFileSystemEntries(dirs.Pop()))
            {
                Json.Require(++count <= 30000, "PAYLOAD_TREE_LIMIT"); CheckAncestors(path);
                if ((File.GetAttributes(path) & FileAttributes.Directory) != 0) { PinSourceDirectories(path); dirs.Push(path); }
                else actual.Add(path.Substring(Path.Combine(Root, "payload").Length + 1).Replace('\\', '/'));
            }
            Json.Require(actual.SetEquals(names), "PAYLOAD_FILE_SET");
        }
        internal void RecheckSources()
        {
            RequirePreparationNotInterrupted();
            RequirePayloadSet(new HashSet<string>(((object[])Manifest["files"]).Cast<Dictionary<string, object>>().Select(e => Json.String(e, "path")), StringComparer.OrdinalIgnoreCase));
            foreach (KeyValuePair<string, FileStream> item in held)
                Json.Require(item.Value.Length == snapshots[item.Key].Length && Digests.Stream(item.Value) == Digests.Bytes(snapshots[item.Key]), "SNAPSHOT_SOURCE_CHANGED");
        }
        internal void Candidate(string machine, string sid, DateTime now, bool requirePlanSignature)
        {
            RequirePreparationNotInterrupted();
            Payload();
            byte[] configBytes = Bytes("approval/candidate/service-config.json", 65536);
            Configuration = SigningContract.Read(configBytes);
            PlanBytes = Bytes("approval/qualification-plan.json", 262144); Plan = SigningContract.Read(PlanBytes);
            SigningContract.Plan(Plan, machine, sid, now, requirePlanSignature);
            Dictionary<string, object> prepared = SigningContract.Read(Bytes("preparation-complete.json", 16384));
            Json.ExactKeys(prepared, "status", "deployment_id", "policy_epoch", "installation_manifest_sha256");
            Json.Require(Json.String(prepared, "status") == "PREPARATION_COMPLETE_UNSIGNED_NO_INSTALLATION_AUTHORITY" && Json.String(prepared, "deployment_id") == Json.String(Plan, "deployment_id") && Json.Integer(prepared, "policy_epoch") == SigningContract.LocalEpoch && Json.String(prepared, "installation_manifest_sha256") == Json.String(Plan, "installation_manifest_sha256"), "PREPARATION_TRANSACTION_INCOMPLETE");
            Json.Require(Json.String(Configuration, "signing_mode") == SigningContract.Local && Json.Integer(Configuration, "policy_epoch") == SigningContract.LocalEpoch && Json.String(Configuration, "operator_sid") == sid, "LOCAL_CONFIG_MODE");
            SigningContract.NoReal(Configuration);
            Json.Require(Json.String(Configuration, "authority_certificate_sha256") == Json.String(Plan, "signer_certificate_der_sha256") && Json.String(Configuration, "signer_id") == Json.String(Plan, "signer_id"), "CONFIG_SIGNER_BINDING");
            Json.Require(SigningContract.Canonical(SigningContract.Read(Bytes("approval/signature-policy.json", 16384))) == SigningContract.Canonical(SigningContract.Policy()), "SIGNATURE_POLICY_SCOPE");
            Json.Require(SigningContract.Canonical(SigningContract.Read(Bytes("approval/system-changes.json", 16384))) == SigningContract.Canonical(SigningContract.SystemChanges()), "SYSTEM_CHANGE_SCOPE");
            string[] fields = { "installation_manifest_sha256", "service_config_sha256", "signature_policy_sha256", "system_changes_sha256", "installer_sha256", "verifier_sha256", "signer_tool_sha256" };
            string[] paths = { "approval/installation-manifest.json", "approval/candidate/service-config.json", "approval/signature-policy.json", "approval/system-changes.json", "source/tools/agentnexus/install-q41-qualification.ps1", "signer/AgentNexus.Qualification.Verifier.exe", "signer/AgentNexus.Qualification.Signer.exe" };
            for (int i = 0; i < fields.Length; i++) Json.Require(Json.String(Plan, fields[i]) == Digests.Bytes(Bytes(paths[i], 1048576)), "CANDIDATE_HASH_MISMATCH:" + fields[i]);
            Json.Require(Json.Integer(Plan, "payload_files") == FileCount && Json.Integer(Plan, "payload_bytes") == TotalBytes, "PAYLOAD_TOTALS_MISMATCH");
            object[] entries = (object[])Manifest["files"];
            for (int i = 0; i < SigningContract.HashFields.Length; i++)
            {
                string field = SigningContract.HashFields[i], rel = SigningContract.PayloadNames[i];
                string expected = Json.String(entries.Cast<Dictionary<string, object>>().Single(e => Json.String(e, "path") == rel), "sha256");
                Json.Require(Json.String(Configuration, field) == expected && Json.String(Plan, field) == expected, "CONFIG_PAYLOAD_HASH_MISMATCH");
            }
            foreach (string field in new[] { "qualification_test_approval_ref", "real_import_enabled", "live_enabled", "real_import_approval_ref", "live_approval_ref" }) Json.Require(Object.Equals(Configuration[field], Plan[field]), "CONFIG_PLAN_BINDING");
            object[] tests = Plan["tests"] as object[]; Json.Require(tests != null, "TESTS_REQUIRED");
            Deployment.RequireQualificationNames(tests.Cast<Dictionary<string, object>>().Select(t => Json.String(t, "name")));
            foreach (Dictionary<string, object> t in tests.Cast<Dictionary<string, object>>()) Deployment.RequireTestResult("QUALIFICATION_ONLY", Json.String(t, "observed_result"));
            Dictionary<string, object> launch = SigningContract.Read(Bytes("payload/launcher-plan.json", 16384));
            Json.Require(Json.String(launch, "schema") == "agentnexus.launcher-plan.v1" && Json.String(launch, "machine_id") == machine && Json.String(launch, "operator_sid") == sid && Json.Integer(launch, "policy_epoch") == SigningContract.LocalEpoch && Json.String(launch, "expires_at_utc") == Json.String(Plan, "expires_at_utc") && SigningContract.ApprovalRef(Json.String(launch, "approval_ref")), "LAUNCH_PLAN_BINDING");
            Json.Require(SigningContract.Utc(Json.String(launch, "expires_at_utc")) > now && Json.String(launch, "helper_sha256") == Json.String(Configuration, "helper_sha256") && Json.String(launch, "launcher_sha256") == Json.String(Configuration, "launcher_sha256"), "LAUNCH_PLAN_EXPIRY_OR_HASH");
            if (requirePlanSignature)
            {
                PlanSignature = Bytes("approval/qualification-plan.p7s", 131072);
                X509Certificate2 cert = SigningContract.Cms(PlanBytes, PlanSignature, Json.String(Plan, "signer_certificate_der_sha256"), Json.String(Plan, "signer_id"), SigningContract.Local, now);
                SigningContract.CertificateWindow(cert, Plan);
                Completion("qualification-plan", PlanBytes, PlanSignature);
            }
        }
        internal void Verify(string pin, string machine, string sid, DateTime now)
        {
            Json.Require(Digests.IsHash(pin), "INDEPENDENT_PIN_REQUIRED"); Candidate(machine, sid, now, true);
            Json.Require(pin == Json.String(Plan, "signer_certificate_der_sha256"), "INDEPENDENT_PIN_MISMATCH");
            ApprovalBytes = Bytes("approval/deployment-approval.json", 65536); DeploymentApproval = SigningContract.Read(ApprovalBytes);
            ApprovalSignature = Bytes("approval/deployment-approval.p7s", 131072);
            SigningContract.Cms(ApprovalBytes, ApprovalSignature, pin, Json.String(Plan, "signer_id"), SigningContract.Local, now);
            SigningContract.Approval(DeploymentApproval, Plan, PlanBytes, PlanSignature, now, true);
            Completion("deployment-approval", ApprovalBytes, ApprovalSignature);
        }
        private void Completion(string name, byte[] content, byte[] signature)
        {
            Dictionary<string, object> r = SigningContract.Read(Bytes("approval/" + name + ".signing-result.json", 16384));
            Json.ExactKeys(r, "status", "content_sha256", "signature_sha256", "certificate_der_sha256", "authenticode", "deployment_executed");
            Json.Require(Json.String(r, "status") == "SIGNED_CMS_ONLY" && Json.String(r, "content_sha256") == Digests.Bytes(content) && Json.String(r, "signature_sha256") == Digests.Bytes(signature) && Json.String(r, "certificate_der_sha256") == Json.String(Plan, "signer_certificate_der_sha256") && Json.String(r, "authenticode") == "NOT_GRANTED" && !SigningContract.Bool(r, "deployment_executed"), "SIGNING_TRANSACTION_INCOMPLETE");
        }
        private void RequirePreparationNotInterrupted()
        {
            try { File.GetAttributes(Path.Combine(Root, "preparation-INCOMPLETE.json")); throw new PolicyException("PREPARATION_TRANSACTION_INCOMPLETE"); }
            catch (FileNotFoundException) { }
        }
        internal void CopyHeld(string relative, string to)
        {
            LocalPaths.Require(to);
            byte[] snapshot; Json.Require(snapshots.TryGetValue(Path.GetFullPath(Path.Combine(Root, relative)), out snapshot), "LOCKED_COPY_REQUIRED");
            Directory.CreateDirectory(Path.GetDirectoryName(to));
            using (FileStream target = new FileStream(to, FileMode.CreateNew, FileAccess.Write, FileShare.None)) { target.Write(snapshot, 0, snapshot.Length); target.Flush(true); }
        }
        internal void Export(string destination, byte[] reviewed, byte[] signature, bool deployment)
        {
            LocalPaths.Require(destination); RecheckSources();
            string pin = Json.String(Plan, "signer_certificate_der_sha256"), subject = Json.String(Plan, "signer_id");
            Dictionary<string, object> final = SigningContract.Read(reviewed);
            if (deployment) SigningContract.Approval(final, Plan, PlanBytes, PlanSignature, DateTime.UtcNow, true);
            else
            {
                Dictionary<string, object> expected = SigningContract.Read(PlanBytes); expected["user_confirmed"] = true;
                Json.Require(SigningContract.Canonical(final) == SigningContract.Canonical(expected), "REVIEWED_SNAPSHOT_MISMATCH");
                SigningContract.Plan(final, Json.String(Plan, "machine_id"), Json.String(Plan, "operator_sid"), DateTime.UtcNow, true);
            }
            X509Certificate2 certificate = SigningContract.Cms(reviewed, signature, pin, subject, SigningContract.Local, DateTime.UtcNow);
            SigningContract.CertificateWindow(certificate, Plan);
            using (AtomicOutput output = new AtomicOutput(destination))
            {
                string name = deployment ? "deployment-approval" : "qualification-plan";
                foreach (string path in held.Keys.ToArray())
                {
                    string rel = path.Substring(Root.Length + 1).Replace('\\', '/');
                    if (rel.StartsWith("approval/" + name + ".", StringComparison.Ordinal)) continue;
                    output.Write(rel, snapshots[path]);
                    Probe("after-first-file");
                }
                Probe("after-input-copy");
                output.Write("approval/" + name + ".json", reviewed);
                output.Write("approval/" + name + ".p7s", signature);
                Dictionary<string, object> audit = SigningContract.CertificateMetadata(certificate);
                audit["signed_at_utc_local_clock"] = DateTime.UtcNow.ToString("o"); audit["trusted_timestamp"] = false;
                audit["cms_digest_oid"] = "2.16.840.1.101.3.4.2.1"; audit["cms_signature_oid"] = DetachedDer.SignatureAlgorithm(signature);
                audit["snapshot_sha256"] = Digests.Bytes(reviewed); audit["output_readback_verified"] = true;
                output.Write("approval/" + name + ".signing-audit.json", Fixed.Utf8.GetBytes(Json.Encode(audit)));
                output.Check();
                // Read the actual output and check its hashes, CMS and semantic bindings BEFORE publishing success.
                using (QualificationBundle check = new QualificationBundle(output.Root, true))
                {
                    check.Candidate(Json.String(Plan, "machine_id"), Json.String(Plan, "operator_sid"), DateTime.UtcNow, deployment);
                    SigningContract.Cms(check.Bytes("approval/" + name + ".json", 262144), check.Bytes("approval/" + name + ".p7s", 131072), pin, subject, SigningContract.Local, DateTime.UtcNow);
                    if (deployment) SigningContract.Approval(SigningContract.Read(check.Bytes("approval/" + name + ".json", 65536)), check.Plan, check.PlanBytes, check.PlanSignature, DateTime.UtcNow, true);
                }
                RecheckSources(); SigningContract.Time(Plan, DateTime.UtcNow);
                Probe("before-marker");
                // Last publication write. Partial output is preserved and never automatically resumed.
                output.Write("approval/" + name + ".signing-result.json", Fixed.Utf8.GetBytes(Json.Encode(new Dictionary<string, object> { { "status", "SIGNED_CMS_ONLY" }, { "content_sha256", Digests.Bytes(reviewed) }, { "signature_sha256", Digests.Bytes(signature) }, { "certificate_der_sha256", pin }, { "authenticode", "NOT_GRANTED" }, { "deployment_executed", false } })));
                Probe("after-marker");
                output.Check();
                using (QualificationBundle check = new QualificationBundle(output.Root, true))
                {
                    if (deployment) check.Verify(pin, Json.String(Plan, "machine_id"), Json.String(Plan, "operator_sid"), DateTime.UtcNow);
                    else check.Candidate(Json.String(Plan, "machine_id"), Json.String(Plan, "operator_sid"), DateTime.UtcNow, true);
                }
                SigningContract.Time(Plan, DateTime.UtcNow); SigningContract.Certificate(certificate, pin, subject, SigningContract.Local, DateTime.UtcNow);
            }
        }
        internal static void WriteNew(string path, byte[] content)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            using (FileStream stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None)) { stream.Write(content, 0, content.Length); stream.Flush(true); }
        }
        public void Dispose() { foreach (FileStream stream in held.Values) stream.Dispose(); foreach (SafeFileHandle handle in sourceDirectories.Values) handle.Dispose(); held.Clear(); sourceDirectories.Clear(); snapshots.Clear(); snapshotBytes = 0; }
    }

    internal static class LocalPaths
    {
        internal static string Require(string path)
        {
            // Reject before any filesystem operation, including Exists/attributes and UNC authentication.
            Json.Require(!String.IsNullOrEmpty(path) && Regex.IsMatch(path, @"\A[A-Za-z]:[\\/]") && path.IndexOf(':', 2) < 0 && !path.Any(c => c < 32), "LOCAL_ABSOLUTE_PATH_REQUIRED");
            string full = Path.GetFullPath(path);
            DriveType type = new DriveInfo(full.Substring(0, 3)).DriveType;
            Json.Require(type == DriveType.Fixed || type == DriveType.Removable, "LOCAL_DRIVE_REQUIRED");
            return full;
        }
    }

    // Pin directory identities without changing ACLs. File creation itself is always CreateNew.
    internal sealed class AtomicOutput : IDisposable
    {
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "CreateDirectoryW")]
        private static extern bool CreateDirectoryNew(string path, IntPtr security);
        internal readonly string Root;
        private readonly Dictionary<string, SafeFileHandle> directories = new Dictionary<string, SafeFileHandle>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, FileStream> files = new Dictionary<string, FileStream>(StringComparer.OrdinalIgnoreCase);
        private readonly Dictionary<string, string> hashes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        internal AtomicOutput(string path)
        {
            Root = LocalPaths.Require(path).TrimEnd('\\');
            try
            {
                string parent = Path.GetDirectoryName(Root);
                PinAncestors(parent);
                Json.Require(CreateDirectoryNew(Root, IntPtr.Zero), "OUTPUT_MUST_BE_NEW"); Pin(Root);
            }
            catch { Dispose(); throw; }
        }
        private void Pin(string path)
        {
            if (directories.ContainsKey(path)) return;
            directories.Add(path, LocalDirectory.Open(path));
        }
        private void PinAncestors(string path)
        {
            string parent = Path.GetDirectoryName(path); if (!String.IsNullOrEmpty(parent)) PinAncestors(parent); Pin(path);
        }
        private void NewSubdirectory(string path)
        {
            if (directories.ContainsKey(path)) return;
            Json.Require(path.StartsWith(Root + "\\", StringComparison.OrdinalIgnoreCase), "OUTPUT_ESCAPE");
            NewSubdirectory(Path.GetDirectoryName(path));
            Json.Require(CreateDirectoryNew(path, IntPtr.Zero), "OUTPUT_DIRECTORY_RACE_OR_EXISTS"); Pin(path);
        }
        internal void Write(string relative, byte[] bytes)
        {
            string path = Path.GetFullPath(Path.Combine(Root, relative));
            Json.Require(path.StartsWith(Root + "\\", StringComparison.OrdinalIgnoreCase), "OUTPUT_ESCAPE");
            NewSubdirectory(Path.GetDirectoryName(path));
            FileStream stream = new FileStream(path, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.Read);
            files.Add(path, stream); hashes.Add(path, Digests.Bytes(bytes));
            stream.Write(bytes, 0, bytes.Length); stream.Flush(true); stream.Position = 0;
            Json.Require(stream.Length == bytes.Length && Digests.Stream(stream) == hashes[path], "OUTPUT_READBACK_MISMATCH");
        }
        internal void Check()
        {
            HashSet<string> actual = new HashSet<string>(StringComparer.OrdinalIgnoreCase); Stack<string> pending = new Stack<string>(); pending.Push(Root);
            while (pending.Count > 0) foreach (string path in Directory.GetFileSystemEntries(pending.Pop()))
            {
                QualificationBundle.CheckAncestors(path);
                if ((File.GetAttributes(path) & FileAttributes.Directory) != 0) { Json.Require(directories.ContainsKey(path), "OUTPUT_EXTRA_DIRECTORY"); pending.Push(path); }
                else actual.Add(path);
            }
            Json.Require(actual.SetEquals(files.Keys), "OUTPUT_FILE_SET_MISMATCH");
            foreach (KeyValuePair<string, FileStream> item in files) Json.Require(Digests.Stream(item.Value) == hashes[item.Key], "OUTPUT_READBACK_MISMATCH");
        }
        public void Dispose() { foreach (FileStream stream in files.Values) stream.Dispose(); foreach (SafeFileHandle handle in directories.Values) handle.Dispose(); files.Clear(); directories.Clear(); }
    }

    internal static class LocalDirectory
    {
        [StructLayout(LayoutKind.Sequential)] private struct Information
        {
            internal uint Attributes; internal System.Runtime.InteropServices.ComTypes.FILETIME Created, Accessed, Written;
            internal uint VolumeSerial, SizeHigh, SizeLow, Links, IndexHigh, IndexLow;
        }
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "CreateFileW")]
        private static extern SafeFileHandle OpenHandle(string path, uint access, uint share, IntPtr security, uint disposition, uint flags, IntPtr template);
        [DllImport("kernel32.dll", SetLastError = true)] private static extern bool GetFileInformationByHandle(SafeFileHandle handle, out Information info);
        internal static SafeFileHandle Open(string path)
        {
            LocalPaths.Require(path);
            // Share READ only: deny directory write handles (including SET_REPARSE_POINT) as well as rename/delete.
            // FILE_LIST_DIRECTORY is essential: an attributes-only handle does not enforce sharing against a writer.
            SafeFileHandle handle = OpenHandle(path, 0x81, 1, IntPtr.Zero, 3, 0x02200000, IntPtr.Zero);
            Information info;
            if (handle.IsInvalid || !GetFileInformationByHandle(handle, out info) || (info.Attributes & 0x10) == 0 || (info.Attributes & 0x400) != 0)
            { int error = Marshal.GetLastWin32Error(); handle.Dispose(); if (error == 2 || error == 3) throw new DirectoryNotFoundException(); throw new PolicyException("LOCAL_NONREPARSE_DIRECTORY_LOCK_REQUIRED"); }
            return handle;
        }
        internal static FileStream OpenFile(string path, bool publicationReadback)
        {
            // Do not follow a leaf symlink even if replaced after the pathname check.
            SafeFileHandle handle = OpenHandle(path, 0x80000000, publicationReadback ? 3U : 1U, IntPtr.Zero, 3, 0x00200000, IntPtr.Zero);
            Information info;
            if (handle.IsInvalid || !GetFileInformationByHandle(handle, out info) || (info.Attributes & 0x410) != 0)
            {
                int error = Marshal.GetLastWin32Error(); handle.Dispose();
                if (error == 2) throw new FileNotFoundException(); if (error == 3) throw new DirectoryNotFoundException();
                throw new PolicyException("LOCAL_NONREPARSE_FILE_REQUIRED");
            }
            try { return new FileStream(handle, FileAccess.Read); } catch { handle.Dispose(); throw; }
        }
    }

    // Check actual CMS EncapsulatedContentInfo, independent of SignedCms.Detached
    // constructor state. The project emits definite-length DER, not arbitrary BER.
    internal sealed class DetachedDer
    {
        private readonly byte[] bytes; private int at, end;
        private DetachedDer(byte[] b, int start, int limit) { bytes = b; at = start; end = limit; }
        private DetachedDer Take(int tag)
        {
            Json.Require(at + 2 <= end && bytes[at++] == tag, "CMS_DER_STRUCTURE");
            int size = bytes[at++];
            if ((size & 128) != 0)
            {
                int count = size & 127; Json.Require(count > 0 && count <= 4 && at + count <= end && bytes[at] != 0, "CMS_DER_LENGTH"); size = 0;
                for (int i = 0; i < count; i++) { Json.Require(size <= (Int32.MaxValue >> 8), "CMS_DER_LENGTH"); size = (size << 8) | bytes[at++]; }
                Json.Require(size >= 128, "CMS_DER_LENGTH");
            }
            Json.Require(size <= end - at, "CMS_DER_TRUNCATED"); int start = at; at += size; return new DetachedDer(bytes, start, at);
        }
        internal static void Require(byte[] bytes)
        {
            Json.Require(bytes != null && bytes.Length > 0 && bytes.Length <= 131072, "CMS_SIZE");
            DetachedDer root = new DetachedDer(bytes, 0, bytes.Length), ci = root.Take(0x30);
            Json.Require(root.at == root.end, "CMS_DER_TRAILING"); ci.Take(0x06);
            DetachedDer wrapper = ci.Take(0xa0), signed = wrapper.Take(0x30);
            Json.Require(ci.at == ci.end && wrapper.at == wrapper.end, "CMS_DER_STRUCTURE");
            signed.Take(0x02); signed.Take(0x31); DetachedDer content = signed.Take(0x30); content.Take(0x06);
            Json.Require(content.at == content.end, "DETACHED_CMS_REQUIRED");
        }
        internal static string SignatureAlgorithm(byte[] bytes)
        {
            Require(bytes);
            DetachedDer root = new DetachedDer(bytes, 0, bytes.Length), ci = root.Take(0x30); ci.Take(0x06);
            DetachedDer signed = ci.Take(0xa0).Take(0x30); signed.Take(0x02); signed.Take(0x31); signed.Take(0x30);
            while (signed.at < signed.end && (bytes[signed.at] == 0xa0 || bytes[signed.at] == 0xa1)) signed.Take(bytes[signed.at]);
            DetachedDer infos = signed.Take(0x31), info = infos.Take(0x30); info.Take(0x02); info.Take(bytes[info.at]); info.Take(0x30);
            if (info.at < info.end && bytes[info.at] == 0xa0) info.Take(0xa0);
            DetachedDer algorithm = info.Take(0x30), oid = algorithm.Take(0x06);
            string encoded = BitConverter.ToString(bytes, oid.at, oid.end - oid.at).Replace("-", "");
            if (encoded == "2A864886F70D010101") return "1.2.840.113549.1.1.1";
            if (encoded == "2A864886F70D01010B") return "1.2.840.113549.1.1.11";
            return "UNSUPPORTED";
        }
    }
}
