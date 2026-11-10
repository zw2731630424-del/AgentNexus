# AgentNexus M2.0 source

Windows、Node 24.15.0；依赖版本固定在package-lock.json。当前工作区可直接使用既有固定版本Electron/TypeScript工具；独立解压后先执行 npm ci（恢复依赖，不部署Windows服务）。

```powershell
npm run desktop
npm run verify:m20
node tools/agentnexus/verify-m20.mjs --full
node tools/agentnexus/m20-desktop-e2e.mjs
```

首次普通用户启动默认Local；Settings / Security Center管理配置，Model Providers保存API Key。先添加自定义Synthetic Provider和模型，再用synthetic-test-合成Key运行“合成测试”。Synthetic不访问外网、不报告CONNECTED。

LIVE需填写费用估算与来源、配置允许的外发scope，并明确确认真实连接；本轮真实Key/Provider调用为0，实际网络验证NOT_RUN。Hardened保持BLOCKED。已有旧Host目录不会自动降级或重置REAL额度。OS账户、服务、ACL、证书、TPM和部署仍需独立明确授权。

查看上级交付目录的acceptance-report.md、reports与原始证据。完整源码沿用Q4.2的唯一Harness/Gateway；两种模式不是两套实现。固定信任边界和恢复日志与可选安全模块分别在界面解释。
