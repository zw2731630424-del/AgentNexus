# AgentNexus M1 文本导出完整性报告

状态：**PASS（本轮导出/字节完整性检查，不是新产品测试）**。核验UTC：2026-11-07T01:49:08.489443+00:00。

## 数量与范围

| 项目 | 数量 |
|---|---:|
| current_native_implementation_files | 14 |
| current_test_files_and_helper | 6 |
| current_test_entries | 5 |
| test_review_code_files_including_developer_tools_and_history | 13 |
| all_original_code_files_including_dev_history | 35 |
| all_original_source_configuration_metadata_files | 38 |
| original_evidence_files | 49 |
| unique_original_files_exported | 87 |
| original_codeblock_occurrences_with_shared_config | 91 |
| codeblock_occurrences_including_new_verification_tool | 92 |
| explicit_excluded_historical_outputs_and_M0_tools | 2202 |

额外1个本轮导出校验工具独立标记，不计入原始M1源码数。14原生实现含仅测试加载的integrity库；M0.1开发工具、M1验证器/探针和v1快照都未冒充Host当前模块。没有单独静态输入夹具、独立Migration/Schema、锁文件或tsconfig，分别说明NOT_AVAILABLE/内嵌位置，未造文件。

## 实际执行的自动比对

使用与导出器分离的 verify_text_export.py，直接读取每份Markdown的bytes，寻找独立记录标记和动态长度fence，截取原始N个字节，核对closing fence/包装换行、SHA256、UTF8与原件字节相等。计划集合来自全目录枚举、Core ZIP、原始运行快照及03证据清单，不从导出的章节反推预期文件集合。逐项双向比较，防止遗漏或重复掩盖缺件。没有对源文件做换行替换、strip、JSON重排或AST重写。

- 原件与提取内容逐字节相等：PASS。
- 源码、测试、研发/历史文本、原始证据必需集合完整：PASS；缺失0，截断0，未说明遗漏0。
- Core ZIP载荷18文件与当前实际目录/运行快照逐字节相等：PASS；所有当前候选24文件均导出。
- 全部当前源码的本地导入与固定适配器/配置/子进程资源：在既有闭包与正文核对中完整保留。
- 现有测试结果不重跑，不改变FAIL/NOT_RUN/CHANGES_REQUIRED；原始正文SHA核对通过。
- 治理check：PASS，只读检查；没有new/refresh/rules/hooks、commit/push。
- 原始项目/所有历史包和交付保持：PASS，共14199个既有文件大小、mtime及SHA256不变。

## 逐文件对应与原始SHA256

