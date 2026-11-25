# GarminFaceCreator 表盘设计包接入规范 v1.0

状态：设计交付标准，首个验证对象为 SONAR。本文定义新交换格式；当前程序尚未实现此格式的自动导入。满足规范表示资料足以进入转换验收，不表示已经通过 Garmin 编译或真机验证。

设计方可直接依据本文件制作交付包。无需编写 Monkey C，无需生成 reference.json、design.json、manifest.xml、monkey.jungle、签名密钥或 PRG。接入方负责转换成现有 default-watchfaces 内部参考包、生成原生工程、编译和验收。

## 1. 交付目录

```text
sonar/
├── watchface.json                     必须：唯一主体文件，固定名称
├── preview.png                        必须：默认亮屏效果，454×454
├── preview-aod.png                    必须：息屏效果，454×454
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
└── README.md                          可选：额外说明、特殊效果与差异
```

目录名使用稳定英文 slug，例如 sonar；文件名使用英文小写、数字、短横线或下划线。JSON 使用 UTF-8、标准 JSON，无注释、尾逗号或省略号。资源路径相对包根目录，统一 `/`；禁止绝对路径、`..`、远程 URL 和 base64 内嵌资源。空资源目录可省略。

交付为一个目录或以该目录为唯一顶层目录的 ZIP。PNG 效果图、HTML 展示页不替代主体 JSON。不得夹带账号、API Key、签名密钥、SDK、缓存或编译产物。

## 2. 主体结构

以下为顶层字段约定。后文示例是字段片段，不可直接拼成完整交付包。

| 字段 | 类型 | 要求 |
| --- | --- | --- |
| `format` | string | 固定为 `gfc-watchface-package` |
| `formatVersion` | integer | 固定为 `1`；不同于内部项目 schemaVersion |
| `id` | string | 稳定 slug，匹配 `[a-z0-9-]+`，更新设计时不改变 |
| `name` | string | 显示名称，例如 SONAR |
| `version` | string | 三段版本，例如 `1.0.0` |
| `origin` | object | 作者类别、作者、来源与说明文件，见下文 |
| `canvas` | object | 逻辑坐标、裁剪与安全区 |
| `referenceTarget` | object | 效果图对应的基准设备，不能只写物理尺寸 |
| `previewData` | object | 固定的效果核对数据，不能作为生产读数 |
| `resources` | array | 所有被引用资源的声明 |
| `layers` | array | 按语义拆分的完整图层 |
| `thresholds` | array | 阈值组；无阈值填 `[]` |
| `effects` | array | 扫描等特殊效果；无特殊效果填 `[]` |
| `settingsFile` | string/null | 配置文件路径；无配置填 null |

示例身份及画布：

