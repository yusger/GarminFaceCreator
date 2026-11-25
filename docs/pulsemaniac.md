# PulseManiac 四态静态表盘

在首页点击“使用 PulseManiac”创建可编辑副本。默认卡片显示“自主”和“默认参考 · 不可删除”；副本使用独立项目/应用身份，可保存、导出和删除。使用本地生成器编辑后，将项目命名为 ASCII，例如 PulseManiacCopy。

## 布局和数据

- 顶部默认电量、步数，16px 手写字、#8A93A0。选择对应图层修改数据源、标签、单位和颜色。本地生成支持电量、步数、缓存心率、公里距离、当日总热量、秒数和缓存天气温度；其它来源需使用 AI 生成并验证。
- 四态人物胸口的完整心形包围实时心率数字；固定 heartRate，不允许切换其它数据源。颜色按灰白、浅黄、黄、红区分状态。四个控件共享锚点，数字不写死在人物素材中。
- 人物下方保留小号日期与大号手写时间；顶部不重复显示心率或时间。日期可以隐藏。
- HR<100 静息，100≤HR<120 预备，120≤HR≤140 扭动，HR>140 彻底疯狂。只切换四张静态人物，没有姿态动画、额外定时器或主动传感器采样。
- 缺失心率时显示静息人物与 --；息屏固定静息人物、心形/心率和时间，隐藏纹理、圆环、日期和疯狂装饰。位图本身不自动变为 AOD 文字颜色。

共22个图层：共享黑板纹理与手绘粉笔环、四张静态人物、四组独立心形/心率、四个疯狂态汉字、两行顶部数据、日期与时间。预备态保留黑色头部和白色闭眼五官；疯狂态增加静态残影、汗滴、速度线与红色闪电。

## 维护与来源

维护入口为 [`default-watchfaces/pulsemaniac`](../default-watchfaces/pulsemaniac/README.md)。统一 `reference.json` 描述身份、版本、代码、独立素材及完整 notices；`design.json` 保存布局和绑定，构建由共享确定性生成器生成原生快照。运行 `npm run build` 自动生成页面包与注册表，不直接编辑 frontend/public 下的输出。

时间、心率与辅助数字采用 [Permanent Marker](https://github.com/google/fonts/tree/main/apache/permanentmarker)，疯狂态中文采用 [Ma Shan Zheng](https://github.com/googlefonts/mashanzheng)。完整许可、固定源版本、SHA-256 见包内 `notices/`、`fonts/sources.json`。图片提示词和独立权利范围保留，不虚构外部上游表盘或素材许可。原始设计与草稿留在被忽略的 Temp 中。

原生 FNT/PNG 由本地浏览器按照目标屏幕像素生成；默认454px快照随参考包保存，改字号或设备后编译/导出会重新生成。维护默认快照使用 `node scripts/generate-pulse-font-snapshots.mjs`（需要本机 Edge，不启动服务）。源码 ZIP 包含完整 Monkey C、图片、原生字库、所用字体及许可；后端只需正常编译，不需要安装这些字体。图片资源按 screen 百分比换算并只缓存当前显示资源。

## 实际截图和验证范围

[默认卡片](screenshots/pulsemaniac-reference-card.png) · [静息](screenshots/pulsemaniac-0.png) · [预备](screenshots/pulsemaniac-1.png) · [扭动](screenshots/pulsemaniac-2.png) · [疯狂](screenshots/pulsemaniac-3.png) · [网页息屏](screenshots/pulsemaniac-aod.png)

[生产 PRG](screenshots/pulsemaniac-native.png) · [实际 Always-On](screenshots/pulsemaniac-native-aod.png) · [41mm 修改数据源后](screenshots/pulsemaniac-test-small-native.png)

[HR=110](screenshots/pulsemaniac-test-ready-native.png) · [HR=130](screenshots/pulsemaniac-test-twist-native.png) · [HR=158](screenshots/pulsemaniac-test-maniac-native.png) · [缺失心率](screenshots/pulsemaniac-test-missing-native.png) 为专门测试工程：仅替换缓存输入，其余使用相同生产资源；正式代码没有固定心率值。

支持独立预览四态快捷选择和手动边界测试，设备适配仍需逐型号验证。网页和模拟器不保证所有真机逐像素一致；缓存时效、AOD 功耗及烧屏保护需继续实测。阶段记录见 [stage-validation.md](stage-validation.md)。
