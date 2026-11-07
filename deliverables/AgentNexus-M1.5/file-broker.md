# File Broker

FileGrant保留M1.4精确字段与原子nonce消费，绑定operation/runtime/instance/boot/project/task/resource/profile、路径、READ/CREATE/SUBMIT、expected/content hash、字节、epoch与期限。生产接线在消费前与audit barrier后实际重查Worker身份；失效身份不靠缓存ACTIVE读文件。

NativeFileOwner从盘符锚逐组件以目录句柄和NtCreateFile相对打开，拒绝reparse、symlink、junction、ADS、UNC/device、hardlink>1；祖先不share-write/delete，叶句柄核file ID/size/hash/version。字符串相对路径检查只是格式拒绝，不是授权边界。当前RPC单操作<=24KiB，CREATE只新建且先复制内容，禁止隐式覆盖/删除；读写授权/结果均审计。

M1.5有限摘要文件模式只允许<=4KiB，参数精确资源+相对路径+expected hash；Host消费原执行Grant后派生同operation的READ FileGrant，经真实FileBroker读取并全量核Artifact，再传双签名引导与bytes。Launcher/Worker分别验证签名/全部绑定/hash。Project resource为Host私有只读输入，Worker不获得管理数据库或其他项目路径。

模型攻击覆盖跨operation/resource/path/epoch/过期/篡改bytes、审计后撤权nativeReads=0；继承真实句柄文件原语另有日志。真实独立账户下跨项目/Host DB、竞争junction/hardlink/TOCTOU与实际任务组合仍BLOCKED，不能因模型或路径校验通过宣称全边界。
