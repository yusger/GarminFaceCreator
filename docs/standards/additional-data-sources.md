# 新增读数、图标状态与进度来源

Schema42 / basic52 / source-adapters1.2.0。来源与绘制共用单位/范围，不把网页示例当传感器数值。

| 来源 | 实际口径 | 策略 |
| --- | --- | --- |
| oxygenSaturation | 最新记录SpO2百分比，SensorHistory.getOxygenSaturationHistory | period1为最近一条；when年龄0..300秒，0/越界/缺失为未知；不主动测量 |
| phoneConnected | 手机连接boolean映射1/0 | 未知不是断开；最多60秒活动缓存；AOD沿用最后活动快照 |
| moveBarLevel | ActivityMonitor当前久坐等级0..5 | 真实0保留，不冒充久坐分钟或百分比 |
| precipitationChance | Garmin缓存当前条件中降水概率0..100% | 不称雨量；共享60秒/6小时观测有效期天气服务 |
| windBearing | 缓存天气风向角度，北0东90南180西270 | 与设备朝向不同；共享天气观测策略 |

新增来源支持数值读数、阈值和显式图层条件；上传或内置的图标可按phoneConnected=1/0分别显示，缺失按missingVisible设置。沿用原规则，不自动解释图片。血氧和久坐支持分段/连续目标仪表，默认设计目标100和5，共用metricValid，缺失不点亮。更换仪表来源在面板同步目标；保存过的显式目标仍保留。数据槽选项与图表来源有独立白名单，未据此开放任意来源组合。

资源与图片仍按现有浏览器本地策略；新增数据没有网络请求或持续测量。月相算法、独立日出日落读数在此阶段尚未接入；已有solarScene不能冒充这两项。

依据：[SensorHistory](https://developer.garmin.com/connect-iq/api-docs/Toybox/SensorHistory.html#getOxygenSaturationHistory-instance_function)、[ActivityMonitor.Info](https://developer.garmin.com/connect-iq/api-docs/Toybox/ActivityMonitor/Info.html#moveBarLevel-var)、[DeviceSettings](https://developer.garmin.com/connect-iq/api-docs/Toybox/System/DeviceSettings.html#phoneConnected-var)、[CurrentConditions](https://developer.garmin.com/connect-iq/api-docs/Toybox/Weather/CurrentConditions.html)。核验2026-11-28，具体设备可用性仍须实测。

## 独立日出/日落（Schema43/basic53）

`sunrise`和`sunset`读取官方Complications.SUNRISE/SUNSET：设备本地午夜起的秒数，而不是UTC时间戳或持续时长。仅数值0..86399有效，午夜0正常；空值、越界、极昼/极夜不可用显示缺失。界面固定HH:mm，小数位/千位设置不改变时钟格式；原生与网页同规则，字形子集包含冒号。无需定位、后台测量或网络。

活动态最多60秒查询；本地日期、时区变化或时钟回退失效；AOD不查询。官方发布值不提供通用观测时间戳，不声称已独立验证其时效。此读数不根据浏览器位置或静态日出样例生成设备值。预览默认读取预览面板sunrise/sunset，明确为示意。

权限仅ComplicationSubscriber，API4.2.0；依据[Complications常量](https://developer.garmin.com/connect-iq/api-docs/Toybox/Complications.html#ComplicationType-module)。原有昼夜场景仍沿用其Positioning路径，不混用两类来源。月相仍待独立实现/验证。
