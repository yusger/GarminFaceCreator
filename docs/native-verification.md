# 可选原生验证服务

当前提供独立队列、与编译任务绑定的API及编译面板中的“SDK模拟器验证”入口。NativeVerification配置位于backend/appsettings.json，默认Enabled=false，普通compose/展示环境不会启用。只接受Venu4两尺寸及有GFC_RENDER_READY的新版确定性工程，不上传额外PRG/源码，不调用模型。

开启前按deploy/native-worker/README.md部署可信Unix worker，启用compose.native.yaml中的IPC目录挂载；主站只挂IPC，绝不挂Docker socket。配置SocketPath应指向容器内worker.sock。选项包括QueueCapacity=2、TimeoutSeconds=155、AttemptsPerBuild=2、每IP每日10/全局30、截图保留24小时。worker自己还有限额50和120秒/12秒清理期限。两份appsettings由部署者管理，用户请求不能改限额；计数为中国自然日、持久化且IP哈希。

所有路径复用编译任务Bearer凭证，未知/无权限任务404，拒绝跨站POST，凭证不进URL。POST /api/builds/{id}/native-verification只接受空体，对该任务既有PRG校验摘要后排队，活跃/成功任务重复提交幂等；失败/取消/服务中断最多手动再试一次。GET同路径返回状态；POST末尾/cancel只取消验证，不改编译结果。artifacts/screen.png与artifacts/metadata.json受同一鉴权和no-store保护。

PRG、源码摘要/生成器、项目ID/修订/目标与验证记录绑定，不能用当前浏览器设计冒充已编译来源。任务保留源/PRG租约直到结束；服务重启的验证标为interrupted，不自动重跑；截图/报告按独立时限过期。模拟器失败仍保留编译成功及原PRG下载。所有运行失败捕获为验证失败，不能导致编译worker退出。

元数据记录SDK、目标像素、应用报告模式、动态模拟器数据、资源采样、清理状态及独立真机未验证。下载的是SDK纯盘面截图，不是实际手表，Sleep切换/功耗未因此验收；采样不是峰值，上限不是测量。原生截图与网页固定样本可能显示不同数值，不能直接用它们做像素相同承诺。

验证脚本backend/tests/native-verification.mjs需显式GFC_TEST_URL、GFC_TEST_SDK=1、GFC_NATIVE_TEST=1，仅在测试环境运行。包括真实SDK→独立worker→鉴权产物链路和取消/幂等；证据留忽略的Temp，不收集到默认库。


网页使用：本地生成并应用工程→编译成功→在编译面板点击“运行SDK模拟器”。不会自动运行或调用模型；可以取消、刷新状态，失败按剩余次数重试。结果显示目标/修订/生成器、原生截图与独立日志，PNG/元数据通过现有任务凭证下载。用户后来编辑画布时保留“截图属于既有编译任务”的提示，不用实时画布冒充编译来源。未启用或worker不可用时仍可编辑、编译、下载PRG。

更新应用镜像后用bash deploy/compose-up.sh app启动；脚本根据appsettings的Enabled保留可选IPC挂载，不将Docker socket加到主站。首次启动worker仍按worker文档准备，脚本不暗中开启配置或修改配额。


AI工程原生报告（ai-frame-1）：前端在AI工程的GeneratedApp外组合受管理应用/表盘代理，仅在原视图onUpdate正常返回后报告首帧，保留原委托及布局/生命周期调用。manifest入口改为GfcReportedApp，托管文件不可用AI修复。该机制明确标记为AI报告，不伪装本地生成器；首帧报告仅确认回调完成，不证明视觉完整或AOD正确。

后端允许既有basic首帧报告或AI托管报告（要求对应manifest入口），继续使用既有PRG、空体POST、任务Bearer、设备白名单、额度/队列及隔离worker；不接受额外任意PRG或调试脚本。缺少App.mc不再错误报告过期。新记录sourceHashMode=ordered-mc-v1，按相对路径排序并绑定全部.mc文件；旧记录primary-source-v1保持原定义。PRG哈希继续绑定实际工程资源。此更新仅部署113，展示环境未开启原生验证。
