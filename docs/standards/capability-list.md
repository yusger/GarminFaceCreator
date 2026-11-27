# 编辑器能力清单

由 resources/capabilities/editor-v1.json 自动生成；不要直接修改表格。版本 1.14.0，内部项目版本 43。当前仅收敛已有层和来源的入口/本地生成差异，不代表任意设备、完整字段或所有组合已验收。数据API、权限与单位仍以 generationRequirements 适配器为准；minimumApi 为 null 表示本清单未独立核验。

| 能力 | 网页 | AI创建 | 对话添加 | 本地生成 | 限制 | 回归 |
| --- | --- | --- | --- | --- | --- | --- |
| core.widget | 支持 | 未开放 | 未开放 | 有条件支持 | Expanded into private base layers; parent is one object, no nesting or whole rotation. | frontend/tests/capabilities.spec.ts |
| core.time | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.date | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.calendar | 支持 | 未开放 | 未开放 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.celestial | 支持 | 未开放 | 未开放 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.hand | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.ring | 支持 | 支持 | 支持 | 有条件支持 | Ticks or continuous band; start/end clockwise signed sweep within 360deg, flat/round ends, known data/goal. Missing and AOD show dim track only. Rotation remains zero. Circular continuous band uses native drawArc; noncircular sampled band may have dim-track seams. Subdegree segments avoid drawArc full-circle truncation. | frontend/tests/progress-arc.spec.ts |
| core.wordTime | 支持 | 未开放 | 未开放 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.metric | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.text | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.rect | 支持 | 支持 | 支持 | 有条件支持 | Clockwise rotation about layer center; native polygon sampling for curves, subject to pixel rounding. Other kinds retain zero-rotation constraint. | frontend/tests/capabilities.spec.ts |
| core.circle | 支持 | 支持 | 支持 | 有条件支持 | Clockwise rotation about layer center; native polygon sampling for curves, subject to pixel rounding. Other kinds retain zero-rotation constraint. | frontend/tests/capabilities.spec.ts |
| core.line | 支持 | 支持 | 支持 | 有条件支持 | Clockwise rotation about layer center; native polygon sampling for curves, subject to pixel rounding. Other kinds retain zero-rotation constraint. | frontend/tests/capabilities.spec.ts |
| core.meter | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.image | 支持 | 支持 | 未开放 | 有条件支持 | Requires a loaded bitmap or known library icon. Conditional visibility supports phoneConnected 0/1 and the explicit numeric visibility whitelist; user supplies icon artwork. | frontend/tests/capabilities.spec.ts |
| data.heartrate | 支持 | 支持 | 支持 | 有条件支持 | Deterministic metric requires metricDecoration:false; <=0 is missing. | frontend/tests/capabilities.spec.ts |
| data.steps | 支持 | 支持 | 支持 | 有条件支持 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.battery | 支持 | 支持 | 支持 | 有条件支持 | Valid battery 0..100. | frontend/tests/capabilities.spec.ts |
| data.calories | 支持 | 支持 | 支持 | 有条件支持 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.distance | 支持 | 支持 | 支持 | 有条件支持 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.temperature | 支持 | 支持 | 支持 | 有条件支持 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.seconds | 支持 | 支持 | 支持 | 有条件支持 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.stress | 支持 | 支持 | 支持 | 有条件支持 | Guarded numeric metric only; canonical source adapter units. Extra sensor/weather/complication reads cached60s active-only; weather requires observationTime and age<=6h, elevation sample<=5min. Null/unavailable remains missing. Venu4 SDK validation; actual sensors are device dependent. | frontend/tests/extended-metrics.spec.ts |
| data.recoveryhours | 支持 | 支持 | 支持 | 有条件支持 | Guarded numeric metric only; canonical source adapter units. Extra sensor/weather/complication reads cached60s active-only; weather requires observationTime and age<=6h, elevation sample<=5min. Null/unavailable remains missing. Venu4 SDK validation; actual sensors are device dependent. | frontend/tests/extended-metrics.spec.ts |
| data.floorsclimbed | 支持 | 支持 | 支持 | 有条件支持 | Guarded numeric metric only; canonical source adapter units. Extra sensor/weather/complication reads cached60s active-only; weather requires observationTime and age<=6h, elevation sample<=5min. Null/unavailable remains missing. Venu4 SDK validation; actual sensors are device dependent. | frontend/tests/extended-metrics.spec.ts |
| data.intensityminutes | 支持 | 支持 | 支持 | 有条件支持 | Guarded numeric metric only; canonical source adapter units. Extra sensor/weather/complication reads cached60s active-only; weather requires observationTime and age<=6h, elevation sample<=5min. Null/unavailable remains missing. Venu4 SDK validation; actual sensors are device dependent. | frontend/tests/extended-metrics.spec.ts |
| data.humidity | 支持 | 支持 | 支持 | 有条件支持 | Guarded numeric metric only; canonical source adapter units. Extra sensor/weather/complication reads cached60s active-only; weather requires observationTime and age<=6h, elevation sample<=5min. Null/unavailable remains missing. Venu4 SDK validation; actual sensors are device dependent. | frontend/tests/extended-metrics.spec.ts |
| data.uvindex | 支持 | 支持 | 支持 | 有条件支持 | Guarded numeric metric only; canonical source adapter units. Extra sensor/weather/complication reads cached60s active-only; weather requires observationTime and age<=6h, elevation sample<=5min. Null/unavailable remains missing. Venu4 SDK validation; actual sensors are device dependent. | frontend/tests/extended-metrics.spec.ts |
| data.altitude | 支持 | 支持 | 支持 | 有条件支持 | Guarded numeric metric only; canonical source adapter units. Extra sensor/weather/complication reads cached60s active-only; weather requires observationTime and age<=6h, elevation sample<=5min. Null/unavailable remains missing. Venu4 SDK validation; actual sensors are device dependent. | frontend/tests/extended-metrics.spec.ts |
| data.windspeed | 支持 | 支持 | 支持 | 有条件支持 | Guarded numeric metric only; canonical source adapter units. Extra sensor/weather/complication reads cached60s active-only; weather requires observationTime and age<=6h, elevation sample<=5min. Null/unavailable remains missing. Venu4 SDK validation; actual sensors are device dependent. | frontend/tests/extended-metrics.spec.ts |
| core.polygon | 支持 | 支持 | 支持 | 有条件支持 | 3..32 strictly convex normalized [0,1] vertices. Fill/stroke, clockwise center rotation. No arbitrary SVG paths or scripting. | frontend/tests/polygon.spec.ts |
| core.arcText | 支持 | 支持 | 支持 | 有条件支持 | First release: Venu4 targets only, printable ASCII <=80 chars, 8 layers. Fixed scalable SMALL face, 400 weight, opacity1, no resource fonts/rotation. Browser font and glyph advances are approximate. Radius fraction/spacing/angle/direction/alignment; conservative one-circle width budget. | frontend/tests/curved-text.spec.ts |
| core.chart | 支持 | 支持 | 支持 | 有条件支持 | One chart object; day1..7 steps/distance/calories or hour1..7 heartRate; bar/trapezoid/segmented/line/area, max4, Venu4 only. Missing breaks curves; hour aggregation mean/max/min/last, no sum; actual elapsed-hour buckets,1024 recent sample processing budget and coverage marker,60s active-only cache; AOD frozen/simplified. ECG not supported. | frontend/tests/charts.spec.ts |
| data.oxygensaturation | 支持 | 支持 | 支持 | 有条件支持 | SensorHistory.getOxygenSaturationHistory({:period=>1,:order=>SensorHistory.ORDER_NEWEST_FIRST}).next() guarded; sample.when age0..300s; data percent >0 and <=100; numeric metrics and explicitly enabled meters; source slots have separate whitelist. Design goals100 percent/5 levels, not personalised fitness goals. | frontend/tests/additional-sources.spec.ts |
| data.phoneconnected | 支持 | 支持 | 支持 | 有条件支持 | System.getDeviceSettings().phoneConnected boolean -> 1 connected / 0 disconnected; missing is not zero; numeric metrics only, source-slot/meter support has separate whitelist. | frontend/tests/additional-sources.spec.ts |
| data.movebarlevel | 支持 | 支持 | 支持 | 有条件支持 | ActivityMonitor.getInfo().moveBarLevel, nullable level0..5 (not a percentage or minute count); numeric metrics and explicitly enabled meters; source slots have separate whitelist. Design goals100 percent/5 levels, not personalised fitness goals. | frontend/tests/additional-sources.spec.ts |
| data.precipitationchance | 支持 | 支持 | 支持 | 有条件支持 | GfcWeather.read(false).precipitationChance, cached current conditions percent0..100; observationTime age0..21600s; numeric metrics only, source-slot/meter support has separate whitelist. | frontend/tests/additional-sources.spec.ts |
| data.windbearing | 支持 | 支持 | 支持 | 有条件支持 | GfcWeather.read(false).windBearing, cached weather degrees; North0/East90/South180/West270; not device heading; numeric metrics only, source-slot/meter support has separate whitelist. | frontend/tests/additional-sources.spec.ts |
| data.sunrise | 支持 | 支持 | 支持 | 有条件支持 | Garmin Complications seconds since local midnight0..86399, nullable. Fixed HH:mm display, precision/grouping do not change clock formatting. Active60s, date/zone/rollback invalidation. No active GPS or networking. Metric only; not an elapsed duration. | frontend/tests/solar-readouts.spec.ts |
| data.sunset | 支持 | 支持 | 支持 | 有条件支持 | Garmin Complications seconds since local midnight0..86399, nullable. Fixed HH:mm display, precision/grouping do not change clock formatting. Active60s, date/zone/rollback invalidation. No active GPS or networking. Metric only; not an elapsed duration. | frontend/tests/solar-readouts.spec.ts |