```json
{
  "format": "gfc-watchface-package",
  "formatVersion": 1,
  "id": "sonar",
  "name": "SONAR",
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

`origin.kind` 仅允许 `self`、`community`。self 用于自主设计，不自动覆盖第三方字体、图片或参考代码的权利。community 必须另外提供原项目 sourceUrl、40位 upstreamCommit、完整许可文件及修改说明；无许可证的社区项目不接入。设计方不用分配内部 UUID/appId，接入方统一生成并保持默认参考身份稳定。

首版只要求一个基准设备。其它尺寸由后续适配流程生成并逐设备验收；454逻辑坐标不等于已经适配所有454屏幕设备，更不等于支持所有手表型号。

## 3. 坐标、层级与文字定位

- 原点左上角，x 向右、y 向下；所有数值使用逻辑像素，允许有限小数。454圆屏中心为 `(227,227)`，半径227；SONAR重要内容安全半径为215。
- 非指针图层使用 `bounds: {"x":0,"y":0,"width":100,"height":40}`，表示旋转前的绝对位置和尺寸；尺寸必须大于0。字体大小和线宽也使用逻辑像素。
- `zIndex` 为整数，小值先绘制；同值按 layers 数组顺序绘制。数组和 ID 都必须稳定，不因调整顺序而重新生成 ID。
- `rotation` 单位为度，正值顺时针，默认0；普通图层绕 bounds 中心旋转。旋转后仍须检查裁剪；文字宽高必须覆盖字形、描边及缺失占位。
- `safeArea` 为 `content` 或 `decoration`，默认 content。重要文字、指针实际端点应在安全区内；背景、透明画布和装饰可扩展至整屏，但仍受圆形屏幕裁剪。不能仅因透明图片的外框较大判定其有效内容越界。
- 文字 `align` 为 left/center/right，`verticalAlign` 为 top/middle/bottom，默认均为 center/middle；对齐作用于字形可见区域。`fontSize` 是字体 em 大小，不是可见字形高度。
- 图片必须给出 `fit`：contain（完整保留比例）、cover（保持比例裁剪）或 stretch（允许变形）。透明留白属于图片布局，禁止导入时自动裁掉。
- 不使用“左侧”“底部”“大字号”“大约居中”等描述替代实际坐标。针对同一区域做多态时，必须共用锚点并明确各状态尺寸。

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

图片使用 sRGB PNG；人物、图标和叠加层需要真实 alpha，不接受棋盘格伪透明。首版优先交付 PNG，SVG 可作为源稿附带；依赖 SVG 渐变、滤镜、文字或动画的内容须另交 PNG 或完整行为说明，不能假定可直接用于原生资源。

字体交付 TTF/OTF、具体字重、完整许可及来源。不得只写浏览器字体回退链；不得直接复制本机系统字体冒充可分发素材。必须覆盖时间数字、冒号、单位、英文日期、负号、百分号、度数符号和缺失占位等实际使用字符。若使用中文或特殊符文，另列所需字符。原生 FNT/PNG 的生成与目标像素换算由接入方负责。

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
| time | `format` 为 HH:mm / HH / mm / ss；跟随手表本地时间，禁止用 previewData 作为实际来源 |
| date | `format` 为 MM.DD ddd 或 ddd DD，`locale` 为 en / zh-CN；第一种需要转换器补齐格式支持 |
| metric | binding、format、style，见第6节 |
| hand | `part` 为 hour/minute/second，`pivot:{x,y}`、`length`、`tailLength`、`style:{color,width,cap}`；cap 为 round/butt。0度指12点，顺时针；时/分针应计入更小时间单位 |
| meter | `binding`、`goal`、`shape:"bar"`、`segments`、`gap`、`style:{color,dimColor}`；从左向右点亮；值/goal截断至0～1；缺失时全部使用 dimColor |
| rect | style 包含 fill、stroke、strokeWidth、cornerRadius |
| circle | style 包含 fill、stroke、strokeWidth；bounds 应为正方形 |
| line | bounds 的左上点到右下点；style 包含 color、width、cap；逆向线段可用 rotation 表达 |

`style.font` 引用字体资源 ID；未使用的类型专属字段不填写。描边宽度应计入视觉边界；rect/circle 的描边按内侧绘制以保持 bounds 明确。普通文字字距固定0，不依赖 CSS text-shadow；特殊排版另行列入 effects。

可变数据槽的标签使用派生文字，不写死成 steps：

```json
{
  "type": "text",
  "textFrom": { "layerId": "steps-value", "field": "sourceLabel" }
}
```

此片段省略共同字段。`textFrom.field` 首版只允许 sourceLabel，跟随被引用 metric 的数据源名称更新，不能嵌入表达式或 JavaScript。固定标签可使用 text 字符串。

## 6. 数据绑定、格式与缺失

统一 source 名称，禁止混用 sensor.steps、device.battery、device.time.second 等别名。

| source | 含义 / 输出数值 | 有效零值 | sourceLabel |
| --- | --- | --- | --- |
| heartRate | 最新可获取心率缓存，bpm | 否，0按缺失 | bpm |
| steps | 当日步数，步 | 是 | steps |
| battery | 电量，0～100，% | 是 | batt |
| calories | 当日总热量，kcal，不能写成运动热量 | 是 | kcal |
| distance | 当日活动距离，统一公里 | 是 | km |
| temperature | 缓存天气温度，统一摄氏度，允许负值 | 是 | temp |
| seconds | 当前本地秒数，0～59 | 是 | sec |

时间/日期使用 time、date 图层；预览数字只放 previewData。NaN、无穷值、null、没有样本及超出数据源有效范围的读数按缺失处理。缺失数字统一 `--`；不能用0填充缺失步数或电量。源原始单位转换由接入方处理，设计方不得通过修改单位文本把公里变成英里。

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

`format.precision` 为0～3；groupThousands 为 boolean；unitMode 为 auto/custom/none，custom 时必须另填 unit。auto 使用上表单位，seconds/steps 无后缀，temperature 为 °C。seconds 固定两位补零。默认精度 heartRate/steps/battery/calories/seconds 为0，distance 为2，temperature 为1；切换数据源时可使用 `precision:"auto"` 自动采用该源默认值。

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

电量对应三段：`[null,10)` 红、`[10,30)` 橙、`[30,null)` 青；先限定有效0～100。因此29.5仍属于警告，0%属于有效低电量。禁止使用 max:119 / min:120 这类可能遗漏小数的区间。

首版 SONAR 的 hysteresis 必须为0，直接按阈值变色。原稿±3/±2的滞回保留为后续需求，不能假装已实现。如将来启用非0滞回，须另定义初始分类、跨越边界、跳跃多档、缺失后重置规则并扩展版本。

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

默认 min 含端点、max不含端点；可通过 minExclusive/maxInclusive 修改。condition.source 首版仅 heartRate/steps/battery。visibility 条件与颜色阈值是两套独立规则；AOD 默认继承条件，如需无条件中性状态，在 aod 内声明 `conditionMode:"always"`，否则为 inherit。

## 8. AOD 与特殊效果

每层都显式设置 aod.visible；未保留的层不参与息屏绘制。保留的文字、形状和指针须给出 aod.color；也可使用 aod.fontSize 覆盖字号。AOD 图片若需降亮，须提供单独 `aod.resourceId` 的暗色图片，或明确保留原图；不能假定设置 color 就会给彩色图片染色。

SONAR 息屏保留时针、分针、数字时分、心率与其单位、电量与其单位；隐藏秒针、数字秒、日期、步数及进度、扫描束、测距圆环和其它装饰。背景使用纯黑，交付 `canvas.aodBackground:"#000000"`。息屏颜色以图层 aod 覆盖为准，不应用亮屏阈值颜色，不允许动画。

亮屏扫描束作为独立 image 图层和可选 effects 项描述，不能写在一张完整表盘图中。首版允许仅静态显示并明确记录，推荐以下降级约定：

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

以手表本地时钟当天秒数取 periodSeconds 的余数计算亮屏旋转角，再加图层基础 rotation；不是从页面打开时重新计时。fallback.angle 是停用/不支持时覆盖的绝对角度。required:true 的效果不支持时阻止接入；false 时只能按已声明的 fallback 静态显示，必须在验收差异中列出，不能悄悄删掉。首版不承诺CSS平滑旋转、12秒连续渐变或高帧率效果。

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

上例引用的图层均须存在。type 首版为 color/boolean/dataSource/number；number 必须填写 min、max、step，默认值须在范围内。dataSource 的 options 必须是第6节中的源，default 必须在 options 中。目标数据层 binding.configurable 须为true；condition 的状态驱动来源不能通过此配置切换。

targets 为受限声明，不是任意对象路径：layer 仅允许 style.color、visible、binding.source、style.fontSize；thresholdBand 允许引用全包唯一的 band.id 并修改 color。禁止配置项目身份、资源路径或脚本。绑定阈值时需用 thresholdBand 修改各档颜色，不能假设 style.color 会覆盖阈值。

配置默认值必须与主体一致，多目标更新必须一次生效，不能出现同一属性被多个配置项控制。更换来源时，派生标签和 auto 单位/精度同步更新；不匹配来源的阈值组停用并记录。SONAR 的步数进度条只对steps来源显示，切为calories或distance时隐藏，避免继续展示伪步数进度；在该配置项填写 `hideWhenChangedFromDefault:["steps-progress"]`。

配置作用于设计的亮屏值，不能自动使原本AOD隐藏的组件在AOD出现；绑定配置必须在共享主设计修改，设备覆盖只调整允许的布局与外观。此文件描述配置需求，编辑器配置和手表端设置是否生成由接入验收单独列明，不能把浏览器配置文件直接当成Garmin设置XML。

## 10. SONAR 专项交付清单

基于原设计重整，原HTML可保留为辅助说明。交付以下独立图层，名字可中文，ID按表稳定：

| ID | 类型/内容 | AOD |
| --- | --- | --- |
| dial-rings | image，静态刻度、测距圆环；透明背景 | 隐藏 |
| scan-beam | image，独立透明扫描扇区；可选旋转效果 | 隐藏 |
| date | date，顶部 MM.DD ddd | 隐藏 |
| heart-icon | image，心率装饰 | 隐藏 |
| heart-rate | metric，心率数值 | 保留 |
| heart-rate-unit | text，bpm | 保留 |
| steps-value | metric，默认步数 | 隐藏 |
| steps-label | textFrom，跟随右侧数据槽 | 隐藏 |
| steps-progress | meter，步数目标10000，缺失全暗 | 隐藏 |
| battery-icon | image，电池装饰；动态填充若需要另写效果 | 隐藏 |
| battery-value | metric，电量，带%后缀 | 保留 |
| battery-label | text，batt；亮屏可隐藏 | 保留 |
| digital-time | time，底部 HH:mm | 保留 |
| digital-second | time，底部 ss | 隐藏 |
| analog-hour | hand，中心时针 | 保留 |
| analog-minute | hand，中心分针 | 保留 |
| analog-second | hand，中心秒针 | 隐藏 |
| hand-pivot | circle，中心轴帽 | 保留，使用AOD颜色 |

canvas.background 负责纯色盘底，不需要另做一整张背景截图。心率图标若也要随心率变色，必须提供分色资源及明确的条件方案；首轮可声明为固定青色装饰，并在效果图保持一致。

必须修正原 sonar-design.json 中的以下缺口：

1. 使用新顶层结构和 layers，逐层给出坐标、尺寸、层级、字体、颜色和AOD行为；现有 components 只有语义和左右位置，不足以自动布局。
2. 将原 sensor.heartRate、sensor.steps、device.battery 等来源名换成统一source；时间改用标准 time/hand/date 类型。
3. 缺失步数改为 `--`，真实0步仍显示0；0%电量为有效低电量。数字缺失、阈值兜底和进度全暗保持一致。
4. 将119/149、29/9等整数上界改为120/150、30/10的右开边界；首轮移除±3/±2滞回，hysteresis统一0。
5. 提供实际字体及许可。按原稿采用 Share Tech Mono / Barlow Semi Condensed 时填写具体文件、字重；不能仅引用 Google Fonts CSS。
6. AOD单独核对：删除扫描、秒针、步数和圆环；背景纯黑，保留项使用明确的低亮度颜色。
7. 扫描扇区独立成素材，静态降级与动态目标分别写清楚；不要要求60FPS。首轮默认静态。
8. 配置至少覆盖主要文字色、时/分/秒针颜色、阈值各档颜色、右侧数据槽及显示秒数。需要固定的心率/电量控件明确 configurable:false。

## 11. 预览核对数据与交付验收

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

localDateTime 为无时区的本地墙上时间，仅用于预览，日期locale固定在图层。默认亮屏和AOD图使用同一组数据；关闭浏览器CSS动画及随机内容后截图，不能每次打开得到不同布局。动画启用的说明另外交付，不混入基准截图。

默认preview.png、preview-aod.png不得包含表壳、网页边框、说明文字或展示板；必须是454×454纯盘面。额外验收图放 previews/：hr-120.png、hr-150.png、battery-29.png、battery-9.png、zero.png、missing.png，各图只改变对应数据，zero同时使用steps=0/battery=0，missing使用null且进度全暗。截图与资源、JSON必须属于同一版本。

设计方交回前检查：

- [ ] JSON可解析、ID唯一、所有引用可解析，文件名大小写一致。
- [ ] 资源、字体、来源及完整许可齐备；没有本机路径或在线依赖。
- [ ] 时间、数据、指针、标签和进度保持独立；所有重要元素有具体坐标。
- [ ] 基准设备明确为Venu 4 45mm / 454×454；安全边距12。
- [ ] 0、缺失、小数阈值边界、AOD行为一致；预览没有伪读数。
- [ ] 最宽数字、--、两位数电量、100%及12/3/6/9点指针方向已核对。
- [ ] 设置默认值与主体一致，切换来源时标签/单位/进度有明确行为。
- [ ] 静态装饰与特殊效果分离，有fallback；基准截图关闭动画。

接入方验收顺序：格式/资源检查 → 能力差异报告 → 生成可编辑设计 → 对照同数据亮屏/AOD → 生成原生工程 → 基准设备SDK编译 → 模拟器/真机检查 → 加入默认参考。资料不全退回补齐；未支持的必要能力先补适配，不以整盘截图替代全部控件。

设计方不必实现自动导入工具。现有程序具有基础图形、指针、数据、条件、图片和字库能力，但本规范的字段映射、通用字体导入、MM.DD ddd格式、派生标签、配置联动和扫描效果等仍需在首个SONAR包上逐项转换或扩展。本轮仅制定标准，不宣称以上流程已经自动化。

## 12. 与内部参考目录的关系

交付包的watchface.json是设计唯一事实来源；preview仅供核对，HTML不是运行输入。首次接入转换为内部reference.json（身份、来源、资源清单）和design.json（控件布局/绑定），同时保留接入版本与差异记录。程序内部文件不是设计方的第二套编辑入口。

现有native模式社区项目继续保留原生代码；不会强行用本规范重新生成。设计包生成的源码、FNT/PNG和设置XML属于转换输出。默认参考受保护，用户从卡片创建独立副本。维护规则参见[default-watchfaces说明](../default-watchfaces/README.md)。
