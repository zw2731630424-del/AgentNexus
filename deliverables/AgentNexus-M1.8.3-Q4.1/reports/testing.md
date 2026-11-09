# 测试与实际保证边界

签名/合同：**60 PASS /0 FAIL，全部SIMULATED**。[逐项结果](../evidence/signing-tests.json)含运行路径/原始Hash。覆盖原24类及attached CMS、多签名/弱摘要、用途分离、strict JSON/UTC/类型/总数、权限扩大、receipt谓词、完成标记、held stream实际写拒绝、两阶段导出后再校验，以及直接调用Common运行期签名验证的证书时间窗正反例。

临时证书通过RSA.Create/CertificateRequest在内存生成，不入Windows Store、不导出私钥；非用户信任锚。最新测试run目录的原始fixture和exported内容另归档为SIMULATED-fixtures-and-exports.zip，供脱离工作区复核。旧失败迭代完整保留。

异常退出用**诊断harness**写partial JSON后Exit(73)，验证缺payload/签名及提交标记的半成品拒绝；不是实际用户Signer强杀、CNG provider崩溃或服务恢复资格。人工双确认/CNG使用/非导出实际策略/prompt/TPM-backed key/可信用户在场均NOT_RUN。

原C#纯断言Service/Client各90、Helper138、Launcher36；共享断言不重复计作OS测试。[最终构建](../evidence/build.json)。新sandbox回归 **224 PASS /0 FAIL /5 SKIP**，strict TypeScript通过，执行副本源码前后一致。[完整TAP](../evidence/regression.json)。5SKIP为宿主拒绝hardlink与junction/symlink夹具2项、未启用合成HelperUI3项；没有为消除SKIP改ACL或提升。

Signer未签UI预览已显示并视觉核验，按钮关闭、未选证书/打开密钥。安装器默认只读/严格验证拒绝与AST检查，Apply/SCM/ACL/UAC实际变更NOT_RUN。70项原Windows攻击与19类生产证据保留原字节，0 PASS /70 NOT_RUN、0 PASS /19 NOT_RUN。生产、真实Key与Provider仍BLOCKED；TPM只读查询INCONCLUSIVE。
