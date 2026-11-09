"""Apply the bounded signing integration to the copied Q3 source, never history."""
from pathlib import Path
BASE = Path(__file__).resolve().parents[1] / 'source'
p = BASE / 'native/credential-service/Common.cs'
t = p.read_text('utf-8')
old = 'Dictionary<string, object> result = Serializer().DeserializeObject(text) as Dictionary<string, object>;'
assert t.count(old) == 1
t = t.replace(old, 'new UniqueJson(text).Check();\n                ' + old)
old = '            EvidenceHash = Digests.Bytes(evidence);'
assert t.count(old) == 1
t = t.replace(old, '''            if (config.ContainsKey("signing_mode") && Json.String(config, "signing_mode") == SigningContract.Local)
                VerifyLocalInstalled(document, evidence, signature);
            EvidenceHash = Digests.Bytes(evidence);''')
old = '''            string pin = Json.String(config, "authority_certificate_sha256");
            Json.Require(Digests.IsHash(pin), "QUALIFICATION_AUTHORITY_UNCONFIGURED");'''
assert t.count(old) == 1
t = t.replace(old, '''            string pin = Json.String(config, "authority_certificate_sha256");
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
            }''')
old = '''            Json.Require(Digests.Bytes(certificate.RawData) == pin && certificate.NotBefore.ToUniversalTime() <= DateTime.UtcNow && certificate.NotAfter.ToUniversalTime() > DateTime.UtcNow, "QUALIFICATION_SIGNER_REJECTED");'''
assert t.count(old) == 1
t = t.replace(old, old + '''
            // Applies even to legacy configs without a signing_mode field.
            // A local-purpose key can never enter QUALIFIED through the old verifier.
            SigningContract.Certificate(certificate, pin, certificate.Subject, SigningContract.Production, DateTime.UtcNow);''')
old = '        internal Dictionary<string, object> VerifiedConsents()'
assert t.count(old) == 1
t = t.replace(old, '''        private void VerifyLocalInstalled(Dictionary<string, object> plan, byte[] evidence, byte[] signature)
        {
            SigningContract.Plan(plan, MachineId, OperatorSid, DateTime.UtcNow, true);
            Json.Require(Mode == "QUALIFICATION_ONLY" && !Qualified && PolicyEpoch == SigningContract.LocalEpoch, "LOCAL_CANNOT_BECOME_PRODUCTION");
            SigningContract.NoReal(config);
            Json.Require(Json.String(plan, "signer_certificate_der_sha256") == Json.String(config, "authority_certificate_sha256") && Json.String(plan, "signer_id") == Json.String(config, "signer_id"), "LOCAL_RUNTIME_SIGNER_BINDING");
            byte[] manifestBytes = LockRead(Fixed.DataRoot + @"\\installation-manifest.json", true, 1048576);
            byte[] policyBytes = LockRead(Fixed.DataRoot + @"\\signature-policy.json", true, 16384);
            byte[] changesBytes = LockRead(Fixed.DataRoot + @"\\system-changes.json", true, 16384);
            Json.Require(Json.String(plan, "installation_manifest_sha256") == Digests.Bytes(manifestBytes) && Json.String(plan, "service_config_sha256") == Digests.Bytes(LockRead(Fixed.ConfigFile, true, 65536)) && Json.String(plan, "signature_policy_sha256") == Digests.Bytes(policyBytes) && Json.String(plan, "system_changes_sha256") == Digests.Bytes(changesBytes), "LOCAL_RUNTIME_METADATA_HASH");
            Json.Require(SigningContract.Canonical(SigningContract.Read(policyBytes)) == SigningContract.Canonical(SigningContract.Policy()) && SigningContract.Canonical(SigningContract.Read(changesBytes)) == SigningContract.Canonical(SigningContract.SystemChanges()), "LOCAL_RUNTIME_SCOPE");
            byte[] approvalBytes = LockRead(Fixed.DataRoot + @"\\deployment-approval.json", true, 65536);
            byte[] approvalSignature = LockRead(Fixed.DataRoot + @"\\deployment-approval.p7s", true, 131072);
            SigningContract.Cms(approvalBytes, approvalSignature, Json.String(config, "authority_certificate_sha256"), Json.String(config, "signer_id"), SigningContract.Local, DateTime.UtcNow);
            SigningContract.Approval(SigningContract.Read(approvalBytes), plan, evidence, signature, DateTime.UtcNow, true);
            Dictionary<string, object> manifest = SigningContract.Read(manifestBytes);
            Json.Require(Json.String(manifest, "schema") == "agentnexus.q3.installation-manifest.v1" && Json.String(manifest, "scope") == "QUALIFICATION_ONLY" && !SigningContract.Bool(manifest, "production_qualified"), "LOCAL_RUNTIME_MANIFEST");
            object[] files = manifest["files"] as object[]; Json.Require(files != null, "LOCAL_RUNTIME_FILES");
            HashSet<string> names = new HashSet<string>(StringComparer.OrdinalIgnoreCase); int total = 0;
            foreach (Dictionary<string, object> file in files.Cast<Dictionary<string, object>>())
            {
                string relative = Json.String(file, "path");
                Json.Require(Regex.IsMatch(relative, @"\\A[A-Za-z0-9_. /-]+\\z") && !relative.Split('/').Any(x => x == "" || x == "." || x == ".." || x.EndsWith(".") || x.EndsWith(" ")) && names.Add(relative), "LOCAL_RUNTIME_PATH");
                string path = Fixed.InstallRoot + "\\\\" + relative.Replace('/', '\\\\');
                CheckPath(path, false, false);
                FileStream stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read); lockedFiles.Add(stream);
                Json.Require(stream.Length == Json.Integer(file, "bytes") && Digests.Stream(stream) == Json.String(file, "sha256"), "LOCAL_RUNTIME_PAYLOAD_HASH");
                total = checked(total + (int)stream.Length);
            }
            Json.Require(files.Length == Json.Integer(plan, "payload_files") && total == Json.Integer(plan, "payload_bytes"), "LOCAL_RUNTIME_TOTALS");
            HashSet<string> actual = CheckTree(Fixed.InstallRoot);
            Json.Require(actual.SetEquals(names.Select(n => Fixed.InstallRoot + "\\\\" + n.Replace('/', '\\\\'))), "LOCAL_RUNTIME_FILE_SET");
            Dictionary<string, object> receipt = SigningContract.Read(LockRead(Fixed.DataRoot + @"\\installation-receipt.json", true, 16384));
            Json.Require(Json.String(receipt, "deployment_id") == Json.String(plan, "deployment_id") && Json.Integer(receipt, "policy_epoch") == SigningContract.LocalEpoch && Json.String(receipt, "approval_sha256") == Digests.Bytes(approvalBytes), "LOCAL_RUNTIME_CONSUMPTION_RECEIPT");
        }
''' + old)
p.write_text(t, encoding='utf-8', newline='\n')
print('Integrated shared CMS, distinct certificate purpose, local runtime checks and strict JSON.')
