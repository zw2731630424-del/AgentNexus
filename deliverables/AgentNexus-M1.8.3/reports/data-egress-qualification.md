# Data Egress 资格

离线逻辑范围在本轮测试；生产 **BLOCKED**。复用 M1.8.2 inspectFinalRequest，对实际 request.headers/body、固定 system 协议、完整 Context 各来源、角色/历史/工具 schema 逐项检查；任何追加 developer/system/history/files 字段、重复 JSON 键、未知模型/Endpoint、来源 hash 不匹配或已知秘密均拒绝。

只允许经独立审阅的 PUBLIC / SYNTHETIC。INTERNAL、CONFIDENTIAL、SECRET 和未知分类拒绝；Agent 自报 PUBLIC、旧 hash-only 决定或 JSON approved=true 不生成许可。实际源码、AGENTS/内部规则正文、历史档案与科研材料没有进入任何真实请求。服务在最终认证发送前再次复验 exact grant、Subject/body/context/source hash、epoch、期限、Handle 与预算。

本轮合成 review 是明确的测试 authority，只在 Fixture/签名资格测试模式存在；它没有通用 DLP 资格，也不能被算作用户真实 consent。生产 consent 只从受保护、外部签名的具体请求审阅文件导入，普通 RPC 无 approve。扫描启发式与已知秘密 Guard 都不被称为完整 DLP。

新增5份正文草案未发送/未预留/未绑定真实 Handle，详见请求审阅材料。只有生产凭证/外发资格通过并由用户确认当时确切正文和绑定后才能执行。
