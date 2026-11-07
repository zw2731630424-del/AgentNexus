# Feature / Policy 增量

M1.4候选config包含原154+新增11=165个Feature；原41+新增3=44个Policy。既有条目对象保留，复用已存在的audit.producer.process，不重复注册同名Feature。根目录配置不改。

新增runtime.host/worker/broker.production、runtime.ipc.windows.production、runtime.sandbox.windows.production、runtime.file_broker、runtime.process_supervisor、runtime.exit_proof.production、runtime.resource_release.production、audit.producer.broker/file。全部OPTIONAL、默认OFF、G作用域，显式depends_on/conflicts/off_behavior/degradation/recovery/tests。关闭时拒绝新请求、撤销现有授权，已消费未知操作保留；没有直连Host进程、弱IPC或无沙箱fallback。只有经过可信bootstrap注册的实现和有效资格证书同时具备才可准入。

新增L0不可降级owner：P.REMOTE_PERMIT（Production Execution Broker）、P.FILE_BROKER（File Broker）、P.PRODUCTION_QUALIFICATION（Deployment Qualification Owner）。Policy合同表精确列出，ENFORCE/AUDIT_ONLY/DISABLED均由独立owner强制；不存在的owner拒绝。旧ToolGateway保留PROCESS/EXTERNAL_EFFECT硬拒绝；候选ProductionGateway只通Broker，不接受execute/shell回调。

SIMULATED测试显式注册模型模块并签模拟资格证书，不能复制为生产配置。发行默认没有资格证书，没有启用生产Feature。测试前缀M14-PERMIT/IPC/HOST/FILE/EXIT/OUTPUT/RECOVERY/RESOURCE/QUALIFICATION/IR及M1.4 REAL_WINDOWS在原始结果中逐项查找。
