// USER-RUN ONLY in a signing device/security principal inaccessible to the agent.
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
using System.Windows.Forms;

namespace AgentNexus.CredentialBoundary
{
    internal static class UserConsent
    {
        // The production GUI and diagnostic harness share this authorization boundary.
        internal static bool Run(Func<bool> confirm, Action authorized)
        {
            if (!confirm()) return false;
            authorized(); return true;
        }
    }
    internal static class UserCng
    {
        [StructLayout(LayoutKind.Sequential)] private struct ProviderInfo
        {
            internal IntPtr Container, Provider; internal uint ProviderType, Flags, Count; internal IntPtr Parameters; internal uint KeySpec;
        }
        [DllImport("crypt32.dll", SetLastError = true)] private static extern bool CertGetCertificateContextProperty(IntPtr context, uint property, IntPtr data, ref uint length);
        internal static Dictionary<string, object> Association(X509Certificate2 cert)
        {
            uint size = 0;
            Json.Require(CertGetCertificateContextProperty(cert.Handle, 2, IntPtr.Zero, ref size) && size > 0 && size < 65536, "USER_CNG_ASSOCIATION_REQUIRED");
            IntPtr memory = Marshal.AllocHGlobal((int)size);
            try
            {
                Json.Require(CertGetCertificateContextProperty(cert.Handle, 2, memory, ref size), "USER_CNG_ASSOCIATION_REQUIRED");
                ProviderInfo info = (ProviderInfo)Marshal.PtrToStructure(memory, typeof(ProviderInfo));
                Json.Require(info.ProviderType == 0 && info.KeySpec == UInt32.MaxValue && (info.Flags & 0x20) == 0, "USER_CNG_ASSOCIATION_REQUIRED");
                string provider = Marshal.PtrToStringUni(info.Provider), container = Marshal.PtrToStringUni(info.Container);
                Json.Require(new[] { "Microsoft Software Key Storage Provider", "Microsoft Platform Crypto Provider", "Microsoft Smart Card Key Storage Provider" }.Contains(provider) && !String.IsNullOrEmpty(container), "UNREVIEWED_CNG_PROVIDER");
                return new Dictionary<string, object> { { "provider", provider }, { "container", container } };
            }
            finally { Marshal.FreeHGlobal(memory); }
        }
        internal static Dictionary<string, object> Inspect(CngKey key)
        {
            Json.Require(!key.IsMachineKey && key.ExportPolicy == CngExportPolicies.None && key.AlgorithmGroup == CngAlgorithmGroup.Rsa && (key.KeyUsage & CngKeyUsages.Signing) != 0, "NONEXPORTABLE_USER_SIGNING_CNG_KEY_REQUIRED");
            CngUIProtectionLevels protection = key.UIPolicy.ProtectionLevel;
            Json.Require((protection & CngUIProtectionLevels.ForceHighProtection) != 0, "CNG_HIGH_PROTECTION_POLICY_REQUIRED");
            return new Dictionary<string, object> {
                { "provider", key.Provider.Provider }, { "container", key.KeyName }, { "unique_container", key.UniqueName }, { "export_policy", key.ExportPolicy.ToString() },
                { "ui_protection", protection.ToString() }, { "key_usage", key.KeyUsage.ToString() }, { "machine_key", key.IsMachineKey },
                { "actual_per_signature_prompt", "NOT_RUN_REQUIRES_USER_OBSERVATION" }, { "same_sid_resistance", "INCONCLUSIVE" }
            };
        }
        internal static void MatchPublicKey(RSA key, X509Certificate2 cert)
        {
            // Export PUBLIC parameters only; no private parameter/PFX export exists.
            using (RSA expected = cert.GetRSAPublicKey())
            {
                RSAParameters a = key.ExportParameters(false), b = expected.ExportParameters(false);
                Json.Require(a.Modulus.SequenceEqual(b.Modulus) && a.Exponent.SequenceEqual(b.Exponent), "PRIVATE_PUBLIC_KEY_MISMATCH");
            }
        }
    }
    internal sealed class SignerWindow : Form
    {
        private readonly TextBox root = new TextBox(), pin = new TextBox(), destination = new TextBox(), phrase = new TextBox();
        private readonly ComboBox stage = new ComboBox();
        private readonly TextBox review = new TextBox { Multiline = true, ScrollBars = ScrollBars.Both };
        private readonly CheckBox isolated = new CheckBox(), targetChecked = new CheckBox();
        private readonly Button load = new Button(), inspect = new Button(), sign = new Button();
        private QualificationBundle bundle;
        private X509Certificate2 certificate;
        private byte[] reviewed;
        private string expectedPhrase, summary;
        private Dictionary<string, object> association, keyDetails;
        private bool deployment;
        internal SignerWindow(string initialRoot)
        {
            Text = "AgentNexus Q4.2 Qualification Signer — 用户独立签发 / LOCAL ONLY";
            ClientSize = new Size(1120, 900); MinimumSize = new Size(1000, 800); Font = new Font("Microsoft YaHei UI", 10F);
            TableLayoutPanel layout = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 2, RowCount = 12, Padding = new Padding(16) };
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 160)); layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            for (int i = 0; i < 4; i++) layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 39));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 44)); layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            foreach (int height in new[] { 44, 44, 43, 44, 48, 42 }) layout.RowStyles.Add(new RowStyle(SizeType.Absolute, height));
            AddRow(layout, 0, "冻结候选目录", root); root.Text = initialRoot ?? "";
            stage.DropDownStyle = ComboBoxStyle.DropDownList; stage.Items.AddRange(new object[] { "1. 仅签署资格计划", "2. 单独签署部署批准（安装后保持停止）" }); stage.SelectedIndex = 0;
            AddRow(layout, 1, "独立授权阶段", stage); AddRow(layout, 2, "独立核对的 DER Pin", pin); pin.MaxLength = 64;
            AddRow(layout, 3, "新的本地输出目录", destination);
            load.Text = "读取文件快照与公开证书（不开私钥、不签名）"; load.Dock = DockStyle.Fill; layout.Controls.Add(load, 0, 4); layout.SetColumnSpan(load, 2);
            review.ReadOnly = true; review.WordWrap = false; review.Font = new Font("Consolas", 10F); review.BackColor = Color.FromArgb(246, 248, 251); review.Dock = DockStyle.Fill;
            layout.Controls.Add(review, 0, 5); layout.SetColumnSpan(review, 2);
            isolated.Text = "我在代理不可访问的独立设备 / 独立安全主体中；同 SID 的另一桌面或会话不足以隔离密钥。";
            targetChecked.Text = "我已独立核对目标 Host / Machine ID / Operator SID / Service SID / Epoch / 完整 Pin / 系统变更。";
            foreach (CheckBox box in new[] { isolated, targetChecked }) { box.Dock = DockStyle.Fill; box.AutoSize = false; }
            layout.Controls.Add(isolated, 0, 6); layout.SetColumnSpan(isolated, 2); layout.Controls.Add(targetChecked, 0, 7); layout.SetColumnSpan(targetChecked, 2);
            AddRow(layout, 8, "键入内容确认短语", phrase);
            inspect.Text = "单独授权读取 CNG 密钥属性（会取得密钥句柄；不签名）"; inspect.Dock = DockStyle.Fill; inspect.Enabled = false;
            layout.Controls.Add(inspect, 0, 9); layout.SetColumnSpan(inspect, 2);
            sign.Text = "另行最终确认并签署当前文档"; sign.Dock = DockStyle.Fill; sign.Enabled = false;
            layout.Controls.Add(sign, 0, 10); layout.SetColumnSpan(sign, 2);
            layout.Controls.Add(new Label { Text = "LOCAL_QUALIFICATION；CMS 不授予 Authenticode、真实 Key / Provider 或安装权限。无自动提升、安装或服务启动。", ForeColor = Color.DarkRed, Dock = DockStyle.Fill }, 0, 11); layout.SetColumnSpan(layout.GetControlFromPosition(0, 11), 2);
            Controls.Add(layout);
            load.Click += delegate { LoadReview(false); }; inspect.Click += delegate { InspectKey(); }; sign.Click += delegate { SignReviewed(); };
            foreach (TextBox input in new[] { root, pin, destination }) input.TextChanged += delegate { ClearReview(); };
            stage.SelectedIndexChanged += delegate { ClearReview(); }; FormClosed += delegate { ClearReview(); };
        }
        private static void AddRow(TableLayoutPanel layout, int row, string title, Control input)
        {
            layout.Controls.Add(new Label { Text = title, Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft }, 0, row); input.Dock = DockStyle.Fill; layout.Controls.Add(input, 1, row);
        }
        internal static string ReadableJson(object value, int level)
        {
            Dictionary<string, object> obj = value as Dictionary<string, object>; string indent = new string(' ', level * 2), child = new string(' ', (level + 1) * 2);
            if (obj != null) return "{\n" + String.Join(",\n", obj.Keys.OrderBy(k => k, StringComparer.Ordinal).Select(k => child + Json.Encode(k) + ": " + ReadableJson(obj[k], level + 1))) + "\n" + indent + "}";
            object[] array = value as object[];
            if (array != null) return "[\n" + String.Join(",\n", array.Select(v => child + ReadableJson(v, level + 1))) + "\n" + indent + "]";
            return Json.Encode(value);
        }
        private void ClearReview()
        {
            sign.Enabled = false; inspect.Enabled = false; if (bundle != null) { bundle.Dispose(); bundle = null; }
            if (certificate != null) { certificate.Dispose(); certificate = null; }
            reviewed = null; association = null; keyDetails = null; expectedPhrase = null; summary = null; phrase.Text = ""; isolated.Checked = false; targetChecked.Checked = false;
        }
        private static X509Certificate2 FindCertificate(string expectedPin)
        {
            X509Certificate2 found = null;
            using (X509Store store = new X509Store(StoreName.My, StoreLocation.CurrentUser))
            {
                store.Open(OpenFlags.ReadOnly | OpenFlags.OpenExistingOnly);
                foreach (X509Certificate2 value in store.Certificates)
                {
                    if (Digests.Bytes(value.RawData) == expectedPin) { Json.Require(found == null, "AMBIGUOUS_CERTIFICATE"); found = new X509Certificate2(value); }
                    value.Dispose();
                }
            }
            Json.Require(found != null && found.HasPrivateKey, "USER_STORE_SIGNING_CERTIFICATE_REQUIRED"); return found;
        }
        private void Display(bool preview)
        {
            string cert = certificate == null ? "PUBLIC CERTIFICATE / CNG: PREVIEW ONLY; NO STORE OR KEY ACCESS" :
                "公开证书（完整 DER Pin 为信任锚）:\n" + ReadableJson(SigningContract.CertificateMetadata(certificate), 0) + "\n\n公开存储关联（不是私钥策略验证）:\n" + ReadableJson(association, 0);
            review.Text = ((preview ? "SIMULATED / UNSIGNED PREVIEW — signing disabled\n\n" : "待签快照；尚未签名、尚未安装\n\n") + summary + "\n\n" + cert +
                "\n\nCNG 属性: " + (keyDetails == null ? "NOT_CHECKED — 需单独授权取得 CNG 密钥句柄；实际提示 / 同 SID 隔离未获证明" : ReadableJson(keyDetails, 0)) +
                "\n\nConfirmation: " + expectedPhrase + "\n\nExact signed UTF-8 JSON (LF):\n" + Fixed.Utf8.GetString(reviewed)).Replace("\r\n", "\n").Replace("\n", "\r\n");
        }
        internal void LoadReview(bool previewOnly)
        {
            try
            {
                ClearReview(); deployment = stage.SelectedIndex == 1;
                bundle = new QualificationBundle(root.Text);
                Dictionary<string, object> draft = SigningContract.Read(bundle.Bytes("approval/qualification-plan.json", 262144));
                bundle.Candidate(Json.String(draft, "machine_id"), Json.String(draft, "operator_sid"), DateTime.UtcNow, deployment);
                if (!previewOnly)
                {
                    Json.Require(Environment.UserInteractive && Digests.IsHash(pin.Text) && pin.Text == Json.String(bundle.Plan, "signer_certificate_der_sha256"), "INDEPENDENT_PIN_AND_USER_SESSION_REQUIRED");
                    certificate = FindCertificate(pin.Text);
                    SigningContract.Certificate(certificate, pin.Text, Json.String(bundle.Plan, "signer_id"), SigningContract.Local, DateTime.UtcNow); SigningContract.CertificateWindow(certificate, bundle.Plan);
                    association = UserCng.Association(certificate);
                }
                else if (File.Exists(Path.Combine(bundle.Root, "signer/SIMULATED-preview-public.cer")))
                {
                    certificate = SigningContract.PublicCertificate(bundle.Bytes("signer/SIMULATED-preview-public.cer", 131072));
                    SigningContract.Certificate(certificate, Json.String(bundle.Plan, "signer_certificate_der_sha256"), Json.String(bundle.Plan, "signer_id"), SigningContract.Local, DateTime.UtcNow);
                    association = new Dictionary<string, object> { { "provider", "NOT_RUN — SIMULATED PUBLIC CERTIFICATE" }, { "container", "NOT_RUN — NO KEY ACCESS IN PREVIEW" } };
                }
                Dictionary<string, object> final = deployment ? ApprovalDraft(bundle.Plan, bundle.PlanBytes, bundle.PlanSignature) : SigningContract.Read(bundle.PlanBytes);
                final["user_confirmed"] = true; if (deployment) final["deployment_approved"] = true;
                if (deployment) SigningContract.Approval(final, bundle.Plan, bundle.PlanBytes, bundle.PlanSignature, DateTime.UtcNow, true);
                else SigningContract.Plan(final, Json.String(draft, "machine_id"), Json.String(draft, "operator_sid"), DateTime.UtcNow, true);
                reviewed = Fixed.Utf8.GetBytes(ReadableJson(final, 0) + "\n"); string hash = Digests.Bytes(reviewed);
                expectedPhrase = (deployment ? "APPROVE DEPLOYMENT " : "SIGN PLAN ") + hash.Substring(hash.Length - 12);
                summary = "Mode: LOCAL_QUALIFICATION / QUALIFICATION_ONLY\nHost: " + final["target_host"] + "\nMachine ID: " + final["machine_id"] + "\nOperator SID: " + final["operator_sid"] + "\nService SID: " + final["service_sid"] +
                    "\nEpoch: " + final["policy_epoch"] + "\nUTC: " + final["issued_at_utc"] + " -> " + final["expires_at_utc"] + "\nManifest SHA256: " + final["installation_manifest_sha256"] +
                    "\nQualification SHA256: " + Digests.Bytes(deployment ? bundle.PlanBytes : reviewed) + "\nActual signed snapshot SHA256: " + hash + "\nFiles / bytes: " + final["payload_files"] + " / " + final["payload_bytes"] +
                    "\nreal_import=false; live_provider=false; production_release=false; real_ledger_migration=false; start_service=false\n\n" + String.Join("\n\n", SigningContract.Changes().Cast<string>());
                Display(previewOnly); inspect.Enabled = !previewOnly;
            }
            catch (Exception e) { ClearReview(); review.Text = "BLOCKED: " + (e is PolicyException ? e.Message : e.GetType().Name); if (!previewOnly) MessageBox.Show(this, review.Text, "拒绝加载", MessageBoxButtons.OK, MessageBoxIcon.Error); }
        }
        private void InspectKey()
        {
            try
            {
                Json.Require(bundle != null && reviewed != null && certificate != null && inspect.Enabled, "REVIEWED_CONTENT_REQUIRED");
                SigningContract.RequireReview(isolated.Checked, targetChecked.Checked, phrase.Text, expectedPhrase); bundle.RecheckSources(); SigningContract.Time(bundle.Plan, DateTime.UtcNow);
                UserConsent.Run(delegate { return MessageBox.Show(this, "只授权读取 CNG 属性；会打开与此证书关联的密钥句柄，可能出现 Provider 提示。此操作没有签名。Silent 不代表该句柄无签名能力。\n\n" + pin.Text, "独立授权：CNG 属性访问", MessageBoxButtons.YesNo, MessageBoxIcon.Warning, MessageBoxDefaultButton.Button2) == DialogResult.Yes; }, delegate {
                    using (CngKey key = CngKey.Open(Json.String(association, "container"), new CngProvider(Json.String(association, "provider")), CngKeyOpenOptions.Silent)) keyDetails = UserCng.Inspect(key);
                    Json.Require(Json.String(keyDetails, "provider") == Json.String(association, "provider") && Json.String(keyDetails, "container") == Json.String(association, "container"), "CNG_ASSOCIATION_MISMATCH");
                    Display(false); sign.Enabled = true;
                });
            }
            catch (Exception e) { keyDetails = null; sign.Enabled = false; MessageBox.Show(this, "BLOCKED: " + (e is PolicyException ? e.Message : e.GetType().Name), "CNG 属性未核验", MessageBoxButtons.OK, MessageBoxIcon.Error); }
        }
        private void SignReviewed()
        {
            try
            {
                Json.Require(bundle != null && reviewed != null && keyDetails != null && sign.Enabled, "REVIEWED_CONTENT_AND_CNG_POLICY_REQUIRED");
                SigningContract.RequireReview(isolated.Checked, targetChecked.Checked, phrase.Text, expectedPhrase);
                string fullDestination = LocalPaths.Require(destination.Text);
                using (QualificationBundle parent = new QualificationBundle(Path.GetDirectoryName(fullDestination)))
                {
                    try { File.GetAttributes(fullDestination); throw new PolicyException("NEW_OUTPUT_DIRECTORY_REQUIRED"); }
                    catch (FileNotFoundException) { }
                }
                bundle.RecheckSources(); SigningContract.Time(bundle.Plan, DateTime.UtcNow);
                SigningContract.Certificate(certificate, pin.Text, Json.String(bundle.Plan, "signer_id"), SigningContract.Local, DateTime.UtcNow); SigningContract.CertificateWindow(certificate, bundle.Plan);
                if (!UserConsent.Run(delegate { return MessageBox.Show(this, "另行最终签名授权：只签署上方快照。\n" + expectedPhrase + "\n完整 Pin: " + pin.Text + "\n\n已显示实际 CNG Export / UI Policy；策略不等于已证明每次提示或同 SID 隔离。继续后才执行实际签名；此前密钥属性访问已有单独授权。程序不会安装或启动服务。", "最终用户签名确认", MessageBoxButtons.YesNo, MessageBoxIcon.Warning, MessageBoxDefaultButton.Button2) == DialogResult.Yes; }, delegate {
                    bundle.RecheckSources();
                    SigningContract.Time(bundle.Plan, DateTime.UtcNow);
                    SigningContract.Certificate(certificate, pin.Text, Json.String(bundle.Plan, "signer_id"), SigningContract.Local, DateTime.UtcNow);
                    using (RSA rsa = certificate.GetRSAPrivateKey())
                    {
                        RSACng cng = rsa as RSACng; Json.Require(cng != null, "USER_CNG_KEY_REQUIRED");
                        Json.Require(SigningContract.Canonical(UserCng.Inspect(cng.Key)) == SigningContract.Canonical(keyDetails), "CNG_POLICY_CHANGED"); UserCng.MatchPublicKey(rsa, certificate);
                        SignedCms cms = new SignedCms(new ContentInfo(reviewed), true);
                        // Framework 4.8 resolves the certificate's CNG association itself; it has no CmsSigner.PrivateKey setter.
                        // Keep the inspected handle alive and verify the resulting CMS against the exact public DER.
                        CmsSigner signer = new CmsSigner(SubjectIdentifierType.IssuerAndSerialNumber, certificate) { DigestAlgorithm = new Oid("2.16.840.1.101.3.4.2.1"), IncludeOption = X509IncludeOption.EndCertOnly };
                        signer.SignedAttributes.Add(new Pkcs9SigningTime(DateTime.UtcNow));
                        cms.ComputeSignature(signer, false); byte[] signature = cms.Encode();
                        SigningContract.Time(bundle.Plan, DateTime.UtcNow); SigningContract.Cms(reviewed, signature, pin.Text, certificate.Subject, SigningContract.Local, DateTime.UtcNow);
                        bundle.Export(destination.Text, reviewed, signature, deployment);
                    }
                })) return;
                MessageBox.Show(this, "CMS 和输出整包已重新读取验证；未安装、未授予 Authenticode 或生产权限。", "签署完成", MessageBoxButtons.OK, MessageBoxIcon.Information); ClearReview();
            }
            catch (Exception e) { sign.Enabled = false; MessageBox.Show(this, "BLOCKED: " + (e is PolicyException ? e.Message : e.GetType().Name) + "\n保留半成品；不得复用、自动恢复或用于部署。", "签署未完成", MessageBoxButtons.OK, MessageBoxIcon.Error); }
        }
        internal static Dictionary<string, object> ApprovalDraft(Dictionary<string, object> plan, byte[] planBytes, byte[] signature)
        {
            Dictionary<string, object> a = new Dictionary<string, object>();
            foreach (string field in new[] { "signing_mode", "installation_manifest_sha256", "service_config_sha256", "signature_policy_sha256", "system_changes_sha256", "installer_sha256", "verifier_sha256", "signer_tool_sha256", "payload_files", "payload_bytes", "machine_id", "operator_sid", "service_sid", "target_host", "policy_epoch", "deployment_id", "issued_at_utc", "expires_at_utc", "signer_id", "signer_certificate_der_sha256", "real_import", "live_provider", "production_release", "real_ledger_migration", "real_import_enabled", "live_enabled", "real_import_approval_ref", "live_approval_ref" }) a.Add(field, plan[field]);
            a.Add("schema", "agentnexus.q41.deployment-approval.v1"); a.Add("scope", "QUALIFICATION_ONLY"); a.Add("deployment_approved", false); a.Add("start_service", false);
            a.Add("approval_ref", "APPROVED-Q42-DEPLOY-" + Json.String(plan, "deployment_id")); a.Add("qualification_sha256", Digests.Bytes(planBytes)); a.Add("qualification_signature_sha256", Digests.Bytes(signature)); a.Add("user_confirmed", false); a.Add("confirmation_kind", "DEPLOYMENT_APPROVAL"); return a;
        }
    }
    internal static class SignerProgram
    {
        [STAThread] private static int Main(string[] args)
        {
            try
            {
                Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
                // Preview has no store/key/signing path. It accepts only a local synthetic audit fixture.
                if (args.Length == 3 && args[0] == "--render-preview")
                {
                    string output = LocalPaths.Require(args[2]);
                    using (SignerWindow window = new SignerWindow(args[1]))
                    {
                        window.LoadReview(true); window.Show(); Application.DoEvents(); window.PerformLayout(); window.Refresh();
                        using (QualificationBundle parent = new QualificationBundle(Path.GetDirectoryName(output)))
                        using (Bitmap bitmap = new Bitmap(window.Width, window.Height))
                        using (MemoryStream png = new MemoryStream()) { window.DrawToBitmap(bitmap, window.ClientRectangle); bitmap.Save(png, System.Drawing.Imaging.ImageFormat.Png); QualificationBundle.WriteNew(output, png.ToArray()); }
                    }
                    return 0;
                }
                Json.Require(args.Length <= 1, "NO_AUTOMATIC_SIGNING_ARGUMENTS_SUPPORTED");
                using (SignerWindow window = new SignerWindow(args.Length == 1 ? args[0] : "")) Application.Run(window); return 0;
            }
            catch { return 21; }
        }
    }
}
