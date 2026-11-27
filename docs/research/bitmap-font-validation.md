# 固定像素字体导入与原生对照

实现50f8297，实测修复c48ca3d，受控脚本e35b9d2，均已推送；仅部署113。Schema45/basic59。支持独立文字、时间、日期、读数的单页Unicode BMFont文本＋8位灰度PNG，当前原生指标限定Venu 4两尺寸。导入在浏览器完成，字体原稿/图集/许可随项目保存，主动源码ZIP保留原稿和许可；AI只获得批准身份、固定字号及字形范围。

本地先有17项回归、字体专项13项通过/2项显式SDK跳过；113首轮17通过、2项SDK夹具漏FNT失败。补齐夹具后整组19项通过，两尺寸真实SDK成功；源码ZIP独立检查通过。修后本地7项、113字体/源码ZIP/固定截图10项全部通过，原四张基线没有更新或放宽容差。最终两尺寸三字体再次真实SDK和原生运行成功，清理均completed。

最初真实截图发现原生整体低1px，手写末字右侧笔画被裁切。读取SDK字体高度、上升部与原始FNT对照后确认指标数值相同，但drawText有实测顶部内边距；受管绘制器针对已注册Venu4补偿1px。资源FNT的单字advance扩大到可容纳其外伸墨迹，整行排版继续用原始advance/kerning，避免修裁切改变字距。其他设备阻止生成，SDK升级必须重测，不泛化此校准到其他硬件。

采用资源库获许可的Barlow Semi Condensed、Share Tech Mono、Permanent Marker，分别验证紧凑信息、等宽数字与外伸笔画；首行额外加入AV/VA负字偶距。它们不替代后续细线/角形数字、长单位、中文与真实Sleep的完整排版验收。

原始网页截图：[454px](../screenshots/bitmap-font-browser-454.png)、[390px](../screenshots/bitmap-font-browser-390.png)；原生：[454px](../screenshots/bitmap-font-native-454.png)、[390px](../screenshots/bitmap-font-native-390.png)。修后两尺寸三行字形外框上下左右一致，纵向最佳匹配偏移均0。前景RGB平均绝对误差454px三行为6.991、7.525、8.721/255，390px为7.680、7.890、9.677/255；颜色量化和抗锯齿仍有差异，不能当作像素完全相同或还原率。详细[诊断及PRG/源码散列](bitmap-font-comparison.json)。未调用付费模型，未更改展示环境。

复验须显式设置GFC_NATIVE_FIXTURE_TEST=1及授权的GFC_TEST_URL，再执行 `node scripts/capture-native-bitmap-fonts.mjs`；产物只进Temp。脚本经正常编译和原生验证入口，使用原配额账本与隔离限制。此处是固定文字活动帧；不代表传感器覆盖、三主题同一PRG设置、Sleep/AOD转换或硬件验收。
