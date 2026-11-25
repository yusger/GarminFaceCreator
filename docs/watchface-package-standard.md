# GarminFaceCreator 表盘设计包接入规范 v1.2

状态：设计交付标准。文档版本为 **v1.2**，主体交换格式 **formatVersion 仍为1**。SONAR1.1.0已完成首个受限转换及原生验收，尚无网页端任意设计包自动导入入口。符合格式表示资料可进入转换验收，不表示当前程序已支持所有字段或通过设备验收。

通用契约与当前实现分别见正文和第13节；SONAR专属清单及历史评审见[样包记录](sonar-package-review.md)，实际效果见[SONAR说明](sonar.md)。

设计方可直接依据本文件制作交付包。无需编写 Monkey C，无需生成 reference.json、design.json、manifest.xml、monkey.jungle、签名密钥或 PRG。接入方负责转换成现有 default-watchfaces 内部参考包、生成原生工程、编译和验收。

## 1. 交付目录

```text
example-face/
├── watchface.json                     必须：唯一主体文件，固定名称
├── preview.png                        必须：默认亮屏，基准设备实际屏幕像素
├── preview-aod.png                    必须：息屏，尺寸与默认亮屏一致
├── resources/
│   ├── drawables/                     图片资源；透明图片用 PNG
│   │   ├── dial-rings.png              示例：静态刻度及测距圆环
│   │   ├── heart.png                   示例：心率图标
│   │   └── scan-beam.png               示例：独立扫描扇区
│   ├── fonts/                         实际字体文件，不放在线 CSS 链接
│   └── settings/
│       └── settings.json              有用户配置时必须提供
├── notices/
│   ├── DESIGN-NOTICE.md                必须：设计作者、来源和权利说明
│   └── …                              所用字体/图片的完整许可与来源
├── previews/
│   ├── cases.json                      额外验收图的数据清单
│   └── …                              阈值、缺失和配置切换效果图
└── README.md                          可选：额外说明、特殊效果与差异
```

目录名使用稳定英文小写slug，例如sonar；文件名使用ASCII英文字母、数字、句点、短横线或下划线，字体可保留原始大小写，例如ShareTechMono-Regular.ttf。所有路径引用必须匹配实际大小写，不依赖Windows的大小写宽容。JSON 使用 UTF-8、标准 JSON，无注释、尾逗号或省略号。资源路径相对包根目录，统一 `/`；禁止绝对路径、`..`、远程 URL 和 base64 内嵌资源。空资源目录可省略。

交付为一个目录或以该目录为唯一顶层目录的 ZIP。PNG 效果图、HTML 展示页不替代主体 JSON。不得夹带账号、API Key、签名密钥、SDK、缓存或编译产物。

## 2. 主体结构

以下为顶层字段约定。后文示例是字段片段，不可直接拼成完整交付包。

| 字段 | 类型 | 必填 / 可空 | 约束 |
| --- | --- | --- | --- |
| format | string | 必填，不可空 | 固定gfc-watchface-package |
| formatVersion | integer | 必填，不可空 | 固定1，不同于文档版本及内部schemaVersion |
| id | string | 必填，不可空 | 稳定slug，匹配 `[a-z0-9-]+` |
| name | string | 必填，不可空 | 非空显示名称 |
| version | string | 必填，不可空 | 包内容三段版本，如1.0.0 |
| origin | object | 必填，不可空 | 作者、来源与权利说明 |
| canvas | object | 必填，不可空 | 逻辑尺寸、形状、底色和安全区 |
| referenceTarget | object | 必填，不可空 | 基准deviceId及实际屏幕像素，不能只写表壳尺寸 |
| previewData | object | 必填，不可空 | 至少有localDateTime，不作为生产数据 |
| previewCasesFile | string/null | 可选，可为null | 缺省或null表示无额外case；有额外图时必须填路径 |
| resources | array | 必填，不可为null | 无资源时允许[] |
| layers | array | 必填，不可为null | 至少一个图层 |
| thresholds | array | 必填，不可为null | 无阈值时填[] |
| effects | array | 必填，不可为null | 无特殊效果时填[] |
| settingsFile | string/null | 必填，可为null | 无配置显式null；有配置指向实际文件 |

除明确允许null的字段外，不得用null代替缺省或空数组；预览传感器值的null表示缺失，另按第10节处理。ID、版本和路径不可为空字符串。

示例身份及画布：

```json
{
  "format": "gfc-watchface-package",
  "formatVersion": 1,
  "id": "example-face",
  "name": "Example Face",
  "version": "1.0.0",
  "origin": {
    "kind": "self",
    "authors": ["填写设计者名称"],
    "sourceUrl": null,
    "noticeFile": "notices/DESIGN-NOTICE.md"
  },
  "canvas": {
    "width": 454,
    "height": 454,
    "shape": "circle",
    "safeInset": 12,
    "background": "#0B1B2B",
    "scaleMode": "uniform-fit"
  },
  "referenceTarget": {
    "deviceId": "venu445mm",
    "displayName": "Venu 4 45mm",
    "screenWidth": 454,
    "screenHeight": 454
  },
  "settingsFile": "resources/settings/settings.json"
}
```

