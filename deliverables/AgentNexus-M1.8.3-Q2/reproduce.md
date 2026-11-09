# 离线复现与证据说明

环境为Windows、Node24.15.0、TypeScript5.9.3/@types-node24.10.1、现有锁定工具。进入本包source后运行 `node tools/agentnexus/verify-q2.mjs`。脚本执行严格TS、受影响模型/Vault/Egress/Service/Desktop与Q2回归、桌面编译、JS语法检查；原始输出归工作区 `.workflow-kit/runtime/AgentNexus-M1.8.3-Q2/verification/`，不会发送Provider请求。已有本机锁定依赖被复用，不自动安装依赖。

原生编译分别使用 `native/credential-service/build.ps1`、`native/credential-helper/build.ps1`、`native/credential-launcher/build.ps1`，仅在Q2 runtime生成文件并执行明确pure self-tests。不要直接启动正常helper/launcher入口，不要使用runas命令测试。本轮正常提升入口/UAC和已部署service的攻击测试全部未执行。缺部署负测使用普通token、自测使用合成输入，无真实Key。

`build-tools/collect-preflight.ps1 -OutputDirectory <本包中新目录>` 只查询现状并将结果写本包；不连目标pipe、不改任何系统状态。沙箱Low/AppContainer结果与普通宿主Medium结果分别留档，权限不足不伪造成观察成功。`preflight.ps1` 也是只读，不是安装器。

最终源码清单、ZIP及安装候选分别由build-tools生成并核对。`python build-tools/verify-delivery.py` 只读核查Q2 SHA、源码ZIP、历史冻结和治理分类；不打开运行凭证库。不把纯测试、TS通过、真实同账户子进程、Hash或静态SDDL当作Windows隔离PASS。

不得把上述命令视为系统部署、真实Key导入或LIVE请求批准。完整Q2仍BLOCKED，详见最终验收与部署NO-GO材料。
