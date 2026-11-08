**M1.6.1 独立审查：新增本地范围 PASS；完整回归 FAIL。**

最终源码集合：`d14401d7c39b069555f43c60360d5aab83e40bb32995008652cfcefb9862e9da`（140 文件）。范围内 11 项发现均闭合；完整回归 479 项为 469 PASS、8 NOT_RUN、2 FAIL，strict/syntax PASS，新增 M161 99/99 PASS。两项原始失败保留，CPU/production 继续 BLOCKED。

- [审查报告与边界](evidence/independent-review/review.md)
- [机器可读结论及原始失败](evidence/independent-review/review.json)
- [逐模块范围、复用依据与源码校验](evidence/independent-review/source-checks.json)
- [保留的失败及修后观察](evidence/independent-review/observations.jsonl)

- [完整回归原文（FAIL）](evidence/runs/final-v4-2026-11-08T01-03-48-062Z-36472/results.json)
