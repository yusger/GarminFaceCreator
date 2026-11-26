# 自定义控件交付规范 v1.0

状态：第三方设计交付契约。格式名 `gfc-control-package`，`formatVersion: 1`。Schema 位于 `resources/schemas/widget.schema.json`，完整示例位于 `resources/default-controls/examples/battery-capsule`。

**符合交付格式表示可以进入转换验收，不代表浏览器已能安装任意控件。** 本版只定义由已有图层组成的可复用控件，不加载第三方 JavaScript、HTML、Monkey C、动态插件、网络请求或自由表达式。新增原生能力先升级程序适配器，再开放接入；效果提示词不是运行契约。

## 1. 交付目录

```text
battery-capsule/
  widget.json           唯一控件主体
  preview.png           或 preview.svg，默认亮屏效果
  preview-aod.png       或 preview-aod.svg，AOD效果
  cases.json            状态/参数/边界验收数据
  resources/drawables/  可选透明PNG
  notices/              资源的完整许可、来源说明
  LICENSE               控件设计的完整许可证
  README.md             可选的使用说明
```

文件名及 ID 使用 ASCII；显示名称、参数标题允许中文。只允许包内相对路径，禁止绝对路径、`..`、软链接、远程资源和数据URI。运行图片为 PNG；SVG仅作非执行预览附件。字体首版使用 schema 的 Garmin 系统字体枚举，不将网页字体当成设备字体。独立字体或复杂 SVG 需要另外评审和升级能力。

## 2. 主体与坐标

必填字段以 Schema 为准：`id/version/name/category/canvas/origin/requirements/layers/parameters/resources/previews/casesFile`。`id` 在整个库中唯一，使用英文小写短横线，作者可用名字前缀避免重名；`version` 使用三段数字版本。`origin` 填写作者、来源及明确许可证，必须附全文；社区来源 `sourceUrl` 不能为空。预览图不能代替作者和许可信息。

`canvas.width/height` 是控件自身的逻辑尺寸，范围1～454；不是手表分辨率。所有图层均以该局部画布左上角为原点，坐标、字号、线宽同单位。`uniform-fit` 等比缩放，保留图层关系，不允许非等比拉伸指针。最终放入表盘时由程序转换为454设计坐标，再统一缩放到实际设备。

`layers` 数组顺序就是从底到顶的绘制顺序；每层有稳定局部 `id`。必须明确 `kind/x/y/w/h/color/size/aod/aodColor`，字号和线宽计入可见边界。普通图层不得越出控件画布；圆环及指针必须为方形旋转区域，完整轨迹也要在画布内。线段用正宽高的局部命中框，端点定义遵循现有编辑器，首版不交付负尺寸或退化线段。

当前契约类型：`text/time/date/metric/rect/circle/line/image/meter/ring/hand`。字段采用 schema 中的封闭白名单，与已有图层命名一致；不能添加自造 kind 或未定义字段。内部完整 Layer 里的项目 ID、版本历史、hidden/locked、脚本和工程文件不属于交付内容。导入器需填充编辑器内部默认值，不能把交付 JSON 当作完整内部项目直接反序列化。网页接入后将整个交付包封装为一个复合对象，layers 是内部绘制描述，不会直接铺到主图层列表。

## 3. 数据和显示行为

metric 必须给 `source/precision/unit/missingValue/garminFont`。首版来源清单在 Schema 中封闭列出，数值为接入方提供的规范单位；`unit` 只是显示后缀，不会转换数值。数据单位沿用表盘基础规范及已有数据源目录；距离为 km、温度为摄氏度。其它单位需要显式升级转换规则。

时间使用设备本地24小时制，日期语言显式 en/zh。预览读数只放 cases.json，不把10:24、72或78%烘焙为动态数据文字。metric 缺失固定显示 `--`。0心率、负活动数据、电量超出0～100、null及非有限值均按无效数据处理；有效0与缺失必须有不同语义。

meter 首版只绑定 battery 或 steps，`meterShape:"bar"`。连续条必须 `meterContinuous:true,meterCount:1`；电量目标100，步数目标正数。前景填充按 `clamp(value/goal,0,1)` 计算；缺失只显示暗轨道，不能伪装成有效0。ring 的来源、目标值、刻度数量均须明确，不把任意曲线声明成 ring。

阈值必须设置 `threshold:true`、显式 `thresholdRules` 和 `thresholdFallback`；不启用时 `threshold:false`。每档[min,max)，空端点表示无界，顺序严格递增且不重叠，先判原始数值再格式化。无效数据不命中阈值。若有多个联动数据层，必须明确每层绑定和对应的参数目标，不能通过解析标签文字推断。

## 4. 可配置参数

`parameters` 首版只支持 color、boolean、dataSource，与现有工程设置能力一致；每项必须给 id、label、type、default、targets。dataSource 额外给 options，default 必须属于 options。color 只能设置 `color` 或已有 `thresholdRules.N.color`；boolean 只控制 `activeVisible`（未填时默认true）；dataSource 只作用于 metric.source。

