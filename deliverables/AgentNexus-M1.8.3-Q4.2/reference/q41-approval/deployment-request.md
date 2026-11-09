# Q4.1 精确部署申请 — 尚不可执行

**当前请求先审阅范围、由用户自行确认本地签发方式。实际部署NO-GO。** 两份CMS、用户批准的公开证书/Pin不存在；此申请不构成证书创建/信任/签名/安装授权。

| 项目 | 精确候选值 |
|---|---|
| Host | `DESKTOP-OSWALD` |
| Machine ID SHA256 | `a013cd5e924eb5db1ba67eb28c65379f81b2d73f2cbd42fdb6645eb202681fe4` |
| Operator SID | `S-1-5-21-2532670394-1554971530-4095700938-1001` |
| Service SID（仅预计算） | `S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873` |
| Mode | `LOCAL_QUALIFICATION / QUALIFICATION_ONLY` |
| Epoch / deployment ID | `4 / ce334811-6ef2-41f8-9ef9-27c097ae826a` |
| UTC 时间窗 | `2026-11-09T15:19:05.2603720Z -> 2026-11-12T15:19:05.2603720Z` |
| 文件数 / 总字节 | `194 / 468553232` |
| 安装清单 SHA256 | `31d1ea7fd3487a9843b753c1000418c693b32627d615070bd2038fcf5677931f` |
| 资格草案 SHA256 | `d932f2c06ea72606707ec56b2ac347a0278e0a34118fbb80ec274bfab8e20ade` |
| 部署批准草案 SHA256 | `a440d1d48ddbbd3e421c5438e5a0944f6b6ada1a09af901a3423581e4c447270` |
| 安装器 SHA256 | `f6798bfec2577e5123049ccda75ee611bfc0ce9eae78cbdfa05ee33d4303e4d2` |
| Verifier SHA256 | `4e6c82162c63316a3533898875430a39a4e48b9570734cc870dc8dc478c2f14d` |
| Signer SHA256 | `f9b360321a1c0e8a319cddc553aea7985759d7245c462dd13aefe58a7fe40452` |
| 实际证书DER Pin | `null / BLOCKED` |
| deployment_approved / start_service | `false / false` |
| 真实/生产四项权限 | `全部 false` |

唯一 `AgentNexusCredential` own-process / demand服务，`NT SERVICE\AgentNexusCredential`虚拟身份，Session0，固定EXE无参数；程序根 `C:\Program Files\AgentNexus`、数据根 `C:\ProgramData\AgentNexusCredential`。ACL、固定High/Medium pipe、Helper/Launcher/Runtime和合成范围逐项见[系统变更](system-changes.json)，逐文件目标见[安装清单](installation-manifest.json)。DataRoot内部admin-write消费receipt先于SCM创建；不创建第三个ProgramData根，已有根/服务/receipt不接管、不覆盖。

**本候选只安装后保持停止。** 不批准启动服务、UAC Helper、pipe运行或70项OS攻击执行。未来启动另批，并要求有限等待SCM/engine/Daily就绪及失败停止/子进程退出证据。本包拒绝start_service=true，不能把安装完成写成已就绪。

不导入真实Key，不连接DeepSeek/OpenAI/GLM，不迁移/重置REAL Ledger，不改防火墙/驱动/Ubuntu/AppContainer，不开放shell，不commit/push。原100,000,000 Token授权保持；真实请求/费用均0。

用户独立选择证书与Pin后须制作**新候选**，日期/部署ID/config/launcher plan/清单/计划与最终两份CMS均重新冻结。本表是当前unsigned候选的精确值，不是将来signed bundle最终批准Hash。有效签署材料与复核完成后再次提交实际部署精确申请。**目前不提供可直接执行的Apply命令。**