`origin.kind` 仅允许 `self`、`community`。authors 填写人类设计者/权利主体；协助整理或生成素材的 AI 工具列在 noticeFile 中，不代替作者。主体和说明中的作者角色应一致，设计者与辅助工具角色应分别标注，不能给出互相矛盾的作者归属。self 用于自主设计，不自动覆盖第三方字体、图片或参考代码的权利。community 必须另外提供原项目 sourceUrl、40位十六进制的完整SHA-1 upstreamCommit（不接受短哈希）、完整许可文件及修改说明；无许可证的社区项目不接入。设计方不用分配内部 UUID/appId，接入方统一生成并保持默认参考身份稳定。

origin.authors为至少一个非空名称的数组；noticeFile必须为包内路径。self的sourceUrl可为null，community必须指向原项目。来源URL是许可元数据，不是允许运行时下载资源的声明。

首版只要求一个基准设备。其它尺寸由后续适配流程生成并逐设备验收；454逻辑坐标不等于已经适配所有454屏幕设备，更不等于支持所有手表型号。

## 3. 坐标、层级与文字定位

- 原点左上角，x向右、y向下，逻辑坐标允许有限小数。canvas.width/height为正整数，首版shape仅circle且宽高相同。中心为(width/2,height/2)，安全半径为width/2-safeInset；safeInset非负且小于半径，由设计声明，不对所有表盘固定同一数值。
- 非指针图层使用 `bounds: {"x":0,"y":0,"width":100,"height":40}`，表示旋转前的绝对位置和尺寸；除line外，尺寸必须大于0。line允许width或height为0以表示竖线/横线，但不能两者同时为0；line的bounds描述端点几何，实际包围范围另计线宽/端帽。字体大小和线宽也使用逻辑像素。
- `zIndex` 为整数，小值先绘制；同值按 layers 数组顺序绘制。数组和 ID 都必须稳定，不因调整顺序而重新生成 ID。
- hand 的 pivot 为画布绝对坐标，length/tailLength 从 pivot 起算，线宽、圆头一并计入可见范围。hand 可额外附带 bounds 作为编辑器命中框，但不能据此缩放、裁剪或重定位指针；接入方应按 length/tailLength/width 重算包围范围。
- `rotation` 单位为度，正值顺时针，默认0；普通图层绕 bounds 中心旋转。旋转后仍须检查裁剪；文字宽高必须覆盖字形、描边及缺失占位。
- `safeArea` 为 `content` 或 `decoration`，默认 content。重要文字、指针实际端点应在安全区内；背景、透明画布和装饰可扩展至整屏，但仍受圆形屏幕裁剪。不能仅因透明图片的外框较大判定其有效内容越界。
- 文字 `align` 为 left/center/right，`verticalAlign` 为 top/middle/bottom，默认均为 center/middle；对齐作用于字形可见区域。`fontSize` 是字体 em 大小，不是可见字形高度。
- 图片必须给出 `fit`：contain（完整保留比例）、cover（保持比例裁剪）或 stretch（允许变形）。透明留白属于图片布局，禁止导入时自动裁掉。
- 不使用“左侧”“底部”“大字号”“大约居中”等描述替代实际坐标。针对同一区域做多态时，必须共用锚点并明确各状态尺寸。

### 3.1 旋转与退化几何

| 图层类型 | 旋转中心 | 约定 |
| --- | --- | --- |
| image/text/time/date/metric/meter/rect/circle | 旋转前bounds中心 | 检查旋转后的可见边界 |
| line | 两端点中点，即bounds中心 | 宽或高可为0，两者不可同时为0 |
| hand | 画布绝对pivot | bounds只作命中参考，不参与绘制缩放或裁剪 |

rotation必须为有限数。circle宽高必须相等，不等时报错，不自动取最小边或改成椭圆。负尺寸、非有限坐标及非正字号/线宽报错，不悄悄修复。rect.cornerRadius为非负数且不超过短边一半。

line的butt端帽不越过端点，round端帽在端点外延半线宽；实际边界包含描边，旋转后取可见描边的轴对齐包围框。编辑器可另加命中容差，但容差不改变运行几何、安全区与裁剪验收。

## 4. 资源声明

每项资源必须有唯一 `id`、`type`、`file`、`noticeFile`。type 为 image 或 font，所有引用只使用资源 ID。文件必须实际存在，不能只在文档列出名称。接入方计算 SHA-256，设计方无需手工维护哈希。

```json
[
  {
    "id": "heart-icon",
    "type": "image",
    "file": "resources/drawables/heart.png",
    "noticeFile": "notices/DESIGN-NOTICE.md"
  },
  {
    "id": "number-font",
    "type": "font",
    "file": "resources/fonts/ShareTechMono-Regular.ttf",
    "family": "Share Tech Mono",
    "weight": 400,
    "noticeFile": "notices/number-font-LICENSE.txt"
  }
]
```

运行图片使用sRGB PNG；人物、图标和叠加层需要真实alpha，不接受棋盘格伪透明。SVG仅作源稿附带，不替代首版运行PNG；动画另按effects声明。

PNG内在宽高取文件头，单位为资源像素；bounds是逻辑像素。1x交付即可，也允许2x等更高分辨率，不强制倍数或通过文件名猜密度。接入方将源图完整范围按bounds和fit映射，再按目标屏幕尺寸生成运行资源。contain等比取最小缩放并居中，cover等比取最大缩放并在bounds居中裁剪，stretch分别缩放两轴。透明留白参与映射；同一资源可有不同bounds，不能直接把源像素当作屏幕坐标。当前fit实现限制见第13节。

