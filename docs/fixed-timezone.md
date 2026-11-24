# 固定 UTC 偏移时间

时间图层默认读取设备本地时钟；“固定 UTC 偏移”使用东正西负的整数分钟（-720 至 840）。UTC+8 填 480，UTC+5:45 填 345。完整时间、小时/分钟及四个独立数字均使用同一时间基准。日期控件仍是本地日期，不会暗中切成第二时区日期。

这不是 IANA 地区时区库，不会自动调整目标地区夏令时。需要自动夏令时的地区，应按当期偏移手动修改；设备本地模式继续由设备管理时区/夏令时。固定偏移取设备 UTC 时刻计算，不能直接对本地时间加一次偏移。

网页按预览日期、时间和浏览器所在时区换算；夏令时回拨时重叠的本地时刻遵循浏览器 Date 的选择，无法在仅有 HH:MM 的手动预览中区分两次同名时刻。动态模式使用当前时刻。原生不依赖浏览器时区，所有固定偏移图层共享每帧同一个 Time.now；没有新增权限、联网或秒计时器。

依据：[Gregorian.utcInfo](https://developer.garmin.com/connect-iq/api-docs/Toybox/Time/Gregorian.html#utcInfo-instance_function) 与 [Time.Moment](https://developer.garmin.com/connect-iq/api-docs/Toybox/Time/Moment.html)，API 1.0。测试固定日期只进入明确标记的测试工程，正式代码仍读取设备时刻。
