# 自动发布包示例

此目录展示gfc-reference-release / formatVersion 1的完整输入文件，不是当前可调用的发布功能。示例采用schema26、Venu4 45mm、单个可编辑时间层，原生代码由未来平台确定性生成，不包含第三方脚本。

两张454×454 PNG为固定数据下的浏览器示意，使用Arial替代设备系统字体；不是SDK或真机截图，不声称已通过发布服务/编译验收。用例时间09:41，所有模式为同一固定日期/UTC偏移。示例设计按仓库GPL-3.0-or-later提供，LICENSE保留全文；生成器与最终输出许可按实际内容判断。

publish.json列出除自身外的全部文件及哈希。打ZIP时只包含本目录列入清单的内容，目录内文件直接位于ZIP根部，不包含父目录。修改任何文件后必须重新计算bytes和SHA-256。示例中的项目身份只是占位符，服务器分配最终身份。

包规范见 ../../../docs/standards/reference-release-package-standard.md；API见 ../../../docs/standards/reference-publishing-api.md。合同测试只验证结构、完整性和接口引用，不代表未来服务的全部语义门禁已实现。