字体交付 TTF/OTF、具体字重、完整许可及来源。接入前应核对字体内部 family/weight 与资源声明、cmap 是否覆盖所需字符；文件名正确不等于字形齐备。noticeFile 应记录具体上游项目或下载地址，已知版本一并记录；“来自 Google Fonts”只能作为概述。不得只写浏览器字体回退链；不得直接复制本机系统字体冒充可分发素材。必须覆盖时间数字、冒号、单位、英文日期、负号、百分号、度数符号和缺失占位等实际使用字符。若使用中文或特殊符文，另列所需字符。字体资源可用可选charset字符串逐字列出Unicode字符，不使用范围表达式或脚本。未提供时接入方从静态文字、格式、缺失占位、全部可选数据源的标签和单位推导；提供时必须覆盖所有实际字符而非仅默认预览。不能推导的自定义文字在notice补充，缺字报错，不依赖系统回退。原生 FNT/PNG 的生成与目标像素换算由接入方负责。

整张表盘截图只用于预览核对。动态时间、日期、数字、进度条和指针不能烘焙进背景。静态刻度可合成独立装饰图片；默认参考仍须能选择、替换和移动各数据控件。

## 5. 图层共同字段

所有图层必须具备：

| 字段 | 要求 |
| --- | --- |
| `id`、`name` | 唯一英文 ID 与可读名称；ID 匹配 `[a-zA-Z0-9_-]+` |
| `type` | 使用下表的标准类型 |
| `zIndex` | 绘制顺序 |
| `bounds` | 实际坐标；hand 例外，使用 pivot/length 描述 |
| `visible` | 默认亮屏显隐，boolean |
| `style` | 颜色等样式；颜色统一 `#RRGGBB`，透明度另设 opacity 0～1 |
| `aod` | 息屏显隐及覆盖样式，不依赖自动推断 |

可选字段：`rotation`、`safeArea`、`groupId`、`condition`、`thresholdGroup`。不识别的字段或枚举必须报告，不能静默忽略。说明性文字集中放 `notes`，不作为运行逻辑。

| type | 附加字段与约定 |
| --- | --- |
| image | `resourceId`、`fit` |
| text | `text` 为静态字符串；或使用下文 textFrom 二选一；style 包含 font、fontSize、align、verticalAlign |
| time | format为HH:mm/HH/mm/ss，仅24h；文本样式同text。读取手表本地时间，不用previewData作为生产来源 |
| date | format/locale的封闭组合见第5.2节，文本样式同text；当前转换范围见第13节 |
| metric | binding、format、style，见第6节 |
| hand | 可选bounds仅作命中参考，不参与绘制缩放或裁剪；`part` 为 hour/minute/second，`pivot:{x,y}`、`length`、`tailLength`、`style:{color,width,cap}`；cap 为 round/butt。0度指12点，顺时针；时/分针应计入更小时间单位 |
| meter | `binding`、`goal`、`shape:"bar"`、`segments`、`gap`、`style:{color,dimColor}`；从左向右点亮；值/goal截断至0～1；缺失时全部使用 dimColor |
| rect | style 包含 fill、stroke、strokeWidth、cornerRadius |
| circle | style 包含 fill、stroke、strokeWidth；bounds 应为正方形 |
| line | bounds 的左上点到右下点；style 包含 color、width、cap；逆向线段可用 rotation 表达 |

所有text/metric/date/time统一使用style.font（必填字体资源ID）、fontSize（必填有限正数）、align（默认center）和verticalAlign（默认middle）。格式及单位变化后重新核对字形覆盖和bounds。

`style.font` 引用字体资源 ID；字重以该资源声明及实际字体为准，不使用浏览器合成粗体或自动换字体。style.opacity 默认1，作用于整层的最终合成；不修改颜色字符串本身。未使用的类型专属字段不填写。描边宽度应计入视觉边界；rect/circle 的描边按内侧绘制以保持 bounds 明确。普通文字字距固定0，不依赖 CSS text-shadow；特殊排版另行列入 effects。

groupId为可选非空英文分组标识，同ID用于编辑器组织。首版仅一层分组，不形成父子坐标、继承变换、分组显隐或配置作用域，不改变zIndex。转换器未映射该元数据时必须报告，不视为运行分组已支持。

### 5.1 连续进度条与分段进度条

meter 的 segments 必须为正整数，goal 为正数，gap 为非负数。固定以下绘制语义，不能把单段进度条误转成“完成目标才亮起”的开关：

- segments=1：连续填充。先绘制整个 dimColor 轨道，再按 r=clamp(value/goal,0,1) 从左向右覆盖 color，点亮宽度为 width×r；gap 必须为0。
- segments≥2：分段点亮。段宽 `(width-(segments-1)×gap)/segments` 必须为正，点亮段数为 floor(r×segments)，r=1时全部点亮；段间不填充。
- 数值缺失时显示全暗轨道；有效0同样全暗，但数字控件显示0。不得把负值或超出数据源有效范围的值直接夹到0伪装有效读数。
- 先按逻辑几何计算比例，再在目标分辨率栅格化。不得把 segments=1 改为很多细段来近似连续填充，除非明确作为经同意的降级。

有效读数超过goal时填满；无效来源值不能伪装成目标完成。连续进度已有内部实现，当前CLI仍仅接入连续bar；分段交付需另行适配。

