# AI 创建校验与默认 trail

AI 创建继续使用现有 kind 和 source，输出可编辑设计；工程生成与编译为后续独立步骤，不引入 time_text 等平行模型。

创建契约已允许 metricDecoration:boolean。英文日期支持 monthDayWeek/weekdayDay，中文日期省略 dateFormat。普通直线指针省略 handShape；轮廓指针使用合法{id,version,points}对象。所有图层须提供 size，包括不绘文字的形状，避免隐式默认引起契约漂移。

DesignValidationError.issues 提供 index/layerId/field/code/message。结构预检查一次列出字段问题，每个可解析图层继续进行语义与圆屏校验；无法解析的图层不继续猜测渲染，整个结果无效时不创建项目。此版本仍有项目整体语义的后置验证，不宣称所有组合错误都可在一次检查中完整定位。

默认参考 trail 由原 Native454 合并项目更名而来，稳定工程身份不变，包含 Apex/Trail/Vital 三套主题。资源与描述在 resources/default-watchfaces/trail，使用统一默认参考/自主标签；用户可创建本地可编辑副本，内置项不可删除。原生整包内存故障仍在修复，尚未验收，不能以此卡片表示原生已通过。
