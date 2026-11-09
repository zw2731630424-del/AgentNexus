# 回滚与数据保留

本轮只写独立Q2交付和规范runtime/task材料，未改变现有安装、Windows服务、账户、ACL/ML、防火墙、AppContainer或Ubuntu。现在无系统回滚动作需要执行；原M1.8.3/Q1字节继续保存，旧同SID失败证据不删除。

未来部署获批后的回滚应明确停止获准服务、撤回/等待CMS计划过期、确认私有Job/Node及短时helper退出，并断开请求句柄。Daily未用Grant应撤销；已发送请求转UNKNOWN，保留原Token占用，不自动重发，不用降级旧同SID Vault恢复可用性。

保留服务身份加密Vault、原唯一ledger.sqlite及其一致的WAL/SHM备份、审计和版本/epoch。不要把qualification合成库迁为正式库，不重置100m计数，不覆盖旧数据。回退旧二进制也不能复用新版本consent/ticket，需独立验证schema/协议兼容后按批准发布。

恢复代码版本可以停用Q2入口并保持元数据可见。旧High通道不得改成Medium、不得把整个Electron提升为管理员、不得添加明文文件/env回退。任何删除/移动安装、账户/ACL清理或服务注销应按用户单独批准的精确路径执行；本包没有自动清理或安装脚本。