设计层面的已知结构可以保留；生成器的必要限制不得静默降级。复合控件先展开再检查，图片需实际资源，meter仅steps/battery/oxygenSaturation/moveBarLevel，metric仅本清单已接入来源，心率关闭装饰，仅rect/line/circle/polygon支持围绕层中心顺时针旋转，其他图层rotation为0。外部发布包仍使用独立契约。

生成检查入口位于编辑器属性侧栏，区分本地映射阻断、显示近似与待验证；可定位到基础图层或复合父对象。不把近似提示当作用户已接受降级，不以未发现映射阻断代替资源预算、SDK编译或真机验收。配置的数据源选项逐一检查，未选选项也不能绕过本地能力限制。

## 数据适配契约

来自 resources/capabilities/source-adapters-v1.json，版本 1.3.0。API 下限指读取接口的引入版本，工程绘制工具可能要求更高 API；不代表目标硬件支持，也不改变上表的本地生成开放范围。显示后缀与数值单位分开，改标签不换算读数。海拔沿用 ft，SDK 原始米值由适配器换算。

| 来源 | 读取 API 下限 | 数值单位 | 默认后缀 | 权限 |
| --- | --- | --- | --- | --- |
| solarScene | 3.3.0 | 无量纲/类别 | 无 | Positioning |
| weatherIcon | 3.2.0 | 无量纲/类别 | 无 | 无 |
| heartRate | 2.1.0 | bpm | 无 | SensorHistory |
| altitude | 2.1.0 | ft | ft | SensorHistory |
| steps | 1.0.0 | 无量纲/类别 | 无 | 无 |
| calories | 1.0.0 | kcal | 无 | 无 |
| distance | 1.0.0 | km | 无 | 无 |
| battery | 1.0.0 | % | % | 无 |
| seconds | 1.0.0 | 无量纲/类别 | 无 | 无 |
| floorsClimbed | 2.1.0 | 无量纲/类别 | 无 | 无 |
| intensityMinutes | 2.1.0 | min | min | 无 |
| temperature | 3.2.0 | °C | °C | 无 |
| humidity | 3.2.0 | % | % | 无 |
| windSpeed | 3.2.0 | m/s | m/s | 无 |
| uvIndex | 5.1.0 | 无量纲/类别 | 无 | 无 |
| stress | 4.2.0 | 无量纲/类别 | 无 | ComplicationSubscriber |
| recoveryHours | 4.2.0 | h | h | ComplicationSubscriber |
| oxygenSaturation | 3.2.0 | % | % | SensorHistory |
| phoneConnected | 1.1.0 | 无量纲/类别 | 无 | 无 |
| moveBarLevel | 1.0.0 | 无量纲/类别 | 无 | 无 |
| precipitationChance | 3.2.0 | % | % | 无 |
| windBearing | 3.2.0 | deg | ° | 无 |
| sunrise | 4.2.0 | seconds-since-local-midnight | 无 | ComplicationSubscriber |
| sunset | 4.2.0 | seconds-since-local-midnight | 无 | ComplicationSubscriber |

