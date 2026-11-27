# 完整主题预设（阶段E1）

内部Schema34以themes记录有版本的预设身份、图层/配置归属和底色。公共图层在归属外，三主题不是三份项目或应用。主题内配置ID独立，controlValues分别持久化；切换不重置其他主题，恢复当前主题默认值只移除当前主题配置值。直接编辑位置属于主题设计本身，不作为运行时可改设置。未知主题回退defaultId。

网页只显示当前主题及公共对象，编辑列表返回的局部修改合并回完整设计，避免删除其他主题。生成检查和本地工程检查全部预设，单一PRG包含所有图层和对应属性。主题ID映射为与预设顺序无关的稳定数值码，通过数值属性持久化（校验码冲突），绘制只执行当前预设。资源预算按整个PRG计算，不能把单主题通过当整包通过。

原生设置使用AppBase.getSettingsView返回Menu2与代理，包含主题、当前主题配置和恢复默认；颜色提供有界调色选项，网页可设置自定义色并作为安装默认值。此阶段是模型、网页投影和原生代码入口，不等同于已经取得真机菜单/生命周期证据；实际SDK和运行结果另记。主题创作UI、Native454资源合并、图标换色/来源以及完整视觉验收继续实施。

API依据：https://developer.garmin.com/connect-iq/api-docs/Toybox/Application/AppBase.html#getSettingsView-instance_function 与 https://developer.garmin.com/connect-iq/api-docs/Toybox/WatchUi/Menu2.html 。
