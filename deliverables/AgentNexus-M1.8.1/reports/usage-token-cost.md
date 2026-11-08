# 全局 Token 与费用账本

授权总上限1亿输入+输出Token，DeepSeek唯一真实Provider。cache包含在input、reasoning包含在output，不重复叠加。campaign固定ID、事务used+held准入，跨Key/Task/Session共用同一持久Host store；生产部署还必须固定唯一Host数据库，禁止换库获得新额度。当前OS部署未资格，所以真实全局Owner未激活。

Provider Usage优先；失败有Usage则记录实际Token，缺Usage保留完整预留并记ESTIMATED上界；任一未知请求阻断后续campaign发送。超额观察永久阻断等待Owner核对，没有reset或自动退款接口。90%附近inspect返回near_limit，操作方应提醒；尚无生产通知订阅资格。

DeepSeek费率helper支持cache/峰谷估算与BigInt向上取整；Gateway默认峰时全miss上界。估算费用与实际发票分离。真实请求0、Token0、费用$0；纯REAL账本算法fixture不计Provider消费。见usage-token-cost.json。
