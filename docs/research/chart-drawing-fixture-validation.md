# 正值图表绘图与AOD夹具验证

实现4dd587d，修复2431522；夹具脚本3c186c3/99a184f。仅113，basic57，Schema44不变。无模型调用。

首轮固定数据正常执行4次SDK/原生，但发现最高柱读数压进同色填充，以及满柱强制AOD约19.29%亮像素，未标为通过。修复：先画面积/线再画点/字，面积与分段填充关闭隐式描边；亮屏数值预留独立顶部行；AOD改轮廓柱保留高度；未设背景的网页与原生统一为黑色。

修后本地12项、113回归16项通过（包括2尺寸固定截图基准，四PNG逐通道零变化，未重写基准或放宽容差）。4个夹具再次全部通过真实SDK及正常原生验证入口，清理completed：小时折线/面积454、每日梯形/分段454、强制AOD454、小时390。

- [小时原生454](../screenshots/hour-chart-native-454.png) / [网页454](../screenshots/hour-chart-browser-454.png) / [原生390](../screenshots/hour-chart-native-390.png)：缺失断线，119绿/120与149黄/150与210红，固定轴顶180但读数210保留。
- [每日边界](../screenshots/day-chart-boundaries-native.png)：真实零点、缺口、17.5k/17.50超轴值可读，不改实际值；覆盖6/7。
- [强制AOD](../screenshots/chart-outline-aod-native.png)：忽略活动阈值色、无读数标签，仅轮廓柱；圆屏亮像素3.3603%，低于登记10%参考线。固定帧不代表Sleep事件、持续点亮、防烧屏或续航通过。

[完整记录](chart-drawing-fixture-results.json)保留固定输入、应用fixture数据标记、PRG/源散列、模式与AOD统计。worker原始dataMode仍表示模拟器环境defaults，本夹具在应用中覆盖点数组，故另标applicationDataMode=controlled-fixture，不拿它当真实SensorHistory覆盖。原始metadata保存在忽略的Temp；没有修改原始worker报告。源读取缓存、分桶另有规则测试和实际默认历史记录。

仍有SDK色深、字体栅格/基线与整像素取整差异，不宣称网页和设备逐像素相同。实际Sleep、跨日/时区/重启历史和硬件继续待验。以上测试工程不进入参考库或生产PRG，也不替代trail同PRG主题/设置验收。
