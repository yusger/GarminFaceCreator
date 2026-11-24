# 昼夜场景控件

天空和日月标记是两个独立图层；地景、时间与数据可另加图层。白天颜色、夜间颜色与数据缺失底色可编辑。太阳沿示意弧线随日间进度移动，不是精确太阳高度/方位角；夜间月亮固定在中央作为夜间标识，不计算月相或真实月球位置。

原生每分钟最多读取一次 `Position.getInfo().position` 的被动缓存和 `Weather.getSunrise/getSunset(location, Time.now())`，从返回的真实 UTC 时刻判定 `[rise,set)` 白天区间。需要 Positioning 权限，API 3.3（日出/日落）；不启动 GPS、不联网、没有秒计时器。缓存位置可能过时，应在 Garmin 支持的应用中取得位置后刷新。空位置、空太阳时间、无效排序或异常统一使用缺失底色/N/A，并隐藏标记。极地没有普通日出/日落时也采用此回退，不冒充区分了极昼/极夜。

网页使用独立预览中明确标记的日出/日落样本（初始 06:00/18:00），不定位、不预测当前位置天文时间，也不会把样本写入原生。清空任一项、反向时段或“数据缺失”均可测试回退。样本仅为同日且日落晚于日出的场景；跨午夜日照不作推断。原生使用 Garmin 的实际返回值，不使用此简化样本。

默认 AOD 隐藏场景，只保留另外配置的时间等图层；若用户显式保留场景，则沿用缓存状态和 AOD 配色，不刷新位置/太阳计算。原生按分钟判定，临界点可能延迟到下次分钟更新；不宣称功耗、烧屏保护或真机认证。

官方依据：[Position.getInfo](https://developer.garmin.com/connect-iq/api-docs/Toybox/Position.html#getInfo-instance_function)、[Weather.getSunrise / getSunset](https://developer.garmin.com/connect-iq/api-docs/Toybox/Weather.html)。已确认 Venu 4 45mm/41mm 和 fēnix 8 43mm 支持；运行时仍保护模块/方法和空值。
