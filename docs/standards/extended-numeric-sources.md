# 扩展数值来源与缓存

来源契约1.1.0/basic48接通既有15个来源的本地数值绘制，不代表所有来源都可放入任意进度或数据槽。数据槽仍按其独立7来源白名单；图表仍按每日3来源白名单。

| 来源 | 原生数据与单位 | 缺失/更新 |
| --- | --- | --- |
| 海拔 | SensorHistory最新高程米×3.280839895，沿用项目原有ft口径 | 记录年龄0～300秒；60秒亮屏缓存，负海拔有效 |
| 风速/湿度/UV/天气温度 | Garmin缓存conditions；m/s、%、无单位、°C | 共享GfcWeather，60秒亮屏刷新；必须有观测时间且年龄0～6小时 |
| 压力 | Complications.STRESS，0～100 | 60秒亮屏查询；不存在/异常/空值留缺失 |
| 恢复时间 | Complications.RECOVERY_TIME分钟÷60为小时 | 同上；不等于活动持续时间 |
| 楼层 | ActivityMonitor.Info.floorsClimbed | 同帧共享getInfo，当日计数，零有效 |
| 当日强度分钟 | ActivityMonitor.Info.activeMinutesDay.total | 当日分钟，默认后缀min；不再将每日值标为/150的周目标 |

所有AOD数值使用最近亮屏快照。天气图标与天气数值共用平台GfcWeather，GfcIcons.prepare(lowPower)在绘制前调用；低功耗不读取新天气。无时间戳、未来或过期天气显示缺失。Complications没有通用观测时间字段，本实现不声称能识别其真实发布时间。无持续传感器采样、网络请求或GPS启动。

首次未有亮屏缓存的AOD显示缺失；缓存不伪造停用期间记录。控件原有显式unit覆盖保留，新默认值来自版本化来源契约。其他设备的数据可用性由has检查与异常处理判定，Venu4两尺寸的SDK验证不能代替实际佩戴传感器证据。

官方依据（2026-11-28复核）：[SensorHistory](https://developer.garmin.com/connect-iq/api-docs/Toybox/SensorHistory.html#getElevationHistory-instance_function)、[SensorSample.when](https://developer.garmin.com/connect-iq/api-docs/Toybox/SensorHistory/SensorSample.html)、[Weather.CurrentConditions](https://developer.garmin.com/connect-iq/api-docs/Toybox/Weather/CurrentConditions.html)、[Complications](https://developer.garmin.com/connect-iq/api-docs/Toybox/Complications.html)、[ActivityMonitor.Info](https://developer.garmin.com/connect-iq/api-docs/Toybox/ActivityMonitor/Info.html)。过期窗口是本项目策略，不是Garmin保证的采样间隔。

平台Weather/Icons/Fonts/FrameReporter文件属于受管理输出，AI小修复不能改写；应修改设计或平台实现后重新生成。
