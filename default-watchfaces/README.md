# Default watchfaces / 默认参考表盘

每个子目录是一个独立参考包，也是默认表盘的维护入口。Temp 只存临时资料，不参与构建或提交。

- `reference.json`：统一描述，遵循 `reference.schema.json`。固定身份、版本、作者类别、来源、代码清单、图层图片、原生二进制资源与完整许可证清单。
- `design.json`：编辑器设计与数据绑定；图片通过 layerId 关联，文件独立保存。
- `source/`、`resources/`、`manifest.xml`、`monkey.jungle`：原生构建输入。
- `assets/`：设计素材；`notices/`：原始许可证、来源与提示词。

`authorship: self` 显示“自主”，仅表示本项目的设计归属；不替代素材和第三方代码许可。
`generation.mode: native` 原样打包原生代码，编辑布局不会擅自重写原生实现。
`generation.mode: deterministic` 从设计与共享生成器生成原生代码快照（目前为 PulseManiac、SONAR）。

维护流程：修改本目录 → `npm run build` → 提交 → 部署验收。图片更新时同时更新 reference.json 中 SHA-256。
新增项目：复制同模式目录，修改 slug、独立项目 UUID/appId、设计、来源和许可，再构建。新社区项目必须具备已核实许可证及固定上游 commit；无许可证不导入。

构建脚本自动发现目录，生成前端注册表、`/default-watchfaces/<slug>/project.json` 和旧 `/templates/` 兼容输出。生成输出不是维护入口。旧单项目转换脚本仅供历史导入排查，不再参与默认构建。
默认卡片保留不可删除；用户编辑会创建独立副本。

带字体的包可增加 fonts 清单（文件、发布名、SHA-256）。PulseManiac 的 FNT/PNG 是默认 454px 快照；编辑器编译/导出时按目标分辨率重新生成。更改其字体或字号时同步生成并保留默认快照。

PulseManiac 字体/心形快照维护命令：`node scripts/generate-pulse-font-snapshots.mjs`（本机 Edge；不启动服务）。然后执行 `npm run build`。字体来源记录与完整许可保留在包内。

设计方的新表盘交付请遵循[表盘设计包接入规范 v1.1](../docs/watchface-package-standard.md)。该交换格式需经转换后进入本目录；首个SONAR包已完成受限命令行转换，尚无网页任意包自动导入入口。
