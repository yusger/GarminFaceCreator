# SONAR 表盘设计包

遵循《GarminFaceCreator 表盘设计包接入规范 v1.1》（formatVersion 仍为 1）。基准设备 Venu 4 45mm，454×454 逻辑像素，包版本 1.1.0。

- `watchface.json` 是设计唯一事实来源；18 个独立图层，按 id 稳定引用。
- `preview.png` 与 `preview-aod.png` 使用 `previewData` 的同一组读数和本地时间 2026-11-25T10:24:07，关闭动画后渲染。
- `previews/cases.json` 逐图声明数据与配置覆盖；previews/ 含 6 张阈值与极端值图，以及 distance-slot、seconds-off 两张配置切换对照图。
- 右槽 `steps-value` 使用 `precision:"auto"`：steps=8,420、calories=426、distance=6.42 km 各自按默认精度输出；切到 distance 时标签为 km、进度条隐藏，恢复 steps 后状态回到设计值。
- 进度条 segments=1，8420/10000 = 84.2%，72px 宽约 60.624px 逻辑填充；接入方需补连续填充能力，不能映射成未达目标全暗。
- 首版扫描效果默认静态；旋转为可选目标，停用时使用 fallback.angle=0。
- 设计者 / 权利主体：yusger；WorkBuddy 仅为辅助工具，详见 notices/DESIGN-NOTICE.md。
- 本包是接入规范的首个测试对象，尚未经过 Garmin 编译与真机验收。

## 语义用例断言（不强制每项出图）

- 心率：`<120` 青（含 119.9）、`120–<150` 橙（含 120、149.9）、`≥150` 红（含 150）；0、null 或非正数按兜底色并显示 `--`。
- 电量：`0–<10` 红（含 0、9.9）、`10–<30` 橙（含 10、29.9）、`≥30` 青（含 30）；null 或越界按兜底色并显示 `--`。
- 进度：0 全暗且数字显示 0；8420 填充 84.2%；10000 及超过目标填满；缺失全暗且数字 `--`。
- 配置：steps→distance→steps 往返后标签、单位、精度、进度显隐无残留；显示秒数 开→关→开 后秒针与数字秒显隐正确；保存重开按同一顺序求值。