| 原始完整相对路径 | 原始字节数 | 原始SHA256 | 文档及正文起始行 |
|---|---:|---|---|
| `.workflow-kit/runtime/AgentNexus-M1-Text-Review/verify_text_export.py` | 5883 | `d761b181af2713fbdd283cf606a81552639ab652bad9b7951f6b58fe58dfaa88` | [AgentNexus_M1_Export_Verification_Tools.md:17](AgentNexus_M1_Export_Verification_Tools.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M0.1/admission.py` | 3886 | `ff6b782bb523146559da458145f38a1ffbc27f460da12d048942b72ec14cbeba` | [AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md:17](AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M0.1/baseline.py` | 1516 | `92acd8c3a91b4481ee2562c2fa3d70cc5b7dd3411fc41b4ba1e5b987bdfefc98` | [AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md:83](AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M0.1/build_catalogs.py` | 17808 | `7e2a3c4ce49658145c5e1def89f1815bc88b3d22af43193aa2531d002e743c22` | [AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md:119](AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M0.1/integrity/recheck.py` | 12890 | `d4c085ba27c964e23cb2ab83a148fc3c6266d95b64d694d036503f9f1e1c14cc` | [AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md:268](AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M0.1/record_change.py` | 1243 | `8ab7d0cbc39f99ee4b6ca376c797bbd7c30a878f3a62a908c3395fd03e02fa37` | [AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md:229](AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/all-tests.tap` | 27367 | `7d116aa26a4593a2b3b2964c4717921cd844116756bafb05fd64edbfa8eea372` | [AgentNexus_M1_Runtime_Evidence.md:17](AgentNexus_M1_Runtime_Evidence.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/demo.json` | 4800 | `4383842347119246960587b81966310a786ff8945a5bacfd209dbe6eadcce677` | [AgentNexus_M1_Runtime_Evidence.md:3736](AgentNexus_M1_Runtime_Evidence.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/demo.stderr.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md:17](AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.tap` | 4166 | `efd37cab25de4e616f64bba6e4a854b68fb7335c629559b31fb16986cffe4080` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md:32](AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/test-results.v2.tap` | 365 | `2cd56834dc32700442bab5ba891e9c7ef048848807baef0ebbbd45d2f9646011` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md:165](AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/verification.json` | 12044 | `e2334ddb133a9601fd2a99213e58b94b40fee3e4a3b3b22f4a6c4f6ddaf9a397` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md:196](AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/verification.v2.json` | 3513 | `4ecd91187ad9a8a0bffa3915d605ecbb64bd9e197d869c5b2f806610f22891b3` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md:563](AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/all-tests.tap` | 27360 | `9492c2ff19b7504baf34b42e80a5a3b2460f0f0d579f14d7605aee7b9ccb6a6e` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md:667](AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/demo.json` | 4800 | `67e288651b24d90506266ed0b953dc8c2eeb90fa147b03a6ed0d39fa8484cf6a` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md:1505](AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/demo.stderr.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md:1659](AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/final-verification.json` | 7781 | `2f7e49d3b634ca5339e8797f47c20a4d1ba16bcf3ea9294c259ef83a7ac032b3` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md:1674](AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/govern-final.log` | 24 | `74b9b169f20d84d2bc14b03ada594625dda519a7f855845ca917f6ec53661344` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md:1943](AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/license-closure.json` | 24843 | `8735e958b08c2f776231d26a2419ed95340cc3470e8377526640a8c1ed7e9eef` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md:1959](AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/syntax.json` | 1950 | `267a9b2523878a8918b004ca763dc2bf517402f8bc2bdbe449bb84a31a18d5f0` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md:17](AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/final-run-1/test-results.json` | 30638 | `8e8a6d90fed9dd3b015b74fa1517d2162a38f821161d3a6c899de104fec81c4b` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md:134](AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/final-verification.json` | 8175 | `04adc9bd1e896e498172c1be426d04a34411b4f9699c429b9c36cde517fe6561` | [AgentNexus_M1_Runtime_Evidence.md:1970](AgentNexus_M1_Runtime_Evidence.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/final_verify.py` | 22148 | `75e7432a9978e52b575d995351335ef60a1e9675c6011e7556233ad66ea25910` | [AgentNexus_M1_Test_Review_Part2.md:400](AgentNexus_M1_Test_Review_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/govern-final.log` | 24 | `74b9b169f20d84d2bc14b03ada594625dda519a7f855845ca917f6ec53661344` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md:1249](AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-01.json` | 1368 | `f5086eddec462029bf31c1484b7c01b2efdea0d991d999e6b9ebb6562561fd6f` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md:1265](AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-01.tap` | 904 | `af0c62c7d73c4a412421fb57ee11230c8459e0cbd8fcb97e2c178fc2c3428dff` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md:1317](AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.json` | 1927 | `a4f2252044c9bf459a6f4e378313f44980de6e98f2042fef4defee433557a492` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md:1364](AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/attempt-02.tap` | 11281 | `f75d61f608a6e8c79a9a875560fa2d0f231d2d7681b7eb4f77c9cdd70b86783f` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md:1421](AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/implementation.json` | 9330 | `d83e0ea23ef1b1939e430492c10b0b0326a2c8376d02a0eb694124e3a5c28ca4` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md:1816](AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap` | 9705 | `219cf8196b126b0c8d96501ec55fc36a814df64c7a7322ab2bae84081fec5818` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md:2069](AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/run_tests.py` | 2664 | `5e8073e5906254ee404373c22756bfcfb0bcd77b3c5e638a2c6a3d292e3e5b7e` | [AgentNexus_M1_Test_Review_Part2.md:588](AgentNexus_M1_Test_Review_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/test-run.json` | 1926 | `8ffb9dc980a3c23af1deb86d025af8d184bd3d364bcf37a87e56f01d28fc7527` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md:2445](AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/license-closure.json` | 24843 | `1e0f8cc3a2284d8c9567db03ffaf3d7caa33ea275735740eb4f46e202dd5feca` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md:17](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-before-close-race-fix.json` | 10165 | `319b8bef22cd43925ec367b3d1dda2ff5d47b5f70a1f73761b0c59dbb2e0c176` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md:835](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-before-timeout-fix.json` | 10538 | `11eaae06fde02dc5e2e6b1c3f6ecc4ba3abb04b3b88bbf6281984382369e44cc` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md:1085](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes-initial.json` | 7389 | `b994cc67418c7a8e6f6ae405ef11d312a1c3774e81640e3ab0a1b0edaabd3812` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md:1344](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.json` | 9613 | `a8d703f12278186cc809a1a84cd40a8f440f133ba8ef5dc5832932e5d0817e6d` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md:1535](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.ts` | 9855 | `de2381560f636824e80c135e97dd5ded48f4e1fae580238525676532da870368` | [AgentNexus_M1_Test_Review_Part2.md:650](AgentNexus_M1_Test_Review_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-review.json` | 39563 | `d8e058bfa2504342c2fef7208d701c7d7e03f98ff2b6f42287d2b5f9238de3d1` | [AgentNexus_M1_Runtime_Evidence.md:2247](AgentNexus_M1_Runtime_Evidence.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/final-control-probes.json` | 3360 | `e16ddd843b637010f105f0986242a35d66b9b42f738d4c54845882ba51cb7dac` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md:1771](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/final-control-probes.ts` | 6521 | `3e76ca67b1f039436e75a331f2d2dd6d32f7a5c2b2942afb6364be2e00549ddd` | [AgentNexus_M1_Test_Review_Part2.md:831](AgentNexus_M1_Test_Review_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/stop-recovery-probe.json` | 1251 | `de96a9aca9d3895c68b3bb82aeb85337787129a33fa9e63480540a34356a1630` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md:1857](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.json` | 29484 | `49d658b1b43597214f460a52fea42c31afd9896d7180271b5f0a2dfe871da797` | [AgentNexus_M1_Runtime_Evidence.md:3119](AgentNexus_M1_Runtime_Evidence.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.v3.json` | 5541 | `6d046139a4b13833349d0fea0f9a611ded739216c814cd5fad193bc787d69ec0` | [AgentNexus_M1_Runtime_Evidence.md:3890](AgentNexus_M1_Runtime_Evidence.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/run-history.json` | 2169 | `d204e793ed1b4d49890ee08c29ad6b57e645f61a6264567cab5d19b5d5689084` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md:1918](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.tap` | 4177 | `1a82c98c3558c7165b5a7691900d7b9b10e5b42969959a0db45507d94ac0ac77` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md:1995](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v2.tap` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md:2122](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/tests.v3.tap` | 5121 | `a85e4a146caea6954a01f8e6102c442994413e2560c54d7d1db4ef16b2b01010` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md:2137](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/artifacts.ts` | 12687 | `4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427` | [AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md:470](AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/owned-storage-child.mjs` | 1885 | `7a469bfa662d98f39f06b4483eaa1f49809e490817679cce5f7f1fa366133139` | [AgentNexus_M1_Test_Review_Part2.md:991](AgentNexus_M1_Test_Review_Part2.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/records.ts` | 6510 | `393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800` | [AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md:693](AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/snapshot.json` | 1981 | `de341a5e63ed863bed6e9d19f8467bc1f3f9271cf90a2b551e9bb981fcfe13bc` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md:2288](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/storage.test.ts` | 21732 | `e0f269cd0b73b5d70f5e5d91e8e57c9de905a182e81aaf31db6e7c736e95f923` | [AgentNexus_M1_Test_Review_Part3.md:17](AgentNexus_M1_Test_Review_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/storage.ts` | 31836 | `7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb` | [AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md:807](AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/tests.tap` | 4177 | `1a82c98c3558c7165b5a7691900d7b9b10e5b42969959a0db45507d94ac0ac77` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md:2351](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/verification.json` | 5225 | `4a568ab6b447605e354694025165cdc65dc1de8fa061f8b6c61509b236af909d` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md:17](AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/verification.json` | 5225 | `4a568ab6b447605e354694025165cdc65dc1de8fa061f8b6c61509b236af909d` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md:186](AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/verification.v2.json` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md:355](AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/verification.v3.json` | 6635 | `d2658f021124fa727c09e909baec4934b9fd191204f6f83c92b00acf59dfb433` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md:370](AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/syntax.json` | 1950 | `267a9b2523878a8918b004ca763dc2bf517402f8bc2bdbe449bb84a31a18d5f0` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md:582](AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md) |
| `.workflow-kit/runtime/AgentNexus-v0.4-M1/test-results.json` | 30638 | `e72ea36f1fbf031c1c750f422bc1ecceed4cc324fc738163bc7a04fe437fb524` | [AgentNexus_M1_Runtime_Evidence.md:855](AgentNexus_M1_Runtime_Evidence.md) |
| `config/agentnexus/features.json` | 390886 | `ed7b7ad4fd9d8e34bc28b9873cc397dd33932b0f27f21eb550f70951361154a7` | [AgentNexus_M1_Source_Review_Part5.md:17](AgentNexus_M1_Source_Review_Part5.md)<br>[AgentNexus_M1_Test_Review_Part4.md:17](AgentNexus_M1_Test_Review_Part4.md) |
| `config/agentnexus/policies.json` | 91143 | `74cb43697d45606fb2f3ad716b28a5125b5faff808de8973c3ab28c77e41c7b3` | [AgentNexus_M1_Source_Review_Part4.md:17](AgentNexus_M1_Source_Review_Part4.md)<br>[AgentNexus_M1_Test_Review_Part5.md:17](AgentNexus_M1_Test_Review_Part5.md) |
| `missing_files.json` | 87776 | `7e3f28d55e4be8fd731e0f6f42f42923ad332cf831b6cde0223a1cbacd7cd80e` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part5.md:17](AgentNexus_M1_Runtime_Evidence_Supplement_Part5.md) |
| `package.json` | 293 | `e23288d939a3706e522bf34a1d87802242b418749c37f1e54c5b481562ffd809` | [AgentNexus_M1_Source_Review_Part3.md:250](AgentNexus_M1_Source_Review_Part3.md)<br>[AgentNexus_M1_Test_Review_Part2.md:938](AgentNexus_M1_Test_Review_Part2.md) |
| `source_snapshot_manifest.json` | 36354 | `376de1e406c3557a27f9aced702fef28d3f732f78c7d0ba14dd37862244b70bb` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part6.md:17](AgentNexus_M1_Runtime_Evidence_Supplement_Part6.md) |
| `src/agentnexus/artifacts.ts` | 15666 | `f89cd95c7c373e1551d509f82596e54e203f0bb02b2934e1c2108040ef48bc49` | [AgentNexus_M1_Source_Review_Part1.md:1024](AgentNexus_M1_Source_Review_Part1.md) |
| `src/agentnexus/checkers/powershell_ast.ps1` | 3780 | `90079d41e2083df61ee87456cbe81a4d1863b2f4053df0ab9e78b668e3789ae8` | [AgentNexus_M1_Source_Review_Part3.md:148](AgentNexus_M1_Source_Review_Part3.md) |
| `src/agentnexus/checkers/python_ast.py` | 2998 | `a9595eca900b49c4ec88e82599c28569b01e543ed8ecb52908ae0772b104fc6e` | [AgentNexus_M1_Source_Review_Part3.md:60](AgentNexus_M1_Source_Review_Part3.md) |
| `src/agentnexus/cli.ts` | 1928 | `458b10cdbe3236b0e5ace1439334095bc30243fafeaf071273de956d22511b15` | [AgentNexus_M1_Source_Review_Part3.md:17](AgentNexus_M1_Source_Review_Part3.md) |
| `src/agentnexus/control.ts` | 7027 | `b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc` | [AgentNexus_M1_Source_Review_Part1.md:424](AgentNexus_M1_Source_Review_Part1.md) |
| `src/agentnexus/diagnostics.ts` | 31299 | `d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d` | [AgentNexus_M1_Source_Review_Part2.md:194](AgentNexus_M1_Source_Review_Part2.md) |
| `src/agentnexus/features.ts` | 12008 | `d6aafeafd88f6fd5660afa6b4f29b68625d70ffc8f8138f90db657b6acacda5e` | [AgentNexus_M1_Source_Review_Part2.md:17](AgentNexus_M1_Source_Review_Part2.md) |
| `src/agentnexus/gateway.ts` | 18759 | `85ab9f4312f17783ad5a2101c6582e769378489a29f3d62e0919cd3bdb1ff5ec` | [AgentNexus_M1_Source_Review_Part1.md:17](AgentNexus_M1_Source_Review_Part1.md) |
| `src/agentnexus/host.ts` | 16750 | `ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c` | [AgentNexus_M1_Source_Review_Part2.md:677](AgentNexus_M1_Source_Review_Part2.md) |
| `src/agentnexus/integrity.ts` | 18691 | `172a40c429c9e8a99f8cc1fcee2ef500adb4e7d378f0f6188fbbe7f792edfe66` | [AgentNexus_M1_Source_Review_Part2.md:1164](AgentNexus_M1_Source_Review_Part2.md) |
| `src/agentnexus/policy.ts` | 13815 | `98cadd7673c9d523733bb9fe1d1d62a036516aa63c9c0441a758dc39a14d18d2` | [AgentNexus_M1_Source_Review_Part1.md:240](AgentNexus_M1_Source_Review_Part1.md) |
| `src/agentnexus/records.ts` | 6510 | `393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800` | [AgentNexus_M1_Source_Review_Part2.md:908](AgentNexus_M1_Source_Review_Part2.md) |
| `src/agentnexus/storage.ts` | 33030 | `172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d` | [AgentNexus_M1_Source_Review_Part1.md:535](AgentNexus_M1_Source_Review_Part1.md) |
| `src/agentnexus/types.ts` | 6814 | `101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75` | [AgentNexus_M1_Source_Review_Part2.md:1022](AgentNexus_M1_Source_Review_Part2.md) |
| `test_evidence_index.json` | 788410 | `07edc4589857a4cd01e75f12ab938447889c53245c3419d45cc1ba88d17295f2` | [AgentNexus_M1_Runtime_Evidence_Supplement_Part7.md:17](AgentNexus_M1_Runtime_Evidence_Supplement_Part7.md) |
| `tests/agentnexus/control.test.ts` | 16933 | `c392c452fad08a00ce91c0b010f27bc99699c5b9c3e58416a08b9f8413f79441` | [AgentNexus_M1_Test_Review_Part1.md:17](AgentNexus_M1_Test_Review_Part1.md) |
| `tests/agentnexus/diagnostics.test.ts` | 19069 | `67eef7a1adfc1b2baceb62ca4cd157d8737332e8595f0d93a63bcfb853257394` | [AgentNexus_M1_Test_Review_Part1.md:246](AgentNexus_M1_Test_Review_Part1.md) |
| `tests/agentnexus/gateway.test.ts` | 17859 | `96620a3ee83c8b1c65e798ab575fe4ff2a9ccd62ecf69f090d0b70e06fa73824` | [AgentNexus_M1_Test_Review_Part1.md:579](AgentNexus_M1_Test_Review_Part1.md) |
| `tests/agentnexus/integrity.test.ts` | 21578 | `ecc6655be30a7d7690f04e5d26c61f09eaaa988ae1075b63327fe98c97c93277` | [AgentNexus_M1_Test_Review_Part1.md:797](AgentNexus_M1_Test_Review_Part1.md) |
| `tests/agentnexus/owned-storage-child.mjs` | 1885 | `7a469bfa662d98f39f06b4483eaa1f49809e490817679cce5f7f1fa366133139` | [AgentNexus_M1_Test_Review_Part1.md:1227](AgentNexus_M1_Test_Review_Part1.md) |
| `tests/agentnexus/storage.test.ts` | 28870 | `d0cae519ebfce054002a51b10b292cc870f2bbe01c67706dd1fd9a203525a3da` | [AgentNexus_M1_Test_Review_Part2.md:17](AgentNexus_M1_Test_Review_Part2.md) |
| `tools/agentnexus/run-tests.mjs` | 667 | `7b1b45b072e55e4c2e079e90aa963d94584a871496945ed88b737cb42dd4c0b7` | [AgentNexus_M1_Source_Review_Part3.md:278](AgentNexus_M1_Source_Review_Part3.md)<br>[AgentNexus_M1_Test_Review_Part2.md:966](AgentNexus_M1_Test_Review_Part2.md) |

## 未导出与排除

必需的当前源文件、测试/夹具代码、辅助和本轮指定原始报告没有未导出项。被有意排除的历史生成样本/旧ZIP及M0研究工具，均在Excluded_Artifacts各Part逐完整路径记录SHA256与原因；没有删除或覆盖原件。node_modules、第三方源码、缓存、无关构建产物不进入当前源文件集合，M0.1/M1自有代码已另作递归扫描而没有跟缓存一起忽略。

## 敏感信息与测试解释

候选原始源码/测试/证据逐文件强格式筛查没有发现凭据；不会读取Live API Key、凭据库或环境变量值。若命中，将仅写路径、行号和模式ID并中止，不会替换秘密。合成测试数据/注册回调/时钟spy是原始测试的一部分，未宣称真实模型验证。所有未执行合同沿用NOT_RUN/BLOCKED。格式/来源检查不构成对任意编码内容的普适秘密证明。

## 所有文档的SHA256

下表覆盖已生成的其他Markdown；本报告自身的准确SHA256位于[SHA256SUMS.txt](SHA256SUMS.txt)，避免自引用。SHA256SUMS包含本目录每一个Markdown，只有精确的SHA256SUMS.txt自身不做自哈希。

| Markdown | 字节数 | SHA256 |
|---|---:|---|
| [AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md](AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md) | 94413 | `d3c51044a55eeede9f828aa894fd239178ed2ea1638c766a42e752b8100ca608` |
| [AgentNexus_M1_Excluded_Artifacts_Part1.md](AgentNexus_M1_Excluded_Artifacts_Part1.md) | 150766 | `41eb472ad5d671166c3e933c4c54b54a0a00b0984184bd1cf3ed1aa4814e5056` |
| [AgentNexus_M1_Excluded_Artifacts_Part2.md](AgentNexus_M1_Excluded_Artifacts_Part2.md) | 150782 | `4830e1f5721bb1837b777c080156cb96e666204e6f58b3d004914bb3384bd09a` |
| [AgentNexus_M1_Excluded_Artifacts_Part3.md](AgentNexus_M1_Excluded_Artifacts_Part3.md) | 150784 | `cdedf3678ade902a10901a9862753e4910181d91347414b9544f3849073e717a` |
| [AgentNexus_M1_Excluded_Artifacts_Part4.md](AgentNexus_M1_Excluded_Artifacts_Part4.md) | 32277 | `0785accac0f710f50479eca02b613424614fd2888fb21dbe940ec25292f480a9` |
| [AgentNexus_M1_Export_Verification_Tools.md](AgentNexus_M1_Export_Verification_Tools.md) | 6843 | `f5dafed7ff0266909fc0338ad1427e91ec493864e6cc64d9a8c90e031889bf13` |
| [AgentNexus_M1_Runtime_Evidence.md](AgentNexus_M1_Runtime_Evidence.md) | 151523 | `ead7c0b053435002e7951e76b92c2a42d38252c4b87b8f69e616bfaf60305d14` |
| [AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md) | 94284 | `105c85de31690f3b6b790e417205e90f9e4f647e0694c531d2b125eb74dd8fe9` |
| [AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md) | 77519 | `3edb3b57e9a72727545d8fca0c7141f2b071323f55fb3d2521f4771d849f4291` |
| [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) | 95844 | `b6453467c6245346bc417be1b670c5ccf83395423f50d06ff52bdde872ffb04f` |
| [AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md) | 23404 | `a0ec9a90d388a39accac4870c23e7bbacab3b80b6c8587f1ce1aaee6a0f5e596` |
| [AgentNexus_M1_Runtime_Evidence_Supplement_Part5.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part5.md) | 88740 | `4ac3c23ff2b9e3862d3e7d1b750684c1a906be21a7861df1c75531742c472e8d` |
| [AgentNexus_M1_Runtime_Evidence_Supplement_Part6.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part6.md) | 37351 | `4235c4301f10a2ba8887a8ecb6e05a3fda9d1bfb8c3bf6d8a999cc2ca42cdf53` |
| [AgentNexus_M1_Runtime_Evidence_Supplement_Part7.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part7.md) | 789394 | `83128c5053ce36a709c7d0bdb0855762880f0a8b541c4cb49c794324102c87d5` |
| [AgentNexus_M1_Source_Index.md](AgentNexus_M1_Source_Index.md) | 20609 | `c85726e73530ccd842fe15f326b20badac70d29713c103f68c5caf8ce0344421` |
| [AgentNexus_M1_Source_Review_Part1.md](AgentNexus_M1_Source_Review_Part1.md) | 91761 | `562fe6b88d209ee51a5f69c559504bf0d505dd4d8d89578a0095c5250277ab7f` |
| [AgentNexus_M1_Source_Review_Part2.md](AgentNexus_M1_Source_Review_Part2.md) | 96168 | `6af02c4a798fe9684753b33b4ff1161cc33e9770d202a27098fa0e67410f1afe` |
| [AgentNexus_M1_Source_Review_Part3.md](AgentNexus_M1_Source_Review_Part3.md) | 13122 | `80da807fb43ff1a3b0b37a416128232606653c7bbb3fda1c3ea13a803bc174a5` |
| [AgentNexus_M1_Source_Review_Part4.md](AgentNexus_M1_Source_Review_Part4.md) | 92092 | `c0c94c90a52c5c2de5e135c4c646aca5b5f33d91f6c411ad6d698e1eb554fd1b` |
| [AgentNexus_M1_Source_Review_Part5.md](AgentNexus_M1_Source_Review_Part5.md) | 391837 | `6677aa0af36278c42b038a7bdde37bd40fa351dfb7b6f500546aeada8407d4b5` |
| [AgentNexus_M1_Test_Review_Part1.md](AgentNexus_M1_Test_Review_Part1.md) | 80939 | `1da0146d98cfa213ada429397347ecec4e5bc57892cec7a2ac6b96333fb35a32` |
| [AgentNexus_M1_Test_Review_Part2.md](AgentNexus_M1_Test_Review_Part2.md) | 78904 | `86b85fdf195e053e6837fadf53d893431dd30735f95575b9ab56e623d23e5fcb` |
| [AgentNexus_M1_Test_Review_Part3.md](AgentNexus_M1_Test_Review_Part3.md) | 22796 | `0feeecdca9e66bf759eedeb740ede6767c2aa90fef9d50cde8bcaac90b3144da` |
| [AgentNexus_M1_Test_Review_Part4.md](AgentNexus_M1_Test_Review_Part4.md) | 391844 | `fdd3ab03e94817de700161d2a5de233be77eed570967fdc688dc7e60458b4d3e` |
| [AgentNexus_M1_Test_Review_Part5.md](AgentNexus_M1_Test_Review_Part5.md) | 92099 | `d6b8146a3da407427bd0666f7d405ac3bba54751b50f78cbcc2b10ecfa256b07` |
| [README.md](README.md) | 5395 | `93293e6d8e83ca37534114fdd90317f0f23ebbc3f895cded553db6efdb90045c` |
