# PulseManiac 四态静态表盘

在项目首页找到 PulseManiac 默认参考卡片，点击“使用 PulseManiac”创建可编辑副本。卡片与其他默认参考统一显示“默认参考 · 不可删除”，默认参考本身受保护；副本使用独立项目/应用身份，可保存、导出、修改和删除，并可直接编译。编辑后使用本地生成器仍需遵循其 ASCII 项目名限制，可将副本重命名为 PulseManiacCopy。自有设计来源和素材说明独立保留，不虚构外部上游项目或许可。

- 顶部第一行默认电量，第二行默认步数；选择对应图层，可修改数据源、标签、单位和颜色。首版本地生成器支持电量/步数/缓存心率/距离/总热量/秒数；选择其他来源时按已有提示使用 AI 生成并验证，不能假定本地生成器支持全部数据。
- 胸口心率固定绑定最新可获取的 Garmin 心率缓存，数字独立于人物图片。四态使用同一心率锚点和明确的灰白/浅黄/黄/红颜色，不把数字画死在素材里。
- 人物下方保留一次中文星期/月日和底部大号时间；顶部不重复显示心率、日期或时间。
- HR<100 静息，100≤HR<120 预备，120≤HR≤140 扭动，HR>140 彻底疯狂。没有姿态动画、额外定时器或主动心率采样；条件按可用缓存判断。
- 心率缺失时显示静息人物、心率 --。息屏固定静息人物和心率/时间，隐藏背景、日期和疯狂装饰。位图本身不自动套用 AOD 文字颜色；真机 AOD 功耗/烧屏限制需另行验证。

22 个图层包括共享背景、四个静态人物、四组独立胸口心率数字/心形、四个中文装饰字和四个共享数据/日期/时间控件。第二张预备态人物已按设计者要求将头部改为黑色，闭眼五官为白色，四张角色风格统一。角色 PNG 均为真实透明背景，原稿中的数字、日期、表圈没有进入人物素材。

独立预览提供四态快捷按钮，也可手动输入心率测试100、120、140边界与缺失。新增设备可使用已有“适配设备”功能；四个状态和胸口数据需要一起校对位置，不自动保证所有硬件兼容。

`default-watchfaces/pulsemaniac/` 保存设计、原生源码快照、独立 PNG、字体及完整来源说明。构建前自动执行统一 `scripts/build-default-watchfaces.mjs`，固定图层身份和原始素材 SHA-256。创建时只读取固定同源素材路径；背景和粉笔环为独立 PNG，人物 PNG 保留原 alpha，原生尺寸由 Garmin 资源编译器按目标像素生成。浏览器备份保留素材；源码 ZIP 附完整 Monkey C、素材、适用许可与 PulseManiac 来源/提示词。原设计参考和草稿继续留在被忽略的 Temp 文件夹。


## 实际显示与验证范围

[静息网页](screenshots/pulsemaniac-0.png) · [黑脸预备态网页](screenshots/pulsemaniac-1.png) · [扭动网页](screenshots/pulsemaniac-2.png) · [疯狂网页](screenshots/pulsemaniac-3.png)

[生产 PRG 亮屏](screenshots/pulsemaniac-native.png) · [生产 PRG 实际 Always-On](screenshots/pulsemaniac-native-aod.png) · [41mm 修改数据源后原生](screenshots/pulsemaniac-test-small-native.png)

[HR=110 预备态](screenshots/pulsemaniac-test-ready-native.png) · [HR=130 扭动态](screenshots/pulsemaniac-test-twist-native.png) · [HR=158 疯狂态](screenshots/pulsemaniac-test-maniac-native.png) · [缺失心率](screenshots/pulsemaniac-test-missing-native.png) 为明确的测试工程：只替换心率缓存输入，仍绘制相同生产资源、实时时间和日期。正式工程没有这些固定心率值，也没有动画计时器。

首次完整图片编译暴露了资源参数单位：裸 scaleX/scaleY 被当前 SDK 按缩放倍率处理，已改为显式 screen 百分比并按目标像素换算。图片缓存只保留仍在显示的资源引用。模拟器还用于调整实际系统字体：顶部/胸口采用 XTINY，时间采用 LARGE，避免网页字号与原生字体档位不同造成重叠；中文使用 SYSTEM_XTINY。网页字体与设备字体仍不保证逐像素一致，真机功耗与清晰度待设备实测。

完整源工程和 PRG 在指定远程环境测试；验证记录见[阶段 51～52](stage-validation.md)。


默认参考卡片的[实际页面截图](screenshots/pulsemaniac-reference-card.png)显示与其他参考一致的“默认参考 · 不可删除”标签。首次使用创建副本，保留自有设计的素材来源说明。


## 布局修订 v2

根据设计者更新的布局说明，胸口心率放进完整心形轮廓中并固定 heartRate；顶部电量/步数改为 16px、#8A93A0，可在编辑器切换数据源。天气温度支持 Garmin 缓存读数，缺失显示 --。
背景改为炭笔擦除纹理，外圈为独立粗粝粉笔位图；疯狂态补充静态残影与速度线，第二张黑脸保持。仍只有四张静态姿态，原有心率边界保持。
底部时间及数字采用 Permanent Marker，疯狂态中文采用 Ma Shan Zheng；许可证、固定 commit、SHA-256 见包内 notices 与 fonts/sources.json。字体在本地浏览器按目标像素生成 FNT/PNG，原生字库随源码导出；服务端不需要安装字体。其它系统字体不保证与网页逐像素一致。
