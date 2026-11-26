# 布局模板交付规范 v1.0

布局模板是创建项目的起点，不包含固定项目UUID/appId或预编译工程。空白创建与AI创建均可使用。第一批为V1的12款构图骨架；V2的特殊排版/数据能力需后续逐项转换，不能把总览图当作模板背景交付。

每模板位于 `resources/default-watchfaces-template/<id>/`，含 template.json、layout.json、preview.svg、preview-aod.svg、LICENSE。template.json固定format为gfc-layout-template、formatVersion为1，声明id/version/name/mode（DIGITAL/ANALOG/HYBRID）、454×454圆形canvas、安全边距、layoutFile、预览、默认数据来源及作者/许可。layout.json保存backgroundColor和独立layers；每层使用当前封闭Kind及字段，放入项目时填充内部默认值并为所有层生成新身份。纯装饰与动态时间/数据不得合成一张整盘截图。

模板的背景支持默认、任意纯色、用户本地PNG/JPEG/WebP。图片最大8MB，在浏览器居中cover为454×454 PNG，默认锁定为底层、保留原色，AOD隐藏。用户可解锁图片图层继续调整。上传本身不请求后端或模型；主动编译才随工程提交。背景色与文字颜色独立，浅色背景需要自行调整前景对比。

选择AI模板时，模板几何、时间模式及默认数据作为初始建议；用户后续修改的模式/勾选数据具有更高优先级。请求中只传模板结构与背景意图，不自动发送本地背景像素。AI返回设计经校验后再由浏览器加入用户背景。未选择模板或背景时保留原有AI自由创建行为。

V1模板预览是同布局的确定性示意，图片/字体表现与原生有差异；最终以同数据编辑器预览、SDK编译及模拟器/真机核对验收。每种模式至少验证一个模板，另检查390/454等实际像素缩放、AOD时分保留、独立数据槽和新项目身份。库升级不覆盖已有项目。
