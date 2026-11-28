# trail 精确字体版本：最终付费工程试验

2026-11-28，现有DeepSeek Flash配置；只在约定测试环境编译/运行，展示环境未动。旧试验见[首轮报告](../paid-model-native454-comparison.md)，旧图不代表这轮版本。

本轮对实质更新的trail精确字体设计重新完整生成一次，随后在同一新根内执行两次受限AI修复；旧根未重置。生成73,629tokens，第2次修复14,411tokens，第1次修复的usage未保留，不能写成零。新增已知88,040tokens+一项未知；随后修复审计管线已补齐，未来修复请求会记录返回usage。两轮额度耗尽后没有追加模型请求。

真实结果：

1. 模型返回19文件；第一次SDK因六个背景/刻度资源缺声明失败。AI修复1只补资源XML。
2. 后续SDK报告ResourceId/Number、管理字体13参数接口、日期字段等类型错误。AI修复2纠正选中GfcWatchFace源码，SDK通过。
3. 该真实PRG首帧在Theme.current读取未声明Properties时UnexpectedType，原生失败、cleanup completed。
4. 前端平台补全设置三文件，所有.mc字节及同一2/2修复根保持不变；SDK通过。原生越过该错误，在drawImage/drawBitmap2抛Source must not use a color palette，失败且清理完成。
5. Venu4 AI资源准备器现为这类位图声明automaticPalette=false；全部.mc仍不变。SDK通过，PRG2,599,660字节，未超过4MiB；今日worker100次已用完，尚未再次运行原生。

完整分类是“AI工程＋两次AI修复＋平台资源准备”，不能称未经修改的模型一次生成成功，也没有人工补画图层。原始/各修复/平台处理项目和响应保留在忽略的本地Temp；[公开审计](paid-trail-final/audit.json)记录阶段哈希、调用量和失败原因，不包含密钥、访问令牌、私有环境或原始请求。

当前没有这轮最终有效原生帧，因此不提供虚构的画面还原率或新视觉误差。确定性版本的双尺寸24对原生/网页证据在[独立矩阵](trail-native-matrix.md)，不冒充AI输出。下一步在日配额恢复后，对已保存的同一源码/资源继续原生复验，并核对字体、图标、数据格式、配置与AOD；不重新生成付费根来绕过两轮限制。
