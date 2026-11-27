# 自定义控件交付补充 v2

明确使用format=gfc-control-package、formatVersion=2；旧formatVersion=1和widget.schema.json保持原约束。新Schema为[widget-v2.schema.json](../../resources/schemas/widget-v2.schema.json)，完整示例/已接入控件为[切角电量仪表](../../resources/default-controls/widgets/chamfer-dial/widget.json)。内置旧八款不自动升版。外部包版本与内部Compound版本独立；一次添加仍只有一个完整复合对象。

v2在v1基础上增加polygon、arcText和连续圆弧样式字段：polygonPoints是3–32个0–1归一化顶点，严格凸、闭合由程序补齐，不重复末点，凹形/自交/退化拒绝。围绕框中心顺时针rotation，维持共享几何变换；原生有像素取整差异。arcText仅80个可打印ASCII、small/auto、400字重、不透明、零层旋转，arcRadius 0.05–0.5、arcStartAngle -360–360、arcDirection、arcSpacing 0–12；目标先限定Venu4两尺寸，最多8条。core.arcText沿用现有能力目录的大小写，是requirements命名的明确例外，不能自行拼为core.arctext。

ringStyle为ticks/continuous，ringCap为butt/round；新字段只用于对应类型。字体字重目前400，metricDecoration须false，现有单位/有效性/缺失/阈值契约不变。图片和资源适配仍遵循现有门禁，本次不开放任意字体、路径脚本或插件。

验证：node scripts/validate-widget-package.mjs PACKAGE_DIRECTORY。明确版本选择独立Schema，然后查凸性、原生映射、能力/数据依赖、边界、参数默认值及资源路径。Schema通过并非SDK/视觉/真实AOD/真机验收；用例文件当前只检查结构，未执行语义的结果不能写成通过。入库构建仍要求维护者审核，浏览器不直接安装任意外部包。

新仪表保留凸八边形、连续电量弧、曲线标题及真实电量；整体缩放/复制/部件显隐和原生映射沿用内部Compound v2。预览SVG仅示意，网页与原生矢量字体差异保留，真实Sleep与功耗尚待真机。
