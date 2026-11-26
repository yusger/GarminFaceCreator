# 控件库

第三方设计交付见 [控件规范](../../docs/standards/custom-widget-standard.md) 和 `../schemas/widget.schema.json`。`examples/battery-capsule` 是完整交付样包，尚不是可在网页任意安装的插件。所有包需先校验、转换并完成原生验收。

`widgets/` 内置四个已转换包：capsule-metric、segment-battery、vitals-column、stack-tiers。维护者修改源包后运行 `node scripts/build-widgets.mjs`；构建先进行交付校验，再生成前端目录与发布预览。编辑器入口为“素材 → 自定义控件”，转换为单个复合对象，选中后在右侧调整部件、样式和显示。内部图层由对象封装，预览及生成时展开；可以明确拆解为基础图层。完整许可随项目保存及源码ZIP导出。

`hands/` 为矢量指针样式，`hand-images/` 为图片指针套装，交付规范与控件组合包分别维护。
