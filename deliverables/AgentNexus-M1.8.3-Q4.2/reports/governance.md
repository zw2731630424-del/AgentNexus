# 治理、历史保护与最终校验

没有修改 AGENTS.md、治理 policy/baseline、规则索引或原治理器。新材料全部分类为 deliverables 下交付、task 及 runtime；未搬动历史文件或正式科研项目。优先调用原 govern.py new 时遇到已有历史长路径的 WinError 3，未通过改规则或删除旧数据绕过。

最终治理使用此前 Q3/Q4/Q4.1 已审的 extended-length 根路径与只读 stat/resolve 缓存包装器，调用未修改治理器的完整 check/main。保留分类、规则/Hash/path guard，结束重新读取对象类型、设备/文件身份与 Windows 属性，检测变化则拒绝。实际退出码、原始日志与指标见 [治理结果](../evidence/governance-result.json)。

缓存只用于冻结拓扑的完整检查加速，不是瞬时并发替换或所有 resolve 的通用等价证明，更不是 OS 隔离证明。另由 [只读交付验证](../tools/verify-delivery.py) 独立核对 Q3/Q4/Q4.1 原始清单及规则 Hash、264 源码/ZIP、194 项 staging、构建/审查目标、测试原件、真实权限 false 及最终 SHA256SUMS 完整集合。

运行中发现的失败、临时纯文件系统探针和模拟证据按 runtime 原件及 evidence 索引保留；没有为通过门禁启用新规则、降低检查、变更系统 ACL、提升进程或运行安装。最后一次完整 SHA256SUMS 验证在所有交付文件写完后执行，原始 stdout 归 task runtime。
