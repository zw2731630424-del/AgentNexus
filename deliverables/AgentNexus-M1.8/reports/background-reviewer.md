# Git Reviewer

固定只读Git reader明确禁shell、协议传输、credential helper、external diff/textconv/hooks/fsmonitor，固定全仓diff与submodule指针策略，有界输出与deadline。Watcher持久事件容量128，重复不造Reviewer；创建中崩溃UNKNOWN不自动重试，新head使旧结果STALE。

Bridge已实际经原Harness创建独立只读Agent/Task、MessageBus REVIEW_REQUEST、事件唤醒并绑定commit/diff/candidate/source/rules。G4 helper要求原回合、采纳消息、精确artifact与可信verify；模型PASS缺verify仍NOT_RUN。真实Git reader此轮仅固定argv/spawn mock与本地只读资格，持续Commit/Push事件服务和真实push事件NOT_RUN；Host必须供最新事件，未装Hook、未Commit/Push。