### 5.2 日期和时分秒

time.format封闭为HH:mm、HH、mm、ss；均使用两位数字，HH仅24小时制。12小时制、AM/PM和自由格式串未纳入formatVersion 1，不能用notes暗示启用。

date首版允许以下组合；这是交换契约，不代表当前转换器全部支持。

| locale | format | 示例 | ddd字符规则 |
| --- | --- | --- | --- |
| en | MM.DD ddd | 11.25 WED | SUN/MON/TUE/WED/THU/FRI/SAT |
| en | ddd DD | WED 25 | 同上 |
| zh-CN | MM.DD ddd | 11.25 周三 | 周日/周一/周二/周三/周四/周五/周六 |
| zh-CN | ddd DD | 周三 25 | 同上 |

MM/DD补足两位，分隔符按format原样输出，不随浏览器语言改变。中文“11月25日”等月日格式和其他格式预留后续版本。当前CLI仅验收en + MM.DD ddd，其他组合须补适配或阻止转换，不能强行替换为已支持格式。

时针角度为30×(hour%12+minute/60+second/3600)，分针为6×(minute+second/60)，秒针为6×second；second 为整数秒，不要求子秒动画。AOD隐藏秒针/秒数字，保留时/分针在实际刷新时刻的位置，刷新频率由设备生命周期决定。

可变数据槽的标签使用派生文字，不写死成 steps：

```json
{
  "type": "text",
  "textFrom": { "layerId": "steps-value", "field": "sourceLabel" }
}
```

此片段省略共同字段。`textFrom.field` 首版只允许 sourceLabel，跟随被引用 metric 的数据源名称更新，不能嵌入表达式或 JavaScript。固定标签可使用 text 字符串。

## 6. 数据绑定、格式与缺失

formatVersion 1的source为下表七项组成的**封闭集合**，不是程序内部全部数据源列表。压力、海拔、风速、通知数、血氧等暂不开放，不能自行命名后假定支持。新增source须扩展交换格式版本，并补数值单位/有效性、缺失、默认精度、sourceLabel、预览与验收规则。

统一source名称，禁止混用sensor.steps、device.battery、device.time.second等别名。condition另受第7节更小子集约束。

| source | 含义 / 输出数值 | 有效零值 | sourceLabel |
| --- | --- | --- | --- |
| heartRate | 最新可获取心率缓存，bpm | 否，0按缺失 | bpm |
| steps | 当日步数，步 | 是 | steps |
| battery | 电量，0～100，% | 是 | batt |
| calories | 当日总热量，kcal，不能写成运动热量 | 是 | kcal |
| distance | 当日活动距离，统一公里 | 是 | km |
| temperature | 缓存天气温度，统一摄氏度，允许负值 | 是 | temp |
| seconds | 当前本地秒数，0～59 | 是 | sec |

heartRate须为有限正数；steps/calories/distance须为有限非负数；battery须在0～100；seconds须为0～59整数；temperature允许有限负数。读数不满足对应范围或类型时按缺失处理，不把数值字符串隐式转成数值。整数显示的来源仍按原始数值匹配阈值，不能先四舍五入后变色。

时间/日期使用 time、date 图层；预览数字只放 previewData。NaN、无穷值、null、没有样本及超出数据源有效范围的读数按缺失处理。缺失数字统一 `--`；不能用0填充缺失步数或电量。源原始单位转换由接入方处理，设计方不得通过修改单位文本把公里变成英里。distance/temperature在交换层分别为公里/摄氏度；当前不声明自动跟随设备单位制式。英里/华氏度需要明确的数值转换和同步单位规则，未补适配前不能仅改custom单位。

数字秒优先用time + format:ss；seconds来源用于数值数据槽或进度，从同一设备本地时钟取值，不复制另一份预览读数。seconds不在首版condition来源集合中。

缺失时：有生效的thresholdGroup使用该组fallbackColor，无阈值组或因来源切换停用时使用style.color，不进入正常或告警档位；有效读数落在阈值空档也用fallbackColor。meter缺失仍使用dimColor全暗轨道。静态图片不因邻近数字缺失而自动染色。AOD最后按显式前景色覆盖，不保留亮屏告警色。

metric 示例（完整图层）：

```json
{
  "id": "heart-rate",
  "name": "心率数值",
  "type": "metric",
  "zIndex": 40,
  "bounds": { "x": 48, "y": 210, "width": 70, "height": 42 },
  "visible": true,
  "binding": { "source": "heartRate", "configurable": false },
  "format": {
    "precision": 0,
    "groupThousands": false,
    "unitMode": "none",
    "missing": "--"
  },
  "style": {
    "font": "number-font",
    "fontSize": 34,
    "color": "#4FD1C5",
    "align": "center",
    "verticalAlign": "middle"
  },
  "thresholdGroup": "hr-zone",
  "aod": { "visible": true, "color": "#5E7C93" }
}
```

`format.precision` 为0～3或字符串auto；groupThousands 为 boolean；unitMode 为 auto/custom/none，custom 时必须另填 unit。auto 使用上表单位，seconds/steps 无后缀，temperature 为 °C。seconds固定precision:0或auto，不分组且两位补零；冲突的小数精度或分组选项报错。默认精度 heartRate/steps/battery/calories/seconds 为0，distance 为2，temperature 为1；可配置数据槽的options包含不同默认精度的来源时，必须使用 `precision:"auto"` 自动采用该源默认值；例如 steps/calories/distance 不能统一固定precision:0，把6.42km显示成6。固定来源允许显式0～3。数字先以原值判断阈值，再按precision格式化；groupThousands仅对整数部分每三位加英文逗号，小数点固定英文句点。unitMode:none允许单位通过派生标签单独展示，但不允许错误标注量纲。

