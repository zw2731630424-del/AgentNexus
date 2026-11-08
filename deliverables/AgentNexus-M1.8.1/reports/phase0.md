# Phase 0：基线与官方技术核验

根AGENTS、治理策略和工作流路由已读；project-rules/README.md不存在，未修改规则、启用模块或安装Hook。M1.8完整验收、Vault设计/联调草案/安全审查、Gateway/Adapter/Router/Key Pool/Usage/资源与Context边界已读。此前没有独立Data Egress Owner，本版新增精确字节准入。

main / 9d38c92c1c77d079622f03358c09f875bfdd49a8。178文件源码集 cddca8b1cc71876d8a078018aaac09fc8804df7ce0453b8fd455d150ed5475dc 与M1.8匹配；251项交付SHA全部匹配。基线前git status观测为空；冻结记录中的唯一untracked是本轮刚创建的m181-delivery.py。15762项历史与根产品在交付结束再次逐字核验，不覆盖历史结果。

官方API核验来自公开文档浏览，未带Authorization，也未调用模型服务。request ID deepseek-flash对应当前文档服务标签DeepSeek-V4.1-Flash-1017；文档示例response.model仍为别名。实际模型响应、版本固定和/models在线发现均NOT_RUN。见deepseek-official-check.md与机器registry。
