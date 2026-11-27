# 自动发布参考包 deterministic-v2 配置补充

本补充提供已实现的离线交付检查；内网发布API仍待实现，不向现有网站提交发布包。发布包formatVersion仍为1，generation.profile显式为deterministic-v2，compatibility.projectSchemaVersion=31。旧deterministic-v1/schema26及其两个Schema保持，不按最新编辑器能力静默迁移。

新结构：[清单Schema](../../resources/schemas/reference-release-v2.schema.json)、[设计Schema](../../resources/schemas/reference-release-design-v2.schema.json)、[完整可编辑机械示例](../../resources/examples/reference-release-v2/README.md)。设计Schema闭合本配置的字段子集，包含真实凸多边形、旋转、连续圆弧、受限曲线文字、内部Compound v1/v2及已注册许可字体。缺失字段不靠AI补全；未列出的内部字段不自动对外开放。

首批目标是Venu4 45mm/41mm。所有core.<kind>及所用data.<source小写>必须声明，core.arcText保留目录大小写；必要能力没有确定性映射即拒绝。当前生成器及逐机型元数据作为检查结果记录，不能由请求者自行宣称已验收。曲线文字沿用ASCII/矢量small/400/不透明/最多8条等当前限制，凹形、自交、嵌套复合或任意路径不开放。

图片仍只通过清单bindings绑定顶层image：PNG及notice必须在文件清单并通过字节/SHA256/像素检查；不接收data URL输入、复合私有图片绑定或图片指针。customFont只接收现有许可目录的id/family/file精确组合，不能提交任意文件名或系统字体字节；字体准备/实际缺字及SDK资源编译是后续独立门禁。

必要时间必须在亮屏/AOD保持无传感器条件且不可由配置隐藏：首版检查完整数字时间，或hours/minutes组合，或时分双针。当前配置及全部来源选项做生成预检；未验证与显示近似仍单独列出，不自动记为已接受降级。源码、历史、构建凭证、外部代码与任意扩展字段不接收。

离线命令：node scripts/check-reference-v2.mjs PACKAGE_DIRECTORY。只读已解包目录，不解压、不写默认库、不编译、不调用模型。拒绝路径穿越/软链接/重复或未声明文件；最多100清单文件、单文件8MiB、总25MiB，校验指纹、角色、两个目标像素预览、图像/许可绑定及设计语义，然后执行用例。

用例沿用formatVersion1。必须有亮屏/AOD且id唯一；每例从默认配置独立开始，可覆盖既有顶层/内部配置ID；日历日期必须真实有效。visibleLayerIds列展开后实际可见叶子ID，readings覆盖所有可见time/date/text/metric；复合父对象本身不算绘制叶子。输入values没有提供的数据一律缺失，不沿用编辑器演示值；0电量有效、null缺失，AOD秒固定0。检查复用网页读数/有效性/配置/显隐函数，不能用“期望文本是任意字符串”代替语义执行。

输出分别记录结构/资源/用例结果、生成器及近似诊断，sdk和simulator保持not run，hardware保持unverified。自动发布仍需额外的真实字体准备、SDK、视觉审核、身份/权限/配额/激活事务等服务门禁；本CLI通过不表示已发布或具备自动API。示例PNG是固定09:41/电量78的网页导出，既非原生截图也非真机证明。Rider不进入默认库。
