# trail 原生菜单、持久化与实际 Always-On

本轮只在授权测试环境运行 SDK9.3，设备 Venu4。没有固定注入读数或强制 sleeping 布尔值，没有改变容器预算和80秒交互门禁。

- 41mm：实际菜单 Apex→Trail→Vital 切换、Trail黑色背景正常退出重载均通过，原生及 cleanup 成功。
- 两个尺寸：Settings > Display Mode > Always-On 实际触发 enterSleep，切回 High Power 实际触发 exitSleep；分别记录简化AOD和完整亮屏，原生及 cleanup 成功。
- 45mm首轮已观察回调、帧和正常重载，但最后SDK自动保存截图失败。保留该 failed/cleanup completed 记录；后续正常计数复验成功，没有清账或放宽时限。
- 最初误切 Active App 未触发生命周期，不能据此验收。当前工具要求同时检出两个实际回调才通过。

[原始帧和记录](trail-native-lifecycle/)证明SDK模拟器行为，不证明真机显示、设备重启、续航或真实历史覆盖。API对未知程序仍保守报告unverified，操作员验证证据单列。

跨PRG兼容迁移也已实际验证：相同41mm应用身份，旧PRG摘要 `5becafd653a8982078b155b49de902d35cf9a9ab3b024307a597d9aa43f5eed9`，新版摘要 `fdf7aa6effc923de3dd7cd740f9db0b9eb117aa5cbfffb61230f0e7fcb981413`。旧SDK正常退出生成1971字节SET；在新版正常退出与重新启动之间，按固定沙箱路径恢复它。设置摘要 `1c3be44776a7cd41e428186ffa2c188d095b5a011849caa1805ba617ee5552d0` 核对一致，新版仍为Trail主题及自定义黑色背景，原生与cleanup成功。

种子恢复仅操作员夹具可用：64KiB上限、摘要、常规文件及非符号链接检查，无公开上传入口。80秒门禁、一次重启、CPU/内存/PIDs/网络限制不变。缺省、合法、错误摘要、超限和符号链接5项隔离检查通过。原SET只留在本地Temp。此证据不推断任意损坏SET、降级或跨设备迁移。
