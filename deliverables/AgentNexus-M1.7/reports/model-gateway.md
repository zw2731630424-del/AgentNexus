# Model Gateway 报告

真实 Provider、真实费用和真实 API Key 均未接入。显式 pilot-mock Provider、pilot-small/design/review 三模型与 cheap/design/review/lead/delivery 路由完成71次请求；调用和 usage 均 SIMULATED，真实费用0。普通角色采用低成本策略，设计与审查分别映射较强模拟策略；模型能力不提升权限。

继承 Provider Registry、Model Registry、Router、Opaque Mock Key Handle、Usage Ledger 与预算。第三构造参数仅允许可信 Host 提供同步 MockResponder；原第二参数严格 schema 不放宽。hook 只看冻结的原输入、公开subject/request/model；不暴露 Store/admin/凭据、网络或文件句柄。fixture文件hash和版本被审计。

请求 SENT 后 throw、畸形结果、取消或未知副作用保留 UNKNOWN、Key与预算，不 fallback、不自动发第二个付费请求；明确未发送才可切换。新负面测试覆盖上下文/权限不泄露、错误/取消与资源保留。Vault 目前是接口与模拟句柄，真实秘密存储、真实Provider故障联调 NOT_RUN；不声称已完成生产密钥体系。
