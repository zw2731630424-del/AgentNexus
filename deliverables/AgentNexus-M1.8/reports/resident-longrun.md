# Resident 长期运行

24小时 NOT_RUN；短墙钟实测及源快照见raw/runtime.zip的soak目录。soak-m18.ts接受最多86400000ms，最多约101个事件/新Agent，空闲无模型轮询，定期同store重开，有原始样本/CPU/RAM/SQLite/Artifact/队列观测。长等待按最多60秒分段。

PASS门槛只使用实际单调墙钟>=24小时；本轮约4.2秒事件观测只标short_run_status PASS，长期status NOT_RUN。模型为继承MOCK，无真实费用，不代表新wire Gateway长时资格；无OS reboot/断电/跨账户恢复实测。