format.groupThousands 默认false，unitMode 默认auto，missing 固定为 --；precision 缺省等同auto。缺失只显示 --，不附加数值单位；独立的单位/来源标签仍可显示，除非设计另有显隐条件。

更新需求以数值秒给出，可选 `binding.refreshSeconds`，例如心率30、步数60、电量900。它是读取缓存的期望间隔，不保证缓存新鲜度、不要求新增定时器、更不代表启动传感器主动采样。最终调度服从设备能力和表盘生命周期。

## 7. 阈值及条件显示

阈值统一使用 **左闭右开 [min,max)**，null 表示无边界。区间不得重叠，可留空档并使用 fallbackColor。必须先判有效性再匹配阈值；缺失不能落入正常或低电量区间。图层的 thresholdGroup 引用组 ID，组 source 必须等于该图层绑定来源。

```json
{
  "id": "hr-zone",
  "source": "heartRate",
  "fallbackColor": "#7C93A8",
  "hysteresis": 0,
  "bands": [
    { "id": "hr-normal", "min": null, "max": 120, "color": "#4FD1C5" },
    { "id": "hr-warning", "min": 120, "max": 150, "color": "#F2A65F" },
    { "id": "hr-alert", "min": 150, "max": null, "color": "#FF6B6B" }
  ]
}
```

以下仅为电量阈值示例，不规定所有设计使用相同分档：`[null,10)` 红、`[10,30)` 橙、`[30,null)` 青；先限定有效0～100。因此29.5仍属于警告，0%属于有效低电量。禁止使用 max:119 / min:120 这类可能遗漏小数的区间。

首版hysteresis缺省为0且仅接受0，直接按阈值变色；非0滞回未纳入首版执行能力，不能假装已实现。如将来启用非0滞回，须另定义初始分类、跨越边界、跳跃多档、缺失后重置规则并扩展版本。

可选条件字段：

```json
{
  "condition": {
    "source": "heartRate",
    "min": 120,
    "max": 140,
    "maxInclusive": true,
    "missingVisible": false
  }
}
```

默认 min 含端点、max不含端点；可通过 minExclusive/maxInclusive 修改。condition.source首版封闭为heartRate/steps/battery，是第6节主集合子集，不含seconds。visibility 条件与颜色阈值是两套独立规则；AOD 默认继承条件，如需无条件中性状态，在 aod 内声明 `conditionMode:"always"`，否则为 inherit。

## 8. AOD 与特殊效果

每层都显式设置 aod.visible；未保留的层不参与息屏绘制。亮屏 visible 与 aod.visible 独立：visible:false/aod.visible:true 表示只在AOD显示，禁止导入时先过滤visible:false而删除该层。保留的文字、形状和指针须给出 aod.color；也可使用 aod.fontSize、aod.opacity 覆盖字号或透明度。未覆盖的字号/透明度继承style，不再额外自动降亮；aod.opacity为0～1。aod.color覆盖前景颜色，rect/circle的非空fill与stroke均替换为此颜色，空填充/空描边保持为空。几何位置和层级不变；需要AOD另行排版时必须先扩展规范，不得仅依效果图移动控件。AOD 图片若需降亮，须提供单独 `aod.resourceId` 的暗色图片，或明确保留原图；不能假定设置 color 就会给彩色图片染色。

canvas.aodBackground缺省#000000，若声明须为#RRGGBB。首版AOD不启用effects和秒数动画；保留层由各层aod.visible决定，不对所有设计固定同一名单。AOD颜色覆盖亮屏阈值。当前CLI只验收黑色AOD底色，其他底色需另行适配与设备验收。

### 8.1 effects字段与降级

effects始终为数组，无效果填[]。首版type封闭为rotation，目标为独立image层；其它效果、任意脚本、自由提示词不是可执行契约。

| 字段 | 必填 / 默认 | 约束 |
| --- | --- | --- |
| id | 必填 | 包内效果ID唯一，非空英文ID |
| type | 必填 | 仅rotation |
| layerId | 必填 | 引用已有image，同层首版最多一项rotation |
| required | 可选，false | boolean；true表示无适配必须阻止接入 |
| enabledByDefault | 可选，false | boolean；亮屏默认开关，不自动创建设置项 |
| pivot | 必填 | x/y为画布绝对有限坐标，不是图片局部坐标 |
| periodSeconds | 必填 | 有限正数，旋转一周的目标周期 |
| maxFramesPerSecond | 必填 | 首版为整数1，仅期望上限，不保证设备刷新率 |
| fallback | 必填 | mode固定static，angle为有限数的绝对角度 |

required:false也须提供完整fallback。默认关闭时使用fallback；默认开启而无适配时，只能在明确接受差异后静态降级。required:true缺适配时，即使默认关闭也不能绕过能力检查。例如：

