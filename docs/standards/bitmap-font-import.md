# 本地BMFont（FNT＋PNG）导入基线

首版为独立文字、时间、日期、数值字段使用固定目标像素字体。单页Unicode BMFont文本、8位灰度非交错PNG（与现有生成字形链一致）；FNT≤256KB、字符≤512、字偶距≤1024，图集≤512×2048/1MB，项目最多8份且图集总量≤4MB。仅接受IHDR/IDAT/IEND三类PNG块，不接受压缩文本/色彩配置等附加元数据。检查页名、CRC、尺寸、字符索引、矩形、偏移、lineHeight/base、字偶距引用和授权，拒绝外部路径、多页/压缩打包、彩色或不透明RGBA图集。PNG解码必须成功，不悄悄回退系统字形。

字距按同一advance/kerning表逐字符排版，网页与原生使用同一指标；不假定SDK自动字偶距行为。原始描述、灰度图集、许可仅在浏览器保存，主动源码导出保留；编译只发准备好的FNT/PNG，AI只看到已批准字体身份、像素字号和字形范围。

固定图集不任意放大缩小；目标或亮屏/AOD字号不匹配须诊断并阻止本地生成，用户选择匹配图集或回到TTF/设备字体。初版不宣称复合内部字形、曲线文字、图表或多行排版支持。字形子集和资源预算需显示，完整字体被导入不等于全部占用都已适合设备。

该文档在代码/SDK/原生截图完成前是实施契约，不作为已支持声明。后续证据单独记录。依据[Garmin Resources / Fonts](https://developer.garmin.com/connect-iq/articles/core-topics/Resources.html)及[自定义字体说明](https://developer.garmin.com/connect-iq/connect-iq-faq/how-do-i-use-custom-fonts/)。

原生指标首版仅核验 Venu 4 45mm/41mm；其他目标明确阻止生成。SDK 9.3 两尺寸截图测得 drawText 顶部有1px内边距，受管绘制器做相应补偿；这是已测设备/SDK的映射，不能推断其他固件。生成FNT扩大字形自身advance容纳右侧外伸墨迹，整体排版仍由原始advance/kerning决定。后续升级SDK须重跑截图，不能仅靠编译通过。
