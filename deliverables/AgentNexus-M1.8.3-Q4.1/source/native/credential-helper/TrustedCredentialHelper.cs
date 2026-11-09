using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Linq;
using System.Threading;
using System.Windows.Forms;

namespace AgentNexus.CredentialBoundary
{
    internal static class TrustedHelperProgram
    {
        // Normal operation never writes stdout/stderr, including failure paths.
        // 0: explicit completion; 20: cancelled/uncertain; 21: blocked.
        [STAThread]
        private static int Main(string[] args)
        {
            try
            {
                if (args.Length == 1 && args[0] == "--self-test") return HelperTests.Run();
                HelperIntent intent = HelperIntent.Parse(args);
                using (Deployment deployment = Deployment.Load())
                {
                    TokenFacts.RequireOperator(TokenFacts.Current(), deployment.OperatorSid);
                    using (ProcessFacts self = ProcessFacts.Open((uint)Process.GetCurrentProcess().Id))
                    {
                        TokenFacts.RequireOperator(self.Token, deployment.OperatorSid);
                        Json.Require(String.Equals(self.Path, Fixed.HelperExe, StringComparison.OrdinalIgnoreCase), "HELPER_IMAGE_REJECTED");
                        self.RequireAlive();
                    }
#if !SYNTHETIC_HELPER_UI
                    HelperObjectSecurity.Prepare(deployment);
#endif
                    // Authenticate before collecting input. Do not hold an idle
                    // pipe while a person enters a key; no ticket exists yet.
                    HelperTarget target;
                    using (HelperRpcSession bootstrap = new HelperRpcSession(deployment))
                        target = HelperResponses.Snapshot(bootstrap.Call("snapshot", new Dictionary<string, object>(), false), intent, deployment);
                    Application.EnableVisualStyles();
                    Application.SetCompatibleTextRenderingDefault(false);
                    Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
                    using (TrustedCredentialForm form = new TrustedCredentialForm(deployment, intent, target))
                    {
                        ThreadExceptionEventHandler handler = delegate { form.FailClosed(); };
                        Application.ThreadException += handler;
                        try { Application.Run(form); return form.ExitCode; }
                        finally { Application.ThreadException -= handler; }
                    }
                }
            }
            catch { return 21; }
        }
    }

    internal sealed class SecretEntryBox : TextBox
    {
        internal SecretEntryBox()
        {
            UseSystemPasswordChar = true;
            ShortcutsEnabled = false;
            AllowDrop = false;
            AutoCompleteMode = AutoCompleteMode.None;
            AutoCompleteSource = AutoCompleteSource.None;
            MaxLength = 4096;
            ContextMenu = new ContextMenu();
        }
        protected override void WndProc(ref Message message)
        {
            // Copy, cut, paste and undo never forward through native edit
            // shortcuts. Only the explicit helper-owned Paste button reads it.
            if (message.Msg == 0x0300 || message.Msg == 0x0301 || message.Msg == 0x0302 || message.Msg == 0x0304) return;
            base.WndProc(ref message);
        }
        internal void Erase() { if (IsDisposed) return; UseSystemPasswordChar = true; Text = ""; ClearUndo(); }
    }

    internal sealed class TrustedCredentialForm : Form
    {
        private readonly Deployment deployment;
        private readonly HelperIntent intent;
        private readonly HelperTarget target;
        private readonly Func<IHelperRpcSession> sessionFactory;
        private readonly TextBox displayName = new TextBox();
        private readonly CheckedListBox models = new CheckedListBox();
        private readonly SecretEntryBox secret = new SecretEntryBox();
        private readonly CheckBox reveal = new CheckBox();
        private readonly Button paste = new Button();
        private readonly Button submit = new Button();
        private readonly Button cancel = new Button();
        private readonly Label status = new Label();
        private readonly System.Windows.Forms.Timer lifetime = new System.Windows.Forms.Timer();
        private readonly System.Windows.Forms.Timer revealLimit = new System.Windows.Forms.Timer();
        private Form activeReview;
        private IHelperRpcSession activeSession;
        private int cancelled;
        private bool busy;
        private bool finished;
        internal int ExitCode = 20;
        internal event Action<string> TransactionFailed;

