# 最终候选准备与当前阻断

**尚无真实最终候选。** 用户还未选择证书、确认 DER Pin；本轮只冻结工具源码、构建和 staging。实际 `PLAN_FROZEN / APPROVAL_FROZEN / SIGNED` 均 NOT_RUN。原 Q4.1 资格计划与部署草案不允许直接签署。

未来用户提供已独立确认的公开 DER、完整 Pin 和目标身份后，`tools/freeze.py` 才能向新的本地绝对目录生成新的 deployment ID、epoch 5、UTC 时间窗、194 项安装清单、资格计划、部署草案、config、launcher plan 以及全部相关 Hash。Signer 与 Verifier 位于 194 项载荷之外，由计划显式绑定；安装器自身 Hash 同样绑定，安装器还固定 Verifier Hash。

准备工具不创建/选择实际用户证书、不打开钥、不导入信任、不签 CMS。它从内存加载已校验的现有 Verifier 以检查公开材料，没有第二套证书或 CMS 信任规则。SOURCE ZIP、SHA256SUMS 和独立渠道用于用户复核来源；自校验不能替代独立信任。

新候选中的部署草案仍是 `deployment_approved=false / user_confirmed=false / start_service=false`。阶段二将根据已签计划重新生成最终待签部署批准，绑定已签计划原字节及 CMS；原未签草案 Hash 不是最终批准 Hash。签署后的输出不复用原工具包 SHA256SUMS 作为批准证据，必须重新生成最终只读部署申请与校验记录。

完整准备流程的 194 项测试只使用既有、已销毁临时私钥对应的 SIMULATED 公开证书，输出在 runtime 中并标为 NOT-USER-AUTHORITY，不是用户候选。测试结果见 [准备测试](../evidence/preparation-tests.json)，不得把其中的 Pin、GUID、期限或 Hash 复制到实际部署申请。

任何源码、二进制、载荷、目标、证书、期限或权限变化，均须重新构建适用入口、运行相关测试、独立复核及重新冻结；既有签名不可沿用。证书和候选期限过期时也重新准备。生产资格、真实 Key/Provider、服务启动与原 70 项 OS 测试仍各自阻断。
