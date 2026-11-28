# 布局模板交付规范 v1.0

布局模板是创建项目的起点，不包含固定项目UUID/appId或预编译工程。空白创建与AI创建均可使用。第一批为V1的12款构图骨架；V2的特殊排版/数据能力需后续逐项转换，不能把总览图当作模板背景交付。

每模板位于 `resources/default-watchfaces-template/<id>/`，含 template.json、layout.json、preview.svg、preview-aod.svg、LICENSE。template.json固定format为gfc-layout-template、formatVersion为1，声明id/version/name/mode（DIGITAL/ANALOG/HYBRID）、454×454圆形canvas、安全边距、layoutFile、预览、默认数据来源及作者/许可。layout.json保存backgroundColor和独立layers；每层使用当前封闭Kind及字段，放入项目时填充内部默认值并为所有层生成新身份。纯装饰与动态时间/数据不得合成一张整盘截图。

模板的背景支持默认、任意纯色、用户本地PNG/JPEG/WebP。图片最大8MB，在浏览器居中cover为454×454 PNG，默认锁定为底层、保留原色，AOD隐藏。用户可解锁图片图层继续调整。上传本身不请求后端或模型；主动编译才随工程提交。背景色与文字颜色独立，浅色背景需要自行调整前景对比。

选择AI模板时，模板几何、时间模式及默认数据作为初始建议；用户后续修改的模式/勾选数据具有更高优先级。请求中只传模板结构与背景意图，不自动发送本地背景像素。AI返回设计经校验后再由浏览器加入用户背景。未选择模板或背景时保留原有AI自由创建行为。

V1模板预览是同布局的确定性示意，图片/字体表现与原生有差异；最终以同数据编辑器预览、SDK编译及模拟器/真机核对验收。每种模式至少验证一个模板，另检查390/454等实际像素缩放、AOD时分保留、独立数据槽和新项目身份。库升级不覆盖已有项目。


## 视觉套件扩展 v2

v1描述及布局schema保持原有封闭字段。新视觉套件使用`layout-template-v2.schema.json`和`layout-v2.schema.json`，formatVersion=2；不改变第三方reference-release-v2或widget-v2契约。

visualKit声明targets（首批Venu 4两尺寸）、fonts批准字体ID、colorRoles（id/label/color/明确layerIds）和aodGuide。颜色组不重复占有同一图层，初始颜色必须与该图层一致；创建项目后映射全新图层ID并生成普通颜色配置，不依靠邻接或同色猜绑定。不表示通用主样式实例/字体角色已开放。

布局可用fontId和iconId受控选择授权字体及Lucide图标；构建时严格查资源库和适用控件，转换成已支持的customFont/libraryIcon。不存在任意资源路径或外部脚本。AI创建提示重新输出公开fontId/iconId，以免要求模型复制不允许的嵌套属性。选定数据和时间风格覆盖模板默认值；AI只获得构图指导，不自动继承模板的颜色配置。

预览来自实际网页渲染与固定示意数据（09:41、心率72、步数8642、电量78%），通过`scripts/capture-visual-kits.mjs --update-previews`显式更新；不是渲染能力之外手绘的效果图。所有图层保留编辑能力。息屏时间可独立使用activeVisible=false/aod=true，解析器分别检查亮屏和息屏完整时间；不支持把秒数层留在息屏。

首批套件明确使用精确像素字体流程：从批准TTF按当前目标物理字号在浏览器生成BMF，合并同字体/同字号所需字形，保留完整许可；准备完成后才显示和保存项目，每目标最多8组。不同AOD字号必须拆为独立息屏图层。模板选择和AI套件结果采用相同入口，失败原子拒绝且不隐式上传。普通模板不自动转换。目标字体像素差异、长读数、AOD占比、真实Sleep与原生显示必须分别验收，模板资源本身不证明这些条件通过。
