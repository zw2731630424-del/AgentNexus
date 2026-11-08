# 路由与能力

CapabilityRegistry要求显式能力、来源、校验日期、价格有效期；未登记模型不可用。按model_binding及AgentType路由，工具、JSON、Streaming、上下文预算均校验，不凭名字猜测。Host可接受有理由的升级提案，每Task最多2次，并检查价差及实际Agent/Task/Project/Platform预算；升级不修改身份或工具权限。Task复合key使用canonical结构hash，冒号ID无别名。

无真实默认Model ID或价格。源目录中的synthetic模型只属于测试，不是官方模型能力或真实价格记录。
