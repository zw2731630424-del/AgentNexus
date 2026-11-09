# 最终 Data Egress 与请求完整性

复用既有 `inspectFinalRequest`、Provider Adapter 和 Broker，不重开发出站系统。生产真实请求继续 BLOCKED。固定协议系统提示、Context Assembly 中 Agent Role/Task Contract/历史/文件内容、Tool Schema 及附加字段必须全部由原精确审阅覆盖；当前初始 profile 只允许已检查的 PUBLIC/SYNTHETIC，未审阅的 Developer/System 附加消息、未知字段与不完整来源清单拒绝。

Agent 的 PUBLIC 声明不提供授权。源记录必须逐项匹配 source/range SHA 与完整 context.text；body 必须是 Adapter 的规范 JSON，系统提示固定，user 内容等于所审完整 context，tools 还需独立 schema 审阅。INTERNAL/CONFIDENTIAL/SECRET 拒绝，不能通过普通 Daily 入口扩大政策。

服务 Grant 冻结 full input hash，Broker 冻结 request/context/body/source、Provider/Model、Egress decision、credential Handle 和 reservation。Grant prepare、execute、解密后的最后 send fence 重验原 consent；撤销 decision 或 Key、换正文/Context/Provider/Model/Header/URL 后不发请求。服务负责最终 HTTPS 和 Authorization，普通 Host/Gateway 只收安全结果/Usage。

已有 known-secret Guard/常见敏感路径模式只是补充检查，不是能辨别所有机密的通用 DLP。没有可信来源审阅和生产 Runtime 就不允许出站。审阅器支持哪些组件取决于当前受限 Adapter；本包没有把“能存任意 Provider 元数据”变成能对任意 endpoint 代理。

合成测试覆盖未审内容、错Hash、来源覆盖不全、敏感路径、禁止分类、任意HTTP字段、撤销后执行等；实际 API 与账单均未触发。
