# 原生生成声明规则

生成请求包含 generationRequirements 与固定 requiredManifest，按实际导出的图层计算，不改动已有参考项目原生工程。

- 仅心率、海拔历史读取使用 SensorHistory；压力和恢复时间通过 Complications，声明 ComplicationSubscriber。步数、总热量、日距离、电量和缓存天气不附加无关权限。
- 当前增强绘图协议包含 Source-over，最低 API 基线 4.2.1；使用紫外线字段时提升为 5.1.0。不把 SDK 版本、设备包 hash 当成最低 API。
- 里程由厘米转公里，海拔由米转英尺以匹配网页默认显示，风速保持米/秒，恢复时间由分钟转小时。热量是每日总热量，不冒充运动热量。
- 根据实际文字、数据标签/单位/缺失提示和 AppName 资源确定字形集合；编辑器图层名、分组名及界面语言不参与。英文基础资源 eng；汉字兼容 zhs/zht，假名添加 jpn。只凭汉字无法判断用户文字语言；这不生成翻译，也不保证所有设备语言和字体包含全部字形。
- 模型须核查 glyphs 中的字符；缺字时使用用户提供且授权的位图字体，不复制 SDK 字体。系统字体在不同设备语言下的效果仍需模拟器或真机检查。
- nullable API、传感器迭代器、模块/字段能力、异常均需处理；缺失显示 missingValue，不以模拟数据冒充真实值。静态浏览器预览不能证明传感器可用。

依据：[SensorHistory](https://developer.garmin.com/connect-iq/api-docs/Toybox/SensorHistory.html)、[Complications](https://developer.garmin.com/connect-iq/api-docs/Toybox/Complications.html)、[Weather 字段](https://developer.garmin.com/connect-iq/api-docs/Toybox/Weather/CurrentConditions.html)、[ActivityMonitor](https://developer.garmin.com/connect-iq/api-docs/Toybox/ActivityMonitor/Info.html)、[资源语言](https://developer.garmin.com/connect-iq/articles/core-topics/Resources.html)。声明是生成契约，不能保证任意大模型输出无误；最终仍由真实 SDK 编译和设备验证。

数值单位（dataSources.unit）与显示后缀（defaultDisplayUnit）分别声明，不能把每个物理单位自动追加到画面。显式 unit 仍为后缀文本，不自动换算数值；空字符串隐藏后缀。强度分钟 /150 保留为静态显示后缀，不当作实时目标。心率装饰字符加入字形核查清单；缺字仍需用户字体方案或设备核查。

模型请求使用显式画布字段白名单，不再展开整个项目对象；导入的未知根属性、图层属性及阈值/图标/天气/布局中的额外字段都不会透传。编辑器分组、锚点、锁定、历史和存储元数据不参与原生渲染请求。新增 Layer 字段必须在协议中明确包含或排除，否则类型检查失败。已定义的文本/标签仍属于用户主动发送的设计内容；模型设置 Key 仅用于认证头。
