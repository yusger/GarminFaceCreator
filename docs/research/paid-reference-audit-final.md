# 默认参考表盘：付费模型最终审计

13款均完成一次真实模型生成，并在同一根继续记录获授权的人工诊断修复。初次生成结果与失败历史未覆盖，见[初始审计](paid-reference-audit.md)。正常产品仍只允许2轮自动修复；本轮操作员额外修复不代表产品可以无限自动重试。

最终12/13可通过SDK编译并启动，不能称12款显示和数据全部验收通过。SkyRing视觉明确失败；本批trail仍编译失败，另一个既有trail根的[9轮修复与三主题/AOD结果](paid-trail-final.md)独立保存。

| 表盘 | SDK / 启动 | 累计修复 | 观察与边界 |
| --- | --- | --- | --- |
| AboutTime | succeeded / succeeded | 3 | 文字已居中且完整显示；字体与网页仍有差异。 |
| BAWF | succeeded / succeeded | 2 | 基本布局可读；字体、日期格式与网页有差异。 |
| Celestial | succeeded / succeeded | 3 | 可编译并启动；天文来源、位置变化及低功耗尚未逐项验收。 |
| ClownWatch | succeeded / succeeded | 8 | 精确系统字体修复后布局可读；心形字形仍有缺失。原设计部分血氧/海拔/气压是静态文字，不能计作真实传感器绑定。 |
| Crystal | succeeded / succeeded | 14 | 修复 Numeric 类型及文字锚点后无原有严重重叠；字号与网页仍不同。 |
| fine-o-clock | succeeded / succeeded | 4 | 原 FNT 描述、图集及无损图片恢复；时间位于气泡、秒数位于杯子。 |
| KISSFace | succeeded / succeeded | 6 | 阈值颜色 Symbol/String 键修复后可读；字体仍有差异。 |
| PulseManiac | succeeded / succeeded | 2 | 图片按目标尺寸缩放后通过编译；只验证 HR80 静息画面，四态边界未全部验证。 |
| SkyRing | succeeded / succeeded | 4 | 不合格：明显文字重叠、不支持的 Unicode 字形；启动成功不等于显示正常。 |
| SONAR | succeeded / succeeded | 6 | 日期和文字锚点修复后可读；指针形状/长度有差异，扫描效果未获完整验证。 |
| TimelyFenix | succeeded / succeeded | 5 | 月份长度修复后日历正确；字体仍近似，非逐像素相同。 |
| trail | unverified / unverified | 1 | 本批次独立根仍失败：位图字体 ID 前缀错误，后续精确补丁不唯一而拒绝应用。独立的既有 trail 根修复9轮后通过，另行报告，不替换本批失败。 |
| YetAnother | succeeded / succeeded | 2 | 基本布局可读；字体及日期格式有差异。 |

记录到 74 条含usage的模型响应、已知 616,129 tokens；1 份空usage记录包含本地补丁校验拒绝等情况，不能据此断言零计费或零网络调用。完整结构化摘要见[审计JSON](paid-reference-audit/final/audit.json)。这份批次统计不包括独立旧trail根，不合并未知usage为0。

每个目录保留网页参考与实际原生PNG；两者时间/输入未同步，因此不计算像素还原分数。 [AboutTime原生图](paid-reference-audit/final/abouttime/native.png)； [BAWF原生图](paid-reference-audit/final/bawf/native.png)； [Celestial原生图](paid-reference-audit/final/celestial/native.png)； [ClownWatch原生图](paid-reference-audit/final/clownwatch/native.png)； [Crystal原生图](paid-reference-audit/final/crystal/native.png)； [fine-o-clock原生图](paid-reference-audit/final/fine-o-clock/native.png)； [KISSFace原生图](paid-reference-audit/final/kissface/native.png)； [PulseManiac原生图](paid-reference-audit/final/pulsemaniac/native.png)； [SkyRing原生图](paid-reference-audit/final/skyring/native.png)； [SONAR原生图](paid-reference-audit/final/sonar/native.png)； [TimelyFenix原生图](paid-reference-audit/final/timelyfenix/native.png)； [YetAnother原生图](paid-reference-audit/final/yetanother/native.png)；

共性问题已经转为工程契约及回归：精确设备字体名称、原FNT描述保留、目标图片缩放与PNG编码、Numeric类型、Symbol/String键、日期格式和左上角排版。修复这些契约能减少猜测，仍不能保证模型一次生成正确代码。原参考中的固定文字与真正数据绑定分开计；非受控传感器值、各配置组合、所有低功耗路径与真机续航仍需另行验证。

仅测试环境更新到9dd30882，展示环境未动。临时限额已恢复worker50、单IP10/全局30；原生日账本142次逐字节保留，容器资源配置未变。由于未清账，恢复后当天会按既有限额拒绝继续原生验证，这是预期行为。付费调用授权随本轮结束，不用于后续新计划。
