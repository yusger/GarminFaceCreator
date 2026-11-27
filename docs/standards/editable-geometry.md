# 可编辑几何能力（内部项目 v27）

本文件定义编辑器内部几何能力，不改变现有第三方发布包 v1、widget 包或其 Schema。旧项目经 v26→v27 迁移，ID、工程与历史保持；旧版本编辑器无法导入新结构。发布包不得直接填入新 kind，需另行扩展带版本的发布 profile 并验收。

`polygon` 是独立顶层基础图层。`polygonPoints` 为按顺时针或逆时针排列的 3–32 个 `[x,y]`，每个数值须为有限数且在 `[0,1]` 内。顶点相对图层宽高归一化；缩放不改变顶点数据。首版仅允许严格凸轮廓，拒绝交叉、重复、共线与凹陷顶点。支持填充/描边、透明度、整体中心顺时针旋转、亮屏/AOD颜色与显隐。未开放任意 SVG/path、脚本或凹多边形。

网页使用 SVG polygon，本地生成器将逻辑顶点变换并按目标像素取整，调用原生 fillPolygon/drawLine。抗锯齿与像素取整可能不同；SDK 编译不构成真机视觉/功耗验收。曲线与任意路径不能暗中用凸多边形近似后声称完整支持。

AI 创建/对话仅在 polygon 上使用 polygonPoints，仍受结构校验、锁定、原子事务和并发指纹保护。复合控件现有公开入口不因此允许直接提交私有结构；本次尚未扩展外部复合控件交付包。

## 连续圆弧（内部项目 v28）

ringStyle=ticks（默认，旧项目不变）或continuous，ringCap=butt/round。起止角0度为12点，正向为顺时针，负跨度为逆时针，最大360度。ringWidth为向内厚度，ringDim为同色轨道透明度；ringSource/ringGoal沿用已有绑定。有效0与缺失均无亮色进度，但数据有效性分别判断；电量越界与心率非正值不绘制亮色。AOD仅暗轨道，不逐秒动画。网页与原生均按不超过3度/片绘制带状多边形，360度最多120片/层/轨，圆头另有端点圆；这是绘制量估算，尚未真机性能或耗电验证。外部v1仍不得使用新字段。

原生截图补验发现透明分片的共边会叠加亮度。basic-26起正圆改用原生drawArc与网页SVG弧路径，端点另绘圆头；小于1度的原生片段继续用局部带，避免drawArc整数角度截断成完整圆。非正圆仍为分片近似，暗轨道可能有细接缝，界面明确提示，尚未宣称同等平滑。drawArc角度原点为3点/逆时针标度，适配器转换为编辑器12点/顺时针标度。官方依据：https://developer.garmin.com/connect-iq/api-docs/Toybox/Graphics/Dc.html#drawArc-instance_function 。fillPolygon原生上限64点，现有外部/内部顶点限制不因此自动放宽。

## 曲线文字（内部项目v29，首批范围）

arcText是单个基础图层，text为最多80字符静态标签，文字中心位于(x+w/2,y+h/2)。arcRadius为min(w,h)的比例0.05–0.5，arcStartAngle为[-360,360]、0在12点；arcDirection为clockwise/counterclockwise，反向字形旋转180度以支持底部正向阅读；arcSpacing为0–12逻辑像素。textAlign=left/center/right分别从锚点开始/居中/结束。移动和缩放容器会改变半径，文字大小仍由size/aodSize控制。

确定性首版限Venu4两尺寸、可打印ASCII、设备SMALL矢量字体、400字重/opacity1、无整体rotation或资源字体。字号6–80，每项目最多8层；按每字符一字号加字距保守限制一圈，是平台预算策略，非Garmin官方上限。其他字符/设备/预算可保留已知设计草稿，但不能静默丢字后生成。原生按实际字宽定位，网页Arial为近似，因此字形/字宽不承诺像素相同；截图参数保留近似提示。

原生getVectorFont的font/scale参数要求API5.1.0，drawAngledText只用矢量字体；缺少必须接口/字体时抛出明确异常，不跳过文字。AOD静态重绘，支持独立颜色与字号。内部版本、AI白名单、能力目录与最小API同步；外部v1发布包及复合私有层尚未开放新kind。官方依据：https://developer.garmin.com/connect-iq/core-topics/graphics/ 、https://developer.garmin.com/connect-iq/api-docs/Toybox/Graphics.html#getVectorFont-instance_function 。

倾斜文字的angle参数是字形基线相对3点方向的逆时针角度，不能套用圆弧的90度偏移。适配器使用负SVG旋转角，原生固定H字形像素检查验证基线，防止编译通过但字母侧转。


## 内部复合几何 v2（项目v30）

旧Compound.version=1保持原来的text/metric/rect/circle/line/meter白名单，不自动改版。version=2增加time/date/image/hand/ring/polygon/arcText；不允许嵌套。选择2–40个相邻、未锁定基础图层后点击「合为复合控件」，顶层只保留一个父对象，内部顺序、数据配置、联动标签、图片/字体与来源许可保留。保守原始包围框限454×454，父对象rotation仍为0；子图形旋转依现有生成能力。

整体变换采用均匀min缩放，除了位置/字号/线宽，还换算连续环宽度和曲线字距；归一化顶点及相对半径不重复缩放。部件启用/亮屏/AOD继承已有规则，复制重新映射内部ID，拆解可撤销。原生生成与截图按同样的展开结果；AI仍只能通过公开参数/部件开关修改，不允许注入compound私有结构。

合并不是重排图层：非相邻选择、跨选择范围的标签/配置/隐藏联动、已有所选图层设备微调均明确拒绝，避免隐式改遮挡或丢失变体。已有父对象仍可进入设备变体微调。外部widget包和deterministic-v1发布契约尚未扩展，不将内部v2理解成第三方包已可直接使用新图形。
