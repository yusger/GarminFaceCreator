# Native 454 混合表盘设计基准

一个项目、三套主题：Apex Instrument、Trail Compass、Vital Pulse。source保留作者提供的Rev.04设计、字体及完整OFL声明；generated是转换后的可编辑项目与差异记录，不是默认库自动发布。

历史首次转换脚本：node scripts/build-native454-study.mjs；该脚本不能覆盖当前维护后的design.json。当前字体资源维护使用下文命令。首次转换及后续修改均须对照固定时间、数据、亮屏/AOD与边界预览；资源仍待SDK、模拟器及真机验收。主题内颜色/数据/装饰使用独立配置，预览说明页上的AOD技术字幕不作为实际盘面内容。

原始Source中的独立三包结构是历史交付形态，不代表三款程序；公开副本notice移除了本地绝对路径。原图是设计基准，不等同于原生验收结果；转换器修复的日期、缺失和电量阈值语义分别记入conversion-report。


v1.2.0使用同一项目的45mm/41mm固定像素字形：每目标14份，合计28份图集约61KB。字体角色按具体像素字号分为27项，原始两份TTF及完整OFL保留；字形转换用实际网页基线校准，图层几何不变。共享主设计使用454像素字形，其他尺寸在设备微调范围预览/生成。原始字体引用在design-source/font-preparation.json，维护时运行`GFC_TEST_URL=已授权测试地址 node scripts/prepare-trail-fonts.mjs --write-reference`，只使用浏览器本地字体准备，不调用模型或编译API。完整SDK/原生/实际Sleep验收分别记录，字体资源准备完成不代表这些验证通过。
