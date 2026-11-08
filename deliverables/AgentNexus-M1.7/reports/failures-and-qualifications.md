# 历史失败、尝试与资格

M1.6.1原验收为469 PASS / 8 NOT_RUN / 2 FAIL，原文件、问题和资格原样保留。M1.7基线重现包括错PowerShell路径的一次417/31/24、正确工具但沙箱原语受限的一次439/28/12、原生链接条件下的一次470/8/1；都保留原日志，不能把最终通过回填历史。

M1.7首次完整回归531=520 PASS/9 NOT_RUN/2 FAIL：旧最大路径测试被过深输出根触发；Native固定Runner的过深cwd spawn ENOENT并引出ENOTCONN。未降低旧路径240限制，改为短运行目录；增加spawn/pipe失败关闭，pin工具改流式hash。之后新增53=52PASS/1NOT_RUN，最终完整532=523PASS/9NOT_RUN/0FAIL。

早期Pilot一次因向已停止code-cli重复ANSWER失败，一次在7Gate已PASS后lead触及32历史引用上限而整体FAIL；均保留。按业务关联去重和显式历史窗口修复后，原lead恢复连续研发成功。单独history测试最初只查前100审计导致查询断言失败，后来完整分页查询通过；它不是原Archive丢失。

CPU/JOB_TIME与TOCTOU旧断言本次可能因时序通过，但不补足严格累计CPU或生产组合所需资格。历史累计CPU失败与deadline终止原因不改变。最终完整回归PASS仅指当前断言，OS生产、PROCESS/EXTERNAL_EFFECT与严格累计CPU仍BLOCKED。

9项NOT_RUN逐条见验收JSON/原results：真实文件/目录symlink权限、保护DACL正例、跨账户生产启动、旧orphan观测窗口和新增checker真实symlink。未改OS权限去消除skip。普通junction/hardlink反例有实际运行证据，不用它们替代需要symlink权限的正例。
