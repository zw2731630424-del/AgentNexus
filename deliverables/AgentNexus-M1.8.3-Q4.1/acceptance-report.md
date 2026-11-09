# Q4.1 部署前阶段验收

**代码、独立Signer UI、共享CMS/DER Pin、合同、安装器/运行期集成与离线测试已完成；实际签发/部署/生产资格保持UNSIGNED / NO-GO。**

LOCAL_QUALIFICATION只能进入QUALIFICATION_ONLY；原PRODUCTION_RELEASE/QUALIFIED门禁保留，拒绝本地证书。计划和部署两次独立完整审阅/短语/最终确认与分离CMS；实际安装还有单独用户确认。四项真实/生产权限固定false，新安装stopped，无自动UAC/服务启动。

60/60签名安全测试PASS（SIMULATED），受影响回归224 PASS /0 FAIL /5 SKIP，strict TypeScript及六项警告即错误构建通过。Signer未签预览视觉检查完成。[详细边界](reports/testing.md)、[独立审查](reports/independent-security-review.md)。

实际用户CNG/TPM签发、强交互保护和同SID私钥使用隔离NOT_RUN/INCONCLUSIVE。没有用户私钥供Codex读取/签署，也没有用复选框证明同SID任意进程不能调用密钥。用户须选择代理不可访问的独立签名环境；内存模拟证书不是实际信任锚。[逐项验收](acceptance.json)。

原70项OS攻击、19类生产证据均NOT_RUN；服务不存在，ACL/账户/证书库/UAC未改变。当前194项清单与SHA供审阅，实际Pin=null、签名缺失、deployment_approved=false。先审阅[工具范围](signer/README.md)并由用户自行确认签发方式，真实部署另需最终signed bundle和精确批准。[精确申请](approval/deployment-request.md)。真实Key/Provider/费用0，无commit/push。
