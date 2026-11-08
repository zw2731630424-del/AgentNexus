# 首三个请求正文与Hash草案

状态DRAFT_BLOCKED_NOT_SENT。model deepseek-flash，endpoint https://api.deepseek.com/chat/completions。公开固定结构化协议+新生成合成任务，未加入项目规则、历史、科研、源码、路径、服务器或凭证。实际Context Assembly已capture/assemble/reconstruct；同一生产DeepSeekAdapter生成完整wire；没有调用Gateway.complete或任何Transport。首轮目标为结构化文本、中文JSON、tool intent，不能替代普通非JSON、多轮及tool-result完整联调。

| 请求 | Request SHA256 | 预留Token上界 | 费用上界 |
|---|---|---:|---:|
| m182-smoke-01 | `d8592ce7fa6cb6c10eef7a04ae5622d14ff61f153a0ff0d1b849673797ad3865` | 4669 | $0.001516 |
| m182-smoke-02 | `2bf82b8ddaa35434afdaade70728c8df0bbfc48140dd8d67db78d30f47979df6` | 4770 | $0.001604 |
| m182-smoke-03 | `9ca1e2bd87361ba4339c841c861511164e7bb0b00d82ed6df5219d39c68681dc` | 5115 | $0.001765 |

完整body原字节、context、source决定、component/source manifest及Context/body/source/review hashes见[evidence/requests](../evidence/requests/request-index.json)。Request hash算法SHA256(canonical(full non-credential HttpEnvelope))，body hash为原始body.json文件字节SHA256；Context hash为context.txt字节SHA256。请求尚无authorization header；真实header只允许合格Vault在Host内注入。

当前Vault OS隔离FAIL，生产egress与唯一账本BLOCKED，active grants/reviews=0。最终执行申请WITHHELD，不请求用户批准这些未达资格的草案，也不索取Key。未来获准部署后必须重新生成并展示最终全文/hash/model/来源/token/价格，经用户确认才通过可信入口使用凭证；当前草案不携带可重用consent。
