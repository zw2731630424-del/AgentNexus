# 生产 Credential Vault 资格

**BLOCKED。** 本轮没有真实独立服务部署/身份隔离证据，不能用代码、合成PASS或签名模板宣布生产资格。历史同SID读取/解密合成密文反例仍为FAIL；原记录保留。

|标准|离线范围|生产|
|---|---|---|
|1. 用户在原 UI 添加 API Key|SIMULATED；见验收及测试矩阵|BLOCKED|
|2. 无需 JSON/环境变量认证|SIMULATED；见验收及测试矩阵|BLOCKED|
|3. 普通 Renderer 不读已存 Key|SIMULATED；见验收及测试矩阵|BLOCKED|
|4. 普通 Agent 不读 Key|SIMULATED；见验收及测试矩阵|BLOCKED|
|5. Subagent 不读 Key|SIMULATED；见验收及测试矩阵|BLOCKED|
|6. 同 SID 普通进程不能独立解密|SIMULATED；见验收及测试矩阵|BLOCKED|
|7. 同 SID 不能伪造可信服务请求|SIMULATED；见验收及测试矩阵|BLOCKED|
|8. 服务独占凭证使用|SIMULATED；见验收及测试矩阵|BLOCKED|
|9. Gateway 受控使用凭证|SIMULATED；见验收及测试矩阵|BLOCKED|
|10. 最终出站前 Data Egress|SIMULATED；见验收及测试矩阵|BLOCKED|
|11. 唯一1亿 Token Owner|SIMULATED；见验收及测试矩阵|BLOCKED|
|12. 撤销与轮换|SIMULATED；见验收及测试矩阵|BLOCKED|
|13. Host/服务重启恢复|SIMULATED；见验收及测试矩阵|BLOCKED|
|14. 凭证操作审计|SIMULATED；见验收及测试矩阵|BLOCKED|
|15. UI 正确 Provider/模型状态|SIMULATED；见验收及测试矩阵|BLOCKED|

可信输入Renderer/Main会短暂接触正在输入的新值，之后清空，无已存Key读回；不能把这个过程描述成所有Renderer都绝对无法看见新输入。实际内存/句柄、缓存/转储、启动链和跨角色权限仍须真实OS验证。

先单独批准[隔离部署与合成资格计划](deployment-approval.md)，取得11项Windows证据与独立复核，再判断资格。通过后才可在原UI导入真实Key，随后展示当时具体请求正文/绑定，经用户确认才真实调用。100,000,000输入+输出授权未重置，也不重新索取。
