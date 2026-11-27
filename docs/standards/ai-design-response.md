# AI 创建设计响应与本地安全修正

协议 gfc-ai-design-v1，响应Schema ID urn:gfc:ai-design-response:1。静态基准在resources/schemas/ai-design-response-v1.json，由scripts/build-ai-design-schema.mjs从aiDesign.ts同一允许字段与类型集合生成；实际请求按已选来源、秒数和复杂度进一步收紧。此规范属于AI创建设计响应，不替代第三方发布包、自定义控件或默认参考格式。旧项目及未传look/complexity的请求保留原有80层上限。

响应只包含backgroundColor和layers。沿用现有kind/source，禁止程序源码、额外字段或整盘截图。Schema覆盖基础结构/字段类型；唯一ID、圆屏、完整时间模式、数据来源、字体、AOD及资源语义仍由解析器/目标设备校验，不宣称JSON Schema通过即原生通过。模型服务不支持严格Schema协议时，仍在设计上下文携带此Schema，不发送未知API参数。

视觉指导look：free / minimal_clean / sport_data / retro_digital；时间模式DIGITAL/ANALOG/HYBRID优先，不因风格增加未勾选的数据。复杂度1–4分别最多12/24/40/80层，圆环1/2/4/8，图片2/4/8/16，基础图形4/10/18/36；这是创建预算，不是Garmin设备性能保证。

本地安全格式修正仅处理：基础rect/circle/line/polygon缺失无关文字size时补默认值；普通hand的handShape:"line"归一为省略该字段。不移动、缩放、改色、更换字体或数据，不抹掉其他未知字段；先显示修正清单，由用户点击应用，重新完整校验后才可采用。保留原始响应，修正写入设计brief。任何剩余日期、布局或能力错误继续拒绝，不自动付费重试。

逐层错误提供layerId/field/code/message并一次展示已识别的问题；无法解析的层不猜测后续渲染。整体时间/预算/数据约束还有后置检查，未承诺一次列出所有可能组合错误。