海拔接口依据：[Garmin SensorHistory](https://developer.garmin.com/connect-iq/api-docs/Toybox/SensorHistory.html)。设备可用性和缺失数据仍须分别检查。

## 工程提示字段契约

版本 fields-4-source-label-defaults，来源 frontend/src/generationFields.ts；TypeScript保证Layer每个字段均有明确策略。下面是工程提示序列化策略，不是对话修改白名单，不会扩大外部发布包或复合私有层权限。默认值、kind约束与资源读取仍由生成适配器执行。新增字段必须作出策略选择。

| 字段 | 工程提示策略 |
| --- | --- |
| activeVisible | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| allowClip | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| aod | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| aodColor | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| aodSeconds | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| aodSize | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| arcDirection | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| arcRadius | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| arcSpacing | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| arcStartAngle | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| autoPrecision | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| autoSourceFormat | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| calendarHeaderColor | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| calendarMutedColor | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| calendarStart | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| calendarTodayColor | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| calendarTodayText | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| color | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| cornerRadius | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| dateFormat | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| dateLocale | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| effectPrompt | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| fillEnabled | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| fixedSource | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| fontWeight | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| garminFont | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| groupThousands | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| h | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| handCap | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| handPivotX | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| handPivotY | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| handReach | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| handTail | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| handType | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| iconMask | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| id | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| imageFullColor | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| kind | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| label | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| meterContinuous | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| meterCount | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| meterDim | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| meterDimColor | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| meterGap | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| meterGoal | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| meterShape | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| metricDecoration | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| missingValue | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| name | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| opacity | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| precision | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| preserveSourceLabelDefault | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| ringCap | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| ringDim | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| ringEnd | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| ringGoal | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| ringSource | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| ringStart | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| ringStyle | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| ringTicks | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| ringWidth | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| rotation | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| size | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| solarMissingColor | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| solarNightColor | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| solarPart | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| source | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| sourceLabelFor | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| sourceLabelStyle | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| sourceLocked | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| strokeColor | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| strokeEnabled | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| strokeWidth | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| text | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| textAlign | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| threshold | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| thresholdFallback | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| timePart | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| timeUtcOffset | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| unit | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| w | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| wordLanguage | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| wordRow | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| x | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| y | 已知标量（字符串/有限数值/布尔）；按类型检查 |
| anchor | editor layout only; omitted |
| assetId | local storage identity; omitted |
| chart | validated daily time-series configuration; scalar whitelist only |
| compound | parent expanded by the platform; private content cannot be AI patches |
| compoundOverrides | resolved with parent instance before expansion |
| customFont | nested whitelist registered id/family/file |
| exportIncluded | filters the included layer set before serialization |
| groupId | editor group only; omitted |
| groupName | editor group label only; omitted |
| guide | editor guide only; omitted |
| handBitmap | nested whitelist packId/setId/role/version |
| handShape | nested whitelist id/version and numeric normalized points |
| hidden | editor visibility; generation uses exportIncluded and emits hidden=false |
| image | replaced by a declared asset path; pixel bytes are not prompt fields |
| libraryIcon | nested whitelist id/recolor/strokeWidth |
| locked | editor interaction only; omitted |
| polygonPoints | validated normalized convex point pairs; copied as numeric arrays |
| readoutSample | editor preview only; omitted |
| thresholdRules | nested whitelist min/max/color per rule |
| visibility | validated nested source/ranges/missing/AOD whitelist |
| weatherIcon | nested whitelist period |
| widgetOrigin | private provenance; omitted |
