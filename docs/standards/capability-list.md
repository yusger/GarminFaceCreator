# 编辑器能力清单

由 resources/capabilities/editor-v1.json 自动生成；不要直接修改表格。版本 1.0.0，内部项目版本 26。当前仅收敛已有层和来源的入口/本地生成差异，不代表任意设备、完整字段或所有组合已验收。数据API、权限与单位仍以 generationRequirements 适配器为准；minimumApi 为 null 表示本清单未独立核验。

| 能力 | 网页 | AI创建 | 对话添加 | 本地生成 | 限制 | 回归 |
| --- | --- | --- | --- | --- | --- | --- |
| core.widget | 支持 | 未开放 | 未开放 | 有条件支持 | Expanded into private base layers; parent is one object, no nesting or whole rotation. | frontend/tests/capabilities.spec.ts |
| core.time | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.date | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.calendar | 支持 | 未开放 | 未开放 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.celestial | 支持 | 未开放 | 未开放 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.hand | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.ring | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.wordTime | 支持 | 未开放 | 未开放 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.metric | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.text | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.rect | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.circle | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
| core.line | 支持 | 支持 | 支持 | 有条件支持 | Layer rotation must be zero for current deterministic output. | frontend/tests/capabilities.spec.ts |
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

设计层面的已知结构可以保留；生成器的必要限制不得静默降级。复合控件先展开再检查，图片需实际资源，meter仅步数/电量，metric仅本清单已接入来源，心率关闭装饰，图层rotation为0。外部发布包仍使用独立契约。
