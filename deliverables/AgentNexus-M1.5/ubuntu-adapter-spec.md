# Ubuntu Adapter 技术准备

source/src/agentnexus/bootstrap/ubuntu.ts实现严格配置/启动计划与peer绑定验证，ubuntu/peer_probe.c提供实际SO_PEERCRED读取原语源码。Linux编译/执行NOT_RUN，不接触服务器。

独立非root UID/GID、UDS最小socket目录权限与SO_PEERCRED、pidfd和/proc start ticks、不可变映像hash；User namespace精确uid/gid映射且setgroups deny；private mount namespace只读runtime，无Host DB挂载；PID namespace可信init收割全树；Network namespace初始空且无继承socket；PR_SET_NO_NEW_PRIVS、seccomp默认拒绝、精确AppArmor profile；cgroup v2用CLONE_INTO_CGROUP在不可信指令前加入，限制pids/memory/swap/cpu.max。文件用openat2 RESOLVE_BENEATH/NO_SYMLINKS/NO_MAGICLINKS句柄owner。

cpu.max是带宽，不是累计CPU时间终止保证。ExitProof需全部pidfd signaled、cgroup.events populated=0、namespace init收割、stdout/stderr EOF、UDS请求账本settled或UNKNOWN、资源owner及独立裁定；单一信号不能解锁。缺失namespace/seccomp/cgroup/AppArmor能力拒绝，不回退到普通宿主命令。

真实服务器UID/GID、subuid/subgid、mount、socket/ACL、AppArmor/seccomp/cgroup控制器及恢复策略必须另行授权逐项部署。Windows模型、primitive或PASS不转移为Ubuntu PASS；当前准备模型测试PASS，OS adapter/deployment NOT_RUN。
