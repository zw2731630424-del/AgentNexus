# Production Broker

Host标准账户中的可信Broker owner使用独立KernelStore账本，复用M1.4 ProductionExecutionBroker；Worker Launcher不获得管理库对象。Host与Broker在当前候选同一可信控制进程，不声称二者具有互相隔离的OS身份。

Broker验证实际Launcher pipe peer及签名启动证明，再将预备runtime精确绑定；Remote Permit绑定Agent/runtime/instance/operation/intent/tool/version/resource/profile/boot/generation/epochs/nonce/expiration。原审批/Permit消费和五资源预留原子提交，Broker另有唯一operation/permit/nonce/runtime/request账本；先durable START_INTENT，最终Host fence/peer/期限检查后才向Launcher发送START。断连不重发副作用。

运行输出最多一块/流，native与传输有界背压，Artifact流式写入。审计、artifact、transport故障终止/隔离，不能静默返回成功。Feature OFF、Policy DISABLED或Broker关闭不开放旧Gateway PROCESS/EXTERNAL_EFFECT，工具映射只有固定nexus.digest。

资源释放有单独Host owner receipt：真实完整签名proof、独立最终裁定、closure、原release授权已消费和五资源版本均满足后，Host才签名；Broker复核本地完整proof/intent/boot/资源，持久RELEASED。重复ACK不重复释放。只更新RELEASED资源投影可复用，revision递增；UNKNOWN不能覆盖，原operation/intent与审计不改。

完整生产dispatch依然受空资格证书/默认OFF和真实隔离证据阻断。模型fixture/真实同账户进程不构成生产Broker部署PASS。
