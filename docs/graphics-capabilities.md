# 形状图形能力与原生映射

核查依据：Connect IQ SDK 9.3 各 target 的 compiler.json，以及官方 [Graphics](https://developer.garmin.com/connect-iq/api-docs/Toybox/Graphics.html) 与 [Dc](https://developer.garmin.com/connect-iq/api-docs/Toybox/Graphics/Dc.html)。不能只按 AMOLED 推断能力。

| 当前目录 target | enhancedGraphicSupport | alphaBlendingSupport | 色深 |
| --- | --- | --- | --- |
| venu441mm / venu445mm | true | true | 16-bit |
| venu3 / venu3s | true | true | 16-bit |
| fr57042mm / fr57047mm / fr970 | true | true | 16-bit |
| fenix843mm / fenix847mm | true | true | 16-bit |

| 效果 | 原生映射 | API 基础要求 |
| --- | --- | --- |
| 矩形/圆角矩形填充与描边 | fillRectangle/drawRectangle、fillRoundedRectangle/drawRoundedRectangle | 1.0 |
| 椭圆填充与描边 | fillEllipse/drawEllipse，参数为中心与 x/y 半径 | 1.0 |
| 线条与线宽 | drawLine、setPenWidth | 1.0 |
| 独立 RGBA 填充/描边 | createColor(alpha,r,g,b)、setFill/setStroke | 4.0 |
| Source-over 透明混合 | BLEND_MODE_SOURCE_OVER、setBlendMode | 常量 4.2.1 |

当前工程基线最低 API 5.1 已覆盖这些要求。setColor 仅提供 24-bit 颜色，不能通过它假装支持 alpha；增强绘图工具优先于 setColor，绘制后续图层时须显式更新对应 fill/stroke/前景，避免颜色状态泄漏。

形状样式支持填充开关、描边开关/颜色/线宽、矩形圆角及 0–1 不透明度。SVG 按每次填充/描边设置 alpha，与原生分别绘制的语义对应；16-bit 量化和抗锯齿仍可能不同。旋转形状不能擅自调用不存在的 Dc 通用变换方法，生成时需使用多边形几何等已支持表达。

新 target 未核查时不开放透明度；存在不透明形状以外的透明效果时，在生成前明确拒绝，而不是默默丢掉 alpha。新增设备必须同时核查能力表。网页不因此宣称支持浏览器滤镜、阴影、任意混合模式或精确功耗。
