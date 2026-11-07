# ExitProof

保留M1.4签名Proof v2原件、Artifact hash导入、immutable表与独立Host verifier；增加M1.5 closure持久表。状态区分TERMINATION_REQUESTED、PROCESS_EXITED、PROCESS_TREE_EXITED、OUTPUT_PRODUCERS_SETTLED（closure中映射OUTPUT_SETTLED）、EXIT_VERIFIED/EXIT_UNVERIFIED。

完整退出必须有唯一root/完整父链/Job全成员退出、无未知成员、进程及Job句柄观测、stdout/stderr producer EOF与Artifact全hash、sandbox token/network/filesystem/limits事实、sandbox settled。closure再要求实际source、连接撤销、pending=0、unknown=0、sandbox关闭、五资源owner精确版本和释放条件。proof和closure均需成功持久化+审计。输出或IPC未知不能以根进程退出代替。

Host只接受固定Broker公钥；原signed_packet和原body分别保留，远端Artifact流式核hash/bytes，导入与send共用截止/取消。closure不是操作副作用最终裁定；它本身也不释放资源。

本轮模型/审查证明不完整或伪造材料拒绝、循环父链拒绝、owner/IPC不完整不能release。当前native的网络/文件系统/全部硬限制事实仍false，生产proof不能EXIT_VERIFIED。真实进程树/完整执行环境退出证明仍BLOCKED。
