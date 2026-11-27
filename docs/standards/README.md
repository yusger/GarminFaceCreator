# 规范文档

本目录集中维护设计与资源交付规范。操作说明、部署文档和验收记录保留在 docs 根目录。

| 规范 | 版本 | 用途 |
| --- | --- | --- |
| [编辑器能力清单](capability-list.md) | 1.0.0 | 从共享目录生成的现有入口/本地生成边界；不代表设备验收 |
| [表盘设计基础规范](watchface-basic-spec.md) | v1.1 | 表盘设计原则、数据与 AI 创建的能力边界 |
| [表盘设计包接入规范](watchface-package-standard.md) | v1.2 | 完整表盘包的结构、资源、配置和转换验收 |
| [自定义控件交付规范](custom-widget-standard.md) | v1.0 | 一个完整复合控件的交付、内部部件和验收 |
| [布局模板交付规范](layout-template-standard.md) | v1.0 | 创建项目使用的布局模板 |
| [指针素材交付规范](hand-resource-standard.md) | v1.0 | 指针图片套装与资源接入 |
| [自动发布参考包规范](reference-release-package-standard.md) | v1.0-draft | 第三方自动发布输入、门禁与版本约束；服务待实现 |
| [内网参考发布 API](reference-publishing-api.md) | v1.0-draft | 发布认证、异步任务、动态库与回滚；接口待实现 |

文档版本与交换格式 formatVersion 分别维护；具体实现范围以各规范中的能力说明为准。Schema 继续保存在 resources/schemas/，示例包与资源库的位置保持不变。
