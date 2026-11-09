# AgentNexus Qualification Signer — 用户操作范围

**请先审阅说明、合同、源码、UI与私钥边界，再自行确认签发方式。本轮没有请求你立即创建证书或部署。** [UI预览](../evidence/signer-preview.png)为未签候选，签名按钮关闭。

独立WinForms工具使用Framework4.8，不联网、不调用SCM/ACL/UAC/服务/Provider。输入为冻结目录、用户独立核对的DER SHA256 Pin和新的绝对输出目录；不接收PFX/私钥/密码或自动批准参数。

1. 用户选择独立离线Windows签名设备/会话，保持代理不能访问其私钥和桌面。软件CNG/TPM CNG创建脚本须另外明确确认；会修改该签名设备CurrentUser My，没有信任导入。
2. 只用公开DER与独立确认Pin制作**新候选**：在工作区本bundle根调用 `python -B tools/freeze.py --public-certificate <public.cer> --independent-pin <64hex> --new-output <new-absolute-directory>`。准备步骤仅公钥，不签名、不信任，输出仍unsigned。
3. 把完整新候选和工具转交独立环境，独立核对来源/SHA256/目标Host/Machine ID/Operator SID/Service SID/Epoch/期限/具体变更。工具显示不能替代独立身份/Pin确认。
4. 阶段1选择“仅签署资格计划”，完整加载/锁定文件，审阅将签的最终JSON与权限。指定新目录，勾选独立环境/身份确认，键入含该内容Hash后12位的短语，再单独最终确认。输出新bundle的qualification-plan.json/p7s/signing-result.json。**不批准部署。**
5. 阶段2以signed-plan bundle重新输入，选择“单独签署部署批准”，再用新目录。复验全部Hash/计划CMS后展示部署批准最终字节、单独引用、计划及CMS摘要，再次独立确认才签。start_service始终false。
6. 完整输出用Verifier `--verify <bundle> <independent-pin>`只读校验；SIGNED_LOCAL_VERIFIED_ONLY不会安装、信任PE、导入Key或调用Provider。
7. 最终有效Pin/两份签名/最终文件和复核结果具备后，重新提交实际精确部署申请。用户在自有管理员会话再次批准系统变更才可安装。当前不提供可执行Apply命令。

仅从held streams复制到新目录/CreateNew；原候选不覆盖。完成标记最后写，缺任一签名/标记/字段/Hash拒绝。异常半成品保留供审查，不自动复用/删除/重试。签名不改变PE字节；另做Authenticode须重冻结全部相关依赖/清单/计划/批准。

构建用本bundle `tools/build.py`。历史verify-q3/package-q3留作来源，非Q4.1工作流入口。实际用户CNG密钥/提示/手工签名本轮NOT_RUN。
