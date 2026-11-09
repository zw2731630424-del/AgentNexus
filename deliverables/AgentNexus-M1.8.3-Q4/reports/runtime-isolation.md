# Native Runtime 实际隔离

**NOT_RUN / BLOCKED。** 无服务创建的 native Runtime 目标。以下20项逐项保持未执行：

- 服务创建Runtime：NOT_RUN。
- 实际父子进程关系：NOT_RUN。
- Runtime Token：NOT_RUN。
- Process Security Descriptor：NOT_RUN。
- Thread Security Descriptor：NOT_RUN。
- 私有继承句柄：NOT_RUN。
- Job Object：NOT_RUN。
- 生命周期监管：NOT_RUN。
- 服务停止时Runtime退出：NOT_RUN。
- Runtime崩溃授权撤销：NOT_RUN。
- Host崩溃授权撤销：NOT_RUN。
- 重启后旧Grant失效：NOT_RUN。
- 句柄访问：NOT_RUN。
- 进程打开：NOT_RUN。
- 线程打开：NOT_RUN。
- 内存读取：NOT_RUN。
- 进程注入：NOT_RUN。
- 句柄复制：NOT_RUN。
- 依赖替换：NOT_RUN。
- 实际DLL/Module加载路径：NOT_RUN。

静态 PE 导入候选和源码Hash不证明实际加载路径/对象权限。管理员、SYSTEM及内核级攻击不属于可由本轮普通用户边界作绝对保证的范围。
