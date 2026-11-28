# trail 混合表盘及精细编辑：当前实施状态

截至阶段141，本轮仍在实施。默认参考13款，trail为单项目三主题；Rider不进默认库。实现先提交推送、核对GitHub SHA，再部署约定测试环境，测试后提交证据。展示环境未更新，Temp保持忽略。

| 部分 | 当前交付与证据 | 仍待完成/验证 |
| --- | --- | --- |
| 数据与图标 | 显式数据槽、格式/图标/目标联动、可换色遮罩；[AI内置图标和原生颜色](research/ai-library-icon-validation.md)已验；[规则](standards/data-source-linkage.md) | 更完整主题角色及外部新契约 |
| 图表 | 每日活动、小时心率、聚合/缺失/样式/阈值；[固定数据绘图](research/chart-drawing-fixture-validation.md) | 真实历史覆盖、实际Sleep/重启等生命周期 |
| 字体 | 本地TTF/OTF、浏览器内转换及固定像素FNT＋PNG；字形/图集预算、许可、共享字偶距；[原生对照](research/bitmap-font-validation.md) | [精细排版及三种字体原生对照](research/bitmap-typography-validation.md)已验；真实细线/角形/紧凑三类字体28px原生已验；视觉套件及完整表盘排版继续推进 |
| 三主题 | 预设/独立颜色、数据与开关覆盖、单一应用身份、原生分组菜单、每主题背景；[原生交互](research/native-theme-settings-validation.md) | 已验45mm实际切换/数据/颜色/秒数开关/当前重置、主题与背景正常退出重载；[单设备主题定义更新](standards/theme-definition-upgrade.md)页面已验；非默认覆盖的原生重载/跨PRG升级、最终全矩阵和41mm原生交互待验 |
| 新来源 | 血氧、连接、久坐、天气、日出日落等；[来源范围](standards/additional-data-sources.md) | 真实传感器和设备限制继续分别核验 |
| 月相 | 受限UTC估算、图标/照明读数、两尺寸及受控AOD；[实测](research/moon-validation.md) | 不宣称精密历书、本地天空倾角或真实Sleep |
| 几何 | 简单凹多边形及受限原生单轮廓；[原生记录](research/concave-native-validation.md) | 路径、虚线、刻度与样式实例等后续评估/交付 |
| AI与最终视觉 | 字段同源、批准字体、有限修复/截图；[真实付费对照](paid-model-native454-comparison.md) | 最终三主题精细视觉、配置完整性及视觉套件；已有AI结果没有通过这些验收 |
| 第三方 | 旧widget/release v2继续冻结，字体身份与字节冻结、本地及隔离Linux离线门禁6项通过；[规则](standards/reference-release-v2.md) | 新主题/字体等契约、转换和样例，自动发布API仍未上线 |

当前付费授权仅适用于本轮Plan；阶段133/134没有新增调用。原生测试前台100/300为用户授权的临时值，本Plan结束须恢复10/30；用户又明确授权worker仅本Plan临时100/日，结束须恢复50；既有使用账本保留，队列和容器资源不变。实际Sleep、真机显示与功耗仍须独立验收。不能以固定帧、编译通过或目录清单代替整个计划完成。

前一轮阶段72–107的结果保留在[历史归档](plan-implementation-status.md)，其中默认库数量、字体/凹形边界及授权只描述当时范围。