```json
{
  "id": "scan-rotation",
  "type": "rotation",
  "layerId": "scan-beam",
  "required": false,
  "enabledByDefault": false,
  "pivot": { "x": 227, "y": 227 },
  "periodSeconds": 12,
  "maxFramesPerSecond": 1,
  "fallback": { "mode": "static", "angle": 0 }
}
```

已支持且启用时，亮屏角度为 `rotation + 360 × ((当天本地秒数 % periodSeconds) / periodSeconds)`，绕效果pivot旋转；不是从页面打开时重新计时。fallback.angle 是停用/不支持时覆盖的绝对角度。required:true 的效果不支持时阻止接入；false 时只能按已声明的 fallback 静态显示，必须在验收差异中列出，不能悄悄删掉。首版不承诺CSS平滑旋转、连续渐变或高帧率效果。fallback必须应用到实际输出并记录目标层、期望及实际角度；仅写报告不算完成降级。当前CLI仅验收基础rotation=0且fallback.angle=0的样本，不保证非0fallback或动态旋转。

## 9. 配置文件

settings.json 格式：

```json
{
  "formatVersion": 1,
  "items": [
    {
      "id": "primary-color",
      "label": "主要文字颜色",
      "type": "color",
      "default": "#DCE9F0",
      "targets": [
        { "scope": "layer", "id": "digital-time", "property": "style.color" }
      ]
    },
    {
      "id": "show-seconds",
      "label": "显示秒针及数字秒",
      "type": "boolean",
      "default": true,
      "targets": [
        { "scope": "layer", "id": "analog-second", "property": "visible" },
        { "scope": "layer", "id": "digital-second", "property": "visible" }
      ]
    },
    {
      "id": "right-slot-source",
      "label": "右侧数据",
      "type": "dataSource",
      "default": "steps",
      "options": ["steps", "calories", "distance"],
      "targets": [
        { "scope": "layer", "id": "steps-value", "property": "binding.source" }
      ]
    }
  ]
}
```

上例引用的图层均须存在。交换契约type为color/boolean/dataSource/number；当前程序仅支持前三项，number为待适配能力，转换前必须报告并阻止未支持的必需配置进入执行。number须填写有限min/max/step，min≤max、step>0，default在范围内且与min按step对齐。dataSource 的 options 必须是第6节中的源，default 必须在 options 中。dataSource目标层的binding.configurable须为true；condition 的状态驱动来源不能通过此配置切换。

settings.json的items及targets顺序不影响最终结果。default必须与主体在相同类型下相等，所有目标ID都必须存在。binding.configurable表示允许被来源配置控制，不会自行新增配置项。

设置id包内唯一且匹配 `[a-zA-Z0-9_-]+`；targets为非空数组，使用以下封闭白名单，不是任意对象路径：

| type | scope | property | 约束 |
| --- | --- | --- | --- |
| color | layer | style.color | 具有前景色的层，不意味着PNG染色 |
| color | thresholdBand | color | 引用全包唯一band.id |
| boolean | layer | visible | 只影响默认亮屏显隐 |
| dataSource | layer | binding.source | metric/meter且binding.configurable:true |
| number | layer | style.fontSize | text/metric/date/time且字号为正，当前待实现 |

除binding.source要求configurable:true外，其他白名单属性不需额外图层侧开关。configurable:false只锁定来源，不代表禁止改颜色或字号。配置type必须匹配目标字段；同一scope/id/property只能由一项配置控制，targets内也不能重复。禁止配置项目身份、资源路径或脚本。绑定阈值时需用 thresholdBand 修改各档颜色，不能假设 style.color 会覆盖阈值。

配置默认值必须与主体一致，多目标更新必须一次生效，不能出现同一属性被多个配置项控制。更换来源时，派生标签和 auto 单位/精度同步更新；不匹配来源的阈值组停用并记录。仅适用于默认来源的关联图层由dataSource配置项的hideWhenChangedFromDefault声明，不把某个表盘的默认步数值变成通用规则。

number声明片段如下；假定digital-time的style.fontSize为28，当前CLI须报告不支持，不能生成一个无效控件：

```json
{
  "id": "time-font-size",
  "label": "时间字号",
  "type": "number",
  "min": 12,
  "max": 60,
  "step": 1,
  "default": 28,
  "targets": [
    { "scope": "layer", "id": "digital-time", "property": "style.fontSize" }
  ]
}
```

配置值以只读主体为基础求值得到，不直接覆盖并遗失原始设计。hideWhenChangedFromDefault 是dataSource配置项专属的图层ID数组，含义为：该配置当前值≠default时，对列出图层增加一项亮屏隐藏条件；恢复default时解除这项条件，恢复该层设计/其它配置原本决定的显隐，不能强行改为visible:true。多个隐藏条件按逻辑或叠加，任何一项要求隐藏就隐藏。数据缺失不属于“切换了来源”。

加载、修改、保存后重开都按相同顺序计算：校验配置值 → 应用允许的属性覆盖 → 更新实际绑定来源及派生标签/auto格式 → 计算来源相关隐藏 → 计算条件及阈值 → 应用亮屏或AOD专属规则。非法值必须报告并回退到该项default，不直接当数据缺失；配置联动和“隐藏层”不删除图层、资源或绑定。固定心率、电量的configurable:false不允许来源配置指向。

配置作用于设计的亮屏值，不能自动使原本AOD隐藏的组件在AOD出现；绑定配置必须在共享主设计修改，设备覆盖只调整允许的布局与外观。此文件描述配置需求，编辑器配置和手表端设置是否生成由接入验收单独列明，不能把浏览器配置文件直接当成Garmin设置XML。

