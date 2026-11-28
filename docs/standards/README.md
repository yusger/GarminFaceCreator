# 规范文档

本目录集中维护设计与资源交付规范。操作说明、部署文档和验收记录保留在 docs 根目录。

| 规范 | 版本 | 用途 |
| --- | --- | --- |
| [编辑器能力清单](capability-list.md) | 随能力目录生成 | 从共享目录生成的现有入口/本地生成边界；不代表设备验收 |
| [表盘设计基础规范](watchface-basic-spec.md) | v1.1 | 表盘设计原则、数据与 AI 创建的能力边界 |
| [表盘设计包接入规范](watchface-package-standard.md) | v1.2 | 完整表盘包的结构、资源、配置和转换验收 |
| [自定义控件交付规范](custom-widget-standard.md) | v1.0 | 一个完整复合控件的交付、内部部件和验收 |
| [布局模板交付规范](layout-template-standard.md) | v1.0 | 创建项目使用的布局模板 |
| [指针素材交付规范](hand-resource-standard.md) | v1.0 | 指针图片套装与资源接入 |
| [自动发布参考包规范](reference-release-package-standard.md) | v1.0-draft | 第三方自动发布输入、门禁与版本约束；服务待实现 |
| [内网参考发布 API](reference-publishing-api.md) | v1.0-draft | 发布认证、异步任务、动态库与回滚；接口待实现 |

文档版本与交换格式 formatVersion 分别维护；具体实现范围以各规范中的能力说明为准。Schema 继续保存在 resources/schemas/，示例包与资源库的位置保持不变。

- [自定义控件格式v2](custom-widget-v2.md)：凸几何/曲线文字/连续弧，旧v1继续保持。
- [发布配置deterministic-v2](reference-release-v2.md)：固定schema31及离线语义检查，发布API待实现。
- [本地诊断包](local-diagnostic-export.md)：主动下载与脱敏边界。

- [数据源联动规则](data-source-linkage.md)：格式、静态图标、设计量程及亮屏/AOD一致性。

- [主题预设及设置](theme-presets.md)：主题覆盖、稳定来源码与原生背景属性。
- [日/小时图表](../chart-widget-design.md)：窗口、聚合、缺失和AOD缓存。
- [新增数据来源](additional-data-sources.md)：SpO2、连接、久坐、天气与日出日落。
- [AOD像素分析](aod-pixel-analysis.md)：像素分母、已核验设备参照与验证边界。

- [本地位图字体](bitmap-font-import.md)：单页FNT＋灰度PNG、固定像素及授权边界。

- [月相估算](moon-phase.md)：UTC时间、照明与周期区别、示意方向、缓存和许可。

- [主题颜色与字体角色](appearance-roles.md)：Schema49的明确引用、解绑、阈值语义、AI与设备覆盖边界。

- [外部主题项目包](theme-project-package-v1.md)：独立Schema49契约、主题/设备矩阵、字体和资源清单、离线转换边界。
