# Catalog 与历史约束

本轮读取既有 Feature/Policy Catalog 和相关 ADR/历史问题账本，保留机器目录与 ID 原字节；没有把设计登记、SIMULATED、Gate BYPASSED 或 Feature ON 当 OS 资格。`model.gateway`、Context Provenance、Audit、Resource Governance 的原 Harness 门仍执行，新增服务所有权是独立强制边界，不提供关闭安全后读取 Key/任意出站的旁路。

M0—M1.8.2、原 Provider UI 和根产品均保留；M1.8.2 全回归648/32/15、Provider UI历史647/33/15及同 SID失败不改写。本轮只对受影响模型/凭证/egress/UI链回归，不把其他 CPU/Storage/OS 历史 FAIL 关闭。
