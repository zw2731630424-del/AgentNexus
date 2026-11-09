# 两阶段签名与限定回归

最终签名/证书/合同/输出事务测试 **107 PASS / 0 FAIL**，全部使用 SIMULATED 公开材料。实际 RSA/CMS 数学验证确实运行，但没有用户证书、用户 CNG/TPM 或真实签发资格。[逐例结果与原始证据索引](../evidence/signing-tests.json)

测试在内存生成临时测试证书及密钥，不入用户证书库、不导出私钥；只保存公开 DER/CMS。一个 PKCS12 负例明确从**无私钥关联的公开 DER 对象**导出，容器没有私钥，用于验证 PFX 类型在证书构造前就被拒绝，不能把它当作私钥导出证据。

阶段一与阶段二使用分离的公开模拟 CMS。测试运行真实共享 Candidate/Cms/Approval/Export/Verifier：完整导出计划、用其再导出批准、重新验证完整 signed bundle，并拒绝计划单签、缺失完成标记、篡改、交叉引用、过期、目标/SID/epoch 和真实权限改变。部分测试直接验证单一函数，未冒称实际 GUI/CNG 路径。

另外 **14 项公开准备/文件系统测试通过**，使用已销毁私钥对应的 SIMULATED 公开证书，准备实际 194 个文件，共 468,592,646 字节。逐项 Hash 与完整 SHA256SUMS 一致，发布准备完成标记；原生 Verifier 只接受 `UNSIGNED_CANDIDATE_INSPECTED_NO_GO`，严格 signed verification 仍拒绝。[准备证据](../evidence/preparation-tests.json)

六个原生入口以警告即错误构建通过；Service/Client 各 90 个相同 Common 断言、Helper 138、Launcher 36，不能把重复 Common 断言相加当额外覆盖。[构建](../evidence/build.json)

受影响 TypeScript/桌面/合成协议回归与严格类型检查见 [回归](../evidence/regression.json)。5 个 SKIP 分别涉及受限环境不能建立的两个链接夹具和本轮没有请求的三个合成 Helper UI 场景。没有修改 ACL、提升权限或启动实际 Helper 来消除 SKIP。

Windows PowerShell 5 与 pwsh 的只读检查覆盖创建脚本语法、仅公共 PE 快照加载器、错误 PE Hash、UNC 拒绝、反射公共输出、方法大小写选择、Verifier identity 和拒绝自动签名参数。[只读检查](../evidence/read-only-checks.json) 脚本主体没有运行，不修改 My/Root/Trusted Publishers，也不打开用户钥。

独立审查者分别运行和读回复核自己的证据，范围及计数见 [Signer 复核](independent-signer-audit.md) 与 [CMS/CNG 复核](cms-cng-independent-review.md)。独立运行和主运行重叠，不累计成新的覆盖总数。

真实 GUI 的属性确认、最终 Yes/No、Provider 提示/取消、中断中的 CNG 行为、私钥不存在/不可用/错配等真实用户环境项目仍 NOT_RUN。授权回调计数器与公钥比较器只能证明所调用的辅助边界；源码另行审查实际调用顺序。原 70 项 Windows OS 测试、19 类生产资格均保持原始 NOT_RUN，真实权限与生产准入继续 BLOCKED。

全部失败运行保留：一次 Framework 不支持 CmsSigner.PrivateKey setter 的编译失败；目录属性句柄 0x80 未阻止写入的 101 PASS / 1 FAIL 运行；只读脚本原 Activator 反射绑定失败和 WinForms 退出码采集错误等。后续修复与成功运行分开，不重写旧结果。构建和运行原始日志见 evidence 及 runtime 索引。
