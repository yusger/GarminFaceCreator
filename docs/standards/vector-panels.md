# 简单异形面板与几何预算

Schema44/basic54扩展polygon为单个简单闭合轮廓：3–32个0..1归一化顶点，支持凹形；轮廓不重复末点。禁止孔洞、自交、接触/重叠边、重复点、相邻共线退化边和近零面积。32点上限不因Garmin最多64点而自动放宽。

网页仍是一个可拖动缩放、旋转、填充/描边/AOD对象。生成时用有界耳切检查轮廓可分解性（最多n-2/30三角形）；原生实际一次fillPolygon填充完整轮廓，并关闭填充期间的隐式描边，再只描原始外轮廓。凸形保持原绘制，避免重建默认参考外观。Garmin fillPolygon每调用最多64点，本实现每次最多32点。生成前验证，不把无法表达的孔洞静默填平。

AI创建/对话/工程DTO采用相同轮廓校验；失败原子回滚。坐标随454设计到目标设备缩放和像素取整。初版逐三角形填充的原生截图出现内部亮边，basic55改为单次完整填充；透明与细描边仍需原生像素对照，数学分解或SDK编译不代表视觉通过。

旧custom-widget/reference-release v2的凸几何合同冻结，校验器显式调用validConvexPolygon，不因编辑器升级自动接受凹形。公开包升级、贝塞尔、SVG可编辑转换、虚线、路径分布及样式实例仍待后续实现。

依据：[Garmin Graphics.Dc.fillPolygon](https://developer.garmin.com/connect-iq/api-docs/Toybox/Graphics/Dc.html#fillPolygon-instance_function)。SDK两尺寸、网页交互、轮廓/面积/预算和原生视觉分别验收。
