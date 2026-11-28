# 默认参考表盘：付费工程审计（持续更新）

13款均已完整载入页面参考包后，通过已配置DeepSeek Flash真实生成一次。首批提示词为engineering19；原始项目、请求结果、PRG和访问令牌只保存在忽略的Temp，公开记录不含密钥或环境凭据。

首轮41次已记录付费调用，已知427,619tokens。SDK通过7款，原生启动成功5款；其中AboutTime、Celestial有文字裁切，TimelyFenix日历错误。其余失败也保留，不将启动成功视为完整显示验收。

| 表盘 | 首轮结果 | 主要发现 |
| --- | --- | --- |
| AboutTime | visual-failed | 可启动，但主时间单词越过左边界 |
| BAWF | runtime-passed-visual-pending | 可启动，日期格式/字体与预览不同；指针时间未同步 |
| Celestial | visual-failed | 可启动，但主时间首位越过左边界 |
| ClownWatch | sdk-failed | 重复的Number/Float参数类型错误及ClockTime日期字段误用 |
| Crystal | sdk-failed | 辅助函数Number/Float类型不兼容 |
| fine-o-clock | failed | FNT描述遗漏，PNG被当作字体文本；第二轮修复未变化 |
| KISSFace | sdk-failed | Number/Float辅助参数与多边形点元组类型错误 |
| PulseManiac | sdk-failed-no-repairable-selected-files | 未缩放1254px原图，SDK编译Java heap space |
| SkyRing | native-failed | 原生空值参与数值运算；十六进制字符解析和天气返回类型错误 |
| SONAR | native-failed | 原生Number/String错误，FORMAT_MEDIUM日期被当作数值 |
| TimelyFenix | visual-failed | 可启动，但11月日历出现31日，字号明显偏大 |
| trail | failed | 精确字体ResourceId前缀错误，首次修复补丁不唯一 |
| YetAnother | runtime-passed-visual-pending | 可启动，字体与预览有差异；数据时间未同步 |

[调用量、摘要和原始图](paid-reference-audit/initial/audit.json)。网页样例与原生当前时间/数据未同步，禁止从这些帧计算“还原率”。确定性默认工程与AI工程分开评价。正常产品UI仍限制两轮，用户本Plan额外授权的操作员轮次不清旧根、不重置计数。

首批诊断补全了engineering20的图片目标尺寸、文本边界、数字类型和天气对象返回契约；这些是平台提示约束修正，不偷偷替换模型绘图源码。接下来按实际根因继续同根修复失败项并重新SDK/原生验证。本报告仍为中间结果，不能宣称13款均正常；真机、AOD、全部数据语义和续航也不能由启动帧证明。
