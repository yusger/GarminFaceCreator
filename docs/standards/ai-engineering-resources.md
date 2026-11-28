# AI 工程资源与原生绘图契约

当前提示词版本：engineering-21-preserved-reference-fonts。此文件描述前端给工程模型的约束，不改变已冻结的设计包或发布包格式。

- 图层坐标是454单位画布上的左上角边界。普通文字居中锚点为x+w/2，右对齐为x+w；位图文字管理助手直接接收原边界并自行排版，不能再次偏移。
- `nativeImageBindings` 给出实际目标像素宽高和资源编译缩放属性。1254px原图不等于220px图层；使用资源缩放后不能再重复缩放。图片原文件留在项目，模型不重画或删除素材来回避预算。
- Venu4变换位图按非索引资源准备，默认PNG使用无损PNG编码及无抖动，保留暗色半透明装饰。显式自定义调色板不被静默删除。原生使用SOURCE_OVER叠加；SDK9.3的drawBitmap2有四个参数，AffineTransform由构造器创建。
- `preservedFontResources` 只列出已有FNT路径、PNG图集和资源ID，不向模型发送整份字形文本。生成时保留模型遗漏的已有描述文件，原绘图源码不因此改写。仅支持有匹配图集、平坦安全路径的单页描述，平台生成的Gfc字体另走管理流程；沿用目标字体预算并限制遗留描述数量和体积。
- 字体XML应引用FNT描述，PNG是字形图集，不能把任意PNG当作字体文本。修复只能引用当前工程中真实存在的FNT/SVG或二进制素材，不允许虚构路径。
- 通用几何助手接收Number与Float时使用Lang.Numeric；十六进制字符应按字符码解析，不能将String.toNumber误当字符码。
- Gregorian的FORMAT_SHORT用于数字日期字段；FORMAT_MEDIUM可能返回月份/星期字符串。日历必须处理实际月份长度、闰年和相邻月，不固定31天。
- `GfcWeather.read(lowPower)` 返回SDK的CurrentConditions对象或null，不是字典，没有valid条目。先检查对象、字段存在和非空，再使用temperature、relativeHumidity等字段；低功耗返回缓存，不伪造缺失天气。

这些约束减少模型猜测，不能取代SDK、原生运行和显示检查。成功启动不能证明图层完整、配置有效、真实数据语义、AOD或真机续航正常。实际付费测试与失败记录见[审计报告](../research/paid-reference-audit.md)。
