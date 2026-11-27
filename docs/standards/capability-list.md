# 编辑器能力清单

由 resources/capabilities/editor-v1.json 自动生成；不要直接修改表格。版本 1.6.1，内部项目版本 31。当前仅收敛已有层和来源的入口/本地生成差异，不代表任意设备、完整字段或所有组合已验收。数据API、权限与单位仍以 generationRequirements 适配器为准；minimumApi 为 null 表示本清单未独立核验。

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
| core.image | 支持 | 支持 | 未开放 | 有条件支持 | Requires a loaded bitmap or known library icon. | frontend/tests/capabilities.spec.ts |
| data.heartrate | 支持 | 支持 | 支持 | 有条件支持 | Deterministic metric requires metricDecoration:false; <=0 is missing. | frontend/tests/capabilities.spec.ts |
| data.steps | 支持 | 支持 | 支持 | 有条件支持 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.battery | 支持 | 支持 | 支持 | 有条件支持 | Valid battery 0..100. | frontend/tests/capabilities.spec.ts |
| data.calories | 支持 | 支持 | 支持 | 有条件支持 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.distance | 支持 | 支持 | 支持 | 有条件支持 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.temperature | 支持 | 支持 | 支持 | 有条件支持 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.seconds | 支持 | 支持 | 支持 | 有条件支持 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.stress | 支持 | 支持 | 支持 | 未接入 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.recoveryhours | 支持 | 支持 | 支持 | 未接入 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.floorsclimbed | 支持 | 支持 | 支持 | 未接入 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.intensityminutes | 支持 | 支持 | 支持 | 未接入 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.humidity | 支持 | 支持 | 支持 | 未接入 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.uvindex | 支持 | 支持 | 支持 | 未接入 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.altitude | 支持 | 支持 | 支持 | 未接入 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| data.windspeed | 支持 | 支持 | 支持 | 未接入 | Units and device API come from generationRequirements adapters, not this catalog. | frontend/tests/capabilities.spec.ts |
| core.polygon | 支持 | 支持 | 支持 | 有条件支持 | 3..32 strictly convex normalized [0,1] vertices. Fill/stroke, clockwise center rotation. No arbitrary SVG paths or scripting. | frontend/tests/polygon.spec.ts |
| core.arcText | 支持 | 支持 | 支持 | 有条件支持 | First release: Venu4 targets only, printable ASCII <=80 chars, 8 layers. Fixed scalable SMALL face, 400 weight, opacity1, no resource fonts/rotation. Browser font and glyph advances are approximate. Radius fraction/spacing/angle/direction/alignment; conservative one-circle width budget. | frontend/tests/curved-text.spec.ts |

设计层面的已知结构可以保留；生成器的必要限制不得静默降级。复合控件先展开再检查，图片需实际资源，meter仅步数/电量，metric仅本清单已接入来源，心率关闭装饰，仅rect/line/circle/polygon支持围绕层中心顺时针旋转，其他图层rotation为0。外部发布包仍使用独立契约。

生成检查入口位于编辑器属性侧栏，区分本地映射阻断、显示近似与待验证；可定位到基础图层或复合父对象。不把近似提示当作用户已接受降级，不以未发现映射阻断代替资源预算、SDK编译或真机验收。配置的数据源选项逐一检查，未选选项也不能绕过本地能力限制。

## 数据适配契约

来自 resources/capabilities/source-adapters-v1.json，版本 1.0.0。API 下限指读取接口的引入版本，工程绘制工具可能要求更高 API；不代表目标硬件支持，也不改变上表的本地生成开放范围。显示后缀与数值单位分开，改标签不换算读数。海拔沿用 ft，SDK 原始米值由适配器换算。

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
| intensityMinutes | 2.1.0 | min | /150 | 无 |
| temperature | 3.2.0 | °C | °C | 无 |
| humidity | 3.2.0 | % | % | 无 |
| windSpeed | 3.2.0 | m/s | m/s | 无 |
| uvIndex | 5.1.0 | 无量纲/类别 | 无 | 无 |
| stress | 4.2.0 | 无量纲/类别 | 无 | ComplicationSubscriber |
| recoveryHours | 4.2.0 | h | h | ComplicationSubscriber |

海拔接口依据：[Garmin SensorHistory](https://developer.garmin.com/connect-iq/api-docs/Toybox/SensorHistory.html)。设备可用性和缺失数据仍须分别检查。