默认值必须与所有目标的初始值相同，同一目标属性不能由两项参数同时控制。dataSource 多选来源需单位/精度随来源适配；**首版仅允许相同单位、精度的来源组合**，否则应拆开设计或标为需要适配，不能把心率数字切换成步数却仍显示BPM。number、任意属性路径、脚本表达式和把资源路径做可执行参数均不支持。颜色等最终值仍由用户在编辑器配置，第三方不能写入 API Key、设备身份或工程命令。

## 5. AOD 和指针

每层的 `aod` 独立于 activeVisible；false 在AOD不绘制，true 使用显式 aodColor。数据小组件允许AOD整体隐藏，时间控件需保留时分。秒针在AOD必须 `aodSeconds:"hide"` 或固定zero，不能运行秒动画。动画、闪烁、渐变扫描不属于首版能力，禁止用静态截图冒充已实现的动态效果。

hand 使用与现有指针相同的局部旋转区域：`handPivotX/Y` 为0～1，0度朝12点，顺时针旋转；时、分、秒针按真实时间联动。`handReach/handTail` 为可用安全半径的比例。首版 hand 表示现有直线指针；自定义外形使用单独的指针套装交付规范，只有对应能力实现后才能作为可运行样式。

## 6. 资源、实例与版本

运行图片通过 `resources[].id` 和层 resourceId 引用，不能引用库外路径。PNG 必须保留alpha，包总资源建议不超过8MB；校验器限制40层、40个资源和每资源4MB。所有实际文件、资源引用和版权文件需齐备。

同一控件被插入多次时，程序为层、参数、资源和组生成独立实例ID，并保留来源id及版本。实例是一个复合对象，可整体移动、等比缩放、复制、删除；可在右侧控制内部部件，也可显式拆解为基础图层；更新库不自动覆盖既有项目。导出项目要包含已使用资源与许可，不能要求未来还从服务器下载这个版本才能编辑。第一版暂不承诺运行时安装、自动更新、嵌套控件或任意旋转组合。

## 7. 验收与能力声明

requirements 至少包含每种图层的 `core.<kind>` 及所用 `data.<source>`。能力标识统一小写，例如 `data.heartrate`，实际数据字段仍用 `heartRate`；校验器匹配时规范化大小写。它描述接入需求，不会自动实现功能。未知或未支持能力要输出差异报告，必要能力未完成时阻止上架，不能静默删除。

cases.json 格式：`{format:"gfc-control-cases",formatVersion:1,cases:[{id,data,parameters,expect}]}`。每个数据控件至少提供正常、有效零、缺失、最大值、阈值边界及AOD用例；每个参数有非默认用例。expect 描述关键显示结果，例如数值文本、填充比例和可见层。缺失填充可用null表示无有效前景，不能把它当有效零。数字最大宽度、中文、负温度、满进度和多个实例也应检查。preview与cases必须使用同一组确定数据，不能只提供无数据说明的效果图。

交付验收顺序：Schema → 包内路径/许可/引用/参数/几何语义 → 可编辑实例转换 → 相同数据预览 → 原生生成 → 实际SDK编译 → 模拟器/AOD → 真机。结构校验不等于设备验收。设计方无需提供 manifest、jungle、签名密钥、工程代码或PRG。

使用仓库校验器：`node scripts/validate-widget-package.mjs <包目录>`。规范和示例可直接交给第三方；首次接入应先交3个样包验证，再批量制作。

已接入的首批控件位于 `resources/default-controls/widgets/`：胶囊数据行、分段电量轨、图标数据列、三色数据层叠。在编辑器“素材 → 自定义控件”添加，转换为一个独立复合对象；右侧属性配置部件启用、亮屏、息屏、颜色及内部编辑。来源与完整许可嵌入项目并随源码ZIP导出。当前仅发布经过验收的内置包，未开放任意包安装；作者PNG是参考图，实际预览随数据绘制。


## 8. 已实现的复合对象语义

交付formatVersion保持1；项目内部schema26保存kind:widget和compound.version:1，包含局部画布、私有图层、参数值、语义部件及可选禁用图层列表。外部交付仍遵循本文的层白名单，不能把内部项目格式当成交付格式，也不开放任意脚本或嵌套复合对象。

图层列表只有一个节点，内部图形的画布点击指向父对象；复制同时重建内部图层和参数ID。整体缩放以局部画布等比居中，字号、线宽、圆角及进度条间距一并缩放。第一版整体不支持旋转，设备适配不修改内部绑定。

右侧“内部部件”按功能建立：多行信息板以数据行为单位，单行组件按背景、图标、标题、数值、进度条等划分。启用开关同时影响亮屏和息屏；隐藏后保留位置与设置，不自动重排。亮屏、息屏开关可以分别覆盖部件显示；息屏混合状态沿用内部原设计。高级内部编辑还可逐层启用、修改文字、颜色、数据源、单位和精度；编辑数据源时需核对标签和进度绑定。

这些显示开关是设计状态，预览和生成时使用；不是承诺所有部件都生成手机端设置。已定义的主题色继续进入原生工程设置。编辑器和代码生成共用同一展开逻辑，模型只接收基础图层及绑定，不接收整份内部结构或许可全文。

旧25版分组自动迁移为复合对象，保留已有样式、显示状态、快照、参数值和每设备内部微调；旧代码保留但标记需重新生成。存在交错绘制顺序、跨组配置引用或过大边界时保留旧结构，防止破坏已有设计，页面会提示。源码历史不重写。