        internal TrustedCredentialForm(Deployment deployment, HelperIntent intent, HelperTarget target)
            : this(deployment, intent, target, delegate { return new HelperRpcSession(deployment); }) { }

        internal TrustedCredentialForm(Deployment deployment, HelperIntent intent, HelperTarget target, Func<IHelperRpcSession> sessionFactory)
        {
            this.deployment = deployment; this.intent = intent; this.target = target;
            this.sessionFactory = sessionFactory;
            Text = "AgentNexus 可信凭据窗口";
            Font = new Font("Microsoft YaHei UI", 10F);
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false; MinimizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(650, intent.ImportsSecret ? 605 : 500);
            AutoScaleMode = AutoScaleMode.Dpi;
            TableLayoutPanel panel = new TableLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(20), ColumnCount = 2, RowCount = 10, AutoSize = false };
            panel.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 95));
            panel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            Controls.Add(panel);
            Label intro = MakeLabel("请核对提供方、模型、用途和目标后确认。\r\n" + (deployment.Qualified ? "本窗口直接向凭据服务提交。" : "合成模式：仅允许 synthetic-test- 凭据，禁止真实 Key。"));
            intro.Height = 62; panel.Controls.Add(intro, 0, 0); panel.SetColumnSpan(intro, 2);
            AddRow(panel, 1, "提供方", MakeLabel("DeepSeek / deepseek"));
            AddRow(panel, 2, "用途", MakeLabel(Purpose(intent.Action)));
            Label targetLabel = MakeLabel(target == null ? "新增独立凭据" : target.Review);
            targetLabel.Height = target == null ? 28 : 95;
            AddRow(panel, 3, "目标", targetLabel);
            displayName.Text = target != null && !intent.ImportsSecret ? target.DisplayName : intent.Name;
            displayName.Name = "CredentialDisplayName"; displayName.AccessibleName = "CredentialDisplayName";
            displayName.MaxLength = intent.ImportsSecret ? 80 : 1024;
            displayName.ReadOnly = !intent.ImportsSecret;
            displayName.Dock = DockStyle.Top;
            AddRow(panel, 4, "显示名称", displayName);
            models.CheckOnClick = true; models.Height = 66; models.Dock = DockStyle.Top;
            foreach (string model in HelperIntent.AllowedModels) models.Items.Add(model, intent.Models.Contains(model));
            models.Enabled = intent.ImportsSecret || intent.Action == "MODELS";
            if (models.Enabled) AddRow(panel, 5, "模型范围", models);
            else
            {
                Label existingScope = MakeLabel(target.Models.Length == 0 ? "(空范围：禁止所有新模型使用)" : String.Join(", ", target.Models));
                existingScope.Height = 66; AddRow(panel, 5, "模型范围", existingScope);
            }
            int next = 6;
            if (intent.ImportsSecret)
            {
                secret.Name = "CredentialSecret"; secret.AccessibleName = "CredentialSecret";
                secret.Dock = DockStyle.Top;
                AddRow(panel, next++, "凭据", secret);
                FlowLayoutPanel actions = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 42, FlowDirection = FlowDirection.LeftToRight };
                reveal.Text = "临时显示"; reveal.AutoSize = true;
                reveal.CheckedChanged += delegate { secret.UseSystemPasswordChar = !reveal.Checked; revealLimit.Stop(); if (reveal.Checked) revealLimit.Start(); };
                paste.Text = "粘贴"; paste.AutoSize = true;
                paste.Click += delegate { PasteSecret(); };
                actions.Controls.Add(reveal); actions.Controls.Add(paste);
                panel.Controls.Add(actions, 1, next++);
            }
            status.Text = intent.ImportsSecret ? "凭据默认隐藏；显示将在 15 秒后恢复隐藏。\r\n限额：并发 1，每分钟 120 请求。窗口将在 3 分钟后关闭。" : "本次操作无需输入凭据。窗口将在 3 分钟后关闭。";
            status.AutoSize = true; status.Dock = DockStyle.Top;
            panel.Controls.Add(status, 0, next++); panel.SetColumnSpan(status, 2);
            FlowLayoutPanel buttons = new FlowLayoutPanel { Dock = DockStyle.Bottom, Height = 45, FlowDirection = FlowDirection.RightToLeft };
            submit.Name = "CredentialSubmit"; submit.AccessibleName = "CredentialSubmit";
            cancel.Name = "CredentialCancel"; cancel.AccessibleName = "CredentialCancel";
            submit.Text = "核对并确认"; submit.AutoSize = true; submit.Click += delegate { Confirm(); };
            cancel.Text = "取消"; cancel.AutoSize = true; cancel.Click += delegate { CancelAndClose(); };
            buttons.Controls.Add(submit); buttons.Controls.Add(cancel);
            panel.Controls.Add(buttons, 0, next); panel.SetColumnSpan(buttons, 2);
            AcceptButton = submit; CancelButton = cancel;
            lifetime.Interval = 180000; lifetime.Tick += delegate { CancelAndClose(); }; lifetime.Start();
            revealLimit.Interval = 15000; revealLimit.Tick += delegate { Mask(); };
            Deactivate += delegate { Mask(); };
        }

        private static Label MakeLabel(string text) { return new Label { Text = text, AutoSize = false, Dock = DockStyle.Top, Height = 31 }; }
        private static void AddRow(TableLayoutPanel panel, int row, string caption, Control control)
        {
            panel.Controls.Add(MakeLabel(caption), 0, row); panel.Controls.Add(control, 1, row);
        }
        private static string Purpose(string action)
        {
            switch (action)
            {
                case "ADD": return "新增凭据";
                case "ROTATE": return "轮换凭据；旧凭据将被替换";
                case "ENABLE": return "启用凭据";
                case "DISABLE": return "禁用凭据；停止新的使用";
                case "DELETE": return "撤销并删除凭据；已发送请求不会因此取消";
                default: return "修改模型使用范围；空范围禁止所有新模型使用";
            }
        }
        private void Mask() { revealLimit.Stop(); reveal.Checked = false; secret.UseSystemPasswordChar = true; }
        private void PasteSecret()
        {
            try
            {
                string value = Clipboard.GetText(TextDataFormat.UnicodeText);
                if (!HelperIntent.ValidSecret(value, !deployment.Qualified)) { ShowValidation(); return; }
                secret.Text = value; secret.ClearUndo(); Mask();
            }
            catch { ShowValidation(); }
        }
        private void ShowValidation()
        {
            Mask();
            status.Text = "请检查非秘密显示名称、模型范围及凭据格式。\r\n凭据须为 24–4096 个可见 ASCII 字符。";
        }
        private bool Review(string text)
        {
            // A helper-owned form (rather than a system modal MessageBox)
            // lets the three-minute lifetime close every input/review window.
            using (Form dialog = new Form())
            {
                dialog.Text = "最终确认 · AgentNexus"; dialog.Font = Font;
                dialog.ClientSize = new Size(610, 400); dialog.StartPosition = FormStartPosition.CenterParent;
                dialog.FormBorderStyle = FormBorderStyle.FixedDialog; dialog.MaximizeBox = false; dialog.MinimizeBox = false;
                TextBox reviewText = new TextBox { Multiline = true, ReadOnly = true, BorderStyle = BorderStyle.None, Dock = DockStyle.Fill, ScrollBars = ScrollBars.Vertical, Text = text };
                reviewText.Padding = new Padding(15);
                FlowLayoutPanel buttons = new FlowLayoutPanel { Dock = DockStyle.Bottom, FlowDirection = FlowDirection.RightToLeft, Height = 50, Padding = new Padding(8) };
                Button approve = new Button { Name = "CredentialApprove", AccessibleName = "CredentialApprove", Text = "确认执行", AutoSize = true, DialogResult = DialogResult.OK };
                Button reject = new Button { Name = "CredentialReviewCancel", AccessibleName = "CredentialReviewCancel", Text = "取消", AutoSize = true, DialogResult = DialogResult.Cancel };
                buttons.Controls.Add(approve); buttons.Controls.Add(reject);
                dialog.Controls.Add(reviewText); dialog.Controls.Add(buttons);
                dialog.CancelButton = reject; dialog.AcceptButton = reject;
                dialog.Shown += delegate { reject.Select(); };
                activeReview = dialog;
                try { return dialog.ShowDialog(this) == DialogResult.OK; }
                finally { activeReview = null; }
            }
        }
        private void Confirm()
        {
            if (busy || finished) return;
            byte[] clear = null;
            try
            {
                string name = intent.ImportsSecret ? displayName.Text : target.DisplayName;
                string[] scope = intent.ConfirmedScope(models.CheckedItems.Cast<string>());
                if (intent.ImportsSecret && (!HelperIntent.ValidName(name) || !HelperIntent.ValidSecret(secret.Text, !deployment.Qualified))) { ShowValidation(); return; }
                Mask();
                string[] reviewScope = intent.ImportsSecret || intent.Action == "MODELS" ? scope : target.Models;
                string review = "提供方：DeepSeek / deepseek\r\n模型：" + (reviewScope.Length == 0 ? "(空范围：禁止所有新模型使用)" : String.Join(", ", reviewScope)) + "\r\n名称：" + name + "\r\n用途：" + Purpose(intent.Action) + "\r\n目标：" + (target == null ? "新增独立凭据" : target.Review) + "\r\n\r\n确认执行以上操作？";
                if (!Review(review)) { CancelAndClose(); return; }
                if (VolatileReadCancelled()) { CancelAndClose(); return; }
                if (intent.ImportsSecret) clear = Fixed.Utf8.GetBytes(secret.Text);
                secret.Erase();
                busy = true;
                displayName.Enabled = false; models.Enabled = false; secret.Enabled = false; reveal.Enabled = false; paste.Enabled = false; submit.Enabled = false;
                status.Text = "正在处理。窗口关闭后请返回应用刷新状态；不要自动重复操作。";
                byte[] ownedClear = clear;
                Thread worker = new Thread(delegate() { Commit(name, scope, ownedClear); });
                worker.IsBackground = true; worker.Name = "CredentialHelperTransaction"; worker.Start();
                clear = null; // Ownership transfers only after a successful start.
            }
            catch (Exception error) { if (clear != null) Array.Clear(clear, 0, clear.Length); ReportFailure(error); FailClosed(); }
        }
        private bool VolatileReadCancelled() { return Interlocked.CompareExchange(ref cancelled, 0, 0) != 0; }
        private void Commit(string name, string[] scope, byte[] clear)
        {
            int result = 21;
            HelperTicket ticket = null;
            IHelperRpcSession session = null;
            Dictionary<string, object> payload = null;
            try
            {
                Json.Require(!VolatileReadCancelled(), "HELPER_CANCELLED");
                session = sessionFactory();
                Interlocked.Exchange(ref activeSession, session);
                Json.Require(!VolatileReadCancelled(), "HELPER_CANCELLED");
                HelperTarget current = HelperResponses.Snapshot(session.Call("snapshot", new Dictionary<string, object>(), false), intent, deployment);
                Json.Require(SameTarget(target, current), "HELPER_TARGET_CHANGED");
                Json.Require(!VolatileReadCancelled(), "HELPER_CANCELLED");
                string method;
                if (intent.ImportsSecret)
                {
                    payload = intent.Metadata(name, scope);
                    Dictionary<string, object> prepare = new Dictionary<string, object> {
                        { "operation_id", intent.OperationId }, { "metadata_hash", HelperCanonical.Hash(payload) }, { "secret_sha256", Digests.Bytes(clear) }
                    };
                    ticket = HelperTicket.Parse(session.Call("credential.prepare", prepare, false), intent.OperationId, HelperTicket.NowMs);
                    Json.Require(!VolatileReadCancelled() && ticket.Current, "HELPER_TICKET_EXPIRED");
                    payload.Add("secret_b64", Convert.ToBase64String(clear));
                    Array.Clear(clear, 0, clear.Length);
                    payload.Add("import_ticket", ticket.Id); payload.Add("import_operation_id", intent.OperationId);
                    method = "credential.save";
                }
                else
                {
                    payload = new Dictionary<string, object> { { "key_id", intent.CredentialId } };
                    if (intent.Action == "DELETE") method = "credential.delete";
                    else if (intent.Action == "MODELS")
                    {
                        method = "credential.models";
                        payload.Add("models", scope); payload.Add("model_wire_ids", scope.ToDictionary(m => m, m => (object)m, StringComparer.Ordinal));
                    }
                    else { method = "credential.state"; payload.Add("enabled", intent.Action == "ENABLE"); }
                }
                Json.Require(!VolatileReadCancelled() && (ticket == null || ticket.Current), "HELPER_CANCELLED_OR_EXPIRED");
                HelperResponses.Completed(intent.Action, session.Call(method, payload, true));
                result = VolatileReadCancelled() ? 20 : 0;
            }
            catch (Exception error)
            {
                ReportFailure(error);
                result = VolatileReadCancelled() || (session != null && session.MutationAttempted) ? 20 : 21;
                if (session != null && ticket != null && !session.MutationAttempted)
                {
                    try { session.CancelTicket(ticket); } catch { /* Disconnect is the fallback revocation. No retry. */ }
                }
            }
            finally
            {
                if (clear != null) Array.Clear(clear, 0, clear.Length);
                if (payload != null) { if (payload.ContainsKey("secret_b64")) payload["secret_b64"] = null; payload.Clear(); }
                Interlocked.Exchange(ref activeSession, null);
                if (session != null) session.Dispose();
                try { if (!IsDisposed && IsHandleCreated) BeginInvoke((Action)delegate { Finish(result); }); } catch { }
            }
        }
        internal static bool SameTarget(HelperTarget before, HelperTarget after)
        {
            return before == null ? after == null : after != null && before.Id == after.Id && before.Name == after.Name && before.State == after.State && before.Models.SequenceEqual(after.Models);
        }
        private void ReportFailure(Exception error)
        {
            Action<string> observer = TransactionFailed;
            if (observer == null) return; // Production installs no diagnostic callback.
            PolicyException policy = error as PolicyException;
            string code = policy == null ? "HELPER_UNEXPECTED_FAILURE" : policy.Code;
            if (code == null || !System.Text.RegularExpressions.Regex.IsMatch(code, @"\A[A-Z][A-Z0-9_]{0,95}\z")) code = "HELPER_UNEXPECTED_FAILURE";
            try { observer(code); } catch { }
        }
        private void Finish(int result)
        {
            if (finished) return;
            ExitCode = result; finished = true; secret.Erase(); Close();
        }
        private void CancelAndClose()
        {
            Interlocked.Exchange(ref cancelled, 1);
            if (activeReview != null) { activeReview.DialogResult = DialogResult.Cancel; activeReview.Close(); }
            IHelperRpcSession session = Interlocked.CompareExchange(ref activeSession, null, null);
            if (session != null) session.Abort();
            Finish(20);
        }
        internal void FailClosed() { CancelAndClose(); }
        protected override void OnFormClosing(FormClosingEventArgs args)
        {
            lifetime.Stop(); revealLimit.Stop(); secret.Erase();
            if (!finished)
            {
                Interlocked.Exchange(ref cancelled, 1); ExitCode = 20;
                IHelperRpcSession session = Interlocked.CompareExchange(ref activeSession, null, null);
                if (session != null) session.Abort();
            }
            base.OnFormClosing(args);
        }
        protected override void Dispose(bool disposing)
        {
            if (disposing && !IsDisposed) { lifetime.Dispose(); revealLimit.Dispose(); secret.Erase(); }
            base.Dispose(disposing);
        }
    }
}