## 10. 预览核对数据与交付验收

主体必须填写固定的 previewData，例如：

```json
{
  "localDateTime": "2026-11-25T10:24:07",
  "heartRate": 72,
  "steps": 8420,
  "battery": 86,
  "calories": 426,
  "distance": 6.42,
  "temperature": 22
}
```

previewData仅允许localDateTime及第6节除seconds外的来源字段；秒数由localDateTime推导，不另接收seconds。localDateTime为有效无时区ISO本地时间，精确到整数秒，不带Z或偏移；日期locale固定在图层。默认亮屏和AOD图使用同一组数据；关闭浏览器CSS动画及随机内容后截图，不能每次打开得到不同布局。动画启用的说明另外交付，不混入基准截图。

提供额外验收图时，须提供 previewCasesFile，例如 previews/cases.json。不能仅靠图片文件名推断改动了哪些数据或配置：

```json
{
  "formatVersion": 1,
  "cases": [
    {
      "id": "hr-120",
      "image": "previews/hr-120.png",
      "mode": "active",
      "dataOverrides": { "heartRate": 120 },
      "settingsOverrides": {}
    },
    {
      "id": "distance-slot",
      "image": "previews/distance-slot.png",
      "mode": "active",
      "dataOverrides": { "distance": 6.42 },
      "settingsOverrides": { "right-slot-source": "distance" }
    }
  ]
}
```

cases.id唯一；image路径相对包根目录；mode为active或aod。每个case独立从主体previewData及所有配置default开始，再浅覆盖dataOverrides和settingsOverrides，不继承上个case。dataOverrides只允许previewData已定义字段，settingsOverrides只允许已有配置ID；明确的null表示缺失，未提供的字段继承基准值。日期及默认截图仍由previewData决定；若同一case提供了未声明字段应报错。需要模拟某数据源缺失时，应先在previewData显式提供该源字段（可为null）。

默认preview.png、preview-aod.png不得包含表壳、网页边框、说明文字或展示板，须为referenceTarget.screenWidth×screenHeight纯盘面。额外图放previews/，文件名不固定，由cases清单解释；零值和缺失分别核对，meter缺失全暗。截图、资源及JSON须属于同一包版本。

按设计实际使用能力生成用例：阈值每个边界两侧及边界本身、有效0与缺失、进度0/中间比例/到达及超过goal/缺失、每个可选来源的标签/精度/单位、配置往返恢复、保存后重开、亮屏/AOD独立显隐。未使用的来源无需制造额外图片。数值和状态可在报告断言，不强制每项PNG；已交PNG必须全部列入cases，有来源配置时至少覆盖默认与非默认来源对照。SONAR具体边界和图片清单见样包记录。

预览图不能反过来决定绑定和颜色；JSON是事实来源。字体抗锯齿允许平台差异，先核对内容、几何、填充比例和显隐，不以单个边缘像素颜色推断实际样式。

设计方交回前检查：

- [ ] JSON可解析、ID唯一、所有引用可解析，文件名大小写一致。
- [ ] 资源、字体、来源及完整许可齐备；没有本机路径或在线依赖。
- [ ] 时间、数据、指针、标签和进度保持独立；所有重要元素有具体坐标。
- [ ] 基准deviceId与实际屏幕像素明确，canvas/safeInset与图层安全区一致。
- [ ] 0、缺失、小数阈值边界、AOD行为一致；预览没有伪读数。
- [ ] 所使用控件的最宽数字、--、单位及满值已核对；有指针时核对12/3/6/9点方向。
- [ ] 设置默认值与主体一致，可变来源使用正确精度，切换再恢复时标签/单位/进度正确；配置默认隐藏和只在AOD显示的层没有丢失。
- [ ] 额外PNG具有cases清单，明确数据和配置覆盖，能独立复现。
- [ ] 静态装饰与特殊效果分离，有fallback；基准截图关闭动画。

接入方验收顺序：格式/资源检查 → 能力差异报告 → 生成可编辑设计 → 对照同数据亮屏/AOD → 生成原生工程 → 基准设备SDK编译 → 模拟器/真机检查 → 加入默认参考。资料不全退回补齐；未支持的必要能力先补适配，不以整盘截图替代全部控件。

设计方不必实现自动导入工具。当前能力见第13节；不能据一个样包成功推导任意JSON控件均可直接执行。验收分别记录资料齐备、语义确定、转换能力、SDK编译、模拟器及真机核对，前一项不推导出后一项。

## 11. 与内部参考目录的关系

交付包的watchface.json是设计唯一事实来源；preview仅供核对，HTML不是运行输入。首次接入转换为内部reference.json（身份、来源、资源清单）和design.json（控件布局/绑定），同时保留接入版本与差异记录。程序内部文件不是设计方的第二套编辑入口。

现有native模式社区项目继续保留原生代码；不会强行用本规范重新生成。设计包生成的源码、FNT/PNG和设置XML属于转换输出。默认参考受保护，用户从卡片创建独立副本。维护规则参见[default-watchfaces说明](../default-watchfaces/README.md)。




## 12. 版本、兼容与未知字段

