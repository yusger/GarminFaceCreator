# trail三主题浏览器固定基准

本阶段先定义可复现脚本，再进行113验证。`node scripts/capture-trail-matrix.mjs <授权测试网址>`仅加载页面和字体，使用同一Scene/captureWatchface实现冻结渲染，不调用模型、编译或原生验证。输出默认在忽略的Temp/trail-browser-matrix。

对Apex/Trail/Vital分别生成默认亮屏、默认AOD、高值、缺失、高值AOD、缺失AOD。截图与元数据/项目指纹/资源来源保留；默认及原包边界预览做RGB诊断，不把黑底稀释的MAE叫还原率。

原设计包的previewData与previews/cases.json如有冲突，逐项记录，不静默比较不同读数。默认preview.png以实际previewData为输入；高/缺失按各自用例。此验证是渲染层夹具，不替代编辑器交互、同一个原生PRG全部主题、实际Sleep或真机证据。

视觉发现、像素分析和后续设计调整在运行后补充。所有原稿仍保存在默认参考的design-source，不覆盖作者原始文件。
