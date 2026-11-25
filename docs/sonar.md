# SONAR 默认参考

SONAR 1.1.0 设计包转换为18个独立可编辑图层。默认卡片标记“自主”，点击创建独立副本；本地生成时使用ASCII项目名。原始交付、10个预览case及许可保存在 default-watchfaces/sonar/handoff，图层ID映射和静态扫描降级记录见 conversion-report.json。

顶部“表盘配置”提供12项颜色、右侧数据来源和秒数设置。右侧steps/calories/distance切换时，标签及精度同步变化；里程保留两位小数，步数进度只在steps时显示，恢复steps后重新显示。配置修改使代码过期，应重新生成后编译。共享配置只在主设计修改，各设备源码单独生成。

连续进度条按实际比例填充，缺失全暗。固定心率和电量来源；阈值与缺失遵循设计包，AOD保持低亮度并保留电量专属标签。扫描扇区为独立静态PNG，未实现动态旋转。

字体从包内合法交付文件生成目标分辨率FNT/PNG；源码包包含原字体、完整许可、设置XML和Monkey C。生成的设置XML声明12项原生属性；手机Connect IQ设置可使用，模拟器App Settings Editor需本地SDK编译并同步相应settings JSON后使用；未增加手表内菜单委托，Trigger App Settings可用性不作为此功能入口。

维护 design.json 和 reference.json，更新字体/字号后运行 `node scripts/generate-reference-fonts.mjs sonar` 再 `npm run build`。原始包仅作版本化输入留档；设计修改以后以规范化设计为维护入口，不能同时编辑两份事实来源。通用导入脚本首版限定已审阅的自主454px Venu4包，不宣称已实现任意格式/控件的一键导入；不支持的能力需补转换并验收。
