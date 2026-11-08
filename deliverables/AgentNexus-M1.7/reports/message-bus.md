# Message Bus 报告

沿用 M1.6.1 持久消息、租约、去重、原文、确认和原子 Task 交接。最新 Pilot 保存32条消息和31份交接，包括受控 Host 重开时的待处理消息；每次有效交接绑定原 payload hash 和接收 Task revision。原文本与交接均可通过 host/kernel.sqlite 与压缩 Artifact 追溯。

新增事件循环以消息原始 ContextSource 的规范hash绑定 wake 事件，区分可安全恢复的 WAIT 与待审批/UNKNOWN。重复、过期、离线、取消、唤醒失败、晚到消息与队列容量竞态由消息/事件测试验证；真实发送、接收、恢复、继续与回复在 Pilot/Resident 中实际发生。业务 ANSWER 去重补上时，首次 AGENT_UNAVAILABLE 失败没有删除。

消息和事件均有容量上限，不做无限轮询或无限内存增长。过期处理和失败关闭不产生隐式重试外部副作用。
