# 资源库

- `default-watchfaces/`：完整默认参考表盘，保留独立工程、私有素材和版权记录。
- `default-watchfaces-template/`：创建项目用的可编辑布局，不能混同完整参考工程。
- `default-controls/`：可复用控件交付包及指针样式。
- `default-imgs/`：图片和图标素材，icons含既有Lucide/Meteocons资源与原有许可证。
- `shared/fonts/`：共享字体原文件及完整许可。
- `schemas/`：资源交付格式。

这里是维护源目录；`frontend/public` 和 dist 中对应文件由构建生成。已有 `/default-watchfaces/`、`/templates/`、`/fonts/`、`/icon-library/` 浏览器URL保持兼容。`npm run build` 和 `npm run dev` 都先生成所需公共资源；不要修改生成目录。各表盘私有资源仍放在自己的工程内部，避免破坏Garmin原生结构。Temp不参与构建或提交。