| 版本字段 | 含义 | 当前值 |
| --- | --- | --- |
| 本文v1.2 | 人工阅读的规范修订 | 澄清规则与能力边界，不等于程序升级 |
| watchface.json的formatVersion | 主体交换格式协议 | 1 |
| watchface.json的version | 具体设计包内容版本 | 设计方维护，如1.1.0 |
| settings.json的formatVersion | 设置文件子格式 | 1 |
| cases.json的formatVersion | 预览清单子格式 | 1 |
| 内部schemaVersion | Creator内部项目迁移版本 | 不替代外部格式版本 |

主体、settings、cases独立识别版本。首版只接受(1,1,1)组合，后两文件未提供时不参与检查；不是三个版本号必须同步递增。任一子格式升级时，应公布兼容组合及迁移方式。

更高或未识别的formatVersion须停止转换，提示升级或人工迁移，不能按版本1猜测。已知字段的未知枚举/非法值报错；未知字段报告完整路径，运行含义不确定时阻止转换。人工接受省略纯说明性元数据时记录被省略内容，不能静默丢弃。notes只存说明，不用于表达必须执行的逻辑。

文档修订可澄清已有字段，不自动改写已交付包。可选说明字段如charset仍需接入方识别或显式报告，不假定旧转换器必然接受。改变既有含义、扩大封闭执行枚举或增加必需字段，须升级交换格式并给出迁移，不在相同formatVersion下偷偷改默认值。废弃字段保留识别和告警期；删除或改类型按不兼容升级处理。

## 13. 当前能力与接入边界

下表依据v1.2修订时的代码及实际验收，不是完整自动校验器承诺。内部编辑器拥有某能力不代表外部CLI已映射；未支持/未验证项应在接入前阻止或提出明确且获接受的降级。

| 能力 | 格式契约 | 当前CLI / 网页 | 原生及验收范围 |
| --- | --- | --- | --- |
| 设备/作者 | 一个明确基准设备，self/community | CLI限定self、454逻辑方形画布、venu445mm，非社区源码通用导入器 | SONAR基准45mm及补充41mm分别编译/模拟器核对 |
| 独立图层及字体 | 保留布局、绑定、字体许可 | 已转换SONAR18层，按目标生成FNT/PNG | 两个尺寸已验证，不保证任意字体字形 |
| 图片fit/密度/alpha | 源像素映射bounds/fit，保留alpha | 仅验收SONAR布局，CLI未完整映射contain/cover差异 | PNG透明扫描已验证，其他fit需适配 |
| 连续/分段meter | 单段连续，多段floor比例 | CLI仅连续bar/segments=1/gap=0，内部另有分段能力 | 连续中间比例、满值、缺失已验证 |
| 日期 | 第5.2节组合 | CLI固定en + MM.DD ddd，其它未接入 | 英文已验证，内部中文能力不代表外部支持 |
| 时间/派生标签/精度 | 24h四格式、sourceLabel、auto精度 | 已转换时分秒及steps/calories/distance联动 | 两位里程和秒数开关已验证 |
| 阈值/条件 | 有效性优先，条件三源子集 | 阈值已接入，CLI未映射condition及完整通用有效性约束 | SONAR边界/缺失已验证，其他来源需逐项验收 |
| AOD显隐及覆盖 | visible独立，显式资源/透明度等 | 显隐、颜色、字号已映射，aod.resourceId/aod.opacity和非黑底未完整映射 | SONAR Always-On已核对，非任意AOD组合 |
| 配置 | 四种type及属性白名单 | color/boolean/dataSource和来源隐藏联动已支持，number/fontSize配置未支持 | 12项原生资源已编译，真实手机/商店设置仍待验收 |
| groupId | 一层编辑组织元数据，无运行继承 | 内部有分组，CLI未映射groupId | 不保证导入分组保持 |
| effects.rotation | 时钟/pivot及静态fallback | 无动态扫描适配，仅验收基础角度和fallback都为0的样本 | 报告记角度不等于非0角度已实际绘制 |
| 文字透明度 | style.opacity最终合成 | 网页合成；原生按底色混合降亮 | 低亮度已验证，纹理上非逐像素透明，须记录降级 |
| AI效果说明 | 外部formatVersion 1仍无该可执行字段 | 内部AI创建支持设计与effectPrompt说明，不能代替交换格式effects或绑定 | 网页仅基础预览，用户后续生成工程并逐项验收；见[AI创建](ai-create.md) |

CLI入口：`node scripts/import-watchface-package.mjs PACKAGE_DIRECTORY`。必须先人工审阅，目标存在时拒绝覆盖。它不是完整schema校验器，未映射字段仍有遗漏风险；脚本未报错不能证明满足全部规范。运行效果、许可及字体快照维护见[默认参考说明](../default-watchfaces/README.md)和[SONAR样包记录](sonar-package-review.md)。

## 14. v1.2修订摘要

- 明确顶层必填、空值/数组、封闭枚举及缺失颜色优先级。
- 补effects、像素密度换算、文本字体、旋转/退化几何、groupId与number配置；字段声明不自动增加实现能力。
- 区分文档、设计包、主体/设置/cases及内部项目版本，定义未知字段和高版本处理。
- SONAR专属清单、边界数值及历史审阅移至独立文档；正文JSON为可复用片段，不要求其他设计采用相同坐标、阈值、名称或字体。
- 修正“尚未转换”等过时状态，增加契约/转换/预览/原生验收对照。不改写SONAR原始交付、内部设计或运行代码。
