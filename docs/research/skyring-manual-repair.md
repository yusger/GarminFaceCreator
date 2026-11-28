# SkyRing 审计工程：手工显示修复

此次修复对象是13款付费审计中的SkyRing工程，**不覆盖内置参考的原始原生源码，不覆盖原始AI失败，不调用付费模型**。主要变化已提交f3d250e及a9d4535；[重放脚本](../../scripts/repair-skyring-native.mjs)读取原工程并输出新的独立文件，[修复后的View源码](skyring-manual-repair/SkyRingView.mc)可供审查。

- 固定系统字号改为设备精确字体名，时钟使用粗体；文字按各自中心锚点及实际宽度缩小，不移动邻近读数。
- 使用已有F_icons22/F_icons16及明确存在的ASCII字形，恢复FNT描述、PNG图集与XML绑定；电池和箭头采用简单矢量，消除缺失Unicode字形。
- 恢复原设计的72段切向外圈；原AI画成径向方块。补回34个遗漏的静态示例装饰，未把它们冒充真实历史或进度。
- 负海拔与缺失分开，天气在低功耗使用缓存，AOD只保留灰色时间及电量，不重画整圈/装饰。
- 在代码历史中保留manual补丁分类，不将手工处理重新计作AI自主修复。

[修复前](skyring-manual-repair/before.png) / [正常动态画面](skyring-manual-repair/active.png) / [高值与缺失天气](skyring-manual-repair/high.png) / [强制AOD绘图](skyring-manual-repair/aod.png)。三份最终工程均通过真实SDK编译、原生启动和清理。高值夹具含HR160、六位步数、五位热量、三位楼层、168小时恢复、负海拔和缺失天气，未见原有重叠/缺字。界面字号仍有SDK栅格差异，图标改用实际资源；不宣称与网页逐像素相同。

正常PRG读取模拟器实际值；高值与AOD是单独源代码夹具，不混入交付PRG。worker报告原始模式不改写，强制AOD明确仅证明绘图，不证明真实Sleep。原静态太阳标签、7d 8642、25/18及示例折线仍是设计样例，未完成天文/历史真实性验收。[完整记录](skyring-manual-repair/validation.json)和[交付文件散列](skyring-manual-repair/release-manifest.json)保留。

交付位于被忽略的release/SkyRing：动态PRG、源码ZIP、设计JSON、工程审计检查点及说明。实际页面导入、导出、从“我的表盘”重开验证通过，159层保留。页面既有导入明确只接收画布，剥离源码/快照，因此单独交付源码ZIP；没有修改该导入边界。前期验证脚本错误地期待导入代码及刷新后自动进入编辑器，修正为现有实际流程后通过，未归因产品。

## 113测试环境配额

按用户本次明确授权，113长期关闭BuildLimits、NativeVerification和NativeWorker的EnforceQuotas；仓库默认值仍true，展示环境未动。关闭前后账本未清除，测试后两个原生账本均由142继续累计至148。250次健康API请求全部200，验证超过默认每分钟240的速率限制后仍可使用；编译/原生超原日限额成功，身份、队列/并发、空间/超时、每工程尝试及容器资源限制保留。配置及计数持久化单测通过；worker构建/沙箱测试通过。实际服务部署1b1412c，修复脚本提交不改变运行镜像。

Plan完整验收仍未完成，见[逐项状态](../plan-acceptance-status.md)；本修复不改变独立trail批次失败、真实历史/完整配置/真机续航等待项。
