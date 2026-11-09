// This GUI is run manually by the user in an isolated signing session/device.
// The development agent must never run its signing path or access its user key.
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
using System.Windows.Forms;

namespace AgentNexus.CredentialBoundary
{
    internal sealed class SignerWindow : Form
    {
        private readonly TextBox root = new TextBox(), pin = new TextBox(), destination = new TextBox(), phrase = new TextBox();
        private readonly ComboBox stage = new ComboBox();
        private readonly TextBox review = new TextBox { Multiline = true, ScrollBars = ScrollBars.Both };
        private readonly CheckBox isolated = new CheckBox(), targetChecked = new CheckBox();
        private readonly Button load = new Button(), sign = new Button();
        private QualificationBundle bundle;
        private byte[] reviewed;
        private string expectedPhrase;
        private bool deployment;
        internal SignerWindow(string initialRoot)
        {
            Text = "AgentNexus Qualification Signer — 独立用户签发 / LOCAL ONLY";
            ClientSize = new Size(1080, 850); MinimumSize = new Size(1000, 760); Font = new Font("Microsoft YaHei UI", 10F);
            TableLayoutPanel layout = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 2, RowCount = 11, Padding = new Padding(16) };
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 160)); layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            for (int i = 0; i < 4; i++) layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 39));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 44)); layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 44)); layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 43)); layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 48)); layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
            AddRow(layout, 0, "候选目录", root); root.Text = initialRoot ?? "";
            stage.DropDownStyle = ComboBoxStyle.DropDownList; stage.Items.AddRange(new object[] { "1. 仅签署资格计划", "2. 单独签署部署批准（安装后保持停止）" }); stage.SelectedIndex = 0;
            AddRow(layout, 1, "独立授权阶段", stage);
            AddRow(layout, 2, "独立核对的 DER Pin", pin); pin.MaxLength = 64;
            AddRow(layout, 3, "新输出目录", destination);
            load.Text = "核验全部文件并显示待签原文"; load.Dock = DockStyle.Fill; layout.Controls.Add(load, 0, 4); layout.SetColumnSpan(load, 2);
            review.ReadOnly = true; review.WordWrap = false; review.Font = new Font("Consolas", 10F); review.BackColor = Color.FromArgb(246, 248, 251); review.Dock = DockStyle.Fill;
            layout.Controls.Add(review, 0, 5); layout.SetColumnSpan(review, 2);
            isolated.Text = "我正在代理不可访问的独立离线签名会话/设备；已审阅证书用途、私钥保护与剩余风险。";
            targetChecked.Text = "我已通过独立方式核对目标主机 / Operator SID / Service SID / Epoch / Pin 和下列具体系统变更。";
            foreach (CheckBox box in new[] { isolated, targetChecked }) { box.AutoSize = false; box.Dock = DockStyle.Fill; }
            layout.Controls.Add(isolated, 0, 6); layout.SetColumnSpan(isolated, 2); layout.Controls.Add(targetChecked, 0, 7); layout.SetColumnSpan(targetChecked, 2);
            AddRow(layout, 8, "键入精确确认短语", phrase);
            sign.Text = "用户确认并通过 Certificate Store / CNG 签署这一份文档"; sign.Dock = DockStyle.Fill; sign.Enabled = false;
            layout.Controls.Add(sign, 0, 9); layout.SetColumnSpan(sign, 2);
            Label footer = new Label { Text = "CMS ≠ Authenticode。签计划 ≠ 批准部署。部署 ≠ 真实 Key / Provider 权限。此工具不会安装或提升。", ForeColor = Color.DarkRed, Dock = DockStyle.Fill };
            layout.Controls.Add(footer, 0, 10); layout.SetColumnSpan(footer, 2); Controls.Add(layout);
            load.Click += delegate { LoadReview(false); }; sign.Click += delegate { SignReviewed(); };
            foreach (TextBox input in new[] { root, pin, destination }) input.TextChanged += delegate { ClearReview(); };
            stage.SelectedIndexChanged += delegate { ClearReview(); };
            FormClosed += delegate { ClearReview(); };
        }
        private static void AddRow(TableLayoutPanel layout, int row, string title, Control input)
        {
            layout.Controls.Add(new Label { Text = title, Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft }, 0, row);
            input.Dock = DockStyle.Fill; layout.Controls.Add(input, 1, row);
        }
        private static string ReadableJson(object value, int level)
        {
            Dictionary<string, object> obj = value as Dictionary<string, object>;
            string indent = new string(' ', level * 2), child = new string(' ', (level + 1) * 2);
            if (obj != null) return "{\n" + String.Join(",\n", obj.Keys.OrderBy(k => k, StringComparer.Ordinal).Select(k => child + Json.Encode(k) + ": " + ReadableJson(obj[k], level + 1))) + "\n" + indent + "}";
            object[] array = value as object[];
            if (array != null) return "[\n" + String.Join(",\n", array.Select(v => child + ReadableJson(v, level + 1))) + "\n" + indent + "]";
            return Json.Encode(value);
        }
        private void ClearReview()
        {
            sign.Enabled = false; if (bundle != null) { bundle.Dispose(); bundle = null; }
            reviewed = null; expectedPhrase = null; phrase.Text = ""; isolated.Checked = false; targetChecked.Checked = false;
        }
        internal void LoadReview(bool previewOnly)
        {
            try
            {
                ClearReview(); deployment = stage.SelectedIndex == 1;
                bundle = new QualificationBundle(root.Text);
                // Offline signing verifies the frozen target binding. Apply re-reads actual host/SID.
                Dictionary<string, object> draft = SigningContract.Read(bundle.Bytes("approval/qualification-plan.json", 262144));
                bundle.Candidate(Json.String(draft, "machine_id"), Json.String(draft, "operator_sid"), DateTime.UtcNow, deployment);
                if (!previewOnly) Json.Require(Digests.IsHash(pin.Text) && pin.Text == Json.String(bundle.Plan, "signer_certificate_der_sha256"), "INDEPENDENT_PIN_REQUIRED");
                Dictionary<string, object> final;
                if (!deployment) { final = SigningContract.Read(bundle.PlanBytes); final["user_confirmed"] = true; SigningContract.Plan(final, Json.String(draft, "machine_id"), Json.String(draft, "operator_sid"), DateTime.UtcNow, true); }
                else
                {
                    final = ApprovalDraft(bundle.Plan, bundle.PlanBytes, bundle.PlanSignature);
                    final["deployment_approved"] = true; final["user_confirmed"] = true;
                    SigningContract.Approval(final, bundle.Plan, bundle.PlanBytes, bundle.PlanSignature, DateTime.UtcNow, true);
                }
                reviewed = Fixed.Utf8.GetBytes(ReadableJson(final, 0) + "\n");
                string hash = Digests.Bytes(reviewed);
                expectedPhrase = (deployment ? "APPROVE DEPLOYMENT " : "SIGN PLAN ") + hash.Substring(hash.Length - 12);
                review.Text = (previewOnly ? "UNSIGNED PREVIEW — signing disabled\n\n" : "待签署的精确内容；尚未批准 / 尚未签署\n\n") +
                    "Mode: LOCAL_QUALIFICATION / QUALIFICATION_ONLY\n" +
                    "Host: " + final["target_host"] + "\nMachine SHA256: " + final["machine_id"] + "\nOperator SID: " + final["operator_sid"] + "\nService SID: " + final["service_sid"] +
                    "\nEpoch: " + final["policy_epoch"] + "\nValidity UTC: " + final["issued_at_utc"] + " → " + final["expires_at_utc"] +
                    "\nManifest SHA256: " + final["installation_manifest_sha256"] + "\nQualification SHA256: " + Digests.Bytes(deployment ? bundle.PlanBytes : reviewed) +
                    "\nFiles / bytes: " + final["payload_files"] + " / " + final["payload_bytes"] +
                    "\nCertificate DER SHA256: " + final["signer_certificate_der_sha256"] + "\nSigner subject: " + final["signer_id"] +
                    "\nreal_import=false; live_provider=false; production_release=false; real_ledger_migration=false\nstart_service=false; no UAC/deployment performed by Signer\n\n" +
                    String.Join("\n\n", SigningContract.Changes().Cast<string>()) + "\n\nConfirmation: " + expectedPhrase + "\n\nExact signed UTF-8 JSON:\n" + Fixed.Utf8.GetString(reviewed);
                review.Text = review.Text.Replace("\r\n", "\n").Replace("\n", "\r\n");
                sign.Enabled = !previewOnly;
            }
            catch (Exception e) { ClearReview(); review.Text = "BLOCKED: " + (e is PolicyException ? e.Message : e.GetType().Name); if (!previewOnly) MessageBox.Show(this, review.Text, "拒绝签署", MessageBoxButtons.OK, MessageBoxIcon.Error); }
        }
        private void SignReviewed()
        {
            try
            {
                Json.Require(bundle != null && reviewed != null && sign.Enabled, "REVIEWED_CONTENT_REQUIRED");
                SigningContract.RequireReview(isolated.Checked, targetChecked.Checked, phrase.Text, expectedPhrase);
                Json.Require(Path.IsPathRooted(destination.Text) && !Directory.Exists(destination.Text) && !File.Exists(destination.Text), "NEW_OUTPUT_DIRECTORY_REQUIRED");
                SigningContract.Time(bundle.Plan, DateTime.UtcNow);
                X509Certificate2 cert = null;
                using (X509Store store = new X509Store(StoreName.My, StoreLocation.CurrentUser))
                {
                    store.Open(OpenFlags.ReadOnly | OpenFlags.OpenExistingOnly);
                    foreach (X509Certificate2 candidate in store.Certificates)
                        if (Digests.Bytes(candidate.RawData) == pin.Text) { Json.Require(cert == null, "AMBIGUOUS_CERTIFICATE"); cert = candidate; }
                }
                Json.Require(cert != null && cert.HasPrivateKey, "USER_STORE_SIGNING_CERTIFICATE_REQUIRED");
                SigningContract.Certificate(cert, pin.Text, Json.String(bundle.Plan, "signer_id"), SigningContract.Local, DateTime.UtcNow);
                SigningContract.CertificateWindow(cert, bundle.Plan);
                // Inspect provider policy only; never export or serialize key material.
                using (RSA rsa = cert.GetRSAPrivateKey())
                {
                    RSACng cng = rsa as RSACng;
                    Json.Require(cng != null && !cng.Key.IsMachineKey && cng.Key.ExportPolicy == CngExportPolicies.None, "NONEXPORTABLE_USER_CNG_KEY_REQUIRED");
                    Json.Require(new[] { "Microsoft Software Key Storage Provider", "Microsoft Platform Crypto Provider", "Microsoft Smart Card Key Storage Provider" }.Contains(cng.Key.Provider.Provider), "UNREVIEWED_CNG_PROVIDER");
                }
                if (MessageBox.Show(this, "将只签署上方显示的一份文档。确认短语：\n" + expectedPhrase + "\n\n程序不会安装、启动服务或授予真实请求权限。", "最终用户确认", MessageBoxButtons.YesNo, MessageBoxIcon.Warning, MessageBoxDefaultButton.Button2) != DialogResult.Yes) return;
                SigningContract.Time(bundle.Plan, DateTime.UtcNow);
                SigningContract.Certificate(cert, pin.Text, Json.String(bundle.Plan, "signer_id"), SigningContract.Local, DateTime.UtcNow);
                SignedCms cms = new SignedCms(new ContentInfo(reviewed), true);
                CmsSigner signer = new CmsSigner(SubjectIdentifierType.IssuerAndSerialNumber, cert) { DigestAlgorithm = new Oid("2.16.840.1.101.3.4.2.1"), IncludeOption = X509IncludeOption.EndCertOnly };
                // Framework's silent argument is not a guarantee of a provider prompt.
                cms.ComputeSignature(signer, false); byte[] signature = cms.Encode();
                // A provider PIN/consent dialog can itself remain open past expiry.
                SigningContract.Time(bundle.Plan, DateTime.UtcNow);
                SigningContract.Cms(reviewed, signature, pin.Text, cert.Subject, SigningContract.Local, DateTime.UtcNow);
                bundle.Export(destination.Text, reviewed, signature, deployment);
                MessageBox.Show(this, "CMS 已输出并验证。证书 DER SHA256：\n" + pin.Text + "\n\n部署未执行；AuthentiCode 信任未授予。", "完成", MessageBoxButtons.OK, MessageBoxIcon.Information);
                ClearReview();
            }
            catch (Exception e) { sign.Enabled = false; MessageBox.Show(this, "BLOCKED: " + (e is PolicyException ? e.Message : e.GetType().Name) + "\n部分输出不得用于部署；请保留原物并重新审阅。", "签署未完成", MessageBoxButtons.OK, MessageBoxIcon.Error); }
        }
        internal static Dictionary<string, object> ApprovalDraft(Dictionary<string, object> plan, byte[] planBytes, byte[] signature)
        {
            Dictionary<string, object> a = new Dictionary<string, object>();
            foreach (string field in new[] { "signing_mode", "installation_manifest_sha256", "service_config_sha256", "signature_policy_sha256", "system_changes_sha256", "installer_sha256", "verifier_sha256", "signer_tool_sha256", "payload_files", "payload_bytes", "machine_id", "operator_sid", "service_sid", "target_host", "policy_epoch", "deployment_id", "issued_at_utc", "expires_at_utc", "signer_id", "signer_certificate_der_sha256", "real_import", "live_provider", "production_release", "real_ledger_migration", "real_import_enabled", "live_enabled", "real_import_approval_ref", "live_approval_ref" }) a.Add(field, plan[field]);
            a.Add("schema", "agentnexus.q41.deployment-approval.v1"); a.Add("scope", "QUALIFICATION_ONLY"); a.Add("deployment_approved", false); a.Add("start_service", false);
            a.Add("approval_ref", "APPROVED-Q41-DEPLOY-" + Json.String(plan, "deployment_id")); a.Add("qualification_sha256", Digests.Bytes(planBytes)); a.Add("qualification_signature_sha256", Digests.Bytes(signature));
            a.Add("user_confirmed", false); a.Add("confirmation_kind", "DEPLOYMENT_APPROVAL"); return a;
        }
    }
    internal static class SignerProgram
    {
        [STAThread] private static int Main(string[] args)
        {
            try
            {
                Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
                // Rendering cannot sign, open a key, access a certificate store or deploy.
                if (args.Length == 3 && args[0] == "--render-preview")
                {
                    using (SignerWindow window = new SignerWindow(args[1]))
                    {
                        window.LoadReview(true); window.Show(); Application.DoEvents(); window.PerformLayout(); window.Refresh();
                        using (Bitmap bitmap = new Bitmap(window.Width, window.Height)) { window.DrawToBitmap(bitmap, window.ClientRectangle); bitmap.Save(args[2]); }
                    }
                    return 0;
                }
                Json.Require(args.Length <= 1, "NO_AUTOMATIC_SIGNING_ARGUMENTS_SUPPORTED");
                using (SignerWindow window = new SignerWindow(args.Length == 1 ? args[0] : "")) Application.Run(window);
                return 0;
            }
            catch { return 21; }
        }
    }
}
