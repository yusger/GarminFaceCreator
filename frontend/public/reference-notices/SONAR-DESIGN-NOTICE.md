# SONAR 设计来源与权利说明

- 设计者 / 权利主体：yusger，依据用户提供的 SONAR 原始表盘设计稿重整。作者归属以 `origin.authors` 与本说明为准。
- 辅助工具：WorkBuddy，仅协助整理设计资料、按几何参数绘制静态图片素材、从主体 JSON 渲染预览图；不作为设计作者或权利主体。
- 来源：自主设计，无第三方设计稿、无社区项目来源，`origin.kind = self`。
- 交付内容：watchface.json（唯一事实来源）、preview.png / preview-aod.png、previews/（验收图与 cases.json）、resources/、notices/。
- 静态图片资源（dial-rings.png、scan-beam.png、heart.png、battery-icon.png）由本项目脚本用 Pillow 依 watchface.json 的几何参数绘制，无外部图片素材，随本包一同交付。
- 字体：Share Tech Mono（Regular / 400）与 Barlow Semi Condensed（Medium / 500）。具体上游：`https://github.com/google/fonts/tree/main/ofl/sharetechmono` 与 `https://github.com/google/fonts/tree/main/ofl/barlowsemicondensed`；文件取自 `ofl/sharetechmono/ShareTechMono-Regular.ttf` 与 `ofl/barlowsemicondensed/BarlowSemiCondensed-Medium.ttf`，获取日期 2026-11-25（仓库 main 分支）。许可均为 SIL Open Font License 1.1，全文见 number-font-LICENSE.txt 与 label-font-LICENSE.txt；本轮未独立核验上游许可真实性。字体文件随包交付，不依赖在线 CSS。
- 字体需覆盖的字符：数字 0-9、冒号、百分号、度数符号、负号、句点、逗号、连字符、空格，以及英文星期缩写 SUN/MON/TUE/WED/THU/FRI/SAT 与标签 bpm / batt / steps / kcal / km / temp / sec。缺失占位为 `--`（两个连字符）。本设计不含中文与特殊符文。
- 预览图仅用于数据核对，不是运行输入；HTML 展示页不构成本包主体。
- 首版已知降级：扫描扇区默认静态（effects.scan-rotation.required=false，enabledByDefault=false，fallback.angle=0）；hysteresis 统一为 0；电量图标不含动态填充；连续进度条 segments=1，填充 84.2%（约 60.624 逻辑像素），接入方需补连续填充能力，不能映射为未达目标全暗。
