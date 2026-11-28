# AI 创建设计响应与本地安全修正

协议 gfc-ai-design-v1，响应Schema ID urn:gfc:ai-design-response:1。静态基准在resources/schemas/ai-design-response-v1.json，由scripts/build-ai-design-schema.mjs从aiDesign.ts同一允许字段与类型集合生成；实际请求按已选来源、秒数和复杂度进一步收紧。此规范属于AI创建设计响应，不替代第三方发布包、自定义控件或默认参考格式。旧项目及未传look/complexity的请求保留原有80层上限。

响应只包含backgroundColor和layers。沿用现有kind/source，禁止程序源码、额外字段或整盘截图。Schema覆盖基础结构/字段类型；唯一ID、圆屏、完整时间模式、数据来源、字体、AOD及资源语义仍由解析器/目标设备校验，不宣称JSON Schema通过即原生通过。模型服务不支持严格Schema协议时，仍在设计上下文携带此Schema，不发送未知API参数。

视觉指导look：free / minimal_clean / sport_data / retro_digital；时间模式DIGITAL/ANALOG/HYBRID优先，不因风格增加未勾选的数据。复杂度1–4分别最多12/24/40/80层，圆环1/2/4/8，图片2/4/8/16，基础图形4/10/18/36；这是创建预算，不是Garmin设备性能保证。

本地安全格式修正仅处理：基础rect/circle/line/polygon缺失无关文字size时补默认值；普通hand的handShape:"line"归一为省略该字段。不移动、缩放、改色、更换字体或数据，不抹掉其他未知字段；先显示修正清单，由用户点击应用，重新完整校验后才可采用。保留原始响应，修正写入设计brief。任何剩余日期、布局或能力错误继续拒绝，不自动付费重试。

逐层错误提供layerId/field/code/message并一次展示已识别的问题；无法解析的层不猜测后续渲染。整体时间/预算/数据约束还有后置检查，未承诺一次列出所有可能组合错误。


## 批准的素材库字体（design-15-library-fonts）

文字/时间/日期/数据/图表可选`fontId`，取值为当前请求approvedLibraryFonts中的id；完整列表源自resources/shared/fonts/catalog.json。解析器将其转换为已有garminFont/customFont受管字段，不保存新的图层字段，不接受任意customFont路径或字节。省略时继续使用设备字体。指定fontId时garminFont应省略或auto；图片/图形不能携带fontId。中文日期及常见汉字仅允许chalkHan，其他缺字仍由字体资源准备检查，不能静默回退。

新增Rajdhani Light/Bold保留固定上游版本、字节摘要及完整OFL许可；id为rajdhani_light/rajdhani_bold。实际轻重来自字体轮廓，不以网页合成字重充当原生支持。库字体选择也可在创建后使用字体工作台修改或转换为固定像素排版。旧第三方发布v2仍只允许其冻结的四份字体；该AI响应扩展不改变旧交付契约。


## 批准的素材库图标（design-16-library-icons）

image层可选iconId，只允许请求approvedIcons中列出的Lucide素材。目录直接来自现有授权素材库，提供id/name/provider/license，不向模型传SVG字节。解析后得到已有libraryIcon字段（可改色、原始线宽2），仍为可编辑图片对象，颜色和AODColor由图层管理；iconId不作为新的持久化图层字段。不能与referenceId、外部URL或内嵌图片混用；未指定iconId时仍需显式标为实际素材的上传引用。

这是固定图标外观，不因选择心形就自动读取心率，不自动生成天气类别或阈值状态。联动数据槽、显隐和状态图标继续使用已有显式控件协议。新增AI选择不改变原图标的许可、资源准备、源码归属或旧第三方v2范围。


### 创建专用虚拟字段与对话边界

`fontId`、`iconId` 是 AI 创建响应的受控资源选择字段，解析后转换为注册字体或图标引用，不存入图层。AI 对话的普通 `update.patch` 不接受这些字段（包括数字等错误类型）；更换字体继续使用公开的 `font` 操作。设备范围的字体编辑由字体库完成，当前对话仍限定共享主设计。不能将创建响应字段直接复制为对话修改字段。
