# Q4 Windows资格部署报告

**只读预检完成；部署未执行，UNSIGNED / NO-GO。** 用户明确确认暂无正式签发条件，后续签发和部署审批另行开展。

当前HEAD `d895d11bb500915ca2e0bb1e928336edfee0373e`；初始工作树清洁。项目入口及治理policy已读取，`project-rules/README.md`不存在、注册规则为空；工作流路由无匹配专项流程。原规则、Q2/Q3源码、历史测试与交付不改写。

真实Windows 11 Pro 25H2，Build 26200.9711；Operator SID `S-1-5-21-2532670394-1554971530-4095700938-1001`，原生观察Medium8192、elevated=false、非AppContainer、Session1。UAC EnableLUA=1、PromptOnSecureDesktop=1；这只是配置证据，真实UAC交互NOT_RUN。[原始采集与Hash绑定](evidence/host-evidence-manifest.json)

[基线完整性](evidence/baseline-integrity.json)覆盖Q3 README/验收/部署批准合同、安装清单、完整ZIP和SHA、独立审查、Credential Service/Helper/Launcher/Runtime/双通道协议、OS合同、回滚及历史失败证据。[依赖静态预检](evidence/dependency-preflight.json)不代替实际加载或注入攻击。

服务、Helper、High Pipe、Daily Pipe、Runtime、同SID/不同SID、部署后E2E、崩溃恢复、Ledger和Egress的实际OS验证全部未执行，逐项状态见各报告与tests目录。当前尚无最终安装清单和签署证书链，不虚构签名或生产PASS。[最终阶段裁定](acceptance.json)

未来所涉唯一服务/路径/权限/启动参数/证据要求已精确列入 [申请草案](approval/deployment-request.md)。真实部署失败处理、停止确认和保留Vault/Ledger/Audit见 [回滚方案](reports/rollback-record.md)。原安装器默认只读验证已作为离线检查运行；从未执行Apply。
